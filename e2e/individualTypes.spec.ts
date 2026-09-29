/**
 * The columns of the Individuals step and their types, on the built site
 * (docs/specs/steps/individuals.md, "The columns", "Every individual of
 * the variants file in it", "What it sends and reads", "Its words",
 * "Accessibility" and "How it is checked"): the select of the type in
 * every row but the first, the select of the value coded 1 of a binary
 * column, each one step of Undo with no notice and no result removed; the
 * types set that a read does not apply, named with "Forget these types",
 * applied again by a later read, and forgotten, with the focus after it;
 * the names of the individuals missing copied and announced; the order of
 * the Tab key through the table, the selects driven with the keyboard;
 * and the table at 320 px wide. axe at each state reached.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** A metadata file of four individuals, not those of panel.nei: status
    of two values, yes and no, binary with yes coded 1; score of four
    whole numbers, continuous with the warning of a few whole numbers;
    height of decimals, continuous; and region of three words,
    categorical. */
const TYPES_CSV =
  "IID,status,score,height,region\n" +
  "s000,yes,1,1.75,north\n" +
  "s001,no,2,1.62,south\n" +
  "s002,yes,3,1.80,east\n" +
  "s003,no,5,1.70,north\n";

const SCORE_WARNING =
  "Warning: score holds only 4 different whole numbers, from 1 to 5, and is taken as a measurement. If they are codes, such as numbered populations, set its type to categorical.";

/** The twelve individuals of panel.nei left out of a copy of
    panel_pops.csv. */
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

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
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

async function openIndividuals(page: Page): Promise<void> {
  await page.goto("popgen.html#individuals");
  await expect(
    page.getByRole("heading", { level: 1, name: "Individuals" }),
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
  await expect(
    page.getByRole("main").getByText("200 individuals"),
  ).toBeVisible();
  await goTo(page, "Individuals");
}

function zone(page: Page): Locator {
  return page.getByRole("region", { name: "Metadata file" });
}

/** The button of the zone, whatever its words. */
function fileButton(page: Page): Locator {
  return zone(page).getByRole("button", { name: /^(Choose|Replace) .*…$/ });
}

/** Picks a fixture, or a file of a name and text, with the file button. */
async function pick(
  page: Page,
  file: string | { readonly name: string; readonly text: string },
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
          buffer: Buffer.from(file.text),
        },
  );
}

/** The select whose name, the value and then the label as React Aria
    gives it, ends in `label`. */
function select(page: Page, label: string): Locator {
  return page.getByRole("button", {
    name: new RegExp(`${label.replace(/[.,]/g, "\\$&")}$`),
  });
}

/** The select of the type of the column `column`. */
function typeSelect(page: Page, column: string): Locator {
  return select(page, `Type of ${column}`);
}

/** The select of the value coded 1 of the column `column`. */
function codingSelect(page: Page, column: string): Locator {
  return select(page, `Coded 1, the case, in ${column}`);
}

