/**
 * The line plot (docs/specs/charts/line.md): a few series of numbers
 * against a numeric horizontal axis, each series drawn as its points, a
 * line and marks at chosen places along it, in the colour and the shape
 * of its group, with a legend in the SVG. The LD decay draws one series
 * per population: the mean r² of its bins as the points, its fitted curve
 * as the line, and a mark at its half distance; the plot knows nothing of
 * distances or of r². It is drawn on the base of the 2D plots, plot2d.ts,
 * which gives it its SVG, its size, its axes, its handle and its export,
 * and it takes no pointer.
 */

import { pathRound } from "d3-path";
import { scaleLinear } from "d3-scale";
import type { ScaleLinear } from "d3-scale";
import { select } from "d3-selection";
import { line as lineShape } from "d3-shape";
import { MAX_LINE_SERIES, MAX_SVG_POINTS } from "./limits.ts";
import {
  drawSymbolAt,
  groupColourClass,
  groupMark,
  groupSymbol,
  isOutlined,
  PATH_DIGITS,
  SYMBOL_AREA,
  symbolPath,
} from "./marks.ts";
import { createPlot2d } from "./plot2d.ts";
import type { Frame, Margin, Plot2dDefinition, PlotText } from "./plot2d.ts";
import type { Chart } from "./types.ts";

/**
 * What a line plot draws. Every text is the screen's, with the texts of
 * PlotText: xLabel "Distance between the two variants (bp)", yLabel
 * "Mean r² of the pairs". A value that is not finite is not drawn, and
 * the screen says what the missing values are.
 */
export interface LineData extends PlotText {
  /** The series, in the order of the legend; at most MAX_LINE_SERIES. */
  readonly series: readonly LineSeries[];
  /**
   * The range of the horizontal axis, finite, the first below the second;
   * the axis ends there, not made round.
   */
  readonly xDomain: readonly [number, number];
  /** The range of the vertical axis, as `xDomain`. */
  readonly yDomain: readonly [number, number];
  /** Ticks of the horizontal axis at whole numbers, with commas: "20,000". */
  readonly xWholeNumbers: boolean;
  /** Ticks of the vertical axis at whole numbers, with commas. */
  readonly yWholeNumbers: boolean;
}

/** One set of numbers drawn together, a population for the LD decay. */
export interface LineSeries {
  /** The label of the legend, written as text: "pop_a · half at 7,548 bp". */
  readonly label: string;
  /**
   * Its group for the colour and the shape, by the rule of the scatter:
   * a whole number from 0, one series per group.
   */
  readonly group: number;
  /** Drawn one mark each; a point with NaN, or outside the ranges, skipped. */
  readonly points: XY;
  /** Drawn through in order, broken at a NaN; null for no line. */
  readonly line: XY | null;
  /**
   * Each a dashed vertical line from the axis up to y, and the mark of the
   * series at its top; one with NaN, or outside the ranges, left out whole.
   */
  readonly marks: readonly { readonly x: number; readonly y: number }[];
}

/** Two arrays of one length. */
export interface XY {
  readonly x: Float64Array;
  readonly y: Float64Array;
}

/**
 * The margins of the line plot, in CSS pixels, as the histogram's without
 * a threshold; the legend is inside the frame and asks for none.
 */
export const LINE_MARGIN: Margin = {
  top: 12,
  right: 16,
  bottom: 44,
  left: 60,
};

/** The area of the mark at the top of a mark's line: 1.5 times a point's. */
const MARK_AREA = 1.5 * SYMBOL_AREA;
/** From the top of the frame to the top of the first row of the legend. */
const LEGEND_TOP = 8;
/** From the top of one row of the legend to the top of the next. */
const LEGEND_ROW = 18;
/** From the right edge of the frame to the right end of a row's line. */
const LEGEND_RIGHT = 8;
/** The length of the piece of line of a row, with its mark at its middle. */
const LEGEND_LINE = 24;
/** Between the start of a row's piece of line and the end of its text. */
const LEGEND_GAP = 6;

/** Throws the defect of a range of an axis that is not finite and in order. */
function checkDomain(axis: string, domain: readonly [number, number]): void {
  const [start, end] = domain;
  if (!Number.isFinite(start) || !Number.isFinite(end) || !(start < end)) {
    throw new Error(
      `popnei_web defect: the ${axis} range of a line plot is [${String(start)}, ${String(end)}], not two finite numbers, the first below the second.`,
    );
  }
}

/** Throws the defect of two arrays of `what` of different lengths. */
function checkXY(what: string, xy: XY): void {
  if (xy.x.length !== xy.y.length) {
    throw new Error(
      `popnei_web defect: the ${what} were given ${String(xy.x.length)} values across and ${String(xy.y.length)} up.`,
    );
  }
}

