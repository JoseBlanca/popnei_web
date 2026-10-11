/**
 * The Populations tab of popgen2.html, on the built site
 * (docs/specs/steps/popgen2-populations.md, "How it is checked", In
 * Playwright): the numbers of the diversity of panel.nei with
 * panel_pops.csv, at the missing data of the variants of 0.1 and, live,
 * at 0.05 with no Run pressed; the one population, "Unclassified", with
 * no individuals file, with "None" chosen and with a column that gives
 * none of the individuals a population; a column chosen while the
 * diversity is live, which sends one diversity and no PCA; the
 * unclassified left out of the table; and the diversity live beside the
 * PCA, the calculations the page asks of its worker recorded in their
 * order with the results it gets back: after a threshold moved, the PCA
 * and then the diversity, after the PCA's end; a Run of the diversity
 * while the PCA runs, which sends nothing until the PCA ends; a Stop of
 * the PCA while the diversity waits, after which the diversity starts a
 * second later, and later again when a threshold moves within that
 * second. And the tab's code downloaded apart, with "Loading the
 * Populations tab…" and "Try again".
 *
 * The numbers are popnei 0.2.2's under node on 11 October 2026
 * (docs/specs/analyses/diversity.md, "On popgen2.html", "How it is
 * verified"), written as the table shows them, to four decimals with
 * the minus sign U+2212. panel.nei holds 1,200 variants of 200 diploid
 * individuals, all of which the missing data at 0.1 keeps; panel_pops.csv
 * puts them in p0, 48, p2, 84, and p1, 68, in that order of first
 * appearance; panel_meta.csv adds the column altitude, of 198 values.
 */
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type AxeBuilder from "@axe-core/playwright";
import type { Download, Locator, Page, Route } from "@playwright/test";

import { announced, recordAnnouncements } from "./announced.ts";
import { expect, test } from "./axe.ts";
import { dropFiles } from "./dropFiles.ts";
import { holdSummary, release, workersListening } from "./holdWorker.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** How long a calculation of panel.nei may take to give its result. */
const RESULT_TIMEOUT = 30_000;

/** The label of the field of the distance of the LD pruning of the
    PCA. */
const DISTANCE =
  "Distance within which variants are compared, in base pairs, from 1";

/** The caption of the table of the diversity of panel.nei at the missing
    data of 0.1, and at 0.05. */
const CAPTION =
  "The diversity of each population, over the 1,200 variants of panel.nei the filters kept.";
const CAPTION_005 =
  "The diversity of each population, over the 1,152 variants of panel.nei the filters kept.";

/** The row p0 at the missing data of 0.1, after its header. */
const P0 = [
  "48",
  "0.3519",
  "0.3564",
  "0.9267",
  "−0.0128",
  "1.9775",
  "1.9627",
  "0",
  "0.0000",
  "0.0031",
];

/** The first five numbers of the row p0 at the missing data of 0.05. */
const P0_005 = ["48", "0.3527", "0.3567", "0.9288", "−0.0113"];

/** The one row of every individual as one population, at 0.1: He
    0.3754712450806149, Ho 0.35429523451520484, polymorphic
    0.9791666666666666, F 0.05639848814751047, alleles per variant 2,
    rarefied 1.9926031027785522 at the draw of 40, and no private
    alleles. */
const UNCLASSIFIED = [
  "200",
  "0.3755",
  "0.3543",
  "0.9792",
  "0.0564",
  "2.0000",
  "1.9926",
  "no value",
  "no value",
  "no value",
];

/** The line of the one population of the 200 individuals. */
const ONE_POPULATION =
  "1 population, Unclassified: 200 individuals. No individual is assigned to a population, so the diversity is of every individual kept as one population.";

/** The same line when the one population stands for a column the user
    chose, which classifies nobody. */
const ONE_POPULATION_OF_COLUMN = `${ONE_POPULATION} If the individuals belong to several populations, the values of Unclassified are those of all the individuals taken as one population, and F comes out higher than within each population; choose a column of populations in the box Individuals to get each one's.`;

/** What the page records, on `window`, of the calculations it asks of
    its workers and the results it gets back: "run diversity", "result
    pca", in their order. */
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

/** The calculations of the PCA and of the diversity the page asked for,
    and their results, in their order. */
async function timeline(page: Page): Promise<readonly string[]> {
  const all = await page.evaluate(
    (name) => (window as unknown as Record<string, string[]>)[name] ?? [],
    TIMELINE,
  );
  return all.filter((entry) => /(pca|diversity)$/u.test(entry));
}

/** How many calculations of `analysis` the page asked for. */
async function runsOf(
  page: Page,
  analysis: "pca" | "diversity",
): Promise<number> {
  return (await timeline(page)).filter((entry) => entry === `run ${analysis}`)
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

/** Picks the fixture `name` with the button of the box Variants. */
async function pick(page: Page, name: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Variants", exact: true })
    .getByRole("button", { name: /^Open (another )?variants file…$/u })
    .click();
  await (await chooser).setFiles(join(FIXTURES, name));
}

/** The box of the individuals file. */
function individualsBox(page: Page): Locator {
  return page.getByRole("region", { name: "Individuals", exact: true });
}

/** Opens the individuals file `file`, a fixture by its name or a file
    the flow makes, with the button of its box. */
async function pickIndividuals(page: Page, file: string | Made): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await individualsBox(page)
    .getByRole("button", { name: /^Open (another )?individuals file…$/u })
    .click();
  await (
    await chooser
  ).setFiles(
    typeof file === "string"
      ? join(FIXTURES, file)
      : {
          name: file.name,
          mimeType: "text/csv",
          buffer: Buffer.from(file.text, "utf8"),
        },
  );
}

/** Chooses `item` in the list "Column of the populations". */
async function chooseColumn(page: Page, item: string): Promise<void> {
  await individualsBox(page)
    .getByRole("button", { name: "Column of the populations" })
    .click();
  await page.getByRole("option", { name: item, exact: true }).click();
}

/** The tab of the row named `name`. */
function tab(page: Page, name: "Variants" | "PCA" | "Populations"): Locator {
  return page
    .getByRole("tablist", { name: "Files and analyses" })
    .getByRole("tab", { name, exact: true });
}

/** The panel of the tab shown. */
function shown(page: Page): Locator {
  return page.getByRole("tabpanel");
}

/** The section of the diversity, shown or hidden behind another tab. */
function diversity(page: Page): Locator {
  return page.getByRole("region", {
    name: "Diversity",
    exact: true,
    includeHidden: true,
  });
}

/** The button of the tab shown named `name`. */
function button(
  page: Page,
  name: "Run" | "Stop" | "Stop recalculating",
): Locator {
  return shown(page).getByRole("button", { name, exact: true });
}

/** The table of the diversity by its caption. */
function table(page: Page, caption: string): Locator {
  return diversity(page).getByRole("table", {
    name: caption,
    exact: true,
    includeHidden: true,
  });
}

/** The cells of the row of the population `pop` of the table of the
    diversity, its header left out. */
function row(page: Page, pop: string): Locator {
  return diversity(page)
    .getByRole("row", { includeHidden: true })
    .filter({
      has: page.getByRole("rowheader", {
        name: pop,
        exact: true,
        includeHidden: true,
      }),
    })
    .getByRole("cell", { includeHidden: true });
}

/** The box of the threshold of the missing data of the variants, in the
    Variants tab. */
function missingBox(page: Page): Locator {
  return page
    .getByRole("region", { name: "Statistics of the file" })
    .getByRole("group", {
      name: "Proportion of missing genotypes",
      exact: true,
    })
    .getByRole("textbox");
}

/** Sets the threshold of the missing data of the variants to `value` in
    the Variants tab, and comes back to the tab `back`. */
