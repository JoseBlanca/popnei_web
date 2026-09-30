import { describe, expect, test } from "vitest";
import {
  LD_CURVE_POINTS,
  LD_DECAY_DEFAULTS,
  fittedR2,
  ldBinRows,
  ldBinsCsv,
  ldDecay,
  ldDecayCsv,
  ldDecayCurve,
  ldDecayFilters,
  ldDecayOptions,
  ldDecayRows,
  ldPlotOmittedText,
  maxDistFor,
  maxDistReason,
  refusalText,
} from "./ldDecay.ts";
import { countsOf, individualStatsOf } from "../apps.ts";
import { filterCounts } from "./filterCounts.ts";
import { individualChecks } from "./individualChecks.ts";
import { individualsKept } from "../individualsKept.ts";
import { createKeyMemo, keyOf } from "../keys.ts";
import type { Key, KeyedDef } from "../keys.ts";
import {
  emptyProject,
  individualsNeeds,
  populationsKeptNeeds,
  setAnalysisOptions,
} from "../project.ts";
import type { Project, ProjectVariantFilter } from "../project.ts";
import { createStore } from "../store.ts";
import type { Warning, WorkerClient } from "../store.ts";
import { deepFreeze } from "../testSupport.ts";
import type {
  Cell,
  IndividualFilter,
  IndividualsTable,
  Job,
  JobResult,
  LdDecayResult,
  Outcome,
  PassStats,
  Run,
} from "../../worker/protocol.ts";

const VARIANTS_ID = "00112233445566778899aabbccddeeff";
const INDIVIDUALS_ID = "ffeeddccbbaa99887766554433221100";

/** The individuals of `ld.nei`, `i000` to `i099`. */
const LD_INDIVIDUALS: readonly string[] = Array.from(
  { length: 100 },
  (_, i) => `i${String(i).padStart(3, "0")}`,
);

/** A table `IID,pop` of the individuals `names`, each with its cell of
    `popOf`. */
function tableOf(
  names: readonly string[],
  popOf: (name: string, i: number) => Cell,
): IndividualsTable {
  return {
    columns: ["IID", "pop"],
    rows: names.map((name, i) => [name, popOf(name, i)]),
  };
}

/** `ld_pops.csv`: `i000` to `i049` in `pop_a`, `i050` to `i099` in
    `pop_b`. */
const LD_POPS = tableOf(LD_INDIVIDUALS, (_, i) => (i < 50 ? "pop_a" : "pop_b"));

/** Three populations of the individuals of `ld.nei`, `p0` to `p2` by
    their number modulo 3. */
const THREE_POPS = tableOf(LD_INDIVIDUALS, (_, i) => `p${String(i % 3)}`);

/** The LD pruning of the flow, r² 0.1 within 50,000 bp. */
const LD_PRUNING: ProjectVariantFilter = {
  kind: "ld",
  maxAllowedR2: 0.1,
  maxDist: 50_000,
};

/** The missing data filter of the flow. */
const MISSING_DATA: ProjectVariantFilter = {
  kind: "missing_data",
  maxAllowedMissingRate: 0.1,
};

/** The project of the flow, frozen deeply: `ld.nei` with its 100
    individuals, `ld_pops.csv` and its column `pop`, the missing data
    filter at 0.1 and the LD pruning on, and a largest distance of 100,000
    bp; each part replaced by the option of its name. */
function project(
  options: {
    readonly table?: IndividualsTable | null;
    readonly column?: string | null;
    readonly onePopulation?: boolean;
    readonly filters?: readonly ProjectVariantFilter[];
    readonly individualFilters?: readonly IndividualFilter[];
    readonly ld?: {
      readonly maxDist: number | null;
      readonly maxAllowedMaf?: number;
    } | null;
    readonly individuals?: readonly string[];
    readonly variantsName?: string;
    readonly vcf?: boolean;
  } = {},
): Project {
  const table = options.table === undefined ? LD_POPS : options.table;
  const ld = options.ld === undefined ? { maxDist: 100_000 } : options.ld;
  return deepFreeze<Project>({
    app: "popgen",
    variants: {
      fileId: VARIANTS_ID,
      name: options.variantsName ?? "ld.nei",
      size: 68_354,
      format: options.vcf === true ? "vcf" : "nei",
      readOptions:
        options.vcf === true ? { ploidy: 2, onlyPassed: true } : null,
      read: {
        kind: "read",
        individuals: options.individuals ?? LD_INDIVIDUALS,
        ploidy: 2,
        numVars: null,
      },
    },
    filters: options.filters ?? [MISSING_DATA, LD_PRUNING],
    filtersOff: [],
    individualFilters: options.individualFilters ?? [],
    individualFiltersOff: [],
    individuals:
      table === null
        ? null
        : {
            fileId: INDIVIDUALS_ID,
            name: "ld_pops.csv",
            csv: { encoding: "auto", separator: "auto", decimal: "auto" },
            typesSet: [],
            read: {
              kind: "read",
              table,
              columns: table.columns.map((_, i) =>
                i === 0 ? { kind: "identifier" } : { kind: "categorical" },
              ),
              found: {
                encoding: "utf-8",
                separator: ",",
                decimal: ".",
                undecodedLine: null,
              },
            },
          },
    grouping:
      options.onePopulation === true
        ? { kind: "onePopulation" }
        : {
            kind: "populations",
            column: options.column === undefined ? "pop" : options.column,
          },
    analyses:
      ld === null
        ? []
        : [
            {
              analysis: "ldDecay",
              options: {
                maxDist: ld.maxDist,
                maxAllowedMaf: ld.maxAllowedMaf ?? 0.95,
              },
            },
          ],
    reference: null,
  });
}

/** The counts of the pass of the flow: the missing data filter keeps all
    500 variants. */
const FLOW_PASS: PassStats = {
  numVars: 500,
  filtering: { missing_data: { varsProcessed: 500, varsKept: 500 } },
};

/** The 50 bins of 2,000 bp up to `maxDist` 100,000: from 1 to 2,000,
    2,001 to 4,000, … 98,001 to 100,000. */
function binsTo(maxDist: number): {
  readonly smallestDist: Float64Array;
  readonly largestDist: Float64Array;
} {
  const width = maxDist / 50;
  return {
    smallestDist: Float64Array.from({ length: 50 }, (_, b) => b * width + 1),
    largestDist: Float64Array.from({ length: 50 }, (_, b) => (b + 1) * width),
  };
}

/** The pairs of a population of the flow in each bin: 745 in the first,
    452 in the last, and 29,367 in all, as `ldDecay.md` gives them. */
function flowPairs(): number[] {
  const pairs = Array.from({ length: 50 }, () => 587);
  pairs[0] = 745;
  pairs[48] = 581;
  pairs[49] = 452;
  return pairs;
}

/** The result of the flow, with the numbers of `ldDecay.md`, "The
    fixture"; the bins between the first and the last are made up, so
    that the pairs add up to 29,367. */
function flowResult(): LdDecayResult {
  const pairs = flowPairs();
  const meanA = pairs.map((_, b) =>
    b === 0 ? 0.3104664289575117 : b === 49 ? 0.025953462391956096 : 0.1,
  );
  const meanB = pairs.map((_, b) =>
    b === 0 ? 0.31876304803774247 : b === 49 ? 0.03162397044318621 : 0.1,
  );
  return {
    analysis: "ldDecay",
    pops: ["pop_a", "pop_b"],
    numIndividuals: Uint32Array.from([50, 50]),
    numVars: Float64Array.from([432, 432]),
    ...binsTo(100_000),
    numPairs: Float64Array.from([...pairs, ...pairs]),
    meanR2: Float64Array.from([...meanA, ...meanB]),
    sdR2: Float64Array.from(
      [...pairs, ...pairs].map((_, b) =>
        b === 0 ? 0.28243883665741665 : b === 50 ? 0.2814576610764838 : 0.2,
      ),
    ),
    rhoPerBp: Float64Array.from([
      0.00029996668947275404, 0.00030848266256738914,
    ]),
    r2AtZero: Float64Array.from([0.46942148760330576, 0.46942148760330576]),
    halfDist: Float64Array.from([7548.08187836982, 7339.709512618931]),
    passStats: FLOW_PASS,
  };
}

