/**
 * The export of the plots in a browser, on the page of the tests of the
 * plots, e2e/plots.html, which draws the histogram of the MAF of
 * e2e/fixtures/panel.nei at the size a test sets
 * (docs/specs/charts/plot2d.md, "How it is verified"; histogram.md, the
 * legend at 320 pixels). No screen offers the export before stage 6, so
 * the tests call the handle through `page.evaluate`. The scatter and the
 * heatmap are drawn there too, for their pointer and their export, and
 * the line plot of the LD decay, for its export and the contrast of its
 * lines.
 */

import { readFile } from "node:fs/promises";
import { cpus, totalmem } from "node:os";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { PngScale } from "../src/charts/types.ts";
import { test as withAxe } from "./axe.ts";
import type { HeatmapKind, LineKind } from "./plotsPage.ts";

/** The fill of a kept bar in the light theme, --chart-bar, #0072b2. */
const LIGHT_BAR = "rgb(0, 114, 178)";
/** The same in the dark theme, #56b4e9. */
const DARK_BAR = "rgb(86, 180, 233)";
/** The background of the light theme, --color-background, #ffffff. */
const LIGHT_BACKGROUND = "rgb(255, 255, 255)";
/** The text of the light theme, --color-text, #1a1d21. */
const LIGHT_TEXT = "rgb(26, 29, 33)";
/** The outline of a bar in the light theme, --chart-axis, #555d68. */
const LIGHT_AXIS = "rgb(85, 93, 104)";
/** The threshold in the light theme, --chart-threshold, #b3261e. */
const LIGHT_THRESHOLD = "rgb(179, 38, 30)";
/**
 * The colours of the dark theme of src/ui/tokens.css that the light one
 * does not have: --color-text, --color-background, --chart-bar,
 * --chart-axis and --chart-threshold.
 */
const DARK_ONLY = [
  "rgb(232, 234, 237)",
  "rgb(22, 24, 27)",
  DARK_BAR,
  "rgb(163, 171, 181)",
  "rgb(255, 138, 128)",
];
/** The fonts the exported SVG names (charts.md, "Fonts"). */
const FONT_STACK = 'system-ui, "Helvetica", "Arial", sans-serif';

/** The first four bytes of every PNG, as one big-endian number. */
const PNG_SIGNATURE = 0x89504e47;

/** Opens the page of the tests of the plots, once its script has run. */
async function openPlots(page: Page): Promise<void> {
  // Relative to the base path, with no leading slash (testing.md).
  await page.goto("e2e/plots.html");
  await page.waitForFunction(() => "plotsPage" in window);
}

/** Draws the histogram in an element of `width` by `height` CSS pixels. */
async function draw(page: Page, width: number, height: number): Promise<void> {
  await page.evaluate(
    ([w, h]) => {
      const plots = window.plotsPage;
      if (plots === undefined) throw new Error("e2e/plots.html has not run.");
      plots.draw(w, h);
    },
    [width, height] as const,
  );
}

/** The PNG of `toPNG(scale)`, as its type and the size in its header. */
interface PngFound {
  readonly made: true;
  readonly type: string;
  readonly signature: number;
  readonly width: number;
  readonly height: number;
}

/** A PNG refused: the `kind` of its PngError, or the text of another error. */
interface PngRefused {
  readonly made: false;
  readonly kind: string;
}

/** Calls `toPNG(scale)` of the plot drawn last, and reads what it gave. */
async function png(
  page: Page,
  scale: PngScale,
): Promise<PngFound | PngRefused> {
  return page.evaluate(async (pngScale) => {
    const plots = window.plotsPage;
    if (plots === undefined) throw new Error("e2e/plots.html has not run.");
    try {
      const blob = await plots.handle().toPNG(pngScale);
      // The width and the height of a PNG are the first two fields of its
      // IHDR chunk, at bytes 16 and 20, big-endian.
      const bytes = new DataView(await blob.arrayBuffer());
      return {
        made: true as const,
        type: blob.type,
        signature: bytes.getUint32(0),
        width: bytes.getUint32(16),
        height: bytes.getUint32(20),
      };
    } catch (error) {
      return {
        made: false as const,
        kind: plots.pngErrorKind(error) ?? String(error),
      };
    }
  }, scale);
}

/** What drawing a PNG has made since countDrawing was called. */
interface DrawingCounts {
  /** URLs of a Blob made. */
  readonly urls: number;
  /** URLs of a Blob revoked. */
  readonly revoked: number;
  /** Contexts of a canvas asked for. */
  readonly contexts: number;
}

/**
 * Counts, from now on, the calls that drawing a PNG makes: a URL of a
 * Blob made and revoked, and a context of a canvas, whose canvas it keeps
 * for canvasSizes. A PNG refused before anything is drawn makes none, and
 * a PNG made revokes its URL.
 */
async function countDrawing(page: Page): Promise<void> {
  await page.evaluate(() => {
    const counts = { urls: 0, revoked: 0, contexts: 0 };
    const canvases: HTMLCanvasElement[] = [];
    Object.assign(window, { drawingCounts: counts, drawnCanvases: canvases });
    const createObjectURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (object) => {
      counts.urls += 1;
      return createObjectURL(object);
    };
    const revokeObjectURL = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = (url) => {
      counts.revoked += 1;
      revokeObjectURL(url);
    };
    const prototype = HTMLCanvasElement.prototype;
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with apply, on the canvas it was called on
    const getContext = prototype.getContext;
    prototype.getContext = function countedContext(
      this: HTMLCanvasElement,
      ...args: Parameters<HTMLCanvasElement["getContext"]>
    ) {
      counts.contexts += 1;
      canvases.push(this);
      return getContext.apply(this, args);
    } as HTMLCanvasElement["getContext"];
  });
}

async function drawingCounts(page: Page): Promise<DrawingCounts> {
  return page.evaluate(
    () => (window as unknown as { drawingCounts: DrawingCounts }).drawingCounts,
  );
}

/**
 * The width and the height of each canvas a context was asked of since
 * countDrawing was called, which the export leaves of 0 by 0 once its PNG
 * is made or refused.
 */
async function canvasSizes(page: Page): Promise<[number, number][]> {
  return page.evaluate(() =>
    (
      window as unknown as { drawnCanvases: HTMLCanvasElement[] }
    ).drawnCanvases.map((canvas): [number, number] => [
      canvas.width,
      canvas.height,
    ]),
  );
}

