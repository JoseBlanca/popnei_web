/**
 * The marks of the groups and the colours of viridis,
 * docs/specs/charts/scatter.md, "How it is verified", "The pure
 * functions".
 */

import { pathRound } from "d3-path";
import { interpolateViridis } from "d3-scale-chromatic";
import { symbolCircle, symbolsFill } from "d3-shape";
import { describe, expect, test } from "vitest";
import {
  drawSymbolAt,
  groupColourClass,
  groupMark,
  groupSymbol,
  MARK_RADIUS,
  NO_GROUP,
  PATH_DIGITS,
  SYMBOL_AREA,
  symbolPath,
  viridisColour,
  viridisStep,
} from "./marks.ts";

describe("IP7 D1 the pieces of the scatter, the marks of the groups", () => {
  test("group 0 is colour 0 and symbol 0", () => {
    expect(groupMark(0)).toEqual({ colour: 0, symbol: 0 });
  });

  test("group 7 is colour 0 and symbol 1, and group 8 colour 1 and symbol 2", () => {
    expect(groupMark(7)).toEqual({ colour: 0, symbol: 1 });
    expect(groupMark(8)).toEqual({ colour: 1, symbol: 2 });
  });

  test("the 49 groups 0 to 48 have 49 different marks", () => {
    const marks = new Set<string>();
    for (let group = 0; group < 49; group++) {
      const { colour, symbol } = groupMark(group);
      expect(colour).toBeGreaterThanOrEqual(0);
      expect(colour).toBeLessThan(7);
      expect(symbol).toBeGreaterThanOrEqual(0);
      expect(symbol).toBeLessThan(7);
      marks.add(`${String(colour)},${String(symbol)}`);
    }
    expect(marks.size).toBe(49);
  });

  test("group 49 has the mark of group 0", () => {
    expect(groupMark(49)).toEqual(groupMark(0));
  });

  test("the first seven groups differ in colour and in shape", () => {
    const marks = [0, 1, 2, 3, 4, 5, 6].map((group) => groupMark(group));
    expect(new Set(marks.map((mark) => mark.colour)).size).toBe(7);
    expect(new Set(marks.map((mark) => mark.symbol)).size).toBe(7);
  });

  test("a group that is not a whole number from 0 is a defect", () => {
    expect(() => groupMark(-1)).toThrow(/popnei_web defect/);
    expect(() => groupMark(1.5)).toThrow(/popnei_web defect/);
    expect(() => groupMark(Number.NaN)).toThrow(/popnei_web defect/);
  });

  test("a group's symbol is the one of symbolsFill its mark names, and NO_GROUP's the circle", () => {
    expect(groupSymbol(7)).toBe(symbolsFill[1]);
    expect(groupSymbol(4)).toBe(symbolsFill[4]);
    expect(groupSymbol(NO_GROUP)).toBe(symbolCircle);
  });

  test("the class of a group's colour is chart-colour-‹i % 7›, and NO_GROUP's the ring's", () => {
    expect(groupColourClass(0)).toBe("chart-colour-0");
    expect(groupColourClass(13)).toBe("chart-colour-6");
    expect(groupColourClass(14)).toBe("chart-colour-0");
    expect(groupColourClass(NO_GROUP)).toBe("chart-points-none");
  });

  test("a mark is of 64 square pixels, and covers the pointer within 4.51 pixels", () => {
    expect(SYMBOL_AREA).toBe(64);
    expect(MARK_RADIUS).toBeCloseTo(4.5135, 4);
  });
});

