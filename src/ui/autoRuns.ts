/**
 * The analyses a page starts by itself (docs/plans/open-variants.md, "It
 * runs on its own once the file is read"): the summary of the variants
 * file of popgen2.html, whose one pass gives the count of the variants
 * and the statistics of the open file, starts as soon as it can run,
 * with no Run button, since the user opened the file to see what it holds
 * (docs/plans/live-stats.md).
 *
 * They are given in groups, each the analyses a Stop of a group stops
 * together and its start again starts again; popgen2.html has one group,
 * which its one Stop and its Start again act on. They start one
 * at a time, in their order, since the one calculation worker runs one
 * request at a time and the store has no state for a request that waits
 * in the client's queue. An analysis starts once every one before it is
 * done; within its group, one before it that failed in a way a new
 * calculation may mend, a crash or a defect of ours, does not hold it
 * back, since each analysis of a group is shown apart and a failure of
 * one should not hide the other. popnei's refusal, or a variants file the
 * browser could not read again, holds back those after it, since they
 * would fail the same way after a pass of minutes; and a group starts
 * only once every analysis of the group before it is done.
 *
 * Each starts once for each key: not again after a failure, nor after a
 * Stop, which leaves it ready under a key it was started under and holds
 * back those after it; but again for a new file, or a new read of it,
 * which gives a new key, and when the user asks, with `resume`, after a
 * Stop or a crash of the worker, the one failure a new
 * calculation is offered for: popnei's refusal and a file that could not
 * be read again fail the same way again, and a page that could not start
 * its calculations, a page out of date or a defect of ours ask for a
 * reload. The entry calls `sync` after every change of the store, and the
 * page reads what changes here, which no change of the store tells,
 * through `subscribe` and `getVersion`. Plain TypeScript, so that a test
 * in node drives it on the real store.
 */

import type { Key } from "../core/keys.ts";
import type { AnalysisId } from "../core/project.ts";
import type { AnalysisStatus, Store } from "../core/store.ts";

/** What the analyses started by themselves need of the store. */
export type AutoRunStore = Pick<
  Store<unknown, unknown>,
  "getState" | "cancelRun"
>;

/** The analyses a page starts by itself. */
export interface AutoRuns {
  /** Starts the first analysis that can run and is not held back, under
      a key it has not been started under, or that `resume` gave back;
      nothing while one of them runs. */
  sync(): void;
  /** Whether the analysis was started under `key` and is not to be
      started again by itself: an analysis that can run under such a key
      was stopped. */
  startedUnder(key: Key): boolean;
  /** Stops the calculation in flight of each of `group`, one of the
      groups, at the user's Stop of it, the one Stop of the box on
      popgen2.html: the one running is left ready under a key it was
      started under, so
      neither it nor those after it start again by themselves. Once every
      analysis before the group is done, those of the group not started
      are recorded as started too, so that one about to start, between the
      end of one pass and the start of the next, does not start. */
  stop(group: readonly AnalysisId[]): void;
  /** Starts again, at the user's start again of `group`, one of the
      groups, after a Stop or a crash of the worker, the first of it that
      is not done, under the key it is ready under or crashed under, and
      gives back those after it in the group that are not done, which
      then start by themselves, one after the other. Returns whether it
      started one. It starts nothing, and returns false, when one of the
      analyses of every group runs; when one before the group is not
      done; when every one of the group is done; and when the first not
      done is locked, or in error from anything but a crash of the
      worker. */
  resume(group: readonly AnalysisId[]): boolean;
  /** Calls `listener` after every change of what this knows beyond the
      store, which keys were started and which were given back; returns
      the function that stops it. A property made once, so that React
      keeps it. */
  readonly subscribe: (listener: () => void) => () => void;
  /** A number that changes at every such change, for React's
      `useSyncExternalStore`, with `subscribe`. A property made once, as
      `subscribe` is. */
  readonly getVersion: () => number;
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

/** Whether `status` is an error that does not hold back those after it
    in its group: a failure that is not popnei's refusal nor a variants
    file the browser could not read again, as the store's own rule of what
    it starts. */
function isMendable(status: AnalysisStatus<unknown>): boolean {
  return (
    status.kind === "error" &&
    status.error.kind === "failed" &&
    status.error.error.kind !== "reopenFailed"
  );
}

/** The key under which `status` can be started again at the user's
    asking: that of a startable status or of a crash of the worker, the
    one failure a new calculation is offered for, as the box offers its
    Start again (`buttonOf` of variants/VariantsSummary.tsx); `null` for
    any other. */
function againKey(status: AnalysisStatus<unknown>): Key | null {
  if (status.kind === "error") {
    return status.error.kind === "failed" &&
      status.error.error.kind === "workerFailed"
      ? status.key
      : null;
  }
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
  /** The page's listeners, told of every change of `started` and
      `resumed`, and the number that counts those changes. */
  const listeners = new Set<() => void>();
  let version = 0;

  function changed(): void {
    version += 1;
    for (const listener of [...listeners]) listener();
  }

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
    changed();
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

  /** The analysis `resume` of `group` would start, with the key it
      would start it under and its place in the group; `null` when it
      would start none. */
  function resumable(group: readonly AnalysisId[]): {
    readonly id: AnalysisId;
    readonly key: Key;
    readonly at: number;
  } | null {
    const place = placeOf(group);
    if (anyRunning()) return null;
    if (ids.slice(0, place).some((id) => statusOf(id).kind !== "done")) {
      return null;
    }
    const at = group.findIndex((id) => statusOf(id).kind !== "done");
    const first = group[at];
    if (first === undefined) return null;
    const key = againKey(statusOf(first));
    return key === null ? null : { id: first, key, at };
  }

  function stop(group: readonly AnalysisId[]): void {
    const place = placeOf(group);
    // A group waits for those before it: while one of them is not done,
    // none of the group is about to start, and a Stop of it leaves them
    // waiting.
    const free = ids
      .slice(0, place)
      .every((id) => statusOf(id).kind === "done");
    for (const id of group) {
      resumed.delete(id);
      const status = statusOf(id);
      if (status.kind === "running") store.cancelRun(id);
      const key = startableKey(status);
      if (free && key !== null) started.add(key);
    }
    changed();
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
          changed();
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
    startedUnder: (key) =>
      started.has(key) && ![...resumed.values()].includes(key),
    stop,
    resume: (group) => {
      const first = resumable(group);
      if (first === null) return false;
      for (const id of group.slice(first.at + 1)) {
        const back = againKey(statusOf(id));
        if (back !== null) resumed.set(id, back);
      }
      if (startOne(first.id, first.key)) return true;
      for (const id of group) resumed.delete(id);
      changed();
      return false;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getVersion: () => version,
  };
}
