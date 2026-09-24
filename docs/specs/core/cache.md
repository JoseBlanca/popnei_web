# The cache of results

Draft, 24 September 2026, not yet approved by the owner. There is no code
yet. The cache keeps the results of the analyses under their keys, on the
page, so that a result asked for again, by an undo, a value set back, or
a step of the application visited again, is shown with no calculation.
It is bounded in bytes, and drops first the result used longest ago
(`docs/architecture.md`, section 3). This spec develops the row of
`cache.ts` in section 9 of `docs/architecture.md`. It depends on
`docs/specs/core/keys.md`, for the keys.

## What it does

A cache with no bound would hold every result of a session, and a session
of GWAS on a large panel makes results of tens of megabytes each, which
would take the memory of the tab. A cache that dropped a result the
screen is showing would take it off the screen with no change of the
user's; one that dropped the result just made, before the screen read
it, would ask the worker for it again, forever.

- **The size of a result is the sum of the `byteLength` of its typed
  arrays**, the `Float64Array`, `Int32Array` and others that popnei gives
  every array of a result in; the strings and numbers beside them are
  small and not counted (`docs/architecture.md`, section 3). The cache
  walks the result, its fields and the elements of its arrays, to find
  them, and a typed array reached twice is counted once.
- **The bound** is `CACHE_MAX_BYTES`, 256 MB, until the walking skeleton
  measures what a tab can hold beside the calculation worker (**Open 1**,
  below).
- **"Used" means asked for by the project on screen.** A result is used
  when it is put in the cache, and again after every change of the store
  for every result that the current project gives a key to
  (`docs/specs/core/store.md`). Reading a result does not count as a use:
  the screens read the cache while they draw, and a read that changed the
  cache would change the state of the store in the middle of a drawing,
  which React does not allow (`.claude/skills/coding/react.md`). The order
  of use is a counter of the cache, not a time, since core reads no clock.
- **What the screen shows is never dropped.** When the cache is above its
  bound, it drops the result used longest ago among those whose key is
  not in the set it is told to keep, the keys of the current project, and
  stops when it is at or below the bound, or when only kept results are
  left. So the cache can be above its bound while the screen shows more
  than the bound holds, and comes back under it at the first change after
  which it shows less.
- **The cache is a value.** A put or a use gives a new cache, and the old
  one is unchanged, so that the store can give the screens a new state
  when the cache changes and the same state when it does not
  (`.claude/skills/coding/react.md`, "The store"). The results themselves
  are not copied: the new cache holds the same objects.
- **A result in the cache is never written into.** `readonly` does not
  reach the elements of a typed array, so this is a rule of the code:
  code that sorts one sorts a copy (`.claude/skills/coding/SKILL.md`,
  "Numbers").

## The TypeScript interface

```ts
export interface Cache<R> {
  readonly entries: ReadonlyMap<Key, CacheEntry<R>>;
  readonly totalBytes: number;
  readonly maxBytes: number;
  readonly clock: number;             // the last use given out
}

export interface CacheEntry<R> {
  readonly result: R;
  readonly bytes: number;
  readonly lastUse: number;
}

/** The bound of the cache, until stage 2 measures it: 256 MB. */
export const CACHE_MAX_BYTES = 256 * 1024 * 1024;

export function emptyCache<R>(maxBytes: number): Cache<R>;
```

The size of a result, the bytes of the typed arrays it holds.

```ts
export function resultBytes(result: unknown): number;
```

A result put under its key, used now; then the results used longest ago
dropped, but those whose key is in `keep`, until the cache is at or below
its bound. A result put under a key that is there already replaces it.

```ts
export function put<R>(c: Cache<R>, key: Key, result: R, keep: ReadonlySet<Key>): Cache<R>;
```

The results of `keys` that the cache holds, used now, in the order given.
A key it does not hold is passed over. When every key given is already
the last used, in that order, `use` returns `c`.

```ts
export function use<R>(c: Cache<R>, keys: readonly Key[]): Cache<R>;
```

The result under a key, or `null`; it does not count as a use.

```ts
export function get<R>(c: Cache<R>, key: Key): R | null;
```

## The cases

- **A result larger than the bound.** It is put, kept while the screen
  shows it, and dropped at the first put after the screen no longer shows
  it. A GWAS of a million variants gives about 8 MB for each array of a
  million numbers; the bound holds about thirty such arrays.
- **A result dropped, then asked for again** by an undo. Its analysis is
  shown ready, and runs again when the user asks: a dropped result is made
  again, never an error.
- **The same result put twice**, from a request sent again after a cancel:
  the second replaces the first, and the total counts it once.

## How it runs

On the page, in the store. A put copies the map of the entries, a few
hundred at most, which is small beside the result that came with it. The
memory the bound counts is that of the page; the calculation worker
counts its own intermediate results under its own bound, and the memory
of wasm, which grows and never shrinks, is counted by neither
(`docs/architecture.md`, section 11).

## How it is verified

With Vitest, at `resultBytes`, `put`, `use` and `get`.

- `resultBytes` of `{ pValues: new Float64Array(1000), idx: new
  Int32Array(10), names: ["a"] }` is 8040; of an object that holds the
  same `Float64Array(1000)` twice, 8000.
- A worked case with a bound of 100 bytes: put `a` of 40, `b` of 40, then
  `use([a])`, then put `c` of 40 with nothing kept: `b` is dropped, the
  one used longest ago, and the total is 80. Put `d` of 40 keeping `a`:
  `c` is dropped. Put `e` of 200 keeping `a` and `e`: `d` is dropped, and
  the total is 240, above the bound, with only kept results left.
- `get` does not change the cache: the cache after it is the same object,
  and the order of the next drop is the same.
- **Properties, with fast-check**, over sequences of puts and uses of
  results of random sizes. After each put the total is the sum of the
  bytes of the entries, and it is at most the bound unless every entry
  left is in the set kept; no kept key is ever dropped; and the entry
  dropped first is always the one with the smallest `lastUse` among those
  not kept.

## Open points

1. **The bound of the cache.** 256 MB is a guess at what a tab can hold on
   the page beside a calculation worker that holds the variants file,
   about twice its size while it opens with popnei 0.1.0
   (`docs/architecture.md`, section 6). The walking skeleton measures the
   memory of the tab, and the owner sets the bound from it
   (`docs/build-order.md`, stage 2). Meanwhile, 256 MB.

## Not in this spec

- When the store puts and uses results, and which keys it keeps:
  `docs/specs/core/store.md`.
- The cache of intermediate results in the calculation worker:
  `.claude/skills/coding/worker.md`, and the spec of the workers.
