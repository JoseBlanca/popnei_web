/**
 * The flow of the principal components on the built site
 * (docs/specs/analyses/pca.md, "How it is verified", the Playwright flow;
 * docs/specs/charts/pca3d.md, "How it is verified", "The file of its
 * own"), in parts, each from a fresh page:
 *
 * - IP8 D4, the PCA on the screen: panel.nei and panel_meta.csv, popcat;
 *   the options following the Variants step, 3D first, the warning of no
 *   LD filter and "PC1 (7.61%)", "PC2 (5.56%)" in 2D; the PCA's own LD
 *   filter with its reason beside the distance and the disabled Run,
 *   50000, "PC1 (3.55%)", "PC2 (3.40%)", no warning and s000 at −0.7139,
 *   7.6765; p1 highlighted from the legend with the keyboard; the colour
 *   by altitude and back, with no calculation and one step of Undo each;
 *   the LD filter back to the step, 7.61% with no notice and no
 *   calculation, and set again, 50000 and 3.55%; 3D, the turns and 2D;
 *   the CSV of the table; the PCoA with its numbers; axe at each state.
 * - IP8 D5, three.js in a file of its own: no file of pca3d asked before
 *   the first result is drawn and one after; a download held back until
 *   2D is pressed leaves no canvas; the first script of popgen.html holds
 *   no WebGLRenderer; and the size of the file of three.js, gzipped.
 * - IP8 D6, the key of the PCA on the screen: the colour, the axes and
 *   the view remove no result and send no request to the calculation
 *   worker; a filter of the PCA removes it, with its notice.
 *
 * The requests are counted as the page posts them to the calculation
 * worker, by a wrapper of `Worker.prototype.postMessage` put on the page
 * before its scripts run.
 */
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");
const DIST = join(import.meta.dirname, "..", "dist");

/** A PCA of panel.nei takes well under a second; 30 s leaves room for a
    loaded machine. */
const RESULT_TIMEOUT = 30_000;

const LD_GROUP = "Prune the variants by linkage disequilibrium (LD)";
const DISTANCE =
  "Distance within which variants are compared, in base pairs, from 1";
const REASON = /^The LD pruning of the PCA needs the distance/;
const PCA_3D = "Principal components, PC1, PC2 and PC3";
const PCA_2D = "Principal components, PC1 and PC2";

/** Counts the requests the page posts to its workers, by kind, in
    `window.postedRuns`: every "run" message is one calculation asked. */
function countRuns(): void {
  const posted = { runs: 0 };
  Object.assign(globalThis, { postedRuns: posted });
  // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with its worker
  const post = Worker.prototype.postMessage;
  Worker.prototype.postMessage = function (
    this: Worker,
    message: unknown,
    ...rest: unknown[]
  ) {
    if (
      typeof message === "object" &&
      message !== null &&
      "kind" in message &&
      message.kind === "run"
    ) {
      posted.runs += 1;
    }
    (post as (...args: unknown[]) => void).call(this, message, ...rest);
  } as typeof post;
}

/** The calculations the page asked of its workers so far. */
async function runsPosted(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      (globalThis as unknown as { postedRuns: { runs: number } }).postedRuns
        .runs,
  );
}

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

/** Opens the page with its requests counted, loads panel.nei and
    panel_meta.csv, chooses popcat, goes to the Analyses step, and gives
    the panel of the principal components. */
