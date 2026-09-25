/**
 * The step the hash names, and the title of the page (docs/specs/shell.md,
 * "The step in the hash").
 */
import { describe, expect, test } from "vitest";

import { hashOfStep, stepOfHash, titleOfStep } from "./steps.ts";

describe("the step in the hash", () => {
  test("a hash that names a step gives that step", () => {
    expect(stepOfHash("#variants")).toBe("variants");
    expect(stepOfHash("#individuals")).toBe("individuals");
    expect(stepOfHash("#analyses")).toBe("analyses");
  });

  test("an empty hash, or one that names no step, gives Variants", () => {
    expect(stepOfHash("")).toBe("variants");
    expect(stepOfHash("#")).toBe("variants");
    expect(stepOfHash("#export")).toBe("variants");
    expect(stepOfHash("#Analyses")).toBe("variants");
  });

  test("the link of a step is its hash, which gives the step back", () => {
    expect(hashOfStep("analyses")).toBe("#analyses");
    expect(stepOfHash(hashOfStep("individuals"))).toBe("individuals");
  });

  test("the title of the page names the step", () => {
    expect(titleOfStep("variants")).toBe(
      "Variants · Population genetics · popnei web",
    );
    expect(titleOfStep("analyses")).toBe(
      "Analyses · Population genetics · popnei web",
    );
  });
});
