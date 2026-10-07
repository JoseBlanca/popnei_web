/**
 * The new page of population genetics, popgen2.html, on the built site
 * (docs/plans/open-variants.md, phase 2): steps 1 and 2 of cases 1 and 2
 * of docs/use-cases.md, a variants file opened and what it holds; a file
 * popnei refuses at the opening and one whose count it refuses; a count
 * stopped and started again, the count being the one pass that also
 * calculates the statistics of the file (docs/plans/live-stats.md); the
 * ploidy read from the file, and a file
 * whose ploidy cannot be read; files of another kind dropped; axe at each
 * state reached. A VCF is opened with no ploidy and with every variant,
 * whatever its FILTER column, and the page asks nothing of how it is read
 * (docs/plans/open-variants.md, "Round 3"). What
 * is known of the file, and what went wrong with it, is in one box above
 * the open button, which keeps its height through the read and the
 * count (the owner's layouts and decisions of 6 October 2026).
 *
 * The counts are popnei's, taken from its Python on the same files in
 * phase 1: panel.nei and panel.vcf.gz hold 1,200 variants of 200
 * individuals on the chromosome "1"; bad_position.vcf.gz is refused at
 * line 84, whose position is `x80`.
 */
import { copyFile, readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";
import { STOP_VCF_VARIANTS, writeBigVcf } from "./bigVcf.ts";
import { announced, recordAnnouncements } from "./announced.ts";
import { crashWorkerOn } from "./crashWorker.ts";
import { dropFiles } from "./dropFiles.ts";
import { holdSummary, release } from "./holdWorker.ts";
import type { DroppedFile } from "./dropFiles.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

async function openPage(page: Page): Promise<void> {
  await page.goto("popgen2.html");
  await expect(
    page.getByRole("heading", { level: 1, name: "Popnei" }),
  ).toBeVisible();
}

function opening(page: Page): Locator {
  return page.getByRole("region", { name: "Variants file" });
}

/** The box of the file open, above the open button. */
function info(page: Page): Locator {
  return page.getByRole("region", { name: "File information" });
}

/** The lines of the box, in their order. */
function lines(page: Page): Locator {
  return info(page).getByRole("paragraph");
}

/** The button that opens the file picker, whatever its words. */
function openButton(page: Page): Locator {
  return opening(page).getByRole("button", {
    name: /^Open (another )?variants file…$/,
  });
}

/** Picks `path` with the button, as a user does, through the file picker
    of the system. */
async function pick(page: Page, path: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await openButton(page).click();
  await (await chooser).setFiles(path);
}

/** Drops `files` on the open button, as a drag from the desktop does. */
async function drop(page: Page, files: readonly DroppedFile[]): Promise<void> {
  await dropFiles(page, openButton(page), files);
}

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

/** The count of panel's 1,200 variants on its one chromosome, done. */
async function expectPanelCounted(page: Page): Promise<void> {
  await expect(
    info(page).getByText("Variants: 1,200", { exact: true }),
  ).toBeVisible();
  await expect(
    info(page).getByText("Chromosomes: 1", { exact: true }),
  ).toBeVisible();
}

test("OV2 the page opens with its one heading and the open button alone, and no summary", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);

  await expect(page).toHaveTitle("Popnei");
  await expect(page.getByRole("heading")).toHaveText(["Popnei"]);
  await expect(openButton(page)).toHaveText("Open variants file…");
  // Nothing asks how a file is read: no ploidy and no box of the passed
  // variants.
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(opening(page).getByText(/^Drop a VCF/u)).toHaveCount(0);
  await expect(info(page)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("OV2 at 320 pixels the page does not scroll sideways, with no file and with one open", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await openPage(page);
  const sideways = (): Promise<number> =>
    page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
  expect(await sideways()).toBe(0);
  await pick(page, join(FIXTURES, "panel.vcf.gz"));
  await expectPanelCounted(page);
  expect(await sideways()).toBe(0);
});

test("OV2 panel.vcf.gz shows its individuals, its variants, its chromosomes and the ploidy read from it, then panel.nei its own", async ({
  page,
  makeAxeBuilder,
}) => {
  await recordAnnouncements(page);
  await openPage(page);
  await pick(page, join(FIXTURES, "panel.vcf.gz"));

  await expectPanelCounted(page);
  // The FILTER failures from the same pass: none of panel.vcf.gz.
  await expect(lines(page)).toHaveText([
    "panel.vcf.gz · 87 KB",
    "Individuals: 200",
    "Variants: 1,200",
    "FILTER failures: 0",
    "Chromosomes: 1",
    "Ploidy: 2",
  ]);
  await expect(info(page).getByRole("heading")).toHaveCount(0);
  // The box above the open button, and no table of the chromosomes.
  const boxAt = await info(page).boundingBox();
  const buttonAt = await openButton(page).boundingBox();
  if (boxAt === null || buttonAt === null) {
    throw new Error("the box or the button is not drawn");
  }
  expect(boxAt.y + boxAt.height).toBeLessThan(buttonAt.y);
  await expect(page.getByRole("table")).toHaveCount(0);
  // The read and the count, said together when they end within the
  // pause of the region.
  // Read from the record of the region; the end of the statistics, of
  // the same pass, may follow them in the same text, and nothing else.
  await expect
    .poll(() => announced(page))
    .toContainEqual(
      expect.stringMatching(
        /panel\.vcf\.gz: 1,200 variants on 1 chromosome\.( The statistics of panel\.vcf\.gz are calculated\.)?$/u,
      ),
    );
  expect((await announced(page)).some((text) => text.includes("FILTER"))).toBe(
    false,
  );
  await expect(openButton(page)).toHaveText("Open another variants file…");
  await expectNoViolations(makeAxeBuilder);

  await pick(page, join(FIXTURES, "panel.nei"));

  // No line of the FILTER failures: panel.nei, written before format 1.2
  // of the vars file, did not record the FILTER of its variants.
  await expect(lines(page)).toHaveText([
    "panel.nei · 261 KB",
    "Individuals: 200",
    "Variants: 1,200",
    "Chromosomes: 1",
    "Ploidy: 2",
  ]);
  await expectPanelCounted(page);
  await expectNoViolations(makeAxeBuilder);
});

test("OV2 bad.vcf is refused at the opening, with popnei's words", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  await pick(page, join(FIXTURES, "bad.vcf"));

  // The words in place of what the file would have told.
  await expect(lines(page)).toHaveText([
    "bad.vcf · 41 bytes",
    "popnei could not read bad.vcf: the source is not a VCF: it starts with \u201cThis is a line o\u201d. Open another file.",
  ]);
  await expectNoViolations(makeAxeBuilder);
});

