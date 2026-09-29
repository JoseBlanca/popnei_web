/**
 * The metadata file read from an xlsx, on the built site, through the
 * package of the release of xlsx_rs that package.json names
 * (docs/specs/worker/individuals.md, "How it is verified", "With
 * Playwright, from stage 4"; docs/specs/steps/individuals.md, "The file"
 * and "How the file was read"; the refusals of "Its words"). The xlsx
 * files, and excel97.xls, are those of the tests of xlsx_rs,
 * tests/data/ at 4a29ee7, copied into e2e/fixtures/.
 *
 * The HTML standard lets an engine keep a failed import() as failed for
 * the life of the worker, as Chromium 153 does, so a second try after
 * the JavaScript of the reader failed to download asks for it at
 * another address; the flow checks that the file is read in both
 * engines.
 */
import { join } from "node:path";
import { readFile } from "node:fs/promises";

import type { Locator, Page, Request } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The two files of the package of xlsx_rs in the built site: its
    JavaScript, a file of its own, and its wasm. */
const XLSX_JS = /\/xlsx_rs-[^/]*\.js$/;
const XLSX_WASM = /\/xlsx_rs_bg-[^/]*\.wasm$/;

/** What the step says when the reader of xlsx files was not downloaded,
    with no end of its own (docs/specs/core/project.md). */
function notLoadedText(name: string): string {
  return `${name} could not be read: the part of the application that reads Excel files could not be downloaded; check the connection and load the file again; if it fails again, the site may have been updated since this page was opened: save the project, reload the page and open the project again.`;
}

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

function zone(page: Page): Locator {
  return page.getByRole("region", { name: "Metadata file" });
}

function fileButton(page: Page): Locator {
  return zone(page).getByRole("button", { name: /^(Choose|Replace) .*…$/ });
}

/** Picks a fixture, or the bytes of one under another name, with the
    file button, as a user does. */
async function pick(
  page: Page,
  file: string | { readonly name: string; readonly fixture: string },
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
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          buffer: await readFile(join(FIXTURES, file.fixture)),
        },
  );
}

/** The requests of the page and its workers for the two files of the
    package of xlsx_rs, as they are made. */
function xlsxRequests(page: Page): {
  readonly js: () => number;
  readonly wasm: () => number;
} {
  const seen: Request[] = [];
  page.on("request", (request) => {
    seen.push(request);
  });
  const count = (pattern: RegExp) => (): number =>
    seen.filter((request) => pattern.test(new URL(request.url()).pathname))
      .length;
  return { js: count(XLSX_JS), wasm: count(XLSX_WASM) };
}

/** The table of the columns of excel_en.xlsx, as the step shows it: the
    names, and the date and the booleans as text. */
