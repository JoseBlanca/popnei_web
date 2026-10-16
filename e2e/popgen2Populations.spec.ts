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
import { openParameters } from "./parameters.ts";
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

/** The elements of the page outside the part of the LD decay, which
    follows the diversity in the Populations tab with a Run and lines of
    its own (from 12 October 2026). */
function outsideLdDecay(page: Page): Locator {
  return page.locator(':not([data-panel-analysis="ldDecay"] *)');
}

/** The button of the tab shown named `name`, outside the part of the LD
    decay. */
function button(
  page: Page,
  name: "Run" | "Stop" | "Stop recalculating",
): Locator {
  return shown(page)
    .getByRole("button", { name, exact: true })
    .and(outsideLdDecay(page));
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
  await openParameters(shown(page));
  await expect(button(page, "Run")).toBeEnabled({ timeout: RESULT_TIMEOUT });
  await button(page, "Run").click();
  await expect(table(page, caption)).toBeVisible({ timeout: RESULT_TIMEOUT });
}

/** In the PCA tab, types the LD distance, 50000, waits for Run, and
    presses it; with `wait`, waits for its result, of 548 variants. */
async function runPca(page: Page, wait = true): Promise<void> {
  await tab(page, "PCA").click();
  await openParameters(shown(page));
  const distance = shown(page).getByRole("textbox", { name: DISTANCE });
  await expect(distance).toBeVisible({ timeout: RESULT_TIMEOUT });
  await distance.fill("50000");
  await distance.press("Enter");
  await expect(button(page, "Run")).toBeEnabled({ timeout: RESULT_TIMEOUT });
  await button(page, "Run").click();
  if (wait) {
    await expect(
      page.getByText(/^The place of each of the 200 individuals/u),
    ).toContainText("from 548 variants, after the LD pruning", {
      timeout: RESULT_TIMEOUT,
    });
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
      diversity(page).getByText(
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
      diversity(page).getByText(
        "7 unclassified individuals kept are left out, as the Individuals tab says.",
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
    await openParameters(shown(page));
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
    of the paste and its button. */
function populationControls(page: Page): readonly Locator[] {
  const box = individualsBox(page);
  return [
    box.getByRole("button", { name: /Column of the populations$/u }),
    box.getByRole("button", { name: "Paste an individuals file", exact: true }),
    box.getByRole("button", { name: "Open another individuals file…" }),
  ];
}

/** Remove, the first control of the Individuals tab shown, in the box
    until 16 October 2026. */
function removeButton(page: Page): Locator {
  return shown(page).getByRole("button", { name: "Remove panel_pops.csv" });
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

    // The options of the diversity, with the words of the filters; the
    // LD decay's, after them in the tab, are not its own.
    await openParameters(diversity(page));
    const options = diversity(page).getByRole("textbox");
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
    const [list, paste, open] = controls;
    if (list === undefined || paste === undefined || open === undefined) {
      throw new Error("the box has not its three controls");
    }
    // The mouse, left on Run, is off every control, whose tooltip it
    // would open.
    await page.mouse.move(0, 0);
    await list.focus();
    await expect(page.getByRole("tooltip")).toHaveText(POPULATIONS_LOCKED);
    for (const next of [paste, open]) {
      await page.keyboard.press("Tab");
      await expect(next).toBeFocused();
    }
    await expect(page.getByRole("tooltip")).toHaveText(POPULATIONS_LOCKED);

    // The list opens no popover; the button no picker.
    // Playwright waits for a control marked aria-disabled to be enabled
    // before it clicks; the user's click is not held so.
    await list.click({ force: true });
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(page.getByRole("tooltip")).toHaveText(POPULATIONS_LOCKED);
    expect(await opensNoPicker(page, open)).toBe(true);

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

    // Remove and the lists of the reader in the Individuals tab, each a
    // stop of the Tab key, Remove the first after the tab's label; Remove
    // removes nothing.
    await individualsTab(page).click();
    const remove = removeButton(page);
    for (const control of [remove, ...readerLists(page)]) {
      await expect(control).toHaveAttribute("aria-disabled", "true");
      await expect(control).toHaveAccessibleDescription(
        new RegExp(POPULATIONS_LOCKED.replaceAll(".", "\\."), "u"),
      );
    }
    await page.mouse.move(0, 0);
    await expect(individualsTab(page)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(remove).toBeFocused();
    await expect(page.getByRole("tooltip")).toHaveText(POPULATIONS_LOCKED);
    await page.keyboard.press("Tab");
    await expect(readerLists(page)[0] ?? remove).toBeFocused();
    await remove.click({ force: true });
    await expect(remove).toBeVisible();
    await expect(list).toContainText("popcat");
    await expectNoAxeViolations(page, makeAxeBuilder);

    // The PCA's options stay open.
    await tab(page, "PCA").click();
    await openParameters(shown(page));
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
    for (const control of [removeButton(page), ...readerLists(page)]) {
      await expect(control).not.toHaveAttribute("aria-disabled");
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
    // The list by its focus, and Remove, first in the Individuals tab,
    // by the Tab key from the tab's label, as a user of the keyboard
    // reaches them, which shows their tooltips.
    const [list] = populationControls(page);
    if (list === undefined) throw new Error("the box has no list");
    for (const control of [list, removeButton(page)]) {
      if (control === list) {
        await list.focus();
      } else {
        await individualsTab(page).click();
        await page.mouse.move(0, 0);
        await page.keyboard.press("Tab");
      }
      await expect(control).toBeFocused();
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
    for (const control of [removeButton(page), ...readerLists(page)]) {
      await expect(control).not.toHaveAttribute("aria-disabled");
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
    ).toContainText("from 548 variants, after the LD pruning", {
      timeout: RESULT_TIMEOUT,
    });
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

/** The row of p0 at one copy of the rarer allele of the CSV of the plot
    of the spectrum: the frequency of the commonest allele, 39 / 40, the
    expected number of variants, and the proportion, that number over the
    sum of p0's bins 1 to 20, its share: popnei 0.2.2 under node,
    12 October 2026, `calcPopDiversity` with `numCalledAlleles` 40,
    `minNumIndividuals` 20 and `folded_sfs`, the missing data at 0.1,
    which keeps the 1,200 variants of panel.nei. */
const P0_LINE_1 = "p0,1,0.975,38.07795856907602,0.03296202862168288";

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
    test(`PT2 D3 PT7 R1.2 the table, the plot and the table of the spectrum saved by the keyboard alone and read back${width === null ? "" : `, at ${String(width)} px`}: each "Download…" of a table below it, the plot's above it; axe with a menu open, light and dark`, async ({
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

      // The plot of the spectrum, its menu above it.
      const plotMenu = menuButton(page, "the plot of the spectrum");
      expect(
        await isBelow(shown(page).locator("svg.chart-line"), plotMenu),
      ).toBe(true);
      await plotMenu.focus();
      const plotCsv = await chooseByKeys(page, "Data as CSV");
      expect(plotCsv.suggestedFilename()).toBe("panel.sfs.proportions.csv");
      const plotLines = (await textOf(plotCsv)).trimEnd().split("\n");
      expect(plotLines.slice(0, 2)).toEqual([
        "population,rarer_allele,commonest_allele_frequency,variants,proportion",
        P0_LINE_1,
      ]);
      // 20 points for each of the 3 populations.
      expect(plotLines).toHaveLength(61);
      await plotMenu.focus();
      const plotSvg = await chooseByKeys(page, "Image as SVG");
      expect(plotSvg.suggestedFilename()).toBe("panel.sfs.svg");
      expect(await textOf(plotSvg)).toContain(
        "The spectrum of each population",
      );
      await plotMenu.focus();
      const plotPng = await chooseByKeys(page, "Image as PNG");
      expect(plotPng.suggestedFilename()).toBe("panel.sfs.png");

      // The table of the spectrum, by its tab, its menu below it.
      await shown(page).getByRole("tab", { name: "Plot" }).focus();
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
        'Copies of the rarer allele,"p0, variants","p0, proportion","p2, variants","p2, proportion","p1, variants","p1, proportion"',
      );
      expect(spectrumLines.slice(1, 3)).toEqual([
        "0,44.79323144486922,,48.34836722710054,,49.419228567305325,",
        "1,38.07795856907602,0.03296202862168288,49.07990431264654,0.042616971066566346,43.859352021499134,0.03811931601019699",
      ]);
      expect(spectrumLines).toHaveLength(22);
    });
  }

  for (const width of [null, 320] as const) {
    test(`PT7 R1.2 the spectrum as one plot of three lines, p0, p2 and p1 in its legend, its description, the caption's words of the variants left out and the variants in the draw under it${width === null ? "" : `, at ${String(width)} px with no sideways scroll`}`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      if (width !== null) await page.setViewportSize({ width, height: 900 });
      await openPage(page);
      await pick(page, "panel.nei");
      await pickIndividuals(page, "panel_pops.csv");
      await runDiversity(page);

      const plot = shown(page).locator("svg.chart-line");
      await expect(plot).toHaveCount(1);
      // No histogram of the old block.
      await expect(shown(page).locator("svg.chart-histogram")).toHaveCount(0);
      await expect(
        plot.locator(".chart-line:not(.chart-line-casing)"),
      ).toHaveCount(
        // A line per population in the frame, and a piece of each in
        // the legend.
        6,
      );
      await expect(plot.locator(".chart-legend-text")).toHaveText([
        "p0",
        "p2",
        "p1",
      ]);
      await expect(plot).toHaveAccessibleName(
        "The spectrum of each population 3 lines, one per population, p0, p2 and p1, of 20 points each, from 0.5 to 0.975 of the commonest allele; the largest proportion, 0.0562, of p1 at 0.625.",
      );
      await expect(
        shown(page).getByText(
          /Variants with no copy of the rarer allele in the draw are left out of the plot and of the proportions; the table holds them\./u,
        ),
      ).toBeVisible();
      await expect(
        shown(page).getByText(
          "Each proportion is over the population's variants with both alleles in the draw: p0, about 1,155; p2, about 1,152; p1, about 1,151.",
          { exact: true },
        ),
      ).toBeVisible();
      if (width !== null) {
        const sideways = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(sideways).toBe(0);
        const box = await plot.boundingBox();
        expect(box).not.toBeNull();
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
        await expect(plot.locator(".chart-legend")).toHaveAttribute(
          "data-place",
          "above",
        );
      }
    });
  }
});

/** The section of the bar plots of the table, in the tab shown. */
function barPlots(page: Page): Locator {
  return shown(page).getByRole("region", {
    name: "Bar plots of the table",
    exact: true,
  });
}

/** The headings of the five bar plots, in their order, the labels of
    the columns of the table, at the draw of 40. */
const BAR_HEADINGS = [
  "Expected heterozygosity (unbiased)",
  "Observed heterozygosity",
  "Proportion of polymorphic variants",
  "Alleles per variant, rarefied to 40 chromosomes",
  "Alleles per variant",
];

/** The text alternative of each bar plot of panel.nei with
    panel_pops.csv at the missing data of 0.1: popnei 0.2.2 under node,
    12 October 2026, p0, p2 and p1, as the table writes them. */
const BAR_NAMES = [
  "Expected heterozygosity (unbiased) 3 bars, one per population: p0, 0.3519; p2, 0.3449; p1, 0.3504.",
  "Observed heterozygosity 3 bars, one per population: p0, 0.3564; p2, 0.3512; p1, 0.3567.",
  "Proportion of polymorphic variants 3 bars, one per population: p0, 0.9267; p2, 0.9108; p1, 0.9175.",
  "Alleles per variant, rarefied to 40 chromosomes 3 bars, one per population: p0, 1.9627; p2, 1.9597; p1, 1.9588.",
  "Alleles per variant 3 bars, one per population: p0, 1.9775; p2, 1.9867; p1, 1.9808.",
];

test.describe("PT7 R1.1 the bar plots of the table", () => {
  for (const width of [null, 320] as const) {
    test(`PT7 R1.1 five bar plots under the table, in their order, each of p0, p2 and p1 with its text alternative; the first's Download… above it, its CSV and its SVG read back${width === null ? ", two plots to a row" : `, at ${String(width)} px one to a row with no sideways scroll`}`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      if (width !== null) await page.setViewportSize({ width, height: 900 });
      await openPage(page);
      await pick(page, "panel.nei");
      await pickIndividuals(page, "panel_pops.csv");
      await runDiversity(page);

      const section = barPlots(page);
      expect(await isBelow(section, table(page, CAPTION))).toBe(true);
      await expect(
        section.getByText(
          'One bar per population, in the order of the table. Each population has the colour and the mark of its line in the plot of the spectrum, so that it can be followed from plot to plot. A population with no value in the table has the words "no value" in place of its bar.',
          { exact: true },
        ),
      ).toBeVisible();
      await expect(section.getByRole("heading", { level: 4 })).toHaveText(
        BAR_HEADINGS,
      );
      const plots = section.locator("svg.chart-bars");
      await expect(plots).toHaveCount(5);
      for (const [index, name] of BAR_NAMES.entries()) {
        await expect(plots.nth(index)).toHaveAccessibleName(name);
        await expect(
          plots.nth(index).locator("g.chart-axis-y g.tick text"),
        ).toHaveText(["p0", "p2", "p1"]);
        await expect(
          plots.nth(index).locator("rect.chart-bars-bar"),
        ).toHaveCount(3);
      }
      // The bars of p0, p2 and p1 in the colours of their places.
      await expect(plots.first().locator("rect.chart-bars-bar")).toHaveClass([
        /chart-colour-0/u,
        /chart-colour-1/u,
        /chart-colour-2/u,
      ]);

      const menu = menuButton(
        page,
        "the bar plot of expected heterozygosity (unbiased)",
      );
      expect(await isBelow(plots.first(), menu)).toBe(true);
      await menu.focus();
      const csv = await chooseByKeys(page, "Data as CSV");
      expect(csv.suggestedFilename()).toBe(
        "panel.diversity.expected_heterozygosity_unbiased.csv",
      );
      expect((await textOf(csv)).trimEnd().split("\n")).toEqual([
        "Population,Expected heterozygosity (unbiased)",
        "p0,0.35193160994408107",
        "p2,0.344856554637815",
        "p1,0.35038890489752544",
      ]);
      await menu.focus();
      const svg = await chooseByKeys(page, "Image as SVG");
      expect(svg.suggestedFilename()).toBe(
        "panel.diversity.expected_heterozygosity_unbiased.svg",
      );
      expect(await textOf(svg)).toContain("<title id=");
      expect(await textOf(svg)).toContain(
        ">Expected heterozygosity (unbiased)</title>",
      );

      const tops = await Promise.all(
        [0, 1, 2, 3, 4].map(
          async (index) => (await plots.nth(index).boundingBox())?.y ?? -1,
        ),
      );
      if (width === null) {
        // Two plots to a row in the column of the tab, about 735 pixels
        // wide: the first two side by side, the third under them.
        expect(tops[1]).toBe(tops[0]);
        expect(tops[2]).toBeGreaterThan(tops[1] ?? 0);
        expect(tops[4]).toBeGreaterThan(tops[3] ?? 0);
      } else {
        for (let index = 1; index < 5; index += 1) {
          expect(tops[index]).toBeGreaterThan(tops[index - 1] ?? 0);
        }
        const sideways = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(sideways).toBe(0);
        for (let index = 0; index < 5; index += 1) {
          const box = await plots.nth(index).boundingBox();
          expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
        }
      }
    });
  }

  test("review of round 1: from a dark page, the SVG of a bar plot is in the light theme: the axis and its names in the light theme's colour, the bar of p0 orange with its outline, no colour of the dark theme and no var(", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme: "dark" });
    await openPage(page);
    await pick(page, "panel.nei");
    await pickIndividuals(page, "panel_pops.csv");
    await runDiversity(page);
    const plot = barPlots(page).locator("svg.chart-bars").first();
    // The page is dark: the axis on the screen is in the dark theme. The
    // colours here are the values of tokens.css, those of the look of 16
    // October 2026 (docs/plans/visual-design.md): --chart-axis #a0acb9
    // dark and #47525e light, the text #e8edf3 dark, the background
    // #121821 and the panel #19212c dark.
    expect(
      await plot
        .locator("g.chart-axis-x path.domain")
        .evaluate((path) => getComputedStyle(path).stroke),
    ).toBe("rgb(160, 172, 185)");
    const menu = menuButton(
      page,
      "the bar plot of expected heterozygosity (unbiased)",
    );
    await menu.focus();
    const text = await textOf(await chooseByKeys(page, "Image as SVG"));
    expect(text).not.toContain("var(");
    // The colours of the dark theme that the light one does not have:
    // its text, background, panel and axis (sky blue, the bar of p1, is
    // the same in both).
    for (const dark of [
      "rgb(232, 237, 243)",
      "rgb(18, 24, 33)",
      "rgb(25, 33, 44)",
      "rgb(160, 172, 185)",
    ]) {
      expect(text).not.toContain(dark);
    }
    const found = await page.evaluate((svg) => {
      const root = new DOMParser().parseFromString(
        svg,
        "image/svg+xml",
      ).documentElement;
      const styleOf = (each: Element | null, property: string): string =>
        (each?.getAttribute("style") ?? "")
          .split(";")
          .map((declaration) => declaration.trim())
          .filter((declaration) => declaration.startsWith(`${property}:`))
          .map((declaration) => declaration.slice(property.length + 1).trim())
          .join("");
      const bar = root.querySelector("rect.chart-bars-bar");
      return {
        axis: styleOf(
          root.querySelector("g.chart-axis-x path.domain"),
          "stroke",
        ),
        name: styleOf(root.querySelector("g.chart-axis-y g.tick text"), "fill"),
        bar: [styleOf(bar, "fill"), styleOf(bar, "stroke")],
      };
    }, text);
    expect(found).toEqual({
      axis: "rgb(71, 82, 94)",
      // The names in the colour of the axes of the light theme.
      name: "rgb(71, 82, 94)",
      bar: ["rgb(230, 159, 0)", "rgb(71, 82, 94)"],
    });
  });

  test("PT7 R1.1 the minimum of individuals at 50, where p0's 48 give it no value: no value in p0's row of each plot, in place of its bar, and two bars", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openPage(page);
    await pick(page, "panel.nei");
    await pickIndividuals(page, "panel_pops.csv");
    await tab(page, "Populations").click();
    await openParameters(shown(page));
    const minimum = shown(page).getByRole("textbox", {
      name: /^Individuals with a called genotype needed in each population, per variant/u,
    });
    await minimum.fill("50");
    await minimum.press("Enter");
    await runDiversity(page);
    await expect(row(page, "p0").nth(1)).toHaveText("no value");

    const plots = barPlots(page).locator("svg.chart-bars");
    await expect(plots).toHaveCount(5);
    for (let index = 0; index < 5; index += 1) {
      const plot = plots.nth(index);
      await expect(plot.locator("text.chart-bars-none")).toHaveText([
        "no value",
      ]);
      await expect(plot.locator("rect.chart-bars-bar")).toHaveCount(2);
      await expect(plot).toHaveAccessibleName(/: p0, no value; p2, /u);
    }
  });

  test("PT7 R1.1 no individuals file: five plots of one bar each, of Unclassified", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openPage(page);
    await pick(page, "panel.nei");
    await runDiversity(page);
    const plots = barPlots(page).locator("svg.chart-bars");
    await expect(plots).toHaveCount(5);
    for (let index = 0; index < 5; index += 1) {
      await expect(plots.nth(index).locator("rect.chart-bars-bar")).toHaveCount(
        1,
      );
      await expect(
        plots.nth(index).locator("g.chart-axis-y g.tick text"),
      ).toHaveText(["Unclassified"]);
    }
    await expect(plots.first()).toHaveAccessibleName(
      "Expected heterozygosity (unbiased) 1 bar, of Unclassified: 0.3755.",
    );
  });
});

