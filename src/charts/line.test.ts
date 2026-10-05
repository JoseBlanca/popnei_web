/**
 * The line plot, docs/specs/charts/line.md, "How it is verified": the SVG
 * it builds under jsdom and its refusals. jsdom lays nothing out and has
 * no ResizeObserver, so the tests give the size of the element with stubs
 * of clientWidth and clientHeight, 600 by 375, which the base reads when
 * the plot is made: with the margins of 12, 44 and 60 pixels and, at the
 * right, the 76 of a legend whose labels have four characters, "pop0", a
 * frame of 464 by 319. How the plot looks, its export and the contrast of its
 * colours are checked in Playwright, e2e/plots.spec.ts.
 */

import { pathRound } from "d3-path";
import { symbolsFill } from "d3-shape";
import type { SymbolType } from "d3-shape";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MAX_LINE_SERIES, MAX_SVG_POINTS } from "./limits.ts";
import { createLine, lineLegendRoom } from "./line.ts";
import type { LineData, LineSeries, XY } from "./line.ts";
import { drawSymbolAt, SYMBOL_AREA } from "./marks.ts";

/** The right margin of a legend at the right of the frame whose longest
    label has four characters: 12 to its rows, their piece of line of 24,
    6, the label at 7.5 pixels a character, and 4. */
const RIGHT_OF_FOUR = 12 + 24 + 6 + 30 + 4;

/** The frame of an element of 600 by 375, less the margins, with such a
    legend. */
const INNER_WIDTH = 600 - 60 - RIGHT_OF_FOUR;
const INNER_HEIGHT = 375 - 12 - 44;

function xy(x: readonly number[], y: readonly number[]): XY {
  return { x: Float64Array.from(x), y: Float64Array.from(y) };
}

/**
 * A series of `group`: three points, a line of four positions and one
 * mark, at x 40 and y 0.25, over the domains 0 to 100 and 0 to 1.
 */
function seriesOf(group: number, label = `pop${String(group)}`): LineSeries {
  return {
    label,
    group,
    points: xy([10, 20, 30], [0.2, 0.4, 0.6]),
    line: xy([0, 25, 50, 100], [0.5, 0.4, 0.3, 0.1]),
    marks: [{ x: 40, y: 0.25 }],
  };
}

function lineOf(series: readonly LineSeries[]): LineData {
  return {
    title: "The LD decay",
    description: "The mean r² of pairs of variants against their distance.",
    xLabel: "Distance between the two variants (bp)",
    yLabel: "Mean r² of the pairs",
    series,
    xDomain: [0, 100],
    yDomain: [0, 1],
    xWholeNumbers: false,
    yWholeNumbers: false,
  };
}

/** The pixel across of `x` of the domain 0 to 100. */
function px(x: number): number {
  return (x / 100) * INNER_WIDTH;
}

/** The pixel up of `y` of the domain 0 to 1. */
function py(y: number): number {
  return INNER_HEIGHT * (1 - y);
}

/** The `d` of symbols of `type` and `area` at the pixels of `points`. */
function symbolsAt(
  type: SymbolType | undefined,
  area: number,
  points: readonly (readonly [number, number])[],
): string {
  if (type === undefined) throw new Error("no such symbol");
  const path = pathRound(1);
  for (const [x, y] of points) drawSymbolAt(path, type, area, px(x), py(y));
  return path.toString();
}

/** The observers made by the plots, which the tests call. */
class FakeObserver {
  static made: FakeObserver[] = [];
  readonly callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    FakeObserver.made.push(this);
  }
  observe(): void {
    // the base observes its element; the tests give the size by stubs
  }
  unobserve(): void {
    // not called by the base
  }
  disconnect(): void {
    // nothing to disconnect
  }
}

function sizedElement(width = 600, height = 375): HTMLDivElement {
  const element = document.createElement("div");
  document.body.append(element);
  vi.spyOn(element, "clientWidth", "get").mockReturnValue(width);
  vi.spyOn(element, "clientHeight", "get").mockReturnValue(height);
  return element;
}

