/**
 * The 3D plot of the PCA in a browser, on the page of the tests of the
 * plots, e2e/plots.html (docs/specs/charts/pca3d.md, "How it is
 * verified", "In Playwright"): what jsdom cannot do, WebGL, the pixels of
 * the canvas, the pointer, the wheel, the loss of the context and the
 * export. No screen shows the 3D plot before the panel of the PCA, so the
 * tests call the handle through `page.evaluate`. In an engine that gives
 * no WebGL 2 each test is skipped, and says why: it was not run, and did
 * not pass.
 */

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { ViewName } from "../src/charts/pca3d.ts";
import type { Pca3dKind, ViewportPoint } from "./plotsPage.ts";
import { keepDrawingBuffer } from "./drawingBuffer.ts";

/** --chart-axis of the light theme, #555d68, and of the dark, #a3abb5. */
const LIGHT_AXIS = [85, 93, 104] as const;
const DARK_AXIS = [163, 171, 181] as const;
/** --chart-cat-1, the colour of the first group, #e69f00, and --chart-cat-2, #56b4e9. */
const ORANGE = [230, 159, 0] as const;
const SKY_BLUE = [86, 180, 233] as const;
/** The background of the light theme, --color-background, #ffffff. */
const WHITE = [255, 255, 255] as const;
/** The name of point 0 of the cloud: markup, which must show as text. */
const MARKUP_NAME = '<img src=x onerror="window.plotsInjected = true">';
/** The padding of the element of a plot of the page. */
const PADDING = 8;
/**
 * The style of a screenshot of the canvas, which hides the labels of the
 * lines: they are elements over the canvas, and their text, wider in
 * DejaVu Sans, the font of Ubuntu, than on a Mac, reached the square
 * read around a mark on GitHub's runners, where its pixels were counted
 * as the outline of the mark.
 */
const CANVAS_ONLY = ".chart-pca3d-label { visibility: hidden; }";

/** Opens the page of the plots, and skips the test where the engine gives no WebGL 2. */
async function openPlots(page: Page): Promise<void> {
  if (test.info().project.name === "webkit") {
    await page.addInitScript(keepDrawingBuffer);
  }
  await page.goto("e2e/plots.html");
  await page.waitForFunction(() => "plotsPage" in window);
  const webgl = await page.evaluate(() => window.plotsPage?.webgl() ?? false);
  test.skip(
    !webgl,
    `${test.info().project.name} gives no WebGL 2 here: the 3D plot cannot be drawn, and this test is not run.`,
  );
}

/** Draws the 3D plot of `kind` in an element whose content is `width` by `height`. */
async function drawPca3d(
  page: Page,
  width: number,
  height: number,
  kind: Pca3dKind,
): Promise<void> {
  await page.evaluate(
    async ([w, h, k]) => {
      const plots = window.plotsPage;
      if (plots === undefined) throw new Error("e2e/plots.html has not run.");
      await plots.drawPca3d(w, h, k);
    },
    [width, height, kind] as const,
  );
}

/** Where point `index` is in the viewport at `view` and a zoom of 1. */
async function pointAt(
  page: Page,
  index: number,
  view: ViewName,
): Promise<ViewportPoint> {
  return page.evaluate(
    ([point, at]) => {
      const plots = window.plotsPage;
      if (plots === undefined) throw new Error("e2e/plots.html has not run.");
      return plots.pca3dPixel(point, at);
    },
    [index, view] as const,
  );
}

/** The distance from point `index` to the nearest other point at `view`. */
async function nearestOther(
  page: Page,
  index: number,
  view: ViewName,
): Promise<number> {
  return page.evaluate(
    ([point, at]) => {
      const plots = window.plotsPage;
      if (plots === undefined) throw new Error("e2e/plots.html has not run.");
      return plots.pca3dNearest(point, at);
    },
    [index, view] as const,
  );
}

async function hovers(page: Page): Promise<(number | null)[]> {
  return page.evaluate(() => window.plotsPage?.hovers() ?? []);
}

/** Calls a turn of the handle of the 3D plot. */
async function turn(
  page: Page,
  call: "rotate" | "viewAlong" | "zoom",
  value: number,
): Promise<void> {
  await page.evaluate(
    ([name, argument]) => {
      const plot = window.plotsPage?.pca3d();
      if (plot === undefined) throw new Error("e2e/plots.html has not run.");
      switch (name) {
        case "rotate":
          plot.rotate("vertical", argument);
          break;
        case "viewAlong":
          if (argument !== 0 && argument !== 1 && argument !== 2) {
            throw new Error(`No component ${String(argument)}.`);
          }
          plot.viewAlong(argument);
          break;
        case "zoom":
          plot.zoom(argument);
          break;
      }
    },
    [call, value] as const,
  );
}

/** The `d` of each path of points of toSVG, in order. */
async function exportedPaths(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const plot = window.plotsPage?.pca3d();
    if (plot === undefined) throw new Error("e2e/plots.html has not run.");
    const file = new DOMParser().parseFromString(plot.toSVG(), "image/svg+xml");
    return [...file.querySelectorAll(".chart-marks path.chart-points")].map(
      (path) => path.getAttribute("d") ?? "",
    );
  });
}

/**
 * The centre of the mark of each point of the exported view of `five`,
 * each alone in its path, in the order of the populations: the middle of
 * the box of its path, laid out in the page.
 */
async function exportedCentres(
  page: Page,
): Promise<{ x: number; y: number }[]> {
  return page.evaluate(() => {
    const plot = window.plotsPage?.pca3d();
    if (plot === undefined) throw new Error("e2e/plots.html has not run.");
    const holder = document.createElement("div");
    holder.innerHTML = plot.toSVG();
    document.body.append(holder);
    const centres = [0, 1, 2, 3, 4].map((group) => {
      const path = holder.querySelector<SVGPathElement>(
        `.chart-marks path.chart-colour-${String(group)}`,
      );
      if (path === null) throw new Error(`No path of group ${String(group)}.`);
      const box = path.getBBox();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    });
    holder.remove();
    return centres;
  });
}