describe("IP7 D1 the pieces of the scatter, the path of a group", () => {
  test("the path of one group of two points is the star drawn at each with one decimal", () => {
    // Made by symbol(symbolsFill[4], 64) of d3-shape into pathRound(1) of
    // d3-path, with a context that moved each point by (10.26, 20.74)
    // and by (100.04, 50.06), on 28 September 2026.
    const expected =
      "M10.3,13.2L12,18.4L17.4,18.4L13,21.6L14.7,26.8L10.3,23.6L5.8,26.8L7.5,21.6L3.1,18.4L8.6,18.4Z" +
      "M100,42.5L101.7,47.7L107.2,47.7L102.8,51L104.5,56.2L100,52.9L95.6,56.2L97.3,51L92.9,47.7L98.3,47.7Z";
    const path = pathRound(PATH_DIGITS);
    const star = groupSymbol(4);
    drawSymbolAt(path, star, SYMBOL_AREA, 10.26, 20.74);
    drawSymbolAt(path, star, SYMBOL_AREA, 100.04, 50.06);
    expect(path.toString()).toBe(expected);
  });

  test("the square, drawn as a rectangle, is moved to its point", () => {
    const path = pathRound(PATH_DIGITS);
    drawSymbolAt(path, groupSymbol(3), SYMBOL_AREA, 20, 30);
    expect(path.toString()).toBe("M16,26h8v8h-8Z");
  });

  test("the circle, drawn as arcs, is moved to its point", () => {
    const path = pathRound(PATH_DIGITS);
    drawSymbolAt(path, groupSymbol(0), SYMBOL_AREA, 20, 30);
    expect(path.toString()).toBe(
      "M24.5,30A4.5,4.5,0,1,1,15.5,30A4.5,4.5,0,1,1,24.5,30",
    );
  });

  test("the mark of the legend is the plot's, centred on 0,0; NO_GROUP's the circle of the ring", () => {
    expect(symbolPath(NO_GROUP)).toBe(
      "M4.5,0A4.5,4.5,0,1,1,-4.5,0A4.5,4.5,0,1,1,4.5,0",
    );
    expect(symbolPath(0)).toBe(symbolPath(NO_GROUP));
    const path = pathRound(PATH_DIGITS);
    drawSymbolAt(path, groupSymbol(10), SYMBOL_AREA, 0, 0);
    expect(symbolPath(10)).toBe(path.toString());
    expect(symbolPath(3)).toBe("M-4,-4h8v8h-8Z");
  });
});

describe("IP7 D1 the pieces of the scatter, viridis", () => {
  test("the smallest value is step 0 and the largest step 255", () => {
    expect(viridisStep(-2, -2, 6)).toBe(0);
    expect(viridisStep(6, -2, 6)).toBe(255);
  });

  test("a value when the smallest and the largest are equal is step 128", () => {
    expect(viridisStep(3, 3, 3)).toBe(128);
  });

  test("the values between are in 256 steps of equal width", () => {
    expect(viridisStep(0.5, 0, 1)).toBe(128);
    expect(viridisStep(0.999, 0, 1)).toBe(255);
    expect(viridisStep(1 / 256 - 1e-9, 0, 1)).toBe(0);
    expect(viridisStep(1 / 256, 0, 1)).toBe(1);
  });

  test("step 0 is #440154 and step 255 #fde725", () => {
    expect(viridisColour(0)).toBe("#440154");
    expect(viridisColour(255)).toBe("#fde725");
  });

  test("the 256 steps are the 256 colours interpolateViridis holds, in order", () => {
    // Each colour of the table is taken at the middle of its band of t;
    // the table of d3-scale-chromatic 3.1.0 has 254 different colours,
    // steps 112 and 113, and 129 and 130, being the same.
    for (let step = 0; step < 256; step++) {
      expect(viridisColour(step)).toBe(interpolateViridis((step + 0.5) / 256));
    }
  });

  test("a value that is not finite or not between the ends, and a step outside 0 to 255, are defects", () => {
    expect(() => viridisStep(Number.NaN, 0, 1)).toThrow(/popnei_web defect/);
    expect(() => viridisStep(2, 0, 1)).toThrow(/popnei_web defect/);
    expect(() => viridisStep(-1, 0, 1)).toThrow(/popnei_web defect/);
    expect(() => viridisStep(0, 0, Infinity)).toThrow(/popnei_web defect/);
    expect(() => viridisColour(256)).toThrow(/popnei_web defect/);
    expect(() => viridisColour(-1)).toThrow(/popnei_web defect/);
    expect(() => viridisColour(1.5)).toThrow(/popnei_web defect/);
  });
});