/** A name of 46 characters, as long as names of the user's files get. */
const LONG_NAME = "Accessions_from_Galapagos_and_Ecuador_mainland";

/** panel_pops.csv with the population p1 named `name`. */
function renamedP1(name: string): Made {
  return {
    name: "panel_pops_renamed.csv",
    text: `${panelPopsRows()
      .map((line) => line.replace(/,p1$/u, `,${name}`))
      .join("\n")}\n`,
  };
}

/** Twenty populations of ten individuals each, of names long, wide,
    short and alike in their first characters, the most the tab lists. */
const TWENTY_NAMES = [
  "Landrace_Mediterranean_Valencia",
  "WILD_ANCESTOR_ECUADOR_NORTH",
  "p3",
  "Cultivar Group Alpha 2024",
  "MMMMMMMMMMMMMMMMMMMMMMMM",
  "Heirloom_collection_Peru_B",
  "short",
  "Traditional_variety_Spain_1",
  "WWWWWWWWWWWWWWWWWWWWWWWWW",
  "Breeding_line_set_number_10",
  "Pop11",
  "Accessions_from_Galapagos",
  "Modern_hybrid_greenhouse_x",
  "Pop14",
  "Andean_highland_population",
  "Coastal_lowland_population",
  "Pop17",
  "Landrace_Valencia_coast",
  "Landrace_Valencia_inland",
  "Pop20",
];