/** The ends of a line of toSVG, in the pixels of the file. */
interface LineEnds {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** The ends of the three lines of toSVG, the first component's first. */
async function exportedLines(page: Page): Promise<LineEnds[]> {
  return page.evaluate(() => {
    const plot = window.plotsPage?.pca3d();
    if (plot === undefined) throw new Error("e2e/plots.html has not run.");
    const file = new DOMParser().parseFromString(plot.toSVG(), "image/svg+xml");
    return [...file.querySelectorAll("line.chart-pca3d-axis")].map((line) => ({
      x1: Number(line.getAttribute("x1")),
      y1: Number(line.getAttribute("y1")),
      x2: Number(line.getAttribute("x2")),
      y2: Number(line.getAttribute("y2")),
    }));
  });
}

/** Gives the 3D plot drawn last the data of `kind` by its update. */
async function updatePca3d(page: Page, kind: Pca3dKind): Promise<void> {
  await page.evaluate((k) => {
    const plots = window.plotsPage;
    if (plots === undefined) throw new Error("e2e/plots.html has not run.");
    plots.pca3dUpdate(k);
  }, kind);
}

/** The indices of `values` from the smallest value to the largest. */
function orderOf(values: readonly number[]): number[] {
  return values
    .map((value, index) => ({ value, index }))
    .toSorted((a, b) => a.value - b.value)
    .map((each) => each.index);
}

/**
 * The colours of a screenshot of the canvas at `points` of the viewport,
 * read by the page from the PNG, at the pixel ratio of the screenshot.
 */
async function coloursAt(
  page: Page,
  points: readonly ViewportPoint[],
): Promise<number[][]> {
  const canvas = page.locator("#plots canvas");
  const box = await canvas.boundingBox();
  if (box === null) throw new Error("The canvas is not laid out.");
  const png = (await canvas.screenshot({ style: CANVAS_ONLY })).toString(
    "base64",
  );
  return page.evaluate(
    async ([data, at, left, top]) => {
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      const image = await createImageBitmap(
        new Blob([bytes], { type: "image/png" }),
      );
      const ratio = devicePixelRatio;
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      if (context === null) throw new Error("No context of a canvas.");
      context.drawImage(image, 0, 0);
      return at.map((point) => [
        ...context
          .getImageData(
            Math.floor((point.x - left) * ratio),
            Math.floor((point.y - top) * ratio),
            1,
            1,
          )
          .data.slice(0, 3),
      ]);
    },
    [png, points, box.x, box.y] as const,
  );
}

/** True when `colour` is within 8 of `expected` in each channel. */
function near(colour: readonly number[], expected: readonly number[]): boolean {
  return expected.every(
    (value, channel) => Math.abs((colour[channel] ?? -99) - value) <= 8,
  );
}

/**
 * The places on the line of the first component, in the view along the
 * third: the row of the origin, a pixel above and below, across the part
 * of the line left of the origin where no point of `five` lies.
 */
async function lineSamples(page: Page): Promise<ViewportPoint[]> {
  const box = await page.locator("#plots canvas").boundingBox();
  if (box === null) throw new Error("The canvas is not laid out.");
  const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const samples: ViewportPoint[] = [];
  for (let across = 20; across <= 60; across += 4) {
    for (const up of [-1, -0.5, 0, 0.5, 1]) {
      samples.push({ x: middle.x - across, y: middle.y + up });
    }
  }
  return samples;
}

test("IP8 D2 the 3D plot draws: its canvas holds pixels other than the background at the projected place of three points", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openPlots(page);
  await drawPca3d(page, 600, 450, "cloud");
  const canvas = page.locator("#plots canvas");
  await expect(canvas).toHaveAttribute("role", "img");
  await expect(canvas).toHaveAccessibleName("Principal components, in 3D");
  await expect(canvas).toHaveAccessibleDescription(
    "Principal components of 9,381 individuals in 3D, for the tests.",
  );
  const places = [
    await pointAt(page, 0, "start"),
    await pointAt(page, 1, "start"),
    await pointAt(page, 5, "start"),
  ];
  const box = await page.locator("#plots canvas").boundingBox();
  if (box === null) throw new Error("The canvas is not laid out.");
  const empty = { x: box.x + 3, y: box.y + box.height - 3 };
  const [zero, one, five, background] = await coloursAt(page, [
    ...places,
    empty,
  ]);
  expect(near(background ?? [], WHITE)).toBe(true);
  for (const colour of [zero, one, five]) {
    expect(near(colour ?? [], WHITE)).toBe(false);
  }
  // The labels at the ends of the lines, as text.
  await expect(page.locator("#plots .chart-pca3d-label")).toHaveText([
    "PC1 (3.55%)",
    "PC2 (3.40%)",
    "PC3 (1.89%)",
  ]);
});

test("IP8 D2 a drag across the plot and rotate('vertical', 15) each move the points of toSVG", async ({
  page,
}) => {
  await openPlots(page);
  await drawPca3d(page, 600, 450, "cloud");
  const start = await exportedPaths(page);
  const box = await page.locator("#plots canvas").boundingBox();
  if (box === null) throw new Error("The canvas is not laid out.");
  // From a place with no point, so that the drag is a turn and not a tap.
  const from = { x: box.x + 20, y: box.y + box.height - 20 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 80, from.y, { steps: 8 });
  await page.mouse.up();
  const dragged = await exportedPaths(page);
  // The runs of points from far to near change with the view, and so
  // may their number.
  expect(dragged.length).toBeGreaterThan(0);
  expect(dragged).not.toEqual(start);

  await turn(page, "rotate", 15);
  const turned = await exportedPaths(page);
  expect(turned).not.toEqual(dragged);
});

test("IP8 D2 after viewAlong(2) the order of the points across and up in toSVG is the order of their first and second coordinates", async ({
  page,
}) => {
  await openPlots(page);
  await drawPca3d(page, 600, 450, "five");
  await turn(page, "viewAlong", 2);
  const centres = await exportedCentres(page);
  const data = await page.evaluate(() => {
    const plots = window.plotsPage;
    if (plots === undefined) throw new Error("e2e/plots.html has not run.");
    const five = plots.pca3dData();
    return { x: [...five.x], y: [...five.y] };
  });
  const order = (values: readonly number[]): number[] =>
    values
      .map((value, index) => ({ value, index }))
      .toSorted((a, b) => a.value - b.value)
      .map((each) => each.index);
  expect(order(centres.map((centre) => centre.x))).toEqual(order(data.x));
  // Up is towards the top of the SVG, whose y grows downwards.
  expect(order(centres.map((centre) => -centre.y))).toEqual(order(data.y));

  // The labels at the positive ends: PC1 right of the centre, PC2 above.
  const canvas = await page.locator("#plots canvas").boundingBox();
  const first = await page
    .locator("#plots .chart-pca3d-label")
    .nth(0)
    .boundingBox();
  const second = await page
    .locator("#plots .chart-pca3d-label")
    .nth(1)
    .boundingBox();
  if (canvas === null || first === null || second === null) {
    throw new Error("Nothing is laid out.");
  }
  expect(first.x).toBeGreaterThan(canvas.x + canvas.width / 2 + 50);
  expect(second.y + second.height).toBeLessThan(
    canvas.y + canvas.height / 2 - 50,
  );

  // An update, here of the highlight, keeps the view.
  await page.evaluate(() => {
    window.plotsPage?.pca3dHighlight(0);
  });
  expect(await exportedCentres(page)).toEqual(centres);
});

