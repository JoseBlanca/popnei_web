/**
 * The statistics of the open file on popgen2.html, on the built site
 * (docs/plans/file-stats.md, phase 2): steps 3 and 4 of case 2 of
 * docs/use-cases.md, the distributions over the variants and over the
 * individuals, which start by themselves once the variants are counted,
 * one after the other, the variants first; the table of the individuals
 * sorted; one Stop for
 * both and the start again; a crash of one pass, which hides nothing of
 * the other; axe at each state reached.
 *
 * The numbers are popnei's, from the installed js-v0.2.0 under node on
 * the same files, with the options the runner gives (1,280 bins over 0 to
 * 1, minNumIndividuals 0, no filter), on 6 October 2026: panel.vcf.gz,
 * 1,200 variants of 200 individuals, the first and the last of popnei's
 * bins with a count from 0 to 0.0805 for the missing rate, 0.5 to 0.9875
 * for the MAF, 0.0258 to 0.6133 and 0.0258 to 0.5016 for the observed and
 * the expected heterozygosity; the individuals' missing rates from 0.0175
 * to 0.0442 and heterozygosities from 0.3211 to 0.3931; the most missing
 * individual s082 at 0.0442 (heterozygosity 0.3688), the most
 * heterozygous s026 at 0.3931 (missing 0.0333). tetraploid.vcf.gz, 200
 * variants of 12 individuals: 0 to 0.2508, 0.3328 to 0.5688, 0.7266 to 1
 * and 0.9023 to 0.9727; the individuals from 0.02 to 0.085 and 0.9301 to
 * 0.9847; the most missing t04 at 0.0850.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { announced, recordAnnouncements } from "./announced.ts";
import { expect, test } from "./axe.ts";
import { STOP_VCF_VARIANTS, writeBigVcf } from "./bigVcf.ts";
import { crashWorkerOn } from "./crashWorker.ts";
import { dropFiles } from "./dropFiles.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

async function openPage(page: Page): Promise<void> {
  await page.goto("popgen2.html");
  await expect(
    page.getByRole("heading", { level: 1, name: "Popnei" }),
  ).toBeVisible();
}

/** Picks `path` with the open button, through the file picker. */
async function pick(page: Page, path: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: /^Open (another )?variants file…$/u })
    .click();
  await (await chooser).setFiles(path);
}

/** The section of the statistics. */
function stats(page: Page): Locator {
  return page.getByRole("region", { name: "Statistics of the file" });
}

/** The titles of the histograms, in their order. */
function titles(page: Page): Locator {
  return stats(page).getByRole("group").locator("> p:first-child");
}

/** The titles of the six histograms, with no mean. */
const TITLES = [
  "Proportion of missing genotypes",
  "Major allele frequency",
  "Observed heterozygosity",
  "Expected heterozygosity (unbiased)",
  "Proportion of missing genotypes of each individual",
  "Observed heterozygosity of each individual",
];

/** The descriptions of the histograms, which say their bins and the
    two ends of their axis. */
function descriptions(page: Page): Locator {
  return stats(page).locator("svg.chart desc");
}

/** The part of the section under the heading `name`, "Variants" or
    "Individuals". */
function part(page: Page, name: string): Locator {
  return stats(page)
    .getByRole("heading", { level: 2, name })
    .locator("xpath=..");
}

/** The table of the individuals. */
function table(page: Page): Locator {
  return stats(page).getByRole("grid", {
    name: "Statistics of each individual",
  });
}

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

/** Sorts the table by the column `name`, descending, and gives its first
    row: the individual and its two numbers. */
async function firstWhenSorted(
  page: Page,
  name: RegExp,
): Promise<readonly string[]> {
  const header = table(page).getByRole("columnheader", { name });
  await header.click();
  await expect(header).toHaveAttribute("aria-sort", "ascending");
  await header.click();
  await expect(header).toHaveAttribute("aria-sort", "descending");
  return table(page)
    .getByRole("row")
    .nth(1)
    .getByRole("rowheader")
    .or(table(page).getByRole("row").nth(1).getByRole("gridcell"))
    .allTextContents();
}

