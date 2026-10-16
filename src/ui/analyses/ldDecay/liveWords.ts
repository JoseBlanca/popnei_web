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
import { LD_DECAY_NAMES } from "../status.ts";
import { popgen2FailureText } from "../words.ts";
import type { PanelErrorWords } from "../words.ts";

/** The words the tab gives the errors of the LD decay, as `AnalysisUi`
    takes them: those of the definition of this page, its own words of a
    crash, which name the memory, and the other failures in the words of
    the page. */
export const LD_DECAY_TAB_ERRORS: PanelErrorWords = Object.freeze({
  refusalText: (message: string, p: Project, live: boolean): string =>
    refusalText(message, p, "popgen2", live),
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
          where: " in the Variants tab",
        }),
    ),
  workerFailedText: (p: Project): string => crashText(p, "popgen2"),
  failureText: popgen2FailureText,
});

/** How the lines of a live analysis name the LD decay
    (`liveLines.ts`). */
export const LD_DECAY_LINES: LiveLines = Object.freeze({
  named: LD_DECAY_NAMES,
  longName: "the LD decay",
  ofFile: "the LD decay of",
  errors: LD_DECAY_TAB_ERRORS,
});

/** What the status region says when the LD decay starts again by itself,
    alone in its round, with the tab where it is stopped and what it
    locks, the filters and the populations. */
export const LD_DECAY_STARTED_BY_ITSELF = startedByItselfText(LD_DECAY_LINES);

/** What the status region says when a crash of the worker that ended
    another live state holds the LD decay, about to start, until the next
    change or its Run. */
export const LD_DECAY_HELD_AFTER_CRASH = heldAfterCrashText(LD_DECAY_NAMES);

/** What the status region says at a Stop of the LD decay, with Run to
    press when the tab then offers it, `runOffered`. */
export function ldDecayStoppedText(runOffered: boolean): string {
  return stoppedText(LD_DECAY_NAMES, runOffered);
}

/** What the status region says as the store goes from `before` to
    `after`, when a run of the LD decay ends: "LD decay of ld.nei
    calculated."; "The LD decay of ld.nei could not be calculated: " and
    the words of its error; `null` for any other change. */
export function ldDecayEndAnnouncement(
  before: AppState<JobResult, unknown>,
  after: AppState<JobResult, unknown>,
): string | null {
  return endAnnouncement(LD_DECAY_LINES, before, after);
}
