/**
 * Undo and Redo on popgen2.html, on the built site
 * (docs/specs/steps/popgen2-pca.md, "Undo and Redo" and "How it is
 * checked"): at the right end of the line of the heading "Popnei", each
 * drawn only while it has a step to take, in a place of its own that
 * stays, so that neither moves and the line keeps its height; no button
 * when the page opens, nor after a variants file or an individuals file
 * is opened, which start the history afresh; each named by its step in
 * its tooltip, and an undo or a redo said in the status region; the keys
 * of Undo and Redo on the heading, on a line and in a box with nothing
 * typed, and the box's own with something typed; the focus handed from a
 * button that goes to the other, or to the heading; no notice at any of
 * it. A file opened while the pass of the file before it runs starts its
 * own pass, and is never said to be stopped.
 *
 * The flows of the PCA, an Undo that brings its result back and a change
 * during its run, are work package 6's (docs/plans/analyses-pca.md).
 *
 * panel.vcf.gz and panel.nei hold the same 1,200 variants of 200
 * individuals, counted by popnei; panel.vcf.gz records the FILTER of its
 * variants. The MAF's axis goes from 0.45 to 1 by 0.01, the missing
 * rate's from 0 to 0.1 by 0.001.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { announced, recordAnnouncements } from "./announced.ts";
import { expect, test } from "./axe.ts";
import { dropFiles } from "./dropFiles.ts";
import { holdSummary, release } from "./holdWorker.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

const LABEL = "Leave out the variants that failed their FILTER";
/** The description of a click that unticks the FILTER box. */
const KEPT = "the variants that failed their FILTER are kept";
/** The title of the histogram of the missing rate of the variants. */
const MISSING_TITLE = "Proportion of missing genotypes";
/** The description of a change of the missing rate of the variants. */
const MISSING_CHANGED = "the filter of the variants by missing data changed";
/** The description of the MAF typed over a threshold that is off. */
const MAF_ON = "the MAF filter was turned on";
/** The description of a column of the populations chosen. */
const COLUMN_CHANGED = "the column of the populations changed";

async function openPage(page: Page): Promise<void> {
  await page.goto("popgen2.html");
  await expect(heading(page)).toBeVisible();
}

function heading(page: Page): Locator {
  return page.getByRole("heading", { level: 1, name: "Popnei" });
}

