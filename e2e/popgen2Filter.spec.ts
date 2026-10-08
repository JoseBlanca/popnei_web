/**
 * The FILTER box of popgen2.html, on the built site (docs/plans/filters.md,
 * work package 7; docs/specs/steps/popgen2-filters.md, "The FILTER box",
 * "The states" and "Accessibility"): "Leave out the variants that failed
 * their FILTER", ticked, at the end of the part of the variants, for a
 * VCF and for a .nei file that records the FILTER of its variants,
 * low_qual.nei, and not for panel.nei, which does not, nor while a file
 * is opened, nor after an opening that failed; a click gives no notice,
 * as the owner asked on 8 October 2026, changes no plot and sends nothing
 * to the worker, and a second click ticks it again; the filter stays as the user
 * left it across files; the box is there while the pass runs, after a
 * Stop and after a crash, where a click leaves the words of the crash;
 * its sentence is its description; the
 * Tab key reaches it after the four histograms of the variants and before
 * the part of the individuals.
 *
 * panel.vcf.gz, panel.nei, low_qual.vcf.gz and low_qual.nei each hold
 * 1,200 variants, counted by popnei; low_qual.nei is low_qual.vcf.gz
 * written by popnei 0.2.2, which records the FILTER of its variants.
 */
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";
import { crashWorkerOn } from "./crashWorker.ts";
import { holdSummary, release } from "./holdWorker.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

const LABEL = "Leave out the variants that failed their FILTER";
const SENTENCE =
  "The plots show every variant. The ones that failed are left out of what is downloaded or analysed.";
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
async function sent(page: Page): Promise<number> {
  return page.evaluate(
    (name) =>
      (window as unknown as Record<string, { sent: number }>)[name]?.sent ?? -1,
    SENT,
  );
}

async function openPage(page: Page): Promise<void> {
  await page.goto("popgen2.html");
  await expect(
    page.getByRole("heading", { level: 1, name: "Popnei" }),
  ).toBeVisible();
}

/** The button that opens the file picker, whatever its words. */
function openButton(page: Page): Locator {
  return page.getByRole("button", {
    name: /^Open (another )?variants file…$/u,
  });
}

/** The box of the file open. */
function info(page: Page): Locator {
  return page.getByRole("region", { name: "File information" });
}

function stats(page: Page): Locator {
  return page.getByRole("region", { name: "Statistics of the file" });
}

/** The part of the section under the heading `name`. */
function part(page: Page, name: string): Locator {
  return stats(page)
    .getByRole("heading", { level: 2, name })
    .locator("xpath=..");
}

function filterBox(page: Page): Locator {
  return page.getByRole("checkbox", { name: LABEL });
}

/** Clicks the words of the box, as a user does: the input itself is
    hidden under the drawn box. */
async function clickBox(page: Page): Promise<void> {
  await page.getByText(LABEL, { exact: true }).click();
}

/** The notice of the old page, which popgen2.html no longer has. */
function notice(page: Page): Locator {
  return page.getByRole("region", { name: "Notice" });
}

/** Picks the fixture `name` with the open button. */
async function pick(page: Page, name: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await openButton(page).click();
  await (await chooser).setFiles(join(FIXTURES, name));
}

/** Expects the file `name` open, its 1,200 variants counted and its six
    plots drawn: the one pass done. */
async function expectDone(page: Page, name: string): Promise<void> {
  await expect(info(page).getByText(name)).toBeVisible();
  await expect(
    info(page).getByText("Variants: 1,200", { exact: true }),
  ).toBeVisible();
  await expect(stats(page).locator("svg.chart")).toHaveCount(6);
}

/** The drawing of the six plots, to tell whether a click changed one. */
async function plotsDrawn(page: Page): Promise<string[]> {
  return stats(page)
    .locator("svg.chart")
    .evaluateAll((plots) => plots.map((plot) => plot.outerHTML));
}

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

