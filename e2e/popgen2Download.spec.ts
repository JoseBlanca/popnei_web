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
 * dark (work package 6). And when there is nothing to download (work
 * package 7): the sentence of no variant before any write, said once in
 * the status region, and after a write; the words of no individual kept;
 * the text that stays until a filter or the file changes; a run of the
 * arrow keys made a change as the slider loses the focus to the button;
 * a press of the pointer on the button whose change leaves nothing to
 * download, which puts the focus on the sentence; the status region after
 * a quick write; and a drop or a paste
 * while the dialog is open, which opens nothing. The sizes and the counts are those of popnei 0.2.2 under node,
 * 8 October 2026, as the screen spec gives them.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

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
  // Anchored: the name is the start of that of the individuals' box.
  obsHet: /^Obs\. het\. max: maximum observed heterozygosity$/u,
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

test("DL6 D4 the status region says the file written as the write starts; Stop during a write of the VCF of 200,000 variants downloads nothing, gives the focus back to the button and says so; Escape while it writes leaves the dialog open", async ({
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
  // The words of the one pass said, so that the start of the write is
  // said alone.
  await expect(status(page)).toContainText(
    "The statistics of big.vcf.gz are calculated.",
  );

  await button(page).click();
  await dialog(page).getByRole("button", { name: "Download" }).click();
  // Said once, as the focus moves to Stop.
  await expect(status(page)).toHaveText("Writing big.filtered.vcf.gz.");
  const bar = dialog(page).getByRole("progressbar", {
    name: "Writing big.filtered.vcf.gz",
  });
  await expect(bar).toHaveAttribute("aria-valuenow", /^[1-9]\d*$/u, {
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

/** The name of the zone of the opening's hidden button that takes a
    pasted file. */
const PASTE = "Paste a variants file";

/** The sentence of no variant of panel.vcf.gz. */
const PANEL_NONE =
  "None of the 1,200 variants of panel.vcf.gz pass the filters, so there is nothing to download.";

/** The sentence in place of the button, by its words. */
function sentence(page: Page, words: string): Locator {
  return stats(page).locator("p", { hasText: words });
}

/** Records the kind of every message the page posts to a worker, in
    `window.__e2eKinds`, before the page loads. */
async function recordKinds(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const kinds: string[] = [];
    Object.defineProperty(window, "__e2eKinds", { value: kinds });
    const prototype = window.Worker.prototype;
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with its worker, by apply
    const post = prototype.postMessage;
    prototype.postMessage = function (
      this: Worker,
      ...args: [message: unknown, options?: StructuredSerializeOptions]
    ) {
      const data = args[0];
      if (typeof data === "object" && data !== null && "kind" in data) {
        kinds.push(String(data.kind));
      }
      post.apply(this, args);
    } as typeof prototype.postMessage;
  });
}

/** The writes posted to a worker so far. */
async function writesSent(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      (window as unknown as { __e2eKinds: string[] }).__e2eKinds.filter(
        (kind) => kind === "write",
      ).length,
  );
}

/** Opens the dialog, chooses `format`, and presses Download, for a write
    that downloads nothing. */
async function writeNothing(page: Page, format: FormatWords): Promise<void> {
  await button(page).click();
  await dialog(page).locator("label").filter({ hasText: format }).click();
  await dialog(page).getByRole("button", { name: "Download" }).click();
}

/** A VCF of panel.vcf.gz's variants with LowQual in every FILTER column,
    written under the output of the test. */
async function noPassVcf(path: string): Promise<string> {
  const text = gunzipSync(await readFile(join(FIXTURES, "panel.vcf.gz")))
    .toString("utf8")
    .replaceAll("\tPASS\t", "\tLowQual\t");
  await writeFile(path, text);
  return path;
}

async function expectAxeBothSchemes(
  page: Page,
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  for (const scheme of ["light", "dark"] as const) {
    // No transition of the colours, which axe would read halfway.
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await expectNoViolations(makeAxeBuilder);
  }
}

test("DL7 D2 a run of the arrow keys is made a change as the slider loses the focus to the button, within its quiet second: Enter then writes the file with the threshold the run moved to", async ({
  page,
}, testInfo) => {
  await openDone(page, "panel.vcf.gz");
  const slider = stats(page)
    .getByRole("group", {
      name: "Proportion of missing genotypes",
      exact: true,
    })
    .getByRole("slider");
  await slider.focus();
  await page.keyboard.press("Home");
  await expect(slider).toHaveValue("0");
  // Within the quiet second of the run: the slider, losing the focus,
  // makes the run a change, before the button is pressed. The gate of
  // the button, which would make it one too, is reached only in Vitest
  // (DownloadVariants.test.ts).
  await button(page).focus();
  const coming = page.waitForEvent("download", { timeout: 60_000 });
  await page.keyboard.press("Enter");
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole("button", { name: "Download" }).click();
  const got = await coming;

  const path = testInfo.outputPath("panel.filtered.vcf.gz");
  expect(await savedSize(got, path)).toBe(756);
  expect(await readBack(path)).toEqual({ numVars: 2, numIndividuals: 200 });
  await expect(textAfter(page, "panel")).toHaveText(
    "panel.filtered.vcf.gz downloaded, 756 bytes: 2 variants of 200 individuals. Variants removed: 1,198 by the missing rate. Save it again",
  );
});

test("DL7 D2 a press of the pointer on the button within the quiet second of a run, or with a number typed, that leaves nothing to download: no dialog, and the sentence takes the focus", async ({
  page,
}) => {
  await recordKinds(page);
  await openDone(page, "panel.vcf.gz");
  const group = stats(page).getByRole("group", {
    name: "Observed heterozygosity",
    exact: true,
  });
  const slider = group.getByRole("slider");
  await slider.focus();
  await page.keyboard.press("Home");
  await expect(slider).toHaveValue("0");

  // Within the quiet second of the run.
  await pressDownloadWithMouse(page);
  await expect(dialog(page)).toHaveCount(0);
  expect(await writesSent(page)).toBe(0);

  // A number typed and not committed, then a press of the pointer.
  await threshold(page, "obsHet", "1");
  await expect(button(page)).toBeEnabled();
  await stats(page).getByRole("textbox", { name: BOXES.obsHet }).fill("0");
  await pressDownloadWithMouse(page);
  await expect(dialog(page)).toHaveCount(0);
  expect(await writesSent(page)).toBe(0);
});

/** Presses the pointer on the button, checks that the sentence of no
    variant takes its place and the focus while the pointer is down, and
    lets the pointer go. */
async function pressDownloadWithMouse(page: Page): Promise<void> {
  await button(page).scrollIntoViewIfNeeded();
  const where = await button(page).boundingBox();
  if (where === null) throw new Error("no button of the download");
  await page.mouse.move(where.x + where.width / 2, where.y + where.height / 2);
  await page.mouse.down();
  await expect(sentence(page, PANEL_NONE)).toBeVisible();
  await expect(button(page)).toHaveCount(0);
  await expect.poll(() => focused(page)).toBe(`P ${PANEL_NONE}`);
  await page.mouse.up();
  await expect.poll(() => focused(page)).toBe(`P ${PANEL_NONE}`);
}

test("DL7 D2 a write shorter than the pause of the status region: the region does not end on the words of its start", async ({
  page,
}) => {
  await openDone(page, "low_qual.vcf.gz");
  await download(page, "VCF compressed with bgzip (.vcf.gz)");
  const text =
    "low_qual.filtered.vcf.gz downloaded, 76 KB: 900 variants of 200 individuals. Variants removed: 300 by their FILTER. Save it again";
  await expect.poll(() => focused(page)).toBe(`P ${text}`);
  // Past the region's pause of 100 ms, after which a text still waiting
  // would be written.
  await page.waitForTimeout(400);
  await expect(status(page)).not.toContainText("Writing");
});

test("DL7 D2 the text after the download stays through a click elsewhere and Escape, and goes at a change of a threshold, a click on the FILTER box and another file", async ({
  page,
}) => {
  await openDone(page, "low_qual.vcf.gz");
  await download(page, "VCF compressed with bgzip (.vcf.gz)");
  const text = textAfter(page, "low_qual");
  await expect(text).toBeVisible();

  await page.getByRole("heading", { level: 1 }).click();
  await page.keyboard.press("Escape");
  await expect(text).toBeVisible();
  await expect(button(page)).toHaveCount(0);

  await threshold(page, "missing", "0.2");
  await expect(text).toHaveCount(0);
  await expect(button(page)).toBeEnabled();

  await download(page, "VCF compressed with bgzip (.vcf.gz)");
  await expect(text).toBeVisible();
  // The words of the box, as a user clicks it: the input is hidden under
  // the box drawn.
  await page
    .getByText("Leave out the variants that failed their FILTER", {
      exact: true,
    })
    .click();
  await expect(text).toHaveCount(0);
  await expect(button(page)).toBeEnabled();

  await download(page, "VCF compressed with bgzip (.vcf.gz)");
  await expect(text).toBeVisible();
  await pick(page, "panel.nei");
  await expect(text).toHaveCount(0);
  await expect(button(page)).toBeEnabled({ timeout: 60_000 });
});

test("DL7 D2 the sentence of no variant before any write, with no dialog and no write sent, said once by the status region; the button with the missing rate at 0; axe, light and dark", async ({
  page,
  makeAxeBuilder,
}) => {
  await recordKinds(page);
  await openDone(page, "panel.vcf.gz");
  // The words of the one pass said, so that the sentence is heard alone.
  await expect(status(page)).toContainText(
    "The statistics of panel.vcf.gz are calculated.",
  );

  await threshold(page, "obsHet", "0");
  await expect(sentence(page, PANEL_NONE)).toHaveText(PANEL_NONE);
  await expect(button(page)).toHaveCount(0);
  await expect(status(page)).toContainText(PANEL_NONE);
  await expectAxeBothSchemes(page, makeAxeBuilder);

  // Back to the button, which nothing says.
  await threshold(page, "obsHet", "1");
  await expect(button(page)).toBeEnabled();
  await expect(status(page)).not.toContainText(PANEL_NONE);

  await threshold(page, "maf", "0.45");
  await expect(sentence(page, PANEL_NONE)).toBeVisible();
  await expect(button(page)).toHaveCount(0);
  await threshold(page, "maf", "1");

  await threshold(page, "missing", "0");
  await expect(button(page)).toBeEnabled();
  await expect(sentence(page, PANEL_NONE)).toHaveCount(0);

  await expect(dialog(page)).toHaveCount(0);
  expect(await writesSent(page)).toBe(0);
});

test("DL7 D2 the sentence before any write on a VCF none of whose variants passed its FILTER, with the box ticked", async ({
  page,
}, testInfo) => {
  await recordKinds(page);
  await page.goto("popgen2.html");
  await pick(page, await noPassVcf(testInfo.outputPath("nopass.vcf")));
  // The box is ticked when the file opens: the sentence comes in place of
  // the button as the one pass ends.
  await expect(
    sentence(
      page,
      "None of the 1,200 variants of nopass.vcf pass the filters, so there is nothing to download.",
    ),
  ).toBeVisible({ timeout: 60_000 });
  await expect(button(page)).toHaveCount(0);
  await expect(
    page.getByRole("checkbox", {
      name: "Leave out the variants that failed their FILTER",
    }),
  ).toBeChecked();
  expect(await writesSent(page)).toBe(0);
});

test("DL7 D2 the sentence after a write that keeps no variant, with no download and the focus on it; and the file of one variant where the plot alone would have said none; axe, light and dark", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  let downloads = 0;
  page.on("download", () => {
    downloads += 1;
  });
  await openDone(page, "panel.vcf.gz");
  await threshold(page, "missing", "0");
  await threshold(page, "maf", "0.6");
  await expect(button(page)).toBeEnabled();
  await writeNothing(page, "VCF compressed with bgzip (.vcf.gz)");
  await expect(dialog(page)).toHaveCount(0, { timeout: 60_000 });
  await expect(sentence(page, PANEL_NONE)).toHaveText(PANEL_NONE);
  await expect.poll(() => focused(page)).toBe(`P ${PANEL_NONE}`);
  await expectAxeBothSchemes(page, makeAxeBuilder);

  // A change brings the button back.
  await threshold(page, "missing", "0.1");
  await threshold(page, "maf", "1");
  await threshold(page, "individualsMissing", "0.03");
  await threshold(page, "obsHet", "0.01");
  await expect(button(page)).toBeEnabled();
  await writeNothing(page, "VCF compressed with bgzip (.vcf.gz)");
  await expect(dialog(page)).toHaveCount(0, { timeout: 60_000 });
  await expect(sentence(page, PANEL_NONE)).toBeVisible();
  await expect.poll(() => focused(page)).toBe(`P ${PANEL_NONE}`);
  expect(downloads).toBe(0);

  await threshold(page, "obsHet", "0.02");
  const got = await download(page, "VCF compressed with bgzip (.vcf.gz)");
  const path = testInfo.outputPath("one.vcf.gz");
  await got.saveAs(path);
  expect(await readBack(path)).toEqual({ numVars: 1, numIndividuals: 116 });
  await expect(textAfter(page, "panel")).toContainText(
    "1 variant of 116 individuals.",
  );
});

test("DL7 D2 the missing rate of the individuals at 0.01 keeps none of the 200, and their words take the place of the button; axe, light and dark", async ({
  page,
  makeAxeBuilder,
}) => {
  await openDone(page, "panel.vcf.gz");
  await threshold(page, "individualsMissing", "0.01");
  const words =
    "The filters of individuals keep none of the 200 individuals of panel.vcf.gz. Loosen them.";
  await expect(sentence(page, words)).toHaveText(words);
  await expect(button(page)).toHaveCount(0);
  await expectAxeBothSchemes(page, makeAxeBuilder);
});

test("DL7 D2 a file dropped on the page or pasted while the dialog is open opens nothing", async ({
  page,
}) => {
  await openDone(page, "low_qual.vcf.gz");
  const zone = page.getByRole("button", {
    name: /^Open another variants file…$/u,
  });
  await zone.scrollIntoViewIfNeeded();
  const where = await zone.boundingBox();
  if (where === null) throw new Error("no open button");
  const bytes = [...(await readFile(join(FIXTURES, "panel.nei")))];
  await button(page).click();
  await expect(dialog(page)).toBeVisible();

  // A drop lands on what is drawn at that point: the dialog's overlay.
  const target = await page.evaluate(
    ({ x, y, given }) => {
      // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with its item, by call
      const entryOf = DataTransferItem.prototype.webkitGetAsEntry;
      DataTransferItem.prototype.webkitGetAsEntry = function (
        this: DataTransferItem,
      ) {
        return (
          entryOf.call(this) ??
          ({ isFile: true, isDirectory: false } as FileSystemEntry)
        );
      };
      const element = document.elementFromPoint(x, y);
      if (element === null) return "nothing";
      const transfer = new DataTransfer();
      transfer.items.add(new File([new Uint8Array(given)], "panel.nei"));
      for (const type of ["dragenter", "dragover", "drop"]) {
        element.dispatchEvent(
          new DragEvent(type, {
            bubbles: true,
            cancelable: true,
            dataTransfer: transfer,
          }),
        );
      }
      return element.closest("[data-live-announcer], main") === null
        ? "outside the page"
        : "on the page";
    },
    {
      x: where.x + where.width / 2,
      y: where.y + where.height / 2,
      given: bytes,
    },
  );
  expect(target).toBe("outside the page");

  // A paste goes to the focus, in the dialog.
  await page.evaluate((given) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array(given)], "panel.nei"));
    (document.activeElement ?? document.body).dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: transfer,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, bytes);

  await page.waitForTimeout(500);
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole("button", { name: "Cancel" }).click();
  await expect(info(page).getByText("panel.nei")).toHaveCount(0);
  await expect(
    info(page)
      .getByText(/^low_qual\.vcf\.gz/u)
      .first(),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: PASTE })).toHaveCount(1);
});
