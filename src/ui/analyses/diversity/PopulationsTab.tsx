/**
 * The Populations tab of popgen2.html as the page loads it
 * (docs/specs/steps/popgen2-populations.md, "The result", its code): the
 * code of the tab, its options, lines, Run and result,
 * `PopulationsTabView.tsx`, is downloaded apart from the page's the
 * first time the tab is shown with a variants file open, so that the
 * first load of the page carries only the tab's name and heading and the
 * store's definition of the diversity. Until it arrives, "Loading the
 * Populations tab…"; a download that failed, its words with Try again,
 * as `CodeSplit.tsx` draws them. Kept once it arrives, so that the tab
 * drawn again, after another variants file, is drawn at once.
 */
import { useState } from "react";

import type { AppState } from "../../../core/store.ts";
import type { JobResult } from "../../../worker/protocol.ts";
import { createCodeDownload } from "../../codeDownload.ts";
import { codeFilesReady } from "../../codeFiles.ts";
import { useAppState } from "../../store.tsx";
import { CodeSplit } from "../CodeSplit.tsx";
import {
  POPULATIONS_TAB_LOADING,
  populationsTabFailed,
} from "./tabLoadWords.ts";

/** The download of the code of the tab. */
const TAB_CODE = createCodeDownload(
  () => import("./PopulationsTabView.tsx"),
  () => codeFilesReady("src/ui/analyses/diversity/PopulationsTabView.tsx"),
);

/** What the Populations tab is drawn with. */
export interface PopulationsTabProps {
  /** Whether the tab is shown and not greyed, a variants file open:
      its code is then downloaded, the first time. */
  readonly shown: boolean;
}

/** The words of a download of the tab that failed, in `s`. */
function failedWordsOf(s: AppState<JobResult, Blob>): string | null {
  return s.project.variants === null
    ? null
    : populationsTabFailed(s.project.variants.name);
}

/** The Populations tab: nothing until it is first shown, then its code
    and what it draws. */
export function PopulationsTab({
  shown,
}: PopulationsTabProps): React.JSX.Element | null {
  // Once shown, the tab stays asked for, hidden behind another tab as
  // every tab of the row is.
  const [asked, setAsked] = useState(shown);
  if (shown && !asked) setAsked(true);
  const failedWords = useAppState(failedWordsOf);
  if (!asked) return null;
  return (
    <CodeSplit
      code={TAB_CODE}
      render={(code) => <code.PopulationsTabView />}
      loadingLine={POPULATIONS_TAB_LOADING}
      failedWords={failedWords}
      retryFocus="place"
    />
  );
}
