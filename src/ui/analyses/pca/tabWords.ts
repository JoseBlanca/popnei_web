/**
 * The words of the PCA tab of popgen2.html around its options
 * (docs/specs/steps/popgen2-pca.md, "The PCA tab", "Run and Stop" and
 * "Its words"): its heading and its name in a sentence, by the method;
 * the line of the individuals it will run on; the lock of Run, the PCA's
 * limit of the file before the one pass and the one pass before the
 * store's other reasons; the words of its errors, in this page's words;
 * and what the status region says when a run ends, whichever tab is
 * shown. Pure, so that a test in node checks them; `pcaTabPanel` and the
 * page's announcements draw and say them.
 */

import {
  PCA_MAX_INDIVIDUALS,
  crashText,
  pcaOnPopgen2,
  pcaOptions,
  refusalText,
  statisticsFailedText,
} from "../../../core/analyses/pca.ts";
import type { Failure } from "../../../core/analyses/individualChecks.ts";
import type { IndividualsKept } from "../../../core/individualsKept.ts";
import { escaped } from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import type {
  AnalysisError,
  AnalysisStatus,
  AppState,
} from "../../../core/store.ts";
import type { JobResult, PcaMethod } from "../../../worker/protocol.ts";
import type { AboutToStart } from "../../autoRuns.ts";
import { statusOf } from "../status.ts";
import {
  WAITS_FOR_STATISTICS_TEXT,
  failedText,
  failedWordsOf,
  popgen2FailureText,
} from "../words.ts";
import type { PanelErrorWords } from "../words.ts";
import { passLockText } from "./passLock.ts";
import type { PassLock } from "./passLock.ts";
import { individualsRunOn, methodName, readyLines } from "./words.ts";

/** The heading of the tab, its `<h2>`: "PCA" or "PCoA". */
export function pcaTabTitle(method: PcaMethod): string {
  return methodName(method);
}

/** The analysis in the middle of a sentence, which names the bar of a
    run under way: "the PCA", "the PCoA". */
export function pcaTabName(method: PcaMethod): string {
  return `the ${methodName(method)}`;
}

/**
 * The line of the individuals the PCA will run on, "200 individuals of
 * panel.nei", or "111 of the 200 individuals of panel.nei, those the
 * filters of individuals keep", as on the old panel; without the old
 * panel's line that Run calculates the statistics of each individual
 * first, since on this page the one pass calculates them and Run waits
 * for its end. None without a variants file read or individuals kept.
 */
export function pcaTabReadyLines(
  p: Project,
  kept: IndividualsKept | null,
): readonly string[] {
  return readyLines(p, kept).filter(
    (line) => line !== WAITS_FOR_STATISTICS_TEXT,
  );
}

/**
 * The lock of Run that the page adds to the store's, in `p`, from the
 * lock of the one pass, `lock` of `passLock`: its words, "Run once
 * panel.nei is read to the end: …"; `null` while the pass locks nothing,
 * and for a PCA of the genotypes of a file of more individuals than its
 * limit, which the store says first, since the opening already tells
 * it and no reading of the file would free Run
 * (docs/specs/steps/popgen2-pca.md, "Run and Stop", the first of the
 * locks).
 */
export function pcaTabLock(p: Project, lock: PassLock | null): string | null {
  const variants = p.variants;
  if (lock === null || variants === null) return null;
  const method = pcaOptions(p, "popgen2").method;
  if (
    method === "pca" &&
    variants.read.kind === "read" &&
    variants.read.individuals.length > PCA_MAX_INDIVIDUALS
  ) {
    return null;
  }
  return passLockText(lock, variants.name, pcaTabName(method));
}

/** The words the PCA tab gives its errors, as `AnalysisUi` takes
    them. */
export const PCA_TAB_ERRORS: PanelErrorWords = Object.freeze({
  refusalText: (message: string, p: Project): string =>
    refusalText(message, p, "popgen2"),
  statisticsFailedText: (
    error: AnalysisError,
    p: Project,
    failureText: (failure: Failure) => string,
    waited: boolean,
  ): string => statisticsFailedText(error, p, failureText, waited, "popgen2"),
  workerFailedText: (p: Project, kept: IndividualsKept | null): string =>
    crashText(p, individualsRunOn(p, kept), "popgen2"),
  failureText: popgen2FailureText,
});

/**
 * What the PCA tab says of the error `status` in `p`, with the
 * individuals kept `kept`: the words the tab draws, from the same words
 * of its panel, those of the statistics of each individual when a Run
 * waited for them, `ofStatistics`.
 */
export function pcaTabErrorText(
  status: Extract<AnalysisStatus<JobResult>, { readonly kind: "error" }>,
  p: Project,
  kept: IndividualsKept | null,
): string {
  const method = pcaOptions(p, "popgen2").method;
  return failedText(
    status.error,
    p,
    pcaTabName(method),
    failedWordsOf(PCA_TAB_ERRORS, status, kept),
  );
}

/**
 * What the status region says as the store goes from `before` to
 * `after`, when a run of the PCA ends, whichever tab is shown, since the
 * user may have turned to another (docs/specs/steps/popgen2-pca.md,
 * "Accessibility"): "PCA of panel.nei calculated.", "PCoA of panel.nei
 * calculated."; "The PCA of panel.nei could not be calculated: " and the
 * words of its error. `null` for any other change: a run stopped, or one
 * left behind by another variants file or by a change of a filter, ends
 * with no result and no error.
 */
