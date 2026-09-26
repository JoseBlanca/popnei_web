/**
 * The shell of the population genetics application on the built site
 * (docs/specs/shell.md, "How it is checked"): the stepper, the summary
 * line and Undo and Redo in the states empty, ready, running and done,
 * with axe in each; Undo pressed with the mouse until nothing is left,
 * the focus on Redo; the keyboard's Undo and Redo, and a text field that
 * keeps them; the text of the status region after each read of the
 * Variants step and of the metadata file; and the notice of results
 * removed, with axe, which F6 reaches, and whose Undo, Redo and Close do
 * what they say and give the focus back to where it was.
 */
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

async function openPopgen(page: Page): Promise<void> {
  await page.goto("popgen.html#variants");
  await expect(
    page.getByRole("heading", { level: 1, name: "Variants" }),
  ).toBeVisible();
}

function steps(page: Page): Locator {
  return page.getByRole("navigation", { name: "Steps" });
}

function stepLink(page: Page, name: string): Locator {
  return steps(page).getByRole("link", { name });
}

function header(page: Page): Locator {
  return page.getByRole("banner");
}

function undoButton(page: Page): Locator {
  return header(page).getByRole("button", { name: "Undo", exact: true });
}

function redoButton(page: Page): Locator {
  return header(page).getByRole("button", { name: "Redo", exact: true });
}

/** Expects the summary line to be `text`, whole. */
async function expectSummary(page: Page, text: string): Promise<void> {
  await expect(page.getByText(text, { exact: true })).toBeVisible();
}

/** The shell's status region, the last of the page's two. */
function status(page: Page): Locator {
  return page.getByRole("status").last();
}

/** Goes to a step by its link in the stepper. */
async function goTo(page: Page, step: string): Promise<void> {
  await stepLink(page, step).click();
  await expect(
    page.getByRole("heading", { level: 1, name: step }),
  ).toBeVisible();
}

/** Picks the fixture `fixture` with the button of the zone `region`. */
async function pick(
  page: Page,
  region: string,
  fixture: string,
): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: region })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (await chooser).setFiles(join(FIXTURES, fixture));
}

/** Chooses the column of the populations `column`, with the mouse. */
async function chooseColumn(page: Page, column: string): Promise<void> {
  await page
    .getByRole("button", { name: "Column that defines the populations" })
    .click();
  await page.getByRole("option", { name: column, exact: true }).click();
}

/** Loads panel.nei and panel_pops.csv, chooses the column popcat, and
    stays at the Individuals step. */
async function loadPanel(page: Page): Promise<void> {
  await pick(page, "Variants file", "panel.nei");
  await expect(stepLink(page, "Variants")).toHaveAccessibleName(
    "Variants, Done",
  );
  await goTo(page, "Individuals");
  await pick(page, "Metadata file", "panel_pops.csv");
  await chooseColumn(page, "popcat");
  await expect(stepLink(page, "Individuals")).toHaveAccessibleName(
    "Individuals, Done",
  );
}

/** Makes the calculation worker keep its results back, so that a
    calculation stays under way. */
async function holdResults(page: Page): Promise<void> {
  await expect
    .poll(() => page.workers().some((w) => w.url().includes("runnerWorker")))
    .toBe(true);
  const worker = page.workers().find((w) => w.url().includes("runnerWorker"));
  if (worker === undefined) throw new Error("no calculation worker");
  await worker.evaluate(() => {
    const scope = globalThis as unknown as {
      postMessage: (message: unknown, transfer?: Transferable[]) => void;
    };
    const post = scope.postMessage.bind(scope);
    scope.postMessage = (message, transfer) => {
      const kind =
        typeof message === "object" && message !== null && "kind" in message
          ? message.kind
          : null;
      if (kind !== "result") post(message, transfer);
    };
  });
}

