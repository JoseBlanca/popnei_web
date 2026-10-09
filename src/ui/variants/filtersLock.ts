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
import { filtersLockedText } from "../analyses/pca/words.ts";
import { useAppState } from "../store.tsx";
import { runningPcaOf } from "./downloadState.ts";

/** The reason the filters a PCA reads wait while it runs, or `null`
    while no PCA runs. */
export function useFiltersLock(): string | null {
  const method = useAppState(runningPcaOf);
  return method === null ? null : filtersLockedText(method);
}
