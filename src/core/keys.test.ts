import { createHash } from "node:crypto";
import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import { canonical, createKeyMemo, sha256Hex } from "./keys.ts";
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

/** The SHA-256 of a text as node's `crypto` computes it, to compare with
    ours. */
function nodeSha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** A character whose UTF-8 has `numBytes` bytes, drawn from the whole
    range of those characters, the halves of a pair left out. */
function characterOf(numBytes: 1 | 2 | 3 | 4): fc.Arbitrary<string> {
  switch (numBytes) {
    case 1:
      return fc.integer({ min: 0, max: 0x7f }).map(String.fromCodePoint);
    case 2:
      return fc.integer({ min: 0x80, max: 0x7ff }).map(String.fromCodePoint);
    case 3:
      return fc
        .oneof(
          fc.integer({ min: 0x800, max: 0xd7ff }),
          fc.integer({ min: 0xe000, max: 0xffff }),
        )
        .map(String.fromCodePoint);
    case 4:
      return fc
        .integer({ min: 0x10000, max: 0x10ffff })
        .map(String.fromCodePoint);
  }
}

describe("WP2 D1 the hash", () => {
  test.each([
    [
      "the empty text",
      "",
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    ],
    [
      "abc",
      "abc",
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    ],
    [
      "the text of 56 letters",
      "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    ],
    [
      "a one million times",
      "a".repeat(1_000_000),
      "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0",
    ],
  ])("gives the NIST hash of %s", (_what, text, hash) => {
    expect(sha256Hex(text)).toBe(hash);
  });

  test.each([55, 56, 63, 64])(
    "gives node's hash of a text of %i bytes, where the padding goes from one block to two",
    (numBytes) => {
      const text = "0123456789abcdef".repeat(4).slice(0, numBytes);
      expect(sha256Hex(text)).toBe(nodeSha256Hex(text));
    },
  );

  test("hashes é中𝄞, 9 bytes of characters of two, three and four bytes", () => {
    expect(sha256Hex("é中𝄞")).toBe(
      "6181473142f4c7073033e4dc44da56a6545a9a4eae4c0b4b79709b3a65b1a555",
    );
  });

  test.each([
    ["a first half alone", "\ud800"],
    ["a first half at the end", "ab\ud800"],
    ["a first half before a letter", "\ud800a"],
    ["a second half alone", "a\udc00b"],
  ])("throws a defect on %s of a pair", (_what, text) => {
    expect(() => sha256Hex(text)).toThrow(/^popnei_web defect: /);
  });

  test("gives node's hash of any text of the whole of Unicode", () => {
    fc.assert(
      fc.property(fc.string({ unit: "binary", maxLength: 200 }), (text) => {
        expect(sha256Hex(text)).toBe(nodeSha256Hex(text));
      }),
    );
  });

  test("gives node's hash of any text of characters of one to four bytes", () => {
    const character = fc.oneof(
      characterOf(1),
      characterOf(2),
      characterOf(3),
      characterOf(4),
    );
    fc.assert(
      fc.property(fc.string({ unit: character, maxLength: 100 }), (text) => {
        expect(sha256Hex(text)).toBe(nodeSha256Hex(text));
      }),
    );
  });

  test("hashes the canonical form of the example of the keys spec", () => {
    const text = canonical({ b: 0.1, a: [true, null, "é"] }, null);
    expect(Buffer.byteLength(text, "utf8")).toBe(30);
    expect(sha256Hex(text)).toBe(
      "028eee05401b6428f0941fd2694cc6950836d008b50bb5ee2f4d2c559a0ccca8",
    );
  });
});
