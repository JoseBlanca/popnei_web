import { describe, expect, test } from "vitest";

import {
  checkCommitted,
  numberText,
  takesTextOut,
  typedNumber,
} from "./committedNumber.ts";

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
      error: { kind: "aboveMax", typed: "10", maxValue: 1 },
    });
    expect(checkCommitted(300, 1, 255, 1)).toEqual({
      ok: false,
      error: { kind: "aboveMax", typed: "300", maxValue: 255 },
    });
    expect(checkCommitted(1.001, 0, 1, 0.01)).toEqual({
      ok: false,
      error: { kind: "aboveMax", typed: "1.001", maxValue: 1 },
    });
  });

  test("a number below the smallest is refused: 0 for a ploidy, -0.5 for a threshold", () => {
    expect(checkCommitted(0, 1, 255, 1)).toEqual({
      ok: false,
      error: { kind: "belowMin", typed: "0", minValue: 1 },
    });
    expect(checkCommitted(-0.5, 0, 1, 0.01)).toEqual({
      ok: false,
      error: { kind: "belowMin", typed: "-0.5", minValue: 0 },
    });
  });

  test("a number off the step is refused, not rounded: 0.125, 0.001 and 1e-7 for a threshold, 2.5 for a ploidy", () => {
    for (const [value, typed] of [
      [0.125, "0.125"],
      [0.001, "0.001"],
      [0.0049, "0.0049"],
      [0.9949, "0.9949"],
      [1e-7, "0.0000001"],
    ] as const) {
      expect(checkCommitted(value, 0, 1, 0.01)).toEqual({
        ok: false,
        error: { kind: "offStep", typed, decimals: 2 },
      });
    }
    expect(checkCommitted(2.5, 1, 255, 1)).toEqual({
      ok: false,
      error: { kind: "offStep", typed: "2.5", decimals: 0 },
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

describe("takesTextOut", () => {
  test("a character typed takes nothing out, wherever it goes", () => {
    expect(takesTextOut("0", "0,")).toBe(false);
    expect(takesTextOut("01", "0,1")).toBe(false);
    expect(takesTextOut("", "5")).toBe(false);
    // A character repeated.
    expect(takesTextOut("0.1", "0.11")).toBe(false);
  });

  test("a deletion, or a text typed over, takes text out", () => {
    expect(takesTextOut("01", "0")).toBe(true);
    expect(takesTextOut("0.11", "0.1")).toBe(true);
    expect(takesTextOut("0.1", "0,05")).toBe(true);
    expect(takesTextOut("0.1", "")).toBe(true);
  });

  test("the same text takes nothing out", () => {
    expect(takesTextOut("0.1", "0.1")).toBe(false);
  });
});

describe("VS6 D1 the number field: decimals apart from the step, and the number typed", () => {
  test("a field of four decimals with a step of 0.01 takes 0.0312, and 0.0312 and a step of 0.01 summed in floating point", () => {
    expect(checkCommitted(0.0312, 0, 1, 0.01, 4)).toEqual({
      ok: true,
      value: 0.0312,
    });
    expect(checkCommitted(0.03, 0, 1, 0.01, 4)).toEqual({
      ok: true,
      value: 0.03,
    });
    // 0.0312 + 0.01 in floating point is 0.0412 with an error in its
    // last digits, which an arrow key gives and a user does not type.
    expect(checkCommitted(0.0312 + 0.01, 0, 1, 0.01, 4)).toEqual({
      ok: true,
      value: 0.0412,
    });
  });

  test("a field of four decimals refuses 0.12345, and its bounds before its decimals", () => {
    expect(checkCommitted(0.12345, 0, 1, 0.01, 4)).toEqual({
      ok: false,
      error: { kind: "offStep", typed: "0.12345", decimals: 4 },
    });
    expect(checkCommitted(1e-7, 0, 1, 0.01, 4)).toEqual({
      ok: false,
      error: { kind: "offStep", typed: "0.0000001", decimals: 4 },
    });
    expect(checkCommitted(1.00001, 0, 1, 0.01, 4)).toEqual({
      ok: false,
      error: { kind: "aboveMax", typed: "1.00001", maxValue: 1 },
    });
  });

  test("a field of no decimals takes, as in stage 2, only a multiple of its step", () => {
    expect(checkCommitted(0.0312, 0, 1, 0.01)).toEqual({
      ok: false,
      error: { kind: "offStep", typed: "0.0312", decimals: 2 },
    });
    expect(checkCommitted(0.03, 0, 1, 0.01)).toEqual({
      ok: true,
      value: 0.03,
    });
    expect(checkCommitted(10000, 1, Number.MAX_SAFE_INTEGER, 1)).toEqual({
      ok: true,
      value: 10000,
    });
  });

  test("the number typed is the one the field would take, read as digits and a point whatever the language", () => {
    expect(typedNumber("0.9", 0, 1, 0.01)).toBe(0.9);
    expect(typedNumber("0.05", 0, 1, 0.01)).toBe(0.05);
    expect(typedNumber("1", 0, 1, 0.01)).toBe(1);
    expect(typedNumber(".5", 0, 1, 0.01)).toBe(0.5);
    expect(typedNumber("0.0312", 0, 1, 0.01, 4)).toBe(0.0312);
    expect(typedNumber("10000", 1, Number.MAX_SAFE_INTEGER, 1)).toBe(10000);
  });

  test("no number is typed while the text is none, is out of the range, or has more decimals than the field takes", () => {
    // On the way to 0.05.
    expect(typedNumber("0.", 0, 1, 0.01)).toBeNull();
    expect(typedNumber(".", 0, 1, 0.01)).toBeNull();
    expect(typedNumber("", 0, 1, 0.01)).toBeNull();
    // A comma is a decimal mark in Spanish, and no number here.
    expect(typedNumber("0,05", 0, 1, 0.01)).toBeNull();
    expect(typedNumber("1,5", 0, 1, 0.01)).toBeNull();
    expect(typedNumber("1e-2", 0, 1, 0.01)).toBeNull();
    expect(typedNumber("-0.1", 0, 1, 0.01)).toBeNull();
    expect(typedNumber("1.5", 0, 1, 0.01)).toBeNull();
    expect(typedNumber("0.125", 0, 1, 0.01)).toBeNull();
    expect(typedNumber("0.12345", 0, 1, 0.01, 4)).toBeNull();
    expect(typedNumber("0", 1, Number.MAX_SAFE_INTEGER, 1)).toBeNull();
    expect(typedNumber("2.5", 1, Number.MAX_SAFE_INTEGER, 1)).toBeNull();
  });
});

describe("IP3 the number a refusal names", () => {
  test("a number past 2^53 − 1 is named as it was typed, not as the float it became", () => {
    expect(
      checkCommitted(
        9007199254740992,
        1,
        Number.MAX_SAFE_INTEGER,
        1,
        undefined,
        "9007199254740993",
      ),
    ).toEqual({
      ok: false,
      error: {
        kind: "aboveMax",
        typed: "9007199254740993",
        maxValue: Number.MAX_SAFE_INTEGER,
      },
    });
  });

  test("a text that is not the number committed, as the one an arrow key stepped from, gives the number", () => {
    expect(checkCommitted(256, 1, 255, 1, undefined, "255")).toEqual({
      ok: false,
      error: { kind: "aboveMax", typed: "256", maxValue: 255 },
    });
  });
});
