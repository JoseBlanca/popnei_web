/**
 * A table of results that is only read: a plain HTML table, with our look
 * (docs/specs/analyses/diversity.md, "Accessibility"). It is not React
 * Aria's `Table`, which a table of a few rows, neither sorted nor
 * selected, does not need, and whose removal took 14.19 KB gzipped off
 * the page's first script (docs/technology.md, "React Aria Components").
 * Its caption
 * is shown above it and names it, by `aria-labelledby`; the cell of one
 * column is the header of its row, so that a screen reader reads a cell
 * with its row and its column, "p2, Observed heterozygosity, 0.3512". It
 * sits in a frame that scrolls sideways on a page narrower than the
 * table. While the table is wider than its frame, and only then, a line
 * under the caption says so, a shadow marks each edge the table can
 * scroll toward, and the Tab key reaches the frame, a region named by the
 * caption, so that the arrow keys scroll it; a frame that did so while
 * the table fits would stop the Tab key on nothing and read the caption
 * twice. Whether it fits is measured again at every change of size of
 * the frame or of the table; a frame that stops scrolling while it has
 * the focus keeps it (`sidewaysFrame.ts`).
 *
 * A table of many rows, the bins of the LD decay, 50 for each population,
 * is given `limitedHeight`: its frame is then at most as high as that of
 * `SortableTable.tsx`, 28rem or 70% of the window, and scrolls down inside
 * it with the row of the headers kept in view, so that the table does not
 * push what follows it thousands of pixels down. While the table is higher
 * than the frame, a line says so and the Tab key reaches the frame, as
 * when it scrolls sideways.
 */
import { useId, useRef } from "react";

import { classOf } from "../classOf.ts";
import { useSidewaysFrame } from "./sidewaysFrame.ts";
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
  /** The contents of its cells, one per column, in their order: a text,
      or an element of text laid out by the screen, the pair of names of
      the distances between populations, each kept on one line. */
  readonly cells: readonly (string | React.JSX.Element)[];
}

/** What a table is drawn with. */
export interface TableProps {
  /** What the table is, shown above it; also its name. */
  readonly caption: string;
  /** Its columns. */
  readonly columns: readonly TableColumn[];
  /** Its rows. */
  readonly rows: readonly TableRow[];
  /** Whether its frame has a limited height and scrolls down, its
      headers kept in view: for a table of many rows. */
  readonly limitedHeight?: boolean;
}

/** The line under the caption while the table is wider than its frame. */
export const SCROLL_SIDEWAYS_TEXT =
  "Scroll the table sideways to see all its columns.";

/** The line under the caption while a table of limited height is higher
    than its frame. */
export const SCROLL_DOWN_TEXT = "Scroll the table to see all its rows.";

/** A table with its caption. */
export function Table({
  caption,
  columns,
  rows,
  limitedHeight = false,
}: TableProps): React.JSX.Element {
  const captionId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  // Whether the table is wider than its frame, or higher than a frame of
  // limited height, which the browser measures and React does not, and
  // what the frame is then.
  const frame = useSidewaysFrame(scrollRef, limitedHeight);
  const scrolls = frame.scrolls;

  return (
    <div className={classOf(styles, "frame")}>
      <p id={captionId} className={classOf(styles, "caption")}>
        {caption}
      </p>
      {scrolls && (
        <p className={classOf(styles, "scrollLine")}>{SCROLL_SIDEWAYS_TEXT}</p>
      )}
      {frame.scrollsDown && (
        <p className={classOf(styles, "scrollLine")}>{SCROLL_DOWN_TEXT}</p>
      )}
      {/* A frame that scrolls is reached by the Tab key, so that a user
          of the keyboard scrolls it with the arrow keys (WCAG 2.1.1). */}
      <div
        ref={scrollRef}
        className={
          limitedHeight
            ? `${classOf(styles, "scroll")} ${classOf(styles, "limited")}`
            : classOf(styles, "scroll")
        }
        {...frame.attributes}
        {...(frame.attributes.role !== undefined && {
          "aria-labelledby": captionId,
        })}
      >
        <table aria-labelledby={captionId} className={classOf(styles, "table")}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={cellClass(column, "header")}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column, index) =>
                  column.isRowHeader === true ? (
                    <th
                      key={column.id}
                      scope="row"
                      className={cellClass(column, "rowHeader")}
                    >
                      {cellOf(row, index)}
                    </th>
                  ) : (
                    <td key={column.id} className={cellClass(column, "cell")}>
                      {cellOf(row, index)}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
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

/** The contents of the cell `index` of `row`; a defect when it has
    none. */
function cellOf(row: TableRow, index: number): string | React.JSX.Element {
  const text = row.cells[index];
  if (text === undefined) {
    throw new Error(
      `popnei_web defect: the row ${row.id} of a table has no cell ${String(index)}.`,
    );
  }
  return text;
}
