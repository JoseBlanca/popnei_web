/**
 * What each histogram of the statistics of the open file on popgen2.html
 * draws (docs/plans/file-stats.md, "Where it goes"): its title, its axes,
 * its bins and its description, and the line under its title that says
 * how many variants or individuals are in its bins. The words are those
 * of the old page's histograms, with no mean in the titles. Each axis
 * spans the range of the values, rounded out to round numbers, the
 * missing rates from 0 (the owner, 6 October 2026): the variants' bins
 * are popnei's added up, `variantBinsRounded`, those of the individuals
 * made from popnei's values over that range, `binValuesRounded`. The axes
 * are fitted to what is drawn, so those of a result so far widen as the
 * pass reads values outside them. Pure, so
 * that a test in node checks the counts, a value of NaN among them; the
 * section draws them.
 *
 * Each histogram has a threshold that keeps the values at most it
 * (docs/plans/thresholds.md, "The design"): drawn on the plot with no
 * legend, since it is no filter, said under the plot, after its box, with
 * what it keeps and removes, and moved by a slider laid over the plot,
 * whose range is the horizontal axis of the plot, `histogramScales`,
 * widened as the plot widens it to take a threshold outside the bins.
 * The threshold the user set is `null` until they move it, at the top of
 * the axis, where it keeps everything and follows the axis as a result
 * so far widens it, and its words say "(no limit)". Those of the
 * variants move from one of popnei's 1,280 fine edges to the next, a
 * number typed being snapped to the nearest, are counted from popnei's
 * fine bins, `variantsAtMost`, and are shown in full, k/1280, up to
 * eight decimals, 0.33984375, so that the number shown is the number
 * counted; those of the individuals move by 0.0001, are shown with at
 * most four decimals and are counted from popnei's value of each,
 * `individualsAtMost`, exact at any number.
 */
import {
  variantBinsRounded,
  variantHistogramDescription,
} from "../../core/analyses/variantChecks.ts";
import type { VariantStatistic } from "../../core/analyses/variantChecks.ts";
import { individualHistogramDescription } from "../../core/analyses/individualChecks.ts";
import type { IndividualStatistic } from "../../core/analyses/individualChecks.ts";
import { INDIVIDUAL_BINS, binValuesRounded } from "../../core/histogram.ts";
import {
  individualsAtMost,
  snapToFineEdge,
  variantsAtMost,
} from "../../core/thresholds.ts";
import { histogramRows, histogramScales } from "../../charts/histogram.ts";
import type {
  HistogramData,
  HistogramThreshold,
} from "../../charts/histogram.ts";
import type {
  IndividualStatsPart,
  VariantStatsPart,
} from "../../worker/protocol.ts";
import { VARIANT_HISTOGRAMS } from "../steps/variants/histogramWords.ts";
import {
  INDIVIDUALS_LABEL,
  INDIVIDUAL_HISTOGRAMS,
  noHeterozygosityText,
} from "../steps/variants/individualStats.ts";
import {
  individualThresholdName,
  individualTitle,
  noValueThresholdLine,
  SO_FAR_DESCRIPTION,
  UNDECIDED_DESCRIPTION,
  overIndividualsLine,
  overVariantsLine,
  THRESHOLD_DECIMALS,
  VARIANT_THRESHOLD_DECIMALS,
  thresholdLine,
  thresholdShown,
  thresholdValueText,
  variantThresholdName,
  variantTitle,
} from "./statsWords.ts";
import type {
  Counted,
  ThresholdCounts,
  ThresholdWordsOptions,
} from "./statsWords.ts";

/** The step of a threshold of the individuals, and of its box, which
    takes four decimals, as the thresholds of the individuals of the old
    page do. The box of the variants takes eight,
    `VARIANT_THRESHOLD_DECIMALS`, those of the fine edges, a number with
    more refused and one off an edge snapped to the nearest, and its step
    is one fine edge. */
export const INDIVIDUAL_THRESHOLD_STEP = 0.0001;

/** One histogram of the section. */
export interface StatsPlot {
  /** What the plot draws, its title and its threshold among it. */
  readonly data: HistogramData;
  /** The line under the title, "Over 1,200 variants", those in its
      bins. */
  readonly countLine: string;
  /** Its threshold: its slider, its box and its words. */
  readonly threshold: PlotThreshold;
}

/** The threshold of a histogram, as its slider, its box and its words
    show it. */
