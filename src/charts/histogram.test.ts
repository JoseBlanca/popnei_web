/**
 * The histogram, docs/specs/charts/histogram.md, "How it is verified":
 * its rows and its scales on the bins of e2e/fixtures/panel.nei, written
 * as literals, its defects, and the SVG it draws under jsdom. jsdom lays
 * nothing out and has no ResizeObserver, so the tests give the size of the
 * element with stubs of clientWidth and clientHeight, which the base reads
 * when the plot is made, and an observer that does nothing.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  createHistogram,
  histogramRows,
  histogramScales,
  type BinState,
  type HistogramData,
  type HistogramThreshold,
} from "./histogram.ts";
import { wholeNumberTicks } from "./plot2d.ts";

/**
 * The edges of the default 40 bins over [0, 1] as popnei gives them,
 * `histBinEdges` of calcPerVarDistribs with the release js-v0.1.0-dev.2,
 * on 26 September 2026.
 */
const EDGES_40 = Float64Array.from([
  0, 0.025, 0.05, 0.07500000000000001, 0.1, 0.125, 0.15000000000000002,
  0.17500000000000002, 0.2, 0.225, 0.25, 0.275, 0.30000000000000004, 0.325,
  0.35000000000000003, 0.375, 0.4, 0.42500000000000004, 0.45,
  0.47500000000000003, 0.5, 0.525, 0.55, 0.5750000000000001, 0.6000000000000001,
  0.625, 0.65, 0.675, 0.7000000000000001, 0.7250000000000001, 0.75, 0.775, 0.8,
  0.8250000000000001, 0.8500000000000001, 0.875, 0.9, 0.925, 0.9500000000000001,
  0.9750000000000001, 1,
]);

/** The counts of the MAF of panel.nei, every variant and individual. */
const MAF_COUNTS = Uint32Array.from([
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 69, 75, 62, 71,
  60, 74, 72, 83, 70, 68, 64, 83, 64, 63, 67, 57, 48, 25, 22, 3,
]);

/** The counts of the observed heterozygosity of panel.nei. */
const OBS_HET_COUNTS = Uint32Array.from([
  0, 4, 9, 18, 20, 25, 30, 34, 50, 61, 53, 69, 62, 84, 89, 101, 113, 102, 108,
  58, 62, 27, 14, 5, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
]);

function maximum(value: number): HistogramThreshold {
  return {
    value,
    legend: {
      label: `Maximum ${String(value)}`,
      keptLabel: "Kept by this filter",
      removedLabel: "Removed by this filter",
    },
  };
}

function histogramOf(
  counts: Uint32Array,
  threshold: number | null,
  edges: Readonly<Float64Array> = EDGES_40,
): HistogramData {
  return {
    title: "Major allele frequency",
    description: "The major allele frequency of 1,200 variants.",
    xLabel: "Major allele frequency",
    yLabel: "Variants",
    edges,
    counts,
    threshold: threshold === null ? null : maximum(threshold),
  };
}

/** The indices of the bins in each state, and the sum of their counts. */
function binsIn(
  data: HistogramData,
  state: BinState,
): { readonly bins: number[]; readonly count: number } {
  const bins: number[] = [];
  let count = 0;
  for (const [index, row] of histogramRows(data).entries()) {
    if (row.state !== state) continue;
    bins.push(index);
    count += row.count;
  }
  return { bins, count };
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_each, index) => from + index);
}

