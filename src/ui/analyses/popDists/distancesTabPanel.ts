/**
 * The panel of the distances in the Distances tab of popgen2.html, as
 * the frame of `AnalysisPanel.tsx` draws it
 * (docs/specs/steps/popgen2-distances.md, "What it shows"): its heading,
 * "Distances between populations", and its name in a sentence; the
 * lines of the populations it will run on; its options, whose minimum
 * waits while it runs; its result, the heatmap and the table with their
 * downloads; and its errors in this page's words, which name the box
 * Variants and the Variants tab. In the code of the tab, which is
 * downloaded apart from the page's (`DistancesTab.tsx`).
 */
import type { AnalysisUi } from "../panels.ts";
import { DistancesTabOptions } from "./DistancesTabOptions.tsx";
import { DistancesTabResults } from "./DistancesTabResults.tsx";
import { DISTANCES_TAB_ERRORS } from "./liveWords.ts";
import { DISTANCES_TAB_TITLE } from "./tabLoadWords.ts";
import { distancesTabReadyLines } from "./tabWords.ts";

/** The panel of the distances of the Distances tab. */
export const DISTANCES_TAB_PANEL: AnalysisUi = Object.freeze({
  title: DISTANCES_TAB_TITLE,
  name: "the distances between populations",
  // The page makes no notice, so the words of a result removed, which
  // name these, are never drawn on it.
  resultName: "the heatmap and the table",
  plural: true,
  readyLines: distancesTabReadyLines,
  ...DISTANCES_TAB_ERRORS,
  Results: DistancesTabResults,
  Options: DistancesTabOptions,
  runningLine: (): null => null,
});
