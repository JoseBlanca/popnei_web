/**
 * The analyses a page starts by itself (docs/plans/open-variants.md, "It
 * runs on its own once the file is read"): the summary of the variants file
 * of popgen2.html, whose one pass gives the count of the variants and the
 * statistics of the open file, starts as soon as it can run, with no Run
 * button, since the user opened the file to see what it holds
 * (docs/plans/live-stats.md).
 *
 * They are given in groups, each the analyses a Stop of a group stops
 * together and its start again starts again; popgen2.html has three: the one
 * pass, which the Stop and the Start again of its box act on, and the PCA
 * and the diversity, each a group of its own that starts by itself only once
 * live (below). They start one at a time, in their order, since the one
 * calculation worker runs one request at a time and the store has no state
 * for a request that waits in the client's queue. An analysis starts once
 * every one before it is done or locked, a locked analysis starting nothing
 * and holding back nothing; within its group, one before it that failed in a
 * way a new calculation may mend, a crash or a defect of ours, does not hold
 * it back, since each analysis of a group is shown apart and a failure of
 * one should not hide the other. popnei's refusal, or a variants file the
 * browser could not read again, holds back those after it, since they would
 * fail the same way after a pass of minutes; and a group starts only once
 * every analysis of the groups before it is done or locked, but for a live
 * analysis, which waits for the groups before it that hold no live analysis,
 * the one pass, and for no group of another live analysis, whatever its
 * state (below).
 *
 * Each starts once for each key: not again after a failure, nor after a
 * Stop, which leaves it ready under a key it was started under and holds
 * back those after it; but again for a new file, or a new read of it, which
 * gives a new key, and when the user asks, with `resume`, after a Stop or a
 * crash of the worker, the one failure a new calculation is offered for:
 * popnei's refusal and a file that could not be read again fail the same way
 * again, and a page that could not start its calculations, a page out of
 * date or a defect of ours ask for a reload. The entry calls `sync` after
 * every change of the store, and the page reads what changes here, which no
 * change of the store tells, through `subscribe` and `getVersion`. Plain
 * TypeScript, so that a test in node drives it on the real store.
 *
 * A live analysis, the PCA or the diversity of popgen2.html, is a group of
 * its own that starts by itself only once the user's Run made it live for
 * the load of the variants file open, and then again after each change of
 * what its key holds, a quiet second after the user stops changing things
 * (docs/specs/steps/popgen2-pca.md, "The PCA calculated again by itself";
 * docs/designs/no-undo.md, choices 1 to 3). The second runs from the latest
 * of the last change of the project and the end of the last change under way
 * that the gate of the page counts, a change of the project being one that
 * changes the key of an analysis that can be live or the reason it is
 * locked, and no other (since 12 October 2026); the analysis starts when it runs out,
 * under the key the store gives then, while nothing runs, no write of the
 * filtered variants runs and no change is under way. It starts once for each
 * key the project gives: a key the store leaves behind is forgotten, so a
 * value set back is calculated again. A Stop, `pause`, ends the live state,
 * and another load ends it too; so does a failure the page's `endsLive`
 * names, by the rule of each analysis, while every other failure leaves it
 * live, for the next change of its key to try again.
 *
 * Several analyses can be live at once, each a group of its own, the PCA and
 * then the diversity on popgen2.html, each live from its own Run
 * (docs/specs/steps/popgen2-pca.md, "Several analyses calculated again by
 * themselves"; docs/designs/population-tab.md). One quiet second serves them
 * all: when it runs out, the first live analysis about to start starts, and
 * each next one when the one before it ends, with no second more. A live
 * analysis waits for the one pass and for a calculation running, and for
 * nothing else: whatever the state of another live analysis, not live,
 * stopped, locked, done or failed, it does not hold it back. A Run while a
 * calculation runs makes its analysis live and waiting, and sends nothing
 * until that calculation ends; a Stop of one starts the quiet second again,
 * so that the others start a second after it; Stop all, `pauseAll`, ends
 * every live state.
 */

