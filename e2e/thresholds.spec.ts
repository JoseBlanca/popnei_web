/**
 * The thresholds on the six histograms of popgen2.html, on the built site
 * (docs/plans/thresholds.md, phase 2 and "Round 1 with the owner"): the
 * row of the short title and the box, and the line of what it keeps
 * under it, which does not move the plot as it changes, at 1280 and 320
 * pixels; the line dragged with the mouse and the box and the words
 * following it; a number typed and the line following it, rounded to the
 * step of the axis; the keys of the line and of the box; a new file
 * starting them again; what is typed kept while a result so far widens
 * the axis; axe at each state.
 *
 * The counts are those of the core functions, `variantsAtMost` and
 * `individualsAtMost`, on popnei's numbers of panel.vcf.gz in
 * e2e/fixtures/threshold_counts.json, which make_fixtures.mjs wrote with
 * popnei 0.2.2 under node: the 1,000 fine bins that hold their right
 * edge of each statistic of the variants, whose sums below a threshold
 * are what popnei's filter keeps at it, and the value of each individual.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { individualsAtMost, variantsAtMost } from "../src/core/thresholds.ts";
import type { VariantStatistic } from "../src/core/analyses/variantChecks.ts";
import type { VariantStatsPart } from "../src/worker/protocol.ts";
import {
  keepsLine,
  thresholdValueText,
} from "../src/ui/variants/statsWords.ts";
import { announced, recordAnnouncements } from "./announced.ts";
import { expect, test } from "./axe.ts";
import { writeBigVcf } from "./bigVcf.ts";
import { holdSummary, release } from "./holdWorker.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The line under the box of a threshold of the variants raised to
    0.001. */
const RAISED_LINE = "Counted as 0.001, the smallest threshold.";

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

/** The line of what the threshold of the histogram of `statistic` of
    the variants keeps at `value`, from the core's counts. */
function variantWords(statistic: VariantStatistic, value: number): string {
  return keepsLine(variantsAtMost(PANEL.variants, statistic, value), "variant");
}

/** The line of what the threshold of the histogram of the missing rate of
    the individuals keeps at `value`, from the core's counts. */
