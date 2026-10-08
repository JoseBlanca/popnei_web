/**
 * Whether a threshold that popgen2.html draws on its histograms of the
 * open file keeps every variant or individual with a value, so that the
 * screen draws it in grey, a threshold that removes nothing of its plot
 * (docs/specs/steps/popgen2-filters.md, "A threshold, on and off"): of
 * the variants from popnei's 1,000 fine bins over 0 to 1, of the
 * individuals from popnei's value of each; and its look, on, on and
 * grey, or off, which is grey too. And the step a threshold moves by and
 * the number it is shown at. Each threshold is a filter of the project,
 * `setThreshold` of project.ts; these tell only how it is drawn.
 */
import type { VariantStatistic } from "./analyses/variantChecks.ts";
import { thresholdIsOff } from "./project.ts";
import type { VariantStatsPart } from "../worker/protocol.ts";

/** The most decimals of a threshold of the variants, 3: every number of
    up to three decimals from 0 to 1 is an edge of popnei's 1,000 fine
    bins, the decimal k / 1,000. */
export const VARIANT_THRESHOLD_DECIMALS = 3;

/**
 * Whether the threshold `value`, which keeps the values at most it, keeps
 * every variant of `part` with a value of `statistic`, the variants of
 * popnei's fine bins, each of which holds its right edge: true when
 * `value` is at least the right edge of the last bin with a count, or
 * when no bin has one. `spacing` is the least distance between two values
 * the statistic can take, `variantValueSpacing` of variantChecks.ts, or
 * `null` when it is not known.
 *
 * The bins tell it exactly at every edge but 0, as every number of up to
 * three decimals from 0 to 1 is on the 1,000 bins over 0 to 1: at an
 * edge below the right edge of the last bin with a count, that bin holds
 * values above `value`. At 0, the first edge, the first bin holds 0 and
 * the values above it up to the next edge, so when every variant is in it
 * the threshold keeps them all only if the values are spaced wider than
 * the bin, `spacing`, and the bin then holds 0 alone: the missing rate of
 * fewer than 1,000 individuals. Otherwise the answer is false, a line in
 * red for a threshold that might remove nothing.
 *
 * A `value` below the right edge of the last bin with a count that is no
 * edge of the bins is a defect, thrown, since the bin around it holds
 * values on both sides of it: `variantThresholdOnStep` makes every
 * threshold an edge. So are edges that are fewer than two or do not go
 * up, and counts that are not one fewer than the edges.
 */
export function variantsAllKept(
  part: VariantStatsPart,
  statistic: VariantStatistic,
  value: number,
  spacing: number | null,
): boolean {
  const edges = part.binEdges;
  const counts = checkedCounts(part, statistic);
  const last = counts.findLastIndex((count) => count > 0);
  if (last === -1) return true;
  if (value >= at(edges, last + 1)) return true;
  const first = at(edges, 0);
  return (
    edgeIndexOf(edges, value) === 0 &&
    last === 0 &&
    spacing !== null &&
    spacing > at(edges, 1) - first
  );
}

/**
 * Whether the threshold `value`, which keeps the values at most it, keeps
 * no variant of `part` with a value of `statistic`, read from popnei's
 * fine bins, each of which holds its right edge, the first holding its
 * left edge, 0, too: true when the bins whose right edge is at most
 * `value` hold no variant; at 0, the first edge, when the first bin holds
 * none, since it holds 0 and the values above it up to the next edge, so
 * a variant in it may be at 0 and kept (docs/specs/analyses/writeVariants.md,
 * "The functions of core", `noVariantForCertain`). A variant with no value
 * of `statistic` is in no bin, and is not kept at any threshold.
 *
 * A `value` that is no edge of the bins is a defect, thrown, since the
 * bin around it holds values on both sides of it: `variantThresholdOnStep`
 * makes every threshold an edge. So are edges that are fewer than two or
 * do not go up, and counts that are not one fewer than the edges.
 */
export function variantsNoneKept(
  part: VariantStatsPart,
  statistic: VariantStatistic,
  value: number,
): boolean {
  const edges = part.binEdges;
  const counts = checkedCounts(part, statistic);
  // The bins below the edge at `index` hold the values at most it; at 0,
  // the first bin, which holds 0, decides.
  const index = Math.max(1, edgeIndexOf(edges, value));
  return counts.subarray(0, index).every((count) => count === 0);
}

/** The counts of `statistic` in `part`; a defect, thrown, when its
    edges are fewer than two or do not go up, or the counts are not one
    fewer than the edges. */