test("WS9 D3 the shell empty: Undo and Redo disabled, each step To do or Locked with its reason, the summary of the first project, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPopgen(page);

  await expect(undoButton(page)).toBeDisabled();
  await expect(redoButton(page)).toBeDisabled();
  const links = steps(page).getByRole("link");
  await expect(links.nth(0)).toHaveAccessibleName("Variants, To do");
  await expect(links.nth(1)).toHaveAccessibleName("Individuals, To do");
  await expect(links.nth(2)).toHaveAccessibleName("Analyses, Locked");
  await expect(links.nth(0)).toHaveAccessibleDescription(
    "Load a variants file in the Variants step.",
  );
  await expect(links.nth(1)).toHaveAccessibleDescription(
    "Load a metadata file in the Individuals step.",
  );
  await expect(links.nth(2)).toHaveAccessibleDescription(
    "Load a variants file in the Variants step.",
  );
  await expectSummary(page, "No variants file · 1 filter · no metadata file");
  await expectNoViolations(makeAxeBuilder);

  // The reason shown as a tooltip when the keyboard reaches the link.
  await stepLink(page, "Analyses").focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("tooltip")).toHaveText(
    "Load a variants file in the Variants step.",
  );
  await expectNoViolations(makeAxeBuilder);
});

test("WS9 D3 the shell ready: every step with its state, the summary with the file, its individuals, the filter and the populations, Undo described, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPopgen(page);
  await loadPanel(page);

  await expect(stepLink(page, "Analyses")).toHaveAccessibleName(
    "Analyses, Ready",
  );
  await expect(stepLink(page, "Variants")).not.toHaveAttribute(
    "aria-describedby",
  );
  await expectSummary(
    page,
    "panel.nei · 200 individuals · 1 filter · 3 populations by popcat",
  );
  await expect(undoButton(page)).toBeEnabled();
  await expect(undoButton(page)).toHaveAccessibleDescription(
    "Undo: the column of the populations changed",
  );
  await expect(redoButton(page)).toBeDisabled();
  await expectNoViolations(makeAxeBuilder);
});

test("WS9 D3 the shell running: Analyses at Running, the start in the status region, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPopgen(page);
  await loadPanel(page);
  await holdResults(page);
  await goTo(page, "Analyses");
  await page.getByRole("button", { name: "Run" }).click();

  await expect(stepLink(page, "Analyses")).toHaveAccessibleName(
    "Analyses, Running",
  );
  await expect(status(page)).toHaveText("Diversity: calculating.");
  await expectNoViolations(makeAxeBuilder);
});

test("WS9 D3 the shell done: Analyses at Done, the end in the status region, the variants counted in the summary, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPopgen(page);
  await loadPanel(page);
  await goTo(page, "Analyses");
  await page.getByRole("button", { name: "Run" }).click();

  await expect(page.getByRole("rowheader", { name: "p0" })).toBeVisible();
  await expect(stepLink(page, "Analyses")).toHaveAccessibleName(
    "Analyses, Done",
  );
  // The start and the end, together when the end comes within the pause
  // of the announcer.
  await expect(status(page)).toHaveText(
    /^(Diversity: calculating\. )?Diversity: done\.$/,
  );
  await expectSummary(
    page,
    "panel.nei · 200 individuals · 1,200 variants · 1 filter · 3 populations by popcat",
  );
  await expectNoViolations(makeAxeBuilder);
});

