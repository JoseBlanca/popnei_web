/**
 * The menus "Download…" of the tables and the plots of popgen2.html, on
 * the built site (docs/plans/analyses-pca.md, work package 5, deliverable
 * 4; docs/specs/steps/popgen2-pca.md, "The downloads" and "How it is
 * checked"; docs/specs/widgets/downloads.md): each menu opened and chosen
 * with the keyboard alone; the six histograms of the Variants tab, their
 * files named after the variants file, the SVG of one with its
 * threshold's line and the CSV of their bins; the table of the
 * Individuals tab, sorted, saved and read back in that order, every row
 * of individuals_10000.xlsx, longer than its frame, which no test in
 * jsdom can tell from the rows in view; the counts per population saved;
 * a histogram's menu waiting, with its tooltip, while the one pass is
 * held (holdWorker.ts); "Saving …" in the status region; and axe with a
 * menu open, light and dark. The PCA's menus are work package 6's.
 *
 * panel.nei holds 1,200 variants of 200 diploid individuals, whose
 * populations in panel_pops.csv are p0 of 48, p2 of 84 and p1 of 68. The
 * CSV of each histogram is checked against the plot's description, its
 * bins, its ends and its count, and against the bins core makes of
 * popnei's numbers for panel.nei, from popnei 0.2.2 under node in
 * e2e/fixtures/threshold_counts.json, for that statistic: the plots
 * import CSS, which a flow cannot load, so the binning of core is called
 * as the plots call it.
 */
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Download, Locator, Page, TestInfo } from "@playwright/test";

import type { IndividualStatistic } from "../src/core/analyses/individualChecks.ts";
import { variantBinsRounded } from "../src/core/analyses/variantChecks.ts";
import type { VariantStatistic } from "../src/core/analyses/variantChecks.ts";
import { binsCsv } from "../src/core/csv.ts";
import { INDIVIDUAL_BINS, binValuesRounded } from "../src/core/histogram.ts";
import type { VariantStatsPart } from "../src/worker/protocol.ts";
import { announced, recordAnnouncements } from "./announced.ts";
import { expect, test } from "./axe.ts";
import { writeBigVcf } from "./bigVcf.ts";
import { holdSummary, release } from "./holdWorker.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The six histograms of the Variants tab: the name of their menu, after
    "Download ", and what their files are in their names. */
const HISTOGRAMS = [
  [
    "the plot of the proportion of missing genotypes of the variants",
    "missing_rate_variants",
  ],
  ["the plot of the major allele frequency of the variants", "maf_variants"],
  [
    "the plot of the observed heterozygosity of the variants",
    "obs_het_variants",
  ],
  [
    "the plot of the unbiased expected heterozygosity of the variants",
    "exp_het_variants",
  ],
  [
    "the plot of the proportion of missing genotypes of each individual",
    "missing_rate_individuals",
  ],
  [
    "the plot of the observed heterozygosity of each individual",
    "obs_het_individuals",
  ],
] as const;

/** popnei's numbers of panel.nei in the fixture: the 1,000 fine bins of
    each statistic of the variants, and each individual's missing rate
    and heterozygosity. */
const PANEL = JSON.parse(
  readFileSync(join(FIXTURES, "threshold_counts.json"), "utf8"),
) as unknown;

function fieldOf(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) return undefined;
  return Object.getOwnPropertyDescriptor(value, key)?.value;
}

function numbersOf(value: unknown): number[] {
  if (!Array.isArray(value)) throw new Error("not a list of the fixture");
  return value.map((one: unknown) => (typeof one === "number" ? one : NaN));
}

/** The CSV of the histogram of `file`'s statistic that core's binning
    makes of popnei's numbers of panel.nei, as the plots of the page bin
    them: the variants' fine bins added up over their range rounded out,
    for 200 diploid individuals; the individuals' values in 20 bins, the
    missing rate from 0, the heterozygosity with a last row of those with
    none. */
