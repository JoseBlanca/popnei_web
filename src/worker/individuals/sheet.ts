/**
 * The reader of the cells of an xlsx: it takes the rectangle of the first
 * sheet that the files wasm, xlsx_rs, gave, and makes the table of the
 * individuals and the type of each column, by the rules of the rows that
 * it shares with the reader of CSV and TSV (docs/specs/worker/individuals.md,
 * "The xlsx"). Pure, as csv.ts is: a refusal is a value, never an
 * exception.
 */

import type { Result } from "../../core/result.ts";
import type {
  ColumnType,
  IndividualsFileError,
  IndividualsTable,
} from "../protocol.ts";
import { inferColumnTypes } from "./columnTypes.ts";
import { tableOfRows } from "./rows.ts";
import type { ScannedRow } from "./rows.ts";

/** A cell of a sheet as the files wasm gives it: empty, a text, a finite
    number or a boolean; a date and an error are text by then. */
export type SheetCell = string | number | boolean | null;

/** The rectangle of a sheet, as the light worker makes it of what the
    files wasm gives (docs/specs/worker/files.md). */
export interface SheetCells {
  /** The name of the sheet. */
  readonly sheet: string;
  /** The first row of the rectangle, as Excel numbers the rows, from 1. */
  readonly firstRow: number;
  /** The first column of the rectangle, column A being 1. */
  readonly firstColumn: number;
  /** The number of columns of the rectangle. */
  readonly numColumns: number;
  /** The cells, row after row; the numbers finite. */
  readonly cells: readonly SheetCell[];
}

/** What the light worker gets of an xlsx: its cells, or a refusal of the
    files wasm or of its download. */
export type SheetCellsRead =
  | { readonly kind: "cells"; readonly cells: SheetCells }
  | { readonly kind: "failed"; readonly error: IndividualsFileError };

/**
 * The most cells the rectangle of a sheet can have, rows times columns,
 * which the files wasm is given with each read and refuses past, as
 * `sheetTooLarge`. A CSV of 20 MB holds about 1,800,000 cells of ten
 * characters and a separator, so an xlsx can hold a table as large as a
 * CSV can. An estimate, as the 20 MB is.
 */
export const MAX_SHEET_CELLS = 2_000_000;

/** The errors of Excel that calamine knows, which xlsx_rs gives as their
    text; such a text is a missing value of an xlsx outside the header and
    the first column, as the owner decided on 28 September 2026, a name in
    the first column, and a refusal in the header, `headerError`, as the
    owner decided on 29 September 2026. */
const EXCEL_ERRORS: readonly string[] = [
  "#N/A",
  "#DIV/0!",
  "#NAME?",
  "#NULL!",
  "#NUM!",
  "#REF!",
  "#VALUE!",
];

/** The texts of a missing value of a CSV, which are missing in an xlsx
    too (docs/functionality.md, section 4). */
const MISSING_TEXTS: readonly string[] = ["", "NA", "-"];

/** The spaces and tabs at the ends of a text. */
const BLANK_ENDS = /^[ \t]+|[ \t]+$/gu;

/**
 * The table of the rectangle `sheet` and the type of each of its columns.
 * The rows go through the rules of the rows of a CSV, the refusals in
 * the same order, and none of them is of another length. A text has its
 * spaces and tabs at the ends removed, and is missing when it is then
 * empty, `NA`, `-` or one of the seven errors of Excel, but in the first
 * column, where it is a name. One of the seven in the header, the first
 * row that is not blank, refuses the sheet before any refusal of the
 * rows, `headerError`, with the row and the column of the sheet where it
 * stands, since it is no name the user gave. A number or a boolean stays
 * one in the table, and is written as `String` writes it in the header
 * and the first column. The row of `emptyIndividual`, the column of
 * `unnamedColumn` and both of `headerError` are those of the sheet. The types are inferred with the
 * point, as a text of an xlsx writes a number. Throws a defect when
 * `numColumns` is not a whole number above 0 or `cells` is not a whole
 * number of rows of it.
 */
export function readSheet(sheet: SheetCells): Result<
  {
    readonly table: IndividualsTable;
    readonly columns: readonly ColumnType[];
  },
  IndividualsFileError
> {
  const { numColumns, cells } = sheet;
  if (
    !Number.isInteger(numColumns) ||
    numColumns < 1 ||
    cells.length % numColumns !== 0
  ) {
    throw new Error(
      `popnei_web defect: the sheet ${sheet.sheet} has ${String(cells.length)} cells, not a whole number of rows of ${String(numColumns)} columns`,
    );
  }
  const rows: ScannedRow<SheetCell>[] = [];
  for (let start = 0; start < cells.length; start += numColumns) {
    rows.push({
      line: sheet.firstRow + start / numColumns,
      cells: cells.slice(start, start + numColumns).map(trimmed),
    });
  }
  const headerError = errorInHeader(rows, sheet.firstColumn);
  if (headerError !== null) return { ok: false, error: headerError };
  const table = tableOfRows(rows, {
    isEmpty,
    isMissing: (cell) =>
      isEmpty(cell) ||
      (typeof cell === "string" &&
        (MISSING_TEXTS.includes(cell) || EXCEL_ERRORS.includes(cell))),
    nameOf: (cell) => (cell === null ? "" : String(cell)),
    valueOf: (cell) => cell,
    columnNumber: (index) => sheet.firstColumn + index,
    misfit: () => null,
  });
  if (!table.ok) return table;
  return {
    ok: true,
    value: {
      table: table.value,
      columns: inferColumnTypes(table.value, "."),
    },
  };
}

/** The refusal of the first cell of the header, the first row that is
    not blank, that is one of the errors of Excel, with its row and its
    column of the sheet; `null` when there is none, or no header. */
function errorInHeader(
  rows: readonly ScannedRow<SheetCell>[],
  firstColumn: number,
): IndividualsFileError | null {
  const header = rows.find((row) => !row.cells.every(isEmpty));
  if (header === undefined) return null;
  const index = header.cells.findIndex(
    (cell) => typeof cell === "string" && EXCEL_ERRORS.includes(cell),
  );
  const error = header.cells[index];
  return typeof error === "string"
    ? {
        kind: "headerError",
        row: header.line,
        column: firstColumn + index,
        error,
      }
    : null;
}

/** A cell with the spaces and tabs at the ends of its text removed. */
function trimmed(cell: SheetCell): SheetCell {
  return typeof cell === "string" ? cell.replace(BLANK_ENDS, "") : cell;
}

/** Whether a cell is empty: nothing, or a text of nothing once trimmed. */
function isEmpty(cell: SheetCell): boolean {
  return cell === null || cell === "";
}