test("IP10 D3 an update while the view is turned, to another colouring or to other components, keeps the view, and the labels of the lines change with the components", async ({
  page,
}) => {
  await openPlots(page);
  await drawPca3d(page, 600, 450, "five");
  await turn(page, "viewAlong", 2);
  const lines = await exportedLines(page);
  const five = await page.evaluate(() => {
    const plots = window.plotsPage;
    if (plots === undefined) throw new Error("e2e/plots.html has not run.");
    const data = plots.pca3dData();
    return { x: [...data.x], y: [...data.y] };
  });

  // Coloured by values: the same points, seen along the third component.
  await updatePca3d(page, "values");
  expect(await exportedLines(page)).toEqual(lines);

  // The first and second components swapped: the second now runs across
  // and the first up, the view still along the third.
  await updatePca3d(page, "swapped");
  const centres = await exportedCentres(page);
  expect(orderOf(centres.map((centre) => centre.x))).toEqual(orderOf(five.y));
  expect(orderOf(centres.map((centre) => -centre.y))).toEqual(orderOf(five.x));
  const [across] = await exportedLines(page);
  expect(across?.y1).toBe(across?.y2);
  await expect(page.locator("#plots .chart-pca3d-label")).toHaveText([
    "PC2 (3.40%)",
    "PC1 (3.55%)",
    "PC3 (1.89%)",
  ]);
});

test("IP8 D2 the pointer at the projected place of point 0 shows its tooltip with three coordinates and its name of markup as text, and calls onHover with 0; Escape hides it", async ({
  page,
}) => {
  await openPlots(page);
  await drawPca3d(page, 600, 450, "cloud");
  expect(await nearestOther(page, 0, "start")).toBeGreaterThanOrEqual(12);
  const zero = await pointAt(page, 0, "start");
  const tooltip = page.locator(".chart-tooltip");

  await page.mouse.move(zero.x, zero.y);
  await expect(tooltip).toBeVisible();
  await expect(tooltip.locator("div")).toHaveText([
    MARKUP_NAME,
    "Population: P1",
    "PC1 0, PC2 1.1, PC3 0.9",
  ]);
  await expect(tooltip.locator("img")).toHaveCount(0);
  expect(await hovers(page)).toEqual([0]);
  // Its nearest corner 6 pixels across and 6 up or down from the point,
  // on the side where it fits in the plot, as in the scatter.
  const shown = await tooltip.boundingBox();
  if (shown === null) throw new Error("The tooltip is not laid out.");
  const across = Math.min(
    Math.abs(shown.x - (zero.x + 6)),
    Math.abs(shown.x + shown.width - (zero.x - 6)),
  );
  const down = Math.min(
    Math.abs(shown.y - (zero.y + 6)),
    Math.abs(shown.y + shown.height - (zero.y - 6)),
  );
  expect(across).toBeLessThan(1);
  expect(down).toBeLessThan(1);

  await page.keyboard.press("Escape");
  await expect(tooltip).toBeHidden();
  expect(await hovers(page)).toEqual([0, null]);
  expect(await page.evaluate(() => window.plotsPage?.markupRan() ?? true)).toBe(
    false,
  );

  // Back again from away, and a turn hides it.
  await page.mouse.move(zero.x - 200, zero.y - 60);
  await page.mouse.move(zero.x, zero.y);
  await expect(tooltip).toBeVisible();
  await turn(page, "rotate", 15);
  await expect(tooltip).toBeHidden();
  expect(await hovers(page)).toEqual([0, null, 0, null]);
});

test("IP10 D3 the pointer moved from point 0 onto its tooltip in 10 steps keeps it, still that point's", async ({
  page,
}) => {
  await openPlots(page);
  await drawPca3d(page, 600, 450, "cloud");
  expect(await nearestOther(page, 0, "start")).toBeGreaterThanOrEqual(12);
  const zero = await pointAt(page, 0, "start");
  const tooltip = page.locator(".chart-tooltip");
  await page.mouse.move(zero.x, zero.y);
  await expect(tooltip).toBeVisible();
  const box = await tooltip.boundingBox();
  if (box === null) throw new Error("The tooltip is not laid out.");
  // 8 pixels inside the corner of the tooltip nearest the point, which is
  // 6 pixels across and 6 up or down from it: the line there passes
  // through that corner, 8.5 pixels from the point.
  const onTooltip = {
    x: box.x < zero.x ? box.x + box.width - 8 : box.x + 8,
    y: box.y < zero.y ? box.y + box.height - 8 : box.y + 8,
  };
  expect(Math.hypot(onTooltip.x - zero.x, onTooltip.y - zero.y)).toBeCloseTo(
    14 * Math.SQRT2,
    0,
  );
  await page.mouse.move(onTooltip.x, onTooltip.y, { steps: 10 });
  await expect(tooltip).toBeVisible();
  await expect(tooltip.locator("div").first()).toHaveText(MARKUP_NAME);
  expect(await hovers(page)).toEqual([0]);
});

test("IP10 D3 a name with markup shows as text in the hidden title and description, the labels of the lines, and the title, labels and legend of the file", async ({
  page,
}) => {
  await openPlots(page);
  await drawPca3d(page, 600, 450, "markup");
  const canvas = page.locator("#plots canvas");
  await expect(canvas).toHaveAccessibleName("<i>T</i>");
  await expect(canvas).toHaveAccessibleDescription(MARKUP_NAME);
  await expect(page.locator("#plots .chart-pca3d-label")).toHaveText([
    "<b>PC1</b>",
    "<b>PC2</b>",
    "<b>PC3</b>",
  ]);
  await expect(page.locator("#plots").locator("b, i, img")).toHaveCount(0);
  const file = await page.evaluate(() => {
    const plot = window.plotsPage?.pca3d();
    if (plot === undefined) throw new Error("e2e/plots.html has not run.");
    const parsed = new DOMParser().parseFromString(
      plot.toSVG(),
      "image/svg+xml",
    );
    return {
      title: parsed.querySelector("svg > title")?.textContent,
      desc: parsed.querySelector("svg > desc")?.textContent,
      labels: [...parsed.querySelectorAll(".chart-pca3d-label-text")].map(
        (label) => label.textContent,
      ),
      rows: [...parsed.querySelectorAll(".chart-legend-row text")].map(
        (row) => row.textContent,
      ),
      markup: parsed.querySelectorAll("b, i, img").length,
    };
  });
  expect(file).toEqual({
    title: "<i>T</i>",
    desc: MARKUP_NAME,
    labels: ["<b>PC1</b>", "<b>PC2</b>", "<b>PC3</b>"],
    rows: [
      "Population",
      "P1 (1)",
      "P2 (1)",
      "P3 (1)",
      "<b>P4</b> (1)",
      "P5 (1)",
    ],
    markup: 0,
  });
  expect(await page.evaluate(() => window.plotsPage?.markupRan() ?? true)).toBe(
    false,
  );
});

