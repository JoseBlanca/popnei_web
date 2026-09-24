# The keys of the results

24 September 2026, approved by the owner on 24 September 2026. There is no code
yet. A key is the name a result is stored under in the cache: a SHA-256
hash of everything the result was calculated from, so that a result whose
inputs changed is never shown, and a result whose inputs came back, by an
undo or by a value set back, is found again with no calculation
(`docs/architecture.md`, section 3). This spec gives the canonical form of
those inputs, the hash, the key of an analysis and of an intermediate
result of the calculation worker, and the fingerprint of the settings
that an opened project file keeps. It develops sections 3, 11 and 12 of
`docs/architecture.md` and the section "Keys" of
`.claude/skills/coding/SKILL.md`, and depends on
`docs/specs/core/project.md` and on `docs/specs/core/store.md`, for the
definition of an analysis. The load id it names is the random name the
page gives each pick of a file, new at every pick
(`docs/architecture.md`, section 3). Stage 2 of `docs/build-order.md` is
the walking skeleton, the smallest application that goes through every
part once, the first where the time of a key is measured.

## What it does

A key that left out an input would show a result for settings the user
did not choose, and the user could not tell: this is the mistake the
applications are least allowed to make. A key that held something that
changes between two runs of the same inputs, the time, or which object in
memory held a value, would never find a result again, and undo would
bring nothing back.

The key of an analysis is made of these parts, in the one function
`keyOf`, so that no analysis can forget the parts that most of them
depend on:

| part | what it holds | where it comes from |
|---|---|---|
| `analysis` | the id of the analysis | its definition |
| `keyVersion` | a number its module raises when what the result means changes for the same inputs | its definition |
| `popneiVersion` | the version of popnei, from the calculation worker when it starts | the store |
| `load` | the load id of the variants file, new at every pick, and its read options | the project |
| `filters`, `individualFilters` | the filters the analysis reads, in their order, with their parameters | the project, and the definition's `filtersRead` |
| `inputs` | what else the analysis depends on: the columns of the individuals table and the grouping it uses, its options | its `keyInputs` |

Every analysis of sections 5 to 8 of `docs/functionality.md` reads all the
filters. The checks per variant and per individual of its section 3,
whose histograms the user reads to choose the thresholds, do not read the
filters those thresholds set: a key that held them would take the
histogram off the screen at every move of the threshold it serves to
choose. So the definition of an analysis says which of the two lists of
filters it reads (`docs/specs/core/store.md`), and `keyOf` puts in the key
only those, as an empty list for one it does not read.

`keyInputs` gives everything else the result depends on, and when in
doubt it includes a part: a part too many costs a calculation, a part
missing shows a stale result (`.claude/skills/coding/SKILL.md`, "Keys").
It does not read `p.variants`, which `keyOf` puts in itself, and it gives
a value for every project, a locked one included, since the store asks
for it before it knows whether the analysis can run, and the fingerprint
of an opened project is made with no variants file loaded.

### The canonical form

The inputs are written as one text, the canonical form, which is the same
for two equal values whatever order their fields were set in:

- an object is written with its fields sorted by their names, compared
  character by character by the numbers of the characters, with `<`,
  which does not depend on the language of the browser as an alphabetical
  comparison does;
- a list is written in its order; `keyInputs` sorts one only where the
  spec of its analysis says the order does not matter;
- a text, a number, `true`, `false` and `null` are written as
  `JSON.stringify` writes them, with no space. `JSON.stringify` gives the
  shortest text that reads back as the same number, the same in every
  browser, since the ECMAScript standard fixes it; it writes −0 as `0`,
  the same threshold; and it writes a broken character of a text, half of
  a pair that encodes one character, as the escape `\ud800`, so the text
  that is hashed is always valid Unicode.

