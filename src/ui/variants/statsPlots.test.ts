import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import { histogramScales } from "../../charts/histogram.ts";

import type {
  IndividualChecksResult,
  VariantChecksResult,
} from "../../worker/protocol.ts";
import { individualsAtMost, variantsAtMost } from "../../core/thresholds.ts";
import { summaryResult } from "../../core/testSupport.ts";
import { individualPlot, variantPlot } from "./statsPlots.ts";
import { keepsLine } from "./statsWords.ts";
import type { VariantStatsPart } from "../../worker/protocol.ts";

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
  binEdges: Float64Array.from({ length: 41 }, (_, i) => i / 40),
  missingRate: { mean: 0.26, counts: countsAt({ 0: 3, 39: 1 }) },
  maf: { mean: 0.7, counts: countsAt({ 30: 3 }) },
  obsHet: { mean: 0.3, counts: countsAt({ 10: 3 }) },
  unbiasedExpHet: { mean: 0.35, counts: countsAt({ 12: 3 }) },
  passStats: { numVars: 4, filtering: {} },
};

describe("the histograms of the statistics of the open file", () => {
  test("a histogram of the variants counts the variants in its bins, not every variant read; its plot is named by the full title, with no mean, and its box by the short one", () => {
    const missing = variantPlot("missingRate", VARIANTS, false, null);
    expect(missing.threshold.line).toBe("Keeps all 4 variants");
    expect(missing.data.title).toBe("Proportion of missing genotypes");
    expect(missing.threshold.shownLabel).toBe("Missing genotypes\u00a0max:");
    const maf = variantPlot("maf", VARIANTS, false, null);
    expect(maf.threshold.line).toBe("Keeps all 3 variants");
    expect(maf.data.title).toBe("Major allele frequency");
    expect(maf.data.xLabel).toBe("Major allele frequency");
    expect(maf.threshold.shownLabel).toBe("Major allele frequency\u00a0max:");
    expect(variantPlot("obsHet", VARIANTS, false, null).data.xLabel).toBe(
      "Observed heterozygosity",
    );
    // Its threshold, no filter, has no legend, at the top of the axis.
    expect(maf.data.threshold).toEqual({
      value: 0.8,
      legend: null,
    });
  });

  test("live-stats 2 a histogram of a result so far says so in its line, and draws the same bins", () => {
    const soFar = variantPlot("maf", VARIANTS, true, null);
    expect(soFar.threshold.line).toBe("Keeps all 3 variants so far");
    const done = variantPlot("maf", VARIANTS, false, null).data;
    expect({ ...soFar.data, description: "" }).toEqual({
      ...done,
      description: "",
    });
    const het = individualPlot(
      "observedHeterozygosity",
      INDIVIDUALS,
      true,
      null,
    );
    expect(het.plot?.threshold.line).toBe("Keeps all 2 individuals so far");
  });

  test("live-stats 2 the individuals with no called genotype in a result so far are said to have none so far", () => {
    expect(
      individualPlot("observedHeterozygosity", INDIVIDUALS, true, null)
        .noValueLine,
    ).toBe(
      "1 individual with no called genotype so far is not in the histogram, and the threshold neither keeps nor removes it.",
    );
    const twoOfThree = {
      ...INDIVIDUALS,
      obsHetRate: Float64Array.from([0.3, NaN, NaN]),
    };
    expect(
      individualPlot("observedHeterozygosity", twoOfThree, true, null)
        .noValueLine,
    ).toBe(
      "2 individuals with no called genotype so far are not in the histogram, and the threshold neither keeps nor removes them.",
    );
    expect(
      individualPlot("observedHeterozygosity", twoOfThree, false, null)
        .noValueLine,
    ).toBe(
      "2 individuals with no called genotype are not in the histogram, and the threshold neither keeps nor removes them.",
    );
  });

  test("live-stats 2 the description of a plot of a result so far, which a screen reader reads, says it is drawn from the variants read so far", () => {
    const done = variantPlot("missingRate", VARIANTS, false, null).data
      .description;
    expect(done).not.toContain("so far");
    expect(
      variantPlot("missingRate", VARIANTS, true, null).data.description,
    ).toBe(`${done} Drawn from the variants read so far.`);
    const individuals = individualPlot(
      "missingGenotypes",
      INDIVIDUALS,
      false,
      null,
    );
    const soFar = individualPlot("missingGenotypes", INDIVIDUALS, true, null);
    expect(soFar.plot?.data.description).toBe(
      `${individuals.plot?.data.description ?? ""} Drawn from the variants read so far.`,
    );
  });

  test("the axis of a histogram of the variants spans the bins with a count rounded out to steps of 0.05, the missing rate from 0", () => {
    const missing = variantPlot("missingRate", VARIANTS, false, null).data;
    expect([missing.edges[0], missing.edges.at(-1)]).toEqual([0, 1]);
    const maf = variantPlot("maf", VARIANTS, false, null).data;
    expect(Array.from(maf.edges)).toEqual([0.75, 0.775, 0.8]);
    expect(Array.from(maf.counts)).toEqual([3, 0]);
    const het = variantPlot("obsHet", VARIANTS, false, null).data;
    expect([het.edges[0], het.edges.at(-1)]).toEqual([0.25, 0.3]);
  });

  test("a histogram of the individuals is over those with a value, an individual of NaN said apart, its bins over the range of the values rounded out, the missing rate from 0", () => {
    const missing = individualPlot(
      "missingGenotypes",
      INDIVIDUALS,
      false,
      null,
    );
    expect(missing.plot?.threshold.line).toBe("Keeps all 3 individuals");
    expect(missing.plot?.threshold.shownLabel).toBe("Missing GTs\u00a0max:");
    expect(missing.noValueLine).toBeNull();
    expect(missing.plot?.data.edges[0]).toBe(0);
    expect(missing.plot?.data.edges.at(-1)).toBe(1);

    const het = individualPlot(
      "observedHeterozygosity",
      INDIVIDUALS,
      false,
      null,
    );
    expect(het.plot?.threshold.line).toBe("Keeps all 2 individuals");
    expect(het.plot?.threshold.shownLabel).toBe("Obs. het.\u00a0max:");
    expect(het.noValueLine).toBe(
      "1 individual with no called genotype is not in the histogram, and the threshold neither keeps nor removes it.",
    );
    expect(het.plot?.data.edges[0]).toBe(0.3);
    expect(het.plot?.data.edges.at(-1)).toBe(0.4);
    expect(het.plot?.data.title).toBe(
      "Observed heterozygosity of each individual",
    );
  });

  test("with no individual of a value, no histogram, and the line that says so", () => {
    const het = individualPlot(
      "observedHeterozygosity",
      { ...INDIVIDUALS, obsHetRate: Float64Array.from([NaN, NaN, NaN]) },
      false,
      null,
    );
    expect(het.plot).toBeNull();
    expect(het.noValueLine).toBe(
      "3 individuals with no called genotype are not in the histogram.",
    );
  });
});