import type { Key } from "../core/keys.ts";
import type { AnalysisId } from "../core/project.ts";
import type { AnalysisStatus, AppState, Store } from "../core/store.ts";
import type { RunGate } from "./variants/thresholdRun.ts";

/** What the analyses started by themselves need of the store. */
export type AutoRunStore = Pick<
  Store<unknown, unknown>,
  "getState" | "cancelRun" | "subscribe"
>;

/** The quiet second: how long after the last change of the project, or
    the end of the last change under way, a live analysis starts again
    by itself, in milliseconds (docs/specs/steps/popgen2-pca.md, "The
    PCA calculated again by itself"). */
export const LIVE_QUIET_MS = 1000;

/** What the analyses that start again by themselves read of the changes
    the user has under way: the gate of the page, `createRunGate` of
    variants/thresholdRun.ts, whose listeners are told when the count
    rises from 0 or falls to 0, and when a kind of hold, a control in use
    or the dialog of the download, comes to be held or no longer is. */
export type ChangesUnderWay = Pick<
  RunGate,
  "underWay" | "subscribe" | "heldBy"
>;

/** What the start by itself of a live analysis about to start waits
    for: "afterCrash", a crash of the worker ended another live state and
    holds this start until the next change of the project or a Run of
    this analysis, whether another calculation runs or not, which wins
    over the three others, since the end of that calculation does not
    start it; "behind", another calculation that runs, whether the quiet
    second has run out or not, which wins over the two others;
    "download", the dialog of the download of the filtered variants
    open, or the write it started running; "changes", the quiet second
    after the last change, or a change under way of a control, nothing
    running. */
export type AboutToStart = "changes" | "download" | "behind" | "afterCrash";

/** The live state of an analysis that starts again by itself, for the
    load of the variants file open, as the page draws it. */
export type LiveState =
  /** Not live, and not stopped by the user: before its first Run for
      the load. */
  | { readonly kind: "off" }
  /** The user's Stop ended its live state, and no Run since. */
  | { readonly kind: "stopped" }
  /** A failure the page's `endsLive` names ended its live state, and no
      Run since. */
  | { readonly kind: "endedByFailure" }
  /** Live: what its start by itself waits for while it is about to
      start, `null` while it is not; whether it runs; and the analysis
      its line of waiting names, `after`. */
  | {
      readonly kind: "live";
      readonly aboutToStart: AboutToStart | null;
      readonly running: boolean;
      /** While it is about to start: under "behind", the live analysis
          that runs; under "changes" or "download", the live analysis
          about to start before it in the order; `null` when none, and
          while it is not about to start. */
      readonly after: AnalysisId | null;
    };

/** The analyses a page starts again by itself once the user's Run made
    them live, and what their start reads. */
export interface LiveDeps {
  /** The analyses that can be live, the PCA and the diversity on
      popgen2.html, each in one of the groups; they start by themselves
      only while live. */
  readonly analyses: readonly AnalysisId[];
  /** The changes under way, which hold the quiet second. */
  readonly changes: ChangesUnderWay;
  /** Starts the analysis at the user's Run, through the gate of the
      page, so that a run of the arrow keys waiting is made a change
      first: `startAnalysis` of runs.ts on the screens' store. */
  readonly runStart: (id: AnalysisId) => Promise<void> | null;
  /** The quiet second, `LIVE_QUIET_MS` on the page. */
  readonly quietMs: number;
  /** Whether the failure of the live analysis `id` in `state` ends its
      live state: on popgen2.html `popgen2EndsLive` of popgen2Store.ts,
      which gives each analysis its own rule; false for a state that is
      not an error. After such a failure the other live analyses about to
      start wait the quiet second, as after a Stop; after a crash of the
      worker, which may be for lack of memory that WebKit still holds,
      they start by themselves only after the next change of the
      project. */
  readonly endsLive: (
    state: AppState<unknown, unknown>,
    id: AnalysisId,
  ) => boolean;
}

