/**
 * The heatmap, docs/specs/charts/heatmap.md, "How it is verified": its
 * numbers, the steps of its colours and the classes of its text, with no
 * DOM, and the SVG it builds under jsdom. jsdom lays nothing out and has
 * no ResizeObserver, so the tests give the size of the element with stubs
 * of clientWidth and clientHeight; with nothing laid out, the overlay is
 * at 0,0 of the page and a position of the pointer is one of the frame.
 * Where the browser puts the names and the tooltip is checked in
 * Playwright, e2e/plots.spec.ts.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  axisName,
  cellStep,
  cellTextClass,
  createHeatmap,
  heatmapMargin,
  heatmapNumber,
  heatmapScale,
  type HeatmapData,
} from "./heatmap.ts";
import { MAX_HEATMAP_NAMES } from "./limits.ts";
import { viridisColour } from "./marks.ts";

/**
 * Hudson's Fst of the three pairs of panel.nei, popcat of panel_pops.csv,
 * as popnei gives them (docs/specs/analyses/popDists.md, node,
 * js-v0.1.0-dev.3, 30 September 2026).
 */
const FST_P0_P2 = 0.10273588423661377;
const FST_P0_P1 = 0.10496244498389443;
const FST_P2_P1 = 0.10962148955018115;
/** Hudson's Fst of p0a and p0b, the halves of p0 of panel_split.csv. */
const FST_P0A_P0B = -0.011276258310056011;

/** A square matrix, row by row, from the values of its upper triangle. */
function matrixOf(size: number, upper: readonly number[]): Float64Array {
  const values = new Float64Array(size * size).fill(Number.NaN);
  let next = 0;
  for (let row = 0; row < size; row++) {
    for (let column = row + 1; column < size; column++) {
      const value = upper[next] ?? Number.NaN;
      next += 1;
      values[row * size + column] = value;
      values[column * size + row] = value;
    }
  }
  return values;
}

function heatmapOf(
  names: readonly string[],
  upper: readonly number[],
  valueName = "Hudson's Fst",
): HeatmapData {
  return {
    title: "Distances between populations",
    description: "Hudson's Fst between the populations",
    xLabel: "",
    yLabel: "",
    names,
    values: matrixOf(names.length, upper),
    valueName,
  };
}

/** The Fst of panel.nei in the order p2, p0, p1. */
function panel(): HeatmapData {
  return heatmapOf(["p2", "p0", "p1"], [FST_P0_P2, FST_P2_P1, FST_P0_P1]);
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
}

function sizedElement(width: number, height: number): HTMLDivElement {
  const element = document.createElement("div");
  document.body.append(element);
  vi.spyOn(element, "clientWidth", "get").mockReturnValue(width);
  vi.spyOn(element, "clientHeight", "get").mockReturnValue(height);
  return element;
}

/**
 * The band of the panel's heatmap in an element of 640 by 640: the frame
 * is 640 less the margins, 22.4 and 118.4 across, so the side of the grid
 * is 499.2 and each of the three bands (499.2 + 1) / 3.
 */
const PANEL_BAND = (640 - 22.4 - 118.4 + 1) / 3;

/** The paths of the cells, by their fill, with the number of cells in each. */
function cellPaths(element: HTMLElement): [string | null, number][] {
  return [...element.querySelectorAll("g.chart-marks > path.chart-cells")].map(
    (path) => [
      path.getAttribute("fill"),
      (path.getAttribute("d") ?? "").split("M").length - 1,
    ],
  );
}

/** The corners of the cells of a path, "x,y", as its `d` starts each. */
function cellCorners(path: Element | null): string[] {
  return [...(path?.getAttribute("d") ?? "").matchAll(/M([^h]+)h/g)].map(
    (match) => match[1] ?? "",
  );
}

/** The texts of the cells, with their class and where they are. */
function cellTexts(
  element: HTMLElement,
): { text: string | null; className: string | null; x: number; y: number }[] {
  return [...element.querySelectorAll("text.chart-cell-text")].map((text) => ({
    text: text.textContent,
    className: text.getAttribute("class"),
    x: Number(text.getAttribute("x")),
    y: Number(text.getAttribute("y")),
  }));
}

