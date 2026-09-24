# Report: the core, with no screen

The work report of the plan `docs/plans/core.md`, stage 1 of
`docs/build-order.md`, carried out from 24 September 2026 on the branch
`plan/core`. It says what was built, how each deliverable was checked,
what changed on the way and why, and what is asked of the owner.

## Where the plan stands

Under way.

## Before the first task

Checked on 24 September 2026 in the worktree
`.claude/worktrees/plan-core`, on a559619, after `npm ci`:

- The branch: `git ls-tree -r --name-only main docs/specs/core
  docs/specs/worker docs/plans/core.md` lists the five specs of the core,
  the protocol spec and the plan.
- node 26.8.2 and npm 11.19.1.
- `npm pkg get dependencies.popnei` prints
  `https://github.com/JoseBlanca/popnei/releases/download/js-v0.1.0-dev.1/popnei-0.1.0.tgz`.
- `npm ls fast-check` prints `(empty)`.
- `npm run format:check`, `typecheck` and `lint` exit 0; `npm test`
  gives "Tests 68 passed (68)" in one file; `npm run build` exits 0;
  `npx playwright test --project=chromium --project=webkit` gives "40
  passed".

## 1. The project and its commands

Under way.

- Task 1.1, 67df68a: the types of `src/worker/protocol.ts`,
  `src/core/result.ts`, and of `project.ts`, `keys.ts` and `store.ts`,
  with no function; fast-check 4.10.2 added, which brought `pure-rand`
  and nothing else (`npm ls fast-check` prints `fast-check@4.10.2`). A
  scratch line naming `File` in `protocol.ts` failed `npm run typecheck`
  with "error TS2304: Cannot find name 'File'", and was removed. The
  checks exit 0, "Tests 68 passed (68)". `KeyedDef` was left for task
  2.2, which names it.
- Task 1.2, e008c22: `canonical` and `createKeyMemo` in `keys.ts`, and
  the generator of JSON values in `testSupport.ts`. `npx vitest run
  src/core/keys.test.ts -t "WP1 D2"` gives "Tests 21 passed (21)", of at
  least 17: twelve values that are not JSON, where the spec lists ten,
  since a bigint and a symbol are refused too, and a hole in a list and a
  subclass of `Array`. Each group of tests was seen to fail on the code
  broken for it. The spec gave no form for the path in the message of a
  defect; the writer chose a JSON list, the form of `ProjectError.path`,
  and the keys spec says so since 0c84dca, a commit of its own after the
  code rather than before it.
- Task 1.3, b8a8853: the twelve commands, `emptyProject`,
  `analysisOptions` and the check of each value that `parseProject` will
  share, in `project.ts`; the deep freeze, a project written by hand and
  the generator of commands in `testSupport.ts`. `npx vitest run
  src/core/project.test.ts -t "WP1 D3"` gives "Tests 58 passed (58)", of
  at least 50; `npm test` gives 147. Eighteen breaks of the code, one per
  group of tests, each failed its group; one showed that two cases of a
  binary column passed on the error of another column, and they were
  pinned to their own. A VCF load with no read options is refused, as
  the spec's type and its "read options only for a VCF" say. The
  commands copy the fields of the values they are given, so a field the
  type does not have cannot reach the project.
- Task 1.4, in part, a10304a: the three records. `npx vitest run
  src/core/project.test.ts -t "WP1 D4"` gives "Tests 15 passed" so far,
  the cases "Two picks of files" and "A worker that could not start"
  among them. `projectNeeds` and `individualsNeeds` wait for the owner:
  the writer found five sentences a user reads that the spec does not
  write (the way to fix a bad list, how many individuals are named, what
  happened when a worker failed, the ending for a malformed individuals
  file, and which problem is named first), asked on 24 September 2026.
- Task 1.5, 45ac949: `parseProject`, `projectErrorText` and the table of
  the fields in words in `project.ts`, and the generator of whole
  projects in `testSupport.ts`. `npx vitest run src/core/project.test.ts
  -t "WP1 D5"` gives "Tests 58 passed", of at least 25; the round trip
  of every drawn project through its JSON held on seven runs. Thirty-one
  breaks, each failing its tests. The spec gives the pattern of the
  texts and one worked example, and asks for the table in the code; the
  words of each field are the writer's within that pattern, to be read
  in the review of this work package. `fc.record` draws objects with no
  prototype, which `toStrictEqual` tells from what `JSON.parse` gives,
  so the generators ask for plain objects.

