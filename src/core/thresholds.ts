/**
 * The counts of the thresholds that popgen2.html draws on its histograms
 * of the open file: what a threshold that keeps the values at most it
 * keeps and removes, of the variants from popnei's 1,000 fine bins over
 * 0 to 1, of the individuals from popnei's value of each
 * (docs/plans/thresholds.md, "The design"; docs/plans/popnei-0.2.2.md).
 * They change no statistic and are no filter of the project.
 */
import { VARIANT_FINE_BINS } from "./analyses/variantChecks.ts";
import type { VariantStatistic } from "./analyses/variantChecks.ts";
import type { VariantStatsPart } from "../worker/protocol.ts";

/** What a threshold keeps of the variants. */
export interface VariantCounts {
  /** The variants it keeps, those whose value is at most it. */
  readonly kept: number;
  /** The variants with a value of the statistic. */
  readonly withValue: number;
}

/** What a threshold keeps and removes of the individuals. */
export interface IndividualCounts {
  /** The individuals it keeps, those with a value at most it. */
  readonly kept: number;
  /** The individuals with a value above it. */
  readonly removed: number;
  /** The individuals with no value, NaN, in neither count. */
  readonly noValue: number;
}

/** The most decimals of a threshold of the variants, 3: every number of
    up to three decimals from 0 to 1 is an edge of popnei's 1,000 fine
    bins, the decimal k / 1,000. */
export const VARIANT_THRESHOLD_DECIMALS = 3;

/** The least threshold of the variants, 0.001, the first edge of popnei's
    fine bins above 0: the first bin holds 0 and the values above it up to
    0.001, so the bins cannot count the variants at most 0. */
export const LEAST_VARIANT_THRESHOLD = 1 / VARIANT_FINE_BINS;

/**
 * What the threshold `value`, which keeps the values at most it, keeps
 * of the variants of `part`, by `statistic`, from popnei's fine bins,
 * each of which holds its right edge: the variants of the bins below the
 * edge `value`, the number popnei's filter of the statistic keeps at
 * `value`. The variants it removes are `withValue` minus `kept`.
 *
 * `value` is an edge of the bins other than the first, as every number of
 * up to three decimals from 0.001 to 1 is on the 1,000 bins over 0 to 1,
 * or a number above the last edge, which keeps every variant. Any other
 * `value` is a defect, thrown: at the first edge, 0, the first bin holds
 * the values on it and those above it, and between two edges the bin
 * holds values on either side. So are edges that are fewer than two or
 * do not go up, and counts that are not one fewer than the edges.
 */
export function variantsAtMost(
  part: VariantStatsPart,
  statistic: VariantStatistic,
  value: number,
): VariantCounts {
  const edges = part.binEdges;
  checkEdges(edges);
  const counts = part[statistic].counts;
  const numBins = edges.length - 1;
  if (counts.length !== numBins) {
    throw defect(
      `${String(counts.length)} bins of ${statistic} over ${String(edges.length)} edges.`,
    );
  }
  let withValue = 0;
  for (const count of counts) withValue += count;
  if (value >= at(edges, numBins)) return { kept: withValue, withValue };
  const first = at(edges, 0);
  const index = Math.round(
    ((value - first) / (at(edges, numBins) - first)) * numBins,
  );
  if (!(index >= 1 && index <= numBins && at(edges, index) === value)) {
    throw defect(
      `a threshold of ${String(value)} for the variants, which is no edge of the bins above the first.`,
    );
  }
  let kept = 0;
  for (const count of counts.subarray(0, index)) kept += count;
  return { kept, withValue };
}

/**
 * The threshold of the variants for `value`, a number typed or a place
 * of the slider: `value` rounded to `decimals` decimals, the decimals of
 * the step of its axis, and to three at most, `thresholdOnStep`, and
 * raised to `LEAST_VARIANT_THRESHOLD` when below it; so an edge of
 * popnei's fine bins, whose count `variantsAtMost` gives. A `value` that
 * is not finite is a defect, thrown.
 */
export function variantThresholdOnStep(
  value: number,
  decimals: number,
): number {
  return Math.max(
    LEAST_VARIANT_THRESHOLD,
    thresholdOnStep(value, Math.min(decimals, VARIANT_THRESHOLD_DECIMALS)),
  );
}

/**
 * Whether `variantThresholdOnStep` raises `value` to
 * `LEAST_VARIANT_THRESHOLD`: `value` rounded as it rounds it is below
 * 0.001, which the screen says in words, since a box never turns a
 * number typed into another one without a word. The rounding to the
 * step of the axis is not counted: the box shows it. A `value` that is
 * not finite is a defect, thrown.
 */