/** The individuals file of the 200 individuals of panel.nei in the
    twenty populations of TWENTY_NAMES, ten each in order. */
function twentyPopulations(): Made {
  const [header, ...rows] = panelPopsRows();
  return {
    name: "panel_twenty.csv",
    text: `${[
      header,
      ...rows.map((line, index) => {
        const [individual] = line.split(",");
        return `${individual ?? ""},${TWENTY_NAMES[Math.floor(index / 10)] ?? ""}`;
      }),
    ].join("\n")}\n`,
  };
}

/** Opens panel.nei with the twenty populations, sets the minimum of
    individuals to 8, since each population has 10, and runs the
    diversity; waits for the five bar plots. */
async function runTwenty(page: Page): Promise<void> {
  await openPage(page);
  await pick(page, "panel.nei");
  await pickIndividuals(page, twentyPopulations());
  await tab(page, "Populations").click();
  await openParameters(shown(page));
  const minimum = shown(page).getByRole("textbox", {
    name: /^Individuals with a called genotype needed in each population, per variant/u,
  });
  await minimum.fill("8");
  await minimum.press("Enter");
  await expect(button(page, "Run")).toBeEnabled({ timeout: RESULT_TIMEOUT });
  await button(page, "Run").click();
  await expect(shown(page).locator("svg.chart-bars")).toHaveCount(5, {
    timeout: RESULT_TIMEOUT,
  });
}

