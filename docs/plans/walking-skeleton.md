# Plan: the walking skeleton

25 September 2026, approved by the owner on the same day, with the three
decisions under "In and out"; under way from 25 September 2026.
It builds stage 2
of `docs/build-order.md`, the walking skeleton of section 10 of
`docs/architecture.md`: the smallest population genetics application
that goes through every part once. It builds from the ten specs the
owner approved on 25 September 2026, which the open-points file counts
as eleven and lists as these ten, called below by the short names in
brackets:

- `docs/specs/worker/messages.md` (the messages spec),
- `docs/specs/worker/client.md` (the client spec),
- `docs/specs/worker/runner.md` (the runner spec),
- `docs/specs/worker/individuals.md` (the reader spec),
- `docs/specs/core/projectFile.md` (the project file spec),
- `docs/specs/analyses/diversity.md` (the diversity spec),
- `docs/specs/entry.md` (the entry spec),
- `docs/specs/shell.md` (the shell spec),
- `docs/specs/steps/variants.md` (the Variants step spec),
- `docs/specs/steps/individuals.md` (the Individuals step spec),

and from `docs/specs/stage-2-open-points.md` (the open-points file),
which holds the owner's decisions for stage 2 and, in its section
"Changes to approved files", the changes the ten specs ask of files
approved before them. It is carried out as the
`following-plans` skill says, on the branch `plan/walking-skeleton`,
with its report in `docs/plans/walking-skeleton.report.md`.

When the plan is done, a user opens `popgen.html`, loads `panel.nei` or
a VCF, sets the missing data filter, loads the metadata file as a CSV,
chooses the column of the populations, runs the diversity and reads the
expected heterozygosity, the observed heterozygosity and the proportion
of polymorphic variants of each population; stops a calculation; sees
the table go with its notice when the threshold changes and come back
with Undo; and saves the project file, opens it again, gives the file
again and reads that the numbers are the same.

## In and out

In: every module and screen of the ten specs, `src/core/apps.ts`, the
changes the open-points file asks of approved files, the four
measurements of stage 2 in `docs/build-order.md`, and the times of the
project file and of the keys that the project file spec leaves to the
walking skeleton.

Words used below: a **pass** is one reading of the variants file from
its start, which every calculation of popnei makes; a **flow** is a
Playwright test that goes through the page as a user does; the
**probe** is the technical page of stage 0, `probe.html`, which loads
popnei in a worker, and its 40 browser tests; a **meanwhile** is what the
work follows while an open point waits for the owner.

Out, with where it goes: the other filters, what each filter kept, the
histograms and writing the filtered variants (stage 3); the xlsx, the
files crate, the column types set by the user, and a project with no
metadata file run as one population (stage 4); F, the private alleles,
the rarefaction, the spectrum and `calcPopDiversity` (stage 5); the
report, the Python script as a file, the Export step (stage 6); the help
drawer and the setting of the theme (stage 8). The diversity's function
`script`, which gives its lines of the script, is in its module spec and
is built here; nothing calls it until stage 6.

The owner's decisions on this plan, of 25 September 2026, on its
breakdown:

1. **Firefox.** Playwright cannot launch Firefox on this Mac, with or
   without a window, though the owner's own Firefox runs the site (below,
   "Before the first task"). The browser tests of the branch run in
   Chromium and WebKit; the owner tries each screen in Firefox by hand at
   its stop, and does the measurement of point R in Firefox by hand; the
   three engines run on GitHub when `main` is pushed after the merge. So
   no check of this plan is `npm run test:e2e`, which names Firefox and
   fails here on launching it; each is `npm run build && npx playwright
   test --project=chromium --project=webkit`, with a selection.
2. **Point R**, whether an engine reads a variants file changed on the
   disk with no word, is measured in work package 8, the first where a
   calculation runs in a browser, and its result goes to the owner before
   that work package ends (task 8.3).
3. **A Stop in the middle of a calculation** (open point 1 of
   `.claude/skills/coding/testing.md`) is tested on a VCF the test writes
   into its output folder when it runs, never committed, of a size set in
   task 8.3 once a pass is timed in WebKit on this Mac, so that the pass
   lasts at least 3 s. The test writes it in node, with no Python, so that
   it runs on GitHub too. The test presses Stop while the bar shows less
   than 100%, and fails, rather than passing, if the bar is never seen
   below 100%, as on a machine much faster than this one.

The points still open, each with its meanwhile and the task its answer
changes:

- **The kept count in the summary line** (point L; the shell spec,
  Open 1): meanwhile "1,200 variants · 1 filter". Task 9.1.
- **The words of the project file** (point Q; the project file spec,
  Open 1): meanwhile the spec's, judged at the stop 9.6. Another answer
  changes texts and their tests in 6.2 and 6.3.
- **The provisional words of core**, the reasons an analysis cannot run
  (`docs/specs/core/project.md`, Open 2 to Open 6): judged at the stops
  7.5, 8.4 and 9.6. Another answer changes `project.ts` and its tests.
- **Whether a Save stops the browser's question before leaving** (point
  K, to confirm): built so, in task 9.4; the other answer is one line of
  `save` and one test.
- **What the application does in an engine that reads a changed file
  with no word** (point R): meanwhile nothing more than the runner spec's
  table. An answer that changes what the application does is a task or a
  work package of its own, added with the owner.
- **The meanwhiles of stage 1** stay: 200 steps of undo, a cache of 256
  MB until task 10.1 measures it, and the column types lost when the
  metadata file is read again (`docs/specs/core/project.md`, Open 1).
- **axe in the three engines** (`testing.md`, Open 4): it runs in the
  flows here in Chromium and WebKit.