test("FS2 panel.vcf.gz: the four distributions of the variants and the two of the individuals over their ranges rounded out, the table sorted to its tails, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await recordAnnouncements(page);
  await openPage(page);
  await pick(page, join(FIXTURES, "panel.vcf.gz"));

  await expect(table(page)).toBeVisible({ timeout: 20_000 });
  await expect(stats(page).getByRole("heading", { level: 2 })).toHaveText([
    "Variants",
    "Individuals",
  ]);
  await expect(titles(page)).toHaveText(TITLES);
  // Each axis over the range of its values rounded out, the missing rates
  // from 0; the variants' bins popnei's 1,280 added up, about 40.
  await expect(descriptions(page)).toHaveText([
    "The proportion of missing genotypes of 1,200 variants, in 32 bins from 0 to 0.1.",
    "The major allele frequency of 1,200 variants, in 40 bins from 0.5 to 1.",
    "The observed heterozygosity of 1,200 variants, in 32 bins from 0 to 0.7.",
    "The unbiased expected heterozygosity of 1,200 variants, in 44 bins from 0 to 0.55.",
    "The proportion of missing genotypes of 200 individuals, in 20 bins from 0 to 0.045.",
    "The observed heterozygosity of 200 individuals, in 20 bins from 0.32 to 0.4.",
  ]);
  await expect(stats(page).getByText("Over 1,200 variants")).toHaveCount(4);
  await expect(stats(page).getByText("Over 200 individuals")).toHaveCount(2);
  await expect(stats(page).locator("svg.chart")).toHaveCount(6);
  // Nothing left to stop or to start again, and the page is plain: no
  // tabs of a table of the bins, no download, no line of the rows of the
  // table.
  await expect(stats(page).getByRole("button")).toHaveCount(0);
  await expect(stats(page).getByRole("tab")).toHaveCount(0);
  await expect(stats(page).getByText(/CSV/u)).toHaveCount(0);
  await expect(stats(page).getByRole("progressbar")).toHaveCount(0);
  await expect
    .poll(() => announced(page))
    .toContainEqual(
      expect.stringMatching(
        /The statistics of panel\.vcf\.gz are calculated\.$/u,
      ),
    );
  await expectNoViolations(makeAxeBuilder);

  expect(
    await firstWhenSorted(page, /^Proportion of missing genotypes/u),
  ).toEqual(["s082", "0.0442", "0.3688"]);
  expect(await firstWhenSorted(page, /^Observed heterozygosity/u)).toEqual([
    "s026",
    "0.0333",
    "0.3931",
  ]);
  await expectNoViolations(makeAxeBuilder);
});

test("FS2 tetraploid.vcf.gz: its own axes and its 12 individuals", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  await pick(page, join(FIXTURES, "tetraploid.vcf.gz"));

  await expect(table(page)).toBeVisible({ timeout: 20_000 });
  await expect(titles(page)).toHaveText(TITLES);
  await expect(descriptions(page)).toHaveText([
    "The proportion of missing genotypes of 200 variants, in 32 bins from 0 to 0.3.",
    "The major allele frequency of 200 variants, in 32 bins from 0.3 to 0.6.",
    "The observed heterozygosity of 200 variants, in 32 bins from 0.7 to 1.",
    "The unbiased expected heterozygosity of 200 variants, in 32 bins from 0.9 to 1.",
    "The proportion of missing genotypes of 12 individuals, in 20 bins from 0 to 0.09.",
    "The observed heterozygosity of 12 individuals, in 20 bins from 0.93 to 0.99.",
  ]);
  await expect(stats(page).getByText("Over 200 variants")).toHaveCount(4);
  await expect(stats(page).getByText("Over 12 individuals")).toHaveCount(2);
  const first = await firstWhenSorted(
    page,
    /^Proportion of missing genotypes/u,
  );
  expect(first.slice(0, 2)).toEqual(["t04", "0.0850"]);
  await expectNoViolations(makeAxeBuilder);
});

