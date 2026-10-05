/**
 * The base of the 2D plots, docs/specs/charts/plot2d.md, "How it is
 * verified", with a definition of a test that draws one rect per value.
 * jsdom lays nothing out and has no ResizeObserver, so the tests give the
 * size of the element with stubs of clientWidth and clientHeight, and call
 * the observer and the frames of the screen themselves.
 */

import { scaleLinear } from "d3-scale";
import { scaleBand } from "d3-scale";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { exportSvg } from "./export.ts";
import { tableNumber } from "./numbers.ts";
import {
  createPlot2d,
  labelLines,
  wholeNumberTicks,
  type ExportFrame,
  type Margin,
  type Plot2dDefinition,
  type PlotText,
} from "./plot2d.ts";
import type { AxesOptions } from "./plot2d.ts";

interface Bars extends PlotText {
  readonly values: readonly number[];
}

const MARGIN: Margin = { top: 10, right: 20, bottom: 30, left: 40 };

const draws: { innerWidth: number; innerHeight: number }[] = [];
/** The margins of the frame of each draw. */
const margins: Margin[] = [];

const bars: Plot2dDefinition<Bars> = {
  kind: "bars",
  check(data) {
    if (data.values.some((value) => !Number.isFinite(value))) {
      throw new Error("a value is not finite");
    }
  },
  margin: () => MARGIN,
  draw(frame, data) {
    draws.push({
      innerWidth: frame.innerWidth,
      innerHeight: frame.innerHeight,
    });
    margins.push(frame.margin);
    const x = scaleLinear()
      .domain([0, data.values.length])
      .range([0, frame.innerWidth]);
    const y = scaleLinear()
      .domain([0, Math.max(1, ...data.values)])
      .range([frame.innerHeight, 0]);
    frame.marks
      .selectAll("rect.bar")
      .data(data.values)
      .join("rect")
      .attr("class", "bar")
      .attr("x", (_value, i) => x(i))
      .attr("y", (value) => y(value))
      .attr("width", x(1) - x(0))
      .attr("height", (value) => frame.innerHeight - y(value));
    frame.axes(x, y, { yWholeNumbers: true });
  },
};

function barsOf(values: readonly number[], title = "Bars"): Bars {
  return {
    title,
    description: `${String(values.length)} bars`,
    xLabel: "Index",
    yLabel: "Count",
    values,
  };
}

/** The observers made by the plots, which the tests call. */
class FakeObserver {
  static made: FakeObserver[] = [];
  readonly observed: Element[] = [];
  disconnected = false;
  readonly callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    FakeObserver.made.push(this);
  }
  observe(target: Element): void {
    this.observed.push(target);
  }
  unobserve(): void {
    // not called by the base
  }
  disconnect(): void {
    this.disconnected = true;
  }
  /** The browser telling the plot that its element is now of this size. */
  resize(width: number, height: number): void {
    const target = this.observed[0];
    if (target === undefined) throw new Error("nothing observed");
    const entry = { target, contentRect: { width, height } };
    this.callback([entry as ResizeObserverEntry], this);
  }
}

/** The frames of the screen waiting, which the tests run. */
let frames = new Map<number, FrameRequestCallback>();
let lastFrame = 0;

function runFrames(): void {
  const waiting = [...frames.values()];
  frames = new Map();
  for (const callback of waiting) callback(0);
}

function sizedElement(width: number, height: number): HTMLDivElement {
  const element = document.createElement("div");
  document.body.append(element);
  vi.spyOn(element, "clientWidth", "get").mockReturnValue(width);
  vi.spyOn(element, "clientHeight", "get").mockReturnValue(height);
  return element;
}

function observerOf(index: number): FakeObserver {
  const observer = FakeObserver.made[index];
  if (observer === undefined) throw new Error(`no observer ${String(index)}`);
  return observer;
}

/** The labels of the ticks of the axis `selector` in `element`, in order. */
function tickLabels(element: HTMLElement, selector: string): (string | null)[] {
  return [...element.querySelectorAll(`${selector} g.tick text`)].map(
    (each) => each.textContent,
  );
}

/** The labels of the ticks 0, 2, ... 10. */
const EVEN_TO_10 = ["0", "2", "4", "6", "8", "10"];

function svgOf(element: HTMLElement): SVGSVGElement {
  const svg = element.querySelector("svg");
  if (svg === null) throw new Error("no svg");
  return svg;
}

