/**
 * The panel of the LD decay in the Populations tab of popgen2.html, as
 * the frame of `AnalysisPanel.tsx` draws it
 * (docs/specs/steps/popgen2-populations.md, "The LD decay"): its heading,
 * "LD decay", and its name in a sentence; the line of the populations it
 * will run on; its two options, which wait while it runs; the line under
 * the bar, which is all the user has while the curves are fitted; its
 * result, the old panel's table, plot and table of the bins given the
 * definition the store of this page runs, `ldDecayOnPopgen2`, with the
 * menus "Download…" of that page; and its errors in this page's words,
 * its own of a crash among them, which name the memory. In the code of
 * the tab, downloaded apart from the page's (`PopulationsTab.tsx`).
 */
import { ldDecayOnPopgen2 } from "../../../core/analyses/ldDecay.ts";
import type { Project } from "../../../core/project.ts";
import type { AnalysisUi, ResultsProps } from "../panels.ts";
import { LdDecayResults } from "./LdDecayResults.tsx";
import { LdDecayTabOptions } from "./LdDecayTabOptions.tsx";
import { LD_DECAY_TAB_ERRORS } from "./liveWords.ts";
import {
  LD_DECAY_TAB_NAME,
  LD_DECAY_TAB_TITLE,
  ldDecayTabReadyLines,
} from "./tabWords.ts";
import { fitLine } from "./words.ts";

/** The result of the LD decay of the definition the store of
    popgen2.html runs. */
function LdDecayTabResults(props: ResultsProps): React.JSX.Element {
  return <LdDecayResults {...props} analysis={ldDecayOnPopgen2} />;
}

/** The panel of the LD decay of the Populations tab. */
export const LD_DECAY_TAB_PANEL: AnalysisUi = Object.freeze({
  title: LD_DECAY_TAB_TITLE,
  name: LD_DECAY_TAB_NAME,
  // The page makes no notice, so the words of a result removed, which
  // name these, are never drawn on it.
  resultName: LD_DECAY_TAB_NAME,
  plural: false,
  readyLines: ldDecayTabReadyLines,
  ...LD_DECAY_TAB_ERRORS,
  Results: LdDecayTabResults,
  Options: LdDecayTabOptions,
  runningLine: (p: Project): string | null =>
    p.variants === null ? null : fitLine(p.variants.name),
});
