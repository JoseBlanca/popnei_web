/**
 * The PCA tab of popgen2.html up to its run, on the built site
 * (docs/plans/analyses-pca.md, work package 6, task 6.3;
 * docs/specs/steps/popgen2-pca.md, "The PCA tab", "While a PCA runs",
 * "The states" and "How it is checked", In Playwright): Run locked while
 * the one pass is held by holdWorker.ts, then by the LD pruning with no
 * distance, and free once a distance is typed; a PCA held running, the
 * bar moving, with the thresholds, the FILTER box and the PCA's options
 * greyed, `aria-disabled`, reached by the Tab key and refusing a press, a
 * key and a drag; Undo greyed and Ctrl+Z doing nothing; the column of the
 * populations left open; another variants file opened, which stops the
 * PCA; the download of the filtered variants waiting with its words; the
 * end of a run said in the status region while the Variants tab is
 * shown; the reason of the tab in place of its options while another
 * file is opened; and axe in each state of the tab, light and dark.
 *
 * And its result (task 6.4): the numbers of popnei 0.2.2 on the plot,
 * the explained variance and the table, for the PCA, its filters made
 * stricter, the LD pruning off and the PCoA; the legend with
 * "Unclassified" and the populations of panel_pops.csv with no request;
 * an Undo that brings the result back with no request, and Ctrl+Z with a
 * menu open; the menus of the plot and the tables, chosen with the
 * keyboard and read back; the 3D view turned, hidden with its tab and
 * shown again, and drawn when its run ended while its tab was hidden.
 *
 * panel.nei and panel.vcf.gz hold 1,200 variants of 200 diploid
 * individuals, s000 to s199; panel.vcf.gz records the FILTER of its
 * variants, so its box is drawn; panel_pops.csv puts the individuals in
 * p0, p2 and p1.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Download, Locator, Page } from "@playwright/test";

import { announced, recordAnnouncements } from "./announced.ts";
import { expect, test } from "./axe.ts";
import { holdSummary, release } from "./holdWorker.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The reason every control a running PCA reads waits with. */
const LOCKED = "Stop the PCA to change the filters.";

/** The words of Run locked by the one pass while it runs. */
const READING =
  "Run once panel.nei is read to the end: the reading under way in the box Variants file and the PCA cannot run at once.";

/** The words of Run locked by the LD pruning with no distance. */
const NO_DISTANCE =
  "The LD pruning of the PCA needs the distance within which variants are compared. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs, or turn the LD pruning off.";

/** The label of the field of the distance. */
const DISTANCE =
  "Distance within which variants are compared, in base pairs, from 1";

/** The words of the button of the download while a PCA runs. */
const DOWNLOAD_WAITS_PCA =
  "Waits for the PCA to end; or stop it in the PCA tab.";

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

/** axe on the page as it is, in the light and the dark theme. */
async function expectAxeBothSchemes(
  page: Page,
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  for (const scheme of ["light", "dark"] as const) {
    // No transition of the colours, which axe would read halfway.
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await expectNoViolations(makeAxeBuilder);
  }
}

/** Picks the variants file `name`, a fixture, with the open button. */
async function pick(page: Page, name: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: /^Open (another )?variants file…$/u })
    .click();
  await (await chooser).setFiles(join(FIXTURES, name));
}

/** The box of the individuals file. */
function individualsBox(page: Page): Locator {
  return page.getByRole("region", { name: "Individuals file", exact: true });
}

/** Opens the individuals file `name`, a fixture, with the button of its
    box. */
async function pickIndividuals(page: Page, name: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await individualsBox(page)
    .getByRole("button", { name: /^Open (another )?individuals file…$/u })
    .click();
  await (await chooser).setFiles(join(FIXTURES, name));
}

/** The label of the tab `name`. */
function tab(page: Page, name: "Variants" | "PCA"): Locator {
  return page
    .getByRole("tablist", { name: "Files and analyses" })
    .getByRole("tab", { name, exact: true });
}

/** The panel of the tab shown. */
function shown(page: Page): Locator {
  return page.getByRole("tabpanel");
}

/** Run of the PCA tab. */
function run(page: Page): Locator {
  return shown(page).getByRole("button", { name: "Run", exact: true });
}

/** Stop of the PCA tab. */
function stop(page: Page): Locator {
  return shown(page).getByRole("button", { name: "Stop", exact: true });
}

/** The field of the distance of the LD pruning. */
function distance(page: Page): Locator {
  return shown(page).getByRole("textbox", { name: DISTANCE });
}

/** The group of radio buttons named `name` in the PCA tab. */
function group(page: Page, name: string): Locator {
  return shown(page).getByRole("radiogroup", { name, exact: true });
}

/** The section of the statistics of the file, in the Variants tab. */
function stats(page: Page): Locator {
  return page.getByRole("region", { name: "Statistics of the file" });
}