test("OV2 bad_position.vcf.gz opens, and its count is refused at the line of the position that is not a number", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  await pick(page, join(FIXTURES, "bad_position.vcf.gz"));

  // The lines of the variants and the chromosomes in their places, and
  // the words of the refusal after the last line.
  await expect(lines(page)).toHaveText([
    /^bad_position\.vcf\.gz · /u,
    "Individuals: 200",
    "Variants: not counted",
    "FILTER failures: not counted",
    "Chromosomes: not counted",
    "Ploidy: 2",
    "popnei could not read bad_position.vcf.gz: line 84 of the VCF, the column POS: \u201cx80\u201d is not a position. Correct the file, or fetch it again, and open it again.",
  ]);
  // popnei's refusal comes again for the same file, so no Start again.
  await expect(
    info(page).getByRole("button", { name: "Start again" }),
  ).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("OV2 tetraploid.vcf.gz is opened with the ploidy popnei reads from it, 4", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  await pick(page, join(FIXTURES, "tetraploid.vcf.gz"));

  // popnei's numbers: 12 individuals of ploidy 4.
  await expect(
    info(page).getByText("Ploidy: 4", { exact: true }),
  ).toBeVisible();
  await expect(
    info(page).getByText("Individuals: 12", { exact: true }),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
});

test("OV2 no_ploidy.vcf.gz, whose genotypes are all single dots, is refused with words that give popnei's Python to open it with a ploidy, in lines of their own", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  await pick(page, join(FIXTURES, "no_ploidy.vcf.gz"));

  const words =
    "No genotype with alleles was found in the first 5 variants of no_ploidy.vcf.gz: their genotypes are missing, or the file has no genotypes (GT). popnei cannot read the ploidy of the file.";
  await expect(lines(page)).toHaveText([
    /^no_ploidy\.vcf\.gz · /u,
    words,
    "If the genotypes are missing, popnei's Python opens the file with its ploidy given, 2 for a diploid, and writes it as a .nei file, which this page opens:",
  ]);
  await expect(
    info(page).getByRole("region", { name: "popnei's Python" }),
  ).toHaveText(
    'import popnei\nvariants = popnei.open_vcf("no_ploidy.vcf.gz", ploidy=2, only_passed=False)\npopnei.write_vars(variants, "no_ploidy.nei")',
  );
  // The status region says the words, and not the lines of Python.
  await expect(page.getByRole("status").nth(1)).toContainText(words);
  await expect(page.getByRole("status").nth(1)).not.toContainText("popnei.");
  await expectNoViolations(makeAxeBuilder);
});

