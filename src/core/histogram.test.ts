/**
 * The tests of the bins of the statistics of each individual, from
 * docs/specs/analyses/individualChecks.md, "The bins of its histograms":
 * popnei's statistics of panel.nei at 0.05, read from the fixture that
 * e2e/fixtures/make_fixtures.mjs writes with popnei, against the counts
 * and the edges that numpy 2.5.3 gave for `numpy.histogram(values,
 * bins=20)` on the same values, and the rules of a bin on small lists.
 */

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { INDIVIDUAL_BINS, binValues } from "./histogram.ts";
import type { Bins } from "./histogram.ts";

/** The proportions of missing genotypes and the observed heterozygosity
    of each individual of panel.nei at 0.05, a null of the JSON read back
    as NaN. */
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
    !("maxAllowedMissingRate" in parsed) ||
    parsed.maxAllowedMissingRate !== 0.05 ||
    !("missingGtRate" in parsed) ||
    !("obsHetRate" in parsed)
  ) {
    throw new Error("panel_individual_stats.json is not of the filter at 0.05");
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
  test("the proportions of missing genotypes of panel.nei at 0.05 give numpy's counts and edges", () => {
    const stats = panelStats();
    expect(stats.missingGtRate).toHaveLength(200);
    const bins = binValues(stats.missingGtRate, INDIVIDUAL_BINS);
    expect(bins).not.toBeNull();
    expect(Array.from(bins?.counts ?? [])).toEqual([
      3, 4, 2, 7, 8, 20, 17, 27, 17, 20, 23, 12, 15, 6, 12, 1, 1, 3, 0, 2,
    ]);
    // The same doubles, compared exactly.
    expect(Array.from(bins?.edges ?? [])).toEqual([
      0.016493055555555556, 0.017838541666666666, 0.01918402777777778,
      0.02052951388888889, 0.021875, 0.023220486111111112, 0.02456597222222222,
      0.02591145833333333, 0.027256944444444445, 0.028602430555555558,
      0.029947916666666668, 0.03129340277777778, 0.032638888888888884,
      0.033984375, 0.03532986111111111, 0.036675347222222224,
      0.03802083333333334, 0.03936631944444444, 0.04071180555555556,
      0.04205729166666666, 0.043402777777777776,
    ]);
    expect(bins?.numNaN).toBe(0);
  });

  test("the observed heterozygosities of panel.nei at 0.05 give numpy's counts and edges", () => {
    const stats = panelStats();
    expect(stats.obsHetRate).toHaveLength(200);
    const bins = binValues(stats.obsHetRate, INDIVIDUAL_BINS);
    expect(bins).not.toBeNull();
    expect(Array.from(bins?.counts ?? [])).toEqual([
      3, 3, 3, 10, 8, 13, 18, 18, 22, 19, 22, 18, 16, 8, 8, 3, 2, 4, 0, 2,
    ]);
    expect(Array.from(bins?.edges ?? [])).toEqual([
      0.3176991150442478, 0.3216796301440534, 0.3256601452438589,
      0.32964066034366446, 0.33362117544347, 0.33760169054327555,
      0.3415822056430811, 0.34556272074288663, 0.3495432358426922,
      0.3535237509424977, 0.3575042660423033, 0.3614847811421088,
      0.3654652962419144, 0.36944581134171994, 0.37342632644152546,
      0.37740684154133103, 0.38138735664113654, 0.3853678717409421,
      0.3893483868407477, 0.3933289019405532, 0.39730941704035877,
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
});
