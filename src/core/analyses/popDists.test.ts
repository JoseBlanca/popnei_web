/**
 * The tests of the distances between populations in core
 * (docs/specs/analyses/popDists.md, "How it is verified"), but those of
 * its key, which come with `keyInputs`, and those of the panel's
 * functions. The flow's project is `panel.nei` with the column `popcat`
 * of `e2e/fixtures/panel_pops.csv`, and the fixture with a negative
 * distance is `e2e/fixtures/panel_split.csv`, both read from the files;
 * the numbers of the results are popnei's, as the spec gives them.
 */

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  POP_DISTS_DEFAULTS,
  popDists,
  popDistsOptions,
  refusalText,
} from "./popDists.ts";
import { individualsKept } from "../individualsKept.ts";
import { createKeyMemo, keyOf } from "../keys.ts";
import type { Key, KeyedDef } from "../keys.ts";
import type { IndividualsKept } from "../individualsKept.ts";
import { individualsNeeds } from "../project.ts";
import { populationsKeptNeeds } from "../populations.ts";
import type { Project } from "../project.ts";
import type { Warning, WorkerClient } from "../store.ts";
import { deepFreeze, withPassedOn } from "../testSupport.ts";
import type {
  Cell,
  HeatmapOrder,
  IndividualFilter,
  IndividualsTable,
  Job,
  JobResult,
  LeftOut,
  Outcome,
  PassStats,
  PopDistsResult,
  Run,
} from "../../worker/protocol.ts";

const VARIANTS_ID = "00112233445566778899aabbccddeeff";
const INDIVIDUALS_ID = "ffeeddccbbaa99887766554433221100";

/** A table of a CSV fixture of two columns, as the reader gives it. */
function fixtureTable(name: string): IndividualsTable {
  const text = readFileSync(
    new URL(`../../../e2e/fixtures/${name}`, import.meta.url),
    "utf8",
  );
  const [header, ...lines] = text.trim().split("\n");
  if (header === undefined) {
    throw new Error(`${name} has no header`);
  }
  return {
    columns: header.split(","),
    rows: lines.map((line) => line.split(",")),
  };
}

/** `panel_pops.csv`: 200 individuals, `s000` to `s199`, in p0 (48), p2
    (84) and p1 (68), which first appear in that order. */
const PANEL_POPS = fixtureTable("panel_pops.csv");

/** `panel_split.csv`: p0 split into p0a and p0b, 24 each. */
const PANEL_SPLIT = fixtureTable("panel_split.csv");

/** The individuals of `panel.nei`, those of `panel_pops.csv` in its
    order. */
const PANEL_INDIVIDUALS: readonly string[] = PANEL_POPS.rows.map((row) =>
  String(row[0]),
);

/** The individuals of the population `pop` of `table`, in its order. */
function membersOf(table: IndividualsTable, pop: string): string[] {
  return table.rows
    .filter((row) => row[1] === pop)
    .map((row) => String(row[0]));
}

/** The table of the worked example, the diversity's: `i4` has no
    population, and `i5` is not in the variants file. */
const EXAMPLE_TABLE: IndividualsTable = {
  columns: ["name", "pop", "other"],
  rows: [
    ["i1", "A", "x"],
    ["i2", "B", "y"],
    ["i3", "A", "x"],
    ["i4", null, "z"],
    ["i5", "C", "y"],
  ],
};

/** A table `IID,pop` of populations of the sizes `sizes`, named `p0`,
    `p1`, …, of individuals `s000`, `s001`, … in that order. */
function tableOfSizes(sizes: readonly number[]): IndividualsTable {
  const rows: Cell[][] = [];
  for (const [pop, size] of sizes.entries()) {
    for (let i = 0; i < size; i++) {
      rows.push([
        `s${String(rows.length).padStart(3, "0")}`,
        `p${String(pop)}`,
      ]);
    }
  }
  return { columns: ["IID", "pop"], rows };
}

/** The project of the flow, frozen deeply: `panel.nei` with the 200
    individuals of `panel_pops.csv`, the missing data filter at 0.1, the
    metadata file `panel_pops.csv` and its column `popcat`; each part
    replaced by the option of its name. */
function project(
  options: {
    readonly table?: IndividualsTable | null;
    readonly tableName?: string;
    readonly column?: string | null;
    readonly onePopulation?: boolean;
    readonly individuals?: readonly string[];
    readonly individualFilters?: readonly IndividualFilter[];
    readonly min?: number;
    readonly measure?: "fst" | "dest";
    readonly ploidy?: number;
    readonly pending?: boolean;
  } = {},
): Project {
  const table = options.table === undefined ? PANEL_POPS : options.table;
  const individuals =
    options.individuals ??
    (table === null
      ? PANEL_INDIVIDUALS
      : table.rows.map((row) => String(row[0])));
  return deepFreeze<Project>({
    app: "popgen",
    variants: {
      fileId: VARIANTS_ID,
      name: "panel.nei",
      size: 261_490,
      format: "nei",
      readOptions: null,
      read:
        options.pending === true
          ? { kind: "pending" }
          : {
              kind: "read",
              individuals,
              ploidy: options.ploidy ?? 2,
              numVars: null,
              keepsPassed: false,
            },
    },
    filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
    filtersOff: [],
    individualFilters: options.individualFilters ?? [],
    individualFiltersOff: [],
    individuals:
      table === null
        ? null
        : {
            fileId: INDIVIDUALS_ID,
            name: options.tableName ?? "panel_pops.csv",
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
            column:
              options.column === undefined
                ? (table?.columns[1] ?? null)
                : options.column,
          },
    analyses:
      options.min === undefined && options.measure === undefined
        ? []
        : [
            {
              analysis: "popDists",
              options: {
                minNumIndividuals: options.min ?? 20,
                measure: options.measure ?? "fst",
              },
            },
          ],
    reference: null,
  });
}

/** The project of the worked example: `i1` to `i4` in the variants file,
    the column `pop` of `pops.csv`, and the minimum `min`. */
function exampleProject(min: number): Project {
  return project({
    table: EXAMPLE_TABLE,
    tableName: "pops.csv",
    column: "pop",
    individuals: ["i1", "i2", "i3", "i4"],
    min,
  });
}

/** The counts of the pass of the flow: the missing data filter at 0.1
    keeps the 1,200 variants. */
const FLOW_PASS: PassStats = {
  numVars: 1200,
  filtering: { missing_data: { varsProcessed: 1200, varsKept: 1200 } },
};

/** An order of the heatmap along the PCoA. */
function pcoa(order: readonly number[]): HeatmapOrder {
  return { kind: "pcoa", order: Uint32Array.from(order) };
}

/** The result of the flow, the numbers of popDists.md at the missing
    data filter at 0.1, ordered p2, p0, p1 by both measures. */
function flowResult(): PopDistsResult {
  return {
    analysis: "popDists",
    pops: ["p0", "p2", "p1"],
    numIndividuals: Uint32Array.from([48, 84, 68]),
    fst: Float64Array.from([
      0.10273588423661377, 0.10496244498389443, 0.10962148955018115,
    ]),
    dest: Float64Array.from([
      0.06129813142463423, 0.06354346296076403, 0.06567052128821259,
    ]),
    numVarsPerPair: Uint32Array.from([1200, 1200, 1200]),
    order: { fst: pcoa([1, 0, 2]), dest: pcoa([1, 0, 2]) },
    leftOut: [],
    passStats: FLOW_PASS,
  };
}

/** A pair of a fake result: its Fst, D and variants. */
interface PairOf {
  readonly fst?: number;
  readonly dest?: number;
  readonly numVars?: number;
}

/** A fake result of the populations `pops`, each of 30 individuals, with
    the pairs `pairs` in the order of the result, 0.1 and 0.06 over 1,200
    variants where a pair gives none, the populations `leftOut`, and the
    orders `order` of the heatmap, those of the file unless given. */