test("VS4 D3 the SVG of toSVG holds no var( and no overlay, has a first background rectangle, the light colours in the dark theme, and the outlines, dashes and sizes of text of charts.css, and leaves the page as it was", async ({
  page,
}) => {
  // The dark theme of the system, and then the one the user chose, the
  // attribute data-theme of <html> (css.md, "Light and dark").
  for (const dark of ["system", "chosen"] as const) {
    if (dark === "system") {
      await page.emulateMedia({ colorScheme: "dark" });
    } else {
      await page.emulateMedia({ colorScheme: "light" });
    }
    await openPlots(page);
    if (dark === "chosen") {
      await page.evaluate(() => {
        document.documentElement.dataset["theme"] = "dark";
      });
    }
    await draw(page, 600, 375);
    const found = await page.evaluate(() => {
      const plots = window.plotsPage;
      if (plots === undefined) throw new Error("e2e/plots.html has not run.");
      const element = plots.element();
      const svg = element.querySelector("svg");
      if (svg === null) throw new Error("The plot has no SVG.");
      // An overlay, which the histogram does not draw, so that its removal
      // is seen: the scatter of stage 4 is the first plot with one.
      const overlay = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect",
      );
      overlay.setAttribute("class", "chart-overlay");
      svg.append(overlay);
      const screenKept = svg.querySelector(".chart-bar-kept");
      if (screenKept === null) throw new Error("The plot has no kept bar.");
      const screenFill = getComputedStyle(screenKept).fill;
      const screenRemoved = svg.querySelector(".chart-bar-removed");
      if (screenRemoved === null) {
        throw new Error("The plot has no removed bar.");
      }
      const screenRemovedFill = getComputedStyle(screenRemoved).fill;

      const bodyBefore = [...document.body.children];
      const text = plots.handle().toSVG();
      const bodyAfter = [...document.body.children];
      const file = new DOMParser().parseFromString(text, "image/svg+xml");
      const root = file.documentElement;
      const firstRect = root.querySelector("rect");
      const kept = root.querySelectorAll(".chart-bar-kept");
      // The declarations of the style of each element that matches
      // `selector`, as property and value.
      const stylesOf = (selector: string): Record<string, string>[] =>
        [...root.querySelectorAll(selector)].map((each) =>
          Object.fromEntries(
            (each.getAttribute("style") ?? "")
              .split(";")
              .map((declaration) => declaration.trim())
              .filter((declaration) => declaration !== "")
              .map((declaration) => {
                const colon = declaration.indexOf(":");
                return [
                  declaration.slice(0, colon).trim(),
                  declaration.slice(colon + 1).trim(),
                ];
              }),
          ),
        );
      const fonts = new Set(
        [root, ...root.querySelectorAll("*")].map((each) =>
          (each.getAttribute("style") ?? "")
            .split(";")
            .map((declaration) => declaration.trim())
            .find((declaration) => declaration.startsWith("font-family:")),
        ),
      );
      return {
        screenFill,
        screenRemovedFill,
        bodyUnchanged:
          bodyAfter.length === bodyBefore.length &&
          bodyAfter.every((child, index) => child === bodyBefore[index]),
        removed: stylesOf(".chart-bar-removed"),
        legendRemoved: stylesOf(".chart-legend-removed"),
        thresholds: stylesOf(".chart-threshold"),
        legendTexts: stylesOf(".chart-legend-text"),
        tickTexts: stylesOf(".chart-axis g.tick text"),
        axisLabels: stylesOf(".chart-axis-label"),
        screenUnchanged:
          svg.querySelector(".chart-background") === null &&
          !svg.hasAttribute("style"),
        hasVar: text.includes("var("),
        text,
        rootStyle: root.getAttribute("style") ?? "",
        overlays: root.querySelectorAll(".chart-overlay").length,
        rootName: root.localName,
        namespace: root.namespaceURI,
        width: root.getAttribute("width"),
        height: root.getAttribute("height"),
        title: root.querySelector("title")?.textContent,
        firstRect: {
          className: firstRect?.getAttribute("class"),
          width: firstRect?.getAttribute("width"),
          height: firstRect?.getAttribute("height"),
          style: firstRect?.getAttribute("style") ?? "",
        },
        numKept: kept.length,
        keptStyles: [...kept].map((bar) => bar.getAttribute("style") ?? ""),
        legend: [...root.querySelectorAll(".chart-legend-text")].map(
          (row) => row.textContent,
        ),
        fonts: [...fonts],
      };
    });

    // The screen is dark, and the file is light all the same.
    expect(found.screenFill).toBe(DARK_BAR);
    expect(found.screenUnchanged).toBe(true);
    expect(found.hasVar).toBe(false);
    for (const colour of DARK_ONLY) expect(found.text).not.toContain(colour);
    expect(found.rootStyle).toContain(`color: ${LIGHT_TEXT}`);
    expect(found.overlays).toBe(0);
    expect(found.rootName).toBe("svg");
    expect(found.namespace).toBe("http://www.w3.org/2000/svg");
    expect([found.width, found.height]).toEqual(["600", "375"]);
    expect(found.title).toBe("Major allele frequency");
    expect(found.firstRect.className).toBe("chart-background");
    expect([found.firstRect.width, found.firstRect.height]).toEqual([
      "600",
      "375",
    ]);
    expect(found.firstRect.style).toContain(`fill: ${LIGHT_BACKGROUND}`);
    expect(found.numKept).toBe(18);
    for (const style of found.keptStyles) {
      expect(style).toContain(`fill: ${LIGHT_BAR}`);
    }
    expect(found.legend).toEqual([
      "Maximum 0.95",
      "Kept by this filter",
      "Removed by this filter",
    ]);
    expect(found.fonts).toEqual([`font-family: ${FONT_STACK}`]);

    // toSVG adds nothing to the page that stays.
    expect(found.bodyUnchanged).toBe(true);
    // A removed bar is an outline, on the screen and in the file, and so
    // is the square of its row of the legend.
    expect(found.screenRemovedFill).toBe("none");
    expect(found.removed).toHaveLength(2);
    for (const style of [...found.removed, ...found.legendRemoved]) {
      expect(style["fill"]).toBe("none");
      expect(style["stroke"]).toBe(LIGHT_AXIS);
    }
    expect(found.legendRemoved).toHaveLength(1);
    // The threshold, a dashed line in the red of the light theme.
    expect(found.thresholds).toHaveLength(1);
    for (const style of found.thresholds) {
      expect(style["stroke"]).toBe(LIGHT_THRESHOLD);
      expect(style["stroke-width"]).toBe("2px");
      expect(style["stroke-dasharray"]).toBe("4px, 3px");
    }
    // The texts, at the sizes of charts.css, and the legend ending at its
    // mark.
    expect(found.legendTexts).toHaveLength(3);
    for (const style of found.legendTexts) {
      expect(style["text-anchor"]).toBe("end");
      expect(style["font-size"]).toBe("12px");
    }
    expect(found.tickTexts.length).toBeGreaterThan(0);
    for (const style of found.tickTexts) {
      expect(style["font-size"]).toBe("12px");
    }
    expect(found.axisLabels).toHaveLength(2);
    for (const style of found.axisLabels) {
      expect(style["font-size"]).toBe("13px");
      expect(style["text-anchor"]).toBe("middle");
    }
  }
});

test("VS4 D3 toPNG(3) of a plot of 600 by 375 pixels is a PNG of 1,800 by 1,125 pixels", async ({
  page,
}) => {
  await openPlots(page);
  await draw(page, 600, 375);
  expect(await png(page, 3)).toEqual({
    made: true,
    type: "image/png",
    signature: PNG_SIGNATURE,
    width: 1800,
    height: 1125,
  });
});

test("VS4 D3 a plot 1,400 pixels wide: toPNG(3) rejects with tooLarge, and toPNG(2) gives 2,800 pixels", async ({
  page,
}) => {
  await openPlots(page);
  await draw(page, 1400, 875);
  await countDrawing(page);
  expect(await png(page, 3)).toEqual({ made: false, kind: "tooLarge" });
  expect(await drawingCounts(page)).toEqual({
    urls: 0,
    revoked: 0,
    contexts: 0,
  });
  expect(await png(page, 2)).toEqual({
    made: true,
    type: "image/png",
    signature: PNG_SIGNATURE,
    width: 2800,
    height: 1750,
  });
  expect(await drawingCounts(page)).toEqual({
    urls: 1,
    revoked: 1,
    contexts: 1,
  });
  // The canvas is freed once the PNG is made.
  expect(await canvasSizes(page)).toEqual([[0, 0]]);
});

test("VS4 D3 toPNG(2) of a plot above 2,048 pixels a side rejects with tooLarge without drawing", async ({
  page,
}) => {
  await openPlots(page);
  await draw(page, 2049, 1281);
  await countDrawing(page);
  expect(await png(page, 2)).toEqual({ made: false, kind: "tooLarge" });
  expect(await drawingCounts(page)).toEqual({
    urls: 0,
    revoked: 0,
    contexts: 0,
  });
});

test("VS4 D3 a plot 1,400 pixels high and 1,000 wide: toPNG(3) rejects with tooLarge without drawing", async ({
  page,
}) => {
  // The height, 4,200 pixels at that scale, is above 4,096, and the width,
  // 3,000, is not.
  await openPlots(page);
  await draw(page, 1000, 1400);
  await countDrawing(page);
  expect(await png(page, 3)).toEqual({ made: false, kind: "tooLarge" });
  expect(await drawingCounts(page)).toEqual({
    urls: 0,
    revoked: 0,
    contexts: 0,
  });
});

test("VS4 D3 toPNG(2) of a plot of 2,048 by 1,280 pixels, 4,096 pixels wide at that scale, is made", async ({
  page,
}) => {
  await openPlots(page);
  await draw(page, 2048, 1280);
  expect(await png(page, 2)).toEqual({
    made: true,
    type: "image/png",
    signature: PNG_SIGNATURE,
    width: 4096,
    height: 2560,
  });
});

test("VS4 D3 an image not decoded, a canvas that gives no PNG or throws, or no context, rejects with notMade", async ({
  page,
}) => {
  await openPlots(page);
  await draw(page, 600, 375);
  await countDrawing(page);
  await page.evaluate(() => {
    const decode = Object.getOwnPropertyDescriptor(
      HTMLImageElement.prototype,
      "decode",
    );
    Object.assign(window, { realDecode: decode });
    HTMLImageElement.prototype.decode = function noDecode() {
      return Promise.reject(new DOMException("Not decoded", "EncodingError"));
    };
  });
  expect(await png(page, 3)).toEqual({ made: false, kind: "notMade" });

  await page.evaluate(() => {
    const { realDecode } = window as unknown as {
      realDecode: PropertyDescriptor;
    };
    Object.defineProperty(HTMLImageElement.prototype, "decode", realDecode);
    const drawImage = Object.getOwnPropertyDescriptor(
      CanvasRenderingContext2D.prototype,
      "drawImage",
    );
    Object.assign(window, { realDrawImage: drawImage });
    CanvasRenderingContext2D.prototype.drawImage = function noDraw() {
      throw new DOMException("Not drawn", "InvalidStateError");
    };
  });
  expect(await png(page, 3)).toEqual({ made: false, kind: "notMade" });

  await page.evaluate(() => {
    const { realDrawImage } = window as unknown as {
      realDrawImage: PropertyDescriptor;
    };
    Object.defineProperty(
      CanvasRenderingContext2D.prototype,
      "drawImage",
      realDrawImage,
    );
    HTMLCanvasElement.prototype.toBlob = function noBlob(callback) {
      callback(null);
    };
  });
  expect(await png(page, 3)).toEqual({ made: false, kind: "notMade" });

  // What a canvas tainted by its image does.
  await page.evaluate(() => {
    HTMLCanvasElement.prototype.toBlob = function tainted() {
      throw new DOMException("Tainted canvas", "SecurityError");
    };
  });
  expect(await png(page, 3)).toEqual({ made: false, kind: "notMade" });

  await page.evaluate(() => {
    HTMLCanvasElement.prototype.getContext = function noContext() {
      return null;
    };
  });
  expect(await png(page, 2)).toEqual({ made: false, kind: "notMade" });
  // Every URL made is revoked, the PNG refused or not, and every canvas
  // that had a context is freed.
  expect(await drawingCounts(page)).toMatchObject({ urls: 5, revoked: 5 });
  expect(await canvasSizes(page)).toEqual([
    [0, 0],
    [0, 0],
    [0, 0],
  ]);
});

