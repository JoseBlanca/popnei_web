/**
 * The measure and the cut of the text of the plots, src/charts/textWidth.ts
 * (docs/specs/charts/bars.md, "The room of the names"), under jsdom with
 * the fake measure of testSupport.ts, which gives a W 11 pixels and any
 * other character 5.5, and the export's fonts the width it is given.
 */

import { afterEach, describe, expect, test } from "vitest";
import { measuredWidth, textWidth } from "./textWidth.ts";
import { measureWithFake, stopFakeMeasure } from "./testSupport.ts";

afterEach(() => {
  stopFakeMeasure();
});

describe("second review of round 1: a text measured in the page's font and in the export's", () => {
  test("measured as wide in both fonts, WWa is 27.5 pixels at 12, with nothing more", () => {
    measureWithFake();
    expect(measuredWidth("WWa", 12)).toBe(27.5);
  });

  test("the export's fonts 5% wider: WWa is 28.88 pixels, the larger, to a hundredth", () => {
    measureWithFake(1.05);
    expect(measuredWidth("WWa", 12)).toBe(28.88);
  });

  test("the export's fonts 10% narrower: WWa is the 27.5 pixels of the page's font", () => {
    measureWithFake(0.9);
    expect(measuredWidth("WWa", 12)).toBe(27.5);
  });

  test("where nothing measures, the characters times the width given each", () => {
    expect(measuredWidth("WWa", 12)).toBeNull();
    expect(textWidth("WWa", 12, 9)).toBe(27);
  });
});
