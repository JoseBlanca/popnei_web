/**
 * The data of the line plot of the LD decay, made from the result, the
 * largest distance and the populations of the project
 * (docs/specs/analyses/ldDecay.md, "What it shows", the plot): one series
 * per population drawn, the first `LD_PLOT_MAX_POPS` of the result in its
 * order, with the mean r² of each bin with a pair at the middle of the
 * bin as its points, its fitted curve as its line, and a mark at its half
 * distance, at half of its r² at 0; the group of each, its colour and
 * its shape; the ranges of the two axes; the labels of the legend and
 * the description of core. Pure, so that a test in node checks it.
 */

import {
  LD_PLOT_MAX_POPS,
  ldDecayCurve,
  ldDecayDescription,
  ldHalfMark,
  ldLegendLabel,
  valueAt,
} from "../../../core/analyses/ldDecay.ts";
import { MAX_LINE_SERIES } from "../../../charts/limits.ts";
import type { LineData, LineSeries } from "../../../charts/line.ts";
import type { LdDecayResult, Pops } from "../../../worker/protocol.ts";
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
    if (valueAt(r.numPairs, at, "numPairs") > 0) {
      x.push(
        (valueAt(r.smallestDist, bin, "smallestDist") +
          valueAt(r.largestDist, bin, "largestDist")) /
          2,
      );
      y.push(valueAt(r.meanR2, at, "meanR2"));
    }
  }
  return { x: Float64Array.from(x), y: Float64Array.from(y) };
}

/**
 * The group of each population `drawn`, its colour and its shape
 * (ldDecay.md, "What it shows"): its place among the populations of the
 * project, `populationsOf(p)`, whether or not the filters empty those
 * before it, so that it has one mark here and in the principal
 * components, which number their groups the same way (`pcaColours` of
 * core). The marks repeat every `MAX_LINE_SERIES` groups, 49, and two
 * series of one mark are refused by the line plot; so with more
 * populations than that in the project, and for the one population of
 * every individual, the group is the place among the populations drawn
 * (point 14 of docs/plans/population-analyses.report.md). Throws a
 * defect on a population drawn that the project does not have, since a
 * result is shown under the key of its populations.
 */
export function ldGroups(
  drawn: readonly string[],
  pops: Pops | "all" | null,
): readonly number[] {
  if (pops === null || pops === "all" || pops.length > MAX_LINE_SERIES) {
    return drawn.map((_pop, i) => i);
  }
  const placeOf = new Map(pops.map(([name], place) => [name, place]));
  return drawn.map((pop) => {
    const place = placeOf.get(pop);
    if (place === undefined) {
      throw new Error(
        "popnei_web defect: the plot of the LD decay draws a population the project does not have.",
      );
    }
    return place;
  });
}

/**
 * The data of the plot of `r` at the largest distance `maxDist`, for a
 * project whose populations are `pops`, `populationsOf(p)`: the first
 * `LD_PLOT_MAX_POPS` populations, in the order of the result, each in the
 * group `ldGroups` gives it; the horizontal axis from 0 to `maxDist`, in
 * whole base pairs, and the vertical from 0 to `ldYTop` of the points,
 * the curves and the marks.
 */
export function ldDecayPlotData(
  r: LdDecayResult,
  maxDist: number,
  pops: Pops | "all" | null,
): LineData {
  const drawn = r.pops.slice(0, LD_PLOT_MAX_POPS);
  const series = ldGroups(drawn, pops).map((group, i): LineSeries => {
    const mark = ldHalfMark(r, i, maxDist);
    return {
      label: ldLegendLabel(r, i, maxDist),
      group,
      points: pointsOf(r, i),
      line: ldDecayCurve(r, i, maxDist),
      marks: mark === null ? [] : [mark],
    };
  });
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
