/**
 * The two lists of individuals of the Variants step on the built site
 * (docs/specs/steps/variants.md, "The two lists" and "How it is checked",
 * stage 3): a list to keep with a name not in the file, its reason under
 * the list, beside the disabled Write and in the stepper; the list
 * cleared and the reason gone; a list typed and not applied, with its
 * line, and an Undo, a Redo and an opening that put the text back to the
 * list of the project; the browser's own undo in a text area; a long
 * list pasted; the order of the keyboard; and axe at each state reached.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The reason of a list to keep that names ind_900, not in panel.nei,
    as the step shows it under the list and beside Write, without the end
    "in the Variants step", and whole in the stepper. */
const IND_900 =
  "The list of individuals to keep names 1 individual that is not in panel.nei: ind_900. Change the list, or remove the filter.";
const IND_900_WHOLE =
  "The list of individuals to keep names 1 individual that is not in panel.nei: ind_900. Change the list, or remove the filter, in the Variants step.";

const KEEP_LABEL = "Individuals to keep, one name per line";
const REMOVE_LABEL = "Individuals to remove, one name per line";
const KEEP_NOT_APPLIED =
  "This list is not applied yet; Apply the list to keep applies it.";
const REMOVE_NOT_APPLIED =
  "This list is not applied yet; Apply the list to remove applies it.";

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

async function openVariants(page: Page): Promise<void> {
  await page.goto("popgen.html#variants");
  await expect(
    page.getByRole("heading", { level: 1, name: "Variants" }),
  ).toBeVisible();
}

function stepLink(page: Page, name: string): Locator {
  return page
    .getByRole("navigation", { name: "Steps" })
    .getByRole("link", { name: new RegExp(`^${name}, `) });
}

function lists(page: Page): Locator {
  return page.getByRole("region", { name: "Filters of the individuals" });
}

function keepArea(page: Page): Locator {
  return lists(page).getByRole("textbox", { name: KEEP_LABEL });
}

function removeArea(page: Page): Locator {
  return lists(page).getByRole("textbox", { name: REMOVE_LABEL });
}

function button(page: Page, name: string): Locator {
  return lists(page).getByRole("button", { name, exact: true });
}

function writeButton(page: Page): Locator {
  return page
    .getByRole("region", { name: "Writing the filtered variants" })
    .getByRole("button", {
      name: "Write the filtered variants as a .nei file",
    });
}

/** The shell's status region, the last of the page's two. */
function status(page: Page): Locator {
  return page.getByRole("status").last();
}

function undoButton(page: Page): Locator {
  return page
    .getByRole("banner")
    .getByRole("button", { name: "Undo", exact: true });
}

function redoButton(page: Page): Locator {
  return page
    .getByRole("banner")
    .getByRole("button", { name: "Redo", exact: true });
}

function threshold(page: Page): Locator {
  return page.getByLabel(
    "Maximum proportion of missing genotypes, from 0 to 1",
    { exact: true },
  );
}

/** Picks `fixture` with the file button, as a user does. */
async function pick(page: Page, fixture: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Variants file" })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (await chooser).setFiles(join(FIXTURES, fixture));
}

/** Picks panel.nei and waits for its read. */
async function loadPanelNei(page: Page): Promise<void> {
  await pick(page, "panel.nei");
  await expect(
    page.getByRole("main").getByText("200 individuals"),
  ).toBeVisible();
}

/** Types `text` into the list `area`, after what it holds, as the
    keyboard does. */
async function typeInto(area: Locator, text: string): Promise<void> {
  await area.click();
  await area.press("ControlOrMeta+End");
  await area.page().keyboard.insertText(text);
}

/** The modifier of the keyboard's Undo on this engine's platform. */
const UNDO = process.platform === "darwin" ? "Meta+z" : "Control+z";

