/**
 * The words of the Populations tab of popgen2.html around its options
 * (docs/specs/steps/popgen2-populations.md, "The populations it runs
 * on", "Run and Stop", "The result" and "Its words"): its heading and its
 * name in a sentence; the line of the populations it will run on, read
 * from `popgen2PopulationsKept` of core, the one function every part of
 * the tab that counts the populations reads, so that the line and the
 * table never disagree; the locks of Run by the one pass; the line of a
 * Stop; the words of its errors, in this page's words; the sentence of
 * the caption of the table that counts the unclassified; and the words
 * of a result whose code could not be downloaded. Pure, so that a test
 * in node checks them; `populationsTabPanel` and the result draw them.
 */

import {
  diversityOptions,
  drawOf,
  onePopulationLine,
  refusalText,
  statisticsFailedText,
} from "../../../core/analyses/diversity.ts";
import type { Failure } from "../../../core/analyses/individualChecks.ts";
import type { IndividualsKept } from "../../../core/individualsKept.ts";
import {
  counted,
  escaped,
  namesOf,
  popgen2OnePopulationCause,
  popgen2PopulationsKept,
} from "../../../core/project.ts";
import type { Popgen2PopulationsKept, Project } from "../../../core/project.ts";
import type { AnalysisError } from "../../../core/store.ts";
import { passLockText } from "../pca/passLock.ts";
import type { PassLock } from "../pca/passLock.ts";
import { popgen2FailureText, populationsText } from "../words.ts";
import type { PanelErrorWords } from "../words.ts";
import { minimumAndDrawLines } from "./words.ts";

/** The heading of the tab's analysis, its `<h2>`. */
export const DIVERSITY_TAB_TITLE = "Diversity";

/** The analysis in the middle of a sentence. */
export const DIVERSITY_TAB_NAME = "the diversity";

/** The line after a Stop, until Run or another variants file, in the
    place of the bar. */
export const DIVERSITY_STOPPED_LINE =
  "Stopped: the diversity no longer starts by itself after a change. Run calculates it and starts it again after each change.";

/** The line after a failure that ended the live state, under the
    failure's words, until Run or another variants file, in the place of
    the bar; the user pressed no Stop. */
export const DIVERSITY_FAILURE_ENDED_LINE =
  "The diversity no longer starts by itself after a change, since its calculation failed. Run calculates it and starts it again after each change.";

/** The populations of `p` a run will take with the individuals kept
    `kept`: with their list when it is known, and before the thresholds,
    by the lists to keep and to remove alone, while a threshold waits for
    the statistics of the one pass; `null` when none can be made. */
function populationsOf(
  p: Project,
  kept: IndividualsKept,
): Popgen2PopulationsKept | null {
  return popgen2PopulationsKept(
    p,
    kept.list.kind === "known" ? kept.list.individuals : kept.byLists,
  );
}

/** The number of the unclassified individuals of `p` kept, `kept`, that
    the table leaves out; 0 with none, for the one population, and with
    no individuals kept known. */
export function unclassifiedLeftOutOf(
  p: Project,
  kept: IndividualsKept | null,
): number {
  if (kept === null) return 0;
  return populationsOf(p, kept)?.unclassifiedLeftOut ?? 0;
}

/** The line of the unclassified left out: "7 unclassified individuals
    kept are left out, as the box Individuals says." */
function unclassifiedLine(numLeftOut: number): string {
  return numLeftOut === 1
    ? "1 unclassified individual kept is left out, as the box Individuals says."
    : `${counted(numLeftOut, "unclassified individual")} kept are left out, as the box Individuals says.`;
}

/** The sentence that ends the caption of the table when unclassified
    individuals are left out: "7 unclassified individuals kept are not
    in it." */
export function unclassifiedCaption(numLeftOut: number): string {
  return numLeftOut === 1
    ? "1 unclassified individual kept is not in it."
    : `${counted(numLeftOut, "unclassified individual")} kept are not in it.`;
}

