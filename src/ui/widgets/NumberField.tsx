/**
 * A number field: React Aria's `NumberField`, with our look and no
 * buttons (react.md, "Widgets: React Aria, wrapped once"). It parses what
 * is typed in the language of the browser, and gives it when it is
 * committed, on Enter, when the field loses the focus, or at each press
 * of an arrow key. A number outside the bounds, or off the step, is not
 * given: the field shows again the value it had, and a line under it says
 * why and what is kept, which the screen is handed to announce
 * (committedNumber.ts; docs/specs/steps/variants.md, "A number the two
 * fields do not take"). The line goes at the next commit, whatever it
 * holds. A field left empty gives nothing and shows again the value it
 * had, with no line. It takes no separator of thousands, so that a number
 * written with the decimal mark of another language, 0,05 in English or
 * 0.05 in Spanish, is no number, and not 5.
 *
 * A number committed has at most the decimals of the step, or, when the
 * field is given `decimals`, at most those, and the step is then only
 * what an arrow key moves by. At each key the field gives `onTyped` the
 * number its text holds, while the field would take it, and `null`
 * otherwise and at each commit, for a screen that follows the number as
 * it is typed (the spec, "The threshold typed and not yet committed").
 *
 * React Aria throws away, with no word, a character typed that cannot
 * start a number of the range, a comma among them, so that 0,1 typed key
 * by key would show as 01 and be committed as 1. The field catches it as
 * it is typed, says so in the same line, and refuses the next commit,
 * unless a deletion mended the text before it (the spec, "A character
 * the field does not take").
 */
import { useContext, useEffect, useId, useRef, useState } from "react";
import {
  NumberField as AriaNumberField,
  Input,
  Label,
  NumberFieldStateContext,
} from "react-aria-components";

import { classOf } from "../classOf.ts";
import {
  checkCommitted,
  takesTextOut,
  typedNumber,
} from "./committedNumber.ts";
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

/** The keys React Aria commits the field at: Enter, and those of its
    spin button, which move the value by the step or to a bound. */
const COMMIT_KEYS: ReadonlySet<string> = new Set([
  "Enter",
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
]);

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
      multiple of it, unless `decimals` is given. */
  readonly step: number;
  /** The most decimals a number committed may have, apart from the step:
      4 for a threshold of the individuals, whose step is 0.01. */
  readonly decimals?: number;
  /** The ids of the elements elsewhere on the page that describe the
      field, separated by spaces, read after the line of a refusal and
      before `description`: the count of a filter and the line under its
      switch. */
  readonly describedBy?: string;
  /** A line under the field, which a screen reader reads with it, after
      the line of a refusal and the elements of `describedBy`. */
  readonly description?: string;
  /** The line under the field for a number it refused, or a character it
      threw away, from the reason and the value it keeps, the one it shows
      again: "10 is more than 1; the threshold stays 0.1." */
  readonly refusedText: (refusal: NumberRefusal, kept: number) => string;
  /** Called with that line when it appears, so that the screen announces
      it: the focus is on the field or past it, where a screen reader
      would not read it. */
  readonly onRefused: (text: string) => void;
  /** Given the function that commits what is typed now, as Enter would,
      with the focus left where it is, and `null` when the field goes: for
      a screen that needs the number before the field is left, a file
      dropped on it while it is typed. */
  readonly onCommitReady?: (commit: (() => void) | null) => void;
  /** Called at each change of the text typed with the number it holds
      when the field would take it, and with `null` while it is no
      number, is out of the bounds or has more decimals than the field
      takes, from a character thrown away until a deletion mends the
      text, and at each commit, when the field shows again the number
      committed or kept. The value of the field changed otherwise, by an
      Undo, gives no call: the field has lost the focus, and been
      committed, before an Undo is pressed. */
  readonly onTyped?: (typed: number | null) => void;
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
  decimals,
  describedBy,
  description,
  refusedText,
  onRefused,
  onCommitReady,
  onTyped,
  onChange,
}: NumberFieldProps): React.JSX.Element {
  const refusedId = useId();
  const descriptionId = useId();
  // The line of the last number refused, which is the screen's: it goes
  // at the next commit, and when the value changes otherwise, by an undo
  // or a new load, since it names the value kept.
  const [refused, setRefused] = useState<string | null>(null);
  const [refusedFor, setRefusedFor] = useState(value);
  if (!Object.is(value, refusedFor)) {
    setRefusedFor(value);
    setRefused(null);
  }
  // Whether a character was thrown away since the last commit, and no
  // deletion mended the text since: what the field shows is then not what
  // was typed, and the next commit is refused.
  const notTaken = useRef(false);
  // Whether the commit under way is the one refused for it.
  const refusing = useRef(false);

  const refuse = (refusal: NumberRefusal): void => {
    const text = refusedText(refusal, value);
    setRefused(text);
    onRefused(text);
  };

  /** Before a commit: the line goes, unless the commit is to be refused
      for a character thrown away, whose line then stays. */
  const commitStarts = (): void => {
    refusing.current = notTaken.current;
    notTaken.current = false;
    if (!refusing.current) setRefused(null);
  };
  const commitEnds = (): void => {
    refusing.current = false;
    onTyped?.(null);
  };

  // The description of the field, the line of a refusal first and the
  // line under the field after it (the spec, "Accessibility"). Given by
  // the page and not by React Aria's slot of a description, which it
  // would put before the line of the refusal.
  const describers = [
    ...(refused !== null ? [refusedId] : []),
    ...(describedBy !== undefined && describedBy !== "" ? [describedBy] : []),
    ...(description !== undefined ? [descriptionId] : []),
  ];

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
      {...(describers.length > 0 && {
        "aria-describedby": describers.join(" "),
      })}
      onChange={(committed) => {
        // What the field showed was not what was typed: nothing is sent,
        // and the line of the character stays. React Aria then shows the
        // value it was given again.
        if (refusing.current) return;
        // An empty field gives NaN, which sends nothing.
        if (!Number.isFinite(committed)) return;
        const checked = checkCommitted(
          committed,
          minValue,
          maxValue,
          step,
          decimals,
        );
        if (checked.ok) {
          setRefused(null);
          onChange(checked.value);
          return;
        }
        // Nothing is sent, so React Aria shows the value it was given.
        refuse(checked.error);
      }}
    >
      <Label className={classOf(styles, "label")}>{label}</Label>
      <FieldInput
        onNotTaken={(text) => {
          refuse({ kind: "notTaken", text });
        }}
        onNotTakenPending={() => {
          notTaken.current = true;
          // What the field shows from now on is not what was typed.
          onTyped?.(null);
        }}
        onMended={() => {
          notTaken.current = false;
        }}
        onCommitStarts={commitStarts}
        onCommitEnds={commitEnds}
        onCommitReady={onCommitReady}
        onText={(text) => {
          // After a character thrown away, and until a deletion mends the
          // text, what it holds is not what was typed: 0,1 shows as 01.
          onTyped?.(
            notTaken.current
              ? null
              : typedNumber(text, minValue, maxValue, step, decimals),
          );
        }}
      />
      {description !== undefined && (
        <p id={descriptionId} className={classOf(styles, "description")}>
          {description}
        </p>
      )}
      {refused !== null && <Problem id={refusedId}>{refused}</Problem>}
    </AriaNumberField>
  );
}

