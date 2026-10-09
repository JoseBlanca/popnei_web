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
 * panel.nei and panel.vcf.gz hold 1,200 variants of 200 diploid
 * individuals, s000 to s199; panel.vcf.gz records the FILTER of its
 * variants, so its box is drawn; panel_pops.csv puts the individuals in
 * p0, p2 and p1.
 */
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

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
