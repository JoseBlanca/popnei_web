/**
 * The thresholds of popgen2.html as filters of the project, on the built
 * site (docs/plans/filters.md, work package 9;
 * docs/specs/steps/popgen2-filters.md, "A threshold, on and off", "When a
 * threshold changes the project", "The number box", "How it is
 * checked"): nothing sent to the worker after the one pass while a
 * threshold changes; a drag made a change at the release; off by an
 * emptied box, by 1 typed and by the line dragged to 1, in grey with the
 * words of off; on and grey at the top of an axis below 1; the grey's
 * pattern and its contrasts; 0 a filter at 0; Down from off; a run that
 * ends where it began; a crash while a run waits and during a drag; the
 * expected heterozygosity with no threshold; the thresholds through another file, also one dropped while
 * a run waits; no plot changed by any of it; axe in each look. The page
 * has no Undo since the owner's decision of 8 October 2026, and its keys
 * are in popgen2Undo.spec.ts.
 *
 * panel.vcf.gz and panel.nei hold the same 1,200 variants of 200 diploid
 * individuals, counted by popnei; panel.vcf.gz records the FILTER of its
 * variants, and panel.nei does not. The axes, from popnei's bins: the
 * missing rate of the variants from 0 to 0.1 by 0.001, which 0.1 keeps
 * whole, its largest value 0.08; the MAF from 0.45 to 1 by 0.01; the
 * observed heterozygosity from 0 to 0.7 by 0.01.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";
import { writeBigVcf } from "./bigVcf.ts";
import { dropFiles } from "./dropFiles.ts";
import { holdSummary, release } from "./holdWorker.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** What the page records, on `window`, of the messages it sends to its
    workers. */
const SENT = "__e2eSent";

/** Counts every message the page sends to a worker from now on, on
    `window[SENT]`. */
async function countSent(page: Page): Promise<void> {
  await page.addInitScript((name: string) => {
    const record = { sent: 0 };
    Object.defineProperty(window, name, { value: record });
    const prototype = window.Worker.prototype;
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with its worker, by apply
    const post = prototype.postMessage;
    prototype.postMessage = function (
      this: Worker,
      ...args: [message: unknown, options?: StructuredSerializeOptions]
    ) {
      record.sent += 1;
      post.apply(this, args);
    } as typeof prototype.postMessage;
  }, SENT);
}

/** The messages the page has sent to its workers. */
async function sentOf(page: Page): Promise<number> {
  return page.evaluate(
    (name) =>
      (Reflect.get(window, name) as { readonly sent: number } | undefined)
        ?.sent ?? -1,
    SENT,
  );
}

function stats(page: Page): Locator {
  return page.getByRole("region", { name: "Statistics of the file" });
}

/** Picks the fixture `name` with the open button. */
async function pick(page: Page, name: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: /^Open (another )?variants file…$/u })
    .click();
  await (await chooser).setFiles(join(FIXTURES, name));
}

/** Opens popgen2.html and the fixture `name`, and waits for its one pass
    to end, the download of the individuals' table its sign. */
async function openDone(page: Page, name: string): Promise<void> {
  await page.goto("popgen2.html");
  await pick(page, name);
  await expect(
    page.getByRole("button", {
      name: "Download the missing genotypes and heterozygosity of each individual (CSV)",
    }),
  ).toBeVisible({ timeout: 20_000 });
}

/** The histogram titled `title`: its group, its box, its line, the
    thumb of its line, the line its plot draws and its bars shaded as
    removed. */
function histogram(
  page: Page,
  title: string,
): {
  readonly group: Locator;
  readonly box: Locator;
  readonly slider: Locator;
  readonly thumb: Locator;
  readonly line: Locator;
  readonly removed: Locator;
} {
  const group = stats(page).getByRole("group", { name: title, exact: true });
  const slider = group.getByRole("slider");
  return {
    group,
    box: group.getByRole("textbox"),
    slider,
    // The input is in a hidden box inside the thumb.
    thumb: slider.locator("xpath=../.."),
    line: group.locator("line.chart-threshold"),
    removed: group.locator("rect.chart-bar-removed"),
  };
}