test("VS4 D3 toPNG draws nothing until the fonts of the page are ready", async ({
  page,
}) => {
  await openPlots(page);
  await draw(page, 600, 375);
  await countDrawing(page);
  const waiting = await page.evaluate(async () => {
    const plots = window.plotsPage;
    if (plots === undefined) throw new Error("e2e/plots.html has not run.");
    let fontsLoaded: () => void = () => undefined;
    const ready = new Promise<void>((resolve) => {
      fontsLoaded = resolve;
    });
    let readyRead = 0;
    let loaded = false;
    Object.defineProperty(document.fonts, "ready", {
      configurable: true,
      get: () => {
        readyRead += 1;
        return ready;
      },
    });
    // Each URL of a Blob and each context of a canvas asked for before the
    // fonts are loaded is counted as it is made, so that the test does not
    // rest on how long the browser takes to decode and draw the image.
    const early = { urls: 0, contexts: 0 };
    const createObjectURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (object) => {
      if (!loaded) early.urls += 1;
      return createObjectURL(object);
    };
    const prototype = HTMLCanvasElement.prototype;
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with apply, on the canvas it was called on
    const getContext = prototype.getContext;
    prototype.getContext = function earlyContext(
      this: HTMLCanvasElement,
      ...args: Parameters<HTMLCanvasElement["getContext"]>
    ) {
      if (!loaded) early.contexts += 1;
      return getContext.apply(this, args);
    } as HTMLCanvasElement["getContext"];
    const made = plots.handle().toPNG(3);
    // A task of its own, after every promise that toPNG settles without
    // the fonts.
    await new Promise((resolve) => setTimeout(resolve, 0));
    loaded = true;
    fontsLoaded();
    const blob = await made;
    const counts = (window as unknown as { drawingCounts: DrawingCounts })
      .drawingCounts;
    return { readyRead, early, after: { ...counts }, type: blob.type };
  });
  expect(waiting.readyRead).toBeGreaterThan(0);
  expect(waiting.early).toEqual({ urls: 0, contexts: 0 });
  expect(waiting.after).toEqual({ urls: 1, revoked: 1, contexts: 1 });
  expect(waiting.type).toBe("image/png");
});

