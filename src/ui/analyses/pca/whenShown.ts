/**
 * Whether an element of the result of the PCA is shown, and the wait
 * until it is, through which the 3D view's words reach the status
 * region: "Loading the 3D view…" and its failures are said once the view
 * is shown, and not while its tab is hidden behind another
 * (docs/specs/steps/popgen2-pca.md, "Accessibility").
 */

/** Whether `element` is shown: not in a tab hidden, nor under another
    element of no display. `checkVisibility` where the browser has it;
    otherwise, in Safari before 17.4, whose floor is 16.4
    (docs/technology.md, section 6), whether the element has boxes, which
    an element in a hidden tab has none of. */
export function isShown(element: HTMLElement): boolean {
  return typeof element.checkVisibility === "function"
    ? element.checkVisibility()
    : element.getClientRects().length > 0;
}

/** Calls `then` once `element` is shown, at once when it is, or when
    there is no element; gives the function that stops waiting. A hidden
    element is shown when it gains a size, which its ResizeObserver
    tells. */
export function whenShown(
  element: HTMLElement | null,
  then: () => void,
): () => void {
  if (element === null || isShown(element)) {
    then();
    return () => undefined;
  }
  const observer = new ResizeObserver(() => {
    if (!isShown(element)) return;
    observer.disconnect();
    then();
  });
  observer.observe(element);
  return () => {
    observer.disconnect();
  };
}
