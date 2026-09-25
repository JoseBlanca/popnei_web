/**
 * The rounding of a number field (react.md, "Widgets"): what the user
 * committed, rounded to the step, a half up, and kept within the bounds.
 * React Aria's own rounding takes the remainder of the division by the
 * step in floating point, and so sends 0.125 to 0.12 and 0.135 to 0.14;
 * this one rounds the decimals as they were typed, so that 0.125 is 0.13
 * as docs/specs/steps/variants.md has it.
 */

/** The decimals of `step`: 2 for 0.01, 0 for 1. */
function decimalsOf(step: number): number {
  const text = String(step);
  const point = text.indexOf(".");
  return point === -1 ? 0 : text.length - point - 1;
}

/** `value` rounded to the nearest multiple of `step` from 0, a half up,
    then kept from `minValue` to `maxValue`. */
export function roundToStep(
  value: number,
  minValue: number,
  maxValue: number,
  step: number,
): number {
  const decimals = decimalsOf(step);
  const text = String(value);
  // Shifting the decimal point in the text, and not multiplying, keeps
  // 0.145 as 14.5, where 0.145 × 100 is 14.499999999999998.
  const shifted = text.includes("e")
    ? value * 10 ** decimals
    : Number(`${text}e${String(decimals)}`);
  const stepUnits = Math.round(step * 10 ** decimals);
  const units = Math.round(shifted / stepUnits) * stepUnits;
  const rounded = Number(`${String(units)}e-${String(decimals)}`);
  return Math.min(Math.max(rounded, minValue), maxValue);
}
