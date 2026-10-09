/**
 * The read of the individuals file in the light worker: its size checked,
 * its bytes read, the files wasm, table_io's package, loaded, and what its
 * `importTable` gives made the table of the project and the types of its
 * columns, or a refusal (docs/specs/worker/individuals.md, "The read by
 * table_io" and "The refusals and their words"). It is apart from
 * filesRunner.ts so that it runs under Vitest in node, with table_io's
 * package loaded from its bytes or an object of the test in its place. It
 * imports the package's types alone, which the build erases; only
 * filesRunner.ts loads it.
 */

import type { TableRead as TableIoRead } from "table_io";
import type { IndividualsFileRead } from "./messages.ts";
import type {
  Cell,
  CsvFound,
  CsvOptions,
  IndividualsFileError,
  IndividualsTable,
  Separator,
  TableFormat,
} from "./protocol.ts";
import { columnLetters, inferColumnTypes } from "./individuals/columnTypes.ts";

/**
 * The largest individuals file read, in bytes: 20 MB. A table of 10,000
 * individuals with 100 columns of 10 characters is about 11 MB; a larger
 * file is usually the variants file picked by mistake. It is checked
 * before the bytes are read, since table_io sees them only once they are
 * in the memory of its wasm, which never shrinks.
 */
export const MAX_INDIVIDUALS_FILE_BYTES = 20_000_000;

/**
 * The most cells the rectangle of a sheet of an xlsx can have, rows times
 * columns, past which table_io refuses it as `sheetTooLarge`. A CSV of
 * 20 MB holds about 1,800,000 cells of ten characters and a separator, so
 * an xlsx can hold a table as large as the largest CSV.
 */
export const MAX_SHEET_CELLS = 2_000_000;

/** What of a File the read uses; a File and a Blob are one. */
export interface BytesSource {
  /** The size of the file, in bytes. */
  readonly size: number;
  /** Its bytes, whole. */
  arrayBuffer(): Promise<ArrayBuffer>;
}

/** What of table_io's TableRead the light worker reads: the type of the
    package, so that a release whose declarations lose a field fails the
    type check. */
export type TableReadFields = Pick<
  TableIoRead,
  | "refusal"
  | "format"
  | "encoding"
  | "separator"
  | "decimal"
  | "undecodedLine"
  | "namesHeader"
  | "names"
  | "numColumns"
  | "columnName"
  | "columnType"
  | "columnMissing"
  | "columnIntegers"
  | "columnFloats"
  | "columnBooleans"
  | "columnTexts"
  | "line"
  | "row"
  | "column"
  | "expected"
  | "found"
  | "text"
  | "size"
  | "sheet"
  | "sheetRows"
  | "sheetColumns"
  | "free"
>;

/** table_io's importTable, once its package is loaded. */
export type ImportTable = (
  bytes: Uint8Array,
  maxBytes: number,
  maxCells: number,
  encoding: string,
  separator: string,
  decimal: string,
) => TableReadFields;

/** Loads the files wasm on first need and gives its importTable, or the
    browser's message when it could not be loaded; never rejects. */
export type LoadImporter = () => Promise<
  ImportTable | { readonly notLoaded: string }
>;

/**
 * Reads the individuals file `file` with the options `csv`, `null` read
 * as every option "auto": refuses a file above MAX_INDIVIDUALS_FILE_BYTES
 * before reading it, `tooLarge`; one the browser cannot read,
 * `unreadable`; with no files wasm, `readerNotLoaded`; otherwise gives
 * table_io's table, made by `readOfTable`, or its refusal. Frees what
 * table_io gives, whatever follows. Rejects for a defect of ours: a
 * refusal or a type of column it does not know, an Error that importTable
 * throws, which it throws only for an argument of ours out of its range,
 * and a trap of the wasm, WebAssembly.RuntimeError.
 */
export async function readIndividualsFile(
  file: BytesSource,
  csv: CsvOptions | null,
  load: LoadImporter,
): Promise<IndividualsFileRead> {
  if (file.size > MAX_INDIVIDUALS_FILE_BYTES) {
    return {
      kind: "failed",
      error: {
        kind: "tooLarge",
        size: file.size,
        max: MAX_INDIVIDUALS_FILE_BYTES,
      },
      format: null,
    };
  }
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch (error) {
    return {
      kind: "failed",
      error: { kind: "unreadable", message: unreadableMessage(error) },
      format: null,
    };
  }
  const importTable = await load();
  if (typeof importTable !== "function") {
    return {
      kind: "failed",
      error: { kind: "readerNotLoaded", message: importTable.notLoaded },
      format: null,
    };
  }
  // A Uint8Array, never the ArrayBuffer, which table_io reads as no bytes.
  const read = importTable(
    new Uint8Array(buffer),
    MAX_INDIVIDUALS_FILE_BYTES,
    MAX_SHEET_CELLS,
    csv === null ? "" : ENCODING_OPTIONS[csv.encoding],
    csv === null ? "" : SEPARATOR_OPTIONS[csv.separator],
    csv === null ? "" : DECIMAL_OPTIONS[csv.decimal],
  );
  try {
    return readOfTable(read);
  } finally {
    read.free();
  }
}