test("VS7 D1 a list to keep with ind_900 applied: its reason under the list, describing it and announced, beside the disabled Write and in the stepper, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await loadPanelNei(page);
  await expect(writeButton(page)).toBeEnabled();
  await expectNoViolations(makeAxeBuilder);

  await typeInto(keepArea(page), "s000\nind_900");
  await expect(lists(page).getByText(KEEP_NOT_APPLIED)).toBeVisible();
  await expect(keepArea(page)).toHaveAccessibleDescription(KEEP_NOT_APPLIED);
  await expectNoViolations(makeAxeBuilder);

  await button(page, "Apply the list to keep").click();
  await expect(lists(page).getByText(KEEP_NOT_APPLIED)).toHaveCount(0);
  await expect(keepArea(page)).toHaveAccessibleDescription(IND_900);
  await expect(status(page)).toHaveText(IND_900);
  await expect(
    lists(page).getByText("Variants step", { exact: false }),
  ).toHaveCount(0);
  await expect(keepArea(page)).toHaveValue("s000\nind_900");
  await expect(lists(page).getByText(IND_900, { exact: true })).toBeVisible();
  // Under the list to keep, before the list to remove.
  const reasonBox = await lists(page).getByText(IND_900).boundingBox();
  const keepBox = await keepArea(page).boundingBox();
  expect(reasonBox?.y ?? 0).toBeGreaterThan(keepBox?.y ?? Infinity);
  await expect(writeButton(page)).toBeDisabled();
  await expect(writeButton(page)).toHaveAccessibleDescription(IND_900);
  await expect(stepLink(page, "Variants")).toHaveAccessibleName(
    "Variants, Problem",
  );
  await expect(stepLink(page, "Variants")).toHaveAccessibleDescription(
    IND_900_WHOLE,
  );
  await expect(undoButton(page)).toHaveAccessibleDescription(
    "Undo: the list of individuals to keep changed",
  );
  await expectNoViolations(makeAxeBuilder);
});

test("VS7 D1 the list cleared: the text emptied, the reason gone and Write given back, and an Undo of the Clear brings them back, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await loadPanelNei(page);
  await typeInto(keepArea(page), "ind_900");
  await button(page, "Apply the list to keep").click();
  await expect(lists(page).getByText(IND_900, { exact: true })).toBeVisible();

  await button(page, "Clear the list to keep").click();
  await expect(keepArea(page)).toHaveValue("");
  await expect(lists(page).getByText(IND_900)).toHaveCount(0);
  await expect(lists(page).getByText(KEEP_NOT_APPLIED)).toHaveCount(0);
  await expect(writeButton(page)).toBeEnabled();
  await expect(stepLink(page, "Variants")).toHaveAccessibleName(
    "Variants, Done",
  );
  await expect(undoButton(page)).toHaveAccessibleDescription(
    "Undo: the list of individuals to keep was cleared",
  );
  await expectNoViolations(makeAxeBuilder);

  await undoButton(page).click();
  await expect(keepArea(page)).toHaveValue("ind_900");
  await expect(lists(page).getByText(IND_900, { exact: true })).toBeVisible();
  await expect(writeButton(page)).toBeDisabled();
  await expectNoViolations(makeAxeBuilder);
});

test("VS7 D1 a list popnei accepts is applied with nothing announced, and a Clear that brings the reason of the other list announces it and describes that list, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await loadPanelNei(page);
  await expect(status(page)).toHaveText(/panel\.nei read/u);
  const read = await status(page).textContent();
  await typeInto(keepArea(page), "s000\ns001");
  await button(page, "Apply the list to keep").click();
  await expect(undoButton(page)).toHaveAccessibleDescription(
    "Undo: the list of individuals to keep changed",
  );
  // Described by its count alone, which is not announced.
  await expect(keepArea(page)).toHaveAccessibleDescription(
    "Kept 2 of the 200 individuals it was given.",
  );
  await expect(status(page)).toHaveText(read ?? "");

  // The list to keep is checked first, so a refused list to remove shows
  // its reason only once the list to keep is fine.
  await keepArea(page).fill("ind_900");
  await button(page, "Apply the list to keep").click();
  await expect(status(page)).toHaveText(IND_900);
  await typeInto(removeArea(page), "ind_901");
  await button(page, "Apply the list to remove").click();
  await expect(undoButton(page)).toHaveAccessibleDescription(
    "Undo: the list of individuals to remove changed",
  );
  await expect(status(page)).toHaveText(IND_900);
  await expect(removeArea(page)).toHaveAccessibleDescription("");

  const removeReason =
    "The list of individuals to remove names 1 individual that is not in panel.nei: ind_901. Change the list, or remove the filter.";
  await button(page, "Clear the list to keep").click();
  await expect(status(page)).toHaveText(removeReason);
  await expect(removeArea(page)).toHaveAccessibleDescription(removeReason);
  await expect(keepArea(page)).toHaveAccessibleDescription("");
  await expectNoViolations(makeAxeBuilder);
});

