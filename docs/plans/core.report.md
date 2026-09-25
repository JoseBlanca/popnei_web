# Report: the core, with no screen

The work report of the plan `docs/plans/core.md`, stage 1 of
`docs/build-order.md`, carried out on 24 September 2026 on the branch
`plan/core`.

## Where the plan stands

The plan is done: every task is ticked and every deliverable checked, on
the branch `plan/core`, which is not merged and not pushed. Nothing that
is open blocks the merge: each open point belongs to a later stage.

This stage has no screen, so nothing of it was seen in a browser. The
probe, the technical page of stage 0 that loads popnei in the browser,
still passes its 40 automated tests in Chromium and WebKit, the engines
of Chrome and of Safari.

What exists now that did not, in the folder `src/core`, with 556 tests:

- The project: everything the user sets, changed only by commands that
  make a new project and keep the old one whole, so that undo gives back
  the very same one; what the application read of the user's files; the
  reason, for each analysis, that it cannot run yet; and the reading of
  a saved project file, which refuses a file changed by hand or damaged
  with a sentence that names the field in words.
- The keys: the name under which each result is kept, a hash of
  everything the result was calculated from, so that a result of other
  settings is never shown and one whose settings come back, by an undo,
  is found again with no calculation.
- Undo and redo, 200 steps, and the cache of results, 256 MB, which never
  drops a result the screen shows.
- The store, the one object the screens of stage 2 will read: for each
  analysis whether it is locked and why, ready, running, done, removed
  by a change, or failed; the notice "3 results removed because the MAF
  filter changed · Undo", with the calculations it will stop unless the
  change is undone; the files popnei refused to calculate on, kept so
  that the user is not made to wait for the same refusal twice; and,
  for an opened project, whether a result gives the numbers it was saved
  with.

The reviews found three ways to show a result of other settings, and
all three are fixed: a screen changing an analysis's options in place,
and two mistakes in the code of an analysis leaving the store half
changed (sections 2 and 4).

### What the owner decided at the end

1. **The advice after a crash of the calculation**, 24 September 2026,
   option A. popnei runs in a worker, a second thread of the browser
   tab, so that the page does not freeze. If that worker crashes while
   it opens a file, the reason beside the Run button now says
   "panel.nei could not be read: the calculation stopped unexpectedly.
   Load it again in the Variants step." (or the same for the individuals
   file in the Individuals step), which starts a new worker and keeps
   the project. "Reload the page and load it again." stays only where a
   reload is what helps: the calculations could not start, or the page
   is from before an update of the site. The option not taken was the
   reload everywhere, which loses the whole project. In the spec in
   4ed42f5, in the code in 2cb6e7e.
2. **The merge**: the owner left it to the orchestrator on 25 September
   2026. `plan/core` is merged into `main` and `main` pushed once the
   checks pass on `main`.

### What is open, and where it goes

