/**
 * The store of core, given to the screens (react.md, "Reading core"). The
 * entry of the page makes the store once, outside any component, and
 * gives it through `StoreProvider`; a screen reads it with `useAppState`
 * and sends it commands through `useStore`.
 */
import { createContext, useContext, useSyncExternalStore } from "react";

import type { AppState, Store } from "../core/store.ts";
import type { JobResult } from "../worker/protocol.ts";

// The store of the application holds the results of its workers,
// JobResult, and the file of the filtered variants they wrote, a Blob.
const StoreContext = createContext<Store<JobResult, Blob> | null>(null);

/** Gives the store to every component under it. */
export const StoreProvider = StoreContext.Provider;

/** The store of the page. Throws a defect outside a `StoreProvider`. */
export function useStore(): Store<JobResult, Blob> {
  const store = useContext(StoreContext);
  if (store === null) {
    throw new Error("popnei_web defect: useStore outside a StoreProvider");
  }
  return store;
}

/**
 * The part of the state that `select` gives, read again at every change
 * of the store; the component is drawn again when it changes. `select`
 * returns a part of the state as it is, or a primitive, never a new
 * object, which React would take for a change at every call.
 */
export function useAppState<T>(
  select: (state: AppState<JobResult, Blob>) => T,
): T {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, () => select(store.getState()));
}
