/**
 * The scatter plot of the PCA (docs/specs/charts/scatter.md): the
 * individuals drawn on two principal components, each a mark whose colour
 * and shape say its group, or coloured along viridis by the values of a
 * column. It is drawn on the base of the 2D plots, plot2d.ts, which gives
 * it its SVG, its size, its axes, its handle and its export; it draws the
 * points, one path per group, finds the point under the pointer and shows
 * its tooltip, and draws its legend into the exported file.
 */

import type { Path } from "d3-path";
import { pathRound } from "d3-path";
import { scaleLinear } from "d3-scale";
import type { ScaleLinear } from "d3-scale";
import { createTooltip, nearestPoint, tooltipLines } from "./hover.ts";
import { drawLegendSvg, legendOf } from "./legend.ts";
import { MAX_SVG_POINTS } from "./limits.ts";
import { tableNumber } from "./numbers.ts";
import {
  checkPointColours,
  drawSymbolAt,
  groupColourClass,
  groupSymbol,
  highlightedGroup,
  NO_GROUP,
  PATH_DIGITS,
  SYMBOL_AREA,
  viridisColour,
  viridisStep,
  type GroupColours,
  type PointColours,
  type ValueColours,
} from "./marks.ts";
import {
  createPlot2d,
  type Frame,
  type Group,
  type Margin,
  type Plot2dDefinition,
  type PlotText,
} from "./plot2d.ts";
import type { Chart } from "./types.ts";

/** The data of the scatter: two coordinates, a name and a colour per point. */
export interface ScatterData extends PlotText {
  /** The coordinate of each point across; NaN or an infinity is not drawn. */
  readonly x: Float64Array;
  /** The coordinate of each point up; NaN or an infinity is not drawn. */
  readonly y: Float64Array;
  /** The short name of the axis across, for the tooltip and the table: "PC1". */
  readonly xName: string;
  /** The short name of the axis up: "PC2". */
  readonly yName: string;
  /** The name of each point, an individual, for the tooltip. */
  readonly pointNames: readonly string[];
  /** How the points are coloured, by group or by value. */
  readonly colours: PointColours;
}

/** The callbacks of the scatter, which change nothing that is drawn. */
export interface ScatterEvents {
  /** The point under the pointer, by its index, or null; called when it changes. */
  onHover?(point: number | null): void;
}

/** The margins of the scatter, in CSS pixels; the screen places the legend by them. */
export const SCATTER_MARGIN: Margin = {
  top: 12,
  right: 16,
  bottom: 44,
  left: 60,
};

/**
 * The pixels kept between the points and each edge of the frame, so that
 * no mark, which reaches 8.05 pixels from its point, is cut by the edge.
 */
const FRAME_INSET = 10;

/**
 * The pixels within which a point is under the pointer, and its tooltip
 * stays shown.
 */
const HOVER_RADIUS = 10;

/**
 * The radius of the ring around the point under the pointer, outside the
 * 8.05 pixels a mark reaches; meanwhile, refined in the running
 * application.
 */
const HOVER_RING_RADIUS = 9;

/** The span taken for an axis when every point is at one place: one unit either side. */
const SPAN_OF_ONE_PLACE = 2;

/** The key of the path of the points in no group, or with no value. */
const NONE_KEY = "none";

/** The minus sign, U+2212, which the ticks of d3-axis write. */
const MINUS = "−";

/** Two scales, across and up. */
interface Scales {
  readonly x: ScaleLinear<number, number>;
  readonly y: ScaleLinear<number, number>;
}

/**
 * The two scales of the scatter for a frame of `innerWidth` by
 * `innerHeight`, of the same pixels per unit: the largest at which every
 * point with finite coordinates fits with 10 pixels to spare on each side,
 * each axis centred on the middle of its data. When a span is 0 the other
 * sets the scale; when both are, or no point is finite, both spans are
 * taken as 2, around the point or around (0, 0).
 */