- The texts of the reasons an analysis cannot run are the owner's
  provisional words of 24 September 2026, open points 2 to 6 of the
  project spec, to be judged on the screens of stage 2. The meanwhiles
  of the plan stay too: 200 steps of undo and a cache of 256 MB (the
  history and cache specs), and the column types the user set lost when
  the individuals file is read again (the project spec's open point 1).
- How the user changes the ploidy of a VCF already loaded: the spec of
  the screen of stage 3 decides it. Until then a new ploidy needs the
  file picked again; the code refuses any other way, so that the results
  of the old ploidy can never be kept by mistake.
- Four points for the specs of stage 2, listed at the end of section 4.

### The words of this report

- **Worker**: a second thread of the browser tab. The calculation worker
  runs popnei; the light worker reads the individuals file.
- **Load id**: a random name the page gives each pick of a file, new at
  every pick, that enters the key instead of the file's contents.
- **Defect**: a mistake of our own code, which stops what it was doing
  and is shown as an error of the application, as against a failure a
  user can meet, such as a damaged file.
- **Canonical form**, **memo**, **fingerprint**: the one text written
  of the inputs of a result before it is hashed into its key; a table
  that keeps that text for parts of the project already written; and a
  hash of the settings alone, saved in a project file so that, once it
  is opened, the application can tell whether the settings are still
  those its saved numbers were made with.
- **Lint**, **typecheck**: the programs that check the code without
  running it, for the rules of the project and for the types.
- **WP1 D2** and the like: work package 1, deliverable 2 of the plan;
  every test of a deliverable carries its tag.
- **A break**: a change made on purpose to the code, to see that a test
  fails; a test that still passes on a break cannot find that mistake.
- **Review categories**: spec, tests, stale (a result of old settings
  shown), errors, api (the names and types others will use),
  architecture, ux (what the user reads), browser.

Times in this report were measured with node 26.8.2 on the owner's Mac,
an Apple M5 Pro, outside a browser; they give orders of size only.

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

Done on 24 September 2026, and reviewed twice: once without the reasons
an analysis cannot run, which waited for the owner, and once with them.

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
   passed", of at least 22; 121 on the last commit, after the review
   below and the owner's last decision.
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
the whole project; loading the file again in its step is enough. The
owner chose to load the file again, with the reload kept where it helps
(4ed42f5, 2cb6e7e; WP1 D4 gives 121 tests).

### How the work went, for whoever revises a skill or a plan

The owner can skip to the next section.

- The spec of the project left five sentences a user reads unwritten,
  "and the same place to fix it" among them; the writer stopped at task
  1.4, as it should, and the plan waited for the owner. A spec whose
  tables give the words of a screen should give every word of them, or
  mark the gap as an open point before the plan is written.
- The writer of the validation read "the table of the fields in words,
  in `project.ts`" as texts it could not write, and wrote them as a
  draft; the spec had delegated them within a pattern. A spec that
  delegates words should say so in those terms.
- Half the findings of the first review were cases of a damaged or
  hand-edited project file, which the spec's list of checks did not
  reach: two columns of one name, an individual twice, options nested
  100,000 deep. The spec of a validation should list what a file changed
  by hand can hold, not only what the application writes.
- The ux reviewer, told to print every text rather than read the code,
  found what the others did not: 118 texts, 14 with names of the code.
  A review of texts should always print them.
- The subagent of work package 1 used about 340,000 tokens for tasks 1.1
  to 1.5 and 210,000 for the 36 fixes of the first review; a second
  subagent used 150,000 for the reasons and 50,000 for their fixes. The
  four reviewers of the first review used between 116,000 and 163,000
  each, 545,000 together; the two of the second, 58,000 and 95,000.

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

## 4. The store

Done on 24 September 2026, and reviewed.

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
- Task 4.3, 3fa2b7c, after the spec in 6692f0e: the notice of results
  removed, `dismissNotice`, the three moments a calculation left behind
  is stopped, `afterStop`, the stops at an opening and at another
  version of popnei, and the state `removed`. `npx vitest run
  src/core/store.test.ts -t "WP4 D3"` gives "Tests 20 passed", of at
  least 16; `npm test` gives 584. Twenty-one breaks, each failing 1 to
  21 tests; "an opening keeps the notice" passed at first, and the test
  of `open` now holds a removed result. The spec said a request is
  marked as coming after a stop when its run stopped a calculation, or
  one already being stopped; the writer marks it whenever any
  calculation is being stopped at that moment, since the new request
  then waits for a worker that starts again in each case. The mark only
  lets the panel say that it may first wait for the file to be read
  again.
- Task 4.4, e8378da, after the spec in 1c99c5f: the comparison with the
  check numbers of an opened project file, in the state `done`. `npx
  vitest run src/core/store.test.ts -t "WP4 D4"` gives "Tests 12
  passed", of at least 7: the six results of the spec, the settings
  changed and set back, other read options giving no comparison, a
  filter the analysis does not read keeping it, and a difference in the
  last digit found. Twelve breaks, each failing 1 to 10 tests. The
  numbers of a result are computed once, when it arrives, and kept with
  it in the cache.
- Task 4.5, c6e3df8: the five properties of the store, over sequences
  of up to 40 commands and events drawn by fast-check, with a model of
  the requests in flight beside the store. On a scratch store that
  showed the result of the last key an analysis had, the first property
  failed after 1 run and shrank 12 times to: run the populations, the
  run ends, the column of the populations changed; the populations
  were shown done with the result of the old column. The store was
  restored. A store that cancelled nothing at `dismissNotice`, or at a
  run, failed properties 4 and 5; one that cancelled a calculation
  whose key an undo gave back passed 100 runs, so properties 4 and 5
  run 1,000 times, where it failed 5 tries in 5. The sequences are drawn
  at their full length, since at the default most had under 5 steps and
  no notice. All five held at 2,000 runs, in 2.5 s.

The deliverables, checked by the orchestrator on c6e3df8, where the
checks exit 0 and `npm test` gives "Tests 601 passed (601)":

1. `npx vitest run src/core/store.test.ts -t "WP4 D1"`: "Tests 19
   passed", of at least 7.
2. `npx vitest run src/core/store.test.ts -t "WP4 D2"`: "Tests 16
   passed", of at least 10.
3. `npx vitest run src/core/store.test.ts -t "WP4 D3"`: "Tests 20
   passed", of at least 16.
4. `npx vitest run src/core/store.test.ts -t "WP4 D4"`: "Tests 12
   passed", of at least 7.
5. `npx vitest run src/core/store.test.ts -t "WP4 D5"`: "Tests 5
   passed", the five properties.

The review ran seven categories through four reviewers: spec, tests,
stale, and errors with api, architecture and browser, the last over the
whole of the core since the plan ends here. The specs changed first, in
e6b3123; the fixes are 1de0fc6 to 867278b, each with tests that failed
first. On them the checks exit 0 and `npm test` gives "Tests 621 passed
(621)"; WP4 D1 gives 22 tests, D2 25, D3 27, D4 13, D5 5, the five
properties holding at 2,000 runs. What mattered:

- A mistake in the code of an analysis, thrown while the store made the
  keys of a change, left the store half changed: its history moved, its
  state did not. A user who went on could then see the result of a MAF
  of 0.42 shown done for a MAF of 0.3, and kept in the cache under that
  key. The store now makes the keys of the new project before it
  changes anything, so such a mistake leaves it as it was.
- A read of a file could change the key of a calculation running, or
  lock its analysis, with no notice naming it: nothing stopped it, and
  the next calculation waited behind it, minutes for an association.
  Since a read is recorded into every project of the history, no undo
  can give that key back, so a read now stops such a calculation at
  once, and a run stops every calculation left behind.
- An error in any function that listens to the store left the others
  unwarned, and in a run left the analysis "running" for ever with Run
  doing nothing. Every listener is now called, and the run is taken out
  and cancelled.
- A mistake while a result was taken in made a calculation of minutes
  end as "ready", with nothing said; it is now kept as a failure, shown
  until the next change.
- A user who closed the notice, or pressed Stop, and then Run was not
  told that the calculation might first wait for the variants file to be
  read again. The mark now holds from a stop until popnei says it is
  ready again, or a calculation ends, which shows the worker was not
  restarting.
- Six tests could not fail, among them the number of variants of a
  result recorded into the file loaded since, and an opening that lost
  the results and popnei's refusals. The property tests reached a stop
  by an undo in 6 sequences of 1,000; they now reach it in 169.
- The lint kept the helpers of the tests out of the core but not out of
  the screens, which stage 2 writes; it keeps them out of both now.

Found right, and not changed: nothing of the core needs a browser newer
than the site's floor, Chrome 111, Firefox 115 and Safari 16.4, by the
tables of `@mdn/browser-compat-data` 8.1.2; the core built for those
targets ran on a page in Chromium 153 and WebKit 26.6.

For stage 2, where each belongs:

- Who asks the light worker to read the individuals file again after an
  undo gives back a project whose read is pending, under options never
  read: the page's entry, whose spec should say it.
- What happens to a calculation left behind when the user loads a new
  variants file, which restarts the calculation worker, while the
  notice says it will be stopped only unless the change is undone: the
  spec of the worker's client.
- A notice caused by an undo should offer Redo, not Undo: the screen's
  spec.
- An error thrown in a click, or in a promise the page awaits, reaches
  no error boundary of React: the page needs a handler of the window's
  errors that shows it.

Each of the four was decided by the owner on 25 September 2026, and is
now written where the next stage reads it: the entry of the page asks
for the read of every pending source after each change
(`docs/architecture.md`, section 6, "Who asks for a read"); a change of
the load of the variants file stops every calculation at once, and the
notice says so (`docs/specs/core/store.md`, built in bd5b538); the
notice offers the reverse of its cause, Redo after an undo (the same
spec); and the bar of an error of the application
(`.claude/skills/coding/react.md`, "Errors").

### How the work went, for whoever revises a skill or a plan

The owner can skip to the next section.

- Two subagents in one tree share its index: while one fixed the
  reasons of task 1.4 and the other wrote task 4.1, the first's commit
  took in the second's staged files. From then on every commit named its
  paths (`git commit -- <paths>`). The `following-plans` skill says one
  writer per file; it should say one index per tree, and ask for commits
  by path when two subagents share one.
- Every one of the five deliverables of the store passed above its
  minimum, and the review still found two ways to show a result of other
  settings and two ways to leave an analysis running for ever. All four
  came from a defect thrown in the middle of a change, which no
  deliverable asked about; a spec of a module that calls code of others
  should say what state a throw of that code leaves.
- The property tests at their default size drew sequences of under 5
  steps and reached a stop by an undo in 6 of 1,000; measuring how often
  each state is reached, as the tests reviewer did, is what showed it.
  `testing.md` could ask a property's writer to measure it.
- The subagent of work package 4 used about 380,000 tokens for its five
  tasks and 95,000 for the 22 fixes; the four reviewers used between
  124,000 and 152,000 each, 556,000 together.

## At the end

Checked by the orchestrator on 25 September 2026, on 2cb6e7e:

- `npm run format:check`, `typecheck`, `lint` and `build` exit 0. `npm
  test` gives "Tests 624 passed (624)" in 6 files, with no test skipped:
  the 68 of the probe, and 556 of the core, 100 in `keys.test.ts`, 321
  in `project.test.ts`, 21 in `history.test.ts`, 20 in `cache.test.ts`
  and 94 in `store.test.ts`, every one under a tag of a deliverable.
- `npx playwright test --project=chromium --project=webkit` gives "40
  passed", the probe unchanged.
- `npm pkg get dependencies.popnei` prints the release,
  `https://github.com/JoseBlanca/popnei/releases/download/js-v0.1.0-dev.1/popnei-0.1.0.tgz`.
- The plan's search of `src/core` for a clock, a random number, an
  `await` or an import of popnei finds nothing.

Every item of "The cases" and "How it is verified" of the six specs was
mapped to the tests that reach it: 62 items, 57 reached by a test of a
deliverable. The five that are not, each for a later stage or another
check:

- Two items of the protocol spec belong to the runner of the calculation
  worker, in stage 2: that a mistake of the runner is `workerFailed`,
  and that the requests hold popnei's arguments. Two more of its cases,
  that only popnei's refusal is of the kind `popnei` and that a refusal
  for lack of memory depends on more than the data, are reached in their
  part of the core, and their part in the runner is stage 2's too.
- That `protocol.ts` names nothing of the browser is checked by the
  typecheck, not by a test, as the spec says of types; it was shown in
  task 1.1, and again at the end of work package 1, with a scratch line
  naming `File`.
- That every analysis has its table of the parts of its key is a test of
  each analysis, in the spec of each, from stage 2; this stage has only
  the two fake analyses of the store's tests.
- The browser tests of the store spec are those of the walking skeleton,
  stage 2.

Two cases were reached only in part, and a test was added for each: that
an undo past the first project tells no screen, and a result dropped by
the bound of the cache and then asked for again by an undo.
