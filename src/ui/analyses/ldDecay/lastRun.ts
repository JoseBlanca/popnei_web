/**
 * The time of the last run of an analysis of popgen2.html, for the LD
 * decay, whose tab says it beside its button so that the user knows what
 * a change will cost them, as the owner decided on 12 October 2026
 * (docs/specs/steps/popgen2-populations.md, "The LD decay", "Run, Stop
 * and the time of the last run"): from the start of a run, the moment
 * the page asked the calculation worker for it, which `runs.ts` notes
 * and the store shows as the run under way, to the moment the store
 * shows it done or in error, the last such run of the variants file
 * open. A wait for the worker is in it: after another LD decay or a
 * large PCA, the start of a new worker and its opening of the variants
 * file, which every run after those pays. A run stopped, or left behind
 * by a change, which ends with neither, changes nothing; another
 * variants file forgets it.
 *
 * One clock for the page, made by its entry beside the analyses it
 * starts by itself, before any run, and given to the tab through
 * `LastRunProvider`, so that no drawing of a component makes it or
 * subscribes it to the store.
 */
import { createContext, useContext, useSyncExternalStore } from "react";

import { ldDecayOptions } from "../../../core/analyses/ldDecay.ts";
import type { AnalysisId } from "../../../core/project.ts";
import type { AppState } from "../../../core/store.ts";

/** What the clock reads of the store of the page. */
export interface ClockStore {
  /** The state now. */
  readonly getState: () => AppState<unknown, unknown>;
  /** Calls the listener after every change. */
  readonly subscribe: (listener: () => void) => () => void;
}

/** The last run of the LD decay that ended with a result or an error. */
export interface LastRun {
  /** The seconds it took. */
  readonly seconds: number;
  /** Its largest distance, in base pairs, which its time grows with, as
      the project held it when it started; `null` for a project with no
      distance, which no run of the LD decay has. */
  readonly maxDist: number | null;
}

/** The time of the last run of one analysis. */
export interface LastRunClock {
  /** The last run that ended with a result or an error, for the variants
      file open; `null` before one. The same object until another such
      run ends or another file is opened. */
  readonly last: () => LastRun | null;
  /** Calls `listener` when `last` changes; returns the function that
      stops it. */
  readonly subscribe: (listener: () => void) => () => void;
}

/** A second, in the milliseconds of `now`. */
const SECOND_MS = 1000;

/** Makes the clock of the analysis `id` over `store`, reading the time
    with `now`, in milliseconds, `performance.now` on the page, and the
    start of a run with `startOf`, `startedAt` of runs.ts on the page,
    in the same milliseconds, `null` when it has none, when the time the
    clock first sees the run is taken. A run under way when it is made
    is timed from its start. */
export function createLastRunClock(
  store: ClockStore,
  id: AnalysisId,
  now: () => number,
  startOf: (runId: number) => number | null,
): LastRunClock {
  const listeners = new Set<() => void>();
  let last: LastRun | null = null;
  let fileId: string | null = store.getState().project.variants?.fileId ?? null;
  // The run under way that the clock saw start, when it started, and its
  // largest distance.
  let running: {
    readonly runId: number;
    readonly start: number;
    readonly maxDist: number | null;
  } | null = null;
  const runningOf = (
    status:
      AppState<unknown, unknown>["analyses"][number]["status"] | undefined,
  ): void => {
    if (status?.kind === "running" && running?.runId !== status.runId) {
      running = {
        runId: status.runId,
        start: startOf(status.runId) ?? now(),
        maxDist: ldDecayOptions(store.getState().project, "popgen2").maxDist,
      };
    }
  };
  runningOf(store.getState().analyses.find((a) => a.id === id)?.status);

  const set = (next: LastRun | null): void => {
    if (next === last) return;
    last = next;
    for (const listener of [...listeners]) listener();
  };

  store.subscribe(() => {
    const s = store.getState();
    const file = s.project.variants?.fileId ?? null;
    if (file !== fileId) {
      fileId = file;
      running = null;
      set(null);
    }
    const status = s.analyses.find((a) => a.id === id)?.status;
    if (status?.kind === "running") {
      runningOf(status);
      return;
    }
    const ended = running;
    running = null;
    if (
      ended !== null &&
      (status?.kind === "done" || status?.kind === "error")
    ) {
      set({
        seconds: (now() - ended.start) / SECOND_MS,
        maxDist: ended.maxDist,
      });
    }
  });

  return {
    last: () => last,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const LastRunContext = createContext<LastRunClock | null>(null);

/** Gives the clock of the LD decay of the page to the screens under
    it. */
export const LastRunProvider = LastRunContext.Provider;

/** The last run of the LD decay, from the clock of the `LastRunProvider`
    above, drawn again when it changes; `null` before one. Throws a
    defect outside a `LastRunProvider`. */
export function useLastRun(): LastRun | null {
  const clock = useContext(LastRunContext);
  if (clock === null) {
    throw new Error("popnei_web defect: useLastRun outside a LastRunProvider");
  }
  return useSyncExternalStore(clock.subscribe, clock.last);
}
