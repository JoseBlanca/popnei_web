# Plan: the Individuals step and the PCA

28 September 2026, approved by the owner the same day; under way from 28 September 2026 on the branch `plan/individuals-pca`. It builds stage 4
of `docs/build-order.md`: the changes to the Variants step of stage 3
that the owner decided on 28 September 2026, the individuals filtered
first and the filters that keep their values while off; the Individuals
step whole, with the metadata file optional and the types of its
columns set by the user; the principal components of the individuals,
PCA and PCoA, drawn in 2D and in 3D; and the metadata file read from an
xlsx. It builds on popnei's release `js-v0.1.0-dev.3`, on the revision
of `docs/architecture.md` and the specs the owner approved on 28
September 2026, and on the decisions gathered in
`docs/specs/stage-4-open-points.md` (the open-points file, below). The
specs are called below by their file names:

- new: `docs/specs/analyses/pca.md`, `docs/specs/charts/scatter.md` and
  `pca3d.md`, and `docs/specs/worker/files.md`, which is xlsx_rs's spec
  and not built here;
- revised: `docs/specs/steps/individuals.md`, rewritten whole, and
  `steps/variants.md`; `docs/specs/core/project.md`, `projectFile.md`,
  `store.md`, `keys.md`, `cache.md` and `individualsKept.md`;
  `docs/specs/analyses/diversity.md`, `individualChecks.md`,
  `variantChecks.md`, `filterCounts.md` and `writeVariants.md`;
  `docs/specs/worker/protocol.md`, `messages.md`, `runner.md`,
  `client.md` and `individuals.md`; `docs/specs/charts/plot2d.md`;
  `docs/specs/shell.md`, `entry.md` and `site.md`.

It is carried out as the `following-plans` skill says, on the branch
`plan/individuals-pca`, with its report in
`docs/plans/individuals-pca.report.md` and its map of the cases in
`docs/plans/individuals-pca.cases.md`, as stage 3 had them.

When the plan is done, a user loads `panel.nei`, loads a metadata file
or goes on without one, sets the type of each column, and chooses a
column or "All individuals in one population"; filters the individuals
first and the variants over the individuals kept, with every switch
keeping its values while off and the LD filter asking for its distance;
runs the PCA or the PCoA and sees the individuals in 3D, or in 2D where
the browser cannot draw 3D, coloured by a column; and, once xlsx_rs has
its first release, loads the metadata file as an xlsx.

## The breakdown, as the owner approved it

Approved by the owner on 28 September 2026:

1. popnei `js-v0.1.0-dev.3`: `package.json` moves to the release; the
   stage-3 tests of the sizes of written files take the new sizes
   (`runner.md` and `writeVariants.md` list them); the wasm size
   measured; nothing a user sees changes. About 2 tasks.
2. The order of stage 3 changed, the individuals first (architecture
   sections 2 and 4; `individualChecks.md`, `variantChecks.md`,
   `filterCounts.md`, `individualsKept.md`, `store.md`, `runner.md`,
   `protocol.md`, `messages.md`, `entry.md`, `steps/variants.md`,
   `shell.md`; entry A of the open-points file lists the code of stage 3
   it changes): the fixtures written again, the numbers 116 and 111; the
   Variants step shows its individuals first. About 4 tasks.
3. The filters of the Variants step: the LD filter with no default
   distance (`variantFilterNeeds`, `jobFilters`, `ProjectVariantFilter`,
   `LD_DIST_TURNED_ON` removed) and the filters that keep their values
   while off (`filtersOff`, `individualFiltersOff`, the turn-off
   commands). About 3 tasks. Then stop A: the owner tries the Variants
   step with 2 and 3, 2 rounds.
4. The project for stage 4 in core: `onePopulation` and "All
   individuals", the functions of the populations in `project.ts`
   (`populationsBeforeRun` among them), `typesSet` with the types that
   wait and come back and `typesLost` computed, `columnAllows`,
   `setColumnType`, `forgetTypesLost`, `notGiven`, the project file at
   version 1; the diversity on one population. No screen. About 4
   tasks.
5. The Individuals step (`steps/individuals.md`): the type selects, the
   coding, "All individuals in one population", no file, Forget these
   types, Copy the names, the stepper's Optional (`shell.md`); the table
   checked at 320 px; the measurement of `columnAllows` (`project.md`,
   "How it runs"). About 3 tasks. Stop B: the owner tries it, 2 rounds.
