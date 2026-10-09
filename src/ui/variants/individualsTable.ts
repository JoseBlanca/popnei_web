/**
 * The table of the individuals file under the tab "Individuals file" of
 * popgen2.html, as `SortableTable` takes it
 * (docs/specs/steps/popgen2-input.md, "The table"): every column of the
 * file in its order, the first, the names, the header of each row; every
 * row in its order, each cell as `cellShown` of core writes it, a missing
 * value empty, a number with the decimal mark of the read; a control or
 * format character of a header or a cell escaped, `escaped` of core, as
 * the list and the counts show them, so that U+202E does not turn the
 * text after it around; and the sort by one column, of the cells as the
 * file holds them, numbers by value, booleans false first, texts by their
 * code units, missing values last whichever the direction, rows of equal
 * values in the order of the file. Pure, so that a test in node checks
 * it.
 */
import {
  cellShown,
  escaped,
  identifierOf,
  shownDecimal,
} from "../../core/project.ts";
import type { TableRead } from "../../core/project.ts";
import type { Cell, IndividualsTable } from "../../worker/protocol.ts";
import type { SortableColumn, SortableRow } from "../widgets/SortableTable.tsx";
import type { TableSort } from "../widgets/tableSort.ts";

/** The id of a column of the table: its place in the file, since two
    columns of a file may share a name. */
export type TableColumnId = `c${number}`;

/** The narrowest a column may be, in CSS pixels, whatever its name;
    past the width of the box, it scrolls sideways. */
const MIN_WIDTH = 96;

/** The width of a character of a header in bold, at most, and the room of
    the padding and the arrow of the sort beside its words, in CSS pixels:
    "Individuo" and "Población" of individuals_10000.xlsx broke inside the
    word at 96 pixels on a page 320 pixels wide in Chromium 153. */
const HEADER_CHARACTER = 10;
const HEADER_ROOM = 40;

/** The narrowest the column named `label` may be: its longest word in
    bold whole, with the padding and the arrow. */
function minWidthOf(label: string): number {
  const longest = Math.max(
    0,
    ...label.split(/\s+/u).map((word) => Array.from(word).length),
  );
  return Math.max(MIN_WIDTH, HEADER_ROOM + HEADER_CHARACTER * longest);
}

/** The id of the column at `index`. */
function columnId(index: number): TableColumnId {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- an index, a whole number, written as String writes it; String() would give a string the template type does not take
  return `c${index}`;
}

/** The columns of the table of `read`, in the order of the file: the
    first the header of each row; a column whose every value is a number,
    with one at least, aligned as numbers. */
export function individualsTableColumns(
  read: TableRead,
): readonly SortableColumn<TableColumnId>[] {
  const { columns, rows } = read.table;
  return columns.map((name, index) => {
    const label = escaped(name);
    return {
      id: columnId(index),
      label,
      isRowHeader: index === 0,
      isNumeric: index > 0 && isNumbers(rows, index),
      minWidth: minWidthOf(label),
    };
  });
}

/** Whether every value of the column at `index` of `rows` that is not
    missing is a number, and there is one. */
function isNumbers(rows: IndividualsTable["rows"], index: number): boolean {
  let any = false;
  for (const row of rows) {
    const cell = row[index];
    if (cell === null || cell === undefined) continue;
    if (typeof cell !== "number") return false;
    any = true;
  }
  return any;
}

/** The rows of each read, made once, so that a sort only reorders the
    same objects and the table keeps what it made of each. */
const ROWS = new WeakMap<TableRead, readonly SortableRow[]>();

/** The rows of the table of `read`, in the order of the file, the same
    array of the same objects at every call for the same read. */
export function individualsTableRows(read: TableRead): readonly SortableRow[] {
  const kept = ROWS.get(read);
  if (kept !== undefined) return kept;
  const decimal = shownDecimal(read);
  const rows = read.table.rows.map((row) => ({
    id: identifierOf(row[0]),
    cells: row.map((cell) => escaped(cellShown(cell, decimal) ?? "")),
  }));
  ROWS.set(read, rows);
  return rows;
}

/** The rank of a kind of cell in a sort, so that a column of mixed kinds,
    which table_io does not give, still sorts in one way. */
function rankOf(cell: Exclude<Cell, null>): number {
  if (typeof cell === "number") return 0;
  if (typeof cell === "boolean") return 1;
  return 2;
}

/** The order of two cells that are not missing, up. */
function compareCells(a: Exclude<Cell, null>, b: Exclude<Cell, null>): number {
  const rank = rankOf(a) - rankOf(b);
  if (rank !== 0) return rank;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") {
    return Number(a) - Number(b);
  }
  // By code units, the same in every browser, and not by the language.
  const textA = String(a);
  const textB = String(b);
  return textA < textB ? -1 : textA > textB ? 1 : 0;
}

/**
 * `rows`, the rows of `read` from `individualsTableRows`, sorted by
 * `sort`: the rows themselves for no sort; otherwise a new array of the
 * same objects, by the cells of the column sorted, missing values last in
 * both directions, and equal values in the order of the file.
 */
export function sortedTableRows(
  read: TableRead,
  rows: readonly SortableRow[],
  sort: TableSort<TableColumnId> | null,
): readonly SortableRow[] {
  if (sort === null) return rows;
  const index = Number(sort.column.slice(1));
  const cells = read.table.rows.map((row) => row[index] ?? null);
  const sign = sort.direction === "ascending" ? 1 : -1;
  const order = rows
    .map((_, at) => at)
    .toSorted((x, y) => {
      const a = cells[x] ?? null;
      const b = cells[y] ?? null;
      if (a === null || b === null) {
        return a === b ? x - y : a === null ? 1 : -1;
      }
      const byValue = sign * compareCells(a, b);
      return byValue !== 0 ? byValue : x - y;
    });
  return order.map((at) => {
    const row = rows[at];
    if (row === undefined) {
      throw new Error(
        `popnei_web defect: the table of the individuals file has no row ${String(at)}.`,
      );
    }
    return row;
  });
}
