/**
 * The data of the two plots of the principal components, made by one
 * function from the result, the colours and the components shown
 * (docs/specs/analyses/pca.md, "What it shows", the plot): the components
 * taken out of the projections as columns, `x`, `y` and, in 3D, `z`, and
 * the colours as the `PointColours` of src/charts/marks.ts with the group
 * highlighted, so that the two plots give a group the same mark. Pure, so
 * that a test in node checks it.
 */

import { pcaDescription } from "../../../core/analyses/pca.ts";
import type { PcaColours } from "../../../core/analyses/pca.ts";
import type { Project } from "../../../core/project.ts";
import type { PointColours } from "../../../charts/marks.ts";
import type { Pca3dData } from "../../../charts/pca3d.ts";
import type { ScatterData } from "../../../charts/scatter.ts";
import type { PcaResult } from "../../../worker/protocol.ts";
import { axisLabel, pcName, plotTitle } from "./words.ts";

/** The coordinates of every individual of `r` on `component`, from 1: a
    column of the projections, which popnei gives row after row,
    `numComps` wide. */
export function componentColumn(r: PcaResult, component: number): Float64Array {
  if (!Number.isInteger(component) || component < 1 || component > r.numComps) {
    throw new Error(
      `popnei_web defect: ${pcName(component)} was asked of a result of ${String(r.numComps)} components.`,
    );
  }
  const column = new Float64Array(r.individuals.length);
  for (let i = 0; i < column.length; i++) {
    column[i] = r.projections[i * r.numComps + component - 1] ?? Number.NaN;
  }
  return column;
}

/** The colours of the plots: those of core, with the group highlighted
    for a colouring by groups; a colouring by values has none. */
export function pointColours(
  c: PcaColours,
  highlighted: number | null,
): PointColours {
  return c.kind === "groups"
    ? {
        kind: "groups",
        title: c.title,
        group: c.group,
        names: c.names,
        noneName: c.noneName,
        highlighted,
      }
    : {
        kind: "values",
        title: c.title,
        values: c.values,
        noneName: c.noneName,
      };
}

/** The data of the 2D scatter of the first two components of `axes`. */
export function scatterData(
  r: PcaResult,
  c: PcaColours,
  axes: readonly number[],
  highlighted: number | null,
  p: Project,
): ScatterData {
  const [first, second] = axes;
  if (first === undefined || second === undefined) {
    throw new Error(
      "popnei_web defect: the 2D plot of the principal components was given fewer than two axes.",
    );
  }
  const shown = [first, second];
  return {
    title: plotTitle(shown),
    description: pcaDescription(r, c, shown, highlighted, p),
    xLabel: axisLabel(r, first),
    yLabel: axisLabel(r, second),
    x: componentColumn(r, first),
    y: componentColumn(r, second),
    xName: pcName(first),
    yName: pcName(second),
    pointNames: r.individuals,
    colours: pointColours(c, highlighted),
  };
}

/** The data of the 3D view of the three components of `axes`. */
export function pca3dData(
  r: PcaResult,
  c: PcaColours,
  axes: readonly number[],
  highlighted: number | null,
  p: Project,
): Pca3dData {
  const [first, second, third] = axes;
  if (first === undefined || second === undefined || third === undefined) {
    throw new Error(
      "popnei_web defect: the 3D view of the principal components was given fewer than three axes.",
    );
  }
  const shown = [first, second, third];
  return {
    title: plotTitle(shown),
    description: pcaDescription(r, c, shown, highlighted, p),
    x: componentColumn(r, first),
    y: componentColumn(r, second),
    z: componentColumn(r, third),
    axisNames: [pcName(first), pcName(second), pcName(third)],
    axisLabels: [
      axisLabel(r, first),
      axisLabel(r, second),
      axisLabel(r, third),
    ],
    pointNames: r.individuals,
    colours: pointColours(c, highlighted),
  };
}
