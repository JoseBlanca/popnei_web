/**
 * The PCA tab of popgen2.html, up to its run
 * (docs/specs/steps/popgen2-pca.md, "The PCA tab"): the frame every
 * analysis panel shares, `AnalysisPanel`, given the panel of this page,
 * by the method of the project, and the lock of its Run by the one pass,
 * which the store does not know: the pass that runs, or that the page
 * starts by itself in a moment, would otherwise let the PCA into the
 * queue of the calculation worker, where it would wait behind the pass
 * with a bar that does not move (`passLock`).
 *
 * The lock reads what the code that starts the pass knows beyond the
 * store, whether the pass was started under its key, so the tab is drawn
 * again at each change of it as well as of the store.
 *
 * Its Run makes the PCA live, `autoRuns.run`, and its Stop ends the live
 * state, `autoRuns.pause` (docs/specs/steps/popgen2-pca.md, "The PCA
 * calculated again by itself", "Stop recalculating"): while the PCA is
 * live and no PCA runs, "Stop recalculating" stands in the place of Run,
 * beside the lock while it is locked, and, while it is about to start,
 * the line of the quiet second under it, which names the download when
 * its dialog holds the start, and the diversity while the PCA waits for
 * it, as autoRuns says; a Run that waits for the diversity says that
 * line once in the status region, since no bar comes; after a Stop, the
 * line that says why nothing starts by itself stands there.
 */
import { useEffect, useSyncExternalStore } from "react";

import { pcaOnPopgen2, pcaOptions } from "../../../core/analyses/pca.ts";
import type { LiveState } from "../../autoRuns.ts";
import { useAutoRuns } from "../../autoRunsContext.ts";
import type { PcaMethod } from "../../../worker/protocol.ts";
import { useAnnouncer } from "../../shell/announcer.tsx";
import { useAppState, useStore } from "../../store.tsx";
import { summaryStatus } from "../../variants/words.ts";
import { AnalysisPanel } from "../AnalysisPanel.tsx";
import type { PanelLive } from "../AnalysisPanel.tsx";
import { runLive } from "../liveRun.ts";
import { statusOf, waitsAfterName } from "../status.ts";
import type { LiveAnalysisName } from "../status.ts";
import { passLock } from "./passLock.ts";
import { pcaTabPanel } from "./pcaTabPanel.ts";
import { prefetchPcaResults } from "./PcaTabResults.tsx";
import {
  aboutToStartLine,
  failureEndedLine,
  pcaTabLock,
  stoppedLine,
} from "./tabWords.ts";

/** The id of the PCA among the analyses started by themselves. */
const PCA = pcaOnPopgen2.id;

/** What the PCA tab is drawn with. */
export interface PcaTabProps {
  /** Whether the tab is shown and not greyed, a variants file open:
      the code of the result is then downloaded, so that it is there
      when a run ends. */
  readonly shown: boolean;
}

/** The live state `state` of the PCA as its panel draws it, with the
    words of its lines by the method `method`, the line of waiting naming
    `before`, and the line of a Stop by whether the result is shown,
    `resultShown`. */
function panelLive(
  state: LiveState,
  method: PcaMethod,
  before: LiveAnalysisName | null,
  resultShown: boolean,
): PanelLive {
  switch (state.kind) {
    case "off":
      return { kind: "off" };
    case "stopped":
      return { kind: "stopped", line: stoppedLine(method, resultShown) };
    case "endedByFailure":
      return { kind: "stopped", line: failureEndedLine(method) };
    case "live":
      return {
        kind: "live",
        aboutToStartLine:
          state.aboutToStart === null
            ? null
            : aboutToStartLine(method, state.aboutToStart, before),
        runBeside: state.aboutToStart === "afterCrash",
      };
  }
}

/** The PCA tab: its heading, its options, the line of the individuals,
    Run or Stop with its lock, the run under way, its errors, and its
    result. */
export function PcaTab({ shown }: PcaTabProps): React.JSX.Element {
  // The code of the result, asked for while the user sets the options,
  // and not at the end of a run of minutes.
  useEffect(() => {
    if (shown) prefetchPcaResults();
  }, [shown]);
  // Drawn again at each change of what autoRuns knows, which tells a
  // pass stopped from one about to start, and which a Stop with no pass
  // running changes and the store does not.
  const autoRuns = useAutoRuns();
  const store = useStore();
  const announcer = useAnnouncer();
  const method = useAppState((s) => pcaOptions(s.project, "popgen2").method);
  const lock = useAppState((s) =>
    pcaTabLock(
      s.project,
      passLock(summaryStatus(s), (key) => autoRuns.startedUnder(key)),
    ),
  );
  // The live state, which autoRuns tells of at each change, of the store
  // and of the gate as well as its own.
  const state = useSyncExternalStore(autoRuns.subscribe, () =>
    autoRuns.liveState(PCA),
  );
  const before = useAppState((s) => waitsAfterName(s, state));
  const resultShown = useAppState((s) => statusOf(s, PCA).kind === "done");
  return (
    <AnalysisPanel
      id={PCA}
      ui={pcaTabPanel(method)}
      page={{
        lock,
        live: panelLive(state, method, before, resultShown),
        onRun: () => {
          runLive(
            { autoRuns, announcer, getState: () => store.getState() },
            PCA,
            (waitsFor) => aboutToStartLine(method, "behind", waitsFor),
          );
        },
        onStop: () => {
          autoRuns.pause(PCA);
        },
      }}
    />
  );
}
