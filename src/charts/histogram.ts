/**
 * The histogram of a statistic whose bins are already counted, with the
 * threshold of a filter marked and the bins it keeps, splits and removes
 * (docs/specs/charts/histogram.md). It is drawn on the base of the 2D
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
  /** The threshold of the filter beside the plot, or null for none. */
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
 * A threshold that keeps what is at most `value`. The three labels are
 * the rows of the legend: "Maximum 0.95", "Kept by this filter",
 * "Removed by this filter".
 */
export interface HistogramThreshold {
  /** The number the user typed, as the project holds it; finite. */
  readonly value: number;
  /** The first row of the legend, beside the dashed line: "Maximum 0.95". */
  readonly label: string;
  /** The second row, beside a filled square: "Kept by this filter". */
  readonly keptLabel: string;
  /** The third row, beside an outlined square: "Removed by this filter". */
  readonly removedLabel: string;
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

/** The margins without a threshold, in CSS pixels. */
const MARGIN_WITHOUT_THRESHOLD: Margin = {
  top: 12,
  right: 16,
  bottom: 44,
  left: 60,
};
/** The margins with a threshold, whose top holds the three rows of the legend. */
const MARGIN_WITH_THRESHOLD: Margin = {
  top: 56,
  right: 16,
  bottom: 44,
  left: 60,
};

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
  readonly state: "kept" | "removed" | null;
}

/**
 * The rects of the bins with a count above 0, a partly kept bin as two,
 * split at the threshold, the left one left out when its width is 0.
 */
function barsOf(
  rows: readonly HistogramRow[],
  threshold: number | null,
): Bar[] {
  const bars: Bar[] = [];
  for (const [index, row] of rows.entries()) {
    if (row.count === 0) continue;
    const { from, to, count, state } = row;
    const key = String(index);
    if (state !== "partlyKept") {
      bars.push({ key, from, to, count, state });
      continue;
    }
    if (threshold === null) {
      throw new Error(
        "popnei_web defect: a bin of a histogram with no threshold is partly kept.",
      );
    }
    if (threshold > from) {
      bars.push({
        key: `${key}-kept`,
        from,
        to: threshold,
        count,
        state: "kept",
      });
    }
    bars.push({
      key: `${key}-removed`,
      from: threshold,
      to,
      count,
      state: "removed",
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
    case null:
      return "chart-bar";
  }
}

/** A row of the legend: what its mark shows, and its text. */
interface LegendRow {
  readonly key: "threshold" | "kept" | "removed";
  readonly text: string;
}

function legendRowsOf(threshold: HistogramThreshold | null): LegendRow[] {
  if (threshold === null) return [];
  return [
    { key: "threshold", text: threshold.label },
    { key: "kept", text: threshold.keptLabel },
    { key: "removed", text: threshold.removedLabel },
  ];
}

function histogramMargin(data: HistogramData): Margin {
  return data.threshold === null
    ? MARGIN_WITHOUT_THRESHOLD
    : MARGIN_WITH_THRESHOLD;
}

function drawHistogram(frame: Frame, data: HistogramData): void {
  const { x, y } = histogramScales(data, frame.innerWidth, frame.innerHeight);
  const threshold = data.threshold?.value ?? null;
  const bars = barsOf(histogramRows(data), threshold);

  frame.marks
    .selectAll<SVGRectElement, Bar>("rect.chart-bar")
    .data(bars, (bar) => bar.key)
    .join("rect")
    .attr("class", barClass)
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

/** The definition of the histogram, which the base of the 2D plots draws. */
const histogramDefinition: Plot2dDefinition<HistogramData> = {
  kind: "histogram",
  check: checkHistogram,
  margin: histogramMargin,
  draw: drawHistogram,
};

/**
 * Draws the histogram of `data` in `element`, whose size the screen's CSS
 * gives, and returns its handle. It takes no events.
 *
 * Throws an `Error`, a defect of the caller, here and in `update`, for no
 * bin, edges that are not one more than the counts, an edge not finite or
 * not above the one before, a count not finite or negative, a threshold
 * that is not finite, a yMax not finite or below the largest count, and
 * more than MAX_HISTOGRAM_BINS bins.
 */
export const createHistogram: Chart<HistogramData> = (element, data) =>
  createPlot2d(element, data, histogramDefinition);
