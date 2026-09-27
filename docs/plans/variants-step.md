# Plan: the Variants step, whole

26 September 2026, approved by the owner on the same day, with its new dependencies; under way since then. It builds stage 3 of
`docs/build-order.md`, the Variants step whole, as far as popnei's
release `js-v0.1.0-dev.2` allows: every filter of the variants and of
the individuals, what each filter kept, the histograms of the variants,
the statistics of each individual as a table and as histograms, the
diversity run on the individuals the filters keep, and the writing of
the filtered variants as a `.nei` file that the user saves. It builds on
the revision of `docs/architecture.md` the owner approved on 26 September
2026, and from these twenty specs, called below by their file names:

- core: `docs/specs/core/project.md`, `individualsKept.md`, `keys.md`,
  `store.md`, `cache.md` and `projectFile.md`;
- the analyses: `docs/specs/analyses/individualChecks.md`,
  `variantChecks.md`, `filterCounts.md`, `writeVariants.md` and
  `diversity.md`;
- the workers: `docs/specs/worker/protocol.md`, `messages.md`,
  `runner.md` and `client.md`;
- the plots: `docs/specs/charts/plot2d.md` and `histogram.md`;
- the screens: `docs/specs/steps/variants.md`, `docs/specs/shell.md` and
  `docs/specs/entry.md`;

and from `docs/specs/stage-3-open-points.md` (the open-points file),
which holds the owner's decisions of 26 September 2026 and the one point
still open. It is carried out as the `following-plans` skill says, on
the branch `plan/variants-step`, with its report in
`docs/plans/variants-step.report.md`.

When the plan is done, a user loads `panel.nei` and, in the Variants
step, calculates the histograms of the variants and sets the four
filters of the variants beside them, counts what each filter kept, types
or pastes lists of individuals to keep or remove, calculates the
statistics of each individual and sets the two thresholds beside their
histograms and their table; runs the diversity on the individuals kept;
and writes the filtered variants as `panel.filtered.nei` and saves it.

## The breakdown, for the owner to correct

1. **The worker side, in node** (work package 1, 4 tasks): the messages
   of version 2, the runner's three new passes and its write of a `.nei`
   file, and the client's write with its restart after a large file.
   Stands on nothing. Nothing the user sees changes.
2. **The core of the filters** (2, 4 tasks): the fixed order of the
   filters, the list of the individuals kept, the key of a write, the
   bins of the individuals, the name and the size of a written file.
   Runs beside 1.
3. **The store and the analyses in core** (3, 7 tasks): the three
   analyses of the step, the diversity on the individuals kept, a Run
   that calculates the statistics first, the counts filled from every
   pass, the write tracked with its file, the project file with every
   filter. Stands on 1 and 2.
4. **The histogram** (4, 3 tasks): D3 and jsdom come in; the base of
   the 2D plots, the histogram, and its export tested on a page of the
   tests. Runs beside 1 to 3.
5. **The page joined, and the writing** (5, 4 tasks): the three analyses
   in the application, the words of the shell, the Write and Save
   buttons, and the measurements of the write. Stands on 3.
6. **The filters of the variants** (6, 4 tasks): the four filters, the
   three histograms beside them, the Count. Stands on 4 and 5. Ends at
   **stop A**, where the owner tries the filters of the variants with
   their histograms and counts, and the writing.
7. **The filters of the individuals** (7, 5 tasks): the two lists, the
   statistics with their table and histograms, the two thresholds, and
   the diversity with them. Stands on 6. Ends at **stop B**, where the
   owner tries the filters of the individuals, the diversity with them,
   and the writing of the individuals kept.
8. **The end of the stage** (8, 2 tasks): the whole checked, and every
   case of the twenty specs mapped to a test.

