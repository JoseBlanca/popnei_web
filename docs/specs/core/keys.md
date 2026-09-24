# The keys of the results

Draft, 24 September 2026, not yet approved by the owner. There is no code
yet. A key is the name a result is stored under in the cache: a SHA-256
hash of everything the result was calculated from, so that a result whose
inputs changed is never shown, and a result whose inputs came back, by an
undo or by a value set back, is found again with no calculation
(`docs/architecture.md`, section 3). This spec gives the canonical form of
those inputs, the hash, the key of an analysis and the fingerprint of its
settings that an opened project file keeps. It develops the row of
`keys.ts` in section 9 of `docs/architecture.md`, with its sections 3, 11
and 12 and the section "Keys" of `.claude/skills/coding/SKILL.md`. It
depends on `docs/specs/core/project.md`, for the project, and on
`docs/specs/core/store.md`, for the definition of an analysis.

## What it does

A key that left out an input would show a result for settings the user
did not choose, and the user could not tell: this is the mistake the
applications are least allowed to make. A key that held something that
changes between two runs of the same inputs, the time or a reference
between objects, would never find a result again, and undo would bring
nothing back.

The key of an analysis is made from these parts, in the one function
`keyOf`, so that no analysis can forget the parts every analysis depends
on:

| part | what it holds | where it comes from |
|---|---|---|
| `analysis` | the id of the analysis | its module |
| `keyVersion` | a number raised when what the result means changes for the same inputs | its module |
| `popneiVersion` | the version of popnei, from the calculation worker's `ready` | the store |
| `load` | the load id of the variants file and its read options | `project.variants` |
| `filters`, `individualFilters` | the filters, in their order, with their parameters | the project |
| `inputs` | what else the analysis depends on: the columns of the individuals table and the grouping it uses, its options | its `keyInputs` |

The first five are the same for every analysis, since every analysis
reads the genotypes of the load through all the filters
(`docs/functionality.md`, section 3); only the last is the analysis's to
choose. `keyInputs` returns every part it depends on, and when in doubt
it includes one: a part too many costs a calculation, a part missing
shows a stale result (`.claude/skills/coding/SKILL.md`, "Keys").

### The canonical form

The inputs are written as one text, the canonical form, which is the same
for two equal values whatever order their fields were set in:

- an object is written with its fields sorted by their names, compared
  with `<`, which compares the code units of the text and does not depend
  on the language of the browser, as `localeCompare` would;
- an array is written in its order, which the spec of the analysis sorts
  in `keyInputs` only where the order does not matter;
- a string, a number, `true`, `false` and `null` are written as
  `JSON.stringify` writes them, with no space. `JSON.stringify` gives the
  shortest text that reads back as the same number, the same in every
  browser, since the ECMAScript standard fixes it; it writes −0 as `0`,
  which is the same threshold; and it writes a lone surrogate of a broken
  text as the escape `\ud800`, so the text that is hashed is always valid
  Unicode.

Anything that is not a JSON value throws a defect, `popnei_web defect:`
with the path of the value: `undefined`, `NaN`, an infinity, a function, a
`Map`, a `Set`, a typed array, a `Date`, an object of a class, a `File`.
`JSON.stringify` would write `NaN` as `null` and a `Map` as `{}`, so a
threshold of `NaN` and one of `null`, or two different maps, would share a
key. An object is plain when its prototype is `Object.prototype` or
`null`.

### The hash

