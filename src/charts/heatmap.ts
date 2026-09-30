/**
 * The heatmap of the distances between populations
 * (docs/specs/charts/heatmap.md): a square grid with a row and a column
 * for each name, each cell off the diagonal filled with the colour of
 * viridis of its value, from 0 to the largest value, the value written in
 * a cell large enough, and a bar of the colours beside it. It is drawn on
 * the base of the 2D plots, plot2d.ts, which gives it its SVG, its size,
 * its axes of names, its handle and its export; it draws the cells, one
 * path per step of viridis, the values, the legend, and the tooltip of
 * the cell under the pointer.
 */

import type { Path } from "d3-path";
import { pathRound } from "d3-path";
import { scaleBand } from "d3-scale";
import type { ScaleBand } from "d3-scale";
import { createTooltip } from "./hover.ts";
import { MAX_HEATMAP_NAMES } from "./limits.ts";
import { PATH_DIGITS, viridisColour, viridisStep } from "./marks.ts";
import {
  createPlot2d,
  type Frame,
  type Group,
  type Margin,
  type Plot2dDefinition,
  type PlotText,
} from "./plot2d.ts";
import type { Chart } from "./types.ts";

/** The data of the heatmap: the names and the values of each pair of them. */
export interface HeatmapData extends PlotText {
  /** The names, the first row at the top and the first column at the left. */
  readonly names: readonly string[];
  /**
   * names.length × names.length values, row by row, symmetric; the
   * diagonal is not read; NaN for no value, and an infinity is drawn as
   * none too.
   */
  readonly values: Float64Array;
  /**
   * What the values are, "Hudson's Fst": the title of the legend and the
   * start of the tooltip's value.
   */
  readonly valueName: string;
}

/**
 * The band, in pixels, from which a cell holds its value: "−0.0113", the
 * longest, is about 50 pixels wide at 7.2 pixels a character, and the
 * cell is the band less its gap of 1 pixel. Meanwhile, refined in the
 * running application (heatmap.md, "The values in the cells").
 */
export const CELL_TEXT_MIN = 56;

/**
 * The band, in pixels, below which the names of the axes are not
 * written: 12, the size of their text, below which they would overlap.
 */
const NAMES_MIN = 12;

/** The width counted for a character of the text of the plots, at 12 pixels. */
const CHARACTER_WIDTH = 7.2;

/** The longest name written whole, in characters; a longer one is cut. */
const NAME_WHOLE = 20;

/** The ellipsis that ends a name cut after its first 19 characters. */
const ELLIPSIS = "…";

/** Between the grid and the names of its axes, the axis's own 8 pixels. */
const NAME_PADDING = 8;

/**
 * The height a slanted name takes for each pixel of its width: the sine
 * of 45°, 0.71.
 */
const SLANT = 0.71;

/** The angle of the names under the columns. */
const NAME_ANGLE = -45;

/** Below the slanted names, to the bottom of the SVG. */
const BOTTOM_PADDING = 8;

/** The top margin, where the name of the value stands over the legend. */
const TOP_MARGIN = 24;

/** From the baseline of the name of the value to the top of the grid. */
const LEGEND_TITLE_ABOVE = 8;

/** From the right of the grid to the bar of the legend. */
const LEGEND_GAP = 16;

/** The width of the bar of the legend. */
const BAR_WIDTH = 12;

/** From the bar to the numbers at its ends. */
const BAR_TEXT_GAP = 4;

/** The highest the bar of the legend is, when the grid is higher. */
const BAR_MAX_HEIGHT = 240;

/** The bands of viridis of the bar of the legend. */
const BAR_BANDS = 32;

/** The steps of viridis a band of the bar stands for, 256 / 32. */
const STEPS_PER_BAND = 256 / BAR_BANDS;

/**
 * The first step of viridis whose text is black: from 111 to 255 black
 * has the larger contrast with the cell, from 0 to 110 white, the least
 * of the two 4.60:1, at step 110 (heatmap.md, "The values in the cells").
 */
const FIRST_DARK_TEXT_STEP = 111;

