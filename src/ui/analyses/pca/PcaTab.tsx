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
 * calculated again by itself"): while the PCA is about to start by
 * itself, Stop stands in the place of Run beside the line of the quiet
 * second, which names the download when its dialog is open; while it is
 * live and locked, Stop stands beside the lock; after a Stop, Run stands
 * beside the line that says why nothing starts by itself.
 */
import { useEffect, useSyncExternalStore } from "react";

import { pcaOnPopgen2, pcaOptions } from "../../../core/analyses/pca.ts";
import type { AutoRuns } from "../../autoRuns.ts";
import { useAppState } from "../../store.tsx";
import {
  isDownloadOpen,
  subscribeDownloadOpen,
} from "../../variants/downloadOpen.ts";
import { summaryStatus } from "../../variants/words.ts";
import { AnalysisPanel } from "../AnalysisPanel.tsx";
import { passLock } from "./passLock.ts";
import { pcaTabPanel } from "./pcaTabPanel.ts";
import { prefetchPcaResults } from "./PcaTabResults.tsx";
import { aboutToStartLine, pcaTabLock, stoppedLine } from "./tabWords.ts";

/** The id of the PCA among the analyses started by themselves. */
const PCA = pcaOnPopgen2.id;

/** What the PCA tab is drawn with. */
export interface PcaTabProps {
  /** The analyses the page starts by itself, the one pass among them. */
  readonly autoRuns: AutoRuns;
  /** Whether the tab is shown and not greyed, a variants file open:
      the code of the result is then downloaded, so that it is there
      when a run ends. */
  readonly shown: boolean;
}

/** The PCA tab: its heading, its options, the line of the individuals,
    Run or Stop with its lock, the run under way, its errors, and its
    result. */
export function PcaTab({ autoRuns, shown }: PcaTabProps): React.JSX.Element {
  // The code of the result, asked for while the user sets the options,
  // and not at the end of a run of minutes.
  useEffect(() => {
    if (shown) prefetchPcaResults();
  }, [shown]);
  // Selected for what autoRuns knows, which tells a pass stopped from one
  // about to start, and which a Stop with no pass running changes and the
  // store does not.
  useSyncExternalStore(autoRuns.subscribe, autoRuns.getVersion);
  const method = useAppState((s) => pcaOptions(s.project, "popgen2").method);
  const lock = useAppState((s) =>
    pcaTabLock(
      s.project,
      passLock(summaryStatus(s), (key) => autoRuns.startedUnder(key)),
    ),
  );
  // Read for each state of the store, and drawn again at each change of
  // the live state, which `subscribe` above tells.
  const live = useAppState(() => autoRuns.isLive(PCA));
  const about = useAppState(() => autoRuns.aboutToStart(PCA));
  const stopped = useAppState(() => autoRuns.stoppedByUser(PCA));
  const dialogOpen = useSyncExternalStore(
    subscribeDownloadOpen,
    isDownloadOpen,
  );
  return (
    <AnalysisPanel
      id={PCA}
      ui={pcaTabPanel(method)}
      page={{
        lock,
        live,
        aboutToStart: about ? aboutToStartLine(method, dialogOpen) : null,
        stoppedLine: stopped ? stoppedLine(method) : null,
        onRun: () => {
          autoRuns.run(PCA);
        },
        onStop: () => {
          autoRuns.pause(PCA);
        },
      }}
    />
  );
}
