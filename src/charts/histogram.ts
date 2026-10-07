/**
 * The histogram of a statistic whose bins are already counted, with a
 * threshold marked and the bins it keeps, splits and removes
 * (docs/specs/charts/histogram.md): the threshold of a filter on
 * popgen.html, with its legend, and on popgen2.html a threshold that is
 * only shown, with none. It is drawn on the base of the 2D
 * plots, plot2d.ts, and counts nothing: the bins are popnei's, or those
 * core makes for the statistics of each individual.
 */

import { scaleLinear } from "d3-scale";
import type { ScaleLinear } from "d3-scale";
import { select } from "d3-selection";
import { MAX_HISTOGRAM_BINS } from "./limits.ts";
import { createPlot2d } from "./plot2d.ts";
import type { Frame, Margin, Plot2dDefinition, PlotText } from "./plot2d.ts";
import type { Chart } from "./types.ts";

/**
 * What a histogram draws. Every text is the screen's, with the texts of
 * PlotText: xLabel "Major allele frequency", yLabel "Variants". A value
 * with no number, NaN, is in no bin, and the screen says how many there
 * are.
 */
export interface HistogramData extends PlotText {
  /** The edges of the bins, one more than the bins, finite and increasing. */
  readonly edges: Readonly<Float64Array>;
  /**
   * The count of each bin, from the left: whole numbers, with vertical
   * ticks at whole numbers only; or shares that are not whole, the folded
   * spectrum of a population, finite and not negative, with the ticks the
   * scale gives.
   */
  readonly counts: Uint32Array | Float64Array;
  /** The threshold marked on the plot, of a filter beside it on
      popgen.html or shown only on popgen2.html; null for none. */
  readonly threshold: HistogramThreshold | null;
  /**
   * The top of the vertical axis before it is made round, at least the
   * largest count, so that the histograms of several populations share one
   * scale; the largest count when absent.
   */
  readonly yMax?: number;
  /**
   * Ticks at whole numbers on the horizontal axis, the copies of the rarer
   * allele under bars centred on them from edges at the halves.
   */
  readonly xWholeNumbers?: boolean;
}

/**
 * A threshold that keeps what is at most `value`, with the legend of a
 * filter, or with none for a threshold the screen says in words beside
 * the plot, as popgen2.html does with the thresholds of its histograms,
 * which are no filters.
 */
export interface HistogramThreshold {
  /** The number of the threshold, as the project holds it for a filter
      or as the screen holds it; finite. */
  readonly value: number;
  /** The three rows of the legend at the top right, or null for none. */
  readonly legend: ThresholdLegend | null;
  /**
   * Whether the values on the line itself may be kept or removed, as the
   * screen's counts say when the bins cannot tell (popgen2.html, whose
   * bins hold their left edge): the bar that starts at the line, the
   * part right of it of the bin it splits, or the bin from the double
   * just above it, is then hatched rather than drawn as removed. False
   * when absent.
   */
  readonly undecided?: boolean;
}

/**
 * The legend of a threshold: "Maximum 0.95", "Kept by this filter",
 * "Removed by this filter".
 */
export interface ThresholdLegend {
  /** The first row of the legend, beside the dashed line: "Maximum 0.95". */
  readonly label: string;
  /** The second row, beside a filled square: "Kept by this filter". */
  readonly keptLabel: string;
  /** The third row, beside an outlined square: "Removed by this filter". */
  readonly removedLabel: string;
}

/**
 * Where the frame of a histogram was drawn in its element, in CSS
 * pixels from the top left of the element: what a screen lays over the
 * plot to be aligned with its horizontal axis, the line the user drags
 * on popgen2.html.
 */
export interface HistogramFrame {
  /** From the left of the element to the left of the frame. */
  readonly left: number;
  /** From the top of the element to the top of the frame. */
  readonly top: number;
  /** The width of the frame. */
  readonly width: number;
  /** The height of the frame. */
  readonly height: number;
}

/** What a histogram tells the screen. */
export interface HistogramEvents {
  /**
   * The frame was drawn at another place or size than at the draw
   * before, the first draw among them.
   */
  onFrame?(frame: HistogramFrame): void;
}

/**
 * What the threshold does to a bin: it keeps every value of it, may keep
 * some and remove others, or removes every one.
 */
export type BinState = "kept" | "partlyKept" | "removed";

