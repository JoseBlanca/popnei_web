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
  "The LD filter of the Variants step needs the distance within which variants are compared. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs, or turn off the LD filter.";

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

/** The reason beside the empty field of the distance, the first of the
    section, before the one beside the disabled Count; `toHaveCount(0)`
    on it says neither is there. */
function ldReason(page: Page): Locator {
  return filters(page).getByText(LD_REASON, { exact: true }).first();
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
  await expect(countButton(page)).toHaveAccessibleDescription(LD_REASON);
  await expect(writeButton(page)).toBeDisabled();
  await expect(writeButton(page)).toHaveAccessibleDescription(LD_REASON);
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
      "panel.nei · 200 individuals · 2 filters · no metadata file",
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
  await expect(countButton(page)).toBeDisabled();
  await expect(countButton(page)).toHaveAccessibleDescription(LD_REASON);
  await expect(filters(page).getByText(/^Kept /)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  await banner(page, "Redo").click();
  await expect(distance(page)).toHaveValue("50000");
  await expect(ldReason(page)).toHaveCount(0);
  await expect(ldCount(page)).toHaveText(kept);
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

test("IP3 -5 pasted over the distance of 50000 gives one line, the character's, shown and announced", async ({
  page,
}) => {
  await ldTurnedOn(page);
  await commit(page, DISTANCE_LABEL, "50000");
  await distance(page).focus();
  await distance(page).selectText();
  await distance(page).evaluate((input) => {
    const transfer = new DataTransfer();
    transfer.setData("text/plain", "-5");
    input.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: transfer,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
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

test("IP3 D3 with a distance typed and not committed after a Count, one click on the switch turns the LD pruning off", async ({
  page,
  makeAxeBuilder,
}) => {
  await ldTurnedOn(page);
  await commit(page, DISTANCE_LABEL, "50000");
  await count(page);
  await expect(ldCount(page)).toHaveText(LD_KEPT);
  // Typed, and not committed: the press takes the focus from the field,
  // which commits 60000 and takes the counts above the switch away.
  await distance(page).fill("60000");
  await flip(filters(page), LD_SWITCH);
  await expect(page.getByRole("switch", { name: LD_SWITCH })).not.toBeChecked();
  await expect(distance(page)).toHaveCount(0);
  await expect(banner(page, "Undo")).toHaveAccessibleDescription(
    "Undo: the LD pruning was turned off",
  );
  await expectNoViolations(makeAxeBuilder);
});
