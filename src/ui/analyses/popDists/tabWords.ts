/**
 * The words of the Distances tab of popgen2.html around its options and
 * its result (docs/specs/steps/popgen2-distances.md, "The populations it
 * runs on", "Run and Stop", "The result" and "Its words"): its name in a
 * sentence; the lines of the populations it will run on, read from
 * `popgen2PopulationsKept` of core, the one function every part of the
 * tab that counts the populations reads, so that the lines and the table
 * never disagree; the lock of Run by the one pass; the line of a Stop
 * and of what the distances wait for; the caption of the unclassified;
 * and the CSV and the names of the downloads of the heatmap and of the
 * table. Its heading is in `tabLoadWords.ts`, which the page loads
 * first. Pure, so that a test in node checks them.
 */
import {
  MEASURE_NAMES,
  popDistsHeatmap,
  popDistsOptions,
  popDistsRows,
} from "../../../core/analyses/popDists.ts";
import { tableCsv } from "../../../core/csv.ts";
import type { IndividualsKept } from "../../../core/individualsKept.ts";
import {
  populationsWithMinimum,
  underMinimumText,
} from "../../../core/populations.ts";
import {
  counted,
  escaped,
  namesOf,
  popgen2OnePopulationCause,
  popgen2PopulationsKept,
  popgen2PopulationsToRun,
} from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import type { PopDistsResult, ShownMeasure } from "../../../worker/protocol.ts";
import type { AboutToStart, LiveState } from "../../autoRuns.ts";
import type { PanelLive } from "../AnalysisPanel.tsx";
import { passLockText } from "../pca/passLock.ts";
import type { PassLock } from "../pca/passLock.ts";
import type { LiveAnalysisName } from "../status.ts";
import { populationsText, runningUntilEnd } from "../words.ts";
import { captionText } from "./words.ts";

/** The analysis in the middle of a sentence of the tab's lock. */
export const DISTANCES_TAB_NAME = "the distances";

/** What the ready state says follows for the populations under the
    minimum, of one and of several. */
const UNDER_MINIMUM = Object.freeze({
  one: "and is left out.",
  many: "and are left out.",
});

/**
 * The lines under the options, of what Run will take, in `p` with the
 * individuals kept `kept`: the populations that have the minimum, with
 * the individuals kept of each; those under it, which are left out; the
 * unclassified individuals kept, left out; the populations the
 * thresholds of the individuals leave empty; and, while a threshold
 * waits for the one pass, that it may take individuals from them, which
 * are then the populations before the thresholds. None for fewer than
 * two populations, the one population among them, which grey the tab, and with no individuals kept known.
 */
export function distancesTabReadyLines(
  p: Project,
  kept: IndividualsKept | null,
): readonly string[] {
  if (kept === null || p.variants === null) return [];
  const toRun = popgen2PopulationsToRun(p);
  if (popgen2OnePopulationCause(p) !== null || (toRun?.length ?? 0) < 2) {
    return [];
  }
  const pops = popgen2PopulationsKept(
    p,
    kept.list.kind === "known" ? kept.list.individuals : kept.byLists,
  );
  if (pops === null) return [];
  const min = popDistsOptions(p).minNumIndividuals;
  const { withMinimum, under } = populationsWithMinimum(pops.pops, min);
  return [
    ...(withMinimum.length > 0 ? [populationsText(withMinimum)] : []),
    ...(under.length > 0 ? [underMinimumText(under, min, UNDER_MINIMUM)] : []),
    ...(pops.unclassifiedLeftOut > 0
      ? [unclassifiedLine(pops.unclassifiedLeftOut)]
      : []),
    ...(pops.emptied.length > 0 ? [emptiedLine(pops.emptied)] : []),
    ...(kept.list.kind === "needsStatistics"
      ? [
          `The thresholds of the individuals may take individuals from them once ${escaped(p.variants.name)} is read to the end.`,
        ]
      : []),
  ];
}

/** The line of the unclassified left out: "7 unclassified individuals
    kept are left out, as the box Individuals says." */
function unclassifiedLine(numLeftOut: number): string {
  return `${unclassifiedCaption(numLeftOut).slice(0, -1)}, as the box Individuals says.`;
}

/** The populations the thresholds of the individuals leave empty, which
    a run leaves out, and what to do. */
