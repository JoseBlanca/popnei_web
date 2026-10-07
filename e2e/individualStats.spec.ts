/**
 * The block "Statistics of each individual" of the Variants step on the
 * built site (docs/specs/analyses/individualChecks.md, "The panel" and
 * "How it is verified"; docs/specs/steps/variants.md, "The statistics of
 * each individual" and "How it is checked", stage 3), on
 * e2e/fixtures/panel.nei, 1,200 variants of 200 individuals, with the
 * numbers popnei's release js-v0.1.0-dev.3 gave in node on 28 September
 * 2026: the statistics over every variant of the file, with no filter
 * from that day, s000 0.0283 and 0.3654, and its two histograms; the
 * table sorted with the keyboard alone, s082 first at 0.0442, and the
 * sort announced; the CSV of the table and of the bins
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
  "The statistics of the 200 individuals of panel.nei, over its 1,200 variants, before any filter of the variants.";
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

test("IP2 D3, VS7 D1 the statistics of panel.nei: s000 0.0283 and 0.3654, the caption, the versions, the focus on the heading, the two histograms, and axe", async ({
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
    "0.0283",
    "0.3654",
  ]);
  await expect(
    section(page).getByText("200 individuals; the CSV holds them all.", {
      exact: true,
    }),
  ).toBeVisible();
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
    /The proportion of missing genotypes of 200 individuals, in 20 bins from 0\.0175 to 0\.0442\./,
  );
  // No individual of panel.nei lacks a heterozygosity.
  await expect(section(page).getByText(/not in the histogram/)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

/** The worked example of individualChecks.md, "How it is verified":
    three individuals and four variants, i3 with no called genotype, i2
    with ./. at the third variant and 0/. at the fourth. */
const CALLS_VCF = [
  "##fileformat=VCFv4.2",
  "##contig=<ID=1>",
  '##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">',
  "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\ti1\ti2\ti3",
  "1\t10\t.\tA\tG\t.\tPASS\t.\tGT\t0/1\t0/0\t./.",
  "1\t20\t.\tA\tG\t.\tPASS\t.\tGT\t1/1\t0/1\t./.",
  "1\t30\t.\tA\tG\t.\tPASS\t.\tGT\t0/0\t./.\t./.",
  "1\t40\t.\tA\tG\t.\tPASS\t.\tGT\t0/1\t0/.\t./.",
  "",
].join("\n");

/** Picks the VCF `text` as calls.vcf, turns the filter of the variants by
    missing data off, which would drop every variant of it, and
    calculates the statistics. */
async function calculatedCalls(page: Page, text: string): Promise<void> {
  await openVariants(page);
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Variants file" })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "calls.vcf",
    mimeType: "text/plain",
    buffer: Buffer.from(text),
  });
  await expect(
    page
      .getByRole("region", { name: "Variants file" })
      .getByText(/individuals$/),
  ).toBeVisible();
  await page
    .getByRole("main")
    .getByText("Filter the variants by missing data", { exact: true })
    .click();
  await block(page).getByRole("button", { name: CALCULATE }).click();
  await expect(
    block(page).getByText(/^The statistics of the 3 individuals of calls\.vcf/),
  ).toBeVisible();
}