The text is written directly, field by field, and not by building a
sorted copy of the object and handing it to `JSON.stringify`: a copy made
by assigning fields would lose a field named `__proto__`, which
JavaScript treats in a special way, and a project file can hold one in the
options of an analysis.

Anything that is not a JSON value throws an `Error` whose message starts
with `popnei_web defect:` and gives the path of the value: `undefined`,
`NaN`, an infinity, a function, a `Map`, a `Set`, an array of numbers of
the kind popnei gives results in, a `Date`, an object of a class, a file.
`JSON.stringify` would write `NaN` as `null` and a `Map` as `{}`, so a
threshold of `NaN` and one of `null`, or two different maps, would share a
key. An object is plain when its prototype is `Object.prototype` or
`null`.

### The hash

The key is the SHA-256 of the canonical form, encoded as UTF-8, written as
64 lower case hexadecimal digits. It is a function of ours in TypeScript,
synchronous, of about a hundred lines, tested on the test vectors that
NIST publishes, as the owner decided on 24 September 2026. The options not
taken: `crypto.subtle.digest`, the hash the browser gives, which answers
later, where core computes everything at once
(`.claude/skills/coding/SKILL.md`, "The core"); and the library
`@noble/hashes`, a dependency that `docs/technology.md` does not name. A
hash of 256 bits makes two inputs with one key a case that need not be
considered, which a hash of 32 or 64 bits would not.

Core is checked with nothing of the browser and nothing of node
(`tsconfig.core.json`), so the encoder of UTF-8 the browser gives,
`TextEncoder`, is not there: the encoding is ours too, a few lines. Given
a text with a broken character, `sha256Hex` throws a defect, since the
canonical form never gives one.

The canonical form is hashed rather than used as the key itself because
the individuals table goes into the key of every analysis that uses the
populations, and a key of the text of a table of 10,000 rows would be as
long as the table, held once per result in the cache and sent with every
request.

### The key of an intermediate result

