/**
 * What an analysis in error says went wrong and what to do, shared by the
 * panels of the Analyses step (AnalysisPanel.tsx) and the parts of the
 * checks of the Variants step: the words the analysis gives popnei's
 * refusal, or those of `failureText` for any other failure, with the
 * sentence that asks for the calculation again; or, for the failure of
 * the statistics of each individual that a Run waited for, the words the
 * analysis gives it. The Variants step shows them without "in the
 * Variants step", as the owner decided at stop A.
 */
import type { Failure } from "../../core/analyses/individualChecks.ts";
import type { Project } from "../../core/project.ts";
import type { AnalysisError } from "../../core/store.ts";
import { useAppState } from "../store.tsx";
import { Problem } from "../widgets/Problem.tsx";
import { failureText } from "./words.ts";

/** What the words of a failure are drawn with. */
export interface FailedProps {
  /** The error the store gives the analysis. */
  readonly error: AnalysisError;
  /** The analysis in the middle of a sentence, for the words of a defect:
      "the histograms of the variants". */
  readonly name: string;
  /** The words of popnei's refusal `message`, which each analysis
      writes. */
  readonly refusalText: (message: string, p: Project) => string;
  /** The sentence that asks for the calculation again, "Calculate them
      again."; "Run it again." when absent. */
  readonly again?: string;
  /** Given when the error is the failure of the statistics of each
      individual that a Run waited for, the store's error with
      `ofStatistics`: its words, from the error, the project, and the
      words of the frame for a failure that is not popnei's refusal. They
      replace the analysis's own, which would name it for a calculation
      that was not its own. */
  readonly statisticsFailedText?: (
    error: AnalysisError,
    p: Project,
    failureText: (failure: Failure) => string,
  ) => string;
  /** What the step that shows the words makes of them: the Variants
      step takes "in the Variants step" out of them, `withoutTheStep`;
      left as they are when absent. */
  readonly asShown?: (text: string) => string;
  /** The words of a worker that stopped with no answer, `workerFailed`,
      for the project, when the analysis has its own: those of the
      principal components say it by the memory the calculation needed
      (docs/specs/analyses/pca.md, "Its words"); those of `failureText`
      when absent. */
  readonly workerFailedText?: (p: Project) => string;
}

/** What went wrong, and what to do. */
export function Failed({
  error,
  name,
  refusalText,
  again,
  statisticsFailedText,
  asShown,
  workerFailedText,
}: FailedProps): React.JSX.Element {
  const text = useAppState((s) => {
    const variants = s.project.variants;
    // A calculation is keyed by the load of the variants file, so an
    // error has one.
    if (variants === null) {
      throw new Error(
        `popnei_web defect: ${name} is in error with no variants file.`,
      );
    }
    if (statisticsFailedText !== undefined) {
      return statisticsFailedText(error, s.project, (failure) =>
        failureText(failure, variants.name, again),
      );
    }
    if (error.kind === "refused") {
      return refusalText(error.message, s.project);
    }
    return error.error.kind === "workerFailed" && workerFailedText !== undefined
      ? workerFailedText(s.project)
      : failureText(error.error, variants.name, again);
  });
  return <Problem>{asShown === undefined ? text : asShown(text)}</Problem>;
}
