/**
 * What each histogram of the statistics of the open file on popgen2.html
 * draws (docs/plans/file-stats.md, "Where it goes"): its axes, its bins
 * and its description, and the row of its threshold. Each axis spans the
 * range of the values, rounded out to round numbers, the missing rates
 * from 0 (the owner, 6 October 2026): the variants' bins are popnei's
 * added up, `variantBinsRounded`, those of the individuals made from
 * popnei's values over that range, `binValuesRounded`. The axes are
 * fitted to what is drawn, so those of a result so far widen as the pass
 * reads values outside them. Pure, so that a test in node checks the
 * counts, a value of NaN among them; the section draws them.
 *
 * Each histogram has a threshold that keeps the values at most it
 * (docs/plans/thresholds.md, "The design" and "Round 1 with the owner"):
 * drawn on the plot with no legend, since it is no filter, set in a box
 * after the short title, "Obs. het. max:", with the line of what it keeps
 * under that row, and moved by a slider laid over the plot, whose range
 * is the horizontal axis of the plot, `histogramScales`, widened as the
 * plot widens it to take a threshold outside the bins. The threshold the
 * user set is `null` until they move it, at the top of the axis, where it
 * keeps everything and follows the axis as a result so far widens it. It
 * moves by the step of its axis, `thresholdStep`, 0.01 on an axis of 0 to
 * 1: a number typed is shown and counted rounded to that step, and is
 * committed so, and a number the user set is shown and counted as set,
 * never rounded again when a result so far widens the axis and its step
 * grows. So the number shown is the number counted: those of the
 * variants from popnei's fine bins, `variantsAtMost`, a range where the
 * bins cannot tell, those of the individuals from popnei's value of
 * each, `individualsAtMost`, exact.
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
  thresholdOnStep,
  thresholdStep,
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
  individualFullTitle,
  individualThresholdName,
  individualTitle,
  keepsLine,
  noValueThresholdLine,
  SO_FAR_DESCRIPTION,
  thresholdShownLabel,
  thresholdValueText,
  UNDECIDED_DESCRIPTION,
  variantFullTitle,
  variantThresholdName,
  variantTitle,
} from "./statsWords.ts";
import type { Counted, ThresholdCounts } from "./statsWords.ts";

/** The most decimals a number typed in the box of a threshold may have;
    it is then rounded to the step of the axis. More are refused, as no
    number a user means. */
export const TYPED_DECIMALS = 10;

/** One histogram of the section. */
export interface StatsPlot {
  /** What the plot draws, its threshold among it; its title the full
      name, "Observed heterozygosity", which names the plot and its group
      for a screen reader. */
  readonly data: HistogramData;
  /** Its threshold: its slider, its box and its words. */
  readonly threshold: PlotThreshold;
}

/** The threshold of a histogram, as its slider, its box and its words
    show it. */