/** The texts of the plots of the tab shown that `selector` picks and
    that pass an edge of their SVG, each with its box. */
async function textsOutside(page: Page, selector: string): Promise<string[]> {
  return shown(page)
    .locator("svg.chart-bars, svg.chart-line")
    .evaluateAll((svgs, picked) => {
      const outside: string[] = [];
      for (const svg of svgs) {
        const plot = svg.getBoundingClientRect();
        for (const text of svg.querySelectorAll(picked)) {
          const box = text.getBoundingClientRect();
          if (box.width === 0) continue;
          if (
            box.left < plot.left - 0.5 ||
            box.right > plot.right + 0.5 ||
            box.top < plot.top - 0.5 ||
            box.bottom > plot.bottom + 0.5
          ) {
            outside.push(
              `${text.textContent} [${String(Math.round(box.left))}, ${String(Math.round(box.right))}] in [${String(Math.round(plot.left))}, ${String(Math.round(plot.right))}]`,
            );
          }
        }
      }
      return outside;
    }, selector);
}

/** Of each plot of the tab shown, the label of the vertical axis that
    passes an edge of its SVG, or that comes nearer than 4 pixels to the
    labels of the ticks of that axis, with its box. */
async function yLabelsCramped(page: Page): Promise<string[]> {
  return shown(page)
    .locator("svg.chart-line")
    .evaluateAll((svgs) => {
      const cramped: string[] = [];
      for (const svg of svgs) {
        const plot = svg.getBoundingClientRect();
        const label = svg.querySelector(".chart-axis-label-y");
        if (label === null) continue;
        const box = label.getBoundingClientRect();
        const ticks = [
          ...svg.querySelectorAll(".chart-axis-y g.tick text"),
        ].map((tick) => tick.getBoundingClientRect().left);
        const nearest = Math.min(...ticks);
        if (
          box.left < plot.left - 0.5 ||
          box.top < plot.top - 0.5 ||
          box.bottom > plot.bottom + 0.5 ||
          box.right > nearest - 4
        ) {
          cramped.push(
            `${label.textContent}: [${String(Math.round(box.left))}, ${String(Math.round(box.right))}] x [${String(Math.round(box.top))}, ${String(Math.round(box.bottom))}] in [${String(Math.round(plot.left))}, ${String(Math.round(plot.top))}, ${String(Math.round(plot.bottom))}], ticks from ${String(Math.round(nearest))}`,
          );
        }
      }
      return cramped;
    });
}

