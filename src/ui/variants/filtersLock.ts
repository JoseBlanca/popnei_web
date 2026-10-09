/**
 * The lock of the filters a running PCA reads on popgen2.html
 * (docs/specs/steps/popgen2-pca.md, "While a PCA runs"; the owner's
 * answer 2 to docs/plans/analyses-pca.md, 9 October 2026): while a PCA
 * runs, the thresholds and the FILTER box of the Variants tab and the
 * PCA's own options wait, and so do Undo and Redo, with the words "Stop
 * the PCA to change the filters.", or "Stop the PCoA …" by the method,
 * so that no change leaves the PCA behind. The box of the individuals
 * file and the colour of the points are not locked: the PCA's key holds
 * neither.
 */
import { runningAnalysisOf } from "../analyses/status.ts";
import { filtersLockedText } from "../analyses/words.ts";
import { useAppState } from "../store.tsx";

/** The reason the filters a running analysis reads wait while it runs,
    or `null` while none runs. */
export function useFiltersLock(): string | null {
  const name = useAppState((s) => runningAnalysisOf(s)?.name ?? null);
  return name === null ? null : filtersLockedText(name);
}
