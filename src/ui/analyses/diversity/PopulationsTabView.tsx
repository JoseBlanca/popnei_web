/**
 * The Populations tab of popgen2.html once its code is there, up to the
 * LD decay that will come after it (docs/specs/steps/
 * popgen2-populations.md): the diversity of
 * each population and its spectrum, in the frame every analysis panel
 * shares, `AnalysisPanel`, given the panel of this tab, and the lock of
 * its Run by the one pass, which the store does not know (`passLock`, as
 * in the PCA tab): a diversity sent during the pass would wait in the
 * queue of the calculation worker behind it with a bar that does not
 * move.
 *
 * Its Run makes the diversity live, `autoRuns.run`, and its Stop and its
 * Stop recalculating end the live state, `autoRuns.pause` (the spec,
 * "Run and Stop"); after either, the line that says why nothing starts
 * by itself stands in the place of the bar. The lines in that place
 * while the diversity is about to start or waits come with work package
 * 2 of docs/plans/population-tab.md.
 *
 * A module of its own, which `PopulationsTab.tsx` alone imports with
 * `import()`, so that the bundler makes it and the result a file of their
 * own, downloaded when the tab is first shown, with its export under its
 * name.
 */
import { useSyncExternalStore } from "react";

import { diversityOnPopgen2 } from "../../../core/analyses/diversity.ts";
import type { LiveState } from "../../autoRuns.ts";
import { useAutoRuns } from "../../autoRunsContext.ts";
import { useAppState } from "../../store.tsx";
import { summaryStatus } from "../../variants/words.ts";
import { AnalysisPanel } from "../AnalysisPanel.tsx";
import type { PanelLive } from "../AnalysisPanel.tsx";
import { passLock } from "../pca/passLock.ts";
import { POPULATIONS_TAB_PANEL } from "./populationsTabPanel.ts";
import {
  DIVERSITY_FAILURE_ENDED_LINE,
  DIVERSITY_STOPPED_LINE,
  diversityTabLock,
} from "./tabWords.ts";

/** The id of the diversity among the analyses started by themselves. */
const DIVERSITY = diversityOnPopgen2.id;

/** The live state `state` of the diversity as its panel draws it. */
function panelLive(state: LiveState): PanelLive {
  switch (state.kind) {
    case "off":
      return { kind: "off" };
    case "stopped":
      return { kind: "stopped", line: DIVERSITY_STOPPED_LINE };
    case "endedByFailure":
      return { kind: "stopped", line: DIVERSITY_FAILURE_ENDED_LINE };
    case "live":
      return { kind: "live", aboutToStartLine: null };
  }
}

/** The Populations tab: the heading of the diversity, its options, the
    line of the populations, Run or Stop with its lock, the run under
    way, its errors, and its result. */
export function PopulationsTabView(): React.JSX.Element {
  // Drawn again at each change of what autoRuns knows, which tells a
  // pass stopped from one about to start, and which the store does not.
  const autoRuns = useAutoRuns();
  const lock = useAppState((s) =>
    diversityTabLock(
      s.project,
      passLock(summaryStatus(s), (key) => autoRuns.startedUnder(key)),
    ),
  );
  const state = useSyncExternalStore(autoRuns.subscribe, () =>
    autoRuns.liveState(DIVERSITY),
  );
  return (
    <AnalysisPanel
      id={DIVERSITY}
      ui={POPULATIONS_TAB_PANEL}
      page={{
        lock,
        live: panelLive(state),
        onRun: () => {
          autoRuns.run(DIVERSITY);
        },
        onStop: () => {
          autoRuns.pause(DIVERSITY);
        },
      }}
    />
  );
}
