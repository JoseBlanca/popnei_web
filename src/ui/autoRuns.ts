/**
 * The analyses a page starts by itself (docs/plans/open-variants.md, "It
 * runs on its own once the file is read"): the summary of the variants
 * file of popgen2.html starts as soon as it can run, with no Run button,
 * since the user opened the file to see what it holds, and the statistics
 * of the open file after it (docs/plans/file-stats.md).
 *
 * They are given in groups, each the analyses one Stop of the page stops
 * together: the summary alone, then the two statistics. They start one at
 * a time, in their order, since the one calculation worker runs one
 * request at a time and the store has no state for a request that waits
 * in the client's queue. An analysis starts once every one before it is
 * done; within its group, one before it that failed in a way a new
 * calculation may mend, a crash or a defect of ours, does not hold it
 * back, since each statistic is shown apart and a failure of one should
 * not hide the other. popnei's refusal, or a variants file the browser
 * could not read again, holds back those after it, since they would fail
 * the same way after a pass of minutes; and a group starts only once
 * every analysis of the group before it is done, so the statistics wait
 * for the count.
 *
 * Each starts once for each key: not again after a failure, nor after a
 * Stop, which leaves it ready under a key it was started under and holds
 * back those after it; but again for a new file, or a new read of it,
 * which gives a new key, and when the user asks, with `again` or
 * `resume`. The entry calls `sync` after every change of the store.
 * Plain TypeScript, so that a test in node drives it on the real store.
 */

import type { Key } from "../core/keys.ts";
import type { AnalysisId } from "../core/project.ts";
import type { AnalysisStatus, Store } from "../core/store.ts";

/** What the analyses started by themselves need of the store. */
export type AutoRunStore = Pick<
  Store<unknown, unknown>,
  "getState" | "cancelRun"
>;

/** Why an analysis that can run has not been started by itself. */
export type Pending =
  /** It starts by itself once `after`, the first analysis before it
      that is not done, is done: one running, one waiting itself, or one
      stopped, which waits for the user to start it again; `null` when
      none is left and it starts at the next `sync`. */
  | { readonly kind: "waiting"; readonly after: AnalysisId | null }
  /** `by`, an analysis before it, is in error, or cannot run, and holds
      it back until `by` is run again and done. */
  | { readonly kind: "blocked"; readonly by: AnalysisId }
  /** It was stopped: it was started under its key, and nothing will
      start it again but the user. */
  | { readonly kind: "stopped" };

/** The analyses a page starts by itself. */
export interface AutoRuns {
  /** Starts the first analysis that can run and is not held back, under
      a key it has not been started under, or that `resume` gave back;
      nothing while one of them runs. */
  sync(): void;
  /** Starts the analysis `id` again, at the user's Count again, after a
      Stop or a failure that a new calculation may mend; nothing when the
      store does not start it. */
  again(id: AnalysisId): void;
  /** Whether the analysis was started under `key` and is not to be
      started again by itself: an analysis that can run under such a key
      was stopped. */
  startedUnder(key: Key): boolean;
  /** Why the analysis `id`, ready or removed by the notice, has not been
      started; `null` in any other state, which the status shows. */
  pending(id: AnalysisId): Pending | null;
  /** Stops the calculation in flight of each of `group`, one of the
      groups, at the user's Stop of it, the statistics of the file: the
      one running is left ready under a key it was started under, so
      neither it nor those after it start again by themselves. */
  stop(group: readonly AnalysisId[]): void;
  /** Starts again, at the user's start again of `group`, one of the
      groups, the first of it that is not done, as `again` starts it, and
      gives back those after it in the group that are not done, which
      then start by themselves, one after the other. Returns whether it
      started one. It starts nothing, and returns false, when one of the
      analyses of every group runs; when one before the group is not
      done; when every one of the group is done; and when the first not
      done is locked, or in error from popnei's refusal or from a
      variants file the browser could not read again, which a new
      calculation would not mend. */
  resume(group: readonly AnalysisId[]): boolean;
}

/** The key of a status that can be started: ready, or removed by the
    notice; `null` for any other. */
function startableKey(status: AnalysisStatus<unknown>): Key | null {
  switch (status.kind) {
    case "ready":
    case "removed":
      return status.key;
    case "locked":
    case "done":
    case "running":
    case "error":
      return null;
  }
}

/** Whether `status` is an error that a new calculation may mend: a
    failure that is not popnei's refusal nor a variants file the browser
    could not read again, as the store's own rule of what it starts. */
function isMendable(status: AnalysisStatus<unknown>): boolean {
  return (
    status.kind === "error" &&
    status.error.kind === "failed" &&
    status.error.error.kind !== "reopenFailed"
  );
}

/** The key under which `status` can be started again at the user's
    asking: that of a startable status or of a mendable error; `null` for
    any other. */
function againKey(status: AnalysisStatus<unknown>): Key | null {
  if (status.kind === "error") return isMendable(status) ? status.key : null;
  return startableKey(status);
}