/** A population of a result written as a literal. */
interface PopOf {
  readonly name: string;
  readonly individuals?: number;
  readonly variants?: number;
  /** The pairs of each bin, 50 of them; none by default. */
  readonly pairs?: readonly number[];
  readonly rhoPerBp?: number;
  /** The fitted curve at 0; that of 50 individuals by default. */
  readonly r2AtZero?: number;
  readonly halfDist?: number;
}

/** A result of the populations `pops`, over the bins up to `maxDist`,
    with the counts of the flow. */
function resultOf(pops: readonly PopOf[], maxDist = 100_000): LdDecayResult {
  const pairs = pops.flatMap(
    (pop) => pop.pairs ?? Array.from({ length: 50 }, () => 0),
  );
  return {
    analysis: "ldDecay",
    pops: pops.map((pop) => pop.name),
    numIndividuals: Uint32Array.from(pops.map((pop) => pop.individuals ?? 50)),
    numVars: Float64Array.from(pops.map((pop) => pop.variants ?? 432)),
    ...binsTo(maxDist),
    numPairs: Float64Array.from(pairs),
    meanR2: Float64Array.from(pairs.map((n) => (n > 0 ? 0.2 : Number.NaN))),
    sdR2: Float64Array.from(pairs.map((n) => (n > 0 ? 0.1 : Number.NaN))),
    rhoPerBp: Float64Array.from(pops.map((pop) => pop.rhoPerBp ?? 0.0003)),
    r2AtZero: Float64Array.from(
      pops.map((pop) =>
        Number.isNaN(pop.rhoPerBp ?? 0)
          ? Number.NaN
          : (pop.r2AtZero ?? 0.46942148760330576),
      ),
    ),
    halfDist: Float64Array.from(pops.map((pop) => pop.halfDist ?? 7000)),
    passStats: FLOW_PASS,
  };
}

/** A population of the flow's shape: 50 individuals, the pairs of the
    flow, a curve with a half distance of 7,000 bp. */
function flowPop(name: string, rest: Partial<PopOf> = {}): PopOf {
  return { name, pairs: flowPairs(), ...rest };
}

/** The pairs of a population with pairs only in the bins `bins`, 10 in
    each. */
function pairsIn(bins: readonly number[]): number[] {
  return Array.from({ length: 50 }, (_, b) => (bins.includes(b) ? 10 : 0));
}

/** The text of the lock of the largest distance. */
const NO_DISTANCE =
  "The LD decay needs the largest distance between the two variants of a pair. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs.";

/** What the options should be. */
const OPTIONS_EXPECTED =
  "the largest distance of a pair, a whole number of base pairs from 50 to 9,007,199,254,740,991 or null, and the largest major allele frequency in each population, a number from 0.5 to 1, and nothing else";

describe("PA2 D5 ldDecayFilters", () => {
  test("of the missing data filter at 0.1, the MAF filter at 0.9 and the LD pruning at r² 0.3 within 10,000 bp, gives the first two in their order", () => {
    const filters: readonly ProjectVariantFilter[] = deepFreeze([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "maf", maxAllowedMaf: 0.9 },
      { kind: "ld", maxAllowedR2: 0.3, maxDist: 10_000 },
    ]);
    expect(ldDecayFilters(filters)).toStrictEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "maf", maxAllowedMaf: 0.9 },
    ]);
    expect(ldDecayFilters(filters)).toBe(ldDecayFilters(filters));
  });

  test("of the LD pruning with no distance alone gives none", () => {
    const filters: readonly ProjectVariantFilter[] = deepFreeze([
      { kind: "ld", maxAllowedR2: 0.3, maxDist: null },
    ]);
    expect(ldDecayFilters(filters)).toStrictEqual([]);
  });
});

describe("PA2 D5 the definition of the LD decay", () => {
  test("is ldDecay of population genetics, key version 1, reading the filters of individuals and not those of the variants, with no largest distance and a maximum MAF of 0.95 by default", () => {
    expect(ldDecay.id).toBe("ldDecay");
    expect(ldDecay.app).toStrictEqual(["popgen"]);
    expect(ldDecay.keyVersion).toBe(1);
    expect(ldDecay.filtersRead).toStrictEqual({
      variants: false,
      individuals: true,
    });
    expect(ldDecay.defaults).toStrictEqual({
      maxDist: null,
      maxAllowedMaf: 0.95,
    });
    expect(LD_DECAY_DEFAULTS).toStrictEqual({
      maxDist: null,
      maxAllowedMaf: 0.95,
    });
  });

  test("ldDecayOptions gives the options of the project, or the defaults without them", () => {
    expect(ldDecayOptions(project())).toStrictEqual({
      maxDist: 100_000,
      maxAllowedMaf: 0.95,
    });
    expect(ldDecayOptions(project({ ld: null }))).toStrictEqual({
      maxDist: null,
      maxAllowedMaf: 0.95,
    });
  });

  test("keptNeeds is populationsKeptNeeds, the diversity's: the individuals kept leaving no population", () => {
    expect(ldDecay.keptNeeds).toBe(populationsKeptNeeds);
    const p = project();
    const kept = individualsKept(p, null);
    if (kept === null || ldDecay.keptNeeds === undefined) {
      throw new Error("the flow's project has individuals kept");
    }
    expect(
      ldDecay.keptNeeds(p, {
        ...kept,
        list: { kind: "known", individuals: [] },
      }),
    ).toBe(
      "The 0 individuals kept have no population in pop, so none of the 2 populations has an individual left. Loosen the filters of individuals in the Variants step to keep them.",
    );
  });

  test("maxDistFor gives 25,000,000 bp for one population and 8,333,333 for three", () => {
    expect(maxDistFor(1)).toBe(25_000_000);
    expect(maxDistFor(3)).toBe(8_333_333);
  });
});

