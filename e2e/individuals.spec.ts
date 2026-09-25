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
  await expect(
    page.getByText(
      'If names with accents come out garbled, "EspaÃ±a" for "España", change the encoding. If the whole file shows as a single column, change the separator. Changing one reads the file again.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      "The types are inferred from the values; changing them comes in a later version.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Any column can define the populations, whatever its type.",
      { exact: true },
    ),
  ).toBeVisible();

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
  // Read "p0, 48 individuals", and nothing of what is shown.
  await expect(
    page.getByRole("region", { name: "Populations" }).getByRole("list"),
  ).toMatchAriaSnapshot(`
    - list:
      - listitem: p0, 48 individuals
      - listitem: p2, 84 individuals
      - listitem: p1, 68 individuals
  `);
  // Shown "p0 · 48", and the words read not shown: a box of one pixel.
  await expect(
    populations.nth(0).getByText("p0 · 48", { exact: true }),
  ).toBeVisible();
  const read = await populations
    .nth(0)
    .getByText("p0, 48 individuals", { exact: true })
    .boundingBox();
  expect(read === null || (read.width <= 1 && read.height <= 1)).toBe(true);
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

/** What the page is given to hold the reads of the metadata file. */
interface Holding {
  /** Whether a read asked for now is held. */
  holding: boolean;
  /** Sends the reads held, and holds no more. */
  releaseReads: () => void;
}

/** From now on, every read of the metadata file the page asks for is
    held on its way to the light worker, whose script has already
    started, until `releaseReads`. */
async function holdReads(page: Page): Promise<void> {
  await page.evaluate(() => {
    const state = window as unknown as Partial<Holding>;
    state.holding = true;
    if (state.releaseReads !== undefined) return;
    const held: (() => void)[] = [];
    // The page's Worker, which the Worker of Playwright imported above
    // would otherwise name.
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

/** The words of the items of the select of that label, which is opened
    and closed again. */
async function itemsOf(page: Page, label: string): Promise<string[]> {
  await select(page, label).click();
  const items = await page.getByRole("option").allTextContents();
  await page.keyboard.press("Escape");
  return items;
}

test("WS8 D1 the first item of the separator names what was detected once the option is auto again and the file is read, and not while it is set", async ({
  page,
}) => {
  await openIndividuals(page);
  await pick(page, "panel_pops.csv");
  await expect(select(page, "Separator")).toHaveText("Detected: comma");
  await holdReads(page);

  await choose(page, "Separator", "Semicolon");
  await choose(page, "Separator", "Comma");
  await expect(zone(page).getByText("Reading panel_pops.csv.")).toBeVisible();
  await releaseReads(page);
  await expect(zone(page).getByText("200 rows, 2 columns")).toBeVisible();
  // Set by the user: the first item does not say what a read found.
  expect(await itemsOf(page, "Separator")).toEqual([
    "Detected",
    "Comma",
    "Semicolon",
    "Tab",
  ]);

  await holdReads(page);
  await choose(page, "Separator", "Detected");
  await expect(zone(page).getByText("Reading panel_pops.csv.")).toBeVisible();
  await releaseReads(page);
  await expect(select(page, "Separator")).toHaveText("Detected: comma");
  expect((await itemsOf(page, "Separator"))[0]).toBe("Detected: comma");
});

test("WS8 D1 a file of UTF-16 keeps its line in place of the encoding while it is read again", async ({
  page,
}) => {
  await openIndividuals(page);
  const bom = Buffer.from([0xff, 0xfe]);
  const body = Buffer.from("IID\tpop\r\ns000\tp0\r\n", "utf16le");
  await pick(page, { name: "unicode.txt", text: Buffer.concat([bom, body]) });
  const line = page.getByText(
    "Encoding: UTF-16, from the mark at the start of the file.",
  );
  await expect(line).toBeVisible();
  for (const [label, option] of [
    ["Separator", "Tab"],
    ["Decimal mark", "Comma"],
  ] as const) {
    await holdReads(page);
    await choose(page, label, option);
    await expect(zone(page).getByText("Reading unicode.txt.")).toBeVisible();
    await expect(line).toBeVisible();
    await expect(select(page, "Encoding")).toHaveCount(0);
    await releaseReads(page);
    await expect(zone(page).getByText("1 row, 2 columns")).toBeVisible();
    await expect(line).toBeVisible();
  }
});

test("WS8 D1 a column whose name reverses the text is named escaped in its warning", async ({
  page,
  makeAxeBuilder,
}) => {
  await openIndividuals(page);
  await pick(page, {
    name: "codes.csv",
    text: "IID,score\u202eevil\ns000,1\ns001,2\ns002,3\n",
  });

  const row = page
    .getByRole("table", { name: "Columns" })
    .getByRole("row")
    .nth(2);
  await expect(row.getByRole("rowheader")).toHaveText("score\\u202eevil");
  await expect(row).toContainText(
    "Warning: score\\u202eevil holds only 3 different whole numbers, from 1 to 3, and is taken as a measurement.",
  );
  await expect(row).not.toContainText("\u202e");
  await expectNoViolations(makeAxeBuilder);
});

test("WS8 D1 several files dropped at once load none, and the step says why and announces it", async ({
  page,
  makeAxeBuilder,
}) => {
  await openIndividuals(page);
  const bytes = [...(await readFile(join(FIXTURES, "panel_pops.csv")))];
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
    for (const name of ["a.csv", "b.csv"]) {
      transfer.items.add(new File([new Uint8Array(given)], name));
    }
    return transfer;
  }, bytes);
  for (const type of ["dragenter", "dragover", "drop"]) {
    await fileButton(page).dispatchEvent(type, { dataTransfer });
  }

  const message = "Drop one metadata file at a time.";
  await expect(
    page.getByRole("main").getByText(message, { exact: true }),
  ).toBeVisible();
  // Announced too, since the focus does not move to it.
  await expect(page.getByRole("status").last()).toHaveText(message);
  await expect(fileButton(page)).toHaveText("Choose a metadata file…");
  await expectNoViolations(makeAxeBuilder);
});

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

// 320 px is a phone, and 640 px a window of 1280 px at 200% zoom.
for (const width of [320, 640]) {
  test(`WS8 D1 at ${String(width)} px wide no word of the table of the columns, of a warning or of a problem is cut, and the page does not scroll sideways`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await openIndividuals(page);
    await pick(page, {
      name: "codes.csv",
      text: "IID,score\ns000,1\ns001,2\ns002,3\n",
    });
    const table = page.getByRole("table", { name: "Columns" });
    await expect(table).toBeVisible();
    const parts = [
      table.getByRole("columnheader", { name: "Column", exact: true }),
      table.getByRole("columnheader", { name: "Type", exact: true }),
      table.getByRole("columnheader", { name: "First values", exact: true }),
      table.getByRole("rowheader", { name: "score", exact: true }),
      // The warning, whose "measurement" was cut at 320 px.
      table.getByText(/^Warning: score holds only 3/),
    ];
    for (const part of parts) {
      expect(await cutWords(part)).toEqual([]);
    }
    const sideways = (): Promise<boolean> =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
    expect(await sideways()).toBe(false);

    // A problem: the reason of a file refused.
    await pick(page, {
      name: "short.csv",
      text: "IID;popcat;region\ns000;p0;north\ns001;p0\n",
    });
    const reason = zone(page).getByText(/^short\.csv could not be read/);
    await expect(reason).toBeVisible();
    expect(await cutWords(reason)).toEqual([]);
    expect(await sideways()).toBe(false);

    // A word longer than the line, a name of a file with no space, is
    // cut to fit rather than pushing the page sideways.
    const longName = `${"metadata_of_the_collection_".repeat(3)}2026.xlsx`;
    await pick(page, { name: longName, text: "PK" });
    await expect(
      page.getByRole("main").getByText(/was not loaded: this version/),
    ).toBeVisible();
    expect(await sideways()).toBe(false);
  });
}

