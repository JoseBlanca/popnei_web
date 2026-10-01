# Plan: the analyses of the populations

30 September 2026, approved by the owner the same day; under way from
30 September 2026 on the branch `plan/population-analyses`. It builds
stage 5 of `docs/build-order.md`: the distances between populations,
Hudson's Fst and Jost's D of each pair, as a heatmap ordered by
similarity and a table; the diversity whole, with F, the alleles, the
private alleles and their rarefied values, and the folded site
frequency spectrum of each population in a block of its panel; and the
LD decay of each population, its bins, its fitted curve and its half
distance, as a line plot and two tables. It builds on popnei's release
`js-v0.1.0-dev.3`, which the application already installs, on the
revision of `docs/architecture.md` and the specs the owner approved on
30 September 2026 with their two completions of that day (113d183 and
e82b205), and on the decisions gathered in
`docs/specs/stage-5-open-points.md` (the open-points file, below). The
specs are called below by their file names:

- new: `docs/specs/analyses/popDists.md`, `ldDecay.md` and `sfs.md`;
  `docs/specs/charts/heatmap.md` and `line.md`;
- revised: `docs/specs/analyses/diversity.md` and `filterCounts.md`;
  `docs/specs/core/project.md`, `keys.md`, `store.md` and
  `projectFile.md`; `docs/specs/worker/protocol.md`, `messages.md`,
  `runner.md` and `client.md`; `docs/specs/charts/plot2d.md` and
  `histogram.md`; `docs/specs/entry.md` and `shell.md`; and the skills
  `.claude/skills/coding/charts.md`, `css.md` and `testing.md`.

It is carried out as the `following-plans` skill says, on the branch
`plan/population-analyses`, with its report in
`docs/plans/population-analyses.report.md` and its map of the cases in
`docs/plans/population-analyses.cases.md`, as stage 4 had them.

When the plan is done, a user who has loaded a variants file and a
metadata file with populations runs, in the Analyses step, the
distances between populations and reads the heatmap in its order by
similarity, switches between Fst and D with no calculation, and
downloads the table of the pairs; runs the diversity and reads its
eleven columns, sets the minimum of individuals, the threshold of
polymorphism and the draw of the rarefaction, and reads under the table
one histogram of the spectrum per population; and types the largest
distance of the LD decay, runs it, and reads each population's curve
and half distance, with the tables of the populations and of the bins.

## The breakdown, as the owner approved it

Approved by the owner on 30 September 2026, with two changes since: the
spectrum's lines of the Python script, which the breakdown left to stage
6, are in the literal of the diversity's script since 113d183 and are
built in work package 6; and the gaps the breakdown found in the specs
were closed in 113d183 and e82b205.

