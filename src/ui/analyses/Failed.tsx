/**
 * What an analysis in error says went wrong and what to do, shared by the
 * panels of the Analyses step (AnalysisPanel.tsx) and the parts of the
 * checks of the Variants step: the words the analysis gives popnei's
 * refusal, or those of `failureText` for any other failure, with the
 * sentence that asks for the calculation again.
 */
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
}

/** What went wrong, and what to do. */
export function Failed({
  error,
  name,
  refusalText,
  again,
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
    return error.kind === "refused"
      ? refusalText(error.message, s.project)
      : failureText(error.error, variants.name, again);
  });
  return <Problem>{text}</Problem>;
}