test("VS7 D1 a list typed and not applied has its line, and an Undo of another change puts the text back to the list applied, as a Redo does, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await loadPanelNei(page);
  await typeInto(keepArea(page), "s000\ns001");
  await button(page, "Apply the list to keep").click();
  await threshold(page).fill("0.05");
  await threshold(page).press("Enter");
  await expect(undoButton(page)).toHaveAccessibleDescription(
    "Undo: the missing data filter changed",
  );

  await typeInto(keepArea(page), "\ns002");
  await expect(keepArea(page)).toHaveValue("s000\ns001\ns002");
  await expect(lists(page).getByText(KEEP_NOT_APPLIED)).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  // The Undo takes back the threshold, and not the list; the text shows
  // the list applied again.
  await undoButton(page).click();
  await expect(threshold(page)).toHaveValue("0.1");
  await expect(keepArea(page)).toHaveValue("s000\ns001");
  await expect(lists(page).getByText(KEEP_NOT_APPLIED)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  await typeInto(removeArea(page), "s003");
  await expect(lists(page).getByText(REMOVE_NOT_APPLIED)).toBeVisible();
  await redoButton(page).click();
  await expect(threshold(page)).toHaveValue("0.05");
  await expect(removeArea(page)).toHaveValue("");
  await expect(lists(page).getByText(REMOVE_NOT_APPLIED)).toHaveCount(0);
});

test("VS7 D1 a list typed stays when a file is picked, a threshold is committed or the step is left, and is lost on coming back", async ({
  page,
}) => {
  await openVariants(page);
  await typeInto(keepArea(page), "s000");
  await expect(lists(page).getByText(KEEP_NOT_APPLIED)).toBeVisible();

  await loadPanelNei(page);
  await expect(keepArea(page)).toHaveValue("s000");
  await threshold(page).fill("0.05");
  await threshold(page).press("Enter");
  await expect(threshold(page)).toHaveValue("0.05");
  await expect(keepArea(page)).toHaveValue("s000");
  await expect(lists(page).getByText(KEEP_NOT_APPLIED)).toBeVisible();

  await stepLink(page, "Analyses").click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Analyses" }),
  ).toBeVisible();
  await stepLink(page, "Variants").click();
  await expect(keepArea(page)).toHaveValue("");
  await expect(lists(page).getByText(KEEP_NOT_APPLIED)).toHaveCount(0);
});