/** Chooses `option` in the select `button`, with the mouse. */
async function choose(
  page: Page,
  button: Locator,
  option: string,
): Promise<void> {
  await button.click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

/** The words of the items of the select `button`, opened and closed. */
async function itemsOf(page: Page, button: Locator): Promise<string[]> {
  await button.click();
  const items = await page.getByRole("option").allInnerTexts();
  await page.keyboard.press("Escape");
  return items;
}

function columnsTable(page: Page): Locator {
  return page.getByRole("table", { name: "Columns" });
}

/** One row of the table of the columns as the eye reads it. */
interface ColumnRow {
  /** The name of the column, the header of its row. */
  readonly name: string;
  /** Its type: the words on the select of its type, or the text of the
      first column, whose type is not chosen. */
  readonly type: string;
  /** The words on the select of the value coded 1 and the line of the
      value coded 0, for a binary column. */
  readonly coding?: readonly [one: string, zero: string];
  /** Its first values. */
  readonly values: string;
}

/** The rows of the table of the columns, as the eye reads them. */
async function columnRows(page: Page): Promise<ColumnRow[]> {
  const rows = columnsTable(page).getByRole("row");
  const found: ColumnRow[] = [];
  const count = await rows.count();
  for (let index = 1; index < count; index++) {
    const row = rows.nth(index);
    // The line of the warning of a column, under its row, whose header
    // spans both.
    if ((await row.getByRole("rowheader").count()) === 0) continue;
    const name = await row.getByRole("rowheader").innerText();
    const cells = row.getByRole("cell");
    const typeButton = row.getByRole("button", { name: / Type of / });
    const type =
      (await typeButton.count()) === 0
        ? await cells.first().innerText()
        : await typeButton.innerText();
    const codingButton = row.getByRole("button", {
      name: / Coded 1, the case, in /,
    });
    const coding =
      (await codingButton.count()) === 0
        ? undefined
        : ([
            await codingButton.innerText(),
            await row.getByText(/ is coded 0\.$/).innerText(),
          ] as const);
    found.push({
      name,
      type: type.trim(),
      ...(coding !== undefined && { coding }),
      values: (await cells.last().innerText()).replace(/\s+/g, " "),
    });
  }
  return found;
}

/** Reads types.csv, sets score categorical and the value coded 1 of
    status to no, and picks the same file without score, whose type set
    then waits. */
async function setTypesThenDropScore(page: Page): Promise<void> {
  await pick(page, { name: "types.csv", text: TYPES_CSV });
  await choose(page, typeSelect(page, "score"), "categorical");
  await expect(typeSelect(page, "score")).toHaveText("categorical");
  await choose(page, codingSelect(page, "status"), "no");
  await expect(codingSelect(page, "status")).toHaveText("no");
  await pick(page, {
    name: "types.csv",
    text: TYPES_CSV.replace(/^([^,]*,[^,]*),[^,]*/gm, "$1"),
  });
}

/** The rows of types.csv as read, with the types the reader infers. */
const TYPES_ROWS: readonly ColumnRow[] = [
  { name: "IID", type: "identifier", values: "s000 · s001 · s002" },
  {
    name: "status",
    type: "binary",
    coding: ["yes", "no is coded 0."],
    values: "yes · no",
  },
  { name: "score", type: "continuous", values: "1 · 2 · 3" },
  { name: "height", type: "continuous", values: "1.75 · 1.62 · 1.80" },
  { name: "region", type: "categorical", values: "north · south · east" },
];

function undo(page: Page): Promise<void> {
  return page
    .getByRole("banner")
    .getByRole("button", { name: "Undo", exact: true })
    .click();
}

function notice(page: Page): Locator {
  return page.getByRole("region", { name: "Notice" });
}

function status(page: Page): Locator {
  return page.getByRole("status").last();
}

/** The button beside the warning of the types set and not applied, which
    forgets them. */
function forgetButton(page: Page): Locator {
  return page
    .getByRole("region", { name: "Columns" })
    .getByRole("button", { name: /^Forget th(ese types|is type)$/ });
}

/** The lines of panel_pops.csv, the header first. */
async function panelPopsLines(): Promise<string[]> {
  const text = await readFile(join(FIXTURES, "panel_pops.csv"), "utf8");
  return text.split("\n").filter((line) => line !== "");
}

/** panel_pops.csv with a binary column, sex, F and M in turn, and without
    the individuals of `leftOut`. */
async function withSex(leftOut: readonly string[]): Promise<string> {
  const [header, ...rows] = await panelPopsLines();
  return `${[
    `${header ?? ""},sex`,
    ...rows
      .filter((line) => !leftOut.includes(line.split(",")[0] ?? ""))
      .map((line, index) => `${line},${index % 2 === 0 ? "F" : "M"}`),
  ].join("\n")}\n`;
}

/** The words of an element whose letters stand on more than one line,
    which the browser cut to fit its width. */
async function cutWords(element: Locator): Promise<string[]> {
  return element.evaluate((root) => {
    const cut: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (
      let node = walker.nextNode();
      node !== null;
      node = walker.nextNode()
    ) {
      // A text hidden from the eye, the label of a select, has a width
      // of 1 px and is on as many lines as it has letters.
      const parent = node.parentElement;
      if (parent !== null && parent.getBoundingClientRect().width <= 1) {
        continue;
      }
      const text = node.textContent ?? "";
      for (const match of text.matchAll(/\S+/g)) {
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        const lines = new Set(
          Array.from(range.getClientRects(), (rect) => Math.round(rect.top)),
        );
        if (lines.size > 1) cut.push(match[0]);
      }
    }
    return cut;
  });
}

/** The fonts of DejaVu Sans, as wide as Verdana and wider than the Mac's
    system font, cut to the Latin letters and the punctuation, which the
    flows give the page themselves, so that a check of the width does not
    rest on the fonts of the machine that runs it. */
const WIDE_FONTS = [
  { file: "DejaVuSans.woff2", weight: "100 500" },
  { file: "DejaVuSans-Bold.woff2", weight: "600 900" },
] as const;

/** Gives the page DejaVu Sans as the font of its text. */
async function useWideFont(page: Page): Promise<void> {
  const faces = await Promise.all(
    WIDE_FONTS.map(async ({ file, weight }) => {
      const bytes = await readFile(join(FIXTURES, "fonts", file));
      return `@font-face { font-family: "Wide test font"; font-weight: ${weight}; src: url(data:font/woff2;base64,${bytes.toString("base64")}) format("woff2"); }`;
    }),
  );
  await page.addStyleTag({
    content: `${faces.join("\n")}\n:root { --font-body: "Wide test font"; font-family: "Wide test font"; }`,
  });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

test("IP5 D2 panel_pops.csv read shows a select of the type in every row but the first, with the types its values allow, and the check", async ({
  page,
  makeAxeBuilder,
}) => {
  await openIndividuals(page);
  await loadPanel(page);
  await pick(page, "panel_pops.csv");

  await expect(zone(page).getByText("200 rows, 2 columns")).toBeVisible();
  await expect(fileButton(page)).toBeFocused();
  await expect(
    page.getByText(
      "The types are inferred from the values. Change one where the inference is wrong: a column of numbered populations, 1 to 12, is inferred continuous and is categorical. The populations are the values of their column, whatever its type.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect
    .poll(() => columnRows(page))
    .toEqual([
      { name: "IID", type: "identifier", values: "s000 · s001 · s002" },
      { name: "popcat", type: "categorical", values: "p0 · p2 · p1" },
    ]);
  await expect(columnsTable(page).getByRole("columnheader")).toHaveText([
    "Column",
    "Type",
    "First values",
  ]);
  // The first column has no select; popcat, of three words, one item.
  await expect(columnsTable(page).getByRole("button")).toHaveCount(1);
  await expect(typeSelect(page, "popcat")).toHaveAccessibleName(
    "categorical Type of popcat",
  );
  expect(await itemsOf(page, typeSelect(page, "popcat"))).toEqual([
    "categorical",
  ]);
  await expect(
    page.getByText("All 200 individuals of panel.nei found", { exact: true }),
  ).toBeVisible();
  await expect(forgetButton(page)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("IP5 D2 a type changed and the value coded 1 chosen are each one step of Undo with no notice, and the warning of few whole numbers goes once its column is categorical", async ({
  page,
  makeAxeBuilder,
}) => {
  await openIndividuals(page);
  await pick(page, { name: "types.csv", text: TYPES_CSV });
  await expect(zone(page).getByText("4 rows, 5 columns")).toBeVisible();
  await expect.poll(() => columnRows(page)).toEqual(TYPES_ROWS);
  await expect(page.getByText(SCORE_WARNING, { exact: true })).toBeVisible();
  // The items: categorical always, binary for two values, continuous for
  // numbers.
  expect(await itemsOf(page, typeSelect(page, "status"))).toEqual([
    "categorical",
    "binary",
  ]);
  expect(await itemsOf(page, typeSelect(page, "score"))).toEqual([
    "categorical",
    "continuous",
  ]);
  expect(await itemsOf(page, typeSelect(page, "region"))).toEqual([
    "categorical",
  ]);
  expect(await itemsOf(page, codingSelect(page, "status"))).toEqual([
    "yes",
    "no",
  ]);
  await expect(codingSelect(page, "status")).toHaveAccessibleName(
    "yes Coded 1, the case, in status",
  );
  await expectNoViolations(makeAxeBuilder);

  await choose(page, typeSelect(page, "score"), "categorical");
  await expect(typeSelect(page, "score")).toHaveText("categorical");
  await expect(page.getByText(SCORE_WARNING)).toHaveCount(0);
  await expect(notice(page)).toHaveCount(0);

  await choose(page, codingSelect(page, "status"), "no");
  await expect(codingSelect(page, "status")).toHaveText("no");
  await expect(
    columnsTable(page).getByText("yes is coded 0.", { exact: true }),
  ).toBeVisible();
  // The two values keep their place, in the order of the reader's
  // proposal, when the coding changes.
  expect(await itemsOf(page, codingSelect(page, "status"))).toEqual([
    "yes",
    "no",
  ]);
  await expect(notice(page)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  // Each is one step of Undo, said in the status region.
  await undo(page);
  await expect(codingSelect(page, "status")).toHaveText("yes");
  await expect(
    columnsTable(page).getByText("no is coded 0.", { exact: true }),
  ).toBeVisible();
  await expect(status(page)).toHaveText(
    "Undone: the value coded 1 in status changed.",
  );
  await undo(page);
  await expect(typeSelect(page, "score")).toHaveText("continuous");
  await expect(page.getByText(SCORE_WARNING, { exact: true })).toBeVisible();
  await expect(status(page)).toHaveText("Undone: the type of score changed.");
  await expect(notice(page)).toHaveCount(0);

  // Binary chosen again after categorical gives the reader's coding.
  await choose(page, typeSelect(page, "status"), "categorical");
  await expect(codingSelect(page, "status")).toHaveCount(0);
  await choose(page, typeSelect(page, "status"), "binary");
  await expect(codingSelect(page, "status")).toHaveText("yes");
});

test("IP5 D2 the separator set to the semicolon names the types that wait with Forget these types, the comma applies them again, and Forget with one column puts the focus on the file button", async ({
  page,
  makeAxeBuilder,
}) => {
  await openIndividuals(page);
  await pick(page, { name: "types.csv", text: TYPES_CSV });
  await expect.poll(() => columnRows(page)).toEqual(TYPES_ROWS);
  await choose(page, typeSelect(page, "score"), "categorical");
  await choose(page, codingSelect(page, "status"), "no");

  await choose(page, select(page, "Separator"), "Semicolon");

  await expect(zone(page).getByText("4 rows, 1 column")).toBeVisible();
  const columns = page.getByRole("region", { name: "Columns" });
  await expect(
    columns.getByText("Warning: 2 columns do not have the type you set:", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(columns.getByRole("listitem")).toHaveText([
    "score: categorical; types.csv has no column score",
    "status: binary with no coded 1; types.csv has no column status",
  ]);
  await expect(
    columns.getByText(
      "Each type you set comes back when the file is read with a column that allows it.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(forgetButton(page)).toHaveText("Forget these types");
  // The end of the read says so, in short.
  await expect(status(page)).toHaveText(
    /2 columns do not have the type you set\.$/,
  );
  await expectNoViolations(makeAxeBuilder);

  // The comma applies every type set again, and the warning goes.
  await choose(page, select(page, "Separator"), "Comma");
  await expect(typeSelect(page, "score")).toHaveText("categorical");
  await expect(codingSelect(page, "status")).toHaveText("no");
  await expect(forgetButton(page)).toHaveCount(0);

  // The semicolon again, and the types forgotten: the warning goes, and
  // the table has no select to take the focus.
  await choose(page, select(page, "Separator"), "Semicolon");
  await expect(forgetButton(page)).toBeVisible();
  await forgetButton(page).click();
  await expect(forgetButton(page)).toHaveCount(0);
  await expect(columns.getByText(/^Warning: /)).toHaveCount(0);
  await expect(fileButton(page)).toBeFocused();
  await expect(notice(page)).toHaveCount(0);

  // Forgotten, they do not come back with the comma.
  await choose(page, select(page, "Separator"), "Comma");
  await expect(typeSelect(page, "score")).toHaveText("continuous");
  await expect(codingSelect(page, "status")).toHaveText("yes");

  // Undo of the comma, then of the forgetting, brings them back waiting.
  await undo(page);
  await expect(zone(page).getByText("4 rows, 1 column")).toBeVisible();
  // Each said last in the status region, which joins what is said within
  // a tenth of a second, the end of the read before it among them.
  await expect(status(page)).toHaveText(
    /Undone: the separator of types\.csv changed\.$/,
  );
  await undo(page);
  await expect(status(page)).toHaveText(
    /Undone: the types set and not applied were forgotten\.$/,
  );
  await expect(forgetButton(page)).toHaveText("Forget these types");
});

test("IP5 D2 Forget this type, pressed with the keyboard on a table with other columns, puts the focus on the first select of a type", async ({
  page,
  makeAxeBuilder,
}) => {
  await openIndividuals(page);
  await pick(page, { name: "types.csv", text: TYPES_CSV });
  await expect.poll(() => columnRows(page)).toEqual(TYPES_ROWS);
  await choose(page, typeSelect(page, "score"), "categorical");

  // A file of other columns: the type set on score waits.
  await pick(page, "panel_pops.csv");
  await expect(zone(page).getByText("200 rows, 2 columns")).toBeVisible();
  const words =
    "Warning: panel_pops.csv has no column score, whose type you set as categorical. The type comes back when the file is read with a column of that name.";
  await expect(page.getByText(words, { exact: true })).toBeVisible();
  await expect(forgetButton(page)).toHaveText("Forget this type");
  await expectNoViolations(makeAxeBuilder);

  await forgetButton(page).focus();
  await page.keyboard.press("Enter");

  await expect(page.getByText(words)).toHaveCount(0);
  await expect(forgetButton(page)).toHaveCount(0);
  await expect(typeSelect(page, "popcat")).toBeFocused();
});

test("IP5 D2 a type set waits when the values no longer allow it, or when its column comes first, in the words of each reason", async ({
  page,
}) => {
  await openIndividuals(page);
  await pick(page, { name: "types.csv", text: TYPES_CSV });
  await expect.poll(() => columnRows(page)).toEqual(TYPES_ROWS);
  // height set continuous by the user, which the reader inferred too.
  await choose(page, typeSelect(page, "height"), "categorical");
  await choose(page, typeSelect(page, "height"), "continuous");

  // With the decimal comma, 1.75 is not a number.
  await choose(page, select(page, "Decimal mark"), "Comma");
  await expect(typeSelect(page, "height")).toHaveText("categorical");
  await expect(
    page.getByText(
      "Warning: height does not have the type you set, continuous, since its values in types.csv do not allow it; it is categorical, as its values give it. The type you set comes back when the file is read with values that allow it.",
      { exact: true },
    ),
  ).toBeVisible();
  // The select offers what the values allow now.
  expect(await itemsOf(page, typeSelect(page, "height"))).toEqual([
    "categorical",
  ]);
  await choose(page, select(page, "Decimal mark"), "Point");
  await expect(typeSelect(page, "height")).toHaveText("continuous");
  await expect(forgetButton(page)).toHaveCount(0);

  // A file whose first column is height: the names of the individuals.
  await pick(page, {
    name: "first.csv",
    text: "height,IID\n1.75,s000\n1.62,s001\n1.80,s002\n",
  });
  await expect(zone(page).getByText("3 rows, 2 columns")).toBeVisible();
  await expect(
    page.getByText(
      "Warning: height is the first column of first.csv, whose cells are the names of the individuals, so it does not have the type you set, continuous. If it should not be first, correct the file and load it again; the type you set then comes back.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect
    .poll(() => columnRows(page))
    .toEqual([
      { name: "height", type: "identifier", values: "1.75 · 1.62 · 1.80" },
      { name: "IID", type: "categorical", values: "s000 · s001 · s002" },
    ]);
});

test("IP5 D2 a type and a value coded 1 changed while the diversity by popcat is done remove no result and make no notice", async ({
  page,
}) => {
  await openIndividuals(page);
  await loadPanel(page);
  await pick(page, { name: "pops.csv", text: await withSex([]) });
  await expect(zone(page).getByText("200 rows, 3 columns")).toBeVisible();
  await choose(
    page,
    select(page, "Column that defines the populations"),
    "popcat",
  );
  await goTo(page, "Analyses");
  const panel = page.getByRole("region", { name: "Diversity" });
  await panel.getByRole("button", { name: "Run" }).click();
  await expect(panel.getByRole("table")).toBeVisible();

  await goTo(page, "Individuals");
  // M comes second of the two by the numbers of their characters.
  await expect(codingSelect(page, "sex")).toHaveText("M");
  await choose(page, codingSelect(page, "sex"), "F");
  await expect(codingSelect(page, "sex")).toHaveText("F");
  await choose(page, typeSelect(page, "sex"), "categorical");
  await expect(codingSelect(page, "sex")).toHaveCount(0);
  await expect(notice(page)).toHaveCount(0);

  await goTo(page, "Analyses");
  await expect(panel.getByRole("table")).toBeVisible();
  await expect(
    panel
      .getByRole("row")
      .filter({ has: page.getByRole("rowheader", { name: "p0", exact: true }) })
      .getByRole("cell"),
  ).toHaveText(["48", "0.3519", "0.3564", "0.9267"]);
});

test("IP5 D2 the names missing copied by Copy the 12 names, one a line, and announced", async ({
  page,
  context,
  browserName,
  makeAxeBuilder,
}) => {
  // Playwright gives Chromium the clipboard only with both permissions;
  // WebKit lets the page write on a press, and the test read once granted.
  await context.grantPermissions(
    browserName === "chromium"
      ? ["clipboard-read", "clipboard-write"]
      : ["clipboard-read"],
  );
  await openIndividuals(page);
  await loadPanel(page);
  await pick(page, { name: "pops.csv", text: await withSex(LEFT_OUT) });
  await expect(zone(page).getByText("188 rows, 3 columns")).toBeVisible();
  // The end of the read said first, so that the copy's words come alone.
  await expect(status(page)).toHaveText(/^pops\.csv read: /);

  const disclosure = page.getByRole("button", {
    name: "The 12 individuals missing",
  });
  await expect(
    page.getByRole("button", { name: "Copy the 12 names" }),
  ).toHaveCount(0);
  await disclosure.click();
  const copy = page.getByRole("button", { name: "Copy the 12 names" });
  await expect(copy).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  await copy.click();

  await expect(status(page)).toHaveText("12 names copied.");
  await expect(copy).toBeFocused();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(LEFT_OUT.join("\n"));

  // While individuals are missing, no list of the populations, whether a
  // column or the one population is chosen.
  const populations = page.getByRole("region", { name: "Populations" });
  const column = select(page, "Column that defines the populations");
  await choose(page, column, "popcat");
  await expect(column).toHaveText("popcat");
  await expect(populations.getByRole("list")).toHaveCount(0);
  await choose(page, column, "All individuals in one population");
  await expect(column).toHaveText("All individuals in one population");
  await expect(populations.getByRole("list")).toHaveCount(0);
});

test("IP5 D2 in a page without the clipboard the copy says the names could not be copied, and to select them in the list", async ({
  page,
}) => {
  await openIndividuals(page);
  await loadPanel(page);
  // A browser without the clipboard, as on a page served over plain HTTP
  // from another machine.
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", { value: undefined });
  });
  // One individual missing, whose button names one.
  await pick(page, { name: "pops.csv", text: await withSex(["s031"]) });
  await expect(zone(page).getByText("199 rows, 3 columns")).toBeVisible();
  // The end of the read said first, so that the copy's words come alone.
  await expect(status(page)).toHaveText(/^pops\.csv read: /);
  await page.getByRole("button", { name: "The 1 individual missing" }).click();

  await page.getByRole("button", { name: "Copy the name" }).click();

  await expect(status(page)).toHaveText(
    "The names could not be copied. Select them in the list.",
  );
});

test("IP5 D2 the Tab key goes through the table in the order of the spec, and the selects of a row are driven with the keyboard", async ({
  page,
  makeAxeBuilder,
}) => {
  await openIndividuals(page);
  await loadPanel(page);
  // A type set on a column the next file does not have, which waits.
  await pick(page, {
    name: "first.csv",
    text: "IID,extra\ns000,u\ns001,v\n",
  });
  await choose(page, typeSelect(page, "extra"), "categorical");
  await pick(page, { name: "pops.csv", text: await withSex(LEFT_OUT) });
  await expect(zone(page).getByText("188 rows, 3 columns")).toBeVisible();
  await expect(forgetButton(page)).toHaveText("Forget this type");
  await page
    .getByRole("button", { name: "The 12 individuals missing" })
    .click();
  await expect(
    page.getByRole("button", { name: "Copy the 12 names" }),
  ).toBeVisible();

  // Each select named by its label, after the value React Aria reads
  // first.
  await expect(typeSelect(page, "popcat")).toHaveAccessibleName(
    "categorical Type of popcat",
  );
  await expect(typeSelect(page, "sex")).toHaveAccessibleName(
    "binary Type of sex",
  );
  await expect(codingSelect(page, "sex")).toHaveAccessibleName(
    "M Coded 1, the case, in sex",
  );
  // The eye reads the label without the column, which it takes from the
  // row, and the label of the type not at all, under the header "Type".
  const width = async (text: string): Promise<number | undefined> =>
    (await columnsTable(page).getByText(text, { exact: true }).boundingBox())
      ?.width;
  expect(await width("Coded 1, the case")).toBeGreaterThan(1);
  expect(await width("Coded 1, the case, in sex")).toBeLessThanOrEqual(1);
  expect(await width("Type of sex")).toBeLessThanOrEqual(1);
  await expectNoViolations(makeAxeBuilder);

  await page.getByRole("heading", { level: 1, name: "Individuals" }).focus();
  const order = [
    zone(page).getByRole("button", {
      name: "Paste a metadata file",
      exact: true,
    }),
    fileButton(page),
    zone(page).getByRole("button", { name: "Remove pops.csv" }),
    select(page, "Encoding"),
    select(page, "Separator"),
    select(page, "Decimal mark"),
    forgetButton(page),
    typeSelect(page, "popcat"),
    typeSelect(page, "sex"),
    codingSelect(page, "sex"),
    page.getByRole("button", { name: "The 12 individuals missing" }),
    page.getByRole("button", { name: "Copy the 12 names" }),
    select(page, "Column that defines the populations"),
  ];
  for (const next of order) {
    await page.keyboard.press("Tab");
    await expect(next).toBeFocused();
  }

  // The value coded 1, with the keyboard: the list opens on the value
  // chosen, and the arrow reaches the other.
  await codingSelect(page, "sex").focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("option", { name: "M", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("option", { name: "F", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(codingSelect(page, "sex")).toHaveText("F");
  await expect(codingSelect(page, "sex")).toBeFocused();
  await expect(
    columnsTable(page).getByText("M is coded 0.", { exact: true }),
  ).toBeVisible();

  // The type, with the keyboard: categorical takes the coding away, and
  // the Tab key goes on to the disclosure.
  await typeSelect(page, "sex").focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("option", { name: "binary", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(typeSelect(page, "sex")).toHaveText("categorical");
  await expect(typeSelect(page, "sex")).toBeFocused();
  await expect(codingSelect(page, "sex")).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "The 12 individuals missing" }),
  ).toBeFocused();
});

test("IP5 D2 Remove takes the types set with the file, puts the focus on the file button, and the file picked again has the types the reader infers", async ({
  page,
  makeAxeBuilder,
}) => {
  await openIndividuals(page);
  await pick(page, { name: "types.csv", text: TYPES_CSV });
  await expect.poll(() => columnRows(page)).toEqual(TYPES_ROWS);
  await choose(page, typeSelect(page, "score"), "categorical");

  await zone(page).getByRole("button", { name: "Remove types.csv" }).click();

  await expect(fileButton(page)).toHaveText("Choose a metadata file…");
  await expect(fileButton(page)).toBeFocused();
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation", { name: "Steps" })
      .getByRole("link", { name: "Individuals" }),
  ).toHaveAccessibleName("Individuals, Optional");
  await expectNoViolations(makeAxeBuilder);

  await pick(page, { name: "types.csv", text: TYPES_CSV });
  await expect.poll(() => columnRows(page)).toEqual(TYPES_ROWS);
  await expect(forgetButton(page)).toHaveCount(0);
});

test("IP5 D2 while a read of other options is under way the table, the warning of the types and the check are gone, and come back with the read", async ({
  page,
}) => {
  await openIndividuals(page);
  await loadPanel(page);
  await setTypesThenDropScore(page);
  await expect(zone(page).getByText("4 rows, 4 columns")).toBeVisible();
  // The type set on score waits, and the check finds none of panel.nei.
  await expect(forgetButton(page)).toHaveText("Forget this type");
  await expect(
    page.getByRole("region", { name: "Individuals of panel.nei" }),
  ).toBeVisible();

  // The read of the next options is held on its way to the light worker.
  await holdReads(page);
  await choose(page, select(page, "Separator"), "Semicolon");

  await expect(zone(page).getByText("Reading types.csv.")).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(forgetButton(page)).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Individuals of panel.nei" }),
  ).toHaveCount(0);
  await expect(select(page, "Separator")).toHaveText("Semicolon");

  await releaseReads(page);
  await expect(zone(page).getByText("4 rows, 1 column")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Individuals of panel.nei" }),
  ).toBeVisible();
  await expect(forgetButton(page)).toHaveText("Forget these types");
});

for (const font of ["the font of the system", "a wide font"] as const) {
  test(`IP5 D2 at 320 px wide, in ${font}, the table of the columns with its selects, the warning of a few whole numbers, the warning of the types that wait and the problem of the check fit, no word cut and no sideways scroll`, async ({
    page,
    makeAxeBuilder,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await openIndividuals(page);
    if (font === "a wide font") await useWideFont(page);
    await loadPanel(page);
    await pick(page, { name: "types.csv", text: TYPES_CSV });
    await choose(page, typeSelect(page, "height"), "categorical");
    await choose(page, codingSelect(page, "status"), "no");
    // The same file without height, whose type set then waits, and with a
    // column of a long name with no space.
    await pick(page, {
      name: "types.csv",
      text:
        "IID,status,score,region,Numero_de_la_poblacion_de_origen\n" +
        "s000,yes,1,north,x\n" +
        "s001,no,2,south,y\n" +
        "s002,yes,3,east,x\n" +
        "s003,no,5,north,z\n",
    });
    await expect(zone(page).getByText("4 rows, 5 columns")).toBeVisible();
    // The end of the read, whole, with what it brings up on the step, in
    // the order of shell.md, "The status region".
    await expect(status(page)).toHaveText(
      "types.csv read: 4 rows, 5 columns. 196 individuals of panel.nei are not in types.csv. Warning: score may hold codes and is taken as a measurement. height does not have the type you set.",
    );
    await expect(forgetButton(page)).toBeVisible();
    await expect(codingSelect(page, "status")).toBeVisible();
    const table = columnsTable(page);
    await expect(table.getByText(/^Warning: score holds/)).toHaveCount(1);
    const problem = page
      .getByRole("region", { name: "Individuals of panel.nei" })
      .getByText(/^196 individuals of panel\.nei are not in types\.csv/);
    await expect(problem).toHaveCount(1);

    const sideways = (): Promise<boolean> =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
    expect(await sideways()).toBe(false);
    for (const part of [
      table.getByRole("columnheader"),
      table.getByRole("rowheader"),
      table.getByRole("button"),
      table.getByText(/ is coded 0\.$/),
      table.getByText(/^Warning: score holds/),
      page.getByText(/^Warning: types\.csv has no column height/),
      problem,
    ]) {
      for (const one of await part.all()) {
        expect(
          (await cutWords(one)).filter(
            (word) => word !== "Numero_de_la_poblacion_de_origen",
          ),
        ).toEqual([]);
      }
    }
    // Each select stays inside its cell.
    for (const button of await table.getByRole("button").all()) {
      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(320);
    }
    await expectNoViolations(makeAxeBuilder);
  });
}

/** The heading of the step, where the focus goes when the control that
    had it leaves the page with an Undo or a Redo. */
function stepHeading(page: Page): Locator {
  return page.getByRole("heading", { level: 1, name: "Individuals" });
}

test("IP5 D2 an Undo with the keyboard that removes Forget these types, and a Redo that removes the select of a type, each hand the focus to the h1 of the step", async ({
  page,
}) => {
  await openIndividuals(page);
  await pick(page, { name: "types.csv", text: TYPES_CSV });
  await expect.poll(() => columnRows(page)).toEqual(TYPES_ROWS);
  await choose(page, typeSelect(page, "score"), "categorical");
  await choose(page, select(page, "Separator"), "Semicolon");
  await expect(forgetButton(page)).toHaveText("Forget this type");

  // The Undo of the separator applies the types again, and the warning
  // goes with its button.
  await forgetButton(page).focus();
  await page.keyboard.press("Control+z");
  await expect(forgetButton(page)).toHaveCount(0);
  await expect(typeSelect(page, "score")).toHaveText("categorical");
  await expect(stepHeading(page)).toBeFocused();

  // The Redo reads the file as one column again, and the select of a type
  // goes.
  await typeSelect(page, "score").focus();
  await page.keyboard.press("Control+Shift+z");
  await expect(zone(page).getByText("4 rows, 1 column")).toBeVisible();
  await expect(typeSelect(page, "score")).toHaveCount(0);
  await expect(stepHeading(page)).toBeFocused();
  // The next Tab goes on from the heading, into the step.
  await page.keyboard.press("Tab");
  await expect(
    zone(page).getByRole("button", { name: "Paste a metadata file" }),
  ).toBeFocused();
});

test("IP5 D2 an Undo with the keyboard of the type binary removes the select of the value coded 1 with the focus, which goes to the h1 of the step", async ({
  page,
}) => {
  await openIndividuals(page);
  await pick(page, { name: "types.csv", text: TYPES_CSV });
  await expect.poll(() => columnRows(page)).toEqual(TYPES_ROWS);
  await choose(page, typeSelect(page, "status"), "categorical");
  await choose(page, typeSelect(page, "status"), "binary");
  await expect(codingSelect(page, "status")).toHaveText("yes");

  await codingSelect(page, "status").focus();
  await page.keyboard.press("Control+z");

  await expect(typeSelect(page, "status")).toHaveText("categorical");
  await expect(codingSelect(page, "status")).toHaveCount(0);
  await expect(stepHeading(page)).toBeFocused();

  // An Undo that leaves the control with the focus on the page leaves the
  // focus there.
  await typeSelect(page, "status").focus();
  await page.keyboard.press("Control+z");
  await expect(codingSelect(page, "status")).toHaveText("yes");
  await expect(typeSelect(page, "status")).toBeFocused();
});

test("IP5 D2 a Redo with the keyboard whose read is under way removes the table with the focus in it, which goes to the h1 of the step", async ({
  page,
}) => {
  await openIndividuals(page);
  await pick(page, { name: "types.csv", text: TYPES_CSV });
  await expect.poll(() => columnRows(page)).toEqual(TYPES_ROWS);
  // The read of the next options is held on its way to the light worker.
  await holdReads(page);
  await choose(page, select(page, "Separator"), "Semicolon");
  await expect(zone(page).getByText("Reading types.csv.")).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Undo", exact: true })
    .click();
  await expect(typeSelect(page, "height")).toBeVisible();

  await typeSelect(page, "height").focus();
  await page.keyboard.press("Control+Shift+z");

  await expect(zone(page).getByText("Reading types.csv.")).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(stepHeading(page)).toBeFocused();
  await releaseReads(page);
  await expect(zone(page).getByText("4 rows, 1 column")).toBeVisible();
});

test("IP5 D2 a column of the populations that a new file puts first is no column of the populations: the select asks for a column, with the reason of a column not in the file", async ({
  page,
  makeAxeBuilder,
}) => {
  await openIndividuals(page);
  await loadPanel(page);
  await pick(page, "panel_pops.csv");
  await choose(
    page,
    select(page, "Column that defines the populations"),
    "popcat",
  );
  await expect(page.getByText("p0 · 48", { exact: true })).toBeVisible();

  // The same rows, the header naming the column of the names popcat.
  const [, ...rows] = await panelPopsLines();
  await pick(page, {
    name: "swapped.csv",
    text: `${["popcat,IID", ...rows].join("\n")}\n`,
  });

  await expect(zone(page).getByText("200 rows, 2 columns")).toBeVisible();
  const column = select(page, "Column that defines the populations");
  await expect(column).toHaveText("Choose a column");
  const reason =
    "swapped.csv has no column popcat, from which the populations were taken. Choose the column that defines the populations, or all individuals in one population.";
  await expect(
    page.getByRole("main").getByText(reason, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Populations" }).getByRole("list"),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation", { name: "Steps" })
      .getByRole("link", { name: "Individuals" }),
  ).toHaveAccessibleName("Individuals, Problem");
  await expect(
    page.getByText(/ · column popcat not in swapped\.csv$/),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
});

for (const font of ["the font of the system", "a wide font"] as const) {
  test(`IP5 D2 at 320 px wide, in ${font}, a column of a long name and long values with no space keeps the page from scrolling sideways, and a word that fits is not cut`, async ({
    page,
    makeAxeBuilder,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await openIndividuals(page);
    if (font === "a wide font") await useWideFont(page);
    await pick(page, {
      name: "salud.csv",
      text:
        "Individuo,Estado_de_salud_del_individuo,Numero_de_la_poblacion_de_origen,Column,Sano\n" +
        "s000,Sano_y_vacunado,1,España,sí\n" +
        "s001,Enfermo_sin_vacunar,2,Italia,no\n" +
        "s002,Sano_y_vacunado,3,Perú,sí\n" +
        "s003,Convaleciente_de_la_gripe,2,España,no\n",
    });
    await expect(zone(page).getByText("4 rows, 5 columns")).toBeVisible();
    await expect(
      page.getByText(/^Warning: Numero_de_la_poblacion_de_origen holds only/),
    ).toBeVisible();

    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);
    const table = columnsTable(page);
    const box = await table.boundingBox();
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(320);
    // The words that fit their column are not cut to make room for the
    // others: the names, the headers, the values, the selects and the
    // warning, but for the long names and values.
    const long =
      /^(Estado_de_salud_del_individuo|Numero_de_la_poblacion_de_origen|Sano_y_vacunado|Enfermo_sin_vacunar|Convaleciente_de_la_gripe)/;
    for (const part of [
      table.getByRole("columnheader"),
      table.getByRole("rowheader"),
      table.getByRole("button"),
      table.getByRole("cell"),
    ]) {
      for (const one of await part.all()) {
        expect(
          (await cutWords(one)).filter((word) => !long.test(word)),
        ).toEqual([]);
      }
    }
    await expectNoViolations(makeAxeBuilder);
  });
}

test("IP5 D2 a click on the words Coded 1, the case focuses the select of the value coded 1, as a click on a label does", async ({
  page,
}) => {
  await openIndividuals(page);
  await pick(page, { name: "types.csv", text: TYPES_CSV });
  await expect.poll(() => columnRows(page)).toEqual(TYPES_ROWS);

  await columnsTable(page)
    .getByText("Coded 1, the case", { exact: true })
    .click();

  await expect(codingSelect(page, "status")).toBeFocused();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  // The name is as it was, and the words shown are not read a second time:
  // the tree of accessibility holds them only with the column, as the
  // label of the select, never alone.
  await expect(codingSelect(page, "status")).toHaveAccessibleName(
    "yes Coded 1, the case, in status",
  );
  const tree = await columnsTable(page).ariaSnapshot();
  expect(tree).toContain("Coded 1, the case, in status");
  expect(tree.match(/Coded 1, the case(?!, in status)/g)).toBeNull();
  // A click on the label of another select does the same.
  await page.getByText("Separator", { exact: true }).click();
  await expect(select(page, "Separator")).toBeFocused();
});

/** What the page is given to hold the reads of the metadata file. */
interface Holding {
  /** Whether a read asked for now is held. */
  holding: boolean;
  /** Sends the reads held, and holds no more. */
  releaseReads: () => void;
}

/** From now on, every read of the metadata file the page asks for is
    held on its way to the light worker, until `releaseReads`. */
async function holdReads(page: Page): Promise<void> {
  await page.evaluate(() => {
    const state = window as unknown as Partial<Holding>;
    state.holding = true;
    if (state.releaseReads !== undefined) return;
    const held: (() => void)[] = [];
    const pageWorker = window.Worker.prototype;
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with its worker, by apply
    const post = pageWorker.postMessage;
    pageWorker.postMessage = function (
      this: typeof pageWorker,
      ...args: [message: unknown, options?: StructuredSerializeOptions]
    ) {
      const [message] = args;
      if (
        state.holding === true &&
        typeof message === "object" &&
        message !== null &&
        "kind" in message &&
        message.kind === "readIndividuals"
      ) {
        held.push(() => {
          post.apply(this, args);
        });
        return;
      }
      post.apply(this, args);
    } as typeof pageWorker.postMessage;
    state.releaseReads = () => {
      state.holding = false;
      for (const send of held.splice(0)) send();
    };
  });
}

async function releaseReads(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as Holding).releaseReads();
  });
}