test.describe("on a screen of touch", () => {
  test.use({ hasTouch: true });

  test("IP8 D2 a tap on point 0 shows its tooltip", async ({ page }) => {
    await openPlots(page);
    await drawPca3d(page, 600, 450, "cloud");
    const zero = await pointAt(page, 0, "start");
    await page.touchscreen.tap(zero.x, zero.y);
    const tooltip = page.locator(".chart-tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip.locator("div").first()).toHaveText(MARKUP_NAME);
    expect(await hovers(page)).toEqual([0]);
  });
});

test("IP8 D2 a highlighted group is drawn over a faded one nearer the camera", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openPlots(page);
  await drawPca3d(page, 600, 450, "pair");
  await turn(page, "viewAlong", 2);
  const place = await pointAt(page, 0, 2);
  // P2, above, is nearer the camera, which looks down from above.
  const [above] = await coloursAt(page, [place]);
  expect(near(above ?? [], SKY_BLUE)).toBe(true);
  await page.evaluate(() => {
    window.plotsPage?.pca3dHighlight(0);
  });
  const [highlighted] = await coloursAt(page, [place]);
  expect(near(highlighted ?? [], ORANGE)).toBe(true);
});

test("IP8 D2 of two points at one pixel in the view along the third component, the tooltip is that of the one nearer the camera", async ({
  page,
}) => {
  await openPlots(page);
  await drawPca3d(page, 600, 450, "cloud");
  await turn(page, "viewAlong", 2);
  const pair = await pointAt(page, 3, 2);
  const four = await pointAt(page, 4, 2);
  expect(Math.hypot(pair.x - four.x, pair.y - four.y)).toBeLessThan(0.01);
  const tooltip = page.locator(".chart-tooltip");
  await page.mouse.move(pair.x, pair.y);
  await expect(tooltip).toBeVisible();
  // Point 4, at a depth of 0.5, is above point 3, at −0.5, and the camera
  // looks down from above; point 3 comes first, which a rule of the
  // nearest alone would take.
  await expect(tooltip.locator("div").first()).toHaveText("ind4");
  expect(await hovers(page)).toEqual([4]);
});

test("IP8 D2 a loss of the context forced with WEBGL_lose_context, then its restore, calls onContextChange(true) then (false), and the plot draws again", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openPlots(page);
  await drawPca3d(page, 600, 450, "cloud");
  const zero = await pointAt(page, 0, "start");
  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#plots canvas");
    const extension = canvas
      ?.getContext("webgl2")
      ?.getExtension("WEBGL_lose_context");
    if (extension === undefined || extension === null) {
      throw new Error("No WEBGL_lose_context.");
    }
    Object.assign(window, { loseContext: extension });
    extension.loseContext();
  });
  await expect
    .poll(() => page.evaluate(() => window.plotsPage?.contextChanges()))
    .toEqual([true]);
  await page.evaluate(() => {
    (
      window as unknown as { loseContext: WEBGL_lose_context }
    ).loseContext.restoreContext();
  });
  await expect
    .poll(() => page.evaluate(() => window.plotsPage?.contextChanges()))
    .toEqual([true, false]);
  const [colour] = await coloursAt(page, [zero]);
  expect(near(colour ?? [], WHITE)).toBe(false);
});

test("IP8 D2 a change of data-theme on <html> draws the lines in the colour of the axes of the new theme", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openPlots(page);
  await drawPca3d(page, 600, 450, "five");
  await turn(page, "viewAlong", 2);
  const samples = await lineSamples(page);
  const count = (colours: number[][], axis: readonly number[]): number =>
    colours.filter((colour) => near(colour, axis)).length;

  const light = await coloursAt(page, samples);
  expect(count(light, LIGHT_AXIS)).toBeGreaterThanOrEqual(10);
  expect(count(light, DARK_AXIS)).toBe(0);

  await page.evaluate(() => {
    document.documentElement.dataset["theme"] = "dark";
  });
  await expect
    .poll(async () => count(await coloursAt(page, samples), DARK_AXIS))
    .toBeGreaterThanOrEqual(10);
  expect(count(await coloursAt(page, samples), LIGHT_AXIS)).toBe(0);
});

test("IP8 D2 toSVG has no var( and holds the legend, whose last row with 40 groups in 600 by 450 says how many more there are; toPNG(3) is 1,800 by 1,350 pixels", async ({
  page,
}) => {
  await openPlots(page);
  await drawPca3d(page, 600, 450, "forty");
  const found = await page.evaluate(async () => {
    const plot = window.plotsPage?.pca3d();
    if (plot === undefined) throw new Error("e2e/plots.html has not run.");
    const text = plot.toSVG();
    const file = new DOMParser().parseFromString(text, "image/svg+xml");
    const rows = [...file.querySelectorAll(".chart-legend-row text")].map(
      (row) => row.textContent,
    );
    const blob = await plot.toPNG(3);
    const image = await createImageBitmap(blob);
    return {
      text,
      rows,
      labels: [...file.querySelectorAll(".chart-pca3d-label-text")].map(
        (label) => label.textContent,
      ),
      lines: file.querySelectorAll("line.chart-pca3d-axis").length,
      classes: file.documentElement.getAttribute("class"),
      png: [image.width, image.height],
    };
  });
  expect(found.text).not.toContain("var(");
  expect(found.classes).toBe("chart chart-pca3d");
  expect(found.lines).toBe(3);
  expect(found.labels).toEqual(["PC1 (3.55%)", "PC2 (3.40%)", "PC3 (1.89%)"]);
  expect(found.rows[0]).toBe("Population");
  expect(found.rows[1]).toBe("Q1 (1)");
  // 24 rows of 16 pixels between the top margin, 12, and the bottom one,
  // 44, with 4 pixels each side: the title, 22 entries, and the rest.
  expect(found.rows).toHaveLength(24);
  expect(found.rows.at(-1)).toBe("and 18 more");
  expect(found.png).toEqual([1800, 1350]);
});

