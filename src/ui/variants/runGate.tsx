/**
 * The gate of popgen2.html, given to the thresholds (thresholdRun.ts):
 * the entry makes it once with the page's store, which it wraps so that
 * every command of a screen passes it, and gives it through
 * `RunGateProvider`; each threshold holds its run there while it waits,
 * and the commit of its box; and Undo reads there the change a run
 * waiting will become, which it names.
 */
import { createContext, useContext, useSyncExternalStore } from "react";

import type { RunGate } from "./thresholdRun.ts";

const RunGateContext = createContext<RunGate | null>(null);

/** Gives the gate to every component under it. */
export const RunGateProvider = RunGateContext.Provider;

/** The gate of the page. Throws a defect outside a `RunGateProvider`. */
export function useRunGate(): RunGate {
  const gate = useContext(RunGateContext);
  if (gate === null) {
    throw new Error("popnei_web defect: useRunGate outside a RunGateProvider");
  }
  return gate;
}

/** A subscription to nothing, for a page with no gate. */
function noSubscription(): () => void {
  return () => undefined;
}

/** The description of the change of the project that a run waiting will
    become, "the MAF filter changed", as Undo names it; `null` when no run
    waits, when it would make no change, or on a page with no gate,
    popgen.html. */
export function usePendingChange(): string | null {
  const gate = useContext(RunGateContext);
  return useSyncExternalStore(gate?.subscribe ?? noSubscription, () =>
    gate === null ? null : gate.pending(),
  );
}
