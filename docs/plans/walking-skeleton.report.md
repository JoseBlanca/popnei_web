# Report: the walking skeleton

The work report of the plan `docs/plans/walking-skeleton.md`, stage 2 of
`docs/build-order.md`, carried out from 25 September 2026 on the branch
`plan/walking-skeleton`, which is not merged and not pushed.

## Where the plan stands

Under way. The work packages done are written below, one section each,
as they end.

## Before the first task

On 25 September 2026 the owner ordered the merge of
`docs/plan-walking-skeleton` into `main`, which moved `main` from 88f44c5
to 59e46d2, the commit of the plan, and the branch `plan/walking-skeleton`
was made from it. The checks the plan lists were run again there, after
`npm ci`, and gave the plan's counts:

| Check | Result on 59e46d2 |
|---|---|
| `node --version`, `npm --version` | v26.8.2, 11.19.1 |
| `npm pkg get dependencies.popnei` | the URL of `js-v0.1.0-dev.1` |
| `format:check`, `typecheck`, `lint` | exit 0 |
| `npm test` | "Tests 634 passed (634)", 6 files |
| `npm run build` | exit 0 |
| `npx playwright test --project=chromium --project=webkit` | "40 passed" |

## 1. The approved files brought into line with the stage 2 specs

Done as planned, on 25 September 2026, in seven commits, 488d3a6 to
ce71b95. Nothing the user sees changed. The application now names
popnei's release `js-v0.1.0-dev.2` and is itself version 0.1.0. The
specs, code and documents of stage 1 now say what the ten specs of
stage 2 build on.

### The deliverables

| Deliverable | Command | Result on ce71b95 |
|---|---|---|
| 1. The release and the version | `npm pkg get dependencies.popnei version`; `npm ls popnei` | the URL of `js-v0.1.0-dev.2`, `"0.1.0"`; `popnei@0.1.0` |
| 2. The tests of stage 1 | `npm test`; `npx playwright test --project=chromium --project=webkit` | "Tests 673 passed (673)"; "40 passed" |
| 3. `WS1 D3` | `npx vitest run src/core/project.test.ts -t "WS1 D3"` | 34 passed (at least 24 required) |
| 4. `WS1 D4` | `npx vitest run src/core -t "WS1 D4"` | 7 passed (at least 4) |
| 5. The types | `typecheck`, `lint`; `export type Scratch = File;` added to `protocol.ts`; `grep -n "readonly done: number"` | exit 0; "error TS2304: Cannot find name 'File'", line removed; nothing found |
| 6. The documents | the searches of the plan | `reopenFailed` in architecture.md (2), worker.md (4), protocol.md (3), project.md (5); `runnerWorker` in architecture.md (2), worker.md (4); "below 0.95" (1); the two stale phrases not found |

For deliverable 2, the lines of existing tests and of
`testSupport.ts` that were changed or removed, with the item of
"Changes to approved files" that asks for each:

- Item E, the versions moved from the reference to each check:
  `popneiVersion` and `appVersion` in the literal near line 580 and in
  `REFERENCE` of `project.test.ts`, `openedAndRun` of `store.test.ts`,
  `wholeProject` of `testSupport.ts`. The two tests of the reference's
  versions are removed, and the `WS1 D4` tests replace them.
- Item O, the separator: the `raggedRow` literals and their words in
  `project.test.ts`, and its generator in `testSupport.ts`.
- Item P and the new words of `empty`: "Load an individuals file"
  becomes "Load a metadata file" in `project.test.ts` and
  `store.test.ts`; "no row below the header" becomes "no row of
  individuals".
- "utf-16" in `found`: the words of the encoding in `project.test.ts`,
  and `csvFound` in `testSupport.ts`.
- Item C, `Progress`: every `{ done, total }` literal of
  `store.test.ts`.

The test reviewer found that every removed line maps to one of these
items. The only other removed line is an import, which follows the
types.

Deliverable 2 names 566 tests of the core and 68 of the probe, 634 in
all. With the additions of this work package, `npm test` now gives 673.

### What was changed beside the plan

- `individualsNeeds(p)` keeps its one parameter. It takes "a metadata
  file" or "a traits file" from the application of the project, and
  `project.md` and `steps/individuals.md` now say so. The shell spec and
  the diversity spec already called it this way.
- The section of `build-order.md` "Reading files by ranges, when popnei
  gives it" is removed, and its row moved to stage 2, since reading by
  ranges is now in stage 2.
- Open 5 of `project.md`, the ending of the reader's refusals, stays
  open, for the owner to judge on the screens at stop 8.4.

### The review

Five reviewers: `spec`, `tests`, `stale`, `errors` and `api`. None found
a wrong number, or a result shown after its inputs changed. The fixes
are in b3c3ebc and ce71b95:

- A test of the check of the individuals changed the metadata file and
  the variants file at once. So a cache that forgot the variants file
  would have passed every test. The user would then have seen the old
  list of missing individuals after loading another variants file.
  A test now changes the variants file alone.
- Six checks of the code could be removed with no test failing: three
  refusals of a damaged project file, the size limit in the words of a
  file too large, the words of a metadata file that could not be read
  again, and the two versions of a check swapped. Each has a test now.
- A column number past 999 was written "column 1,204". The rule of
  `project.md` now treats it like a line number, with no comma.
- `docs/architecture.md` section 2 had three types that disagreed with
  the code. Two comments of `protocol.ts` were looser than the spec and
  popnei. A marker of Open 5 was lost, and an example of the TypeScript
  skill still used the old `done` and `total` of progress. All are
  corrected.

Not taken:

- Narrowing the core's types of a worker's failure to what each worker
  can give. The spec keeps them wide on purpose, and nothing the user
  sees depends on it.
- Requiring whole numbers for the fields of the reader's refusals in a
  project file. No spec asks for it, and a project file never holds a
  failed read.

### What the owner should know

The numbers of popnei `js-v0.1.0-dev.2` were not measured again here.
The plan's "Before the first task" records them.

The API reviewer noticed that progress divides the bytes read by the
size of the file, which gives no number for a file of 0 bytes. The
runner of work package 3 is told to handle it.

### How the work went, for whoever revises a skill or a plan

The owner can stop reading here.

- The plan's task split worked. Tasks 1.1 to 1.3 went to one subagent,
  about 352,000 tokens, and task 1.4 to another beside it, about 178,000
  tokens. The five reviewers took between 57,000 and 115,000 tokens
  each, and the fixes about 12,000 more.
- The code-review skill sends the reviewers that run code (`spec`,
  `tests`) with a worktree of their own. The owner's instructions for
  this plan forbid that. So the reviewers that only read ran together,
  and `tests`, which breaks the code to see whether a test fails, ran
  alone after them, in the same tree.
- The writer of the code wrote its tests after the code. The mutations
  of the `tests` reviewer found 7 checks no test guarded. The prompt of
  a task should ask for each new test to be seen failing.