export function scatterScales(
  data: ScatterData,
  innerWidth: number,
  innerHeight: number,
): Scales {
  return scalesAt(data, innerWidth, innerHeight, 1);
}

/**
 * The scales of scatterScales over the coordinates times `factor`, a
 * power of two, which multiplies exactly: at a half or a quarter, the
 * ends and the widths of the domains of coordinates near ±1.8e308 are
 * finite numbers where at 1 they are infinities.
 */
function scalesAt(
  data: ScatterData,
  innerWidth: number,
  innerHeight: number,
  factor: number,
): Scales {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [index, x] of data.x.entries()) {
    const y = data.y[index];
    if (y === undefined || !Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }
    minX = Math.min(minX, x * factor);
    maxX = Math.max(maxX, x * factor);
    minY = Math.min(minY, y * factor);
    maxY = Math.max(maxY, y * factor);
  }
  if (minX > maxX) {
    // No finite point: the axes of one point at (0, 0).
    minX = maxX = minY = maxY = 0;
  }
  let spanX = maxX - minX;
  let spanY = maxY - minY;
  if (spanX === 0 && spanY === 0) {
    spanX = SPAN_OF_ONE_PLACE * factor;
    spanY = SPAN_OF_ONE_PLACE * factor;
  }
  const perUnit = Math.min(
    spanX > 0 ? (innerWidth - 2 * FRAME_INSET) / spanX : Infinity,
    spanY > 0 ? (innerHeight - 2 * FRAME_INSET) / spanY : Infinity,
  );
  const middleX = minX / 2 + maxX / 2;
  const middleY = minY / 2 + maxY / 2;
  const halfX = innerWidth / (2 * perUnit);
  const halfY = innerHeight / (2 * perUnit);
  return {
    x: scaleLinear()
      .domain([middleX - halfX, middleX + halfX])
      .range([0, innerWidth]),
    y: scaleLinear()
      .domain([middleY - halfY, middleY + halfY])
      .range([innerHeight, 0]),
  };
}

/** True when the ends and the width of the domain of `scale` are finite. */
function finiteDomain(scale: ScaleLinear<number, number>): boolean {
  const [start = Number.NaN, end = Number.NaN] = scale.domain();
  return Number.isFinite(end - start);
}

/** The smallest factor tried, a 256th: enough for a frame 256 times wider than high. */
const SMALLEST_FACTOR = 2 ** -8;

/**
 * The scales the scatter draws with, and the factor of the coordinates
 * they are over: 1, the scales of scatterScales, but for coordinates near
 * ±1.8e308, for which a half, a quarter or less, the first at which the
 * domains are finite (scatter.md, "The cases").
 */
function drawingScales(
  data: ScatterData,
  innerWidth: number,
  innerHeight: number,
): Scales & { readonly factor: number } {
  let factor = 1;
  let scales = scalesAt(data, innerWidth, innerHeight, factor);
  while (
    !(finiteDomain(scales.x) && finiteDomain(scales.y)) &&
    factor > SMALLEST_FACTOR
  ) {
    factor /= 2;
    scales = scalesAt(data, innerWidth, innerHeight, factor);
  }
  return { ...scales, factor };
}

/**
 * Throws an `Error`, a defect of the caller, when `x`, `y`, `pointNames`
 * and the groups or the values of the colours are not all of one length,
 * when there are more than MAX_SVG_POINTS points, and for colours that
 * checkPointColours refuses.
 */
function checkScatter(data: ScatterData): void {
  const numPoints = data.x.length;
  if (data.y.length !== numPoints) {
    throw new Error(
      `popnei_web defect: a scatter was given ${String(numPoints)} coordinates across and ${String(data.y.length)} up.`,
    );
  }
  if (data.pointNames.length !== numPoints) {
    throw new Error(
      `popnei_web defect: a scatter of ${String(numPoints)} points was given ${String(data.pointNames.length)} names.`,
    );
  }
  if (numPoints > MAX_SVG_POINTS) {
    throw new Error(
      `popnei_web defect: a plot was given ${String(numPoints)} points, more than the ${String(MAX_SVG_POINTS)} it draws.`,
    );
  }
  checkPointColours(data.colours, numPoints);
}

