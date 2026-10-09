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
  return passLockText(lock, variants.name, method);
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
 * left behind by another variants file, ends with no result and no
 * error; a result brought back by an undo did not run.
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

/** The title over the plot of a result of the tab, of the variants file
    `variantsName`: "Principal components of panel.nei", "Principal
    coordinates of panel.nei" (docs/specs/steps/popgen2-pca.md, "The
    result"). */
export function pcaResultTitle(
  method: PcaMethod,
  variantsName: string,
): string {
  const what =
    method === "pca" ? "Principal components" : "Principal coordinates";
  return `${what} of ${escaped(variantsName)}`;
}

/** The reason the plot's menu waits while three.js downloads. */
export const PLOT_WAITS_3D = "Download once the 3D view is drawn.";

/** What each menu of a result downloads, after "Download ": "the plot of
    the PCA", "the explained variance of the PCA", "the table of the
    individuals of the PCA" (docs/specs/steps/popgen2-pca.md, "Its
    words"). */
export function pcaDownloadWhat(
  part: "plot" | "variance" | "table",
  method: PcaMethod,
): string {
  const name = methodName(method);
  switch (part) {
    case "plot":
      return `the plot of the ${name}`;
    case "variance":
      return `the explained variance of the ${name}`;
    case "table":
      return `the table of the individuals of the ${name}`;
  }
}

/** The words of the 3D view that could not be downloaded, of the
    variants file `variantsName`, on this page, which saves no project and
    has no file open after a reload: "… reload the page, open panel.nei
    again and run the PCA again." (docs/specs/steps/popgen2-pca.md, "Its
    words", the errors). */
export function pcaTabLoadFailed3d(
  method: PcaMethod,
  variantsName: string,
): string {
  return `The 3D view could not be loaded, so the 2D plot is shown in its place. If the connection works, the site may have been updated since this page was opened: reload the page, open ${escaped(variantsName)} again and run the ${methodName(method)} again.`;
}
