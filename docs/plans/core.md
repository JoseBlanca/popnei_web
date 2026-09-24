# Plan: the core, with no screen

24 September 2026, a draft. It builds stage 1 of `docs/build-order.md`
from six specs approved by the owner on 24 September 2026:
`docs/specs/worker/protocol.md` and `docs/specs/core/project.md`,
`keys.md`, `history.md`, `cache.md` and `store.md`, called below by their
names, protocol, project, keys, history, cache and store. It is carried
out as the `following-plans` skill says, on the branch `plan/core`, with
its report in `docs/plans/core.report.md`.

The core is the plain TypeScript of `src/core`, with no DOM and no clock,
where a mistake shows a result for settings the user did not choose. What
this plan builds is what the walking skeleton of stage 2 will stand on:
a project that the screens change with commands, the key that names each
result, undo and redo, the cache of results, and the store that tells each
screen what state each analysis is in.

## In and out

In: the types of `src/worker/protocol.ts`; `src/core/result.ts`,
`project.ts`, `keys.ts`, `history.ts`, `cache.ts` and `store.ts`, each
with its tests; fast-check as a development dependency.

Out, with where it goes: the workers, their messages and their client,
`Job` and `JobResult` (stage 2); `projectFile.ts`, which saves and opens
a project file and makes the fingerprints of an opened one (stage 2);
`apps.ts` and every analysis (stage 2 on); `src/ui/runs.ts`, which awaits
the calculations, and every screen (stage 2). Nothing of the page imports
the core yet, so the site built from this plan is the probe of stage 0,
unchanged, and there is no screen for the owner to try.

One change to the breakdown the owner approved on 24 September 2026: the
canonical form of the keys, the text that two equal values share, is
built in work package 1 and not 2, because the commands of project
compare a new value with the one already there as the canonical form
writes them (project, "What it does", the rules). The rest of the keys
stays in work package 2.

The open points of the specs, each with its meanwhile and the task its
answer would change:

- **history, Open 1**, how many steps undo keeps: meanwhile 200,
  `MAX_UNDO_STEPS`. Task 3.1; the store takes the bound from its caller,
  so nothing else changes.
- **cache, Open 1**, the bound of the cache: meanwhile 256 MB,
  `CACHE_MAX_BYTES`. Task 3.2, in the same way.
- **project, Open 1**, whether the column types the user set survive a
  new read of the individuals file: meanwhile they are lost. Tasks 1.3
  (`loadIndividuals`, `setCsvOptions`) and 1.4 (`recordIndividualsRead`).

## Before the first task

- **The branch.** The specs and this plan are on the branch `spec/core`,
  and `main`, at 3571226, has none of them. The worktree of the plan is
  made from `main` after the owner has merged `spec/core` into it, or
  from `spec/core` if the owner says so. Check: `git ls-tree -r --name-only
  <base> docs/specs/core docs/plans/core.md` lists the five specs of core
  and the plan.
- **node 24 or later.** This machine has node 26.8.2 and npm 11.19.1,
  checked on 24 September 2026.
- **popnei.** `npm pkg get dependencies.popnei` prints
  `https://github.com/JoseBlanca/popnei/releases/download/js-v0.1.0-dev.1/popnei-0.1.0.tgz`,
  as it did on 24 September 2026. This plan calls no function of popnei
  and imports none of its types; the version `"0.1.0"` in the tests is a
  literal text, as the specs have it.
- **fast-check 4.10.2**, the version `testing.md` names and `npm view
  fast-check version` gave on 24 September 2026. The owner took it on
  that date (`docs/technology.md`, section 2). Task 1.1 adds it with `npm
  install --save-dev --save-exact fast-check@4.10.2`, which brings one
  package of its author, `pure-rand`, and nothing else. Check: `npm ls
  fast-check` prints `fast-check@4.10.2`; on 9ed132b it prints
  `(empty)`.
