/**
 * The outcome of a calculation (docs/specs/entry.md, "The outcome of a
 * calculation"): the Run button of an analysis panel starts it here, and
 * the Write button of the Variants step the writing of the filtered
 * variants, and each outcome, when it arrives, goes to the store. The
 * store stops a calculation with the handle it keeps; nothing here
 * cancels.
 */

import type { WriteFormat } from "../core/keys.ts";
import type { AnalysisId } from "../core/project.ts";
import type { Store } from "../core/store.ts";
import type { Run, Written } from "../worker/protocol.ts";

/** When each calculation in flight started, by the id of its request, in
    the milliseconds of performance.now(). */
const started = new Map<number, number>();

/**
 * Starts the calculation of the analysis `id`, and hands the outcome of
 * every request it sends to the store when it arrives; null when the
 * store starts none. The requests are those `startRun` gives, none when
 * the Run waits for statistics of each individual already in flight, and
 * those that the `runEnded` of each gives back, the Runs that waited for
 * the statistics, and so on; the promise settles when all have ended. It
 * rejects only for a defect of ours, a `runEnded` that throws, which the
 * button passes over with `void` so that it reaches the error bar; when
 * several throw, it rejects with the first, and each other one is thrown
 * on its own, outside the promise.
 */
export function startAnalysis<R, F>(
  store: Store<R, F>,
  id: AnalysisId,
): Promise<void> | null {
  const runs = store.startRun(id);
  return runs === null ? null : awaitEach(store, runs);
}

/**
 * Starts the writing of the filtered variants in `format`, as
 * `startAnalysis` starts a calculation: the requests are those
 * `startWrite` gives, the statistics of each individual it waits for or
 * the write itself, and those the `runEnded` of each gives back; null
 * when the store starts none.
 */
export function startWriting<R, F>(
  store: Store<R, F>,
  format: WriteFormat,
): Promise<void> | null {
  const runs = store.startWrite(format);
  return runs === null ? null : awaitEach(store, runs);
}

/** Awaits the outcome of each of `runs`, and of each handle their
    `runEnded` gives back, noting the time of each while it is in
    flight. Every `runEnded` that throws reaches the error bar: the
    first rejects the promise, and each other one is thrown on its own,
    outside the promise, which the window's `error` event takes. */
async function awaitEach<R, F>(
  store: Store<R, F>,
  runs: readonly Run<R | Written<F>>[],
): Promise<void> {
  const ends = await Promise.allSettled(
    runs.map((run) => {
      started.set(run.id, performance.now());
      return run.outcome.then((outcome) => {
        started.delete(run.id);
        return awaitEach(store, store.runEnded(run.id, outcome));
      });
    }),
  );
  const reasons = ends.flatMap((end): unknown[] =>
    end.status === "rejected" ? [end.reason] : [],
  );
  for (const reason of reasons.slice(1)) {
    queueMicrotask(() => {
      throw reason;
    });
  }
  if (reasons.length > 0) {
    throw reasons[0];
  }
}

/** When the calculation `runId` was started, in the milliseconds of
    performance.now(), while it is in flight; null otherwise. */
export function startedAt(runId: number): number | null {
  return started.get(runId) ?? null;
}