The review of what was built of work package 1, all but `projectNeeds`
and `individualsNeeds`, ran seven categories through four reviewers:
spec with tests, stale with errors, api with architecture, and ux on the
texts a user reads when a project file cannot be opened, 118 of them
printed. The spec changed first, in 5982778; the fixes are 7160be3 to
41ca214, each with tests that failed first. On 41ca214 the checks exit
0 and `npm test` gives "Tests 431 passed (431)"; WP1 D2 gives 27, D3 89,
D4 22 (the records alone), D5 111. What mattered:

- A project file changed by hand with two columns of one name, or an
  individual in two rows, was opened, and the application then crashed
  when the user set the type of a column. `parseProject` now refuses
  such tables, a table with no row or no column, an identifier that is
  not a text, and roles that name a column twice; and a read of the
  individuals file whose table fails these checks is recorded as failed,
  so that a project never holds what its own saved file would refuse.
- Four commands compared the value they were given, not their copy of
  it, so a value with one field more looked different from the same
  value: an undo step that did nothing, or a read of the individuals
  file dropped and the file shown "Reading pops.csv." for ever.
- `setAnalysisOptions` checked neither the analysis nor its options; it
  now takes the analysis with the function that checks its options, as
  `parseProject` does, and a typing mistake in the name of an analysis
  is a defect at once instead of a file that later says it was saved by
  another version.
- A new kind of failure added to the protocol, as the reader of stage 2
  may add, would have made the application refuse its own saved files,
  with every check passing; the lists of kinds are now tied to the
  types, and a new kind fails the compile.
- Options nested 100,000 deep made the reading of a file overflow the
  stack, and a binary column of 80,000 rows took 3.8 s to check; both
  are bounded now.