function emptiedLine(emptied: readonly string[]): string {
  const one = emptied.length === 1;
  return `${namesOf(emptied)} ${one ? "has" : "have"} no individual left after the thresholds of the individuals, and ${one ? "is" : "are"} left out. Loosen the thresholds of the individuals in the Variants tab to keep ${one ? "it" : "them"}.`;
}

/** The caption of the table of the result `r` of the variants file
    `variantsName`: what it is, over how many variants, then the
    populations with the individuals each was calculated with, as
    docs/functionality.md, section 6, gives them, and, when
    `numLeftOut` unclassified individuals kept are left out, that
    sentence: "Distances between the populations of panel.nei, over the
    1,200 variants the filters kept. 3 populations: p0, 48 individuals;
    p2, 84 individuals; p1, 68 individuals." Once a result is shown, the
    lines of the populations are not, and this is where their
    individuals are read. */
export function distancesCaption(
  r: PopDistsResult,
  variantsName: string,
  numLeftOut: number,
): string {
  const pops = r.pops.map((pop, index) => {
    const numIndividuals = r.numIndividuals[index];
    if (numIndividuals === undefined) {
      throw new Error(
        `popnei_web defect: the result of the distances has no number of individuals for its population ${String(index)}.`,
      );
    }
    return `${escaped(pop)}, ${counted(numIndividuals, "individual")}`;
  });
  const sentences = [
    captionText(r.passStats.numVars, variantsName),
    `${counted(r.pops.length, "population")}, with the number of individuals each was calculated over: ${pops.join("; ")}.`,
    ...(numLeftOut > 0 ? [unclassifiedCaption(numLeftOut)] : []),
  ];
  return sentences.join(" ");
}

/** The sentence the caption of the table ends with when unclassified
    individuals kept, `numLeftOut`, are left out: "7 unclassified
    individuals kept are left out." */
export function unclassifiedCaption(numLeftOut: number): string {
  return numLeftOut === 1
    ? "1 unclassified individual kept is left out."
    : `${counted(numLeftOut, "unclassified individual")} kept are left out.`;
}

/** The number of the unclassified individuals of `p` kept, `kept`, that
    the distances leave out; 0 with none, and with no individuals kept
    known. */
export function unclassifiedLeftOutOf(
  p: Project,
  kept: IndividualsKept | null,
): number {
  if (kept === null) return 0;
  const individuals =
    kept.list.kind === "known" ? kept.list.individuals : kept.byLists;
  return popgen2PopulationsKept(p, individuals)?.unclassifiedLeftOut ?? 0;
}

/** The lock of Run that the page adds to the store's, in `p`, from the
    lock of the one pass, `lock` of `passLock`: "Run once panel.nei is
    read to the end: …", with the distances named; `null` while the pass
    locks nothing. */
export function distancesTabLock(
  p: Project,
  lock: PassLock | null,
): string | null {
  return lock === null || p.variants === null
    ? null
    : passLockText(lock, p.variants.name, DISTANCES_TAB_NAME);
}

/** The line in the place of the bar while a crash of the worker, which
    ended another live state, holds the distances until the next change
    or a Run, which the tab then offers beside Stop recalculating. */
const AFTER_CRASH_LINE =
  "The distances start after the next change of the filters, of their options or of the populations, or when Run is pressed.";

/** The line after a failure that ended the live state, under the
    failure's words; the user pressed no Stop. */
const FAILURE_ENDED_LINE =
  "The distances no longer start by themselves after a change, since their calculation failed. Run calculates them and starts them again after each change.";

/** The line after a Stop, until Run or another variants file, in the
    place of the bar; with the result shown, `resultShown`, which offers
    no Run until a change takes it away, "… After the next change, Run
    calculates them …". */
export function distancesStoppedLine(resultShown: boolean): string {
  const stopped =
    "Stopped: the distances no longer start by themselves after a change.";
  return resultShown
    ? `${stopped} After the next change, Run calculates them and starts them again after each change.`
    : `${stopped} Run calculates them and starts them again after each change.`;
}

/**
 * The line in the place of the bar while the distances are live, do not
 * run, and are about to start, waiting for `waits`, with `before` the
 * live analysis the line names, "the PCA", "the diversity", `null` for
 * none: "behind", the analysis that runs; "changes", the quiet second,
 * with one about to start before them or none; "download", the dialog
 * of the download or its write; "afterCrash", until the next change or
 * Run.
 */
