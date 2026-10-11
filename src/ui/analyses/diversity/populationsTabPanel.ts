/**
 * The panel of the diversity in the Populations tab of popgen2.html, as
 * the frame of `AnalysisPanel.tsx` draws it
 * (docs/specs/steps/popgen2-populations.md, "What it shows"): its
 * heading, "Diversity", and its name in a sentence; the line of the
 * populations it will run on; its options, which wait while it runs; its
 * result, the old panel's table and block of the spectrum given the
 * definition the store of this page runs, `diversityOnPopgen2`, in the
 * code of the tab that is downloaded apart from the page's
 * (`PopulationsTab.tsx`);
 * and its errors in this page's words, which name the box Variants and
 * the Variants tab.
 */
import type { AnalysisUi } from "../panels.ts";
import { DiversityTabOptions } from "./DiversityTabOptions.tsx";
import { PopulationsTabResultView } from "./PopulationsTabResultView.tsx";
import { DIVERSITY_TAB_ERRORS } from "./liveWords.ts";
import { DIVERSITY_TAB_TITLE } from "./tabLoadWords.ts";
import { DIVERSITY_TAB_NAME, diversityTabReadyLines } from "./tabWords.ts";

/** The panel of the diversity of the Populations tab. */
export const POPULATIONS_TAB_PANEL: AnalysisUi = Object.freeze({
  title: DIVERSITY_TAB_TITLE,
  name: DIVERSITY_TAB_NAME,
  // The page makes no notice, so the words of a result removed, which
  // name these, are never drawn on it.
  resultName: "the table",
  plural: false,
  readyLines: diversityTabReadyLines,
  ...DIVERSITY_TAB_ERRORS,
  Results: PopulationsTabResultView,
  Options: DiversityTabOptions,
  runningLine: (): null => null,
});