The key is the SHA-256 of the canonical form, encoded as UTF-8, written as
64 lower case hexadecimal digits. It is a function of ours in TypeScript,
synchronous, of about a hundred lines, tested on the test vectors that
NIST publishes, as the owner decided on 24 September 2026. The options not
taken: `crypto.subtle.digest`, the hash the browser gives, which returns a
promise, where core is synchronous (`.claude/skills/coding/SKILL.md`, "The
core"); and the library `@noble/hashes`, a dependency that
`docs/technology.md` does not name. A hash of 256 bits makes two inputs
with one key a case that need not be considered, which a hash of 32 or 64
bits would not.

Core is type checked with no library of the browser and no types of node
(`tsconfig.core.json`), so `TextEncoder` is not there to encode the text:
the UTF-8 encoding is ours too, a few lines, since the canonical form
holds no lone surrogate.

The canonical form is hashed rather than used as the key itself because
the individuals table goes into the key of every analysis that uses the
populations, and a key of the text of a table of 10,000 rows would be as
long as the table, held once per result in the cache and sent with every
request.

### The fingerprint of the settings

An opened project file keeps, for each analysis, the fingerprint of its
settings as the file had them (`docs/specs/core/project.md`, "The project
of an opened project file"). The fingerprint is made as the key is, from
the same parts but two: the version of popnei, and the load id of the
variants file, of which only the read options are kept. So it names the
settings the user chose and nothing of the file or of the version, and
two projects with the same settings have the same fingerprint whatever
file was loaded in each and whichever version of popnei ran. It is made
with the same canonical form and the same hash, but from another object,
so a fingerprint and a key never coincide.

## The TypeScript interface

A JSON value, which every part of a key and of the project is.

```ts
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | JsonObject;
export interface JsonObject { readonly [field: string]: JsonValue }
```

A key: a string that only this module makes, so that a name of an
individual cannot be passed where a key goes
(`.claude/skills/coding/typescript.md`, "Branded types").

```ts
export type Key = string & { readonly __brand: "Key" };
```

The canonical form, and its hash.

```ts
/** The canonical text of a JSON value; throws a defect on anything else. */
export function canonical(value: unknown): string;

/** The SHA-256 of a text encoded as UTF-8, as 64 lower case hexadecimal digits. */
export function sha256Hex(text: string): string;
```

The key of an analysis for a project, and the fingerprint of its
settings. `def` is the definition of the analysis
(`docs/specs/core/store.md`), of which these use `id`, `keyVersion` and
`keyInputs`. `keyOf` throws a defect when the project has no variants
file, since the store asks for a key only of an analysis whose `needs`
found nothing missing.

```ts
export function keyOf(
  def: Pick<AnalysisDef<unknown, unknown>, "id" | "keyVersion" | "keyInputs">,
  p: Project,
  popneiVersion: string,
): Key;

export function settingsFingerprint(
  def: Pick<AnalysisDef<unknown, unknown>, "id" | "keyVersion" | "keyInputs">,
  p: Project,
  readOptions: VariantSource["readOptions"],
): string;
```

`settingsFingerprint` takes the read options apart because, when a
project file is opened, the project has no variants file yet: it is
called with the read options of the reference's source then, and with
those of the current source when the settings now are compared with them.

A key that comes back from a worker with its result, a `string` on the
wire, enters the cache through `keyFromWire`, the other place a `Key` is
made. A text that is not 64 lower case hexadecimal digits throws a
defect: both sides are our code.

```ts
export function keyFromWire(text: string): Key;
```

## The cases

- **The individuals file named by its contents, the variants file by its
  load.** The table goes into `inputs` as cells, and the variants file as
  the load id, so loading the same individuals file again finds the
  results of the first load, and loading the same variants file again
  finds none (`docs/architecture.md`, sections 3 and 6).
- **No version of popnei yet.** The calculation worker gives it in its
  `ready`, some time after the page opens. The store makes no key before
  it, and every analysis that could run is shown as waiting, the state
  `empty` of `docs/specs/core/store.md`.
- **A `keyInputs` that returns a new object each time.** It is expected:
  the key is made from the values, and a new object of the same values
  gives the same key.

## How it runs

On the page, after every change of the store: one key for each analysis
of the application whose `needs` is null. The table of the individuals
file, 10,000 rows in the largest dataset (`.claude/skills/coding/react.md`,
"Performance"), is in the key of every analysis that uses the populations,
so each command would write its canonical form and hash it once per such
analysis. Since the project is immutable, the canonical text of an object
is kept in a `WeakMap` from the object to its text, and written again
only for an object that is new; so a command that changes a threshold
writes no table. The hash of the whole text is made each time. How long a
key takes with a table of 10,000 rows has not been measured; the walking
skeleton measures it (`docs/architecture.md`, section 11), and if it is
long enough to delay the page, the next step is to hash each large part
once and put its hash in the canonical form in its place.

## How it is verified

With Vitest, at `sha256Hex`, `canonical`, `keyOf` and
`settingsFingerprint`.

- **`sha256Hex` on the test vectors of NIST**, FIPS 180-4 and its
  examples, as literals:

  | text | SHA-256 |
  |---|---|
  | the empty text | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
  | `abc` | `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` |
  | `abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq` | `248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1` |
  | `a` one million times | `cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0` |

  and the texts of 55, 56, 63 and 64 bytes, where the padding of
  SHA-256 changes from one block to two, against node's `crypto`
  computed in the test itself, which Vitest runs in node.
- **`canonical`**: `{ b: 0.1, a: [true, null, "é"] }` gives
  `{"a":[true,null,"é"],"b":0.1}`, 30 bytes in UTF-8, whose SHA-256 is
  `028eee05401b6428f0941fd2694cc6950836d008b50bb5ee2f4d2c559a0ccca8`
  (node's `crypto.createHash("sha256")`, 24 September 2026); −0 gives
  `0`; `"\ud800"` gives `"\ud800"` written as an escape; and a defect for
  each value that is not JSON, with its path.
- **`keyOf`, a literal.** A fake analysis `diversity`, key version 1,
  whose `keyInputs` gives `{ pops: [["P1", ["i1", "i2"]]] }`, on a
  project with the `.nei` load `00112233445566778899aabbccddeeff` and the
  filter `missing_data` 0.1, with popnei `0.1.0`: the canonical form is

  ```
  {"analysis":"diversity","filters":[{"kind":"missing_data","maxAllowedMissingRate":0.1}],"individualFilters":[],"inputs":{"pops":[["P1",["i1","i2"]]]},"keyVersion":1,"load":{"fileId":"00112233445566778899aabbccddeeff","readOptions":null},"popneiVersion":"0.1.0"}
  ```

  and the key `f83b2cf03da1de50384cf8531ff810a6b95b71c667b4f784d35491d6e79cc85a`.
  Its fingerprint is the hash of

  ```
  {"analysis":"diversity","filters":[{"kind":"missing_data","maxAllowedMissingRate":0.1}],"individualFilters":[],"inputs":{"pops":[["P1",["i1","i2"]]]},"keyVersion":1,"readOptions":null}
  ```

  `bb78acd4e26d9dc4cc72b7db2927a249fd6eed40c785baa6ff2b1ec4c73a0be3`.
  Both computed with node's `crypto` on 24 September 2026. This literal
  pins the canonical form: a change to it fails the test and is then a
  decision. It breaks nothing a user keeps, since no key and no
  fingerprint is saved in a file (`docs/architecture.md`, section 12).
- **Properties, with fast-check.** For any JSON value, the canonical form
  of the value with the fields of every object in another order is the
  same, and `JSON.parse` of it is deeply equal to the value. For any two
  projects that differ in one part of the table above, the keys differ;
  for two that differ in a part that the table does not hold, the name of
  the variants file or its read, the keys are the same. For any project,
  the fingerprint does not change when the load id or the version of
  popnei does, and changes when the filters, the read options or the
  inputs do.
- **Every analysis has its table of what changes its key**, in its own
  spec, as `.claude/skills/coding/SKILL.md` asks.

## Open points

None. The time a key takes with a large table is measured in stage 2, as
section 11 of `docs/architecture.md` already says.

## Not in this spec

- What each analysis puts in `inputs`: the spec of the analysis.
- The keys of the intermediate results of the calculation worker, which
  the page makes as it makes these and sends inside the job
  (`.claude/skills/coding/worker.md`): the spec of the workers, stage 2.
