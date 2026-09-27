/**
 * The table of the individuals and its download
 * (docs/specs/analyses/individualChecks.md, "What it shows";
 * docs/specs/steps/variants.md, "The table of the individuals"): one row
 * per individual, in the order of the variants file until a header sorts
 * it, with its two numbers and, while a filter of individuals is set,
 * whether the filters keep it, from the individuals kept that the store
 * gives, with no pass; while the lists of individuals are refused, a
 * line above the table in place of that column. Which column is sorted,
 * and which way, is the table's own state, kept while it is drawn, but
 * for a sort by Kept, which goes with its column.
 */
import { useMemo, useState } from "react";

import {
  individualChecksCsv,
  individualRows,
} from "../../../core/analyses/individualChecks.ts";
import type { IndividualChecksResult } from "../../../worker/protocol.ts";
import { classOf } from "../../classOf.ts";
import { downloadText } from "../../download.ts";
import { useAppState } from "../../store.tsx";
import { Button } from "../../widgets/Button.tsx";
import { SortableTable } from "../../widgets/SortableTable.tsx";
import type { SortableColumn } from "../../widgets/SortableTable.tsx";
import type { TableSort } from "../../widgets/tableSort.ts";
import {
  INDIVIDUAL_COLUMNS,
  KEPT_NOT_KNOWN_LINE,
  STATS_CSV_LABEL,
  STATS_TABLE_NAME,
  individualCells,
  keptColumn,
  sortedRows,
  statsCsvName,
} from "./individualStats.ts";
import type { IndividualColumnId } from "./individualStats.ts";
import styles from "./VariantsStep.module.css";

/** The narrowest each column may be, in CSS pixels: the longest word of
    its header in bold, "Individual", "heterozygosity", with its padding
    and the arrow of the sort; at 88 and 104 pixels those words ran into
    the next column at 320 pixels wide. At that width the four columns
    are wider than the box, which scrolls sideways. */
const MIN_WIDTHS: Readonly<Record<IndividualColumnId, number>> = {
  individual: 104,
  missingGenotypes: 136,
  observedHeterozygosity: 136,
  kept: 80,
};

/** The columns of the table with Kept, and without it. */
const WITH_KEPT: readonly SortableColumn<IndividualColumnId>[] = Object.freeze(
  INDIVIDUAL_COLUMNS.map((column) => ({
    ...column,
    isRowHeader: column.id === "individual",
    isNumeric:
      column.id === "missingGenotypes" ||
      column.id === "observedHeterozygosity",
    minWidth: MIN_WIDTHS[column.id],
  })),
);
const WITHOUT_KEPT = Object.freeze(
  WITH_KEPT.filter((column) => column.id !== "kept"),
);

/** What the table is drawn with. */
export interface IndividualTableProps {
  /** The statistics of each individual, as the store gives them. */
  readonly result: IndividualChecksResult;
  /** The name of the variants file, which the CSV is named after. */
  readonly variantsName: string;
}

/** The table of the individuals, sorted by any column, and its
    download. */
export function IndividualTable({
  result,
  variantsName,
}: IndividualTableProps): React.JSX.Element {
  const numFilters = useAppState((s) => s.project.individualFilters.length);
  const kept = useAppState((s) => s.individualsKept);
  const [sort, setSort] = useState<TableSort<IndividualColumnId> | null>(null);

  const column = useMemo(
    () => keptColumn(numFilters, kept),
    [numFilters, kept],
  );
  const isKept = column.kind === "shown" ? column.isKept : null;
  // A sort by Kept goes with the column, so that the column back is not
  // sorted (individualChecks.md, "What it shows"): set during the render,
  // which React draws again at once, and not in an effect, which would
  // draw the column back sorted for one frame.
  const keptGone = sort?.column === "kept" && isKept === null;
  if (keptGone) {
    setSort(null);
  }
  const shownSort = keptGone ? null : sort;
  // The cells of each row, made again only when the result or the
  // individuals kept change, and the same objects in every order, so that
  // a sort only reorders them and React Aria keeps what it made of each:
  // 10,000 rows turned into cells at every render of the step would be
  // the slowness react.md, "Performance", warns of.
  const cellsOf = useMemo(
    () =>
      new Map(
        individualRows(result).map((row) => [
          row,
          {
            id: row.individual,
            cells: individualCells(
              row,
              isKept === null ? null : isKept(row.individual),
            ),
          },
        ]),
      ),
    [result, isKept],
  );
  const rows = useMemo(
    () =>
      sortedRows(individualRows(result), shownSort, isKept).map((row) => {
        const cells = cellsOf.get(row);
        if (cells === undefined) {
          throw new Error(
            `popnei_web defect: the row of ${row.individual} has no cells.`,
          );
        }
        return cells;
      }),
    [result, shownSort, isKept, cellsOf],
  );

  const download = (): void => {
    downloadText(
      statsCsvName(variantsName),
      individualChecksCsv(result),
      "text/csv",
    );
  };

  return (
    <div className={classOf(styles, "individualTable")}>
      {column.kind === "notKnown" && (
        <p className={classOf(styles, "line")}>{KEPT_NOT_KNOWN_LINE}</p>
      )}
      <SortableTable
        label={STATS_TABLE_NAME}
        columns={isKept === null ? WITHOUT_KEPT : WITH_KEPT}
        rows={rows}
        sort={shownSort}
        onSortChange={setSort}
      />
      <div>
        <Button label={STATS_CSV_LABEL} onPress={download} />
      </div>
    </div>
  );
}
