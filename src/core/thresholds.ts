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
 * What the threshold at the fine edge of index `edgeIndex` keeps and
 * removes of the variants of `part`, by `statistic`: kept, the variants
 * of the bins below the edge; removed, those of the bins from it on. The
 * two add up to the variants with a value of the statistic.
 *
 * The screens say that it keeps the values "at most" the threshold,
 * which is not always what this count is. popnei's bins hold their left
 * edge, a value on an edge falling in the bin to its right, while its
 * filters keep the values at most their threshold. So the count equals
 * what popnei's filter at the round number k/1280 keeps on the 464 edges
 * where popnei's edge is the double above k/1280, 0.30000000000000004
 * for 0.3, and on the other 817 it counts as removed the variants whose
 * value is exactly on the edge, which the filter keeps
 * (docs/designs/stats-filters.md, "Exact counts need popnei", on the
 * branch design-stats-filters, with the issue of popnei drafted there
 * for bins that hold their right edge). This is the one function that
 * counts the variants of a threshold, so that the fix of popnei changes
 * it alone.
 *
 * An `edgeIndex` that is not a whole number from 0 to the number of
 * bins, and a part whose counts are not one fewer than its edges, are
 * defects, thrown.
 */
export function variantsAtMost(
  part: VariantStatsPart,
  statistic: VariantStatistic,
  edgeIndex: number,
): ThresholdCounts {
  const counts = part[statistic].counts;
  if (counts.length !== part.binEdges.length - 1) {
    throw defect(
      `${String(counts.length)} bins of ${statistic} over ${String(part.binEdges.length)} edges.`,
    );
  }
  if (
    !Number.isInteger(edgeIndex) ||
    edgeIndex < 0 ||
    edgeIndex > counts.length
  ) {
    throw defect(
      `an edge of index ${String(edgeIndex)} of ${String(counts.length)} bins.`,
    );
  }
  let kept = 0;
  let removed = 0;
  for (const [index, count] of counts.entries()) {
    if (index < edgeIndex) {
      kept += count;
    } else {
      removed += count;
    }
  }
  return { kept, removed };
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
