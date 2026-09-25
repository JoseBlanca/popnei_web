/**
 * The Individuals step on the built site (docs/specs/steps/individuals.md,
 * its states and its words): the metadata file loaded and how it was
 * read, its columns and their types, the column of the populations and
 * the populations, the individuals of the variants file missing from it,
 * a file refused, a file not loaded, a column not in the table, and the
 * file removed; axe at each state reached.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Locator, Page, Worker } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

async function openIndividuals(page: Page): Promise<void> {
  await page.goto("popgen.html#individuals");
  await expect(
    page.getByRole("heading", { level: 1, name: "Individuals" }),
  ).toBeVisible();
}

/** Goes to a step by its link in the stepper. */
async function goTo(page: Page, step: string): Promise<void> {
  await page
    .getByRole("navigation", { name: "Steps" })
    .getByRole("link", { name: step })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: step }),
  ).toBeVisible();
}

/** Loads panel.nei in the Variants step, and comes back to Individuals. */
async function loadPanel(page: Page): Promise<void> {
  await goTo(page, "Variants");
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Variants file" })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (await chooser).setFiles(join(FIXTURES, "panel.nei"));
  await expect(page.getByText("200 individuals")).toBeVisible();
  await goTo(page, "Individuals");
}

function zone(page: Page): Locator {
  return page.getByRole("region", { name: "Metadata file" });
}

/** The button of the zone, whatever its words. */
function fileButton(page: Page): Locator {
  return zone(page).getByRole("button", { name: /^(Choose|Replace) .*…$/ });
}

/** Picks a fixture, or a file of a name and text, with the file button,
    as a user does, through the file picker of the system. */
async function pick(
  page: Page,
  file: string | { readonly name: string; readonly text: string | Buffer },
): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await fileButton(page).click();
  await (
    await chooser
  ).setFiles(
    typeof file === "string"
      ? join(FIXTURES, file)
      : {
          name: file.name,
          mimeType: "text/plain",
          buffer:
            typeof file.text === "string" ? Buffer.from(file.text) : file.text,
        },
  );
}

/** The select of that label, by its button, which React Aria names by
    the label and the value. */
function select(page: Page, label: string): Locator {
  return page.getByRole("button", { name: label });
}