function expectedCsv(file: string): string {
  const nei = fieldOf(PANEL, "panel.nei");
  const counts = fieldOf(nei, "counts");
  const distrib = (statistic: VariantStatistic) => ({
    mean: NaN,
    counts: Uint32Array.from(numbersOf(fieldOf(counts, statistic))),
  });
  const variants: VariantStatsPart = {
    binEdges: Float64Array.from(numbersOf(fieldOf(nei, "binEdges"))),
    missingRate: distrib("missingRate"),
    maf: distrib("maf"),
    obsHet: distrib("obsHet"),
    unbiasedExpHet: distrib("unbiasedExpHet"),
    passStats: { numVars: 1200, filtering: {} },
  };
  const ofVariants: Readonly<Record<string, VariantStatistic>> = {
    missing_rate_variants: "missingRate",
    maf_variants: "maf",
    obs_het_variants: "obsHet",
    exp_het_variants: "unbiasedExpHet",
  };
  const ofIndividuals: Readonly<Record<string, IndividualStatistic>> = {
    missing_rate_individuals: "missingGenotypes",
    obs_het_individuals: "observedHeterozygosity",
  };
  const variantStatistic = ofVariants[file];
  if (variantStatistic !== undefined) {
    const bins = variantBinsRounded(variants, variantStatistic, {
      numIndividuals: 200,
      ploidy: 2,
    });
    return binsCsv(bins.edges, bins.counts, null);
  }
  const individualStatistic = ofIndividuals[file];
  if (individualStatistic === undefined) throw new Error(`no plot ${file}`);
  const missing = individualStatistic === "missingGenotypes";
  const bins = binValuesRounded(
    Float64Array.from(
      numbersOf(fieldOf(nei, missing ? "missingGtRate" : "obsHetRate")),
    ),
    INDIVIDUAL_BINS,
    missing,
  );
  if (bins === null) throw new Error(`no value of ${file}`);
  return binsCsv(bins.edges, bins.counts, missing ? null : bins.numNaN);
}

/** The bins, the two ends and the count of the histogram whose plot is
    the `index`th of the section, from its description: "The major
    allele frequency of 1,200 variants, in 50 bins from 0.45 to 1." */
async function describedBins(
  page: Page,
  index: number,
): Promise<{
  readonly count: number;
  readonly bins: number;
  readonly low: number;
  readonly high: number;
}> {
  const text = await stats(page)
    .locator("svg.chart desc")
    .nth(index)
    .textContent();
  const found =
    /of ([\d,]+) (?:variants|individuals), in (\d+) bins from ([\d.]+) to ([\d.]+)\./u.exec(
      text ?? "",
    );
  if (found === null) throw new Error(`no bins in ${String(text)}`);
  const [, count, bins, low, high] = found;
  return {
    count: Number((count ?? "").replaceAll(",", "")),
    bins: Number(bins),
    low: Number(low),
    high: Number(high),
  };
}

/** The x1 of the line of the threshold of the first plot, the missing
    rate of the variants, and whether it is drawn as keeping every
    variant. */
async function firstLine(
  page: Page,
): Promise<{ readonly x1: string | null; readonly keepsAll: boolean }> {
  const line = stats(page)
    .locator("svg.chart")
    .first()
    .locator("line.chart-threshold");
  return {
    x1: await line.getAttribute("x1"),
    keepsAll: ((await line.getAttribute("class")) ?? "").includes(
      "chart-threshold-keeps-all",
    ),
  };
}

/** The items of a plot's menu, in their order. */
const PLOT_ITEMS = ["Image as SVG", "Image as PNG", "Data as CSV"] as const;

function stats(page: Page): Locator {
  return page.getByRole("region", { name: "Statistics of the file" });
}

function variantsBox(page: Page): Locator {
  return page.getByRole("region", { name: "Variants file", exact: true });
}

function individualsBox(page: Page): Locator {
  return page.getByRole("region", { name: "Individuals file", exact: true });
}

/** The button "Download…" named `what`, after "Download ". */
function menuButton(scope: Locator | Page, what: string): Locator {
  return scope.getByRole("button", { name: `Download ${what}`, exact: true });
}

/** Picks the fixture or the path `file` with the button of the box of the
    variants file. */
async function pick(page: Page, file: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await variantsBox(page)
    .getByRole("button", { name: /^Open (another )?variants file…$/u })
    .click();
  await (
    await chooser
  ).setFiles(file.startsWith("/") ? file : join(FIXTURES, file));
}

/** Picks the fixture `name` with the button of the box of the individuals
    file. */
async function pickIndividuals(page: Page, name: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await individualsBox(page)
    .getByRole("button", { name: /^Open (another )?individuals file…$/u })
    .click();
  await (await chooser).setFiles(join(FIXTURES, name));
}

/** Opens popgen2.html and panel.nei, and waits for the one pass to end,
    the menus of its six plots enabled. */
async function openDone(page: Page): Promise<void> {
  await page.goto("popgen2.html");
  await pick(page, "panel.nei");
  await expect(page.locator("svg.chart")).toHaveCount(6, { timeout: 20_000 });
  for (const [what] of HISTOGRAMS) {
    await expect(menuButton(stats(page), what)).not.toHaveAttribute(
      "aria-disabled",
      "true",
      { timeout: 20_000 },
    );
  }
}

