---
name: coding
description: How code is written in popnei_web, the static web applications of popnei, in TypeScript with React, D3, three.js and a web worker that runs the wasm package of popnei. Use it before writing or changing any code or test of popnei_web. It covers the layers and what each may import, the order of the work, the TypeScript rules, the core layer, errors, dependencies and the checks to run before the work is called done, and it points to the topic file of each layer, react.md, css.md, charts.md, worker.md and testing.md, beside it.
---

# Coding

popnei_web has four layers, and `docs/architecture.md` describes them:
`src/core`, plain TypeScript, where the project, its commands, the keys of
the results, the cache, undo and the analyses live; `src/worker`, the web
worker that runs popnei and the messages the page and it exchange;
`src/charts`, the plots, functions over D3 and three.js; and `src/ui`, the
React screens. What the applications do is in `docs/functionality.md`, and
what they are built with, and why, in `docs/technology.md`.

`src/core` is where a mistake gives a wrong result: a stale number shown
as current, a result that undo does not bring back, a project file that
does not restore. So it is the part held to the strictest rules and
tested most, and it has no DOM, no React and no clock, so that Vitest
tests it alone.

Most of what follows is enforced by the compiler and the linter, whose
configuration is in `configs.md`, beside this file. A rule a tool
enforces is given here with its reason and not repeated in detail. The
prose is for what no tool catches.

## What to read

Read this file for every change, and the file of the layer the change is
in:

| layer | topic file |
|---|---|
| `src/core` | this file alone |
| `src/worker` | `worker.md`: the protocol, the runner, popnei and the wasm |
| `src/charts` | `charts.md`: D3, three.js, the handle of a plot, export |
| `src/ui` | `react.md` and `css.md`: React, React Aria, the styles, accessibility |
| any test, or running the app | `testing.md`: Vitest, Playwright, the dev server |

A change that crosses layers reads the file of each. `configs.md` is read
when a configuration file is created or changed.

## The layers and what each may import

Section 9 of `docs/architecture.md` gives the modules. What each layer may
import:

| layer | may import | must not import |
|---|---|---|
| `src/core` | itself; the types of `src/worker/protocol.ts`; the types of `popnei` | `src/ui`, `src/charts`, `src/worker/client.ts`, `src/worker/messages.ts`, `src/worker/start.ts`, `src/worker/runner.ts`, React, D3, three.js, a value of `popnei` |
| `src/worker` | itself; `popnei`; the files wasm; the types of `src/core/result.ts` | `src/core`, `src/ui`, `src/charts`, React, D3, three.js |
| `src/charts` | itself; D3; three.js | `src/core`, `src/ui`, `src/worker`, React, a value of `popnei` |
| `src/ui` | everything above; React; React Aria | `src/worker/runner.ts`, D3, three.js, a value of `popnei` |

The reasons:

- **core imports no screen and no plot**, so that it runs in a test with
  no browser, and so that the framework could be replaced without
  touching it (`docs/technology.md`, section 2).
- **core does not create the worker.** It is given an object that sends a
  request and reports progress and the result, of an interface that core
  itself declares, `WorkerClient` (`docs/architecture.md`, section 4),
  and `src/ui` hands it the real client from `src/worker/client.ts` when
  the application starts. A test hands it a
  fake that answers at once. So a test of undo or of the cache runs no
  wasm.
- **core imports only the types of popnei**, `import type`, never a
  value, because a function of popnei needs its wasm loaded, and the wasm
  lives in the worker. The version of popnei, which goes into every key,
  comes to core as data, in a message of the worker.
- **`src/worker/protocol.ts` and `src/worker/messages.ts` import nothing
  of ours** but the types of popnei and of `src/core/result.ts`, so that
  both sides can import them and no cycle forms. `protocol.ts` holds no
  type of the DOM either, since core imports it and is checked with none;
  the messages, which carry a `File`, are in `messages.ts`, which only the
  client and the runner import (`worker.md`).
- **charts know nothing of the project nor of React** (section 7 of the
  architecture): a plot takes an element and data and returns a handle.
  Only `src/ui` joins a plot to the project.
