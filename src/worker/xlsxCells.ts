/**
 * What the files wasm, the package of xlsx_rs, gives of an xlsx, made a
 * plain value: the cells of its first sheet, or a refusal of
 * `IndividualsFileError` (docs/specs/worker/individuals.md, "The package
 * of xlsx_rs, loaded on first need"). It names no import of the package,
 * which only filesRunner.ts loads, and takes its `readXlsx` as an argument,
 * so that Vitest checks it in node with a function of the test in its
 * place. The struct `XlsxRead` of the package has every field of
 * `XlsxReadFields`, and filesRunner.ts passes the package's `readXlsx`
 * itself: a release of xlsx_rs whose declarations lose one of them fails
 * the type check of filesRunner.ts.
 */

import type { IndividualsFileError } from "./protocol.ts";
import { columnLetters } from "./individuals/columnTypes.ts";
import { MAX_SHEET_CELLS } from "./individuals/sheet.ts";
import type { SheetCell, SheetCellsRead } from "./individuals/sheet.ts";

/** The fields of the files wasm's `XlsxRead` that the light worker reads
    (docs/specs/worker/files.md, "The Rust interface"). */
export interface XlsxReadFields {
  /** "" for a sheet read; otherwise the code of a refusal. */
  readonly refusal: string;
  /** The text of the error, for "cellError". */
  readonly detail: string;
  /** The name of the sheet, for a sheet read, "emptySheet" and
      "sheetTooLarge". */
  readonly sheet: string;
  /** The first row of the rectangle, from 1, of a sheet read or of
      "sheetTooLarge". */
  readonly firstRow: number;
  /** The first column of the rectangle, column A being 1. */
  readonly firstColumn: number;
  /** The rows of the rectangle. */
  readonly numRows: number;
  /** The columns of the rectangle. */
  readonly numColumns: number;
  /** The cells, row after row; a new array at each read of the field. */
  readonly cells: unknown[];
  /** Frees the struct from the memory of the wasm. */
  free(): void;
}

/**
 * The cells of the xlsx `bytes`, or its refusal: calls `readXlsx` with
 * `bytes` and `MAX_SHEET_CELLS`, gives an `Error` it throws as the refusal
 * `files` with its message, and frees what it returns, whatever follows.
 * A `sheetTooLarge` gives its last row and its last column, in the
 * letters of Excel. Throws a defect of ours for a code of refusal it does
 * not know, for cells of another length than the rectangle or of another
 * kind than the package declares, and for what `readXlsx` throws that is
 * not an `Error` or is a trap of the wasm, `WebAssembly.RuntimeError`,
 * after which the wasm is not trusted and the light worker ends
 * (.claude/skills/coding/worker.md, "Errors are values").
 */
export function readXlsxCells(
  readXlsx: (bytes: Uint8Array, maxCells: number) => XlsxReadFields,
  bytes: Uint8Array,
): SheetCellsRead {
  let read: XlsxReadFields;
  try {
    read = readXlsx(bytes, MAX_SHEET_CELLS);
  } catch (thrown) {
    if (thrown instanceof WebAssembly.RuntimeError) throw thrown;
    if (!(thrown instanceof Error)) throw thrown;
    return failed({ kind: "files", message: thrown.message });
  }
  try {
    return cellsOrRefusal(read);
  } finally {
    read.free();
  }
}

function failed(error: IndividualsFileError): SheetCellsRead {
  return { kind: "failed", error };
}

/** The cells of a sheet read, or the refusal of its code. */
function cellsOrRefusal(read: XlsxReadFields): SheetCellsRead {
  switch (read.refusal) {
    case "": {
      const { numRows, numColumns } = read;
      const cells = read.cells;
      if (cells.length !== numRows * numColumns) {
        throw new Error(
          `popnei_web defect: xlsx_rs gave ${String(cells.length)} cells for a sheet of ${String(numRows)} rows and ${String(numColumns)} columns`,
        );
      }
      return {
        kind: "cells",
        cells: {
          sheet: read.sheet,
          firstRow: read.firstRow,
          firstColumn: read.firstColumn,
          numColumns,
          cells: cells.map(sheetCell),
        },
      };
    }
    case "notXlsx":
      // Until table_io replaces this reader: the kind is gone from the
      // refusals, and table_io reads such a file as the text it is.
      return failed({ kind: "notWorkbook" });
    case "oldExcel":
    case "encrypted":
      return failed({ kind: read.refusal });
    case "emptySheet":
      return failed({ kind: "emptySheet", sheet: read.sheet });
    case "cellError":
      return failed({ kind: "cellError", error: read.detail });
    case "sheetTooLarge":
      return failed({
        kind: "sheetTooLarge",
        sheet: read.sheet,
        lastRow: read.firstRow + read.numRows - 1,
        lastColumn: columnLetters(read.firstColumn + read.numColumns - 1),
        max: MAX_SHEET_CELLS,
      });
    default:
      throw new Error(
        `popnei_web defect: xlsx_rs gave the refusal "${read.refusal}", which the light worker does not know`,
      );
  }
}

/** A cell as the package declares it: null, a text, a finite number or a
    boolean; anything else breaks its contract, and throws. */
function sheetCell(cell: unknown): SheetCell {
  if (
    cell === null ||
    typeof cell === "string" ||
    typeof cell === "boolean" ||
    (typeof cell === "number" && Number.isFinite(cell))
  ) {
    return cell;
  }
  const what = typeof cell === "number" ? String(cell) : typeof cell;
  throw new Error(
    `popnei_web defect: xlsx_rs gave a cell ${what}, which is not null, a text, a finite number or a boolean`,
  );
}