/** The histogram of the variants titled `title`, its box and its
    line. */
function histogram(
  page: Page,
  title: string,
): { readonly box: Locator; readonly slider: Locator } {
  const block = stats(page).getByRole("group", { name: title, exact: true });
  return { box: block.getByRole("textbox"), slider: block.getByRole("slider") };
}

/** The button of the download of the filtered variants. */
function downloadButton(page: Page): Locator {
  return stats(page).getByRole("button", {
    name: "Download filtered variants…",
    exact: true,
  });
}

/** Opens popgen2.html with the one pass and each PCA held, `file` open,
    the pass released to its end, and the PCA tab shown. */
async function openHeld(page: Page, file: string): Promise<void> {
  await holdSummary(page, { holdPca: true });
  await page.goto("popgen2.html");
  await pick(page, file);
  await release(page, "allSoFar");
  await release(page, "result");
  await tab(page, "PCA").click();
  await expect(run(page)).toHaveAccessibleDescription(NO_DISTANCE, {
    timeout: 30_000,
  });
}

/** Types the distance of the LD pruning and gives it with Enter. */
async function typeDistance(page: Page, value: string): Promise<void> {
  await distance(page).fill(value);
  await distance(page).press("Enter");
  await expect(run(page)).toBeEnabled();
}

/** Presses Run and waits for the PCA held running, its bar past 0, so
    that it is calculated in the worker and not waiting in its queue. */
async function runHeld(page: Page): Promise<void> {
  await run(page).click();
  await expect(stop(page)).toBeVisible();
  await expect(
    shown(page).getByRole("progressbar", { name: "Calculating the PCA" }),
  ).toHaveAttribute("aria-valuenow", /^[1-9]\d*$/u, { timeout: 30_000 });
}

/** Expects `control` to wait with the reason of the lock: marked
    `aria-disabled`, its tooltip shown when the Tab key reaches it. */
async function expectWaiting(page: Page, control: Locator): Promise<void> {
  await expect(control).toHaveAttribute("aria-disabled", "true");
  // Out and back by the keyboard, which is what shows a tooltip. Between
  // two fields that wait, the tooltip of the field reached did not show
  // once in 13 runs of Chromium 153, the one left closing after it; so
  // the move is made again until it shows.
  await expect(async () => {
    await control.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(control).toBeFocused();
    await expect(page.getByRole("tooltip")).toHaveText(LOCKED, {
      timeout: 1_000,
    });
  }).toPass({ timeout: 10_000 });
  await page.keyboard.press("Escape");
}

test("AP6 D3 the PCA tab opened during the one pass, held: Run disabled with the reading under way; after it, with the reason of the LD pruning with no distance; a distance typed, Run; axe light and dark in each", async ({
  page,
  makeAxeBuilder,
}) => {
  await holdSummary(page);
  await page.goto("popgen2.html");
  await pick(page, "panel.nei");
  await tab(page, "PCA").click();
  await expect(
    shown(page).getByRole("heading", { level: 2, name: "PCA" }),
  ).toBeVisible();
  await expect(run(page)).toBeDisabled();
  await expect(run(page)).toHaveAccessibleDescription(READING);
  await expect(
    shown(page).getByText("200 individuals of panel.nei", { exact: true }),
  ).toBeVisible();
  await expectAxeBothSchemes(page, makeAxeBuilder);

  await release(page, "allSoFar");
  await release(page, "result");
  await expect(run(page)).toHaveAccessibleDescription(NO_DISTANCE, {
    timeout: 30_000,
  });
  await expect(run(page)).toBeDisabled();
  await expect(distance(page)).toHaveAccessibleDescription(
    new RegExp(`^${NO_DISTANCE.replace(/[.()]/gu, "\\$&")}`, "u"),
  );

  await typeDistance(page, "50000");
  await expect(run(page)).toHaveAccessibleDescription("");
  await expectAxeBothSchemes(page, makeAxeBuilder);
});

