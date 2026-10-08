/**
 * Whether a threshold keeps every variant or individual, and the steps
 * of the thresholds (docs/plans/thresholds.md, "The phases", 1;
 * docs/plans/popnei-0.2.2.md, phase 2 and "The owner's first round").
 * The numbers of popnei are
 * those of e2e/fixtures/threshold_counts.json, which make_fixtures.mjs
 * wrote with popnei 0.2.2 under node on 7 October 2026, since the tests of
 * core may not call popnei: the edges and the counts of the 1,000 fine
 * bins that hold their right edge of calcVariantsSummary, the values of
 * each individual of that pass, the variants that popnei's filters keep
 * at 0.05, 0.1, 0.123 and 0.95 and at every edge of the bins but 0, and
 * popnei's count of the values at most each of those edges.
 */
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import { VARIANT_FINE_BINS, VARIANT_RANGE } from "./analyses/variantChecks.ts";
import type { VariantStatistic } from "./analyses/variantChecks.ts";
import { deepFreeze } from "./testSupport.ts";
import {
  VARIANT_THRESHOLD_DECIMALS,
  individualsAllKept,
  thresholdOnStep,
  thresholdStep,
  variantThresholdOnStep,
  variantsAllKept,
} from "./thresholds.ts";
import type { VariantStatsPart } from "../worker/protocol.ts";
import { INSTALLED_POPNEI_VERSION } from "../worker/testSupport.ts";

type FixtureName =
  "panel.vcf.gz" | "low_qual.vcf.gz" | "panel.nei" | "tetraploid.vcf.gz";

/** The four files of the fixture. */
const FIXTURE_NAMES: readonly FixtureName[] = [
  "panel.vcf.gz",
  "low_qual.vcf.gz",
  "panel.nei",
  "tetraploid.vcf.gz",
];

/** The statistics with a filter of popnei, in the order of the fixture's
    `filterKept`. */
type FilteredStatistic = "missingRate" | "maf" | "obsHet";

/** The four statistics of the variants. */
const STATISTICS: readonly VariantStatistic[] = [
  "missingRate",
  "maf",
  "obsHet",
  "unbiasedExpHet",
];

/** The numbers of one file of threshold_counts.json. */
interface Fixture {
  readonly part: VariantStatsPart;
  readonly missingGtRate: Float64Array;
  readonly obsHetRate: Float64Array;
  /** The variants each filter keeps at `THRESHOLDS`, in their order. */
  readonly filterKept: Readonly<Record<FilteredStatistic, readonly number[]>>;
  /** The variants each filter keeps at k / 1,000, k from 1 to 1,000. */
  readonly filterKeptAtEdges: Readonly<
    Record<FilteredStatistic, readonly number[]>
  >;
  /** The variants whose value is at most k / 1,000, k from 1 to 1,000,
      by popnei's histogram of one bin over 0 to it. */
  readonly histKeptAtEdges: Readonly<
    Record<VariantStatistic, readonly number[]>
  >;
}

/** The thresholds of popnei's filters in the fixture. */
const THRESHOLDS = [0.05, 0.1, 0.123, 0.95] as const;

const parsed: unknown = JSON.parse(
  readFileSync(
    new URL("../../e2e/fixtures/threshold_counts.json", import.meta.url),
    "utf8",
  ),
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
    throw new Error(`threshold_counts.json has no list ${what}`);
  }
  return value.map((one: unknown) => (typeof one === "number" ? one : NaN));
}

