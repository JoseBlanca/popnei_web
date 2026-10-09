/**
 * The reason of a control that waits, a radio group, a switch, a check
 * box or a number field, as the filters a running PCA reads on
 * popgen2.html (waiting.ts; docs/specs/steps/popgen2-pca.md, "While a
 * PCA runs"): its tooltip shows on the mouse resting on the control, on
 * a press of it, a click, a tap, Enter or Space, and on the focus in it;
 * it stays while the focus is in the control, through the scroll that
 * brings a control reached by the Tab key into view; and it goes with
 * Escape, when the focus leaves, and when the mouse leaves a control that
 * does not have the focus. It is placed under the control's visible
 * part, at its start.
 *
 * React Aria gives a tooltip's trigger its handlers through the element
 * that takes the focus, which for a radio button, a switch and a check
 * box is an input hidden under the visible circle, track or box and
 * their words, so that the mouse on what the user sees opened nothing,
 * and a press, which closes a tooltip of React Aria, left a click or a
 * tap without the reason (the review of work package 6 of
 * docs/plans/analyses-pca.md, 10 October 2026, in Chromium and WebKit).
 * So the tooltip is held here (`HeldTooltip` of Tooltip.tsx), and an
 * element with no box of its own around the control, which changes no
 * layout, opens it from what reaches any part of the control, in the
 * phase of capture, before React Aria's handlers of a press, which stop
 * the events they handle. The delay of the mouse, and the grace that
 * lets the mouse move onto the tooltip, are React Aria's, through the
 * state of the trigger.
 *
 * A control given no reason draws the same elements and does nothing
 * more, as on popgen.html.
 */
import { useContext, useRef, useState } from "react";
import { TooltipTriggerStateContext } from "react-aria-components";

import { classOf } from "../classOf.ts";
import { WithTooltip } from "./Tooltip.tsx";
import type { HeldTooltip } from "./Tooltip.tsx";
import styles from "./WaitingTooltip.module.css";

/** What a control that may wait is drawn with. */
export interface WaitingTooltipProps {
  /** The reason the control waits, or `null` when it does not. */
  readonly text: string | null;
  /** The visible part of the control, which the tooltip is placed
      under, at its start. */
  readonly anchor: React.RefObject<Element | null>;
  /** Draws the control, given the id of the reason's hidden text, to
      add to its `aria-describedby`, or `undefined` when it does not
      wait. */
  readonly children: (describedBy: string | undefined) => React.ReactElement;
}

/** A control with the tooltip of the reason it waits. */
export function WaitingTooltip({
  text,
  anchor,
  children,
}: WaitingTooltipProps): React.JSX.Element {
  const [shown, setShown] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);
  // A reason gone closes the tooltip, so that it does not show by itself
  // when the control waits again.
  if (text === null && shown) {
    setShown(false);
  }
  const held: HeldTooltip = {
    isOpen: shown,
    onOpenChange: setShown,
    hasFocus: () => focusIn(areaRef.current),
    placedUnder: anchor,
    crossOffset: 0,
  };
  return (
    <WithTooltip text={text} held={held}>
      {(describedBy) => (
        <Area areaRef={areaRef} waits={text !== null}>
          {children(describedBy)}
        </Area>
      )}
    </WithTooltip>
  );
}

/** Whether the focus is in `area`. */
function focusIn(area: Element | null): boolean {
  return area?.contains(document.activeElement) === true;
}

/** The keys that press a control. */
const PRESS_KEYS: ReadonlySet<string> = new Set([" ", "Enter"]);

/** The element around a control that opens its tooltip from what
    reaches it, drawn inside the trigger, whose state it opens and closes
    with React Aria's delays. */
function Area({
  areaRef,
  waits,
  children,
}: {
  readonly areaRef: React.RefObject<HTMLDivElement | null>;
  readonly waits: boolean;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const state = useContext(TooltipTriggerStateContext);
  if (state === null) {
    throw new Error(
      "popnei_web defect: the tooltip of a control that waits was drawn outside its trigger.",
    );
  }
  // Whether the mouse is over the control, which keeps the tooltip when
  // the focus leaves.
  const pointerOver = useRef(false);
  return (
    <div
      ref={areaRef}
      className={classOf(styles, "area")}
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse") return;
        pointerOver.current = true;
        if (waits) state.open(false);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "mouse") return;
        pointerOver.current = false;
        if (waits && !focusIn(areaRef.current)) state.close();
      }}
      onClickCapture={() => {
        if (waits) state.open(true);
      }}
      onKeyDownCapture={(event) => {
        if (waits && PRESS_KEYS.has(event.key)) state.open(true);
      }}
      onFocusCapture={() => {
        if (waits) state.open(true);
      }}
      onBlurCapture={(event) => {
        if (!waits) return;
        const next = event.relatedTarget;
        if (next instanceof Node && areaRef.current?.contains(next) === true) {
          return;
        }
        if (!pointerOver.current) state.close(true);
      }}
    >
      {children}
    </div>
  );
}
