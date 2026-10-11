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
 * While an analysis that reads the populations runs, the diversity, the
 * column of the populations, the individuals file, its Remove and the
 * lists of how a text file of it is read wait too, with the words "Stop
 * the diversity in the Populations tab to change the populations; then
 * press Run there to calculate it again."
 * (docs/specs/steps/popgen2-input.md, "While the diversity runs"); while
 * the PCA alone runs they stay open, as the owner decided on 10 October
 * 2026.
 *
 * Which analyses are live, and which wait after the one running, is
 * known to `autoRuns` alone, which the entry of the page gives to every
 * component under `AutoRunsProvider` of src/ui/autoRunsContext.ts.
 */
import type { AnalysisId } from "../../core/project.ts";
import type { AppState } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import { liveBeside, runningAnalysisOf } from "../analyses/status.ts";
import type { LiveAnalysisName } from "../analyses/status.ts";
import {
  STOP_ALL_OFFERED,
  filtersLockedText,
  populationsLockedText,
} from "../analyses/words.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { useLive } from "../autoRunsContext.ts";

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
    : filtersLockedText(
        running,
        liveBeside(s, running, live),
        STOP_ALL_OFFERED,
      );
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

/** The reason the column of the populations, the individuals file and
    how it is read wait in `s`, while a live analysis that reads the
    populations runs, with Stop all when another that reads them is live
    beside it; `null` while none runs, or while the one running reads no
    population, as the PCA. A live analysis that reads no population,
    the PCA, is not named: a change of the populations sends it no
    request, and stopping it would end its live state for nothing
    (docs/specs/steps/popgen2-populations.md, "While the diversity
    runs"). */
export function populationsLockOf(
  s: AppState<JobResult, unknown>,
  live: Pick<AutoRuns, "isLive">,
): string | null {
  const running = runningAnalysisOf(s);
  return running?.readsPopulations !== true
    ? null
    : populationsLockedText(
        running,
        liveBeside(s, running, live).filter((one) => one.readsPopulations),
        STOP_ALL_OFFERED,
      );
}

/** The reason the thresholds and the FILTER box wait while a live
    analysis runs, or `null` while none runs; the component is drawn
    again only when it changes. */
export function useFiltersLock(): string | null {
  return useLive(filtersLockOf);
}

/** The reason the options of the analysis `id` wait while it runs, or
    `null` while it does not; the component is drawn again only when it
    changes. */
export function useOptionsLock(id: AnalysisId): string | null {
  return useLive((s, autoRuns) => optionsLockOf(s, autoRuns, id));
}

/** The reason the column of the populations, the individuals file and
    how it is read wait while the diversity runs, or `null`; the
    component is drawn again only when it changes. */
export function usePopulationsLock(): string | null {
  return useLive(populationsLockOf);
}

/** The live analysis running that reads the populations, the diversity,
    whose run locks them; `null` while none runs; the component is drawn
    again only when it changes. */
export function usePopulationsRunning(): LiveAnalysisName | null {
  return useLive((s) => {
    const running = runningAnalysisOf(s);
    return running?.readsPopulations === true ? running : null;
  });
}
