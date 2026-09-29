/**
 * The two thresholds of the filters of individuals of the Variants step,
 * and what each filter of individuals kept, on the built site
 * (docs/specs/steps/variants.md, "The two thresholds", "What each filter
 * of the individuals kept" and "How it is checked", stage 3), on
 * e2e/fixtures/panel.nei, 1,200 variants of 200 individuals, with the
 * numbers popnei's release js-v0.1.0-dev.3 gave in node on 28 September
 * 2026 (docs/specs/core/individualsKept.md): over every variant of the
 * file, the statistics of each individual having no filter from that day,
 * a threshold of 0.03 on the missing rate keeps 116 of the 200
 * individuals, and one of 0.38 on the heterozygosity 111 of those 116;
 * written before the missing data filter of the variants at 0.05, they
 * give panel.filtered.nei of 156,818 bytes (runner.md, "How it is
 * verified", "The written file").
 * axe at each state reached.
 */
import { stat } from "node:fs/promises";
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

const VARIANTS_MISSING_LABEL =
  "Maximum proportion of missing genotypes, from 0 to 1";
const MISSING_SWITCH = "Filter the individuals by missing data";
const MISSING_LABEL =
  "Maximum proportion of missing genotypes of an individual, from 0 to 1";
const OBS_HET_SWITCH = "Filter the individuals by observed heterozygosity";
const OBS_HET_LABEL =
  "Maximum observed heterozygosity of an individual, from 0 to 1";
const OBS_HET_LINE =
  "An individual with no called genotype has no observed heterozygosity, and this filter removes it.";
const CALCULATE = "Calculate the statistics of each individual";
const CAPTION =
  "The statistics of the 200 individuals of panel.nei, over its 1,200 variants, before any filter of the variants.";
const KEPT_116 = "Kept 116 of the 200 individuals it was given.";
const KEPT_111 = "Kept 111 of the 116 individuals it was given.";
const PASS_111 = "111 of the 200 individuals of panel.nei pass the filters.";
const KNOWN_ONCE =
  "Known once the statistics of each individual are calculated.";
const NONE_KEPT =
  "The filters of individuals keep none of the 200 individuals of panel.nei. Loosen them.";
const NONE_KEPT_WHOLE =
  "The filters of individuals keep none of the 200 individuals of panel.nei. Loosen them in the Variants step.";
const MISSING_TITLE = "Proportion of missing genotypes of each individual";
const OBS_HET_TITLE = "Observed heterozygosity of each individual";

/** The size of panel.nei written with the individuals the thresholds at
    0.03 and 0.38 keep, before the missing data filter of the variants at
    0.05, which the writeVars of popnei's js-v0.1.0-dev.3 gave in node
    (runner.md, "How it is verified", "The written file"). */
const WRITTEN_111 = 156_818;

/** The size of the same file with the LD pruning on as well, r² 0.3
    within 50,000 base pairs, which keeps 1,067 variants (node, 28
    September 2026; docs/specs/steps/variants.md, "How it is checked"). */
const WRITTEN_111_LD = 150_290;

const LD_SWITCH = "Prune the variants by linkage disequilibrium (LD)";
const LD_DISTANCE_LABEL =
  "Distance within which variants are compared, in base pairs, from 1";
const COUNT = "Count the variants each filter keeps";

/** The modifier of the keyboard's Undo on this engine's platform. */
const UNDO = process.platform === "darwin" ? "Meta+z" : "Control+z";

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

function section(page: Page): Locator {
  return page.getByRole("region", { name: "Filters of the individuals" });
}

function field(page: Page, label: string): Locator {
  return section(page).getByLabel(label, { exact: true });
}

/** Turns a switch on or off with the mouse, on its words, as a user
    does: the element of the switch itself sits under them. */
async function flip(page: Page, name: string): Promise<void> {
  await section(page).getByText(name, { exact: true }).click();
}

function histogram(page: Page, title: string): Locator {
  return page.getByRole("group", { name: title });
}

function table(page: Page): Locator {
  return section(page).getByRole("grid", {
    name: "Statistics of each individual",
  });
}

/** The cell Kept of the individual `name` in the table. */
function keptCellOf(page: Page, name: string): Locator {
  return table(page)
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name, exact: true }) })
    .getByRole("gridcell")
    .last();
}

function status(page: Page): Locator {
  return page.getByRole("status").last();
}

function banner(page: Page, name: string): Locator {
  return page.getByRole("banner").getByRole("button", { name, exact: true });
}

