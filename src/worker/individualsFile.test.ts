import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- the test loads table_io's package in node from its bytes, as its README says, to read the files as the light worker does
import initTableIo, { importTable } from "table_io";
import type { ColumnType, CsvOptions } from "./protocol.ts";
import {
  columnWarningText,
  columnWarnings,
} from "./individuals/columnTypes.ts";
import type { ColumnWarning } from "./individuals/columnTypes.ts";
import type { IndividualsFileRead } from "./messages.ts";
import {
  MAX_INDIVIDUALS_FILE_BYTES,
  MAX_SHEET_CELLS,
  readIndividualsFile,
  readOfTable,
} from "./individualsFile.ts";
import type {
  BytesSource,
  ImportTable,
  LoadImporter,
  TableReadFields,
} from "./individualsFile.ts";

await initTableIo({
  module_or_path: readFileSync(
    join(
      import.meta.dirname,
      "../../node_modules/table_io/wasm/table_io_bg.wasm",
    ),
  ),
});

/** The loader of the light worker, with the package loaded above. */
const loadTableIo: LoadImporter = () => Promise.resolve(importTable);

const AUTO: CsvOptions = {
  encoding: "auto",
  separator: "auto",
  decimal: "auto",
};

/** The Spanish Excel file of the reader spec, with `\r\n`. */
const SPANISH_LINES = [
  "Individuo;Población;Altura",
  "ind_001;España;1,75",
  "ind_002;Italia;1,82",
  "ind_003;Perú;1,69",
  "ind_004;España;1,71",
];

/** What each encoding of the Spanish file gives: the heights numbers,
    read with the decimal comma table_io found. */
const SPANISH_READ: IndividualsFileRead = {
  kind: "read",
  table: {
    columns: ["Individuo", "Población", "Altura"],
    rows: [
      ["ind_001", "España", 1.75],
      ["ind_002", "Italia", 1.82],
      ["ind_003", "Perú", 1.69],
      ["ind_004", "España", 1.71],
    ],
  },
  columns: [
    { kind: "identifier" },
    { kind: "categorical" },
    { kind: "continuous" },
  ],
  found: {
    encoding: "windows-1252",
    separator: ";",
    decimal: ",",
    undecodedLine: null,
  },
};

/** The same, as found in a file of another encoding. */
function spanishRead(
  encoding: "utf-8" | "windows-1252" | "utf-16",
): IndividualsFileRead {
  if (SPANISH_READ.kind !== "read" || SPANISH_READ.found === null) {
    throw new Error("not a read of a CSV");
  }
  return { ...SPANISH_READ, found: { ...SPANISH_READ.found, encoding } };
}

/** One byte per character: the characters of the Spanish file are all
    below 256, where Windows-1252 and Latin-1 are one. */
function singleBytes(text: string): number[] {
  return Array.from(text, (character) => {
    const code = character.charCodeAt(0);
    if (code > 0xff) throw new Error(`not one byte: ${character}`);
    return code;
  });
}

/** Two bytes per character, little or big endian. */
function doubleBytes(text: string, littleEndian: boolean): number[] {
  return Array.from(text).flatMap((character) => {
    const code = character.charCodeAt(0);
    const low = code & 0xff;
    const high = code >> 8;
    return littleEndian ? [low, high] : [high, low];
  });
}

const SPANISH_TEXT = SPANISH_LINES.join("\r\n") + "\r\n";

/** The read of `file` with the options `csv`, by table_io's package. */
function readCsvFile(
  file: BytesSource,
  csv: CsvOptions | null,
): Promise<IndividualsFileRead> {
  return readIndividualsFile(file, csv, loadTableIo);
}

function blobOf(bytes: readonly number[]): Blob {
  return new Blob([new Uint8Array(bytes)]);
}

