/**
 * The Distances tab of popgen2.html once its code is there
 * (docs/specs/steps/popgen2-distances.md): the distances between the
 * populations, in the frame every analysis panel shares,
 * `AnalysisPanel`, given the panel of this tab, and the lock of its Run
 * by the one pass, which the store does not know (`passLock`, as in the
 * other tabs): distances sent during the pass would wait in the queue of
 * the calculation worker behind it with a bar that does not move.
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
import { useSyncExternalStore } from "react";

import { popDistsOnPopgen2 } from "../../../core/analyses/popDists.ts";
import { useAutoRuns } from "../../autoRunsContext.ts";
import { useAnnouncer } from "../../shell/announcer.tsx";
import { useAppState, useStore } from "../../store.tsx";
import { summaryStatus } from "../../variants/words.ts";
import { AnalysisPanel } from "../AnalysisPanel.tsx";
import { runLive } from "../liveRun.ts";
import { passLock } from "../pca/passLock.ts";
import { statusOf, waitsAfterName } from "../status.ts";
import { DISTANCES_TAB_PANEL } from "./distancesTabPanel.ts";
import {
  distancesPanelLive,
  distancesTabLock,
  distancesWaitingLine,
} from "./tabWords.ts";

/** The id of the distances among the analyses started by themselves. */
const DISTANCES = popDistsOnPopgen2.id;

/** The Distances tab: the heading of the distances, their options, the
    lines of the populations, Run or Stop with its lock, the run under
    way, its errors, and its result. */
export function DistancesTabView(): React.JSX.Element {
  // Drawn again at each change of what autoRuns knows, which tells a
  // pass stopped from one about to start, and which the store does not.
  const autoRuns = useAutoRuns();
  const store = useStore();
  const announcer = useAnnouncer();
  const lock = useAppState((s) =>
    distancesTabLock(
      s.project,
      passLock(summaryStatus(s), (key) => autoRuns.startedUnder(key)),
    ),
  );
  const state = useSyncExternalStore(autoRuns.subscribe, () =>
    autoRuns.liveState(DISTANCES),
  );
  const before = useAppState((s) => waitsAfterName(s, state));
  const resultShown = useAppState(
    (s) => statusOf(s, DISTANCES).kind === "done",
  );
  return (
    <AnalysisPanel
      id={DISTANCES}
      ui={DISTANCES_TAB_PANEL}
      page={{
        lock,
        live: distancesPanelLive(state, before, resultShown),
        onRun: () => {
          runLive(
            { autoRuns, announcer, getState: () => store.getState() },
            DISTANCES,
            (waitsFor) => distancesWaitingLine("behind", waitsFor),
          );
        },
        onStop: () => {
          autoRuns.pause(DISTANCES);
        },
      }}
    />
  );
}
