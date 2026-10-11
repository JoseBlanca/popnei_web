/**
 * The result of the Populations tab of popgen2.html once its code is
 * there: the old panel's table and block of the spectrum, given the
 * definition the store of this page runs, `diversityOnPopgen2`. A module
 * of its own, which `PopulationsTabResults.tsx` alone imports with
 * `import()`, so that the bundler makes it a file of its own with its
 * export under its name, as `PcaTabResultView.tsx` is for the PCA tab.
 */
import { diversityOnPopgen2 } from "../../../core/analyses/diversity.ts";
import type { ResultsProps } from "../panels.ts";
import { DiversityResults } from "./DiversityResults.tsx";

/** The result of the diversity of the definition the store of
    popgen2.html runs. */
export function PopulationsTabResultView(
  props: ResultsProps,
): React.JSX.Element {
  return <DiversityResults {...props} analysis={diversityOnPopgen2} />;
}
