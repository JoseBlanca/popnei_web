/**
 * The switches of the Variants step from stage 4, on the built site
 * (docs/specs/steps/variants.md, "The filters of the variants", "The
 * distance of the LD pruning" and the bullet "from stage 4" of "How it is
 * checked"): the LD pruning turned on with an empty distance and its
 * reason, beside the field and beside the disabled Count and Write, the
 * stepper at Problem, and the histograms and the statistics still
 * calculated; the keys that step a number sending nothing in the empty
 * field; a distance refused while it is empty; 50000 typed, undone and
 * redone; the filter turned off and on again with its distance and its
 * count; the filter turned on, off and on before a distance; and a
 * threshold of the individuals turned off and on at its value. axe at
 * each state reached.
 */
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

const LD_SWITCH = "Prune the variants by linkage disequilibrium (LD)";
const MISSING_LABEL = "Maximum proportion of missing genotypes, from 0 to 1";
const R2_LABEL = "Maximum r² with a variant kept before it, from 0 to 1";
const DISTANCE_LABEL =
  "Distance within which variants are compared, in base pairs, from 1";
const LD_LINE =
  "Of two variants closer than the distance, and with an r² above the maximum, the first is kept.";
const COUNT = "Count the variants each filter keeps";
const WRITE = "Write the filtered variants as a .nei file";

/** The reason of the LD pruning with no distance, as the step shows it,
    without its end "in the Variants step". */
const LD_REASON =
  "The LD pruning of the Variants step needs the distance within which variants are compared. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs, or turn off the LD pruning.";

/** The short line beside the disabled Count and Write in its place
    (stop A 2 of docs/specs/stage-4-open-points.md). */
const LD_LOCKED =
  "Locked until the distance of the LD pruning is typed, above.";

/** The same reason whole, as the stepper gives it. */
const LD_REASON_WHOLE = LD_REASON.replace(/\.$/u, ", in the Variants step.");

/** What the missing data filter at 0.05 keeps of panel.nei, which the LD
    pruning after it is given (docs/specs/analyses/filterCounts.md). */
const MISSING_KEPT = "Kept 1,152 of the 1,200 variants it was given.";

/** What the LD pruning keeps of the 1,152 variants it is given. */
const LD_KEPT = /^Kept [\d,]+ of the 1,152 variants it was given\.$/u;

async function openVariants(page: Page): Promise<void> {
  await page.goto("popgen.html#variants");
  await expect(
    page.getByRole("heading", { level: 1, name: "Variants" }),
  ).toBeVisible();
}

/** Picks panel.nei with the file button, as a user does, and waits for
    the card of the file read. */
async function pickPanel(page: Page): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Variants file" })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (await chooser).setFiles(join(FIXTURES, "panel.nei"));
  await expect(
    page
      .getByRole("region", { name: "Variants file" })
      .getByText(/individuals$/),
  ).toBeVisible();
}

function filters(page: Page): Locator {
  return page.getByRole("region", { name: "Filters of the variants" });
}

function individualFilters(page: Page): Locator {
  return page.getByRole("region", { name: "Filters of the individuals" });
}

function field(page: Page, label: string): Locator {
  return page.getByLabel(label, { exact: true });
}

function distance(page: Page): Locator {
  return field(page, DISTANCE_LABEL);
}

function countButton(page: Page): Locator {
  return filters(page).getByRole("button", { name: COUNT });
}

function writeButton(page: Page): Locator {
  return page
    .getByRole("region", { name: "Writing the filtered variants" })
    .getByRole("button", { name: WRITE });
}

function stepLink(page: Page, name: string): Locator {
  return page
    .getByRole("navigation", { name: "Steps" })
    .getByRole("link", { name: new RegExp(`^${name}, `) });
}

function banner(page: Page, name: string): Locator {
  return page.getByRole("banner").getByRole("button", { name, exact: true });
}

/** The shell's status region, the last of the page's two. */
function status(page: Page): Locator {
  return page.getByRole("status").last();
}

/** The reason under the empty field of the distance, the one place of
    the step it stands (stop A 2); `toHaveCount(0)` on it says it is not
    there. */