/**
 * Throws an `Error`, a defect of the caller, for data the line plot cannot
 * draw by its contract: a range whose ends are not finite or not in
 * order; points or a line whose two arrays differ in length; a group that
 * is not a whole number from 0, or two series of one group; more than
 * MAX_LINE_SERIES series; and more than MAX_SVG_POINTS points and
 * positions of lines together.
 */
function checkLine(data: LineData): void {
  checkDomain("horizontal", data.xDomain);
  checkDomain("vertical", data.yDomain);
  if (data.series.length > MAX_LINE_SERIES) {
    throw new Error(
      `popnei_web defect: a line plot was given ${String(data.series.length)} series, more than the ${String(MAX_LINE_SERIES)} it draws.`,
    );
  }
  const groups = new Set<number>();
  let numPositions = 0;
  for (const series of data.series) {
    const { group } = series;
    if (!Number.isInteger(group) || group < 0) {
      throw new Error(
        `popnei_web defect: the series "${series.label}" of a line plot is of group ${String(group)}, not a whole number from 0.`,
      );
    }
    if (groups.has(group)) {
      throw new Error(
        `popnei_web defect: two series of a line plot are of group ${String(group)}, and would be drawn alike.`,
      );
    }
    groups.add(group);
    checkXY(`points of the series "${series.label}"`, series.points);
    numPositions += series.points.x.length;
    if (series.line !== null) {
      checkXY(`line of the series "${series.label}"`, series.line);
      numPositions += series.line.x.length;
    }
  }
  if (numPositions > MAX_SVG_POINTS) {
    throw new Error(
      `popnei_web defect: a line plot was given ${String(numPositions)} points and positions of lines, more than the ${String(MAX_SVG_POINTS)} it draws.`,
    );
  }
}

/** The class of the colour of a line of `group`: chart-line-colour-‹0 to 6›. */
function lineColourClass(group: number): string {
  return `chart-line-colour-${String(groupMark(group).colour)}`;
}

/** Whether `value` lies in `domain`, its ends included. */
function within(value: number, domain: readonly [number, number]): boolean {
  return value >= domain[0] && value <= domain[1];
}

/** A path of the marks: a casing, a line or the points of a series. */
interface MarksPath {
  readonly key: string;
  readonly className: string;
  readonly d: string;
}

/** A mark drawn: where it is, in pixels of the frame, and its group. */
interface DrawnMark {
  readonly key: string;
  readonly group: number;
  readonly x: number;
  readonly y: number;
}

/**
 * The paths of the marks group in the order they are drawn: every line,
 * each on its casing for a light colour, then the points of every series
 * that has one within the ranges, series by series.
 */
function marksPaths(
  data: LineData,
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>,
): MarksPath[] {
  const lines: MarksPath[] = [];
  const points: MarksPath[] = [];
  // A line over the indices of its positions, broken where one is not finite.
  const shape = lineShape<number>().digits(PATH_DIGITS);
  for (const series of data.series) {
    const { group } = series;
    const key = String(group);
    if (series.line !== null) {
      const { x: lineX, y: lineY } = series.line;
      const at = (index: number): [number, number] => [
        lineX[index] ?? Number.NaN,
        lineY[index] ?? Number.NaN,
      ];
      const d = shape
        .defined((index) => {
          const [valueX, valueY] = at(index);
          return Number.isFinite(valueX) && Number.isFinite(valueY);
        })
        .x((index) => x(at(index)[0]))
        .y((index) => y(at(index)[1]))(
        Array.from({ length: lineX.length }, (_each, index) => index),
      );
      if (d !== null && d !== "") {
        if (isOutlined(group)) {
          lines.push({
            key: `casing-${key}`,
            className: "chart-line-casing",
            d,
          });
        }
        lines.push({
          key: `line-${key}`,
          className: `chart-line ${lineColourClass(group)}`,
          d,
        });
      }
    }
    const path = pathRound(PATH_DIGITS);
    let drawn = false;
    const symbol = groupSymbol(group);
    for (const [index, valueX] of series.points.x.entries()) {
      const valueY = series.points.y[index] ?? Number.NaN;
      if (!within(valueX, data.xDomain) || !within(valueY, data.yDomain)) {
        continue;
      }
      drawSymbolAt(path, symbol, SYMBOL_AREA, x(valueX), y(valueY));
      drawn = true;
    }
    if (drawn) {
      points.push({
        key: `points-${key}`,
        className: `chart-points ${groupColourClass(group)}`,
        d: path.toString(),
      });
    }
  }
  return [...lines, ...points];
}

/**
 * The marks of every series within the ranges, in pixels of the frame,
 * series by series; a mark with a NaN, or outside a range, is left out.
 */
function drawnMarks(
  data: LineData,
  x: ScaleLinear<number, number>,
  y: ScaleLinear<number, number>,
): DrawnMark[] {
  const marks: DrawnMark[] = [];
  for (const series of data.series) {
    for (const [index, mark] of series.marks.entries()) {
      if (!within(mark.x, data.xDomain) || !within(mark.y, data.yDomain)) {
        continue;
      }
      marks.push({
        key: `${String(series.group)}-${String(index)}`,
        group: series.group,
        x: x(mark.x),
        y: y(mark.y),
      });
    }
  }
  return marks;
}

