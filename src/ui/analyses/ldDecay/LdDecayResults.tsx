/**
 * The result of the LD decay (docs/specs/analyses/ldDecay.md, "What it
 * shows"), in the order the owner decided on 1 October 2026: the table of
 * the populations, whose half distances are what is read first; under it
 * two tabs, the plot, selected when the result is drawn, with the mean r²
 * of each bin, the fitted curve and the half distance of each population,
 * and under it, past 16 populations, the line that says which it drew;
 * and the table of the bins, the numbers behind the plot, 50 rows for
 * each population, in a frame of limited height; and under the tabs the
 * downloads of the two tables as CSV with the line of the versions beside
 * them. The frame of `AnalysisPanel.tsx` draws the warnings above it, and
 * gives the words of the comparison with the check numbers, drawn under
 * the table of the populations. Which tab is selected is the result's own state, kept
 * while it is drawn. The plot is inside an error boundary of its own, so
 * that a plot that throws takes neither the fields, the tables nor the
 * downloads with it.
 *
 * The rows of the two tables are made once for each result: the frame of
 * the panel is drawn again when a notice comes or goes, and the table of
 * the bins has 50 rows for each population.
 *
 * It is given the definition of the LD decay the store of its page runs,
 * and takes the page from it (ldDecay.md, "On popgen2.html"): in the
 * Populations tab of popgen2.html the caption of the table of the
 * populations ends with the unclassified individuals kept that it leaves
 * out; each table has its "Download…" below it, "Table as CSV", and the
 * plot its own above it, with its images and its data, in the place of
 * the old buttons; and the line of the versions stands under the table of
 * the populations (docs/specs/steps/popgen2-populations.md, "The LD
 * decay", "The result").
 */
import { memo, useMemo, useState } from "react";

import type { LineData } from "../../../charts/line.ts";
import {
  ldDecay,
  ldDecayPageOf,
  ldBinRows,
  ldBinsCsv,
  ldDecayCsv,
  ldDecayOptions,
  ldDecayRows,
  ldPlotOmittedText,
} from "../../../core/analyses/ldDecay.ts";
import { populationsOf } from "../../../core/project.ts";
import type { AnalysisDef } from "../../../core/store.ts";
import type {
  Job,
  JobResult,
  LdDecayResult,
} from "../../../worker/protocol.ts";
import { classOf } from "../../classOf.ts";
import { downloadText } from "../../download.ts";
import { ErrorBoundary } from "../../shell/ErrorBoundary.tsx";
import { PLOT_TAB, TABLE_TAB } from "../../steps/variants/histogramWords.ts";
import { useAppState } from "../../store.tsx";
import { Button } from "../../widgets/Button.tsx";
import { Table } from "../../widgets/Table.tsx";
import type { TableColumn } from "../../widgets/Table.tsx";
import { Tabs } from "../../widgets/Tabs.tsx";
import type { PlotDownload } from "../../widgets/downloadItems.ts";
import {
  unclassifiedCaption,
  unclassifiedLeftOutOf,
} from "../diversity/resultWords.ts";
import type { ResultsProps } from "../panels.ts";
import { versionsText } from "../words.ts";
import styles from "./LdDecayResults.module.css";
import { LinePlot } from "./LinePlot.tsx";
import { ldDecayPlotData } from "./plotData.ts";
import {
  ldDecayPlotDownload,
  LD_BINS_CSV_LABEL,
  LD_BIN_COLUMNS,
  LD_DECAY_COLUMNS,
  LD_DECAY_CSV_LABEL,
  LD_BINS_TABLE_WHAT,
  LD_DECAY_TABLE_WHAT,
  LD_TABS_LABEL,
  PLOT_FRAME_NAME,
  ldBinValues,
  ldBinsTableName,
  ldDecayTableName,
  ldDecayValues,
  binsCaptionText,
  captionText,
  ldBinCells,
  ldBinsCsvName,
  ldDecayCells,
  ldDecayCsvName,
} from "./words.ts";

/** The ids of the two tabs. */
const PLOT_ID = "plot";
const BINS_ID = "bins";
type LdTab = typeof PLOT_ID | typeof BINS_ID;

/** The columns of a table whose headers are `labels`: the first, the
    population, the header of each row, and the others numbers. */
