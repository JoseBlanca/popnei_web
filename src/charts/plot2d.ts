/**
 * The base every plot drawn in two dimensions makes its handle with
 * (docs/specs/charts/plot2d.md). It makes the SVG and its frame, follows
 * the size of the element, draws the axes from the plot's scales, writes
 * the title and the description a screen reader reads, and gives the
 * handle with its `update`, its `destroy` and its export, made by
 * export.ts; a kind of plot gives it a definition and draws only its
 * marks, its annotations and its legend.
 */

import { axisBottom, axisLeft } from "d3-axis";
import type { ScaleContinuousNumeric } from "d3-scale";
import { select } from "d3-selection";
import type { Selection } from "d3-selection";
import "./charts.css";
import { exportPng, exportSvg } from "./export.ts";
import { nextChartIds } from "./ids.ts";
import type { ChartHandle } from "./types.ts";

/** The texts every 2D plot draws, which its data hold beside the numbers. */
export interface PlotText {
  /** The `<title>` of the SVG, which names the plot. */
  readonly title: string;
  /** The `<desc>`, which sums the plot up; the screen writes it. */
  readonly description: string;
  /** The label under the horizontal axis. */
  readonly xLabel: string;
  /** The label along the vertical axis. */
  readonly yLabel: string;
}

/** The margins of a plot, around its frame, in CSS pixels. */
export interface Margin {
  /** Above the frame, where a legend goes. */
  readonly top: number;
  /** Right of the frame. */
  readonly right: number;
  /** Below the frame, where the horizontal axis and its label go. */
  readonly bottom: number;
  /** Left of the frame, where the vertical axis and its label go. */
  readonly left: number;
}

/** How the axes are drawn, beyond what the scales give. */
export interface AxesOptions {
  /** The labels of the ticks; the scale's tickFormat when absent. */
  readonly xFormat?: (value: number) => string;
  /** The labels of the ticks; the scale's tickFormat when absent. */
  readonly yFormat?: (value: number) => string;
  /** Ticks at whole numbers only, with a comma between thousands. */
  readonly yWholeNumbers?: boolean;
}

/** A group of the SVG, where a plot draws. */
export type Group = Selection<SVGGElement, unknown, null, undefined>;

/** What the base gives the `draw` of a plot at each draw. */
export interface Frame {
  /** The width of the frame, the size less the margins; above 0. */
  readonly innerWidth: number;
  /** The height of the frame, the size less the margins; above 0. */
  readonly innerHeight: number;
  /** `chart-marks`, clipped to the frame. */
  readonly marks: Group;
  /** `chart-annotations`: thresholds and lines of reference. */
  readonly annotations: Group;
  /** `chart-legend`, outside the frame, placed from the top left of the SVG. */
  readonly legend: Group;
  /** Draws the two axes and their labels from the plot's scales. */
  axes(
    x: ScaleContinuousNumeric<number, number>,
    y: ScaleContinuousNumeric<number, number>,
    options?: AxesOptions,
  ): void;
}

/** What a kind of plot gives the base. */
export interface Plot2dDefinition<Data extends PlotText> {
  /** The name in the class of the SVG, chart-‹kind›: "histogram". */
  readonly kind: string;
  /** Throws an `Error` for data the plot cannot draw by its contract. */
  readonly check: (data: Data) => void;
  /** The margins, which can depend on the data, a legend or none. */
  readonly margin: (data: Data) => Margin;
  /** Draws the whole plot; called any number of times with the same arguments. */
  readonly draw: (frame: Frame, data: Data) => void;
}

/** About one tick of the horizontal axis for this many pixels of the frame. */
const X_TICK_SPACING = 80;
/** About one tick of the vertical axis for this many pixels of the frame. */
const Y_TICK_SPACING = 40;
/** From the bottom of the SVG to the baseline of the label of the x axis. */
const X_LABEL_FROM_BOTTOM = 8;
/** From the left of the SVG to the baseline of the label of the y axis. */
const Y_LABEL_FROM_LEFT = 16;

const WHOLE_NUMBER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

/** A whole number with a comma between thousands: 12000 is "12,000". */
function formatWholeNumber(value: number): string {
  return WHOLE_NUMBER.format(value);
}

/**
 * The ticks of an axis of counts: those of the scale for about `count`
 * ticks that are whole numbers, since a count of 0.5 means nothing. For
 * a domain of 0 to 3 they are 0, 1, 2 and 3.
 */
