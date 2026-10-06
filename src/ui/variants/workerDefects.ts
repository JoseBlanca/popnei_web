/**
 * The failures of the calculation worker on popgen2.html that the page
 * shows only as a line of the box, given to the error bar, so that they
 * can be copied and reported: a defect of our own code that the opening
 * of the file or its count met in the worker, and the worker that stopped
 * on its own, a crash and not a refusal of popnei, during the opening or
 * the count, with the words it stopped with (the owner, 6 October 2026).
 * Each failure is reported once.
 */
import type { Store } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import type { Defects } from "../defects.ts";
import { summaryStatus } from "./words.ts";

/** Gives `defects` each defect of our own code that an opening or a
    count met in the worker, and each stop of the worker during an opening
    or a count, once for each failure. */
export function reportDefects(
  store: Store<JobResult, Blob>,
  defects: Defects,
): void {
  let before = summaryStatus(store.getState());
  // The load whose opening was last reported, so that a failure recorded
  // again is not reported twice.
  let readReported: string | null = null;
  store.subscribe(() => {
    const state = store.getState();
    const variants = state.project.variants;
    if (
      variants !== null &&
      variants.fileId !== readReported &&
      variants.read.kind === "failed" &&
      variants.read.error.kind === "worker"
    ) {
      const failure = variants.read.error.error;
      if (failure.kind === "workerFailed" || failure.kind === "defect") {
        readReported = variants.fileId;
        defects.report(
          failure.message,
          failure.kind === "defect" ? "worker" : "openingStopped",
          null,
        );
      }
    }
    const after = summaryStatus(state);
    if (
      after !== before &&
      after.kind === "error" &&
      after.error.kind === "failed" &&
      !(before.kind === "error" && before.key === after.key)
    ) {
      const failure = after.error.error;
      // The message alone: an Error made here would carry a stack of
      // this listener, which says nothing of where the worker failed.
      if (failure.kind === "defect") {
        defects.report(failure.message, "worker", null);
      } else if (failure.kind === "workerFailed") {
        defects.report(failure.message, "countStopped", null);
      }
    }
    before = after;
  });
}