function resultOf(
  pops: readonly string[],
  pairs: readonly PairOf[] = [],
  leftOut: LeftOut = [],
  passStats: PassStats = FLOW_PASS,
  order: PopDistsResult["order"] = {
    fst: { kind: "file", reason: "twoPopulations" },
    dest: { kind: "file", reason: "twoPopulations" },
  },
): PopDistsResult {
  const numPairs = (pops.length * (pops.length - 1)) / 2;
  const all = Array.from({ length: numPairs }, (_, i) => pairs[i] ?? {});
  return {
    analysis: "popDists",
    pops,
    numIndividuals: Uint32Array.from(pops.map(() => 30)),
    fst: Float64Array.from(all.map((pair) => pair.fst ?? 0.1)),
    dest: Float64Array.from(all.map((pair) => pair.dest ?? 0.06)),
    numVarsPerPair: Uint32Array.from(all.map((pair) => pair.numVars ?? 1200)),
    order,
    leftOut,
    passStats,
  };
}

/** The warnings of `r` for `p` of the code `code`. */
function warningsOf(r: JobResult, p: Project, code: string): Warning[] {
  return popDists.warnings(r, p).filter((w) => w.code === code);
}

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

/** The individuals kept of `p` with the list `list` known. */
function keptWith(p: Project, list: readonly string[]): IndividualsKept {
  const kept = individualsKept(p, null);
  if (kept === null) {
    throw new Error("the project has individuals kept");
  }
  return { ...kept, list: { kind: "known", individuals: list } };
}

/** The `keptNeeds` of the distances, which they have. */
function keptNeeds(p: Project, kept: IndividualsKept): string | null {
  if (popDists.keptNeeds === undefined) {
    throw new Error("the distances have a keptNeeds");
  }
  return popDists.keptNeeds(p, kept);
}

/** What the options should be. */
const OPTIONS_EXPECTED =
  'the minimum of individuals, a whole number from 0 to 4,294,967,295, and the distance the heatmap draws, "fst" or "dest", and nothing else';

describe("PA3 D4 the definition of the distances", () => {
  test("is popDists of population genetics, key version 1, reading both lists of filters, with a minimum of 20 and Hudson's Fst by default", () => {
    expect(popDists.id).toBe("popDists");
    expect(popDists.app).toStrictEqual(["popgen"]);
    expect(popDists.keyVersion).toBe(1);
    expect(popDists.filtersRead).toStrictEqual({
      variants: true,
      individuals: true,
    });
    expect(popDists.defaults).toStrictEqual({
      minNumIndividuals: 20,
      measure: "fst",
    });
    expect(POP_DISTS_DEFAULTS).toStrictEqual({
      minNumIndividuals: 20,
      measure: "fst",
    });
  });

  test("popDistsOptions gives the options of the project, or the defaults without them", () => {
    expect(popDistsOptions(project({ min: 10 }))).toStrictEqual({
      minNumIndividuals: 10,
      measure: "fst",
    });
    expect(popDistsOptions(project())).toStrictEqual({
      minNumIndividuals: 20,
      measure: "fst",
    });
  });
});

describe("PA3 D4 the worked example", () => {
  test("with the minimum at 1, run sends A and B, C being outside the variants file, and leaves out none", () => {
    const { client, jobs } = fakeClient(null);
    popDists.run(exampleProject(1), client);
    expect(jobs).toStrictEqual([
      {
        analysis: "popDists",
        fileId: VARIANTS_ID,
        filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
        individuals: null,
        pops: [
          ["A", ["i1", "i3"]],
          ["B", ["i2"]],
        ],
        leftOut: [],
        minNumIndividuals: 1,
      },
    ]);
  });

  test("with the minimum at 2, needs gives that only A has 2 individuals or more", () => {
    expect(popDists.needs(exampleProject(2))).toBe(
      "Only A has 2 individuals or more, and a variant counts for a pair of populations only where both have 2 individuals with a called genotype, so no pair has a distance. Lower the number of individuals needed, above, or merge populations in the metadata file.",
    );
  });

  test("a result of A and B with an Fst of −0.01 and a D of 0.02 gives negativeDistance naming Fst alone, the check numbers [numVars, −0.01, 0.02], and 3 of them", () => {
    const p = exampleProject(1);
    const r = resultOf(["A", "B"], [{ fst: -0.01, dest: 0.02 }]);
    expect(popDists.warnings(r, p)).toStrictEqual([
      {
        code: "individualsWithoutPopulation",
        text: "1 individual of panel.nei has no population, and is left out of the distances: i4. If it belongs to one, fill in its population in the metadata file and load it again.",
      },
      {
        code: "negativeDistance",
        text: "A and B have a negative Hudson's Fst, −0.0100: the variants cannot tell the two apart. The heatmap shows the value.",
      },
    ]);
    expect(popDists.checkNumbers(r)).toStrictEqual([1200, -0.01, 0.02]);
    expect(popDists.numCheckNumbers(p)).toBe(3);
  });
});

describe("PA3 D4 needs", () => {
  test("gives the reason of individualsNeeds first: an individual of panel.nei not in panel_pops.csv", () => {
    const p = project({ individuals: [...PANEL_INDIVIDUALS, "s200"] });
    const reason = individualsNeeds(p);
    expect(reason).not.toBeNull();
    expect(popDists.needs(p)).toBe(reason);
  });

  test("gives the reason of the column of the populations: none chosen", () => {
    expect(popDists.needs(project({ column: null }))).toBe(
      "Choose the column that defines the populations, or all individuals in one population, in the Individuals step.",
    );
  });

  test("gives the reason of the lists of individuals leaving no individual with a population", () => {
    const p = project({
      table: EXAMPLE_TABLE,
      tableName: "pops.csv",
      column: "pop",
      individuals: ["i1", "i2", "i3", "i4"],
      individualFilters: [{ kind: "keep", individuals: ["i4"] }],
    });
    expect(popDists.needs(p)).toBe(
      "The lists of individuals to keep and to remove leave none of the individuals of panel.nei that have a population in pop, so no population is left. Change the lists in the Variants step.",
    );
  });

  test("without a metadata file, every individual in one population, needs two populations", () => {
    expect(popDists.needs(project({ table: null }))).toBe(
      "The distances between populations need two populations or more, and without a metadata file every individual is in one. Load a metadata file, and choose the column that defines the populations, in the Individuals step.",
    );
  });

  test("with the grouping onePopulation, needs two populations", () => {
    expect(popDists.needs(project({ onePopulation: true }))).toBe(
      "The distances between populations need two populations or more, and all individuals are in one population. Choose the column that defines the populations in the Individuals step.",
    );
  });

  test("a column that gives the individuals of panel.nei one population names it", () => {
    const p = project({
      table: tableOfSizes([30]),
      tableName: "pops.csv",
      column: "pop",
    });
    expect(popDists.needs(p)).toBe(
      "The column pop of pops.csv gives the individuals of panel.nei one population, p0, and the distances need two or more. Choose another column, or fill in this one and load the file again, in the Individuals step.",
    );
  });

  test("at a minimum of 70, only p2 of 84 has it; at 100, none", () => {
    expect(popDists.needs(project({ min: 70 }))).toBe(
      "Only p2 has 70 individuals or more, and a variant counts for a pair of populations only where both have 70 individuals with a called genotype, so no pair has a distance. Lower the number of individuals needed, above, or merge populations in the metadata file.",
    );
    expect(popDists.needs(project({ min: 100 }))).toBe(
      "No population has 100 individuals or more, and a variant counts for a pair of populations only where both have 100 individuals with a called genotype, so no pair has a distance. Lower the number of individuals needed, above, or merge populations in the metadata file.",
    );
  });

  test("with the lists taking p2 and p1 below the minimum, the reason names the lists", () => {
    const keep = [
      ...membersOf(PANEL_POPS, "p0"),
      ...membersOf(PANEL_POPS, "p2").slice(0, 10),
    ];
    const p = project({
      individualFilters: [{ kind: "keep", individuals: keep }],
    });
    expect(popDists.needs(p)).toBe(
      "Only p0 has 20 individuals or more, and a variant counts for a pair of populations only where both have 20 individuals with a called genotype, so no pair has a distance. Lower the number of individuals needed, above, merge populations in the metadata file, or change the lists of individuals in the Variants step.",
    );
  });

  test("the flow's project, and a minimum of 48 that p0 reaches, give null", () => {
    expect(popDists.needs(project())).toBeNull();
    expect(popDists.needs(project({ min: 48 }))).toBeNull();
  });
});

