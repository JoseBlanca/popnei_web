/**
 * The panel of the principal components on the built site
 * (docs/specs/analyses/pca.md, "The panel"): its options, the LD filter
 * set for the PCA with its reason beside the empty distance, its result in
 * 3D and in 2D with popnei's numbers on the axes, the legend that
 * highlights a group from the keyboard, the colour by the values of a
 * column, the table, the PCoA with its warning and its line, the words of
 * a calculation under way, of a browser with no WebGL 2 and of three.js
 * not downloaded, and a worker that stopped; axe at each state reached.
 * The spec's flow, IP8 D4, is in e2e/pca.spec.ts.
 *
 * And what the tests review of work package 8 of
 * docs/plans/individuals-pca.md found no test of: the 3D view drawn again
 * after a highlight, a colour and other components; each button of its
 * view; Try again and 3D after 2D asking for its file again; the words of
 * the 3D view in the status region; the PCA's own filters typed, against
 * popnei's count of the variants; the download of the explained variance,
 * the sort of the table, its link and the comparison with the check
 * numbers; the line under the bar of each analysis; and the legend's
 * marks, fading, second press and bar of values.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";
import { writeBigVcf } from "./bigVcf.ts";
import { keepDrawingBuffer } from "./drawingBuffer.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The words of the 3D view (docs/specs/analyses/pca.md, "Its words"). */
const NO_WEBGL = /^This browser cannot draw the 3D view: WebGL/;
const LOAD_FAILED = /^The 3D view could not be loaded, so the 2D plot/;

/** Whether this engine gives WebGL 2, as the plot asks for it. */
async function givesWebGl(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const context = document.createElement("canvas").getContext("webgl2");
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return context !== null;
  });
}

/** Skips what follows in an engine with no WebGL 2, and says so: the
    test was not run, and did not pass (pca3d.md, "Which headless
    engines give WebGL"). */
async function needsWebGl(page: Page, what: string): Promise<void> {
  const given = await givesWebGl(page);
  if (!given) {
    test.info().annotations.push({ type: "no WebGL 2", description: what });
  }
  test.skip(!given, `no WebGL 2: ${what}`);
}

/** Notes that the test took the branch of an engine with no WebGL 2. */
function noted2d(what: string): void {
  test.info().annotations.push({ type: "no WebGL 2", description: what });
}

/** The PCA takes longer than the 5 seconds of an assertion in WebKit on a
    loaded machine only rarely; 30 s leaves room. */
const RESULT_TIMEOUT = 30_000;

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

async function goTo(page: Page, step: string): Promise<void> {
  await page
    .getByRole("navigation", { name: "Steps" })
    .getByRole("link", { name: step })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: step }),
  ).toBeVisible();
}

async function pick(
  page: Page,
  region: string,
  fixture: string,
): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: region })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (await chooser).setFiles(join(FIXTURES, fixture));
}

/** Loads panel.nei and panel_meta.csv, chooses popcat, and goes to the
    Analyses step; gives the panel. */
async function openPanel(page: Page): Promise<Locator> {
  await page.goto("popgen.html#variants");
  await pick(page, "Variants file", "panel.nei");
  await expect(
    page.getByRole("main").getByText("200 individuals"),
  ).toBeVisible();
  await goTo(page, "Individuals");
  await pick(page, "Metadata file", "panel_meta.csv");
  await page
    .getByRole("button", { name: "Column that defines the populations" })
    .click();
  await page.getByRole("option", { name: "popcat", exact: true }).click();
  await goTo(page, "Analyses");
  return page.getByRole("region", { name: "Principal components" });
}

function filterGroup(panel: Locator, name: string): Locator {
  return panel.getByRole("radiogroup", { name });
}

/** Chooses the radio button `name` of `group` as a user does, by a click
    on its words: its input is under the circle drawn for it. */
async function chooseRadio(group: Locator, name: string): Promise<void> {
  await group.locator("label").filter({ hasText: name }).click();
  await expect(group.getByRole("radio", { name })).toBeChecked();
}

const LD_GROUP = "Prune the variants by linkage disequilibrium (LD)";
const DISTANCE =
  "Distance within which variants are compared, in base pairs, from 1";

/** Sets the LD filter for the PCA alone and types 50000 key by key. */
async function ownLd(panel: Locator): Promise<void> {
  await chooseRadio(filterGroup(panel, LD_GROUP), "For the PCA alone");
  const field = panel.getByLabel(DISTANCE);
  await field.pressSequentially("50000");
  await field.press("Enter");
  await expect(field).toHaveValue("50000");
}

async function run(panel: Locator): Promise<void> {
  await panel.getByRole("button", { name: "Run", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Stop" })).toHaveCount(0, {
    timeout: RESULT_TIMEOUT,
  });
  await expect(panel.getByText(/^The place of each of the 200/)).toBeVisible();
}

/** Presses 2D and gives the labels of the axes of the scatter. */
async function to2d(panel: Locator): Promise<Locator> {
  await panel.getByRole("radio", { name: "2D", exact: true }).click();
  return panel.locator("svg.chart-scatter .chart-axis-label");
}

test("the running state says the bar stands still while the components are calculated", async ({
  page,
}) => {
  const panel = await openPanel(page);
  const worker = page.workers().find((w) => w.url().includes("runnerWorker"));
  if (worker === undefined) throw new Error("no calculation worker");
  await worker.evaluate(() => {
    const scope = globalThis as unknown as {
      postMessage: (message: unknown, transfer?: Transferable[]) => void;
    };
    const post = scope.postMessage.bind(scope);
    scope.postMessage = (message, transfer) => {
      const kind =
        typeof message === "object" && message !== null && "kind" in message
          ? message.kind
          : null;
      if (kind !== "result") post(message, transfer);
    };
  });
  await panel.getByRole("button", { name: "Run", exact: true }).click();
  await expect(
    panel.getByText(
      "The bar shows the reading of panel.nei. The components are calculated once it is read, and the bar does not move meanwhile: from under a second for 1,000 individuals to minutes for several thousand.",
    ),
  ).toBeVisible();
  // The options stay editable while it runs.
  await expect(
    filterGroup(panel, LD_GROUP).getByRole("radio").first(),
  ).toBeEnabled();
});

/** Makes the calculation worker post a crash in the place of each
    result. */
async function crashResults(
  page: Page,
  message = "a crash made by the test",
): Promise<void> {
  const worker = page.workers().find((w) => w.url().includes("runnerWorker"));
  if (worker === undefined) throw new Error("no calculation worker");
  await worker.evaluate((crash) => {
    const scope = globalThis as unknown as {
      postMessage: (message: unknown, transfer?: Transferable[]) => void;
    };
    const post = scope.postMessage.bind(scope);
    scope.postMessage = (message, transfer) => {
      const kind =
        typeof message === "object" && message !== null && "kind" in message
          ? message.kind
          : null;
      post(
        kind === "result" ? { kind: "crashed", message: crash } : message,
        transfer,
      );
    };
  }, message);
}

test("a worker that stopped with no answer: the words of any analysis for 200 individuals", async ({
  page,
}) => {
  const panel = await openPanel(page);
  await crashResults(page);
  await panel.getByRole("button", { name: "Run", exact: true }).click();
  await expect(
    panel.getByText(
      "The calculation stopped unexpectedly. Run it again. If it stops again, load panel.nei again in the Variants step.",
    ),
  ).toBeVisible({ timeout: RESULT_TIMEOUT });
});

for (const [what, crash, shown] of [
  [
    "projections of popnei that do not match the individuals",
    "popnei_web defect: popnei gave 10 projections for 3 individuals and 2 components",
    "The application met an error of its own: popnei gave 10 projections for 3 individuals and 2 components. Run it again.",
  ],
  [
    "popnei's refusal of an option it does not know",
    "popnei_web defect: popnei: `numCompsKept` is not an option of `doPcoaFromVariants`, whose options are `minNumSnps` and `correctByLingoes`",
    "The application met an error of its own: popnei: `numCompsKept` is not an option of `doPcoaFromVariants`, whose options are `minNumSnps` and `correctByLingoes`. Run it again.",
  ],
] as const) {
  test(`stops A 9 and C 6 a defect of the application, ${what}, in the words of a defect and not of a crash`, async ({
    page,
    makeAxeBuilder,
  }) => {
    const panel = await openPanel(page);
    await crashResults(page, crash);
    await panel.getByRole("button", { name: "Run", exact: true }).click();
    await expect(panel.getByText(shown, { exact: true })).toBeVisible({
      timeout: RESULT_TIMEOUT,
    });
    await expect(panel.getByText(/stopped unexpectedly/)).toHaveCount(0);
    await expect(
      panel.getByRole("button", { name: "Run", exact: true }),
    ).toBeEnabled();
    await expectNoViolations(makeAxeBuilder);
  });
}

