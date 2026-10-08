/**
 * The download of the filtered variants on popgen2.html, on the built site
 * (docs/plans/download.md, work package 6;
 * docs/specs/steps/popgen2-download.md, "How it is checked", In
 * Playwright): the file downloaded by itself when the write ends, with
 * no click after Download, its name and its bytes, read back by popnei in
 * node; the text after the download and the focus on it; Save it again;
 * the button that waits for the one pass, held by holdWorker.ts, and
 * after its Stop; Stop of a write held after its first report, and
 * Escape while it writes; a crash of the worker during a write; and axe
 * on the button with its reason, the dialog and the text, light and
 * dark. The sizes and the counts are those of popnei 0.2.2 under node,
 * 8 October 2026, as the screen spec gives them.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Download, Locator, Page } from "@playwright/test";
import { calcVariantsSummary, init, openVars, openVcf } from "popnei";

import { expect, test } from "./axe.ts";
import { writeBigVcf } from "./bigVcf.ts";
import { crashWorkerOn } from "./crashWorker.ts";
import { holdSummary, release } from "./holdWorker.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The words of the button. */
const DOWNLOAD = "Download filtered variants…";

/** Why the button waits for the one pass. */
const WAITS =
  "The download waits for the statistics of the file to be read to the end.";

/** The variants of the VCF of the Stop, which bigVcf.ts writes. */
const BIG_VARIANTS = 200_000;

/** The textbox of the threshold of each histogram. */
const BOXES = {
  missing: "Missing genotypes max: maximum proportion of missing genotypes",
  maf: "Major allele frequency max: maximum major allele frequency",
  individualsMissing:
    "Missing GTs max: maximum proportion of missing genotypes of an individual",
  individualsObsHet:
    "Obs. het. max: maximum observed heterozygosity of an individual",
} as const;

/** The two formats, by the words of their radio buttons. */
type FormatWords = "VCF compressed with bgzip (.vcf.gz)" | "popnei's .nei file";

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

function stats(page: Page): Locator {
  return page.getByRole("region", { name: "Statistics of the file" });
}

function info(page: Page): Locator {
  return page.getByRole("region", { name: "File information" });
}

function button(page: Page): Locator {
  return stats(page).getByRole("button", { name: DOWNLOAD, exact: true });
}

function dialog(page: Page): Locator {
  return page.getByRole("dialog", { name: "Download filtered variants" });
}

/** The status region of the page. */
function status(page: Page): Locator {
  return page.getByRole("status").last();
}

/** The text after the download, by the name of the file it starts
    with. */
function textAfter(page: Page, stem: string): Locator {
  return stats(page).locator("p", { hasText: new RegExp(`^${stem}\\.`, "u") });
}

/** Picks `path`, a fixture or a path, with the open button. */
async function pick(page: Page, path: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: /^Open (another )?variants file…$/u })
    .click();
  await (
    await chooser
  ).setFiles(path.startsWith("/") ? path : join(FIXTURES, path));
}

/** Opens popgen2.html and `path`, and waits for the button enabled, the
    one pass finished. */
async function openDone(page: Page, path: string): Promise<void> {
  await page.goto("popgen2.html");
  await pick(page, path);
  await expect(button(page)).toBeEnabled({ timeout: 60_000 });
}

/** Types `value` in the box of a threshold and commits it with Enter. */
async function threshold(
  page: Page,
  box: keyof typeof BOXES,
  value: string,
): Promise<void> {
  const field = stats(page).getByRole("textbox", { name: BOXES[box] });
  await field.fill(value);
  await field.press("Enter");
  await expect(field).toHaveValue(value);
}

/** Opens the dialog, chooses `format`, presses Download, and gives the
    download that comes with no click after it. */
async function download(page: Page, format: FormatWords): Promise<Download> {
  await button(page).click();
  await expect(dialog(page)).toBeVisible();
  await dialog(page).locator("label").filter({ hasText: format }).click();
  await expect(dialog(page).getByRole("radio", { name: format })).toBeChecked();
  const coming = page.waitForEvent("download", { timeout: 60_000 });
  await dialog(page).getByRole("button", { name: "Download" }).click();
  return coming;
}

/** The variants and the individuals popnei in node reads in the file at
    `path`, a VCF or a `.nei` file. */
async function readBack(
  path: string,
): Promise<{ readonly numVars: number; readonly numIndividuals: number }> {
  await init();
  const bytes = new Uint8Array(await readFile(path));
  const variants = path.endsWith(".nei")
    ? openVars(bytes)
    : openVcf(bytes, { onlyPassed: false });
  const summary = calcVariantsSummary(variants, { filterColumn: {} });
  return {
    numVars: summary.passStats.numVars,
    numIndividuals: variants.individuals.length,
  };
}

/** Saves `got` at `path` and gives its size. */
async function savedSize(got: Download, path: string): Promise<number> {
  await got.saveAs(path);
  return (await readFile(path)).length;
}

