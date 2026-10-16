import { describe, expect, test } from "vitest";
import {
  PCA2_DEFAULTS,
  PCA_DEFAULTS,
  PCA_MAX_INDIVIDUALS,
  PCA_NUM_COMPS_KEPT,
  crashSpeaksOfMemory,
  crashText,
  pca,
  pcaFilters,
  pcaOnPopgen2,
  pcaMethodOf,
  pcaOptions,
  pcaPageOf,
  pruningDistanceReason,
  refusalText,
  statisticsFailedText,
} from "./pca.ts";
import type { PcaOptions } from "./pca.ts";
import { diversity, refusalText as diversityRefusalText } from "./diversity.ts";
import { filterCounts } from "./filterCounts.ts";
import { individualChecks } from "./individualChecks.ts";
import { STEP_LD_FILTER, ldOrderText } from "./words.ts";
import { countsOf, individualStatsOf } from "../apps.ts";
import { individualsKept } from "../individualsKept.ts";
import type { IndividualStats, IndividualsKept } from "../individualsKept.ts";
import { createKeyMemo, keyOf } from "../keys.ts";
import type { JsonObject, Key, KeyedDef } from "../keys.ts";
import {
  emptyProject,
  individualsNeeds,
  loadIndividuals,
  setAnalysisOptions,
  setVariantFilter,
  turnOffVariantFilter,
  variantFilterNeeds,
} from "../project.ts";
import type { Project, ProjectVariantFilter } from "../project.ts";
import { createStore } from "../store.ts";
import type { AnalysisView, WorkerClient } from "../store.ts";
import { deepFreeze, withPassedOn } from "../testSupport.ts";
import type {
  IndividualFilter,
  IndividualsTable,
  Job,
  JobResult,
  Outcome,
  PassStats,
  PcaJob,
  PcaResult,
  Run,
} from "../../worker/protocol.ts";

const VARIANTS_ID = "00112233445566778899aabbccddeeff";
const INDIVIDUALS_ID = "ffeeddccbbaa99887766554433221100";

/** The missing data filter of a new project. */
const MISSING_01: ProjectVariantFilter = {
  kind: "missing_data",
  maxAllowedMissingRate: 0.1,
};

/** The individuals `s000` to `s‹n−1›`, as the panel names them. */
function individualsOf(count: number): string[] {
  return Array.from(
    { length: count },
    (_, i) => `s${String(i).padStart(3, "0")}`,
  );
}

/** The individuals file of the tests, `pops.csv`, with every individual
    of `individuals` in the column `pop`, in p0 and p1 by turns. */
function tableOf(individuals: readonly string[]): IndividualsTable {
  return {
    columns: ["IID", "pop"],
    rows: individuals.map((name, i) => [name, i % 2 === 0 ? "p0" : "p1"]),
  };
}

/** What the tests set of a project; each field has its default. */
interface Setting {
  /** The filters of the variants on; the missing data at 0.1. */
  readonly filters?: readonly ProjectVariantFilter[];
  /** The PCA's options set by the user, over `PCA_DEFAULTS`; none set when
      absent. */
  readonly options?: Partial<PcaOptions>;
  /** The individuals of the variants file; the 200 of the panel. */
  readonly individuals?: readonly string[];
  /** The name of the variants file; panel.nei. */
  readonly variantsName?: string;
  /** How a VCF was read, `null` for a `.nei`. */
  readonly readOptions?: {
    readonly ploidy: number;
    readonly onlyPassed: boolean;
  } | null;
  /** The variants a pass counted in the file, `null` when none has. */
  readonly numVars?: number | null;
  /** Whether the read says the variants record their FILTER; true for a
      VCF and false for a `.nei` file unless given. */
  readonly keepsPassed?: boolean;
  /** The filters of individuals; none. */
  readonly individualFilters?: readonly IndividualFilter[];
  /** The individuals file: read with every individual, pending, or none. */
  readonly individualsFile?: "read" | "pending" | "none" | IndividualsTable;
  /** The column of the populations; `pop`. */
  readonly column?: string | null;
}

/** The options of the PCA set over its defaults, as the project holds
    them. */
function optionsJson(options: Partial<PcaOptions>): JsonObject {
  const parsed = pca.parseOptions({ ...PCA_DEFAULTS, ...options }, 1);
  if (!parsed.ok) {
    throw new Error(`options refused: ${parsed.error}`);
  }
  return parsed.value;
}

/** A project of population genetics, frozen deeply, as `setting` says. */
function project(setting: Setting = {}): Project {
  const individuals = setting.individuals ?? individualsOf(200);
  const file = setting.individualsFile ?? "read";
  const table = typeof file === "object" ? file : tableOf(individuals);
  return deepFreeze<Project>({
    app: "popgen",
    variants: {
      fileId: VARIANTS_ID,
      name: setting.variantsName ?? "panel.nei",
      size: 261_490,
      format:
        setting.readOptions === undefined || setting.readOptions === null
          ? "nei"
          : "vcf",
      readOptions: setting.readOptions ?? null,
      read: {
        kind: "read",
        individuals,
        ploidy: 2,
        numVars: setting.numVars ?? null,
        keepsPassed:
          setting.keepsPassed ??
          (setting.readOptions !== undefined && setting.readOptions !== null),
      },
    },
    filters: setting.filters ?? [MISSING_01],
    filtersOff: [],
    individualFilters: setting.individualFilters ?? [],
    individualFiltersOff: [],
    individuals:
      file === "none"
        ? null
        : {
            fileId: INDIVIDUALS_ID,
            name: "pops.csv",
            csv: { encoding: "auto", separator: "auto", decimal: "auto" },
            typesSet: [],
            read:
              file === "pending"
                ? { kind: "pending" }
                : {
                    kind: "read",
                    table,
                    columns: table.columns.map((_, i) =>
                      i === 0
                        ? { kind: "identifier" }
                        : { kind: "categorical" },
                    ),
                    found: {
                      encoding: "utf-8",
                      separator: ",",
                      decimal: ".",
                      undecodedLine: null,
                    },
                  },
          },
    grouping: {
      kind: "populations",
      column: setting.column === undefined ? "pop" : setting.column,
    },
    analyses:
      setting.options === undefined
        ? []
        : [{ analysis: "pca", options: optionsJson(setting.options) }],
    reference: null,
  });
}

/** The LD filter of the Variants step, or of the PCA, at r² `r2` within
    `maxDist`. */
function ld(r2: number, maxDist: number | null): ProjectVariantFilter {
  return { kind: "ld", maxAllowedR2: r2, maxDist };
}

/** The options of the PCA with its own LD filter at r² 0.1 within
    `maxDist`. */
function ownLd(maxDist: number | null): Partial<PcaOptions> {
  return { ld: { follow: false, maxAllowedR2: 0.1, maxDist } };
}

/** The reason of the PCA's own LD filter with no distance. */
const PRUNING_DISTANCE =
  "The LD pruning of the PCA needs the distance within which variants are compared. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs, or set the LD pruning of the PCA back to as in the Variants step.";

/** The reason of the LD filter of the Variants step with no distance. */
const STEP_LD_DISTANCE =
  "The LD pruning of the Variants step needs the distance within which variants are compared. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs, or turn off the LD pruning, in the Variants step.";

describe("IP6 D4 pcaFilters, the rows of 'Which variants it reads'", () => {
  const own = {
    missingData: (rate: number): Partial<PcaOptions> => ({
      missingData: { follow: false, maxAllowedMissingRate: rate },
    }),
    maf: (maf: number): Partial<PcaOptions> => ({
      maf: { follow: false, maxAllowedMaf: maf },
    }),
  };
  const optionsOf = (options: Partial<PcaOptions>): PcaOptions =>
    pcaOptions(project({ options }), "popgen");
  const obsHet: ProjectVariantFilter = {
    kind: "obs_het",
    maxAllowedObsHet: 0.9,
  };
  const maf09: ProjectVariantFilter = { kind: "maf", maxAllowedMaf: 0.9 };

  test("missing data 0.1 and the defaults: missing data 0.1 and no LD filter", () => {
    expect(pcaFilters([MISSING_01], PCA_DEFAULTS, "popgen")).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
    ]);
  });

  test("missing data 0.1 and the PCA's own LD at r² 0.1 with no distance: the LD filter with no distance", () => {
    expect(pcaFilters([MISSING_01], optionsOf(ownLd(null)), "popgen")).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "ld", maxAllowedR2: 0.1, maxDist: null },
    ]);
  });

  test("missing data 0.1 and the PCA's own LD at r² 0.1 within 50,000", () => {
    expect(
      pcaFilters([MISSING_01], optionsOf(ownLd(50_000)), "popgen"),
    ).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "ld", maxAllowedR2: 0.1, maxDist: 50_000 },
    ]);
  });

  test("missing data 0.1 and the PCA's own missing data 0.05, MAF 0.95 and LD: the three of the PCA in the order of their kinds", () => {
    const o = optionsOf({
      ...own.missingData(0.05),
      ...own.maf(0.95),
      ...ownLd(50_000),
    });
    expect(pcaFilters([MISSING_01], o, "popgen")).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.05 },
      { kind: "maf", maxAllowedMaf: 0.95 },
      { kind: "ld", maxAllowedR2: 0.1, maxDist: 50_000 },
    ]);
  });

  test("missing data 0.1 and MAF 0.9 with the defaults: the dataset's two", () => {
    expect(pcaFilters([MISSING_01, maf09], PCA_DEFAULTS, "popgen")).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "maf", maxAllowedMaf: 0.9 },
    ]);
  });

  test("missing data 0.1 and MAF 0.9 with the PCA's own MAF 0.98, looser: the PCA's in the place of the dataset's", () => {
    expect(
      pcaFilters([MISSING_01, maf09], optionsOf(own.maf(0.98)), "popgen"),
    ).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "maf", maxAllowedMaf: 0.98 },
    ]);
  });

  test("missing data, heterozygosity and LD r² 0.3 within 10,000 with the defaults: the dataset's three", () => {
    expect(
      pcaFilters([MISSING_01, obsHet, ld(0.3, 10_000)], PCA_DEFAULTS, "popgen"),
    ).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "obs_het", maxAllowedObsHet: 0.9 },
      { kind: "ld", maxAllowedR2: 0.3, maxDist: 10_000 },
    ]);
  });

  test("the same with the PCA's own missing data 0.02 and LD within 50,000: the heterozygosity stays the dataset's", () => {
    const o = optionsOf({ ...own.missingData(0.02), ...ownLd(50_000) });
    expect(
      pcaFilters([MISSING_01, obsHet, ld(0.3, 10_000)], o, "popgen"),
    ).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.02 },
      { kind: "obs_het", maxAllowedObsHet: 0.9 },
      { kind: "ld", maxAllowedR2: 0.1, maxDist: 50_000 },
    ]);
  });

  test("the dataset's LD with no distance, which the PCA follows, is copied with maxDist null", () => {
    expect(
      pcaFilters([MISSING_01, ld(0.3, null)], PCA_DEFAULTS, "popgen"),
    ).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "ld", maxAllowedR2: 0.3, maxDist: null },
    ]);
  });

  test("the dataset's LD with no distance and the PCA's own within 50,000: the PCA's in its place", () => {
    expect(
      pcaFilters(
        [MISSING_01, ld(0.3, null)],
        optionsOf(ownLd(50_000)),
        "popgen",
      ),
    ).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "ld", maxAllowedR2: 0.1, maxDist: 50_000 },
    ]);
  });

  test("no filter in the dataset and the PCA's own missing data 0.05: that filter alone", () => {
    expect(pcaFilters([], optionsOf(own.missingData(0.05)), "popgen")).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.05 },
    ]);
  });

  test("the LD set back to as in the Variants step with r² 0.1 and 50,000 kept: nothing of the PCA's own", () => {
    const o = optionsOf({
      ld: { follow: true, maxAllowedR2: 0.1, maxDist: 50_000 },
    });
    expect(pcaFilters([MISSING_01], o, "popgen")).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
    ]);
  });

  test("the same frozen value twice for the same inputs", () => {
    const filters = [MISSING_01, maf09];
    const o = optionsOf(ownLd(50_000));
    const first = pcaFilters(filters, o, "popgen");
    expect(pcaFilters(filters, o, "popgen")).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(pcaFilters([MISSING_01, maf09], o, "popgen")).not.toBe(first);
  });

  test("a MAF of the PCA's own at 1 is a MAF filter at 1, and a filter of the step turned off is not the dataset's", () => {
    const p = deepFreeze<Project>({
      ...project({ options: own.maf(1) }),
      filtersOff: [ld(0.3, 50_000)],
    });
    expect(pcaFilters(p.filters, pcaOptions(p, "popgen"), "popgen")).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "maf", maxAllowedMaf: 1 },
    ]);
  });

  test("the options of a project with no entry are PCA_DEFAULTS, and with an entry the same object while it does not change", () => {
    expect(pcaOptions(project(), "popgen")).toBe(PCA_DEFAULTS);
    const p = project({ options: ownLd(50_000) });
    expect(pcaOptions(p, "popgen")).toBe(pcaOptions(p, "popgen"));
    expect(pcaOptions(p, "popgen").ld).toEqual({
      follow: false,
      maxAllowedR2: 0.1,
      maxDist: 50_000,
    });
  });
});