test("a browser with no WebGL 2: the 2D plot in the place of the 3D view with its words, 3D still pressed, until 2D is pressed", async ({
  page,
  makeAxeBuilder,
}) => {
  await page.addInitScript(() => {
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with its canvas
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      id: string,
      ...rest: unknown[]
    ) {
      if (id === "webgl2") return null;
      return (getContext as (...args: unknown[]) => unknown).call(
        this,
        id,
        ...rest,
      );
    } as typeof getContext;
  });
  const panel = await openPanel(page);
  await run(panel);
  await expect(panel.getByText(NO_WEBGL)).toBeVisible();
  await expect(page.getByRole("status").last()).toContainText(
    "This browser cannot draw the 3D view: WebGL, the part of the browser that draws it, is turned off or not available on this computer, so the 2D plot is shown in its place.",
  );
  await expect(
    panel.getByRole("radio", { name: "3D", exact: true }),
  ).toBeChecked();
  await expect(panel.locator("canvas")).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Horizontal axis" }),
  ).toBeVisible();
  await expect(
    panel.getByRole("img", { name: "Principal components, PC1 and PC2" }),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
  await panel.getByRole("radio", { name: "2D", exact: true }).click();
  await expect(panel.getByText(NO_WEBGL)).toHaveCount(0);
});

test("three.js not downloaded: the 2D plot with its words and Try again, which draws the 3D view once the file comes", async ({
  page,
  makeAxeBuilder,
}) => {
  await page.route("**/pca3d-*.js", (route) => route.fulfill({ status: 404 }));
  const panel = await openPanel(page);
  await run(panel);
  await expect(panel.getByText(LOAD_FAILED)).toBeVisible();
  await expect(
    panel.getByRole("img", { name: "Principal components, PC1 and PC2" }),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
  await page.unroute("**/pca3d-*.js");
  await panel.getByRole("button", { name: "Try again" }).click();
  if (!(await givesWebGl(page))) {
    // The file comes, and the browser cannot draw it: the words of no
    // WebGL take the place of those of the failed download.
    noted2d(
      "the file of the 3D view came, and the words of no WebGL were shown",
    );
    await expect(panel.getByText(NO_WEBGL)).toBeVisible();
    await expect(panel.getByText(LOAD_FAILED)).toHaveCount(0);
    await expect(panel.locator("canvas")).toHaveCount(0);
    return;
  }
  // Drawn in every engine: Chromium, which keeps the failed download for
  // the life of the page, is asked the same file at another address.
  await expect(
    panel.getByRole("img", { name: "Principal components, PC1, PC2 and PC3" }),
  ).toBeVisible();
  await expect(panel.locator("canvas")).toHaveCount(1);
  await expect(panel.getByText(LOAD_FAILED)).toHaveCount(0);
});

test("a worker that stopped with no answer after a PCA of 2,270 of 2,300 individuals: the words of memory, counted on the individuals it ran on", async ({
  page,
}, testInfo) => {
  const vcf = testInfo.outputPath("wide.vcf.gz");
  await writeBigVcf(vcf, 20, 2300);
  await page.goto("popgen.html#variants");
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Variants file" })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (await chooser).setFiles(vcf);
  await expect(
    page.getByRole("main").getByText("2,300 individuals"),
  ).toBeVisible({ timeout: RESULT_TIMEOUT });
  // The first 30 removed by the list to remove: 2,270 are kept, above
  // the 2,264 from which the words speak of the memory.
  const lists = page.getByRole("region", {
    name: "Filters of the individuals",
  });
  await lists
    .getByRole("textbox", { name: "Individuals to remove, one name per line" })
    .fill(
      Array.from(
        { length: 30 },
        (_, i) => `s${String(i).padStart(4, "0")}`,
      ).join("\n"),
    );
  await lists
    .getByRole("button", { name: "Apply the list to remove", exact: true })
    .click();
  await expect(
    lists.getByText(
      "This list is not applied yet; Apply the list to remove applies it.",
    ),
  ).toHaveCount(0);
  await goTo(page, "Analyses");
  const panel = page.getByRole("region", { name: "Principal components" });
  await expect(
    panel.getByText(
      "2,270 of the 2,300 individuals of wide.vcf.gz, those the filters of individuals keep",
    ),
  ).toBeVisible();
  await crashResults(page);
  await panel.getByRole("button", { name: "Run", exact: true }).click();
  await expect(
    panel.getByText(
      "The calculation stopped unexpectedly, perhaps because the principal components of 2,270 individuals, which need about 0.3 GB, did not fit in the memory of this tab; a phone or a tablet gives a tab far less than a computer. Keep fewer individuals with the filters of individuals in the Variants step, close other tabs and run it again, or calculate them with popnei in Python, outside the browser.",
    ),
  ).toBeVisible({ timeout: RESULT_TIMEOUT });
});

test("a highlight is not given to the colouring of a new metadata file nor of another column, whose groups would mark another population, and a colouring of 60 groups says its marks repeat, in the status region too", async ({
  page,
}) => {
  const panel = await openPanel(page);
  await ownLd(panel);
  await run(panel);
  await to2d(panel);
  await panel
    .getByRole("radiogroup", { name: "Population" })
    .locator("button")
    .filter({ hasText: "p1 (68)" })
    .click();
  const description = panel.locator("svg.chart-scatter desc");
  await expect(description).toHaveText(/p1 is highlighted\./);
  // The same populations, first met in another order, p1 first, so that
  // the index of p1 before is that of another population now; and a
  // column of 60 values.
  const lines = (await readFile(join(FIXTURES, "panel_pops.csv"), "utf8"))
    .trim()
    .split("\n");
  const rows = lines.slice(1);
  const p1First = [
    ...rows.filter((row) => row.endsWith(",p1")),
    ...rows.filter((row) => !row.endsWith(",p1")),
  ].map((row, i) => `${row},c${String(i % 60)}`);
  await goTo(page, "Individuals");
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Metadata file" })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "reordered.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(`IID,popcat,collection\n${p1First.join("\n")}\n`),
  });
  await goTo(page, "Analyses");
  await expect(description).toHaveText(/Coloured by population: p1, 68/);
  await expect(description).not.toHaveText(/is highlighted/);
  // p1 highlighted again, then the colour changed to a column whose
  // group of the same index is another: the highlight goes.
  await panel
    .getByRole("radiogroup", { name: "Population" })
    .locator("button")
    .filter({ hasText: "p1 (68)" })
    .click();
  await expect(description).toHaveText(/p1 is highlighted\./);
  await panel.getByRole("button", { name: "Colour the points by" }).click();
  await page.getByRole("option", { name: "collection", exact: true }).click();
  await expect(description).toHaveText(
    /^Principal components.*Coloured by collection/,
  );
  await expect(description).not.toHaveText(/is highlighted/);
  const note =
    "The 60 values of collection are drawn with 49 marks, which repeat; the legend and the table tell them apart.";
  await expect(panel.getByText(`Note: ${note}`)).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: note })).toHaveText(
    new RegExp(`Note: ${note}`),
  );
});

/** Makes every WebGL 2 context the page asks for lost at once, as a
    browser that has taken the graphics card away from the page gives
    it. */
function contextsLost(): void {
  // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with its canvas
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    id: string,
    ...rest: unknown[]
  ) {
    const context = (getContext as (...args: unknown[]) => unknown).call(
      this,
      id,
      ...rest,
    );
    if (id === "webgl2" && context instanceof WebGL2RenderingContext) {
      context.getExtension("WEBGL_lose_context")?.loseContext();
    }
    return context;
  } as typeof getContext;
}