/** The minus sign, U+2212, of the numbers of the plots. */
const MINUS = "−";

/** The words of the legend and the tooltip for a pair with no value. */
const NO_VALUE = "no value";

/**
 * A value of a cell, of its tooltip and of the legend: four decimals, the
 * minus sign U+2212, "0.1027", "−0.0113"; a value that rounds to 0 is
 * "0.0000", with no sign.
 */
export function heatmapNumber(value: number): string {
  const text = value.toFixed(4);
  return text === "-0.0000" ? "0.0000" : text.replace("-", MINUS);
}

/**
 * The step of viridis of the finite `value` of a cell, on the scale from
 * 0 to `largest`, the largest finite value of the matrix when it is
 * above 0: a negative value takes the colour of 0. With `largest` null,
 * no value being above 0, every cell is of step 0 and viridisStep is not
 * called, which would give the middle step for two equal ends.
 */
export function cellStep(value: number, largest: number | null): number {
  if (largest === null) return 0;
  return viridisStep(Math.max(value, 0), 0, largest);
}

/**
 * The class of the text of a cell of `step`: `chart-cell-text-dark`,
 * black, on the steps 111 to 255, and `chart-cell-text-light`, white, on
 * the steps 0 to 110.
 */
export function cellTextClass(step: number): string {
  return step >= FIRST_DARK_TEXT_STEP
    ? "chart-cell-text-dark"
    : "chart-cell-text-light";
}

/**
 * A name as the axes write it: whole up to 20 characters, and cut after
 * 19 with an ellipsis above them, "population_number_1…"; the tooltip
 * gives it whole.
 */
export function axisName(name: string): string {
  const characters = Array.from(name);
  return characters.length <= NAME_WHOLE
    ? name
    : `${characters.slice(0, NAME_WHOLE - 1).join("")}${ELLIPSIS}`;
}

/**
 * Where the band of `name` starts, in pixels of the frame; throws an
 * `Error`, a defect, for a name that is not one of the scale's.
 */
function bandStart(scale: ScaleBand<string>, name: string): number {
  const start = scale(name);
  if (start === undefined) {
    throw new Error(
      `popnei_web defect: the heatmap has no band of the name ${JSON.stringify(name)}.`,
    );
  }
  return start;
}

/** The value of the cell of row `row` and column `column`. */
function valueAt(data: HeatmapData, row: number, column: number): number {
  const value = data.values[row * data.names.length + column];
  if (value === undefined) {
    throw new Error(
      `popnei_web defect: the heatmap has no cell of row ${String(row)} and column ${String(column)}.`,
    );
  }
  return value;
}

/**
 * The top of the scale of the colours: the largest finite value off the
 * diagonal when it is above 0; null when no value is above 0, and when
 * no value is finite.
 */
function largestOf(data: HeatmapData): number | null {
  const numNames = data.names.length;
  let largest = 0;
  for (let row = 0; row < numNames; row++) {
    for (let column = 0; column < numNames; column++) {
      if (row === column) continue;
      const value = valueAt(data, row, column);
      if (Number.isFinite(value) && value > largest) largest = value;
    }
  }
  return largest > 0 ? largest : null;
}

/** True when a value off the diagonal is finite. */
function hasFinite(data: HeatmapData): boolean {
  const numNames = data.names.length;
  for (let row = 0; row < numNames; row++) {
    for (let column = 0; column < numNames; column++) {
      if (row !== column && Number.isFinite(valueAt(data, row, column))) {
        return true;
      }
    }
  }
  return false;
}

/**
 * The texts of the legend beside its bar: the largest value and 0; "0.0000"
 * alone when no value is above 0; "no value" when no value is finite.
 */
function legendValues(data: HeatmapData): string[] {
  if (!hasFinite(data)) return [NO_VALUE];
  const largest = largestOf(data);
  return largest === null
    ? [heatmapNumber(0)]
    : [heatmapNumber(largest), heatmapNumber(0)];
}

