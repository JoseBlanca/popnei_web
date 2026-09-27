/**
 * The block "Statistics of each individual" of the Variants step on the
 * built site (docs/specs/analyses/individualChecks.md, "The panel" and
 * "How it is verified"; docs/specs/steps/variants.md, "The statistics of
 * each individual" and "How it is checked", stage 3), on
 * e2e/fixtures/panel.nei, 1,200 variants of 200 individuals, with the
 * numbers popnei's release js-v0.1.0-dev.2 gave in node on 26 September
 * 2026: the statistics at 0.05, s000 0.0260 and 0.3672, and its two
 * histograms; the table sorted with the keyboard alone, s082 first at
 * 0.0434, and the sort announced; the CSV of the table and of the bins
 * of each histogram; the column Kept of a list applied, and the line in
 * its place for a list refused; the missing data filter of the variants
 * moved, the statistics removed with the words of the change, and back
 * by an undo with no calculation; running and stopped; in error; the
 * table and the histograms at 320 pixels wide; and axe at each state
 * reached.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

const CALCULATE = "Calculate the statistics of each individual";
const MISSING_LABEL = "Maximum proportion of missing genotypes, from 0 to 1";
const CAPTION =
  "The statistics of the 200 individuals of panel.nei, over the 1,152 variants the filters kept.";
const MISSING_TITLE = "Proportion of missing genotypes of each individual";
const OBS_HET_TITLE = "Observed heterozygosity of each individual";
const REMOVE_LABEL = "Individuals to remove, one name per line";
const KEEP_LABEL = "Individuals to keep, one name per line";

async function openVariants(page: Page): Promise<void> {
  await page.goto("popgen.html#variants");
  await expect(
    page.getByRole("heading", { level: 1, name: "Variants" }),
  ).toBeVisible();
}

/** Picks `fixture` with the file button, as a user does, and waits for
    the card of the file read. */
async function pick(page: Page, fixture: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Variants file" })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (await chooser).setFiles(join(FIXTURES, fixture));
  await expect(
    page
      .getByRole("region", { name: "Variants file" })
      .getByText(/individuals$/),
  ).toBeVisible();
}

/** Sets the threshold of the missing data filter of the variants. */
async function setMissing(page: Page, value: string): Promise<void> {
  const field = page.getByLabel(MISSING_LABEL, { exact: true });
  await field.fill(value);
  await field.press("Enter");
  await expect(field).toHaveValue(value);
}

function section(page: Page): Locator {
  return page.getByRole("region", { name: "Filters of the individuals" });
}

function block(page: Page): Locator {
  return page.getByRole("region", { name: "Statistics of each individual" });
}

function table(page: Page): Locator {
  return section(page).getByRole("grid", {
    name: "Statistics of each individual",
  });
}

/** The row of the individual `name` in the table. */
function rowOf(page: Page, name: string): Locator {
  return table(page)
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name, exact: true }) });
}

function histogram(page: Page, title: string): Locator {
  return page.getByRole("group", { name: title });
}

function banner(page: Page, name: string): Locator {
  return page.getByRole("banner").getByRole("button", { name, exact: true });
}

/** Calculates the statistics and waits for them. */
async function calculate(page: Page): Promise<void> {
  await block(page).getByRole("button", { name: CALCULATE }).click();
  await expect(block(page).getByText(CAPTION, { exact: true })).toBeVisible();
}

/** panel.nei read with the missing data filter at 0.05, and its
    statistics calculated. */
async function calculated(page: Page): Promise<void> {
  await openVariants(page);
  await pick(page, "panel.nei");
  await setMissing(page, "0.05");
  await calculate(page);
}

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

/** Makes the calculation worker keep its results back and pass its
    progress on, so that a calculation stays under way. */
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

/** Applies `names` as the list `label`, and waits for the text
    applied. */
async function applyList(
  page: Page,
  label: string,
  apply: string,
  names: string,
): Promise<void> {
  await section(page).getByRole("textbox", { name: label }).fill(names);
  await section(page).getByRole("button", { name: apply, exact: true }).click();
  await expect(section(page).getByText(/is not applied yet/)).toHaveCount(0);
}

