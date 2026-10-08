/**
 * The tests of the check of no variant kept for certain, from
 * docs/specs/analyses/writeVariants.md, "How it is verified", bullet
 * `noVariantForCertain`. The one pass of panel.vcf.gz and low_qual.vcf.gz
 * is read from e2e/fixtures/variants_summary.json, which
 * make_fixtures.mjs --summary wrote with popnei 0.2.2 under node on 8
 * October 2026; the numbers popnei's filters keep, from popnei itself,
 * loaded in node, so that a certain answer where popnei keeps a variant,
 * which would tell the user there is nothing to download when there is,
 * fails here.
 */
import { readFileSync } from "node:fs";

// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- the test checks the answer against what popnei's own filters keep, which no fixture can hold at every edge from 0
import { init, openVcf, version } from "popnei";
import { beforeAll, describe, expect, test } from "vitest";

import { individualsKept } from "./individualsKept.ts";
import type { IndividualStats, IndividualsKept } from "./individualsKept.ts";
import { noVariantForCertain } from "./noVariantKept.ts";
import type { Project, ProjectVariantFilter } from "./project.ts";
import { deepFreeze, sampleProject } from "./testSupport.ts";
import { variantsNoneKept } from "./thresholds.ts";
import type {
  IndividualFilter,
  VariantDistrib,
  VariantStatsPart,
  VariantsSummaryResult,
} from "../worker/protocol.ts";
import { INSTALLED_POPNEI_VERSION } from "../worker/testSupport.ts";

type FixtureName = "panel.vcf.gz" | "low_qual.vcf.gz";

const FIXTURES = new URL("../../e2e/fixtures/", import.meta.url);

const parsed: unknown = JSON.parse(
  readFileSync(new URL("variants_summary.json", FIXTURES), "utf8"),
);

/** The field `key` of `value`, or undefined when it has none. */
function field(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null || !(key in value)) {
    return undefined;
  }
  return Object.getOwnPropertyDescriptor(value, key)?.value;
}

/** The numbers of `value`, a list of numbers and nulls, a null as NaN. */
function numbersOf(value: unknown, what: string): number[] {
  if (!Array.isArray(value)) {
    throw new Error(`variants_summary.json has no list ${what}`);
  }
  return value.map((one: unknown) => (typeof one === "number" ? one : NaN));
}

/** The number `key` of `value`. */
function numberOf(value: unknown, key: string, what: string): number {
  const number = field(value, key);
  if (typeof number !== "number") {
    throw new Error(`variants_summary.json has no number ${what} ${key}`);
  }
  return number;
}

/** The strings of `value`. */
function stringsOf(value: unknown, what: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`variants_summary.json has no list ${what}`);
  }
  return value.map(String);
}

/** The result of the one pass of `name`, as the calculation worker gives
    it, from the fixture. */
function summaryOf(name: FixtureName): VariantsSummaryResult {
  // A fixture of another popnei holds numbers the page would not show.
  expect(field(parsed, "popnei")).toBe(INSTALLED_POPNEI_VERSION);
  const file = field(parsed, name);
  const numVars = numberOf(file, "numVars", name);
  const passStats = { numVars, filtering: {} };
  const distrib = (statistic: string): VariantDistrib => ({
    mean: numberOf(field(file, statistic), "mean", `${name} ${statistic}`),
    counts: Uint32Array.from(
      numbersOf(field(field(file, statistic), "counts"), `${name} counts`),
    ),
  });
  const filterColumn = field(file, "filterColumn");
  // Not frozen deeply: a typed array with elements cannot be frozen.
  return Object.freeze({
    analysis: "variantsSummary",
    chroms: stringsOf(field(file, "chroms"), `${name} chroms`),
    numVarsPerChrom: Uint32Array.from(
      numbersOf(field(file, "numVarsPerChrom"), `${name} numVarsPerChrom`),
    ),
    perVar: {
      binEdges: Float64Array.from(
        numbersOf(field(file, "binEdges"), `${name} binEdges`),
      ),
      missingRate: distrib("missingRate"),
      maf: distrib("maf"),
      obsHet: distrib("obsHet"),
      unbiasedExpHet: distrib("unbiasedExpHet"),
      passStats,
    },
    perIndividual: {
      individuals: stringsOf(field(file, "individuals"), `${name} individuals`),
      missingGtRate: Float64Array.from(
        numbersOf(field(file, "missingGtRate"), `${name} missingGtRate`),
      ),
      obsHetRate: Float64Array.from(
        numbersOf(field(file, "obsHetRate"), `${name} obsHetRate`),
      ),
      passStats,
    },
    passStats,
    filterColumn: {
      passed: numberOf(filterColumn, "passed", name),
      failed: numberOf(filterColumn, "failed", name),
    },
  });
}

