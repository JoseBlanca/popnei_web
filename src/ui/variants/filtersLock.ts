/**
 * The lock of what a running live analysis reads on popgen2.html
 * (docs/specs/steps/popgen2-pca.md, "While a PCA runs" and "Several
 * analyses calculated again by themselves", "The lock";
 * docs/specs/steps/popgen2-populations.md, "While the diversity runs";
 * the owner's answer 2 to docs/plans/analyses-pca.md, 9 October 2026):
 * while the PCA or the diversity runs, the thresholds and the FILTER box
 * of the Variants tab wait, and the options of the analysis running, not
 * those of another, with the words "Stop the PCA in the PCA tab to change
 * the filters; then press Run there to calculate it again.", by the
 * analysis and its tab, and with Stop all when another analysis is live
 * beside it, so that no change leaves the running analysis behind.
 *
 * Which analyses are live, and which wait after the one running, is
 * known to `autoRuns` alone, which the entry of the page gives to every
 * component under `AutoRunsProvider`.
 */
import { createContext, useContext, useSyncExternalStore } from "react";

import type { AnalysisId } from "../../core/project.ts";
import type { AppState } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import { liveAnalysisOf, runningAnalysisOf } from "../analyses/status.ts";
import type { RunningAnalysis } from "../analyses/status.ts";
import { filtersLockedText } from "../analyses/words.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { POPGEN2_LIVE } from "../../core/apps.ts";
import {} from "../popgen2Store.ts";
import { useAppState } from "../store.tsx";

const AutoRunsContext = createContext<AutoRuns | null>(null);

/** Gives the analyses the page starts by itself to every component under
    it. */
export const AutoRunsProvider = AutoRunsContext.Provider;

/** The analyses the page starts by itself, read with `subscribe`, so
    that the component that calls it is drawn again at each change of the
    live state of an analysis. Throws a defect outside an
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

/** The live analyses of the page other than `running`, live beside it,
    in their order, as `isLive` of `live` tells: those a Stop all stops
    too. */
export function liveBeside(
  s: AppState<JobResult, unknown>,
  running: RunningAnalysis,
  live: Pick<AutoRuns, "isLive">,
): readonly RunningAnalysis[] {
  return namedOf(
    s,
    POPGEN2_LIVE.filter((id) => id !== running.id && live.isLive(id)),
  );
}

/** The live analyses of the page waiting to start after the one running,
    in their order, those whose `liveState` of `live` is about to start
    "behind" it; empty while none runs. */
export function waitingAfter(
  s: AppState<JobResult, unknown>,
  live: Pick<AutoRuns, "liveState">,
): readonly RunningAnalysis[] {
  return namedOf(
    s,
    POPGEN2_LIVE.filter((id) => {
      const state = live.liveState(id);
      return state.kind === "live" && state.aboutToStart === "behind";
    }),
  );
}

/** The analyses `ids` as the words name them in `s`. */
function namedOf(
  s: AppState<JobResult, unknown>,
  ids: readonly AnalysisId[],
): readonly RunningAnalysis[] {
  return ids.map((id) => liveAnalysisOf(s, id));
}

/** The reason the thresholds and the FILTER box wait in `s`, while a
    live analysis runs, with Stop all when another is live beside it;
    `null` while none runs. */
export function filtersLockOf(
  s: AppState<JobResult, unknown>,
  live: Pick<AutoRuns, "isLive">,
): string | null {
  const running = runningAnalysisOf(s);
  return running === null
    ? null
    : filtersLockedText(running, liveBeside(s, running, live));
}

/** The reason the options of the analysis `id` wait in `s`, the words of
    the filters' lock while `id` itself runs, and `null` otherwise: a
    change of the options of another analysis while one runs makes that
    other one about to start, waiting after it (popgen2-populations.md,
    "While the diversity runs", "Not greyed"). */
export function optionsLockOf(
  s: AppState<JobResult, unknown>,
  live: Pick<AutoRuns, "isLive">,
  id: AnalysisId,
): string | null {
  return runningAnalysisOf(s)?.id === id ? filtersLockOf(s, live) : null;
}

/** The reason the thresholds and the FILTER box wait while a live
    analysis runs, or `null` while none runs. */
export function useFiltersLock(): string | null {
  const autoRuns = useAutoRuns();
  return useAppState((s) => filtersLockOf(s, autoRuns));
}

/** The reason the options of the analysis `id` wait while it runs, or
    `null` while it does not. */
export function useOptionsLock(id: AnalysisId): string | null {
  const autoRuns = useAutoRuns();
  return useAppState((s) => optionsLockOf(s, autoRuns, id));
}
