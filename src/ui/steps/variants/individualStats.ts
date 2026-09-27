/**
 * The words, the cells and the order of the block "Statistics of each
 * individual" of the Variants step (docs/specs/analyses/individualChecks.md,
 * "The panel"; docs/specs/steps/variants.md, "The statistics of each
 * individual"): the button and the words of its states, the caption, the
 * two histograms, the table of the individuals with its column Kept, its
 * order when a column is sorted, and the names of the CSV files. Pure, so
 * that a test in node checks them; the step draws them.
 */

import type {
  IndividualRow,
  IndividualStatistic,
} from "../../../core/analyses/individualChecks.ts";
import { variantsStem } from "../../../core/fileNames.ts";
import type { IndividualsKept } from "../../../core/individualsKept.ts";
import { counted, escaped } from "../../../core/project.ts";
import type { Notice } from "../../../core/store.ts";
import type { IndividualFilter } from "../../../worker/protocol.ts";
import { capitalized, undoneOrRedone } from "../../sentences.ts";
import type { TableSort } from "../../widgets/tableSort.ts";

/** The decimals of the two numbers of the table of the individuals
    (variants.md, "The statistics of each individual"). */
const STATS_DECIMALS = 4;

/** A number of the table of the individuals, to four decimals with a
    point, or "no value" where popnei gave NaN. */
function statText(value: number | null): string {
  return value === null ? "no value" : value.toFixed(STATS_DECIMALS);
}

/** The words of the button of the block. */
export const STATS_CALCULATE_LABEL =
  "Calculate the statistics of each individual";

/** The statistics in the middle of a sentence, which also names the bar
    of their calculation. */
export const STATS_NAME = "the statistics of each individual";

/** The sentence that asks for the calculation again after a failure
    (individualChecks.md, "Its words"). */
export const STATS_AGAIN = "Calculate them again.";

/** The name of the table for a screen reader, the heading of its block
    (individualChecks.md, "What it shows"). */
export const STATS_TABLE_NAME = "Statistics of each individual";

/** The line above the table while the lists of individuals are refused,
    in place of the column Kept. */
export const KEPT_NOT_KNOWN_LINE =
  "Which individuals are kept is shown once the lists of individuals to keep and to remove are corrected.";

/** The line before the table: how many rows it holds, since its box
    shows about a dozen of them, "200 individuals; the CSV holds them
    all."; whether the box scrolls is left out, since it depends on the
    height of the window (variants.md, "The table of the individuals"). */
export function tableRowsText(numIndividuals: number): string {
  return `${counted(numIndividuals, "individual")}; the CSV holds them all.`;
}

/** The words of the button that downloads the table. */
export const STATS_CSV_LABEL = "Download the table as CSV";

/** The ids of the columns of the table. */
export type IndividualColumnId =
  "individual" | "missingGenotypes" | "observedHeterozygosity" | "kept";

/** A column of the table: its id and its header. */
export interface IndividualColumn {
  /** Its id. */
  readonly id: IndividualColumnId;
  /** The words of its header. */
  readonly label: string;
}

/** The columns of the table, with Kept last; the table leaves Kept out
    while no filter of individuals is set or the lists are refused. */
export const INDIVIDUAL_COLUMNS: readonly IndividualColumn[] = Object.freeze([
  { id: "individual", label: "Individual" },
  { id: "missingGenotypes", label: "Proportion of missing genotypes" },
  { id: "observedHeterozygosity", label: "Observed heterozygosity" },
  { id: "kept", label: "Kept" },
]);

/** What the table shows of the individuals kept: no column, while no
    filter of individuals is set; the line that they are not known,
    while the lists are refused; or whether each is kept. */
export type KeptColumn =
  | { readonly kind: "none" }
  | { readonly kind: "notKnown" }
  | {
      readonly kind: "shown";
      readonly isKept: (individual: string) => boolean;
    };

