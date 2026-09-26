/**
 * The mark of the element of a dialog of `Dialog.tsx`, one that blocks the
 * page behind it, apart from the element's code so that the keyboard's
 * Undo and Redo, tested in node, can tell it without its styles, and so
 * that the toast, and a file read while one is open, can tell when one is
 * open.
 */

/** The attribute that marks the element of a dialog of `Dialog.tsx`. */
export const DIALOG_MARK = "data-blocking-dialog";

/** Whether `element` is inside a dialog of `Dialog.tsx`, one that blocks
    the page behind it. The notice is not: React Aria's toast is an alert
    dialog too, which blocks nothing. */
export function isInDialog(element: Element): boolean {
  return element.closest(`[${DIALOG_MARK}]`) !== null;
}

/** Whether a dialog of `Dialog.tsx` is on the page `page`, open or
    closing. */
export function isDialogOnPage(page: Document): boolean {
  return page.querySelector(`[${DIALOG_MARK}]`) !== null;
}

/** Resolves once no dialog of `Dialog.tsx` is on the page `page`, at
    once when none is. React Aria draws its dialogs at the end of the
    page's `<body>`, so what is added to it and taken from it is
    followed. */
export function whenNoDialog(page: Document): Promise<void> {
  return new Promise((resolve) => {
    if (!isDialogOnPage(page)) {
      resolve();
      return;
    }
    const observer = new MutationObserver(() => {
      if (isDialogOnPage(page)) return;
      observer.disconnect();
      resolve();
    });
    observer.observe(page.body, { childList: true, subtree: true });
  });
}
