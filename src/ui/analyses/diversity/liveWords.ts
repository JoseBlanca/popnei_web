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
  diversityOnPopgen2,
  refusalText,
  statisticsFailedText,
} from "../../../core/analyses/diversity.ts";
import type { Failure } from "../../../core/analyses/individualChecks.ts";
import { escaped } from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import type { AnalysisError, AppState } from "../../../core/store.ts";
import type { JobResult } from "../../../worker/protocol.ts";
import { statusOf } from "../status.ts";
import { failedText, failedWordsOf, popgen2FailureText } from "../words.ts";
import type { PanelErrorWords } from "../words.ts";

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

/** What the status region says when the diversity starts again by
    itself, alone in its round, with the tab where it is stopped. */
export const DIVERSITY_STARTED_BY_ITSELF =
  "Calculating the diversity again. To change the filters, stop it in the Populations tab.";

/** What the status region says at a Stop of the diversity, in its tab or
    in the band, which may leave the tab out of sight: "Diversity
    stopped. Press Run in the Populations tab to calculate it again."
    when the tab then offers Run, `runOffered`; "Diversity stopped."
    alone when it does not, Run disabled by a lock or the result shown
    with no button. */
export function diversityStoppedText(runOffered: boolean): string {
  return runOffered
    ? "Diversity stopped. Press Run in the Populations tab to calculate it again."
    : "Diversity stopped.";
}

/**
 * What the status region says as the store goes from `before` to
 * `after`, when a run of the diversity ends, whichever tab is shown:
 * "Diversity of panel.nei calculated."; "The diversity of panel.nei could
 * not be calculated: " and the words of its error, as the tab draws
 * them. `null` for any other change: a run stopped, or left behind by a
 * change, ends with no result and no error, and its Stop is said apart.
 */
export function diversityEndAnnouncement(
  before: AppState<JobResult, unknown>,
  after: AppState<JobResult, unknown>,
): string | null {
  const then = statusOf(before, diversityOnPopgen2.id);
  const now = statusOf(after, diversityOnPopgen2.id);
  const variants = after.project.variants;
  if (then.kind !== "running" || variants === null) return null;
  const name = escaped(variants.name);
  switch (now.kind) {
    case "done":
      return `Diversity of ${name} calculated.`;
    case "error":
      return `The diversity of ${name} could not be calculated: ${failedText(
        now.error,
        after.project,
        "the diversity",
        failedWordsOf(DIVERSITY_TAB_ERRORS, now, after.individualsKept),
      )}`;
    case "locked":
    case "ready":
    case "removed":
    case "running":
      return null;
  }
}