function columnsOf(labels: readonly string[]): readonly TableColumn[] {
  return Object.freeze(
    labels.map((label, index): TableColumn =>
      index === 0
        ? { id: label, label, isRowHeader: true }
        : { id: label, label, isNumeric: true },
    ),
  );
}

/** The columns of the table of the populations (the spec, "What it
    shows"). */
const POPULATION_COLUMNS = columnsOf(LD_DECAY_COLUMNS);

/** The columns of the table of the bins. */
const BIN_COLUMNS = columnsOf(LD_BIN_COLUMNS);

/** What the result of the LD decay is drawn with. */
export interface LdDecayResultsProps extends ResultsProps {
  /** The definition of the LD decay the store of the page runs, `ldDecay`
      or `ldDecayOnPopgen2`, whose page the parts follow. Required, so
      that a page that forgot it does not get the other page's parts. */
  readonly analysis: AnalysisDef<Job, JobResult>;
}

/** The result of the LD decay of popgen.html, as its panel draws it. */
export function LdDecayResultsOfPopgen(props: ResultsProps): React.JSX.Element {
  return <LdDecayResults {...props} analysis={ldDecay} />;
}

/** The table of the populations, the plot and the table of its bins in
    their tabs, and the downloads. */
export function LdDecayResults({
  result,
  check,
  analysis,
}: LdDecayResultsProps): React.JSX.Element {
  const onPage2 = ldDecayPageOf(analysis) === "popgen2";
  // The result is shown under the key of the populations and the
  // individuals kept now, so those left out are those of now.
  const leftOut = useAppState((s) =>
    onPage2 ? unclassifiedLeftOutOf(s.project, s.individualsKept) : 0,
  );
  const variantsName = useAppState((s) => s.project.variants?.name ?? null);
  const popneiVersion = useAppState((s) => s.popneiVersion);
  const maxDist = useAppState((s) => ldDecayOptions(s.project).maxDist);
  const [tab, setTab] = useState<LdTab>(PLOT_ID);
  if (result.analysis !== "ldDecay") {
    throw new Error(
      `popnei_web defect: the plot of the LD decay was given a result of ${result.analysis}.`,
    );
  }
  // A result is shown only under the key of the project's variants file,
  // of the popnei that made it and of the largest distance it was
  // calculated with, so the three are known.
  if (variantsName === null || popneiVersion === null || maxDist === null) {
    throw new Error(
      "popnei_web defect: a result of the LD decay is shown with no variants file, no version of popnei or no largest distance.",
    );
  }

  const versions = (
    <p className={classOf(styles, "muted")}>
      {versionsText(popneiVersion, APP_VERSION)}
    </p>
  );
  return (
    <div className={classOf(styles, "results")}>
      <PopulationsTable
        result={result}
        maxDist={maxDist}
        variantsName={variantsName}
        onPage2={onPage2}
        leftOut={leftOut}
      />
      {check !== null && <p className={classOf(styles, "line")}>{check}</p>}
      {onPage2 && versions}
      <Tabs<LdTab>
        label={LD_TABS_LABEL}
        selected={tab}
        onChange={setTab}
        tabs={[
          {
            id: PLOT_ID,
            label: PLOT_TAB,
            content: (
              <ErrorBoundary level={3} heading={PLOT_FRAME_NAME}>
                <DecayPlot
                  result={result}
                  maxDist={maxDist}
                  variantsName={onPage2 ? variantsName : null}
                />
              </ErrorBoundary>
            ),
          },
          {
            id: BINS_ID,
            label: TABLE_TAB,
            content: (
              <BinsTable
                result={result}
                maxDist={maxDist}
                variantsName={onPage2 ? variantsName : null}
              />
            ),
          },
        ]}
      />
      {!onPage2 && (
        <div className={classOf(styles, "download")}>
          <Button
            label={LD_DECAY_CSV_LABEL}
            onPress={() => {
              downloadText(
                ldDecayCsvName(variantsName),
                ldDecayCsv(result),
                "text/csv",
              );
            }}
          />
          <Button
            label={LD_BINS_CSV_LABEL}
            onPress={() => {
              downloadText(
                ldBinsCsvName(variantsName),
                ldBinsCsv(result),
                "text/csv",
              );
            }}
          />
          {versions}
        </div>
      )}
    </div>
  );
}

/** What a part of the result is drawn with. */
interface PartProps {
  /** The result. */
  readonly result: LdDecayResult;
  /** The largest distance it was calculated with, in base pairs. */
  readonly maxDist: number;
}

