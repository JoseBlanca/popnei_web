/**
 * The tests of the data of the plot of the LD decay
 * (docs/specs/analyses/ldDecay.md, "What it shows", the plot): the points
 * at the middle of each bin with a pair, the curve of core, the mark at
 * half of the r² at 0, the first 16 populations numbered among those
 * drawn, and the ranges of the axes. The result is written as a literal
 * of two populations that differ in every number, so that a population
 * read at the index of the other fails.
 */

import { describe, expect, test } from "vitest";
import {
  LD_PLOT_MAX_POPS,
  ldDecayCurve,
  ldDecayDescription,
} from "../../../core/analyses/ldDecay.ts";
import { MAX_LINE_SERIES } from "../../../charts/limits.ts";
import type { LdDecayResult } from "../../../worker/protocol.ts";
import { ldDecayPlotData, ldYTop } from "./plotData.ts";

const NAN = Number.NaN;

/** A result over four bins up to 1,000 bp of a population per element
    of `halfDists`, with that half distance: `pop_a`, with 30 individuals,
    pairs in the bins 1, 3 and 4 and an r² at 0 of 0.4; `pop_b`, with 45,
    pairs in the bins 1, 2 and 4 and an r² at 0 of 0.37; and `q2`, `q3`,
    … after them with `pop_a`'s numbers. A NaN half distance has no
    curve. */
function resultOf(
  halfDists: readonly number[] = [412.6, 8.3456],
): LdDecayResult {
  const others = Array.from({ length: halfDists.length - 2 }, (_, i) => i);
  const aBins = <T>(a: readonly T[], b: readonly T[]): T[] => [
    ...a,
    ...b,
    ...others.flatMap(() => a),
  ];
  return {
    analysis: "ldDecay",
    pops: halfDists.map((_, i) =>
      i === 0 ? "pop_a" : i === 1 ? "pop_b" : `q${String(i)}`,
    ),
    numIndividuals: Uint32Array.from(aBins([30], [45])),
    numVars: Float64Array.from(aBins([120], [98])),
    smallestDist: Float64Array.from([1, 251, 501, 751]),
    largestDist: Float64Array.from([250, 500, 750, 1000]),
    numPairs: Float64Array.from(aBins([10, 0, 7, 3], [4, 6, 0, 2])),
    meanR2: Float64Array.from(
      aBins([0.41, NAN, 0.22, 0.13], [0.35, 0.28, NAN, 0.09]),
    ),
    sdR2: Float64Array.from(
      aBins([0.2, NAN, 0.11, 0.05], [0.15, 0.12, NAN, 0.04]),
    ),
    rhoPerBp: Float64Array.from(
      halfDists.map((half, i) =>
        Number.isNaN(half) ? NAN : i === 1 ? 0.0034 : 0.0021,
      ),
    ),
    r2AtZero: Float64Array.from(
      halfDists.map((half, i) =>
        Number.isNaN(half) ? NAN : i === 1 ? 0.37 : 0.4,
      ),
    ),
    halfDist: Float64Array.from(halfDists),
    passStats: { numVars: 150, filtering: {} },
  };
}

