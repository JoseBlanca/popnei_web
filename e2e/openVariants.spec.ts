/**
 * The new page of population genetics, popgen2.html, on the built site
 * (docs/plans/open-variants.md, phase 2): steps 1 and 2 of cases 1 and 2
 * of docs/use-cases.md, a variants file opened and what it holds; a file
 * popnei refuses at the opening and one whose count it refuses; a count
 * stopped and counted again; the ploidy changed, which reads the file
 * again; files of another kind dropped; axe at each state reached. What
 * is known of the file, and what went wrong with it, is in one box above
 * the open button (the owner's layout of 6 October 2026).
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

/** The table of the variants on each chromosome, under the box. */
function chromTable(page: Page): Locator {
  return page.getByRole("table", { name: "Variants on each chromosome" });
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
  await expect(info(page).getByText(/^Variants: 1,200( \(|$)/u)).toBeVisible();
  await expect(
    info(page).getByText("Chromosomes: 1", { exact: true }),
  ).toBeVisible();
  const table = chromTable(page);
  await expect(table.getByRole("row")).toHaveCount(2);
  await expect(
    table.getByRole("row", { name: "1 1,200" }).getByRole("rowheader"),
  ).toHaveText("1");
}

test("OV2 the page opens with its one heading, the button and the default ploidy on one row, the box under them, and no summary", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);

  await expect(page).toHaveTitle("Popnei");
  await expect(page.getByRole("heading")).toHaveText(["Popnei"]);
  await expect(openButton(page)).toHaveText("Open variants file…");
  const ploidy = page.getByRole("textbox", { name: "Default ploidy" });
  await expect(ploidy).toHaveValue("2");
  const box = page.getByRole("checkbox", {
    name: "Only the variants with PASS or . in the FILTER column",
  });
  await expect(box).toBeChecked();
  // The field beside the button, on its row; the box under them.
  const button = await openButton(page).boundingBox();
  const field = await ploidy.boundingBox();
  const boxAt = await page
    .getByText("Only the variants with PASS or . in the FILTER column", {
      exact: true,
    })
    .boundingBox();
  if (button === null || field === null || boxAt === null) {
    throw new Error("the button, the field or the box is not drawn");
  }
  expect(field.x).toBeGreaterThan(button.x + button.width);
  expect(
    Math.abs(field.y + field.height / 2 - (button.y + button.height / 2)),
  ).toBeLessThan(button.height / 2);
  expect(boxAt.y).toBeGreaterThan(button.y + button.height);
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

test("OV2 panel.vcf.gz shows its individuals, the ploidy given and its variants on each chromosome, then panel.nei its own", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  await pick(page, join(FIXTURES, "panel.vcf.gz"));

  await expectPanelCounted(page);
  await expect(lines(page)).toHaveText([
    "panel.vcf.gz · 87 KB",
    "Individuals: 200",
    "Variants: 1,200 (only those with PASS or . in the FILTER column)",
    "Chromosomes: 1",
    "Ploidy: 2 (the Default ploidy, not checked against the genotypes)",
  ]);
  await expect(info(page).getByRole("heading")).toHaveCount(0);
  // The box above the open button, and the table under the box.
  const boxAt = await info(page).boundingBox();
  const buttonAt = await openButton(page).boundingBox();
  const tableAt = await chromTable(page).boundingBox();
  if (boxAt === null || buttonAt === null || tableAt === null) {
    throw new Error("the box, the button or the table is not drawn");
  }
  expect(boxAt.y + boxAt.height).toBeLessThan(buttonAt.y);
  expect(tableAt.y).toBeGreaterThan(boxAt.y + boxAt.height);
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
    "Ploidy: 2 (given by the file)",
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
    "popnei could not read bad.vcf: the source is not a VCF: it starts with This is a line o. Open another file.",
  ]);
  await expect(chromTable(page)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("OV2 bad_position.vcf.gz opens, and its count is refused at the line of the position that is not a number", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  await pick(page, join(FIXTURES, "bad_position.vcf.gz"));

  // The words in place of the lines of the variants and the chromosomes.
  await expect(lines(page)).toHaveText([
    /^bad_position\.vcf\.gz · /u,
    "Individuals: 200",
    "popnei could not read bad_position.vcf.gz: line 84 of the VCF, the column POS: x80 is not a position. Correct the file, or fetch it again, and open it again.",
    /^Ploidy: 2 /u,
  ]);
  // popnei's refusal comes again for the same file, so no Count again.
  await expect(
    info(page).getByRole("button", { name: "Count again" }),
  ).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("OV2 a new ploidy reads the VCF again, and the summary says the ploidy given", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  await pick(page, join(FIXTURES, "panel.vcf.gz"));
  await expectPanelCounted(page);

  const ploidy = page.getByRole("textbox", {
    name: "Default ploidy",
  });
  await ploidy.fill("4");
  await ploidy.press("Enter");

  await expect(
    info(page).getByText(
      "Ploidy: 4 (the Default ploidy, not checked against the genotypes)",
    ),
  ).toBeVisible();
  await expectPanelCounted(page);
  await expectNoViolations(makeAxeBuilder);

  await page
    .getByText("Only the variants with PASS or . in the FILTER column", {
      exact: true,
    })
    .click();
  await expect(
    info(page).getByText("Variants: 1,200", { exact: true }),
  ).toBeVisible();
  await expectPanelCounted(page);
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

test("OV2 a file refused by its name while another is open is said in the box, over what the box says of the file open", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  await pick(page, join(FIXTURES, "panel.nei"));
  await expectPanelCounted(page);

  await pick(page, join(FIXTURES, "panel_pops.csv"));

  await expect(lines(page)).toHaveText([
    /^panel_pops\.csv was not opened: /u,
    /^panel\.nei · /u,
    "Individuals: 200",
    "Variants: 1,200",
    "Chromosomes: 1",
    "Ploidy: 2 (given by the file)",
  ]);
  await expectNoViolations(makeAxeBuilder);
});

test("OV2 a count stopped says so, and Count again counts the variants", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  // A VCF written for the test, whose pass lasts seconds, so that Stop is
  // pressed while it reads (testing.md, "The walking skeleton, as a
  // flow").
  test.setTimeout(120_000);
  const vcf = testInfo.outputPath("stop.vcf.gz");
  await writeBigVcf(vcf, STOP_VCF_VARIANTS);
  await openPage(page);
  await pick(page, vcf);

  const bar = info(page).getByRole("progressbar", {
    name: "Counting the variants",
  });
  await expect(bar).toBeVisible({ timeout: 30_000 });
  // The bar in place of the lines of the variants and the chromosomes.
  await expect(lines(page)).toHaveText([
    /^stop\.vcf\.gz · /u,
    "Individuals: 1,000",
    /^Counting the variants · /u,
    /^Ploidy: 2 /u,
  ]);
  const stop = info(page).getByRole("button", { name: "Stop" });
  await stop.click();

  await expect(lines(page)).toHaveText([
    /^stop\.vcf\.gz · /u,
    "Individuals: 1,000",
    "Counting the variants was stopped. Count again counts them from the start.",
    /^Ploidy: 2 /u,
  ]);
  const again = info(page).getByRole("button", { name: "Count again" });
  // One button in one place: the focus stays on it.
  await expect(again).toBeFocused();
  await expect(bar).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  await again.click();
  const counted = `Variants: ${STOP_VCF_VARIANTS.toLocaleString("en-US")} (only those with PASS or . in the FILTER column)`;
  await expect(info(page).getByText(counted)).toBeVisible({
    timeout: 60_000,
  });
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

/** The field of the ploidy. */
function ploidyField(page: Page): Locator {
  return page.getByRole("textbox", {
    name: "Default ploidy",
  });
}

const PASSED_LABEL = "Only the variants with PASS or . in the FILTER column";

test("OV2 with a ploidy typed and not committed, the first click on the open button opens the file picker", async ({
  page,
}) => {
  await openPage(page);
  await pick(page, join(FIXTURES, "panel.vcf.gz"));
  await expectPanelCounted(page);
  await ploidyField(page).fill("3");

  const chooser = page.waitForEvent("filechooser", { timeout: 5_000 });
  await openButton(page).click();
  await chooser;
});

test("OV2 with a ploidy typed and not committed, the first click on the box of the passed variants unticks it", async ({
  page,
}) => {
  await openPage(page);
  await pick(page, join(FIXTURES, "panel.vcf.gz"));
  await expectPanelCounted(page);
  await ploidyField(page).fill("3");

  await page.getByText(PASSED_LABEL, { exact: true }).click();

  await expect(
    page.getByRole("checkbox", { name: PASSED_LABEL }),
  ).not.toBeChecked();
});

/** A name of 24 characters, on which, at 320 pixels, the line "Reading
    <name>." took one row more than the line "<name> is open." (the
    review of 5 October 2026). */
const NAME_24 = `${"a".repeat(17)}.vcf.gz`;

/** The place of an element on the page. */
interface Place {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Records, from now on, the place of the element of `locator` as each
    press of the pointer starts and as its click is given, which is
    where a press that moved the element would be lost; the function
    returned gives the places recorded, in order. */
async function watchPlaceInPress(
  locator: Locator,
): Promise<() => Promise<Place[]>> {
  const name = `places${String(Math.random()).slice(2)}`;
  await locator.evaluate((element, key) => {
    const places: Place[] = [];
    Reflect.set(window, key, places);
    for (const type of ["pointerdown", "click"]) {
      window.addEventListener(
        type,
        () => {
          const { x, y, width, height } = element.getBoundingClientRect();
          places.push({ x, y, width, height });
        },
        true,
      );
    }
  }, name);
  return () =>
    locator.page().evaluate((key) => Reflect.get(window, key) as Place[], name);
}

for (const width of [320, 1280]) {
  for (const typed of ["3", "300"]) {
    test(`OV2 at ${String(width)} pixels, with a file of a long name open and the ploidy ${typed} typed, the first click on the open button opens the file picker`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      const vcf = testInfo.outputPath(NAME_24);
      await copyFile(join(FIXTURES, "panel.vcf.gz"), vcf);
      await openPage(page);
      await pick(page, vcf);
      await expectPanelCounted(page);
      await ploidyField(page).fill(typed);
      const places = await watchPlaceInPress(openButton(page));

      const chooser = page.waitForEvent("filechooser", { timeout: 5_000 });
      await openButton(page).click();
      await chooser;
      // Nothing above or beside the button changed as the field lost the
      // focus, whether its number was taken or refused: the button is
      // where the press started when its click is given. The box above
      // it changes when the file is read again, after the press.
      // The click on the button, and the one it gives the file input.
      const [down, ...clicks] = await places();
      expect(clicks.length).toBeGreaterThan(0);
      for (const click of clicks) expect(click).toEqual(down);
    });

    test(`OV2 at ${String(width)} pixels, with a file of a long name open and the ploidy ${typed} typed, the first click on the box of the passed variants unticks it`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      const vcf = testInfo.outputPath(NAME_24);
      await copyFile(join(FIXTURES, "panel.vcf.gz"), vcf);
      await openPage(page);
      await pick(page, vcf);
      await expectPanelCounted(page);
      await ploidyField(page).fill(typed);
      const label = page.getByText(PASSED_LABEL, { exact: true });
      const places = await watchPlaceInPress(label);

      await label.click();

      await expect(
        page.getByRole("checkbox", { name: PASSED_LABEL }),
      ).not.toBeChecked();
      if (typed === "300") {
        // In the section and not in the whole page: the status region,
        // which announces the refusal with the read of the box, may end
        // with the same words.
        await expect(
          opening(page).getByText(/the ploidy stays 2\.$/u),
        ).toBeVisible();
      }
      // Nothing above or beside the box moved it during the press: the
      // click on the label, and the one it gives the box, find it where
      // the press started.
      const [down, ...clicks] = await places();
      expect(clicks.length).toBeGreaterThan(0);
      for (const click of clicks) expect(click).toEqual(down);
    });
  }
}

for (const target of ["open button", "box of the passed variants"]) {
  test(`OV2 a ploidy committed by a press on the ${target} reads the file again only once the press has ended, so that the box above does not change under it`, async ({
    page,
  }) => {
    await openPage(page);
    await pick(page, join(FIXTURES, "panel.vcf.gz"));
    await expectPanelCounted(page);
    await ploidyField(page).fill("3");
    // Every change of the box, and the end of each press, in order.
    await info(page).evaluate((box) => {
      const events: string[] = [];
      Reflect.set(window, "pressEvents", events);
      new MutationObserver(() => {
        events.push("box");
      }).observe(box, { subtree: true, childList: true, characterData: true });
      window.addEventListener(
        "pointerup",
        () => {
          events.push("up");
        },
        true,
      );
    });
    const pressed =
      target === "open button"
        ? openButton(page)
        : page.getByText(PASSED_LABEL, { exact: true });
    const at = await pressed.boundingBox();
    if (at === null) throw new Error(`the ${target} is not drawn`);
    if (target === "open button") {
      // The file picker the click opens is closed without a file.
      page.on("filechooser", () => undefined);
    }

    await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2);
    await page.mouse.down();
    if (target === "open button") {
      // The press took the focus, and the ploidy was committed; the box
      // of the passed variants takes it at the click.
      await expect(ploidyField(page)).not.toBeFocused();
    }
    await page.mouse.up();

    await expect(
      info(page).getByText(
        "Ploidy: 3 (the Default ploidy, not checked against the genotypes)",
      ),
    ).toBeVisible();
    await expectPanelCounted(page);
    const events = await page.evaluate(
      () => Reflect.get(window, "pressEvents") as string[],
    );
    expect(events[0]).toBe("up");
    expect(events).toContain("box");
  });
}

test("OV2 a click between the label of the ploidy and its field leaves the focus in the field, and one between the open button and the label does not give it to the zone's hidden button", async ({
  page,
}) => {
  await openPage(page);
  const field = ploidyField(page);
  await field.click();
  await field.selectText();
  await page.keyboard.type("4");
  const at = await field.boundingBox();
  if (at === null) throw new Error("the field is not drawn");

  // Just before the field, where the label and the field meet.
  await page.mouse.click(at.x - 3, at.y + at.height / 2);
  await page.keyboard.type("3");

  await expect(field).toBeFocused();
  await expect(field).toHaveValue("43");

  // Just after the open button, where it and the label meet.
  const button = await openButton(page).boundingBox();
  if (button === null) throw new Error("the button is not drawn");
  await page.mouse.click(
    button.x + button.width + 3,
    button.y + button.height / 2,
  );
  await expect(
    page.getByRole("button", { name: "Paste a variants file" }),
  ).not.toBeFocused();
});

test("OV2 a file dropped with a ploidy typed is read with it, and the file open before is not read again", async ({
  page,
}) => {
  // Every text the status region holds, in order.
  await page.addInitScript(() => {
    const texts: string[] = [];
    Reflect.set(window, "statusTexts", texts);
    new MutationObserver(() => {
      for (const region of document.querySelectorAll("[role=status]")) {
        const text = region.textContent;
        if (text !== "" && texts.at(-1) !== text) texts.push(text);
      }
    }).observe(document, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  });
  await openPage(page);
  await pick(page, join(FIXTURES, "panel.vcf.gz"));
  await expectPanelCounted(page);
  await ploidyField(page).fill("3");

  const vcf = await readFile(join(FIXTURES, "panel.vcf.gz"));
  await drop(page, [{ name: "other.vcf.gz", bytes: [...vcf] }]);

  await expect(
    info(page).getByText(/^Ploidy: 3 \(the Default ploidy/u),
  ).toBeVisible();
  await expect(info(page).getByText(/^other\.vcf\.gz · /u)).toBeVisible();
  await expectPanelCounted(page);
  const statusTexts = (): Promise<string[]> =>
    page.evaluate(() => Reflect.get(window, "statusTexts") as string[]);
  await expect
    .poll(async () => (await statusTexts()).join(" "))
    .toContain("other.vcf.gz: 1,200 variants on 1 chromosome.");
  // The file open before was not read again with the new ploidy.
  const said = (await statusTexts()).join(" ");
  expect(said).toContain(
    "Reading other.vcf.gz, with ploidy 3 and only the variants with PASS or . in the FILTER column.",
  );
  expect(said).not.toContain("Reading panel.vcf.gz, with ploidy 3");
});

test("OV2 the options set are kept when a .nei file is opened, and the next VCF is read with them", async ({
  page,
}) => {
  await openPage(page);
  await ploidyField(page).fill("4");
  await ploidyField(page).press("Enter");
  await page.getByText(PASSED_LABEL, { exact: true }).click();

  await pick(page, join(FIXTURES, "panel.nei"));
  await expectPanelCounted(page);
  await expect(ploidyField(page)).toHaveValue("4");
  await expect(
    page.getByRole("checkbox", { name: PASSED_LABEL }),
  ).not.toBeChecked();

  await pick(page, join(FIXTURES, "panel.vcf.gz"));
  await expect(
    info(page).getByText(/^Ploidy: 4 \(the Default ploidy/u),
  ).toBeVisible();
  await expect(
    info(page).getByText("Variants: 1,200", { exact: true }),
  ).toBeVisible();
});

test("OV2 a file being read is announced once, with the ploidy it is read with", async ({
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
    "Reading panel.vcf.gz, with ploidy 2 and only the variants with PASS or . in the FILTER column.",
  ]);
  // What is known before the read: the name, the size and the ploidy
  // given.
  await expect(lines(page)).toHaveText([
    "panel.vcf.gz · 87 KB",
    /^Individuals: reading the file\./u,
    "Variants: not counted yet",
    "Chromosomes: not counted yet",
    "Ploidy: 2 (the Default ploidy, not checked against the genotypes)",
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

test("OV2 ld.vcf.gz shows its two chromosomes with their variants", async ({
  page,
}) => {
  await openPage(page);
  await pick(page, join(FIXTURES, "ld.vcf.gz"));

  await expect(
    info(page).getByText(
      "Variants: 500 (only those with PASS or . in the FILTER column)",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    info(page).getByText("Chromosomes: 2", { exact: true }),
  ).toBeVisible();
  const table = chromTable(page);
  // popnei's numbers: 250 variants on chr1 and 250 on chr2.
  await expect(table.getByRole("row")).toHaveText([
    "ChromosomeVariants",
    "chr1250",
    "chr2250",
  ]);
});

test("OV2 the box of the passed variants changes the count of a VCF with variants that did not pass", async ({
  page,
}) => {
  await openPage(page);
  await pick(page, join(FIXTURES, "low_qual.vcf.gz"));

  // popnei's numbers: 900 of the 1,200 variants have PASS.
  await expect(
    info(page).getByText(
      "Variants: 900 (only those with PASS or . in the FILTER column)",
      { exact: true },
    ),
  ).toBeVisible();

  await page.getByText(PASSED_LABEL, { exact: true }).click();

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
    /popnei could not read bad\.vcf: the source is not a VCF: it starts with This is a line o\. Open another file\.$/u,
  ]);

  await pick(page, join(FIXTURES, "bad_position.vcf.gz"));
  await expect(page.getByRole("status")).toHaveText([
    "",
    /popnei could not read bad_position\.vcf\.gz: line 84 of the VCF, the column POS: x80 is not a position\. Correct the file, or fetch it again, and open it again\.$/u,
  ]);
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
