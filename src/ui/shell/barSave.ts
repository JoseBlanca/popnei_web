/**
 * Save the project of the error bar (docs/specs/shell.md, "The error
 * bar"): it saves under the name the saving proposes, with no dialog, and
 * gives what the bar's status region then says; and the words of the
 * bar's first line, which change once that Save has failed. Apart from the bar, so
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

/** The words of the bar for the first error, `message` without its last
    full stop, since the sentence adds its own: with a store, that the
    project is intact and to save it, or, once `saveFailed`, that it could
    not be saved; without one, as the page started, to reload. */
export function barText(
  message: string,
  hasStore: boolean,
  saveFailed: boolean,
): string {
  const text = message.endsWith(".") ? message.slice(0, -1) : message;
  if (!hasStore) {
    return `The application met an error of its own as it started: ${text}. Reload the page.`;
  }
  return saveFailed
    ? `The application met an error of its own: ${text}. Your project could not be saved; copy the details and report them.`
    : `The application met an error of its own: ${text}. Your project is intact: save it, then reload the page.`;
}

/** The label of the bar's Save: "Try to save again" after a save that
    could not write the project, until one succeeds, so that the bar does
    not offer again in the same words what has just failed
    (docs/specs/shell.md, "The error bar"). */
export function saveLabel(saveFailed: boolean): string {
  return saveFailed ? "Try to save again" : "Save the project";
}
