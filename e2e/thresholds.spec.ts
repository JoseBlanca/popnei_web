/**
 * The thresholds on the six histograms of popgen2.html, on the built site
 * (docs/plans/thresholds.md, phase 2): the line dragged with the mouse
 * and the box and the words following it; a number typed and the line
 * following it, snapped to popnei's fine edges; the keys of the line; a
 * new file starting them again; axe at each state.
 *
 * The counts are those of the core functions, `variantsAtMost` and
 * `individualsAtMost`, on popnei's numbers of panel.vcf.gz in
 * e2e/fixtures/threshold_counts.json, which make_fixtures.mjs wrote with
 * popnei 0.2.1 under node: the 1,280 fine bins of each statistic of the
 * variants and the value of each individual.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import {
  individualsAtMost,
  snapToFineEdge,
  variantsAtMost,
} from "../src/core/thresholds.ts";
import type { VariantStatistic } from "../src/core/analyses/variantChecks.ts";
import type { VariantStatsPart } from "../src/worker/protocol.ts";
import {
  thresholdLine,
  thresholdValueText,
} from "../src/ui/variants/statsWords.ts";
import { expect, test } from "./axe.ts";
import { writeBigVcf } from "./bigVcf.ts";
import { holdSummary, release } from "./holdWorker.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** popnei's numbers of panel.vcf.gz in the fixture. */
const PANEL = panelOf(
  JSON.parse(
    readFileSync(join(FIXTURES, "threshold_counts.json"), "utf8"),
  ) as unknown,
);

/** The fine bins of the variants and the values of the individuals of
    panel.vcf.gz in the fixture `parsed`. */
function panelOf(parsed: unknown): {
  readonly variants: VariantStatsPart;
  readonly missingGtRate: Float64Array;
} {
  const file = fieldOf(parsed, "panel.vcf.gz");
  const counts = fieldOf(file, "counts");
  const distrib = (statistic: VariantStatistic) => ({
    mean: NaN,
    counts: Uint32Array.from(numbersOf(fieldOf(counts, statistic))),
  });
  return {
    variants: {
      binEdges: Float64Array.from(numbersOf(fieldOf(file, "binEdges"))),
      missingRate: distrib("missingRate"),
      maf: distrib("maf"),
      obsHet: distrib("obsHet"),
      unbiasedExpHet: distrib("unbiasedExpHet"),
      passStats: { numVars: 1200, filtering: {} },
    },
    missingGtRate: Float64Array.from(numbersOf(fieldOf(file, "missingGtRate"))),
  };
}

function fieldOf(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) return undefined;
  return Object.getOwnPropertyDescriptor(value, key)?.value;
}

function numbersOf(value: unknown): number[] {
  if (!Array.isArray(value)) throw new Error("not a list of the fixture");
  return value.map((one: unknown) => (typeof one === "number" ? one : NaN));
}

/** The words under the histogram of `statistic` of the variants with its
    threshold at the fine edge `index`, from the core's counts. */
function variantWords(statistic: VariantStatistic, index: number): string {
  return thresholdLine(
    index / 1280,
    variantsAtMost(PANEL.variants, statistic, index),
    "variant",
  );
}

/** The words under the histogram of the missing rate of the individuals
    with its threshold at `value`, from the core's counts. */
function individualWords(value: number): string {
  const { kept, removed } = individualsAtMost(PANEL.missingGtRate, value);
  return thresholdLine(
    value,
    { keptLow: kept, keptHigh: kept, withValue: kept + removed },
    "individual",
  );
}

async function openPanel(page: Page): Promise<void> {
  await page.goto("popgen2.html");
  await pick(page, "panel.vcf.gz");
}

/** Picks the fixture `name` with the open button. */
async function pick(page: Page, name: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: /^Open (another )?variants file…$/u })
    .click();
  await (await chooser).setFiles(join(FIXTURES, name));
}

/** The histogram titled `title`, its box, its line and its words. */
function histogram(
  page: Page,
  title: string,
): {
  readonly box: Locator;
  readonly slider: Locator;
  readonly thumb: Locator;
  readonly words: Locator;
  readonly dashed: Locator;
} {
  const group = page
    .getByRole("region", { name: "Statistics of the file" })
    .getByRole("group", { name: title, exact: true });
  const slider = group.getByRole("slider");
  return {
    box: group.getByRole("textbox"),
    slider,
    // The input is in a hidden box inside the thumb.
    thumb: slider.locator("xpath=../.."),
    words: group.getByText(/^At most /u),
    dashed: group.locator("line.chart-threshold"),
  };
}

/** The middle of the box of `locator` across, in the page. */
async function middleX(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("not drawn");
  return box.x + box.width / 2;
}

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