When a task finds a spec too thin to build from, the task stops and the
question goes to the spec as an open point for the owner; the tasks that
do not stand on it go on. A change to a spec is a commit of its own
before the code.

## Before the first task

- **The branch.** `plan/walking-skeleton` is made from `main` once the
  owner has merged `docs/plan-walking-skeleton`, which holds this plan.
  Check: `git ls-tree -r --name-only main docs/plans/walking-skeleton.md`
  prints the path; on 88f44c5 it prints nothing. The checks below are
  then run again on that commit, and give the same counts.
- **node 24 or later.** This machine has node 26.8.2 and npm 11.19.1,
  checked on 25 September 2026.
- **popnei.** On 88f44c5 `npm pkg get dependencies.popnei` prints the
  release `js-v0.1.0-dev.1`; task 1.1 moves it to
  `https://github.com/JoseBlanca/popnei/releases/download/js-v0.1.0-dev.2/popnei-0.1.0.tgz`.
  That release, installed on 25 September 2026 in a folder outside the
  repository and run under node with the script of the runner spec's
  "How it is verified", gave the numbers of that section to the last
  digit: He, Ho and the polymorphic share of p0, p2 and p1 with no
  filter, at 0.05, 0.1 and 1, on `panel.nei` and `panel.vcf.gz`; 1,152
  variants kept at 0.05 and 1,113 at 0.045; and the two calls of
  progress of each file. `version()` gives "0.1.0".
- **The browsers.** On 25 September 2026 Playwright 1.63.0 launched
  Chromium 153 and WebKit 26.6 here; Firefox failed with "Failed to
  launch the browser process", also outside the sandbox, as in stage 0
  (`docs/plans/site.report.md`).
- **The checks on 88f44c5**, after `npm ci`, on 25 September 2026:
  `format:check`, `typecheck` and `lint` exit 0; `npm test` gives "Tests
  634 passed (634)" in 6 files, 20 in `cache.test.ts`, 21 in
  `history.test.ts`, 100 in `keys.test.ts`, 321 in `project.test.ts`, 104
  in `store.test.ts` and 68 in `src/probe/messages.test.ts`; `npm run
  build` exits 0; `npx playwright test --project=chromium
  --project=webkit` gives "40 passed", the probe's tests. `test:files`
  and `build:files` are not there: the files crate comes in stage 4.
- **Every task commits when the checks pass**: `format:check`,
  `typecheck`, `lint`, `test` and `build`, and from task 7.1 on the
  browser tests in Chromium and WebKit, and not only the count of its
  deliverable.
- **How the counts are read.** The tests of a deliverable carry its tag
  at the start of the name of their `describe` block, in Vitest, or of
  their title, in Playwright: `WS7 D3` for work package 7, deliverable 3.
  The prefix is `WS`, for the walking skeleton, because the tests of
  stage 1 already carry `WP1 D3` and the like. A Vitest count is the
  summary line of `npx vitest run <path> -t "<tag>"`, "Tests N passed";
  a tag that selects nothing there gives "N skipped" and exits 0, so the
  number of passed tests is what is read. A Playwright count is the
  summary line of `npx playwright test --project=chromium
  --project=webkit -g "<tag>"`, "N passed", over both engines; a tag that
  selects nothing exits 1 with "No tests found". A Playwright count is
  over both engines, half of it in each, which `--project=chromium`
  alone shows. Every tag below was checked to select nothing on 88f44c5.
- **The large files of the measurements** are made with popnei's
  `crates/popnei/benches/make_big_vcf.py`, run with `uv run --no-project
  --with numpy python make_big_vcf.py <out.vcf> 20000`, which writes the
  VCF of 80,692,954 bytes in under a second here; the `.nei` file of
  19,161,178 bytes is `writeVars` of it, in node. uv is at
  `/opt/homebrew/bin/uv`. They are written outside the repository and
  popnei's checkout is only read.
- **One dependency is added**: `react-aria-components`, which
  `docs/technology.md` names, pinned to the version `npm view` gives in
  task 7.3. Any other is a stop for the owner.
- **The lint of the worker.** `eslint.config.js` refuses an import of a
  runner (`**/worker/runner*`), and `runnerWorker.ts`, the worker's
  script, imports `runner.ts` (the runner spec, "Two files"). Task 7.2
  changes the rule and `configs.md` together, and says so in the report.

## 1. The approved files brought into line with the stage 2 specs

**What it gives:** nothing the user sees. The specs of stage 1, the code
of `src/`, `package.json`, the architecture, the functionality, the
build order and three skills say what the ten specs build on, so no
later task builds on a file that contradicts its spec.

**Deliverables:**

1. The release and the version. Check: `npm pkg get
   dependencies.popnei` prints the URL of `js-v0.1.0-dev.2`, `npm pkg get
   version` prints `"0.1.0"`, and `npm ls popnei` prints `popnei@0.1.0`
   from that URL. On 88f44c5 the first prints the URL of
   `js-v0.1.0-dev.1` and the second `{}`.
2. The tests of stage 1 still pass, with only the changes the open-points
   file names. Check: `npm test` passes, the 68 tests of the probe and
   the 566 of the core among them; `npx playwright test
   --project=chromium --project=webkit` gives "40 passed" on the new
   release; and every line of an existing test, or of
   `src/core/testSupport.ts`, that `git diff 88f44c5 -- 'src/**/*.test.ts'
   src/core/testSupport.ts` shows changed or removed is listed in the
   report beside the item of "Changes to approved files" that asks for
   it. A change that no item names is a finding.
