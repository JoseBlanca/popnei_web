/**
 * The Variants step in the order where the individuals are filtered
 * first, on the built site (docs/specs/steps/variants.md, "The parts, in
 * their order" and "How it is checked", the numbers with the filters of
 * individuals first), on e2e/fixtures/panel.nei, 1,200 variants of 200
 * individuals, with the numbers popnei's release js-v0.1.0-dev.3 gave in
 * node on 28 September 2026 (orderA.mjs of docs/specs/worker/runner.md):
 * the thresholds of the individuals at 0.03 and 0.38 keep 111
 * individuals; the histograms of the variants over them, the mean of the
 * MAF 0.7173, where it is 0.7163 over the 200; the missing data filter of
 * the variants at 0.05 over them keeps 1,117 of the 1,200 variants. The
 * section of the individuals comes before that of the variants, in the
 * order of the headings and of the Tab key; a list that names someone not
 * in the file, or filters of individuals that keep nobody, lock the Count
 * and the histograms of the variants, and not the statistics of each
 * individual. axe at each state reached.
 */
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
const STATISTICS = "Calculate the statistics of each individual";
const STATS_CAPTION =
  "The statistics of the 200 individuals of panel.nei, over its 1,200 variants, before any filter of the variants.";
const HISTOGRAMS = "Calculate the histograms of the variants";
const COUNT = "Count the variants each filter keeps";
const WRITE = "Write the filtered variants as a .nei file";
const PASS_111 = "111 of the 200 individuals of panel.nei pass the filters.";
const MAF_ALL = "Major allele frequency, mean 0.7163";
const MAF_111 = "Major allele frequency, mean 0.7173";
const CAPTION_ALL = "Over the 1,200 variants of panel.nei, before any filter.";
const CAPTION_111 =
  "Over the 1,200 variants of panel.nei and the 111 individuals the filters of individuals keep, before any filter of the variants.";
const REMOVED_TURNED_ON =
  "The histograms of the variants were removed because the filter of individuals by missing data was turned on. Undo brings them back as they were, with no calculation; Calculate makes them anew for the settings as they are now.";
const REMOVED_CHANGED =
  "The histograms of the variants were removed because the filter of individuals by missing data changed. Undo brings them back as they were, with no calculation; Calculate makes them anew for the settings as they are now.";
const KEPT_1117 = "Kept 1,117 of the 1,200 variants it was given.";
const TOTAL_1117 = "1,117 of the 1,200 variants of panel.nei pass the filters.";
const NOT_COUNTED =
  "Not counted for these filters. Count to see what each filter keeps.";
/** The reason of a list to keep that names ind_900, not in panel.nei, as
    the step shows it beside a disabled button, without the end "in the
    Variants step". */
const IND_900 =
  "The list of individuals to keep names 1 individual that is not in panel.nei: ind_900. Change the list, or remove the filter.";
const NONE_KEPT =
  "The filters of individuals keep none of the 200 individuals of panel.nei. Loosen them.";

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

function individuals(page: Page): Locator {
  return page.getByRole("region", { name: "Filters of the individuals" });
}

function variants(page: Page): Locator {
  return page.getByRole("region", { name: "Filters of the variants" });
}

function writing(page: Page): Locator {
  return page.getByRole("region", { name: "Writing the filtered variants" });
}

function button(scope: Locator, name: string): Locator {
  return scope.getByRole("button", { name, exact: true });
}

function mafHistogram(page: Page): Locator {
  return page.getByRole("group", { name: /^Major allele frequency, / });
}

function notice(page: Page): Locator {
  return page.getByRole("region", { name: "Notice" });
}

/** panel.nei picked with the file button and read. */
async function panelRead(page: Page): Promise<void> {
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
}

/** The missing data filter of the variants at 0.05. */
async function variantsAt005(page: Page): Promise<void> {
  const field = variants(page).getByLabel(VARIANTS_MISSING_LABEL, {
    exact: true,
  });
  await field.fill("0.05");
  await field.press("Enter");
  await expect(field).toHaveValue("0.05");
}

/** The threshold of the switch `name` and the field `label` turned on and
    committed at `value`. */
async function threshold(
  page: Page,
  name: string,
  label: string,
  value: string,
): Promise<void> {
  await individuals(page).getByText(name, { exact: true }).click();
  const field = individuals(page).getByLabel(label, { exact: true });
  await field.fill(value);
  await field.press("Enter");
  await expect(field).toHaveValue(value);
}

/** The two thresholds of the individuals at 0.03 and 0.38. */
async function thresholdsSet(page: Page): Promise<void> {
  await threshold(page, MISSING_SWITCH, MISSING_LABEL, "0.03");
  await threshold(page, OBS_HET_SWITCH, OBS_HET_LABEL, "0.38");
}

