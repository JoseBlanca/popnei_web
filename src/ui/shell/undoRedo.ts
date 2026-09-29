/**
 * An undo or a redo of the project, as the header's buttons, the keyboard
 * and the notice's action make it (docs/specs/shell.md, "The status
 * region"). One that makes no notice is announced in the status region,
 * "Undone: the filter of the variants by missing data changed.", since without it a user of
 * a screen reader who pressed Ctrl+Z would hear nothing; one that makes a
 * notice is read out by the notice. It is said before what the change
 * announces from the state, the warning of a reopened project it brings
 * back among it, since it is what the user did.
 *
 * One that brings back the LD pruning with no distance says after it the
 * reason whole, as the stepper gives it, since the undo may be pressed on
 * any step, or the reason alone when it makes a notice: the Count and the
 * analyses that read the filters are locked again, and the focus is
 * where the user left it (stop A 3, decided by the owner on 29 September
 * 2026).
 */
import { variantFilterNeeds } from "../../core/project.ts";
import type { Store } from "../../core/store.ts";
import type { Shortcut } from "./shortcuts.ts";
import type { Announcer } from "./status.ts";
import { undoneOrRedone } from "../sentences.ts";

/** Undoes or redoes the project of `store`, as `which` says, and
    announces it when it makes no notice, with the reason of the LD
    pruning with no distance when it brings it back; nothing when there
    is no step to undo or redo. */
export function undoOrRedo<R, F>(
  store: Store<R, F>,
  announcer: Announcer,
  which: Shortcut,
): void {
  const before = store.getState();
  const description = before[which];
  if (description === null) return;
  const lockedBefore = variantFilterNeeds(before.project);
  announcer.announceChange(() => {
    if (which === "undo") store.undo();
    else store.redo();
    const after = store.getState();
    const locked =
      lockedBefore === null ? variantFilterNeeds(after.project) : null;
    const words =
      after.notice === null
        ? undoneOrRedone({ kind: which, description })
        : null;
    const said = [
      ...(words === null ? [] : [`${words}.`]),
      ...(locked === null ? [] : [locked]),
    ];
    return said.length === 0 ? null : said.join(" ");
  });
}
