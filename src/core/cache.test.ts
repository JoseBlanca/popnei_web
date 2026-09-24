import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import {
  CACHE_MAX_BYTES,
  emptyCache,
  get,
  put,
  resultBytes,
  use,
} from "./cache.ts";
import type { Cache } from "./cache.ts";
import { keyFromWire } from "./keys.ts";
import type { Key } from "./keys.ts";

/** A key of 64 times the hexadecimal digit `digit`. */
function keyOfDigit(digit: string): Key {
  return keyFromWire(digit.repeat(64));
}

const A = keyOfDigit("a");
const B = keyOfDigit("b");
const C = keyOfDigit("c");
const D = keyOfDigit("d");
const E = keyOfDigit("e");
const F = keyOfDigit("f");

/** A result of `bytes` bytes, a block of one byte per number. */
function resultOf(bytes: number): Uint8Array {
  return new Uint8Array(bytes);
}

/** The keys of a cache, sorted, to compare with a literal list. */
function keysOf(c: Cache<unknown>): readonly Key[] {
  return [...c.entries.keys()].toSorted((x, y) => (x < y ? -1 : 1));
}

/** What a cache holds, as plain data, to see that nothing changed it. */
function snapshot(c: Cache<unknown>): unknown {
  return {
    entries: [...c.entries].map(([k, e]) => [k, e.value, e.bytes, e.lastUse]),
    totalBytes: c.totalBytes,
    maxBytes: c.maxBytes,
    clock: c.clock,
  };
}

/** One step of a drawn sequence: a put of a result of `bytes` under the
    key of index `key`, keeping those of `keep`, or a use of `keys`. */
type Step =
  | {
      readonly kind: "put";
      readonly key: number;
      readonly bytes: number;
      readonly keep: readonly number[];
    }
  | { readonly kind: "use"; readonly keys: readonly number[] };

/** The keys of the drawn sequences, few, so that they meet again. */
const KEY_POOL: readonly Key[] = ["0", "1", "2", "3", "4", "5"].map(keyOfDigit);

function poolKey(index: number): Key {
  const key = KEY_POOL[index];
  if (key === undefined) {
    throw new Error(`popnei_web defect: no key ${String(index)} in the pool`);
  }
  return key;
}

const keyIndex = fc.integer({ min: 0, max: KEY_POOL.length - 1 });

const step: fc.Arbitrary<Step> = fc.oneof(
  fc.record({
    kind: fc.constant("put" as const),
    key: keyIndex,
    bytes: fc.integer({ min: 0, max: 80 }),
    keep: fc.uniqueArray(keyIndex, { maxLength: 3 }),
  }),
  fc.record({
    kind: fc.constant("use" as const),
    keys: fc.array(keyIndex, { maxLength: 4 }),
  }),
);

/** A bound of the drawn caches, and the sequences of steps. */
const BOUND = 100;
const steps = fc.array(step, { maxLength: 40 });

/**
 * Runs `sequence` from an empty cache bounded at `BOUND`, and calls
 * `check` after each put with the cache before, the cache after and the
 * step.
 */
function runSteps(
  sequence: readonly Step[],
  check: (
    before: Cache<Uint8Array>,
    after: Cache<Uint8Array>,
    key: Key,
    keep: ReadonlySet<Key>,
  ) => void,
): void {
  let c = emptyCache<Uint8Array>(BOUND);
  for (const s of sequence) {
    switch (s.kind) {
      case "put": {
        const key = poolKey(s.key);
        const keep = new Set(s.keep.map(poolKey));
        const next = put(c, key, resultOf(s.bytes), keep);
        check(c, next, key, keep);
        c = next;
        break;
      }
      case "use":
        c = use(c, s.keys.map(poolKey));
        break;
    }
  }
}