/** The element that has the focus: its tag and its words. */
async function focused(page: Page): Promise<string> {
  return page.evaluate(() => {
    const element = document.activeElement;
    return element === null
      ? "none"
      : `${element.tagName} ${element.textContent}`;
  });
}

test("DL6 D4 low_qual.vcf.gz as it opens is downloaded as a VCF with no click after Download, read back by popnei, and the text after the download takes the focus", async ({
  page,
}, testInfo) => {
  await openDone(page, "low_qual.vcf.gz");
  // The dialog opens on the VCF, its choice with the focus.
  await button(page).click();
  await expect(
    dialog(page).getByRole("radio", {
      name: "VCF compressed with bgzip (.vcf.gz)",
    }),
  ).toBeFocused();
  await dialog(page).getByRole("button", { name: "Cancel" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(button(page)).toBeFocused();

  const got = await download(page, "VCF compressed with bgzip (.vcf.gz)");

  expect(got.suggestedFilename()).toBe("low_qual.filtered.vcf.gz");
  const path = testInfo.outputPath("low_qual.filtered.vcf.gz");
  expect(await savedSize(got, path)).toBe(75_577);
  expect(await readBack(path)).toEqual({ numVars: 900, numIndividuals: 200 });
  const text =
    "low_qual.filtered.vcf.gz downloaded, 76 KB: 900 variants of 200 individuals. Variants removed: 300 by their FILTER. Save it again";
  await expect(dialog(page)).toHaveCount(0);
  await expect(textAfter(page, "low_qual")).toHaveText(text);
  await expect(button(page)).toHaveCount(0);
  await expect.poll(() => focused(page)).toBe(`P ${text}`);
});

test("DL6 D4 the thresholds of the example, as a .nei file and as a VCF", async ({
  page,
}, testInfo) => {
  await openDone(page, "low_qual.vcf.gz");
  await expect(stats(page).locator("svg.chart")).toHaveCount(6);
  await threshold(page, "missing", "0.05");
  await threshold(page, "maf", "0.9");
  await threshold(page, "individualsMissing", "0.03");
  await threshold(page, "individualsObsHet", "0.38");

  const nei = await download(page, "popnei's .nei file");
  expect(nei.suggestedFilename()).toBe("low_qual.filtered.nei");
  const neiPath = testInfo.outputPath("low_qual.filtered.nei");
  expect(await savedSize(nei, neiPath)).toBe(113_594);
  expect(await readBack(neiPath)).toEqual({
    numVars: 772,
    numIndividuals: 111,
  });
  await expect(textAfter(page, "low_qual")).toHaveText(
    "low_qual.filtered.nei downloaded, 114 KB: 772 variants of 111 individuals. Variants removed: 300 by their FILTER, 58 by the missing rate, 70 by the MAF. Individuals removed: 84 by the missing rate, 5 by the observed heterozygosity. Save it again",
  );

  // A threshold moved and brought back gives the button back.
  await threshold(page, "maf", "0.95");
  await threshold(page, "maf", "0.9");
  const vcf = await download(page, "VCF compressed with bgzip (.vcf.gz)");
  expect(vcf.suggestedFilename()).toBe("low_qual.filtered.vcf.gz");
  const vcfPath = testInfo.outputPath("low_qual.filtered.vcf.gz");
  expect(await savedSize(vcf, vcfPath)).toBe(41_972);
  expect(await readBack(vcfPath)).toEqual({
    numVars: 772,
    numIndividuals: 111,
  });
  await expect(textAfter(page, "low_qual")).toHaveText(
    "low_qual.filtered.vcf.gz downloaded, 42 KB: 772 variants of 111 individuals. Variants removed: 300 by their FILTER, 58 by the missing rate, 70 by the MAF. Individuals removed: 84 by the missing rate, 5 by the observed heterozygosity. Save it again",
  );
});

test("DL6 D4 panel.nei as it opens, as a .nei file, says no line of what was removed, and Save it again downloads the same file again", async ({
  page,
}, testInfo) => {
  await openDone(page, "panel.nei");
  const first = await download(page, "popnei's .nei file");
  expect(first.suggestedFilename()).toBe("panel.filtered.nei");
  const firstPath = testInfo.outputPath("first.nei");
  expect(await savedSize(first, firstPath)).toBe(261_570);
  await expect(textAfter(page, "panel")).toHaveText(
    "panel.filtered.nei downloaded, 262 KB: 1,200 variants of 200 individuals. Save it again",
  );

  const again = page.waitForEvent("download");
  await stats(page).getByRole("button", { name: "Save it again" }).click();
  const second = await again;
  expect(second.suggestedFilename()).toBe("panel.filtered.nei");
  const secondPath = testInfo.outputPath("second.nei");
  await second.saveAs(secondPath);
  expect(await readFile(secondPath)).toEqual(await readFile(firstPath));
});

test("DL6 D4 the button waits, disabled with its reason, while the one pass runs and after its Stop, and is enabled at the end of Start again; axe on it, light and dark", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  test.setTimeout(120_000);
  const vcf = testInfo.outputPath("held.vcf.gz");
  await writeBigVcf(vcf, 30_000);
  await holdSummary(page);
  await page.goto("popgen2.html");
  await pick(page, vcf);
  await expect(button(page)).toBeDisabled({ timeout: 60_000 });
  await expect(button(page)).toHaveAccessibleDescription(WAITS);
  await expect(stats(page).getByText(WAITS)).toBeVisible();
  for (const scheme of ["light", "dark"] as const) {
    // No transition of the colours, which axe would read halfway.
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await expectNoViolations(makeAxeBuilder);
  }

  await info(page).getByRole("button", { name: "Stop" }).click();
  await expect(
    info(page).getByRole("button", { name: "Start again" }),
  ).toBeVisible();
  await expect(button(page)).toBeDisabled();
  await expect(button(page)).toHaveAccessibleDescription(WAITS);

  await info(page).getByRole("button", { name: "Start again" }).click();
  await expect(button(page)).toBeDisabled();
  await release(page, "allSoFar");
  await release(page, "result");
  await expect(button(page)).toBeEnabled({ timeout: 60_000 });
  await expect(stats(page).getByText(WAITS)).toHaveCount(0);
});

test("DL6 D4 Stop during a write of the VCF of 200,000 variants downloads nothing, gives the focus back to the button and says so; Escape while it writes leaves the dialog open", async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  const vcf = testInfo.outputPath("big.vcf.gz");
  await writeBigVcf(vcf, BIG_VARIANTS);
  await holdSummary(page, { holdWrite: true });
  await page.goto("popgen2.html");
  await pick(page, vcf);
  await release(page, "allSoFar");
  await release(page, "result");
  await expect(button(page)).toBeEnabled({ timeout: 120_000 });
  let downloads = 0;
  page.on("download", () => {
    downloads += 1;
  });

  await button(page).click();
  await dialog(page).getByRole("button", { name: "Download" }).click();
  const bar = dialog(page).getByRole("progressbar", {
    name: "Writing big.filtered.vcf.gz",
  });
  await expect(bar).toHaveAttribute("aria-valuenow", /^\d+$/u, {
    timeout: 60_000,
  });
  await expect(
    dialog(page).getByText(
      /^Writing big\.filtered\.vcf\.gz · \d+% · \d:\d\d$/u,
    ),
  ).toBeVisible();
  const stop = dialog(page).getByRole("button", { name: "Stop" });
  await expect(stop).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeVisible();
  await expect(stop).toBeFocused();

  await stop.click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(button(page)).toBeFocused();
  await expect(status(page)).toHaveText(
    "The writing of big.filtered.vcf.gz was stopped. Nothing was downloaded.",
  );
  // The worker of the write was ended; nothing it held arrives.
  await page.waitForTimeout(1000);
  expect(downloads).toBe(0);
  await expect(button(page)).toBeEnabled();
});

