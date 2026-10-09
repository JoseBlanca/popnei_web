/**
 * A switch: React Aria's `SwitchField` and `SwitchButton`, with our look (react.md, "Widgets:
 * React Aria, wrapped once"), for a setting that takes effect at once.
 * It may wait, with its reason, as the LD pruning of the PCA on
 * popgen2.html does while a PCA runs (waiting.ts): read only for React
 * Aria, so that it keeps the Tab key and a press turns nothing, drawn
 * greyed, marked `aria-disabled`, with the reason as its tooltip and its
 * description.
 */
import { SwitchButton, SwitchField } from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./Switch.module.css";
import { WithTooltip } from "./Tooltip.tsx";
import { ariaDisabledRef, describedByOf } from "./waiting.ts";

/** What a switch is drawn with. */
export interface SwitchProps {
  /** The words beside the switch, which are also its name. */
  readonly label: string;
  /** Whether it is on. */
  readonly isSelected: boolean;
  /** The id of an element elsewhere on the page that describes the
      switch, the line under the switch of a filter. */
  readonly describedBy?: string;
  /** Called with the new state when the user turns it on or off. */
  readonly onChange: (isSelected: boolean) => void;
  /** The reason the switch waits, its tooltip and its description, while
      a press changes nothing; or `null`, when it does not wait. `null`
      when absent. */
  readonly waiting?: string | null;
}

/** A switch with its words. */
export function Switch({
  label,
  isSelected,
  describedBy,
  onChange,
  waiting = null,
}: SwitchProps): React.JSX.Element {
  const waits = waiting !== null;
  return (
    <WithTooltip text={waiting}>
      {(hintId) => {
        const description = describedByOf(describedBy, hintId);
        return (
          <SwitchField
            isSelected={isSelected}
            isReadOnly={waits}
            onChange={(on) => {
              if (!waits) onChange(on);
            }}
            inputRef={ariaDisabledRef(waits)}
            {...(description !== undefined && {
              "aria-describedby": description,
            })}
          >
            <SwitchButton
              className={
                waits
                  ? `${classOf(styles, "switch")} ${classOf(styles, "waiting")}`
                  : classOf(styles, "switch")
              }
            >
              <span className={classOf(styles, "track")} aria-hidden="true">
                <span className={classOf(styles, "thumb")} />
              </span>
              {label}
            </SwitchButton>
          </SwitchField>
        );
      }}
    </WithTooltip>
  );
}