async function setMissing(
  page: Page,
  value: string,
  back: "PCA" | "Populations",
): Promise<void> {
  await tab(page, "Variants").click();
  await missingBox(page).fill(value);
  await missingBox(page).press("Enter");
  await tab(page, back).click();
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

/** Shows the Populations tab once the one pass has read panel.nei to the
    end, Run enabled, presses Run and waits for the table of `caption`. */
async function runDiversity(page: Page, caption = CAPTION): Promise<void> {
  await tab(page, "Populations").click();
  await expect(button(page, "Run")).toBeEnabled({ timeout: RESULT_TIMEOUT });
  await button(page, "Run").click();
  await expect(table(page, caption)).toBeVisible({ timeout: RESULT_TIMEOUT });
}

/** In the PCA tab, types the LD distance, 50000, waits for Run, and
    presses it; with `wait`, waits for its result, of 548 variants. */
async function runPca(page: Page, wait = true): Promise<void> {
  await tab(page, "PCA").click();
  const distance = shown(page).getByRole("textbox", { name: DISTANCE });
  await expect(distance).toBeVisible({ timeout: RESULT_TIMEOUT });
  await distance.fill("50000");
  await distance.press("Enter");
  await expect(button(page, "Run")).toBeEnabled({ timeout: RESULT_TIMEOUT });
  await button(page, "Run").click();
  if (wait) {
    await expect(
      page.getByText(/^The place of each of the 200 individuals/u),
    ).toContainText("from 548 variants.", { timeout: RESULT_TIMEOUT });
  }
}

/** The rows of panel_pops.csv, its header first. */
function panelPopsRows(): readonly string[] {
  return readFileSync(join(FIXTURES, "panel_pops.csv"), "utf8")
    .trimEnd()
    .split("\n");
}

test.describe("PT1 D4 the Populations tab", () => {
  test("PT1 D4 panel.nei and panel_pops.csv: Run gives p0 48, 0.3519, 0.3564, 0.9267, −0.0128, 1.9775, 1.9627, 0, 0.0000, 0.0031 and p2 1 private allele; the missing data moved to 0.05 gives p0 0.3527, 0.3567, 0.9288, −0.0113 with no Run pressed; axe on the result, light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(90_000);
    await openPage(page);
    await pick(page, "panel.nei");
    await pickIndividuals(page, "panel_pops.csv");
    await tab(page, "Populations").click();
    await expect(
      shown(page).getByText(
        "3 populations: p0, 48 individuals; p2, 84 individuals; p1, 68 individuals",
        { exact: true },
      ),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });
    await runDiversity(page);
    await expect(row(page, "p0")).toHaveText(P0);
    await expect(row(page, "p2").nth(7)).toHaveText("1");
    await expect(
      shown(page).getByText(
        "Calculated with popnei 0.2.2, in version 0.1.0 of the application.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      shown(page).getByText("Rarefied to 40 chromosomes.", { exact: true }),
    ).toBeVisible();
    await expect(
      shown(page).getByRole("heading", {
        level: 3,
        name: "Site frequency spectrum",
      }),
    ).toBeVisible();
    // The old page's buttons of download are not drawn here.
    await expect(
      shown(page).getByRole("button", { name: /^Download the .* as CSV$/u }),
    ).toHaveCount(0);
    await expect(button(page, "Stop recalculating")).toBeVisible();
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
    }

    const before = await runsOf(page, "diversity");
    await setMissing(page, "0.05", "Populations");
    await expect(table(page, CAPTION_005)).toBeVisible({
      timeout: RESULT_TIMEOUT,
    });
    await expect(
      row(page, "p0").and(page.locator(":nth-child(-n+6)")),
    ).toHaveText(P0_005);
    expect(await runsOf(page, "diversity")).toBe(before + 1);
    expect(await runsOf(page, "pca")).toBe(0);
  });

  test("PT1 D4 no individuals file: the line and the one row Unclassified, 200, 0.3755, 0.3543, 0.9792, 0.0564, 2.0000, 1.9926 and no private alleles; axe on the line and on the result, light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(90_000);
    await openPage(page);
    await pick(page, "panel.nei");
    await tab(page, "Populations").click();
    await expect(
      shown(page).getByText(ONE_POPULATION, { exact: true }),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expect(button(page, "Run")).toBeEnabled({ timeout: RESULT_TIMEOUT });
    await expectNoAxeViolations(page, makeAxeBuilder);
    await runDiversity(page);
    await expect(row(page, "Unclassified")).toHaveText(UNCLASSIFIED);
    await expect(diversity(page).getByRole("rowheader")).toHaveCount(1);
    await expectNoAxeViolations(page, makeAxeBuilder);
  });

  test("PT1 D4 axe in the ready state and while the diversity runs, held, light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(90_000);
    await holdSummary(page, { holdDiversity: true });
    await openPage(page);
    await pick(page, "panel.nei");
    await release(page, "allSoFar");
    await release(page, "result");
    await pickIndividuals(page, "panel_pops.csv");
    await tab(page, "Populations").click();
    await expect(button(page, "Run")).toBeEnabled({ timeout: RESULT_TIMEOUT });
    await expectNoAxeViolations(page, makeAxeBuilder);
    await button(page, "Run").click();
    await expect(button(page, "Stop")).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expectNoAxeViolations(page, makeAxeBuilder);
    await release(page, "diversity");
    await expect(table(page, CAPTION)).toBeVisible({ timeout: RESULT_TIMEOUT });
  });

  test("PT1 D4 panel_pops.csv with None chosen, and with a column that gives none of the individuals of panel.nei a population: the same one row Unclassified", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openPage(page);
    await pick(page, "panel.nei");
    const [header, ...rows] = panelPopsRows();
    // A column, batch, filled only for two individuals not in panel.nei.
    await pickIndividuals(page, {
      name: "panel_batch.csv",
      text: [
        `${header ?? ""},batch`,
        ...rows.map((line) => `${line},`),
        "x001,p0,b1",
        "x002,p1,b2",
        "",
      ].join("\n"),
    });
    await chooseColumn(page, "None: every individual unclassified");
    await runDiversity(page);
    await expect(row(page, "Unclassified")).toHaveText(UNCLASSIFIED);

    await chooseColumn(page, "batch");
    await tab(page, "Populations").click();
    await expect(
      shown(page).getByText(ONE_POPULATION_OF_COLUMN, { exact: true }),
    ).toBeVisible();
    // The key changed with the column, so the diversity, live, is
    // calculated again by itself.
    await expect(table(page, CAPTION)).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expect(row(page, "Unclassified")).toHaveText(UNCLASSIFIED);
    expect(await runsOf(page, "diversity")).toBe(2);
  });

  test("PT1 D4 panel_meta.csv with the diversity live: altitude chosen sends one request of the diversity and none of the PCA", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openPage(page);
    await pick(page, "panel.nei");
    await pickIndividuals(page, "panel_meta.csv");
    await expect(
      individualsBox(page).getByRole("button", {
        name: "Column of the populations",
      }),
    ).toContainText("popcat");
    await runDiversity(page);
    await expect(row(page, "p0").first()).toHaveText("48");
    await chooseColumn(page, "altitude");
    await tab(page, "Populations").click();
    await expect(row(page, "Unclassified").first()).toHaveText("200", {
      timeout: RESULT_TIMEOUT,
    });
    expect(await runsOf(page, "diversity")).toBe(2);
    expect(await runsOf(page, "pca")).toBe(0);
  });

  test("PT1 D4 panel_pops.csv with four rows removed and three cells of popcat emptied: the line and the caption say 7 unclassified, and the table has three rows", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openPage(page);
    await pick(page, "panel.nei");
    const [header, ...rows] = panelPopsRows();
    // The first four rows removed, s000 to s003 of p0, and the popcat of
    // the next three emptied, s004 to s006 of p2: 7 individuals of
    // panel.nei with no population.
    const made = rows
      .slice(4)
      .map((line, i) => (i < 3 ? `${line.split(",")[0] ?? ""},` : line));
    await pickIndividuals(page, {
      name: "panel_some.csv",
      text: [header ?? "", ...made, ""].join("\n"),
    });
    await tab(page, "Populations").click();
    await expect(
      shown(page).getByText(
        "7 unclassified individuals kept are left out, as the box Individuals says.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });
    await runDiversity(
      page,
      `${CAPTION} 7 unclassified individuals kept are not in it.`,
    );
    // In the order each first appears in the file made: s000 to s003,
    // of p0, removed, and s004 to s006, of p2, emptied, so s007 of p2
    // comes first, then s008 of p1, and p0 after them.
    await expect(diversity(page).getByRole("rowheader")).toHaveText([
      "p2",
      "p1",
      "p0",
    ]);
  });
});

