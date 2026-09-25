import { describe, expect, test } from "vitest";
import type { Cell, ColumnType, IndividualsTable } from "../protocol.ts";
import {
  MAX_FEW_WHOLE_LEVELS,
  cellNumber,
  columnWarnings,
  inferColumnTypes,
} from "./columnTypes.ts";

/** A table of an identifier column and one more, `x`, of these cells. */
function tableOf(cells: readonly Cell[]): IndividualsTable {
  return {
    columns: ["id", "x"],
    rows: cells.map((cell, index) => [`ind${String(index)}`, cell]),
  };
}

/** The type the inference gives the column `x` of `tableOf(cells)`. */
function typeOf(cells: readonly Cell[], decimal: "." | "," = "."): ColumnType {
  const types = inferColumnTypes(tableOf(cells), decimal);
  expect(types).toHaveLength(2);
  expect(types[0]).toEqual({ kind: "identifier" });
  const type = types[1];
  if (type === undefined) throw new Error("no type for the column x");
  return type;
}

describe("WS4 D2 the numbers and the types", () => {
  describe("cellNumber with a decimal comma, each case of the reader spec", () => {
    test("12 is the number 12", () => {
      expect(cellNumber("12", ",")).toBe(12);
    });
    test("-1,75 is -1.75", () => {
      expect(cellNumber("-1,75", ",")).toBe(-1.75);
    });
    test(",5 is 0.5", () => {
      expect(cellNumber(",5", ",")).toBe(0.5);
    });
    test("5, is 5", () => {
      expect(cellNumber("5,", ",")).toBe(5);
    });
    test("1,2E-03 is 0.0012", () => {
      expect(cellNumber("1,2E-03", ",")).toBe(0.0012);
    });
    test("1.234,5, with a thousands separator, is not a number", () => {
      expect(cellNumber("1.234,5", ",")).toBeNull();
    });
    test("1,5 with a space after it is not a number", () => {
      expect(cellNumber("1,5 ", ",")).toBeNull();
    });
    test("Inf is not a number", () => {
      expect(cellNumber("Inf", ",")).toBeNull();
    });
    test("1e999, which is not finite, is not a number", () => {
      expect(cellNumber("1e999", ",")).toBeNull();
    });
    test("- is not a number", () => {
      expect(cellNumber("-", ",")).toBeNull();
    });
    test("NA is not a number", () => {
      expect(cellNumber("NA", ",")).toBeNull();
    });
    test("a missing cell, null, is not a number", () => {
      expect(cellNumber(null, ",")).toBeNull();
    });
    test("1,5 read with a decimal point is not a number", () => {
      expect(cellNumber("1,5", ".")).toBeNull();
    });
    test("a boolean, true, is not a number", () => {
      expect(cellNumber(true, ",")).toBeNull();
    });
  });

  describe("cellNumber, the rest of the rules", () => {
    test("a sign +, a point and an exponent are read with a decimal point", () => {
      expect(cellNumber("+1.5e2", ".")).toBe(150);
      expect(cellNumber("-.5", ".")).toBe(-0.5);
    });
    test("a decimal mark alone, a sign alone and two marks are not numbers", () => {
      expect(cellNumber(",", ",")).toBeNull();
      expect(cellNumber("+", ",")).toBeNull();
      expect(cellNumber("1,2,3", ",")).toBeNull();
      expect(cellNumber("1e", ".")).toBeNull();
      expect(cellNumber("12%", ".")).toBeNull();
      expect(cellNumber("", ".")).toBeNull();
    });
    test("a number cell of an xlsx is its number, and a boolean false is not one", () => {
      expect(cellNumber(1.75, ",")).toBe(1.75);
      expect(cellNumber(false, ".")).toBeNull();
    });
  });

  describe("inferColumnTypes, the four types", () => {
    test("the first column is identifier, whatever its values", () => {
      const table: IndividualsTable = {
        columns: ["id"],
        rows: [["1"], ["2"], ["3"]],
      };
      expect(inferColumnTypes(table, ".")).toEqual([{ kind: "identifier" }]);
    });
    test("two distinct values, case and control, are binary with case as 1", () => {
      expect(typeOf(["control", "case", null, "case"])).toEqual({
        kind: "binary",
        one: "case",
        zero: "control",
      });
    });
    test("three numbers are continuous", () => {
      expect(typeOf(["1,75", "1,82", "1,69"], ",")).toEqual({
        kind: "continuous",
      });
    });
    test("three values of which one is not a number are categorical", () => {
      expect(typeOf(["12", "15", "n.d."])).toEqual({ kind: "categorical" });
    });
    test("three words are categorical", () => {
      expect(typeOf(["España", "Italia", "Perú"])).toEqual({
        kind: "categorical",
      });
    });
    test("one value, and no value at all, are categorical", () => {
      expect(typeOf(["P1", "P1"])).toEqual({ kind: "categorical" });
      expect(typeOf([null, null])).toEqual({ kind: "categorical" });
    });
    test("numbers with the other decimal mark are text, so categorical", () => {
      expect(typeOf(["1,75", "1,82", "1,69"], ".")).toEqual({
        kind: "categorical",
      });
    });
  });

  describe("inferColumnTypes, which of two values is coded 1", () => {
    test("of two numbers the larger: 0 and 1 give 1", () => {
      expect(typeOf(["1", "0"])).toEqual({
        kind: "binary",
        one: "1",
        zero: "0",
      });
    });
    test("of two numbers the larger: 1 and 2 give 2, as in plink", () => {
      expect(typeOf(["2", "1"])).toEqual({
        kind: "binary",
        one: "2",
        zero: "1",
      });
    });
    test("the numbers are compared by value, not as text: 10 over 9", () => {
      expect(typeOf(["10", "9"])).toEqual({
        kind: "binary",
        one: "10",
        zero: "9",
      });
    });
    test("each known pair, without regard to case, the case as written", () => {
      const pairs: readonly (readonly [string, string])[] = [
        ["Case", "control"],
        ["YES", "no"],
        ["y", "N"],
        ["True", "False"],
        ["t", "f"],
        ["affected", "Unaffected"],
        ["positive", "negative"],
        ["present", "absent"],
        ["sí", "no"],
        ["Si", "No"],
      ];
      for (const [one, zero] of pairs) {
        expect(typeOf([zero, one])).toEqual({ kind: "binary", one, zero });
        expect(typeOf([one, zero])).toEqual({ kind: "binary", one, zero });
      }
    });
    test("otherwise the second by code units: Male over Female, P2 over P1", () => {
      expect(typeOf(["Male", "Female"])).toEqual({
        kind: "binary",
        one: "Male",
        zero: "Female",
      });
      expect(typeOf(["P2", "P1"])).toEqual({
        kind: "binary",
        one: "P2",
        zero: "P1",
      });
      // By code units, "a" (97) comes after "B" (66).
      expect(typeOf(["a", "B"])).toEqual({
        kind: "binary",
        one: "a",
        zero: "B",
      });
    });
    test("two numbers of one value, 1 and 01, fall to the code units", () => {
      expect(typeOf(["01", "1"])).toEqual({
        kind: "binary",
        one: "1",
        zero: "01",
      });
      expect(typeOf(["1,0", "1"], ",")).toEqual({
        kind: "binary",
        one: "1,0",
        zero: "1",
      });
    });
    test("the booleans of an xlsx are a known pair, true over false", () => {
      expect(typeOf([false, true])).toEqual({
        kind: "binary",
        one: true,
        zero: false,
      });
    });
  });

  describe("columnWarnings", () => {
    test("MAX_FEW_WHOLE_LEVELS is 20", () => {
      expect(MAX_FEW_WHOLE_LEVELS).toBe(20);
    });
    test("a continuous column of 4 whole numbers from 1 to 5 is warned of", () => {
      const table = tableOf(["1", "2", "3", "5"]);
      const columns = inferColumnTypes(table, ".");
      expect(columnWarnings(table, columns, ".")).toEqual([
        { kind: "fewWholeLevels", column: "x", numLevels: 4, min: 1, max: 5 },
      ]);
    });
    test("1, 01 and 001 are one level, and -3 and +3 are whole", () => {
      const table = tableOf(["1", "01", "001", "-3", "+3", null]);
      const columns = inferColumnTypes(table, ".");
      expect(columns[1]).toEqual({ kind: "continuous" });
      expect(columnWarnings(table, columns, ".")).toEqual([
        { kind: "fewWholeLevels", column: "x", numLevels: 3, min: -3, max: 3 },
      ]);
    });
    test("20 whole levels are warned of, 21 are not", () => {
      const twenty = tableOf(
        Array.from({ length: 20 }, (_, index) => String(index + 1)),
      );
      expect(
        columnWarnings(twenty, inferColumnTypes(twenty, "."), "."),
      ).toEqual([
        { kind: "fewWholeLevels", column: "x", numLevels: 20, min: 1, max: 20 },
      ]);
      const twentyOne = tableOf(
        Array.from({ length: 21 }, (_, index) => String(index + 1)),
      );
      expect(
        columnWarnings(twentyOne, inferColumnTypes(twentyOne, "."), "."),
      ).toEqual([]);
    });
    test("a decimal mark or an exponent makes a value not whole", () => {
      for (const odd of ["12,0", "1e3"]) {
        const table = tableOf(["1", "2", odd]);
        const columns = inferColumnTypes(table, ",");
        expect(columns[1]).toEqual({ kind: "continuous" });
        expect(columnWarnings(table, columns, ",")).toEqual([]);
      }
    });
    test("only a column typed continuous is warned of, in the order of the table", () => {
      const table: IndividualsTable = {
        columns: ["id", "pop", "a", "g", "b"],
        rows: [
          ["i1", "1", "7", "1", "1"],
          ["i2", "2", "8", "2", "4"],
          ["i3", "3", "9", "1", "4"],
        ],
      };
      const columns: ColumnType[] = [
        { kind: "identifier" },
        { kind: "categorical" },
        { kind: "continuous" },
        { kind: "binary", one: "2", zero: "1" },
        { kind: "continuous" },
      ];
      expect(columnWarnings(table, columns, ".")).toEqual([
        { kind: "fewWholeLevels", column: "a", numLevels: 3, min: 7, max: 9 },
        { kind: "fewWholeLevels", column: "b", numLevels: 2, min: 1, max: 4 },
      ]);
    });
  });
});