const PANEL = summaryOf("panel.vcf.gz");
const LOW_QUAL = summaryOf("low_qual.vcf.gz");

/** The project of popgen2.html with `name` open, as it opens a VCF, with
    every variant and ploidy 2, read with the individuals of `summary`,
    and the filters `filters` and `individualFilters`; frozen deeply. */
function projectOf(
  name: FixtureName,
  summary: VariantsSummaryResult,
  filters: readonly ProjectVariantFilter[],
  individualFilters: readonly IndividualFilter[] = [],
): Project {
  return deepFreeze<Project>({
    ...sampleProject(),
    variants: {
      fileId: "00112233445566778899aabbccddeeff",
      name,
      size: 1024,
      format: "vcf",
      readOptions: { ploidy: 2, onlyPassed: false },
      read: {
        kind: "read",
        individuals: summary.perIndividual.individuals,
        ploidy: 2,
        numVars: summary.passStats.numVars,
        keepsPassed: true,
      },
    },
    filters,
    filtersOff: [],
    individualFilters,
    individualFiltersOff: [],
  });
}

/** The individuals the filters of `p` keep, from the statistics of the
    one pass of `summary`. */
function keptOf(
  p: Project,
  summary: VariantsSummaryResult,
): IndividualsKept | null {
  const stats: IndividualStats = summary.perIndividual;
  return individualsKept(p, stats);
}

/** The answer for the panel with the filters of the variants `filters`
    and those of the individuals `individualFilters`. */
function panelAnswer(
  filters: readonly ProjectVariantFilter[],
  individualFilters: readonly IndividualFilter[] = [],
): boolean {
  const p = projectOf("panel.vcf.gz", PANEL, filters, individualFilters);
  return noVariantForCertain(p, PANEL, keptOf(p, PANEL));
}

const missing = (value: number): ProjectVariantFilter => ({
  kind: "missing_data",
  maxAllowedMissingRate: value,
});
const maf = (value: number): ProjectVariantFilter => ({
  kind: "maf",
  maxAllowedMaf: value,
});
const obsHet = (value: number): ProjectVariantFilter => ({
  kind: "obs_het",
  maxAllowedObsHet: value,
});
const PASSED: ProjectVariantFilter = { kind: "passed" };

