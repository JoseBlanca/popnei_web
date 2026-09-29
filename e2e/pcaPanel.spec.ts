/**
 * The panel of the principal components on the built site
 * (docs/specs/analyses/pca.md, "The panel"): its options, the LD filter
 * set for the PCA with its reason beside the empty distance, its result in
 * 3D and in 2D with popnei's numbers on the axes, the legend that
 * highlights a group from the keyboard, the colour by the values of a
 * column, the table, the PCoA with its warning and its line, the words of
 * a calculation under way, of a browser with no WebGL 2 and of three.js
 * not downloaded, and a worker that stopped. The tests tagged IP8 D4 are
 * the spec's flow, in parts; axe at each state reached.
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

test("IP8 D4 the PCA of a new project: its options follow the Variants step, 3D first, the warning of no LD filter, and PC1 and PC2 in 2D", async ({
  page,
  makeAxeBuilder,
}) => {
  const panel = await openPanel(page);
  await expect(
    filterGroup(panel, "Filter the variants by missing data").getByRole(
      "radio",
      { name: "As in the Variants step: 0.1" },
    ),
  ).toBeChecked();
  await expect(
    filterGroup(
      panel,
      "Filter the variants by major allele frequency (MAF)",
    ).getByRole("radio", { name: "As in the Variants step: off" }),
  ).toBeChecked();
  await expect(
    filterGroup(panel, LD_GROUP).getByRole("radio", {
      name: "As in the Variants step: off",
    }),
  ).toBeChecked();
  await expect(panel.getByText("200 individuals of panel.nei")).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Run", exact: true }),
  ).toBeEnabled();
  await expectNoViolations(makeAxeBuilder);
  await run(panel);
  await expect(
    panel.getByText(/^Warning: No LD filter was applied/),
  ).toBeVisible();
  const webgl = await page.evaluate(
    () => document.createElement("canvas").getContext("webgl2") !== null,
  );
  if (webgl) {
    await expect(
      panel.getByRole("img", {
        name: "Principal components, PC1, PC2 and PC3",
      }),
    ).toBeVisible();
    await expect(
      panel.getByRole("button", { name: "Turn left" }),
    ).toBeVisible();
  } else {
    await expect(panel.getByText(NO_WEBGL)).toBeVisible();
  }
  await expect(
    panel.getByRole("radio", { name: "3D", exact: true }),
  ).toBeChecked();
  await expectNoViolations(makeAxeBuilder);
  const labels = await to2d(panel);
  await expect(labels).toHaveText(["PC1 (7.61%)", "PC2 (5.56%)"]);
  await expect(
    panel.getByRole("radio", { name: "2D", exact: true }),
  ).toBeFocused();
  await expect(panel.getByRole("button", { name: "Turn left" })).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("IP8 D4 the LD filter set for the PCA: its reason beside the empty distance and the disabled Run, a comma refused, 50000 typed, and popnei's numbers", async ({
  page,
  makeAxeBuilder,
}) => {
  const panel = await openPanel(page);
  await chooseRadio(filterGroup(panel, LD_GROUP), "For the PCA alone");
  const reason = /^The LD filter of the PCA needs the distance/;
  const field = panel.getByLabel(DISTANCE);
  await expect(field).toHaveValue("");
  await expect(field).toHaveAccessibleDescription(reason);
  await expect(
    panel.getByRole("button", { name: "Run", exact: true }),
  ).toHaveAccessibleDescription(reason);
  await expect(
    panel.getByRole("button", { name: "Run", exact: true }),
  ).toBeDisabled();
  await expectNoViolations(makeAxeBuilder);
  await field.pressSequentially("50,000");
  await field.press("Enter");
  await expect(
    panel.getByText(
      "Write the distance as a whole number of base pairs, 10000 and not 10,000; the distance is still to be typed.",
    ),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Run", exact: true }),
  ).toBeDisabled();
  await field.fill("");
  await field.pressSequentially("50000");
  await field.press("Enter");
  await expect(
    panel.getByRole("button", { name: "Run", exact: true }),
  ).toBeEnabled();
  await expect(panel.getByText(reason)).toHaveCount(0);
  await run(panel);
  await expect(panel.getByText(/^Warning:/)).toHaveCount(0);
  await expect(await to2d(panel)).toHaveText(["PC1 (3.55%)", "PC2 (3.40%)"]);
  const row = panel.getByRole("row", { name: /^s000/ });
  await expect(row.getByRole("gridcell").nth(1)).toHaveText("−0.7139");
  await expect(row.getByRole("gridcell").nth(2)).toHaveText("7.6765");
  await expectNoViolations(makeAxeBuilder);
});

test("IP8 D4 the legend highlights p1 from the keyboard, and the colour by altitude has its scale and no highlight", async ({
  page,
  makeAxeBuilder,
}) => {
  const panel = await openPanel(page);
  await ownLd(panel);
  await run(panel);
  await to2d(panel);
  const legend = panel.getByRole("radiogroup", { name: "Population" });
  await legend.getByRole("radio", { name: "p0 (48)" }).focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(legend.getByRole("radio", { name: "p1 (68)" })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(legend.getByRole("radio", { name: "p1 (68)" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  // The description of the plot, which the SVG is named by with its
  // title (docs/specs/charts/plot2d.md).
  const plot = panel.locator("svg.chart-scatter desc");
  await expect(plot).toHaveText(/p1 is highlighted\./);
  await expect(panel.locator(".chart-points-faded")).toHaveCount(2);
  await expectNoViolations(makeAxeBuilder);
  // A second press clears it.
  await page.keyboard.press("Space");
  await expect(legend.getByRole("radio", { name: "p1 (68)" })).toHaveAttribute(
    "aria-checked",
    "false",
  );
  await expect(panel.locator(".chart-points-faded")).toHaveCount(0);
  await page.keyboard.press("Space");
  await panel.getByRole("button", { name: "Colour the points by" }).click();
  await page.getByRole("option", { name: "altitude", exact: true }).click();
  await expect(plot).toHaveText(
    /Coloured by altitude, from 100 to 2060; 3 individuals have no value\./,
  );
  await expect(panel.getByText("No value (3)")).toBeVisible();
  await expect(panel.getByText("2060", { exact: true })).toBeVisible();
  await expect(
    panel.getByRole("radiogroup", { name: "Population" }),
  ).toHaveCount(0);
  await expect(
    panel.getByRole("columnheader", { name: "altitude" }),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
  // Back to the populations: the colouring is the same object as the one
  // p1 was pressed in, so its highlight is drawn again, and it marks p1
  // (docs/specs/analyses/pca.md, "What it shows", the legend).
  await panel.getByRole("button", { name: "Colour the points by" }).click();
  await page.getByRole("option", { name: "Population", exact: true }).click();
  await expect(plot).toHaveText(/p1 is highlighted\./);
  await expect(
    panel.getByRole("button", { name: "Run", exact: true }),
  ).toHaveCount(0);
});

test("IP8 D4 the PCoA with the PCA's own LD filter: PC1 and PC2, the warning of the correction and the line under the explained variance", async ({
  page,
  makeAxeBuilder,
}) => {
  const panel = await openPanel(page);
  await ownLd(panel);
  await chooseRadio(
    panel.getByRole("radiogroup", { name: "Method" }),
    "PCoA of the Kosman distances, for data with many missing genotypes",
  );
  await expect(
    panel.getByRole("heading", {
      name: "Filters of the variants for the PCoA",
    }),
  ).toBeVisible();
  await run(panel);
  await expect(await to2d(panel)).toHaveText(["PC1 (3.68%)", "PC2 (3.54%)"]);
  const warning = panel.getByText(/^Warning: The Kosman distances/);
  for (const number of ["7.87%", "0.047", "53%", "0.22"]) {
    await expect(warning).toContainText(number);
  }
  const line = panel.getByText(/^The percentages are of the Kosman distances/);
  await expect(line).toContainText("0.047");
  await expect(line).toContainText("198 components");
  await expectNoViolations(makeAxeBuilder);
});

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
