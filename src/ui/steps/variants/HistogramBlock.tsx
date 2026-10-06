/**
 * One histogram on the Variants step (docs/specs/steps/variants.md, "The
 * plot and the table of its bins"): its title, the line of its threshold
 * while its filter is on, and two tabs, "Plot", selected when the block
 * is drawn, with the line of the bin the threshold splits under the plot,
 * and "Table of the bins"; under them, whichever is selected,
 * the button that downloads the bins as CSV. The block is a group named
 * by its title, so that a screen reader names its tabs and its button
 * with the histogram they belong to. The plot, its table, its CSV and its
 * description are made from the same rows of `histogramRows`, which the
 * step gives, so that none disagrees with another on a bin.
 *
 * Which tab is selected is the block's own state, kept while it is drawn.
 */
import { useId, useState } from "react";

import { binsCsv } from "../../../core/analyses/words.ts";
import type { HistogramData, HistogramRow } from "../../../charts/histogram.ts";
import { classOf } from "../../classOf.ts";
import { downloadText } from "../../download.ts";
import { Button } from "../../widgets/Button.tsx";
import { HistogramPlot } from "../../widgets/HistogramPlot.tsx";
import { Table } from "../../widgets/Table.tsx";
import type { TableColumn } from "../../widgets/Table.tsx";
import { Tabs } from "../../widgets/Tabs.tsx";
import styles from "./HistogramBlock.module.css";
import {
  BINS_CSV_LABEL,
  BINS_LINE,
  FROM_COLUMN,
  PLOT_TAB,
  STATE_COLUMN,
  TABLE_TAB,
  TO_COLUMN,
  binCells,
} from "./histogramWords.ts";

/** The ids of the two tabs. */
const PLOT_ID = "plot";
const TABLE_ID = "table";
type BlockTab = typeof PLOT_ID | typeof TABLE_ID;

/** What one histogram is drawn with. */
export interface HistogramBlockProps {
  /** What the plot draws, its title among it, the same object until
      something in it changes. */
  readonly data: HistogramData;
  /** The rows of its bins, `histogramRows` of `data`. */
  readonly rows: readonly HistogramRow[];
  /** The label of the column of the counts, "Variants". */
  readonly countLabel: string;
  /** The name of the table of the bins. */
  readonly tableName: string;
  /** The line under the title that says how many variants or
      individuals the histogram is over, "Over 1,200 variants", drawn by
      popgen2.html; the old page gives none. */
  readonly countLine?: string;
  /** The line that says the threshold in words, or `null` while the
      filter is off. */
  readonly thresholdLine: string | null;
  /** The line under the plot that names the bin the threshold splits,
      or `null` while it splits none (docs/specs/steps/variants.md, "The
      plot and the table of its bins"). */
  readonly splitLine: string | null;
  /** The name of the CSV of the bins, `panel.variant_maf_bins.csv`. */
  readonly csvName: string;
}

/** A histogram, the table of its bins, and their CSV. */
export function HistogramBlock({
  data,
  rows,
  countLabel,
  tableName,
  countLine,
  thresholdLine,
  splitLine,
  csvName,
}: HistogramBlockProps): React.JSX.Element {
  const titleId = useId();
  const [tab, setTab] = useState<BlockTab>(PLOT_ID);

  const columns: TableColumn[] = [
    { id: "from", label: FROM_COLUMN, isRowHeader: true, isNumeric: true },
    { id: "to", label: TO_COLUMN, isNumeric: true },
    { id: "count", label: countLabel, isNumeric: true },
    ...(data.threshold === null ? [] : [{ id: "state", label: STATE_COLUMN }]),
  ];
  const tableRows = rows.map((row, index) => ({
    id: String(index),
    cells: binCells(row),
  }));

  const download = (): void => {
    downloadText(csvName, binsCsv(rows), "text/csv");
  };

  return (
    <div
      role="group"
      aria-labelledby={titleId}
      className={classOf(styles, "block")}
    >
      <p id={titleId} className={classOf(styles, "title")}>
        {data.title}
      </p>
      {countLine !== undefined && (
        <p className={classOf(styles, "muted")}>{countLine}</p>
      )}
      {thresholdLine !== null && (
        <p className={classOf(styles, "muted")}>{thresholdLine}</p>
      )}
      <Tabs<BlockTab>
        label={data.title}
        selected={tab}
        onChange={setTab}
        tabs={[
          {
            id: PLOT_ID,
            label: PLOT_TAB,
            content: (
              <>
                <HistogramPlot data={data} />
                {splitLine !== null && (
                  <p className={classOf(styles, "muted")}>{splitLine}</p>
                )}
              </>
            ),
          },
          {
            id: TABLE_ID,
            label: TABLE_TAB,
            content: (
              <>
                <p className={classOf(styles, "muted")}>{BINS_LINE}</p>
                <Table caption={tableName} columns={columns} rows={tableRows} />
              </>
            ),
          },
        ]}
      />
      <div>
        <Button label={BINS_CSV_LABEL} onPress={download} />
      </div>
    </div>
  );
}
