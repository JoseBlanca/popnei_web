/**
 * A switch: React Aria's `SwitchField` and `SwitchButton`, with our look (react.md, "Widgets:
 * React Aria, wrapped once"), for a setting that takes effect at once.
 */
import { SwitchButton, SwitchField } from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./Switch.module.css";

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
}

/** A switch with its words. */
export function Switch({
  label,
  isSelected,
  describedBy,
  onChange,
}: SwitchProps): React.JSX.Element {
  return (
    <SwitchField
      isSelected={isSelected}
      onChange={onChange}
      {...(describedBy !== undefined && { "aria-describedby": describedBy })}
    >
      <SwitchButton className={classOf(styles, "switch")}>
        <span className={classOf(styles, "track")} aria-hidden="true">
          <span className={classOf(styles, "thumb")} />
        </span>
        {label}
      </SwitchButton>
    </SwitchField>
  );
}
