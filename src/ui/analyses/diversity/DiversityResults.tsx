/**
 * The result of the diversity (docs/specs/analyses/diversity.md, "What it
 * shows"): the table of the populations with its caption and its eleven
 * columns, the rarefied ones naming the draw of the result, and the
 * download of the table as CSV with, beside it, the draw the rarefied
 * columns are of, which the headers of the CSV do not name, and the line
 * of the versions; below them, the block of the spectrum of each
 * population, `SpectrumBlock.tsx`. The frame of `AnalysisPanel.tsx` draws the warnings
 * above it, and gives the words of the comparison with the check numbers,
 * drawn under the table.
 *
 * It is given the definition of the diversity the store of its page
 * runs, and takes the page from it (diversity.md, "On popgen2.html"): in
 * the Populations tab of popgen2.html the caption ends with the
 * unclassified individuals kept that the table leaves out, the line of
 * the versions comes before that of the draw, and the old button of the
 * download of the table is left out, since every table of that page has
 * its "Download…" below it (docs/specs/steps/popgen2-populations.md,
 * "The result").
 */
import {
  diversity,
  diversityCsv,
  diversityPageOf,
  diversityRows,
} from "../../../core/analyses/diversity.ts";
import type { AnalysisDef } from "../../../core/store.ts";
import type { Job, JobResult } from "../../../worker/protocol.ts";
import { classOf } from "../../classOf.ts";
import { downloadText } from "../../download.ts";
import { useAppState } from "../../store.tsx";
import { Button } from "../../widgets/Button.tsx";
import { Table } from "../../widgets/Table.tsx";
import type { TableColumn } from "../../widgets/Table.tsx";
import type { ResultsProps } from "../panels.ts";
import { versionsText } from "../words.ts";
import styles from "./DiversityResults.module.css";
import { SpectrumBlock } from "./SpectrumBlock.tsx";
import { unclassifiedCaption, unclassifiedLeftOutOf } from "./tabWords.ts";
import {
  captionText,
  csvName,
  numberHeaders,
  rarefiedText,
  rowCells,
} from "./words.ts";

/** The columns of the table, the rarefied ones naming the draw
    `numCalledAlleles` (the spec, "What it shows"). */
function columnsOf(numCalledAlleles: number): readonly TableColumn[] {
  return [
    { id: "population", label: "Population", isRowHeader: true },
    ...numberHeaders(numCalledAlleles).map((label, i): TableColumn => ({
      id: `number${String(i)}`,
      label,
      isNumeric: true,
    })),
  ];
}

/** What the result of the diversity is drawn with. */
export interface DiversityResultsProps extends ResultsProps {
  /** The definition of the diversity the store of the page runs,
      `diversity` or `diversityOnPopgen2`, whose page the words follow;
      the old page's, `diversity`, when absent, as its panel draws it. */
  readonly analysis?: AnalysisDef<Job, JobResult>;
}

/** The table of the diversity and its download. */
export function DiversityResults({
  result,
  check,
  analysis = diversity,
}: DiversityResultsProps): React.JSX.Element {
  const page = diversityPageOf(analysis);
  const variantsName = useAppState((s) => s.project.variants?.name ?? null);
  const popneiVersion = useAppState((s) => s.popneiVersion);
  // The result is shown under the key of the populations and the
  // individuals kept now, so those left out are those of now.
  const leftOut = useAppState((s) =>
    page === "popgen2"
      ? unclassifiedLeftOutOf(s.project, s.individualsKept)
      : 0,
  );
  if (result.analysis !== "diversity") {
    throw new Error(
      `popnei_web defect: the table of the diversity was given a result of ${result.analysis}.`,
    );
  }
  // A result is shown only under the key of the project's variants file
  // and of the popnei that made it, so both are known.
  if (variantsName === null || popneiVersion === null) {
    throw new Error(
      "popnei_web defect: a result of the diversity is shown with no variants file or no version of popnei.",
    );
  }

  const rows = diversityRows(result).map((row) => ({
    id: row.population,
    cells: rowCells(row),
  }));

  const download = (): void => {
    downloadText(csvName(variantsName), diversityCsv(result), "text/csv");
  };

  const caption = captionText(result.passStats.numVars, variantsName);
  const versions = (
    <p className={classOf(styles, "muted")}>
      {versionsText(popneiVersion, APP_VERSION)}
    </p>
  );
  const rarefied = (
    <p className={classOf(styles, "muted")}>
      {rarefiedText(result.numCalledAlleles)}
    </p>
  );

  return (
    <div className={classOf(styles, "results")}>
      <Table
        caption={
          leftOut > 0 ? `${caption} ${unclassifiedCaption(leftOut)}` : caption
        }
        columns={columnsOf(result.numCalledAlleles)}
        rows={rows}
      />
      {check !== null && <p className={classOf(styles, "line")}>{check}</p>}
      {page === "popgen" ? (
        <div className={classOf(styles, "download")}>
          <Button label="Download the table as CSV" onPress={download} />
          {rarefied}
          {versions}
        </div>
      ) : (
        <div className={classOf(styles, "download")}>
          {versions}
          {rarefied}
        </div>
      )}
      <SpectrumBlock result={result} variantsName={variantsName} page={page} />
    </div>
  );
}
