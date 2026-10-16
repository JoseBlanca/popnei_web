/**
 * The button that removes the individuals file on popgen2.html, "Remove
 * panel_pops.csv", beside "Open another individuals file…" at the end of
 * the Individuals tab since 16 October 2026, and at its top before
 * (docs/plans/file-buttons.md). It is greyed while an analysis that reads
 * the populations runs (docs/specs/steps/popgen2-input.md, "While the
 * diversity runs"), and the history starts afresh at its press ("What it
 * sends and reads"). The two buttons go with the file, and the row that
 * holds them, when it had the focus, gives it to "Open individuals
 * file…", which the box Individuals holds again once no individuals file
 * is open, and holds only then (PageTabs.tsx).
 */
import { usePopgen2Store } from "../store.tsx";
import { Button } from "../widgets/Button.tsx";
import { usePopulationsLock } from "./filtersLock.ts";
import { REMOVE_INDIVIDUALS_COMMAND } from "./individualsCommands.ts";
import { removeLabel } from "./individualsWords.ts";

/** What Remove is drawn with. */
export interface RemoveIndividualsProps {
  /** The name of the individuals file. */
  readonly name: string;
}

/** The button that removes the individuals file `name`. */
export function RemoveIndividuals({
  name,
}: RemoveIndividualsProps): React.JSX.Element {
  const store = usePopgen2Store();
  const lock = usePopulationsLock();
  return (
    <Button
      label={removeLabel(name)}
      onPress={() => {
        store.applyAfresh(REMOVE_INDIVIDUALS_COMMAND.command);
      }}
      waiting={lock}
    />
  );
}
