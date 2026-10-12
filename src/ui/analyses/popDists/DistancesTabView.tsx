/**
 * The Distances tab of popgen2.html once its code is there
 * (docs/specs/steps/popgen2-distances.md): the distances between the
 * populations, in the frame every analysis panel shares,
 * `AnalysisPanel`, given the panel of this tab, and the lock of its Run
 * by the one pass, which the store does not know (`passLock`, as in the
 * other tabs): distances sent during the pass would wait in the queue of
 * the calculation worker behind it with a bar that does not move, as
 * `LivePart.tsx` draws every live analysis but the PCA.
 *
 * Its Run makes the distances live, `autoRuns.run`, and its Stop and its
 * Stop recalculating end the live state, `autoRuns.pause` (the spec,
 * "Run and Stop"). While they are live and do not run, the line of what
 * they wait for stands in the place of the bar; a Run that waits for
 * another calculation says that line once in the status region, since
 * no bar comes. After a Stop or a failure that ended the live state, the
 * line that says why nothing starts by itself stands there.
 *
 * A module of its own, which `DistancesTab.tsx` alone imports with
 * `import()`, so that the bundler makes it and the result a file of their
 * own, downloaded when the tab is first shown.
 */
import { popDistsOnPopgen2 } from "../../../core/analyses/popDists.ts";
import { LivePart } from "../LivePart.tsx";
import { DISTANCES_TAB_PANEL } from "./distancesTabPanel.ts";
import {
  distancesPanelLive,
  distancesTabLock,
  distancesWaitingLine,
} from "./tabWords.ts";

/** The Distances tab: the heading of the distances, their options, the
    lines of the populations, Run or Stop with its lock, the run under
    way, its errors, and its result. */
export function DistancesTabView(): React.JSX.Element {
  return (
    <LivePart
      id={popDistsOnPopgen2.id}
      ui={DISTANCES_TAB_PANEL}
      tabLock={distancesTabLock}
      panelLive={distancesPanelLive}
      waitingLine={distancesWaitingLine}
    />
  );
}
