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
 * its errors in this page's words, which name the box Variants and
 * the Variants tab; and the spectrum's warning named, with a link to it,
 * in the list of the result's warnings.
 */
import { spectrumWarnings } from "../../../core/analyses/sfsWarnings.ts";
import type { Project } from "../../../core/project.ts";
import type { JobResult } from "../../../worker/protocol.ts";
import type { AnalysisUi } from "../panels.ts";
import { SPECTRUM_WARNING_ATTRIBUTE } from "../Warnings.tsx";
import { DiversityTabOptions } from "./DiversityTabOptions.tsx";
import { PopulationsTabResultView } from "./PopulationsTabResultView.tsx";
import { DIVERSITY_TAB_ERRORS } from "./liveWords.ts";
import {
  SPECTRUM_WARNING_ELSEWHERE,
  SPECTRUM_WARNING_LINK,
} from "./spectrumWords.ts";
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
  // The spectrum's warning, said in its caption, named and counted in
  // the list of the result's warnings, so that the list's count is the
  // band's (popgen2-band.md, "The warning of the spectrum").
  linkedWarning: Object.freeze({
    has: (result: JobResult, p: Project): boolean =>
      result.analysis === "diversity" &&
      spectrumWarnings(result, p, "popgen2").length > 0,
    text: SPECTRUM_WARNING_ELSEWHERE,
    link: SPECTRUM_WARNING_LINK,
    target: SPECTRUM_WARNING_ATTRIBUTE,
  }),
});