beforeEach(() => {
  FakeObserver.made = [];
  draws.length = 0;
  margins.length = 0;
  frames = new Map();
  vi.stubGlobal("ResizeObserver", FakeObserver);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    lastFrame += 1;
    frames.set(lastFrame, callback);
    return lastFrame;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    frames.delete(id);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("VS4 D1 the base of the 2D plots, without a DOM", () => {
  test("tableNumber shows an edge of popnei to 12 significant digits", () => {
    expect(tableNumber(0.07500000000000001)).toBe(0.075);
    expect(tableNumber(0.9500000000000001)).toBe(0.95);
  });

  test("tableNumber keeps a number that has 12 digits or fewer as it is", () => {
    expect(tableNumber(123456.789012)).toBe(123456.789012);
    expect(tableNumber(0)).toBe(0);
  });

  test("the ticks of a vertical axis of whole numbers for 0 to 3 are 0, 1, 2 and 3", () => {
    const y = scaleLinear().domain([0, 3]).range([300, 0]);
    expect(wholeNumberTicks(y, 300 / 40)).toEqual([0, 1, 2, 3]);
  });
});

describe("VS4 D1 the base of the 2D plots, under jsdom", () => {
  test("the skeleton has its classes, role img, and the title and description of the data", () => {
    const element = sizedElement(400, 300);
    createPlot2d(element, barsOf([1, 2, 3], "Counts of P1"), bars);
    const svg = svgOf(element);
    expect(svg.getAttribute("class")).toBe("chart chart-bars");
    expect(svg.getAttribute("role")).toBe("img");
    const titleEl = svg.querySelector("title");
    const descEl = svg.querySelector("desc");
    expect(titleEl?.textContent).toBe("Counts of P1");
    expect(descEl?.textContent).toBe("3 bars");
    expect(svg.getAttribute("aria-labelledby")).toBe(
      `${titleEl?.id ?? ""} ${descEl?.id ?? ""}`,
    );
    const clipPath = svg.querySelector("defs > clipPath");
    expect(clipPath).not.toBeNull();
    const frame = svg.querySelector(":scope > g.chart-frame");
    const inFrame = [
      "g.chart-grid",
      "g.chart-axis.chart-axis-x",
      "g.chart-axis.chart-axis-y",
      "g.chart-marks",
      "g.chart-annotations",
      "text.chart-axis-label.chart-axis-label-x",
      "text.chart-axis-label.chart-axis-label-y",
    ];
    for (const selector of inFrame) {
      expect(
        frame?.querySelector(`:scope > ${selector}`),
        selector,
      ).not.toBeNull();
    }
    expect(svg.querySelector("g.chart-marks")?.getAttribute("clip-path")).toBe(
      `url(#${clipPath?.id ?? ""})`,
    );
    expect(svg.querySelector(":scope > g.chart-legend")).not.toBeNull();
    expect(svg.querySelector(".chart-overlay")).toBeNull();
    expect(svg.querySelectorAll("rect.bar")).toHaveLength(3);
  });

  test("two plots made in one element each have ids that differ", () => {
    const first = sizedElement(400, 300);
    const second = sizedElement(400, 300);
    createPlot2d(first, barsOf([1]), bars);
    createPlot2d(second, barsOf([1]), bars);
    const idsOf = (element: HTMLElement): string[] =>
      [...element.querySelectorAll("[id]")].map((each) => each.id);
    const firstIds = idsOf(first);
    const secondIds = idsOf(second);
    expect(firstIds).toHaveLength(3);
    expect(secondIds).toHaveLength(3);
    for (const id of firstIds) expect(secondIds).not.toContain(id);
  });

  test("a check that throws when the plot is made leaves the element with no child", () => {
    const element = sizedElement(400, 300);
    expect(() => createPlot2d(element, barsOf([1, Number.NaN]), bars)).toThrow(
      "not finite",
    );
    expect(element.childNodes).toHaveLength(0);
    expect(FakeObserver.made).toHaveLength(0);
  });

  test("an update whose check throws leaves the SVG of the data before", () => {
    const element = sizedElement(400, 300);
    const handle = createPlot2d(element, barsOf([1, 2], "Before"), bars);
    expect(() => {
      handle.update(barsOf([1, Number.NaN, 3], "After"));
    }).toThrow("not finite");
    const svg = svgOf(element);
    expect(svg.querySelectorAll("rect.bar")).toHaveLength(2);
    expect(svg.querySelector("title")?.textContent).toBe("Before");
    // A resize after it draws the data before, and not the refused ones.
    observerOf(0).resize(500, 300);
    runFrames();
    expect(draws).toHaveLength(2);
    expect(svg.querySelectorAll("rect.bar")).toHaveLength(2);
    handle.update(barsOf([5]));
    expect(svg.querySelectorAll("rect.bar")).toHaveLength(1);
  });

  test("an element of size 0 gets the SVG with its texts and nothing drawn", () => {
    const element = sizedElement(0, 0);
    createPlot2d(element, barsOf([1, 2]), bars);
    const svg = svgOf(element);
    expect(svg.querySelector("title")?.textContent).toBe("Bars");
    expect(draws).toHaveLength(0);
    expect(svg.querySelectorAll("rect.bar")).toHaveLength(0);
    expect(svg.hasAttribute("width")).toBe(false);
    observerOf(0).resize(0, 0);
    runFrames();
    expect(draws).toHaveLength(0);
  });

  test("an element not larger than the margins gets an SVG of 0 by 0, and toSVG says the frame has no area", () => {
    // The margins take 10 + 30 = 40 pixels of the height.
    const element = sizedElement(400, 40);
    const handle = createPlot2d(element, barsOf([1, 2, 3]), bars);
    const svg = svgOf(element);
    expect(draws).toHaveLength(0);
    expect(svg.querySelectorAll("rect.bar")).toHaveLength(0);
    expect(svg.getAttribute("width")).toBe("0");
    expect(svg.getAttribute("height")).toBe("0");
    expect(svg.hasAttribute("viewBox")).toBe(false);
    expect(() => handle.toSVG()).toThrow("frame has no area");
    // A resize with room for the frame draws it.
    observerOf(0).resize(400, 300);
    runFrames();
    expect(draws).toEqual([{ innerWidth: 340, innerHeight: 260 }]);
    expect(svg.querySelectorAll("rect.bar")).toHaveLength(3);
    expect(svg.getAttribute("width")).toBe("400");
    const xAxis = svg.querySelector("g.chart-axis-x");
    const yAxis = svg.querySelector("g.chart-axis-y");
    expect(xAxis?.querySelectorAll("g.tick").length).toBeGreaterThan(0);
    expect(yAxis?.querySelectorAll("g.tick").length).toBeGreaterThan(0);
    // A resize back to 40 pixels high leaves nothing of that drawing, its
    // two axes included.
    observerOf(0).resize(400, 40);
    runFrames();
    expect(draws).toHaveLength(1);
    expect(svg.querySelectorAll("rect.bar")).toHaveLength(0);
    expect(xAxis?.childNodes).toHaveLength(0);
    expect(yAxis?.childNodes).toHaveLength(0);
    expect(svg.getAttribute("width")).toBe("0");
    expect(() => handle.toSVG()).toThrow("frame has no area");
  });

  test("toPNG of an element not larger than the margins throws nothing, and its promise rejects saying the frame has no area", async () => {
    const element = sizedElement(400, 40);
    const handle = createPlot2d(element, barsOf([1, 2, 3]), bars);
    let png: Promise<Blob> | null = null;
    expect(() => {
      png = handle.toPNG(2);
    }).not.toThrow();
    await expect(png).rejects.toThrow("frame has no area");
  });

  test("an element whose size becomes 0 after a draw keeps its last drawing", () => {
    const element = sizedElement(400, 300);
    createPlot2d(element, barsOf([1, 2, 3]), bars);
    observerOf(0).resize(0, 0);
    runFrames();
    const svg = svgOf(element);
    expect(draws).toHaveLength(1);
    expect(svg.querySelectorAll("rect.bar")).toHaveLength(3);
    expect(svg.getAttribute("width")).toBe("400");
  });

  test("an element whose width or height alone becomes 0 after a draw keeps its last drawing", () => {
    for (const [width, height] of [
      [400, 0],
      [0, 300],
    ] as const) {
      draws.length = 0;
      const element = sizedElement(400, 300);
      const handle = createPlot2d(element, barsOf([1, 2, 3]), bars);
      const observer = FakeObserver.made.at(-1);
      if (observer === undefined) throw new Error("no observer");
      observer.resize(width, height);
      runFrames();
      const svg = svgOf(element);
      const size = `${String(width)} by ${String(height)}`;
      expect(draws, size).toHaveLength(1);
      expect(svg.querySelectorAll("rect.bar"), size).toHaveLength(3);
      expect(svg.getAttribute("width"), size).toBe("400");
      expect(svg.getAttribute("height"), size).toBe("300");
      expect(() => handle.toSVG(), size).not.toThrow();
      handle.destroy();
    }
  });

  test("an element with a padding is drawn at its content box when made, and not again when the observer gives that box", () => {
    const element = sizedElement(420, 320);
    element.style.padding = "10px";
    // What a browser gives for that element with no border: the box
    // outside the padding.
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
      width: 420,
      height: 320,
    } as DOMRect);
    createPlot2d(element, barsOf([1, 2]), bars);
    expect(svgOf(element).getAttribute("width")).toBe("400");
    observerOf(0).resize(400, 300);
    runFrames();
    expect(draws).toEqual([{ innerWidth: 340, innerHeight: 260 }]);
  });

  test("the first call of the observer with a size draws once, at the next frame", () => {
    const element = sizedElement(0, 0);
    createPlot2d(element, barsOf([1, 2]), bars);
    observerOf(0).resize(400, 300);
    expect(draws).toHaveLength(0);
    runFrames();
    expect(draws).toEqual([{ innerWidth: 340, innerHeight: 260 }]);
    runFrames();
    expect(draws).toHaveLength(1);
  });

  test("three calls of the observer within one frame draw once, at the last size", () => {
    const element = sizedElement(400, 300);
    createPlot2d(element, barsOf([1, 2]), bars);
    expect(draws).toHaveLength(1);
    const observer = observerOf(0);
    observer.resize(500, 300);
    observer.resize(600, 350);
    observer.resize(700, 400);
    expect(frames.size).toBe(1);
    runFrames();
    expect(draws).toEqual([
      { innerWidth: 340, innerHeight: 260 },
      { innerWidth: 640, innerHeight: 360 },
    ]);
  });

  test("the SVG takes the size of the last draw and the frame that size less the margins", () => {
    const element = sizedElement(400, 300);
    createPlot2d(element, barsOf([1, 2]), bars);
    observerOf(0).resize(640, 400);
    runFrames();
    const svg = svgOf(element);
    expect(svg.getAttribute("width")).toBe("640");
    expect(svg.getAttribute("height")).toBe("400");
    expect(svg.getAttribute("viewBox")).toBe("0 0 640 400");
    expect(draws.at(-1)).toEqual({ innerWidth: 580, innerHeight: 360 });
    expect(margins.at(-1)).toEqual(MARGIN);
    expect(svg.querySelector("g.chart-frame")?.getAttribute("transform")).toBe(
      "translate(40,10)",
    );
    const clipRect = svg.querySelector("clipPath > rect");
    expect(clipRect?.getAttribute("width")).toBe("580");
    expect(clipRect?.getAttribute("height")).toBe("360");
    expect(svg.querySelector("g.chart-axis-x")?.getAttribute("transform")).toBe(
      "translate(0,360)",
    );
  });

  test("an update redraws in the same svg element, at the size of the last draw", () => {
    const element = sizedElement(400, 300);
    const handle = createPlot2d(element, barsOf([1, 2]), bars);
    const svg = svgOf(element);
    handle.update(barsOf([1, 2, 3, 4], "Four"));
    expect(element.querySelectorAll("svg")).toHaveLength(1);
    expect(svgOf(element)).toBe(svg);
    expect(svg.querySelectorAll("rect.bar")).toHaveLength(4);
    expect(svg.querySelector("title")?.textContent).toBe("Four");
    expect(draws).toHaveLength(2);
    expect(draws.at(-1)).toEqual({ innerWidth: 340, innerHeight: 260 });
  });

  test("a title with markup in it is text in the title, and no b element is made", () => {
    const element = sizedElement(400, 300);
    const data = { ...barsOf([1]), title: "<b>P1</b>", xLabel: "<b>x</b>" };
    createPlot2d(element, data, bars);
    const svg = svgOf(element);
    expect(svg.querySelector("title")?.textContent).toBe("<b>P1</b>");
    expect(svg.querySelector(".chart-axis-label-x")?.textContent).toBe(
      "<b>x</b>",
    );
    expect(element.querySelector("b")).toBeNull();
  });

  test("destroy empties the element, disconnects the observer and cancels a waiting draw; a second destroy does nothing", () => {
    const element = sizedElement(400, 300);
    const handle = createPlot2d(element, barsOf([1, 2]), bars);
    const observer = observerOf(0);
    observer.resize(500, 300);
    expect(frames.size).toBe(1);
    handle.destroy();
    expect(element.childNodes).toHaveLength(0);
    expect(observer.disconnected).toBe(true);
    expect(frames.size).toBe(0);
    expect(() => {
      handle.destroy();
    }).not.toThrow();
    expect(() => {
      handle.update(barsOf([1]));
    }).toThrow("popnei_web defect");
    expect(draws).toHaveLength(1);
  });
});