describe("PA3 D4 keptNeeds", () => {
  test("a list that leaves one population with the minimum locks, with the words of the filters", () => {
    const p = project();
    const list = [
      ...membersOf(PANEL_POPS, "p0").slice(0, 5),
      ...membersOf(PANEL_POPS, "p2"),
    ];
    expect(keptNeeds(p, keptWith(p, list))).toBe(
      "Only p2 has 20 individuals or more among the individuals the filters keep, and a variant counts for a pair of populations only where both have 20 individuals with a called genotype, so no pair has a distance. Lower the number of individuals needed, above, merge populations in the metadata file, or loosen the filters of individuals in the Variants step.",
    );
  });

  test("a list that leaves no population gives populationsKeptNeeds, the diversity's reason", () => {
    const p = project({
      table: EXAMPLE_TABLE,
      tableName: "pops.csv",
      column: "pop",
      individuals: ["i1", "i2", "i3", "i4"],
    });
    const kept = keptWith(p, ["i4"]);
    const reason = populationsKeptNeeds(p, kept);
    expect(reason).not.toBeNull();
    expect(keptNeeds(p, kept)).toBe(reason);
  });

  test("a list that leaves two populations with the minimum, and a list not known, give null", () => {
    const p = project();
    const list = [
      ...membersOf(PANEL_POPS, "p0"),
      ...membersOf(PANEL_POPS, "p1"),
    ];
    expect(keptNeeds(p, keptWith(p, list))).toBeNull();
    const kept = individualsKept(p, null);
    if (kept === null) {
      throw new Error("the flow's project has individuals kept");
    }
    expect(keptNeeds(p, kept)).toBeNull();
  });
});

describe("PA3 D4 run", () => {
  test("sends the three populations of the flow in the order of the file", () => {
    const { client, jobs } = fakeClient(null);
    popDists.run(project(), client);
    expect(jobs).toStrictEqual([
      {
        analysis: "popDists",
        fileId: VARIANTS_ID,
        filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
        individuals: null,
        pops: [
          ["p0", membersOf(PANEL_POPS, "p0")],
          ["p2", membersOf(PANEL_POPS, "p2")],
          ["p1", membersOf(PANEL_POPS, "p1")],
        ],
        leftOut: [],
        minNumIndividuals: 20,
      },
    ]);
  });

  test("at a minimum of 25 on panel_split.csv, sends p2 and p1 and leaves out p0a and p0b with their 24 individuals", () => {
    const { client, jobs } = fakeClient(null);
    popDists.run(project({ table: PANEL_SPLIT, min: 25 }), client);
    expect(jobs[0]).toMatchObject({
      pops: [
        ["p2", membersOf(PANEL_SPLIT, "p2")],
        ["p1", membersOf(PANEL_SPLIT, "p1")],
      ],
      leftOut: [
        ["p0a", 24],
        ["p0b", 24],
      ],
      minNumIndividuals: 25,
    });
  });

  test("narrows the populations to the individuals kept before it splits them by the minimum", () => {
    const kept = PANEL_INDIVIDUALS.filter(
      (name) => !membersOf(PANEL_POPS, "p0").slice(10).includes(name),
    );
    const { client, jobs } = fakeClient(kept);
    popDists.run(project(), client);
    expect(jobs[0]).toMatchObject({
      individuals: kept,
      pops: [
        ["p2", membersOf(PANEL_POPS, "p2")],
        ["p1", membersOf(PANEL_POPS, "p1")],
      ],
      leftOut: [["p0", 10]],
    });
  });

  test("throws a defect with fewer than two populations with the minimum, which needs locks", () => {
    const { client } = fakeClient(null);
    expect(() => popDists.run(project({ min: 70 }), client)).toThrow(
      /^popnei_web defect: /u,
    );
  });
});