describe("AP2 D1 pcaFilters on popgen2.html, the table of 'On popgen2.html'", () => {
  /** The options of popgen2.html, PCA2_DEFAULTS with `change` over them,
      frozen. */
  const options2 = (change: Partial<PcaOptions> = {}): PcaOptions =>
    deepFreeze<PcaOptions>({ ...PCA2_DEFAULTS, ...change });
  const ownMissing = (rate: number): Partial<PcaOptions> => ({
    missingData: { follow: false, maxAllowedMissingRate: rate },
  });
  const ownMaf = (maf: number): Partial<PcaOptions> => ({
    maf: { follow: false, maxAllowedMaf: maf },
  });
  const ldDefault = { kind: "ld", maxAllowedR2: 0.1, maxDist: 100_000 };

  test("PCA2_DEFAULTS: the missing data and the MAF following the Variants tab, the LD pruning on at r² 0.1 within 100,000 base pairs", () => {
    expect(PCA2_DEFAULTS).toEqual({
      method: "pca",
      missingData: { follow: true, maxAllowedMissingRate: 0.1 },
      maf: { follow: true, maxAllowedMaf: 0.95 },
      ld: { follow: false, maxAllowedR2: 0.1, maxDist: 100_000 },
      colourBy: null,
      axes: [1, 2, 3],
      view: "3d",
    });
    expect(Object.isFrozen(PCA2_DEFAULTS.ld)).toBe(true);
  });

  test("the Variants tab's missing data 0.1 and PCA2_DEFAULTS: missing data 0.1, LD r² 0.1 within 100,000", () => {
    expect(pcaFilters([missing(0.1)], options2(), "popgen2")).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      ldDefault,
    ]);
  });

  test("missing data 0.1 and the PCA's own 0.05: missing data 0.05, LD", () => {
    expect(
      pcaFilters([missing(0.1)], options2(ownMissing(0.05)), "popgen2"),
    ).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.05 },
      ldDefault,
    ]);
  });

  test("missing data 0.03 and the PCA's own 0.05: missing data 0.03, LD", () => {
    expect(
      pcaFilters([missing(0.03)], options2(ownMissing(0.05)), "popgen2"),
    ).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.03 },
      ldDefault,
    ]);
  });

  test("missing data off and the PCA's own 0.05: missing data 0.05, LD", () => {
    expect(pcaFilters([], options2(ownMissing(0.05)), "popgen2")).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.05 },
      ldDefault,
    ]);
  });

  test("missing data off and the PCA following: LD alone", () => {
    expect(pcaFilters([], options2(), "popgen2")).toEqual([ldDefault]);
  });

  test("MAF 0.95 and the PCA's own 0.9: missing data 0.1, MAF 0.9, LD", () => {
    expect(
      pcaFilters(
        [missing(0.1), { kind: "maf", maxAllowedMaf: 0.95 }],
        options2(ownMaf(0.9)),
        "popgen2",
      ),
    ).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "maf", maxAllowedMaf: 0.9 },
      ldDefault,
    ]);
  });

  test("MAF off and the PCA's own 0.9: missing data 0.1, MAF 0.9, LD", () => {
    expect(
      pcaFilters([missing(0.1)], options2(ownMaf(0.9)), "popgen2"),
    ).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "maf", maxAllowedMaf: 0.9 },
      ldDefault,
    ]);
  });

  test("MAF 0.85 and the PCA's own 0.9: missing data 0.1, MAF 0.85, LD", () => {
    expect(
      pcaFilters(
        [missing(0.1), { kind: "maf", maxAllowedMaf: 0.85 }],
        options2(ownMaf(0.9)),
        "popgen2",
      ),
    ).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "maf", maxAllowedMaf: 0.85 },
      ldDefault,
    ]);
  });

  test("any Variants tab and the LD following: no LD", () => {
    const following = options2({
      ld: { follow: true, maxAllowedR2: 0.1, maxDist: 50_000 },
    });
    expect(pcaFilters([missing(0.1)], following, "popgen2")).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
    ]);
    expect(pcaFilters([], following, "popgen2")).toEqual([]);
    expect(
      pcaFilters(
        [missing(0.03), { kind: "maf", maxAllowedMaf: 0.9 }],
        options2({
          ...ownMissing(0.05),
          ld: { follow: true, maxAllowedR2: 0.1, maxDist: null },
        }),
        "popgen2",
      ),
    ).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.03 },
      { kind: "maf", maxAllowedMaf: 0.9 },
    ]);
  });

  test("FILTER and observed heterozygosity 0.5 on, PCA2_DEFAULTS: FILTER, missing data 0.1, observed heterozygosity 0.5, LD, in that order", () => {
    expect(
      pcaFilters(
        [
          { kind: "passed" },
          missing(0.1),
          { kind: "obs_het", maxAllowedObsHet: 0.5 },
        ],
        options2(),
        "popgen2",
      ),
    ).toEqual([
      { kind: "passed" },
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "obs_het", maxAllowedObsHet: 0.5 },
      ldDefault,
    ]);
  });

  test("the same inputs twice give the same frozen value", () => {
    const filters = [missing(0.03)];
    const o = options2(ownMissing(0.05));
    const first = pcaFilters(filters, o, "popgen2");
    expect(pcaFilters(filters, o, "popgen2")).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(first.every((filter) => Object.isFrozen(filter))).toBe(true);
  });

  test("the two pages asked in turn on the same inputs each get their own list", () => {
    const filters = [missing(0.03)];
    const o = options2({
      ...ownMissing(0.05),
      ld: { follow: true, maxAllowedR2: 0.1, maxDist: null },
    });
    const old = [{ kind: "missing_data", maxAllowedMissingRate: 0.05 }];
    const narrowed = [{ kind: "missing_data", maxAllowedMissingRate: 0.03 }];
    expect(pcaFilters(filters, o, "popgen")).toEqual(old);
    expect(pcaFilters(filters, o, "popgen2")).toEqual(narrowed);
    expect(pcaFilters(filters, o, "popgen")).toEqual(old);
    const other = [missing(0.03)];
    expect(pcaFilters(other, o, "popgen2")).toEqual(narrowed);
    expect(pcaFilters(other, o, "popgen")).toEqual(old);
  });

  test("the options of a project with no entry are PCA2_DEFAULTS on popgen2.html and PCA_DEFAULTS on the old page", () => {
    expect(pcaOptions(project(), "popgen2")).toBe(PCA2_DEFAULTS);
    expect(pcaOptions(project(), "popgen")).toBe(PCA_DEFAULTS);
    const p = project({ options: ownLd(50_000) });
    expect(pcaOptions(p, "popgen2")).toBe(pcaOptions(p, "popgen"));
  });
});

describe("AP6 pcaMethodOf, the method read alone", () => {
  test("gives the method the project holds, the PCoA, on either page", () => {
    const p = project({ options: { method: "pcoa" } });
    expect(pcaMethodOf(p, "popgen2")).toBe("pcoa");
    expect(pcaMethodOf(p, "popgen")).toBe("pcoa");
  });

  test("gives the method of the defaults of the page when the project holds no options", () => {
    expect(pcaMethodOf(project(), "popgen2")).toBe(PCA2_DEFAULTS.method);
    expect(pcaMethodOf(project(), "popgen")).toBe(PCA_DEFAULTS.method);
  });

  test("does not throw on options pcaOptions refuses: their method when it is one, the default's when it is not", () => {
    const refused = (options: JsonObject): Project =>
      changed(project(), { analyses: [{ analysis: "pca", options }] });
    const badAxes = refused({ ...optionsJson({ method: "pcoa" }), axes: [] });
    expect(() => pcaOptions(badAxes, "popgen2")).toThrow(
      "popnei_web defect: the project holds options of the PCA it refuses.",
    );
    expect(pcaMethodOf(badAxes, "popgen2")).toBe("pcoa");
    expect(
      pcaMethodOf(refused({ ...optionsJson({}), method: "tsne" }), "popgen2"),
    ).toBe("pca");
  });
});

describe("AP2 D2 the page of each definition", () => {
  test("pca is of the old page, pcaOnPopgen2 of popgen2.html, and another analysis is a defect", () => {
    expect(pcaPageOf(pca)).toBe("popgen");
    expect(pcaPageOf(pcaOnPopgen2)).toBe("popgen2");
    expect(() => pcaPageOf(diversity)).toThrow(/^popnei_web defect: /u);
  });
});

describe("AP2 D2 the key of the PCA on popgen2.html", () => {
  /** A project of popgen2.html whose PCA has its own missing data at 0.05
      and its LD pruning within 50,000, with the Variants tab's missing
      data at `rate`. */
  const at = (rate: number): Project =>
    project({
      filters: [missing(rate)],
      options: {
        missingData: { follow: false, maxAllowedMissingRate: 0.05 },
        ld: { follow: false, maxAllowedR2: 0.1, maxDist: 50_000 },
      },
    });

  test("the Variants tab's missing data from 0.1 to 0.08 while the PCA's own is 0.05: the same key; to 0.03, another; back to 0.1, the first", () => {
    const first = keyOfPca(at(0.1), "0.2.2", pcaOnPopgen2);
    expect(keyOfPca(at(0.08), "0.2.2", pcaOnPopgen2)).toBe(first);
    expect(keyOfPca(at(0.03), "0.2.2", pcaOnPopgen2)).not.toBe(first);
    expect(keyOfPca(at(0.1), "0.2.2", pcaOnPopgen2)).toBe(first);
  });

  test("the Variants tab's MAF from 0.95 to 0.92 while the PCA's own is 0.9: the same key; to 0.85, another", () => {
    const withMaf = (maf: number): Project =>
      project({
        filters: [missing(0.1), { kind: "maf", maxAllowedMaf: maf }],
        options: {
          maf: { follow: false, maxAllowedMaf: 0.9 },
          ld: { follow: false, maxAllowedR2: 0.1, maxDist: 50_000 },
        },
      });
    const first = keyOfPca(withMaf(0.95), "0.2.2", pcaOnPopgen2);
    expect(keyOfPca(withMaf(0.92), "0.2.2", pcaOnPopgen2)).toBe(first);
    expect(keyOfPca(withMaf(0.85), "0.2.2", pcaOnPopgen2)).not.toBe(first);
  });

  test("an individuals file of none of the individuals: the key of no individuals file", () => {
    const others = individualsOf(300).slice(200);
    const options = {
      ld: { follow: false, maxAllowedR2: 0.1, maxDist: 50_000 },
    };
    const withoutFile = project({ individualsFile: "none", options });
    const withOthers = project({ individualsFile: tableOf(others), options });
    expect(keyOfPca(withOthers, "0.2.2", pcaOnPopgen2)).toBe(
      keyOfPca(withoutFile, "0.2.2", pcaOnPopgen2),
    );
    expect(pcaOnPopgen2.needs(withOthers)).toBeNull();
  });

  test("the key holds the filters the narrowing gives, the Variants tab's 0.03 in the place of the PCA's 0.05", () => {
    expect(pcaOnPopgen2.keyInputs(at(0.03))).toEqual({
      method: "pca",
      filters: [
        { kind: "missing_data", maxAllowedMissingRate: 0.03 },
        { kind: "ld", maxAllowedR2: 0.1, maxDist: 50_000 },
      ],
    });
  });

  test("a project with no entry has the key of PCA2_DEFAULTS, the LD pruning within 100,000 among its filters, that of 100,000 typed", () => {
    expect(pcaOnPopgen2.keyInputs(project())).toEqual({
      method: "pca",
      filters: [
        { kind: "missing_data", maxAllowedMissingRate: 0.1 },
        { kind: "ld", maxAllowedR2: 0.1, maxDist: 100_000 },
      ],
    });
    expect(pcaOnPopgen2.keyInputs(project())).toEqual(
      pcaOnPopgen2.keyInputs(project({ options: ownLd(100_000) })),
    );
    expect(pcaOnPopgen2.keyInputs(project())).not.toEqual(
      pcaOnPopgen2.keyInputs(project({ options: ownLd(50_000) })),
    );
    expect(pcaOnPopgen2.defaults).toEqual({
      ...PCA2_DEFAULTS,
      axes: [1, 2, 3],
    });
  });
});

describe("AP6 D1 pcaFilters on popgen2.html, the PCA's own value of 1 with the Variants tab's threshold off", () => {
  const ld50k = { follow: false, maxAllowedR2: 0.1, maxDist: 50_000 };
  /** A project of popgen2.html with the Variants tab's filters
      `filters` and the PCA's options `options` over PCA2_DEFAULTS. */
  const withOptions = (
    filters: readonly ProjectVariantFilter[],
    options: Partial<PcaOptions>,
  ): Project => project({ filters, options: { ld: ld50k, ...options } });

  test("the missing data off and the PCA's own at 1: no filter of the missing data, the key as when the PCA follows", () => {
    const following = withOptions([], {});
    const own = withOptions([], {
      missingData: { follow: false, maxAllowedMissingRate: 1 },
    });
    expect(
      pcaFilters(own.filters, pcaOptions(own, "popgen2"), "popgen2"),
    ).toEqual([{ kind: "ld", maxAllowedR2: 0.1, maxDist: 50_000 }]);
    expect(keyOfPca(own, "0.2.2", pcaOnPopgen2)).toBe(
      keyOfPca(following, "0.2.2", pcaOnPopgen2),
    );
  });

  test("the MAF off and the PCA's own at 1: no MAF filter, the key as when the PCA follows; at 0.99, a MAF filter", () => {
    const following = withOptions([missing(0.1)], {});
    const at = (maf: number): Project =>
      withOptions([missing(0.1)], {
        maf: { follow: false, maxAllowedMaf: maf },
      });
    expect(
      pcaFilters(at(1).filters, pcaOptions(at(1), "popgen2"), "popgen2"),
    ).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "ld", maxAllowedR2: 0.1, maxDist: 50_000 },
    ]);
    expect(keyOfPca(at(1), "0.2.2", pcaOnPopgen2)).toBe(
      keyOfPca(following, "0.2.2", pcaOnPopgen2),
    );
    expect(
      pcaFilters(at(0.99).filters, pcaOptions(at(0.99), "popgen2"), "popgen2"),
    ).toContainEqual({ kind: "maf", maxAllowedMaf: 0.99 });
  });

  test("the old page keeps a MAF of the PCA's own at 1 as a filter at 1", () => {
    const p = withOptions([missing(0.1)], {
      maf: { follow: false, maxAllowedMaf: 1 },
    });
    expect(
      pcaFilters(p.filters, pcaOptions(p, "popgen"), "popgen"),
    ).toContainEqual({ kind: "maf", maxAllowedMaf: 1 });
  });
});