test.describe("PT1 D4 the diversity live beside the PCA", () => {
  test("PT1 D4 both live, a threshold moved: one PCA, and while it runs the diversity waits, Stop recalculating and no Stop; then one diversity after the PCA's result", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await holdSummary(page);
    await openPage(page);
    await pick(page, "panel.nei");
    await release(page, "allSoFar");
    await release(page, "result");
    await pickIndividuals(page, "panel_pops.csv");
    await runPca(page);
    await runDiversity(page);
    const before = (await timeline(page)).length;

    // The PCA's result held from here. The page posts a request to its
    // worker only once the worker is idle, so the timeline alone would
    // be the same with a diversity started during the PCA: the button
    // says whether the diversity runs.
    await release(page, "holdPcaAgain");
    await setMissing(page, "0.05", "Populations");
    await expect
      .poll(async () => (await timeline(page)).slice(before))
      .toEqual(["run pca"]);
    // More than the quiet second after the change, in which the
    // diversity would have started had it not waited.
    await page.waitForTimeout(1500);
    await expect(button(page, "Stop recalculating")).toBeVisible();
    await expect(button(page, "Stop")).toHaveCount(0);

    await release(page, "pca");
    await expect(table(page, CAPTION_005)).toBeVisible({
      timeout: RESULT_TIMEOUT,
    });
    expect((await timeline(page)).slice(before)).toEqual([
      "run pca",
      "result pca",
      "run diversity",
      "result diversity",
    ]);
  });

  test("PT1 D4 Run of the diversity while the PCA runs: no request until the PCA's result, then one", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await holdSummary(page, { holdPca: true });
    await page.clock.install();
    await openPage(page);
    await pick(page, "panel.nei");
    await release(page, "allSoFar");
    await release(page, "result");
    await runPca(page, false);
    await expect(button(page, "Stop")).toBeVisible();
    await tab(page, "Populations").click();
    await button(page, "Run").click();
    await expect(button(page, "Stop recalculating")).toBeVisible();
    // Three quiet seconds of the page's clock, and nothing sent.
    await page.clock.runFor(3000);
    expect(await runsOf(page, "diversity")).toBe(0);

    await release(page, "pca");
    await expect(table(page, CAPTION)).toBeVisible({ timeout: RESULT_TIMEOUT });
    expect(await timeline(page)).toEqual([
      "run pca",
      "result pca",
      "run diversity",
      "result diversity",
    ]);
    await workersListening(page);
  });

  test("PT1 D4 Stop of the PCA while the diversity waits: no request for a second, one after it; a threshold moved within that second puts it off", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await holdSummary(page, { holdPca: true });
    await page.clock.install();
    await openPage(page);
    await pick(page, "panel.nei");
    await release(page, "allSoFar");
    await release(page, "result");
    await runPca(page, false);
    await tab(page, "Populations").click();
    await button(page, "Run").click();
    await expect(button(page, "Stop recalculating")).toBeVisible();
    expect(await runsOf(page, "diversity")).toBe(0);

    // The page's timers stand still from here, so that the second is
    // measured on the page's clock alone.
    await page.clock.pauseAt(Date.now() + 1000);
    await tab(page, "PCA").click();
    await button(page, "Stop").click();
    await expect(button(page, "Run")).toBeVisible();
    await page.clock.runFor(500);
    expect(await runsOf(page, "diversity")).toBe(0);

    // A threshold moved half a second after the Stop: the second starts
    // again from it.
    await tab(page, "Variants").click();
    await missingBox(page).fill("0.05");
    await missingBox(page).press("Enter");
    await page.clock.runFor(800);
    expect(await runsOf(page, "diversity")).toBe(0);
    await page.clock.runFor(400);
    await expect.poll(() => runsOf(page, "diversity")).toBe(1);
    await page.clock.resume();
    await tab(page, "Populations").click();
    await expect(table(page, CAPTION_005)).toBeVisible({
      timeout: RESULT_TIMEOUT,
    });
    expect(await runsOf(page, "pca")).toBe(1);
    await workersListening(page);
  });
});

test.describe("PT1 D3 the code of the Populations tab", () => {
  test('PT1 D3 the tab\'s code that could not be downloaded: "Loading the Populations tab…" while it is asked for, then its words with Try again, no error bar; Try again draws the tab, the focus on its heading, and Run draws the table', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openPage(page);
    await pick(page, "panel.nei");
    // The file of the tab held from the first time the tab is shown,
    // which asks for it; Try again asks for it again.
    const tabFile = /\/PopulationsTabView-[^/]*\.js(\?.*)?$/u;
    const held: Route[] = [];
    await page.route(tabFile, (route) => {
      held.push(route);
    });
    await tab(page, "Populations").click();
    await expect(
      shown(page).getByText("Loading the Populations tab…", { exact: true }),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expect.poll(() => held.length).toBeGreaterThan(0);

    for (const route of held) await route.abort();
    await page.unroute(tabFile);
    const words =
      "The Populations tab could not be loaded. Press Try again. If it fails again, the site may have been updated since this page was opened: reload the page and open panel.nei again; what the page has calculated is lost.";
    await expect(shown(page).getByText(words, { exact: true })).toBeVisible();
    await expect(page.getByRole("alert")).toHaveText("");

    await shown(page).getByRole("button", { name: "Try again" }).click();
    await expect(
      shown(page).getByRole("heading", { level: 2, name: "Diversity" }),
    ).toBeFocused({ timeout: RESULT_TIMEOUT });
    await expect(shown(page).getByText(words, { exact: true })).toHaveCount(0);
    await expect(button(page, "Run")).toBeEnabled({ timeout: RESULT_TIMEOUT });
    await button(page, "Run").click();
    await expect(table(page, CAPTION)).toBeVisible({ timeout: RESULT_TIMEOUT });
  });

  for (const kind of ["js", "css"] as const) {
    test(`PT1 D3 a file the tab imports, shared with popgen.html, fails once, its ${kind === "js" ? "script" : "styles"}: Try again draws the tab, and Run the table with its styles`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await openPage(page);
      await pick(page, "panel.nei");
      // A file the first file of the tab imports, which a browser keeps
      // the failure of for the life of the page once an import() met it
      // (the review of work package 1 of docs/plans/population-tab.md);
      // only its first request fails.
      const sharedFile = new RegExp(
        `/shared~popgen~PopulationsTabView-[^~/]*\\.${kind}(\\?.*)?$`,
        "u",
      );
      let failed = 0;
      await page.route(sharedFile, async (route) => {
        if (failed === 0) {
          failed += 1;
          await route.abort();
        } else {
          await route.continue();
        }
      });
      await tab(page, "Populations").click();
      const tryAgain = shown(page).getByRole("button", { name: "Try again" });
      await expect(tryAgain).toBeVisible({ timeout: RESULT_TIMEOUT });
      expect(failed).toBe(1);
      await tryAgain.click();
      await expect(button(page, "Run")).toBeEnabled({
        timeout: RESULT_TIMEOUT,
      });
      await button(page, "Run").click();
      await expect(table(page, CAPTION)).toBeVisible({
        timeout: RESULT_TIMEOUT,
      });
      // The styles of the tab are in force.
      expect(
        await page.evaluate(() =>
          [...document.styleSheets].some(
            (sheet) =>
              sheet.href?.includes("shared~popgen~PopulationsTabView-") ===
              true,
          ),
        ),
      ).toBe(true);
    });
  }

  for (const shared of [
    "shared~popgen~PopulationsTabView~SectionPlots",
    "shared~popgen~PopulationsTabView~SectionPlots~PcaTabResultView",
  ]) {
    test(`PT1 D3 a file the plots of the Variants tab share with the tab, ${shared}, fails once while the plots download: the tab, with Try again if it is asked, draws its table`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      const sharedFile = new RegExp(`/${shared}-[^~/]*\\.js(\\?.*)?$`, "u");
      let failed = 0;
      await page.route(sharedFile, async (route) => {
        if (failed === 0) {
          failed += 1;
          await route.abort();
        } else {
          await route.continue();
        }
      });
      await openPage(page);
      await pick(page, "panel.nei");
      // The plots of the Variants tab ask for the file first.
      await expect.poll(() => failed).toBe(1);
      await tab(page, "Populations").click();
      const run = button(page, "Run");
      const tryAgain = shown(page).getByRole("button", { name: "Try again" });
      await expect(run.or(tryAgain)).toBeVisible({ timeout: RESULT_TIMEOUT });
      if (await tryAgain.isVisible()) await tryAgain.click();
      await expect(run).toBeEnabled({ timeout: RESULT_TIMEOUT });
      await run.click();
      await expect(table(page, CAPTION)).toBeVisible({
        timeout: RESULT_TIMEOUT,
      });
    });
  }
});

