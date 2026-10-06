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

/** Four variants, one missing in every individual: in the bins of the
    missing rate, at 1, and in none of the MAF's, which popnei leaves
    out. */
const VARIANTS: VariantChecksResult = {
  analysis: "variantChecks",
  binEdges: Float64Array.from([0, 0.5, 1]),
  missingRate: { mean: 0.26, counts: Uint32Array.from([3, 1]) },
  maf: { mean: 0.7, counts: Uint32Array.from([0, 3]) },
  obsHet: { mean: 0.3, counts: Uint32Array.from([3, 0]) },
  unbiasedExpHet: { mean: 0.35, counts: Uint32Array.from([3, 0]) },
  passStats: { numVars: 4, filtering: {} },
};

describe("the histograms of the statistics of the open file", () => {
  test("a histogram of the variants is over the variants in its bins, not every variant read", () => {
    expect(variantPlot("missingRate", VARIANTS).countLine).toBe(
      "Over 4 variants",
    );
    const maf = variantPlot("maf", VARIANTS);
    expect(maf.countLine).toBe("Over 3 variants");
    expect(maf.data.title).toBe("Major allele frequency, mean 0.7000");
    expect(maf.data.threshold).toBeNull();
  });

  test("a histogram of the individuals is over those with a value, an individual of NaN said apart, and its bins start at 0", () => {
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
    expect(het.plot?.data.edges[0]).toBe(0);
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