test("SF7 D2 the box is there and ticked for panel.vcf.gz and for low_qual.nei once each is opened, at the end of the variants, with its sentence as its description, and not for panel.nei", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  await expect(filterBox(page)).toHaveCount(0);

  await pick(page, "panel.vcf.gz");
  await expectDone(page, "panel.vcf.gz");
  await expect(
    part(page, "Variants").getByRole("checkbox"),
  ).toHaveAccessibleName(LABEL);
  await expect(filterBox(page)).toBeChecked();
  await expect(filterBox(page)).toHaveAccessibleDescription(SENTENCE);
  await expect(part(page, "Variants").getByText(SENTENCE)).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  await pick(page, "panel.nei");
  await expectDone(page, "panel.nei");
  await expect(filterBox(page)).toHaveCount(0);

  await pick(page, "low_qual.nei");
  await expectDone(page, "low_qual.nei");
  await expect(filterBox(page)).toBeChecked();
  await expect(filterBox(page)).toHaveAccessibleDescription(SENTENCE);
});

test("SF7 D2 the box is not there while panel.vcf.gz is opened, nor after no_ploidy.vcf.gz, whose opening fails", async ({
  page,
}) => {
  // The wasm held back, so that the opening waits for the calculation
  // worker.
  await page.route("**/*.wasm", () => undefined);
  await openPage(page);
  await pick(page, "panel.vcf.gz");
  await expect(page.getByText("1 second so far.")).toBeVisible();
  await expect(filterBox(page)).toHaveCount(0);

  await page.unroute("**/*.wasm");
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: "Popnei" }),
  ).toBeVisible();
  await pick(page, "no_ploidy.vcf.gz");
  await expect(
    info(page).getByText(/^No genotype with alleles was found/u),
  ).toBeVisible();
  await expect(filterBox(page)).toHaveCount(0);
});