describe("PA3 D4 the warnings", () => {
  test("the result of the flow raises none", () => {
    expect(popDists.warnings(flowResult(), project())).toStrictEqual([]);
  });

  test("tooFewIndividuals of one population left out whole", () => {
    const r = resultOf(["p2", "p1"], [], [["p0", 48]]);
    expect(popDists.warnings(r, project({ min: 50 }))).toStrictEqual([
      {
        code: "tooFewIndividuals",
        text: "Population p0 has 48 individuals, fewer than the minimum of 50, so it is left out of the distances. To include it, lower the minimum of individuals, or merge it with another population in the metadata file.",
      },
    ]);
  });

  test("tooFewIndividuals of one population the filters of individuals took individuals from offers to loosen them", () => {
    const r = resultOf(["p2", "p1"], [], [["p0", 12]]);
    expect(warningsOf(r, project(), "tooFewIndividuals")).toStrictEqual([
      {
        code: "tooFewIndividuals",
        text: "Population p0 has 12 individuals, fewer than the minimum of 20, so it is left out of the distances. To include it, lower the minimum of individuals, merge it with another population in the metadata file, or loosen the filters of individuals in the Variants step.",
      },
    ]);
  });

  test("tooFewIndividuals of two populations gives their counts", () => {
    const p = project({ table: tableOfSizes([30, 30, 30, 12, 30, 8]) });
    const r = resultOf(
      ["p0", "p1", "p2", "p4"],
      [],
      [
        ["p3", 12],
        ["p5", 8],
      ],
    );
    expect(popDists.warnings(r, p)).toStrictEqual([
      {
        code: "tooFewIndividuals",
        text: "Populations p3 and p5 have fewer than 20 individuals, 12 and 8, so they are left out of the distances. To include them, lower the minimum of individuals, or merge each with another population in the metadata file.",
      },
    ]);
  });

  test("tooFewIndividuals of two populations, one of them reduced by the filters of individuals, offers to loosen them", () => {
    const p = project({ table: tableOfSizes([30, 30, 30, 12, 30, 8]) });
    const r = resultOf(
      ["p0", "p1", "p2", "p4"],
      [],
      [
        ["p3", 12],
        ["p5", 6],
      ],
    );
    expect(warningsOf(r, p, "tooFewIndividuals")).toStrictEqual([
      {
        code: "tooFewIndividuals",
        text: "Populations p3 and p5 have fewer than 20 individuals, 12 and 6, so they are left out of the distances. To include them, lower the minimum of individuals, merge each with another population in the metadata file, or loosen the filters of individuals in the Variants step.",
      },
    ]);
  });

  test("a population left out that is not among the populations to run is a defect", () => {
    const r = resultOf(["p0", "p2", "p1"], [], [["p9", 3]]);
    expect(() => popDists.warnings(r, project())).toThrow(
      /^popnei_web defect: the distances left out "p9"/u,
    );
  });

  test("tooFewIndividuals of four populations names two and counts none", () => {
    const p = project({ table: tableOfSizes([30, 30, 30, 12, 30, 8, 5, 3]) });
    const r = resultOf(
      ["p0", "p1", "p2", "p4"],
      [],
      [
        ["p3", 12],
        ["p5", 8],
        ["p6", 5],
        ["p7", 3],
      ],
    );
    expect(warningsOf(r, p, "tooFewIndividuals")).toStrictEqual([
      {
        code: "tooFewIndividuals",
        text: "Populations p3, p5 and 2 more have fewer than 20 individuals, so they are left out of the distances. To include them, lower the minimum of individuals, or merge each with another population in the metadata file.",
      },
    ]);
  });

  test("populationNotInResult names a population the filters emptied, and not one left out for its size", () => {
    const p = project({ table: tableOfSizes([30, 30, 30, 12]) });
    const r = resultOf(["p0", "p1"], [], [["p3", 12]]);
    expect(warningsOf(r, p, "populationNotInResult")).toStrictEqual([
      {
        code: "populationNotInResult",
        text: "Population p2 has no individual among the individuals of panel.nei that the filters kept, so it is not in the distances.",
      },
    ]);
  });

  test("pairWithoutDistance of one pair", () => {
    const r = resultOf(
      ["p0", "p2", "p1"],
      [{ fst: Number.NaN, dest: Number.NaN, numVars: 0 }],
    );
    expect(warningsOf(r, project(), "pairWithoutDistance")).toStrictEqual([
      {
        code: "pairWithoutDistance",
        text: "p0 and p2 have no variant at which both have 20 individuals with a called genotype, so the pair has no distance.",
      },
    ]);
  });

  test("pairWithoutDistance of two pairs", () => {
    const none = { fst: Number.NaN, dest: Number.NaN, numVars: 0 };
    const r = resultOf(["p0", "p2", "p1"], [none, none]);
    expect(warningsOf(r, project(), "pairWithoutDistance")).toStrictEqual([
      {
        code: "pairWithoutDistance",
        text: "The pairs p0 and p2, and p0 and p1, have no variant at which both have 20 individuals with a called genotype, so they have no distance.",
      },
    ]);
  });

  test("the review of PA10: pairWithoutDistance and fstWithoutValue of three pairs, the most named whole, close the list with a comma", () => {
    const none = { fst: Number.NaN, dest: Number.NaN, numVars: 0 };
    const r = resultOf(["p0", "p2", "p1"], [none, none, none]);
    expect(warningsOf(r, project(), "pairWithoutDistance")).toStrictEqual([
      {
        code: "pairWithoutDistance",
        text: "The pairs p0 and p2, p0 and p1, and p2 and p1, have no variant at which both have 20 individuals with a called genotype, so they have no distance.",
      },
    ]);
    const shared = { fst: Number.NaN, numVars: 12 };
    const three = resultOf(["p0", "p2", "p1"], [shared, shared, shared]);
    expect(warningsOf(three, project(), "fstWithoutValue")).toStrictEqual([
      {
        code: "fstWithoutValue",
        text: "The pairs p0 and p2, p0 and p1, and p2 and p1, share one allele at every variant counted for them, so Hudson's Fst has no value for them (0/0).",
      },
    ]);
  });

  test("pairWithoutDistance of four pairs names two", () => {
    const none = { fst: Number.NaN, dest: Number.NaN, numVars: 0 };
    const p = project({ table: tableOfSizes([30, 30, 30, 30]) });
    const r = resultOf(["p0", "p1", "p2", "p3"], [none, none, none, none]);
    expect(warningsOf(r, p, "pairWithoutDistance")).toStrictEqual([
      {
        code: "pairWithoutDistance",
        text: "The pairs p0 and p1, p0 and p2 and 2 more have no variant at which both have 20 individuals with a called genotype, so they have no distance.",
      },
    ]);
  });

  test("pairsOnFewerVariants of one pair over 641 of 1,152 variants", () => {
    const pass: PassStats = { numVars: 1152, filtering: {} };
    const r = resultOf(
      ["p0", "p2", "p1"],
      [{ numVars: 641 }, { numVars: 1152 }, { numVars: 1152 }],
      [],
      pass,
    );
    expect(warningsOf(r, project(), "pairsOnFewerVariants")).toStrictEqual([
      {
        code: "pairsOnFewerVariants",
        text: "The pair p0 and p2 is over 641 of the 1,152 variants kept (56%): at the others, one of the two populations has fewer than 20 individuals with a called genotype.",
      },
    ]);
  });

  test("pairsOnFewerVariants of three of six pairs names the one over the fewest", () => {
    const pass: PassStats = { numVars: 1152, filtering: {} };
    const p = project({ table: tableOfSizes([30, 30, 30, 30]) });
    const r = resultOf(
      ["p0", "p1", "p2", "p3"],
      [
        { numVars: 1152 },
        { numVars: 1000 },
        { numVars: 641 },
        { numVars: 1152 },
        { numVars: 900 },
        { numVars: 1152 },
      ],
      [],
      pass,
    );
    expect(warningsOf(r, p, "pairsOnFewerVariants")).toStrictEqual([
      {
        code: "pairsOnFewerVariants",
        text: "3 of the 6 pairs are over fewer than the 1,152 variants kept, down to 641 (56%) for p0 and p3: at the others, one of the two populations has fewer than 20 individuals with a called genotype.",
      },
    ]);
  });

  test("pairsOnFewerVariants of 1,151 of 1,152 variants writes 99%, never 100%", () => {
    const pass: PassStats = { numVars: 1152, filtering: {} };
    const r = resultOf(["p0", "p2"], [{ numVars: 1151 }], [], pass);
    const [warning] = warningsOf(r, project(), "pairsOnFewerVariants");
    expect(warning?.text).toBe(
      "The pair p0 and p2 is over 1,151 of the 1,152 variants kept (99%): at the others, one of the two populations has fewer than 20 individuals with a called genotype.",
    );
  });

  test("negativeDistance of the pair p0a and p0b of panel_split.csv names both measures", () => {
    const p = project({ table: PANEL_SPLIT });
    const r: PopDistsResult = {
      analysis: "popDists",
      pops: ["p0a", "p0b", "p2", "p1"],
      numIndividuals: Uint32Array.from([24, 24, 84, 68]),
      fst: Float64Array.from([
        -0.011276258310056011, 0.09917164096189776, 0.10284678759499101,
        0.10123140684986402, 0.1020068488376186, 0.10962148955018115,
      ]),
      dest: Float64Array.from([
        -0.00601975597295832, 0.05929552377994644, 0.06246325844418998,
        0.060586547891477244, 0.06181779954501048, 0.06567052128821259,
      ]),
      numVarsPerPair: Uint32Array.from([1200, 1200, 1200, 1200, 1200, 1200]),
      order: { fst: pcoa([1, 0, 2, 3]), dest: pcoa([1, 0, 2, 3]) },
      leftOut: [],
      passStats: FLOW_PASS,
    };
    expect(popDists.warnings(r, p)).toStrictEqual([
      {
        code: "negativeDistance",
        text: "p0a and p0b have a negative Hudson's Fst, −0.0113, and Jost's D, −0.0060: the variants cannot tell the two apart. The heatmap orders them as if the distance were 0, and shows the value.",
      },
    ]);
  });

  test("negativeDistance of two pairs names them, and of four names two", () => {
    const two = resultOf(
      ["p0", "p2", "p1"],
      [{ fst: -0.01 }, { dest: -0.002 }],
      [],
      FLOW_PASS,
      { fst: pcoa([0, 1, 2]), dest: pcoa([0, 1, 2]) },
    );
    expect(warningsOf(two, project(), "negativeDistance")).toStrictEqual([
      {
        code: "negativeDistance",
        text: "2 pairs have a negative Hudson's Fst or Jost's D, p0 and p2, and p0 and p1: the variants cannot tell their two populations apart. The heatmap orders them as if the distance were 0, and shows the values.",
      },
    ]);
    const p = project({ table: tableOfSizes([30, 30, 30, 30]) });
    const negative = { fst: -0.01 };
    const four = resultOf(
      ["p0", "p1", "p2", "p3"],
      [negative, negative, negative, negative],
      [],
      FLOW_PASS,
      { fst: pcoa([0, 1, 2, 3]), dest: pcoa([0, 1, 2, 3]) },
    );
    expect(warningsOf(four, p, "negativeDistance")).toStrictEqual([
      {
        code: "negativeDistance",
        text: "4 pairs have a negative Hudson's Fst, p0 and p1, p0 and p2 and 2 more: the variants cannot tell their two populations apart. The heatmap orders them as if the distance were 0, and shows the values.",
      },
    ]);
  });

  test("jostHaploid for a load of ploidy 1, whatever the values of D", () => {
    expect(
      popDists.warnings(flowResult(), project({ ploidy: 1 })),
    ).toStrictEqual([
      {
        code: "jostHaploid",
        text: "Jost's D has no value for panel.nei, whose genotypes have one allele each: it compares two heterozygosities, and a haploid individual has none. Hudson's Fst has its values.",
      },
    ]);
  });

  test("the warnings come in the order of the spec's table", () => {
    const p = project({
      table: {
        columns: ["IID", "pop"],
        rows: [...tableOfSizes([30, 30, 30, 12]).rows, ["s102", null]],
      },
      ploidy: 1,
    });
    const pass: PassStats = { numVars: 1152, filtering: {} };
    const r = resultOf(
      ["p0", "p1"],
      [{ fst: -0.01, dest: Number.NaN, numVars: 641 }],
      [["p3", 12]],
      pass,
    );
    const withNone = resultOf(
      ["p0", "p1"],
      [{ fst: Number.NaN, dest: Number.NaN, numVars: 0 }],
      [["p3", 12]],
      pass,
    );
    expect(popDists.warnings(r, p).map((w) => w.code)).toStrictEqual([
      "tooFewIndividuals",
      "individualsWithoutPopulation",
      "populationNotInResult",
      "pairsOnFewerVariants",
      "negativeDistance",
      "jostHaploid",
    ]);
    expect(popDists.warnings(withNone, p).map((w) => w.code)).toStrictEqual([
      "tooFewIndividuals",
      "individualsWithoutPopulation",
      "populationNotInResult",
      "pairWithoutDistance",
      "jostHaploid",
    ]);
    const three = project({
      table: {
        columns: ["IID", "pop"],
        rows: [...tableOfSizes([30, 30, 30, 12]).rows, ["s102", null]],
      },
      ploidy: 1,
    });
    const every = resultOf(
      ["p0", "p1", "p2"],
      [
        { fst: Number.NaN, dest: Number.NaN, numVars: 0 },
        { fst: Number.NaN, dest: Number.NaN, numVars: 12 },
        { fst: -0.01, dest: Number.NaN, numVars: 641 },
      ],
      [["p3", 12]],
      pass,
    );
    expect(popDists.warnings(every, three).map((w) => w.code)).toStrictEqual([
      "tooFewIndividuals",
      "individualsWithoutPopulation",
      "pairWithoutDistance",
      "fstWithoutValue",
      "pairsOnFewerVariants",
      "negativeDistance",
      "jostHaploid",
    ]);
  });
});

