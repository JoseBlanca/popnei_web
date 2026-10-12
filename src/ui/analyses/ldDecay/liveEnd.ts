/**
 * Which failures of the LD decay of popgen2.html end its live state, as a
 * Stop does (docs/specs/steps/popgen2-pca.md, "Several analyses
 * calculated again by themselves", "For the implementer"): the
 * diversity's, every crash of the calculation worker, whose words name
 * the memory, and the failures only a reload mends; and popnei's refusal
 * for memory, after which a run at the same settings would take as long,
 * up to 25 minutes on a dense file, and be refused again after each
 * change. Its other refusals, and a file that could not be read, leave it
 * live. Pure, so that a test in node checks it; the page gives it to
 * `createAutoRuns` through `popgen2EndsLive` of popgen2Store.ts.
 */
import { isMemoryRefusal } from "../../../core/analyses/words.ts";
import type { AnalysisId } from "../../../core/project.ts";
import type { AppState } from "../../../core/store.ts";
import { diversityFailureEndsLive } from "../diversity/liveEnd.ts";

/** Whether the status of the analysis `id` in `s`, a failure, ends the
    LD decay's live state; false for any status that is not an error. */
export function ldDecayFailureEndsLive(
  s: AppState<unknown, unknown>,
  id: AnalysisId,
): boolean {
  const status = s.analyses.find((a) => a.id === id)?.status;
  if (status?.kind === "error" && status.error.kind === "refused") {
    return isMemoryRefusal(status.error.message);
  }
  return diversityFailureEndsLive(s, id);
}
