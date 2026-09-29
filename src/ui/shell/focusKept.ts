/**
 * The focus kept on the page through an Undo or a Redo that removes the
 * control that had it (docs/specs/shell.md, "Accessibility", "The focus
 * is never dropped"; WCAG 2.4.3): "Forget these types" after an Undo of
 * the separator that applies the types again, the select of the value
 * coded 1 after an Undo of the type binary, a select of the table while
 * the file is read again. The browser would otherwise leave the focus on
 * nothing, and the next Tab would start from the top of the page.
 */

/**
 * Runs `change`, which draws what it changes before it returns, as a
 * `flushSync` does; then, when the element that had the focus left the
 * page with it and nothing took the focus since, gives it to the `<h1>`
 * of the step on screen, as Close of the error bar does.
 *
 * It looks in a microtask, which runs before the browser paints and after
 * those the change queued: the Variants step moves the focus itself when
 * a part of its Count leaves the page, from such a microtask, and the
 * focus it gives is kept.
 */
export function keepingFocus(change: () => void): void {
  const before = document.activeElement;
  change();
  if (before === null || before === document.body) return;
  queueMicrotask(() => {
    if (before.isConnected) return;
    const now = document.activeElement;
    if (now !== null && now !== document.body && now.isConnected) return;
    const heading = document.querySelector("main h1");
    if (heading instanceof HTMLElement) heading.focus();
  });
}