test("VS7 D1 the statistics at 0.05: s000 0.0260 and 0.3672, the caption, the versions, the focus on the heading, the two histograms, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await setMissing(page, "0.05");
  await expect(table(page)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  await block(page).getByRole("button", { name: CALCULATE }).click();
  await expect(block(page).getByText(CAPTION, { exact: true })).toBeVisible();
  // The button went with the focus on it, which moved to the heading.
  await expect(block(page).getByRole("button")).toHaveCount(0);
  await expect(
    block(page).getByRole("heading", { name: "Statistics of each individual" }),
  ).toBeFocused();
  await expect(
    block(page).getByText(
      /^Calculated with popnei .+, in version .+ of the application\.$/,
    ),
  ).toBeVisible();
  await expect(rowOf(page, "s000").getByRole("gridcell")).toHaveText([
    "0.0260",
    "0.3672",
  ]);
  // No filter of individuals: no column Kept.
  await expect(table(page).getByRole("columnheader")).toHaveText([
    /^Individual/,
    /^Proportion of missing genotypes/,
    /^Observed heterozygosity/,
  ]);
  await expect(
    histogram(page, MISSING_TITLE).locator("svg.chart"),
  ).toBeVisible();
  await expect(
    histogram(page, OBS_HET_TITLE).locator("svg.chart"),
  ).toBeVisible();
  await expect(
    histogram(page, MISSING_TITLE).locator("svg.chart"),
  ).toHaveAccessibleName(
    /The proportion of missing genotypes of 200 individuals, in 20 bins from 0\.0165 to 0\.0434\./,
  );
  // No individual of panel.nei lacks a heterozygosity.
  await expect(section(page).getByText(/not in the histogram/)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("VS7 D1 the table sorted with the keyboard alone: into the table, up to the headers, Enter twice, s082 first at 0.0434, each sort announced, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await calculated(page);
  // The Tab key from the button of the CSV of the last histogram enters
  // the table once.
  await histogram(page, OBS_HET_TITLE)
    .getByRole("button", { name: "Download the bins as CSV" })
    .focus();
  await page.keyboard.press("Tab");
  const focusedInTable = (): Promise<boolean> =>
    table(page).evaluate((grid) => grid.contains(document.activeElement));
  expect(await focusedInTable()).toBe(true);
  // Up to the row of the headers, whichever cell had the focus, then to
  // the first header and one to its right.
  await page.keyboard.press("PageUp");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  const header = table(page).getByRole("columnheader", {
    name: /^Proportion of missing genotypes/,
  });
  await expect(header).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(header).toHaveAttribute("aria-sort", "ascending");
  await expect(header).toBeFocused();
  await expect(
    page.locator("div[data-live-announcer]:not([role])"),
  ).toContainText(
    "sorted by column Proportion of missing genotypes in ascending order",
  );
  await page.keyboard.press("Enter");
  await expect(header).toHaveAttribute("aria-sort", "descending");
  await expect(header).toBeFocused();
  await expect(
    page.locator("div[data-live-announcer]:not([role])"),
  ).toContainText(
    "sorted by column Proportion of missing genotypes in descending order",
  );
  const first = table(page).getByRole("row").nth(1);
  await expect(first.getByRole("rowheader")).toHaveText("s082");
  await expect(first.getByRole("gridcell").first()).toHaveText("0.0434");
  expect(await focusedInTable()).toBe(true);
  await expectNoViolations(makeAxeBuilder);
});

test("VS7 D1 a row focused while moving up is not under the header, whose cells are opaque", async ({
  page,
}) => {
  await calculated(page);
  await rowOf(page, "s002").getByRole("rowheader").click();
  for (let step = 0; step < 40; step += 1) {
    await page.keyboard.press("ArrowDown");
  }
  for (let step = 0; step < 25; step += 1) {
    await page.keyboard.press("ArrowUp");
  }
  const focused = page.locator(":focus");
  await expect(focused).toHaveText("s017");
  const headers = table(page).getByRole("columnheader");
  const headerBottom = Math.max(
    ...(await headers.evaluateAll((cells) =>
      cells.map((cell) => cell.getBoundingClientRect().bottom),
    )),
  );
  const focusedBox = await focused.boundingBox();
  if (focusedBox === null) throw new Error("the focused cell has no box");
  expect(focusedBox.y).toBeGreaterThanOrEqual(headerBottom - 0.5);
  const backgrounds = await headers.evaluateAll((cells) =>
    cells.map((cell) => getComputedStyle(cell).backgroundColor),
  );
  expect(backgrounds).not.toContain("rgba(0, 0, 0, 0)");
});

test("VS7 D1 the CSV of the table: panel.individual_stats.csv, its header, 200 rows, and s000 with every digit", async ({
  page,
}) => {
  await calculated(page);
  const downloading = page.waitForEvent("download");
  await section(page)
    .getByRole("button", { name: "Download the table as CSV", exact: true })
    .click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("panel.individual_stats.csv");
  const lines = (await readFile(await download.path(), "utf8")).split("\n");
  expect(lines[0]).toBe("individual,missing_genotypes,observed_heterozygosity");
  expect(lines).toHaveLength(202);
  expect(lines.at(-1)).toBe("");
  expect(lines[1]).toBe("s000,0.026041666666666668,0.3672014260249554");
});

test("VS7 D1 the CSVs of the bins of the two histograms: their names, their headers, 20 rows, and the first bin of each", async ({
  page,
}) => {
  await calculated(page);
  for (const [title, name, first] of [
    [
      MISSING_TITLE,
      "panel.individual_missing_rate_bins.csv",
      /^0\.016493055555555556,0\.017838541666666666,3,$/,
    ],
    [
      OBS_HET_TITLE,
      "panel.individual_obs_het_bins.csv",
      /^0\.3176991150442478,[\d.]+,3,$/,
    ],
  ] as const) {
    const downloading = page.waitForEvent("download");
    await histogram(page, title)
      .getByRole("button", { name: "Download the bins as CSV" })
      .click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe(name);
    const lines = (await readFile(await download.path(), "utf8")).split("\n");
    expect(lines[0]).toBe("from,to,count,state");
    expect(lines).toHaveLength(22);
    expect(lines[1]).toMatch(first);
  }
});

test("VS7 D1 the statistics removed by an Undo while the focus is in the table or on a CSV button of a histogram: the focus goes to the heading of the block", async ({
  page,
}) => {
  const undo = process.platform === "darwin" ? "Meta+z" : "Control+z";
  const heading = block(page).getByRole("heading", {
    name: "Statistics of each individual",
  });
  await calculated(page);
  await rowOf(page, "s000").getByRole("rowheader").click();
  await page.keyboard.press(undo);
  await expect(table(page)).toHaveCount(0);
  await expect(heading).toBeFocused();

  await banner(page, "Redo").click();
  await expect(table(page)).toBeVisible();
  await histogram(page, OBS_HET_TITLE)
    .getByRole("button", { name: "Download the bins as CSV" })
    .focus();
  await page.keyboard.press(undo);
  await expect(histogram(page, OBS_HET_TITLE)).toHaveCount(0);
  await expect(heading).toBeFocused();
});

test("VS7 D1 the missing data filter of the variants moved: the statistics removed with the words of the change and the notice; an undo, and the statistics back with no calculation, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await calculated(page);
  await setMissing(page, "0.06");
  await expect(
    block(page).getByText(
      "The statistics of each individual were removed because the missing data filter changed. Undo brings back the table as it was, with no calculation; Calculate makes a new one for the new settings.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Notice" })
      .getByText(/Statistics of each individual removed/),
  ).toBeVisible();
  await expect(
    block(page).getByRole("button", { name: CALCULATE }),
  ).toBeVisible();
  await expect(table(page)).toHaveCount(0);
  await expect(histogram(page, MISSING_TITLE)).toHaveCount(0);
  await expect(histogram(page, OBS_HET_TITLE)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  await banner(page, "Undo").click();
  await expect(block(page).getByText(CAPTION, { exact: true })).toBeVisible();
  await expect(rowOf(page, "s000").getByRole("gridcell")).toHaveText([
    "0.0260",
    "0.3672",
  ]);
  // No calculation: no bar, no button, and no words of the removal.
  await expect(block(page).getByRole("progressbar")).toHaveCount(0);
  await expect(block(page).getByRole("button")).toHaveCount(0);
  await expect(block(page).getByText(/were removed/)).toHaveCount(0);
  await expect(histogram(page, MISSING_TITLE)).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  await banner(page, "Redo").click();
  await expect(
    block(page).getByText(
      "Redone: the missing data filter changed. The statistics of each individual were removed; Undo brings back the table as it was, with no calculation, and Calculate makes a new one for the settings as they are now.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(table(page)).toHaveCount(0);
});

test("VS7 D1 running: Stop, the bar and its line; stopped, the button back and no table, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await holdResults(page);
  await block(page).getByRole("button", { name: CALCULATE }).click();
  const stop = block(page).getByRole("button", { name: "Stop" });
  await expect(stop).toBeFocused();
  await expect(
    block(page).getByRole("progressbar", {
      name: "Calculating the statistics of each individual",
    }),
  ).toBeVisible();
  await expect(block(page).getByText(/^Calculating · /)).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  await stop.click();
  await expect(
    block(page).getByRole("button", { name: CALCULATE }),
  ).toBeFocused();
  await expect(block(page).getByRole("progressbar")).toHaveCount(0);
  await expect(table(page)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("VS7 D1 in error: the ploidy of tetraploid.vcf.gz refused, in the words of the refusal with no button, no table and no histogram, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "tetraploid.vcf.gz");
  await block(page).getByRole("button", { name: CALCULATE }).click();
  await expect(
    block(page).getByText(
      "At line 5 of tetraploid.vcf.gz, the genotype of t00 has 4 alleles, and the file was read with ploidy 2. If every genotype of the file has 4 alleles, set the ploidy of the VCF to 4 in the Variants step and read the file again. A file that mixes ploidies, such as one with the X of males haploid among diploid autosomes, cannot be read in this version.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(block(page).getByRole("button")).toHaveCount(0);
  await expect(
    block(page).getByRole("heading", { name: "Statistics of each individual" }),
  ).toBeFocused();
  await expect(table(page)).toHaveCount(0);
  await expect(histogram(page, MISSING_TITLE)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("VS7 D1 the column Kept: a list to remove applied marks s000 removed and s001 kept with no calculation; a list naming ind_900 puts the line in its place, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await calculated(page);
  await applyList(page, REMOVE_LABEL, "Apply the list to remove", "s000");
  await expect(
    table(page).getByRole("columnheader", { name: /^Kept/ }),
  ).toBeVisible();
  await expect(rowOf(page, "s000").getByRole("gridcell").last()).toHaveText(
    "removed",
  );
  await expect(rowOf(page, "s001").getByRole("gridcell").last()).toHaveText(
    "kept",
  );
  await expect(block(page).getByRole("progressbar")).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  // Sorted by Kept going down, the removed first.
  const kept = table(page).getByRole("columnheader", { name: /^Kept/ });
  await kept.click();
  await kept.click();
  await expect(kept).toHaveAttribute("aria-sort", "descending");
  await expect(
    table(page).getByRole("row").nth(1).getByRole("rowheader"),
  ).toHaveText("s000");

  await applyList(page, KEEP_LABEL, "Apply the list to keep", "ind_900");
  await expect(
    section(page).getByText(
      "Which individuals are kept is shown once the lists of individuals above are corrected.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    table(page).getByRole("columnheader", { name: /^Kept/ }),
  ).toHaveCount(0);
  // The statistics read no filter of individuals, and stay.
  await expect(rowOf(page, "s000").getByRole("gridcell")).toHaveText([
    "0.0260",
    "0.3672",
  ]);
  await expectNoViolations(makeAxeBuilder);

  // The sort by Kept went with its column: the column back is not
  // sorted, and no other header is.
  await section(page)
    .getByRole("button", { name: "Clear the list to keep", exact: true })
    .click();
  await expect(
    table(page).getByRole("columnheader", { name: /^Kept/ }),
  ).toBeVisible();
  await expect(
    table(page).locator('[aria-sort="ascending"], [aria-sort="descending"]'),
  ).toHaveCount(0);
});

test("VS7 D1 at 320 pixels wide, drawn wide first: no sideways scroll of the page, each plot within its panel, and the table within the page scrolling in its own box", async ({
  page,
  makeAxeBuilder,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await calculated(page);
  await applyList(page, REMOVE_LABEL, "Apply the list to remove", "s000");
  await page.setViewportSize({ width: 320, height: 900 });
  const plots = section(page).locator("svg.chart");
  await expect
    .poll(() =>
      plots.evaluateAll((svgs) =>
        Math.max(...svgs.map((svg) => svg.getBoundingClientRect().width)),
      ),
    )
    .toBeLessThanOrEqual(320 - 2 * 16);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const box = await table(page).evaluate((grid) => ({
    right: grid.getBoundingClientRect().right,
    scrolls: grid.scrollWidth > grid.clientWidth,
  }));
  expect(box.right).toBeLessThanOrEqual(320);
  expect(box.scrolls).toBe(true);
  await expectNoViolations(makeAxeBuilder);
});

test("VS7 D1 a new file loaded: the statistics removed with the words of the new load, and a calculation under way stopped with its line and the button back, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await calculated(page);
  await pick(page, "panel.nei");
  await expect(
    block(page).getByText(
      "The statistics of each individual were removed because a new variants file was loaded. Undo brings back the table as it was, with no calculation; Calculate makes a new one for the new settings.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(table(page)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  await holdResults(page);
  await block(page).getByRole("button", { name: CALCULATE }).click();
  await expect(block(page).getByRole("button", { name: "Stop" })).toBeVisible();
  await pick(page, "panel.nei");
  await expect(
    block(page).getByText(
      "The calculation of the statistics of each individual was stopped because a new variants file was loaded.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    block(page).getByRole("button", { name: CALCULATE }),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
});
