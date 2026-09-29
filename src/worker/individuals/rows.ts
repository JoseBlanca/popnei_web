/**
 * The rules of the rows of the individuals file, one code for the rows of
 * a CSV or TSV and for those of the first sheet of an xlsx
 * (docs/specs/worker/individuals.md, "The rows and the cells" and "The
 * xlsx", point 3): a blank row skipped, the header the first row that is
 * not blank, the empty cells at the end of the header whose columns hold
 * no value dropped, a column with no name and a value refused, and the
 * rest of the refusals in their order. A reader gives its rows and how to
 * read one of its cells; a refusal is a value, never an exception.
 */

import type { Result } from "../../core/result.ts";
import type {
  Cell,
  IndividualsFileError,
  IndividualsTable,
} from "../protocol.ts";

/** A row as the reader found it: the line of the file where it starts,
    or the row of the sheet, counted from 1, and its cells. */
export interface ScannedRow<C> {
  readonly line: number;
  readonly cells: readonly C[];
}

/** How the rules read a cell of the reader. */
export interface CellRules<C> {
  /** Whether the cell is empty: nothing, which a blank row and the empty
      cells at the end of the header are made of. */
  readonly isEmpty: (cell: C) => boolean;
  /** Whether the cell is missing, outside the first column and the
      header, where it is a name. */
  readonly isMissing: (cell: C) => boolean;
  /** The text of a cell of the header or of the first column, a name. */
  readonly nameOf: (cell: C) => string;
  /** The cell of the table of a cell that is not missing, outside the
      first column. */
  readonly valueOf: (cell: C) => Cell;
  /** The number of the column at `index` of a row, as the refusals give
      it: counted from 1, and from the first column of the sheet for an
      xlsx. */
  readonly columnNumber: (index: number) => number;
  /** The refusal of a row that does not fit a header counted as
      `numColumns` cells and written with `headerLength`, or `null`; a CSV
      alone has rows of another length. */
  readonly misfit: (
    row: ScannedRow<C>,
    numColumns: number,
    headerLength: number,
  ) => IndividualsFileError | null;
}

/**
 * The table of the rows `rows`, by the rules of the rows, with each cell
 * read by `rules`. It refuses, in this order: no row below the header,
 * `empty`; a column with values in the run of empty cells at the end of
 * the header, `unnamedColumn`; a row that `rules.misfit` refuses, the
 * first by line; a column with values and no name, `unnamedColumn`, then
 * two columns of one name, `duplicateColumn`; then, row by row, a row
 * with no name, `emptyIndividual`, or an individual already seen,
 * `duplicateIndividual`.
 */
export function tableOfRows<C>(
  scanned: readonly ScannedRow<C>[],
  rules: CellRules<C>,
): Result<IndividualsTable, IndividualsFileError> {
  const rows = scanned.filter((row) => !row.cells.every(rules.isEmpty));
  const [header, ...individuals] = rows;
  if (header === undefined || individuals.length === 0) {
    return fail({ kind: "empty" });
  }
  const numColumns = countedColumns(
    header.cells,
    individuals,
    rules.isEmpty,
    rules.isMissing,
  );
  const unnamedAtEnd = unnamedPastNames(
    header.cells,
    numColumns,
    individuals,
    rules,
  );
  if (unnamedAtEnd !== null) {
    return fail({ kind: "unnamedColumn", column: unnamedAtEnd });
  }
  for (const row of individuals) {
    const misfit = rules.misfit(row, numColumns, header.cells.length);
    if (misfit !== null) return fail(misfit);
  }
  const kept = keptColumns(
    header.cells.slice(0, numColumns),
    individuals,
    rules,
  );
  if (!kept.ok) return kept;
  const columns = kept.value.map((index) =>
    rules.nameOf(cellAt(header.cells, index)),
  );
  const duplicate = firstRepeated(columns);
  if (duplicate !== null)
    return fail({ kind: "duplicateColumn", name: duplicate });

  const tableRows: Cell[][] = [];
  const seen = new Set<string>();
  for (const row of individuals) {
    const name = rules.nameOf(cellAt(row.cells, 0));
    if (name === "") return fail({ kind: "emptyIndividual", line: row.line });
    if (seen.has(name)) return fail({ kind: "duplicateIndividual", name });
    seen.add(name);
    tableRows.push(
      kept.value.map((index, position) => {
        if (position === 0) return name;
        const cell = cellAt(row.cells, index);
        return rules.isMissing(cell) ? null : rules.valueOf(cell);
      }),
    );
  }
  return { ok: true, value: { columns, rows: tableRows } };
}