/** One bin, as the table beside the plot shows it. */
export interface HistogramRow {
  /** The lower edge, as given, included in the bin. */
  readonly from: number;
  /** The upper edge, as given. */
  readonly to: number;
  /** Whether the bin holds its upper edge: true for the last bin alone. */
  readonly toIncluded: boolean;
  /** How many values the bin holds, or its share for a spectrum. */
  readonly count: number;
  /** What the threshold does to the bin; null when there is no threshold. */
  readonly state: BinState | null;
}

/** The top margin without a legend, in CSS pixels. */
const TOP_WITHOUT_LEGEND = 12;
/** The top margin with a legend, which holds its three rows. */
const TOP_WITH_LEGEND = 56;
const RIGHT_MARGIN = 16;
const BOTTOM_MARGIN = 44;
/**
 * The left margin while the numbers of the vertical axis have at most
 * four characters, "0.06" or "240".
 */
const LEFT_MARGIN = 60;
/**
 * The left of the left margin, which the label of the vertical axis
 * takes: its text of 13 pixels, written 16 pixels from the left, and a
 * gap before the numbers of the ticks.
 */
const Y_LABEL_BAND = 22;
/**
 * From the end of a number of the vertical axis to the frame: the tick
 * of 6 pixels and the gap of 3 of d3-axis.
 */
const Y_TICK_OFFSET = 9;
/**
 * The width counted for a character of a number of an axis, of 12
 * pixels, since nothing in a plot measures text; the heatmap counts its
 * names the same way.
 */
const CHARACTER_WIDTH = 7.2;
/**
 * The most ticks the vertical axis is counted with for its margin, those
 * of a frame 640 pixels high. The margin does not know the height, and
 * more ticks give the shares more decimals, never fewer.
 */
const MOST_Y_TICKS = 16;

const WHOLE_NUMBER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

/** From the top of the SVG to the middle of the first row of the legend. */
const LEGEND_FIRST_ROW = 12;
/** From the middle of one row of the legend to the middle of the next. */
const LEGEND_ROW = 16;
/** The width of the mark of a row, left of the right edge of the frame. */
const LEGEND_MARK = 16;
/** The side of the square of a row. */
const LEGEND_SQUARE = 10;
/** Between the end of the text of a row and its mark. */
const LEGEND_GAP = 6;

/**
 * The smallest double above `value`, which is finite. An edge that popnei
 * gives as 0.9500000000000001 is nextUp(0.95), and no value lies between
 * the two.
 */
function nextUp(value: number): number {
  if (value === 0) return Number.MIN_VALUE;
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  const bits = view.getBigUint64(0);
  // The bits of a double, read as an integer, grow with its magnitude.
  view.setBigUint64(0, value > 0 ? bits + 1n : bits - 1n);
  return view.getFloat64(0);
}

/**
 * Throws an `Error`, a defect of the caller, for data the histogram
 * cannot draw by its contract: no bin, edges that are not one more than
 * the counts, an edge not finite or not above the one before, a count
 * not finite or negative, a threshold that is not finite, a yMax not
 * finite or below the largest count, or more than MAX_HISTOGRAM_BINS bins.
 */
function checkHistogram(data: HistogramData): void {
  const numBins = data.counts.length;
  if (numBins === 0) {
    throw new Error("popnei_web defect: a histogram was given no bin.");
  }
  if (numBins > MAX_HISTOGRAM_BINS) {
    throw new Error(
      `popnei_web defect: a histogram was given ${String(numBins)} bins, more than the ${String(MAX_HISTOGRAM_BINS)} it draws.`,
    );
  }
  if (data.edges.length !== numBins + 1) {
    throw new Error(
      `popnei_web defect: a histogram of ${String(numBins)} bins was given ${String(data.edges.length)} edges, not ${String(numBins + 1)}.`,
    );
  }
  let before = Number.NEGATIVE_INFINITY;
  for (const [index, edge] of data.edges.entries()) {
    if (!Number.isFinite(edge)) {
      throw new Error(
        `popnei_web defect: the edge ${String(index)} of a histogram is ${String(edge)}, not a finite number.`,
      );
    }
    if (edge <= before) {
      throw new Error(
        `popnei_web defect: the edge ${String(index)} of a histogram, ${String(edge)}, is not above the one before, ${String(before)}.`,
      );
    }
    before = edge;
  }
  let largest = 0;
  for (const [index, count] of data.counts.entries()) {
    if (!Number.isFinite(count) || count < 0) {
      throw new Error(
        `popnei_web defect: the count ${String(index)} of a histogram is ${String(count)}, not a finite number at least 0.`,
      );
    }
    largest = Math.max(largest, count);
  }
  if (data.yMax !== undefined) {
    if (!Number.isFinite(data.yMax)) {
      throw new Error(
        `popnei_web defect: the yMax of a histogram is ${String(data.yMax)}, not a finite number.`,
      );
    }
    if (data.yMax < largest) {
      throw new Error(
        `popnei_web defect: the yMax of a histogram, ${String(data.yMax)}, is below the largest count, ${String(largest)}.`,
      );
    }
  }
  if (data.threshold !== null && !Number.isFinite(data.threshold.value)) {
    throw new Error(
      `popnei_web defect: the threshold of a histogram is ${String(data.threshold.value)}, not a finite number.`,
    );
  }
}