describe("PA3 D4 checkNumbers and numCheckNumbers", () => {
  test("checkNumbers of the flow's result gives the variants kept, then the Fst and the D of each pair", () => {
    expect(popDists.checkNumbers(flowResult())).toStrictEqual([
      1200, 0.10273588423661377, 0.06129813142463423, 0.10496244498389443,
      0.06354346296076403, 0.10962148955018115, 0.06567052128821259,
    ]);
  });

  test("checkNumbers gives null for a NaN", () => {
    const r = resultOf(["p0", "p1"], [{ fst: 0.1, dest: Number.NaN }]);
    expect(popDists.checkNumbers(r)).toStrictEqual([1200, 0.1, null]);
  });

  test("numCheckNumbers is 7 for the flow's project, 1 + 3 × 2", () => {
    expect(popDists.numCheckNumbers(project())).toBe(7);
  });

  test("numCheckNumbers is null with a threshold on the individuals", () => {
    const p = project({
      individualFilters: [{ kind: "missing_data", maxAllowedMissingRate: 0.5 }],
    });
    expect(popDists.numCheckNumbers(p)).toBeNull();
  });

  test("numCheckNumbers is null with no column of the populations", () => {
    expect(popDists.numCheckNumbers(project({ column: null }))).toBeNull();
  });

  test("numCheckNumbers is null with the variants file pending", () => {
    expect(popDists.numCheckNumbers(project({ pending: true }))).toBeNull();
  });

  test("numCheckNumbers is null with one population, and with one that has the minimum", () => {
    expect(popDists.numCheckNumbers(project({ table: null }))).toBeNull();
    expect(popDists.numCheckNumbers(project({ min: 70 }))).toBeNull();
  });
});

describe("PA3 D4 parseOptions", () => {
  const parsed = (options: unknown): unknown =>
    popDists.parseOptions(options, 1);
  const refused = { ok: false, error: OPTIONS_EXPECTED };

  test("gives the defaults back, an object of exactly the two fields", () => {
    expect(parsed({ minNumIndividuals: 20, measure: "fst" })).toStrictEqual({
      ok: true,
      value: { minNumIndividuals: 20, measure: "fst" },
    });
  });

  test("takes a minimum of 0 and of 4,294,967,295, and the measure dest", () => {
    for (const minNumIndividuals of [0, 4_294_967_295]) {
      expect(parsed({ minNumIndividuals, measure: "dest" })).toStrictEqual({
        ok: true,
        value: { minNumIndividuals, measure: "dest" },
      });
    }
  });

  test("refuses a minimum of −1", () => {
    expect(parsed({ minNumIndividuals: -1, measure: "fst" })).toStrictEqual(
      refused,
    );
  });

  test("refuses a minimum of 2.5", () => {
    expect(parsed({ minNumIndividuals: 2.5, measure: "fst" })).toStrictEqual(
      refused,
    );
  });

  test("refuses a minimum of 4,294,967,296", () => {
    expect(
      parsed({ minNumIndividuals: 4_294_967_296, measure: "fst" }),
    ).toStrictEqual(refused);
  });

  test("refuses the measure gst", () => {
    expect(parsed({ minNumIndividuals: 20, measure: "gst" })).toStrictEqual(
      refused,
    );
  });

  test("refuses a field missing and a field more", () => {
    expect(parsed({ minNumIndividuals: 20 })).toStrictEqual(refused);
    expect(parsed({ measure: "fst" })).toStrictEqual(refused);
    expect(
      parsed({ minNumIndividuals: 20, measure: "fst", jackknife: null }),
    ).toStrictEqual(refused);
  });

  test("refuses what is not an object of options: null, an array, a number, a minimum as text", () => {
    for (const options of [
      null,
      [],
      20,
      { minNumIndividuals: "20", measure: "fst" },
    ]) {
      expect(parsed(options)).toStrictEqual(refused);
    }
  });
});

describe("PA3 D4 refusalText", () => {
  test("of popnei's message of an empty pass", () => {
    expect(
      refusalText(
        "the pass gave no variant: its source gave 1200 and the steps kept none of them, the `missing_data` filter was given 1200 and kept 0; a statistic of a pass is calculated over the variants it gives",
        project(),
      ),
    ).toBe(
      "The filters kept none of the variants of panel.nei, so there is no variant to calculate the distances between populations over. Loosen the filters in the Variants step.",
    );
  });

  test("of popnei's message of one population", () => {
    expect(
      refusalText(
        "the distances between populations are calculated for each pair of populations, and `pops` names 1: name two populations at least",
        project(),
      ),
    ).toBe(
      "popnei could not calculate the distances between populations: the distances between populations are calculated for each pair of populations, and pops names 1: name two populations at least. Change the settings, or load the variants file again, to run it again.",
    );
  });
});

describe("PA3 D4 script", () => {
  test("of the flow's project gives the lines of the spec", () => {
    expect(popDists.script(project())).toBe(
      [
        '# The distances between populations, from the column "popcat"',
        "pops = {}",
        'for individual, pop in zip(individuals.iloc[:, 0], individuals["popcat"]):',
        "    if not pandas.isna(pop):",
        "        pops.setdefault(pop, []).append(individual)",
        "kept = set(variants.individuals)",
        "pops = {pop: [i for i in names if i in kept] for pop, names in pops.items()}",
        "pops = {pop: names for pop, names in pops.items() if len(names) >= 20}",
        "dists = popnei.calc_pop_dists(",
        '    variants, pops, jackknife_group=None, measures=["fst", "dest"],',
        "    min_num_individuals=20,",
        ")",
        "pairs = [(a, b) for i, a in enumerate(dists.pops) for b in dists.pops[i + 1:]]",
        "print(pandas.DataFrame({",
        '    "population_1": [a for a, b in pairs],',
        '    "population_2": [b for a, b in pairs],',
        '    "fst_hudson": dists.fst.dist_vector,',
        '    "jost_d": dists.dest.dist_vector,',
        '    "num_variants": dists.num_vars,',
        "}).to_string(index=False))",
        "# The order of the heatmap of each measure. It is the order of the metadata",
        "# file for two populations, with a pair of no distance, when no distance is",
        "# above 0, and when popnei cannot place the populations; otherwise the first",
        "# axis of the principal coordinates of the distances, a negative one taken as",
        "# 0 and Lingoes' correction applied.",
        'for name, measure in [("fst_hudson", dists.fst), ("jost_d", dists.dest)]:',
        "    values = measure.dist_vector.clip(min=0)",
        "    order = list(dists.pops)",
        "    if len(order) > 2 and not pandas.isna(values).any() and values.any():",
        "        try:",
        "            corrected = popnei.correct_dists_by_lingoes(",
        "                popnei.Distances(dist_vector=values, names=measure.names)",
        "            )",
        "            first = popnei.do_pcoa(corrected.dists).projections.iloc[:, 0]",
        '            order = first.sort_values(kind="stable").index.tolist()',
        "        except ValueError:",
        "            pass",
        "    print(name, order)",
        "",
      ].join("\n"),
    );
  });

  test("PA10 at a minimum of 0 keeps a population only when it holds an individual, and gives popnei the 0", () => {
    const lines = popDists.script(project({ min: 0 })).split("\n");
    expect(lines).toContain(
      "pops = {pop: names for pop, names in pops.items() if len(names) >= 1}",
    );
    expect(lines).toContain("    min_num_individuals=0,");
    const atOne = popDists.script(project({ min: 1 })).split("\n");
    expect(atOne).toContain(
      "pops = {pop: names for pop, names in pops.items() if len(names) >= 1}",
    );
    expect(atOne).toContain("    min_num_individuals=1,");
  });
});