async function openPanel(page: Page): Promise<Locator> {
  await page.addInitScript(countRuns);
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

/** Chooses the radio button `name` of `group` by a click on its words. */
async function chooseRadio(group: Locator, name: string): Promise<void> {
  await group.locator("label").filter({ hasText: name }).click();
  await expect(group.getByRole("radio", { name })).toBeChecked();
}

function ldGroup(panel: Locator): Locator {
  return panel.getByRole("radiogroup", { name: LD_GROUP });
}

/** Sets the LD filter for the PCA alone and types 50000 key by key. */
async function ownLd(panel: Locator): Promise<void> {
  await chooseRadio(ldGroup(panel), "For the PCA alone");
  const field = panel.getByLabel(DISTANCE);
  await field.pressSequentially("50000");
  await field.press("Enter");
  await expect(field).toHaveValue("50000");
}

async function run(panel: Locator): Promise<void> {
  await panel.getByRole("button", { name: "Run", exact: true }).click();
  await expect(panel.getByText(/^The place of each of the 200/)).toBeVisible({
    timeout: RESULT_TIMEOUT,
  });
}

/** The labels of the axes of the 2D plot. */
function axisLabels(panel: Locator): Locator {
  return panel.locator("svg.chart-scatter .chart-axis-label");
}

/** The text a screen reader reads for the 2D plot. */
function description2d(panel: Locator): Locator {
  return panel.locator("svg.chart-scatter desc");
}

function undo(page: Page): Locator {
  return page
    .getByRole("banner")
    .getByRole("button", { name: "Undo", exact: true });
}

/** Whether this engine gives WebGL 2, as the plot asks for it. */
async function givesWebGl(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const context = document.createElement("canvas").getContext("webgl2");
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return context !== null;
  });
}

