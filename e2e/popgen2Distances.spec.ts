/**
 * The Distances tab of popgen2.html, on the built site
 * (docs/specs/steps/popgen2-distances.md, "How it is checked", In
 * Playwright): the distances of panel.nei with panel_pops.csv, their
 * table, the order of the heatmap and the other measure drawn with no
 * calculation; the distances live, calculated again after a threshold
 * moved with no Run pressed; panel_split.csv, its negative distance and
 * the minimum that leaves out p0a and p0b, then locks; the unclassified
 * left out; the distances after the PCA, both live; what is greyed while
 * the distances run, and what is not; the downloads read back; the
 * tab's code downloaded apart; and the band at 320 px.
 *
 * The numbers are popnei 0.2.2's under node, run again on 12 October
 * 2026 (docs/specs/analyses/popDists.md, "How it is verified"), as the
 * table shows them, to four decimals. panel.nei holds 1,200 variants of
 * 200 diploid individuals, all of which the missing data at 0.1 keeps;
 * panel_pops.csv puts them in p0, 48, p2, 84, and p1, 68; panel_split.csv
 * splits p0 into p0a and p0b, 24 each.
 */
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type AxeBuilder from "@axe-core/playwright";
import type { Download, Locator, Page, Route } from "@playwright/test";

import { expect, test } from "./axe.ts";
import { dropOnBox, pickFile } from "./openFiles.ts";
import { openParameters } from "./parameters.ts";
import { holdSummary, release, workersListening } from "./holdWorker.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** How long a calculation of panel.nei may take to give its result. */
const RESULT_TIMEOUT = 30_000;

/** The populations of panel_pops.csv with their individuals, which end
    the caption of the table (since 12 October 2026, the review of the
    Distances tab). */
const POPS =
  "3 populations, with the number of individuals each was calculated over: p0, 48 individuals; p2, 84 individuals; p1, 68 individuals.";

/** The caption of the table of panel.nei and panel_pops.csv at the
    missing data of 0.1. */
const CAPTION = `Distances between the populations of panel.nei, over the 1,200 variants the filters kept. ${POPS}`;

/** The heading of the tab. */
const HEADING = "Distances between populations";

/** The label of the field of the minimum. */
const MINIMUM =
  /^Individuals with a called genotype needed in each population, per variant/u;

/** The label of the field of the distance of the LD pruning of the
    PCA. */
const DISTANCE =
  /^Distance within which variants are compared, in base pairs, from 1/u;

/** What the page records, on `window`, of the calculations it asks of
    its workers and the results it gets back. */
const TIMELINE = "__e2eTimeline";

/** The script of the page that records, in `window[name]`, every
    calculation it posts to a worker, "run ‹analysis›", and every result
    a worker posts back, "result ‹analysis›", in their order. */
function recordTimeline(name: string): void {
  const timeline: string[] = [];
  Object.defineProperty(window, name, { value: timeline });
  const analysisOf = (value: unknown): string | null =>
    typeof value === "object" &&
    value !== null &&
    "analysis" in value &&
    typeof value.analysis === "string"
      ? value.analysis
      : null;
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
      message.kind === "run" &&
      "job" in message
    ) {
      timeline.push(`run ${analysisOf(message.job) ?? "?"}`);
    }
    (post as (...args: unknown[]) => void).call(this, message, ...rest);
  } as typeof post;
  const RealWorker = window.Worker;
  window.Worker = class extends RealWorker {
    constructor(url: string | URL, options?: WorkerOptions) {
      super(url, options);
      this.addEventListener("message", (event: MessageEvent<unknown>) => {
        const m = event.data;
        if (
          typeof m === "object" &&
          m !== null &&
          "kind" in m &&
          m.kind === "result" &&
          "result" in m
        ) {
          timeline.push(`result ${analysisOf(m.result) ?? "?"}`);
        }
      });
    }
  };
}

/** The calculations of the PCA and of the distances the page asked for,
    and their results, in their order. */