/** popnei's fine bins and values of each individual of panel.vcf.gz,
    from e2e/fixtures/threshold_counts.json, which make_fixtures.mjs wrote
    with popnei 0.2.2 under node: 1,200 variants of 200 individuals, in
    1,000 fine bins that hold their right edge. */
const THRESHOLD_COUNTS: unknown = JSON.parse(
  readFileSync(
    new URL("../../../e2e/fixtures/threshold_counts.json", import.meta.url),
    "utf8",
  ),
);
const PANEL = partsOf(THRESHOLD_COUNTS, "panel.vcf.gz");

/** The part of the variants and the part of the individuals of the file
    `name` in the fixture `parsed`. */
function partsOf(
  parsed: unknown,
  name: string,
): {
  readonly variants: VariantStatsPart;
  readonly individuals: IndividualChecksResult;
} {
  const file = fieldOf(parsed, name);
  const counts = fieldOf(file, "counts");
  const distrib = (statistic: string) => ({
    mean: NaN,
    counts: Uint32Array.from(numbersOf(fieldOf(counts, statistic))),
  });
  const missingGtRate = Float64Array.from(
    numbersOf(fieldOf(file, "missingGtRate")),
  );
  return {
    variants: {
      binEdges: Float64Array.from(numbersOf(fieldOf(file, "binEdges"))),
      missingRate: distrib("missingRate"),
      maf: distrib("maf"),
      obsHet: distrib("obsHet"),
      unbiasedExpHet: distrib("unbiasedExpHet"),
      passStats: { numVars: 1200, filtering: {} },
    },
    individuals: {
      analysis: "individualChecks",
      individuals: Array.from(missingGtRate, (_, i) => `s${String(i)}`),
      missingGtRate,
      obsHetRate: Float64Array.from(numbersOf(fieldOf(file, "obsHetRate"))),
      passStats: { numVars: 1200, filtering: {} },
    },
  };
}