/** The edge at `index`, which the check of the data makes exist. */
function edgeAt(edges: Readonly<Float64Array>, index: number): number {
  const edge = edges[index];
  if (edge === undefined) {
    throw new Error(
      `popnei_web defect: a histogram has no edge ${String(index)}.`,
    );
  }
  return edge;
}

/**
 * What a threshold that keeps what is at most `threshold` does to the bin
 * from `from` to `to`, which holds `to` only when `toIncluded`.
 */
function binState(
  from: number,
  to: number,
  toIncluded: boolean,
  threshold: number,
): BinState {
  if (from > threshold) return "removed";
  // A bin that is not the last holds values below `to` only, so it is
  // kept when no double lies above the threshold and below `to`.
  const kept = toIncluded ? to <= threshold : to <= nextUp(threshold);
  return kept ? "kept" : "partlyKept";
}

/**
 * One row per bin, from the left: its edges as given, whether it holds
 * its upper edge, its count, and what the threshold does to it. The
 * screen draws the table beside the plot and writes its description from
 * these rows, so that the table and the plot never disagree.
 *
 * Throws an `Error`, a defect of the caller, for the data the check of
 * the histogram refuses, as `createHistogram` does.
 */
export function histogramRows(data: HistogramData): HistogramRow[] {
  checkHistogram(data);
  const lastBin = data.counts.length - 1;
  return Array.from(data.counts, (count, index) => {
    const from = edgeAt(data.edges, index);
    const to = edgeAt(data.edges, index + 1);
    const toIncluded = index === lastBin;
    return {
      from,
      to,
      toIncluded,
      count,
      state:
        data.threshold === null
          ? null
          : binState(from, to, toIncluded, data.threshold.value),
    };
  });
}

/** The two scales of a histogram, for a frame of a size. */
export interface HistogramScales {
  /** The statistic, from the first edge to the last, widened to take the threshold. */
  readonly x: ScaleLinear<number, number>;
  /** The count, from 0 to yMax or the largest count made round, or to 1 when that is 0. */
  readonly y: ScaleLinear<number, number>;
}

/**
 * The scales of a histogram drawn over `innerWidth` by `innerHeight`,
 * whose data the check has accepted. The horizontal one runs from the
 * first edge to the last, and further to take a threshold outside them,
 * so that its line is always drawn; the vertical one from 0 to yMax, or
 * to the largest count when there is none, made round by `nice`, and
 * from 0 to 1 when that top is 0.
 */
export function histogramScales(
  data: HistogramData,
  innerWidth: number,
  innerHeight: number,
): HistogramScales {
  let low = edgeAt(data.edges, 0);
  let high = edgeAt(data.edges, data.edges.length - 1);
  if (data.threshold !== null) {
    low = Math.min(low, data.threshold.value);
    high = Math.max(high, data.threshold.value);
  }
  const x = scaleLinear().domain([low, high]).range([0, innerWidth]);
  const top = data.yMax ?? Math.max(...data.counts);
  const y = scaleLinear()
    .domain([0, top > 0 ? top : 1])
    .range([innerHeight, 0])
    .nice();
  return { x, y };
}

/** A rect of the marks: a bin, or the kept or removed part of a split one. */
interface Bar {
  /** The index of the bin, with a suffix for a part of a split bin. */
  readonly key: string;
  readonly from: number;
  readonly to: number;
  readonly count: number;
  /** Removed, or undecided when the threshold says its values on the line
      may be kept: the bar that starts at the line. */
  readonly state: "kept" | "removed" | "undecided" | null;
}

/**
 * The rects of the bins with a count above 0, a partly kept bin as two,
 * split at the threshold, the left one left out when its width is 0. With
 * a threshold `undecided`, the bar that starts at the line, or at the
 * double just above it, is undecided rather than removed.
 */