/** The options of a CSV as table_io names them, "auto" being "". */
const ENCODING_OPTIONS: Readonly<Record<CsvOptions["encoding"], string>> = {
  auto: "",
  "utf-8": "utf-8",
  "windows-1252": "windows-1252",
};
const SEPARATOR_OPTIONS: Readonly<Record<CsvOptions["separator"], string>> = {
  auto: "",
  ",": "comma",
  ";": "semicolon",
  "\t": "tab",
};
const DECIMAL_OPTIONS: Readonly<Record<CsvOptions["decimal"], string>> = {
  auto: "",
  ".": "point",
  ",": "comma",
};

/**
 * The table and its found, or the refusal, of what importTable gave: each
 * field and each column read once, since every read copies it out of the
 * wasm. Pure, and frees nothing: readIndividualsFile frees. Throws a
 * defect for a refusal, a format, an option or a type of column table_io's
 * declarations do not give, and for a column of another length than the
 * names.
 */
export function readOfTable(read: TableReadFields): IndividualsFileRead {
  const refusal = read.refusal;
  if (refusal !== "") {
    return refusalOf(read, refusal);
  }
  const format = formatOf(read.format);
  const names = read.names;
  const header: string[] = [read.namesHeader];
  const rows: Cell[][] = names.map((name) => [name]);
  const numColumns = read.numColumns;
  for (let index = 0; index < numColumns; index++) {
    header.push(read.columnName(index));
    const cells = columnCells(read, index, names.length);
    for (const [row, rowCells] of rows.entries()) {
      const cell = cells[row];
      if (cell === undefined) {
        throw new Error(
          `popnei_web defect: table_io gave column ${String(index)} fewer cells than its ${String(names.length)} names`,
        );
      }
      rowCells.push(cell);
    }
  }
  const table: IndividualsTable = { columns: header, rows };
  const found = format === "text" ? foundOf(read) : null;
  return {
    kind: "read",
    table,
    columns: inferColumnTypes(table, found?.decimal ?? "."),
    found,
  };
}

/** The cells of the column `index`, `null` where table_io says it is
    missing, as many as the names. */
function columnCells(
  read: TableReadFields,
  index: number,
  numRows: number,
): readonly Cell[] {
  const missing = read.columnMissing(index);
  const columnType = read.columnType(index);
  const values = columnValues(read, index, columnType);
  if (missing.length !== numRows || values.length !== numRows) {
    throw new Error(
      `popnei_web defect: table_io gave the ${columnType} column ${String(index)} ${String(values.length)} values and ${String(missing.length)} flags of missing for ${String(numRows)} names`,
    );
  }
  return values.map((value, row) => (missing[row] === 1 ? null : value));
}

/** The values of the column `index` of the type `columnType`, a missing
    one among them as table_io writes it. */
function columnValues(
  read: TableReadFields,
  index: number,
  columnType: string,
): readonly Cell[] {
  switch (columnType) {
    case "text":
      return read.columnTexts(index);
    case "float":
      return Array.from(read.columnFloats(index));
    case "boolean":
      return Array.from(read.columnBooleans(index), (value) => value === 1);
    case "integer":
      return integerValues(read.columnIntegers(index));
    default:
      throw new Error(
        `popnei_web defect: table_io gave the type of column "${columnType}", which the light worker does not know`,
      );
  }
}

/** An integer column as numbers; or as texts, each as `String` writes
    its bigint, when one of its values is beyond 2^53 − 1 in either sign,
    which a number of JavaScript cannot hold exactly, so that two
    identifiers that differ in their last digit stay two. A missing value,
    0, is within range and made null by its flag. */
function integerValues(integers: BigInt64Array): readonly Cell[] {
  const exact = integers.every(
    (value) =>
      value <= BigInt(Number.MAX_SAFE_INTEGER) &&
      value >= BigInt(-Number.MAX_SAFE_INTEGER),
  );
  return exact
    ? Array.from(integers, (value) => Number(value))
    : Array.from(integers, (value) => String(value));
}

/** The encoding, the separator and the decimal mark a text file was read
    with, and the line of its first character not decoded. */
