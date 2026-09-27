/**
 * What a number field takes of a number the user committed
 * (docs/specs/steps/variants.md, "A number the two fields do not take"):
 * the number itself, when it is within the bounds and on the step, or the
 * reason it is refused. Nothing is moved to a bound or rounded, since a
 * number turned into another without a word, 10 into 1 or 0.001 into 0,
 * changes a result the user did not ask to change. Pure, so that a test
 * in node checks it.
 */
import type { Result } from "../../core/result.ts";

/** Why a number was refused, with the number and the bound or the step
    it failed, or the character thrown away as it was typed. */
export type NumberRefusal =
  | {
      readonly kind: "aboveMax";
      readonly typed: number;
      readonly maxValue: number;
    }
  | {
      readonly kind: "belowMin";
      readonly typed: number;
      readonly minValue: number;
    }
  | {
      readonly kind: "offStep";
      readonly typed: number;
      /** The decimals of the step: 0 for a step of 1, 2 for 0.01. */
      readonly decimals: number;
    }
  | {
      /** A character typed that React Aria threw away, since it cannot
          start a number of the field's range, as a comma; the next
          commit is then refused whatever it holds. */
      readonly kind: "notTaken";
      /** What was typed and thrown away, a character or a text
          pasted. */
      readonly text: string;
    };

/** The decimals of `step`: 2 for 0.01, 0 for 1. */
function decimalsOf(step: number): number {
  const text = String(step);
  const point = text.indexOf(".");
  return point === -1 ? 0 : text.length - point - 1;
}

/** `value` rounded to the nearest multiple of `units` × 10^−`decimals`
    from 0, as 0.13 is 13 units of 0.01. The decimal point is shifted in
    the text, and not by a product, which keeps 0.145 as 14.5 where
    0.145 × 100 is 14.499999999999998. */
function nearestMultiple(
  value: number,
  units: number,
  decimals: number,
): number {
  const text = String(value);
  const shifted = text.includes("e")
    ? value * 10 ** decimals
    : Number(`${text}e${String(decimals)}`);
  const rounded = Math.round(shifted / units) * units;
  return Number(`${String(rounded)}e-${String(decimals)}`);
}

/** How far a number may be from a multiple of the step, as a part of the
    step, and still be on it: the error of a sum in floating point, as an
    arrow key's 0.1 + 0.01, and nothing a user types. */
const ON_STEP_TOLERANCE = 1e-9;

/**
 * The number `value`, committed in a field from `minValue` to `maxValue`
 * of step `step`, when it is within them and has at most `decimals`
 * decimals, written in the fewest decimals; otherwise the reason it is
 * refused, a bound before the decimals. With no `decimals` the number
 * must be a multiple of the step, as in stage 2, which for a step of 0.01
 * is the same as two decimals and for a step of 1 a whole number; with
 * them, the step is only what an arrow key moves by, so that a field of
 * four decimals takes 0.0312 with a step of 0.01
 * (docs/specs/steps/variants.md, "The two thresholds").
 */
export function checkCommitted(
  value: number,
  minValue: number,
  maxValue: number,
  step: number,
  decimals?: number,
): Result<number, NumberRefusal> {
  if (value > maxValue) {
    return { ok: false, error: { kind: "aboveMax", typed: value, maxValue } };
  }
  if (value < minValue) {
    return { ok: false, error: { kind: "belowMin", typed: value, minValue } };
  }
  const places = decimals ?? decimalsOf(step);
  const unit = 10 ** -places;
  const units = decimals === undefined ? Math.round(step / unit) : 1;
  const onStep = nearestMultiple(value, units, places);
  if (Math.abs(onStep - value) > units * unit * ON_STEP_TOLERANCE) {
    return {
      ok: false,
      error: { kind: "offStep", typed: value, decimals: places },
    };
  }
  return { ok: true, value: onStep };
}

/** A number as a field is typed with: digits with at most one point, and
    at least one digit after the point when there is one, so that "0." on
    the way to "0.05" is none yet. */
const TYPED_NUMBER = /^(?:\d+(?:\.\d+)?|\.\d+)$/;

/**
 * The number the text `text` of a field holds, as it is typed, when the
 * field would take it on a commit, as `checkCommitted` has it; `null`
 * while the text is no number, "0." or "0,05" among them, is out of the
 * bounds, or has more decimals than the field takes. The text is read as
 * digits and a point and not by the language of the browser, so that the
 * number is the same in a browser set to Spanish
 * (docs/specs/steps/variants.md, "The threshold typed and not yet
 * committed").
 */
export function typedNumber(
  text: string,
  minValue: number,
  maxValue: number,
  step: number,
  decimals?: number,
): number | null {
  const trimmed = text.trim();
  if (!TYPED_NUMBER.test(trimmed)) return null;
  const checked = checkCommitted(
    Number(trimmed),
    minValue,
    maxValue,
    step,
    decimals,
  );
  return checked.ok ? checked.value : null;
}

/** `value` as the field shows it, for the words of a refusal: in
    English, with every decimal and no separator of thousands, 0.0000001
    and not 1e-7. The format is made at the call, and not when the module
    loads, where a failure would stop the whole page from starting. */
export function numberText(value: number): string {
  return new Intl.NumberFormat("en-US", {
    useGrouping: false,
    maximumFractionDigits: 20,
  }).format(value);
}

/** Whether the edit that made `after` of `before` took any text out, a
    deletion or a text selected and typed over, rather than only putting
    text in: whether the start and the end the two share leave any of
    `before` between them. Counted in code units, which is exact for the
    digits, the point and the comma a field is typed with. */
export function takesTextOut(before: string, after: string): boolean {
  const shortest = Math.min(before.length, after.length);
  let start = 0;
  while (start < shortest && before[start] === after[start]) start += 1;
  let end = 0;
  while (
    end < shortest - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  ) {
    end += 1;
  }
  return before.length - start - end > 0;
}