test("DL6 D4 a crash of the worker during a write gives its words in the dialog, with Close, and Download writes again", async ({
  page,
}) => {
  await crashWorkerOn(page, "write", null, true);
  await openDone(page, "low_qual.vcf.gz");
  await button(page).click();
  await dialog(page).getByRole("button", { name: "Download" }).click();

  await expect(dialog(page).getByRole("alert")).toHaveText(
    "low_qual.filtered.vcf.gz could not be written: the writing stopped unexpectedly, perhaps because the file did not fit in the memory of this tab. Leave out more variants or individuals with the filters and download again, or write the file with popnei in Python, which writes files of any size.",
    { timeout: 30_000 },
  );
  const close = dialog(page).getByRole("button", { name: "Close" });
  await expect(close).toBeFocused();

  await close.click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(button(page)).toBeFocused();
  // The error bar has what the worker said, for a report.
  await expect(
    page.getByText(/^The application met an error of its own/u),
  ).toBeVisible();

  const got = await download(page, "VCF compressed with bgzip (.vcf.gz)");
  expect(got.suggestedFilename()).toBe("low_qual.filtered.vcf.gz");
  await expect(textAfter(page, "low_qual")).toContainText(
    "low_qual.filtered.vcf.gz downloaded, 76 KB",
  );
});

test("DL6 D4 axe on the dialog and on the text after the download, light and dark", async ({
  page,
  makeAxeBuilder,
}) => {
  await openDone(page, "low_qual.vcf.gz");
  await button(page).click();
  await expect(dialog(page)).toBeVisible();
  for (const scheme of ["light", "dark"] as const) {
    // No transition of the colours, which axe would read halfway.
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await expectNoViolations(makeAxeBuilder);
  }
  await dialog(page).getByRole("button", { name: "Cancel" }).click();

  await download(page, "VCF compressed with bgzip (.vcf.gz)");
  await expect(
    stats(page).getByRole("button", { name: "Save it again" }),
  ).toBeVisible();
  for (const scheme of ["light", "dark"] as const) {
    // No transition of the colours, which axe would read halfway.
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await expectNoViolations(makeAxeBuilder);
  }
});