- **The checks of the `coding` skill.** On 9ed132b, the commit this plan
  was written on, with `npm ci` run, on 24 September 2026:
  `format:check`, `typecheck` and `lint` exit 0; `npm test` gives "Tests
  68 passed (68)", all in `src/probe/messages.test.ts`; `npm run build`
  exits 0; `npx playwright test --project=chromium --project=webkit`,
  after the build, gives "40 passed". Firefox does not start without a
  window on this Mac (`docs/plans/site.report.md`), so `test:e2e` runs
  here in Chromium and WebKit, and in Firefox on GitHub after the merge.
  Its tests are the probe's, since nothing of the page imports the core.
  `test:files` and `build:files` are not there: the files crate comes
  after the walking skeleton.
- **Vitest takes the tests of the core as they are.** The project `node`
  of `vite.config.ts` already includes `src/core/**/*.test.ts` and
  `src/worker/**/*.test.ts`; no change. How the counts of this plan are
  read: `npx vitest list` prints a `test.each` once however many cases it
  has, and prints nothing and exits 0 for a path with no tests; so every
  count below is the summary line of `npx vitest run <file> -t "<name>"`,
  "Tests N passed", with `-t` matching the name of a `describe`. On
  9ed132b, `npx vitest run src/core` exits 1 with "No test files found".
  So each test file has one `describe` for each item of its spec's "How it
  is verified", named as the check of its deliverable names it.
- **TypeScript keeps the core pure as it is.** `tsconfig.core.json`
  checks `src/core` and `src/worker/protocol.ts` with the language alone:
  on 9ed132b, a scratch file of `src/core` that imported `node:crypto`
  and used `TextEncoder`, and a scratch `protocol.ts` that named `File`,
  each failed `npm run typecheck`, and were deleted. The tests are checked
  by `tsconfig.test.json`, which has the types of node, so a test can
  hash with node's `crypto` as keys asks. No change.
