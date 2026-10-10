/**
 * Which failures of the PCA of popgen2.html end its live state, as a
 * Stop does (docs/specs/steps/popgen2-pca.md, "Live"): a crash of the
 * calculation worker whose words speak of the memory, 2,264 individuals
 * or more, since a worker ended in the middle of a calculation keeps its
 * memory in WebKit and a PCA tried again a second after each change of a
 * user following the crash's advice would pile it up; and the failures
 * only a reload mends, the calculations that could not start, the page
 * out of date and an error of the application's own, which would fail
 * again at every change. popnei's refusal, and every other failure,
 * leave it live: the next change of the key tries again. Pure, so that a
 * test in node checks it; the entry gives it to `createAutoRuns`.
 */
import { crashSpeaksOfMemory } from "../../../core/analyses/pca.ts";
import type { AnalysisId } from "../../../core/project.ts";
import type { AppState } from "../../../core/store.ts";
import { individualsRunOn } from "./words.ts";

/** Whether the status of the analysis `id` in `s`, a failure, ends its
    live state; false for any status that is not an error. */
export function failureEndsLive(
  s: AppState<unknown, unknown>,
  id: AnalysisId,
): boolean {
  const status = s.analyses.find((a) => a.id === id)?.status;
  if (status?.kind !== "error" || status.error.kind !== "failed") {
    return false;
  }
  const failure = status.error.error;
  switch (failure.kind) {
    case "workerFailed":
      return crashSpeaksOfMemory(
        individualsRunOn(s.project, s.individualsKept),
      );
    case "couldNotStart":
    case "protocolMismatch":
    case "defect":
      return true;
    case "files":
    case "reopenFailed":
      return false;
  }
}
