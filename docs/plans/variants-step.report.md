# Report: the Variants step, whole

The work report of the plan `docs/plans/variants-step.md`, stage 3 of
`docs/build-order.md`, carried out from 26 September 2026 on the branch
`plan/variants-step`, which is not merged and not pushed.

## Where the plan stands

Under way since 26 September 2026.

## Before the first task

The branch `plan/variants-step` was made from `main` at 0bb7d78, called
the start below. On the start, on 26 September 2026, on this Mac:

- `grep -rlzE "not yet[[:space:]]+(reviewed nor[[:space:]]+)?approved" docs/specs`
  printed nothing: every spec is approved.
- `git ls-tree -r --name-only main docs/plans/variants-step.md` printed
  the path.
- node 26.8.2; `npm pkg get dependencies.popnei` printed the URL of
  `js-v0.1.0-dev.2`.
- After `npm ci`: `format:check`, `typecheck` and `lint` exited 0;
  `npm test` gave "Tests 1460 passed (1460)" in 41 files;
  `POPNEI_TEST_PAGES=1 npm run build` exited 0, the page's first script
  `popgen-*.js` 123.62 KB gzipped; `npx playwright test
  --project=chromium --project=webkit` gave "348 passed".

## 1. The worker side, in node

The four tasks are committed: 1.1 as 8da15ef, 1.2 as c185d9a, 1.3 as
8227477 (`worker.md`) and baf39a1, 1.4 as 3da9b64. The review is still to
come.

### The deliverables, on 03239aa

| deliverable | command | result | asked |
|---|---|---|---|
| D1 | `npx vitest run src/worker/messages.test.ts -t "VS1 D1"` | 15 passed | 12 |
| D2 | the same, `-t "VS1 D2"` | 22 passed | 14 |
| D3 | `npx vitest run src/worker/runner.test.ts -t "VS1 D3"` | 26 passed | 17 |
| D4 | the same, `-t "VS1 D4"` | 12 passed | 8 |
| D5 | `npx vitest run src/worker/client.test.ts -t "VS1 D5"` | 20 passed | 10 |
| D6 | `npm test`; the browser check; `grep -c "PROTOCOL_VERSION = 2" src/worker/messages.ts` | 1669 passed in 46 files; 348 passed; 1 | 348; 1 |

The lines of existing tests that changed, each with the part of a spec
that asks for it:

- `numVars` and `numVarsRead` replaced by `passStats` in the tests of the
  runner, the messages, the client, the diversity, `apps.ts` and the
  project file: `runner.md` and `protocol.md`, "Every result holds
  passStats".
- `individualFilters` replaced by `individuals: null` in the jobs of four
  test files, and the arbitrary of the filters of individuals of stage 2
  removed: `protocol.md`, a job carries their list.
- Protocol 1 changed to 2 in the `ready` messages, and the tests of
  another version moved from 2 to 3, the test of `client.test.ts` at line
  925 among them: `messages.md`, "The version", and `client.md`.
- The kinds of a message to the runner now `open`, `run` and `write`:
  `messages.md`.
- The test of the runner "a filter of individuals is badRequest" now
  sends an empty list: `runner.md`, an empty list is `badRequest`.
- The helpers of the tests of the runner and of the diversity narrowed to
  the diversity's job and result, since the unions of `protocol.md` now
  have four members.
- The properties of the client draw writes, and check their answers and
  files: `client.md`, "How it is verified".

### What was decided without the owner

- Two refusals the spec gives no kind for, a `numBytes` other than the
  size of the file and a `variantChecks` job with a filter, are both
  `wrongLength` (task 1.1).
- A write that ends in `reopenFailed` does not start the worker again,
  as the table of `client.md` has it; the text of `client.md` does not
  say so, and gets the sentence at the review (task 1.4).

## 2. The core of the filters

The four tasks are committed: 2.1 as 6e00bbe, 2.2 as a81fbfa (the
spec), d9ed542 (the fixture) and 051c2d0, 2.3 as 239c87a, 2.4 as
03239aa. The review is still to come.

### The deliverables, on 03239aa

| deliverable | command | result | asked |
|---|---|---|---|
| D1 | `npx vitest run src/core/project.test.ts -t "VS2 D1"`; `grep -rlw moveVariantFilter src` | 18 passed; nothing | 13; nothing |
| D2 | `npx vitest run src/core/individualsKept.test.ts -t "VS2 D2"` | 16 passed | 9 |
| D3 | `npx vitest run src/core/keys.test.ts -t "VS2 D3"` | 15 passed | 4 |
| D4 | `npx vitest run src/core/histogram.test.ts src/core/fileNames.test.ts src/core/writeEstimate.test.ts -t "VS2 D4"` | 25 passed | 24 |
| D5 | `npm test` | 1669 passed | |

