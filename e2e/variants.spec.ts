/**
 * The Variants step on the built site (docs/specs/steps/variants.md, "How
 * it is checked"): a file picked with the button or dropped, what the card
 * shows of a `.nei` file and of a VCF, a VCF read again with another
 * ploidy, a file popnei refused, a file of another name, and the missing
 * data filter; axe at each state reached.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The words under the ploidy. */
const PLOIDY_LINE =
  "A VCF does not say its ploidy, so it is given here. If it is wrong, the first analysis stops with a message that names the line and the individual, and the file is read again with the right ploidy.";

async function openVariants(page: Page): Promise<void> {
  await page.goto("popgen.html#variants");
  await expect(
    page.getByRole("heading", { level: 1, name: "Variants" }),
  ).toBeVisible();
}

function zone(page: Page): Locator {
  return page.getByRole("region", { name: "Variants file" });
}

/** The button of the zone, whatever its words. */
function fileButton(page: Page): Locator {
  return zone(page).getByRole("button", { name: /^(Choose|Replace) .*…$/ });
}

/** Picks `fixture` with the file button, as a user does, through the
    file picker of the system. */
async function pick(page: Page, fixture: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await fileButton(page).click();
  await (await chooser).setFiles(join(FIXTURES, fixture));
}

/** Picks a file of the name `name` with the given text. */
async function pickNamed(
  page: Page,
  name: string,
  text: string,
): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await fileButton(page).click();
  await (
    await chooser
  ).setFiles({ name, mimeType: "text/plain", buffer: Buffer.from(text) });
}

/** Drops the files `fixtures` on the zone, as a drag from the desktop
    does: the events of a drag and drop with their files, on the button
    inside the zone, from where they reach the zone. */
async function drop(page: Page, fixtures: readonly string[]): Promise<void> {
  const files = await Promise.all(
    fixtures.map(async (name) => ({
      name,
      bytes: [...(await readFile(join(FIXTURES, name)))],
    })),
  );
  const dataTransfer = await page.evaluateHandle((given) => {
    // A file a script puts into a DataTransfer has no entry of the file
    // system in Chromium, which a file dragged from the desktop has, and
    // React Aria skips an item without one; so the item says it is a file.
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
      transfer.items.add(new File([new Uint8Array(file.bytes)], file.name));
    }
    return transfer;
  }, files);
  const target = fileButton(page);
  for (const type of ["dragenter", "dragover", "drop"]) {
    await target.dispatchEvent(type, { dataTransfer });
  }
}

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

test("WS7 D3 panel.nei picked with the button shows 200 individuals and ploidy 2, and the focus stays on the button", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await expect(fileButton(page)).toHaveText("Choose a variants file…");
  await expectNoViolations(makeAxeBuilder);

  await pick(page, "panel.nei");

  const card = zone(page);
  await expect(card.getByText("200 individuals")).toBeVisible();
  await expect(card.getByText("Ploidy 2", { exact: true })).toBeVisible();
  await expect(card.getByText(".nei file · 261.5 kB")).toBeVisible();
  await expect(
    card.getByText(
      "Variants: not counted yet; the first analysis that reads the whole file counts them",
    ),
  ).toBeVisible();
  await expect(card.getByText(/^Read with/)).toHaveCount(0);
  await expect(fileButton(page)).toHaveText("Replace panel.nei…");
  await expect(fileButton(page)).toBeFocused();
  await expectNoViolations(makeAxeBuilder);
});

test("WS7 D3 a file dropped on the card replaces the one there, and the focus stays on the button", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await expect(zone(page).getByText("200 individuals")).toBeVisible();
  await expect(fileButton(page)).toBeFocused();

  await drop(page, ["tetraploid.vcf.gz"]);

  await expect(fileButton(page)).toHaveText("Replace tetraploid.vcf.gz…");
  await expect(zone(page).getByText("12 individuals")).toBeVisible();
  await expect(zone(page).getByText("panel.nei")).toHaveCount(0);
  await expect(fileButton(page)).toBeFocused();
  await expectNoViolations(makeAxeBuilder);
});

test("WS7 D3 panel.vcf.gz shows the line of how it was read", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "panel.vcf.gz");

  const card = zone(page);
  await expect(card.getByText("200 individuals")).toBeVisible();
  await expect(card.getByText("VCF · 87.3 kB")).toBeVisible();
  await expect(
    card.getByText(
      "Read with ploidy 2, only the variants with PASS or . in the FILTER column",
    ),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
});