test("a WebGL context lost at its creation, while three.js downloads and once it is in hand: the words of no WebGL and the 2D plot, and no error", async ({
  page,
  makeAxeBuilder,
}) => {
  await page.addInitScript(contextsLost);
  const panel = await openPanel(page);
  await panel.getByRole("button", { name: "Run", exact: true }).click();
  await expect(panel.getByText(NO_WEBGL)).toBeVisible({
    timeout: RESULT_TIMEOUT,
  });
  await expect(
    panel.getByRole("img", { name: "Principal components, PC1 and PC2" }),
  ).toBeVisible();
  // Three.js in hand: 2D, then 3D, which draws at once.
  await panel.getByRole("radio", { name: "2D", exact: true }).click();
  await expect(panel.getByText(NO_WEBGL)).toHaveCount(0);
  await panel.getByRole("radio", { name: "3D", exact: true }).click();
  await expect(panel.getByText(NO_WEBGL)).toBeVisible();
  await expect(
    panel.getByRole("img", { name: "Principal components, PC1 and PC2" }),
  ).toBeVisible();
  await expect(panel.getByRole("radiogroup", { name: "Method" })).toBeVisible();
  await expect(
    page.getByText(/The application met an error of its own/),
  ).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

for (const width of [320, 1280]) {
  test(`zoomed in four times at ${String(width)} px, the labels of the 3D view stay in the plot and the page does not scroll sideways`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const panel = await openPanel(page);
    await needsWebGl(page, "the labels of the 3D view were not seen");
    await run(panel);
    const canvas = panel.getByRole("img", {
      name: "Principal components, PC1, PC2 and PC3",
    });
    await expect(canvas).toBeVisible();
    for (let press = 0; press < 4; press++) {
      await panel.getByRole("button", { name: "Zoom in", exact: true }).click();
    }
    const outside = await canvas.evaluate((element) => {
      const plot = element.parentElement;
      if (plot === null) return ["no element"];
      const box = plot.getBoundingClientRect();
      const page = document.documentElement;
      const found: string[] = [];
      if (page.scrollWidth > page.clientWidth) {
        found.push(
          `page ${String(page.scrollWidth)} of ${String(page.clientWidth)}`,
        );
      }
      for (const label of plot.querySelectorAll<HTMLElement>(
        ".chart-pca3d-label",
      )) {
        if (label.hidden === true) continue;
        const at = label.getBoundingClientRect();
        // The label is drawn up from its anchor, at its bottom left.
        if (
          at.left < box.left ||
          at.left > box.right ||
          at.bottom < box.top ||
          at.bottom > box.bottom
        ) {
          found.push(label.textContent);
        }
      }
      if (getComputedStyle(plot).overflow !== "hidden") {
        found.push("the plot does not clip");
      }
      return found;
    });
    expect(outside).toEqual([]);
  });
}

test("the table of the individuals at 320 px: a header of one line, and a column of numbers aligned as the components", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  const panel = await openPanel(page);
  await run(panel);
  const table = panel.getByRole("grid", { name: /^The place of each/ });
  const header = table.getByRole("columnheader", { name: "Population" });
  const heights = await header.evaluate((cell) => [
    cell.getBoundingClientRect().height,
    cell.firstElementChild?.getBoundingClientRect().height ?? 0,
  ]);
  // The header no higher than its line of words and its padding.
  expect(heights[0] ?? 0).toBeLessThanOrEqual((heights[1] ?? 0) + 10);
  await panel.getByRole("button", { name: "Colour the points by" }).click();
  await page.getByRole("option", { name: "altitude", exact: true }).click();
  const row = table.getByRole("row", { name: /^s000/ });
  const aligns = await row
    .getByRole("gridcell")
    .evaluateAll((cells) =>
      cells.map((cell) => getComputedStyle(cell).justifyContent),
    );
  expect(aligns[0]).toBe(aligns[1]);
});

test("the 2D plot drawn on a page 1280 px wide is drawn again at the width of the page narrowed to 320 px, which does not scroll sideways", async ({
  page,
}) => {
  const panel = await openPanel(page);
  await run(panel);
  await to2d(panel);
  const svg = panel.locator("svg.chart-scatter");
  const widthOf = (): Promise<number> =>
    svg.evaluate((element) => element.getBoundingClientRect().width);
  // 48rem, the most the plot is given.
  await expect.poll(widthOf).toBe(768);
  await page.setViewportSize({ width: 320, height: 800 });
  // Drawn again at the next frame after the change of its size.
  await expect.poll(widthOf).toBeLessThanOrEqual(320);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});

test("the Tab key after 50000 typed in the distance of the PCA's LD filter stops at Run even when React draws its changes only after the key has gone through the page, as it did in Firefox", async ({
  page,
}) => {
  // React draws a change made in a handler of the keyboard in a
  // microtask after it; here in a task after it, later than the browser's
  // choice of the next stop, the order that made Firefox 155 pass Run on
  // GitHub's runners on 29 September 2026.
  await page.addInitScript(() => {
    window.queueMicrotask = (callback: VoidFunction): void => {
      setTimeout(callback, 0);
    };
  });
  const panel = await openPanel(page);
  await chooseRadio(filterGroup(panel, LD_GROUP), "For the PCA alone");
  const field = panel.getByLabel(DISTANCE);
  await field.pressSequentially("50000");
  await page.keyboard.press("Tab");
  await expect(
    panel.getByRole("button", { name: "Run", exact: true }),
  ).toBeFocused();
});

test("from the keyboard alone, the LD filter set for the PCA, 50000 typed in its distance, and Tab then Enter run the PCA and not the diversity", async ({
  page,
}) => {
  const panel = await openPanel(page);
  await filterGroup(panel, LD_GROUP)
    .getByRole("radio", { name: "As in the Variants step: off" })
    .focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    filterGroup(panel, LD_GROUP).getByRole("radio", {
      name: "For the PCA alone",
    }),
  ).toBeChecked();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(panel.getByLabel(DISTANCE)).toBeFocused();
  await page.keyboard.type("50000");
  await page.keyboard.press("Tab");
  await expect(
    panel.getByRole("button", { name: "Run", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(panel.getByText(/^The place of each of the 200/)).toBeVisible({
    timeout: RESULT_TIMEOUT,
  });
  await expect(
    page
      .getByRole("region", { name: "Diversity", exact: true })
      .getByRole("button", { name: "Run", exact: true }),
  ).toBeVisible();
});

test("Try again pressed with the keyboard moves the focus to the heading of the panel, and not to the page", async ({
  page,
}) => {
  await page.route(/\/pca3d-[^/]*\.js$/, (route) =>
    route.fulfill({ status: 404 }),
  );
  const panel = await openPanel(page);
  await run(panel);
  const again = panel.getByRole("button", { name: "Try again" });
  await again.focus();
  await page.keyboard.press("Enter");
  await expect(
    panel.getByRole("heading", { level: 2, name: "Principal components" }),
  ).toBeFocused();
});

test("Escape in a number field puts back the number it holds, so that Tab after it commits nothing, in the PCA panel and in the Variants step", async ({
  page,
}) => {
  const panel = await openPanel(page);
  const maf = filterGroup(
    panel,
    "Filter the variants by major allele frequency (MAF)",
  );
  await chooseRadio(maf, "For the PCA alone");
  const field = panel.getByLabel("Maximum major allele frequency, from 0 to 1");
  await expect(field).toHaveValue("0.95");
  const undo = page
    .getByRole("banner")
    .getByRole("button", { name: "Undo", exact: true });
  const before = await undo.getAttribute("aria-describedby");
  await field.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("0.4");
  await page.keyboard.press("Escape");
  await expect(field).toHaveValue("0.95");
  await page.keyboard.press("Tab");
  await expect(field).toHaveValue("0.95");
  await expect(undo).toHaveAccessibleDescription(
    "Undo: the MAF filter of the principal components was set for them alone",
  );
  expect(await undo.getAttribute("aria-describedby")).toBe(before);

  await goTo(page, "Variants");
  const threshold = page.getByLabel(
    "Maximum proportion of missing genotypes, from 0 to 1",
    { exact: true },
  );
  await threshold.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("0.4");
  await page.keyboard.press("Escape");
  await expect(threshold).toHaveValue("0.1");
  await page.keyboard.press("Tab");
  await expect(threshold).toHaveValue("0.1");
  await expect(undo).toHaveAccessibleDescription(
    "Undo: the MAF filter of the principal components was set for them alone",
  );
});

/** The shell's status region, the last of the page's two. */
function status(page: Page): Locator {
  return page.getByRole("status").last();
}

const PCA_3D = "Principal components, PC1, PC2 and PC3";

/** The words of the 3D view (docs/specs/analyses/pca.md, "Its words"),
    whole. */
const LOADING_WORDS = "Loading the 3D view…";
const LOST_WORDS =
  "The browser stopped drawing the 3D view. It is drawn again when the browser allows it, or when you switch to 2D and back to 3D.";
const LOAD_FAILED_WORDS =
  "The 3D view could not be loaded, so the 2D plot is shown in its place. If the connection works, the site may have been updated since this page was opened: save the project, reload the page and open the project again.";

/** The file of the 3D view, with or without the address a retry asks. */
const PCA3D_FILE = /\/pca3d-[^/?]*\.js(\?.*)?$/;

/** The part of the canvas left of the legend, its left 40%, as the screen
    shows it. */
async function leftOfLegend(page: Page, canvas: Locator): Promise<Buffer> {
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (box === null) throw new Error("The canvas is not laid out.");
  return page.screenshot({
    clip: { x: box.x, y: box.y, width: box.width * 0.4, height: box.height },
  });
}

/** Moves the pointer along the middle row of `canvas`, from its centre
    outwards, until a point shows its tooltip; gives the tooltip. */
async function hoverSomePoint(page: Page, canvas: Locator): Promise<Locator> {
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (box === null) throw new Error("The canvas is not laid out.");
  const tooltip = page.locator(".chart-tooltip");
  for (let step = 0; step < 60; step++) {
    const across = (step % 2 === 0 ? 1 : -1) * 4 * Math.floor(step / 2);
    await page.mouse.move(
      box.x + box.width / 2 + across,
      box.y + box.height / 2 + 1,
    );
    if (await tooltip.isVisible()) return tooltip;
  }
  throw new Error("No point of the 3D view was found along its middle row.");
}

/** Where the three lines of the 3D view end on the canvas, in pixels
    from its top left corner: the anchor of each label, 4 pixels left of
    and below its bottom left corner. */
async function lineEnds(panel: Locator): Promise<{ x: number; y: number }[]> {
  const labels = panel.locator(".chart-pca3d-label");
  await expect(labels).toHaveCount(3);
  return labels.evaluateAll((all) =>
    all.map((label) => {
      const canvas = label.parentElement?.querySelector("canvas");
      if (canvas === null || canvas === undefined) {
        throw new Error("The label is beside no canvas.");
      }
      const at = canvas.getBoundingClientRect();
      const box = label.getBoundingClientRect();
      return { x: box.left - 4 - at.left, y: box.bottom + 4 - at.top };
    }),
  );
}

/** The middle of the canvas, where the lines cross, in pixels from its
    top left corner. */
async function middleOf(canvas: Locator): Promise<{ x: number; y: number }> {
  return canvas.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.width / 2, y: box.height / 2 };
  });
}