/** What the input of the field is drawn with. */
interface FieldInputProps {
  /** Called with what was typed or pasted and thrown away. */
  readonly onNotTaken: (text: string) => void;
  /** Called when a character typed was thrown away, which refuses the
      next commit; not for a text pasted whole, which React Aria commits
      at once. */
  readonly onNotTakenPending: () => void;
  /** Called when an edit took text out: the user mends what they typed. */
  readonly onMended: () => void;
  /** Called before React Aria commits, and after. */
  readonly onCommitStarts: () => void;
  readonly onCommitEnds: () => void;
  /** As the field's. */
  readonly onCommitReady: NumberFieldProps["onCommitReady"];
  /** Called with the text of the input at each change of it that React
      Aria took. */
  readonly onText: (text: string) => void;
}

/** The input of the field, which reads React Aria's state of it: to
    tell a character it throws away, whose text it never takes, and to
    give the commit to `onCommitReady`. Its handlers run after React
    Aria's, and the capture ones before. */
function FieldInput({
  onNotTaken,
  onNotTakenPending,
  onMended,
  onCommitStarts,
  onCommitEnds,
  onCommitReady,
  onText,
}: FieldInputProps): React.JSX.Element {
  const state = useContext(NumberFieldStateContext);
  const inputRef = useRef<HTMLInputElement>(null);

  // React Aria throws a character away in the browser's `beforeinput`,
  // before the text changes, so no change of the input follows: the same
  // event is listened to here, and the text it would make checked as
  // React Aria checks it. A text being composed, by the input method of
  // a language, is left to React Aria, which checks it at the end.
  useEffect(() => {
    const input = inputRef.current;
    if (input === null || state === null) return;
    const onBeforeInput = (event: InputEvent): void => {
      if (
        !event.inputType.startsWith("insert") ||
        event.inputType === "insertCompositionText"
      ) {
        return;
      }
      const inserted =
        event.data ?? event.dataTransfer?.getData("text/plain") ?? "";
      if (inserted === "") return;
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? start;
      const next = `${input.value.slice(0, start)}${inserted}${input.value.slice(end)}`;
      if (state.validate(next)) {
        // A text selected and typed over mends what was typed, even when
        // it is typed over with the same text, 0 over 0, which the
        // change of the input cannot tell from no change.
        if (start !== end) onMended();
        return;
      }
      onNotTakenPending();
      onNotTaken(inserted);
    };
    input.addEventListener("beforeinput", onBeforeInput);
    return () => {
      input.removeEventListener("beforeinput", onBeforeInput);
    };
  }, [state, onNotTaken, onNotTakenPending, onMended]);

  useEffect(() => {
    if (state === null || onCommitReady === undefined) return;
    onCommitReady(() => {
      onCommitStarts();
      state.commit();
      onCommitEnds();
    });
    return () => {
      onCommitReady(null);
    };
  }, [state, onCommitReady, onCommitStarts, onCommitEnds]);

  const isCommitKey = (event: React.KeyboardEvent): boolean =>
    COMMIT_KEYS.has(event.key) &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey;

  return (
    <Input
      ref={inputRef}
      className={classOf(styles, "input")}
      onChange={(event) => {
        // A change React Aria took, of the text it showed; one that took
        // text out mends what was typed.
        if (state === null) return;
        if (takesTextOut(state.inputValue, event.currentTarget.value)) {
          onMended();
        }
        onText(event.currentTarget.value);
      }}
      onPaste={(event) => {
        // A text pasted over the whole field is committed by React Aria at
        // once, and a text that is no number leaves the field as it was.
        if (state === null || !event.isDefaultPrevented()) return;
        const pasted = event.clipboardData.getData("text/plain").trim();
        if (!state.validate(pasted)) onNotTaken(pasted);
        // Committed, or left as it was: the text is again the number of
        // the field.
        onCommitEnds();
      }}
      onKeyDownCapture={(event) => {
        if (isCommitKey(event)) onCommitStarts();
      }}
      onKeyDown={(event) => {
        if (isCommitKey(event)) onCommitEnds();
      }}
      onBlurCapture={onCommitStarts}
      onBlur={onCommitEnds}
    />
  );
}