test("AP6 D3 a PCA held running: the bar moves; the PCA's options, the thresholds and the FILTER box greyed, aria-disabled, reached by the Tab key with their reason; a press, a key or a drag changes nothing; axe light and dark; all back after Stop", async ({
  page,
  makeAxeBuilder,
}) => {
  test.setTimeout(90_000);
  await openHeld(page, "panel.vcf.gz");
  await typeDistance(page, "50000");
  await runHeld(page);
  await expectAxeBothSchemes(page, makeAxeBuilder);

  // The PCA's own options.
  const method = group(page, "Method");
  const pcaRadio = method.getByRole("radio", { name: "PCA of the genotypes" });
  const missing = group(page, "Filter the variants by missing data");
  const ld = shown(page).getByRole("switch", {
    name: "Prune the variants by linkage disequilibrium (LD)",
  });
  for (const control of [
    pcaRadio,
    missing.getByRole("radio", { name: "As in the Variants tab: 0.1" }),
    ld,
    distance(page),
  ]) {
    await expect(control).toHaveAttribute("aria-disabled", "true");
  }
  await expect(method).toHaveAccessibleDescription(LOCKED);
  await expect(ld).toHaveAccessibleDescription(new RegExp(LOCKED, "u"));
  await expect(distance(page)).toHaveAccessibleDescription(
    new RegExp(LOCKED, "u"),
  );
  await expectWaiting(page, distance(page));
  await expectWaiting(page, ld);

  // Pressed though they say they wait, as a user may: Playwright would
  // not press a control marked aria-disabled.
  await method
    .locator("label")
    .filter({ hasText: "PCoA" })
    .click({ force: true });
  await expect(pcaRadio).toBeChecked();
  await missing
    .locator("label")
    .filter({ hasText: "Stricter for the PCA" })
    .click({ force: true });
  await expect(
    missing.getByRole("radio", { name: "As in the Variants tab: 0.1" }),
  ).toBeChecked();
  await shown(page)
    .locator("label")
    .filter({ hasText: "Prune the variants by linkage disequilibrium (LD)" })
    .click({ force: true });
  await expect(ld).toBeChecked();
  await distance(page).focus();
  await page.keyboard.press("End");
  await page.keyboard.type("5");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(distance(page)).toHaveValue("50000");
  await expect(stop(page)).toBeVisible();

  // The thresholds and the FILTER box of the Variants tab.
  await tab(page, "Variants").click();
  const rate = histogram(page, "Proportion of missing genotypes");
  await expect(rate.box).toHaveAttribute("aria-disabled", "true");
  await expect(rate.slider).toHaveAttribute("aria-disabled", "true");
  await expect(rate.box).toHaveAccessibleDescription(new RegExp(LOCKED, "u"));
  await expectWaiting(page, rate.box);
  await expectWaiting(page, rate.slider);
  const before = await rate.slider.inputValue();
  await rate.box.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.type("2");
  await page.keyboard.press("Enter");
  await expect(rate.box).toHaveValue("0.1");
  await rate.slider.focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("PageDown");
  await expect(rate.slider).toHaveValue(before);
  const thumb = rate.slider.locator("xpath=../..");
  await thumb.scrollIntoViewIfNeeded();
  const box = await thumb.boundingBox();
  if (box === null) throw new Error("no thumb");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 100, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(rate.slider).toHaveValue(before);
  await expect(rate.box).toHaveValue("0.1");

  const filter = stats(page).getByRole("checkbox", {
    name: "Leave out the variants that failed their FILTER",
  });
  await expect(filter).toHaveAttribute("aria-disabled", "true");
  await expect(filter).toHaveAccessibleDescription(new RegExp(LOCKED, "u"));
  await stats(page)
    .locator("label")
    .filter({ hasText: "Leave out the variants that failed their FILTER" })
    .click({ force: true });
  await expect(filter).toBeChecked();
  await expectAxeBothSchemes(page, makeAxeBuilder);

  await tab(page, "PCA").click();
  await stop(page).click();
  await expect(run(page)).toBeEnabled();
  await expect(distance(page)).not.toHaveAttribute("aria-disabled");
  await expect(pcaRadio).not.toHaveAttribute("aria-disabled");
  await tab(page, "Variants").click();
  await expect(rate.box).not.toHaveAttribute("aria-disabled");
  await expect(rate.slider).not.toHaveAttribute("aria-disabled");
  await expect(filter).not.toHaveAttribute("aria-disabled");
});

test("AP6 D3 while a PCA runs Undo is greyed with the reason and Ctrl+Z undoes nothing; the column of the populations stays open and a column chosen leaves the PCA running; another variants file opened stops it, the tab ready", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await openHeld(page, "panel.nei");
  await typeDistance(page, "50000");
  const undo = page.getByRole("button", { name: "Undo", exact: true });
  await expect(undo).toBeVisible();
  await runHeld(page);

  await expect(undo).toHaveAttribute("aria-disabled", "true");
  await expect(undo).toHaveAccessibleDescription(LOCKED);
  await page.getByRole("heading", { level: 1, name: "Popnei" }).click();
  await page.keyboard.press("ControlOrMeta+z");
  // Pressed though it says it waits, as a user may.
  await undo.click({ force: true });
  await expect(distance(page)).toHaveValue("50000");
  await expect(stop(page)).toBeVisible();

  await pickIndividuals(page, "panel_pops.csv");
  const column = individualsBox(page).getByRole("button", {
    name: "Column of the populations",
  });
  await expect(column).toContainText("popcat", { timeout: 20_000 });
  await expect(column).not.toHaveAttribute("aria-disabled");
  await column.click();
  await page
    .getByRole("option", {
      name: "None: every individual unclassified",
      exact: true,
    })
    .click();
  await expect(column).toContainText("None");
  await expect(stop(page)).toBeVisible();

  await pick(page, "panel.vcf.gz");
  await expect(stop(page)).toHaveCount(0);
  await release(page, "allSoFar");
  await release(page, "result");
  // The options kept, the distance among them.
  await expect(run(page)).toBeEnabled({ timeout: 30_000 });
  await expect(distance(page)).toHaveValue("50000");
  await expect(undo).toHaveCount(0);
});

