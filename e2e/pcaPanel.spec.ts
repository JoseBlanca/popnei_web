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
  // A browser may keep the failed download for the life of the page, and
  // give the words again (docs/specs/charts/pca3d.md, "Loading three.js"):
  // either is an answer, and the test says which.
  const drawn = panel.getByRole("img", {
    name: "Principal components, PC1, PC2 and PC3",
  });
  await expect(drawn.or(panel.getByText(LOAD_FAILED))).toBeVisible();
  test.info().annotations.push({
    type: "Try again",
    description:
      (await drawn.count()) > 0 ? "drew the 3D view" : "failed again",
  });
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