test.describe("IP8 D4 the PCA on the screen", () => {
  test("IP8 D4 a new project: its filters follow the Variants step, the 3D view first, the warning of no LD filter, and PC1 (7.61%) and PC2 (5.56%) in 2D", async ({
    page,
    makeAxeBuilder,
  }) => {
    const panel = await openPanel(page);
    await expect(
      panel
        .getByRole("radiogroup", {
          name: "Filter the variants by missing data",
        })
        .getByRole("radio", { name: "As in the Variants step: 0.1" }),
    ).toBeChecked();
    await expect(
      panel
        .getByRole("radiogroup", {
          name: "Filter the variants by major allele frequency (MAF)",
        })
        .getByRole("radio", { name: "As in the Variants step: off" }),
    ).toBeChecked();
    await expect(
      ldGroup(panel).getByRole("radio", {
        name: "As in the Variants step: off",
      }),
    ).toBeChecked();
    await expect(
      panel.getByRole("button", { name: "Run", exact: true }),
    ).toBeEnabled();
    await expectNoViolations(makeAxeBuilder);
    await run(panel);
    await expect(
      panel.getByText(/^Warning: No LD filter was applied/),
    ).toBeVisible();
    if (await givesWebGl(page)) {
      await expect(panel.getByRole("img", { name: PCA_3D })).toBeVisible();
    } else {
      test.info().annotations.push({
        type: "no WebGL 2",
        description: "the 2D plot was drawn with the words of no WebGL",
      });
      await expect(
        panel.getByText(/^This browser cannot draw the 3D view/),
      ).toBeVisible();
    }
    await expectNoViolations(makeAxeBuilder);
    await panel.getByRole("radio", { name: "2D", exact: true }).click();
    await expect(axisLabels(panel)).toHaveText(["PC1 (7.61%)", "PC2 (5.56%)"]);
    await expectNoViolations(makeAxeBuilder);
  });

  test("IP8 D4 the PCA's own LD filter: its reason beside the distance and the disabled Run, 50000 typed, PC1 (3.55%) and PC2 (3.40%), no warning, and s000 at −0.7139, 7.6765", async ({
    page,
    makeAxeBuilder,
  }) => {
    const panel = await openPanel(page);
    await chooseRadio(ldGroup(panel), "For the PCA alone");
    const field = panel.getByLabel(DISTANCE);
    const runButton = panel.getByRole("button", { name: "Run", exact: true });
    await expect(field).toHaveValue("");
    await expect(field).toHaveAccessibleDescription(REASON);
    await expect(runButton).toBeDisabled();
    await expect(runButton).toHaveAccessibleDescription(REASON);
    await expect(panel.getByText(REASON)).toHaveCount(2);
    await expectNoViolations(makeAxeBuilder);
    await field.pressSequentially("50000");
    await field.press("Enter");
    await expect(runButton).toBeEnabled();
    await expect(panel.getByText(REASON)).toHaveCount(0);
    await run(panel);
    await expect(panel.getByText(/^Warning:/)).toHaveCount(0);
    await expect(panel.getByRole("heading", { name: /warning/ })).toHaveCount(
      0,
    );
    await panel.getByRole("radio", { name: "2D", exact: true }).click();
    await expect(axisLabels(panel)).toHaveText(["PC1 (3.55%)", "PC2 (3.40%)"]);
    const cells = panel
      .getByRole("row", { name: /^s000/ })
      .getByRole("gridcell");
    await expect(cells.nth(1)).toHaveText("−0.7139");
    await expect(cells.nth(2)).toHaveText("7.6765");
    await expectNoViolations(makeAxeBuilder);
  });

  test("IP8 D4 p1 highlighted from the legend with the keyboard, and the colour by altitude and back, with no calculation and one step of Undo each", async ({
    page,
    makeAxeBuilder,
  }) => {
    const panel = await openPanel(page);
    await ownLd(panel);
    await run(panel);
    await panel.getByRole("radio", { name: "2D", exact: true }).click();
    const posted = await runsPosted(page);
    expect(posted).toBe(1);
    const legend = panel.getByRole("radiogroup", { name: "Population" });
    await legend.getByRole("radio", { name: "p0 (48)" }).focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    const p1 = legend.getByRole("radio", { name: "p1 (68)" });
    await expect(p1).toBeFocused();
    await page.keyboard.press("Space");
    await expect(p1).toHaveAttribute("aria-checked", "true");
    await expect(description2d(panel)).toHaveText(/ p1 is highlighted\. /);
    // The plot fades the other two groups and draws p1 last, over them.
    await expect(panel.locator("path.chart-points-faded")).toHaveCount(2);
    await expect(
      panel.locator("svg.chart-scatter path.chart-points").last(),
    ).not.toHaveClass(/chart-points-faded/);
    await expectNoViolations(makeAxeBuilder);

    await panel.getByRole("button", { name: "Colour the points by" }).click();
    await page.getByRole("option", { name: "altitude", exact: true }).click();
    await expect(description2d(panel)).toHaveText(
      /Coloured by altitude, from 100 to 2060; 3 individuals have no value\./,
    );
    // The bar of the scale, with its two ends, and the points of no value.
    await expect(
      panel.getByText("2060", { exact: true }).locator(".."),
    ).toHaveText("2060100");
    await expect(panel.getByText("No value (3)")).toBeVisible();
    await expect(undo(page)).toHaveAccessibleDescription(
      "Undo: the colour of the points of the principal components changed",
    );
    await expectNoViolations(makeAxeBuilder);

    await panel.getByRole("button", { name: "Colour the points by" }).click();
    await page.getByRole("option", { name: "Population", exact: true }).click();
    await expect(description2d(panel)).toHaveText(/Coloured by population: /);
    // One step of Undo each: the first gives altitude back, the second
    // the populations.
    await undo(page).click();
    await expect(description2d(panel)).toHaveText(/Coloured by altitude, /);
    await undo(page).click();
    await expect(description2d(panel)).toHaveText(/Coloured by population: /);
    await expect(undo(page)).toHaveAccessibleDescription(
      "Undo: the principal components were drawn in 2D",
    );
    expect(await runsPosted(page)).toBe(posted);
    await expect(
      panel.getByRole("button", { name: "Run", exact: true }),
    ).toHaveCount(0);
  });

  test("IP8 D4 the LD filter set back to the Variants step gives 7.61% at once with no notice, and set for the PCA again 50000 and 3.55%, with no calculation", async ({
    page,
    makeAxeBuilder,
  }) => {
    const panel = await openPanel(page);
    // The PCA of a new project first, then the PCA's own LD filter.
    await run(panel);
    await ownLd(panel);
    await run(panel);
    await panel.getByRole("radio", { name: "2D", exact: true }).click();
    await expect(axisLabels(panel)).toHaveText(["PC1 (3.55%)", "PC2 (3.40%)"]);
    const posted = await runsPosted(page);
    expect(posted).toBe(2);
    await chooseRadio(ldGroup(panel), "As in the Variants step: off");
    await expect(axisLabels(panel)).toHaveText(["PC1 (7.61%)", "PC2 (5.56%)"]);
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(panel.getByLabel(DISTANCE)).toHaveCount(0);
    await expectNoViolations(makeAxeBuilder);
    await chooseRadio(ldGroup(panel), "For the PCA alone");
    await expect(panel.getByLabel(DISTANCE)).toHaveValue("50000");
    await expect(axisLabels(panel)).toHaveText(["PC1 (3.55%)", "PC2 (3.40%)"]);
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    expect(await runsPosted(page)).toBe(posted);
  });

  test("IP8 D4 3D, turned with its buttons, and back to 2D; the CSV of the table, its header and the row of s000", async ({
    page,
    makeAxeBuilder,
  }) => {
    const panel = await openPanel(page);
    await ownLd(panel);
    await run(panel);
    if (await givesWebGl(page)) {
      const canvas = panel.getByRole("img", { name: PCA_3D });
      await expect(canvas).toBeVisible();
      const before = await canvas.screenshot();
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
        await panel.getByRole("button", { name, exact: true }).click();
      }
      await panel
        .getByRole("button", { name: "Turn left", exact: true })
        .click();
      // Turned, the view draws other pixels.
      await expect
        .poll(async () => (await canvas.screenshot()).equals(before))
        .toBe(false);
      await panel
        .getByRole("button", { name: "Reset view", exact: true })
        .click();
      await expectNoViolations(makeAxeBuilder);
    } else {
      test.info().annotations.push({
        type: "no WebGL 2",
        description: "the turns of the 3D view were not run",
      });
    }
    const twoD = panel.getByRole("radio", { name: "2D", exact: true });
    await twoD.click();
    await expect(twoD).toBeFocused();
    await expect(panel.getByRole("img", { name: PCA_2D })).toBeVisible();
    await expect(panel.locator("canvas")).toHaveCount(0);
    await expect(panel.getByRole("button", { name: "Turn left" })).toHaveCount(
      0,
    );

    const downloading = page.waitForEvent("download");
    await panel
      .getByRole("button", { name: "Download the table as CSV" })
      .click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe("panel.pca.csv");
    const path = await download.path();
    const lines = (await readFile(path, "utf8")).split("\n");
    expect(lines[0]).toBe(
      "individual,population,PC1,PC2,PC3,PC4,PC5,PC6,PC7,PC8,PC9,PC10",
    );
    expect(lines[1]).toMatch(
      /^s000,p0,-0\.7138853335304419,7\.676473141448964,-4\.384383801903496,/,
    );
    expect(lines).toHaveLength(202);
  });

  test("IP8 D4 the PCoA with the PCA's own LD filter: PC1 (3.68%), PC2 (3.54%), the warning of the correction and the line under the explained variance", async ({
    page,
    makeAxeBuilder,
  }) => {
    const panel = await openPanel(page);
    await ownLd(panel);
    await chooseRadio(
      panel.getByRole("radiogroup", { name: "Method" }),
      "PCoA of the Kosman distances, for data with many missing genotypes",
    );
    await run(panel);
    await panel.getByRole("radio", { name: "2D", exact: true }).click();
    await expect(axisLabels(panel)).toHaveText(["PC1 (3.68%)", "PC2 (3.54%)"]);
    const warning = panel.getByText(/^Warning: The Kosman distances/);
    for (const number of ["7.87%", "0.047", "53%", "0.22"]) {
      await expect(warning).toContainText(number);
    }
    const line = panel.getByText(
      /^The percentages are of the Kosman distances/,
    );
    await expect(line).toContainText("0.047");
    await expect(line).toContainText("198 components");
    await expectNoViolations(makeAxeBuilder);
  });
});