export function distancesWaitingLine(
  waits: AboutToStart,
  before: LiveAnalysisName | null,
): string {
  const inAMoment =
    "The distances start in a moment, later if the filters, their options or the populations change.";
  switch (waits) {
    case "behind":
      return before === null
        ? inAMoment
        : `The distances start once ${runningUntilEnd(before)}.`;
    case "changes":
      return before === null
        ? inAMoment
        : `The distances start after ${before.name}, once the filters, the options and the populations stop changing.`;
    case "download":
      return "The distances start again when the download is written or closed.";
    case "afterCrash":
      return AFTER_CRASH_LINE;
  }
}

/** The live state `state` of the distances as their panel draws it, with
    `before`, the live analysis its line of waiting names, or `null`, and
    whether their result is shown, `resultShown`. */
export function distancesPanelLive(
  state: LiveState,
  before: LiveAnalysisName | null,
  resultShown: boolean,
): PanelLive {
  switch (state.kind) {
    case "off":
      return { kind: "off" };
    case "stopped":
      return { kind: "stopped", line: distancesStoppedLine(resultShown) };
    case "endedByFailure":
      return { kind: "stopped", line: FAILURE_ENDED_LINE };
    case "live":
      return {
        kind: "live",
        aboutToStartLine:
          state.aboutToStart === null
            ? null
            : distancesWaitingLine(state.aboutToStart, before),
        runBeside: state.aboutToStart === "afterCrash",
      };
  }
}

/** The line under the heatmap while its cells are too small to hold
    their values, as on a page of 320 pixels with four populations: where
    the values are, and, when the heatmap has a negative distance,
    `negative`, that its colour is that of 0, which its cell does not
    write (docs/specs/steps/popgen2-distances.md, "The result"). */
export function heatmapValuesLine(negative: boolean): string {
  const where =
    "The cells are too small to hold their values; the table of the distances, after the heatmap, gives them.";
  return negative ? `${where} A negative distance has the colour of 0.` : where;
}

/** What the "Download…" of the table downloads, for a screen reader. */
export const DISTANCES_TABLE_WHAT = "the table of the distances";

/** What the "Download…" of the heatmap of `measure` downloads, for a
    screen reader: "the heatmap of Hudson's Fst". */
export function heatmapWhat(measure: ShownMeasure): string {
  return `the heatmap of ${MEASURE_NAMES[measure]}`;
}

/** The measures as the names of the files of the heatmap name them, as
    the header of the old page's CSV does. */
const MEASURE_FILES: Readonly<Record<ShownMeasure, string>> = Object.freeze({
  fst: "fst_hudson",
  dest: "jost_d",
});

/** What the files of the heatmap of `measure` are after the stem:
    "popdists.fst_hudson", for "panel.popdists.fst_hudson.svg". */
export function heatmapFiles(measure: ShownMeasure): string {
  return `popdists.${MEASURE_FILES[measure]}`;
}

/** What the file of the table is after the stem: "popdists". */
export const TABLE_FILE = "popdists";

/**
 * The data of the heatmap of `measure` as a CSV: the square matrix in
 * the order of the heatmap, a header "Population" and the populations,
 * a row of each population with its distance to each, as popnei gave
 * it, an empty field on the diagonal and for no value.
 */
export function matrixCsv(r: PopDistsResult, measure: ShownMeasure): string {
  const heatmap = popDistsHeatmap(r, measure);
  const size = heatmap.names.length;
  return tableCsv(
    ["Population", ...heatmap.names],
    heatmap.names.map((name, row) => [
      name,
      ...Array.from(heatmap.values.subarray(row * size, (row + 1) * size)),
    ]),
  );
}

/** The table as a CSV: a pair per row, its two populations in two
    fields, its two distances and its variants, as stored. */
export function pairsCsv(r: PopDistsResult): string {
  return tableCsv(
    [
      "First population",
      "Second population",
      MEASURE_NAMES.fst,
      MEASURE_NAMES.dest,
      "Variants",
    ],
    popDistsRows(r).map((row) => [
      row.first,
      row.second,
      row.fst,
      row.dest,
      row.numVars,
    ]),
  );
}