// PT1 D7: the flows of the lock of the filters and of the download's
// wait while the diversity runs (task 1.6 of docs/plans/
// population-tab.md) go below this line.

/** The words of the lock of the thresholds while the diversity runs,
    alone, and with the PCA live beside it. */
const LOCKED_DIVERSITY =
  "Stop the diversity in the Populations tab to change the filters; then press Run there to calculate it again.";
const LOCKED_DIVERSITY_PCA_LIVE =
  "Stop the diversity in the Populations tab to change the filters, or press Stop all beside the heading Popnei to stop the PCA too; then press Run in each tab to calculate them again.";

/** The words of the lock of the thresholds while the PCA runs with the
    diversity live beside it. */
const LOCKED_PCA_DIVERSITY_LIVE =
  "Stop the PCA in the PCA tab to change the filters, or press Stop all beside the heading Popnei to stop the diversity too; then press Run in each tab to calculate them again.";

/** The words of the download's wait. */
const WAITS_DIVERSITY =
  "Waits for the diversity to end; or stop it in the Populations tab.";
const WAITS_DIVERSITY_THEN_PCA =
  "Waits for the diversity, and the PCA after it, to end; or press Stop all beside the heading Popnei.";
const WAITS_PCA_THEN_DIVERSITY =
  "Waits for the PCA, and the diversity after it, to end; or press Stop all beside the heading Popnei.";

/** The statistics of the file, in the Variants tab. */
function stats(page: Page): Locator {
  return page.getByRole("region", { name: "Statistics of the file" });
}

/** The button of the download of the filtered variants. */
function downloadButton(page: Page): Locator {
  return stats(page).getByRole("button", {
    name: "Download filtered variants…",
    exact: true,
  });
}

/** The FILTER box of the Variants tab. */
function filterBox(page: Page): Locator {
  return stats(page).getByRole("checkbox", {
    name: "Leave out the variants that failed their FILTER",
  });
}

/** The five boxes and five lines of the thresholds of the Variants tab,
    and the FILTER box of a VCF that records the FILTER, `withFilter`,
    with the Variants tab shown. */
async function filterControls(
  page: Page,
  withFilter: boolean,
): Promise<readonly Locator[]> {
  await tab(page, "Variants").click();
  // The lines are drawn over the plots once they are laid out.
  await expect(stats(page).getByRole("slider")).toHaveCount(5);
  const boxes = await stats(page).getByRole("textbox").all();
  expect(boxes).toHaveLength(5);
  return [
    ...boxes,
    ...(await stats(page).getByRole("slider").all()),
    ...(withFilter ? [filterBox(page)] : []),
  ];
}

/** Expects each of the filters of the Variants tab greyed with
    `words`, the FILTER box among them with `withFilter`, and the
    download waiting with `waits`. */
async function expectLocked(
  page: Page,
  {
    words,
    waits,
    withFilter,
  }: {
    readonly words: string;
    readonly waits: string;
    readonly withFilter: boolean;
  },
): Promise<void> {
  for (const control of await filterControls(page, withFilter)) {
    await expect(control).toHaveAttribute("aria-disabled", "true");
    await expect(control).toHaveAccessibleDescription(
      new RegExp(words.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"),
    );
  }
  await expect(downloadButton(page)).toBeDisabled();
  await expect(downloadButton(page)).toHaveAccessibleDescription(waits);
}

/** Expects every filter of the Variants tab open, the FILTER box among
    them with `withFilter`, and the download enabled. */
async function expectOpen(page: Page, withFilter: boolean): Promise<void> {
  for (const control of await filterControls(page, withFilter)) {
    await expect(control).not.toHaveAttribute("aria-disabled");
  }
  await expect(downloadButton(page)).toBeEnabled();
}

test.describe("PT1 D7 the filters and the download while the diversity runs", () => {
  test("PT1 D7 the diversity held running on panel.vcf.gz: the five thresholds and the FILTER box greyed with its words, the download waiting with its words, the PCA's options open; the PCA's Run pressed, which waits: the words name Stop all and the PCA after it; after the diversity's Stop, the PCA calculated and everything open; axe light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(150_000);
    await holdSummary(page, { holdDiversity: true });
    await openPage(page);
    await pick(page, "panel.vcf.gz");
    await release(page, "allSoFar");
    await release(page, "result");
    await tab(page, "Populations").click();
    await expect(button(page, "Run")).toBeEnabled({ timeout: RESULT_TIMEOUT });
    await button(page, "Run").click();
    await expect(button(page, "Stop")).toBeVisible();
    await expect.poll(() => runsOf(page, "diversity")).toBe(1);

    await expectLocked(page, {
      words: LOCKED_DIVERSITY,
      waits: WAITS_DIVERSITY,
      withFilter: true,
    });
    await stats(page).screenshot({
      path: test.info().outputPath("thresholds-diversity-running.png"),
    });
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
    }
    // A press on the FILTER box changes nothing, and asks for nothing.
    await filterBox(page)
      .locator("xpath=ancestor::label[1]")
      .click({ force: true });
    await expect(filterBox(page)).toBeChecked();
    expect(await runsOf(page, "diversity")).toBe(1);

    // The PCA's options stay open while the diversity runs: a distance
    // typed, and its Run, which waits after the diversity.
    await tab(page, "PCA").click();
    await expect(
      shown(page).getByRole("button", { name: /Method$/u }),
    ).not.toHaveAttribute("aria-disabled");
    const distance = shown(page).getByRole("textbox", { name: DISTANCE });
    await expect(distance).not.toHaveAttribute("aria-disabled");
    await distance.fill("50000");
    await distance.press("Enter");
    await button(page, "Run").click();
    await expect(button(page, "Stop recalculating")).toBeVisible();
    expect(await runsOf(page, "pca")).toBe(0);
    await expectLocked(page, {
      words: LOCKED_DIVERSITY_PCA_LIVE,
      waits: WAITS_DIVERSITY_THEN_PCA,
      withFilter: true,
    });

    await tab(page, "Populations").click();
    await button(page, "Stop").click();
    await expect(button(page, "Run")).toBeVisible();
    await tab(page, "PCA").click();
    await expect(
      page.getByText(/^The place of each of the 200 individuals/u),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expectOpen(page, true);
    expect(await runsOf(page, "diversity")).toBe(1);
    await workersListening(page);
  });

  test("PT1 D7 the PCA held running and the diversity's Run pressed, which waits: the filters name Stop all and the download the PCA and the diversity after it; at the PCA's end the diversity runs, and then everything is open", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await holdSummary(page, { holdPca: true });
    await openPage(page);
    await pick(page, "panel.nei");
    await release(page, "allSoFar");
    await release(page, "result");
    await runPca(page, false);
    await expect(button(page, "Stop")).toBeVisible();
    await expectLocked(page, {
      words:
        "Stop the PCA in the PCA tab to change the filters; then press Run there to calculate it again.",
      waits: "Waits for the PCA to end; or stop it in the PCA tab.",
      withFilter: false,
    });

    await tab(page, "Populations").click();
    await button(page, "Run").click();
    await expect(button(page, "Stop recalculating")).toBeVisible();
    await expectLocked(page, {
      words: LOCKED_PCA_DIVERSITY_LIVE,
      waits: WAITS_PCA_THEN_DIVERSITY,
      withFilter: false,
    });
    expect(await runsOf(page, "diversity")).toBe(0);

    await release(page, "pca");
    await tab(page, "Populations").click();
    await expect(table(page, CAPTION)).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expectOpen(page, false);
    expect(await timeline(page)).toEqual([
      "run pca",
      "result pca",
      "run diversity",
      "result diversity",
    ]);
    await workersListening(page);
  });
});