/** The numbers of `name` in threshold_counts.json. */
function fixture(name: FixtureName): Fixture {
  if (
    field(parsed, "numBins") !== 1000 ||
    field(parsed, "closed") !== "right"
  ) {
    throw new Error(
      "threshold_counts.json is not of 1,000 bins that hold their right edge",
    );
  }
  expect(field(parsed, "thresholds")).toEqual([...THRESHOLDS]);
  // A fixture of another popnei holds numbers the page would not show.
  expect(field(parsed, "popnei")).toBe(INSTALLED_POPNEI_VERSION);
  const file = field(parsed, name);
  const numVars = field(file, "numVars");
  if (typeof numVars !== "number") {
    throw new Error(`threshold_counts.json has no numVars of ${name}`);
  }
  const counts = field(file, "counts");
  const distrib = (statistic: VariantStatistic) => ({
    mean: NaN,
    counts: Uint32Array.from(
      numbersOf(field(counts, statistic), `${name} ${statistic}`),
    ),
  });
  /** The list of `statistic` under `key` of the file. */
  const listOf = (key: string, statistic: VariantStatistic) =>
    numbersOf(
      field(field(file, key), statistic),
      `${name} ${key} ${statistic}`,
    );
  /** The lists of the three filtered statistics under `key`. */
  const filteredOf = (key: string) => ({
    missingRate: listOf(key, "missingRate"),
    maf: listOf(key, "maf"),
    obsHet: listOf(key, "obsHet"),
  });
  return {
    part: {
      binEdges: Float64Array.from(
        numbersOf(field(file, "binEdges"), `${name} binEdges`),
      ),
      missingRate: distrib("missingRate"),
      maf: distrib("maf"),
      obsHet: distrib("obsHet"),
      unbiasedExpHet: distrib("unbiasedExpHet"),
      passStats: { numVars, filtering: {} },
    },
    missingGtRate: Float64Array.from(
      numbersOf(field(file, "missingGtRate"), `${name} missingGtRate`),
    ),
    obsHetRate: Float64Array.from(
      numbersOf(field(file, "obsHetRate"), `${name} obsHetRate`),
    ),
    filterKept: filteredOf("filterKept"),
    filterKeptAtEdges: filteredOf("filterKeptAtEdges"),
    histKeptAtEdges: {
      ...filteredOf("histKeptAtEdges"),
      unbiasedExpHet: listOf("histKeptAtEdges", "unbiasedExpHet"),
    },
  };
}

/** Four bins over 0 to 1 that hold their right edge, with 1, 2, 3 and 4
    variants of the missing rate and the MAF. Its objects are frozen; a
    typed array with elements cannot be. */
const SMALL: VariantStatsPart = Object.freeze({
  binEdges: Float64Array.from([0, 0.25, 0.5, 0.75, 1]),
  missingRate: { mean: 0.5, counts: Uint32Array.from([1, 2, 3, 4]) },
  maf: { mean: 0.5, counts: Uint32Array.from([1, 2, 3, 4]) },
  obsHet: { mean: 0.5, counts: Uint32Array.from([4, 0, 0, 0]) },
  unbiasedExpHet: { mean: 0.5, counts: Uint32Array.from([0, 0, 0, 0]) },
  passStats: deepFreeze({ numVars: 10, filtering: {} }),
});

describe("thresholdStep", () => {
  test.each([
    [0, 1, 0.01, 2],
    [0, 0.1, 0.001, 3],
    [0.32, 0.4, 0.001, 3],
    [0.35, 0.5, 0.01, 2],
    [0, 0.05, 0.001, 3],
    [0.002, 0.004, 0.0001, 4],
    [0.2, 0.30000000000000004, 0.001, 3],
    // Spans a subtraction leaves just above a power of ten: 0.8 − 0.7 is
    // 0.10000000000000009, 0.07 − 0.06 0.010000000000000002.
    [0.7, 0.8, 0.001, 3],
    [0.06, 0.07, 0.0001, 4],
    [0, 10, 0.1, 1],
    [0, 100, 1, 0],
    [0, 1000, 10, 0],
  ])("over %s to %s, %s, %i decimals", (low, high, step, decimals) => {
    expect(thresholdStep(low, high)).toEqual({ step, decimals });
  });

  test("an axis of no span, or not finite, is a defect", () => {
    for (const [low, high] of [
      [0.5, 0.5],
      [1, 0],
      [0, NaN],
      [0, Infinity],
    ] as const) {
      expect(() => thresholdStep(low, high)).toThrow(/popnei_web defect/);
    }
  });
});