test("TH2 at the start: the missing rate of the variants at 0.1, the five others at the top of their axis, each line named and saying what it keeps, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPanel(page);
  const missing = histogram(page, "Proportion of missing genotypes");
  await expect(missing.words).toHaveText(variantWords("missingRate", 128), {
    timeout: 20_000,
  });
  await expect(missing.words).toHaveText(
    "At most 0.1: keeps all 1,200 variants",
  );
  await expect(missing.box).toHaveValue("0.1");
  await expect(missing.box).toHaveAccessibleName(
    "Maximum proportion of missing genotypes",
  );
  await expect(missing.slider).toHaveAccessibleName(
    "Maximum proportion of missing genotypes",
  );
  await expect(missing.slider).toHaveAttribute(
    "aria-valuetext",
    "0.1, keeps all 1,200 variants",
  );
  // The MAF's axis runs to 1, the observed heterozygosity's to 0.7, the
  // expected's to 0.55; the individuals' to 0.045 and 0.4.
  await expect(histogram(page, "Major allele frequency").box).toHaveValue("1");
  await expect(histogram(page, "Observed heterozygosity").box).toHaveValue(
    "0.7",
  );
  await expect(
    histogram(page, "Expected heterozygosity (unbiased)").words,
  ).toHaveText("At most 0.55: keeps all 1,200 variants");
  const individuals = histogram(
    page,
    "Proportion of missing genotypes of each individual",
  );
  await expect(individuals.words).toHaveText(individualWords(0.045));
  await expect(individuals.slider).toHaveAccessibleName(
    "Maximum proportion of missing genotypes of an individual",
  );
  await expect(
    histogram(page, "Observed heterozygosity of each individual").words,
  ).toHaveText("At most 0.4: keeps all 200 individuals");
  await expect(page.getByText("Kept by this filter")).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("TH2 the line dragged with the mouse: the box and the words follow it, the dashed line of the plot under it, the counts the core's", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPanel(page);
  const het = histogram(page, "Observed heterozygosity");
  await expect(het.words).toHaveText("At most 0.7: keeps all 1,200 variants", {
    timeout: 20_000,
  });
  await het.thumb.scrollIntoViewIfNeeded();
  const thumb = await het.thumb.boundingBox();
  if (thumb === null) throw new Error("no thumb");
  const y = thumb.y + thumb.height / 2;
  await page.mouse.move(thumb.x + thumb.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(thumb.x + thumb.width / 2 - 140, y, { steps: 8 });
  await page.mouse.up();

  const index = Number(await het.slider.inputValue());
  expect(index).toBeGreaterThan(0);
  expect(index).toBeLessThan(896);
  const shown = index / 1280;
  await expect(het.box).toHaveValue(String(shown));
  await expect(het.words).toHaveText(variantWords("obsHet", index));
  await expect(het.slider).toHaveAttribute(
    "aria-valuetext",
    thresholdValueText(
      shown,
      variantsAtMost(PANEL.variants, "obsHet", index),
      "variant",
    ),
  );
  // The line the plot draws is under the thumb.
  expect(
    Math.abs((await middleX(het.dashed)) - (await middleX(het.thumb))),
  ).toBeLessThan(1.5);
  await expectNoViolations(makeAxeBuilder);
});

test("TH2 a number typed: the line follows it as it is typed, and at Enter it is snapped to the nearest fine edge, which the box shows", async ({
  page,
}) => {
  await openPanel(page);
  const het = histogram(page, "Observed heterozygosity");
  await expect(het.words).toHaveText("At most 0.7: keeps all 1,200 variants", {
    timeout: 20_000,
  });
  await het.box.fill("0.3");
  // Not committed yet: the line and the words follow the number typed.
  await expect(het.slider).toHaveValue("384");
  await expect(het.words).toHaveText(variantWords("obsHet", 384));
  await expect(het.words).toHaveText(
    "At most 0.3: keeps 373 variants and removes 827",
  );
  expect(
    Math.abs((await middleX(het.dashed)) - (await middleX(het.thumb))),
  ).toBeLessThan(1.5);

  // 0.07 × 1280 is 89.6, the nearest edge 90, 0.0703125.
  await het.box.fill("0.07");
  await het.box.press("Enter");
  const edge = snapToFineEdge(PANEL.variants.binEdges, 0.07);
  expect(edge.index).toBe(90);
  await expect(het.box).toHaveValue("0.0703125");
  await expect(het.slider).toHaveValue("90");
  await expect(het.words).toHaveText(variantWords("obsHet", 90));

  // A threshold beyond the axis widens it, and the line goes with it.
  const missing = histogram(page, "Proportion of missing genotypes");
  await missing.box.fill("0.5");
  await missing.box.press("Enter");
  await expect(missing.slider).toHaveValue("640");
  await expect(missing.slider).toHaveAttribute("max", "640");
  await expect(missing.words).toHaveText(
    "At most 0.5: keeps all 1,200 variants",
  );
});

test("TH2 the keys of the line: an arrow one fine edge, Page Up and Down ten, with Shift too, Shift and an arrow ten, Home and End the ends of the axis; the range where the bins cannot tell", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPanel(page);
  const missing = histogram(page, "Proportion of missing genotypes");
  await expect(missing.words).toHaveText(
    "At most 0.1: keeps all 1,200 variants",
    { timeout: 20_000 },
  );
  await missing.slider.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(missing.slider).toHaveValue("127");
  await expect(missing.box).toHaveValue(String(127 / 1280));
  await page.keyboard.press("PageDown");
  await expect(missing.slider).toHaveValue("117");
  for (let step = 0; step < 5; step += 1) {
    await page.keyboard.press("PageDown");
  }
  await expect(missing.slider).toHaveValue("67");
  for (let step = 0; step < 3; step += 1) {
    await page.keyboard.press("ArrowLeft");
  }
  // 0.05, an edge equal to 64/1280: the variants on it are somewhere in
  // the bin that starts at it.
  await expect(missing.slider).toHaveValue("64");
  await expect(missing.box).toHaveValue("0.05");
  await expect(missing.words).toHaveText(
    "At most 0.05: keeps 1,113 to 1,152 variants and removes 48 to 87",
  );
  await expect(missing.words).toHaveText(variantWords("missingRate", 64));
  await expect(missing.slider).toHaveAttribute(
    "aria-valuetext",
    "0.05, keeps 1,113 to 1,152 of 1,200 variants",
  );
  await expectNoViolations(makeAxeBuilder);
  await page.keyboard.press("Home");
  await expect(missing.slider).toHaveValue("0");
  await page.keyboard.press("PageUp");
  await expect(missing.slider).toHaveValue("10");
  // Shift with Page Up and Down, or with an arrow, ten edges too, and
  // not React Aria's tenth of the axis, 13 edges of 128.
  await page.keyboard.press("Shift+PageUp");
  await expect(missing.slider).toHaveValue("20");
  await page.keyboard.press("Shift+ArrowRight");
  await expect(missing.slider).toHaveValue("30");
  await page.keyboard.press("Shift+ArrowUp");
  await expect(missing.slider).toHaveValue("40");
  await page.keyboard.press("Shift+ArrowLeft");
  await expect(missing.slider).toHaveValue("30");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(missing.slider).toHaveValue("20");
  await page.keyboard.press("Shift+PageDown");
  await expect(missing.slider).toHaveValue("10");
  await page.keyboard.press("End");
  await expect(missing.slider).toHaveValue("128");
  await page.keyboard.press("ArrowRight");
  await expect(missing.slider).toHaveValue("128");

  // The individuals, by 0.0001.
  const individuals = histogram(
    page,
    "Proportion of missing genotypes of each individual",
  );
  await individuals.slider.focus();
  await page.keyboard.press("PageDown");
  await expect(individuals.box).toHaveValue("0.044");
  await page.keyboard.press("ArrowLeft");
  await expect(individuals.box).toHaveValue("0.0439");
  await expect(individuals.words).toHaveText(individualWords(0.0439));
});