/** The reason of the lock of the populations while the diversity runs
    alone. */
const POPULATIONS_LOCKED =
  "Stop the diversity in the Populations tab to change the populations; then press Run there to calculate it again.";

/** What the box shows and says of other.csv dropped or pasted while the
    diversity runs. */
const OTHER_NOT_OPENED =
  "other.csv was not opened: the populations cannot change while the diversity runs. Stop the diversity in the Populations tab, then open other.csv again.";

/** The tab Individuals of the row. */
function individualsTab(page: Page): Locator {
  return page
    .getByRole("tablist", { name: "Files and analyses" })
    .getByRole("tab", { name: "Individuals", exact: true });
}

/** The controls of the box Individuals that give the populations, in the
    order of the Tab key: the list of the column, the zone's hidden button
    of the paste, its button and Remove. */
function populationControls(page: Page): readonly Locator[] {
  const box = individualsBox(page);
  return [
    box.getByRole("button", { name: /Column of the populations$/u }),
    box.getByRole("button", { name: "Paste an individuals file", exact: true }),
    box.getByRole("button", { name: "Open another individuals file…" }),
    box.getByRole("button", { name: "Remove panel_pops.csv" }),
  ];
}

/** The three lists of how a text file is read, in the Individuals tab
    shown. */
function readerLists(page: Page): readonly Locator[] {
  return ["Encoding", "Separator", "Decimal mark"].map((label) =>
    shown(page).getByRole("button", { name: new RegExp(`${label}$`, "u") }),
  );
}

/** Pastes the text `text` as a file named `name` into the zone's hidden
    button of the box Individuals, as popgen2Input.spec.ts does. */
async function pasteIndividuals(
  page: Page,
  name: string,
  text: string,
): Promise<void> {
  const paste = individualsBox(page).getByRole("button", {
    name: "Paste an individuals file",
    exact: true,
  });
  await paste.focus();
  await paste.evaluate(
    (button, given) => {
      // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with its item, by call
      const entryOf = DataTransferItem.prototype.webkitGetAsEntry;
      DataTransferItem.prototype.webkitGetAsEntry = function (
        this: DataTransferItem,
      ) {
        return (
          entryOf.call(this) ??
          ({ isFile: true, isDirectory: false } as FileSystemEntry)
        );
      };
      const transfer = new DataTransfer();
      transfer.items.add(new File([given.text], given.name));
      const event = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "clipboardData", { value: transfer });
      button.dispatchEvent(event);
    },
    { name, text },
  );
}

/** Whether a press of `control` opens no file picker within half a
    second, the time a picker opened takes on the owner's Mac by far. */
async function opensNoPicker(page: Page, control: Locator): Promise<boolean> {
  let opened = false;
  const onChooser = (): void => {
    opened = true;
  };
  page.on("filechooser", onChooser);
  // Forced, since Playwright waits for a control marked aria-disabled to
  // be enabled before it clicks.
  await control.click({ force: true });
  await page.waitForTimeout(500);
  page.off("filechooser", onChooser);
  return !opened;
}

/** Presses `control` and waits for the file picker it opens. */
async function opensPicker(page: Page, control: Locator): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await control.click();
  await chooser;
}

/** Opens panel.nei and panel_pops.csv with the worker holding the
    analyses `hold`, waits for the one pass, and shows the tab `back`. */
async function bothOpened(
  page: Page,
  hold: { readonly holdDiversity?: boolean; readonly holdPca?: boolean },
): Promise<void> {
  await holdSummary(page, hold);
  await openPage(page);
  await pick(page, "panel.nei");
  await release(page, "allSoFar");
  await release(page, "result");
  await pickIndividuals(page, "panel_pops.csv");
  await expect(
    individualsBox(page).getByRole("button", {
      name: /Column of the populations$/u,
    }),
  ).toContainText("popcat", { timeout: RESULT_TIMEOUT });
}

