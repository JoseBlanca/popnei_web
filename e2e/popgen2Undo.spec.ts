/**
 * Undo, Redo and the notice on popgen2.html, on the built site
 * (docs/plans/filters.md, work package 6; docs/specs/steps/popgen2-filters.md,
 * "Undo, Redo and their keys", "The notice" and "Accessibility"): the
 * row of the shell's Undo and Redo above the box of the file, there
 * before any file; the notice of a second file opened, whose Undo brings
 * the first file back with its plots; the keys of Undo and Redo; the
 * focus handed from a button that becomes disabled to the other; the
 * order of the Tab key from Undo; F6 to the notice and Escape back; axe
 * with the notice up; at 320 pixels, the last control of the page
 * never under the notice (WCAG 2.4.11), and the page not scrolled back to
 * it when it grows while the user reads elsewhere; the keys of Undo and
 * Redo kept by the line and the box of a threshold; and an undo and a
 * redo while a file is read, which start its pass again and show no
 * Stop the user did not press.
 *
 * No threshold changes the project yet (work package 9), so the notice
 * met here is that of a second file opened. The store takes the
 * statistics out of that notice once those of the new file are done, and
 * drops the notice with them, which for panel.nei is within a second; so
 * the flows that need the notice up hold the pass of the second file with
 * holdWorker.ts. panel.vcf.gz and panel.nei hold the same 1,200 variants
 * of 200 individuals, counted by popnei.
 */
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";
import { holdSummary, release } from "./holdWorker.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The words of the notice after panel.nei is opened over panel.vcf.gz
    once the statistics of panel.vcf.gz are done. */
const REMOVED = "Statistics of the file removed because panel.nei opened";

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

