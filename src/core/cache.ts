/**
 * The cache of the results of the analyses under their keys, on the page
 * (docs/specs/core/cache.md). It is bounded in bytes, the memory of the
 * arrays of numbers of its results, and drops first the result used
 * longest ago, but never one the screen shows nor the one just put. It is
 * a plain value: `put` and `use` give a new cache, holding the same
 * results, and leave the one they were given as it was.
 */

import type { Key } from "./keys.ts";

/** The results kept, their total size and the order of their use. */
export interface Cache<V> {
  /** Each result under its key, with its size and its last use. */
  readonly entries: ReadonlyMap<Key, CacheEntry<V>>;
  /** The sum of the `bytes` of the entries. */
  readonly totalBytes: number;
  /** The bound in bytes that a put drops results to keep under. */
  readonly maxBytes: number;
  /** The last use given out, a counter and not a time; 0 in an empty
      cache. */
  readonly clock: number;
}

/** A result in the cache. */
export interface CacheEntry<V> {
  /** What the store keeps under the key, a result with its warnings. */
  readonly value: V;
  /** Its size, as `resultBytes` gives it. */
  readonly bytes: number;
  /** The number of the counter at its last use; the smallest is dropped
      first. */
  readonly lastUse: number;
}

/** The bound of the cache until stage 2 of the build order measures what
    a tab holds beside the calculation worker: 256 MB (the cache spec,
    Open 1). */
export const CACHE_MAX_BYTES = 256 * 1024 * 1024;

/**
 * A cache with no result, bounded at `maxBytes`, which must be a whole
 * number of at least 0; any other value throws a defect.
 */
export function emptyCache<V>(maxBytes: number): Cache<V> {
  if (!Number.isInteger(maxBytes) || maxBytes < 0) {
    throw new Error(
      `popnei_web defect: the bound of the cache must be a whole number of bytes of at least 0, not ${String(maxBytes)}`,
    );
  }
  return { entries: new Map(), totalBytes: 0, maxBytes, clock: 0 };
}

/**
 * The size of a result in bytes: the block of memory of every typed
 * array, `DataView` and `ArrayBuffer` it holds, each block once however
 * many views show a part of it, and 2 bytes per unit of `length` of each
 * text of a list. It walks the fields of objects, the elements of lists
 * and the values of `Map`s, each object once. Other texts and numbers are
 * not counted.
 */
export function resultBytes(value: unknown): number {
  const blocks = new Set<ArrayBufferLike>();
  const seen = new Set<object>();
  let textBytes = 0;
  const walk = (item: unknown): void => {
    if (typeof item !== "object" || item === null || seen.has(item)) {
      return;
    }
    seen.add(item);
    if (ArrayBuffer.isView(item)) {
      blocks.add(item.buffer);
    } else if (item instanceof ArrayBuffer) {
      blocks.add(item);
    } else if (item instanceof Map) {
      for (const mapValue of item.values()) {
        walk(mapValue);
      }
    } else if (Array.isArray(item)) {
      for (const element of item) {
        if (typeof element === "string") {
          textBytes += 2 * element.length;
        } else {
          walk(element);
        }
      }
    } else {
      for (const field of Object.values(item)) {
        walk(field);
      }
    }
  };
  walk(value);
  let blockBytes = 0;
  for (const block of blocks) {
    blockBytes += block.byteLength;
  }
  return blockBytes + textBytes;
}

/**
 * `value` put under `key` and used now, replacing what was there under
 * that key; then, while the cache is above its bound, the entry used
 * longest ago dropped, but `key` and the keys of `keep`, the results the
 * screen shows. The cache stays above its bound when only those are left.
 */
export function put<V>(
  c: Cache<V>,
  key: Key,
  value: V,
  keep: ReadonlySet<Key>,
): Cache<V> {
  const clock = c.clock + 1;
  const bytes = resultBytes(value);
  const entries = new Map(c.entries);
  const replaced = entries.get(key);
  let totalBytes =
    c.totalBytes - (replaced === undefined ? 0 : replaced.bytes) + bytes;
  entries.set(key, { value, bytes, lastUse: clock });
  if (totalBytes > c.maxBytes) {
    const droppable = [...entries]
      .filter(([k]) => k !== key && !keep.has(k))
      .toSorted(([, a], [, b]) => a.lastUse - b.lastUse);
    for (const [k, entry] of droppable) {
      if (totalBytes <= c.maxBytes) {
        break;
      }
      entries.delete(k);
      totalBytes -= entry.bytes;
    }
  }
  return { entries, totalBytes, maxBytes: c.maxBytes, clock };
}

/**
 * The entries of `keys` that the cache holds, used now, one after the
 * other in the order given, each with the next number of the counter; a
 * key given twice keeps the later number. When the cache holds none of
 * them, `c` is returned.
 */
export function use<V>(c: Cache<V>, keys: readonly Key[]): Cache<V> {
  let entries: Map<Key, CacheEntry<V>> | null = null;
  let clock = c.clock;
  for (const key of keys) {
    const entry = c.entries.get(key);
    if (entry !== undefined) {
      entries ??= new Map(c.entries);
      clock += 1;
      entries.set(key, {
        value: entry.value,
        bytes: entry.bytes,
        lastUse: clock,
      });
    }
  }
  if (entries === null) {
    return c;
  }
  return { entries, totalBytes: c.totalBytes, maxBytes: c.maxBytes, clock };
}

/** The value under `key`, or `null` when the cache does not hold it.
    Reading is not a use: the cache is not changed. */
export function get<V>(c: Cache<V>, key: Key): V | null {
  const entry = c.entries.get(key);
  return entry === undefined ? null : entry.value;
}
