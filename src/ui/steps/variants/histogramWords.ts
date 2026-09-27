/**
 * The words of the histograms of the variants on the Variants step
 * (docs/specs/steps/variants.md, "The histograms beside the filters of
 * the variants"; docs/specs/analyses/variantChecks.md, "The panel"): the
 * button of their block and the words of its states, the caption of the
 * three, and, for each histogram, its title, its axes, its legend, the
 * line of its threshold, and its table of bins. Pure, so that a test in
 * node checks them; the step draws them.
 */

import { filterNameInSentence } from "../../../core/analyses/filterCounts.ts";
import type { VariantStatistic } from "../../../core/analyses/variantChecks.ts";
import { counted, escaped, grouped } from "../../../core/project.ts";
import type { Notice } from "../../../core/store.ts";
import type {
  BinState,
  HistogramRow,
  HistogramThreshold,
} from "../../../charts/histogram.ts";
import { tableNumber } from "../../../charts/plot2d.ts";
import { capitalized, undoneOrRedone } from "../../sentences.ts";

/** The words of the button of the block. */
export const CALCULATE_LABEL = "Calculate the histograms of the variants";

/** The histograms in the middle of a sentence, which also names the bar
    of their calculation. */
export const CHECK_NAME = "the histograms of the variants";

/** The sentence that asks for the calculation again after a failure
    (variantChecks.md, "The states", error). */
export const CALCULATE_AGAIN = "Calculate them again.";

/** The labels of the two tabs of each histogram. */
export const PLOT_TAB = "Plot";
export const TABLE_TAB = "Table of the bins";

/** The headers of the columns of a table of bins, but for the count's,
    which each histogram names: the two edges of a bin, and what the
    threshold of the filter does to it. */
export const FROM_COLUMN = "From";
export const TO_COLUMN = "To";
export const STATE_COLUMN = "This filter";

/** The words of the button that downloads the bins of a histogram. */
export const BINS_CSV_LABEL = "Download the bins as CSV";

/** The line above each table of bins. */
export const BINS_LINE =
  "Each bin runs from its lower edge up to its upper edge, not included; the last bin includes its upper edge.";

/** The two rows of the legend under the threshold's. */
const KEPT_LABEL = "Kept by this filter";
const REMOVED_LABEL = "Removed by this filter";

/** The decimals of the mean in the title of a histogram. */
const MEAN_DECIMALS = 4;

/** What one histogram of the variants is shown with. */
export interface VariantHistogramWords {
  /** The statistic, as the result names it. */
  readonly statistic: VariantStatistic;
  /** The start of its title, and the label of its horizontal axis. */
  readonly name: string;
  /** The label of its vertical axis, and of the column of its counts. */
  readonly countLabel: string;
  /** The name of its table of bins. */
  readonly tableName: string;
  /** The filter it stands beside, in the middle of a sentence, or `null`
      for the expected heterozygosity, which stands beside none. */
  readonly filterName: string | null;
}

/** The three histograms of the variants, by statistic (the spec, the
    table of the texts the histogram asks of the screen). */
export const VARIANT_HISTOGRAMS: Readonly<
  Record<VariantStatistic, VariantHistogramWords>
> = Object.freeze({
  maf: {
    statistic: "maf",
    name: "Major allele frequency",
    countLabel: "Variants",
    tableName: "The bins of the major allele frequency",
    filterName: filterNameInSentence("maf"),
  },
  obsHet: {
    statistic: "obsHet",
    name: "Observed heterozygosity",
    countLabel: "Variants",
    tableName: "The bins of the observed heterozygosity",
    filterName: filterNameInSentence("obs_het"),
  },
  unbiasedExpHet: {
    statistic: "unbiasedExpHet",
    name: "Expected heterozygosity (unbiased)",
    countLabel: "Variants",
    tableName: "The bins of the expected heterozygosity (unbiased)",
    filterName: null,
  },
});

/** The title of a histogram, with its mean to four decimals: "Major
    allele frequency, mean 0.7163"; "Major allele frequency, no mean" when
    popnei gives none, NaN. */
export function histogramTitle(name: string, mean: number): string {
  return Number.isNaN(mean)
    ? `${name}, no mean`
    : `${name}, mean ${mean.toFixed(MEAN_DECIMALS)}`;
}

/** The threshold of a filter on its histogram, with the three rows of
    the legend: "Maximum 0.95", "Kept by this filter", "Removed by this
    filter". */
export function histogramThreshold(value: number): HistogramThreshold {
  return {
    value,
    label: `Maximum ${String(value)}`,
    keptLabel: KEPT_LABEL,
    removedLabel: REMOVED_LABEL,
  };
}

/** The line beside a histogram that says its threshold in words:
    "Threshold of the MAF filter: 0.95". */
export function thresholdText(filterName: string, value: number): string {
  return `Threshold of ${filterName}: ${String(value)}`;
}

/** The caption of the three histograms: "Over the 1,200 variants of
    panel.nei, before any filter." */
export function histogramsCaption(numVars: number, fileName: string): string {
  return `Over the ${counted(numVars, "variant")} of ${escaped(fileName)}, before any filter.`;
}

/** The words of what the threshold does to a bin, in the table. */
const BIN_STATE_WORDS: Readonly<Record<BinState, string>> = Object.freeze({
  kept: "Kept",
  partlyKept: "Partly kept",
  removed: "Removed",
});

/** The cells of a row of a table of bins: the two edges to 12
    significant digits, so that 0.07500000000000001 reads 0.075, the count
    with a comma between thousands, and, with a threshold, what it does to
    the bin. */
export function binCells(row: HistogramRow): readonly string[] {
  const edges = [
    String(tableNumber(row.from)),
    String(tableNumber(row.to)),
    grouped(row.count),
  ];
  return row.state === null ? edges : [...edges, BIN_STATE_WORDS[row.state]];
}

/**
 * The words of the histograms removed, from the change of the notice that
 * lists them (variantChecks.md, "The states", results removed): after a
 * command, "The histograms of the variants were removed because a new
 * variants file was loaded. Undo brings them back as they were, with no
 * calculation; Calculate makes them anew for the file loaded now."; after
 * an undo, "Undone: … The histograms of the variants were removed; Redo
 * brings them back …, and Calculate makes them anew for the file loaded
 * now.", and after a redo the same with "Redone:" and Undo.
 */
export function removedText(notice: Notice): string {
  const cause = notice.cause;
  const start = undoneOrRedone(cause);
  const name = capitalized(CHECK_NAME);
  const back = "brings them back as they were, with no calculation";
  const anew = "Calculate makes them anew for the file loaded now";
  if (start === null) {
    return `${name} were removed because ${cause.description}. Undo ${back}; ${anew}.`;
  }
  const action = cause.kind === "undo" ? "Redo" : "Undo";
  return `${start}. ${name} were removed; ${action} ${back}, and ${anew}.`;
}