test("IP10 D3 with no point of three finite coordinates, the three lines are drawn from −1 to 1, and no point", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openPlots(page);
  // In `five`, seen along the third component, the line of the first
  // ends at d, whose first coordinate, 1, is the largest: 1 at the scale 1.
  await drawPca3d(page, 600, 450, "five");
  await turn(page, "viewAlong", 2);
  const [fiveAcross] = await exportedLines(page);
  if (fiveAcross === undefined) throw new Error("No line in five.");

  await drawPca3d(page, 600, 450, "none");
  await turn(page, "viewAlong", 2);
  const lines = await exportedLines(page);
  expect(lines).toHaveLength(3);
  expect(await exportedPaths(page)).toEqual([]);
  const [across] = lines;
  // From −1, left of the middle of 600, to 1 right of it.
  expect(across?.x2).toBeCloseTo(fiveAcross.x2, 0);
  expect(across?.x1).toBeCloseTo(600 - fiveAcross.x2, 0);
  expect(across?.y1).toBe(across?.y2);
  // And drawn on the canvas.
  const colours = await coloursAt(page, await lineSamples(page));
  expect(
    colours.filter((colour) => near(colour, LIGHT_AXIS)).length,
  ).toBeGreaterThanOrEqual(10);
});

/** The count of the textures WebGL made on the page, kept by the init script of a test. */
interface TextureCount {
  texturesMade: number;
}

test("IP10 D3 a thousand groups are each drawn, and share at most 50 textures of their marks", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const counted = window as unknown as TextureCount;
    counted.texturesMade = 0;
    const prototype = WebGL2RenderingContext.prototype;
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called with its context below
    const create = prototype.createTexture;
    prototype.createTexture = function (this: WebGL2RenderingContext) {
      counted.texturesMade += 1;
      return create.call(this);
    };
  });
  await openPlots(page);
  const made = (): Promise<number> =>
    page.evaluate(() => (window as unknown as TextureCount).texturesMade);
  // The textures of a plot of five groups, one mark each, and those the
  // renderer makes for itself.
  const beforeFive = await made();
  await drawPca3d(page, 600, 450, "five");
  const ofFive = (await made()) - beforeFive;
  const beforeThousand = await made();
  await drawPca3d(page, 600, 450, "thousand");
  const ofThousand = (await made()) - beforeThousand;
  process.stdout.write(
    `Textures made by WebGL in ${test.info().project.name}: ${String(ofFive)} for five groups, ${String(ofThousand)} for a thousand\n`,
  );
  expect(ofThousand - ofFive + 5).toBeLessThanOrEqual(50);

  const paths = await exportedPaths(page);
  expect(paths).toHaveLength(1000);
  const box = await page.locator("#plots canvas").boundingBox();
  if (box === null) throw new Error("The canvas is not laid out.");
  const colours = await coloursAt(page, [
    await pointAt(page, 0, "start"),
    await pointAt(page, 500, "start"),
    await pointAt(page, 999, "start"),
    { x: box.x + 3, y: box.y + box.height - 3 },
  ]);
  expect(near(colours[3] ?? [], WHITE)).toBe(true);
  for (const colour of colours.slice(0, 3)) {
    expect(near(colour, WHITE)).toBe(false);
  }
});

test("IP8 D2 after destroy no canvas is left in the element, and the context of the old canvas reports itself lost", async ({
  page,
}) => {
  await openPlots(page);
  await drawPca3d(page, 600, 450, "five");
  const found = await page.evaluate(() => {
    const plots = window.plotsPage;
    if (plots === undefined) throw new Error("e2e/plots.html has not run.");
    const element = plots.element();
    const canvas = element.querySelector("canvas");
    const context = canvas?.getContext("webgl2") ?? null;
    if (context === null) throw new Error("The plot has no WebGL context.");
    plots.pca3d().destroy();
    plots.pca3d().destroy();
    return {
      canvases: element.querySelectorAll("canvas").length,
      children: element.childElementCount,
      lost: context.isContextLost(),
    };
  });
  expect(found).toEqual({ canvases: 0, children: 0, lost: true });
});

test("IP10 D3 the handle throws for data of another length, a turn not finite and a zoom of 0; after destroy every call but destroy throws; and a plot never drawn exports nothing", async ({
  page,
}) => {
  await openPlots(page);
  await drawPca3d(page, 600, 450, "five");
  const found = await page.evaluate(async () => {
    const plots = window.plotsPage;
    if (plots === undefined) throw new Error("e2e/plots.html has not run.");
    const plot = plots.pca3d();
    const data = plots.pca3dData();
    const thrown = (call: () => unknown): string => {
      try {
        call();
        return "no error";
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    };
    const rejected = async (call: () => Promise<unknown>): Promise<string> => {
      try {
        await call();
        return "no error";
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    };
    const drawn = {
      update: thrown(() => {
        plot.update({ ...data, y: data.y.subarray(0, 4) });
      }),
      rotate: thrown(() => {
        plot.rotate("vertical", Number.NaN);
      }),
      zoom: thrown(() => {
        plot.zoom(0);
      }),
    };
    plot.destroy();
    const destroyed = {
      update: thrown(() => {
        plot.update(data);
      }),
      toSVG: thrown(() => plot.toSVG()),
      toPNG: await rejected(() => plot.toPNG(2)),
      rotate: thrown(() => {
        plot.rotate("vertical", 15);
      }),
      viewAlong: thrown(() => {
        plot.viewAlong(2);
      }),
      zoom: thrown(() => {
        plot.zoom(1.25);
      }),
      resetView: thrown(() => {
        plot.resetView();
      }),
      destroy: thrown(() => {
        plot.destroy();
      }),
    };
    await plots.drawPca3d(0, 0, "five");
    const never = plots.pca3d();
    const neverDrawn = {
      toSVG: thrown(() => never.toSVG()),
      toPNG: await rejected(() => never.toPNG(2)),
    };
    return { drawn, destroyed, neverDrawn };
  });
  for (const message of Object.values(found.drawn)) {
    expect(message).toMatch(/^popnei_web defect/);
  }
  const { destroy, ...calls } = found.destroyed;
  expect(destroy).toBe("no error");
  for (const [call, message] of Object.entries(calls)) {
    expect(message).toBe(
      `popnei_web defect: ${call} of a 3D plot after its destroy.`,
    );
  }
  for (const message of Object.values(found.neverDrawn)) {
    expect(message).toMatch(/^popnei_web defect: .* never drawn/);
  }
});

test("IP8 D2 the wheel over the plot scrolls the page and leaves the points where they were; with Ctrl held it moves them apart and the page does not scroll", async ({
  page,
}) => {
  await openPlots(page);
  await page.evaluate(() => {
    document.body.style.minHeight = "4000px";
  });
  await drawPca3d(page, 600, 450, "five");
  const box = await page.locator("#plots canvas").boundingBox();
  if (box === null) throw new Error("The canvas is not laid out.");
  const spread = (centres: { x: number; y: number }[]): number =>
    Math.max(...centres.map((c) => c.x)) - Math.min(...centres.map((c) => c.x));
  const before = await exportedCentres(page);

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 200);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
  expect(await exportedCentres(page)).toEqual(before);

  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -200);
  await page.keyboard.up("Control");
  await expect
    .poll(async () => spread(await exportedCentres(page)))
    .toBeGreaterThan(spread(before) * 1.1);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  // The page was not enlarged: its width in CSS pixels is the same.
  expect(await page.evaluate(() => window.innerWidth)).toBe(
    page.viewportSize()?.width,
  );
});