describe("VS4 D1 the base of the 2D plots, its axes and its handle", () => {
  test("the vertical axis of whole numbers has only whole ticks, with a comma between thousands", () => {
    const element = sizedElement(400, 300);
    createPlot2d(element, barsOf([12000, 3000]), bars);
    const labels = [
      ...element.querySelectorAll("g.chart-axis-y g.tick text"),
    ].map((each) => each.textContent);
    expect(labels).toContain("12,000");
    expect(labels).toContain("0");
    for (const label of labels) expect(label).toMatch(/^\d{1,3}(,\d{3})*$/);
  });

  test("a vertical axis of whole numbers from 0 to 3 has the ticks 0, 1, 2 and 3 and no half", () => {
    const element = sizedElement(400, 300);
    createPlot2d(element, barsOf([3, 1]), bars);
    const labels = [
      ...element.querySelectorAll("g.chart-axis-y g.tick text"),
    ].map((each) => each.textContent);
    expect(labels).toEqual(["0", "1", "2", "3"]);
  });

  test("the axes have about one tick for 80 pixels of width and one for 40 of height", () => {
    // A frame of 340 by 260. 340 / 80 rounds to 4 ticks over 0 to 7,
    // which d3 makes 0, 2, 4 and 6, where one tick for 60 or 50 pixels
    // would ask for 6 or 7 and give the 8 ticks 0 to 7; 260 / 40 rounds to
    // 7 over 0 to 10 upwards, 0, 2, ... 10, where one for 30 pixels would
    // give the 11 ticks 0 to 10.
    const element = sizedElement(400, 300);
    createPlot2d(element, barsOf([10, 1, 1, 1, 1, 1, 1]), bars);
    expect(tickLabels(element, "g.chart-axis-x")).toEqual(["0", "2", "4", "6"]);
    expect(tickLabels(element, "g.chart-axis-y")).toEqual(EVEN_TO_10);
    // A frame 160 high: 160 / 40 is 4 ticks over 0 to 10, 0, 2, ... 10,
    // where one for 50 pixels would be 3 and give 0, 5 and 10.
    const lower = sizedElement(400, 200);
    createPlot2d(lower, barsOf([10, 1, 1, 1, 1, 1, 1]), bars);
    expect(tickLabels(lower, "g.chart-axis-y")).toEqual(EVEN_TO_10);
  });

  test("the labels of the axes are those of the data, in the margins", () => {
    const element = sizedElement(400, 300);
    createPlot2d(element, barsOf([1, 2]), bars);
    const x = element.querySelector(".chart-axis-label-x");
    const y = element.querySelector(".chart-axis-label-y");
    expect(x?.textContent).toBe("Index");
    expect(y?.textContent).toBe("Count");
    // From the top left of the frame of 340 by 260: the x label centred
    // on the width, its baseline 8 pixels above the bottom of the SVG,
    // 260 + 30 - 8; the y label turned, centred on the height, its
    // baseline 16 pixels right of the left of the SVG, -40 + 16.
    expect(Number(x?.getAttribute("x"))).toBe(170);
    expect(Number(x?.getAttribute("y"))).toBe(282);
    expect(y?.getAttribute("transform")).toBe("rotate(-90)");
    expect(Number(y?.getAttribute("x"))).toBe(-130);
    expect(Number(y?.getAttribute("y"))).toBe(-24);
  });

  test("xFormat and yFormat label the ticks of their axes, yFormat with whole numbers too", () => {
    const formatted = (yWholeNumbers: boolean): Plot2dDefinition<Bars> => ({
      ...bars,
      draw(frame, data) {
        const x = scaleLinear()
          .domain([0, data.values.length])
          .range([0, frame.innerWidth]);
        const y = scaleLinear()
          .domain([0, Math.max(1, ...data.values)])
          .range([frame.innerHeight, 0]);
        frame.axes(x, y, {
          xFormat: (value) => `x${String(value)}`,
          yFormat: (value) => `y${String(value)}`,
          yWholeNumbers,
        });
      },
    });
    const element = sizedElement(400, 300);
    createPlot2d(element, barsOf([10, 1, 1, 1, 1, 1, 1]), formatted(false));
    expect(tickLabels(element, "g.chart-axis-x")).toEqual([
      "x0",
      "x2",
      "x4",
      "x6",
    ]);
    expect(tickLabels(element, "g.chart-axis-y")).toEqual(
      EVEN_TO_10.map((label) => `y${label}`),
    );
    const whole = sizedElement(400, 300);
    createPlot2d(whole, barsOf([3, 1]), formatted(true));
    expect(tickLabels(whole, "g.chart-axis-y")).toEqual([
      "y0",
      "y1",
      "y2",
      "y3",
    ]);
  });

  test("IP10 D3 tickShown leaves out the ticks of both axes it is false for, the whole numbers among them", () => {
    const kept = (yWholeNumbers: boolean): Plot2dDefinition<Bars> => ({
      ...bars,
      draw(frame, data) {
        const x = scaleLinear()
          .domain([0, data.values.length])
          .range([0, frame.innerWidth]);
        const y = scaleLinear()
          .domain([0, Math.max(1, ...data.values)])
          .range([frame.innerHeight, 0]);
        frame.axes(x, y, {
          yWholeNumbers,
          tickShown: (value) => value !== 2,
        });
      },
    });
    const element = sizedElement(400, 300);
    createPlot2d(element, barsOf([10, 1, 1, 1, 1, 1, 1]), kept(false));
    expect(tickLabels(element, "g.chart-axis-x")).toEqual(["0", "4", "6"]);
    expect(tickLabels(element, "g.chart-axis-y")).toEqual(
      EVEN_TO_10.filter((label) => label !== "2"),
    );
    const whole = sizedElement(400, 300);
    createPlot2d(whole, barsOf([3, 1]), kept(true));
    expect(tickLabels(whole, "g.chart-axis-y")).toEqual(["0", "1", "3"]);
  });

  test("a draw that a resize scheduled draws the data of a later update at the new size", () => {
    const element = sizedElement(400, 300);
    const handle = createPlot2d(element, barsOf([1, 2]), bars);
    observerOf(0).resize(600, 300);
    handle.update(barsOf([1, 2, 3]));
    runFrames();
    expect(draws.at(-1)).toEqual({ innerWidth: 540, innerHeight: 260 });
    expect(element.querySelectorAll("rect.bar")).toHaveLength(3);
  });

  test("toSVG of a plot never drawn, and after destroy, throws, and toPNG rejects", async () => {
    const hidden = sizedElement(0, 0);
    const never = createPlot2d(hidden, barsOf([1]), bars);
    expect(() => never.toSVG()).toThrow("never drawn");
    let neverPng: Promise<Blob> | null = null;
    expect(() => {
      neverPng = never.toPNG(3);
    }).not.toThrow();
    await expect(neverPng).rejects.toThrow("never drawn");
    const element = sizedElement(400, 300);
    const handle = createPlot2d(element, barsOf([1]), bars);
    handle.destroy();
    expect(() => handle.toSVG()).toThrow("after its destroy");
    let destroyedPng: Promise<Blob> | null = null;
    expect(() => {
      destroyedPng = handle.toPNG(2);
    }).not.toThrow();
    await expect(destroyedPng).rejects.toThrow("after its destroy");
  });
});

