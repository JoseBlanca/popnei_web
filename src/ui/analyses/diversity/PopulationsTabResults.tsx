/**
 * The result of the Populations tab of popgen2.html, whose code is
 * downloaded apart from the page's (docs/specs/steps/
 * popgen2-populations.md, "The result", its code), as the PCA tab's is
 * (`PcaTabResults.tsx`): the table, the histograms of the spectrum and
 * their parts are not in the first load of the page.
 *
 * The download starts when the Populations tab is first shown with a
 * variants file, `prefetchPopulationsResults`, so that it is there when
 * a run ends; a result drawn before it arrives asks for it too. Its
 * loading line, its failure and Try again are those of `CodeSplit.tsx`.
 */
import type { AppState } from "../../../core/store.ts";
import type { JobResult } from "../../../worker/protocol.ts";
import { createCodeDownload } from "../../codeDownload.ts";
import { useAppState } from "../../store.tsx";
import { CodeSplit } from "../CodeSplit.tsx";
import type { ResultsProps } from "../panels.ts";
import { LOADING_RESULT } from "../pca/tabWords.ts";
import { diversityTabResultFailed } from "./tabWords.ts";

/** The download of the code of the result. */
const RESULTS_CODE = createCodeDownload(
  () => import("./PopulationsTabResultView.tsx"),
);

/** Starts the download of the code of the result, when it has not
    arrived; a failure is left to the result drawn, which asks again. */
export function prefetchPopulationsResults(): void {
  if (RESULTS_CODE.state() === "loaded") return;
  RESULTS_CODE.load().catch(() => undefined);
}

/** The words of a download of the result that failed, in `s`. */
function failedWordsOf(s: AppState<JobResult, Blob>): string | null {
  return s.project.variants === null
    ? null
    : diversityTabResultFailed(s.project.variants.name);
}

/** The result of the diversity of the definition the store of
    popgen2.html runs, once its code is there. */
export function PopulationsTabResults(props: ResultsProps): React.JSX.Element {
  const failedWords = useAppState(failedWordsOf);
  return (
    <CodeSplit
      code={RESULTS_CODE}
      render={(code) => <code.PopulationsTabResultView {...props} />}
      loadingLine={LOADING_RESULT}
      failedWords={failedWords}
      retryFocus="section"
    />
  );
}
