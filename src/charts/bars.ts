/**
 * The bar plot of named values (docs/specs/charts/bars.md): one bar
 * across per name, in the order given, the first at the top, from 0 to
 * its value, in the colour of its group; the names down the left side,
 * each with the mark of its group, and the axis of the values along the
 * bottom. A name with no value has the words the data give in its row,
 * and no bar. The Populations tab of
 * popgen2.html draws one per column of the table of the diversity; the
 * plot knows nothing of populations. It is drawn on the base of the 2D
 * plots, plot2d.ts, and takes no pointer.
 */

import { scaleBand, scaleLinear } from "d3-scale";
import { MAX_BARS } from "./limits.ts";
import {
  groupColourClass,
  groupMark,
  isOutlined,
  symbolPath,
} from "./marks.ts";
import type { ExportSize } from "./export.ts";
import { createPlot2d } from "./plot2d.ts";
import type { Frame, Margin, Plot2dDefinition, PlotText } from "./plot2d.ts";
import { cutText, textWidth } from "./textWidth.ts";
import type { Chart } from "./types.ts";

/** What a bar plot draws. Every text is the screen's. */
export interface BarsData extends PlotText {
  /** The bars, the first at the top; at most MAX_BARS. Two may have one
      name: each has its own row, by its place. */
  readonly bars: readonly Bar[];
  /** The words in the row of a bar with no value: "no value". */
  readonly noValue: string;
}

