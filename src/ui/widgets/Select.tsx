/**
 * A select, the list that opens to show its choices: React Aria's
 * `Select` with its `Label`, `Button`, `SelectValue`, `Popover` and
 * `ListBox`, with our look (react.md, "Widgets: React Aria, wrapped
 * once"). React Aria gives it the keyboard of a list, the arrows, Home,
 * End and typing the start of an item, and reads the label, the value,
 * the description and the problem together.
 *
 * It is controlled: the screen gives the id of the item chosen, from the
 * store, and is told the id the user chooses, one of those it gave.
 */
import {
  Select as AriaSelect,
  Button,
  FieldError,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  SelectValue,
  Text,
} from "react-aria-components";
import type { Key } from "react-aria-components";

import { classOf } from "../classOf.ts";
import { ProblemIcon } from "./Problem.tsx";
import styles from "./Select.module.css";

/** One choice of a select. */
export interface SelectItem<T extends string> {
  /** What the screen is told when it is chosen. */
  readonly id: T;
  /** The words of the item, on the list and on the button once chosen. */
  readonly label: string;
}

/** What a select is drawn with. */
export interface SelectProps<T extends string> {
  /** The name of the select, shown above it. */
  readonly label: string;
  /** The choices, in their order. */
  readonly items: readonly SelectItem<T>[];
  /** The id of the item chosen, or `null` for none, when the button
      shows the placeholder. */
  readonly value: T | null;
  /** The words on the button while no item is chosen. */
  readonly placeholder?: string;
  /** A line under the select, which a screen reader reads with it. */
  readonly description?: string;
  /** What is wrong with the choice, under the select with the mark of a
      problem, and read with it. */
  readonly problem?: string;
  /** Called with the id of the item the user chose. */
  readonly onChange: (id: T) => void;
}

/** A select with its label. */
export function Select<T extends string>({
  label,
  items,
  value,
  placeholder,
  description,
  problem,
  onChange,
}: SelectProps<T>): React.JSX.Element {
  const chosen = (key: Key | null): void => {
    const item = items.find((one) => one.id === key);
    if (item !== undefined) onChange(item.id);
  };
  return (
    <AriaSelect
      className={classOf(styles, "field")}
      value={value}
      onChange={chosen}
      isInvalid={problem !== undefined}
      // The problem is said, and the value is not refused by the browser's
      // own validation of a form.
      validationBehavior="aria"
      {...(placeholder !== undefined && { placeholder })}
    >
      <Label className={classOf(styles, "label")}>{label}</Label>
      <Button className={classOf(styles, "button")}>
        <SelectValue className={classOf(styles, "value")} />
        <svg
          className={classOf(styles, "chevron")}
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <polyline points="4 6 8 10 12 6" />
        </svg>
      </Button>
      {description !== undefined && (
        <Text slot="description" className={classOf(styles, "description")}>
          {description}
        </Text>
      )}
      <FieldError className={classOf(styles, "problem")}>
        <ProblemIcon />
        <span>{problem}</span>
      </FieldError>
      <Popover className={classOf(styles, "popover")}>
        <ListBox className={classOf(styles, "list")}>
          {items.map((item) => (
            <ListBoxItem
              key={item.id}
              id={item.id}
              textValue={item.label}
              className={classOf(styles, "item")}
            >
              <svg
                className={classOf(styles, "mark")}
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
              </svg>
              {item.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}