- **Only `src/ui` joins the layers.** The entry of each page builds the
  store, gives it the worker client, and mounts the screens.

The ESLint configuration of `configs.md` turns each row into a
`no-restricted-imports` rule, so a wrong import fails the lint. The
TypeScript configuration checks `src/core` with no DOM library at all, so
a `document` or a `window` in core fails the type check, and checks the
runner with the library of a worker, where `FileReaderSync` exists and
`document` does not.

Imports are relative, with the `.ts` extension, `import { applyFilter }
from "./project.ts"`: the path shows the layer, which is what the lint
matches, and the extension is the name of the file, since nothing
compiles it to `.js` but Vite. There are no path aliases, `@/core`, which
would need the same setting in Vite, in TypeScript and in Vitest, and no
barrel files, an `index.ts` that re-exports a folder, which make cycles
easy and hide which module a name comes from.

## Before the code

Code is written from a spec, `docs/specs/<layer>/<module>.md`,
`docs/specs/analyses/<id>.md` or `docs/specs/steps/<step>.md`, as the
`writing-specs` skill describes, and usually from a step of a plan, as the
`writing-plans` and `following-plans` skills do. Read the item of the
spec, the part of `docs/architecture.md` it stands on, and, when it calls
popnei, the TypeScript declarations of the function in the popnei package
and its spec in popnei's `docs/specs/`.

When the spec does not say what should happen in a case, the choice is not
made in silence. A choice that changes what a user sees, a result, a
message, the project file, goes to the owner as an open point of the spec.
A smaller one is made and written in the spec, in a commit of its own
before the commit of the code, and named in the commit message of the
code.

## The order of the work

1. **The types first.** The shape of the data the step adds, the
   interfaces, the unions of states and of errors, the signatures of the
   functions, written and type checked before any body. In TypeScript the
   types are the design: a state that cannot be written in them cannot
   happen, and a reviewer reads them before the code.
2. **The test**, which fails before the change. To make it compile, the
   new function gets a body that returns a wrong value, the project it was
   given, an empty array, `{ ok: false, ... }`, and does not throw. Run it
   and see it fail on the assertion. When a change cannot have such a
   test, a rename, a move, say so in the commit message.
3. **The code**, as small as the step asks for.
4. **The checks** at the end of this file, all of them, with their real
   output. A check that could not be run is reported as not run.
5. **The commit**, with the message the `writing` skill describes.

## TypeScript