test("VS4 D3 a change of theme while the plot is on the screen draws nothing again, and a later toSVG is light", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openPlots(page);
  await draw(page, 600, 375);
  const found = await page.evaluate(async () => {
    const plots = window.plotsPage;
    if (plots === undefined) throw new Error("e2e/plots.html has not run.");
    const svg = plots.element().querySelector("svg");
    if (svg === null) throw new Error("The plot has no SVG.");
    const kept = svg.querySelector(".chart-bar-kept");
    if (kept === null) throw new Error("The plot has no kept bar.");
    const lightFill = getComputedStyle(kept).fill;
    let mutations = 0;
    const observer = new MutationObserver((records) => {
      mutations += records.length;
    });
    observer.observe(svg, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    document.documentElement.dataset["theme"] = "dark";
    // Two frames of the screen, in which a redraw would have run.
    for (let frame = 0; frame < 2; frame += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    observer.disconnect();
    const darkFill = getComputedStyle(kept).fill;
    const file = new DOMParser().parseFromString(
      plots.handle().toSVG(),
      "image/svg+xml",
    );
    return {
      lightFill,
      darkFill,
      mutations,
      exported: [...file.querySelectorAll(".chart-bar-kept")].map(
        (bar) => bar.getAttribute("style") ?? "",
      ),
    };
  });
  expect(found.lightFill).toBe(LIGHT_BAR);
  expect(found.darkFill).toBe(DARK_BAR);
  expect(found.mutations).toBe(0);
  expect(found.exported).toHaveLength(18);
  for (const style of found.exported) {
    expect(style).toContain(`fill: ${LIGHT_BAR}`);
  }
});

test("VS4 D3 a resize draws the plot again at its new size, and after destroy the element is empty", async ({
  page,
}) => {
  await openPlots(page);
  await draw(page, 600, 375);
  const svg = page.locator("#plots svg");
  await expect(svg).toHaveAttribute("width", "600");

  await page.evaluate(() => {
    const plots = window.plotsPage;
    if (plots === undefined) throw new Error("e2e/plots.html has not run.");
    const element = plots.element();
    element.style.width = "400px";
    element.style.height = "250px";
  });
  await expect(svg).toHaveAttribute("width", "400");
  await expect(svg).toHaveAttribute("height", "250");
  await expect(svg).toHaveAttribute("viewBox", "0 0 400 250");
  expect(await png(page, 3)).toMatchObject({ width: 1200, height: 750 });

  const after = await page.evaluate(() => {
    const plots = window.plotsPage;
    if (plots === undefined) throw new Error("e2e/plots.html has not run.");
    plots.handle().destroy();
    plots.handle().destroy();
    let thrown = "";
    try {
      plots.handle().toSVG();
    } catch (error) {
      thrown = String(error);
    }
    return { children: plots.element().childNodes.length, thrown };
  });
  expect(after.children).toBe(0);
  expect(after.thrown).toContain("after its destroy");
});

test("VS4 D3 a plot whose element becomes 0 by 0 after a draw keeps its last drawing, which toSVG and toPNG export", async ({
  page,
}) => {
  await openPlots(page);
  await draw(page, 600, 375);
  const svg = page.locator("#plots svg");
  await expect(svg).toHaveAttribute("width", "600");

  const exported = await page.evaluate(async () => {
    const plots = window.plotsPage;
    if (plots === undefined) throw new Error("e2e/plots.html has not run.");
    const element = plots.element();
    element.style.width = "0px";
    element.style.height = "0px";
    // Three frames of the screen: the observer's call, and the frame in
    // which a redraw would have run.
    for (let frame = 0; frame < 3; frame += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    const file = new DOMParser().parseFromString(
      plots.handle().toSVG(),
      "image/svg+xml",
    );
    return {
      width: file.documentElement.getAttribute("width"),
      height: file.documentElement.getAttribute("height"),
      kept: file.querySelectorAll(".chart-bar-kept").length,
    };
  });

  expect(exported).toEqual({ width: "600", height: "375", kept: 18 });
  await expect(svg).toHaveAttribute("width", "600");
  expect(await png(page, 3)).toEqual({
    made: true,
    type: "image/png",
    signature: PNG_SIGNATURE,
    width: 1800,
    height: 1125,
  });
});

test("VS4 D3 at 320 pixels wide the three rows of the legend lie inside the SVG", async ({
  page,
}) => {
  await openPlots(page);
  await draw(page, 320, 200);
  const rows = await page.evaluate(() => {
    const plots = window.plotsPage;
    if (plots === undefined) throw new Error("e2e/plots.html has not run.");
    const svg = plots.element().querySelector("svg");
    if (svg === null) throw new Error("The plot has no SVG.");
    return [...svg.querySelectorAll<SVGGElement>(".chart-legend-row")].map(
      (row) => {
        // The box of the row in its own units, moved by its translation
        // into the units of the SVG, whose viewBox is its size in pixels.
        const box = row.getBBox();
        const move = row.transform.baseVal.consolidate()?.matrix;
        const x = box.x + (move?.e ?? 0);
        const y = box.y + (move?.f ?? 0);
        return {
          text: row.querySelector("text")?.textContent,
          left: x,
          top: y,
          right: x + box.width,
          bottom: y + box.height,
        };
      },
    );
  });
  expect(rows.map((row) => row.text)).toEqual([
    "Maximum 0.95",
    "Kept by this filter",
    "Removed by this filter",
  ]);
  for (const row of rows) {
    expect(row.left).toBeGreaterThanOrEqual(0);
    expect(row.top).toBeGreaterThanOrEqual(0);
    expect(row.right).toBeLessThanOrEqual(320);
    expect(row.bottom).toBeLessThanOrEqual(200);
  }
});

// ---------------------------------------------------------------------
// The scatter of the PCA (docs/specs/charts/scatter.md, "How it is
// verified", "In Playwright"): what jsdom cannot see, where the browser
// puts the pointer, where the tooltip lands and what the pointer does on
// it, a tap, the colours of the file, its PNG and the times.

/** The name of point 0 of the page's scatter, markup shown as text. */
const MARKUP_NAME = '<img src=x onerror="window.plotsInjected = true">';
/** The distance of the tooltip's nearest corner from its point, across and down. */
const TOOLTIP_OFFSET = 6;
/** The colour of the first group, --chart-cat-1, #e69f00. */
const FIRST_GROUP: readonly [number, number, number] = [230, 159, 0];
/** The legend of the page's scatter: its title, then each group with its count. */
const SCATTER_LEGEND = [
  "Population",
  "P1 (1,877)",
  "P2 (1,876)",
  "P3 (1,875)",
  "<b>P4</b> (1,876)",
  "No population (1,877)",
];
/** The white of the background of the light theme, as channels. */
const WHITE: readonly [number, number, number] = [255, 255, 255];

/** True when each channel of `pixel` is within 8 of `colour`. */
function near(
  pixel: readonly number[],
  colour: readonly [number, number, number],
): boolean {
  return colour.every(
    (channel, index) => Math.abs((pixel[index] ?? -99) - channel) <= 8,
  );
}

/** A point of the viewport, in CSS pixels. */
interface At {
  readonly x: number;
  readonly y: number;
}

/** Draws the scatter of 9,381 points in an element of `width` by `height`. */
async function drawScatter(
  page: Page,
  width: number,
  height: number,
): Promise<void> {
  await page.evaluate(
    ([w, h]) => {
      const plots = window.plotsPage;
      if (plots === undefined) throw new Error("e2e/plots.html has not run.");
      plots.drawScatter(w, h);
    },
    [width, height] as const,
  );
}

/** Where point `index` of the scatter is in the viewport, as the page computes it. */
async function pointAt(page: Page, index: number): Promise<At> {
  return page.evaluate((point) => {
    const plots = window.plotsPage;
    if (plots === undefined) throw new Error("e2e/plots.html has not run.");
    return plots.pointPixel(point);
  }, index);
}

/** The distance from `at` to the nearest point of the scatter but `except`. */
async function nearestDistance(
  page: Page,
  at: At,
  except?: number,
): Promise<number> {
  return page.evaluate(
    ([x, y, leftOut]) => {
      const plots = window.plotsPage;
      if (plots === undefined) throw new Error("e2e/plots.html has not run.");
      return leftOut === null
        ? plots.nearestDistance(x, y)
        : plots.nearestDistance(x, y, leftOut);
    },
    [at.x, at.y, except ?? null] as const,
  );
}

/** The calls of onHover since the scatter was drawn. */
async function hovers(page: Page): Promise<(number | null)[]> {
  return page.evaluate(() => {
    const plots = window.plotsPage;
    if (plots === undefined) throw new Error("e2e/plots.html has not run.");
    return plots.hovers();
  });
}

/**
 * Point 0 of the scatter, and a place 60 pixels left of it and 14 below,
 * which the test checks is 30 pixels from every point; a pointer that
 * goes there from the tooltip of point 0, which lies right of and below
 * it, passes no nearer than 14 pixels to point 0.
 */
async function pointZeroAndAway(page: Page): Promise<{ zero: At; away: At }> {
  const zero = await pointAt(page, 0);
  const away = { x: zero.x - 60, y: zero.y + 14 };
  expect(await nearestDistance(page, zero, 0)).toBeGreaterThanOrEqual(30);
  expect(await nearestDistance(page, away)).toBeGreaterThanOrEqual(30);
  return { zero, away };
}

test("IP7 D3 the pointer at the pixel of point 0 shows its tooltip 6 pixels right of and below it, its name of markup as text, and calls onHover with 0; 30 pixels from every point the tooltip is hidden and onHover called with null", async ({
  page,
}) => {
  await openPlots(page);
  await drawScatter(page, 600, 450);
  const { zero, away } = await pointZeroAndAway(page);
  const tooltip = page.locator(".chart-tooltip");

  // 11 pixels from point 0 is beyond the 10 within which it is under the
  // pointer: nothing is shown.
  await page.mouse.move(zero.x - 11, zero.y);
  await expect(page.locator("#plots path.chart-hover")).toHaveCount(0);
  expect(await hovers(page)).toEqual([]);

  await page.mouse.move(zero.x, zero.y);
  await expect(tooltip).toBeVisible();
  await expect(tooltip.locator("div")).toHaveText([
    MARKUP_NAME,
    "Population: P1",
    "PC1 0, PC2 1.1",
  ]);
  await expect(tooltip.locator("img")).toHaveCount(0);
  await expect(tooltip).toHaveAttribute("aria-hidden", "true");
  // The corner nearest the point square, and the others rounded.
  await expect(tooltip).toHaveCSS("border-top-left-radius", "0px");
  await expect(tooltip).toHaveCSS("border-bottom-right-radius", "4px");
  await expect(page.locator("#plots path.chart-hover")).toHaveCount(1);
  expect(await hovers(page)).toEqual([0]);
  const box = await tooltip.boundingBox();
  if (box === null) throw new Error("The tooltip is not laid out.");
  expect(box.x).toBeCloseTo(zero.x + TOOLTIP_OFFSET, 0);
  expect(box.y).toBeCloseTo(zero.y + TOOLTIP_OFFSET, 0);

  await page.mouse.move(away.x, away.y);
  await expect(tooltip).toBeHidden();
  await expect(page.locator("#plots path.chart-hover")).toHaveCount(0);
  expect(await hovers(page)).toEqual([0, null]);
  expect(await page.evaluate(() => window.plotsPage?.markupRan() ?? true)).toBe(
    false,
  );
});

test("IP7 D3 the tooltip of a point at the bottom right corner of the frame lies left of and above it, inside the plot", async ({
  page,
}) => {
  await openPlots(page);
  await drawScatter(page, 600, 450);
  const corner = await pointAt(page, 1);
  expect(await nearestDistance(page, corner, 1)).toBeGreaterThanOrEqual(30);
  const tooltip = page.locator(".chart-tooltip");

  await page.mouse.move(corner.x, corner.y);
  await expect(tooltip).toBeVisible();
  await expect(tooltip.locator("div").first()).toHaveText("ind1");
  expect(await hovers(page)).toEqual([1]);
  await expect(tooltip).toHaveCSS("border-bottom-right-radius", "0px");
  await expect(tooltip).toHaveCSS("border-top-left-radius", "4px");
  const box = await tooltip.boundingBox();
  const plot = await page.locator("#plots > div").boundingBox();
  if (box === null || plot === null) throw new Error("Nothing is laid out.");
  expect(box.x + box.width).toBeCloseTo(corner.x - TOOLTIP_OFFSET, 0);
  expect(box.y + box.height).toBeCloseTo(corner.y - TOOLTIP_OFFSET, 0);
  expect(box.x).toBeGreaterThanOrEqual(plot.x);
  expect(box.y).toBeGreaterThanOrEqual(plot.y);
});

test("IP7 D3 the pointer moved from point 0 onto its tooltip in 10 steps keeps it, off it away from every point or out of the plot hides it, and Escape with the focus in a text field hides it and leaves the field its focus and text", async ({
  page,
}) => {
  await openPlots(page);
  await drawScatter(page, 600, 450);
  const { zero, away } = await pointZeroAndAway(page);
  const tooltip = page.locator(".chart-tooltip");
  // 14 pixels right of and below point 0, inside the tooltip, whose
  // corner is at 6 and 6: the line there passes through that corner, 8.5
  // pixels from the point, as a hand going straight to the tooltip does.
  const onTooltip = { x: zero.x + 14, y: zero.y + 14 };

  await page.mouse.move(zero.x, zero.y);
  await expect(tooltip).toBeVisible();
  await page.mouse.move(onTooltip.x, onTooltip.y, { steps: 10 });
  await expect(tooltip).toBeVisible();
  expect(await hovers(page)).toEqual([0]);

  await page.mouse.move(away.x, away.y, { steps: 10 });
  await expect(tooltip).toBeHidden();
  expect(await hovers(page)).toEqual([0, null]);

  // From the tooltip out of the plot's element in one movement, so that
  // the overlay never hears the pointer leave.
  const plot = await page.locator("#plots > div").boundingBox();
  if (plot === null) throw new Error("The plot is not laid out.");
  await page.mouse.move(zero.x, zero.y);
  await page.mouse.move(onTooltip.x, onTooltip.y, { steps: 10 });
  await expect(tooltip).toBeVisible();
  await page.mouse.move(plot.x + plot.width + 100, onTooltip.y);
  await expect(tooltip).toBeHidden();
  expect(await hovers(page)).toEqual([0, null, 0, null]);

  // Escape, with the focus in a text field of the page.
  await page.evaluate(() => {
    const field = document.createElement("input");
    field.type = "text";
    field.setAttribute("aria-label", "A field of the page");
    document.body.append(field);
  });
  const field = page.getByLabel("A field of the page");
  await field.focus();
  await page.keyboard.type("P1, 0.5");
  await page.mouse.move(zero.x, zero.y);
  await expect(tooltip).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tooltip).toBeHidden();
  await expect(page.locator("#plots path.chart-hover")).toHaveCount(0);
  await expect(field).toBeFocused();
  await expect(field).toHaveValue("P1, 0.5");
  expect(await hovers(page)).toEqual([0, null, 0, null, 0, null]);
  // It stays hidden while the pointer stays near the point, and comes
  // back once the pointer has left every point.
  await page.mouse.move(zero.x + 2, zero.y + 1);
  await expect(tooltip).toBeHidden();
  await page.mouse.move(away.x, away.y);
  await page.mouse.move(zero.x, zero.y);
  await expect(tooltip).toBeVisible();
  expect(await hovers(page)).toEqual([0, null, 0, null, 0, null, 0]);
});

test("IP7 D3 the pointer that leaves the tooltip onto the margin above the frame hides it and calls onHover with null", async ({
  page,
}) => {
  await openPlots(page);
  await drawScatter(page, 600, 450);
  const { zero } = await pointZeroAndAway(page);
  const tooltip = page.locator(".chart-tooltip");
  const plot = await page.locator("#plots > div").boundingBox();
  if (plot === null) throw new Error("The plot is not laid out.");
  const onTooltip = { x: zero.x + 14, y: zero.y + 14 };

  await page.mouse.move(zero.x, zero.y);
  await page.mouse.move(onTooltip.x, onTooltip.y, { steps: 10 });
  await expect(tooltip).toBeVisible();
  // Straight up from the tooltip into the margin, 4 pixels below the top
  // of the plot's content, where neither the overlay nor the element
  // hears a leave.
  await page.mouse.move(onTooltip.x, plot.y + 8 + 4);
  await expect(tooltip).toBeHidden();
  await expect(page.locator("#plots path.chart-hover")).toHaveCount(0);
  expect(await hovers(page)).toEqual([0, null]);
});

test("IP7 D3 in a plot 304 pixels wide, a tooltip that fits on neither side of its point lies inside the plot", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await openPlots(page);
  await drawScatter(page, 288, 212);
  const zero = await pointAt(page, 0);
  const tooltip = page.locator(".chart-tooltip");
  await page.mouse.move(zero.x, zero.y);
  await expect(tooltip).toBeVisible();
  const box = await tooltip.boundingBox();
  const plot = await page.locator("#plots > div").boundingBox();
  if (box === null || plot === null) throw new Error("Nothing is laid out.");
  expect(plot.width).toBe(304);
  expect(box.x).toBeGreaterThanOrEqual(plot.x);
  expect(box.x + box.width).toBeLessThanOrEqual(plot.x + plot.width);
  expect(box.y).toBeGreaterThanOrEqual(plot.y);
});

