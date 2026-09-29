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

/** Opens the page of the plots, and skips the test where the engine gives no WebGL 2. */
async function openPlots(page: Page): Promise<void> {
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
  const png = (await canvas.screenshot()).toString("base64");
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