export interface PlotThreshold {
  /** What is drawn before the box, the short title and "max:", "Obs.
      het. max:". */
  readonly shownLabel: string;
  /** The name of the slider and of the box, which starts with
      `shownLabel`: "Obs. het. max: maximum observed heterozygosity". */
  readonly name: string;
  /** The number of the threshold as the box and the words show it, the
      number counted: the number set, the number typed rounded to the
      step of the axis, or the top of the axis. */
  readonly shown: number;
  /** The range of the slider, the horizontal axis of the plot, its step
      and where it is. */
  readonly slider: SliderRange;
  /** The bounds and the step of the box. */
  readonly box: BoxRange;
  /** The line under the row of the box: "Keeps 1,050 of 1,200
      variants". */
  readonly line: string;
  /** What a screen reader says as the value of the slider: "0.1, keeps
      1,050 of 1,200 variants". */
  readonly valueText: string;
  /** The threshold for `value`, a number typed or a place of the slider:
      `value` rounded to the step of the axis, as it is committed. */
  readonly onStep: (value: number) => number;
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
  /** The step of the axis, which the arrow keys of the box move the
      threshold by, as on the slider. */
  readonly step: number;
  /** The most decimals a number typed may have, `TYPED_DECIMALS`; it is
      rounded to the step when committed. */
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
    in them, which leaves out a variant with no value; its description and
    the words of its threshold say "so far" for a result so far, `soFar`.
    `threshold` is the number the user set, drawn and counted as it is, or
    `null` for the top of the axis; `typed`, a number the user is typing,
    drawn and counted in its place rounded to the step of the axis. */
export function variantPlot(
  statistic: VariantStatistic,
  result: VariantStatsPart,
  soFar: boolean,
  threshold: number | null,
  typed: number | null = null,
): StatsPlot {
  const words = VARIANT_HISTOGRAMS[statistic];
  const bins = variantBinsRounded(result, statistic);
  const axisLow = at(bins.edges, 0);
  const axisHigh = at(bins.edges, bins.edges.length - 1);
  const { step, decimals } = thresholdStep(axisLow, axisHigh);
  const onStep = (value: number): number => thresholdOnStep(value, decimals);
  const shown = shownOf(threshold, typed, axisHigh, onStep);
  const counts = variantsAtMost(result, statistic, shown);
  // The variants the line may keep or not are in the bar at the line.
  const undecided = counts.keptLow !== counts.keptHigh;
  const plotted = {
    title: variantFullTitle(statistic),
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
    threshold: {
      shownLabel: thresholdShownLabel(variantTitle(statistic)),
      name: variantThresholdName(statistic),
      shown,
      slider: { min: low, max: high, step, value: shown },
      box: { minValue: 0, maxValue: 1, step, decimals: TYPED_DECIMALS },
      ...wordsOf(shown, counts, "variant", soFar),
      onStep,
    },
  };
}

/** The histogram of the individuals of `statistic`, its values binned
    over their range rounded out, the missing rate from 0, over the
    individuals with a value; its description, the words of its threshold
    and the line of the individuals with no value say "so far" for a
    result so far, `soFar`. `threshold` and `typed` are as for
    `variantPlot`. */
export function individualPlot(
  statistic: IndividualStatistic,
  result: IndividualStatsPart,
  soFar: boolean,
  threshold: number | null,
  typed: number | null = null,
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
  const axisLow = at(bins.edges, 0);
  const axisHigh = at(bins.edges, bins.edges.length - 1);
  const { step, decimals } = thresholdStep(axisLow, axisHigh);
  const onStep = (value: number): number => thresholdOnStep(value, decimals);
  const shown = shownOf(threshold, typed, axisHigh, onStep);
  const plotted = {
    title: individualFullTitle(statistic),
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
      threshold: {
        shownLabel: thresholdShownLabel(individualTitle(statistic)),
        name: individualThresholdName(statistic),
        shown,
        slider: { min: low, max: high, step, value: shown },
        box: { minValue: 0, maxValue: 1, step, decimals: TYPED_DECIMALS },
        ...wordsOf(shown, counts, "individual", soFar),
        onStep,
      },
    },
    noValueLine: noValueThresholdLine(bins.numNaN, soFar),
  };
}

/** The number a threshold is shown and counted at: `typed`, a number
    being typed, rounded to the step of the axis by `onStep`; else
    `threshold`, the number the user set, as it is, since it was rounded
    to the step of its axis when committed and a result so far that
    widens the axis must not move it; else the top of the axis,
    `axisHigh`. */
function shownOf(
  threshold: number | null,
  typed: number | null,
  axisHigh: number,
  onStep: (value: number) => number,
): number {
  if (typed !== null) return onStep(typed);
  return threshold ?? onStep(axisHigh);
}

/** A threshold at `value` drawn with no legend: it is no filter, and the
    line over the plot says what it keeps; the bar at the line hatched,
    `undecided`, when the counts are a range, with the words of why as its
    tooltip. */
function noLegend(value: number, undecided: boolean): HistogramThreshold {
  return undecided
    ? { value, legend: null, undecided, undecidedTitle: UNDECIDED_DESCRIPTION }
    : { value, legend: null, undecided };
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

/** The line under the row of the box and the value text of the
    slider. */
function wordsOf(
  shown: number,
  counts: ThresholdCounts,
  noun: Counted,
  soFar: boolean,
): { readonly line: string; readonly valueText: string } {
  return {
    line: keepsLine(counts, noun, soFar),
    valueText: thresholdValueText(shown, counts, noun, soFar),
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
