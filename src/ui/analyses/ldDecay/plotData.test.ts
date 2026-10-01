/**
 * The tests of the data of the plot of the LD decay
 * (docs/specs/analyses/ldDecay.md, "What it shows", the plot): the points
 * at the middle of each bin with a pair, the curve of core, the mark at
 * half of the r² at 0, the first 16 populations, each in the group of
 * its place among the populations of the project, and the ranges of the
 * axes. The result is written as a literal
 * of two populations that differ in every number, so that a population
 * read at the index of the other fails.
 */

import { describe, expect, test } from "vitest";
import { LD_PLOT_MAX_POPS } from "../../../core/analyses/ldDecay.ts";
import { MAX_LINE_SERIES } from "../../../charts/limits.ts";
import type { LineData } from "../../../charts/line.ts";
import type { LdDecayResult, Pops } from "../../../worker/protocol.ts";
import { ldDecayPlotData, ldGroups, ldYTop } from "./plotData.ts";

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

/** The populations of a project that has those of `names`, in their
    order, one individual in each. */
function popsOf(names: readonly string[]): Pops {
  return names.map((name) => [name, [`i_${name}`]] as const);
}

/** The data of the plot of `r` in a project whose populations are those
    of the result, in its order. */
function dataOf(r: LdDecayResult, maxDist: number): LineData {
  return ldDecayPlotData(r, maxDist, popsOf(r.pops));
}