/** The field `key` of `value`, or `value` itself for the key "". */
function fieldOf(value: unknown, key: string): unknown {
  if (key === "") return value;
  if (typeof value !== "object" || value === null) return undefined;
  return Object.getOwnPropertyDescriptor(value, key)?.value;
}

/** The numbers of a list of the fixture, a null as NaN. */
function numbersOf(value: unknown): number[] {
  if (!Array.isArray(value)) throw new Error("not a list of the fixture");
  return value.map((one: unknown) => (typeof one === "number" ? one : NaN));
}

describe("thresholds round 1 the threshold on each histogram", () => {
  test("at the top of the axis, until the user moves it, it keeps every variant; it moves by the step of its axis, 0.001 on 0 to 0.1", () => {
    // The missing rate of panel.vcf.gz runs to 0.0805, its axis to 0.1.
    const plot = variantPlot("missingRate", PANEL.variants, false, null);
    expect(plot.data.threshold).toEqual({
      value: 0.1,
      legend: null,
    });
    expect(plot.threshold.shown).toBe(0.1);
    expect(plot.threshold.slider).toEqual({
      min: 0,
      max: 0.1,
      step: 0.001,
      value: 0.1,
    });
    expect(plot.threshold.line).toBe("Keeps all 1,200 variants");
    expect(plot.threshold.valueText).toBe("0.1, keeps all 1,200 variants");
    expect(plot.threshold.name).toBe(
      "Missing genotypes\u00a0max: maximum proportion of missing genotypes",
    );
    // The box: from 0 to 1, the arrow keys by the step, a number typed
    // of up to ten decimals, rounded to the step.
    expect(plot.threshold.box).toEqual({
      minValue: 0,
      maxValue: 1,
      step: 0.001,
      decimals: 10,
    });
  });

  test("th4 fix 1: the room of the line of what it keeps is that of its longest form for the variants or the individuals with a value", () => {
    const plot = variantPlot("missingRate", PANEL.variants, false, null);
    expect(plot.threshold.longestLine).toBe(
      "Keeps 1,200 of 1,200 variants so far",
    );
    const individuals = individualPlot(
      "missingGenotypes",
      PANEL.individuals,
      false,
      null,
    ).plot;
    expect(individuals?.threshold.longestLine).toBe(
      "Keeps 200 of 200 individuals so far",
    );
  });

  test("a number below 0.001 committed for the variants is raised to 0.001 with a line, and the individuals' threshold is never raised", () => {
    const plot = variantPlot("missingRate", PANEL.variants, false, null);
    expect(plot.threshold.raisedLine).toBe(
      "Counted as 0.001, the smallest threshold.",
    );
    expect(plot.threshold.raises(0)).toBe(true);
    expect(plot.threshold.onStep(0)).toBe(0.001);
    expect(plot.threshold.raises(0.0004)).toBe(true);
    expect(plot.threshold.raises(0.001)).toBe(false);
    expect(plot.threshold.raises(0.05)).toBe(false);
    const individuals = individualPlot(
      "missingGenotypes",
      PANEL.individuals,
      false,
      null,
    ).plot;
    expect(individuals?.threshold.raisedLine).toBeNull();
    expect(individuals?.threshold.raises(0)).toBe(false);
    expect(individuals?.threshold.onStep(0)).toBe(0);
  });

  test("on an axis of 0 to 0.7, or of 0.45 to 1, the MAF of 0.5 in the bin that ends there, the step is 0.01", () => {
    const het = variantPlot("obsHet", PANEL.variants, false, null);
    const { data } = het;
    expect([data.edges[0], data.edges.at(-1)]).toEqual([0, 0.7]);
    expect(het.threshold.slider.step).toBe(0.01);
    const maf = variantPlot("maf", PANEL.variants, false, null);
    expect([maf.data.edges[0], maf.data.edges.at(-1)]).toEqual([0.45, 1]);
    expect(maf.threshold.slider.step).toBe(0.01);
  });

  test("a number typed is rounded to the step of its axis, shown and counted there", () => {
    const plot = variantPlot(
      "missingRate",
      PANEL.variants,
      false,
      null,
      0.0734,
    );
    expect(plot.threshold.shown).toBe(0.073);
    expect(plot.data.threshold?.value).toBe(0.073);
    expect(plot.threshold.slider.value).toBe(0.073);
    expect(plot.threshold.valueText).toMatch(/^0\.073, keeps /u);
    expect(plot.threshold.onStep(0.0734)).toBe(0.073);
    expect(plot.threshold.onStep(0.07300000000000001)).toBe(0.073);
    const het = variantPlot("obsHet", PANEL.variants, false, null, 0.3349);
    expect(het.threshold.shown).toBe(0.33);
  });

  test("th4 fix 6: the number counted is the number shown, rounded, and not the number typed: a missing rate typed 0.0496 is shown 0.05 and counted 1,152, as popnei's filter at 0.05 keeps", () => {
    // The bins cannot count 0.0496, inside a fine bin.
    expect(() => variantsAtMost(PANEL.variants, "missingRate", 0.0496)).toThrow(
      /popnei_web defect/,
    );
    const plot = variantPlot(
      "missingRate",
      PANEL.variants,
      false,
      null,
      0.0496,
    );
    expect(plot.threshold.shown).toBe(0.05);
    expect(plot.threshold.line).toBe("Keeps 1,152 of 1,200 variants");
  });

  test("a threshold of the variants typed or moved to 0, or below 0.001, is shown and counted at 0.001, the least edge above 0: the bins cannot count the variants at most 0", () => {
    for (const typed of [0, 0.0004]) {
      const plot = variantPlot(
        "missingRate",
        PANEL.variants,
        false,
        null,
        typed,
      );
      expect(plot.threshold.shown).toBe(0.001);
      expect(plot.threshold.line).toBe("Keeps 2 of 1,200 variants");
      expect(plot.threshold.onStep(typed)).toBe(0.001);
    }
    const plot = variantPlot("missingRate", PANEL.variants, false, null);
    // The box takes 0, and the threshold is raised to 0.001.
    expect(plot.threshold.box.minValue).toBe(0);
    // The slider spans the axis, from 0, and its thumb goes to 0.001.
    expect(plot.threshold.slider.min).toBe(0);
    // The individuals' threshold, exact for any number, goes to 0.
    const individuals = individualPlot(
      "missingGenotypes",
      PANEL.individuals,
      false,
      null,
      0,
    ).plot;
    expect(individuals?.threshold.shown).toBe(0);
    expect(individuals?.threshold.box.minValue).toBe(0);
  });

  test("th4 fix 6: an individual typed 0.0349 is shown 0.035 and counted there, with the individuals at 0.035 kept", () => {
    const at = (value: number) =>
      individualsAtMost(PANEL.individuals.missingGtRate, value).kept;
    expect(at(0.035)).toBeGreaterThan(at(0.0349));
    const plot = individualPlot(
      "missingGenotypes",
      PANEL.individuals,
      false,
      null,
      0.0349,
    ).plot;
    expect(plot?.threshold.shown).toBe(0.035);
    expect(plot?.threshold.line).toBe(
      `Keeps ${String(at(0.035))} of 200 individuals`,
    );
  });

  test("th4 fix 12: a number set is shown and counted as set, never rounded again when a result so far widens the axis", () => {
    // The observed heterozygosity's axis runs from 0 to 0.7, by 0.01.
    const plot = variantPlot("obsHet", PANEL.variants, true, 0.035);
    expect(plot.threshold.slider.step).toBe(0.01);
    expect(plot.threshold.shown).toBe(0.035);
    expect(plot.data.threshold?.value).toBe(0.035);
    expect(plot.threshold.slider.value).toBe(0.035);
    expect(plot.threshold.valueText).toMatch(/^0\.035, keeps /u);
    expect(plot.threshold.line).toBe(
      keepsLine(
        variantsAtMost(PANEL.variants, "obsHet", 0.035),
        "variant",
        true,
      ),
    );
    const individual = individualPlot(
      "observedHeterozygosity",
      PANEL.individuals,
      true,
      0.035,
    ).plot;
    expect(individual?.threshold.shown).toBe(0.035);
  });

  test("one number, what popnei's filter keeps: the missing rate at 0.05 keeps 1,152, at 0.07 1,199, at 0.012 81, with no explanation", () => {
    const plot = variantPlot("missingRate", PANEL.variants, false, 0.05);
    expect(plot.threshold.line).toBe("Keeps 1,152 of 1,200 variants");
    expect(plot.threshold.valueText).toBe(
      "0.05, keeps 1,152 of 1,200 variants",
    );
    expect(
      variantPlot("missingRate", PANEL.variants, false, 0.07).threshold.line,
    ).toBe("Keeps 1,199 of 1,200 variants");
    expect(
      variantPlot("missingRate", PANEL.variants, false, 0.012).threshold.line,
    ).toBe("Keeps 81 of 1,200 variants");
  });

  test("the threshold is drawn with no legend and nothing else, of the variants and of the individuals", () => {
    expect(
      variantPlot("missingRate", PANEL.variants, false, 0.05).data.threshold,
    ).toEqual({ value: 0.05, legend: null });
    expect(
      individualPlot("missingGenotypes", PANEL.individuals, false, 0.03).plot
        ?.data.threshold,
    ).toEqual({ value: 0.03, legend: null });
  });

  test("the observed heterozygosity at 0.1 keeps 31 and at 0.3 373, the expected at 0.3 311", () => {
    expect(
      variantPlot("obsHet", PANEL.variants, false, 0.3).threshold.line,
    ).toBe("Keeps 373 of 1,200 variants");
    expect(
      variantPlot("unbiasedExpHet", PANEL.variants, false, 0.3).threshold.line,
    ).toBe("Keeps 311 of 1,200 variants");
    const plot = variantPlot("obsHet", PANEL.variants, false, 0.1);
    expect(plot.threshold.shown).toBe(0.1);
    expect(plot.threshold.line).toBe("Keeps 31 of 1,200 variants");
    expect(plot.threshold.valueText).toBe("0.1, keeps 31 of 1,200 variants");
  });

  test("the slider spans the horizontal axis of the plot, widened as the plot widens it to take a threshold beyond the bins", () => {
    // The axis of the missing rate ends at 0.1; a threshold of 0.5
    // widens it to 0.5, at the step of the bins' axis.
    const plot = variantPlot("missingRate", PANEL.variants, false, 0.5);
    expect(histogramScales(plot.data, 1, 1).x.domain()).toEqual([0, 0.5]);
    expect(plot.threshold.slider).toEqual({
      min: 0,
      max: 0.5,
      step: 0.001,
      value: 0.5,
    });
    // The MAF's axis starts at 0.5: a threshold of 0.25 widens it left.
    const maf = variantPlot("maf", PANEL.variants, false, 0.25);
    const [low, high] = histogramScales(maf.data, 1, 1).x.domain();
    expect(maf.threshold.slider.min).toBe(0.25);
    expect(low).toBe(0.25);
    expect(maf.threshold.slider.max).toBe(high);
    expect(maf.threshold.line).toBe("Keeps 0 of 1,200 variants");
  });

  test("while the pass runs the words say the counts are so far", () => {
    const plot = variantPlot("obsHet", PANEL.variants, true, 0.1);
    expect(plot.threshold.line).toBe("Keeps 31 of 1,200 variants so far");
    expect(plot.threshold.valueText).toBe(
      "0.1, keeps 31 of 1,200 variants so far",
    );
    const individuals = individualPlot(
      "missingGenotypes",
      PANEL.individuals,
      true,
      0.03,
    ).plot;
    expect(individuals?.threshold.line).toBe(
      "Keeps 116 of 200 individuals so far",
    );
    expect(individuals?.threshold.valueText).toBe(
      "0.03, keeps 116 of 200 individuals so far",
    );
  });

  test("the individuals: kept at most the threshold, by the step of their axis, from popnei's value of each", () => {
    const top = individualPlot(
      "missingGenotypes",
      PANEL.individuals,
      false,
      null,
    ).plot;
    // The missing rates run from 0.0175 to 0.0442, the axis from 0 to
    // 0.045, by 0.001.
    expect(top?.threshold.slider).toEqual({
      min: 0,
      max: 0.045,
      step: 0.001,
      value: 0.045,
    });
    expect(top?.threshold.line).toBe("Keeps all 200 individuals");
    expect(top?.threshold.box).toEqual({
      minValue: 0,
      maxValue: 1,
      step: 0.001,
      decimals: 10,
    });
    const at = individualPlot(
      "missingGenotypes",
      PANEL.individuals,
      false,
      0.03,
    ).plot;
    expect(at?.threshold.line).toBe("Keeps 116 of 200 individuals");
    expect(at?.threshold.valueText).toBe("0.03, keeps 116 of 200 individuals");
    expect(at?.threshold.onStep(0.030000000000000002)).toBe(0.03);
    expect(at?.threshold.onStep(0.0304)).toBe(0.03);
    expect(at?.threshold.name).toBe(
      "Missing GTs\u00a0max: maximum proportion of missing genotypes of an individual",
    );
    // A number of four decimals typed is counted at three, the number
    // shown.
    const typed = individualPlot(
      "missingGenotypes",
      PANEL.individuals,
      false,
      null,
      0.0304,
    ).plot;
    expect(typed?.threshold.shown).toBe(0.03);
    expect(typed?.threshold.line).toBe("Keeps 116 of 200 individuals");
  });

  test("an individual with no value is in neither count, and the line under the plot says so", () => {
    const het = individualPlot(
      "observedHeterozygosity",
      INDIVIDUALS,
      false,
      0.35,
    );
    expect(het.plot?.threshold.line).toBe("Keeps 1 of 2 individuals");
    expect(het.plot?.threshold.valueText).toBe(
      "0.35, keeps 1 of 2 individuals",
    );
    expect(het.noValueLine).toBe(
      "1 individual with no called genotype is not in the histogram, and the threshold neither keeps nor removes it.",
    );
  });
});

