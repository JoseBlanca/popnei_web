/**
 * The buttons that open the files of popgen2.html, on the built site
 * (docs/plans/file-buttons.md, phase 1, 16 October 2026): before a file,
 * "Open variants file…" and "Open individuals file…" at the bottom of
 * their boxes, at the same height, the two boxes of the same height;
 * once a file is open, no zone and no such button in its box, "Open
 * another variants file…" at the end of the Variants tab under "Download
 * filtered variants…", and "Open another individuals file…" with
 * "Remove panel_pops.csv" at the end of the Individuals tab, side by side
 * at 1280 pixels and one under the other at 320, with no sideways scroll;
 * a file dropped on the zone at the end of a tab opens it, where the box
 * of a file open takes no drop since the owner's decision of 16 October
 * 2026 (e2e/strayDrops.spec.ts); the focus after an
 * opening by the box's button, on the box's heading, and after Remove, on
 * the box's button; axe, light and dark, on each of these states. And a
 * file refused in a tab's zone, its words under that zone, in the window
 * near the button, as well as in the box, said once (the review of the
 * phase, 16 October 2026).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { announced, recordAnnouncements } from "./announced.ts";
import { expect, test } from "./axe.ts";
import { dropFiles } from "./dropFiles.ts";
import {
  anotherOpenButton,
  fileBox,
  filePanel,
  fileTab,
  firstOpenButton,
  pickFile,
} from "./openFiles.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** Opens popgen2.html. */
async function openPage(page: Page): Promise<void> {
  await page.goto("popgen2.html");
  await expect(
    page.getByRole("heading", { level: 1, name: "Popnei" }),
  ).toBeVisible();
}

/** Opens panel.nei and waits for its statistics, the download of the
    filtered variants enabled. */
async function openVariants(page: Page): Promise<void> {
  await pickFile(page, "variants", join(FIXTURES, "panel.nei"));
  await expect(
    page.getByRole("button", { name: "Download filtered variants…" }),
  ).toBeEnabled({ timeout: 20_000 });
}

/** Opens panel_pops.csv and waits for its summary line in the box. */
async function openIndividuals(page: Page): Promise<void> {
  await pickFile(page, "individuals", join(FIXTURES, "panel_pops.csv"));
  await expect(
    fileBox(page, "individuals").getByText(
      "200 individuals classified in 3 populations",
    ),
  ).toBeVisible({ timeout: 20_000 });
}

/** The place and size of `locator` on the page, rounded to the pixel. */
async function boxOf(
  locator: Locator,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("the element has no box");
  return {
    x: Math.round(box.x),
    y: Math.round(box.y),
    width: Math.round(box.width),
    height: Math.round(box.height),
  };
}

/** Whether the page scrolls sideways. */
async function scrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
}

/** The words of the buttons of `scope` a user sees, in their order; not
    the hidden button of a zone that takes a paste, which has none. */
async function shownButtons(scope: Locator): Promise<string[]> {
  const names: string[] = [];
  for (const button of await scope.getByRole("button").all()) {
    const words = (await button.innerText()).trim();
    if (words !== "" && (await button.isVisible())) names.push(words);
  }
  return names;
}

/** axe on the page as it is, in the light and the dark theme. */
async function expectAxeBothSchemes(
  page: Page,
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  for (const scheme of ["light", "dark"] as const) {
    // No transition of the colours, which axe would read halfway.
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
  }
}

/** A folder dropped on `target`: a script cannot put a folder into a
    DataTransfer, so the item says it is a folder when React Aria asks
    for its entry of the file system, as the entry of a folder dragged
    from the desktop does; and is put back after the drop. */