test("IP8 D2 the canvas lies inside the padding of its element, at the size of its content", async ({
  page,
}) => {
  await openPlots(page);
  await drawPca3d(page, 600, 450, "five");
  const canvas = await page.locator("#plots canvas").boundingBox();
  const element = await page.locator("#plots > div").boundingBox();
  if (canvas === null || element === null) {
    throw new Error("Nothing is laid out.");
  }
  expect(canvas.x - element.x).toBeCloseTo(PADDING, 0);
  expect(canvas.y - element.y).toBeCloseTo(PADDING, 0);
  expect(canvas.width).toBeCloseTo(600, 0);
  expect(canvas.height).toBeCloseTo(450, 0);
});

/**
 * The marks around `points` of the viewport, read from a screenshot of
 * the canvas: for each, the pixels of a square of `half` CSS pixels each
 * side of it, 1 where the mark is drawn, anything other than the white
 * background, and 0 elsewhere, row after row.
 */
async function marksAround(
  page: Page,
  points: readonly ViewportPoint[],
  half: number,
): Promise<number[][]> {
  const canvas = page.locator("#plots canvas");
  const box = await canvas.boundingBox();
  if (box === null) throw new Error("The canvas is not laid out.");
  const png = (await canvas.screenshot({ style: CANVAS_ONLY })).toString(
    "base64",
  );
  return page.evaluate(
    async ([data, at, left, top, side]) => {
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      const image = await createImageBitmap(
        new Blob([bytes], { type: "image/png" }),
      );
      const ratio = devicePixelRatio;
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      if (context === null) throw new Error("No context of a canvas.");
      context.drawImage(image, 0, 0);
      const span = Math.round(2 * side * ratio);
      return at.map((point) => {
        const pixels = context.getImageData(
          Math.round((point.x - left - side) * ratio),
          Math.round((point.y - top - side) * ratio),
          span,
          span,
        ).data;
        const ink: number[] = [];
        for (let i = 0; i < pixels.length; i += 4) {
          const white =
            (pixels[i] ?? 0) > 245 &&
            (pixels[i + 1] ?? 0) > 245 &&
            (pixels[i + 2] ?? 0) > 245;
          ink.push(white ? 0 : 1);
        }
        return ink;
      });
    },
    [png, points, box.x, box.y, half] as const,
  );
}

/** The pixels where two marks of `marksAround` differ. */
function differing(a: readonly number[], b: readonly number[]): number {
  return a.filter((value, at) => value !== b[at]).length;
}

/**
 * How many pixels of a square of `half` CSS pixels each side of each of
 * `points` are within `within` of `colour` in each channel, from a
 * screenshot of the canvas.
 */
async function pixelsNear(
  page: Page,
  points: readonly ViewportPoint[],
  half: number,
  colour: readonly number[],
  within: number,
): Promise<number[]> {
  const canvas = page.locator("#plots canvas");
  const box = await canvas.boundingBox();
  if (box === null) throw new Error("The canvas is not laid out.");
  const png = (await canvas.screenshot({ style: CANVAS_ONLY })).toString(
    "base64",
  );
  return page.evaluate(
    async ([data, at, left, top, side, wanted, tolerance]) => {
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      const image = await createImageBitmap(
        new Blob([bytes], { type: "image/png" }),
      );
      const ratio = devicePixelRatio;
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      if (context === null) throw new Error("No context of a canvas.");
      context.drawImage(image, 0, 0);
      const span = Math.round(2 * side * ratio);
      return at.map((point) => {
        const pixels = context.getImageData(
          Math.round((point.x - left - side) * ratio),
          Math.round((point.y - top - side) * ratio),
          span,
          span,
        ).data;
        let count = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (
            wanted.every(
              (value, channel) =>
                Math.abs((pixels[i + channel] ?? -999) - value) <= tolerance,
            )
          ) {
            count += 1;
          }
        }
        return count;
      });
    },
    [png, points, box.x, box.y, half, colour, within] as const,
  );
}

test("stop C 2 in 3D the marks of orange, sky blue and yellow have the grey outline, and those of green and blue none", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openPlots(page);
  await drawPca3d(page, 600, 450, "five");
  await turn(page, "viewAlong", 2);
  const places = await Promise.all(
    [0, 1, 2, 3, 4].map((point) => pointAt(page, point, 2)),
  );
  // --chart-axis of the light theme, #555d68.
  // Within 40 in each channel, since Chromium's drawing on the processor
  // blends the outline of 1 pixel with what is beside it; no blend of
  // green or blue with the white background comes that near.
  const grey = await pixelsNear(page, places, 6, [85, 93, 104], 40);
  // P1 orange, P2 sky blue and P4 yellow, outlined; P3 green and P5
  // blue, not.
  expect(grey[0]).toBeGreaterThan(0);
  expect(grey[1]).toBeGreaterThan(0);
  expect(grey[3]).toBeGreaterThan(0);
  expect(grey[2]).toBe(0);
  expect(grey[4]).toBe(0);
});