test("IP7 D3 in the clusters, the pointer reaches the tooltip of each of 20 points in 10 steps, and it is still that point's", async ({
  page,
}) => {
  await openPlots(page);
  await drawScatter(page, 600, 450);
  const { away } = await pointZeroAndAway(page);
  const tooltip = page.locator(".chart-tooltip");
  // The first 20 points from point 3 on, of the four populations and
  // none, in their clusters, with no other point within 2 pixels: the
  // browser may round the pointer to the pixel, and a point nearer than
  // that could then be the one under it.
  let reached = 0;
  for (let point = 3; reached < 20; point++) {
    const at = await pointAt(page, point);
    if ((await nearestDistance(page, at, point)) < 2) continue;
    reached += 1;
    await page.mouse.move(away.x, away.y);
    await page.mouse.move(at.x, at.y);
    await expect(tooltip.locator("div").first()).toHaveText(
      `ind${String(point)}`,
    );
    const box = await tooltip.boundingBox();
    if (box === null) throw new Error("The tooltip is not laid out.");
    // 6 pixels inside the corner of the tooltip nearest the point, which
    // is 6 pixels across and down from it on the side it lies.
    const across = box.x > at.x ? 1 : -1;
    const down = box.y > at.y ? 1 : -1;
    await page.mouse.move(at.x + across * 12, at.y + down * 12, {
      steps: 10,
    });
    await expect(tooltip).toBeVisible();
    await expect(tooltip.locator("div").first()).toHaveText(
      `ind${String(point)}`,
    );
  }
});

test.describe("on a screen of touch", () => {
  test.use({ hasTouch: true });

  test("IP7 D3 a tap on point 0 shows its tooltip, and a tap on the plot away from every point hides it", async ({
    page,
  }) => {
    await openPlots(page);
    await drawScatter(page, 600, 450);
    const { zero, away } = await pointZeroAndAway(page);
    const tooltip = page.locator(".chart-tooltip");

    await page.touchscreen.tap(zero.x, zero.y);
    await expect(tooltip).toBeVisible();
    await expect(tooltip.locator("div").first()).toHaveText(MARKUP_NAME);
    expect(await hovers(page)).toEqual([0]);

    await page.touchscreen.tap(away.x, away.y);
    await expect(tooltip).toBeHidden();
    expect(await hovers(page)).toEqual([0, null]);
  });
});

test("IP7 D3 toSVG of the scatter has no overlay, no mark of the hover and no var(, holds the legend as text with round joins, and its PNG at 3 times has the colour of the first group at the centre of its mark", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openPlots(page);
  await drawScatter(page, 600, 450);
  const zero = await pointAt(page, 0);
  await page.mouse.move(zero.x, zero.y);
  await expect(page.locator("#plots path.chart-hover")).toHaveCount(1);

  // The styles of charts.css as the browser computes them on the screen.
  const screen = await page.evaluate(() => {
    const plots = window.plotsPage;
    if (plots === undefined) throw new Error("e2e/plots.html has not run.");
    const element = plots.element();
    const style = (selector: string): CSSStyleDeclaration => {
      const found = element.querySelector(selector);
      if (found === null) throw new Error(`No ${selector} on the screen.`);
      return getComputedStyle(found);
    };
    const points = style("path.chart-points.chart-colour-0");
    const none = style("path.chart-points-none");
    const hover = style("path.chart-hover");
    const read = {
      // Green, colour 2, has no outline, and yellow, colour 3, has one
      // (stop C 2).
      greenStroke: style("path.chart-points.chart-colour-2").stroke,
      yellowStroke: style("path.chart-points.chart-colour-3").stroke,
      stroke: points.stroke,
      strokeWidth: points.strokeWidth,
      join: points.strokeLinejoin,
      fill: points.fill,
      noneFill: none.fill,
      noneStroke: none.stroke,
      hoverFill: hover.fill,
      hoverStroke: hover.stroke,
      hoverWidth: hover.strokeWidth,
      fadedOpacity: "",
      highlightedOpacity: "",
    };
    plots.highlight(1);
    read.fadedOpacity = style("path.chart-points-faded").opacity;
    read.highlightedOpacity = style("path.chart-colour-1").opacity;
    plots.highlight(null);
    return read;
  });
  expect(screen).toEqual({
    greenStroke: "none",
    yellowStroke: LIGHT_AXIS,
    stroke: LIGHT_AXIS,
    strokeWidth: "1px",
    join: "round",
    fill: "rgb(230, 159, 0)",
    noneFill: "none",
    noneStroke: LIGHT_AXIS,
    hoverFill: "none",
    hoverStroke: LIGHT_TEXT,
    hoverWidth: "2px",
    fadedOpacity: "0.25",
    highlightedOpacity: "1",
  });

  const found = await page.evaluate(async () => {
    const plots = window.plotsPage;
    if (plots === undefined) throw new Error("e2e/plots.html has not run.");
    const text = plots.handle().toSVG();
    const screenLegend = plots
      .element()
      .querySelectorAll(".chart-legend *").length;
    // The file laid out in the page, apart from the plot, to measure its
    // texts and find its marks.
    const holder = document.createElement("div");
    holder.innerHTML = text;
    document.body.append(holder);
    const root = holder.querySelector("svg");
    if (root === null) throw new Error("The file holds no svg.");
    const background = root.querySelector(".chart-legend-background");
    if (background === null) throw new Error("The legend has no background.");
    const backgroundLeft = Number(background.getAttribute("x"));
    const rowElements = [
      ...root.querySelectorAll<SVGGElement>(".chart-legend-row"),
    ];
    const rows = rowElements.map((row) => {
      const label = row.querySelector<SVGTextElement>("text");
      if (label === null) throw new Error("A row of the legend has no text.");
      const move = row.transform.baseVal.consolidate()?.matrix;
      const box = label.getBBox();
      const words = label.textContent;
      return {
        text: words,
        left: box.x + (move?.e ?? 0),
        width: label.getComputedTextLength(),
        characters: words.length,
      };
    });
    // The centre of the mark of the first entry, the row after the title:
    // the row's translation and its mark's, whose symbol is centred on 0.
    const firstRow = rowElements[1];
    const mark = firstRow?.querySelector<SVGPathElement>("path") ?? null;
    if (firstRow === undefined || mark === null) {
      throw new Error("The first entry of the legend has no mark.");
    }
    const rowMove = firstRow.transform.baseVal.consolidate()?.matrix;
    const markMove = mark.transform.baseVal.consolidate()?.matrix;
    const centre = {
      x: (rowMove?.e ?? 0) + (markMove?.e ?? 0),
      y: (rowMove?.f ?? 0) + (markMove?.f ?? 0),
    };
    const firstMarkClass = mark.getAttribute("class");
    holder.remove();
    // The middle of the ring of point 2, in the pixels of the plot's SVG.
    const ring = plots.pointPixel(2);
    const content = plots.element().getBoundingClientRect();
    const ringAt = {
      x: ring.x - content.left - 8,
      y: ring.y - content.top - 8,
    };

    const blob = await plots.handle().toPNG(3);
    const image = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("No context of a canvas.");
    context.drawImage(image, 0, 0);
    const pixelAt = (x: number, y: number): number[] => [
      ...context.getImageData(Math.round(3 * x), Math.round(3 * y), 1, 1).data,
    ];
    const pixel = pixelAt(centre.x, centre.y);
    const ringPixel = pixelAt(ringAt.x, ringAt.y);
    const file = new DOMParser().parseFromString(text, "image/svg+xml");
    const backgroundStyle =
      file.querySelector(".chart-legend-background")?.getAttribute("style") ??
      "";
    return {
      text,
      screenLegend,
      overlays: file.querySelectorAll(".chart-overlay").length,
      hovers: file.querySelectorAll(".chart-hover").length,
      markup: file.querySelectorAll("b, img").length,
      pointStyles: [...file.querySelectorAll("path.chart-points")].map(
        (path) => path.getAttribute("style") ?? "",
      ),
      firstMarkClass,
      firstMarkStyle:
        file
          .querySelector(".chart-legend path.chart-colour-0")
          ?.getAttribute("style") ?? "",
      backgroundLeft,
      rows,
      png: { width: image.width, height: image.height, pixel, ringPixel },
      backgroundStyle,
    };
  });

  expect(found.text).not.toContain("var(");
  expect(found.overlays).toBe(0);
  expect(found.hovers).toBe(0);
  expect(found.markup).toBe(0);
  expect(found.screenLegend).toBe(0);
  expect(found.rows.map((row) => row.text)).toEqual(SCATTER_LEGEND);
  // Five paths of the plot and five marks of the legend.
  expect(found.pointStyles).toHaveLength(10);
  for (const style of found.pointStyles) {
    expect(style).toContain("stroke-linejoin: round");
  }
  // Every text of the legend starts right of the left edge of its
  // background, reckoned at 7.2 pixels per character.
  for (const row of found.rows) {
    expect(row.left).toBeGreaterThanOrEqual(found.backgroundLeft);
  }
  process.stdout.write(
    `The legend of the scatter's file, text of 12 pixels, in ${test.info().project.name}: ${found.rows
      .map(
        (row) =>
          `"${row.text}" ${row.width.toFixed(1)} px, ${(row.width / row.characters).toFixed(2)} per character`,
      )
      .join("; ")}\n`,
  );

  expect(found.firstMarkClass).toContain("chart-colour-0");
  // The colour written on the legend's mark, and not only its pixel.
  expect(found.firstMarkStyle).toContain("fill: rgb(230, 159, 0)");
  expect([found.png.width, found.png.height]).toEqual([1800, 1350]);
  const [red, green, blue] = found.png.pixel;
  expect(Math.abs((red ?? -99) - FIRST_GROUP[0])).toBeLessThanOrEqual(8);
  expect(Math.abs((green ?? -99) - FIRST_GROUP[1])).toBeLessThanOrEqual(8);
  expect(Math.abs((blue ?? -99) - FIRST_GROUP[2])).toBeLessThanOrEqual(8);
  // A point in no population is a ring: its middle is the background.
  expect(near(found.png.ringPixel, WHITE)).toBe(true);
  expect(found.backgroundStyle).toContain("fill-opacity: 0.85");
  expect(found.backgroundStyle).toContain(`fill: ${LIGHT_BACKGROUND}`);
});

