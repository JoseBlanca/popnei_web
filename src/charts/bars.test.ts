/**
 * The bar plot, docs/specs/charts/bars.md, "How it is verified": the SVG
 * it builds under jsdom and its refusals. jsdom lays nothing out and has
 * no ResizeObserver, so the tests give the size of the element with stubs
 * of clientWidth and clientHeight, 400 by 136, which the base reads when
 * the plot is made: with the margins of 8 at the top, 44 at the bottom,
 * 20 at the right and, at the left, 30 for names of two characters, a
 * frame of 350 by 84, three rows of 28 pixels.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { barsHeight, createBars } from "./bars.ts";
import type { Bar, BarsData } from "./bars.ts";
import { MAX_BARS } from "./limits.ts";

/** The frame of an element of 400 by 136 with names of two characters. */
const INNER_WIDTH = 400 - 30 - 20;

function barsOf(bars: readonly Bar[]): BarsData {
  return {
    title: "Observed heterozygosity",
    description: "3 bars, one per population.",
    xLabel: "Observed heterozygosity",
    yLabel: "",
    bars,
    noValue: "no value",
  };
}

/** p0, p2 and p1, of groups 0, 2 and 1, at 0.3, 0.2 and no value. */
const THREE: readonly Bar[] = [
  { name: "p0", group: 0, value: 0.3 },
  { name: "p2", group: 2, value: 0.2 },
  { name: "p1", group: 1, value: Number.NaN },
];

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

function sizedElement(width = 400, height = 136): HTMLDivElement {
  const element = document.createElement("div");
  document.body.append(element);
  vi.spyOn(element, "clientWidth", "get").mockReturnValue(width);
  vi.spyOn(element, "clientHeight", "get").mockReturnValue(height);
  return element;
}

