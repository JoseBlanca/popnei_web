// @vitest-environment jsdom
/**
 * The download of a histogram, drawn by React in jsdom
 * (docs/specs/widgets/downloads.md, "A plot", and the interface of
 * `usePlot`): its menu saves the image the handle of the plot gives, as
 * SVG and as PNG at twice its size, and the data the screen writes at the
 * choice, under the names of `downloadName`; with no download, as
 * popgen.html draws its histograms, it draws the element of the plot
 * alone, as before. The plot is a stand-in that records what it is
 * asked, since jsdom lays nothing out; the histogram itself is tested in
 * src/charts/histogram.test.ts.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { HistogramData } from "../../charts/histogram.ts";
import { downloadFile, downloadText } from "../download.ts";
import { AnnouncerProvider } from "../shell/announcer.tsx";
import { ANNOUNCE_DELAY_MS, createAnnouncer } from "../shell/status.ts";
import type { Announcer } from "../shell/status.ts";
import { HistogramPlot } from "./HistogramPlot.tsx";
import type { PlotDownload } from "./downloadItems.ts";

vi.mock("../download.ts", () => ({
  downloadText: vi.fn(),
  downloadFile: vi.fn(),
}));

/** The image the stand-in plot gives as SVG. */
const SVG_TEXT = "<svg>the histogram</svg>";

/** The PNG the stand-in plot gives. */
const PNG = new Blob(["png"], { type: "image/png" });

/** The scales the stand-in plot was asked for its PNG at. */
const pngScales: number[] = [];

/** How many plots the stand-in has made and destroyed. */
const plots = { made: 0, destroyed: 0 };

vi.mock("../../charts/histogram.ts", () => ({
  createHistogram: () => {
    plots.made += 1;
    return {
      update: () => undefined,
      destroy: () => {
        plots.destroyed += 1;
      },
      toSVG: () => SVG_TEXT,
      toPNG: (scale: number) => {
        pngScales.push(scale);
        return Promise.resolve(PNG);
      },
    };
  },
}));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/** The data of the plot; the stand-in reads none of it. */
const DATA: HistogramData = {
  edges: new Float64Array([0, 0.5, 1]),
  counts: new Uint32Array([3, 4]),
  threshold: null,
  title: "MAF",
  description: "The MAF of the variants.",
  xLabel: "MAF",
  yLabel: "Variants",
};

const DOWNLOAD: PlotDownload = {
  what: "the plot of the MAF of the variants",
  stem: "panel",
  imageWhat: "maf_variants",
  csvWhat: "maf_variants",
  csv: () => "left_edge,right_edge,count\n0,0.5,3\n0.5,1,4\n",
  waiting: null,
};

let container: HTMLElement;
let root: Root;
let announcer: Announcer;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.mocked(downloadText).mockClear();
  vi.mocked(downloadFile).mockClear();
  pngScales.length = 0;
  plots.made = 0;
  plots.destroyed = 0;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  announcer = createAnnouncer();
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

/** Draws the histogram under StrictMode and the announcer. */
function draw(download: PlotDownload | null): void {
  act(() => {
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(
          AnnouncerProvider,
          { value: announcer },
          createElement(HistogramPlot, {
            data: DATA,
            ...(download !== null && { download }),
          }),
        ),
      ),
    );
  });
}

/** Presses the key `key` on the element that has the focus. */
function press(key: string): void {
  const target = document.activeElement;
  if (!(target instanceof HTMLElement)) throw new Error("no focus");
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
  });
}

/** Opens the menu of the histogram by the keyboard, chooses `label`, and
    lets the save end. */
async function choose(label: string): Promise<void> {
  const button = document.querySelector(
    `button[aria-label="Download ${DOWNLOAD.what}"]`,
  );
  if (!(button instanceof HTMLElement)) throw new Error("no button");
  act(() => {
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Shift", bubbles: true }),
    );
    button.focus();
  });
  press("Enter");
  const items = [...document.querySelectorAll('[role="menuitem"]')].map(
    (item) => item.textContent,
  );
  expect(items).toEqual(["Image as SVG", "Image as PNG", "Data as CSV"]);
  for (let step = 0; step < items.indexOf(label); step += 1) {
    press("ArrowDown");
  }
  press("Enter");
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ANNOUNCE_DELAY_MS * 2));
  });
}

describe("AP5 D3 the download of a histogram, from the handle usePlot gives", () => {
  test("Image as SVG saves the SVG of the plot under the name of the image", async () => {
    draw(DOWNLOAD);
    await choose("Image as SVG");
    expect(vi.mocked(downloadText).mock.calls).toEqual([
      ["panel.maf_variants.svg", SVG_TEXT, "image/svg+xml"],
    ]);
    expect(announcer.getState()).toBe("Saving panel.maf_variants.svg.");
  });

  test("Image as PNG saves the PNG of the plot at twice its size", async () => {
    draw(DOWNLOAD);
    await choose("Image as PNG");
    expect(pngScales).toEqual([2]);
    expect(vi.mocked(downloadFile).mock.calls).toEqual([
      ["panel.maf_variants.png", PNG],
    ]);
    expect(announcer.getState()).toBe("Saving panel.maf_variants.png.");
  });

  test("Data as CSV saves the text the screen writes at the choice", async () => {
    draw(DOWNLOAD);
    await choose("Data as CSV");
    expect(vi.mocked(downloadText).mock.calls).toEqual([
      [
        "panel.maf_variants.csv",
        "left_edge,right_edge,count\n0,0.5,3\n0.5,1,4\n",
        "text/csv",
      ],
    ]);
  });

  test("a histogram with no download, as popgen.html draws it, is the element of the plot alone", () => {
    draw(null);
    expect(container.querySelector("button")).toBeNull();
    expect(container.children).toHaveLength(1);
    expect(container.firstElementChild?.children).toHaveLength(0);
    expect(plots.made - plots.destroyed).toBe(1);
  });

  test("the plot is destroyed when the histogram leaves the page", () => {
    draw(DOWNLOAD);
    act(() => {
      root.render(createElement("p"));
    });
    expect(plots.made).toBeGreaterThan(0);
    expect(plots.made - plots.destroyed).toBe(0);
  });
});
