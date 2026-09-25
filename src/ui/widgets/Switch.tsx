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
  /** Called with the new state when the user turns it on or off. */
  readonly onChange: (isSelected: boolean) => void;
}

/** A switch with its words. */
export function Switch({
  label,
  isSelected,
  onChange,
}: SwitchProps): React.JSX.Element {
  return (
    <SwitchField isSelected={isSelected} onChange={onChange}>
      <SwitchButton className={classOf(styles, "switch")}>
        <span className={classOf(styles, "track")} aria-hidden="true">
          <span className={classOf(styles, "thumb")} />
        </span>
        {label}
      </SwitchButton>
    </SwitchField>
  );
}
