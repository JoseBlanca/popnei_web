/**
 * The words of the LD decay of popgen2.html that the page says whichever
 * tab is shown (docs/specs/steps/popgen2-populations.md, "The LD decay",
 * "Its words"): what the status region says at its start by itself, when
 * a crash holds it, at its Stop and at the end of its run, done or
 * failed; and the words of its errors, which the Populations tab draws
 * and the status region says. Apart from the words of the tab,
 * `tabWords.ts`, since the page loads these with its first screen, for
 * the status region. Pure, so that a test in node checks them.
 */
import { crashText, refusalText } from "../../../core/analyses/ldDecay.ts";
import { statisticsFailedWords } from "../../../core/analyses/individualChecks.ts";
import type { Failure } from "../../../core/analyses/individualChecks.ts";
import { passRefusalText } from "../../../core/analyses/fileRefusals.ts";
import { escaped } from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import type { AnalysisError, AppState } from "../../../core/store.ts";
import type { JobResult } from "../../../worker/protocol.ts";
import { statusOf } from "../status.ts";
import { failedText, failedWordsOf, popgen2FailureText } from "../words.ts";
import type { PanelErrorWords } from "../words.ts";

/** The id of the LD decay. */
const LD_DECAY = "ldDecay";

/** The words the tab gives the errors of the LD decay, as `AnalysisUi`
    takes them: those of the definition of this page, its own words of a
    crash, which name the memory, and the other failures in the words of
    the page. */
export const LD_DECAY_TAB_ERRORS: PanelErrorWords = Object.freeze({
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
      waited ? "the LD decay was not run" : "the LD decay cannot run",
      (message, q) =>
        passRefusalText(message, q, {
          cannot: "the statistics of each individual cannot be calculated",
          where: " in the box Variants",
        }),
    ),
  workerFailedText: (p: Project): string => crashText(p, "popgen2"),
  failureText: popgen2FailureText,
});

/** What the status region says when the LD decay starts again by itself,
    alone in its round, with the tab where it is stopped and what it
    locks, the filters and the populations. */
export const LD_DECAY_STARTED_BY_ITSELF =
  "Calculating the LD decay again. To change the filters or the populations, stop it in the Populations tab.";

/** What the status region says when a crash of the worker that ended
    another live state holds the LD decay, about to start, until the next
    change or its Run. */
export const LD_DECAY_HELD_AFTER_CRASH =
  "The LD decay did not start: it starts after the next change of the filters, of its options or of the populations, or when Run is pressed in the Populations tab.";

/** What the status region says at a Stop of the LD decay, in its tab or
    in the band: with Run to press when the tab then offers it,
    `runOffered`, and alone when it does not. */
export function ldDecayStoppedText(runOffered: boolean): string {
  return runOffered
    ? "LD decay stopped. Press Run in the Populations tab to calculate it again."
    : "LD decay stopped.";
}

/**
 * What the status region says as the store goes from `before` to
 * `after`, when a run of the LD decay ends, whichever tab is shown: "LD
 * decay of ld.nei calculated."; "The LD decay of ld.nei could not be
 * calculated: " and the words of its error, as the tab draws them.
 * `null` for any other change: a run stopped, or left behind by a
 * change, ends with no result and no error, and its Stop is said apart.
 */
export function ldDecayEndAnnouncement(
  before: AppState<JobResult, unknown>,
  after: AppState<JobResult, unknown>,
): string | null {
  const then = statusOf(before, LD_DECAY);
  const now = statusOf(after, LD_DECAY);
  const variants = after.project.variants;
  if (then.kind !== "running" || variants === null) return null;
  const name = escaped(variants.name);
  switch (now.kind) {
    case "done":
      return `LD decay of ${name} calculated.`;
    case "error":
      return `The LD decay of ${name} could not be calculated: ${failedText(
        now.error,
        after.project,
        "the LD decay",
        failedWordsOf(LD_DECAY_TAB_ERRORS, now, after.individualsKept),
      )}`;
    case "locked":
    case "ready":
    case "removed":
    case "running":
      return null;
  }
}
