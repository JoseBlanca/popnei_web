/**
 * The bar plot of named values (docs/specs/charts/bars.md): one bar
 * across per name, in the order given, the first at the top, from 0 to
 * its value, in the colour of its group; the names down the left side
 * and the axis of the values along the bottom. A name with no value has
 * the words the data give in its row, and no bar. The Populations tab of
 * popgen2.html draws one per column of the table of the diversity; the
 * plot knows nothing of populations. It is drawn on the base of the 2D
 * plots, plot2d.ts, and takes no pointer.
 */

import { scaleBand, scaleLinear } from "d3-scale";
import { MAX_BARS } from "./limits.ts";
import { groupColourClass, groupMark, isOutlined } from "./marks.ts";
import type { ExportSize } from "./export.ts";
import { createPlot2d } from "./plot2d.ts";
import type { Frame, Margin, Plot2dDefinition, PlotText } from "./plot2d.ts";
import type { Chart } from "./types.ts";

/** What a bar plot draws. Every text is the screen's. */
export interface BarsData extends PlotText {
  /** The bars, the first at the top; at most MAX_BARS, their names
      different. */
  readonly bars: readonly Bar[];
  /** The words in the row of a bar with no value: "no value". */
  readonly noValue: string;
}

/** One named value. */
export interface Bar {
  /** The name written beside the bar, as text. */
  readonly name: string;
  /** Its group for the colour, a whole number from 0, as the scatter's. */
  readonly group: number;
  /** Its value, finite and 0 or above; NaN for none. */
  readonly value: number;
}

/** Above the frame, in CSS pixels. */
const TOP = 8;
/** Right of the frame: half the last number of the axis, "0.35". */
const RIGHT = 20;
/** Below the frame: the axis of the values and its label. */
const BOTTOM = 44;
/** The height of a row, a bar and the room around it. */
const ROW = 28;
/** The share of a row between two bars: 7 of its 28 pixels. */
const PADDING_INNER = 0.25;
/** Above the first bar and below the last, half the gap between two. */
const PADDING_OUTER = PADDING_INNER / 2;
/** Between a name and the frame, the base's own 8 pixels of an axis of
    names. */
const NAME_PADDING = 8;
/** Between the left edge of the SVG and the start of the longest name. */
const NAME_EDGE = 4;
/**
 * The width counted for a character of a name, at 12 pixels: 9, as the
 * heatmap counts its names, which at 7.2 cut a name in capitals.
 */
const NAME_CHARACTER_WIDTH = 9;
/** The most characters a name keeps. */
const NAME_MOST = 20;
/** The fewest characters a name keeps, however narrow the element. */
const NAME_LEAST = 4;
/** The share of the width of the element the names may take. */
const NAME_SHARE = 0.4;
/** The ellipsis that ends a name cut. */
const ELLIPSIS = "…";
/** From the axis of the names to the words of a bar with no value. */
const NONE_FROM_AXIS = 4;

/**
 * The height in CSS pixels of an element that holds `numBars` rows: 8
 * above the frame, 28 a row and 44 below it; 136 for 3 names. The screen
 * gives its element this height.
 */
export function barsHeight(numBars: number): number {
  return TOP + ROW * numBars + BOTTOM;
}

/** The characters a name keeps in an element `width` pixels wide: what
    40% of it holds, less the 12 pixels around the names, from 4 to 20. */
function nameRoom(width: number): number {
  const fits = Math.floor(
    (NAME_SHARE * width - NAME_EDGE - NAME_PADDING) / NAME_CHARACTER_WIDTH,
  );
  return Math.min(NAME_MOST, Math.max(NAME_LEAST, fits));
}

/** `name` as the axis writes it in `room` characters: whole when it fits,
    and otherwise its first `room` − 1 and an ellipsis. */
function cutName(name: string, room: number): string {
  const characters = Array.from(name);
  return characters.length <= room
    ? name
    : `${characters.slice(0, room - 1).join("")}${ELLIPSIS}`;
}

/** The margins for `data` in an element of `size`: at the left, the
    longest name as written, at 9 pixels a character, and 12 around it. */
function barsMargin(data: BarsData, size: ExportSize): Margin {
  const room = nameRoom(size.width);
  let longest = 0;
  for (const bar of data.bars) {
    longest = Math.max(longest, Array.from(cutName(bar.name, room)).length);
  }
  return {
    top: TOP,
    right: RIGHT,
    bottom: BOTTOM,
    left: NAME_EDGE + longest * NAME_CHARACTER_WIDTH + NAME_PADDING,
  };
}

