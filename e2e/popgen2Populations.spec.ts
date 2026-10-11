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
import { join } from "node:path";

import type AxeBuilder from "@axe-core/playwright";
import type { Locator, Page, Route } from "@playwright/test";

import { expect, test } from "./axe.ts";
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
const ONE_POPULATION_OF_COLUMN = `${ONE_POPULATION} If the individuals belong to several populations, the expected heterozygosity and F are those of their mixture, and F comes out higher than within the populations.`;

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
      "The Populations tab could not be loaded. If the connection works, the site may have been updated since this page was opened: try again, or reload the page and open panel.nei again.";
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
});

// PT1 D7: the flows of the lock of the filters and of the download's
// wait while the diversity runs (task 1.6 of docs/plans/
// population-tab.md) go below this line.

/** The words of the lock of the thresholds while the diversity runs,
    alone, and with the PCA live beside it. */
const LOCKED_DIVERSITY =
  "Stop the diversity in the Populations tab to change the filters; then press Run there to calculate it again.";
const LOCKED_DIVERSITY_PCA_LIVE =
  "Stop the diversity in the Populations tab and the PCA in the PCA tab to change the filters; then press Run in each tab to calculate them again.";

/** The words of the lock of the thresholds while the PCA runs with the
    diversity live beside it. */
const LOCKED_PCA_DIVERSITY_LIVE =
  "Stop the PCA in the PCA tab and the diversity in the Populations tab to change the filters; then press Run in each tab to calculate them again.";

/** The words of the download's wait. */
const WAITS_DIVERSITY =
  "Waits for the diversity to end; or stop it in the Populations tab.";
const WAITS_DIVERSITY_THEN_PCA =
  "Waits for the diversity, and the PCA after it, to end; or stop the diversity in the Populations tab and the PCA in the PCA tab.";
const WAITS_PCA_THEN_DIVERSITY =
  "Waits for the PCA, and the diversity after it, to end; or stop the PCA in the PCA tab and the diversity in the Populations tab.";

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