test("AP6 D3 the download of the filtered variants waits while a PCA is held, with its words, and comes back after Stop; the PCoA's words; the text after a download stays during a run; axe light and dark", async ({
  page,
  makeAxeBuilder,
}) => {
  test.setTimeout(90_000);
  await openHeld(page, "panel.nei");
  await typeDistance(page, "50000");
  await runHeld(page);
  await tab(page, "Variants").click();
  await expect(downloadButton(page)).toBeDisabled();
  await expect(downloadButton(page)).toHaveAccessibleDescription(
    DOWNLOAD_WAITS_PCA,
  );
  await expectAxeBothSchemes(page, makeAxeBuilder);

  await tab(page, "PCA").click();
  await stop(page).click();
  await tab(page, "Variants").click();
  await expect(downloadButton(page)).toBeEnabled();

  await tab(page, "PCA").click();
  await group(page, "Method")
    .locator("label")
    .filter({ hasText: "PCoA" })
    .click();
  await expect(
    shown(page).getByRole("heading", { level: 2, name: "PCoA" }),
  ).toBeVisible();
  await run(page).click();
  await expect(stop(page)).toBeVisible();
  await tab(page, "Variants").click();
  await expect(downloadButton(page)).toHaveAccessibleDescription(
    "Waits for the PCoA to end; or stop it in the PCA tab.",
  );
  await tab(page, "PCA").click();
  await stop(page).click();

  await tab(page, "Variants").click();
  await downloadButton(page).click();
  const dialog = page.getByRole("dialog", {
    name: "Download filtered variants",
  });
  await dialog
    .locator("label")
    .filter({ hasText: "popnei's .nei file" })
    .click();
  const coming = page.waitForEvent("download", { timeout: 60_000 });
  await dialog.getByRole("button", { name: "Download" }).click();
  await coming;
  const after = stats(page).locator("p", { hasText: /^panel\.filtered\.nei/u });
  await expect(after).toBeVisible();
  await tab(page, "PCA").click();
  await run(page).click();
  await expect(stop(page)).toBeVisible();
  await tab(page, "Variants").click();
  await expect(after).toBeVisible();
  await expect(downloadButton(page)).toHaveCount(0);
});

test('AP6 D3 "PCA of panel.nei calculated." in the status region while the Variants tab is shown', async ({
  page,
}) => {
  await recordAnnouncements(page);
  await openHeld(page, "panel.nei");
  await typeDistance(page, "50000");
  await runHeld(page);
  await tab(page, "Variants").click();
  await release(page, "pca");
  // The region may say it with what comes in the same pause.
  await expect
    .poll(
      async () =>
        (await announced(page)).some((text) =>
          text.includes("PCA of panel.nei calculated."),
        ),
      { timeout: 30_000 },
    )
    .toBe(true);
  await tab(page, "PCA").click();
  await expect(stop(page)).toHaveCount(0);
});

test("AP6 D3 the PCA tab shown, another variants file opened: its reason in place of the options, which come back as they were once it is open", async ({
  page,
  makeAxeBuilder,
}) => {
  // The opening of panel.vcf.gz kept from the worker, so that it stays
  // being opened.
  await page.route(/\/runnerWorker-[^/]*\.js$/u, async (route) => {
    const response = await route.fetch();
    const script = await response.text();
    const front = `self.addEventListener("message", (event) => { if (event.data !== null && typeof event.data === "object" && event.data.kind === "open" && event.data.file.name === "panel.vcf.gz") { event.stopImmediatePropagation(); } });\n`;
    await route.fulfill({ response, body: front + script });
  });
  await page.goto("popgen2.html");
  await pick(page, "panel.nei");
  await tab(page, "PCA").click();
  await expect(run(page)).toHaveAccessibleDescription(NO_DISTANCE, {
    timeout: 30_000,
  });
  await typeDistance(page, "50000");

  await pick(page, "panel.vcf.gz");
  const reason = "The PCA needs a variants file: panel.vcf.gz is being opened.";
  await expect(shown(page).getByText(reason, { exact: true })).toBeVisible();
  await expect(distance(page)).toBeHidden();
  await expect(run(page)).toBeHidden();
  await expectAxeBothSchemes(page, makeAxeBuilder);

  await page.unrouteAll({ behavior: "wait" });
  await pick(page, "panel.nei");
  await expect(distance(page)).toBeVisible({ timeout: 30_000 });
  await expect(distance(page)).toHaveValue("50000");
  await expect(run(page)).toBeEnabled({ timeout: 30_000 });
});