describe("AP2 D2 needs of pcaOnPopgen2, and the words of popgen2.html", () => {
  /** The PCA's LD pruning on at r² 0.1 within 50,000, as the flows of
      popgen2.html set it. */
  const LD_50000: Partial<PcaOptions> = {
    ld: { follow: false, maxAllowedR2: 0.1, maxDist: 50_000 },
  };
  const PRUNING_DISTANCE_2 =
    "The LD pruning of the PCA needs the distance within which variants are compared. Type a distance in base pairs, 100,000 to start with, or turn the LD pruning off.";
  /** The PCA's LD pruning on with its distance emptied by the user. */
  const LD_EMPTIED: Partial<PcaOptions> = {
    ld: { follow: false, maxAllowedR2: 0.1, maxDist: null },
  };

  test("an individuals file pending, refused, or lacking individuals of the variants file: no reason", () => {
    expect(
      pcaOnPopgen2.needs(
        project({ individualsFile: "pending", options: LD_50000 }),
      ),
    ).toBeNull();
    const refused = deepFreeze<Project>({
      ...project({ options: LD_50000 }),
      individuals: {
        fileId: INDIVIDUALS_ID,
        name: "pops.csv",
        csv: { encoding: "auto", separator: "auto", decimal: "auto" },
        typesSet: [],
        read: { kind: "failed", error: { kind: "empty" }, format: "text" },
      },
    });
    expect(individualsNeeds(refused)).not.toBeNull();
    expect(pcaOnPopgen2.needs(refused)).toBeNull();
    expect(
      pcaOnPopgen2.needs(
        project({
          individualsFile: tableOf(individualsOf(200).slice(12)),
          options: LD_50000,
        }),
      ),
    ).toBeNull();
  });

  test("PCA2_DEFAULTS, within 100,000 base pairs: no reason", () => {
    expect(pcaOnPopgen2.needs(project())).toBeNull();
    expect(pruningDistanceReason(project(), "popgen2")).toBeNull();
  });

  test("the distance emptied: needs gives the short line of popgen2.html beside Run, the reason in full under the field by the method; 50000 typed: none", () => {
    const emptied = project({ options: LD_EMPTIED });
    expect(pcaOnPopgen2.needs(emptied)).toBe(
      "Type the LD distance in Parameters, or turn the LD pruning off.",
    );
    expect(pruningDistanceReason(emptied, "popgen2")).toBe(PRUNING_DISTANCE_2);
    const pcoa = project({
      options: {
        method: "pcoa",
        ld: { follow: false, maxAllowedR2: 0.1, maxDist: null },
      },
    });
    expect(pcaOnPopgen2.needs(pcoa)).toBe(
      "Type the LD distance in Parameters, or turn the LD pruning off.",
    );
    expect(pruningDistanceReason(pcoa, "popgen2")).toBe(
      "The LD pruning of the PCoA needs the distance within which variants are compared. Type a distance in base pairs, 100,000 to start with, or turn the LD pruning off.",
    );
    expect(pcaOnPopgen2.needs(project({ options: LD_50000 }))).toBeNull();
    expect(pruningDistanceReason(project(), "popgen")).toBeNull();
  });

  test("9,382 individuals: the limit, with or without an individuals file", () => {
    const many = individualsOf(9382);
    expect(
      pcaOnPopgen2.needs(
        project({ individuals: many, individualsFile: "none" }),
      ),
    ).toBe(limitWords("9,382"));
    expect(
      pcaOnPopgen2.needs(
        project({ individuals: many, individualsFile: "pending" }),
      ),
    ).toBe(limitWords("9,382"));
    expect(
      pcaOnPopgen2.needs(
        project({ individuals: individualsOf(9381), options: LD_50000 }),
      ),
    ).toBeNull();
  });

  test("the PCoA of 9,382 individuals kept: the limit with the filters of individuals in the Variants tab", () => {
    const many = individualsOf(9382);
    const p = project({
      individuals: many,
      individualsFile: "none",
      options: { method: "pcoa", ...LD_50000 },
    });
    expect(pcaOnPopgen2.keptNeeds?.(p, keptOf(p, null))).toBe(
      "panel.nei has 9,382 individuals, and the principal coordinates of more than 9,381 need more memory than a browser tab can hold. Keep at most 9,381 with the filters of individuals in the Variants tab, or calculate them with popnei in Python, outside the browser.",
    );
  });

  test("the warnings with the words of popgen2.html: no LD pruning, and few variants", () => {
    expect(
      pcaOnPopgen2.warnings(
        result({ numVarsUsed: 1200 }),
        project({
          options: { ld: { follow: true, maxAllowedR2: 0.1, maxDist: null } },
        }),
        null,
      ),
    ).toEqual([
      {
        code: "pruningOff",
        text: "No LD pruning was applied for the PCA, so a region of the genome counts once for each of its variants, and a region of many variants in linkage disequilibrium, such as an inversion, can make a component of its own that separates the individuals by that region rather than by their ancestry. Turn on the LD pruning of the PCA in Parameters, unless such regions are what you are looking for.",
      },
    ]);
    expect(
      pcaOnPopgen2.warnings(
        result({ numVarsUsed: 150 }),
        project({ options: LD_50000 }),
        null,
      ),
    ).toEqual([
      {
        code: "fewVariants",
        text: "The PCA used 150 variants that vary among its 200 individuals, fewer variants than individuals, so each component rests on few variants and can show chance differences as structure. If the dataset has more, loosen the filters of the PCA in Parameters, or the thresholds of the Variants tab.",
      },
    ]);
  });

  test("the refusals with the words of popgen2.html: no variant left, and the LD pruning over a file not sorted", () => {
    const p = project({ options: LD_50000 });
    expect(
      refusalText("there are no variants to do a PCA with", p, "popgen2"),
    ).toBe(
      "No variant of panel.nei is left after the filters of the PCA, so there is no variant to do the PCA with. Loosen the filters of the PCA in Parameters, or the thresholds of the Variants tab.",
    );
    expect(
      refusalText(
        "there are no variants to do a PCA with",
        project({ variantsName: "empty.vcf", numVars: 0, options: LD_50000 }),
        "popgen2",
      ),
    ).toBe(
      "empty.vcf has no variants, so there is no variant to do the PCA with. Open another variants file in the Variants tab.",
    );
    expect(
      refusalText(
        LD_NOT_SORTED,
        project({
          variantsName: "panel.vcf.gz",
          readOptions: { ploidy: 2, onlyPassed: false },
          options: LD_50000,
        }),
        "popgen2",
      ),
    ).toBe(
      "The LD pruning of the PCA needs the variants of each chromosome together and in the order of their positions, and panel.vcf.gz does not have them so: on chromosome 1, a variant at position 10 comes after one at position 30. Sort the file, with bcftools sort for a VCF, and open it again in the Variants tab, or turn the LD pruning off.",
    );
    expect(
      refusalText(
        LD_NOT_SORTED,
        project({
          variantsName: "panel.vcf.gz",
          readOptions: { ploidy: 2, onlyPassed: false },
          options: { method: "pcoa", ...LD_50000 },
        }),
        "popgen2",
      ),
    ).toBe(
      "The LD pruning of the PCoA needs the variants of each chromosome together and in the order of their positions, and panel.vcf.gz does not have them so: on chromosome 1, a variant at position 10 comes after one at position 30. Sort the file, with bcftools sort for a VCF, and open it again in the Variants tab, or turn the LD pruning off.",
    );
    expect(
      refusalText(
        "no variant has more than one dosage among its called genotypes, so none of them varies and there is nothing to do a PCA with",
        p,
        "popgen2",
      ),
    ).toBe(
      "No variant left after the filters varies among the individuals kept, so there is nothing to do the PCA with. This happens with one individual, or a few of one line; keep more individuals with the thresholds of the individuals in the Variants tab.",
    );
    expect(refusalText("out of memory.", p, "popgen2")).toBe(
      "popnei could not calculate the principal components: out of memory. Change the settings, or open the variants file again in the Variants tab, to run it again.",
    );
  });

  test("the refusals of the variants file itself, as the box Variants words them, with the box named and the PCA or the PCoA", () => {
    const vcf = project({
      variantsName: "panel.vcf.gz",
      readOptions: { ploidy: 2, onlyPassed: false },
      options: LD_50000,
    });
    const nei = project({ options: LD_50000 });
    const pcoa = project({ options: { method: "pcoa", ...LD_50000 } });
    const again = "open it again in the Variants tab.";
    expect(
      refusalText(
        "the pass gave no variant and its source holds none",
        pcoa,
        "popgen2",
      ),
    ).toBe(
      "panel.nei has no variants. Open another variants file in the Variants tab.",
    );
    expect(
      refusalText(
        "the source could not be read: incomplete deflate stream",
        vcf,
        "popgen2",
      ),
    ).toBe(
      `panel.vcf.gz could not be read to its end: it may be damaged or cut short. Fetch or copy it again, and ${again}`,
    );
    expect(
      refusalText(
        "the batch 1 of the vars file could not be read, so the file is damaged and has to be fetched or copied again: Ipc error: Expected compressed length of 480000 got 479861",
        nei,
        "popgen2",
      ),
    ).toBe(
      `panel.nei could not be read to its end: it may be damaged or cut short. Fetch or copy it again, and ${again}`,
    );
    expect(
      refusalText(
        "a variant of the chromosome chr2 is at the position 0, and the windows of the density of the variants start at the position 1, so it is in none of them; the VCF format puts a telomere there",
        vcf,
        "popgen2",
      ),
    ).toBe(
      `A variant of chromosome chr2 in panel.vcf.gz is at position 0, where the VCF format puts a telomere and not a variant, so the PCA cannot be calculated. Remove that line from the file and ${again}`,
    );
    expect(
      refusalText(
        "the window 9007199254740992 to 18014398509481982 of the chromosome 1 ends past 9007199254740991, the last whole number a number of JavaScript holds: the one after it would be read as another",
        pcoa,
        "popgen2",
      ),
    ).toBe(
      `A variant of chromosome 1 in panel.nei is at a position beyond 2,147,483,647, the largest the VCF format allows, so the PCoA cannot be calculated. Correct the position in the file and ${again}`,
    );
    expect(
      refusalText(
        "line 9 of the VCF, the column of s000: its genotype is of the ploidy 1 and the variants are read with the ploidy 2; popnei does not read a VCF whose genotypes are of different ploidies",
        vcf,
        "popgen2",
      ),
    ).toBe(
      `Line 9 of panel.vcf.gz has a genotype of ploidy 1 among genotypes of ploidy 2, and the application reads one ploidy per file. Remove those variants or individuals from the file and ${again}`,
    );
    expect(
      refusalText(
        "line 84 of the VCF, the column POS: `x80` is not a position",
        vcf,
        "popgen2",
      ),
    ).toBe(
      `popnei could not read panel.vcf.gz: line 84 of the VCF, the column POS: \u201cx80\u201d is not a position. Correct the file, or fetch it again, and ${again}`,
    );
  });

  test("the statistics of each individual refused, in the words of the box Variants, whether the PCA's Run waited or not", () => {
    const p = project({ options: LD_50000 });
    const failureText = (): string => "unused";
    const start =
      "The statistics of each individual, which the thresholds of the individuals need, could not be calculated, so";
    expect(
      statisticsFailedText(
        {
          kind: "refused",
          message: "the source could not be read: incomplete deflate stream",
        },
        p,
        failureText,
        true,
        "popgen2",
      ),
    ).toBe(
      `${start} the PCA was not run. panel.nei could not be read to its end: it may be damaged or cut short. Fetch or copy it again, and open it again in the Variants tab.`,
    );
    expect(
      statisticsFailedText(
        { kind: "refused", message: "out of memory" },
        project({ options: { method: "pcoa", ...LD_50000 } }),
        failureText,
        false,
        "popgen2",
      ),
    ).toBe(
      `${start} the PCoA cannot run. popnei could not read panel.nei: out of memory. Open the file again in the Variants tab, or another file.`,
    );
  });

  test("a crash speaks of the memory from 2,264 individuals, 250 MB of their matrix, and not below", () => {
    expect(crashSpeaksOfMemory(2263)).toBe(false);
    expect(crashSpeaksOfMemory(2264)).toBe(true);
    const p = project({ options: LD_50000 });
    expect(crashText(p, 2263, "popgen2")).toContain(
      "stopped unexpectedly. Run",
    );
    expect(crashText(p, 2264, "popgen2")).toContain("memory of this tab");
  });

  test("the words of a calculation that stopped with no answer, on popgen2.html", () => {
    const p = project({ options: LD_50000 });
    expect(crashText(p, 200, "popgen2")).toBe(
      "The calculation stopped unexpectedly. Run it again. If it stops again, open panel.nei again in the Variants tab.",
    );
    expect(crashText(p, 4000, "popgen2")).toBe(
      "The calculation stopped unexpectedly, perhaps because the principal components of 4,000 individuals, which need about 0.8 GB, did not fit in the memory of this tab; a phone or a tablet gives a tab far less than a computer. Keep fewer individuals with the thresholds of the individuals in the Variants tab, close other tabs and run it again, or calculate them with popnei in Python, outside the browser.",
    );
  });
});

/** A client that records the jobs of the PCA it is given, with the
    individuals kept `individuals`. */
function recordingClient(individuals: readonly string[] | null): {
  readonly client: WorkerClient<Job, JobResult>;
  readonly jobs: PcaJob[];
} {
  const jobs: PcaJob[] = [];
  const client: WorkerClient<Job, JobResult> = {
    run(job): Run<JobResult> {
      if (job.analysis !== "pca") {
        throw new Error(`the PCA sent a job of ${job.analysis}`);
      }
      jobs.push(job);
      return {
        id: 1,
        outcome: Promise.resolve({ kind: "cancelled" }),
        cancel: () => undefined,
      };
    },
    intermediateKey: () => "",
    individuals,
  };
  return { client, jobs };
}

describe("IP6 D4 run", () => {
  test("the job of a new project with the PCA's own LD filter: the filters of pcaFilters, the method, 10 components and no list", () => {
    const { client, jobs } = recordingClient(null);
    pca.run(project({ options: ownLd(50_000) }), client);
    expect(jobs).toEqual([
      {
        analysis: "pca",
        fileId: VARIANTS_ID,
        filters: [MISSING_01, ld(0.1, 50_000)],
        individuals: null,
        method: "pca",
        numCompsKept: 10,
      },
    ]);
  });

  test("the PCoA with the list of the individuals the client gives", () => {
    const { client, jobs } = recordingClient(["s000", "s001"]);
    pca.run(project({ options: { method: "pcoa" } }), client);
    expect(
      jobs.map((job) => [job.method, job.individuals, job.filters]),
    ).toEqual([["pcoa", ["s000", "s001"], [MISSING_01]]]);
    expect(PCA_NUM_COMPS_KEPT).toBe(10);
  });

  test("an LD filter with no distance is a defect of run, which needs locks", () => {
    const { client } = recordingClient(null);
    expect(() => pca.run(project({ options: ownLd(null) }), client)).toThrow(
      /^popnei_web defect: a job was given the LD filter with no distance/,
    );
  });
});

describe("AP2 D1 run and script of pcaOnPopgen2, the filters narrowed", () => {
  /** The Variants tab's missing data at 0.03, the PCA's own at 0.05, and
      its LD pruning within 50,000. */
  const narrowed = (): Project =>
    project({
      filters: [missing(0.03)],
      options: {
        missingData: { follow: false, maxAllowedMissingRate: 0.05 },
        ...ownLd(50_000),
      },
    });

  test("the job carries the Variants tab's 0.03, the stricter, and the LD pruning", () => {
    const { client, jobs } = recordingClient(null);
    pcaOnPopgen2.run(narrowed(), client);
    expect(jobs.map((job) => job.filters)).toEqual([
      [{ kind: "missing_data", maxAllowedMissingRate: 0.03 }, ld(0.1, 50_000)],
    ]);
  });

  test("the script filters at 0.03, the stricter, and then by LD", () => {
    expect(
      pcaOnPopgen2
        .script(narrowed())
        .split("\n")
        .filter((line) => line.startsWith("pca_variants.filter")),
    ).toEqual([
      "pca_variants.filter_by_missing_data(0.03)",
      "pca_variants.filter_by_ld(0.1, 50000)",
    ]);
  });
});

