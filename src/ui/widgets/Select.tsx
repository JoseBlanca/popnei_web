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

/** How much of the name of a select the eye sees:
    - `"whole"`, the name, above the select;
    - `"hidden"`, none, for a select whose purpose the page shows
      otherwise, as the header "Type" of a column of a table does for the
      select of each row; a screen reader reads the name;
    - `{ start }`, the words `start` alone, when the name says more than
      the eye needs, what the eye takes from where the select is, the row
      of a table, and a screen reader does not. The name is then `start`
      followed by `label`, so that it holds the words the eye sees, and a
      user who drives the page by voice and says them reaches the select
      (WCAG 2.2, 2.5.3); a click on them focuses the select, as a click on
      a label does. */
export type LabelShown = "whole" | "hidden" | { readonly start: string };

/** What a select is drawn with. */
export interface SelectProps<T extends string> {
  /** The name of the select, as `labelShown` shows it; with `labelShown`
      `{ start }`, the words of the name after `start`, ", in status" after
      "Coded 1, the case". */
  readonly label: string;
  /** How much of the name the eye sees; `"whole"` when absent. */
  readonly labelShown?: LabelShown;
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
  /** The element of the button, for a screen that moves the focus to
      it. */
  readonly buttonRef?: React.Ref<HTMLButtonElement>;
}

/** A select with its label. */
export function Select<T extends string>({
  label,
  labelShown = "whole",
  items,
  value,
  placeholder,
  description,
  problem,
  onChange,
  buttonRef,
}: SelectProps<T>): React.JSX.Element {
  const chosen = (key: Key | null): void => {
    const item = items.find((one) => one.id === key);
    if (item !== undefined) onChange(item.id);
  };
  const start = typeof labelShown === "object" ? labelShown.start : null;
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
      {start !== null && (
        // The words the eye sees, hidden from a screen reader, which reads
        // the name. A click on them focuses the select, as a click on the
        // label of another select does; the keyboard reaches the select
        // by the Tab key.
        <span
          aria-hidden="true"
          className={classOf(styles, "label")}
          onClick={(event) => {
            // The button of the select, beside these words in its field.
            event.currentTarget.parentElement?.querySelector("button")?.focus();
          }}
        >
          {start}
        </span>
      )}
      {/* The name as one text, and not the words shown with the rest
          hidden beside them, since a browser may put a space before a
          part hidden from the eye as it makes the name. */}
      <Label
        className={
          labelShown === "whole"
            ? classOf(styles, "label")
            : classOf(styles, "visuallyHidden")
        }
      >
        {start === null ? label : `${start}${label}`}
      </Label>
      <Button
        className={classOf(styles, "button")}
        {...(buttonRef !== undefined && { ref: buttonRef })}
      >
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