async function dropFolder(page: Page, target: Locator): Promise<void> {
  const dataTransfer = await page.evaluateHandle(() => {
    Reflect.set(
      window,
      "popneiEntryOf",
      // eslint-disable-next-line @typescript-eslint/unbound-method -- put back after the drop, as it was
      DataTransferItem.prototype.webkitGetAsEntry,
    );
    DataTransferItem.prototype.webkitGetAsEntry = function () {
      return {
        isFile: false,
        isDirectory: true,
        name: "metadata",
      } as FileSystemEntry;
    };
    const transfer = new DataTransfer();
    transfer.items.add(new File([], "metadata"));
    return transfer;
  });
  for (const type of ["dragenter", "dragover", "drop"]) {
    await target.dispatchEvent(type, { dataTransfer });
  }
  await page.evaluate(() => {
    const entryOf: unknown = Reflect.get(window, "popneiEntryOf");
    if (typeof entryOf === "function") {
      DataTransferItem.prototype.webkitGetAsEntry =
        entryOf as DataTransferItem["webkitGetAsEntry"];
    }
  });
}

test("FB1 before a file, at 1280 pixels: each box ends with its button, the two buttons at the same height and the boxes of the same height, the box Variants holding the words of a folder dropped above its button; axe light and dark", async ({
  page,
  makeAxeBuilder,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPage(page);
  const variants = fileBox(page, "variants");
  const individuals = fileBox(page, "individuals");
  // Words in the box Variants alone, so that its lines are taller than
  // those of the box Individuals.
  await dropFolder(page, firstOpenButton(page, "variants"));
  await expect(
    variants.getByText(/not a folder\.$/u, { exact: false }),
  ).toBeVisible();

  const variantsBox = await boxOf(variants);
  const individualsBox = await boxOf(individuals);
  expect(individualsBox.y).toBe(variantsBox.y);
  expect(individualsBox.height).toBe(variantsBox.height);
  const variantsButton = await boxOf(firstOpenButton(page, "variants"));
  const individualsButton = await boxOf(firstOpenButton(page, "individuals"));
  expect(individualsButton.y).toBe(variantsButton.y);
  expect(individualsButton.height).toBe(variantsButton.height);
  // At the bottom: under the button, only the padding of its zone and of
  // its box, the same in both boxes.
  const variantsUnder =
    variantsBox.y +
    variantsBox.height -
    (variantsButton.y + variantsButton.height);
  expect(
    individualsBox.y +
      individualsBox.height -
      (individualsButton.y + individualsButton.height),
  ).toBe(variantsUnder);
  expect(variantsUnder).toBeLessThanOrEqual(40);
  await expectAxeBothSchemes(page, makeAxeBuilder);
});

test("FB1 with both files open, at 1280 pixels: the boxes of the same height, with no zone and no button that opens a file in them", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPage(page);
  await openVariants(page);
  await openIndividuals(page);
  // No zone: neither its button nor the hidden button that takes a
  // paste (the owner's decision of 16 October 2026).
  for (const kind of ["variants", "individuals"] as const) {
    await expect(
      fileBox(page, kind).getByRole("button", {
        name: /^(Open .*file…|Paste an? .* file)$/u,
      }),
    ).toHaveCount(0);
  }
  const variantsBox = await boxOf(fileBox(page, "variants"));
  const individualsBox = await boxOf(fileBox(page, "individuals"));
  expect(individualsBox.y).toBe(variantsBox.y);
  expect(individualsBox.height).toBe(variantsBox.height);
});