describe("PA2 D5 needs", () => {
  test("gives the reason of individualsNeeds first: an individual of ld.nei not in ld_pops.csv", () => {
    const p = project({ individuals: [...LD_INDIVIDUALS, "i100"] });
    const reason = individualsNeeds(p);
    expect(reason).not.toBeNull();
    expect(ldDecay.needs(p)).toBe(reason);
  });

  test("gives the three reasons of the column of the populations, before the largest distance", () => {
    expect(ldDecay.needs(project({ column: null, ld: null }))).toBe(
      "Choose the column that defines the populations, or all individuals in one population, in the Individuals step.",
    );
    expect(ldDecay.needs(project({ column: "popcat" }))).toBe(
      "ld_pops.csv has no column popcat, from which the populations were taken. Choose the column that defines the populations, or all individuals in one population, in the Individuals step.",
    );
    expect(
      ldDecay.needs(project({ table: tableOf(LD_INDIVIDUALS, () => null) })),
    ).toBe(
      "No individual of ld.nei has a population in the column pop of ld_pops.csv. Fill in the column and load the file again, or choose another column, in the Individuals step.",
    );
  });

  test("gives the reason of the lists of individuals leaving no individual with a population, before the largest distance", () => {
    const table = tableOf(LD_INDIVIDUALS, (name) =>
      name === "i099" ? null : "pop_a",
    );
    const p = project({
      table,
      ld: null,
      individualFilters: [{ kind: "keep", individuals: ["i099"] }],
    });
    expect(ldDecay.needs(p)).toBe(
      "The lists of individuals to keep and to remove leave none of the individuals of ld.nei that have a population in pop, so no population is left. Change the lists in the Variants step.",
    );
  });

  test("gives the reason of the largest distance not typed, with a metadata file and without", () => {
    expect(ldDecay.needs(project({ ld: null }))).toBe(NO_DISTANCE);
    expect(ldDecay.needs(project({ ld: { maxDist: null } }))).toBe(NO_DISTANCE);
    expect(ldDecay.needs(project({ table: null, ld: null }))).toBe(NO_DISTANCE);
  });

  test("with three populations, 8,333,333 bp gives null and 8,333,334 the reason of the memory", () => {
    const at = (maxDist: number): string | null =>
      ldDecay.needs(project({ table: THREE_POPS, ld: { maxDist } }));
    expect(at(8_333_333)).toBeNull();
    expect(at(8_333_334)).toBe(
      "With 3 populations, the largest distance can be at most 8,333,333 base pairs: the pairs are counted at every distance up to it, in up to 40 bytes for each base pair and population, and more than 1 GB of such counts may not fit in the memory of a browser tab. Type a smaller distance, or calculate it with popnei in Python, outside the browser.",
    );
  });

  test("with one population, 25,000,000 bp gives null and 25,000,001 the reason of the memory, without and with a metadata file", () => {
    const reason =
      "The largest distance can be at most 25,000,000 base pairs: the pairs are counted at every distance up to it, in up to 40 bytes for each base pair and population, and more than 1 GB of such counts may not fit in the memory of a browser tab. Type a smaller distance, or calculate it with popnei in Python, outside the browser.";
    for (const shape of [{ table: null }, { onePopulation: true }] as const) {
      expect(
        ldDecay.needs(project({ ...shape, ld: { maxDist: 25_000_000 } })),
      ).toBeNull();
      expect(
        ldDecay.needs(project({ ...shape, ld: { maxDist: 25_000_001 } })),
      ).toBe(reason);
    }
  });

  test("counts the populations the lists to keep and to remove leave, and not those a threshold may remove", () => {
    const pOnly = LD_INDIVIDUALS.filter((_, i) => i % 3 === 0);
    const listed = project({
      table: THREE_POPS,
      ld: { maxDist: 8_333_334 },
      individualFilters: [{ kind: "keep", individuals: pOnly }],
    });
    expect(ldDecay.needs(listed)).toBeNull();
    const threshold = project({
      table: THREE_POPS,
      ld: { maxDist: 8_333_334 },
      individualFilters: [{ kind: "missing_data", maxAllowedMissingRate: 0 }],
    });
    expect(ldDecay.needs(threshold)).toMatch(/^With 3 populations, /u);
  });

  test("the LD pruning of the Variants step with no distance locks nothing", () => {
    const p = project({
      filters: [MISSING_DATA, { kind: "ld", maxAllowedR2: 0.1, maxDist: null }],
    });
    expect(ldDecay.needs(p)).toBeNull();
  });

  test("in the store, the LD pruning with no distance leaves the LD decay ready, where the store locks what reads the filters of the variants", () => {
    const store = createStore<Job, JobResult>({
      first: emptyProject("popgen"),
      analyses: [individualChecks, filterCounts, ldDecay],
      send: () => ({
        id: 1,
        outcome: new Promise<Outcome<JobResult>>(() => undefined),
        cancel: () => undefined,
      }),
      countsOf,
      counts: "filterCounts",
      statistics: { analysis: "individualChecks", of: individualStatsOf },
      write: null,
      appVersion: "0.1.0",
      cacheMaxBytes: 1024 * 1024,
      maxUndoSteps: 200,
    });
    store.popneiReady("0.1.0");
    store.apply("the LD pruning was turned on", () =>
      project({
        filters: [
          MISSING_DATA,
          { kind: "ld", maxAllowedR2: 0.1, maxDist: null },
        ],
      }),
    );
    const status = (id: string): string | undefined =>
      store.getState().analyses.find((view) => view.id === id)?.status.kind;
    expect(status("ldDecay")).toBe("ready");
    expect(status("filterCounts")).toBe("locked");
  });
});

describe("PA2 D5 parseOptions", () => {
  const parsed = (options: unknown): unknown =>
    ldDecay.parseOptions(options, 1);
  const refused = { ok: false, error: OPTIONS_EXPECTED };

  test("gives the defaults back, an object of exactly the two fields", () => {
    expect(parsed({ maxDist: null, maxAllowedMaf: 0.95 })).toStrictEqual({
      ok: true,
      value: { maxDist: null, maxAllowedMaf: 0.95 },
    });
  });

  test("takes a largest distance of 50 and of 9,007,199,254,740,991", () => {
    for (const maxDist of [50, 9_007_199_254_740_991]) {
      expect(parsed({ maxDist, maxAllowedMaf: 0.95 })).toStrictEqual({
        ok: true,
        value: { maxDist, maxAllowedMaf: 0.95 },
      });
    }
  });

  test("refuses a largest distance of 49", () => {
    expect(parsed({ maxDist: 49, maxAllowedMaf: 0.95 })).toStrictEqual(refused);
  });

  test("refuses a largest distance of 50.5", () => {
    expect(parsed({ maxDist: 50.5, maxAllowedMaf: 0.95 })).toStrictEqual(
      refused,
    );
  });

  test("refuses a largest distance of 9,007,199,254,740,992", () => {
    expect(
      parsed({ maxDist: 9_007_199_254_740_992, maxAllowedMaf: 0.95 }),
    ).toStrictEqual(refused);
  });

  test("refuses a field missing", () => {
    expect(parsed({ maxDist: 100_000 })).toStrictEqual(refused);
    expect(parsed({ maxAllowedMaf: 0.95 })).toStrictEqual(refused);
  });

  test("refuses a field more", () => {
    expect(
      parsed({ maxDist: 100_000, maxAllowedMaf: 0.95, numBins: 50 }),
    ).toStrictEqual(refused);
  });

  test("takes a maximum MAF of 0.5 and 1, and refuses 0.49, 1.01, NaN and a text", () => {
    for (const maxAllowedMaf of [0.5, 1]) {
      expect(parsed({ maxDist: null, maxAllowedMaf })).toStrictEqual({
        ok: true,
        value: { maxDist: null, maxAllowedMaf },
      });
    }
    for (const maxAllowedMaf of [0.49, 1.01, Number.NaN, "0.95"]) {
      expect(parsed({ maxDist: null, maxAllowedMaf })).toStrictEqual(refused);
    }
  });

  test("refuses what is not an object of options: null, an array, a number, a distance as text", () => {
    for (const options of [
      null,
      [],
      3,
      { maxDist: "100000", maxAllowedMaf: 0.95 },
    ]) {
      expect(parsed(options)).toStrictEqual(refused);
    }
  });
});