/** One path of points: its key in the join, its class, its fill and its drawing. */
interface PointsPath {
  readonly key: string;
  readonly className: string;
  /** The colour of a step of viridis; null for a group, coloured by its class. */
  readonly fill: string | null;
  readonly d: string;
}

/**
 * The paths of the points coloured by groups: the no-group first, then
 * each group with a point drawn in the order of its index, and the
 * highlighted group last, the others then faded.
 */
function groupPaths(
  colours: GroupColours,
  positions: Float32Array,
): PointsPath[] {
  const paths = new Map<number, Path>();
  for (const [index, group] of colours.group.entries()) {
    const px = positions[2 * index];
    const py = positions[2 * index + 1];
    if (px === undefined || py === undefined || Number.isNaN(px)) continue;
    let path = paths.get(group);
    if (path === undefined) {
      path = pathRound(PATH_DIGITS);
      paths.set(group, path);
    }
    drawSymbolAt(path, groupSymbol(group), SYMBOL_AREA, px, py);
  }
  const highlighted = highlightedGroup(colours);
  const rank = (group: number): number => {
    if (group === highlighted) return Infinity;
    return group === NO_GROUP ? -1 : group;
  };
  return [...paths.keys()]
    .toSorted((a, b) => rank(a) - rank(b))
    .map((group) => {
      const faded =
        highlighted !== null && group !== highlighted
          ? " chart-points-faded"
          : "";
      return {
        key: group === NO_GROUP ? NONE_KEY : `group-${String(group)}`,
        className: `chart-points ${groupColourClass(group)}${faded}`,
        fill: null,
        d: paths.get(group)?.toString() ?? "",
      };
    });
}

/**
 * The paths of the points coloured by values: the ring of the points with
 * no value first, then one path of circles per step of viridis with a
 * point, in the order of the steps, each with the colour of its step.
 */
function valuePaths(
  colours: ValueColours,
  positions: Float32Array,
  min: number | null,
  max: number | null,
): PointsPath[] {
  const none = pathRound(PATH_DIGITS);
  let hasNone = false;
  const steps = new Map<number, Path>();
  const circle = groupSymbol(NO_GROUP);
  for (const [index, value] of colours.values.entries()) {
    const px = positions[2 * index];
    const py = positions[2 * index + 1];
    if (px === undefined || py === undefined || Number.isNaN(px)) continue;
    if (!Number.isFinite(value) || min === null || max === null) {
      drawSymbolAt(none, circle, SYMBOL_AREA, px, py);
      hasNone = true;
      continue;
    }
    const step = viridisStep(value, min, max);
    let path = steps.get(step);
    if (path === undefined) {
      path = pathRound(PATH_DIGITS);
      steps.set(step, path);
    }
    drawSymbolAt(path, circle, SYMBOL_AREA, px, py);
  }
  const paths: PointsPath[] = [];
  if (hasNone) {
    paths.push({
      key: NONE_KEY,
      className: "chart-points chart-points-none",
      fill: null,
      d: none.toString(),
    });
  }
  for (const step of [...steps.keys()].toSorted((a, b) => a - b)) {
    paths.push({
      key: `step-${String(step)}`,
      className: "chart-points chart-points-value",
      fill: viridisColour(step),
      d: steps.get(step)?.toString() ?? "",
    });
  }
  return paths;
}

/** The pixels of the padding of `element` at its left and its top. */
function paddingOf(element: HTMLElement): { left: number; top: number } {
  const style = getComputedStyle(element);
  const pixels = (value: string): number => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return { left: pixels(style.paddingLeft), top: pixels(style.paddingTop) };
}

