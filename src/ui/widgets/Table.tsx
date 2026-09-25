/**
 * A table of results: React Aria's `Table`, with our look (react.md,
 * "Widgets: React Aria, wrapped once"). Its caption is shown above it and
 * names it, by `aria-labelledby`; one column is the header of each row,
 * so that a screen reader reads a cell with its row and its column, "p2,
 * Observed heterozygosity, 0.3512". The Tab key enters it once, and the
 * arrow keys move from cell to cell.
 */
import { useId } from "react";
import {
  Cell,
  Column,
  Row,
  Table as AriaTable,
  TableBody,
  TableHeader,
} from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./Table.module.css";

/** A column of the table. */
export interface TableColumn {
  /** Its id, unique in the table. */
  readonly id: string;
  /** The words of its header. */
  readonly label: string;
  /** Whether its cell is the header of each row; one column has it. */
  readonly isRowHeader?: boolean;
  /** Whether it holds numbers, aligned on their end with digits of one
      width. */
  readonly isNumeric?: boolean;
}

/** A row of the table. */
export interface TableRow {
  /** Its id, unique in the table: the name of what it is about. */
  readonly id: string;
  /** The text of its cells, one per column, in their order. */
  readonly cells: readonly string[];
}

/** What a table is drawn with. */
export interface TableProps {
  /** What the table is, shown above it; also its name. */
  readonly caption: string;
  /** Its columns. */
  readonly columns: readonly TableColumn[];
  /** Its rows. */
  readonly rows: readonly TableRow[];
}

/** A table with its caption. */
export function Table({
  caption,
  columns,
  rows,
}: TableProps): React.JSX.Element {
  const captionId = useId();
  return (
    <div className={classOf(styles, "frame")}>
      <p id={captionId} className={classOf(styles, "caption")}>
        {caption}
      </p>
      <div className={classOf(styles, "scroll")}>
        <AriaTable
          aria-labelledby={captionId}
          className={classOf(styles, "table")}
        >
          <TableHeader>
            {columns.map((column) => (
              <Column
                key={column.id}
                id={column.id}
                isRowHeader={column.isRowHeader === true}
                className={cellClass(column, "header")}
              >
                {column.label}
              </Column>
            ))}
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <Row key={row.id} id={row.id} className={classOf(styles, "row")}>
                {columns.map((column, index) => (
                  <Cell
                    key={column.id}
                    className={cellClass(
                      column,
                      column.isRowHeader === true ? "rowHeader" : "cell",
                    )}
                  >
                    {cellOf(row, index)}
                  </Cell>
                ))}
              </Row>
            ))}
          </TableBody>
        </AriaTable>
      </div>
    </div>
  );
}

/** The classes of a cell of `column`: its kind, and the alignment of its
    column. */
function cellClass(
  column: TableColumn,
  kind: "header" | "rowHeader" | "cell",
): string {
  const alignment = column.isNumeric === true ? "numeric" : "text";
  return `${classOf(styles, kind)} ${classOf(styles, alignment)}`;
}

/** The text of the cell `index` of `row`; a defect when it has none. */
function cellOf(row: TableRow, index: number): string {
  const text = row.cells[index];
  if (text === undefined) {
    throw new Error(
      `popnei_web defect: the row ${row.id} of a table has no cell ${String(index)}.`,
    );
  }
  return text;
}