test("WS9 D3 Undo pressed with the mouse until nothing is left puts the focus on Redo, and Redo until nothing is left on Undo", async ({
  page,
}) => {
  await openPopgen(page);
  await pick(page, "Variants file", "panel.nei");
  // The read announced, before the undo is.
  await expect(status(page)).toHaveText(
    "panel.nei read: 200 individuals, ploidy 2.",
  );
  const threshold = page.getByLabel("Maximum proportion of missing genotypes");
  await threshold.fill("0.05");
  await threshold.press("Enter");
  await expect(undoButton(page)).toHaveAccessibleDescription(
    "Undo: the missing data filter changed",
  );

  await undoButton(page).click();
  await expect(threshold).toHaveValue("0.1");
  await expect(status(page)).toHaveText(
    "Undone: the missing data filter changed.",
  );
  await expect(undoButton(page)).toBeFocused();
  await expect(redoButton(page)).toHaveAccessibleDescription(
    "Redo: the missing data filter changed",
  );

  await undoButton(page).click();
  await expectSummary(page, "No variants file · 1 filter · no metadata file");
  await expect(undoButton(page)).toBeDisabled();
  await expect(redoButton(page)).toBeFocused();

  await redoButton(page).click();
  await expect(redoButton(page)).toBeFocused();
  await redoButton(page).click();
  await expect(threshold).toHaveValue("0.05");
  await expect(redoButton(page)).toBeDisabled();
  await expect(undoButton(page)).toBeFocused();
  // After the texts of the presses within the pause of the announcer.
  await expect(status(page)).toHaveText(
    /Redone: the missing data filter changed\.$/,
  );
});

test("WS9 D3 Ctrl+Z undoes and Ctrl+Shift+Z and Ctrl+Y redo, and in a text field they belong to the text", async ({
  page,
}) => {
  await openPopgen(page);
  await pick(page, "Variants file", "panel.nei");
  // The read announced, before the undo is.
  await expect(status(page)).toHaveText(
    "panel.nei read: 200 individuals, ploidy 2.",
  );
  const threshold = page.getByLabel("Maximum proportion of missing genotypes");
  await threshold.fill("0.05");
  await threshold.press("Enter");
  await expect(threshold).toHaveValue("0.05");

  // Out of the field, on the heading of the step, the project's.
  await page.getByRole("heading", { level: 1, name: "Variants" }).focus();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(threshold).toHaveValue("0.1");
  await expect(status(page)).toHaveText(
    "Undone: the missing data filter changed.",
  );
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(threshold).toHaveValue("0.05");
  await expect(status(page)).toHaveText(
    "Redone: the missing data filter changed.",
  );
  await page.keyboard.press("ControlOrMeta+z");
  await expect(threshold).toHaveValue("0.1");
  await page.keyboard.press("Control+y");
  await expect(threshold).toHaveValue("0.05");
  await expect(redoButton(page)).toBeDisabled();

  // In the field, the text's own undo, and the project is left as it is:
  // nothing to redo.
  await threshold.focus();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(redoButton(page)).toBeDisabled();
  await expect(undoButton(page)).toHaveAccessibleDescription(
    "Undo: the missing data filter changed",
  );
});

test("WS9 D3 the status region says the end of each read of the Variants step and of the metadata file", async ({
  page,
}) => {
  await openPopgen(page);

  await pick(page, "Variants file", "panel.nei");
  await expect(status(page)).toHaveText(
    "panel.nei read: 200 individuals, ploidy 2.",
  );

  await pick(page, "Variants file", "bad.vcf");
  await expect(status(page)).toHaveText(
    "popnei could not read bad.vcf: the source is not a VCF: it starts with `This is a line o`. Load a variants file in the Variants step.",
  );

  await pick(page, "Variants file", "panel.vcf.gz");
  await expect(status(page)).toHaveText(
    "panel.vcf.gz read: 200 individuals, ploidy 2.",
  );

  // The metadata file, and then a variants file with it read: the
  // sentence of the check follows each read.
  await goTo(page, "Individuals");
  await pick(page, "Metadata file", "panel_pops.csv");
  await expect(status(page)).toHaveText(
    "panel_pops.csv read: 200 rows, 2 columns. All 200 individuals found.",
  );
  await goTo(page, "Variants");
  await pick(page, "Variants file", "panel.nei");
  await expect(status(page)).toHaveText(
    "panel.nei read: 200 individuals, ploidy 2. All 200 individuals found.",
  );
});

/** The notice, the region of the toast at the end of the page. */
/** Whether the element of `locator` is inert, or inside an element that
    is, which a screen reader does not read. */