/** What the last draw left for the pointer: where the points are, and on what data. */
interface LastDraw {
  readonly data: ScatterData;
  /** x and y of each point in the pixels of the frame, NaN for a point not drawn. */
  readonly positions: Float32Array;
  readonly margin: Margin;
  readonly annotations: Group;
}

/**
 * Draws the scatter of `data` in `element`, whose size the screen's CSS
 * gives, and returns its handle. `events.onHover` is called with the
 * index of the point under the pointer, or null, each time it changes.
 *
 * Throws an `Error`, a defect of the caller, here and in `update`, when
 * `x`, `y`, `pointNames` and the groups or the values of the colours are
 * not all of one length; for more than MAX_SVG_POINTS points; for a group
 * index neither below the number of names nor NO_GROUP; for a
 * `highlighted` neither null nor a whole number from 0; and for more than
 * MAX_POINT_GROUPS names. A `highlighted` at or above the number of names,
 * and not NO_GROUP, is drawn as no highlight.
 */
export const createScatter: Chart<ScatterData, ScatterEvents> = (
  element,
  data,
  events = {},
) => {
  let last: LastDraw | null = null;
  /** The point whose tooltip and mark are shown. */
  let hovered: number | null = null;
  /**
   * The point whose tooltip Escape hid: it stays hidden until the pointer
   * is near another point, or leaves every point and comes back.
   */
  let dismissed: number | null = null;

  /** Hides the mark and the tooltip of the point under the pointer, if any. */
  function clearHover(): void {
    if (hovered === null) return;
    hovered = null;
    tooltip.hide();
    last?.annotations.selectAll("path.chart-hover").remove();
    events.onHover?.(null);
  }

  const tooltip = createTooltip(
    element,
    (by) => {
      // Escape, or the pointer gone from the tooltip onto an axis, the
      // margin or out of the plot: the tooltip is hidden already. After a
      // leave the pointer has left every point, and the tooltip shows
      // again when it comes back.
      if (hovered === null) return;
      dismissed = by === "escape" ? hovered : null;
      hovered = null;
      last?.annotations.selectAll("path.chart-hover").remove();
      events.onHover?.(null);
    },
    // The overlay of this plot, whose movements find the point.
    (target) =>
      target instanceof Element &&
      target.classList.contains("chart-overlay") &&
      element.contains(target),
  );

  function showHover(drawn: LastDraw, point: number): void {
    const px = drawn.positions[2 * point];
    const py = drawn.positions[2 * point + 1];
    const name = drawn.data.pointNames[point];
    const x = drawn.data.x[point];
    const y = drawn.data.y[point];
    if (
      px === undefined ||
      py === undefined ||
      name === undefined ||
      x === undefined ||
      y === undefined
    ) {
      throw new Error(
        `popnei_web defect: point ${String(point)} under the pointer is not a point of the plot.`,
      );
    }
    hovered = point;
    dismissed = null;
    const ring = pathRound(PATH_DIGITS);
    ring.moveTo(px + HOVER_RING_RADIUS, py);
    ring.arc(px, py, HOVER_RING_RADIUS, 0, 2 * Math.PI);
    drawn.annotations
      .selectAll("path.chart-hover")
      .data([ring.toString()])
      .join("path")
      .attr("class", "chart-hover")
      .attr("d", (d) => d);
    const padding = paddingOf(element);
    tooltip.show(
      tooltipLines(name, drawn.data.colours, point, [
        [drawn.data.xName, x],
        [drawn.data.yName, y],
      ]),
      padding.left + drawn.margin.left + px,
      padding.top + drawn.margin.top + py,
    );
    events.onHover?.(point);
  }

  function draw(frame: Frame, drawnData: ScatterData): void {
    const scales = drawingScales(
      drawnData,
      frame.innerWidth,
      frame.innerHeight,
    );
    const { factor } = scales;
    const numPoints = drawnData.x.length;
    const positions = new Float32Array(2 * numPoints).fill(Number.NaN);
    for (const [index, x] of drawnData.x.entries()) {
      const y = drawnData.y[index];
      if (y === undefined || !Number.isFinite(x) || !Number.isFinite(y)) {
        continue;
      }
      positions[2 * index] = scales.x(x * factor);
      positions[2 * index + 1] = scales.y(y * factor);
    }
    const { colours } = drawnData;
    let paths: PointsPath[];
    switch (colours.kind) {
      case "groups":
        paths = groupPaths(colours, positions);
        break;
      case "values": {
        const legend = legendOf(colours, [drawnData.x, drawnData.y]);
        if (legend.kind !== "values") {
          throw new Error(
            "popnei_web defect: the legend of a colouring by values is not of values.",
          );
        }
        paths = valuePaths(colours, positions, legend.min, legend.max);
        break;
      }
    }
    // The join puts the paths in the order of `paths`, the highlighted
    // group last.
    frame.marks
      .selectAll<SVGPathElement, PointsPath>("path.chart-points")
      .data(paths, (path) => path.key)
      .join("path")
      .attr("class", (path) => path.className)
      .attr("fill", (path) => path.fill)
      .attr("d", (path) => path.d);
    if (factor === 1) {
      frame.axes(scales.x, scales.y);
    } else {
      // The labels at the size of the coordinates, which the ticks are a
      // factor of. An axis that runs past the largest number would have a
      // tick there whose label reads "Infinity", which a user would take
      // for a value of the data, so it is left out.
      const tick = (value: number): string =>
        String(tableNumber(value / factor)).replaceAll("-", MINUS);
      frame.axes(scales.x, scales.y, {
        xFormat: tick,
        yFormat: tick,
        tickShown: (value) => Number.isFinite(value / factor),
      });
    }
    // The point under the pointer may have moved: the next movement of
    // the pointer finds it again.
    dismissed = null;
    clearHover();
    last = {
      data: drawnData,
      positions,
      margin: frame.margin,
      annotations: frame.annotations,
    };
  }

  const definition: Plot2dDefinition<ScatterData> = {
    kind: "scatter",
    check: checkScatter,
    margin: () => SCATTER_MARGIN,
    draw,
    pointer: {
      move(x, y) {
        if (last === null) return;
        // The point whose tooltip is shown stays under the pointer while
        // the pointer is within HOVER_RADIUS of it, though another point
        // be nearer, so that the pointer can reach its tooltip.
        if (hovered !== null) {
          const px = last.positions[2 * hovered] ?? Number.NaN;
          const py = last.positions[2 * hovered + 1] ?? Number.NaN;
          if (Math.hypot(px - x, py - y) <= HOVER_RADIUS) return;
        }
        const point = nearestPoint(last.positions, x, y, HOVER_RADIUS);
        if (point === null) {
          dismissed = null;
          clearHover();
          return;
        }
        if (point === hovered || point === dismissed) return;
        showHover(last, point);
      },
      leave(to) {
        // A leave onto the tooltip is not a leave of the plot.
        if (tooltip.holds(to)) return;
        dismissed = null;
        clearHover();
      },
    },
    drawExport(legend, frame, drawnData) {
      drawLegendSvg(
        legend,
        legendOf(drawnData.colours, [drawnData.x, drawnData.y]),
        frame.margin.left,
        frame.margin.left + frame.innerWidth,
        frame.margin.top,
        frame.margin.top + frame.innerHeight,
      );
    },
  };

  const base = createPlot2d(element, data, definition);
  return {
    update(next) {
      base.update(next);
    },
    destroy() {
      // A screen that marked the row of the point unmarks it.
      clearHover();
      base.destroy();
      tooltip.destroy();
    },
    toSVG() {
      return base.toSVG();
    },
    toPNG(scale) {
      return base.toPNG(scale);
    },
  };
};