3. `WS1 D3 the additions to project.ts`. Check: `npx vitest run
   src/core/project.test.ts -t "WS1 D3"` passes at least 24 tests:
   `individualsCheck` `null` when either file is not read (2), and its
   found, missing, in the order of the variants file, and rows ignored
   (1); `individualsNeeds` naming the same individuals missing (1); the
   function that escapes a name without cutting it (1); each of the six
   new kinds of refusal of the reader, its words in `individualsNeeds`
   (6) and its acceptance with its fields by the validation of a project
   file (6); the separator in the words of `raggedRow` and
   `unclosedQuote` (2); `"utf-16"` accepted in `found` (1); the words of
   `reopenFailed` from `projectNeeds`, and its reading back by
   `parseSourceError` (2); "a traits file" in the reasons of the
   association application (1).
4. `WS1 D4 the versions of a check`. Check: `npx vitest run src/core -t
   "WS1 D4"` passes at least 4 tests: a check read with its two versions,
   and one without them refused; a reference read without versions;
   `verdictOf` comparing the versions of the check.
5. The types. Check: `npm run typecheck` and `npm run lint` exit 0 with
   `Job`, `JobResult`, `DiversityJob`, `DiversityResult` and `Pops`, the
   four fields of `Progress`, `reopenFailed` and the six kinds in
   `protocol.ts`; a scratch line `export type Scratch = File;` in
   `protocol.ts` fails the typecheck, and is removed; `grep -n "readonly
   done: number" src/worker/protocol.ts` finds nothing, where it finds a
   line on 88f44c5.
6. The documents. Check: every item of "Changes to approved files" for
   `architecture.md`, `functionality.md`, `build-order.md`, `history.md`,
   `store.md`, `protocol.md`, `project.md`, `worker.md`, `testing.md` and
   `react.md` is found in the diff and listed in the report with its
   commit; and these searches, each of which finds nothing on 88f44c5,
   find at least one line: `grep -c reopenFailed` of
   `docs/architecture.md`, `.claude/skills/coding/worker.md`,
   `docs/specs/worker/protocol.md` and `docs/specs/core/project.md`;
   `grep -c runnerWorker` of `docs/architecture.md` and `worker.md`;
   `grep -c "below 0.95" docs/functionality.md`. And `grep -n 'kind:
   "files"; files' .claude/skills/coding/worker.md` and `grep -n "Open a
   project and lose" docs/specs/core/history.md` find nothing, where each
   finds a line on 88f44c5.

**Stands on:** what "Before the first task" lists.

**Tasks:**

- [x] 1.1 `package.json`: the release `js-v0.1.0-dev.2` and `"version":
  "0.1.0"`, and the lock file; the open-points file, "`package.json`".
  Serves 1, and 2 for the probe.
- [x] 1.2 The approved specs of stage 1, in one commit before the code:
  `docs/specs/worker/protocol.md`, `docs/specs/core/project.md`,
  `store.md` and `history.md`, by their sections of "Changes to approved
  files". Serves 6. Needs 1.1.
- [x] 1.3 The code: `src/worker/protocol.ts`, `src/core/project.ts`,
  `store.ts` and `testSupport.ts` (`TEST_DEFS`, and checks drawn with
  their versions), from the specs of 1.2. One task, because a new kind
  in `protocol.ts` does not compile until the lists of kinds in
  `project.ts` know it. `Grouping` and the lock on no metadata file stay
  as they are, the grouping of the individuals and the lock of the
  analyses while there is no metadata file, since both change in stage 4. Serves 2 to 5. Needs 1.2.
- [x] 1.4 The documents and the skills: `docs/architecture.md`,
  `functionality.md`, `build-order.md`, and `worker.md`, `testing.md`
  and `react.md` of `.claude/skills/coding/`, by their sections of
  "Changes to approved files". Serves 6. Can run beside 1.1 to 1.3.

**What could go wrong:** the change of `Check` and `Reference` reaches
the generator of whole projects, the largest piece of test code of stage
1; its round trip has to hold on the versions of each check.

## 2. The messages and the worker client

**What it gives:** in the words of work package 7, the page's one door
to the two workers: every file picked is read or said not to be, every
calculation gets its answer, Stop ends a calculation, and a message of
the wrong shape is never used.

**Deliverables:**

1. `WS2 D1 the messages accepted`. Check: `npx vitest run
   src/worker/messages.test.ts -t "WS2 D1"` passes at least 17 tests: a
   message of each kind of the messages spec's "Every kind is accepted",
   the `open` of a VCF and of a `.nei` file, a diversity `run`, its
   `progress` and its `result`, `opened`, `refused`, `reopenFailed`,
   `crashed`, `badRequest`, the `ready` of each worker, `readIndividuals`,
   and an `individuals` read and refused; and its two properties over
   `structuredClone`.
2. `WS2 D2 the messages refused`. Check: the same file, `-t "WS2 D2"`,
   at least 22 tests: each refusal of "Each refusal" (18), "The version"
   (3) and `describeMessageError` (1).
3. `WS2 D3 the client`. Check: `npx vitest run src/worker/client.test.ts
   -t "WS2 D3"` passes at least 32 tests, from the client spec's "How it
   is verified": the worked sequence (1); the load (3); cancelling (6);
   the reopen that fails (4); progress (2); a defect of the page (4); one
   for each row of the table of "Crashes, defects, and every read
   answered" (7); starting (5).
4. `WS2 D4 the properties of the client`. Check: the same file, `-t "WS2
   D4"`, passes the five properties of that section; the one "no worker
   is sent a second `open`" is shown to fail, once, on a scratch client
   that sends the `open` again after a restart that already sent it, and
   the report says so.

**Stands on:** work package 1.

**Tasks:**