The compiler is TypeScript 6.0, with the options of `configs.md`; 6 or
7 is open for the owner (point 3 of "Open for the owner", below). The
language is that of ES2021, because the site runs in the browsers popnei
runs in, back to Firefox 89 and Safari 16.4, and a function added to
JavaScript after 2021, `Array.prototype.at`, `Object.hasOwn`,
`toSorted`, would fail there and only there; the compiler refuses them.
The floor itself is open for the owner (point 1 of "Open for the
owner", below).
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

And the rules of the code:

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

### Names

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

## The core

- **Pure functions.** A function of core computes its result from its
  arguments and changes none of them. It reads no clock, no random
  number, no global, no DOM, sets no timer and does no I/O: the date of a
  project file, an id, the text of a file, are passed in by the caller.
  The only state is the store, `store.ts`, below. So a test is a call and
  an assertion, and the same call always gives the same answer.
- **Synchronous.** Nothing in core is `async`. What waits, a file being
  read, the worker answering, is in `src/ui` and `src/worker`, and hands
  core a finished value; a result from the worker enters the store by a
  plain call.
- **The store**, `store.ts`, holds the current project, the history and
  the cache (`docs/architecture.md`, section 9), and is the one object
  with state. It gives `getState()`, the current `AppState`, the same
  object until something changes; `subscribe(listener)`, a property bound
  once, which calls the listener after every change and returns the
  function that unsubscribes; `apply(command)`, where a command is
  `(project) => Project`, which makes a step of undo, and makes none when
  the command returns the project it was given; `undo()` and `redo()`;
  and the events of a run, `runStarted`, `runProgress`,
  `resultArrived(key, result)` and `runEnded`, which change what the
  screens show and not the project, so they make no step of undo.
  `react.md` has how the screens read it.
- **A run is started by core and awaited by `src/ui`.** The `run` of an
  analysis builds its request, hands it to the client that core was given,
  and returns the `Run` handle of `src/worker/protocol.ts` without waiting
  on it. `src/ui/runs.ts` awaits its `outcome` and calls the events of the
  store. So nothing in core waits, and the promise is in the layer that
  already does.
- **The project is immutable and plain.** Every field of `Project`, and of
  what it holds, is `readonly`, and every array `readonly T[]`, so the
  compiler refuses a write. It holds only what JSON holds, strings, finite
  numbers, booleans, `null`, arrays and plain objects: no `Map`, no `Set`,
  no `Date`, no class, no typed array, no `File`. That is what makes
  saving it `JSON.stringify` and opening it a validation.
- **A command is a function `(project, ...arguments) => Project`**, named
  by what it does, `setMaxMissingRate(project, 0.1)`, in `project.ts`. It
  builds the new project with spread, `{ ...project, filters: [...] }`,
  and keeps the same reference for every part it did not change: the
  screens and the notice of removed results tell what changed by comparing
  references. A command that changes nothing returns the project it was
  given, the same object, so that no step of undo is made for it. The
  tests of a command check both: the part that changed, and `toBe` on the
  parts that did not.
- **The tests freeze what they pass.** A test gives a command a project
  frozen deeply with `Object.freeze`, so a command that writes into it
  throws in the test, since ES modules run in strict mode. The `readonly`
  types catch most writes; this catches the rest, a copy that was shallow.
- **No plain object is indexed by a string from the user's files.** The
  name of an individual or of a population can be `constructor` or
  `__proto__`, which a plain object already has or treats specially. In
  memory such data is a `Map`; in the project it is an array of rows or of
  pairs, which JSON holds and which keeps the order of the file.
- **Arrays are sorted with a comparator**, on a copy, `[...values].sort((a,
  b) => a - b)`, since `sort` changes the array it is called on and
  `toSorted`, which does not, is missing in Firefox 89, one of the
  browsers the site supports (`configs.md`). `sort()` with no comparator
  compares numbers as text, `[10, 9, 1]` becomes `[1, 10, 9]`. Text is compared with `<` for
  anything that has to be the same everywhere, a key, an order in a file;
  `localeCompare` depends on the language of the browser, and is for what
  the screen shows alone.

### Keys

The key of a result is what makes undo, staleness and the cache work
(section 3 of the architecture), so its rules are strict.

- **`keyInputs` returns the parts of the project the result depends on,
  and all of them.** A part left out gives a stale result shown as
  current, the worst error the application can make; a part put in that
  the result does not depend on only costs a calculation. When in doubt,
  it goes in.
- **The key is made in one place**, `keys.ts`, from the canonical form of
  the inputs: the analysis id, a version of that analysis's key, the
  version of popnei, and `keyInputs`. The canonical form writes the keys
  of every object in sorted order and arrays in their order, so two equal
  values give the same text, whatever order their fields were set in.
- **Only JSON values go into a key**, and the canonical form throws a
  defect on anything else: `undefined`, `NaN`, an infinity, which
  `JSON.stringify` writes as `null`, so that a threshold of NaN and one of
  null would share a key; a function; a `Map` or a `Set`, which it writes
  as `{}`; a typed array; a `File`; a `Date`.
- **Never in a key:** a reference or anything that depends on identity; a
  time, a random number, a counter of the session; a text made for the
  screen, which changes with the language or the wording; what belongs to
  the screen, a tab, a zoom, a colour, unless the result depends on it,
  and a result never should.
- **A key on the wire is a `string`.** The messages of the worker cannot
  import `keys.ts`, so `keys.ts` also gives `keyFromWire(text: string):
  Key`, the other place a `Key` is made, and a key that comes back with a
  result enters the cache through it.
- **The version of the key** of an analysis, a number in its module, is
  raised when what its result means changes for the same inputs, a new
  default of popnei, a bug fixed in how it is called, so that the results
  calculated before are no longer found.
- **Order that does not matter is sorted in `keyInputs`,** and only when
  the spec says it does not matter. The filters are in their order,
  because their order changes the result.
- **Every analysis has a test of its key**: for each field of the
  project, whether changing it changes the key, as a table the spec gives.
  Section 3 of the architecture gives the case to copy: the column of the
  populations changes the key of the diversity and not that of the PCA.

### Numbers

- A JavaScript `number` is a float64. Integers are exact up to 2^53,
  which holds every count of a dataset; popnei gives positions as
  `Float64Array` for that reason. No `BigInt` in core, which JSON cannot
  write.
- A number from outside is checked with `Number.isFinite`, and a count
  with `Number.isInteger` and its range, before it is used. `parseFloat`
  reads `"0,05"` as 0; what the user types comes through a number field of
  React Aria, which parses by the language (`react.md`).
- A number is written for a program, the project file, a key, the Python
  script, with `String(x)` or `JSON.stringify`, which give the shortest
  text that reads back as the same float in every browser and in Python.
  `toFixed` and `toPrecision` are for the screen alone: a threshold of 0.1
  written with `toFixed(3)` is still 0.1, but one of 1e-8 is `0.000`.
- The results arrive as typed arrays, `Float64Array`, `Int8Array`, as
  popnei gives them, and stay typed arrays in the cache: a million
  p values as a `number[]` take several times the memory. `readonly` does
  not reach the elements of a typed array, so the rule is written here:
  nothing writes into an array of a result once it is in the cache, and
  code that has to sort one sorts a copy.
- A missing value that popnei gives as NaN, the heterozygosity of an
  individual with no called genotype, is tested with `Number.isNaN` before
  any arithmetic, and becomes `null` before it goes into JSON, which
  would write it as `null` anyway, and back as `null`, not as NaN.

## Dependencies

`docs/technology.md` decided the libraries, and its rule stands: a library
is taken only when it is the established standard of its field, or small
enough to be written by us, because each one is a future upgrade, a
possible break and a possible abandonment.

- **A new dependency is the owner's decision**, runtime or development
  alike, and a transitive one that a new version of a dependency brings
  in counts too. Propose it with what it gives, why a few lines of ours do
  not, its user base, its maintainer, its size, and what it pulls in
  (`npm view <name> dependencies`), and wait. The decisions go into
  `docs/technology.md`.
- The dependencies decided are those of section 2 of
  `docs/technology.md`, with `@vitejs/plugin-react` and `@eslint/js`,
  which are parts of Vite and of ESLint. Those proposed and not yet
  decided are point 2 of "Open for the owner", below.
- **Versions are exact** in `package.json`, `"vite": "8.3.0"`, by
  `save-exact=true` in `.npmrc`: an upgrade is then a change someone made
  and a commit can name, not what the day of the install gave.
  TypeScript in particular does not follow semantic versioning, and a
  minor version can break the build.
- **`package-lock.json` is committed** and changes only with a change of
  `package.json`, in the same commit. The continuous integration installs
  with `npm ci`, which installs exactly the lockfile and fails when it
  does not match. A lockfile that changed with nothing in `package.json`
  is a mistake of the machine it came from, and is not committed.
- **Upgrades are commits of their own**, one library at a time, with the
  checks run, never mixed into a feature.
- **popnei comes from a GitHub Release**, as section 5 of
  `docs/technology.md` has it: `package.json` names the `.tgz` of a tag by
  its URL, and the lockfile keeps its hash. For work on both at once, the
  local build is linked with `npm link` or `"popnei":
  "file:../popnei/js/popnei"`, and that is never committed: the last check
  below fails on it. A newer popnei is a new tag there and a new URL here,
  in a commit of its own that says what changed in popnei.

## Tools

Vite, TypeScript, ESLint and Prettier, their scripts and their
configuration are in `configs.md`; Vitest and Playwright in `testing.md`.
Vite removes the types of each file and does not check them, so a page
that runs in the dev server can still have type errors, and the type
check is a command of its own.

## Before the work is called done

```
npm run format:check
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm pkg get dependencies.popnei
```

The scripts are those of `configs.md`: `prettier --check .`, `tsc -b`,
`eslint --max-warnings=0 .`, `vitest run`, `vite build`, and the build
followed by `playwright test` in the three engines. All of them run for
every change to the code; a change to documents alone needs none. The
build is in the list because it is what finds a worker, a wasm file or a
page that the bundler cannot resolve, which neither the type check nor
the unit tests load. The tests in a browser, `test:e2e`, run for a change
to `src/core` too, because core reaches the screens through the store;
`testing.md` says how.

The last one prints the dependency on popnei, which has to be a URL of
`https://github.com/JoseBlanca/popnei/releases/download/`. A `file:` path
or a link is the local build, and is not committed.

A layer or a script that does not exist yet is reported as not there, not
as passed. Report what each command printed when it failed and that it
passed when it passed. `--fix` of ESLint and `--write` of Prettier change
files; their changes are looked at before they are committed.

## Open for the owner

Four points of this skill and of its topic files are not decided. A file
that depends on one says that it is open for the owner and points here.
Until the owner decides, the work follows the meanwhile of each, and the
answers go into `docs/technology.md`.

1. **The browser floor.** popnei runs from Chrome 91, Firefox 89 and
   Safari 16.4. React Aria 1.21.1 calls `findLast` in its table rows and
   `at` in the layout of its virtualized table, which need Chrome 97 and
   Firefox 104; a module worker needs Firefox 114; and Vite's default
   target is Chrome 111, Firefox 114 and Safari 16.4. The alternative is
   a floor of the applications' own, such as Chrome 111, Firefox 115 and
   Safari 16.4. Meanwhile: popnei's floor, as `configs.md`, `worker.md`
   and `css.md` write it.
2. **The dependencies that `docs/technology.md` does not name.** Proposed
   in `testing.md` (`jsdom`, `@vitest/coverage-v8`,
   `@axe-core/playwright`, `fast-check`), in `react.md`
   (`eslint-plugin-react-hooks`, and the compiler of point 4), in
   `charts.md` (the D3 modules one by one with their `@types/d3-*`, and
   `@types/three`) and in `configs.md` (`@types/node`). Meanwhile: none is
   installed, and what needs one waits.
3. **TypeScript 6.0 or 7.0.** typescript-eslint 8.70.1, whose rules that
   read types catch most of the mistakes listed here, takes TypeScript
   `>=4.8.4 <6.1.0`: it reads the types through the programmatic API of
   the compiler, and 7.0, rewritten in Go, has only `unstable/` ones.
   Vite's React template pins `~6.0.2`. The language of the two is the
   same, so moving to 7 is a change of version once typescript-eslint
   supports it. Meanwhile: 6.0.3.
4. **The React Compiler**, proposed in `react.md`. Meanwhile: off.

## When this skill is wrong

No code existed when this was written, in September 2026. The layers, the
configuration of `configs.md` and the commands above are to be tried on
the walking skeleton, section 10 of the architecture, and this file is
corrected by what it shows: a rule that proves too noisy is changed with
the count of what it flagged, and a command that is not the right one is
corrected here.

## Sources

- TypeScript 7.0 announcement, the defaults, the removed options, no
  programmatic API and the advice for typescript-eslint:
  https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- The options of `tsconfig.json`: https://www.typescriptlang.org/tsconfig/
- typed linting and the shared configurations of typescript-eslint:
  https://typescript-eslint.io/getting-started/typed-linting/ and
  https://typescript-eslint.io/users/configs/
- Vite, TypeScript, workers and wasm: https://vite.dev/guide/features;
  multi-page builds: https://vite.dev/guide/build
- The versions current on 24 September 2026, from `npm view`: typescript
  7.0.2 (6.0.3 the last of 6), typescript-eslint 8.70.1 (peer typescript
  `>=4.8.4 <6.1.0`), eslint 10.11.0, vite 8.3.0, vitest 5.0.1, prettier
  3.9.9, @playwright/test 1.63.0, react 19.3.0; and `create-vite` 9.2.1,
  whose React template pins typescript `~6.0.2`.
