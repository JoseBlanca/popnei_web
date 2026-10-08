/**
 * The plots after a Stop on popgen2.html, on the built site
 * (docs/plans/filters.md, work package 10;
 * docs/specs/steps/popgen2-filters.md, "The plots after a Stop"): after a
 * Stop that comes once the one pass gave a result so far, the plots of
 * the variants read before it stay where they were, each part saying so,
 * and a threshold moved over them changes the project, its grey of the
 * variants read; Start again drops them and reads the file again;
 * another file drops them; a Stop before the first result so far leaves
 * no plots and the words of before; a failure after Start again shows no
 * plot of the Stop. A failure of the pass being stopped, which drops them
 * too, cannot happen here, since the worker client ends a stopped request
 * at once as cancelled; src/ui/variants/StatsSection.test.ts makes it.
 *
 * The VCF is written by the flow, 30,000 variants in six blocks of
 * popnei in the browser, 5,000 each, whose results so far and result the
 * worker holds until the flow lets them through (holdWorker.ts): one
 * result so far let through is of the first block alone.
 */
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";
import { writeBigVcf } from "./bigVcf.ts";
import { holdSummary, release } from "./holdWorker.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The variants of the VCF of the flows. */
const NUM_VARIANTS = 30_000;

/** What each part says over the plots read before a Stop. */
const STOPPED_WITH_PLOTS =
  "Stopped. The plots are of the variants read before the Stop. Start again reads the file from the start.";

/** What each part says after a Stop with no plots. */
const STOPPED = "Stopped. Start again reads the file from the start.";

function stats(page: Page): Locator {
  return page.getByRole("region", { name: "Statistics of the file" });
}

function info(page: Page): Locator {
  return page.getByRole("region", { name: "File information" });
}

/** The part of the section under the heading `name`. */
function part(page: Page, name: "Variants" | "Individuals"): Locator {
  return stats(page)
    .getByRole("heading", { level: 2, name })
    .locator("xpath=..");
}

function undoButton(page: Page): Locator {
  return page
    .getByRole("main")
    .getByRole("button", { name: "Undo", exact: true });
}

function downloadButton(page: Page): Locator {
  return stats(page).getByRole("button", {
    name: "Download the missing genotypes and heterozygosity of each individual (CSV)",
  });
}

/** Picks `path` with the open button. */
async function pick(page: Page, path: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: /^Open (another )?variants file…$/u })
    .click();
  await (await chooser).setFiles(path);
}

/** Opens popgen2.html, its pass held, and the VCF of the flow, written
    into the test's folder, and waits for the bar of the pass. */
async function openHeld(
  page: Page,
  vcf: string,
  width: number | null = null,
): Promise<void> {
  await writeBigVcf(vcf, NUM_VARIANTS);
  await holdSummary(page);
  if (width !== null) await page.setViewportSize({ width, height: 900 });
  await page.goto("popgen2.html");
  await pick(page, vcf);
  await expect(
    info(page).getByRole("progressbar", {
      name: "Counting the variants",
      exact: true,
    }),
  ).toBeVisible({ timeout: 60_000 });
}

/** Lets the first result so far through, and waits for its six plots. */
async function firstPlots(page: Page): Promise<void> {
  await release(page, "oneSoFar");
  await expect(stats(page).locator("svg.chart")).toHaveCount(6, {
    timeout: 60_000,
  });
}

/** Presses the Stop of the box of the file. */
async function stop(page: Page): Promise<void> {
  await info(page).getByRole("button", { name: "Stop" }).click();
  await expect(
    info(page).getByRole("button", { name: "Start again" }),
  ).toBeFocused();
}

/** Where the six plots, the heading of the individuals, the FILTER box
    and the open button are in the window, to the pixel, their top and
    their left; the flows do not scroll. */
