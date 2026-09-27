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
