/**
 * Undo and Redo on popgen2.html, on the built site (docs/plans/filters.md,
 * work package 6 and the owner's round on work package 7;
 * docs/specs/steps/popgen2-filters.md, "Undo, Redo and their keys" and
 * "Accessibility"): the row of the shell's Undo and Redo above the box of
 * the file, there before any file; opening a file, the first or another,
 * starts the page's history afresh, so that Undo is disabled after it and
 * Undo and Redo serve the changes of the filters alone; no notice at any
 * of it; the keys of Undo and Redo; the focus handed from a button that
 * becomes disabled to the other; the order of the Tab key from Undo; a
 * file opened while the pass of the file before it runs, whose own pass
 * starts and is never said to be stopped.
 *
 * The change undone here is a click of the FILTER box, shown for
 * panel.vcf.gz and not for panel.nei; the thresholds, their Undo and the
 * keys of Undo on them are in popgen2Thresholds.spec.ts. Both files hold
 * the same 1,200 variants of 200 individuals, counted by popnei.
 */
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";
import { holdSummary, release } from "./holdWorker.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

const LABEL = "Leave out the variants that failed their FILTER";
/** The description of a click that unticks the FILTER box. */
const KEPT = "the variants that failed their FILTER are kept";

async function openPage(page: Page): Promise<void> {
  await page.goto("popgen2.html");
  await expect(
    page.getByRole("heading", { level: 1, name: "Popnei" }),
  ).toBeVisible();
}

function undoButton(page: Page): Locator {
  return page.getByRole("main").getByRole("button", {
    name: "Undo",
    exact: true,
  });
}

function redoButton(page: Page): Locator {
  return page.getByRole("main").getByRole("button", {
    name: "Redo",
    exact: true,
  });
}

/** The button that opens the file picker, whatever its words. */
function openButton(page: Page): Locator {
  return page.getByRole("button", {
    name: /^Open (another )?variants file…$/u,
  });
}

/** The box of the file open. */
function info(page: Page): Locator {
  return page.getByRole("region", { name: "File information" });
}

function stats(page: Page): Locator {
  return page.getByRole("region", { name: "Statistics of the file" });
}

/** The notice of the old page, which popgen2.html no longer has. */
function notice(page: Page): Locator {
  return page.getByRole("region", { name: "Notice" });
}

function filterBox(page: Page): Locator {
  return page.getByRole("checkbox", { name: LABEL });
}

/** Clicks the words of the FILTER box, as a user does: the input itself
    is hidden under the drawn box. */
async function clickBox(page: Page): Promise<void> {
  await page.getByText(LABEL, { exact: true }).click();
}

/** Picks the fixture `name` with the open button. */
async function pick(page: Page, name: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await openButton(page).click();
  await (await chooser).setFiles(join(FIXTURES, name));
}

/** Expects the file `name` open, its 1,200 variants counted and its
    plots drawn: the one pass done. */
async function expectDone(page: Page, name: string): Promise<void> {
  await expect(info(page).getByText(name)).toBeVisible();
  await expect(
    info(page).getByText("Variants: 1,200", { exact: true }),
  ).toBeVisible();
  await expect(
    stats(page).getByRole("group", {
      name: "Major allele frequency",
      exact: true,
    }),
  ).toBeVisible();
}

/** Opens panel.vcf.gz, waits for its statistics, and unticks the FILTER
    box: one step to undo. */
async function openAndUntick(page: Page): Promise<void> {
  await pick(page, "panel.vcf.gz");
  await expectDone(page, "panel.vcf.gz");
  await clickBox(page);
  await expect(filterBox(page)).not.toBeChecked();
  await expect(undoButton(page)).toHaveAccessibleDescription(`Undo: ${KEPT}`);
}

/** The name of the section that holds the element with the focus, or
    "" for none. */
async function sectionOfFocus(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      document.activeElement?.closest("section")?.getAttribute("aria-label") ??
      "",
  );
}

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

test("SF6 D2 the row of Undo and Redo is above the box of the file before any file, both disabled, and stays so after the first file is opened, with no notice", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);

  await expect(undoButton(page)).toBeDisabled();
  await expect(redoButton(page)).toBeDisabled();
  await expect(notice(page)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  await pick(page, "panel.vcf.gz");
  await expectDone(page, "panel.vcf.gz");
  await expect(undoButton(page)).toBeDisabled();
  await expect(redoButton(page)).toBeDisabled();
  await expect(notice(page)).toHaveCount(0);
  // The row stands between the heading and the box of the file.
  const row = await undoButton(page).boundingBox();
  const heading = await page.getByRole("heading", { level: 1 }).boundingBox();
  const box = await info(page).boundingBox();
  if (row === null || heading === null || box === null) {
    throw new Error("not laid out");
  }
  expect(row.y).toBeGreaterThan(heading.y + heading.height - 1);
  expect(row.y + row.height).toBeLessThan(box.y + 1);
  await expectNoViolations(makeAxeBuilder);
});

