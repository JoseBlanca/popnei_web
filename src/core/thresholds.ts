/**
 * The counts of the thresholds that popgen2.html draws on its histograms
 * of the open file: what a threshold that keeps the values at most it
 * keeps and removes, of the variants from popnei's 1,280 fine bins over
 * 0 to 1, of the individuals from popnei's value of each
 * (docs/plans/thresholds.md, "The design"). They change no statistic and
 * are no filter of the project.
 */
import type { VariantStatistic } from "./analyses/variantChecks.ts";
import type { VariantStatsPart } from "../worker/protocol.ts";

/** What a threshold keeps of the variants. */
export interface VariantCounts {
  /** The fewest variants it may keep. */
  readonly keptLow: number;
  /** The most it may keep. */
  readonly keptHigh: number;
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

/**
 * What the threshold `value`, which keeps the values at most it, keeps
 * of the variants of `part`, by `statistic`, from popnei's fine bins:
 * from `keptLow` to `keptHigh`, one number when the bins can tell. The
 * variants it removes are `withValue` minus what it keeps.
 *
 * - On one of popnei's edges, `value` equal to k/numBins or to popnei's
 *   edge k, as `variantsAtEdge` counts it: the bins below the edge, and
 *   with them the bin that starts at it when `value` is the edge itself,
 *   where a value equal to it falls; one number at k/numBins below an
 *   edge the double above it.
 * - Between two edges, inside the bin from the edge under `value` to the
 *   edge over it: from the bins below the edge under it to the bins
 *   below the edge over it, that bin's variants being on either side of
 *   `value`, one number when the bin is empty. 0.07 lies inside the bin
 *   from 89/1280 to 90/1280, 0.0695 to 0.0703.
 * - Below the first edge, none; at or above the last, every one.
 *
 * popnei's issue drafted in docs/designs/stats-filters.popnei-issue.md
 * (branch design-stats-filters), bins that hold their right edge, would
 * make the count on an edge one number; this is the one function that
 * counts the variants of a threshold, so that the fix changes it alone.
 * A `value` that is NaN or infinite, and edges that are fewer than two
 * or do not go up, are defects, thrown.
 */
export function variantsAtMost(
  part: VariantStatsPart,
  statistic: VariantStatistic,
  value: number,
): VariantCounts {
  if (!Number.isFinite(value)) {
    throw defect(`a threshold of ${String(value)} for the variants.`);
  }
  const edges = part.binEdges;
  checkEdges(edges);
  const numBins = edges.length - 1;
  const nominal = Math.round(value * numBins);
  if (
    nominal >= 0 &&
    nominal <= numBins &&
    (nominal / numBins === value || at(edges, nominal) === value)
  ) {
    return variantsAtEdge(part, statistic, nominal, value);
  }
  // The first edge above `value`, or the number of edges when none is.
  let low = 0;
  let high = edges.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (at(edges, middle) > value) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }
  const top = at(edges, numBins);
  if (low === 0) {
    const { withValue } = variantsAtEdge(part, statistic, numBins, top);
    return { keptLow: 0, keptHigh: 0, withValue };
  }
  if (low > numBins) return variantsAtEdge(part, statistic, numBins, top);
  // `value` lies inside the bin from the edge low - 1 to the edge low.
  const under = variantsAtEdge(part, statistic, low - 1, value);
  const over = variantsAtEdge(part, statistic, low, value);
  return {
    keptLow: under.keptLow,
    keptHigh: over.keptLow,
    withValue: under.withValue,
  };
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
 * What the threshold `value`, at or below the fine edge of index
 * `edgeIndex` and above every value of the bins below it, keeps of the
 * variants of `part`, by `statistic`, when it keeps the values at most
 * it: from `keptLow`, the variants of the bins below the edge, to
 * `keptHigh`, those and the variants of the bin that starts at the edge
 * when `value` is the edge itself, or `keptLow` again when it is not, one
 * number. The variants it removes are `withValue` minus what it keeps.
 *
 * Why a range: popnei's bins hold their left edge, a value on an edge
 * falling in the bin to its right (`bin_of`, the first edge above the
 * value), while its filters keep the values at most their threshold. So
 * the variants on the edge, which "at most" keeps, are somewhere in the
 * bin that starts at it, and the bins cannot tell how many. When `value`
 * is below the edge, a value equal to `value` lies in the bin to the
 * left, already kept, and one on the edge is above `value`, removed: as
 * 0.3, k/1280 for k = 384, is below popnei's edge 384, which popnei made
 * as 384 · (1/1280), 0.30000000000000004, the double above. Neither on
 * the top edge, index numBins, which keeps every variant.
 *
 * On the 1,280 bins of popnei, 817 of the 1,281 edges equal k/1280,
 * among them every multiple of 0.05 a user types, 0.05, 0.1, 0.5.
 *
 * An `edgeIndex` that is not a whole number from 0 to the number of
 * bins, and a part whose counts are not one fewer than its edges, are
 * defects, thrown.
 */
function variantsAtEdge(
  part: VariantStatsPart,
  statistic: VariantStatistic,
  edgeIndex: number,
  value: number,
): VariantCounts {
  const counts = part[statistic].counts;
  const numBins = counts.length;
  if (numBins !== part.binEdges.length - 1) {
    throw defect(
      `${String(numBins)} bins of ${statistic} over ${String(part.binEdges.length)} edges.`,
    );
  }
  if (!Number.isInteger(edgeIndex) || edgeIndex < 0 || edgeIndex > numBins) {
    throw defect(
      `an edge of index ${String(edgeIndex)} of ${String(numBins)} bins.`,
    );
  }
  let keptLow = 0;
  let withValue = 0;
  for (const [index, count] of counts.entries()) {
    if (index < edgeIndex) keptLow += count;
    withValue += count;
  }
  const onEdgeMayBeKept =
    edgeIndex < numBins && at(part.binEdges, edgeIndex) === value;
  const keptHigh = onEdgeMayBeKept
    ? keptLow + (counts[edgeIndex] ?? 0)
    : keptLow;
  return { keptLow, keptHigh, withValue };
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