function notice(page: Page): Locator {
  return page.getByRole("region", { name: "Notice" });
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

/** Opens panel.vcf.gz, waits for its statistics, then opens panel.nei
    over it and waits for its statistics too. */
async function openTwo(page: Page): Promise<void> {
  await pick(page, "panel.vcf.gz");
  await expectDone(page, "panel.vcf.gz");
  await pick(page, "panel.nei");
  await expectDone(page, "panel.nei");
}

/** Opens the page with the passes held, opens panel.vcf.gz and lets its
    pass end, then opens panel.nei, whose pass is held, so that the
    notice of the statistics removed stays up. */
async function openTwoHeld(page: Page): Promise<void> {
  await holdSummary(page);
  await openPage(page);
  await pick(page, "panel.vcf.gz");
  await release(page, "oneResult");
  await expectDone(page, "panel.vcf.gz");
  await pick(page, "panel.nei");
  // Read, and its pass running and held.
  await expect(info(page).getByRole("button", { name: "Stop" })).toBeVisible();
  await expect(notice(page).getByRole("alertdialog")).toHaveAccessibleName(
    REMOVED,
  );
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

test("SF6 D2 the row of Undo and Redo is above the box of the file before any file, both disabled, and the first file opened gives no notice", async ({
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
  await expect(undoButton(page)).toBeEnabled();
  await expect(undoButton(page)).toHaveAccessibleDescription(
    "Undo: panel.vcf.gz opened",
  );
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
});

test("SF6 D2 a second file gives the notice of the statistics removed, whose Undo brings back the first file and its plots, and Redo the second", async ({
  page,
  makeAxeBuilder,
}) => {
  await openTwoHeld(page);

  await expect(
    notice(page).getByRole("button", { name: "Undo", exact: true }),
  ).toBeVisible();
  await expect(
    notice(page).getByRole("button", { name: "Close", exact: true }),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  await notice(page).getByRole("button", { name: "Undo", exact: true }).click();
  await expectDone(page, "panel.vcf.gz");
  await expect(info(page).getByText("panel.nei")).toHaveCount(0);
  await expect(redoButton(page)).toHaveAccessibleDescription(
    "Redo: panel.nei opened",
  );

  await redoButton(page).click();
  await expect(info(page).getByText("panel.nei")).toBeVisible();
  await expect(info(page).getByText("panel.vcf.gz")).toHaveCount(0);
});

test("SF6 D2 Ctrl+Z undoes and Ctrl+Y and Ctrl+Shift+Z redo the opening of a file, and Cmd+Z and Cmd+Shift+Z in WebKit", async ({
  page,
  browserName,
}) => {
  await openPage(page);
  await openTwo(page);
  await page.getByRole("heading", { level: 1 }).focus();

  await page.keyboard.press("Control+z");
  await expectDone(page, "panel.vcf.gz");
  await page.keyboard.press("Control+y");
  await expectDone(page, "panel.nei");
  await expect(redoButton(page)).toBeDisabled();
  await page.keyboard.press("Control+z");
  await expectDone(page, "panel.vcf.gz");
  await page.keyboard.press("Control+Shift+z");
  await expectDone(page, "panel.nei");

  if (browserName === "webkit") {
    await page.keyboard.press("Meta+z");
    await expectDone(page, "panel.vcf.gz");
    await page.keyboard.press("Meta+Shift+z");
    await expectDone(page, "panel.nei");
  }
});

test("SF6 D2 the button that had the focus and becomes disabled hands it to the other", async ({
  page,
}) => {
  await openPage(page);
  await openTwo(page);

  await undoButton(page).focus();
  await page.keyboard.press("Enter");
  await expectDone(page, "panel.vcf.gz");
  await expect(undoButton(page)).toBeFocused();
  // The first opening undone: no file, nothing more to undo.
  await page.keyboard.press("Enter");
  await expect(info(page)).toHaveCount(0);
  await expect(undoButton(page)).toBeDisabled();
  await expect(redoButton(page)).toBeFocused();

  await page.keyboard.press("Enter");
  await expectDone(page, "panel.vcf.gz");
  await expect(redoButton(page)).toBeFocused();
  await page.keyboard.press("Enter");
  await expectDone(page, "panel.nei");
  await expect(redoButton(page)).toBeDisabled();
  await expect(undoButton(page)).toBeFocused();
});

test("SF6 D2 the Tab key goes from Undo to Redo and then into the statistics, and from the statistics to the open button", async ({
  page,
}) => {
  await openPage(page);
  await openTwo(page);
  // Redo enabled, panel.vcf.gz back and done: the box holds no Stop and
  // no Start again.
  await undoButton(page).click();
  await expectDone(page, "panel.vcf.gz");

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

test("SF6 D2 while the second file is read, the Tab key goes from Undo to its Stop, F6 reaches the notice and Escape goes back", async ({
  page,
}) => {
  await openTwoHeld(page);

  // Redo is disabled, which the Tab key passes over.
  await undoButton(page).focus();
  await page.keyboard.press("Tab");
  await expect(info(page).getByRole("button", { name: "Stop" })).toBeFocused();

  await page.keyboard.press("F6");
  await expect(notice(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(info(page).getByRole("button", { name: "Stop" })).toBeFocused();
});

test("SF6 D2 at 320 pixels, with the notice up and the focus on the open button, the last control of the page, the notice is not over it", async ({
  page,
  makeAxeBuilder,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await openTwoHeld(page);

  /** Expects the open button above the notice, to less than a pixel, as
      the flows of the shell do, since WebKit scrolls by whole pixels;
      polled, since the notice keeps its room after a layout. */
  const expectAboveTheNotice = async (): Promise<void> => {
    await expect
      .poll(async () => {
        const button = await openButton(page).boundingBox();
        const region = await notice(page).boundingBox();
        if (button === null || region === null) return Infinity;
        return button.y + button.height - region.y;
      })
      .toBeLessThan(1);
  };
  // The open button, which picked the file, keeps the focus, and the
  // notice that appeared over it scrolled it clear.
  await expect(openButton(page)).toBeFocused();
  await expectAboveTheNotice();
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await expectAboveTheNotice();
  await expectNoViolations(makeAxeBuilder);
});

/** The histogram of the major allele frequency: its line and its box. */
function mafThreshold(page: Page): {
  readonly slider: Locator;
  readonly box: Locator;
} {
  const group = stats(page).getByRole("group", {
    name: "Major allele frequency",
    exact: true,
  });
  return { slider: group.getByRole("slider"), box: group.getByRole("textbox") };
}

test("SF6 D2 Ctrl+Z, Ctrl+Y and Ctrl+Shift+Z on the line or in the box of a threshold leave the file open, and Cmd+Z in WebKit", async ({
  page,
  browserName,
}) => {
  await openPage(page);
  await pick(page, "panel.vcf.gz");
  await expectDone(page, "panel.vcf.gz");
  const { slider, box } = mafThreshold(page);
  const keys = [
    "Control+z",
    "Control+y",
    "Control+Shift+z",
    ...(browserName === "webkit" ? ["Meta+z", "Meta+Shift+z"] : []),
  ];

  await slider.focus();
  await page.keyboard.press("ArrowLeft");
  for (const key of keys) {
    await page.keyboard.press(key);
    await expect(slider).toBeFocused();
  }
  await box.focus();
  for (const key of keys) {
    await page.keyboard.press(key);
    await expect(box).toBeFocused();
  }

  await expectDone(page, "panel.vcf.gz");
  await expect(undoButton(page)).toHaveAccessibleDescription(
    "Undo: panel.vcf.gz opened",
  );
  await expect(redoButton(page)).toBeDisabled();
});

test("SF6 D2 an undo and a redo while the file is read start each pass again, and the page never says it was stopped", async ({
  page,
}) => {
  await holdSummary(page);
  await openPage(page);
  const stop = info(page).getByRole("button", { name: "Stop" });
  const stopped = stats(page).getByText(/^Stopped\./u);
  await pick(page, "panel.vcf.gz");
  await expect(stop).toBeVisible();
  // panel.vcf.gz is still read when panel.nei is opened over it.
  await pick(page, "panel.nei");
  await expect(info(page).getByText("panel.nei")).toBeVisible();
  await expect(stop).toBeVisible();

  await undoButton(page).click();
  await expect(info(page).getByText("panel.vcf.gz")).toBeVisible();
  await expect(stop).toBeVisible();
  await expect(stopped).toHaveCount(0);

  await redoButton(page).click();
  await expect(info(page).getByText("panel.nei")).toBeVisible();
  await expect(stop).toBeVisible();
  await expect(stopped).toHaveCount(0);
  await release(page, "result");
  await expectDone(page, "panel.nei");
});

test("SF6 D2 at 320 pixels, with the notice up, the page that grows while the user reads its top does not scroll back to the focused control", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await openTwoHeld(page);
  await expect(openButton(page)).toBeFocused();

  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  const scrolled = await page.evaluate(async () => {
    const grown = document.createElement("div");
    grown.style.height = "200px";
    document.body.append(grown);
    // The observer of the page's size answers before the next paint.
    for (let frame = 0; frame < 3; frame += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return window.scrollY;
  });

  expect(scrolled).toBe(0);
});
