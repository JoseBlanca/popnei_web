/**
 * The result of the PCA tab of popgen2.html, whose code is downloaded
 * apart from the page's (docs/specs/steps/popgen2-pca.md, "The result",
 * its code): it draws its plots with D3 and three.js, which the page does
 * not download before a file is open (the flow FS2 of
 * e2e/fileStats.spec.ts), and would add some 58 KB gzipped to the first
 * load of popgen2.html, more than the 50 KB the design allows the PCA
 * tab (docs/plans/analyses-pca.md, work package 6, deliverable 6).
 *
 * The download starts when the PCA tab is first shown with a variants
 * file, `prefetchPcaResults`, so that it is there when a run of minutes
 * ends; a result drawn before it arrives asks for it too. Its loading
 * line, its failure and Try again are those of `CodeSplit.tsx`.
 */
import { pcaOptions } from "../../../core/analyses/pca.ts";
import type { AppState } from "../../../core/store.ts";
import type { JobResult } from "../../../worker/protocol.ts";
import { createCodeDownload } from "../../codeDownload.ts";
import { codeFilesReady } from "../../codeFiles.ts";
import { useAppState } from "../../store.tsx";
import { CodeSplit } from "../CodeSplit.tsx";
import type { ResultsProps } from "../panels.ts";
import { LOADING_RESULT, pcaTabResultFailed } from "./tabWords.ts";

/** The download of the code of the result. */
const RESULTS_CODE = createCodeDownload(
  () => import("./PcaTabResultView.tsx"),
  () => codeFilesReady("src/ui/analyses/pca/PcaTabResultView.tsx"),
);

/** Starts the download of the code of the result, when it has not
    arrived; a failure is left to the result drawn, which asks again. */
export function prefetchPcaResults(): void {
  if (RESULTS_CODE.state() === "loaded") return;
  RESULTS_CODE.load().catch(() => undefined);
}

/** The words of a download of the result that failed, in `s`. */
function failedWordsOf(s: AppState<JobResult, Blob>): string | null {
  return s.project.variants === null
    ? null
    : pcaTabResultFailed(
        pcaOptions(s.project, "popgen2").method,
        s.project.variants.name,
      );
}

/** The result of the PCA of the definition the store of popgen2.html
    runs, once its code is there. */
export function PcaTabResults(props: ResultsProps): React.JSX.Element {
  const failedWords = useAppState(failedWordsOf);
  return (
    <CodeSplit
      code={RESULTS_CODE}
      render={(code) => <code.PcaTabResultView {...props} />}
      loadingLine={LOADING_RESULT}
      failedWords={failedWords}
      retryFocus="section"
    />
  );
}