/**
 * The margins of the heatmap for `data`, fixed numbers made from the
 * data at 7.2 pixels a character, since nothing in a plot measures text:
 * left, 8 pixels and the longest name as written; bottom, 8 pixels, 0.71
 * of that width, the slant of 45°, and 8 more; top, 24, for the name of
 * the value; right, 16 pixels, the bar, 4 pixels and the longest of the
 * name of the value and the texts at the ends of the bar
 * (heatmap.md, "The names on the axes" and "The legend").
 */
export function heatmapMargin(data: HeatmapData): Margin {
  const longestName = Math.max(
    0,
    ...data.names.map((name) => Array.from(axisName(name)).length),
  );
  const namesWidth = longestName * CHARACTER_WIDTH;
  const longestLegend = Math.max(
    Array.from(data.valueName).length,
    ...legendValues(data).map((text) => text.length),
  );
  return {
    top: TOP_MARGIN,
    right:
      LEGEND_GAP + BAR_WIDTH + BAR_TEXT_GAP + longestLegend * CHARACTER_WIDTH,
    bottom: NAME_PADDING + SLANT * namesWidth + BOTTOM_PADDING,
    left: NAME_PADDING + namesWidth,
  };
}

/**
 * The band scale of the names over the side of the grid, the smaller of
 * the frame's width and height, so that the cells are square, with a gap
 * of 1 pixel between two cells: the inner padding of 1 pixel over the
 * band, which gives a band of (side + 1) / names. When the band would be
 * below 2 pixels the cells touch, with no gap, since a gap of 1 pixel
 * would be most of each cell.
 */
export function heatmapScale(
  names: readonly string[],
  innerWidth: number,
  innerHeight: number,
): ScaleBand<string> {
  const side = Math.min(innerWidth, innerHeight);
  const gap = names.length / (side + 1);
  return scaleBand()
    .domain(names)
    .range([0, side])
    .paddingInner(gap <= 0.5 ? gap : 0)
    .paddingOuter(0);
}

/**
 * Throws an `Error`, a defect of the caller, for fewer than 2 or more
 * than MAX_HEATMAP_NAMES names, two names alike, `values` not of
 * names.length squared numbers, and two cells of one pair whose values
 * differ, NaN being equal to NaN there.
 */
function checkHeatmap(data: HeatmapData): void {
  const numNames = data.names.length;
  if (numNames < 2 || numNames > MAX_HEATMAP_NAMES) {
    throw new Error(
      `popnei_web defect: a heatmap was given ${String(numNames)} names, where it draws from 2 to ${String(MAX_HEATMAP_NAMES)}.`,
    );
  }
  const seen = new Set<string>();
  for (const name of data.names) {
    if (seen.has(name)) {
      throw new Error(
        `popnei_web defect: a heatmap was given the name ${JSON.stringify(name)} twice.`,
      );
    }
    seen.add(name);
  }
  if (data.values.length !== numNames * numNames) {
    throw new Error(
      `popnei_web defect: a heatmap of ${String(numNames)} names was given ${String(data.values.length)} values, not ${String(numNames * numNames)}.`,
    );
  }
  for (let row = 0; row < numNames; row++) {
    for (let column = row + 1; column < numNames; column++) {
      const value = valueAt(data, row, column);
      const mirror = valueAt(data, column, row);
      if (value !== mirror && !(Number.isNaN(value) && Number.isNaN(mirror))) {
        throw new Error(
          `popnei_web defect: the heatmap's cells of ${JSON.stringify(data.names[row])} and ${JSON.stringify(data.names[column])} differ, ${String(value)} and ${String(mirror)}.`,
        );
      }
    }
  }
}

/** A path of cells: its key in the join, its class, its fill and its drawing. */
interface CellsPath {
  readonly key: string;
  readonly fill: string;
  readonly d: string;
}

/** The value written in a cell, keyed by its row and column. */
interface CellText {
  readonly key: string;
  readonly x: number;
  readonly y: number;
  readonly className: string;
  readonly text: string;
}

/** A band of the bar of the legend: its place from the bottom and its colour. */
interface BarBand {
  readonly band: number;
  readonly fill: string;
}

