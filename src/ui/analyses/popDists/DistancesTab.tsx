/**
 * The Distances tab of popgen2.html as the page loads it
 * (docs/specs/steps/popgen2-distances.md, "The result", its code): the
 * code of the tab, its options, lines, Run and result,
 * `DistancesTabView.tsx`, is downloaded apart from the page's the first
 * time the tab is shown open, so that the first load of the page carries
 * only the tab's name and heading and the store's definition of the
 * distances. Until it arrives, "Loading the Distances tab…"; a download
 * that failed, its words with Try again, as `CodeSplit.tsx` draws them.
 * Kept once it arrives.
 */
import { useState } from "react";

import type { AppState } from "../../../core/store.ts";
import type { JobResult } from "../../../worker/protocol.ts";
import { createCodeDownload } from "../../codeDownload.ts";
import { codeFilesReady } from "../../codeFiles.ts";
import { useAppState } from "../../store.tsx";
import { CodeSplit } from "../CodeSplit.tsx";
import { DISTANCES_TAB_LOADING, distancesTabFailed } from "./tabLoadWords.ts";

/** The download of the code of the tab. */
const TAB_CODE = createCodeDownload(
  () => import("./DistancesTabView.tsx"),
  () => codeFilesReady("src/ui/analyses/popDists/DistancesTabView.tsx"),
);

/** What the Distances tab is drawn with. */
export interface DistancesTabProps {
  /** Whether the tab is shown and not greyed: its code is then
      downloaded, the first time. */
  readonly shown: boolean;
}

/** The words of a download of the tab that failed, in `s`. */
function failedWordsOf(s: AppState<JobResult, Blob>): string | null {
  return s.project.variants === null
    ? null
    : distancesTabFailed(s.project.variants.name);
}

/** The Distances tab: nothing until it is first shown, then its code and
    what it draws. */
export function DistancesTab({
  shown,
}: DistancesTabProps): React.JSX.Element | null {
  // Once shown, the tab stays asked for, hidden behind another tab as
  // every tab of the row is.
  const [asked, setAsked] = useState(shown);
  if (shown && !asked) setAsked(true);
  const failedWords = useAppState(failedWordsOf);
  if (!asked) return null;
  return (
    <CodeSplit
      code={TAB_CODE}
      render={(code) => <code.DistancesTabView />}
      loadingLine={DISTANCES_TAB_LOADING}
      failedWords={failedWords}
      retryFocus="place"
    />
  );
}
