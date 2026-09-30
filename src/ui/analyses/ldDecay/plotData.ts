/**
 * The data of the line plot of the LD decay, made from the result and the
 * largest distance (docs/specs/analyses/ldDecay.md, "What it shows", the
 * plot): one series per population drawn, the first `LD_PLOT_MAX_POPS` of
 * the result in its order, with the mean r² of each bin with a pair at
 * the middle of the bin as its points, its fitted curve as its line, and
 * a mark at its half distance, at half of its r² at 0; the ranges of the
 * two axes; the labels of the legend and the description of core. Pure,
 * so that a test in node checks it.
 */

import {
  LD_PLOT_MAX_POPS,
  ldDecayCurve,
  ldDecayDescription,
  ldLegendLabel,
} from "../../../core/analyses/ldDecay.ts";
import type { LineData, LineSeries } from "../../../charts/line.ts";
import type { LdDecayResult } from "../../../worker/protocol.ts";
import { LD_PLOT_TITLE, LD_X_LABEL, LD_Y_LABEL } from "./words.ts";

/** The top of the vertical axis when nothing above 0 is drawn. */
const EMPTY_TOP = 1;

/**
 * The top of the vertical axis: the largest finite value of `values`
 * rounded up to a tenth, at most 1; and 1 when there is none, or when
 * the rounded top is 0, which the line plot refuses as a range from 0 to
 * 0 (ldDecay.md says 0 to 1 when nothing is drawn; everything drawn at 0
 * is taken the same way, as the orchestrator decided for task 8.1).
 */
export function ldYTop(values: Iterable<number>): number {
  let largest = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (Number.isFinite(value) && value > largest) {
      largest = value;
    }
  }
  if (largest <= 0) {
    return EMPTY_TOP;
  }
  // In whole tenths, so that 0.3, whose tenfold is 3.0000000000000004 in
  // floats, rounds up to 0.3 and not to 0.4.
  let tenths = Math.ceil(largest * 10);
  if ((tenths - 1) / 10 >= largest) {
    tenths -= 1;
  }
  return Math.min(1, tenths / 10);
}

/** The points of the population `i` of `r`: the middle of each bin with
    a pair, (smallest + largest) / 2, 1000.5 for the bin from 1 to 2,000,
    and its mean r². */
function pointsOf(r: LdDecayResult, i: number): LineSeries["points"] {
  const numBins = r.smallestDist.length;
  const x: number[] = [];
  const y: number[] = [];
  for (let bin = 0; bin < numBins; bin++) {
    const at = i * numBins + bin;
    const pairs = r.numPairs[at];
    const meanR2 = r.meanR2[at];
    const smallest = r.smallestDist[bin];
    const largest = r.largestDist[bin];
    if (
      pairs === undefined ||
      meanR2 === undefined ||
      smallest === undefined ||
      largest === undefined
    ) {
      throw new Error(
        `popnei_web defect: the result of the LD decay has no bin ${String(bin)} for the population ${String(i)}.`,
      );
    }
    if (pairs > 0) {
      x.push((smallest + largest) / 2);
      y.push(meanR2);
    }
  }
  return { x: Float64Array.from(x), y: Float64Array.from(y) };
}

/** The mark of the population `i` of `r`: at its half distance, at half
    of its r² at 0, when the half distance is finite and at most
    `maxDist`; none otherwise. */
function marksOf(
  r: LdDecayResult,
  i: number,
  maxDist: number,
): LineSeries["marks"] {
  const halfDist = r.halfDist[i];
  const r2AtZero = r.r2AtZero[i];
  if (halfDist === undefined || r2AtZero === undefined) {
    throw new Error(
      `popnei_web defect: the result of the LD decay has no curve for the population ${String(i)}.`,
    );
  }
  return Number.isFinite(halfDist) && halfDist <= maxDist
    ? [{ x: halfDist, y: r2AtZero / 2 }]
    : [];
}

/**
 * The data of the plot of `r` at the largest distance `maxDist`: the
 * first `LD_PLOT_MAX_POPS` populations, in the order of the result; the
 * horizontal axis from 0 to `maxDist`, in whole base pairs, and the
 * vertical from 0 to `ldYTop` of the points and the curves.
 *
 * The group of each series, its colour and its shape, is its place among
 * the populations drawn, 0 to 15, and not among every population of the
 * metadata file, as ldDecay.md has it: the marks repeat every 49 groups,
 * and with 50 populations or more two curves drawn would share one mark,
 * which the line plot refuses (point 14 of
 * docs/plans/population-analyses.report.md, for the owner at stop C).
 */
export function ldDecayPlotData(r: LdDecayResult, maxDist: number): LineData {
  const drawn = r.pops.slice(0, LD_PLOT_MAX_POPS);
  const series = drawn.map((_pop, i): LineSeries => ({
    label: ldLegendLabel(r, i, maxDist),
    group: i,
    points: pointsOf(r, i),
    line: ldDecayCurve(r, i, maxDist),
    marks: marksOf(r, i, maxDist),
  }));
  const top = ldYTop(
    series.flatMap((one) => [
      ...one.points.y,
      ...(one.line?.y ?? []),
      ...one.marks.map((mark) => mark.y),
    ]),
  );
  return {
    title: LD_PLOT_TITLE,
    description: ldDecayDescription(r, maxDist),
    xLabel: LD_X_LABEL,
    yLabel: LD_Y_LABEL,
    series,
    xDomain: [0, maxDist],
    yDomain: [0, top],
    xWholeNumbers: true,
    yWholeNumbers: false,
  };
}