/** A PCA of panel.nei takes well under a second; 30 s leaves room for a
    loaded machine. */
const RESULT_TIMEOUT = 30_000;

/** The names of the plot, in 3D and in 2D. */
const PCA_3D = "Principal components, PC1, PC2 and PC3";
const PCA_2D = "Principal components, PC1 and PC2";

/** Counts the calculations the page asks of its workers, every "run"
    message, in `window.postedRuns`. */
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

/** Whether this engine gives WebGL 2, as the 3D view asks for it. */
async function givesWebGl(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const context = document.createElement("canvas").getContext("webgl2");
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return context !== null;
  });
}

/** Opens popgen2.html with its calculations counted, opens panel.nei,
    shows the PCA tab once the one pass has ended, and types the distance
    of the LD pruning, 50000. */
async function openReady(page: Page): Promise<void> {
  await page.addInitScript(countRuns);
  await page.goto("popgen2.html");
  await pick(page, "panel.nei");
  await tab(page, "PCA").click();
  await expect(run(page)).toHaveAccessibleDescription(NO_DISTANCE, {
    timeout: 30_000,
  });
  await typeDistance(page, "50000");
}

/** The caption of the table of the individuals of a result. */
function tableCaptionOf(page: Page): Locator {
  return shown(page).getByText(/^The place of each of the 200 individuals/u);
}

/** Presses Run and waits for the result. */
async function runToResult(page: Page): Promise<void> {
  await run(page).click();
  await expect(tableCaptionOf(page)).toBeVisible({ timeout: RESULT_TIMEOUT });
}

/** The labels of the axes of the 2D plot. */
function axisLabels(page: Page): Locator {
  return shown(page).locator("svg.chart-scatter .chart-axis-label");
}

/** The legend of the points, by its title. */
function legend(page: Page, title = "Population"): Locator {
  return shown(page).getByRole("radiogroup", { name: title, exact: true });
}

/** The table of the explained variance. */
function varianceTable(page: Page): Locator {
  return shown(page).getByRole("table", {
    name: /^The variance of the individuals explained/u,
  });
}

/** The grid of the individuals. */
function individualsGrid(page: Page): Locator {
  return shown(page).getByRole("grid", { name: /^The place of each/u });
}

/** The button "Download…" named `what`, after "Download ". */
function menuButton(page: Page, what: string): Locator {
  return shown(page).getByRole("button", {
    name: `Download ${what}`,
    exact: true,
  });
}

/** Focuses the button `button`, opens its menu with Enter, goes down to
    `item`, the `index`th, with the arrow keys, chooses it with Enter, and
    gives the file the page hands to the browser. */