describe("PA8 D1 the data of the plot of the LD decay", () => {
  test("each population's points are its own bins with a pair, at the middle of each bin, (smallest + largest) / 2", () => {
    const [a, b] = ldDecayPlotData(resultOf(), 1000).series;
    expect(Array.from(a?.points.x ?? [])).toEqual([125.5, 625.5, 875.5]);
    expect(Array.from(a?.points.y ?? [])).toEqual([0.41, 0.22, 0.13]);
    expect(Array.from(b?.points.x ?? [])).toEqual([125.5, 375.5, 875.5]);
    expect(Array.from(b?.points.y ?? [])).toEqual([0.35, 0.28, 0.09]);
  });

  test("each population's mark is at its own half distance, at half of its own r² at 0, and its line is its curve of core", () => {
    const r = resultOf();
    const [a, b] = ldDecayPlotData(r, 1000).series;
    expect(a?.marks).toEqual([{ x: 412.6, y: 0.2 }]);
    expect(b?.marks).toEqual([{ x: 8.3456, y: 0.185 }]);
    expect(a?.line).toEqual(ldDecayCurve(r, 0, 1000));
    expect(b?.line).toEqual(ldDecayCurve(r, 1, 1000));
    expect(a?.line?.y).not.toEqual(b?.line?.y);
  });

  test("a half distance beyond the largest distance has no mark, one at it has, and a population with no curve has no line and no mark", () => {
    const r = resultOf([1599810.0655818006, 8.3456, NAN, 1000]);
    const series = ldDecayPlotData(r, 1000).series;
    expect(series.map((one) => one.marks)).toEqual([
      [],
      [{ x: 8.3456, y: 0.185 }],
      [],
      [{ x: 1000, y: 0.2 }],
    ]);
    expect(series[2]?.line).toBeNull();
    expect(series[2]?.points.x).toHaveLength(3);
  });

  test("the labels of the legend and the description are core's, and the axes are named", () => {
    const r = resultOf([1599810.0655818006, 8.3456, NAN]);
    const data = ldDecayPlotData(r, 1000);
    expect(data.series.map((one) => one.label)).toEqual([
      "pop_a · half at 1,599,810 bp, beyond the plot",
      "pop_b · half at 8.35 bp",
      "q2 · no curve",
    ]);
    expect(data.description).toBe(ldDecayDescription(r, 1000));
    expect(data.title).toBe("LD decay");
    expect(data.xLabel).toBe("Distance between the two variants (bp)");
    expect(data.yLabel).toBe("Mean r² of the pairs");
  });

  test("of 60 populations draws the first 16, numbered 0 to 15 among those drawn, so that no two share a mark", () => {
    const halfDists = Array.from({ length: 60 }, (_, i) =>
      i === 1 ? 8.3456 : 400 + i,
    );
    const series = ldDecayPlotData(resultOf(halfDists), 1000).series;
    expect(LD_PLOT_MAX_POPS).toBe(16);
    expect(LD_PLOT_MAX_POPS).toBeLessThanOrEqual(MAX_LINE_SERIES);
    expect(series.map((one) => one.group)).toEqual(
      Array.from({ length: 16 }, (_, i) => i),
    );
    expect(series[15]?.label).toBe("q15 · half at 415 bp");
  });

  test("the horizontal axis runs from 0 to the largest distance in whole base pairs, and the vertical from 0 to the largest value rounded up to a tenth", () => {
    const data = ldDecayPlotData(resultOf(), 1000);
    expect(data.xDomain).toEqual([0, 1000]);
    expect(data.xWholeNumbers).toBe(true);
    expect(data.yWholeNumbers).toBe(false);
    // The curve of pop_a at 0, 0.4793…, is the largest value drawn.
    expect(data.yDomain).toEqual([0, 0.5]);
  });

  test("ldYTop rounds up to a tenth, 0.3 to itself, at most 1, and gives 1 for nothing drawn or everything at 0", () => {
    expect(ldYTop([0.3])).toBe(0.3);
    expect(ldYTop([0.7])).toBe(0.7);
    expect(ldYTop([0.1])).toBe(0.1);
    expect(ldYTop([0.30001])).toBe(0.4);
    expect(ldYTop([0.05, NAN, 0.46942148760330576])).toBe(0.5);
    expect(ldYTop([1.2])).toBe(1);
    expect(ldYTop([])).toBe(1);
    expect(ldYTop([NAN])).toBe(1);
    expect(ldYTop([0, 0])).toBe(1);
  });

  test("with no pair and no curve anywhere the vertical axis runs from 0 to 1", () => {
    const r = { ...resultOf([NAN, NAN]), numPairs: new Float64Array(8) };
    const data = ldDecayPlotData(r, 1000);
    expect(data.yDomain).toEqual([0, 1]);
    expect(data.series.map((one) => one.points.x.length)).toEqual([0, 0]);
  });
});
