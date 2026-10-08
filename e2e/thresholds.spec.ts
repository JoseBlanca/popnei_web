/**
 * The thresholds on the six histograms of popgen2.html, on the built site
 * (docs/plans/thresholds.md, phase 2 and "Round 1 with the owner";
 * docs/plans/popnei-0.2.2.md, "The owner's first round";
 * docs/specs/steps/popgen2-filters.md): the row of the short title and
 * the box over the plot, with no line of what the threshold keeps, at
 * 1280 and 320 pixels; the expected heterozygosity with no threshold; a
 * threshold that keeps every variant or individual of its plot, or is
 * off, drawn in grey, its line and the number in its box, and said in
 * words to a screen reader alone; the line dragged with the mouse and the
 * box following it; a number typed and the line following it, rounded to
 * the step of the axis, 0 among them; the keys of the line and of the
 * box; another file keeping them; what is typed kept while a result so
 * far widens the axis; axe at each state. The thresholds as filters of
 * the project, their Undo and their runs of the keys, are in
 * popgen2Thresholds.spec.ts.
 *
 * Whether a threshold keeps every variant is the core's,
 * `variantsAllKept`, on popnei's numbers of panel.vcf.gz in
 * e2e/fixtures/threshold_counts.json, which make_fixtures.mjs wrote with
 * popnei 0.2.2 under node: the 1,000 fine bins that hold their right
 * edge of each statistic of the variants.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import {
  variantThresholdLook,
  variantsAllKept,
} from "../src/core/thresholds.ts";
import type { VariantStatistic } from "../src/core/analyses/variantChecks.ts";
import type { VariantStatsPart } from "../src/worker/protocol.ts";
import { thresholdValueText } from "../src/ui/variants/statsWords.ts";
import { announced, recordAnnouncements } from "./announced.ts";
import { expect, test } from "./axe.ts";
import { writeBigVcf } from "./bigVcf.ts";
import { holdSummary, release } from "./holdWorker.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** What a screen reader hears of the box of a threshold of the variants
    on that keeps every variant of its plot. */
const REMOVES_NO_VARIANT = "This filter removes no variant of the plot.";

/** What a screen reader hears of the box of a threshold that is off. */
const REMOVES_NOTHING = "This filter removes nothing.";

/** The value of the line of the missing rate of the variants of
    panel.vcf.gz at the start, on at 0.1, which keeps every variant of its
    plot, whose largest missing rate is 0.08. */
const MISSING_AT_START = "0.1, keeps every variant of the plot";

/** The value of the line of a threshold of the variants that is off. */
const OFF_VARIANT = "1, keeps every variant";

/** popnei's fine bins of the variants of panel.vcf.gz in the fixture. */
const PANEL = panelOf(
  JSON.parse(
    readFileSync(join(FIXTURES, "threshold_counts.json"), "utf8"),
  ) as unknown,
);

/** The fine bins of the variants of panel.vcf.gz in the fixture
    `parsed`. */