test.describe("review of round 1: the label up the plot of the spectrum", () => {
  for (const width of [1280, 320] as const) {
    for (const many of [false, true] as const) {
      test(`${many ? "twenty populations" : "panel_pops.csv"} at ${String(width)} px: the label up the plot of the spectrum within its SVG and 4 px or more from the numbers of its axis`, async ({
        page,
      }) => {
        test.setTimeout(120_000);
        await page.setViewportSize({ width, height: 900 });
        if (many) {
          await runTwenty(page);
        } else {
          await openPage(page);
          await pick(page, "panel.nei");
          await pickIndividuals(page, "panel_pops.csv");
          await runDiversity(page);
        }
        await expect(shown(page).locator("svg.chart-line")).toHaveCount(1);
        expect(await yLabelsCramped(page)).toEqual([]);
      });
    }
  }
});

test.describe("review of round 1: long names of populations", () => {
  test("twenty populations: in each bar plot the mark beside a population's name is the mark of its line in the legend of the spectrum, its symbol and its colour, twenty marks apart", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await runTwenty(page);
    const legend = await shown(page)
      .locator("svg.chart-line g.chart-legend-row path.chart-points")
      .evaluateAll((paths) =>
        paths.map(
          (path) =>
            `${path.getAttribute("d") ?? ""} ${
              [...path.classList].find((name) =>
                name.startsWith("chart-colour-"),
              ) ?? ""
            }`,
        ),
      );
    expect(legend).toHaveLength(20);
    expect(new Set(legend).size).toBe(20);
    const plots = shown(page).locator("svg.chart-bars");
    for (let index = 0; index < 5; index += 1) {
      const marks = await plots
        .nth(index)
        .locator("path.chart-bars-mark")
        .evaluateAll((paths) =>
          paths.map(
            (path) =>
              `${path.getAttribute("d") ?? ""} ${
                [...path.classList].find((name) =>
                  name.startsWith("chart-colour-"),
                ) ?? ""
              }`,
          ),
        );
      expect(marks).toEqual(legend);
    }
  });

  test("twenty populations at 320 px: Landrace_Valencia_coast and Landrace_Valencia_inland cut in the middle, their starts and their ends, two names apart in each bar plot", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 320, height: 900 });
    await runTwenty(page);
    const plots = shown(page).locator("svg.chart-bars");
    for (let index = 0; index < 5; index += 1) {
      const names = plots.nth(index).locator("g.chart-axis-y g.tick text");
      await expect(names).toHaveCount(20);
      await expect(names.nth(17)).toHaveText(/^Landr\S*…\S*coast$/u);
      await expect(names.nth(18)).toHaveText(/^Landr\S*…\S*nland$/u);
    }
  });

  for (const width of [1280, 720, 320] as const) {
    test(`twenty populations of long and wide names at ${String(width)} px: every name of the bar plots and every label of the legend of the spectrum within its SVG`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 900 });
      await runTwenty(page);
      expect(
        await textsOutside(
          page,
          "g.chart-axis-y g.tick text, .chart-legend-text",
        ),
      ).toEqual([]);
    });
  }

  test("a population named with 46 characters at 320 px: no sideways scroll, and the plot of the spectrum 288 px wide", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 320, height: 900 });
    await openPage(page);
    await pick(page, "panel.nei");
    await pickIndividuals(page, renamedP1(LONG_NAME));
    await runDiversity(page);
    const plot = shown(page).locator("svg.chart-line");
    await expect(plot).toHaveCount(1);
    await expect(
      shown(page).getByText(new RegExp(`${LONG_NAME}, about`, "u")),
    ).toBeVisible();
    const sideways = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(sideways).toBe(0);
    // The column's whole width at 320 px, 320 less the page's 16 px on
    // each side: on a narrow window the panel of the tab runs to the
    // window's edges with no border at its sides and the page's 16 px
    // inside, so that the plot keeps the width it had before the look of
    // 16 October 2026 and its words do not touch the panel's sides
    // (Tabs.module.css, the panel on a narrow window).
    expect((await plot.boundingBox())?.width).toBe(288);
  });
});

