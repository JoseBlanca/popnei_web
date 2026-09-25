/**
 * A number field: React Aria's `NumberField`, with our look and no
 * buttons (react.md, "Widgets: React Aria, wrapped once"). It parses what
 * is typed in the language of the browser, keeps it within its bounds,
 * rounds it to its step, and gives it when it is committed, on Enter, when
 * the field loses the focus, or at each press of an arrow key. A field
 * left empty, or with no number in it, gives nothing and shows again the
 * value it had.
 */
import {
  NumberField as AriaNumberField,
  Input,
  Label,
  Text,
} from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./NumberField.module.css";

/** What a number field is drawn with. */
export interface NumberFieldProps {
  /** The name of the field, shown above it. */
  readonly label: string;
  /** The number the field shows, from the store or the screen. */
  readonly value: number;
  /** The smallest number it takes. */
  readonly minValue: number;
  /** The largest number it takes. */
  readonly maxValue: number;
  /** The step a committed number is rounded to, and an arrow key moves
      by. */
  readonly step: number;
  /** A line under the field, which a screen reader reads with it. */
  readonly description?: string;
  /** Called with the number committed, never with an empty field. */
  readonly onChange: (value: number) => void;
}

/** A number field with its label. */
export function NumberField({
  label,
  value,
  minValue,
  maxValue,
  step,
  description,
  onChange,
}: NumberFieldProps): React.JSX.Element {
  return (
    <AriaNumberField
      className={classOf(styles, "field")}
      value={value}
      minValue={minValue}
      maxValue={maxValue}
      step={step}
      isWheelDisabled
      onChange={(committed) => {
        // An empty field gives NaN, which sends nothing; React Aria then
        // shows the value it was given again.
        if (Number.isFinite(committed)) onChange(committed);
      }}
    >
      <Label className={classOf(styles, "label")}>{label}</Label>
      <Input className={classOf(styles, "input")} />
      {description !== undefined && (
        <Text slot="description" className={classOf(styles, "description")}>
          {description}
        </Text>
      )}
    </AriaNumberField>
  );
}
