/**
 * The Run of a tab of an analysis calculated again by itself on
 * popgen2.html, the PCA tab's and the Populations tab's
 * (docs/specs/steps/popgen2-pca.md, "Several analyses calculated again
 * by themselves", "A Run while another analysis runs";
 * docs/specs/steps/popgen2-populations.md, "Accessibility").
 */
import type { AnalysisId } from "../../core/project.ts";
import type { AppState } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import type { AutoRuns } from "../autoRuns.ts";
import type { Announcer } from "../shell/status.ts";
import { waitsAfterName } from "./status.ts";
import type { LiveAnalysisName } from "./status.ts";

/** What a Run of a live analysis needs. */
export interface LiveRunDeps {
  /** The analyses the page starts by itself, which make `id` live. */
  readonly autoRuns: Pick<AutoRuns, "run" | "liveState">;
  /** The announcer of the status region. */
  readonly announcer: Pick<Announcer, "announce">;
  /** The state of the store now. */
  readonly getState: () => AppState<JobResult, unknown>;
}

/**
 * The user's Run of the live analysis `id`: makes it live and starts it,
 * `autoRuns.run`; and, when it waits behind another calculation, which
 * starts nothing and brings no bar, says once in the status region the
 * tab's line of that wait, `waitingLine`, given the analysis it waits
 * for, "The diversity starts once the PCA, which is running, ends.", so
 * that a user of a screen reader learns why. Nothing is said for a Run
 * started, kept or refused, whose bar, result or lock says what
 * happened.
 */
export function runLive(
  deps: LiveRunDeps,
  id: AnalysisId,
  waitingLine: (before: LiveAnalysisName | null) => string,
): void {
  const answer = deps.autoRuns.run(id);
  if (answer !== "waiting") return;
  // Read after the Run, which made it live and waiting.
  const now = deps.autoRuns.liveState(id);
  deps.announcer.announce(waitingLine(waitsAfterName(deps.getState(), now)));
}
