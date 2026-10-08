/**
 * What each histogram of the statistics of the open file on popgen2.html
 * draws (docs/plans/file-stats.md, "Where it goes"): its axes, its bins
 * and its description, and the row of its threshold. Each axis spans the
 * range of the values, rounded out to round numbers, the missing rates
 * from 0 (the owner, 6 October 2026): the variants' bins are popnei's
 * added up, `variantBinsRounded`, in bars no narrower than the distance
 * between two values of the missing rate and of the MAF, the missing
 * rate's first bar from 0 to 0.001, its variants with no missing genotype,
 * which a threshold of 0 keeps (the owner, 8 October 2026), those of the
 * individuals made from popnei's values over
 * that range, `binValuesRounded`. The axes are
 * fitted to what is drawn, so those of a result so far widen as the pass
 * reads values outside them. Pure, so that a test in node checks the
 * bins and the grey of the thresholds, a value of NaN among them; the
 * section draws them.
 *
 * Each histogram but that of the expected heterozygosity, on which popnei
 * has no filter, has a threshold, a filter of the project that keeps the
 * values at most it (docs/specs/steps/popgen2-filters.md, "A threshold,
 * on and off"): drawn on the plot with no legend, set in a box after the
 * short title, "Obs. het. max:", and moved by a slider laid over the
 * plot, whose range is the horizontal axis of the plot,
 * `histogramScales`, widened as the plot widens it to take a threshold
 * outside the bins. No words on the screen say what it keeps (the
 * owner, 8 October 2026): one that keeps every variant or individual of
 * its plot is drawn in grey, its line and the number in its box, and so
 * is one that is off, with 1 in its box and its line at the top of the
 * axis; a screen reader hears it as the value of the slider and the
 * description of the box. The threshold drawn is the project's, or the
 * one being dragged, typed or moved with the keys and not yet a change
 * of the project. It moves by the step of its axis, `thresholdStep`,
 * 0.01 on an axis of 0 to 1: a number typed is shown rounded to that
 * step, and is committed so, and a number of the project is shown as it
 * is, never rounded again when a result so far widens the axis and its
 * step grows. A threshold of the variants has three decimals at most,
 * `variantThresholdOnStep`, so that it is an edge of popnei's fine bins,
 * which tell whether it keeps every variant, `variantThresholdLook`;
 * those of the individuals are told from popnei's value of each,
 * `individualThresholdLook`.
 */
import {
  variantBinsRounded,
  variantHistogramDescription,
  variantValueSpacing,
} from "../../core/analyses/variantChecks.ts";
import type {
  PassIndividuals,
  VariantStatistic,
} from "../../core/analyses/variantChecks.ts";
import { individualHistogramDescription } from "../../core/analyses/individualChecks.ts";
import type { IndividualStatistic } from "../../core/analyses/individualChecks.ts";
import { INDIVIDUAL_BINS, binValuesRounded } from "../../core/histogram.ts";
import {
  individualThresholdLook,
  thresholdOnStep,
  thresholdStep,
  variantThresholdLook,
  variantThresholdOnStep,
} from "../../core/thresholds.ts";
import type { ThresholdLook } from "../../core/thresholds.ts";
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
} from "../steps/variants/individualStats.ts";
import {
  drawnFromDescription,
  individualFullTitle,
  individualThresholdName,
  individualTitle,
  noValueThresholdLine,
  thresholdHiddenDescription,
  thresholdShownLabel,
  thresholdValueText,
  variantFullTitle,
  variantThresholdName,
  variantTitle,
} from "./statsWords.ts";
import type { Counted, DrawnFrom } from "./statsWords.ts";

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
  /** The short title drawn over the plot, "Exp. het. (unbiased)", for a
      plot with no threshold. */
  readonly shortTitle: string;
  /** Its threshold: its slider, its box and its words; `null` for the
      expected heterozygosity, which has none. */
  readonly threshold: PlotThreshold | null;
}

/** The threshold of a histogram, as its slider and its box show it,
    and the words a screen reader hears of it. */