export function wholeNumberTicks(
  scale: ScaleContinuousNumeric<number, number>,
  count: number,
): number[] {
  return scale.ticks(count).filter((tick) => Number.isInteger(tick));
}

/**
 * A number of a table of a plot, to 12 significant digits, so that an
 * edge that popnei gives as 0.07500000000000001 reads 0.075. The rows and
 * the CSV keep every digit.
 */
export function tableNumber(value: number): number {
  return Number(value.toPrecision(12));
}

interface Size {
  readonly width: number;
  readonly height: number;
}

/**
 * What the SVG shows: nothing yet, since the element never had a size; the
 * plot drawn at a size; or, at a size not larger than the margins, an
 * empty frame.
 */
type Drawing =
  | { readonly kind: "none" }
  | { readonly kind: "drawn"; readonly size: Size }
  | { readonly kind: "noArea"; readonly size: Size };

/**
 * The size of the content box of `element`, inside its padding and its
 * border, the box whose size a ResizeObserver gives as `contentRect`:
 * `clientWidth` and `clientHeight`, which the browser rounds to whole
 * pixels, less the padding; 0 by 0 for an element that is not laid out,
 * in a tab that is hidden.
 */
function contentBoxOf(element: HTMLElement): Size {
  const style = getComputedStyle(element);
  const pixels = (value: string): number => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const width =
    element.clientWidth -
    pixels(style.paddingLeft) -
    pixels(style.paddingRight);
  const height =
    element.clientHeight -
    pixels(style.paddingTop) -
    pixels(style.paddingBottom);
  return { width: Math.max(0, width), height: Math.max(0, height) };
}

/**
 * Makes a 2D plot of `data` in `element` from the definition of its kind,
 * and returns its handle.
 *
 * The plot is drawn at once when the element has a size, and again at
 * most once per frame of the screen after each change of its size;
 * while the element has no size, nothing is drawn and the last drawing
 * stays. An element not larger than the margins gets an empty frame and
 * an SVG of 0 by 0, whose `toSVG` and `toPNG` throw. `definition.check`
 * throws for data the plot cannot draw, here before anything is added to
 * the element, and in `update` leaving the plot as it was. `update`,
 * `toSVG` and `toPNG` after `destroy`, and `toSVG` and `toPNG` of a plot
 * never drawn, throw an `Error`, a defect of the caller.
 */