test("SF7 D2 a click gives no notice, changes no plot and sends nothing to the worker, and a second click ticks the box again", async ({
  page,
  makeAxeBuilder,
}) => {
  await countSent(page);
  await openPage(page);
  await pick(page, "low_qual.vcf.gz");
  await expectDone(page, "low_qual.vcf.gz");
  await expect(
    info(page).getByText("FILTER failures: 300", { exact: true }),
  ).toBeVisible();
  const plots = await plotsDrawn(page);
  const before = await sent(page);
  expect(before).toBeGreaterThan(0);

  await clickBox(page);
  await expect(filterBox(page)).not.toBeChecked();
  await expect(notice(page)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  await clickBox(page);
  await expect(filterBox(page)).toBeChecked();
  await expect(notice(page)).toHaveCount(0);

  expect(await plotsDrawn(page)).toEqual(plots);
  await expect(
    info(page).getByText("FILTER failures: 300", { exact: true }),
  ).toBeVisible();
  expect(await sent(page)).toBe(before);
});

test("SF7 D2 the box turned off for a VCF stays off for low_qual.nei, after panel.nei, which has no box, and for the VCF again", async ({
  page,
}) => {
  await openPage(page);
  await pick(page, "low_qual.vcf.gz");
  await expectDone(page, "low_qual.vcf.gz");
  await clickBox(page);
  await expect(filterBox(page)).not.toBeChecked();

  await pick(page, "panel.nei");
  await expectDone(page, "panel.nei");
  await expect(filterBox(page)).toHaveCount(0);

  await pick(page, "low_qual.nei");
  await expectDone(page, "low_qual.nei");
  await expect(filterBox(page)).not.toBeChecked();

  await pick(page, "panel.vcf.gz");
  await expectDone(page, "panel.vcf.gz");
  await expect(filterBox(page)).not.toBeChecked();
});

test("SF7 D2 the box is there while the pass runs and after a Stop, and a click there stops nothing and gives no notice", async ({
  page,
}) => {
  await holdSummary(page);
  await openPage(page);
  await pick(page, "low_qual.vcf.gz");
  const stop = info(page).getByRole("button", { name: "Stop" });
  await expect(stop).toBeVisible();
  await expect(filterBox(page)).toBeChecked();

  await clickBox(page);
  await expect(filterBox(page)).not.toBeChecked();
  await expect(notice(page)).toHaveCount(0);
  await expect(stop).toBeVisible();

  await stop.click();
  const again = info(page).getByRole("button", { name: "Start again" });
  await expect(again).toBeVisible();
  await expect(filterBox(page)).not.toBeChecked();
  await clickBox(page);
  await expect(filterBox(page)).toBeChecked();
  await expect(notice(page)).toHaveCount(0);
  await expect(again).toBeVisible();

  // The worker made at the Stop, which holds nothing, finishes the pass.
  await again.click();
  await release(page, "allSoFar");
  await release(page, "result");
  await expectDone(page, "low_qual.vcf.gz");
  await expect(filterBox(page)).toBeChecked();
});

test("SF7 D2 after a crash of the pass the box is there, and a click leaves the words of the crash", async ({
  page,
  makeAxeBuilder,
}) => {
  await crashWorkerOn(page, "run", "variantsSummary", true);
  await openPage(page);
  await pick(page, "low_qual.vcf.gz");
  const failed =
    "The variants of low_qual.vcf.gz could not be counted, nor their statistics calculated.";
  await expect(info(page).getByText(failed)).toBeVisible({ timeout: 20_000 });
  await expect(
    part(page, "Variants").getByText("Not calculated.", { exact: true }),
  ).toBeVisible();
  await expect(filterBox(page)).toBeChecked();

  await clickBox(page);
  await expect(filterBox(page)).not.toBeChecked();
  await expect(notice(page)).toHaveCount(0);
  await expect(info(page).getByText(failed)).toBeVisible();
  await expect(
    part(page, "Variants").getByText("Not calculated.", { exact: true }),
  ).toBeVisible();
  await expect(
    info(page).getByRole("button", { name: "Start again" }),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
});

test("SF7 D2 the Tab key reaches the box after the four histograms of the variants, three with a threshold, and leaves it for the part of the individuals", async ({
  page,
}) => {
  await openPage(page);
  await pick(page, "panel.vcf.gz");
  await expectDone(page, "panel.vcf.gz");
  const variants = part(page, "Variants");
  const individuals = part(page, "Individuals");
  // The expected heterozygosity, the fourth, has no threshold.
  await expect(variants.getByRole("slider")).toHaveCount(3);

  await variants.getByRole("slider").last().focus();
  await page.keyboard.press("Tab");
  await expect(filterBox(page)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(individuals.getByRole("textbox").first()).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(filterBox(page)).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(variants.getByRole("slider").last()).toBeFocused();

  // The space bar ticks it off and on, as a check box.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Space");
  await expect(filterBox(page)).not.toBeChecked();
  await expect(filterBox(page)).toBeFocused();
  await page.keyboard.press("Space");
  await expect(filterBox(page)).toBeChecked();
});

test("SF7 D2 the box shown while the code of the plots downloads keeps the focus when that code arrives", async ({
  page,
}) => {
  // The code of the plots held back until the box has the focus.
  let releaseCode = (): void => undefined;
  const held = new Promise<void>((resolve) => {
    releaseCode = resolve;
  });
  await page.route(/\/assets\/SectionPlots-[^/]*\.js$/u, async (route) => {
    await held;
    await route.continue();
  });
  await openPage(page);
  await pick(page, "low_qual.vcf.gz");
  await expect(filterBox(page)).toBeChecked();
  await expect(
    part(page, "Variants").getByText(
      /^Calculating the statistics of the variants…/u,
    ),
  ).toBeVisible();
  await expect(stats(page).locator("svg.chart")).toHaveCount(0);
  await filterBox(page).focus();
  await expect(filterBox(page)).toBeFocused();

  releaseCode();
  await expectDone(page, "low_qual.vcf.gz");
  await expect(filterBox(page)).toBeFocused();
  await expect(filterBox(page)).toBeChecked();
});