- [x] 2.1 `src/worker/messages.ts`, from the messages spec's "The
  TypeScript interface", "The checks" and "Job and JobResult", with the
  checks of the diversity's job and result from the fields of the
  diversity spec's "The TypeScript interface". Serves 1 and 2.
- [x] 2.2 `src/worker/client.ts`, from the client spec's "What it does"
  and "The TypeScript interface", with fake workers that keep a message
  posted after `terminate`. Serves 3. Needs 2.1.
- [x] 2.3 The property tests of the client, in a commit of their own: a
  request answered twice, or never, would show on no screen of the
  tests of the other work packages. Serves 4. Needs 2.2.

**What could go wrong:** when `onPopneiReady` is called for a worker
started again, after its `open` and not at its `ready`, is the subtlest
rule of the client spec; the worked sequence asserts it step by step.

## 3. The runner, in node

**What it gives:** the diversity of the panel of work package 8,
calculated by popnei over the filters of the job and the populations in
their order, and the right answer for each way a file or a calculation
fails.

**Deliverables:**

1. The fixtures of the populations. Check: `e2e/fixtures/panel_pops.txt`
   is byte for byte popnei's `tests/reference/stats/panel_pops.txt`
   (`cmp` exits 0), and `e2e/fixtures/panel_pops.csv` has 201 lines, the
   first `IID,popcat`; neither file is on 88f44c5.
2. `WS3 D1 the open and the diversity`. Check: `npx vitest run
   src/worker/runner.test.ts -t "WS3 D1"` passes at least 11 tests, the
   runner spec's "In node, at `createRunner`": the open of `panel.nei`
   and of `panel.vcf.gz` (2); the diversity with no filter and at 0.05 on
   each file (4), the numbers of its table compared with `toBe`; the
   progress (1); the boundary (1); a change of the filters (1); a filter
   refused midway (1); the order of the populations (1).
3. `WS3 D2 what goes wrong`. Check: the same file, `-t "WS3 D2"`, at
   least 26 tests: an open again that popnei refuses (1); a file that no
   longer reads, reading, throwing at a run, at an open again and at the
   open of a new runner, given short, and the first 60,000 bytes of
   `panel.vcf.gz` (6); what `told` throws (1); popnei's refusals (4); the
   defects (6); `answerOfThrown` (5); `transferablesOf` (2); and popnei's
   messages that the spec holds as literals compared whole.

**Stands on:** work package 1.

**Tasks:**

- [x] 3.1 `src/worker/runner.ts`: `loadPopnei`, `createRunner` with its
  `open` and its `run`, the filters read from popnei's `steps`, the
  diversity in its five steps, the progress and `transferablesOf`, from
  the runner spec's "Opening the load", "The filters", "The diversity",
  "Progress" and "The result, transferred"; the two fixtures, written by
  `e2e/fixtures/make_fixtures.mjs`. Serves 1, 2, and the part of 3 on
  `transferablesOf`.
- [x] 3.2 What the runner answers when something goes wrong, from "What
  it answers when something goes wrong", in a commit of its own: a
  message of popnei read wrongly turns a file changed on the disk into a
  refusal of its data, and no other test would fail. The throwing and
  the short ranges come from a `FileReaderSync` the test puts in place
  with `vi.stubGlobal`. Serves 3. Needs 3.1.

Work package 3 can run beside work packages 2, 4 and 5.

**What could go wrong:** node keeps a small file it reads inside a
larger shared block of memory, so each fixture is given as a copy, `new
Uint8Array(readFileSync(path))` (the runner spec).

## 4. The reader of the metadata file

**What it gives:** in the words of work package 8, the metadata file
read in the light worker: its table, the encoding, the separator and the
decimal mark it was read with, and the type of each column.

**Deliverables:**

1. `WS4 D1 readCsv`. Check: `npx vitest run
   src/worker/individuals/csv.test.ts -t "WS4 D1"` passes at least 23
   tests, one for each row of the reader spec's table of cases at
   `readCsv`.
2. `WS4 D2 the numbers and the types`. Check: `npx vitest run
   src/worker/individuals -t "WS4 D2"` passes at least 14 tests, the
   cases at `cellNumber`, each text its own test.
3. `WS4 D3 the bytes`. Check: `npx vitest run
   src/worker/individualsFile.test.ts -t "WS4 D3"` passes at least 10
   tests, the cases at `readIndividualsFile`: Windows-1252, UTF-8 with
   its mark, UTF-8 set on a Windows-1252 file, UTF-16 little and big
   endian, UTF-16 with Windows-1252 set, the two files that are not text,
   a file too large whose bytes are never asked for, and one the browser
   cannot read.
4. `WS4 D4 the properties of the reader`. Check: the same path as 2, `-t
   "WS4 D4"`, passes at least 4 properties, those of the reader spec's
   "How it is verified", with the separator set and with "auto" apart.

**Stands on:** work package 1; task 4.3 also on task 2.1.

**Tasks:**

- [x] 4.1 `src/worker/individuals/columnTypes.ts`, from the reader
  spec's "The decimal mark and the numbers", "The types of the columns"
  and "When a type is wrong, in stage 2". Serves 2.
- [x] 4.2 `src/worker/individuals/csv.ts`, from "The separator", "The
  rows and the cells" and "The refusals and their words". Serves 1.
  Needs 4.1, since the table of cases asserts the types.
- [x] 4.3 `src/worker/individualsFile.ts` and `src/worker/filesRunner.ts`,
  from "The bytes and the encoding" and the runner's paragraph of "The
  TypeScript interface", and the properties. `filesRunner.ts` is checked
  in the browser, in work package 8. Serves 3 and 4. Needs 4.2 and 2.1.

Work package 4 can run beside work packages 2, 3 and 5.

## 5. The diversity in core, and the list of the application

