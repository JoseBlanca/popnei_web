/**
 * What the frame of an analysis reads of the store, shared by the panels
 * of the Analyses step (AnalysisPanel.tsx) and the parts of the checks of
 * the Variants step (docs/specs/steps/variants.md): the state of an
 * analysis, the button that state offers, Run or its Calculate, Stop, or
 * none, its result once done, and the notice that stopped it.
 */
import type { AnalysisId } from "../../core/project.ts";
import type { AnalysisStatus, AppState, Notice } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";

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
