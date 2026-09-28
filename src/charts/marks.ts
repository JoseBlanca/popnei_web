/**
 * The marks of the points of the PCA, shared by the 2D scatter and the 3D
 * plot so that a population has the same mark in both
 * (docs/specs/charts/scatter.md, "The marks of the groups" and "The
 * colours"): how the points are coloured, the colour and the symbol of
 * each group, the steps of viridis, and the drawing of a symbol at a point
 * into the path of its group.
 */

import type { Path } from "d3-path";
import { pathRound } from "d3-path";
import { interpolateViridis } from "d3-scale-chromatic";
import { symbolCircle, symbolsFill } from "d3-shape";
import type { SymbolType } from "d3-shape";

/** What a symbol of d3-shape draws into: the methods of a path of a canvas. */
type SymbolContext = Parameters<SymbolType["draw"]>[0];
import { MAX_POINT_GROUPS } from "./limits.ts";

/** The group of a point with no population, or no value in the column. */
export const NO_GROUP = 0xffff;

/** The area of a mark in square pixels. */
export const SYMBOL_AREA = 64;

/** The radius of a circle of SYMBOL_AREA, 4.51 pixels: where a mark covers the pointer, for the 3D plot. */
export const MARK_RADIUS = Math.sqrt(SYMBOL_AREA / Math.PI);

/**
 * The digits after the point of the numbers of a path: one, a tenth of a
 * pixel, which gives an SVG of 50,000 points a third of the size of one
 * with every digit (docs/specs/charts/scatter.md, "The points: one path
 * per group, drawn by a loop").
 */
export const PATH_DIGITS = 1;

/** The number of colours of the groups, of Okabe and Ito, --chart-cat-1 to --chart-cat-7. */
const NUM_COLOURS = 7;

/** The number of steps of viridis, the 256 colours interpolateViridis holds. */
const VIRIDIS_STEPS = 256;

/** The step of every point when every finite value is the same: the middle of the scale. */
const VIRIDIS_MIDDLE = 128;

/** How the points are coloured: by their group, or by a number. */
export type PointColours = GroupColours | ValueColours;

/** The points coloured by their group, a population or a value of a column. */
export interface GroupColours {
  readonly kind: "groups";
  /** The title of the legend and of the tooltip: "Population", or the column's name. */
  readonly title: string;
  /** The index of each point's group in `names`, or NO_GROUP. */
  readonly group: Uint16Array;
  /** The names of the groups; the index of a group gives its mark. */
  readonly names: readonly string[];
  /** The name of the points of NO_GROUP: "No population", "No value". */
  readonly noneName: string;
  /** The group the legend highlights, an index of `names` or NO_GROUP; null for none, and a whole number at or above names.length is none too. */
  readonly highlighted: number | null;
}

/** The points coloured by a number of a column, along viridis. */
export interface ValueColours {
  readonly kind: "values";
  /** The title of the legend and of the tooltip: the column's name. */
  readonly title: string;
  /** The value of each point; NaN for none. */
  readonly values: Float64Array;
  /** The name of the points with no value: "No value". */
  readonly noneName: string;
}

/** The mark of a group: its colour, 0 to 6, and its symbol, 0 to 6, of symbolsFill. */
export interface GroupMark {
  readonly colour: number;
  readonly symbol: number;
}

/**
 * The mark of group `group`: its colour, 0 to 6, and its symbol, 0 to 6,
 * of symbolsFill, `group % 7` and `(group + Math.floor(group / 7)) % 7`,
 * so that the first 49 groups have 49 different marks and group 49 has
 * the mark of group 0. Throws an `Error`, a defect of the caller, for a
 * group that is not a whole number from 0.
 */
export function groupMark(group: number): GroupMark {
  if (!Number.isInteger(group) || group < 0) {
    throw new Error(
      `popnei_web defect: the mark of group ${String(group)} was asked for, not a whole number from 0.`,
    );
  }
  return {
    colour: group % NUM_COLOURS,
    symbol: (group + Math.floor(group / NUM_COLOURS)) % NUM_COLOURS,
  };
}

/**
 * The symbol of `group` of d3-shape: one of the seven of symbolsFill, and
 * the circle of the ring for NO_GROUP, which its class draws with no fill.
 * Throws an `Error`, a defect of the caller, as groupMark does.
 */
export function groupSymbol(group: number): SymbolType {
  if (group === NO_GROUP) return symbolCircle;
  const symbol = symbolsFill[groupMark(group).symbol];
  if (symbol === undefined) {
    throw new Error(
      `popnei_web defect: d3-shape has no filled symbol ${String(groupMark(group).symbol)}.`,
    );
  }
  return symbol;
}

/**
 * The class of the colour of `group` on its path, `chart-colour-‹0 to 6›`,
 * or `chart-points-none` for the ring of NO_GROUP.
 */
export function groupColourClass(group: number): string {
  return group === NO_GROUP
    ? "chart-points-none"
    : `chart-colour-${String(groupMark(group).colour)}`;
}

/**
 * A context of d3-shape that draws into `target` with every point moved
 * by (dx, dy), so that a symbol, which d3-shape draws centred on 0,0, is
 * drawn at its point with no transform.
 */
