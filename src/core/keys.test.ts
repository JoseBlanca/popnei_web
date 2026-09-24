import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import { canonical, createKeyMemo } from "./keys.ts";
import type { JsonObject, JsonValue } from "./keys.ts";
import { jsonValue } from "./testSupport.ts";

/** The same value with the fields of every object set in another order,
    the one `rank` gives them. */
function reordered(
  value: JsonValue,
  rank: (name: string) => number,
): JsonValue {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (isList(value)) {
    return value.map((item) => reordered(item, rank));
  }
  const names = Object.keys(value).toSorted((a, b) => rank(a) - rank(b));
  return Object.fromEntries(
    names.map((name) => [name, reordered(fieldOf(value, name), rank)]),
  );
}

/** The same value with every −0 made 0, the one number the text does not
    keep. */
function withoutNegativeZero(value: JsonValue): JsonValue {
  if (typeof value === "number") {
    return Object.is(value, -0) ? 0 : value;
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (isList(value)) {
    return value.map(withoutNegativeZero);
  }
  return Object.fromEntries(
    Object.keys(value).map((name) => [
      name,
      withoutNegativeZero(fieldOf(value, name)),
    ]),
  );
}

function isList(value: object): value is readonly JsonValue[] {
  return Array.isArray(value);
}

function fieldOf(value: JsonObject, name: string): JsonValue {
  const field = value[name];
  if (field === undefined) {
    throw new Error(`popnei_web defect: no field ${name} in a test value.`);
  }
  return field;
}

/** A small, fixed hash of a name mixed with a seed, to shuffle fields. */
function rankWith(seed: number): (name: string) => number {
  return (name) => {
    let hash = seed;
    for (const char of name) {
      hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 16777619) >>> 0;
    }
    return hash;
  };
}

class Point {
  readonly x = 1;
}

class Rows extends Array<number> {}

describe("WP1 D2 the canonical form", () => {
  test("writes the fields sorted by name, lists in order, with no space", () => {
    expect(canonical({ b: 0.1, a: [true, null, "é"] }, null)).toBe(
      '{"a":[true,null,"é"],"b":0.1}',
    );
  });

  test("writes −0 as 0", () => {
    expect(canonical(-0, null)).toBe("0");
  });

  test("writes half of a pair that encodes one character as its escape", () => {
    expect(canonical("\ud800", null)).toBe('"\\ud800"');
  });

  test("keeps a field named __proto__ of an object parsed from JSON", () => {
    const parsed: unknown = JSON.parse('{"__proto__":1}');
    expect(canonical(parsed, null)).toBe('{"__proto__":1}');
  });

  test.each([
    ["undefined", undefined],
    ["NaN", Number.NaN],
    ["an infinity", Number.POSITIVE_INFINITY],
    ["a function", () => 1],
    ["a Map", new Map([["a", 1]])],
    ["a Set", new Set([1])],
    ["a typed array", new Float64Array([0.5])],
    ["a Date", new Date(0)],
    ["an object of a class", new Point()],
    ["a file", new File(["x"], "pops.csv")],
    ["a bigint", 1n],
    ["a symbol", Symbol("s")],
  ])("throws a defect with its path on %s", (_what, notJson) => {
    const value = { options: { list: [1, notJson] } };
    expect(() => canonical(value, null)).toThrow(
      /^popnei_web defect: .* at \["options","list",1\]/,
    );
  });

  test("throws a defect with its path on a hole in a list", () => {
    const list = new Array<number>(2);
    list[0] = 1;
    expect(() => canonical({ list }, null)).toThrow(
      'popnei_web defect: the canonical form was given a hole in a list at ["list",1]',
    );
  });

  test("throws a defect with its path on a list of a class", () => {
    expect(() => canonical({ list: Rows.of(1, 2) }, null)).toThrow(
      'popnei_web defect: the canonical form was given a list of a class at ["list"]',
    );
  });

  test("gives the same text with a memo, empty or filled, as without", () => {
    const table = { columns: ["id", "pop"], rows: [["i1", "P1"]] };
    const value = { a: table, b: [table, { c: -0 }] };
    const without = canonical(value, null);
    const memo = createKeyMemo();
    expect(canonical(value, memo)).toBe(without);
    expect(memo.texts.get(table)).toBe(
      '{"columns":["id","pop"],"rows":[["i1","P1"]]}',
    );
    expect(canonical(value, memo)).toBe(without);
  });

  test("does not depend on the order in which the fields were set", () => {
    fc.assert(
      fc.property(
        jsonValue({ withProto: true }),
        fc.integer(),
        (value, seed) => {
          expect(canonical(reordered(value, rankWith(seed)), null)).toBe(
            canonical(value, null),
          );
        },
      ),
    );
  });

  test("reads back with JSON.parse as the value, every −0 made 0", () => {
    fc.assert(
      fc.property(jsonValue({ withProto: false }), (value) => {
        const parsed: unknown = JSON.parse(canonical(value, null));
        expect(parsed).toStrictEqual(withoutNegativeZero(value));
      }),
    );
  });
});
