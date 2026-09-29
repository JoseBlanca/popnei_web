/**
 * The title of each analysis, by which the shell names it in the stepper,
 * the notice and the status region, and what the words of the shell need
 * of the application, `SHELL_WORDS` (docs/specs/shell.md, "What it sends
 * and reads"): those titles, the step each analysis is shown in, from
 * `src/core/apps.ts`, and the variants the filters keep, `variantsKept`
 * of the same file. Apart from `panels.ts`, which holds components, so that
 * a test in node reads them. The three checks of the Variants step have a
 * title and no panel of `panels.ts`: the Variants step draws their parts
 * among its filters (docs/specs/steps/variants.md).
 *
 * `AnalysisId` is a string, so the compiler cannot tell an analysis with
 * no title or no step; `titleOf` and `stepOf` throw a defect for one,
 * which the shell meets at once.
 */
import { POPGEN_ANALYSIS_STEPS, variantsKept } from "../../core/apps.ts";
import type { StepId } from "../../core/apps.ts";
import type { AnalysisId } from "../../core/project.ts";
import type { JobResult } from "../../worker/protocol.ts";
import type { ShellWords } from "../shell/words.ts";

/** The title of every analysis of the applications, by its id: the
    heading of its panel, or of its part of the Variants step
    (docs/specs/analyses/individualChecks.md, variantChecks.md,
    filterCounts.md, pca.md and diversity.md). The principal components
    have one title whatever their method. */
const TITLES: ReadonlyMap<AnalysisId, string> = new Map([
  ["individualChecks", "Statistics of each individual"],
  ["variantChecks", "Histograms of the variants"],
  ["filterCounts", "Counts of the filters"],
  ["pca", "Principal components"],
  ["diversity", "Diversity"],
]);

/** The title of the analysis `id`, "Diversity", "Counts of the
    filters"; a defect when it has none. */
export function titleOf(id: AnalysisId): string {
  const title = TITLES.get(id);
  if (title === undefined) {
    throw new Error(`popnei_web defect: the analysis ${id} has no title.`);
  }
  return title;
}

/** The step the analysis `id` is shown in, from `src/core/apps.ts`; a
    defect for an analysis it does not list. */
export function stepOf(id: AnalysisId): StepId {
  const step = POPGEN_ANALYSIS_STEPS[id];
  if (step === undefined) {
    throw new Error(`popnei_web defect: the analysis ${id} is in no step.`);
  }
  return step;
}

/** What the words of the shell need of the population genetics
    application: the title of each analysis, the step it is shown in, and
    the variants the filters keep. */
export const SHELL_WORDS: ShellWords<JobResult> = Object.freeze({
  title: titleOf,
  stepOf,
  variantsKept,
});
