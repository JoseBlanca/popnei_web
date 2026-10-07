/**
 * The tests of the bins of the statistics of each individual, from
 * docs/specs/analyses/individualChecks.md, "The bins of its histograms":
 * popnei's statistics of panel.nei over every variant, with no filter,
 * read from the fixture that
 * e2e/fixtures/make_fixtures.mjs writes with popnei, against the counts
 * and the edges that numpy 2.5.3 gave for `numpy.histogram(values,
 * bins=20)` on the same values, and the rules of a bin on small lists.
 */

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  INDIVIDUAL_BINS,
  binValues,
  binValuesRounded,
  roundedRange,
} from "./histogram.ts";
import type { Bins } from "./histogram.ts";

/** The proportions of missing genotypes and the observed heterozygosity
    of each individual of panel.nei over every variant, with no filter, a
    null of the JSON read back as NaN. */
function panelStats(): {
  readonly missingGtRate: Float64Array;
  readonly obsHetRate: Float64Array;
} {
  const parsed: unknown = JSON.parse(
    readFileSync(
      new URL(
        "../../e2e/fixtures/panel_individual_stats.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("filters" in parsed) ||
    !Array.isArray(parsed.filters) ||
    parsed.filters.length !== 0 ||
    !("missingGtRate" in parsed) ||
    !("obsHetRate" in parsed)
  ) {
    throw new Error("panel_individual_stats.json is not of no filter");
  }
  const numbers = (value: unknown): Float64Array =>
    Float64Array.from(Array.isArray(value) ? value : [], (v: unknown) =>
      typeof v === "number" ? v : NaN,
    );
  return {
    missingGtRate: numbers(parsed.missingGtRate),
    obsHetRate: numbers(parsed.obsHetRate),
  };
}

/** The bins of `values`, which the test asserts are not null. */
function binsOf(values: readonly number[], numBins = INDIVIDUAL_BINS): Bins {
  const bins = binValues(Float64Array.from(values), numBins);
  if (bins === null) {
    throw new Error("the values gave no bins");
  }
  return bins;
}

describe("VS2 D4 the bins of the statistics of each individual", () => {
  test("the proportions of missing genotypes of panel.nei with no filter give numpy's counts and edges", () => {
    const stats = panelStats();
    expect(stats.missingGtRate).toHaveLength(200);
    const bins = binValues(stats.missingGtRate, INDIVIDUAL_BINS);
    expect(bins).not.toBeNull();
    expect(Array.from(bins?.counts ?? [])).toEqual([
      4, 0, 7, 5, 12, 10, 20, 19, 27, 12, 24, 15, 13, 10, 12, 1, 5, 1, 2, 1,
    ]);
    // The same doubles, compared exactly.
    expect(Array.from(bins?.edges ?? [])).toEqual([
      0.0175, 0.018833333333333334, 0.02016666666666667, 0.021500000000000002,
      0.022833333333333334, 0.02416666666666667, 0.025500000000000002,
      0.026833333333333334, 0.028166666666666666, 0.029500000000000002,
      0.030833333333333334, 0.03216666666666667, 0.0335, 0.034833333333333334,
      0.036166666666666666, 0.037500000000000006, 0.03883333333333333,
      0.04016666666666667, 0.0415, 0.042833333333333334, 0.04416666666666667,
    ]);
    expect(bins?.numNaN).toBe(0);
  });

  test("the observed heterozygosities of panel.nei with no filter give numpy's counts and edges", () => {
    const stats = panelStats();
    expect(stats.obsHetRate).toHaveLength(200);
    const bins = binValues(stats.obsHetRate, INDIVIDUAL_BINS);
    expect(bins).not.toBeNull();
    expect(Array.from(bins?.counts ?? [])).toEqual([
      4, 5, 4, 8, 10, 10, 16, 16, 23, 21, 20, 14, 17, 11, 5, 7, 3, 3, 1, 2,
    ]);
    expect(Array.from(bins?.edges ?? [])).toEqual([
      0.32112436115843274, 0.3247233155143042, 0.32832226987017565,
      0.33192122422604714, 0.3355201785819186, 0.33911913293779006,
      0.34271808729366154, 0.34631704164953303, 0.34991599600540446,
      0.35351495036127595, 0.35711390471714743, 0.36071285907301887,
      0.36431181342889035, 0.3679107677847618, 0.37150972214063327,
      0.37510867649650476, 0.3787076308523762, 0.3823065852082477,
      0.38590553956411916, 0.3895044939199906, 0.3931034482758621,
    ]);
    expect(bins?.numNaN).toBe(0);
  });

  test("[0.5, 0.5] gives numpy's edges from 0 to 1, both values in the bin from 0.5", () => {
    const bins = binsOf([0.5, 0.5]);
    expect(Array.from(bins.edges)).toEqual([
      0, 0.05, 0.1, 0.15000000000000002, 0.2, 0.25, 0.30000000000000004,
      0.35000000000000003, 0.4, 0.45, 0.5, 0.55, 0.6000000000000001, 0.65,
      0.7000000000000001, 0.75, 0.8, 0.8500000000000001, 0.9,
      0.9500000000000001, 1,
    ]);
    expect(Array.from(bins.counts)).toEqual([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(bins.numNaN).toBe(0);
  });

  test("a NaN is in no bin and counted apart, and only NaN, or no value, gives no bins", () => {
    const bins = binsOf([0.5, NaN]);
    expect(bins.numNaN).toBe(1);
    expect(Array.from(bins.counts).reduce((sum, count) => sum + count, 0)).toBe(
      1,
    );
    expect(bins.edges[0]).toBe(0);
    expect(bins.edges[INDIVIDUAL_BINS]).toBe(1);
    expect(
      binValues(Float64Array.from([NaN, NaN]), INDIVIDUAL_BINS),
    ).toBeNull();
    expect(binValues(new Float64Array(0), INDIVIDUAL_BINS)).toBeNull();
  });

  test("a value on an inner edge falls in the bin to its right, one just below it to its left, and the largest in the last bin", () => {
    // From 0 to 1 the edge of index 6 is 0.30000000000000004, above 0.3,
    // whose arithmetic guess, 0.3 * 20 = 6, is one bin off; numpy 2.5.3
    // gave these counts.
    const bins = binsOf([0, 0.3, 0.30000000000000004, 0.35, 1]);
    expect(Array.from(bins.counts)).toEqual([
      1, 0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
    ]);
    // From 0.1 to 0.7 the edge of index 8 is 0.33999999999999997, whose
    // arithmetic guess is 7, one bin low; numpy 2.5.3 put it in bin 8.
    const low = binsOf([0.1, 0.33999999999999997, 0.7]);
    expect(low.edges[8]).toBe(0.33999999999999997);
    expect(Array.from(low.counts)).toEqual([
      1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
    ]);
    expect(Array.from(binsOf([0, 1, 2, 3, 4], 4).counts)).toEqual([1, 1, 1, 2]);
  });

  test("a number of bins below 1 or not whole is a defect", () => {
    const values = Float64Array.from([0.1, 0.2]);
    for (const numBins of [0, -1, 2.5, NaN, Infinity]) {
      expect(() => binValues(values, numBins)).toThrow(
        `popnei_web defect: a number of bins of ${String(numBins)}, not a whole number of at least 1.`,
      );
    }
    expect(binValues(values, 1)?.counts).toEqual(Uint32Array.from([2]));
  });

  test("an infinite value, which no statistic of popnei gives, is a defect", () => {
    for (const value of [Infinity, -Infinity]) {
      expect(() =>
        binValues(Float64Array.from([0.1, value, 0.2]), INDIVIDUAL_BINS),
      ).toThrow(`popnei_web defect: a value of ${String(value)} to bin.`);
    }
  });

  test("from 0.336 to 0.8370000000000001 the last edge is the largest value itself, as numpy 2.5.3 gave, and not the arithmetic's 0.8370000000000002", () => {
    // 20 * ((0.8370000000000001 - 0.336) / 20) + 0.336 is
    // 0.8370000000000002, one double above the largest value.
    const bins = binsOf([0.336, 0.5, 0.8370000000000001]);
    expect(Array.from(bins.edges)).toEqual([
      0.336, 0.36105000000000004, 0.38610000000000005, 0.41115,
      0.43620000000000003, 0.46125000000000005, 0.48630000000000007,
      0.5113500000000001, 0.5364000000000001, 0.5614500000000001, 0.5865,
      0.61155, 0.6366, 0.6616500000000001, 0.6867000000000001,
      0.7117500000000001, 0.7368000000000001, 0.7618500000000001,
      0.7869000000000002, 0.8119500000000002, 0.8370000000000001,
    ]);
    expect(Array.from(bins.counts)).toEqual([
      1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
    ]);
  });
});

describe("the bins over a range given, as popgen2.html draws those of the individuals over their range rounded out", () => {
  test("over 0 to 1 the bins are those of numpy.histogram with the range (0, 1), a NaN in no bin", () => {
    const bins = binValues(Float64Array.from([0.25, 0.5, 0.9, NaN]), 4, [0, 1]);
    expect(Array.from(bins?.edges ?? [])).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(Array.from(bins?.counts ?? [])).toEqual([0, 1, 1, 1]);
    expect(bins?.numNaN).toBe(1);
  });

  test("over 0.3 to 0.4 the last edge is 0.4 itself", () => {
    const bins = binValues(Float64Array.from([0.3, 0.35, 0.4]), 2, [0.3, 0.4]);
    expect(Array.from(bins?.edges ?? [])).toEqual([0.3, 0.35, 0.4]);
    expect(Array.from(bins?.counts ?? [])).toEqual([1, 2]);
  });

  test("a value outside the range given, or a range that does not go up, is a defect", () => {
    expect(() => binValues(Float64Array.from([0.1, -0.1]), 2, [0, 1])).toThrow(
      "popnei_web defect: a value of -0.1 outside the range 0 to 1.",
    );
    expect(() => binValues(Float64Array.from([0.1, 0.6]), 2, [0, 0.5])).toThrow(
      "popnei_web defect: a value of 0.6 outside the range 0 to 0.5.",
    );
    expect(() => binValues(Float64Array.from([0.1]), 2, [0.5, 0.5])).toThrow(
      "popnei_web defect: a range of the bins from 0.5 to 0.5, which does not go up.",
    );
  });
});

describe("the range of an axis rounded out to round numbers", () => {
  test("the variants' ranges of panel.nei and tetraploid.nei, from the edges of popnei's 1,280 bins with a count, at steps of 0.05 at least", () => {
    // The edges of the first and the last bin with a count, popnei 0.2.0
    // under node, 6 October 2026; the missing rate from 0.
    expect(roundedRange(0, 0.08046875, 0.05)).toEqual([0, 0.1]);
    expect(roundedRange(0.5, 0.9875, 0.05)).toEqual([0.5, 1]);
    expect(roundedRange(0.025781250000000002, 0.61328125, 0.05)).toEqual([
      0, 0.7,
    ]);
    expect(roundedRange(0.025781250000000002, 0.5015625, 0.05)).toEqual([
      0, 0.55,
    ]);
    expect(roundedRange(0, 0.25078125, 0.05)).toEqual([0, 0.3]);
    expect(roundedRange(0.3328125, 0.56875, 0.05)).toEqual([0.3, 0.6]);
    expect(roundedRange(0.7265625, 1, 0.05)).toEqual([0.7, 1]);
    expect(roundedRange(0.90234375, 0.97265625, 0.05)).toEqual([0.9, 1]);
  });

  test("the ends are the doubles of the round numbers, not a multiple of the step: 0.3 and not 0.30000000000000004", () => {
    const [first, last] = roundedRange(0.31, 0.69, 0.1);
    expect(first).toBe(0.3);
    expect(last).toBe(0.7);
  });

  test("the individuals' ranges of panel.nei: the missing rate from 0, at steps of 0.001 at least", () => {
    expect(roundedRange(0, 0.04416666666666667, 0.001)).toEqual([0, 0.045]);
    expect(
      roundedRange(0.32112436115843274, 0.3931034482758621, 0.001),
    ).toEqual([0.32, 0.4]);
  });

  test("an end already round stays where it is", () => {
    expect(roundedRange(0, 0.1, 0.05)).toEqual([0, 0.1]);
    expect(roundedRange(0.5, 1, 0.05)).toEqual([0.5, 1]);
  });

  test("a range of one value is a step of 0.1 from it, rounded down, within 0 to 1", () => {
    expect(roundedRange(0, 0, 0.001)).toEqual([0, 0.1]);
    expect(roundedRange(0.35, 0.35, 0.001)).toEqual([0.3, 0.4]);
    expect(roundedRange(0.7, 0.7, 0.001)).toEqual([0.7, 0.8]);
    expect(roundedRange(1, 1, 0.001)).toEqual([0.9, 1]);
  });

  test("ends outside 0 to 1, in the wrong order or not numbers are a defect", () => {
    for (const [low, high] of [
      [-0.1, 0.5],
      [0.5, 1.5],
      [0.6, 0.5],
      [NaN, 0.5],
    ] as const) {
      expect(() => roundedRange(low, high, 0.05)).toThrow(
        `popnei_web defect: a range of ${String(low)} to ${String(high)} to round, not within 0 to 1.`,
      );
    }
  });
});

describe("the bins of the statistics of each individual over their range rounded out", () => {
  test("panel.nei: the missing rate in 20 bins from 0 to 0.045, the heterozygosity from 0.32 to 0.4, every individual in a bin", () => {
    const stats = panelStats();
    const missing = binValuesRounded(
      stats.missingGtRate,
      INDIVIDUAL_BINS,
      true,
    );
    expect(missing?.edges[0]).toBe(0);
    expect(missing?.edges[INDIVIDUAL_BINS]).toBe(0.045);
    const het = binValuesRounded(stats.obsHetRate, INDIVIDUAL_BINS, false);
    expect(het?.edges[0]).toBe(0.32);
    expect(het?.edges[INDIVIDUAL_BINS]).toBe(0.4);
    for (const bins of [missing, het]) {
      expect(Array.from(bins?.counts ?? []).reduce((a, b) => a + b, 0)).toBe(
        200,
      );
    }
  });

  test("a NaN is in no bin, and only NaN gives no bins", () => {
    // From 0.3 to 0.37, 7 steps of 0.01.
    const bins = binValuesRounded(
      Float64Array.from([0.3, NaN, 0.37]),
      2,
      false,
    );
    expect(bins?.edges[0]).toBe(0.3);
    expect(bins?.edges[2]).toBe(0.37);
    expect(Array.from(bins?.counts ?? [])).toEqual([1, 1]);
    expect(bins?.numNaN).toBe(1);
    expect(binValuesRounded(Float64Array.from([NaN]), 2, true)).toBeNull();
  });
});