/** The populations the thresholds of the individuals leave empty, which
    a run leaves out, and what to do: "p9 has no individual left after
    the thresholds of the individuals, and is left out. Loosen the
    thresholds of the individuals in the Variants tab to keep it." */
function emptiedLine(emptied: readonly string[]): string {
  const one = emptied.length === 1;
  return `${namesOf(emptied)} ${one ? "has" : "have"} no individual left after the thresholds of the individuals, and ${one ? "is" : "are"} left out. Loosen the thresholds of the individuals in the Variants tab to keep ${one ? "it" : "them"}.`;
}

/**
 * The lines under the options, of what Run will take, in `p` with the
 * individuals kept `kept`: the populations with the individuals kept of
 * each, "3 populations: p0, 48 individuals; …", or the one population,
 * "1 population, Unclassified: 200 individuals. …", with why when the
 * individuals file or its column is the cause; the unclassified left
 * out; the populations under the minimum and those that hold fewer
 * chromosomes than the draw; those the thresholds of the individuals
 * leave empty; and, while a threshold waits for the one pass, that it
 * may take individuals from the populations named, which are then those
 * before the thresholds. None with no individuals kept known, which
 * only a variants file not read or lists popnei would refuse give.
 */
export function diversityTabReadyLines(
  p: Project,
  kept: IndividualsKept | null,
): readonly string[] {
  if (kept === null || p.variants === null) return [];
  const pops = populationsOf(p, kept);
  if (pops === null) return [];
  const onePopulation = popgen2OnePopulationCause(p) !== null;
  const [first] = pops.pops;
  const numCalledAlleles = drawOf(p);
  const read = p.variants.read;
  const draw =
    numCalledAlleles === null || read.kind !== "read"
      ? null
      : { numCalledAlleles, ploidy: read.ploidy };
  return [
    ...(first === undefined
      ? []
      : [
          onePopulation
            ? onePopulationLine(p, first[1].length)
            : populationsText(pops.pops),
        ]),
    ...(pops.unclassifiedLeftOut > 0
      ? [unclassifiedLine(pops.unclassifiedLeftOut)]
      : []),
    ...minimumAndDrawLines(
      pops.pops,
      diversityOptions(p).minNumIndividuals,
      onePopulation,
      draw,
    ),
    ...(pops.emptied.length > 0 ? [emptiedLine(pops.emptied)] : []),
    ...(kept.list.kind === "needsStatistics"
      ? [
          `The thresholds of the individuals may take individuals from them once ${escaped(p.variants.name)} is read to the end.`,
        ]
      : []),
  ];
}

/**
 * The lock of Run that the page adds to the store's, in `p`, from the
 * lock of the one pass, `lock` of `passLock`: "Run once panel.nei is read
 * to the end: …", with the diversity named; `null` while the pass locks
 * nothing.
 */
export function diversityTabLock(
  p: Project,
  lock: PassLock | null,
): string | null {
  return lock === null || p.variants === null
    ? null
    : passLockText(lock, p.variants.name, DIVERSITY_TAB_NAME);
}

/** The words the tab gives its errors, as `AnalysisUi` takes them: those
    of the definition of this page, and the failures that are not
    popnei's refusals in the words of the page. */
export const DIVERSITY_TAB_ERRORS: PanelErrorWords = Object.freeze({
  refusalText: (message: string, p: Project): string =>
    refusalText(message, p, "popgen2"),
  statisticsFailedText: (
    error: AnalysisError,
    p: Project,
    failureText: (failure: Failure) => string,
    waited: boolean,
  ): string => statisticsFailedText(error, p, failureText, waited, "popgen2"),
  workerFailedText: null,
  failureText: popgen2FailureText,
});

/** The words in the place of the result whose code could not be
    downloaded, of the variants file `variantsName`, with "Try again"
    beside them. */
export function diversityTabResultFailed(variantsName: string): string {
  return `The result of the diversity could not be loaded. If the connection works, the site may have been updated since this page was opened: try again, or reload the page, open ${escaped(variantsName)} again and run the diversity again.`;
}