describe("PA2 D5 run", () => {
  /** A client that keeps the jobs it is given. */
  function fakeClient(individuals: readonly string[] | null): {
    readonly client: WorkerClient<Job, JobResult>;
    readonly jobs: Job[];
  } {
    const jobs: Job[] = [];
    const client: WorkerClient<Job, JobResult> = {
      run: (job: Job): Run<JobResult> => {
        jobs.push(job);
        return {
          id: 1,
          outcome: new Promise<Outcome<JobResult>>(() => undefined),
          cancel: () => undefined,
        };
      },
      intermediateKey: () => "",
      individuals,
    };
    return { client, jobs };
  }

  test("sends the job of the flow, with the missing data filter and without the LD pruning the project has on", () => {
    const { client, jobs } = fakeClient(null);
    ldDecay.run(project(), client);
    expect(jobs).toStrictEqual([
      {
        analysis: "ldDecay",
        fileId: VARIANTS_ID,
        filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
        individuals: null,
        pops: [
          ["pop_a", LD_INDIVIDUALS.slice(0, 50)],
          ["pop_b", LD_INDIVIDUALS.slice(50)],
        ],
        minDist: 1,
        maxDist: 100_000,
        numBins: 50,
        maxAllowedMaf: 0.95,
      },
    ]);
  });

  test("sends the populations narrowed to the individuals kept, and the maximum MAF of the project", () => {
    const kept = [...LD_INDIVIDUALS.slice(0, 3), ...LD_INDIVIDUALS.slice(97)];
    const { client, jobs } = fakeClient(kept);
    ldDecay.run(project({ ld: { maxDist: 500, maxAllowedMaf: 0.8 } }), client);
    expect(jobs[0]).toMatchObject({
      individuals: kept,
      pops: [
        ["pop_a", ["i000", "i001", "i002"]],
        ["pop_b", ["i097", "i098", "i099"]],
      ],
      maxDist: 500,
      maxAllowedMaf: 0.8,
    });
  });

  test("throws a defect with no largest distance, which needs locks", () => {
    const { client } = fakeClient(null);
    expect(() => ldDecay.run(project({ ld: null }), client)).toThrow(
      /^popnei_web defect: /u,
    );
  });
});

describe("PA2 D5 fittedR2 and ldDecayCurve", () => {
  const rhoA = 0.00029996668947275404;
  const rhoB = 0.00030848266256738914;

  test("at 0 with n 50 gives popnei's r² at 0 exactly, for the ρ per base pair of pop_a", () => {
    expect(fittedR2(0, rhoA, 50)).toBe(0.46942148760330576);
  });

  test("at 0 with n 50 gives the same for the ρ per base pair of pop_b", () => {
    expect(fittedR2(0, rhoB, 50)).toBe(0.46942148760330576);
  });

  test("at 0 with n 100 gives 0.46198347107438015 exactly", () => {
    expect(fittedR2(0, rhoA, 100)).toBe(0.46198347107438015);
  });

  test("at the half distance of pop_a gives half of its r² at 0, within 1e-12", () => {
    const ratio = fittedR2(7548.08187836982, rhoA, 50) / 0.46942148760330576;
    expect(Math.abs(ratio - 0.5)).toBeLessThan(1e-12);
    // The ratio popnei's own curve gives there in node.
    expect(ratio).toBe(0.5000000000000889);
  });

  test("ldDecayCurve of a population with no curve gives null", () => {
    const r = resultOf([flowPop("p0", { rhoPerBp: Number.NaN })]);
    expect(ldDecayCurve(r, 0, 100_000)).toBeNull();
  });

  test("ldDecayCurve gives 200 points evenly spaced from 0 to the largest distance, and the curve at each", () => {
    // pop_b of 100 individuals, so that the n of pop_a would give another
    // curve.
    const r = resultOf([
      flowPop("pop_a", { rhoPerBp: rhoA }),
      flowPop("pop_b", {
        individuals: 100,
        rhoPerBp: rhoB,
        r2AtZero: 0.46198347107438015,
      }),
    ]);
    const curve = ldDecayCurve(r, 1, 100_000);
    if (curve === null) {
      throw new Error("pop_b has a curve");
    }
    expect(LD_CURVE_POINTS).toBe(200);
    expect(curve.x).toHaveLength(200);
    expect(curve.y).toHaveLength(200);
    expect(curve.x[0]).toBe(0);
    expect(curve.x[1]).toBe(100_000 / 199);
    expect(curve.x[199]).toBe(100_000);
    expect(curve.y[0]).toBe(0.46198347107438015);
    expect(curve.y[199]).toBe(fittedR2(100_000, rhoB, 100));
  });

  test("ldDecayCurve of a population the result does not have throws a defect", () => {
    expect(() => ldDecayCurve(flowResult(), 2, 100_000)).toThrow(
      /^popnei_web defect: /u,
    );
  });
});

