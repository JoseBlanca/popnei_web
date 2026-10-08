/**
 * A group of radio buttons, one of which is chosen: React Aria's
 * `RadioGroup` and `Radio`, with our look (react.md, "Widgets: React Aria,
 * wrapped once"), for an option of an analysis that takes effect at the
 * next Run, the method of the principal components and each of their own
 * filters (docs/specs/analyses/pca.md, "What it shows"). The group is one
 * stop of the Tab key, the arrow keys move the choice along it, and a
 * screen reader says "As in the Variants step: 0.1, radio button, 1 of 2".
 *
 * It is controlled: the screen gives the id of the button chosen, from
 * the store, and is told the id the user chooses, one of those it gave.
 */
import {
  Label,
  RadioButton,
  RadioField,
  RadioGroup as AriaRadioGroup,
} from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./RadioGroup.module.css";

/** One radio button of a group. */
export interface RadioItem<T extends string> {
  /** What the screen is told when it is chosen. */
  readonly id: T;
  /** The words beside the button, which are also its name. */
  readonly label: string;
}

/** What a group of radio buttons is drawn with. */
export interface RadioGroupProps<T extends string> {
  /** The name of the group, shown above it. */
  readonly label: string;
  /** Its buttons, in their order. */
  readonly items: readonly RadioItem<T>[];
  /** The id of the button chosen. */
  readonly value: T;
  /** The id of an element elsewhere on the page that describes the
      group, the line under a heading. */
  readonly describedBy?: string;
  /** Called with the id of the button the user chose. */
  readonly onChange: (id: T) => void;
  /** Whether the button chosen takes the focus when the group is drawn,
      as the format of the dialog of the download of popgen2.html does as
      it opens; false when absent. */
  readonly autoFocus?: boolean;
}

/** A group of radio buttons with its name. */
export function RadioGroup<T extends string>({
  label,
  items,
  value,
  describedBy,
  onChange,
  autoFocus = false,
}: RadioGroupProps<T>): React.JSX.Element {
  return (
    <AriaRadioGroup
      className={classOf(styles, "group")}
      value={value}
      onChange={(chosen) => {
        const item = items.find((one) => one.id === chosen);
        if (item !== undefined) onChange(item.id);
      }}
      {...(describedBy !== undefined && { "aria-describedby": describedBy })}
    >
      <Label className={classOf(styles, "label")}>{label}</Label>
      {items.map((item) => (
        <RadioField
          key={item.id}
          value={item.id}
          autoFocus={autoFocus && item.id === value}
        >
          <RadioButton className={classOf(styles, "radio")}>
            <span className={classOf(styles, "circle")} aria-hidden="true">
              <span className={classOf(styles, "dot")} />
            </span>
            {item.label}
          </RadioButton>
        </RadioField>
      ))}
    </AriaRadioGroup>
  );
}