test.describe("PT3 D3 the box Individuals greyed while the diversity runs", () => {
  test("PT3 D3 the diversity held running: the filters, its options, the column, the zone, Remove and the reader's lists greyed with their reasons, reached by the Tab key; the list opens no popover, the button no picker; a drop and a paste open nothing and show the file not opened, said; the PCA's options open; after the diversity's result everything open; axe light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(150_000);
    await recordAnnouncements(page);
    await bothOpened(page, { holdDiversity: true });
    await tab(page, "Populations").click();
    await expect(button(page, "Run")).toBeEnabled({ timeout: RESULT_TIMEOUT });
    await button(page, "Run").click();
    await expect(button(page, "Stop")).toBeVisible();

    // The options of the diversity, with the words of the filters.
    const options = shown(page).getByRole("textbox");
    expect(await options.count()).toBeGreaterThan(0);
    for (const option of await options.all()) {
      await expect(option).toHaveAttribute("aria-disabled", "true");
      await expect(option).toHaveAccessibleDescription(
        new RegExp(LOCKED_DIVERSITY.replaceAll(".", "\\."), "u"),
      );
    }

    // The box Individuals, each control greyed and described, a stop of
    // the Tab key in its order.
    const controls = populationControls(page);
    for (const control of controls) {
      await expect(control).toHaveAttribute("aria-disabled", "true");
      await expect(control).toHaveAccessibleDescription(
        new RegExp(POPULATIONS_LOCKED.replaceAll(".", "\\."), "u"),
      );
    }
    const [list, paste, open, remove] = controls;
    if (
      list === undefined ||
      paste === undefined ||
      open === undefined ||
      remove === undefined
    ) {
      throw new Error("the box has not its four controls");
    }
    // The mouse, left on Run, is off every control, whose tooltip it
    // would open.
    await page.mouse.move(0, 0);
    await list.focus();
    await expect(page.getByRole("tooltip")).toHaveText(POPULATIONS_LOCKED);
    for (const next of [paste, open, remove]) {
      await page.keyboard.press("Tab");
      await expect(next).toBeFocused();
    }
    await expect(page.getByRole("tooltip")).toHaveText(POPULATIONS_LOCKED);

    // The list opens no popover; the button no picker; Remove removes
    // nothing.
    // Playwright waits for a control marked aria-disabled to be enabled
    // before it clicks; the user's click is not held so.
    await list.click({ force: true });
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(page.getByRole("tooltip")).toHaveText(POPULATIONS_LOCKED);
    expect(await opensNoPicker(page, open)).toBe(true);
    await remove.click({ force: true });
    await expect(remove).toBeVisible();

    // A file dropped, and one pasted, open nothing and show that the
    // file was not opened and what to do, said once each.
    const reason = individualsBox(page).getByText(OTHER_NOT_OPENED, {
      exact: true,
    });
    await expect(reason).toHaveCount(0);
    const other = "IID,pop\ns000,q\n";
    await dropFiles(page, open, [{ name: "other.csv", text: other }]);
    await expect(reason).toBeVisible();
    await expect
      .poll(async () =>
        (await announced(page)).filter((text) => text === OTHER_NOT_OPENED),
      )
      .toHaveLength(1);
    await pasteIndividuals(page, "other.csv", other);
    await expect
      .poll(async () =>
        (await announced(page)).filter((text) => text === OTHER_NOT_OPENED),
      )
      .toHaveLength(2);
    await expect(
      individualsBox(page).getByText("panel_pops.csv", { exact: true }),
    ).toBeVisible();
    await expect(list).toContainText("popcat");
    expect(await runsOf(page, "diversity")).toBe(1);

    // The lists of the reader in the Individuals tab.
    await individualsTab(page).click();
    for (const reader of readerLists(page)) {
      await expect(reader).toHaveAttribute("aria-disabled", "true");
      await expect(reader).toHaveAccessibleDescription(
        new RegExp(POPULATIONS_LOCKED.replaceAll(".", "\\."), "u"),
      );
    }
    await expectNoAxeViolations(page, makeAxeBuilder);

    // The PCA's options stay open.
    await tab(page, "PCA").click();
    await expect(
      shown(page).getByRole("button", { name: /Method$/u }),
    ).not.toHaveAttribute("aria-disabled");
    await expect(
      shown(page).getByRole("textbox", { name: DISTANCE }),
    ).not.toHaveAttribute("aria-disabled");
    await expectNoAxeViolations(page, makeAxeBuilder);

    // The diversity's result: everything open, the reason gone.
    await release(page, "diversity");
    await tab(page, "Populations").click();
    await expect(table(page, CAPTION)).toBeVisible({ timeout: RESULT_TIMEOUT });
    for (const control of controls) {
      await expect(control).not.toHaveAttribute("aria-disabled");
    }
    await expect(reason).toHaveCount(0);
    await individualsTab(page).click();
    for (const reader of readerLists(page)) {
      await expect(reader).not.toHaveAttribute("aria-disabled");
    }
    await workersListening(page);
  });

  test("PT3 D3 at 320 px the diversity held running: the tooltip of the list of the column and of Remove, greyed, stands within the window, 12 px at least from each edge", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width: 320, height: 800 });
    await bothOpened(page, { holdDiversity: true });
    await tab(page, "Populations").click();
    await expect(button(page, "Run")).toBeEnabled({ timeout: RESULT_TIMEOUT });
    await button(page, "Run").click();
    await expect(button(page, "Stop")).toBeVisible();
    await page.mouse.move(0, 0);
    // The list by its focus, and Remove, at the window's right edge, by
    // the Tab key, as a user of the keyboard reaches them, which shows
    // their tooltips; the zone between shows none of its own.
    const controls = populationControls(page);
    const [list, , , remove] = controls;
    if (list === undefined || remove === undefined) {
      throw new Error("the box has not its four controls");
    }
    await list.focus();
    for (const control of [list, remove]) {
      while (!(await control.evaluate((e) => e === document.activeElement))) {
        await page.keyboard.press("Tab");
      }
      const tooltip = page.getByRole("tooltip");
      await expect(tooltip).toHaveText(POPULATIONS_LOCKED);
      const box = await tooltip.boundingBox();
      if (box === null) throw new Error("no tooltip");
      expect(box.x).toBeGreaterThanOrEqual(12);
      expect(box.x + box.width).toBeLessThanOrEqual(320 - 12);
    }
    await release(page, "diversity");
    await workersListening(page);
  });

  test("PT3 D3 the PCA held running: the column, the zone, Remove and the reader's lists not greyed, and the zone's button opens the picker", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await bothOpened(page, { holdPca: true });
    await runPca(page, false);
    await expect(button(page, "Stop")).toBeVisible();
    for (const control of populationControls(page)) {
      await expect(control).not.toHaveAttribute("aria-disabled");
    }
    await individualsTab(page).click();
    for (const reader of readerLists(page)) {
      await expect(reader).not.toHaveAttribute("aria-disabled");
    }
    const open = populationControls(page)[2];
    if (open === undefined) throw new Error("no button of the zone");
    await opensPicker(page, open);
    await workersListening(page);
  });
});

/** The line of the Populations tab while the diversity waits for the
    PCA that runs. */
const WAITS_FOR_PCA =
  "The diversity starts once the PCA, which is running, ends.";

/** The line of the PCA tab while the PCA waits for the diversity that
    runs. */
const WAITS_FOR_DIVERSITY =
  "The PCA starts once the diversity, which is running, ends.";

/** What the status region says at the first start of a round of the PCA
    and the diversity, with the band's Stop all. */
const ROUND =
  "Calculating the PCA and then the diversity again. To change the filters, press Stop all beside the heading Popnei, or stop each in its tab; to change the populations, stop the diversity in the Populations tab.";

/** The texts the status region took that hold `text`. */
async function saidWith(page: Page, text: string): Promise<readonly string[]> {
  return (await announced(page)).filter((said) => said.includes(text));
}

