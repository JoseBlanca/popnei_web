/**
 * A table sorted by any of its columns: React Aria's `Table`, with our
 * look (react.md, "Widgets: React Aria, wrapped once"), for the tables of
 * many rows that a user sorts to find the worst of them, the statistics
 * of each individual first (docs/specs/analyses/individualChecks.md,
 * "What it shows"). A table of a few rows that is only read is the plain
 * `Table` beside this file.
 *
 * It is a grid: the Tab key enters it once, the arrow keys move from cell
 * to cell and up to the headers, and Enter on a header sorts by it, up
 * the first time and down the next; React Aria announces each sort, "sorted
 * by column Kept in ascending order", in a live region of its own. The
 * cell of one column is the header of its row. The table sits in a box of
 * its own that scrolls both ways, with its header in view, so that
 * thousands of rows do not make the page as long, and a page narrower
 * than the table scrolls the box and not the page; the arrow keys scroll
 * it as they move the focus. Which column is sorted, and which way, is
 * the screen's state, given and changed through `sort` and
 * `onSortChange`.
 *
 * It draws only the rows in view, and those just beyond, with React
 * Aria's `Virtualizer` and `TableLayout` (react.md, "Performance"): with
 * every row of 10,000 in the page, a change of the column Kept or a sort
 * froze it for seconds in Chromium 153 and WebKit 26.6, and with the
 * Virtualizer for tenths of a second; the times are in the work report
 * of docs/plans/variants-step.md, "The table at 10,000 individuals",
 * measured by `VS7 D4` of e2e/measure.spec.ts on 27 September 2026. The
 * rows of the individuals are kept as the same objects across a sort.
 * The heights of the rows and of the
 * header are measured, not fixed, so that text made larger is not cut;
 * each column is as wide as a share of the box, and not narrower than
 * its `minWidth`, beyond which the box scrolls sideways.
 */
import {
  Cell,
  Column,
  Row,
  Table as AriaTable,
  TableBody,
  TableHeader,
  TableLayout,
  Virtualizer,
} from "react-aria-components";
import type { SortDescriptor } from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./SortableTable.module.css";
import type { TableSort } from "./tableSort.ts";

/** A column of the table, whose id is of the union `Id`. */
export interface SortableColumn<Id extends string> {
  /** Its id, unique in the table. */
  readonly id: Id;
  /** The words of its header. */
  readonly label: string;
  /** Whether its cell is the header of each row; one column has it. */
  readonly isRowHeader?: boolean;
  /** Whether it holds numbers, aligned on their end with digits of one
      width. */
  readonly isNumeric?: boolean;
  /** The narrowest it may be, in CSS pixels. */
  readonly minWidth: number;
}

/** The heights a row and the header are drawn at before they are
    measured, in CSS pixels: a line of text of 16 pixels and its padding,
    and three lines for the header, whose words wrap. */
const LAYOUT_OPTIONS = {
  estimatedRowHeight: 33,
  estimatedHeadingHeight: 81,
} as const;

/** A row of the table. */
export interface SortableRow {
  /** Its id, unique in the table: the name of what it is about. */
  readonly id: string;
  /** The text of its cells, one per column, in their order. */
  readonly cells: readonly string[];
}

/** What a sortable table is drawn with. */
export interface SortableTableProps<Id extends string> {
  /** Its name for a screen reader, which a heading above it shows. */
  readonly label: string;
  /** Its columns, in their order. */
  readonly columns: readonly SortableColumn<Id>[];
  /** Its rows, in the order they are shown, sorted by the screen. */
  readonly rows: readonly SortableRow[];
  /** The column sorted and its direction, or `null` for none. */
  readonly sort: TableSort<Id> | null;
  /** Called when a header asks for another sort. */
  readonly onSortChange: (sort: TableSort<Id>) => void;
}

/** A table sorted by any of its columns, in a box that scrolls. */
export function SortableTable<Id extends string>({
  label,
  columns,
  rows,
  sort,
  onSortChange,
}: SortableTableProps<Id>): React.JSX.Element {
  const onSort = (descriptor: SortDescriptor): void => {
    const column = columns.find((c) => c.id === descriptor.column);
    if (column === undefined) {
      throw new Error(
        `popnei_web defect: a table was sorted by a column it does not have, ${String(descriptor.column)}.`,
      );
    }
    onSortChange({ column: column.id, direction: descriptor.direction });
  };
  const indexOf = new Map(columns.map((column, index) => [column.id, index]));
  return (
    <Virtualizer layout={TableLayout} layoutOptions={LAYOUT_OPTIONS}>
      <AriaTable
        aria-label={label}
        className={classOf(styles, "table")}
        {...(sort !== null && { sortDescriptor: sort })}
        onSortChange={onSort}
      >
        <TableHeader columns={columns}>
          {(column) => (
            <Column
              id={column.id}
              isRowHeader={column.isRowHeader === true}
              minWidth={column.minWidth}
              // The name React Aria gives the column when it announces a
              // sort; drawn by a function, the header has no text of its
              // own, and the sort was announced "sorted by column  in
              // ascending order".
              textValue={column.label}
              allowsSorting
              className={cellClass(column, "header")}
            >
              {({ sortDirection }) => (
                <span className={classOf(styles, "headerText")}>
                  {column.label}
                  {/* The direction is said by React Aria, and drawn
                      here for the eyes alone. */}
                  <span aria-hidden="true" className={classOf(styles, "arrow")}>
                    {sortDirection === "ascending"
                      ? "▲"
                      : sortDirection === "descending"
                        ? "▼"
                        : ""}
                  </span>
                </span>
              )}
            </Column>
          )}
        </TableHeader>
        {/* Keyed by the sort, so that a sort draws the rows in view anew
            rather than have React move every row of the collection to its
            new place: with 10,000 rows, keyed, the median freeze of a sort
            went from 279 to 149 ms in Chromium 153 and from 381 to 107 ms
            in WebKit 26.6, on 27 September 2026 (VS7 D4 of
            e2e/measure.spec.ts). The focus stays on the header sorted,
            which is not in the body. */}
        <TableBody
          key={sort === null ? "unsorted" : `${sort.column} ${sort.direction}`}
          items={rows}
          dependencies={[columns]}
        >
          {(row) => (
            <Row
              id={row.id}
              columns={columns}
              className={classOf(styles, "row")}
            >
              {(column) => (
                <Cell className={cellClass(column, "cell")}>
                  {cellOf(row, indexOf.get(column.id))}
                </Cell>
              )}
            </Row>
          )}
        </TableBody>
      </AriaTable>
    </Virtualizer>
  );
}

/** The classes of a cell of `column`: its kind, and the alignment of its
    column. */
function cellClass<Id extends string>(
  column: SortableColumn<Id>,
  kind: "header" | "cell",
): string {
  const alignment = column.isNumeric === true ? "numeric" : "text";
  const header = column.isRowHeader === true && kind === "cell";
  return [
    classOf(styles, kind),
    classOf(styles, alignment),
    ...(header ? [classOf(styles, "rowHeader")] : []),
  ].join(" ");
}

/** The text of the cell `index` of `row`; a defect when it has none. */
function cellOf(row: SortableRow, index: number | undefined): string {
  const text = index === undefined ? undefined : row.cells[index];
  if (text === undefined) {
    throw new Error(
      `popnei_web defect: the row ${row.id} of a table has no cell ${String(index)}.`,
    );
  }
  return text;
}
