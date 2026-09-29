/**
 * A group of buttons that stay pressed, one at a time: React Aria's
 * `ToggleButtonGroup` and `ToggleButton` with `selectionMode="single"`,
 * with our look (react.md, "Widgets: React Aria, wrapped once"). React
 * Aria 1.21.1 gives such a group the role of a group of radio buttons and
 * each button that of a radio button, so the group is one stop of the
 * Tab key, the arrow keys of its orientation move along it, Space or
 * Enter presses, and a screen reader says whether each is checked. For
 * the switch between the 3D view and the 2D plot, which keeps one pressed,
 * and for the legend of the principal components, whose pressed entry a
 * second press clears (docs/specs/analyses/pca.md, "What it shows").
 *
 * It is controlled: the screen gives the id of the button pressed, or
 * `null`, and is told the id the user pressed, or `null` when a press
 * cleared it.
 */
import {
  ToggleButton,
  ToggleButtonGroup as AriaToggleButtonGroup,
} from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./ToggleButtonGroup.module.css";

/** One button of a group. */
export interface ToggleItem<T extends string> {
  /** What the screen is told when it is pressed. */
  readonly id: T;
  /** The words of the button, which are also its name. */
  readonly label: string;
  /** A drawing before the words, hidden from a screen reader: the mark
      of a group of the legend. */
  readonly mark?: React.ReactNode;
  /** Whether the words and the mark are faded, as the entries of the
      legend are while another group is highlighted: the mark alone is,
      the words keep the contrast of the text. */
  readonly faded?: boolean;
  /** Whether it cannot be pressed. */
  readonly isDisabled?: boolean;
}

/** What a group of buttons that stay pressed is drawn with. */
export interface ToggleButtonGroupProps<T extends string> {
  /** The name of the group for a screen reader. */
  readonly label: string;
  /** Its buttons, in their order. */
  readonly items: readonly ToggleItem<T>[];
  /** The id of the button pressed, or `null` for none. */
  readonly value: T | null;
  /** A row of buttons, or a column, which the arrow keys follow. */
  readonly orientation: "horizontal" | "vertical";
  /** Whether a press on the pressed button leaves it pressed, as the
      switch between 3D and 2D does; a press clears it when false. */
  readonly keepsOne: boolean;
  /** How the group looks: a row of buttons joined, or the entries of a
      legend. */
  readonly look: "segments" | "legend";
  /** Called with the id of the button pressed, or `null` when a press
      cleared it. */
  readonly onChange: (id: T | null) => void;
  /** Called with the element of the button of `id` when it is drawn,
      for a screen that moves the focus to it. */
  readonly buttonRef?: (id: T, node: HTMLButtonElement | null) => void;
}

/** A group of buttons that stay pressed, one at a time. */
export function ToggleButtonGroup<T extends string>({
  label,
  items,
  value,
  orientation,
  keepsOne,
  look,
  onChange,
  buttonRef,
}: ToggleButtonGroupProps<T>): React.JSX.Element {
  return (
    <AriaToggleButtonGroup
      aria-label={label}
      className={classOf(styles, look)}
      selectionMode="single"
      disallowEmptySelection={keepsOne}
      orientation={orientation}
      selectedKeys={value === null ? [] : [value]}
      onSelectionChange={(keys) => {
        const [pressed] = [...keys];
        const item = items.find((one) => one.id === pressed);
        onChange(item === undefined ? null : item.id);
      }}
    >
      {items.map((item) => (
        <ToggleButton
          key={item.id}
          id={item.id}
          isDisabled={item.isDisabled === true}
          className={classOf(styles, "button")}
          {...(buttonRef !== undefined && {
            ref: (node: HTMLButtonElement | null) => {
              buttonRef(item.id, node);
            },
          })}
        >
          {item.mark !== undefined && (
            <span
              aria-hidden="true"
              className={
                item.faded === true
                  ? `${classOf(styles, "mark")} ${classOf(styles, "faded")}`
                  : classOf(styles, "mark")
              }
            >
              {item.mark}
            </span>
          )}
          <span className={classOf(styles, "text")}>{item.label}</span>
        </ToggleButton>
      ))}
    </AriaToggleButtonGroup>
  );
}