/** What the page is told of the live analyses beyond the store, which
    the status region says. */
export type LiveEvent =
  /** `id` started by itself; `round`, the live analyses about to start
      at this start, in their order, `id` first, at the first start of a
      round, the starts by themselves between two runs-out of the quiet
      second; empty at a later start of the same round. */
  | {
      readonly kind: "startedByItself";
      readonly id: AnalysisId;
      readonly round: readonly AnalysisId[];
    }
  /** A Run that waited behind another calculation, at its start. */
  | { readonly kind: "startedAfterWaiting"; readonly id: AnalysisId }
  /** The user's Stop of `id`, `pause`, in its tab or in the band. */
  | { readonly kind: "paused"; readonly id: AnalysisId }
  /** Stop all, `pauseAll`: `ids`, the analyses whose live state it
      ended, in their order. */
  | { readonly kind: "pausedAll"; readonly ids: readonly AnalysisId[] }
  /** A crash of the worker ended a live state and holds `ids`, the live
      analyses about to start then, in their order, until the next
      change of the project or their own Run: told once, at the crash,
      so that a Run that waited for the analysis that crashed, said as
      waiting, is said not to have started. */
  | { readonly kind: "heldAfterCrash"; readonly ids: readonly AnalysisId[] };

/** The answer to the user's Run of a live analysis: "started" at once;
    "waiting", made live behind a calculation that runs, which it starts
    after; "kept", made live with nothing started nor waiting, since the
    store starts nothing for it now, done, locked or held back by the one
    pass, so that it starts by itself after the next change of its key;
    "refused", while a write of the filtered variants runs, with nothing
    made live. */
export type RunAnswer = "started" | "waiting" | "kept" | "refused";

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
      analysis before the group is done or locked, those of the group not started
      are recorded as started too, so that one about to start, between the
      end of one pass and the start of the next, does not start. */
  stop(group: readonly AnalysisId[]): void;
  /** Starts again, at the user's start again of `group`, one of the
      groups, after a Stop or a crash of the worker, the first of it that
      is neither done nor locked, under the key it is ready under or
      crashed under, and gives back those after it in the group that are
      not done, which then start by themselves, one after the other.
      Returns whether it started one. It starts nothing, and returns
      false, when one of the analyses of every group runs; when one
      before the group is neither done nor locked; when every one of the
      group is done or locked; and when the first neither done nor locked
      is in error from anything but a crash of the worker. */
  resume(group: readonly AnalysisId[]): boolean;
  /** Calls `listener` after every change of what this knows beyond the
      store, which keys were started and which were given back, and after
      every change of the `liveState` of a live analysis, also one that a
      change of the store or of the gate made, a filter changed, a new
      load, the dialog of the download opened; returns the function that
      stops it. So a screen reads `liveState` with this subscription
      alone. A property made once, so that React keeps it. */
  readonly subscribe: (listener: () => void) => () => void;
  /** A number that changes at every such change, for React's
      `useSyncExternalStore`, with `subscribe`. A property made once, as
      `subscribe` is. */
  readonly getVersion: () => number;
  /** The user's Run of the live analysis `id`: makes it live for the
      load of the variants file open and starts it at once, through the
      gate, "started", whatever else is about to start, which then waits
      after it. While another calculation runs, it makes it live and
      sends nothing, "waiting": it starts when that calculation ends, in
      the order of the live analyses, with no quiet second more, and is
      told then as `startedAfterWaiting`. "kept" when the store would
      start nothing for it, whether another calculation runs or not:
      done, locked, in a failure no new calculation mends, or held back
      by the one pass; it is made live, and starts by itself after the
      next change of its key, told then as any start by itself. Refused,
      "refused" and nothing made live, while a write of the filtered
      variants runs, since the calculation worker runs one request at a
      time and the analysis would wait behind the write shown as running
      (docs/specs/steps/popgen2-download.md, "When the PCA starts by
      itself"). A defect for an id outside the analyses
      that can be live, `LiveDeps.analyses`, whether live now or not. */
  run(id: AnalysisId): RunAnswer;
  /** The user's Stop of the live analysis `id`, in its tab or in the
      band: ends its live state, so that nothing starts it again until
      Run, starts the quiet second again, so that the other live
      analyses start a second after it and not at once, and then cancels
      its run, if one is in flight. */
  pause(id: AnalysisId): void;
  /** Stop all: ends the live state of every live analysis, and cancels
      the run of the one running, if one is live; no quiet second, since
      nothing is left live. */
  pauseAll(): void;
  /** Whether `id` is live for the load of the variants file open. */
  isLive(id: AnalysisId): boolean;
  /** What `id` waits for while it is about to start by itself, live,
      ready under a key it was not started under, and the one pass done:
      "afterCrash" while a crash holds it, whatever runs; "behind" while
      another calculation runs; during the quiet second and
      for as long as a change under way, or a write, holds it, "download"
      while the dialog of the download is open or its write runs,
      "changes" otherwise. `null` while it is not about to start. */
  aboutToStart(id: AnalysisId): AboutToStart | null;
  /** The live state of `id` now, the same object for as long as it does
      not change, so that React's `useSyncExternalStore` reads it with
      `subscribe`. */
  liveState(id: AnalysisId): LiveState;
  /** Whether the user's Stop ended the live state of `id` for the load
      open, and no Run since. */
  stoppedByUser(id: AnalysisId): boolean;
  /** Calls `listener` at each start by itself of a live analysis, at
      the start of a Run that waited, at each Stop of one, at Stop all,
      and at a crash that holds others; returns the function that stops
      it. */
  readonly onLive: (listener: (event: LiveEvent) => void) => () => void;
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