describe("VS4 D2 the histogram, its rows on the bins of panel.nei", () => {
  test("the edges are popnei's, a step above the round number at 0.075, 0.6 and 0.95", () => {
    expect(EDGES_40[3]).toBe(0.07500000000000001);
    expect(EDGES_40[24]).toBe(0.6000000000000001);
    expect(EDGES_40[38]).toBe(0.9500000000000001);
    expect(EDGES_40[20]).toBe(0.5);
  });

  test("the MAF at 0.95 keeps bins 0 to 37, 1,175 variants as popnei's filter, and removes 38 and 39", () => {
    const data = histogramOf(MAF_COUNTS, 0.95);
    expect(binsIn(data, "kept")).toEqual({ bins: range(0, 37), count: 1175 });
    expect(binsIn(data, "partlyKept")).toEqual({ bins: [], count: 0 });
    expect(binsIn(data, "removed")).toEqual({ bins: [38, 39], count: 25 });
  });

  test("the observed heterozygosity at 0.6 keeps bins 0 to 23, 1,198 variants as popnei's filter, and removes 24 to 39", () => {
    const data = histogramOf(OBS_HET_COUNTS, 0.6);
    expect(binsIn(data, "kept")).toEqual({ bins: range(0, 23), count: 1198 });
    expect(binsIn(data, "partlyKept")).toEqual({ bins: [], count: 0 });
    expect(binsIn(data, "removed")).toEqual({ bins: range(24, 39), count: 2 });
  });

  test("the observed heterozygosity at 0.5 keeps bins 0 to 19, splits bin 20 and removes 21 to 39, around popnei's 1,098", () => {
    const data = histogramOf(OBS_HET_COUNTS, 0.5);
    const kept = binsIn(data, "kept");
    const partly = binsIn(data, "partlyKept");
    expect(kept).toEqual({ bins: range(0, 19), count: 1090 });
    expect(partly).toEqual({ bins: [20], count: 62 });
    expect(binsIn(data, "removed")).toEqual({ bins: range(21, 39), count: 48 });
    expect(kept.count).toBeLessThan(1098);
    expect(kept.count + partly.count).toBeGreaterThan(1098);
  });

  test("the last bin holds its upper edge: kept at a threshold equal to it, partly kept just below it", () => {
    const rowsAt = (threshold: number): ReturnType<typeof histogramRows> =>
      histogramRows(histogramOf(MAF_COUNTS, threshold));
    const last = rowsAt(1).at(-1);
    expect(last).toEqual({
      from: 0.9750000000000001,
      to: 1,
      toIncluded: true,
      count: 3,
      state: "kept",
    });
    // The largest double below 1: no value lies between it and 1, but the
    // last bin holds 1 itself.
    expect(rowsAt(0.9999999999999999).at(-1)?.state).toBe("partlyKept");
    expect(
      rowsAt(1)
        .slice(0, -1)
        .every((row) => !row.toIncluded),
    ).toBe(true);
  });

  test("a bin whose upper edge is the double just above a threshold is kept, at 0 and below it too", () => {
    const statesOf = (
      edges: number[],
      threshold: number,
    ): (BinState | null)[] =>
      histogramRows(
        histogramOf(
          Uint32Array.from([1, 1]),
          threshold,
          Float64Array.from(edges),
        ),
      ).map((row) => row.state);
    // -0.49999999999999994 is the double just above -0.5, and
    // Number.MIN_VALUE the one just above 0.
    expect(statesOf([-1, -0.49999999999999994, 0], -0.5)).toEqual([
      "kept",
      "removed",
    ]);
    expect(statesOf([-1, Number.MIN_VALUE, 1], 0)).toEqual(["kept", "removed"]);
    expect(statesOf([-1, -0.4999999999999999, 0], -0.5)).toEqual([
      "partlyKept",
      "removed",
    ]);
  });

  test("with no threshold every state is null, and the edges are as given", () => {
    const rows = histogramRows(histogramOf(MAF_COUNTS, null));
    expect(rows).toHaveLength(40);
    expect(rows.every((row) => row.state === null)).toBe(true);
    expect(rows[3]?.from).toBe(0.07500000000000001);
    expect(rows[37]?.to).toBe(0.9500000000000001);
    expect(rows.map((row) => row.count)).toEqual([...MAF_COUNTS]);
  });
});

/** Each defect is refused by histogramRows, by createHistogram before it
    adds anything to the element, and by update, which leaves the plot as
    it was. */
function expectRefused(data: HistogramData, message: string): void {
  expect(() => histogramRows(data)).toThrow(message);
  const element = sizedElement(400, 300);
  expect(() => createHistogram(element, data)).toThrow(message);
  expect(element.childNodes).toHaveLength(0);
  const handle = createHistogram(element, histogramOf(MAF_COUNTS, 0.95));
  expect(() => {
    handle.update(data);
  }).toThrow(message);
  expect(element.querySelectorAll("rect.chart-bar")).toHaveLength(20);
  handle.destroy();
}

describe("VS4 D2 the histogram, its defects", () => {
  test("no bin is refused", () => {
    expectRefused(
      histogramOf(new Uint32Array(0), null, Float64Array.from([0])),
      "no bin",
    );
  });

  test("edges that are not one more than the counts are refused", () => {
    expectRefused(
      histogramOf(Uint32Array.from([1, 2]), null, Float64Array.from([0, 1])),
      "was given 2 edges, not 3",
    );
    expectRefused(
      histogramOf(Uint32Array.from([1]), null, Float64Array.from([0, 1, 2])),
      "was given 3 edges, not 2",
    );
  });

  test("an edge that is not finite is refused", () => {
    expectRefused(
      histogramOf(
        Uint32Array.from([1, 1]),
        null,
        Float64Array.from([0, NaN, 1]),
      ),
      "not a finite number",
    );
    expectRefused(
      histogramOf(
        Uint32Array.from([1]),
        null,
        Float64Array.from([0, Number.POSITIVE_INFINITY]),
      ),
      "not a finite number",
    );
  });

  test("an edge that is not above the one before is refused", () => {
    expectRefused(
      histogramOf(
        Uint32Array.from([1, 1]),
        null,
        Float64Array.from([0, 0.5, 0.5]),
      ),
      "not above the one before",
    );
    expectRefused(
      histogramOf(
        Uint32Array.from([1, 1]),
        null,
        Float64Array.from([0, 1, 0.5]),
      ),
      "not above the one before",
    );
  });

  test("a threshold that is not finite is refused", () => {
    expectRefused(histogramOf(MAF_COUNTS, NaN), "threshold");
    expectRefused(
      histogramOf(MAF_COUNTS, Number.POSITIVE_INFINITY),
      "threshold",
    );
  });

  test("more than 1,000 bins are refused, and 1,000 are drawn", () => {
    const edgesOf = (numBins: number): Float64Array =>
      Float64Array.from({ length: numBins + 1 }, (_each, index) => index);
    expectRefused(
      histogramOf(new Uint32Array(1001), null, edgesOf(1001)),
      "1001 bins",
    );
    expect(
      histogramRows(histogramOf(new Uint32Array(1000), null, edgesOf(1000))),
    ).toHaveLength(1000);
  });
});