/** The viridis colour of the smallest value, #440154, and of the largest, #fde725. */
const VIRIDIS_MIN = [68, 1, 84] as const;
const VIRIDIS_MAX = [253, 231, 37] as const;

test("IP8 D2 the five groups of five are drawn with five shapes, as in 2D, and not only five colours", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openPlots(page);
  await drawPca3d(page, 600, 450, "five");
  await turn(page, "viewAlong", 2);
  const places = await Promise.all(
    [0, 1, 2, 3, 4].map((point) => pointAt(page, point, 2)),
  );
  const marks = await marksAround(page, places, 10);
  // A circle, a cross, a diamond, a square and a star, of one area: any
  // two differ by more pixels than the same mark drawn at another
  // fraction of a pixel.
  for (let one = 0; one < marks.length; one++) {
    for (let other = one + 1; other < marks.length; other++) {
      expect(
        differing(marks[one] ?? [], marks[other] ?? []),
        `the marks of P${String(one + 1)} and P${String(other + 1)}`,
      ).toBeGreaterThanOrEqual(12);
    }
  }
});

test("IP8 D2 a colouring by values draws the smallest value in the dark end of viridis and the largest in the yellow one, and the export fills them so", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openPlots(page);
  await drawPca3d(page, 600, 450, "values");
  await turn(page, "viewAlong", 2);
  // Point a has the smallest value, 100, and point d the largest, 400.
  const [smallest, largest] = await coloursAt(page, [
    await pointAt(page, 0, 2),
    await pointAt(page, 3, 2),
  ]);
  expect(smallest).toEqual(expect.any(Array));
  expect(near(smallest ?? [], VIRIDIS_MIN)).toBe(true);
  expect(near(largest ?? [], VIRIDIS_MAX)).toBe(true);
  const fills = await page.evaluate(() => {
    const plot = window.plotsPage?.pca3d();
    if (plot === undefined) throw new Error("e2e/plots.html has not run.");
    const file = new DOMParser().parseFromString(plot.toSVG(), "image/svg+xml");
    return [...file.querySelectorAll(".chart-marks path.chart-points-value")]
      .map((path) => path.getAttribute("fill"))
      .toSorted();
  });
  // One path per step of viridis, the first and the last among them.
  expect(fills).toHaveLength(4);
  expect(fills).toContain("#440154");
  expect(fills).toContain("#fde725");
});

test("IP8 D2 with a group highlighted, the others are faded on the screen, and in the export drawn before it with the class of the faded, with the title and the description", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openPlots(page);
  await drawPca3d(page, 600, 450, "five");
  await turn(page, "viewAlong", 2);
  const one = await pointAt(page, 1, 2);
  const zero = await pointAt(page, 0, 2);
  const [before] = await coloursAt(page, [one]);
  expect(near(before ?? [], SKY_BLUE)).toBe(true);
  await page.evaluate(() => {
    window.plotsPage?.pca3dHighlight(0);
  });
  const [faded, highlighted] = await coloursAt(page, [one, zero]);
  // A quarter of the colour over the white: every channel lighter.
  expect(near(faded ?? [], SKY_BLUE)).toBe(false);
  for (const [channel, value] of SKY_BLUE.entries()) {
    expect(faded?.[channel] ?? 0).toBeGreaterThanOrEqual(value);
  }
  expect(near(faded ?? [], WHITE)).toBe(false);
  expect(near(highlighted ?? [], ORANGE)).toBe(true);

  const exported = await page.evaluate(() => {
    const plot = window.plotsPage?.pca3d();
    if (plot === undefined) throw new Error("e2e/plots.html has not run.");
    const file = new DOMParser().parseFromString(plot.toSVG(), "image/svg+xml");
    return {
      title: file.querySelector("svg > title")?.textContent,
      desc: file.querySelector("svg > desc")?.textContent,
      classes: [...file.querySelectorAll(".chart-marks path")].map(
        (path) => path.getAttribute("class") ?? "",
      ),
    };
  });
  expect(exported.title).toBe("Five individuals, in 3D");
  expect(exported.desc).toBe(
    "Five individuals in five populations, for the tests.",
  );
  // Seen from above, c, of P3, is the nearest, and a, of P1, highlighted,
  // is drawn after it all the same.
  expect(exported.classes).toEqual([
    "chart-points chart-colour-3 chart-points-faded",
    "chart-points chart-colour-1 chart-points-faded",
    "chart-points chart-colour-4 chart-points-faded",
    "chart-points chart-colour-2 chart-points-faded",
    "chart-points chart-colour-0",
  ]);
});

test("IP8 D2 a drag across the cloud shows no tooltip on the way, and calls no onHover", async ({
  page,
}) => {
  await openPlots(page);
  await drawPca3d(page, 600, 450, "cloud");
  const box = await page.locator("#plots canvas").boundingBox();
  if (box === null) throw new Error("The canvas is not laid out.");
  // From a place with no point, through the middle of the cloud.
  const from = { x: box.x + 20, y: box.y + box.height - 20 };
  await page.mouse.move(from.x, from.y);
  expect(await hovers(page)).toEqual([]);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
    steps: 12,
  });
  await expect(page.locator(".chart-tooltip")).toBeHidden();
  await page.mouse.up();
  expect(await hovers(page)).toEqual([]);
});

test("IP8 D2 a loss of the context hides the tooltip that was shown and calls onHover with null", async ({
  page,
}) => {
  await openPlots(page);
  await drawPca3d(page, 600, 450, "cloud");
  const zero = await pointAt(page, 0, "start");
  const tooltip = page.locator(".chart-tooltip");
  await page.mouse.move(zero.x, zero.y);
  await expect(tooltip).toBeVisible();
  await page.evaluate(() => {
    document
      .querySelector<HTMLCanvasElement>("#plots canvas")
      ?.getContext("webgl2")
      ?.getExtension("WEBGL_lose_context")
      ?.loseContext();
  });
  await expect
    .poll(() => page.evaluate(() => window.plotsPage?.contextChanges()))
    .toEqual([true]);
  await expect(tooltip).toBeHidden();
  expect(await hovers(page)).toEqual([0, null]);
});