function foundOf(read: TableReadFields): CsvFound {
  return {
    encoding: encodingOf(read.encoding),
    separator: separatorOf(read.separator),
    decimal: decimalOf(read.decimal),
    undecodedLine: read.undecodedLine ?? null,
  };
}

/** The refusal `refusal` of table_io as the failed read, with the fields
    its words need and the format table_io found. */
function refusalOf(
  read: TableReadFields,
  refusal: string,
): IndividualsFileRead {
  if (refusal === "unreadable") {
    // table_io does not know the format of a file it cannot read.
    return {
      kind: "failed",
      error: { kind: "files", message: read.text },
      format: null,
    };
  }
  const format = formatOf(read.format);
  return { kind: "failed", error: refusalError(read, refusal, format), format };
}

/** The kind of IndividualsFileError of a refusal of table_io other than
    unreadable. */
function refusalError(
  read: TableReadFields,
  refusal: string,
  format: TableFormat,
): IndividualsFileError {
  switch (refusal) {
    case "empty":
    case "notText":
    case "variantsFile":
    case "cutShort":
    case "oldExcel":
    case "encrypted":
    case "notWorkbook":
      return { kind: refusal };
    case "duplicateColumn":
    case "duplicateIndividual":
      return { kind: refusal, name: read.text };
    case "raggedRow":
      return {
        kind: "raggedRow",
        line: read.line,
        expected: read.expected,
        found: read.found,
        separator: separatorOf(read.separator),
      };
    case "unnamedColumn":
      return { kind: "unnamedColumn", column: read.column };
    case "emptyIndividual":
      return {
        kind: "emptyIndividual",
        line: format === "xlsx" ? read.row : read.line,
      };
    case "unclosedQuote":
      return {
        kind: "unclosedQuote",
        line: read.line,
        separator: separatorOf(read.separator),
      };
    case "tooLarge":
      // The size is checked before table_io reads the bytes, so this
      // cannot come; it is told as the light worker's own.
      return {
        kind: "tooLarge",
        size: read.size,
        max: MAX_INDIVIDUALS_FILE_BYTES,
      };
    case "emptySheet":
      return { kind: "emptySheet", sheet: read.sheet };
    case "cellError":
      return { kind: "cellError", error: read.text };
    case "headerError":
      return {
        kind: "headerError",
        row: read.row,
        column: read.column,
        error: read.text,
      };
    case "sheetTooLarge":
      return {
        kind: "sheetTooLarge",
        sheet: read.sheet,
        lastRow: read.row + read.sheetRows - 1,
        lastColumn: columnLetters(read.column + read.sheetColumns - 1),
        max: MAX_SHEET_CELLS,
      };
    default:
      // formatNotBuilt, which the package has no format left out for, or
      // a refusal of a later release.
      throw new Error(
        `popnei_web defect: table_io gave the refusal "${refusal}", which the light worker does not know`,
      );
  }
}

/** The format table_io found; a defect for anything but its two. */
function formatOf(format: string): TableFormat {
  if (format === "text" || format === "xlsx") {
    return format;
  }
  throw new Error(
    `popnei_web defect: table_io gave the format "${format}", which the light worker does not know`,
  );
}

const ENCODINGS: Readonly<Record<string, CsvFound["encoding"]>> = {
  "utf-8": "utf-8",
  "utf-16": "utf-16",
  "windows-1252": "windows-1252",
};
const SEPARATORS: Readonly<Record<string, Separator>> = {
  comma: ",",
  semicolon: ";",
  tab: "\t",
};
const DECIMALS: Readonly<Record<string, CsvFound["decimal"]>> = {
  point: ".",
  comma: ",",
};

/** The encoding table_io names, as the protocol names it. */
function encodingOf(encoding: string): CsvFound["encoding"] {
  return mapped(ENCODINGS, encoding, "encoding");
}

/** The separator table_io names, as the protocol names it. */
function separatorOf(separator: string): Separator {
  return mapped(SEPARATORS, separator, "separator");
}

/** The decimal mark table_io names, as the protocol names it. */
function decimalOf(decimal: string): CsvFound["decimal"] {
  return mapped(DECIMALS, decimal, "decimal mark");
}

/** The value `table` gives `name`; a defect for a name it does not have. */
function mapped<T>(
  table: Readonly<Record<string, T>>,
  name: string,
  what: string,
): T {
  const value = Object.hasOwn(table, name) ? table[name] : undefined;
  if (value === undefined) {
    throw new Error(
      `popnei_web defect: table_io gave the ${what} "${name}", which the light worker does not know`,
    );
  }
  return value;
}

/** The name and the message of what the browser threw, for the console:
    the name tells a file deleted, `NotFoundError`, from one changed,
    `NotReadableError`. */
function unreadableMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  return error.message === "" ? error.name : `${error.name}: ${error.message}`;
}