describe("AP2 D1 the comment of the script of pcaOnPopgen2", () => {
  /** The comment of the script of `p` on popgen2.html, in one line. */
  const commentOf = (p: Project): string =>
    pcaOnPopgen2
      .script(p)
      .split("\n")
      .filter((line) => line.startsWith("# "))
      .map((line) => line.slice(2))
      .join(" ");

  test("the missing data the stricter of the PCA's own and the Variants tab's, and the PCA's own LD pruning", () => {
    expect(
      commentOf(
        project({
          filters: [missing(0.03)],
          options: {
            missingData: { follow: false, maxAllowedMissingRate: 0.05 },
            ...ownLd(50_000),
          },
        }),
      ),
    ).toBe(
      "The principal components of the individuals, a PCA of the genotypes, over the filters of the Variants tab, with the missing data filter the stricter of the PCA's own and the Variants tab's, and the PCA's own LD pruning, on a Variants of its own",
    );
  });

  test("the LD pruning alone, and the PCoA's missing data and MAF with no LD pruning", () => {
    expect(commentOf(project({ options: ownLd(50_000) }))).toBe(
      "The principal components of the individuals, a PCA of the genotypes, over the filters of the Variants tab, with the PCA's own LD pruning, on a Variants of its own",
    );
    expect(
      commentOf(
        project({
          options: {
            method: "pcoa",
            missingData: { follow: false, maxAllowedMissingRate: 0.05 },
            maf: { follow: false, maxAllowedMaf: 0.9 },
          },
        }),
      ),
    ).toBe(
      "The principal components of the individuals, a PCoA of the Kosman distances, over the filters of the Variants tab, with the missing data and MAF filters the stricter of the PCoA's own and the Variants tab's, on a Variants of its own",
    );
  });
});

/** The words of the PCA's limit for panel.nei of `count` individuals. */
function limitWords(count: string): string {
  return `panel.nei has ${count} individuals, and the principal components of more than 9,381 need more memory than a browser tab can hold. Calculate them with popnei in Python, outside the browser.`;
}

describe("IP6 D4 needs", () => {
  const many = individualsOf(9382);

  test("a variants file of 9,382 individuals locks the PCA with the words of its limit, whatever the lists keep", () => {
    expect(
      pca.needs(project({ individuals: many, individualsFile: "none" })),
    ).toBe(limitWords("9,382"));
    expect(
      pca.needs(
        project({
          individuals: many,
          individualsFile: "none",
          individualFilters: [
            { kind: "keep", individuals: many.slice(0, 100) },
          ],
        }),
      ),
    ).toBe(limitWords("9,382"));
    expect(PCA_MAX_INDIVIDUALS).toBe(9381);
  });

  test("a variants file of 9,381 individuals does not lock the PCA", () => {
    expect(
      pca.needs(
        project({ individuals: individualsOf(9381), individualsFile: "none" }),
      ),
    ).toBeNull();
  });

  test("the PCoA of the file of 9,382 is not locked by needs, whatever its filters", () => {
    for (const individualFilters of [
      [],
      [{ kind: "keep", individuals: many.slice(0, 100) }] as const,
    ]) {
      expect(
        pca.needs(
          project({
            individuals: many,
            individualsFile: "none",
            options: { method: "pcoa" },
            individualFilters,
          }),
        ),
      ).toBeNull();
    }
  });

  test("each reason of individualsNeeds comes through: the file being read, refused, and lacking individuals", () => {
    const pending = project({ individualsFile: "pending" });
    expect(pca.needs(pending)).toBe("Reading pops.csv.");
    const refused = deepFreeze<Project>({
      ...project(),
      individuals: {
        fileId: INDIVIDUALS_ID,
        name: "pops.csv",
        csv: { encoding: "auto", separator: "auto", decimal: "auto" },
        typesSet: [],
        read: { kind: "failed", error: { kind: "empty" }, format: "text" },
      },
    });
    expect(pca.needs(refused)).not.toBeNull();
    expect(pca.needs(refused)).toBe(individualsNeeds(refused));
    const lacking = project({
      individualsFile: tableOf(individualsOf(200).slice(12)),
    });
    expect(pca.needs(lacking)).toBe(
      "12 individuals of panel.nei are not in pops.csv: s000, s001 and 10 more. Add them to the file and load it again in the Individuals step.",
    );
  });

  test("the limit comes before a metadata file being read, which comes before the PCA's own LD filter with no distance", () => {
    expect(
      pca.needs(
        project({
          individuals: many,
          individualsFile: "pending",
          options: ownLd(null),
        }),
      ),
    ).toBe(limitWords("9,382"));
    expect(
      pca.needs(project({ individualsFile: "pending", options: ownLd(null) })),
    ).toBe("Reading pops.csv.");
  });

  test("with PCA_DEFAULTS and the filters of a new project, no reason", () => {
    expect(pca.needs(project())).toBeNull();
  });

  test("the PCA's own LD filter with no distance gives its words, with or without an LD filter in the dataset", () => {
    expect(pca.needs(project({ options: ownLd(null) }))).toBe(PRUNING_DISTANCE);
    expect(
      pca.needs(
        project({
          options: ownLd(null),
          filters: [MISSING_01, ld(0.3, 10_000)],
        }),
      ),
    ).toBe(PRUNING_DISTANCE);
  });

  test("no reason with the PCA's own LD filter at 50,000, nor with the LD filter following the step and maxDist null", () => {
    expect(pca.needs(project({ options: ownLd(50_000) }))).toBeNull();
    expect(
      pca.needs(
        project({
          options: { ld: { follow: true, maxAllowedR2: 0.1, maxDist: null } },
        }),
      ),
    ).toBeNull();
  });

  test("pruningDistanceReason gives the same words in the same cases, also while another reason comes first", () => {
    expect(
      pruningDistanceReason(project({ options: ownLd(null) }), "popgen"),
    ).toBe(PRUNING_DISTANCE);
    expect(
      pruningDistanceReason(project({ options: ownLd(50_000) }), "popgen"),
    ).toBeNull();
    expect(pruningDistanceReason(project(), "popgen")).toBeNull();
    const reading = project({
      options: ownLd(null),
      individualsFile: "pending",
    });
    expect(pca.needs(reading)).toBe("Reading pops.csv.");
    expect(pruningDistanceReason(reading, "popgen")).toBe(PRUNING_DISTANCE);
  });

  test("under the PCoA the reason names the PCoA, in both places", () => {
    const pcoa = project({ options: { method: "pcoa", ...ownLd(null) } });
    expect(pruningDistanceReason(pcoa, "popgen")).toBe(
      PRUNING_DISTANCE.replaceAll("of the PCA", "of the PCoA"),
    );
    expect(pca.needs(pcoa)).toBe(pruningDistanceReason(pcoa, "popgen"));
  });

  test("the step's LD filter on with no distance: the reason of variantFilterNeeds while the PCA follows it, none with its own at 50,000, and none once 20,000 is typed in the step", () => {
    const stepNoDistance = [MISSING_01, ld(0.3, null)];
    const following = project({ filters: stepNoDistance });
    expect(pca.needs(following)).toBe(STEP_LD_DISTANCE);
    expect(pca.needs(following)).toBe(variantFilterNeeds(following));
    expect(
      pca.needs(project({ filters: stepNoDistance, options: ownLd(50_000) })),
    ).toBeNull();
    expect(
      pca.needs(project({ filters: [MISSING_01, ld(0.3, 20_000)] })),
    ).toBeNull();
  });

  test("with the step's LD filter with no distance, the reason of variantFilterNeeds comes before the limit and before a file being read", () => {
    const stepNoDistance = [MISSING_01, ld(0.3, null)];
    expect(
      pca.needs(
        project({
          filters: stepNoDistance,
          individuals: many,
          individualsFile: "none",
        }),
      ),
    ).toBe(STEP_LD_DISTANCE);
    expect(
      pca.needs(
        project({ filters: stepNoDistance, individualsFile: "pending" }),
      ),
    ).toBe(STEP_LD_DISTANCE);
  });

  test("a project with no metadata file, and one with a file and no column chosen, are not locked", () => {
    expect(pca.needs(project({ individualsFile: "none" }))).toBeNull();
    expect(pca.needs(project({ column: null }))).toBeNull();
  });
});

/** A store of the population genetics application with the PCA among
    its analyses, before the diversity, and the requests it sends. */
function storeOf(first: Project): {
  readonly status: (
    id: string,
  ) => AnalysisView<JobResult>["status"] | undefined;
  readonly startRun: (id: string) => void;
  readonly sent: Job[];
} {
  const sent: Job[] = [];
  const store = createStore<Job, JobResult>({
    first: emptyProject("popgen"),
    analyses: [individualChecks, filterCounts, pca, diversity],
    send: (_key, job): Run<JobResult> => {
      sent.push(job);
      return {
        id: sent.length,
        outcome: new Promise<Outcome<JobResult>>(() => undefined),
        cancel: () => undefined,
      };
    },
    countsOf,
    counts: "filterCounts",
    statistics: { analysis: "individualChecks", of: individualStatsOf },
    write: null,
    appVersion: "0.1.0",
    cacheMaxBytes: 256_000_000,
    maxUndoSteps: 100,
  });
  store.popneiReady("0.1.0");
  store.open(() => first);
  return {
    status: (id) =>
      store.getState().analyses.find((view) => view.id === id)?.status,
    startRun: (id) => {
      store.startRun(id);
    },
    sent,
  };
}

describe("IP6 D4 needs through the store", () => {
  test("the store asks no variantFilterNeeds of the PCA: with its own LD filter over the step's with no distance it is ready, while the diversity is locked", () => {
    const { status } = storeOf(
      project({ filters: [MISSING_01, ld(0.3, null)], options: ownLd(50_000) }),
    );
    expect(pca.filtersRead.variants).toBe(false);
    expect(status("pca")?.kind).toBe("ready");
    expect(status("diversity")).toEqual({
      kind: "locked",
      reason: STEP_LD_DISTANCE,
    });
  });

  test("with the step's LD filter with no distance and a list to keep that names an individual not in the file, the PCA and the diversity have the same reason, that of the list", () => {
    const { status } = storeOf(
      project({
        filters: [MISSING_01, ld(0.3, null)],
        individualFilters: [{ kind: "keep", individuals: ["s000", "nobody"] }],
      }),
    );
    const reason =
      "The list of individuals to keep names 1 individual that is not in panel.nei: nobody. Change the list, or remove the filter, in the Variants step.";
    expect(status("pca")).toEqual({ kind: "locked", reason });
    expect(status("diversity")).toEqual({ kind: "locked", reason });
  });
});

/** The statistics of each individual of `individuals`, of which the
    first `numMissing` lack 0.5 of their genotypes and the others 0.01. */
function statsOf(
  individuals: readonly string[],
  numMissing: number,
): IndividualStats {
  return {
    individuals,
    missingGtRate: Float64Array.from(individuals, (_, i) =>
      i < numMissing ? 0.5 : 0.01,
    ),
    obsHetRate: Float64Array.from(individuals, () => 0.3),
  };
}

/** The individuals kept of `p`, made by `individualsKept`. */
function keptOf(p: Project, stats: IndividualStats | null): IndividualsKept {
  const kept = individualsKept(p, stats);
  if (kept === null) {
    throw new Error("the individuals kept of the test cannot be made");
  }
  return kept;
}

describe("IP6 D4 keptNeeds, the PCoA's limit on the individuals kept", () => {
  const keptNeeds = pca.keptNeeds;
  if (keptNeeds === undefined) {
    throw new Error("the PCA has keptNeeds");
  }
  const many = individualsOf(9382);
  const pcoa: Partial<PcaOptions> = { method: "pcoa" };

  test("the PCoA of 9,382 individuals with no filter, the list null: the words that offer the filters of individuals; the PCA null", () => {
    const p = project({
      individuals: many,
      individualsFile: "none",
      options: pcoa,
    });
    const kept = keptOf(p, null);
    expect(kept.list).toEqual({ kind: "known", individuals: null });
    expect(keptNeeds(p, kept)).toBe(
      "panel.nei has 9,382 individuals, and the principal coordinates of more than 9,381 need more memory than a browser tab can hold. Keep at most 9,381 with the filters of individuals in the Variants step, or calculate them with popnei in Python, outside the browser.",
    );
    const ofPca = project({ individuals: many, individualsFile: "none" });
    expect(keptNeeds(ofPca, keptOf(ofPca, null))).toBeNull();
  });

  test("a list that keeps 9,381 of them: null, for the PCoA and the PCA", () => {
    for (const options of [pcoa, {}]) {
      const p = project({
        individuals: many,
        individualsFile: "none",
        options,
        individualFilters: [{ kind: "remove", individuals: ["s000"] }],
      });
      expect(keptNeeds(p, keptOf(p, null))).toBeNull();
    }
  });

  test("a file of 9,400 with a threshold that keeps 9,390: the words with the individuals kept; the PCA null", () => {
    const big = individualsOf(9400);
    const setting: Setting = {
      individuals: big,
      individualsFile: "none",
      variantsName: "big.vcf",
      readOptions: { ploidy: 2, onlyPassed: true },
      individualFilters: [{ kind: "missing_data", maxAllowedMissingRate: 0.2 }],
    };
    const p = project({ ...setting, options: pcoa });
    const kept = keptOf(p, statsOf(big, 10));
    expect(
      kept.list.kind === "known" ? kept.list.individuals?.length : null,
    ).toBe(9390);
    expect(keptNeeds(p, kept)).toBe(
      "big.vcf has 9,400 individuals and the filters of individuals keep 9,390 of them, and the principal coordinates of more than 9,381 need more memory than a browser tab can hold. Keep at most 9,381 with the filters of individuals in the Variants step, or calculate them with popnei in Python, outside the browser.",
    );
    const ofPca = project(setting);
    expect(keptNeeds(ofPca, keptOf(ofPca, statsOf(big, 10)))).toBeNull();
  });

  test("the same threshold keeping 100 of the 9,400: null", () => {
    const big = individualsOf(9400);
    const p = project({
      individuals: big,
      individualsFile: "none",
      options: pcoa,
      individualFilters: [{ kind: "missing_data", maxAllowedMissingRate: 0.2 }],
    });
    expect(keptNeeds(p, keptOf(p, statsOf(big, 9300)))).toBeNull();
  });

  test("the store locks the PCoA of 9,382 individuals with its words and sends nothing on a Run", () => {
    const { status, startRun, sent } = storeOf(
      project({ individuals: many, individualsFile: "none", options: pcoa }),
    );
    expect(status("pca")).toEqual({
      kind: "locked",
      reason:
        "panel.nei has 9,382 individuals, and the principal coordinates of more than 9,381 need more memory than a browser tab can hold. Keep at most 9,381 with the filters of individuals in the Variants step, or calculate them with popnei in Python, outside the browser.",
    });
    startRun("pca");
    expect(sent).toEqual([]);
  });
});