async function timeline(page: Page): Promise<readonly string[]> {
  const all = await page.evaluate(
    (name) => (window as unknown as Record<string, string[]>)[name] ?? [],
    TIMELINE,
  );
  return all.filter((entry) => /(pca|popDists)$/u.test(entry));
}

/** How many calculations of the distances the page asked for. */
async function distancesRuns(page: Page): Promise<number> {
  return (await timeline(page)).filter((entry) => entry === "run popDists")
    .length;
}

/** A file the flow makes: its name and its text. */
interface Made {
  readonly name: string;
  readonly text: string;
}

/** Opens popgen2.html with what the page asks of its workers recorded. */
async function openPage(page: Page): Promise<void> {
  await page.addInitScript(recordTimeline, TIMELINE);
  await page.goto("popgen2.html");
  await expect(
    page.getByRole("heading", { level: 1, name: "Popnei" }),
  ).toBeVisible();
}

/** Picks the fixture `name` with the button that opens one now
    (openFiles.ts). */
async function pick(page: Page, name: string): Promise<void> {
  await pickFile(page, "variants", join(FIXTURES, name));
}

/** The box of the individuals file. */
function individualsBox(page: Page): Locator {
  return page.getByRole("region", { name: "Individuals", exact: true });
}

/** Opens the individuals file `file`, a fixture by its name or a file
    the flow makes. */
async function pickIndividuals(page: Page, file: string | Made): Promise<void> {
  await pickFile(
    page,
    "individuals",
    typeof file === "string"
      ? join(FIXTURES, file)
      : {
          name: file.name,
          mimeType: "text/csv",
          buffer: Buffer.from(file.text, "utf8"),
        },
  );
}

/** The tab of the row named `name`. */
function tab(
  page: Page,
  name: "Variants" | "Individuals" | "PCA" | "Distances",
): Locator {
  return page
    .getByRole("tablist", { name: "Files and analyses" })
    .getByRole("tab", { name, exact: true });
}

/** The panel of the tab shown. */
function shown(page: Page): Locator {
  return page.getByRole("tabpanel");
}

/** The button of the tab shown named `name`. */
function button(
  page: Page,
  name: "Run" | "Stop" | "Stop recalculating",
): Locator {
  return shown(page).getByRole("button", { name, exact: true });
}

/** The table of the distances by its caption. */
function table(page: Page, caption: string): Locator {
  return shown(page).getByRole("table", { name: caption, exact: true });
}

/** The cells of the row of the pair `pair` of the table. */
function row(page: Page, pair: string): Locator {
  return shown(page)
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: pair, exact: true }) })
    .getByRole("cell");
}

/** The heatmap of `measure`, the image a screen reader meets. */
function heatmap(page: Page, measure: string): Locator {
  return shown(page).getByRole("img", {
    name: new RegExp(`^${measure} between populations`, "u"),
  });
}

/** The names of the rows of the heatmap, from the top. */
async function heatmapRows(page: Page): Promise<string[]> {
  return shown(page)
    .locator("svg .chart-axis-y .tick text")
    .evaluateAll((texts) =>
      texts
        .map((text) => ({
          top: text.getBoundingClientRect().top,
          name: text.textContent,
        }))
        .toSorted((a, b) => a.top - b.top)
        .map((text) => text.name),
    );
}

/** The values written in the cells of the heatmap, row by row. */
async function heatmapValues(page: Page): Promise<string[]> {
  return shown(page)
    .locator("svg text.chart-cell-text")
    .evaluateAll((texts) =>
      texts
        .map((text) => ({
          x: Number(text.getAttribute("x")),
          y: Number(text.getAttribute("y")),
          value: text.textContent,
        }))
        .toSorted((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y))
        .map((text) => text.value),
    );
}

/** The box of the threshold of the missing data of the variants. */
function missingBox(page: Page): Locator {
  return page
    .getByRole("region", { name: "Statistics of the file" })
    .getByRole("group", {
      name: "Proportion of missing genotypes",
      exact: true,
    })
    .getByRole("textbox");
}