for (const width of [1280, 320]) {
  test(`FB1 at ${String(width)} pixels, the Variants tab ends with Open another variants file…, under Download filtered variants…, with no sideways scroll; axe light and dark`, async ({
    page,
    makeAxeBuilder,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await openPage(page);
    await openVariants(page);
    const panel = filePanel(page, "variants");
    const buttons = await shownButtons(panel);
    expect(buttons.at(-1)).toBe("Open another variants file…");
    expect(buttons.at(-2)).toBe("Download filtered variants…");
    const download = await boxOf(
      panel.getByRole("button", { name: "Download filtered variants…" }),
    );
    const another = await boxOf(anotherOpenButton(page, "variants"));
    expect(another.y).toBeGreaterThanOrEqual(download.y + download.height);
    expect(await scrollsSideways(page)).toBe(false);
    await anotherOpenButton(page, "variants").scrollIntoViewIfNeeded();
    await expectAxeBothSchemes(page, makeAxeBuilder);
  });

  test(`FB1 at ${String(width)} pixels, the Individuals tab ends with Open another individuals file… and Remove panel_pops.csv, ${width === 320 ? "one under the other" : "side by side"}, with no sideways scroll; axe light and dark`, async ({
    page,
    makeAxeBuilder,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await openPage(page);
    await openVariants(page);
    await openIndividuals(page);
    await fileTab(page, "individuals").click();
    const panel = filePanel(page, "individuals");
    const buttons = await shownButtons(panel);
    expect(buttons.slice(-2)).toEqual([
      "Open another individuals file…",
      "Remove panel_pops.csv",
    ]);
    const another = await boxOf(anotherOpenButton(page, "individuals"));
    const remove = await boxOf(
      panel.getByRole("button", { name: "Remove panel_pops.csv" }),
    );
    // Under the table of the file, the last of the tab before them.
    const table = await boxOf(
      panel.getByRole("grid", { name: "The table of panel_pops.csv" }),
    );
    expect(another.y).toBeGreaterThanOrEqual(table.y + table.height);
    // Side by side when they fit, one under the other when they do not.
    if (another.width + remove.width + 64 <= (await boxOf(panel)).width) {
      expect(remove.y).toBe(another.y);
      expect(remove.x).toBeGreaterThan(another.x + another.width);
    } else {
      expect(remove.y).toBeGreaterThanOrEqual(another.y + another.height);
    }
    if (width === 1280) expect(remove.y).toBe(another.y);
    expect(await scrollsSideways(page)).toBe(false);
    await anotherOpenButton(page, "individuals").scrollIntoViewIfNeeded();
    await expectAxeBothSchemes(page, makeAxeBuilder);
  });
}

test("FB1 a file dropped on the zone at the end of the Variants tab opens it, and one dropped on the zone at the end of the Individuals tab opens that", async ({
  page,
}) => {
  await openPage(page);
  await openVariants(page);
  await openIndividuals(page);
  await dropFiles(page, anotherOpenButton(page, "variants"), [
    {
      name: "second.nei",
      bytes: [...(await readFile(join(FIXTURES, "panel.nei")))],
    },
  ]);
  await expect(
    fileBox(page, "variants").getByText("second.nei", { exact: true }),
  ).toBeVisible({ timeout: 20_000 });

  await fileTab(page, "individuals").click();
  const pops = await readFile(join(FIXTURES, "panel_pops.csv"), "utf8");
  await dropFiles(page, anotherOpenButton(page, "individuals"), [
    { name: "other_pops.csv", text: pops },
  ]);
  await expect(
    fileBox(page, "individuals").getByText("other_pops.csv", { exact: true }),
  ).toBeVisible({ timeout: 20_000 });
});

test("FB1 an opening by the button of the box Variants puts the focus on the box's heading, as does one by the button of the box Individuals; Remove pressed by the keyboard puts it on Open individuals file… of the box", async ({
  page,
}) => {
  await openPage(page);
  const chooser = page.waitForEvent("filechooser");
  await firstOpenButton(page, "variants").press("Enter");
  await (await chooser).setFiles(join(FIXTURES, "panel.nei"));
  await expect(
    fileBox(page, "variants").getByRole("heading", { name: "Variants" }),
  ).toBeFocused();

  const individualsChooser = page.waitForEvent("filechooser");
  await firstOpenButton(page, "individuals").press("Enter");
  await (await individualsChooser).setFiles(join(FIXTURES, "panel_pops.csv"));
  await expect(
    fileBox(page, "individuals").getByRole("heading", {
      name: "Individuals",
    }),
  ).toBeFocused();
  await expect(
    fileBox(page, "individuals").getByText(
      "200 individuals classified in 3 populations",
    ),
  ).toBeVisible({ timeout: 20_000 });

  await fileTab(page, "individuals").click();
  await filePanel(page, "individuals")
    .getByRole("button", { name: "Remove panel_pops.csv" })
    .press("Enter");
  await expect(firstOpenButton(page, "individuals")).toBeFocused();
});

test("FB1 an opening by Open another variants file… keeps the focus on it, at the end of the Variants tab", async ({
  page,
}) => {
  await openPage(page);
  await openVariants(page);
  const another = anotherOpenButton(page, "variants");
  const chooser = page.waitForEvent("filechooser");
  await another.press("Enter");
  await (await chooser).setFiles(join(FIXTURES, "panel.vcf.gz"));
  await expect(
    fileBox(page, "variants").getByText("panel.vcf.gz", { exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(another).toBeFocused();
  await expect(page.locator("svg.chart")).toHaveCount(6, { timeout: 20_000 });
  await expect(another).toBeFocused();
});

/** Scrolls the page to its end. */
async function scrollToEnd(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
}

/** Expects `words` whole in the window, and under `button` by no more than
    `most` pixels. */
async function expectNear(
  words: Locator,
  button: Locator,
  most: number,
): Promise<void> {
  await expect(words).toBeVisible();
  await expect(words).toBeInViewport({ ratio: 1 });
  const at = await boxOf(words);
  const under = await boxOf(button);
  expect(at.y).toBeGreaterThanOrEqual(under.y + under.height);
  expect(at.y - (under.y + under.height)).toBeLessThanOrEqual(most);
}

test("FB2 a file refused in the Variants tab, picked with Open another variants file…, has its words under the tab's zone, in the window near the button, as well as in the box, and said once", async ({
  page,
  makeAxeBuilder,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await recordAnnouncements(page);
  await openPage(page);
  await openVariants(page);
  const words =
    "panel_pops.csv was not opened: a variants file is a VCF, whose name ends in .vcf, .vcf.gz or .vcf.bgz, or a .nei file. If it is one of them, rename it.";
  const button = anotherOpenButton(page, "variants");
  // Scrolled to the end of the page, where the button is, as a user is:
  // the words, which lengthen the page, are brought into the window.
  await scrollToEnd(page);
  const chooser = page.waitForEvent("filechooser");
  await button.click();
  await (await chooser).setFiles(join(FIXTURES, "panel_pops.csv"));
  // Before 16 October 2026 they were in the box alone, at the top of the
  // page, out of the window: at y 217 with the button at y 1725.
  await expectNear(
    filePanel(page, "variants").getByText(words, { exact: true }),
    button,
    48,
  );
  await expect(
    fileBox(page, "variants").getByText(words, { exact: true }),
  ).toHaveCount(1);
  await expect
    .poll(async () =>
      // The region adds each thing said after the last one, so a text
      // that ends with the words is one time they were said.
      (await announced(page)).filter((t) => t.endsWith(words)),
    )
    .toHaveLength(1);
  await expectAxeBothSchemes(page, makeAxeBuilder);

  // Gone with the next file opened.
  await pickFile(page, "variants", join(FIXTURES, "panel.nei"));
  await expect(page.getByText(words, { exact: true })).toHaveCount(0);
});

test("FB2 two files dropped on the zone at the end of the Individuals tab have their words under it, in the window near the button, as well as in the box, and said once", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await recordAnnouncements(page);
  await openPage(page);
  await openVariants(page);
  await openIndividuals(page);
  await fileTab(page, "individuals").click();
  const button = anotherOpenButton(page, "individuals");
  await scrollToEnd(page);
  const pops = await readFile(join(FIXTURES, "panel_pops.csv"), "utf8");
  await dropFiles(page, button, [
    { name: "a.csv", text: pops },
    { name: "b.csv", text: pops },
  ]);
  const words = "Open one individuals file at a time.";
  await expectNear(
    filePanel(page, "individuals").getByText(words, { exact: true }),
    button,
    48,
  );
  await expect(
    fileBox(page, "individuals").getByText(words, { exact: true }),
  ).toHaveCount(1);
  await expect
    .poll(async () =>
      // The region adds each thing said after the last one, so a text
      // that ends with the words is one time they were said.
      (await announced(page)).filter((t) => t.endsWith(words)),
    )
    .toHaveLength(1);
});
