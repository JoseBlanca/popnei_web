import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import { histogramScales } from "../../charts/histogram.ts";

import type {
  IndividualChecksResult,
  VariantChecksResult,
} from "../../worker/protocol.ts";
import { summaryResult } from "../../core/testSupport.ts";
import { individualPlot, variantPlot } from "./statsPlots.ts";
import type { PassIndividuals } from "./statsPlots.ts";
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

/** The individuals of VARIANTS, of whose values the bins of 0.025 tell
    no spacing: none. */
const NO_SPACING: PassIndividuals = { numIndividuals: 0, ploidy: 2 };

/** The 200 diploid individuals of panel.vcf.gz. */
const PANEL_INDIVIDUALS: PassIndividuals = { numIndividuals: 200, ploidy: 2 };

describe("the histograms of the statistics of the open file", () => {
  test("a histogram of the variants is over the variants in its bins, not every variant read; its plot is named by the full title, with no mean, and its box by the short one", () => {
    const missing = variantPlot(
      "missingRate",
      VARIANTS,
      NO_SPACING,
      false,
      null,
    );
    expect(missing.data.title).toBe("Proportion of missing genotypes");
    expect(missing.threshold.shownLabel).toBe("Missing genotypes\u00a0max:");
    const maf = variantPlot("maf", VARIANTS, NO_SPACING, false, null);
    expect(maf.data.title).toBe("Major allele frequency");
    expect(maf.data.xLabel).toBe("Major allele frequency");
    expect(maf.threshold.shownLabel).toBe("Major allele frequency\u00a0max:");
    expect(
      variantPlot("obsHet", VARIANTS, NO_SPACING, false, null).data.xLabel,
    ).toBe("Observed heterozygosity");
    // Its threshold, no filter, has no legend, at the top of the axis,
    // where it keeps every variant, and is drawn in grey.
    expect(maf.data.threshold).toEqual({
      value: 0.8,
      legend: null,
      keepsAll: true,
    });
  });

  test("live-stats 2 a histogram of a result so far says so in the words of a threshold that removes nothing, and draws the same bins", () => {
    const soFar = variantPlot("maf", VARIANTS, NO_SPACING, true, null);
    expect(soFar.threshold.valueText).toBe("0.8, keeps every variant so far");
    expect(soFar.threshold.removesNothing).toBe(
      "This threshold removes no variant so far.",
    );
    const done = variantPlot("maf", VARIANTS, NO_SPACING, false, null).data;
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
    expect(het.plot?.threshold.valueText).toBe(
      "0.4, keeps every individual so far",
    );
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
    const done = variantPlot("missingRate", VARIANTS, NO_SPACING, false, null)
      .data.description;
    expect(done).not.toContain("so far");
    expect(
      variantPlot("missingRate", VARIANTS, NO_SPACING, true, null).data
        .description,
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
    const missing = variantPlot(
      "missingRate",
      VARIANTS,
      NO_SPACING,
      false,
      null,
    ).data;
    expect([missing.edges[0], missing.edges.at(-1)]).toEqual([0, 1]);
    const maf = variantPlot("maf", VARIANTS, NO_SPACING, false, null).data;
    expect(Array.from(maf.edges)).toEqual([0.75, 0.775, 0.8]);
    expect(Array.from(maf.counts)).toEqual([3, 0]);
    const het = variantPlot("obsHet", VARIANTS, NO_SPACING, false, null).data;
    expect([het.edges[0], het.edges.at(-1)]).toEqual([0.25, 0.3]);
  });

  test("a histogram of the individuals is over those with a value, an individual of NaN said apart, its bins over the range of the values rounded out, the missing rate from 0", () => {
    const missing = individualPlot(
      "missingGenotypes",
      INDIVIDUALS,
      false,
      null,
    );
    expect(missing.plot?.threshold.keepsAll).toBe(true);
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
    expect(het.plot?.threshold.keepsAll).toBe(true);
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
  test("at the top of the axis, until the user moves it, it keeps every variant and is grey; it moves by the step of its axis, 0.001 on 0 to 0.1", () => {
    // The missing rate of panel.vcf.gz runs to 0.08, its axis to 0.1.
    const plot = variantPlot(
      "missingRate",
      PANEL.variants,
      PANEL_INDIVIDUALS,
      false,
      null,
    );
    expect(plot.data.threshold).toEqual({
      value: 0.1,
      legend: null,
      keepsAll: true,
    });
    expect(plot.threshold.shown).toBe(0.1);
    expect(plot.threshold.slider).toEqual({
      min: 0,
      max: 0.1,
      step: 0.001,
      value: 0.1,
    });
    expect(plot.threshold.keepsAll).toBe(true);
    expect(plot.threshold.valueText).toBe("0.1, keeps every variant");
    expect(plot.threshold.removesNothing).toBe(
      "This threshold removes no variant.",
    );
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

  test("the owner's first round: the missing rate of panel.vcf.gz, multiples of 1 / 200, in 20 bars of 0.005 from 0 to 0.1, with the threshold's step still 0.001", () => {
    const plot = variantPlot(
      "missingRate",
      PANEL.variants,
      PANEL_INDIVIDUALS,
      false,
      0.05,
    );
    expect(plot.data.counts).toHaveLength(20);
    expect(plot.data.edges[1]).toBe(0.005);
    expect(plot.threshold.slider.step).toBe(0.001);
  });

  test("a threshold that removes some is drawn in red and its words are the number alone", () => {
    const plot = variantPlot(
      "missingRate",
      PANEL.variants,
      PANEL_INDIVIDUALS,
      false,
      0.05,
    );
    expect(plot.data.threshold).toEqual({
      value: 0.05,
      legend: null,
      keepsAll: false,
    });
    expect(plot.threshold.keepsAll).toBe(false);
    expect(plot.threshold.valueText).toBe("0.05");
    expect(plot.threshold.removesNothing).toBeNull();
    const individuals = individualPlot(
      "missingGenotypes",
      PANEL.individuals,
      false,
      0.03,
    ).plot;
    expect(individuals?.data.threshold).toEqual({
      value: 0.03,
      legend: null,
      keepsAll: false,
    });
    expect(individuals?.threshold.valueText).toBe("0.03");
    expect(individuals?.threshold.removesNothing).toBeNull();
  });

  test("the missing rate of panel.vcf.gz goes grey at 0.08, the right edge of the fine bin of its largest value, 16 of 200, and not at 0.079", () => {
    const at = (threshold: number) =>
      variantPlot(
        "missingRate",
        PANEL.variants,
        PANEL_INDIVIDUALS,
        false,
        threshold,
      ).threshold.keepsAll;
    expect(at(0.079)).toBe(false);
    expect(at(0.08)).toBe(true);
    expect(at(0.5)).toBe(true);
  });

  test("on an axis of 0 to 0.7, or of 0.45 to 1, the MAF of 0.5 in the bin that ends there, the step is 0.01", () => {
    const het = variantPlot(
      "obsHet",
      PANEL.variants,
      PANEL_INDIVIDUALS,
      false,
      null,
    );
    const { data } = het;
    expect([data.edges[0], data.edges.at(-1)]).toEqual([0, 0.7]);
    expect(het.threshold.slider.step).toBe(0.01);
    const maf = variantPlot(
      "maf",
      PANEL.variants,
      PANEL_INDIVIDUALS,
      false,
      null,
    );
    expect([maf.data.edges[0], maf.data.edges.at(-1)]).toEqual([0.45, 1]);
    expect(maf.threshold.slider.step).toBe(0.01);
  });

  test("a number typed is rounded to the step of its axis, and shown there", () => {
    const plot = variantPlot(
      "missingRate",
      PANEL.variants,
      PANEL_INDIVIDUALS,
      false,
      null,
      0.0734,
    );
    expect(plot.threshold.shown).toBe(0.073);
    expect(plot.data.threshold?.value).toBe(0.073);
    expect(plot.threshold.slider.value).toBe(0.073);
    expect(plot.threshold.valueText).toBe("0.073");
    expect(plot.threshold.onStep(0.0734)).toBe(0.073);
    expect(plot.threshold.onStep(0.07300000000000001)).toBe(0.073);
    const het = variantPlot(
      "obsHet",
      PANEL.variants,
      PANEL_INDIVIDUALS,
      false,
      null,
      0.3349,
    );
    expect(het.threshold.shown).toBe(0.33);
  });

  test("the owner's first round: 0 is a threshold of the variants, typed, or below 0.0005, as of the individuals; on panel.vcf.gz it keeps the 2 variants with no missing genotype, so it is not grey", () => {
    for (const typed of [0, 0.0004]) {
      const plot = variantPlot(
        "missingRate",
        PANEL.variants,
        PANEL_INDIVIDUALS,
        false,
        null,
        typed,
      );
      expect(plot.threshold.shown).toBe(0);
      expect(plot.data.threshold?.value).toBe(0);
      expect(plot.threshold.slider.value).toBe(0);
      expect(plot.threshold.onStep(typed)).toBe(0);
      expect(plot.threshold.keepsAll).toBe(false);
      expect(plot.threshold.valueText).toBe("0");
    }
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

  test("th4 fix 12: a number set is shown as set, never rounded again when a result so far widens the axis", () => {
    // The observed heterozygosity's axis runs from 0 to 0.7, by 0.01.
    const plot = variantPlot(
      "obsHet",
      PANEL.variants,
      PANEL_INDIVIDUALS,
      true,
      0.035,
    );
    expect(plot.threshold.slider.step).toBe(0.01);
    expect(plot.threshold.shown).toBe(0.035);
    expect(plot.data.threshold?.value).toBe(0.035);
    expect(plot.threshold.slider.value).toBe(0.035);
    expect(plot.threshold.valueText).toBe("0.035");
    const individual = individualPlot(
      "observedHeterozygosity",
      PANEL.individuals,
      true,
      0.035,
    ).plot;
    expect(individual?.threshold.shown).toBe(0.035);
  });

  test("the slider spans the horizontal axis of the plot, widened as the plot widens it to take a threshold beyond the bins", () => {
    // The axis of the missing rate ends at 0.1; a threshold of 0.5
    // widens it to 0.5, at the step of the bins' axis.
    const plot = variantPlot(
      "missingRate",
      PANEL.variants,
      PANEL_INDIVIDUALS,
      false,
      0.5,
    );
    expect(histogramScales(plot.data, 1, 1).x.domain()).toEqual([0, 0.5]);
    expect(plot.threshold.slider).toEqual({
      min: 0,
      max: 0.5,
      step: 0.001,
      value: 0.5,
    });
    // The MAF's axis starts at 0.45: a threshold of 0.25 widens it left,
    // and keeps no variant.
    const maf = variantPlot(
      "maf",
      PANEL.variants,
      PANEL_INDIVIDUALS,
      false,
      0.25,
    );
    const [low, high] = histogramScales(maf.data, 1, 1).x.domain();
    expect(maf.threshold.slider.min).toBe(0.25);
    expect(low).toBe(0.25);
    expect(maf.threshold.slider.max).toBe(high);
    expect(maf.threshold.keepsAll).toBe(false);
  });

  test("the individuals: grey at the top of their axis and from their largest value, by the step of their axis, from popnei's value of each", () => {
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
    expect(top?.threshold.keepsAll).toBe(true);
    expect(top?.threshold.valueText).toBe("0.045, keeps every individual");
    expect(top?.threshold.removesNothing).toBe(
      "This threshold removes no individual.",
    );
    expect(top?.threshold.box).toEqual({
      minValue: 0,
      maxValue: 1,
      step: 0.001,
      decimals: 10,
    });
    const largest = Math.max(...PANEL.individuals.missingGtRate);
    const at = (threshold: number) =>
      individualPlot("missingGenotypes", PANEL.individuals, false, threshold)
        .plot?.threshold.keepsAll;
    expect(at(0.044)).toBe(largest <= 0.044);
    expect(at(0.045)).toBe(true);
    const set = individualPlot(
      "missingGenotypes",
      PANEL.individuals,
      false,
      0.03,
    ).plot;
    expect(set?.threshold.onStep(0.030000000000000002)).toBe(0.03);
    expect(set?.threshold.onStep(0.0304)).toBe(0.03);
    expect(set?.threshold.name).toBe(
      "Missing GTs\u00a0max: maximum proportion of missing genotypes of an individual",
    );
    // A number of four decimals typed is shown at three.
    const typed = individualPlot(
      "missingGenotypes",
      PANEL.individuals,
      false,
      null,
      0.0304,
    ).plot;
    expect(typed?.threshold.shown).toBe(0.03);
  });

  test("an individual with no value is in neither count: grey once the threshold keeps every one with a value", () => {
    const at = (threshold: number) =>
      individualPlot("observedHeterozygosity", INDIVIDUALS, false, threshold)
        .plot?.threshold.keepsAll;
    expect(at(0.35)).toBe(false);
    expect(at(0.4)).toBe(true);
  });
});

describe("the owner's first round: a threshold of the variants set at an edge is grey exactly where popnei's filter of the statistic keeps every variant", () => {
  // At each threshold set at an edge of the fine bins from 0.001 to 1, and
  // at 0.05, 0.1, 0.123 and 0.95, against the variants popnei's filter of
  // the statistic keeps at it, which make_fixtures.mjs ran under node.
  const filtered = ["missingRate", "maf", "obsHet"] as const;
  const thresholds = numbersOf(fieldOf(THRESHOLD_COUNTS, "thresholds"));
  for (const name of [
    "panel.vcf.gz",
    "low_qual.vcf.gz",
    "panel.nei",
    "tetraploid.vcf.gz",
  ]) {
    test(`on ${name}`, () => {
      expect(thresholds).toEqual([0.05, 0.1, 0.123, 0.95]);
      const file = fieldOf(THRESHOLD_COUNTS, name);
      const { variants, individuals } = partsOf(THRESHOLD_COUNTS, name);
      const passIndividuals = {
        numIndividuals: individuals.individuals.length,
        ploidy: name === "tetraploid.vcf.gz" ? 4 : 2,
      };
      let checked = 0;
      for (const statistic of filtered) {
        const atEdges = numbersOf(
          fieldOf(fieldOf(file, "filterKeptAtEdges"), statistic),
        );
        const all = atEdges.at(-1);
        const greyAt = (threshold: number, kept: number): void => {
          const plot = variantPlot(
            statistic,
            variants,
            passIndividuals,
            false,
            threshold,
          );
          expect(plot.threshold.shown).toBe(threshold);
          expect(plot.threshold.keepsAll).toBe(kept === all);
          checked += 1;
        };
        for (const [k, kept] of atEdges.entries()) {
          greyAt((k + 1) / 1000, kept);
        }
        const atThresholds = numbersOf(
          fieldOf(fieldOf(file, "filterKept"), statistic),
        );
        for (const [i, kept] of atThresholds.entries()) {
          greyAt(thresholds[i] ?? NaN, kept);
        }
      }
      expect(checked).toBe(3 * 1004);
    });
  }
});

describe("the step of a threshold of the variants is never finer than the fine bins", () => {
  test("a file with no missing genotype, every variant in the first fine bin: the axis runs from 0 to 0.05 by 0.001, every place of the line and number of the box is an edge, and each keeps every variant, at 0 only where the values are spaced wider than that bin", () => {
    const clean = summaryResult(["1"], [1200]).perVar;
    for (const statistic of [
      "missingRate",
      "maf",
      "obsHet",
      "unbiasedExpHet",
    ] as const) {
      const plot = variantPlot(
        statistic,
        clean,
        PANEL_INDIVIDUALS,
        false,
        null,
      );
      expect(plot.threshold.slider).toEqual({
        min: 0,
        max: 0.05,
        step: 0.001,
        value: 0.05,
      });
      // A number of four decimals typed is shown at three, an edge.
      const typed = variantPlot(
        statistic,
        clean,
        PANEL_INDIVIDUALS,
        false,
        null,
        0.0123,
      );
      expect(typed.threshold.shown).toBe(0.012);
      expect(typed.threshold.keepsAll).toBe(true);
      for (let place = 0; place <= 50; place += 1) {
        const shown = plot.threshold.onStep(place / 1000);
        expect(clean.binEdges).toContain(shown);
      }
      const atZero = variantPlot(statistic, clean, PANEL_INDIVIDUALS, false, 0)
        .threshold.keepsAll;
      expect(atZero).toBe(statistic === "missingRate" || statistic === "maf");
    }
  });
});