/**
 * The analyses `groups` of the store, in the order they start, started
 * by `start`, which is `startAnalysis` of runs.ts on the page and gives
 * `null` when the store starts nothing. A promise it gives that rejects,
 * a defect of ours, is left to the window's handler and the error bar, as
 * a Run button leaves it. A defect when a group is empty or an analysis
 * is in two places.
 */
export function createAutoRuns(deps: {
  readonly store: AutoRunStore;
  readonly groups: readonly (readonly AnalysisId[])[];
  readonly start: (id: AnalysisId) => Promise<void> | null;
}): AutoRuns {
  const { store, groups, start } = deps;
  const ids = groups.flat();
  if (groups.some((group) => group.length === 0)) {
    throw new Error(
      "popnei_web defect: an empty group of analyses to start by themselves.",
    );
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error(
      "popnei_web defect: an analysis in two places among those started by themselves.",
    );
  }
  /** The place of each group in `groups`, by the ids it holds. */
  const groupOf = new Map<AnalysisId, number>();
  for (const [index, group] of groups.entries()) {
    for (const id of group) groupOf.set(id, index);
  }
  const started = new Set<Key>();
  /** The analyses `resume` gave back, each with the key it may start
      under once those before it let it. */
  const resumed = new Map<AnalysisId, Key>();

  function statusOf(id: AnalysisId): AnalysisStatus<unknown> {
    const status = store.getState().analyses.find((a) => a.id === id)?.status;
    if (status === undefined) {
      throw new Error(
        `popnei_web defect: the store has no analysis ${id} to start by itself.`,
      );
    }
    return status;
  }

  function startOne(id: AnalysisId, key: Key): boolean {
    started.add(key);
    resumed.delete(id);
    const sent = start(id);
    return sent !== null;
  }

  /** The first analysis before `id`, at `index` of `ids`, that holds it
      back: one not done, but for a mendable error of its own group;
      `null` when none does. */
  function holderOf(id: AnalysisId, index: number): AnalysisId | null {
    const own = groupOf.get(id);
    for (const before of ids.slice(0, index)) {
      const status = statusOf(before);
      if (status.kind === "done") continue;
      if (isMendable(status) && groupOf.get(before) === own) continue;
      return before;
    }
    return null;
  }

  /** The place of `group` in `ids`; a defect when it is not one of the
      groups. */
  function placeOf(group: readonly AnalysisId[]): number {
    const known = groups.find(
      (g) => g.length === group.length && g.every((id, i) => id === group[i]),
    );
    const first = group[0];
    if (known === undefined || first === undefined) {
      throw new Error(
        `popnei_web defect: ${group.join(", ")} is not a group of the analyses started by themselves.`,
      );
    }
    return ids.indexOf(first);
  }

  function anyRunning(): boolean {
    return ids.some((id) => statusOf(id).kind === "running");
  }

  function again(id: AnalysisId): void {
    const key = againKey(statusOf(id));
    if (key !== null) startOne(id, key);
  }

  return {
    sync: () => {
      // The calculation worker runs one request at a time, and the
      // store has no state for one that waits in the client's queue.
      if (anyRunning()) return;
      for (const [index, id] of ids.entries()) {
        const status = statusOf(id);
        const back = resumed.get(id);
        if (back !== undefined && back !== againKey(status)) {
          resumed.delete(id);
        }
        if (holderOf(id, index) !== null) return;
        const fresh = startableKey(status);
        if (fresh !== null && !started.has(fresh)) {
          startOne(id, fresh);
          return;
        }
        const key = againKey(status);
        if (key !== null && resumed.get(id) === key) {
          startOne(id, key);
          return;
        }
      }
    },
    again,
    startedUnder: (key) =>
      started.has(key) && ![...resumed.values()].includes(key),
    pending: (id) => {
      const index = ids.indexOf(id);
      if (index === -1) {
        throw new Error(
          `popnei_web defect: ${id} is not among the analyses started by themselves.`,
        );
      }
      const key = startableKey(statusOf(id));
      if (key === null) return null;
      const holder = holderOf(id, index);
      if (holder !== null) {
        const kind = statusOf(holder).kind;
        if (kind === "error" || kind === "locked") {
          return { kind: "blocked", by: holder };
        }
      }
      if (started.has(key) && resumed.get(id) !== key) {
        return { kind: "stopped" };
      }
      return { kind: "waiting", after: holder };
    },
    stop: (group) => {
      placeOf(group);
      for (const id of group) {
        resumed.delete(id);
        if (statusOf(id).kind === "running") store.cancelRun(id);
      }
    },
    resume: (group) => {
      const place = placeOf(group);
      if (anyRunning()) return false;
      if (ids.slice(0, place).some((id) => statusOf(id).kind !== "done")) {
        return false;
      }
      const at = group.findIndex((id) => statusOf(id).kind !== "done");
      const first = group[at];
      if (first === undefined) return false;
      const key = againKey(statusOf(first));
      if (key === null) return false;
      for (const id of group.slice(at + 1)) {
        const back = againKey(statusOf(id));
        if (back !== null) resumed.set(id, back);
      }
      if (startOne(first, key)) return true;
      for (const id of group) resumed.delete(id);
      return false;
    },
  };
}
