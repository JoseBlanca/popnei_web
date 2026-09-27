/**
 * A part of a result of a check drawn away from its block, a histogram
 * beside its filter or the table of the individuals, which hands the
 * focus to the heading of that block when it leaves the page with the
 * focus in it, removed by an Undo or a change of the filters, or, when
 * the block goes with it, an Undo of the load of the variants file, to
 * the heading of the section, which stays; so that a user of the
 * keyboard is not sent to the top of the page
 * (docs/specs/steps/variants.md, "Accessibility"; WCAG 2.4.3).
 */
import { useLayoutEffect, useRef } from "react";

import { classOf } from "../../classOf.ts";
import styles from "./VariantsStep.module.css";

/** What the part is drawn with. */
export interface FocusOnLeaveProps {
  /** The id of the heading of the block of the check, which can take the
      focus. */
  readonly headingId: string;
  /** The id of the heading of the section that holds the block, which
      stays when the block goes, and can take the focus. */
  readonly sectionHeadingId: string;
  /** The part. */
  readonly children: React.ReactNode;
}

/** Its children, in a box that takes no place of its own in the layout. */
export function FocusOnLeave({
  headingId,
  sectionHeadingId,
  children,
}: FocusOnLeaveProps): React.JSX.Element {
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = box.current;
    return () => {
      // The cleanup of a layout effect runs while the part is still in
      // the page, so the focus is still in it when it had it.
      if (node?.contains(document.activeElement) !== true) return;
      // Which heading stays is known only once the whole change is in the
      // page: the block may leave in the same change, an Undo of the
      // load, and React may remove it before or after this part, by
      // their order in the page. So the heading is looked for after the
      // change, in a microtask, which runs before the browser paints.
      queueMicrotask(() => {
        const heading =
          document.getElementById(headingId) ??
          document.getElementById(sectionHeadingId);
        heading?.focus();
      });
    };
  }, [headingId, sectionHeadingId]);
  return (
    <div ref={box} className={classOf(styles, "contents")}>
      {children}
    </div>
  );
}