function barsOf(
  rows: readonly HistogramRow[],
  threshold: HistogramThreshold | null,
): Bar[] {
  const bars: Bar[] = [];
  const undecided = threshold?.undecided === true;
  for (const [index, row] of rows.entries()) {
    if (row.count === 0) continue;
    const { from, to, count, state } = row;
    const key = String(index);
    if (state !== "partlyKept") {
      const startsAtLine =
        undecided && state === "removed" && from <= nextUp(threshold.value);
      bars.push({
        key,
        from,
        to,
        count,
        state: startsAtLine ? "undecided" : state,
      });
      continue;
    }
    if (threshold === null) {
      throw new Error(
        "popnei_web defect: a bin of a histogram with no threshold is partly kept.",
      );
    }
    if (threshold.value > from) {
      bars.push({
        key: `${key}-kept`,
        from,
        to: threshold.value,
        count,
        state: "kept",
      });
    }
    bars.push({
      key: `${key}-removed`,
      from: threshold.value,
      to,
      count,
      state: undecided ? "undecided" : "removed",
    });
  }
  return bars;
}

function barClass(bar: Bar): string {
  switch (bar.state) {
    case "kept":
      return "chart-bar chart-bar-kept";
    case "removed":
      return "chart-bar chart-bar-removed";
    case "undecided":
      return "chart-bar chart-bar-undecided";
    case null:
      return "chart-bar";
  }
}

/** The side of the tile of the hatch of an undecided bar, in CSS pixels:
    a stripe every 6 pixels, at 45 degrees, drawn down the middle of the
    tile, so that its stroke of 2 pixels shows whole; at its edge the
    tile cut half of it away. */
const HATCH_TILE = 6;

/** The number of the next hatch made, which gives each plot an id of its
    own for the pattern, unique on the page. */
let hatchCount = 0;

/** The id of a new pattern of the hatch. */
function nextHatchId(): string {
  hatchCount += 1;
  return `chart-hatch-${String(hatchCount)}`;
}

/** A row of the legend: what its mark shows, and its text. */
interface LegendRow {
  readonly key: "threshold" | "kept" | "removed";
  readonly text: string;
}

function legendRowsOf(threshold: HistogramThreshold | null): LegendRow[] {
  const legend = threshold?.legend ?? null;
  if (legend === null) return [];
  return [
    { key: "threshold", text: legend.label },
    { key: "kept", text: legend.keptLabel },
    { key: "removed", text: legend.removedLabel },
  ];
}

/**
 * The longest number the vertical axis of `data` may write, the top of
 * the axis: a count with a comma between thousands, "12,000", or a share
 * with the decimals of the most ticks, "0.045".
 */
function longestYTick(data: HistogramData): string {
  const { y } = histogramScales(data, 1, 1);
  const top = y.domain()[1] ?? 1;
  return data.counts instanceof Uint32Array
    ? WHOLE_NUMBER.format(top)
    : y.tickFormat(MOST_Y_TICKS)(top);
}

/**
 * The margins of the histogram of `data`: the top larger with the legend
 * of a threshold, and the left 60 pixels, or more when the
 * numbers of the vertical axis are longer than four characters, so that
 * they do not reach the label of the axis. The numbers are counted at 7.2
 * pixels a character and not measured.
 */
function histogramMargin(data: HistogramData): Margin {
  const ticksWidth = longestYTick(data).length * CHARACTER_WIDTH;
  return {
    top:
      (data.threshold?.legend ?? null) === null
        ? TOP_WITHOUT_LEGEND
        : TOP_WITH_LEGEND,
    right: RIGHT_MARGIN,
    bottom: BOTTOM_MARGIN,
    left: Math.max(LEFT_MARGIN, Y_LABEL_BAND + ticksWidth + Y_TICK_OFFSET),
  };
}

