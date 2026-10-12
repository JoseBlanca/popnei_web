/**
 * The words of the distances between populations of popgen2.html that
 * the page says whichever tab is shown
 * (docs/specs/steps/popgen2-distances.md, "Its words" and
 * "Accessibility"): what the status region says at their start by
 * themselves, at their Stop and at the end of their run, done or failed;
 * and the words of their errors, which the Distances tab draws and the
 * status region says. Apart from the words of the tab, `tabWords.ts`,
 * since the page loads these with its first screen, for the status
 * region, and the tab's own words come with the tab's code. Pure, so
 * that a test in node checks them.
 */
import { passRefusalText } from "../../../core/analyses/fileRefusals.ts";
import { statisticsFailedWords } from "../../../core/analyses/individualChecks.ts";
import type { Failure } from "../../../core/analyses/individualChecks.ts";
import {
  popDistsOnPopgen2,
  refusalText,
} from "../../../core/analyses/popDists.ts";
import { escaped } from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import type { AnalysisError, AppState } from "../../../core/store.ts";
import type { JobResult } from "../../../worker/protocol.ts";
import { statusOf } from "../status.ts";
import { failedText, failedWordsOf, popgen2FailureText } from "../words.ts";
import type { PanelErrorWords } from "../words.ts";

/** The distances in the middle of a sentence of their errors. */
const DISTANCES_NAME = "the distances between populations";

/** The words the tab gives its errors, as `AnalysisUi` takes them: those
    of the definition of this page, the statistics of each individual
    that failed in the words of the one pass, and the failures that are
    not popnei's refusals in the words of the page. */
export const DISTANCES_TAB_ERRORS: PanelErrorWords = Object.freeze({
  refusalText: (message: string, p: Project): string =>
    refusalText(message, p, "popgen2"),
  statisticsFailedText: (
    error: AnalysisError,
    p: Project,
    failureText: (failure: Failure) => string,
    waited: boolean,
  ): string =>
    statisticsFailedWords(
      error,
      p,
      failureText,
      waited
        ? `${DISTANCES_NAME} were not run`
        : `${DISTANCES_NAME} cannot run`,
      (message, q) =>
        passRefusalText(message, q, {
          cannot: "the statistics of each individual cannot be calculated",
          where: " in the box Variants",
        }),
    ),
  workerFailedText: null,
  failureText: popgen2FailureText,
});

/** What the status region says when the distances start again by
    themselves, alone in their round, with the tab where they are
    stopped and what they lock, the filters and the populations. */
export const DISTANCES_STARTED_BY_ITSELF =
  "Calculating the distances between populations again. To change the filters or the populations, stop them in the Distances tab.";

/** What the status region says when a crash of the worker that ended
    another live state holds the distances, about to start, until the
    next change or their Run (docs/specs/steps/popgen2-pca.md, "A failure
    that ends a live state"). */
export const DISTANCES_HELD_AFTER_CRASH =
  "The distances did not start: they start after the next change of the filters, of their options or of the populations, or when Run is pressed in the Distances tab.";

/** What the status region says at a Stop of the distances, in their tab
    or in the band: "Distances stopped. Press Run in the Distances tab to
    calculate them again." when the tab then offers Run, `runOffered`;
    "Distances stopped." alone when it does not. */
export function distancesStoppedText(runOffered: boolean): string {
  return runOffered
    ? "Distances stopped. Press Run in the Distances tab to calculate them again."
    : "Distances stopped.";
}

/**
 * What the status region says as the store goes from `before` to
 * `after`, when a run of the distances ends, whichever tab is shown:
 * "Distances between the populations of panel.nei calculated."; "The
 * distances between the populations of panel.nei could not be
 * calculated: " and the words of its error, as the tab draws them.
 * `null` for any other change: a run stopped, or left behind by a
 * change, ends with no result and no error, and its Stop is said apart.
 */
export function distancesEndAnnouncement(
  before: AppState<JobResult, unknown>,
  after: AppState<JobResult, unknown>,
): string | null {
  const then = statusOf(before, popDistsOnPopgen2.id);
  const now = statusOf(after, popDistsOnPopgen2.id);
  const variants = after.project.variants;
  if (then.kind !== "running" || variants === null) return null;
  const name = escaped(variants.name);
  switch (now.kind) {
    case "done":
      return `Distances between the populations of ${name} calculated.`;
    case "error":
      return `The distances between the populations of ${name} could not be calculated: ${failedText(
        now.error,
        after.project,
        DISTANCES_NAME,
        failedWordsOf(DISTANCES_TAB_ERRORS, now, after.individualsKept, true),
      )}`;
    case "locked":
    case "ready":
    case "removed":
    case "running":
      return null;
  }
}