async function chooseByKeys(
  page: Page,
  button: Locator,
  item: string,
  index: number,
): Promise<Download> {
  await button.focus();
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

/** Switches the plot to 2D. */
async function to2d(page: Page): Promise<void> {
  await shown(page).getByRole("radio", { name: "2D", exact: true }).click();
  await expect(shown(page).getByRole("img", { name: PCA_2D })).toBeVisible();
}

/** The status region of the shell, the last of the page's. */
function status(page: Page): Locator {
  return page.getByRole("status").last();
}

test.describe("AP6 D3 the result of the PCA tab", () => {
  test("AP6 D3 the PCA: its title, the 3D view first, PC1 (3.55%) and PC2 (3.40%) in 2D, PC3 1.89%, s000 at −0.7139 and 7.6765, 548 variants, no warning; Unclassified (200) alone, then p0, p2 and p1 with panel_pops.csv and no request; axe light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(90_000);
    await openReady(page);
    await runToResult(page);
    await expect(
      shown(page).getByRole("heading", {
        level: 3,
        name: "Principal components of panel.nei",
      }),
    ).toBeVisible();
    if (await givesWebGl(page)) {
      await expect(shown(page).getByRole("img", { name: PCA_3D })).toBeVisible({
        timeout: RESULT_TIMEOUT,
      });
    }
    await expect(shown(page).getByText(/^Warning:/u)).toHaveCount(0);
    await expect(
      shown(page).getByRole("heading", { name: /warning/u }),
    ).toHaveCount(0);
    await expect(tableCaptionOf(page)).toHaveText(
      "The place of each of the 200 individuals of panel.nei on the first 10 of the 199 components, from 548 variants.",
    );
    await expect(
      varianceTable(page).getByRole("row", { name: /^PC3 / }),
    ).toContainText("1.89%");
    await expect(legend(page).getByRole("radio")).toHaveText([
      "Unclassified (200)",
    ]);
    await expectAxeBothSchemes(page, makeAxeBuilder);

    await to2d(page);
    await expect(axisLabels(page)).toHaveText(["PC1 (3.55%)", "PC2 (3.40%)"]);
    const cells = individualsGrid(page)
      .getByRole("row", { name: /^s000/u })
      .getByRole("gridcell");
    await expect(cells.nth(0)).toHaveText("Unclassified");
    await expect(cells.nth(1)).toHaveText("−0.7139");
    await expect(cells.nth(2)).toHaveText("7.6765");
    expect(await runsPosted(page)).toBe(2);

    await pickIndividuals(page, "panel_pops.csv");
    await expect(legend(page).getByRole("radio")).toHaveText(
      ["p0 (48)", "p2 (84)", "p1 (68)"],
      { timeout: 20_000 },
    );
    await expect(axisLabels(page)).toHaveText(["PC1 (3.55%)", "PC2 (3.40%)"]);
    // The one pass and the PCA, and nothing for the individuals file.
    expect(await runsPosted(page)).toBe(2);
    await expectAxeBothSchemes(page, makeAxeBuilder);
  });

  test("AP6 D3 its filters: the missing data stricter at 0.05, 532 variants and PC1 3.58%; 0.2 refused, nothing sent; the Variants tab at 0.03 and back; the MAF at 0.9, 510 variants and PC1 3.68%; the LD pruning off, 1,200 variants, PC1 7.61% and its warning", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(120_000);
    await openReady(page);
    await runToResult(page);
    await to2d(page);

    const missing = group(page, "Filter the variants by missing data");
    await missing
      .locator("label")
      .filter({ hasText: "Stricter for the PCA" })
      .click();
    const missingField = shown(page).getByRole("textbox", {
      name: /^Maximum proportion of missing genotypes, from 0 to /u,
    });
    await expect(missingField).toHaveValue("0.1");
    // The choice alone changes no key: the result stays.
    await expect(tableCaptionOf(page)).toBeVisible();
    await missingField.fill("0.05");
    await missingField.press("Enter");
    await runToResult(page);
    await expect(tableCaptionOf(page)).toContainText("from 532 variants.");
    await expect(axisLabels(page).first()).toHaveText("PC1 (3.58%)");
    const posted = await runsPosted(page);

    await missingField.fill("0.2");
    await missingField.press("Enter");
    await expect(
      shown(page).getByText(
        "0.2 is more than the 0.1 of the Variants tab; the maximum proportion of missing genotypes for the PCA stays 0.05.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(tableCaptionOf(page)).toContainText("from 532 variants.");
    expect(await runsPosted(page)).toBe(posted);
    await missingField.fill("0.05");
    await missingField.press("Enter");

    await tab(page, "Variants").click();
    const rate = histogram(page, "Proportion of missing genotypes");
    await rate.box.fill("0.03");
    await rate.box.press("Enter");
    await tab(page, "PCA").click();
    await expect(missingField).toHaveValue("0.03");
    await expect(missingField).toHaveAccessibleName(
      "Maximum proportion of missing genotypes, from 0 to 0.03",
    );
    await expect(
      shown(page).getByText(
        "The Variants tab keeps at most 0.03, stricter than the 0.05 set here, so the PCA uses 0.03.",
        { exact: true },
      ),
    ).toBeVisible();
    await tab(page, "Variants").click();
    await rate.box.fill("0.1");
    await rate.box.press("Enter");
    await tab(page, "PCA").click();
    await expect(missingField).toHaveValue("0.05");
    // The key of 0.05 again, its result from the cache.
    await expect(tableCaptionOf(page)).toContainText("from 532 variants.");
    expect(await runsPosted(page)).toBe(posted);

    await missing
      .locator("label")
      .filter({ hasText: "As in the Variants tab: 0.1" })
      .click();
    const maf = group(
      page,
      "Filter the variants by major allele frequency (MAF)",
    );
    await maf
      .locator("label")
      .filter({ hasText: "Stricter for the PCA" })
      .click();
    const mafField = shown(page).getByRole("textbox", {
      name: /^Maximum major allele frequency, from 0 to /u,
    });
    await mafField.fill("0.9");
    await mafField.press("Enter");
    await runToResult(page);
    await expect(tableCaptionOf(page)).toContainText("from 510 variants.");
    await expect(axisLabels(page).first()).toHaveText("PC1 (3.68%)");

    await maf
      .locator("label")
      .filter({ hasText: /^As in the Variants tab/u })
      .click();
    await shown(page)
      .locator("label")
      .filter({ hasText: "Prune the variants by linkage disequilibrium (LD)" })
      .click();
    await runToResult(page);
    await expect(tableCaptionOf(page)).toContainText("from 1,200 variants.");
    await expect(axisLabels(page).first()).toHaveText("PC1 (7.61%)");
    await expect(
      shown(page).getByRole("heading", { level: 3, name: "1 warning" }),
    ).toBeVisible();
    await expect(
      shown(page).getByText(
        /^Warning: No LD pruning was applied for the PCA,/u,
      ),
    ).toContainText(
      "Turn on the LD pruning of the PCA in its options above, unless such regions are what you are looking for.",
    );
    await expectAxeBothSchemes(page, makeAxeBuilder);
  });

  test("AP6 D3 the PCoA within 50,000: its title, PC1 (3.68%) and PC2 (3.54%), the warning of the correction with 7.87%, 0.047, 53% and 0.22, and the line under the explained variance; axe light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(90_000);
    await openReady(page);
    await group(page, "Method")
      .locator("label")
      .filter({ hasText: "PCoA" })
      .click();
    await runToResult(page);
    await expect(
      shown(page).getByRole("heading", {
        level: 3,
        name: "Principal coordinates of panel.nei",
      }),
    ).toBeVisible();
    const warning = shown(page).getByText(/^Warning: .*Lingoes/u);
    for (const number of ["7.87%", "0.047", "53%", "0.22"]) {
      await expect(warning).toContainText(number);
    }
    const line = shown(page).getByText(
      /^The percentages are of the Kosman distances after Lingoes' correction/u,
    );
    await expect(line).toContainText("added 0.047 to the square");
    await expect(line).toContainText("over all the 198 components of the PCoA");
    await expect(menuButton(page, "the plot of the PCoA")).toBeVisible();
    await to2d(page);
    await expect(axisLabels(page)).toHaveText(["PC1 (3.68%)", "PC2 (3.54%)"]);
    await expectAxeBothSchemes(page, makeAxeBuilder);
  });

  test("AP6 D3 Undo: a threshold that removes the result moved, Undo brings the plot back with no request; a menu open, Ctrl+Z undoes and leaves it open", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openReady(page);
    await runToResult(page);
    await to2d(page);
    const posted = await runsPosted(page);

    await tab(page, "Variants").click();
    const rate = histogram(page, "Proportion of missing genotypes");
    await rate.box.fill("0.05");
    await rate.box.press("Enter");
    await tab(page, "PCA").click();
    await expect(tableCaptionOf(page)).toHaveCount(0);
    await expect(run(page)).toBeEnabled();
    const undo = page.getByRole("button", { name: "Undo", exact: true });
    await undo.click();
    await expect(tableCaptionOf(page)).toContainText("from 548 variants.");
    await expect(axisLabels(page)).toHaveText(["PC1 (3.55%)", "PC2 (3.40%)"]);
    expect(await runsPosted(page)).toBe(posted);

    // The menu of the explained variance open; the undo of the 2D view
    // keeps the table, and the menu.
    await expect(undo).toHaveAccessibleDescription(
      "Undo: the PCA was drawn in 2D",
    );
    await menuButton(page, "the explained variance of the PCA").focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await page.keyboard.press("ControlOrMeta+z");
    await expect(
      shown(page).getByRole("radio", { name: "3D", exact: true }),
    ).toBeChecked();
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    expect(await runsPosted(page)).toBe(posted);
  });

  test("AP6 D3 the downloads by the keyboard alone: the coordinates read back, the table sorted by PC1 in that order, the explained variance, a PNG of the 3D view, and the menu waiting while three.js downloads; axe with a menu open, light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(120_000);
    // The file of the 3D view held back, so that the menu waits.
    let release3d: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release3d = resolve;
    });
    await page.route(/\/pca3d-[^/]*\.js$/u, async (route) => {
      await held;
      await route.continue();
    });
    await openReady(page);
    await runToResult(page);
    const plotMenu = menuButton(page, "the plot of the PCA");
    const webGl = await givesWebGl(page);
    await expect(plotMenu).toHaveAttribute("aria-disabled", "true");
    await expect(plotMenu).toHaveAccessibleDescription(
      "Download once the 3D view is drawn.",
    );
    await plotMenu.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu")).toHaveCount(0);
    release3d();
    if (webGl) {
      await expect(shown(page).getByRole("img", { name: PCA_3D })).toBeVisible({
        timeout: RESULT_TIMEOUT,
      });
    }
    await expect(plotMenu).not.toHaveAttribute("aria-disabled", {
      timeout: RESULT_TIMEOUT,
    });

    const coordinates = await chooseByKeys(page, plotMenu, "Data as CSV", 2);
    expect(coordinates.suggestedFilename()).toBe("panel.pca.coordinates.csv");
    await expect(status(page)).toContainText(
      "Saving panel.pca.coordinates.csv.",
    );
    const lines = (await textOf(coordinates)).split("\n");
    expect(lines[0]).toBe(
      "individual,PC1,PC2,PC3,PC4,PC5,PC6,PC7,PC8,PC9,PC10",
    );
    expect(lines[1]).toMatch(/^s000,-0\.7138853335304419,7\.676473141448964,/u);
    expect(lines).toHaveLength(202);

    const png = await chooseByKeys(page, plotMenu, "Image as PNG", 1);
    expect(png.suggestedFilename()).toBe("panel.pca.png");
    const bytes = await readFile(await png.path());
    expect(bytes.subarray(1, 4).toString("latin1")).toBe("PNG");
    expect(bytes.length).toBeGreaterThan(5_000);

    await plotMenu.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu")).toBeVisible();
    await expectAxeBothSchemes(page, makeAxeBuilder);
    await page.keyboard.press("Escape");

    const variance = await chooseByKeys(
      page,
      menuButton(page, "the explained variance of the PCA"),
      "Table as CSV",
      0,
    );
    expect(variance.suggestedFilename()).toBe("panel.pca.variance.csv");
    const varianceLines = (await textOf(variance)).split("\n");
    expect(varianceLines[0]).toBe("Component,Explained variance");
    expect(varianceLines[1]).toBe("PC1,3.5476992895181616");

    // Sorted by PC1, up, by a click on its header.
    const grid = individualsGrid(page);
    await grid.getByRole("columnheader", { name: "PC1" }).click();
    const firstRow = grid.getByRole("row").nth(1);
    const firstName =
      (await firstRow.getByRole("rowheader").textContent()) ?? "";
    const table = await chooseByKeys(
      page,
      menuButton(page, "the table of the individuals of the PCA"),
      "Table as CSV",
      0,
    );
    expect(table.suggestedFilename()).toBe("panel.pca.table.csv");
    const rows = (await textOf(table)).trimEnd().split("\n");
    expect(rows[0]).toBe(
      "Individual,Population,PC1,PC2,PC3,PC4,PC5,PC6,PC7,PC8,PC9,PC10",
    );
    expect(rows).toHaveLength(201);
    expect(rows[1]?.split(",")[0]).toBe(firstName);
    const pc1 = rows.slice(1).map((row) => Number(row.split(",")[2]));
    expect(pc1).toEqual(pc1.toSorted((a, b) => a - b));
    // The unclassified as stored, with no population.
    expect(rows.find((row) => row.startsWith("s000,"))).toMatch(
      /^s000,,-0\.7138853335304419,/u,
    );
  });

  test("AP6 D3 kept drawn: the 3D view turned, the Variants tab shown and back, the same view; a run that ends while the tab is hidden draws its view when the tab is shown, its loading not said meanwhile", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await recordAnnouncements(page);
    await openHeld(page, "panel.nei");
    test.skip(!(await givesWebGl(page)), "this engine gives no WebGL 2");
    await typeDistance(page, "50000");
    await runHeld(page);
    await tab(page, "Variants").click();
    await release(page, "pca");
    await expect
      .poll(
        async () =>
          (await announced(page)).some((text) =>
            text.includes("PCA of panel.nei calculated."),
          ),
        { timeout: 30_000 },
      )
      .toBe(true);
    // Time for three.js to download while the tab is hidden.
    await page.waitForTimeout(1_000);
    expect(
      (await announced(page)).some((text) =>
        text.includes("Loading the 3D view…"),
      ),
    ).toBe(false);

    await tab(page, "PCA").click();
    const view = shown(page).getByRole("img", { name: PCA_3D });
    await expect(view).toBeVisible({ timeout: RESULT_TIMEOUT });
    const canvas = shown(page).locator("canvas");
    const labels = shown(page).locator(".chart-pca3d-label");
    await expect(labels).toHaveCount(3);

    for (const name of ["Turn left", "Turn left", "Tilt up"]) {
      await shown(page).getByRole("button", { name, exact: true }).click();
    }
    await canvas.scrollIntoViewIfNeeded();
    const before = await canvas.screenshot();
    const placesBefore = await labels.evaluateAll((all) =>
      all.map((label) => {
        const style = (label as HTMLElement).style;
        return `${style.left} ${style.top}`;
      }),
    );

    await tab(page, "Variants").click();
    await expect(canvas).toBeHidden();
    await page.waitForTimeout(500);
    await tab(page, "PCA").click();
    await expect(view).toBeVisible();
    await canvas.scrollIntoViewIfNeeded();
    expect(
      await labels.evaluateAll((all) =>
        all.map((label) => {
          const style = (label as HTMLElement).style;
          return `${style.left} ${style.top}`;
        }),
      ),
    ).toEqual(placesBefore);
    const after = await canvas.screenshot();
    expect(after.equals(before)).toBe(true);
  });
});