/** Whether `status` is passed over by its group: done, or locked, since
    a locked member starts nothing and holds back nothing
    (docs/architecture.md, section 5). */
function isPassedOver(status: AnalysisStatus<unknown>): boolean {
  return status.kind === "done" || status.kind === "locked";
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

/** Whether `status` is a crash of the calculation worker. */
function isCrash(status: AnalysisStatus<unknown>): boolean {
  return (
    status.kind === "error" &&
    status.error.kind === "failed" &&
    status.error.error.kind === "workerFailed"
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
 * `null` when the store starts nothing; and `live`, the analyses that
 * start again by themselves once the user's Run made them live, each in
 * one of the groups, with what their start reads, the gate's changes
 * under way, the start through the gate at Run, the quiet second and
 * the failures that end the live state, or `null` for none. A promise
 * `start` gives that rejects,
 * a defect of ours, is left to the window's handler and the error bar, as
 * a Run button leaves it. A defect when a group is empty, an analysis
 * is in two places, or a live analysis is in no group.
 */
export function createAutoRuns(deps: {
  readonly store: AutoRunStore;
  readonly groups: readonly (readonly AnalysisId[])[];
  readonly start: (id: AnalysisId) => Promise<void> | null;
  /** The analyses that start again by themselves once live, the PCA of
      popgen2.html; `null` for none. */
  readonly live: LiveDeps | null;
}): AutoRuns {
  const { store, groups, start, live } = deps;
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
    // The live state is told with every change, so a change that
    // `tellLiveChanges` compares next is with what was told now.
    for (const id of liveIds) toldLive.set(id, liveStateNow(id));
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
      back: one neither done nor locked, but for a mendable error of its
      own group; `null` when none does. A live analysis is held back only
      by the groups before it that hold no live analysis, the one pass,
      and by no group of an analysis that can be live, whatever that
      analysis's state (docs/designs/population-tab.md, "For the session
      that builds it", point 1). */
  function holderOf(id: AnalysisId, index: number): AnalysisId | null {
    const own = groupOf.get(id);
    for (const before of ids.slice(0, index)) {
      if (liveIds.has(id) && liveGroups.has(groupOf.get(before) ?? -1)) {
        continue;
      }
      const status = statusOf(before);
      if (isPassedOver(status)) continue;
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
    if (ids.slice(0, place).some((id) => !isPassedOver(statusOf(id)))) {
      return null;
    }
    const at = group.findIndex((id) => !isPassedOver(statusOf(id)));
    const first = group[at];
    if (first === undefined) return null;
    const key = againKey(statusOf(first));
    return key === null ? null : { id: first, key, at };
  }

  function stop(group: readonly AnalysisId[]): void {
    const place = placeOf(group);
    // A group waits for those before it: while one of them is neither
    // done nor locked, none of the group is about to start, and a Stop of
    // it leaves them waiting.
    const free = ids.slice(0, place).every((id) => isPassedOver(statusOf(id)));
    for (const id of group) {
      resumed.delete(id);
      const status = statusOf(id);
      if (status.kind === "running") store.cancelRun(id);
      const key = startableKey(status);
      if (free && key !== null) started.add(key);
    }
    changed();
  }

  /** The live analyses, by id, and their state of their own. */
  const liveIds = new Set<AnalysisId>(live?.analyses ?? []);
  /** The places in `groups` of the groups that hold a live analysis. */
  const liveGroups = new Set<number>();
  for (const id of liveIds) {
    const place = groupOf.get(id);
    if (place === undefined) {
      throw new Error(
        `popnei_web defect: the live analysis ${id} is in no group of the analyses started by themselves.`,
      );
    }
    liveGroups.add(place);
  }
  /** The live analyses in the order they start, that of the groups. */
  const liveOrder = ids.filter((id) => liveIds.has(id));
  /** The load of the variants file each live analysis is live for. */
  const liveFor = new Map<AnalysisId, string>();
  /** The load for which the user's Stop ended each one's live state. */
  const pausedFor = new Map<AnalysisId, string>();
  /** The load for which a failure ended each one's live state. */
  const failedFor = new Map<AnalysisId, string>();
  /** The key each live analysis was last started under, kept while the
      store gives it that key. */
  const liveStarted = new Map<AnalysisId, Key>();
  const liveListeners = new Set<(event: LiveEvent) => void>();
  /** The kind of the status of each live analysis at the last change of
      the store, from which a failure is told when it comes. */
  const lastKinds = new Map<AnalysisId, AnalysisStatus<unknown>["kind"]>();
  /** The live state last told to the listeners of `subscribe`, and the
      one last given by `liveState`, by analysis. */
  const toldLive = new Map<AnalysisId, LiveState>();
  const givenLive = new Map<AnalysisId, LiveState>();
  /** The live analyses a Run made live behind a calculation that ran,
      neither started nor held by a crash since, whose start is told as
      `startedAfterWaiting`. */
  const waitedRun = new Set<AnalysisId>();
  /** Whether the first start by itself since the quiet second last ran
      out has been told with its round. */
  let roundTold = false;
  /** Whether the quiet second has run out since the last change of the
      project and the end of the last change under way. */
  let quiet = true;
  /** Whether a crash of the worker ended a live state since the last
      change of the project: no quiet second runs until that change. */
  let heldAfterCrash = false;
  /** The live analyses a Run made start again while a crash held the
      others: the hold is lifted for them alone, until the next change
      of the project. */
  const runSinceCrash = new Set<AnalysisId>();
  let quietTimer: ReturnType<typeof setTimeout> | null = null;
  let lastProject = store.getState().project;

  /** What the analyses that can be live are calculated from, as the
      store gives it: for each, its key, or the reason it is locked. A
      new project is a change for the live analyses only when it changes
      this, so that a change of what no key holds, the measure of the
      heatmap of the distances or the colour of the points of the PCA,
      neither puts a start off nor lifts the hold after a crash
      (docs/specs/steps/popgen2-pca.md, "The PCA calculated again by
      itself"). */
  function inputsNow(): string {
    return liveOrder
      .map((id) => {
        const status = statusOf(id);
        return status.kind === "locked"
          ? `locked: ${status.reason}`
          : status.key;
      })
      .join("\n");
  }
  let lastInputs = live === null ? "" : inputsNow();

  function tellLive(event: LiveEvent): void {
    for (const listener of [...liveListeners]) listener(event);
  }

  function liveDefect(id: AnalysisId): void {
    if (!liveIds.has(id)) {
      throw new Error(
        `popnei_web defect: ${id} is not an analysis that starts again by itself.`,
      );
    }
  }

  function fileIdNow(): string | null {
    return store.getState().project.variants?.fileId ?? null;
  }

  function isLive(id: AnalysisId): boolean {
    const fileId = fileIdNow();
    return fileId !== null && liveFor.get(id) === fileId;
  }

  /** Starts the quiet second again, when no change is under way and no
      crash holds the starts; with one under way, the second waits for
      its end, and after a crash for the next change of the project. */
  function quietAgain(): void {
    if (quietTimer !== null) clearTimeout(quietTimer);
    quietTimer = null;
    quiet = false;
    if (live === null || heldAfterCrash || live.changes.underWay() > 0) {
      return;
    }
    quietTimer = setTimeout(() => {
      quietTimer = null;
      quiet = true;
      // A new round: its first start by itself tells the analyses
      // about to start.
      roundTold = false;
      sync();
    }, live.quietMs);
  }

  function writeRunning(): boolean {
    return store.getState().write?.kind === "running";
  }

  /** The key the live analysis `id` would start under now, its status
      being `status`: ready under a key it was not started under, every
      analysis before it done; `null` otherwise. */
  function liveKey(
    id: AnalysisId,
    index: number,
    status: AnalysisStatus<unknown>,
  ): Key | null {
    if (!isLive(id)) return null;
    const key = startableKey(status);
    if (key === null || liveStarted.get(id) === key) return null;
    return holderOf(id, index) === null ? key : null;
  }

  /** Whether the live analysis `id` is about to start: live, ready
      under a key it was not started under, the one pass done. */
  function isAboutToStart(id: AnalysisId): boolean {
    return live !== null && liveKey(id, ids.indexOf(id), statusOf(id)) !== null;
  }

  /** The analysis of the groups that runs, `null` when none does. */
  function runningId(): AnalysisId | null {
    return ids.find((id) => statusOf(id).kind === "running") ?? null;
  }

  /** What the start of `id` about to start waits for, and the analysis
      its line names; `null` when it is not about to start. */
  function waitOf(id: AnalysisId): {
    readonly waits: AboutToStart;
    readonly after: AnalysisId | null;
  } | null {
    if (live === null || !isAboutToStart(id)) return null;
    // Held after a crash, it does not start when the calculation that
    // runs ends, so it is not said to wait behind it.
    const held = heldAfterCrash && !runSinceCrash.has(id);
    const running = runningId();
    if (running !== null && !held) {
      return { waits: "behind", after: liveIds.has(running) ? running : null };
    }
    const waits = held
      ? "afterCrash"
      : live.changes.heldBy("download") || writeRunning()
        ? "download"
        : "changes";
    const before = liveOrder
      .slice(0, liveOrder.indexOf(id))
      .find((other) => isAboutToStart(other));
    return { waits, after: before ?? null };
  }

  /** What the start of `id` about to start waits for; `null` when it is
      not about to start. */
  function aboutToStart(id: AnalysisId): AboutToStart | null {
    return waitOf(id)?.waits ?? null;
  }

  /** Ends the live state of `id` for the load open, by the user's Stop
      or by a failure. */
  function endLive(id: AnalysisId, by: "user" | "failure"): void {
    liveFor.delete(id);
    waitedRun.delete(id);
    pausedFor.delete(id);
    failedFor.delete(id);
    const fileId = fileIdNow();
    if (fileId !== null) {
      (by === "user" ? pausedFor : failedFor).set(id, fileId);
    }
  }

  function stoppedByUser(id: AnalysisId): boolean {
    const fileId = fileIdNow();
    return fileId !== null && pausedFor.get(id) === fileId && !isLive(id);
  }

  /** Whether a failure ended the live state of `id` for the load open,
      and no Run since. */
  function endedByFailure(id: AnalysisId): boolean {
    const fileId = fileIdNow();
    return fileId !== null && failedFor.get(id) === fileId && !isLive(id);
  }

  /** The live state of `id` now, a new object. */
  function liveStateNow(id: AnalysisId): LiveState {
    if (isLive(id)) {
      const wait = waitOf(id);
      return {
        kind: "live",
        aboutToStart: wait?.waits ?? null,
        running: statusOf(id).kind === "running",
        after: wait?.after ?? null,
      };
    }
    if (stoppedByUser(id)) return { kind: "stopped" };
    return endedByFailure(id) ? { kind: "endedByFailure" } : { kind: "off" };
  }

  function sameLiveState(a: LiveState, b: LiveState): boolean {
    return (
      a.kind === b.kind &&
      (a.kind !== "live" ||
        b.kind !== "live" ||
        (a.aboutToStart === b.aboutToStart &&
          a.running === b.running &&
          a.after === b.after))
    );
  }

  /** Tells the listeners of `subscribe` when the live state of a live
      analysis changed since they were last told, by a change of the
      store or of the gate. */
  function tellLiveChanges(): void {
    let differs = false;
    for (const id of liveIds) {
      const now = liveStateNow(id);
      const told = toldLive.get(id);
      if (told === undefined || !sameLiveState(told, now)) {
        toldLive.set(id, now);
        differs = true;
      }
    }
    if (differs) changed();
  }

  if (live !== null) {
    for (const id of liveIds) toldLive.set(id, liveStateNow(id));
    store.subscribe(() => {
      const state = store.getState();
      let crashed = false;
      for (const id of liveIds) {
        const status = statusOf(id);
        const key = "key" in status ? status.key : null;
        if (liveStarted.has(id) && liveStarted.get(id) !== key) {
          liveStarted.delete(id);
        }
        // A failure that ends the live state, when it comes, with nothing
        // said, since the failure's own words are. The others about to
        // start wait: after a crash, which may be for lack of memory
        // that WebKit still holds, until the next change of the project;
        // after any other failure, the quiet second, as after a Stop.
        const wasError = lastKinds.get(id) === "error";
        lastKinds.set(id, status.kind);
        if (!wasError && isLive(id) && live.endsLive(state, id)) {
          endLive(id, "failure");
          if (isCrash(status)) {
            heldAfterCrash = true;
            crashed = true;
          }
          quietAgain();
        }
      }
      // A change of the store that is no change of the project, the end
      // of the one pass among them, gives keys too, and is no change.
      const inputs = inputsNow();
      if (state.project !== lastProject) {
        lastProject = state.project;
        if (inputs !== lastInputs) {
          heldAfterCrash = false;
          runSinceCrash.clear();
          quietAgain();
        }
      }
      lastInputs = inputs;
      tellLiveChanges();
      const held = crashed
        ? liveOrder.filter((id) => aboutToStart(id) === "afterCrash")
        : [];
      // A Run that waited and is held is said as held: its start, at
      // the next change of the project, is a start by itself.
      for (const id of held) waitedRun.delete(id);
      if (held.length > 0) tellLive({ kind: "heldAfterCrash", ids: held });
    });
    live.changes.subscribe(() => {
      // Read on each call: the gate tells when its count rises from 0 or
      // falls to 0.
      if (live.changes.underWay() === 0) {
        quietAgain();
      } else {
        if (quietTimer !== null) clearTimeout(quietTimer);
        quietTimer = null;
        quiet = false;
      }
      tellLiveChanges();
    });
  }

  function sync(): void {
    // The calculation worker runs one request at a time, and the
    // store has no state for one that waits in the client's queue.
    if (anyRunning()) return;
    for (const [index, id] of ids.entries()) {
      const status = statusOf(id);
      if (liveIds.has(id)) {
        const key = liveKey(id, index, status);
        if (
          key !== null &&
          (quiet || runSinceCrash.has(id)) &&
          live !== null &&
          live.changes.underWay() === 0 &&
          !writeRunning()
        ) {
          // The round, read before the start, while `id` is still about
          // to start: those about to start after it, in their order.
          const round = liveOrder
            .slice(liveOrder.indexOf(id))
            .filter((other) => other === id || isAboutToStart(other));
          liveStarted.set(id, key);
          const waited = waitedRun.delete(id);
          // Told after the start, so that no listener reads the moment
          // between, neither about to start nor running.
          const sent = start(id);
          changed();
          if (sent === null) return;
          if (waited) {
            tellLive({ kind: "startedAfterWaiting", id });
          } else {
            const told = roundTold ? [] : round;
            // A Run that waited and is named in the round is said there,
            // and not again at its start.
            for (const other of told) waitedRun.delete(other);
            roundTold = true;
            tellLive({ kind: "startedByItself", id, round: told });
          }
          return;
        }
        continue;
      }
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
  }

  return {
    sync,
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
    run: (id) => {
      liveDefect(id);
      const fileId = fileIdNow();
      if (live === null || fileId === null || writeRunning()) {
        return "refused";
      }
      liveFor.set(id, fileId);
      pausedFor.delete(id);
      failedFor.delete(id);
      waitedRun.delete(id);
      if (heldAfterCrash) runSinceCrash.add(id);
      // The calculation worker runs one request at a time: behind one
      // that runs, a Run waits, and `sync` starts it after
      // (docs/designs/population-tab.md, choice 3); but only one that
      // `sync` would start, ready under a key and held back by nothing
      // but the calculation running.
      if (anyRunning()) {
        const index = ids.indexOf(id);
        if (
          startableKey(statusOf(id)) === null ||
          holderOf(id, index) !== null
        ) {
          changed();
          return "kept";
        }
        // The user's Run asks for the key it is ready under, though it
        // was started under it before and stopped.
        liveStarted.delete(id);
        waitedRun.add(id);
        changed();
        sync();
        return "waiting";
      }
      const sent = live.runStart(id);
      const status = statusOf(id);
      if (status.kind === "running") liveStarted.set(id, status.key);
      changed();
      return sent === null ? "kept" : "started";
    },
    pause: (id) => {
      liveDefect(id);
      endLive(id, "user");
      // The others live start a quiet second after the Stop, not at once
      // after the store's change that the cancel makes
      // (docs/designs/population-tab.md, choice 5).
      quietAgain();
      if (statusOf(id).kind === "running") store.cancelRun(id);
      changed();
      tellLive({ kind: "paused", id });
    },
    pauseAll: () => {
      const ended = liveOrder.filter((id) => isLive(id));
      for (const id of ended) endLive(id, "user");
      const running = runningId();
      if (running !== null && ended.includes(running)) {
        store.cancelRun(running);
      }
      changed();
      if (ended.length > 0) tellLive({ kind: "pausedAll", ids: ended });
    },
    isLive: (id) => {
      liveDefect(id);
      return isLive(id);
    },
    aboutToStart: (id) => {
      liveDefect(id);
      return aboutToStart(id);
    },
    liveState: (id) => {
      liveDefect(id);
      const now = liveStateNow(id);
      const given = givenLive.get(id);
      if (given !== undefined && sameLiveState(given, now)) return given;
      givenLive.set(id, now);
      return now;
    },
    stoppedByUser: (id) => {
      liveDefect(id);
      return stoppedByUser(id);
    },
    onLive: (listener) => {
      liveListeners.add(listener);
      return () => {
        liveListeners.delete(listener);
      };
    },
  };
}