function ldReason(page: Page): Locator {
  return page.getByRole("main").getByText(LD_REASON, { exact: true });
}

/** Turns a switch on or off with the mouse, on its words. */
async function flip(scope: Locator, name: string): Promise<void> {
  await scope.getByText(name, { exact: true }).click();
}

/** Types `value` into the field `label` and commits it with Enter. */
async function commit(page: Page, label: string, value: string): Promise<void> {
  const input = field(page, label);
  await input.fill(value);
  await input.press("Enter");
  await expect(input).toHaveValue(value);
}

/** Presses the Count button with the keyboard. */
async function count(page: Page): Promise<void> {
  await countButton(page).focus();
  await page.keyboard.press("Enter");
}

/** What the LD pruning kept, beside it: the last count of the section. */
function ldCount(page: Page): Locator {
  return filters(page)
    .getByText(/^Kept /)
    .last();
}

/** A pattern of a text that ends with `end`: the status region holds
    together the texts announced within its pause. */
function endsWith(end: string): RegExp {
  return new RegExp(`${end.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}$`, "u");
}

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

/** panel.nei read, the missing data filter at 0.05 and the LD pruning
    turned on, with no distance. */
async function ldTurnedOn(page: Page): Promise<void> {
  await openVariants(page);
  await pickPanel(page);
  await commit(page, MISSING_LABEL, "0.05");
  await flip(filters(page), LD_SWITCH);
  await expect(ldReason(page)).toBeVisible();
}

