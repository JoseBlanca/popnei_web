/**
 * The Populations tab of popgen2.html as the page loads it
 * (docs/specs/steps/popgen2-populations.md, "The result", its code): the
 * code of the tab, its options, lines, Run and result,
 * `PopulationsTabView.tsx`, is downloaded apart from the page's the
 * first time the tab is shown with a variants file open, so that the
 * first load of the page carries only the tab's name and heading and the
 * store's definition of the diversity. Until it arrives, "Loading the
 * Populations tab…"; a download that failed, its words with Try again,
 * as `tabLoader.tsx` draws them. Kept once it arrives, so that the tab
 * drawn again, after another variants file, is drawn at once.
 */
import { createTabLoader } from "../tabLoader.tsx";
import {
  POPULATIONS_TAB_LOADING,
  populationsTabFailed,
} from "./tabLoadWords.ts";

/** The Populations tab: nothing until it is first shown, then its code
    and what it draws. */
export const PopulationsTab = createTabLoader({
  load: () => import("./PopulationsTabView.tsx"),
  source: "src/ui/analyses/diversity/PopulationsTabView.tsx",
  render: (code) => <code.PopulationsTabView />,
  loadingLine: POPULATIONS_TAB_LOADING,
  failedWords: populationsTabFailed,
});
