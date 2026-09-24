---
name: coding
description: How code is written in popnei_web, the static web applications of popnei, in TypeScript with React, D3, three.js and two web workers, one that runs the wasm package of popnei and a light one for the files of the user, and in Rust for the small crate of xlsx and zip. Use it before writing or changing any code or test of popnei_web. It covers the layers and what each may import, the order of the work, the core layer, dependencies and the checks to run before the work is called done, and it points to typescript.md, the rules of the language and of errors that every session reads with it, and to the topic file of each layer, react.md, css.md, charts.md, worker.md and testing.md, beside it.
---

# Coding

popnei_web has four layers, and `docs/architecture.md` describes them:
`src/core`, plain TypeScript, where the project, its commands, the keys of
the results, the cache, undo and the analyses live; `src/worker`, the two
web workers, the calculation worker that runs popnei and the light worker
that reads the individuals file and writes the xlsx and the zip, and the
messages the page and they exchange; `src/charts`, the plots, functions
over D3 and three.js; and `src/ui`, the React screens. Beside them,
`crates/files/` is a small Rust crate, built to the files wasm, that reads
and writes xlsx and makes the zip for the light worker. What the applications do is in `docs/functionality.md`, and
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

Every session reads this file and `typescript.md`, the rules of the
language, the names and the errors, which hold in every layer; and then
the topic file of the layer the change is in:

| layer | topic file |
|---|---|
| `src/core` | none more: the core layer is in this file, below |
| `src/worker` | `worker.md`: the protocol, the two runners, popnei and the wasm, the reader of the individuals file |
| `crates/files/` | the section "The files crate" below, and popnei's Rust coding skill it points to |
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
| `src/core` | itself; the types of `src/worker/protocol.ts`; the types of `popnei` | `src/ui`, `src/charts`, `src/worker/client.ts`, `src/worker/messages.ts`, `src/worker/start.ts`, `src/worker/runner.ts`, `src/worker/filesRunner.ts`, React, D3, three.js, a value of `popnei` |
| `src/worker` | itself; `popnei`, in `runner.ts` only; the files wasm, in `filesRunner.ts` only; the types of `src/core/result.ts` | anything else of `src/core`, `src/ui`, `src/charts`, React, D3, three.js |
| `crates/files/` (Rust) | its crates, wasm-bindgen, calamine, rust_xlsxwriter and zip | popnei; it is called only by `src/worker/filesRunner.ts` |
| `src/charts` | itself; D3; three.js | `src/core`, `src/ui`, `src/worker`, React, a value of `popnei` |
| `src/ui` | everything above; React; React Aria | `src/worker/runner.ts`, `src/worker/filesRunner.ts`, D3, three.js, a value of `popnei` |

The reasons:

- **core imports no screen and no plot**, so that it runs in a test with
  no browser, and so that the framework could be replaced without
  touching it (`docs/technology.md`, section 2).
- **core does not create the workers.** It is given an object that sends a
  request and reports progress and the result, of an interface that core
  itself declares, `WorkerClient` (`docs/architecture.md`, section 4),
  and `src/ui` hands it the real client from `src/worker/client.ts` when
  the application starts. A test hands it a
  fake that answers at once. So a test of undo or of the cache runs no
  wasm.
- **core imports only the types of popnei**, `import type`, never a
  value, because a function of popnei needs its wasm loaded, and the wasm
  lives in the workers. The version of popnei, which goes into every key,
  comes to core as data, in a message of the calculation worker.
- **`src/worker/protocol.ts` and `src/worker/messages.ts` import nothing
  of ours** but the types of popnei and of `src/core/result.ts`, so that
  both sides can import them and no cycle forms. `protocol.ts` holds no
  type of the DOM either, since core imports it and is checked with none;
  the messages, which carry a `File`, are in `messages.ts`, which only the
  client and the runners import (`worker.md`).
- **charts know nothing of the project nor of React** (section 7 of the
  architecture): a plot takes an element and data and returns a handle.
  Only `src/ui` joins a plot to the project.
- **Only `src/ui` joins the layers.** The entry of each page builds the
  store, gives it the worker client, and mounts the screens.
- **The light worker holds no popnei, and only its runner calls the files
  wasm.** Reading the files of the user is not popnei's business, as the
  owner decided on 24 September 2026 (`docs/architecture.md`, section 6),
  and a light worker that imported popnei would download and compile its
  wasm for nothing. The reader of `src/worker/individuals/` is pure, so it
  imports neither.

The ESLint configuration of `configs.md` turns each row into a
`no-restricted-imports` rule, so a wrong import fails the lint. The
TypeScript configuration checks `src/core` with no DOM library at all, so
a `document` or a `window` in core fails the type check, and checks the
runners with the library of a worker, where `FileReaderSync` exists and
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

## The core