function drawHistogram(
  frame: Frame,
  data: HistogramData,
  hatchId: string,
): void {
  const { x, y } = histogramScales(data, frame.innerWidth, frame.innerHeight);
  const threshold = data.threshold?.value ?? null;
  const bars = barsOf(histogramRows(data), data.threshold);

  // The hatch of an undecided bar: thin stripes of the colour of the bars
  // on the background, so that the dashed line keeps the background on
  // both sides where it crosses the bar (WCAG 1.4.11), as it does beside
  // an outlined bar. Made once, before the bars.
  if (frame.marks.select("defs.chart-hatch").empty()) {
    const pattern = frame.marks
      .insert("defs", ":first-child")
      .attr("class", "chart-hatch")
      .append("pattern")
      .attr("id", hatchId)
      .attr("patternUnits", "userSpaceOnUse")
      .attr("width", HATCH_TILE)
      .attr("height", HATCH_TILE)
      .attr("patternTransform", "rotate(45)");
    pattern
      .append("line")
      .attr("class", "chart-hatch-stripe")
      .attr("x1", HATCH_TILE / 2)
      .attr("x2", HATCH_TILE / 2)
      .attr("y1", 0)
      .attr("y2", HATCH_TILE);
  }

  frame.marks
    .selectAll<SVGRectElement, Bar>("rect.chart-bar")
    .data(bars, (bar) => bar.key)
    .join("rect")
    .attr("class", barClass)
    // The fill of a pattern by its id, which the CSS of a class cannot
    // name; the style attribute wins over the fill of the class.
    .attr("style", (bar) =>
      bar.state === "undecided" ? `fill: url(#${hatchId});` : null,
    )
    .attr("x", (bar) => x(bar.from))
    .attr("width", (bar) => x(bar.to) - x(bar.from))
    .attr("y", (bar) => y(bar.count))
    .attr("height", (bar) => frame.innerHeight - y(bar.count));

  frame.annotations
    .selectAll<SVGLineElement, number>("line.chart-threshold")
    .data(threshold === null ? [] : [threshold])
    .join("line")
    .attr("class", "chart-threshold")
    .attr("x1", (value) => x(value))
    .attr("x2", (value) => x(value))
    .attr("y1", frame.innerHeight)
    .attr("y2", 0);

  // The legend is placed from the top left of the SVG, each row with its
  // mark at the right edge of the frame and its text ending before it,
  // so that it needs no measure of the text.
  const right = frame.margin.left + frame.innerWidth;
  frame.legend
    .selectAll<SVGGElement, LegendRow>("g.chart-legend-row")
    .data(legendRowsOf(data.threshold), (row) => row.key)
    .join((enter) => {
      const row = enter.append("g").attr("class", "chart-legend-row");
      row.each(function appendMark(legendRow) {
        const group = select(this);
        if (legendRow.key === "threshold") {
          group
            .append("line")
            .attr("class", "chart-legend-threshold")
            .attr("x1", -LEGEND_MARK)
            .attr("x2", 0)
            .attr("y1", 0)
            .attr("y2", 0);
        } else {
          group
            .append("rect")
            .attr("class", `chart-legend-${legendRow.key}`)
            .attr("x", -(LEGEND_MARK + LEGEND_SQUARE) / 2)
            .attr("y", -LEGEND_SQUARE / 2)
            .attr("width", LEGEND_SQUARE)
            .attr("height", LEGEND_SQUARE);
        }
      });
      row
        .append("text")
        .attr("class", "chart-legend-text")
        .attr("x", -(LEGEND_MARK + LEGEND_GAP))
        .attr("dy", "0.35em");
      return row;
    })
    .attr(
      "transform",
      (_row, index) =>
        `translate(${String(right)},${String(LEGEND_FIRST_ROW + index * LEGEND_ROW)})`,
    )
    .select("text")
    .text((row) => row.text);

  frame.axes(x, y, {
    yWholeNumbers: data.counts instanceof Uint32Array,
    xWholeNumbers: data.xWholeNumbers === true,
  });
}

/** Whether the frame `before`, null before the first draw, is `after`. */
function sameFrame(
  before: HistogramFrame | null,
  after: HistogramFrame,
): boolean {
  return (
    before !== null &&
    before.left === after.left &&
    before.top === after.top &&
    before.width === after.width &&
    before.height === after.height
  );
}

/**
 * Draws the histogram of `data` in `element`, whose size the screen's CSS
 * gives, and returns its handle. It tells `events.onFrame` where its
 * frame is after each draw that moved it.
 *
 * Throws an `Error`, a defect of the caller, here and in `update`, for no
 * bin, edges that are not one more than the counts, an edge not finite or
 * not above the one before, a count not finite or negative, a threshold
 * that is not finite, a yMax not finite or below the largest count, and
 * more than MAX_HISTOGRAM_BINS bins.
 */
export const createHistogram: Chart<HistogramData, HistogramEvents> = (
  element,
  data,
  events = {},
) => {
  let told: HistogramFrame | null = null;
  const hatchId = nextHatchId();
  const definition: Plot2dDefinition<HistogramData> = {
    kind: "histogram",
    check: checkHistogram,
    margin: histogramMargin,
    draw(frame, drawn) {
      drawHistogram(frame, drawn, hatchId);
      const placed: HistogramFrame = {
        left: frame.margin.left,
        top: frame.margin.top,
        width: frame.innerWidth,
        height: frame.innerHeight,
      };
      if (!sameFrame(told, placed)) {
        told = placed;
        events.onFrame?.(placed);
      }
    },
  };
  return createPlot2d(element, data, definition);
};
