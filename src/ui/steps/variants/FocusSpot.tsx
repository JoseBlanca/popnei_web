/**
 * A part that takes the focus from a script and is not a stop of the Tab
 * key, as the Count has three: the line of the total, the warning of a
 * file of no variant, and the words of an error
 * (docs/specs/steps/variants.md, "Accessibility"); and the hook that
 * moves the focus when one of them, or a button, leaves the page with it.
 */
import { useLayoutEffect, useRef } from "react";

import { classOf } from "../../classOf.ts";
import styles from "./VariantsStep.module.css";

/**
 * Gives the function a part calls when something of it leaves the page
 * with the focus, and, in the same commit, once what the part shows now
 * is in the page, moves the focus to the element `next` gives, or leaves
 * it where it is when `next` gives `null`.
 *
 * The flag the function sets lives until the end of the commit, and not
 * until the next drawing: in development React's StrictMode replays the
 * cleanup of a part just drawn after the focus was moved onto it, which
 * sets the flag with no commit to use it, and a flag left set would move
 * the focus at the next change, an Undo after a click on the blank page.
 * The focus is moved only when it was lost, on the body, for the replay
 * of a whole part mounted again, whose own drawing follows the cleanup.
 */
export function useFocusAfterLoss(next: () => HTMLElement | null): () => void {
  const focusLost = useRef(false);
  useLayoutEffect(() => {
    if (!focusLost.current) return;
    focusLost.current = false;
    const active = document.activeElement;
    if (active !== null && active !== document.body) return;
    next()?.focus();
  });
  return () => {
    focusLost.current = true;
    // After the commit that could use it, whether it did or not.
    queueMicrotask(() => {
      focusLost.current = false;
    });
  };
}

/** What a part that takes the focus is drawn with. */
export interface FocusSpotProps {
  /** Whether it is the line of the total, a paragraph, rather than a box
      of words. */
  readonly line?: boolean;
  /** Given its element, and `null` when it goes. */
  readonly onNode: (node: HTMLElement | null) => void;
  /** Called when it leaves the page with the focus in it. */
  readonly onGone: () => void;
  /** What it holds. */
  readonly children: React.ReactNode;
}

/** A part of the Count that takes the focus from a script and is not a
    stop of the Tab key: the line of the total, the warning of a file of
    no variant, or the words of an error. When it leaves the page with the
    focus, it calls `onGone`, for the part to move the focus to what it
    shows next (the spec, "Accessibility"). */
export function FocusSpot({
  line = false,
  onNode,
  onGone,
  children,
}: FocusSpotProps): React.JSX.Element {
  const own = useRef<HTMLElement | null>(null);
  // The latest onGone, for the cleanup below, which runs once.
  const gone = useRef(onGone);
  useLayoutEffect(() => {
    gone.current = onGone;
  });
  useLayoutEffect(() => {
    const node = own.current;
    return () => {
      // The cleanup of a layout effect runs while the part is still in
      // the page, so the focus is still in it when it had it.
      if (node?.contains(document.activeElement) === true) {
        gone.current();
      }
    };
  }, []);
  const setNode = (node: HTMLElement | null): void => {
    own.current = node;
    onNode(node);
  };
  return line ? (
    <p ref={setNode} tabIndex={-1} className={classOf(styles, "line")}>
      {children}
    </p>
  ) : (
    <div ref={setNode} tabIndex={-1}>
      {children}
    </div>
  );
}