test("OV2 a dropped file of another kind, and several files at once, are not opened, and the page says why", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  const pops = await readFile(join(FIXTURES, "panel_pops.csv"), "utf8");

  await drop(page, [{ name: "panel_pops.csv", text: pops }]);

  const notOpened =
    "panel_pops.csv was not opened: a variants file is a VCF, whose name ends in .vcf, .vcf.gz or .vcf.bgz, or a .nei file. If it is one of them, rename it.";
  // With no file open, the box holds the words alone.
  await expect(lines(page)).toHaveText([notOpened]);
  await expect(page.getByRole("status")).toHaveText(["", notOpened]);
  await expectNoViolations(makeAxeBuilder);

  await drop(page, [
    { name: "a.vcf", text: "" },
    { name: "b.vcf", text: "" },
  ]);
  await expect(lines(page)).toHaveText(["Open one variants file at a time."]);
});

test("OV2 a file refused by its name while another is open is said in the box, after what the box says of the file open", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  await pick(page, join(FIXTURES, "panel.nei"));
  await expectPanelCounted(page);

  await pick(page, join(FIXTURES, "panel_pops.csv"));

  await expect(lines(page)).toHaveText([
    /^panel\.nei · /u,
    "Individuals: 200",
    "Variants: 1,200",
    "Chromosomes: 1",
    "Ploidy: 2",
    /^panel_pops\.csv was not opened: /u,
  ]);
  // The empty row under the lines, kept for the end of a count, goes
  // under a refusal, as under the words of a failure of the count: the
  // refusal follows the last line at the gap of the box, 8 pixels, and
  // not under a row of a button's height.
  const ploidy = await info(page)
    .getByText("Ploidy: 2", { exact: true })
    .boundingBox();
  const refusal = await info(page)
    .getByRole("paragraph")
    .filter({ hasText: /^panel_pops\.csv was not opened: /u })
    .boundingBox();
  if (ploidy === null || refusal === null) {
    throw new Error("the line of the ploidy or the refusal is not drawn");
  }
  expect(refusal.y - (ploidy.y + ploidy.height)).toBeLessThan(16);
  await expectNoViolations(makeAxeBuilder);
});