/** The line of the heading, which holds Undo and Redo. */
function headingLine(page: Page): Locator {
  return heading(page).locator("..");
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

/** Any button of Undo or Redo on the page, with or without words after
    the name. */
function undoOrRedo(page: Page): Locator {
  return page.getByRole("button", { name: /^(Undo|Redo)\b/u });
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

/** The box of the individuals file, named by its heading. */
function individualsBox(page: Page): Locator {
  return page.getByRole("region", { name: "Individuals file", exact: true });
}

function stats(page: Page): Locator {
  return page.getByRole("region", { name: "Statistics of the file" });
}

/** The notice of the old page, which popgen2.html does not have. */
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

/** Picks the fixture `name` with the button of the box of the
    individuals file. */
async function pickIndividuals(page: Page, name: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await individualsBox(page)
    .getByRole("button", { name: /^Open (another )?individuals file…$/u })
    .click();
  await (await chooser).setFiles(join(FIXTURES, name));
}

/** The list "Column of the populations", by its button. */
function columnList(page: Page): Locator {
  return individualsBox(page).getByRole("button", {
    name: "Column of the populations",
  });
}

/** Chooses `item` in the list "Column of the populations". */
async function chooseColumn(page: Page, item: string): Promise<void> {
  await columnList(page).click();
  await page.getByRole("option", { name: item, exact: true }).click();
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

/** The group of the histogram titled `title`, its box and its line. */
function threshold(
  page: Page,
  title: string,
): { readonly box: Locator; readonly slider: Locator } {
  const group = stats(page).getByRole("group", { name: title, exact: true });
  return { box: group.getByRole("textbox"), slider: group.getByRole("slider") };
}

/** The missing rate of the variants, typed at `value` and applied. */
async function typeMissing(page: Page, value: string): Promise<void> {
  const missing = threshold(page, MISSING_TITLE);
  await missing.box.fill(value);
  await missing.box.press("Enter");
  await expect(missing.slider).toHaveValue(value);
}

/** The place and size of `locator` on the page, rounded to the pixel. */
async function boxOf(
  locator: Locator,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("the element has no box");
  return {
    x: Math.round(box.x),
    y: Math.round(box.y),
    width: Math.round(box.width),
    height: Math.round(box.height),
  };
}

/** The name of the section that holds the element with the focus, or
    "" for none. */
async function sectionOfFocus(page: Page): Promise<string> {
  return page.evaluate(() => {
    const section = document.activeElement?.closest("section");
    if (section === null || section === undefined) return "";
    const by = section.getAttribute("aria-labelledby");
    return (
      section.getAttribute("aria-label") ??
      (by === null ? "" : (document.getElementById(by)?.textContent ?? ""))
    );
  });
}

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

test("AP4 D3 no button of Undo nor Redo when the page opens, after panel.nei, and after panel_pops.csv is opened, read and given its column; a threshold then shows Undo alone, and axe finds nothing with it, light and dark", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  await expect(undoOrRedo(page)).toHaveCount(0);

  await pick(page, "panel.nei");
  await expectDone(page, "panel.nei");
  await expect(undoOrRedo(page)).toHaveCount(0);

  // A step, then the individuals file, whose opening and column drop it.
  await typeMissing(page, "0.05");
  await expect(undoButton(page)).toBeVisible();
  await pickIndividuals(page, "panel_pops.csv");
  await expect(columnList(page)).toContainText("popcat", { timeout: 20_000 });
  await expect(undoOrRedo(page)).toHaveCount(0);
  await expect(notice(page)).toHaveCount(0);

  await typeMissing(page, "0.04");
  await expect(undoButton(page)).toHaveAccessibleDescription(
    `Undo: ${MISSING_CHANGED}`,
  );
  await expect(redoButton(page)).toHaveCount(0);
  await expectAxeBothSchemes(page, makeAxeBuilder);
});

test("AP4 D3 Undo named by its step in its tooltip on the focus; pressed at the last step, Redo comes, Undo goes, the focus on Redo, neither button moved by a pixel; each said in the status region", async ({
  page,
  makeAxeBuilder,
}) => {
  await recordAnnouncements(page);
  await openPage(page);
  await pick(page, "panel.nei");
  await expectDone(page, "panel.nei");
  await typeMissing(page, "0.05");

  // Reached by the keyboard, whose focus shows the tooltip.
  await heading(page).focus();
  await page.keyboard.press("Tab");
  await expect(undoButton(page)).toBeFocused();
  await expect(page.getByRole("tooltip")).toHaveText(
    `Undo: ${MISSING_CHANGED}`,
  );
  const undoAlone = await boxOf(undoButton(page));

  // A second step and an undo: both shown, Undo where it was alone.
  await typeMissing(page, "0.04");
  await undoButton(page).focus();
  await page.keyboard.press("Enter");
  await expect(redoButton(page)).toBeVisible();
  await expect(undoButton(page)).toBeVisible();
  expect(await boxOf(undoButton(page))).toEqual(undoAlone);
  const redoBeside = await boxOf(redoButton(page));
  await expectAxeBothSchemes(page, makeAxeBuilder);

  // The last step undone: Undo goes, the focus on Redo, which stays.
  await undoButton(page).focus();
  await page.keyboard.press("Enter");
  await expect(undoButton(page)).toHaveCount(0);
  await expect(redoButton(page)).toBeFocused();
  expect(await boxOf(redoButton(page))).toEqual(redoBeside);
  await expect(page.getByRole("tooltip")).toHaveText(
    `Redo: ${MISSING_CHANGED}`,
  );
  await expect
    .poll(async () => (await announced(page)).join(" "))
    .toContain(`Undone: ${MISSING_CHANGED}.`);
  await expect(threshold(page, MISSING_TITLE).slider).toHaveValue("0.1");

  // Redo at its last step: Redo goes, the focus on Undo.
  await page.keyboard.press("Enter");
  await expect(threshold(page, MISSING_TITLE).slider).toHaveValue("0.05");
  await page.keyboard.press("Enter");
  await expect(threshold(page, MISSING_TITLE).slider).toHaveValue("0.04");
  await expect(redoButton(page)).toHaveCount(0);
  await expect(undoButton(page)).toBeFocused();
  expect(await boxOf(undoButton(page))).toEqual(undoAlone);
  await expect
    .poll(async () => (await announced(page)).join(" "))
    .toContain(`Redone: ${MISSING_CHANGED}.`);
  await expect(notice(page)).toHaveCount(0);
});

test("AP4 D3 the FILTER box and the column of the populations: Undo named by each, the undo said in the status region", async ({
  page,
}) => {
  await recordAnnouncements(page);
  await openPage(page);
  await openAndUntick(page);
  await undoButton(page).click();
  await expect(filterBox(page)).toBeChecked();
  await expect
    .poll(async () => (await announced(page)).join(" "))
    .toContain(`Undone: ${KEPT}.`);
  await expect(redoButton(page)).toHaveAccessibleDescription(`Redo: ${KEPT}`);

  await pickIndividuals(page, "panel_pops.csv");
  await expect(columnList(page)).toContainText("popcat", { timeout: 20_000 });
  await expect(undoOrRedo(page)).toHaveCount(0);
  await chooseColumn(page, "None: every individual unclassified");
  await expect(undoButton(page)).toHaveAccessibleDescription(
    `Undo: ${COLUMN_CHANGED}`,
  );
  await undoButton(page).click();
  await expect(columnList(page)).toContainText("popcat");
  await expect
    .poll(async () => (await announced(page)).join(" "))
    .toContain(`Undone: ${COLUMN_CHANGED}.`);
  await expect(redoButton(page)).toHaveAccessibleDescription(
    `Redo: ${COLUMN_CHANGED}`,
  );
});

test("AP4 D3 opening a file starts the history afresh: Undo shown by a click of the FILTER box, gone after a second file and a third, with the box as the user left it and no notice", async ({
  page,
}) => {
  await openPage(page);
  await openAndUntick(page);
  await expect(redoButton(page)).toHaveCount(0);

  await pick(page, "panel.nei");
  await expectDone(page, "panel.nei");
  await expect(undoOrRedo(page)).toHaveCount(0);
  await expect(notice(page)).toHaveCount(0);

  // An undo and a redo left behind are gone too.
  await pick(page, "low_qual.nei");
  await expectDone(page, "low_qual.nei");
  await expect(filterBox(page)).not.toBeChecked();
  await clickBox(page);
  await expect(filterBox(page)).toBeChecked();
  await undoButton(page).click();
  await expect(filterBox(page)).not.toBeChecked();
  await expect(redoButton(page)).toBeVisible();

  await pick(page, "panel.vcf.gz");
  await expectDone(page, "panel.vcf.gz");
  await expect(undoOrRedo(page)).toHaveCount(0);
  await expect(filterBox(page)).not.toBeChecked();
  await expect(notice(page)).toHaveCount(0);
});

test("AP4 D3 Ctrl+Z and Meta+Z undo, and Ctrl+Y, Ctrl+Shift+Z and Meta+Shift+Z redo, a click of the FILTER box, on the heading", async ({
  page,
}) => {
  await openPage(page);
  await openAndUntick(page);
  await heading(page).focus();

  await page.keyboard.press("Control+z");
  await expect(filterBox(page)).toBeChecked();
  await expect(undoButton(page)).toHaveCount(0);
  await page.keyboard.press("Control+y");
  await expect(filterBox(page)).not.toBeChecked();
  await expect(redoButton(page)).toHaveCount(0);
  await page.keyboard.press("Control+z");
  await expect(filterBox(page)).toBeChecked();
  await page.keyboard.press("Control+Shift+z");
  await expect(filterBox(page)).not.toBeChecked();
  await page.keyboard.press("Meta+z");
  await expect(filterBox(page)).toBeChecked();
  await page.keyboard.press("Meta+Shift+z");
  await expect(filterBox(page)).not.toBeChecked();
  // With no step to redo, the keys do nothing.
  await page.keyboard.press("Control+y");
  await expect(filterBox(page)).not.toBeChecked();
  await expect(heading(page)).toBeFocused();
  await expectDone(page, "panel.vcf.gz");
  await expect(notice(page)).toHaveCount(0);
});

test("AP4 D3 Ctrl+Z and Meta+Z on a line and in a box with nothing typed undo; on a line whose run of the arrow keys waits, the threshold goes back to where the presses started", async ({
  page,
}) => {
  await openPage(page);
  await pick(page, "panel.vcf.gz");
  await expectDone(page, "panel.vcf.gz");
  const missing = threshold(page, MISSING_TITLE);
  await typeMissing(page, "0.05");
  await typeMissing(page, "0.04");
  await typeMissing(page, "0.03");

  await missing.slider.focus();
  await page.keyboard.press("Control+z");
  await expect(missing.slider).toHaveValue("0.04");
  await missing.box.focus();
  await page.keyboard.press("Meta+z");
  await expect(missing.slider).toHaveValue("0.05");
  await expect(missing.box).toHaveValue("0.05");

  // A run of three presses on the line, waiting: the page's timers stand
  // still from here, so that the run waits at the keys whatever the
  // speed of the machine.
  await page.clock.install();
  await page.clock.pauseAt(Date.now() + 1000);
  await missing.slider.focus();
  for (let press = 0; press < 3; press += 1) {
    await page.keyboard.press("ArrowLeft");
  }
  await expect(missing.slider).toHaveValue("0.047");
  await expect(undoButton(page)).toHaveAccessibleDescription(
    `Undo: ${MISSING_CHANGED}`,
  );
  await expect(redoButton(page)).toHaveCount(0);
  await page.keyboard.press("Control+z");
  await expect(missing.slider).toHaveValue("0.05");
  await expect(missing.box).toHaveValue("0.05");
  await expect(redoButton(page)).toHaveAccessibleDescription(
    `Redo: ${MISSING_CHANGED}`,
  );
  await expect(notice(page)).toHaveCount(0);
});

test("AP4 D3 0.9 typed in the box of the MAF and not applied, Ctrl+Z: the box back to its number, the page undoes nothing, and Undo still names the step before", async ({
  page,
}) => {
  await openPage(page);
  await openAndUntick(page);
  const maf = threshold(page, "Major allele frequency");
  await maf.box.fill("0.9");
  await maf.box.press("ControlOrMeta+z");
  await expect(maf.box).toHaveValue("1");
  await expect(maf.slider).toHaveValue("1");
  await expect(filterBox(page)).not.toBeChecked();
  await expect(undoButton(page)).toHaveAccessibleDescription(`Undo: ${KEPT}`);

  // Typed and applied, Ctrl+Z in the box with nothing typed is the page's.
  await maf.box.fill("0.9");
  await maf.box.press("Enter");
  await expect(undoButton(page)).toHaveAccessibleDescription(`Undo: ${MAF_ON}`);
  await maf.box.press("ControlOrMeta+z");
  await expect(maf.box).toHaveValue("1");
  await expect(maf.slider).toHaveValue("1");
  await expect(undoButton(page)).toHaveAccessibleDescription(`Undo: ${KEPT}`);
});

test("AP4 D3 Redo with the focus, removed by an individuals file dropped on its box, which leaves the focus where it was: the focus on the heading; a click of the FILTER box takes the focus off Redo before its command, in Chromium and WebKit alike", async ({
  page,
}) => {
  await openPage(page);
  await openAndUntick(page);
  await clickBox(page);
  await undoButton(page).click();
  await redoButton(page).focus();
  await expect(redoButton(page)).toBeFocused();

  // A drop moves no focus; the opening starts the history afresh.
  const pops = await readFile(join(FIXTURES, "panel_pops.csv"), "utf8");
  await dropFiles(
    page,
    individualsBox(page).getByRole("button", {
      name: /^Open (another )?individuals file…$/u,
    }),
    [{ name: "panel_pops.csv", text: pops }],
  );
  await expect(columnList(page)).toContainText("popcat", { timeout: 20_000 });
  await expect(undoOrRedo(page)).toHaveCount(0);
  await expect(heading(page)).toBeFocused();

  // The click of the FILTER box: the press of the mouse on its words, no
  // control, takes the focus off Redo before the command removes it, so
  // the next Tab starts from the box, as after any click.
  await clickBox(page);
  await undoButton(page).click();
  await redoButton(page).focus();
  await clickBox(page);
  await expect(redoButton(page)).toHaveCount(0);
  await expect(heading(page)).not.toBeFocused();
});

test("AP4 D3 the Tab key goes from Undo to Redo and then into the box of the variants file, and Shift+Tab from Undo leaves the line", async ({
  page,
}) => {
  await openPage(page);
  await openAndUntick(page);
  // Undo and Redo both shown.
  await clickBox(page);
  await undoButton(page).click();
  await expect(redoButton(page)).toBeVisible();
  await expect(undoButton(page)).toBeVisible();

  await undoButton(page).focus();
  await page.keyboard.press("Tab");
  await expect(redoButton(page)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect.poll(() => sectionOfFocus(page)).toBe("Variants file");
});

for (const width of [1280, 320] as const) {
  test(`AP4 D3 at ${String(width)} pixels the line of the heading has the same height with and without the buttons, which stand on it at its right end, and the page does not scroll sideways`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await openPage(page);
    const without = await boxOf(headingLine(page));
    await openAndUntick(page);
    await clickBox(page);
    await undoButton(page).click();
    await expect(redoButton(page)).toBeVisible();
    const line = await boxOf(headingLine(page));
    expect(line).toEqual(without);
    const title = await boxOf(heading(page));
    const undo = await boxOf(undoButton(page));
    const redo = await boxOf(redoButton(page));
    for (const button of [undo, redo]) {
      expect(button.y).toBeGreaterThanOrEqual(line.y);
      expect(button.y + button.height).toBeLessThanOrEqual(
        line.y + line.height,
      );
    }
    expect(undo.x).toBeGreaterThan(title.x + title.width);
    expect(redo.x).toBeGreaterThan(undo.x + undo.width);
    expect(redo.x + redo.width).toBeLessThanOrEqual(line.x + line.width);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
}

test("AP4 D3 the commands undo and redo of document.execCommand, with the focus on the heading or in a box whose number was typed and committed, leave the number, the line and the threshold", async ({
  page,
}) => {
  await openPage(page);
  await pick(page, "panel.vcf.gz");
  await expectDone(page, "panel.vcf.gz");
  const maf = threshold(page, "Major allele frequency");
  // 0.9 typed over the 1 of a threshold that is off, and committed.
  await maf.box.fill("0.9");
  await maf.box.press("Enter");
  await expect(maf.slider).toHaveValue("0.9");
  // The browser's undo and redo given as commands, a stand-in for its
  // menu Edit, which no flow can click: Chromium carries them out with no
  // beforeinput to cancel, only an input after the text changed; WebKit
  // offers them in a beforeinput, as it does the keys. Neither is the
  // page's Undo.
  const command = async (name: "undo" | "redo"): Promise<void> => {
    await page.evaluate(
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- the only way a page gives the browser's own undo, which the box must withstand
      (n) => document.execCommand(n),
      name,
    );
  };
  const expectKept = async (): Promise<void> => {
    await expect(maf.box).toHaveValue("0.9");
    await expect(maf.slider).toHaveValue("0.9");
    await expect(maf.box).not.toHaveAttribute("data-muted");
    await expect(undoButton(page)).toHaveAccessibleDescription(
      `Undo: ${MAF_ON}`,
    );
  };

  await heading(page).focus();
  await command("undo");
  await command("redo");
  await command("undo");
  // The focus may have gone into the box; Tab commits it as it leaves.
  await page.keyboard.press("Tab");
  await expectKept();

  await maf.box.focus();
  await command("undo");
  await expect(maf.box).toHaveValue("0.9");
  await command("redo");
  await command("undo");
  await page.keyboard.press("Tab");
  await expectKept();

  // With 0.95 typed and not committed, the undo puts back 0.9.
  await maf.box.focus();
  await maf.box.press("End");
  await maf.box.pressSequentially("5");
  await expect(maf.box).toHaveValue("0.95");
  await command("undo");
  await expect(maf.box).toHaveValue("0.9");
  await page.keyboard.press("Tab");
  await expectKept();
});

test("SF7 round a file opened while the pass of the file before it runs starts its own pass, with no Undo and no Stop said", async ({
  page,
}) => {
  await holdSummary(page);
  await openPage(page);
  const stop = info(page).getByRole("button", { name: "Stop" });
  // Seen: the line of each part keeps the room of its words of a Stop,
  // hidden, while plots are drawn or coming.
  const stopped = stats(page)
    .getByText(/^Stopped\./u)
    .filter({ visible: true });
  await pick(page, "panel.vcf.gz");
  await expect(stop).toBeVisible();
  await clickBox(page);
  await expect(filterBox(page)).not.toBeChecked();
  await expect(undoButton(page)).toBeVisible();

  // panel.vcf.gz is still read when panel.nei is opened over it.
  await pick(page, "panel.nei");
  await expect(info(page).getByText("panel.nei")).toBeVisible();
  await expect(stop).toBeVisible();
  await expect(stopped).toHaveCount(0);
  await expect(undoOrRedo(page)).toHaveCount(0);
  await expect(notice(page)).toHaveCount(0);

  await release(page, "result");
  await expectDone(page, "panel.nei");
  await expect(stopped).toHaveCount(0);
});
