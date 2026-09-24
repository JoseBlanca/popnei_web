# TypeScript

The rules of the language for every layer of popnei_web: the compiler
and the language it accepts, the rules of the code, the names, and how
errors are handled. `SKILL.md`, beside this file, is the hub, with the
layers, the order of the work, the core layer and the checks; every
session reads both, and the topic file of its layer. The configuration
that enforces most of what follows is in `configs.md`.

## The compiler and the language

The compiler is TypeScript 6.0, 6.0.3, with the options of `configs.md`;
the move to 7 is made when typescript-eslint supports it, as the owner
decided (`docs/technology.md`, section 2).

The language is that of ES2022, with the array methods of ES2023, because
the applications run from Chrome and Edge 111, Firefox 115 and Safari
16.4, the floor the owner set for them (`docs/technology.md`, section 6).
A function added to JavaScript after that would fail in those browsers
and only there, since Vite rewrites newer syntax for them and adds no
missing function; the compiler refuses what its `lib` does not declare.
So `at`, `Object.hasOwn`, `structuredClone`, `findLast`,
`findLastIndex`, `toSorted`, `toReversed`, `toSpliced` and `with` are
allowed, and these are not, although some are in a `lib` the compiler
knows:

- `Promise.withResolvers`, `Object.groupBy` and `Map.groupBy`, of
  ES2024: Firefox 119 and 121, Safari 17.4.
- The methods of `Set`, `union`, `intersection` and the others: Firefox
  127, Safari 17.
- `using` and `Symbol.dispose`: Chrome 134 and 125, Firefox 141, and not
  in Safari.
- A symbol as the key of a `WeakMap`, of ES2023: Firefox 146. Its types,
  `ES2023.Collection`, are left out of `lib` for that reason.
- The rounding options and `formatRange` of `Intl.NumberFormat`, of
  ES2023: Firefox 116. `ES2023.Intl` is left out of `lib` too.
- `Intl.Segmenter`: Firefox 125. Its types are in `ES2022`, so the
  compiler does not refuse it, and this rule is what keeps it out.
- A top-level `await` in a module: Safari before 27 fails when two
  modules import one that has it (WebKit bug 242740). Each worker awaits
  a promise it keeps, as `worker.md` shows.

The versions are those of MDN's browser compatibility data, 8.1.2, read
on 24 September 2026.

Two of the options go beyond `strict` and change how code is written:

- **`noUncheckedIndexedAccess`**: `array[i]` and `record[key]` have the
  type `T | undefined`, because an index can be out of range and nothing
  else in TypeScript says so. Walk arrays with `for...of`, `map`,
  `entries()`; when an index is needed, check the value, and a missing one
  that the code makes impossible is a defect (below). Not `array[i]!` and
  not `array[i] ?? 0`: the first silences the check and the second turns
  a bug into a zero that looks like a result.
- **`exactOptionalPropertyTypes`**: an optional field, `ploidy?: number`,
  may be absent but not `undefined`. It matters because `JSON.stringify`
  drops a field that is `undefined`, so a value in memory and the same
  value written to a project file or a key would differ.

## The rules of the code

- **No `any`.** A value whose type is not known is `unknown`, and is
  narrowed with `typeof`, `in`, `Array.isArray` before it is used. The
  lint denies `any` and every use of a value typed `any` that comes from a
  library.
- **`unknown` at every boundary, then validated.** What comes from
  outside the program has no type until it is checked: the JSON of a
  project file, a message from the worker or to it, the rows of a file of
  individuals, anything read from `localStorage` or the URL. Each has one
  function that takes `unknown` and gives a `Result` of the typed value
  (below), checking every field, and nothing reads the value before it.
  `JSON.parse(text) as Project` is the bug this rule prevents: it compiles
  and checks nothing.
- **No type assertions**, `x as T`, in `src/core` and `src/worker`, which
  the lint denies there; `as const` is allowed. An assertion is a claim
  the compiler takes on trust. The one allowed place is where a branded
  type is made (below), with an `eslint-disable-next-line` that gives the
  reason. In `src/ui` and `src/charts` an assertion is sometimes the only
  way to type the DOM, and `react.md` and `charts.md` say when.
- **Discriminated unions for states and results.** A thing that can be in
  several states is a union whose members share a literal field, `kind`,
  and each carries only what that state has:

  ```ts
  type RunState =
    | { readonly kind: "idle" }
    | { readonly kind: "running"; readonly done: number; readonly total: number }
    | { readonly kind: "done"; readonly key: Key }
    | { readonly kind: "failed"; readonly error: RunError };
  ```

  not an object with `isRunning`, `result?` and `error?`, which allows
  combinations that mean nothing. A `switch` on `kind` has no `default`,
  and the lint `switch-exhaustiveness-check` fails when a member is not
  handled, so adding a state shows every place that has to learn it.
- **No enums**, which `erasableSyntaxOnly` forbids, nor namespaces nor
  parameter properties: Vite strips the types of a file without compiling
  it, and these three are TypeScript that emits code. A finite set is a
  union of string literals; when the list is needed at run time, it is an
  `as const` array and the type is taken from it, as popnei does with
  `THE_MEASURES` and `PopDistMeasure`.
- **Branded types for values of the same primitive that must not mix.**
  A key and the name of an individual are both strings; a key is
  `type Key = string & { readonly __brand: "Key" }`, and only `keys.ts`
  makes one, so a name passed where a key goes does not compile. This is
  the newtype of Rust, and costs nothing at run time.
- **`interface` for the shape of an object, `type` for a union**, which the
  lint's stylistic rules ask for.