/** Sets the minimum of the distances to `value`, in the tab shown. */
async function setMinimum(page: Page, value: string): Promise<void> {
  await openParameters(shown(page));
  const field = shown(page).getByRole("textbox", { name: MINIMUM });
  await field.fill(value);
  await field.press("Enter");
}

/** Checks the page with axe, light and then dark, and leaves it light. */
async function expectNoAxeViolations(
  page: Page,
  makeAxeBuilder: () => AxeBuilder,
): Promise<void> {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
  }
  await page.emulateMedia({ colorScheme: "light" });
}

/** Shows the Distances tab once the one pass has read the file to the
    end, Run enabled. */
async function distancesReady(page: Page): Promise<void> {
  await tab(page, "Distances").click();
  await expect(button(page, "Run")).toBeEnabled({ timeout: RESULT_TIMEOUT });
  await openParameters(shown(page));
}

/** Presses Run and waits for the table of `caption`. */
async function runDistances(page: Page, caption = CAPTION): Promise<void> {
  await distancesReady(page);
  await button(page, "Run").click();
  await expect(table(page, caption)).toBeVisible({ timeout: RESULT_TIMEOUT });
}

/** The lines of panel_pops.csv, its header first. */
function panelPopsRows(): readonly string[] {
  return readFileSync(join(FIXTURES, "panel_pops.csv"), "utf8")
    .trimEnd()
    .split("\n");
}

/** Opens the menu "Download…" named `what` and chooses `item`. */
async function choose(
  page: Page,
  what: string,
  item: "Table as CSV" | "Image as SVG" | "Data as CSV",
): Promise<Download> {
  await shown(page)
    .getByRole("button", { name: `Download ${what}`, exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: item }).click();
  return download;
}

/** The text of a downloaded file. */
async function textOf(download: Download): Promise<string> {
  return readFile(await download.path(), "utf8");
}

