/**
 * The result of the diversity (docs/specs/analyses/diversity.md, "What it
 * shows"): the table of the populations with its caption and its eleven
 * columns, the rarefied ones naming the draw of the result, and the
 * download of the table as CSV with, beside it, the draw the rarefied
 * columns are of, which the headers of the CSV do not name, and the line
 * of the versions. The frame of `AnalysisPanel.tsx` draws the warnings
 * above it, and gives the words of the comparison with the check numbers,
 * drawn under the table.
 */
import {
  diversityCsv,
  diversityRows,
} from "../../../core/analyses/diversity.ts";
import { classOf } from "../../classOf.ts";
import { downloadText } from "../../download.ts";
import { useAppState } from "../../store.tsx";
import { Button } from "../../widgets/Button.tsx";
import { Table } from "../../widgets/Table.tsx";
import type { TableColumn } from "../../widgets/Table.tsx";
import type { ResultsProps } from "../panels.ts";
import { versionsText } from "../words.ts";
import styles from "./DiversityResults.module.css";
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

/** The table of the diversity and its download. */
export function DiversityResults({
  result,
  check,
}: ResultsProps): React.JSX.Element {
  const variantsName = useAppState((s) => s.project.variants?.name ?? null);
  const popneiVersion = useAppState((s) => s.popneiVersion);
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

  return (
    <div className={classOf(styles, "results")}>
      <Table
        caption={captionText(result.passStats.numVars, variantsName)}
        columns={columnsOf(result.numCalledAlleles)}
        rows={rows}
      />
      {check !== null && <p className={classOf(styles, "line")}>{check}</p>}
      <div className={classOf(styles, "download")}>
        <Button label="Download the table as CSV" onPress={download} />
        <p className={classOf(styles, "muted")}>
          {rarefiedText(result.numCalledAlleles)}
        </p>
        <p className={classOf(styles, "muted")}>
          {versionsText(popneiVersion, APP_VERSION)}
        </p>
      </div>
    </div>
  );
}
