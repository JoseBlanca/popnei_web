/**
 * A tooltip: React Aria's `TooltipTrigger` and `Tooltip`, with our look
 * (react.md, "Widgets: React Aria, wrapped once"). It shows a short text
 * beside a button or a link while the pointer rests on it or the keyboard
 * has put the focus on it, and Escape hides it. React Aria gives the
 * trigger the tooltip as its description only while it is shown, so the
 * text is also on the page, hidden, as the trigger's description at all
 * times, for a screen reader that reads the page without moving the
 * focus: `aria-describedby` reads an element that is hidden, and a hidden
 * element is not read twice in the reading of the page.
 *
 * Used by `Button` and `StepLink`, which give their element the id of the
 * hidden text; a screen does not import it.
 */
import { useId } from "react";
import {
  Tooltip as AriaTooltip,
  TooltipTrigger as AriaTooltipTrigger,
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

/** What a trigger with a tooltip is drawn with. */
export interface WithTooltipProps {
  /** The text of the tooltip, or `null` for none: the trigger is then
      drawn the same, with no tooltip and no description. */
  readonly text: string | null;
  /** Draws the trigger, a button or a link of React Aria, given the id
      of its description, to set as its `aria-describedby`, or
      `undefined` when there is no text. */
  readonly children: (describedBy: string | undefined) => React.ReactElement;
}

/** A button or a link of React Aria, with a tooltip and the same text as
    its description. The tree is the same with a text and without, so
    that a trigger that gains or loses one keeps the focus. */
export function WithTooltip({
  text,
  children,
}: WithTooltipProps): React.JSX.Element {
  const id = useId();
  return (
    <>
      <AriaTooltipTrigger delay={TOOLTIP_DELAY_MS} isDisabled={text === null}>
        {children(text === null ? undefined : id)}
        <AriaTooltip
          className={classOf(styles, "tooltip")}
          placement="bottom"
          offset={TOOLTIP_OFFSET_PX}
        >
          {text}
        </AriaTooltip>
      </AriaTooltipTrigger>
      {text !== null && (
        <span id={id} hidden>
          {text}
        </span>
      )}
    </>
  );
}
