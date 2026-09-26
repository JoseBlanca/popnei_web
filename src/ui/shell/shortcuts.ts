/**
 * The keyboard's Undo and Redo (docs/specs/shell.md, "The header"; react.md,
 * "Keyboard shortcuts"): Ctrl+Z undoes, Ctrl+Shift+Z and Ctrl+Y redo, and
 * on macOS Cmd+Z and Cmd+Shift+Z; except while the focus is in a text
 * field, where they belong to the text, and in a dialog of the shell,
 * where they would change the project behind the question it asks; the
 * notice is not such a dialog. The shell's header listens for them on the
 * window.
 */

import { isInDialog } from "../widgets/dialogMark.ts";

/** What a key pressed does to the project. */
export type Shortcut = "undo" | "redo";

/** The parts of a `KeyboardEvent` a shortcut is told by. */
export interface KeysPressed {
  /** The character of the key, by the layout of the keyboard: "z", or
      "Z" with Shift. */
  readonly key: string;
  /** Whether Ctrl is held. */
  readonly ctrlKey: boolean;
  /** Whether Cmd, on macOS, is held. */
  readonly metaKey: boolean;
  /** Whether Shift is held. */
  readonly shiftKey: boolean;
  /** Whether Alt, Option on macOS, is held. */
  readonly altKey: boolean;
}

/**
 * The shortcut the keys give, or `null`. Z with Ctrl or Cmd undoes, and
 * with Shift as well redoes; Y with Ctrl redoes, and not with Cmd, which
 * on macOS opens the history of the browser. Alt makes none, since
 * Ctrl+Alt is how some keyboards type a character.
 */
export function shortcutOf(keys: KeysPressed): Shortcut | null {
  if (keys.altKey) return null;
  const letter = keys.key.toLowerCase();
  if (letter === "z" && (keys.ctrlKey || keys.metaKey)) {
    return keys.shiftKey ? "redo" : "undo";
  }
  if (letter === "y" && keys.ctrlKey && !keys.metaKey && !keys.shiftKey) {
    return "redo";
  }
  return null;
}

/** The types of `<input>` that hold no text of their own, whose Ctrl+Z is
    the project's. Any other type, and a type to come, is taken as a text
    field, which keeps its Ctrl+Z. */
const INPUTS_WITHOUT_TEXT: ReadonlySet<string> = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

/** Who the keys of Undo and Redo pressed on an element belong to: the
    project; a text field, whose own undo the browser gives; or a dialog
    of the shell, where they do nothing. */
export type KeysOwner = "project" | "text" | "dialog";

/** Who the keys pressed on `target` belong to. A text field comes first,
    so that the field of the name in the dialog of Save keeps its own
    undo. */
export function ownerOfKeys(target: EventTarget | null): KeysOwner {
  if (!(target instanceof Element)) return "project";
  if (
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLInputElement &&
      !INPUTS_WITHOUT_TEXT.has(target.type)) ||
    (target instanceof HTMLElement && target.isContentEditable)
  ) {
    return "text";
  }
  if (isInDialog(target)) return "dialog";
  return "project";
}