function panelOf(parsed: unknown): VariantStatsPart {
  const file = fieldOf(parsed, "panel.vcf.gz");
  const counts = fieldOf(file, "counts");
  const distrib = (statistic: VariantStatistic) => ({
    mean: NaN,
    counts: Uint32Array.from(numbersOf(fieldOf(counts, statistic))),
  });
  return {
    binEdges: Float64Array.from(numbersOf(fieldOf(file, "binEdges"))),
    missingRate: distrib("missingRate"),
    maf: distrib("maf"),
    obsHet: distrib("obsHet"),
    unbiasedExpHet: distrib("unbiasedExpHet"),
    passStats: { numVars: 1200, filtering: {} },
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

/** What a screen reader hears as the value of the line of the threshold
    of `statistic` of the variants of panel.vcf.gz on at `value`: the
    number, and that it keeps every variant of the plot when the core
    says so. */
function variantValueText(statistic: VariantStatistic, value: number): string {
  return thresholdValueText(
    value,
    variantThresholdLook(PANEL, statistic, value, null),
    "variant",
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

/** The histogram titled `title`, its box, its line and its dashed
    line. */
function histogram(
  page: Page,
  title: string,
): {
  readonly group: Locator;
  readonly box: Locator;
  readonly slider: Locator;
  readonly thumb: Locator;
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
    dashed: group.locator("line.chart-threshold"),
  };
}

/** The middle of the box of `locator` across, in the page. */
async function middleX(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("not drawn");
  return box.x + box.width / 2;
}

/** The dashes of the line `dashed` as the browser computes them, in
    pixels: [4, 3] dashed, [1, 3] dotted. */
async function dashesOf(dashed: Locator): Promise<number[]> {
  const text = await dashed.evaluate(
    (element) => getComputedStyle(element).strokeDasharray,
  );
  return text
    .split(/[\s,]+/u)
    .filter((part) => part !== "")
    .map((part) => Number.parseFloat(part));
}

/** Expects the threshold of `histogram` drawn as one that keeps every
    value when `grey`, and as one that removes some otherwise: its line
    on the plot in the colour of such a threshold and dotted, the number
    in its box in that colour, and the handle and the line of its slider
    hollow and dotted, all of which come from the attribute data-muted of
    the box and of the element around the slider. */
async function expectGrey(
  shown: {
    readonly box: Locator;
    readonly dashed: Locator;
    readonly slider: Locator;
  },
  grey: boolean,
): Promise<void> {
  const keepsAll = /\bchart-threshold-keeps-all\b/u;
  const mutedAround = shown.slider.locator("xpath=ancestor::*[@data-muted]");
  if (grey) {
    await expect(shown.dashed).toHaveClass(keepsAll);
    await expect(shown.box).toHaveAttribute("data-muted", "");
    await expect(mutedAround).toHaveCount(1);
    expect(await dashesOf(shown.dashed)).toEqual([1, 3]);
  } else {
    await expect(shown.dashed).not.toHaveClass(keepsAll);
    await expect(shown.box).not.toHaveAttribute("data-muted");
    await expect(mutedAround).toHaveCount(0);
    expect(await dashesOf(shown.dashed)).toEqual([4, 3]);
  }
}

/** The download that comes with the result of the pass, and not with a
    result so far. */
function downloadOf(page: Page): Locator {
  return page.getByRole("button", {
    name: "Download the missing genotypes and heterozygosity of each individual (CSV)",
  });
}

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

test("TH2 at the start: the missing rate of the variants on at 0.1, grey, the four others off, 1 in their box and grey, which a screen reader hears; each box after its short title and max:, named by those words and the full name; the expected heterozygosity with no threshold; and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPanel(page);
  const missing = histogram(page, "Proportion of missing genotypes");
  // 0.1 keeps every variant of panel.vcf.gz, whose missing rates run to
  // 0.08.
  await expect(missing.slider).toHaveAttribute(
    "aria-valuetext",
    MISSING_AT_START,
    { timeout: 20_000 },
  );
  expect(variantValueText("missingRate", 0.1)).toBe(MISSING_AT_START);
  await expect(missing.box).toHaveValue("0.1");
  await expectGrey(missing, true);
  // The name holds the words drawn, "Missing genotypes max:" (WCAG
  // 2.5.3), and goes on with the full name.
  const name = "Missing genotypes max: maximum proportion of missing genotypes";
  await expect(missing.box).toHaveAccessibleName(name);
  await expect(missing.slider).toHaveAccessibleName(name);
  await expect(missing.box).toHaveAccessibleDescription(REMOVES_NO_VARIANT);
  // Said to a screen reader alone, through the box's description: the
  // words are hidden, neither drawn nor read again as loose text.
  await expect(missing.group.getByText(REMOVES_NO_VARIANT)).toBeHidden();
  await expect(page.getByText(/^Keeps /u)).toHaveCount(0);
  // The four others off: 1 in their box, their line at the top of their
  // axis, the MAF's at 1, the observed heterozygosity's at 0.7; the
  // individuals' at 0.045 and 0.4.
  for (const [title, top] of [
    ["Major allele frequency", "1"],
    ["Observed heterozygosity", "0.7"],
  ] as const) {
    const off = histogram(page, title);
    await expect(off.box).toHaveValue("1");
    await expect(off.slider).toHaveValue(top);
    await expect(off.slider).toHaveAttribute("aria-valuetext", OFF_VARIANT);
    await expect(off.box).toHaveAccessibleDescription(REMOVES_NOTHING);
    await expectGrey(off, true);
  }
  // The expected heterozygosity has no threshold.
  const expected = histogram(page, "Expected heterozygosity (unbiased)");
  await expect(expected.box).toHaveCount(0);
  await expect(expected.slider).toHaveCount(0);
  const individuals = histogram(
    page,
    "Proportion of missing genotypes of each individual",
  );
  await expect(individuals.box).toHaveValue("1");
  await expect(individuals.slider).toHaveValue("0.045");
  await expectGrey(individuals, true);
  await expect(individuals.box).toHaveAccessibleDescription(REMOVES_NOTHING);
  await expect(individuals.slider).toHaveAttribute(
    "aria-valuetext",
    "1, keeps every individual",
  );
  await expect(individuals.slider).toHaveAccessibleName(
    "Missing GTs max: maximum proportion of missing genotypes of an individual",
  );
  await expectGrey(
    histogram(page, "Observed heterozygosity of each individual"),
    true,
  );
  await expect(page.getByText("Kept by this filter")).toHaveCount(0);
  await expect(page.getByText(/^Over [\d,]+ /u)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

/** The five groups of the histograms with a threshold, by their full
    names; the expected heterozygosity has none. */
const GROUPS = [
  "Proportion of missing genotypes",
  "Major allele frequency",
  "Observed heterozygosity",
  "Proportion of missing genotypes of each individual",
  "Observed heterozygosity of each individual",
] as const;

/** The six groups of the histograms, the expected heterozygosity among
    them. */
const ALL_GROUPS = [
  ...GROUPS.slice(0, 3),
  "Expected heterozygosity (unbiased)",
  ...GROUPS.slice(3),
] as const;

/** The short titles drawn before the boxes, in the order of `GROUPS`. */
const SHOWN = [
  "Missing genotypes\u00a0max:",
  "Major allele frequency\u00a0max:",
  "Obs. het.\u00a0max:",
  "Missing GTs\u00a0max:",
  "Obs. het.\u00a0max:",
] as const;

for (const width of [1280, 320]) {
  test(`TH round 1 at ${String(width)} px: each head is one row, the short title, max: and the box, with the plot under it; the plot does not move as a threshold turns from grey to red`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await openPanel(page);
    const missing = histogram(page, GROUPS[0]);
    await expect(missing.slider).toHaveAttribute(
      "aria-valuetext",
      MISSING_AT_START,
      { timeout: 20_000 },
    );
    for (const [i, title] of GROUPS.entries()) {
      const { group, box } = histogram(page, title);
      const label = group.locator("label");
      // The words drawn: the hidden rest of the name takes no room.
      // The words drawn, before the hidden rest of the name.
      const visible = await label.evaluate(
        (element) => element.firstChild?.textContent ?? "",
      );
      expect(visible).toBe(SHOWN[i]);
      const labelBox = await label.boundingBox();
      const inputBox = await box.boundingBox();
      const plotBox = await group.locator("svg.chart").boundingBox();
      if (labelBox === null || inputBox === null || plotBox === null) {
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
      // The plot under the row, with no line of words between them: the
      // gap of the group, 8 pixels.
      const gap = plotBox.y - (inputBox.y + inputBox.height);
      expect(gap).toBeGreaterThanOrEqual(0);
      expect(gap).toBeLessThan(12);
    }
    const plotTops = async (): Promise<number[]> =>
      Promise.all(
        ALL_GROUPS.slice(0, 4).map(async (title) => {
          const plot = await histogram(page, title)
            .group.locator("svg.chart")
            .boundingBox();
          return plot?.y ?? NaN;
        }),
      );
    const before = await plotTops();
    // From grey to red, and back.
    await missing.box.fill("0.05");
    await missing.box.press("Enter");
    await expectGrey(missing, false);
    expect(await plotTops()).toEqual(before);
    await missing.box.fill("0.1");
    await missing.box.press("Enter");
    await expectGrey(missing, true);
    expect(await plotTops()).toEqual(before);
  });
}

test("TH2 the line dragged with the mouse: the box follows it by the step of the axis, the dashed line of the plot under it, red once it removes variants, as the core says", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPanel(page);
  const het = histogram(page, "Observed heterozygosity");
  await expect(het.slider).toHaveAttribute("aria-valuetext", OFF_VARIANT, {
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
  await expect(het.slider).toHaveAttribute(
    "aria-valuetext",
    variantValueText("obsHet", value),
  );
  await expectGrey(het, variantsAllKept(PANEL, "obsHet", value, null));
  // The line the plot draws is under the thumb.
  expect(
    Math.abs((await middleX(het.dashed)) - (await middleX(het.thumb))),
  ).toBeLessThan(1.5);
  await expectNoViolations(makeAxeBuilder);
});

test("TH2 a number typed: the line follows it as it is typed, and at Enter it is rounded to the step of the axis, with no words; an arrow of the box one step; grey where it keeps every variant, as the core says; eleven decimals refused", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPanel(page);
  const het = histogram(page, "Observed heterozygosity");
  await expect(het.slider).toHaveAttribute("aria-valuetext", OFF_VARIANT, {
    timeout: 20_000,
  });
  await het.box.fill("0.3");
  // Not committed yet: the line follows the number typed, red, since 0.3
  // removes 827 variants of 1,200.
  await expect(het.slider).toHaveValue("0.3");
  await expect(het.slider).toHaveAttribute("aria-valuetext", "0.3");
  expect(variantValueText("obsHet", 0.3)).toBe("0.3");
  await expectGrey(het, false);
  expect(
    Math.abs((await middleX(het.dashed)) - (await middleX(het.thumb))),
  ).toBeLessThan(1.5);

  await het.box.fill("0.07");
  await het.box.press("Enter");
  await expect(het.box).toHaveValue("0.07");
  await expect(het.box).not.toHaveAttribute("aria-invalid", "true");
  await expect(het.slider).toHaveValue("0.07");
  await expect(het.slider).toHaveAttribute("aria-valuetext", "0.07");
  await expect(het.box).toHaveAccessibleDescription("");
  await expectNoViolations(makeAxeBuilder);

  // Three decimals on an axis of two: rounded, and nothing said.
  await het.box.fill("0.334");
  await het.box.press("Enter");
  await expect(het.box).toHaveValue("0.33");
  await expect(het.slider).toHaveValue("0.33");
  await expect(het.group.getByText(/counted as|rounded/u)).toHaveCount(0);

  // The Up arrow in the box: the next step, 0.34.
  await het.box.press("ArrowUp");
  await expect(het.box).toHaveValue("0.34");
  await expect(het.slider).toHaveValue("0.34");

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

  // The MAF at 0.52, which keeps 49 variants: red, the number alone.
  const maf = histogram(page, "Major allele frequency");
  await maf.box.fill("0.52");
  await maf.box.press("Enter");
  await expect(maf.slider).toHaveAttribute("aria-valuetext", "0.52");
  await expectGrey(maf, false);

  // A threshold beyond the axis widens it, and the line goes with it,
  // grey.
  const missing = histogram(page, "Proportion of missing genotypes");
  await missing.box.fill("0.5");
  await missing.box.press("Enter");
  await expect(missing.slider).toHaveValue("0.5");
  await expect(missing.slider).toHaveAttribute("max", "0.5");
  await expect(missing.slider).toHaveAttribute(
    "aria-valuetext",
    "0.5, keeps every variant of the plot",
  );
  await expectGrey(missing, true);
});

test("SF9 D5 a number committed in the box, or a run of the keys made a change, that turns the threshold on, grey or off is announced once; a change that keeps the look, and each press, are not", async ({
  page,
}) => {
  await recordAnnouncements(page);
  await openPanel(page);
  const missing = histogram(page, "Proportion of missing genotypes");
  await expect(missing.slider).toHaveAttribute(
    "aria-valuetext",
    MISSING_AT_START,
    { timeout: 20_000 },
  );
  // The end of the pass is announced too: its result waited for, and the
  // texts said from here looked at.
  await expect(downloadOf(page)).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(async () => (await announced(page)).join(" "))
    .toContain("The statistics of panel.vcf.gz are calculated.");
  const start = (await announced(page)).length;
  const said = async (): Promise<readonly string[]> =>
    (await announced(page)).slice(start);

  // Grey to on by Enter: the number alone.
  await missing.box.fill("0.05");
  await missing.box.press("Enter");
  await expectGrey(missing, false);
  await expect.poll(said).toEqual(["0.05"]);
  // On to on: nothing.
  await missing.box.fill("0.04");
  await missing.box.press("Enter");
  // On to grey by leaving the box: the box's description in the grey.
  await missing.box.fill("0.09");
  await missing.box.press("Tab");
  await expectGrey(missing, true);
  await expect(missing.box).toHaveAccessibleDescription(REMOVES_NO_VARIANT);
  await expect.poll(said).toEqual(["0.05", REMOVES_NO_VARIANT]);

  // Grey to on by a run of the line: nothing at the presses, the number
  // once the run is a change, at the focus leaving it.
  await missing.slider.focus();
  // 0.08 keeps the variant with 16 of 200 genotypes missing; 0.07 not.
  await page.keyboard.press("PageDown");
  await page.keyboard.press("PageDown");
  await expectGrey(missing, false);
  await expect(missing.slider).toHaveAttribute("aria-valuetext", "0.07");
  await page.keyboard.press("Tab");
  await expect.poll(said).toEqual(["0.05", REMOVES_NO_VARIANT, "0.07"]);
  // A run that keeps the look: nothing.
  await missing.slider.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(missing.slider).toHaveValue("0.069");
  await page.keyboard.press("Tab");

  // On to off by an emptied box.
  await missing.box.fill("");
  await missing.box.press("Enter");
  await expect(missing.box).toHaveValue("1");
  await expect
    .poll(said)
    .toEqual(["0.05", REMOVES_NO_VARIANT, "0.07", REMOVES_NOTHING]);
});

test("TH5 the owner's first round: 0 typed for the variants is a threshold of 0, with nothing said, red where some variant has a value above it; the plot does not move", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPanel(page);
  const missing = histogram(page, "Proportion of missing genotypes");
  await expect(missing.slider).toHaveAttribute(
    "aria-valuetext",
    MISSING_AT_START,
    { timeout: 20_000 },
  );
  const plotTop = async (): Promise<number> => {
    const box = await missing.group.locator("svg").first().boundingBox();
    if (box === null) throw new Error("the plot is not drawn");
    return box.y;
  };
  const before = await plotTop();

  await missing.box.fill("0");
  await missing.box.press("Enter");
  await expect(missing.box).toHaveValue("0");
  await expect(missing.slider).toHaveValue("0");
  // 2 variants of panel.vcf.gz have no missing genotype, 1,198 some.
  await expect(missing.slider).toHaveAttribute("aria-valuetext", "0");
  await expectGrey(missing, false);
  await expect(missing.group.getByText(/counted as|smallest/iu)).toHaveCount(0);
  expect(await plotTop()).toBe(before);
  await expectNoViolations(makeAxeBuilder);

  // 0.0004 is 0 on the step of the axis, 0.001.
  await missing.box.fill("0.0004");
  await missing.box.press("Enter");
  await expect(missing.box).toHaveValue("0");
  await missing.slider.focus();
  await page.keyboard.press("End");
  await expect(missing.slider).toHaveValue("0.1");
  await page.keyboard.press("Home");
  await expect(missing.slider).toHaveValue("0");
  await expect(missing.box).toHaveValue("0");

  // The individuals' threshold takes 0 as it is.
  const individuals = histogram(
    page,
    "Proportion of missing genotypes of each individual",
  );
  await individuals.box.fill("0");
  await individuals.box.press("Enter");
  await expect(individuals.box).toHaveValue("0");
  await expect(individuals.slider).toHaveAttribute("aria-valuetext", "0");
  await expectGrey(individuals, false);
});

test("TH2 the keys of the line: an arrow one step of the axis, Page Up and Down ten, with Shift too, Shift and an arrow ten, Home and End the ends of the axis, Home at 0", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPanel(page);
  const missing = histogram(page, "Proportion of missing genotypes");
  await expect(missing.slider).toHaveAttribute(
    "aria-valuetext",
    MISSING_AT_START,
    { timeout: 20_000 },
  );
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
  // 0.05, which removes 48 variants: red, the number alone.
  await expect(missing.slider).toHaveValue("0.05");
  await expect(missing.box).toHaveValue("0.05");
  await expect(missing.slider).toHaveAttribute("aria-valuetext", "0.05");
  await expectGrey(missing, false);
  await expectNoViolations(makeAxeBuilder);
  // Home, the left end of the axis, 0, a threshold as any other.
  await page.keyboard.press("Home");
  await expect(missing.slider).toHaveValue("0");
  await expect(missing.box).toHaveValue("0");
  await page.keyboard.press("PageUp");
  await expect(missing.slider).toHaveValue("0.01");
  // Shift with Page Up and Down, or with an arrow, ten steps too, and
  // not React Aria's tenth of the axis.
  await page.keyboard.press("Shift+PageUp");
  await expect(missing.slider).toHaveValue("0.02");
  await page.keyboard.press("Shift+ArrowRight");
  await expect(missing.slider).toHaveValue("0.03");
  await page.keyboard.press("Shift+ArrowUp");
  await expect(missing.slider).toHaveValue("0.04");
  await page.keyboard.press("Shift+ArrowLeft");
  await expect(missing.slider).toHaveValue("0.03");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(missing.slider).toHaveValue("0.02");
  await page.keyboard.press("Shift+PageDown");
  await expect(missing.slider).toHaveValue("0.01");
  await page.keyboard.press("End");
  await expect(missing.slider).toHaveValue("0.1");
  await expectGrey(missing, true);
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
  // The largest missing rate of an individual of panel.vcf.gz is 0.0442.
  await expect(individuals.slider).toHaveAttribute("aria-valuetext", "0.034");
  await expectGrey(individuals, false);
});

test("SF9 D5 another file keeps the thresholds as the user left them", async ({
  page,
}) => {
  await openPanel(page);
  const missing = histogram(page, "Proportion of missing genotypes");
  await expect(missing.slider).toHaveAttribute(
    "aria-valuetext",
    MISSING_AT_START,
    { timeout: 20_000 },
  );
  await missing.box.fill("0.05");
  await missing.box.press("Enter");
  const het = histogram(page, "Observed heterozygosity");
  await het.box.fill("0.3");
  await het.box.press("Enter");
  await expect(het.box).toHaveValue("0.3");

  await expectGrey(missing, false);

  await pick(page, "panel.vcf.gz");
  await expect(downloadOf(page)).toBeVisible({ timeout: 20_000 });
  await expect(missing.box).toHaveValue("0.05");
  await expect(missing.slider).toHaveAttribute("aria-valuetext", "0.05");
  await expectGrey(missing, false);
  await expect(het.box).toHaveValue("0.3");
});

test("TH2 while the pass runs a threshold that is off says so, and a threshold moved then stays at the end", async ({
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
  await expect(het.slider).toHaveAttribute("aria-valuetext", OFF_VARIANT, {
    timeout: 60_000,
  });
  await expect(het.box).toHaveAccessibleDescription(REMOVES_NOTHING);
  await expectGrey(het, true);
  await het.slider.focus();
  // Home: the left end of the axis, below every variant read so far.
  await page.keyboard.press("Home");
  const atHome = await het.box.inputValue();
  await expect(het.slider).toHaveAttribute("aria-valuetext", atHome);
  await expectGrey(het, false);
  await expectNoViolations(makeAxeBuilder);

  // The result: the same threshold.
  await release(page, "result");
  await expect(downloadOf(page)).toBeVisible({ timeout: 60_000 });
  await expect(het.box).toHaveValue(atHome);
  await expect(het.slider).toHaveAttribute("aria-valuetext", atHome);
});

test("TH2 a number typed in the box of a threshold that is off is kept while a result so far widens the axis", async ({
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
  // The first result so far: the threshold off, its line at the top of
  // its axis, 1 in its box.
  await release(page, "oneSoFar");
  const het = histogram(page, "Observed heterozygosity");
  await expect(het.slider).toHaveAttribute("aria-valuetext", OFF_VARIANT, {
    timeout: 60_000,
  });
  await expect(het.box).toHaveValue("1");
  const maxFirst = await het.slider.getAttribute("max");

  await het.box.click();
  await het.box.press("ControlOrMeta+a");
  await page.keyboard.type("0.3");
  // Every other result so far, which read most of the file.
  await release(page, "allSoFar");
  // The plot drawn from more variants: its axis wider.
  await expect(het.slider).not.toHaveAttribute("max", maxFirst ?? "");
  await expect(het.box).toHaveValue("0.3");
  await expect(het.box).toBeFocused();
  // Escape puts back what the box holds, 1, and leaving it changes
  // nothing.
  await het.box.press("Escape");
  await expect(het.box).toHaveValue("1");
  await het.box.blur();
  await expect(het.box).toHaveValue("1");
  // Typed again and committed, it stays at the result.
  await het.box.fill("0.3");
  await het.box.press("Enter");
  await release(page, "result");
  await expect(downloadOf(page)).toBeVisible({ timeout: 60_000 });
  await expect(het.box).toHaveValue("0.3");
});

test("TH4 the keys of the box: from 0.11, beyond the bins, Down then Up returns to 0.11; after a number typed, the next key steps from the number the first one set", async ({
  page,
}) => {
  await openPanel(page);
  const missing = histogram(page, "Proportion of missing genotypes");
  await expect(missing.slider).toHaveAttribute(
    "aria-valuetext",
    MISSING_AT_START,
    { timeout: 20_000 },
  );
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

test("TH4 while a result so far widens an axis, the line of a threshold that is off follows the top of its axis, its box with the focus showing 1, and a number set stays as set", async ({
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
  await expect(het.slider).toHaveAttribute("aria-valuetext", OFF_VARIANT, {
    timeout: 60_000,
  });
  // The first result so far: the axis of the observed heterozygosity of
  // the variants runs to 0.55, that of the individuals from 0.37 to
  // 0.415, by 0.001.
  await expect(het.slider).toHaveValue("0.55");
  await expect(het.box).toHaveValue("1");
  const individuals = histogram(
    page,
    "Observed heterozygosity of each individual",
  );
  await expect(individuals.slider).toHaveAttribute("step", "0.001");
  await individuals.box.fill("0.391");
  await individuals.box.press("Enter");
  await expect(individuals.box).toHaveValue("0.391");
  // The focus in the box of a threshold that is off, nothing typed.
  await het.box.focus();

  // Every other result so far: the axis of the variants runs to 0.6, the
  // individuals' from 0.38 to 0.402.
  await release(page, "allSoFar");
  await expect(het.slider).toHaveValue("0.6", { timeout: 60_000 });
  await expect(het.box).toHaveValue("1");
  await expect(het.box).toBeFocused();
  await expect(het.slider).toHaveAttribute("aria-valuetext", OFF_VARIANT);
  await expect(individuals.slider).toHaveAttribute("max", "0.402");
  await expect(individuals.box).toHaveValue("0.391");
  await expect(individuals.slider).toHaveValue("0.391");
  await release(page, "result");
  await expect(downloadOf(page)).toBeVisible({ timeout: 60_000 });
  await expect(het.slider).toHaveAttribute("aria-valuetext", OFF_VARIANT);
  await expect(individuals.box).toHaveValue("0.391");
});

test("TH4 after a resize, the line of each threshold is over its dashed line in every frame the plots are drawn in", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPanel(page);
  const missing = histogram(page, GROUPS[0]);
  await expect(missing.slider).toHaveAttribute(
    "aria-valuetext",
    MISSING_AT_START,
    { timeout: 20_000 },
  );
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
  // Every plot with a threshold, five, drawn again at the new width.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (Reflect.get(window, "seenOffsets") as number[] | undefined)
            ?.length ?? 0,
      ),
    )
    .toBeGreaterThan(4);
  await page.waitForTimeout(500);
  const seen = await page.evaluate(
    () => Reflect.get(window, "seenOffsets") as number[],
  );
  expect(Math.max(...seen.map(Math.abs))).toBeLessThan(1.5);
});

for (const width of [1280, 320]) {
  test(`TH4 at ${String(width)} px the plots do not move as the pass ends, nor as a threshold turns from grey to red`, async ({
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
    await expect(het.slider).toHaveAttribute("aria-valuetext", OFF_VARIANT, {
      timeout: 60_000,
    });
    // The tops of the plots in the page, wherever it is scrolled to.
    const tops = async (): Promise<number[]> =>
      Promise.all(
        ALL_GROUPS.map(async (title) =>
          histogram(page, title)
            .group.locator("svg.chart")
            .evaluate(
              (svg) => svg.getBoundingClientRect().top + window.scrollY,
            ),
        ),
      );
    const before = await tops();
    await het.box.fill("0.33");
    await het.box.press("Enter");
    await expect(het.slider).toHaveAttribute("aria-valuetext", "0.33");
    await expectGrey(het, false);
    expect(await tops()).toEqual(before);
    await release(page, "result");
    await expect(downloadOf(page)).toBeVisible({ timeout: 60_000 });
    // The line of the pass gone from sight, its room kept.
    await expect(
      page.getByText(/^Calculating the statistics/u).filter({ visible: true }),
    ).toHaveCount(0);
    expect(await tops()).toEqual(before);
  });
}
