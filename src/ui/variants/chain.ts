/**
 * The rules of the chain of popgen2.html, `POPGEN2_CHAIN`, that the box
 * of the file and its words share: the statuses of the chain, whether
 * Start again can mend a failure, and the one button of the box, Stop or
 * Start again, decided from the first of the chain that is neither done
 * nor locked, as `resume` of autoRuns.ts starts that one
 * (docs/architecture.md, section 5). Written once, so that the button the
 * box draws, the focus that follows it and the status region's silence
 * at the end of the chain agree. Pure, so that a test in node checks it.
 */

import type { Key } from "../../core/keys.ts";
import type {
  AnalysisError,
  AnalysisStatus,
  AppState,
} from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import type { ButtonOf } from "../analyses/status.ts";
import { POPGEN2_CHAIN } from "../popgen2Store.ts";

/** The statuses of the chain of the page, `POPGEN2_CHAIN`, in its order,
    among the `analyses` of the store; a defect when one is not there. A
    new list at every call, so not a selector of `useAppState`. */
export function chainStatuses(
  analyses: AppState<JobResult, unknown>["analyses"],
): readonly AnalysisStatus<JobResult>[] {
  return POPGEN2_CHAIN.map((id) => {
    const view = analyses.find((a) => a.id === id);
    if (view === undefined) {
      throw new Error(
        `popnei_web defect: the store has no analysis ${id} of the chain.`,
      );
    }
    return view.status;
  });
}

/** Whether Start again can mend the failure `error`: a worker that
    stopped, and none of these: popnei's refusal, which the same file
    gives again; a file the browser can no longer read, which a new
    opening mends; a worker that could not start or a page out of date,
    which the client fails at once until the page is reloaded; a defect of
    our own code, which the error bar tells. */
export function startAgainMends(error: AnalysisError): boolean {
  return error.kind === "failed" && error.error.kind === "workerFailed";
}

/**
 * The button of the box for the chain whose statuses are `statuses`,
 * decided from the first that is neither done nor locked, a locked member
 * holding back nothing: Stop while one of the chain runs, or the first
 * such is about to start by itself; Start again after it was stopped,
 * which `startedUnder` of autoRuns.ts tells from its key, or after a
 * failure Start again may mend; none when every one is done or locked, or
 * the first such failed for good.
 */
export function chainButton(
  statuses: readonly AnalysisStatus<JobResult>[],
  startedUnder: (key: Key) => boolean,
): ButtonOf {
  if (statuses.some((status) => status.kind === "running")) {
    return { kind: "stop" };
  }
  const first = statuses.find(
    (status) => status.kind !== "done" && status.kind !== "locked",
  );
  if (first === undefined) return null;
  switch (first.kind) {
    case "ready":
    case "removed":
      // Not started under its key, it starts by itself in a moment.
      return startedUnder(first.key)
        ? { kind: "run", reason: null }
        : { kind: "stop" };
    case "error":
      return startAgainMends(first.error)
        ? { kind: "run", reason: null }
        : null;
    case "running":
      return null;
  }
}

/** Whether the box shows a button, Stop or Start again, for the chain
    whose statuses are `statuses`, by the rule of `chainButton`, which
    gives one for a member ready whether it was stopped or not. */
export function hasChainButton(
  statuses: readonly AnalysisStatus<JobResult>[],
): boolean {
  return chainButton(statuses, () => false) !== null;
}