The calculation worker keeps what several analyses reuse, the variants
kept by the LD pruning of the PCA, the kinship, under keys made as the
keys of the results are (`.claude/skills/coding/worker.md`, "The
intermediate caches"). The worker does not make keys, so the page sends
them inside the request. The key of an intermediate result is made from
five parts: its name, "the pruned variants"; what it was made from beyond
the file and the filters, which the analysis gives, the threshold of the
pruning; and the three parts that `keyOf` puts in every key itself, the
load of the variants file, the filters the analysis reads, and the
version of popnei. `intermediateKeyOf` makes it, so that the analysis
cannot leave out those three.
The store gives the analysis a function that calls it
(`docs/specs/core/store.md`).

### The fingerprint of the settings

An opened project file keeps, for each analysis, the fingerprint of its
settings as the file had them (`docs/specs/core/project.md`, "The project
of an opened project file"). It is made from the parts of the key but
three: the version of popnei, the key version, and the load id, of which
only the read options are kept. So it names the settings the user chose,
and nothing of the file loaded, of the version of popnei, or of how the
application calculates, which the project file saves apart. It is made
with the same canonical form and the same hash, from another object, so a
fingerprint and a key never coincide.

## The TypeScript interface

A JSON value, which every part of a key and of the project is, and a JSON
object, whose fields are JSON values.

```ts
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | JsonObject;
export interface JsonObject { readonly [field: string]: JsonValue }
```

A key: a text that only this module makes, so that a name of an
individual, also a text, cannot be passed where a key goes; the compiler
refuses it (`.claude/skills/coding/typescript.md`, "Branded types").

```ts
export type Key = string & { readonly __brand: "Key" };
```

The canonical form, and its hash. `memo` is what `KeyMemo` says below.

```ts
/** The canonical text of a JSON value; throws a defect on anything else. */
export function canonical(value: unknown, memo: KeyMemo | null): string;

/** The SHA-256 of a text encoded as UTF-8, as 64 lower case hexadecimal digits. */
export function sha256Hex(text: string): string;
```

What of a definition of an analysis the keys read.

```ts
export type KeyedDef = Pick<AnalysisDef<unknown, unknown>, "id" | "keyVersion" | "filtersRead" | "keyInputs">;
```

The key of an analysis for a project, the key of an intermediate result,
and the fingerprint of the settings. `keyOf` and `intermediateKeyOf` throw
a defect when the project has no variants file, since the store makes a
key only for an analysis that can run.

```ts
export function keyOf(def: KeyedDef, p: Project, popneiVersion: string, memo: KeyMemo): Key;

export function intermediateKeyOf(
  def: KeyedDef, p: Project, popneiVersion: string,
  name: string, inputs: JsonValue, memo: KeyMemo,
): string;

export function settingsFingerprint(
  def: KeyedDef, p: Project,
  readOptions: VariantSource["readOptions"],
  memo: KeyMemo | null,
): string;
```

`settingsFingerprint` takes the read options apart because, when a
project file is opened, the project has no variants file yet: it is
called with the read options of the reference's source then, and with
those of the current source when the settings now are compared with them.

A key that comes back from a worker with its result, a text on the wire,
enters the cache through `keyFromWire`, the other place a `Key` is made. A
text that is not 64 lower case hexadecimal digits throws a defect, since
both sides are our code.

```ts
export function keyFromWire(text: string): Key;
```

The memo: the canonical text of each object of the project already
written, so that a command that changes a threshold does not write the
individuals table again. It is a `WeakMap`, a table from an object to its
text that lets go of the object when nothing else holds it, made by the
store and held by it, so that core has no state outside the store
(`.claude/skills/coding/SKILL.md`, "The core"). It is right because the
project is never changed in place: an object seen once always has the
same text.

```ts
export interface KeyMemo { readonly texts: WeakMap<object, string> }
export function createKeyMemo(): KeyMemo;
```

## The cases

- **The individuals file named by its contents, the variants file by its
  load.** The table goes into `inputs` as cells, and the variants file as
  its load id, so loading the same individuals file again finds the
  results of the first load, and loading the same variants file again
  finds none (`docs/architecture.md`, sections 3 and 6).
- **No version of popnei yet.** The calculation worker gives it when it
  starts. No analysis can run before the variants file is read, and only
  a worker that has started reads it, so the store never asks for a key
  without a version (`docs/specs/core/store.md`).
- **A `keyInputs` that returns a new object each time.** It is expected:
  the key is made from the values, and a new object of the same values
  gives the same key; the memo only spares the writing of an object it
  has seen.

## How it runs

On the page, after every change of the project or of the version of
popnei, not after a progress message: one key for each analysis of the
application that can run. The store keeps the keys of the last project
and version and makes them again only when one of the two changes
(`docs/specs/core/store.md`). The table of the individuals file, 10,000
rows in the largest dataset, is written once per load thanks to the memo,
and hashed with every key that holds it. How long that takes has not been
measured; the walking skeleton measures it (`docs/architecture.md`,
section 11), and if it delays the page, the next step is to hash each
large part once and put its hash in the canonical form in its place.

## How it is verified

With Vitest, at `sha256Hex`, `canonical`, `keyOf`, `intermediateKeyOf`,
`settingsFingerprint` and `keyFromWire`. The tests are checked with
`tsconfig.test.json`, which has the types of node, so they can compute a
hash with node's `crypto` to compare with ours; the code is checked with
`tsconfig.core.json`, which has none.

- **`sha256Hex` on the test vectors of NIST**, of FIPS 180-4 and its
  examples, as literals:

  | text | SHA-256 |
  |---|---|
  | the empty text | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
  | `abc` | `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` |
  | `abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq` | `248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1` |
  | `a` one million times | `cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0` |

  the texts of 55, 56, 63 and 64 bytes, where the padding of SHA-256
  changes from one block to two, and, with fast-check, which draws random
  inputs and shrinks a failure to the smallest one, any text of the whole
  of Unicode, characters of two, three and four bytes in UTF-8 among them,
  against node's `crypto`. `é中𝄞`, of 9 bytes, gives
  `6181473142f4c7073033e4dc44da56a6545a9a4eae4c0b4b79709b3a65b1a555`. A
  text holding `"\ud800"` alone throws a defect.
- **`canonical`**: `{ b: 0.1, a: [true, null, "é"] }` gives
  `{"a":[true,null,"é"],"b":0.1}`, 30 bytes in UTF-8, whose SHA-256 is
  `028eee05401b6428f0941fd2694cc6950836d008b50bb5ee2f4d2c559a0ccca8`; −0
  gives `0`; `"\ud800"` gives the escape; an object parsed from
  `{"__proto__":1}` gives that text back; a defect for each value that is
  not JSON, with its path; and the same text with and without a memo.
- **`keyOf`, a literal.** A fake analysis `diversity`, key version 1, that
  reads both lists of filters and whose `keyInputs` gives `{ pops: [["P1",
  ["i1", "i2"]]] }`, on a project with the `.nei` load
  `00112233445566778899aabbccddeeff` and the filter `missing_data` 0.1,
  with popnei `0.1.0`. The canonical form is

  ```
  {"analysis":"diversity","filters":[{"kind":"missing_data","maxAllowedMissingRate":0.1}],"individualFilters":[],"inputs":{"pops":[["P1",["i1","i2"]]]},"keyVersion":1,"load":{"fileId":"00112233445566778899aabbccddeeff","readOptions":null},"popneiVersion":"0.1.0"}
  ```

  and the key `f83b2cf03da1de50384cf8531ff810a6b95b71c667b4f784d35491d6e79cc85a`.
  Its fingerprint is the hash of

  ```
  {"analysis":"diversity","filters":[{"kind":"missing_data","maxAllowedMissingRate":0.1}],"individualFilters":[],"inputs":{"pops":[["P1",["i1","i2"]]]},"readOptions":null}
  ```

  `64925a3dfda1679f10a451a214cf7a91901dc6321c79883e7a4da7796bfdf9eb`.
  Every hash of this spec was computed with node's
  `crypto.createHash("sha256")` on 24 September 2026. The literal pins
  the canonical form: a change to it fails the test and is then a
  decision, which breaks nothing a user keeps, since no key and no
  fingerprint is saved in a file (`docs/architecture.md`, section 12).
- **`filtersRead`**: the same analysis reading no filter of the variants
  has a key that does not change with the threshold of `missing_data`.
- **`keyFromWire`**: 64 lower case hexadecimal digits give a key; 63
  digits, an upper case digit, or a `g`, a defect.
- **Properties, with fast-check.** For any JSON value, the canonical form
  of the value with the fields of every object in another order is the
  same; and `JSON.parse` of it is deeply equal to the value with every −0
  made 0, the one number the text does not keep, over values whose fields
  are not named `__proto__`, which the example above covers. For any two
  projects that differ in one part of the table of the parts, the keys
  differ; for two that differ in a part the table does not hold, the name
  of the variants file or its read, the keys are the same. For any
  project, the fingerprint does not change when the load id, the key
  version or the version of popnei does, and changes when the filters, the
  read options or the inputs do.
- **Every analysis has its table of what changes its key**, in its own
  spec, as `.claude/skills/coding/SKILL.md` asks, and a test that its
  `keyInputs` gives a value for `emptyProject` and for a project whose
  reads are pending, without reading `p.variants`.

## Open points

None. The time a key takes with a large table is measured in stage 2, as
section 11 of `docs/architecture.md` already says.

## Not in this spec

- What each analysis puts in `inputs`, and which filters it reads: the
  spec of the analysis.
- How the worker keeps its intermediate results under the keys it is
  sent: the spec of the workers, stage 2.