/** The orders of both measures along the PCoA, in the order of the
    result. */
function bothPcoa(numPops: number): PopDistsResult["order"] {
  const order = Array.from({ length: numPops }, (_, i) => i);
  return { fst: pcoa(order), dest: pcoa(order) };
}

describe("PA10 the owner's decisions of 1 October 2026 on the locks of the distances", () => {
  test("the lists of individuals leaving one population lock with words of their own, at any minimum", () => {
    for (const min of [0, 1, 2, 20]) {
      const p = project({
        table: EXAMPLE_TABLE,
        tableName: "pops.csv",
        column: "pop",
        individuals: ["i1", "i2", "i3", "i4"],
        individualFilters: [{ kind: "remove", individuals: ["i2"] }],
        min,
      });
      expect(popDists.needs(p)).toBe(
        "The lists of individuals leave one population, A, and the distances need two or more. Change the lists in the Variants step.",
      );
    }
  });

  test("the lists leaving p0 alone of panel.nei name it, and not the minimum", () => {
    const p = project({
      individualFilters: [
        { kind: "keep", individuals: membersOf(PANEL_POPS, "p0") },
      ],
    });
    expect(popDists.needs(p)).toBe(
      "The lists of individuals leave one population, p0, and the distances need two or more. Change the lists in the Variants step.",
    );
  });

  test("the individuals kept leaving one population lock with the words of the filters, at any minimum", () => {
    for (const min of [0, 1, 20, 100]) {
      const p = project({ min });
      const kept = keptWith(p, membersOf(PANEL_POPS, "p2"));
      expect(keptNeeds(p, kept)).toBe(
        "The filters of individuals leave one population, p2, and the distances need two or more. Loosen the filters of individuals in the Variants step.",
      );
    }
  });
});

describe("PA10 the owner's decisions of 1 October 2026 on the warnings of the distances", () => {
  const none = { fst: Number.NaN, dest: Number.NaN, numVars: 0 };
  const fewer: PassStats = { numVars: 1152, filtering: {} };

  test("pairWithoutDistance at a minimum of 0 or 1 counts no individuals", () => {
    for (const min of [0, 1]) {
      const p = project({ min });
      const one = resultOf(["p0", "p2", "p1"], [none]);
      expect(warningsOf(one, p, "pairWithoutDistance")).toStrictEqual([
        {
          code: "pairWithoutDistance",
          text: "p0 and p2 have no variant at which both have a called genotype, so the pair has no distance.",
        },
      ]);
      const two = resultOf(["p0", "p2", "p1"], [none, none]);
      expect(warningsOf(two, p, "pairWithoutDistance")).toStrictEqual([
        {
          code: "pairWithoutDistance",
          text: "The pairs p0 and p2, and p0 and p1, have no variant at which both have a called genotype, so they have no distance.",
        },
      ]);
    }
  });

  test("pairWithoutDistance at a minimum of 2 counts them", () => {
    const one = resultOf(["p0", "p2", "p1"], [none]);
    const [warning] = warningsOf(
      one,
      project({ min: 2 }),
      "pairWithoutDistance",
    );
    expect(warning?.text).toBe(
      "p0 and p2 have no variant at which both have 2 individuals with a called genotype, so the pair has no distance.",
    );
  });

  test("pairsOnFewerVariants at a minimum of 0 or 1 says a population has no called genotype", () => {
    for (const min of [0, 1]) {
      const r = resultOf(
        ["p0", "p2", "p1"],
        [{ numVars: 641 }, { numVars: 1152 }, { numVars: 1152 }],
        [],
        fewer,
      );
      const [warning] = warningsOf(r, project({ min }), "pairsOnFewerVariants");
      expect(warning?.text).toBe(
        "The pair p0 and p2 is over 641 of the 1,152 variants kept (56%): at the others, one of the two populations has no called genotype.",
      );
    }
  });

  test("pairsOnFewerVariants of every pair of three says All, with no clause of the others", () => {
    const r = resultOf(
      ["p0", "p2", "p1"],
      [{ numVars: 1000 }, { numVars: 641 }, { numVars: 900 }],
      [],
      fewer,
    );
    expect(warningsOf(r, project(), "pairsOnFewerVariants")).toStrictEqual([
      {
        code: "pairsOnFewerVariants",
        text: "All 3 pairs are over fewer than the 1,152 variants kept, down to 641 (56%) for p0 and p1.",
      },
    ]);
  });

  test("pairsOnFewerVariants of two of three pairs keeps the clause of the others", () => {
    const r = resultOf(
      ["p0", "p2", "p1"],
      [{ numVars: 1000 }, { numVars: 641 }, { numVars: 1152 }],
      [],
      fewer,
    );
    const [warning] = warningsOf(r, project(), "pairsOnFewerVariants");
    expect(warning?.text).toBe(
      "2 of the 3 pairs are over fewer than the 1,152 variants kept, down to 641 (56%) for p0 and p1: at the others, one of the two populations has fewer than 20 individuals with a called genotype.",
    );
  });

  test("pairsOnFewerVariants of the one pair of two populations keeps the words of one pair", () => {
    const r = resultOf(["p0", "p2"], [{ numVars: 641 }], [], fewer);
    const [warning] = warningsOf(r, project(), "pairsOnFewerVariants");
    expect(warning?.text).toBe(
      "The pair p0 and p2 is over 641 of the 1,152 variants kept (56%): at the others, one of the two populations has fewer than 20 individuals with a called genotype.",
    );
  });

  test("fstWithoutValue of one pair with variants and no Fst", () => {
    const r = resultOf(
      ["p0", "p2", "p1"],
      [{ numVars: 1200 }, { fst: Number.NaN, numVars: 12 }],
    );
    expect(warningsOf(r, project(), "fstWithoutValue")).toStrictEqual([
      {
        code: "fstWithoutValue",
        text: "p0 and p1 share one allele at every variant counted for them, so Hudson's Fst has no value (0/0).",
      },
    ]);
  });

  test("fstWithoutValue of two pairs, and of four, which names two", () => {
    const shared = { fst: Number.NaN, numVars: 12 };
    const two = resultOf(["p0", "p2", "p1"], [shared, shared]);
    expect(warningsOf(two, project(), "fstWithoutValue")).toStrictEqual([
      {
        code: "fstWithoutValue",
        text: "The pairs p0 and p2, and p0 and p1, share one allele at every variant counted for them, so Hudson's Fst has no value for them (0/0).",
      },
    ]);
    const p = project({ table: tableOfSizes([30, 30, 30, 30]) });
    const four = resultOf(
      ["p0", "p1", "p2", "p3"],
      [shared, shared, shared, shared],
    );
    expect(warningsOf(four, p, "fstWithoutValue")).toStrictEqual([
      {
        code: "fstWithoutValue",
        text: "The pairs p0 and p1, p0 and p2 and 2 more share one allele at every variant counted for them, so Hudson's Fst has no value for them (0/0).",
      },
    ]);
  });

  test("fstWithoutValue is not raised for a pair with no variant, nor for a Jost's D with no value", () => {
    const r = resultOf(
      ["p0", "p2", "p1"],
      [none, { dest: Number.NaN, numVars: 12 }],
    );
    expect(warningsOf(r, project(), "fstWithoutValue")).toStrictEqual([]);
  });

  test("negativeDistance says the heatmap shows the value when it keeps the order of the file, for each reason", () => {
    const reasons: readonly HeatmapOrder[] = [
      { kind: "file", reason: "noDistance" },
      { kind: "file", reason: "allZero" },
      { kind: "file", reason: "notPlaced", message: "popnei: no" },
    ];
    for (const order of reasons) {
      const r = resultOf(["p0", "p2", "p1"], [{ fst: -0.01 }], [], FLOW_PASS, {
        fst: order,
        dest: order,
      });
      const [warning] = warningsOf(r, project(), "negativeDistance");
      expect(warning?.text).toBe(
        "p0 and p2 have a negative Hudson's Fst, −0.0100: the variants cannot tell the two apart. The heatmap shows the value.",
      );
    }
    const two = resultOf(["p0", "p2"], [{ fst: -0.01, dest: -0.002 }]);
    const [ofTwo] = warningsOf(two, project(), "negativeDistance");
    expect(ofTwo?.text).toBe(
      "p0 and p2 have a negative Hudson's Fst, −0.0100, and Jost's D, −0.0020: the variants cannot tell the two apart. The heatmap shows the value.",
    );
  });

  test("negativeDistance of several pairs in the order of the file says the heatmap shows the values", () => {
    const r = resultOf(
      ["p0", "p2", "p1"],
      [{ fst: -0.01 }, { fst: -0.002 }],
      [],
      FLOW_PASS,
      {
        fst: { kind: "file", reason: "allZero" },
        dest: { kind: "file", reason: "allZero" },
      },
    );
    const [warning] = warningsOf(r, project(), "negativeDistance");
    expect(warning?.text).toBe(
      "2 pairs have a negative Hudson's Fst, p0 and p2, and p0 and p1: the variants cannot tell their two populations apart. The heatmap shows the values.",
    );
  });

  test("negativeDistance reads the order of the measures it names: a negative Fst in the order of the file beside a D ordered by similarity shows the value", () => {
    const r = resultOf(["p0", "p2", "p1"], [{ fst: -0.01 }], [], FLOW_PASS, {
      fst: { kind: "file", reason: "noDistance" },
      dest: pcoa([0, 1, 2]),
    });
    const [warning] = warningsOf(r, project(), "negativeDistance");
    expect(warning?.text).toBe(
      "p0 and p2 have a negative Hudson's Fst, −0.0100: the variants cannot tell the two apart. The heatmap shows the value.",
    );
    const ordered = resultOf(
      ["p0", "p2", "p1"],
      [{ fst: -0.01 }],
      [],
      FLOW_PASS,
      { fst: pcoa([0, 1, 2]), dest: { kind: "file", reason: "noDistance" } },
    );
    const [ofOrdered] = warningsOf(ordered, project(), "negativeDistance");
    expect(ofOrdered?.text).toBe(
      "p0 and p2 have a negative Hudson's Fst, −0.0100: the variants cannot tell the two apart. The heatmap orders them as if the distance were 0, and shows the value.",
    );
  });

  test("the review of PA10: the mirror case, a negative Jost's D alone in the order of the file beside an Fst ordered by similarity, shows the value", () => {
    const r = resultOf(["p0", "p2", "p1"], [{ dest: -0.002 }], [], FLOW_PASS, {
      fst: pcoa([0, 1, 2]),
      dest: { kind: "file", reason: "noDistance" },
    });
    const [warning] = warningsOf(r, project(), "negativeDistance");
    expect(warning?.text).toBe(
      "p0 and p2 have a negative Jost's D, −0.0020: the variants cannot tell the two apart. The heatmap shows the value.",
    );
  });

  test("negativeDistance of 201 populations, whose heatmap is not drawn, says nothing of the heatmap; of 200 it does", () => {
    for (const [numPops, end] of [
      [201, ""],
      [
        200,
        " The heatmap orders them as if the distance were 0, and shows the value.",
      ],
    ] as const) {
      const pops = Array.from({ length: numPops }, (_, i) => `q${String(i)}`);
      const r = resultOf(
        pops,
        [{ fst: -0.01 }],
        [],
        FLOW_PASS,
        bothPcoa(numPops),
      );
      const [warning] = warningsOf(r, project(), "negativeDistance");
      expect(warning?.text).toBe(
        `q0 and q1 have a negative Hudson's Fst, −0.0100: the variants cannot tell the two apart.${end}`,
      );
    }
  });
});

