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