export function pcaEndAnnouncement(
  before: AppState<JobResult, unknown>,
  after: AppState<JobResult, unknown>,
): string | null {
  const then = statusOf(before, pcaOnPopgen2.id);
  const now = statusOf(after, pcaOnPopgen2.id);
  const variants = after.project.variants;
  if (then.kind !== "running" || variants === null) return null;
  const method = methodName(pcaOptions(after.project, "popgen2").method);
  const name = escaped(variants.name);
  switch (now.kind) {
    case "done":
      return `${method} of ${name} calculated.`;
    case "error":
      return `The ${method} of ${name} could not be calculated: ${pcaTabErrorText(now, after.project, after.individualsKept)}`;
    case "locked":
    case "ready":
    case "removed":
    case "running":
      return null;
  }
}

/** The line in the place of the result while its code downloads
    (docs/specs/steps/popgen2-pca.md, "The result", its code). */
export const LOADING_RESULT = "Loading the result…";

/** The words in the place of the result whose code could not be
    downloaded, of the variants file `variantsName`, with "Try again"
    beside them: "The result of the PCA could not be loaded. …"
    (docs/specs/steps/popgen2-pca.md, "Its words"). */
export function pcaTabResultFailed(
  method: PcaMethod,
  variantsName: string,
): string {
  const name = methodName(method);
  return `The result of the ${name} could not be loaded. Press Try again. If it fails again, the site may have been updated since this page was opened: reload the page, open ${escaped(variantsName)} again and run the ${name} again; what the page has calculated is lost.`;
}

/** The line in the place of the bar while the PCA is about to start by
    itself, waiting for `waits` (docs/specs/steps/popgen2-pca.md, "About
    to start"): "The PCA starts in a moment, later if the filters or its
    options change.", true also in the quiet second after a Stop of the
    diversity it waited for, when nothing changed; while the dialog of the download of the
    filtered variants holds it, "download", "The PCA starts again when
    the download is written or closed."; after a crash ended another
    live state, "afterCrash", "The PCA starts again after the next
    change of the filters or of its options."; while another live
    analysis runs, "behind", that one named by `before`, "the diversity":
    "The PCA starts once the diversity, which is running, ends.", or the
    line of the quiet second when none is named; "The PCoA …" under the
    PCoA. */
export function aboutToStartLine(
  method: PcaMethod,
  waits: AboutToStart,
  before: string | null = null,
): string {
  const name = methodName(method);
  switch (waits) {
    case "download":
      return `The ${name} starts again when the download is written or closed.`;
    case "afterCrash":
      return `The ${name} starts again after the next change of the filters or of its options.`;
    case "behind":
      if (before !== null) {
        return `The ${name} starts once ${before}, which is running, ends.`;
      }
      return `The ${name} starts in a moment, later if the filters or its options change.`;
    // No live analysis comes before the PCA in the order of the tabs, so
    // none is named while the quiet second runs.
    case "changes":
      return `The ${name} starts in a moment, later if the filters or its options change.`;
  }
}

/** What the status region says when the PCA starts again by itself,
    with the tab where it is stopped: "Calculating the PCA again. To
    change the filters, stop it in the PCA tab."; "the PCoA" under the
    PCoA. */
export function pcaStartedByItselfText(method: PcaMethod): string {
  return `Calculating the ${methodName(method)} again. To change the filters, stop it in the PCA tab.`;
}

/** What the status region says at a Stop of the PCA, in its tab or in
    the band, which leaves the tab out of sight: "PCA stopped. Press Run
    in the PCA tab to calculate it again." when the tab then offers Run,
    `runOffered`; "PCA stopped." alone when it does not, Run disabled by
    a lock, whose reason takes the focus in the tab, or the result shown
    with no button; "PCoA stopped. …" under the PCoA. */
export function pcaStoppedText(method: PcaMethod, runOffered: boolean): string {
  const stopped = `${methodName(method)} stopped.`;
  return runOffered
    ? `${stopped} Press Run in the PCA tab to calculate it again.`
    : stopped;
}

/** The line after a Stop, until Run or another variants file, which
    says what Run does again: "Stopped: the PCA no longer starts by
    itself after a change. Run calculates it and starts it again after
    each change."; with the result shown, `resultShown`, which offers no
    Run until a change takes it away, "… After the next change, Run
    calculates it and starts it again after each change."; "the PCoA"
    under the PCoA. */
export function stoppedLine(method: PcaMethod, resultShown: boolean): string {
  const stopped = `Stopped: the ${methodName(method)} no longer starts by itself after a change.`;
  return resultShown
    ? `${stopped} After the next change, Run calculates it and starts it again after each change.`
    : `${stopped} Run calculates it and starts it again after each change.`;
}

/** The line after a failure that ended the live state, under the
    failure's words, until Run or another variants file: "The PCA no
    longer starts by itself after a change, since its calculation
    failed. Run calculates it and starts it again after each change.";
    "the PCoA" under the PCoA. The user pressed no Stop, so it does not
    say "Stopped". */
export function failureEndedLine(method: PcaMethod): string {
  return `The ${methodName(method)} no longer starts by itself after a change, since its calculation failed. Run calculates it and starts it again after each change.`;
}
