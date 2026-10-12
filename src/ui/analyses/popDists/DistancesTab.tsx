/**
 * The Distances tab of popgen2.html as the page loads it
 * (docs/specs/steps/popgen2-distances.md, "The result", its code): the
 * code of the tab, its options, lines, Run and result,
 * `DistancesTabView.tsx`, is downloaded apart from the page's the first
 * time the tab is shown open, so that the first load of the page carries
 * only the tab's name and heading and the store's definition of the
 * distances. Until it arrives, "Loading the Distances tab…"; a download
 * that failed, its words with Try again, as `tabLoader.tsx` draws them.
 * Kept once it arrives.
 */
import { createTabLoader } from "../tabLoader.tsx";
import { DISTANCES_TAB_LOADING, distancesTabFailed } from "./tabLoadWords.ts";

/** The Distances tab: nothing until it is first shown, then its code and
    what it draws. */
export const DistancesTab = createTabLoader({
  load: () => import("./DistancesTabView.tsx"),
  source: "src/ui/analyses/popDists/DistancesTabView.tsx",
  render: (code) => <code.DistancesTabView />,
  loadingLine: DISTANCES_TAB_LOADING,
  failedWords: distancesTabFailed,
});