async function isInert(locator: Locator): Promise<boolean> {
  return locator.evaluate((element) => element.closest("[inert]") !== null);
}

function notice(page: Page): Locator {
  return page.getByRole("region", { name: "Notice" });
}

/** Loads the panel, calculates its diversity, and sets the missing data
    threshold to 1 at the Variants step, which removes the diversity;
    gives the field of the threshold, which keeps the focus. */
async function removeTheDiversity(page: Page): Promise<Locator> {
  await loadPanel(page);
  await goTo(page, "Analyses");
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.getByRole("rowheader", { name: "p0" })).toBeVisible();
  // The end announced, before an undo is.
  await expect(status(page)).toHaveText(/Diversity: done\.$/);
  await goTo(page, "Variants");
  const threshold = page.getByLabel("Maximum proportion of missing genotypes");
  await threshold.fill("1");
  await threshold.press("Enter");
  await expect(notice(page)).toBeVisible();
  return threshold;
}

test("WS9 D3 a change that leaves a calculation behind says so in the notice, and Run stops it: the notice goes and the status region says the earlier calculation was stopped", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPopgen(page);
  await loadPanel(page);
  await holdResults(page);
  await goTo(page, "Analyses");
  await page.getByRole("button", { name: "Run" }).click();
  await expect(stepLink(page, "Analyses")).toHaveAccessibleName(
    "Analyses, Running",
  );
  await expect(status(page)).toHaveText("Diversity: calculating.");

  await goTo(page, "Variants");
  const threshold = page.getByLabel("Maximum proportion of missing genotypes");
  await threshold.fill("0.05");
  await threshold.press("Enter");
  await expect(
    notice(page).getByRole("alertdialog", {
      name: "The missing data filter changed. The ongoing calculation of Diversity will be stopped unless you undo the change",
    }),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  await goTo(page, "Analyses");
  await page.getByRole("button", { name: "Run" }).click();
  await expect(notice(page)).toHaveCount(0);
  // The calculation stopped, the worker is made again without the hold,
  // and the new one may end within the pause of the announcer.
  await expect(status(page)).toHaveText(
    /^Diversity: calculating\. The earlier calculation of Diversity was stopped\.( Diversity: done\.)?$/,
  );
});

test("WS9 D3 Run that takes the calculation stopped out of the notice keeps the same notice, its words without that calculation and the focus on its Undo", async ({
  page,
}) => {
  await openPopgen(page);
  await loadPanel(page);
  await goTo(page, "Analyses");
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.getByRole("rowheader", { name: "p0" })).toBeVisible();
  await expect(status(page)).toHaveText(/Diversity: done\.$/);
  // A calculation of the threshold 0.05 held under way, and an undo back
  // to the diversity done, which leaves it behind.
  await holdResults(page);
  await goTo(page, "Variants");
  const threshold = page.getByLabel("Maximum proportion of missing genotypes");
  await threshold.fill("0.05");
  await threshold.press("Enter");
  await goTo(page, "Analyses");
  await page.getByRole("button", { name: "Run" }).click();
  await expect(status(page)).toHaveText("Diversity: calculating.");
  await undoButton(page).click();
  await expect(page.getByRole("rowheader", { name: "p0" })).toBeVisible();
  // Another variants file removes the diversity and stops that
  // calculation.
  await goTo(page, "Variants");
  await pick(page, "Variants file", "panel.vcf.gz");
  await expect(stepLink(page, "Variants")).toHaveAccessibleName(
    "Variants, Done",
  );
  await expect(
    notice(page).getByRole("alertdialog", {
      name: "Diversity removed and the calculation of Diversity stopped because a new variants file was loaded",
    }),
  ).toBeVisible();
  await goTo(page, "Analyses");
  await page.keyboard.press("F6");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const undo = notice(page).getByRole("button", { name: "Undo", exact: true });
  await expect(undo).toBeFocused();
  // The toast on the page now, marked, to tell it from a new one.
  await notice(page)
    .getByRole("alertdialog")
    .evaluate((element) => {
      element.setAttribute("data-first-toast", "");
    });

  // Run pressed as a screen reader presses it, which leaves the focus
  // where it is.
  await page.getByRole("button", { name: "Run" }).dispatchEvent("click");

  await expect(
    notice(page).getByRole("alertdialog", {
      name: "Diversity removed because a new variants file was loaded",
    }),
  ).toHaveAttribute("data-first-toast", "");
  await expect(undo).toBeFocused();
});