describe("WS4 D3 the bytes", () => {
  test("the Spanish file in Windows-1252 is found Windows-1252, ; and the decimal comma", async () => {
    const bytes = singleBytes(SPANISH_TEXT);
    // ó of Población is the byte F3, and ñ of España F1.
    expect(bytes[17]).toBe(0xf3);
    expect(bytes).toContain(0xf1);
    expect(await readCsvFile(blobOf(bytes), AUTO)).toEqual(SPANISH_READ);
  });

  test("the same file in UTF-8 with its BOM is found UTF-8, the same table", async () => {
    const bytes = [0xef, 0xbb, 0xbf, ...new TextEncoder().encode(SPANISH_TEXT)];
    expect(await readCsvFile(blobOf(bytes), AUTO)).toEqual(
      spanishRead("utf-8"),
    );
  });

  test("the Windows-1252 file with the encoding set to UTF-8 has the replacement character", async () => {
    const read = await readCsvFile(blobOf(singleBytes(SPANISH_TEXT)), {
      ...AUTO,
      encoding: "utf-8",
    });
    if (read.kind !== "read") throw new Error("the read failed");
    expect(read.found?.encoding).toBe("utf-8");
    expect(read.table.columns).toEqual(["Individuo", "Poblaci�n", "Altura"]);
    expect(read.table.rows[0]).toEqual(["ind_001", "Espa�a", 1.75]);
    expect(read.found?.undecodedLine).toBe(1);
  });

  test("the file in UTF-16 little endian, FF FE, is found UTF-16, the same table", async () => {
    const bytes = [0xff, 0xfe, ...doubleBytes(SPANISH_TEXT, true)];
    expect(await readCsvFile(blobOf(bytes), AUTO)).toEqual(
      spanishRead("utf-16"),
    );
  });

  test("the file in UTF-16 big endian, FE FF, is found UTF-16, the same table", async () => {
    const bytes = [0xfe, 0xff, ...doubleBytes(SPANISH_TEXT, false)];
    expect(await readCsvFile(blobOf(bytes), AUTO)).toEqual(
      spanishRead("utf-16"),
    );
  });

  test("UTF-16 little endian is read so with the encoding set to Windows-1252", async () => {
    const bytes = [0xff, 0xfe, ...doubleBytes(SPANISH_TEXT, true)];
    expect(
      await readCsvFile(blobOf(bytes), {
        ...AUTO,
        encoding: "windows-1252",
      }),
    ).toEqual(spanishRead("utf-16"));
  });

  test("UTF-16 big endian is read so with the encoding set to Windows-1252", async () => {
    const bytes = [0xfe, 0xff, ...doubleBytes(SPANISH_TEXT, false)];
    expect(
      await readCsvFile(blobOf(bytes), {
        ...AUTO,
        encoding: "windows-1252",
      }),
    ).toEqual(spanishRead("utf-16"));
  });

  test("the start of a zip, PK 03 04, is read as an xlsx and refused as a zip it cannot read, files, with the format null", async () => {
    const bytes = [0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00];
    expect(await readCsvFile(blobOf(bytes), AUTO)).toEqual({
      kind: "failed",
      format: null,
      error: {
        kind: "files",
        message: "invalid Zip archive: Could not find EOCD",
      },
    });
  });

  test("a text with one byte 0 near its end is notText", async () => {
    const bytes = [...singleBytes("id,pop\nA,P1\nB,P2"), 0x00, 0x0a];
    expect(await readCsvFile(blobOf(bytes), AUTO)).toEqual({
      kind: "failed",
      format: "text",
      error: { kind: "notText" },
    });
  });

  test("a file of 20,000,001 bytes is tooLarge, and its bytes are never asked for", async () => {
    let calls = 0;
    const source: BytesSource = {
      size: 20_000_001,
      arrayBuffer: () => {
        calls += 1;
        return Promise.resolve(new ArrayBuffer(0));
      },
    };
    expect(await readCsvFile(source, AUTO)).toEqual({
      kind: "failed",
      format: null,
      error: { kind: "tooLarge", size: 20_000_001, max: 20_000_000 },
    });
    expect(calls).toBe(0);
    expect(MAX_INDIVIDUALS_FILE_BYTES).toBe(20_000_000);
  });

  test("a file the browser cannot read is unreadable, with its message", async () => {
    const source: BytesSource = {
      size: 10,
      arrayBuffer: () =>
        Promise.reject(
          new DOMException("the file changed", "NotReadableError"),
        ),
    };
    expect(await readCsvFile(source, AUTO)).toEqual({
      kind: "failed",
      format: null,
      error: {
        kind: "unreadable",
        message: "NotReadableError: the file changed",
      },
    });
  });

  test("the name of the browser's error is kept when its message is empty", async () => {
    const source: BytesSource = {
      size: 10,
      arrayBuffer: () =>
        Promise.reject(new DOMException("", "NotReadableError")),
    };
    expect(await readCsvFile(source, AUTO)).toEqual({
      kind: "failed",
      format: null,
      error: { kind: "unreadable", message: "NotReadableError" },
    });
  });

  test("a deleted file, NotFoundError, is told from a changed one by its name", async () => {
    const source: BytesSource = {
      size: 10,
      arrayBuffer: () =>
        Promise.reject(new DOMException("gone", "NotFoundError")),
    };
    expect(await readCsvFile(source, AUTO)).toEqual({
      kind: "failed",
      format: null,
      error: { kind: "unreadable", message: "NotFoundError: gone" },
    });
  });

  test("a file of 20,000,000 bytes is not too large", async () => {
    const source: BytesSource = {
      size: 20_000_000,
      arrayBuffer: () =>
        Promise.resolve(new Uint8Array(singleBytes("id,pop\nA,P1\n")).buffer),
    };
    const read = await readCsvFile(source, AUTO);
    expect(read.kind).toBe("read");
  });

  test("a file of ASCII alone is found UTF-8", async () => {
    const read = await readCsvFile(blobOf(singleBytes("id,pop\nA,P1\n")), AUTO);
    expect(read).toEqual({
      kind: "read",
      table: { columns: ["id", "pop"], rows: [["A", "P1"]] },
      columns: [{ kind: "identifier" }, { kind: "categorical" }],
      found: {
        encoding: "utf-8",
        separator: ",",
        decimal: ".",
        undecodedLine: null,
      },
    });
  });

  test("the BOM of UTF-8 is removed with the encoding set to Windows-1252", async () => {
    const bytes = [0xef, 0xbb, 0xbf, ...singleBytes("id,pop\nA,P1\n")];
    const read = await readCsvFile(blobOf(bytes), {
      encoding: "windows-1252",
      separator: ",",
      decimal: ".",
    });
    if (read.kind !== "read") throw new Error("the read failed");
    expect(read.table.columns).toEqual(["id", "pop"]);
    expect(read.found).toEqual({
      encoding: "windows-1252",
      separator: ",",
      decimal: ".",
      undecodedLine: null,
    });
  });

  test("a refusal of the reader of the text is the failed read", async () => {
    expect(await readCsvFile(blobOf(singleBytes("id,pop\n")), AUTO)).toEqual({
      kind: "failed",
      format: "text",
      error: { kind: "empty" },
    });
  });

  test("a byte 0 after the first 10,000 bytes is notText", async () => {
    const text = "id,pop\n" + "A,P1\n".repeat(2_500);
    const bytes = [...singleBytes(text), 0x00, 0x0a];
    expect(bytes.length).toBeGreaterThan(10_000);
    expect(await readCsvFile(blobOf(bytes), AUTO)).toEqual({
      kind: "failed",
      format: "text",
      error: { kind: "notText" },
    });
  });

  test("a first byte EF that is not the BOM of UTF-8 is kept, as the ï of Windows-1252", async () => {
    const read = await readCsvFile(
      blobOf(singleBytes("ïdent,pop\nA,P1\n")),
      AUTO,
    );
    if (read.kind !== "read") throw new Error("the read failed");
    expect(read.found?.encoding).toBe("windows-1252");
    expect(read.table.columns).toEqual(["ïdent", "pop"]);
  });
});

describe("IP10 D3 the cases of the reader spec: a file saved by Excel for Mac", () => {
  // Mac Roman, which older versions of Excel for Mac wrote for "CSV":
  // ó is the byte 97 and ñ the byte 96, which Windows-1252 reads as the
  // dashes — and –, and UTF-8 as no character.
  const macRoman = (text: string): number[] =>
    singleBytes(text.replaceAll("ó", "\u0097").replaceAll("ñ", "\u0096"));
  const lines = [
    "Individuo;Población;Altura",
    "ind_001;España;1,75",
    "ind_002;Italia;1,82",
    "ind_003;España;1,71",
  ];
  const bytes = macRoman(lines.join("\r\n") + "\r\n");

  test("an accented name of Mac Roman is read as other characters by both encodings offered, and the populations are still grouped", async () => {
    expect(bytes[17]).toBe(0x97);
    const found = await readCsvFile(blobOf(bytes), AUTO);
    if (found.kind !== "read") throw new Error("the read failed");
    expect(found.found?.encoding).toBe("windows-1252");
    expect(found.table.columns).toEqual([
      "Individuo",
      "Poblaci\u2014n",
      "Altura",
    ]);
    expect(found.table.rows.map((row) => row[1])).toEqual([
      "Espa\u2013a",
      "Italia",
      "Espa\u2013a",
    ]);
    const utf8 = await readCsvFile(blobOf(bytes), {
      ...AUTO,
      encoding: "utf-8",
    });
    if (utf8.kind !== "read") throw new Error("the read failed");
    expect(utf8.table.rows.map((row) => row[1])).toEqual([
      "Espa\uFFFDa",
      "Italia",
      "Espa\uFFFDa",
    ]);
  });
});

