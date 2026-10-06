/**
 * The bins of the statistics of each individual, which popnei gives as
 * one value each and does not bin (docs/specs/analyses/individualChecks.md,
 * "The bins of its histograms"). They are the bins of `numpy.histogram`
 * with a number of bins, every edge the same double, so that the Python
 * script gives the same counts as the histograms of the page.
 */

/** The number of bins of each histogram of the statistics of each
    individual, for a few hundred to 10,000 individuals; decided in
    individualChecks.md, and the running application can change it. */
export const INDIVIDUAL_BINS = 20;

/** The bins of a list of values. */
export interface Bins {
  /** The `numBins + 1` edges, increasing: the smallest value first and
      the largest last. */
  readonly edges: Float64Array;
  /** The values in each bin, `numBins` of them. */
  readonly counts: Uint32Array;
  /** The values in no bin, the NaNs. */
  readonly numNaN: number;
}

/**
 * The bins of `values` as `numpy.histogram(values, bins=numBins)` makes
 * them, NaN left out and counted in `numNaN`. The bins span the range of
 * the values, or that value minus 0.5 to it plus 0.5 when every value is
 * the same; edge i is `i * ((max - min) / numBins) + min`, and the last
 * is `max` itself, as numpy's `linspace` computes them. A value falls in
 * the bin whose left edge is at most it and whose right edge is above
 * it, the last bin taking its right edge too. Gives `null` when there is
 * no value or every value is NaN. A `numBins` below 1 or not whole, and
 * an infinite value, which no statistic of popnei gives, are defects,
 * thrown.
 *
 * With `from`, the bins span `from` to the largest value, as
 * `numpy.histogram(values, bins=numBins, range=(from, max))` makes them,
 * or `from` to `from + 1` when the largest value is `from` itself:
 * popgen2.html draws the histograms of the individuals from 0, as those
 * of the variants are, so that the ordinary spread of a few individuals
 * does not look like a tail. A value below `from` is a defect.
 */
export function binValues(
  values: Float64Array,
  numBins: number,
  from: number | null = null,
): Bins | null {
  if (!Number.isInteger(numBins) || numBins < 1) {
    throw defect(
      `a number of bins of ${String(numBins)}, not a whole number of at least 1.`,
    );
  }
  let min = Infinity;
  let max = -Infinity;
  let numNaN = 0;
  for (const value of values) {
    if (Number.isNaN(value)) {
      numNaN += 1;
    } else if (!Number.isFinite(value)) {
      throw defect(`a value of ${String(value)} to bin.`);
    } else {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }
  if (numNaN === values.length) {
    return null;
  }
  if (from !== null && min < from) {
    throw defect(
      `a value of ${String(min)} below the first edge, ${String(from)}.`,
    );
  }
  // numpy widens a range of one value by 0.5 on each side.
  const [first, last] =
    from !== null
      ? [from, max === from ? from + 1 : max]
      : min === max
        ? [min - 0.5, max + 0.5]
        : [min, max];
  const edges = new Float64Array(numBins + 1);
  const step = (last - first) / numBins;
  for (let index = 0; index < numBins; index += 1) {
    edges[index] = index * step + first;
  }
  edges[numBins] = last;

  const counts = new Uint32Array(numBins);
  for (const value of values) {
    if (!Number.isNaN(value)) {
      const index = binOf(value, edges, first, last);
      counts[index] = at(counts, index) + 1;
    }
  }
  return { edges, counts, numNaN };
}

/**
 * The index of the bin of `value`, between `first` and `last`, the
 * outer `edges`: guessed from the arithmetic, as numpy does, and moved to
 * the bin whose edges hold it, since the guess can be one bin off within
 * a rounding of an edge.
 */
function binOf(
  value: number,
  edges: Float64Array,
  first: number,
  last: number,
): number {
  const numBins = edges.length - 1;
  const guess = Math.floor(((value - first) / (last - first)) * numBins);
  let index = Math.min(Math.max(guess, 0), numBins - 1);
  while (index > 0 && value < at(edges, index)) {
    index -= 1;
  }
  while (index < numBins - 1 && value >= at(edges, index + 1)) {
    index += 1;
  }
  return index;
}

/** The number at `index` of `array`, an index this module bounded. */
function at(array: Float64Array | Uint32Array, index: number): number {
  const value = array[index];
  if (value === undefined) {
    throw defect(`no bin at the index ${String(index)}.`);
  }
  return value;
}

/** An error for a state the code makes impossible. */
function defect(message: string): Error {
  return new Error(`popnei_web defect: ${message}`);
}