export interface PlotThreshold {
  /** The name of the slider and of the box: "Maximum proportion of
      missing genotypes". */
  readonly name: string;
  /** The number of the threshold as the box and the words show it: for
      the variants an edge of popnei's fine bins in full, k/1280,
      0.33984375 for 435/1280, the number its counts are of; for the
      individuals at most four decimals. */
  readonly shown: number;
  /** The range of the slider, the horizontal axis of the plot, and where
      it is, in its own units: the index of a fine edge for the
      variants, the threshold itself for the individuals. */
  readonly slider: SliderRange;
  /** The bounds and the step of the box. */
  readonly box: BoxRange;
  /** The words after the box, under the plot: "keeps 1,050 variants and
      removes 150". */
  readonly line: string;
  /** What a screen reader says as the value of the slider: "0.1, keeps
      1,050 of 1,200 variants". */
  readonly valueText: string;
  /** The threshold the user sets by moving the slider to `value`, in
      the units of the slider. */
  readonly fromSlider: (value: number) => number;
  /** The number the box will show for `value`, a number committed in it,
      when that differs from `value`, which was moved to the nearest fine
      edge, 0.0703125 for 0.07; `null` when it is shown as committed. */
  readonly snapped: (value: number) => number | null;
}

/** The range of a slider and where its thumb is. */
export interface SliderRange {
  /** The left end of the horizontal axis. */
  readonly min: number;
  /** The right end. */
  readonly max: number;
  /** What an arrow key moves it by; ten of them for Page Up and Down. */
  readonly step: number;
  /** Where the thumb is. */
  readonly value: number;
}

/** The bounds and the step of the box of a threshold. */
export interface BoxRange {
  readonly minValue: number;
  readonly maxValue: number;
  /** The step of the number the box shows, which React Aria checks it
      against: one fine edge, 1/1280, for the variants, 0.0001 for the
      individuals; the arrow keys of the box move the threshold by the
      step of the slider. */
  readonly step: number;
  /** The most decimals a number typed may have, apart from the step. */
  readonly decimals: number;
}

/** A histogram of the individuals, and what is said of those in none of
    its bins. */
export interface IndividualPlot {
  /** The histogram, or `null` when no individual has a value. */
  readonly plot: StatsPlot | null;
  /** The line under it of the individuals with no called genotype, or
      `null` when every one has a value. */
  readonly noValueLine: string | null;
}

/** The histogram of the variants of `statistic`, popnei's bins added up
    over the range of those with a count, rounded out, over the variants
    in them, which leaves out a variant with no value; its line, its
    description and the words of its threshold say "so far" for a result
    so far, `soFar`. `threshold` is the number the user set or is typing,
    snapped to the nearest fine edge, or `null` for the top of the
    axis. */
export function variantPlot(
  statistic: VariantStatistic,
  result: VariantStatsPart,
  soFar: boolean,
  threshold: number | null,
): StatsPlot {
  const words = VARIANT_HISTOGRAMS[statistic];
  const bins = variantBinsRounded(result, statistic);
  const numBins = result.binEdges.length - 1;
  // The top of the axis is a fine edge, the nominal k/numBins.
  const axisHigh = Math.round(at(bins.edges, bins.edges.length - 1) * numBins);
  const index =
    threshold === null
      ? axisHigh
      : snapToFineEdge(result.binEdges, threshold).index;
  // Shown in full, the number counted (VARIANT_THRESHOLD_DECIMALS).
  const shown = index / numBins;
  const counts = variantsAtMost(result, statistic, index);
  // The variants on the line are somewhere in the bin that starts at it.
  const undecided = counts.keptLow !== counts.keptHigh;
  const plotted = {
    title: variantTitle(statistic),
    xLabel: words.name,
    yLabel: words.countLabel,
    edges: bins.edges,
    counts: bins.counts,
    threshold: noLegend(shown, undecided),
  };
  const rows = histogramRows({ ...plotted, threshold: null, description: "" });
  const described = variantHistogramDescription(statistic, rows, null);
  const data = {
    ...plotted,
    description: describedSoFar(
      undecided ? `${described} ${UNDECIDED_DESCRIPTION}` : described,
      soFar,
    ),
  };
  const [low, high] = axisOf(data);
  return {
    data,
    countLine: overVariantsLine(sumOf(bins.counts), soFar),
    threshold: {
      name: variantThresholdName(statistic),
      shown,
      slider: {
        min: Math.round(low * numBins),
        max: Math.round(high * numBins),
        step: 1,
        value: index,
      },
      box: {
        minValue: 0,
        maxValue: 1,
        step: 1 / numBins,
        decimals: VARIANT_THRESHOLD_DECIMALS,
      },
      ...wordsOf(shown, counts, "variant", {
        soFar,
        noLimit: threshold === null,
        ...(index < numBins && {
          binEnd: (index + 1) / numBins,
        }),
      }),
      fromSlider: (value) => value / numBins,
      snapped: (value) => {
        const nearest = snapToFineEdge(result.binEdges, value).shown;
        return nearest === value ? null : nearest;
      },
    },
  };
}

