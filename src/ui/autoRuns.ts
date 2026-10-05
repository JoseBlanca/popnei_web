/**
 * The analyses a page starts by itself (docs/plans/open-variants.md, "It
 * runs on its own once the file is read"): the summary of the variants
 * file of popgen2.html starts as soon as it can run, with no Run button,
 * since the user opened the file to see what it holds. It starts once
 * for each key: not again after a failure, nor after a Stop, which leave
 * the analysis in error or ready under the same key, but again for a new
 * file, or a new read of it, which gives a new key, and when the user
 * asks, with `again`. The entry calls `sync` after every change of the
 * store. Plain TypeScript, so that a test in node drives it on the real
 * store.
 */

import type { Key } from "../core/keys.ts";
import type { AnalysisId } from "../core/project.ts";
import type { AnalysisStatus, Store } from "../core/store.ts";

/** What the analyses started by themselves need of the store. */
export type AutoRunStore = Pick<Store<unknown, unknown>, "getState">;

/** The analyses a page starts by itself. */
export interface AutoRuns {
  /** Starts each of the analyses that can run under a key it has not
      been started under. */
  sync(): void;
  /** Starts the analysis `id` again, at the user's Count again, after a
      Stop or a failure that a new calculation may mend; nothing when the
      store does not start it. */
  again(id: AnalysisId): void;
  /** Whether the analysis was started under `key`: an analysis that can
      run under a key it was started under was stopped. */
  startedUnder(key: Key): boolean;
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

/**
 * The analyses `ids` of the store, started by `start`, which is
 * `startAnalysis` of runs.ts on the page and gives `null` when the store
 * starts nothing. A promise it gives that rejects, a defect of ours, is
 * left to the window's handler and the error bar, as a Run button leaves
 * it.
 */
export function createAutoRuns(deps: {
  readonly store: AutoRunStore;
  readonly ids: readonly AnalysisId[];
  readonly start: (id: AnalysisId) => Promise<void> | null;
}): AutoRuns {
  const { store, ids, start } = deps;
  const started = new Set<Key>();

  function startOne(id: AnalysisId, key: Key): void {
    started.add(key);
    void start(id);
  }

  return {
    sync: () => {
      for (const id of ids) {
        const view = store.getState().analyses.find((a) => a.id === id);
        if (view === undefined) {
          throw new Error(
            `popnei_web defect: the store has no analysis ${id} to start by itself.`,
          );
        }
        const key = startableKey(view.status);
        if (key !== null && !started.has(key)) startOne(id, key);
      }
    },
    again: (id) => {
      const view = store.getState().analyses.find((a) => a.id === id);
      if (view === undefined) return;
      const status = view.status;
      const key =
        startableKey(status) ?? (status.kind === "error" ? status.key : null);
      if (key !== null) startOne(id, key);
    },
    startedUnder: (key) => started.has(key),
  };
}