async function places(page: Page): Promise<readonly number[]> {
  const elements = [
    ...(await stats(page).locator("svg.chart").all()),
    stats(page).getByRole("heading", { level: 2, name: "Individuals" }),
    stats(page).getByRole("checkbox"),
    page.getByRole("button", { name: /^Open (another )?variants file…$/u }),
  ];
  const tops: number[] = [];
  for (const element of elements) {
    const box = await element.boundingBox();
    if (box === null) throw new Error("an element with no box");
    tops.push(Math.round(box.y), Math.round(box.x));
  }
  return tops;
}

/** The descriptions of the six plots. */
async function descriptions(page: Page): Promise<string[]> {
  return stats(page).locator("svg.chart desc").allTextContents();
}

/** The number of variants a description of a plot of the variants says
    it is over: "The proportion of missing genotypes of 5,000 variants,
    …". */
function variantsOf(description: string): number {
  const match =
    /^The proportion of missing genotypes of ([\d,]+) variants,/u.exec(
      description,
    );
  if (match?.[1] === undefined) throw new Error(`no count in ${description}`);
  return Number(match[1].replaceAll(",", ""));
}

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

for (const width of [null, 320] as const) {
  test(`SF10 D2 a Stop after a result so far keeps the plots where they were, with the words of a Stop${width === null ? "" : ", at 320 pixels"}`, async ({
    page,
    makeAxeBuilder,
  }, testInfo) => {
    test.setTimeout(120_000);
    await openHeld(page, testInfo.outputPath("stop.vcf.gz"), width);
    await firstPlots(page);
    const before = await places(page);
    const drawn = await descriptions(page);
    for (const description of drawn) {
      expect(description).toMatch(/ Drawn from the variants read so far\.$/u);
    }

    await stop(page);
    for (const name of ["Variants", "Individuals"] as const) {
      await expect(
        part(page, name).getByText(STOPPED_WITH_PLOTS, { exact: true }),
      ).toBeVisible();
      await expect(
        part(page, name).getByText(STOPPED, { exact: true }),
      ).toHaveCount(0);
    }
    await expect(stats(page).locator("svg.chart")).toHaveCount(6);
    // The plots are those read before the Stop, their descriptions saying
    // so, over the first block of the file alone.
    const after = await descriptions(page);
    expect(after).toEqual(
      drawn.map((description) =>
        description.replace(
          / Drawn from the variants read so far\.$/u,
          " Drawn from the variants read before the Stop.",
        ),
      ),
    );
    expect(variantsOf(after[0] ?? "")).toBeLessThan(NUM_VARIANTS);
    // Nothing moved.
    expect(await places(page)).toEqual(before);
    await expect(downloadButton(page)).toHaveCount(0);
    await expectNoViolations(makeAxeBuilder);
  });
}

test("SF10 D2 a threshold moved over the plots of a Stop changes the project, with its step of Undo, and its grey is of the variants read", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  test.setTimeout(120_000);
  await openHeld(page, testInfo.outputPath("stop.vcf.gz"));
  await firstPlots(page);
  await stop(page);
  await expect(undoButton(page)).toBeDisabled();

  const maf = stats(page).getByRole("group", {
    name: "Major allele frequency",
    exact: true,
  });
  const box = maf.getByRole("textbox");
  const slider = maf.getByRole("slider");
  const line = maf.locator("line.chart-threshold");
  const keepsAll = /\bchart-threshold-keeps-all\b/u;
  // The top of the axis of the plot read before the Stop keeps every
  // variant of it: on, and grey.
  const top = await slider.getAttribute("max");
  if (top === null) throw new Error("no top of the axis");
  expect(Number(top)).toBeLessThan(1);
  await box.fill(top);
  await box.press("Enter");
  await expect(undoButton(page)).toBeEnabled();
  await expect(slider).toHaveAttribute(
    "aria-valuetext",
    `${top}, keeps every variant of the plot`,
  );
  await expect(line).toHaveClass(keepsAll);
  await expectNoViolations(makeAxeBuilder);

  // At 0.6 it removes the variants of the plot above it, whose bars are
  // shaded.
  await box.fill("0.6");
  await box.press("Enter");
  await expect(slider).toHaveAttribute("aria-valuetext", "0.6");
  await expect(line).not.toHaveClass(keepsAll);
  await expect(maf.locator("rect.chart-bar-removed")).not.toHaveCount(0);
  await expect(
    part(page, "Variants").getByText(STOPPED_WITH_PLOTS, { exact: true }),
  ).toBeVisible();

  await undoButton(page).click();
  await expect(slider).toHaveAttribute(
    "aria-valuetext",
    `${top}, keeps every variant of the plot`,
  );
  await expect(stats(page).locator("svg.chart")).toHaveCount(6);
});