test.describe("PT2 D3 the Populations tab while the diversity waits, and what the status region says", () => {
  test("PT2 D3 both live, a threshold moved with the PCA held running: the Populations tab shows the line of waiting for the PCA; the round is said once and never joined with an end; axe light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(120_000);
    await recordAnnouncements(page);
    await holdSummary(page);
    await openPage(page);
    await pick(page, "panel.nei");
    await release(page, "allSoFar");
    await release(page, "result");
    await pickIndividuals(page, "panel_pops.csv");
    await runPca(page);
    await runDiversity(page);

    await expect
      .poll(() => saidWith(page, "Diversity of panel.nei calculated."))
      .toHaveLength(1);
    await release(page, "holdPcaAgain");
    const from = (await announced(page)).length;
    await setMissing(page, "0.05", "Populations");
    await expect(
      shown(page).getByText(WAITS_FOR_PCA, { exact: true }),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expect(button(page, "Stop recalculating")).toBeVisible();
    await expectNoAxeViolations(page, makeAxeBuilder);

    await release(page, "pca");
    await expect(table(page, CAPTION_005)).toBeVisible({
      timeout: RESULT_TIMEOUT,
    });
    await expect(
      shown(page).getByText(WAITS_FOR_PCA, { exact: true }),
    ).toHaveCount(0);
    await expect
      .poll(async () =>
        (await announced(page))
          .slice(from)
          .some((said) => said.includes("Diversity of panel.nei calculated.")),
      )
      .toBe(true);
    const since = (await announced(page)).slice(from);
    // The round once, alone: its later start, the diversity's, says
    // nothing, and no end is joined to it.
    expect(since.filter((said) => said.includes("Calculating the"))).toEqual([
      ROUND,
    ]);
    expect(
      since.filter((said) => said.includes("PCA of panel.nei calculated.")),
    ).toHaveLength(1);
  });

  test("PT2 D3 a Run of the diversity while the PCA runs: the line of waiting, said once; at the PCA's end its start and its end are said", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await recordAnnouncements(page);
    // Both results held, so that each start is said before its end,
    // which would otherwise replace it within the region's pause.
    await holdSummary(page, { holdPca: true, holdDiversity: true });
    await openPage(page);
    await pick(page, "panel.nei");
    await release(page, "allSoFar");
    await release(page, "result");
    await runPca(page, false);
    await tab(page, "Populations").click();
    await button(page, "Run").click();
    await expect(button(page, "Stop recalculating")).toBeFocused();
    await expect(
      shown(page).getByText(WAITS_FOR_PCA, { exact: true }),
    ).toBeVisible();
    await expect.poll(() => saidWith(page, WAITS_FOR_PCA)).toHaveLength(1);

    await release(page, "pca");
    await expect(button(page, "Stop")).toBeFocused({
      timeout: RESULT_TIMEOUT,
    });
    await expect
      .poll(() => saidWith(page, "Calculating the diversity of panel.nei."))
      .toHaveLength(1);
    await release(page, "diversity");
    await expect(table(page, CAPTION)).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expect(button(page, "Stop recalculating")).toBeFocused();
    await expect
      .poll(() => saidWith(page, "Diversity of panel.nei calculated."))
      .toHaveLength(1);
    expect(await saidWith(page, WAITS_FOR_PCA)).toHaveLength(1);
  });

  test("PT2 D3 a Run of the PCA while the diversity runs: the PCA tab's line of waiting for the diversity, said once; at the diversity's end the PCA's start is said; axe light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(120_000);
    await recordAnnouncements(page);
    await holdSummary(page, { holdDiversity: true, holdPca: true });
    await openPage(page);
    await pick(page, "panel.nei");
    await release(page, "allSoFar");
    await release(page, "result");
    await tab(page, "Populations").click();
    await expect(button(page, "Run")).toBeEnabled({ timeout: RESULT_TIMEOUT });
    await button(page, "Run").click();
    await expect(button(page, "Stop")).toBeVisible();

    await runPca(page, false);
    await expect(button(page, "Stop recalculating")).toBeFocused();
    await expect(
      shown(page).getByText(WAITS_FOR_DIVERSITY, { exact: true }),
    ).toBeVisible();
    await expect
      .poll(() => saidWith(page, WAITS_FOR_DIVERSITY))
      .toHaveLength(1);
    await expectNoAxeViolations(page, makeAxeBuilder);

    await release(page, "diversity");
    await expect
      .poll(() => saidWith(page, "Calculating the PCA of panel.nei."))
      .toHaveLength(1);
    await release(page, "pca");
    await expect(
      page.getByText(/^The place of each of the 200 individuals/u),
    ).toContainText("from 548 variants.", { timeout: RESULT_TIMEOUT });
    expect(await saidWith(page, WAITS_FOR_DIVERSITY)).toHaveLength(1);
  });

  test("PT2 D3 the diversity's Stop while it runs, and its crash, are said; the tab shows the line of a Stop, then the words of the failure; axe light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(120_000);
    await recordAnnouncements(page);
    await holdSummary(page, { holdDiversity: true });
    await openPage(page);
    await pick(page, "panel.nei");
    await release(page, "allSoFar");
    await release(page, "result");
    await tab(page, "Populations").click();
    await expect(button(page, "Run")).toBeEnabled({ timeout: RESULT_TIMEOUT });
    await button(page, "Run").click();
    await button(page, "Stop").click();
    await expect(button(page, "Run")).toBeFocused();
    await expect(
      shown(page).getByText(
        "Stopped: the diversity no longer starts by itself after a change. Run calculates it and starts it again after each change.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect
      .poll(() =>
        saidWith(
          page,
          "Diversity stopped. Press Run in the Populations tab to calculate it again.",
        ),
      )
      .toHaveLength(1);
    await expectNoAxeViolations(page, makeAxeBuilder);

    await workersListening(page);
    await button(page, "Run").click();
    await expect(button(page, "Stop")).toBeVisible();
    await release(page, "crash");
    const failed =
      "The calculation stopped unexpectedly. Run it again. If it stops again, open panel.nei again in the box Variants.";
    await expect(shown(page).getByText(failed, { exact: true })).toBeVisible({
      timeout: RESULT_TIMEOUT,
    });
    await expect
      .poll(() =>
        saidWith(
          page,
          `The diversity of panel.nei could not be calculated: ${failed}`,
        ),
      )
      .toHaveLength(1);
    await expectNoAxeViolations(page, makeAxeBuilder);
  });

  test("PT2 D3 a Run of the PCA that waits for the diversity, which crashes: the PCA tab offers Run beside Stop recalculating with the line of the hold, the status region says the PCA did not start, and Run starts it; axe light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(120_000);
    await recordAnnouncements(page);
    await holdSummary(page, { holdDiversity: true });
    await openPage(page);
    await pick(page, "panel.nei");
    await release(page, "allSoFar");
    await release(page, "result");
    await tab(page, "Populations").click();
    await expect(button(page, "Run")).toBeEnabled({ timeout: RESULT_TIMEOUT });
    await button(page, "Run").click();
    await expect(button(page, "Stop")).toBeVisible();
    await runPca(page, false);
    await expect(
      shown(page).getByText(
        "The PCA starts once the diversity, which is running, ends.",
        { exact: true },
      ),
    ).toBeVisible();

    await workersListening(page);
    await release(page, "crash");
    const held = shown(page).getByText(
      "The PCA starts after the next change of the filters or of its options, or when Run is pressed.",
      { exact: true },
    );
    await expect(held).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expect(button(page, "Run")).toBeEnabled();
    await expect(button(page, "Stop recalculating")).toBeEnabled();
    await expect
      .poll(() =>
        saidWith(
          page,
          "The PCA did not start: it starts after the next change of the filters or of its options, or when Run is pressed in the PCA tab.",
        ),
      )
      .toHaveLength(1);
    await expectNoAxeViolations(page, makeAxeBuilder);

    await button(page, "Run").click();
    await expect
      .poll(() => saidWith(page, "PCA of panel.nei calculated."), {
        timeout: RESULT_TIMEOUT,
      })
      .toHaveLength(1);
    await expect(held).toHaveCount(0);
  });

  test("PT2 D3 about to start after a change of the minimum: Stop recalculating, the line of the quiet second and no table; axe light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(120_000);
    await openPage(page);
    await pick(page, "panel.nei");
    await pickIndividuals(page, "panel_pops.csv");
    await runDiversity(page);
    const minimum = shown(page).getByRole("textbox", {
      name: /^Individuals with a called genotype needed in each population, per variant/u,
    });
    await minimum.fill("10");
    await minimum.press("Enter");
    // A key typed and not yet given holds the start, a change under way,
    // so that the quiet second lasts for the checks.
    await minimum.press("Backspace");
    const line = shown(page).getByText(
      "The diversity starts in a moment, later if the filters, its options or the populations change.",
      { exact: true },
    );
    await expect(line).toBeVisible();
    await expect(button(page, "Stop recalculating")).toBeVisible();
    await expect(table(page, CAPTION)).toHaveCount(0);
    await expectNoAxeViolations(page, makeAxeBuilder);
    await minimum.press("0");
    await minimum.press("Enter");
    await expect(table(page, CAPTION)).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expect(line).toHaveCount(0);
  });
});

/** The rows of counts 0 and 1 of p0's spectrum, as its CSV writes them,
    at the missing data of 0.1, which keeps the 1,200 variants of
    panel.nei: popnei 0.2.2 under node, `calcPopDiversity` with
    `numCalledAlleles` 40, `minNumIndividuals` 20 and `folded_sfs`, the
    command of docs/specs/analyses/sfs.md, "The numbers of popnei", whose
    table has the same values; the share is bin 1 over the sum of bins 1
    to 20. */