/** Opens the menu of the focused button with Enter, goes down to `item`,
    the `index`th, with the arrow keys, chooses it with Enter, and gives
    the file the page hands to the browser. */
async function chooseByKeys(
  page: Page,
  item: string,
  index: number,
): Promise<Download> {
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  // React Aria puts the focus on the first item as the keyboard opens it.
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  for (let at = 0; at < index; at += 1) await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: item })).toBeFocused();
  const download = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  return download;
}

/** The text of a downloaded file. */
async function textOf(download: Download): Promise<string> {
  const path = await download.path();
  return readFile(path, "utf8");
}

/** The fields of a line of a CSV, as RFC 4180 writes them. */
function fieldsOf(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let at = 0; at < line.length; at += 1) {
    const char = line.charAt(at);
    if (quoted) {
      if (char === '"' && line.charAt(at + 1) === '"') {
        field += '"';
        at += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      fields.push(field);
      field = "";
    } else {
      field += char;
    }
  }
  fields.push(field);
  return fields;
}

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

test("AP5 D4 each histogram's menu by the keyboard alone, from the box of its threshold: its three files named after panel.nei, the CSV of its bins, the SVG with the threshold's line, and Saving … in the status region", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await recordAnnouncements(page);
  await openDone(page);
  // The missing rate is on at 0.1 on a new page, which keeps every
  // variant: its line is drawn as keeping all.
  const atStart = await firstLine(page);
  expect(atStart.keepsAll).toBe(true);
  // A threshold that removes variants, so that the line of the first
  // plot is drawn as one that does.
  const box = stats(page).getByRole("textbox", {
    name: "Missing genotypes max: maximum proportion of missing genotypes",
  });
  await box.fill("0.05");
  await box.press("Enter");
  await expect(box).toHaveValue("0.05");
  await expect.poll(async () => (await firstLine(page)).keepsAll).toBe(false);
  const shown = await firstLine(page);
  expect(shown.x1).not.toBeNull();
  expect(shown.x1).not.toBe(atStart.x1);
  // The menu is the next stop of the Tab key after the box.
  await page.keyboard.press("Tab");
  await expect(menuButton(stats(page), HISTOGRAMS[0][0])).toBeFocused();

  for (const [plotIndex, [what, file]] of HISTOGRAMS.entries()) {
    const button = menuButton(stats(page), what);
    for (const [index, item] of PLOT_ITEMS.entries()) {
      await button.focus();
      const download = await chooseByKeys(page, item, index);
      const extension = ["svg", "png", "csv"][index];
      expect(download.suggestedFilename()).toBe(
        `panel.${file}.${String(extension)}`,
      );
      // Escape or a choice gives the focus back to the button.
      await expect(button).toBeFocused();
      const text = item === "Image as PNG" ? "" : await textOf(download);
      if (item === "Data as CSV") {
        const lines = text.split("\n");
        expect(lines[0]).toBe("left_edge,right_edge,count");
        expect(lines.at(-1)).toBe("");
        // The heterozygosity of the individuals ends with those with
        // none, with no edges: none in panel.nei.
        const apart = file === "obs_het_individuals" ? 1 : 0;
        if (apart === 1) expect(lines.at(-2)).toBe(",,0");
        const rows = lines
          .slice(1, -1 - apart)
          .map((line) => line.split(",").map(Number));
        // As the plot describes itself: its bins, its two ends, and every
        // variant, or individual, in them.
        const described = await describedBins(page, plotIndex);
        expect(described.count).toBe(file.endsWith("_variants") ? 1200 : 200);
        expect(rows).toHaveLength(described.bins);
        expect(rows[0]?.[0]).toBe(described.low);
        expect(rows.at(-1)?.[1]).toBe(described.high);
        expect(rows.reduce((sum, row) => sum + (row[2] ?? NaN), 0)).toBe(
          described.count,
        );
        // And bin by bin, the first among them, those core makes of
        // popnei's numbers for this statistic.
        expect(text).toBe(expectedCsv(file));
      }
      if (item === "Image as SVG") {
        expect(text).toMatch(/^<svg/u);
        if (file === "missing_rate_variants") {
          // The line as drawn at 0.05, not one that keeps every variant.
          const line = /<line[^>]*class="chart-threshold[^"]*"[^>]*>/u.exec(
            text,
          )?.[0];
          expect(line).toBeDefined();
          expect(line).not.toContain("chart-threshold-keeps-all");
          expect(line).toContain(`x1="${String(shown.x1)}"`);
        }
      }
      if (item === "Image as PNG") {
        const bytes = await readFile(await download.path());
        expect([...bytes.subarray(1, 4)]).toEqual([0x50, 0x4e, 0x47]);
      }
    }
  }
  // The region may say two of them at once, as one text, and says the
  // last one a moment after its choice.
  await expect
    .poll(async () => (await announced(page)).join(" "))
    .toContain("Saving panel.obs_het_individuals.csv.");
  const said = (await announced(page)).join(" ");
  for (const [, file] of HISTOGRAMS) {
    for (const extension of ["svg", "png", "csv"]) {
      expect(said).toContain(`Saving panel.${file}.${extension}.`);
    }
  }
});

