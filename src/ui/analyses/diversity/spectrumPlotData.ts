/**
 * The data of the plot of the spectrum as lines on popgen2.html
 * (docs/specs/analyses/sfs.md, "On popgen2.html"): one series per line of
 * `spectrumLinesOf`, named by its population as a text shows it, in the
 * group of its population, `populationGroups`, its place among the
 * populations of the project, so that a population has one colour and
 * one shape in every plot of the Populations tab and in the principal
 * components; its points and its
 * line the same positions, the proportion against the frequency of the
 * commonest allele; no marks. Pure, so that a test in node checks it.
 */
import { MAX_SVG_POINTS } from "../../../charts/limits.ts";
import type { LineData, LineSeries } from "../../../charts/line.ts";
import type { SpectrumLines } from "../../../core/analyses/sfs.ts";
import { escaped } from "../../../core/project.ts";
import type { Pops } from "../../../worker/protocol.ts";
import { populationGroups } from "../populationGroups.ts";
import { LINES_TITLE, LINES_X_LABEL, LINES_Y_LABEL } from "./spectrumWords.ts";

/** The horizontal axis: the frequency of the commonest allele, from 0.5
    to 1, whose points end just under it. */
const X_DOMAIN: readonly [number, number] = [0.5, 1];

/** The top of the vertical axis when no proportion is above 0. */
const EMPTY_TOP = 1;

/**
 * The top of the vertical axis: the largest proportion `largest` made
 * round up to a half of its first digit, 0.0539 to 0.055 and 0.41 to
 * 0.45; 1 when it is not above 0, which the line plot would refuse as a
 * range from 0 to 0.
 */
export function linesTop(largest: number): number {
  if (!(largest > 0)) return EMPTY_TOP;
  // In whole steps of a half of the first digit, so that 0.4, whose
  // multiple may come out a hair above a whole number, stays 0.4.
  const scale = 2 * 10 ** -Math.floor(Math.log10(largest));
  let steps = Math.ceil(largest * scale);
  if ((steps - 1) / scale >= largest) steps -= 1;
  return steps / scale;
}

/** Whether the lines of a draw of `numCalledAlleles`, `numLines` of them,
    hold more points and positions of lines than the line plot draws,
    MAX_SVG_POINTS: each line is its points and the same positions again
    for its line. */
export function tooManyPoints(
  numCalledAlleles: number,
  numLines: number,
): boolean {
  return 2 * Math.floor(numCalledAlleles / 2) * numLines > MAX_SVG_POINTS;
}

/** The data of the plot of `spectrum`, with the description the screen
    writes, `linesDescription`, in a project whose populations are
    `pops`, `populationsOf(p)`. */
export function spectrumPlotData(
  spectrum: SpectrumLines,
  description: string,
  pops: Pops | "all" | null,
): LineData {
  const groups = populationGroups(
    spectrum.lines.map((line) => line.population),
    pops,
  );
  return {
    title: LINES_TITLE,
    description,
    xLabel: LINES_X_LABEL,
    yLabel: LINES_Y_LABEL,
    series: spectrum.lines.map((line, i): LineSeries => {
      const group = groups[i];
      if (group === undefined) {
        throw new Error(
          `popnei_web defect: the line of ${line.population} has no group.`,
        );
      }
      const xy = { x: line.frequency, y: line.proportion };
      return {
        label: escaped(line.population),
        labelEnd: "",
        group,
        points: xy,
        line: xy,
        marks: [],
      };
    }),
    xDomain: X_DOMAIN,
    yDomain: [0, linesTop(spectrum.largestProportion)],
    xWholeNumbers: false,
    yWholeNumbers: false,
    // The names whole at the right of the plot, as before the LD decay
    // limited its own; cut in the middle above it.
    labelMost: Number.POSITIVE_INFINITY,
  };
}
