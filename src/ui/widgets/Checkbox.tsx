/**
 * A check box: React Aria's `CheckboxField` and `CheckboxButton`, with our look (react.md,
 * "Widgets: React Aria, wrapped once"), for a yes or no that takes effect
 * later than the click, where a switch would promise an effect at once:
 * the next pick of a file on the old page, popgen.html; the carrying out
 * of the filters on popgen2.html. A sentence under it, its description,
 * may say why the click changes nothing yet.
 */
import { CheckboxButton, CheckboxField, Text } from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./Checkbox.module.css";

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
}

/** A check box with its words. */
export function Checkbox({
  label,
  description,
  isSelected,
  onChange,
}: CheckboxProps): React.JSX.Element {
  return (
    <CheckboxField
      isSelected={isSelected}
      onChange={onChange}
      className={classOf(styles, "field")}
    >
      <CheckboxButton className={classOf(styles, "checkbox")}>
        <span className={classOf(styles, "box")} aria-hidden="true">
          <svg viewBox="0 0 16 16" className={classOf(styles, "mark")}>
            <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
          </svg>
        </span>
        {label}
      </CheckboxButton>
      {description !== undefined && (
        <Text slot="description" className={classOf(styles, "description")}>
          {description}
        </Text>
      )}
    </CheckboxField>
  );
}
