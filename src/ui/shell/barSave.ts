/**
 * Save the project of the error bar (docs/specs/shell.md, "The error
 * bar"): it saves under the name the saving proposes, with no dialog, and
 * gives what the bar's status region then says. Apart from the bar, so
 * that a test in node drives it on the real store and saving.
 */
import type { Defects } from "../defects.ts";
import type { Saving } from "../saving.ts";
import { handedText } from "./saveOpen.ts";

/** What the bar's status region says when the project could not be
    written. */
export const NOT_SAVED =
  "The project could not be saved: the application met an error of its own as it wrote the file. Reloading the page would lose the project.";

/**
 * Saves the project under the name `saving` proposes, and gives the words
 * of the bar's status region: that the file was handed to the browser; or,
 * when writing it throws, a defect of our code, that it could not be
 * saved, with the error given to `defects`, whose bar counts it.
 */
export function saveFromBar(
  saving: Pick<Saving, "save" | "proposedName">,
  defects: Pick<Defects, "report">,
): string {
  try {
    return handedText(saving.save(saving.proposedName()));
  } catch (error) {
    // The one catch of a defect: the bar that would show it is the one
    // pressed, and it counts it there.
    defects.report(error, "barSave", null);
    return NOT_SAVED;
  }
}
