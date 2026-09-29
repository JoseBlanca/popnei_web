/**
 * The export of the plots in a browser, on the page of the tests of the
 * plots, e2e/plots.html, which draws the histogram of the MAF of
 * e2e/fixtures/panel.nei at the size a test sets
 * (docs/specs/charts/plot2d.md, "How it is verified"; histogram.md, the
 * legend at 320 pixels). No screen offers the export before stage 6, so
 * the tests call the handle through `page.evaluate`.
 */

import { cpus, totalmem } from "node:os";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { PngScale } from "../src/charts/types.ts";

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