**What it gives:** the diversity as the store knows it: the key of its
result, why it cannot run, the job it sends, its warnings, its check
numbers, the rows and the CSV of its table; and `src/core/apps.ts`, the
analyses, the steps and the first project of the population genetics
application.

**Deliverables:**

1. `WS5 D1 the example and the reasons`. Check: `npx vitest run
   src/core/analyses/diversity.test.ts -t "WS5 D1"` passes at least 11
   tests: the worked example of the diversity spec's "How it is
   verified" (1); `needs`, one for each row of "Why it cannot run", the
   filters of individuals with one and with two (6); `populationsNeeds`,
   its three kinds and `null` (4).
2. `WS5 D2 the key`. Check: the same file, `-t "WS5 D2"`, at least 17
   tests: one for each of the 15 rows of "What goes into its key", and
   `keyInputs` of an empty project and of one whose reads are pending,
   without reading `p.variants` (2).
3. `WS5 D3 the rest of the module`. Check: the same file, `-t "WS5 D3"`,
   at least 21 tests: `parseOptions` (9), `warnings` (5), `script` (1),
   `diversityCsv` (2), `refusalText` (4).
4. `WS5 D4 apps.ts`. Check: `npx vitest run src/core/apps.test.ts -t
   "WS5 D4"` passes at least 3 tests, the entry spec's item `apps.ts`.

**Stands on:** work package 1.

**Tasks:**

- [x] 5.1 `src/core/analyses/diversity.ts`, from the diversity spec's
  "The module", and `src/core/apps.ts`, from the entry spec's
  "`src/core/apps.ts`". Serves 1, 3 and 4.
- [x] 5.2 The tests of the key, in a commit of their own: a key that
  misses an input shows the table of other settings as current, and no
  other test would fail. A row is shown to fail, once, on a scratch
  `keyInputs` that sorts the rows of the table, and the report says so.
  Serves 2. Needs 5.1.

Work package 5 can run beside work packages 2, 3 and 4.

## 6. The project file

**What it gives:** in the words of work package 9, the file Save
project writes and Open project… reads, and the words that say, after an
opening, which variants file to give, how the one given differs, and
whether the numbers of a new run are the same.

**Deliverables:**

1. `WS6 D1 what is written`. Check: `npx vitest run
   src/core/projectFile.test.ts -t "WS6 D1"` passes at least 16 tests:
   one for each of the 8 rows of "What is written of each part", one for
   each of the 5 rules of the check numbers of the project file spec's
   "How it is verified", and the 3 of "The writing".
2. `WS6 D2 the opening`. Check: the same file, `-t "WS6 D2"`, at least
   25 tests: each of the three fixtures of version 1, under
   `src/core/fixtures/projectFile/`, opened into its literal project (3)
   and written back byte for byte (3); each refusal of "Each refusal"
   (14); the texts of `notJson`, `newerFormat` and a `header` error whole
   (3); the byte order mark (1); the fingerprints (1).
3. `WS6 D3 the comparisons`. Check: the same file, `-t "WS6 D3"`, at
   least 12 tests: one for each kind of `IdentityDifference` (8), the
   warning of `docs/functionality.md` whole (1), `askedFileText` (1),
   `checkVerdictText` of each verdict (2).
4. `WS6 D4 the properties of the project file`. Check: the same file,
   `-t "WS6 D4"`, passes the three properties of the spec.

**Stands on:** work package 1, for `TEST_DEFS` and the versions of a
check.

**Tasks:**

- [x] 6.1 `writeProjectFile` and `projectFileName`, and the three
  fixtures, from the project file spec's "What the file holds", "What is
  written of each part" and "Writing". Serves 1. The fixtures are
  written by hand from the spec's example, not by the code they check.
- [x] 6.2 `readProjectFile`, `ProjectFileError` and
  `projectFileErrorText`, from "Opening" and "The versions of the
  format". Serves 2. Needs 6.1.
- [x] 6.3 `compareIdentity`, `identityWarning`, `askedFileText` and
  `checkVerdictText`, from "The comparisons after an opening", and the
  properties. Serves 3 and 4. Needs 6.2.

Work package 6 can run beside work packages 2 to 5, 7 and 8.

## 7. The page, its two workers, and the Variants step

**What it gives:** the user opens `popgen.html` and sees the frame of
the application with its three steps; in the Variants step picks a
`.nei` file or a VCF, sets how a VCF is read, and sees the individuals
and the ploidy of the file, or why it could not be read; sets the
missing data filter. An error of the page's own code shows in a bar at
the top. It is the first time the calculation worker runs in a browser.

**Deliverables:**

1. `WS7 D1 the entry, in node`. Check: `npx vitest run src/ui -t "WS7
   D1"` passes at least 29 tests, the entry spec's "How it is verified"
   in Vitest but `createSaving`, which is work package 9's: the rule of
   the reads (4); cancelled (7); each row of the table of the outcomes
   and no second request after `workerFailed` (6); `wantedReads` (1);
   `startAnalysis` (4); `addFile` (1); `createDefects` (4);
   `isResizeObserverNoise` (2).
2. `WS7 D2 the page in the browser`. Check: `npx playwright test
   --project=chromium --project=webkit -g "WS7 D2"` gives at least 16
   passed, 8 in each engine: the page shows the frame at Variants with no
   error bar, and axe finds no violation of WCAG 2.2 AA; a throw from a
   handler, and a rejection with nothing to handle it, each show the bar
   as an alert (2); a second error adds "1 more error followed it." (1);
   a throw inside the calculation worker, outside a request, starts it
   again and shows no bar (1); the entry's file answered 404, and with a
   file of bad syntax (2); the links of the stepper change the step and
   the title, the back button goes to the step before, and the focus is
   on the `<h1>` of the new step (1).
