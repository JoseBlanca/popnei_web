/**
 * A number field: React Aria's `NumberField`, with our look and no
 * buttons (react.md, "Widgets: React Aria, wrapped once"). It parses what
 * is typed in the language of the browser, and gives it when it is
 * committed, on Enter, when the field loses the focus, or at each press
 * of an arrow key, rounded to its step, a half up, and kept within its
 * bounds (roundToStep.ts). A field left empty, or with no number in it,
 * gives nothing and shows again the value it had. It takes no separator
 * of thousands, so that a number written with the decimal mark of
 * another language, 0,05 in English or 0.05 in Spanish, is no number,
 * and not 5.
 */
import {
  NumberField as AriaNumberField,
  Input,
  Label,
  Text,
} from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./NumberField.module.css";
import { roundToStep } from "./roundToStep.ts";

/** No separator of thousands, in every language (above); and every
    decimal typed kept, since React Aria commits the number as it formats
    it, which by default cuts it to three decimals, and 0.1249 would
    become 0.125 before roundToStep, then 0.13. 20 is the most that
    Intl.NumberFormat takes in every browser of the floor. */
const FORMAT_OPTIONS: Intl.NumberFormatOptions = Object.freeze({
  useGrouping: false,
  maximumFractionDigits: 20,
});

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
  /** Called with the number committed, rounded and within the bounds,
      never with an empty field. */
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
      formatOptions={FORMAT_OPTIONS}
      // React Aria neither rounds nor bounds what is typed; roundToStep
      // does, a half up, where React Aria's rounding sends 0.125 to 0.12.
      commitBehavior="validate"
      isWheelDisabled
      onChange={(committed) => {
        // An empty field gives NaN, which sends nothing; React Aria then
        // shows the value it was given again.
        if (!Number.isFinite(committed)) return;
        onChange(roundToStep(committed, minValue, maxValue, step));
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