test("SF10 D2 Start again drops the plots of the Stop and reads the file again", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await openHeld(page, testInfo.outputPath("stop.vcf.gz"));
  await firstPlots(page);
  await stop(page);
  await expect(stats(page).locator("svg.chart")).toHaveCount(6);

  await info(page).getByRole("button", { name: "Start again" }).click();
  await expect(info(page).getByRole("button", { name: "Stop" })).toBeFocused();
  await expect(stats(page).locator("svg.chart")).toHaveCount(0);
  await expect(
    part(page, "Variants").getByText(
      /^Calculating the statistics of the variants…( \d+%)?$/u,
    ),
  ).toBeVisible();
  await expect(
    part(page, "Variants").getByText(STOPPED_WITH_PLOTS, { exact: true }),
  ).toBeHidden();

  await release(page, "allSoFar");
  await release(page, "result");
  await expect(downloadButton(page)).toBeVisible({ timeout: 60_000 });
  const done = await descriptions(page);
  expect(done).toHaveLength(6);
  expect(variantsOf(done[0] ?? "")).toBe(NUM_VARIANTS);
  for (const description of done) {
    expect(description).not.toMatch(/before the Stop|so far/u);
  }
});

test("SF10 D2 another file drops the plots of the Stop", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await openHeld(page, testInfo.outputPath("stop.vcf.gz"));
  await firstPlots(page);
  await stop(page);

  await pick(page, join(FIXTURES, "panel.nei"));
  await expect(info(page).getByText(/^panel\.nei · /u)).toBeVisible();
  await expect(stats(page).locator("svg.chart")).toHaveCount(0);
  await release(page, "allSoFar");
  await release(page, "result");
  await expect(downloadButton(page)).toBeVisible({ timeout: 60_000 });
  const done = await descriptions(page);
  expect(done[0]).toBe(
    "The proportion of missing genotypes of 1,200 variants, in 21 bins from 0 to 0.1.",
  );
  for (const description of done) {
    expect(description).not.toMatch(/before the Stop/u);
  }
  await expect(
    part(page, "Variants").getByText(STOPPED_WITH_PLOTS, { exact: true }),
  ).toBeHidden();
});

test("SF10 D2 a Stop before the first result so far leaves no plots and the words of a Stop with none", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  test.setTimeout(120_000);
  await openHeld(page, testInfo.outputPath("stop.vcf.gz"));
  await stop(page);
  for (const name of ["Variants", "Individuals"] as const) {
    await expect(
      part(page, name).getByText(STOPPED, { exact: true }),
    ).toBeVisible();
  }
  await expect(stats(page).getByText(/before the Stop/u)).toHaveCount(0);
  await expect(stats(page).locator("svg.chart")).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("SF10 D2 a failure of the pass after Start again shows no plot of the Stop", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await openHeld(page, testInfo.outputPath("stop.vcf.gz"));
  await firstPlots(page);
  await stop(page);
  await info(page).getByRole("button", { name: "Start again" }).click();
  await release(page, "crash");
  await expect(
    part(page, "Variants").getByText("Not calculated.", { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    part(page, "Individuals").getByText("Not calculated.", { exact: true }),
  ).toBeVisible();
  await expect(stats(page).locator("svg.chart")).toHaveCount(0);
  await expect(stats(page).getByText(/before the Stop/u)).toHaveCount(0);
});
