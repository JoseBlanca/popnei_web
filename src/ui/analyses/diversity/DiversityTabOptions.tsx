/**
 * The options of the diversity in the Populations tab of popgen2.html:
 * the old panel's three fields, `DiversityOptionsPart`, which wait while
 * the diversity runs, with the words of the lock of the filters
 * (docs/specs/steps/popgen2-populations.md, "While the diversity runs"),
 * and stay open while another analysis runs, the PCA among them, which
 * makes the diversity about to start after it (`useOptionsLock`).
 */
import { diversityOnPopgen2 } from "../../../core/analyses/diversity.ts";
import { useOptionsLock } from "../../variants/filtersLock.ts";
import { DiversityOptionsPart } from "./DiversityOptionsPart.tsx";

/** The options of the diversity of the Populations tab. */
export function DiversityTabOptions(): React.JSX.Element {
  return (
    <DiversityOptionsPart waiting={useOptionsLock(diversityOnPopgen2.id)} />
  );
}
