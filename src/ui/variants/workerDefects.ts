/**
 * The defects of our own code that the count of the variants met in the
 * worker, given to the error bar of popgen2.html, which the page shows
 * only as a failure of the count, so that they can be copied and
 * reported.
 */
import type { Store } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import type { Defects } from "../defects.ts";
import { summaryStatus } from "./words.ts";

/** Gives `defects` each defect of our own code that a count met in the
    worker, once for each failure. */
export function reportDefects(
  store: Store<JobResult, Blob>,
  defects: Defects,
): void {
  let before = summaryStatus(store.getState());
  store.subscribe(() => {
    const after = summaryStatus(store.getState());
    if (
      after !== before &&
      after.kind === "error" &&
      after.error.kind === "failed" &&
      after.error.error.kind === "defect" &&
      !(before.kind === "error" && before.key === after.key)
    ) {
      // The message alone: an Error made here would carry a stack of
      // this listener, which says nothing of where the worker failed.
      defects.report(after.error.error.message, "worker", null);
    }
    before = after;
  });
}
