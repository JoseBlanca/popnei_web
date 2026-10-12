/**
 * The analyses of popgen2.html that can be live in the order of the
 * tabs, the PCA, the diversity and the LD decay of the Populations tab,
 * then the distances of the Distances tab, which differs from the order
 * of calculation, `POPGEN2_LIVE` of src/core/apps.ts, where the LD decay,
 * which may take minutes and which nothing interrupts, runs last (from
 * 13 October 2026, the merge of the LD decay and the distances). The
 * words that name several analyses with no "then", the band's Stop all,
 * those about to start together, the lock's "to stop … too", a Run to
 * press in each tab, and the band's link to the first result with
 * warnings, follow the tabs; the words of a sequence, "and then", follow
 * the calculation.
 */
import { POPGEN2_LIVE, isPopgen2Live } from "../../core/apps.ts";
import type { Popgen2LiveId } from "../../core/apps.ts";
import type { AnalysisId } from "../../core/project.ts";

/** The place of each analysis that can be live in the order of the
    tabs. Keyed by `POPGEN2_LIVE`, so that an analysis added to it
    without its place does not compile. */
const PLACE_IN_TABS: Readonly<Record<Popgen2LiveId, number>> = Object.freeze({
  pca: 0,
  diversity: 1,
  ldDecay: 2,
  popDists: 3,
});

/** The analyses of `POPGEN2_LIVE` in the order of the tabs. */
export const POPGEN2_LIVE_IN_TABS: readonly Popgen2LiveId[] = Object.freeze(
  POPGEN2_LIVE.toSorted((a, b) => PLACE_IN_TABS[a] - PLACE_IN_TABS[b]),
);

/** The place of the analysis `id` in the order of the tabs; a defect
    for one that is not live on popgen2.html. */
function placeOf(id: AnalysisId): number {
  if (!isPopgen2Live(id)) {
    throw new Error(
      `popnei_web defect: ${id} is not an analysis popgen2.html calculates again by itself.`,
    );
  }
  return PLACE_IN_TABS[id];
}

/** `named`, analyses that can be live, in the order of the tabs, a
    copy; a defect for one that is not live on popgen2.html. */
export function inTabOrder<T extends { readonly id: AnalysisId }>(
  named: readonly T[],
): readonly T[] {
  return named
    .map((one) => ({ one, place: placeOf(one.id) }))
    .toSorted((a, b) => a.place - b.place)
    .map(({ one }) => one);
}