/** The names of the axis of `selector`, in order. */
function axisNames(element: HTMLElement, selector: string): (string | null)[] {
  return [...element.querySelectorAll(`${selector} g.tick text`)].map(
    (text) => text.textContent,
  );
}

/** The texts of the legend, in order. */
function legendTexts(element: HTMLElement): (string | null)[] {
  return [...element.querySelectorAll("g.chart-legend text")].map(
    (text) => text.textContent,
  );
}

function overlayOf(element: HTMLElement): SVGRectElement {
  const overlay = element.querySelector<SVGRectElement>("rect.chart-overlay");
  if (overlay === null) throw new Error("no overlay");
  return overlay;
}

/** Moves a mouse over the overlay to (x, y) of the frame. */
function moveTo(element: HTMLElement, x: number, y: number): void {
  overlayOf(element).dispatchEvent(
    new PointerEvent("pointermove", {
      pointerType: "mouse",
      clientX: x,
      clientY: y,
      bubbles: true,
    }),
  );
}

/** The middle of the cell of row `row` and column `column` of the panel. */
function middleOf(row: number, column: number): [number, number] {
  return [(column + 0.5) * PANEL_BAND - 0.5, (row + 0.5) * PANEL_BAND - 0.5];
}

/** The lines of the tooltip while it is shown; null while it is hidden. */
function tooltipText(element: HTMLElement): (string | null)[] | null {
  const box = element.querySelector<HTMLDivElement>("div.chart-tooltip");
  if (box?.hidden !== false) return null;
  return [...box.children].map((line) => line.textContent);
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

describe("PA4 D2 the heatmap without a DOM: its numbers, steps and classes", () => {
  test("heatmapNumber writes four decimals with the minus sign U+2212, and a value that rounds to 0 with no sign", () => {
    expect(heatmapNumber(0.10273588423661377)).toBe("0.1027");
    expect(heatmapNumber(-0.011276258310056011)).toBe("−0.0113");
    expect(heatmapNumber(-0.00001)).toBe("0.0000");
    expect(heatmapNumber(0)).toBe("0.0000");
  });

  test("the Fst of panel.nei are at the steps 239, 245 and 255; a negative value and a matrix with no value above 0 at step 0", () => {
    expect(cellStep(FST_P0_P2, FST_P2_P1)).toBe(239);
    expect(cellStep(FST_P0_P1, FST_P2_P1)).toBe(245);
    expect(cellStep(FST_P2_P1, FST_P2_P1)).toBe(255);
    expect(cellStep(FST_P0A_P0B, FST_P2_P1)).toBe(0);
    expect(cellStep(0, null)).toBe(0);
    expect(cellStep(-0.5, null)).toBe(0);
  });

  test("the text of a cell is black from step 111 and white up to step 110", () => {
    expect(cellTextClass(111)).toBe("chart-cell-text-dark");
    expect(cellTextClass(255)).toBe("chart-cell-text-dark");
    expect(cellTextClass(110)).toBe("chart-cell-text-light");
    expect(cellTextClass(0)).toBe("chart-cell-text-light");
  });

  test("a name is written whole up to 20 characters and cut after 19 with an ellipsis above them", () => {
    expect(axisName("abcdefghijklmnopqrst")).toBe("abcdefghijklmnopqrst");
    expect(axisName("abcdefghijklmnopqrstu")).toBe("abcdefghijklmnopqrs…");
    expect(axisName("p0")).toBe("p0");
  });

  test("the margins of the panel, of names of 2 characters, at 7.2 pixels a character: 22.4 left, 26.2 below, 24 above and 118.4 right", () => {
    const margin = heatmapMargin(panel());
    expect(margin.left).toBeCloseTo(22.4, 9);
    expect(margin.bottom).toBeCloseTo(8 + 0.71 * 14.4 + 8, 9);
    expect(margin.top).toBe(24);
    expect(margin.right).toBeCloseTo(118.4, 9);
    // A name of 30 characters is counted as the 20 it is written with.
    const long = heatmapMargin(heatmapOf(["a".repeat(30), "b"], [0.1], "Fst"));
    expect(long.left).toBeCloseTo(8 + 20 * 7.2, 9);
  });
});

describe("PA4 D2 the heatmap under jsdom, its cells, values and names", () => {
  test("the Fst of panel.nei in 640 by 640: three paths of the steps 239, 245 and 255 in their colours, two cells each, and the six values in black", () => {
    const element = sizedElement(640, 640);
    createHeatmap(element, panel());
    expect(element.querySelector("svg")?.getAttribute("class")).toBe(
      "chart chart-heatmap",
    );
    expect(cellPaths(element)).toEqual([
      [viridisColour(239), 2],
      [viridisColour(245), 2],
      [viridisColour(255), 2],
    ]);
    const texts = cellTexts(element);
    expect(texts.map((text) => text.text).toSorted()).toEqual([
      "0.1027",
      "0.1027",
      "0.1050",
      "0.1050",
      "0.1096",
      "0.1096",
    ]);
    for (const text of texts) {
      expect(text.className).toBe("chart-cell-text chart-cell-text-dark");
    }
    // "0.1027" in the cells of p2 and p0, rows and columns 0 and 1.
    const width = PANEL_BAND - 1;
    const p2p0 = texts.filter((text) => text.text === "0.1027");
    expect(p2p0.map((text) => [text.x, text.y])).toEqual([
      [PANEL_BAND + width / 2, width / 2],
      [width / 2, PANEL_BAND + width / 2],
    ]);
    expect(element.querySelector("path.chart-cell-none")).toBeNull();
  });

  test("the diagonal has no cell: no path starts a cell at the corner of p2 and p2, p0 and p0, or p1 and p1", () => {
    const element = sizedElement(640, 640);
    createHeatmap(element, panel());
    const corners = [
      ...element.querySelectorAll("g.chart-marks > path.chart-cells"),
    ].flatMap((path) => cellCorners(path));
    expect(corners).toHaveLength(6);
    const at = (value: number): string => String(Math.round(value * 10) / 10);
    for (let index = 0; index < 3; index++) {
      const corner = `${at(index * PANEL_BAND)},${at(index * PANEL_BAND)}`;
      expect(corners).not.toContain(corner);
    }
    expect(corners).toContain(`${at(PANEL_BAND)},0`);
  });

  test("the names on the vertical axis read p2, p0, p1 from the top, those under the columns slanted at −45°, and no label of the axes is written", () => {
    const element = sizedElement(640, 640);
    createHeatmap(element, panel());
    expect(axisNames(element, "g.chart-axis-y")).toEqual(["p2", "p0", "p1"]);
    expect(axisNames(element, "g.chart-axis-x")).toEqual(["p2", "p0", "p1"]);
    const tops = [...element.querySelectorAll("g.chart-axis-y g.tick")].map(
      (tick) => tick.getAttribute("transform"),
    );
    const middle = (index: number): number =>
      index * PANEL_BAND + (PANEL_BAND - 1) / 2;
    expect(tops).toEqual(
      [0, 1, 2].map((i) => `translate(0,${String(middle(i))})`),
    );
    for (const text of element.querySelectorAll("g.chart-axis-x g.tick text")) {
      expect(text.getAttribute("transform")).toBe("rotate(-45 0 8)");
      expect(text.getAttribute("text-anchor")).toBe("end");
    }
    expect(element.querySelector("text.chart-axis-label")).toBeNull();
  });

  test("a matrix whose values are all 0 or below: one path, of step 0, its values in white, and a bar of one band", () => {
    const element = sizedElement(640, 640);
    createHeatmap(element, heatmapOf(["a", "b", "c"], [0, -0.01, 0]));
    expect(cellPaths(element)).toEqual([[viridisColour(0), 6]]);
    for (const text of cellTexts(element)) {
      expect(text.className).toBe("chart-cell-text chart-cell-text-light");
    }
    const bands = element.querySelectorAll("rect.chart-legend-band");
    expect(bands).toHaveLength(1);
    expect(bands[0]?.getAttribute("fill")).toBe(viridisColour(0));
    expect(legendTexts(element)).toEqual(["Hudson's Fst", "0.0000"]);
  });

  test("the legend of the panel: the name of the value, 32 bands from dark purple at the bottom to yellow at the top, 240 pixels high, and the largest value and 0 at its ends", () => {
    const element = sizedElement(640, 640);
    createHeatmap(element, panel());
    expect(legendTexts(element)).toEqual(["Hudson's Fst", "0.1096", "0.0000"]);
    const bands = [...element.querySelectorAll("rect.chart-legend-band")];
    expect(bands).toHaveLength(32);
    const lowest = bands.reduce((a, b) =>
      Number(a.getAttribute("y")) > Number(b.getAttribute("y")) ? a : b,
    );
    const highest = bands.reduce((a, b) =>
      Number(a.getAttribute("y")) < Number(b.getAttribute("y")) ? a : b,
    );
    expect(lowest.getAttribute("fill")).toBe(viridisColour(4));
    expect(highest.getAttribute("fill")).toBe(viridisColour(252));
    expect(Number(highest.getAttribute("y"))).toBe(24);
    expect(
      Number(lowest.getAttribute("y")) + Number(lowest.getAttribute("height")),
    ).toBeCloseTo(24 + 240, 9);
    // Right of the grid, 16 pixels after it.
    expect(Number(highest.getAttribute("x"))).toBeCloseTo(22.4 + 499.2 + 16, 9);
  });

  test("a pair with no value: the path chart-cell-none with its two cells, each crossed from corner to corner, and no value written in them", () => {
    const element = sizedElement(640, 640);
    createHeatmap(
      element,
      heatmapOf(["p2", "p0", "p1"], [FST_P0_P2, Number.NaN, FST_P0_P1]),
    );
    const none = element.querySelector("path.chart-cell-none");
    const d = none?.getAttribute("d") ?? "";
    // Each cell a rectangle and a line: two moves each.
    expect(d.split("M").length - 1).toBe(4);
    expect(d.split("L").length - 1).toBe(2);
    expect(cellTexts(element)).toHaveLength(4);
    // After the paths of the cells, under the values.
    const marks = [...(element.querySelector("g.chart-marks")?.children ?? [])];
    expect(
      marks.map((mark) => mark.getAttribute("class")?.split(" ")[0]),
    ).toEqual([
      "chart-cells",
      "chart-cells",
      "chart-cell-none",
      "chart-cell-text",
      "chart-cell-text",
      "chart-cell-text",
      "chart-cell-text",
    ]);
  });

  test('every value NaN: every cell crossed, no bar, and the legend the name of the value and "no value"', () => {
    const element = sizedElement(640, 640);
    createHeatmap(
      element,
      heatmapOf(
        ["a", "b", "c"],
        [Number.NaN, Number.NaN, Number.NaN],
        "Jost's D",
      ),
    );
    expect(cellPaths(element)).toEqual([]);
    const d = element.querySelector("path.chart-cell-none")?.getAttribute("d");
    expect((d ?? "").split("L").length - 1).toBe(6);
    expect(element.querySelectorAll("rect.chart-legend-band")).toHaveLength(0);
    expect(legendTexts(element)).toEqual(["Jost's D", "no value"]);
  });

  test('a negative value is of step 0 and writes "−0.0113" in white', () => {
    const element = sizedElement(640, 640);
    createHeatmap(
      element,
      heatmapOf(["p0a", "p0b", "p1"], [FST_P0A_P0B, 0.1028, 0.102]),
    );
    const negative = cellTexts(element).filter(
      (text) => text.text === "−0.0113",
    );
    expect(negative).toHaveLength(2);
    for (const text of negative) {
      expect(text.className).toBe("chart-cell-text chart-cell-text-light");
    }
    const first = cellPaths(element)[0];
    expect(first).toEqual([viridisColour(0), 2]);
  });

  test("a band of 55 pixels writes no value, and one of 56 writes them", () => {
    // Two names of one character and the value name "Fst": the margins
    // are 15.2 left, 24 above and 8 + 0.71 × 7.2 + 8 below, so a height
    // of 109 or 111 pixels for the frame gives a band of 55 or 56.
    const data = heatmapOf(["a", "b"], [0.1], "Fst");
    const vertical = 24 + 8 + 0.71 * 7.2 + 8;
    const narrow = sizedElement(400, vertical + 109);
    createHeatmap(narrow, data);
    expect(heatmapScale(data.names, 400, 109).step()).toBeCloseTo(55, 9);
    expect(cellPaths(narrow)).toEqual([[viridisColour(255), 2]]);
    expect(cellTexts(narrow)).toEqual([]);
    const wide = sizedElement(400, vertical + 111);
    createHeatmap(wide, data);
    expect(cellTexts(wide).map((text) => text.text)).toEqual([
      "0.1000",
      "0.1000",
    ]);
  });

  test("a band below 12 pixels writes no name on either axis; at 12 the names are written", () => {
    const names = Array.from({ length: 10 }, (_v, i) => `n${String(i)}`);
    const data = heatmapOf(
      names,
      Array.from({ length: 45 }, () => 0.1),
    );
    const margin = heatmapMargin(data);
    const vertical = margin.top + margin.bottom;
    // (side + 1) / 10: a side of 109 gives 11, one of 119 gives 12.
    const narrow = sizedElement(800, vertical + 109);
    createHeatmap(narrow, data);
    expect(axisNames(narrow, "g.chart-axis-x")).toEqual([]);
    expect(axisNames(narrow, "g.chart-axis-y")).toEqual([]);
    expect(cellPaths(narrow)).toEqual([[viridisColour(255), 90]]);
    const wide = sizedElement(800, vertical + 119);
    createHeatmap(wide, data);
    expect(axisNames(wide, "g.chart-axis-y")).toEqual(names);
  });

  test("a name with markup is written as text on the axes and in the tooltip, and no b element is made", () => {
    const element = sizedElement(640, 640);
    createHeatmap(
      element,
      heatmapOf(["<b>P1</b>", "p0", "p2"], [0.1, 0.2, 0.3]),
    );
    expect(axisNames(element, "g.chart-axis-y")).toEqual([
      "<b>P1</b>",
      "p0",
      "p2",
    ]);
    const [x, y] = middleOf(0, 2);
    moveTo(element, x, y);
    expect(tooltipText(element)).toEqual([
      "<b>P1</b> and p2",
      "Hudson's Fst 0.2000",
    ]);
    expect(element.querySelector("b")).toBeNull();
  });

  test("an update to the other measure joins the paths by their steps and the texts by their row and column in the same SVG", () => {
    const element = sizedElement(640, 640);
    const handle = createHeatmap(element, panel());
    const svg = element.querySelector("svg");
    const top = element.querySelector(
      'path.chart-cells[fill="' + viridisColour(255) + '"]',
    );
    const textOf = (value: string): Element | undefined =>
      [...element.querySelectorAll("text.chart-cell-text")].find(
        (text) => text.textContent === value,
      );
    const p2p0 = textOf("0.1027");
    handle.update(
      heatmapOf(
        ["p2", "p0", "p1"],
        [0.06129813142463423, 0.06567052128821259, 0.06354346296076403],
        "Jost's D",
      ),
    );
    expect(element.querySelector("svg")).toBe(svg);
    expect(
      element.querySelector(
        'path.chart-cells[fill="' + viridisColour(255) + '"]',
      ),
    ).toBe(top);
    expect(textOf("0.0613")).toBe(p2p0);
    expect(legendTexts(element)).toEqual(["Jost's D", "0.0657", "0.0000"]);
  });
});

describe("PA4 D2 the heatmap under jsdom, its refusals", () => {
  test("two names alike throw", () => {
    const element = sizedElement(640, 640);
    expect(() =>
      createHeatmap(element, heatmapOf(["p0", "p1", "p0"], [0.1, 0.2, 0.3])),
    ).toThrow("popnei_web defect");
    expect(element.children).toHaveLength(0);
  });

  test("a matrix that is not symmetric throws, and one with NaN in both cells of a pair does not", () => {
    const element = sizedElement(640, 640);
    const data = panel();
    const values = Float64Array.from(data.values);
    values[1] = 0.2;
    expect(() => createHeatmap(element, { ...data, values })).toThrow(
      "popnei_web defect",
    );
    const handle = createHeatmap(element, heatmapOf(["a", "b"], [Number.NaN]));
    // NaN above the diagonal and 0.1 below it.
    const wrong = Float64Array.from([0, Number.NaN, 0.1, 0]);
    expect(() => {
      handle.update({ ...heatmapOf(["a", "b"], [0.1]), values: wrong });
    }).toThrow("popnei_web defect");
  });

  test("one name throws, and so do 201; 200 are drawn", () => {
    const element = sizedElement(640, 640);
    expect(() => createHeatmap(element, heatmapOf(["p0"], []))).toThrow(
      "popnei_web defect",
    );
    const many = (count: number): HeatmapData =>
      heatmapOf(
        Array.from({ length: count }, (_v, i) => `n${String(i)}`),
        [],
      );
    expect(() => createHeatmap(element, many(MAX_HEATMAP_NAMES + 1))).toThrow(
      "popnei_web defect",
    );
    expect(() => createHeatmap(element, many(MAX_HEATMAP_NAMES))).not.toThrow();
  });

  test("values that are not the square of the number of names throw", () => {
    const element = sizedElement(640, 640);
    expect(() =>
      createHeatmap(element, {
        ...panel(),
        values: new Float64Array(8),
      }),
    ).toThrow("popnei_web defect");
  });
});

describe("PA4 D2 the heatmap under jsdom, the cell under the pointer", () => {
  test('the middle of the cell of p2 and p1 shows the tooltip "p2 and p1" and "Hudson\'s Fst 0.1096" and outlines the cell; the diagonal and a gap show none', () => {
    const element = sizedElement(640, 640);
    createHeatmap(element, panel());
    const [x, y] = middleOf(0, 2);
    moveTo(element, x, y);
    expect(tooltipText(element)).toEqual(["p2 and p1", "Hudson's Fst 0.1096"]);
    const hover = element.querySelector("g.chart-annotations path.chart-hover");
    expect(cellCorners(hover)).toEqual([
      `${String(Math.round(2 * PANEL_BAND * 10) / 10)},0`,
    ]);
    // The diagonal, the cell of p0 and p0.
    const [dx, dy] = middleOf(1, 1);
    moveTo(element, dx, dy);
    expect(tooltipText(element)).toBeNull();
    expect(element.querySelector("path.chart-hover")).toBeNull();
    // The cell of p1 and p2, then the gap between its column and the next.
    const [bx, by] = middleOf(2, 0);
    moveTo(element, bx, by);
    expect(tooltipText(element)).toEqual(["p1 and p2", "Hudson's Fst 0.1096"]);
    moveTo(element, PANEL_BAND - 0.5, by);
    expect(tooltipText(element)).toBeNull();
    // The room under the grid.
    moveTo(element, bx, 3 * PANEL_BAND + 20);
    expect(tooltipText(element)).toBeNull();
  });

  test('a cell with no value shows "Hudson\'s Fst: no value"', () => {
    const element = sizedElement(640, 640);
    createHeatmap(
      element,
      heatmapOf(["p2", "p0", "p1"], [FST_P0_P2, Number.NaN, FST_P0_P1]),
    );
    const [x, y] = middleOf(0, 2);
    moveTo(element, x, y);
    expect(tooltipText(element)).toEqual([
      "p2 and p1",
      "Hudson's Fst: no value",
    ]);
  });

  test("Escape hides the tooltip and it stays hidden on that cell; another cell shows its own; an update hides it", () => {
    const element = sizedElement(640, 640);
    const handle = createHeatmap(element, panel());
    const [x, y] = middleOf(0, 1);
    moveTo(element, x, y);
    expect(tooltipText(element)).toEqual(["p2 and p0", "Hudson's Fst 0.1027"]);
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(tooltipText(element)).toBeNull();
    expect(element.querySelector("path.chart-hover")).toBeNull();
    moveTo(element, x + 2, y);
    expect(tooltipText(element)).toBeNull();
    const [ox, oy] = middleOf(1, 2);
    moveTo(element, ox, oy);
    expect(tooltipText(element)).toEqual(["p0 and p1", "Hudson's Fst 0.1050"]);
    handle.update(panel());
    expect(tooltipText(element)).toBeNull();
    expect(element.querySelector("path.chart-hover")).toBeNull();
  });

  test("destroy removes the tooltip with the SVG, and a second destroy throws nothing", () => {
    const element = sizedElement(640, 640);
    const handle = createHeatmap(element, panel());
    const [x, y] = middleOf(0, 2);
    moveTo(element, x, y);
    expect(element.querySelector("div.chart-tooltip")).not.toBeNull();
    handle.destroy();
    expect(element.children).toHaveLength(0);
    expect(() => {
      handle.destroy();
    }).not.toThrow();
  });
});
