/**
 * The shell of the population genetics application on the built site
 * (docs/specs/shell.md, "How it is checked"): the stepper, the summary
 * line and Undo and Redo in the states empty, ready, running and done,
 * with axe in each; Undo pressed with the mouse until nothing is left,
 * the focus on Redo; the keyboard's Undo and Redo, and a text field that
 * keeps them; and the text of the status region after each read of the
 * Variants step and of the metadata file.
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