describe("PA2 D5 the warnings", () => {
  const panelProject = (): Project =>
    project({
      table: tableOf(LD_INDIVIDUALS, (_, i) => `p${String(i % 3)}`),
    });

  test("the result of the flow raises none", () => {
    expect(ldDecay.warnings(flowResult(), project())).toStrictEqual([]);
  });

  test("a population of 12 individuals gives fewIndividuals with its words", () => {
    const r = resultOf([
      flowPop("pop_a"),
      flowPop("pop_b", { individuals: 12 }),
    ]);
    expect(ldDecay.warnings(r, project())).toStrictEqual([
      {
        code: "fewIndividuals",
        text: "Population pop_b has 12 individuals. With fewer than 20, r² is higher than in the population by chance alone, more than the fitted curve corrects for, so its curve lies higher and its half distance is longer than those of a larger population. Compare it with the others with this in mind.",
      },
    ]);
  });

  test("two populations of 12 and 8 individuals give one fewIndividuals with their counts, and four none", () => {
    const two = resultOf([
      flowPop("p3", { individuals: 12 }),
      flowPop("p5", { individuals: 8 }),
    ]);
    expect(ldDecay.warnings(two, panelProject())[0]).toStrictEqual({
      code: "fewIndividuals",
      text: "Populations p3 and p5 have fewer than 20 individuals, 12 and 8. With fewer than 20, r² is higher than in the population by chance alone, more than the fitted curve corrects for, so their curves lie higher and their half distances are longer than those of a larger population. Compare them with the others with this in mind.",
    });
    const four = resultOf(
      ["p1", "p2", "p3", "p4"].map((name) => flowPop(name, { individuals: 5 })),
    );
    expect(ldDecay.warnings(four, panelProject())[0]?.text).toMatch(
      /^Populations p1, p2 and 2 more have fewer than 20 individuals\. With /u,
    );
  });

  test("the one population of 12 individuals is named without the word population", () => {
    const r = resultOf([flowPop("All individuals", { individuals: 12 })]);
    expect(ldDecay.warnings(r, project({ table: null }))[0]?.text).toMatch(
      /^All individuals has 12 individuals\. With fewer than 20, /u,
    );
  });

  test("one variant counted and no pair gives noPairs with the words of the MAF", () => {
    const r = resultOf([
      flowPop("pop_a"),
      {
        name: "pop_b",
        variants: 1,
        rhoPerBp: Number.NaN,
        halfDist: Number.NaN,
      },
    ]);
    expect(ldDecay.warnings(r, project())).toStrictEqual([
      {
        code: "noPairs",
        text: "pop_b has no pair of variants to measure: fewer than two of its variants pass its maximum major allele frequency of 0.95.",
      },
    ]);
  });

  test("1,152 variants and no pair gives noPairs with the words of the distance", () => {
    const r = resultOf([
      flowPop("pop_a"),
      {
        name: "pop_b",
        variants: 1152,
        rhoPerBp: Number.NaN,
        halfDist: Number.NaN,
      },
    ]);
    expect(ldDecay.warnings(r, project())).toStrictEqual([
      {
        code: "noPairs",
        text: "pop_b has no pair of variants to measure: no two of its 1,152 variants on one chromosome are within 100,000 base pairs of each other with a value of r². Type a larger distance.",
      },
    ]);
  });

  test("pairs and no curve give noCurve", () => {
    const r = resultOf([
      flowPop("pop_a"),
      flowPop("pop_b", { rhoPerBp: Number.NaN, halfDist: Number.NaN }),
    ]);
    expect(ldDecay.warnings(r, project())).toStrictEqual([
      {
        code: "noCurve",
        text: "No curve could be fitted to the pairs of pop_b, so it has no half distance: its pairs are at one distance only, or r² does not fall with distance in a way a curve can follow within 100,000 base pairs, flat across them or fallen within the first base pair. Its mean r² of each bin is shown.",
      },
    ]);
  });

  test("a half distance of 1,599,810.0655818006 bp at a largest distance of 100,000 gives halfDistBeyondPairs, beyond the largest distance", () => {
    const r = resultOf([
      flowPop("pop_a"),
      flowPop("pop_b", { halfDist: 1_599_810.0655818006 }),
    ]);
    expect(ldDecay.warnings(r, project())).toStrictEqual([
      {
        code: "halfDistBeyondPairs",
        text: "The curve of pop_b falls to half at 1,599,810 bp, beyond the 100,000 base pairs within which pairs were counted, so that distance is where the curve would reach and not where pairs were measured, and the plot does not reach it. Type a larger distance to count pairs that far apart.",
      },
    ]);
  });

  test("a half distance within the largest distance and beyond the last bin with a pair gives halfDistBeyondPairs with that bin", () => {
    const r = resultOf(
      [
        flowPop("pop_a", {
          pairs: pairsIn([0, 1, 2, 3, 4, 20, 30, 49]),
          halfDist: 70_000,
        }),
        { name: "pop_b", pairs: pairsIn([0, 2, 4]), halfDist: 1_868_335.4 },
      ],
      2_800_000,
    );
    expect(
      ldDecay.warnings(r, project({ ld: { maxDist: 2_800_000 } })),
    ).toStrictEqual([
      {
        code: "halfDistBeyondPairs",
        text: "The curve of pop_b falls to half at 1,868,335 bp, beyond its furthest pairs, in the bin to 280,000 bp, so that distance is where the curve would reach and not where pairs were measured.",
      },
    ]);
  });

  test("the half distances of panel.nei, below 1 bp, give halfDistBelowPairs for each population", () => {
    const r = resultOf([
      { name: "p0", pairs: pairsIn([0]), halfDist: 0.247 },
      { name: "p2", pairs: pairsIn([0]), halfDist: 0.109 },
      { name: "p1", pairs: pairsIn([0]), halfDist: 0.139 },
    ]);
    const text = (pop: string): string =>
      `The curve of ${pop} falls to half within 1 bp, closer than the closest pairs counted, in the bin from 1 bp: r² is already low at the shortest distances of this file, and the half distance says only that LD falls within them.`;
    expect(ldDecay.warnings(r, panelProject())).toStrictEqual([
      { code: "halfDistBelowPairs", text: text("p0") },
      { code: "halfDistBelowPairs", text: text("p2") },
      { code: "halfDistBelowPairs", text: text("p1") },
    ]);
  });

  test("a half distance of 800 bp with the first pairs in the bin from 8,001 gives halfDistBelowPairs in whole base pairs", () => {
    const r = resultOf(
      [{ name: "p3", pairs: pairsIn([1, 2, 3]), halfDist: 800.4 }],
      400_000,
    );
    expect(
      ldDecay.warnings(r, project({ table: null, ld: { maxDist: 400_000 } })),
    ).toStrictEqual([
      {
        code: "halfDistBelowPairs",
        text: "The curve of p3 falls to half at 800 bp, closer than the closest pairs counted, in the bin from 8,001 bp: r² is already low at the shortest distances of this file, and the half distance says only that LD falls within them.",
      },
    ]);
  });

  test("the warnings come in their order, the two of the populations last, in the words of the LD decay", () => {
    const table = tableOf(LD_INDIVIDUALS, (name, i) =>
      name === "i099" ? null : i < 50 ? "pop_a" : i < 98 ? "pop_b" : "pop_c",
    );
    const r = resultOf([
      { name: "pop_a", individuals: 10, halfDist: 7000, pairs: pairsIn([0]) },
      {
        name: "pop_b",
        variants: 1,
        rhoPerBp: Number.NaN,
        halfDist: Number.NaN,
      },
    ]);
    const p = project({ table });
    expect(ldDecay.warnings(r, p).map((w) => w.code)).toStrictEqual([
      "fewIndividuals",
      "noPairs",
      "halfDistBeyondPairs",
      "individualsWithoutPopulation",
      "populationNotInResult",
    ]);
    expect(ldDecay.warnings(r, p).slice(3)).toStrictEqual([
      {
        code: "individualsWithoutPopulation",
        text: "1 individual of ld.nei has no population, and is left out of the LD decay: i099. If it belongs to one, fill in its population in the metadata file and load it again.",
      },
      {
        code: "populationNotInResult",
        text: "Population pop_c has no individual among the individuals of ld.nei that the filters kept, so it is not in the plot.",
      },
    ]);
  });

  test("the warnings of a result of another analysis, and those of a project of association, throw a defect", () => {
    const other: JobResult = { analysis: "filterCounts", passStats: FLOW_PASS };
    expect(() => ldDecay.warnings(other, project())).toThrow(
      /^popnei_web defect: /u,
    );
    const association = deepFreeze<Project>({
      ...project(),
      app: "gwas",
      grouping: { kind: "roles", roles: [] },
    });
    expect(() => ldDecay.warnings(flowResult(), association)).toThrow(
      /^popnei_web defect: /u,
    );
  });
});

describe("PA2 D5 checkNumbers", () => {
  test("of the result of the flow gives the variants kept, then the variants, the pairs and the half distance of each population", () => {
    expect(ldDecay.checkNumbers(flowResult())).toStrictEqual([
      500, 432, 29367, 7548.08187836982, 432, 29367, 7339.709512618931,
    ]);
  });

  test("gives null for a half distance of NaN, numCheckNumbers counts 1 + 3 × the populations, and a result of another analysis throws a defect", () => {
    const r = resultOf([flowPop("pop_a", { halfDist: Number.NaN })]);
    expect(ldDecay.checkNumbers(r)).toStrictEqual([500, 432, 29367, null]);
    expect(ldDecay.numCheckNumbers(project())).toBe(7);
    expect(ldDecay.numCheckNumbers(project({ table: null }))).toBe(4);
    expect(
      ldDecay.numCheckNumbers(
        project({
          individualFilters: [{ kind: "obs_het", maxAllowedObsHet: 0.5 }],
        }),
      ),
    ).toBeNull();
    expect(() =>
      ldDecay.checkNumbers({ analysis: "filterCounts", passStats: FLOW_PASS }),
    ).toThrow(/^popnei_web defect: /u);
  });
});

describe("PA2 D5 refusalText", () => {
  test("popnei's refusal for memory gives the words of the memory", () => {
    expect(
      refusalText(
        "this machine has not the memory for the pairs counted at every distance, 250000000 values of 16 bytes",
        project(),
      ),
    ).toBe(
      "The LD decay needed more memory than the browser tab could give. Type a smaller largest distance, keep fewer individuals with the filters of individuals, or calculate it with popnei in Python, outside the browser.",
    );
  });

  test("popnei's refusal of a pass with no variant gives the words of the filters", () => {
    expect(
      refusalText(
        "the pass gave no variant: its source gave 500 and the steps kept none of them, the filter by missing data kept 0",
        project(),
      ),
    ).toBe(
      "The filters kept none of the variants of ld.nei, so there is no variant to calculate the LD decay over. Loosen the filters in the Variants step.",
    );
  });

  test("a source that holds no variant, and any other refusal, give the words every analysis shares with those of the LD decay", () => {
    expect(
      refusalText(
        "the pass gave no variant and its source holds none",
        project(),
      ),
    ).toBe(
      "ld.nei has no variants, so there is no variant to calculate the LD decay over. Load another variants file in the Variants step.",
    );
    expect(refusalText("`numBins` is 0.", project())).toBe(
      "popnei could not calculate the LD decay: numBins is 0. Change the settings, or load the variants file again, to calculate it again.",
    );
  });
});