The lines of existing tests that changed, for D5:

- The three tests of `moveVariantFilter` and its rows in the tests of the
  commands removed: `project.md` removes the function.
- The worked case of `project.md` of stage 2 replaced by that of stage 3,
  and "setVariantFilter of a new kind puts it last" now "… in the fixed
  order": `project.md`, the fixed order of the filters.
- 17 tests of the lists now call `individualListNeeds` in place of
  `projectNeeds`, with the endings of `project.md`, Open 2.
- The sample project of `testSupport.ts`, the generator of the filters of
  the variants and the fixture `v1-vcf-pending.popnei.json` put in the
  fixed order, which `parseProject` now demands. The fixture was never on
  GitHub, and no file the application of stage 2 wrote had two filters of
  the variants, so no saved project is refused (`projectFile.md`, the
  owner's decision of 26 September 2026).

### What was changed in the plan

- The check of D1, `grep -rln moveVariantFilter src`, became
  `grep -rlw`: the first matches `removeVariantFilter`, which the spec
  keeps, and could never print nothing.
- `individualsKept.md` now asks for popnei's numbers of `panel.nei` in a
  test of core, from a fixture written by `e2e/fixtures/make_fixtures.mjs`
  (`e2e/fixtures/panel_individual_stats.json`), as task 2.2 said.

### For the owner, at stop B

- With a variants file of one individual, the reason of the lock would
  read "keep none of the 1 individuals". Recommended: "keep the one
  individual of panel.nei".

## The review of work packages 1 and 2

Reviewed together, over 8da15ef to 03239aa, by the reviewers `spec`,
`stale`, `errors`, `api` and `architecture`, reading at the commit
while other tasks built beside them, and then by `tests`, on a copy of
the tree at 5185538 outside the worktree, so that its changes to the
code could not reach the tasks running there. No reviewer found a
wrong or stale number on the screen.

What was fixed, each with a test that failed first where one could:

- A written file whose size is not its message's was described in the
  console, and in the words of an error of the application, as "the
  list result.numBytes … has 3000 elements": a kind `wrongSize` of its
  own, in `messages.md` first (a4548fb, 3213f33). Found by three
  reviewers.
- Two checks of the counts of a pass had no test (c88cdf8).
- Nothing tied the fixture of popnei's statistics of `panel.nei` to the
  release: a runner test now compares them, and section 4 of
  `docs/architecture.md` and `runner.md` say so (3979688, a87258b,
  86f2502).
- Two doc comments that no longer said what the code does (f595d71);
  the revision note of `individualsKept.md` (dae2f05); "at or above"
  in `writeVariants.md` (1057a4c); the refused reopening of a write in
  `client.md` (20fc0e6); "1 byte" in place of "1 bytes" (8eb0234,
  060a857).
- The tests reviewer made 150 changes to the code, 124 of which failed
  a test. Seven tests were added for the ones that mattered (49f1faf,
  cf229f0): a list of individuals that begins as the one already
  applied, which would have saved a file of 125 individuals as the file
  of 100; a written file or a refusal under another request's number;
  names of popnei shorter than the file's; an infinite value; the last
  edge of the bins on a range where two ways of computing it differ.

Not taken:

- The count of the variants of the file resting on the order of the
  keys of the counts: `numVarsOf` was a bridge, and task 3.5 replaced
  it with a count that reads each filter by its kind.
- Two functions that write a size, in core and in the Variants step,
  "251 KB" and "251.0 kB" for one file: left for task 5.3, which joins
  the step to the writing and keeps core's.

The deliverables after the fixes, on cf229f0: VS1 D1 15, D2 23, D3 30,
D4 13, D5 21 tests; VS2 D1 18, D2 17, D3 15, D4 28.

### How the work of 1 and 2 went, for whoever revises a skill or a plan

- The tasks' own count of the rules broken and caught was 196 of 198;
  the tests reviewer's own changes found 9 that mattered among 26 that
  passed. The prompt that asks each task to break its rules halves the
  gap of the walking skeleton, and does not close it.
- The tests reviewer worked on a copy made with `git archive`, so it ran
  beside three tasks with no interference. The code-review skill's rule
  that `tests` runs alone can become "runs on a copy".
- Reviewers that only read were told to read at a commit
  (`git show <commit>:<path>`) while tasks edited the tree; none
  reported files half done.
- Tokens: the eight tasks used between 101,000 and 292,000 each; the
  five reviewers that read, 109,000 to 226,000; the tests reviewer
  162,000; the two fixers 157,000 and 83,000.