describe("VS4 D2 the histogram, the domains and ticks of its scales", () => {
  test("the horizontal domain is widened to take a threshold of 1.2", () => {
    expect(
      histogramScales(histogramOf(MAF_COUNTS, 1.2), 500, 300).x.domain(),
    ).toEqual([0, 1.2]);
    expect(
      histogramScales(histogramOf(MAF_COUNTS, -0.1), 500, 300).x.domain(),
    ).toEqual([-0.1, 1]);
    expect(
      histogramScales(histogramOf(MAF_COUNTS, 0.95), 500, 300).x.domain(),
    ).toEqual([0, 1]);
  });

  test("the vertical domain is 0 to 1 when every count is 0, and 0 to the largest made round otherwise", () => {
    const { x, y } = histogramScales(
      histogramOf(new Uint32Array(40), null),
      500,
      300,
    );
    expect(y.domain()).toEqual([0, 1]);
    expect(y.range()).toEqual([300, 0]);
    expect(x.range()).toEqual([0, 500]);
    expect(
      histogramScales(histogramOf(MAF_COUNTS, null), 500, 300).y.domain(),
    ).toEqual([0, 90]);
  });

  test("the vertical ticks of counts of 0 to 3 are the whole numbers 0, 1, 2 and 3", () => {
    const counts = Uint32Array.from([0, 1, 2, 3]);
    const edges = Float64Array.from([0, 0.25, 0.5, 0.75, 1]);
    const { y } = histogramScales(histogramOf(counts, null, edges), 500, 300);
    expect(y.domain()).toEqual([0, 3]);
    expect(wholeNumberTicks(y, 300 / 40)).toEqual([0, 1, 2, 3]);
  });
});

