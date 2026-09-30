/**
 * The words of the panel of the distances between populations that are
 * not core's (docs/specs/analyses/popDists.md, "The panel", "Its words"
 * and "Accessibility"): its two options and the descriptions of their
 * commands, the lines of its ready state, the title of the heatmap, the
 * caption and the cells of its table, the name of its download, and what
 * the status region of the shell says when the radio buttons change the
 * measure, since the heatmap is drawn again without moving the focus
 * (docs/specs/shell.md, "The status region"). Pure, so that a test in
 * node checks them; the panel draws them.
 */
import {
  MEASURE_NAMES,
  POP_DISTS_MAX_SHOWN,
} from "../../../core/analyses/popDists.ts";
import type { AnalysisStatus } from "../../../core/store.ts";
import type { JobResult, ShownMeasure } from "../../../worker/protocol.ts";
import type { PopDistsRow } from "../../../core/analyses/popDists.ts";
import { fourDecimals } from "../../../core/analyses/words.ts";
import { variantsStem } from "../../../core/fileNames.ts";
import {
  counted,
  escaped,
  grouped,
  populationsWithMinimum,
  underMinimumText,
} from "../../../core/project.ts";
import type { PopulationsKept } from "../../../core/project.ts";
import {
  WAITS_FOR_STATISTICS_TEXT,
  emptiedText,
  populationsText,
} from "../words.ts";

/** The label of the field of the minimum of individuals. */
export const MINIMUM_LABEL =
  "Individuals with a called genotype needed in each population, per variant";

/** The label of the radio buttons of the measure the heatmap draws. */
export const MEASURE_LABEL = "Distance in the heatmap";

/** The two radio buttons of the measure, Hudson's Fst first, the
    default. */
export const MEASURE_ITEMS: readonly {
  readonly id: ShownMeasure;
  readonly label: string;
}[] = Object.freeze([
  Object.freeze({ id: "fst", label: MEASURE_NAMES.fst }),
  Object.freeze({ id: "dest", label: MEASURE_NAMES.dest }),
]);

/** The description of a change of the minimum, which ends the notice of
    the result it removes. */
export const MINIMUM_DESCRIPTION =
  "the minimum number of individuals of the distances changed";

/** The description of a change of the measure, which removes nothing,
    and which an Undo names. */
export const MEASURE_DESCRIPTION = "the distance the heatmap draws changed";

/** What the ready state says follows for the populations under the
    minimum, of one and of several. */
const UNDER_MINIMUM = Object.freeze({
  one: "and is left out.",
  many: "and are left out.",
});

/**
 * The lines of the ready state, and of the state of a result removed:
 * the populations a run will take with their sizes, those of `kept` with
 * `minNumIndividuals` individuals or more; the populations under the
 * minimum, which it leaves out, "p3 has 12 individuals, fewer than the
 * minimum of 20, and is left out."; the populations the filters of
 * individuals leave empty; and, when `waitsForStatistics`, the line that
 * says Run calculates the statistics of each individual first, `kept`
 * being then the populations before the thresholds.
 */
export function readyLines(
  kept: PopulationsKept,
  minNumIndividuals: number,
  waitsForStatistics: boolean,
): readonly string[] {
  const { withMinimum, under } = populationsWithMinimum(
    kept.pops,
    minNumIndividuals,
  );
  return [
    ...(withMinimum.length > 0 ? [populationsText(withMinimum)] : []),
    ...(under.length > 0
      ? [underMinimumText(under, minNumIndividuals, UNDER_MINIMUM)]
      : []),
    ...(kept.emptied.length > 0 ? [emptiedText(kept.emptied)] : []),
    ...(waitsForStatistics ? [WAITS_FOR_STATISTICS_TEXT] : []),
  ];
}

/** The title of the heatmap of `measure`, "Hudson's Fst between
    populations". */
export function heatmapTitle(measure: ShownMeasure): string {
  return `${MEASURE_NAMES[measure]} between populations`;
}

/** What the status region says when the radio buttons "Distance in the
    heatmap" are set to `measure`, "Heatmap of Jost's D". */
export function measureAnnounced(measure: ShownMeasure): string {
  return `Heatmap of ${MEASURE_NAMES[measure]}`;
}

/** What the status region says when the radio buttons are set to
    `measure` with the panel in `status`: `measureAnnounced` while a
    result of `POP_DISTS_MAX_SHOWN` populations or fewer is shown, whose
    heatmap is drawn again; nothing in any other state, where no heatmap
    is on the page. */
export function measureAnnouncement(
  status: AnalysisStatus<JobResult>,
  measure: ShownMeasure,
): string | null {
  return status.kind === "done" &&
    status.result.analysis === "popDists" &&
    status.result.pops.length <= POP_DISTS_MAX_SHOWN
    ? measureAnnounced(measure)
    : null;
}

/** The line over the heatmap while its frame is narrower than it. */
export const HEATMAP_SCROLL_TEXT =
  "Scroll the heatmap sideways to see all of it.";

/** The caption of the table: "Distances between the populations of
    panel.nei, over the 1,200 variants the filters kept." */
export function captionText(numVars: number, variantsName: string): string {
  return `Distances between the populations of ${escaped(variantsName)}, over the ${counted(numVars, "variant")} the filters kept.`;
}

/** A distance of the table, to four decimals with the minus sign U+2212
    for a negative one, or "no value" where popnei gave none. */
function distanceText(value: number | null): string {
  return value === null ? "no value" : fourDecimals(value);
}

/** The two names of the pair of a row, escaped as a text shows a name of
    the user's files, which the cell of the pair writes with "and" between
    them. */
export function pairNames(row: PopDistsRow): readonly [string, string] {
  return [escaped(row.first), escaped(row.second)];
}

/** The cells of a row of the table after the pair: its two distances,
    and its variants with a comma between groups of three digits. */
export function numberCells(row: PopDistsRow): readonly string[] {
  return [distanceText(row.fst), distanceText(row.dest), grouped(row.numVars)];
}

/** The cells of a row of the table as text: the pair, "p0 and p2", of
    `pairNames`, then `numberCells`. */
export function rowCells(row: PopDistsRow): readonly string[] {
  const [first, second] = pairNames(row);
  return [`${first} and ${second}`, ...numberCells(row)];
}

/** The name of the download of the table: the stem of the variants
    file, `variantsStem`, then `.popdists.csv`; `panel.nei` gives
    `panel.popdists.csv`. */
export function csvName(variantsName: string): string {
  return `${variantsStem(variantsName)}.popdists.csv`;
}