/** A pointer event of `type` from `pointerType`, at (clientX, clientY). */
function pointerEvent(
  type: string,
  pointerType: string,
  clientX = 0,
  clientY = 0,
  relatedTarget: EventTarget | null = null,
): PointerEvent {
  return new PointerEvent(type, {
    pointerType,
    clientX,
    clientY,
    relatedTarget,
    bubbles: type !== "pointerleave",
  });
}

/** The bars with an overlay, which record the calls of the pointer. */
function pointerBars(): {
  readonly definition: Plot2dDefinition<Bars>;
  readonly moves: [number, number][];
  readonly leaves: (EventTarget | null)[];
} {
  const moves: [number, number][] = [];
  const leaves: (EventTarget | null)[] = [];
  return {
    definition: {
      ...bars,
      pointer: {
        move(x, y) {
          moves.push([x, y]);
        },
        leave(to) {
          leaves.push(to);
        },
      },
    },
    moves,
    leaves,
  };
}

function overlayOf(element: HTMLElement): SVGRectElement {
  const overlay = element.querySelector<SVGRectElement>("rect.chart-overlay");
  if (overlay === null) throw new Error("no overlay");
  return overlay;
}

describe("IP7 D2 the base of the 2D plots, its overlay and the calls of the pointer", () => {
  test("a definition with pointer gets the overlay, the last child of the frame, of the size of the frame after a draw and a resize; one without gets none", () => {
    const element = sizedElement(400, 300);
    createPlot2d(element, barsOf([1, 2]), pointerBars().definition);
    const overlay = overlayOf(element);
    expect(element.querySelector("g.chart-frame")?.lastElementChild).toBe(
      overlay,
    );
    expect([
      overlay.getAttribute("width"),
      overlay.getAttribute("height"),
    ]).toEqual(["340", "260"]);
    observerOf(0).resize(640, 400);
    runFrames();
    expect([
      overlay.getAttribute("width"),
      overlay.getAttribute("height"),
    ]).toEqual(["580", "360"]);
    const plain = sizedElement(400, 300);
    createPlot2d(plain, barsOf([1, 2]), bars);
    expect(plain.querySelector(".chart-overlay")).toBeNull();
  });

  test("a frame with no area gives the overlay a size of 0 and calls leave with null", () => {
    const element = sizedElement(400, 300);
    const { definition, leaves } = pointerBars();
    createPlot2d(element, barsOf([1, 2]), definition);
    expect(leaves).toEqual([]);
    observerOf(0).resize(400, 40);
    runFrames();
    const overlay = overlayOf(element);
    expect([
      overlay.getAttribute("width"),
      overlay.getAttribute("height"),
    ]).toEqual(["0", "0"]);
    expect(leaves).toEqual([null]);
  });

  test("a move of the pointer and a touch call move with the position in the pixels of the overlay", () => {
    const element = sizedElement(400, 300);
    const { definition, moves } = pointerBars();
    createPlot2d(element, barsOf([1, 2]), definition);
    const overlay = overlayOf(element);
    // jsdom lays nothing out: the overlay is placed here where a browser
    // would put the frame, 40 pixels right and 10 down.
    vi.spyOn(overlay, "getBoundingClientRect").mockReturnValue({
      left: 40,
      top: 10,
    } as DOMRect);
    overlay.dispatchEvent(pointerEvent("pointermove", "mouse", 140, 60));
    overlay.dispatchEvent(pointerEvent("pointerdown", "touch", 45, 12));
    expect(moves).toEqual([
      [100, 50],
      [5, 2],
    ]);
  });

  test("a mouse or a pen that leaves calls leave with the element it went onto; a finger lifted does not", () => {
    const element = sizedElement(400, 300);
    const { definition, leaves } = pointerBars();
    const handle = createPlot2d(element, barsOf([1, 2]), definition);
    const overlay = overlayOf(element);
    const onto = document.createElement("div");
    document.body.append(onto);
    overlay.dispatchEvent(pointerEvent("pointerleave", "touch", 0, 0, onto));
    expect(leaves).toEqual([]);
    overlay.dispatchEvent(pointerEvent("pointerleave", "mouse", 0, 0, onto));
    overlay.dispatchEvent(pointerEvent("pointerleave", "pen", 0, 0, null));
    expect(leaves).toEqual([onto, null]);
    handle.destroy();
    overlay.dispatchEvent(pointerEvent("pointerleave", "mouse", 0, 0, onto));
    overlay.dispatchEvent(pointerEvent("pointermove", "mouse", 5, 5));
    expect(leaves).toHaveLength(2);
  });
});

