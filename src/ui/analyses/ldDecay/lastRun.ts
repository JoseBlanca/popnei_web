/**
 * The time of the last run of an analysis of popgen2.html, for the LD
 * decay, whose tab says it beside its button so that the user knows what
 * a change will cost them, as the owner decided on 12 October 2026
 * (docs/specs/steps/popgen2-populations.md, "The LD decay", "Run, Stop
 * and the time of the last run"): the time from the moment the store
 * first shows a run of it under way to the moment it shows that run done
 * or in error, the last such run of the variants file open. A run
 * stopped, or left behind by a change, which ends with neither, changes
 * nothing; another variants file forgets it.
 *
 * One clock for each store and analysis, made by the first component
 * that asks for it, `lastRunClockOf`, and kept for as long as the page
 * lives: the tab's view, mounted before the first Run of the LD decay,
 * which only that view offers, and kept while another tab is shown.
 */
import type { AnalysisId } from "../../../core/project.ts";
import type { AppState } from "../../../core/store.ts";

/** What the clock reads of the store of the page. */
export interface ClockStore {
  /** The state now. */
  readonly getState: () => AppState<unknown, unknown>;
  /** Calls the listener after every change. */
  readonly subscribe: (listener: () => void) => () => void;
}

/** The time of the last run of one analysis. */
export interface LastRunClock {
  /** The seconds the last run that ended with a result or an error took,
      for the variants file open; `null` before one. The same number
      until another such run ends or another file is opened. */
  readonly seconds: () => number | null;
  /** Calls `listener` when `seconds` changes; returns the function that
      stops it. */
  readonly subscribe: (listener: () => void) => () => void;
}

/** A second, in the milliseconds of `now`. */
const SECOND_MS = 1000;

/** Makes the clock of the analysis `id` over `store`, reading the time
    with `now`, in milliseconds, `performance.now` on the page. */
export function createLastRunClock(
  store: ClockStore,
  id: AnalysisId,
  now: () => number,
): LastRunClock {
  const listeners = new Set<() => void>();
  let seconds: number | null = null;
  let fileId: string | null = store.getState().project.variants?.fileId ?? null;
  // The run under way that the clock saw start, and when.
  let running: { readonly runId: number; readonly start: number } | null = null;

  const set = (next: number | null): void => {
    if (next === seconds) return;
    seconds = next;
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
      if (running?.runId !== status.runId) {
        running = { runId: status.runId, start: now() };
      }
      return;
    }
    const ended = running;
    running = null;
    if (
      ended !== null &&
      (status?.kind === "done" || status?.kind === "error")
    ) {
      set((now() - ended.start) / SECOND_MS);
    }
  });

  return {
    seconds: () => seconds,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** The clocks made, by store and analysis. */
const CLOCKS = new WeakMap<ClockStore, Map<AnalysisId, LastRunClock>>();

/** The clock of the analysis `id` over `store`, made at the first call
    and the same object after it, on the clock of `performance.now`. */
export function lastRunClockOf(
  store: ClockStore,
  id: AnalysisId,
): LastRunClock {
  const ofStore = CLOCKS.get(store) ?? new Map<AnalysisId, LastRunClock>();
  CLOCKS.set(store, ofStore);
  const known = ofStore.get(id);
  if (known !== undefined) return known;
  const made = createLastRunClock(store, id, () => performance.now());
  ofStore.set(id, made);
  return made;
}