function offsetContext(target: Path, dx: number, dy: number): SymbolContext {
  return {
    arc(x, y, radius, startAngle, endAngle, anticlockwise) {
      target.arc(x + dx, y + dy, radius, startAngle, endAngle, anticlockwise);
    },
    arcTo(x1, y1, x2, y2, radius) {
      target.arcTo(x1 + dx, y1 + dy, x2 + dx, y2 + dy, radius);
    },
    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
      target.bezierCurveTo(
        cp1x + dx,
        cp1y + dy,
        cp2x + dx,
        cp2y + dy,
        x + dx,
        y + dy,
      );
    },
    closePath() {
      target.closePath();
    },
    ellipse() {
      throw new Error(
        "popnei_web defect: a symbol drew an ellipse, which d3-path cannot draw.",
      );
    },
    lineTo(x, y) {
      target.lineTo(x + dx, y + dy);
    },
    moveTo(x, y) {
      target.moveTo(x + dx, y + dy);
    },
    quadraticCurveTo(cpx, cpy, x, y) {
      target.quadraticCurveTo(cpx + dx, cpy + dy, x + dx, y + dy);
    },
    rect(x, y, w, h) {
      target.rect(x + dx, y + dy, w, h);
    },
  };
}

/**
 * Draws the symbol `type` of `area` square pixels, centred on (x, y),
 * into `path`, the path of the points of one group. The path is made by
 * `pathRound(PATH_DIGITS)` so that its numbers have one decimal.
 */
export function drawSymbolAt(
  path: Path,
  type: SymbolType,
  area: number,
  x: number,
  y: number,
): void {
  type.draw(offsetContext(path, x, y), area);
}

/**
 * The drawing of the mark of `group`, centred on 0,0, of SYMBOL_AREA,
 * as the `d` of an SVG path; the ring for NO_GROUP. For the legend.
 * Throws an `Error`, a defect of the caller, as groupMark does.
 */
export function symbolPath(group: number): string {
  const path = pathRound(PATH_DIGITS);
  drawSymbolAt(path, groupSymbol(group), SYMBOL_AREA, 0, 0);
  return path.toString();
}

/**
 * The step of viridis, 0 to 255, of `value` between `min` and `max`; 128
 * when they are equal. The steps are those of interpolateViridis, which
 * holds 256 colours: the smallest value is step 0, the largest step 255.
 * Throws an `Error`, a defect of the caller, when a number is not finite
 * or `value` is not between `min` and `max`.
 */
export function viridisStep(value: number, min: number, max: number): number {
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    value < min ||
    value > max
  ) {
    throw new Error(
      `popnei_web defect: the step of viridis of ${String(value)} between ${String(min)} and ${String(max)} was asked for, not a finite value between two finite ends.`,
    );
  }
  if (min === max) return VIRIDIS_MIDDLE;
  // With halves, so that two ends near ±1.8e308 give no infinity.
  const place = (value / 2 - min / 2) / (max / 2 - min / 2);
  return Math.min(VIRIDIS_STEPS - 1, Math.floor(place * VIRIDIS_STEPS));
}

/**
 * The colour of a step of viridis, "#440154" for 0 and "#fde725" for 255.
 * Throws an `Error`, a defect of the caller, for a step that is not a
 * whole number from 0 to 255.
 */
export function viridisColour(step: number): string {
  if (!Number.isInteger(step) || step < 0 || step >= VIRIDIS_STEPS) {
    throw new Error(
      `popnei_web defect: the colour of step ${String(step)} of viridis was asked for, not a whole number from 0 to 255.`,
    );
  }
  // interpolateViridis(t) gives its colour Math.floor(t * 256), so that
  // step / 255 gives the colour of each step, and 1 the last.
  return interpolateViridis(step / (VIRIDIS_STEPS - 1));
}

/**
 * The group that is drawn highlighted: `highlighted`, or null when it is
 * null or a whole number at or above the number of names that is not
 * NO_GROUP, which is drawn as no highlight (docs/specs/charts/scatter.md,
 * "The TypeScript interface").
 */
export function highlightedGroup(colours: GroupColours): number | null {
  const { highlighted } = colours;
  if (highlighted === null) return null;
  if (highlighted === NO_GROUP || highlighted < colours.names.length) {
    return highlighted;
  }
  return null;
}

/**
 * Checks the colours of `numPoints` points. Throws an `Error`, a defect of
 * the caller, when the groups or the values are not `numPoints`, when
 * there are more than MAX_POINT_GROUPS names, when a group index is
 * neither below the number of names nor NO_GROUP, and when `highlighted`
 * is neither null nor a whole number from 0.
 */
export function checkPointColours(
  colours: PointColours,
  numPoints: number,
): void {
  switch (colours.kind) {
    case "values":
      if (colours.values.length !== numPoints) {
        throw new Error(
          `popnei_web defect: the colours of ${String(numPoints)} points have ${String(colours.values.length)} values.`,
        );
      }
      return;
    case "groups": {
      if (colours.group.length !== numPoints) {
        throw new Error(
          `popnei_web defect: the colours of ${String(numPoints)} points have ${String(colours.group.length)} groups.`,
        );
      }
      const numNames = colours.names.length;
      if (numNames > MAX_POINT_GROUPS) {
        throw new Error(
          `popnei_web defect: the points were given ${String(numNames)} groups, more than the ${String(MAX_POINT_GROUPS)} a plot draws.`,
        );
      }
      for (const [index, group] of colours.group.entries()) {
        if (group >= numNames && group !== NO_GROUP) {
          throw new Error(
            `popnei_web defect: point ${String(index)} is in group ${String(group)}, of ${String(numNames)} names, and not NO_GROUP.`,
          );
        }
      }
      const { highlighted } = colours;
      if (
        highlighted !== null &&
        (!Number.isInteger(highlighted) || highlighted < 0)
      ) {
        throw new Error(
          `popnei_web defect: the highlighted group is ${String(highlighted)}, neither null nor a whole number from 0.`,
        );
      }
      return;
    }
  }
}
