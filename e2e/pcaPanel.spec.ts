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
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";
import { writeBigVcf } from "./bigVcf.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The words of the 3D view (docs/specs/analyses/pca.md, "Its words"). */
const NO_WEBGL = /^This browser cannot draw the 3D view: WebGL/;
const LOAD_FAILED = /^The 3D view could not be loaded, so the 2D plot/;

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
async function crashResults(page: Page): Promise<void> {
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
      post(
        kind === "result"
          ? { kind: "crashed", message: "a crash made by the test" }
          : message,
        transfer,
      );
    };
  });
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
  // Drawn in every engine: Chromium, which keeps the failed download for
  // the life of the page, is asked the same file at another address.
  await expect(
    panel.getByRole("img", { name: "Principal components, PC1, PC2 and PC3" }),
  ).toBeVisible();
  await expect(panel.locator("canvas")).toHaveCount(1);
  await expect(panel.getByText(LOAD_FAILED)).toHaveCount(0);
});

test("a worker that stopped with no answer after a PCA of 2,300 individuals: the words of memory, counted on the individuals it ran on", async ({
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
  await goTo(page, "Analyses");
  const panel = page.getByRole("region", { name: "Principal components" });
  await crashResults(page);
  await panel.getByRole("button", { name: "Run", exact: true }).click();
  await expect(
    panel.getByText(
      "The calculation stopped unexpectedly, perhaps because the principal components of 2,300 individuals, which need about 0.3 GB, did not fit in the memory of this tab; a phone or a tablet gives a tab far less than a computer. Keep fewer individuals with the filters of individuals in the Variants step, close other tabs and run it again, or calculate them with popnei in Python, outside the browser.",
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
      .getByRole("region", { name: "Diversity" })
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