const MISSING = "Proportion of missing genotypes";
const MAF = "Major allele frequency";
const OBS_HET = "Observed heterozygosity";
const EXP_HET = "Expected heterozygosity (unbiased)";
const INDIVIDUAL_MISSING = "Proportion of missing genotypes of each individual";

/** Drags the thumb of `shown` by `dx` pixels across, with the mouse, in
    `steps` moves. */
async function drag(
  page: Page,
  shown: { readonly thumb: Locator },
  dx: number,
  steps = 8,
): Promise<void> {
  await shown.thumb.scrollIntoViewIfNeeded();
  const box = await shown.thumb.boundingBox();
  if (box === null) throw new Error("no thumb");
  const y = box.y + box.height / 2;
  const x = box.x + box.width / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps });
  await page.mouse.up();
}

/** Drags the thumb of `shown` by `dx` pixels across in a single move of
    the mouse, so that the first number the drag gives is already the
    end of the axis whatever the width of the plot: the box failed to
    follow a drag only then (commit 3f2a341). */
async function dragInOneMove(
  page: Page,
  shown: { readonly thumb: Locator },
  dx: number,
): Promise<void> {
  await drag(page, shown, dx, 1);
}

/** Expects `shown` off: 1 in its box, its line at `top`, the top of its
    axis, both in grey, no bar shaded, and the words of off. */
async function expectOff(
  shown: ReturnType<typeof histogram>,
  top: string,
  noun: "variant" | "individual",
): Promise<void> {
  await expect(shown.box).toHaveValue("1");
  await expect(shown.slider).toHaveValue(top);
  await expect(shown.slider).toHaveAttribute("max", top);
  await expect(shown.slider).toHaveAttribute(
    "aria-valuetext",
    `1, keeps every ${noun}`,
  );
  await expect(shown.box).toHaveAccessibleDescription(
    "This filter removes nothing.",
  );
  await expectGrey(shown, true);
  await expect(shown.removed).toHaveCount(0);
}

/** Expects the threshold of `shown` drawn in grey, its line dotted, its
    handle hollow and its number grey, when `grey`; red, dashed and
    filled otherwise. */
async function expectGrey(
  shown: ReturnType<typeof histogram>,
  grey: boolean,
): Promise<void> {
  const keepsAll = /\bchart-threshold-keeps-all\b/u;
  const mutedAround = shown.slider.locator("xpath=ancestor::*[@data-muted]");
  if (grey) {
    await expect(shown.line).toHaveClass(keepsAll);
    await expect(shown.box).toHaveAttribute("data-muted", "");
    await expect(mutedAround).toHaveCount(1);
  } else {
    await expect(shown.line).not.toHaveClass(keepsAll);
    await expect(shown.box).not.toHaveAttribute("data-muted");
    await expect(mutedAround).toHaveCount(0);
  }
}

/** The descriptions of the six plots, which say their bins: the same as
    long as no plot changes. */
async function plotDescriptions(page: Page): Promise<string[]> {
  return stats(page).locator("svg.chart desc").allTextContents();
}

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

test("SF9 D5 nothing is sent to the worker after the one pass while a threshold is dragged, typed, moved with the keys or turned off, and no plot changes", async ({
  page,
}) => {
  await countSent(page);
  await openDone(page, "panel.vcf.gz");
  const sent = await sentOf(page);
  expect(sent).toBeGreaterThan(0);
  const plots = await plotDescriptions(page);

  const het = histogram(page, OBS_HET);
  await drag(page, het, -140);
  await expect(het.box).not.toHaveValue("1");
  await het.box.fill("0.3");
  await het.box.press("Enter");
  const missing = histogram(page, MISSING);
  await missing.slider.focus();
  for (let press = 0; press < 5; press += 1) {
    await page.keyboard.press("ArrowLeft");
  }
  await page.keyboard.press("Tab");
  await expect(missing.box).toHaveValue("0.095");
  await het.box.fill("");
  await het.box.press("Tab");
  await expect(het.box).toHaveValue("1");

  expect(await sentOf(page)).toBe(sent);
  expect(await plotDescriptions(page)).toEqual(plots);
});