/** The words of the options the PCA refuses. */
const OPTIONS_EXPECTED =
  'the method, "pca" or "pcoa"; the missing data filter of the PCA, whether it follows the Variants step, true or false, and its maximum proportion of missing genotypes, a number from 0 to 1; its MAF filter, whether it follows the Variants step, true or false, and its maximum major allele frequency, a number from 0 to 1; its LD filter, whether it follows the Variants step, true or false, its maximum r², a number from 0 to 1, and its window, a whole number of base pairs from 1 to 9,007,199,254,740,991 or null; the column that colours the points, a text or null; three different components from 1 to 10 for the axes; and the view, "3d" or "2d"; and nothing else';

/** The defaults as the options of a project file hold them. */
const DEFAULTS_JSON = {
  method: "pca",
  missingData: { follow: true, maxAllowedMissingRate: 0.1 },
  maf: { follow: true, maxAllowedMaf: 0.95 },
  ld: { follow: true, maxAllowedR2: 0.1, maxDist: null },
  colourBy: null,
  axes: [1, 2, 3],
  view: "3d",
};

describe("IP6 D4 parseOptions", () => {
  test("the defaults come back whole, maxDist null among them, as a new object", () => {
    const options = structuredClone(DEFAULTS_JSON);
    const parsed = pca.parseOptions(options, 1);
    expect(parsed).toEqual({ ok: true, value: DEFAULTS_JSON });
    expect(parsed.ok && parsed.value).not.toBe(options);
    expect(pca.defaults).toEqual(DEFAULTS_JSON);
  });

  test.each([
    ["the method pcoa", { method: "pcoa" }],
    [
      "the PCA's own missing data at 0.05",
      { missingData: { follow: false, maxAllowedMissingRate: 0.05 } },
    ],
    ["the PCA's own MAF at 1", { maf: { follow: false, maxAllowedMaf: 1 } }],
    [
      "the PCA's own LD within 50,000",
      { ld: { follow: false, maxAllowedR2: 0.1, maxDist: 50_000 } },
    ],
    [
      "the PCA's own LD with no distance",
      { ld: { follow: false, maxAllowedR2: 0.1, maxDist: null } },
    ],
    ["the view 2d", { view: "2d" }],
    ["the axes 10, 9 and 1", { axes: [10, 9, 1] }],
    ["a column that colours the points", { colourBy: "altitude" }],
  ])("accepts %s", (_, change) => {
    const options = { ...DEFAULTS_JSON, ...change };
    expect(pca.parseOptions(options, 1)).toEqual({ ok: true, value: options });
  });

  const withoutView = Object.fromEntries(
    Object.entries(DEFAULTS_JSON).filter(([field]) => field !== "view"),
  );
  test.each([
    ["a missing field", withoutView],
    ["a field more", { ...DEFAULTS_JSON, extra: 1 }],
    ["correctByLingoes false", { ...DEFAULTS_JSON, correctByLingoes: false }],
    [
      "maxAllowedMaf of the options before 28 September 2026",
      { ...DEFAULTS_JSON, maxAllowedMaf: 0.95 },
    ],
    [
      "ldPruning of the options before 28 September 2026",
      {
        ...DEFAULTS_JSON,
        ldPruning: { on: true, maxAllowedR2: 0.1, maxDist: null },
      },
    ],
    ["the method tsne", { ...DEFAULTS_JSON, method: "tsne" }],
    [
      "missingData without follow",
      { ...DEFAULTS_JSON, missingData: { maxAllowedMissingRate: 0.1 } },
    ],
    [
      "missingData with follow 1",
      {
        ...DEFAULTS_JSON,
        missingData: { follow: 1, maxAllowedMissingRate: 0.1 },
      },
    ],
    [
      "maxAllowedMissingRate 1.5",
      {
        ...DEFAULTS_JSON,
        missingData: { follow: false, maxAllowedMissingRate: 1.5 },
      },
    ],
    ["maf null", { ...DEFAULTS_JSON, maf: null }],
    [
      "ld without maxDist",
      { ...DEFAULTS_JSON, ld: { follow: true, maxAllowedR2: 0.1 } },
    ],
    [
      "maxDist 0",
      {
        ...DEFAULTS_JSON,
        ld: { follow: false, maxAllowedR2: 0.1, maxDist: 0 },
      },
    ],
    [
      "maxDist 2.5",
      {
        ...DEFAULTS_JSON,
        ld: { follow: false, maxAllowedR2: 0.1, maxDist: 2.5 },
      },
    ],
    [
      "maf with follow 1",
      { ...DEFAULTS_JSON, maf: { follow: 1, maxAllowedMaf: 0.95 } },
    ],
    [
      "maxAllowedMaf 5",
      { ...DEFAULTS_JSON, maf: { follow: false, maxAllowedMaf: 5 } },
    ],
    [
      "ld with follow yes",
      {
        ...DEFAULTS_JSON,
        ld: { follow: "yes", maxAllowedR2: 0.1, maxDist: null },
      },
    ],
    [
      "maxAllowedR2 5",
      {
        ...DEFAULTS_JSON,
        ld: { follow: false, maxAllowedR2: 5, maxDist: 50_000 },
      },
    ],
    ["the axes 1, 1 and 2", { ...DEFAULTS_JSON, axes: [1, 1, 2] }],
    ["the axes 1, 2 and 1", { ...DEFAULTS_JSON, axes: [1, 2, 1] }],
    ["the axes 1, 2 and 11", { ...DEFAULTS_JSON, axes: [1, 2, 11] }],
    ["the view 4d", { ...DEFAULTS_JSON, view: "4d" }],
    ["a colour column that is a number", { ...DEFAULTS_JSON, colourBy: 3 }],
    ["an array", [DEFAULTS_JSON]],
  ])("refuses %s", (_, options) => {
    expect(pca.parseOptions(options, 1)).toEqual({
      ok: false,
      error: OPTIONS_EXPECTED,
    });
  });
});

/** A result of the PCA over `individuals`, with its percentages and,
    for the PCoA, its constant and share of negative eigenvalues; PC1's
    projections are `pc1`, the others 0. */
function result(options: {
  readonly method?: "pca" | "pcoa";
  readonly individuals?: readonly string[];
  readonly percents?: readonly number[];
  readonly pc1?: readonly number[];
  readonly numVarsUsed?: number | null;
  readonly numVars?: number;
  readonly lingoesConstant?: number | null;
  readonly negativeEigenvaluesPercent?: number | null;
  readonly passStats?: PassStats;
}): PcaResult {
  const method = options.method ?? "pca";
  const individuals = options.individuals ?? individualsOf(200);
  const percents = options.percents ?? [3.5, 3.4, 1.9];
  const numComps = percents.length;
  const projections = new Float64Array(individuals.length * numComps);
  for (const [i, value] of (options.pc1 ?? []).entries()) {
    projections[i * numComps] = value;
  }
  return {
    analysis: "pca",
    method,
    individuals,
    numComps,
    numCompsFound: numComps,
    projections,
    explainedVariancePercent: Float64Array.from(percents),
    numVarsUsed:
      options.numVarsUsed === undefined
        ? method === "pca"
          ? 548
          : null
        : options.numVarsUsed,
    lingoesConstant:
      options.lingoesConstant === undefined
        ? method === "pca"
          ? null
          : 0
        : options.lingoesConstant,
    negativeEigenvaluesPercent:
      options.negativeEigenvaluesPercent === undefined
        ? method === "pca"
          ? null
          : 0
        : options.negativeEigenvaluesPercent,
    passStats: options.passStats ?? {
      numVars: options.numVars ?? 548,
      filtering: { missing_data: { varsProcessed: 1200, varsKept: 1200 } },
    },
  };
}

/** The worked example of popnei's `js/popnei/test/pcoa.test.ts`: R's PCoA
    of the ten distances of pyNei's `test_pcoa`, corrected. */
function workedPcoa(corrected: boolean): PcaResult {
  return result({
    method: "pcoa",
    individuals: ["a", "b", "c", "d", "e"],
    percents: [77.1278402980914],
    pc1: [
      -0.431869046368213, -0.283479006142767, -0.269028184151739,
      0.492920681079785, 0.491455555582935,
    ],
    numVars: 1200,
    lingoesConstant: corrected ? 0.0640069399611263 : 0,
    negativeEigenvaluesPercent: corrected ? 7.88262807403034 : 0,
  });
}

describe("IP6 D4 warnings", () => {
  const codes = (r: PcaResult, p: Project): string[] =>
    pca.warnings(r, p, null).map((w) => w.code);

  test("a job with no LD filter gives pruningOff with the words of the PCA", () => {
    expect(
      pca.warnings(result({ numVarsUsed: 1200 }), project(), null),
    ).toEqual([
      {
        code: "pruningOff",
        text: "No LD filter was applied, neither in the Variants step nor for the PCA, so a region of the genome counts once for each of its variants, and a region of many variants in linkage disequilibrium, such as an inversion, can make a component of its own that separates the individuals by that region rather than by their ancestry. Set an LD filter for the PCA in its options above, or for every analysis in the Variants step, unless such regions are what you are looking for.",
      },
    ]);
  });

  test("of a PCoA, pruningOff with the words of the PCoA", () => {
    const p = project({ options: { method: "pcoa" } });
    const [warning] = pca.warnings(
      result({ method: "pcoa", numVars: 1200 }),
      p,
      null,
    );
    expect(warning?.code).toBe("pruningOff");
    expect(warning?.text).toContain(
      "neither in the Variants step nor for the PCoA, so",
    );
    expect(warning?.text).toContain(
      "Set an LD filter for the PCoA in its options above, or",
    );
  });

  test("the dataset's LD filter, and the PCA's own, give no pruningOff", () => {
    const r = result({});
    expect(
      codes(r, project({ filters: [MISSING_01, ld(0.3, 10_000)] })),
    ).toEqual([]);
    expect(codes(r, project({ options: ownLd(50_000) }))).toEqual([]);
  });

  test("numVarsUsed 150 for 200 individuals gives fewVariants, and 200 for 200 none", () => {
    const p = project({ options: ownLd(50_000) });
    expect(pca.warnings(result({ numVarsUsed: 150 }), p, null)).toEqual([
      {
        code: "fewVariants",
        text: "The PCA used 150 variants that vary among its 200 individuals, fewer variants than individuals, so each component rests on few variants and can show chance differences as structure. If the dataset has more, loosen the filters of the PCA in its options above, or those of the Variants step that it follows.",
      },
    ]);
    expect(codes(result({ numVarsUsed: 200 }), p)).toEqual([]);
  });

  test("the PCoA counts the variants of its pass for fewVariants", () => {
    const p = project({ options: { method: "pcoa", ...ownLd(50_000) } });
    expect(
      pca.warnings(result({ method: "pcoa", numVars: 150 }), p, null),
    ).toEqual([
      {
        code: "fewVariants",
        text: "The PCoA used 150 variants for its 200 individuals, fewer variants than individuals, so each component rests on few variants and can show chance differences as structure. If the dataset has more, loosen the filters of the PCoA in its options above, or those of the Variants step that it follows.",
      },
    ]);
  });

  test("the worked example of popnei's PCoA, corrected, gives lingoesCorrection with 7.88%, 0.13, 32% and 0.36", () => {
    const p = project({
      individuals: ["a", "b", "c", "d", "e"],
      individualsFile: "none",
      options: { method: "pcoa", ...ownLd(50_000) },
    });
    expect(pca.warnings(workedPcoa(true), p, null)).toEqual([
      {
        code: "lingoesCorrection",
        text: "The Kosman distances between these individuals cannot all be drawn in one space: 7.88% of their variance lies in directions that no space has. So they were corrected, by Lingoes' method, which adds the same amount, here 0.13, to the square of the distance between every two individuals, 32% of the mean of those squares. This moves the closest individuals apart the most: two individuals of the same genotypes are drawn 0.36 apart, and groups look looser than their distances make them. The percentages of the components are of the corrected distances. Compare with the PCA of the genotypes, which needs no correction.",
      },
    ]);
  });

  test("the same result with a constant and a share of 0 gives no warning", () => {
    const p = project({
      individuals: ["a", "b", "c", "d", "e"],
      individualsFile: "none",
      options: { method: "pcoa", ...ownLd(50_000) },
    });
    expect(pca.warnings(workedPcoa(false), p, null)).toEqual([]);
  });

  test("a result of another analysis is a defect", () => {
    expect(() =>
      pca.warnings(
        { analysis: "filterCounts", passStats: { numVars: 0, filtering: {} } },
        project(),
        null,
      ),
    ).toThrow(/^popnei_web defect: the PCA was given a result of filterCounts/);
  });
});

describe("IP6 D4 checkNumbers", () => {
  test("the PCA of the flow, with its own LD filter: the variants of the pass and the first three percentages", () => {
    const r = result({
      percents: [
        3.5476992895181616, 3.402040462155611, 1.8945553874570624, 1.8,
      ],
      numVars: 548,
    });
    expect(pca.checkNumbers(r)).toEqual([
      548, 3.5476992895181616, 3.402040462155611, 1.8945553874570624,
    ]);
    expect(pca.numCheckNumbers(project())).toBe(4);
  });

  test("a result of one component, the two individuals: null for PC2 and PC3", () => {
    const r = result({
      individuals: ["s000", "s001"],
      percents: [100],
      numVars: 613,
      numVarsUsed: 355,
    });
    expect(pca.checkNumbers(r)).toEqual([613, 100, null, null]);
  });
});

/** popnei's refusal of the LD filter over the VCF of three individuals
    whose second variant is at position 10 after one at 30. */
const LD_NOT_SORTED =
  "the variant 2 of the ones the filter by linkage disequilibrium has read, on the chromosome 1, does not come after the one before it, and that filter compares a variant with the ones it kept behind it on its chromosome: it is at the position 10 of its chromosome and the variant before it at the position 30 of the same chromosome; give it a source whose variants come with each chromosome together and in the order of their positions, which `bcftools sort` writes";

/** The same refusal, of a chromosome that had already ended. */
const LD_CAME_BACK =
  "the variant 3 of the ones the filter by linkage disequilibrium has read, on the chromosome 1, does not come after the one before it, and that filter compares a variant with the ones it kept behind it on its chromosome: it is at the position 10 of a chromosome that had already ended, and the variant before it at the position 500 of another chromosome; give it a source whose variants come with each chromosome together and in the order of their positions, which `bcftools sort` writes";