/** The `d` of the mark of `group` at 1.5 times the area, at (x, y). */
function markPath(group: number, x: number, y: number): string {
  const path = pathRound(PATH_DIGITS);
  drawSymbolAt(path, groupSymbol(group), MARK_AREA, x, y);
  return path.toString();
}

/**
 * The legend: a row per series in their order, from the top right corner
 * of the frame, each with its piece of line, on a casing for a light
 * colour, its mark at the middle of that piece, and its text ending before
 * it. It is placed without measuring its text.
 */
function drawLegend(frame: Frame, data: LineData): void {
  const right = frame.margin.left + frame.innerWidth - LEGEND_RIGHT;
  const top = frame.margin.top + LEGEND_TOP + LEGEND_ROW / 2;
  frame.legend
    .selectAll<SVGGElement, LineSeries>("g.chart-legend-row")
    .data(data.series, (series) => String(series.group))
    .join("g")
    .attr("class", "chart-legend-row")
    .attr(
      "transform",
      (_series, index) =>
        `translate(${String(right)},${String(top + index * LEGEND_ROW)})`,
    )
    .each(function drawRow(series) {
      // A row is drawn anew each time: a series keeps its group, but its
      // label may change.
      const row = select(this);
      row.selectAll("*").remove();
      const { group } = series;
      const piece = (className: string): void => {
        row
          .append("line")
          .attr("class", className)
          .attr("x1", -LEGEND_LINE)
          .attr("x2", 0)
          .attr("y1", 0)
          .attr("y2", 0);
      };
      if (isOutlined(group)) piece("chart-line-casing");
      piece(`chart-line ${lineColourClass(group)}`);
      row
        .append("path")
        .attr("class", `chart-points ${groupColourClass(group)}`)
        .attr("transform", `translate(${String(-LEGEND_LINE / 2)},0)`)
        .attr("d", symbolPath(group));
      row
        .append("text")
        .attr("class", "chart-legend-text")
        .attr("x", -(LEGEND_LINE + LEGEND_GAP))
        .attr("dy", "0.35em")
        .text(series.label);
    });
}

function drawLine(frame: Frame, data: LineData): void {
  const x = scaleLinear().domain(data.xDomain).range([0, frame.innerWidth]);
  const y = scaleLinear().domain(data.yDomain).range([frame.innerHeight, 0]);

  // The join puts the paths in the order of the list, every line before
  // every set of points.
  frame.marks
    .selectAll<SVGPathElement, MarksPath>("path")
    .data(marksPaths(data, x, y), (path) => path.key)
    .join("path")
    .attr("class", (path) => path.className)
    .attr("d", (path) => path.d);

  const marks = drawnMarks(data, x, y);
  frame.annotations
    .selectAll<SVGLineElement, DrawnMark>("line.chart-mark-line")
    .data(marks, (mark) => mark.key)
    .join("line")
    .attr("class", (mark) => `chart-mark-line ${lineColourClass(mark.group)}`)
    .attr("x1", (mark) => mark.x)
    .attr("x2", (mark) => mark.x)
    .attr("y1", frame.innerHeight)
    .attr("y2", (mark) => mark.y);
  frame.annotations
    .selectAll<SVGPathElement, DrawnMark>("path.chart-mark")
    .data(marks, (mark) => mark.key)
    .join("path")
    .attr(
      "class",
      (mark) => `chart-points chart-mark ${groupColourClass(mark.group)}`,
    )
    .attr("d", (mark) => markPath(mark.group, mark.x, mark.y))
    // Over every dashed line, those that entered with this draw included.
    .raise();

  drawLegend(frame, data);

  frame.axes(x, y, {
    xWholeNumbers: data.xWholeNumbers,
    yWholeNumbers: data.yWholeNumbers,
  });
}

/** The definition of the line plot, which the base of the 2D plots draws. */
const lineDefinition: Plot2dDefinition<LineData> = {
  kind: "line",
  check: checkLine,
  margin: () => LINE_MARGIN,
  draw: drawLine,
};

/**
 * Draws the line plot of `data` in `element`, whose size the screen's CSS
 * gives, and returns its handle. It takes no events and no pointer.
 *
 * Throws an `Error`, a defect of the caller, here and in `update`, for a
 * range whose ends are not finite or not in order; for points or a line
 * whose two arrays differ in length; for a group that is not a whole
 * number from 0, and for two series of one group; for more than
 * MAX_LINE_SERIES series; and for more than MAX_SVG_POINTS points and
 * positions of lines together.
 */
export const createLine: Chart<LineData> = (element, data) =>
  createPlot2d(element, data, lineDefinition);