/** The bars that draw a rect in the legend of the exported copy, and record its frames. */
function exportedBars(): {
  readonly definition: Plot2dDefinition<Bars>;
  readonly frames: ExportFrame[];
} {
  const exportFrames: ExportFrame[] = [];
  return {
    definition: {
      ...pointerBars().definition,
      draw(frame, data) {
        bars.draw(frame, data);
        // A mark of the point under the pointer, which the file leaves out.
        frame.annotations
          .selectAll("path.chart-hover")
          .data([0])
          .join("path")
          .attr("class", "chart-hover");
      },
      drawExport(legend, frame, data) {
        exportFrames.push(frame);
        legend
          .append("rect")
          .attr("class", "beside")
          .attr("width", data.values.length);
      },
    },
    frames: exportFrames,
  };
}

describe("IP7 D2 the base of the 2D plots, what the export draws beside the SVG", () => {
  test("toSVG holds in chart-legend what drawExport drew, with the frame and the data of the last draw, and the plot on the screen is not changed", () => {
    const element = sizedElement(400, 300);
    const { definition, frames: exportFrames } = exportedBars();
    const handle = createPlot2d(element, barsOf([1, 2]), definition);
    observerOf(0).resize(640, 400);
    runFrames();
    handle.update(barsOf([1, 2, 3]));
    const file = new DOMParser().parseFromString(
      handle.toSVG(),
      "image/svg+xml",
    );
    const beside = file.querySelector("svg > g.chart-legend > rect.beside");
    expect(beside?.getAttribute("width")).toBe("3");
    expect(exportFrames).toEqual([
      { innerWidth: 580, innerHeight: 360, margin: MARGIN },
    ]);
    expect(element.querySelector("g.chart-legend")?.childNodes).toHaveLength(0);
    expect(element.querySelector("path.chart-hover")).not.toBeNull();
    expect(element.querySelector("rect.chart-overlay")).not.toBeNull();
  });

  test("the file has no overlay and no mark of the point under the pointer", () => {
    const element = sizedElement(400, 300);
    const handle = createPlot2d(
      element,
      barsOf([1, 2]),
      exportedBars().definition,
    );
    const file = handle.toSVG();
    expect(file).not.toContain("chart-overlay");
    expect(file).not.toContain("chart-hover");
    expect(file).toContain("beside");
  });

  test("toPNG draws its PNG from an SVG that holds what drawExport drew", async () => {
    const element = sizedElement(400, 300);
    const handle = createPlot2d(
      element,
      barsOf([1, 2]),
      exportedBars().definition,
    );
    // jsdom has no fonts and decodes no image: the SVG given to the image
    // is caught here, and the PNG is then refused with notMade.
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve() },
    });
    const blobs: Blob[] = [];
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
      if (blob instanceof Blob) blobs.push(blob);
      return "blob:plot";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    await expect(handle.toPNG(2)).rejects.toMatchObject({ kind: "notMade" });
    Reflect.deleteProperty(document, "fonts");
    const [svg] = blobs;
    expect(svg).toBeDefined();
    const text = (await svg?.text()) ?? "";
    expect(text).toContain('class="beside"');
    expect(text).not.toContain("chart-hover");
  });

  test("toPNG draws the plot as it was when it was called, though an update comes before the fonts are ready", async () => {
    const element = sizedElement(400, 300);
    const handle = createPlot2d(
      element,
      barsOf([1, 2]),
      exportedBars().definition,
    );
    let fontsLoaded: () => void = () => undefined;
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: {
        ready: new Promise<void>((resolve) => {
          fontsLoaded = resolve;
        }),
      },
    });
    const blobs: Blob[] = [];
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
      if (blob instanceof Blob) blobs.push(blob);
      return "blob:plot";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const png = handle.toPNG(2);
    handle.update(barsOf([1, 2, 3]));
    fontsLoaded();
    await expect(png).rejects.toMatchObject({ kind: "notMade" });
    Reflect.deleteProperty(document, "fonts");
    const file = new DOMParser().parseFromString(
      (await blobs[0]?.text()) ?? "",
      "image/svg+xml",
    );
    // The bars and what drawExport drew, both of the two values.
    expect(file.querySelectorAll("rect.bar")).toHaveLength(2);
    expect(file.querySelector("rect.beside")?.getAttribute("width")).toBe("2");
  });

  test("exportSvg calls drawBeside once the overlay and the mark of the point under the pointer are removed, and writes the styles on what it drew, stroke-linejoin among them", () => {
    const style = document.createElement("style");
    style.textContent =
      ".chart-points { stroke-linejoin: round; fill: rgb(230, 159, 0); }";
    document.head.append(style);
    const element = sizedElement(400, 300);
    const handle = createPlot2d(
      element,
      barsOf([1, 2]),
      exportedBars().definition,
    );
    const svg = svgOf(element);
    let seen: { overlay: boolean; hover: boolean } | null = null;
    const file = exportSvg(svg, { width: 400, height: 300 }, (copy) => {
      seen = {
        overlay: copy.querySelector(".chart-overlay") !== null,
        hover: copy.querySelector(".chart-hover") !== null,
      };
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute("class", "chart-points");
      copy.append(path);
    });
    expect(seen).toEqual({ overlay: false, hover: false });
    const drawn = new DOMParser()
      .parseFromString(file, "image/svg+xml")
      .querySelector("svg > path.chart-points");
    const written = drawn?.getAttribute("style") ?? "";
    expect(written).toContain("stroke-linejoin: round");
    expect(written).toContain("fill: rgb(230, 159, 0)");
    handle.destroy();
    style.remove();
  });
});

