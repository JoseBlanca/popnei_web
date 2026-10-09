/**
 * A check box: React Aria's `CheckboxField` and `CheckboxButton`, with our look (react.md,
 * "Widgets: React Aria, wrapped once"), for a yes or no that takes effect
 * later than the click, where a switch would promise an effect at once:
 * the next pick of a file on the old page, popgen.html; the carrying out
 * of the filters on popgen2.html. A sentence under it, its description,
 * may say why the click changes nothing yet. It may wait, with its
 * reason, as the FILTER box of popgen2.html does while a PCA runs
 * (waiting.ts): read only for React Aria, so that it keeps the Tab key
 * and a click ticks nothing, drawn greyed, marked `aria-disabled`, with
 * the reason as its tooltip and its description; the tooltip shows on the
 * mouse over its box or its words, on a press and on the focus
 * (WaitingTooltip.tsx).
 */
import { useId, useRef } from "react";
import { CheckboxButton, CheckboxField } from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./Checkbox.module.css";
import { WaitingTooltip } from "./WaitingTooltip.tsx";
import { ariaDisabledRef, describedByOf } from "./waiting.ts";

/** What a check box is drawn with. */
export interface CheckboxProps {
  /** The words beside the box, which are also its name. */
  readonly label: string;
  /** A sentence drawn under the box and tied to it by
      `aria-describedby`, so that a screen reader reads it after the
      box's name; none when absent. */
  readonly description?: string;
  /** Whether it is checked. */
  readonly isSelected: boolean;
  /** Called with the new state when the user checks or unchecks it. */
  readonly onChange: (isSelected: boolean) => void;
  /** The reason the box waits, its tooltip and its description, while a
      click changes nothing; or `null`, when it does not wait. `null` when
      absent. */
  readonly waiting?: string | null;
}

/** A check box with its words. */
export function Checkbox({
  label,
  description,
  isSelected,
  onChange,
  waiting = null,
}: CheckboxProps): React.JSX.Element {
  const waits = waiting !== null;
  const descriptionId = useId();
  const buttonRef = useRef<HTMLLabelElement>(null);
  return (
    <WaitingTooltip text={waiting} anchor={buttonRef}>
      {(hintId) => {
        // The sentence first, then the reason the box waits. Given by
        // hand: React Aria's slot of a description loses its tie to the
        // input inside the trigger of a tooltip (seen with React Aria
        // Components 1.21.1 in jsdom, 9 October 2026).
        const describedBy = describedByOf(
          description === undefined ? undefined : descriptionId,
          hintId,
        );
        return (
          <CheckboxField
            isSelected={isSelected}
            isReadOnly={waits}
            onChange={(selected) => {
              if (!waits) onChange(selected);
            }}
            inputRef={ariaDisabledRef(waits)}
            {...(describedBy !== undefined && {
              "aria-describedby": describedBy,
            })}
            className={classOf(styles, "field")}
          >
            <CheckboxButton
              ref={buttonRef}
              className={
                waits
                  ? `${classOf(styles, "checkbox")} ${classOf(styles, "waiting")}`
                  : classOf(styles, "checkbox")
              }
            >
              <span className={classOf(styles, "box")} aria-hidden="true">
                <svg viewBox="0 0 16 16" className={classOf(styles, "mark")}>
                  <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
                </svg>
              </span>
              {label}
            </CheckboxButton>
            {description !== undefined && (
              <span
                id={descriptionId}
                className={classOf(styles, "description")}
              >
                {description}
              </span>
            )}
          </CheckboxField>
        );
      }}
    </WaitingTooltip>
  );
}