/** The key of the distances for `p`, with popnei 0.1.0 unless another
    version is given. */
function keyOfDists(
  p: Project,
  popneiVersion = "0.1.0",
  def: KeyedDef = popDists,
): Key {
  return keyOf(def, p, popneiVersion, createKeyMemo());
}

/** `p` with its parts `parts` replaced, frozen deeply. */
function changed(p: Project, parts: Partial<Project>): Project {
  return deepFreeze<Project>({ ...p, ...parts });
}

/** The variants file of `p`, which the projects of these tests have. */
function variantsOf(p: Project): NonNullable<Project["variants"]> {
  if (p.variants === null) {
    throw new Error("the project has a variants file");
  }
  return p.variants;
}

/** The individuals file of `p`, which the projects of these tests
    have. */
function individualsOf(p: Project): NonNullable<Project["individuals"]> {
  if (p.individuals === null) {
    throw new Error("the project has an individuals file");
  }
  return p.individuals;
}

/** `panel_pops.csv` with a third column, `other`, and its column of the
    populations copied into a fourth, `popcopy`. */
const WIDE_TABLE: IndividualsTable = {
  columns: ["IID", "popcat", "other", "popcopy"],
  rows: PANEL_POPS.rows.map((row) => [
    row[0] ?? null,
    row[1] ?? null,
    "x",
    row[1] ?? null,
  ]),
};

