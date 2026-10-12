/**
 * The result of the distances between populations in the Distances tab
 * of popgen2.html (docs/specs/steps/popgen2-distances.md, "The result"):
 * the heatmap of the measure the radio buttons choose, with its
 * "Download…" above it and its line of order under it; the table of the
 * pairs, its caption ending with the populations and their individuals,
 * and then the unclassified individuals left out,
 * and its "Download…" below it, whose CSV writes the two populations of
 * a pair in two fields; and the line of the versions. Above 200
 * populations, which this page's column of 20 values at most never
 * gives, the old panel's line stands in place of the heatmap and the
 * table. The frame of `AnalysisPanel.tsx` draws the warnings above it.
 *
 * The measure is in no key, so a change of it keeps this component; only
 * the part of the heatmap reads it and is drawn again. In the code of
 * the tab, which is downloaded apart from the page's.
 */
import { memo, useEffect, useMemo } from "react";

import type { HeatmapData } from "../../../charts/heatmap.ts";
import {
  MEASURE_NAMES,
  orderText,
  popDistsDescription,
  popDistsHeatmap,
  popDistsOptions,
  popDistsRows,
  tooManyPopulationsText,
} from "../../../core/analyses/popDists.ts";
import { downloadName, variantsStem } from "../../../core/fileNames.ts";
import type { PopDistsResult } from "../../../worker/protocol.ts";
import { classOf } from "../../classOf.ts";
import { useAppState } from "../../store.tsx";
import type { PlotDownload, RowValues } from "../../widgets/downloadItems.ts";
import { DownloadMenu } from "../../widgets/DownloadMenu.tsx";
import { tableItem } from "../../widgets/downloadItems.ts";
import { Table } from "../../widgets/Table.tsx";
import type { TableColumn, TableRow } from "../../widgets/Table.tsx";
import type { ResultsProps } from "../panels.ts";
import { versionsText } from "../words.ts";
import { HeatmapPlot } from "./HeatmapPlot.tsx";
import { warnNotPlaced } from "./notPlaced.ts";
import styles from "./PopDistsResults.module.css";
import {
  DISTANCES_TABLE_WHAT,
  TABLE_FILE,
  heatmapFiles,
  heatmapValuesLine,
  heatmapWhat,
  matrixCsv,
  pairsCsv,
  distancesCaption,
} from "./tabWords.ts";
import { unclassifiedLeftOutOf } from "../unclassifiedWords.ts";
import { heatmapTitle, numberCells, pairNames } from "./words.ts";

/** The columns of the table (popDists.md, "What it shows"). */
const COLUMNS: readonly TableColumn[] = Object.freeze([
  { id: "pair", label: "Pair", isRowHeader: true },
  { id: "fst", label: MEASURE_NAMES.fst, isNumeric: true },
  { id: "dest", label: MEASURE_NAMES.dest, isNumeric: true },
  { id: "variants", label: "Variants", isNumeric: true },
]);

/** The heatmap and its line of order, the table, their downloads, and
    the line of the versions. */
export function DistancesTabResults({
  result,
}: ResultsProps): React.JSX.Element {
  const variantsName = useAppState((s) => s.project.variants?.name ?? null);
  const popneiVersion = useAppState((s) => s.popneiVersion);
  // The result is shown under the key of the populations and the
  // individuals kept now, so those left out are those of now.
  const leftOut = useAppState((s) =>
    unclassifiedLeftOutOf(s.project, s.individualsKept),
  );
  if (result.analysis !== "popDists") {
    throw new Error(
      `popnei_web defect: the heatmap of the distances was given a result of ${result.analysis}.`,
    );
  }
  // A result is shown only under the key of the project's variants file
  // and of the popnei that made it, so both are known.
  if (variantsName === null || popneiVersion === null) {
    throw new Error(
      "popnei_web defect: a result of the distances is shown with no variants file or no version of popnei.",
    );
  }
  const tooMany = tooManyPopulationsText(result);
  return (
    <div className={classOf(styles, "results")}>
      {tooMany === null ? (
        <>
          <DistancesHeatmap result={result} variantsName={variantsName} />
          <PairsTable
            result={result}
            variantsName={variantsName}
            caption={distancesCaption(result, variantsName, leftOut)}
          />
        </>
      ) : (
        <>
          <p className={classOf(styles, "line")}>{tooMany}</p>
          <div>
            <DownloadMenu
              what={DISTANCES_TABLE_WHAT}
              items={[
                tableItem(tableName(variantsName), {
                  kind: "csv",
                  csv: () => pairsCsv(result),
                }),
              ]}
              waiting={null}
            />
          </div>
        </>
      )}
      <p className={classOf(styles, "muted")}>
        {versionsText(popneiVersion, APP_VERSION)}
      </p>
    </div>
  );
}