describe("WS4 D3 the owner's decisions of 25 September on the bytes", () => {
  const encode = (text: string): number[] => [
    ...new TextEncoder().encode(text),
  ];

  test("with auto, the BOM of UTF-8 decides UTF-8: a bad byte on line 3 is � and its line is found", async () => {
    const bytes = [
      0xef,
      0xbb,
      0xbf,
      ...encode(
        "Individuo;Población;Altura\r\nind_001;España;1,75\r\nind_002;Ita",
      ),
      0xff,
      ...encode("lia;1,82\r\nind_003;Perú;1,69\r\nind_004;España;1,71\r\n"),
    ];
    const read = await readCsvFile(blobOf(bytes), AUTO);
    if (read.kind !== "read") throw new Error("the read failed");
    expect(read.found).toEqual({
      encoding: "utf-8",
      separator: ";",
      decimal: ",",
      undecodedLine: 3,
    });
    expect(read.table.rows[0]).toEqual(["ind_001", "España", 1.75]);
    expect(read.table.rows[1]).toEqual(["ind_002", "Ita�lia", 1.82]);
  });

  test("the line of a character not decoded counts the lines as the reader does, \\r alone among them", async () => {
    const bytes = [
      ...singleBytes("id,pop\rA,P1\r\n\nB,P"),
      0xff,
      ...singleBytes("2\n"),
    ];
    const read = await readCsvFile(blobOf(bytes), {
      ...AUTO,
      encoding: "utf-8",
    });
    if (read.kind !== "read") throw new Error("the read failed");
    expect(read.found?.undecodedLine).toBe(4);
  });

  test("half of a character of UTF-16 in the middle of the file is not decoded, on its line", async () => {
    const bytes = [
      0xff,
      0xfe,
      ...doubleBytes("id,pop\r\nA,P1\r\n", true),
      0x3d,
      0xd8,
      ...doubleBytes("B,P2\r\n", true),
    ];
    const read = await readCsvFile(blobOf(bytes), AUTO);
    if (read.kind !== "read") throw new Error("the read failed");
    expect(read.found?.encoding).toBe("utf-16");
    expect(read.found?.undecodedLine).toBe(3);
  });

  test("a UTF-16 file with one byte more is cutShort, little and big endian", async () => {
    const little = [0xff, 0xfe, ...doubleBytes(SPANISH_TEXT, true), 0x41];
    const big = [0xfe, 0xff, ...doubleBytes(SPANISH_TEXT, false), 0x00];
    for (const bytes of [little, big]) {
      expect(await readCsvFile(blobOf(bytes), AUTO)).toEqual({
        kind: "failed",
        format: "text",
        error: { kind: "cutShort" },
      });
    }
  });

  test("a UTF-16 file whose last character is the first half of one written in four is cutShort", async () => {
    const little = [0xff, 0xfe, ...doubleBytes(SPANISH_TEXT, true), 0x3d, 0xd8];
    const big = [0xfe, 0xff, ...doubleBytes(SPANISH_TEXT, false), 0xd8, 0x3d];
    for (const bytes of [little, big]) {
      expect(await readCsvFile(blobOf(bytes), AUTO)).toEqual({
        kind: "failed",
        format: "text",
        error: { kind: "cutShort" },
      });
    }
  });
});

/** A column of a TableRead of the test. */
interface FakeColumn {
  readonly name: string;
  readonly type: string;
  readonly missing: readonly number[];
  readonly integers?: readonly bigint[];
  readonly floats?: readonly number[];
  readonly booleans?: readonly number[];
  readonly texts?: readonly string[];
}

/** The fields of a TableRead of the test that are not columns. */
type FakeFields = Partial<
  Omit<
    TableReadFields,
    | "names"
    | "columnName"
    | "columnType"
    | "columnMissing"
    | "columnIntegers"
    | "columnFloats"
    | "columnBooleans"
    | "columnTexts"
    | "free"
  >
>;

/** An object in the place of table_io's TableRead: every field 0 or "",
    as table_io leaves the fields a read does not fill, but those given,
    and a count of its frees. */
function fakeRead(
  fields: FakeFields,
  names: readonly string[] = [],
  columns: readonly FakeColumn[] = [],
): { readonly read: TableReadFields; readonly frees: () => number } {
  let frees = 0;
  const column = (index: number): FakeColumn => {
    const found = columns[index];
    if (found === undefined) throw new Error(`no column ${String(index)}`);
    return found;
  };
  const read: TableReadFields = {
    refusal: "",
    format: "text",
    encoding: "",
    separator: "",
    decimal: "",
    undecodedLine: undefined,
    namesHeader: "",
    numColumns: columns.length,
    line: 0,
    row: 0,
    column: 0,
    expected: 0,
    found: 0,
    text: "",
    size: 0,
    sheet: "",
    sheetRows: 0,
    sheetColumns: 0,
    ...fields,
    names: [...names],
    columnName: (index) => column(index).name,
    columnType: (index) => column(index).type,
    columnMissing: (index) => new Uint8Array(column(index).missing),
    columnIntegers: (index) => new BigInt64Array(column(index).integers ?? []),
    columnFloats: (index) => new Float64Array(column(index).floats ?? []),
    columnBooleans: (index) => new Uint8Array(column(index).booleans ?? []),
    columnTexts: (index) => [...(column(index).texts ?? [])],
    free: () => {
      frees += 1;
    },
  };
  return { read, frees: () => frees };
}