describe("PA3 D5 the key of the distances", () => {
  const base = project();
  const baseKey = keyOfDists(base);

  test("a new load of the variants file, the same file included, changes it", () => {
    const variants = variantsOf(base);
    expect(
      keyOfDists(
        changed(base, { variants: { ...variants, fileId: "1".repeat(32) } }),
      ),
    ).not.toBe(baseKey);
  });

  test("the ploidy or onlyPassed of a VCF changes it", () => {
    const neiFile = variantsOf(base);
    const vcf = changed(base, {
      variants: {
        ...neiFile,
        format: "vcf",
        readOptions: { ploidy: 2, onlyPassed: true },
        // The variants of a VCF always record their FILTER.
        read:
          neiFile.read.kind === "read"
            ? { ...neiFile.read, keepsPassed: true }
            : neiFile.read,
      },
    });
    const vcfKey = keyOfDists(vcf);
    for (const readOptions of [
      { ploidy: 4, onlyPassed: true },
      { ploidy: 2, onlyPassed: false },
    ]) {
      expect(
        keyOfDists(
          changed(vcf, { variants: { ...variantsOf(vcf), readOptions } }),
        ),
      ).not.toBe(vcfKey);
    }
  });

  test("the name of the variants file, or its read recorded, keeps it", () => {
    const variants = variantsOf(base);
    expect(
      keyOfDists(
        changed(base, { variants: { ...variants, name: "other.nei" } }),
      ),
    ).toBe(baseKey);
    expect(
      keyOfDists(
        changed(base, { variants: { ...variants, read: { kind: "pending" } } }),
      ),
    ).toBe(baseKey);
  });

  test("a filter of the variants added or removed, or its threshold, changes it", () => {
    const keys = [
      changed(base, { filters: [] }),
      changed(base, {
        filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.05 }],
      }),
      changed(base, {
        filters: [
          { kind: "missing_data", maxAllowedMissingRate: 0.1 },
          { kind: "maf", maxAllowedMaf: 0.9 },
        ],
      }),
    ].map((p) => keyOfDists(p));
    expect(new Set([baseKey, ...keys]).size).toBe(4);
  });

  test("a filter of individuals, a list, a name of it or a threshold, changes it", () => {
    const lists: readonly (readonly IndividualFilter[])[] = [
      [{ kind: "keep", individuals: ["s000", "s001"] }],
      [{ kind: "keep", individuals: ["s000", "s002"] }],
      [{ kind: "remove", individuals: ["s000"] }],
      [{ kind: "missing_data", maxAllowedMissingRate: 0.5 }],
      [{ kind: "missing_data", maxAllowedMissingRate: 0.6 }],
    ];
    const keys = lists.map((individualFilters) =>
      keyOfDists(project({ individualFilters })),
    );
    expect(new Set([baseKey, ...keys]).size).toBe(lists.length + 1);
  });

  test("another column of the populations that groups the individuals otherwise changes it", () => {
    expect(keyOfDists(project({ table: PANEL_SPLIT }))).not.toBe(baseKey);
  });

  test("another column that makes the same populations with the same names keeps it", () => {
    const wide = keyOfDists(project({ table: WIDE_TABLE }));
    expect(keyOfDists(project({ table: WIDE_TABLE, column: "popcopy" }))).toBe(
      wide,
    );
    expect(wide).toBe(baseKey);
  });

  test("the metadata file removed with a column chosen, or the grouping onePopulation, changes it, to all", () => {
    expect(keyOfDists(project({ table: null }))).not.toBe(baseKey);
    expect(keyOfDists(project({ onePopulation: true }))).not.toBe(baseKey);
    expect(popDists.keyInputs(project({ table: null }))).toMatchObject({
      pops: "all",
    });
  });

  test("the metadata file removed with onePopulation, or loaded with onePopulation, keeps it: all with the file and without it", () => {
    const withFile = project({ onePopulation: true });
    const withoutFile = changed(withFile, { individuals: null });
    expect(keyOfDists(withoutFile)).toBe(keyOfDists(withFile));
  });

  test("a cell of the column of the populations changes it, one of an individual not in the variants file included", () => {
    const moved: IndividualsTable = {
      ...PANEL_POPS,
      rows: PANEL_POPS.rows.map((row, i) =>
        i === 0 ? [row[0] ?? null, "p1"] : row,
      ),
    };
    expect(keyOfDists(project({ table: moved }))).not.toBe(baseKey);
    const outside = (pop: string): IndividualsTable => ({
      ...PANEL_POPS,
      rows: [...PANEL_POPS.rows, ["s999", pop]],
    });
    const inVariants = { individuals: PANEL_INDIVIDUALS };
    expect(
      keyOfDists(project({ table: outside("p1"), ...inVariants })),
    ).not.toBe(keyOfDists(project({ table: outside("p2"), ...inVariants })));
  });

  test("a cell of another column keeps it", () => {
    const other: IndividualsTable = {
      ...WIDE_TABLE,
      rows: WIDE_TABLE.rows.map((row, i) =>
        i === 0 ? [row[0] ?? null, row[1] ?? null, "y", row[3] ?? null] : row,
      ),
    };
    expect(keyOfDists(project({ table: other }))).toBe(
      keyOfDists(project({ table: WIDE_TABLE })),
    );
  });

  test("the rows of the file in another order change it", () => {
    const reversed = { ...PANEL_POPS, rows: PANEL_POPS.rows.toReversed() };
    expect(
      keyOfDists(project({ table: reversed, individuals: PANEL_INDIVIDUALS })),
    ).not.toBe(baseKey);
  });

  test("the type of a column keeps it", () => {
    const wide = project({ table: WIDE_TABLE });
    const individuals = individualsOf(wide);
    if (individuals.read.kind !== "read") {
      throw new Error("the flow's individuals file is read");
    }
    const typed = changed(wide, {
      individuals: {
        ...individuals,
        typesSet: [["other", { kind: "continuous" }]],
        read: {
          ...individuals.read,
          columns: individuals.read.columns.map((column, i) =>
            i === 2 ? { kind: "continuous" } : column,
          ),
        },
      },
    });
    expect(keyOfDists(typed)).toBe(keyOfDists(wide));
  });

  test("the same table from another file, or with other options of the CSV, keeps it", () => {
    const individuals = individualsOf(base);
    const otherFile = changed(base, {
      individuals: {
        ...individuals,
        fileId: "2".repeat(32),
        name: "other.csv",
      },
    });
    const otherCsv = changed(base, {
      individuals: {
        ...individuals,
        csv: { encoding: "utf-8", separator: ",", decimal: "." },
      },
    });
    expect(keyOfDists(otherFile)).toBe(baseKey);
    expect(keyOfDists(otherCsv)).toBe(baseKey);
  });

  test("the minimum of individuals changes it", () => {
    expect(keyOfDists(project({ min: 10 }))).not.toBe(baseKey);
    expect(keyOfDists(project({ min: 20 }))).toBe(baseKey);
  });

  test("the measure the heatmap draws keeps it, so that a change of it calculates nothing", () => {
    expect(keyOfDists(project({ measure: "dest" }))).toBe(baseKey);
    expect(keyOfDists(project({ min: 10, measure: "dest" }))).toBe(
      keyOfDists(project({ min: 10 })),
    );
  });

  test("the options of another analysis and the reference keep it", () => {
    const otherOptions = changed(base, {
      analyses: [
        {
          analysis: "diversity",
          options: { minNumIndividuals: 10, polyThreshold: 0.95 },
        },
      ],
    });
    const referenced = changed(base, {
      reference: { variants: variantsOf(base), checks: [] },
    });
    expect(keyOfDists(otherOptions)).toBe(baseKey);
    expect(keyOfDists(referenced)).toBe(baseKey);
  });

  test("the key version, 1, or the version of popnei, changes it", () => {
    expect(popDists.keyVersion).toBe(1);
    const other: KeyedDef = { ...popDists, keyVersion: 2 };
    expect(keyOfDists(base, "0.1.0", other)).not.toBe(baseKey);
    expect(keyOfDists(base, "0.2.0")).not.toBe(baseKey);
  });

  test("keyInputs gives the populations and the minimum, and not the measure, without reading p.variants", () => {
    const p = changed(project({ measure: "dest" }), { variants: null });
    expect(popDists.keyInputs(p)).toStrictEqual({
      pops: [
        ["p0", membersOf(PANEL_POPS, "p0")],
        ["p2", membersOf(PANEL_POPS, "p2")],
        ["p1", membersOf(PANEL_POPS, "p1")],
      ],
      options: { minNumIndividuals: 20 },
    });
  });
});

describe("PA6 the small rules of the populations, shared from project.ts and individualsKept.ts", () => {
  test("tooFewIndividuals of exactly three populations gives their counts, as MAX_NAMED of namesOf allows", () => {
    const p = project({ table: tableOfSizes([30, 30, 30, 12, 30, 8, 5]) });
    const r = resultOf(
      ["p0", "p1", "p2", "p4"],
      [],
      [
        ["p3", 12],
        ["p5", 8],
        ["p6", 5],
      ],
    );
    expect(popDists.warnings(r, p)).toStrictEqual([
      {
        code: "tooFewIndividuals",
        text: "Populations p3, p5 and p6 have fewer than 20 individuals, 12, 8 and 5, so they are left out of the distances. To include them, lower the minimum of individuals, or merge each with another population in the metadata file.",
      },
    ]);
  });

  test("numCheckNumbers is null with a threshold of observed heterozygosity on the individuals", () => {
    const p = project({
      individualFilters: [{ kind: "obs_het", maxAllowedObsHet: 0.5 }],
    });
    expect(popDists.numCheckNumbers(p)).toBeNull();
  });
});

describe("SF2 D4 the distances between populations read the filters that apply to the file", () => {
  test("with passed on and a .nei file whose read says keepsPassed false, the job and the key are those of the filters without it", () => {
    const base = exampleProject(1);
    const p = withPassedOn(base, false);
    const { client, jobs } = fakeClient(null);
    popDists.run(p, client);
    popDists.run(base, client);
    expect(jobs[0]?.filters).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
    ]);
    expect(jobs[0]).toStrictEqual(jobs[1]);
    expect(keyOfDists(p)).toBe(keyOfDists(base));
    popDists.run(withPassedOn(base, true), client);
    expect(jobs[2]?.filters[0]).toEqual({ kind: "passed" });
  });
});