export interface PlotThreshold {
  /** What is drawn before the box, the short title and "max:", "Obs.
      het. max:". */
  readonly shownLabel: string;
  /** The name of the slider and of the box, which starts with
      `shownLabel`: "Obs. het. max: maximum observed heterozygosity". */
  readonly name: string;
  /** How it is drawn: on, on and grey, or off, the last two in grey. */
  readonly look: ThresholdLook;
  /** What its histogram counts, in its words: variants or individuals. */
  readonly counted: Counted;
  /** The range of the slider, the horizontal axis of the plot, its step
      and where it is: the threshold, or the top of the axis when it is
      off. */
  readonly slider: SliderRange;
  /** The number of the box, its bounds and its step. */
  readonly box: BoxRange;
  /** What a screen reader says as the value of the slider: "0.05", "0.1,
      keeps every variant of the plot", "1, keeps every variant". */
  readonly valueText: string;
  /** The description of the box that a screen reader alone reads, which
      the grey says to the eye: "This filter removes nothing." when it is
      off; `null` when it removes some value of its plot. */
  readonly hiddenDescription: string | null;
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

/** The number, the bounds and the step of the box of a threshold. */
export interface BoxRange {
  /** The number it shows: the threshold, or 1 when it is off. */
  readonly value: number;
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
  /** The longest words that line can show, those with the filter on
      after a Stop, whose room the line keeps always, so that what is
      under it, and the other plot of its row, do not move as the filter
      turns on or off, at a Stop or when the pass ends; `null` when
      there is no line of a filter. */
  readonly noValueRoom: string | null;
}

/** The histogram of the variants of `statistic`, popnei's bins added up
    over the range of those with a count, rounded out, in bars no
    narrower than the distance between two values the statistic can take
    over `individuals`, over the variants in them, which leaves out a
    variant with no value; its description says what it is drawn from,
    `from`: the variants read so far, or those read before a Stop.
    `threshold` is the value of its filter in the project,
    `null` while it is off; `moving`, a number the user is dragging,
    typing or moving with the keys, drawn in its place rounded to the
    step of the axis. The expected heterozygosity has no threshold, and
    both are passed over for it. */
export function variantPlot(
  statistic: VariantStatistic,
  result: VariantStatsPart,
  individuals: PassIndividuals,
  from: DrawnFrom,
  threshold: number | null,
  moving: number | null = null,
): StatsPlot {
  const words = VARIANT_HISTOGRAMS[statistic];
  const spacing = variantValueSpacing(
    statistic,
    individuals.numIndividuals,
    individuals.ploidy,
  );
  const bins = variantBinsRounded(result, statistic, individuals);
  const axisLow = at(bins.edges, 0);
  const axisHigh = at(bins.edges, bins.edges.length - 1);
  const { step, decimals } = thresholdStep(axisLow, axisHigh);
  const onStep = (value: number): number =>
    variantThresholdOnStep(value, decimals);
  const filtered = statistic !== "unbiasedExpHet";
  const set = filtered ? setOf(threshold, moving, onStep) : null;
  const look = variantThresholdLook(result, statistic, set, spacing);
  const shown = lineOf(set, look, axisHigh, onStep);
  const plotted = {
    title: variantFullTitle(statistic),
    xLabel: words.name,
    yLabel: words.countLabel,
    edges: bins.edges,
    counts: bins.counts,
    threshold: filtered ? noLegend(shown, look) : null,
    // The first bar of the missing rate, 0 to 0.001, holds the variants
    // with no missing genotype, alone below 1,000 individuals: a
    // threshold of 0 keeps it.
    firstBinOnLowerEdge: statistic === "missingRate",
  };
  const rows = histogramRows({ ...plotted, threshold: null, description: "" });
  const data = {
    ...plotted,
    description: describedFrom(
      variantHistogramDescription(statistic, rows, null),
      from,
    ),
  };
  const shortTitle = variantTitle(statistic);
  if (!filtered) return { data, shortTitle, threshold: null };
  const [low, high] = axisOf(data);
  return {
    data,
    shortTitle,
    threshold: {
      shownLabel: thresholdShownLabel(shortTitle),
      name: variantThresholdName(statistic),
      look,
      counted: "variant",
      slider: { min: low, max: high, step, value: shown },
      box: boxOf(shown, look, step),
      ...wordsOf(shown, look, "variant"),
      onStep,
    },
  };
}

/** The histogram of the individuals of `statistic`, its values binned
    over their range rounded out, the missing rate from 0, over the
    individuals with a value; its description and the line of the
    individuals with no value say what it is drawn from, `from`.
    `threshold` and `moving` are as for `variantPlot`. */
export function individualPlot(
  statistic: IndividualStatistic,
  result: IndividualStatsPart,
  from: DrawnFrom,
  threshold: number | null,
  moving: number | null = null,
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
      noValueLine: noValueThresholdLine(values.length, false, from),
      noValueRoom: null,
    };
  }
  const axisLow = at(bins.edges, 0);
  const axisHigh = at(bins.edges, bins.edges.length - 1);
  const { step, decimals } = thresholdStep(axisLow, axisHigh);
  const onStep = (value: number): number => thresholdOnStep(value, decimals);
  const set = setOf(threshold, moving, onStep);
  const look = individualThresholdLook(values, set);
  const shown = lineOf(set, look, axisHigh, onStep);
  const plotted = {
    title: individualFullTitle(statistic),
    xLabel: words.xLabel,
    yLabel: INDIVIDUALS_LABEL,
    edges: bins.edges,
    counts: bins.counts,
    threshold: noLegend(shown, look),
  };
  const rows = histogramRows({ ...plotted, threshold: null, description: "" });
  const data = {
    ...plotted,
    description: describedFrom(
      individualHistogramDescription(statistic, rows, null),
      from,
    ),
  };
  const [low, high] = axisOf(data);
  const shortTitle = individualTitle(statistic);
  return {
    plot: {
      data,
      shortTitle,
      threshold: {
        shownLabel: thresholdShownLabel(shortTitle),
        name: individualThresholdName(statistic),
        look,
        counted: "individual",
        slider: { min: low, max: high, step, value: shown },
        box: boxOf(shown, look, step),
        ...wordsOf(shown, look, "individual"),
        onStep,
      },
    },
    noValueLine: noValueThresholdLine(bins.numNaN, look !== "off", from),
    noValueRoom: noValueThresholdLine(bins.numNaN, true, "stopped"),
  };
}