describe("IN1 D1 readOfTable, with objects of the test in the place of a TableRead", () => {
  test("a table of a text file gives the header, the rows with null for a missing value, the found and the types from the comma", () => {
    const { read } = fakeRead(
      {
        format: "text",
        encoding: "windows-1252",
        separator: "semicolon",
        decimal: "comma",
        namesHeader: "Individuo",
      },
      ["A", "B"],
      [{ name: "h", type: "float", missing: [0, 1], floats: [1.75, 0] }],
    );
    expect(readOfTable(read)).toEqual({
      kind: "read",
      table: {
        columns: ["Individuo", "h"],
        rows: [
          ["A", 1.75],
          ["B", null],
        ],
      },
      columns: [{ kind: "identifier" }, { kind: "categorical" }],
      found: {
        encoding: "windows-1252",
        separator: ";",
        decimal: ",",
        undecodedLine: null,
      },
    });
  });

  test("the line of a character not decoded is the found's", () => {
    const { read } = fakeRead(
      {
        format: "text",
        encoding: "utf-8",
        separator: "tab",
        decimal: "point",
        undecodedLine: 3,
      },
      ["A"],
    );
    const result = readOfTable(read);
    expect(result.kind === "read" ? result.found : null).toEqual({
      encoding: "utf-8",
      separator: "\t",
      decimal: ".",
      undecodedLine: 3,
    });
  });

  test("a table of an xlsx has found null, and its types are read with the point", () => {
    const { read } = fakeRead(
      { format: "xlsx", sheet: "Hoja1", decimal: "point", namesHeader: "id" },
      ["A", "B", "C"],
      [
        {
          name: "h",
          type: "float",
          missing: [0, 0, 0],
          floats: [1.5, 1.6, 1.7],
        },
      ],
    );
    expect(readOfTable(read)).toEqual({
      kind: "read",
      table: {
        columns: ["id", "h"],
        rows: [
          ["A", 1.5],
          ["B", 1.6],
          ["C", 1.7],
        ],
      },
      columns: [{ kind: "identifier" }, { kind: "continuous" }],
      found: null,
    });
  });

  test("an integer column of 1n and 2n gives the numbers 1 and 2", () => {
    const { read } = fakeRead(
      { format: "xlsx" },
      ["A", "B"],
      [{ name: "n", type: "integer", missing: [0, 0], integers: [1n, 2n] }],
    );
    const result = readOfTable(read);
    expect(result.kind === "read" ? result.table.rows : null).toEqual([
      ["A", 1],
      ["B", 2],
    ]);
  });

  test("an integer column with a value beyond 2^53 is kept whole as texts", () => {
    const { read } = fakeRead(
      { format: "xlsx" },
      ["A", "B"],
      [
        {
          name: "n",
          type: "integer",
          missing: [0, 0],
          integers: [9007199254740993n, 1n],
        },
      ],
    );
    const result = readOfTable(read);
    expect(result.kind === "read" ? result.table.rows : null).toEqual([
      ["A", "9007199254740993"],
      ["B", "1"],
    ]);
  });

  test("an integer column whose value is -(2^53 − 1) stays numbers, and one below it texts", () => {
    const edge = fakeRead(
      { format: "xlsx" },
      ["A"],
      [
        {
          name: "n",
          type: "integer",
          missing: [0],
          integers: [-9007199254740991n],
        },
      ],
    );
    const below = fakeRead(
      { format: "xlsx" },
      ["A"],
      [
        {
          name: "n",
          type: "integer",
          missing: [0],
          integers: [-9007199254740992n],
        },
      ],
    );
    const rowsOf = (result: IndividualsFileRead): unknown =>
      result.kind === "read" ? result.table.rows : null;
    expect(rowsOf(readOfTable(edge.read))).toEqual([["A", -9007199254740991]]);
    expect(rowsOf(readOfTable(below.read))).toEqual([
      ["A", "-9007199254740992"],
    ]);
  });

  test("a boolean column of 1 and 0 gives true and false, and a missing one null", () => {
    const { read } = fakeRead(
      { format: "xlsx" },
      ["A", "B", "C"],
      [
        {
          name: "ok",
          type: "boolean",
          missing: [0, 0, 1],
          booleans: [1, 0, 0],
        },
      ],
    );
    const result = readOfTable(read);
    expect(result.kind === "read" ? result.table.rows : null).toEqual([
      ["A", true],
      ["B", false],
      ["C", null],
    ]);
  });

  test("a text column, an empty name of the names' column among the header, and no column but the names", () => {
    const { read } = fakeRead(
      {
        format: "text",
        encoding: "utf-8",
        separator: "comma",
        decimal: "point",
      },
      ["A", "B"],
      [{ name: "pop", type: "text", missing: [0, 0], texts: ["P1", "P2"] }],
    );
    const result = readOfTable(read);
    expect(result.kind === "read" ? result.table : null).toEqual({
      columns: ["", "pop"],
      rows: [
        ["A", "P1"],
        ["B", "P2"],
      ],
    });
  });

  test.each([
    ["empty", {}, { kind: "empty" }, "text"],
    [
      "duplicateColumn",
      { text: "pop", column: 2 },
      { kind: "duplicateColumn", name: "pop" },
      "text",
    ],
    [
      "duplicateIndividual",
      { text: "ind_031", line: 3 },
      { kind: "duplicateIndividual", name: "ind_031" },
      "text",
    ],
    [
      "raggedRow",
      { line: 7, expected: 4, found: 3, separator: "semicolon" },
      { kind: "raggedRow", line: 7, expected: 4, found: 3, separator: ";" },
      "text",
    ],
    [
      "unnamedColumn",
      { column: 4 },
      { kind: "unnamedColumn", column: 4 },
      "xlsx",
    ],
    [
      "emptyIndividual",
      { line: 7 },
      { kind: "emptyIndividual", line: 7 },
      "text",
    ],
    [
      "emptyIndividual",
      { row: 9 },
      { kind: "emptyIndividual", line: 9 },
      "xlsx",
    ],
    [
      "unclosedQuote",
      { line: 7, separator: "comma" },
      { kind: "unclosedQuote", line: 7, separator: "," },
      "text",
    ],
    [
      "tooLarge",
      { size: 20_000_001 },
      { kind: "tooLarge", size: 20_000_001, max: 20_000_000 },
      "text",
    ],
    ["notText", {}, { kind: "notText" }, "text"],
    ["variantsFile", {}, { kind: "variantsFile" }, "text"],
    ["cutShort", {}, { kind: "cutShort" }, "text"],
    ["oldExcel", {}, { kind: "oldExcel" }, "xlsx"],
    ["encrypted", {}, { kind: "encrypted" }, "xlsx"],
    ["notWorkbook", {}, { kind: "notWorkbook" }, "xlsx"],
    [
      "emptySheet",
      { sheet: "Hoja1" },
      { kind: "emptySheet", sheet: "Hoja1" },
      "xlsx",
    ],
    [
      "cellError",
      { text: "#GETTING_DATA" },
      { kind: "cellError", error: "#GETTING_DATA" },
      "xlsx",
    ],
    [
      "headerError",
      { row: 3, column: 4, text: "#VALUE!" },
      { kind: "headerError", row: 3, column: 4, error: "#VALUE!" },
      "xlsx",
    ],
    [
      "sheetTooLarge",
      { sheet: "Hoja1", row: 2, column: 3, sheetRows: 1000, sheetColumns: 26 },
      {
        kind: "sheetTooLarge",
        sheet: "Hoja1",
        lastRow: 1001,
        lastColumn: "AB",
        max: 2_000_000,
      },
      "xlsx",
    ],
  ] as const)(
    "the refusal %s gives its kind, its fields and its format",
    (refusal, fields, error, format) => {
      const { read } = fakeRead({ refusal, format, ...fields });
      expect(readOfTable(read)).toEqual({ kind: "failed", error, format });
    },
  );

  test("the refusal unreadable is files with its message, and the format null", () => {
    const { read } = fakeRead({
      refusal: "unreadable",
      format: "",
      text: "invalid Zip archive",
    });
    expect(readOfTable(read)).toEqual({
      kind: "failed",
      error: { kind: "files", message: "invalid Zip archive" },
      format: null,
    });
  });

  test.each([
    [
      "the refusal formatNotBuilt",
      fakeRead({ refusal: "formatNotBuilt", format: "xlsx" }),
    ],
    [
      "a refusal of a later release",
      fakeRead({ refusal: "tooOld", format: "text" }),
    ],
    [
      "a type of column date",
      fakeRead(
        { format: "xlsx" },
        ["A"],
        [{ name: "d", type: "date", missing: [0] }],
      ),
    ],
    ["a format csv", fakeRead({ format: "csv" }, ["A"])],
    [
      "a separator pipe",
      fakeRead(
        {
          format: "text",
          encoding: "utf-8",
          separator: "pipe",
          decimal: "point",
        },
        ["A"],
      ),
    ],
    [
      "a column of another length than the names",
      fakeRead(
        { format: "xlsx" },
        ["A", "B"],
        [{ name: "t", type: "text", missing: [0], texts: ["x"] }],
      ),
    ],
  ])("%s is a defect of ours, and throws", (_what, { read }) => {
    expect(() => readOfTable(read)).toThrow(/popnei_web defect/);
  });
});