/** Whether two sets of ends are within half a pixel of each other. */
function sameEnds(
  a: readonly { x: number; y: number }[],
  b: readonly { x: number; y: number }[],
): boolean {
  return (
    a.length === b.length &&
    a.every(
      (end, at) =>
        Math.abs(end.x - (b[at]?.x ?? Number.NaN)) < 0.5 &&
        Math.abs(end.y - (b[at]?.y ?? Number.NaN)) < 0.5,
    )
  );
}

test.describe("the 3D view in the panel", () => {
  test("drawn again after a highlight, a colour and other components: its picture, its name, its description and its tooltip", async ({
    page,
  }) => {
    const panel = await openPanel(page);
    await needsWebGl(page, "the 3D view was not drawn");
    await ownLd(panel);
    await run(panel);
    const canvas = panel.getByRole("img", { name: PCA_3D });
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAccessibleDescription(
      /Coloured by population: p0, 48 individuals, .* The view turns/,
    );
    const start = await leftOfLegend(page, canvas);

    await panel
      .getByRole("radiogroup", { name: "Population" })
      .locator("button")
      .filter({ hasText: "p1 (68)" })
      .click();
    await expect(canvas).toHaveAccessibleDescription(
      "Principal components of 200 individuals of panel.nei in 3D, on PC1, 3.55% of the variance, PC2, 3.40%, and PC3, 1.89%. Coloured by population: p0, 48 individuals, centred at 0.4 on PC1, 7.4 on PC2 and −0.2 on PC3; p2, 84, centred at −4.5, −2.1 and −0.2; p1, 68, centred at 5.3, −2.7 and 0.4. p1 is highlighted. The view turns, so it has no across and up; the 2D plot, one button away, shows two components at a time, and the table of the individuals gives every coordinate.",
    );
    // The other groups faded: other pixels where the legend is not.
    await expect
      .poll(async () => (await leftOfLegend(page, canvas)).equals(start))
      .toBe(false);
    const highlighted = await leftOfLegend(page, canvas);

    await panel.getByRole("button", { name: "Colour the points by" }).click();
    await page.getByRole("option", { name: "altitude", exact: true }).click();
    await expect(
      panel.getByRole("button", { name: "Colour the points by" }),
    ).toContainText("altitude");
    await expect(canvas).toHaveAccessibleDescription(
      /Coloured by altitude, from 100 to 2060; 3 individuals have no value\./,
    );
    await expect
      .poll(async () => (await leftOfLegend(page, canvas)).equals(highlighted))
      .toBe(false);

    await panel.getByRole("button", { name: "First axis" }).click();
    await page.getByRole("option", { name: "PC4", exact: true }).click();
    const other = panel.getByRole("img", {
      name: "Principal components, PC4, PC2 and PC3",
    });
    await expect(other).toBeVisible();
    await expect(other).toHaveAccessibleDescription(
      /^Principal components of 200 individuals of panel\.nei in 3D, on PC4, 1\.85% of the variance, PC2, 3\.40%, and PC3, 1\.89%\./,
    );
    await expect(panel.locator(".chart-pca3d-label").first()).toHaveText(
      "PC4 (1.85%)",
    );
    const tooltip = await hoverSomePoint(page, other);
    await expect(tooltip.locator("div").last()).toHaveText(
      /^PC4 −?[\d.]+, PC2 −?[\d.]+, PC3 −?[\d.]+$/,
    );
    await expect(tooltip.locator("div").nth(1)).toHaveText(/^altitude: /);
  });

  test("each button of the view moves it its own way, Reset view gives back the start, Zoom in and Zoom out undo each other, and View along names the components chosen", async ({
    page,
  }) => {
    if (test.info().project.name === "webkit") {
      await page.addInitScript(keepDrawingBuffer);
    }
    const panel = await openPanel(page);
    await needsWebGl(page, "the buttons of the 3D view were not tried");
    await ownLd(panel);
    await run(panel);
    const canvas = panel.getByRole("img", { name: PCA_3D });
    await expect(canvas).toBeVisible();
    await canvas.scrollIntoViewIfNeeded();
    const middle = await middleOf(canvas);
    const press = async (name: string): Promise<void> => {
      await panel.getByRole("button", { name, exact: true }).click();
    };
    const start = await canvas.screenshot();
    const startEnds = await lineEnds(panel);

    // Each button draws another picture than the one before it.
    for (const name of [
      "Turn left",
      "Turn right",
      "Tilt up",
      "Tilt down",
      "View along PC1",
      "View along PC2",
      "View along PC3",
      "Zoom in",
      "Zoom out",
    ]) {
      await press("Reset view");
      await expect
        .poll(async () => sameEnds(await lineEnds(panel), startEnds))
        .toBe(true);
      await press(name);
      await expect
        .poll(async () => (await canvas.screenshot()).equals(start), {
          message: name,
        })
        .toBe(false);
    }

    // Each view along a component looks down that one: the first of the
    // other two runs to the right and the second up, and the one looked
    // down ends in the middle.
    for (const [name, down, right, up] of [
      ["View along PC1", 0, 1, 2],
      ["View along PC2", 1, 0, 2],
      ["View along PC3", 2, 0, 1],
    ] as const) {
      await press(name);
      const ends = await lineEnds(panel);
      expect(ends[right]?.x ?? 0, name).toBeGreaterThan(middle.x + 20);
      expect(ends[up]?.y ?? 0, name).toBeLessThan(middle.y - 20);
      expect(Math.abs((ends[down]?.x ?? 0) - middle.x), name).toBeLessThan(2);
      expect(Math.abs((ends[down]?.y ?? 0) - middle.y), name).toBeLessThan(2);
    }

    // Along PC2, whose far end is in the middle: a turn to the right
    // brings the near side right and the far end left, a turn to the left
    // the other way; a tilt down looks from above, so the far end rises,
    // and a tilt up lowers it.
    for (const [name, moves] of [
      [
        "Turn right",
        (a: { x: number; y: number }, b: { x: number; y: number }) =>
          b.x < a.x - 10,
      ],
      [
        "Turn left",
        (a: { x: number; y: number }, b: { x: number; y: number }) =>
          b.x > a.x + 10,
      ],
      [
        "Tilt down",
        (a: { x: number; y: number }, b: { x: number; y: number }) =>
          b.y < a.y - 10,
      ],
      [
        "Tilt up",
        (a: { x: number; y: number }, b: { x: number; y: number }) =>
          b.y > a.y + 10,
      ],
    ] as const) {
      await press("View along PC2");
      const before = (await lineEnds(panel))[1];
      await press(name);
      const after = (await lineEnds(panel))[1];
      if (before === undefined || after === undefined) {
        throw new Error("No end of PC2.");
      }
      expect(
        moves(before, after),
        `${name}: ${JSON.stringify([before, after])}`,
      ).toBe(true);
    }

    // A turn and its opposite, and the two zooms, give back the view.
    for (const [one, back] of [
      ["Turn left", "Turn right"],
      ["Tilt up", "Tilt down"],
      ["Zoom in", "Zoom out"],
    ] as const) {
      await press("Reset view");
      const before = await lineEnds(panel);
      await press(one);
      expect(sameEnds(await lineEnds(panel), before), one).toBe(false);
      await press(back);
      expect(sameEnds(await lineEnds(panel), before), `${one}, ${back}`).toBe(
        true,
      );
    }
    // Zoom in moves the ends away from the middle by a quarter, and Zoom
    // out towards it by a fifth.
    await press("Reset view");
    const first = startEnds[0] ?? middle;
    await press("Zoom in");
    expect(((await lineEnds(panel))[0]?.x ?? 0) - middle.x).toBeCloseTo(
      1.25 * (first.x - middle.x),
      0,
    );
    await press("Reset view");
    await press("Zoom out");
    expect(((await lineEnds(panel))[0]?.x ?? 0) - middle.x).toBeCloseTo(
      0.8 * (first.x - middle.x),
      0,
    );

    // Reset view gives back the start, zoom and all.
    await press("Zoom in");
    await press("Turn left");
    await press("Tilt down");
    await press("Reset view");
    expect(sameEnds(await lineEnds(panel), startEnds)).toBe(true);
    expect((await canvas.screenshot()).equals(start)).toBe(true);

    // The buttons of the views name the components on the axes.
    await panel.getByRole("button", { name: "First axis" }).click();
    await page.getByRole("option", { name: "PC4", exact: true }).click();
    await expect(
      panel.getByRole("button", { name: "View along PC4", exact: true }),
    ).toBeVisible();
    await expect(
      panel.getByRole("button", { name: "View along PC1", exact: true }),
    ).toHaveCount(0);
  });

  test("Try again, and 3D pressed after 2D, each ask the network for the file of the 3D view again, in every engine, and each failure is announced", async ({
    page,
  }) => {
    const asked: string[] = [];
    page.on("request", (request) => {
      if (PCA3D_FILE.test(request.url())) asked.push(request.url());
    });
    await page.route(PCA3D_FILE, (route) => route.fulfill({ status: 404 }));
    const panel = await openPanel(page);
    await run(panel);
    const failed = panel.getByText(LOAD_FAILED_WORDS, { exact: true });
    await expect(failed).toBeVisible();
    await expect(status(page)).toContainText(LOAD_FAILED_WORDS);
    expect(asked).toHaveLength(1);

    // Still refused: a new request, and the words again.
    await panel.getByRole("button", { name: "Try again" }).click();
    await expect.poll(() => asked.length).toBe(2);
    await expect(failed).toBeVisible();
    await expect(status(page)).toContainText(LOAD_FAILED_WORDS);

    // 2D, then 3D: the 3D view is asked for again.
    await panel.getByRole("radio", { name: "2D", exact: true }).click();
    await expect(failed).toHaveCount(0);
    await panel.getByRole("radio", { name: "3D", exact: true }).click();
    await expect.poll(() => asked.length).toBe(3);
    await expect(failed).toBeVisible();

    await page.unroute(PCA3D_FILE);
    await panel.getByRole("button", { name: "Try again" }).click();
    await expect.poll(() => asked.length).toBe(4);
    if (await givesWebGl(page)) {
      await expect(panel.getByRole("img", { name: PCA_3D })).toBeVisible();
    } else {
      noted2d(
        "the file of the 3D view came, and the words of no WebGL were shown",
      );
      await expect(panel.getByText(NO_WEBGL)).toBeVisible();
    }
    await expect(failed).toHaveCount(0);
  });

  test("the loading of the 3D view, and the drawing the browser takes away and gives back: their words in the place of the plot and in the status region", async ({
    page,
  }) => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(PCA3D_FILE, async (route) => {
      await held;
      await route.continue();
    });
    const panel = await openPanel(page);
    await panel.getByRole("button", { name: "Run", exact: true }).click();
    const loading = panel.getByText(LOADING_WORDS, { exact: true });
    await expect(loading).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expect(status(page)).toContainText(LOADING_WORDS);
    release();
    if (!(await givesWebGl(page))) {
      // The drawing cannot be taken away where there is none.
      noted2d(
        "the words of no WebGL followed those of the loading; the loss of the drawing was not tried",
      );
      await expect(panel.getByText(NO_WEBGL)).toBeVisible();
      await expect(loading).toHaveCount(0);
      return;
    }
    const canvas = panel.getByRole("img", { name: PCA_3D });
    await expect(canvas).toBeVisible();
    await expect(loading).toHaveCount(0);

    await canvas.evaluate((element) => {
      const extension = (element as HTMLCanvasElement)
        .getContext("webgl2")
        ?.getExtension("WEBGL_lose_context");
      if (extension === undefined || extension === null) {
        throw new Error("No WEBGL_lose_context.");
      }
      Object.assign(window, { loseContext: extension });
      extension.loseContext();
    });
    const lost = panel.getByText(LOST_WORDS, { exact: true });
    await expect(lost).toBeVisible();
    await expect(status(page)).toContainText(LOST_WORDS);
    await page.evaluate(() => {
      (
        window as unknown as { loseContext: WEBGL_lose_context }
      ).loseContext.restoreContext();
    });
    await expect(lost).toHaveCount(0);
    await expect(canvas).toBeVisible();
  });
});