test("IP10 D3 a change of theme while the scatter is on the screen draws nothing again, and a later toSVG is in the light theme", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openPlots(page);
  await drawScatter(page, 600, 450);
  const found = await page.evaluate(async () => {
    const plots = window.plotsPage;
    if (plots === undefined) throw new Error("e2e/plots.html has not run.");
    const svg = plots.element().querySelector("svg");
    if (svg === null) throw new Error("The scatter has no SVG.");
    const first = svg.querySelector("path.chart-points.chart-colour-0");
    if (first === null) throw new Error("The scatter has no path of P1.");
    const lightStroke = getComputedStyle(first).stroke;
    let mutations = 0;
    const observer = new MutationObserver((records) => {
      mutations += records.length;
    });
    observer.observe(svg, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    document.documentElement.dataset["theme"] = "dark";
    // Two frames of the screen, in which a redraw would have run.
    for (let frame = 0; frame < 2; frame += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    observer.disconnect();
    const darkStroke = getComputedStyle(first).stroke;
    const file = new DOMParser().parseFromString(
      plots.handle().toSVG(),
      "image/svg+xml",
    );
    return {
      lightStroke,
      darkStroke,
      mutations,
      exported: [
        ...file.querySelectorAll(".chart-marks path.chart-colour-0"),
      ].map((path) => path.getAttribute("style") ?? ""),
      exportedGreen: [
        ...file.querySelectorAll(".chart-marks path.chart-colour-2"),
      ].map((path) => path.getAttribute("style") ?? ""),
    };
  });
  // The outline of the marks is --chart-axis, which the dark theme changes.
  expect(found.lightStroke).toBe(LIGHT_AXIS);
  expect(found.darkStroke).toBe("rgb(163, 171, 181)");
  expect(found.mutations).toBe(0);
  expect(found.exported).toHaveLength(1);
  for (const style of found.exported) {
    expect(style).toContain(`fill: rgb(${FIRST_GROUP.join(", ")})`);
    expect(style).toContain(`stroke: ${LIGHT_AXIS}`);
  }
  // Green, colour 2, is exported with no outline, as on the screen.
  expect(found.exportedGreen).toHaveLength(1);
  for (const style of found.exportedGreen) {
    expect(style).toContain("stroke: none");
  }
});

/** The median of `xs`, which is not empty. */
function median(xs: readonly number[]): number {
  const sorted = xs.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle] ?? Number.NaN;
  return sorted.length % 2 === 1
    ? upper
    : ((sorted[middle - 1] ?? Number.NaN) + upper) / 2;
}

test("IP7 D3 the times of the scatter of 9,381 points: from createScatter to the next frame, and of an update of the highlight, five times each", async ({
  page,
  browser,
  browserName,
}) => {
  test.setTimeout(60_000);
  await openPlots(page);
  const repeats = 5;
  const times = await page.evaluate(async (count) => {
    const plots = window.plotsPage;
    if (plots === undefined) throw new Error("e2e/plots.html has not run.");
    return plots.timeScatter(600, 450, count);
  }, repeats);
  expect(times.create).toHaveLength(repeats);
  expect(times.highlight).toHaveLength(repeats);
  for (const each of [...times.create, ...times.highlight]) {
    expect(each).toBeGreaterThan(0);
  }
  const ms = (xs: readonly number[]): string =>
    `median ${median(xs).toFixed(1)} ms (${xs.map((x) => x.toFixed(1)).join(", ")})`;
  const cpu = cpus()[0]?.model ?? "unknown";
  const memory = `${String(Math.round(totalmem() / 2 ** 30))} GB`;
  process.stdout.write(
    [
      `The scatter of 9,381 points in 5 groups, 600 by 450 pixels; ${browserName} ${browser.version()}, Playwright ${test.info().config.version}, ${cpu}, ${memory}; ${String(repeats)} times after one not counted`,
      `  createScatter to the next frame: ${ms(times.create)}`,
      `  the call of createScatter alone: ${ms(times.createCall)}`,
      `  update of the highlight to the next frame: ${ms(times.highlight)}`,
      `  the call of that update alone: ${ms(times.highlightCall)}`,
      "",
    ].join("\n"),
  );
});

// ---------------------------------------------------------------------
// The heatmap of the distances between populations
// (docs/specs/charts/heatmap.md, "How it is verified", "In Playwright"):
// what jsdom cannot see, the colours the exported file carries, where
// the tooltip lands and where the names and the legend lie in the SVG.

/**
 * The colours of viridis of the steps of the Fst of panel.nei, 239, 245
 * and 255, and of step 0, of interpolateViridis of d3-scale-chromatic
 * 3.1.0, "#d5e21a", "#e5e419", "#fde725" and "#440154".
 */
const VIRIDIS_239 = "rgb(213, 226, 26)";
const VIRIDIS_245 = "rgb(229, 228, 25)";
const VIRIDIS_255 = "rgb(253, 231, 37)";
const VIRIDIS_0 = "rgb(68, 1, 84)";
/** The text over the cells, black and white in both themes. */
const TEXT_ON_LIGHT = "rgb(0, 0, 0)";
const TEXT_ON_DARK = "rgb(255, 255, 255)";

/** The fonts of DejaVu Sans, the font of Ubuntu's runners, as wide as Verdana. */
const WIDE_FONTS = [
  { file: "DejaVuSans.woff2", weight: "100 500" },
  { file: "DejaVuSans-Bold.woff2", weight: "600 900" },
] as const;

