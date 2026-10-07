import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import { histogramScales } from "../../charts/histogram.ts";

import type {
  IndividualChecksResult,
  VariantChecksResult,
} from "../../worker/protocol.ts";
import { individualsAtMost, variantsAtMost } from "../../core/thresholds.ts";
import { individualPlot, variantPlot } from "./statsPlots.ts";
import { keepsLine, UNDECIDED_DESCRIPTION } from "./statsWords.ts";
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
      undecided: false,
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
    with popnei 0.2.1 under node: 1,200 variants of 200 individuals. */
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
      undecided: false,
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

  test("on an axis of 0 to 0.7, or of 0.5 to 1, the step is 0.01", () => {
    const het = variantPlot("obsHet", PANEL.variants, false, null);
    const { data } = het;
    expect([data.edges[0], data.edges.at(-1)]).toEqual([0, 0.7]);
    expect(het.threshold.slider.step).toBe(0.01);
    const maf = variantPlot("maf", PANEL.variants, false, null);
    expect([maf.data.edges[0], maf.data.edges.at(-1)]).toEqual([0.5, 1]);
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

  test("th4 fix 6: the number counted is the number shown, rounded, and not the number typed: a missing rate typed 0.0496 is shown 0.05 and counted 1,113 to 1,152", () => {
    // Counted as typed it would be one number, in the bin below 0.05.
    const asTyped = variantsAtMost(PANEL.variants, "missingRate", 0.0496);
    expect(asTyped.keptLow).toBe(asTyped.keptHigh);
    const plot = variantPlot(
      "missingRate",
      PANEL.variants,
      false,
      null,
      0.0496,
    );
    expect(plot.threshold.shown).toBe(0.05);
    expect(plot.threshold.line).toBe("Keeps 1,113 to 1,152 of 1,200 variants");
    expect(plot.data.threshold?.undecided).toBe(true);
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

  test("on an edge equal to k/1280 the bins cannot tell the variants on the edge: at 0.05, 1,113 to 1,152 of the missing rate, with no explanation", () => {
    const plot = variantPlot("missingRate", PANEL.variants, false, 0.05);
    expect(plot.threshold.line).toBe("Keeps 1,113 to 1,152 of 1,200 variants");
    expect(plot.threshold.valueText).toBe(
      "0.05, keeps 1,113 to 1,152 of 1,200 variants",
    );
  });

  test("inside a fine bin the bins cannot tell its variants: at 0.07, 1,197 to 1,199 of the missing rate; one number when the bin is empty, 81 at 0.012", () => {
    const plot = variantPlot("missingRate", PANEL.variants, false, 0.07);
    expect(plot.threshold.line).toBe("Keeps 1,197 to 1,199 of 1,200 variants");
    expect(plot.data.threshold?.undecided).toBe(true);
    const empty = variantPlot("missingRate", PANEL.variants, false, 0.012);
    expect(empty.threshold.line).toBe("Keeps 81 of 1,200 variants");
    expect(empty.data.threshold?.undecided).toBe(false);
  });

  test("a range draws the bar at the line hatched, as undecided, and the description and the tooltip of the bar say why; one number draws none", () => {
    const range = variantPlot("missingRate", PANEL.variants, false, 0.05);
    expect(range.data.threshold).toEqual({
      value: 0.05,
      legend: null,
      undecided: true,
      undecidedTitle: UNDECIDED_DESCRIPTION,
    });
    expect(range.data.description).toContain(UNDECIDED_DESCRIPTION);
    const exact = variantPlot("obsHet", PANEL.variants, false, 0.3);
    expect(exact.data.threshold?.undecided).toBe(false);
    expect(exact.data.threshold?.undecidedTitle).toBeUndefined();
    expect(exact.data.description).not.toContain(UNDECIDED_DESCRIPTION);
    // At the top of the axis, every variant kept, nothing undecided.
    const top = variantPlot("missingRate", PANEL.variants, false, null);
    expect(top.data.threshold?.undecided).toBe(false);
    const individuals = individualPlot(
      "missingGenotypes",
      PANEL.individuals,
      false,
      0.03,
    ).plot;
    expect(individuals?.data.threshold?.undecided).toBe(false);
  });

  test("on an edge one double above k/1280 the count is one number: the observed heterozygosity at 0.3 keeps 373", () => {
    const plot = variantPlot("obsHet", PANEL.variants, false, 0.3);
    expect(plot.threshold.shown).toBe(0.3);
    expect(plot.threshold.line).toBe("Keeps 373 of 1,200 variants");
    expect(plot.threshold.valueText).toBe("0.3, keeps 373 of 1,200 variants");
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
    const plot = variantPlot("obsHet", PANEL.variants, true, 0.3);
    expect(plot.threshold.line).toBe("Keeps 373 of 1,200 variants so far");
    expect(plot.threshold.valueText).toBe(
      "0.3, keeps 373 of 1,200 variants so far",
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
  // At each number of two and three decimals of the fixture shown on its
  // axis as it is, the words give the counts of variantsAtMost at that
  // number, and popnei's filter at it, which make_fixtures.mjs ran under
  // node, keeps a count within them.
  const filtered = ["missingRate", "maf", "obsHet"] as const;
  const numbers = numbersOf(fieldOf(THRESHOLD_COUNTS, "roundNumbers"));
  for (const name of ["panel.vcf.gz", "panel.nei", "tetraploid.vcf.gz"]) {
    test(`on ${name}, popnei's filter at the number shown keeps a count the words give`, () => {
      const file = fieldOf(THRESHOLD_COUNTS, name);
      const { variants } = partsOf(THRESHOLD_COUNTS, name);
      const kept = fieldOf(file, "filterKeptRound");
      let checked = 0;
      for (const statistic of filtered) {
        const popnei = numbersOf(fieldOf(kept, statistic));
        for (const [i, number] of numbers.entries()) {
          const plot = variantPlot(statistic, variants, false, number);
          // A number of three decimals on an axis of two is shown, and
          // counted, at two: not this number.
          if (plot.threshold.shown !== number) continue;
          const counts = variantsAtMost(variants, statistic, number);
          expect(plot.threshold.line).toBe(keepsLine(counts, "variant"));
          const count = popnei[i] ?? NaN;
          expect(count).toBeGreaterThanOrEqual(counts.keptLow);
          expect(count).toBeLessThanOrEqual(counts.keptHigh);
          if (counts.keptLow === counts.keptHigh) {
            expect(count).toBe(counts.keptLow);
          }
          checked += 1;
        }
      }
      expect(checked).toBeGreaterThan(300);
    });
  }
});