test("FS2 the statistics wait for the count, Stop stops them, Start the statistics again finishes them, and the focus stays on the page", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  // A VCF written for the test, whose passes last seconds, so that Stop
  // is pressed while one reads (testing.md, "The walking skeleton, as a
  // flow").
  test.setTimeout(180_000);
  const vcf = testInfo.outputPath("stats.vcf.gz");
  await writeBigVcf(vcf, STOP_VCF_VARIANTS);
  await recordAnnouncements(page);
  await openPage(page);
  await pick(page, vcf);

  // Nothing computed yet: both parts wait for the count.
  await expect(
    stats(page).getByText("Waiting for the count of the variants."),
  ).toHaveCount(2, { timeout: 30_000 });
  await expect(stats(page).getByRole("button")).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  const bar = stats(page).getByRole("progressbar", {
    name: "Calculating the statistics of the variants",
  });
  // Stop is pressed as soon as the bar of the first pass is seen, and
  // the checks of the running state, axe among them, wait for the start
  // again: made before the Stop, they could outlast the pass, of a few
  // seconds, under four workers in WebKit, and Stop then stopped the
  // second pass, which failed this flow once in five runs.
  await expect(bar).toBeVisible({ timeout: 60_000 });
  await stats(page)
    .getByRole("button", { name: "Stop the statistics" })
    .click();
  const again = stats(page).getByRole("button", {
    name: "Start the statistics again",
  });
  // One button in one place: the focus stays on it.
  await expect(again).toBeFocused();
  await expect(bar).toHaveCount(0);
  // The first pass was the one stopped, and the second, not started,
  // says why.
  await expect(
    part(page, "Variants").getByText("Stopped.", { exact: true }),
  ).toBeVisible();
  await expect(
    part(page, "Individuals").getByText(
      "Not calculated: the statistics of the variants were stopped.",
    ),
  ).toBeVisible();
  await expect(stats(page).locator("svg.chart")).toHaveCount(0);
  await expect
    .poll(() => announced(page))
    .toContainEqual(
      expect.stringContaining(
        "The statistics were stopped. Start them again to calculate those not done yet.",
      ),
    );
  // The start, said as the first pass started, unless the Stop came
  // within the region's pause and replaced it.
  const started = (texts: readonly string[]): number =>
    texts.filter((text) =>
      text.includes("Calculating the statistics of stats.vcf.gz…"),
    ).length;
  const startsBefore = started(await announced(page));
  expect(startsBefore).toBeLessThanOrEqual(1);
  await expectNoViolations(makeAxeBuilder);

  await again.click();
  await expect(
    stats(page).getByRole("button", { name: "Stop the statistics" }),
  ).toBeFocused();
  // Running: the start again is said as the first start was, the line
  // over the bar says it once, and the second part waits for the first.
  await expect(bar).toBeVisible();
  await expect
    .poll(async () => started(await announced(page)))
    .toBe(startsBefore + 1);
  await expect(
    part(page, "Individuals").getByText(
      "Waiting for the statistics of the variants.",
    ),
  ).toBeVisible();
  await expect(stats(page).getByText(/Calculating/u)).toHaveCount(1);
  await expectNoViolations(makeAxeBuilder);

  await expect(table(page)).toBeVisible({ timeout: 120_000 });
  await expect(stats(page).locator("svg.chart")).toHaveCount(6, {
    timeout: 120_000,
  });
  // The button gone with the focus on it, the focus is on the heading of
  // the variants, not on the top of the page.
  await expect(
    stats(page).getByRole("heading", { level: 2, name: "Variants" }),
  ).toBeFocused();
  await expect(
    stats(page).getByRole("button", { name: /statistics/u }),
  ).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("FS2 a crash of the statistics of the individuals: its short words, said in the region, the details in the error bar, the variants' histograms still drawn, and Start the statistics again, which calculates them", async ({
  page,
  makeAxeBuilder,
}) => {
  // The first worker crashes on the statistics of the individuals; the
  // one the page makes after the crash calculates them.
  await crashWorkerOn(page, "run", "individualChecks", true);
  await recordAnnouncements(page);
  await openPage(page);
  await pick(page, join(FIXTURES, "panel.vcf.gz"));

  const failed = "The statistics of the individuals could not be calculated.";
  await expect(stats(page).getByText(failed)).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(() => announced(page))
    .toContainEqual(expect.stringContaining(failed));
  await expect(page.getByRole("alert")).toContainText(
    "The application stopped as it calculated the statistics: ",
  );
  // A failure of one hides nothing of the other.
  await expect(stats(page).locator("svg.chart")).toHaveCount(4, {
    timeout: 20_000,
  });
  await expect(titles(page).first()).toHaveText(
    "Proportion of missing genotypes",
  );
  await expect(table(page)).toHaveCount(0);
  const again = stats(page).getByRole("button", {
    name: "Start the statistics again",
  });
  await expect(again).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  await again.click();
  await expect(table(page)).toBeVisible({ timeout: 20_000 });
  await expect(stats(page).getByText(failed)).toHaveCount(0);
  await expect(stats(page).locator("svg.chart")).toHaveCount(6);
  await expect
    .poll(() => announced(page))
    .toContainEqual(
      expect.stringMatching(
        /The statistics of panel\.vcf\.gz are calculated\.$/u,
      ),
    );
  await expectNoViolations(makeAxeBuilder);
});

test("FS2 a file dropped while the focus is on a header of the table moves the focus to the open button, not to the top of the page", async ({
  page,
}) => {
  await openPage(page);
  await pick(page, join(FIXTURES, "panel.vcf.gz"));
  await expect(table(page)).toBeVisible({ timeout: 20_000 });
  const header = table(page).getByRole("columnheader", {
    name: /^Observed heterozygosity/u,
  });
  await header.click();
  await expect(header).toHaveAttribute("aria-sort", "ascending");
  await expect(header).toBeFocused();

  const nei = await readFile(join(FIXTURES, "panel.nei"));
  await dropFiles(
    page,
    page.getByRole("button", { name: "Open another variants file…" }),
    [{ name: "panel.nei", bytes: [...nei] }],
  );
  await expect(
    page
      .getByRole("region", { name: "File information" })
      .getByText("panel.nei · 261 KB"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open another variants file…" }),
  ).toBeFocused();
});

test("FS2 at 320 pixels the plots are one under the other within the page, which does not scroll sideways", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await openPage(page);
  await pick(page, join(FIXTURES, "panel.vcf.gz"));
  await expect(table(page)).toBeVisible({ timeout: 20_000 });
  const plots = stats(page).locator("svg.chart");
  await expect(plots).toHaveCount(6);
  const boxes = await plots.evaluateAll((svgs) =>
    svgs.map((svg) => svg.getBoundingClientRect()),
  );
  // One column: each plot starts at the same left edge, and none passes
  // the right edge of the page.
  expect(new Set(boxes.map((box) => Math.round(box.left))).size).toBe(1);
  for (const box of boxes) expect(box.right).toBeLessThanOrEqual(320);
  // The three columns of the table within its box, which does not scroll
  // sideways, with the short headers of a narrow page.
  const grid = table(page);
  expect(
    await grid.evaluate((element) => element.scrollWidth - element.clientWidth),
  ).toBe(0);
  const right = await grid.evaluate(
    (element) => element.getBoundingClientRect().right,
  );
  const headers = grid.getByRole("columnheader");
  await expect(headers).toHaveCount(3);
  for (const box of await headers.evaluateAll((cells) =>
    cells.map((cell) => cell.getBoundingClientRect()),
  )) {
    expect(box.right).toBeLessThanOrEqual(right);
  }
  // A screen reader still hears the whole name of each column.
  await expect(
    grid.getByRole("columnheader", { name: /^Observed heterozygosity/u }),
  ).toBeVisible();
  await expect(grid.getByText("Heterozygosity", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
});

test("FS2 on a desktop the plots are two wide", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPage(page);
  await pick(page, join(FIXTURES, "panel.vcf.gz"));
  await expect(table(page)).toBeVisible({ timeout: 20_000 });
  const lefts = await stats(page)
    .locator("svg.chart")
    .evaluateAll((svgs) =>
      svgs.map((svg) => Math.round(svg.getBoundingClientRect().left)),
    );
  expect(new Set(lefts).size).toBe(2);
  // The two plots of a row on one line, whatever the lines of their
  // titles.
  const tops = await stats(page)
    .locator("svg.chart")
    .evaluateAll((svgs) =>
      svgs.map((svg) => Math.round(svg.getBoundingClientRect().top)),
    );
  expect(tops).toHaveLength(6);
  for (let row = 0; row < tops.length; row += 2) {
    expect(tops[row]).toBe(tops[row + 1]);
  }
});

test("FS2 the plots are downloaded once a file is picked, not with the page; a download that fails leaves the section's name and the error bar, and the page still opens files", async ({
  page,
}) => {
  const fetched: string[] = [];
  page.on("request", (request) => {
    fetched.push(request.url());
  });
  // The first download of the code of the statistics fails, as with the
  // network down; the next ones are served, though Chromium 153 keeps the
  // failure of an import() until the page is reloaded and asks no more.
  let refused = 0;
  await page.route(/\/assets\/FileStats-[^/]*\.js$/u, async (route) => {
    if (refused === 0) {
      refused += 1;
      await route.fulfill({ status: 404, body: "" });
    } else {
      await route.continue();
    }
  });
  await openPage(page);
  expect(fetched.filter((url) => /FileStats|d3|plots/u.test(url))).toEqual([]);

  await pick(page, join(FIXTURES, "panel.vcf.gz"));
  await expect(
    page.getByRole("heading", { level: 2, name: "Statistics of the file" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("alert")).toBeVisible();
  expect(refused).toBe(1);

  // The rest of the page works: another file is opened and counted.
  await pick(page, join(FIXTURES, "panel.nei"));
  const box = page.getByRole("region", { name: "File information" });
  await expect(box.getByText("panel.nei · 261 KB")).toBeVisible();
  await expect(box.getByText("Variants: 1,200")).toBeVisible({
    timeout: 20_000,
  });
});

test("FS2 at 320 pixels, the download of the plots failed, the error bar wraps the address of the file in its words and the page does not scroll sideways", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route(/\/assets\/FileStats-[^/]*\.js$/u, async (route) => {
    await route.fulfill({ status: 404, body: "" });
  });
  await openPage(page);
  await pick(page, join(FIXTURES, "panel.vcf.gz"));
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 20_000 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