/** Gives the page DejaVu Sans as the font of its text, and of the plots. */
async function useWideFont(page: Page): Promise<void> {
  const faces = await Promise.all(
    WIDE_FONTS.map(async ({ file, weight }) => {
      const bytes = await readFile(
        fileURLToPath(new URL(`fixtures/fonts/${file}`, import.meta.url)),
      );
      return `@font-face { font-family: "Wide test font"; font-weight: ${weight}; src: url(data:font/woff2;base64,${bytes.toString("base64")}) format("woff2"); }`;
    }),
  );
  await page.addStyleTag({
    content: `${faces.join("\n")}\n:root { --font-body: "Wide test font"; font-family: "Wide test font"; }`,
  });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

/** Draws the heatmap of `kind` in an element of `width` by `height`. */
async function drawHeatmap(
  page: Page,
  width: number,
  height: number,
  kind: HeatmapKind,
): Promise<void> {
  await page.evaluate(
    ([w, h, k]) => {
      const plots = window.plotsPage;
      if (plots === undefined) throw new Error("e2e/plots.html has not run.");
      plots.drawHeatmap(w, h, k);
    },
    [width, height, kind] as const,
  );
}

/** Where the middle of a cell of the heatmap is in the viewport. */
async function cellAt(page: Page, row: number, column: number): Promise<At> {
  return page.evaluate(
    ([r, c]) => {
      const plots = window.plotsPage;
      if (plots === undefined) throw new Error("e2e/plots.html has not run.");
      return plots.heatmapCell(r, c);
    },
    [row, column] as const,
  );
}

/** A text of the exported heatmap and the fill of its style. */
interface FileText {
  readonly text: string | null;
  readonly fill: string;
}

/** What toSVG of the heatmap drawn last writes on its cells and texts. */
interface HeatmapFile {
  readonly hasVar: boolean;
  readonly overlays: number;
  readonly hovers: number;
  /** Each path of cells: its fill attribute, and the fill of its style. */
  readonly cells: {
    readonly attribute: string | null;
    readonly fill: string;
  }[];
  /** Each value in a cell. */
  readonly texts: FileText[];
  /** The stroke and the fill of the path of the cells with no value. */
  readonly none: { readonly stroke: string; readonly fill: string } | null;
  /** The fill of the style of each band of the legend, from the top. */
  readonly bands: string[];
  /** The texts of the legend. */
  readonly legend: FileText[];
}

/** Calls toSVG of the heatmap drawn last, and reads the file. */
async function heatmapFile(page: Page): Promise<HeatmapFile> {
  return page.evaluate(() => {
    const plots = window.plotsPage;
    if (plots === undefined) throw new Error("e2e/plots.html has not run.");
    const text = plots.handle().toSVG();
    const root = new DOMParser().parseFromString(
      text,
      "image/svg+xml",
    ).documentElement;
    // The value of `property` in the style written on `each`.
    const styleOf = (each: Element, property: string): string =>
      (each.getAttribute("style") ?? "")
        .split(";")
        .map((declaration) => declaration.trim())
        .filter((declaration) => declaration.startsWith(`${property}:`))
        .map((declaration) => declaration.slice(property.length + 1).trim())
        .join("");
    const none = root.querySelector("path.chart-cell-none");
    return {
      hasVar: text.includes("var("),
      overlays: root.querySelectorAll(".chart-overlay").length,
      hovers: root.querySelectorAll(".chart-hover").length,
      cells: [...root.querySelectorAll("path.chart-cells")].map((path) => ({
        attribute: path.getAttribute("fill"),
        fill: styleOf(path, "fill"),
      })),
      texts: [...root.querySelectorAll("text.chart-cell-text")].map((each) => ({
        text: each.textContent,
        fill: styleOf(each, "fill"),
      })),
      none:
        none === null
          ? null
          : { stroke: styleOf(none, "stroke"), fill: styleOf(none, "fill") },
      bands: [...root.querySelectorAll("rect.chart-legend-band")]
        .toSorted(
          (a, b) => Number(a.getAttribute("y")) - Number(b.getAttribute("y")),
        )
        .map((band) => styleOf(band, "fill")),
      legend: [...root.querySelectorAll("text.chart-legend-text")].map(
        (each) => ({ text: each.textContent, fill: styleOf(each, "fill") }),
      ),
    };
  });
}

test("PA4 D3 toSVG of the heatmap of panel.nei, from a dark page, has on each cell and band its colour of viridis, on each value its black or white, no var(, no overlay and no mark of the hover", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await openPlots(page);
  await drawHeatmap(page, 640, 640, "panel");
  const cell = await cellAt(page, 0, 2);
  await page.mouse.move(cell.x, cell.y);
  await expect(page.locator("#plots path.chart-hover")).toHaveCount(1);

  const panel = await heatmapFile(page);
  expect(panel.hasVar).toBe(false);
  expect(panel.overlays).toBe(0);
  expect(panel.hovers).toBe(0);
  expect(panel.cells).toEqual([
    { attribute: "#d5e21a", fill: VIRIDIS_239 },
    { attribute: "#e5e419", fill: VIRIDIS_245 },
    { attribute: "#fde725", fill: VIRIDIS_255 },
  ]);
  expect(panel.texts).toHaveLength(6);
  for (const each of panel.texts) expect(each.fill).toBe(TEXT_ON_LIGHT);
  expect(panel.none).toBeNull();
  expect(panel.bands).toHaveLength(32);
  // The top band stands for the steps 248 to 255, the bottom one for 0
  // to 7, each the colour of its middle step, 252 and 4, "#f6e620" and
  // "#46075a".
  expect(panel.bands[0]).toBe("rgb(246, 230, 32)");
  expect(panel.bands[31]).toBe("rgb(70, 7, 90)");
  expect(panel.legend).toEqual([
    { text: "Hudson's Fst", fill: LIGHT_TEXT },
    { text: "0.1096", fill: LIGHT_TEXT },
    { text: "0.0000", fill: LIGHT_TEXT },
  ]);

  // The split panel: a negative pair in white on the colour of 0, and a
  // pair with no value, outlined in the colour of the axes.
  await drawHeatmap(page, 640, 640, "split");
  const split = await heatmapFile(page);
  expect(split.hasVar).toBe(false);
  expect(split.cells[0]).toEqual({ attribute: "#440154", fill: VIRIDIS_0 });
  expect(split.texts.filter((each) => each.text === "−0.0113")).toEqual([
    { text: "−0.0113", fill: TEXT_ON_DARK },
    { text: "−0.0113", fill: TEXT_ON_DARK },
  ]);
  expect(split.texts).toHaveLength(10);
  expect(split.none).toEqual({ stroke: LIGHT_AXIS, fill: "none" });
});

withAxe(
  "PA4 D3 the pointer on the cell of p2 and p1 outlines it and shows its tooltip beside its middle, Escape hides it, and axe finds nothing",
  async ({ page, makeAxeBuilder }) => {
    await openPlots(page);
    await drawHeatmap(page, 640, 640, "panel");
    const tooltip = page.locator(".chart-tooltip");
    const cell = await cellAt(page, 0, 2);

    await page.mouse.move(cell.x, cell.y);
    await expect(tooltip).toBeVisible();
    await expect(tooltip.locator("div")).toHaveText([
      "p2 and p1",
      "Hudson's Fst 0.1096",
    ]);
    await expect(tooltip).toHaveAttribute("aria-hidden", "true");
    const box = await tooltip.boundingBox();
    if (box === null) throw new Error("The tooltip is not laid out.");
    expect(box.x).toBeCloseTo(cell.x + TOOLTIP_OFFSET, 0);
    expect(box.y).toBeCloseTo(cell.y + TOOLTIP_OFFSET, 0);
    const outline = await page
      .locator("#plots path.chart-hover")
      .evaluate((path) => {
        const style = getComputedStyle(path);
        const rect = path.getBoundingClientRect();
        return {
          stroke: style.stroke,
          width: style.strokeWidth,
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
        };
      });
    expect(outline.stroke).toBe(LIGHT_TEXT);
    expect(outline.width).toBe("2px");
    expect(outline.x).toBeCloseTo(cell.x, 0);
    expect(outline.y).toBeCloseTo(cell.y, 0);
    expect(await makeAxeBuilder().analyze()).toHaveProperty("violations", []);

    // The pointer moved onto the tooltip keeps it.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
      steps: 5,
    });
    await expect(tooltip).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tooltip).toBeHidden();
    await expect(page.locator("#plots path.chart-hover")).toHaveCount(0);

    // The diagonal, the cell of p0 and p0, shows none.
    const diagonal = await cellAt(page, 1, 1);
    await page.mouse.move(diagonal.x, diagonal.y, { steps: 5 });
    await expect(tooltip).toBeHidden();
    expect(await makeAxeBuilder().analyze()).toHaveProperty("violations", []);
  },
);

test("PA4 D3 in DejaVu Sans, names of up to 26 characters under the columns and left of the rows, and the legend, lie inside the SVG, each slanted name ending under its column", async ({
  page,
}) => {
  await openPlots(page);
  await useWideFont(page);
  await drawHeatmap(page, 640, 640, "long");
  const found = await page.evaluate(() => {
    const plots = window.plotsPage;
    if (plots === undefined) throw new Error("e2e/plots.html has not run.");
    const svg = plots.element().querySelector("svg");
    if (svg === null) throw new Error("The plot has no SVG.");
    const frame = svg.getBoundingClientRect();
    // left, top, right and bottom in the pixels of the SVG.
    const boxOf = (each: Element): number[] => {
      const rect = each.getBoundingClientRect();
      return [
        rect.left - frame.left,
        rect.top - frame.top,
        rect.right - frame.left,
        rect.bottom - frame.top,
      ];
    };
    const texts = (selector: string): Element[] => [
      ...svg.querySelectorAll(selector),
    ];
    // Where the axis of the columns meets the middle of each column: the
    // origin of its tick, which d3-axis translates there.
    const origin = (each: Element): number[] => {
      const tick = each.parentElement;
      const matrix = tick instanceof SVGGElement ? tick.getScreenCTM() : null;
      return matrix === null
        ? [Number.NaN, Number.NaN]
        : [matrix.e - frame.left, matrix.f - frame.top];
    };
    return {
      width: frame.width,
      height: frame.height,
      font: getComputedStyle(svg).fontFamily,
      columns: texts("g.chart-axis-x g.tick text").map((each) => ({
        text: each.textContent,
        box: boxOf(each),
        origin: origin(each),
      })),
      rows: texts("g.chart-axis-y g.tick text").map((each) => ({
        text: each.textContent,
        box: boxOf(each),
      })),
      legend: texts("g.chart-legend text").map((each) => boxOf(each)),
      values: texts("text.chart-legend-value").map((each) => boxOf(each)),
      bars: texts("rect.chart-legend-band").map((each) => boxOf(each)),
    };
  });
  expect(found.font).toContain("Wide test font");
  const names = [
    "Andes_highland_2019",
    "Andes_lowland_valle…",
    "Coastal_north_2018",
    "Coastal_south_landr…",
    "Mesoamerica_wild_A",
    "Mesoamerica_wild_B_…",
    "Yucatan_peninsula_c…",
    "Amazonia_basin_2017",
  ];
  expect(found.columns.map((column) => column.text)).toEqual(names);
  expect(found.rows.map((row) => row.text)).toEqual(names);
  const inside = ([left, top, right, bottom]: number[]): boolean =>
    left !== undefined &&
    top !== undefined &&
    right !== undefined &&
    bottom !== undefined &&
    left >= 0 &&
    top >= 0 &&
    right <= found.width &&
    bottom <= found.height;
  for (const { text, box } of [...found.columns, ...found.rows]) {
    expect(inside(box), `${text} at ${box.join(", ")}`).toBe(true);
  }
  for (const box of found.legend) {
    expect(inside(box), `legend at ${box.join(", ")}`).toBe(true);
  }
  // The two numbers of the legend start right of its bar.
  const barRight = Math.max(...found.bars.map(([, , right = 0]) => right));
  expect(found.values).toHaveLength(2);
  for (const [left = 0] of found.values) {
    expect(left).toBeGreaterThanOrEqual(barRight);
  }
  // A slanted name ends where its column meets the axis: its right edge
  // within 8 pixels of the middle of the column, and its top from 0 to
  // 12 pixels below the axis.
  for (const { text, box, origin } of found.columns) {
    const [, top = Number.NaN, right = Number.NaN] = box;
    const [middle = Number.NaN, axis = Number.NaN] = origin;
    expect(Math.abs(right - middle), `${text} across`).toBeLessThanOrEqual(8);
    expect(top - axis, `${text} down`).toBeGreaterThanOrEqual(0);
    expect(top - axis, `${text} down`).toBeLessThanOrEqual(12);
  }
});