test("TH2 another file starts the thresholds again", async ({ page }) => {
  await openPanel(page);
  const missing = histogram(page, "Proportion of missing genotypes");
  await expect(missing.words).toHaveText(
    "At most 0.1: keeps all 1,200 variants",
    { timeout: 20_000 },
  );
  await missing.box.fill("0.05");
  await missing.box.press("Enter");
  const het = histogram(page, "Observed heterozygosity");
  await het.box.fill("0.3");
  await het.box.press("Enter");
  await expect(het.box).toHaveValue("0.3");

  await pick(page, "panel.vcf.gz");
  await expect(missing.words).toHaveText(
    "At most 0.1: keeps all 1,200 variants",
    { timeout: 20_000 },
  );
  await expect(missing.box).toHaveValue("0.1");
  await expect(het.box).toHaveValue("0.7");
});

test("TH2 while the pass runs the words are of the variants read so far, and a threshold moved then stays at the end", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  test.setTimeout(120_000);
  const vcf = testInfo.outputPath("stats.vcf.gz");
  await writeBigVcf(vcf, 30_000);
  await holdSummary(page);
  await page.goto("popgen2.html");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Open variants file…" }).click();
  await (await chooser).setFiles(vcf);
  // Every block read, its results so far held, and the final result.
  await expect(
    page.getByText("Calculating the statistics of the variants… 100%"),
  ).toBeVisible({ timeout: 60_000 });
  await release(page, "allSoFar");

  const het = histogram(page, "Observed heterozygosity");
  await expect(het.words).toHaveText(/^At most [\d.]+: keeps .* so far$/u, {
    timeout: 60_000,
  });
  await expect(het.slider).toHaveAttribute("aria-valuetext", /so far$/u);
  await het.slider.focus();
  // Home: the left end of the axis, below every variant read so far.
  await page.keyboard.press("Home");
  await expect(het.words).toHaveText(
    /^At most [\d.]+: keeps 0 variants and removes [\d,]+ so far$/u,
  );
  const atHome = await het.box.inputValue();
  await expectNoViolations(makeAxeBuilder);

  // The result: the same threshold, its words no longer so far.
  await release(page, "result");
  await expect(het.words).toHaveText(
    `At most ${atHome}: keeps 0 variants and removes 30,000`,
    { timeout: 60_000 },
  );
  await expect(het.box).toHaveValue(atHome);
});