describe("PA4 D1 the base of the 2D plots, ticks at whole numbers on the horizontal axis, without a DOM", () => {
  test("the whole ticks of a horizontal axis from 0.5 to 2.5 are 1 and 2 alone, where d3 gives the halves too", () => {
    // A frame 340 wide asks for about 340 / 80, 4, ticks.
    const x = scaleLinear().domain([0.5, 2.5]).range([0, 340]);
    expect(x.ticks(4)).toEqual([0.5, 1, 1.5, 2, 2.5]);
    expect(wholeNumberTicks(x, 4)).toEqual([1, 2]);
  });
});

/** Shares over counts from 0.5, the spectrum's shape. */
interface Shares extends PlotText {
  readonly xMax: number;
  readonly xWholeNumbers: boolean;
}

const shares: Plot2dDefinition<Shares> = {
  kind: "shares",
  check() {
    // any shares are drawn
  },
  margin: () => MARGIN,
  draw(frame, data) {
    const x = scaleLinear()
      .domain([0.5, data.xMax])
      .range([0, frame.innerWidth]);
    const y = scaleLinear().domain([0, 0.06]).range([frame.innerHeight, 0]);
    frame.axes(x, y, { xWholeNumbers: data.xWholeNumbers });
  },
};

function sharesOf(xMax: number, xWholeNumbers: boolean): Shares {
  return {
    title: "Shares",
    description: "Shares",
    xLabel: "Count",
    yLabel: "Share",
    xMax,
    xWholeNumbers,
  };
}

/** Names on both axes, drawn from band scales, with the options given. */
interface Names extends PlotText {
  readonly names: readonly string[];
  readonly options: AxesOptions;
}

const names: Plot2dDefinition<Names> = {
  kind: "names",
  check() {
    // any names are drawn
  },
  margin: () => MARGIN,
  draw(frame, data) {
    const x = scaleBand().domain(data.names).range([0, frame.innerWidth]);
    const y = scaleBand().domain(data.names).range([0, frame.innerHeight]);
    frame.axes(x, y, data.options);
  },
};

function namesOf(list: readonly string[], options: AxesOptions = {}): Names {
  return {
    title: "Names",
    description: "Names",
    xLabel: "",
    yLabel: "",
    names: list,
    options,
  };
}

/** The text elements of the labels of the ticks of `selector`. */
function tickTexts(element: HTMLElement, selector: string): Element[] {
  return [...element.querySelectorAll(`${selector} g.tick text`)];
}

