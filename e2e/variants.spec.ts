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
  "A VCF does not say its ploidy, so it is given here. If it is wrong, the first analysis stops with a message that names the line and the individual; set the right ploidy here and read the file again.";

/** The line under the switch of the missing data filter, the last part
    of the description of its field. */
const MISSING_DATA_LINE =
  "A genotype is missing when any of its alleles is, 0/. among them; the proportion is over every individual of the file.";

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

/** Drops a folder on the zone. A script cannot put a folder into a
    DataTransfer, so the item of a file says, when React Aria asks for its
    entry of the file system, that it is a folder, as the entry of a
    folder dragged from the desktop does. */
async function dropFolder(page: Page): Promise<void> {
  const dataTransfer = await page.evaluateHandle(() => {
    DataTransferItem.prototype.webkitGetAsEntry = function () {
      return {
        isFile: false,
        isDirectory: true,
        name: "panel",
      } as FileSystemEntry;
    };
    const transfer = new DataTransfer();
    transfer.items.add(new File([], "panel"));
    return transfer;
  });
  const target = fileButton(page);
  for (const type of ["dragenter", "dragover", "drop"]) {
    await target.dispatchEvent(type, { dataTransfer });
  }
}

/** Drops a piece of text on the zone, as a drag of selected text from
    another window does. */
async function dropText(page: Page, text: string): Promise<void> {
  const dataTransfer = await page.evaluateHandle((given) => {
    const transfer = new DataTransfer();
    transfer.setData("text/plain", given);
    return transfer;
  }, text);
  const target = fileButton(page);
  for (const type of ["dragenter", "dragover", "drop"]) {
    await target.dispatchEvent(type, { dataTransfer });
  }
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
      transfer.items.add(new File([new Uint8Array(file.bytes)], file.name));
    }
    return transfer;
  }, files);
  const target = fileButton(page);
  for (const type of ["dragenter", "dragover", "drop"]) {
    await target.dispatchEvent(type, { dataTransfer });
  }
}

/** Unchecks the check box of the passed variants with the mouse, on its
    words, as a user does. */
async function uncheckPassed(page: Page): Promise<void> {
  const name = "Only the variants with PASS or . in the FILTER column";
  await page.getByText(name, { exact: true }).click();
  await expect(page.getByRole("checkbox", { name })).not.toBeChecked();
}

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