/** The histogram of the individuals of `statistic`, its values binned
    over their range rounded out, the missing rate from 0, over the
    individuals with a value; its line, its description, the words of its
    threshold and the line of the individuals with no value say "so far"
    for a result so far, `soFar`. `threshold` is the number the user set
    or is typing, or `null` for the top of the axis. */
export function individualPlot(
  statistic: IndividualStatistic,
  result: IndividualStatsPart,
  soFar: boolean,
  threshold: number | null,
): IndividualPlot {
  const words = INDIVIDUAL_HISTOGRAMS[statistic];
  const values =
    statistic === "missingGenotypes" ? result.missingGtRate : result.obsHetRate;
  const bins = binValuesRounded(
    values,
    INDIVIDUAL_BINS,
    statistic === "missingGenotypes",
  );
  // binValues gives no bins only when every value is NaN.
  if (bins === null) {
    return {
      plot: null,
      noValueLine: noHeterozygosityText(values.length, soFar),
    };
  }
  const axisHigh = at(bins.edges, bins.edges.length - 1);
  const shown = threshold ?? axisHigh;
  const plotted = {
    title: individualTitle(statistic),
    xLabel: words.xLabel,
    yLabel: INDIVIDUALS_LABEL,
    edges: bins.edges,
    counts: bins.counts,
    threshold: noLegend(shown, false),
  };
  const rows = histogramRows({ ...plotted, threshold: null, description: "" });
  const data = {
    ...plotted,
    description: describedSoFar(
      individualHistogramDescription(statistic, rows, null),
      soFar,
    ),
  };
  const { kept, removed } = individualsAtMost(values, shown);
  const counts = { keptLow: kept, keptHigh: kept, withValue: kept + removed };
  const [low, high] = axisOf(data);
  return {
    plot: {
      data,
      countLine: overIndividualsLine(sumOf(bins.counts), soFar),
      threshold: {
        name: individualThresholdName(statistic),
        shown,
        slider: {
          min: low,
          max: high,
          step: INDIVIDUAL_THRESHOLD_STEP,
          value: shown,
        },
        box: {
          minValue: 0,
          maxValue: 1,
          step: INDIVIDUAL_THRESHOLD_STEP,
          decimals: THRESHOLD_DECIMALS,
        },
        ...wordsOf(shown, counts, "individual", {
          soFar,
          noLimit: threshold === null,
        }),
        fromSlider: thresholdShown,
        snapped: () => null,
      },
    },
    noValueLine: noValueThresholdLine(bins.numNaN, soFar),
  };
}

/** A threshold at `value` drawn with no legend: it is no filter, and the
    words under the plot say what it keeps; the bar at the line hatched,
    `undecided`, when the counts are a range. */
function noLegend(value: number, undecided: boolean): HistogramThreshold {
  return { value, legend: null, undecided };
}

/** The two ends of the horizontal axis the plot draws `data` with, the
    bins widened to take the threshold, which the slider spans. */
function axisOf(data: HistogramData): readonly [number, number] {
  const [low, high] = histogramScales(data, 1, 1).x.domain();
  if (low === undefined || high === undefined) {
    throw new Error("popnei_web defect: a horizontal axis with no ends.");
  }
  return [low, high];
}

/** The words after the box and the value text of the slider. */
function wordsOf(
  shown: number,
  counts: ThresholdCounts,
  noun: Counted,
  options: ThresholdWordsOptions,
): { readonly line: string; readonly valueText: string } {
  return {
    line: thresholdLine(shown, counts, noun, options),
    valueText: thresholdValueText(shown, counts, noun, options),
  };
}

/** The edge at `index` of `edges`, which the bins made. */
function at(edges: Float64Array, index: number): number {
  const edge = edges[index];
  if (edge === undefined) {
    throw new Error(`popnei_web defect: no edge at ${String(index)}.`);
  }
  return edge;
}

/** The description of a histogram, which says, for one drawn from a
    result so far, `soFar`, that it is of the variants read so far. */
function describedSoFar(description: string, soFar: boolean): string {
  return soFar ? `${description} ${SO_FAR_DESCRIPTION}` : description;
}

/** The sum of the counts of the bins. */
function sumOf(counts: Uint32Array): number {
  return counts.reduce((sum, count) => sum + count, 0);
}
