/**
 * The bins of the statistics of each individual, which popnei gives as
 * one value each and does not bin (docs/specs/analyses/individualChecks.md,
 * "The bins of its histograms"). They are the bins of `numpy.histogram`
 * with a number of bins, every edge the same double, so that the Python
 * script gives the same counts as the histograms of the page. And the
 * range of an axis rounded out to round numbers, over which popgen2.html
 * draws its histograms (docs/plans/file-stats.md, "Round 1 with the
 * owner").
 */

/** The number of bins of each histogram of the statistics of each
    individual, for a few hundred to 10,000 individuals; decided in
    individualChecks.md, and the running application can change it. */
export const INDIVIDUAL_BINS = 20;

/** The bins of a list of values. */
export interface Bins {
  /** The `numBins + 1` edges, increasing: the smallest and the largest
      value, or the ends of `range` when it is given, first and last. */
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
 * With `range`, the bins span it, as `numpy.histogram(values,
 * bins=numBins, range=range)` makes them: popgen2.html bins the
 * statistics of each individual over their range rounded out to round
 * numbers, `binValuesRounded`. A value outside the range, and a range
 * that does not go up, are defects.
 */
export function binValues(
  values: Float64Array,
  numBins: number,
  range: readonly [number, number] | null = null,
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
  if (range !== null) {
    const [low, high] = range;
    if (!(low < high)) {
      throw defect(
        `a range of the bins from ${String(low)} to ${String(high)}, which does not go up.`,
      );
    }
    for (const value of [min, max]) {
      if (value < low || value > high) {
        throw defect(
          `a value of ${String(value)} outside the range ${String(low)} to ${String(high)}.`,
        );
      }
    }
  }
  // numpy widens a range of one value by 0.5 on each side.
  const [first, last] =
    range ?? (min === max ? [min - 0.5, max + 0.5] : [min, max]);
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

/** A step an axis is rounded to: `units`, 1, 2 or 5, over 10 raised to
    `decimals`, so that a multiple of it is written as a whole number over
    a power of ten, the double nearest the round number. */
interface Step {
  readonly units: 1 | 2 | 5;
  readonly decimals: number;
}

/** The steps of an axis of proportions, from 0.000001 up to 1. */
const STEPS: readonly Step[] = Object.freeze(
  [6, 5, 4, 3, 2, 1, 0].flatMap((decimals) =>
    ([1, 2, 5] as const).map((units) => ({ units, decimals })),
  ),
);

/** The most steps the rounded range spans before the ends are rounded:
    the step is the smallest that the values span 10 of at most. */
const MOST_STEPS = 10;

/** The step of a range of one value: a tenth of the range of a
    proportion. */
const STEP_OF_ONE_VALUE: Step = Object.freeze({ units: 1, decimals: 1 });

/**
 * The range of an axis of proportions from `low` to `high`, rounded out to
 * multiples of a round step, 1, 2 or 5 times a power of ten: the smallest
 * step of at least `smallestStep` that `high - low` spans 10 of at most,
 * `low` rounded down to a multiple of it and `high` up. The ends are the
 * doubles nearest the round numbers, 0.3 and not 0.30000000000000004. A
 * range of one value is the step of 0.1 that holds it, from the multiple
 * of 0.1 at or below it, and from 0.9 to 1 for 1. On panel.nei the missing
 * rate of the variants, from 0 to 0.0805, gives 0 to 0.1 at steps of 0.05
 * at least. `low` and `high` outside 0 to 1, or `low` above `high`, are a
 * defect.
 */
export function roundedRange(
  low: number,
  high: number,
  smallestStep: number,
): readonly [number, number] {
  if (!(low >= 0 && low <= high && high <= 1)) {
    throw defect(
      `a range of ${String(low)} to ${String(high)} to round, not within 0 to 1.`,
    );
  }
  if (low === high) {
    const step = STEP_OF_ONE_VALUE;
    const last = Math.min(roundDown(low, step) + valueOf(step, 1), 1);
    return [roundDown(last - valueOf(step, 1), step), roundUp(last, step)];
  }
  const step = STEPS.find(
    (one) =>
      valueOf(one, 1) >= smallestStep &&
      high - low <= MOST_STEPS * valueOf(one, 1),
  );
  if (step === undefined) {
    throw defect(`no step of at least ${String(smallestStep)} up to 1.`);
  }
  return [roundDown(low, step), roundUp(high, step)];
}

/** `multiple` times `step`, as a whole number over a power of ten. */
function valueOf(step: Step, multiple: number): number {
  return (multiple * step.units) / 10 ** step.decimals;
}

/** The largest multiple of `step` at most `value`. */
function roundDown(value: number, step: Step): number {
  let multiple = Math.floor((value * 10 ** step.decimals) / step.units);
  while (valueOf(step, multiple) > value) multiple -= 1;
  while (valueOf(step, multiple + 1) <= value) multiple += 1;
  return valueOf(step, multiple);
}

/** The smallest multiple of `step` at least `value`. */
function roundUp(value: number, step: Step): number {
  let multiple = Math.ceil((value * 10 ** step.decimals) / step.units);
  while (valueOf(step, multiple) < value) multiple += 1;
  while (valueOf(step, multiple - 1) >= value) multiple -= 1;
  return valueOf(step, multiple);
}

/** The smallest step of the range of the statistics of each individual:
    a few hundred individuals spread over less than 0.01 are drawn over
    a range of a few thousandths. */
export const INDIVIDUAL_SMALLEST_STEP = 0.001;

/**
 * The bins of `values` as `binValues` makes them over the range of the
 * values rounded out to round numbers, `roundedRange` with steps of
 * `INDIVIDUAL_SMALLEST_STEP` at least, from 0 when `fromZero`, as
 * popgen2.html draws the statistics of each individual, the missing rate
 * from 0. Gives `null` when there is no value or every value is NaN.
 */
export function binValuesRounded(
  values: Float64Array,
  numBins: number,
  fromZero: boolean,
): Bins | null {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (!Number.isNaN(value)) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }
  if (min > max) return null;
  const range = roundedRange(fromZero ? 0 : min, max, INDIVIDUAL_SMALLEST_STEP);
  return binValues(values, numBins, range);
}
