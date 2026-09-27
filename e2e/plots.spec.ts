/**
 * The export of the plots in a browser, on the page of the tests of the
 * plots, e2e/plots.html, which draws the histogram of the MAF of
 * e2e/fixtures/panel.nei at the size a test sets
 * (docs/specs/charts/plot2d.md, "How it is verified"; histogram.md, the
 * legend at 320 pixels). No screen offers the export before stage 6, so
 * the tests call the handle through `page.evaluate`.
 */

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