/** The empty pass of popnei's other calculations, which the PCoA gives. */
const EMPTY_PASS =
  "the pass gave no variant: its source gave 1200 and the steps kept none of them, the `missing_data` filter was given 1200 and kept 1152, the `maf` filter was given 1152 and kept 0; a statistic of a pass is calculated over the variants it gives";

describe("IP6 D4 refusalText", () => {
  const vcf = (setting: Setting = {}): Project =>
    project({
      variantsName: "panel.vcf.gz",
      readOptions: { ploidy: 2, onlyPassed: false },
      ...setting,
    });

  test("no variant, with a source counted at 0 variants: the words of a file with no variant", () => {
    expect(
      refusalText(
        "there are no variants to do a PCA with",
        project({ variantsName: "empty.vcf", numVars: 0 }),
        "popgen",
      ),
    ).toBe(
      "empty.vcf has no variants, so there is no variant to do the PCA with. Load another variants file in the Variants step.",
    );
  });

  test("no variant, with a source not counted or of more than 0: the words of the filters of the PCA", () => {
    const words =
      "No variant of panel.nei is left after the filters of the PCA, so there is no variant to do the PCA with. Loosen the filters the PCA has for itself in its options above, or those of the Variants step that it follows; the Count button of the Variants step shows how many each filter of the step keeps.";
    expect(
      refusalText(
        "there are no variants to do a PCA with",
        project(),
        "popgen",
      ),
    ).toBe(words);
    expect(
      refusalText(
        "there are no variants to do a PCA with",
        project({ numVars: 1200 }),
        "popgen",
      ),
    ).toBe(words);
  });

  test("no variant with variance", () => {
    expect(
      refusalText(
        "no variant has more than one dosage among its called genotypes, so none of them varies and there is nothing to do a PCA with",
        project(),
        "popgen",
      ),
    ).toBe(
      "No variant left after the filters varies among the individuals kept, so there is nothing to do the PCA with. This happens with one individual, or a few of one line; keep more individuals with the filters of individuals in the Variants step.",
    );
  });

  test("the LD filter over a file not sorted, the PCA's own: ldOrderText with the LD filter of the PCA", () => {
    expect(
      refusalText(LD_NOT_SORTED, vcf({ options: ownLd(50_000) }), "popgen"),
    ).toBe(
      "The LD filter of the PCA needs the variants of each chromosome together and in the order of their positions, and panel.vcf.gz does not have them so: on chromosome 1, a variant at position 10 comes after one at position 30. Sort the file, with bcftools sort for a VCF, and load it again, or set the LD filter of the PCA back to as in the Variants step.",
    );
  });

  test("the same, the dataset's LD filter, which the PCA follows: the LD filter of the Variants step", () => {
    expect(
      refusalText(
        LD_NOT_SORTED,
        vcf({ filters: [MISSING_01, ld(0.3, 10_000)] }),
        "popgen",
      ),
    ).toBe(
      "The LD pruning of the Variants step needs the variants of each chromosome together and in the order of their positions, and panel.vcf.gz does not have them so: on chromosome 1, a variant at position 10 comes after one at position 30. Sort the file, with bcftools sort for a VCF, and load it again, or turn off the LD pruning in the Variants step.",
    );
  });

  test("the ploidy of tetraploid.vcf.gz read with ploidy 2", () => {
    expect(
      refusalText(
        "line 5 of the VCF, the column of t00: its genotype is of the ploidy 4 and the variants are read with the ploidy 2; popnei does not read a VCF whose genotypes are of different ploidies",
        vcf({ variantsName: "tetraploid.vcf.gz" }),
        "popgen",
      ),
    ).toBe(
      "At line 5 of tetraploid.vcf.gz, the genotype of t00 has 4 alleles, and the file was read with ploidy 2. If every genotype of the file has 4 alleles, set the ploidy of the VCF to 4 in the Variants step and read the file again. A file that mixes ploidies, such as one with the X of males haploid among diploid autosomes, cannot be read in this version.",
    );
  });

  test("the PCoA's pairs with no distance, four pairs and one", () => {
    const pcoa = project({ options: { method: "pcoa" } });
    expect(
      refusalText(
        "4 of the 10 pairs of individuals have no distance, the first of them `a` and `e`, and `s082` is in 3 of them; those pairs were called together at no variant; take that individual out with `filterIndividuals`, or run the PCA of the variants, which gives every individual a projection",
        pcoa,
        "popgen",
      ),
    ).toBe(
      "4 pairs of individuals of panel.nei have no variant called in both, so they have no Kosman distance and the PCoA cannot place them; s082 is in 3 of them. Remove the individuals with many missing genotypes with the filters of individuals in the Variants step, or use the PCA of the genotypes, which places every individual.",
    );
    expect(
      refusalText(
        "1 of the 6 pairs of individuals has no distance, the first of them `s082` and `s090`, and `s082` is in 1 of them; those pairs were called together at no variant; take that individual out with `filterIndividuals`, or run the PCA of the variants, which gives every individual a projection",
        pcoa,
        "popgen",
      ),
    ).toBe(
      "1 pair of individuals of panel.nei has no variant called in both, so it has no Kosman distance and the PCoA cannot place it; s082 is in it. Remove the individuals with many missing genotypes with the filters of individuals in the Variants step, or use the PCA of the genotypes, which places every individual.",
    );
  });

  test("the PCoA of one individual, and of distances all 0", () => {
    const pcoa = project({ options: { method: "pcoa" } });
    expect(
      refusalText(
        "there is 1 individual, and a principal coordinate analysis places 2 at least by the distance of each pair",
        pcoa,
        "popgen",
      ),
    ).toBe(
      "The filters of individuals keep one individual of panel.nei, and the PCoA needs two at least to place them. Keep more individuals with the filters of individuals in the Variants step.",
    );
    expect(
      refusalText(
        "every distance is 0, so the individuals are all at one point and there is nothing to do a PCoA with",
        pcoa,
        "popgen",
      ),
    ).toBe(
      "Every two of the individuals kept have the same alleles at every variant both have called, so their Kosman distances are all 0 and the PCoA has nothing to place. Keep more individuals, or more variants, with the filters of the Variants step.",
    );
  });

  test("the PCoA's empty pass, with variants in the source and without", () => {
    const pcoa = project({ options: { method: "pcoa" } });
    expect(refusalText(EMPTY_PASS, pcoa, "popgen")).toBe(
      "No variant of panel.nei is left after the filters of the PCoA, so there is no variant to do the PCoA with. Loosen the filters the PCoA has for itself in its options above, or those of the Variants step that it follows; the Count button of the Variants step shows how many each filter of the step keeps.",
    );
    expect(
      refusalText(
        "the pass gave no variant and its source holds none: a statistic of a pass is calculated over the variants it gives",
        pcoa,
        "popgen",
      ),
    ).toBe(
      "panel.nei has no variants, so there is no variant to do the PCoA with. Load another variants file in the Variants step.",
    );
  });

  test("the PCA's limit, which the lock prevents, gives the words of the lock", () => {
    expect(
      refusalText(
        "the principal components of 12000 individuals hold about 7 GB, more than the 4 GB of memory wasm can address",
        project(),
        "popgen",
      ),
    ).toBe(limitWords("12,000"));
  });

  test("any other refusal: popnei's sentence without its backquotes", () => {
    expect(
      refusalText(
        "popnei: `numCompsKept` is not an option of `doPcaFromVariants`.",
        project(),
        "popgen",
      ),
    ).toBe(
      "popnei could not calculate the principal components: popnei: numCompsKept is not an option of doPcaFromVariants. Change the settings, or load the variants file again, to run it again.",
    );
  });

  test("a project with no variants file is a defect", () => {
    expect(() =>
      refusalText(
        "anything",
        deepFreeze<Project>({ ...project(), variants: null }),
        "popgen",
      ),
    ).toThrow(
      /^popnei_web defect: refusalText was given a project with no variants file/,
    );
  });
});

describe("IP6 D4 ldOrderText, the words of an LD filter over a file not sorted", () => {
  const vcf = project({
    variantsName: "panel.vcf.gz",
    readOptions: { ploidy: 2, onlyPassed: false },
    filters: [MISSING_01, ld(0.3, 10_000)],
  });

  test("a variant of a chromosome that had already ended, and the diversity's refusal with the LD filter of the Variants step", () => {
    expect(ldOrderText(LD_CAME_BACK, vcf, STEP_LD_FILTER)).toBe(
      "The LD pruning of the Variants step needs the variants of each chromosome together and in the order of their positions, and panel.vcf.gz does not have them so: a variant of chromosome 1, at position 10, comes after a variant of another chromosome, though variants of chromosome 1 came before that one. Sort the file, with bcftools sort for a VCF, and load it again, or turn off the LD pruning in the Variants step.",
    );
    expect(diversityRefusalText(LD_NOT_SORTED, vcf, "popgen", false)).toBe(
      "The LD pruning of the Variants step needs the variants of each chromosome together and in the order of their positions, and panel.vcf.gz does not have them so: on chromosome 1, a variant at position 10 comes after one at position 30. Sort the file, with bcftools sort for a VCF, and load it again, or turn off the LD pruning in the Variants step.",
    );
  });

  test("a message the place cannot be read from, or that numbers the chromosome, gives the words without the place; another message null", () => {
    const withoutPlace =
      "The LD pruning of the Variants step needs the variants of each chromosome together and in the order of their positions, and panel.vcf.gz does not have them so. Sort the file, with bcftools sort for a VCF, and load it again, or turn off the LD pruning in the Variants step.";
    expect(
      ldOrderText(
        "the variant 2 of the ones the filter by linkage disequilibrium has read, and more",
        vcf,
        STEP_LD_FILTER,
      ),
    ).toBe(withoutPlace);
    expect(
      ldOrderText(
        LD_NOT_SORTED.replace(
          "the chromosome 1,",
          "the chromosome numbered 0 in the table of the reader,",
        ),
        vcf,
        STEP_LD_FILTER,
      ),
    ).toBe(withoutPlace);
    expect(ldOrderText(EMPTY_PASS, vcf, STEP_LD_FILTER)).toBeNull();
  });

  test("a chromosome name with a control character is shown escaped", () => {
    expect(
      ldOrderText(
        LD_NOT_SORTED.replace("the chromosome 1,", "the chromosome chr\t1,"),
        vcf,
        STEP_LD_FILTER,
      ),
    ).toContain("on chromosome chr\\t1, a variant at position 10");
  });
});

describe("IP6 D4 crashText", () => {
  test("a PCA of 4,000 individuals gives the words of memory with about 0.8 GB", () => {
    expect(crashText(project(), 4000, "popgen")).toBe(
      "The calculation stopped unexpectedly, perhaps because the principal components of 4,000 individuals, which need about 0.8 GB, did not fit in the memory of this tab; a phone or a tablet gives a tab far less than a computer. Keep fewer individuals with the filters of individuals in the Variants step, close other tabs and run it again, or calculate them with popnei in Python, outside the browser.",
    );
  });

  test("2,264 individuals give the words of memory, and 2,263 those of any calculation", () => {
    expect(crashText(project(), 2264, "popgen")).toContain(
      "perhaps because the principal components of 2,264 individuals, which need about 0.3 GB,",
    );
    expect(crashText(project(), 2263, "popgen")).toBe(
      "The calculation stopped unexpectedly. Run it again. If it stops again, load panel.nei again in the Variants step.",
    );
  });

  test("a PCoA at the same numbers, with the principal coordinates", () => {
    const pcoa = project({ options: { method: "pcoa" } });
    expect(crashText(pcoa, 4000, "popgen")).toContain(
      "perhaps because the principal coordinates of 4,000 individuals, which need about 0.8 GB,",
    );
    expect(crashText(pcoa, 2264, "popgen")).toContain(
      "the principal coordinates of 2,264",
    );
    expect(crashText(pcoa, 2263, "popgen")).toBe(
      "The calculation stopped unexpectedly. Run it again. If it stops again, load panel.nei again in the Variants step.",
    );
  });
});

describe("IP6 D4 statisticsFailedText", () => {
  test("the statistics refused, with the PCA named and then the PCoA", () => {
    const error = { kind: "refused", message: "anything" } as const;
    const failureText = (): string => "unused";
    expect(
      statisticsFailedText(error, project(), failureText, true, "popgen"),
    ).toMatch(
      /^The statistics of each individual, which the thresholds of the individuals need, could not be calculated, so the PCA was not run\. popnei could not calculate the statistics of each individual: anything\./,
    );
    expect(
      statisticsFailedText(
        error,
        project({ options: { method: "pcoa" } }),
        failureText,
        true,
        "popgen",
      ),
    ).toContain("so the PCoA was not run.");
  });

  test("the statistics refused when the PCA's own Run did not wait for them: it cannot run (stop C 4)", () => {
    const error = { kind: "refused", message: "anything" } as const;
    const failureText = (): string => "unused";
    expect(
      statisticsFailedText(error, project(), failureText, false, "popgen"),
    ).toContain("could not be calculated, so the PCA cannot run. popnei");
    expect(
      statisticsFailedText(
        error,
        project({ options: { method: "pcoa" } }),
        failureText,
        false,
        "popgen",
      ),
    ).toContain("so the PCoA cannot run.");
  });
});