describe("PA2 D5 script", () => {
  test("of the project of the flow gives the lines of the spec", () => {
    expect(ldDecay.script(project())).toBe(
      [
        '# The LD decay of each population, from the column "pop", over the',
        "# filters of the Variants step but its LD pruning, on a Variants of its own",
        'ld_variants = popnei.open_vars("ld.nei")',
        "ld_variants.filter_by_missing_data(0.1)",
        "pops = {}",
        'for individual, pop in zip(individuals.iloc[:, 0], individuals["pop"]):',
        "    if not pandas.isna(pop):",
        "        pops.setdefault(pop, []).append(individual)",
        "kept = set(ld_variants.individuals)",
        "pops = {pop: [i for i in names if i in kept] for pop, names in pops.items()}",
        "pops = {pop: names for pop, names in pops.items() if names}",
        "ld = popnei.calc_ld_and_dist_per_pop(",
        "    ld_variants, pops=pops, min_dist=1, max_dist=100000, num_bins=50,",
        "    max_allowed_maf=0.95,",
        ")",
        "print(pandas.DataFrame({",
        '    "individuals": {pop: len(names) for pop, names in pops.items()},',
        '    "variants": ld.num_vars_per_pop,',
        '    "half_distance_bp": {pop: d.half_dist for pop, d in ld.decay_per_pop.items()},',
        '    "r2_at_distance_0": {pop: d.r2_at_zero for pop, d in ld.decay_per_pop.items()},',
        '    "rho_per_bp": {pop: d.rho_per_bp for pop, d in ld.decay_per_pop.items()},',
        "}).to_string())",
        "for pop, bins in ld.per_pop.items():",
        "    print(pop)",
        "    print(bins.to_string())",
        "",
      ].join("\n"),
    );
  });

  test("of the one population of a VCF with a filter of individuals opens the VCF with its options, keeps the individuals first, and builds All individuals", () => {
    const lines = ldDecay
      .script(
        project({
          table: null,
          vcf: true,
          variantsName: "ld.vcf.gz",
          individualFilters: [{ kind: "remove", individuals: ["i000"] }],
        }),
      )
      .split("\n");
    expect(lines.slice(0, 6)).toStrictEqual([
      "# The LD decay of every individual, as one population, over the",
      "# filters of the Variants step but its LD pruning, on a Variants of its own",
      'ld_variants = popnei.open_vcf("ld.vcf.gz", ploidy=2, only_passed=True)',
      "ld_variants.filter_individuals(individuals_kept)",
      "ld_variants.filter_by_missing_data(0.1)",
      'pops = {"All individuals": list(ld_variants.individuals)}',
    ]);
  });
});

describe("PA2 D5 ldPlotOmittedText", () => {
  const named = (count: number): LdDecayResult =>
    resultOf(Array.from({ length: count }, (_, i) => flowPop(`q${String(i)}`)));

  test("of 17 populations says the plot draws the first 16", () => {
    expect(ldPlotOmittedText(named(17))).toBe(
      "The plot draws the first 16 of the 17 populations, in the order of the table. The tables below hold all 17.",
    );
  });

  test("of 16 populations gives null", () => {
    expect(ldPlotOmittedText(named(16))).toBeNull();
  });
});

describe("PA2 D5 the rows and the CSV of the two tables", () => {
  test("ldDecayRows gives one row per population, the same array for the same result", () => {
    const r = flowResult();
    const rows = ldDecayRows(r);
    expect(rows).toBe(ldDecayRows(r));
    expect(rows[0]).toStrictEqual({
      population: "pop_a",
      individuals: 50,
      variants: 432,
      pairs: 29367,
      halfDist: 7548.08187836982,
      r2AtZero: 0.46942148760330576,
      rhoPerBp: 0.00029996668947275404,
    });
    const other = resultOf([
      flowPop("pop_a"),
      flowPop("pop_b", {
        individuals: 100,
        variants: 419,
        rhoPerBp: 0.00031,
        r2AtZero: 0.46198347107438015,
        halfDist: 7104.846292628652,
      }),
    ]);
    expect(ldDecayRows(other)[1]).toStrictEqual({
      population: "pop_b",
      individuals: 100,
      variants: 419,
      pairs: 29367,
      halfDist: 7104.846292628652,
      r2AtZero: 0.46198347107438015,
      rhoPerBp: 0.00031,
    });
  });

  test("ldBinRows gives one row per population and bin, the bins of a population together, null for no pair", () => {
    const r = resultOf([
      flowPop("pop_a"),
      { name: "pop_b", pairs: pairsIn([2]) },
    ]);
    const rows = ldBinRows(r);
    expect(rows).toBe(ldBinRows(r));
    expect(rows).toHaveLength(100);
    expect(rows[0]).toStrictEqual({
      population: "pop_a",
      from: 1,
      to: 2000,
      pairs: 745,
      meanR2: 0.2,
      sdR2: 0.1,
    });
    expect(rows[1]).toStrictEqual({
      population: "pop_a",
      from: 2001,
      to: 4000,
      pairs: 587,
      meanR2: 0.2,
      sdR2: 0.1,
    });
    expect(rows[52]).toStrictEqual({
      population: "pop_b",
      from: 4001,
      to: 6000,
      pairs: 10,
      meanR2: 0.2,
      sdR2: 0.1,
    });
    expect(rows[50]).toStrictEqual({
      population: "pop_b",
      from: 1,
      to: 2000,
      pairs: 0,
      meanR2: null,
      sdR2: null,
    });
  });

  test("the CSVs hold every digit, an empty cell for no value, and a quoted name", () => {
    const r = resultOf([
      flowPop("pop,a", { halfDist: Number.NaN, rhoPerBp: Number.NaN }),
    ]);
    expect(ldDecayCsv(flowResult())).toBe(
      [
        "population,individuals,variants,pairs,half_distance_bp,r2_at_distance_0,rho_per_bp",
        "pop_a,50,432,29367,7548.08187836982,0.46942148760330576,0.00029996668947275404",
        "pop_b,50,432,29367,7339.709512618931,0.46942148760330576,0.00030848266256738914",
        "",
      ].join("\n"),
    );
    expect(ldDecayCsv(r)).toBe(
      'population,individuals,variants,pairs,half_distance_bp,r2_at_distance_0,rho_per_bp\n"pop,a",50,432,29367,,,\n',
    );
    const bins = ldBinsCsv(flowResult()).split("\n");
    expect(bins).toHaveLength(102);
    expect(bins.slice(0, 3)).toStrictEqual([
      "population,smallest_dist,largest_dist,num_pairs,mean_r2,sd_r2",
      "pop_a,1,2000,745,0.3104664289575117,0.28243883665741665",
      "pop_a,2001,4000,587,0.1,0.2",
    ]);
    expect(bins.slice(50, 52)).toStrictEqual([
      "pop_a,98001,100000,452,0.025953462391956096,0.2",
      "pop_b,1,2000,745,0.31876304803774247,0.2814576610764838",
    ]);
    expect(bins[101]).toBe("");
  });
});

