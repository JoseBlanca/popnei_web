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
  /** The place of the key on the keyboard, named by the key of a US
      keyboard there: "KeyZ", whatever the layout gives. */
  readonly code: string;
  /** Whether Ctrl is held. */
  readonly ctrlKey: boolean;
  /** Whether Cmd, on macOS, is held. */
  readonly metaKey: boolean;
  /** Whether Shift is held. */
  readonly shiftKey: boolean;
  /** Whether Alt, Option on macOS, is held. */
  readonly altKey: boolean;
}

/** The letter of the keys: the one the layout gives when it is a Latin
    letter, so that AZERTY and QWERTZ keep Z and Y where their users see
    them; otherwise, on a Russian or a Greek layout, the letter of the
    same place on a US keyboard. In lower case, or "" for a key that is no
    letter. */
function letterOf(keys: KeysPressed): string {
  const letter = keys.key.toLowerCase();
  if (/^[a-z]$/.test(letter)) return letter;
  const place = /^Key([A-Z])$/.exec(keys.code);
  return place?.[1]?.toLowerCase() ?? "";
}

/**
 * The shortcut the keys give, or `null`. Z with Ctrl or Cmd undoes, and
 * with Shift as well redoes; Y with Ctrl redoes, and not with Cmd, which
 * on macOS opens the history of the browser. Alt makes none, since
 * Ctrl+Alt is how some keyboards type a character.
 */
export function shortcutOf(keys: KeysPressed): Shortcut | null {
  if (keys.altKey) return null;
  const letter = letterOf(keys);
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

/** Whether an `InputEvent` of the browser, of the type `inputType` on the
    element `target`, is the browser's undo or redo of a field other than
    `focused`, the one that has the focus: WebKit, once the field with
    the focus has nothing left to undo, goes on to the field edited
    before it, which would then show a number the project does not hold
    (docs/specs/shell.md, "The header"). */
export function undoesAnotherField(
  inputType: string,
  target: EventTarget | null,
  focused: Element | null,
): boolean {
  return (
    (inputType === "historyUndo" || inputType === "historyRedo") &&
    target !== focused
  );
}