/**
 * Throws an `Error`, a defect of the caller, for data the bar plot cannot
 * draw by its contract: more than MAX_BARS bars, two bars of one name, a
 * group that is not a whole number from 0, and a value below 0 or
 * infinite.
 */
function checkBars(data: BarsData): void {
  if (data.bars.length > MAX_BARS) {
    throw new Error(
      `popnei_web defect: a bar plot was given ${String(data.bars.length)} bars, more than the ${String(MAX_BARS)} it draws.`,
    );
  }
  const names = new Set<string>();
  for (const bar of data.bars) {
    if (names.has(bar.name)) {
      throw new Error(
        `popnei_web defect: a bar plot was given the name ${JSON.stringify(bar.name)} twice.`,
      );
    }
    names.add(bar.name);
    // Throws for a group that is not a whole number from 0.
    groupMark(bar.group);
    if (!Number.isNaN(bar.value) && !(bar.value >= 0 && bar.value < Infinity)) {
      throw new Error(
        `popnei_web defect: the bar ${JSON.stringify(bar.name)} has the value ${String(bar.value)}, neither NaN nor finite and 0 or above.`,
      );
    }
  }
}

/** The class of a bar of `group`: its colour, and an outline for a light
    colour, below 3:1 on the light background. */
function barClass(group: number): string {
  const outlined = isOutlined(group) ? " chart-bars-outlined" : "";
  return `chart-bars-bar ${groupColourClass(group)}${outlined}`;
}

/** The top of the axis of the values: the largest value made round, or
    1 when no value is above 0. */
function valuesTop(data: BarsData): number {
  let largest = 0;
  for (const bar of data.bars) {
    if (bar.value > largest) largest = bar.value;
  }
  if (largest === 0) return 1;
  const [, top] = scaleLinear().domain([0, largest]).nice().domain();
  return top ?? largest;
}

/** The position of the row of `name`, a defect for a name not drawn. */
function rowOf(start: number | undefined, name: string): number {
  if (start === undefined) {
    throw new Error(
      `popnei_web defect: the bar plot has no row of the name ${JSON.stringify(name)}.`,
    );
  }
  return start;
}

function drawBars(frame: Frame, data: BarsData): void {
  const x = scaleLinear()
    .domain([0, valuesTop(data)])
    .range([0, frame.innerWidth]);
  const y = scaleBand()
    .domain(data.bars.map((bar) => bar.name))
    .range([0, frame.innerHeight])
    .paddingInner(PADDING_INNER)
    .paddingOuter(PADDING_OUTER);

  frame.marks
    .selectAll<SVGRectElement, Bar>("rect")
    .data(
      data.bars.filter((bar) => !Number.isNaN(bar.value)),
      (bar) => bar.name,
    )
    .join("rect")
    .attr("class", (bar) => barClass(bar.group))
    .attr("x", 0)
    .attr("y", (bar) => rowOf(y(bar.name), bar.name))
    .attr("width", (bar) => x(bar.value))
    .attr("height", y.bandwidth());

  frame.annotations
    .selectAll<SVGTextElement, Bar>("text.chart-bars-none")
    .data(
      data.bars.filter((bar) => Number.isNaN(bar.value)),
      (bar) => bar.name,
    )
    .join("text")
    .attr("class", "chart-bars-none")
    .attr("x", NONE_FROM_AXIS)
    .attr("y", (bar) => rowOf(y(bar.name), bar.name) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .text(data.noValue);

  const room = nameRoom(
    frame.margin.left + frame.innerWidth + frame.margin.right,
  );
  frame.axes(x, y, { nameFormat: (name) => cutName(name, room) });
}

/** The definition of the bar plot, which the base of the 2D plots draws. */
const barsDefinition: Plot2dDefinition<BarsData> = {
  kind: "bars",
  check: checkBars,
  margin: barsMargin,
  draw: drawBars,
};

/**
 * Draws the bar plot of `data` in `element`, whose size the screen's CSS
 * gives, `barsHeight` high, and returns its handle. It takes no events
 * and no pointer.
 *
 * Throws an `Error`, a defect of the caller, here and in `update`, for
 * more than MAX_BARS bars, for two bars of one name, for a group that is
 * not a whole number from 0, and for a value below 0 or infinite.
 */
export const createBars: Chart<BarsData> = (element, data) =>
  createPlot2d(element, data, barsDefinition);
