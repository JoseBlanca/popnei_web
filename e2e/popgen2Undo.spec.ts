/**
 * No Undo and no Redo on popgen2.html, on the built site
 * (docs/specs/steps/popgen2-filters.md, "Undo, Redo and their keys"): the
 * owner hid the row of Undo and Redo, and their keys, on 8 October 2026,
 * until a later feature needs them. So the page has no button Undo nor
 * Redo, before a file or after one and its changes, and Ctrl+Z,
 * Ctrl+Y and Ctrl+Shift+Z, and Cmd+Z and Cmd+Shift+Z, change
 * neither the FILTER box nor a threshold, pressed on the heading, on the
 * line of a threshold while its run of the keys waits and after, and in
 * its box with nothing typed. A file opened while the pass of the file
 * before it runs starts its own pass, and is never said to be stopped.
 *
 * panel.vcf.gz and panel.nei hold the same 1,200 variants of 200
 * individuals, counted by popnei; panel.vcf.gz records the FILTER of its
 * variants. The MAF's axis goes from 0.45 to 1 by 0.01, the missing
 * rate's from 0 to 0.1 by 0.001.
 */
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";
import { holdSummary, release } from "./holdWorker.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

const LABEL = "Leave out the variants that failed their FILTER";

async function openPage(page: Page): Promise<void> {
  await page.goto("popgen2.html");
  await expect(
    page.getByRole("heading", { level: 1, name: "Popnei" }),
  ).toBeVisible();
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

/** The group of the histogram titled `title`, its box and its line. */
function threshold(
  page: Page,
  title: string,
): { readonly box: Locator; readonly slider: Locator } {
  const group = stats(page).getByRole("group", { name: title, exact: true });
  return { box: group.getByRole("textbox"), slider: group.getByRole("slider") };
}

/** Every key of Undo and Redo, those of Windows and Linux and those of
    macOS: the browser's own undo of a text is Ctrl+Z on the first two and
    Cmd+Z on macOS, so pressing both reaches it wherever the flow runs. */
const UNDO_KEYS: readonly string[] = [
  "Control+z",
  "Control+y",
  "Control+Shift+z",
  "Meta+z",
  "Meta+Shift+z",
];

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

test("SF6 the page has no button of Undo nor Redo, before a file, after one and after a click of the FILTER box, and no notice", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  await expect(undoOrRedo(page)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  await pick(page, "panel.vcf.gz");
  await expectDone(page, "panel.vcf.gz");
  await clickBox(page);
  await expect(filterBox(page)).not.toBeChecked();
  await expect(undoOrRedo(page)).toHaveCount(0);
  await expect(notice(page)).toHaveCount(0);
  // The box of the file comes right under the heading.
  const heading = await page.getByRole("heading", { level: 1 }).boundingBox();
  const box = await info(page).boundingBox();
  if (heading === null || box === null) throw new Error("not laid out");
  expect(box.y).toBeGreaterThan(heading.y + heading.height - 1);
  await expectNoViolations(makeAxeBuilder);
});

test("SF6 the keys of Undo and Redo on the heading, on the line of a threshold while its run waits and after, and in its box, change neither the FILTER box nor a threshold", async ({
  page,
}) => {
  await openPage(page);
  await pick(page, "panel.vcf.gz");
  await expectDone(page, "panel.vcf.gz");
  const maf = threshold(page, "Major allele frequency");
  const missing = threshold(page, "Proportion of missing genotypes");
  await clickBox(page);
  await expect(filterBox(page)).not.toBeChecked();
  await maf.box.fill("0.9");
  await maf.box.press("Enter");
  await expect(maf.box).toHaveValue("0.9");
  const expectKept = async (missingRate: string): Promise<void> => {
    await expect(filterBox(page)).not.toBeChecked();
    await expect(maf.box).toHaveValue("0.9");
    await expect(maf.slider).toHaveValue("0.9");
    await expect(missing.box).toHaveValue(missingRate);
    await expect(missing.slider).toHaveValue(missingRate);
  };

  // The browser's undo pressed on the heading went into the box to take
  // its 0.9 back, in Chromium; the focus stays on the heading.
  const heading = page.getByRole("heading", { level: 1 });
  await heading.focus();
  await expect(heading).toBeFocused();
  for (const key of UNDO_KEYS) await page.keyboard.press(key);
  await expect(heading).toBeFocused();
  await expectKept("0.1");

  // A run of three presses on the line, waiting: the keys leave it where
  // the presses took it. The page's timers stand still from here, so that
  // the run waits at the keys whatever the speed of the machine.
  await page.clock.install();
  await page.clock.pauseAt(Date.now() + 1000);
  await missing.slider.focus();
  for (let press = 0; press < 3; press += 1) {
    await page.keyboard.press("ArrowLeft");
  }
  await expect(missing.slider).toHaveValue("0.097");
  for (const key of UNDO_KEYS) await page.keyboard.press(key);
  await expectKept("0.097");
  await missing.box.focus();
  for (const key of UNDO_KEYS) await page.keyboard.press(key);
  await page.keyboard.press("Tab");
  await expectKept("0.097");

  // The box of the MAF, whose 0.9 was typed and committed: nothing typed
  // is left in it for the keys to take back.
  await maf.box.focus();
  for (const key of UNDO_KEYS) await page.keyboard.press(key);
  await page.keyboard.press("Tab");
  await expectKept("0.097");

  await heading.focus();
  for (const key of UNDO_KEYS) await page.keyboard.press(key);
  await expect(heading).toBeFocused();
  await expectKept("0.097");
  await expect(notice(page)).toHaveCount(0);
});

test("SF6 the browser's undo key in a box whose number was typed and committed leaves the number, the line and the threshold", async ({
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

  await maf.box.press("ControlOrMeta+z");
  await expect(maf.box).toHaveValue("0.9");
  await expect(maf.slider).toHaveValue("0.9");
  await maf.box.press("ControlOrMeta+Shift+z");
  await expect(maf.box).toHaveValue("0.9");
  // The box committed again as the focus leaves it: still 0.9, on.
  await page.keyboard.press("Tab");
  await expect(maf.box).toHaveValue("0.9");
  await expect(maf.slider).toHaveValue("0.9");
  await expect(maf.box).not.toHaveAttribute("data-muted");
});

test("SF6 the commands undo and redo of document.execCommand, with the focus on the heading or in a box whose number was typed and committed, leave the number, the line and the threshold", async ({
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
  // offers them in a beforeinput, as it does the keys.
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
  };

  const heading = page.getByRole("heading", { level: 1 });
  await heading.focus();
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

test("SF7 round a file opened while the pass of the file before it runs starts its own pass, and no Stop is said", async ({
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

  // panel.vcf.gz is still read when panel.nei is opened over it.
  await pick(page, "panel.nei");
  await expect(info(page).getByText("panel.nei")).toBeVisible();
  await expect(stop).toBeVisible();
  await expect(stopped).toHaveCount(0);
  await expect(notice(page)).toHaveCount(0);

  await release(page, "result");
  await expectDone(page, "panel.nei");
  await expect(stopped).toHaveCount(0);
});
