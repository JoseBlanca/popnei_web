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
 * The measure is in no key, so a change of it keeps this component and
 * its heatmap, which is drawn again with the other measure.
 */
import { useMemo } from "react";

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
import type { PopDistsResult, ShownMeasure } from "../../../worker/protocol.ts";
import { classOf } from "../../classOf.ts";
import { downloadText } from "../../download.ts";
import { useAppState } from "../../store.tsx";
import { Button } from "../../widgets/Button.tsx";
import { Table } from "../../widgets/Table.tsx";
import type { TableColumn } from "../../widgets/Table.tsx";
import type { ResultsProps } from "../panels.ts";
import { versionsText } from "../words.ts";
import { HeatmapPlot } from "./HeatmapPlot.tsx";
import styles from "./PopDistsResults.module.css";
import { captionText, csvName, heatmapTitle, rowCells } from "./words.ts";

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
  const measure = useAppState((s) => popDistsOptions(s.project).measure);
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
          <DistancesHeatmap
            result={result}
            measure={measure}
            variantsName={variantsName}
          />
          <Table
            caption={captionText(result.passStats.numVars, variantsName)}
            columns={COLUMNS}
            rows={popDistsRows(result).map((row) => ({
              // Two names never hold a character that no name of a file
              // holds, the null, so the pair is its own id.
              id: `${row.first}\u0000${row.second}`,
              cells: rowCells(row),
            }))}
          />
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

/** What the heatmap is drawn with. */
interface DistancesHeatmapProps {
  /** The result, of 200 populations or fewer. */
  readonly result: PopDistsResult;
  /** The measure the radio buttons chose. */
  readonly measure: ShownMeasure;
  /** The name of the variants file, which the description names. */
  readonly variantsName: string;
}

/** The heatmap of `measure`, and the line of its order under it, none
    for two populations. */
function DistancesHeatmap({
  result,
  measure,
  variantsName,
}: DistancesHeatmapProps): React.JSX.Element {
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
