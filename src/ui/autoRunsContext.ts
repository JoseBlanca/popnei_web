/**
 * The analyses popgen2.html starts by itself, `autoRuns` of autoRuns.ts,
 * given to the screens as the store is (store.tsx): the entry of the page
 * makes them once and gives them through `AutoRunsProvider`, and every
 * screen reaches them with `useAutoRuns`, or reads a part of them with
 * the state of the store with `useLive`, never through a prop.
 */
import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";

import type { AppState } from "../core/store.ts";
import type { JobResult } from "../worker/protocol.ts";
import type { AutoRuns } from "./autoRuns.ts";
import { useStore } from "./store.tsx";

const AutoRunsContext = createContext<AutoRuns | null>(null);

/** Gives the analyses the page starts by itself to every component under
    it. */
export const AutoRunsProvider = AutoRunsContext.Provider;

/** The analyses the page starts by itself, read with `subscribe`, so
    that the component that calls it is drawn again at each change of what
    they know beyond the store. Throws a defect outside an
    `AutoRunsProvider`. */
export function useAutoRuns(): AutoRuns {
  const autoRuns = autoRunsOf(useContext(AutoRunsContext));
  useSyncExternalStore(autoRuns.subscribe, autoRuns.getVersion);
  return autoRuns;
}

/**
 * The part that `select` gives of the state of the store and of the
 * analyses the page starts by itself, read again at every change of
 * either; the component is drawn again only when what `select` returns
 * changes, so that a change of what they know that does not change it,
 * a key started, draws nothing. `select` returns a primitive or a part
 * as it is, never a new object, as the selector of `useAppState`. Throws
 * a defect outside an `AutoRunsProvider`.
 */
export function useLive<T>(
  select: (state: AppState<JobResult, Blob>, autoRuns: AutoRuns) => T,
): T {
  const store = useStore();
  const autoRuns = autoRunsOf(useContext(AutoRunsContext));
  const subscribe = useCallback(
    (listener: () => void): (() => void) => {
      const fromStore = store.subscribe(listener);
      const fromAutoRuns = autoRuns.subscribe(listener);
      return () => {
        fromStore();
        fromAutoRuns();
      };
    },
    [store, autoRuns],
  );
  return useSyncExternalStore(subscribe, () =>
    select(store.getState(), autoRuns),
  );
}

/** The analyses of the provider, `given`; a defect when there is none. */
function autoRunsOf(given: AutoRuns | null): AutoRuns {
  if (given === null) {
    throw new Error(
      "popnei_web defect: useAutoRuns outside an AutoRunsProvider",
    );
  }
  return given;
}