test("OV2 a count stopped says so, Start again counts the variants, and the box keeps its height at 320 pixels", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  // A VCF written for the test, whose pass lasts seconds, so that Stop is
  // pressed while it reads (testing.md, "The walking skeleton, as a
  // flow").
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 900 });
  const vcf = testInfo.outputPath("stop.vcf.gz");
  await writeBigVcf(vcf, STOP_VCF_VARIANTS);
  await openPage(page);
  await pick(page, vcf);
  const height = async (): Promise<number> =>
    (await info(page).boundingBox())?.height ?? Number.NaN;

  const bar = info(page).getByRole("progressbar", {
    name: "Counting the variants",
    exact: true,
  });
  await expect(bar).toBeVisible({ timeout: 30_000 });
  // The state of the count in place of the numbers of the variants and
  // the chromosomes, and the bar with Stop under the lines.
  await expect(lines(page)).toHaveText([
    /^stop\.vcf\.gz · /u,
    "Individuals: 1,000",
    // A result so far of the pass, 2 seconds after its start, gives the
    // variants and the chromosomes read so far in place of the count.
    /^Variants: (counting…( \d+%)?|[\d,]+ so far)$/u,
    /^FILTER failures: (counting…|[\d,]+ so far)$/u,
    /^Chromosomes: (counting…|[\d,]+ so far)$/u,
    "Ploidy: 2",
  ]);
  const counting = await height();
  const stop = info(page).getByRole("button", { name: "Stop" });
  await stop.click();

  await expect(lines(page)).toHaveText([
    /^stop\.vcf\.gz · /u,
    "Individuals: 1,000",
    "Variants: not counted",
    "FILTER failures: not counted",
    "Chromosomes: not counted",
    "Ploidy: 2",
  ]);
  expect(await height()).toBe(counting);
  const again = info(page).getByRole("button", { name: "Start again" });
  // One button in one place: the focus stays on it.
  await expect(again).toBeFocused();
  await expect(bar).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  await again.click();
  const counted = `Variants: ${STOP_VCF_VARIANTS.toLocaleString("en-US")}`;
  await expect(info(page).getByText(counted, { exact: true })).toBeVisible({
    timeout: 60_000,
  });
  expect(await height()).toBe(counting);
  // The button gone with the focus on it, at the end of the count, the
  // focus is on the lines of the variants and the chromosomes, not on the
  // top of the page.
  await expect(page.locator(":focus")).toHaveText(
    `${counted}FILTER failures: 0Chromosomes: 1`,
  );
  await expectNoViolations(makeAxeBuilder);

  // A file dropped with the mouse removes those lines with the focus:
  // the focus goes to the open button, not to the top.
  const nei = await readFile(join(FIXTURES, "panel.nei"));
  await drop(page, [{ name: "panel.nei", bytes: [...nei] }]);
  await expect(info(page).getByText(/^panel\.nei · /u)).toBeVisible();
  await expect(openButton(page)).toBeFocused();
});

/** Waits for the six plots of the statistics of the file and the
    download of the individuals, which comes with their result. */
async function expectPlotsDrawn(page: Page): Promise<void> {
  const stats = page.getByRole("region", { name: "Statistics of the file" });
  await expect(stats.locator("svg.chart")).toHaveCount(6, { timeout: 20_000 });
  await expect(
    stats.getByRole("button", { name: /^Download the missing genotypes/u }),
  ).toBeVisible();
}

/** A name of 24 characters, on which, at 320 pixels, the line "Reading
    <name>." took one row more than the line "<name> is open." (the
    review of 5 October 2026). */
const NAME_24 = `${"a".repeat(17)}.vcf.gz`;