test("WS9 D3 the shell with results removed: the notice with its words, Undo and Close, Analyses at Results removed, the field changed and the end of the page clear of the notice, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  // A window lower than the step, so that the page scrolls under the
  // notice.
  await page.setViewportSize({ width: 800, height: 400 });
  await openPopgen(page);
  const threshold = await removeTheDiversity(page);

  await expect(
    notice(page).getByRole("alertdialog", {
      name: "Diversity removed because the missing data filter changed",
    }),
  ).toBeVisible();
  await expect(
    notice(page).getByRole("button", { name: "Undo", exact: true }),
  ).toBeVisible();
  await expect(
    notice(page).getByRole("button", { name: "Close", exact: true }),
  ).toBeVisible();
  await expect(stepLink(page, "Analyses")).toHaveAccessibleName(
    "Analyses, Results removed",
  );
  await expect(threshold).toBeFocused();

  /** Expects the field of the threshold to be above the notice. */
  const expectAboveTheNotice = async (): Promise<void> => {
    const field = await threshold.boundingBox();
    const region = await notice(page).boundingBox();
    if (field === null || region === null) throw new Error("not laid out");
    expect(field.y + field.height).toBeLessThanOrEqual(region.y);
  };
  // The field just changed, which has the focus, scrolled clear of the
  // notice that appeared over it.
  await expectAboveTheNotice();
  // At the end of the page, the last field of the step is above the
  // notice, not under it.
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await expectAboveTheNotice();
  await expectNoViolations(makeAxeBuilder);
});