/** The left margin of the frame, from the transform of its group. */
function leftMargin(element: HTMLElement): number {
  const transform =
    element.querySelector("g.chart-frame")?.getAttribute("transform") ?? "";
  const match = /translate\(([-\d.]+),/u.exec(transform);
  return Number(match?.[1]);
}

/** The texts of the ticks of `axis`, in order. */
function ticks(element: HTMLElement, axis: "x" | "y"): (string | null)[] {
  return [...element.querySelectorAll(`g.chart-axis-${axis} g.tick text`)].map(
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

describe("PT7 R1.1 the bar plot under jsdom, its SVG", () => {
  test("the skeleton has the classes chart chart-bars, its title and description, no overlay and no legend", () => {
    const element = sizedElement();
    createBars(element, barsOf(THREE));
    const svg = element.querySelector("svg");
    expect(svg?.getAttribute("class")).toBe("chart chart-bars");
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.querySelector("title")?.textContent).toBe(
      "Observed heterozygosity",
    );
    expect(svg?.querySelector("desc")?.textContent).toBe(
      "3 bars, one per population.",
    );
    expect(element.querySelector(".chart-overlay")).toBeNull();
    expect(element.querySelector("g.chart-legend")?.childElementCount).toBe(0);
    // The axis of the names has no label.
    expect(element.querySelector(".chart-axis-label-y")).toBeNull();
    expect(element.querySelector(".chart-axis-label-x")?.textContent).toBe(
      "Observed heterozygosity",
    );
  });

  test("a bar per value in the colour of its group, outlined for orange and not for green, from 0 and as wide as its value, a row of 28 pixels each; no value is the words in its row, not a bar", () => {
    const element = sizedElement();
    createBars(element, barsOf(THREE));
    const bars = [...element.querySelectorAll("g.chart-marks > rect")];
    expect(bars.map((bar) => bar.getAttribute("class"))).toEqual([
      "chart-bars-bar chart-colour-0 chart-bars-outlined",
      "chart-bars-bar chart-colour-2",
    ]);
    expect(bars.map((bar) => Number(bar.getAttribute("x")))).toEqual([0, 0]);
    expect(Number(bars[0]?.getAttribute("width"))).toBeCloseTo(INNER_WIDTH);
    expect(Number(bars[1]?.getAttribute("width"))).toBeCloseTo(
      (INNER_WIDTH * 2) / 3,
    );
    expect(bars.map((bar) => Number(bar.getAttribute("height")))).toEqual([
      21, 21,
    ]);
    // The rows of p0 and p2, 28 pixels apart, the bar centred in each.
    expect(bars.map((bar) => Number(bar.getAttribute("y")))).toEqual([
      3.5, 31.5,
    ]);
    const none = [...element.querySelectorAll("text.chart-bars-none")];
    expect(none.map((text) => text.textContent)).toEqual(["no value"]);
    expect(Number(none[0]?.getAttribute("x"))).toBe(4);
    // The middle of the third row.
    expect(Number(none[0]?.getAttribute("y"))).toBe(70);
  });

  test("the names down the axis in their order, and the axis of the values from 0 to the largest made round, 0.3; with every value missing, from 0 to 1", () => {
    const element = sizedElement();
    const handle = createBars(element, barsOf(THREE));
    expect(ticks(element, "y")).toEqual(["p0", "p2", "p1"]);
    const values = ticks(element, "x");
    expect(values[0]).toBe("0.0");
    expect(values.at(-1)).toBe("0.3");

    handle.update(barsOf(THREE.map((bar) => ({ ...bar, value: Number.NaN }))));
    expect(element.querySelectorAll("g.chart-marks > rect")).toHaveLength(0);
    expect(element.querySelectorAll("text.chart-bars-none")).toHaveLength(3);
    expect(ticks(element, "x").at(-1)).toBe("1.0");
  });

  test("the left margin holds the names at 9 pixels a character: 30 for two; a name of 30 characters cut to 15 and an ellipsis at 400 pixels, and to 19 at 1,000", () => {
    const element = sizedElement();
    createBars(element, barsOf(THREE));
    expect(leftMargin(element)).toBe(30);

    const long = "abcdefghijklmnopqrstuvwxyz0123";
    const narrow = sizedElement();
    createBars(narrow, barsOf([{ name: long, group: 0, value: 0.3 }]));
    expect(ticks(narrow, "y")).toEqual(["abcdefghijklmno…"]);
    expect(leftMargin(narrow)).toBe(4 + 16 * 9 + 8);

    const wide = sizedElement(1000, 136);
    createBars(wide, barsOf([{ name: long, group: 0, value: 0.3 }]));
    expect(ticks(wide, "y")).toEqual(["abcdefghijklmnopqrs…"]);
    expect(leftMargin(wide)).toBe(4 + 20 * 9 + 8);
  });

  test("a name with markup is written as text", () => {
    const element = sizedElement();
    createBars(element, barsOf([{ name: "<b>p1</b>", group: 0, value: 0.1 }]));
    expect(ticks(element, "y")).toEqual(["<b>p1</b>"]);
    expect(element.querySelector("g.chart-axis-y b")).toBeNull();
  });

  test("barsHeight gives 8 above, 28 a row and 44 below: 136 for 3 names, 80 for 1", () => {
    expect(barsHeight(3)).toBe(136);
    expect(barsHeight(1)).toBe(80);
  });
});

describe("PT7 R1.1 the bar plot refuses what its contract does not draw", () => {
  test.each([
    [
      "more than MAX_BARS bars",
      Array.from({ length: MAX_BARS + 1 }, (_each, i): Bar => ({
        name: `p${String(i)}`,
        group: i,
        value: 0.1,
      })),
    ],
    [
      "two bars of one name",
      [
        { name: "p0", group: 0, value: 0.1 },
        { name: "p0", group: 1, value: 0.2 },
      ],
    ],
    ["a group of 1.5", [{ name: "p0", group: 1.5, value: 0.1 }]],
    ["a value below 0", [{ name: "p0", group: 0, value: -0.1 }]],
    ["an infinite value", [{ name: "p0", group: 0, value: Infinity }]],
  ])("%s", (_case, bars) => {
    expect(() => createBars(sizedElement(), barsOf(bars))).toThrow(
      /popnei_web defect/u,
    );
  });
});