function stepLink(page: Page): Locator {
  return page
    .getByRole("navigation", { name: "Steps" })
    .getByRole("link", { name: /^Variants, / });
}

function writing(page: Page): Locator {
  return page.getByRole("region", { name: "Writing the filtered variants" });
}

function writeButton(page: Page): Locator {
  return writing(page).getByRole("button", {
    name: "Write the filtered variants as a .nei file",
  });
}

/** Commits `value` in the field `label` with Enter. */
async function commit(page: Page, label: string, value: string): Promise<void> {
  await field(page, label).fill(value);
  await field(page, label).press("Enter");
  await expect(field(page, label)).toHaveValue(value);
}

/** panel.nei read with the missing data filter of the variants at
    0.05. */
async function panelAt005(page: Page): Promise<void> {
  await page.goto("popgen.html#variants");
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Variants file" })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (await chooser).setFiles(join(FIXTURES, "panel.nei"));
  await expect(
    page.getByRole("main").getByText("200 individuals"),
  ).toBeVisible();
  const variants = page.getByLabel(VARIANTS_MISSING_LABEL, { exact: true });
  await variants.fill("0.05");
  await variants.press("Enter");
  await expect(variants).toHaveValue("0.05");
}

async function calculate(page: Page): Promise<void> {
  await section(page).getByRole("button", { name: CALCULATE }).click();
  await expect(section(page).getByText(CAPTION, { exact: true })).toBeVisible();
}

/** panel.nei at 0.05, its statistics calculated, and the thresholds at
    0.03 and 0.38. */
async function thresholdsSet(page: Page): Promise<void> {
  await panelAt005(page);
  await calculate(page);
  await flip(page, MISSING_SWITCH);
  await commit(page, MISSING_LABEL, "0.03");
  await flip(page, OBS_HET_SWITCH);
  await commit(page, OBS_HET_LABEL, "0.38");
  // Heard as well as seen: the field's description changed under the
  // focus, which a screen reader does not read again.
  await expect(status(page)).toHaveText(
    new RegExp(`(^| )${PASS_111.replaceAll(".", "\\.")}$`),
  );
  await expect(
    section(page).getByText(PASS_111, { exact: true }),
  ).toBeVisible();
}

