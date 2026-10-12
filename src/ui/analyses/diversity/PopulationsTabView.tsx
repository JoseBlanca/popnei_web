/**
 * The Populations tab of popgen2.html once its code is there
 * (docs/specs/steps/popgen2-populations.md): the diversity of
 * each population and its spectrum, and after them, from 12 October
 * 2026, the LD decay of each population under its own heading
 * ("The LD decay"), each in the frame every analysis panel
 * shares, `AnalysisPanel`, given the panel of this tab, and the lock of
 * its Run by the one pass, which the store does not know (`passLock`, as
 * in the PCA tab): a diversity sent during the pass would wait in the
 * queue of the calculation worker behind it with a bar that does not
 * move. Both parts are drawn by `LivePart.tsx`, which every live
 * analysis but the PCA shares.
 *
 * Its Run makes the diversity live, `autoRuns.run`, and its Stop and its
 * Stop recalculating end the live state, `autoRuns.pause` (the spec,
 * "Run and Stop"). While it is live and does not run, the line of what
 * it waits for stands in the place of the bar, the quiet second, the PCA
 * before it or running, or the download, naming the analysis
 * `autoRuns` says it waits after; a Run that waits for another
 * calculation says that line once in the status region, since no bar
 * comes. After a Stop or a failure that ended the live state, the line
 * that says why nothing starts by itself stands there. The LD decay's
 * part does the same with its own words, and says beside its button how
 * long its last run took, from the page's clock, `useLastRun`, so that the user knows what
 * a change will cost them.
 *
 * A module of its own, which `PopulationsTab.tsx` alone imports with
 * `import()`, so that the bundler makes it and the result a file of their
 * own, downloaded when the tab is first shown, with its export under its
 * name.
 */
import { diversityOnPopgen2 } from "../../../core/analyses/diversity.ts";
import { ldDecayOnPopgen2 } from "../../../core/analyses/ldDecay.ts";
import { LivePart } from "../LivePart.tsx";
import { LD_DECAY_TAB_PANEL } from "../ldDecay/ldDecayTabPanel.tsx";
import { useLastRun } from "../ldDecay/lastRun.ts";
import {
  lastRunText,
  ldDecayPanelLive,
  ldDecayTabLock,
  ldDecayWaitingLine,
} from "../ldDecay/tabWords.ts";
import { POPULATIONS_TAB_PANEL } from "./populationsTabPanel.ts";
import {
  diversityPanelLive,
  diversityTabLock,
  diversityWaitingLine,
} from "./tabWords.ts";

/** The Populations tab: the diversity, its heading, its options, the
    line of the populations, Run or Stop with its lock, the run under
    way, its errors, and its result; and then the LD decay, with the
    time of its last run beside its button. */
export function PopulationsTabView(): React.JSX.Element {
  const lastRun = useLastRun();
  return (
    <>
      <LivePart
        id={diversityOnPopgen2.id}
        ui={POPULATIONS_TAB_PANEL}
        tabLock={diversityTabLock}
        panelLive={diversityPanelLive}
        waitingLine={diversityWaitingLine}
      />
      <LivePart
        id={ldDecayOnPopgen2.id}
        ui={LD_DECAY_TAB_PANEL}
        tabLock={ldDecayTabLock}
        panelLive={ldDecayPanelLive}
        waitingLine={ldDecayWaitingLine}
        aside={lastRun === null ? null : lastRunText(lastRun)}
      />
    </>
  );
}