/** The name of the file of the table: "panel.popdists.csv". */
function tableName(variantsName: string): string {
  return downloadName(variantsStem(variantsName), TABLE_FILE, "csv");
}

/** What the heatmap and the table are drawn with. */
interface PartProps {
  /** The result, of 200 populations or fewer. */
  readonly result: PopDistsResult;
  /** The name of the variants file, which the description, the caption
      and the files name. */
  readonly variantsName: string;
}

/** The heatmap of the measure the radio buttons choose, its "Download…"
    above it and the line of its order under it, none for two
    populations. */
function DistancesHeatmap({
  result,
  variantsName,
}: PartProps): React.JSX.Element {
  const measure = useAppState((s) => popDistsOptions(s.project).measure);
  // popnei's words of an order it refused are not shown, and go to the
  // console once for the result, for a report of the problem.
  useEffect(() => {
    warnNotPlaced(result);
  }, [result]);
  // The same data while the result and the measure are the same, so
  // that the heatmap is not drawn again on every render.
  const data = useMemo((): HeatmapData => {
    const heatmap = popDistsHeatmap(result, measure);
    return {
      names: heatmap.names,
      values: heatmap.values,
      valueName: MEASURE_NAMES[measure],
      title: heatmapTitle(measure),
      description: popDistsDescription(result, measure, variantsName),
      xLabel: "",
      yLabel: "",
    };
  }, [result, measure, variantsName]);
  const download = useMemo(
    (): PlotDownload => ({
      what: heatmapWhat(measure),
      stem: variantsStem(variantsName),
      imageWhat: heatmapFiles(measure),
      csvWhat: heatmapFiles(measure),
      csv: () => matrixCsv(result, measure),
      waiting: null,
    }),
    [result, measure, variantsName],
  );
  const order = orderText(result, measure);
  const negative = data.values.some((value) => value < 0);
  return (
    <div className={classOf(styles, "heatmapPart")}>
      <HeatmapPlot
        data={data}
        download={download}
        valuesLine={heatmapValuesLine(negative)}
      />
      {order !== null && <p className={classOf(styles, "line")}>{order}</p>}
    </div>
  );
}

/** The table of the pairs with its "Download…" below it, its rows made
    once for the result. */
const PairsTable = memo(function PairsTable({
  result,
  variantsName,
  caption,
}: PartProps & { readonly caption: string }): React.JSX.Element {
  const rows = useMemo(
    (): readonly (TableRow & RowValues)[] =>
      popDistsRows(result).map((row) => {
        const [first, second] = pairNames(row);
        return {
          // The null character is in no name of a file, so it parts the
          // two names of the pair without making two pairs alike.
          id: `${row.first}\u0000${row.second}`,
          cells: [
            <>
              <span className={classOf(styles, "name")}>{first} and</span>{" "}
              <span className={classOf(styles, "name")}>{second}</span>
            </>,
            ...numberCells(row),
          ],
          // The values the menu checks; its CSV is `pairsCsv`, which
          // writes the pair in two fields.
          values: [
            `${row.first} and ${row.second}`,
            row.fst,
            row.dest,
            row.numVars,
          ],
        };
      }),
    [result],
  );
  return (
    <Table
      caption={caption}
      columns={COLUMNS}
      rows={rows}
      download={{
        what: DISTANCES_TABLE_WHAT,
        fileName: tableName(variantsName),
        waiting: null,
        csv: () => pairsCsv(result),
      }}
    />
  );
});