/**
 * The column Kept of the table, from the number of filters of individuals
 * of the project and the individuals kept the store gives: none while no
 * filter is set; not known while the store gives `null`, a list that
 * names an individual twice or one not in the file; otherwise whether
 * each individual is in the list kept, every one when the filters remove
 * none. The statistics are shown only under the key of the project, so
 * a list that waits for them is a defect.
 */
export function keptColumn(
  numIndividualFilters: number,
  kept: IndividualsKept | null,
): KeptColumn {
  if (numIndividualFilters === 0) return { kind: "none" };
  if (kept === null) return { kind: "notKnown" };
  const list = kept.list;
  switch (list.kind) {
    case "needsStatistics":
      throw new Error(
        "popnei_web defect: the individuals kept wait for the statistics of each individual that are shown.",
      );
    case "known": {
      const individuals = list.individuals;
      if (individuals === null) return { kind: "shown", isKept: () => true };
      const names = new Set(individuals);
      return { kind: "shown", isKept: (individual) => names.has(individual) };
    }
  }
}

/** The words of the column Kept. */
const KEPT_WORDS = { kept: "kept", removed: "removed" } as const;

/**
 * The cells of a row of the table: the individual as a text shows a name
 * of the user's files, its two numbers to four decimals, "no value" for
 * none, and, when `kept` is not `null`, "kept" or "removed".
 */
export function individualCells(
  row: IndividualRow,
  kept: boolean | null,
): readonly string[] {
  const cells = [
    escaped(row.individual),
    statText(row.missingGenotypes),
    statText(row.observedHeterozygosity),
  ];
  if (kept === null) return cells;
  return [...cells, kept ? KEPT_WORDS.kept : KEPT_WORDS.removed];
}

/** The names compared as the browser orders text in English, for the
    screen alone (typescript.md, "The rules of the code"). */
const NAME_ORDER = new Intl.Collator("en-US");

/**
 * The rows in the order of `sort`, in a new array, or `rows` itself for
 * no sort, the order of the variants file. Rows equal in the column keep
 * the order of the file, in both directions. An individual with no
 * heterozygosity comes after every number, in both directions; Kept puts
 * the individuals kept first going up and the removed first going down.
 * `isKept` is that of the column Kept; a sort by Kept with no column is
 * a defect.
 */
export function sortedRows(
  rows: readonly IndividualRow[],
  sort: TableSort<IndividualColumnId> | null,
  isKept: ((individual: string) => boolean) | null,
): readonly IndividualRow[] {
  if (sort === null) return rows;
  const sign = sort.direction === "ascending" ? 1 : -1;
  switch (sort.column) {
    case "individual":
      return rows.toSorted(
        (a, b) => sign * NAME_ORDER.compare(a.individual, b.individual),
      );
    case "missingGenotypes":
      return rows.toSorted(
        (a, b) => sign * (a.missingGenotypes - b.missingGenotypes),
      );
    case "observedHeterozygosity":
      return rows.toSorted((a, b) => {
        const x = a.observedHeterozygosity;
        const y = b.observedHeterozygosity;
        // No value after every number, whichever the direction.
        if (x === null || y === null) {
          return (x === null ? 1 : 0) - (y === null ? 1 : 0);
        }
        return sign * (x - y);
      });
    case "kept": {
      if (isKept === null) {
        throw new Error(
          "popnei_web defect: the table was sorted by Kept with no column Kept.",
        );
      }
      // The individuals kept first going up.
      const rank = (row: IndividualRow): number =>
        isKept(row.individual) ? 0 : 1;
      return rows.toSorted((a, b) => sign * (rank(a) - rank(b)));
    }
  }
}

/** The caption of the table and the histograms: "The statistics of the
    200 individuals of panel.nei, over the 1,152 variants the filters
    kept." */
export function statsCaption(
  numIndividuals: number,
  variantsName: string,
  numVars: number,
): string {
  const variants =
    numVars === 1
      ? "the one variant the filters kept"
      : `the ${counted(numVars, "variant")} the filters kept`;
  const individuals =
    numIndividuals === 1
      ? "the one individual"
      : `the ${counted(numIndividuals, "individual")}`;
  return `The statistics of ${individuals} of ${escaped(variantsName)}, over ${variants}.`;
}