for (const width of [320, 1280]) {
  test(`OV2 at ${String(width)} pixels, a file opened again keeps the box above the open button at one height through the read and the count, and the button is back at its place once the plots are drawn`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const vcf = testInfo.outputPath(NAME_24);
    await copyFile(join(FIXTURES, "panel.vcf.gz"), vcf);
    await recordAnnouncements(page);
    await openPage(page);
    await pick(page, vcf);
    await expectPanelCounted(page);
    // The height of the box at every change of it; the box of each file
    // is an element of its own, so it is found again at each change.
    await page.getByRole("main").evaluate((main) => {
      const box = (): Element | null =>
        main.querySelector('section[aria-label="File information"]');
      const heights: number[] = [box()?.getBoundingClientRect().height ?? 0];
      Reflect.set(window, "boxHeights", heights);
      new MutationObserver(() => {
        heights.push(box()?.getBoundingClientRect().height ?? 0);
      }).observe(main, {
        subtree: true,
        childList: true,
        characterData: true,
      });
    });
    // Its place in the page, not in the window: the second pick scrolls
    // the page to the button, which is under the statistics, and moves
    // down as their plots are drawn (docs/plans/live-stats.md, "The open
    // widget moves with the plots"), so it is taken once they are.
    const inPage = (): Promise<{
      readonly top: number;
      readonly left: number;
    }> =>
      openButton(page).evaluate((button) => {
        const box = button.getBoundingClientRect();
        return {
          top: box.top + window.scrollY,
          left: box.left + window.scrollX,
        };
      });
    await expectPlotsDrawn(page);
    const at = await inPage();

    await pick(page, vcf);
    // The count of the second opening said as that of the first, alone
    // or with it in one text of the region, when the second opening
    // comes within the pause the words of the statistics prolong.
    await expect
      .poll(
        async () =>
          (await announced(page))
            .join(" ")
            .split(": 1,200 variants on 1 chromosome.").length - 1,
      )
      .toBe(2);
    await expectPanelCounted(page);
    await expectPlotsDrawn(page);
    expect(await inPage()).toEqual(at);

    const heights = await page.evaluate(
      () => Reflect.get(window, "boxHeights") as number[],
    );
    // The read and the count went through their states.
    expect(heights.length).toBeGreaterThan(2);
    expect(new Set(heights).size).toBe(1);
  });
}

test("OV2 a file being read is announced once, by its name", async ({
  page,
  makeAxeBuilder,
}) => {
  // The wasm held back, so the read waits; the page opened before is
  // loaded again with the route in place.
  await openPage(page);
  await page.route("**/*.wasm", () => undefined);
  await page.reload();
  await pick(page, join(FIXTURES, "panel.vcf.gz"));

  await expect(page.getByRole("status")).toHaveText([
    "",
    "Reading panel.vcf.gz.",
  ]);
  // What is known before the read: the name and the size.
  await expect(lines(page)).toHaveText([
    "panel.vcf.gz · 87 KB",
    "Individuals: reading…",
    "Variants: reading…",
    "FILTER failures: reading…",
    "Chromosomes: reading…",
    "Ploidy: reading…",
    /^Reading the file\./u,
  ]);
  await expectNoViolations(makeAxeBuilder);
});

test("OV2 a file dropped while the focus is on Start again moves the focus to the open button, not to the top of the page", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const vcf = testInfo.outputPath("focus.vcf.gz");
  await writeBigVcf(vcf, STOP_VCF_VARIANTS);
  await openPage(page);
  await pick(page, vcf);
  await info(page)
    .getByRole("button", { name: "Stop" })
    .click({ timeout: 30_000 });
  const again = info(page).getByRole("button", { name: "Start again" });
  await expect(again).toBeFocused();

  const nei = await readFile(join(FIXTURES, "panel.nei"));
  await drop(page, [{ name: "panel.nei", bytes: [...nei] }]);

  await expect(info(page).getByText(/^panel\.nei · /u)).toBeVisible();
  await expect(openButton(page)).toBeFocused();
});