test.describe("DT1 D5 the Distances tab", () => {
  test("DT1 D5 panel.nei and popcat: the pairs of the table, the heatmap in the order p2, p0, p1; Jost's D drawn with 0.0613 and no calculation; axe ready and done", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(90_000);
    await openPage(page);
    await pick(page, "panel.nei");
    await pickIndividuals(page, "panel_pops.csv");
    await distancesReady(page);
    await expect(
      shown(page).getByRole("heading", { level: 2, name: HEADING }),
    ).toBeVisible();
    await expect(
      shown(page).getByText(
        "3 populations: p0, 48 individuals; p2, 84 individuals; p1, 68 individuals",
        { exact: true },
      ),
    ).toBeVisible();
    await expectNoAxeViolations(page, makeAxeBuilder);

    await runDistances(page);
    await expect(row(page, "p0 and p2")).toHaveText([
      "0.1027",
      "0.0613",
      "1,200",
    ]);
    await expect(row(page, "p0 and p1")).toHaveText([
      "0.1050",
      "0.0635",
      "1,200",
    ]);
    await expect(row(page, "p2 and p1")).toHaveText([
      "0.1096",
      "0.0657",
      "1,200",
    ]);
    await expect(heatmap(page, "Hudson's Fst")).toBeVisible();
    expect(await heatmapRows(page)).toEqual(["p2", "p0", "p1"]);
    await expectNoAxeViolations(page, makeAxeBuilder);

    const group = shown(page).getByRole("radiogroup", {
      name: "Distance in the heatmap",
    });
    await group.locator("label").filter({ hasText: "Jost's D" }).click();
    await expect(group.getByRole("radio", { name: "Jost's D" })).toBeChecked();
    await expect(heatmap(page, "Jost's D")).toBeVisible();
    expect((await heatmapValues(page))[0]).toBe("0.0613");
    expect(await distancesRuns(page)).toBe(1);
  });

  test("DT1 D5 live: the missing data moved to 0.05, the distances calculated again with no Run, p0 and p2 at 0.1013, 0.0604, 1,152", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openPage(page);
    await pick(page, "panel.nei");
    await pickIndividuals(page, "panel_pops.csv");
    await runDistances(page);
    await tab(page, "Variants").click();
    await missingBox(page).fill("0.05");
    await missingBox(page).press("Enter");
    await tab(page, "Distances").click();
    await openParameters(shown(page));
    await expect(
      table(
        page,
        `Distances between the populations of panel.nei, over the 1,152 variants the filters kept. ${POPS}`,
      ),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expect(row(page, "p0 and p2")).toHaveText([
      "0.1013",
      "0.0604",
      "1,152",
    ]);
    expect(await distancesRuns(page)).toBe(2);
  });

  test("DT1 D5 panel_split.csv: the negative distance and the order p0b, p0a, p2, p1; the minimum at 25 leaves p0a and p0b out, two populations with no line of order; at 70, the lock beside Stop recalculating", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openPage(page);
    await pick(page, "panel.nei");
    await pickIndividuals(page, "panel_split.csv");
    await runDistances(
      page,
      "Distances between the populations of panel.nei, over the 1,200 variants the filters kept. 4 populations, with the number of individuals each was calculated over: p0a, 24 individuals; p0b, 24 individuals; p2, 84 individuals; p1, 68 individuals.",
    );
    await expect(
      shown(page).getByText(
        /p0a and p0b have a negative Hudson's Fst, −0\.0113, and Jost's D, −0\.0060/u,
      ),
    ).toBeVisible();
    expect(await heatmapRows(page)).toEqual(["p0b", "p0a", "p2", "p1"]);

    await setMinimum(page, "25");
    await expect(
      shown(page).getByText(
        "p0a and p0b have 24 and 24 individuals, fewer than the 25 individuals needed per variant, and are left out.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expect(row(page, "p2 and p1")).toHaveText(
      ["0.1096", "0.0657", "1,200"],
      { timeout: RESULT_TIMEOUT },
    );
    await expect.poll(() => heatmapRows(page)).toEqual(["p2", "p1"]);
    await expect(shown(page).getByText(/^Ordered so that/u)).toHaveCount(0);

    await setMinimum(page, "70");
    const lock =
      "Only p2 has 70 individuals or more, and a variant counts for a pair of populations only where both have 70 individuals with a called genotype, so no pair has a distance. Lower the individuals needed per variant in Parameters, or merge populations in panel_split.csv.";
    await expect(shown(page).getByText(lock, { exact: true })).toBeVisible({
      timeout: RESULT_TIMEOUT,
    });
    await expect(button(page, "Stop recalculating")).toBeVisible();
  });

  test("DT1 D5 the unclassified: panel_pops.csv with four rows removed and three cells emptied, the line and the caption say 7", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openPage(page);
    await pick(page, "panel.nei");
    const [header, ...rows] = panelPopsRows();
    const made = rows
      .slice(4)
      .map((line, i) => (i < 3 ? `${line.split(",")[0] ?? ""},` : line));
    await pickIndividuals(page, {
      name: "panel_some.csv",
      text: [header ?? "", ...made, ""].join("\n"),
    });
    await distancesReady(page);
    await expect(
      shown(page).getByText(
        "7 unclassified individuals kept are left out, as the Individuals tab says.",
        { exact: true },
      ),
    ).toBeVisible();
    await runDistances(
      page,
      "Distances between the populations of panel.nei, over the 1,200 variants the filters kept. 3 populations, with the number of individuals each was calculated over: p2, 81 individuals; p1, 68 individuals; p0, 44 individuals. 7 unclassified individuals kept are left out.",
    );
  });

  test("DT1 D5 live with the PCA: a threshold moved sends the PCA and then the distances after its end; meanwhile the tab says it waits for the PCA", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await holdSummary(page, { holdPca: true });
    await openPage(page);
    await pick(page, "panel.nei");
    await release(page, "allSoFar");
    await release(page, "result");
    await pickIndividuals(page, "panel_pops.csv");
    // The PCA live: its LD distance typed, its Run, its result.
    await tab(page, "PCA").click();
    await openParameters(shown(page));
    const field = shown(page).getByRole("textbox", { name: DISTANCE });
    await expect(field).toBeVisible({ timeout: RESULT_TIMEOUT });
    await field.fill("50000");
    await field.press("Enter");
    await expect(button(page, "Run")).toBeEnabled({ timeout: RESULT_TIMEOUT });
    await button(page, "Run").click();
    await release(page, "pca");
    await expect
      .poll(async () => (await timeline(page)).includes("result pca"))
      .toBe(true);
    await release(page, "holdPcaAgain");
    await runDistances(page);

    await tab(page, "Variants").click();
    await missingBox(page).fill("0.05");
    await missingBox(page).press("Enter");
    await tab(page, "Distances").click();
    await expect(
      shown(page).getByText(
        "The distances start once the PCA, which is running, ends.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });
    expect(await distancesRuns(page)).toBe(1);
    await release(page, "pca");
    await expect
      .poll(() => timeline(page), { timeout: RESULT_TIMEOUT })
      .toEqual([
        "run pca",
        "result pca",
        "run popDists",
        "result popDists",
        "run pca",
        "result pca",
        "run popDists",
        "result popDists",
      ]);
  });

  test("DT1 D5 the lock: the distances held running grey the threshold, the minimum, the column and the zone of the individuals file with their reasons, and not the measure", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(90_000);
    await holdSummary(page, { holdPopDists: true });
    await openPage(page);
    await pick(page, "panel.nei");
    await release(page, "allSoFar");
    await release(page, "result");
    await pickIndividuals(page, "panel_pops.csv");
    await distancesReady(page);
    await button(page, "Run").click();
    await expect(button(page, "Stop")).toBeVisible({ timeout: RESULT_TIMEOUT });

    const filtersWords =
      "Stop the distances in the Distances tab to change the filters; then press Run there to calculate them again.";
    const minimum = shown(page).getByRole("textbox", { name: MINIMUM });
    await expect(minimum).toHaveAttribute("aria-disabled", "true");
    await expect(minimum).toHaveAccessibleDescription(
      new RegExp(filtersWords.replaceAll(".", "\\."), "u"),
    );
    for (const name of ["Hudson's Fst", "Jost's D"]) {
      await expect(shown(page).getByRole("radio", { name })).toBeEnabled();
      await expect(
        shown(page).getByRole("radio", { name }),
      ).not.toHaveAttribute("aria-disabled", "true");
    }
    await expectNoAxeViolations(page, makeAxeBuilder);

    await tab(page, "Variants").click();
    await expect(missingBox(page)).toHaveAttribute("aria-disabled", "true");
    await expect(missingBox(page)).toHaveAccessibleDescription(
      new RegExp(filtersWords.replaceAll(".", "\\."), "u"),
    );
    const populationsWords =
      "Stop the distances in the Distances tab to change the populations; then press Run there to calculate them again.";
    for (const control of [
      individualsBox(page).getByRole("button", {
        name: "Column of the populations",
      }),
      // The box of a file open takes a paste, by its hidden button;
      // "Open another individuals file…" is in the Individuals tab since
      // 16 October 2026.
      individualsBox(page).getByRole("button", {
        name: "Paste an individuals file",
      }),
    ]) {
      await expect(control).toHaveAttribute("aria-disabled", "true");
      await expect(control).toHaveAccessibleDescription(
        new RegExp(populationsWords.replaceAll(".", "\\."), "u"),
      );
    }
    await release(page, "popDists");
    await tab(page, "Distances").click();
    await expect(table(page, CAPTION)).toBeVisible({ timeout: RESULT_TIMEOUT });
    await tab(page, "Variants").click();
    await expect(missingBox(page)).not.toHaveAttribute("aria-disabled", "true");
  });

  test("DT1 D5 the downloads: the heatmap's data, the square matrix of Hudson's Fst and of Jost's D, and the table's, two columns of populations, read back; the heatmap's SVG", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openPage(page);
    await pick(page, "panel.nei");
    await pickIndividuals(page, "panel_pops.csv");
    await runDistances(page);

    const matrix = await choose(
      page,
      "the heatmap of Hudson's Fst",
      "Data as CSV",
    );
    expect(matrix.suggestedFilename()).toBe("panel.popdists.fst_hudson.csv");
    expect(await textOf(matrix)).toBe(
      [
        "Population,p2,p0,p1",
        "p2,,0.10273588423661377,0.10962148955018115",
        "p0,0.10273588423661377,,0.10496244498389443",
        "p1,0.10962148955018115,0.10496244498389443,",
        "",
      ].join("\n"),
    );
    const svg = await choose(
      page,
      "the heatmap of Hudson's Fst",
      "Image as SVG",
    );
    expect(svg.suggestedFilename()).toBe("panel.popdists.fst_hudson.svg");
    expect(await textOf(svg)).toMatch(/^<svg[^>]*>/u);

    // The heatmap of Jost's D offers D's values, popnei's.
    await shown(page)
      .getByRole("radiogroup", { name: "Distance in the heatmap" })
      .locator("label")
      .filter({ hasText: "Jost's D" })
      .click();
    const dMatrix = await choose(
      page,
      "the heatmap of Jost's D",
      "Data as CSV",
    );
    expect(dMatrix.suggestedFilename()).toBe("panel.popdists.jost_d.csv");
    expect(await textOf(dMatrix)).toBe(
      [
        "Population,p2,p0,p1",
        "p2,,0.06129813142463423,0.06567052128821259",
        "p0,0.06129813142463423,,0.06354346296076403",
        "p1,0.06567052128821259,0.06354346296076403,",
        "",
      ].join("\n"),
    );

    const pairs = await choose(
      page,
      "the table of the distances",
      "Table as CSV",
    );
    expect(pairs.suggestedFilename()).toBe("panel.popdists.csv");
    expect(await textOf(pairs)).toBe(
      [
        "First population,Second population,Hudson's Fst,Jost's D,Variants",
        "p0,p2,0.10273588423661377,0.06129813142463423,1200",
        "p0,p1,0.10496244498389443,0.06354346296076403,1200",
        "p2,p1,0.10962148955018115,0.06567052128821259,1200",
        "",
      ].join("\n"),
    );
  });

  test('DT1 D5 the tab\'s code that could not be downloaded: "Loading the Distances tab…", then its words with Try again; Try again draws the tab, the focus on its heading', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openPage(page);
    await pick(page, "panel.nei");
    await pickIndividuals(page, "panel_pops.csv");
    const tabFile = /\/DistancesTabView-[^/]*\.js(\?.*)?$/u;
    const held: Route[] = [];
    await page.route(tabFile, (route) => {
      held.push(route);
    });
    await tab(page, "Distances").click();
    await expect(
      shown(page).getByText("Loading the Distances tab…", { exact: true }),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expect.poll(() => held.length).toBeGreaterThan(0);
    for (const route of held) await route.abort();
    await page.unroute(tabFile);
    const words =
      "The Distances tab could not be loaded. Press Try again. If it fails again, the site may have been updated since this page was opened: reload the page and open panel.nei again; what the page has calculated is lost.";
    await expect(shown(page).getByText(words, { exact: true })).toBeVisible();
    await shown(page).getByRole("button", { name: "Try again" }).click();
    await expect(
      shown(page).getByRole("heading", { level: 2, name: HEADING }),
    ).toBeFocused({ timeout: RESULT_TIMEOUT });
  });

  test("DT1 D5 the heatmap at 320 px (the review of the Distances tab, 12 October 2026): three populations, its values in the cells for both measures and no line under it; four, none in the cells, and the line says where they are and the colour of the negative distance", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 320, height: 900 });
    await openPage(page);
    await pick(page, "panel.nei");
    await pickIndividuals(page, "panel_pops.csv");
    await runDistances(page);
    const line = shown(page).getByText(/^The cells are too small/u);
    await expect(heatmap(page, "Hudson's Fst")).toBeVisible();
    expect(await heatmapValues(page)).toHaveLength(6);
    await expect(line).toHaveCount(0);
    await shown(page)
      .getByRole("radiogroup", { name: "Distance in the heatmap" })
      .locator("label")
      .filter({ hasText: "Jost's D" })
      .click();
    await expect(heatmap(page, "Jost's D")).toBeVisible();
    expect(await heatmapValues(page)).toHaveLength(6);
    await expect(line).toHaveCount(0);

    // The distances are live: the other file is calculated by itself.
    // Dropped on the box, which keeps the Distances tab shown.
    await dropOnBox(page, "individuals", join(FIXTURES, "panel_split.csv"));
    await expect
      .poll(() => heatmapRows(page), { timeout: RESULT_TIMEOUT })
      .toEqual(["p0b", "p0a", "p2", "p1"]);
    expect(await heatmapValues(page)).toHaveLength(0);
    await expect(line).toHaveText(
      "The cells are too small to hold their values; the table of the distances, after the heatmap, gives them. A negative distance has the colour of 0.",
    );
    await expectNoAxeViolations(page, makeAxeBuilder);
  });

  test("DT1 D5 the band at 320 px, the distances held running beside the PCA live: Popnei, Distances · 0:0…, Stop and Stop all on one line", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 320, height: 800 });
    await holdSummary(page, { holdPopDists: true });
    await openPage(page);
    await pick(page, "panel.nei");
    await release(page, "allSoFar");
    await release(page, "result");
    await pickIndividuals(page, "panel_pops.csv");
    await tab(page, "PCA").click();
    await openParameters(shown(page));
    const field = shown(page).getByRole("textbox", { name: DISTANCE });
    await expect(field).toBeVisible({ timeout: RESULT_TIMEOUT });
    await field.fill("50000");
    await field.press("Enter");
    await expect(button(page, "Run")).toBeEnabled({ timeout: RESULT_TIMEOUT });
    await button(page, "Run").click();
    await expect(button(page, "Stop recalculating")).toBeVisible({
      timeout: RESULT_TIMEOUT,
    });
    await distancesReady(page);
    await button(page, "Run").click();
    await tab(page, "Variants").click();
    const band = page.getByRole("banner", { name: "What the page is doing" });
    await expect(
      band.getByRole("button", { name: "Stop the distances" }),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expect(
      band.getByRole("button", { name: "Stop all: the PCA and the distances" }),
    ).toBeVisible();
    // On one row where "Popnei", the words, Stop and Stop all, with the
    // gaps between them, fit the line, as in the Mac's system font; in
    // DejaVu Sans, Ubuntu's, they do not, and Stop all takes a second row
    // (GitHub's runners, 13 October 2026). Every part within the window
    // either way, and the page not scrolled sideways.
    await expect
      .poll(() =>
        band.getByRole("heading", { level: 1 }).evaluate((h1) => {
          const line = h1.parentElement;
          const words = h1.nextElementSibling;
          if (line === null || !(words instanceof HTMLElement)) return false;
          const parts = [
            h1,
            words,
            ...line.querySelectorAll<HTMLElement>("button"),
          ]
            .filter((element) => element.getClientRects().length > 0)
            .map((element) => element.getBoundingClientRect());
          const top = Math.min(...parts.map((part) => part.top));
          const oneLine = parts.every((part) => Math.abs(part.top - top) < 8);
          const gapValue = parseFloat(getComputedStyle(line).columnGap);
          const style = getComputedStyle(words);
          const used =
            parts.reduce((sum, part) => sum + part.width, 0) +
            (Number.isNaN(gapValue) ? 0 : gapValue) * (parts.length - 1) -
            parseFloat(style.paddingInlineStart) -
            parseFloat(style.paddingInlineEnd);
          return (
            oneLine === used <= line.getBoundingClientRect().width + 0.5 &&
            parts.every((part) => part.right <= window.innerWidth + 0.5) &&
            words.scrollWidth <= words.clientWidth &&
            document.documentElement.scrollWidth <=
              document.documentElement.clientWidth
          );
        }),
      )
      .toBe(true);
    await expect(band).toContainText(/Distances · 0:\d\d/u);
    await release(page, "popDists");
    await workersListening(page);
  });
});