/** One named value. */
export interface Bar {
  /** The name written beside the bar, as text. */
  readonly name: string;
  /** Its group for the colour and the mark, a whole number from 0, as
      the scatter's. */
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
/** Between the frame and the mark of a name. */
const MARK_GAP = 4;
/** The width given the mark of a name, a symbol of SYMBOL_AREA, 64
    square pixels, whose widest, the cross and the star, are about 12. */
const MARK_WIDTH = 12;
/** Between the mark of a name and the end of the name. */
const MARK_TO_NAME = 4;
/** Between a name and the frame: the mark and the room around it. */
const NAME_PADDING = MARK_GAP + MARK_WIDTH + MARK_TO_NAME;
/** The x of the centre of a mark, left of the frame. */
const MARK_X = -(MARK_GAP + MARK_WIDTH / 2);
/** Between the left edge of the SVG and the start of the longest name. */
const NAME_EDGE = 4;
/**
 * The width counted for a character of a name, at 12 pixels, where
 * nothing measures text (textWidth.ts): 9, as the heatmap counts its
 * names, which at 7.2 cut a name in capitals.
 */
const NAME_CHARACTER_WIDTH = 9;
/** The size of the text of a name, as charts.css writes the axes. */
const NAME_FONT_SIZE = 12;
/** The most characters a name keeps. */
const NAME_MOST = 20;
/** The fewest characters a name keeps, however narrow the element. */
const NAME_LEAST = 4;
/** The share of the width of the element the names may take. */
const NAME_SHARE = 0.4;
/** The second line of a label of the axis broken in two, which
    barsHeight leaves room for, as the base adds it to the bottom margin. */
const SECOND_LABEL_LINE = 16;
/** From the axis of the names to the words of a bar with no value. */
const NONE_FROM_AXIS = 4;

/**
 * The height in CSS pixels of an element that holds `numBars` rows: 8
 * above the frame, 28 a row, 44 below it and 16 more for a label of the
 * axis on two lines, so that its rows keep their 28 pixels then; 152 for
 * 3 names. The screen gives its element this height.
 */
export function barsHeight(numBars: number): number {
  return TOP + ROW * numBars + BOTTOM + SECOND_LABEL_LINE;
}

/** The pixels a name may take in an element `width` pixels wide: 40%
    of it, less the 24 pixels around the names and their marks. */
function nameRoom(width: number): number {
  return NAME_SHARE * width - NAME_EDGE - NAME_PADDING;
}

/** `name` cut to `room` pixels: whole when it has at most 20
    characters and fits, measured; otherwise as many of its first and
    last characters as fit about an ellipsis, from 3 and the ellipsis. */
function cutName(name: string, room: number): string {
  return cutText(name, room, {
    fontSize: NAME_FONT_SIZE,
    perCharacter: NAME_CHARACTER_WIDTH,
    most: NAME_MOST,
    least: NAME_LEAST,
  });
}

/**
 * The name each row writes in an element `width` pixels wide, in the
 * order of the bars: its name cut to its room; and when two or more rows
 * would write the same, each of them its name cut to the room its
 * number leaves and the number of its row, from 1, in brackets,
 * "Landr…A_1 (3)", the row of the table it draws.
 */
function rowNames(data: BarsData, width: number): readonly string[] {
  const room = nameRoom(width);
  const cut = data.bars.map((bar) => cutName(bar.name, room));
  const counts = new Map<string, number>();
  for (const name of cut) counts.set(name, (counts.get(name) ?? 0) + 1);
  return data.bars.map((bar, place) => {
    const name = cut[place] ?? bar.name;
    if ((counts.get(name) ?? 0) < 2) return name;
    const number = ` (${String(place + 1)})`;
    const numberWidth = textWidth(number, NAME_FONT_SIZE, NAME_CHARACTER_WIDTH);
    return `${cutName(bar.name, room - numberWidth)}${number}`;
  });
}

/** The margins for `data` in an element of `size`: at the left, the
    longest name as written, measured, 4 pixels before it and 20 after
    it, for its mark. */
function barsMargin(data: BarsData, size: ExportSize): Margin {
  let longest = 0;
  for (const name of rowNames(data, size.width)) {
    longest = Math.max(
      longest,
      textWidth(name, NAME_FONT_SIZE, NAME_CHARACTER_WIDTH),
    );
  }
  return {
    top: TOP,
    right: RIGHT,
    bottom: BOTTOM,
    left: NAME_EDGE + Math.ceil(longest) + NAME_PADDING,
  };
}

/**
 * Throws an `Error`, a defect of the caller, for data the bar plot cannot
 * draw by its contract: more than MAX_BARS bars, a group that is not a
 * whole number from 0, and a value below 0 or infinite.
 */
function checkBars(data: BarsData): void {
  if (data.bars.length > MAX_BARS) {
    throw new Error(
      `popnei_web defect: a bar plot was given ${String(data.bars.length)} bars, more than the ${String(MAX_BARS)} it draws.`,
    );
  }
  for (const bar of data.bars) {
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

/** A bar and its row: its place in the data, as the key of the band
    scale and of the join, so that two bars of one name are two rows. */
interface RowBar {
  readonly row: string;
  readonly bar: Bar;
}

/** The position of the row `row`, a defect for a row not drawn. */
function rowOf(start: number | undefined, row: string): number {
  if (start === undefined) {
    throw new Error(`popnei_web defect: the bar plot has no row ${row}.`);
  }
  return start;
}

function drawBars(frame: Frame, data: BarsData): void {
  const rows: readonly RowBar[] = data.bars.map((bar, place) => ({
    row: String(place),
    bar,
  }));
  const x = scaleLinear()
    .domain([0, valuesTop(data)])
    .range([0, frame.innerWidth]);
  const y = scaleBand()
    .domain(rows.map(({ row }) => row))
    .range([0, frame.innerHeight])
    .paddingInner(PADDING_INNER)
    .paddingOuter(PADDING_OUTER);

  frame.marks
    .selectAll<SVGRectElement, RowBar>("rect")
    .data(
      rows.filter(({ bar }) => !Number.isNaN(bar.value)),
      ({ row }) => row,
    )
    .join("rect")
    .attr("class", ({ bar }) => barClass(bar.group))
    .attr("x", 0)
    .attr("y", ({ row }) => rowOf(y(row), row))
    .attr("width", ({ bar }) => x(bar.value))
    .attr("height", y.bandwidth());

  frame.annotations
    .selectAll<SVGTextElement, RowBar>("text.chart-bars-none")
    .data(
      rows.filter(({ bar }) => Number.isNaN(bar.value)),
      ({ row }) => row,
    )
    .join("text")
    .attr("class", "chart-bars-none")
    .attr("x", NONE_FROM_AXIS)
    .attr("y", ({ row }) => rowOf(y(row), row) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .text(data.noValue);

  const names = rowNames(
    data,
    frame.margin.left + frame.innerWidth + frame.margin.right,
  );
  const nameOf = new Map(rows.map(({ row }, place) => [row, names[place]]));
  // The mark of each name, as the line plot draws its series: the
  // symbol of its group in its colour, between the name and the frame.
  frame.annotations
    .selectAll<SVGPathElement, RowBar>("path.chart-bars-mark")
    .data(rows, ({ row }) => row)
    .join("path")
    .attr(
      "class",
      ({ bar }) =>
        `chart-points chart-bars-mark ${groupColourClass(bar.group)}`,
    )
    .attr("d", ({ bar }) => symbolPath(bar.group))
    .attr(
      "transform",
      ({ row }) =>
        `translate(${String(MARK_X)},${String(rowOf(y(row), row) + y.bandwidth() / 2)})`,
    );

  frame.axes(x, y, {
    nameFormat: (row) => {
      const name = nameOf.get(row);
      if (name === undefined) {
        throw new Error(`popnei_web defect: the bar plot has no row ${row}.`);
      }
      return name;
    },
    namePadding: NAME_PADDING,
  });
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
 * more than MAX_BARS bars, for a group that is not a whole number from 0,
 * and for a value below 0 or infinite.
 */
export const createBars: Chart<BarsData> = (element, data) =>
  createPlot2d(element, data, barsDefinition);
