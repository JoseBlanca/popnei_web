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

/** `value` rounded to the nearest multiple of `step` from 0. The decimal
    point is shifted in the text, and not by a product, which keeps 0.145
    as 14.5 where 0.145 × 100 is 14.499999999999998. */
function nearestStep(value: number, step: number): number {
  const decimals = decimalsOf(step);
  const text = String(value);
  const shifted = text.includes("e")
    ? value * 10 ** decimals
    : Number(`${text}e${String(decimals)}`);
  const stepUnits = Math.round(step * 10 ** decimals);
  const units = Math.round(shifted / stepUnits) * stepUnits;
  return Number(`${String(units)}e-${String(decimals)}`);
}

/** How far a number may be from a multiple of the step, as a part of the
    step, and still be on it: the error of a sum in floating point, as an
    arrow key's 0.1 + 0.01, and nothing a user types. */
const ON_STEP_TOLERANCE = 1e-9;

/**
 * The number `value`, committed in a field from `minValue` to `maxValue`
 * of step `step`, when it is within them and a multiple of the step, as a
 * multiple of the step written in the fewest decimals; otherwise the
 * reason it is refused, a bound before the step.
 */
export function checkCommitted(
  value: number,
  minValue: number,
  maxValue: number,
  step: number,
): Result<number, NumberRefusal> {
  if (value > maxValue) {
    return { ok: false, error: { kind: "aboveMax", typed: value, maxValue } };
  }
  if (value < minValue) {
    return { ok: false, error: { kind: "belowMin", typed: value, minValue } };
  }
  const onStep = nearestStep(value, step);
  if (Math.abs(onStep - value) > step * ON_STEP_TOLERANCE) {
    return {
      ok: false,
      error: { kind: "offStep", typed: value, decimals: decimalsOf(step) },
    };
  }
  return { ok: true, value: onStep };
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