/** The bytes of a fixture of the browser tests. */
function fixture(name: string): Blob {
  return new Blob([
    readFileSync(join(import.meta.dirname, "../../e2e/fixtures", name)),
  ]);
}

describe("IN1 D1 readIndividualsFile, with table_io's package", () => {
  test("panel_pops.csv gives popcat as text and its 200 rows", async () => {
    const read = await readCsvFile(fixture("panel_pops.csv"), AUTO);
    if (read.kind !== "read") throw new Error("the read failed");
    expect(read.table.columns).toEqual(["IID", "popcat"]);
    expect(read.table.rows).toHaveLength(200);
    expect(read.table.rows[0]).toEqual(["s000", "p0"]);
    expect(read.found).toEqual({
      encoding: "utf-8",
      separator: ",",
      decimal: ".",
      undecodedLine: null,
    });
  });

  test("panel_meta.csv gives altitude as numbers", async () => {
    const read = await readCsvFile(fixture("panel_meta.csv"), AUTO);
    if (read.kind !== "read") throw new Error("the read failed");
    expect(read.table.columns).toEqual(["IID", "popcat", "altitude"]);
    expect(read.table.rows.slice(0, 2)).toEqual([
      ["s000", "p0", 100],
      ["s001", "p0", 110],
    ]);
    expect(read.columns[2]).toEqual({ kind: "continuous" });
  });

  test("excel_en.xlsx gives its five rows, Altura numbers and Afectado booleans, with found null", async () => {
    const read = await readCsvFile(fixture("excel_en.xlsx"), AUTO);
    if (read.kind !== "read") throw new Error("the read failed");
    expect(read.found).toBeNull();
    expect(read.table.columns).toEqual([
      "Individuo",
      "Población",
      "Altura",
      "Fecha",
      "Hora",
      "Afectado",
      "Código",
    ]);
    expect(read.table.rows.map((row) => row[0])).toEqual([
      "ind1",
      "ind2",
      "001",
      "ind4",
      "ind5",
    ]);
    expect(read.table.rows.map((row) => row[2])).toEqual([
      1.75, 1.62, 1.8, 1.55, 1.7,
    ]);
    expect(read.table.rows.map((row) => row[5])).toEqual([
      true,
      false,
      true,
      false,
      true,
    ]);
  });

  test.each([
    ["encrypted.xlsx", { kind: "encrypted" }],
    ["excel97.xls", { kind: "oldExcel" }],
    ["empty_first_sheet.xlsx", { kind: "emptySheet", sheet: "Notas" }],
    [
      "header_error.xlsx",
      { kind: "headerError", row: 3, column: 4, error: "#VALUE!" },
    ],
    ["getting_data.xlsx", { kind: "cellError", error: "#GETTING_DATA" }],
  ])("%s gives its refusal with the format xlsx", async (name, error) => {
    expect(await readCsvFile(fixture(name), AUTO)).toEqual({
      kind: "failed",
      error,
      format: "xlsx",
    });
  });

  test("panel.nei is notText", async () => {
    expect(await readCsvFile(fixture("panel.nei"), AUTO)).toEqual({
      kind: "failed",
      error: { kind: "notText" },
      format: "text",
    });
  });

  test("the bytes of panel_pops.csv named x.xlsx are read as text, by the bytes and not the name", async () => {
    const file = new File([fixture("panel_pops.csv")], "x.xlsx");
    const read = await readCsvFile(file, AUTO);
    if (read.kind !== "read") throw new Error("the read failed");
    expect(read.found?.separator).toBe(",");
    expect(read.table.rows).toHaveLength(200);
  });

  test("excel_en.xlsx given the options of a CSV set is read as the xlsx it is", async () => {
    const read = await readCsvFile(fixture("excel_en.xlsx"), {
      encoding: "windows-1252",
      separator: ";",
      decimal: ",",
    });
    expect(read.kind === "read" ? read.found : "failed").toBeNull();
  });

  test("a file of 20,000,001 bytes is tooLarge, its bytes never asked for and the loader never called", async () => {
    let reads = 0;
    let loads = 0;
    const file: BytesSource = {
      size: MAX_INDIVIDUALS_FILE_BYTES + 1,
      arrayBuffer: () => {
        reads += 1;
        return Promise.resolve(new ArrayBuffer(0));
      },
    };
    const load: LoadImporter = () => {
      loads += 1;
      return Promise.resolve(importTable);
    };
    expect(await readIndividualsFile(file, AUTO, load)).toEqual({
      kind: "failed",
      error: { kind: "tooLarge", size: 20_000_001, max: 20_000_000 },
      format: null,
    });
    expect([reads, loads]).toEqual([0, 0]);
    expect(MAX_SHEET_CELLS).toBe(2_000_000);
  });

  test("a loader that gives notLoaded gives readerNotLoaded with its message", async () => {
    const load: LoadImporter = () =>
      Promise.resolve({
        notLoaded: "Failed to fetch dynamically imported module",
      });
    expect(
      await readIndividualsFile(fixture("panel_pops.csv"), AUTO, load),
    ).toEqual({
      kind: "failed",
      error: {
        kind: "readerNotLoaded",
        message: "Failed to fetch dynamically imported module",
      },
      format: null,
    });
  });

  test("importTable is given the bytes as a Uint8Array, the two limits and the options as table_io names them", async () => {
    const calls: unknown[][] = [];
    const spy: ImportTable = (...args) => {
      calls.push(args);
      return importTable(...args);
    };
    await readIndividualsFile(
      fixture("panel_pops.csv"),
      { encoding: "utf-8", separator: "\t", decimal: "," },
      () => Promise.resolve(spy),
    );
    await readIndividualsFile(fixture("panel_pops.csv"), null, () =>
      Promise.resolve(spy),
    );
    await readIndividualsFile(
      fixture("panel_pops.csv"),
      { encoding: "windows-1252", separator: ";", decimal: "." },
      () => Promise.resolve(spy),
    );
    expect(calls.map((call) => call[0] instanceof Uint8Array)).toEqual([
      true,
      true,
      true,
    ]);
    expect(calls.map((call) => call.slice(1))).toEqual([
      [20_000_000, 2_000_000, "utf-8", "tab", "comma"],
      [20_000_000, 2_000_000, "", "", ""],
      [20_000_000, 2_000_000, "windows-1252", "semicolon", "point"],
    ]);
  });

  test.each([
    ["a table", "id,pop\nA,P1\n", false],
    ["a refusal", "id,pop\n", false],
    ["a defect of ours in what follows", "id,pop\nA,P1\n", true],
  ])("free() is called once after %s", async (_what, text, broken) => {
    let frees = 0;
    const counted: ImportTable = (...args) => {
      const read = importTable(...args);
      const columnType = read.columnType.bind(read);
      return {
        get refusal() {
          return read.refusal;
        },
        get format() {
          return read.format;
        },
        get encoding() {
          return read.encoding;
        },
        get separator() {
          return read.separator;
        },
        get decimal() {
          return read.decimal;
        },
        get undecodedLine() {
          return read.undecodedLine;
        },
        get namesHeader() {
          return read.namesHeader;
        },
        get names() {
          return read.names;
        },
        get numColumns() {
          return read.numColumns;
        },
        columnName: (index) => read.columnName(index),
        columnType: (index) => (broken ? "date" : columnType(index)),
        columnMissing: (index) => read.columnMissing(index),
        columnIntegers: (index) => read.columnIntegers(index),
        columnFloats: (index) => read.columnFloats(index),
        columnBooleans: (index) => read.columnBooleans(index),
        columnTexts: (index) => read.columnTexts(index),
        get line() {
          return read.line;
        },
        get row() {
          return read.row;
        },
        get column() {
          return read.column;
        },
        get expected() {
          return read.expected;
        },
        get found() {
          return read.found;
        },
        get text() {
          return read.text;
        },
        get size() {
          return read.size;
        },
        get sheet() {
          return read.sheet;
        },
        get sheetRows() {
          return read.sheetRows;
        },
        get sheetColumns() {
          return read.sheetColumns;
        },
        free: () => {
          frees += 1;
          read.free();
        },
      };
    };
    const reading = readIndividualsFile(
      new Blob([new TextEncoder().encode(text)]),
      AUTO,
      () => Promise.resolve(counted),
    );
    if (broken) {
      await expect(reading).rejects.toThrow(/popnei_web defect/);
    } else {
      await reading;
    }
    expect(frees).toBe(1);
  });

  test("an importTable that throws, an argument of ours out of its range, makes the read reject", async () => {
    const throwing: ImportTable = () => {
      throw new Error("max_cells out of range");
    };
    await expect(
      readIndividualsFile(fixture("panel_pops.csv"), AUTO, () =>
        Promise.resolve(throwing),
      ),
    ).rejects.toThrow("max_cells out of range");
  });
});