The rules of `typescript.md` hold here as in every layer; what follows
is what the core layer adds to them.

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
  function that unsubscribes; `apply(description, command)`, where a
  command is `(project) => Project` and the description the words that
  finish the notice of removed results, "the MAF filter changed", which
  makes a step of undo, and makes none when the command returns the
  project it was given; `undo()`, `redo()`, and `open(project)`, which
  starts a new history; `startRun(analysis)`; and the events, the version
  of popnei, the reads of the files and `runEnded`, which change what the
  screens show and make no step of undo. `docs/specs/core/store.md` has
  them whole, and `react.md` how the screens read it.
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

### Keys

The key of a result is what makes undo, staleness and the cache work
(section 3 of the architecture), so its rules are strict.

- **`keyInputs` returns the parts of the project the result depends on,
  beyond the load and the filters, and all of them.** A part left out gives a stale result shown as
  current, the worst error the application can make; a part put in that
  the result does not depend on only costs a calculation. When in doubt,
  it goes in.
- **The key is made in one place**, `keys.ts`, from the canonical form of
  the inputs: the analysis id, a version of that analysis's key, the
  version of popnei, the load of the variants file, the filters, which
  every analysis depends on and `keys.ts` adds itself, and `keyInputs`,
  the rest (`docs/specs/core/keys.md`). The canonical form writes the keys
  of every object in sorted order and arrays in their order, so two equal
  values give the same text, whatever order their fields were set in.
- **Only JSON values go into a key**, and the canonical form throws a
  defect on anything else: `undefined`, `NaN`, an infinity, which
  `JSON.stringify` writes as `null`, so that a threshold of NaN and one of
  null would share a key; a function; a `Map` or a `Set`, which it writes
  as `{}`; a typed array; a `File`; a `Date`.
- **Never in a key:** a reference or anything that depends on identity; a
  time, a random number, a counter of the session, but for the one below;
  a text made for the
  screen, which changes with the language or the wording; what belongs to
  the screen, a tab, a zoom, a colour, unless the result depends on it,
  and a result never should.
- **The variant file is in a key as its load**, the file id the page
  made when the user picked it and its read options, and nothing else of
  the file: no name, size, date or hash (`docs/architecture.md`, section
  3). The id is random, but it is part of the project, made once per
  load and not when the key is made, so the same load always gives the
  same key and a new load a new one.
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

## The files crate

`crates/files/` is Rust, and is written by the rules of popnei's coding
skill, `/Users/jose/devel/popnei/.claude/skills/coding/SKILL.md`, as the
model: its sections on errors without panics, integers, and the lints of
its `lints.toml`, which `configs.md` takes into the crate's `Cargo.toml`.
What matters most here:

- **`#![forbid(unsafe_code)]`** in `lib.rs`: the crate reads files and
  has no reason for `unsafe`.
- **No panic crosses the boundary.** A panic in wasm is a trap, which is
  fatal for the light worker, restarted as after a cancel (`worker.md`).
  So no `unwrap`, `expect`, `panic!` or indexing with `[]`, which the lints
  deny outside the tests, and every function the crate exports returns
  `Result<T, JsError>`: wasm-bindgen turns the error into a JavaScript
  `Error` with its message, which the runner catches at the call and
  sends to the page (`worker.md`, "Errors are values").
- **The exported functions are thin.** Each one converts its arguments,
  calls a plain Rust function that does the work and returns a `Result`
  of the crate's own error type, and maps that error to `JsError`. The
  functions wasm-bindgen generates are stubs that panic when called
  natively, so the plain functions are what `cargo test` calls.
- **Its tests**: `cargo test`, natively, over xlsx files kept in the
  crate, written by Excel and LibreOffice, with dates, sparse rows and a
  sheet in Spanish among them (`docs/technology.md`, open point 1); and
  the light worker's tests in Playwright, which read an xlsx and write a
  report through the real wasm (`testing.md`).
- **Its dependencies** are the owner's decision as npm's are, with exact
  versions, and `crates/files/Cargo.lock` is committed.

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
  `docs/technology.md`, where `@vitejs/plugin-react` and `@eslint/js` are
  recorded as parts of Vite and of ESLint. Not taken, as the owner
  decided on 24 September 2026: `@vitest/coverage-v8`, for now, so
  coverage is not measured, and `eslint-plugin-jsx-a11y`.
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
npm run test:files
npm run build:files
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm pkg get dependencies.popnei
```

The scripts are those of `configs.md`: `prettier --check .`; for the
files crate, `cargo fmt --check`, clippy and `cargo test`, then its build
to wasm; `tsc -b`, `eslint --max-warnings=0 .`, `vitest run`, `vite
build`, and the build followed by `playwright test` in the three engines.
All of them run for every change to the code; a change to documents alone
needs none. `build:files` comes before the type check and the lint
because they read the declarations it generates for the files wasm, which
git does not hold. Until the crate exists, after the walking skeleton,
the two scripts of the crate are reported as not there. The
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

## When this skill is wrong

No code existed when this was written, in September 2026. The layers, the
configuration of `configs.md` and the commands above are to be tried on
the walking skeleton, section 10 of the architecture, and this file is
corrected by what it shows: a rule that proves too noisy is changed with
the count of what it flagged, and a command that is not the right one is
corrected here.

## Sources

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
