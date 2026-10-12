/**
 * The words of the diversity of popgen2.html that the page says
 * whichever tab is shown (docs/specs/steps/popgen2-populations.md, "Its
 * words" and "Accessibility"): what the status region says at its start
 * by itself, at its Stop and at the end of its run, done or failed; and
 * the words of its errors, which the Populations tab draws and the
 * status region says. Apart from the words of the tab, `tabWords.ts`,
 * since the page loads these with its first screen, for the status
 * region, and the tab's own words come with the tab's code. Pure, so
 * that a test in node checks them.
 */
import {
  refusalText,
  statisticsFailedText,
} from "../../../core/analyses/diversity.ts";
import type { Failure } from "../../../core/analyses/individualChecks.ts";
import type { Project } from "../../../core/project.ts";
import type { AnalysisError, AppState } from "../../../core/store.ts";
import type { JobResult } from "../../../worker/protocol.ts";
import {
  endAnnouncement,
  heldAfterCrashText,
  startedByItselfText,
  stoppedText,
} from "../liveLines.ts";
import type { LiveLines } from "../liveLines.ts";
import { DIVERSITY_NAMES } from "../status.ts";
import { popgen2FailureText } from "../words.ts";
import type { PanelErrorWords } from "../words.ts";

/** The words the tab gives its errors, as `AnalysisUi` takes them: those
    of the definition of this page, and the failures that are not
    popnei's refusals in the words of the page. */
export const DIVERSITY_TAB_ERRORS: PanelErrorWords = Object.freeze({
  refusalText: (message: string, p: Project, live: boolean): string =>
    refusalText(message, p, "popgen2", live),
  statisticsFailedText: (
    error: AnalysisError,
    p: Project,
    failureText: (failure: Failure) => string,
    waited: boolean,
  ): string => statisticsFailedText(error, p, failureText, waited, "popgen2"),
  workerFailedText: null,
  failureText: popgen2FailureText,
});

/** How the lines of a live analysis name the diversity
    (`liveLines.ts`). */
export const DIVERSITY_LINES: LiveLines = Object.freeze({
  named: DIVERSITY_NAMES,
  longName: "the diversity",
  ofFile: "the diversity of",
  errors: DIVERSITY_TAB_ERRORS,
});

/** What the status region says when the diversity starts again by
    itself, alone in its round, with the tab where it is stopped and what
    it locks, the filters and the populations. */
export const DIVERSITY_STARTED_BY_ITSELF = startedByItselfText(DIVERSITY_LINES);

/** What the status region says when a crash of the worker that ended
    the PCA's live state holds the diversity, about to start, until the
    next change or its Run (docs/specs/steps/popgen2-pca.md, "A failure
    that ends a live state"). */
export const DIVERSITY_HELD_AFTER_CRASH = heldAfterCrashText(DIVERSITY_NAMES);

/** What the status region says at a Stop of the diversity, with Run to
    press when the tab then offers it, `runOffered`. */
export function diversityStoppedText(runOffered: boolean): string {
  return stoppedText(DIVERSITY_NAMES, runOffered);
}

/** What the status region says as the store goes from `before` to
    `after`, when a run of the diversity ends: "Diversity of panel.nei
    calculated."; "The diversity of panel.nei could not be calculated: "
    and the words of its error; `null` for any other change. */
export function diversityEndAnnouncement(
  before: AppState<JobResult, unknown>,
  after: AppState<JobResult, unknown>,
): string | null {
  return endAnnouncement(DIVERSITY_LINES, before, after);
}