/**
 * The cases of the table of readCsv of the reader spec at commit d10cc1b,
 * each text encoded as UTF-8 and read by table_io with the separator
 * given, every other option auto: the table, the types and the found the
 * reader of TypeScript gave, the cells of a numeric or boolean column now
 * numbers or booleans, or the same refusal at the same line. Two differ
 * from what that reader gave, as the reader spec says they do: `1`, `01`
 * and `001` are the one number 1, categorical, where they were three
 * texts; and every column of numbers holds numbers.
 */
const READ_CSV_CASES: readonly (readonly [
  string,
  CsvOptions["separator"],
  IndividualsFileRead,
])[] = [
  [
    "id,pop\nA,P1\nB,P2\nC,P1\n",
    "auto",
    {
      kind: "read",
      table: {
        columns: ["id", "pop"],
        rows: [
          ["A", "P1"],
          ["B", "P2"],
          ["C", "P1"],
        ],
      },
      columns: [
        { kind: "identifier" },
        { kind: "binary", one: "P2", zero: "P1" },
      ],
      found: {
        encoding: "utf-8",
        separator: ",",
        decimal: ".",
        undecodedLine: null,
      },
    },
  ],
  [
    "id\tpop\nA\tP1\n",
    "auto",
    {
      kind: "read",
      table: { columns: ["id", "pop"], rows: [["A", "P1"]] },
      columns: [{ kind: "identifier" }, { kind: "categorical" }],
      found: {
        encoding: "utf-8",
        separator: "\t",
        decimal: ".",
        undecodedLine: null,
      },
    },
  ],
  [
    "id;h\nA;1,5\nB;1,7\nC;1,9\n",
    "auto",
    {
      kind: "read",
      table: {
        columns: ["id", "h"],
        rows: [
          ["A", 1.5],
          ["B", 1.7],
          ["C", 1.9],
        ],
      },
      columns: [{ kind: "identifier" }, { kind: "continuous" }],
      found: {
        encoding: "utf-8",
        separator: ";",
        decimal: ",",
        undecodedLine: null,
      },
    },
  ],
  [
    "id;h\nA;1.5\nB;1,7\nC;1,9\n",
    "auto",
    {
      kind: "read",
      table: {
        columns: ["id", "h"],
        rows: [
          ["A", "1.5"],
          ["B", "1,7"],
          ["C", "1,9"],
        ],
      },
      columns: [{ kind: "identifier" }, { kind: "categorical" }],
      found: {
        encoding: "utf-8",
        separator: ";",
        decimal: ",",
        undecodedLine: null,
      },
    },
  ],
  [
    "id,x\n001,1\n002,2\n003,3\n",
    "auto",
    {
      kind: "read",
      table: {
        columns: ["id", "x"],
        rows: [
          ["001", 1],
          ["002", 2],
          ["003", 3],
        ],
      },
      columns: [{ kind: "identifier" }, { kind: "continuous" }],
      found: {
        encoding: "utf-8",
        separator: ",",
        decimal: ".",
        undecodedLine: null,
      },
    },
  ],
  [
    "id,st\nA,case\nB,control\nC,\nD,NA\n",
    "auto",
    {
      kind: "read",
      table: {
        columns: ["id", "st"],
        rows: [
          ["A", "case"],
          ["B", "control"],
          ["C", null],
          ["D", null],
        ],
      },
      columns: [
        { kind: "identifier" },
        { kind: "binary", one: "case", zero: "control" },
      ],
      found: {
        encoding: "utf-8",
        separator: ",",
        decimal: ".",
        undecodedLine: null,
      },
    },
  ],
  [
    "id,g\nA,1\nB,2\n",
    "auto",
    {
      kind: "read",
      table: {
        columns: ["id", "g"],
        rows: [
          ["A", 1],
          ["B", 2],
        ],
      },
      columns: [
        { kind: "identifier" },
        { kind: "binary", one: "2", zero: "1" },
      ],
      found: {
        encoding: "utf-8",
        separator: ",",
        decimal: ".",
        undecodedLine: null,
      },
    },
  ],
  [
    "id,s\nA,1\nB,2\nC,3\nD,5\n",
    "auto",
    {
      kind: "read",
      table: {
        columns: ["id", "s"],
        rows: [
          ["A", 1],
          ["B", 2],
          ["C", 3],
          ["D", 5],
        ],
      },
      columns: [{ kind: "identifier" }, { kind: "continuous" }],
      found: {
        encoding: "utf-8",
        separator: ",",
        decimal: ".",
        undecodedLine: null,
      },
    },
  ],
  [
    "id,s\nA,1\nB,01\nC,001\n",
    "auto",
    {
      kind: "read",
      table: {
        columns: ["id", "s"],
        rows: [
          ["A", 1],
          ["B", 1],
          ["C", 1],
        ],
      },
      columns: [{ kind: "identifier" }, { kind: "categorical" }],
      found: {
        encoding: "utf-8",
        separator: ",",
        decimal: ".",
        undecodedLine: null,
      },
    },
  ],
  [
    "id,s\nA,1\nB,1\n",
    "auto",
    {
      kind: "read",
      table: {
        columns: ["id", "s"],
        rows: [
          ["A", 1],
          ["B", 1],
        ],
      },
      columns: [{ kind: "identifier" }, { kind: "categorical" }],
      found: {
        encoding: "utf-8",
        separator: ",",
        decimal: ".",
        undecodedLine: null,
      },
    },
  ],
  [
    'id,n\nA,"x, y"\nB,"say ""hi"""\n',
    "auto",
    {
      kind: "read",
      table: {
        columns: ["id", "n"],
        rows: [
          ["A", "x, y"],
          ["B", 'say "hi"'],
        ],
      },
      columns: [
        { kind: "identifier" },
        { kind: "binary", one: "x, y", zero: 'say "hi"' },
      ],
      found: {
        encoding: "utf-8",
        separator: ",",
        decimal: ".",
        undecodedLine: null,
      },
    },
  ],
  [
    "id,n\r\nA,1\r\n\r\nB,2\r\n",
    "auto",
    {
      kind: "read",
      table: {
        columns: ["id", "n"],
        rows: [
          ["A", 1],
          ["B", 2],
        ],
      },
      columns: [
        { kind: "identifier" },
        { kind: "binary", one: "2", zero: "1" },
      ],
      found: {
        encoding: "utf-8",
        separator: ",",
        decimal: ".",
        undecodedLine: null,
      },
    },
  ],
  [
    "id,n\rA,1\r\rB,2\r",
    "auto",
    {
      kind: "read",
      table: {
        columns: ["id", "n"],
        rows: [
          ["A", 1],
          ["B", 2],
        ],
      },
      columns: [
        { kind: "identifier" },
        { kind: "binary", one: "2", zero: "1" },
      ],
      found: {
        encoding: "utf-8",
        separator: ",",
        decimal: ".",
        undecodedLine: null,
      },
    },
  ],
  [
    "id;pop;;\nA;P1;;\n",
    "auto",
    {
      kind: "read",
      table: { columns: ["id", "pop"], rows: [["A", "P1"]] },
      columns: [{ kind: "identifier" }, { kind: "categorical" }],
      found: {
        encoding: "utf-8",
        separator: ";",
        decimal: ".",
        undecodedLine: null,
      },
    },
  ],
  [
    "id;pop;;\nA;P1\nB;P2;NA\n",
    "auto",
    {
      kind: "read",
      table: {
        columns: ["id", "pop"],
        rows: [
          ["A", "P1"],
          ["B", "P2"],
        ],
      },
      columns: [
        { kind: "identifier" },
        { kind: "binary", one: "P2", zero: "P1" },
      ],
      found: {
        encoding: "utf-8",
        separator: ";",
        decimal: ".",
        undecodedLine: null,
      },
    },
  ],
  [
    "id,x;pop;;\nA,1;P1\nB,2;P2;NA\n",
    "auto",
    {
      kind: "read",
      table: {
        columns: ["id,x", "pop"],
        rows: [
          ["A,1", "P1"],
          ["B,2", "P2"],
        ],
      },
      columns: [
        { kind: "identifier" },
        { kind: "binary", one: "P2", zero: "P1" },
      ],
      found: {
        encoding: "utf-8",
        separator: ";",
        decimal: ".",
        undecodedLine: null,
      },
    },
  ],
  [
    "id;pop;;\nA;P1\nB;P2;;x\n",
    "auto",
    {
      kind: "failed",
      error: { kind: "unnamedColumn", column: 4 },
      format: "text",
    },
  ],
  [
    "id;pop;;\na;1\nb;2;3\n",
    "auto",
    {
      kind: "failed",
      error: { kind: "unnamedColumn", column: 3 },
      format: "text",
    },
  ],
  [
    "id;pop;;x\nA;P1;;1\nB;P2\n",
    "auto",
    {
      kind: "failed",
      error: {
        kind: "raggedRow",
        line: 3,
        expected: 4,
        found: 2,
        separator: ";",
      },
      format: "text",
    },
  ],
  [
    "id,,pop\nA,NA,P1\nB,-,P2\n",
    "auto",
    {
      kind: "read",
      table: {
        columns: ["id", "pop"],
        rows: [
          ["A", "P1"],
          ["B", "P2"],
        ],
      },
      columns: [
        { kind: "identifier" },
        { kind: "binary", one: "P2", zero: "P1" },
      ],
      found: {
        encoding: "utf-8",
        separator: ",",
        decimal: ".",
        undecodedLine: null,
      },
    },
  ],
  [
    "##fileformat=VCFv4.2\n#CHROM\tPOS\n",
    "auto",
    { kind: "failed", error: { kind: "variantsFile" }, format: "text" },
  ],
  [
    "#CHROM\tPOS\tID\n1\t10\tx\n",
    "auto",
    { kind: "failed", error: { kind: "variantsFile" }, format: "text" },
  ],
  [
    "\n##fileformat=VCFv4.2\n#CHROM\tPOS\n",
    "auto",
    { kind: "failed", error: { kind: "variantsFile" }, format: "text" },
  ],
  [
    " \t\r\n#CHROM\tPOS\n",
    "auto",
    { kind: "failed", error: { kind: "variantsFile" }, format: "text" },
  ],
  [
    "id,pop\nA,P1\nB\n",
    "auto",
    {
      kind: "failed",
      error: {
        kind: "raggedRow",
        line: 3,
        expected: 2,
        found: 1,
        separator: ",",
      },
      format: "text",
    },
  ],
  [
    "id,pop\n,P1\n",
    "auto",
    {
      kind: "failed",
      error: { kind: "emptyIndividual", line: 2 },
      format: "text",
    },
  ],
  [
    "id,pop\nA,P1\nA,P2\n",
    "auto",
    {
      kind: "failed",
      error: { kind: "duplicateIndividual", name: "A" },
      format: "text",
    },
  ],
  [
    "id,pop,pop\nA,1,2\n",
    "auto",
    {
      kind: "failed",
      error: { kind: "duplicateColumn", name: "pop" },
      format: "text",
    },
  ],
  [
    "id,,pop\nA,1,P1\n",
    "auto",
    {
      kind: "failed",
      error: { kind: "unnamedColumn", column: 2 },
      format: "text",
    },
  ],
  [
    'id,pop\nA,"P1\nB,P2\n',
    ",",
    {
      kind: "failed",
      error: { kind: "unclosedQuote", line: 2, separator: "," },
      format: "text",
    },
  ],
  [
    "id,pop\n",
    "auto",
    { kind: "failed", error: { kind: "empty" }, format: "text" },
  ],
  ["", "auto", { kind: "failed", error: { kind: "empty" }, format: "text" }],
  [
    "﻿id,pop\nA,P1\n",
    "auto",
    {
      kind: "read",
      table: { columns: ["id", "pop"], rows: [["A", "P1"]] },
      columns: [{ kind: "identifier" }, { kind: "categorical" }],
      found: {
        encoding: "utf-8",
        separator: ",",
        decimal: ".",
        undecodedLine: null,
      },
    },
  ],
  [
    "id;n\tx\nA;1\t2\n",
    "auto",
    {
      kind: "read",
      table: { columns: ["id;n", "x"], rows: [["A;1", 2]] },
      columns: [{ kind: "identifier" }, { kind: "categorical" }],
      found: {
        encoding: "utf-8",
        separator: "\t",
        decimal: ".",
        undecodedLine: null,
      },
    },
  ],
  [
    "id,pop\nA,P1\nB,P2,P3\n",
    "auto",
    {
      kind: "failed",
      error: {
        kind: "raggedRow",
        line: 3,
        expected: 2,
        found: 3,
        separator: ",",
      },
      format: "text",
    },
  ],
  [
    'id,n\nA,"x\ny"\nB,1,2\n',
    "auto",
    {
      kind: "failed",
      error: {
        kind: "raggedRow",
        line: 4,
        expected: 2,
        found: 3,
        separator: ",",
      },
      format: "text",
    },
  ],
  [
    "only\nA\nB\n",
    "auto",
    {
      kind: "read",
      table: { columns: ["only"], rows: [["A"], ["B"]] },
      columns: [{ kind: "identifier" }],
      found: {
        encoding: "utf-8",
        separator: ",",
        decimal: ".",
        undecodedLine: null,
      },
    },
  ],
];

