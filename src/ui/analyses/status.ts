/**
 * What the frame of an analysis reads of the store, shared by the panels
 * of the Analyses step (AnalysisPanel.tsx) and the parts of the checks of
 * the Variants step (docs/specs/steps/variants.md): the state of an
 * analysis, and the button that state offers, Run or its Calculate, Stop,
 * or none.
 */
import type { AnalysisId } from "../../core/project.ts";
import type { AnalysisStatus, AppState } from "../../core/store.ts";
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