/** A text of the legend: the name of the value, or a number at an end of the bar. */
interface LegendText {
  readonly key: string;
  readonly className: string;
  readonly x: number;
  readonly y: number;
  readonly dy: string;
  readonly text: string;
}

/** A cell of the grid off the diagonal, by its row and its column. */
interface Cell {
  readonly row: number;
  readonly column: number;
}

/** What the last draw left for the pointer: the bands, and on what data. */
interface LastDraw {
  readonly data: HeatmapData;
  readonly scale: ScaleBand<string>;
  readonly margin: Margin;
  readonly annotations: Group;
}

/**
 * The cell of `drawn` under (x, y) of the frame, found by division: none
 * in a gap between two cells, in the room right of or under the grid,
 * and on the diagonal.
 */
function cellAt(drawn: LastDraw, x: number, y: number): Cell | null {
  const step = drawn.scale.step();
  const width = drawn.scale.bandwidth();
  const numNames = drawn.data.names.length;
  const column = Math.floor(x / step);
  const row = Math.floor(y / step);
  if (
    !(column >= 0 && column < numNames && row >= 0 && row < numNames) ||
    x - column * step >= width ||
    y - row * step >= width ||
    row === column
  ) {
    return null;
  }
  return { row, column };
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

/** Draws the cells, the paths of their steps, the path of none and the values. */
function drawCells(
  frame: Frame,
  data: HeatmapData,
  scale: ScaleBand<string>,
): void {
  const { names } = data;
  const largest = largestOf(data);
  const width = scale.bandwidth();
  const band = scale.step();
  const writesValues = band >= CELL_TEXT_MIN;
  const steps = new Map<number, Path>();
  const none = pathRound(PATH_DIGITS);
  let hasNone = false;
  const texts: CellText[] = [];
  for (const [row, rowName] of names.entries()) {
    const top = bandStart(scale, rowName);
    for (const [column, columnName] of names.entries()) {
      if (row === column) continue;
      const left = bandStart(scale, columnName);
      const value = valueAt(data, row, column);
      if (!Number.isFinite(value)) {
        none.rect(left, top, width, width);
        none.moveTo(left, top);
        none.lineTo(left + width, top + width);
        hasNone = true;
        continue;
      }
      const step = cellStep(value, largest);
      let path = steps.get(step);
      if (path === undefined) {
        path = pathRound(PATH_DIGITS);
        steps.set(step, path);
      }
      path.rect(left, top, width, width);
      if (writesValues) {
        texts.push({
          key: JSON.stringify([rowName, columnName]),
          x: left + width / 2,
          y: top + width / 2,
          className: `chart-cell-text ${cellTextClass(step)}`,
          text: heatmapNumber(value),
        });
      }
    }
  }
  const paths: CellsPath[] = [...steps.entries()]
    .toSorted(([a], [b]) => a - b)
    .map(([step, path]) => ({
      key: String(step),
      fill: viridisColour(step),
      d: path.toString(),
    }));

  // The cells under the path of none and under the values, which the
  // joins keep last.
  frame.marks
    .selectAll<SVGPathElement, CellsPath>("path.chart-cells")
    .data(paths, (path) => path.key)
    .join((enter) =>
      enter
        .insert("path", "path.chart-cell-none, text.chart-cell-text")
        .attr("class", "chart-cells"),
    )
    .attr("fill", (path) => path.fill)
    .attr("d", (path) => path.d)
    .order();
  frame.marks
    .selectAll<SVGPathElement, string>("path.chart-cell-none")
    .data(hasNone ? [none.toString()] : [])
    .join((enter) =>
      enter
        .insert("path", "text.chart-cell-text")
        .attr("class", "chart-cell-none"),
    )
    .attr("d", (d) => d);
  frame.marks
    .selectAll<SVGTextElement, CellText>("text.chart-cell-text")
    .data(texts, (text) => text.key)
    .join("text")
    .attr("class", (text) => text.className)
    .attr("x", (text) => text.x)
    .attr("y", (text) => text.y)
    // Centred up by its dy, as every text of the plots is, and not by a
    // baseline of CSS, which a program that opens the file may ignore.
    .attr("dy", "0.35em")
    .text((text) => text.text);
}

/**
 * Draws the legend from the top left of the SVG, right of the grid: the
 * name of the value above; a bar of 32 bands of viridis as high as the
 * grid, at most 240 pixels, the largest value at its top and 0 at its
 * bottom, one band of step 0 when no value is above 0, none when no value
 * is finite; and the texts at its ends, or "no value".
 */
function drawLegend(frame: Frame, data: HeatmapData, side: number): void {
  const barLeft = frame.margin.left + side + LEGEND_GAP;
  const barTop = frame.margin.top;
  const barHeight = Math.min(side, BAR_MAX_HEIGHT);
  const textLeft = barLeft + BAR_WIDTH + BAR_TEXT_GAP;
  const finite = hasFinite(data);
  const largest = largestOf(data);
  let bands: BarBand[] = [];
  const texts: LegendText[] = [
    {
      key: "title",
      className: "chart-legend-text chart-legend-title",
      x: barLeft,
      y: barTop - LEGEND_TITLE_ABOVE,
      dy: "0",
      text: data.valueName,
    },
  ];
  if (!finite) {
    texts.push({
      key: "none",
      className: "chart-legend-text chart-legend-value",
      x: barLeft,
      y: barTop,
      dy: "0.71em",
      text: NO_VALUE,
    });
  } else if (largest === null) {
    bands = [{ band: 0, fill: viridisColour(0) }];
    texts.push({
      key: "top",
      className: "chart-legend-text chart-legend-value",
      x: textLeft,
      y: barTop + barHeight / 2,
      dy: "0.35em",
      text: heatmapNumber(0),
    });
  } else {
    bands = Array.from({ length: BAR_BANDS }, (_band, band) => ({
      band,
      // Band 0, at the bottom, stands for the first 8 steps of viridis,
      // and is the colour of their middle.
      fill: viridisColour(band * STEPS_PER_BAND + STEPS_PER_BAND / 2),
    }));
    texts.push(
      {
        key: "top",
        className: "chart-legend-text chart-legend-value",
        x: textLeft,
        y: barTop,
        dy: "0.71em",
        text: heatmapNumber(largest),
      },
      {
        key: "bottom",
        className: "chart-legend-text chart-legend-value",
        x: textLeft,
        y: barTop + barHeight,
        dy: "0",
        text: heatmapNumber(0),
      },
    );
  }
  const bandHeight = bands.length === 0 ? 0 : barHeight / bands.length;
  frame.legend
    .selectAll<SVGRectElement, BarBand>("rect.chart-legend-band")
    .data(bands, (band) => String(band.band))
    .join("rect")
    .attr("class", "chart-legend-band")
    .attr("x", barLeft)
    .attr("y", (band) => barTop + barHeight - (band.band + 1) * bandHeight)
    .attr("width", BAR_WIDTH)
    .attr("height", bandHeight)
    .attr("fill", (band) => band.fill);
  frame.legend
    .selectAll<SVGTextElement, LegendText>("text.chart-legend-text")
    .data(texts, (text) => text.key)
    .join("text")
    .attr("class", (text) => text.className)
    .attr("x", (text) => text.x)
    .attr("y", (text) => text.y)
    .attr("dy", (text) => text.dy)
    .text((text) => text.text);
}

/**
 * Draws the heatmap of `data` in `element`, whose size the screen's CSS
 * gives, and returns its handle. It takes no events: no screen needs the
 * cell under the pointer.
 *
 * Throws an `Error`, a defect of the caller, here and in `update`, for
 * fewer than 2 or more than MAX_HEATMAP_NAMES names, two names alike,
 * `values` not of names.length squared numbers, and two cells of one
 * pair whose values differ, NaN being equal to NaN there.
 */
export const createHeatmap: Chart<HeatmapData> = (element, data) => {
  let last: LastDraw | null = null;
  /** The cell whose tooltip and mark are shown. */
  let hovered: Cell | null = null;
  /**
   * The cell whose tooltip Escape hid: it stays hidden until the pointer
   * is on another cell, or leaves every cell and comes back.
   */
  let dismissed: Cell | null = null;

  const same = (a: Cell | null, b: Cell | null): boolean =>
    a !== null && b !== null && a.row === b.row && a.column === b.column;

  /** Hides the mark and the tooltip of the cell under the pointer, if any. */
  function clearHover(): void {
    if (hovered === null) return;
    hovered = null;
    tooltip.hide();
    last?.annotations.selectAll("path.chart-hover").remove();
  }

  const tooltip = createTooltip(
    element,
    (by) => {
      // Escape, or the pointer gone from the tooltip onto an axis, the
      // margin or out of the plot: the tooltip is hidden already.
      if (hovered === null) return;
      dismissed = by === "escape" ? hovered : null;
      hovered = null;
      last?.annotations.selectAll("path.chart-hover").remove();
    },
    // The overlay of this plot, whose movements find the cell.
    (target) =>
      target instanceof Element &&
      target.classList.contains("chart-overlay") &&
      element.contains(target),
  );

  function showHover(drawn: LastDraw, cell: Cell): void {
    const { names, valueName } = drawn.data;
    const rowName = names[cell.row];
    const columnName = names[cell.column];
    if (rowName === undefined || columnName === undefined) {
      throw new Error(
        `popnei_web defect: the cell of row ${String(cell.row)} and column ${String(cell.column)} under the pointer is not a cell of the heatmap.`,
      );
    }
    const value = valueAt(drawn.data, cell.row, cell.column);
    hovered = cell;
    dismissed = null;
    const left = bandStart(drawn.scale, columnName);
    const top = bandStart(drawn.scale, rowName);
    const width = drawn.scale.bandwidth();
    const outline = pathRound(PATH_DIGITS);
    outline.rect(left, top, width, width);
    drawn.annotations
      .selectAll("path.chart-hover")
      .data([outline.toString()])
      .join("path")
      .attr("class", "chart-hover")
      .attr("d", (d) => d);
    const padding = paddingOf(element);
    // Set as text by the tooltip, never as markup: the names come from
    // the user's files.
    tooltip.show(
      [
        `${rowName} and ${columnName}`,
        Number.isFinite(value)
          ? `${valueName} ${heatmapNumber(value)}`
          : `${valueName}: ${NO_VALUE}`,
      ],
      padding.left + drawn.margin.left + left + width / 2,
      padding.top + drawn.margin.top + top + width / 2,
    );
  }

  function draw(frame: Frame, drawnData: HeatmapData): void {
    const scale = heatmapScale(
      drawnData.names,
      frame.innerWidth,
      frame.innerHeight,
    );
    const side = Math.min(frame.innerWidth, frame.innerHeight);
    drawCells(frame, drawnData, scale);
    drawLegend(frame, drawnData, side);
    // Below 12 pixels a band has no room for its name: the axes are
    // drawn with no name, and the description says the order.
    const axisScale =
      scale.step() >= NAMES_MIN
        ? scale
        : scaleBand().domain([]).range([0, side]);
    frame.axes(axisScale, axisScale, {
      xLabelAngle: NAME_ANGLE,
      nameFormat: axisName,
    });
    // The cell under the pointer may have moved: the next movement of the
    // pointer finds it again.
    dismissed = null;
    clearHover();
    last = {
      data: drawnData,
      scale,
      margin: frame.margin,
      annotations: frame.annotations,
    };
  }

  const definition: Plot2dDefinition<HeatmapData> = {
    kind: "heatmap",
    check: checkHeatmap,
    margin: heatmapMargin,
    draw,
    pointer: {
      move(x, y) {
        if (last === null) return;
        const cell = cellAt(last, x, y);
        if (cell === null) {
          dismissed = null;
          clearHover();
          return;
        }
        if (same(cell, hovered) || same(cell, dismissed)) return;
        showHover(last, cell);
      },
      leave(to) {
        // A leave onto the tooltip is not a leave of the plot.
        if (tooltip.holds(to)) return;
        dismissed = null;
        clearHover();
      },
    },
  };

  const base = createPlot2d(element, data, definition);
  return {
    update(next) {
      base.update(next);
    },
    destroy() {
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
