/**
 * The failures of the calculation worker on popgen2.html that the page
 * shows only as a line of the box or of the statistics' section, given to
 * the error bar, so that they can be copied and reported: a defect of our
 * own code that the opening of the file, its count or its statistics met
 * in the worker, and the worker that stopped on its own, a crash and not a
 * refusal of popnei, during the opening, the count or the statistics, with
 * the words it stopped with (the owner, 6 October 2026). Each failure is
 * reported once.
 */
import type { AnalysisStatus, Store } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import type { DefectOrigin, Defects } from "../defects.ts";
import { INDIVIDUALS_ID, VARIANTS_ID, statsStatus } from "./statsWords.ts";
import { summaryStatus } from "./words.ts";

/** The calculations of the page whose failures are reported, each with
    the status the store gives it and the origin of a stop of the worker
    during it. */
const WATCHED: readonly {
  readonly statusOf: (
    s: ReturnType<Store<JobResult, Blob>["getState"]>,
  ) => AnalysisStatus<JobResult>;
  readonly stopped: DefectOrigin;
}[] = [
  { statusOf: summaryStatus, stopped: "countStopped" },
  {
    statusOf: (s) => statsStatus(s, INDIVIDUALS_ID),
    stopped: "statisticsStopped",
  },
  {
    statusOf: (s) => statsStatus(s, VARIANTS_ID),
    stopped: "statisticsStopped",
  },
];

/** Gives `defects` each defect of our own code that an opening, a count
    or a statistic met in the worker, and each stop of the worker during
    one of them, once for each failure. */
export function reportDefects(
  store: Store<JobResult, Blob>,
  defects: Defects,
): void {
  let before = WATCHED.map((watched) => watched.statusOf(store.getState()));
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
    const after = WATCHED.map((watched) => watched.statusOf(state));
    for (const [index, now] of after.entries()) {
      const then = before[index];
      const watched = WATCHED[index];
      if (then === undefined || watched === undefined) {
        throw new Error(
          "popnei_web defect: a calculation watched for failures has no status before.",
        );
      }
      if (
        now !== then &&
        now.kind === "error" &&
        now.error.kind === "failed" &&
        !(then.kind === "error" && then.key === now.key)
      ) {
        const failure = now.error.error;
        // The message alone: an Error made here would carry a stack of
        // this listener, which says nothing of where the worker failed.
        if (failure.kind === "defect") {
          defects.report(failure.message, "worker", null);
        } else if (failure.kind === "workerFailed") {
          defects.report(failure.message, watched.stopped, null);
        }
      }
    }
    before = after;
  });
}
