/**
 * The store of core, given to the screens (react.md, "Reading core"). The
 * entry of the page makes the store once, outside any component, and
 * gives it through `StoreProvider`; a screen reads it with `useAppState`
 * and sends it commands through `useStore`.
 */
import { createContext, useContext, useSyncExternalStore } from "react";

import type { AppState, Store } from "../core/store.ts";
import type { JobResult } from "../worker/protocol.ts";
import type { Popgen2PageStore } from "./popgen2Store.ts";

// The store of the application holds the results of its workers,
// JobResult, and the file of the filtered variants they wrote, a Blob;
// on popgen2.html it is the store made with no notice and no Undo,
// which has the changes that leave no step.
const StoreContext = createContext<
  Store<JobResult, Blob> | Popgen2PageStore<JobResult, Blob> | null
>(null);

/** The store as the code shared by both pages sees it: no undo and no
    redo, which popgen2.html has not; `useUndoStore` gives them on
    popgen.html. */
export type PageStore<R = JobResult, F = Blob> = Omit<
  Store<R, F>,
  "undo" | "redo"
>;

/** Gives the store to every component under it. */
export const StoreProvider = StoreContext.Provider;

/** The store of the page. Throws a defect outside a `StoreProvider`. */
export function useStore(): PageStore {
  const store = useContext(StoreContext);
  if (store === null) {
    throw new Error("popnei_web defect: useStore outside a StoreProvider");
  }
  return store;
}

/** The store of popgen.html, with its undo and redo. Throws a defect
    outside a `StoreProvider`, and under one that gives the store of
    popgen2.html, which has no Undo. */
export function useUndoStore(): Store<JobResult, Blob> {
  const store = useContext(StoreContext);
  if (store === null || "applyAfresh" in store) {
    throw new Error(
      "popnei_web defect: useUndoStore outside a StoreProvider of the store of popgen.html",
    );
  }
  return store;
}

/** The store of popgen2.html, with the changes that leave no step and
    no undo nor redo. Throws a defect outside a `StoreProvider`, and
    under one that gives the store of popgen.html, which has none of
    those changes. */
export function usePopgen2Store(): Popgen2PageStore<JobResult, Blob> {
  const store = useContext(StoreContext);
  if (store === null || !("applyAfresh" in store)) {
    throw new Error(
      "popnei_web defect: usePopgen2Store outside a StoreProvider of the store of popgen2.html",
    );
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
