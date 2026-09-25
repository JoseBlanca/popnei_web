import { describe, expect, test } from "vitest";

import { checkCommitted, numberText } from "./committedNumber.ts";

describe("checkCommitted", () => {
  test("a number within the bounds and on the step is taken as it is", () => {
    expect(checkCommitted(0.13, 0, 1, 0.01)).toEqual({ ok: true, value: 0.13 });
    expect(checkCommitted(0, 0, 1, 0.01)).toEqual({ ok: true, value: 0 });
    expect(checkCommitted(1, 0, 1, 0.01)).toEqual({ ok: true, value: 1 });
    expect(checkCommitted(0.1, 0, 1, 0.01)).toEqual({ ok: true, value: 0.1 });
    expect(checkCommitted(4, 1, 255, 1)).toEqual({ ok: true, value: 4 });
    expect(checkCommitted(255, 1, 255, 1)).toEqual({ ok: true, value: 255 });
  });

  test("the error of a sum in floating point is on the step, and is taken without it", () => {
    // 0.1 + 0.01 + 0.01 in floating point.
    expect(checkCommitted(0.12000000000000001, 0, 1, 0.01)).toEqual({
      ok: true,
      value: 0.12,
    });
  });

  test("a number above the largest is refused, not moved to it: 10 for a threshold, 300 for a ploidy", () => {
    expect(checkCommitted(10, 0, 1, 0.01)).toEqual({
      ok: false,
      error: { kind: "aboveMax", typed: 10, maxValue: 1 },
    });
    expect(checkCommitted(300, 1, 255, 1)).toEqual({
      ok: false,
      error: { kind: "aboveMax", typed: 300, maxValue: 255 },
    });
    expect(checkCommitted(1.001, 0, 1, 0.01)).toEqual({
      ok: false,
      error: { kind: "aboveMax", typed: 1.001, maxValue: 1 },
    });
  });

  test("a number below the smallest is refused: 0 for a ploidy, -0.5 for a threshold", () => {
    expect(checkCommitted(0, 1, 255, 1)).toEqual({
      ok: false,
      error: { kind: "belowMin", typed: 0, minValue: 1 },
    });
    expect(checkCommitted(-0.5, 0, 1, 0.01)).toEqual({
      ok: false,
      error: { kind: "belowMin", typed: -0.5, minValue: 0 },
    });
  });

  test("a number off the step is refused, not rounded: 0.125, 0.001 and 1e-7 for a threshold, 2.5 for a ploidy", () => {
    for (const typed of [0.125, 0.001, 0.0049, 0.9949, 1e-7]) {
      expect(checkCommitted(typed, 0, 1, 0.01)).toEqual({
        ok: false,
        error: { kind: "offStep", typed, decimals: 2 },
      });
    }
    expect(checkCommitted(2.5, 1, 255, 1)).toEqual({
      ok: false,
      error: { kind: "offStep", typed: 2.5, decimals: 0 },
    });
  });
});

describe("numberText", () => {
  test("every decimal, no exponent and no separator of thousands", () => {
    expect(numberText(0.1)).toBe("0.1");
    expect(numberText(1e-7)).toBe("0.0000001");
    expect(numberText(12345)).toBe("12345");
    expect(numberText(0.125)).toBe("0.125");
  });
});