function individualWords(value: number): string {
  const { kept, removed } = individualsAtMost(PANEL.missingGtRate, value);
  return keepsLine({ kept, withValue: kept + removed }, "individual");
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

/** The histogram titled `title`, its box, its line, its words and its
    dashed line. */
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
    words: group.getByText(/^Keeps |^No \w+ has a value/u),
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

test("TH2 at the start: the missing rate of the variants at 0.1, the five others at the top of their axis; each box after its short title and max:, named by those words and the full name, described by the line of what it keeps; and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPanel(page);
  const missing = histogram(page, "Proportion of missing genotypes");
  await expect(missing.words).toHaveText(variantWords("missingRate", 0.1), {
    timeout: 20_000,
  });
  await expect(missing.words).toHaveText("Keeps all 1,200 variants");
  await expect(missing.box).toHaveValue("0.1");
  // The name holds the words drawn, "Missing genotypes max:" (WCAG
  // 2.5.3), and goes on with the full name.
  const name = "Missing genotypes max: maximum proportion of missing genotypes";
  await expect(missing.box).toHaveAccessibleName(name);
  await expect(missing.slider).toHaveAccessibleName(name);
  await expect(missing.box).toHaveAccessibleDescription(
    "Keeps all 1,200 variants",
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
  await expect(expected.words).toHaveText("Keeps all 1,200 variants");
  await expect(expected.box).toHaveValue("0.55");
  await expect(expected.box).toHaveAccessibleName(
    "Exp. het. (unbiased) max: maximum expected heterozygosity (unbiased)",
  );
  await expect(expected.slider).toHaveAttribute(
    "aria-valuetext",
    "0.55, keeps all 1,200 variants",
  );
  const individuals = histogram(
    page,
    "Proportion of missing genotypes of each individual",
  );
  await expect(individuals.words).toHaveText(individualWords(0.045));
  await expect(individuals.box).toHaveValue("0.045");
  await expect(individuals.slider).toHaveAccessibleName(
    "Missing GTs max: maximum proportion of missing genotypes of an individual",
  );
  await expect(
    histogram(page, "Observed heterozygosity of each individual").words,
  ).toHaveText("Keeps all 200 individuals");
  await expect(page.getByText("Kept by this filter")).toHaveCount(0);
  await expect(page.getByText(/^Over [\d,]+ /u)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

/** The six groups of the histograms, by their full names. */
const GROUPS = [
  "Proportion of missing genotypes",
  "Major allele frequency",
  "Observed heterozygosity",
  "Expected heterozygosity (unbiased)",
  "Proportion of missing genotypes of each individual",
  "Observed heterozygosity of each individual",
] as const;

/** The short titles drawn before the boxes, in the order of `GROUPS`. */
const SHOWN = [
  "Missing genotypes\u00a0max:",
  "Major allele frequency\u00a0max:",
  "Obs. het.\u00a0max:",
  "Exp. het. (unbiased)\u00a0max:",
  "Missing GTs\u00a0max:",
  "Obs. het.\u00a0max:",
] as const;

for (const width of [1280, 320]) {
  test(`TH round 1 at ${String(width)} px: each head is one row, the short title, max: and the box; the line of what it keeps under it; the plot does not move as that line changes`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await openPanel(page);
    const missing = histogram(page, GROUPS[0]);
    await expect(missing.words).toHaveText("Keeps all 1,200 variants", {
      timeout: 20_000,
    });
    for (const [i, title] of GROUPS.entries()) {
      const { group, box, words } = histogram(page, title);
      const label = group.locator("label");
      // The words drawn: the hidden rest of the name takes no room.
      // The words drawn, before the hidden rest of the name.
      const visible = await label.evaluate(
        (element) => element.firstChild?.textContent ?? "",
      );
      expect(visible).toBe(SHOWN[i]);
      const labelBox = await label.boundingBox();
      const inputBox = await box.boundingBox();
      const wordsBox = await words.boundingBox();
      const plotBox = await group.locator("svg.chart").boundingBox();
      if (
        labelBox === null ||
        inputBox === null ||
        wordsBox === null ||
        plotBox === null
      ) {
        throw new Error(`${title} not drawn`);
      }
      // One row: the box beside the label, whose words may wrap at 320
      // pixels, its middle on the last line of the label, which ends with
      // "max:" and its word before.
      const lastLine = await label.evaluate((element) => {
        const text = element.firstChild;
        const content = text?.textContent ?? "";
        if (text === null || content === "") return null;
        const whole = document.createRange();
        whole.selectNodeContents(text);
        const last = [...whole.getClientRects()].at(-1);
        // The last word of the title and "max:".
        const tail = document.createRange();
        tail.setStart(
          text,
          content.lastIndexOf(" ", content.indexOf("max:") - 2) + 1,
        );
        tail.setEnd(text, content.length);
        return last === undefined
          ? null
          : {
              top: last.top,
              bottom: last.bottom,
              tailRects: tail.getClientRects().length,
            };
      });
      if (lastLine === null) throw new Error(`${title} has no label text`);
      // The last word and "max:" on one line.
      expect(lastLine.tailRects).toBe(1);
      const middle = inputBox.y + inputBox.height / 2;
      expect(middle).toBeGreaterThan(lastLine.top - 4);
      expect(middle).toBeLessThan(lastLine.bottom + 4);
      expect(inputBox.x).toBeGreaterThan(labelBox.x + labelBox.width - 1);
      // Nothing beyond the width of the page.
      expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(width);
      // The line under the row, the plot under the line.
      expect(wordsBox.y).toBeGreaterThanOrEqual(inputBox.y + inputBox.height);
      expect(plotBox.y).toBeGreaterThanOrEqual(wordsBox.y + wordsBox.height);
    }
    const plotTops = async (): Promise<number[]> =>
      Promise.all(
        GROUPS.slice(0, 4).map(async (title) => {
          const plot = await histogram(page, title)
            .group.locator("svg.chart")
            .boundingBox();
          return plot?.y ?? NaN;
        }),
      );
    const before = await plotTops();
    // A count of four digits, the longest line of the panel.
    await missing.box.fill("0.05");
    await missing.box.press("Enter");
    await expect(missing.words).toHaveText("Keeps 1,152 of 1,200 variants");
    expect(await plotTops()).toEqual(before);
    // The line holds the longest form, with "so far", in its room.
    const fits = await missing.words.evaluate((element) => {
      const room = element.getBoundingClientRect().height;
      const copy = element.cloneNode(false);
      if (!(copy instanceof HTMLElement)) return false;
      copy.textContent = "Keeps 1,152 of 1,200 variants so far";
      element.after(copy);
      const height = copy.getBoundingClientRect().height;
      copy.remove();
      return height <= room + 0.5;
    });
    expect(fits).toBe(true);
  });
}

test("TH2 the line dragged with the mouse: the box and the words follow it by the step of the axis, the dashed line of the plot under it, the counts the core's", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPanel(page);
  const het = histogram(page, "Observed heterozygosity");
  await expect(het.words).toHaveText("Keeps all 1,200 variants", {
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

  const text = await het.slider.inputValue();
  // The axis runs from 0 to 0.7, by 0.01: two decimals at most.
  expect(text).toMatch(/^0\.\d{1,2}$/u);
  const value = Number(text);
  expect(value).toBeGreaterThan(0);
  expect(value).toBeLessThan(0.7);
  await expect(het.box).toHaveValue(text);
  await expect(het.words).toHaveText(variantWords("obsHet", value));
  await expect(het.slider).toHaveAttribute(
    "aria-valuetext",
    thresholdValueText(
      value,
      variantsAtMost(PANEL.variants, "obsHet", value),
      "variant",
    ),
  );
  // The line the plot draws is under the thumb.
  expect(
    Math.abs((await middleX(het.dashed)) - (await middleX(het.thumb))),
  ).toBeLessThan(1.5);
  await expectNoViolations(makeAxeBuilder);
});

test("TH2 a number typed: the line follows it as it is typed, and at Enter it is rounded to the step of the axis, with no words; an arrow of the box one step; the count one number, what popnei's filter keeps; eleven decimals refused", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPanel(page);
  const het = histogram(page, "Observed heterozygosity");
  await expect(het.words).toHaveText("Keeps all 1,200 variants", {
    timeout: 20_000,
  });
  await het.box.fill("0.3");
  // Not committed yet: the line and the words follow the number typed.
  await expect(het.slider).toHaveValue("0.3");
  await expect(het.words).toHaveText(variantWords("obsHet", 0.3));
  await expect(het.words).toHaveText("Keeps 373 of 1,200 variants");
  expect(
    Math.abs((await middleX(het.dashed)) - (await middleX(het.thumb))),
  ).toBeLessThan(1.5);

  await het.box.fill("0.07");
  await het.box.press("Enter");
  await expect(het.box).toHaveValue("0.07");
  await expect(het.box).not.toHaveAttribute("aria-invalid", "true");
  await expect(het.slider).toHaveValue("0.07");
  await expect(het.words).toHaveText(variantWords("obsHet", 0.07));
  await expect(het.box).toHaveAccessibleDescription(
    variantWords("obsHet", 0.07),
  );
  await expectNoViolations(makeAxeBuilder);

  // Three decimals on an axis of two: rounded, and nothing said.
  await het.box.fill("0.334");
  await het.box.press("Enter");
  await expect(het.box).toHaveValue("0.33");
  await expect(het.slider).toHaveValue("0.33");
  await expect(het.words).toHaveText(variantWords("obsHet", 0.33));
  await expect(het.group.getByText(/counted as|rounded/u)).toHaveCount(0);

  // The Up arrow in the box: the next step, 0.34.
  await het.box.press("ArrowUp");
  await expect(het.box).toHaveValue("0.34");
  await expect(het.slider).toHaveValue("0.34");
  await expect(het.words).toHaveText(variantWords("obsHet", 0.34));

  // Eleven decimals are refused, and the threshold stays.
  await het.box.fill("0.12345678901");
  await het.box.press("Enter");
  await expect(
    het.group.getByText(
      "0.12345678901 has more than 10 decimals; the threshold stays 0.34.",
    ),
  ).toBeVisible();
  await expect(het.box).toHaveValue("0.34");
  await het.box.press("Escape");

  // The MAF at 0.52, the 49 variants popnei's filter keeps at it.
  const maf = histogram(page, "Major allele frequency");
  await maf.box.fill("0.52");
  await maf.box.press("Enter");
  await expect(maf.words).toHaveText("Keeps 49 of 1,200 variants");
  await expect(maf.words).toHaveText(variantWords("maf", 0.52));
  await expect(maf.slider).toHaveAttribute(
    "aria-valuetext",
    "0.52, keeps 49 of 1,200 variants",
  );

  // A threshold beyond the axis widens it, and the line goes with it.
  const missing = histogram(page, "Proportion of missing genotypes");
  await missing.box.fill("0.5");
  await missing.box.press("Enter");
  await expect(missing.slider).toHaveValue("0.5");
  await expect(missing.slider).toHaveAttribute("max", "0.5");
  await expect(missing.words).toHaveText("Keeps all 1,200 variants");
});

test("TH5 a number below 0.001 typed for the variants is raised to 0.001, said under the box and announced, and the plot does not move", async ({
  page,
  makeAxeBuilder,
}) => {
  await recordAnnouncements(page);
  await openPanel(page);
  const missing = histogram(page, "Proportion of missing genotypes");
  await expect(missing.words).toHaveText(variantWords("missingRate", 0.1), {
    timeout: 20_000,
  });
  const raised = missing.group.getByText(RAISED_LINE, { exact: true });
  const plotTop = async (): Promise<number> => {
    const box = await missing.group.locator("svg").first().boundingBox();
    if (box === null) throw new Error("the plot is not drawn");
    return box.y;
  };
  const before = await plotTop();
  await expect(raised).toHaveCount(0);

  await missing.box.fill("0");
  await missing.box.press("Enter");
  await expect(missing.box).toHaveValue("0.001");
  await expect(missing.slider).toHaveValue("0.001");
  await expect(missing.words).toHaveText("Keeps 2 of 1,200 variants");
  await expect(raised).toBeVisible();
  await expect(missing.box).toHaveAccessibleDescription(
    `Keeps 2 of 1,200 variants ${RAISED_LINE}`,
  );
  // Said alone, or after another text said within the pause of the
  // region.
  await expect
    .poll(async () =>
      (await announced(page)).some((text) => text.endsWith(RAISED_LINE)),
    )
    .toBe(true);
  expect(await plotTop()).toBe(before);
  await expectNoViolations(makeAxeBuilder);

  // A number the threshold is not raised from: the line goes, the plot
  // stays where it was.
  await missing.box.fill("0.05");
  await missing.box.press("Enter");
  await expect(missing.words).toHaveText("Keeps 1,152 of 1,200 variants");
  await expect(raised).toHaveCount(0);
  expect(await plotTop()).toBe(before);

  // 0.0004 is raised too; the line moved to 0.001 by Home is not, and
  // says nothing.
  await missing.box.fill("0.0004");
  await missing.box.press("Enter");
  await expect(missing.box).toHaveValue("0.001");
  await expect(raised).toBeVisible();
  await missing.slider.focus();
  await page.keyboard.press("End");
  await expect(missing.slider).toHaveValue("0.1");
  await expect(raised).toHaveCount(0);
  await page.keyboard.press("Home");
  await expect(missing.slider).toHaveValue("0.001");
  await expect(raised).toHaveCount(0);

  // The individuals' threshold takes 0 as it is.
  const individuals = histogram(
    page,
    "Proportion of missing genotypes of each individual",
  );
  await individuals.box.fill("0");
  await individuals.box.press("Enter");
  await expect(individuals.box).toHaveValue("0");
  await expect(individuals.words).toHaveText(individualWords(0));
  await expect(individuals.group.getByText(RAISED_LINE)).toHaveCount(0);
});

test("TH2 the keys of the line: an arrow one step of the axis, Page Up and Down ten, with Shift too, Shift and an arrow ten, Home and End the ends of the axis, Home at 0.001 for the variants", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPanel(page);
  const missing = histogram(page, "Proportion of missing genotypes");
  await expect(missing.words).toHaveText("Keeps all 1,200 variants", {
    timeout: 20_000,
  });
  // The axis runs from 0 to 0.1, by 0.001.
  await missing.slider.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(missing.slider).toHaveValue("0.099");
  await expect(missing.box).toHaveValue("0.099");
  await page.keyboard.press("PageDown");
  await expect(missing.slider).toHaveValue("0.089");
  for (let step = 0; step < 3; step += 1) {
    await page.keyboard.press("PageDown");
  }
  await expect(missing.slider).toHaveValue("0.059");
  for (let step = 0; step < 9; step += 1) {
    await page.keyboard.press("ArrowLeft");
  }
  // 0.05: the 1,152 variants popnei's filter keeps at it.
  await expect(missing.slider).toHaveValue("0.05");
  await expect(missing.box).toHaveValue("0.05");
  await expect(missing.words).toHaveText("Keeps 1,152 of 1,200 variants");
  await expect(missing.words).toHaveText(variantWords("missingRate", 0.05));
  await expect(missing.slider).toHaveAttribute(
    "aria-valuetext",
    "0.05, keeps 1,152 of 1,200 variants",
  );
  await expectNoViolations(makeAxeBuilder);
  // Home, the left end of the axis, 0, sets the least threshold of the
  // variants, 0.001: the first fine bin holds 0 and the values up to
  // 0.001, so the bins cannot count those at most 0.
  await page.keyboard.press("Home");
  await expect(missing.slider).toHaveValue("0.001");
  await expect(missing.box).toHaveValue("0.001");
  await expect(missing.words).toHaveText("Keeps 2 of 1,200 variants");
  await page.keyboard.press("PageUp");
  await expect(missing.slider).toHaveValue("0.011");
  // Shift with Page Up and Down, or with an arrow, ten steps too, and
  // not React Aria's tenth of the axis.
  await page.keyboard.press("Shift+PageUp");
  await expect(missing.slider).toHaveValue("0.021");
  await page.keyboard.press("Shift+ArrowRight");
  await expect(missing.slider).toHaveValue("0.031");
  await page.keyboard.press("Shift+ArrowUp");
  await expect(missing.slider).toHaveValue("0.041");
  await page.keyboard.press("Shift+ArrowLeft");
  await expect(missing.slider).toHaveValue("0.031");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(missing.slider).toHaveValue("0.021");
  await page.keyboard.press("Shift+PageDown");
  await expect(missing.slider).toHaveValue("0.011");
  await page.keyboard.press("End");
  await expect(missing.slider).toHaveValue("0.1");
  await page.keyboard.press("ArrowRight");
  await expect(missing.slider).toHaveValue("0.1");

  // The individuals, over 0 to 0.045 by 0.001.
  const individuals = histogram(
    page,
    "Proportion of missing genotypes of each individual",
  );
  await individuals.slider.focus();
  await page.keyboard.press("PageDown");
  await expect(individuals.box).toHaveValue("0.035");
  await page.keyboard.press("ArrowLeft");
  await expect(individuals.box).toHaveValue("0.034");
  await expect(individuals.words).toHaveText(individualWords(0.034));
});

test("TH2 another file starts the thresholds again", async ({ page }) => {
  await openPanel(page);
  const missing = histogram(page, "Proportion of missing genotypes");
  await expect(missing.words).toHaveText("Keeps all 1,200 variants", {
    timeout: 20_000,
  });
  await missing.box.fill("0.05");
  await missing.box.press("Enter");
  const het = histogram(page, "Observed heterozygosity");
  await het.box.fill("0.3");
  await het.box.press("Enter");
  await expect(het.box).toHaveValue("0.3");

  await pick(page, "panel.vcf.gz");
  await expect(missing.words).toHaveText("Keeps all 1,200 variants", {
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
  await expect(het.words).toHaveText(/^Keeps all [\d,]+ variants so far$/u, {
    timeout: 60_000,
  });
  await expect(het.slider).toHaveAttribute("aria-valuetext", /so far$/u);
  await het.slider.focus();
  // Home: the left end of the axis, below every variant read so far.
  await page.keyboard.press("Home");
  await expect(het.words).toHaveText(/^Keeps 0 of [\d,]+ variants so far$/u);
  const atHome = await het.box.inputValue();
  await expectNoViolations(makeAxeBuilder);

  // The result: the same threshold, its words no longer so far.
  await release(page, "result");
  await expect(het.words).toHaveText("Keeps 0 of 30,000 variants", {
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
  await expect(het.words).toHaveText(/^Keeps all [\d,]+ variants so far$/u, {
    timeout: 60_000,
  });
  const top = await het.box.inputValue();
  const wordsFirst = await het.words.innerText();

  await het.box.click();
  await het.box.press("ControlOrMeta+a");
  await page.keyboard.type("0.3");
  // Every other result so far, which read most of the file.
  await release(page, "allSoFar");
  // The plot drawn from more variants: the line counts more.
  await expect(het.words).not.toHaveText(wordsFirst);
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
  await expect(het.words).toHaveText(/^Keeps [\d,]+ of [\d,]+ variants$/u, {
    timeout: 60_000,
  });
  await expect(het.box).toHaveValue("0.3");
});

test("TH4 the keys of the box: from 0.11, beyond the bins, Down then Up returns to 0.11; after a number typed, the next key steps from the number the first one set", async ({
  page,
}) => {
  await openPanel(page);
  const missing = histogram(page, "Proportion of missing genotypes");
  await expect(missing.words).toHaveText("Keeps all 1,200 variants", {
    timeout: 20_000,
  });
  // The axis of the bins runs from 0 to 0.1, by 0.001; 0.11 widens it.
  await missing.box.fill("0.11");
  await missing.box.press("Enter");
  await expect(missing.box).toHaveValue("0.11");
  await missing.box.press("ArrowDown");
  await expect(missing.box).toHaveValue("0.109");
  await expect(missing.slider).toHaveValue("0.109");
  await missing.box.press("ArrowUp");
  await expect(missing.box).toHaveValue("0.11");
  await expect(missing.slider).toHaveValue("0.11");
  await missing.box.press("ArrowUp");
  await expect(missing.box).toHaveValue("0.111");

  // 0.11 set, 0.109 typed and not committed: Up sets 0.11, the number
  // set already, and the next Up steps from it, not from 0.109 again.
  await missing.box.press("ArrowDown");
  await missing.box.press("ArrowDown");
  await expect(missing.box).toHaveValue("0.109");
  await missing.box.fill("0.108");
  await expect(missing.slider).toHaveValue("0.108");
  await missing.box.press("ArrowUp");
  await expect(missing.slider).toHaveValue("0.109");
  await expect(missing.box).toHaveValue("0.109");
  await missing.box.press("ArrowUp");
  await expect(missing.slider).toHaveValue("0.11");
  await expect(missing.box).toHaveValue("0.11");
});

test("TH4 while a result so far widens an axis, a box with the focus and nothing typed follows the top of its axis, the number counted, and a number set stays as set", async ({
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
  await release(page, "oneSoFar");
  const het = histogram(page, "Observed heterozygosity");
  await expect(het.words).toHaveText(/^Keeps all [\d,]+ variants so far$/u, {
    timeout: 60_000,
  });
  // The first result so far: the axis of the observed heterozygosity of
  // the variants runs to 0.55, that of the individuals from 0.37 to
  // 0.415, by 0.001.
  await expect(het.box).toHaveValue("0.55");
  const individuals = histogram(
    page,
    "Observed heterozygosity of each individual",
  );
  await expect(individuals.slider).toHaveAttribute("step", "0.001");
  await individuals.box.fill("0.391");
  await individuals.box.press("Enter");
  await expect(individuals.box).toHaveValue("0.391");
  // The focus in the box of a threshold at the top of its axis, nothing
  // typed.
  await het.box.focus();

  // Every other result so far: the axis of the variants runs to 0.6, the
  // individuals' from 0.38 to 0.402.
  await release(page, "allSoFar");
  await expect(het.slider).toHaveValue("0.6", { timeout: 60_000 });
  await expect(het.box).toHaveValue("0.6");
  await expect(het.box).toBeFocused();
  await expect(het.slider).toHaveAttribute(
    "aria-valuetext",
    /^0\.6, keeps all [\d,]+ variants so far$/u,
  );
  await expect(individuals.slider).toHaveAttribute("max", "0.402");
  await expect(individuals.box).toHaveValue("0.391");
  await expect(individuals.slider).toHaveValue("0.391");
  await release(page, "result");
  await expect(het.words).toHaveText(/^Keeps all [\d,]+ variants$/u, {
    timeout: 60_000,
  });
  await expect(individuals.box).toHaveValue("0.391");
});

test("TH4 after a resize, the line of each threshold is over its dashed line in every frame the plots are drawn in", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPanel(page);
  const missing = histogram(page, GROUPS[0]);
  await expect(missing.words).toHaveText("Keeps all 1,200 variants", {
    timeout: 20_000,
  });
  // At each change of a plot, before the browser paints it, the distance
  // across from the middle of its thumb to its dashed line. Only the plot
  // that changed: the others are drawn again in the same frame, after.
  await page.evaluate(() => {
    const offsetOf = (group: Element): number | null => {
      const line = group.querySelector("line.chart-threshold");
      const thumb = group
        .querySelector('input[type="range"]')
        ?.closest('[class*="thumb"]');
      if (line === null || thumb === null || thumb === undefined) return null;
      const box = thumb.getBoundingClientRect();
      return box.x + box.width / 2 - line.getBoundingClientRect().x;
    };
    const seen: number[] = [];
    const observer = new MutationObserver((records) => {
      const groups = new Set(
        records.flatMap((record) => {
          const target =
            record.target instanceof Element
              ? record.target
              : record.target.parentElement;
          const group = target?.closest('[role="group"]');
          return group === null || group === undefined ? [] : [group];
        }),
      );
      for (const group of groups) {
        const offset = offsetOf(group);
        if (offset !== null) seen.push(offset);
      }
    });
    for (const svg of document.querySelectorAll("svg.chart")) {
      observer.observe(svg, { attributes: true, subtree: true });
    }
    Object.assign(window, { seenOffsets: seen });
  });
  // From two plots a row, 360 pixels wide, to one, 568 wide.
  await page.setViewportSize({ width: 600, height: 900 });
  // Every plot drawn again at the new width.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (Reflect.get(window, "seenOffsets") as number[] | undefined)
            ?.length ?? 0,
      ),
    )
    .toBeGreaterThan(5);
  await page.waitForTimeout(500);
  const seen = await page.evaluate(
    () => Reflect.get(window, "seenOffsets") as number[],
  );
  expect(Math.max(...seen.map(Math.abs))).toBeLessThan(1.5);
});

for (const width of [1280, 320]) {
  test(`TH4 at ${String(width)} px the plots do not move as the pass ends, nor as the line of a large count turns into a range`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
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
    await release(page, "allSoFar");
    const het = histogram(page, "Observed heterozygosity");
    await expect(het.words).toHaveText(/^Keeps all [\d,]+ variants so far$/u, {
      timeout: 60_000,
    });
    // The tops of the plots in the page, wherever it is scrolled to.
    const tops = async (): Promise<number[]> =>
      Promise.all(
        GROUPS.map(async (title) =>
          histogram(page, title)
            .group.locator("svg.chart")
            .evaluate(
              (svg) => svg.getBoundingClientRect().top + window.scrollY,
            ),
        ),
      );
    const before = await tops();
    // A count of five digits, the longest form of the line.
    await het.box.fill("0.33");
    await het.box.press("Enter");
    await expect(het.words).toHaveText(
      /^Keeps [\d,]{5,} of [\d,]+ variants so far$/u,
    );
    expect(await tops()).toEqual(before);
    await release(page, "result");
    await expect(het.words).not.toHaveText(/so far$/u, { timeout: 60_000 });
    // The line of the pass gone from sight, its room kept.
    await expect(
      page.getByText(/^Calculating the statistics/u).filter({ visible: true }),
    ).toHaveCount(0);
    expect(await tops()).toEqual(before);
  });
}