test("IP10 D3 with the context lost, toSVG and toPNG still export the plot", async ({
  page,
}) => {
  await openPlots(page);
  await drawPca3d(page, 600, 450, "five");
  await page.evaluate(() => {
    document
      .querySelector<HTMLCanvasElement>("#plots canvas")
      ?.getContext("webgl2")
      ?.getExtension("WEBGL_lose_context")
      ?.loseContext();
  });
  await expect
    .poll(() => page.evaluate(() => window.plotsPage?.contextChanges()))
    .toEqual([true]);
  const found = await page.evaluate(async () => {
    const plot = window.plotsPage?.pca3d();
    if (plot === undefined) throw new Error("e2e/plots.html has not run.");
    const file = new DOMParser().parseFromString(plot.toSVG(), "image/svg+xml");
    const image = await createImageBitmap(await plot.toPNG(2));
    return {
      paths: file.querySelectorAll(".chart-marks path.chart-points").length,
      png: [image.width, image.height],
    };
  });
  expect(found).toEqual({ paths: 5, png: [1200, 900] });
});

test("IP8 D2 a smaller element draws the canvas at its new size", async ({
  page,
}) => {
  await openPlots(page);
  await drawPca3d(page, 600, 450, "five");
  const canvas = page.locator("#plots canvas");
  // The pixels of the screen per CSS pixel, 1 in Chromium's device and 2
  // in WebKit's.
  const ratio = await page.evaluate(() => Math.min(devicePixelRatio, 2));
  await expect(canvas).toHaveJSProperty("width", 600 * ratio);
  await page.evaluate(() => {
    const element = window.plotsPage?.element();
    if (element === undefined) throw new Error("e2e/plots.html has not run.");
    element.style.width = "400px";
    element.style.height = "300px";
  });
  await expect(canvas).toHaveJSProperty("width", 400 * ratio);
  await expect(canvas).toHaveJSProperty("height", 300 * ratio);
});

test("IP10 D3 an element with no size renders nothing and toSVG exports the last view; the next size renders", async ({
  page,
}) => {
  await openPlots(page);
  await drawPca3d(page, 600, 450, "five");
  await turn(page, "viewAlong", 2);
  const canvas = page.locator("#plots canvas");
  const ratio = await page.evaluate(() => Math.min(devicePixelRatio, 2));
  await expect(canvas).toHaveJSProperty("width", 600 * ratio);
  const exported = (): Promise<string> =>
    page.evaluate(() => {
      const plot = window.plotsPage?.pca3d();
      if (plot === undefined) throw new Error("e2e/plots.html has not run.");
      return plot.toSVG();
    });
  const kept = await exported();
  // A tab that is hidden: the element laid out at no size, and three
  // frames of the screen, in which the observer of its size and the frame
  // of a new drawing would have run.
  await page.evaluate(async () => {
    const element = window.plotsPage?.element();
    if (element === undefined) throw new Error("e2e/plots.html has not run.");
    element.style.display = "none";
    for (let frame = 0; frame < 3; frame += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  });
  expect(await exported()).toBe(kept);
  await expect(canvas).toHaveJSProperty("width", 600 * ratio);
  await expect(canvas).toHaveJSProperty("height", 450 * ratio);

  await page.evaluate(() => {
    const element = window.plotsPage?.element();
    if (element === undefined) throw new Error("e2e/plots.html has not run.");
    element.style.display = "";
    element.style.width = "400px";
    element.style.height = "300px";
  });
  await expect(canvas).toHaveJSProperty("width", 400 * ratio);
  await expect(canvas).toHaveJSProperty("height", 300 * ratio);
  expect(await exported()).toContain('width="400" height="300"');
});

test.describe("at a pixel ratio of 2", () => {
  test.use({ deviceScaleFactor: 2 });

  test("IP8 D2 the canvas holds two pixels of the screen for each CSS pixel", async ({
    page,
  }) => {
    await openPlots(page);
    await drawPca3d(page, 600, 450, "five");
    const canvas = page.locator("#plots canvas");
    await expect(canvas).toHaveJSProperty("width", 1200);
    await expect(canvas).toHaveJSProperty("height", 900);
  });
});

test("IP8 D2 a change of the colour scheme of the system draws the lines in the colour of the axes of the dark theme", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openPlots(page);
  await drawPca3d(page, 600, 450, "five");
  await turn(page, "viewAlong", 2);
  const samples = await lineSamples(page);
  const count = (colours: number[][], axis: readonly number[]): number =>
    colours.filter((colour) => near(colour, axis)).length;
  expect(
    count(await coloursAt(page, samples), LIGHT_AXIS),
  ).toBeGreaterThanOrEqual(10);
  await page.emulateMedia({ colorScheme: "dark" });
  // The canvas is transparent, and the page behind it dark now: the
  // lines are read against it.
  await expect
    .poll(async () => count(await coloursAt(page, samples), DARK_AXIS))
    .toBeGreaterThanOrEqual(10);
});

test("IP8 D2 the label of each line stands at its positive end, 4 pixels across and up from it", async ({
  page,
}) => {
  await openPlots(page);
  await drawPca3d(page, 600, 450, "five");
  await turn(page, "viewAlong", 2);
  const box = await page.locator("#plots canvas").boundingBox();
  if (box === null) throw new Error("The canvas is not laid out.");
  const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  // The line of PC1 ends at d, at 1, the largest first coordinate, and
  // that of PC2 at b, at 0.8, the largest second one.
  const d = await pointAt(page, 3, 2);
  const b = await pointAt(page, 1, 2);
  const labels = page.locator("#plots .chart-pca3d-label");
  const first = await labels.nth(0).boundingBox();
  const second = await labels.nth(1).boundingBox();
  if (first === null || second === null)
    throw new Error("No label is laid out.");
  expect(Math.abs(first.x - (d.x + 4))).toBeLessThan(1.5);
  expect(Math.abs(first.y + first.height - (middle.y - 4))).toBeLessThan(1.5);
  expect(Math.abs(second.x - (middle.x + 4))).toBeLessThan(1.5);
  expect(Math.abs(second.y + second.height - (b.y - 4))).toBeLessThan(1.5);
});

test("IP8 D2 destroy takes the tooltip that was shown off the page", async ({
  page,
}) => {
  await openPlots(page);
  await drawPca3d(page, 600, 450, "cloud");
  const zero = await pointAt(page, 0, "start");
  await page.mouse.move(zero.x, zero.y);
  await expect(page.locator(".chart-tooltip")).toBeVisible();
  const left = await page.evaluate(() => {
    const plots = window.plotsPage;
    if (plots === undefined) throw new Error("e2e/plots.html has not run.");
    plots.pca3d().destroy();
    return {
      children: plots.element().childElementCount,
      tooltips: document.querySelectorAll(".chart-tooltip").length,
    };
  });
  expect(left).toEqual({ children: 0, tooltips: 0 });
});
