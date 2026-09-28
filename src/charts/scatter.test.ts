/**
 * The scatter plot of the PCA, docs/specs/charts/scatter.md, "How it is
 * verified": its scales and the defects of its data, with no DOM, and the
 * SVG it builds under jsdom. jsdom lays nothing out and has no
 * ResizeObserver, so the tests give the size of the element with stubs of
 * clientWidth and clientHeight, and call the observer and the frames of
 * the screen themselves. With nothing laid out, the overlay is at 0,0 of
 * the page and a position of the pointer is one of the frame: the tests of
 * the hover here check what the plot does with a position, and where the
 * browser puts the pointer is checked in Playwright.
 */

import { pathRound } from "d3-path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  drawSymbolAt,
  groupSymbol,
  NO_GROUP,
  PATH_DIGITS,
  SYMBOL_AREA,
  viridisColour,
  type GroupColours,
  type PointColours,
  type ValueColours,
} from "./marks.ts";
import { MAX_SVG_POINTS } from "./limits.ts";
import {
  createScatter,
  SCATTER_MARGIN,
  scatterScales,
  type ScatterData,
} from "./scatter.ts";

/** The frame of an element of 400 by 300, less SCATTER_MARGIN. */
const FRAME_WIDTH = 324;
const FRAME_HEIGHT = 244;

function groups(
  group: readonly number[],
  names: readonly string[],
  highlighted: number | null = null,
): GroupColours {
  return {
    kind: "groups",
    title: "Population",
    group: Uint16Array.from(group),
    names,
    noneName: "No population",
    highlighted,
  };
}

function values(value: readonly number[]): ValueColours {
  return {
    kind: "values",
    title: "Height",
    values: Float64Array.from(value),
    noneName: "No value",
  };
}

function scatterOf(
  x: readonly number[],
  y: readonly number[],
  colours: PointColours,
  pointNames: readonly string[] = x.map((_x, index) => `s${String(index)}`),
): ScatterData {
  return {
    title: "Principal components",
    description: "The individuals on PC1 and PC2",
    xLabel: "PC1 (3.55%)",
    yLabel: "PC2 (3.40%)",
    x: Float64Array.from(x),
    y: Float64Array.from(y),
    xName: "PC1",
    yName: "PC2",
    pointNames,
    colours,
  };
}

/** Six points 60.8 pixels apart across, of four groups and a no-group. */
const SIX_X = [0, 1, 2, 3, 4, 5];
const SIX_Y = [0, 1, 0, 1, 0, 1];
const SIX_GROUPS = [0, 1, 2, 3, NO_GROUP, 0];
const FOUR_NAMES = ["P1", "P2", "P3", "P4"];

function six(highlighted: number | null = null): ScatterData {
  return scatterOf(SIX_X, SIX_Y, groups(SIX_GROUPS, FOUR_NAMES, highlighted));
}

/** The observers made by the plots, which the tests call. */
class FakeObserver {
  static made: FakeObserver[] = [];
  readonly observed: Element[] = [];
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
    // nothing to disconnect
  }
  /** The browser telling the plot that its element is now of this size. */
  resize(width: number, height: number): void {
    const target = this.observed[0];
    if (target === undefined) throw new Error("nothing observed");
    const entry = { target, contentRect: { width, height } };
    this.callback([entry as ResizeObserverEntry], this);
  }
}

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

/** The classes of the paths of the points, in the order they are drawn. */
function pathClasses(element: HTMLElement): (string | null)[] {
  return [...element.querySelectorAll("g.chart-marks > path")].map((path) =>
    path.getAttribute("class"),
  );
}

function overlayOf(element: HTMLElement): SVGRectElement {
  const overlay = element.querySelector<SVGRectElement>("rect.chart-overlay");
  if (overlay === null) throw new Error("no overlay");
  return overlay;
}

