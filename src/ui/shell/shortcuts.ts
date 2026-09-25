/**
 * The keyboard's Undo and Redo (docs/specs/shell.md, "The header"; react.md,
 * "Keyboard shortcuts"): Ctrl+Z undoes, Ctrl+Shift+Z and Ctrl+Y redo, and
 * on macOS Cmd+Z and Cmd+Shift+Z; except while the focus is in a text
 * field, where they belong to the text, and in a dialog, where they would
 * change the project behind the question it asks. The shell's header
 * listens for them on the window.
 */

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

/** Whether the keys pressed on `target` belong to the page and not to a
    text field or a dialog. */
export function isForTheProject(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true;
  if (target.closest('[role="dialog"], [role="alertdialog"]') !== null) {
    return false;
  }
  if (target instanceof HTMLTextAreaElement) return false;
  if (target instanceof HTMLInputElement) {
    return INPUTS_WITHOUT_TEXT.has(target.type);
  }
  return !(target instanceof HTMLElement && target.isContentEditable);
}