describe("PA8 D1 the data of the plot of the LD decay", () => {
  test("each population's points are its own bins with a pair, at the middle of each bin, (smallest + largest) / 2", () => {
    const [a, b] = dataOf(resultOf(), 1000).series;
    expect(Array.from(a?.points.x ?? [])).toEqual([125.5, 625.5, 875.5]);
    expect(Array.from(a?.points.y ?? [])).toEqual([0.41, 0.22, 0.13]);
    expect(Array.from(b?.points.x ?? [])).toEqual([125.5, 375.5, 875.5]);
    expect(Array.from(b?.points.y ?? [])).toEqual([0.35, 0.28, 0.09]);
  });

  test("each population's mark is at its own half distance, at half of its own r² at 0, and its line is its curve of core", () => {
    const r = resultOf();
    const [a, b] = dataOf(r, 1000).series;
    expect(a?.marks).toEqual([{ x: 412.6, y: 0.2 }]);
    expect(b?.marks).toEqual([{ x: 8.3456, y: 0.185 }]);
    // The formula of ldDecay.md, "The fitted curve", written out in node
    // on 1 October 2026 for ρ per base pair 0.0021 with 30 individuals
    // and 0.0034 with 45, at 0, at the 101st of the 200 distances,
    // 100,000 / 199 bp, and at 1,000 bp.
    expect(a?.line?.x).toHaveLength(200);
    expect(a?.line?.x[0]).toBe(0);
    expect(a?.line?.x[100]).toBeCloseTo(100_000 / 199, 9);
    expect(a?.line?.x[199]).toBe(1000);
    expect(a?.line?.y[0]).toBeCloseTo(0.47933884297520657, 12);
    expect(a?.line?.y[100]).toBeCloseTo(0.3285476517637754, 12);
    expect(a?.line?.y[199]).toBeCloseTo(0.2549542161870359, 12);
    expect(b?.line?.x).toHaveLength(200);
    expect(b?.line?.y[0]).toBeCloseTo(0.47107438016528924, 12);
    expect(b?.line?.y[100]).toBeCloseTo(0.2679663917920047, 12);
    expect(b?.line?.y[199]).toBeCloseTo(0.19261013922523854, 12);
  });

  test("a half distance beyond the largest distance has no mark, one at it has, and a population with no curve has no line and no mark", () => {
    const r = resultOf([1599810.0655818006, 8.3456, NAN, 1000]);
    const series = dataOf(r, 1000).series;
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
    const data = dataOf(r, 1000);
    expect(data.series.map((one) => one.label)).toEqual([
      "pop_a · half at 1,599,810 bp, beyond the plot",
      "pop_b · half at 8.35 bp",
      "q2 · no curve",
    ]);
    expect(data.description).toBe(
      "The mean r² of pairs of variants against their distance, in 4 bins up to 1,000 base pairs, for 3 populations, with the curve fitted to each that has one. The curve falls to half at 1,599,810 bp in pop_a (beyond the plot) and 8.35 bp in pop_b. q2 has no curve.",
    );
    expect(data.title).toBe("LD decay");
    expect(data.xLabel).toBe("Distance between the two variants (bp)");
    expect(data.yLabel).toBe("Mean r² of the pairs");
  });

  test("review of PA8: a population keeps the group of its place among the populations of the project, as in the principal components, when the filters empty those before it", () => {
    // The project has p_first, pop_a, p_gone, pop_b and p_last; the
    // filters of individuals emptied p_first and p_gone, so the result
    // has pop_a and pop_b alone.
    const project = popsOf(["p_first", "pop_a", "p_gone", "pop_b", "p_last"]);
    const series = ldDecayPlotData(resultOf(), 1000, project).series;
    expect(series.map((one) => one.group)).toEqual([1, 3]);
    expect(series.map((one) => one.label.split(" · ")[0])).toEqual([
      "pop_a",
      "pop_b",
    ]);
    expect(ldGroups(["pop_b"], project)).toEqual([3]);
  });

  test("review of PA8: with 49 populations in the project the 49th keeps the group 48, and with 50 the groups are the places among those drawn, so that no two share a mark; the one population has the group 0", () => {
    const names = (count: number): string[] =>
      Array.from({ length: count }, (_, i) => `q${String(i)}`);
    expect(MAX_LINE_SERIES).toBe(49);
    expect(ldGroups(["q48", "q3"], popsOf(names(49)))).toEqual([48, 3]);
    expect(ldGroups(["q48", "q49"], popsOf(names(50)))).toEqual([0, 1]);
    expect(ldGroups(["All individuals"], "all")).toEqual([0]);
    expect(() => ldGroups(["q7"], popsOf(names(3)))).toThrow(
      /^popnei_web defect: /u,
    );
  });

  test("review of PA8: the top of the vertical axis is that of the curves when the points lie below them, and that of a point above them", () => {
    // The curves start at 0.4793 and 0.4711; no mean r² above 0.22.
    const low = resultOf();
    low.meanR2.set([0.21, NAN, 0.22, 0.13, 0.15, 0.18, NAN, 0.09]);
    expect(dataOf(low, 1000).yDomain).toEqual([0, 0.5]);
    // One mean r² of 0.62, above both curves.
    const high = resultOf();
    high.meanR2.set([0.21, NAN, 0.22, 0.13, 0.62, 0.18, NAN, 0.09]);
    expect(dataOf(high, 1000).yDomain).toEqual([0, 0.7]);
    // No curve, and no mean r² above 0.22: the points alone.
    const flat = resultOf([NAN, NAN]);
    flat.meanR2.set([0.21, NAN, 0.22, 0.13, 0.15, 0.18, NAN, 0.09]);
    expect(dataOf(flat, 1000).yDomain).toEqual([0, 0.3]);
  });

  test("of 60 populations draws the first 16, numbered 0 to 15 among those drawn, so that no two share a mark", () => {
    const halfDists = Array.from({ length: 60 }, (_, i) =>
      i === 1 ? 8.3456 : 400 + i,
    );
    const series = dataOf(resultOf(halfDists), 1000).series;
    expect(LD_PLOT_MAX_POPS).toBe(16);
    expect(LD_PLOT_MAX_POPS).toBeLessThanOrEqual(MAX_LINE_SERIES);
    expect(series.map((one) => one.group)).toEqual(
      Array.from({ length: 16 }, (_, i) => i),
    );
    expect(series[15]?.label).toBe("q15 · half at 415 bp");
  });

  test("the horizontal axis runs from 0 to the largest distance in whole base pairs, and the vertical from 0 to the largest value rounded up to a tenth", () => {
    const data = dataOf(resultOf(), 1000);
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
    const data = dataOf(r, 1000);
    expect(data.yDomain).toEqual([0, 1]);
    expect(data.series.map((one) => one.points.x.length)).toEqual([0, 0]);
  });
});