export function variantThresholdRaised(
  value: number,
  decimals: number,
): boolean {
  return (
    thresholdOnStep(value, Math.min(decimals, VARIANT_THRESHOLD_DECIMALS)) <
    LEAST_VARIANT_THRESHOLD
  );
}

/** The step a threshold moves by over an axis, and the decimals it is
    shown and counted with. */
export interface ThresholdStep {
  /** A power of ten: 0.01 on an axis of 0 to 1. */
  readonly step: number;
  /** Its decimals: 2 for 0.01, 0 for 1. */
  readonly decimals: number;
}

/**
 * The step of a threshold over an axis from `low` to `high`: the power of
 * ten that gives at most about 100 positions over it,
 * 10^ceil(log10((high − low) / 100)), 0.01 on an axis of 0 to 1, 0.001 on
 * 0 to 0.1 or on 0.32 to 0.4 (docs/plans/thresholds.md, "Round 1 with
 * the owner"). A span off a power of ten by the error of a subtraction,
 * 0.30000000000000004 − 0.2, takes the step of the power of ten. `high`
 * at most `low`, or either not finite, is a defect, thrown.
 */
export function thresholdStep(low: number, high: number): ThresholdStep {
  if (!(Number.isFinite(low) && Number.isFinite(high) && high > low)) {
    throw defect(`an axis from ${String(low)} to ${String(high)}.`);
  }
  const exponent = Math.ceil(
    Math.log10((high - low) / AXIS_POSITIONS) - SPAN_TOLERANCE,
  );
  const decimals = Math.max(0, -exponent);
  return { step: Number(`1e${String(exponent)}`), decimals };
}

/** The most positions of a threshold over its axis. */
const AXIS_POSITIONS = 100;

/** How far above a power of ten, in its logarithm, a span may be and
    still take that power's step: the error of a subtraction of two
    doubles, far below a digit a user sees. */
const SPAN_TOLERANCE = 1e-9;

/** `value` rounded to `decimals` decimals, the nearest half up, the
    number a threshold is shown and counted at: 0.07 for 0.0734 and 0.15
    for 0.145 with 2. The point is shifted in the text, where 0.145 × 100
    is 14.499999999999998 and `toFixed` gives 0.14. A `value` that is not
    finite is a defect, thrown. */
export function thresholdOnStep(value: number, decimals: number): number {
  if (!Number.isFinite(value)) {
    throw defect(`a threshold of ${String(value)} to round.`);
  }
  const text = String(value);
  if (text.includes("e")) return Number(value.toFixed(decimals));
  const units = Math.round(Number(`${text}e${String(decimals)}`));
  return Number(`${String(units)}e-${String(decimals)}`);
}

/**
 * What the threshold `threshold` keeps and removes of the individuals
 * whose values are `values`, popnei's `missingGtRate` or `obsHetRate` of
 * each: kept, those whose value is at most the threshold; removed, the
 * others with a value; and apart, `noValue`, the individuals whose value
 * is NaN, with no called genotype for the observed heterozygosity. Exact
 * for any threshold.
 *
 * The threshold alone removes none of those with no value, but
 * `individualsKept` (individualsKept.ts), which applies the filters of
 * the project, removes them, since NaN is at most no threshold; so when
 * the threshold becomes a filter, the individuals it removes are
 * `removed` plus `noValue`. A `threshold` that is NaN is a defect,
 * thrown.
 */
export function individualsAtMost(
  values: Float64Array,
  threshold: number,
): IndividualCounts {
  if (Number.isNaN(threshold)) {
    throw defect("a threshold of NaN for the individuals.");
  }
  let kept = 0;
  let removed = 0;
  let noValue = 0;
  for (const value of values) {
    if (Number.isNaN(value)) {
      noValue += 1;
      continue;
    }
    if (value <= threshold) {
      kept += 1;
    } else {
      removed += 1;
    }
  }
  return { kept, removed, noValue };
}

/** Throws a defect when `binEdges` are fewer than two or do not go up. */
function checkEdges(binEdges: Float64Array): void {
  if (binEdges.length < 2) {
    throw defect(`${String(binEdges.length)} edges of bins, fewer than two.`);
  }
  for (let index = 1; index < binEdges.length; index += 1) {
    if (!(at(binEdges, index) > at(binEdges, index - 1))) {
      throw defect(`edges of bins that do not go up at ${String(index)}.`);
    }
  }
}

/** The number at `index` of `array`, an index this module bounded. */
function at(array: Float64Array, index: number): number {
  const value = array[index];
  if (value === undefined) {
    throw defect(`no edge at the index ${String(index)}.`);
  }
  return value;
}

/** An error for a state the code makes impossible. */
function defect(message: string): Error {
  return new Error(`popnei_web defect: ${message}`);
}