describe("thresholds round 1 the number shown for a threshold of the variants is the number counted", () => {
  // At each threshold set at an edge of the fine bins from 0.001 to 1, and
  // at 0.05, 0.1, 0.123 and 0.95, the words give the variants popnei's
  // filter of the statistic keeps at it, which make_fixtures.mjs ran under
  // node.
  const filtered = ["missingRate", "maf", "obsHet"] as const;
  const thresholds = numbersOf(fieldOf(THRESHOLD_COUNTS, "thresholds"));
  for (const name of [
    "panel.vcf.gz",
    "low_qual.vcf.gz",
    "panel.nei",
    "tetraploid.vcf.gz",
  ]) {
    test(`on ${name}, the line says what popnei's filter keeps at the threshold set`, () => {
      expect(thresholds).toEqual([0.05, 0.1, 0.123, 0.95]);
      const file = fieldOf(THRESHOLD_COUNTS, name);
      const { variants } = partsOf(THRESHOLD_COUNTS, name);
      let checked = 0;
      for (const statistic of filtered) {
        const withValue = variantsAtMost(variants, statistic, 1).withValue;
        const lineAt = (threshold: number, kept: number): void => {
          const plot = variantPlot(statistic, variants, false, threshold);
          expect(plot.threshold.shown).toBe(threshold);
          expect(plot.threshold.line).toBe(
            keepsLine({ kept, withValue }, "variant"),
          );
          checked += 1;
        };
        const atEdges = numbersOf(
          fieldOf(fieldOf(file, "filterKeptAtEdges"), statistic),
        );
        for (const [k, kept] of atEdges.entries()) {
          lineAt((k + 1) / 1000, kept);
        }
        const atThresholds = numbersOf(
          fieldOf(fieldOf(file, "filterKept"), statistic),
        );
        for (const [i, kept] of atThresholds.entries()) {
          lineAt(thresholds[i] ?? NaN, kept);
        }
      }
      expect(checked).toBe(3 * 1004);
    });
  }
});

describe("the step of a threshold of the variants is never finer than the fine bins", () => {
  test("a file with no missing genotype, every variant in the first fine bin: the axis runs from 0 to 0.05 by 0.001, and every place of the line and number of the box is an edge", () => {
    const clean = summaryResult(["1"], [1200]).perVar;
    for (const statistic of [
      "missingRate",
      "maf",
      "obsHet",
      "unbiasedExpHet",
    ] as const) {
      const plot = variantPlot(statistic, clean, false, null);
      expect(plot.threshold.slider).toEqual({
        min: 0,
        max: 0.05,
        step: 0.001,
        value: 0.05,
      });
      // A number of four decimals typed is counted at three, an edge.
      const typed = variantPlot(statistic, clean, false, null, 0.0123);
      expect(typed.threshold.shown).toBe(0.012);
      expect(typed.threshold.line).toBe("Keeps all 1,200 variants");
      for (let place = 0; place <= 50; place += 1) {
        const shown = plot.threshold.onStep(place / 1000);
        expect(() => variantsAtMost(clean, statistic, shown)).not.toThrow();
      }
    }
  });
});