- **ESLint allows what the specs need, with no change.** The block of
  `src/core` refuses the client, the messages, the start and the runners
  of `src/worker`, and not `protocol.ts`; it refuses a type assertion,
  `as`, everywhere in `src/core`, the tests included, and the one place
  the specs need one is where a `Key` is made in `keys.ts`, with an
  `eslint-disable-next-line` and its reason (`typescript.md`, "Branded
  types"). The block of `protocol.ts` refuses every import of `src/core`,
  as protocol wants. These rules have not yet run on code of the layers
  (`configs.md`); a rule that refuses what a spec asks for is changed in
  `eslint.config.js` and `configs.md` together, in the task that meets it,
  and said in the report.
- **The generators the property tests share**, of JSON values, of
  commands with valid arguments and of whole projects, and the function
  that freezes a project deeply, go in `src/core/testSupport.ts`,
  imported by tests alone. It is checked with the core, so it may import
  fast-check and nothing of node.
- **The words of `individualsNeeds`.** Project gives its three cases, the
  individuals file being read, its read failed, individuals of the
  variants missing from it, but not their words, nor what it gives when
  there is no individuals file. The owner settles them in project before
  task 1.4; the orchestrator asks at the start, and tasks 1.1 to 1.3 go on
  meanwhile.

## 1. The project and its commands

**What it gives:** a project that the screens of stage 2 will change
with commands, that the store and the keys take, and that a project
file's JSON becomes, or is refused with a text the user reads.

**Deliverables:**

1. The types of protocol's "The TypeScript interface", `result.ts`, the
   types of project's interface, the JSON types, `Key` and `KeyMemo` of
   keys, and `AnalysisDef`, `WorkerClient` and `Warning` of store, which
   project and keys name. Check: `npm run typecheck` and `npm run lint`
   exit 0 with the files there, and a scratch line in `protocol.ts` that
   names `File` fails the typecheck (protocol, "How it is verified").
2. The canonical form. Check: `npx vitest run src/core/keys.test.ts -t
   canonical` passes at least 17 tests: the item `canonical` of keys'
   "How it is verified", with one test for each of the ten kinds of value
   that are not JSON listed under "The canonical form", each asserting
   the path in the message; and the two properties of the canonical form
   under "Properties", the order of the fields and `JSON.parse` of the
   text. Its hash, `028eee…`, is checked in task 2.1.
3. The commands. Check: `npx vitest run src/core/project.test.ts -t
   commands` passes at least 30 tests, on projects frozen deeply: the
   worked case of "Each command"; for each of the 14 functions of "The
   commands", `emptyProject` and `analysisOptions` among them, the part
   that changed and `toBe` on the others; a test for each row of the
   table of the commands, and for each of the five conditions of the row
   of `setColumnType`; and the two properties of the commands under
   "Properties", one filter of each kind in their order, and a command
   applied twice.
4. The records and what every analysis needs. Check: `npx vitest run
   src/core/project.test.ts -t "records|needs"` passes at least 20 tests:
   for each of the three records, recorded into the source of its id, and
   the project itself for another id and for a read already recorded;
   `recordVariantsCounted` when `numVars` is set; `recordIndividualsRead`
   with other `csv` options; one test for each row of the table of
   `projectNeeds`, the individuals named; the cases of `individualsNeeds`
   with the words the owner settled; and the cases "An empty project",
   "Two picks of files" and "A worker that could not start" of project's
   "The cases".
5. The validation. Check: `npx vitest run src/core/project.test.ts -t
   parseProject` passes at least 25 tests: one for each check of the
   paragraph "What it checks", with its `kind` and its `path`; the texts
   of a file of the other application, of an unknown analysis and of a
   field the type does not have; the text of `wrongValue` at `["filters",
   1, "maxAllowedMaf"]`; a pending read accepted ("An opened project
   file"); and the property that every project read back from its JSON is
   equal to it.

**Stands on:** what "Before the first task" lists, and, for task 1.4, the
words of `individualsNeeds`.

**Tasks:**

- [ ] 1.1 The types: `src/worker/protocol.ts`, `src/core/result.ts`, and
  the types, with no function, of `project.ts`, of `keys.ts` (`JsonValue`,
  `JsonObject`, `Key`, `KeyMemo`) and of `store.ts` (`AnalysisDef`,
  `WorkerClient`, `Warning`), from the interfaces of protocol, project,
  keys and store; fast-check added. Serves 1.
- [ ] 1.2 The canonical form, `canonical` and `createKeyMemo` in
  `keys.ts`, from keys' "The canonical form" and the `KeyMemo` of its
  interface; the generator of JSON values in `testSupport.ts`. Serves 2.
  Needs 1.1.
- [ ] 1.3 The commands, `emptyProject` and `analysisOptions` in
  `project.ts`, from project's "What it does" and "The commands"; the
  deep freeze and the generator of commands in `testSupport.ts`. Serves 3.
  Needs 1.2, since a command compares values by their canonical form.
- [ ] 1.4 The records, `projectNeeds` and `individualsNeeds`, from
  project's "The records", "What an analysis needs of every project" and
  "What every analysis needs". Serves 4. Needs 1.3 and the words of
  `individualsNeeds`.
- [ ] 1.5 `parseProject` and `projectErrorText`, with the table of the
  fields in words, from project's "The validation"; the generator of whole
  projects, reads and reference among them, in `testSupport.ts`. Serves 5.
  Needs 1.4.

**What could go wrong:** the lint of the layers runs on their code for
the first time (`configs.md`), and `noPropertyAccessFromIndexSignature`
makes every field of a `JsonObject` read as `o["field"]`. The generator
of whole projects is the largest piece of test code of the plan: it has
to draw only valid projects, a table whose rows are as long as its
header, a binary type whose values are in its column, or the round trip
fails on the generator and not on `parseProject`.

## 2. The keys

**What it gives:** the key under which the store finds a result, which
changes with every input of the result and with nothing else, and the
fingerprint that tells the store whether the settings of an opened project
are still those its check numbers were made with.

**Deliverables:**

1. The hash. Check: `npx vitest run src/core/keys.test.ts -t sha256Hex`
   passes at least 12 tests: the four vectors of NIST of keys' "How it is
   verified", the texts of 55, 56, 63 and 64 bytes against node's
   `crypto`, `é中𝄞`, a broken character that throws, the property over
   any text of the whole of Unicode against node's `crypto`, and the hash
   of the canonical example of the item `canonical`, `028eee…`.
2. The key, the fingerprint, the key of an intermediate result and a key
   from the wire. Check: `npx vitest run src/core/keys.test.ts -t
   "keyOf|settingsFingerprint|intermediateKeyOf|keyFromWire"` passes at
   least 11 tests: the literal key and the literal fingerprint of "`keyOf`,
   a literal"; the item `filtersRead`; the four texts of the item
   `keyFromWire`; `keyOf` and `intermediateKeyOf` throwing a defect on a
   project with no variants file; and the cases "The individuals file
   named by its contents" and "A `keyInputs` that returns a new object
   each time".
3. The properties of the keys. Check: `npx vitest run
   src/core/keys.test.ts -t "properties of the keys"` passes at least 4
   property tests: a change to each part of the table of the parts, the
   two of `load` among them, changes the key; a change to the name or the
   read of the variants file does not; the fingerprint does not change
   with the load id, the key version or the version of popnei, and
   changes with the filters, the read options and the inputs; the key of
   an intermediate result changes with each of its five parts ("The key
   of an intermediate result").

**Stands on:** work package 1, but for task 2.1.

**Tasks:**

- [ ] 2.1 `sha256Hex` in `keys.ts`, with its encoder of UTF-8, from keys'
  "The hash". Serves 1. Needs only 1.2, and can run beside 1.3 to 1.5.
- [ ] 2.2 `keyOf`, `intermediateKeyOf`, `settingsFingerprint`,
  `keyFromWire` and `KeyedDef`, from keys' "What it does", "The key of an
  intermediate result", "The fingerprint of the settings" and "The
  TypeScript interface". Serves 2. Needs 2.1.
- [ ] 2.3 The property tests of the keys, from keys' "Properties" and
  the table of the parts, in a commit of their own: a key that misses an
  input shows a stale result and no other test would fail. Deliverable 3
  guards it; a property is shown to fail, once, on a scratch `keyOf` that
  leaves out `individualFilters`, and the report says so. Serves 3. Needs
  2.2.

**What could go wrong:** when the literal key of `keyOf` is not reached,
the canonical form or the parts of the key are wrong and not the literal,
which was computed with node's `crypto`; if following the spec cannot
give it, the task stops, since a spec and the code disagree.

## 3. Undo and the cache

**What it gives:** undo and redo that bring back the very same project,
and the reads of the files recorded into every project of the history;
a cache that keeps the results under their keys within its bound, and
never drops what the screen shows.

**Deliverables:**

1. The history. Check: `npx vitest run src/core/history.test.ts` passes
   at least 10 tests: the five items of history's "How it is verified",
   the bound kept by `undo`, `redo` and `mapProjects` each; the case "An
   undo past the first project"; and the properties, undoing and redoing
   every step within the bound, beyond it, and a command after an undo.
2. The cache. Check: `npx vitest run src/core/cache.test.ts` passes at
   least 12 tests: the four sizes of cache's "How it is verified" and an
   `ArrayBuffer` and a `DataView` counted by their block ("What it
   does"); the worked case with a bound of 100 bytes; `get`; the cases
   "The same result put twice" and a `use` of keys the cache does not
   hold, which returns `c`; and the three properties.

**Stands on:** work package 1; task 3.2 also on task 2.2, for the keys of
its tests.

**Tasks:**

- [ ] 3.1 `history.ts`, from history's "What it does" and "The
  TypeScript interface", with `MAX_UNDO_STEPS` (Open 1). Serves 1. Can
  run beside work package 2 and beside 3.2.
- [ ] 3.2 `cache.ts`, from cache's "What it does" and "The TypeScript
  interface", with `CACHE_MAX_BYTES` (Open 1). Serves 2. Can run beside
  3.1.

## 4. The store

**What it gives:** the one object the screens of stage 2 read: for each
analysis its state, locked with its reason, ready, running with its
progress, done with its result, removed, or in error; the notice "3
results removed because the MAF filter changed · Undo", with the
calculations it will stop unless the change is undone; popnei's refusals
kept; and, for an opened project, whether a result gives the numbers it
was saved with.

**Deliverables:**

The tests use the fake `send` and the two fake analyses of store's "How
it is verified".

1. The state with no calculation. Check: `npx vitest run
   src/core/store.test.ts -t "the state"` passes at least 7 tests: the
   locked reasons and the analysis ready of the start of "A worked
   sequence"; `popneiReady` twice; `getState` between two changes and the
   state of an analysis that did not change; the case "A command that
   returns the project it was given"; a read recorded into every project
   of the history; `open`, which starts a history with nothing to undo.
2. The calculations. Check: `npx vitest run src/core/store.test.ts -t
   calculations` passes at least 10 tests: from `startRun` to `done` in
   "A worked sequence", with the progress and one result in the cache;
   "A refusal", both halves; the cases "Run asked twice", "A cancel by
   the user, a crash, a restart", "A progress after the end of its
   request", "A result whose key is not its request's key" and a
   `runEnded` of an unknown request, and "An analysis's `run` that
   throws"; the number of variants of a result recorded into every
   project of the history.
3. The notice and the stopping. Check: `npx vitest run
   src/core/store.test.ts -t notice` passes at least 12 tests: "A worked
   sequence" whole; the five parts of "Stopping"; "A late result";
   `dismissNotice` with no notice; the second `popneiReady` with another
   version; `open` stopping the calculations at once with no notice; an
   analysis removed that cannot run shown `locked`, and one done again
   that leaves the notice ("The notice, and the calculations it stops").
4. The check numbers. Check: `npx vitest run src/core/store.test.ts -t
   "check numbers"` passes at least 7 tests: the six results of "The check
   numbers" in "How it is verified", and the case "An opened project whose
   settings are changed and set back".
5. The properties of the store. Check: `npx vitest run
   src/core/store.test.ts -t "properties of the store"` passes the five
   properties of "How it is verified".

**Stands on:** work packages 1, 2 and 3.

**Tasks:** all touch `store.ts` and `store.test.ts`, so they run in
order.

- [ ] 4.1 The types of the state, `createStore`, `getState`, `subscribe`,
  `apply`, `undo`, `redo`, `open`, `popneiReady`, `variantsRead` and
  `individualsRead`, the keys of the analyses made again only when the
  project or the version changes, with the memo, and the states `locked`
  and `ready`; from store's "The state of an analysis", "Commands and
  events", "How it runs" and "The TypeScript interface". Serves 1.
- [ ] 4.2 `startRun`, `cancelRun` and `runEnded`, the client bound to one
  key, the cache and its uses, the warnings, the refusals kept and the
  other failures kept until the next change, and the states `running`,
  `done` and `error`; from store's "The definition of an analysis", "A
  calculation that failed", what `runEnded` does with each outcome, and
  "The cases". Serves 2. Needs 4.1.
- [ ] 4.3 The notice, `dismissNotice`, the three moments a calculation
  left behind is stopped, `afterStop`, the stopping at `open` and at a
  second `popneiReady` of another version, and the state `removed`; from
  store's "The notice, and the calculations it stops" and "The cases".
  Serves 3. Needs 4.2.
- [ ] 4.4 The comparison with the check numbers in the state `done`, from
  store's "The comparison with the check numbers". Serves 4. Needs 4.2.
- [ ] 4.5 The property tests of the store, in a commit of their own: a
  result shown under a key the project does not give, or a calculation
  left behind that is never stopped, would show on no screen. Deliverable
  5 guards it; the first property is shown to fail, once, on a scratch
  store that shows the result of the last key an analysis had, and the
  report says so. Serves 5. Needs 4.3 and 4.4.

**What could go wrong:** store is the longest spec, and the stopping of a
calculation left behind is its subtlest part: which notice names which
calculation after an undo, a redo and a second command. The property
tests need a model of the requests in flight, beside the store, to say
which must have been cancelled. The store has no clock, so no test waits;
a test that needs a timer is testing something the spec does not have.

## At the end

The plan is done when every box is ticked and, on its last commit:

- `npm run format:check`, `typecheck`, `lint` and `build` exit 0;
  `npm test` gives the 68 tests of the probe and those of the five test
  files of `src/core`, with no test skipped; `npx playwright test
  --project=chromium --project=webkit` gives "40 passed", the probe
  unchanged; `npm pkg get dependencies.popnei` prints the URL of the
  release.
- `grep -rnE "Date\.now|new Date|Math\.random|setTimeout|setInterval|\bawait\b|from \"popnei\"" src/core --include="*.ts" --exclude="*.test.ts"`
  finds nothing: the core reads no clock and no random number, waits for
  nothing and calls no popnei (`.claude/skills/coding/SKILL.md`, "The
  core").
- Every case of the six specs' "The cases" and "How it is verified" is
  reached by a test named in a deliverable above, and the report lists
  any that is not, with the reason.
