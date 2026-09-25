import { describe, expect, test } from "vitest";

import { roundToStep } from "./roundToStep.ts";

describe("roundToStep", () => {
  test("a half goes up, as the decimals were typed: 0.125 to 0.13, 0.145 to 0.15", () => {
    expect(roundToStep(0.125, 0, 1, 0.01)).toBe(0.13);
    expect(roundToStep(0.135, 0, 1, 0.01)).toBe(0.14);
    expect(roundToStep(0.145, 0, 1, 0.01)).toBe(0.15);
    expect(roundToStep(0.115, 0, 1, 0.01)).toBe(0.12);
    expect(roundToStep(0.124, 0, 1, 0.01)).toBe(0.12);
    expect(roundToStep(0.05, 0, 1, 0.01)).toBe(0.05);
  });

  test("a whole step: 2.5 to 3, 2.4 to 2", () => {
    expect(roundToStep(2.5, 1, 255, 1)).toBe(3);
    expect(roundToStep(2.4, 1, 255, 1)).toBe(2);
  });

  test("the bounds hold: 5 to 1 and -1 to 0 for a threshold; 0 to 1 and 300 to 255 for a ploidy", () => {
    expect(roundToStep(5, 0, 1, 0.01)).toBe(1);
    expect(roundToStep(-1, 0, 1, 0.01)).toBe(0);
    expect(roundToStep(0, 1, 255, 1)).toBe(1);
    expect(roundToStep(300, 1, 255, 1)).toBe(255);
  });

  test("a number written with an exponent", () => {
    expect(roundToStep(1e-7, 0, 1, 0.01)).toBe(0);
  });
});