/** An observer that does nothing: these tests give the size once. */
class StillObserver {
  observe(): void {
    // the size is given by clientWidth and clientHeight
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

function svgOf(element: HTMLElement): SVGSVGElement {
  const svg = element.querySelector("svg");
  if (svg === null) throw new Error("no svg");
  return svg;
}

function numberOf(element: Element | undefined, name: string): number {
  if (element === undefined) throw new Error(`no element for ${name}`);
  return Number(element.getAttribute(name));
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", StillObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("VS4 D2 the histogram, under jsdom", () => {
  test("its SVG has the classes chart chart-histogram and no overlay", () => {
    const element = sizedElement(600, 375);
    createHistogram(element, histogramOf(MAF_COUNTS, 0.95));
    const svg = svgOf(element);
    expect(svg.getAttribute("class")).toBe("chart chart-histogram");
    expect(svg.querySelector(".chart-overlay")).toBeNull();
  });

  test("counts all 0, with a threshold and without, draw the two axes, the vertical one from 0 to 1, and no bar", () => {
    for (const threshold of [null, 0.95]) {
      const element = sizedElement(600, 375);
      createHistogram(element, histogramOf(new Uint32Array(40), threshold));
      const svg = svgOf(element);
      expect(svg.querySelectorAll("rect.chart-bar")).toHaveLength(0);
      const yTicks = [
        ...svg.querySelectorAll("g.chart-axis-y g.tick text"),
      ].map((text) => text.textContent);
      expect(yTicks).toEqual(["0", "1"]);
      expect(
        svg.querySelectorAll("g.chart-axis-x g.tick").length,
      ).toBeGreaterThan(1);
    }
  });

  test("the MAF at 0.95 draws 18 kept bars, 2 removed, and no rect for the 20 empty bins", () => {
    const element = sizedElement(600, 375);
    createHistogram(element, histogramOf(MAF_COUNTS, 0.95));
    const marks = svgOf(element).querySelector("g.chart-marks");
    expect(marks?.querySelectorAll("rect.chart-bar")).toHaveLength(20);
    expect(
      marks?.querySelectorAll("rect.chart-bar.chart-bar-kept"),
    ).toHaveLength(18);
    expect(
      marks?.querySelectorAll("rect.chart-bar.chart-bar-removed"),
    ).toHaveLength(2);
    // The first bar is bin 20, at 0.5, on the frame of 600 less 76 pixels.
    const first = marks?.querySelector("rect.chart-bar") ?? undefined;
    expect(numberOf(first, "x")).toBeCloseTo(262, 9);
    expect(numberOf(first, "width")).toBeCloseTo(13.1, 9);
  });

  test("bin 20, of 69 variants, is a bar that stands on the bottom of the frame and rises to 69 on the axis of 0 to 90", () => {
    // The frame is 375 less the margins of 56 and 44, 275 high; 69 of 90
    // is 275 * 21 / 90 below its top, 64.1666..., and 275 * 69 / 90 high,
    // 210.8333....
    const element = sizedElement(600, 375);
    createHistogram(element, histogramOf(MAF_COUNTS, 0.95));
    const first =
      svgOf(element).querySelector("g.chart-marks rect.chart-bar") ?? undefined;
    expect(numberOf(first, "y")).toBeCloseTo(64.16666666666667, 9);
    expect(numberOf(first, "height")).toBeCloseTo(210.83333333333334, 9);
  });

  test("the observed heterozygosity at 0.5 draws bin 20 as one outlined rect at the line", () => {
    const element = sizedElement(600, 375);
    createHistogram(element, histogramOf(OBS_HET_COUNTS, 0.5));
    const svg = svgOf(element);
    const bars = [...svg.querySelectorAll("g.chart-marks rect.chart-bar")];
    // 24 bins with a count above 0, bin 0 being empty.
    expect(bars).toHaveLength(24);
    const line = svg.querySelector("g.chart-annotations line.chart-threshold");
    const lineX = numberOf(line ?? undefined, "x1");
    const atLine = bars.filter((bar) => numberOf(bar, "x") === lineX);
    expect(atLine).toHaveLength(1);
    expect(atLine[0]?.getAttribute("class")).toBe(
      "chart-bar chart-bar-removed",
    );
    expect(svg.querySelectorAll("rect.chart-bar-kept")).toHaveLength(19);
    expect(svg.querySelectorAll("rect.chart-bar-removed")).toHaveLength(5);
  });

  test("a threshold of 0.51, inside bin 20, splits it into two rects that meet at the line", () => {
    const element = sizedElement(600, 375);
    createHistogram(element, histogramOf(OBS_HET_COUNTS, 0.51));
    const svg = svgOf(element);
    const line = svg.querySelector("g.chart-annotations line.chart-threshold");
    const lineX = numberOf(line ?? undefined, "x1");
    expect(numberOf(line ?? undefined, "x2")).toBe(lineX);
    expect(numberOf(line ?? undefined, "y1")).toBe(375 - 56 - 44);
    expect(numberOf(line ?? undefined, "y2")).toBe(0);
    const bars = [...svg.querySelectorAll("g.chart-marks rect.chart-bar")];
    expect(bars).toHaveLength(25);
    const left = bars.find(
      (bar) =>
        Math.abs(numberOf(bar, "x") + numberOf(bar, "width") - lineX) < 1e-9,
    );
    const right = bars.find((bar) => numberOf(bar, "x") === lineX);
    expect(left?.getAttribute("class")).toBe("chart-bar chart-bar-kept");
    expect(right?.getAttribute("class")).toBe("chart-bar chart-bar-removed");
    expect(numberOf(left, "height")).toBe(numberOf(right, "height"));
  });

  test("a threshold of 1.2, right of the bins, keeps every bar, and one of -0.1, left of them, removes every bar", () => {
    const keptAll = histogramOf(MAF_COUNTS, 1.2);
    expect(binsIn(keptAll, "kept")).toEqual({
      bins: range(0, 39),
      count: 1200,
    });
    const removedAll = histogramOf(MAF_COUNTS, -0.1);
    expect(binsIn(removedAll, "removed")).toEqual({
      bins: range(0, 39),
      count: 1200,
    });
    const classesAt = (data: HistogramData): (string | null)[] => {
      const element = sizedElement(600, 375);
      createHistogram(element, data);
      return [...svgOf(element).querySelectorAll("rect.chart-bar")].map((bar) =>
        bar.getAttribute("class"),
      );
    };
    const kept = classesAt(keptAll);
    expect(kept).toHaveLength(20);
    for (const name of kept) expect(name).toBe("chart-bar chart-bar-kept");
    const removed = classesAt(removedAll);
    expect(removed).toHaveLength(20);
    for (const name of removed) {
      expect(name).toBe("chart-bar chart-bar-removed");
    }
  });

  test("with a threshold, the legend has its three rows, text before the mark at the right of the frame", () => {
    const element = sizedElement(600, 375);
    createHistogram(element, histogramOf(MAF_COUNTS, 0.95));
    const rows = [
      ...svgOf(element).querySelectorAll("g.chart-legend g.chart-legend-row"),
    ];
    expect(rows.map((row) => row.textContent)).toEqual([
      "Maximum 0.95",
      "Kept by this filter",
      "Removed by this filter",
    ]);
    expect(
      rows[0]?.querySelector("line.chart-legend-threshold"),
    ).not.toBeNull();
    expect(rows[1]?.querySelector("rect.chart-legend-kept")).not.toBeNull();
    expect(rows[2]?.querySelector("rect.chart-legend-removed")).not.toBeNull();
    // The right edge of the frame is 600 less the right margin of 16, and
    // the three rows lie in the top margin of 56.
    expect(rows[2]?.getAttribute("transform")).toBe("translate(584,44)");
    const text = rows[0]?.querySelector("text") ?? undefined;
    expect(numberOf(text, "x")).toBeLessThan(0);
  });

  test("an update from 0.95 to 0.9 writes Maximum 0.9 in the first row of the legend", () => {
    const element = sizedElement(600, 375);
    const handle = createHistogram(element, histogramOf(MAF_COUNTS, 0.95));
    handle.update(histogramOf(MAF_COUNTS, 0.9));
    const rows = [
      ...svgOf(element).querySelectorAll("g.chart-legend g.chart-legend-row"),
    ];
    expect(rows.map((row) => row.textContent)).toEqual([
      "Maximum 0.9",
      "Kept by this filter",
      "Removed by this filter",
    ]);
  });

  test("an update from 0.95 to no threshold removes the line and the legend and fills every bar, in the same svg", () => {
    const element = sizedElement(600, 375);
    const handle = createHistogram(element, histogramOf(MAF_COUNTS, 0.95));
    const svg = svgOf(element);
    handle.update(histogramOf(MAF_COUNTS, null));
    expect(svgOf(element)).toBe(svg);
    expect(element.querySelectorAll("svg")).toHaveLength(1);
    expect(svg.querySelector("line.chart-threshold")).toBeNull();
    expect(svg.querySelector("g.chart-legend")?.childNodes).toHaveLength(0);
    const bars = [...svg.querySelectorAll("rect.chart-bar")];
    expect(bars).toHaveLength(20);
    for (const bar of bars) expect(bar.getAttribute("class")).toBe("chart-bar");
  });

  test("an update to a threshold in an element 80 pixels high, not larger than the margins of 56 and 44, empties the frame", () => {
    const element = sizedElement(600, 80);
    const handle = createHistogram(element, histogramOf(MAF_COUNTS, null));
    const svg = svgOf(element);
    expect(svg.querySelectorAll("rect.chart-bar")).toHaveLength(20);
    expect(
      svg.querySelectorAll("g.chart-axis-x g.tick").length,
    ).toBeGreaterThan(0);
    expect(
      svg.querySelectorAll("g.chart-axis-y g.tick").length,
    ).toBeGreaterThan(0);
    handle.update(histogramOf(MAF_COUNTS, 0.95));
    expect(svg.querySelectorAll("rect.chart-bar")).toHaveLength(0);
    expect(svg.querySelector("line.chart-threshold")).toBeNull();
    expect(svg.querySelector("g.chart-legend")?.childNodes).toHaveLength(0);
    expect(svg.querySelector("g.chart-axis-x")?.childNodes).toHaveLength(0);
    expect(svg.querySelector("g.chart-axis-y")?.childNodes).toHaveLength(0);
    expect(svg.getAttribute("width")).toBe("0");
    expect(svg.getAttribute("height")).toBe("0");
    expect(() => handle.toSVG()).toThrow("frame has no area");
    handle.update(histogramOf(MAF_COUNTS, null));
    expect(svg.querySelectorAll("rect.chart-bar")).toHaveLength(20);
    expect(svg.getAttribute("width")).toBe("600");
  });

  test("an update to 20 bins of a count of 1 each gives 20 rects, in the same svg", () => {
    const element = sizedElement(600, 375);
    const handle = createHistogram(element, histogramOf(OBS_HET_COUNTS, 0.6));
    const svg = svgOf(element);
    const edges = Float64Array.from(
      { length: 21 },
      (_each, index) => index / 20,
    );
    handle.update(histogramOf(new Uint32Array(20).fill(1), null, edges));
    expect(svgOf(element)).toBe(svg);
    expect(svg.querySelectorAll("rect.chart-bar")).toHaveLength(20);
  });

  test("thresholds 2 a threshold with no legend draws its line and the bars it keeps and removes, no row of a legend, and keeps the top margin of 12", () => {
    const element = sizedElement(600, 375);
    createHistogram(element, {
      ...histogramOf(OBS_HET_COUNTS, null),
      threshold: { value: 0.51, legend: null },
    });
    const svg = svgOf(element);
    expect(svg.querySelectorAll("line.chart-threshold")).toHaveLength(1);
    expect(svg.querySelectorAll("rect.chart-bar-kept").length).toBeGreaterThan(
      0,
    );
    expect(
      svg.querySelectorAll("rect.chart-bar-removed").length,
    ).toBeGreaterThan(0);
    expect(svg.querySelectorAll("g.chart-legend-row")).toHaveLength(0);
    expect(
      element.querySelector("g.chart-frame")?.getAttribute("transform"),
    ).toBe("translate(60,12)");
  });

  test("thresholds 2 the plot tells where its frame is at its first draw, and again only when a draw moves it", () => {
    const element = sizedElement(600, 375);
    const frames: unknown[] = [];
    const handle = createHistogram(
      element,
      {
        ...histogramOf(MAF_COUNTS, null),
        threshold: { value: 0.9, legend: null },
      },
      { onFrame: (frame) => frames.push(frame) },
    );
    // 600 less the margins of 60 and 16, 375 less those of 12 and 44.
    expect(frames).toEqual([{ left: 60, top: 12, width: 524, height: 319 }]);
    handle.update({
      ...histogramOf(MAF_COUNTS, null),
      threshold: { value: 0.8, legend: null },
    });
    expect(frames).toHaveLength(1);
    handle.update(histogramOf(MAF_COUNTS, 0.8));
    expect(frames).toEqual([
      { left: 60, top: 12, width: 524, height: 319 },
      { left: 60, top: 56, width: 524, height: 275 },
    ]);
  });

  test("the top margin is 56 with a threshold and 12 without, after an update in each direction", () => {
    const element = sizedElement(600, 375);
    const handle = createHistogram(element, histogramOf(MAF_COUNTS, null));
    const frame = (): string | null | undefined =>
      element.querySelector("g.chart-frame")?.getAttribute("transform");
    expect(frame()).toBe("translate(60,12)");
    handle.update(histogramOf(MAF_COUNTS, 0.95));
    expect(frame()).toBe("translate(60,56)");
    handle.update(histogramOf(MAF_COUNTS, null));
    expect(frame()).toBe("translate(60,12)");
  });

  test("the vertical axis has whole numbers only, with a comma between thousands", () => {
    const element = sizedElement(600, 375);
    const edges = Float64Array.from([0, 0.25, 0.5, 0.75, 1]);
    const handle = createHistogram(
      element,
      histogramOf(Uint32Array.from([0, 1, 2, 3]), null, edges),
    );
    const labels = (): (string | null)[] =>
      [...element.querySelectorAll("g.chart-axis-y g.tick text")].map(
        (each) => each.textContent,
      );
    expect(labels()).toEqual(["0", "1", "2", "3"]);
    handle.update(histogramOf(Uint32Array.from([12000, 1, 2, 3]), null, edges));
    expect(labels()).toContain("12,000");
  });
});

/**
 * The shares of p0 at n = 40 of docs/specs/analyses/sfs.md, "The numbers
 * of popnei": bins 1 to 20 of popnei's folded spectrum of p0 over their
 * sum, 1155.2067685551308, from calcPopDiversity of the release
 * js-v0.1.0-dev.3 on e2e/fixtures/panel.nei and panel_pops.csv, with
 * numCalledAlleles 40 and minNumIndividuals 20, under node on 30
 * September 2026. The largest is 0.05590275165567829, at 15.
 */
const P0_SHARES = Float64Array.from([
  0.03296202862168288, 0.039741192875913794, 0.04292589823492003,
  0.04599381504237501, 0.04950826665575176, 0.05214107823717621,
  0.05333464033303239, 0.05374146334958941, 0.05408245056632821,
  0.0545442264980674, 0.05499692782727783, 0.05536047033652249,
  0.05566250577424119, 0.05588819458513805, 0.05590275165567829,
  0.05553867859956841, 0.05475717261859911, 0.05374980986517631,
  0.052891529866881344, 0.026276898456079615,
]);

/** The edges at the halves, 0.5 to numBins + 0.5, one bin per count. */
function halfEdges(numBins: number): Float64Array {
  return Float64Array.from(
    { length: numBins + 1 },
    (_each, index) => index + 0.5,
  );
}

/** The histogram of a spectrum, as the block of the diversity draws it. */
function spectrumOf(
  shares: Float64Array,
  options: { readonly yMax?: number; readonly xWholeNumbers?: boolean } = {},
): HistogramData {
  return {
    title: "p0",
    description: "The folded site frequency spectrum of p0.",
    xLabel: "Copies of the rarer allele among 40 chromosomes",
    yLabel: "Share of the variants with both alleles",
    edges: halfEdges(shares.length),
    counts: shares,
    threshold: null,
    ...options,
  };
}

function tickTexts(element: HTMLElement, axis: string): (string | null)[] {
  return [...element.querySelectorAll(`g.${axis} g.tick text`)].map(
    (text) => text.textContent,
  );
}

describe("PA4 D6 the histogram of the spectrum, its scales and ticks", () => {
  // docs/specs/charts/histogram.md has 0 to 0.07 here; d3's nice, at its
  // default of about 10 ticks, rounds 0.061 up to a step of 0.005, 0.065.
  test("the shares of p0 with yMax 0.061 give a vertical domain of 0 to 0.065, and without it 0 to 0.06", () => {
    expect(P0_SHARES).toHaveLength(20);
    expect(Math.max(...P0_SHARES)).toBe(0.05590275165567829);
    const shared = histogramScales(
      spectrumOf(P0_SHARES, { yMax: 0.061 }),
      500,
      300,
    );
    expect(shared.y.domain()).toEqual([0, 0.065]);
    expect(shared.x.domain()).toEqual([0.5, 20.5]);
    expect(histogramScales(spectrumOf(P0_SHARES), 500, 300).y.domain()).toEqual(
      [0, 0.06],
    );
    // The largest share of the three populations cannot tell the two apart.
    expect(
      histogramScales(
        spectrumOf(P0_SHARES, { yMax: 0.05618145165329451 }),
        500,
        300,
      ).y.domain(),
    ).toEqual([0, 0.06]);
  });

  test("the rows of the spectrum hold the shares as they were given, with no threshold", () => {
    const rows = histogramRows(spectrumOf(P0_SHARES, { yMax: 0.061 }));
    expect(rows).toHaveLength(20);
    expect(rows.map((row) => row.count)).toEqual([...P0_SHARES]);
    expect(rows[0]).toEqual({
      from: 0.5,
      to: 1.5,
      toIncluded: false,
      count: 0.03296202862168288,
      state: null,
    });
    expect(rows.every((row) => row.state === null)).toBe(true);
  });

  test("a yMax of 0 with every share 0 gives a vertical domain of 0 to 1", () => {
    expect(
      histogramScales(
        spectrumOf(new Float64Array(20), { yMax: 0 }),
        500,
        300,
      ).y.domain(),
    ).toEqual([0, 1]);
  });
});

describe("PA4 D6 the histogram of the spectrum, under jsdom", () => {
  test("the shares of p0 with yMax 0.061 have vertical ticks that are not whole, 0.00 to 0.06, and bars that reach 0.0559 of 0.065", () => {
    const element = sizedElement(600, 375);
    createHistogram(element, spectrumOf(P0_SHARES, { yMax: 0.061 }));
    expect(tickTexts(element, "chart-axis-y")).toEqual([
      "0.00",
      "0.01",
      "0.02",
      "0.03",
      "0.04",
      "0.05",
      "0.06",
    ]);
    const bars = [...element.querySelectorAll("g.chart-marks rect.chart-bar")];
    expect(bars).toHaveLength(20);
    for (const bar of bars) expect(bar.getAttribute("class")).toBe("chart-bar");
    // The frame is 375 less the margins of 12 and 44, 319 high; bin 15
    // rises to 0.05590275165567829 of 0.065 of it.
    expect(numberOf(bars[14], "height")).toBeCloseTo(
      (319 * 0.05590275165567829) / 0.065,
      9,
    );
  });

  test("xWholeNumbers over the edges 0.5 to 2.5, two bins, gives the horizontal ticks 1 and 2 alone, and without it d3 gives fractions", () => {
    const shares = Float64Array.from([0.75, 0.25]);
    const element = sizedElement(600, 375);
    const handle = createHistogram(
      element,
      spectrumOf(shares, { xWholeNumbers: true }),
    );
    expect(tickTexts(element, "chart-axis-x")).toEqual(["1", "2"]);
    handle.update(spectrumOf(shares));
    const fractions = tickTexts(element, "chart-axis-x");
    expect(fractions.some((tick) => Number(tick) % 1 !== 0)).toBe(true);
  });

  test("the spectrum of p0 with xWholeNumbers has whole ticks under the centres of its bars", () => {
    const element = sizedElement(600, 375);
    createHistogram(
      element,
      spectrumOf(P0_SHARES, { yMax: 0.061, xWholeNumbers: true }),
    );
    const ticks = tickTexts(element, "chart-axis-x");
    expect(ticks.length).toBeGreaterThan(1);
    for (const tick of ticks) expect(Number(tick) % 1).toBe(0);
  });
});

describe("the left margin of the histogram follows the numbers of its vertical axis", () => {
  const frameOf = (element: HTMLElement): string | null | undefined =>
    element.querySelector("g.chart-frame")?.getAttribute("transform");

  test("shares up to 0.5, of at most four characters at any height, keep the margin of 60", () => {
    const element = sizedElement(600, 375);
    createHistogram(element, spectrumOf(Float64Array.from([0.5, 0.3, 0.2])));
    expect(frameOf(element)).toBe("translate(60,12)");
  });

  test("shares up to 0.044 under a yMax of 0.936 keep 60, and alone, with ticks up to 0.045, five characters, get 67", () => {
    const element = sizedElement(600, 375);
    createHistogram(
      element,
      spectrumOf(Float64Array.from([0.044, 0.02, 0.936]), { yMax: 0.936 }),
    );
    expect(frameOf(element)).toBe("translate(60,12)");
    const narrow = sizedElement(600, 375);
    createHistogram(narrow, spectrumOf(Float64Array.from([0.044, 0.02])));
    // The label's 22 pixels, five characters at 7.2 and the tick's 9.
    expect(frameOf(narrow)).toBe("translate(67,12)");
  });

  test("counts up to 240 keep the margin of 60, and counts up to 12,000, six characters, get 74.2", () => {
    const element = sizedElement(600, 375);
    const edges = Float64Array.from([0, 0.5, 1]);
    const handle = createHistogram(
      element,
      histogramOf(Uint32Array.from([240, 3]), null, edges),
    );
    expect(frameOf(element)).toBe("translate(60,12)");
    handle.update(histogramOf(Uint32Array.from([12000, 3]), null, edges));
    expect(frameOf(element)).toBe("translate(74.2,12)");
  });
});

describe("PA4 D6 the histogram of the spectrum, its defects", () => {
  test("a share of -0.1 is refused", () => {
    expectRefused(
      spectrumOf(Float64Array.from([0.5, -0.1, 0.6])),
      "not a finite number at least 0",
    );
  });

  test("a share of NaN or of an infinity is refused", () => {
    expectRefused(
      spectrumOf(Float64Array.from([0.5, NaN, 0.5])),
      "not a finite number at least 0",
    );
    expectRefused(
      spectrumOf(Float64Array.from([Number.POSITIVE_INFINITY, 0.5])),
      "not a finite number at least 0",
    );
  });

  test("a yMax below the largest count is refused, and one equal to it is drawn", () => {
    expectRefused(
      spectrumOf(P0_SHARES, { yMax: 0.0559 }),
      "below the largest count",
    );
    expect(
      histogramScales(
        spectrumOf(P0_SHARES, { yMax: 0.05590275165567829 }),
        500,
        300,
      ).y.domain(),
    ).toEqual([0, 0.06]);
  });

  test("a yMax that is not finite is refused", () => {
    expectRefused(spectrumOf(P0_SHARES, { yMax: NaN }), "not a finite number");
    expectRefused(
      spectrumOf(P0_SHARES, { yMax: Number.POSITIVE_INFINITY }),
      "not a finite number",
    );
  });
});

describe("thresholds 2 a threshold whose bin at the line is undecided", () => {
  /** The histogram of the observed heterozygosity of panel.nei with a
      threshold at `value` whose bin at the line is undecided. */
  function undecidedAt(value: number, counts = OBS_HET_COUNTS): HistogramData {
    return {
      ...histogramOf(counts, null),
      threshold: { value, legend: null, undecided: true },
    };
  }

  /** The bars of the plot in `element`, from the left. */
  function barsIn(element: HTMLElement): Element[] {
    return [...svgOf(element).querySelectorAll("g.chart-marks rect.chart-bar")];
  }

  test("at 0.5, an edge of the bins, the bar that starts at the line is hatched, neither filled nor an outline, and its pattern is in the SVG", () => {
    const element = sizedElement(600, 375);
    createHistogram(element, undecidedAt(0.5));
    const svg = svgOf(element);
    const lineX = numberOf(
      svg.querySelector("line.chart-threshold") ?? undefined,
      "x1",
    );
    const atLine = barsIn(element).filter(
      (bar) => numberOf(bar, "x") === lineX,
    );
    expect(atLine.map((bar) => bar.getAttribute("class"))).toEqual([
      "chart-bar chart-bar-undecided",
    ]);
    const fill = /^fill: url\(#([^)]+)\);?$/u.exec(
      atLine[0]?.getAttribute("style") ?? "",
    );
    expect(fill).not.toBeNull();
    const pattern = svg.querySelector(`pattern#${fill?.[1] ?? ""}`);
    expect(pattern).not.toBeNull();
    // th3 fix 3: the stripe runs down the middle of its tile, so that its
    // stroke of 2 pixels shows whole and is not cut by the tile's edge.
    const tile = numberOf(pattern ?? undefined, "width");
    const stripe = pattern?.querySelector("line.chart-hatch-stripe");
    expect(numberOf(stripe ?? undefined, "x1")).toBe(tile / 2);
    expect(numberOf(stripe ?? undefined, "x2")).toBe(tile / 2);
    expect(numberOf(stripe ?? undefined, "y1")).toBe(0);
    expect(numberOf(stripe ?? undefined, "y2")).toBe(
      numberOf(pattern ?? undefined, "height"),
    );
    // Bins 21 to 24 are removed, 1 to 19 kept, as without the hatch.
    expect(svg.querySelectorAll("rect.chart-bar-removed")).toHaveLength(4);
    expect(svg.querySelectorAll("rect.chart-bar-kept")).toHaveLength(19);
  });

  test("at 0.51, inside bin 20, the part of the bin right of the line is hatched and the part left of it filled", () => {
    const element = sizedElement(600, 375);
    createHistogram(element, undecidedAt(0.51));
    const classes = barsIn(element).map((bar) => bar.getAttribute("class"));
    expect(
      classes.filter((name) => name?.includes("undecided") === true),
    ).toEqual(["chart-bar chart-bar-undecided"]);
    expect(
      classes.filter((name) => name?.includes("kept") === true),
    ).toHaveLength(20);
  });

  test("at 0.3, on the edge popnei gives as 0.30000000000000004, the double above it, the bin that starts there is hatched", () => {
    const element = sizedElement(600, 375);
    createHistogram(element, undecidedAt(0.3));
    const svg = svgOf(element);
    expect(svg.querySelectorAll("rect.chart-bar-undecided")).toHaveLength(1);
    expect(svg.querySelectorAll("rect.chart-bar-kept")).toHaveLength(11);
    // Without the hatch the same bin is removed.
    const plain = sizedElement(600, 375);
    createHistogram(plain, {
      ...histogramOf(OBS_HET_COUNTS, null),
      threshold: { value: 0.3, legend: null },
    });
    expect(
      svgOf(plain).querySelectorAll("rect.chart-bar-undecided"),
    ).toHaveLength(0);
  });

  test("two plots on a page each have a pattern of their own, and an update to a threshold that can tell takes the hatch away", () => {
    const one = sizedElement(600, 375);
    const two = sizedElement(600, 375);
    const handle = createHistogram(one, undecidedAt(0.5));
    createHistogram(two, undecidedAt(0.5));
    const ids = [one, two].map(
      (element) => element.querySelector("pattern")?.id,
    );
    expect(ids[0]).toBeTruthy();
    expect(ids[0]).not.toBe(ids[1]);
    handle.update({
      ...histogramOf(OBS_HET_COUNTS, null),
      threshold: { value: 0.5, legend: null },
    });
    expect(
      svgOf(one).querySelectorAll("rect.chart-bar-undecided"),
    ).toHaveLength(0);
    expect(svgOf(one).querySelectorAll("rect.chart-bar-removed")).toHaveLength(
      5,
    );
  });
});