test("VS7 D1 a list applied before a file is read has no reason until the file is, and then its reason", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await typeInto(removeArea(page), "ind_900");
  await button(page, "Apply the list to remove").click();
  await expect(lists(page).getByText(REMOVE_NOT_APPLIED)).toHaveCount(0);
  await expect(lists(page).getByText(/^The list of individuals/)).toHaveCount(
    0,
  );
  await expectNoViolations(makeAxeBuilder);

  await loadPanelNei(page);
  await expect(
    lists(page).getByText(
      "The list of individuals to remove names 1 individual that is not in panel.nei: ind_900. Change the list, or remove the filter.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(writeButton(page)).toBeDisabled();
  await expectNoViolations(makeAxeBuilder);
});

test("VS7 D1 Cmd+Z or Ctrl+Z in a list takes back its typing alone, and not the project; outside it, the list applied", async ({
  page,
}) => {
  await openVariants(page);
  await loadPanelNei(page);
  await typeInto(keepArea(page), "s000");
  await button(page, "Apply the list to keep").click();
  await expect(undoButton(page)).toHaveAccessibleDescription(
    "Undo: the list of individuals to keep changed",
  );

  await typeInto(keepArea(page), "\ns001");
  await expect(keepArea(page)).toHaveValue("s000\ns001");
  // Chromium takes back the typing since Apply, and WebKit 26 all the
  // typing of the field at once, the list applied among it.
  await keepArea(page).press(UNDO);
  await expect(keepArea(page)).toHaveValue(/^(s000)?$/u);
  const undone = await keepArea(page).inputValue();
  await expect(lists(page).getByText(KEEP_NOT_APPLIED)).toHaveCount(
    undone === "s000" ? 0 : 1,
  );
  // Then all of it in both, and with nothing more of the field to take
  // back the keys do nothing: the text is not the list applied, which the
  // line says, the project is not undone, and no other field changes.
  await keepArea(page).press(UNDO);
  await keepArea(page).press(UNDO);
  await expect(keepArea(page)).toHaveValue("");
  await expect(lists(page).getByText(KEEP_NOT_APPLIED)).toBeVisible();
  await expect(threshold(page)).toHaveValue("0.1");
  await expect(undoButton(page)).toHaveAccessibleDescription(
    "Undo: the list of individuals to keep changed",
  );

  // On the button, the keys are the project's Undo, which takes the list
  // back, and the text with it.
  await button(page, "Apply the list to keep").focus();
  await page.keyboard.press(UNDO);
  await expect(keepArea(page)).toHaveValue("");
  await expect(lists(page).getByText(KEEP_NOT_APPLIED)).toHaveCount(0);
  await expect(undoButton(page)).toHaveAccessibleDescription(
    "Undo: a new variants file was loaded",
  );
});

test("VS7 D1 after an Undo of the header and after a Clear, the browser's undo and redo in a list give back no text the user did not type", async ({
  page,
}) => {
  await openVariants(page);
  await loadPanelNei(page);
  await typeInto(removeArea(page), "s005");
  await typeInto(keepArea(page), "s000");
  await button(page, "Apply the list to keep").click();
  await undoButton(page).click();
  await expect(keepArea(page)).toHaveValue("");
  await expect(removeArea(page)).toHaveValue("");
  await keepArea(page).click();
  await keepArea(page).press(UNDO);
  await keepArea(page).press(UNDO);
  await keepArea(page).press("ControlOrMeta+Shift+z");
  await expect(keepArea(page)).toHaveValue("");
  await expect(removeArea(page)).toHaveValue("");

  await typeInto(keepArea(page), "s001");
  await button(page, "Apply the list to keep").click();
  await button(page, "Clear the list to keep").click();
  await expect(keepArea(page)).toHaveValue("");
  await keepArea(page).click();
  await keepArea(page).press(UNDO);
  await keepArea(page).press("ControlOrMeta+Shift+z");
  await expect(keepArea(page)).toHaveValue("");
  await expect(lists(page).getByText(KEEP_NOT_APPLIED)).toHaveCount(0);
});

test("VS7 D1 a column of 200 names pasted with CRLF and tabs, one of them with a comma, is applied as 200 names with the one with a comma not in the file, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await loadPanelNei(page);
  const names = Array.from(
    { length: 199 },
    (_, i) => `s${String(i).padStart(3, "0")}`,
  );
  const pasted =
    names.map((name) => ` ${name}\t`).join("\r\n") + "\r\ns199, s198\r\n\r\n";
  await keepArea(page).click();
  await page.keyboard.insertText(pasted);
  await expect(lists(page).getByText(KEEP_NOT_APPLIED)).toBeVisible();
  await button(page, "Apply the list to keep").click();
  await expect(
    lists(page).getByText(
      "The list of individuals to keep names 1 individual that is not in panel.nei: s199, s198. Change the list, or remove the filter.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(lists(page).getByText(KEEP_NOT_APPLIED)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("VS7 D1 an opening puts the text of each list back to the lists of the project file, typed or applied", async ({
  page,
}, testInfo) => {
  await openVariants(page);
  await loadPanelNei(page);
  await typeInto(keepArea(page), "s000");
  await button(page, "Apply the list to keep").click();
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save project" })
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("dialog", { name: "Save the project" })
    .getByRole("button", { name: "Save", exact: true })
    .click();
  const saved = testInfo.outputPath("panel.popnei.json");
  await (await download).saveAs(saved);
  const file = JSON.parse(await readFile(saved, "utf8")) as Record<
    string,
    unknown
  >;
  const changed = testInfo.outputPath("removed.popnei.json");
  await writeFile(
    changed,
    JSON.stringify(
      {
        ...file,
        individualFilters: [{ kind: "remove", individuals: ["s002"] }],
      },
      null,
      2,
    ),
  );
  await typeInto(keepArea(page), "\ns001");
  await typeInto(removeArea(page), "s003");

  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Open project…" })
    .click();
  await (await chooser).setFiles(changed);
  await expect(removeArea(page)).toHaveValue("s002");
  await expect(keepArea(page)).toHaveValue("");
  await expect(lists(page).getByText(/not applied yet/)).toHaveCount(0);
});

test("VS7 D1 the Tab key goes from the Count through each list, its text area and its two buttons, the button of the statistics of each individual and the switch of each threshold, to Write", async ({
  page,
}) => {
  await openVariants(page);
  await loadPanelNei(page);
  await page
    .getByRole("button", { name: "Count the variants each filter keeps" })
    .focus();
  const order = [
    keepArea(page),
    button(page, "Apply the list to keep"),
    button(page, "Clear the list to keep"),
    removeArea(page),
    button(page, "Apply the list to remove"),
    button(page, "Clear the list to remove"),
    button(page, "Calculate the statistics of each individual"),
    lists(page).getByRole("switch", {
      name: "Filter the individuals by missing data",
    }),
    lists(page).getByRole("switch", {
      name: "Filter the individuals by observed heterozygosity",
    }),
    writeButton(page),
  ];
  for (const next of order) {
    await page.keyboard.press("Tab");
    await expect(next).toBeFocused();
  }
});