/** The line of pop_a, --chart-cat-1 of Okabe and Ito, #e69f00. */
const ORANGE: readonly [number, number, number] = [230, 159, 0];

/** Draws the line plot of `kind` in an element of `width` by `height`. */
async function drawLine(
  page: Page,
  width: number,
  height: number,
  kind: LineKind,
): Promise<void> {
  await page.evaluate(
    ([w, h, k]) => {
      const plots = window.plotsPage;
      if (plots === undefined) throw new Error("e2e/plots.html has not run.");
      plots.drawLine(w, h, k);
    },
    [width, height, kind] as const,
  );
}

/** The channels of "rgb(r, g, b)", as a browser computes a colour, 0 to 255. */
function channelsOf(colour: string): [number, number, number] {
  const found = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(colour);
  if (found === null) throw new Error(`${colour} is not a colour.`);
  const [red, green, blue] = found
    .slice(1)
    .map((part) => Number.parseInt(part, 10));
  if (red === undefined || green === undefined || blue === undefined) {
    throw new Error(`${colour} has no three channels.`);
  }
  return [red, green, blue];
}

/** The contrast ratio of two colours by the formula of WCAG 2.2, 1 to 21. */
function contrastOf(first: string, second: string): number {
  const luminance = (colour: string): number => {
    const [red = 0, green = 0, blue = 0] = channelsOf(colour).map((channel) => {
      const share = channel / 255;
      return share <= 0.04045
        ? share / 12.92
        : ((share + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const [lighter = 0, darker = 0] = [
    luminance(first),
    luminance(second),
  ].toSorted((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

test("PA4 D5 toSVG of the LD decay of ld.nei, from a dark page, is in the light theme: the line of pop_a in rgb(230, 159, 0) on a casing of the colour of the axes, 50 points each, the dashed lines of the half distances, and the legend of both populations, with no var(", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await openPlots(page);
  await drawLine(page, 600, 375, "ld");
  const found = await page.evaluate(() => {
    const plots = window.plotsPage;
    if (plots === undefined) throw new Error("e2e/plots.html has not run.");
    const screenAxis = plots
      .element()
      .querySelector("g.chart-axis-x path.domain");
    if (screenAxis === null) throw new Error("The plot has no axis.");
    const text = plots.handle().toSVG();
    const root = new DOMParser().parseFromString(
      text,
      "image/svg+xml",
    ).documentElement;
    // The value of `property` in the style written on `each`.
    const styleOf = (each: Element | null, property: string): string =>
      (each?.getAttribute("style") ?? "")
        .split(";")
        .map((declaration) => declaration.trim())
        .filter((declaration) => declaration.startsWith(`${property}:`))
        .map((declaration) => declaration.slice(property.length + 1).trim())
        .join("");
    const orange = root.querySelector(
      "g.chart-marks path.chart-line.chart-line-colour-0",
    );
    return {
      text,
      screenAxisStroke: getComputedStyle(screenAxis).stroke,
      axisWidth: styleOf(
        root.querySelector("g.chart-axis-x path.domain"),
        "stroke-width",
      ),
      line: [
        styleOf(orange, "stroke"),
        styleOf(orange, "stroke-width"),
        styleOf(orange, "fill"),
        styleOf(orange, "stroke-linejoin"),
      ],
      casings: [
        ...root.querySelectorAll("g.chart-marks path.chart-line-casing"),
      ].map((each) => [
        styleOf(each, "stroke"),
        styleOf(each, "stroke-width"),
        styleOf(each, "fill"),
      ]),
      points: [...root.querySelectorAll("g.chart-marks path.chart-points")].map(
        (path) => (path.getAttribute("d") ?? "").split("M").length - 1,
      ),
      markLines: [...root.querySelectorAll("line.chart-mark-line")].map(
        (line) => [styleOf(line, "stroke"), styleOf(line, "stroke-dasharray")],
      ),
      marks: root.querySelectorAll("path.chart-mark").length,
      legend: [...root.querySelectorAll("g.chart-legend-row")].map((row) => ({
        text: row.querySelector("text")?.textContent ?? null,
        fill: styleOf(row.querySelector("text"), "fill"),
        line: styleOf(row.querySelector("line.chart-line"), "stroke"),
        casings: row.querySelectorAll("line.chart-line-casing").length,
      })),
      ticks: [...root.querySelectorAll("g.chart-axis-x g.tick text")].map(
        (each) => each.textContent,
      ),
    };
  });
  // The page is dark: the axis on the screen is in the dark theme.
  expect(found.screenAxisStroke).toBe("rgb(163, 171, 181)");
  expect(found.text).not.toContain("var(");
  // No colour of the dark theme but the sky blue of its bars, which is
  // pop_b's in both themes.
  for (const colour of DARK_ONLY.filter((each) => each !== DARK_BAR)) {
    expect(found.text).not.toContain(colour);
  }
  // The class chart-line of the SVG widens nothing: the axis is 1 pixel.
  expect(found.axisWidth).toBe("1px");
  expect(found.line).toEqual(["rgb(230, 159, 0)", "2px", "none", "round"]);
  expect(found.casings).toEqual([
    [LIGHT_AXIS, "4px", "none"],
    [LIGHT_AXIS, "4px", "none"],
  ]);
  expect(found.points).toEqual([50, 50]);
  expect(found.markLines).toEqual([
    ["rgb(230, 159, 0)", "4px, 3px"],
    ["rgb(86, 180, 233)", "4px, 3px"],
  ]);
  expect(found.marks).toBe(2);
  expect(found.legend).toEqual([
    {
      text: "pop_a · half at 7,548 bp",
      fill: LIGHT_TEXT,
      line: "rgb(230, 159, 0)",
      casings: 1,
    },
    {
      text: "pop_b · half at 7,340 bp",
      fill: LIGHT_TEXT,
      line: "rgb(86, 180, 233)",
      casings: 1,
    },
  ]);
  expect(found.ticks).toEqual([
    "0",
    "20,000",
    "40,000",
    "60,000",
    "80,000",
    "100,000",
  ]);
});

test("PA4 D5 toPNG(2) of the LD decay in 600 by 375 pixels is a PNG of 1,200 by 750 pixels, orange on the piece of line of the first row of its legend", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openPlots(page);
  await drawLine(page, 600, 375, "ld");
  const found = await page.evaluate(async () => {
    const plots = window.plotsPage;
    if (plots === undefined) throw new Error("e2e/plots.html has not run.");
    // The piece of line of the first row, 2 pixels from its left end, in
    // the pixels of the SVG, from the row's translation.
    const row = plots.element().querySelector<SVGGElement>(".chart-legend-row");
    const piece = row?.querySelector("line.chart-line") ?? null;
    const move = row?.transform.baseVal.consolidate()?.matrix;
    if (piece === null || move === undefined) {
      throw new Error("The legend has no row with a line.");
    }
    const at = { x: move.e + Number(piece.getAttribute("x1")) + 2, y: move.f };
    const blob = await plots.handle().toPNG(2);
    const header = new DataView(await blob.arrayBuffer());
    const image = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("No context of a canvas.");
    context.drawImage(image, 0, 0);
    const pixel = context.getImageData(
      Math.round(2 * at.x),
      Math.round(2 * at.y),
      1,
      1,
    ).data;
    return {
      type: blob.type,
      signature: header.getUint32(0),
      width: header.getUint32(16),
      height: header.getUint32(20),
      pixel: [...pixel],
    };
  });
  expect(found.type).toBe("image/png");
  expect(found.signature).toBe(PNG_SIGNATURE);
  expect([found.width, found.height]).toEqual([1200, 750]);
  const [red, green, blue] = found.pixel;
  expect(Math.abs((red ?? -99) - ORANGE[0])).toBeLessThanOrEqual(8);
  expect(Math.abs((green ?? -99) - ORANGE[1])).toBeLessThanOrEqual(8);
  expect(Math.abs((blue ?? -99) - ORANGE[2])).toBeLessThanOrEqual(8);
});

test("PA4 D5 the lines of the four colours without a casing, green, blue, vermilion and reddish purple, are 3:1 or more on the background of the light and the dark theme", async ({
  page,
}) => {
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await openPlots(page);
    await drawLine(page, 600, 375, "noCasing");
    const found = await page.evaluate(() => {
      const plots = window.plotsPage;
      if (plots === undefined) throw new Error("e2e/plots.html has not run.");
      const marks = plots.element().querySelector("g.chart-marks");
      if (marks === null) throw new Error("The plot has no marks.");
      // The background of the theme, resolved by the browser as rgb().
      const probe = document.createElement("div");
      probe.style.color = "var(--color-background)";
      document.body.append(probe);
      const background = getComputedStyle(probe).color;
      probe.remove();
      return {
        background,
        lines: [...marks.querySelectorAll("path.chart-line")].map((line) => ({
          className: line.getAttribute("class"),
          stroke: getComputedStyle(line).stroke,
        })),
        casings: marks.querySelectorAll(".chart-line-casing").length,
      };
    });
    expect(found.background).toBe(
      theme === "light" ? LIGHT_BACKGROUND : "rgb(22, 24, 27)",
    );
    expect(found.casings).toBe(0);
    expect(found.lines.map((line) => line.className)).toEqual([
      "chart-line chart-line-colour-2",
      "chart-line chart-line-colour-4",
      "chart-line chart-line-colour-5",
      "chart-line chart-line-colour-6",
    ]);
    for (const line of found.lines) {
      expect(
        contrastOf(line.stroke, found.background),
        `${line.stroke} in the ${theme} theme`,
      ).toBeGreaterThanOrEqual(3);
    }
  }
});
