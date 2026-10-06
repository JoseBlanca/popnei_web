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
 * holds. A screen can draw that line elsewhere, `refusedIn`, where it
 * moves nothing the user may be clicking as the field loses the focus. A field left empty gives nothing and shows again the value it
 * had, with no line. It takes no separator of thousands, so that a number
 * written with the decimal mark of another language, 0,05 in English or
 * 0.05 in Spanish, is no number, and not 5.
 *
 * In an empty field, one given `NaN` with nothing typed or one whose
 * text the user deleted, the keys that step a number, the arrow keys,
 * Page Up and Page Down, do nothing, where React Aria would move it to a
 * bound of its range; the field of the distance of the LD pruning is
 * empty until a distance is typed. End and Home, in any field, move the
 * caret only, as in a field of text, where React Aria would move the
 * number to the largest or the least of its range, 9007199254740991 base
 * pairs for End in the distance (stop A 4 (b), decided by the owner on
 * 29 September 2026).
 *
 * A number committed has at most the decimals of the step, or, when the
 * field is given `decimals`, at most those, and the step is then only
 * what an arrow key moves by. At each key the field gives `onTyped` the
 * number its text holds, while the field would take it, and `null`
 * otherwise and at each commit, for a screen that follows the number as
 * it is typed (the spec, "The threshold typed and not yet committed").
 *
 * Escape with something typed puts back the number the field holds, as
 * Ctrl+Z does. The Tab key commits what is typed before the focus moves, so that the
 * next stop of the Tab key is the button the number makes enabled, the
 * Run of an analysis locked for the distance of its LD filter.
 *
 * React Aria throws away, with no word, a character typed that cannot
 * start a number of the range, a comma among them, so that 0,1 typed key
 * by key would show as 01 and be committed as 1. The field catches it as
 * it is typed, says so in the same line, and refuses the next commit,
 * unless a deletion mended the text before it (the spec, "A character
 * the field does not take").
 */
import {
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal, flushSync } from "react-dom";
import {
  NumberField as AriaNumberField,
  Input,
  Label,
  NumberFieldStateContext,
} from "react-aria-components";

import { classOf } from "../classOf.ts";
import { shortcutOf } from "../shell/shortcuts.ts";
import {
  NUMBER_FIELD_ATTRIBUTE,
  checkCommitted,
  numberText,
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
    spin button that the field leaves to it, which move the value by the
    step. */
const COMMIT_KEYS: ReadonlySet<string> = new Set([
  "Enter",
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
]);

/** The keys of React Aria's spin button that move the value to a bound
    of its range, which the field keeps from it and makes move the caret
    to the start or the end of the text. */
const CARET_KEYS: ReadonlySet<string> = new Set(["Home", "End"]);

/** Moves the caret of `input` to the start of its text, for Home, or to
    its end, for End; with Shift, selects from the anchor of the
    selection, the end that stays, to there, as a field of text does on
    Windows. A field of text on a Mac
    moves no caret at Home and End, so the field moves it itself, in
    every browser alike. */
function moveCaret(input: HTMLInputElement, key: string, shift: boolean): void {
  const length = input.value.length;
  const start = input.selectionStart ?? 0;
  const end = input.selectionEnd ?? start;
  // The end of the selection that stays where it is, as in a text field:
  // its start, unless it was made backward.
  const anchor = input.selectionDirection === "backward" ? end : start;
  if (key === "Home") {
    if (shift) input.setSelectionRange(0, anchor, "backward");
    else input.setSelectionRange(0, 0);
    return;
  }
  if (shift) input.setSelectionRange(anchor, length, "forward");
  else input.setSelectionRange(length, length);
}

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
  /** The label beside the input, on its row, rather than above it. */
  readonly inline?: boolean;
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
  /** The element the line of a refusal is drawn into, instead of under
      the field: for a screen with something under the field that a
      click takes the focus to, and which the line, appearing at that
      blur, would move from under the pointer, so that the click is lost.
      `null` until the screen has drawn the element; the line waits for
      it. */
  readonly refusedIn?: Element | null;
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
      Undo, gives no call: before an Undo the field was committed, whether
      it lost the focus or holds its number with nothing typed, the one
      case the keys of Undo reach the project from it, so no number typed
      is left. */
  readonly onTyped?: (typed: number | null) => void;
  /** Called with the number committed, within the bounds and on the
      step, never with an empty field nor with a number refused. */
  readonly onChange: (value: number) => void;
  /** Called with the number committed when it is the number the field
      already holds, typed again, which React Aria gives to no
      `onChange`: for a field whose number, the same, means something else
      once typed, the draw of the diversity, which is then kept as typed
      rather than following its default (docs/specs/analyses/diversity.md,
      "What it shows"). Called for a number pasted over the whole field,
      as for one typed; not for an arrow key or Page Up and Down, whose
      number is not typed, nor for a number the field refused. */
  readonly onSameCommitted?: (value: number) => void;
}

/** A number field with its label, and the line of a number it refused. */
export function NumberField({
  label,
  value,
  minValue,
  maxValue,
  step,
  inline = false,
  decimals,
  describedBy,
  description,
  refusedText,
  refusedIn,
  onRefused,
  onCommitReady,
  onTyped,
  onChange,
  onSameCommitted,
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
  // Whether the Tab key committed what was typed, and the focus is
  // leaving the field: its commit at the blur, of the same number or of
  // the number kept, is not a commit of the user, and leaves the line of
  // a refusal as it is.
  const tabbed = useRef(false);
  // The text of the input as the user last typed or pasted it, which a
  // refusal names the number by (committedNumber.ts, typedText).
  const lastText = useRef("");
  // Whether anything was typed, or thrown away, since the last commit:
  // Undo and Redo of the keyboard are then the field's, and otherwise the
  // project's (docs/specs/shell.md, "The header").
  const typed = useRef(false);
  // Whether the commit under way gave its number to `onChange`, or
  // refused it: React Aria gives neither for the number the field holds.
  const answered = useRef(false);
  // Whether the commit under way is of a key that steps the number, an
  // arrow key or Page Up and Down, whose number is not one typed.
  const stepping = useRef(false);
  // Whether a text was pasted over the whole field since the last commit,
  // which React Aria commits as if it were typed.
  const pasted = useRef(false);
  // The latest onTyped, for the effect below, which runs when the value
  // changes and not when the screen gives another function.
  const typedTo = useRef(onTyped);
  useLayoutEffect(() => {
    typedTo.current = onTyped;
  });
  // The number changed otherwise than by a commit, by an Undo or a new
  // load: nothing typed is left, nor a character thrown away (the spec,
  // "The threshold typed and not yet committed").
  useEffect(() => {
    notTaken.current = false;
    typed.current = false;
    typedTo.current?.(null);
  }, [value]);
  // The field gone, by its switch turned off, an Undo or a Clear: a
  // number typed in it is typed no longer, and the screen, which may
  // draw it elsewhere, a threshold on a plot, is told so.
  useEffect(
    () => () => {
      typedTo.current?.(null);
    },
    [],
  );
  // Whether a number committed may have decimals, as checkCommitted has
  // it: with `decimals`, any but 0; otherwise, a step that is not whole.
  const takesDecimals =
    decimals === undefined ? !Number.isInteger(step) : decimals > 0;

  const refuse = (refusal: NumberRefusal): void => {
    const text = refusedText(refusal, value);
    setRefused(text);
    onRefused(text);
  };

  /** Before a commit: the line goes, unless the commit is to be refused
      for a character thrown away, whose line then stays. */
  const commitStarts = (): void => {
    if (tabbed.current) return;
    answered.current = false;
    refusing.current = notTaken.current;
    notTaken.current = false;
    if (!refusing.current) setRefused(null);
  };
  const commitEnds = (): void => {
    // The number the field holds, typed again and committed.
    if (
      onSameCommitted !== undefined &&
      (typed.current || pasted.current) &&
      !stepping.current &&
      !refusing.current &&
      !answered.current &&
      typedNumber(lastText.current, minValue, maxValue, step, decimals) ===
        value
    ) {
      onSameCommitted(value);
    }
    refusing.current = false;
    stepping.current = false;
    pasted.current = false;
    typed.current = false;
    onTyped?.(null);
  };
  /** Ctrl+Z with something typed: the number of the field back, as
      Escape would, with no number typed and no line of a character
      thrown away. */
  const revert = (): void => {
    notTaken.current = false;
    typed.current = false;
    setRefused(null);
    onTyped?.(null);
  };

  // The description of the field, the line of a refusal first and the
  // line under the field after it (the spec, "Accessibility"). Given by
  // the page and not by React Aria's slot of a description, which it
  // would put before the line of the refusal.
  const refusedLine =
    refused === null || refusedIn === null ? null : (
      <Problem id={refusedId}>{refused}</Problem>
    );
  const describers = [
    ...(refusedLine !== null ? [refusedId] : []),
    ...(describedBy !== undefined && describedBy !== "" ? [describedBy] : []),
    ...(description !== undefined ? [descriptionId] : []),
  ];

  return (
    <AriaNumberField
      className={
        inline
          ? `${classOf(styles, "field")} ${classOf(styles, "inline")}`
          : classOf(styles, "field")
      }
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
        // value it was given again. After the Tab key, the blur commits
        // again what that key committed.
        if (refusing.current || tabbed.current) return;
        // An empty field gives NaN, which sends nothing.
        if (!Number.isFinite(committed)) return;
        answered.current = true;
        const checked = checkCommitted(
          committed,
          minValue,
          maxValue,
          step,
          decimals,
          lastText.current,
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
          typed.current = true;
          // What the field shows from now on is not what was typed.
          onTyped?.(null);
        }}
        onMended={() => {
          notTaken.current = false;
        }}
        onCommitStarts={commitStarts}
        onCommitEnds={commitEnds}
        onTabbed={(leaving) => {
          tabbed.current = leaving;
        }}
        onCommitReady={onCommitReady}
        inputMode={takesDecimals ? "text" : "numeric"}
        // An empty field, given NaN, holds no text: "NaN" is no number
        // of the field to put back.
        committedText={Number.isNaN(value) ? "" : numberText(value)}
        isTyped={() => typed.current}
        onRevert={revert}
        onPasted={(text) => {
          lastText.current = text;
          pasted.current = true;
        }}
        onStepKey={() => {
          stepping.current = true;
        }}
        onText={(text) => {
          lastText.current = text;
          typed.current = true;
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
      {refusedIn === undefined || refusedIn === null
        ? refusedLine
        : refusedLine !== null && createPortal(refusedLine, refusedIn)}
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
  /** Called before the commit of a key that steps the number, an arrow
      key or Page Up and Down. */
  readonly onStepKey: () => void;
  readonly onCommitEnds: () => void;
  /** Called with true once the Tab key has committed, and with false once
      the blur that follows it has. */
  readonly onTabbed: (leaving: boolean) => void;
  /** As the field's. */
  readonly onCommitReady: NumberFieldProps["onCommitReady"];
  /** Called with the text of the input at each change of it that React
      Aria took. */
  readonly onText: (text: string) => void;
  /** The keyboard a phone shows for the input: the keypad of digits for
      a field of whole numbers, the whole keyboard, which has the point,
      for a field of decimals. React Aria asks an iPhone for the keypad
      of decimals, which in a region that writes 0,1 has a comma and no
      point (docs/specs/steps/variants.md, "A character the fields do
      not take"). */
  readonly inputMode: "numeric" | "text";
  /** The number the field holds as it shows it, which Ctrl+Z puts back
      while something is typed. */
  readonly committedText: string;
  /** Whether anything was typed since the last commit. */
  readonly isTyped: () => boolean;
  /** Called when Ctrl+Z puts the number of the field back. */
  readonly onRevert: () => void;
  /** Called with a text pasted over the whole field, before React Aria
      commits it. */
  readonly onPasted: (text: string) => void;
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
  onStepKey,
  onCommitEnds,
  onTabbed,
  onCommitReady,
  onText,
  inputMode,
  committedText,
  isTyped,
  onRevert,
  onPasted,
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
        if (start !== end) {
          onMended();
          // No change of the input follows a text typed over with the
          // same text, so the number typed is given here.
          onText(next);
        }
        return;
      }
      onNotTakenPending();
      onNotTaken(inserted);
    };
    input.addEventListener("beforeinput", onBeforeInput);
    return () => {
      input.removeEventListener("beforeinput", onBeforeInput);
    };
  }, [state, onNotTaken, onNotTakenPending, onMended, onText]);

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

  // React Aria takes a key only with no modifier held, Shift among them:
  // Shift and an arrow, which selects the text in a browser, or Shift and
  // Enter commit nothing, and what was typed, with a character thrown
  // away, waits for the commit that follows.
  const isCommitKey = (event: React.KeyboardEvent): boolean =>
    COMMIT_KEYS.has(event.key) &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey;
  const isStepKey = (event: React.KeyboardEvent): boolean =>
    isCommitKey(event) && event.key !== "Enter";

  return (
    <Input
      ref={inputRef}
      className={classOf(styles, "input")}
      inputMode={inputMode}
      {...{ [NUMBER_FIELD_ATTRIBUTE]: "" }}
      onChange={(event) => {
        // A change React Aria took, of the text it showed; one that took
        // text out mends what was typed.
        if (state === null) return;
        if (takesTextOut(state.inputValue, event.currentTarget.value)) {
          onMended();
        }
        onText(event.currentTarget.value);
      }}
      onPasteCapture={(event) => {
        // Before React Aria's handler, and only for a text pasted over the
        // whole field, which React Aria commits at once; a paste at the
        // caret is the browser's, and a character it would put in that the
        // field does not take is caught as one typed. The text pasted is
        // what a refusal names the number by. React Aria parses "-5" as a
        // number, which the field would refuse with a line of its own
        // beside the line of the character: the commit of a text the field
        // does not take is refused, so that one line is shown and
        // announced, the character's. The paste handler below ends it.
        if (state === null) return;
        const input = event.currentTarget;
        const selected =
          (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
        if (selected !== input.value.length) return;
        const pasted = event.clipboardData.getData("text/plain").trim();
        onPasted(pasted);
        if (state.validate(pasted)) {
          // A number the field takes, pasted over all it held, mends what
          // was typed before, a character thrown away among it, even when
          // it is the number the field already holds, which gives no
          // change of the input to tell.
          onMended();
          onCommitStarts();
          return;
        }
        onNotTakenPending();
        onCommitStarts();
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
        // End and Home move the caret: React Aria would move the number
        // to a bound of its range, a number the user never typed. Stopped
        // before React Aria's handler, and the caret moved here, since a
        // browser on a Mac moves none at these keys (the spec, "A number
        // the fields do not take"). With Ctrl, Alt or ⌘ they are left to
        // the browser.
        if (CARET_KEYS.has(event.key)) {
          event.stopPropagation();
          if (!event.altKey && !event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            moveCaret(event.currentTarget, event.key, event.shiftKey);
          }
          return;
        }
        // In an empty field React Aria moves the number to a bound of its
        // range, the Up arrow to the least, the Down arrow to the
        // largest, a number the user never typed: the keys that step a
        // number do nothing there. Enter commits the empty field, which
        // sends nothing.
        if (isStepKey(event) && state?.inputValue.trim() === "") {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (isStepKey(event)) onStepKey();
        if (isCommitKey(event)) onCommitStarts();
      }}
      onKeyDown={(event) => {
        if (isCommitKey(event)) onCommitEnds();
        // The Tab key commits what is typed before the browser moves the
        // focus, as Enter would, so that the next stop is the one the
        // number makes: a Run the distance of an LD filter unlocks, which
        // would otherwise be enabled only once the focus had passed it
        // (docs/specs/analyses/pca.md, "Accessibility"). React draws the
        // change of the project within this handler, by `flushSync`,
        // before the browser moves the focus: left to React's own time,
        // after the handler, it came too late in Firefox 155, which had
        // chosen the next stop while Run was still disabled and passed
        // it, on GitHub's runners on 29 September 2026. The commit at the
        // blur that follows commits the same number, no change.
        if (
          event.key === "Tab" &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          state !== null &&
          isTyped()
        ) {
          flushSync(() => {
            onCommitStarts();
            state.commit();
            onCommitEnds();
          });
          onTabbed(true);
        }
        // Undo and Redo are never the browser's here (docs/specs/shell.md,
        // "The header"): with something typed, Ctrl+Z puts the number back
        // and redo does nothing; with nothing typed, the shell takes them
        // for the project.
        // Escape with something typed puts back the number the field
        // holds, as Ctrl+Z does, so that the next Tab commits nothing
        // (docs/specs/shell.md, "The header"); with nothing typed it is
        // left to what else listens for it, a dialog among them.
        if (
          event.key === "Escape" &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          state !== null &&
          isTyped()
        ) {
          event.preventDefault();
          event.stopPropagation();
          state.setInputValue(committedText);
          onRevert();
          return;
        }
        const shortcut = shortcutOf(event);
        if (shortcut === null || state === null || !isTyped()) return;
        event.preventDefault();
        if (shortcut === "undo") {
          state.setInputValue(committedText);
          onRevert();
        }
      }}
      onBlurCapture={onCommitStarts}
      onBlur={() => {
        onCommitEnds();
        onTabbed(false);
      }}
    />
  );
}