describe("IN1 D1 the cases of readCsv of the reader spec at d10cc1b, read by table_io", () => {
  test.each(READ_CSV_CASES)(
    "%j with the separator %s",
    async (text, separator, expected) => {
      const file = new Blob([new TextEncoder().encode(text)]);
      expect(await readCsvFile(file, { ...AUTO, separator })).toEqual(expected);
    },
  );

  test("the warnings of the cases of few whole numbers: 1, 2, 3 and 5; and 1 twice set continuous", async () => {
    const warningsOf = async (
      text: string,
      types?: readonly ColumnType[],
    ): Promise<readonly ColumnWarning[]> => {
      const read = await readCsvFile(
        new Blob([new TextEncoder().encode(text)]),
        AUTO,
      );
      if (read.kind !== "read") throw new Error("the read failed");
      return columnWarnings(read.table, types ?? read.columns, ".");
    };
    expect(await warningsOf("id,s\nA,1\nB,2\nC,3\nD,5\n")).toEqual([
      {
        kind: "fewWholeLevels",
        column: "s",
        numLevels: 4,
        numTexts: 4,
        min: 1,
        max: 5,
      },
    ]);
    const once = await warningsOf("id,s\nA,1\nB,1\n", [
      { kind: "identifier" },
      { kind: "continuous" },
    ]);
    expect(once).toEqual([
      {
        kind: "fewWholeLevels",
        column: "s",
        numLevels: 1,
        numTexts: 1,
        min: 1,
        max: 1,
      },
    ]);
    const [warning] = once;
    if (warning === undefined) throw new Error("no warning");
    expect(columnWarningText(warning)).toBe(
      "s holds only one whole number, 1, and is taken as a measurement. If it is a code, such as a numbered population, set its type to categorical.",
    );
  });

  test("a column of 12,0 and 13,0 read with the comma gets the warning of few whole numbers, as numbers now", async () => {
    const read = await readCsvFile(
      new Blob([new TextEncoder().encode("id;s\nA;12,0\nB;13,0\nC;14,0\n")]),
      AUTO,
    );
    if (read.kind !== "read") throw new Error("the read failed");
    expect(read.table.rows.map((row) => row[1])).toEqual([12, 13, 14]);
    expect(columnWarnings(read.table, read.columns, ",")).toHaveLength(1);
  });
});
