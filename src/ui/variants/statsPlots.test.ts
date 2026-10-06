import { describe, expect, test } from "vitest";

import type {
  IndividualChecksResult,
  VariantChecksResult,
} from "../../worker/protocol.ts";
import { individualPlot, variantPlot } from "./statsPlots.ts";

/** Three individuals, one with no called genotype: its missing rate is 1,
    and it has no heterozygosity, NaN, as popnei gives it. */
const INDIVIDUALS: IndividualChecksResult = {
  analysis: "individualChecks",
  individuals: ["i1", "i2", "i3"],
  missingGtRate: Float64Array.from([0.02, 0.04, 1]),
  obsHetRate: Float64Array.from([0.3, 0.4, NaN]),
  passStats: { numVars: 4, filtering: {} },
};

/** 40 counts, `count` at each of `at`, as popnei gives bins of 0.025. */
function countsAt(at: Readonly<Record<number, number>>): Uint32Array {
  return Uint32Array.from({ length: 40 }, (_, bin) => at[bin] ?? 0);
}

/** Four variants in 40 bins, one missing in every individual: in the
    bins of the missing rate, at 1, and in none of the MAF's, which popnei
    leaves out; the MAF of the three others in the bin from 0.75. */
const VARIANTS: VariantChecksResult = {
  analysis: "variantChecks",
  binEdges: Float64Array.from({ length: 41 }, (_, i) =>
    i === 40 ? 1 : i * (1 / 40),
  ),
  missingRate: { mean: 0.26, counts: countsAt({ 0: 3, 39: 1 }) },
  maf: { mean: 0.7, counts: countsAt({ 30: 3 }) },
  obsHet: { mean: 0.3, counts: countsAt({ 10: 3 }) },
  unbiasedExpHet: { mean: 0.35, counts: countsAt({ 12: 3 }) },
  passStats: { numVars: 4, filtering: {} },
};

describe("the histograms of the statistics of the open file", () => {
  test("a histogram of the variants is over the variants in its bins, not every variant read, and its title has no mean", () => {
    const missing = variantPlot("missingRate", VARIANTS);
    expect(missing.countLine).toBe("Over 4 variants");
    expect(missing.data.title).toBe("Proportion of missing genotypes");
    const maf = variantPlot("maf", VARIANTS);
    expect(maf.countLine).toBe("Over 3 variants");
    expect(maf.data.title).toBe("Major allele frequency");
    expect(maf.data.threshold).toBeNull();
  });

  test("live-stats 2 a histogram of a result so far says so in its line, and draws the same bins", () => {
    const soFar = variantPlot("maf", VARIANTS, true);
    expect(soFar.countLine).toBe("Over 3 variants so far");
    expect(soFar.data).toEqual(variantPlot("maf", VARIANTS).data);
    const het = individualPlot("observedHeterozygosity", INDIVIDUALS, true);
    expect(het.plot?.countLine).toMatch(/ so far$/u);
  });

  test("the axis of a histogram of the variants spans the bins with a count rounded out to steps of 0.05, the missing rate from 0", () => {
    const missing = variantPlot("missingRate", VARIANTS).data;
    expect([missing.edges[0], missing.edges.at(-1)]).toEqual([0, 1]);
    const maf = variantPlot("maf", VARIANTS).data;
    expect(Array.from(maf.edges)).toEqual([0.75, 0.775, 0.8]);
    expect(Array.from(maf.counts)).toEqual([3, 0]);
    const het = variantPlot("obsHet", VARIANTS).data;
    expect([het.edges[0], het.edges.at(-1)]).toEqual([0.25, 0.3]);
  });

  test("a histogram of the individuals is over those with a value, an individual of NaN said apart, its bins over the range of the values rounded out, the missing rate from 0", () => {
    const missing = individualPlot("missingGenotypes", INDIVIDUALS);
    expect(missing.plot?.countLine).toBe("Over 3 individuals");
    expect(missing.noValueLine).toBeNull();
    expect(missing.plot?.data.edges[0]).toBe(0);
    expect(missing.plot?.data.edges.at(-1)).toBe(1);

    const het = individualPlot("observedHeterozygosity", INDIVIDUALS);
    expect(het.plot?.countLine).toBe("Over 2 individuals");
    expect(het.noValueLine).toBe(
      "1 individual with no called genotype is not in the histogram.",
    );
    expect(het.plot?.data.edges[0]).toBe(0.3);
    expect(het.plot?.data.edges.at(-1)).toBe(0.4);
    expect(het.plot?.data.title).toBe(
      "Observed heterozygosity of each individual",
    );
  });

  test("with no individual of a value, no histogram, and the line that says so", () => {
    const het = individualPlot("observedHeterozygosity", {
      ...INDIVIDUALS,
      obsHetRate: Float64Array.from([NaN, NaN, NaN]),
    });
    expect(het.plot).toBeNull();
    expect(het.noValueLine).toBe(
      "3 individuals with no called genotype are not in the histogram.",
    );
  });
});