- **Exported functions declare their return type**, which the lint
  enforces. The signature is the contract, and an inferred one changes
  when the body does, silently.
- **`null` for "not set", `undefined` only where a library or an optional
  argument gives it.** The project and every message use `null`, because
  JSON has `null` and has no `undefined`.
- **Conditions are booleans.** `if (count)` is false for 0, a real count,
  and `if (name)` for the empty string; the lint `strict-boolean-expressions`
  asks for `count > 0`, `name !== ""`, `value !== null`.
- **No classes of our own** unless a library asks for one. A module of
  functions over plain data is easier to test, serialise and compare. A
  thing with state and a lifetime, the handle of a plot, the worker client,
  is an object of functions returned by a function that holds the state in
  its closure. popnei gives classes, `Variants`, `Distances`, and they are
  used as they are, in the worker.
- **Named exports only, no `export default`**, which the lint denies
  outside the configuration files of the tools, which need one. A named
  export has the same name at every import, so a search finds every use
  and a rename in the editor reaches them all; a default export is named
  anew at each import.
- **ES modules**, as the package is `"type": "module"`; no `require`.
- **Every exported function, type and field has a doc comment**, `/** */`,
  in the style of the `writing` skill and of popnei's TypeScript package:
  what it is, what it gives, and, for a function that can fail, the cases.
- **A lint is silenced on one line**, `// eslint-disable-next-line <rule>
  -- <reason>`, never for a file, and never `@ts-ignore`: a
  `@ts-expect-error` with a reason where the compiler is wrong, which
  fails when it no longer is.
- **No plain object is indexed by a string from the user's files.** The
  name of an individual or of a population can be `constructor` or
  `__proto__`, which a plain object already has or treats specially. In
  memory such data is a `Map`; in the project it is an array of rows or of
  pairs, which JSON holds and which keeps the order of the file.
- **Arrays are sorted with a comparator, into a copy**,
  `values.toSorted((a, b) => a - b)`, since `sort` changes the array it is
  called on and `toSorted`, which the floor has, does not. `sort()` with
  no comparator compares numbers as text, `[10, 9, 1]` becomes
  `[1, 10, 9]`. Text is compared with `<` for anything that has to be
  the same everywhere, a key, an order in a file; `localeCompare` depends
  on the language of the browser, and is for what the screen shows alone.

## Names

- A name says what the value is, `numIndividuals`, `maxMissingRate`,
  never `n`, `data`, `tmp`, `val`.
- The things of the domain have the names of popnei, from its
  `docs/glossary.md` and its TypeScript package: a block, `pops`, `gts`,
  `numVars`, `passStats`, `maf`. The same thing has the same name in the
  project, in the messages and on the screen's code.
- `camelCase` for values, functions and fields, `PascalCase` for types
  and React components, `UPPER_SNAKE_CASE` for a constant of a module
  that is a default or a fixed list. Files in `src/core`, `src/worker` and
  `src/charts` are `camelCase.ts`, as section 9 of the architecture names
  them; `react.md` says how the files of components are named.
- A default that changes a result is a named constant with a doc comment
  that says where it comes from, `DEFAULT_MAF = 0.05`, never a literal in
  the middle of the code.

## Errors

Two kinds of failure, handled in two ways.

**What can go wrong with good code is a value.** A project file that is
not JSON or is of an unknown version, a file of individuals that lacks an
individual of the variants, a calculation that popnei refused: these are
expected, the user has to be told, and the screen shows them. A function
that can fail this way returns a `Result`, defined once in
`src/core/result.ts`:

```ts
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

and `E` is a discriminated union of the ways that function fails, each
with the facts that explain it, the field, the value found, the
individuals missing: `{ kind: "missingIndividuals"; names: readonly
string[] }`. The text the user reads is written from it in one function
beside the type, so the tests assert the `kind` and the facts, not the
wording.

The reason, against throwing: a TypeScript function says nothing of what
it throws, `catch` gives an `unknown`, and nothing makes a caller handle
it. A `Result` is in the signature, and the compiler makes the caller look
at `ok` before it reaches `value`. No library for it, neverthrow or
Effect: the type above is all of it.

**A defect is thrown.** A state the code makes impossible, an index that
cannot be out of range, a key missing from a cache that was just filled,
throws an `Error` whose message starts with `popnei_web defect:` and says
what was expected. Nothing catches it but the outermost layer: the error
boundary of React, which shows that the application failed, and the
`error` handler of the worker, which reports it to the page. A defect
that were caught and passed over would hide a bug in a result.

popnei throws an `Error` for everything it refuses, as its TypeScript
package does, and that is an expected failure for us, not a defect: a
VCF popnei cannot read is the user's file, not our bug. So the runner
catches what a call to popnei throws, at that call, and turns it into a
failed result of the protocol, with popnei's message; `worker.md` has it.
That catch, around a call to popnei, is the one `try` of the code that
does not rethrow.

- Only `Error` objects are thrown, which the lint enforces.
- A promise is awaited or returned, never left floating, which the lint
  enforces: a promise nobody awaits loses its error.
- `catch (error)` gives an `unknown`; it is narrowed with `error
  instanceof Error` before its message is read.

## Sources

- TypeScript 7.0 announcement, the defaults, the removed options, no
  programmatic API and the advice for typescript-eslint:
  https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- The options of `tsconfig.json`: https://www.typescriptlang.org/tsconfig/
- The declarations of `lib` in typescript 6.0.3, `lib/lib.es2022*.d.ts`
  and `lib/lib.es2023*.d.ts`, for what each part of `lib` declares.
- MDN's browser compatibility data, `@mdn/browser-compat-data` 8.1.2,
  read on 24 September 2026, for the versions above.
