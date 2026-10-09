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
 */
import { useEffect, useSyncExternalStore } from "react";

import { pcaOptions } from "../../../core/analyses/pca.ts";
import type { AutoRuns } from "../../autoRuns.ts";
import { useAppState } from "../../store.tsx";
import { summaryStatus } from "../../variants/words.ts";
import { AnalysisPanel } from "../AnalysisPanel.tsx";
import { passLock } from "./passLock.ts";
import { pcaTabPanel } from "./pcaTabPanel.ts";
import { prefetchPcaResults } from "./PcaTabResults.tsx";
import { pcaTabLock } from "./tabWords.ts";

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
  return <AnalysisPanel id="pca" ui={pcaTabPanel(method)} page={{ lock }} />;
}
