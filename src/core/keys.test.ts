import { createHash } from "node:crypto";
import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import {
  canonical,
  createKeyMemo,
  intermediateKeyOf,
  keyFromWire,
  keyOf,
  settingsFingerprint,
  sha256Hex,
} from "./keys.ts";
import type { JsonObject, JsonValue, KeyMemo, KeyedDef } from "./keys.ts";
import type { Project, VariantSource } from "./project.ts";
import {
  SAMPLE_VARIANTS_ID,
  anyLoadId,
  deepFreeze,
  individualFilters,
  jsonValue,
  keyedDef,
  projectWithVariants,
  sampleProject,
  variantFilters,
  variantSource,
} from "./testSupport.ts";

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
    const table = deepFreeze({ columns: ["id", "pop"], rows: [["i1", "P1"]] });
    const value = deepFreeze({ a: table, b: [table, { c: -0 }] });
    const without = canonical(value, null);
    const memo = createKeyMemo();
    expect(canonical(value, memo)).toBe(without);
    expect(memo.texts.get(table)).toBe(
      '{"columns":["id","pop"],"rows":[["i1","P1"]]}',
    );
    expect(canonical(value, memo)).toBe(without);
  });

  test("writes again an object that is not frozen, changed after it was written with a memo", () => {
    const options = { minNumInds: 20, pops: ["P1"] };
    const memo = createKeyMemo();
    expect(canonical({ options }, memo)).toBe(
      '{"options":{"minNumInds":20,"pops":["P1"]}}',
    );
    options.minNumInds = 10;
    options.pops.push("P2");
    expect(canonical({ options }, memo)).toBe(
      '{"options":{"minNumInds":10,"pops":["P1","P2"]}}',
    );
    expect(memo.texts.get(options)).toBeUndefined();
  });

  test("writes again a frozen object that holds one not frozen", () => {
    const pops = ["P1"];
    const options = Object.freeze({ pops });
    const memo = createKeyMemo();
    expect(canonical(options, memo)).toBe('{"pops":["P1"]}');
    pops.push("P2");
    expect(canonical(options, memo)).toBe('{"pops":["P1","P2"]}');
  });

  test("keeps the text of an object frozen with all it holds", () => {
    const options = deepFreeze({ pops: ["P1"] });
    const memo = createKeyMemo();
    canonical({ options }, memo);
    expect(memo.texts.get(options)).toBe('{"pops":["P1"]}');
    expect(memo.texts.get(options.pops)).toBe('["P1"]');
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

/** The fake analysis of the keys spec's "`keyOf`, a literal". */
const DIVERSITY: KeyedDef = {
  id: "diversity",
  keyVersion: 1,
  filtersRead: { variants: true, individuals: true },
  keyInputs: () => ({ pops: [["P1", ["i1", "i2"]]] }),
};

/** The project of the keys spec's literal: the `.nei` load
    `SAMPLE_VARIANTS_ID`, the filter `missing_data` 0.1 and no filter of
    the individuals. */
function literalProject(): Project {
  return deepFreeze<Project>({
    ...sampleProject(),
    filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
    individualFilters: [],
  });
}

/** The same project with another threshold of `missing_data` for the
    variants or for the individuals. */
function withMissingRate(
  p: Project,
  list: "filters" | "individualFilters",
  rate: number,
): Project {
  const filter = { kind: "missing_data", maxAllowedMissingRate: rate } as const;
  return list === "filters"
    ? { ...p, filters: [filter] }
    : { ...p, individualFilters: [filter] };
}

/** An analysis that reads the table of the individuals file, as one that
    uses the populations does. */
const READS_TABLE: KeyedDef = {
  ...DIVERSITY,
  keyInputs: (p) =>
    p.individuals?.read.kind === "read"
      ? { rows: p.individuals.read.table.rows }
      : null,
};

const LITERAL_KEY =
  "f83b2cf03da1de50384cf8531ff810a6b95b71c667b4f784d35491d6e79cc85a";

const LITERAL_FINGERPRINT =
  "64925a3dfda1679f10a451a214cf7a91901dc6321c79883e7a4da7796bfdf9eb";

describe("WP2 D2 the key", () => {
  test("gives the literal key of the keys spec", () => {
    const key = keyOf(DIVERSITY, literalProject(), "0.1.0", createKeyMemo());
    expect(key).toBe(LITERAL_KEY);
    expect(
      sha256Hex(
        '{"analysis":"diversity","filters":[{"kind":"missing_data","maxAllowedMissingRate":0.1}],"individualFilters":[],"inputs":{"pops":[["P1",["i1","i2"]]]},"keyVersion":1,"load":{"fileId":"00112233445566778899aabbccddeeff","readOptions":null},"popneiVersion":"0.1.0"}',
      ),
    ).toBe(LITERAL_KEY);
  });

  test("gives the literal fingerprint of the keys spec", () => {
    const fingerprint = settingsFingerprint(
      DIVERSITY,
      literalProject(),
      null,
      null,
    );
    expect(fingerprint).toBe(LITERAL_FINGERPRINT);
    expect(
      sha256Hex(
        '{"analysis":"diversity","filters":[{"kind":"missing_data","maxAllowedMissingRate":0.1}],"individualFilters":[],"inputs":{"pops":[["P1",["i1","i2"]]]},"readOptions":null}',
      ),
    ).toBe(LITERAL_FINGERPRINT);
  });

  test("gives the literal fingerprint with no variants file loaded, as when a project file is opened", () => {
    const opened = { ...literalProject(), variants: null };
    expect(settingsFingerprint(DIVERSITY, opened, null, createKeyMemo())).toBe(
      LITERAL_FINGERPRINT,
    );
  });

  test("writes the key of an intermediate result from the six fields of the keys spec", () => {
    const expected = sha256Hex(
      canonical(
        {
          intermediate: "the pruned variants",
          inputs: { r2: 0.2 },
          load: { fileId: SAMPLE_VARIANTS_ID, readOptions: null },
          filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
          individualFilters: [],
          popneiVersion: "0.1.0",
        },
        null,
      ),
    );
    const key = intermediateKeyOf(
      DIVERSITY,
      literalProject(),
      "0.1.0",
      "the pruned variants",
      { r2: 0.2 },
      createKeyMemo(),
    );
    expect(key).toBe(expected);
  });

  test.each(["filters", "individualFilters"] as const)(
    "changes the key with a threshold of the %s the analysis reads",
    (list) => {
      const memo = createKeyMemo();
      const p = literalProject();
      expect(
        keyOf(DIVERSITY, withMissingRate(p, list, 0.3), "0.1.0", memo),
      ).not.toBe(keyOf(DIVERSITY, p, "0.1.0", memo));
    },
  );

  test.each([
    ["filters", { variants: false, individuals: true }],
    ["individualFilters", { variants: true, individuals: false }],
  ] as const)(
    "keeps the key with a threshold of the %s the analysis does not read",
    (list, filtersRead) => {
      const def = { ...DIVERSITY, filtersRead };
      const memo = createKeyMemo();
      const p = literalProject();
      expect(keyOf(def, withMissingRate(p, list, 0.3), "0.1.0", memo)).toBe(
        keyOf(def, p, "0.1.0", memo),
      );
    },
  );

  test.each([
    ["filters", { variants: false, individuals: true }],
    ["individualFilters", { variants: true, individuals: false }],
  ] as const)(
    "keeps the key of an intermediate result and the fingerprint with a threshold of the %s the analysis does not read",
    (list, filtersRead) => {
      const def = { ...DIVERSITY, filtersRead };
      const memo = createKeyMemo();
      const p = literalProject();
      const q = withMissingRate(p, list, 0.3);
      const pruned = (r: Project): string =>
        intermediateKeyOf(def, r, "0.1.0", "the pruned variants", 0.2, memo);
      expect(pruned(q)).toBe(pruned(p));
      expect(settingsFingerprint(def, q, null, memo)).toBe(
        settingsFingerprint(def, p, null, memo),
      );
    },
  );

  test("keyFromWire gives a key of 64 lower case hexadecimal digits", () => {
    expect(keyFromWire(LITERAL_KEY)).toBe(LITERAL_KEY);
  });

  test.each([
    ["63 digits", LITERAL_KEY.slice(1)],
    ["an upper case digit", `F${LITERAL_KEY.slice(1)}`],
    ["a g", `g${LITERAL_KEY.slice(1)}`],
  ])("keyFromWire throws a defect on %s", (_what, text) => {
    expect(() => keyFromWire(text)).toThrow(/^popnei_web defect: /);
  });

  test("keyOf throws a defect on a project with no variants file", () => {
    const p = { ...literalProject(), variants: null };
    expect(() => keyOf(DIVERSITY, p, "0.1.0", createKeyMemo())).toThrow(
      /^popnei_web defect: /,
    );
  });

  test("intermediateKeyOf throws a defect on a project with no variants file", () => {
    const p = { ...literalProject(), variants: null };
    expect(() =>
      intermediateKeyOf(
        DIVERSITY,
        p,
        "0.1.0",
        "the pruned variants",
        0.2,
        createKeyMemo(),
      ),
    ).toThrow(/^popnei_web defect: /);
  });

  test("finds the key again when the individuals file is loaded again", () => {
    const p = sampleProject();
    const individuals = p.individuals;
    if (individuals === null) {
      throw new Error("popnei_web defect: the sample has an individuals file.");
    }
    const loadedAgain: Project = {
      ...p,
      individuals: {
        ...individuals,
        fileId: "0123456789abcdef0123456789abcdef",
      },
    };
    const memo = createKeyMemo();
    expect(keyOf(READS_TABLE, loadedAgain, "0.1.0", memo)).toBe(
      keyOf(READS_TABLE, p, "0.1.0", memo),
    );
  });

  test("gives another key when the variants file is loaded again", () => {
    const p = sampleProject();
    const variants = p.variants;
    if (variants === null) {
      throw new Error("popnei_web defect: the sample has a variants file.");
    }
    const loadedAgain: Project = {
      ...p,
      variants: { ...variants, fileId: "0123456789abcdef0123456789abcdef" },
    };
    const memo = createKeyMemo();
    expect(keyOf(READS_TABLE, loadedAgain, "0.1.0", memo)).not.toBe(
      keyOf(READS_TABLE, p, "0.1.0", memo),
    );
  });

  test("gives the same key for a keyInputs that returns a new object each time", () => {
    const p = literalProject();
    expect(DIVERSITY.keyInputs(p)).not.toBe(DIVERSITY.keyInputs(p));
    const memo = createKeyMemo();
    expect(keyOf(DIVERSITY, p, "0.1.0", memo)).toBe(LITERAL_KEY);
    expect(keyOf(DIVERSITY, p, "0.1.0", memo)).toBe(LITERAL_KEY);
    expect(keyOf(DIVERSITY, p, "0.1.0", createKeyMemo())).toBe(LITERAL_KEY);
  });
});

/** Everything a key, an intermediate key and a fingerprint are made from. */
interface Setting {
  readonly def: KeyedDef;
  readonly p: Project;
  readonly popneiVersion: string;
  /** The name of the intermediate result. */
  readonly name: string;
  /** What the intermediate result was made from beyond the file and the
      filters. */
  readonly intermediateInputs: JsonValue;
}

const setting: fc.Arbitrary<Setting> = fc.record({
  def: keyedDef,
  p: projectWithVariants,
  popneiVersion: fc.string(),
  name: fc.string(),
  intermediateInputs: jsonValue({ withProto: true }),
});

/** Values to change a part of a setting to, drawn beside it. */
interface Others {
  readonly fileId: string;
  readonly filters: Project["filters"];
  readonly individualFilters: Project["individualFilters"];
  readonly inputs: JsonValue;
  /** An id of an analysis, a version of popnei or a name. */
  readonly text: string;
}

const others: fc.Arbitrary<Others> = fc.record({
  fileId: anyLoadId,
  filters: variantFilters,
  individualFilters,
  inputs: jsonValue({ withProto: true }),
  text: fc.string(),
});

type Part =
  | "analysis"
  | "keyVersion"
  | "popneiVersion"
  | "fileId"
  | "readOptions"
  | "ploidy"
  | "onlyPassed"
  | "filters"
  | "filterOrder"
  | "individualFilters"
  | "inputs"
  | "name"
  | "intermediateInputs";

function variantsOf(p: Project): VariantSource {
  if (p.variants === null) {
    throw new Error("popnei_web defect: the generator draws a variants file.");
  }
  return p.variants;
}

function sameJson(a: unknown, b: unknown): boolean {
  return canonical(a, null) === canonical(b, null);
}

/**
 * The setting before and after a change of one part, the lists of filters
 * read by the analysis when the part is one of them; or `null` when the
 * value drawn to change it to is the one there.
 */
function changeOf(
  part: Part,
  s: Setting,
  other: Others,
): readonly [Setting, Setting] | null {
  const variants = variantsOf(s.p);
  const withVariants = (change: Partial<VariantSource>): Setting => ({
    ...s,
    p: { ...s.p, variants: { ...variants, ...change } },
  });
  switch (part) {
    case "analysis":
      return other.text === s.def.id
        ? null
        : [s, { ...s, def: { ...s.def, id: other.text } }];
    case "keyVersion":
      return [s, { ...s, def: { ...s.def, keyVersion: s.def.keyVersion + 1 } }];
    case "popneiVersion":
      return other.text === s.popneiVersion
        ? null
        : [s, { ...s, popneiVersion: other.text }];
    case "fileId":
      return other.fileId === variants.fileId
        ? null
        : [s, withVariants({ fileId: other.fileId })];
    case "readOptions":
      return [
        s,
        variants.readOptions === null
          ? withVariants({
              format: "vcf",
              readOptions: { ploidy: 2, onlyPassed: false },
            })
          : withVariants({ format: "nei", readOptions: null }),
      ];
    case "ploidy":
    case "onlyPassed": {
      const vcf = variants.readOptions ?? { ploidy: 2, onlyPassed: false };
      const changed =
        part === "ploidy"
          ? { ...vcf, ploidy: (vcf.ploidy % 255) + 1 }
          : { ...vcf, onlyPassed: !vcf.onlyPassed };
      return [
        withVariants({ format: "vcf", readOptions: vcf }),
        withVariants({ format: "vcf", readOptions: changed }),
      ];
    }
    case "filters": {
      if (sameJson(other.filters, s.p.filters)) {
        return null;
      }
      const reading: Setting = {
        ...s,
        def: {
          ...s.def,
          filtersRead: { ...s.def.filtersRead, variants: true },
        },
      };
      return [reading, { ...reading, p: { ...s.p, filters: other.filters } }];
    }
    case "filterOrder": {
      if (s.p.filters.length < 2) {
        return null;
      }
      const reading: Setting = {
        ...s,
        def: {
          ...s.def,
          filtersRead: { ...s.def.filtersRead, variants: true },
        },
      };
      return [
        reading,
        { ...reading, p: { ...s.p, filters: s.p.filters.toReversed() } },
      ];
    }
    case "individualFilters": {
      if (sameJson(other.individualFilters, s.p.individualFilters)) {
        return null;
      }
      const reading: Setting = {
        ...s,
        def: {
          ...s.def,
          filtersRead: { ...s.def.filtersRead, individuals: true },
        },
      };
      return [
        reading,
        {
          ...reading,
          p: { ...s.p, individualFilters: other.individualFilters },
        },
      ];
    }
    case "inputs":
      return sameJson(other.inputs, s.def.keyInputs(s.p))
        ? null
        : [s, { ...s, def: { ...s.def, keyInputs: () => other.inputs } }];
    case "name":
      return other.text === s.name ? null : [s, { ...s, name: other.text }];
    case "intermediateInputs":
      return sameJson(other.inputs, s.intermediateInputs)
        ? null
        : [s, { ...s, intermediateInputs: other.inputs }];
  }
}

/** The key of a setting with `memo`, checked equal to the key with a new
    memo, so that a memo that has seen other projects changes nothing. */
function keyWith(s: Setting, memo: KeyMemo): string {
  const key = keyOf(s.def, s.p, s.popneiVersion, memo);
  expect(keyOf(s.def, s.p, s.popneiVersion, createKeyMemo())).toBe(key);
  return key;
}

function intermediateKeyWith(s: Setting, memo: KeyMemo): string {
  return intermediateKeyOf(
    s.def,
    s.p,
    s.popneiVersion,
    s.name,
    s.intermediateInputs,
    memo,
  );
}

function fingerprintOf(s: Setting, memo: KeyMemo | null): string {
  return settingsFingerprint(s.def, s.p, variantsOf(s.p).readOptions, memo);
}

describe("WP2 D3 the properties of the keys", () => {
  test.each<Part>([
    "analysis",
    "keyVersion",
    "popneiVersion",
    "fileId",
    "readOptions",
    "ploidy",
    "onlyPassed",
    "filters",
    "filterOrder",
    "individualFilters",
    "inputs",
  ])("a change of %s changes the key", (part) => {
    fc.assert(
      fc.property(setting, others, (s, other) => {
        const change = changeOf(part, s, other);
        fc.pre(change !== null);
        const [before, after] = change;
        const memo = createKeyMemo();
        expect(keyWith(after, memo)).not.toBe(keyWith(before, memo));
      }),
    );
  });

  test("a change of the name, the size or the read of the variants file keeps the key", () => {
    fc.assert(
      fc.property(setting, variantSource, (s, source) => {
        const variants = variantsOf(s.p);
        const renamed: Setting = {
          ...s,
          p: {
            ...s.p,
            variants: {
              ...variants,
              name: source.name,
              size: source.size,
              read: source.read,
            },
          },
        };
        const memo = createKeyMemo();
        expect(keyWith(renamed, memo)).toBe(keyWith(s, memo));
      }),
    );
  });

  test("the fingerprint keeps with the load id, the key version, the version of popnei and no variants file", () => {
    fc.assert(
      fc.property(setting, others, (s, other) => {
        const expected = fingerprintOf(s, null);
        for (const part of ["fileId", "keyVersion", "popneiVersion"] as const) {
          const change = changeOf(part, s, other);
          if (change !== null) {
            expect(fingerprintOf(change[1], createKeyMemo())).toBe(expected);
          }
        }
        const readOptions = variantsOf(s.p).readOptions;
        expect(
          settingsFingerprint(
            s.def,
            { ...s.p, variants: null },
            readOptions,
            null,
          ),
        ).toBe(expected);
      }),
    );
  });

  test.each<Part>([
    "filters",
    "filterOrder",
    "individualFilters",
    "readOptions",
    "ploidy",
    "onlyPassed",
    "inputs",
  ])("a change of %s changes the fingerprint", (part) => {
    fc.assert(
      fc.property(setting, others, (s, other) => {
        const change = changeOf(part, s, other);
        fc.pre(change !== null);
        const [before, after] = change;
        const memo = createKeyMemo();
        expect(fingerprintOf(after, memo)).not.toBe(
          fingerprintOf(before, memo),
        );
        expect(fingerprintOf(before, null)).toBe(fingerprintOf(before, memo));
      }),
    );
  });

  test.each<Part>([
    "name",
    "intermediateInputs",
    "fileId",
    "readOptions",
    "ploidy",
    "onlyPassed",
    "filters",
    "filterOrder",
    "individualFilters",
    "popneiVersion",
  ])("a change of %s changes the key of an intermediate result", (part) => {
    fc.assert(
      fc.property(setting, others, (s, other) => {
        const change = changeOf(part, s, other);
        fc.pre(change !== null);
        const [before, after] = change;
        const memo = createKeyMemo();
        expect(intermediateKeyWith(after, memo)).not.toBe(
          intermediateKeyWith(before, memo),
        );
      }),
    );
  });

  test("the key of an intermediate result keeps with the analysis, its key version and its inputs, and is never the key", () => {
    fc.assert(
      fc.property(setting, others, (s, other) => {
        const memo = createKeyMemo();
        const expected = intermediateKeyWith(s, memo);
        for (const part of ["analysis", "keyVersion", "inputs"] as const) {
          const change = changeOf(part, s, other);
          if (change !== null) {
            expect(intermediateKeyWith(change[1], memo)).toBe(expected);
          }
        }
        expect(expected).not.toBe(keyWith(s, memo));
      }),
    );
  });
});
