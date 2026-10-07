/**
 * The thresholds on the six histograms of popgen2.html, on the built site
 * (docs/plans/thresholds.md, phase 2): the line dragged with the mouse
 * and the box and the words following it; a number typed and the line
 * following it, snapped to popnei's fine edges, which is said; the keys
 * of the line and of the box; a new file starting them again; what is
 * typed kept while a result so far widens the axis; axe at each state.
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

/** The words after the box of the histogram of `statistic` of the
    variants with its threshold set at the fine edge `index`, shown in
    full, from the core's counts. */
function variantWords(statistic: VariantStatistic, index: number): string {
  return thresholdLine(
    index / 1280,
    variantsAtMost(PANEL.variants, statistic, index),
    "variant",
    { binEnd: (index + 1) / 1280 },
  );
}

/** The words after the box of the histogram of the missing rate of the
    individuals with its threshold at `value`, from the core's counts;
    `noLimit` for the threshold never set. */
function individualWords(value: number, noLimit = false): string {
  const { kept, removed } = individualsAtMost(PANEL.missingGtRate, value);
  return thresholdLine(
    value,
    { keptLow: kept, keptHigh: kept, withValue: kept + removed },
    "individual",
    { noLimit },
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

/** The histogram titled `title`, its box, its line, its words and the
    bars it hatches. */
function histogram(
  page: Page,
  title: string,
): {
  readonly group: Locator;
  readonly box: Locator;
  readonly slider: Locator;
  readonly thumb: Locator;
  readonly words: Locator;
  readonly dashed: Locator;
  readonly hatched: Locator;
} {
  const group = page
    .getByRole("region", { name: "Statistics of the file" })
    .getByRole("group", { name: title, exact: true });
  const slider = group.getByRole("slider");
  return {
    group,
    box: group.getByRole("textbox"),
    slider,
    // The input is in a hidden box inside the thumb.
    thumb: slider.locator("xpath=../.."),
    words: group.getByText(/^(?:\(no limit\) )?keeps |^no \w+ has a value/u),
    dashed: group.locator("line.chart-threshold"),
    hatched: group.locator("rect.chart-bar-undecided"),
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

test("TH2 at the start: the missing rate of the variants at 0.1, the five others at the top of their axis and no limit, each box after the word Maximum, named and described by its words, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPanel(page);
  const missing = histogram(page, "Proportion of missing genotypes");
  await expect(missing.words).toHaveText(variantWords("missingRate", 128), {
    timeout: 20_000,
  });
  // 0.1 is set, a limit that keeps every variant, not "no limit".
  await expect(missing.words).toHaveText("keeps all 1,200 variants");
  await expect(missing.box).toHaveValue("0.1");
  await expect(missing.box).toHaveAccessibleName(
    "Maximum proportion of missing genotypes",
  );
  // One row under the plot: the word, the box, the words of the counts,
  // which a screen reader reads with the box.
  // The label shows "Maximum", and the rest of the name to a screen
  // reader alone.
  const label = missing.group.locator("label");
  await expect(label).toHaveText("Maximum proportion of missing genotypes");
  expect((await label.boundingBox())?.width ?? 0).toBeLessThan(100);
  await expect(missing.box).toHaveAccessibleDescription(
    "keeps all 1,200 variants",
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
  const expected = histogram(page, "Expected heterozygosity (unbiased)");
  await expect(expected.words).toHaveText(
    "(no limit) keeps all 1,200 variants",
  );
  await expect(expected.box).toHaveValue("0.55");
  await expect(expected.slider).toHaveAttribute(
    "aria-valuetext",
    "0.55 (no limit), keeps all 1,200 variants",
  );
  const individuals = histogram(
    page,
    "Proportion of missing genotypes of each individual",
  );
  await expect(individuals.words).toHaveText(individualWords(0.045, true));
  await expect(individuals.slider).toHaveAccessibleName(
    "Maximum proportion of missing genotypes of an individual",
  );
  await expect(
    histogram(page, "Observed heterozygosity of each individual").words,
  ).toHaveText("(no limit) keeps all 200 individuals");
  await expect(page.getByText("Kept by this filter")).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("TH2 the line dragged with the mouse: the box and the words follow it, the dashed line of the plot under it, the counts the core's", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPanel(page);
  const het = histogram(page, "Observed heterozygosity");
  await expect(het.words).toHaveText("(no limit) keeps all 1,200 variants", {
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
  // The edge in full, the number counted.
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

test("TH2 a number typed: the line follows it as it is typed, and at Enter it is snapped to the nearest fine edge, which the box shows in full, the number counted, and a line says until the box changes or refuses a number; an arrow of the box one edge; nine decimals refused", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPanel(page);
  const het = histogram(page, "Observed heterozygosity");
  await expect(het.words).toHaveText("(no limit) keeps all 1,200 variants", {
    timeout: 20_000,
  });
  await het.box.fill("0.3");
  // Not committed yet: the line and the words follow the number typed.
  await expect(het.slider).toHaveValue("384");
  await expect(het.words).toHaveText(variantWords("obsHet", 384));
  await expect(het.words).toHaveText("keeps 373 variants and removes 827");
  expect(
    Math.abs((await middleX(het.dashed)) - (await middleX(het.thumb))),
  ).toBeLessThan(1.5);

  // 0.07 × 1280 is 89.6, the nearest edge 90, 0.0703125.
  await het.box.fill("0.07");
  await het.box.press("Enter");
  const edge = snapToFineEdge(PANEL.variants.binEdges, 0.07);
  expect(edge.index).toBe(90);
  await expect(het.box).toHaveValue("0.0703125");
  // On the step of the box, one fine edge, so React Aria does not mark
  // it invalid.
  await expect(het.box).not.toHaveAttribute("aria-invalid", "true");
  await expect(het.slider).toHaveValue("90");
  await expect(het.words).toHaveText(variantWords("obsHet", 90));
  const snapped = het.group.getByText(
    "0.07 is counted as 0.0703125, the nearest edge of the bins.",
  );
  await expect(snapped).toBeVisible();
  await expect(het.box).toHaveAccessibleDescription(
    `${variantWords("obsHet", 90)} 0.07 is counted as 0.0703125, the nearest edge of the bins.`,
  );
  await expectNoViolations(makeAxeBuilder);

  // The Up arrow in the box: the next fine edge, 91, 0.07109375; the line
  // of the number moved goes.
  await het.box.press("ArrowUp");
  await expect(het.box).toHaveValue("0.07109375");
  await expect(het.slider).toHaveValue("91");
  await expect(het.words).toHaveText(variantWords("obsHet", 91));
  await expect(snapped).toHaveCount(0);

  // An edge typed in full, 435/1280, is moved nowhere.
  await het.box.fill("0.33984375");
  await het.box.press("Enter");
  await expect(het.slider).toHaveValue("435");
  await expect(het.box).toHaveValue("0.33984375");
  await expect(het.group.getByText(/is counted as/u)).toHaveCount(0);

  // Four decimals are no edge: 0.3398 is counted as 0.33984375.
  await het.box.fill("0.3398");
  await het.box.press("Enter");
  const moved = het.group.getByText(
    "0.3398 is counted as 0.33984375, the nearest edge of the bins.",
  );
  await expect(moved).toBeVisible();
  // Nine decimals are refused, the threshold stays, and the line of the
  // number moved goes, which named another entry.
  await het.box.fill("0.123456789");
  await het.box.press("Enter");
  await expect(
    het.group.getByText(
      "0.123456789 has more than 8 decimals; the threshold stays 0.33984375.",
    ),
  ).toBeVisible();
  await expect(moved).toHaveCount(0);
  await expect(het.box).toHaveValue("0.33984375");
  await expect(het.slider).toHaveValue("435");
  // A key typed in the box takes it away too.
  await het.box.fill("0.3398");
  await het.box.press("Enter");
  await expect(moved).toBeVisible();
  await het.box.press("End");
  await het.box.press("1");
  await expect(moved).toHaveCount(0);
  await het.box.press("Escape");

  // A threshold beyond the axis widens it, and the line goes with it.
  const missing = histogram(page, "Proportion of missing genotypes");
  await missing.box.fill("0.5");
  await missing.box.press("Enter");
  await expect(missing.slider).toHaveValue("640");
  await expect(missing.slider).toHaveAttribute("max", "640");
  await expect(missing.words).toHaveText("keeps all 1,200 variants");
});

test("TH2 the keys of the line: an arrow one fine edge, Page Up and Down ten, with Shift too, Shift and an arrow ten, Home and End the ends of the axis; the range where the bins cannot tell", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPanel(page);
  const missing = histogram(page, "Proportion of missing genotypes");
  await expect(missing.words).toHaveText("keeps all 1,200 variants", {
    timeout: 20_000,
  });
  await missing.slider.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(missing.slider).toHaveValue("127");
  // 127/1280 is 0.09921875, shown in full.
  await expect(missing.box).toHaveValue("0.09921875");
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
    "keeps 1,113 to 1,152 variants; the bins cannot tell which of the 39 from 0.05 to 0.05078125 are at 0.05",
  );
  await expect(missing.words).toHaveText(variantWords("missingRate", 64));
  // The bar that starts at the line is hatched, neither kept nor removed.
  await expect(missing.hatched).toHaveCount(1);
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
  await expect(missing.hatched).toHaveCount(0);
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
  await expect(missing.words).toHaveText("keeps all 1,200 variants", {
    timeout: 20_000,
  });
  await missing.box.fill("0.05");
  await missing.box.press("Enter");
  const het = histogram(page, "Observed heterozygosity");
  await het.box.fill("0.3");
  await het.box.press("Enter");
  await expect(het.box).toHaveValue("0.3");

  await pick(page, "panel.vcf.gz");
  await expect(missing.words).toHaveText("keeps all 1,200 variants", {
    timeout: 20_000,
  });
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
  await expect(het.words).toHaveText(
    /^\(no limit\) keeps all [\d,]+ variants so far$/u,
    { timeout: 60_000 },
  );
  await expect(het.slider).toHaveAttribute("aria-valuetext", /so far$/u);
  await het.slider.focus();
  // Home: the left end of the axis, below every variant read so far.
  await page.keyboard.press("Home");
  await expect(het.words).toHaveText(
    /^keeps 0 variants and removes [\d,]+ so far$/u,
  );
  const atHome = await het.box.inputValue();
  await expectNoViolations(makeAxeBuilder);

  // The result: the same threshold, its words no longer so far.
  await release(page, "result");
  await expect(het.words).toHaveText("keeps 0 variants and removes 30,000", {
    timeout: 60_000,
  });
  await expect(het.box).toHaveValue(atHome);
});

test("TH2 a number typed in the box of a threshold at the top of its axis is kept while a result so far widens the axis", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const vcf = testInfo.outputPath("stats.vcf.gz");
  await writeBigVcf(vcf, 30_000);
  await holdSummary(page);
  await page.goto("popgen2.html");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Open variants file…" }).click();
  await (await chooser).setFiles(vcf);
  await expect(
    page.getByText("Calculating the statistics of the variants… 100%"),
  ).toBeVisible({ timeout: 60_000 });
  // The first result so far: the line never set, at the top of its axis.
  await release(page, "oneSoFar");
  const het = histogram(page, "Observed heterozygosity");
  await expect(het.words).toHaveText(/^\(no limit\) keeps .* so far$/u, {
    timeout: 60_000,
  });
  const top = await het.box.inputValue();
  const over = het.group.getByText(/^Over [\d,]+ variants so far$/u);
  const overFirst = await over.innerText();

  await het.box.click();
  await het.box.press("ControlOrMeta+a");
  await page.keyboard.type("0.3");
  // Every other result so far, which read most of the file.
  await release(page, "allSoFar");
  // The plot drawn from more variants.
  await expect(over).not.toHaveText(overFirst);
  await expect(het.box).toHaveValue("0.3");
  await expect(het.box).toBeFocused();
  // Escape puts back what the box showed at its focus, and leaving it
  // shows the top of the axis now, which the results so far moved.
  await het.box.press("Escape");
  await expect(het.box).toHaveValue(top);
  await het.box.blur();
  await expect(het.box).not.toHaveValue(top);
  // Typed again and committed, it stays at the result.
  await het.box.fill("0.3");
  await het.box.press("Enter");
  await release(page, "result");
  await expect(het.words).toHaveText(/^keeps [\d,]+ variants and removes/u, {
    timeout: 60_000,
  });
  await expect(het.box).toHaveValue("0.3");
});