/** The elements of `selector` in the group of the marks, in order. */
function inMarks(element: HTMLElement, selector: string): Element[] {
  return [...element.querySelectorAll(`g.chart-marks > ${selector}`)];
}

/** The class of each element of the group of the marks, in order. */
function marksOrder(element: HTMLElement): (string | null)[] {
  return [...element.querySelectorAll("g.chart-marks > *")].map((each) =>
    each.getAttribute("class"),
  );
}

/** The number of parts of a path, its M commands. */
function parts(path: Element | undefined): number {
  return (path?.getAttribute("d") ?? "").split("M").length - 1;
}

/** The texts of the legend, in order. */
function legendTexts(element: HTMLElement): (string | null)[] {
  return [...element.querySelectorAll("g.chart-legend-row text")].map(
    (text) => text.textContent,
  );
}

beforeEach(() => {
  FakeObserver.made = [];
  vi.stubGlobal("ResizeObserver", FakeObserver);
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("PA4 D4 the line plot under jsdom, its SVG", () => {
  test("the skeleton has the classes chart chart-line, its title and description, and no overlay", () => {
    const element = sizedElement();
    createLine(element, lineOf([seriesOf(0)]));
    const svg = element.querySelector("svg");
    expect(svg?.getAttribute("class")).toBe("chart chart-line");
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.querySelector("title")?.textContent).toBe("The LD decay");
    expect(svg?.querySelector("g.chart-marks")).not.toBeNull();
    expect(element.querySelector(".chart-overlay")).toBeNull();
  });

  test("two series of groups 0 and 1 draw two lines on two casings, orange and sky blue being light; a third of group 2, green, adds a line and no casing", () => {
    const element = sizedElement();
    const handle = createLine(element, lineOf([seriesOf(0), seriesOf(1)]));
    const lines = inMarks(element, "path.chart-line");
    expect(lines.map((line) => line.getAttribute("class"))).toEqual([
      "chart-line chart-line-colour-0",
      "chart-line chart-line-colour-1",
    ]);
    expect(inMarks(element, "path.chart-line-casing")).toHaveLength(2);
    // The four positions at the scales, with one decimal.
    expect(lines[0]?.getAttribute("d")).toBe(
      "M0,159.5L116,191.4L232,223.3L464,287.1",
    );
    // Each casing is the path of its line, drawn just before it.
    expect(marksOrder(element).slice(0, 4)).toEqual([
      "chart-line-casing",
      "chart-line chart-line-colour-0",
      "chart-line-casing",
      "chart-line chart-line-colour-1",
    ]);
    expect(
      inMarks(element, "path.chart-line-casing")[0]?.getAttribute("d"),
    ).toBe(lines[0]?.getAttribute("d"));

    handle.update(lineOf([seriesOf(0), seriesOf(1), seriesOf(2)]));
    expect(inMarks(element, "path.chart-line")).toHaveLength(3);
    expect(inMarks(element, "path.chart-line-casing")).toHaveLength(2);
  });

  test("the points of each series are one path in the colour of its group, circles for group 0, and a series of group 9 has chart-colour-2 and the shape of index 3", () => {
    const element = sizedElement();
    createLine(element, lineOf([seriesOf(0), seriesOf(1), seriesOf(9)]));
    const points = inMarks(element, "path.chart-points");
    expect(points.map((path) => path.getAttribute("class"))).toEqual([
      "chart-points chart-colour-0",
      "chart-points chart-colour-1",
      "chart-points chart-colour-2",
    ]);
    const at: [number, number][] = [
      [10, 0.2],
      [20, 0.4],
      [30, 0.6],
    ];
    expect(points[0]?.getAttribute("d")).toBe(
      symbolsAt(symbolsFill[0], SYMBOL_AREA, at),
    );
    expect(points[2]?.getAttribute("d")).toBe(
      symbolsAt(symbolsFill[3], SYMBOL_AREA, at),
    );
    // Its line and its mark are green too, with no casing.
    expect(inMarks(element, "path.chart-line")[2]?.getAttribute("class")).toBe(
      "chart-line chart-line-colour-2",
    );
    expect(
      element
        .querySelectorAll("line.chart-mark-line")[2]
        ?.getAttribute("class"),
    ).toBe("chart-mark-line chart-line-colour-2");
    expect(inMarks(element, "path.chart-line-casing")).toHaveLength(2);
  });

  test("each mark is a dashed line from the bottom of the frame up to its y in the colour of its series, on a casing of the same ends for a light colour, and the mark of the series at 1.5 times the area at its top", () => {
    const element = sizedElement();
    const handle = createLine(element, lineOf([seriesOf(0), seriesOf(1)]));
    const lines = [
      ...element.querySelectorAll("g.chart-annotations > line.chart-mark-line"),
    ];
    expect(
      lines.map((line) => [
        line.getAttribute("class"),
        Number(line.getAttribute("x1")),
        Number(line.getAttribute("x2")),
        Number(line.getAttribute("y1")),
        Number(line.getAttribute("y2")),
      ]),
    ).toEqual([
      [
        "chart-mark-line chart-line-colour-0",
        px(40),
        px(40),
        INNER_HEIGHT,
        py(0.25),
      ],
      [
        "chart-mark-line chart-line-colour-1",
        px(40),
        px(40),
        INNER_HEIGHT,
        py(0.25),
      ],
    ]);
    const marks = [
      ...element.querySelectorAll("g.chart-annotations > path.chart-mark"),
    ];
    expect(marks.map((mark) => mark.getAttribute("class"))).toEqual([
      "chart-points chart-mark chart-colour-0",
      "chart-points chart-mark chart-colour-1",
    ]);
    expect(marks[1]?.getAttribute("d")).toBe(
      symbolsAt(symbolsFill[1], 1.5 * SYMBOL_AREA, [[40, 0.25]]),
    );
    // Orange and sky blue are light colours: a casing each, of the ends of
    // its dashed line.
    const casings = [
      ...element.querySelectorAll(
        "g.chart-annotations > line.chart-mark-casing",
      ),
    ];
    expect(
      casings.map((line) => [
        line.getAttribute("class"),
        Number(line.getAttribute("x1")),
        Number(line.getAttribute("x2")),
        Number(line.getAttribute("y1")),
        Number(line.getAttribute("y2")),
      ]),
    ).toEqual([
      ["chart-mark-casing", px(40), px(40), INNER_HEIGHT, py(0.25)],
      ["chart-mark-casing", px(40), px(40), INNER_HEIGHT, py(0.25)],
    ]);
    // The casings under the dashed lines, and the marks over them.
    const annotations = (): (string | undefined)[] =>
      [...element.querySelectorAll("g.chart-annotations > *")].map(
        (each) => each.getAttribute("class")?.split(" ")[0],
      );
    expect(annotations()).toEqual([
      "chart-mark-casing",
      "chart-mark-casing",
      "chart-mark-line",
      "chart-mark-line",
      "chart-points",
      "chart-points",
    ]);
    // Green is not light: its mark has no casing, also when its series is
    // added by an update, and the order holds.
    handle.update(lineOf([seriesOf(0), seriesOf(1), seriesOf(2)]));
    expect(annotations()).toEqual([
      "chart-mark-casing",
      "chart-mark-casing",
      "chart-mark-line",
      "chart-mark-line",
      "chart-mark-line",
      "chart-points",
      "chart-points",
      "chart-points",
    ]);
    handle.update(lineOf([seriesOf(2)]));
    expect(annotations()).toEqual(["chart-mark-line", "chart-points"]);
    // A casing that enters after a dashed line is put under it.
    handle.update(lineOf([seriesOf(2), seriesOf(0)]));
    expect(annotations()).toEqual([
      "chart-mark-casing",
      "chart-mark-line",
      "chart-mark-line",
      "chart-points",
      "chart-points",
    ]);
  });

  test("the legend has a row per series in their order, its label as text, its mark, and its piece of line on a casing for a light colour", () => {
    const element = sizedElement();
    createLine(
      element,
      lineOf([seriesOf(1, "<b>p1</b> · half at 7,548 bp"), seriesOf(2, "p2")]),
    );
    expect(legendTexts(element)).toEqual([
      "<b>p1</b> · half at 7,548 bp",
      "p2",
    ]);
    expect(element.querySelector("g.chart-legend b")).toBeNull();
    const rows = [...element.querySelectorAll("g.chart-legend-row")];
    expect(
      rows.map((row) =>
        [...row.children].map((child) => child.getAttribute("class")),
      ),
    ).toEqual([
      [
        "chart-line-casing",
        "chart-line chart-line-colour-1",
        "chart-points chart-colour-1",
        "chart-legend-text",
      ],
      [
        "chart-line chart-line-colour-2",
        "chart-points chart-colour-2",
        "chart-legend-text",
      ],
    ]);
    // In each row the piece of line from 0 to 24, its mark at its middle,
    // and the text 6 pixels after it.
    const first = rows[0];
    expect(
      [...(first?.querySelectorAll("line") ?? [])].map((line) => [
        line.getAttribute("x1"),
        line.getAttribute("x2"),
      ]),
    ).toEqual([
      ["0", "24"],
      ["0", "24"],
    ]);
    expect(first?.querySelector("path")?.getAttribute("transform")).toBe(
      "translate(12,0)",
    );
    expect(first?.querySelector("text")?.getAttribute("x")).toBe("30");
  });

  /** Two series whose longer label has 24 characters. */
  const flow = (): LineData =>
    lineOf([seriesOf(0, "pop_a · half at 7,548 bp"), seriesOf(1, "pop_b")]);

  /** The transforms of the rows of the legend, in order. */
  function rowPlaces(element: HTMLElement): (string | null)[] {
    return [...element.querySelectorAll("g.chart-legend-row")].map((row) =>
      row.getAttribute("transform"),
    );
  }

  /** The width and the height of the clip of the frame. */
  function frameSize(element: HTMLElement): (number | null)[] {
    const clip = element.querySelector("clipPath rect");
    return [
      Number(clip?.getAttribute("width")),
      Number(clip?.getAttribute("height")),
    ];
  }

  test("PA10 at 600 by 375 the legend of labels of 24 characters stands at the right of the frame, in a right margin of 226 pixels, its rows from 12 pixels right of the frame and 8 below its top", () => {
    const element = sizedElement();
    createLine(element, flow());
    expect(
      element.querySelector("g.chart-legend")?.getAttribute("data-place"),
    ).toBe("right");
    // 600 less the left margin of 60 and 12, 24, 6, 180 and 4 at the right.
    expect(frameSize(element)).toEqual([600 - 60 - 226, 375 - 12 - 44]);
    expect(rowPlaces(element)).toEqual([
      `translate(${String(600 - 226 + 12)},${String(12 + 8 + 9)})`,
      `translate(${String(600 - 226 + 12)},${String(12 + 8 + 9 + 18)})`,
    ]);
  });

  test("PA10 at 320 by 404 the same legend stands above the plot: a right margin of 28, a top margin of 56, and its rows from 8 pixels right of the left edge and 8 below the top of the SVG, the frame 12 pixels under the last", () => {
    const element = sizedElement(320, 404);
    createLine(element, flow());
    expect(
      element.querySelector("g.chart-legend")?.getAttribute("data-place"),
    ).toBe("above");
    expect(frameSize(element)).toEqual([320 - 60 - 28, 404 - 56 - 44]);
    expect(element.querySelector("svg > g")?.getAttribute("transform")).toBe(
      "translate(60,56)",
    );
    expect(rowPlaces(element)).toEqual(["translate(8,17)", "translate(8,35)"]);
  });

  test("PA10 the legend goes above the plot in an element narrower than narrowUnder, 586 pixels for labels of 24 characters, and not at 586", () => {
    expect(lineLegendRoom(flow())).toEqual({
      narrowUnder: 586,
      narrowHeight: 44,
      narrowWidth: 226,
    });
    const place = (width: number): string | null | undefined => {
      const element = sizedElement(width, 500);
      createLine(element, flow());
      return element
        .querySelector("g.chart-legend")
        ?.getAttribute("data-place");
    };
    expect(place(586)).toBe("right");
    expect(place(585)).toBe("above");
  });

  test("PA10 a series more with a shorter label makes the right margin no larger and the legend above the plot 18 pixels higher; with no series the right margin is 28 and the legend asks nothing", () => {
    const three = lineOf([...flow().series, seriesOf(2, "pop_c")]);
    expect(lineLegendRoom(three)).toEqual({
      narrowUnder: 586,
      narrowHeight: 62,
      narrowWidth: 226,
    });
    expect(lineLegendRoom(lineOf([]))).toEqual({
      narrowUnder: 60 + 300 + 28,
      narrowHeight: 0,
      narrowWidth: 0,
    });
    const element = sizedElement();
    createLine(element, lineOf([]));
    expect(frameSize(element)).toEqual([600 - 60 - 28, 375 - 12 - 44]);
    const short = sizedElement();
    createLine(short, lineOf([seriesOf(0, "")]));
    // A legend whose labels are empty still has its pieces of line.
    expect(frameSize(short)).toEqual([600 - 60 - 46, 375 - 12 - 44]);
  });

  test("PA10 an update to labels that no longer fit at the right moves the legend above the plot, and back", () => {
    const element = sizedElement(600, 500);
    const handle = createLine(element, flow());
    const place = (): string | null | undefined =>
      element.querySelector("g.chart-legend")?.getAttribute("data-place");
    expect(place()).toBe("right");
    handle.update(
      lineOf([
        seriesOf(0, "Solanum_pimpine… · half at 1,599,810 bp, beyond the plot"),
      ]),
    );
    expect(place()).toBe("above");
    expect(frameSize(element)).toEqual([600 - 60 - 28, 500 - 12 - 44 - 26]);
    handle.update(flow());
    expect(place()).toBe("right");
  });

  test("in the marks every line comes before every set of points, after an update that adds a series too", () => {
    const element = sizedElement();
    const handle = createLine(element, lineOf([seriesOf(0), seriesOf(2)]));
    const isPoints = (name: string | null): boolean =>
      name?.startsWith("chart-points") === true;
    const order = (): (string | null)[] => marksOrder(element);
    expect(order().findIndex(isPoints)).toBe(3);
    expect(order().findLastIndex((name) => !isPoints(name))).toBe(2);
    handle.update(lineOf([seriesOf(0), seriesOf(2), seriesOf(1)]));
    expect(order()).toHaveLength(8);
    expect(order().findIndex(isPoints)).toBe(5);
    expect(order().findLastIndex((name) => !isPoints(name))).toBe(4);
  });

  test("a series with no point and no line keeps its row in the legend and draws nothing in the frame; every series empty leaves the axes and the legend", () => {
    const element = sizedElement();
    const empty: LineSeries = {
      label: "pop_c · no pair",
      group: 2,
      points: xy([], []),
      line: null,
      marks: [],
    };
    const handle = createLine(element, lineOf([seriesOf(0), empty]));
    expect(inMarks(element, "*")).toHaveLength(3);
    expect(legendTexts(element)).toEqual(["pop0", "pop_c · no pair"]);
    handle.update(lineOf([empty]));
    expect(inMarks(element, "*")).toHaveLength(0);
    expect(element.querySelectorAll("g.chart-annotations > *")).toHaveLength(0);
    expect(legendTexts(element)).toEqual(["pop_c · no pair"]);
    expect(
      element.querySelectorAll("g.chart-axis-x g.tick").length,
    ).toBeGreaterThan(0);
  });
});

describe("PA4 D4 the line plot under jsdom, the values it does not draw", () => {
  test("a NaN in points.y leaves that point out of the path", () => {
    const element = sizedElement();
    const series: LineSeries = {
      ...seriesOf(0),
      points: xy([10, 20, 30], [0.2, Number.NaN, 0.6]),
    };
    createLine(element, lineOf([series]));
    const points = inMarks(element, "path.chart-points")[0];
    expect(parts(points)).toBe(2);
    expect(points?.getAttribute("d")).toBe(
      symbolsAt(symbolsFill[0], SYMBOL_AREA, [
        [10, 0.2],
        [30, 0.6],
      ]),
    );
  });

  test("a finite value of the line that scales beyond the pixels a number holds, 1e308 up, breaks the line there and writes no Infinity", () => {
    const element = sizedElement();
    const series: LineSeries = {
      ...seriesOf(2),
      line: xy([0, 20, 40, 60, 80], [0.5, 0.4, 1e308, 0.3, 0.2]),
    };
    createLine(element, lineOf([series]));
    const line = inMarks(element, "path.chart-line")[0];
    expect(line?.getAttribute("d")).toBe(
      "M0,159.5L92.8,191.4M278.4,223.3L371.2,255.2",
    );
  });

  test("a NaN in line.y breaks the line into two parts, two M commands", () => {
    const element = sizedElement();
    const series: LineSeries = {
      ...seriesOf(2),
      line: xy([0, 20, 40, 60, 80], [0.5, 0.4, Number.NaN, 0.3, 0.2]),
    };
    createLine(element, lineOf([series]));
    const line = inMarks(element, "path.chart-line")[0];
    expect(parts(line)).toBe(2);
    expect(line?.getAttribute("d")).toBe(
      "M0,159.5L92.8,191.4M278.4,223.3L371.2,255.2",
    );
  });

  test("a mark beyond the horizontal range, or with a NaN, draws no line and no mark, and a point outside the ranges is not drawn", () => {
    const element = sizedElement();
    const series: LineSeries = {
      ...seriesOf(0),
      points: xy([10, 120, 30, -5], [0.2, 0.4, 1.5, 0.3]),
      marks: [
        { x: 150, y: 0.25 },
        { x: 40, y: Number.NaN },
        { x: 60, y: 0.25 },
      ],
    };
    createLine(element, lineOf([series]));
    const lines = [...element.querySelectorAll("line.chart-mark-line")];
    expect(lines.map((line) => Number(line.getAttribute("x1")))).toEqual([
      px(60),
    ]);
    expect(element.querySelectorAll("path.chart-mark")).toHaveLength(1);
    expect(inMarks(element, "path.chart-points")[0]?.getAttribute("d")).toBe(
      symbolsAt(symbolsFill[0], SYMBOL_AREA, [[10, 0.2]]),
    );
  });

  test("the ticks of a horizontal axis from 0 to 100,000 with xWholeNumbers read 0, 20,000, … 100,000 at 600 pixels", () => {
    const element = sizedElement();
    createLine(element, {
      ...lineOf([seriesOf(0)]),
      xDomain: [0, 100000],
      xWholeNumbers: true,
    });
    const ticks = [
      ...element.querySelectorAll("g.chart-axis-x g.tick text"),
    ].map((text) => text.textContent);
    expect(ticks).toEqual([
      "0",
      "20,000",
      "40,000",
      "60,000",
      "80,000",
      "100,000",
    ]);
  });

  test("the scales end where the ranges say, not made round, and the whole numbers of each axis are asked for apart", () => {
    const element = sizedElement();
    const series: LineSeries = {
      ...seriesOf(0),
      line: xy([0, 3], [0, 3]),
    };
    const handle = createLine(element, {
      ...lineOf([series]),
      xDomain: [0, 3],
      yDomain: [0, 3],
      xWholeNumbers: true,
      yWholeNumbers: false,
    });
    // The position at 3 is the right end and the top of the frame.
    expect(inMarks(element, "path.chart-line")[0]?.getAttribute("d")).toBe(
      `M0,${String(INNER_HEIGHT)}L${String(INNER_WIDTH)},0`,
    );
    const ticks = (axis: "x" | "y"): (string | null)[] =>
      [...element.querySelectorAll(`g.chart-axis-${axis} g.tick text`)].map(
        (text) => text.textContent,
      );
    expect(ticks("x")).toEqual(["0", "1", "2", "3"]);
    expect(ticks("y")).toContain("0.5");
    handle.update({
      ...lineOf([series]),
      xDomain: [0, 3],
      yDomain: [0, 3],
      xWholeNumbers: false,
      yWholeNumbers: true,
    });
    expect(ticks("x")).toContain("0.5");
    expect(ticks("y")).toEqual(["0", "1", "2", "3"]);
  });
});

describe("PA4 D4 the line plot under jsdom, its refusals", () => {
  test("a domain [1, 1] or [0, NaN], across or up, is refused, by createLine and by update", () => {
    const element = sizedElement();
    const good = lineOf([seriesOf(0)]);
    expect(() => createLine(element, { ...good, xDomain: [1, 1] })).toThrow(
      /popnei_web defect/,
    );
    expect(() =>
      createLine(element, { ...good, yDomain: [0, Number.NaN] }),
    ).toThrow(/popnei_web defect/);
    expect(() => createLine(element, { ...good, xDomain: [2, 1] })).toThrow(
      /popnei_web defect/,
    );
    expect(() =>
      createLine(element, { ...good, yDomain: [Number.NEGATIVE_INFINITY, 1] }),
    ).toThrow(/popnei_web defect/);
    // Nothing was added by the refusals.
    expect(element.children).toHaveLength(0);
    const handle = createLine(element, good);
    expect(() => {
      handle.update({ ...good, xDomain: [0, Number.NaN] });
    }).toThrow(/popnei_web defect/);
  });

  test("points or a line whose two arrays differ in length are refused", () => {
    const element = sizedElement();
    expect(() =>
      createLine(
        element,
        lineOf([{ ...seriesOf(0), points: xy([1, 2], [0.1]) }]),
      ),
    ).toThrow(/popnei_web defect/);
    expect(() =>
      createLine(
        element,
        lineOf([{ ...seriesOf(0), line: xy([1], [0.1, 0.2]) }]),
      ),
    ).toThrow(/popnei_web defect/);
  });

  test("a group that is not a whole number from 0, and two series of one group, are refused", () => {
    const element = sizedElement();
    expect(() => createLine(element, lineOf([seriesOf(-1)]))).toThrow(
      /popnei_web defect/,
    );
    expect(() => createLine(element, lineOf([seriesOf(1.5)]))).toThrow(
      /popnei_web defect/,
    );
    // Refused by the check, before anything is added to the element.
    expect(element.children).toHaveLength(0);
    expect(() =>
      createLine(element, lineOf([seriesOf(3, "a"), seriesOf(3, "b")])),
    ).toThrow(/popnei_web defect/);
  });

  test("two series of one mark, groups 0 and 49, orange circles both, are refused, and groups 0 and 48 drawn", () => {
    const element = sizedElement();
    expect(() =>
      createLine(element, lineOf([seriesOf(0, "a"), seriesOf(49, "b")])),
    ).toThrow(/popnei_web defect/);
    expect(element.children).toHaveLength(0);
    createLine(element, lineOf([seriesOf(0, "a"), seriesOf(48, "b")]));
    expect(legendTexts(element)).toHaveLength(2);
  });

  test("50 series are refused and 49 drawn", () => {
    const element = sizedElement();
    const many = (count: number): LineSeries[] =>
      Array.from({ length: count }, (_each, group) => seriesOf(group));
    expect(MAX_LINE_SERIES).toBe(49);
    expect(() => createLine(element, lineOf(many(50)))).toThrow(
      /popnei_web defect/,
    );
    createLine(element, lineOf(many(49)));
    expect(legendTexts(element)).toHaveLength(49);
  });

  test("50,001 points and positions of lines together are refused, and 50,000 drawn", () => {
    const element = sizedElement();
    const spread = (count: number): XY =>
      xy(
        Array.from({ length: count }, (_each, at) => (100 * at) / count),
        Array.from({ length: count }, () => 0.5),
      );
    const withTotal = (total: number): LineData =>
      lineOf([
        { ...seriesOf(0), points: spread(20000), line: spread(10000) },
        { ...seriesOf(1), points: spread(10000), line: spread(total - 40000) },
      ]);
    expect(MAX_SVG_POINTS).toBe(50000);
    expect(() => createLine(element, withTotal(50001))).toThrow(
      /popnei_web defect/,
    );
    createLine(element, withTotal(50000));
    expect(inMarks(element, "path.chart-line")).toHaveLength(2);
  });
});