/** What the plot and the table of the bins are drawn with beside the
    result. */
interface DownloadedProps extends PartProps {
  /** The name of the variants file, which their files are named after,
      on popgen2.html; `null` on popgen.html, whose parts have no menu. */
  readonly variantsName: string | null;
}

/** The plot, and under it, past 16 populations, the line that says which
    populations it drew and where the others are; on popgen2.html its
    menu "Download…" above it. */
function DecayPlot({
  result,
  maxDist,
  variantsName,
}: DownloadedProps): React.JSX.Element {
  // The same data while the result and the distance are the same, so
  // that the plot is not drawn again on every render (react.md, "Mounting
  // a plot").
  // The populations of the project give each population its colour and
  // its shape: the same frozen value while the metadata file and the
  // column are the same.
  const pops = useAppState((s) => populationsOf(s.project));
  const data = useMemo(
    (): LineData => ldDecayPlotData(result, maxDist, pops),
    [result, maxDist, pops],
  );
  const download = useMemo(
    (): PlotDownload | null =>
      variantsName === null ? null : ldDecayPlotDownload(result, variantsName),
    [result, variantsName],
  );
  const omitted = ldPlotOmittedText(result);
  return (
    <div className={classOf(styles, "plotPart")}>
      <LinePlot data={data} {...(download !== null && { download })} />
      {omitted !== null && <p className={classOf(styles, "line")}>{omitted}</p>}
    </div>
  );
}

/** The table of the bins: a row for each population and bin, the bins of
    a population together, in a frame of limited height that scrolls with
    its headers in view; not drawn again while its result and the largest
    distance are the same, as the table of the populations. */
const BinsTable = memo(function BinsTable({
  result,
  maxDist,
  variantsName,
}: DownloadedProps): React.JSX.Element {
  const numBins = result.smallestDist.length;
  const rows = useMemo(
    () =>
      ldBinRows(result).map((row, index) => ({
        // The null character is in no name of a file, so it parts the
        // name from the place of the bin without making two rows alike.
        id: `${row.population}\u0000${String(index)}`,
        cells: ldBinCells(row),
        values: ldBinValues(row),
      })),
    [result],
  );
  const caption = binsCaptionText(numBins, maxDist);
  return variantsName === null ? (
    <Table caption={caption} columns={BIN_COLUMNS} rows={rows} limitedHeight />
  ) : (
    <Table
      caption={caption}
      columns={BIN_COLUMNS}
      rows={rows}
      limitedHeight
      download={{
        what: LD_BINS_TABLE_WHAT,
        fileName: ldBinsTableName(variantsName),
        waiting: null,
      }}
    />
  );
});

/** The table of the populations, which is not drawn again while its
    result, the largest distance and the name of the variants file are
    the same. */
const PopulationsTable = memo(function PopulationsTable({
  result,
  maxDist,
  variantsName,
  onPage2,
  leftOut,
}: PartProps & {
  /** The name of the variants file, which the caption names. */
  readonly variantsName: string;
  /** Whether it is drawn on popgen2.html, with its "Download…". */
  readonly onPage2: boolean;
  /** The unclassified individuals kept it leaves out, on popgen2.html,
      which its caption then counts. */
  readonly leftOut: number;
}): React.JSX.Element {
  const rows = useMemo(
    () =>
      ldDecayRows(result).map((row) => ({
        id: row.population,
        cells: ldDecayCells(row),
        values: ldDecayValues(row),
      })),
    [result],
  );
  // The maximum the result was calculated with: the options are those of
  // the key the result is shown under.
  const maxAllowedMaf = useAppState(
    (s) => ldDecayOptions(s.project).maxAllowedMaf,
  );
  const caption = captionText(
    result.passStats.numVars,
    variantsName,
    maxDist,
    maxAllowedMaf,
  );
  return onPage2 ? (
    <Table
      caption={
        leftOut > 0 ? `${caption} ${unclassifiedCaption(leftOut)}` : caption
      }
      columns={POPULATION_COLUMNS}
      rows={rows}
      download={{
        what: LD_DECAY_TABLE_WHAT,
        fileName: ldDecayTableName(variantsName),
        waiting: null,
      }}
    />
  ) : (
    <Table caption={caption} columns={POPULATION_COLUMNS} rows={rows} />
  );
});