1. The populations shared by the three analyses, in core
   (`project.md`, "What the analyses per population share from stage
   5"; `diversity.md`, "The warnings"). No screen. 2 tasks.
2. The LD decay in the worker and core, and its memory measured in
   Chromium and WebKit before its panel is built, since that
   measurement is the one result that could change a spec and a later
   work package. 5 tasks.
3. The distances between populations in the worker and core. 3 tasks.
4. The three plots, the heatmap, the line plot and the histogram of the
   spectrum, each tried on `e2e/plots.html`. 4 tasks.
5. The panel of the distances. Stop A: the owner tries it, 2 rounds.
   5 tasks.
6. The whole diversity in the worker and core, with the spectrum's
   module. 6 tasks.
7. The panel of the diversity whole, with the block of the spectrum.
   Stop B, 2 rounds. 4 tasks.
8. The panel of the LD decay. Stop C, 2 rounds. 4 tasks.
9. The end: the documents, the final checks and the map of the cases.
   2 tasks.

The order: the code that three analyses share first; the LD decay
first of the analyses, for its measurement; the distances before the
whole diversity, since the diversity changes what stages 2 to 4 already
show and the distances change nothing that exists; each panel after its
core and its plot. Work package 4 runs beside 1 to 3 and 6; the three
panels may overlap, within the files they share (below, "Tasks side by
side"). Out: popnei issues #4 and #5, stage 6 and stage 8 (below, "In
and out").

## Words used below

- A **pass** is one reading of the variants file from its start.
- A **flow** is a Playwright test that goes through the page as a user
  does.
- The **browser check** is `POPNEI_TEST_PAGES=1 npm run build && npx
  playwright test --project=chromium --project=webkit`, with a
  selection `-g "<tag>"` where a deliverable names one. Playwright
  1.63.0 cannot launch Firefox on the owner's Mac, so no check of this
  plan is `npm run test:e2e`, which names Firefox. Firefox runs on
  GitHub when `main` is pushed after the merge, and the owner tries each
  screen in Firefox by hand at its stop.
- A **tag** starts the name of a `describe` block of Vitest or the title
  of a Playwright test, `PA3 D2` for work package 3, deliverable 2; `PA`
  is for the population analyses, after `IP` of stage 4. A deliverable
  checked by no test has no tag, and its number is skipped. A Vitest count
  is the summary line of `npx vitest run <path> -t "<tag>"`, "Tests N
  passed"; a tag that selects nothing gives "N skipped" and exits 0, so
  the number passed is what is read. `-t "PA"` alone selects 2 earlier tests
  whose names hold "PANEL", so every check names its tag
  with its number. A Playwright count is the summary line of the browser
  check with `-g "<tag>"`, over both engines, half in each; a tag that
  selects nothing exits 1 with "No tests found".
- A **measurement** is a test of the projects `measure-chromium` and
  `measure-webkit`, run alone in the tree with `--workers=1`
  (`.claude/skills/coding/testing.md`, "The measurements"), whose large
  files are made in `MEASURE_DIR`, `$TMPDIR/popnei-measure`, outside
  the repository.
- A **stop** is where the orchestrator waits for the owner to try a
  screen; a **round** is one change the owner asks for there, with its
  commit and its screenshots taken again.
- A name of the code in backquotes, `populationsWithMinimum`,
  `ldDecayFilters`, is the spec's, and is defined in the part of the spec
  the task cites; the plan does not repeat what it does.
- **The gate** is the list of "Before the first task": a task that
  stands on the gate can start once every item of it holds.
- **The probe** is the page of stage 1 that checks popnei's wasm in
  each browser; its tests, `e2e/probe.spec.ts`, 26 in each engine, run
  in every browser check.
- **The start** is the commit of `main` the branch
  `plan/population-analyses` is made from; the report names it.
- **The 19 MB `.nei` file** is the file of 19,161,178 bytes of
  `docs/architecture.md` section 13, 1,000 individuals, which the
  measurements of stage 2 make in `MEASURE_DIR`.

## In and out

In: every module and screen the specs above give; the three
measurements of the open-points file, "Set by a measurement", each in
the work package that meets it; and what the number fields announce to
a screen reader while digits are typed, which `popDists.md`,
`ldDecay.md` and `diversity.md`, each in "Accessibility", leave to this
plan and its review.

Out:

- **popnei issue #4**, the heterozygosities in `calcPopDiversity`, open
  on 30 September 2026. The diversity makes two passes; a release with
  the issue is a new URL, one call, and a key version more, in a later
  plan.
- **popnei issue #5**, open on 30 September 2026. A variants file not
  sorted by position gives the LD decay fewer pairs with no word, the
  help says the file must be sorted, and a population named `__proto__`
  is a defect of the LD decay (`ldDecay.md`, "The cases").
- **Stage 6**: the export of the heatmap, the line plot and the
  histograms as SVG and PNG, the report, and `src/core/script.ts`, which
  joins the lines each analysis's `script` gives. The `script` of each
  analysis is built here and tested as a literal.
- **Stage 8**: the help drawer, whose text the specs hold.
- **In no spec**: a log scale of the distance, a zoom of a large
  heatmap, a download of the square matrix, a tree of the populations,
  the unfolded spectrum.
- From the report of stage 4, "The owner's decisions of 29 September
  2026": the words "…were not calculated" of the Variants step, left for
  a later stage.

### What is still the owner's

No point of the specs is open: the owner answered points 11 to 19 on
30 September 2026. The writers' decisions that the owner may overrule
(the open-points file, "Decided by the writers of the specs") are judged
at the stop of the screen that shows each: those of the distances at
stop A, of the diversity and the spectrum at stop B, of the LD decay at
stop C. One of them is also set by a measurement: the lock of the LD
decay at 1 GB of counts, which task 2.5 tries at its bound. The open
points of earlier stages stay as they are: the bound of the cache
(`cache.md`), how far back undo goes (`history.md`), and the words of
the project file (`projectFile.md`).

### Where the specs are thin, and what the plan does

- **The check numbers of the project-file fixture of stage 5.**
  `projectFile.md`, "How it is verified", gives
  `v1-stage5-options.popnei.json` with the distances at a minimum of 10
  and their 7 check numbers, and not the numbers. popnei gives at a
  minimum of 10 the numbers `popDists.md` gives at 20 with the missing
  data filter at 0.1, to the last digit (node, `js-v0.1.0-dev.3`, 30
  September 2026, `calcPopDists` of `panel.nei` and `panel_pops.csv` at
  10 and at 20). Task 6.6 writes that sentence into `projectFile.md`,
  in a commit of its own, before the fixture.
- **The LD decay in a browser before its panel.** The measurements of
  task 2.5 need the LD decay to run in Chromium and WebKit, and its
  panel comes in work package 8. Stage 4 measured the PCA through the
  application, with a placeholder panel and a project file for its
  options (its report, "How the work of 6 went"). Task 2.5 does the
  same: the LD decay joins `POPGEN_ANALYSES` with a panel that is its
  Run button alone, the tests that this changes, the links of the
  Analyses step among them, are listed in the report, and task 8.1
  replaces the placeholder with the panel.
- **The shapes of the files of the LD measurements**, which
  `ldDecay.md`, "How it is verified", leaves to the plan: the VCF of
  `e2e/bigVcf.ts`, whose genotypes have no LD, serves for the memory and
  the time, which do not depend on LD. At the lock, about 100 individuals
  and 10,000 to 20,000 variants at positions drawn at random over 26 Mb,
  so that most distances hold a pair; for the dense file, 1,000
  individuals with a variant every 100 bp over several Mb.
- **"Without the restart"**, which `client.md` asks to measure, is not a
  state the application has once task 2.2 is in. wasm does not shrink
  while its worker lives, so the size of the tab when the answer
  arrives, before the worker is ended, is what the tab would keep
  without the restart, but for what the page itself frees afterwards;
  task 2.5 reads it there, and 3 s after the restart for the size with
  it.

## Before the first task

- **The plan and the specs approved.** The owner approved the specs of
  stage 5 and the revision of `docs/architecture.md` on 30 September
  2026, and approves this plan before it is run. Check: `grep -rlzE "not
  yet[[:space:]]+(reviewed nor[[:space:]]+)?approved" docs/specs` prints
  nothing, as it does on e82b205.
- **The branches.** This plan is written on the branch
  `docs/plan-population-analyses`, made from `specs/stage-5` at e82b205,
  which holds the specs. Once the owner approves the plan, the owner
  orders both branches merged into `main`, as the plan and the specs of
  stage 4 were, and `plan/population-analyses` is then made from
  `main`. If the owner orders the plan run before that merge, the
  orchestrator asks whether to merge first. Check: `git ls-tree -r
  --name-only main docs/plans/population-analyses.md
  docs/specs/analyses/popDists.md` prints both paths; on e82b205 it
  prints nothing, `main` being at 8a6511b. On the start the checks of
  the next items are run again and give the same results, since the
  merge adds documents alone.
- **node 24 or later.** This machine has node 26.8.2 and npm 11.19.1,
  checked on 30 September 2026.
- **popnei.** `npm pkg get dependencies.popnei` prints the URL of
  `js-v0.1.0-dev.3`, on e82b205, and no task changes it. Its numbers for
  this stage were got under node on 30 September 2026 and are in the
  specs, with the commands that gave them. popnei issues #4 and #5 are
  open (`gh issue view 4 -R JoseBlanca/popnei`).
- **No new dependency.** The heatmap's band scale is `d3-scale`'s and
  the line is `d3-shape`'s: `npm ls d3-scale d3-shape` prints 4.0.2 and
  3.2.0. A package the lockfile adds is a stop for the owner.
- **The browsers.** Playwright 1.63.0 launches Chromium and WebKit here,
  and not Firefox.
- **The checks on e82b205**, after `npm ci`, on 30 September 2026:
  `format:check`, `typecheck` and `lint` exit 0; `npm test` gives "Test
  Files 79 passed (79)", "Tests 2968 passed (2968)"; `POPNEI_TEST_PAGES=1
  npm run build` exits 0, the page's first script `popgen-*.js` 766.90
  kB, 229.89 kB gzipped, and popnei's wasm 2,389.51 kB, 785.16 kB
  gzipped, as Vite counts them; the browser check gives "1038 passed
  (4.3m)", 519 in each engine, the probe's 52 among them;
  `--project=screens --list` lists 308 tests, and the two measurement projects 44. `npx
  vitest run -t "PA[0-9]"` gives "Tests 2968 skipped (2968)", and the
  browser check with `-g "PA[0-9]" --list` "Total: 0 tests", so every
  tag below selects nothing there.
- **Every task commits when the checks pass**: `format:check`,
  `typecheck`, `lint`, `npm test`, and the browser check, and not only
  the count of its deliverable.
- **What a task waits for.** A task waits only for the tasks its
  "Needs" names, and a task with no "Needs" for nothing but the gate; a
  work package's "Stands on" is the union of what its tasks need outside
  it.
- **Tasks side by side** share the one worktree and its `dist/`. Each
  runs the format, the types, the lint and Vitest on its own files; none
  runs the build, the development server, Playwright or a measurement
  while another runs beside it. The orchestrator runs the whole tree's
  checks, the browser check among them, once both have committed. These
  files are shared, and the tasks that touch them run one after another:
  `src/worker/protocol.ts`, `messages.ts`, `runner.ts` and their tests
  (tasks 2.1, 3.1 and 6.1); `src/core/apps.ts`,
  `src/ui/analyses/titles.ts`, `panels.ts` and the shell's words (5.1,
  7.1 and 8.1); `e2e/screens.spec.ts` (5.2, 7.2 and 8.2);
  `e2e/plots.ts` and `e2e/plots.spec.ts` (4.2, 4.3 and 4.4); and
  `e2e/bigVcf.ts` (2.5 and 5.3).
- **When a work package is done**: its deliverables pass, run by the
  orchestrator; its review of the `code-review` skill has run and the
  findings the orchestrator took are fixed, with the deliverables run
  again after the fixes; and, for one with a stop, the owner has
  accepted the screen. The box of its last task is ticked only then.
- **What every prompt of a task carries**, from the reports of stages 2
  to 4:
  - each rule of the spec the task builds is broken once on a scratch
    copy of the code and seen to fail a test, and the answer says how
    many rules it broke and how many failed a test; a component is not
    counted as covered by the flows it happens to reach;
  - a task of a plot tests in the browser what jsdom cannot lay out,
    and compares pictures from its first flow: half the changes the
    tests reviewer made to the 3D view of stage 4 passed every test;
  - a check at 320 pixels brings the committed font of
    `e2e/fixtures/fonts/`, since a table of stage 4 fitted with 2
    pixels to spare in the Mac's font, and on GitHub's runners the fonts
    of Linux wrapped a header of it onto two lines;
  - an effect that moves the focus is tested under `<StrictMode>` in
    jsdom, since the checks run against the built site and stage 4 met
    four defects of React's double effects that only `npm run dev`
    showed (`testing.md`);
  - a number field is tried with a comma typed key by key;
  - a flow does not wait for a blur after a Tab that leaves the page,
    which Firefox on GitHub's runners does not fire, but a frame
    (e51f830); a flow that reads pixels holds what they mean on Linux as
    on the Mac, since GitHub's runners draw with other fonts and, for
    WebGL, Chromium by SwiftShader and Firefox not at all (the report of
    stage 4, "After the push of `main`");
  - a measurement asserts that it measured something in every column,
    since a measurement of stage 4 passed while one of its columns
    measured nothing;
  - a change that crosses layers is cut by what each commit keeps
    working, not by layer: a required field of a job and core's `run`
    that sends it go in the same commit (stage 4's report, "How the
    work of 2 and 3 went");
  - a point for the owner is written with its recommendation when it is
    found; the task does not work around a calculation popnei lacks,
    and says so;
  - the task ends on the branch `plan/population-analyses`, not on a
    detached commit; a flow that fails once is run 20 times in the
    engine where it failed before it is called flaky or fixed;
  - the answer gives the tokens the subagent used, for the report.
- **Task 0.1, added on 30 September 2026** (the report, "Before the
  first task"): the flow `IP10 D3 the keyboard moves through the table
  cell by cell` of `e2e/pcaResults.spec.ts` failed once in Chromium in
  the browser check of the start, and passed 40 times out of 40 alone; it
  is made to wait for the scroll of the table's box before the plan's
  first browser check.
  - [x] 0.1 That flow made steady, in a commit of its own.
- **What every review of a work package carries**, from the same
  reports: the reviewers that only read run together, reading at a
  commit; `tests`, `browser` and `accessibility`, which run the page,
  each run on a copy made with `git archive` outside the worktree, with
  a directory and a preview server on a port of its own; the keyboard
  and the focus of a screen are driven in Chromium and WebKit by a
  `general-purpose` subagent; `react` and `accessibility` run again
  after the fixes; the review may run beside the next task on its
  copies, which saved a round in stage 4. The `stale` reviewer is told
  to look for the words of stages 2 to 4 that the diversity is one pass,
  has five columns, or has no options.

## 1. The populations shared by the three analyses, in core

**What it gives:** nothing a user sees changes. In the words of work
packages 2, 3 and 6: the diversity, the distances between populations
and the LD decay lock when the lists or the filters of individuals
leave no population, split the populations under the minimum of
individuals with one function, and name them and the populations the
filters emptied in the same words.

**Deliverables:**

1. `PA1 D1 the shared functions of the populations`. Check: `npx vitest
   run src/core/project.test.ts -t "PA1 D1"` passes at least 5 tests
   more than the cases moved, from `project.md`, "How it is verified",
   its sentence "From stage 5": `populationsWithMinimum` at a minimum of
   2 and of 0 (2), `underMinimumText` of one, two and four populations
   (3); and the cases of `populationListsNeeds` and
   `populationsKeptNeeds` moved from `diversity.test.ts`, at least as
   many as were removed there, the report giving both counts. `grep -cE
   "export function (populationListsNeeds|populationsKeptNeeds|populationsWithMinimum|underMinimumText)\("
   src/core/project.ts` gives 4, where it gives 0 on e82b205.
2. `PA1 D2 the warnings of the populations`. Check: `npx vitest run
   src/core -t "PA1 D2"` passes at least 3 tests of `populationWarnings`
   (`diversity.md`, "The warnings", its doc comment): with the
   diversity's words the texts of stage 4, with the words of the
   distances and of the LD decay, and none for the one population.
3. The tests before still pass. Check: `npm test` passes, and the
   browser check gives at least 1038 passed; every line of an existing
   test that `git diff <the start> -- 'src/**/*.test.ts' 'e2e/**'` shows
   changed is a moved case or a tag, and the report lists them.

**Stands on:** the gate.

**Tasks:**

- [x] 1.1 `populationListsNeeds` and `populationsKeptNeeds` moved into
  `src/core/project.ts` from `diversity.ts`, with their tests; and
  `populationsWithMinimum` and `underMinimumText` added (`project.md`,
  "What the analyses per population share from stage 5", its block of
  "The TypeScript interface" and "How it is verified"). The diversity
  calls them; its words do not change. Serves 1 and 3.
- [x] 1.2 `populationWarnings` in `src/core/analyses/words.ts`, called
  by the diversity (`diversity.md`, "The warnings"). Serves 2 and 3.
  Needs 1.1.

**What could go wrong:** the lists' reason has forms of one individual
and of one population, which the flows of stage 3 read; a move that
drops one is seen there, by the browser check.

## 2. The LD decay in the worker and core, and its memory in the browsers

**What it gives:** in the words of work package 8, the calculation
worker answers an LD decay with popnei's numbers and is started again
after every one; the analysis knows its filters, every one of the
Variants step but the LD pruning, its key, its locks, its curve, its
warnings and its check numbers; and how much memory it takes in
Chromium and WebKit is known, so that its lock is kept or changed before
its panel is built.

**Deliverables:**

1. `PA2 D1 the messages of the LD decay`. Check: `npx vitest run
   src/worker/messages.test.ts -t "PA2 D1"` passes at least 5 tests,
   from `messages.md`, "How it is verified": a `run` of an `ldDecay` job
   and its `result` accepted (2), a result of two populations and 50
   bins with 99 values of `meanR2` refused `wrongLength` (1), and the
   version, a `ready` of `protocol: 3` and of 5 giving `otherProtocol`
   and `"4"` giving `wrongType` (at least 2). `grep -c
   "PROTOCOL_VERSION = 4" src/worker/messages.ts` gives 1, where it
   gives 0 on e82b205.
2. `PA2 D2 the runner's LD decay`. Check: `npx vitest run
   src/worker/runner.test.ts -t "PA2 D2"` passes at least 4 tests, from
   `runner.md`, "How it is verified", its bullet "The LD decay" of stage
   5: the job of the flow over `ld.nei` with the numbers of `ldDecay.md`,
   "How it is verified", the populations, variants, pairs, half
   distances and the first and last bins, to the last digit (1); the
   populations named "10" and "2" held in the order of the job (1); a
   population named `__proto__` thrown as a defect (1); and
   `transferablesOf` of a result of the LD decay (1).
3. The fixtures. Check: `e2e/fixtures/ld.vcf.gz` is 20,505 bytes and
   `ld.nei` 68,354 bytes (`wc -c`), and `ld_pops.csv` has the header
   `IID,pop` and 100 rows, 50 of `pop_a` and 50 of `pop_b`; after `node
   e2e/fixtures/make_fixtures.mjs` without `--nei`, `git status --short
   e2e/fixtures public` shows no change to `panel.nei`, `tetraploid.nei`
   or `public/probe/panel.nei`, whose sizes the tests pin
   (`testing.md`, the fixtures of stage 5). None of the three exists on
   e82b205.
4. `PA2 D4 the restart after an LD decay`. Check: `npx vitest run
   src/worker/client.test.ts -t "PA2 D4"` passes at least 5 tests, from
   `client.md`, "How it is verified", "The restart after an LD decay":
   a `result` with a run waiting, whose outcome comes before the worker
   is ended and before the `open` of the new one and the run waiting
   (1); a `refused` (1) and a `crashed` of a defect (1) restarting it; a
   `reopenFailed` not (1); a result of a diversity ending no worker (1).
5. `PA2 D5 the LD decay in core`. Check: `npx vitest run src/core -t
   "PA2 D5"` passes at least 35 tests, from `ldDecay.md`, "How it is
   verified": `ldDecayFilters` (2), `needs` with each row of its table,
   8,333,333 and 8,333,334 with three populations and the LD pruning
   with no distance (at least 6), `parseOptions` (at least 8), `run`
   (1), `fittedR2` and `ldDecayCurve` (at least 5), the warnings (at
   least 7, `halfDistBelowPairs` for each population of `panel.nei`
   among them), `checkNumbers` (1), `refusalText` (at least 2),
   `script` (1) and `ldPlotOmittedText` (2); and of `entry.md`,
   `countsOf` of a result of the LD decay (1).
6. `PA2 D6 the key of the LD decay`. Check: `npx vitest run
   src/core/analyses/ldDecay.test.ts -t "PA2 D6"` passes a test for each
   row of the table of `ldDecay.md`, "What goes into its key", at least
   8, the LD pruning turned on and changed among them; one row is shown
   to fail on a scratch `keyInputs` that gives the LD pruning, and the
   report says so.
7. `PA2 D7 the memory and the time of the LD decay`, the measurement of
   the open-points file, "Set by a measurement", its first bullet.
   Check: `npx playwright test --project=measure-chromium
   --project=measure-webkit -g "PA2 D7" --workers=1` passes, and the
   report holds a table of each part with the engine, its version and
   the machine:
   - on the VCF of `bigVcf.ts` of 20,000 variants and 1,000 individuals
     in three populations, at 100,000 and 1,000,000 bp: the growth of
     the engine, and its size 3 s after a Run with the restart and
     without it (above, "Where the specs are thin");
   - at the lock, 25,000,000 bp for one population and 8,333,333 for
     three, on a file whose positions are drawn at random: whether the
     tab holds, its size, and the time of the fit after the pass, which
     tells no progress;
   - on the dense file, the distance raised from about 2 Mb until the
     tab closes, popnei refuses for memory, or 8,333,333 bp is reached,
     with the largest that ran.

   Each part asserts that it measured a number in every column. From
   them, `ldDecay.md`, "How it runs", `client.md`, "The LD decay, and the
   restart after it", and `docs/architecture.md` section 11 and point 16
   of section 13 get the numbers, in a commit of their own. Firefox: not
   measured, since it does not launch here.

**Stands on:** work package 1.

**Tasks:**

- [x] 2.1 The worker side, in one commit that keeps every check
  passing: `LdDecayJob` and `LdDecayResult` in `protocol.ts`, their
  checks in `messages.ts`, and `PROTOCOL_VERSION` 4, with the tests of
  the version in `messages.test.ts` and `client.test.ts`
  (`protocol.md`; `messages.md`, "The checks" and "How it is verified");
  "The LD decay" of `runner.md` and `transferablesOf`; the fixtures
  `ld.vcf.gz`, `ld.nei` and `ld_pops.csv` written by
  `e2e/fixtures/make_fixtures.mjs` without `--nei`, run with
  `POPNEI=/Users/jose/devel/popnei` (`ldDecay.md`, "How it is verified",
  "The fixture"). A runner that read popnei's objects of the result
  with `in` would give a population named `__proto__` NaN with no word
  (`runner.md`, "The LD decay", step 3), so its test is part of this
  task. Serves 1, 2 and 3.
- [x] 2.2 The client's restart after every LD decay (`client.md`, "The
  LD decay, and the restart after it"). Serves 4. Needs 2.1. Can run
  beside 2.3.
- [x] 2.3 `src/core/analyses/ldDecay.ts` but its key: "Which variants it
  reads", "The populations", "Its options", "Why it cannot run", "The
  request", "The fitted curve", "The warnings", "The check numbers",
  "Its lines of the Python script", "The TypeScript interface" and "Its
  words" of `ldDecay.md`; the LD decay among the analyses whose
  `keptNeeds` locks (`store.md`, "The state of an analysis"); `countsOf`
  of `src/core/apps.ts` with no counts for it (`entry.md`;
  `filterCounts.md`, "Which results fill it"). It is not in
  `POPGEN_ANALYSES` until task 8.1. Serves 5. Needs 2.1.
- [x] 2.4 The key of the LD decay, `keyInputs`, and its tests, in a
  commit of its own (`ldDecay.md`, "What goes into its key"): a key that
  read the LD pruning would take the plot off the screen for a filter
  the analysis does not read, and one that missed another filter would
  show a plot of other variants as current. Serves 6. Needs 2.3.
- [x] 2.5 The measurements of D7, through the application with a
  placeholder panel (above, "Where the specs are thin"), with
  `e2e/bigVcf.ts` given the spacing and the positions drawn at random
  that they need; the dense file tried at 2,000,000, 4,000,000 and
  8,333,333 bp, stopping at the first that closes the tab or is refused.
  A tab that closes is recorded as the outcome of its case, as the
  measurement of the largest write of stage 3 records it, and the test
  goes on to the next case; the task then commits the measurement and
  its table, changes neither the lock nor its words, and reports it
  first in its answer. The numbers are written into the specs and the
  architecture only when no tab closed. Serves 7. Needs 2.2 and 2.4,
  and runs alone in the tree.

**What could go wrong:** the measurement is the one result of the plan
that can change a spec. If a tab closes in Chromium or WebKit, at the
lock or on the dense file, which goes no further than the lock's
distance, the orchestrator stops for the owner, and does not change the lock itself: the lock
would count the individuals × the distance as well, which changes
`ldDecay.md`, "Why it cannot run", its words and its tests, section 11
of the architecture, task 2.3's `needs`, and the screen of work package
8. It asks with the numbers measured, the options (the lock on the
individuals × the distance, with a bound the numbers give; or the lock
as it is, with the words of a tab closed), and a recommendation. Work
packages 3, 4, 6 and 7 go on meanwhile; work package 8 waits for the
answer. The dense file may take tens of minutes an engine (73.6 s for
114 million pairs in node 26.8.2 on the owner's Mac, `ldDecay.md`, "How
it runs"), so the
distances it tries are few and are given in the report. WebKit closed a
tab for a write of about 2.2 GB in stage 3.

## 3. The distances between populations, in the worker and core

**What it gives:** in the words of work package 5, the calculation
worker answers Hudson's Fst and Jost's D of each pair, with the order of
the heatmap of each measure; the analysis knows its locks, fewer than
two populations with the minimum of individuals among them, leaves out
a population under the minimum, and has its warnings and check numbers.

**Deliverables:**

1. `PA3 D1 the messages of the distances`. Check: `npx vitest run
   src/worker/messages.test.ts -t "PA3 D1"` passes at least 5 tests,
   from `messages.md`, "How it is verified": a `run` of a `popDists` job
   and a result with an order of each kind accepted (2); a result of
   three populations with two values of `fst`, `wrongLength`, an order
   `pcoa` of `[0, 0, 2]`, and a `notPlaced` with no `message`, refused
   (3).
2. `PA3 D2 the runner's distances`. Check: `npx vitest run
   src/worker/runner.test.ts -t "PA3 D2"` passes at least 6 tests, from
   `runner.md`, "How it is verified", its bullet "The distances between
   populations" of stage 5, with the numbers of `popDists.md`, "How it
   is verified": the pairs at the missing data filter at 0.1 and at 0.05
   with the order p2, p0, p1 of both measures (2); the names "3", "1"
   and "2" held pair by pair (1); `panel_split.csv`, its negative pair
   and the order p0b, p0a, p2, p1 (1), and at a minimum of 25 the two
   populations in the order of the file (1); and `transferablesOf` of a
   result with an order `pcoa` (1).
3. The fixture `e2e/fixtures/panel_split.csv`. Check: its header is
   `IID,popsplit`, it has 200 rows, and `grep -c ",p0a$"` and `grep -c
   ",p0b$"` give 24 each; it does not exist on e82b205.
4. `PA3 D4 the distances in core`. Check: `npx vitest run src/core -t
   "PA3 D4"` passes at least 30 tests, from `popDists.md`, "How it is
   verified", but the panel's functions, which are work package 5's:
   the worked example (at least 3), the locks, a case for each row of
   `needs` and `keptNeeds` with a list that leaves one population with
   the minimum (at least 6), the warnings with one, two and four
   populations or pairs, "99%" and `jostHaploid` (at least 8),
   `numCheckNumbers` (5), `parseOptions` (at least 7), `refusalText`
   (2) and `script` (1); and of `entry.md`, `countsOf` of a result of the
   distances (1).
5. `PA3 D5 the key of the distances`. Check: `npx vitest run
   src/core/analyses/popDists.test.ts -t "PA3 D5"` passes a test for
   each row of the table of `popDists.md`, "What goes into its key",
   each row of the diversity's table it names counted, at least 14;
   the row of `measure` is shown to fail on a scratch `keyInputs` that
   holds it, and the report says so.

**Stands on:** work package 1; task 2.1, whose files task 3.1 shares.

**Tasks:**

- [x] 3.1 `PopDistsJob`, `PopDistsResult`, `HeatmapOrder`,
  `FileOrderReason` and `LeftOut` in `protocol.ts` and their checks in
  `messages.ts` (`protocol.md`; `messages.md`, "The checks"); "The
  distances between populations" of `runner.md`, the pairs put back in
  the order of the job and the six steps of the order; `transferablesOf`;
  `panel_split.csv` written by `make_fixtures.mjs` (`popDists.md`, "How
  it is verified"). A pair put at the wrong place gives every number of
  the table to the wrong two populations with no error, so the test of
  the names "3", "1" and "2" is part of this task. Serves 1, 2 and 3.
  Needs 2.1.
- [x] 3.2 `src/core/analyses/popDists.ts` but its key and the panel's
  functions: "What it does", "Why it cannot run", "The request", "The
  warnings", "The check numbers", "Its lines of the Python script", "The
  TypeScript interface" (`parseOptions`, `popDistsOptions`,
  `refusalText`) and "The cases" of `popDists.md`; the distances among
  the analyses whose `keptNeeds` locks (`store.md`); `countsOf` with
  their counts (`entry.md`; `filterCounts.md`). Not in `POPGEN_ANALYSES`
  until task 5.1. Serves 4. Needs 3.1 and work package 1.
- [x] 3.3 The key of the distances, `keyInputs`, and its tests, in a
  commit of its own (`popDists.md`, "What goes into its key"): a key
  that held the measure would calculate again at each change of it.
  Serves 5. Needs 3.2.

**What could go wrong:** `notPlaced`, a refusal of popnei's PCoA that no
other step foresaw, is hard to bring about with a real matrix; its test
may need a matrix made for it, and the report says how it was reached.

## 4. The three plots

**What it gives:** in the words of work packages 5, 7 and 8: a square
grid of the distances between named populations, coloured from 0 with
the value in each cell large enough, and a tooltip; the curves of the LD
decay, each population with its points, its line and a mark at its half
distance, and a legend; and histograms of shares on a scale the screen
gives, with ticks at whole counts. Each is tried on `e2e/plots.html`.

**Deliverables:**

1. `PA4 D1 the base of the plots`. Check: `npx vitest run src/charts -t
   "PA4 D1"` passes at least 5 tests in the project `charts`, from
   `plot2d.md`, "How it is verified", the parts of stage 5: the ticks
   of `xWholeNumbers` from 0.5 to 2.5 (1), an axis of a band scale of
   p2, p0, p1 (1), `xLabelAngle` −45 (1), a name `<b>P1</b>` as text
   (1), an empty `xLabel` (1). The tests of the scatter, the histogram
   and the base of stage 4 pass with no line of them changed: `git diff
   <the start> -- src/charts/scatter.test.ts
   src/charts/histogram.test.ts src/charts/plot2d.test.ts` shows added
   lines only. `grep -cE "MAX_HEATMAP_NAMES|MAX_LINE_SERIES"
   src/charts/limits.ts` gives 2 and `grep -c "chart-text-on"
   src/ui/tokens.css` 2, where both give 0 on e82b205.
2. `PA4 D2 the heatmap in node`. Check: `npx vitest run src/charts -t
   "PA4 D2"` passes at least 15 tests, from `heatmap.md`, "How it is
   verified", without a DOM and under jsdom: `heatmapNumber` and the
   class of the text (at least 3); the matrix of `panel.nei` with its
   three paths of steps 239, 245 and 255 and its six values (1); the
   matrix of values all 0 or below (1); the names from the top and the
   diagonal (2); a pair of no value, a negative value and a band of 55
   pixels (3); the four refusals (4); the tooltip on a cell, and none on
   the diagonal or a gap (at least 2).
3. `PA4 D3 the heatmap in the browser`. Check: the browser check with
   `-g "PA4 D3"` gives at least 4 passed, 2 in each engine, on
   `e2e/plots.html`: `toSVG` with the colours of viridis and of the text
   written on each element and no `var(` (1); a hover that shows the
   tooltip and an Escape that hides it, with axe (1).
4. `PA4 D4 the line plot in node`. Check: `npx vitest run src/charts -t
   "PA4 D4"` passes at least 12 tests, from `line.md`, "How it is
   verified", under jsdom: the skeleton (1); two series, their casings,
   points, marks and legend, a third series with no casing, and a group
   of 9 (at least 3); the order of the lines before the points (1); a
   NaN in the points and in the line (2); a mark beyond the domain (1);
   the refusals (at least 3); the ticks of 0 to 100,000 (1).
5. `PA4 D5 the line plot in the browser`. Check: the browser check with
   `-g "PA4 D5"` gives at least 6 passed, 3 in each engine, on
   `e2e/plots.html` with the LD decay of `ld.nei` as literals: `toSVG`
   in the light theme from a dark page, with the stroke `rgb(230, 159,
   0)`, a casing and the legend (1); `toPNG(2)` (1); the four colours
   without a casing at 3:1 or more on the background of each theme (1).
6. `PA4 D6 the histogram of the spectrum`. Check: `npx vitest run
   src/charts -t "PA4 D6"` passes at least 5 tests, from
   `histogram.md`, "How it is verified", the parts of stage 5: the
   shares of p0 with `yMax` 0.061 giving 0 to 0.07 (1), ticks that are
   not whole (1), `xWholeNumbers` over 0.5 to 2.5 (1), and a count of
   −0.1, NaN and a `yMax` below the largest count refused (at least 2).

**Stands on:** the gate. It runs beside work packages 1 to 3 and 6.

**Tasks:**

- [x] 4.1 The base: `plot2d.ts` with an axis of names from a band scale,
  `xLabelAngle`, `nameFormat`, no text for an empty label, and
  `xWholeNumbers` (`plot2d.md`, "The axes" and "The TypeScript
  interface"); the tokens `--chart-text-on-light` and
  `--chart-text-on-dark` in `src/ui/tokens.css` (`css.md`); and
  `MAX_HEATMAP_NAMES` and `MAX_LINE_SERIES` in `src/charts/limits.ts`
  (`heatmap.md` and `line.md`, "The TypeScript interface"). Serves 1.
- [x] 4.2 `src/charts/heatmap.ts` and its classes in `charts.css`, from
  `heatmap.md` whole; the heatmap on `e2e/plots.html` and its flows.
  Serves 2 and 3. Needs 4.1.
- [x] 4.3 `src/charts/line.ts` and its classes, from `line.md` whole;
  the line plot on `e2e/plots.html` and its flows. Serves 4 and 5. Needs
  4.1.
- [x] 4.4 The histogram's three additions for the spectrum:
  `Float64Array` counts, `yMax` and `xWholeNumbers` (`histogram.md`, the
  parts its opening dates 30 September 2026). Serves 6. Needs 4.1.

Tasks 4.2 to 4.4 can run side by side for their parts under jsdom; their
parts in `e2e/plots.ts` and `plots.spec.ts` run one at a time.

**What could go wrong:** jsdom has no layout, so the tooltip's place and
the slanted names are seen only in the browser; the tests reviewer of
stage 3 found 19 of 88 changes to the plots passing every test. The
names under the columns are slanted and their margins are counted, not
measured, at 7.2 pixels a character (`heatmap.md`, "The names on the
axes"): on Linux's fonts they may run out of the frame, which GitHub's
runners show first.

## 5. The panel of the distances

**What it gives:** the user runs the distances between populations,
reads the heatmap in its order by similarity, switches between Hudson's
Fst and Jost's D with no calculation, reads the table of the pairs and
downloads it, lowers the minimum of individuals to bring a small
population in, and is told of the populations left out and of a
negative distance.

**Deliverables:**

1. `PA5 D1 the panel's functions of the distances`. Check: `npx vitest
   run src/core src/ui -t "PA5 D1"` passes at least 20 tests, from
   `popDists.md`, "How it is verified": `popDistsHeatmap` of the two
   orders and of the order of the file (at least 2), `orderText` of each
   row of its table for each measure (at least 6),
   `popDistsDescription` (3), `popDistsRows` and `popDistsCsv` with a
   population named `a,"b"` (at least 2), `tooManyPopulationsText` of
   201, 1,000 and 200 populations (3), and `POP_DISTS_MAX_SHOWN` equal to
   `MAX_HEATMAP_NAMES` (1); of `entry.md`, the analyses of `apps.ts`
   with the distances after the diversity (1); of `shell.md`, the title
   and its plural verb and the announcement of a change of the measure
   (at least 2).
2. `PA5 D2 the distances on the screen`. Check: the browser check with
   `-g "PA5 D2"` gives at least 8 passed, 4 in each engine, the flows of
   `popDists.md`, "How it is verified", In Playwright: `panel.nei` and
   `panel_pops.csv`, Run, the row of p0 and p2 and the rows of the
   heatmap p2, p0, p1; Jost's D drawn with "0.0613" and no running
   state, and the undo; `panel_split.csv` with `negativeDistance`, the
   order p0b, p0a, p2, p1, the minimum at 25 with its notice, the ready
   state naming p0a and p0b, and the heatmap of two; the 201 populations
   with the text of `tooManyPopulationsText`, no heatmap or table, and a
   CSV of 20,100 rows; the links of the Analyses step with "Distances
   between populations" (`shell.md`, "How it is checked"); axe in each
   state reached. And the key on the screen: a change of the measure
   removes no result and sends no request to the calculation worker, a
   change of the minimum removes it with its notice, the requests
   counted by the test.
3. `PA5 D3 the time of the distances`, the measurement of the
   open-points file, "Set by a measurement", its third bullet: on
   `panel.nei` and on the 19 MB `.nei` file, with three populations and
   with twenty. Check: `npx playwright test --project=measure-chromium
   --project=measure-webkit -g "PA5 D3" --workers=1` passes, and the
   report holds its table with the engine, its version and the machine;
   `popDists.md`, "How it runs", gets the numbers.
4. `PA5 D4 what a number field announces`: the text React Aria's
   `NumberField`, through the wrapper `src/ui/widgets/NumberField.tsx`,
   puts in its live region while digits are typed, across two edits, in
   the field of the minimum of the distances, in Chromium and WebKit.
   Check: the browser check with `-g "PA5 D4"` gives 2 passed, 1 in each
   engine, each asserting that it read the region, and the report gives
   what was read. If the region gathers the digits of several edits, as
   stage 4 saw ("5000050000777"), the orchestrator puts it to the owner
   at stop A with a recommendation; a change is made in the wrapper for
   every number field, as a round of stop A, `popDists.md`,
   "Accessibility", first.
5. The screenshots of the panel, light and dark: locked with one
   population and with every population but one under the minimum;
   ready naming a population under the minimum; running; done with the
   heatmap of Fst and its table; Jost's D; the warning of a negative
   distance; the notice of the result removed; the error of the filters
   that keep no variant; above 200 populations; and at 320 pixels. Check:
   each PNG is in `screens/`, and the orchestrator has looked at each.
6. The owner accepts the panel of the distances (task 5.5).

**Stands on:** work packages 3 and 4.

**Tasks:**

- [x] 5.1 The panel's functions of `popDists.ts`, `popDistsHeatmap`,
  `orderText`, `popDistsDescription`, `popDistsRows`, `popDistsCsv` and
  `tooManyPopulationsText` (`popDists.md`, "The TypeScript interface"
  and "Its words"); the distances in `POPGEN_ANALYSES` after the
  diversity, their title in `titles.ts` and their entry in `panels.ts`
  (`entry.md`, "`src/core/apps.ts`"); the shell's words of stage 5 for
  them (`shell.md`, "The status region"). Serves 1.
- [x] 5.2 The panel of `src/ui/analyses/popDists/`, from `popDists.md`,
  "The panel": the field of the minimum and the radio buttons, the
  heatmap mounted as `react.md` mounts a plot, its line of order, the
  table and its download, the text above 200 populations, the states,
  "Its words" and "Accessibility"; the states of D5 in
  `e2e/screens.spec.ts`. Serves 5. Needs 5.1.
- [x] 5.3 The flows of D2 in `e2e/popDists.spec.ts`, with
  `bigVcfPopsCsv` given the number of individuals a population holds,
  for the 201 populations of two; and the measurement of D3, with 20
  populations of the 19 MB file. Serves 2 and 3. Needs 5.2.
- [x] 5.4 The flow of D4, over the field of the minimum. Serves 4.
  Needs 5.2; runs after 5.3, since both run Playwright.
- [ ] 5.5 Stop A: the owner tries the panel of the distances, in
  Firefox and Safari by hand as well, and judges the writers' choices of
  the open-points file that it shows: the field of the minimum with its
  default of 20, the measure left out of the key, the panel after the
  diversity; sees the colours from 0 that the owner decided (point 15)
  on the three pairs of `panel.nei`, three yellows alike; and hears,
  from D4, what a number field announces. The
  meanwhile values of `heatmap.md`, the 56 pixels under which a cell
  holds no value and the width of 40rem, are refined here. Two rounds
  expected.

**What could go wrong:** the heatmap of `panel.nei` has three cells of
three yellows alike, as the owner decided; a user may read it as
broken, which stop A shows. The radio buttons redraw the heatmap
without moving the focus, so their announcement is the only word a
screen reader gets; the keyboard reviewer checks it in both engines.

## 6. The whole diversity, in the worker and core, with the spectrum

**What it gives:** in the words of work package 7, one Run of the
diversity gives F, the alleles per variant, the private alleles and
their rarefied values, and each population's spectrum, in two passes;
its three options are kept in the project and in its file, a draw
larger than the chromosomes of the individuals locks before the Run,
and the warnings of stage 5 are given.

**Deliverables:**

1. `PA6 D1 the messages of the diversity of stage 5`. Check: `npx
   vitest run src/worker/messages.test.ts -t "PA6 D1"` passes at least 6
   tests, from `messages.md`, "How it is verified": a `run` of a
   diversity job with the two fields of stage 5 accepted (1); a job with
   `numCalledAlleles` 1, and one whose `popDiversityPops` names a
   population not in `pops` or two in another order (3); a result with
   `numVarsEveryPop` a number and `numVarsEveryPopInDraw` `null`, and
   one whose `foldedSfs` holds 20 values for a draw of 40 (2).
2. `PA6 D2 the runner's diversity of stage 5`. Check: `npx vitest run
   src/worker/runner.test.ts -t "PA6 D2"` passes at least 10 tests,
   from `runner.md`, "How it is verified", its bullet "The diversity of
   stage 5", with the numbers of `diversity.md` and `sfs.md`: the two
   sets of stage 5, the list of 111, "All individuals", and p0 cut to 12
   (at least 5); the spectra with no filter, equal to those of a call
   that asks `folded_sfs` alone (1); the progress of two passes and of
   one (2); one population with no private alleles asked (1); the
   populations `10`, `9` and `p` in the order of the job (1).
3. `PA6 D3 the options of the diversity`. Check: `npx vitest run
   src/core -t "PA6 D3"` passes at least 15 tests, from `diversity.md`,
   "How it is verified": `parseOptions` (at least 8), "The populations of
   `calcPopDiversity`" with `drawOf` (at least 5), and "The lock of the
   draw" (at least 5).
4. `PA6 D4 the warnings, the rows and the script of stage 5`. Check:
   `npx vitest run src/core -t "PA6 D4"` passes at least 10 tests, from
   `diversity.md`, "How it is verified": "The warnings of stage 5" (at
   least 7), `diversityRows` with no private alleles (1), `script` with
   the spectrum's lines of `sfs.md`, "Its lines of the Python script",
   as a literal (1), and `diversityCsv` of eleven columns (1).
5. `PA6 D5 the key version 3`. Check: `npx vitest run src/core -t "PA6
   D5"` passes at least 4 tests: the rows of `diversity.md`, "What goes
   into its key", that stage 5 adds, `minNumIndividuals` with the
   default draw and `numCalledAlleles` typed or set back (at least 2);
   `keyInputs` with the default draw giving no `numCalledAlleles` (1);
   and a project file of stage 4 with a diversity whose check numbers
   are compared and told as "calculated in another way"
   (`projectFile.md`, "The versions of the format", its bullet on
   `checkNumbers`) (1).
6. `PA6 D6 the spectrum's module`. Check: `npx vitest run src/core -t
   "PA6 D6"` passes at least 8 tests, from `sfs.md`, "How it is
   verified": a population not calculated (1), the worked example with
   the same object and the defect (at least 3), `spectrumWarnings` (3),
   `spectraCsv` (1), and the numbers of popnei (1).
7. `PA6 D7 the project file of stage 5`. Check: `npx vitest run
   src/core/projectFile.test.ts -t "PA6 D7"` passes at least 1 test:
   `v1-stage5-options.popnei.json` opened into its literal project and
   written back byte for byte (`projectFile.md`, "How it is verified");
   and the property of `project.md` that draws the options of the three
   analyses passes.
8. The tests before still pass, with their changed lines listed as in
   work package 1: the key version raised, the fields of the job and
   the result, the flows of stages 2 and 3, whose five first columns do
   not change.

**Stands on:** work package 1; task 3.1, whose files task 6.1 shares;
tasks 2.3 and 3.2 for the fixture of task 6.6.

**Tasks:**

- [x] 6.1 The second call, across the layers in one commit that keeps
  the application working: the two fields of the job and the eleven of
  the result in `protocol.ts` and their checks in `messages.ts`;
  `calcPopDiversity` in the runner, steps 6 to 8 of "The diversity" of
  `runner.md`, with the progress of two passes ("Progress"); core's
  `run` sending the default draw and `popDiversityPops` from
  `populationsWithMinimum` (`diversity.md`, "The request"). A spectrum
  read with `Object.hasOwn` would crash a diversity with a population
  named `__proto__`, which ran in stages 3 and 4 (`runner.md`, step 7),
  so its test is part of this task. Serves 1, 2 and 8. Needs 3.1.
- [x] 6.2 The options: `parseOptions` with its three fields,
  `diversityOptions`, `drawOf`, and the lock of the draw in `needs` and
  `keptNeeds` (`diversity.md`, the options of "What it does", "Why it
  cannot run" and "The TypeScript interface"); the doc comment of
  `keptNeeds` in `store.ts` (`store.md`, "The definition of an
  analysis"); the options of the three analyses read by
  `projectFile.ts` (`projectFile.md`, "The versions of the format"). Serves 3. Needs 6.1.
- [x] 6.3 The warnings of stage 5, `diversityRows` and `diversityCsv` of
  eleven columns, and `script` with the spectrum's lines inside its
  block `if large:` (`diversity.md`, "The warnings", "Its lines of the
  Python script" and "What it shows"; `sfs.md`, "Its lines of the Python
  script"). Serves 4. Needs 6.2 and 6.5.
- [x] 6.4 The key version 3 and `keyInputs` without the default draw,
  in a commit of its own (`diversity.md`, "What goes into its key"): a
  key that held the default draw would make every project file of stage
  4 leave its check numbers uncompared. Serves 5. Needs 6.2.
- [x] 6.5 `src/core/analyses/sfs.ts`: `spectraOf`, `spectraCsv` and
  `spectrumWarnings` (`sfs.md`, "The module"). Serves 6. Needs 6.1; can
  run beside 6.2 and 6.4.
- [x] 6.6 First, in a commit of its own, the check numbers of the
  distances in `projectFile.md`, "How it is verified", beside the
  fixture: those of `popDists.md`, "How it is verified", at the missing
  data filter at 0.1, which popnei gives at a minimum of 10 as at 20
  (above, "Where the specs are thin");
  then the fixture `src/core/fixtures/projectFile/v1-stage5-options.popnei.json`,
  written by hand from `projectFile.md`, "How it is verified", and
  `wholeProject` of `src/core/testSupport.ts` drawing the options of the
  three analyses. Serves 7. Needs 2.3, 3.2 and 6.2.

- [x] 6.7 Added on 30 September 2026, from the reviews of work packages
  2 and 3: the small rules of the populations that the three analyses
  wrote each for itself, gathered into one exported function each, with
  no change to what they give: `MAX_NAMED` beside `namesOf`; whether the
  project has a threshold on the individuals, from `individualsKept.ts`;
  the populations the lists leave; the diversity's own rule of shares
  replaced by `percentOf`. Needs 6.3 and 6.4, which edit
  `diversity.ts`.

**What could go wrong:** the flows of stages 2 and 3 read the diversity's
rows by their cells; a column added before the fifth breaks them, and
the spec keeps F sixth for that reason. A job of the diversity that sent
`numCalledAlleles` above the chromosomes of the individuals kept would
be refused only after the whole first pass; the lock of task 6.2 is
what keeps it from happening, and its test is the check.

## 7. The panel of the diversity, whole, and the block of the spectrum

**What it gives:** the user sets the minimum of individuals, the
threshold of polymorphism and the draw of the rarefaction, and goes back
to the default draw with a button; reads the eleven columns, and the
populations under the minimum named before a Run; and reads under the
table one histogram of the spectrum per population, on one scale, with
its table and its CSV.

**Deliverables:**

1. `PA7 D1 the diversity whole on the screen`. Check: the browser check
   with `-g "PA7 D1"` gives at least 8 passed, 4 in each engine, from
   `diversity.md`, "How it is verified", its last paragraph: the flow of
   stage 2 reading the row p0 to its end and p2's private alleles; the
   flow of stage 3 reading p0 with F −0.0141; a draw of 96 typed, the
   warning `variantsNotInDraw` of p0 and the column headed with 96, then
   "Use the default"; a population under the minimum named in the ready
   state; axe in each state reached.
2. `PA7 D2 the spectrum on the screen`. Check: the browser check with
   `-g "PA7 D2"` gives at least 4 passed, 2 in each engine, from
   `sfs.md`, "How it is verified", In Playwright: three histograms, each
   headed by its population, of 20 bars, and the table of 21 rows; the
   MAF filter at 0.95 with the text of `mafFilterOnSpectrum`; the block
   at 320 pixels with no sideways scroll; axe.
3. `PA7 D3 the time of the second pass`, the measurement of the
   open-points file, "Set by a measurement", its second bullet: a Run of
   the diversity and the time of each of its two passes on `panel.nei`
   and on the 19 MB `.nei` file. Check: `npx playwright test
   --project=measure-chromium --project=measure-webkit -g "PA7 D3"
   --workers=1` passes, and the report holds its table with the engine,
   its version and the machine, and what popnei issue #4 would save;
   `diversity.md`, "How it runs", gets the numbers.
4. The screenshots of the panel, light and dark: ready with the three
   fields and the line of the default draw; a draw typed with "Use the
   default"; ready naming a population under the minimum; locked by the
   draw; running at "pass 1 of 2"; done with the eleven columns and the
   block of the spectrum, its histograms and its table; the warning of
   the MAF filter; and at 320 pixels. Check: each PNG is in `screens/`,
   and the orchestrator has looked at each.
5. The owner accepts the panel of the diversity and the spectrum (task
   7.4).

**Stands on:** work packages 4 and 6.

**Tasks:**

- [x] 7.1 The options and the table: the three fields with the line of
  the default and "Use the default", the eleven columns, the ready state
  with `underMinimumText`, the running state of two passes
  (`diversity.md`, "The panel": "What it shows", "The states", "Its
  words" and "Accessibility"). Serves 1 and 4.
- [x] 7.2 The block of the spectrum, below the table in the state done:
  its caption, one histogram per population with the shared `yMax`, the
  line under them, the table in its tab and the download (`sfs.md`, "The
  block of the panel"); the states of D4 in `e2e/screens.spec.ts`.
  Serves 2 and 4. Needs 7.1.
- [x] 7.3 The flows of D1 and D2, extending `e2e/diversity.spec.ts` and
  `diversityKept.spec.ts`; the measurement of D3. Serves 1, 2 and 3.
  Needs 7.2.
- [ ] 7.4 Stop B: the owner tries the diversity and the spectrum, in
  Firefox and Safari by hand as well, and judges the writers' choices of
  the open-points file that they show: no private alleles for one
  population, the check numbers as they were, eleven columns with F
  sixth, the lock of the draw, no warning of the MAF filter on the
  table, the warning of variants outside the draw from one variant, the
  words of F in a haploid file, and the populations under the minimum
  named before a Run. Two rounds expected.

**What could go wrong:** a table of eleven columns does not fit 320
pixels, and the spec leaves how it scrolls to the running application;
the check at 320 pixels is of the page, whose table scrolls in its own
frame. The block draws one histogram per population, and a column of 50
populations is 50 plots; the spec leaves their layout to the running
application.

## 8. The panel of the LD decay

**What it gives:** the user types the largest distance and runs the LD
decay, and sees each population's bins, curve and half distance, the
table of the populations and the table of the bins with their CSVs, and
is told that the LD pruning of the Variants step is not applied.

**Deliverables:**

1. `PA8 D1 the panel's functions of the LD decay`. Check: `npx vitest
   run src/core src/ui -t "PA8 D1"` passes at least 10 tests, from
   `ldDecay.md`, "The panel", "What it shows" and "Accessibility":
   `ldDecayRows` and `ldBinRows` (2), `ldDecayCsv` and `ldBinsCsv` (2),
   the data of the plot, the points at the middle of each bin and the
   mark at half of `r2AtZero` (at least 2), the labels of the legend,
   "half at 7,548 bp", "beyond the plot", "no curve", "no pair" and
   "half at 0.247 bp" (at least 2), and the description (1); of
   `entry.md`, `apps.ts` with the LD decay last (1); of `shell.md`, its
   title, singular (1).
2. `PA8 D2 the LD decay on the screen`. Check: the browser check with
   `-g "PA8 D2"` gives at least 4 passed, 2 in each engine, the flows of
   `ldDecay.md`, "How it is verified", with Playwright: `ld.nei` and
   `ld_pops.csv`, the column `pop`, the lock of the distance beside the
   field and the Run button, 100000 typed, Run, the plot, "7,548" and
   "7,340" in the column "Half distance (bp)" and no warning, the path
   of the keyboard of "Accessibility", and axe in each state; and the 17
   populations, 16 rows in the legend, the line of `ldPlotOmittedText`
   and 17 rows in the table.
3. `PA8 D3 the key of the LD decay on the screen, and its restart`.
   Check: the browser check with `-g "PA8 D3"` gives at least 4 passed,
   2 in each engine: the LD pruning of the Variants step turned on and
   its distance changed remove no result and send no request, and the
   missing data filter changed removes it with its notice, the requests
   counted by the test; and after an LD decay, a Run of the diversity
   answered by a new calculation worker, the workers the page started
   counted by the test.
4. The screenshots of the panel, light and dark: locked by the empty
   distance, with its reason beside the field and the Run button;
   locked by the memory; ready with the line of the LD pruning; running,
   with the line of the fit; done with the plot and its legend; the
   table of the bins in its tab; `fewIndividuals` with 17 populations;
   `halfDistBelowPairs` on `panel.nei`; the error of the filters that
   keep no variant; and at 320 pixels. Check: each PNG is in `screens/`,
   and the orchestrator has looked at each.
5. The owner accepts the panel of the LD decay (task 8.4).

**Stands on:** work packages 2 and 4; tasks 5.1 and 7.1, whose files
task 8.1 shares; and, if a tab closed in task 2.5, the owner's answer.

**Tasks:**

- [x] 8.1 The panel's functions: the data of the plot, the labels of
  the legend, the description, the two tables and their CSVs
  (`ldDecay.md`, "What it shows", "Its words" and "Accessibility"); the
  LD decay in `POPGEN_ANALYSES` after the distances, its title and its
  entry in `panels.ts` (`entry.md`); the shell's words for it
  (`shell.md`); the placeholder panel of task 2.5 taken out. Serves 1.
  Needs 2.4, 5.1 and 7.1.
- [x] 8.2 The panel of `src/ui/analyses/ldDecay/`, from `ldDecay.md`,
  "The panel": the two fields, the empty distance as the PCA's, the line
  of the LD pruning, the plot mounted with `ldDecayCurve`, the line past
  16 populations, the two tables in their tabs, the downloads, the
  states, "Its words" and "Accessibility"; the states of D4 in
  `e2e/screens.spec.ts`. Serves 4. Needs 8.1 and 4.3.
- [ ] 8.3 The flows of D2 and D3 in `e2e/ldDecay.spec.ts`. Serves 2 and
  3. Needs 8.2.
- [ ] 8.4 Stop C: the owner tries the LD decay, in Firefox and Safari by
  hand as well, and judges the writers' choices of the open-points file
  that it shows: the largest major allele frequency as an option, the
  warning of few individuals below 20, the lock at 1 GB with the
  numbers of task 2.5, and at most 16 populations drawn. Two rounds
  expected.

**What could go wrong:** the fit after the pass tells no progress, so
the bar stands full while it runs; on the dense files of task 2.5 that
may be seconds, and the line of the running state is all the user has.
The field of the distance is empty until typed, and the PCA's field
found that React Aria's field turns an empty field into `NaN` or keeps
the last number; the flow of the keyboard checks that no key sends
anything while it is empty.

## 9. The end of the stage

**What it gives:** the application checked whole, and every case of the
specs of stage 5 matched to a test.

**Deliverables:**

1. The whole. Check: on the last commit `npm run format:check`,
   `typecheck`, `lint` and `build` exit 0; `npm test` passes with no
   test skipped; the browser check passes, the probe's 52 among them;
   `npm run screens` passes; `npm pkg get dependencies.popnei` prints
   the URL of `js-v0.1.0-dev.3`; `grep -rnE
   "Date\.now|new Date|Math\.random|setTimeout|setInterval|\bawait\b|from
   \"popnei\"" src/core --include="*.ts" --exclude="*.test.ts"` finds
   nothing; the first script of `popgen.html` measured gzipped, beside
   the 229.89 kB of e82b205.
2. Every document the specs of stage 5 ask to change is changed: each
   item of their sections "What this spec asks of other documents" that
   names a skill, `docs/architecture.md`, `docs/functionality.md`,
   `docs/build-order.md` or a file of code is found in the diff or on
   `main` before the start, and listed in the report with its commit;
   section 11 of the architecture holds the numbers of tasks 2.5, 5.3
   and 7.3.
3. The map of the cases, `docs/plans/population-analyses.cases.md`:
   every item of "The cases" and of "How it is verified" of the specs of
   stage 5 mapped to a test that gives its input and checks its outcome,
   as `docs/plans/individuals-pca.cases.md` does; a test written for an
   item that has none is seen to fail with the code it guards broken;
   the report lists every item left without a test, with its reason.
   The parts of the map are joined by a script from the start, since the
   map of stage 4 had 182 of its 2,438 line numbers moved by later
   commits.

**Stands on:** work packages 5, 7 and 8.

**Tasks:**

- [ ] 9.1 The documents, and the final checks, with a sentence of
  section 7 of `docs/architecture.md` that the order of the heatmap and
  the curve of the LD decay are made outside the plots, found missing
  by the review of work package 3. Serves 1 and 2.
- [ ] 9.2 The map of the cases, and the tests it finds missing. Serves
  3. Needs 9.1.

## At the end

The plan is done when every box is ticked; the owner has accepted the
screens at stops A, B and C; the measurements are in the report and in
the specs; and the report is finished. It then waits for the owner's
order to merge `plan/population-analyses` into `main`. The push of
`main` that follows, also the owner's order, runs the flows in Firefox
for the first time for this stage, and on the fonts of Linux; a flow
that fails there is fixed on `main` before anything else.
