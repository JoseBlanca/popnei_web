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
