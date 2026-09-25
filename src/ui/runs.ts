/**
 * The outcome of a calculation (docs/specs/entry.md, "The outcome of a
 * calculation"): the Run button of an analysis panel starts it here, and
 * its outcome, when it arrives, goes to the store. The store stops a
 * calculation with the handle it keeps; nothing here cancels.
 */

import type { AnalysisId } from "../core/project.ts";
import type { Store } from "../core/store.ts";
import type { JobResult } from "../worker/protocol.ts";

/** When each calculation in flight started, by the id of its request, in
    the milliseconds of performance.now(). */
const started = new Map<number, number>();

/**
 * Starts the calculation of the analysis `id` and hands its outcome to the
 * store when it arrives; null when the store starts none. The promise
 * rejects only for a defect of ours, a `runEnded` that throws, which the
 * button passes over with `void` so that it reaches the error bar.
 */
export function startAnalysis(
  store: Store<JobResult>,
  id: AnalysisId,
): Promise<void> | null {
  const run = store.startRun(id);
  if (run === null) {
    return null;
  }
  started.set(run.id, performance.now());
  return run.outcome.then((outcome) => {
    started.delete(run.id);
    store.runEnded(run.id, outcome);
  });
}

/** When the calculation `runId` was started, in the milliseconds of
    performance.now(), while it is in flight; null otherwise. */
export function startedAt(runId: number): number | null {
  return started.get(runId) ?? null;
}