describe("thresholdOnStep", () => {
  test.each([
    [0.0734, 2, 0.07],
    [0.075, 2, 0.08],
    [0.145, 2, 0.15],
    [0.1 + 0.2, 2, 0.3],
    [0.0349, 3, 0.035],
    [0.52, 2, 0.52],
    [1, 2, 1],
    [0, 3, 0],
    [1e-7, 3, 0],
  ])("%s with %i decimals is %s", (value, decimals, rounded) => {
    expect(thresholdOnStep(value, decimals)).toBe(rounded);
  });

  test("a value that is NaN or infinite is a defect", () => {
    expect(() => thresholdOnStep(NaN, 2)).toThrow(/popnei_web defect/);
    expect(() => thresholdOnStep(Infinity, 2)).toThrow(/popnei_web defect/);
  });
});

describe("popnei's edges", () => {
  test("the 1,001 edges are the decimals k / 1,000, so every number of up to three decimals from 0 to 1 is one", () => {
    expect(VARIANT_FINE_BINS).toBe(10 ** VARIANT_THRESHOLD_DECIMALS);
    expect(VARIANT_RANGE).toEqual([0, 1]);
    for (const name of FIXTURE_NAMES) {
      const { binEdges } = fixture(name).part;
      expect(binEdges).toHaveLength(1001);
      expect([...binEdges].every((edge, k) => edge === k / 1000)).toBe(true);
      // The edge k is the number of three decimals written k / 1,000.
      expect(
        [...binEdges].every(
          (edge, k) => edge === Number((k / 1000).toFixed(3)),
        ),
      ).toBe(true);
    }
  });
});

describe("variantsAllKept", () => {
  test.each([
    [0.25, false],
    [0.5, false],
    [0.75, false],
    [1, true],
    [1.5, true],
  ])(
    "on SMALL, whose last bin with a count ends at 1, at %s: %s",
    (value, kept) => {
      expect(variantsAllKept(SMALL, "maf", value, null)).toBe(kept);
    },
  );

  test("of the statistic asked for: the observed heterozygosity of SMALL, all in the first bin, is kept whole from its right edge, 0.25", () => {
    expect(variantsAllKept(SMALL, "obsHet", 0.25, null)).toBe(true);
    expect(variantsAllKept(SMALL, "obsHet", 0.2, null)).toBe(false);
  });

  test("with no variant in a bin, any threshold keeps them all", () => {
    expect(variantsAllKept(SMALL, "unbiasedExpHet", 0, null)).toBe(true);
  });

  test("at 0, every variant in the first bin, which holds 0 and the values up to 0.25: kept whole only when the values are spaced wider than the bin, and it holds 0 alone", () => {
    expect(variantsAllKept(SMALL, "obsHet", 0, null)).toBe(false);
    expect(variantsAllKept(SMALL, "obsHet", 0, 0.25)).toBe(false);
    expect(variantsAllKept(SMALL, "obsHet", 0, 0.3)).toBe(true);
    // Not below 0, the first edge.
    expect(variantsAllKept(SMALL, "obsHet", -0.1, 0.3)).toBe(false);
  });

  test("edges fewer than two, or that do not go up, are a defect", () => {
    for (const edges of [[0], [0, 0.5, 0.5, 0.75, 1]]) {
      const part = { ...SMALL, binEdges: Float64Array.from(edges) };
      expect(() => variantsAllKept(part, "maf", 0.75, null)).toThrow(
        /popnei_web defect/,
      );
    }
  });

  test("counts not one fewer than the edges are a defect", () => {
    const part = {
      ...SMALL,
      maf: { mean: 0.5, counts: Uint32Array.from([1, 2, 3]) },
    };
    expect(() => variantsAllKept(part, "maf", 0.25, null)).toThrow(
      /popnei_web defect/,
    );
  });

  test.each(FIXTURE_NAMES)(
    "%s: at every edge from 0.001 to 1, true exactly where popnei counts every variant with a value at most it, and where popnei's filter of the statistic keeps every variant",
    (name) => {
      const { part, filterKeptAtEdges, histKeptAtEdges } = fixture(name);
      for (const statistic of STATISTICS) {
        const all = histKeptAtEdges[statistic].at(-1);
        const told = Array.from({ length: 1000 }, (_, k) =>
          variantsAllKept(part, statistic, (k + 1) / 1000, null),
        );
        expect(told).toEqual(
          histKeptAtEdges[statistic].map((kept) => kept === all),
        );
        if (statistic !== "unbiasedExpHet") {
          expect(told).toEqual(
            filterKeptAtEdges[statistic].map(
              (kept) => kept === filterKeptAtEdges[statistic].at(-1),
            ),
          );
        }
      }
    },
  );

  test("panel.vcf.gz: the missing rate is kept whole from 0.08, the right edge of its last bin with a count, which holds the one variant with 16 of 200 genotypes missing", () => {
    const { part } = fixture("panel.vcf.gz");
    expect(variantsAllKept(part, "missingRate", 0.079, 0.005)).toBe(false);
    expect(variantsAllKept(part, "missingRate", 0.08, 0.005)).toBe(true);
    // Two variants have no missing genotype: 0 keeps those two alone.
    expect(variantsAllKept(part, "missingRate", 0, 0.005)).toBe(false);
  });
});