test("VS7 D1 an individual with no called genotype: the warning, no value sorted last both ways, the line under the histogram, and the filter by heterozygosity removes it", async ({
  page,
  makeAxeBuilder,
}) => {
  await calculatedCalls(page, CALLS_VCF);
  await expect(
    block(page).getByText(
      "i3 has no called genotype among the 4 variants of calls.vcf, so it has no observed heterozygosity. The filter of the individuals by observed heterozygosity removes it when it is on.",
    ),
  ).toBeVisible();
  await expect(rowOf(page, "i3").getByRole("gridcell")).toHaveText([
    "1.0000",
    "no value",
  ]);
  await expect(
    section(page).getByText(
      "1 individual with no called genotype is not in the histogram.",
      { exact: true },
    ),
  ).toBeVisible();
  // Three rows: a box as high as they are, which does not scroll.
  await expect(
    section(page).getByText("3 individuals; the CSV holds them all.", {
      exact: true,
    }),
  ).toBeVisible();
  const box = await table(page).evaluate((grid) => ({
    scroll: grid.scrollHeight,
    client: grid.clientHeight,
  }));
  expect(box.scroll).toBeLessThanOrEqual(box.client);
  expect(box.client).toBeLessThan(200);
  const header = table(page).getByRole("columnheader", {
    name: /^Observed heterozygosity/,
  });
  for (const direction of ["ascending", "descending"] as const) {
    await header.click();
    await expect(header).toHaveAttribute("aria-sort", direction);
    await expect(
      table(page).getByRole("row").last().getByRole("rowheader"),
    ).toHaveText("i3");
  }
  await expectNoViolations(makeAxeBuilder);

  // Turned on, the filter by heterozygosity removes i3 whatever its
  // threshold.
  await section(page)
    .getByText("Filter the individuals by observed heterozygosity", {
      exact: true,
    })
    .click();
  await expect(
    section(page).getByText("Kept 2 of the 3 individuals it was given.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(rowOf(page, "i3").getByRole("gridcell").last()).toHaveText(
    "removed",
  );
});

test("VS7 D1 no individual with a called genotype: no histogram of the heterozygosity, and the line alone in its place", async ({
  page,
}) => {
  const uncalled = CALLS_VCF.replace(/\t(0|1)\/(0|1|\.)/g, "\t./.");
  await calculatedCalls(page, uncalled);
  await expect(
    section(page).getByText(
      "3 individuals with no called genotype are not in the histogram.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(histogram(page, OBS_HET_TITLE)).toHaveCount(0);
  await expect(histogram(page, MISSING_TITLE)).toBeVisible();
});

test("IP2 D3, VS7 D1 the table sorted with the keyboard alone: into the table, up to the headers, Enter twice, s082 first at 0.0442, each sort announced, and axe", async ({
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
  await expect(first.getByRole("gridcell").first()).toHaveText("0.0442");
  expect(await focusedInTable()).toBe(true);
  await expectNoViolations(makeAxeBuilder);
});

test("VS7 D1 a row the Tab key enters the table on shows a ring around its cells", async ({
  page,
}) => {
  await calculated(page);
  await histogram(page, OBS_HET_TITLE)
    .getByRole("button", { name: "Download the bins as CSV" })
    .focus();
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toHaveAttribute("role", "row");
  // The row's own box has no height; the ring is drawn by its cells.
  const shadows = await focused
    .locator('[role="rowheader"], [role="gridcell"]')
    .evaluateAll((cells) =>
      cells.map((cell) => getComputedStyle(cell).boxShadow),
    );
  expect(shadows.length).toBeGreaterThan(0);
  expect(shadows).not.toContain("none");

  // Forced colours, as Windows' high contrast, erase the shadows: the
  // cells then have an outline.
  await page.emulateMedia({ forcedColors: "active" });
  const outlines = await focused
    .locator('[role="rowheader"], [role="gridcell"]')
    .evaluateAll((cells) =>
      cells.map((cell) => getComputedStyle(cell).outlineStyle),
    );
  expect(outlines).not.toContain("none");
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

test("VS7 D1 at 320 pixels wide, with the column Kept, a row focused while moving up is not under the header of three lines", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await calculated(page);
  await applyList(page, REMOVE_LABEL, "Apply the list to remove", "s001");
  await rowOf(page, "s002").getByRole("rowheader").click();
  for (let step = 0; step < 40; step += 1) {
    await page.keyboard.press("ArrowDown");
  }
  for (let step = 0; step < 25; step += 1) {
    await page.keyboard.press("ArrowUp");
  }
  const focused = page.locator(":focus");
  await expect(focused).toHaveText("s017");
  const headerBottom = Math.max(
    ...(await table(page)
      .getByRole("columnheader")
      .evaluateAll((cells) =>
        cells.map((cell) => cell.getBoundingClientRect().bottom),
      )),
  );
  const focusedBox = await focused.boundingBox();
  if (focusedBox === null) throw new Error("the focused cell has no box");
  expect(focusedBox.y).toBeGreaterThanOrEqual(headerBottom - 0.5);
});

test("IP2 D3, VS7 D1 the CSV of the table: panel.individual_stats.csv, its header, 200 rows, and s000 with every digit", async ({
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
  expect(lines[1]).toBe("s000,0.028333333333333332,0.3653516295025729");
});

test("IP2 D3, VS7 D1 the CSVs of the bins of the two histograms: their names, their headers, 20 rows, and the first bin of each", async ({
  page,
}) => {
  await calculated(page);
  for (const [title, name, first] of [
    [
      MISSING_TITLE,
      "panel.individual_missing_rate_bins.csv",
      /^0\.0175,0\.018833333333333334,4,$/,
    ],
    [
      OBS_HET_TITLE,
      "panel.individual_obs_het_bins.csv",
      /^0\.32112436115843274,[\d.]+,4,$/,
    ],
  ] as const) {
    const downloading = page.waitForEvent("download");
    await histogram(page, title)
      .getByRole("button", { name: "Download the bins as CSV" })
      .click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe(name);
    const lines = (await readFile(await download.path(), "utf8")).split("\n");
    expect(lines[0]).toBe("from_excluded,to_included,count,state");
    expect(lines).toHaveLength(22);
    expect(lines[1]).toMatch(first);
  }
});

test("IP2 D3, VS7 D1 the statistics removed by an Undo while the focus is in the table or on a CSV button of a histogram: the focus goes to the heading of the block", async ({
  page,
}) => {
  const undo = process.platform === "darwin" ? "Meta+z" : "Control+z";
  const heading = block(page).getByRole("heading", {
    name: "Statistics of each individual",
  });
  // Only a new load, or the file read again with other options, removes
  // the statistics, which read no filter: the file is read again, so that
  // an Undo removes them and leaves the block.
  await openVariants(page);
  await pick(page, "panel.vcf.gz");
  await page
    .getByText("Only the variants with PASS or . in the FILTER column", {
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: /^Read panel\.vcf\.gz again/ })
    .click();
  await block(page).getByRole("button", { name: CALCULATE }).click();
  await expect(table(page)).toBeVisible();
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

test("VS7 D1 an Undo of the load while the focus is in the table or on a tab of a histogram: the block goes with the file, and the focus goes to the heading of the section", async ({
  page,
}) => {
  const undo = process.platform === "darwin" ? "Meta+z" : "Control+z";
  const heading = section(page).getByRole("heading", {
    level: 2,
    name: "Filters of the individuals",
  });
  await openVariants(page);
  await pick(page, "panel.nei");
  await block(page).getByRole("button", { name: CALCULATE }).click();
  await expect(table(page)).toBeVisible();
  await rowOf(page, "s000").getByRole("rowheader").click();
  await page.keyboard.press(undo);
  await expect(table(page)).toHaveCount(0);
  await expect(heading).toBeFocused();

  await banner(page, "Redo").click();
  await expect(table(page)).toBeVisible();
  await histogram(page, OBS_HET_TITLE)
    .getByRole("tab", { name: "Plot" })
    .focus();
  await page.keyboard.press(undo);
  await expect(histogram(page, OBS_HET_TITLE)).toHaveCount(0);
  await expect(heading).toBeFocused();
});

test("IP2 D3, VS7 D1 the missing data filter of the variants moved: the statistics stay, with no notice and no calculation, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await calculated(page);
  await setMissing(page, "0.06");
  await expect(block(page).getByText(CAPTION, { exact: true })).toBeVisible();
  await expect(rowOf(page, "s000").getByRole("gridcell")).toHaveText([
    "0.0283",
    "0.3654",
  ]);
  // No calculation: no bar, no button, and no words of a removal.
  await expect(block(page).getByRole("progressbar")).toHaveCount(0);
  await expect(
    block(page).getByRole("button", { name: CALCULATE }),
  ).toHaveCount(0);
  await expect(block(page).getByText(/were removed/)).toHaveCount(0);
  await expect(
    page
      .getByRole("region", { name: "Notice" })
      .getByText(/Statistics of each individual/),
  ).toHaveCount(0);
  await expect(histogram(page, MISSING_TITLE)).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  await banner(page, "Undo").click();
  await expect(rowOf(page, "s000").getByRole("gridcell")).toHaveText([
    "0.0283",
    "0.3654",
  ]);
  await expect(block(page).getByRole("progressbar")).toHaveCount(0);
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
      "At line 5 of tetraploid.vcf.gz, the genotype of t00 has 4 alleles, and the file was read with ploidy 2. If every genotype of the file has 4 alleles, set the ploidy of the VCF to 4 and read the file again. A file that mixes ploidies, such as one with the X of males haploid among diploid autosomes, cannot be read in this version.",
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

test("IP2 D3, VS7 D1 the column Kept: a list to remove applied marks s000 removed and s001 kept with no calculation; a list naming ind_900 puts the line in its place, and axe", async ({
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
      "Which individuals are kept is shown once the lists of individuals to keep and to remove are corrected.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    table(page).getByRole("columnheader", { name: /^Kept/ }),
  ).toHaveCount(0);
  // The statistics read no filter of individuals, and stay.
  await expect(rowOf(page, "s000").getByRole("gridcell")).toHaveText([
    "0.0283",
    "0.3654",
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
      "The statistics of each individual were removed because a new variants file was loaded. Undo brings back the table and the histograms as they were, without calculating again; Calculate makes new ones for the new settings.",
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
