/**
 * Whether a threshold that popgen2.html draws on its histograms of the
 * open file keeps every variant or individual with a value, so that the
 * screen draws it in grey, a threshold that removes nothing
 * (docs/plans/popnei-0.2.2.md, "The owner's first round"): of the
 * variants from popnei's 1,000 fine bins over 0 to 1, of the individuals
 * from popnei's value of each. And the step a threshold moves by and the
 * number it is shown and counted at. They change no statistic and are
 * no filter of the project (docs/plans/thresholds.md, "The design").
 */
import type { VariantStatistic } from "./analyses/variantChecks.ts";
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
 * red for a threshold that might remove nothing. Edges that are fewer
 * than two or do not go up, and counts that are not one fewer than the
 * edges, are a defect, thrown.
 */
export function variantsAllKept(
  part: VariantStatsPart,
  statistic: VariantStatistic,
  value: number,
  spacing: number | null,
): boolean {
  const edges = part.binEdges;
  checkEdges(edges);
  const counts = part[statistic].counts;
  if (counts.length !== edges.length - 1) {
    throw defect(
      `${String(counts.length)} bins of ${statistic} over ${String(edges.length)} edges.`,
    );
  }
  const last = counts.findLastIndex((count) => count > 0);
  if (last === -1) return true;
  if (value >= at(edges, last + 1)) return true;
  const first = at(edges, 0);
  return (
    last === 0 &&
    value >= first &&
    spacing !== null &&
    spacing > at(edges, 1) - first
  );
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
 * Whether the threshold `threshold`, which keeps the values at most it,
 * keeps every individual with a value of `values`, popnei's
 * `missingGtRate` or `obsHetRate` of each: true when no value but NaN is
 * above it, and when every value is NaN. The individuals whose value is
 * NaN, with no called genotype for the observed heterozygosity, are in
 * neither count: the threshold alone neither keeps nor removes them,
 * though `individualsKept` (individualsKept.ts), which applies the
 * filters of the project, removes them, since NaN is at most no
 * threshold. Exact for any threshold. A `threshold` that is NaN is a
 * defect, thrown.
 */
export function individualsAllKept(
  values: Float64Array,
  threshold: number,
): boolean {
  if (Number.isNaN(threshold)) {
    throw defect("a threshold of NaN for the individuals.");
  }
  return values.every((value) => Number.isNaN(value) || value <= threshold);
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