/** The statistics of each individual calculated. */
async function statistics(page: Page): Promise<void> {
  await button(individuals(page), STATISTICS).click();
  await expect(
    individuals(page).getByText(STATS_CAPTION, { exact: true }),
  ).toBeVisible();
}

test("IP2 D3 the section of the individuals comes before that of the variants, in the order of the headings, before any file and with a file read, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await page.goto("popgen.html#variants");
  const main = page.getByRole("main");
  const sections = [
    "Variants file",
    "How a VCF is read",
    "Filters of the individuals",
    "Filters of the variants",
    "Writing the filtered variants",
  ];
  // Before a file, the writing is not drawn.
  await expect(main.getByRole("heading", { level: 2 })).toHaveText(
    sections.slice(0, 4),
  );
  // Before a file, the line of the checks stands under the heading of the
  // filters of the variants.
  await expect(
    variants(page).getByText(
      "The histograms, the counts and the statistics of each individual are calculated once a variants file is read.",
      { exact: true },
    ),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  await panelRead(page);
  await expect(main.getByRole("heading", { level: 2 })).toHaveText(sections);
  await expect(main.getByRole("heading", { level: 3 })).toHaveText([
    "Statistics of each individual",
    "Histograms of the variants",
  ]);
  // Laid out in that order down the page as well.
  const individualsBox = await individuals(page).boundingBox();
  const variantsBox = await variants(page).boundingBox();
  expect(individualsBox?.y ?? Infinity).toBeLessThan(variantsBox?.y ?? 0);
  await expectNoViolations(makeAxeBuilder);
});

test("IP2 D3 the Tab key goes through the filters of the individuals, then those of the variants, then the writing", async ({
  page,
}) => {
  await panelRead(page);
  await page
    .getByRole("checkbox", {
      name: "Only the variants with PASS or . in the FILTER column",
    })
    .focus();
  const order = [
    individuals(page).getByRole("textbox", {
      name: "Individuals to keep, one name per line",
    }),
    button(individuals(page), "Apply the list to keep"),
    button(individuals(page), "Clear the list to keep"),
    individuals(page).getByRole("textbox", {
      name: "Individuals to remove, one name per line",
    }),
    button(individuals(page), "Apply the list to remove"),
    button(individuals(page), "Clear the list to remove"),
    button(individuals(page), STATISTICS),
    individuals(page).getByRole("switch", { name: MISSING_SWITCH }),
    individuals(page).getByRole("switch", { name: OBS_HET_SWITCH }),
    button(variants(page), HISTOGRAMS),
    variants(page).getByRole("switch", {
      name: "Filter the variants by missing data",
    }),
    variants(page).getByLabel(VARIANTS_MISSING_LABEL, { exact: true }),
    variants(page).getByRole("switch", {
      name: "Filter the variants by observed heterozygosity",
    }),
    variants(page).getByRole("switch", {
      name: "Filter the variants by major allele frequency (MAF)",
    }),
    variants(page).getByRole("switch", {
      name: "Prune the variants by linkage disequilibrium (LD)",
    }),
    button(variants(page), COUNT),
    button(writing(page), WRITE),
  ];
  for (const next of order) {
    await page.keyboard.press("Tab");
    await expect(next).toBeFocused();
  }
});