function fail(
  error: IndividualsFileError,
): Result<never, IndividualsFileError> {
  return { ok: false, error };
}

/** The cell at `index` of a row, which the checks before made sure of:
    every row is at least as long as the header, and a row has a first
    cell. */
function cellAt<C>(cells: readonly C[], index: number): C {
  const cell = cells[index];
  if (cell === undefined) {
    throw new Error(
      `popnei_web defect: a row of ${String(cells.length)} cells has no cell ${String(index)}`,
    );
  }
  return cell;
}

/**
 * The number of cells of the header without the run of empty ones at its
 * end whose columns hold no value in any row, as the owner decided on 25
 * September 2026: `id;pop;;` over rows of two cells is a header of two, as
 * Excel shows it. A column holds no value in a row when the row lacks its
 * cell or the cell `holdsNoValue`. The first cell is always counted.
 */
export function countedColumns<C>(
  header: readonly C[],
  rows: readonly ScannedRow<C>[],
  isEmpty: (cell: C) => boolean,
  holdsNoValue: (cell: C) => boolean,
): number {
  let count = header.length;
  while (count > 1) {
    const index = count - 1;
    const name = header[index];
    if (name === undefined || !isEmpty(name)) break;
    const hasValue = rows.some((row) => {
      const cell = row.cells[index];
      return cell !== undefined && !holdsNoValue(cell);
    });
    if (hasValue) break;
    count -= 1;
  }
  return count;
}

/**
 * The number of the first column of the run of empty cells at the end of
 * the header, among the first `numColumns`, that holds a value in some
 * row, or `null`. The run is kept by `countedColumns` only when such a
 * column exists, and the user sees no name there, so it is refused as a
 * column with values and no name before a row is measured against a
 * header that counts it.
 */
function unnamedPastNames<C>(
  header: readonly C[],
  numColumns: number,
  rows: readonly ScannedRow<C>[],
  rules: CellRules<C>,
): number | null {
  let named = numColumns;
  while (named > 1 && rules.isEmpty(cellAt(header, named - 1))) named -= 1;
  for (let index = named; index < numColumns; index += 1) {
    const hasValue = rows.some((row) => {
      const cell = row.cells[index];
      return cell !== undefined && !rules.isMissing(cell);
    });
    if (hasValue) return rules.columnNumber(index);
  }
  return null;
}

/** Whether a row of these cells fits a header counted as `numColumns`
    cells and written with `headerLength`: at least `numColumns` cells,
    and those past the whole header all empty. The cells between the two
    hold no value, by the count. */
export function fitsHeader<C>(
  cells: readonly C[],
  numColumns: number,
  headerLength: number,
  isEmpty: (cell: C) => boolean,
): boolean {
  if (cells.length < numColumns) return false;
  return cells.slice(headerLength).every(isEmpty);
}

/**
 * The indices of the columns kept, in the order of the file: the first
 * always, one with a name, and none with an empty name whose cells are all
 * missing: the columns Excel adds with a trailing separator, and, as the
 * owner decided on 25 September 2026, a column of missing markers alone,
 * which has no values either. A column with an empty name and a value is
 * refused, with its number.
 */
function keptColumns<C>(
  names: readonly C[],
  rows: readonly ScannedRow<C>[],
  rules: CellRules<C>,
): Result<number[], IndividualsFileError> {
  const kept: number[] = [];
  for (const [index, name] of names.entries()) {
    if (index === 0 || !rules.isEmpty(name)) {
      kept.push(index);
    } else if (rows.some((row) => !rules.isMissing(cellAt(row.cells, index)))) {
      return fail({ kind: "unnamedColumn", column: rules.columnNumber(index) });
    }
  }
  return { ok: true, value: kept };
}

/** The first name that appears a second time, or null. */
function firstRepeated(names: readonly string[]): string | null {
  const seen = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) return name;
    seen.add(name);
  }
  return null;
}