test("OV2 a gzipped VCF cut short opens, and its count says it could not be read to its end", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  await pick(page, join(FIXTURES, "cut_short.vcf.gz"));

  await expect(
    info(page).getByText(
      "cut_short.vcf.gz could not be read to its end: it may be damaged or cut short. Fetch or copy it again, and open it again.",
    ),
  ).toBeVisible();
  await expect(
    info(page).getByRole("button", { name: "Start again" }),
  ).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("OV2 ld.vcf.gz shows its 500 variants on two chromosomes", async ({
  page,
}) => {
  await openPage(page);
  await pick(page, join(FIXTURES, "ld.vcf.gz"));

  await expect(
    info(page).getByText("Variants: 500", { exact: true }),
  ).toBeVisible();
  await expect(
    info(page).getByText("Chromosomes: 2", { exact: true }),
  ).toBeVisible();
});

test("OV2 popnei-0.2.2 a VCF with variants that did not pass is read once, with every variant, whatever its FILTER column, and the box counts those that failed it from the same pass", async ({
  page,
  makeAxeBuilder,
}) => {
  await recordAnnouncements(page);
  await openPage(page);
  await pick(page, join(FIXTURES, "low_qual.vcf.gz"));

  // popnei 0.2.2's numbers under node: 900 of the 1,200 variants have
  // PASS, and the 300 with LowQual are read too and counted by the
  // summary's one pass.
  await expect(lines(page)).toHaveText([
    /^low_qual\.vcf\.gz · /u,
    "Individuals: 200",
    "Variants: 1,200",
    "FILTER failures: 300",
    "Chromosomes: 1",
    "Ploidy: 2",
  ]);
  await expect(info(page).getByRole("button")).toHaveCount(0);
  await expect(info(page).getByRole("progressbar")).toHaveCount(0);
  await expect
    .poll(() => announced(page))
    .toContainEqual(
      expect.stringContaining(
        "low_qual.vcf.gz: 1,200 variants on 1 chromosome.",
      ),
    );
  expect((await announced(page)).some((text) => text.includes("FILTER"))).toBe(
    false,
  );
  await expectNoViolations(makeAxeBuilder);
});

test("OV2 popnei-0.2.2 the FILTER failures of low_qual.vcf.gz while the pass runs: counting…, then those read so far, not counted after a Stop, and counted after Start again", async ({
  page,
  makeAxeBuilder,
}) => {
  await holdSummary(page);
  await openPage(page);
  await pick(page, join(FIXTURES, "low_qual.vcf.gz"));
  await expect(info(page).getByRole("progressbar")).toBeVisible({
    timeout: 30_000,
  });
  await expect(lines(page)).toHaveText([
    /^low_qual\.vcf\.gz · /u,
    "Individuals: 200",
    /^Variants: counting…( \d+%)?$/u,
    "FILTER failures: counting…",
    "Chromosomes: counting…",
    "Ploidy: 2",
  ]);
  // popnei reads the 1,200 variants in one block: its result so far is
  // of every variant.
  await release(page, "oneSoFar");
  await expect(lines(page)).toHaveText([
    /^low_qual\.vcf\.gz · /u,
    "Individuals: 200",
    "Variants: 1,200 so far",
    "FILTER failures: 300 so far",
    "Chromosomes: 1 so far",
    "Ploidy: 2",
  ]);
  await expectNoViolations(makeAxeBuilder);
  await info(page).getByRole("button", { name: "Stop" }).click();
  await expect(lines(page)).toHaveText([
    /^low_qual\.vcf\.gz · /u,
    "Individuals: 200",
    "Variants: not counted",
    "FILTER failures: not counted",
    "Chromosomes: not counted",
    "Ploidy: 2",
  ]);
  // Start again, in a new worker, served with its results held too: the
  // count once the result is let through.
  await info(page).getByRole("button", { name: "Start again" }).click();
  await expect(info(page).getByRole("progressbar")).toBeVisible();
  await release(page, "allSoFar");
  await release(page, "result");
  await expect(lines(page)).toHaveText([
    /^low_qual\.vcf\.gz · /u,
    "Individuals: 200",
    "Variants: 1,200",
    "FILTER failures: 300",
    "Chromosomes: 1",
    "Ploidy: 2",
  ]);
});

test("OV2 another file opened while a count runs ends on the numbers of that file, and the count is checked by axe while it runs", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  test.setTimeout(120_000);
  const vcf = testInfo.outputPath("long.vcf.gz");
  await writeBigVcf(vcf, STOP_VCF_VARIANTS);
  await openPage(page);
  await pick(page, vcf);
  await expect(
    info(page).getByRole("progressbar", {
      name: "Counting the variants",
      exact: true,
    }),
  ).toBeVisible({ timeout: 30_000 });
  await expectNoViolations(makeAxeBuilder);

  await pick(page, join(FIXTURES, "panel.nei"));

  await expect(info(page).getByText(/^panel\.nei · /u)).toBeVisible();
  await expectPanelCounted(page);
  await expect(info(page).getByText(/200,000/u)).toHaveCount(0);
});