/** The pixel of point `index` of `data` in a frame of 324 by 244. */
function pixelOf(data: ScatterData, index: number): [number, number] {
  const scales = scatterScales(data, FRAME_WIDTH, FRAME_HEIGHT);
  return [scales.x(data.x[index] ?? 0), scales.y(data.y[index] ?? 0)];
}

/** Moves a mouse over the overlay to (x, y) of the frame. */
function moveTo(element: HTMLElement, [x, y]: [number, number]): void {
  overlayOf(element).dispatchEvent(
    new PointerEvent("pointermove", {
      pointerType: "mouse",
      clientX: x,
      clientY: y,
      bubbles: true,
    }),
  );
}

function leave(
  element: HTMLElement,
  pointerType: string,
  relatedTarget: EventTarget | null,
): void {
  overlayOf(element).dispatchEvent(
    new PointerEvent("pointerleave", { pointerType, relatedTarget }),
  );
}

function tooltipOf(element: HTMLElement): HTMLDivElement | null {
  return element.querySelector<HTMLDivElement>("div.chart-tooltip");
}

/** The lines of the tooltip while it is shown; null while it is hidden. */
function tooltipText(element: HTMLElement): (string | null)[] | null {
  const box = tooltipOf(element);
  if (box?.hidden !== false) return null;
  return [...box.children].map((line) => line.textContent);
}

/** The exported file of `handle`, parsed. */
function fileOf(svgText: string): Document {
  return new DOMParser().parseFromString(svgText, "image/svg+xml");
}

/** The texts of the legend of an exported file, in order. */
function legendTexts(file: Document): (string | null)[] {
  return [...file.querySelectorAll("g.chart-legend text")].map(
    (text) => text.textContent,
  );
}

