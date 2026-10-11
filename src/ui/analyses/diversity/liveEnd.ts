/**
 * Which failures of the diversity of popgen2.html end its live state, as
 * a Stop does (docs/specs/steps/popgen2-pca.md, "Several analyses
 * calculated again by themselves", "For the implementer"): every crash
 * of the calculation worker, since the diversity's words cannot tell a
 * crash for memory from another, and a worker ended in the middle of a
 * calculation keeps its memory in WebKit for 40 s and more, which a
 * diversity tried again a second after each change would pile up; and
 * the failures only a reload mends, the calculations that could not
 * start, the page out of date and an error of the application's own,
 * which would fail again at every change. popnei's refusal, and a file
 * that could not be read, leave it live: the next change of its key
 * tries again. Pure, so that a test in node checks it; the page gives it
 * to `createAutoRuns` through `popgen2EndsLive` of popgen2Store.ts.
 */
import type { AnalysisId } from "../../../core/project.ts";
import type { AppState } from "../../../core/store.ts";

/** Whether the status of the analysis `id` in `s`, a failure, ends the
    diversity's live state; false for any status that is not an error,
    and for popnei's refusal. */
export function diversityFailureEndsLive(
  s: AppState<unknown, unknown>,
  id: AnalysisId,
): boolean {
  const status = s.analyses.find((a) => a.id === id)?.status;
  if (status?.kind !== "error" || status.error.kind !== "failed") {
    return false;
  }
  switch (status.error.error.kind) {
    case "workerFailed":
    case "couldNotStart":
    case "protocolMismatch":
    case "defect":
      return true;
    case "files":
    case "reopenFailed":
      return false;
  }
}
