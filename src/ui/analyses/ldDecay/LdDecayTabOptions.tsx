/**
 * The options of the LD decay in the Populations tab of popgen2.html:
 * the old panel's two fields, `LdDecayOptionsPart`, given the definition
 * of that page, which wait while the LD decay runs, with the words of the
 * lock of the filters, and stay open while another analysis runs, which
 * makes the LD decay about to start after it
 * (docs/specs/steps/popgen2-populations.md, "The LD decay", "While it
 * runs").
 */
import { ldDecayOnPopgen2 } from "../../../core/analyses/ldDecay.ts";
import { useOptionsLock } from "../../variants/filtersLock.ts";
import { LdDecayOptionsPart } from "./LdDecayOptionsPart.tsx";

/** The options of the LD decay of the Populations tab. */
export function LdDecayTabOptions(): React.JSX.Element {
  return (
    <LdDecayOptionsPart
      analysis={ldDecayOnPopgen2}
      waiting={useOptionsLock(ldDecayOnPopgen2.id)}
    />
  );
}