test("AP5 D4 the table of individuals_10000.xlsx, longer than its frame, sorted by Edad and saved by the keyboard: 10,001 lines, the header first, every row in the order sorted", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("popgen2.html");
  await pickIndividuals(page, "individuals_10000.xlsx");
  await page.getByRole("tab", { name: "Individuals", exact: true }).click();
  const grid = page.getByRole("grid", {
    name: "The table of individuals_10000.xlsx",
  });
  await expect(grid).toBeVisible({ timeout: 60_000 });
  const header = grid.getByRole("columnheader", { name: /^Edad/u });
  await header.click();
  await expect(header).toHaveAttribute("aria-sort", "ascending");
  await expect(grid).not.toHaveAttribute("aria-busy", "true");

  const button = menuButton(page, "the table of individuals_10000.xlsx");
  await button.focus();
  const download = await chooseByKeys(page, "Table as CSV", 0);
  expect(download.suggestedFilename()).toBe("individuals_10000.table.csv");
  const lines = (await textOf(download)).split("\n");
  expect(lines.at(-1)).toBe("");
  const rows = lines.slice(0, -1);
  expect(rows.length).toBe(10_001);
  const head = fieldsOf(rows[0] ?? "");
  expect(head).toHaveLength(20);
  expect(head.slice(0, 5)).toEqual([
    "Individuo",
    "Población",
    "Localidad",
    "Sexo",
    "Edad",
  ]);
  // The ages up, the missing ones last, as the grid shows them.
  const ages = rows.slice(1).map((row) => fieldsOf(row)[4] ?? "");
  const known = ages.filter((age) => age !== "").map(Number);
  expect(known.every((age) => Number.isFinite(age))).toBe(true);
  expect(known).toEqual(known.toSorted((a, b) => a - b));
  expect(ages.slice(known.length).every((age) => age === "")).toBe(true);
  // The rows in view are the first of the file saved.
  const firstName = fieldsOf(rows[1] ?? "")[0] ?? "";
  await expect(grid.getByRole("rowheader").first()).toHaveText(firstName);
});

test("AP5 D4 the counts per population of panel_pops.csv saved by the keyboard: panel.population_counts.csv, a row per population in the order shown", async ({
  page,
}) => {
  await recordAnnouncements(page);
  await openDone(page);
  await pickIndividuals(page, "panel_pops.csv");
  const button = menuButton(
    individualsBox(page),
    "the counts per population of panel_pops.csv",
  );
  await expect(button).not.toHaveAttribute("aria-disabled", "true", {
    timeout: 20_000,
  });
  await button.focus();
  const download = await chooseByKeys(page, "Table as CSV", 0);
  expect(download.suggestedFilename()).toBe("panel.population_counts.csv");
  expect(await textOf(download)).toBe(
    "Population,Individuals\np0,48\np2,84\np1,68\n",
  );
  await expect
    .poll(async () => (await announced(page)).join(" "))
    .toContain("Saving panel.population_counts.csv.");
});

/** The reason of a menu that waits for the one pass of held.vcf.gz. */
const HELD_REASON = "Download once held.vcf.gz is read to the end.";

/** Opens popgen2.html and held.vcf.gz, 30,000 variants, and holds its one
    pass with one result so far let through, which draws the plots and
    their menus, waiting. */
async function openHeld(page: Page, testInfo: TestInfo): Promise<void> {
  const vcf = testInfo.outputPath("held.vcf.gz");
  await writeBigVcf(vcf, 30_000);
  await holdSummary(page);
  await page.goto("popgen2.html");
  await pick(page, vcf);
  // The pass read to its end, its results held: one result so far let
  // through draws the plots.
  await expect(
    page.getByText("Calculating the statistics of the variants… 100%"),
  ).toBeVisible({ timeout: 60_000 });
  await release(page, "oneSoFar");
  await expect(menuButton(stats(page), HISTOGRAMS[0][0])).toBeVisible({
    timeout: 60_000,
  });
}