/** The files of pca3d the page asked for so far. */
function pca3dRequests(page: Page): string[] {
  const asked: string[] = [];
  page.on("request", (request) => {
    if (/\/pca3d-[^/]*\.js$/.test(request.url())) asked.push(request.url());
  });
  return asked;
}

/** The name of the first script of popgen.html in dist/. */
async function firstScript(): Promise<string> {
  const html = await readFile(join(DIST, "popgen.html"), "utf8");
  const found = /<script[^>]+src="[^"]*\/(assets\/popgen-[^"]+\.js)"/.exec(
    html,
  );
  if (found?.[1] === undefined) throw new Error("popgen.html names no script");
  return found[1];
}

test.describe("IP8 D5 three.js in a file of its own", () => {
  test("IP8 D5 no file of pca3d is asked for before the first result is drawn, and one after", async ({
    page,
  }) => {
    await page.goto("popgen.html");
    test.skip(
      !(await givesWebGl(page)),
      "this engine gives no WebGL 2, so the 3D view is not drawn",
    );
    const asked = pca3dRequests(page);
    const panel = await openPanel(page);
    await expect(
      panel.getByRole("button", { name: "Run", exact: true }),
    ).toBeEnabled();
    expect(asked).toEqual([]);
    await run(panel);
    await expect(panel.getByRole("img", { name: PCA_3D })).toBeVisible();
    expect(asked).toHaveLength(1);
  });

  test("IP8 D5 a download that arrives after 2D was pressed draws no 3D view", async ({
    page,
  }) => {
    let url = "";
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(/\/pca3d-[^/]*\.js$/, async (route) => {
      url = route.request().url();
      await held;
      await route.continue();
    });
    const panel = await openPanel(page);
    await panel.getByRole("button", { name: "Run", exact: true }).click();
    await expect(panel.getByText("Loading the 3D view…")).toBeVisible({
      timeout: RESULT_TIMEOUT,
    });
    await panel.getByRole("radio", { name: "2D", exact: true }).click();
    await expect(panel.getByRole("img", { name: PCA_2D })).toBeVisible();
    release();
    // The module is evaluated once the page's own import of it has it.
    await page.evaluate(async (file) => {
      await import(file);
    }, url);
    await expect(panel.locator("canvas")).toHaveCount(0);
    await expect(panel.getByText("Loading the 3D view…")).toHaveCount(0);
    await expect(panel.getByRole("img", { name: PCA_2D })).toBeVisible();
  });

  test("IP8 D5 the first script of popgen.html holds nothing of three.js, which is in the file of pca3d", async () => {
    const script = await readFile(join(DIST, await firstScript()), "utf8");
    expect(script.split("WebGLRenderer").length - 1).toBe(0);
    const pca3d = (await readdir(join(DIST, "assets"))).filter((name) =>
      /^pca3d-.*\.js$/.test(name),
    );
    expect(pca3d).toHaveLength(1);
    const file = await readFile(join(DIST, "assets", pca3d[0] ?? ""));
    expect(file.toString("utf8")).toContain("WebGLRenderer");
    const gzipped = gzipSync(file, { level: 9 }).length;
    test.info().annotations.push({
      type: "the file of three.js",
      description: `${pca3d[0] ?? ""}: ${String(file.length)} bytes, ${String(gzipped)} gzipped with level 9`,
    });
  });
});

test.describe("IP8 D6 the key of the PCA on the screen", () => {
  test("IP8 D6 a change of the colour, of the axes and of the view removes no result and asks no calculation", async ({
    page,
  }) => {
    const panel = await openPanel(page);
    await run(panel);
    const posted = await runsPosted(page);
    // The one calculation of the PCA, so that the count below is a count
    // of what the page asks the worker.
    expect(posted).toBe(1);
    await panel.getByRole("radio", { name: "2D", exact: true }).click();
    await expect(axisLabels(panel)).toHaveText(["PC1 (7.61%)", "PC2 (5.56%)"]);
    await panel.getByRole("button", { name: "Horizontal axis" }).click();
    await page.getByRole("option", { name: "PC3", exact: true }).click();
    await expect(axisLabels(panel)).toHaveText(["PC3 (1.57%)", "PC2 (5.56%)"]);
    await panel.getByRole("button", { name: "Colour the points by" }).click();
    await page.getByRole("option", { name: "altitude", exact: true }).click();
    await expect(description2d(panel)).toHaveText(/Coloured by altitude/);
    await panel.getByRole("radio", { name: "3D", exact: true }).click();
    if (await givesWebGl(page)) {
      await expect(
        panel.getByRole("button", { name: "Third axis, kept up" }),
      ).toBeVisible();
    } else {
      test.info().annotations.push({
        type: "no WebGL 2",
        description: "3D pressed drew the 2D plot with the words of no WebGL",
      });
      await expect(
        panel.getByText(/^This browser cannot draw the 3D view/),
      ).toBeVisible();
    }
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(
      panel.getByText(/^The place of each of the 200/),
    ).toBeVisible();
    expect(await runsPosted(page)).toBe(posted);
  });

  test("IP8 D6 a change of a filter of the PCA removes its result, with its notice, and asks no calculation until Run", async ({
    page,
  }) => {
    const panel = await openPanel(page);
    await run(panel);
    const posted = await runsPosted(page);
    expect(posted).toBe(1);
    const missing = panel.getByRole("radiogroup", {
      name: "Filter the variants by missing data",
    });
    // Set for the PCA at the step's value, 0.1: the same filters, the
    // same key, the result stays.
    await chooseRadio(missing, "For the PCA alone");
    await expect(
      panel.getByText(/^The place of each of the 200/),
    ).toBeVisible();
    const field = panel.getByLabel(
      "Maximum proportion of missing genotypes, from 0 to 1",
    );
    await field.fill("0.05");
    await field.press("Enter");
    await expect(
      page.getByRole("alertdialog", {
        name: "Principal components removed because the missing data filter of the principal components changed",
      }),
    ).toBeVisible();
    await expect(
      panel.getByText(
        "The principal components were removed because the missing data filter of the principal components changed. Undo brings back the plot and the table as they were, with no calculation; Run calculates new ones for the new settings.",
      ),
    ).toBeVisible();
    await expect(panel.getByText(/^The place of each of the 200/)).toHaveCount(
      0,
    );
    expect(await runsPosted(page)).toBe(posted);
  });
});

/** The shell's status region, the last of the page's two. */
function status(page: Page): Locator {
  return page.getByRole("status").last();
}

test.describe("IP10 D3 the options, the warnings and the results removed", () => {
  test("IP10 D3 a new project: PCA of the genotypes chosen, the heading of level 3 of its filters with its line, the three filters in the order of the Variants step, and the heading, the line and the choices For the PCoA alone once the PCoA is chosen", async ({
    page,
    makeAxeBuilder,
  }) => {
    const panel = await openPanel(page);
    // The method, then the three filters in the order of the Variants
    // step, as the page gives them.
    const groups = panel.getByRole("radiogroup");
    const names = [
      "Method",
      "Filter the variants by missing data",
      "Filter the variants by major allele frequency (MAF)",
      "Prune the variants by linkage disequilibrium (LD)",
    ];
    await expect(groups).toHaveCount(names.length);
    for (const [at, name] of names.entries()) {
      await expect(groups.nth(at)).toHaveAccessibleName(name);
    }
    const method = panel.getByRole("radiogroup", { name: "Method" });
    await expect(
      method.getByRole("radio", { name: "PCA of the genotypes" }),
    ).toBeChecked();
    await expect(
      method.getByRole("radio", {
        name: "PCoA of the Kosman distances, for data with many missing genotypes",
      }),
    ).not.toBeChecked();
    await expect(
      panel.getByRole("heading", {
        level: 3,
        name: "Filters of the variants for the PCA",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      panel.getByText(
        "The PCA uses the filters of the Variants step. Set a filter here to use another value for the PCA alone.",
        { exact: true },
      ),
    ).toBeVisible();
    // The choice of a value of its own follows the method, as the heading
    // does (stop C 5).
    await expect(
      panel.getByRole("radio", { name: "For the PCA alone", exact: true }),
    ).toHaveCount(3);

    await chooseRadio(
      method,
      "PCoA of the Kosman distances, for data with many missing genotypes",
    );
    await expect(
      panel.getByRole("heading", {
        level: 3,
        name: "Filters of the variants for the PCoA",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      panel.getByText(
        "The PCoA uses the filters of the Variants step. Set a filter here to use another value for the PCoA alone.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      panel.getByRole("heading", { name: /for the PCA$/ }),
    ).toHaveCount(0);
    await expect(
      panel.getByRole("radio", { name: "For the PCoA alone", exact: true }),
    ).toHaveCount(3);
    await expect(
      panel.getByRole("radio", { name: "For the PCA alone", exact: true }),
    ).toHaveCount(0);
    await expectNoViolations(makeAxeBuilder);
  });

  test("IP10 D3 a run of a new project: the heading 1 warning above its warning, and the end of the run announced in the status region with its count", async ({
    page,
  }) => {
    const panel = await openPanel(page);
    // Every text the region is given from the run on: in an engine with
    // no WebGL 2 the words of no WebGL follow the end of the run there.
    await status(page).evaluate((region) => {
      const texts: string[] = [];
      Object.assign(window, { statusTexts: texts });
      new MutationObserver(() => {
        texts.push(region.textContent);
      }).observe(region, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    });
    await run(panel);
    const warnings = panel.getByRole("region", { name: "1 warning" });
    await expect(
      warnings.getByRole("heading", { name: "1 warning", exact: true }),
    ).toBeVisible();
    await expect(
      warnings.getByText(/^Warning: No LD filter was applied/),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() =>
          (window as unknown as { statusTexts: string[] }).statusTexts.some(
            (text) => text.includes("Principal components: done, 1 warning."),
          ),
        ),
      )
      .toBe(true);
    if (await givesWebGl(page)) {
      await expect(status(page)).toContainText(
        "Principal components: done, 1 warning.",
      );
    }
  });

  test("IP10 D3 results removed: the line of the individuals and Run, as in ready, and the Undo of the notice and then that of the header bring the result back with no calculation", async ({
    page,
    makeAxeBuilder,
  }) => {
    const panel = await openPanel(page);
    await run(panel);
    const posted = await runsPosted(page);
    expect(posted).toBe(1);
    const caption = panel.getByText(/^The place of each of the 200/);
    const line = panel.getByText("200 individuals of panel.nei", {
      exact: true,
    });
    const runButton = panel.getByRole("button", { name: "Run", exact: true });
    await expect(line).toHaveCount(0);
    await expect(runButton).toHaveCount(0);
    const remove = async (): Promise<void> => {
      await chooseRadio(
        panel.getByRole("radiogroup", {
          name: "Filter the variants by major allele frequency (MAF)",
        }),
        "For the PCA alone",
      );
      await expect(caption).toHaveCount(0);
      await expect(line).toBeVisible();
      await expect(runButton).toBeEnabled();
    };

    await remove();
    await expectNoViolations(makeAxeBuilder);
    await page
      .getByRole("alertdialog", { name: /^Principal components removed/ })
      .getByRole("button", { name: "Undo", exact: true })
      .click();
    await expect(caption).toBeVisible();
    await expect(line).toHaveCount(0);
    await expect(runButton).toHaveCount(0);

    await remove();
    await undo(page).click();
    await expect(caption).toBeVisible();
    await expect(runButton).toHaveCount(0);
    expect(await runsPosted(page)).toBe(posted);
  });
});

test.describe("stop C 3 the links to the analyses under the heading of the Analyses step", () => {
  test("stop C 3 one link per analysis in the order of the panels; a click and Enter each put the focus on the heading of its panel, with the step and the address kept; at 320 pixels the list fits", async ({
    page,
    makeAxeBuilder,
  }) => {
    const panel = await openPanel(page);
    await run(panel);
    const list = page.getByRole("navigation", {
      name: "Analyses of this step",
    });
    const links = list.getByRole("link");
    // The four panels of the step, in their order.
    await expect(links).toHaveText([
      "Principal components",
      "Diversity",
      "Distances between populations",
      "LD decay",
    ]);
    const pcaHeading = panel.getByRole("heading", {
      level: 2,
      name: "Principal components",
    });
    const diversityHeading = page
      .getByRole("region", { name: "Diversity", exact: true })
      .getByRole("heading", { level: 2, name: "Diversity" });
    const popDistsHeading = page
      .getByRole("region", {
        name: "Distances between populations",
        exact: true,
      })
      .getByRole("heading", {
        level: 2,
        name: "Distances between populations",
      });
    const ldDecayHeading = page
      .getByRole("region", { name: "LD decay", exact: true })
      .getByRole("heading", { level: 2, name: "LD decay" });

    // The mouse.
    await list.getByRole("link", { name: "Diversity" }).click();
    await expect(diversityHeading).toBeFocused();
    await expect(diversityHeading).toBeInViewport();
    expect(new URL(page.url()).hash).toBe("#analyses");
    await expect(
      page.getByRole("heading", { level: 1, name: "Analyses" }),
    ).toBeVisible();
    await expectNoViolations(makeAxeBuilder);

    await list
      .getByRole("link", { name: "Distances between populations" })
      .click();
    await expect(popDistsHeading).toBeFocused();
    await expect(popDistsHeading).toBeInViewport();
    expect(new URL(page.url()).hash).toBe("#analyses");

    await list.getByRole("link", { name: "LD decay" }).click();
    await expect(ldDecayHeading).toBeFocused();
    await expect(ldDecayHeading).toBeInViewport();
    expect(new URL(page.url()).hash).toBe("#analyses");

    // The keyboard: from the heading of the step, the links in order,
    // Enter on each, and the next Tab goes on inside its panel.
    await page.getByRole("heading", { level: 1, name: "Analyses" }).focus();
    await page.keyboard.press("Tab");
    await expect(
      list.getByRole("link", { name: "Principal components" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(list.getByRole("link", { name: "Diversity" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      list.getByRole("link", { name: "Distances between populations" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(list.getByRole("link", { name: "LD decay" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Enter");
    await expect(diversityHeading).toBeFocused();
    await page.keyboard.press("Tab");
    expect(
      await page
        .getByRole("region", { name: "Diversity", exact: true })
        .evaluate((region) => region.contains(document.activeElement)),
    ).toBe(true);
    await page.getByRole("heading", { level: 1, name: "Analyses" }).focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(pcaHeading).toBeFocused();
    expect(new URL(page.url()).hash).toBe("#analyses");

    // At 320 pixels wide, the list fits and the page does not scroll
    // sideways.
    await page.setViewportSize({ width: 320, height: 800 });
    await expect(links).toHaveCount(4);
    for (const link of await links.all()) {
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(320);
    }
    // The plot is drawn again at the next frame after its size changed.
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(320);
    await expectNoViolations(makeAxeBuilder);
  });
});
