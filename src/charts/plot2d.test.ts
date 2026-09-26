/**
 * The base of the 2D plots, docs/specs/charts/plot2d.md, "How it is
 * verified", with a definition of a test that draws one rect per value.
 * jsdom lays nothing out and has no ResizeObserver, so the tests give the
 * size of the element with stubs of clientWidth and clientHeight, and call
 * the observer and the frames of the screen themselves.
 */

import { scaleLinear } from "d3-scale";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  createPlot2d,
  tableNumber,
  wholeNumberTicks,
  type Margin,
  type Plot2dDefinition,
  type PlotText,
} from "./plot2d.ts";

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
    // A frame of 340 by 260: about 4 ticks over 0 to 10, which d3 makes
    // 0, 2, ... 10, and about 7 over 0 to 10 upwards, 0, 2, ... 10 too.
    const element = sizedElement(400, 300);
    createPlot2d(element, barsOf([10, 1, 1, 1, 1, 1, 1, 1, 1, 1]), bars);
    const ticksOf = (selector: string): number =>
      element.querySelectorAll(`${selector} g.tick`).length;
    expect(ticksOf("g.chart-axis-x")).toBe(6);
    expect(ticksOf("g.chart-axis-y")).toBe(6);
  });

  test("the labels of the axes are those of the data, in the margins", () => {
    const element = sizedElement(400, 300);
    createPlot2d(element, barsOf([1, 2]), bars);
    const x = element.querySelector(".chart-axis-label-x");
    const y = element.querySelector(".chart-axis-label-y");
    expect(x?.textContent).toBe("Index");
    expect(y?.textContent).toBe("Count");
    expect(Number(x?.getAttribute("y"))).toBeGreaterThan(260);
    expect(Number(y?.getAttribute("y"))).toBeLessThan(0);
    expect(y?.getAttribute("transform")).toBe("rotate(-90)");
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

  test("toSVG and toPNG of a plot never drawn, and after destroy, throw", () => {
    const hidden = sizedElement(0, 0);
    const never = createPlot2d(hidden, barsOf([1]), bars);
    expect(() => never.toSVG()).toThrow("never drawn");
    expect(() => never.toPNG(3)).toThrow("never drawn");
    const element = sizedElement(400, 300);
    const handle = createPlot2d(element, barsOf([1]), bars);
    handle.destroy();
    expect(() => handle.toSVG()).toThrow("after its destroy");
    expect(() => handle.toPNG(2)).toThrow("after its destroy");
  });
});