/** Chooses `option` in the select of that label, with the mouse. */
async function choose(
  page: Page,
  label: string,
  option: string,
): Promise<void> {
  await select(page, label).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

/** The lines of panel_pops.csv, the header first. */
async function panelPopsLines(): Promise<string[]> {
  const text = await readFile(join(FIXTURES, "panel_pops.csv"), "utf8");
  return text.split("\n").filter((line) => line !== "");
}

/** The twelve individuals of panel.nei the test leaves out of its CSV. */
const LEFT_OUT = [
  "s031",
  "s044",
  "s050",
  "s051",
  "s052",
  "s053",
  "s054",
  "s055",
  "s056",
  "s057",
  "s058",
  "s059",
];

/** panel_pops.csv without the individuals of LEFT_OUT. */
async function withoutTwelve(): Promise<string> {
  const lines = await panelPopsLines();
  return `${lines
    .filter((line) => !LEFT_OUT.includes(line.split(",")[0] ?? ""))
    .join("\n")}\n`;
}

const MISSING_REASON =
  "12 individuals of panel.nei are not in pops.csv: s031, s044 and 10 more. Add them to the file and load it again in the Individuals step.";

test("WS8 D1 panel_pops.csv is read with the three options found, its columns and their types are shown, and the light worker fetches no wasm", async ({
  page,
  makeAxeBuilder,
}) => {
  const workers: Worker[] = [];
  page.on("worker", (worker) => workers.push(worker));
  await openIndividuals(page);
  await expect(fileButton(page)).toHaveText("Choose a metadata file…");
  await expect(
    zone(page).getByText(
      "No metadata file. The analyses per population need one.",
    ),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  await pick(page, "panel_pops.csv");

  await expect(zone(page).getByText("200 rows, 2 columns")).toBeVisible();
  await expect(fileButton(page)).toHaveText("Replace panel_pops.csv…");
  await expect(fileButton(page)).toBeFocused();
  await expect(select(page, "Encoding")).toHaveText("Detected: UTF-8");
  await expect(select(page, "Separator")).toHaveText("Detected: comma");
  await expect(select(page, "Decimal mark")).toHaveText("Detected: point");

  const table = page.getByRole("table", { name: "Columns" });
  await expect(table.getByRole("row")).toHaveText([
    "ColumnTypeFirst values",
    "IIDidentifiers000, s001, s002",
    "popcatcategoricalp0, p2, p1",
  ]);
  await expect(table.getByRole("rowheader")).toHaveText(["IID", "popcat"]);
  await expect(
    page.getByText(
      "The individuals are checked against the variants file once it is read.",
    ),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  // What each worker fetched, from its own list of resources: the
  // calculation worker fetched popnei's wasm, and the light worker none.
  const light = workers.find((w) => w.url().includes("filesRunner"));
  const calculation = workers.find((w) => w.url().includes("runnerWorker"));
  if (light === undefined || calculation === undefined) {
    throw new Error("the page did not start both workers");
  }
  const fetchedBy = (worker: Worker): Promise<string[]> =>
    worker.evaluate(() =>
      performance.getEntriesByType("resource").map((entry) => entry.name),
    );
  expect(
    (await fetchedBy(calculation)).some((name) => name.endsWith(".wasm")),
  ).toBe(true);
  expect(
    (await fetchedBy(light)).filter((name) => name.endsWith(".wasm")),
  ).toEqual([]);
});

test("WS8 D1 the column popcat chosen lists the populations p0, p2 and p1 with their individuals", async ({
  page,
  makeAxeBuilder,
}) => {
  await openIndividuals(page);
  await loadPanel(page);
  await pick(page, "panel_pops.csv");
  await expect(
    page.getByText("All 200 individuals of panel.nei found", { exact: true }),
  ).toBeVisible();
  await expect(select(page, "Column that defines the populations")).toHaveText(
    "Choose a column",
  );
  await expectNoViolations(makeAxeBuilder);

  // Every column but the first, which names the individuals, is offered.
  await select(page, "Column that defines the populations").click();
  await expect(page.getByRole("option")).toHaveText(["popcat"]);
  await page.getByRole("option", { name: "popcat" }).click();

  await expect(select(page, "Column that defines the populations")).toHaveText(
    "popcat",
  );
  const populations = page
    .getByRole("region", { name: "Populations" })
    .getByRole("listitem");
  await expect(populations).toHaveCount(3);
  // Shown "p0 · 48", read "p0, 48 individuals".
  await expect(populations.nth(0)).toContainText("p0, 48 individuals");
  await expect(populations.nth(1)).toContainText("p2, 84 individuals");
  await expect(populations.nth(2)).toContainText("p1, 68 individuals");
  await expect(populations.nth(0)).toContainText("p0 · 48");
  await expectNoViolations(makeAxeBuilder);
});

test("WS8 D1 the individuals with an empty cell in the column come last, in no population", async ({
  page,
  makeAxeBuilder,
}) => {
  await openIndividuals(page);
  await loadPanel(page);
  const lines = await panelPopsLines();
  const emptied = lines.map((line) =>
    ["s000", "s001", "s002", "s003"].includes(line.split(",")[0] ?? "")
      ? `${line.split(",")[0] ?? ""},`
      : line,
  );
  await pick(page, { name: "pops.csv", text: `${emptied.join("\n")}\n` });
  await choose(page, "Column that defines the populations", "popcat");

  const populations = page
    .getByRole("region", { name: "Populations" })
    .getByRole("listitem");
  await expect(populations).toHaveCount(4);
  await expect(populations.nth(0)).toContainText("p2, 84 individuals");
  await expect(populations.nth(1)).toContainText("p1, 68 individuals");
  await expect(populations.nth(2)).toContainText("p0, 44 individuals");
  await expect(populations.nth(3)).toContainText(
    "No population, 4 individuals, left out of the analyses per population",
  );
  await expect(populations.nth(3)).toContainText(
    "No population · 4, left out of the analyses per population",
  );
  await expectNoViolations(makeAxeBuilder);
});

test("WS8 D1 a metadata file without 12 individuals of panel.nei gives the reason, and a disclosure opens the 12 names", async ({
  page,
  makeAxeBuilder,
}) => {
  await openIndividuals(page);
  await loadPanel(page);
  await pick(page, { name: "pops.csv", text: await withoutTwelve() });

  await expect(zone(page).getByText("188 rows, 2 columns")).toBeVisible();
  await expect(page.getByText(MISSING_REASON, { exact: true })).toBeVisible();
  const disclosure = page.getByRole("button", {
    name: "The 12 individuals missing",
  });
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  await expectNoViolations(makeAxeBuilder);

  await disclosure.click();

  await expect(disclosure).toHaveAttribute("aria-expanded", "true");
  const names = page
    .getByRole("region", { name: "Populations" })
    .getByRole("listitem");
  await expect(names).toHaveText(LEFT_OUT);
  await expectNoViolations(makeAxeBuilder);

  // With individuals missing, no list of populations.
  await choose(page, "Column that defines the populations", "popcat");
  await expect(names).toHaveText(LEFT_OUT);
});

test("WS8 D1 a file with a row one cell short gives the reason that names the separator, and a separator chosen reads it again", async ({
  page,
  makeAxeBuilder,
}) => {
  await openIndividuals(page);
  await pick(page, {
    name: "short.csv",
    text: "IID;popcat;region\ns000;p0;north\ns001;p0\n",
  });

  await expect(
    zone(page).getByText(
      "short.csv could not be read: line 3 has 2 cells where the header has 3, read with the semicolon as the separator. Load a metadata file in the Individuals step.",
      { exact: true },
    ),
  ).toBeVisible();
  // The options stay, to mend it; a refusal has no columns.
  await expect(select(page, "Separator")).toHaveText("Detected");
  await expect(page.getByRole("table")).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  await choose(page, "Separator", "Comma");

  await expect(select(page, "Separator")).toHaveText("Comma");
  await expect(zone(page).getByText("2 rows, 1 column")).toBeVisible();
  await expect(select(page, "Encoding")).toHaveText("Detected: UTF-8");
  await expectNoViolations(makeAxeBuilder);
});

test("WS8 D1 pops.xlsx is not loaded, and the step says why and announces it", async ({
  page,
  makeAxeBuilder,
}) => {
  await openIndividuals(page);
  await pick(page, { name: "pops.xlsx", text: "PK" });

  const message =
    "pops.xlsx was not loaded: this version reads a CSV or a TSV, and reads .xlsx files from a later version. In Excel, save the sheet with File › Save As › CSV, and load that file.";
  await expect(page.getByRole("main").getByText(message)).toBeVisible();
  await expect(page.getByRole("status").last()).toHaveText(message);
  await expect(fileButton(page)).toHaveText("Choose a metadata file…");
  await expect(fileButton(page)).toBeFocused();
  await expectNoViolations(makeAxeBuilder);

  // A file of another name, with its own words.
  await pick(page, { name: "pops.dat", text: "IID,pop\n" });
  await expect(
    page
      .getByRole("main")
      .getByText(
        "pops.dat was not loaded: the Individuals step reads a CSV or a TSV, whose name ends in .csv, .tsv or .txt. If it is one of them, rename it.",
      ),
  ).toBeVisible();
  await expect(page.getByRole("main").getByText(message)).toHaveCount(0);

  // The next pick takes the message away.
  await pick(page, "panel_pops.csv");
  await expect(zone(page).getByText("200 rows, 2 columns")).toBeVisible();
  await expect(page.getByRole("main").getByText(/was not loaded/)).toHaveCount(
    0,
  );
});

test("WS8 D1 Remove takes the step back to no file, with the focus on the file button", async ({
  page,
  makeAxeBuilder,
}) => {
  await openIndividuals(page);
  await pick(page, "panel_pops.csv");
  await expect(zone(page).getByText("200 rows, 2 columns")).toBeVisible();

  await zone(page)
    .getByRole("button", { name: "Remove panel_pops.csv" })
    .click();

  await expect(fileButton(page)).toHaveText("Choose a metadata file…");
  await expect(fileButton(page)).toBeFocused();
  await expect(
    zone(page).getByText(
      "No metadata file. The analyses per population need one.",
    ),
  ).toBeVisible();
  await expect(zone(page).getByRole("button", { name: /^Remove/ })).toHaveCount(
    0,
  );
  await expect(select(page, "Encoding")).toHaveCount(0);
  await expect(page.getByRole("table")).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("WS8 D1 a file being read shows its name, the options of the reader, and no columns", async ({
  page,
  makeAxeBuilder,
}) => {
  // The script of the light worker is held back, so the read waits.
  await page.route("**/filesRunner-*.js", () => undefined);
  await openIndividuals(page);
  await pick(page, "panel_pops.csv");

  await expect(zone(page).getByText("Reading panel_pops.csv.")).toBeVisible();
  await expect(select(page, "Encoding")).toHaveText("Detected");
  await expect(select(page, "Separator")).toHaveText("Detected");
  await expect(select(page, "Decimal mark")).toHaveText("Detected");
  await expect(page.getByRole("table")).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("WS8 D1 a column of the populations not in a new file is named at the select, which asks for a column", async ({
  page,
  makeAxeBuilder,
}) => {
  await openIndividuals(page);
  await pick(page, "panel_pops.csv");
  await choose(page, "Column that defines the populations", "popcat");
  await expect(select(page, "Column that defines the populations")).toHaveText(
    "popcat",
  );

  await pick(page, { name: "regions.csv", text: "IID,region\ns000,north\n" });

  await expect(zone(page).getByText("1 row, 2 columns")).toBeVisible();
  const column = select(page, "Column that defines the populations");
  await expect(column).toHaveText("Choose a column");
  const reason =
    "regions.csv has no column popcat, from which the populations were taken. Choose the column that defines the populations in the Individuals step.";
  await expect(page.getByText(reason, { exact: true })).toBeVisible();
  // Read with the select.
  await expect(column).toHaveAccessibleDescription(
    new RegExp(reason.replace(/\./g, "\\.")),
  );
  await expectNoViolations(makeAxeBuilder);
});

test("WS8 D1 the types of the columns, the warning of a few whole numbers, and a file of Windows-1252", async ({
  page,
  makeAxeBuilder,
}) => {
  await openIndividuals(page);
  const text =
    "Individuo;País;Sano;Altura;score\n" +
    "i1;España;sí;1,75;1\n" +
    "i2;Italia;no;1,62;2\n" +
    "i3;Perú;sí;;3\n" +
    "i4;España;no;1,80;5\n";
  await pick(page, { name: "spain.csv", text: Buffer.from(text, "latin1") });

  await expect(zone(page).getByText("4 rows, 5 columns")).toBeVisible();
  await expect(select(page, "Encoding")).toHaveText("Detected: Windows-1252");
  await expect(select(page, "Separator")).toHaveText("Detected: semicolon");
  await expect(select(page, "Decimal mark")).toHaveText("Detected: comma");
  const table = page.getByRole("table", { name: "Columns" });
  await expect(table.getByRole("row")).toHaveText([
    "ColumnTypeFirst values",
    "Individuoidentifieri1, i2, i3",
    "PaíscategoricalEspaña, Italia, Perú",
    /^Sanobinary: (sí, no|no, sí)sí, no$/,
    "Alturacontinuous1,75, 1,62, 1,80",
    "scorecontinuousWarning: score holds only 4 different whole numbers, from 1 to 5, and is taken as a measurement. If they are codes, such as numbered populations, it can still be chosen as the column of the populations.1, 2, 3",
  ]);
  await expectNoViolations(makeAxeBuilder);

  // The encoding set by the user: the first item no longer says what was
  // detected, and the file is read again, garbled.
  await choose(page, "Encoding", "UTF-8");
  await expect(select(page, "Encoding")).toHaveText("UTF-8");
  await expect(table.getByRole("rowheader").nth(1)).not.toHaveText("País");
  await select(page, "Encoding").click();
  await expect(page.getByRole("option").first()).toHaveText("Detected");
  await page.keyboard.press("Escape");
});

test("WS8 D1 a file that starts with the mark of UTF-16 says so in place of the encoding", async ({
  page,
  makeAxeBuilder,
}) => {
  await openIndividuals(page);
  const bom = Buffer.from([0xff, 0xfe]);
  const body = Buffer.from("IID\tpop\r\ns000\tp0\r\n", "utf16le");
  await pick(page, { name: "unicode.txt", text: Buffer.concat([bom, body]) });

  await expect(zone(page).getByText("1 row, 2 columns")).toBeVisible();
  await expect(
    page.getByText("Encoding: UTF-16, from the mark at the start of the file."),
  ).toBeVisible();
  await expect(select(page, "Encoding")).toHaveCount(0);
  await expect(select(page, "Separator")).toHaveText("Detected: tab");
  await expectNoViolations(makeAxeBuilder);
});

test("WS8 D1 the keyboard goes through the step in the order of the spec", async ({
  page,
}) => {
  await openIndividuals(page);
  await loadPanel(page);
  await pick(page, { name: "pops.csv", text: await withoutTwelve() });
  await expect(page.getByText(MISSING_REASON, { exact: true })).toBeVisible();
  await expect(fileButton(page)).toBeFocused();

  const order = [
    zone(page).getByRole("button", { name: "Remove pops.csv" }),
    select(page, "Encoding"),
    select(page, "Separator"),
    select(page, "Decimal mark"),
    select(page, "Column that defines the populations"),
    page.getByRole("button", { name: "The 12 individuals missing" }),
  ];
  for (const next of order) {
    await page.keyboard.press("Tab");
    await expect(next).toBeFocused();
  }

  // The disclosure opens with the keyboard, and the column is chosen with
  // it.
  await page.keyboard.press("Enter");
  await expect(order[5] ?? fileButton(page)).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page.keyboard.press("Shift+Tab");
  await expect(order[4] ?? fileButton(page)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("option", { name: "popcat" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(select(page, "Column that defines the populations")).toHaveText(
    "popcat",
  );

  // Remove with the keyboard leaves the focus on the file button.
  await fileButton(page).focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(fileButton(page)).toHaveText("Choose a metadata file…");
  await expect(fileButton(page)).toBeFocused();
});