describe("WP3 D2 the cache", () => {
  test("the bound of the application is 256 MB", () => {
    expect(CACHE_MAX_BYTES).toBe(268_435_456);
  });

  test("a bound below 0, not whole or NaN is a defect", () => {
    for (const bound of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => emptyCache(bound)).toThrow(/^popnei_web defect:/);
    }
    expect(emptyCache(0).maxBytes).toBe(0);
  });

  test("an empty cache holds nothing, and its counter is 0", () => {
    const c = emptyCache(BOUND);
    expect(c.entries.size).toBe(0);
    expect(c.totalBytes).toBe(0);
    expect(c.clock).toBe(0);
  });

  describe("the size of a result", () => {
    test("counts 8 bytes a float, 4 an integer and 2 a character of a list of texts", () => {
      expect(
        resultBytes({
          pValues: new Float64Array(1000),
          idx: new Int32Array(10),
          names: ["ab"],
        }),
      ).toBe(8044);
    });

    test("counts an array held twice once", () => {
      const pValues = new Float64Array(1000);
      expect(resultBytes({ first: pValues, second: pValues })).toBe(8000);
    });

    test("counts the block of two views of it once", () => {
      const block = new Float64Array(1000);
      expect(
        resultBytes({
          low: block.subarray(0, 10),
          high: block.subarray(990, 1000),
        }),
      ).toBe(8000);
    });

    test("counts the block of two views that are the values of a Map once", () => {
      const block = new Float64Array(1000);
      const dists = new Map([
        ["fst", block.subarray(0, 10)],
        ["nei", block.subarray(10, 20)],
      ]);
      expect(resultBytes(dists)).toBe(8000);
    });

    test("counts an ArrayBuffer by its block, once with a view of it", () => {
      const block = new ArrayBuffer(24);
      expect(resultBytes({ block })).toBe(24);
      expect(resultBytes({ block, view: new Int32Array(block, 4, 2) })).toBe(
        24,
      );
    });

    test("counts a DataView by its whole block", () => {
      const view = new DataView(new ArrayBuffer(100), 10, 20);
      expect(resultBytes({ view })).toBe(100);
    });

    test("counts neither a key of a Map nor an element of a Set", () => {
      expect(resultBytes(new Map([[new Float64Array(2), 1]]))).toBe(0);
      expect(resultBytes(new Set([new Float64Array(2)]))).toBe(0);
    });

    test("counts neither a text outside a list nor a number, and ends on a cycle", () => {
      const cyclic: { self: unknown; label: string; count: number } = {
        self: null,
        label: "a long text of no list",
        count: 7,
      };
      cyclic.self = cyclic;
      expect(resultBytes(cyclic)).toBe(0);
      expect(resultBytes([["abc"], [new Int8Array(3)]])).toBe(9);
    });
  });

  test("with a bound of 100 bytes, a put drops the result used longest ago, but those kept and the one put", () => {
    const empty = emptyCache<Uint8Array>(100);
    const withA = put(empty, A, resultOf(40), new Set());
    const withB = put(withA, B, resultOf(40), new Set());
    const aUsed = use(withB, [A]);
    const aBefore = snapshot(aUsed);

    const withC = put(aUsed, C, resultOf(40), new Set());
    expect(keysOf(withC)).toEqual([A, C]);
    expect(withC.totalBytes).toBe(80);
    expect(snapshot(aUsed)).toEqual(aBefore);

    const withD = put(withC, D, resultOf(40), new Set([A]));
    expect(keysOf(withD)).toEqual([A, D]);
    expect(withD.totalBytes).toBe(80);

    const withE = put(withD, E, resultOf(200), new Set([A]));
    expect(keysOf(withE)).toEqual([A, E]);
    expect(withE.totalBytes).toBe(240);

    const withF = put(withE, F, resultOf(10), new Set([F]));
    expect(keysOf(withF)).toEqual([F]);
    expect(withF.totalBytes).toBe(10);
  });

  test("a put that leaves the cache exactly at its bound drops nothing more", () => {
    const atBound = put(
      put(emptyCache<Uint8Array>(100), A, resultOf(60), new Set()),
      B,
      resultOf(40),
      new Set(),
    );
    expect(keysOf(atBound)).toEqual([A, B]);
    expect(atBound.totalBytes).toBe(100);

    const backAtBound = put(atBound, C, resultOf(60), new Set());
    expect(keysOf(backAtBound)).toEqual([B, C]);
    expect(backAtBound.totalBytes).toBe(100);
  });

  test("get gives the value under a key, or null, and is not a use", () => {
    const first = resultOf(40);
    const second = resultOf(40);
    const c = put(
      put(emptyCache<Uint8Array>(100), A, first, new Set()),
      B,
      second,
      new Set(),
    );
    const before = snapshot(c);

    expect(get(c, A)).toBe(first);
    expect(get(c, B)).toBe(second);
    expect(get(c, C)).toBeNull();

    expect(snapshot(c)).toEqual(before);
    const withC = put(c, C, resultOf(40), new Set());
    expect(keysOf(withC)).toEqual([B, C]);
  });

  test("the same result put twice is held once, the second in place of the first", () => {
    const first = resultOf(40);
    const second = resultOf(40);
    const once = put(emptyCache<Uint8Array>(100), A, first, new Set());
    const twice = put(once, A, second, new Set());

    expect(twice.entries.size).toBe(1);
    expect(twice.totalBytes).toBe(40);
    expect(get(twice, A)).toBe(second);
    expect(twice.entries.get(A)?.lastUse).toBe(2);
    expect(get(once, A)).toBe(first);
  });

  test("a use of keys the cache does not hold returns the cache it was given", () => {
    const c = put(emptyCache<Uint8Array>(100), A, resultOf(40), new Set());
    expect(use(c, [B, C])).toBe(c);
    expect(use(c, [])).toBe(c);
  });

  test("a use numbers the keys in the order given, a key given twice keeping the later number", () => {
    let c = emptyCache<Uint8Array>(100);
    c = put(c, A, resultOf(30), new Set());
    c = put(c, B, resultOf(30), new Set());
    c = put(c, C, resultOf(30), new Set());
    const before = snapshot(c);
    const used = use(c, [B, D, A, A]);

    expect(used.clock).toBe(6);
    expect(used.entries.get(B)?.lastUse).toBe(4);
    expect(used.entries.get(A)?.lastUse).toBe(6);
    expect(used.entries.get(C)?.lastUse).toBe(3);
    expect(used.totalBytes).toBe(90);
    expect(get(used, A)).toBe(get(c, A));
    expect(snapshot(c)).toEqual(before);

    const withD = put(used, D, resultOf(30), new Set());
    expect(keysOf(withD)).toEqual([A, B, D]);
    const withE = put(withD, E, resultOf(30), new Set());
    expect(keysOf(withE)).toEqual([A, D, E]);
  });

  test("property: after a put the total is the sum of the entries, at most the bound unless only the kept and the one put are left", () => {
    fc.assert(
      fc.property(steps, (sequence) => {
        runSteps(sequence, (_before, after, key, keep) => {
          let sum = 0;
          for (const entry of after.entries.values()) {
            sum += entry.bytes;
          }
          expect(after.totalBytes).toBe(sum);
          if (after.totalBytes > after.maxBytes) {
            for (const k of after.entries.keys()) {
              expect(k === key || keep.has(k)).toBe(true);
            }
          }
        });
      }),
    );
  });

  test("property: a put drops no kept key and not the key it puts", () => {
    fc.assert(
      fc.property(steps, (sequence) => {
        runSteps(sequence, (before, after, key, keep) => {
          expect(after.entries.has(key)).toBe(true);
          for (const k of keep) {
            if (before.entries.has(k)) {
              expect(after.entries.has(k)).toBe(true);
            }
          }
        });
      }),
    );
  });

  test("property: a put drops the others in the order of their last use, and no more than it has to", () => {
    fc.assert(
      fc.property(steps, (sequence) => {
        runSteps(sequence, (before, after, key, keep) => {
          const others = [...before.entries]
            .filter(([k]) => k !== key && !keep.has(k))
            .toSorted(([, x], [, y]) => x.lastUse - y.lastUse);
          const dropped = others.filter(([k]) => !after.entries.has(k));
          expect(dropped).toEqual(others.slice(0, dropped.length));
          const lastDropped = dropped.at(-1);
          if (lastDropped !== undefined) {
            expect(after.totalBytes + lastDropped[1].bytes).toBeGreaterThan(
              after.maxBytes,
            );
          }
          if (dropped.length < others.length) {
            expect(after.totalBytes).toBeLessThanOrEqual(after.maxBytes);
          }
        });
      }),
    );
  });
});