describe("variantThresholdOnStep", () => {
  test.each([
    [0.123, 3, 0.123],
    [0.12345, 3, 0.123],
    [0.1235, 3, 0.124],
    [0.12345, 4, 0.123],
    [0.12345, 2, 0.12],
    [0.0004, 3, 0],
    [0.0005, 3, 0.001],
    [0, 2, 0],
    [0.004, 2, 0],
    [0.95, 2, 0.95],
    [1, 2, 1],
  ])(
    "%s at %i decimals is %s: three decimals at most, and 0 is a threshold",
    (value, decimals, shown) => {
      expect(variantThresholdOnStep(value, decimals)).toBe(shown);
    },
  );

  test("a value that is NaN or infinite is a defect", () => {
    expect(() => variantThresholdOnStep(NaN, 2)).toThrow(/popnei_web defect/);
    expect(() => variantThresholdOnStep(Infinity, 2)).toThrow(
      /popnei_web defect/,
    );
  });

  test("every number it gives, every 0.0001 from 0 to 1, is an edge of popnei's bins", () => {
    const { binEdges } = fixture("panel.vcf.gz").part;
    for (let units = 0; units <= 10000; units += 1) {
      const shown = variantThresholdOnStep(units / 10000, 3);
      expect(binEdges).toContain(shown);
    }
  });
});

describe("individualsAllKept", () => {
  const values = Float64Array.from([0, 0.1, 0.2, NaN, 0.1]);

  test.each([
    [0, false],
    [0.1, false],
    [0.19, false],
    [0.2, true],
    [5, true],
  ])("at %s: %s, the NaN in neither count", (threshold, kept) => {
    expect(individualsAllKept(values, threshold)).toBe(kept);
  });

  test("every value NaN: true, since it removes none", () => {
    expect(individualsAllKept(Float64Array.from([NaN, NaN]), 0)).toBe(true);
  });

  test("a threshold that is NaN is a defect", () => {
    expect(() => individualsAllKept(values, NaN)).toThrow(/popnei_web defect/);
  });

  test.each(["panel.vcf.gz", "panel.nei"] as const)(
    "%s: popnei's values, a threshold on the largest keeps every one, and one just below does not",
    (name) => {
      const { missingGtRate, obsHetRate } = fixture(name);
      for (const values of [missingGtRate, obsHetRate]) {
        const largest = Math.max(...values);
        expect(individualsAllKept(values, largest)).toBe(true);
        expect(individualsAllKept(values, largest - 1e-9)).toBe(false);
      }
    },
  );
});