test("SF9 D5 a drag changes the threshold at the release: the box follows the line, which turns red and shades what it removes", async ({
  page,
  makeAxeBuilder,
}) => {
  await openDone(page, "panel.vcf.gz");
  const het = histogram(page, OBS_HET);
  await expectOff(het, "0.7", "variant");

  await het.thumb.scrollIntoViewIfNeeded();
  const box = await het.thumb.boundingBox();
  if (box === null) throw new Error("no thumb");
  const y = box.y + box.height / 2;
  const x = box.x + box.width / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 140, y, { steps: 8 });
  // Dragged, not yet let go: the box follows the line.
  const dragged = await het.slider.inputValue();
  expect(Number(dragged)).toBeLessThan(0.7);
  await expect(het.box).toHaveValue(dragged);
  await page.mouse.up();

  await expect(het.box).toHaveValue(dragged);
  await expect(het.slider).toHaveValue(dragged);
  await expectGrey(het, false);
  await expect(het.removed).not.toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("SF9 D5 emptying the box, typing 1 and dragging the MAF's line to 1 each turn the filter off, 1 in the box and the line at the top, grey, no shading, with the words of off; 0.9 typed turns it on again", async ({
  page,
  makeAxeBuilder,
}) => {
  await openDone(page, "panel.vcf.gz");
  const maf = histogram(page, MAF);
  await maf.box.fill("0.9");
  await maf.box.press("Enter");
  await expect(maf.box).toHaveValue("0.9");
  await expectGrey(maf, false);
  await expect(maf.slider).toHaveAttribute("aria-valuetext", "0.9");
  await expect(maf.box).toHaveAccessibleDescription("");
  await expect(maf.removed).not.toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  const backOn = async (): Promise<void> => {
    await maf.box.fill("0.9");
    await maf.box.press("Enter");
    await expect(maf.box).toHaveValue("0.9");
    await expect(maf.slider).toHaveValue("0.9");
    await expectGrey(maf, false);
  };

  // The box emptied, and Tab.
  await maf.box.fill("");
  await maf.box.press("Tab");
  await expectOff(maf, "1", "variant");
  await expectNoViolations(makeAxeBuilder);
  await backOn();

  // 1 typed.
  await maf.box.fill("1");
  await maf.box.press("Enter");
  await expectOff(maf, "1", "variant");
  await backOn();

  // The line dragged to the top of its axis, which ends at 1, straight
  // from 0.9 typed in the box, with the focus still in the box.
  await dragInOneMove(page, maf, 400);
  await expectOff(maf, "1", "variant");
  await backOn();

  // A number refused while off names 1, the number its box shows.
  await maf.box.fill("");
  await maf.box.press("Enter");
  await maf.box.fill("1.5");
  await maf.box.press("Enter");
  await expect(
    maf.group.getByText("1.5 is more than 1; the threshold stays 1."),
  ).toBeVisible();
});

test("SF9 D5 a number typed in the missing rate's box, then its line dragged to either end of its axis in one move: the box shows the end, 0.1 or 0", async ({
  page,
}) => {
  await openDone(page, "panel.vcf.gz");
  const missing = histogram(page, MISSING);
  await missing.box.fill("0.09");
  await missing.box.press("Enter");
  await dragInOneMove(page, missing, 400);
  await expect(missing.slider).toHaveValue("0.1");
  await expect(missing.box).toHaveValue("0.1");

  await missing.box.fill("0.01");
  await missing.box.press("Enter");
  await dragInOneMove(page, missing, -400);
  await expect(missing.slider).toHaveValue("0");
  await expect(missing.box).toHaveValue("0");
});

test("SF9 D5 on panel.nei the missing rate at 0.1, the top of its axis, is on and grey, with the words of the plot; at 0.05 it leaves the grey and the words; axe in each", async ({
  page,
  makeAxeBuilder,
}) => {
  await openDone(page, "panel.nei");
  const missing = histogram(page, MISSING);
  await expect(missing.box).toHaveValue("0.1");
  await expect(missing.slider).toHaveAttribute("max", "0.1");
  await expect(missing.slider).toHaveAttribute(
    "aria-valuetext",
    "0.1, keeps every variant of the plot",
  );
  await expect(missing.box).toHaveAccessibleDescription(
    "This filter removes no variant of the plot.",
  );
  await expectGrey(missing, true);
  await expect(missing.removed).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  await missing.box.fill("0.05");
  await missing.box.press("Enter");
  await expect(missing.slider).toHaveAttribute("aria-valuetext", "0.05");
  await expect(missing.box).toHaveAccessibleDescription("");
  await expectGrey(missing, false);
  await expect(missing.removed).not.toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

/** The relative luminance of the CSS colour `color`, "rgb(84, 117,
    140)", as WCAG 2.2 defines it. */
function luminance(color: string): number {
  const channels = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/u.exec(color);
  if (channels === null) throw new Error(`no colour in ${color}`);
  const [r, g, b] = channels.slice(1, 4).map((channel) => {
    const value = Number(channel) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? NaN) + 0.7152 * (g ?? NaN) + 0.0722 * (b ?? NaN);
}

/** The contrast of two CSS colours, from 1 to 21. */
function contrast(one: string, other: string): number {
  const [light, dark] = [luminance(one), luminance(other)].toSorted(
    (a, b) => b - a,
  );
  return ((light ?? NaN) + 0.05) / ((dark ?? NaN) + 0.05);
}

for (const scheme of ["light", "dark"] as const) {
  test(`SF9 D5 in the ${scheme} theme the grey's line is dotted and its handle hollow, the red's dashed and filled; the grey line is 3:1 against the plot and its number 4.5:1 against its box`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await openDone(page, "panel.vcf.gz");
    const maf = histogram(page, MAF);
    const missing = histogram(page, MISSING);
    await missing.box.fill("0.05");
    await missing.box.press("Enter");
    await expectGrey(maf, true);
    await expectGrey(missing, false);

    const lineLook = async (shown: ReturnType<typeof histogram>) =>
      shown.line.evaluate((line) => {
        const style = getComputedStyle(line);
        return { dashes: style.strokeDasharray, stroke: style.stroke };
      });
    const handleLook = async (shown: ReturnType<typeof histogram>) =>
      shown.thumb.evaluate((thumb) => {
        const style = getComputedStyle(thumb, "::before");
        return {
          fill: style.backgroundColor,
          border: style.borderTopColor,
          borderWidth: style.borderTopWidth,
        };
      });
    const background = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );

    const grey = await lineLook(maf);
    expect(grey.dashes.split(/[\s,]+/u).map(Number.parseFloat)).toEqual([1, 3]);
    expect(contrast(grey.stroke, background)).toBeGreaterThanOrEqual(3);
    const hollow = await handleLook(maf);
    expect(hollow.fill).toBe(background);
    expect(hollow.border).toBe(grey.stroke);
    expect(hollow.borderWidth).toBe("2px");

    const red = await lineLook(missing);
    expect(red.dashes.split(/[\s,]+/u).map(Number.parseFloat)).toEqual([4, 3]);
    const filled = await handleLook(missing);
    expect(filled.fill).toBe(red.stroke);

    const number = await maf.box.evaluate((input) => {
      const style = getComputedStyle(input);
      return { color: style.color, background: style.backgroundColor };
    });
    expect(number.color).toBe(grey.stroke);
    expect(contrast(number.color, number.background)).toBeGreaterThanOrEqual(
      4.5,
    );
  });
}

test("SF9 D5 0 typed is a filter at 0, with no words under its box", async ({
  page,
}) => {
  await openDone(page, "panel.vcf.gz");
  const missing = histogram(page, MISSING);
  await missing.box.fill("0");
  await missing.box.press("Enter");
  await expect(missing.box).toHaveValue("0");
  await expect(missing.slider).toHaveValue("0");
  await expect(missing.slider).toHaveAttribute("aria-valuetext", "0");
  await expect(missing.box).toHaveAccessibleDescription("");
  await expect(missing.group.locator("p")).toHaveCount(0);
  await expectGrey(missing, false);
});

test("SF9 D5 from off, Down in the box turns the filter on one step below the top of the axis, not at 1 less a step, and the axis keeps its range; Up leaves it off", async ({
  page,
}) => {
  await openDone(page, "panel.vcf.gz");
  const het = histogram(page, OBS_HET);
  await expectOff(het, "0.7", "variant");
  await het.box.press("ArrowUp");
  await het.box.press("PageUp");
  await expectOff(het, "0.7", "variant");
  await het.box.press("ArrowDown");
  await expect(het.box).toHaveValue("0.69");
  await expect(het.slider).toHaveValue("0.69");
  await expect(het.slider).toHaveAttribute("max", "0.7");
  await het.box.press("PageDown");
  await expect(het.box).toHaveValue("0.59");
  // The run made a change as the focus leaves.
  await het.box.press("Tab");
  await expect(het.box).toHaveValue("0.59");
  await expect(het.slider).toHaveValue("0.59");
  await expectGrey(het, false);
});

test("SF9 D5 a run of Down then Up on a line that is off leaves the filter off", async ({
  page,
}) => {
  await openDone(page, "panel.vcf.gz");
  const het = histogram(page, OBS_HET);
  await het.slider.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(het.slider).toHaveValue("0.69");
  await page.keyboard.press("ArrowRight");
  await expect(het.slider).toHaveValue("0.7");
  // The run ends as the focus leaves.
  await page.keyboard.press("Tab");
  await expectOff(het, "0.7", "variant");
});

test("SF9 D5 a crash of the worker while a run waits puts the focus on the heading", async ({
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
  const missing = histogram(page, MISSING);
  await expect(missing.box).toHaveValue("0.1", { timeout: 60_000 });
  await missing.slider.focus();
  for (let press = 0; press < 3; press += 1) {
    await page.keyboard.press("ArrowLeft");
  }
  await expect(missing.box).toHaveValue("0.097");
  await release(page, "crash");
  await expect(
    stats(page).getByText("Not calculated.", { exact: true }).first(),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
});

test("SF9 D5 a crash of the worker during a drag of a line takes the line away before the mouse is released, and the release after it changes nothing", async ({
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
  const missing = histogram(page, MISSING);
  await expect(missing.box).toHaveValue("0.1", { timeout: 60_000 });
  // The drag under way: the pointer down and moved, not released.
  await missing.thumb.scrollIntoViewIfNeeded();
  const box = await missing.thumb.boundingBox();
  if (box === null) throw new Error("no thumb");
  const y = box.y + box.height / 2;
  const x = box.x + box.width / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 60, y, { steps: 8 });
  await expect(missing.box).not.toHaveValue("0.1");
  await release(page, "crash");
  await expect(
    stats(page).getByText("Not calculated.", { exact: true }).first(),
  ).toBeVisible({ timeout: 20_000 });
  await expect(missing.slider).toHaveCount(0);
  await page.mouse.up();
  await expect(missing.slider).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("SF9 D5 the expected heterozygosity has its plot and title, and no line and no box", async ({
  page,
}) => {
  await openDone(page, "panel.vcf.gz");
  const expected = histogram(page, EXP_HET);
  await expect(expected.group.locator("svg.chart")).toHaveCount(1);
  await expect(
    expected.group.getByText("Exp. het. (unbiased)", { exact: true }),
  ).toBeVisible();
  await expect(expected.slider).toHaveCount(0);
  await expect(expected.box).toHaveCount(0);
  await expect(expected.line).toHaveCount(0);
});

test("SF9 D5 the thresholds stay through the opening of another file", async ({
  page,
}) => {
  await openDone(page, "panel.vcf.gz");
  const missing = histogram(page, MISSING);
  const maf = histogram(page, MAF);
  const individuals = histogram(page, INDIVIDUAL_MISSING);
  await missing.box.fill("0.05");
  await missing.box.press("Enter");
  await maf.box.fill("0.9");
  await maf.box.press("Enter");
  await individuals.box.fill("0.03");
  await individuals.box.press("Enter");
  await expect(individuals.box).toHaveValue("0.03");

  await pick(page, "panel.nei");
  await expect(
    page.getByRole("button", {
      name: "Download the missing genotypes and heterozygosity of each individual (CSV)",
    }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(missing.box).toHaveValue("0.05");
  await expect(maf.box).toHaveValue("0.9");
  await expect(individuals.box).toHaveValue("0.03");
  await expectOff(histogram(page, OBS_HET), "0.7", "variant");
});

test("SF9 D5 the MAF at 0.9 typed, kept through the opening of another file, then its line dragged in one move to the top of its axis with the focus in its box: the box shows 1, off", async ({
  page,
}) => {
  await openDone(page, "panel.vcf.gz");
  const maf = histogram(page, MAF);
  await maf.box.fill("0.9");
  await maf.box.press("Enter");
  await expect(maf.slider).toHaveValue("0.9");

  await pick(page, "panel.nei");
  await expect(
    page.getByRole("button", {
      name: "Download the missing genotypes and heterozygosity of each individual (CSV)",
    }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(maf.box).toHaveValue("0.9");
  await maf.box.focus();
  await dragInOneMove(page, maf, 400);
  await expectOff(maf, "1", "variant");
});

test("SF9 D5 a file dropped while a run of the keys waits opens with the threshold the run moved", async ({
  page,
}) => {
  await openDone(page, "panel.vcf.gz");
  const maf = histogram(page, MAF);
  await expectOff(maf, "1", "variant");
  // The page's timers stand still, so that the run still waits at the
  // drop, which does not move the focus.
  await page.clock.install();
  await page.clock.pauseAt(Date.now() + 1000);
  await maf.slider.focus();
  for (let press = 0; press < 5; press += 1) {
    await page.keyboard.press("ArrowLeft");
  }
  await expect(maf.box).toHaveValue("0.95");
  const nei = await readFile(join(FIXTURES, "panel.nei"));
  await dropFiles(
    page,
    page.getByRole("button", { name: "Open another variants file…" }),
    [{ name: "panel.nei", bytes: [...nei] }],
  );
  await page.clock.resume();
  await expect(
    page
      .getByRole("region", { name: "File information" })
      .getByText("panel.nei · 261 KB"),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole("button", {
      name: "Download the missing genotypes and heterozygosity of each individual (CSV)",
    }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(maf.box).toHaveValue("0.95");
  await expect(maf.slider).toHaveValue("0.95");
});

/** Three individuals and four variants, i3 with no called genotype: the
    worked example of individualChecks.md, as e2e/individualStats.spec.ts
    has it. */
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

test("SF9 D5 at 320 px the line of the individuals with no called genotype keeps the room of its longer words, so that nothing under it moves as the filter turns on and off", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("popgen2.html");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Open variants file…" }).click();
  await (
    await chooser
  ).setFiles({
    name: "calls.vcf",
    mimeType: "text/plain",
    buffer: Buffer.from(CALLS_VCF),
  });
  const download = page.getByRole("button", {
    name: "Download the missing genotypes and heterozygosity of each individual (CSV)",
  });
  await expect(download).toBeVisible({ timeout: 20_000 });
  const het = histogram(page, "Observed heterozygosity of each individual");
  const off = het.group
    .locator("xpath=..")
    .getByText(
      "1 individual with no called genotype is not in the histogram.",
      { exact: true },
    );
  await expect(off).toBeVisible();
  const top = (): Promise<number> =>
    download.evaluate(
      (element) => element.getBoundingClientRect().top + window.scrollY,
    );
  const before = await top();

  await het.box.fill("0.9");
  await het.box.press("Enter");
  await expect(
    het.group
      .locator("xpath=..")
      .getByText(
        "1 individual with no called genotype is not in the histogram, and this filter removes it.",
        { exact: true },
      ),
  ).toBeVisible();
  expect(await top()).toBe(before);

  await het.box.fill("");
  await het.box.press("Enter");
  await expect(off).toBeVisible();
  expect(await top()).toBe(before);
});
