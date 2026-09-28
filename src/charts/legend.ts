/**
 * What the legend of the points of the PCA shows, as data: the screen
 * draws it over the 2D and the 3D plot with React, and the export draws it
 * in the file (docs/specs/charts/scatter.md, "The legend, drawn by the
 * screen"). The plots know nothing of React, so the legend comes to the
 * screen from here, with the mark of each group from symbolPath of
 * marks.ts.
 */

import { MAX_SVG_POINTS } from "./limits.ts";
import {
  checkPointColours,
  highlightedGroup,
  NO_GROUP,
  type PointColours,
} from "./marks.ts";

/** An entry of the legend of a colouring by groups. */
export interface LegendGroup {
  /** The index of the group in `names`, or NO_GROUP; its mark is symbolPath(group). */
  readonly group: number;
  readonly name: string;
  /** How many points of the group are drawn, those with finite coordinates. */
  readonly count: number;
  /** True when another group is highlighted. */
  readonly faded: boolean;
}

/** The legend of the points drawn, by groups or by values. */
export type Legend =
  | {
      readonly kind: "groups";
      readonly title: string;
      /** The groups in the order of `names`, those with no point left out, then NO_GROUP when it has points. */
      readonly entries: readonly LegendGroup[];
    }
  | {
      readonly kind: "values";
      readonly title: string;
      /** The smallest and largest finite value of the points drawn; null when none has one. */
      readonly min: number | null;
      readonly max: number | null;
      readonly noneName: string;
      /** How many points drawn have no value, NaN, or one that is not finite. */
      readonly noneCount: number;
    };

/**
 * Which points are drawn: those whose every coordinate is finite. Throws
 * an `Error`, a defect of the caller, when there is no coordinate, when
 * the coordinates are not all of one length, and when there are more than
 * MAX_SVG_POINTS points.
 */
function drawnPoints(coordinates: readonly Float64Array[]): Uint8Array {
  const [first] = coordinates;
  if (first === undefined) {
    throw new Error("popnei_web defect: a legend was given no coordinate.");
  }
  const numPoints = first.length;
  for (const axis of coordinates) {
    if (axis.length !== numPoints) {
      throw new Error(
        `popnei_web defect: the coordinates of a legend are of ${String(numPoints)} and ${String(axis.length)} points.`,
      );
    }
  }
  if (numPoints > MAX_SVG_POINTS) {
    throw new Error(
      `popnei_web defect: a plot was given ${String(numPoints)} points, more than the ${String(MAX_SVG_POINTS)} it draws.`,
    );
  }
  const drawn = new Uint8Array(numPoints).fill(1);
  for (const axis of coordinates) {
    for (const [index, value] of axis.entries()) {
      if (!Number.isFinite(value)) drawn[index] = 0;
    }
  }
  return drawn;
}

/**
 * The legend of the points drawn, those whose every coordinate is
 * finite: [x, y] for the scatter, [x, y, z] for the 3D plot. What the
 * screen shows over the plot and the export writes in the file. Throws an
 * `Error`, a defect of the caller, for coordinates of different lengths or
 * of more than MAX_SVG_POINTS points, and for colours that
 * checkPointColours refuses.
 */
export function legendOf(
  colours: PointColours,
  coordinates: readonly Float64Array[],
): Legend {
  const drawn = drawnPoints(coordinates);
  checkPointColours(colours, drawn.length);
  switch (colours.kind) {
    case "groups": {
      const counts = new Uint32Array(colours.names.length);
      let noneCount = 0;
      for (const [index, group] of colours.group.entries()) {
        if (drawn[index] !== 1) continue;
        if (group === NO_GROUP) noneCount += 1;
        else counts[group] = (counts[group] ?? 0) + 1;
      }
      const highlighted = highlightedGroup(colours);
      const fadedUnless = (group: number): boolean =>
        highlighted !== null && highlighted !== group;
      const entries: LegendGroup[] = [];
      for (const [group, name] of colours.names.entries()) {
        const count = counts[group] ?? 0;
        if (count === 0) continue;
        entries.push({ group, name, count, faded: fadedUnless(group) });
      }
      if (noneCount > 0) {
        entries.push({
          group: NO_GROUP,
          name: colours.noneName,
          count: noneCount,
          faded: fadedUnless(NO_GROUP),
        });
      }
      return { kind: "groups", title: colours.title, entries };
    }
    case "values": {
      let min: number | null = null;
      let max: number | null = null;
      let noneCount = 0;
      for (const [index, value] of colours.values.entries()) {
        if (drawn[index] !== 1) continue;
        if (!Number.isFinite(value)) {
          noneCount += 1;
          continue;
        }
        if (min === null || value < min) min = value;
        if (max === null || value > max) max = value;
      }
      return {
        kind: "values",
        title: colours.title,
        min,
        max,
        noneName: colours.noneName,
        noneCount,
      };
    }
  }
}
