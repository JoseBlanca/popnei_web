/**
 * The pieces of sentences that the words of the shell and those of the
 * analysis panels share (docs/specs/shell.md, "The notice";
 * docs/specs/analyses/diversity.md, "Its words"): a sentence started with
 * a capital, and the start of the words of an undo or a redo.
 */
import type { Notice } from "../core/store.ts";

/** A sentence that starts with `words`, its first letter made upper
    case. */
export function capitalized(words: string): string {
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

/** How the words of an undo or a redo start, "Undone: the missing data
    filter changed", with no full stop; `null` for a command, whose
    description is the reason itself. */
export function undoneOrRedone(cause: Notice["cause"]): string | null {
  switch (cause.kind) {
    case "command":
      return null;
    case "undo":
      return `Undone: ${cause.description}`;
    case "redo":
      return `Redone: ${cause.description}`;
  }
}
