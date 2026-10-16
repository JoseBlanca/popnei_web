/**
 * The focus handed on when a part of popgen2.html that holds it leaves
 * the page (docs/plans/file-buttons.md, "The design"; WCAG 2.4.3): the
 * button of a box that opens its first file, which goes once the file is
 * open, hands it to the box's heading; Remove and "Open another
 * individuals file…" at the end of the Individuals tab, which go with the
 * file, hand it to "Open individuals file…" of the box, which comes back
 * with no file. Without it the browser leaves the focus on nothing, and
 * the next press of Tab starts from the top of the page.
 */
import { useLayoutEffect, useRef, useState } from "react";

/**
 * A ref for the element of a part that may leave the page: when it
 * leaves holding the focus, the element `target` gives takes it, once
 * the change that removed the part is drawn. `target` is called then,
 * not when the part is drawn, since what takes the focus may come in the
 * same change, as the box's button comes back as Remove goes.
 *
 * The ref is the same function at every drawing, as React calls the
 * cleanup of a ref, and so would hand the focus on, whenever the
 * function changes.
 */
export function useFocusOnGone(
  target: () => HTMLElement | null,
): React.RefCallback<HTMLElement> {
  const targetNow = useRef(target);
  useLayoutEffect(() => {
    targetNow.current = target;
  });
  const [ref] = useState(
    () =>
      (node: HTMLElement | null): (() => void) | undefined => {
        if (node === null) return undefined;
        // React calls the cleanup of a ref while the element is still in
        // the page, so the focus is still in it when it had it.
        return () => {
          if (!node.contains(document.activeElement)) return;
          // What takes the focus is drawn in the same change, after this
          // cleanup; a microtask runs once the change is drawn, before the
          // browser paints.
          queueMicrotask(() => {
            // Only when the focus fell with the part: on the body, or on
            // an element no longer in the page. Anything else took it
            // since, and keeps it.
            const now = document.activeElement;
            if (now !== null && now !== document.body && now.isConnected) {
              return;
            }
            targetNow.current()?.focus();
          });
        };
      },
  );
  return ref;
}
