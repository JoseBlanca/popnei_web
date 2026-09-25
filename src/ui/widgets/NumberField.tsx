/**
 * A number field: React Aria's `NumberField`, with our look and no
 * buttons (react.md, "Widgets: React Aria, wrapped once"). It parses what
 * is typed in the language of the browser, and gives it when it is
 * committed, on Enter, when the field loses the focus, or at each press
 * of an arrow key. A number outside the bounds, or off the step, is not
 * given: the field shows again the value it had, and a line under it says
 * why and what is kept, which the screen is handed to announce
 * (committedNumber.ts; docs/specs/steps/variants.md, "A number the two
 * fields do not take"). A field left empty, or with no number in it,
 * gives nothing and shows again the value it had, with no line. It takes
 * no separator of thousands, so that a number written with the decimal
 * mark of another language, 0,05 in English or 0.05 in Spanish, is no
 * number, and not 5.
 */
import { useContext, useEffect, useId, useState } from "react";
import {
  NumberField as AriaNumberField,
  Input,
  Label,
  NumberFieldStateContext,
  Text,
} from "react-aria-components";

import { classOf } from "../classOf.ts";
import { checkCommitted } from "./committedNumber.ts";
import type { NumberRefusal } from "./committedNumber.ts";
import styles from "./NumberField.module.css";
import { Problem } from "./Problem.tsx";

/** No separator of thousands, in every language (above); and every
    decimal typed kept, since React Aria commits the number as it formats
    it, which by default cuts it to three decimals, and 0.1249 would
    become 0.125 before it is checked. 20 is the most that
    Intl.NumberFormat takes in every browser of the floor. */
const FORMAT_OPTIONS: Intl.NumberFormatOptions = Object.freeze({
  useGrouping: false,
  maximumFractionDigits: 20,
});

/** What a number field is drawn with. */
export interface NumberFieldProps {
  /** The name of the field, shown above it, with its range. */
  readonly label: string;
  /** The number the field shows, from the store or the screen. */
  readonly value: number;
  /** The smallest number it takes. */
  readonly minValue: number;
  /** The largest number it takes. */
  readonly maxValue: number;
  /** The step an arrow key moves by; a number committed must be a
      multiple of it. */
  readonly step: number;
  /** A line under the field, which a screen reader reads with it. */
  readonly description?: string;
  /** The line under the field for a number it refused, from the reason
      and the value it keeps, the one it shows again: "10 is more than 1;
      the filter keeps 0.1." */
  readonly refusedText: (refusal: NumberRefusal, kept: number) => string;
  /** Called with that line when a number is refused, so that the screen
      announces it: the focus is on the field or past it, where a screen
      reader would not read it. */
  readonly onRefused: (text: string) => void;
  /** Given the function that commits what is typed now, as Enter would,
      with the focus left where it is, and `null` when the field goes: for
      a screen that needs the number before the field is left, a file
      dropped on it while it is typed. */
  readonly onCommitReady?: (commit: (() => void) | null) => void;
  /** Called with the number committed, within the bounds and on the
      step, never with an empty field nor with a number refused. */
  readonly onChange: (value: number) => void;
}

/** A number field with its label, and the line of a number it refused. */
export function NumberField({
  label,
  value,
  minValue,
  maxValue,
  step,
  description,
  refusedText,
  onRefused,
  onCommitReady,
  onChange,
}: NumberFieldProps): React.JSX.Element {
  const refusedId = useId();
  // The line of the last number refused, which is the screen's: it goes
  // at the next number committed, and when the value changes otherwise,
  // by an undo or a new load, since it names the value kept.
  const [refused, setRefused] = useState<string | null>(null);
  const [refusedFor, setRefusedFor] = useState(value);
  if (!Object.is(value, refusedFor)) {
    setRefusedFor(value);
    setRefused(null);
  }
  return (
    <AriaNumberField
      className={classOf(styles, "field")}
      value={value}
      minValue={minValue}
      maxValue={maxValue}
      step={step}
      formatOptions={FORMAT_OPTIONS}
      // React Aria neither rounds nor bounds what is typed, and gives it
      // as it is; checkCommitted takes it or refuses it.
      commitBehavior="validate"
      isWheelDisabled
      {...(refused !== null && { "aria-describedby": refusedId })}
      onChange={(committed) => {
        // An empty field gives NaN, which sends nothing; React Aria then
        // shows the value it was given again.
        if (!Number.isFinite(committed)) return;
        const checked = checkCommitted(committed, minValue, maxValue, step);
        if (checked.ok) {
          setRefused(null);
          onChange(checked.value);
          return;
        }
        // Nothing is sent, so React Aria shows the value it was given.
        const text = refusedText(checked.error, value);
        setRefused(text);
        onRefused(text);
      }}
    >
      <Label className={classOf(styles, "label")}>{label}</Label>
      <Input className={classOf(styles, "input")} />
      {onCommitReady !== undefined && (
        <CommitHandle onCommitReady={onCommitReady} />
      )}
      {description !== undefined && (
        <Text slot="description" className={classOf(styles, "description")}>
          {description}
        </Text>
      )}
      {refused !== null && <Problem id={refusedId}>{refused}</Problem>}
    </AriaNumberField>
  );
}

/** Gives `onCommitReady` the commit of the field it is drawn in, from
    React Aria's state of the field, and `null` when it goes. */
function CommitHandle({
  onCommitReady,
}: {
  readonly onCommitReady: (commit: (() => void) | null) => void;
}): null {
  const state = useContext(NumberFieldStateContext);
  useEffect(() => {
    if (state === null) return;
    onCommitReady(() => {
      state.commit();
    });
    return () => {
      onCommitReady(null);
    };
  }, [state, onCommitReady]);
  return null;
}
