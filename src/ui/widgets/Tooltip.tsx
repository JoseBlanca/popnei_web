/**
 * A tooltip: React Aria's `TooltipTrigger` and `Tooltip`, with our look
 * (react.md, "Widgets: React Aria, wrapped once"). It shows a short text
 * beside a button, a link or a tab while the pointer rests on it or the
 * keyboard has put the focus on it, and Escape hides it. React Aria gives the
 * trigger the tooltip as its description only while it is shown, so the
 * text is also on the page, hidden, as the trigger's description at all
 * times, for a screen reader that reads the page without moving the
 * focus: `aria-describedby` reads an element that is hidden, and a hidden
 * element is not read twice in the reading of the page.
 *
 * Used by `Button` and `StepLink`, which give their element the id of the
 * hidden text, and by `Tabs` for a greyed tab, which draws the hidden text
 * itself outside its row of labels (`drawnElsewhereId`) and holds its
 * tooltip open (`held`); a screen does not import it.
 *
 * Whether the tooltip is open is state of this widget, or of its caller
 * with `held`, and never React Aria's alone: a text that becomes null
 * closes it. React Aria, given no text, drops the handlers that would
 * close an open tooltip, so that it stayed on the page, empty, after the
 * focus or the pointer had left (the review of work package 1 of
 * docs/plans/analyses-pca.md, 9 October 2026).
 */
import { useContext, useId, useState } from "react";
import {
  Tooltip as AriaTooltip,
  TooltipTrigger as AriaTooltipTrigger,
  TooltipTriggerStateContext,
} from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./Tooltip.module.css";

/** How long the pointer rests on the trigger before the tooltip shows,
    in milliseconds; the focus of the keyboard shows it at once. React
    Aria's default, 1500 ms, would leave the reason of a step unseen by a
    user who does not wait; decided here. */
const TOOLTIP_DELAY_MS = 500;

/** The distance between the trigger and the tooltip, in pixels, which
    React Aria takes as a number: 8 px, the `--space-2` of tokens.css. */
const TOOLTIP_OFFSET_PX = 8;

/** A tooltip held open by the caller, as a greyed tab's reason: it opens
    on a press of its trigger, by the caller, as well as on the pointer
    and the focus; a press does not close it; it stays through a scroll
    while its trigger has the focus; and it is placed under another
    element than its trigger. It closes on Escape, when the focus leaves
    the trigger, when the pointer leaves the trigger and the tooltip, and
    when its text becomes null. */
export interface HeldTooltip {
  /** Whether the tooltip is open; the caller holds it. */
  readonly isOpen: boolean;
  /** Called when the pointer, the focus or Escape opens or closes it. */
  readonly onOpenChange: (isOpen: boolean) => void;
  /** Whether the trigger has the focus, read when a scroll would close
      the tooltip: the browser scrolls a trigger reached by the keyboard
      into view, and React Aria closes every tooltip on a scroll of what
      holds its trigger. */
  readonly hasFocus: () => boolean;
  /** The element the tooltip is placed under, at its start, in place of
      the trigger: the row of tabs, so that on two lines the tooltip of
      a tab of the first does not hide the second. */
  readonly placedUnder: React.RefObject<Element | null>;
}

/** What a trigger with a tooltip is drawn with. */
export interface WithTooltipProps {
  /** The text of the tooltip, or `null` for none: the trigger is then
      drawn the same, with no tooltip and no description. */
  readonly text: string | null;
  /** Draws the trigger, a button, a link or a tab of React Aria, given
      the id of its description, to set as its `aria-describedby`, or
      `undefined` when there is no text. */
  readonly children: (describedBy: string | undefined) => React.ReactElement;
  /** Given, the caller draws the hidden text itself, elsewhere, under
      this id, and this widget draws none: for a trigger in a collection
      of React Aria, a tab in its row, where an element that is not an
      item breaks the collection. Absent, this widget draws the hidden
      text beside the trigger, under an id of its own. Not the
      `descriptionId` of `Button`, which names an element the button
      draws. */
  readonly drawnElsewhereId?: string;
  /** Given, the caller holds the tooltip open, as `HeldTooltip` says.
      Absent, this widget holds it, and React Aria opens and closes it on
      the pointer, the focus, a press and Escape. */
  readonly held?: HeldTooltip;
}

/** A button, a link or a tab of React Aria, with a tooltip and the same
    text as its description. The tree is the same with a text and without, so
    that a trigger that gains or loses one keeps the focus. */
export function WithTooltip({
  text,
  children,
  drawnElsewhereId,
  held,
}: WithTooltipProps): React.JSX.Element {
  const ownId = useId();
  const id = drawnElsewhereId ?? ownId;
  const [ownOpen, setOwnOpen] = useState(false);
  // A text gone closes the tooltip, so that it does not open again by
  // itself when a text comes back.
  if (text === null && ownOpen) {
    setOwnOpen(false);
  }
  const isOpen = (held === undefined ? ownOpen : held.isOpen) && text !== null;
  return (
    <>
      <AriaTooltipTrigger
        delay={TOOLTIP_DELAY_MS}
        isDisabled={text === null}
        isOpen={isOpen}
        onOpenChange={held === undefined ? setOwnOpen : held.onOpenChange}
        shouldCloseOnPress={held === undefined}
      >
        {children(text === null ? undefined : id)}
        {held === undefined ? (
          <AriaTooltip
            className={classOf(styles, "tooltip")}
            placement="bottom"
            offset={TOOLTIP_OFFSET_PX}
          >
            {text}
          </AriaTooltip>
        ) : (
          <HeldTooltipBox held={held}>{text}</HeldTooltipBox>
        )}
      </AriaTooltipTrigger>
      {text !== null && drawnElsewhereId === undefined && (
        <span id={id} hidden>
          {text}
        </span>
      )}
    </>
  );
}

/** The tooltip of a `HeldTooltip`: React Aria's, under the element
    `placedUnder` at its start, given a state of its trigger that does not
    close on a scroll while the trigger has the focus. React Aria closes
    a tooltip on a scroll with `close(true)`, and on the pointer leaving
    the tooltip with `close()`, which still closes it. */
function HeldTooltipBox({
  held,
  children,
}: {
  readonly held: HeldTooltip;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const state = useContext(TooltipTriggerStateContext);
  if (state === null) {
    throw new Error(
      "popnei_web defect: a held tooltip was drawn outside its trigger.",
    );
  }
  const kept = {
    ...state,
    close: (immediate?: boolean): void => {
      if (immediate === true && held.hasFocus()) {
        return;
      }
      state.close(immediate);
    },
  };
  return (
    <TooltipTriggerStateContext.Provider value={kept}>
      <AriaTooltip
        className={classOf(styles, "tooltip")}
        placement="bottom start"
        offset={TOOLTIP_OFFSET_PX}
        triggerRef={held.placedUnder}
      >
        {children}
      </AriaTooltip>
    </TooltipTriggerStateContext.Provider>
  );
}