test("WS8 D1 a column empty for every individual of the variants file gives its reason at the select", async ({
  page,
  makeAxeBuilder,
}) => {
  await openIndividuals(page);
  await loadPanel(page);
  const lines = await panelPopsLines();
  const withEmpty = lines.map((line, index) =>
    index === 0 ? `${line},region` : `${line},`,
  );
  await pick(page, { name: "pops.csv", text: `${withEmpty.join("\n")}\n` });
  await choose(page, "Column that defines the populations", "region");

  const reason =
    "No individual of panel.nei has a population in the column region of pops.csv. Fill in the column and load the file again, or choose another column, in the Individuals step.";
  await expect(page.getByText(reason, { exact: true })).toBeVisible();
  await expect(
    select(page, "Column that defines the populations"),
  ).toHaveAccessibleDescription(new RegExp(reason.replace(/\./g, "\\.")));
  // No population, and every individual in the line of those in none.
  await expect(
    page.getByRole("region", { name: "Populations" }).getByRole("list"),
  ).toMatchAriaSnapshot(`
    - list:
      - listitem: No population, 200 individuals, left out of the analyses per population
  `);
  await expectNoViolations(makeAxeBuilder);
});

test("WS8 D1 an individual missing whose name holds a control character is listed escaped", async ({
  page,
}) => {
  await openIndividuals(page);
  await goTo(page, "Variants");
  const vcf =
    "##fileformat=VCFv4.2\n" +
    "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\ti1\ti\u0001x\n" +
    "1\t100\t.\tA\tG\t.\tPASS\t.\tGT\t0/1\t1/1\n";
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Variants file" })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "odd.vcf",
    mimeType: "text/plain",
    buffer: Buffer.from(vcf),
  });
  await expect(page.getByText("2 individuals")).toBeVisible();
  await goTo(page, "Individuals");
  await pick(page, { name: "pops.csv", text: "IID,pop\ni1,p0\n" });

  await page.getByRole("button", { name: "The 1 individual missing" }).click();
  const names = page
    .getByRole("region", { name: "Populations" })
    .getByRole("listitem");
  await expect(names).toHaveText(["i\\u0001x"]);
});