test.describe("the PCA's own filters typed", () => {
  test("missing data 1.5 refused, MAF 0,9 key by key refused and 0.9 taken, the LD reason said, a distance of 0 refused, and the PCA of 0.05, 0.9, r² 0.2 within 50000 runs on the 950 variants popnei keeps", async ({
    page,
  }) => {
    const panel = await openPanel(page);
    const commit = async (field: Locator, typed: string): Promise<void> => {
      await field.click();
      await page.keyboard.press("ControlOrMeta+a");
      await field.pressSequentially(typed);
      await field.press("Enter");
    };

    await chooseRadio(
      filterGroup(panel, "Filter the variants by missing data"),
      "For the PCA alone",
    );
    const missing = panel.getByLabel(
      "Maximum proportion of missing genotypes, from 0 to 1",
    );
    await expect(missing).toHaveValue("0.1");
    await commit(missing, "1.5");
    const over = "1.5 is more than 1; the threshold stays 0.1.";
    await expect(panel.getByText(over, { exact: true })).toBeVisible();
    await expect(status(page)).toContainText(over);
    await expect(missing).toHaveValue("0.1");
    await commit(missing, "0.05");
    await expect(missing).toHaveValue("0.05");

    await chooseRadio(
      filterGroup(panel, "Filter the variants by major allele frequency (MAF)"),
      "For the PCA alone",
    );
    const maf = panel.getByLabel("Maximum major allele frequency, from 0 to 1");
    await expect(maf).toHaveValue("0.95");
    await commit(maf, "0,9");
    const comma =
      "Write the decimals with a point, 0.1 and not 0,1; the threshold stays 0.95.";
    await expect(panel.getByText(comma, { exact: true })).toBeVisible();
    await expect(status(page)).toContainText(comma);
    await expect(maf).toHaveValue("0.95");
    await commit(maf, "0.9");
    await expect(maf).toHaveValue("0.9");
    await expect(missing).toHaveValue("0.05");

    await chooseRadio(filterGroup(panel, LD_GROUP), "For the PCA alone");
    await expect(status(page)).toContainText(
      "The LD pruning of the PCA needs the distance within which variants are compared.",
    );
    const r2 = panel.getByLabel(
      "Maximum r² with a variant kept before it, from 0 to 1",
    );
    const distance = panel.getByLabel(DISTANCE);
    await commit(distance, "0");
    const zero = "0 is less than 1; the distance is still to be typed.";
    await expect(panel.getByText(zero, { exact: true })).toBeVisible();
    await expect(status(page)).toContainText(zero);
    await expect(distance).toHaveValue("");
    await commit(r2, "0.2");
    await expect(r2).toHaveValue("0.2");
    await commit(distance, "50000");
    await expect(distance).toHaveValue("50000");

    // popnei's js-v0.1.0-dev.3 in node on panel.nei, filterByMissingData
    // (0.05), filterByMaf(0.9) and filterByLd(0.2, 50000), then
    // doPcaFromVariants with numPrinComps 0: 950 variants used, PC1
    // 6.288814135489047 and PC2 4.997116046232042; 29 September 2026.
    await run(panel);
    await expect(
      panel.getByText(
        "The place of each of the 200 individuals of panel.nei on the first 10 of the 199 components, from 950 variants.",
        { exact: true },
      ),
    ).toBeVisible();
    const labels = await to2d(panel);
    await expect(labels).toHaveText(["PC1 (6.29%)", "PC2 (5.00%)"]);
  });
});