- The texts showed names of the code ("one of missing_data, maf,
  obs_het, ld"), fields in no words (`the field "reason"`), and a limit
  as 9007199254740991; one set of words now names each kind of filter,
  and a property over every path `parseProject` can give refuses a text
  with a name of the code, an underscore or a number above a million.
- Nothing kept the code of the site from importing the helpers of the
  tests, which would have brought fast-check into the page; the lint
  refuses it now, in `eslint.config.js` and `configs.md`.
- Tests that could not fail: a threshold of exactly 1 refused, the
  options of a CSV compared on the separator alone, the order of the
  fields of the canonical form by the language of the browser.

Decided by the orchestrator, in the spec, since none changes what a
user can do: `loadVariants` and `loadIndividuals` given the load id
already there with other options throw a defect, where they returned
the project unchanged and so kept the results of the old ploidy; a new
read of a file needs a new load id. How the user changes the ploidy of
a VCF already loaded is for the screen of stage 3 to say.

Not taken: the parameters of the functions of an analysis's definition
are checked loosely by TypeScript, so one analysis's result could be
given to another's function with no error of the compiler; that is the
store's, task 4.1. `recordVariantsCounted` records any number popnei
gives; a count that is negative or not whole would come from popnei.

The owner's decisions of 24 September 2026, written into the project
spec in d2bb7f9 before the code:

- The five sentences of the reasons an analysis cannot run are taken as
  provisional: they are the meanwhile of the project spec's Open 2 to
  Open 6, to be judged on the screens of stage 2.
- The texts of a project file that cannot be opened end with what the
  user can do: "The file was changed outside the application, or is
  damaged. Open a copy saved before the change, or make the project
  again." (a5907e3).

- Task 1.4, finished in bc60361: `projectNeeds` and `individualsNeeds`,
  with 48 tests. Forty-five breaks, each failing 1 to 10 tests, among
  them three names shown where four should give "and 2 more", the
  singular lost, and the list to remove checked before the list to keep.
  The writer made seven smaller choices and wrote them into the spec: a
  name written three times is said "twice"; the full stop of popnei's
  message is dropped so the sentence has one; names of individuals cut
  at 40 characters; counts with a comma between thousands; and the
  singulars of "Add it to the file" and "1 cell".

The deliverables, checked by the orchestrator on a5907e3, where the
checks exit 0 and `npm test` gives "Tests 479 passed (479)":

1. `npm run typecheck` and `npm run lint` exit 0; a scratch line
   `export type Scratch = File;` in `protocol.ts` fails the typecheck
   with "error TS2304: Cannot find name 'File'", and was removed.
2. `npx vitest run src/core/keys.test.ts -t "WP1 D2"`: "Tests 27 passed",
   of at least 17.
3. `npx vitest run src/core/project.test.ts -t "WP1 D3"`: "Tests 89
   passed", of at least 50.
4. `npx vitest run src/core/project.test.ts -t "WP1 D4"`: "Tests 70
   passed", of at least 22.
5. `npx vitest run src/core/project.test.ts -t "WP1 D5"`: "Tests 111
   passed", of at least 25.

The review of task 1.4 and of the new ending ran spec with tests, and
ux with stale and errors, on 7e967cb. The spec changed first, in
003b9b2; the fixes are e26fae4 to a29bf15, each with tests that failed
first, and WP1 D4 gives 120 tests. What mattered:

- A read of the individuals file that failed in a crash of the worker
  stayed on the screen after the same read, asked again, succeeded:
  with the options changed and set back, "pops.csv could not be read"
  would have stayed. A read now replaces a failure of the worker, for
  either file.
- Names were shown with backslashes they do not have (`ind \"7\"`), cut
  inside an escape, and a character that turns text right to left was
  shown raw, which would have turned the rest of the sentence beside the
  Run button; now only hidden characters are escaped, in names of
  individuals, of columns and of files. An empty name gave "names
  twice."; it is "an empty name" now.
- A name written three times was said "twice"; it is "more than once"
  now, a change of wording of the owner's provisional text, which the
  spec records.
- The writing skill advised, in an example, a filter of individuals that
  would not unlock the analysis; the example is corrected.
- Two tests could not fail: the individuals named in the order of the
  file (every fixture was alphabetical) and four cases of the escaping
  and the thousands.

Asked of the owner on 24 September 2026: a crash of the calculation ends
its text with "Reload the page and load it again.", and a reload loses
the whole project; loading the file again in its step is enough.

## 4. The store

Under way.

- Task 4.1, after the spec in 1a6d1db: the state, `createStore`,
  `apply`, `undo`, `redo`, `open`, `popneiReady` and the two records,
  and the states `locked` and `ready`. Its code is in d2851f8, a commit
  of the fixes of the reasons of task 1.4: two subagents worked in the
  one tree at once, and the second's commit took in the first's staged
  files; it was not split. `npx vitest run
  src/core/store.test.ts -t "WP4 D1"` gives "Tests 19 passed (19)", of
  at least 7, with the two things the reviews left for the store: every
  project it takes is frozen, and a read recorded into the history
  leaves two projects that shared a source sharing the new one.
  Twenty-seven breaks, each failing 1 to 18 tests. The reasons an
  analysis cannot run are computed once per project, 8 ms at 100,000
  individuals in node, rather than once per analysis. That one
  analysis's result reaches only its own definition's functions is kept
  by a rule of the spec, and two definitions of one id make
  `createStore` throw, rather than by the types.
- Task 4.2, 3b1fa65, after the spec in 805fe86: `startRun`, `cancelRun`
  and `runEnded`, the cache, the warnings, the refusals and failures,
  and the states `running`, `done` and `error`. `npx vitest run
  src/core/store.test.ts -t "WP4 D2"` gives "Tests 16 passed", of at
  least 10, with the test that a result reaches only its own analysis's
  warnings, and a key from a worker that is not a key: the request is
  out of those in flight, and the screens told, before the defect is
  thrown. Twenty-eight breaks, each failing 1 to 8 tests; one passed
  at first, and its test was made stronger. The smaller choices written
  into the spec: a failure other than popnei's refusal is forgotten at
  a command, an undo, a redo or an opening, not at a read of a file; a
  run asked again forgets the failure it retries; a client that sends
  twice is a defect, and what it sent is cancelled.

## 2. The keys

Done on 24 September 2026, and reviewed; the fixes are 9a567f5 to
5351c25. Started while task 1.4 waits for the owner: the keys stand on
the commands and the records, not on the reasons an analysis cannot run
nor on the validation of task 1.5, so tasks 2.2 and 2.3 run before 1.4
and 1.5 end, a change of the order of the tasks.

- Task 2.1, c2d8f49: `sha256Hex` in `keys.ts`, with its encoder of
  UTF-8, from FIPS 180-4. `npx vitest run src/core/keys.test.ts -t "WP2
  D1"` gives "Tests 16 passed", of at least 12, and the hash of the
  example of `canonical` is the spec's literal. Eight breaks of the code,
  one at a time, each failed its tests. A property that draws from the
  whole of Unicode almost never draws a character of two bytes and
  missed the break of those, so a second property draws characters of
  one to four bytes equally.
- Task 2.2, 3a6f7f9, after the spec in 316b948: `keyOf`,
  `intermediateKeyOf`, `settingsFingerprint`, `keyFromWire` and
  `KeyedDef`. `npx vitest run src/core/keys.test.ts -t "WP2 D2"` gives
  "Tests 17 passed", of at least 11; the literal key and the literal
  fingerprint of the spec are reached. The spec named the five parts of
  the key of an intermediate result and not the fields they are written
  under; the writer chose six, with no `analysis` field, so that such a
  key is never that of an analysis, and wrote them into the spec first.
  Fifteen breaks, each failing its tests. The memo of the canonical form
  cannot be seen from the tests, so no break reached it.
- Task 2.3, 9e6aa0f: the property tests of the keys, and the generators
  of projects with a variants file and filters in `testSupport.ts`.
  `npx vitest run src/core/keys.test.ts -t "WP2 D3"` gives "Tests 22
  passed", of at least 4. On a scratch `keyOf` that left out the filters
  of the individuals, the property "a change of individualFilters changes
  the key" failed after 1 test, shrunk 78 times to a definition that
  reads no filter, a project with no filter of the individuals, and the
  other list drawn as `[{"kind":"obs_het","maxAllowedObsHet":0}]`; the
  file was restored. Every key of these tests is made with a memo shared
  across the two projects and compared with one of a fresh memo, so a
  memo that gave one text for every list fails 17 tests. Thirteen more
  breaks, each failing its property.

The deliverables, checked by the orchestrator on 9e6aa0f, where
`format:check`, `typecheck`, `lint` and `build` exit 0 and `npm test`
gives "Tests 217 passed (217)":

1. `npx vitest run src/core/keys.test.ts -t "WP2 D1"`: "Tests 16 passed
   | 60 skipped (76)", of at least 12.
2. `npx vitest run src/core/keys.test.ts -t "WP2 D2"`: "Tests 17 passed
   | 59 skipped (76)", of at least 11.
3. `npx vitest run src/core/keys.test.ts -t "WP2 D3"`: "Tests 22 passed
   | 54 skipped (76)", of at least 4.

After the fixes of the review, on 5351c25, where the checks exit 0 and
`npm test` gives "Tests 272 passed (272)": WP2 D1 18, D2 24 and D3 31
tests passed.

The review ran five categories through four reviewers: spec, tests,
stale, and errors with api. What mattered, all fixed, each with a test
that failed first:

- `setAnalysisOptions` kept the object the screen gave it, where every
  other command copies its argument. A screen that later changed that
  object would have changed the project in place, and the memo of the
  keys, which keeps the text of each object already written, would have
  given the old text: the result of the old options shown as current,
  and undo broken. The command now copies it.
- Nothing kept the project from being changed in place at run time; the
  tests freeze it, the application did not. The memo now keeps the text
  only of an object frozen with all it holds, which it learns while it
  writes the text, at no extra cost; `freezeProject`, new in
  `project.ts`, freezes a project and stops at the parts already frozen;
  and the store, in work package 4, freezes every project it takes. The
  keys, project and store specs say so since ccec5d0. It changes nothing
  a user sees; it makes a mistake of a later screen show as an error
  instead of a stale result.
- Seven tests could not fail: the key and the fingerprint could have
  ignored the ploidy or "only PASS" of a VCF, or the order of the
  filters, and the intermediate key and the fingerprint could have held
  a list of filters the analysis does not read, with every test passing.
  Each was shown with a break, and now fails.
- A value that holds itself overflowed the stack instead of throwing a
  defect with its path; three messages of defects quoted whole texts,
  counted in bytes, or did not name the analysis.

Not taken:

- That `keyFromWire` throws on a bad key from a worker rather than
  returning a failure: the spec asks for it, since both sides are our
  code; that the store takes the request out of those in flight before
  anything throws, so that an analysis is not left running, is already
  in the store spec, and task 4.2 is told.
- Types of their own for the fingerprint and the key of an intermediate
  result: the spec gives them as text, the fingerprint is compared in
  one place, tested by work package 4, and the other goes only to the
  worker.
- The order of the lists of individuals in the key: a list in another
  order costs one calculation, never a stale result.

### How the work went, for whoever revises a skill or a plan

The owner can skip to the next section.

- Every test of the plan's deliverables passed, and the reviewers still
  found seven changes of the code that no test caught. Each writer broke
  its own code once per group, but chose breaks its tests caught. A
  deliverable that lists "a change to each part changes the key" should
  list the changes inside a part too: another ploidy, not only another
  format.
- The memo's rule, "right because the project is never changed in
  place", held only in the tests, which freeze every project. A rule of
  the architecture that the tests make true should be asked of the code
  by the spec.
- The subagent of work package 2 used about 167,000 tokens for its three
  tasks and 142,000 more for the eighteen fixes; the four reviewers used
  between 56,000 and 80,000 each, 285,000 together.

## 3. Undo and the cache

Done on 24 September 2026, and reviewed.

- Task 3.1, 14ef5b7, after the spec in fde6340: `history.ts`, with
  `MAX_UNDO_STEPS` of 200, the meanwhile of the history spec's Open 1.
  `npx vitest run src/core/history.test.ts -t "WP3 D1"` gives "Tests 21
  passed (21)", of at least 10. The spec did not say which bounds
  `startHistory` takes; the writer chose a whole number of at least 1,
  any other a defect, and wrote it into the spec first. Thirteen breaks,
  each failing a test.
- Task 3.2, c38b3fa, after the spec in 1e6b387: `cache.ts`, with
  `CACHE_MAX_BYTES` of 256 MB, the meanwhile of the cache spec's Open 1.
  `npx vitest run src/core/cache.test.ts -t "WP3 D2"` gives "Tests 18
  passed (18)", of at least 12. The writer wrote four choices the spec
  left open into it first: the bound a whole number of at least 0; an
  object met twice in a result counted once, which ends a cycle; the
  texts of a list counted at 2 bytes per unit, and the keys of a `Map`
  not counted; a key given twice to `use` keeping the later number.
  Seventeen breaks, each failing a test; one passed at first because the
  keys of its test read the same backwards, and the test was changed.

The deliverables, checked by the orchestrator on c38b3fa, where the
checks exit 0 and `npm test` gives "Tests 290 passed (290)":

1. `npx vitest run src/core/history.test.ts -t "WP3 D1"`: "Tests 21
   passed (21)", of at least 10.
2. `npx vitest run src/core/cache.test.ts -t "WP3 D2"`: "Tests 18 passed
   (18)", of at least 12.

The review ran five categories through two reviewers: spec with tests,
and stale, errors and api. They found no stale result and no error a
user could meet. What mattered, all fixed in 66a100c and 46db3ea, each
new test seen to fail on the break it guards:

- Four changes of the code passed every test: a cache exactly at its
  bound dropping a result it did not need to, caught only by the draw of
  a property, two runs in six; `mapProjects` losing a bound other than
  200; `use` copying the results it holds, which would redraw every
  screen after each change and double the memory; and the keys of a
  `Map` or the elements of a `Set` counted. WP3 D1 gives 21 tests and
  WP3 D2 20.

Kept for work package 4, where the fix belongs:

- When the store records a read into every project of the history, two
  projects that shared the source of a file each get a copy of their
  own. Undo still gives back the very same project, so nothing is stale,
  but a screen that compares the source would draw itself again. The
  function the store hands to `mapProjects` will make one new source for
  each old one (task 4.1).
- An undo to a project whose individuals file waits for a read that was
  never asked for, or was replaced, stays "Reading pops.csv." unless the
  store asks for the read of the present project after an undo or a
  redo (task 4.1).

Not taken: that a bound of `Infinity` is refused, since the meanwhile of
the history spec's Open 1 is 200; if the owner chooses no bound, the
check changes with the spec.

What the owner should know: if the page ever transfers a result the
cache holds to a worker, rather than copying it, the result goes empty
on the screen; `worker.md` says to copy only for the worker's own cache.
It concerns stage 2.

### How the work went, for whoever revises a skill or a plan

The owner can skip to the next section.

- Told what the review of the keys had found, that a writer chooses
  the breaks its tests catch, the writers of the history and the cache
  still missed four; three were changes at a boundary or of a single
  number (a bound of 200 where the test's bound was 200 too). A test
  whose values equal the defaults of the code cannot see the code
  ignore them; `testing.md` could say so.
- The subagent of task 3.1 used about 99,000 tokens and that of task 3.2
  95,000, and 13,000 more for the four tests of the review; the two
  reviewers used 77,000 and 99,000.
