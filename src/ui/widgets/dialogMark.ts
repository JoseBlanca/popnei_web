/**
 * The mark of the element of a dialog of `Dialog.tsx`, one that blocks the
 * page behind it, apart from the element's code so that the keyboard's
 * Undo and Redo, tested in node, can tell it without its styles.
 */

/** The attribute that marks the element of a dialog of `Dialog.tsx`. */
export const DIALOG_MARK = "data-blocking-dialog";

/** Whether `element` is inside a dialog of `Dialog.tsx`, one that blocks
    the page behind it. The notice is not: React Aria's toast is an alert
    dialog too, which blocks nothing. */
export function isInDialog(element: Element): boolean {
  return element.closest(`[${DIALOG_MARK}]`) !== null;
}