test("WS7 D3 another file picked replaces the first", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await expect(zone(page).getByText("200 individuals")).toBeVisible();

  await pick(page, "tetraploid.vcf.gz");

  await expect(fileButton(page)).toHaveText("Replace tetraploid.vcf.gz…");
  await expect(zone(page).getByText("12 individuals")).toBeVisible();
  await expect(zone(page).getByText("200 individuals")).toHaveCount(0);
  await expect(zone(page).getByText("panel.nei")).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("WS7 D3 tetraploid.vcf.gz read with ploidy 2 shows 12 individuals and ploidy 2", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await expect(page.getByLabel("Ploidy of the VCF")).toHaveValue("2");
  await expect(page.getByText(PLOIDY_LINE)).toBeVisible();

  await pick(page, "tetraploid.vcf.gz");

  const card = zone(page);
  await expect(card.getByText("12 individuals")).toBeVisible();
  await expect(card.getByText("Ploidy 2", { exact: true })).toBeVisible();
  await expect(card.getByText(/^Read with ploidy 2,/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Read .* again/ }),
  ).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("WS7 D3 the ploidy set to 4 and the VCF read again show ploidy 4, and the focus goes to the file button", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "tetraploid.vcf.gz");
  await expect(zone(page).getByText("Ploidy 2", { exact: true })).toBeVisible();

  const ploidy = page.getByLabel("Ploidy of the VCF");
  await ploidy.fill("4");
  await ploidy.press("Tab");
  const again = page.getByRole("button", {
    name: "Read tetraploid.vcf.gz again with ploidy 4",
  });
  // The Tab key went from the ploidy to the check box, and on to the button.
  await expect(
    page.getByRole("checkbox", {
      name: "Only the variants with PASS or . in the FILTER column",
    }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(again).toBeFocused();
  await expectNoViolations(makeAxeBuilder);

  await page.keyboard.press("Enter");

  const card = zone(page);
  await expect(card.getByText("Ploidy 4", { exact: true })).toBeVisible();
  await expect(card.getByText("12 individuals")).toBeVisible();
  await expect(
    card.getByText(
      "Read with ploidy 4, only the variants with PASS or . in the FILTER column",
    ),
  ).toBeVisible();
  await expect(again).toHaveCount(0);
  await expect(fileButton(page)).toBeFocused();
  await expect(ploidy).toHaveValue("4");
  await expectNoViolations(makeAxeBuilder);
});

test("WS7 D3 bad.vcf shows the reason popnei refused it", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "bad.vcf");

  await expect(
    zone(page).getByText(
      "popnei could not read bad.vcf: the source is not a VCF: it starts with `This is a line o`. Load a variants file in the Variants step.",
    ),
  ).toBeVisible();
  await expect(fileButton(page)).toHaveText("Replace bad.vcf…");
  await expectNoViolations(makeAxeBuilder);
});

test("WS7 D3 panel.txt is not loaded, and the step says why and announces it", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pickNamed(page, "panel.txt", "not a variants file");

  const message =
    "panel.txt was not loaded: the Variants step reads a VCF, whose name ends in .vcf, .vcf.gz or .vcf.bgz, or a .nei file. If it is one of them, rename it.";
  await expect(page.getByText(message)).toBeVisible();
  await expect(page.getByRole("status").last()).toHaveText(message);
  await expect(fileButton(page)).toHaveText("Choose a variants file…");
  await expect(fileButton(page)).toBeFocused();
  await expectNoViolations(makeAxeBuilder);

  // The next pick takes the message away.
  await pick(page, "panel.nei");
  await expect(zone(page).getByText("200 individuals")).toBeVisible();
  await expect(page.getByRole("main").getByText(message)).toHaveCount(0);
});

test("WS7 D3 several files dropped at once load none", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await drop(page, ["panel.nei", "panel.vcf.gz"]);

  await expect(
    page.getByText("Drop one variants file at a time.", { exact: true }),
  ).toBeVisible();
  await expect(fileButton(page)).toHaveText("Choose a variants file…");
  await expectNoViolations(makeAxeBuilder);
});

test("WS7 D3 0.125 typed in the threshold is held as 0.12, and 0.135 as 0.14, rounded to the step as React Aria rounds", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  const filter = page.getByRole("switch", {
    name: "Filter the variants by missing data",
  });
  await expect(filter).toBeChecked();
  const threshold = page.getByLabel("Maximum proportion of missing genotypes");
  await expect(threshold).toHaveValue("0.1");

  // React Aria takes the remainder by the step in floating point, so one
  // half goes down and the other up (the spec, "The missing data filter").
  await threshold.fill("0.125");
  await threshold.press("Enter");
  await expect(threshold).toHaveValue("0.12");
  await threshold.fill("0.135");
  await threshold.press("Enter");
  await expect(threshold).toHaveValue("0.14");

  // Left empty, it shows again the value it had.
  await threshold.fill("");
  await threshold.press("Shift+Tab");
  await expect(threshold).toHaveValue("0.14");
  await expect(filter).toBeFocused();
  await expectNoViolations(makeAxeBuilder);

  // Off, the field goes; on again, it has the default.
  await page.keyboard.press("Space");
  await expect(filter).not.toBeChecked();
  await expect(threshold).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
  await page.keyboard.press("Space");
  await expect(threshold).toHaveValue("0.1");
});

test("WS7 D3 a file picked before popnei has loaded is shown as being read", async ({
  page,
  makeAxeBuilder,
}) => {
  // The wasm is held back, so the read waits for the calculation worker.
  await page.route("**/*.wasm", () => undefined);
  await openVariants(page);
  await pick(page, "panel.nei");

  await expect(zone(page).getByText("Reading panel.nei.")).toBeVisible();
  await expect(zone(page).getByText("1 second so far.")).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
});

test("WS7 D3 the keyboard goes through the step in the order of the spec", async ({
  page,
}) => {
  await openVariants(page);
  await pick(page, "panel.vcf.gz");
  await expect(zone(page).getByText("200 individuals")).toBeVisible();
  await expect(fileButton(page)).toBeFocused();

  const order = [
    page.getByLabel("Ploidy of the VCF"),
    page.getByRole("checkbox", {
      name: "Only the variants with PASS or . in the FILTER column",
    }),
    page.getByRole("switch", { name: "Filter the variants by missing data" }),
    page.getByLabel("Maximum proportion of missing genotypes"),
  ];
  for (const next of order) {
    await page.keyboard.press("Tab");
    await expect(next).toBeFocused();
  }

  // Unchecked, the check box brings the button that reads the file again,
  // after it in the order.
  await order[1]?.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", {
      name: "Read panel.vcf.gz again with every variant",
    }),
  ).toBeFocused();
});