describe("DL3 D3 noVariantForCertain over the one pass of panel.vcf.gz", () => {
  test("the observed heterozygosity at 0 and at 0.026 keeps none for certain, the first variant being in the bin of 0.026 to 0.027", () => {
    expect(panelAnswer([obsHet(0)])).toBe(true);
    expect(panelAnswer([obsHet(0.026)])).toBe(true);
  });

  test("the MAF at 0.45 and at 0.499 keeps none for certain, the first variant being in the bin of 0.499 to 0.5", () => {
    expect(panelAnswer([maf(0.45)])).toBe(true);
    expect(panelAnswer([maf(0.499)])).toBe(true);
  });

  test("the missing rate at 0 is not certain, its first bin holding 2 variants that popnei keeps", () => {
    expect(PANEL.perVar.missingRate.counts[0]).toBe(2);
    expect(panelAnswer([missing(0)])).toBe(false);
  });

  test("the observed heterozygosity at 0.027 and the MAF at 0.5 are not certain, where popnei keeps one and three", () => {
    expect(panelAnswer([obsHet(0.027)])).toBe(false);
    expect(panelAnswer([maf(0.5)])).toBe(false);
  });

  test("the missing rate at 0 with the MAF at 0.6, which keep 2 and 277 alone and none together, is not certain", () => {
    expect(panelAnswer([missing(0), maf(0.6)])).toBe(false);
  });

  test("with the missing rate of the individuals at 0.03, which keeps 116 of 200, the observed heterozygosity at 0.01 or 0.02 is not certain", () => {
    const individualFilters: readonly IndividualFilter[] = [
      { kind: "missing_data", maxAllowedMissingRate: 0.03 },
    ];
    const p = projectOf(
      "panel.vcf.gz",
      PANEL,
      [obsHet(0.01)],
      individualFilters,
    );
    const kept = keptOf(p, PANEL);
    expect(
      kept?.list.kind === "known" ? kept.list.individuals?.length : null,
    ).toBe(116);
    expect(panelAnswer([obsHet(0.01)], individualFilters)).toBe(false);
    expect(panelAnswer([obsHet(0.02)], individualFilters)).toBe(false);
  });

  test("a threshold with the individuals kept not known is not certain", () => {
    const p = projectOf("panel.vcf.gz", PANEL, [obsHet(0)]);
    expect(noVariantForCertain(p, PANEL, null)).toBe(false);
    expect(
      noVariantForCertain(p, PANEL, {
        list: { kind: "needsStatistics" },
        byLists: PANEL.perIndividual.individuals,
        counts: [],
      }),
    ).toBe(false);
  });

  test("no filter, and filters that each keep some, are not certain", () => {
    expect(panelAnswer([])).toBe(false);
    expect(panelAnswer([missing(0.05), maf(0.95), obsHet(0.5)])).toBe(false);
  });

  test("a threshold that is no edge of the bins is a defect", () => {
    expect(() => panelAnswer([obsHet(0.0265)])).toThrow(/no edge of the bins/);
  });
});

describe("DL3 D3 noVariantForCertain with the filter of the FILTER column", () => {
  /** The panel's pass with no variant that passed its FILTER. */
  const NONE_PASSED: VariantsSummaryResult = Object.freeze({
    ...PANEL,
    filterColumn: { passed: 0, failed: PANEL.passStats.numVars },
  });

  test("over a file none of whose variants passed, the filter keeps none for certain, whatever the individuals", () => {
    const p = projectOf("panel.vcf.gz", NONE_PASSED, [PASSED, missing(0.05)]);
    expect(noVariantForCertain(p, NONE_PASSED, keptOf(p, NONE_PASSED))).toBe(
      true,
    );
    expect(noVariantForCertain(p, NONE_PASSED, null)).toBe(true);
  });

  test("without that filter the same file is not certain", () => {
    const p = projectOf("panel.vcf.gz", NONE_PASSED, [missing(0.05)]);
    expect(noVariantForCertain(p, NONE_PASSED, keptOf(p, NONE_PASSED))).toBe(
      false,
    );
  });

  test("with that filter over a file whose variants do not record their FILTER, which it does not apply to, not certain", () => {
    const base = projectOf("panel.vcf.gz", NONE_PASSED, [PASSED]);
    const variants = base.variants;
    if (variants?.read.kind !== "read") throw new Error("not read");
    const p = deepFreeze<Project>({
      ...base,
      variants: {
        ...variants,
        format: "nei",
        readOptions: null,
        read: { ...variants.read, keepsPassed: false },
      },
    });
    expect(noVariantForCertain(p, NONE_PASSED, keptOf(p, NONE_PASSED))).toBe(
      false,
    );
  });

  test("on low_qual.vcf.gz, 900 of whose 1,200 variants passed, not certain", () => {
    expect(LOW_QUAL.filterColumn).toEqual({ passed: 900, failed: 300 });
    const p = projectOf("low_qual.vcf.gz", LOW_QUAL, [PASSED]);
    expect(noVariantForCertain(p, LOW_QUAL, keptOf(p, LOW_QUAL))).toBe(false);
  });
});

