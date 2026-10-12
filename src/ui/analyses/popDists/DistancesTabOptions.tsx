/**
 * The options of the distances in the Distances tab of popgen2.html: the
 * old panel's field of the minimum and radio buttons of the measure,
 * `PopDistsOptionsPart`, the field waiting while the distances run, with
 * the words of the lock of the filters, and open while another analysis
 * runs, which makes the distances about to start after it
 * (docs/specs/steps/popgen2-distances.md, "While the distances run").
 */
import { popDistsOnPopgen2 } from "../../../core/analyses/popDists.ts";
import { useOptionsLock } from "../../variants/filtersLock.ts";
import { PopDistsOptionsPart } from "./PopDistsOptionsPart.tsx";

/** The options of the distances of the Distances tab. */
export function DistancesTabOptions(): React.JSX.Element {
  return <PopDistsOptionsPart waiting={useOptionsLock(popDistsOnPopgen2.id)} />;
}