test.describe("the explained variance and the table", () => {
  test("the explained variance downloaded with popnei's numbers, the table sorted by PC1, the link that takes the focus to the table, and the line of the versions", async ({
    page,
  }) => {
    const panel = await openPanel(page);
    await run(panel);

    const downloading = page.waitForEvent("download");
    await panel
      .getByRole("button", { name: "Download the explained variance as CSV" })
      .click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe("panel.pca_variance.csv");
    const lines = (await readFile(await download.path(), "utf8")).split("\n");
    // PC1 of popnei's js-v0.1.0-dev.3 with the filters of a new project
    // (docs/specs/analyses/pca.md, "How it is verified").
    expect(lines.slice(0, 3)).toEqual([
      "component,explained_variance_percent",
      "PC1,7.605779109441194",
      "PC2,5.555518021523858",
    ]);
    expect(lines).toHaveLength(12);

    const table = panel.getByRole("grid", { name: /^The place of each/ });
    const firstRow = table.getByRole("row").nth(1);
    await expect(firstRow.getByRole("rowheader")).toHaveText("s000");
    const header = table.getByRole("columnheader", {
      name: "PC1",
      exact: true,
    });
    await header.click();
    await expect(header).toHaveAttribute("aria-sort", "ascending");
    await expect(firstRow.getByRole("rowheader")).not.toHaveText("s000");
    const pc1 = await table
      .getByRole("row")
      .evaluateAll((rows) =>
        rows
          .slice(1, 6)
          .map((row) =>
            Number(
              (
                row.querySelectorAll("[role=gridcell]")[1]?.textContent ?? ""
              ).replace("−", "-"),
            ),
          ),
      );
    expect(pc1).toEqual(pc1.toSorted((a, b) => a - b));
    expect(pc1.every((value) => Number.isFinite(value))).toBe(true);

    await panel
      .getByRole("link", {
        name: "Go to the table of the individuals, which gives the place of each one.",
      })
      .click();
    await expect
      .poll(() =>
        table.evaluate((grid) => grid.contains(document.activeElement)),
      )
      .toBe(true);

    await expect(
      panel.getByText(
        "Calculated with popnei 0.1.0, in version 0.1.0 of the application.",
        { exact: true },
      ),
    ).toBeVisible();
  });

  test("a project saved after the PCA and opened again with panel.nei: the comparison with its check numbers under the table", async ({
    page,
  }, testInfo) => {
    await page.goto("popgen.html#variants");
    await pick(page, "Variants file", "panel.nei");
    await expect(
      page.getByRole("main").getByText("200 individuals"),
    ).toBeVisible();
    await goTo(page, "Analyses");
    const panel = page.getByRole("region", { name: "Principal components" });
    await run(panel);
    const same =
      "The same numbers as in the project file: this variants file gives the results the project was saved with.";
    await expect(panel.getByText(same)).toHaveCount(0);

    await page
      .getByRole("banner")
      .getByRole("button", { name: "Save project" })
      .click();
    const dialog = page.getByRole("dialog", { name: "Save the project" });
    const saving = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    const saved = await saving;
    const path = testInfo.outputPath(saved.suggestedFilename());
    await saved.saveAs(path);

    const chooser = page.waitForEvent("filechooser");
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Open project…" })
      .click();
    await (await chooser).setFiles(path);
    await expect(
      page.getByRole("heading", { level: 1, name: "Variants" }),
    ).toBeFocused();
    await pick(page, "Variants file", "panel.nei");
    await expect(
      page.getByRole("main").getByText("200 individuals"),
    ).toBeVisible();
    await goTo(page, "Analyses");
    await run(panel);
    await expect(panel.getByText(same, { exact: true })).toBeVisible();
  });
});

/** Makes the calculation worker keep back every result it posts. */
async function holdResults(page: Page): Promise<void> {
  const worker = page.workers().find((w) => w.url().includes("runnerWorker"));
  if (worker === undefined) throw new Error("no calculation worker");
  await worker.evaluate(() => {
    const scope = globalThis as unknown as {
      postMessage: (message: unknown, transfer?: Transferable[]) => void;
    };
    const post = scope.postMessage.bind(scope);
    scope.postMessage = (message, transfer) => {
      const kind =
        typeof message === "object" && message !== null && "kind" in message
          ? message.kind
          : null;
      if (kind !== "result") post(message, transfer);
    };
  });
}

test.describe("the line under the bar of a calculation under way", () => {
  test("a Run of the PCA that waits for the statistics of each individual shows no line of the components under its bar", async ({
    page,
  }) => {
    const panel = await openPanel(page);
    await holdResults(page);
    await goTo(page, "Variants");
    await page
      .getByRole("region", { name: "Filters of the individuals" })
      .getByText("Filter the individuals by missing data", { exact: true })
      .click();
    await goTo(page, "Analyses");
    await panel.getByRole("button", { name: "Run", exact: true }).click();
    await expect(
      panel.getByRole("progressbar", {
        name: "Calculating the statistics of each individual",
      }),
    ).toBeVisible();
    await expect(
      panel.getByText(/^Calculating the statistics of each individual, which/),
    ).toBeVisible();
    await expect(panel.getByText(/^The bar shows the reading of/)).toHaveCount(
      0,
    );
  });

  test("the diversity under way has its bar and its one line, and not the line of the components", async ({
    page,
  }) => {
    await openPanel(page);
    await holdResults(page);
    const diversity = page.getByRole("region", {
      name: "Diversity",
      exact: true,
    });
    await diversity.getByRole("button", { name: "Run", exact: true }).click();
    await expect(
      diversity.getByRole("progressbar", { name: "Calculating the diversity" }),
    ).toBeVisible();
    await expect(diversity.getByText(/^Calculating · /)).toBeVisible();
    // The part of the calculation under way, the parent of its bar, holds
    // one line; the fields of the options above it have lines of their
    // own.
    const running = diversity
      .getByRole("progressbar", { name: "Calculating the diversity" })
      .locator("xpath=..");
    await expect(running.locator("p")).toHaveCount(1);
    await expect(
      diversity.getByText(/^The bar shows the reading of/),
    ).toHaveCount(0);
  });
});