test("IP3 D3 the LD pruning turned on: the distance empty with its reason beside it, announced and describing it; the Count and the Write disabled with the reason; the stepper at Problem; the histograms and the statistics still calculated", async ({
  page,
  makeAxeBuilder,
}) => {
  await ldTurnedOn(page);
  await expect(distance(page)).toHaveValue("");
  await expect(field(page, R2_LABEL)).toHaveValue("0.3");
  // Announced after the end of the read, which the region may still hold
  // when the two come within its pause.
  await expect(status(page)).toHaveText(endsWith(LD_REASON));
  // The switch keeps the focus, as a user of the keyboard left it.
  await expect(page.getByRole("switch", { name: LD_SWITCH })).toBeFocused();
  // The reason first, then the line under the switch; the r² is not
  // described by it.
  await expect(distance(page)).toHaveAccessibleDescription(
    `${LD_REASON} ${LD_LINE}`,
  );
  await expect(field(page, R2_LABEL)).toHaveAccessibleDescription(LD_LINE);
  // Under the field of the distance.
  const reasonBox = await ldReason(page).boundingBox();
  const fieldBox = await distance(page).boundingBox();
  expect(reasonBox?.y ?? 0).toBeGreaterThan(fieldBox?.y ?? Infinity);

  await expect(countButton(page)).toBeDisabled();
  await expect(countButton(page)).toHaveAccessibleDescription(LD_LOCKED);
  await expect(writeButton(page)).toBeDisabled();
  await expect(writeButton(page)).toHaveAccessibleDescription(LD_LOCKED);
  // The reason stands once on the step, and the short line beside each
  // of the two buttons.
  await expect(ldReason(page)).toHaveCount(1);
  await expect(
    page.getByRole("main").getByText(LD_LOCKED, { exact: true }),
  ).toHaveCount(2);
  await expect(
    page.getByRole("main").getByText("in the Variants step", { exact: false }),
  ).toHaveCount(0);
  await expect(stepLink(page, "Variants")).toHaveAccessibleName(
    "Variants, Problem",
  );
  await expect(stepLink(page, "Variants")).toHaveAccessibleDescription(
    LD_REASON_WHOLE,
  );
  // The LD pruning is counted among the filters; the variants of the file
  // are not counted yet, before any pass.
  await expect(
    page.getByText(
      "panel.nei · 200 individuals · 2 filters · no metadata file: one population",
      {
        exact: true,
      },
    ),
  ).toBeVisible();
  await expect(banner(page, "Undo")).toHaveAccessibleDescription(
    "Undo: the LD pruning was turned on",
  );
  await expectNoViolations(makeAxeBuilder);

  // The histograms of the variants and the statistics of each individual
  // read no filter of the variants, and are calculated.
  await filters(page)
    .getByRole("button", { name: "Calculate the histograms of the variants" })
    .click();
  await expect(
    page.getByRole("group", { name: "Major allele frequency, mean 0.7163" }),
  ).toBeVisible();
  await individualFilters(page)
    .getByRole("button", {
      name: "Calculate the statistics of each individual",
    })
    .click();
  await expect(
    individualFilters(page).getByText(
      "The statistics of the 200 individuals of panel.nei, over its 1,200 variants, before any filter of the variants.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(countButton(page)).toBeDisabled();
  await expect(ldReason(page)).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
});

test("IP3 D3 in the empty distance the arrow keys, Page Up, Page Down, Home and End send nothing, and the Tab key leaves it empty", async ({
  page,
  makeAxeBuilder,
}) => {
  await ldTurnedOn(page);
  await distance(page).focus();
  for (const key of [
    "ArrowUp",
    "ArrowDown",
    "PageUp",
    "PageDown",
    "Home",
    "End",
  ]) {
    await page.keyboard.press(key);
    await expect(distance(page)).toHaveValue("");
  }
  await page.keyboard.press("Tab");
  await expect(distance(page)).not.toBeFocused();
  await expect(distance(page)).toHaveValue("");
  // Nothing was sent: the last step of undo is still the switch.
  await expect(banner(page, "Undo")).toHaveAccessibleDescription(
    "Undo: the LD pruning was turned on",
  );
  await expect(ldReason(page)).toBeVisible();
  await expect(countButton(page)).toBeDisabled();
  await expectNoViolations(makeAxeBuilder);
});

test("stop A 4 (b) in the distance holding 50000, End and Home move the caret and send nothing: 1 typed after End gives 500001, after Home 1500001", async ({
  page,
}) => {
  await ldTurnedOn(page);
  await commit(page, DISTANCE_LABEL, "50000");
  const input = distance(page);
  await input.focus();
  await page.keyboard.press("End");
  await expect(input).toHaveValue("50000");
  // Nothing was sent: the last step of undo is still the distance.
  await expect(banner(page, "Undo")).toHaveAccessibleDescription(
    "Undo: the LD pruning changed",
  );
  await page.keyboard.type("1");
  await expect(input).toHaveValue("500001");
  await page.keyboard.press("Home");
  await expect(input).toHaveValue("500001");
  await page.keyboard.type("1");
  await expect(input).toHaveValue("1500001");
  await page.keyboard.press("Enter");
  await expect(input).toHaveValue("1500001");
  // With Shift, Home selects to the start, and what is typed replaces it.
  await page.keyboard.press("End");
  await page.keyboard.press("Shift+Home");
  await page.keyboard.type("7");
  await expect(input).toHaveValue("7");
  await page.keyboard.press("Enter");
  await expect(input).toHaveValue("7");

  // A threshold, whose bound is 1: End at the end of 0.05 leaves it.
  const missing = field(page, MISSING_LABEL);
  await missing.focus();
  await page.keyboard.press("End");
  await page.keyboard.press("Home");
  await page.keyboard.press("Tab");
  await expect(missing).toHaveValue("0.05");
});

test("IP3 D3 0 typed in the empty distance is refused, and so is a comma typed key by key, each with its line, and the field stays empty", async ({
  page,
  makeAxeBuilder,
}) => {
  await ldTurnedOn(page);
  const main = page.getByRole("main");
  const zero = "0 is less than 1; the distance is still to be typed.";
  await distance(page).fill("0");
  await distance(page).press("Enter");
  await expect(distance(page)).toHaveValue("");
  await expect(main.getByText(zero, { exact: true })).toBeVisible();
  await expect(status(page)).toHaveText(endsWith(zero));
  // The line of the refusal, then the reason, then the line under the
  // switch.
  await expect(distance(page)).toHaveAccessibleDescription(
    `${zero} ${LD_REASON} ${LD_LINE}`,
  );
  await expectNoViolations(makeAxeBuilder);

  const comma =
    "Write the distance as a whole number of base pairs, 10000 and not 10,000; the distance is still to be typed.";
  await distance(page).fill("");
  await distance(page).pressSequentially("50,000");
  await expect(main.getByText(comma, { exact: true })).toBeVisible();
  await expect(status(page)).toHaveText(endsWith(comma));
  await distance(page).press("Enter");
  await expect(distance(page)).toHaveValue("");
  await expect(distance(page)).toHaveAccessibleDescription(
    `${comma} ${LD_REASON} ${LD_LINE}`,
  );
  await expect(banner(page, "Undo")).toHaveAccessibleDescription(
    "Undo: the LD pruning was turned on",
  );
  await expectNoViolations(makeAxeBuilder);
});

test("IP10 D3 a comma typed first in the empty distance is thrown away with the line of the comma, and Enter leaves the field empty", async ({
  page,
}) => {
  await ldTurnedOn(page);
  const main = page.getByRole("main");
  const comma =
    "Write the distance as a whole number of base pairs, 10000 and not 10,000; the distance is still to be typed.";
  await distance(page).pressSequentially(",5");
  await expect(distance(page)).toHaveValue("5");
  await expect(main.getByText(comma, { exact: true })).toBeVisible();
  await expect(status(page)).toHaveText(endsWith(comma));
  await distance(page).press("Enter");
  await expect(distance(page)).toHaveValue("");
  await expect(main.getByText(comma, { exact: true })).toBeVisible();
  await expect(banner(page, "Undo")).toHaveAccessibleDescription(
    "Undo: the LD pruning was turned on",
  );
});

test("IP3 D3 50000 typed: the reason goes and the Count gives a count beside the LD pruning; an Undo gives back the empty field and the lock, and a Redo 50000", async ({
  page,
  makeAxeBuilder,
}) => {
  await ldTurnedOn(page);
  await commit(page, DISTANCE_LABEL, "50000");
  await expect(ldReason(page)).toHaveCount(0);
  await expect(distance(page)).toHaveAccessibleDescription(LD_LINE);
  await expect(countButton(page)).toBeEnabled();
  await expect(writeButton(page)).toBeEnabled();
  await expect(stepLink(page, "Variants")).toHaveAccessibleName(
    "Variants, Done",
  );
  await expectNoViolations(makeAxeBuilder);

  await count(page);
  await expect(filters(page).getByText(/^Kept /)).toHaveText([
    MISSING_KEPT,
    LD_KEPT,
  ]);
  const kept = (await ldCount(page).textContent()) ?? "";
  await expect(distance(page)).toHaveAccessibleDescription(
    `${kept} ${LD_LINE}`,
  );
  await expectNoViolations(makeAxeBuilder);

  await banner(page, "Undo").click();
  await expect(distance(page)).toHaveValue("");
  await expect(ldReason(page)).toBeVisible();
  // What the Undo did, then the reason whole, as the stepper gives it
  // (stop A 3).
  await expect(status(page)).toHaveText(
    endsWith(`Undone: the LD pruning changed. ${LD_REASON_WHOLE}`),
  );
  await expect(countButton(page)).toBeDisabled();
  await expect(countButton(page)).toHaveAccessibleDescription(LD_LOCKED);
  await expect(filters(page).getByText(/^Kept /)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  await banner(page, "Redo").click();
  await expect(distance(page)).toHaveValue("50000");
  await expect(ldReason(page)).toHaveCount(0);
  await expect(ldCount(page)).toHaveText(kept);
  await expectNoViolations(makeAxeBuilder);
});

const UNDO = process.platform === "darwin" ? "Meta+z" : "Control+z";

test("stop A 2 an Undo of the distance with the focus on the Count leaves the focus on the short line beside it, named for the Count by the hidden words, and announces the reason", async ({
  page,
  makeAxeBuilder,
}) => {
  await ldTurnedOn(page);
  await commit(page, DISTANCE_LABEL, "50000");
  await expect(countButton(page)).toBeEnabled();
  await countButton(page).focus();
  await page.keyboard.press(UNDO);
  await expect(distance(page)).toHaveValue("");
  const beside = filters(page).locator("[tabindex='-1']", {
    hasText: "Count the variants each filter keeps is unavailable: ",
  });
  await expect(beside).toBeFocused();
  await expect(beside).toHaveText(
    `Count the variants each filter keeps is unavailable: ${LD_LOCKED}`,
  );
  await expect(countButton(page)).toHaveAccessibleDescription(LD_LOCKED);
  await expect(status(page)).toHaveText(
    endsWith(`Undone: the LD pruning changed. ${LD_REASON_WHOLE}`),
  );
  await expectNoViolations(makeAxeBuilder);
});

test("IP3 D3 the LD pruning at 50000 turned off and on again: the field holds 50000 and the count is back beside it with no calculation", async ({
  page,
  makeAxeBuilder,
}) => {
  await ldTurnedOn(page);
  await commit(page, DISTANCE_LABEL, "50000");
  await count(page);
  await expect(ldCount(page)).toHaveText(LD_KEPT);
  const kept = (await ldCount(page).textContent()) ?? "";

  await flip(filters(page), LD_SWITCH);
  await expect(distance(page)).toHaveCount(0);
  // The filters without the LD pruning were never counted.
  await expect(filters(page).getByText(/^Kept /)).toHaveCount(0);
  await expect(banner(page, "Undo")).toHaveAccessibleDescription(
    "Undo: the LD pruning was turned off",
  );
  await expectNoViolations(makeAxeBuilder);

  await flip(filters(page), LD_SWITCH);
  await expect(field(page, R2_LABEL)).toHaveValue("0.3");
  await expect(distance(page)).toHaveValue("50000");
  await expect(ldReason(page)).toHaveCount(0);
  // The counts of before, from the cache: no Count was pressed.
  await expect(ldCount(page)).toHaveText(kept);
  await expect(countButton(page)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("IP3 D3 in a new project the LD pruning turned on, off and on again before a distance is typed: the field empty and the lock back", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pickPanel(page);
  await flip(filters(page), LD_SWITCH);
  await expect(distance(page)).toHaveValue("");
  await expect(countButton(page)).toBeDisabled();

  await flip(filters(page), LD_SWITCH);
  await expect(distance(page)).toHaveCount(0);
  await expect(ldReason(page)).toHaveCount(0);
  await expect(countButton(page)).toBeEnabled();
  await expect(stepLink(page, "Variants")).toHaveAccessibleName(
    "Variants, Done",
  );
  await expectNoViolations(makeAxeBuilder);

  await flip(filters(page), LD_SWITCH);
  await expect(distance(page)).toHaveValue("");
  await expect(ldReason(page)).toBeVisible();
  await expect(countButton(page)).toBeDisabled();
  await expect(writeButton(page)).toBeDisabled();
  await expect(stepLink(page, "Variants")).toHaveAccessibleName(
    "Variants, Problem",
  );
  await expectNoViolations(makeAxeBuilder);
});

test("IP3 D3 the threshold of the individuals by observed heterozygosity at 0.38, turned off and on, is at 0.38", async ({
  page,
  makeAxeBuilder,
}) => {
  const obsHetSwitch = "Filter the individuals by observed heterozygosity";
  const obsHetLabel =
    "Maximum observed heterozygosity of an individual, from 0 to 1";
  await openVariants(page);
  await pickPanel(page);
  await flip(individualFilters(page), obsHetSwitch);
  await expect(field(page, obsHetLabel)).toHaveValue("0.5");
  await commit(page, obsHetLabel, "0.38");

  await flip(individualFilters(page), obsHetSwitch);
  await expect(field(page, obsHetLabel)).toHaveCount(0);
  await expect(banner(page, "Undo")).toHaveAccessibleDescription(
    "Undo: the filter of individuals by observed heterozygosity was turned off",
  );
  await expectNoViolations(makeAxeBuilder);

  await flip(individualFilters(page), obsHetSwitch);
  await expect(field(page, obsHetLabel)).toHaveValue("0.38");
  await expect(banner(page, "Undo")).toHaveAccessibleDescription(
    "Undo: the filter of individuals by observed heterozygosity was turned on",
  );
  await expectNoViolations(makeAxeBuilder);
});

test("IP3 a distance above 2^53 − 1 is refused with the number as it was typed", async ({
  page,
}) => {
  await ldTurnedOn(page);
  await commit(page, DISTANCE_LABEL, "50000");
  // 9007199254740993 is 9007199254740992 as a float.
  const line =
    "9007199254740993 is more than 9007199254740991; the distance stays 50000.";
  await distance(page).fill("9007199254740993");
  await distance(page).press("Enter");
  await expect(distance(page)).toHaveValue("50000");
  await expect(
    page.getByRole("main").getByText(line, { exact: true }),
  ).toBeVisible();
  await expect(status(page)).toHaveText(endsWith(line));
});

/** Pastes `text` into `input` where its selection is, as the browser's
    paste event carries it. A script's paste inserts no text by itself:
    what the field does is the page's. */
async function paste(input: Locator, text: string): Promise<void> {
  await input.evaluate((element, pasted) => {
    const transfer = new DataTransfer();
    transfer.setData("text/plain", pasted);
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: transfer,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, text);
}

test("IP3 the line of a count stands under a filter that is on only once a variants file is read, where a count can come", async ({
  page,
}) => {
  /** The space between the field of the missing data filter and the
      switch of the next filter, which the line of its count takes. */
  async function gap(): Promise<number> {
    const field = await filters(page)
      .getByLabel(MISSING_LABEL, { exact: true })
      .boundingBox();
    // The words of the switch: its input is hidden from the eye.
    const next = await filters(page)
      .getByText("Filter the variants by observed heterozygosity", {
        exact: true,
      })
      .boundingBox();
    if (field === null || next === null) throw new Error("not drawn");
    return next.y - (field.y + field.height);
  }
  await openVariants(page);
  const before = await gap();
  await pickPanel(page);
  // One line of 24 px, empty until a Count, and the 8 px of the gap of
  // the filter's grid before it.
  expect((await gap()) - before).toBe(32);
  await expect(filters(page).getByText(/^Kept /)).toHaveCount(0);
});

/** Puts the caret at the end of the text of `input`, with nothing
    selected. Not with End, which in a number field steps the number to
    the largest of its range. */
async function caretAtTheEnd(input: Locator): Promise<void> {
  await input.evaluate((element) => {
    if (!(element instanceof HTMLInputElement)) {
      throw new Error("not an input");
    }
    element.setSelectionRange(element.value.length, element.value.length);
  });
}

test("IP3 the number of the field pasted over it mends a character thrown away: 1 typed after it is taken, 500001", async ({
  page,
}) => {
  await ldTurnedOn(page);
  await commit(page, DISTANCE_LABEL, "50000");
  await distance(page).focus();
  await caretAtTheEnd(distance(page));
  await distance(page).pressSequentially("-");
  await expect(
    page.getByRole("main").getByText(/^‘-’ cannot be typed in the distance/),
  ).toBeVisible();
  await distance(page).selectText();
  await paste(distance(page), "50000");
  await caretAtTheEnd(distance(page));
  await distance(page).pressSequentially("1");
  await distance(page).press("Tab");
  await expect(distance(page)).toHaveValue("500001");
  await expect(
    page.getByRole("main").getByText(/cannot be typed in the distance/),
  ).toHaveCount(0);
  await expect(banner(page, "Undo")).toHaveAccessibleDescription(
    "Undo: the LD pruning changed",
  );
});

test("IP3 a paste at the caret that the field does not take leaves the next commit to be taken: 60000 pasted over 50000, then the Tab key", async ({
  page,
}) => {
  await ldTurnedOn(page);
  await commit(page, DISTANCE_LABEL, "50000");
  await distance(page).focus();
  await caretAtTheEnd(distance(page));
  await paste(distance(page), "-");
  await distance(page).selectText();
  await paste(distance(page), "60000");
  await distance(page).press("Tab");
  await expect(distance(page)).toHaveValue("60000");
  await expect(banner(page, "Undo")).toHaveAccessibleDescription(
    "Undo: the LD pruning changed",
  );
});

test("IP3 a distance above 2^53 − 1 pasted over the field is refused with the number as it was pasted", async ({
  page,
}) => {
  await ldTurnedOn(page);
  await commit(page, DISTANCE_LABEL, "50000");
  await distance(page).focus();
  await distance(page).selectText();
  await paste(distance(page), "9007199254740993");
  const line =
    "9007199254740993 is more than 9007199254740991; the distance stays 50000.";
  await expect(
    page.getByRole("main").getByText(line, { exact: true }),
  ).toBeVisible();
  await expect(distance(page)).toHaveValue("50000");
  await expect(status(page)).toHaveText(endsWith(line));
});

test("IP3 -5 pasted over the distance of 50000 gives one line, the character's, shown and announced", async ({
  page,
}) => {
  await ldTurnedOn(page);
  await commit(page, DISTANCE_LABEL, "50000");
  await distance(page).focus();
  await distance(page).selectText();
  await paste(distance(page), "-5");
  const line =
    "‘-’ cannot be typed in the distance, which is a whole number of base pairs, as 10000; the distance stays 50000.";
  await expect(
    page.getByRole("main").getByText(line, { exact: true }),
  ).toBeVisible();
  await expect(distance(page)).toHaveValue("50000");
  // Announced alone, and not after a line of -5 refused.
  await expect(status(page)).toHaveText(endsWith(line));
  await expect(status(page)).not.toContainText("is less than 1");
  await expect(page.getByRole("main").getByText(/is less than 1/)).toHaveCount(
    0,
  );
});

/** After a Count, 60000 typed in the distance of 50000 and not
    committed: the press on the switch takes the focus from the field,
    which commits 60000 and takes the counts off the page. */
async function typedAfterCount(page: Page): Promise<void> {
  await ldTurnedOn(page);
  await commit(page, DISTANCE_LABEL, "50000");
  await count(page);
  await expect(ldCount(page)).toHaveText(LD_KEPT);
  await distance(page).fill("60000");
}

/** Where the words of the LD switch are pressed: 3 px above their
    bottom, so that a line taken off above them, which would move them up
    by its height, leaves the pointer under them when it is let go. */
async function nearTheBottom(
  page: Page,
): Promise<{ readonly x: number; readonly y: number }> {
  const box = await filters(page)
    .getByText(LD_SWITCH, { exact: true })
    .boundingBox();
  if (box === null) throw new Error("the words of the LD switch are not drawn");
  return { x: 10, y: box.height - 3 };
}

/** The LD pruning turned off by the one press, with the distance kept. */
async function expectTurnedOff(page: Page): Promise<void> {
  await expect(page.getByRole("switch", { name: LD_SWITCH })).not.toBeChecked();
  await expect(distance(page)).toHaveCount(0);
  await expect(banner(page, "Undo")).toHaveAccessibleDescription(
    "Undo: the LD pruning was turned off",
  );
}

for (const [width, height] of [
  [1280, 720],
  [1280, 2000],
  [320, 720],
] as const) {
  test.describe(`a window ${String(width)} by ${String(height)} px`, () => {
    test.use({ viewport: { width, height } });

    test(`IP3 D3 with a distance typed and not committed after a Count, one click of the mouse on the switch turns the LD pruning off, at ${String(width)} by ${String(height)} px`, async ({
      page,
      makeAxeBuilder,
    }) => {
      await typedAfterCount(page);
      // The page as high as it goes, where it could not scroll up to
      // follow a switch that moved.
      if (height === 2000) {
        await page.evaluate(() => {
          window.scrollTo(0, 0);
        });
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
      }
      await filters(page)
        .getByText(LD_SWITCH, { exact: true })
        .click({ position: await nearTheBottom(page) });
      await expectTurnedOff(page);
      await expectNoViolations(makeAxeBuilder);
    });
  });
}

// A phone as wide as 320 px, where each count takes two lines, as well.
for (const width of [1280, 320]) {
  test.describe(`a touch screen ${String(width)} px wide`, () => {
    test.use({ hasTouch: true, viewport: { width, height: 720 } });

    test(`IP3 D3 with a distance typed and not committed after a Count, one tap on the switch turns the LD pruning off, ${String(width)} px wide`, async ({
      page,
    }) => {
      await typedAfterCount(page);
      await filters(page)
        .getByText(LD_SWITCH, { exact: true })
        .tap({ position: await nearTheBottom(page) });
      await expectTurnedOff(page);
    });
  });
}
