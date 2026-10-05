/**
 * The result of the distances between populations
 * (docs/specs/analyses/popDists.md, "What it shows"): the heatmap of the
 * measure the radio buttons choose, in its order, with the line that
 * says how it is ordered; the table of the pairs with both measures and
 * their variants; and the download of the table as CSV with the line of
 * the versions beside it. Above 200 populations, the most the heatmap
 * draws, the line that says so stands in place of the heatmap and the
 * table, and the download stays. The frame of `AnalysisPanel.tsx` draws
 * the warnings above it, and gives the words of the comparison with the
 * check numbers, drawn under the table.
 *
 * The measure is in no key, so a change of it keeps this component. Only
 * the part of the heatmap reads it and is drawn again; the rows of the
 * table, up to 19,900 of them, are made once for each result.
 */
import { memo, useEffect, useMemo } from "react";

import type { HeatmapData } from "../../../charts/heatmap.ts";
import {
  MEASURE_NAMES,
  orderText,
  popDistsCsv,
  popDistsDescription,
  popDistsHeatmap,
  popDistsOptions,
  popDistsRows,
  tooManyPopulationsText,
} from "../../../core/analyses/popDists.ts";
import type { PopDistsRow } from "../../../core/analyses/popDists.ts";
import type { PopDistsResult } from "../../../worker/protocol.ts";
import { classOf } from "../../classOf.ts";
import { downloadText } from "../../download.ts";
import { useAppState } from "../../store.tsx";
import { Button } from "../../widgets/Button.tsx";
import { Table } from "../../widgets/Table.tsx";
import type { TableColumn, TableRow } from "../../widgets/Table.tsx";
import type { ResultsProps } from "../panels.ts";
import { versionsText } from "../words.ts";
import { HeatmapPlot } from "./HeatmapPlot.tsx";
import { warnNotPlaced } from "./notPlaced.ts";
import styles from "./PopDistsResults.module.css";
import {
  captionText,
  csvName,
  heatmapTitle,
  numberCells,
  pairNames,
} from "./words.ts";

/** The columns of the table (the spec, "What it shows"). */
const COLUMNS: readonly TableColumn[] = Object.freeze([
  { id: "pair", label: "Pair", isRowHeader: true },
  { id: "fst", label: MEASURE_NAMES.fst, isNumeric: true },
  { id: "dest", label: MEASURE_NAMES.dest, isNumeric: true },
  { id: "variants", label: "Variants", isNumeric: true },
]);

/** The heatmap and its line of order, the table, and the download. */
export function PopDistsResults({
  result,
  check,
}: ResultsProps): React.JSX.Element {
  const variantsName = useAppState((s) => s.project.variants?.name ?? null);
  const popneiVersion = useAppState((s) => s.popneiVersion);
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

  const download = (): void => {
    downloadText(csvName(variantsName), popDistsCsv(result), "text/csv");
  };
  const tooMany = tooManyPopulationsText(result);

  return (
    <div className={classOf(styles, "results")}>
      {tooMany === null ? (
        <>
          <DistancesHeatmap result={result} variantsName={variantsName} />
          <PairsTable result={result} variantsName={variantsName} />
        </>
      ) : (
        <p className={classOf(styles, "line")}>{tooMany}</p>
      )}
      {check !== null && <p className={classOf(styles, "line")}>{check}</p>}
      <div className={classOf(styles, "download")}>
        <Button label="Download the table as CSV" onPress={download} />
        <p className={classOf(styles, "muted")}>
          {versionsText(popneiVersion, APP_VERSION)}
        </p>
      </div>
    </div>
  );
}

/** What the heatmap and the table are drawn with. */
interface PartProps {
  /** The result, of 200 populations or fewer. */
  readonly result: PopDistsResult;
  /** The name of the variants file, which the description and the
      caption name. */
  readonly variantsName: string;
}

/** The heatmap of the measure the radio buttons choose, and the line of
    its order under it, none for two populations. */
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
  // that the heatmap is not drawn again on every render (react.md,
  // "Mounting a plot").
  const data = useMemo((): HeatmapData => {
    const heatmap = popDistsHeatmap(result, measure);
    return {
      names: heatmap.names,
      values: heatmap.values,
      valueName: MEASURE_NAMES[measure],
      title: heatmapTitle(measure),
      description: popDistsDescription(result, measure, variantsName),
      // The names of the populations say what the axes are
      // (heatmap.md, "The names on the axes").
      xLabel: "",
      yLabel: "",
    };
  }, [result, measure, variantsName]);
  const order = orderText(result, measure);
  return (
    <div className={classOf(styles, "heatmapPart")}>
      <HeatmapPlot data={data} />
      {order !== null && <p className={classOf(styles, "line")}>{order}</p>}
    </div>
  );
}

/** The table of the pairs, whose rows are made once for the result, and
    which is not drawn again while its result and the name of the variants
    file are the same: the frame of the panel is drawn again when a notice
    comes or goes, and the table of 200 populations has 19,900 rows. */
const PairsTable = memo(function PairsTable({
  result,
  variantsName,
}: PartProps): React.JSX.Element {
  const rows = useMemo(
    (): readonly TableRow[] =>
      popDistsRows(result).map((row) => ({
        // The null character is in no name of a file, so it parts the
        // two names of the pair without making two pairs alike.
        id: `${row.first}\u0000${row.second}`,
        cells: [pairCell(row), ...numberCells(row)],
      })),
    [result],
  );
  return (
    <Table
      caption={captionText(result.passStats.numVars, variantsName)}
      columns={COLUMNS}
      rows={rows}
    />
  );
});

/** The pair of a row, "p0 and p2", of `pairNames`, each name kept whole
    on its line and the line broken, when the column is narrow, only after
    "and". */
function pairCell(row: PopDistsRow): React.JSX.Element {
  const [first, second] = pairNames(row);
  return (
    <>
      <span className={classOf(styles, "name")}>{first} and</span>{" "}
      <span className={classOf(styles, "name")}>{second}</span>
    </>
  );
}