/** The threshold drawn: `moving`, a number being dragged, typed or moved
    with the keys, rounded to the step of the axis by `onStep`; else
    `threshold`, the project's, as it is, since it was rounded to the
    step of its axis when it was set and a result so far that widens the
    axis must not move it; `null` while it is off. */
function setOf(
  threshold: number | null,
  moving: number | null,
  onStep: (value: number) => number,
): number | null {
  return moving === null ? threshold : onStep(moving);
}

/** Where the line of the threshold `set` in the look `look` stands: at
    `set`, or at the top of the axis, `axisHigh`, when it is off, where
    it follows the axis as a result so far widens it. */
function lineOf(
  set: number | null,
  look: ThresholdLook,
  axisHigh: number,
  onStep: (value: number) => number,
): number {
  return look === "off" || set === null ? onStep(axisHigh) : set;
}

/** The box of a threshold whose line stands at `shown`: its number, 1
    when it is off, which `setThreshold` takes as off. */
function boxOf(shown: number, look: ThresholdLook, step: number): BoxRange {
  return {
    value: look === "off" ? 1 : shown,
    // From 0: React Aria would put a number typed on the steps from
    // its least value.
    minValue: 0,
    maxValue: 1,
    step,
    decimals: TYPED_DECIMALS,
  };
}

/** A threshold at `value` drawn with no legend, as the plots of the
    page have none, in grey, dotted, when it keeps every value or is off,
    `look`. */
function noLegend(value: number, look: ThresholdLook): HistogramThreshold {
  return { value, legend: null, keepsAll: look !== "on" };
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

/** What a screen reader hears of a threshold at `shown` in the look
    `look`: the value text of the slider and the description of the
    box. */
function wordsOf(
  shown: number,
  look: ThresholdLook,
  noun: Counted,
): {
  readonly valueText: string;
  readonly hiddenDescription: string | null;
} {
  return {
    valueText: thresholdValueText(shown, look, noun),
    hiddenDescription: thresholdHiddenDescription(look, noun),
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
    result so far or from the variants read before a Stop, `from`, which
    variants it is of. */
function describedFrom(description: string, from: DrawnFrom): string {
  const end = drawnFromDescription(from);
  return end === null ? description : `${description} ${end}`;
}