test("IP2 D3 the histograms of the variants removed by the thresholds of the individuals, with the notice, and calculated again over the 111 individuals kept: the mean of the MAF 0.7173, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await panelRead(page);
  await variantsAt005(page);
  await button(variants(page), HISTOGRAMS).click();
  await expect(mafHistogram(page)).toHaveAccessibleName(MAF_ALL);
  await expect(
    variants(page).getByText(CAPTION_ALL, { exact: true }),
  ).toBeVisible();
  await statistics(page);

  // The switch turned on is the change that removes them.
  await individuals(page).getByText(MISSING_SWITCH, { exact: true }).click();
  await expect(
    variants(page).getByText(REMOVED_TURNED_ON, { exact: true }),
  ).toBeVisible();
  await expect(mafHistogram(page)).toHaveCount(0);
  await expect(
    notice(page).getByText(
      "Histograms of the variants removed because the filter of individuals by missing data was turned on",
    ),
  ).toBeVisible();
  // The statistics read no filter, and stay.
  await expect(
    individuals(page).getByText(STATS_CAPTION, { exact: true }),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  const missing = individuals(page).getByLabel(MISSING_LABEL, { exact: true });
  await missing.fill("0.03");
  await missing.press("Enter");
  await expect(missing).toHaveValue("0.03");
  await threshold(page, OBS_HET_SWITCH, OBS_HET_LABEL, "0.38");
  await expect(
    individuals(page).getByText(PASS_111, { exact: true }),
  ).toBeVisible();
  await button(variants(page), HISTOGRAMS).click();
  await expect(mafHistogram(page)).toHaveAccessibleName(MAF_111);
  await expect(
    variants(page).getByText(CAPTION_111, { exact: true }),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  // A threshold changed removes them, with its words; an Undo brings them
  // back with no calculation.
  await missing.fill("0.04");
  await missing.press("Enter");
  await expect(
    variants(page).getByText(REMOVED_CHANGED, { exact: true }),
  ).toBeVisible();
  await expect(mafHistogram(page)).toHaveCount(0);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Undo", exact: true })
    .click();
  await expect(missing).toHaveValue("0.03");
  await expect(mafHistogram(page)).toHaveAccessibleName(MAF_111);
  await expect(button(variants(page), HISTOGRAMS)).toHaveCount(0);
  await expect(variants(page).getByRole("progressbar")).toHaveCount(0);
});

test("IP2 D3 with the thresholds set and no statistics, Calculate of the histograms of the variants calculates the statistics first, then the histograms over the 111 individuals kept", async ({
  page,
}) => {
  await panelRead(page);
  await thresholdsSet(page);
  await expect(
    individuals(page).getByText(
      "Known once the statistics of each individual are calculated.",
      { exact: true },
    ),
  ).toHaveCount(2);
  await button(variants(page), HISTOGRAMS).click();
  await expect(mafHistogram(page)).toHaveAccessibleName(MAF_111);
  await expect(
    individuals(page).getByText(STATS_CAPTION, { exact: true }),
  ).toBeVisible();
  await expect(
    individuals(page).getByText(PASS_111, { exact: true }),
  ).toBeVisible();
});

test("IP2 D3 the Count with the thresholds at 0.03 and 0.38: Kept 1,117 of the 1,200 variants beside the missing data filter at 0.05, the total and the summary line; a change of a threshold takes the counts off, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await panelRead(page);
  await variantsAt005(page);
  await statistics(page);
  await thresholdsSet(page);
  await button(variants(page), COUNT).click();
  await expect(
    variants(page).getByText(KEPT_1117, { exact: true }),
  ).toBeVisible();
  await expect(
    variants(page).getByLabel(VARIANTS_MISSING_LABEL, { exact: true }),
  ).toHaveAccessibleDescription(
    new RegExp(`^${KEPT_1117.replaceAll(".", "\\.")} `),
  );
  await expect(
    variants(page).getByText(TOTAL_1117, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      /^panel\.nei · 111 of 200 individuals kept · 1,117 of 1,200 variants kept · 3 filters/,
    ),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  // A change of a filter of individuals takes the counts off, and is in
  // no notice.
  const obsHet = individuals(page).getByLabel(OBS_HET_LABEL, { exact: true });
  await obsHet.fill("0.39");
  await obsHet.press("Enter");
  await expect(variants(page).getByText(KEPT_1117)).toHaveCount(0);
  await expect(
    variants(page).getByText(NOT_COUNTED, { exact: true }),
  ).toBeVisible();
  await expect(notice(page).getByText(/Counts of the filters/)).toHaveCount(0);
});

test("IP2 D3 with the thresholds set and no statistics, the Count calculates the statistics first, then Kept 1,117 of the 1,200", async ({
  page,
}) => {
  await panelRead(page);
  await variantsAt005(page);
  await thresholdsSet(page);
  await button(variants(page), COUNT).click();
  await expect(
    variants(page).getByText(KEPT_1117, { exact: true }),
  ).toBeVisible();
  await expect(
    individuals(page).getByText(STATS_CAPTION, { exact: true }),
  ).toBeVisible();
});

test("IP2 D3 a list to keep that names ind_900 locks the Count and the histograms of the variants, with its reason beside each disabled button, and not the statistics of each individual, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await panelRead(page);
  await individuals(page)
    .getByRole("textbox", { name: "Individuals to keep, one name per line" })
    .fill("s000\nind_900");
  await button(individuals(page), "Apply the list to keep").click();
  for (const name of [HISTOGRAMS, COUNT]) {
    const locked = button(variants(page), name);
    await expect(locked).toBeDisabled();
    await expect(locked).toHaveAccessibleDescription(IND_900);
  }
  await expect(variants(page).getByText(IND_900, { exact: true })).toHaveCount(
    2,
  );
  await expect(variants(page).getByText("Variants step")).toHaveCount(0);
  // Beside the disabled Count, in place of the line of no counts.
  await expect(variants(page).getByText(NOT_COUNTED)).toHaveCount(0);
  await expect(button(individuals(page), STATISTICS)).toBeEnabled();
  await expectNoViolations(makeAxeBuilder);

  // The statistics are calculated all the same.
  await statistics(page);
  await expect(button(variants(page), COUNT)).toBeDisabled();

  // Cleared, the two buttons are given back.
  await button(individuals(page), "Clear the list to keep").click();
  await expect(button(variants(page), HISTOGRAMS)).toBeEnabled();
  await expect(button(variants(page), COUNT)).toBeEnabled();
  await expect(
    variants(page).getByText(NOT_COUNTED, { exact: true }),
  ).toBeVisible();
});

