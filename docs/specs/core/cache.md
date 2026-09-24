# The cache of results

Draft, 24 September 2026, not yet approved by the owner. There is no code
yet. The cache keeps the results of the analyses under their keys, on the
page, so that a result asked for again, by an undo, a value set back, or a
step of the application visited again, is shown with no calculation. It is
bounded in bytes, and drops first the result used longest ago
(`docs/architecture.md`, section 3). It depends on
`docs/specs/core/keys.md`, for the keys.

## What it does

A cache with no bound would hold every result of a session, and a session
of GWAS on a large panel makes results of tens of megabytes each, which
would take the memory of the tab. A cache that dropped a result the screen
is showing would take it off the screen with no change of the user's; one
that dropped the result it had just been given would make the store ask
the worker for it again, and again.

- **The size of a result is the memory of its arrays of numbers.** popnei
  gives every list of numbers of a result as a typed array, a
  `Float64Array` or an `Int32Array`, a block of memory of 8 or 4 bytes per
  number (`docs/architecture.md`, section 3). The cache walks the result,
  the fields of its objects, the elements of its lists and the values of
  its `Map`s, which popnei's distances between populations come in
  (`js/popnei/src/pop_dists.ts`), and counts the block of memory of each
  typed array it meets, its `buffer`, once, however many arrays show a
  part of it: several distances can be views of one block, and when a
  worker sends a view to the page, the whole block is copied with it. An
  `ArrayBuffer` and a `DataView` found in a result are counted by their
  block in the same way. The texts of a list of texts are counted at 2
  bytes per character, an estimate: the chromosome of every variant of a
  GWAS, `chrom` of popnei's `GwasStats`, is a million texts for a million
  variants, which a count of the typed arrays alone would miss. The other
  texts and numbers beside them are small and not counted.
- **The bound** is `CACHE_MAX_BYTES`, 256 MB, until the walking skeleton
  measures what a tab can hold beside the calculation worker (**Open 1**,
  below).
- **A result is used when the project on the screen asks for it.** It is
  used when it is put in the cache, and again after every change of the
  project, for every result that the current project gives a key to
  (`docs/specs/core/store.md`). Reading a result is not a use: the screens
  read the cache while React, the library that draws them, draws, and a
  read that changed the cache would change the state of the store in the
  middle of a drawing, which React does not allow
  (`.claude/skills/coding/react.md`). The order of use is a counter of the
  cache that starts at 0, not a time, since core reads no clock.
- **What the screen shows is never dropped, and neither is the result
  just put.** When a put leaves the cache above its bound, it drops the
  result used longest ago among the others that the screen does not show,
  and goes on until the cache is at or below its bound, or until only
  what the screen shows and the result just put are left. Then the cache
  stays above its bound until a later put, after the screen shows less:
  that put drops what the screen no longer shows. A result that arrives
  late, for settings the user has left, is kept this way until the next
  put, and is found by an undo before it (`docs/architecture.md`, section
  5).
- **The cache is a value.** A put or a use gives a new cache and leaves
  the old one as it was, so that the store gives the screens a new state
  when the cache changes and the same state when it does not. The results
  themselves are not copied: the new cache holds the same objects.
- **A result in the cache is never written into.** Nothing in TypeScript
  stops a write into a typed array, so this is a rule of the code: code
  that sorts one sorts a copy (`.claude/skills/coding/SKILL.md`,
  "Numbers").

## The TypeScript interface

`V` is what the store keeps under a key: a result with its warnings
(`docs/specs/core/store.md`).

```ts
export interface Cache<V> {
  readonly entries: ReadonlyMap<Key, CacheEntry<V>>;
  readonly totalBytes: number;
  readonly maxBytes: number;
  readonly clock: number;             // the last use given out; 0 in an empty cache
}

export interface CacheEntry<V> {
  readonly value: V;
  readonly bytes: number;
  readonly lastUse: number;
}

/** The bound of the cache until stage 2 measures it: 256 MB. */
export const CACHE_MAX_BYTES = 256 * 1024 * 1024;

export function emptyCache<V>(maxBytes: number): Cache<V>;
```

The size of a value, as above.

```ts
export function resultBytes(value: unknown): number;
```

A value put under its key and used now; then the values used longest ago
dropped, but that one and those whose key is in `keep`, until the cache is
at or below its bound. A value put under a key that is there already
replaces it.

```ts
export function put<V>(c: Cache<V>, key: Key, value: V, keep: ReadonlySet<Key>): Cache<V>;
```

The values of `keys` that the cache holds, used now, one after the other
in the order given, each with the next number of the counter. When the
cache holds none of them, `use` returns `c`.

```ts
export function use<V>(c: Cache<V>, keys: readonly Key[]): Cache<V>;
```

The value under a key, or `null`; it is not a use.

```ts
export function get<V>(c: Cache<V>, key: Key): V | null;
```

## The cases

- **A result larger than the bound.** It is put, kept while the screen
  shows it, and dropped by the first put after the screen no longer shows
  it. A GWAS of a million variants gives 8 MB for each list of a million
  numbers; the bound holds about thirty such lists.
- **A result dropped, then asked for again** by an undo. Its analysis is
  shown ready, and runs again when the user asks: a dropped result is made
  again, never an error.
- **The same result put twice**, from a request sent again after a
  cancel: the second replaces the first, and the total counts it once.

## How it runs

On the page, in the store. A put copies the table of the entries, a few
hundred at most, which is small beside the result that came with it. The
memory the bound counts is that of the page; the calculation worker
counts its own intermediate results under its own bound, and the memory
of popnei's code in the worker, which grows and is never given back while
the worker lives, is counted by neither (`docs/architecture.md`, section
11).

## How it is verified

With Vitest, at `resultBytes`, `put`, `use` and `get`.

- `resultBytes` of `{ pValues: new Float64Array(1000), idx: new
  Int32Array(10), names: ["ab"] }` is 8000 + 40 + 4 = 8044. Of an object
  that holds the same `Float64Array(1000)` twice, 8000; of two
  `subarray` views of one `Float64Array(1000)`, 8000, the block once; of a
  `Map` whose two values are those views, 8000.
- A worked case with a bound of 100 bytes: put `a` of 40, `b` of 40, then
  `use([a])`, then put `c` of 40, keeping nothing: `b` is dropped, the one
  used longest ago, and the total is 80. Put `d` of 40 keeping `a`: `c` is
  dropped. Put `e` of 200 keeping `a`: `d` is dropped, `e` is not, being
  the one put, and the total is 240, above the bound. Put `f` of 10
  keeping `f` alone: `a` and `e` are dropped, and the total is 10.
- `get` does not change the cache: the cache after it is the same object,
  and the order of the next drop is the same.
- **Properties, with fast-check**, which draws random sequences of puts
  and uses of values of random sizes, and shrinks a failure to the
  smallest one. After each put, the total is the sum of the bytes of the
  entries, and it is at most the bound unless every entry left is kept or
  is the one just put; no kept key and no key just put is dropped; and the
  entry dropped first is always the one with the smallest `lastUse` among
  the others.

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
