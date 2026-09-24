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

## 2. The keys

Under way. Started while task 1.4 waits for the owner: the keys stand on
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