3. `WS7 D3 the Variants step`. Check: the same, `-g "WS7 D3"`, at least
   18 passed, 9 in each engine, from the Variants step spec's "How it is
   checked": `panel.nei` picked with the button, 200 individuals and
   ploidy 2 on the card, and then a file dropped, with the focus on the
   button after each (2); `panel.vcf.gz` and the line of how it was read
   (1); another file picked, which replaces the first (1);
   `tetraploid.vcf.gz` with ploidy 2, 12 individuals and ploidy 2 (1);
   the ploidy set to 4 and "Read tetraploid.vcf.gz again with ploidy 4",
   ploidy 4 on the card (1); `bad.vcf` and its reason (1); `panel.txt`
   and its message (1); 0.125 typed in the threshold, refused and 0.1 kept, by the owner's decision of 25 September (1); and
   axe in each state reached.
4. The build. Check: `npm run build` writes `dist/popgen.html`, and
   `ls dist/assets | grep -cE "runnerWorker|filesRunner"` gives at least
   2; on 88f44c5 neither exists.
5. The screenshots of the Variants step, light and dark, from `npm run
   screens`: no file, with its options and its filter; reading; a `.nei`
   file read; a VCF read; `bad.vcf` refused; a file of another name not
   loaded. Check: each PNG is in `screens/`, and the orchestrator has
   looked at each.
6. The owner accepts the Variants step (task 7.5).

**Stands on:** work packages 2, 3, 4 and 5.

**Tasks:**

- [x] 7.1 `popgen.html` with its start guard, the lines of plain script
  in its `<head>` that tell a browser too old and a page that did not
  load (the entry spec, "The page"), its line in `input` of
  `vite.config.ts`, `APP_VERSION` written by `define`; the entry,
  `src/ui/popgen.tsx`, in the order of the entry spec's "At the opening"
  without the saving, which is task 9.4; `src/ui/store.tsx`,
  `src/ui/defects.ts`, and the error bar of the shell spec's "The error
  bar" without its Save. Serves 1, and 2 on the errors.