describe("DL3 D3 variantsNoneKept over small bins", () => {
  /** Four bins over 0 to 1 with 0, 2, 0 and 4 variants of the missing
      rate, 3 in the first of the MAF and none of the observed
      heterozygosity. */
  const SMALL: VariantStatsPart = Object.freeze({
    binEdges: Float64Array.from([0, 0.25, 0.5, 0.75, 1]),
    missingRate: { mean: 0.6, counts: Uint32Array.from([0, 2, 0, 4]) },
    maf: { mean: 0.1, counts: Uint32Array.from([3, 0, 0, 0]) },
    obsHet: { mean: NaN, counts: Uint32Array.from([0, 0, 0, 0]) },
    unbiasedExpHet: { mean: NaN, counts: Uint32Array.from([0, 0, 0, 0]) },
    passStats: deepFreeze({ numVars: 6, filtering: {} }),
  });

  test("none kept while the bins up to the threshold are empty, and at 0 while the first bin is", () => {
    expect(variantsNoneKept(SMALL, "missingRate", 0)).toBe(true);
    expect(variantsNoneKept(SMALL, "missingRate", 0.25)).toBe(true);
    expect(variantsNoneKept(SMALL, "missingRate", 0.5)).toBe(false);
    expect(variantsNoneKept(SMALL, "missingRate", 1)).toBe(false);
  });

  test("at 0 a first bin with variants is not none kept, since they may be at 0", () => {
    expect(variantsNoneKept(SMALL, "maf", 0)).toBe(false);
  });

  test("a statistic with no variant in any bin keeps none at any edge", () => {
    expect(variantsNoneKept(SMALL, "obsHet", 0)).toBe(true);
    expect(variantsNoneKept(SMALL, "obsHet", 1)).toBe(true);
  });

  test("a threshold that is no edge, edges that do not go up and counts of another length are defects", () => {
    expect(() => variantsNoneKept(SMALL, "missingRate", 0.3)).toThrow(
      /no edge of the bins/,
    );
    expect(() =>
      variantsNoneKept(
        { ...SMALL, binEdges: Float64Array.from([0, 0.5, 0.5, 0.75, 1]) },
        "missingRate",
        0.75,
      ),
    ).toThrow(/do not go up/);
    expect(() =>
      variantsNoneKept(
        { ...SMALL, missingRate: { mean: 0, counts: Uint32Array.from([0]) } },
        "missingRate",
        0.25,
      ),
    ).toThrow(/bins of missingRate/);
  });
});

/** The bytes of panel.vcf.gz, opened again for each threshold, since
    popnei's filters stay on the `Variants` they are put on. */
const PANEL_BYTES = readFileSync(new URL("panel.vcf.gz", FIXTURES));

/** The variants popnei keeps of panel.vcf.gz, opened as popgen2.html
    opens it, with the filter `filter`: the pass of `iterBlocks` read to
    its end. */
function popneiKeeps(filter: ProjectVariantFilter): number {
  const variants = openVcf(PANEL_BYTES, { ploidy: 2, onlyPassed: false });
  try {
    switch (filter.kind) {
      case "missing_data":
        variants.filterByMissingData(filter.maxAllowedMissingRate);
        break;
      case "maf":
        variants.filterByMaf(filter.maxAllowedMaf);
        break;
      case "obs_het":
        variants.filterByObsHet(filter.maxAllowedObsHet);
        break;
      case "passed":
      case "ld":
        throw new Error("only the thresholds are walked");
    }
    const blocks = variants.iterBlocks({ fields: [] });
    let next = blocks.next();
    while (next.done !== true) next = blocks.next();
    return blocks.passStats.numVars;
  } finally {
    variants.free();
  }
}

describe("DL3 D3 noVariantForCertain against popnei's filters at every edge", () => {
  beforeAll(async () => {
    await init();
    expect(version()).toBe(INSTALLED_POPNEI_VERSION);
  });

  test.each([
    ["missing rate", missing],
    ["MAF", maf],
    ["observed heterozygosity", obsHet],
  ] as const)(
    "the %s, at k / 1,000 from 0 up to the first edge where popnei keeps a variant, is certain exactly where popnei keeps none",
    (_, filterAt) => {
      let k = 0;
      for (; k <= 1000; k += 1) {
        const filter = filterAt(k / 1000);
        const kept = popneiKeeps(filter);
        // Never certain where popnei keeps a variant; and on this file,
        // whose first bins are empty but for the missing rate's, which
        // popnei keeps at 0, certain wherever it keeps none.
        expect(panelAnswer([filter]), `at ${String(k / 1000)}`).toBe(
          kept === 0,
        );
        if (kept > 0) break;
      }
      expect(k).toBeLessThanOrEqual(1000);
    },
    60_000,
  );
});
