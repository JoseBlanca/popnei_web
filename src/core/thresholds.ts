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

/** An edge of popnei's fine bins of the variants. */
export interface FineEdge {
  /** Its index among the edges, from 0, the lowest, to the number of
      bins, the highest. */
  readonly index: number;
  /** popnei's edge itself, `binEdges[index]`. */
  readonly value: number;
}

/** What a threshold keeps of the variants. */
export interface VariantCounts {
  /** The fewest variants it may keep. */
  readonly keptLow: number;
  /** The most it may keep. */
  readonly keptHigh: number;
  /** The variants with a value of the statistic. */
  readonly withValue: number;
}

/** What a threshold keeps and removes. */
export interface ThresholdCounts {
  /** The variants or the individuals it keeps. */
  readonly kept: number;
  /** Those it removes. */
  readonly removed: number;
}

/**
 * The edge of `binEdges`, popnei's edges of the fine bins of the
 * variants, nearest to `value`, a number the user typed or dragged; of
 * two as near, the higher. A value below the lowest edge gives the
 * lowest, and one above the highest the highest. The edges are popnei's,
 * k · (1/1280), and not k/1280, which on 464 of the 1,281 edges is the
 * double below popnei's, as 0.3 is below 0.30000000000000004. A `value`
 * that is NaN or infinite, and edges that are fewer than two or do not
 * go up, are defects, thrown.
 */
export function snapToFineEdge(
  binEdges: Float64Array,
  value: number,
): FineEdge {
  if (!Number.isFinite(value)) {
    throw defect(`a threshold of ${String(value)} to snap.`);
  }
  checkEdges(binEdges);
  // The first edge above `value`, or the number of edges when none is.
  let low = 0;
  let high = binEdges.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (at(binEdges, middle) > value) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }
  if (low === 0) return { index: 0, value: at(binEdges, 0) };
  const last = binEdges.length - 1;
  if (low > last) return { index: last, value: at(binEdges, last) };
  const below = at(binEdges, low - 1);
  const above = at(binEdges, low);
  return above - value <= value - below
    ? { index: low, value: above }
    : { index: low - 1, value: below };
}

/**
 * What the threshold at the fine edge of index `edgeIndex` keeps of the
 * variants of `part`, by `statistic`, when it keeps the values at most
 * the edge: from `keptLow`, the variants of the bins below the edge, to
 * `keptHigh`, those and the variants of the bin that starts at the edge
 * when a value may sit exactly on the edge, or `keptLow` again when none
 * can, one number. The variants it removes are `withValue` minus what it
 * keeps.
 *
 * Why a range: popnei's bins hold their left edge, a value on an edge
 * falling in the bin to its right, while its filters keep the values at
 * most their threshold. So the variants on the edge, which "at most"
 * keeps, are somewhere in the bin that starts at it, and the bins cannot
 * tell how many. When a value can sit on the edge:
 *
 * - on an edge equal to k/numBins, `binEdges[k] === k / numBins`, for
 *   every statistic, a missing rate of 10/200 on 0.05;
 * - for the expected heterozygosity, `unbiasedExpHet`, on every edge:
 *   popnei computes it as 1 − Σ pᵏ, which can land on an edge that
 *   popnei made as k · (1/numBins), one double above k/numBins, as
 *   `1 - 0.7` is 0.30000000000000004, popnei's edge 384 of 1,280;
 * - never for the missing rate, the MAF and the observed heterozygosity
 *   on an edge one double above k/numBins: each is one division a/b of
 *   two counts, which rounds to k/numBins when it equals it, the double
 *   below the edge, in the bin to the left and kept, and otherwise lies
 *   far from both;
 * - never on the top edge, index numBins, which keeps every variant.
 *
 * On the 1,280 bins of popnei, 817 of the 1,281 edges equal k/1280,
 * among them every round number a user types, 0.05, 0.1, 0.5. popnei's
 * issue drafted in docs/designs/stats-filters.popnei-issue.md (branch
 * design-stats-filters), bins that hold their right edge, would make every
 * count one number; this is the one function that counts the variants of
 * a threshold, so that the fix changes it alone.
 *
 * An `edgeIndex` that is not a whole number from 0 to the number of
 * bins, and a part whose counts are not one fewer than its edges, are
 * defects, thrown.
 */
export function variantsAtMost(
  part: VariantStatsPart,
  statistic: VariantStatistic,
  edgeIndex: number,
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
    edgeIndex < numBins &&
    (statistic === "unbiasedExpHet" ||
      at(part.binEdges, edgeIndex) === edgeIndex / numBins);
  const keptHigh = onEdgeMayBeKept
    ? keptLow + (counts[edgeIndex] ?? 0)
    : keptLow;
  return { keptLow, keptHigh, withValue };
}

/**
 * What the threshold `threshold` keeps and removes of the individuals
 * whose values are `values`, popnei's `missingGtRate` or `obsHetRate` of
 * each: kept, those whose value is at most the threshold; removed, the
 * others with a value. An individual whose value is NaN, one with no
 * called genotype for the observed heterozygosity, is in neither. Exact
 * for any threshold. A `threshold` that is NaN is a defect, thrown.
 */
export function individualsAtMost(
  values: Float64Array,
  threshold: number,
): ThresholdCounts {
  if (Number.isNaN(threshold)) {
    throw defect("a threshold of NaN for the individuals.");
  }
  let kept = 0;
  let removed = 0;
  for (const value of values) {
    if (Number.isNaN(value)) continue;
    if (value <= threshold) {
      kept += 1;
    } else {
      removed += 1;
    }
  }
  return { kept, removed };
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
