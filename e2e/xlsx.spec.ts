/**
 * The metadata file read from an xlsx, on the built site, through the
 * package of the release of table_io that package.json names, which reads
 * a CSV as well; and the loading of that package on the first read of any
 * file
 * (docs/specs/worker/individuals.md, "How it is verified", "With
 * Playwright, from stage 4"; docs/specs/steps/individuals.md, "The file"
 * and "How the file was read"; the refusals of "Its words"). The xlsx
 * files, and excel97.xls, are those of the tests of xlsx_rs,
 * tests/data/ at 4a29ee7, copied into e2e/fixtures/, but
 * header_error.xlsx, which is ours (its entry in REFUSALS says how it was
 * made).
 *
 * The client ends the light worker after every read of a file that is
 * not empty (docs/specs/worker/client.md, "The light worker started again
 * after a large read"), so each such read is made by a new worker, which
 * asks for the package again; the flows count one request of each of its
 * two files per read. Whether the browser's cache answers them is not
 * checked here: vite preview sends `Cache-Control: no-cache`, which
 * GitHub Pages does not (docs/specs/worker/individuals.md, "Loading the
 * files wasm on first need").
 *
 * The HTML standard lets an engine keep a failed import() as failed for
 * the life of the worker, as Chromium 153 does, so a second try in the
 * same worker after the JavaScript of the reader failed to download asks
 * for it at another address. Only the read of an empty file keeps its
 * worker, so that is the flow of the retry; the flows check that the
 * file is read in the three engines.
 */
import { join } from "node:path";
import { readFile } from "node:fs/promises";

import type { Locator, Page, Request } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The two files of the package of table_io in the built site: its
    JavaScript, a file of its own, and its wasm. */
const XLSX_JS = /\/table_io-[^/]*\.js$/;
const XLSX_WASM = /\/table_io_bg-[^/]*\.wasm$/;

/** What the step says when the reader of tables was not downloaded,
    with no end of its own (docs/specs/core/project.md). */
function notLoadedText(name: string): string {
  return `${name} could not be read: the part of the application that reads tables could not be downloaded; check the connection and load the file again; if it fails again, the site may have been updated since this page was opened: save the project, reload the page and open the project again.`;
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

/** Picks a fixture, the bytes of one under another name, or an empty
    file, with the file button, as a user does. */
async function pick(
  page: Page,
  file:
    | string
    | { readonly name: string; readonly fixture: string }
    | { readonly name: string; readonly empty: true },
): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await fileButton(page).click();
  await (
    await chooser
  ).setFiles(
    typeof file === "string"
      ? join(FIXTURES, file)
      : "empty" in file
        ? { name: file.name, mimeType: "text/csv", buffer: Buffer.alloc(0) }
        : {
            name: file.name,
            mimeType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            buffer: await readFile(join(FIXTURES, file.fixture)),
          },
  );
}

/** The requests of the page and its workers for the two files of the
    package of table_io, as they are made, and the types of the answers
    of its wasm that carry it. An answer 304, "not modified", carries
    neither the wasm nor its type: the browser uses the one it kept from
    the first answer, whose type was read there. Firefox 155 asks again
    with the ETag of the first answer, under `Cache-Control: no-cache`,
    and is answered 304, with no headers as Playwright gives them, on
    GitHub's runner on 9 October 2026; Chromium and WebKit are answered
    in full. */