- [x] 7.2 The workers in the page: `src/worker/start.ts`,
  `src/worker/runnerWorker.ts` (the runner spec's "Two files" and "The
  worker's script catches the rest"), and `src/ui/reads.ts`, `runs.ts`
  and `files.tsx`, from the entry spec's "Who asks for a read", "The
  outcome of a calculation" and the paragraph on a file the user picks;
  the rule of the lint above. Serves 1, 2 on the worker, and 4. Needs
  7.1.
- [x] 7.3 The frame of the shell: `react-aria-components` added, the
  wrappers of its widgets in `src/ui/widgets/`, `src/ui/tokens.css`; the
  header with the name, the stepper's three links with the step in the
  hash and the title, the `<main>`, and the status region with its
  announcer, `src/ui/shell/status.ts`, whose two tests of the shell spec
  carry the tag `WS9 D1` and are counted there. The states of the steps, Undo and Redo,
  the summary line and the notice are work package 9's. Serves 2. Needs
  7.1.
- [x] 7.4 The Variants step, `src/ui/steps/variants/`, from its spec
  whole but "A project file opened", which is task 9.4; its states in
  `e2e/screens.spec.ts`. Serves 3 and 5. Needs 7.2 and 7.3.
- [ ] 7.5 The owner accepts the Variants step, with its screenshots and
  the running application, in Firefox by hand as well; two rounds
  expected, each a task with its commit and its screenshots taken again.

**What could go wrong:** a `File` read by ranges through
`FileReaderSync` in a module worker built by Vite has been run by popnei
in Chromium alone. If WebKit cannot read it, the tasks go on in
Chromium, the deliverables stay unmet in WebKit, and the question goes
to the owner and back to the runner spec, since the way the runner reads
the file would change. The start guard is plain script
in the `<head>`, which Vite leaves as it is only if it is inline and not
a module.

## 8. The Individuals step and the diversity panel

**What it gives:** the user loads the metadata file as a CSV, sees how
it was read and its columns, chooses the column of the populations and
learns whether every individual of the variants file is in it; runs the
diversity and reads, for each population, its individuals, the expected
heterozygosity, the observed heterozygosity and the proportion of
polymorphic variants; stops a calculation; and downloads the table as
CSV.

**Deliverables:**

1. `WS8 D1 the Individuals step`. Check: `npx playwright test
   --project=chromium --project=webkit -g "WS8 D1"` gives at least 12
   passed, 6 in each engine. Its spec has no section "How it is checked",
   so these come from its states and its words: `panel_pops.csv` loaded,
   the three options it was read with, the columns and their types, and
   no request for any wasm by the light worker in the log of the network
   (1); the column `popcat` chosen and the populations "p0, 48
   individuals", p2 and p1 listed (1); a CSV written by the test without
   12 individuals of `panel.nei`, its reason and the disclosure of the 12
   names (1); a file with a row one cell short, whose reason names the
   separator (1); `pops.xlsx` and its message (1); Remove, and the step
   back to no file (1); and axe in each state reached.
2. `WS8 D2 the diversity on the screen`. Check: the same, `-g "WS8
   D2"`, at least 10 passed, 5 in each engine, from the diversity spec's
   "How it is verified": `panel.nei`, `panel_pops.csv` and `popcat`,
   the reason "Choose the column that defines the populations in the
   Individuals step." before the column is chosen (1); the filter at
   0.05, Run, and the row p0 reads 48, 0.3527, 0.3567, 0.9288 under the
   caption "over the 1,152 variants of panel.nei" (1); the filter at 1,
   Run, and p0 reads 0.3519, 0.3564, 0.9267 (1); at 0.05, the download
   `panel.diversity.csv` holds the text of the spec's "What it shows",
   and the line "Calculated with popnei 0.1.0, in version 0.1.0 of the
   application." is beside it (1); `tetraploid.vcf.gz` read with ploidy
   2 gives the panel's words for a genotype of another ploidy, and read
   again with ploidy 4 runs (1); and axe in each state reached.
3. `WS8 D3 a Stop in the middle`. Check: the same, `-g "WS8 D3"`, 2
   passed, 1 in each engine: the test writes the VCF of the owner's
   decision 3 and a CSV of its individuals, runs the diversity, waits
   for the bar to show a percentage below 100%, presses Stop, and sees
   the panel ready with no table; then loads `panel.nei` and reads the
   row p0 at 0.05.
4. The measurements, in `e2e/measure.spec.ts`, run by a Playwright
   project for each engine, beside `screens` and not part of
   `test:e2e`, in Chromium and WebKit:
   - point R, as the runner spec's "In the browser" has it: the three
     rewrites of a copy of `panel.nei`, each followed by the diversity at
     0.05 and at 1, and what the page showed, with the check that the
     `File` is on the disk;
   - the restart, as the runner spec's "What a restart costs" has it:
     from a new worker's start to its `opened`, a run whose filters
     changed, and a pass, on the VCF of 80,692,954 bytes and the `.nei`
     file of 19,161,178 bytes, made as "Before the first task" says;
   - the metadata file of 10,000 rows in Chromium, as the reader spec's
     "How it runs" has it: the time from the pick to the columns shown,
     and whether a click on the page is answered meanwhile;
   - the time of a pass over the VCF of D3, which sets its size.

   They run in two Playwright projects, `measure-chromium` and
   `measure-webkit`. Check: `npx playwright test
   --project=measure-chromium --project=measure-webkit` passes, and the report
   holds a table of each, with the engine and its version and the
   machine.
5. The screenshots, light and dark: the Individuals step with no file,
   reading, read, refused, with individuals missing, with a column that
   is not in the table; the diversity locked, ready, running with its bar,
   done, done with a warning (`tetraploid.vcf.gz` read with ploidy 4, one
   population of 12 individuals), in error (the ploidy refused), and
   removed. Check: each PNG is in `screens/`, and the orchestrator has
   looked at each.
6. The owner has the result of point R, in all three engines, before the
   work package ends, and accepts both screens (task 8.4).

**Stands on:** work package 7.

**Tasks:**

- [x] 8.1 The Individuals step, `src/ui/steps/individuals/`, from its
  spec, with `individualsCheck` of task 1.3; its states in
  `screens.spec.ts`. Serves 1 and 5.
- [x] 8.2 The frame of every analysis, `src/ui/analyses/AnalysisPanel.tsx`
  with `panels.ts`, and the panel of the diversity,
  `src/ui/analyses/diversity/`, from the diversity spec's "The panel",
  under the `<h1>` "Analyses"; its states in `screens.spec.ts`. The
  words of its removed state come from the store's notice, which
  exists without the shell's toast. Serves 2 and 5. Needs 8.1.
- [x] 8.3 The Stop in the middle and the measurements: the pass over a
  large VCF timed in WebKit first, and the size of D3's file set from
  it; the two projects of the measurements in `playwright.config.ts`,
  with `testing.md`; point R, whose result the orchestrator gives the
  owner at once. For Firefox the orchestrator gives the owner the steps
  in the running application, `npm run dev`: pick a copy of `panel.nei`,
  run at 0.05, rewrite the copy in place with each of three commands it
  writes into the report, its first 130,000 bytes, a byte changed in the
  middle, 4,096 zero bytes added, each through `cat … >` so that the
  file keeps its path, and run at 0.05 and at 1 after each. Serves 3,
  4 and 6. Needs 8.2.
- [ ] 8.4 The owner accepts the Individuals step and the diversity panel,
  in Firefox by hand as well; two rounds expected.

**What could go wrong:** Playwright may give a local browser the file in
memory rather than its path on the disk, and then point R cannot be
measured in that engine; the check by deletion of the runner spec finds
it, and the report says so. A Stop pressed as the last range is read
reaches a run that has ended; the size of the file is what keeps the
test from being flaky.

## 9. The shell whole, and the project saved and opened

**What it gives:** Undo and Redo in the header and on the keyboard, the
state and the reason of each step, the summary line, the notice of
results removed with its Undo or Redo, what a screen reader is told, and
Save project and Open project…; an opened project says which variants
file to give, how the one given differs, and whether a new run gives the
same numbers.

**Deliverables:**

1. `WS9 D1 the words of the shell`. Check: `npx vitest run src/ui/shell
   -t "WS9 D1"` passes at least 52 tests, from the shell spec's "How it
   is checked": `stepStates`, one for each of the 16 rows of the table of
   the stepper, and their order (17); `summaryLine`, the empty project,
   the example and each of the 10 rows of its table (12); `noticeText`,
   each of the 7 rows and three removed with two stopped (8);
   `announcementsOf`, each of the 9 rows of the first table and the 5
   changes that announce nothing (14); the announcer (2).
2. `WS9 D2 the saving`. Check: `npx vitest run src/ui/saving.test.ts -t
   "WS9 D2"` passes at least 4 tests, the entry spec's item
   `createSaving`.
3. `WS9 D3 the shell in the browser`. Check: `npx playwright test
   --project=chromium --project=webkit -g "WS9 D3"` gives at least 20
   passed, 10 in each engine, from the shell spec's "How it is checked":
   the question before leaving, none on a page just opened and one after
   a pick (1); Save project and its dialog, the download of
   `panel.popnei.json`, of `run1.popnei.json`, Cancel, and the question
   after a save and after a change that follows it (2); Open project…
   with `notes.txt`, with a file above 64 MB, and with the saved file
   after a change (3); Undo until nothing is left, the focus on Redo
   (1); F6 reaches the notice (1); Copy the details, the box of text in
   Chromium and the clipboard in WebKit (1); the text of the status
   region after each read of the Variants step (1); and axe in each
   state of the shell spec's "The states".
4. `WS9 D4 the walking skeleton`. Check: `npx playwright test
   --project=chromium --project=webkit e2e/skeleton.spec.ts` gives at
   least 10 passed, 5 in each engine, one test for each sentence of
   `docs/architecture.md` section 10, as `testing.md` has it: the
   diversity of `panel.nei` with `panel_pops.csv` at 0.05, the row p0;
   the threshold set to 1, the table gone and the notice "Diversity
   removed because the missing data filter changed · Undo"; Undo, and
   the row p0 of 0.05 back; a Stop, as in WS8 D3, and a run after it; the
   project saved after a run, opened in a new page, `panel.nei` given
   again, run, and the words of `checkVerdictText` for the same numbers,
   then `panel.vcf.gz` given and the warning of the identity.
5. The screenshots, light and dark: the shell empty, ready, running,
   done, with its notice, with its error bar, with the dialog of Save,
   with the question before an opening, with a project file refused; the
   Variants step after an opening, and with the warning of the identity;
   the diversity with its comparison. Check: each PNG is in `screens/`,
   and the orchestrator has looked at each.
6. The owner accepts the shell, and judges the words of the open points
   Q, K and Open 2 to 6 of the project spec on it (task 9.6).

**Stands on:** work packages 6 and 8.

**Tasks:**

- [x] 9.1 `src/ui/shell/words.ts`, from the shell spec's "What it sends
  and reads", "The stepper", "The summary line", "The notice" and "The
  status region", and the tests of the announcer of task 7.3. Serves 1.
- [x] 9.2 Undo and Redo in the header and on the keyboard, the states
  and reasons of the stepper, the summary line, and the announcements
  from the state, which the entry makes at every change of the store.
  Serves 3 and 5. Needs 9.1.
- [x] 9.3 The notice, React Aria's toast with its action and Close, and
  the line of the diversity panel on a calculation stopped by a new
  variants file. Serves 3 and 5. Needs 9.2.
- [ ] 9.4 `src/ui/saving.ts`, the dialogs of Save project and of Open
  project…, the question before leaving and before an opening, the Save
  of the error bar; "A project file opened" of the Variants step spec;
  the comparison under the diversity's table. Serves 2, 3 and 5. Needs
  9.2 and work package 6.
- [ ] 9.5 `e2e/skeleton.spec.ts`. Serves 4. Needs 9.3 and 9.4.
- [ ] 9.6 The owner accepts the shell, in Firefox by hand as well; two
  rounds expected.

**What could go wrong:** the shell spec leaves open whether React Aria's
`TooltipTrigger` takes a `Link`, and gives what to do if not; the focus
rules of the two dialogs and of Undo and Redo are what axe does not see,
and the `accessibility` reviewer and VoiceOver with Safari do.

## 10. The end of the stage

**What it gives:** the numbers the decisions after stage 2 are made on,
and the application checked whole.

**Deliverables:**

1. The measurements of `docs/build-order.md`, stage 2, written in the
   report with the machine, the engine and its version, each ending in
   the decision it asks of the owner, which is asked with the report at
   the end and does not stop the work:
   - the React Compiler: the duration of React's commits, from its
     `<Profiler>` in a profiling build, in Chromium, for a change of the
     threshold, a result arriving, an undo and a change of step, with the
     metadata file of 10,000 rows loaded;
   - the restart of the calculation worker, from task 8.3;
   - the bound of the cache: the memory of the tab and of its calculation
     worker, from the Chrome DevTools Protocol in Chromium, with the
     `.nei` file of 19.2 MB loaded and the diversity done;
   - the points an SVG plot can hold: the time to draw 10,000, 50,000,
     100,000 and 200,000 points as one path per group, in Chromium and
     WebKit, on a page of `e2e/measure/` that is not part of the site;
   - the time to write and read a project file with 10,000 individuals,
     and to make the key of the diversity, in node.

   Check: each has its table in the report.
2. The whole. Check: on the last commit `npm run format:check`,
   `typecheck`, `lint` and `build` exit 0; `npm test` passes with no test
   skipped; `npx playwright test --project=chromium --project=webkit`
   passes, the probe's 40 among them; `npm pkg get dependencies.popnei`
   prints the URL of `js-v0.1.0-dev.2`; `grep -rnE
   "Date\.now|new Date|Math\.random|setTimeout|setInterval|\bawait\b|from
   \"popnei\"" src/core --include="*.ts" --exclude="*.test.ts"` finds
   nothing.
3. Every item of "The cases" and "How it is verified", or "How it is
   checked", of the ten specs is mapped to a test that reaches it, and
   the report lists any that is not, with the reason.

**Stands on:** work package 9.

**Tasks:**

- [ ] 10.1 The measurements. Serves 1.
- [ ] 10.2 The final checks and the map of the cases. Serves 2 and 3.
  Needs 10.1.

## At the end

The plan is done when every box is ticked, the owner has accepted the
four screens at the stops 7.5, 8.4 and 9.6 and has the measurements, and the report is finished. It
then waits for the owner's order to merge `plan/walking-skeleton` into
`main`; the push of `main` that follows runs the flows in Firefox for
the first time, on GitHub, and a failure there is fixed on `main` before
anything else.
