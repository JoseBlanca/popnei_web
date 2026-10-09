/**
 * What the frame of an analysis reads of the store, shared by the panels
 * of the Analyses step (AnalysisPanel.tsx) and the parts of the checks of
 * the Variants step (docs/specs/steps/variants.md): the state of an
 * analysis, the button that state offers, Run or its Calculate, Stop, or
 * none, its result once done, and the notice that stopped it.
 */
import { pcaOnPopgen2, pcaOptions } from "../../core/analyses/pca.ts";
import type { AnalysisId } from "../../core/project.ts";
import type { AnalysisStatus, AppState, Notice } from "../../core/store.ts";
import type { JobResult, PcaMethod } from "../../worker/protocol.ts";
import { methodName } from "./pca/words.ts";

/** The state of the analysis `id` in `s`; a defect when the store has
    none. */
export function statusOf(
  s: AppState<JobResult, unknown>,
  id: AnalysisId,
): AnalysisStatus<JobResult> {
  const view = s.analyses.find((a) => a.id === id);
  if (view === undefined) {
    throw new Error(`popnei_web defect: the store has no analysis ${id}.`);
  }
  return view.status;
}

/** What the button of the panel is in a state, or `null` when the state
    offers none. */
export type ButtonOf =
  | { readonly kind: "run"; readonly reason: string | null }
  | { readonly kind: "stop" }
  | null;

/** The button of the state `status`. */
export function buttonOf(status: AnalysisStatus<JobResult>): ButtonOf {
  switch (status.kind) {
    case "locked":
      return { kind: "run", reason: status.reason };
    case "ready":
    case "removed":
      return { kind: "run", reason: null };
    case "running":
      return { kind: "stop" };
    case "done":
      return null;
    case "error":
      // popnei would refuse the same settings again, and a file the
      // browser can no longer read fails again until it is loaded again.
      return status.error.kind === "refused" ||
        status.error.error.kind === "reopenFailed"
        ? null
        : { kind: "run", reason: null };
  }
}

/** The result of the analysis `id`, of the union of the results of the
    workers. */
export type ResultOf<Id extends JobResult["analysis"]> = Extract<
  JobResult,
  { readonly analysis: Id }
>;

/** Whether `result` is one of the analysis `id`. */
function isResultOf<Id extends JobResult["analysis"]>(
  result: JobResult,
  id: Id,
): result is ResultOf<Id> {
  return result.analysis === id;
}

/** The result of the analysis `id` in its state `status` once it is done,
    or `null` in any other state; a defect when the store gave it the
    result of another analysis. The same object as the store's, so that it
    may be what a selector returns. */
export function resultOf<Id extends JobResult["analysis"]>(
  status: AnalysisStatus<JobResult>,
  id: Id,
): ResultOf<Id> | null {
  if (status.kind !== "done") return null;
  if (!isResultOf(status.result, id)) {
    throw new Error(
      `popnei_web defect: ${id} was given a result of ${status.result.analysis}.`,
    );
  }
  return status.result;
}

/** The notice that stopped the calculation of the analysis `id` at once,
    by a change of the load of the variants file, while it is up and the
    analysis can be run again, `status` ready or locked; `null`
    otherwise. */
export function stoppedNotice(
  status: AnalysisStatus<JobResult>,
  notice: Notice | null,
  id: AnalysisId,
): Notice | null {
  return notice?.stopped.includes(id) === true &&
    (status.kind === "ready" || status.kind === "locked")
    ? notice
    : null;
}

/** A calculation of popgen2.html that, while it runs, locks the filters
    it reads and keeps the download of the filtered variants waiting
    (docs/specs/steps/popgen2-pca.md, "While a PCA runs"). */
export interface RunningAnalysis {
  /** The analysis in the middle of a sentence: "the PCA", "the PCoA". */
  readonly name: string;
  /** The label of the tab where it is stopped: "PCA". */
  readonly tab: string;
}

/** The running PCA by its method, the same object for the same method,
    so that a selector may return it. Its tab is the PCA tab, labelled as
    `PAGE_TAB_LABELS` of src/ui/variants/analysisTabsWords.ts labels it,
    which is not imported here, so that popgen.html, which reads this
    module, does not download the words of popgen2.html's tabs. */
const RUNNING_PCA: Readonly<Record<PcaMethod, RunningAnalysis>> = Object.freeze(
  {
    pca: Object.freeze({ name: `the ${methodName("pca")}`, tab: "PCA" }),
    pcoa: Object.freeze({ name: `the ${methodName("pcoa")}`, tab: "PCA" }),
  },
);

/** The calculation of popgen2.html running in `s` that locks the
    filters it reads, the PCA, named by the method of its project, which
    the lock keeps while it runs; `null` while none runs. Read on
    popgen2.html alone, whose store runs the PCA of `pcaOnPopgen2`. */
export function runningAnalysisOf(
  s: AppState<JobResult, unknown>,
): RunningAnalysis | null {
  return statusOf(s, pcaOnPopgen2.id).kind === "running"
    ? RUNNING_PCA[pcaOptions(s.project, "popgen2").method]
    : null;
}
