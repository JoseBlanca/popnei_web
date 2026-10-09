/**
 * Which column of a sortable table is sorted, and which way: the type
 * `SortableTable.tsx` is given and gives, in a module of its own so that
 * a pure module that sorts the rows, `individualStats.ts`, names it
 * without importing a component.
 */

/** Which column is sorted, and which way. */
export interface TableSort<Id extends string> {
  /** The column sorted. */
  readonly column: Id;
  /** Up or down. */
  readonly direction: "ascending" | "descending";
}

/**
 * The most columns of a sortable table whose body is drawn anew at each
 * sort; past them, the body moves its rows.
 *
 * A body drawn anew makes React Aria build its hidden list of every cell
 * of every row again, a cost that grows with the columns; a body that
 * moves its rows costs about the same whatever the columns. On the
 * owner's Mac, on the built site, the 10,000 rows of the statistics of
 * each individual, 4 columns, were sorted in a median of 149 ms drawn
 * anew against 279 ms moved in Chromium 153, and 107 against 381 ms in
 * WebKit 26.6 (VS7 D4 of e2e/measure.spec.ts, 27 September 2026); the
 * 10,000 rows of individuals_10000.xlsx, 20 columns, in 675 ms drawn
 * anew against 268 ms moved in Chromium, and 430 against 382 ms in
 * WebKit (IN6 D4, 9 October 2026). Drawn anew costs about 34 ms a column
 * in Chromium and 22 in WebKit, and moved about 270 and 380 ms, so the
 * two meet near 8 columns in Chromium and 16 in WebKit.
 */
export const MOST_COLUMNS_REDRAWN = 8;

/** The key of the body of a sortable table of `columnCount` columns
    sorted by `sort`: one for each sort up to `MOST_COLUMNS_REDRAWN`
    columns, so that a sort draws the body anew; past them the same for
    every sort, so that a sort moves its rows. */
export function bodyKey<Id extends string>(
  sort: TableSort<Id> | null,
  columnCount: number,
): string {
  if (columnCount > MOST_COLUMNS_REDRAWN) return "rows";
  return sort === null ? "unsorted" : `${sort.column} ${sort.direction}`;
}
