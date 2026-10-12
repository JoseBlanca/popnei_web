/**
 * The data of the plot of the spectrum as lines on popgen2.html
 * (docs/specs/analyses/sfs.md, "On popgen2.html"): a series per line, in
 * the group of its population's place in the result, its points and its
 * line the same positions; the horizontal axis from 0.5 to 1, the
 * vertical from 0 to the largest proportion made round; and whether the
 * points are too many to draw.
 */
import { describe, expect, test } from "vitest";

import type { SpectrumLines } from "../../../core/analyses/sfs.ts";
import type { Pops } from "../../../worker/protocol.ts";
import {
  linesTop,
  spectrumPlotData,
  tooManyPoints,
} from "./spectrumPlotData.ts";

/** Two lines of a draw of 4, of the populations at 0 and 2 of a result,
    p0 and p1. */
const LINES: SpectrumLines = {
  numCalledAlleles: 4,
  lines: [
    {
      population: "p0",
      index: 0,
      frequency: Float64Array.from([0.75, 0.5]),
      proportion: Float64Array.from([0.4, 0.4]),
      variants: Float64Array.from([2, 2]),
    },
    {
      population: "p1",
      index: 2,
      frequency: Float64Array.from([0.75, 0.5]),
      proportion: Float64Array.from([0.2, 0.05]),
      variants: Float64Array.from([1, 0.25]),
    },
  ],
  largestProportion: 0.4,
};

/** The populations of the project: p0, p_gone, which the filters
    emptied, and p1, whose group is then 2, as in the principal
    components. */
const POPS: Pops = [
  ["p0", ["s000"]],
  ["p_gone", ["s001"]],
  ["p1", ["s002"]],
];

describe("PT7 R1.2 the data of the plot of the spectrum", () => {
  test("a series per line, named by its population, in the group of its place, its points its line, no marks; the axes 0.5 to 1 and 0 to 0.4", () => {
    const data = spectrumPlotData(LINES, "The description.", POPS);
    expect(data.series.map((series) => [series.label, series.group])).toEqual([
      ["p0", 0],
      ["p1", 2],
    ]);
    const [p0] = data.series;
    expect([...(p0?.points.x ?? [])]).toEqual([0.75, 0.5]);
    expect([...(p0?.points.y ?? [])]).toEqual([0.4, 0.4]);
    expect(p0?.line).toEqual(p0?.points);
    expect(p0?.marks).toEqual([]);
    expect(data.xDomain).toEqual([0.5, 1]);
    expect(data.yDomain).toEqual([0, 0.4]);
    expect(data.title).toBe("The spectrum of each population");
    expect(data.description).toBe("The description.");
    expect(data.xLabel).toBe("Frequency of the commonest allele in the draw");
    expect(data.yLabel).toBe(
      "Proportion of the variants with both alleles that have this frequency",
    );
    expect(data.xWholeNumbers).toBe(false);
    expect(data.yWholeNumbers).toBe(false);
  });

  test("review of round 1: a line has the group of its population's place among the populations of the project, not its place in the result", () => {
    const moved: SpectrumLines = {
      ...LINES,
      lines: LINES.lines.map((line) => ({ ...line, index: 0 })),
    };
    const data = spectrumPlotData(moved, "The description.", POPS);
    expect(data.series.map((series) => series.group)).toEqual([0, 2]);
    // The one population, which the project does not list, has group 0.
    const [first] = LINES.lines;
    if (first === undefined) throw new Error("no line");
    const one: SpectrumLines = {
      ...LINES,
      lines: [{ ...first, population: "Unclassified", index: 0 }],
    };
    expect(
      spectrumPlotData(one, "One.", POPS).series.map((series) => series.group),
    ).toEqual([0]);
  });

  test("the top of the vertical axis: the largest proportion made round up to a half of its first digit, 1 for none", () => {
    expect(linesTop(0.05386774831954687)).toBe(0.055);
    expect(linesTop(0.4)).toBe(0.4);
    expect(linesTop(0.41)).toBe(0.45);
    expect(linesTop(0.05)).toBe(0.05);
    expect(linesTop(0.003)).toBe(0.003);
    expect(linesTop(0)).toBe(1);
  });

  test("too many points: over 50,000 points and positions of lines, twice the points of each line", () => {
    expect(tooManyPoints(2000, 25)).toBe(false);
    expect(tooManyPoints(2002, 25)).toBe(true);
    expect(tooManyPoints(40, 0)).toBe(false);
  });
});
