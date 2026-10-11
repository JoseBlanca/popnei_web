/**
 * The analyses popgen2.html starts by itself, `autoRuns` of autoRuns.ts,
 * given to the screens as the store is (store.tsx): the entry of the page
 * makes them once and gives them through `AutoRunsProvider`, and every
 * screen reaches them with `useAutoRuns`, never through a prop.
 */
import { createContext, useContext, useSyncExternalStore } from "react";

import type { AutoRuns } from "./autoRuns.ts";

const AutoRunsContext = createContext<AutoRuns | null>(null);

/** Gives the analyses the page starts by itself to every component under
    it. */
export const AutoRunsProvider = AutoRunsContext.Provider;

/** The analyses the page starts by itself, read with `subscribe`, so
    that the component that calls it is drawn again at each change of what
    they know beyond the store. Throws a defect outside an
    `AutoRunsProvider`. */
export function useAutoRuns(): AutoRuns {
  const autoRuns = useContext(AutoRunsContext);
  if (autoRuns === null) {
    throw new Error(
      "popnei_web defect: useAutoRuns outside an AutoRunsProvider",
    );
  }
  useSyncExternalStore(autoRuns.subscribe, autoRuns.getVersion);
  return autoRuns;
}