const P0_SPECTRUM_0 = "p0,0,44.79323144486922,";
const P0_SPECTRUM_1 = "p0,1,38.07795856907602,0.03296202862168288";

/** The button "Download…" of `what` in the tab shown. */
function menuButton(page: Page, what: string): Locator {
  return shown(page).getByRole("button", {
    name: `Download ${what}`,
    exact: true,
  });
}

/** Opens the menu of the focused button with Enter, goes down to `item`
    with the arrow keys, chooses it with Enter, and gives the file. */
async function chooseByKeys(
  page: Page,
  item: "Table as CSV" | "Image as SVG" | "Image as PNG" | "Data as CSV",
): Promise<Download> {
  const index = ["Table as CSV", "Image as SVG", "Image as PNG", "Data as CSV"]
    .filter((one) => item === "Table as CSV" || one !== "Table as CSV")
    .indexOf(item);
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  for (let at = 0; at < index; at += 1) await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: item })).toBeFocused();
  const download = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  return download;
}

/** The text of a downloaded file. */
async function textOf(download: Download): Promise<string> {
  return readFile(await download.path(), "utf8");
}

/** Whether the top of `below` is under the bottom of `above` on the
    page. */
async function isBelow(below: Locator, above: Locator): Promise<boolean> {
  const [top, bottom] = await Promise.all([
    below.boundingBox(),
    above.boundingBox(),
  ]);
  if (top === null || bottom === null) return false;
  return top.y >= bottom.y + bottom.height - 1;
}

test.describe("PT2 D3 the downloads of the Populations tab", () => {
  for (const width of [null, 320] as const) {
    test(`PT2 D3 the table, a histogram and the table of the spectrum saved by the keyboard alone and read back${width === null ? "" : `, at ${String(width)} px`}: each "Download…" of a table below it, each histogram's above it; axe with a menu open, light and dark`, async ({
      page,
      makeAxeBuilder,
    }) => {
      test.setTimeout(120_000);
      if (width !== null) await page.setViewportSize({ width, height: 900 });
      await recordAnnouncements(page);
      await openPage(page);
      await pick(page, "panel.nei");
      await pickIndividuals(page, "panel_pops.csv");
      await runDiversity(page);

      // The table of the diversity, its menu below it.
      const tableMenu = menuButton(page, "the table of the diversity");
      expect(await isBelow(tableMenu, table(page, CAPTION))).toBe(true);
      await tableMenu.focus();
      const tableFile = await chooseByKeys(page, "Table as CSV");
      expect(tableFile.suggestedFilename()).toBe("panel.diversity.csv");
      const lines = (await textOf(tableFile)).trimEnd().split("\n");
      expect(lines[0]).toBe(
        'Population,Individuals,Expected heterozygosity (unbiased),Observed heterozygosity,Proportion of polymorphic variants,F,Alleles per variant,"Alleles per variant, rarefied to 40 chromosomes",Private alleles,Private alleles per variant,"Private alleles per variant, rarefied to 40 chromosomes"',
      );
      expect(lines[1]).toMatch(/^p0,48,0\.35193160994408107,/u);
      await expect
        .poll(() => saidWith(page, "Saving panel.diversity.csv."))
        .toHaveLength(1);

      // The histogram of p0, its menu above its plot.
      const p0 = shown(page).getByRole("group", { name: "p0", exact: true });
      const p0Menu = menuButton(page, "the spectrum of p0");
      expect(await isBelow(p0.locator("svg.chart"), p0Menu)).toBe(true);
      await p0Menu.focus();
      const p0File = await chooseByKeys(page, "Data as CSV");
      expect(p0File.suggestedFilename()).toBe("panel.sfs.p0.csv");
      const p0Lines = (await textOf(p0File)).trimEnd().split("\n");
      expect(p0Lines.slice(0, 3)).toEqual([
        "population,rarer_allele,variants,share",
        P0_SPECTRUM_0,
        P0_SPECTRUM_1,
      ]);
      expect(p0Lines).toHaveLength(22);
      await p0Menu.focus();
      const p0Svg = await chooseByKeys(page, "Image as SVG");
      expect(p0Svg.suggestedFilename()).toBe("panel.sfs.p0.svg");

      // The table of the spectrum, by its tab, its menu below it.
      await shown(page).getByRole("tab", { name: "Histograms" }).focus();
      await page.keyboard.press("ArrowRight");
      await expect(
        shown(page).getByRole("tab", { name: "Table" }),
      ).toHaveAttribute("aria-selected", "true");
      const spectrumMenu = menuButton(page, "the table of the spectrum");
      expect(
        await isBelow(
          spectrumMenu,
          shown(page).getByRole("table", {
            name: "The folded site frequency spectrum of each population, as numbers",
          }),
        ),
      ).toBe(true);
      await spectrumMenu.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("menu")).toBeVisible();
      await expectNoAxeViolations(page, makeAxeBuilder);
      await page.keyboard.press("Escape");
      await expect(spectrumMenu).toBeFocused();
      const spectrumFile = await chooseByKeys(page, "Table as CSV");
      expect(spectrumFile.suggestedFilename()).toBe("panel.sfs.csv");
      const spectrumLines = (await textOf(spectrumFile)).trimEnd().split("\n");
      expect(spectrumLines[0]).toBe(
        'Copies of the rarer allele,"p0, variants","p0, share","p2, variants","p2, share","p1, variants","p1, share"',
      );
      expect(spectrumLines.slice(1, 3)).toEqual([
        "0,44.79323144486922,,48.34836722710054,,49.419228567305325,",
        "1,38.07795856907602,0.03296202862168288,49.07990431264654,0.042616971066566346,43.859352021499134,0.03811931601019699",
      ]);
      expect(spectrumLines).toHaveLength(22);
    });
  }

  test("PT2 D3 the files of the histograms of populations a/b and A?b are named with a_b and A_b_2, and hold their population's rows", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openPage(page);
    await pick(page, "panel.nei");
    const [header, ...rows] = panelPopsRows();
    // p0 renamed a/b and p1 renamed A?b: both give a_b as a part of a
    // file name, which macOS and Windows hold as one name in any case.
    await pickIndividuals(page, {
      name: "panel_slash.csv",
      text: [
        header ?? "",
        ...rows.map((line) =>
          line.replace(/,p0$/u, ",a/b").replace(/,p1$/u, ",A?b"),
        ),
        "",
      ].join("\n"),
    });
    await runDiversity(page);

    const slashMenu = menuButton(page, "the spectrum of a/b");
    await slashMenu.focus();
    const slashCsv = await chooseByKeys(page, "Data as CSV");
    expect(slashCsv.suggestedFilename()).toBe("panel.sfs.a_b.csv");
    expect((await textOf(slashCsv)).trimEnd().split("\n").slice(1, 3)).toEqual([
      P0_SPECTRUM_0.replace(/^p0,/u, "a/b,"),
      P0_SPECTRUM_1.replace(/^p0,/u, "a/b,"),
    ]);
    await slashMenu.focus();
    const slashPng = await chooseByKeys(page, "Image as PNG");
    expect(slashPng.suggestedFilename()).toBe("panel.sfs.a_b.png");

    const questionMenu = menuButton(page, "the spectrum of A?b");
    await questionMenu.focus();
    const questionSvg = await chooseByKeys(page, "Image as SVG");
    expect(questionSvg.suggestedFilename()).toBe("panel.sfs.A_b_2.svg");
    await questionMenu.focus();
    const questionCsv = await chooseByKeys(page, "Data as CSV");
    expect(questionCsv.suggestedFilename()).toBe("panel.sfs.A_b_2.csv");
    expect((await textOf(questionCsv)).trimEnd().split("\n")[2]).toBe(
      "A?b,1,43.859352021499134,0.03811931601019699",
    );
  });
});
