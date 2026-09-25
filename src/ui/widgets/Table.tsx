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
 * the frame or of the table.
 */
import { useEffect, useId, useRef, useState } from "react";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  // Whether the table is wider than its frame, which the browser measures
  // and React does not: kept up to date by a ResizeObserver, which also
  // reports the first size of what it observes.
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const frame = scrollRef.current;
    if (frame === null) return;
    const observer = new ResizeObserver(() => {
      setScrolls(frame.scrollWidth > frame.clientWidth);
    });
    observer.observe(frame);
    for (const child of Array.from(frame.children)) observer.observe(child);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className={classOf(styles, "frame")}>
      <p id={captionId} className={classOf(styles, "caption")}>
        {caption}
      </p>
      {scrolls && (
        <p className={classOf(styles, "scrollLine")}>
          Scroll the table sideways to see all its columns.
        </p>
      )}
      {/* A frame that scrolls is reached by the Tab key, so that a user
          of the keyboard scrolls it with the arrow keys (WCAG 2.1.1). */}
      <div
        ref={scrollRef}
        className={classOf(styles, "scroll")}
        {...(scrolls && {
          role: "region",
          "aria-labelledby": captionId,
          tabIndex: 0,
          "data-scrolls": true,
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
