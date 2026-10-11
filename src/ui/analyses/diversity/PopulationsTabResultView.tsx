/**
 * The result of the Populations tab of popgen2.html: the old panel's
 * table and block of the spectrum, given the definition the store of
 * this page runs, `diversityOnPopgen2`. In the code of the tab, which
 * is downloaded apart from the page's (`PopulationsTab.tsx`).
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