function checkedCounts(
  part: VariantStatsPart,
  statistic: VariantStatistic,
): Uint32Array {
  const edges = part.binEdges;
  checkEdges(edges);
  const counts = part[statistic].counts;
  if (counts.length !== edges.length - 1) {
    throw defect(
      `${String(counts.length)} bins of ${statistic} over ${String(edges.length)} edges.`,
    );
  }
  return counts;
}

/** The index of `value` among `edges`, evenly spaced as popnei's are;
    a defect, thrown, when `value` is none of them. */
function edgeIndexOf(edges: Float64Array, value: number): number {
  const numBins = edges.length - 1;
  const first = at(edges, 0);
  const index = Math.round(
    ((value - first) / (at(edges, numBins) - first)) * numBins,
  );
  if (!(index >= 0 && index <= numBins && at(edges, index) === value)) {
    throw defect(
      `a threshold of ${String(value)} for the variants, which is no edge of the bins.`,
    );
  }
  return index;
}

/**
 * The threshold of the variants for `value`, a number typed or a place
 * of the slider: `value` rounded to `decimals` decimals, the decimals of
 * the step of its axis, and to three at most, `thresholdOnStep`; so an
 * edge of popnei's fine bins, 0 among them, which popnei's filters apply
 * exactly. A `value` that is not finite is a defect, thrown.
 */
export function variantThresholdOnStep(
  value: number,
  decimals: number,
): number {
  return thresholdOnStep(value, Math.min(decimals, VARIANT_THRESHOLD_DECIMALS));
}

/** The step a threshold moves by over an axis, and the decimals it is
    shown with. */
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
    number a threshold is shown at: 0.07 for 0.0734 and 0.15
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
 * Whether the threshold `threshold`, which keeps the values at most it,
 * keeps every individual with a value of `values`, popnei's
 * `missingGtRate` or `obsHetRate` of each: true when some value is not
 * NaN and no value but NaN is above it. The individuals whose value is
 * NaN, with no called genotype for the observed heterozygosity, are in
 * neither count: the threshold alone neither keeps nor removes them,
 * though `individualsKept` (individualsKept.ts), which applies the
 * filters of the project, removes them, since NaN is at most no
 * threshold. So when every value is NaN, or there is none, the answer is
 * false: there is no individual with a value to keep, and a filter would
 * remove them all. Exact for any threshold. A `threshold` that is NaN is
 * a defect, thrown.
 */
export function individualsAllKept(
  values: Float64Array,
  threshold: number,
): boolean {
  if (Number.isNaN(threshold)) {
    throw defect("a threshold of NaN for the individuals.");
  }
  return (
    values.some((value) => !Number.isNaN(value)) &&
    values.every((value) => Number.isNaN(value) || value <= threshold)
  );
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

/** How a threshold is drawn: `on`, a filter that removes some value of
    its plot, its line red and dashed; `grey`, a filter on that keeps
    every value of its plot; `off`, no filter, its line at the top of the
    axis and 1 in its box. `grey` and `off` are both drawn in the grey of
    `--chart-threshold-keeps-all`, the line dotted and the handle hollow. */
export type ThresholdLook = "on" | "grey" | "off";

/** The look of the threshold `value` of the variants of `statistic`
    over `part`, as `variantsAllKept` tells it with `spacing`: `off` for
    `null` and for 1, which `setThreshold` takes as off; `grey` when it
    keeps every variant of the plot; `on` otherwise. A `value` that is
    not an edge of the bins below their last count is a defect, thrown,
    as there. */
export function variantThresholdLook(
  part: VariantStatsPart,
  statistic: VariantStatistic,
  value: number | null,
  spacing: number | null,
): ThresholdLook {
  if (thresholdIsOff(value)) return "off";
  return variantsAllKept(part, statistic, value, spacing) ? "grey" : "on";
}

/** The look of the threshold `value` of the individuals with the values
    `values`, as `individualsAllKept` tells it: `off` for `null` and for
    1, `grey` when it keeps every individual with a value, `on`
    otherwise, every value NaN among it. */
export function individualThresholdLook(
  values: Float64Array,
  value: number | null,
): ThresholdLook {
  if (thresholdIsOff(value)) return "off";
  return individualsAllKept(values, value) ? "grey" : "on";
}

/** An error for a state the code makes impossible. */
function defect(message: string): Error {
  return new Error(`popnei_web defect: ${message}`);
}