export function createPlot2d<Data extends PlotText>(
  element: HTMLElement,
  data: Data,
  definition: Plot2dDefinition<Data>,
): ChartHandle<Data> {
  definition.check(data);

  const ids = nextChartIds();
  const svg = select(element)
    .append("svg")
    .attr("class", `chart chart-${definition.kind}`)
    .attr("role", "img")
    .attr("aria-labelledby", `${ids.title} ${ids.desc}`);
  const title = svg.append<SVGTitleElement>("title").attr("id", ids.title);
  const desc = svg.append("desc").attr("id", ids.desc);
  const clip = svg
    .append("defs")
    .append("clipPath")
    .attr("id", ids.clip)
    .append("rect");
  const frameGroup = svg.append("g").attr("class", "chart-frame");
  frameGroup.append("g").attr("class", "chart-grid");
  const xAxisGroup = frameGroup
    .append("g")
    .attr("class", "chart-axis chart-axis-x");
  const yAxisGroup = frameGroup
    .append("g")
    .attr("class", "chart-axis chart-axis-y");
  const marks = frameGroup
    .append("g")
    .attr("class", "chart-marks")
    .attr("clip-path", `url(#${ids.clip})`);
  const annotations = frameGroup.append("g").attr("class", "chart-annotations");
  const xLabel = frameGroup
    .append("text")
    .attr("class", "chart-axis-label chart-axis-label-x");
  const yLabel = frameGroup
    .append("text")
    .attr("class", "chart-axis-label chart-axis-label-y");
  const legend = svg.append("g").attr("class", "chart-legend");
  const svgElement = svg.node();
  if (svgElement === null) {
    throw new Error("popnei_web defect: the SVG of a plot was not made.");
  }

  let current = data;
  let drawing: Drawing = { kind: "none" };
  let pending: Size | null = null;
  let waitingFrame: number | null = null;
  let destroyed = false;

  function writeText(): void {
    title.text(current.title);
    desc.text(current.description);
  }

  /**
   * Empties the frame of an element of `size`, not larger than the
   * margins: nothing of an earlier draw stays, and the SVG is of 0 by 0.
   */
  function emptyAt(size: Size): void {
    drawing = { kind: "noArea", size };
    for (const group of [marks, annotations, legend, xAxisGroup, yAxisGroup]) {
      group.selectAll("*").remove();
    }
    svg.attr("width", 0).attr("height", 0).attr("viewBox", null);
  }

  /**
   * Draws the current data at `size`, which is above 0, or empties the
   * frame when the margins leave it no area.
   */
  function drawAt(size: Size): void {
    const margin = definition.margin(current);
    const innerWidth = size.width - margin.left - margin.right;
    const innerHeight = size.height - margin.top - margin.bottom;
    if (innerWidth <= 0 || innerHeight <= 0) {
      emptyAt(size);
      return;
    }
    drawing = { kind: "drawn", size };

    svg
      .attr("width", size.width)
      .attr("height", size.height)
      .attr("viewBox", `0 0 ${String(size.width)} ${String(size.height)}`);
    frameGroup.attr(
      "transform",
      `translate(${String(margin.left)},${String(margin.top)})`,
    );
    clip.attr("width", innerWidth).attr("height", innerHeight);
    xAxisGroup.attr("transform", `translate(0,${String(innerHeight)})`);
    xLabel
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + margin.bottom - X_LABEL_FROM_BOTTOM)
      .text(current.xLabel);
    yLabel
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + Y_LABEL_FROM_LEFT)
      .text(current.yLabel);

    const frame: Frame = {
      innerWidth,
      innerHeight,
      marks,
      annotations,
      legend,
      axes(x, y, options = {}) {
        const xCount = Math.max(1, Math.round(innerWidth / X_TICK_SPACING));
        const yCount = Math.max(1, Math.round(innerHeight / Y_TICK_SPACING));
        const xAxis = axisBottom<number>(x).ticks(xCount);
        if (options.xFormat !== undefined) xAxis.tickFormat(options.xFormat);
        const yAxis = axisLeft<number>(y).ticks(yCount);
        if (options.yWholeNumbers === true) {
          yAxis
            .tickValues(wholeNumberTicks(y, yCount))
            .tickFormat(options.yFormat ?? formatWholeNumber);
        } else if (options.yFormat !== undefined) {
          yAxis.tickFormat(options.yFormat);
        }
        xAxisGroup.call(xAxis);
        yAxisGroup.call(yAxis);
      },
    };
    definition.draw(frame, current);
  }

  function onFrame(): void {
    waitingFrame = null;
    const size = pending;
    pending = null;
    // An element of no size, a tab that is hidden, keeps its last drawing.
    if (size === null || size.width <= 0 || size.height <= 0) return;
    if (
      drawing.kind !== "none" &&
      drawing.size.width === size.width &&
      drawing.size.height === size.height
    ) {
      return;
    }
    drawAt(size);
  }

  const observer = new ResizeObserver((entries) => {
    const entry = entries.findLast((each) => each.target === element);
    if (entry === undefined) return;
    pending = {
      width: entry.contentRect.width,
      height: entry.contentRect.height,
    };
    waitingFrame ??= requestAnimationFrame(onFrame);
  });

  function drawnSize(call: string): Size {
    if (destroyed) {
      throw new Error(
        `popnei_web defect: ${call} of a plot after its destroy.`,
      );
    }
    switch (drawing.kind) {
      case "none":
        throw new Error(
          `popnei_web defect: ${call} of a plot that was never drawn, whose element never had a size.`,
        );
      case "noArea":
        throw new Error(
          `popnei_web defect: ${call} of a plot whose frame has no area, its element of ${String(drawing.size.width)} by ${String(drawing.size.height)} pixels being no larger than its margins.`,
        );
      case "drawn":
        return drawing.size;
    }
  }

  writeText();
  const start = contentBoxOf(element);
  if (start.width > 0 && start.height > 0) drawAt(start);
  observer.observe(element);

  return {
    update(next) {
      if (destroyed) {
        throw new Error(
          "popnei_web defect: update of a plot after its destroy.",
        );
      }
      definition.check(next);
      current = next;
      writeText();
      if (drawing.kind !== "none") drawAt(drawing.size);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer.disconnect();
      if (waitingFrame !== null) cancelAnimationFrame(waitingFrame);
      waitingFrame = null;
      pending = null;
      svg.remove();
    },
    toSVG() {
      return exportSvg(svgElement, drawnSize("toSVG"));
    },
    toPNG(scale) {
      const size = drawnSize("toPNG");
      return exportPng(() => exportSvg(svgElement, size), size, scale);
    },
  };
}
