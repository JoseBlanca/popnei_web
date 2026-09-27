/**
 * The result of the diversity (docs/specs/analyses/diversity.md, "What it
 * shows"): the table of the populations with its caption, the line of the
 * options it was calculated with, and the download of the table as CSV
 * with the line of the versions beside it. The frame of
 * `AnalysisPanel.tsx` draws the warnings above it, and gives the words of
 * the comparison with the check numbers, drawn under the table.
 */
import {
  DIVERSITY_DEFAULTS,
  diversityCsv,
  diversityRows,
} from "../../../core/analyses/diversity.ts";
import { analysisOptions } from "../../../core/project.ts";
import type { JsonObject } from "../../../core/keys.ts";
import { classOf } from "../../classOf.ts";
import { downloadText } from "../../download.ts";
import { useAppState } from "../../store.tsx";
import { Button } from "../../widgets/Button.tsx";
import { Table } from "../../widgets/Table.tsx";
import type { TableColumn } from "../../widgets/Table.tsx";
import type { ResultsProps } from "../panels.ts";
import { versionsText } from "../words.ts";
import styles from "./DiversityResults.module.css";
import { captionText, csvName, optionsText, rowCells } from "./words.ts";

/** The columns of the table (the spec, "What it shows"). */
const COLUMNS: readonly TableColumn[] = Object.freeze([
  { id: "population", label: "Population", isRowHeader: true },
  { id: "individuals", label: "Individuals", isNumeric: true },
  {
    id: "expected",
    label: "Expected heterozygosity (unbiased)",
    isNumeric: true,
  },
  { id: "observed", label: "Observed heterozygosity", isNumeric: true },
  {
    id: "polymorphic",
    label: "Proportion of polymorphic variants",
    isNumeric: true,
  },
]);

/** The table of the diversity, its options and its download. */
export function DiversityResults({
  result,
  check,
}: ResultsProps): React.JSX.Element {
  const variantsName = useAppState((s) => s.project.variants?.name ?? null);
  const popneiVersion = useAppState((s) => s.popneiVersion);
  const options = useAppState((s) =>
    analysisOptions(s.project, "diversity", DIVERSITY_DEFAULTS),
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

  return (
    <div className={classOf(styles, "results")}>
      <Table
        caption={captionText(result.passStats.numVars, variantsName)}
        columns={COLUMNS}
        rows={rows}
      />
      {check !== null && <p className={classOf(styles, "line")}>{check}</p>}
      <p className={classOf(styles, "muted")}>
        {optionsText(
          numberOf(options, "minNumIndividuals"),
          numberOf(options, "polyThreshold"),
        )}
      </p>
      <div className={classOf(styles, "download")}>
        <Button label="Download the table as CSV" onPress={download} />
        <p className={classOf(styles, "muted")}>
          {versionsText(popneiVersion, APP_VERSION)}
        </p>
      </div>
    </div>
  );
}

/** The number `field` of the options of the diversity, which
    `parseOptions` checked when they came from a project file; a defect
    otherwise. */
function numberOf(options: JsonObject, field: string): number {
  const value = options[field];
  if (typeof value !== "number") {
    throw new Error(
      `popnei_web defect: the option ${field} of the diversity is not a number.`,
    );
  }
  return value;
}