6. The PCA and the PCoA in the worker and core (`pca.md`, the module;
   `protocol.md`, `messages.md`, `runner.md`, `client.md`; `store.md`
   for the PCoA's `keptNeeds`): the job, the result, the calls to
   popnei, the cut to 10 components, the restart after 700 individuals;
   the analysis with its own filters following the Variants step, its
   key, locks, warnings and check numbers; the runner's tests with
   popnei's numbers on `panel.nei`; the measurements that set constants
   (the time of the pruning, point 1 of the open-points file; the time
   and memory of a PCA in the three engines, which set
   `PCA_RESTART_INDIVIDUALS`). About 5 tasks.
7. The 2D scatter (`scatter.md`, the revision of `plot2d.md`,
   `charts.md`): the plot, `marks.ts`, `legend.ts`, `hover.ts`, the
   export with the legend and `stroke-linejoin`, tested on
   `e2e/plots.html`; the time to draw 9,381 points in WebKit measured.
   About 3 tasks.
8. The PCA panel and the 3D view (`pca.md`, the panel; `pca3d.md`;
   `scatter.md`): its first task finds which headless engines give
   WebGL on the owner's Mac and on GitHub's runners; then three.js
   0.186.1 and `@types/three` as dependencies, approved on 27 September,
   loaded with `import()`; the panel opening in 3D with the 2D fallback,
   the legend that highlights, the table and its CSV, the zoom with
   Ctrl; the Playwright test reading popnei's numbers on the screen; the
   check of the key (colour, axes and view remove no result). About 5
   tasks. Stop C: the owner tries the PCA panel, and the zoom key on a
   Mac, 2 rounds.
9. The xlsx through xlsx_rs (`worker/individuals.md`, "The package of
   xlsx_rs, loaded on first need"; `files.md` is xlsx_rs's own spec): the
   light worker loads the package on first need, `readXlsxCells`, the
   Individuals step accepts an `.xlsx`. It stands on xlsx_rs's first
   release; if that is not there when work package 8 ends, the plan ends
   without it and this work package waits. About 2 tasks.
10. The end: the documents, the map of the cases and the tests it finds
    missing, as stage 3 ended.

The order: the changes of stage 3 first, since every analysis of stage
4 reads the filters in the new order; core before the screens; the plots
before the panel; the check of WebGL first in its work package; the xlsx
last. Work packages 4 and 5, and 6 and 7, can run side by side once 3 is
done. Out: the lasso; the Python script and the report (stage 6); the
filter by the regions of a BED file, which popnei's `js-v0.1.0-dev.3`
has and stage 4 does not build; anything xlsx_rs builds itself.

## Words used below

- A **pass** is one reading of the variants file from its start.
- A **flow** is a Playwright test that goes through the page as a user
  does.
- The **browser check** is `POPNEI_TEST_PAGES=1 npm run build && npx
  playwright test --project=chromium --project=webkit`, with a
  selection `-g "<tag>"` where a deliverable names one. Playwright 1.63.0
  cannot launch Firefox on the owner's Mac ("Failed to launch the
  browser process", seen again on 28 September 2026), so no check of this
  plan is `npm run test:e2e`, which names Firefox. Firefox runs on
  GitHub when `main` is pushed after the merge, and the owner tries each
  screen in Firefox by hand at its stop.
- A **tag** starts the name of a `describe` block of Vitest or the title
  of a Playwright test, `IP3 D2` for work package 3, deliverable 2. `IP`
  is for the Individuals and the PCA; stages 1 to 3 used `WP`, `WS` and
  `VS`. A Vitest count is the summary line of `npx vitest run <path> -t
  "<tag>"`, "Tests N passed"; a tag that selects nothing gives "N
  skipped" and exits 0, so the number passed is what is read. A
  Playwright count is the summary line of the browser check with `-g
  "<tag>"`, over both engines, half in each; a tag that selects nothing
  exits 1 with "No tests found".
- A **stop** is where the orchestrator waits for the owner to try a
  screen; a **round** is one change the owner asks for there, with its
  commit and its screenshots taken again.
- A **meanwhile** is what the work follows while an open point waits for
  the owner.
- A name of the code in backquotes, `filtersRead`, `jobFilters`,
  `columnAllows`, is the spec's, and is defined in the part of the spec
  the task cites; the plan does not repeat what it does.
- **The start** is the commit of `main` the branch `plan/individuals-pca`
  is made from; the report names it.

## In and out

In: every module and screen the specs above give, and the measurements
the open-points file lists under "Set by a measurement", each in the
work package that meets it, with two more the specs ask for: the time of
`columnAllows` (`project.md`, "How it runs") and the point size a
graphics card gives WebGL (`pca3d.md`, "How it runs").

Out, besides what the breakdown leaves out:

- popnei's four asks that its release does not give (the open-points
  file, "Asked of popnei"). So the PCA locks on the individuals of the
  file, its bar stands still during the decomposition, its empty pass
  has popnei's old words, and the note of the missing genotypes is a
  note and not a warning;
- the variants a pruning kept, kept for the next PCA, which popnei is
  asked for only if work package 6 measures the pruning as long;
- the export of the plots on the screen and the zip of the report, in
  stage 6;
- the writer of the VCF, the histogram of the missing rate and the
  density of variants, which the release has and no spec of stage 4
  uses.

### What is still the owner's, and the task each would change

From the open-points file, "What is still the owner's":

- **The repository of xlsx_rs and its first release**, and the eight
  xlsx files of its tests, three of which the flow of task 9.2 copies.
  On 28 September 2026 `gh repo view JoseBlanca/xlsx_rs` answers "Could
  not resolve to a Repository". Work package 9 waits for the release;
  nothing before it does. The place of the zip of the report is for
  stage 6 and changes no task here.
- **The key of the zoom on a Mac** (point 10): Ctrl held with the wheel,
  tried at stop C, task 8.6, in Safari and in WebKit. If Ctrl clashes
  there, the owner is asked whether ⌘ takes its place on a Mac, which is
  a round of stop C on `pca3d.md`, "The view", and task 8.2's listener.
- **The legend over the plot** (point 14, `scatter.md`, Open 1),
  judged on the running screen at stop C. Meanwhile, over the plot. A
  strip beside the plot would be a round of stop C on the panel of task
  8.4 and the legend of the exported file of task 7.2.

The choices of the specs that the owner may overrule on the screen
(the open-points file, "Choices of a spec the owner may overrule") are
judged at the stop of the screen that shows each: those of the Variants
step at stop A, of the Individuals step at stop B, of the PCA and its
plots at stop C. The open points of earlier stages stay as they are: the
bound of the cache (`cache.md`), how far back undo goes (`history.md`),
and the words of the project file (`projectFile.md`).

### Where the specs are thin, and what the plan does

- **The sizes of two written files are in no spec.** Until work package
  2 changes the order, the runner's tests and one flow write `panel.nei`
  at 0.05 with the lists of 125 and 119 individuals of stage 3.
  `runner.md` gives their sizes with `js-v0.1.0-dev.2`, 176,098 and
  170,042 bytes, and not with `js-v0.1.0-dev.3`. With the release in
  node on 28 September 2026 they were 176,122 and 170,122 bytes, by the
  script `numbers3.mjs` of `runner.md` with the lists of stage 3. Task
  1.1 writes them into `runner.md`, "The written file" of "How it is
  verified", as the sizes of the order of stage 3, in a commit of its
  own, and task 2.1 takes them out with the order.
- **`steps/individuals.md` has no section "How it is checked"**, where
  `steps/variants.md` has one. Task 5.1 writes it first, in a commit of
  its own, from the spec's own parts, "The states", "What it sends and
  reads", "Its words" and "Accessibility", and from the checks of
  `shell.md` it names; it adds no behaviour. The orchestrator gives it to
  the owner at stop B with the screen, and the owner may ask to see it
  before work package 5 starts.
- **The PCA in a browser before its panel.** The measurements of task
  6.5 need the PCA to run in Chromium and WebKit, and the PCA joins the
  application only in task 8.3. Task 6.5 runs it through a page of the
  measurements, served outside `dist/` as `e2e/measure/points.html` is
  (`.claude/skills/coding/testing.md`, "The measurements"). If such a
  page cannot reach the calculation worker within the task, the
  measurement moves to the end of work package 8, where the panel runs
  the PCA, and `PCA_RESTART_INDIVIDUALS` stays at the 700 of `pca.md`
  meanwhile; the report says so.
- **GitHub's runners and WebGL.** `pca3d.md` asks which engines give
  WebGL "on the Mac and on CI when `main` is pushed". The plan's branch
  is never pushed, so task 8.1 sees the Mac only, and the runners are
  seen at the first push of `main` after the merge, which is the owner's
  order. Until then `testing.md` says they are not seen.

## Before the first task

- **The plan and the specs approved.** The owner approved the specs of
  stage 4 and the revision of `docs/architecture.md` on 28 September
  2026, and approves this plan before it is run. Check: `grep -rlzE "not
  yet[[:space:]]+(reviewed nor[[:space:]]+)?approved" docs/specs`
  prints nothing, as it does on 2cedc40.
- **The branch.** This plan is written on the branch
  `docs/plan-individuals-pca`; once the owner approves it, the owner
  orders that branch merged into `main`, as the plan of stage 3 was, and
  `plan/individuals-pca` is then made from `main`, which holds the plan.
  If the owner orders the plan run before that merge, the orchestrator
  asks whether to merge first. Check: `git ls-tree -r --name-only main
  docs/plans/individuals-pca.md` prints the path; on 2cedc40 it prints
  nothing. On the start, the checks of the next items are run again and
  give the same results, since the merge of this plan adds documents
  alone.
- **node 24 or later.** This machine has node 26.8.2 and npm 11.19.1,
  checked on 28 September 2026.
- **popnei.** `npm pkg get dependencies.popnei` prints the URL of
  `js-v0.1.0-dev.2` on 2cedc40, and task 1.1 changes it. The release
  `js-v0.1.0-dev.3` exists: `gh release view js-v0.1.0-dev.3 -R
  JoseBlanca/popnei` gives the asset
  `https://github.com/JoseBlanca/popnei/releases/download/js-v0.1.0-dev.3/popnei-0.1.0.tgz`,
  953,891 bytes, sha256 `974f5f1c…4278c4d`, published on 28 September
  2026. Installed in a folder of its own and run under node 26.8.2 on 28
  September 2026, it gave to the last digit the numbers of the specs
  that were tried: the written files of 261,570, 251,074 and 3,682
  bytes, and of 160,186 and 156,818 bytes with the lists of 116 and 111
  (`runner.md`); the lists of 116 and 111 and the 1,096 variants the
  three filters keep over the second (`orderA.mjs` of `runner.md`); and
  the PCA and the PCoA of `pca.md`, "How it is verified", PC1 and PC2,
  `s000` on PC1 and `lingoesConstant`, with the filters of a new project
  and with the PCA's own LD filter.
- **xlsx_rs.** `npm pkg get dependencies.xlsx_rs` prints nothing on
  2cedc40, and no repository of that name exists (above). Only work
  package 9 needs it.
- **The browsers.** Playwright 1.63.0 launches Chromium and WebKit here,
  and not Firefox (above, "the browser check").
- **The checks on 2cedc40**, after `npm ci`, on 28 September 2026:
  `format:check`, `typecheck` and `lint` exit 0; `npm test` gives "Tests
  2107 passed (2107)" in 63 files; `POPNEI_TEST_PAGES=1 npm run build`
  exits 0, the page's first script `popgen-*.js` 191.81 KB gzipped and
  popnei's wasm 710.62 KB gzipped as Vite counts them; `npx playwright
  test --project=chromium --project=webkit` gives "618 passed" in 1.7
  minutes, among them the probe's 40, the tests of `e2e/probe.spec.ts`,
  20 in each engine; `--project=screens --list` lists 244 tests and the
  two measurement projects 38. `npx vitest run -t "IP"` gives "Tests
  2107 skipped (2107)", and the browser check with `-g "IP[0-9]" --list`
  "Total: 0 tests", so every tag below selects nothing there; and `npm
  ls d3-shape d3-path d3-scale-chromatic three xlsx_rs` prints
  "(empty)".
- **Every task commits when the checks pass**: `format:check`,
  `typecheck`, `lint`, `npm test`, and the browser check, and not only
  the count of its deliverable.
- **What a task waits for.** A task waits only for the tasks its
  "Needs" names, and a task with no "Needs" for nothing but the gate; a
  work package's "Stands on" is the union of what its tasks need outside
  it.
- **Tasks side by side** share the one worktree and its `dist/`. Each
  runs the format, the types, the lint and Vitest on its own files;
  none runs the build, the development server, Playwright or a
  measurement while another runs beside it. The orchestrator runs the
  whole tree's checks, the browser check among them, once both have
  committed. Two tasks marked side by side that the plan says share a
  file do not run at the same time.
- **When a work package is done**: its deliverables pass, run by the
  orchestrator; its review of the `code-review` skill has run and the
  findings the orchestrator took are fixed, with the deliverables run
  again after the fixes; and, for one with a stop, the owner has
  accepted the screen. The box of its last task is ticked only then.
- **The large files of the measurements** are made in `MEASURE_DIR`,
  `$TMPDIR/popnei-measure`, outside the repository, as `testing.md`,
  "The measurements", has it: the VCF of 80,692,954 bytes and the `.nei`
  file of 19,161,178 bytes of stage 2, and the VCFs of 1,000 to 9,381
  individuals of `e2e/bigVcf.ts` that task 6.5 needs. A measurement runs
  alone in the tree: no build and no fixer beside it, since a build
  replaces `dist/` under it (stage 3's report, work package 5).
- **The new dependencies**, each approved by the owner and pinned as
  its spec gives it: `d3-shape` 3.2.0, `d3-path` 3.1.0,
  `d3-scale-chromatic` 3.1.0, and for development `@types/d3-shape`
  3.2.0, `@types/d3-path` 3.1.1 and `@types/d3-scale-chromatic` 3.1.0
  (`scatter.md`, approved on 27 September 2026); `three` 0.186.1, and
  for development `@types/three` 0.186.0 with the six packages it
  brings, which `pca3d.md` names (approved on 27 September 2026); and
  xlsx_rs by the URL of its first release (`site.md`, "xlsx_rs, from
  stage 4"; the repository and its releases decided on 28 September
  2026). A package the lockfile adds that these do not name is a stop
  for the owner, unless it is brought by a package on the list of
  `docs/technology.md`, as `internmap` was in stage 3.
- **What every prompt of a task carries**, from the reports of stages 2
  and 3: each rule of the spec the task builds is broken once on a
  scratch copy of the code and seen to fail a test, and the answer says
  how many rules it broke and how many failed a test; a component is not
  counted as covered by the flows it happens to reach, since stage 3's
  tests reviewer found 10 of 16 changes to one section passing every
  test; a task of the plots tests in the browser what jsdom cannot lay
  out; a number field is tried with a comma typed key by key, as four
  reviewers of stage 3 found; a point for the owner is written with its
  recommendation when it is found; the task ends on the branch
  `plan/individuals-pca`, not on a detached commit, which one subagent
  of stage 3 left; a flow that fails once is run 20 times in the engine
  where it failed before it is called flaky or fixed.
- **What every review of a work package carries**, from the same
  reports: the reviewers that only read run together, reading at a
  commit; `tests`, `browser` and `accessibility`, which run the page,
  each run on a copy made with `git archive` outside the worktree, with
  a preview server on a port of its own; the keyboard and the focus of a
  screen are driven in Chromium and WebKit by a `general-purpose`
  subagent; `react` and `accessibility` run again after the fixes, which
  twice brought defects of their own in stage 3.

## 1. popnei js-v0.1.0-dev.3

**What it gives:** the application runs on popnei's release that has
the PCoA, which work package 6 calls. Nothing the user sees changes but
the size of a written file, 251,074 bytes in place of 250,994 for
`panel.nei` at 0.05, since the release writes version 1.1 of popnei's
vars file.

**Deliverables:**

1. The release named. Check: `npm pkg get dependencies.popnei` prints
   the URL of `js-v0.1.0-dev.3`, where it prints that of
   `js-v0.1.0-dev.2` on 2cedc40; `package-lock.json` changes only in
   popnei's entry, in the same commit.
2. `IP1 D1 the written files of dev.3`, in node. Check: `npx vitest run
   src/worker/runner.test.ts -t "IP1 D1"` passes at least 5 tests, the
   five files of "The written file" of `runner.md`, "How it is
   verified", with the sizes of `js-v0.1.0-dev.3`: 261,570 bytes with no
   filter, 251,074 at 0.05, 3,682 with a MAF filter at 0, and the two
   of the order of stage 3 that task 1.1 writes into that spec. On
   2cedc40 these fail, since `js-v0.1.0-dev.2` writes the old sizes.
3. `IP1 D2 the written files of dev.3 on the screen`. Check: the browser
   check with `-g "IP1 D2"` gives at least 4 passed, 2 in each engine:
   the download `panel.filtered.nei` of 251,074 bytes at 0.05
   (`entry.md`, "How it is verified"), and that of the thresholds at
   0.03 and 0.38 at its size of the order of stage 3.
4. The tests before still pass. Check: `npm test` passes, and the
   browser check gives at least 618 passed; every line of an existing
   test that `git diff <the start> -- 'src/**/*.test.ts' 'e2e/**'` shows
   changed is a size of a written file, or is listed in the report with
   the part of a spec that asks for it. A change no spec names is a
   finding; one the release forces, a key of an options object that
   popnei now refuses (the open-points file, "popnei's release
   `js-v0.1.0-dev.3`"), is a stop for the owner if the runner sent one.
5. The sizes measured. Check: the report gives popnei's wasm gzipped as
   Vite counts it, beside the 710.62 KB of 2cedc40 and the 774,080
   bytes of `gzip` in the open-points file, and the first script of
   `popgen.html` beside its 191.81 KB; `docs/architecture.md`, section
   11, has the number, as it asks.

**Stands on:** the gate.

**Tasks:**

- [x] 1.1 In one commit, `package.json` and the lockfile to
  `js-v0.1.0-dev.3` (`docs/technology.md`, section 5; `.claude/skills/coding/SKILL.md`,
  "Dependencies": a newer popnei is a commit of its own that says what
  changed); before it, in a commit of its own, the two sizes of the
  order of stage 3 in `runner.md` (above, "Where the specs are thin");
  then the tests of the runner, the messages and the client that name a
  size of a written file (`runner.md`, "How it is verified", "The
  written file"; `writeVariants.md`, "How it is verified"), tagged
  `IP1 D1`. Serves 1, 2 and 4.
- [x] 1.2 The flows that read a written file, `e2e/writing.spec.ts` and
  `e2e/individualThresholds.spec.ts`, at the new sizes, tagged `IP1
  D2` (`entry.md` and `writeVariants.md`, each "How it is verified");
  the words of the step that give the size, "251 KB", where a test reads
  them; the sizes measured and written in section 11 of the
  architecture. Serves 3, 4 and 5. Needs 1.1.

**What could go wrong:** popnei's options objects now refuse a key they
do not know, where `js-v0.1.0-dev.2` ignored it; a key the runner sent
by mistake would now be a refusal of every calculation of its kind, seen
first in the runner's tests.

## 2. The individuals first

**What it gives:** the filters of individuals act before the filters of
the variants, which count over the individuals kept, as the owner
decided on 28 September 2026 (entry A of the open-points file). The
statistics of each individual are calculated once per file loaded, over
every variant, and a change of a filter of the variants no longer takes
them off; the histograms of the variants are drawn over the individuals
kept; the Variants step shows the section of the individuals before
that of the variants. On `panel.nei` the thresholds of 0.03 and 0.38
keep 116 and 111 individuals, where they kept 125 and 119.

**Deliverables:**

1. `IP2 D1 the worker in the new order`. Check: `npx vitest run
   src/worker -t "IP2 D1"` passes at least 14 tests: of `runner.md`,
   "How it is verified", the statistics of each individual with no
   filter and the fixture compared (1), the VCF of two individuals (1),
   the diversity with the lists of 116 and of 111 (2), the steps with
   the list (3), the histograms with the list of 111 (1), the counts
   with the list of 111 before the three filters (1), and the written
   files with the lists of 116 and of 111 (2); of `messages.md`, "How it
   is verified", an `individualChecks` job with a filter refused, a
   `variantChecks` and a `filterCounts` job each with `individuals`
   accepted, and the version, `protocol: 2` refused (at least 3). `grep
   -c "PROTOCOL_VERSION = 3" src/worker/messages.ts` gives 1, where it
   gives 0 on 2cedc40.
2. `IP2 D2 the analyses in the new order`. Check: `npx vitest run
   src/core -t "IP2 D2"` passes at least 14 tests: of
   `individualChecks.md`, `variantChecks.md` and `filterCounts.md`,
   "How it is verified", each key row that changed with `filtersRead`
   (the statistics' key unchanged by any filter, the histograms' changed
   by a filter of individuals and not by one of the variants, the
   counts' changed by both) and each `run` with the job of its spec (at
   least 8); of `individualsKept.md`, popnei's numbers of `panel.nei`
   with no filter, 116, 42 and 111 individuals (1); of `entry.md`,
   `countsOf` of a result of the statistics giving no counts (1); of
   `store.md`, `createStore` refusing a definition of the statistics
   that reads a filter, and a Run of the counts that waits for the
   statistics (2); of `projectFile.md`, the check numbers of the
   diversity compared under key version 2 (1), and those of the three
   checks only where their result is stage 3's (1).
3. `IP2 D3 the Variants step in the new order`. Check: the browser check
   with `-g "IP2 D3"` gives at least 12 passed, 6 in each engine, from
   the stage 3 list of `steps/variants.md`, "How it is checked", with
   its new numbers: the statistics with `s000` 0.0283 and 0.3654; the
   thresholds at 0.03 and 0.38, "Kept 116 of the 200 individuals it was
   given.", then 111 of 116, and "111 of the 200 individuals of
   panel.nei pass the filters."; the histograms of the variants removed
   by the thresholds with the notice, and calculated again, the mean of
   the MAF 0.7173; the Count, "Kept 1,117 of the 1,200 variants it was
   given."; the missing data filter of the variants moved with the
   statistics and the counts of the thresholds kept, no notice and no
   calculation; Write and Save with the thresholds at 0.03 and 0.38,
   `panel.filtered.nei` of 156,818 bytes; and the section of the
   individuals before that of the variants, in the order of the
   headings and of the Tab key; axe in each state reached.
4. The screenshots of the Variants step, light and dark, in its new
   order: before any calculation, with the statistics and the
   thresholds, and with the Count and the histograms locked by a list
   that names someone not in the file. Check: each PNG is in `screens/`
   and the orchestrator has looked at each.
5. The tests before still pass, with their changed lines listed as in
   work package 1: the numbers 125 and 119 and what depended on them,
   the fixture `panel_individual_stats.json` written again with no
   filter, the key versions raised, the order of `POPGEN_ANALYSES`.
   `grep -rnE "\b(125|119) (of|individuals)" e2e src --include='*.ts'`
   finds no test of the thresholds of the flow, where it finds several
   on 2cedc40.

**Stands on:** work package 1.

**Tasks:**

- [x] 2.1 The worker side: `protocol.ts` and `messages.ts` for the jobs
  of the three checks and `PROTOCOL_VERSION` 3 (`protocol.md` and
  `messages.md`, the parts their openings date 28 September 2026); the
  list put first in `runner.ts`, in `stepsOf`, `stepsAre` and the steps
  put on the `Variants` (`runner.md`, "The steps: the file opened again
  when they change" and "The counts of every pass"); the fixture
  `panel_individual_stats.json` written again with no filter by
  `e2e/fixtures/make_fixtures.mjs`; the runner's tests with the lists of
  116 and 111 of `orderA.mjs`, in the place of those of 125 and 119 and
  of the two sizes task 1.1 added to `runner.md`, which this task takes
  out of it. A list put after the filters of the variants gives their
  counts over the wrong individuals with no error, so the tests of the
  counts with the list are part of this task. Serves 1 and 5. Needs
  work package 1.
- [x] 2.2 The three checks and the diversity in core: `filtersRead`,
  the jobs, the key version 2 and the words of `individualChecks.ts`,
  `variantChecks.ts`, `filterCounts.ts`, and the key version 2 of
  `diversity.ts`, from entry A of the open-points file, "The code of
  stage 3 that the plan of stage 4 changes", and each spec's parts dated
  28 September 2026; the tests of their keys in a commit of their own,
  since a key that missed a filter of individuals would show the
  histograms of other individuals as current; `individualsKept.test.ts`
  at 116, 42 and 111. Serves 2 and 5. Needs 2.1.
- [x] 2.3 The store, `apps.ts` and the project file of the new order:
  `createStore` refusing a statistics that reads a filter and accepting
  counts that read the filters of individuals, the Run of the counts
  and of the histograms that waits for the statistics (`store.md`, "The
  individuals kept" and "What each filter kept"); `countsOf` with no
  counts for the statistics, and `POPGEN_ANALYSES` with the statistics
  first (`entry.md`, "`src/core/apps.ts`"); the comparison of the check
  numbers under the key versions raised (`projectFile.md`, "The
  comparisons after an opening"). Serves 2 and 5. Needs 2.2.
- [x] 2.4 The Variants step in the new order: the section of the
  individuals before that of the variants, the words of the count that
  waits, of the missing data filter and of the caption of the
  histograms, and the locks beside the Count and the histograms, from
  `steps/variants.md`, "The parts, in their order" and the parts it
  dates 28 September 2026; the flows of stage 3 at their new numbers,
  tagged `IP2 D3` where their numbers changed; the states of D4 in
  `e2e/screens.spec.ts`. Serves 3, 4 and 5. Needs 2.3.

**What could go wrong:** a flow of stage 3 that reached a control by a
count of Tab presses breaks when the sections swap; it finds the control
by its role and name instead. The words of stage 3 that said the
statistics were counted over the variants the filters keep are in
several places, the help and the shell's words among them; the `stale`
reviewer is told to look for them.

## 3. The switches of the Variants step

**What it gives:** the LD filter of the Variants step, turned on, asks
for its distance, which has no default, and locks the Count, the writing
and the diversity until one is typed; every switch of the step, the four
filters of the variants and the two thresholds of the individuals,
keeps its values while off, so that turning it on again gives back what
was typed, and the results of before come back from the cache.

**Deliverables:**

1. `IP3 D1 the filters in the project`. Check: `npx vitest run src/core
   -t "IP3 D1"` passes at least 20 tests: of `project.md`, "How it is
   verified", the worked case with `turnOffVariantFilter` and
   `turnOffIndividualFilter` (2), each row of `variantFilterNeeds` and
   `jobFilters` (at least 7), `parseProject` of a filter with `maxDist`
   `null`, of 0 and of `"1000"` (3), of a project with neither list of
   filters off, of a filter both on and off, and of a list to keep in
   `individualFiltersOff` (3), and the properties with filters off and
   an LD filter with no distance (1); of `keys.md`, a filter turned off
   in no key (1); of `store.md`, "An LD filter with no distance" and "A
   filter turned off and on again" (2), and the property that no
   request carries an LD filter with no distance or a filter turned off
   (1).
2. `IP3 D2 the project file of the switches`. Check: `npx vitest run
   src/core/projectFile.test.ts -t "IP3 D2"` passes at least 3 tests:
   `v1-ld-no-distance.popnei.json` and `v1-filters-off.popnei.json`
   opened into their literal projects and written back byte for byte,
   and the four fixtures of before written back with `"filtersOff": []`
   and `"individualFiltersOff": []` added (`projectFile.md`, "How it is
   verified").
3. `IP3 D3 the switches on the screen`. Check: the browser check with
   `-g "IP3 D3"` gives at least 12 passed, 6 in each engine, from the
   bullet "from stage 4" of `steps/variants.md`, "How it is checked":
   the LD filter turned on with an empty distance and its reason, beside
   the field, announced and read as its description, and beside the
   disabled Count and Write, with the histograms and the statistics
   still calculated; an arrow key, Home, End and Tab in the empty field
   sending nothing; 0 typed and its line; 50000 typed, the reason gone
   and a count beside the LD filter; an Undo giving back the empty field
   and the lock, a Redo 50000; the filter off and on again with 50000
   and the count back with no calculation; in a new project, on, off
   and on before a distance, the field empty and the lock back; the
   threshold of observed heterozygosity at 0.38 off and on at 0.38; axe
   in each state reached. The stepper shows the Variants step at
   Problem with the reason of `variantFilterNeeds` (`shell.md`, "How it
   is checked", `stepStates`, in node, at least 1 test more, and the
   summary line with an LD filter with no distance, 1 more).
4. `LD_DIST_TURNED_ON` gone. Check: `grep -rn LD_DIST_TURNED_ON src`
   prints nothing, where it prints `src/ui/steps/variants/commands.ts`
   on 2cedc40; `npx vitest run src/ui/steps/variants -t "IP3 D4"` passes
   the 2 tests of `turnedOnFilter(p, "ld")`, with no filter kept and
   with one in `filtersOff`.
5. The screenshots, light and dark: the LD filter on with no distance,
   with its locks, and with its count; a filter turned off with its
   values kept. Check: each PNG is in `screens/`, and the orchestrator
   has looked at each.
6. The owner accepts the Variants step of work packages 2 and 3 (task
   3.4).

**Stands on:** work package 2.

**Tasks:**

- [x] 3.1 The LD filter with no distance in core:
  `ProjectVariantFilter`, `variantFilterNeeds` and `jobFilters` in
  `project.ts` (`project.md`, "What an analysis needs of every project"
  and "The validation"), the locks of the store and every job's filters
  through `jobFilters` (`store.md`, the parts its opening dates 28
  September 2026 for point 16), the project file with `"maxDist": null`
  and its fixture (`projectFile.md`). A job that carried a filter with
  no distance would be refused by popnei only as a defect, and a lock
  that missed an analysis would run it unpruned with no word, so this is
  a task of its own, guarded by the store's property. Serves 1 and 2.
- [x] 3.2 The filters turned off: `filtersOff` and
  `individualFiltersOff`, `turnOffVariantFilter` and
  `turnOffIndividualFilter` in the place of the commands that removed a
  filter turned off (`project.md`, "The filters turned off"), their
  validation, the project file and its fixture, and the property of
  `project.md` with the four lists. Serves 1 and 2. Needs 3.1.
- [x] 3.3 The switches on the screen: the field of the distance with no
  default, its reason and the locks shown, `turnedOnFilter` reading
  `filtersOff`, `LD_DIST_TURNED_ON` removed with its test, every switch
  turned off by the new commands (`steps/variants.md`, "The filters of
  the variants", with its paragraph "The distance of the LD pruning"); the stepper and
  the summary line (`shell.md`, "The stepper" and "The summary line");
  the flows of D3 and the states of D5 in `e2e/screens.spec.ts`. Serves
  3, 4 and 5. Needs 3.2.
- [ ] 3.4 Stop A: the owner tries the Variants step of work packages 2
  and 3, in Firefox by hand as well, and judges the choices of the
  open-points file that this step shows: the section of the individuals
  first, the words of the LD filter with no distance, and every switch
  keeping its values. Two rounds expected; each a task with its commit
  and its screenshots taken again.

**What could go wrong:** the number field of the distance is the first
that may stay empty; React Aria's field turns an empty field into `NaN`
or keeps the last number, and `steps/variants.md` asks that an arrow key
in it sends nothing. The work packages 4 and 6 do not stand on the stop,
and start once 3.3 is committed.

## 4. The project of stage 4, in core

**What it gives:** in the words of work packages 5, 6 and 8: a project
with no metadata file runs on one population, "All individuals", and so
does a project whose user chose it; the populations every analysis reads
are made in `project.ts`; a type the user sets on a column is kept by
its name, waits while a read cannot apply it and comes back when one
can, and can be forgotten; the types a column allows are worked out from
the table; a project opened from a file saved while its metadata file
was not read asks for it again; and the project file writes all of it
in its version 1.

**Deliverables:**

1. `IP4 D1 the populations`. Check: `npx vitest run src/core -t "IP4
   D1"` passes at least 16 tests: of `project.md`, "How it is
   verified", "The populations" with no file, with `onePopulation`,
   with no column, the column of an xlsx, and `populationsBeforeRun`
   (at least 8), `populationsNeeds` with `inStep` for its three kinds
   (3), and `individualsNeeds` with no file in each application (2); of
   `diversity.md`, "The one population" (at least 2); of `store.md`, "A
   result given back by a read" (1). `grep -n "export function
   populationsToRun" src/core/analyses/diversity.ts` prints nothing,
   where it prints the function on 2cedc40.
2. `IP4 D2 the types of the columns`. Check: `npx vitest run src/core
   src/worker/individuals -t "IP4 D2"` passes at least 22 tests: of
   `project.md`, "`columnAllows`" (at least 7), "The types" (at least
   12), and "`parseProject` of a read with a type set not applied" (2);
   of `individuals.md`, the reader's parts of stage 4 that core calls,
   the warning of one number written in one way set continuous (1).
   `npm run lint` passes with core importing
   `src/worker/individuals/columnTypes.ts`, and fails with a core file
   importing `src/worker/individuals/csv.ts` (tried once on a scratch
   copy, and the report says so).
3. `IP4 D3 a metadata file not given`. Check: `npx vitest run src/core
   -t "IP4 D3"` passes at least 6 tests: of `project.md`, "A source
   `notGiven`" (at least 5), and the words after a worker that could
   not start, Open 4 (1).
4. `IP4 D4 the project file of stage 4`. Check: `npx vitest run
   src/core/projectFile.test.ts -t "IP4 D4"` passes at least 4 tests:
   `v1-types.popnei.json` and the fixture of `pops.csv` `notGiven`,
   each opened into its literal project and written back byte for byte
   (2), `v1-nei-diversity.popnei.json` written back with `typesSet`
   added (1), and the diversity of a project with no metadata file with
   the check numbers of one population (1); and the property of
   `project.md` drawing the fields of stage 4 passes.
5. The tests before still pass, with their changed lines listed as in
   work package 1, the tests of the populations moved from
   `diversity.test.ts` among them. The browser check passes: from task
   4.1 a project with no metadata file runs the diversity, which the
   Individuals step of stage 2 does not yet show; the flows of stage 2
   that expected the lock with no file change with the part of
   `individuals.md` that asks it.

**Stands on:** work package 3. Work packages 6 and 7 run beside it.

**Tasks:**

- [x] 4.1 The populations: `Grouping` with `onePopulation`, "All
  individuals", and `populationsOf`, `populationsToRun`,
  `populationsKept`, `populationsNeeds` and `populationsBeforeRun` moved
  into `project.ts` from `diversity.ts` (`project.md`, "The
  populations"); `individualsNeeds` with no reason for no file
  (`project.md`, "What an analysis needs of every project"); the
  diversity on one population, its request, words and script
  (`diversity.md`, the parts its opening dates 27 and 28 September
  2026); a result given back by a read leaving the notice (`store.md`,
  "The notice, and the calculations it stops"). Serves 1 and 5.
- [x] 4.2 The types of the columns: `typesSet`, `typesLost`,
  `typeLostReason`, `columnAllows`, `setColumnType` and
  `forgetTypesLost`, and the record that applies the types
  (`project.md`, "The types of the columns", "The commands" and "The
  records"); the binary type's two values as texts (`protocol.md`,
  `ColumnType`, and its check in `messages.md`); the reader's parts of
  stage 4 that do not read an xlsx (`individuals.md`, "The types of the
  columns" and "The refusals and their words", the parts its opening
  dates 27 September 2026); the lint that lets core import
  `columnTypes.ts` alone (`.claude/skills/coding/configs.md`). A type
  applied to a column whose values do not allow it would colour the PCA
  or group the diversity wrongly with no word, so this is a task of its
  own. Serves 2 and 5. Needs 4.1. Shares `protocol.ts` and
  `messages.ts` with task 6.1: the two do not run at the same time.
- [x] 4.3 The metadata file not given: the read `notGiven` of an opened
  project, `individualsNeeds` and `individualsStepNeeds` with its words,
  and the words after a worker that could not start (`project.md`, "The
  project of an opened project file" and Open 4). Serves 3 and 5. Needs
  4.2.
- [x] 4.4 The project file of stage 4: `onePopulation`, `typesSet` and
  `notGiven` written and read in version 1, the fixtures of
  `projectFile.md`, "How it is verified", written by hand from the
  spec; `wholeProject` of `src/core/testSupport.ts` drawing the fields of
  stage 4 for the properties. Serves 4 and 5. Needs 4.3.

**What could go wrong:** `columnAllows` runs on the page over every cell
of the table; its time on 10,000 rows is measured in task 5.3, and a
table that large may move the work into the light worker (`project.md`,
"How it runs"), which changes `recordIndividualsRead` and not the
project file. Moving the populations out of `diversity.ts` changes the
imports of the shell's words and of the Individuals step of stage 2,
which task 4.1 changes with them.

## 5. The Individuals step

**What it gives:** the user picks a metadata file or goes on without
one, sets the type of each column and the value coded 1 of a binary
column, chooses a column of the populations or "All individuals in one
population", sees the types set that a read did not apply and forgets
them, copies the names of the individuals missing from the file, and
reads in the stepper that the step is optional.

**Deliverables:**

1. `IP5 D1 the words of the shell of stage 4`. Check: `npx vitest run
   src/ui/shell -t "IP5 D1"` passes at least 14 tests, from
   `shell.md`, "How it is checked": `stepStates` of Individuals Optional
   with no file whatever the grouping, To do with a file read and no
   column, To do with a file `notGiven`, and Done with `onePopulation`
   (4); `summaryLine` of the first project, a file with no column, with
   `onePopulation`, and `notGiven` (4); and `announcementsOf` of the end
   of a read with each of its four sentences, all four in their order,
   and none (at least 6).
2. `IP5 D2 the Individuals step on the screen`. Check: the browser check
   with `-g "IP5 D2"` gives at least 24 passed, 12 in each engine, from
   the section "How it is checked" that task 5.1 writes into
   `steps/individuals.md`: each state of its table "The states" reached,
   the ready state with no file among them, with its words; a type set
   and the value coded 1 of a binary column chosen, each one step of
   Undo with no notice; "All individuals in one population" chosen, with
   its notice when it removes a result; a file read again with another
   separator, the types that wait named with "Forget these types", the
   separator set back and every type applied again, then forgotten, the
   focus on the first select of a type; the names missing copied by
   "Copy the 12 names" and announced; Remove, with the focus on the file
   button; the order of the Tab key of "Accessibility"; the table of the
   columns at 320 px wide with no sideways scroll; and axe in each state.
3. `IP5 D3 the diversity on one population, on the screen`. Check: the
   same, `-g "IP5 D3"`, 2 passed, 1 in each engine: `panel.nei` with no
   metadata file, the missing data filter at 0.1, Run, and the row "All
   individuals" with 200, 0.3755, 0.3543 and 0.9792 (`diversity.md`,
   "How it is verified").
4. `IP5 D4 the time of columnAllows`, the measurement of `project.md`,
   "How it runs": the time the page is frozen when a metadata file of
   10,000 rows and 50 columns is read and when a project that holds it
   is opened. Check: `npx playwright test --project=measure-chromium
   --project=measure-webkit -g "IP5 D4" --workers=1` passes, and the
   report holds its table with the engine, its version and the machine.
   Above 100 ms in an engine, `columnAllows` is worked out in the light
   worker with the read, as that part of `project.md` says, and measured
   again. Firefox: the orchestrator gives the owner the steps at stop B,
   or the report says it was not measured.
5. The screenshots, light and dark, of each state of `steps/individuals.md`,
   "The states", with the types that wait and the check with individuals
   missing, and at 320 px. Check: each PNG is in `screens/`, and the
   orchestrator has looked at each.
6. The owner accepts the Individuals step (task 5.4).

**Stands on:** work package 4.

**Tasks:**

- [x] 5.1 First, in a commit of its own, the section "How it is checked"
  of `steps/individuals.md` (above, "Where the specs are thin"). Then
  the shell of stage 4: the stepper's Optional, the summary line with
  one population and a file not loaded, and the announcements of the end
  of a read (`shell.md`, "The stepper", "The summary line" and "The
  status region"); the Individuals step with no file and its choice of
  "All individuals in one population", and the flow of D3
  (`steps/individuals.md`, "The file" and "The populations"). Serves 1,
  3 and 5. Added on 28 September 2026, since no task named them (found
  by task 4.1): the panel's lines of the diversity when it is ready on
  one population, "1 population, All individuals: 200 individuals" and
  "No metadata file: every individual is in one population."
  (`diversity.md`).
- [x] 5.2 The columns: the table of HTML with a select of the type in
  every row but the first, the select of the value coded 1, the warning
  of the types that wait with "Forget these types", the check with
  "Copy the 12 names", the order of the Tab key, and the table at 320 px
  (`steps/individuals.md`, "The columns", "Every individual of the
  variants file in it", "What it sends and reads", "Its words" and
  "Accessibility"); the flows of D2 and the states of D5 in
  `e2e/screens.spec.ts`. Serves 2 and 5. Needs 5.1.
- [ ] 5.3 The measurement of D4, with the table of 10,000 rows and 50
  columns written into `MEASURE_DIR` by the test; if it asks, the work
  in the light worker, `project.md` first. Serves 4. Needs 5.2.
- [ ] 5.4 Stop B: the owner tries the Individuals step in Firefox by
  hand as well, and judges the choices of the spec that it shows (its
  "Open points"): a project with a file locked until a column or the one
  population is chosen, the words of the types that wait and their
  button, the populations and the check not shown while the file has no
  table, a select of the type in every row, and the name "All
  individuals"; and, if they wish, the section "How it is checked" of
  task 5.1. Two rounds expected.

**What could go wrong:** 20 columns with 5 binary make 24 stops of the
Tab key in the table; the spec takes that. The select of React Aria in
a row of a table of HTML is a combination the application has not had;
the keyboard reviewer drives it in both engines.

## 6. The PCA and the PCoA, in the worker and core

**What it gives:** in the words of work package 8, the calculation
worker answers a PCA or a PCoA with popnei's numbers, cut to the first
10 components, and is started again after one of more than 700
individuals; the analysis knows its options, its own filters that follow
the Variants step, its key, when it cannot run, its warnings, its check
numbers and its words; and the time of the pruning and of a PCA in the
browsers is measured.

**Deliverables:**

1. `IP6 D1 the messages of the PCA`. Check: `npx vitest run
   src/worker/messages.test.ts -t "IP6 D1"` passes at least 11 tests,
   from `messages.md`, "How it is verified": a `run` of the PCA with the
   method `"pca"` and `"pcoa"`, with `individuals` `null` and a list,
   and its `result` (at least 3); and the refusals of the PCA, `"tsne"`,
   `numCompsKept` 1.5, `projections` a list, 1,999 numbers, 9
   percentages, `numVarsUsed` `null` of a PCA and `lingoesConstant`
   `null` of a PCoA (7); the property drawing them (1).
2. `IP6 D2 the runner's PCA`. Check: `npx vitest run
   src/worker/runner.test.ts -t "IP6 D2"` passes at least 10 tests,
   from `runner.md`, "How it is verified": the PCA with its own LD
   filter, the PCA with the filters of a new project, `numCompsKept` 3,
   two individuals, the three refusals, the PCoA with its numbers and a
   second run to the last bit, its three refusals, and the steps of a
   PCA; and `transferablesOf` of the PCA's result.
3. `IP6 D3 the restart after a large PCA`. Check: `npx vitest run
   src/worker/client.test.ts -t "IP6 D3"` passes at least 5 tests, from
   `client.md`, "How it is verified", "The restart after a large PCA":
   701 individuals of a list, 700, `null` over a load of 701, a
   `refused`, and a `reopenFailed`.
4. `IP6 D4 the PCA in core`. Check: `npx vitest run
   src/core/analyses/pca.test.ts src/core -t "IP6 D4"` passes at least
   40 tests, from `pca.md`, "How it is verified": `pcaFilters` (at
   least 14), `run` (2), `needs` (at least 10), `keptNeeds` (at least
   4), `parseOptions` (at least 8 accepted and refused), `warnings` (at
   least 4), `checkNumbers` (2), `refusalText` (at least 8), `crashText`
   (at least 3), and `script` (1); and of `entry.md`, `countsOf` of the
   two results of the PCA (2). Two of the cases of `needs`, a project
   with no metadata file and one with a file and no column, need task
   4.1.
5. `IP6 D5 the key of the PCA`. Check: `npx vitest run
   src/core/analyses/pca.test.ts -t "IP6 D5"` passes a test for each row
   of the table of `pca.md`, "What goes into its key", and each case of
   the second bullet "The key" of "How it is verified", at least 12; one
   row is shown to fail on a scratch `keyInputs` that leaves out the
   PCA's own LD filter, and the report says so.
6. `IP6 D6 the times of the PCA`, the measurements of the open-points
   file, "Set by a measurement": the time of the pruning inside a PCA
   on `panel.nei` and on the files of 20,000 variants, with and without
   the LD filter; and the time and the memory of the tab for a PCA and
   a PCoA at 1,000, 2,000, 4,000 and 9,381 individuals. Check: `npx
   playwright test --project=measure-chromium --project=measure-webkit
   -g "IP6 D6" --workers=1` passes, and the report holds a table of
   each with the engine, its version and the machine. From them:
   `PCA_RESTART_INDIVIDUALS` kept at 700 or set anew, `pca.md`,
   `client.md` and section 11 of the architecture changed first; and,
   if the pruning takes a large share of a PCA, the question to the
   owner of point 1 of the open-points file, whether popnei is asked to
   keep the pruned variants. Firefox: the orchestrator gives the owner
   the steps at stop C, or the report says it was not measured.

**Stands on:** work package 3; task 4.1 for two cases of D4.

**Tasks:**

- [x] 6.1 The job and the result of the principal components in
  `protocol.ts` and their checks in `messages.ts` (`protocol.md` and
  `messages.md`, their parts of the PCA); `runner.ts`, "The principal
  components" of `runner.md`, the calls of popnei with only its keys, the
  cut to `numCompsKept` and the refusals; `transferablesOf`. Serves 1
  and 2. Shares `protocol.ts` and `messages.ts` with task 4.2: the two
  do not run at the same time.
- [x] 6.2 The client's restart after a large PCA, `PCA_RESTART_INDIVIDUALS`
  (`client.md`, "A large PCA, and the restart after it", and its rows of
  "Crashes, defects, and every read answered"). Serves 3. Needs 6.1.
- [x] 6.3 `src/core/analyses/pca.ts` but its key: "What it does", "Which
  variants it reads", "Its options", "Why it cannot run", "The
  request", "The warnings", "The check numbers", "Its lines of the
  Python script", "The TypeScript interface" and "Its words" of
  `pca.md`; the PCoA's `keptNeeds` in the store (`store.md`, the parts
  its opening dates 28 September 2026 for the PCoA); `countsOf` of a
  result of the PCA in `apps.ts` (`entry.md`). The PCA is not in
  `POPGEN_ANALYSES` until task 8.3. Serves 4. Needs 6.1; 4.1 for the two
  cases of `needs`. Added on 28 September 2026 (found by task 4.1): `ldOrderText`
  of `src/core/analyses/words.ts` with the PCA's LD filter (`diversity.md`,
  "Its words"; `pca.md`, its row of the refusals).
- [x] 6.4 The key of the PCA, `keyInputs`, and its tests, in a commit of
  its own (`pca.md`, "What goes into its key"): a key that missed the
  PCA's own filters, or put the colour or the view into it, would show a
  PCA of other variants as current, or calculate again for a change of
  colour. Serves 5. Needs 6.3. Added on 28 September 2026 (found by task
  6.3): the diversity's words of any other refusal without popnei's
  backquotes, as `diversity.md`, "Its words", asks and no task built
  (`withoutBackquotes` of `words.ts`).
- [ ] 6.5 The measurements of D6 (above, "Where the specs are thin", for
  how the PCA runs in the browser before its panel); `e2e/bigVcf.ts`
  given the individuals it needs (`pca.md`, "How it runs"; the
  open-points file, "Set by a measurement"); the constants set from
  them, `pca.md` "How it runs" and Open 1, `client.md` "A large PCA, and
  the restart after it" and section 11 of the architecture changed
  first. Serves 6. Needs 6.2 and 6.4, and runs alone in the tree.

Task 6.2 can run beside 6.3, since they touch different files.

**What could go wrong:** a PCA of 9,381 individuals took about four
minutes in node by the cube of `pca.md` and 4.3 GB, near the 4 GB wasm
addresses; in WebKit, which closed the tab for a write of about 2.2 GB
in stage 3, the largest may close the tab and not refuse. The
measurement records what each engine does and does not fail for it. The
bar of the PCA stands still during the decomposition, which popnei
reports nothing of.

## 7. The 2D scatter

**What it gives:** in the words of work package 8, the individuals drawn
on two components, each a mark whose colour and shape say its group,
or coloured by the values of a column; a tooltip of the point under the
pointer; the legend's pieces, shared with the 3D view; and an export to
SVG and PNG with the legend in it, which no screen offers before stage
6.

**Deliverables:**

1. The dependencies. Check: `npm ls d3-shape d3-path d3-scale-chromatic`
   prints the three at the versions of "Before the first task", and
   `package.json` names the six packages with exact versions; on 2cedc40
   it prints "(empty)". The report lists the packages the lockfile added.
2. `IP7 D1 the pieces of the scatter`. Check: `npx vitest run src/charts
   -t "IP7 D1"` passes at least 20 tests in the project `charts`, from
   `scatter.md`, "How it is verified", "The pure functions": `groupMark`
   (4), `scatterScales` (3), `legendOf` (3), `viridisStep` and
   `viridisColour` (4), `nearestPoint` (5), `tooltipLines` (4), each
   defect, 50,000 points taken and 50,001 refused, and the path of one
   group.
3. `IP7 D2 the scatter under jsdom`. Check: the same, `-t "IP7 D2"`, at
   least 7 tests, from "The SVG, under jsdom" of `scatter.md`; and the
   revision of `plot2d.md`, its cases of the overlay, of `pointer` and of
   `drawExport` (`plot2d.md`, "How it is verified", the parts dated 27
   September 2026), at least 3 more.
4. `IP7 D3 the scatter in the browser`. Check: the browser check with
   `-g "IP7 D3"` gives at least 10 passed, 5 in each engine, on
   `e2e/plots.html` with 9,381 points in 5 groups: the tooltip and
   `onHover` at point 0 and away from it, and a name of HTML shown as
   text (1); the pointer onto the tooltip in 10 steps and off it, and
   Escape with the focus in a text field (1); a tap with touch (1);
   `toSVG` with no overlay, no hover, no `var(`, the legend and round
   joins, and its PNG at 3 times with the colour of the first group at
   the centre of its mark (1); the times (1).
5. The times of the scatter, written into `scatter.md` with their
   engines: from `createScatter` to the next frame for 9,381 points, and
   an `update` of the highlight, five times each, in Chromium and
   WebKit. Check: the lines are in the spec, and the report holds the
   table; above 100 ms in WebKit, the report says so for the owner at
   stop C.

**Stands on:** work package 3. It runs beside work packages 4 to 6.

**Tasks:**

- [x] 7.1 The dependencies, in a commit of their own; `marks.ts`,
  `legend.ts` and `hover.ts` in `src/charts`, the classes of
  `charts.css`, from `scatter.md`, "The marks of the groups", "The
  colours", "The legend, drawn by the screen", "The point under the
  pointer" and "The TypeScript interface". Serves 1 and 2.
- [x] 7.2 The revision of `plot2d.ts` and `export.ts` (`plot2d.md`, its
  parts dated 27 September 2026) and `scatter.ts` with `createScatter`
  (`scatter.md`, "What it does", "The SVG it builds", "The numbers
  without the picture", "The export" and "The size"). Serves 3. Needs
  7.1.
- [ ] 7.3 The scatter on `e2e/plots.html` and its flows in
  `e2e/plots.spec.ts`, from `scatter.md`, "How it is verified", "In
  Playwright"; the times of D5, written into `scatter.md`, "How it is
  verified".
  Serves 4 and 5. Needs 7.2.

**What could go wrong:** jsdom has no layout, so the position of the
pointer is seen only in the browser; the tests reviewer of stage 3 found
19 of 88 changes to the plots passing every test, most in what jsdom
cannot see. The export writes `stroke-linejoin` since this revision; a
PNG made before it drew the joins mitred.

## 8. The PCA panel and the 3D view

**What it gives:** the user runs the PCA or the PCoA in the Analyses
step, with its own filters of missing data, MAF and LD that follow the
Variants step until the user sets them, and sees the individuals in 3D,
turned by dragging or with buttons, or in 2D where the browser cannot
draw 3D; colours them by a column; highlights a population from the
legend; reads the explained variance and the table of the individuals,
and saves it as a CSV.

**Deliverables:**

1. WebGL in the headless engines. Check: the report, `testing.md`,
   "Against the built site", and `pca3d.md`, "How it is verified", say
   for Chromium and WebKit on the owner's Mac whether WebGL 2 is given,
   and `ALIASED_POINT_SIZE_RANGE` where it is (`pca3d.md`, "How it
   runs"); Firefox is written as not launched here; GitHub's runners as
   not seen until the first push of `main` after the merge. On 2cedc40
   neither document says it.
2. The dependencies. Check: `npm ls three @types/three` prints `three`
   0.186.1 and `@types/three` 0.186.0, and `package.json` names them
   with exact versions; on 2cedc40 `npm ls three` prints "(empty)". The
   report lists the packages the lockfile added.
3. `IP8 D1 the 3D plot in node`. Check: `npx vitest run src/charts -t
   "IP8 D1"` passes at least 14 tests, from `pca3d.md`, "How it is
   verified", "In the project `charts` of Vitest": `projectToScreen` (2),
   `scenePositions` (1), the views (4), the turns (3), the zoom (2),
   `exportRuns` (2), each defect, and `noWebGl` under jsdom (1).
4. `IP8 D2 the 3D plot in the browser`. Check: the browser check with
   `-g "IP8 D2"` gives the tests of "In Playwright" of `pca3d.md`, at
   least 9 in each engine that gives WebGL: the plot drawn, the drag and
   the turns, the tooltip, the context lost and restored, the theme, the
   export, `destroy`, and the wheel with and without Ctrl. In an engine
   that gives none, those tests are reported as not run for that reason,
   and the test of the words of a browser without WebGL runs there
   instead.
5. `IP8 D3 the panel's functions`. Check: `npx vitest run src/core
   src/ui -t "IP8 D3"` passes at least 20 tests, from `pca.md`, "How it
   is verified": `pcaColours` (at least 10), `colourColumns` (1),
   `axesShown` (2), `pcaCsv` and `varianceCsv` (2), `pcaDescription`
   (2), `manyMissingNote` (2); and of `entry.md`, the analyses of
   `apps.ts` with the PCA before the diversity (1).
6. `IP8 D4 the PCA on the screen`, the flow of `pca.md`, "How it is
   verified". Check: the browser check with `-g "IP8 D4"` gives at least
   8 passed, 4 in each engine: the PCA of a new project, 3D first or 2D
   with the words of no WebGL, the warning of no LD filter, and "PC1
   (7.61%)" and "PC2 (5.56%)" in 2D; the LD filter set for the PCA, its
   reason beside the distance and beside the disabled Run, 50000 typed,
   "PC1 (3.55%)", "PC2 (3.40%)", no warning, and `s000` at −0.7139,
   7.6765 in the table; p1 highlighted from the legend with the keyboard,
   its `radio` checked and the description naming it; the colour by
   `altitude` with its scale and "Coloured by altitude, from 100 to
   2060; 3 individuals have no value.", and back, with no calculation
   and one step of Undo each; the LD filter back to the Variants step,
   7.61% at once with no notice, and set for the PCA again, 50000 and
   3.55% with no calculation; 3D, the turns, and 2D; the CSV of the
   table, its header and the row of `s000`; the PCoA with the PCA's own
   LD filter, "PC1 (3.68%)", "PC2 (3.54%)", the warning of the
   correction with "7.87%", "0.047", "53%" and "0.22", and "198
   components"; axe in each state reached.
7. `IP8 D5 three.js in a file of its own`. Check: the same, `-g "IP8
   D5"`, at least 4 passed, 2 in each engine, from `pca3d.md`, "The file
   of its own": no file of `pca3d` requested before the first result is
   drawn and one after; a download held back until 2D is pressed leaving
   no canvas; and `grep -c WebGLRenderer` of the first script of
   `popgen.html` in `dist/` gives 0. The report gives the size of the
   file of three.js in `dist/`, gzipped, beside the 134,245 bytes of
   `pca3d.md`.
8. `IP8 D6 the key of the PCA on the screen`. Check: the browser check
   with `-g "IP8 D6"` gives at least 4 passed, 2 in each engine: a
   change of the colour, of the axes and of the view removes no result
   and sends no request to the calculation worker, and a change of a
   filter of the PCA removes it with its notice, the requests counted
   by the test.
9. The screenshots, light and dark: the panel ready with its options,
   running with its words for the decomposition, the 3D view with a
   group highlighted where the engine of the screens gives WebGL, the 2D
   plot, the words of no WebGL and of three.js not loaded, the colour by
   values, the table, the PCoA with its warning, and the panel at 320
   px. Check: each PNG is in `screens/`, and the orchestrator has looked
   at each.
10. The owner accepts the PCA panel and the 3D view (task 8.6).

**Stands on:** work packages 4, 6 and 7.

**Tasks:**

- [x] 8.1 Which headless engines give WebGL 2 here, and the point size
  of their graphics card, from a page of the tests with no three.js;
  written into `testing.md` and `pca3d.md` (`pca3d.md`, "How it is
  verified", "What the headless engines give for WebGL is not known",
  and "How it runs"). Serves 1. This is the first task of the work
  package: if no engine gives WebGL here, tasks 8.2 to 8.5 go on, the
  tests of D2 and the 3D screenshots are reported as not run in each
  such engine, the flow of D4 takes its 2D branch there, and the owner
  sees the 3D view in their own browser at stop C.
- [ ] 8.2 The dependencies, in a commit of their own;
  `src/charts/pca3d.ts`, `project.ts` and `pca3dError.ts`, from
  `pca3d.md` whole but "The export" of the panel, with the listener of
  the wheel with Ctrl; the 3D plot on `e2e/plots.html` and its flows.
  Serves 2, 3 and 4. Needs 8.1.
- [ ] 8.3 The panel's functions of `pca.md`: "The colours", "The note of
  the missing genotypes", `colourColumns`, `axesShown`, `pcaRows`,
  `pcaCsv`, `varianceCsv` and `pcaDescription`; the PCA in
  `POPGEN_ANALYSES` before the diversity, its title "Principal
  components" in `titles.ts` and its entry in `panels.ts` (`entry.md`,
  "`src/core/apps.ts`"; `shell.md`); the fixture
  `e2e/fixtures/panel_meta.csv`, written by `make_fixtures.mjs` as
  `pca.md` gives it. Serves 5. Can run beside 8.2.
- [ ] 8.4 The panel of `pca.md`, "The panel": the options with the
  three filters of the PCA, the bar, the 3D view loaded with `import()`
  and its words while loading, when it fails and with no WebGL, the 2D
  scatter, the legend with React Aria's `ToggleButtonGroup`, the
  explained variance, the table and its CSV, the notes, "Its words" and
  "Accessibility"; the states of D9 in `e2e/screens.spec.ts`. Serves 9.
  Needs 8.2 and 8.3.
- [ ] 8.5 The flows of D4, D5 and D8 in `e2e/pca.spec.ts`, from
  `pca.md`, "How it is verified", the Playwright flow, and `pca3d.md`,
  "How it is verified", "The file of its own". Serves 6, 7
  and 8. Needs 8.4.
- [ ] 8.6 Stop C: the owner tries the PCA panel in their browsers,
  Firefox and Safari by hand, and on a Mac the zoom by the wheel with
  Ctrl held and a pinch of the trackpad in Safari (point 10 of the
  open-points file); judges the legend over the plot (point 14) and the
  choices of `pca.md`, `scatter.md` and `pca3d.md` in the open-points
  file; and gives the steps of the measurements in Firefox of tasks 5.3
  and 6.5 if they wish. Two rounds expected. A change of the zoom key
  or of the place of the legend is a round (above, "What is still the
  owner's").

**What could go wrong:** headless engines may give no WebGL, or draw it
by the processor with a point size below the 36 pixels the marks need
at a pixel ratio of 2 (`pca3d.md`, "How it runs"), so a screenshot of
the 3D view may be possible in one engine only. A browser may keep a
failed `import()` as failed for the life of the page; the flow of "Try
again" records what each engine does, and the report says so. The panel
has more controls than any screen before it: the `react` and `ux`
reviewers are told to look at the options while it runs, which
`pca.md` lets the user change.

## 9. The metadata file read from an xlsx

**What it gives:** the user loads the metadata file as an `.xlsx`, and
the Individuals step reads its first sheet, with the same types, checks
and populations as a CSV; the reader of xlsx is downloaded the first
time one is read, and a failed download is told with what to do.

**Deliverables:**

1. xlsx_rs named. Check: `npm pkg get dependencies.xlsx_rs` prints a URL
   of `https://github.com/JoseBlanca/xlsx_rs/releases/download/`, where
   it prints nothing on 2cedc40 (`site.md`, check 5 of "How it is
   verified").
2. `IP9 D1 the xlsx in node`. Check: `npx vitest run src/worker -t "IP9
   D1"` passes at least 12 tests, from `individuals.md`, "How it is
   verified": `readXlsxCells` with the function of the test, each
   refusal, a code it does not know and cells of the wrong length as
   defects; `readSheet` of the xlsx rows of its table, `#N/A` and the
   six other errors of Excel read as missing; `readIndividualsFile`
   with an xlsx; and of `messages.md`, "The xlsx" (4).
3. `IP9 D2 the xlsx on the screen`. Check: the browser check with `-g
   "IP9 D2"` gives the flow of `individuals.md`, "How it is verified",
   "With Playwright, from stage 4", at least 5 in each engine:
   `excel_en.xlsx` read, the line of the first sheet, and one download
   of the files wasm for two xlsx and none for a CSV; the `.wasm` and
   then the JavaScript answered with an error, the words of
   `xlsxReaderNotLoaded`, and what a second try does, recorded for each
   engine; `encrypted.xlsx` and its words; `individuals_10000.xlsx`.
4. The size of the files wasm in the built site, gzipped, beside the
   0.30 MB of `files.md`, "Its size". Check: the report gives it.

**Stands on:** work package 8, and xlsx_rs's first release, with the
three xlsx files the flow copies from its `tests/data/`. If the release
is not there when work package 8 ends, the orchestrator runs work
package 10 without this one, ticks nothing here, and tells the owner
that the plan is done but for the xlsx, which waits for the release; a
later session runs work package 9 on the same branch, or on a new one if
the branch was merged meanwhile.

**Tasks:**

- [ ] 9.1 xlsx_rs in `package.json`, in a commit of its own
  (`site.md`, "xlsx_rs, from stage 4"); `src/worker/xlsxCells.ts` and
  the package loaded on first need in `filesRunner.ts`
  (`individuals.md`, "The package of xlsx_rs, loaded on first need");
  `readSheet`, the refusals of an xlsx and every error of Excel as
  missing (`individuals.md`, "The xlsx" and "The refusals and their
  words"); the messages of an xlsx (`messages.md`); `wantedReads` with
  `csv` `null` (`entry.md`, "Who asks for a read"). Serves 1 and 2. Added on 28 September 2026 (found by task 4.2):
  the words of a file that is not text (`notText` of `individuals.md`), which
  tell the user to name the file `.xlsx` and so wait for the xlsx.
- [ ] 9.2 The Individuals step accepts an `.xlsx`, with the fixed line
  of the first sheet (`steps/individuals.md`, "The file" and "How the
  file was read"); the three xlsx files copied into `e2e/fixtures/`; the
  flows of D3 and the state of an xlsx read in `e2e/screens.spec.ts`;
  the size of D4. Serves 3 and 4. Needs 9.1.

**What could go wrong:** the first release of xlsx_rs is made by hand,
and nothing checks that it was built from its tag; a field of `XlsxRead`
it declares otherwise than `XlsxReadFields` fails the type check of
`filesRunner.ts`, which is the check that holds the two together
(`individuals.md`). A fix of how a cell is read is xlsx_rs's, never a
workaround in the light worker.

## 10. The end of the stage

**What it gives:** the application checked whole, and every case of the
specs of stage 4 matched to a test.

**Deliverables:**

1. The whole. Check: on the last commit `npm run format:check`,
   `typecheck`, `lint` and `build` exit 0; `npm test` passes with no
   test skipped; the browser check passes, the probe's 40 among them;
   `npm run screens` passes; `npm pkg get dependencies.popnei` prints
   the URL of `js-v0.1.0-dev.3`, and `dependencies.xlsx_rs` a URL of its
   release, or nothing when work package 9 waits; `grep -rnE
   "Date\.now|new Date|Math\.random|setTimeout|setInterval|\bawait\b|from
   \"popnei\"" src/core --include="*.ts" --exclude="*.test.ts"` finds
   nothing; the first script of `popgen.html` and the file of three.js
   measured gzipped, beside the 191.81 KB of 2cedc40.
2. Every document the specs of stage 4 ask to change is changed: each
   item of their sections "What this spec asks of other documents" and
   "What this spec relies on" that names a skill,
   `docs/architecture.md` or `docs/technology.md` is found in the diff
   or on `main` before the start, and listed in the report with its
   commit; and the comment of `.github/workflows/site.yml` that says the
   Rust setup "comes with the files crate", which `testing.md`,
   "Continuous integration", took out on 28 September 2026, is
   corrected.
3. The map of the cases, `docs/plans/individuals-pca.cases.md`: every
   item of "The cases" and of "How it is verified" or "How it is
   checked" of the specs of stage 4 mapped to a test that gives its
   input and checks its outcome, as `docs/plans/variants-step.cases.md`
   does; a test written for an item that has none is seen to fail with
   the code it guards broken; the report lists every item left without
   a test, with its reason.

**Stands on:** work package 8, and 9 when it was run.

**Tasks:**

- [ ] 10.1 The documents, and the final checks. Serves 1 and 2. Needs
  work package 8, and 9 when it was run.
- [ ] 10.2 The map of the cases, and the tests it finds missing. Serves
  3. Needs 10.1.

## At the end

The plan is done when every box is ticked, or every box but those of
work package 9 when xlsx_rs had no release; the owner has accepted the
screens at stops A, B and C; the measurements are in the report; and the
report is finished. It then waits for the owner's order to merge
`plan/individuals-pca` into `main`. The push of `main` that follows,
also the owner's order, runs the flows in Firefox for the first time for
this stage and shows which engines give WebGL on GitHub's runners; the
orchestrator of the next session writes the second into `testing.md`
and `pca3d.md`, and a flow that fails there is fixed on `main` before
anything else.