test("OV2 the refusals of an opening and of a count are said in the status region", async ({
  page,
}) => {
  await openPage(page);
  await pick(page, join(FIXTURES, "bad.vcf"));
  await expect(page.getByRole("status")).toHaveText([
    "",
    /popnei could not read bad\.vcf: the source is not a VCF: it starts with \u201cThis is a line o\u201d\. Open another file\.$/u,
  ]);

  await pick(page, join(FIXTURES, "bad_position.vcf.gz"));
  await expect(page.getByRole("status")).toHaveText([
    "",
    /popnei could not read bad_position\.vcf\.gz: line 84 of the VCF, the column POS: \u201cx80\u201d is not a position\. Correct the file, or fetch it again, and open it again\.$/u,
  ]);
});

test("OV2 a crash of the worker during the opening goes to the error bar, and the box says only that the file could not be read", async ({
  page,
  makeAxeBuilder,
}) => {
  await crashWorkerOn(page, "open");
  await openPage(page);
  await pick(page, join(FIXTURES, "panel.vcf.gz"));

  await expect(lines(page)).toHaveText([
    /^panel\.vcf\.gz · /u,
    "panel.vcf.gz could not be read.",
  ]);
  await expect(page.getByRole("alert")).toHaveText(
    /^The application met an error of its own: .*a crash of the test.*\. Reload the page, and open your files again\.$/u,
  );
  await expectNoViolations(makeAxeBuilder);
});

test("OV2 a crash of the worker during the count goes to the error bar, which says to start again, as the box offers", async ({
  page,
  makeAxeBuilder,
}) => {
  await crashWorkerOn(page, "run");
  await openPage(page);
  await pick(page, join(FIXTURES, "panel.vcf.gz"));

  await expect(
    info(page).getByText(
      "The variants of panel.vcf.gz could not be counted, nor their statistics calculated.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    info(page).getByRole("button", { name: "Start again" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveText(
    /^The application stopped as it counted the variants and calculated the statistics: .*a crash of the test.*\. Start again, and if it stops again, reload the page and open your files again\.$/u,
  );
  await expectNoViolations(makeAxeBuilder);
});

test("OV2 an error of the page's own code shows the bar, which says to reload and open the files again, with no Save", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  await page.evaluate(() => {
    setTimeout(() => {
      throw new Error("test");
    });
  });

  await expect(page.getByRole("alert")).toHaveText(
    "The application met an error of its own: test. Reload the page, and open your files again.",
  );
  await expect(
    page.getByRole("button", { name: "Save the project" }),
  ).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("OV2 the start guard of popgen2.html: the code not found, the code that does not start, a browser too old", async ({
  page,
}) => {
  await page.route("**/assets/popgen2-*.js", (route) =>
    route.fulfill({ status: 404, body: "" }),
  );
  await page.goto("popgen2.html");
  await expect(
    page.getByText("The application could not be loaded. Reload the page.", {
      exact: true,
    }),
  ).toBeVisible();

  await page.unroute("**/assets/popgen2-*.js");
  await page.route("**/assets/popgen2-*.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/javascript",
      body: 'throw new Error("the entry failed.");',
    }),
  );
  await page.goto("popgen2.html");
  await expect(
    page.getByText(
      "The application could not start: Error: the entry failed. Reload the page.",
      { exact: true },
    ),
  ).toBeVisible();
});

test("OV2 the start guard of popgen2.html tells a browser without Array.prototype.toSorted that it is too old", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(Array.prototype, "toSorted");
  });
  await page.goto("popgen2.html");
  await expect(
    page.getByText(
      "The application needs Chrome or Edge 111, Firefox 115 or Safari 16.4, or a newer version, and this browser is older.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