/**
 * The words of the statistics removed, from the change of the notice that
 * lists them (individualChecks.md, "Its words"): after a command, "The
 * statistics of each individual were removed because the MAF filter
 * changed. Undo brings back the table and the histograms as they were,
 * without calculating again; Calculate makes new ones for the new
 * settings."; after an undo, "Undone: the MAF filter changed. The
 * statistics of each individual were removed; Redo brings back …, and
 * Calculate makes new ones for the settings as they are now.", and after
 * a redo the same with "Redone:" and Undo.
 */
export function statsRemovedText(notice: Notice): string {
  const cause = notice.cause;
  const start = undoneOrRedone(cause);
  const name = capitalized(STATS_NAME);
  const back =
    "brings back the table and the histograms as they were, without calculating again";
  if (start === null) {
    return `${name} were removed because ${cause.description}. Undo ${back}; Calculate makes new ones for the new settings.`;
  }
  const action = cause.kind === "undo" ? "Redo" : "Undo";
  return `${start}. ${name} were removed; ${action} ${back}, and Calculate makes new ones for the settings as they are now.`;
}

/** What one histogram of the individuals is shown with. */
export interface IndividualHistogramWords {
  /** Its title, which names its group, its tabs and its button. */
  readonly title: string;
  /** The label of its horizontal axis. */
  readonly xLabel: string;
  /** The name of its table of bins. */
  readonly tableName: string;
  /** The part of the name of its CSV between the stem and `_bins.csv`. */
  readonly filePart: string;
}

/** The label of the vertical axis of both, and of the column of the
    counts of their tables. */
export const INDIVIDUALS_LABEL = "Individuals";

/** The two histograms of the individuals, by statistic
    (individualChecks.md, "What it shows"). */
export const INDIVIDUAL_HISTOGRAMS: Readonly<
  Record<IndividualStatistic, IndividualHistogramWords>
> = Object.freeze({
  missingGenotypes: {
    title: "Proportion of missing genotypes of each individual",
    xLabel: "Proportion of missing genotypes",
    tableName:
      "The bins of the proportion of missing genotypes of each individual",
    filePart: "individual_missing_rate",
  },
  observedHeterozygosity: {
    title: "Observed heterozygosity of each individual",
    xLabel: "Observed heterozygosity",
    tableName: "The bins of the observed heterozygosity of each individual",
    filePart: "individual_obs_het",
  },
});

/** The name of the CSV of the bins of a histogram of the individuals:
    `panel.individual_missing_rate_bins.csv` from `panel.nei`. */
export function individualBinsCsvName(
  variantsName: string,
  statistic: IndividualStatistic,
): string {
  return `${variantsStem(variantsName)}.${INDIVIDUAL_HISTOGRAMS[statistic].filePart}_bins.csv`;
}

/** The name of the CSV of the table: `panel.individual_stats.csv` from
    `panel.nei`. */
export function statsCsvName(variantsName: string): string {
  return `${variantsStem(variantsName)}.individual_stats.csv`;
}

/** The threshold of the filter of individuals on `statistic` among
    `filters`, which its histogram marks, or `null` while that filter is
    off. */
export function individualThreshold(
  filters: readonly IndividualFilter[],
  statistic: IndividualStatistic,
): number | null {
  for (const filter of filters) {
    if (filter.kind === "missing_data" && statistic === "missingGenotypes") {
      return filter.maxAllowedMissingRate;
    }
    if (filter.kind === "obs_het" && statistic === "observedHeterozygosity") {
      return filter.maxAllowedObsHet;
    }
  }
  return null;
}

/** The line under the histogram of the heterozygosity for the
    individuals in no bin: "3 individuals with no called genotype are not
    in the histogram."; `null` for none. */
export function noHeterozygosityText(numNaN: number): string | null {
  if (numNaN === 0) return null;
  return numNaN === 1
    ? "1 individual with no called genotype is not in the histogram."
    : `${counted(numNaN, "individual")} with no called genotype are not in the histogram.`;
}