test("WS7 D3 panel.nei picked with the button shows 200 individuals and ploidy 2, the ploidy of the file, and the focus stays on the button", async ({
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
  await expect(card.getByText(".nei file · 261 KB")).toBeVisible();
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

test("WS7 D3 panel.vcf.gz shows the line of how it was read, and no line of its own for the ploidy", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "panel.vcf.gz");

  const card = zone(page);
  await expect(card.getByText("200 individuals")).toBeVisible();
  await expect(card.getByText("VCF · 87 KB")).toBeVisible();
  await expect(
    card.getByText(
      "Read with ploidy 2, only the variants with PASS or . in the FILTER column",
    ),
  ).toBeVisible();
  await expect(card.getByText(/^Ploidy /)).toHaveCount(0);
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
  await expect(
    page.getByLabel("Ploidy of the VCF, from 1 to 255", { exact: true }),
  ).toHaveValue("2");
  await expect(page.getByText(PLOIDY_LINE)).toBeVisible();

  await pick(page, "tetraploid.vcf.gz");

  const card = zone(page);
  await expect(card.getByText("12 individuals")).toBeVisible();
  await expect(card.getByText(/^Read with ploidy 2,/)).toBeVisible();
  await expect(card.getByText(/^Ploidy /)).toHaveCount(0);
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
  await expect(zone(page).getByText(/^Read with ploidy 2,/)).toBeVisible();

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
      "popnei could not read bad.vcf: the source is not a VCF: it starts with `This is a line o`. Choose another file.",
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

test("WS9 D3 the message of a file not loaded goes with an Undo past the pick before it, and the Redo does not bring it back", async ({
  page,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await expect(zone(page).getByText("200 individuals")).toBeVisible();
  await pickNamed(page, "panel.txt", "not a variants file");
  const message =
    "panel.txt was not loaded: the Variants step reads a VCF, whose name ends in .vcf, .vcf.gz or .vcf.bgz, or a .nei file. If it is one of them, rename it.";
  await expect(page.getByRole("main").getByText(message)).toBeVisible();

  await page
    .getByRole("banner")
    .getByRole("button", { name: "Undo", exact: true })
    .click();

  await expect(fileButton(page)).toHaveText("Choose a variants file…");
  await expect(page.getByRole("main").getByText(message)).toHaveCount(0);

  await page
    .getByRole("banner")
    .getByRole("button", { name: "Redo", exact: true })
    .click();
  await expect(fileButton(page)).toHaveText("Replace panel.nei…");
  await expect(page.getByRole("main").getByText(message)).toHaveCount(0);
});

test("WS7 D3 several files dropped at once load none", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await drop(page, ["panel.nei", "panel.vcf.gz"]);

  await expect(
    page
      .getByRole("main")
      .getByText("Load one variants file at a time.", { exact: true }),
  ).toBeVisible();
  // Announced too, since the focus does not move to it.
  await expect(page.getByRole("status").last()).toHaveText(
    "Load one variants file at a time.",
  );
  await expect(fileButton(page)).toHaveText("Choose a variants file…");
  await expectNoViolations(makeAxeBuilder);
});

test("WS7 D3 the threshold takes a number of two decimals from 0 to 1, and refuses 10 and 0.125 with a line that says what it keeps", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  const filter = page.getByRole("switch", {
    name: "Filter the variants by missing data",
  });
  await expect(filter).toBeChecked();
  const threshold = page.getByLabel(
    "Maximum proportion of missing genotypes, from 0 to 1",
    { exact: true },
  );
  await expect(threshold).toHaveValue("0.1");

  // Two presses of an arrow key, a step each.
  await threshold.press("ArrowUp");
  await threshold.press("ArrowUp");
  await expect(threshold).toHaveValue("0.12");
  await threshold.fill("0.13");
  await threshold.press("Enter");
  await expect(threshold).toHaveValue("0.13");

  // Refused, and not moved to 1 nor rounded to 0.13 or to 0: the field
  // shows the value it had, and the line says so, as the field's
  // description and in the status region.
  for (const [typed, line] of [
    ["10", "10 is more than 1; the threshold stays 0.13."],
    ["0.125", "0.125 has more than two decimals; the threshold stays 0.13."],
    ["0.001", "0.001 has more than two decimals; the threshold stays 0.13."],
    ["1.001", "1.001 is more than 1; the threshold stays 0.13."],
  ] as const) {
    await threshold.fill(typed);
    await threshold.press("Enter");
    await expect(threshold).toHaveValue("0.13");
    await expect(page.getByRole("main").getByText(line)).toBeVisible();
    // The line of the refusal, then the line under the switch.
    await expect(threshold).toHaveAccessibleDescription(
      `${line} ${MISSING_DATA_LINE}`,
    );
    await expect(page.getByRole("status").last()).toHaveText(line);
  }
  await expectNoViolations(makeAxeBuilder);
  // One line at a time, the last.
  await expect(
    page.getByRole("main").getByText(/the threshold stays/),
  ).toHaveCount(1);

  // Refused when the field is left with the Tab key too; the next number
  // taken takes the line away.
  await threshold.fill("2");
  await threshold.press("Tab");
  await expect(
    page
      .getByRole("main")
      .getByText("2 is more than 1; the threshold stays 0.13."),
  ).toBeVisible();
  await threshold.fill("0.2");
  await threshold.press("Enter");
  await expect(threshold).toHaveValue("0.2");
  await expect(
    page.getByRole("main").getByText(/the threshold stays/),
  ).toHaveCount(0);

  // Left empty, it shows again the value it had, with no line.
  await threshold.fill("");
  await threshold.press("Shift+Tab");
  await expect(threshold).toHaveValue("0.2");
  await expect(
    page.getByRole("main").getByText(/the threshold stays/),
  ).toHaveCount(0);
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

test("WS7 D3 a comma typed key by key in the threshold is thrown away, and the field says so and keeps its value", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  const threshold = page.getByLabel(
    "Maximum proportion of missing genotypes, from 0 to 1",
    { exact: true },
  );
  const comma =
    "Write the decimals with a point, 0.1 and not 0,1; the threshold stays 0.1.";
  // React Aria throws the comma away, so 0,1 shows as 01 and 0,2 as 02:
  // committed, they were 1, taken, and 2, refused as more than 1.
  for (const typed of ["0,1", "0,2"]) {
    await threshold.fill("");
    await threshold.pressSequentially(typed);
    // Said at once, before the commit.
    await expect(page.getByRole("main").getByText(comma)).toBeVisible();
    await expect(page.getByRole("status").last()).toHaveText(comma);
    await threshold.press("Enter");
    await expect(threshold).toHaveValue("0.1");
    await expect(page.getByRole("main").getByText(comma)).toBeVisible();
    await expect(threshold).toHaveAccessibleDescription(
      `${comma} ${MISSING_DATA_LINE}`,
    );
  }
  await expectNoViolations(makeAxeBuilder);

  // A deletion mends what was typed, and the commit takes the number.
  await threshold.fill("");
  await threshold.pressSequentially("0,");
  await threshold.press("Backspace");
  await threshold.pressSequentially("0.15");
  await threshold.press("Enter");
  await expect(threshold).toHaveValue("0.15");
  await expect(
    page.getByRole("main").getByText(/the threshold stays/),
  ).toHaveCount(0);

  // Another character, named.
  await threshold.fill("");
  await threshold.pressSequentially("-");
  await expect(
    page
      .getByRole("main")
      .getByText(
        "‘-’ cannot be typed in the threshold, which is written with digits and a point, as 0.05; the threshold stays 0.15.",
      ),
  ).toBeVisible();
});

test("WS7 D3 the line of a number refused goes at the next commit, the value kept typed back or an arrow key at a bound", async ({
  page,
}) => {
  await openVariants(page);
  const threshold = page.getByLabel(
    "Maximum proportion of missing genotypes, from 0 to 1",
    { exact: true },
  );
  const stays = page.getByRole("main").getByText(/the threshold stays/);

  // The value kept typed back, which changes nothing.
  await threshold.fill("10");
  await threshold.press("Enter");
  await expect(stays).toHaveText("10 is more than 1; the threshold stays 0.1.");
  await threshold.fill("0.1");
  await threshold.press("Enter");
  await expect(threshold).toHaveValue("0.1");
  await expect(stays).toHaveCount(0);

  // The same after the Tab key.
  await threshold.fill("10");
  await threshold.press("Enter");
  await expect(stays).toHaveCount(1);
  await threshold.fill("0.1");
  await threshold.press("Tab");
  await expect(stays).toHaveCount(0);

  // At the largest, an arrow key up changes nothing.
  await threshold.fill("1");
  await threshold.press("Enter");
  await expect(threshold).toHaveValue("1");
  await threshold.fill("5");
  await threshold.press("Enter");
  await expect(stays).toHaveText("5 is more than 1; the threshold stays 1.");
  await threshold.press("ArrowUp");
  await expect(threshold).toHaveValue("1");
  await expect(stays).toHaveCount(0);

  // The line of a character thrown away stays through the commit it
  // refused, and goes at the one after.
  await threshold.fill("");
  await threshold.pressSequentially("0,5");
  await threshold.press("Enter");
  await expect(threshold).toHaveValue("1");
  await expect(stays).toHaveCount(1);
  await threshold.press("Enter");
  await expect(stays).toHaveCount(0);
});

test("WS7 D3 a comma or a minus sign typed in the ploidy is thrown away, and the field says so and keeps its value", async ({
  page,
}) => {
  await openVariants(page);
  const ploidy = page.getByLabel("Ploidy of the VCF");
  const stays = page.getByRole("main").getByText(/the ploidy stays/);
  // 2,0 showed as 20, and was taken as a ploidy of 20.
  await ploidy.fill("");
  await ploidy.pressSequentially("2,0");
  await ploidy.press("Enter");
  await expect(ploidy).toHaveValue("2");
  await expect(stays).toHaveText(
    "Write the ploidy as a whole number, 4 and not 4,0; the ploidy stays 2.",
  );
  await expect(page.getByRole("status").last()).toHaveText(
    "Write the ploidy as a whole number, 4 and not 4,0; the ploidy stays 2.",
  );

  // -3 showed as 3.
  await ploidy.fill("");
  await ploidy.pressSequentially("-3");
  await ploidy.press("Enter");
  await expect(ploidy).toHaveValue("2");
  await expect(stays).toHaveText(
    "‘-’ cannot be typed in the ploidy, which is a whole number, as 4; the ploidy stays 2.",
  );
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
    page.getByRole("button", {
      name: "Calculate the histograms of the variants",
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

test("WS7 D3 the ploidy refuses 0, 300 and 2.5 with a line that says it stays", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  const ploidy = page.getByLabel("Ploidy of the VCF");
  for (const [typed, line] of [
    ["0", "0 is less than 1; the ploidy stays 2."],
    ["300", "300 is more than 255; the ploidy stays 2."],
    ["2.5", "2.5 is not a whole number; the ploidy stays 2."],
  ] as const) {
    await ploidy.fill(typed);
    await ploidy.press("Enter");
    await expect(ploidy).toHaveValue("2");
    await expect(page.getByRole("main").getByText(line)).toBeVisible();
    await expect(page.getByRole("status").last()).toHaveText(line);
    // The line first in the description, before the line under the
    // ploidy.
    await expect(ploidy).toHaveAccessibleDescription(`${line} ${PLOIDY_LINE}`);
  }
  await expectNoViolations(makeAxeBuilder);
  await ploidy.fill("255");
  await ploidy.press("Enter");
  await expect(ploidy).toHaveValue("255");
  await expect(
    page.getByRole("main").getByText(/the ploidy stays/),
  ).toHaveCount(0);
  await expect(ploidy).toHaveAccessibleDescription(PLOIDY_LINE);

  // The line names the ploidy kept, so it goes when a new load sets the
  // ploidy back: after a .nei file, the default.
  await ploidy.fill("300");
  await ploidy.press("Enter");
  await expect(
    page
      .getByRole("main")
      .getByText("300 is more than 255; the ploidy stays 255."),
  ).toBeVisible();
  await pick(page, "panel.nei");
  await expect(ploidy).toHaveValue("2");
  await expect(
    page.getByRole("main").getByText(/the ploidy stays/),
  ).toHaveCount(0);
});

test("WS7 D3 the button to read a VCF again names both options when both differ", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "tetraploid.vcf.gz");
  await expect(zone(page).getByText("12 individuals")).toBeVisible();
  const ploidy = page.getByLabel("Ploidy of the VCF");
  await ploidy.fill("4");
  await ploidy.press("Enter");
  await uncheckPassed(page);

  await page
    .getByRole("button", {
      name: "Read tetraploid.vcf.gz again with ploidy 4 and every variant",
      exact: true,
    })
    .click();

  await expect(
    zone(page).getByText("Read with ploidy 4, every variant", { exact: true }),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
});

test("WS7 D3 a folder dropped on the zone loads nothing, and the step says what to drop", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await dropFolder(page);

  const message = "Load a VCF or a .nei file, not a folder.";
  await expect(
    page.getByRole("main").getByText(message, { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status").last()).toHaveText(message);
  await expect(fileButton(page)).toHaveText("Choose a variants file…");
  await expectNoViolations(makeAxeBuilder);
});

test("WS7 D3 the calculations that could not start are told in the words of the step", async ({
  page,
}) => {
  await page.route("**/*.wasm", (route) => route.fulfill({ status: 404 }));
  await openVariants(page);
  await pick(page, "panel.nei");

  await expect(
    zone(page).getByText(
      "panel.nei could not be read: the application could not start its calculations. Reload the page and choose it again.",
    ),
  ).toBeVisible();
});

test("WS7 D3 popnei's wasm not served: once the calculation worker is given up, nothing is shown before a file is picked", async ({
  page,
  makeAxeBuilder,
}) => {
  let wasmAsked = 0;
  await page.route("**/*.wasm", (route) => {
    wasmAsked += 1;
    return route.fulfill({ status: 404 });
  });
  await openVariants(page);

  // Two starts of the calculation worker, each asking for the wasm, and
  // then no worker: the client has given it up.
  await expect.poll(() => wasmAsked).toBeGreaterThanOrEqual(2);
  await expect
    .poll(() => page.workers().some((w) => w.url().includes("runnerWorker")))
    .toBe(false);

  await expect(page.getByRole("main").getByText(/could not/)).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveText("");
  await expect(fileButton(page)).toHaveText("Choose a variants file…");
  await expectNoViolations(makeAxeBuilder);
  expect(wasmAsked).toBe(2);
});

test("WS7 D3 a piece of text dropped on the zone loads nothing, and the step says what to drop", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await dropText(page, "panel.nei");

  const message = "Load a VCF or a .nei file, not a piece of text.";
  await expect(
    page.getByRole("main").getByText(message, { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status").last()).toHaveText(message);
  await expect(fileButton(page)).toHaveText("Choose a variants file…");
  await expectNoViolations(makeAxeBuilder);
});

test("WS7 D3 a piece of text pasted into the zone's button loads nothing, and the step says what to give in words that fit a paste", async ({
  page,
}) => {
  await openVariants(page);
  const paste = zone(page).getByRole("button", {
    name: "Paste a variants file",
    exact: true,
  });
  await paste.focus();
  await paste.evaluate((button) => {
    const transfer = new DataTransfer();
    transfer.setData("text/plain", "panel.nei");
    // Firefox takes the text of a paste made by a script from the
    // members `dataType` and `data`, which only it knows, and not from
    // `clipboardData`; the other two engines take `clipboardData`.
    const init: ClipboardEventInit & { dataType: string; data: string } = {
      clipboardData: transfer,
      dataType: "text/plain",
      data: "panel.nei",
      bubbles: true,
      cancelable: true,
    };
    button.dispatchEvent(new ClipboardEvent("paste", init));
  });

  const message = "Load a VCF or a .nei file, not a piece of text.";
  await expect(
    page.getByRole("main").getByText(message, { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status").last()).toHaveText(message);
  await expect(fileButton(page)).toHaveText("Choose a variants file…");
});

test("WS7 D3 a file dropped while a ploidy is still being typed is read with that ploidy", async ({
  page,
}) => {
  await openVariants(page);
  const ploidy = page.getByLabel("Ploidy of the VCF");
  await ploidy.fill("4");
  await expect(ploidy).toBeFocused();

  await drop(page, ["tetraploid.vcf.gz"]);

  const card = zone(page);
  await expect(card.getByText(/^Read with ploidy 4,/)).toBeVisible();
  await expect(ploidy).toHaveValue("4");
  await expect(
    page.getByRole("button", { name: /^Read .* again/ }),
  ).toHaveCount(0);
});

test("WS7 D3 a file dropped while the ploidy holds a number it refuses is read with the ploidy kept, and the line says so", async ({
  page,
}) => {
  await openVariants(page);
  const ploidy = page.getByLabel("Ploidy of the VCF");
  await ploidy.fill("300");
  await expect(ploidy).toBeFocused();

  await drop(page, ["tetraploid.vcf.gz"]);

  const line = "300 is more than 255; the ploidy stays 2.";
  await expect(zone(page).getByText(/^Read with ploidy 2,/)).toBeVisible();
  await expect(ploidy).toHaveValue("2");
  await expect(page.getByRole("main").getByText(line)).toBeVisible();
  // With the end of the read after it, when the read ends within the
  // pause of the announcer.
  await expect(page.getByRole("status").last()).toHaveText(
    new RegExp(
      `^${line.replace(/\./g, "\\.")}( tetraploid\\.vcf\\.gz read: 12 individuals, ploidy 2\\.)?$`,
    ),
  );
  await expect(
    page.getByRole("button", { name: /^Read .* again/ }),
  ).toHaveCount(0);
});

test("WS7 D3 the zone's own button, which takes a pasted file, is named for it", async ({
  page,
}) => {
  await openVariants(page);
  const paste = zone(page).getByRole("button", {
    name: "Paste a variants file",
    exact: true,
  });
  await expect(paste).toHaveCount(1);
  // It is the first stop of the Tab key in the step, before the file
  // button.
  await page.getByRole("heading", { level: 1, name: "Variants" }).focus();
  await page.keyboard.press("Tab");
  await expect(paste).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(fileButton(page)).toBeFocused();
  // Its name is its words once, and every element it is labelled by is
  // in the page: no empty reference.
  await expect(paste).toHaveAccessibleName("Paste a variants file");
  const ids = (await paste.getAttribute("aria-labelledby")) ?? "";
  expect(ids.trim()).not.toBe("");
  for (const id of ids.trim().split(/\s+/)) {
    await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
  }
});

// The application is in English in every browser, whatever its language
// (the entry's I18nProvider), and a number with a comma for its decimal
// mark is no number: the field keeps the value it had, rather than reading
// 0,05 as 5 and keeping every variant, and says how to write it.
for (const locale of ["en-US", "es-ES"] as const) {
  test.describe(locale, () => {
    test.use({ locale });

    test(`WS7 D3 in a browser in ${locale} the threshold takes 0.05 and keeps its value for 0,05, and the ploidy keeps its value for 2,5, each with the line of the comma`, async ({
      page,
    }) => {
      await openVariants(page);
      const threshold = page.getByLabel(
        "Maximum proportion of missing genotypes",
      );
      await expect(threshold).toHaveValue("0.1");
      // Typed key by key, as a user types it. Playwright's fill gives the text
      // in Firefox as one composition, the way the input method of a
      // language gives it, whose characters the field leaves to React Aria
      // to check at the end, with no line of the comma (NumberField.tsx).
      await threshold.click();
      await threshold.press("ControlOrMeta+a");
      await threshold.pressSequentially("0,05");
      await threshold.press("Enter");
      await expect(threshold).toHaveValue("0.1");
      await expect(
        page
          .getByRole("main")
          .getByText(
            "Write the decimals with a point, 0.1 and not 0,1; the threshold stays 0.1.",
          ),
      ).toBeVisible();
      await threshold.fill("0.05");
      await threshold.press("Enter");
      await expect(threshold).toHaveValue("0.05");
      await expect(
        page.getByRole("main").getByText(/the threshold stays/),
      ).toHaveCount(0);

      const ploidy = page.getByLabel("Ploidy of the VCF");
      await ploidy.click();
      await ploidy.press("ControlOrMeta+a");
      await ploidy.pressSequentially("2,5");
      await ploidy.press("Enter");
      await expect(ploidy).toHaveValue("2");
      await expect(
        page
          .getByRole("main")
          .getByText(
            "Write the ploidy as a whole number, 4 and not 4,0; the ploidy stays 2.",
          ),
      ).toBeVisible();
      await ploidy.fill("2.5");
      await ploidy.press("Enter");
      await expect(ploidy).toHaveValue("2");
      await expect(
        page
          .getByRole("main")
          .getByText("2.5 is not a whole number; the ploidy stays 2."),
      ).toBeVisible();
    });
  });
}

test("WS7 D3 a VCF picked with the check box of the passed variants off is read with every variant", async ({
  page,
}) => {
  await openVariants(page);
  await uncheckPassed(page);

  await pick(page, "panel.vcf.gz");

  await expect(
    zone(page).getByText("Read with ploidy 2, every variant", { exact: true }),
  ).toBeVisible();
});

test("WS7 D3 a VCF read again with every variant says so on its card", async ({
  page,
}) => {
  await openVariants(page);
  await pick(page, "panel.vcf.gz");
  await expect(
    zone(page).getByText(
      "Read with ploidy 2, only the variants with PASS or . in the FILTER column",
    ),
  ).toBeVisible();
  await uncheckPassed(page);

  await page
    .getByRole("button", { name: "Read panel.vcf.gz again with every variant" })
    .click();

  await expect(
    zone(page).getByText("Read with ploidy 2, every variant", { exact: true }),
  ).toBeVisible();
  await expect(zone(page).getByText("200 individuals")).toBeVisible();
});

test("WS7 D3 the options of a VCF start again at the defaults when the step is drawn again", async ({
  page,
}) => {
  await openVariants(page);
  const ploidy = page.getByLabel("Ploidy of the VCF");
  await ploidy.fill("4");
  await ploidy.press("Enter");
  await expect(ploidy).toHaveValue("4");

  const steps = page.getByRole("navigation", { name: "Steps" });
  await steps.getByRole("link", { name: "Individuals" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Individuals" }),
  ).toBeVisible();
  await steps.getByRole("link", { name: "Variants" }).click();

  await expect(page.getByLabel("Ploidy of the VCF")).toHaveValue("2");
});