/** Of the PNG at `file`, the pixels of its 2 leftmost and 2 rightmost
    columns that are not the colour of its top-left corner, the
    background: a name or a label that passes an edge of the image. */
async function inkAtEdges(page: Page, file: string): Promise<string[]> {
  const base64 = (await readFile(file)).toString("base64");
  return page.evaluate(async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("No 2D context.");
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    const colourAt = (x: number, y: number): string =>
      [
        ...pixels.subarray(
          (y * image.width + x) * 4,
          (y * image.width + x) * 4 + 4,
        ),
      ].join(",");
    const background = colourAt(0, 0);
    const found: string[] = [];
    for (const x of [0, 1, image.width - 2, image.width - 1]) {
      for (let y = 0; y < image.height; y += 1) {
        if (colourAt(x, y) !== background) {
          found.push(
            `(${String(x)}, ${String(y)}) of ${String(image.width)} by ${String(image.height)}`,
          );
        }
      }
    }
    return found;
  }, base64);
}

test.describe("second review of round 1: the names and the legend inside the PNG", () => {
  for (const width of [1280, 320] as const) {
    test(`twenty populations of long and wide names at ${String(width)} px: the PNG of a bar plot and of the plot of the spectrum have nothing but the background in their 2 leftmost and 2 rightmost columns`, async ({
      page,
    }) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width, height: 900 });
      await runTwenty(page);
      const buttons = shown(page).getByRole("button", {
        name: /^Download the (bar plot of|plot of the spectrum)/u,
      });
      const names = await buttons.evaluateAll((all) =>
        all.map((one) => one.getAttribute("aria-label") ?? ""),
      );
      const picked = [
        names.findIndex((name) => name.startsWith("Download the bar plot of")),
        names.indexOf("Download the plot of the spectrum"),
      ];
      expect(picked).not.toContain(-1);
      for (const index of picked) {
        await buttons.nth(index).scrollIntoViewIfNeeded();
        await buttons.nth(index).click();
        const download = page.waitForEvent("download");
        await page.getByRole("menuitem", { name: "Image as PNG" }).click();
        const file = await (await download).path();
        expect(await inkAtEdges(page, file), names[index]).toEqual([]);
      }
    });
  }
});