test("SF7 round opening a file starts the history afresh: Undo enabled by a click of the FILTER box, disabled after a second file and a third, with the box as the user left it and no notice", async ({
  page,
}) => {
  await openPage(page);
  await openAndUntick(page);
  await expect(redoButton(page)).toBeDisabled();

  await pick(page, "panel.nei");
  await expectDone(page, "panel.nei");
  await expect(undoButton(page)).toBeDisabled();
  await expect(redoButton(page)).toBeDisabled();
  await expect(notice(page)).toHaveCount(0);

  // An undo and a redo left behind are gone too.
  await pick(page, "low_qual.nei");
  await expectDone(page, "low_qual.nei");
  await expect(filterBox(page)).not.toBeChecked();
  await clickBox(page);
  await expect(filterBox(page)).toBeChecked();
  await undoButton(page).click();
  await expect(filterBox(page)).not.toBeChecked();
  await expect(redoButton(page)).toBeEnabled();

  await pick(page, "panel.vcf.gz");
  await expectDone(page, "panel.vcf.gz");
  await expect(undoButton(page)).toBeDisabled();
  await expect(redoButton(page)).toBeDisabled();
  await expect(filterBox(page)).not.toBeChecked();
  await expect(notice(page)).toHaveCount(0);
});

test("SF6 D2 Ctrl+Z undoes and Ctrl+Y and Ctrl+Shift+Z redo a click of the FILTER box, and Cmd+Z and Cmd+Shift+Z in WebKit", async ({
  page,
  browserName,
}) => {
  await openPage(page);
  await openAndUntick(page);
  await page.getByRole("heading", { level: 1 }).focus();

  await page.keyboard.press("Control+z");
  await expect(filterBox(page)).toBeChecked();
  await expect(undoButton(page)).toBeDisabled();
  await page.keyboard.press("Control+y");
  await expect(filterBox(page)).not.toBeChecked();
  await expect(redoButton(page)).toBeDisabled();
  await page.keyboard.press("Control+z");
  await expect(filterBox(page)).toBeChecked();
  await page.keyboard.press("Control+Shift+z");
  await expect(filterBox(page)).not.toBeChecked();

  if (browserName === "webkit") {
    await page.keyboard.press("Meta+z");
    await expect(filterBox(page)).toBeChecked();
    await page.keyboard.press("Meta+Shift+z");
    await expect(filterBox(page)).not.toBeChecked();
  }
  await expectDone(page, "panel.vcf.gz");
  await expect(notice(page)).toHaveCount(0);
});

test("SF6 D2 the button that had the focus and becomes disabled hands it to the other, and the status region says what was undone", async ({
  page,
}) => {
  await openPage(page);
  await openAndUntick(page);

  await undoButton(page).focus();
  await page.keyboard.press("Enter");
  await expect(filterBox(page)).toBeChecked();
  await expect(undoButton(page)).toBeDisabled();
  await expect(redoButton(page)).toBeFocused();
  await expect(page.getByRole("status").last()).toHaveText(`Undone: ${KEPT}.`);

  await page.keyboard.press("Enter");
  await expect(filterBox(page)).not.toBeChecked();
  await expect(redoButton(page)).toBeDisabled();
  await expect(undoButton(page)).toBeFocused();
  await expect(page.getByRole("status").last()).toHaveText(`Redone: ${KEPT}.`);
  await expectDone(page, "panel.vcf.gz");
});

test("SF6 D2 the Tab key goes from Undo to Redo and then into the statistics, and from the statistics to the open button", async ({
  page,
}) => {
  await openPage(page);
  await openAndUntick(page);
  // Undo and Redo both enabled.
  await clickBox(page);
  await undoButton(page).click();
  await expect(redoButton(page)).toBeEnabled();
  await expect(undoButton(page)).toBeEnabled();

  await undoButton(page).focus();
  await page.keyboard.press("Tab");
  await expect(redoButton(page)).toBeFocused();
  // The box of the threshold of the first histogram.
  await page.keyboard.press("Tab");
  await expect(stats(page).getByRole("textbox").first()).toBeFocused();

  await openButton(page).focus();
  await page.keyboard.press("Shift+Tab");
  // The DropZone's button that pastes a file comes before the open
  // button, and the last control of the statistics before it.
  await page.keyboard.press("Shift+Tab");
  await expect.poll(() => sectionOfFocus(page)).toBe("Statistics of the file");
});

test("SF7 round a file opened while the pass of the file before it runs starts its own pass, with Undo disabled and no Stop said", async ({
  page,
}) => {
  await holdSummary(page);
  await openPage(page);
  const stop = info(page).getByRole("button", { name: "Stop" });
  const stopped = stats(page).getByText(/^Stopped\./u);
  await pick(page, "panel.vcf.gz");
  await expect(stop).toBeVisible();
  await clickBox(page);
  await expect(undoButton(page)).toBeEnabled();

  // panel.vcf.gz is still read when panel.nei is opened over it.
  await pick(page, "panel.nei");
  await expect(info(page).getByText("panel.nei")).toBeVisible();
  await expect(stop).toBeVisible();
  await expect(stopped).toHaveCount(0);
  await expect(undoButton(page)).toBeDisabled();
  await expect(notice(page)).toHaveCount(0);

  await release(page, "result");
  await expectDone(page, "panel.nei");
  await expect(stopped).toHaveCount(0);
});