describe("PA4 D1 the base of the 2D plots, its axes of names and its labels, under jsdom", () => {
  test("xWholeNumbers gives the horizontal axis from 0.5 to 2.5 the ticks 1 and 2, and the vertical axis keeps ticks that are not whole", () => {
    const element = sizedElement(400, 300);
    createPlot2d(element, sharesOf(2.5, true), shares);
    expect(tickLabels(element, "g.chart-axis-x")).toEqual(["1", "2"]);
    expect(tickLabels(element, "g.chart-axis-y")).toEqual([
      "0.00",
      "0.01",
      "0.02",
      "0.03",
      "0.04",
      "0.05",
      "0.06",
    ]);
    const halves = sizedElement(400, 300);
    createPlot2d(halves, sharesOf(2.5, false), shares);
    expect(tickLabels(halves, "g.chart-axis-x")).toEqual([
      "0.5",
      "1.0",
      "1.5",
      "2.0",
      "2.5",
    ]);
    // The distances of the LD decay: a comma between thousands.
    const distances = sizedElement(400, 300);
    createPlot2d(distances, sharesOf(100_000.5, true), shares);
    expect(tickLabels(distances, "g.chart-axis-x")).toEqual([
      "20,000",
      "40,000",
      "60,000",
      "80,000",
      "100,000",
    ]);
  });

  test("an axis of a band scale of p2, p0, p1 draws the three names in that order, each in the middle of its band, and no tick line", () => {
    const element = sizedElement(400, 300);
    const handle = createPlot2d(element, namesOf(["a", "b"]), names);
    handle.update(namesOf(["p2", "p0", "p1"]));
    expect(tickLabels(element, "g.chart-axis-x")).toEqual(["p2", "p0", "p1"]);
    expect(tickLabels(element, "g.chart-axis-y")).toEqual(["p2", "p0", "p1"]);
    expect(element.querySelectorAll("g.chart-axis g.tick")).toHaveLength(6);
    expect(element.querySelectorAll("g.chart-axis g.tick line")).toHaveLength(
      0,
    );
    // Bands of 340 / 3 pixels across the frame.
    const middles = [...element.querySelectorAll("g.chart-axis-x g.tick")].map(
      (tick) =>
        Number(
          /translate\(([\d.]+),/.exec(
            tick.getAttribute("transform") ?? "",
          )?.[1],
        ),
    );
    expect(middles).toHaveLength(3);
    for (const [i, middle] of middles.entries()) {
      expect(middle).toBeCloseTo((340 / 3) * (i + 0.5), 0);
    }
  });

  test("with xLabelAngle -45 each name of the horizontal axis is turned by -45 and anchored at its end, and those of the vertical axis are not turned", () => {
    const element = sizedElement(400, 300);
    createPlot2d(
      element,
      namesOf(["p2", "p0", "p1"], { xLabelAngle: -45 }),
      names,
    );
    const xTexts = tickTexts(element, "g.chart-axis-x");
    expect(xTexts).toHaveLength(3);
    for (const text of xTexts) {
      // Turned about the point 8 pixels under its band, where the name ends.
      expect(text.getAttribute("transform")).toBe("rotate(-45 0 8)");
      expect(text.getAttribute("text-anchor")).toBe("end");
    }
    for (const text of tickTexts(element, "g.chart-axis-y")) {
      expect(text.getAttribute("transform")).toBeNull();
    }
    // Without the option the names are level.
    const level = sizedElement(400, 300);
    createPlot2d(level, namesOf(["p2", "p0", "p1"]), names);
    for (const text of tickTexts(level, "g.chart-axis-x")) {
      expect(text.getAttribute("transform")).toBeNull();
      expect(text.getAttribute("text-anchor")).toBeNull();
    }
  });

  test("a name <b>P1</b> is text on both axes and no b element is made", () => {
    const element = sizedElement(400, 300);
    createPlot2d(element, namesOf(["<b>P1</b>", "p2"]), names);
    expect(tickLabels(element, "g.chart-axis-x")).toEqual(["<b>P1</b>", "p2"]);
    expect(tickLabels(element, "g.chart-axis-y")).toEqual(["<b>P1</b>", "p2"]);
    expect(element.querySelector("b")).toBeNull();
  });

  test("nameFormat writes the names as the plot cuts them, and two names alike in their first characters stay two", () => {
    const element = sizedElement(400, 300);
    createPlot2d(
      element,
      namesOf(["Population one", "Population two"], {
        nameFormat: (name) => `${name.slice(0, 5)}…`,
      }),
      names,
    );
    expect(tickLabels(element, "g.chart-axis-x")).toEqual(["Popul…", "Popul…"]);
    expect(tickLabels(element, "g.chart-axis-y")).toEqual(["Popul…", "Popul…"]);
  });

  test("an empty xLabel or yLabel leaves no text element of that label, and a label given later is written under the overlay", () => {
    const element = sizedElement(400, 300);
    const { definition } = pointerBars();
    const handle = createPlot2d(
      element,
      { ...barsOf([1, 2]), xLabel: "" },
      definition,
    );
    expect(element.querySelector(".chart-axis-label-x")).toBeNull();
    expect(element.querySelector(".chart-axis-label-y")?.textContent).toBe(
      "Count",
    );
    handle.update({ ...barsOf([1, 2]), yLabel: "" });
    expect(element.querySelector(".chart-axis-label-y")).toBeNull();
    expect(element.querySelector(".chart-axis-label-x")?.textContent).toBe(
      "Index",
    );
    handle.update(barsOf([1, 2]));
    // Both back, in their order, under the overlay, the last child.
    const frame = element.querySelector("g.chart-frame");
    const classes = [...(frame?.children ?? [])].map((child) =>
      child.getAttribute("class"),
    );
    expect(classes.slice(-3)).toEqual([
      "chart-axis-label chart-axis-label-x",
      "chart-axis-label chart-axis-label-y",
      "chart-overlay",
    ]);
    expect(element.querySelectorAll("text.chart-axis-label")).toHaveLength(2);
  });
});

describe("PA10 the base of the 2D plots, a label of the horizontal axis on two lines when one would not fit", () => {
  /** The margins of the histogram of the spectrum, without a threshold. */
  const SPECTRUM_MARGIN: Margin = { top: 12, right: 16, bottom: 44, left: 60 };
  const spectrumLike: Plot2dDefinition<Bars> = {
    ...bars,
    margin: () => SPECTRUM_MARGIN,
  };
  const LONG = "Copies of the rarer allele among 40 chromosomes";

  function withLabel(xLabel: string): Bars {
    return { ...barsOf([1, 2]), xLabel };
  }
  function labelOf(element: HTMLElement): SVGTextElement | null {
    return element.querySelector<SVGTextElement>("text.chart-axis-label-x");
  }

  test("at 600 by 375 the label is one text with no line inside, and the frame keeps the margins given", () => {
    draws.length = 0;
    margins.length = 0;
    const element = sizedElement(600, 375);
    createPlot2d(element, withLabel(LONG), spectrumLike);
    const label = labelOf(element);
    expect(label?.textContent).toBe(LONG);
    expect(label?.querySelectorAll("tspan")).toHaveLength(0);
    expect(Number(label?.getAttribute("y"))).toBe(319 + 44 - 8);
    expect(draws.at(-1)?.innerHeight).toBe(319);
    expect(margins.at(-1)?.bottom).toBe(44);
  });

  test("at 281 by 288 it is two lines, centred under the frame, the second 16 pixels under the first and 8 above the bottom, with 16 pixels more of margin", () => {
    draws.length = 0;
    margins.length = 0;
    const element = sizedElement(281, 288);
    const handle = createPlot2d(element, withLabel(LONG), spectrumLike);
    const label = labelOf(element);
    const lines = [...(label?.querySelectorAll("tspan") ?? [])];
    expect(lines.map((line) => line.textContent)).toEqual([
      "Copies of the rarer allele ",
      "among 40 chromosomes",
    ]);
    // The text of the label is the label.
    expect(label?.textContent).toBe(LONG);
    // A frame of 281 − 60 − 16 = 205 wide, and 288 − 12 − 44 − 16 = 216 high.
    expect(draws.at(-1)).toEqual({ innerWidth: 205, innerHeight: 216 });
    expect(margins.at(-1)?.bottom).toBe(60);
    for (const line of lines)
      expect(Number(line.getAttribute("x"))).toBe(102.5);
    expect(Number(label?.getAttribute("y"))).toBe(216 + 60 - 8 - 16);
    expect(lines[0]?.getAttribute("dy")).toBeNull();
    expect(Number(lines[1]?.getAttribute("dy"))).toBe(16);
    // A resize back to 600 by 375 gives one line and the frame of 319.
    FakeObserver.made.at(-1)?.resize(600, 375);
    runFrames();
    expect(labelOf(element)?.querySelectorAll("tspan")).toHaveLength(0);
    expect(labelOf(element)?.textContent).toBe(LONG);
    expect(draws.at(-1)?.innerHeight).toBe(319);
    handle.destroy();
  });

  test("at 281 by 288 the vertical label of the spectrum is two lines too, with 16 pixels more of left margin, and the label under the frame stays on two", () => {
    draws.length = 0;
    margins.length = 0;
    const element = sizedElement(281, 288);
    createPlot2d(
      element,
      {
        ...withLabel(LONG),
        yLabel: "Share of the variants with both alleles",
      },
      spectrumLike,
    );
    const label = element.querySelector("text.chart-axis-label-y");
    const lines = [...(label?.querySelectorAll("tspan") ?? [])];
    expect(lines.map((line) => line.textContent)).toEqual([
      "Share of the variants ",
      "with both alleles",
    ]);
    expect(label?.textContent).toBe("Share of the variants with both alleles");
    // 281 − 76 − 16 = 189 wide, and 288 − 12 − 60 = 216 high.
    expect(draws.at(-1)).toEqual({ innerWidth: 189, innerHeight: 216 });
    expect(margins.at(-1)).toEqual({
      top: 12,
      right: 16,
      bottom: 60,
      left: 76,
    });
    // The first line 16 pixels from the left of the SVG, the second 16
    // further, both centred along the frame.
    expect(Number(label?.getAttribute("y"))).toBe(-76 + 16);
    for (const line of lines) expect(Number(line.getAttribute("x"))).toBe(-108);
    expect(Number(lines[1]?.getAttribute("dy"))).toBe(16);
    expect(labelOf(element)?.querySelectorAll("tspan")).toHaveLength(2);
    // "Count" fits, and stays one line.
    const other = sizedElement(281, 288);
    createPlot2d(other, withLabel(LONG), spectrumLike);
    expect(
      other.querySelectorAll("text.chart-axis-label-y tspan"),
    ).toHaveLength(0);
  });

  test("at 384 by 288 the label under the frame fits until the vertical label takes 16 pixels of its width, and then is two lines", () => {
    draws.length = 0;
    const element = sizedElement(384, 288);
    createPlot2d(
      element,
      {
        ...withLabel(LONG),
        yLabel: "Share of the variants with both alleles",
      },
      spectrumLike,
    );
    // 384 − 60 − 16 = 308 would hold the 333.7 counted pixels of the label,
    // with 16 of margin on each side; 384 − 76 − 16 = 292 does not.
    expect(labelOf(element)?.querySelectorAll("tspan")).toHaveLength(2);
    expect(draws.at(-1)).toEqual({ innerWidth: 292, innerHeight: 216 });
  });

  test("at 288 by 288 Expected heterozygosity (unbiased), 34 characters, counted at 7.1 pixels, fits the 122 pixels of half its frame and its margin, and stays one line", () => {
    const element = sizedElement(288, 288);
    createPlot2d(
      element,
      withLabel("Expected heterozygosity (unbiased)"),
      spectrumLike,
    );
    expect(labelOf(element)?.querySelectorAll("tspan")).toHaveLength(0);
  });

  test("the review of PA10: with a legend's margin at the right the two decisions take turns, and a label once broken stays broken, so that they end", () => {
    // With 200 pixels at the right and 40 at the left, the vertical
    // label's second line widens the left margin, the nearer side, and
    // gives the label under the frame 8 pixels more of room; at 507 by
    // 316 that is the 0.45 pixel it lacked, and its single line would
    // shorten the frame again, so that the two would take turns.
    draws.length = 0;
    margins.length = 0;
    const xLabel = "Hudson's Fst between populations of the first group";
    const yLabel = "Mean r squared of the pairs in each bin a";
    expect([xLabel.length, yLabel.length]).toEqual([51, 41]);
    const element = sizedElement(507, 316);
    createPlot2d(
      element,
      { ...barsOf([1, 2]), xLabel, yLabel },
      {
        ...bars,
        margin: () => ({ top: 16, right: 200, bottom: 40, left: 40 }),
      },
    );
    expect(labelOf(element)?.querySelectorAll("tspan")).toHaveLength(2);
    expect(
      element.querySelectorAll("text.chart-axis-label-y tspan"),
    ).toHaveLength(2);
    expect(margins.at(-1)).toEqual({
      top: 16,
      right: 200,
      bottom: 56,
      left: 56,
    });
    expect(draws.at(-1)).toEqual({ innerWidth: 251, innerHeight: 244 });
  });

  test("the review of PA10: labelLines keeps a label whose counted half width is exactly its room on one line, and breaks it at the first of two spaces equally far from its middle", () => {
    // 20 characters at 7.1 pixels, 71 of half width; 110 / 2 + 16 = 71.
    const twenty = "aaaaaaaaa bbbbbbbbbb";
    expect(labelLines(twenty, 110, 16, 30)).toEqual([twenty]);
    expect(labelLines(twenty, 108, 16, 30)).toHaveLength(2);
    // Spaces at 3 and 5 of 8 characters, each 1 from the middle at 4.
    expect(labelLines("abc d ef", 0, 0, 0)).toEqual(["abc ", "d ef"]);
  });

  test("a label with no space stays one line, and one that fits, Major allele frequency, too", () => {
    const element = sizedElement(281, 288);
    createPlot2d(element, withLabel("x".repeat(46)), spectrumLike);
    expect(labelOf(element)?.querySelectorAll("tspan")).toHaveLength(0);
    const other = sizedElement(281, 288);
    draws.length = 0;
    createPlot2d(other, withLabel("Major allele frequency"), spectrumLike);
    expect(labelOf(other)?.querySelectorAll("tspan")).toHaveLength(0);
    expect(draws.at(-1)?.innerHeight).toBe(232);
  });
});