The writing is built before the filters of the individuals, and not
after them, because what it does in a browser is the least known part of
the stage: whether a file made in the calculation worker is still whole
after that worker is ended, which the File API promises and has never
been tried in a browser, and how much memory a write takes, which sets
four constants of the code (the open-points file, "Set by a
measurement"). Built fifth, it is measured before the two screens that
follow, and a failure changes the client before they rest on it. Its
screen is tried at stop A, with the filters of the variants, and again
at stop B with the individuals kept. Tried at stop B alone, the owner
would first see the writing in the last screen of the plan, and a change
asked for there would come after every other screen was accepted.

## In and out

In: every module and screen the twenty specs give, and the measurements
the open-points file lists under "Set by a measurement", each in the work
package that meets it.

Words used below: a **pass** is one reading of the variants file from
its start; a **flow** is a Playwright test that goes through the page as
a user does; the **three analyses of the step** are `individualChecks`,
the statistics of each individual, `variantChecks`, the histograms of
the variants, and `filterCounts`, the counts of what each filter kept; a
**stop** is where the orchestrator waits for the owner to try a screen;
a **meanwhile** is what the work follows while an open point waits for
the owner.

Out, and a later plan, with popnei's release that has them, which the
owner decided on 26 September 2026 to add to popnei: the writer of the
VCF, bgzipped, a second button of the writing; the filter by the regions
of a BED file, with its reader in the light worker, `RegionsSource` in
the project and the hash of the regions in the keys; the histogram of
the proportion of missing genotypes of each variant, beside the missing
data filter; and the density of variants along each chromosome, with
the chromosomes of the file. None of these has a spec yet beyond the
architecture, and that plan starts with them. Also out: the plots offered
as SVG and PNG, and the Python script, both in stage 6, whose lines each
new analysis gives with its `script`, built here and called by nothing
until then; a list of individuals read from a file; the help drawer, in
stage 8.

Every open point of the specs is decided. The last, part of point F,
the owner settled on 26 September 2026: the filters by observed
heterozygosity and the LD pruning are off in a new project, and start,
when turned on, at the values `variants.md` gives.

To be judged by the owner at a stop, each a meanwhile of its spec:
the summary line with the variants and individuals kept (`shell.md`,
Open 1) and the choices of the open-points file, "Choices of a spec the
owner may overrule", at stop A for those of the variants and the writing
and at stop B for those of the individuals; the words that send the user
to fix a list of individuals (point D), at stop B. The open points of
earlier stages stay as they are: the words of the project file
(`projectFile.md`, Open 1), the bound of the cache and of undo, and the
column types lost when the metadata file is read again.

When a task finds a spec too thin to build from, that task stops, with
the tasks that need it, and the question goes to the spec as an open
point for the owner; the rest of the plan goes on. A change to a spec is
a commit of its own before the code.

## Before the first task

- **The plan and the specs approved.** The owner approved this plan,
  with the new dependencies below, and the specs of stage 3 on 26
  September 2026. Check: `grep -rlzE "not yet[[:space:]]+(reviewed nor[[:space:]]+)?approved" docs/specs`
  prints nothing.
- **The branch.** `plan/variants-step` is made from `main`, which holds
  this plan and the approvals. Check:
  `git ls-tree -r --name-only main docs/plans/variants-step.md` prints
  the path; on 1457d80 it prints nothing. The commit the branch is made
  from is called **the start** below, and the report names it under
  "Before the first task". On the start, the checks of the next four
  items, the versions, the browsers, "The checks on 1457d80" and the
  counts of "How the counts are read", are run again and give the same
  results, since the merge adds documents alone.
- **node 24 or later.** This machine has node 26.8.2 and npm 11.19.1,
  checked on 26 September 2026.
- **popnei.** `npm pkg get dependencies.popnei` prints the URL of
  `js-v0.1.0-dev.2`, and no task changes it. On 26 September 2026 the
  script `numbers3.mjs` of `runner.md`, "How it is verified", with the
  list of 119 individuals and the MAF filter at 0.4 added, was run under
  node 26.8.2 on `e2e/fixtures/panel.nei` twice, with the release in
  `node_modules/popnei` and with popnei's local build in
  `/Users/jose/devel/popnei/js/popnei/dist`, and both gave to the last
  digit every number the specs hold: the statistics of each individual
  at 0.05 and the lists of 125, 48 and 119 individuals
  (`individualsKept.md`); the diversity of the 125 and of the 119
  (`runner.md`, `diversity.md`); the three histograms, their means and
  the edges 0.07500000000000001 and 0.9500000000000001
  (`variantChecks.md`, `histogram.md`); the counts of the three filters
  and of the empty pass (`filterCounts.md`); and the written files of
  261,490, 250,994, 176,098, 170,042 and 3,594 bytes
  (`writeVariants.md`). numpy's `histogram` with 20 bins, run with
  `uv run --no-project --with numpy`, gave the counts and the edges of
  `binValues` in `individualChecks.md`.
- **The browsers.** Playwright 1.63.0 launches Chromium (build 1243) and
  WebKit (build 2359) here. It cannot launch Firefox on this Mac, as in
  stages 0 and 2. So no check of this plan is `npm run test:e2e`, which
  names Firefox; each **browser check** is
  `POPNEI_TEST_PAGES=1 npm run build && npx playwright test --project=chromium --project=webkit`,
  with a selection. The variable builds `e2e/plots.html`, the page of
  the tests of the plots, into `dist/` (`plot2d.md`, "How it is
  verified"); `npm run screens` builds without it, so a browser check
  after the screenshots builds again, as the command does. The owner
  tries each screen in Firefox by hand at its stop, and the three
  engines run on GitHub when `main` is pushed after the merge.
- **The checks on 1457d80**, after `npm ci`, on 26 September 2026:
  `format:check`, `typecheck` and `lint` exit 0; `npm test` gives "Tests
  1460 passed (1460)" in 41 files; `npm run build` exits 0, the page's
  first script 123.62 KB gzipped; `npx playwright test
  --project=chromium --project=webkit` gives "348 passed", among them
  **the probe's 40**, the tests of `e2e/probe.spec.ts`, 20 in each
  engine, which check that the probe page of stage 0, `probe.html`,
  still loads popnei. `test:files`
  and `build:files` are not there: the files crate comes in stage 4.
- **Every task commits when the checks pass**: `format:check`,
  `typecheck`, `lint`, `npm test`, and the browser check above, and not
  only the count of its deliverable. A change to the messages reaches the
  page, so the browser check runs from the first task.
- **What a task waits for.** A task waits only for the tasks its "Needs"
  names, and a task with no "Needs" for nothing but the gate; a work
  package's "Stands on" is the union of what its tasks need outside it,
  and says nothing more.
- **Tasks side by side** share the one worktree and its `dist/`, as in
  the walking skeleton. Each runs the format, the types, the lint and
  Vitest on its own files; none runs the build, the development server
  or Playwright while another runs beside it. The orchestrator runs the
  whole tree's checks, the browser check among them, once both have
  committed.
- **When a work package is done**: its deliverables pass, run by the
  orchestrator; its review of the `code-review` skill has run and the
  findings the orchestrator took are fixed, with the deliverables run
  again after the fixes; and, for one with a stop, the owner has
  accepted the screen. The box of its last task is ticked only then.
- **The large files of the measurements** are made in `MEASURE_DIR`, a
  folder outside the repository that the orchestrator sets for each run
  of `e2e/measure.spec.ts`, `MEASURE_DIR=$TMPDIR/popnei-measure`, as
  `testing.md`, "The measurements", has it: the VCF of 80,692,954 bytes
  and the `.nei` file of 19,161,178 bytes of stage 2, and the larger
  files of work packages 5 and 7.
- **How the counts are read.** The tests of a deliverable carry its tag
  at the start of the name of their `describe` block, in Vitest, or of
  their title, in Playwright: `VS3 D4` for work package 3, deliverable 4.
  The prefix is `VS`, for the Variants step, since the tests of stages 1
  and 2 carry `WP` and `WS`. A Vitest count is the summary line of
  `npx vitest run <path> -t "<tag>"`, "Tests N passed"; a tag that
  selects nothing gives "N skipped" and exits 0, so the number passed is
  what is read. A Playwright count is the summary line of the browser
  check with `-g "<tag>"`, over both engines, half in each; a tag that
  selects nothing exits 1 with "No tests found". On 1457d80, `npx vitest
  run -t "VS"` gives "Tests 1460 skipped (1460)", and `npx playwright
  test --project=chromium --project=webkit -g "VS" --list` and the same
  with `--project=measure-chromium --project=measure-webkit` give
  "Total: 0 tests", so every tag below selects nothing there; so do the
  test files the plan adds, which `npx vitest run` of their paths
  answers "No test files found".
- **The new dependencies**, which `docs/technology.md` approved on 24
  September 2026 and `plot2d.md` names, pinned: `d3-selection` 3.0.0,
  `d3-scale` 4.0.2, `d3-axis` 3.0.0; for development `@types/d3-selection`
  3.0.12, `@types/d3-scale` 4.0.9, `@types/d3-axis` 3.0.6 and `jsdom`
  30.1.1, the versions `npm view` gave on 26 September 2026. They bring
  packages of their own that the owner has not named, which the coding
  skill counts as new dependencies: `d3-scale` brings `d3-interpolate`,
  `d3-color`, `d3-time` and `d3-time-format`, modules of D3 outside the
  list of `docs/technology.md`, besides `d3-array` and `d3-format`, which
  are on it; `@types/d3-scale` brings `@types/d3-time`; and `jsdom`
  brings 20 packages directly, which `npm view jsdom dependencies` lists. The
  owner approved these on 26 September 2026, with the plan. Any other
  dependency is a stop for the owner.
- **What every prompt of a task carries**, from the report of the
  walking skeleton, "How the work went": each rule of the spec the task
  builds is broken once on a scratch copy of the code and seen to fail a
  test, and the task's answer says how many rules it broke and how many
  failed a test, since its `tests` reviewers found 12 of 22 changes to
  the reader, and 12 of 30 to the client, passing every test; a point
  for the owner is written with its recommendation when it is found;
  tasks that run side by side each run the checks on their own files,
  and the orchestrator runs the whole tree after them.
- **What every review of a work package carries**, from the same
  report: the reviewers that only read run together, and `tests`, which
  breaks the code, runs alone after them in the same tree; every
  reviewer deletes its scratch files, even when it stops early; the
  keyboard and the focus of a screen are driven in Chromium and WebKit
  by a `general-purpose` subagent, since the `code-reviewer` has no tool
  to write the script that drives a page.

## 1. The worker side, in node

**What it gives:** in the words of work packages 5 to 7, the calculation
worker answers the three analyses of the step and the write of a `.nei`
file with popnei's numbers, puts the list of the individuals kept after
the filters of the variants, gives with every result the counts of its
pass, and is started again after a large file written. Nothing the user
sees changes: the page runs as before on the messages of version 2.

**Deliverables:**

1. `VS1 D1 the messages of stage 3 accepted`. Check: `npx vitest run
   src/worker/messages.test.ts -t "VS1 D1"` passes at least 12 tests,
   from `messages.md`, "Every kind is accepted": a `run` of each of the
   four jobs (4), the diversity's with a list of individuals as well
   (1), a result of each (4), a `write` and its `written` (2), and the
   property over `structuredClone` drawing them (1).
2. `VS1 D2 the messages of stage 3 refused`. Check: the same file, `-t
   "VS1 D2"`, at least 14 tests: each refusal of stage 3 in "Each
   refusal" (11) and in "The version" (3).
3. `VS1 D3 the passes of the runner`. Check: `npx vitest run
   src/worker/runner.test.ts -t "VS1 D3"` passes at least 17 tests, the
   stage 3 list of `runner.md`, "How it is verified", but the written
   file: the statistics at 0.05 and the VCF of two individuals (2); the
   diversity with the lists of 125 and of 119 (2); the steps with the
   list, opened again or not (3); the histograms (1); the counts of the
   three filters, the same with the list, and of the empty pass (3); an
   empty list, `badRequest` (1); and `transferablesOf`, one buffer per
   array of a result of each of the four analyses (4), and a view of
   part of a buffer, which throws (1).
4. `VS1 D4 the written file of the runner`. Check: the same file, `-t
   "VS1 D4"`, at least 8 tests: the five files of "The written file" in
   the same list, their sizes and what `openVars` reads back (5), their
   progress (1), a `told` that throws (1), a `write` before the `open`
   (1).
5. `VS1 D5 the write of the client`. Check: `npx vitest run
   src/worker/client.test.ts -t "VS1 D5"` passes at least 10 tests, from
   `client.md`, "How it is verified": a write (1), a `written` under
   another key, a `result` to a write and a `written` to a run (3), a
   cancel waiting and running (2), the restart after a large write, none
   at exactly 100,000,000 bytes, and after a refusal (3), a `ready` of
   protocol 3 (1); and the properties draw writes, large ones among
   them.
6. The tests before still pass. Check: `npm test` passes, and the
   browser check gives "348 passed"; every line of an existing test that
   `git diff <the start> -- 'src/**/*.test.ts' src/core/testSupport.ts`,
   with the hash of the start that the report names,
   shows changed or removed is listed in the report beside the part of
   the spec that asks for it, the diversity's result with `passStats` in
   place of `numVars` and `numVarsRead` (`runner.md`) and the test of
   `client.test.ts` at line 925 (`client.md`) among them. A change no
   spec names is a finding. `grep -c "PROTOCOL_VERSION = 2"
   src/worker/messages.ts` gives 1, where it gives 0 on 1457d80.

**Stands on:** what "Before the first task" lists.

**Tasks:**

- [x] 1.1 `src/worker/protocol.ts` and `messages.ts`, from `protocol.md`,
  "The TypeScript interface", and `messages.md` whole, with
  `PROTOCOL_VERSION` 2; and what the new types force elsewhere, so that
  the tree compiles and the page works: the diversity's job sends
  `individuals: null`, which is right while its `needs` locks every
  filter of individuals, the lock of stage 2 that task 3.4 removes;
  `numVarsOf` of `src/core/apps.ts` reads the number of variants of the
  file from `passStats`, until task 3.5 puts `countsOf` in its place;
  the runner gives the diversity's `passStats`. Serves 1, 2 and 6.
- [x] 1.2 `src/worker/runner.ts`: the steps with the list of the
  individuals, the counts of every pass, the statistics of each
  individual, the histograms of the variants and the counts of the
  filters, from `runner.md`, "The steps: the file opened again when they
  change", "The counts of every pass", "The statistics of each
  individual", "The histograms of the variants", "The counts of the
  filters", and the rows of "What it answers when something goes wrong"
  that stage 3 adds. A list put before the filters of the variants would
  change their counts with no error, so the tests of the counts with the
  list are part of this task. Serves 3. Needs 1.1.
- [x] 1.3 The write in `runner.ts`, "The written file", and in
  `runnerWorker.ts`, its `write` posted as `written` with no transfer;
  and `.claude/skills/coding/worker.md`, "Reading the files of the user",
  corrected as `messages.md`, "Where this departs from worker.md", asks.
  Serves 4. Needs 1.2.
- [x] 1.4 `src/worker/client.ts`: `write`, the restart after a large
  write and after a refused one, `WRITE_RESTART_BYTES`, from `client.md`,
  "A write, and the restart after a large one", and the rows of the
  table of "Crashes, defects, and every read answered" that stage 3
  adds; the properties with writes. Serves 5. Needs 1.1; can run beside
  1.2 and 1.3.

**What could go wrong:** the comparison of the steps a `Variants` holds
with those of a job, name by name for the list, decides whether the file
is opened again; a rule that opens it again too seldom gives the
counts of other filters with no error, and one that opens it too often
only costs a read of 4 MiB. The client's tests make real `Blob`s of
100,000,001 bytes, 12 ms each in node here (`client.md`).

## 2. The core of the filters

**What it gives:** in the words of work packages 3 to 7, the filters in
their fixed order; a list of individuals that popnei would refuse, told
apart from a variants file not read, so that it locks only what reads the
filters of individuals; the one list of the individuals the four filters
keep, with how many each filter was given and kept; the key of a write;
the bins of the statistics of each individual; the name of the written
file and its size expected.

**Deliverables:**

1. `VS2 D1 the filters of a project`. Check: `npx vitest run
   src/core/project.test.ts -t "VS2 D1"` passes at least 13 tests, from
   `project.md`, "How it is verified": the fixed order of the variants'
   filters (3); `individualListNeeds`, each row with `keep` and with
   `remove` (6), `null` while the file is not read (1), and
   `projectNeeds` `null` for a read file with a bad list (1); the filters
   of the variants out of order refused as `filterOutOfOrder` with its
   text (1); and the property of the fixed order. `grep -rlw
   moveVariantFilter src` prints nothing, where it prints four files on
   1457d80. (Changed on 26 September 2026 from `grep -rln`, which also
   matches `removeVariantFilter`, a function the spec keeps, and so could
   never print nothing.)
2. `VS2 D2 the individuals kept`. Check: `npx vitest run
   src/core/individualsKept.test.ts -t "VS2 D2"` passes at least 9
   tests: the seven cases of the worked case of `individualsKept.md`,
   "How it is verified", popnei's numbers of `panel.nei` at 0.05, 125,
   48 and 119 individuals (1), and the property (1).
3. `VS2 D3 the key of a write`. Check: `npx vitest run
   src/core/keys.test.ts -t "VS2 D3"` passes at least 4 tests: the
   literal of `keys.md`, its canonical form and its key (1), and the key
   changed by the threshold of the individuals and by a filter of the
   variants, and not by the individuals table or the options of an
   analysis (3).
4. `VS2 D4 the bins, the names and the sizes`. Check: `npx vitest run
   src/core/histogram.test.ts src/core/fileNames.test.ts
   src/core/writeEstimate.test.ts -t "VS2 D4"` passes at least 24 tests:
   `binValues`, the two histograms of `panel.nei` at 0.05 against
   numpy's counts and edges, `[0.5, 0.5]`, a NaN, a value on an inner
   edge and the largest, and a `numBins` that is a defect (6); the four
   names of `writtenName` (4); `writeEstimate` as `writeVariants.md`,
   "How it is verified", lists it (9); `sizeText` of its five sizes (5).
5. The tests before still pass, with their changed lines listed as in
   work package 1, the tests of `moveVariantFilter` and the rows of lists
   that leave `projectNeeds` among them.

**Stands on:** nothing but the gate, and task 2.3 on
task 1.1.

**Tasks:**

- [x] 2.1 `src/core/project.ts`: the filters of the variants in their
  fixed order, `VARIANT_FILTER_ORDER`, no `moveVariantFilter`,
  `individualListNeeds` apart from `projectNeeds`, and the refusal of
  filters out of order in `parseProject`, from `project.md`'s parts
  that its opening names. Serves 1 and 5.
- [x] 2.2 `src/core/individualsKept.ts`, from `individualsKept.md`
  whole. A list of the wrong individuals shows on no screen, so this is a
  task of its own. `individualsKept.md` asks for popnei's numbers "in the
  runner's tests", which the lint forbids, since a test of `src/worker`
  may import nothing of core but `result.ts`; the task first changes
  that line of the spec, in a commit of its own, to a test of core that
  reads popnei's statistics of `panel.nei` at 0.05 from a fixture that
  `e2e/fixtures/make_fixtures.mjs` writes with popnei, as it writes the
  other fixtures. That choice changes nothing a user sees, and the report
  names it. Serves 2.
- [x] 2.3 `writeKeyOf` in `src/core/keys.ts`, from `keys.md`, "The key of
  a file written", with its literal: a key that missed a filter would
  let a file of other variants be saved as the one the step shows.
  Serves 3. Needs 1.1.
- [x] 2.4 `src/core/histogram.ts`, from `individualChecks.md`, "The bins
  of its histograms"; `writtenName` in `src/core/fileNames.ts` and
  `src/core/writeEstimate.ts`, from `writeVariants.md`, "The functions of
  core". Serves 4. Needs 2.2.

Tasks 2.1 and 2.2 can run beside work package 1.

**What could go wrong:** the reasons of a list leave `projectNeeds`, and
nothing unlocks meanwhile, since the diversity of stage 2 locks on any
filter of individuals until task 3.4. The edges of `binValues` have to
be the same doubles as numpy's, which the literal edges check.

## 3. The store and the analyses in core

**What it gives:** in the words of work packages 5 to 7, each of the
three analyses of the step as the store knows it, its key, its job, its
warnings, its rows and its CSV; the diversity run on the individuals the
filters keep; a Run that calculates the statistics of each individual
first; the counts beside the filters filled from every pass; the write
tracked with its file until it is saved; and a project file with every
filter.

**Deliverables:**

1. `VS3 D1 the three analyses of the step`. Check: `npx vitest run
   src/core/analyses -t "VS3 D1"` passes at least 16 tests, from the
   "How it is verified" of `individualChecks.md`: the three literals of
   the worked example (3), `run` (1), the CSV (1), `refusalText` of the
   filters that keep no variant and of a genotype of another ploidy (2),
   and the description at 0.03 (1); of `variantChecks.md`: `run`,
   `warnings` and `checkNumbers` (3), and the two descriptions (2); and
   of `filterCounts.md`: `filterCountRows`, `warnings` and `checkNumbers`
   (3). The other rows of `refusalText` add a test each.
2. `VS3 D2 the keys of the three analyses`. Check: the same, `-t "VS3
   D2"`, at least 9 tests: the five rows of the key of
   `individualChecks.md`, and those of `variantChecks.md` (2) and
   `filterCounts.md` (2). A row is shown to fail, once, on a scratch
   `keyInputs` that gives a filter of individuals, and the report says
   so.
3. `VS3 D3 the diversity of stage 3`. Check: `npx vitest run
   src/core/analyses/diversity.test.ts -t "VS3 D3"` passes at least 10
   tests: the individuals kept of `diversity.md`, "How it is verified"
   (3), `populationNotInResult` and the end of `tooFewIndividuals` (2),
   `numCheckNumbers` with a list and with a threshold (2), the reason of
   the lists in `needs` (1), the words of the statistics that failed (1),
   and popnei's refusal with no population (1).
4. `VS3 D4 the individuals kept in the store`. Check: `npx vitest run
   src/core/store.test.ts src/ui/runs.test.ts -t "VS3 D4"` passes at
   least 14 tests: "The individuals kept and a Run that waits" of
   `store.md`, "How it is verified" (8), "A list of individuals popnei
   would refuse" (1), "The key whatever the lock, and the lock from the
   cache" (2), and `startAnalysis` of stage 3 in `entry.md` (3).
5. `VS3 D5 the counts`. Check: `npx vitest run src/core -t "VS3 D5"`
   passes at least 9 tests: "The counts filled" of `store.md` (4), and
   `countsOf`, `writeCountsOf` and `individualStatsOf` of `entry.md`,
   "`apps.ts`" (5).
6. `VS3 D6 the write in the store`. Check: `npx vitest run
   src/core/store.test.ts src/ui/runs.test.ts -t "VS3 D6"` passes at
   least 13 tests: "The write" of `store.md`, "How it is verified" (12),
   and `startWriting` (1).
7. `VS3 D7 the properties of the store of stage 3`. Check: `npx vitest
   run src/core/store.test.ts -t "VS3 D7"` passes 3 tests, one for each of the three properties
   `store.md` adds: a result shown only under a key the project gives,
   whatever the lock; the list given to a request; a write whose result
   arrives under another key leaves no file.
8. `VS3 D8 the project file of stage 3`. Check: `npx vitest run
   src/core/projectFile.test.ts -t "VS3 D8"` passes at least 4 tests:
   the fixture `v1-every-filter.popnei.json` opened into its literal
   project and written back byte for byte (2), a file of version 1 whose
   filters are out of order refused (1), and the count of the check
   numbers not checked with a threshold on the individuals (1).
9. The tests before still pass, with their changed lines listed as in
   work package 1, those of `numVarsOf` and of `startRun`'s single
   handle among them.

**Stands on:** task 1.1 and work package 2.

**Tasks:**

- [x] 3.1 `src/core/analyses/individualChecks.ts`, `variantChecks.ts` and
  `filterCounts.ts`, from "The module" of each of their specs but the
  key. Serves 1. Needs 1.1 and 2.4.
- [x] 3.2 The tests of their keys, in a commit of their own: a key that
  missed a filter of the variants would show the statistics of other
  filters as current, and every analysis after a threshold would then
  run on the wrong individuals. Serves 2. Needs 3.1.
- [x] 3.3 The store: the individuals kept, the lock from the cache, and a
  Run that waits for the statistics, from `store.md`, "The individuals
  kept", "The state of an analysis" and the parts of "The TypeScript
  interface" they use; `WorkerClient.individuals`; the three fakes of
  "How it is verified" in `src/core/testSupport.ts`; and
  `src/ui/runs.ts` awaiting every handle, from `entry.md`, "The outcome
  of a calculation", which the new return of `startRun` forces. The
  wrong list given to a request shows on no screen, so this is a task of
  its own. Serves 4 and 7. Needs 2.1 and 2.2; can run beside 3.1 and
  3.2.
- [x] 3.4 `src/core/analyses/diversity.ts` of stage 3, the parts the
  opening of `diversity.md` lists: the lock on the filters of
  individuals goes, `populationsKept`, the job with `c.individuals`, the
  result with `passStats`, and its words. Serves 3. Needs 3.3.
- [x] 3.5 The store: the counts, `countsOf` and `PassFound` in the place
  of `numVarsOf`, from `store.md`, "What each filter kept"; and
  `countsOf`, `writeCountsOf` and `individualStatsOf` in
  `src/core/apps.ts`. The entry passes `counts` and `statistics` as
  `null` until task 5.2, since `createStore` refuses the id of an
  analysis the application does not list yet. Serves 5. Needs 3.1 and
  3.3.
- [x] 3.6 The store: the write, from `store.md`, "The writing of the
  filtered variants", with `writeKeyOf`, the state `write` and the three
  fields of the notice; `startWriting` in `src/ui/runs.ts`. A file of
  other filters saved as the one the step shows would show on no
  screen, so this is a task of its own. Serves 6 and 7. Needs 2.3 and
  3.5.
- [x] 3.7 `src/core/projectFile.ts` of stage 3, from the parts of
  `projectFile.md` its opening names, with the fixture
  `v1-every-filter.popnei.json` written by hand from the spec. Serves 8.
  Needs 2.1 and 3.4; can run beside 3.5 and 3.6.

**What could go wrong:** the lock worked out again after each put into
the cache, and a Run that waits sent from the `runEnded` of the
statistics, are the subtlest rules of `store.md`; its worked sequence
asserts them step by step. `store.test.ts` is 3,434 lines; a task may
split it by subject, which changes no test.

## 4. The histogram

**What it gives:** in the words of work packages 6 and 7, a histogram
drawn from its bins, with the threshold of its filter marked and the
bins it keeps, splits and removes; the rows of the table of its bins; and
an export to SVG and PNG that no screen offers before stage 6; and the
base the scatter of the PCA, the Manhattan and the QQ plot will be made
with.

**Deliverables:**

1. The dependencies. Check: `npm ls d3-selection d3-scale d3-axis jsdom`
   prints the four at the versions of "Before the first task", and
   `package.json` names the seven packages with exact versions; on
   1457d80 `npm ls d3-scale jsdom` prints "(empty)". The report lists the
   packages the lockfile added.
2. `VS4 D1 the base of the 2D plots`. Check: `npx vitest run src/charts
   -t "VS4 D1"` passes at least 14 tests in the project `charts` of
   Vitest, from `plot2d.md`, "How it is verified": `tableNumber` (2),
   the ticks of whole numbers (1), and each case under jsdom (11).
3. `VS4 D2 the histogram`. Check: the same, `-t "VS4 D2"`, at least 21
   tests, from `histogram.md`, "How it is verified": `histogramRows` at
   the three thresholds on the bins of `panel.nei`, the last bin, and no
   threshold (5); each defect (6); the domains and ticks (3); and each
   case under jsdom (7).
4. `VS4 D3 the export in the browser`. Check: the browser check with `-g
   "VS4 D3"` gives at least 14 passed, 7 in each engine, on
   `e2e/plots.html`: the SVG with no `var(`, no overlay, a background
   rectangle and the light colours in the dark theme (1); `toPNG(3)` of
   600 by 375 pixels (1); `tooLarge` at 1,400 pixels, and `toPNG(2)` (1);
   `tooLarge` above 2,048 pixels at 2 (1); `notMade` (1); a resize and
   `destroy` (1); and the legend inside the SVG at 320 pixels wide (1).
5. The page of the tests only in the tests' build. Check:
   `POPNEI_TEST_PAGES=1 npm run build` writes `dist/e2e/plots.html`, and
   `npm run build` writes no file whose name holds `plots`; `npm pkg get
   scripts.test:e2e` sets the variable; on 1457d80 neither page exists.
6. The token of the bars. Check: `npx vitest run src/ui/tokens.test.ts`
   passes with the pair of `--chart-bar` and the background in both
   themes (`css.md`), and `grep -c -- "--chart-bar" src/ui/tokens.css`
   gives at least 2, where it gives 0 on 1457d80.

**Stands on:** the gate, the owner's word on the
dependencies among it.

**Tasks:**

- [x] 4.1 The dependencies, in a commit of their own; the project
  `charts` of `vite.config.ts` (`testing.md`, "Vitest");
  `src/charts/plot2d.ts`, `types.ts`, `ids.ts`, `limits.ts` and the
  skeleton of `charts.css`, from `plot2d.md` but "The export". Serves 1
  and 2.
- [x] 4.2 `src/charts/histogram.ts` with `histogramRows`, from
  `histogram.md` but "The export"; `--chart-bar` in `src/ui/tokens.css`
  and its test. Serves 3 and 6. Needs 4.1.
- [x] 4.3 `src/charts/export.ts` with `PngError`, from `plot2d.md`, "The
  export", and `charts.md`, "PNG"; `e2e/plots.html` and its script, in
  the `input` of `vite.config.ts` only when `POPNEI_TEST_PAGES` is set;
  the variable in `test:e2e`; the local command of "Before the first
  task" in `.claude/skills/coding/testing.md`, "Against the built site";
  `e2e/plots.spec.ts`. Serves 4 and 5. Needs 4.2.

Work package 4 can run beside work packages 1 to 3.

**What could go wrong:** jsdom lays nothing out, so the tests give the
size and call the `ResizeObserver` themselves (`charts.md`, "Testing the
plots"). The light colours of the export are resolved in a hidden
container, and whether WebKit resolves the custom properties there as
Chromium does is first seen in D3.

## 5. The page joined, and the writing

**What it gives:** the user writes the variants the filters keep as a
`.nei` file, with the size expected before the write, its progress and
Stop, and a Save button that downloads `panel.filtered.nei`; a change of
a filter discards a file not saved, and the notice says so. Behind the
screen, the three analyses of the step join the application, the shell
says what each does, and the stepper takes them into the state of the
Variants step, though no button of the step starts them until work
packages 6 and 7.

**Deliverables:**

1. `VS5 D1 the page joined, in node`. Check: `npx vitest run src/core
   src/ui -t "VS5 D1"` passes at least 5 tests: the analyses of
   `apps.ts`, distinct ids and each with its step in
   `POPGEN_ANALYSIS_STEPS`, and the first project (3), from `entry.md`,
   "How it is verified"; and `saveWritten` in `done` and in `ready` (2).
2. `VS5 D2 the words of the shell of stage 3`. Check: `npx vitest run
   src/ui/shell -t "VS5 D2"` passes at least 31 tests, from `shell.md`,
   "How it is checked": `stepStates` of the rows the Variants step
   gains (5) and of the Analyses step left as it was by a running
   analysis of the Variants step (1);
   `summaryLine` of the example, of the thresholds with and without
   their statistics, and of each new row of its table (8); `noticeText`
   of the writing left behind, stopped and discarded, and of the
   statistics removed (7); `announcementsOf` of the rows of the Counts
   and of the writing, a Run that waits in one change, and none for
   counts filled or a write dropped (10).
3. `VS5 D3 the writing on the screen`. Check: the browser check with
   `-g "VS5 D3"` gives at least 10 passed, 5 in each engine, from
   `writeVariants.md` and `entry.md`, "How it is verified": `panel.nei`
   at 0.05 written and saved, the download `panel.filtered.nei` of
   250,994 bytes, and the step then saying it was handed to the browser,
   with no second Save (1); the focus on Save when the write ends with
   the focus on Write, and the words the status region reads (1); a
   change of the threshold with the file not saved, the notice with the
   file discarded, and its Undo bringing the threshold back and no Save
   (1); Open project… with the file not saved, and the question naming
   it (1); and axe in each state reached.
4. `VS5 D4 a file saved after its worker ended`. Check: the same, `-g
   "VS5 D4"`, 2 passed, 1 in each engine, as `client.md`, "How it is
   verified", asks: the VCF of the flow `WS8 D3` of
   `e2e/diversity.spec.ts`, the Stop in the middle of a pass of stage 2,
   200,000 variants of 1,000 individuals gzipped in 127.6 MB, written by
   `e2e/bigVcf.ts` into the test's output folder, with
   its CSV, is written; the diversity is run on it and stopped while its
   bar is below 100%, which ends the worker that made the file; Save
   then gives a download that popnei's `openVars`, in the test's node,
   opens with 1,000 individuals.
5. `VS5 D5 the measurements of the write`, in `e2e/measure.spec.ts`,
   from `writeVariants.md`, "To be measured": the memory of the tab
   during and after a write of the `.nei` file of 19,161,178 bytes and of
   one ten times larger, whether the engine copies the array into the
   `Blob`, the time of the write, and the largest file each engine writes
   before the write fails, the variants doubled from the file ten times
   larger. Check: `npx playwright test --project=measure-chromium
   --project=measure-webkit -g "VS5 D5"` passes, and the report holds a
   table of each with the engine, its version and the machine; the four
   constants, `WRITE_WARN_BYTES`, `WRITE_RESTART_BYTES`,
   `WRITE_MAX_BYTES` and `BYTES_PER_GENOTYPE`, are set from them, the
   specs changed first.
6. The screenshots of the writing, light and dark: the size not yet
   known, ready with the size expected, writing with its bar, written
   with Save, saved, the notice of a file discarded, and the question
   before an opening. Check: each PNG is in `screens/`, and the
   orchestrator has looked at each.

The owner tries the writing at stop A, task 6.4.

**Stands on:** work packages 1 and 3.

**Tasks:**

- [x] 5.1 `src/ui/shell/words.ts` of stage 3 whole, from `shell.md`,
  "What it sends and reads", "The stepper", "The summary line", "The
  notice" and "The status region", its functions tested on the states
  of `TEST_DEFS` as that spec has them. Serves 2. Needs work package 3.
- [x] 5.2 The page joined: `POPGEN_ANALYSES` and
  `POPGEN_ANALYSIS_STEPS` in `src/core/apps.ts`, the titles of the three
  analyses in `src/ui/analyses/panels.ts`, the Analyses step drawing
  only the analyses of its step, and `createStore` in `src/ui/popgen.tsx`
  with `countsOf`, `counts`, `statistics` and `write`, from `entry.md`,
  "At the opening" and "`src/core/apps.ts`"; the shell reading the
  words of 5.1 with the `ShellWords` of `panels.ts` and `apps.ts`, and
  the question before an opening, from `shell.md`, "Opening";
  `downloadFile` in `src/ui/download.ts` and `saveWritten` in
  `src/ui/saving.ts`, from `entry.md`, "A file of the filtered variants
  saved". One task, because the stepper would read the three analyses
  as analyses of the Analyses step between the two halves. Serves 1 and
  6. Needs 5.1 and 1.4.
- [x] 5.3 The section "Writing the filtered variants" of the Variants
  step, from `variants.md`, "Writing the filtered variants", and
  `writeVariants.md`, "The step's part", with its states in
  `e2e/screens.spec.ts`. Serves 3, 4 and 6. Needs 5.2 and 1.3.
- [x] 5.4 The measurements of the write, and the four constants set from
  them: `writeVariants.md`, `client.md` and section 11 of
  `docs/architecture.md` get the numbers in one commit, then the code.
  The memory of the tab is read as the measurement of stage 2 read it in
  Chromium, from the Chrome DevTools Protocol, and in WebKit from macOS's
  `footprint` of its process of the page, or it is reported as not
  measured there. For Firefox the orchestrator gives the owner the steps
  in the running application, `npm run dev`: write the file ten times
  larger and read the memory of the tab in Firefox's `about:processes`
  before, during and after. Serves 5. Needs 5.3.

**What could go wrong:** that a `Blob` is still whole after the worker
that made it is ended is what the File API promises, and it has never
been tried in a browser. If D4 fails in an engine, the tasks go on, the
deliverable stays unmet there, and the question goes to the owner and
back to `client.md`, since the page would then have to hold the bytes
itself before a restart. Stop A goes ahead all the same, with the
result and that question given to the owner there, since the screens of
work package 6 do not rest on it; work package 5 is then done in every
deliverable but D4 in that engine, and task 7.3's write of the
individuals kept waits for the owner's answer. The largest writes need inputs of gigabytes:
node's wasm has the same bound of 4 GB as the tab's, so they cannot be
`.nei` files made by `writeVars`; they are gzipped VCFs of
`e2e/bigVcf.ts`, whose passes take minutes, written outside the
repository in `MEASURE_DIR`. The words of the size not yet known say
"Count, above", and the Count comes in task 6.3.

## 6. The filters of the variants

**What it gives:** the user sets the four filters of the variants, each
turned on and off with a switch, sees the histograms of the major allele
frequency and of the observed and expected heterozygosity beside them,
with the threshold drawn as it is typed and the table of the bins, and
counts how many variants each filter was given and kept.

**Deliverables:**

1. `VS6 D1 the number field`. Check: `npx vitest run src/ui/widgets -t
   "VS6 D1"` passes at least 3 tests: a field of four decimals takes
   0.0312 with a step of 0.01, refuses 0.12345 with its line, and a field
   with no `decimals` takes, as in stage 2, only a number that is a
   multiple of its step.
2. `VS6 D2 the filters of the variants on the screen`. Check: the
   browser check with `-g "VS6 D2"` gives at least 24 passed, 12 in each
   engine, from the stage 3 list of `variants.md`, "How it is checked":
   the line before a file, and the filters settable (1); the histograms
   calculated, the mean of the MAF 0.7163, still there after the missing
   data filter is set to 0.05 (1); the threshold line moving as 0.9 is
   typed, before Enter (1); the Count at 0.05, "Kept 1,152 of the 1,200
   variants it was given.", and the field described by it (1); the three
   filters counted, 1,152 of 1,152 and 1,128 of 1,152, and the line of
   the total (1); an undo bringing back the counts before with no
   calculation (1); the CSV of the bins of the MAF, its header, its 40
   rows and its 39th (1); no button that downloads a histogram (1); the
   table of the bins reached with the keyboard (1); the legend inside
   each plot at 320 pixels wide (1); each switch turned on at its value
   of the table of the filters, and the refusals of the r² and of the
   distance (2); and axe in each state reached.
3. `VS6 D3 the Count against the diversity`, the measurement of
   `filterCounts.md`: the time of a pass of the Count and of a pass of
   the diversity with the same filters, on the VCF of 80,692,954 bytes
   and the `.nei` file of 19,161,178 bytes of stage 2. Check: `npx
   playwright test --project=measure-chromium --project=measure-webkit
   -g "VS6 D3"` passes, and the report holds its table. If the Count
   takes more than twice the time of the diversity on either file in
   either engine, the report asks the owner whether popnei is asked for
   a function that only counts (`docs/architecture.md`, section 11); the
   plan goes on meanwhile.
4. The screenshots, light and dark: the step with no file; with a file
   read, before any calculation; the histograms running, done with the
   thresholds of their filters, and in error (the ploidy of
   `tetraploid.vcf.gz` refused); the counts done, not counted after a
   change, and a filter that kept none; a number refused; and the step
   at 320 pixels wide. Check: each PNG is in `screens/`, and the
   orchestrator has looked at each.
5. The owner accepts the writing and the filters of the variants (task
   6.4).

**Stands on:** work packages 4 and 5.

**Tasks:**

- [x] 6.1 `decimals` and `onTyped` in `src/ui/widgets/NumberField.tsx`
  and `committedNumber.ts`, from `variants.md`, "The two thresholds" and
  "The threshold typed and not yet committed"; the four filters of the
  variants, from "The filters of the variants", their switches, fields,
  lines, refusals and commands with their descriptions, with the values
  at which they are turned on, the meanwhile of point F for two of them;
  the line in place of the three analyses before a file is read. Serves
  1, 2 and 4. Needs work package 5, whose task 5.3 changes
  `VariantsStep.tsx` too.
- [x] 6.2 The histogram in the step: the component that mounts
  `createHistogram` (`react.md`, "Mounting a plot"), in its two tabs with
  the table of its bins and their CSV; the block "Histograms of the
  variants" with its button and states, and each histogram beside its
  filter with the threshold as typed, from `variants.md`, "The
  histograms beside the filters of the variants", and `variantChecks.md`,
  "The panel". Serves 2 and 4. Needs 6.1 and work package 4.
- [x] 6.3 The Count, the counts beside each filter and in the
  description of its field, the line of the total and its focus, from
  `variants.md`, "What each filter of the variants kept", and
  `filterCounts.md`, "The Count button"; and the measurement of D3.
  Serves 2, 3 and 4. Needs 6.2, since both change `VariantsStep.tsx`.
- [ ] 6.4 Stop A: the owner accepts the writing of work package 5 and
  the filters of the variants, with their screenshots and the running
  application, in Firefox by hand as well, and judges the choices of
  the open-points file that these screens show and the summary line
  (`shell.md`, Open 1). Two rounds expected, three at most by the
  walking skeleton's count, which took five for its three stops; each a
  task with its commit and its screenshots taken again.

**What could go wrong:** the threshold line that follows the number
typed goes through a property of the number field that React Aria does
not give, `onTyped`, called at each key with the number it parses; a
number field that parses by the language of the browser would give it
another number, as a field of stage 2 did in a browser set to Spanish
(the report of the walking skeleton, work package 7).

## 7. The filters of the individuals

**What it gives:** the user types or pastes the lists of individuals to
keep and to remove, calculates the statistics of each individual and
reads them as a table sorted by any column and as two histograms, sets
the two thresholds beside those histograms, and reads how many
individuals each filter kept; runs the diversity on the individuals kept,
which calculates the statistics first when they are not there; and
writes the variants of the individuals kept.

**Deliverables:**

1. `VS7 D1 the filters of the individuals on the screen`. Check: the
   browser check with `-g "VS7 D1"` gives at least 26 passed, 13 in each
   engine, from the stage 3 list of `variants.md`, "How it is checked",
   and `individualChecks.md`, "How it is verified": the statistics at
   0.05, `s000` 0.0260 and 0.3672 (1); the thresholds at 0.03 and 0.38,
   "Kept 125 of the 200 individuals it was given.", 119 of 125, the line
   of the total and the column Kept (1); 0.12345 refused (1); the missing
   data filter of the variants moved, the statistics removed with their
   notice and the counts "Known once …" (1); an undo, and the statistics
   back (1); a list to keep with `ind_900`, its reason under the list and
   beside the disabled Write (1); the list cleared and the reason gone
   (1); a list typed and not applied, its line, and an Undo putting the
   text back (1); the table sorted with the keyboard alone, `s082` first
   at 0.0434 (1); `panel.individual_stats.csv` and the CSVs of the bins
   of the two histograms (2); the thresholds that keep none, the Variants
   step at Problem in the stepper with the words of `keptNoneReason`
   (1); the summary line with "119 of 200 individuals kept" (1); and axe
   in each state reached.
2. `VS7 D2 the diversity on the individuals kept`. Check: the same, `-g
   "VS7 D2"`, at least 6 passed, 3 in each engine, from `diversity.md`,
   "How it is verified": `panel_pops.csv` and `popcat`, the thresholds at
   0.03 and 0.38 with no statistics, Run, the words of the wait for the
   statistics, then the row p0 with 32 individuals, 0.3524, 0.3566 and
   0.9089 (1); the ready state with the populations kept (1); a Stop
   during the wait, which leaves the diversity and the statistics ready
   (1).
3. `VS7 D3 the write of the individuals kept`. Check: the same, `-g
   "VS7 D3"`, 2 passed, 1 in each engine: with the thresholds at 0.03 and
   0.38, Write and Save give `panel.filtered.nei` of 170,042 bytes.
4. `VS7 D4 the table at 10,000 individuals`, the measurement of
   `individualChecks.md`: the time the page is frozen after a threshold
   moves, with the table of the statistics of 10,000 individuals, from a
   VCF of 10,000 individuals written by `e2e/bigVcf.ts`. Check: `npx
   playwright test --project=measure-chromium --project=measure-webkit
   -g "VS7 D4"` passes, and the report holds its table. Above about 100
   ms in an engine, the table draws only the rows on the screen, React
   Aria's `Virtualizer` (`react.md`, "Performance"), and is measured
   again.
5. The screenshots, light and dark: the lists, applied, not applied and
   with a name not in the file; the statistics ready, running, done with
   the thresholds, removed, and in error; the thresholds with their
   counts and with "Known once …"; the thresholds that keep none; the
   diversity ready with the populations kept, waiting for the
   statistics, and in error with the failure of the statistics. Check:
   each PNG is in `screens/`, and the orchestrator has looked at each.
6. A screen reader, as `variants.md`, "How it is checked", asks:
   VoiceOver with Safari on a field of a filter with its count, a
   histogram and the table of its bins, the table of the individuals and
   a list. The orchestrator gives the owner the steps at stop B; if it
   is not tried, the report says so.
7. The owner accepts the filters of the individuals, the diversity with
   them and the writing of the individuals kept (task 7.5).

**Stands on:** work package 6.

**Tasks:**

- [ ] 7.1 The two lists, from `variants.md`, "The two lists", their
  reasons under each list and beside the disabled Write. Serves 1 and 5.
  Needs work package 6.
- [ ] 7.2 The block "Statistics of each individual": its button and
  states, the table with its column Kept, sorted by React Aria's
  `Table`, the two histograms from `binValues` beside the thresholds,
  and the CSVs, from `individualChecks.md`, "The panel", and
  `variants.md`, "The statistics of each individual"; `e2e/bigVcf.ts`
  given the number of individuals as a parameter; the measurement of D4.
  Serves 1, 4 and 5. Needs 7.1.
- [ ] 7.3 The two thresholds, of four decimals, turned on at 0.1 and at
  the meanwhile of point F, and what each filter of the individuals
  kept, from `variants.md`, "The two thresholds" and "What each filter
  of the individuals kept"; the flow of D3. Serves 1, 3 and 5. Needs
  7.2.
- [ ] 7.4 The diversity panel of stage 3, from `diversity.md`, "The
  panel": the populations kept in the ready state, the wait for the
  statistics in the running state, and the words of the statistics that
  failed and of no population left. Serves 2 and 5. Needs 7.3.
- [ ] 7.5 Stop B: the owner accepts the filters of the individuals, the
  diversity with them and the writing of the individuals kept, in
  Firefox by hand as well; judges the words that send the user to fix a
  list (point D) and the choices of the open-points file that these
  screens show; and tries VoiceOver with Safari if they wish. Two rounds
  expected, three at most.

**What could go wrong:** the list of the individuals kept is known only
once the statistics are in the page, so a Run of the diversity makes two
requests, the second sent by the store when the first ends; a flow that
presses Stop between them is timing, and waits for the words of the
wait before it presses. The table of 10,000 rows is the first sortable
table of the application.

## 8. The end of the stage

**What it gives:** the application checked whole, and every case of the
twenty specs matched to a test.

**Deliverables:**

1. The whole. Check: on the last commit `npm run format:check`,
   `typecheck`, `lint` and `build` exit 0; `npm test` passes with no
   test skipped; the browser check passes, the probe's 40 among them;
   `npm run screens` passes; `npm pkg get dependencies.popnei` prints the
   URL of `js-v0.1.0-dev.2`; `grep -rnE
   "Date\.now|new Date|Math\.random|setTimeout|setInterval|\bawait\b|from
   \"popnei\"" src/core --include="*.ts" --exclude="*.test.ts"` finds
   nothing; the page's first script is measured gzipped, beside its
   123.62 KB on 1457d80, with the D3 modules it now holds.
2. Every document the twenty specs ask to change is changed: each item
   of their sections "What this spec asks of other documents" and "What
   … relies on" that names a skill, `docs/architecture.md` or
   `docs/technology.md` is found in the diff and listed in the report
   with its commit.
3. The map of the cases, `docs/plans/variants-step.cases.md`: every item
   of "The cases" and of "How it is verified" or "How it is checked" of
   the twenty specs mapped to a test that gives its input and checks its
   outcome, as `docs/plans/walking-skeleton.cases.md` does; a test
   written for an item that has none is seen to fail with the code it
   guards broken; the report lists every item left without a test, with
   its reason.

**Stands on:** work package 7.

**Tasks:**

- [ ] 8.1 The documents, and the final checks. Serves 1 and 2. Needs
  work package 7.
- [ ] 8.2 The map of the cases, and the tests it finds missing. Serves
  3. Needs 8.1.

## At the end

The plan is done when every box is ticked, the owner has accepted the
screens at stops A and B, the measurements are in the report, and the
report is finished. It then waits for the owner's order to merge
`plan/variants-step` into `main`; the push of `main` that follows runs
the flows in Firefox for the first time, on GitHub, and a failure there
is fixed on `main` before anything else. The later plan of stage 3, the
VCF writer, the regions of a BED file, the histogram of the missing rate
of each variant and the density of variants, starts when popnei's
release that has them is out.