describe("IP6 D4 script", () => {
  test("the project of the flow, panel.nei with the PCA's own LD filter, gives the lines of the spec", () => {
    expect(pca.script(project({ options: ownLd(50_000) }))).toBe(
      [
        "# The principal components of the individuals, a PCA of the genotypes,",
        "# over the filters of the Variants step, with the PCA's own LD filter",
        "# in the place of the step's, on a Variants of its own",
        'pca_variants = popnei.open_vars("panel.nei")',
        "pca_variants.filter_by_missing_data(0.1)",
        "pca_variants.filter_by_ld(0.1, 50000)",
        "pca = popnei.do_pca_from_variants(",
        "    pca_variants, transform_to_biallelic=True, num_prin_comps=0",
        ")",
        "print(pca.explained_variance_percent.iloc[:10].to_string())",
        "print(pca.projections.iloc[:, :10].to_string())",
        "",
      ].join("\n"),
    );
  });

  test("the PCoA of a VCF with a filter of individuals and the PCA's own missing data and LD filters", () => {
    const p = project({
      variantsName: "panel.vcf.gz",
      readOptions: { ploidy: 2, onlyPassed: true },
      individualFilters: [{ kind: "remove", individuals: ["s000"] }],
      options: {
        method: "pcoa",
        missingData: { follow: false, maxAllowedMissingRate: 0.05 },
        ...ownLd(50_000),
      },
    });
    expect(pca.script(p)).toBe(
      [
        "# The principal components of the individuals, a PCoA of the Kosman",
        "# distances, over the filters of the Variants step, with the PCoA's own",
        "# missing data and LD filters in the place of the step's, on a Variants",
        "# of its own",
        'pca_variants = popnei.open_vcf("panel.vcf.gz", ploidy=2, only_passed=True)',
        "pca_variants.filter_individuals(individuals_kept)",
        "pca_variants.filter_by_missing_data(0.05)",
        "pca_variants.filter_by_ld(0.1, 50000)",
        "pcoa = popnei.do_pcoa_from_variants(pca_variants, correct_by_lingoes=True)",
        "print(pcoa.explained_variance_percent.iloc[:10].to_string())",
        "print(pcoa.projections.iloc[:, :10].to_string())",
        "print(pcoa.lingoes_constant)",
        "print(pcoa.negative_eigenvalues_percent)",
        "",
      ].join("\n"),
    );
  });

  test("SF1 D3 a VCF read with only_passed False, with the filter of the FILTER column and a filter of individuals: filter_passed first, before the list, where the runner puts it", () => {
    const p = project({
      variantsName: "panel.vcf.gz",
      readOptions: { ploidy: 2, onlyPassed: false },
      filters: [
        { kind: "passed" },
        { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      ],
      individualFilters: [{ kind: "remove", individuals: ["s000"] }],
    });
    expect(pca.script(p).split("\n").slice(2, 6)).toStrictEqual([
      'pca_variants = popnei.open_vcf("panel.vcf.gz", ploidy=2, only_passed=False)',
      "pca_variants.filter_passed()",
      "pca_variants.filter_individuals(individuals_kept)",
      "pca_variants.filter_by_missing_data(0.1)",
    ]);
  });

  test("a VCF read with only_passed False, and the step's missing data, observed heterozygosity and MAF filters that the PCA follows, each in its line with its value", () => {
    const p = project({
      variantsName: "panel.vcf.gz",
      readOptions: { ploidy: 4, onlyPassed: false },
      filters: [
        { kind: "missing_data", maxAllowedMissingRate: 0.2 },
        { kind: "obs_het", maxAllowedObsHet: 0.7 },
        { kind: "maf", maxAllowedMaf: 0.9 },
      ],
    });
    expect(pca.script(p)).toBe(
      [
        "# The principal components of the individuals, a PCA of the genotypes,",
        "# over the filters of the Variants step, on a Variants of its own",
        'pca_variants = popnei.open_vcf("panel.vcf.gz", ploidy=4, only_passed=False)',
        "pca_variants.filter_by_missing_data(0.2)",
        "pca_variants.filter_by_obs_het(0.7)",
        "pca_variants.filter_by_maf(0.9)",
        "pca = popnei.do_pca_from_variants(",
        "    pca_variants, transform_to_biallelic=True, num_prin_comps=0",
        ")",
        "print(pca.explained_variance_percent.iloc[:10].to_string())",
        "print(pca.projections.iloc[:, :10].to_string())",
        "",
      ].join("\n"),
    );
  });

  test("the comment says over the filters of the Variants step alone when the PCA follows every one", () => {
    expect(pca.script(project()).split("\n").slice(0, 2)).toEqual([
      "# The principal components of the individuals, a PCA of the genotypes,",
      "# over the filters of the Variants step, on a Variants of its own",
    ]);
  });
});

describe("IP6 D4 the definition", () => {
  test("the id, the applications, the key version and the filters it reads", () => {
    expect(pca.id).toBe("pca");
    expect(pca.app).toEqual(["popgen", "gwas"]);
    expect(pca.keyVersion).toBe(1);
    expect(pca.filtersRead).toEqual({ variants: false, individuals: true });
  });
});

/** The key of the PCA for `p`, with popnei 0.1.0 unless another version
    is given. */
function keyOfPca(
  p: Project,
  popneiVersion = "0.1.0",
  def: KeyedDef = pca,
): Key {
  return keyOf(def, p, popneiVersion, createKeyMemo());
}

/** `p` with its fields changed by `change`, frozen deeply. */
function changed(p: Project, change: Partial<Project>): Project {
  return deepFreeze<Project>({ ...p, ...change });
}

/** A copy of `p` whose `variants` is a getter that throws, so that a test
    sees any read of it. */
function withVariantsUnreadable(p: Project): Project {
  const copy: Project = { ...p };
  Object.defineProperty(copy, "variants", {
    get(): never {
      throw new Error("keyInputs read p.variants");
    },
  });
  return copy;
}

/** The MAF filter of the Variants step at `maxAllowedMaf`. */
function maf(maxAllowedMaf: number): ProjectVariantFilter {
  return { kind: "maf", maxAllowedMaf };
}

/** The missing data filter of the Variants step at `rate`. */
function missing(rate: number): ProjectVariantFilter {
  return { kind: "missing_data", maxAllowedMissingRate: rate };
}

/** The observed heterozygosity filter of the Variants step at `max`. */
function obsHet(max: number): ProjectVariantFilter {
  return { kind: "obs_het", maxAllowedObsHet: max };
}

/** The PCA's options with every filter its own: missing data 0.02, MAF
    0.98, LD r² 0.1 within 50,000. */
const ALL_OWN: Partial<PcaOptions> = {
  missingData: { follow: false, maxAllowedMissingRate: 0.02 },
  maf: { follow: false, maxAllowedMaf: 0.98 },
  ld: { follow: false, maxAllowedR2: 0.1, maxDist: 50_000 },
};

describe("IP6 D5 the key, the rows of 'What goes into its key'", () => {
  const base = project();
  const baseKey = keyOfPca(base);

  test("a new load of the variants file, the same file included, changes the key", () => {
    const variants = base.variants;
    if (variants === null) {
      throw new Error("the project of the test has a variants file");
    }
    const reloaded = changed(base, {
      variants: { ...variants, fileId: "0123456789abcdef0123456789abcdef" },
    });
    expect(keyOfPca(reloaded)).not.toBe(baseKey);
  });

  test("the ploidy or onlyPassed of a VCF changes the key", () => {
    const vcf = project({ readOptions: { ploidy: 2, onlyPassed: false } });
    const ploidy4 = project({ readOptions: { ploidy: 4, onlyPassed: false } });
    const onlyPassed = project({
      readOptions: { ploidy: 2, onlyPassed: true },
    });
    expect(keyOfPca(ploidy4)).not.toBe(keyOfPca(vcf));
    expect(keyOfPca(onlyPassed)).not.toBe(keyOfPca(vcf));
  });

  test("a filter of the Variants step of a kind the PCA follows, turned on or off, or its threshold, a distance typed included, changes the key", () => {
    const keys = [
      baseKey,
      keyOfPca(project({ filters: [] })),
      keyOfPca(project({ filters: [missing(0.05)] })),
      keyOfPca(project({ filters: [MISSING_01, maf(0.95)] })),
      keyOfPca(project({ filters: [MISSING_01, maf(0.9)] })),
      keyOfPca(project({ filters: [MISSING_01, ld(0.3, null)] })),
      keyOfPca(project({ filters: [MISSING_01, ld(0.3, 20_000)] })),
      keyOfPca(project({ filters: [MISSING_01, ld(0.2, 20_000)] })),
    ];
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("the observed heterozygosity filter of the Variants step changes the key, with every filter of the PCA its own", () => {
    const keys = [
      project({ options: ALL_OWN }),
      project({ options: ALL_OWN, filters: [MISSING_01, obsHet(0.9)] }),
      project({ options: ALL_OWN, filters: [MISSING_01, obsHet(0.8)] }),
    ].map((p) => keyOfPca(p));
    expect(new Set(keys).size).toBe(3);
  });

  test("a filter of individuals, a list or a threshold, changes the key, whether or not it keeps other individuals", () => {
    const keys = [
      baseKey,
      keyOfPca(
        project({
          individualFilters: [
            { kind: "missing_data", maxAllowedMissingRate: 0.2 },
          ],
        }),
      ),
      // With no statistics given, a threshold of 0.25 keeps what 0.2 does.
      keyOfPca(
        project({
          individualFilters: [
            { kind: "missing_data", maxAllowedMissingRate: 0.25 },
          ],
        }),
      ),
      // No individual of the panel is named ind_900, so the list keeps
      // every individual.
      keyOfPca(
        project({
          individualFilters: [{ kind: "remove", individuals: ["ind_900"] }],
        }),
      ),
    ];
    expect(new Set(keys).size).toBe(4);
  });

  test("the method changes the key", () => {
    expect(keyOfPca(project({ options: { method: "pcoa" } }))).not.toBe(
      baseKey,
    );
  });

  test("a filter of the PCA's own set, or set back to as in the Variants step, changes the key when the filters of the job differ", () => {
    const ownLd50 = keyOfPca(project({ options: ownLd(50_000) }));
    const keys = [
      baseKey,
      keyOfPca(
        project({
          options: {
            missingData: { follow: false, maxAllowedMissingRate: 0.05 },
          },
        }),
      ),
      keyOfPca(
        project({ options: { maf: { follow: false, maxAllowedMaf: 0.95 } } }),
      ),
      ownLd50,
    ];
    expect(new Set(keys).size).toBe(4);
    const setBack = project({
      options: { ld: { follow: true, maxAllowedR2: 0.1, maxDist: 50_000 } },
    });
    expect(keyOfPca(setBack)).not.toBe(ownLd50);
    expect(keyOfPca(setBack)).toBe(baseKey);
  });

  test("the value of a filter of the PCA's own, or its r² or distance, changes the key while it is set", () => {
    const keys = [
      ALL_OWN,
      {
        ...ALL_OWN,
        missingData: { follow: false, maxAllowedMissingRate: 0.03 },
      },
      { ...ALL_OWN, maf: { follow: false, maxAllowedMaf: 0.97 } },
      {
        ...ALL_OWN,
        ld: { follow: false, maxAllowedR2: 0.2, maxDist: 50_000 },
      },
      {
        ...ALL_OWN,
        ld: { follow: false, maxAllowedR2: 0.1, maxDist: 20_000 },
      },
    ].map((options) => keyOfPca(project({ options })));
    expect(new Set(keys).size).toBe(5);
  });

  test("a filter of the Variants step of a kind the PCA has of its own leaves the key the same", () => {
    const own = keyOfPca(project({ options: ALL_OWN }));
    const stepFilters = [
      [],
      [missing(0.05)],
      [MISSING_01, maf(0.9)],
      [MISSING_01, ld(0.3, 10_000)],
      [MISSING_01, ld(0.3, null)],
    ];
    for (const filters of stepFilters) {
      expect(keyOfPca(project({ options: ALL_OWN, filters }))).toBe(own);
    }
  });

  test("the values of missingData, maf or ld while they follow the Variants step leave the key the same", () => {
    const kept: Partial<PcaOptions>[] = [
      { missingData: { follow: true, maxAllowedMissingRate: 0.02 } },
      { maf: { follow: true, maxAllowedMaf: 0.5 } },
      { ld: { follow: true, maxAllowedR2: 0.3, maxDist: 50_000 } },
    ];
    for (const options of kept) {
      expect(keyOfPca(project({ options }))).toBe(baseKey);
    }
  });

  test("a filter of the PCA's own set to the value the dataset's already has leaves the key the same", () => {
    const step = [MISSING_01, maf(0.9), ld(0.3, 10_000)];
    const sameValues = project({
      filters: step,
      options: {
        missingData: { follow: false, maxAllowedMissingRate: 0.1 },
        maf: { follow: false, maxAllowedMaf: 0.9 },
        ld: { follow: false, maxAllowedR2: 0.3, maxDist: 10_000 },
      },
    });
    expect(keyOfPca(sameValues)).toBe(keyOfPca(project({ filters: step })));
  });

  test("colourBy, the axes and the view leave the key the same", () => {
    const drawn: Partial<PcaOptions>[] = [
      { colourBy: "pop" },
      { axes: [2, 3, 1] },
      { view: "2d" },
      { colourBy: "pop", axes: [10, 9, 1], view: "2d" },
    ];
    for (const options of drawn) {
      expect(keyOfPca(project({ options }))).toBe(baseKey);
    }
  });

  test("the individuals file, its types and the grouping leave the key the same", () => {
    const individuals = base.individuals;
    if (individuals?.read.kind !== "read") {
      throw new Error("the project of the test has an individuals file read");
    }
    const retyped = changed(base, {
      individuals: {
        ...individuals,
        read: {
          ...individuals.read,
          columns: [{ kind: "identifier" }, { kind: "continuous" }],
        },
      },
    });
    const others = [
      project({ individualsFile: "none", column: null }),
      project({ individualsFile: "pending" }),
      project({ column: null }),
      project({
        individualsFile: {
          columns: ["IID", "pop"],
          rows: individualsOf(200).map((name) => [name, "p9"]),
        },
      }),
      retyped,
    ];
    for (const p of others) {
      expect(keyOfPca(p)).toBe(baseKey);
    }
  });

  test("the options of another analysis, or the reference, leave the key the same", () => {
    const variants = base.variants;
    if (variants === null) {
      throw new Error("the project of the test has a variants file");
    }
    const otherOptions = changed(base, {
      analyses: [
        {
          analysis: "diversity",
          options: { minNumIndividuals: 10, polyThreshold: 0.9 },
        },
      ],
    });
    const referenced = changed(base, {
      reference: {
        variants,
        checks: [
          {
            analysis: "pca",
            numbers: [0.0283, 0.3654],
            keyVersion: 1,
            popneiVersion: "0.1.0",
            appVersion: "0.1.0",
            settings: {
              passedKept: "0".repeat(64),
              passedNotKept: "0".repeat(64),
            },
          },
        ],
      },
    });
    expect(keyOfPca(otherOptions)).toBe(baseKey);
    expect(keyOfPca(referenced)).toBe(baseKey);
  });

  test("the key version, 1, or the version of popnei, changes the key", () => {
    expect(pca.keyVersion).toBe(1);
    const later: KeyedDef = { ...pca, keyVersion: 2 };
    expect(keyOfPca(base, "0.1.0", later)).not.toBe(baseKey);
    expect(keyOfPca(base, "0.2.0")).not.toBe(baseKey);
  });
});

describe("IP6 D5 the key, the cases of 'How it is verified'", () => {
  test("keyInputs of an empty project gives the method and no filter, without reading p.variants", () => {
    const p = withVariantsUnreadable(emptyProject("popgen"));
    expect(pca.keyInputs(p)).toEqual({ method: "pca", filters: [] });
  });

  test("keyInputs gives the method and the filters of the job, the PCA's own LD filter with no distance included, without reading p.variants", () => {
    const p = withVariantsUnreadable(project({ options: ownLd(null) }));
    expect(pca.keyInputs(p)).toEqual({
      method: "pca",
      filters: [MISSING_01, ld(0.1, null)],
    });
  });

  test("a filter of the Variants step that the PCA replaces is not in keyInputs, and the PCA's own is, in the place of its kind", () => {
    const p = project({
      options: ownLd(50_000),
      filters: [MISSING_01, obsHet(0.9), ld(0.3, 10_000)],
    });
    expect(pca.keyInputs(p)).toEqual({
      method: "pca",
      filters: [MISSING_01, obsHet(0.9), ld(0.1, 50_000)],
    });
  });

  test("the PCA's own LD filter with no distance and the LD filter following a dataset that has none give different keys", () => {
    expect(keyOfPca(project({ options: ownLd(null) }))).not.toBe(
      keyOfPca(project()),
    );
  });

  test("the LD filter following the step with no distance, with 50,000, and with 50,000 and r² 0.3 gives one key", () => {
    const keys = [
      { follow: true, maxAllowedR2: 0.1, maxDist: null },
      { follow: true, maxAllowedR2: 0.1, maxDist: 50_000 },
      { follow: true, maxAllowedR2: 0.3, maxDist: 50_000 },
    ].map((ldOption) => keyOfPca(project({ options: { ld: ldOption } })));
    expect(new Set(keys).size).toBe(1);
  });

  test("the LD filter set for the PCA again with 50,000 gives the key of the PCA's own LD filter with 50,000 typed, so its result comes back from the cache", () => {
    const typed = keyOfPca(project({ options: ownLd(50_000) }));
    const following = project({
      options: { ld: { follow: true, maxAllowedR2: 0.1, maxDist: 50_000 } },
    });
    const setAgain = changed(following, {
      analyses: [{ analysis: "pca", options: optionsJson(ownLd(50_000)) }],
    });
    expect(keyOfPca(following)).not.toBe(typed);
    expect(keyOfPca(setAgain)).toBe(typed);
  });

  test("the missing data filter of the step changed from 0.1 to 0.05 keeps the key while the PCA has its own at 0.02, and changes it while the PCA follows", () => {
    const own: Partial<PcaOptions> = {
      missingData: { follow: false, maxAllowedMissingRate: 0.02 },
    };
    expect(keyOfPca(project({ options: own, filters: [missing(0.05)] }))).toBe(
      keyOfPca(project({ options: own, filters: [missing(0.1)] })),
    );
    expect(keyOfPca(project({ filters: [missing(0.05)] }))).not.toBe(
      keyOfPca(project({ filters: [missing(0.1)] })),
    );
  });

  test("the PCA's own missing data at 0.1 over the step's 0.1 gives the key of the PCA that follows", () => {
    const own = project({
      options: { missingData: { follow: false, maxAllowedMissingRate: 0.1 } },
    });
    expect(keyOfPca(own)).toBe(keyOfPca(project()));
  });
});

/** A request the store of `pcaStore` sent: its key, its job, its handle,
    and how many times it was cancelled. */
interface Sent {
  readonly key: string;
  readonly job: Job;
  readonly run: Run<JobResult>;
  readonly cancels: () => number;
}

/** A store of the population genetics application with the PCA among its
    analyses, the project `first` opened, and every request it sends. */
function pcaStore(first: Project): {
  readonly store: ReturnType<typeof createStore<Job, JobResult>>;
  readonly sent: Sent[];
  readonly status: () => AnalysisView<JobResult>["status"];
} {
  const sent: Sent[] = [];
  const store = createStore<Job, JobResult>({
    first: emptyProject("popgen"),
    analyses: [individualChecks, filterCounts, pca, diversity],
    send: (key, job): Run<JobResult> => {
      let cancelled = 0;
      const run: Run<JobResult> = {
        id: sent.length + 1,
        outcome: new Promise<Outcome<JobResult>>(() => undefined),
        cancel: () => {
          cancelled += 1;
        },
      };
      sent.push({ key, job, run, cancels: () => cancelled });
      return run;
    },
    countsOf,
    counts: "filterCounts",
    statistics: { analysis: "individualChecks", of: individualStatsOf },
    write: null,
    appVersion: "0.1.0",
    cacheMaxBytes: 256_000_000,
    maxUndoSteps: 100,
  });
  store.popneiReady("0.1.0");
  store.open(() => first);
  const status = (): AnalysisView<JobResult>["status"] => {
    const view = store.getState().analyses.find((one) => one.id === "pca");
    if (view === undefined) {
      throw new Error("the store has no PCA");
    }
    return view.status;
  };
  return { store, sent, status };
}

/** The last request the store sent, or a failure of the test. */
function lastSent(sent: readonly Sent[]): Sent {
  const last = sent.at(-1);
  if (last === undefined) {
    throw new Error("the store sent no request");
  }
  return last;
}

/** Runs the PCA of the store and ends its request with `r`. */
function runPca(
  made: ReturnType<typeof pcaStore>,
  r: PcaResult = result({}),
): PcaResult {
  made.store.startRun("pca");
  const request = lastSent(made.sent);
  if (request.job.analysis !== "pca") {
    throw new Error(`the Run sent a job of ${request.job.analysis}`);
  }
  made.store.runEnded(request.run.id, {
    kind: "done",
    key: request.key,
    result: r,
  });
  return r;
}

/** The id of the new load of the metadata file. */
const NEW_INDIVIDUALS_ID = "0f0e0d0c0b0a09080706050403020100";

/** The CSV options of the new load. */
const NEW_CSV = {
  encoding: "auto",
  separator: "auto",
  decimal: "auto",
} as const;

/** Loads a new metadata file, `pops2.csv`, over the project of the store. */
function loadNewMetadata(made: ReturnType<typeof pcaStore>): void {
  made.store.apply("a new metadata file was loaded", (p) =>
    loadIndividuals(p, {
      fileId: NEW_INDIVIDUALS_ID,
      name: "pops2.csv",
      csv: NEW_CSV,
    }),
  );
}

/** Records the read of `pops2.csv`, a table of `individuals` whose
    column `pop` is all p9 and whose column `country` is all ES. */
function readNewMetadata(
  made: ReturnType<typeof pcaStore>,
  individuals: readonly string[],
): void {
  made.store.individualsRead(NEW_INDIVIDUALS_ID, NEW_CSV, {
    kind: "read",
    table: {
      columns: ["IID", "pop", "country"],
      rows: individuals.map((name) => [name, "p9", "ES"]),
    },
    columns: [
      { kind: "identifier" },
      { kind: "categorical" },
      { kind: "categorical" },
    ],
    found: {
      encoding: "utf-8",
      separator: ",",
      decimal: ".",
      undecodedLine: null,
    },
  });
}

/** The reason of `pops2.csv` without s000 and s001. */
const LACKING_TWO =
  "2 individuals of panel.nei are not in pops2.csv: s000 and s001. Add them to the file and load it again in the Individuals step.";

describe("IP10 D3 the cases of the PCA in the store", () => {
  test("a new metadata file over a PCA that is done: locked while it is read and in the notice; its read gives the plot back with no calculation and the notice goes", () => {
    const made = pcaStore(project());
    const r = runPca(made);
    const numSent = made.sent.length;
    loadNewMetadata(made);
    expect(made.status()).toEqual({
      kind: "locked",
      reason: "Reading pops2.csv.",
    });
    expect(made.store.getState().notice?.removed).toEqual(["pca"]);
    readNewMetadata(made, individualsOf(200));
    const back = made.status();
    expect(back.kind === "done" && back.result).toBe(r);
    expect(made.sent).toHaveLength(numSent);
    expect(made.store.getState().notice).toBeNull();
  });

  test("a new metadata file that lacks individuals, over a PCA that is done: locked with that reason and in the notice, and an undo of the load brings the plot back", () => {
    const made = pcaStore(project());
    const r = runPca(made);
    loadNewMetadata(made);
    readNewMetadata(made, individualsOf(200).slice(2));
    expect(made.status()).toEqual({ kind: "locked", reason: LACKING_TWO });
    expect(made.store.getState().notice?.removed).toEqual(["pca"]);
    made.store.undo();
    const back = made.status();
    expect(back.kind === "done" && back.result).toBe(r);
  });

  test("a new metadata file loaded while the PCA runs: left behind by the notice; a read that gives the key again lets it go on, and one that lacks individuals leaves it behind, to be stopped unless the load is undone", () => {
    const given = pcaStore(project());
    given.store.startRun("pca");
    const request = lastSent(given.sent);
    loadNewMetadata(given);
    expect(given.status().kind).toBe("locked");
    expect(given.store.getState().notice?.leftBehind).toEqual(["pca"]);
    readNewMetadata(given, individualsOf(200));
    expect(given.status()).toMatchObject({
      kind: "running",
      runId: request.run.id,
    });
    expect(given.store.getState().notice).toBeNull();
    expect(request.cancels()).toBe(0);

    const lacking = pcaStore(project());
    lacking.store.startRun("pca");
    const behind = lastSent(lacking.sent);
    loadNewMetadata(lacking);
    readNewMetadata(lacking, individualsOf(200).slice(2));
    expect(lacking.status()).toEqual({ kind: "locked", reason: LACKING_TWO });
    expect(lacking.store.getState().notice?.leftBehind).toEqual(["pca"]);
    expect(behind.cancels()).toBe(0);
    lacking.store.undo();
    expect(lacking.status()).toMatchObject({
      kind: "running",
      runId: behind.run.id,
    });
    expect(behind.cancels()).toBe(0);

    const closed = pcaStore(project());
    closed.store.startRun("pca");
    const stopped = lastSent(closed.sent);
    loadNewMetadata(closed);
    readNewMetadata(closed, individualsOf(200).slice(2));
    closed.store.dismissNotice();
    expect(stopped.cancels()).toBe(1);
  });

  test("a change of colourBy, the axes or the view while the PCA runs keeps its key: it goes on, with no notice, and its result is drawn when it arrives", () => {
    const made = pcaStore(project());
    made.store.startRun("pca");
    const request = lastSent(made.sent);
    made.store.apply("the colour changed", (p) =>
      setAnalysisOptions(
        p,
        pca,
        optionsJson({ colourBy: "pop", axes: [2, 1, 3], view: "2d" }),
      ),
    );
    expect(made.status()).toMatchObject({
      kind: "running",
      runId: request.run.id,
    });
    expect(made.store.getState().notice).toBeNull();
    const r = result({});
    made.store.runEnded(request.run.id, {
      kind: "done",
      key: request.key,
      result: r,
    });
    const done = made.status();
    expect(done.kind === "done" && done.result).toBe(r);
    expect(request.cancels()).toBe(0);
  });

  test("the method changed: the PCA leaves the screen with the notice, the PCoA needs a Run, and an undo, or the method set back, shows the PCA with no calculation", () => {
    const made = pcaStore(project());
    const r = runPca(made);
    const toPcoa = (p: Project): Project =>
      setAnalysisOptions(p, pca, optionsJson({ method: "pcoa" }));
    made.store.apply("the method changed", toPcoa);
    expect(made.status().kind).toBe("removed");
    expect(made.store.getState().notice?.removed).toEqual(["pca"]);
    const pcoa = runPca(made, result({ method: "pcoa" }));
    expect(lastSent(made.sent).job).toMatchObject({ method: "pcoa" });
    const numSent = made.sent.length;
    made.store.undo();
    const back = made.status();
    expect(back.kind === "done" && back.result).toBe(r);
    made.store.redo();
    const again = made.status();
    expect(again.kind === "done" && again.result).toBe(pcoa);
    made.store.apply("the method changed", (p) =>
      setAnalysisOptions(p, pca, optionsJson({ method: "pca" })),
    );
    const setBack = made.status();
    expect(setBack.kind === "done" && setBack.result).toBe(r);
    expect(made.sent).toHaveLength(numSent);
  });

  test("the LD filter of the Variants step turned off while the PCA follows it: removed with the notice; a Run sends no LD filter and gives pruningOff; an undo brings the plot back", () => {
    const made = pcaStore(project({ filters: [MISSING_01, ld(0.3, 10_000)] }));
    const r = runPca(made);
    made.store.apply("the LD filter was turned off", (p) =>
      turnOffVariantFilter(p, "ld"),
    );
    expect(made.status().kind).toBe("removed");
    expect(made.store.getState().notice?.removed).toEqual(["pca"]);
    runPca(made, result({ numVarsUsed: 1200 }));
    expect(lastSent(made.sent).job).toMatchObject({ filters: [MISSING_01] });
    const without = made.status();
    expect(
      without.kind === "done" && without.warnings.map((w) => w.code),
    ).toEqual(["pruningOff"]);
    made.store.undo();
    const back = made.status();
    expect(back.kind === "done" && back.result).toBe(r);
  });

  test("a filter of the Variants step of a kind the PCA has of its own changed: the plot stays and the notice does not name it", () => {
    const made = pcaStore(project({ options: ALL_OWN }));
    const r = runPca(made);
    made.store.apply("the MAF filter changed", (p) =>
      setVariantFilter(p, maf(0.9)),
    );
    const still = made.status();
    expect(still.kind === "done" && still.result).toBe(r);
    expect(made.store.getState().notice?.removed ?? []).not.toContain("pca");
  });

  test("the PCA's own missing data filter set at the 0.1 of the step: the same key, so the plot stays, and the command is a step of Undo", () => {
    const made = pcaStore(project());
    const r = runPca(made);
    made.store.apply("the missing data filter of the PCA changed", (p) =>
      setAnalysisOptions(
        p,
        pca,
        optionsJson({
          missingData: { follow: false, maxAllowedMissingRate: 0.1 },
        }),
      ),
    );
    const still = made.status();
    expect(still.kind === "done" && still.result).toBe(r);
    expect(made.store.getState().notice).toBeNull();
    expect(made.store.getState().undo).toBe(
      "the missing data filter of the PCA changed",
    );
  });

  test("filters of individuals that keep none: the PCA cannot start, and a Run sends nothing", () => {
    const made = pcaStore(
      project({
        individualFilters: [{ kind: "keep", individuals: [] }],
      }),
    );
    expect(made.status().kind).toBe("locked");
    expect(made.store.startRun("pca")).toBeNull();
    expect(made.sent).toEqual([]);
  });
});

describe("SF2 D4 the PCA reads the filters that apply to the file", () => {
  test("with passed on and a .nei file whose read says keepsPassed false, the job, the key and the script are those of the filters without it", () => {
    const base = project();
    const p = withPassedOn(base, false);
    const { client, jobs } = recordingClient(null);
    pca.run(p, client);
    pca.run(base, client);
    expect(jobs[0]).toEqual(jobs[1]);
    expect(keyOfPca(p)).toBe(keyOfPca(base));
    expect(pca.script(p)).toBe(pca.script(base));
    expect(pca.script(p)).not.toMatch(/filter_passed/);
    const keeping = withPassedOn(base, true);
    expect(keyOfPca(keeping)).not.toBe(keyOfPca(base));
    expect(pca.script(keeping)).toMatch(/pca_variants\.filter_passed\(\)/);
  });
});