test.describe("the legend", () => {
  test("each entry drawn with the mark of its own group, as the plot draws it; the marks of the others faded and not their names; a second press clears the highlight; and the bar of the values yellow at the top, where the largest is written", async ({
    page,
  }) => {
    const panel = await openPanel(page);
    await run(panel);
    await to2d(panel);
    const legend = panel.getByRole("radiogroup", { name: "Population" });
    const entries = legend.getByRole("radio");
    await expect(entries).toHaveText(["p0 (48)", "p2 (84)", "p1 (68)"]);
    // The groups of the plot, 0 to 2, in the order they first appear.
    const drawn = await panel.evaluate((element) => {
      const fillOf = (path: Element | null): string =>
        path === null ? "none" : getComputedStyle(path).fill;
      return {
        legend: [...element.querySelectorAll('[role="radio"] svg path')].map(
          (path) => ({ d: path.getAttribute("d"), fill: fillOf(path) }),
        ),
        plot: [0, 1, 2].map((group) =>
          fillOf(
            element.querySelector(
              `svg.chart-scatter path.chart-points.chart-colour-${String(group)}`,
            ),
          ),
        ),
      };
    });
    expect(drawn.legend.map((mark) => mark.fill)).toEqual(drawn.plot);
    expect(new Set(drawn.plot).size).toBe(3);
    expect(new Set(drawn.legend.map((mark) => mark.d)).size).toBe(3);

    const p1 = legend.locator("button").filter({ hasText: "p1 (68)" });
    await p1.click();
    await expect(entries.nth(2)).toHaveAttribute("aria-checked", "true");
    const opacities = await legend.evaluate((group) =>
      [...group.querySelectorAll('[role="radio"]')].map((entry) => {
        const [mark, words] = [...entry.children];
        return [
          mark === undefined ? -1 : Number(getComputedStyle(mark).opacity),
          words === undefined ? -1 : Number(getComputedStyle(words).opacity),
        ];
      }),
    );
    expect(opacities).toEqual([
      [0.25, 1],
      [0.25, 1],
      [1, 1],
    ]);
    await p1.click();
    await expect(entries.nth(2)).toHaveAttribute("aria-checked", "false");
    await expect(panel.locator("svg.chart-scatter desc")).not.toHaveText(
      /is highlighted/,
    );
    await expect(panel.locator("path.chart-points-faded")).toHaveCount(0);

    await panel.getByRole("button", { name: "Colour the points by" }).click();
    await page.getByRole("option", { name: "altitude", exact: true }).click();
    // The two ends of the scale, and beside them its bar, from the top.
    const ends = panel.getByText("2060", { exact: true }).locator("..");
    await expect(ends.locator("span")).toHaveText(["2060", "100"]);
    const bands = await ends
      .locator("..")
      .locator("rect")
      .evaluateAll((rects) => rects.map((rect) => rect.getAttribute("fill")));
    expect(bands).toHaveLength(32);
    expect(bands[0]).toBe("#fde725");
    expect(bands.at(-1)).toBe("#440154");
  });

  test("a result of two components: 3D disabled, with the line that says why, and the 2D plot", async ({
    page,
  }) => {
    await page.goto("popgen.html#variants");
    await pick(page, "Variants file", "panel.nei");
    await expect(
      page.getByRole("main").getByText("200 individuals"),
    ).toBeVisible();
    const lists = page.getByRole("region", {
      name: "Filters of the individuals",
    });
    await lists
      .getByRole("textbox", { name: "Individuals to keep, one name per line" })
      .fill("s000\ns001\ns002");
    await lists
      .getByRole("button", { name: "Apply the list to keep", exact: true })
      .click();
    await goTo(page, "Analyses");
    const panel = page.getByRole("region", { name: "Principal components" });
    await panel.getByRole("button", { name: "Run", exact: true }).click();
    await expect(
      panel.getByText(
        "The 3D view needs three components, and this result has 2.",
      ),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expect(
      panel.getByRole("radio", { name: "3D", exact: true }),
    ).toBeDisabled();
    await expect(
      panel.getByRole("img", { name: "Principal components, PC1 and PC2" }),
    ).toBeVisible();
    await expect(panel.locator("canvas")).toHaveCount(0);
  });
});

/** The calculation workers the page has. */
function runnerWorkers(page: Page): number {
  return page.workers().filter((w) => w.url().includes("runnerWorker")).length;
}

/** The header's Undo. */
function headerUndo(page: Page): Locator {
  return page
    .getByRole("banner")
    .getByRole("button", { name: "Undo", exact: true });
}

const MAF_GROUP = "Filter the variants by major allele frequency (MAF)";
const MAF_FIELD = "Maximum major allele frequency, from 0 to 1";
const R2_FIELD = "Maximum r² with a variant kept before it, from 0 to 1";

/** Selects what `field` holds and types `typed` into it key by key,
    without committing it. */
async function retype(
  page: Page,
  field: Locator,
  typed: string,
): Promise<void> {
  await field.click();
  await page.keyboard.press("ControlOrMeta+a");
  await field.pressSequentially(typed);
}

test.describe("IP10 D3 the number fields of the PCA's own filters", () => {
  test("IP10 D3 the MAF set for the PCA shows under its field the line of the Variants step of what popnei filters on, which describes the field", async ({
    page,
    makeAxeBuilder,
  }) => {
    const panel = await openPanel(page);
    await chooseRadio(filterGroup(panel, MAF_GROUP), "For the PCA alone");
    const line =
      "The frequency of the commonest allele: 0.95 removes a variant whose commonest allele is above 0.95. For a variant of two alleles, that is a minor allele frequency below 0.05.";
    await expect(panel.getByText(line, { exact: true })).toBeVisible();
    await expect(panel.getByLabel(MAF_FIELD)).toHaveAccessibleDescription(line);
    await expectNoViolations(makeAxeBuilder);
  });

  test("IP10 D3 an r² of 1.5 or typed 0,5 key by key, a distance of 0 or typed 60,000 key by key while it is 50000, and a MAF of 0.123 are refused with the line of the Variants step, the value kept and nothing sent", async ({
    page,
    makeAxeBuilder,
  }) => {
    const panel = await openPanel(page);
    await ownLd(panel);
    const lastStep = "Undo: the LD filter of the principal components changed";
    await expect(headerUndo(page)).toHaveAccessibleDescription(lastStep);
    const r2 = panel.getByLabel(R2_FIELD);
    const distance = panel.getByLabel(DISTANCE);
    const refused = async (
      field: Locator,
      typed: string,
      line: string,
      kept: string,
      undoText: string,
    ): Promise<void> => {
      await retype(page, field, typed);
      await field.press("Enter");
      await expect(panel.getByText(line, { exact: true })).toBeVisible();
      await expect(status(page)).toContainText(line);
      await expect(field).toHaveValue(kept);
      await expect(headerUndo(page)).toHaveAccessibleDescription(undoText);
    };

    await refused(
      r2,
      "1.5",
      "1.5 is more than 1; the maximum r² stays 0.1.",
      "0.1",
      lastStep,
    );
    await refused(
      r2,
      "0,5",
      "Write the decimals with a point, 0.1 and not 0,1; the maximum r² stays 0.1.",
      "0.1",
      lastStep,
    );
    await refused(
      distance,
      "0",
      "0 is less than 1; the distance stays 50000.",
      "50000",
      lastStep,
    );
    await refused(
      distance,
      "60,000",
      "Write the distance as a whole number of base pairs, 10000 and not 10,000; the distance stays 50000.",
      "50000",
      lastStep,
    );
    await expectNoViolations(makeAxeBuilder);

    await chooseRadio(filterGroup(panel, MAF_GROUP), "For the PCA alone");
    const mafStep =
      "Undo: the MAF filter of the principal components was set for them alone";
    await refused(
      panel.getByLabel(MAF_FIELD),
      "0.123",
      "0.123 has more than two decimals; the threshold stays 0.95.",
      "0.95",
      mafStep,
    );
  });

  test("IP10 D3 a field left empty sends nothing: the MAF shows 0.95 again after Enter, and the empty distance stays empty after Tab", async ({
    page,
  }) => {
    const panel = await openPanel(page);
    await chooseRadio(filterGroup(panel, MAF_GROUP), "For the PCA alone");
    const maf = panel.getByLabel(MAF_FIELD);
    const mafStep =
      "Undo: the MAF filter of the principal components was set for them alone";
    await expect(headerUndo(page)).toHaveAccessibleDescription(mafStep);
    await maf.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("Backspace");
    await expect(maf).toHaveValue("");
    await page.keyboard.press("Enter");
    await expect(maf).toHaveValue("0.95");
    await expect(panel.getByText(/stays 0\.95\.$/)).toHaveCount(0);
    await expect(headerUndo(page)).toHaveAccessibleDescription(mafStep);

    await chooseRadio(filterGroup(panel, LD_GROUP), "For the PCA alone");
    const ldStep =
      "Undo: the LD filter of the principal components was set for them alone";
    const distance = panel.getByLabel(DISTANCE);
    await expect(distance).toHaveValue("");
    await distance.focus();
    await page.keyboard.press("Tab");
    await expect(distance).not.toBeFocused();
    await expect(distance).toHaveValue("");
    await expect(panel.getByText(/still to be typed\.$/)).toHaveCount(0);
    await expect(headerUndo(page)).toHaveAccessibleDescription(ldStep);
  });

  test("IP10 D3 in the PCA's empty distance the arrow keys, Page Up, Page Down, Home and End send nothing, and an Undo of 50000 leaves it empty", async ({
    page,
    makeAxeBuilder,
  }) => {
    const panel = await openPanel(page);
    await chooseRadio(filterGroup(panel, LD_GROUP), "For the PCA alone");
    const ldStep =
      "Undo: the LD filter of the principal components was set for them alone";
    const distance = panel.getByLabel(DISTANCE);
    await distance.focus();
    for (const key of [
      "ArrowUp",
      "ArrowDown",
      "PageUp",
      "PageDown",
      "Home",
      "End",
    ]) {
      await page.keyboard.press(key);
      await expect(distance).toHaveValue("");
    }
    await page.keyboard.press("Tab");
    await expect(distance).toHaveValue("");
    await expect(headerUndo(page)).toHaveAccessibleDescription(ldStep);

    await distance.pressSequentially("50000");
    await distance.press("Enter");
    await expect(distance).toHaveValue("50000");
    await headerUndo(page).click();
    await expect(distance).toHaveValue("");
    await expect(headerUndo(page)).toHaveAccessibleDescription(ldStep);
    await expect(
      panel.getByRole("button", { name: "Run", exact: true }),
    ).toBeDisabled();
    await expectNoViolations(makeAxeBuilder);
  });
});

test.describe("IP10 D3 the states of the panel", () => {
  test("IP10 D3 before any variants file the PCA is locked: its Run disabled and described by the reason", async ({
    page,
    makeAxeBuilder,
  }) => {
    await page.goto("popgen.html#analyses");
    const panel = page.getByRole("region", { name: "Principal components" });
    const runButton = panel.getByRole("button", { name: "Run", exact: true });
    await expect(runButton).toBeDisabled();
    await expect(runButton).toHaveAccessibleDescription(
      "Load a variants file in the Variants step.",
    );
    await expect(
      panel.getByText("Load a variants file in the Variants step.", {
        exact: true,
      }),
    ).toBeVisible();
    await expectNoViolations(makeAxeBuilder);
  });

  test("IP10 D3 the method changed while the PCA runs leaves the calculation behind with the notice and shows Run for the PCoA, and its Undo gives the calculation back", async ({
    page,
    makeAxeBuilder,
  }) => {
    const panel = await openPanel(page);
    await holdResults(page);
    await panel.getByRole("button", { name: "Run", exact: true }).click();
    const bar = panel.getByRole("progressbar");
    await expect(bar).toBeVisible();
    await expect(panel.getByRole("button", { name: "Stop" })).toBeVisible();

    await chooseRadio(
      filterGroup(panel, "Method"),
      "PCoA of the Kosman distances, for data with many missing genotypes",
    );
    const notice = page.getByRole("alertdialog");
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("unless you undo the change");
    await expect(bar).toHaveCount(0);
    await expect(panel.getByRole("button", { name: "Stop" })).toHaveCount(0);
    await expect(
      panel.getByRole("button", { name: "Run", exact: true }),
    ).toBeEnabled();
    await expectNoViolations(makeAxeBuilder);

    await notice.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(
      filterGroup(panel, "Method").getByRole("radio", {
        name: "PCA of the genotypes",
      }),
    ).toBeChecked();
    await expect(bar).toBeVisible();
    await expect(panel.getByRole("button", { name: "Stop" })).toBeVisible();
    await expect(
      panel.getByRole("button", { name: "Run", exact: true }),
    ).toHaveCount(0);
  });

  test("IP10 D3 Stop pressed with the keyboard stops the PCA and not the diversity: Run back in its place, and the diversity ready", async ({
    page,
  }) => {
    const panel = await openPanel(page);
    await holdResults(page);
    const button = panel.getByRole("button", { name: "Run", exact: true });
    await button.focus();
    await page.keyboard.press("Enter");
    const stop = panel.getByRole("button", { name: "Stop" });
    await expect(stop).toBeFocused();
    await expect(panel.getByRole("progressbar")).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(button).toBeFocused();
    await expect(panel.getByRole("progressbar")).toHaveCount(0);
    await expect(stop).toHaveCount(0);
    await expect(status(page)).toContainText("Principal components: stopped.");
    const diversity = page.getByRole("region", {
      name: "Diversity",
      exact: true,
    });
    await expect(
      diversity.getByRole("button", { name: "Run", exact: true }),
    ).toBeEnabled();
    await expect(diversity.getByRole("progressbar")).toHaveCount(0);
  });

  test("IP10 D3 Run pressed with the keyboard: once the result is drawn and the button gone, the focus is on the heading of the panel", async ({
    page,
  }) => {
    const panel = await openPanel(page);
    const button = panel.getByRole("button", { name: "Run", exact: true });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(panel.getByText(/^The place of each of the 200/)).toBeVisible({
      timeout: RESULT_TIMEOUT,
    });
    await expect(button).toHaveCount(0);
    await expect(
      panel.getByRole("heading", { level: 2, name: "Principal components" }),
    ).toBeFocused();
  });

  test("IP10 D3 popnei's refusal of no variant left after the PCA's MAF of 0 in its words, with no Run; the statistics of each individual failed in theirs, the diversity, not run, saying it cannot run, and a crash, each with Run again", async ({
    page,
    makeAxeBuilder,
  }) => {
    const panel = await openPanel(page);
    await chooseRadio(filterGroup(panel, MAF_GROUP), "For the PCA alone");
    const maf = panel.getByLabel(MAF_FIELD);
    await retype(page, maf, "0");
    await maf.press("Enter");
    await expect(maf).toHaveValue("0");
    await panel.getByRole("button", { name: "Run", exact: true }).click();
    await expect(
      panel.getByText(
        "No variant of panel.nei is left after the filters of the PCA, so there is no variant to do the PCA with. Loosen the filters the PCA has for itself in its options above, or those of the Variants step that it follows; the Count button of the Variants step shows how many each filter of the step keeps.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expect(
      panel.getByRole("button", { name: "Run", exact: true }),
    ).toHaveCount(0);
    await expectNoViolations(makeAxeBuilder);

    // The MAF back to the step's, and the statistics of each individual
    // asked by a threshold of the individuals, then crashed.
    await chooseRadio(
      filterGroup(panel, MAF_GROUP),
      "As in the Variants step: off",
    );
    await goTo(page, "Variants");
    await page
      .getByRole("region", { name: "Filters of the individuals" })
      .getByText("Filter the individuals by missing data", { exact: true })
      .click();
    await goTo(page, "Analyses");
    await crashResults(page);
    await panel.getByRole("button", { name: "Run", exact: true }).click();
    await expect(
      panel.getByText(
        /^The statistics of each individual, which the thresholds of the individuals need, could not be calculated, so the PCA was not run\./,
      ),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expect(
      panel.getByRole("button", { name: "Run", exact: true }),
    ).toBeEnabled();
    // The diversity, whose Run was not pressed, cannot run (stop C 4).
    await expect(
      page
        .getByRole("region", { name: "Diversity", exact: true })
        .getByText(
          /^The statistics of each individual, which the thresholds of the individuals need, could not be calculated, so the diversity cannot run\./,
        ),
    ).toBeVisible();

    // With no threshold of the individuals, the PCA's own calculation
    // crashes, in the worker started after the last crash: its words, and
    // Run again.
    await goTo(page, "Variants");
    await page
      .getByRole("region", { name: "Filters of the individuals" })
      .getByText("Filter the individuals by missing data", { exact: true })
      .click();
    await goTo(page, "Analyses");
    await expect.poll(() => runnerWorkers(page)).toBe(1);
    await crashResults(page);
    await panel.getByRole("button", { name: "Run", exact: true }).click();
    await expect(
      panel.getByText(/^The calculation stopped unexpectedly\. Run it again\./),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expect(
      panel.getByRole("button", { name: "Run", exact: true }),
    ).toBeEnabled();
    await expectNoViolations(makeAxeBuilder);
  });
});

test("after the review of the rounds: under the PCoA the reason of its own LD pruning with no distance names the PCoA, beside the field and in the status region", async ({
  page,
  makeAxeBuilder,
}) => {
  const panel = await openPanel(page);
  await chooseRadio(
    panel.getByRole("radiogroup", { name: "Method" }),
    "PCoA of the Kosman distances, for data with many missing genotypes",
  );
  await chooseRadio(filterGroup(panel, LD_GROUP), "For the PCoA alone");
  const reason =
    "The LD pruning of the PCoA needs the distance within which variants are compared. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs, or set the LD pruning of the PCoA back to as in the Variants step.";
  await expect(status(page)).toContainText(reason);
  // The reason first, then the line under the fields.
  await expect(panel.getByLabel(DISTANCE)).toHaveAccessibleDescription(
    new RegExp(`^${reason.replaceAll(".", "\\.")} Of two variants`),
  );
  await expect(panel.getByText(/of the PCA/)).toHaveCount(0);
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
});

test("after the review of the rounds: Shift+Home and then Shift+End in the field of the distance keep the anchor of the selection, as a text field does", async ({
  page,
}) => {
  const panel = await openPanel(page);
  await chooseRadio(filterGroup(panel, LD_GROUP), "For the PCA alone");
  const distance = panel.getByLabel(DISTANCE);
  await distance.click();
  await distance.pressSequentially("50000");
  await distance.press("Enter");
  await expect(distance).toHaveValue("50000");
  const selection = (): Promise<[number | null, number | null]> =>
    distance.evaluate((input: HTMLInputElement) => [
      input.selectionStart,
      input.selectionEnd,
    ]);
  await distance.evaluate((input: HTMLInputElement) => {
    input.setSelectionRange(2, 2);
  });
  await distance.press("Shift+Home");
  expect(await selection()).toEqual([0, 2]);
  await distance.press("Shift+End");
  expect(await selection()).toEqual([2, 5]);
  await distance.press("Shift+End");
  expect(await selection()).toEqual([2, 5]);
  await distance.press("Shift+Home");
  expect(await selection()).toEqual([0, 2]);
  await expect(distance).toHaveValue("50000");
});