test("IP2 D3 thresholds that keep nobody lock the Count and the histograms of the variants, with the reason beside each disabled button, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await panelRead(page);
  await statistics(page);
  // Every individual of panel.nei has an observed heterozygosity above
  // 0.3.
  await threshold(page, OBS_HET_SWITCH, OBS_HET_LABEL, "0.1");
  await expect(
    individuals(page).getByText(NONE_KEPT, { exact: true }),
  ).toBeVisible();
  for (const name of [HISTOGRAMS, COUNT]) {
    const locked = button(variants(page), name);
    await expect(locked).toBeDisabled();
    await expect(locked).toHaveAccessibleDescription(NONE_KEPT);
  }
  await expect(variants(page).getByText("Variants step")).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

/** The words of the statistics refused for the genotypes of ploidy 4 of
    tetraploid.vcf.gz read with ploidy 2, after the start that names what
    was not done, as the step shows them. */
const TETRAPLOID_STATS =
  "At line 5 of tetraploid.vcf.gz, the genotype of t00 has 4 alleles, and the file was read with ploidy 2. If every genotype of the file has 4 alleles, set the ploidy of the VCF to 4 and read the file again. A file that mixes ploidies, such as one with the X of males haploid among diploid autosomes, cannot be read in this version.";

test("IP2 D3 the statistics a Calculate of the histograms or a Count waited for, refused by popnei, are told in their words and not in those of the histograms or of the Count, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await page.goto("popgen.html#variants");
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Variants file" })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (await chooser).setFiles(join(FIXTURES, "tetraploid.vcf.gz"));
  await expect(
    page.getByRole("main").getByText("12 individuals"),
  ).toBeVisible();
  await threshold(page, MISSING_SWITCH, MISSING_LABEL, "0.5");

  await button(variants(page), HISTOGRAMS).click();
  await expect(
    variants(page).getByText(
      `The statistics of each individual, which the thresholds of the individuals need, could not be calculated, so the histograms of the variants were not calculated. ${TETRAPLOID_STATS}`,
      { exact: true },
    ),
  ).toBeVisible();
  // The Count would wait for the same statistics, and is in error with
  // them, in its own words and with no button.
  await expect(button(variants(page), COUNT)).toHaveCount(0);
  await expect(
    variants(page).getByText(
      `The statistics of each individual, which the thresholds of the individuals need, could not be calculated, so the variants were not counted. ${TETRAPLOID_STATS}`,
      { exact: true },
    ),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
});

/** The part of the Count locked, which holds the disabled Count and its
    reason and takes the focus when the Count leaves the page with it. */
function lockedCount(page: Page): Locator {
  return variants(page)
    .locator("[tabindex='-1']")
    .filter({ has: page.getByRole("button", { name: COUNT, exact: true }) });
}

test("IP2 D3 a Count that waited for the statistics, locked by thresholds that keep nobody, leaves the focus on the part of its disabled button, with its reason", async ({
  page,
}) => {
  await panelRead(page);
  // Every individual of panel.nei has an observed heterozygosity above
  // 0.3, which is known only once the statistics are calculated.
  await threshold(page, OBS_HET_SWITCH, OBS_HET_LABEL, "0.1");
  await button(variants(page), COUNT).focus();
  await page.keyboard.press("Enter");
  await expect(button(variants(page), COUNT)).toBeDisabled();
  await expect(lockedCount(page)).toBeFocused();
  await expect(lockedCount(page)).toContainText(NONE_KEPT);
});

test("IP2 D3 an Undo to thresholds that keep nobody, with the focus on the Count, leaves the focus on the part of its disabled button", async ({
  page,
}) => {
  await panelRead(page);
  await statistics(page);
  await threshold(page, OBS_HET_SWITCH, OBS_HET_LABEL, "0.1");
  const obsHet = individuals(page).getByLabel(OBS_HET_LABEL, { exact: true });
  await obsHet.fill("0.5");
  await obsHet.press("Enter");
  await expect(button(variants(page), COUNT)).toBeEnabled();
  await button(variants(page), COUNT).focus();
  await page.keyboard.press(
    process.platform === "darwin" ? "Meta+z" : "Control+z",
  );
  await expect(obsHet).toHaveValue("0.1");
  await expect(lockedCount(page)).toBeFocused();
});