test("IP2 D3, VS7 D1 the thresholds at 0.03 and 0.38: Kept 116 of the 200, then 111 of 116, the line of the individuals that pass, the column Kept, the lines beside the histograms and the summary line, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await panelAt005(page);
  await calculate(page);
  // Off in a new project, with no field and no count.
  await expect(
    section(page).getByRole("switch", { name: MISSING_SWITCH }),
  ).not.toBeChecked();
  await expect(field(page, MISSING_LABEL)).toHaveCount(0);
  await expect(section(page).getByText(/^Kept /)).toHaveCount(0);
  await expect(section(page).getByText(/pass the filters\.$/)).toHaveCount(0);

  // Turned on at 0.1, plink's --mind.
  await flip(page, MISSING_SWITCH);
  await expect(field(page, MISSING_LABEL)).toHaveValue("0.1");
  await expect(banner(page, "Undo")).toHaveAccessibleDescription(
    "Undo: the filter of individuals by missing data was turned on",
  );
  await commit(page, MISSING_LABEL, "0.03");
  await expect(field(page, MISSING_LABEL)).toHaveAccessibleDescription(
    KEPT_116,
  );
  await expect(
    section(page).getByText(KEPT_116, { exact: true }),
  ).toBeVisible();
  await expect(
    section(page).getByText(
      "116 of the 200 individuals of panel.nei pass the filters.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    histogram(page, MISSING_TITLE).getByText(
      "Threshold of the filter of individuals by missing data: 0.03, drawn over every individual of the file",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    histogram(page, MISSING_TITLE).getByText(
      "The threshold 0.03 splits the bin from 0.0295 to 0.0308, 12 individuals: the filter keeps those of its individuals at most 0.03 and removes the others.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    histogram(page, MISSING_TITLE).locator("svg.chart"),
  ).toHaveAccessibleName(
    /The threshold 0\.03 keeps the 9 bins up to it, 104 individuals, splits the bin from 0\.0295 to 0\.0308, 12 individuals, and removes the 10 bins above it, 84 individuals\./,
  );
  await expectNoViolations(makeAxeBuilder);

  // Turned on at 0.5, then 0.38.
  await flip(page, OBS_HET_SWITCH);
  await expect(field(page, OBS_HET_LABEL)).toHaveValue("0.5");
  await commit(page, OBS_HET_LABEL, "0.38");
  await expect(field(page, OBS_HET_LABEL)).toHaveAccessibleDescription(
    `${KEPT_111} ${OBS_HET_LINE}`,
  );
  await expect(
    section(page).getByText(PASS_111, { exact: true }),
  ).toBeVisible();
  await expect(
    histogram(page, OBS_HET_TITLE).getByText(
      "Threshold of the filter of individuals by observed heterozygosity: 0.38, drawn over every individual of the file",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(banner(page, "Undo")).toHaveAccessibleDescription(
    "Undo: the filter of individuals by observed heterozygosity changed",
  );
  // The column Kept: s000, 0.0283 and 0.3654, kept; s001, 0.0367,
  // removed by the missing rate.
  await expect(table(page).getByRole("columnheader").last()).toHaveText(
    /^Kept/,
  );
  await expect(keptCellOf(page, "s000")).toHaveText("kept");
  await expect(keptCellOf(page, "s001")).toHaveText("removed");
  await expect(page.getByText(/111 of 200 individuals kept/)).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
});

test("IP2 D3, VS7 D1 a list applied has its count beside it, which describes its text area, and the thresholds count from what it kept, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await thresholdsSet(page);
  const remove = section(page).getByRole("textbox", {
    name: "Individuals to remove, one name per line",
  });
  // s000 is kept by both thresholds, s001 removed by the missing rate.
  await remove.fill("s000\ns001");
  await section(page)
    .getByRole("button", { name: "Apply the list to remove", exact: true })
    .click();
  const listCount = "Kept 198 of the 200 individuals it was given.";
  await expect(
    section(page).getByText(listCount, { exact: true }),
  ).toBeVisible();
  await expect(remove).toHaveAccessibleDescription(listCount);
  await expect(field(page, MISSING_LABEL)).toHaveAccessibleDescription(
    "Kept 115 of the 198 individuals it was given.",
  );
  await expect(field(page, OBS_HET_LABEL)).toHaveAccessibleDescription(
    `Kept 110 of the 115 individuals it was given. ${OBS_HET_LINE}`,
  );
  await expect(
    section(page).getByText(
      "110 of the 200 individuals of panel.nei pass the filters.",
      { exact: true },
    ),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
});

test("IP2 D3, VS7 D1 0.12345 refused: the line under the field, announced and describing it, the threshold kept at 0.03, and the counts as they were, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await thresholdsSet(page);
  const refused =
    "0.12345 has more than four decimals; the threshold stays 0.03.";
  await field(page, MISSING_LABEL).fill("0.12345");
  await field(page, MISSING_LABEL).press("Enter");
  await expect(field(page, MISSING_LABEL)).toHaveValue("0.03");
  await expect(section(page).getByText(refused, { exact: true })).toBeVisible();
  await expect(status(page)).toHaveText(refused);
  await expect(field(page, MISSING_LABEL)).toHaveAccessibleDescription(
    `${refused} ${KEPT_116}`,
  );
  await expect(
    section(page).getByText(PASS_111, { exact: true }),
  ).toBeVisible();
  await expect(banner(page, "Undo")).toHaveAccessibleDescription(
    "Undo: the filter of individuals by observed heterozygosity changed",
  );
  await expectNoViolations(makeAxeBuilder);

  // Four decimals are taken.
  await commit(page, MISSING_LABEL, "0.0312");
  await expect(section(page).getByText(refused)).toHaveCount(0);
  await expect(banner(page, "Undo")).toHaveAccessibleDescription(
    "Undo: the filter of individuals by missing data changed",
  );
});

test("IP2 D3, VS7 D1 a threshold typed and not committed moves its line and its plot, and not the counts; 0,03 typed key by key keeps 0.03 with the line of the comma; Cmd+Z puts the number committed back", async ({
  page,
}) => {
  await thresholdsSet(page);
  const line = histogram(page, OBS_HET_TITLE).getByText(/^Threshold of /);
  const obsHet = field(page, OBS_HET_LABEL);
  await obsHet.fill("0.36");
  await expect(line).toHaveText(
    "Threshold of the filter of individuals by observed heterozygosity: 0.36, drawn over every individual of the file",
  );
  await expect(
    histogram(page, OBS_HET_TITLE).locator("svg.chart"),
  ).toHaveAccessibleName(/The threshold 0\.36 /);
  await expect(
    section(page).getByText(KEPT_111, { exact: true }),
  ).toBeVisible();
  // Something typed: Cmd+Z puts 0.38 back, and leaves the project.
  await obsHet.press(UNDO);
  await expect(obsHet).toHaveValue("0.38");
  await expect(line).toHaveText(/: 0\.38, /);
  await expect(banner(page, "Undo")).toHaveAccessibleDescription(
    "Undo: the filter of individuals by observed heterozygosity changed",
  );

  // A comma thrown away, key by key.
  const missing = field(page, MISSING_LABEL);
  await missing.fill("");
  await missing.pressSequentially("0,03");
  const comma =
    "Write the decimals with a point, 0.1 and not 0,1; the threshold stays 0.03.";
  await expect(section(page).getByText(comma, { exact: true })).toBeVisible();
  await expect(
    histogram(page, MISSING_TITLE).getByText(/^Threshold of /),
  ).toHaveText(/: 0\.03, /);
  await missing.press("Enter");
  await expect(missing).toHaveValue("0.03");
  await expect(
    section(page).getByText(KEPT_116, { exact: true }),
  ).toBeVisible();

  // Nothing typed: Cmd+Z is the project's Undo, of 0.38.
  await obsHet.focus();
  await obsHet.press(UNDO);
  await expect(obsHet).toHaveValue("0.5");
  await expect(
    section(page).getByText("Kept 116 of the 116 individuals it was given.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("IP2 D3, VS7 D1 an Undo of the header and a switch turned off take the threshold, its count and its line back, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await thresholdsSet(page);
  await banner(page, "Undo").click();
  await expect(field(page, OBS_HET_LABEL)).toHaveValue("0.5");
  await expect(
    histogram(page, OBS_HET_TITLE).getByText(/^Threshold of /),
  ).toHaveText(/: 0\.5, /);
  await banner(page, "Redo").click();
  await expect(field(page, OBS_HET_LABEL)).toHaveValue("0.38");

  await flip(page, OBS_HET_SWITCH);
  await expect(field(page, OBS_HET_LABEL)).toHaveCount(0);
  await expect(section(page).getByText(KEPT_111)).toHaveCount(0);
  await expect(
    histogram(page, OBS_HET_TITLE).getByText(/^Threshold of /),
  ).toHaveCount(0);
  await expect(
    section(page).getByText(
      "116 of the 200 individuals of panel.nei pass the filters.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(banner(page, "Undo")).toHaveAccessibleDescription(
    "Undo: the filter of individuals by observed heterozygosity was turned off",
  );
  await expectNoViolations(makeAxeBuilder);
});

test("IP2 D3, VS7 D1 the missing data filter of the variants moved: the statistics and the counts of the thresholds stay, with no notice, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await thresholdsSet(page);
  const variants = page.getByLabel(VARIANTS_MISSING_LABEL, { exact: true });
  await variants.fill("0.06");
  await variants.press("Enter");
  await expect(variants).toHaveValue("0.06");
  await expect(
    section(page).getByText(PASS_111, { exact: true }),
  ).toBeVisible();
  await expect(
    section(page).getByText(KEPT_116, { exact: true }),
  ).toBeVisible();
  await expect(
    section(page).getByText(KEPT_111, { exact: true }),
  ).toBeVisible();
  await expect(section(page).getByText(KNOWN_ONCE)).toHaveCount(0);
  await expect(section(page).getByText(/were removed/)).toHaveCount(0);
  // No calculation: no bar, and no button of the statistics.
  await expect(section(page).getByRole("progressbar")).toHaveCount(0);
  await expect(
    section(page).getByRole("button", { name: CALCULATE }),
  ).toHaveCount(0);
  await expect(section(page).getByText(CAPTION, { exact: true })).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Notice" })
      .getByText(/Statistics of each individual/),
  ).toHaveCount(0);
  await expect(histogram(page, MISSING_TITLE)).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  await banner(page, "Undo").click();
  await expect(variants).toHaveValue("0.05");
  await expect(
    section(page).getByText(PASS_111, { exact: true }),
  ).toBeVisible();
  await expect(section(page).getByText(KNOWN_ONCE)).toHaveCount(0);
});

test("VS7 D1 an arrow key moves a threshold by 0.01, committed at once with its count", async ({
  page,
}) => {
  await thresholdsSet(page);
  await field(page, MISSING_LABEL).focus();
  await page.keyboard.press("ArrowUp");
  await expect(field(page, MISSING_LABEL)).toHaveValue("0.04");
  await expect(section(page).getByText(KEPT_116, { exact: true })).toHaveCount(
    0,
  );
  await expect(
    section(page).getByText(/^Kept \d+ of the 200 individuals it was given\.$/),
  ).toBeVisible();
  // Stepped six times at once: what the filters keep is said once.
  for (let press = 0; press < 6; press += 1) {
    await page.keyboard.press("ArrowUp");
  }
  await expect(field(page, MISSING_LABEL)).toHaveValue("0.1");
  await expect(status(page)).toHaveText(/pass the filters\.$/);
  const said = (await status(page).textContent()) ?? "";
  expect(said.match(/pass the filters/g)).toHaveLength(1);
});

test("VS7 D1 before the statistics, a threshold turned on says it is known once they are calculated, and a new file loaded says so again", async ({
  page,
}) => {
  await panelAt005(page);
  await flip(page, MISSING_SWITCH);
  await expect(field(page, MISSING_LABEL)).toHaveAccessibleDescription(
    KNOWN_ONCE,
  );
  await expect(histogram(page, MISSING_TITLE)).toHaveCount(0);
  await calculate(page);
  await expect(
    section(page).getByText("Kept 200 of the 200 individuals it was given.", {
      exact: true,
    }),
  ).toBeVisible();
  // A new load: the statistics are of the old one.
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Variants file" })
    .getByRole("button", { name: /^Replace .*…$/ })
    .click();
  await (await chooser).setFiles(join(FIXTURES, "panel.nei"));
  await expect(
    section(page).getByText(KNOWN_ONCE, { exact: true }),
  ).toBeVisible();
});

test("IP2 D3, VS7 D1 thresholds that keep none: the reason under the filters, announced and describing each field, Write disabled, and the Variants step at Problem in the stepper with the whole words, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await thresholdsSet(page);
  // Every individual of panel.nei has an observed heterozygosity above 0.3.
  await commit(page, OBS_HET_LABEL, "0.1");
  await expect(
    section(page).getByText(NONE_KEPT, { exact: true }),
  ).toBeVisible();
  await expect(status(page)).toHaveText(NONE_KEPT);
  await expect(
    section(page).getByText("Kept 0 of the 116 individuals it was given.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(field(page, MISSING_LABEL)).toHaveAccessibleDescription(
    `${KEPT_116} ${NONE_KEPT}`,
  );
  await expect(field(page, OBS_HET_LABEL)).toHaveAccessibleDescription(
    `Kept 0 of the 116 individuals it was given. ${NONE_KEPT} ${OBS_HET_LINE}`,
  );
  await expect(section(page).getByText(/pass the filters\.$/)).toHaveCount(0);
  await expect(section(page).getByText("Variants step")).toHaveCount(0);
  await expect(writeButton(page)).toBeDisabled();
  await expect(writeButton(page)).toHaveAccessibleDescription(NONE_KEPT);
  await expect(stepLink(page)).toHaveAccessibleName("Variants, Problem");
  await expect(stepLink(page)).toHaveAccessibleDescription(NONE_KEPT_WHOLE);
  await expect(page.getByText(/none of 200 individuals kept/)).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  // Loosened: the reason goes, with nothing announced.
  await commit(page, OBS_HET_LABEL, "0.38");
  await expect(section(page).getByText(NONE_KEPT)).toHaveCount(0);
  await expect(
    section(page).getByText(PASS_111, { exact: true }),
  ).toBeVisible();
  await expect(stepLink(page)).toHaveAccessibleName("Variants, Done");
  await expect(writeButton(page)).toBeEnabled();
});

test("VS7 D1 a list to remove of every individual, then a threshold turned on: the reason at once, Kept 0 of the 0, Write disabled, with no statistics", async ({
  page,
}) => {
  await panelAt005(page);
  const everyone = Array.from(
    { length: 200 },
    (_, index) => `s${String(index).padStart(3, "0")}`,
  );
  await section(page)
    .getByLabel("Individuals to remove, one name per line", { exact: true })
    .fill(everyone.join("\n"));
  await section(page)
    .getByRole("button", { name: "Apply the list to remove" })
    .click();
  await expect(
    section(page).getByText(NONE_KEPT, { exact: true }),
  ).toBeVisible();
  await flip(page, MISSING_SWITCH);
  await expect(
    section(page).getByText("Kept 0 of the 0 individuals it was given.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(section(page).getByText(KNOWN_ONCE)).toHaveCount(0);
  await expect(
    section(page).getByText(NONE_KEPT, { exact: true }),
  ).toBeVisible();
  await expect(writeButton(page)).toBeDisabled();
  await expect(writeButton(page)).toHaveAccessibleDescription(NONE_KEPT);
});

test("VS7 D1 the keyboard goes from the button of the statistics through each threshold, its switch, its field and its histogram, to the table", async ({
  page,
}) => {
  await thresholdsSet(page);
  const missingSwitch = section(page).getByRole("switch", {
    name: MISSING_SWITCH,
  });
  await missingSwitch.focus();
  const order: Locator[] = [
    field(page, MISSING_LABEL),
    histogram(page, MISSING_TITLE).getByRole("tab", { name: "Plot" }),
    histogram(page, MISSING_TITLE).getByRole("tabpanel"),
    histogram(page, MISSING_TITLE).getByRole("button", {
      name: "Download the bins as CSV",
    }),
    section(page).getByRole("switch", { name: OBS_HET_SWITCH }),
    field(page, OBS_HET_LABEL),
    histogram(page, OBS_HET_TITLE).getByRole("tab", { name: "Plot" }),
    histogram(page, OBS_HET_TITLE).getByRole("tabpanel"),
    histogram(page, OBS_HET_TITLE).getByRole("button", {
      name: "Download the bins as CSV",
    }),
  ];
  for (const next of order) {
    await page.keyboard.press("Tab");
    await expect(next).toBeFocused();
  }
  await page.keyboard.press("Tab");
  await expect(
    table(page).locator(":focus, :focus-within").first(),
  ).toBeVisible();
  // The switch turned off with the keyboard.
  await missingSwitch.focus();
  await page.keyboard.press("Space");
  await expect(missingSwitch).not.toBeChecked();
  await expect(field(page, MISSING_LABEL)).toHaveCount(0);
});

test("IP2 D3, IP1 D2 the written files of dev.3 on the screen, VS7 D3 the write of the individuals kept: with the thresholds at 0.03 and 0.38, Write and Save give panel.filtered.nei of 156,818 bytes", async ({
  page,
}, testInfo) => {
  await thresholdsSet(page);
  await writeButton(page).click();
  const save = writing(page).getByRole("button", {
    name: /^Save panel\.filtered\.nei, /,
  });
  await expect(save).toBeVisible();
  const download = page.waitForEvent("download");
  await save.click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("panel.filtered.nei");
  const path = testInfo.outputPath("panel.filtered.nei");
  await file.saveAs(path);
  expect((await stat(path)).size).toBe(WRITTEN_111);
});

test("IP10 D3 the write of the individuals kept with the LD pruning on as well, r² 0.3 within 50,000: Write and Save give panel.filtered.nei of 150,290 bytes and 1,067 variants, and with the pruning turned off again 156,818 bytes", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  await thresholdsSet(page);
  const variantFilters = page.getByRole("region", {
    name: "Filters of the variants",
  });
  await variantFilters.getByText(LD_SWITCH, { exact: true }).click();
  const distance = variantFilters.getByLabel(LD_DISTANCE_LABEL, {
    exact: true,
  });
  await distance.fill("50000");
  await distance.press("Enter");
  await expect(distance).toHaveValue("50000");
  await variantFilters.getByRole("button", { name: COUNT }).click();
  await expect(
    variantFilters.getByText(
      "1,067 of the 1,200 variants of panel.nei pass the filters.",
      { exact: true },
    ),
  ).toBeVisible();

  /** Writes, saves, and gives the size of the file downloaded. */
  const writeAndSave = async (saved: string): Promise<number> => {
    await writeButton(page).click();
    const save = writing(page).getByRole("button", {
      name: /^Save panel\.filtered\.nei, /,
    });
    await expect(save).toBeVisible();
    const download = page.waitForEvent("download");
    await save.click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("panel.filtered.nei");
    const path = testInfo.outputPath(saved);
    await file.saveAs(path);
    return (await stat(path)).size;
  };
  expect(await writeAndSave("with-ld.nei")).toBe(WRITTEN_111_LD);
  await expectNoViolations(makeAxeBuilder);

  await variantFilters.getByText(LD_SWITCH, { exact: true }).click();
  await expect(distance).toHaveCount(0);
  expect(await writeAndSave("without-ld.nei")).toBe(WRITTEN_111);
});
