/**
 * The new page of population genetics, popgen2.html, on the built site
 * (docs/plans/open-variants.md, phase 2): steps 1 and 2 of cases 1 and 2
 * of docs/use-cases.md, a variants file opened and what it holds; a file
 * popnei refuses at the opening and one whose count it refuses; a count
 * stopped and counted again; the ploidy read from the file, and a file
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
import { crashWorkerOn } from "./crashWorker.ts";

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

/** Drops files of the names and texts `files` on the zone, as a drag from
    the desktop does. */
async function drop(
  page: Page,
  files: readonly (
    | { readonly name: string; readonly text: string }
    | { readonly name: string; readonly bytes: readonly number[] }
  )[],
): Promise<void> {
  const dataTransfer = await page.evaluateHandle((given) => {
    // A file a script puts into a DataTransfer has no entry of the file
    // system in Chromium, and React Aria skips an item without one; so
    // the item says it is a file.
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
    const transfer = new DataTransfer();
    for (const file of given) {
      const content = "text" in file ? file.text : new Uint8Array(file.bytes);
      transfer.items.add(new File([content], file.name));
    }
    return transfer;
  }, files);
  const target = openButton(page);
  for (const type of ["dragenter", "dragover", "drop"]) {
    await target.dispatchEvent(type, { dataTransfer });
  }
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
  await openPage(page);
  await pick(page, join(FIXTURES, "panel.vcf.gz"));

  await expectPanelCounted(page);
  await expect(lines(page)).toHaveText([
    "panel.vcf.gz · 87 KB",
    "Individuals: 200",
    "Variants: 1,200",
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
  await expect(page.getByRole("status")).toHaveText([
    "",
    /panel\.vcf\.gz: 1,200 variants on 1 chromosome\.$/u,
  ]);
  await expect(openButton(page)).toHaveText("Open another variants file…");
  await expectNoViolations(makeAxeBuilder);

  await pick(page, join(FIXTURES, "panel.nei"));

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
    "Chromosomes: not counted",
    "Ploidy: 2",
    "popnei could not read bad_position.vcf.gz: line 84 of the VCF, the column POS: \u201cx80\u201d is not a position. Correct the file, or fetch it again, and open it again.",
  ]);
  // popnei's refusal comes again for the same file, so no Count again.
  await expect(
    info(page).getByRole("button", { name: "Count again" }),
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

test("OV2 a count stopped says so, Count again counts the variants, and the box keeps its height at 320 pixels", async ({
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
  });
  await expect(bar).toBeVisible({ timeout: 30_000 });
  // The state of the count in place of the numbers of the variants and
  // the chromosomes, and the bar with Stop under the lines.
  await expect(lines(page)).toHaveText([
    /^stop\.vcf\.gz · /u,
    "Individuals: 1,000",
    /^Variants: counting…( \d+%)?$/u,
    "Chromosomes: counting…",
    "Ploidy: 2",
  ]);
  const counting = await height();
  const stop = info(page).getByRole("button", { name: "Stop" });
  await stop.click();

  await expect(lines(page)).toHaveText([
    /^stop\.vcf\.gz · /u,
    "Individuals: 1,000",
    "Variants: not counted",
    "Chromosomes: not counted",
    "Ploidy: 2",
  ]);
  expect(await height()).toBe(counting);
  const again = info(page).getByRole("button", { name: "Count again" });
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
  // The button gone with the focus on it, the focus is on the lines of
  // the variants and the chromosomes, not on the top of the page.
  await expect(page.locator(":focus")).toHaveText(`${counted}Chromosomes: 1`);
  await expectNoViolations(makeAxeBuilder);

  // A file dropped with the mouse removes those lines with the focus:
  // the focus goes to the open button, not to the top.
  const nei = await readFile(join(FIXTURES, "panel.nei"));
  await drop(page, [{ name: "panel.nei", bytes: [...nei] }]);
  await expect(info(page).getByText(/^panel\.nei · /u)).toBeVisible();
  await expect(openButton(page)).toBeFocused();
});

/** A name of 24 characters, on which, at 320 pixels, the line "Reading
    <name>." took one row more than the line "<name> is open." (the
    review of 5 October 2026). */
const NAME_24 = `${"a".repeat(17)}.vcf.gz`;

for (const width of [320, 1280]) {
  test(`OV2 at ${String(width)} pixels, a file opened again keeps the box above the open button at one height through the read and the count, so the button does not move`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const vcf = testInfo.outputPath(NAME_24);
    await copyFile(join(FIXTURES, "panel.vcf.gz"), vcf);
    await openPage(page);
    await pick(page, vcf);
    await expectPanelCounted(page);
    // The height of the box at every change of it.
    await info(page).evaluate((box) => {
      const heights: number[] = [box.getBoundingClientRect().height];
      Reflect.set(window, "boxHeights", heights);
      new MutationObserver(() => {
        heights.push(box.getBoundingClientRect().height);
      }).observe(box, { subtree: true, childList: true, characterData: true });
    });
    const at = await openButton(page).boundingBox();
    if (at === null) throw new Error("the open button is not drawn");

    await pick(page, vcf);
    await expect(page.getByRole("status")).toHaveText([
      "",
      /: 1,200 variants on 1 chromosome\.$/u,
    ]);
    await expectPanelCounted(page);
    expect(await openButton(page).boundingBox()).toEqual(at);

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
    "Chromosomes: reading…",
    "Ploidy: reading…",
    /^Reading the file\./u,
  ]);
  await expectNoViolations(makeAxeBuilder);
});

test("OV2 a file dropped while the focus is on Count again moves the focus to the open button, not to the top of the page", async ({
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
  const again = info(page).getByRole("button", { name: "Count again" });
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
    info(page).getByRole("button", { name: "Count again" }),
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

test("OV2 a VCF with variants that did not pass is read with every variant, whatever its FILTER column", async ({
  page,
}) => {
  await openPage(page);
  await pick(page, join(FIXTURES, "low_qual.vcf.gz"));

  // popnei's numbers: 900 of the 1,200 variants have PASS, and the 300
  // with LowQual are read too.
  await expect(
    info(page).getByText("Variants: 1,200", { exact: true }),
  ).toBeVisible();
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
    info(page).getByRole("progressbar", { name: "Counting the variants" }),
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

test("OV2 a crash of the worker during the count goes to the error bar, which says to count again, as the box offers", async ({
  page,
  makeAxeBuilder,
}) => {
  await crashWorkerOn(page, "run");
  await openPage(page);
  await pick(page, join(FIXTURES, "panel.vcf.gz"));

  await expect(
    info(page).getByText("The variants of panel.vcf.gz could not be counted.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    info(page).getByRole("button", { name: "Count again" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveText(
    /^The application stopped as it counted the variants: .*a crash of the test.*\. Count again, and if it stops again, reload the page and open your files again\.$/u,
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