test("WS9 D3 F6 reaches the notice after a change that removed the diversity, and its Undo gives the table back and the focus to where it was", async ({
  page,
}) => {
  await openPopgen(page);
  const threshold = await removeTheDiversity(page);

  await page.keyboard.press("F6");
  await expect(notice(page)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(notice(page).getByRole("alertdialog")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    notice(page).getByRole("button", { name: "Undo", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(notice(page)).toHaveCount(0);
  await expect(threshold).toBeFocused();
  await expect(threshold).toHaveValue("0.1");
  await expect(status(page)).toHaveText(
    "Undone: the missing data filter changed.",
  );
  await goTo(page, "Analyses");
  await expect(page.getByRole("rowheader", { name: "p0" })).toBeVisible();
});

test("WS9 D3 Escape in the notice gives the focus back to where it was before F6, and leaves the notice as it is", async ({
  page,
}) => {
  await openPopgen(page);
  const threshold = await removeTheDiversity(page);

  await page.keyboard.press("F6");
  await expect(notice(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(threshold).toBeFocused();
  await expect(notice(page)).toBeVisible();

  // From the notice's Undo, reached by the Tab key.
  await page.keyboard.press("F6");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(
    notice(page).getByRole("button", { name: "Undo", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(threshold).toBeFocused();
  await expect(threshold).toHaveValue("1");
  await expect(notice(page)).toBeVisible();
});

test("WS9 D3 Close of the notice leaves the change as it is and gives the focus to where it was", async ({
  page,
}) => {
  await openPopgen(page);
  const threshold = await removeTheDiversity(page);

  await page.keyboard.press("F6");
  await expect(notice(page)).toBeFocused();
  for (let press = 0; press < 3; press++) {
    await page.keyboard.press("Tab");
  }
  await expect(
    notice(page).getByRole("button", { name: "Close", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(notice(page)).toHaveCount(0);
  await expect(threshold).toBeFocused();
  await expect(threshold).toHaveValue("1");
  await expect(stepLink(page, "Analyses")).toHaveAccessibleName(
    "Analyses, Ready",
  );
});

test("WS9 D3 after an undo that removed the diversity the notice offers Redo, which redoes the change", async ({
  page,
}) => {
  await openPopgen(page);
  const threshold = await removeTheDiversity(page);
  // The diversity of a new threshold, 0.5, and an undo back to 1, whose
  // diversity was never calculated.
  await threshold.fill("0.5");
  await threshold.press("Enter");
  await goTo(page, "Analyses");
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.getByRole("rowheader", { name: "p0" })).toBeVisible();
  await expect(status(page)).toHaveText(/Diversity: done\.$/);
  await expect(notice(page)).toHaveCount(0);
  await page.keyboard.press("ControlOrMeta+z");
  await expect(
    notice(page).getByRole("alertdialog", {
      name: "Undone: the missing data filter changed. Diversity removed",
    }),
  ).toBeVisible();

  await notice(page).getByRole("button", { name: "Redo", exact: true }).click();
  await expect(notice(page)).toHaveCount(0);
  await expect(status(page)).toHaveText(
    "Redone: the missing data filter changed.",
  );
  await expect(page.getByRole("rowheader", { name: "p0" })).toBeVisible();
  await goTo(page, "Variants");
  await expect(threshold).toHaveValue("0.5");
});

test("WS9 D3 the keyboard's Undo, pressed with the focus on the Undo of the notice, undoes the change", async ({
  page,
}) => {
  await openPopgen(page);
  const threshold = await removeTheDiversity(page);

  await page.keyboard.press("F6");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(
    notice(page).getByRole("button", { name: "Undo", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ControlOrMeta+z");

  await expect(threshold).toHaveValue("0.1");
  await expect(status(page)).toHaveText(
    "Undone: the missing data filter changed.",
  );
});

test("WS9 D3 while the dialog of Save is open, F6 does not reach the notice under it and nothing pressed changes the project, and once it closes F6 reaches the notice again", async ({
  page,
}) => {
  await openPopgen(page);
  const threshold = await removeTheDiversity(page);

  const save = header(page).getByRole("button", { name: "Save project" });
  await save.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Save the project" });
  await expect(dialog.getByRole("textbox")).toBeFocused();
  expect(await isInert(notice(page))).toBe(true);

  // The keys that took the focus to the notice's Undo and pressed it.
  await page.keyboard.press("F6");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("ControlOrMeta+z");
  await expect(threshold).toHaveValue("1");
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(threshold).toHaveValue("1");
  await expect(notice(page)).toBeVisible();

  expect(await isInert(notice(page))).toBe(false);
  await expect(save).toBeFocused();
  await page.keyboard.press("F6");
  await expect(notice(page)).toBeFocused();
});

test("WS9 D3 while a dialog is open, the status region and the error bar's alert and status stay where a screen reader reads them", async ({
  page,
}) => {
  await openPopgen(page);
  await loadPanel(page);
  await goTo(page, "Analyses");
  await page.getByRole("button", { name: "Run" }).click();
  await header(page).getByRole("button", { name: "Save project" }).click();
  await expect(
    page.getByRole("dialog", { name: "Save the project" }),
  ).toBeVisible();

  // The end of the run, announced while the dialog is open, in a region
  // the page has not made inert, which takes an element and everything in
  // it out of what a screen reader reads.
  await expect(status(page)).toHaveText(/Diversity: done\.$/);
  expect(await isInert(status(page))).toBe(false);
  await page.evaluate(() => {
    setTimeout(() => {
      throw new Error("test");
    });
  });
  await expect(page.getByRole("alert")).toContainText("test");
  expect(await isInert(page.getByRole("alert"))).toBe(false);
  // The bar's own status region, the first of the page.
  expect(await isInert(page.getByRole("status").first())).toBe(false);
});