async function expectExcelEn(page: Page, name: string): Promise<void> {
  await expect(zone(page).getByText("5 rows, 7 columns")).toBeVisible();
  await expect(
    zone(page).getByText(
      `Read from the first sheet of ${name}; any other sheet is not read.`,
      { exact: true },
    ),
  ).toBeVisible();
  const table = page.getByRole("table", { name: "Columns" });
  await expect(table.getByRole("rowheader")).toHaveText([
    "Individuo",
    "Población",
    "Altura",
    "Fecha",
    "Hora",
    "Afectado",
    "Código",
  ]);
  await expect(
    table.getByRole("cell", {
      name: "2024-05-13 · 2024-05-14 · 2024-05-15",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    table.getByRole("cell", { name: "true · false", exact: true }),
  ).toBeVisible();
}

test("IP9 D2 excel_en.xlsx is read from its first sheet, with no options of a CSV, and the reader of xlsx files is downloaded once, on the first xlsx", async ({
  page,
  makeAxeBuilder,
}) => {
  const requests = xlsxRequests(page);
  await openIndividuals(page);
  expect(requests.js()).toBe(0);
  expect(requests.wasm()).toBe(0);

  await pick(page, "excel_en.xlsx");

  await expectExcelEn(page, "excel_en.xlsx");
  await expect(fileButton(page)).toHaveText("Replace excel_en.xlsx…");
  // An xlsx has none of the three options of a CSV.
  await expect(
    page.getByRole("region", { name: "How the file is read" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Encoding/ })).toHaveCount(0);
  expect(requests.js()).toBe(1);
  expect(requests.wasm()).toBe(1);
  await expectNoViolations(makeAxeBuilder);

  // A second xlsx downloads nothing more.
  await pick(page, { name: "second.xlsx", fixture: "excel_en.xlsx" });
  await expect(fileButton(page)).toHaveText("Replace second.xlsx…");
  await expectExcelEn(page, "second.xlsx");
  expect(requests.js()).toBe(1);
  expect(requests.wasm()).toBe(1);
});

test("IP9 D2 a CSV read downloads nothing of the reader of xlsx files, and the card has no line of a sheet", async ({
  page,
}) => {
  const requests = xlsxRequests(page);
  await openIndividuals(page);
  await pick(page, "panel_pops.csv");
  await expect(zone(page).getByText("200 rows, 2 columns")).toBeVisible();
  await expect(zone(page).getByText(/^Read from the first sheet/)).toHaveCount(
    0,
  );
  expect(requests.js()).toBe(0);
  expect(requests.wasm()).toBe(0);
});

test("IP9 D2 the wasm of the reader answered with an error: the words of a reader not downloaded, and the file loaded again is read", async ({
  page,
  makeAxeBuilder,
}) => {
  const requests = xlsxRequests(page);
  await page.route(XLSX_WASM, (route) =>
    route.fulfill({ status: 404, body: "Not Found" }),
  );
  await openIndividuals(page);
  await pick(page, "excel_en.xlsx");

  await expect(
    zone(page).getByText(notLoadedText("excel_en.xlsx"), { exact: true }),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  // The light worker goes on: the route removed, the file loaded again
  // is read, the wasm asked for again.
  await page.unroute(XLSX_WASM);
  await pick(page, { name: "again.xlsx", fixture: "excel_en.xlsx" });
  await expectExcelEn(page, "again.xlsx");
  expect(requests.wasm()).toBe(2);
});

test("IP9 D2 the JavaScript of the reader answered with an error: the words of a reader not downloaded, and the file loaded again is read, at another address where the engine keeps the failure", async ({
  page,
}) => {
  const requests = xlsxRequests(page);
  await page.route(XLSX_JS, (route) =>
    route.fulfill({ status: 404, body: "Not Found" }),
  );
  await openIndividuals(page);
  await pick(page, "excel_en.xlsx");
  await expect(
    zone(page).getByText(notLoadedText("excel_en.xlsx"), { exact: true }),
  ).toBeVisible();
  expect(requests.wasm()).toBe(0);

  await page.unroute(XLSX_JS);
  await pick(page, { name: "again.xlsx", fixture: "excel_en.xlsx" });
  await expectExcelEn(page, "again.xlsx");
  expect(requests.js()).toBe(2);
  expect(requests.wasm()).toBe(1);

  // A third xlsx downloads nothing more.
  await pick(page, { name: "third.xlsx", fixture: "excel_en.xlsx" });
  await expectExcelEn(page, "third.xlsx");
  expect(requests.js()).toBe(2);
  expect(requests.wasm()).toBe(1);
});

test("IP9 D2 each of the first values of a column stays on one line: the dates of excel_en.xlsx do not break at their hyphens", async ({
  page,
}) => {
  await openIndividuals(page);
  await pick(page, "excel_en.xlsx");
  await expectExcelEn(page, "excel_en.xlsx");
  const cell = page
    .getByRole("table", { name: "Columns" })
    .getByRole("cell", { name: /^2024-05-13/ });
  // The lines each value is drawn on, from the boxes of its characters.
  const lines = await cell.evaluate((element) => {
    const text = element.textContent;
    const node = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (node.nextNode()) nodes.push(node.currentNode as Text);
    return ["2024-05-13", "2024-05-14", "2024-05-15"].map((value) => {
      for (const textNode of nodes) {
        const at = textNode.data.indexOf(value);
        if (at === -1) continue;
        const range = document.createRange();
        range.setStart(textNode, at);
        range.setEnd(textNode, at + value.length);
        const tops = new Set(
          [...range.getClientRects()].map((rect) => Math.round(rect.top)),
        );
        return tops.size;
      }
      throw new Error(`${value} is not in ${text}`);
    });
  });
  expect(lines).toEqual([1, 1, 1]);
});

test("IP9 D2 encrypted.xlsx is refused with its words", async ({
  page,
  makeAxeBuilder,
}) => {
  await openIndividuals(page);
  await pick(page, "encrypted.xlsx");
  await expect(
    zone(page).getByText(
      "encrypted.xlsx could not be read: it is protected by a password; in Excel, save a copy without the password. Load a corrected file.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(zone(page).getByText(/^Read from the first sheet/)).toHaveCount(
    0,
  );
  await expectNoViolations(makeAxeBuilder);
});

/** Each refusal of an xlsx that a file can bring about, through the
    reader of xlsx files and the screen, with the file that brings it
    and its words (docs/specs/steps/individuals.md, "Its words"). The
    xlsx files are those of the tests of xlsx_rs, tests/data/ at
    4a29ee7. `encrypted` is the test above, and `xlsxReaderNotLoaded`
    the two of the reader that answered with an error. `sheetTooLarge`
    needs a sheet of more than 2,000,000 cells, which no file of the
    tests of xlsx_rs has, so its words are checked in node only
    (src/core/project.test.ts). */
const REFUSALS: readonly {
  readonly kind: string;
  readonly what: string;
  readonly name: string;
  readonly bytes: () => Promise<Buffer>;
  readonly words: string;
}[] = [
  {
    kind: "notXlsx",
    what: "a CSV named pops.xlsx",
    name: "pops.xlsx",
    bytes: () => readFile(join(FIXTURES, "panel_pops.csv")),
    words:
      "it is not an Excel workbook, although its name ends in .xlsx; if it is a CSV or a TSV, give it a name that ends in .csv",
  },
  {
    kind: "oldExcel",
    what: "excel97.xls, of Excel 97–2003, named pops.xlsx",
    name: "pops.xlsx",
    bytes: () => readFile(join(FIXTURES, "excel97.xls")),
    words:
      "it is a workbook of Excel 97–2003, although its name ends in .xlsx; in Excel, save it as Excel Workbook (.xlsx)",
  },
  {
    kind: "emptySheet",
    what: "empty_first_sheet.xlsx, whose first sheet is empty,",
    name: "empty_first_sheet.xlsx",
    bytes: () => readFile(join(FIXTURES, "empty_first_sheet.xlsx")),
    words:
      "its first sheet, Notas, is empty, and only the first sheet is read; put the table in the first sheet",
  },
  {
    kind: "cellError",
    what: "getting_data.xlsx, whose cell holds the error #GETTING_DATA,",
    name: "getting_data.xlsx",
    bytes: () => readFile(join(FIXTURES, "getting_data.xlsx")),
    words:
      "a cell holds the error #GETTING_DATA, which cannot be read; in Excel, find the cells with an error with Find & Select › Go To Special › Formulas › Errors, and correct the formula or replace it with its value",
  },
  {
    kind: "files",
    what: "excel_en.xlsx cut short to its first 100 bytes",
    name: "excel_en.xlsx",
    // A zip cut short: its first 100 bytes.
    bytes: async () =>
      (await readFile(join(FIXTURES, "excel_en.xlsx"))).subarray(0, 100),
    words:
      "it could not be read as an Excel workbook and may be damaged; open it in Excel and save it again",
  },
];

for (const { kind, what, name, bytes, words } of REFUSALS) {
  test(`IP10 D3 ${what} is refused with its words, those of ${kind}`, async ({
    page,
    makeAxeBuilder,
  }) => {
    await openIndividuals(page);
    const chooser = page.waitForEvent("filechooser");
    await fileButton(page).click();
    await (
      await chooser
    ).setFiles({
      name,
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: await bytes(),
    });

    await expect(
      zone(page).getByText(
        `${name} could not be read: ${words}. Load a corrected file.`,
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      zone(page).getByText(/^Read from the first sheet/),
    ).toHaveCount(0);
    await expect(page.getByRole("table")).toHaveCount(0);
    await expectNoViolations(makeAxeBuilder);
  });
}

test("IP9 D2 individuals_10000.xlsx, 10,000 rows and 20 columns, is read, timed from the pick to the table with the download and without it", async ({
  page,
  browserName,
}) => {
  // Two reads of 10,000 rows and one download.
  test.setTimeout(60_000);
  await openIndividuals(page);

  const timed = async (name: string): Promise<number> => {
    const start = Date.now();
    await pick(page, { name, fixture: "individuals_10000.xlsx" });
    await expect(fileButton(page)).toHaveText(`Replace ${name}…`);
    await expect(zone(page).getByText("10,000 rows, 20 columns")).toBeVisible(
      // A read of 10,000 rows, which the flow times.
      { timeout: 30_000 },
    );
    return Date.now() - start;
  };
  const withDownload = await timed("individuals_10000.xlsx");
  const withoutDownload = await timed("again_10000.xlsx");
  await expect(
    page
      .getByRole("table", { name: "Columns" })
      .getByRole("rowheader", { name: "Observaciones" }),
  ).toBeVisible();
  const times = `${browserName}: ${String(withDownload)} ms with the download, ${String(withoutDownload)} ms without it`;
  test
    .info()
    .annotations.push({ type: "time to the table", description: times });
  console.warn(`IP9 D2 individuals_10000.xlsx: ${times}`);
});