test("AP5 D4 a histogram's menu waits while the one pass is held: marked disabled, its reason as its tooltip and its description, no menu on Enter; enabled once the pass ends", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await openHeld(page, testInfo);
  const [what] = HISTOGRAMS[0];
  const button = menuButton(stats(page), what);
  const reason = HELD_REASON;
  await expect(button).toHaveAttribute("aria-disabled", "true");
  await expect(button).toHaveAccessibleDescription(reason);
  await button.focus();
  await expect(page.getByRole("tooltip")).toHaveText(reason);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toHaveCount(0);
  for (const [other] of HISTOGRAMS) {
    await expect(menuButton(stats(page), other)).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  }

  await release(page, "allSoFar");
  await release(page, "result");
  await expect(button).not.toHaveAttribute("aria-disabled", "true", {
    timeout: 60_000,
  });
  await expect(button).not.toHaveAccessibleDescription(reason);
});

test("AP5 D4 a waiting menu reached by Tab, which scrolls it into view on a window 600 pixels high, keeps its reason shown", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 600 });
  await openHeld(page, testInfo);
  // The menu of the missing rate of the individuals, below the window,
  // and the box of its threshold, the stop of the Tab key before it, given
  // the focus without a scroll.
  const button = menuButton(stats(page), HISTOGRAMS[4][0]);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await expect(button).not.toBeInViewport();
  await stats(page)
    .getByRole("textbox")
    .nth(3)
    .evaluate((box) => {
      if (box instanceof HTMLElement) box.focus({ preventScroll: true });
    });
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.keyboard.press("Tab");
  await expect(button).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
  await expect(page.getByRole("tooltip")).toHaveText(HELD_REASON);
  // Still there once the scroll has long ended.
  await page.waitForTimeout(1000);
  await expect(page.getByRole("tooltip")).toHaveText(HELD_REASON);
  await expect(button).toBeInViewport();
});

test("AP5 D4 a click on a waiting menu shows its reason and opens nothing", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await openHeld(page, testInfo);
  const button = menuButton(stats(page), HISTOGRAMS[0][0]);
  // Forced, since Playwright waits for a button marked aria-disabled to
  // be enabled; a user's click reaches it.
  await button.click({ force: true });
  await expect(page.getByRole("tooltip")).toHaveText(HELD_REASON);
  await expect(page.getByRole("menu")).toHaveCount(0);
  await page.waitForTimeout(1000);
  await expect(page.getByRole("tooltip")).toHaveText(HELD_REASON);
  await expect(page.getByRole("menu")).toHaveCount(0);
});

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true });

  test("AP5 D4 a tap on a waiting menu shows its reason and opens nothing", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await openHeld(page, testInfo);
    const button = menuButton(stats(page), HISTOGRAMS[0][0]);
    await button.tap({ force: true });
    await expect(page.getByRole("tooltip")).toHaveText(HELD_REASON);
    await expect(page.getByRole("menu")).toHaveCount(0);
    await page.waitForTimeout(1000);
    await expect(page.getByRole("tooltip")).toHaveText(HELD_REASON);
  });
});

test("AP5 D4 axe with a histogram's menu open and with the table's menu open, light and dark", async ({
  page,
  makeAxeBuilder,
}) => {
  await openDone(page);
  await pickIndividuals(page, "panel_pops.csv");
  const [what] = HISTOGRAMS[0];
  await menuButton(stats(page), what).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  for (const scheme of ["light", "dark"] as const) {
    // No transition of the colours, which axe would read halfway.
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await expectNoViolations(makeAxeBuilder);
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);

  await page.getByRole("tab", { name: "Individuals", exact: true }).click();
  await menuButton(page, "the table of panel_pops.csv").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await expectNoViolations(makeAxeBuilder);
  }
});

test('AP5 D4 Ctrl+Z, or Cmd+Z, with a histogram\'s menu open undoes the threshold changed before, and the menu stays open (docs/specs/steps/popgen2-pca.md, "The keys")', async ({
  page,
}) => {
  await openDone(page);
  const box = stats(page).getByRole("textbox", {
    name: "Missing genotypes max: maximum proportion of missing genotypes",
  });
  const before = await box.inputValue();
  await box.fill("0.05");
  await box.press("Enter");
  await expect(box).toHaveValue("0.05");
  const button = menuButton(stats(page), HISTOGRAMS[0][0]);
  await button.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(box).toHaveValue(before);
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
});