describe("PA2 D5 the options through setAnalysisOptions", () => {
  test("a largest distance set by the command is read back by ldDecayOptions", () => {
    const p = setAnalysisOptions(project({ ld: null }), ldDecay, {
      maxDist: 2_000_000,
      maxAllowedMaf: 0.9,
    });
    expect(ldDecayOptions(p)).toStrictEqual({
      maxDist: 2_000_000,
      maxAllowedMaf: 0.9,
    });
  });
});

/** The key of the LD decay for `p`, with popnei 0.1.0 unless another
    version is given. */
function keyOfLd(
  p: Project,
  popneiVersion = "0.1.0",
  def: KeyedDef = ldDecay,
): Key {
  return keyOf(def, p, popneiVersion, createKeyMemo());
}

/** `p` with its parts `parts` replaced, frozen deeply. */
function changed(p: Project, parts: Partial<Project>): Project {
  return deepFreeze<Project>({ ...p, ...parts });
}

describe("PA2 D6 the key of the LD decay", () => {
  const base = project();
  const baseKey = keyOfLd(base);

  test("a new load of the variants file, and the ploidy or onlyPassed of a VCF, change it", () => {
    const variants = base.variants;
    if (variants === null) {
      throw new Error("the flow's project has a variants file");
    }
    expect(
      keyOfLd(
        changed(base, { variants: { ...variants, fileId: "1".repeat(32) } }),
      ),
    ).not.toBe(baseKey);
    const vcf = project({ vcf: true });
    const vcfVariants = vcf.variants;
    if (vcfVariants === null) {
      throw new Error("the VCF project has a variants file");
    }
    const vcfKey = keyOfLd(vcf);
    for (const readOptions of [
      { ploidy: 4, onlyPassed: true },
      { ploidy: 2, onlyPassed: false },
    ]) {
      expect(
        keyOfLd(changed(vcf, { variants: { ...vcfVariants, readOptions } })),
      ).not.toBe(vcfKey);
    }
  });

  test("the missing data, observed heterozygosity and MAF filters, turned on or off or their thresholds, change it", () => {
    const lists: readonly (readonly ProjectVariantFilter[])[] = [
      [LD_PRUNING],
      [{ kind: "missing_data", maxAllowedMissingRate: 0.2 }, LD_PRUNING],
      [MISSING_DATA, { kind: "obs_het", maxAllowedObsHet: 0.5 }, LD_PRUNING],
      [MISSING_DATA, { kind: "maf", maxAllowedMaf: 0.9 }, LD_PRUNING],
      [MISSING_DATA, { kind: "maf", maxAllowedMaf: 0.8 }, LD_PRUNING],
    ];
    const keys = lists.map((filters) => keyOfLd(project({ filters })));
    expect(new Set([baseKey, ...keys]).size).toBe(lists.length + 1);
  });

  test("the LD pruning turned off keeps it", () => {
    expect(keyOfLd(project({ filters: [MISSING_DATA] }))).toBe(baseKey);
  });

  test("the LD pruning changed, its r², its distance or no distance, keeps it", () => {
    const lds: readonly ProjectVariantFilter[] = [
      { kind: "ld", maxAllowedR2: 0.5, maxDist: 50_000 },
      { kind: "ld", maxAllowedR2: 0.1, maxDist: 10_000 },
      { kind: "ld", maxAllowedR2: 0.1, maxDist: null },
    ];
    for (const ld of lds) {
      expect(keyOfLd(project({ filters: [MISSING_DATA, ld] }))).toBe(baseKey);
    }
  });

  test("a filter of individuals, a list or a threshold, changes it", () => {
    const lists: readonly (readonly IndividualFilter[])[] = [
      [{ kind: "keep", individuals: ["i000", "i050"] }],
      [{ kind: "remove", individuals: ["i000"] }],
      [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
      [{ kind: "missing_data", maxAllowedMissingRate: 0.2 }],
    ];
    const keys = lists.map((individualFilters) =>
      keyOfLd(project({ individualFilters })),
    );
    expect(new Set([baseKey, ...keys]).size).toBe(lists.length + 1);
  });

  test("the populations change it as for the diversity: another grouping, a cell of the column, the rows in another order, the metadata file removed; onePopulation is the same as no file, and another column with the same populations keeps it", () => {
    const removed = project({ table: null });
    const keys = [
      project({ table: THREE_POPS }),
      project({
        table: tableOf(LD_INDIVIDUALS, (_, i) => (i < 49 ? "pop_a" : "pop_b")),
      }),
      project({ table: { ...LD_POPS, rows: LD_POPS.rows.toReversed() } }),
      removed,
    ].map((p) => keyOfLd(p));
    expect(new Set([baseKey, ...keys]).size).toBe(5);
    expect(keyOfLd(project({ onePopulation: true }))).toBe(keyOfLd(removed));
    const renamed = project({
      table: { columns: ["IID", "group"], rows: LD_POPS.rows },
      column: "group",
    });
    expect(keyOfLd(renamed)).toBe(baseKey);
  });

  test("the largest distance, typed or changed, and the maximum MAF change it", () => {
    const keys = [
      project({ ld: null }),
      project({ ld: { maxDist: 200_000 } }),
      project({ ld: { maxDist: 100_000, maxAllowedMaf: 0.9 } }),
    ].map((p) => keyOfLd(p));
    expect(new Set([baseKey, ...keys]).size).toBe(4);
  });

  test("the options of another analysis and the reference keep it", () => {
    const variants = base.variants;
    if (variants === null) {
      throw new Error("the flow's project has a variants file");
    }
    const otherOptions = changed(base, {
      analyses: [
        ...base.analyses,
        {
          analysis: "diversity",
          options: { minNumIndividuals: 10, polyThreshold: 0.95 },
        },
      ],
    });
    const referenced = changed(base, { reference: { variants, checks: [] } });
    expect(keyOfLd(otherOptions)).toBe(baseKey);
    expect(keyOfLd(referenced)).toBe(baseKey);
  });

  test("the key version, 1, or the version of popnei, changes it", () => {
    expect(ldDecay.keyVersion).toBe(1);
    const other: KeyedDef = { ...ldDecay, keyVersion: 2 };
    expect(keyOfLd(base, "0.1.0", other)).not.toBe(baseKey);
    expect(keyOfLd(base, "0.2.0")).not.toBe(baseKey);
  });

  test("keyInputs gives the populations, the filters but the LD pruning, and the options, without reading p.variants", () => {
    expect(ldDecay.keyInputs(changed(base, { variants: null }))).toStrictEqual({
      pops: [
        ["pop_a", LD_INDIVIDUALS.slice(0, 50)],
        ["pop_b", LD_INDIVIDUALS.slice(50)],
      ],
      filters: [MISSING_DATA],
      options: { maxDist: 100_000, maxAllowedMaf: 0.95 },
    });
  });
});

describe("PA2 D5 maxDistReason, the reason beside the field of the distance", () => {
  test("gives the reason of the largest distance not typed, whatever else locks, and null once it is typed", () => {
    expect(maxDistReason(project({ ld: null }))).toBe(NO_DISTANCE);
    expect(maxDistReason(project({ column: null, ld: null }))).toBe(
      NO_DISTANCE,
    );
    expect(maxDistReason(project())).toBeNull();
    expect(
      maxDistReason(project({ table: THREE_POPS, ld: { maxDist: 9_000_000 } })),
    ).toBeNull();
  });
});

describe("PA2 D5 the script with every option and filter", () => {
  test("a maximum MAF of 0.8, the MAF and observed heterozygosity filters and a VCF read with every variant are written out", () => {
    const lines = ldDecay
      .script(
        project({
          vcf: true,
          variantsName: "ld.vcf.gz",
          filters: [
            MISSING_DATA,
            { kind: "obs_het", maxAllowedObsHet: 0.5 },
            { kind: "maf", maxAllowedMaf: 0.95 },
            LD_PRUNING,
          ],
          ld: { maxDist: 250_000, maxAllowedMaf: 0.8 },
        }),
      )
      .split("\n");
    expect(lines.slice(2, 6)).toStrictEqual([
      'ld_variants = popnei.open_vcf("ld.vcf.gz", ploidy=2, only_passed=True)',
      "ld_variants.filter_by_missing_data(0.1)",
      "ld_variants.filter_by_obs_het(0.5)",
      "ld_variants.filter_by_maf(0.95)",
    ]);
    expect(lines.slice(13, 16)).toStrictEqual([
      "ld = popnei.calc_ld_and_dist_per_pop(",
      "    ld_variants, pops=pops, min_dist=1, max_dist=250000, num_bins=50,",
      "    max_allowed_maf=0.8,",
    ]);
    const vcf = project({ vcf: true, variantsName: "ld.vcf.gz" });
    const variants = vcf.variants;
    if (variants === null) {
      throw new Error("the VCF project has a variants file");
    }
    const unpassed = ldDecay.script(
      changed(vcf, {
        variants: {
          ...variants,
          readOptions: { ploidy: 4, onlyPassed: false },
        },
      }),
    );
    expect(unpassed.split("\n")[2]).toBe(
      'ld_variants = popnei.open_vcf("ld.vcf.gz", ploidy=4, only_passed=False)',
    );
  });
});

describe("PA2 D5 the boundaries of the rules", () => {
  test("fewIndividuals: 19 individuals are fewer than 20, and 20 are not", () => {
    const at = (individuals: number): readonly string[] =>
      ldDecay
        .warnings(
          resultOf([flowPop("pop_a"), flowPop("pop_b", { individuals })]),
          project(),
        )
        .map((w) => w.code);
    expect(at(19)).toStrictEqual(["fewIndividuals"]);
    expect(at(20)).toStrictEqual([]);
  });

  test("noPairs: 1 variant is below 2, with the words of the MAF, and 2 are not; the maximum MAF and the distance of the project are in the words", () => {
    const at = (variants: number): string | undefined =>
      ldDecay.warnings(
        resultOf([
          flowPop("pop_a"),
          {
            name: "pop_b",
            variants,
            rhoPerBp: Number.NaN,
            halfDist: Number.NaN,
          },
        ]),
        project({ ld: { maxDist: 100_000, maxAllowedMaf: 0.8 } }),
      )[0]?.text;
    expect(at(1)).toBe(
      "pop_b has no pair of variants to measure: fewer than two of its variants pass its maximum major allele frequency of 0.8.",
    );
    expect(at(2)).toBe(
      "pop_b has no pair of variants to measure: no two of its 2 variants on one chromosome are within 100,000 base pairs of each other with a value of r². Type a larger distance.",
    );
    const r = resultOf(
      [
        flowPop("pop_a"),
        {
          name: "pop_b",
          variants: 3,
          rhoPerBp: Number.NaN,
          halfDist: Number.NaN,
        },
      ],
      250_000,
    );
    expect(
      ldDecay.warnings(r, project({ ld: { maxDist: 250_000 } }))[0]?.text,
    ).toMatch(/ within 250,000 base pairs of each other /u);
  });

  test("noCurve names the distance of the project", () => {
    const r = resultOf(
      [flowPop("pop_b", { rhoPerBp: Number.NaN, halfDist: Number.NaN })],
      250_000,
    );
    expect(
      ldDecay.warnings(r, project({ table: null, ld: { maxDist: 250_000 } }))[0]
        ?.text,
    ).toMatch(/ a curve can follow within 250,000 base pairs, flat /u);
  });

  test("halfDistBeyondPairs: a half distance at the furthest pairs is not beyond them, and one at the largest distance is beyond the pairs but within the distance", () => {
    // Pairs up to the bin to 280,000 of a largest distance of 2,800,000.
    const at = (halfDist: number): readonly Warning[] =>
      ldDecay.warnings(
        resultOf(
          [{ name: "pop_b", pairs: pairsIn([0, 4]), halfDist }],
          2_800_000,
        ),
        project({ table: null, ld: { maxDist: 2_800_000 } }),
      );
    expect(at(280_000)).toStrictEqual([]);
    expect(at(2_800_000)).toStrictEqual([
      {
        code: "halfDistBeyondPairs",
        text: "The curve of pop_b falls to half at 2,800,000 bp, beyond its furthest pairs, in the bin to 280,000 bp, so that distance is where the curve would reach and not where pairs were measured.",
      },
    ]);
    expect(at(2_800_001)[0]?.text).toMatch(
      /^The curve of pop_b falls to half at 2,800,001 bp, beyond the 2,800,000 base pairs within which/u,
    );
  });

  test("halfDistBelowPairs: a half distance at the closest pairs is not below them, and one of 1 bp is written at 1 bp, not within it", () => {
    const at = (halfDist: number): readonly Warning[] =>
      ldDecay.warnings(
        resultOf([{ name: "p3", pairs: pairsIn([1, 2]), halfDist }], 400_000),
        project({ table: null, ld: { maxDist: 400_000 } }),
      );
    expect(at(8001)).toStrictEqual([]);
    expect(at(1)[0]?.text).toMatch(/^The curve of p3 falls to half at 1 bp, /u);
    expect(at(0.999)[0]?.text).toMatch(
      /^The curve of p3 falls to half within 1 bp, /u,
    );
  });

  test("numCheckNumbers counts the populations the lists of individuals to keep and to remove leave", () => {
    expect(
      ldDecay.numCheckNumbers(
        project({
          individualFilters: [
            { kind: "keep", individuals: LD_INDIVIDUALS.slice(0, 50) },
          ],
        }),
      ),
    ).toBe(4);
    expect(
      ldDecay.numCheckNumbers(
        project({
          table: THREE_POPS,
          individualFilters: [{ kind: "remove", individuals: ["i000"] }],
        }),
      ),
    ).toBe(10);
  });

  test("needs throws a defect on a project of association", () => {
    const association = deepFreeze<Project>({
      ...project(),
      app: "gwas",
      grouping: { kind: "roles", roles: [["pop", "ignored"]] },
    });
    expect(individualsNeeds(association)).toBeNull();
    expect(() => ldDecay.needs(association)).toThrow(/^popnei_web defect: /u);
  });
});

describe("PA6 the small rules of the populations, shared from project.ts", () => {
  test("three populations of few individuals give fewIndividuals with their counts, as MAX_NAMED of namesOf allows", () => {
    const three = resultOf([
      flowPop("p3", { individuals: 12 }),
      flowPop("p5", { individuals: 8 }),
      flowPop("p6", { individuals: 5 }),
    ]);
    const p = project({
      table: tableOf(LD_INDIVIDUALS, (_, i) => `p${String(i % 3)}`),
    });
    expect(ldDecay.warnings(three, p)[0]).toStrictEqual({
      code: "fewIndividuals",
      text: "Populations p3, p5 and p6 have fewer than 20 individuals, 12, 8 and 5. With fewer than 20, r² is higher than in the population by chance alone, more than the fitted curve corrects for, so their curves lie higher and their half distances are longer than those of a larger population. Compare them with the others with this in mind.",
    });
  });
});
