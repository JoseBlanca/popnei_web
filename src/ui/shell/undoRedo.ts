/**
 * An undo or a redo of the project, as the header's buttons, the keyboard
 * and the notice's action make it (docs/specs/shell.md, "The status
 * region"). One that makes no notice is announced in the status region,
 * "Undone: the missing data filter changed.", since without it a user of
 * a screen reader who pressed Ctrl+Z would hear nothing; one that makes a
 * notice is read out by the notice.
 */
import type { Store } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import type { Shortcut } from "./shortcuts.ts";
import type { Announcer } from "./status.ts";
import { undoneOrRedone } from "./words.ts";

/** Undoes or redoes the project of `store`, as `which` says, and
    announces it when it makes no notice; nothing when there is no step
    to undo or redo. */
export function undoOrRedo(
  store: Store<JobResult>,
  announcer: Announcer,
  which: Shortcut,
): void {
  const description = store.getState()[which];
  if (description === null) return;
  if (which === "undo") store.undo();
  else store.redo();
  if (store.getState().notice !== null) return;
  const words = undoneOrRedone({ kind: which, description });
  if (words !== null) announcer.announce(`${words}.`);
}