function xlsxRequests(page: Page): {
  readonly js: () => number;
  readonly jsAddresses: () => readonly string[];
  readonly wasm: () => number;
  readonly wasmTypes: () => readonly string[];
} {
  const seen: Request[] = [];
  const wasmTypes: string[] = [];
  page.on("request", (request) => {
    seen.push(request);
  });
  page.on("response", (response) => {
    if (
      XLSX_WASM.test(new URL(response.url()).pathname) &&
      response.status() !== 304
    ) {
      wasmTypes.push(response.headers()["content-type"] ?? "");
    }
  });
  const count = (pattern: RegExp) => (): number =>
    seen.filter((request) => pattern.test(new URL(request.url()).pathname))
      .length;
  return {
    js: count(XLSX_JS),
    jsAddresses: () =>
      seen
        .map((request) => new URL(request.url()))
        .filter((url) => XLSX_JS.test(url.pathname))
        .map((url) => url.pathname.replace(/^.*\//, "") + url.search),
    wasm: count(XLSX_WASM),
    wasmTypes: () => wasmTypes,
  };
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

test("IP9 D2 excel_en.xlsx is read from its first sheet, with no options of a CSV, and the reader of tables is downloaded at the first file, and asked for once more by the new worker of each later file", async ({
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

  // A second xlsx is read by a new worker, which asks for the package
  // again, its two files once each.
  await pick(page, { name: "second.xlsx", fixture: "excel_en.xlsx" });
  await expect(fileButton(page)).toHaveText("Replace second.xlsx…");
  await expectExcelEn(page, "second.xlsx");
  expect(requests.js()).toBe(2);
  expect(requests.wasm()).toBe(2);
});

test("IN1 D4 a CSV read downloads the reader of tables at its first read, its JavaScript and its wasm once, the wasm as application/wasm, and a second file is read by a new worker that asks for each once more; the card has no line of a sheet", async ({
  page,
}) => {
  const requests = xlsxRequests(page);
  await openIndividuals(page);
  expect(requests.js()).toBe(0);
  expect(requests.wasm()).toBe(0);
  await pick(page, "panel_pops.csv");
  await expect(zone(page).getByText("200 rows, 2 columns")).toBeVisible();
  await expect(zone(page).getByText(/^Read from the first sheet/)).toHaveCount(
    0,
  );
  expect(requests.js()).toBe(1);
  expect(requests.wasm()).toBe(1);
  expect(requests.wasmTypes()).toEqual(["application/wasm"]);

  await pick(page, "panel_meta.csv");
  await expect(zone(page).getByText("200 rows, 3 columns")).toBeVisible();
  expect(requests.js()).toBe(2);
  expect(requests.wasm()).toBe(2);
  // Two answers with the wasm, or the first alone and a 304.
  const types = requests.wasmTypes();
  expect(types[0]).toBe("application/wasm");
  expect(types).toEqual(types.map(() => "application/wasm"));
});

test("IN1 D4 the wasm of the reader answered with an error: the words of a reader not downloaded for a CSV, and the file loaded again is read", async ({
  page,
  makeAxeBuilder,
}) => {
  const requests = xlsxRequests(page);
  await page.route(XLSX_WASM, (route) =>
    route.fulfill({ status: 404, body: "Not Found" }),
  );
  await openIndividuals(page);
  await pick(page, "panel_pops.csv");

  await expect(
    zone(page).getByText(notLoadedText("panel_pops.csv"), { exact: true }),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  // The route removed, the file loaded again is read by a new worker,
  // which asks for the wasm again.
  await page.unroute(XLSX_WASM);
  await pick(page, "panel_pops.csv");
  await expect(zone(page).getByText("200 rows, 2 columns")).toBeVisible();
  expect(requests.wasm()).toBe(2);
});

test("IN1 D4 the JavaScript of the reader answered with an error: the words of a reader not downloaded for a CSV, and a file loaded again is read by a new worker, which asks for the JavaScript at its own address", async ({
  page,
}) => {
  const requests = xlsxRequests(page);
  await page.route(XLSX_JS, (route) =>
    route.fulfill({ status: 404, body: "Not Found" }),
  );
  await openIndividuals(page);
  await pick(page, "panel_pops.csv");
  await expect(
    zone(page).getByText(notLoadedText("panel_pops.csv"), { exact: true }),
  ).toBeVisible();
  expect(requests.wasm()).toBe(0);

  // The worker that failed was ended with its read; the new one has no
  // failure kept, and asks at the address of the build, with no retry.
  await page.unroute(XLSX_JS);
  await pick(page, { name: "again.xlsx", fixture: "excel_en.xlsx" });
  await expectExcelEn(page, "again.xlsx");
  expect(requests.jsAddresses()).toHaveLength(2);
  expect(
    requests.jsAddresses().every((address) => !address.includes("?")),
  ).toBe(true);
  expect(requests.wasm()).toBe(1);
});

test("IN1 D4 the JavaScript of the reader answered with an error at the read of an empty file, which keeps its worker: a file loaded again is read by that worker, at another address where the engine keeps the failure", async ({
  page,
}) => {
  const requests = xlsxRequests(page);
  await page.route(XLSX_JS, (route) =>
    route.fulfill({ status: 404, body: "Not Found" }),
  );
  await openIndividuals(page);
  await pick(page, { name: "empty.csv", empty: true });
  await expect(
    zone(page).getByText(notLoadedText("empty.csv"), { exact: true }),
  ).toBeVisible();
  expect(requests.js()).toBe(1);

  await page.unroute(XLSX_JS);
  await pick(page, { name: "again.xlsx", fixture: "excel_en.xlsx" });
  await expectExcelEn(page, "again.xlsx");
  // Chromium 153 and Firefox 155 name the address in their message, and
  // the retry adds ?retry=1 to it; WebKit 26.6 names none, and asks again
  // at the same.
  const second = requests.jsAddresses()[1];
  expect(requests.jsAddresses()).toHaveLength(2);
  if (test.info().project.name !== "webkit") {
    expect(second).toMatch(/\?retry=1$/);
  } else {
    expect(second).not.toContain("?");
  }
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
    4a29ee7. `encrypted` is the test above, and `readerNotLoaded`
    the two of the reader that answered with an error. A CSV named
    .xlsx, refused as notXlsx until 9 October 2026, is now read. `sheetTooLarge`
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
    kind: "oldExcel",
    what: "excel97.xls, of Excel 97–2003, named pops.xlsx",
    name: "pops.xlsx",
    bytes: () => readFile(join(FIXTURES, "excel97.xls")),
    words:
      "it is a workbook of Excel 97–2003; in Excel, save it as Excel Workbook (.xlsx)",
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
    // Ours, not of the tests of xlsx_rs: made with openpyxl 3.1.5 on 29
    // September 2026, the table from B3, IID, popcat and in D3 the error
    // #VALUE!, stored as an error cell (t="e"), over s000 p0 1 and s001
    // p1 2:
    //   ws.cell(row=3, column=4, value="#VALUE!")  # data_type "e"
    kind: "headerError",
    what: "header_error.xlsx, whose header holds the error #VALUE! in D3,",
    name: "header_error.xlsx",
    bytes: () => readFile(join(FIXTURES, "header_error.xlsx")),
    words:
      "the header has the error #VALUE! at row 3, column D, where the name of a column should be; in Excel, type the name of the column in that cell",
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
