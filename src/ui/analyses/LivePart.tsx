/**
 * The part of a tab of popgen2.html that holds one analysis that can be
 * live and is not the PCA: the diversity and the LD decay of the
 * Populations tab, and the distances of the Distances tab
 * (docs/specs/steps/popgen2-populations.md and popgen2-distances.md,
 * "Run and Stop"). The frame every analysis panel shares,
 * `AnalysisPanel`, given the analysis's panel and the lock of its Run by
 * the one pass, which the store does not know (`passLock`): a request
 * sent during the pass would wait in the queue of the calculation worker
 * behind it with a bar that does not move.
 *
 * Its Run makes the analysis live, `autoRuns.run`, and its Stop and its
 * Stop recalculating end the live state, `autoRuns.pause`. While it is
 * live and does not run, the line of what it waits for stands in the
 * place of the bar, naming the analysis `autoRuns` says it waits after;
 * a Run that waits for another calculation says that line once in the
 * status region, since no bar comes. After a Stop or a failure that
 * ended the live state, the line that says why nothing starts by itself
 * stands there, naming a Run only while the state offers one. The words
 * are the analysis's own.
 */
import { useSyncExternalStore } from "react";

import type { AnalysisId, Project } from "../../core/project.ts";
import { useAutoRuns } from "../autoRunsContext.ts";
import type { AboutToStart, LiveState } from "../autoRuns.ts";
import { useAnnouncer } from "../shell/announcer.tsx";
import { useAppState, useStore } from "../store.tsx";
import { summaryStatus } from "../variants/words.ts";
import { AnalysisPanel } from "./AnalysisPanel.tsx";
import type { PanelLive } from "./AnalysisPanel.tsx";
import { runLive } from "./liveRun.ts";
import type { AnalysisUi } from "./panels.ts";
import { passLock } from "./pca/passLock.ts";
import type { PassLock } from "./pca/passLock.ts";
import { runWithheldOf, statusOf, waitsAfterName } from "./status.ts";
import type { LiveAnalysisName, RunWithheld } from "./status.ts";

/** What the part of a live analysis is drawn with: its id, its panel
    and its words. */
export interface LivePartProps {
  /** The id of the analysis, one of `POPGEN2_LIVE` of
      src/core/apps.ts. */
  readonly id: AnalysisId;
  /** Its panel, its words and its parts. */
  readonly ui: AnalysisUi;
  /** The words of the lock of its Run by the one pass, `lock`, in the
      project `p`; `null` for none. */
  readonly tabLock: (p: Project, lock: PassLock | null) => string | null;
  /** Its live state `state` as its panel draws it, with `before`, the
      live analysis its line of waiting names, and why the state offers
      no Run, `withheld`. */
  readonly panelLive: (
    state: LiveState,
    before: LiveAnalysisName | null,
    withheld: RunWithheld,
  ) => PanelLive;
  /** Its line of waiting for `waits`, after `before`. */
  readonly waitingLine: (
    waits: AboutToStart,
    before: LiveAnalysisName | null,
  ) => string;
  /** A line after the button that describes none of it, as the time of
      the last run of the LD decay; absent or `null` for none. */
  readonly aside?: string | null;
}

/** The part of the live analysis `id`: its heading, its options, its
    lines, Run or Stop with its lock, the run under way, its errors and
    its result. */
export function LivePart({
  id,
  ui,
  tabLock,
  panelLive,
  waitingLine,
  aside = null,
}: LivePartProps): React.JSX.Element {
  // Drawn again at each change of what autoRuns knows, which tells a
  // pass stopped from one about to start, and which the store does not.
  const autoRuns = useAutoRuns();
  const store = useStore();
  const announcer = useAnnouncer();
  const lock = useAppState((s) =>
    tabLock(
      s.project,
      passLock(summaryStatus(s), (key) => autoRuns.startedUnder(key)),
    ),
  );
  const state = useSyncExternalStore(autoRuns.subscribe, () =>
    autoRuns.liveState(id),
  );
  const before = useAppState((s) => waitsAfterName(s, state));
  const withheld = useAppState((s) => runWithheldOf(statusOf(s, id)));
  return (
    <AnalysisPanel
      id={id}
      ui={ui}
      page={{
        lock,
        live: panelLive(state, before, withheld),
        onRun: () => {
          runLive(
            { autoRuns, announcer, getState: () => store.getState() },
            id,
            (waitsFor) => waitingLine("behind", waitsFor),
          );
        },
        onStop: () => {
          autoRuns.pause(id);
        },
        aside,
      }}
    />
  );
}