beforeEach(() => {
  FakeObserver.made = [];
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

describe("IP7 D1 the pieces of the scatter, its scales", () => {
  test("x from −1 to 1 and y from 0 to 1 in a frame of 400 by 300: 190 pixels per unit on both axes", () => {
    const data = scatterOf([-1, 1, 0], [0, 1, 0.5], groups([0, 0, 0], ["P"]));
    const { x, y } = scatterScales(data, 400, 300);
    expect(x.domain()).toEqual([-1.0526315789473684, 1.0526315789473684]);
    expect(y.domain()).toEqual([-0.2894736842105263, 1.2894736842105263]);
    expect(x.range()).toEqual([0, 400]);
    expect(y.range()).toEqual([300, 0]);
    expect(x(1) - x(0)).toBeCloseTo(190, 9);
    expect(y(0) - y(1)).toBeCloseTo(190, 9);
    expect(y(1)).toBeCloseTo(55, 9);
  });

  test("one point at (2, 3): 140 pixels per unit, the point at the centre of the frame", () => {
    const data = scatterOf([2], [3], groups([0], ["P"]));
    const { x, y } = scatterScales(data, 400, 300);
    expect(x(3) - x(2)).toBeCloseTo(140, 9);
    expect(y(3) - y(4)).toBeCloseTo(140, 9);
    expect(x(2)).toBeCloseTo(200, 9);
    expect(y(3)).toBeCloseTo(150, 9);
  });

  test("no finite point: the same scale, around (0, 0); a point not finite leaves the scale alone", () => {
    const none = scatterOf(
      [Number.NaN, 5],
      [1, Number.POSITIVE_INFINITY],
      groups([0, 0], ["P"]),
    );
    const { x, y } = scatterScales(none, 400, 300);
    expect(x(1) - x(0)).toBeCloseTo(140, 9);
    expect(x(0)).toBeCloseTo(200, 9);
    expect(y(0)).toBeCloseTo(150, 9);
    const some = scatterOf(
      [-1, 1, 0, Number.NaN],
      [0, 1, 0.5, 100],
      groups([0, 0, 0, 0], ["P"]),
    );
    expect(scatterScales(some, 400, 300).y.domain()).toEqual([
      -0.2894736842105263, 1.2894736842105263,
    ]);
  });

  test("a span of 0 along one axis: the other sets the scale", () => {
    const data = scatterOf([0, 2], [5, 5], groups([0, 0], ["P"]));
    const { x, y } = scatterScales(data, 400, 300);
    expect(x(1) - x(0)).toBeCloseTo(190, 9);
    expect(y(5)).toBeCloseTo(150, 9);
  });
});

describe("IP7 D1 the pieces of the scatter, the defects of its data", () => {
  test("names, coordinates and colours not all of one length, and more than 50,000 points, throw", () => {
    const element = sizedElement(400, 300);
    const colours = groups([0, 0], ["P"]);
    expect(() =>
      createScatter(element, scatterOf([0, 1], [0, 1], colours, ["s0"])),
    ).toThrow("2 points was given 1 names");
    expect(() =>
      createScatter(element, scatterOf([0, 1], [0], colours)),
    ).toThrow("popnei_web defect");
    expect(() =>
      createScatter(element, scatterOf([0, 1], [0, 1], groups([0], ["P"]))),
    ).toThrow("popnei_web defect");
    expect(element.childNodes).toHaveLength(0);
    const many = (count: number): ScatterData => {
      const zeros = new Array<number>(count).fill(0);
      return scatterOf(zeros, zeros, groups(zeros, ["P"]));
    };
    expect(() => createScatter(element, many(MAX_SVG_POINTS + 1))).toThrow(
      "more than the 50000",
    );
    const handle = createScatter(element, many(MAX_SVG_POINTS));
    expect(() => {
      handle.update(scatterOf([0, 1], [0, 1], colours, ["s0"]));
    }).toThrow("popnei_web defect");
    handle.destroy();
  });
});

describe("IP7 D2 the scatter under jsdom, its SVG", () => {
  test("the class chart chart-scatter, and the overlay the last child of the frame, of the size of the frame", () => {
    const element = sizedElement(400, 300);
    createScatter(element, six());
    const svg = element.querySelector("svg");
    expect(svg?.getAttribute("class")).toBe("chart chart-scatter");
    const overlay = overlayOf(element);
    expect(element.querySelector("g.chart-frame")?.lastElementChild).toBe(
      overlay,
    );
    expect([
      overlay.getAttribute("width"),
      overlay.getAttribute("height"),
    ]).toEqual([String(FRAME_WIDTH), String(FRAME_HEIGHT)]);
    expect(
      element.querySelector("g.chart-frame")?.getAttribute("transform"),
    ).toBe(
      `translate(${String(SCATTER_MARGIN.left)},${String(SCATTER_MARGIN.top)})`,
    );
  });

  test("four groups and a no-group: five paths, the no-group first, each group with the class of its colour", () => {
    const element = sizedElement(400, 300);
    createScatter(element, six());
    expect(pathClasses(element)).toEqual([
      "chart-points chart-points-none",
      "chart-points chart-colour-0",
      "chart-points chart-colour-1",
      "chart-points chart-colour-2",
      "chart-points chart-colour-3",
    ]);
  });

  test("group 2 highlighted is drawn last and the four others faded; an update to none, or to 4, beyond the names, fades none", () => {
    const element = sizedElement(400, 300);
    const handle = createScatter(element, six(2));
    expect(pathClasses(element)).toEqual([
      "chart-points chart-points-none chart-points-faded",
      "chart-points chart-colour-0 chart-points-faded",
      "chart-points chart-colour-1 chart-points-faded",
      "chart-points chart-colour-3 chart-points-faded",
      "chart-points chart-colour-2",
    ]);
    handle.update(six(null));
    expect(element.querySelectorAll(".chart-points-faded")).toHaveLength(0);
    expect(pathClasses(element).at(-1)).toBe("chart-points chart-colour-3");
    handle.update(six(2));
    expect(() => {
      handle.update(six(4));
    }).not.toThrow();
    expect(element.querySelectorAll(".chart-points-faded")).toHaveLength(0);
    expect(pathClasses(element)[0]).toBe("chart-points chart-points-none");
    handle.update(six(NO_GROUP));
    expect(pathClasses(element).at(-1)).toBe("chart-points chart-points-none");
    expect(element.querySelectorAll(".chart-points-faded")).toHaveLength(4);
  });

  test("the path of a group is its marks drawn at the pixels of its points; a group with no point drawn has no path and keeps its colour", () => {
    const element = sizedElement(400, 300);
    // One point of P4, the square, at the centre of the frame; P1 to P3
    // have no point, and P2's only one is not finite.
    const data = scatterOf([7, Number.NaN], [7, 1], groups([3, 1], FOUR_NAMES));
    createScatter(element, data);
    const paths = element.querySelectorAll("g.chart-marks > path");
    expect(paths).toHaveLength(1);
    expect(paths[0]?.getAttribute("class")).toBe("chart-points chart-colour-3");
    expect(paths[0]?.getAttribute("d")).toBe("M158,118h8v8h-8Z");
    const expected = pathRound(PATH_DIGITS);
    for (const index of [0, 5]) {
      const [x, y] = pixelOf(six(), index);
      drawSymbolAt(expected, groupSymbol(0), SYMBOL_AREA, x, y);
    }
    const second = sizedElement(400, 300);
    createScatter(second, six());
    expect(second.querySelector("path.chart-colour-0")?.getAttribute("d")).toBe(
      expected.toString(),
    );
  });

  test("values: one path per step used, filled with its colour of viridis, and the ring of the points with no value first", () => {
    const element = sizedElement(400, 300);
    createScatter(
      element,
      scatterOf(SIX_X, SIX_Y, values([0, 1, Number.NaN, 0.5, 1, 0])),
    );
    const paths = [...element.querySelectorAll("g.chart-marks > path")];
    expect(paths.map((path) => path.getAttribute("class"))).toEqual([
      "chart-points chart-points-none",
      "chart-points chart-points-value",
      "chart-points chart-points-value",
      "chart-points chart-points-value",
    ]);
    expect(paths.map((path) => path.getAttribute("fill"))).toEqual([
      null,
      viridisColour(0),
      viridisColour(128),
      viridisColour(255),
    ]);
  });

  test("an update from groups to values and back draws in the same svg, with no path of the other colouring left", () => {
    const element = sizedElement(400, 300);
    const handle = createScatter(element, six());
    const svg = element.querySelector("svg");
    handle.update(scatterOf(SIX_X, SIX_Y, values([1, 2, 3, 4, 5, 6])));
    expect(element.querySelector("svg")).toBe(svg);
    expect(element.querySelectorAll("svg")).toHaveLength(1);
    expect(element.querySelectorAll("[class*='chart-colour-']")).toHaveLength(
      0,
    );
    expect(element.querySelectorAll("path.chart-points-none")).toHaveLength(0);
    expect(element.querySelectorAll("path.chart-points-value")).toHaveLength(6);
    handle.update(six());
    expect(element.querySelector("svg")).toBe(svg);
    expect(element.querySelectorAll("path.chart-points-value")).toHaveLength(0);
    expect(element.querySelectorAll("path[fill]")).toHaveLength(0);
    expect(pathClasses(element)).toHaveLength(5);
  });

  test("no point with finite coordinates: no mark, and the axes of a point at (0, 0)", () => {
    const element = sizedElement(400, 300);
    createScatter(element, scatterOf([Number.NaN], [0], groups([0], ["P1"])));
    expect(element.querySelectorAll("g.chart-marks > path")).toHaveLength(0);
    const ticks = [
      ...element.querySelectorAll("g.chart-axis-x g.tick text"),
    ].map((tick) => tick.textContent);
    expect(ticks).toEqual(["\u22121", "0", "1"]);
  });
});

describe("IP7 D2 the scatter under jsdom, the legend of the exported file", () => {
  test("toSVG holds the legend: its background first, then a row per entry, No population last; the legend on the screen stays empty", () => {
    const element = sizedElement(400, 300);
    const handle = createScatter(element, six());
    const file = fileOf(handle.toSVG());
    const legend = file.querySelector("svg > g.chart-legend");
    expect(legend?.firstElementChild?.getAttribute("class")).toBe(
      "chart-legend-background",
    );
    expect(legendTexts(file)).toEqual([
      "Population",
      "P1 (2)",
      "P2 (1)",
      "P3 (1)",
      "P4 (1)",
      "No population (1)",
    ]);
    const marks = [...(legend?.querySelectorAll("path") ?? [])];
    expect(marks.map((mark) => mark.getAttribute("class"))).toEqual([
      "chart-points chart-colour-0",
      "chart-points chart-colour-1",
      "chart-points chart-colour-2",
      "chart-points chart-colour-3",
      "chart-points chart-points-none",
    ]);
    // The rows start at the top of the frame and end at its right edge.
    const background = legend?.firstElementChild;
    const right = SCATTER_MARGIN.left + FRAME_WIDTH;
    expect(Number(background?.getAttribute("y"))).toBe(SCATTER_MARGIN.top);
    expect(
      Number(background?.getAttribute("x")) +
        Number(background?.getAttribute("width")),
    ).toBe(right);
    expect(Number(background?.getAttribute("height"))).toBe(6 * 16 + 8);
    expect(element.querySelector("g.chart-legend")?.childNodes).toHaveLength(0);
  });

  test("with P2 highlighted, the marks of the other entries have chart-legend-faded, and no text has it", () => {
    const element = sizedElement(400, 300);
    const handle = createScatter(element, six(1));
    const file = fileOf(handle.toSVG());
    const faded = [
      ...file.querySelectorAll("g.chart-legend .chart-legend-faded"),
    ];
    expect(faded.map((mark) => mark.localName)).toEqual([
      "path",
      "path",
      "path",
      "path",
    ]);
    expect(
      file
        .querySelector("g.chart-legend path.chart-colour-1")
        ?.getAttribute("class"),
    ).toBe("chart-points chart-colour-1");
    expect(element.querySelector("g.chart-legend")?.childNodes).toHaveLength(0);
  });

  test("when the frame holds fewer rows than the entries, the last row that fits says how many more there are", () => {
    // An element 150 high: a frame of 94, which holds 5 rows of 16 inside
    // the 4 pixels above and below them.
    const element = sizedElement(400, 150);
    const names = Array.from(
      { length: 20 },
      (_name, index) => `P${String(index + 1)}`,
    );
    const indices = names.map((_name, index) => index);
    const handle = createScatter(
      element,
      scatterOf(indices, indices, groups(indices, names)),
    );
    const file = fileOf(handle.toSVG());
    expect(legendTexts(file)).toEqual([
      "Population",
      "P1 (1)",
      "P2 (1)",
      "P3 (1)",
      "and 17 more",
    ]);
  });

  test("the background is reckoned from the longest row and is no wider than the frame; a name with markup is text", () => {
    const element = sizedElement(400, 300);
    const handle = createScatter(
      element,
      scatterOf([0, 1], [0, 1], groups([0, 1], ["<b>P1</b>", "P2"])),
    );
    const file = fileOf(handle.toSVG());
    const background = file.querySelector("rect.chart-legend-background");
    // "<b>P1</b> (1)", 13 characters at 7.2, with the gap of 6, the mark
    // of 16 and 4 pixels on each side.
    expect(Number(background?.getAttribute("width"))).toBeCloseTo(
      13 * 7.2 + 6 + 16 + 8,
      9,
    );
    expect(legendTexts(file)).toContain("<b>P1</b> (1)");
    expect(file.querySelector("b")).toBeNull();
    const long = sizedElement(400, 300);
    const longHandle = createScatter(
      long,
      scatterOf([0], [0], groups([0], ["x".repeat(80)])),
    );
    const longBackground = fileOf(longHandle.toSVG()).querySelector(
      "rect.chart-legend-background",
    );
    expect(Number(longBackground?.getAttribute("width"))).toBe(FRAME_WIDTH);
    expect(Number(longBackground?.getAttribute("x"))).toBe(SCATTER_MARGIN.left);
  });

  test("values: a bar of 32 bands of viridis, the largest value at its top, and the ring and No value last", () => {
    const element = sizedElement(400, 300);
    const handle = createScatter(
      element,
      scatterOf([0, 1, 2], [0, 1, 2], values([-1.5, Number.NaN, 2019])),
    );
    const file = fileOf(handle.toSVG());
    const bands = [...file.querySelectorAll("g.chart-legend rect[fill]")];
    expect(bands).toHaveLength(32);
    const top = bands.toSorted(
      (a, b) => Number(a.getAttribute("y")) - Number(b.getAttribute("y")),
    );
    expect(top[0]?.getAttribute("fill")).toBe(viridisColour(252));
    expect(top.at(-1)?.getAttribute("fill")).toBe(viridisColour(4));
    expect(legendTexts(file)).toEqual([
      "Height",
      "2019",
      "−1.5",
      "No value (1)",
    ]);
    expect(
      file.querySelector("g.chart-legend path")?.getAttribute("class"),
    ).toBe("chart-points chart-points-none");
  });
});

describe("IP7 D2 the scatter under jsdom, the point under the pointer", () => {
  test("a pointer at a point shows its tooltip and its mark and calls onHover once; away from every point hides them and calls it with null", () => {
    const element = sizedElement(400, 300);
    const onHover = vi.fn();
    const data = scatterOf(SIX_X, SIX_Y, groups(SIX_GROUPS, FOUR_NAMES), [
      "<img src=x onerror=alert(1)>",
      "s1",
      "s2",
      "s3",
      "s4",
      "s5",
    ]);
    createScatter(element, data, { onHover });
    const [x, y] = pixelOf(data, 0);
    moveTo(element, [x, y]);
    moveTo(element, [x + 3, y - 3]);
    expect(onHover.mock.calls).toEqual([[0]]);
    expect(tooltipText(element)).toEqual([
      "<img src=x onerror=alert(1)>",
      "Population: P1",
      "PC1 0, PC2 0",
    ]);
    expect(element.querySelector("img")).toBeNull();
    const marks = element.querySelectorAll(
      "g.chart-annotations > path.chart-hover",
    );
    expect(marks).toHaveLength(1);
    // A ring of 9 pixels around the point, which starts at its right.
    const ring = pathRound(PATH_DIGITS);
    ring.moveTo(x + 9, y);
    ring.arc(x, y, 9, 0, 2 * Math.PI);
    expect(marks[0]?.getAttribute("d")).toBe(ring.toString());
    // The tooltip 7 pixels right of and below the point, in the pixels of
    // the element, past the margins.
    const box = tooltipOf(element);
    expect(Number.parseFloat(box?.style.left ?? "")).toBeCloseTo(
      SCATTER_MARGIN.left + x + 7,
      3,
    );
    expect(Number.parseFloat(box?.style.top ?? "")).toBeCloseTo(
      SCATTER_MARGIN.top + y + 7,
      3,
    );
    moveTo(element, [x + 30, y - 30]);
    expect(onHover.mock.calls).toEqual([[0], [null]]);
    expect(tooltipText(element)).toBeNull();
    expect(element.querySelector("path.chart-hover")).toBeNull();
    moveTo(element, pixelOf(data, 3));
    expect(onHover.mock.calls.at(-1)).toEqual([3]);
    expect(tooltipText(element)?.[1]).toBe("Population: P4");
  });

  test("a leave onto the tooltip keeps it; a leave elsewhere hides it; a finger lifted leaves it", () => {
    const element = sizedElement(400, 300);
    const onHover = vi.fn();
    createScatter(element, six(), { onHover });
    moveTo(element, pixelOf(six(), 1));
    const box = tooltipOf(element);
    leave(element, "mouse", box?.firstChild ?? null);
    expect(tooltipText(element)).not.toBeNull();
    leave(element, "touch", document.body);
    expect(tooltipText(element)).not.toBeNull();
    leave(element, "mouse", document.body);
    expect(tooltipText(element)).toBeNull();
    expect(onHover.mock.calls).toEqual([[1], [null]]);
  });

  test("Escape hides the tooltip and calls onHover with null; it stays hidden near that point, and a point near another shows again", () => {
    const element = sizedElement(400, 300);
    const onHover = vi.fn();
    createScatter(element, six(), { onHover });
    moveTo(element, pixelOf(six(), 2));
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(tooltipText(element)).toBeNull();
    expect(element.querySelector("path.chart-hover")).toBeNull();
    expect(onHover.mock.calls).toEqual([[2], [null]]);
    const [x, y] = pixelOf(six(), 2);
    moveTo(element, [x + 1, y]);
    expect(tooltipText(element)).toBeNull();
    moveTo(element, pixelOf(six(), 3));
    expect(tooltipText(element)).not.toBeNull();
    // Away from every point and back: the point hidden by Escape shows.
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    moveTo(element, [x + 30, y + 30]);
    moveTo(element, [x, y]);
    expect(onHover.mock.calls.at(-1)).toEqual([2]);
    expect(tooltipText(element)).not.toBeNull();
  });

  test("a tap shows the tooltip of the point tapped, and a tap away from every point hides it", () => {
    const element = sizedElement(400, 300);
    createScatter(element, six());
    const tap = ([x, y]: [number, number]): void => {
      overlayOf(element).dispatchEvent(
        new PointerEvent("pointerdown", {
          pointerType: "touch",
          clientX: x,
          clientY: y,
          bubbles: true,
        }),
      );
    };
    tap(pixelOf(six(), 4));
    expect(tooltipText(element)?.[1]).toBe("No population");
    const [x, y] = pixelOf(six(), 4);
    tap([x, y + 40]);
    expect(tooltipText(element)).toBeNull();
  });

  test("an update and a resize hide the tooltip and call onHover with null", () => {
    const element = sizedElement(400, 300);
    const onHover = vi.fn();
    const handle = createScatter(element, six(), { onHover });
    moveTo(element, pixelOf(six(), 0));
    handle.update(six(1));
    expect(tooltipText(element)).toBeNull();
    expect(onHover.mock.calls).toEqual([[0], [null]]);
    moveTo(element, pixelOf(six(), 0));
    FakeObserver.made[0]?.resize(500, 300);
    runFrames();
    expect(tooltipText(element)).toBeNull();
    expect(element.querySelector("path.chart-hover")).toBeNull();
    expect(onHover.mock.calls).toEqual([[0], [null], [0], [null]]);
  });

  test("toSVG while a point is under the pointer has no mark of it and no tooltip", () => {
    const element = sizedElement(400, 300);
    const handle = createScatter(element, six());
    moveTo(element, pixelOf(six(), 0));
    expect(element.querySelector("path.chart-hover")).not.toBeNull();
    const file = handle.toSVG();
    expect(file).not.toContain("chart-hover");
    expect(file).not.toContain("chart-overlay");
    expect(file).not.toContain("chart-tooltip");
  });

  test("destroy after a hover leaves the element with no child, the tooltip gone, and a second destroy does nothing", () => {
    const element = sizedElement(400, 300);
    const onHover = vi.fn();
    const handle = createScatter(element, six(), { onHover });
    moveTo(element, pixelOf(six(), 0));
    expect(tooltipOf(element)).not.toBeNull();
    handle.destroy();
    expect(element.childNodes).toHaveLength(0);
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(onHover.mock.calls).toEqual([[0]]);
    expect(() => {
      handle.destroy();
    }).not.toThrow();
  });
});
