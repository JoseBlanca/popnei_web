# Plan: the Populations tab of popgen2.html, the diversity calculated again by itself beside the PCA

11 October 2026. A draft, for the owner to approve with its specs.

## For the owner

What you will try at the end, on `popgen2.html`, with a variants file
and an individuals file: the Populations tab shows, after one Run, the
diversity of each population, its table with "Download…" below it, and
the site frequency spectrum of each population, each plot with its own
"Download…". From that Run on, a change of a threshold, of an option of
the diversity or of the column of the populations calculates it again
by itself a second after you stop changing things, as the PCA does.
With the PCA live too, a change of a threshold calculates the PCA first
and the diversity after it, and the Populations tab says that the
diversity waits for the PCA. While the diversity runs, the thresholds,
its options, the column of the populations and the opening of another
individuals file are greyed, each saying why. The band at the top
names what runs and what waits, and offers "Stop all" while it names
more than one analysis.

**Two decisions are asked of you now**, besides the approval of this
plan and its specs. Each changes one constant and its words, so the
work goes on meanwhile with the recommendation.

1. **The name of the one population.** When no individual of the
   variants file has a population, with no individuals file for
   instance, the table has one row of every individual, and its CSV the
   same name. (a) "All individuals", as on the old page; the tab adds
   "No individual is assigned to a population, so the diversity is of
   every individual kept." (b) "Unclassified", the name the box
   Individuals gives that row of its counts. Recommended: (a). The row
   is the diversity of the whole collection, and "Unclassified" in a
   table of results reads as a leftover group beside populations that
   are not there.
2. **"None" chosen in the list "Column of the populations".** Your
   answer of 9 October 2026 says that with no column chosen every
   individual is unclassified and the analyses per population take
   them as one population. The design of 11 October 2026 says, in its
   choice 8, that no column chosen locks the diversity. (a) As your
   answer of 9 October: "None" gives the one population, as no
   individuals file does. (b) As the design's sentence: "None" locks
   the diversity, "Choose a column of the populations in the box
   Individuals.", and no individuals file gives the one population.
   Recommended: (a), one rule wherever no individual is classified, and
   the one the list already tells ("None: every individual
   unclassified").

The order of the seven packages:

1. The diversity in the Populations tab, the PCA and the diversity run
   one after the other, and the memory of a diversity started after a
   Stop of a large PCA, measured.
2. The tab whole: its lines while it waits, the downloads, the words
   said to a screen reader.
3. What the diversity reads greyed while it runs, and the download of
   the filtered variants waiting for it.
4. The band with two analyses, and Stop all.
5. The documents and the instructions brought up to date.
6. The session looks at every screenshot and runs every check.
7. You try the page.

You are stopped before package 7 only if: the measurement of package 1
finds the tab closed, or its memory above 4.33 GB, after a diversity
started a second after a Stop of a PCA of 9,381 individuals in WebKit,
which the design says calls for a hold after such a Stop; one change
starts two calculations at once; a result is shown for other values
than those on the screen; or a package fails three times.

You can stop reading here. The rest is for the sessions that build it.

## The plan

It builds the design `docs/designs/population-tab.md`, approved by the
owner on 11 October 2026 with the recommendations of its two open
points, the first of the three pieces of case 4 of `docs/use-cases.md`.
It is carried out as the `building` skill says, its work packages being
the phases of that skill's loop, on the branch `population-tab` in
`.claude/worktrees/population-tab`, from the commit that adds this
plan.

The specs, called below by these names, were written or revised on this
branch on 11 October 2026:

- **the screen spec**: `docs/specs/steps/popgen2-populations.md`, new;
- **the live section**: `docs/specs/steps/popgen2-pca.md`, "Several
  analyses calculated again by themselves", with its lines in "About to
  start" and "While a PCA runs" and its bullet of Vitest in "How it is
  checked";
- **the definition**: `docs/specs/analyses/diversity.md`, "On
  popgen2.html", and `docs/specs/analyses/sfs.md`, "On popgen2.html";
- **the band spec**: `docs/specs/steps/popgen2-band.md`, "Several live
  analyses" and the rows of 11 October 2026;
- `docs/specs/steps/popgen2-input.md`, "While the diversity runs";
  `popgen2-download.md`, "While an analysis runs"; `popgen2-filters.md`,
  its opening of 11 October 2026.

The store spec, `docs/specs/core/store.md`, does not change: the store
runs the diversity of the page as it runs the PCA, and keeps no result
for values left behind as it does for every analysis of the page.

## Words used below

- **The old page** is `popgen.html`, which keeps its diversity panel
  and its words unchanged, and shares core, the store, the workers,
  `autoRuns.ts` and the panel's components with `popgen2.html`.
- **The one pass** is the reading of the variants file that
  `popgen2.html` makes by itself when the file is opened. **Held** is a
  calculation kept running by `e2e/holdWorker.ts` so that a flow can
  look at the page meanwhile.
- **Live**, **the quiet second**, **a change under way** and **about to
  start** are those of `popgen2-pca.md`, "The terms"; **waiting**,
  **a round** and **Stop all** are the live section's: a live analysis
  whose second has run out and that another calculation keeps from
  running; the starts by themselves that one quiet second gives; and
  the band's button that ends every live state.
- **The browser check** is `POPNEI_TEST_PAGES=1 npm run build` and then
  `npx playwright test --project=chromium --project=webkit --workers=4
  --global-timeout=<milliseconds>` with the spec files named, or with
  `-g "<tag>"`. Firefox cannot start on the owner's Mac under
  Playwright. **The screens run** is `npx playwright test
  --project=screens -g popgen2 --global-timeout=400000` after a build.
  **The measurement run** is the build and `npx playwright test
  --project=measure-webkit`, then `--project=measure-chromium`,
  `--workers=1`, alone on the machine.
- **A tag** starts the name of a Vitest `describe` or of a Playwright
  test: `PT2 D3` is work package 2, deliverable 3, of this plan (`PT`
  for the Populations tab). No test name on this branch starts with
  `PT` and a digit (a search of `src/` and `e2e/` on 11 October 2026),
  so on the commit the plan starts from every check below selects no
  test, falls short of its count, and fails. A Vitest count is read from
  the summary line of `npx vitest run <path> -t "<tag>"`, "Tests N
  passed", since a tag that selects nothing exits 0; a Playwright count
  from the summary of the browser check, half in each engine.
- **A command in the foreground** lasts at most 600,000 ms; nothing
  runs in the background. A browser run that would last longer is split
  into runs of a few spec files.
- **The lock of the agents**: two agents that share this worktree build
  and run Playwright one at a time, under the `mkdir` lock the owner's
  note of 10 October 2026 describes, since they share `dist/` and the
  ports.

## In and out

In: the seven work packages below. Two measurements are in work
package 1: the memory of a diversity started a second after a Stop of
the PCA of 9,381 individuals, and the size of the Populations tab's
code.

Out, each with where it goes:

- the LD decay in the Populations tab and the Distances tab: pieces 2
  and 3 of case 4, which join as live groups of their own (the design,
  "For pieces 2 and 3");
- the removal of the old page's diversity panel: when `popgen.html` is
  deleted, as the owner decided on 9 October 2026;
- the help drawer and the saving of a project on `popgen2.html`: no
  plan yet;
- Firefox and Safari, which Playwright cannot start here, and VoiceOver,
  which the session cannot run: the owner, in work package 7.

## The open points of the specs

The screen spec has two, both at the top of this plan for the owner,
each with a meanwhile: **Open 1**, the name of the one population,
meanwhile "All individuals", which an answer (b) changes in task 1.1
(the constant the definition sends, and the words of the line of the
populations) and in the numbers of deliverable 1.4; **Open 2**, "None"
chosen, meanwhile the one population, which an answer (b) changes in
task 1.1 (one reason of `needs`) and in a case of deliverable 1.1.

## The stops

The `building` skill stops for the owner on a choice hard to undo,
something popnei lacks, a decision about what the user sees that the
specs do not settle, a phase that failed three times, and anything
outside the worktree. If one comes, the session leaves the tree with
the checks passing and everything committed, writes the question under
"What was done" with the options, what each costs and a recommendation,
goes on with every work package that does not stand on the answer, and
puts the question first in the report.

- **The measurement of deliverable 1.5** finds WebKit's tab closed, or
  the memory of its engine above 4.33 GB, the most a tab of this page
  is known to have held and survived. The design's choice 5 (a) then
  calls for a hold after a Stop of a large PCA: the waiting analyses not
  started until WebKit has given that memory back, or until the user's
  next change. The options go to the owner; work packages 2 and 3 go on
  meanwhile, and 4 waits, since the band shows what Stop leads to.
- **Two calculations sent at once**, or a start the user's change did
  not ask for, in the flows of work package 1 after their fixes: the
  design's rule 5, one calculation at a time, does not hold.
- **A result shown for other values** than those on the screen, in any
  flow: the first of the design's rules does not hold.
- **Stop and Stop all that do not fit at 320 px** with "Popnei" and the
  short form of the band, in work package 4: the band spec decides only
  what fits; the session proposes the change, a short form of fewer
  words or "Stop all" alone, and the owner judges it in package 7.
- **An invariant of `docs/architecture.md`**, an interface between the
  layers, or the format of the project file: none is planned.
- **A work package that fails three times**, or a finding of a review
  whose fix is one of the above.
- **Outside the worktree.** Nothing is merged, pushed or filed.

## Before the first task

- The worktree has its packages, popnei 0.2.2 in
  `node_modules/popnei`, table_io `js-v0.2.0-dev.1`; node v26.8.2;
  Chromium and WebKit installed for Playwright.
- The session runs the typecheck, the lint, Vitest and the format check
  on the commit the plan starts from, and the browser check of the flows
  of `popgen2.html`, `e2e/popgen2*.spec.ts`, and writes their counts
  under "What was done"; and confirms with `npx vitest list` and
  `npx playwright test --list` that no test name starts with `PT` and a
  digit.
- Every number of popnei a check compares with is popnei 0.2.2's under
  node. The numbers of the Populations tab on `panel.nei` were run on
  this machine on 11 October 2026 and are in the definition's "How it
  is verified" and the screen spec's "How it is checked": with
  `panel_pops.csv` the old page's numbers with the filter at 1, which
  the page's 0.1 also keeps all 1,200 variants for; with no individuals
  file, the one population.
- What the specs name and the code does not have, built here:
  `diversityOnPopgen2`, `diversityPageOf` and the page of `refusalText`
  and `statisticsFailedText` in `src/core/analyses/diversity.ts`;
  `popgen2Populations` in `src/core/project.ts`; `spectrumCsv` and the
  page of `spectrumWarnings` in `src/core/analyses/sfs.ts`;
  `fileNameParts` in `src/core/fileNames.ts`; `run`'s answer,
  `pauseAll`, `after`, `"behind"` and the events of a round in
  `src/ui/autoRuns.ts`; a greyed state of `src/ui/widgets/FileZone.tsx`.

## The order, and what may run side by side

The core and the order of the live analyses come first, since a start
missed, doubled or under a key left behind is silent unless a test
counts the requests, and the measurement, which could send the design's
choice 5 back, needs them and the tab's Run. The tab whole and the
lock come next and may run side by side, since they touch different
files; the band comes last, since it names what the others make.

- Work package 1 runs first. Its tasks 1.1 and 1.2 may run side by
  side: 1.1 touches `src/core/`, 1.2 `src/ui/autoRuns.ts`,
  `src/ui/popgen2Store.ts` and their tests. 1.3 stands on both, 1.4 and
  1.5 on 1.3; 1.5 runs alone on the machine.
- 2 and 3 stand on 1 and may run side by side: 2 touches
  `src/ui/analyses/diversity/`, the tab's files and
  `src/ui/variants/announceChanges.ts`; 3 touches
  `src/ui/analyses/status.ts`, `src/ui/variants/filtersLock.ts`,
  `IndividualsBox.tsx`, `IndividualsTab.tsx`, `downloadState.ts`,
  `downloadWords.ts` and `src/ui/widgets/FileZone.tsx`. Only one of
  them runs a browser at a time.
- 4 stands on 1 to 3. 5, 6 and 7 run after everything, in order.

At most three agents run at once, the reviewers among them.

Each work package is reviewed as it ends, as the `building` and
`code-review` skills say: one `code-reviewer` subagent per category of
"The categories of each review", below, in batches of three, the
findings judged by the session, the fixes sent to a subagent test
first, the checks and the screenshots run again after them. Its counts,
its commits and its review go under "What was done".

Every task writes its tests first, sees them fail on the commit before
it, then the code; a task's commit holds both and passes the typecheck,
the lint, Vitest and the format check.

## Work package 1: the diversity in the Populations tab, behind the PCA, measured

What it gives, on `popgen2.html`: the Populations tab, once a variants
file is open, shows the three options of the diversity, the line of the
populations it will run on, Run with its locks, and, after Run, the bar
and then the table of the diversity with its warnings and the spectrum
of each population. With the PCA and the diversity live, a change of a
threshold calculates the PCA a second later and the diversity at its
end; a Run of the diversity while the PCA runs waits for it; a Stop of
the PCA lets the diversity start a second later. The lines of waiting,
the downloads of the page's kind and the lock of the populations come
in packages 2 and 3; until then the tab shows no line while it waits,
and the table and the spectrum have no "Download…".

Deliverables:

1. The definition of the page: each bullet of the definition's "How it
   is verified", "On popgen2.html", the cases of its "The cases", and
   `spectrumWarnings` with page "popgen2" and `spectrumCsv` from
   `sfs.md`, "On popgen2.html", under `PT1 D1` in
   `src/core/analyses/diversity.test.ts`, `src/core/project.test.ts`
   and `src/core/analyses/sfs.test.ts`. At least 20 tests, the
   individual not in the file that does not lock and the column that
   classifies none among them. The old page's tests of the three files
   pass untouched.
2. Several live analyses: each case of the live section's bullet of
   Vitest in `popgen2-pca.md`, "How it is checked", on the real store of
   the page with the PCA and the diversity, a fake worker, the gate and
   Vitest's clock, the worker's requests counted, under `PT1 D2` in
   `src/ui/autoRuns.test.ts`. At least 16 tests, the diversity starting
   after a PCA never run and after a PCA refused by popnei among them.
   The tests of `autoRuns.test.ts` and `popgen2Store.test.ts` that were
   there pass, those that read `run`'s boolean changed to its answer
   and named in the commit message.
3. The tab: Run through `autoRuns.run`, Stop and Stop recalculating
   through `autoRuns.pause`, each lock of the screen spec's "The locks"
   beside Run, the line of the populations with 7 unclassified and with
   the one population, and the line of a Stop, under `PT1 D3` beside the
   tab's component in jsdom; the tab's code downloaded when it is first
   shown, as the PCA tab's result is, with "Loading the result…" and
   "Try again".
4. The flows under `PT1 D4` in a new `e2e/popgen2Populations.spec.ts`,
   in Chromium and WebKit: the numbers of the screen spec's "How it is
   checked", "The numbers", the row p0 at 0.1 and at 0.05 and the one
   population with no individuals file; "The unclassified"; and "Live
   with the PCA", every check of it, the requests counted at the worker.
   The flows of `popgen2Live.spec.ts`, `popgen2Pca.spec.ts`,
   `popgen2Tabs.spec.ts` and the old page's diversity flows pass;
   `popgen2Tabs.spec.ts`'s check of "Not built yet" in the Populations
   tab is changed to the tab's heading, "Diversity", and the screen of
   that line in `e2e/screens.spec.ts` removed, each named in the commit
   message.
5. The memory of a diversity started a second after a Stop of the PCA
   of `popgen2.html`, by the measurement run, alone on the machine, in
   WebKit and then Chromium, on the gzipped VCF of 300 variants and
   9,381 diploid individuals that `e2e/bigVcf.ts` writes, with its CSV
   of three populations of 3,127 individuals: the LD pruning of the PCA
   off; Run of the PCA; Run of the diversity while the PCA runs, which
   waits; the PCA's Stop pressed 10 s into the PCA; the diversity
   started by itself about 1 s later. The memory of the engine's
   processes summed every 250 ms from before the PCA's Run to 11 s after
   the diversity's table, in GB: before, at the PCA's peak, at the
   Stop, at the diversity's peak, 11 s after; the time from the Stop to
   the diversity's request, and of the diversity; whether the tab held.
   Under `PT1 D5` in `e2e/measure.spec.ts`. The bound: the tab holds and
   the engine stays at or under 4.33 GB in WebKit; beyond it, the stop
   above. Written under "What was done" and into section 11 of
   `docs/architecture.md`.
6. The gzipped size of the Populations tab's code, the sum of Vite's
   gzip sizes of the files it downloads when it is first shown, and of
   the first load of `popgen2.html`, which must not grow by more than
   the few lines of the tab's frame: 321.11 KB at 93659177. Written
   under "What was done".

Tasks:

- [ ] 1.1 The definition of the page: `diversityOnPopgen2`,
  `diversityPageOf`, the page of the words, `popgen2Populations`,
  `spectrumCsv` and the page of `spectrumWarnings`, and the definition
  added to `POPGEN2_ANALYSES` of `src/core/apps.ts` after `pcaOnPopgen2`
  (the definition, "On popgen2.html", all its parts; `sfs.md`, "On
  popgen2.html"). Deliverable 1. A wrong population sent to popnei, an
  unclassified individual left in, or the one population sent with
  some individual classified, would give numbers no screen could tell
  wrong, so this is a commit of its own, guarded by deliverable 1.
- [ ] 1.2 `src/ui/autoRuns.ts` and `src/ui/popgen2Store.ts` for several
  live analyses: the groups and `POPGEN2_LIVE` with the diversity,
  `holderOf`, `run`'s answer and its waiting, `pause` with the quiet
  second again, `pauseAll`, `after`, `"behind"`, the events of a round
  and of a Run that waited, and the page's `endsLive` dispatching by
  analysis, the diversity's in a module beside the PCA's `liveEnd.ts`
  (the live section, "For the implementer"). Deliverable 2. May run
  beside 1.1. A start missed or doubled is silent in node unless a test
  counts the requests, so this is a commit of its own, guarded by
  deliverable 2.
- [ ] 1.3 The Populations tab in the place of its line "Not built yet":
  the options part, the line of the populations, Run, Stop and Stop
  recalculating through `autoRuns`, the locks with the one pass's from
  `passLock` and the words of the page, the bar, the result drawn by
  the old panel's table and `SpectrumBlock` given the page's definition,
  with the old buttons of download left out, the errors in the page's
  words, and the tab's code loaded apart (the screen spec, "The order
  of the tab", "The options", "The populations it runs on", "Run and
  Stop" but its line in the place of the bar, "The result" but its
  downloads, "The states" but about to start and waiting). Deliverables
  3, 4 and 6. Stands on 1.1 and 1.2.
- [ ] 1.4 The flows of deliverable 4. Stands on 1.3. May be the same
  subagent's as 1.3.
- [ ] 1.5 The measurement of deliverable 5, alone on the machine.
  Stands on 1.3.

What could go wrong: the PCA's Run and the diversity's Run pressed in
two tabs within the quiet second; Run starts its analysis at once when
nothing runs, so the PCA about to start waits after the diversity, the
spec's choice, and deliverable 2 has the case. A PCA tried again after a
failure, while the diversity is live, could hold the diversity back if
`holderOf` keeps any rule of the old one; deliverable 2 has the PCA
refused, crashed and locked. In the measurement, WebKit's memory after
the Stop falls slowly over 40 s and more; the bound is read at the
diversity's peak, not after it.

## Work package 2: the tab whole

What it gives, on `popgen2.html`: the Populations tab says, while the
diversity is live and does not run, what it waits for: the quiet
second, the PCA before it, the PCA running, or the download; the table,
each histogram of the spectrum and the table of the spectrum have their
"Download…", the tables' below them; the status region says a round of
two analyses once, the start of a Run that waited, the end and a Stop
of the diversity.

Deliverables:

1. The words of the tab, by state and by what it waits for, the line of
   the populations, and the names of the files with `fileNameParts`,
   under `PT2 D1` in the tests of the tab's words and in
   `src/core/fileNames.test.ts`: each row of the screen spec's "Its
   words" that the tab draws. At least 12 tests.
2. The tab in jsdom, under `PT2 D2`: each line in the place of the bar
   from a `liveState`; Stop recalculating in the states about to start
   and waiting, with the focus kept on the button as it changes name,
   and on the heading "Diversity" when it goes; the status region's
   words of a round, of a Run that waited, of an end and of a Stop, in
   `announceChanges.ts`'s tests.
3. The flows under `PT2 D3` in `e2e/popgen2Populations.spec.ts`: the
   line of waiting while the PCA is held running, read with the
   Populations tab shown; the round said once, never joined with an end;
   the downloads of the screen spec's "How it is checked", "The
   downloads", saved and read back, with the keyboard alone; axe in each
   state of the tab, light and dark.
4. The screens of the screen spec's "How it is checked", "The screens",
   but `popgen2-individuals-box-locked`, which is package 3's, at 1280
   and 320 px, light and dark.

Tasks:

- [ ] 2.1 The lines of the tab while it is live and does not run, the
  line of a Stop, and the status region (the screen spec, "Run and
  Stop", "The states", "Its words", "Accessibility"; the live section,
  "The status region"). Deliverables 1 (but the names of the files), 2
  and the flows of the line and the round of deliverable 3.
- [ ] 2.2 The downloads of the tab: the "Download…" of the table and of
  the table of the spectrum below them, of each histogram above it,
  `fileNameParts`, and the names of the files (the screen spec, "The
  result"; `sfs.md`, "On popgen2.html"). The rest of deliverables 1 and
  3. May run beside 2.1: it touches the result's components and
  `fileNames.ts`, 2.1 the tab's frame and `announceChanges.ts`.
- [ ] 2.3 The screens, deliverable 4. Stands on 2.1 and 2.2.

What could go wrong: the spectrum's block draws its histograms with the
charts' histogram, not with `HistogramPlot`, which carries the menu of
a plot; the menu needs the handle of each plot, as the PCA's result
gives its own (`docs/specs/widgets/downloads.md`, "A plot").

## Work package 3: the lock and the download with two analyses

What it gives, on `popgen2.html`: while the diversity runs, the
thresholds and the FILTER box say to stop the diversity in the
Populations tab; the list of the column, the zone of the individuals
file, its Remove and the three lists of how a text file is read are
greyed with their reason, and a file dropped or pasted on the zone opens
nothing; while the PCA runs, the box Individuals stays open, as now.
With another analysis waiting after the one running, the reasons name
Stop all. The download of the filtered variants waits for the diversity
as for the PCA, and for those waiting.

Deliverables:

1. `runningAnalysisOf` and the words of the lock, the PCA's and the
   diversity's, with and without an analysis waiting, and the words of
   the download's wait, under `PT3 D1` in the tests of
   `src/ui/analyses/status.ts`, `src/ui/analyses/words.ts` and
   `src/ui/variants/downloadWords.ts`. At least 8 tests.
2. The box Individuals, the Individuals tab and the zone in jsdom,
   under `PT3 D2`: greyed while the diversity runs and not while the PCA
   runs; the zone's greyed state takes no drop and no paste and shows the
   reason; `aria-disabled` and the description on each.
3. The flows under `PT3 D3` in `e2e/popgen2Populations.spec.ts`: "The
   lock" of the screen spec's "How it is checked", every check of it;
   the bullet of 11 October 2026 of `popgen2-input.md`'s "How it is
   checked"; the bullet of 11 October 2026 of `popgen2-download.md`'s
   "How it is checked"; axe in each, light and dark.
4. The flows that were there pass: `e2e/popgen2Live.spec.ts`,
   `popgen2Download.spec.ts`, `popgen2Input.spec.ts` and the old
   page's individuals flows.
5. The screen `popgen2-individuals-box-locked`, at 1280 and 320 px,
   light and dark.

Tasks:

- [ ] 3.1 `runningAnalysisOf`, the lock of the filters and the words
  with Stop all, from the store and `autoRuns` (the live section, "The
  lock" and "For the implementer"; the screen spec, "While the
  diversity runs"). Deliverable 1, but the download's words.
- [ ] 3.2 The greyed box Individuals, the Individuals tab's lists, and
  the greyed state of `FileZone.tsx` (`popgen2-input.md`, "While the
  diversity runs"). Deliverables 2, 3 but the download's, and 5. Stands
  on 3.1.
- [ ] 3.3 The download's wait for any analysis and those waiting
  (`popgen2-download.md`, "While an analysis runs"). The rest of
  deliverables 1 and 3, and 4. Stands on 3.1; may run beside 3.2.

What could go wrong: the zone of a file also takes a drop on the whole
page while it is shown; a drop meant for the greyed zone must not fall
through to the page's own drop of a variants file. And the reason of a
greyed zone said both in the box and in the status region at a drop
would be heard twice; the screen spec has it said once.

## Work package 4: the band with two analyses

What it gives, on `popgen2.html`: the band names the diversity running,
about to start or stopping, as the PCA; "PCA running · 1:20 · then the
diversity" while the diversity waits after the PCA; "The PCA and the
diversity start again in a moment" in the quiet second of both; Stop
all while it names more than one; the link to the warnings or the error
of the first analysis in the order of the tabs.

Deliverables:

1. `bandOf` with the PCA and the diversity: each case of the band
   spec's "How it is checked", In Vitest, of 11 October 2026, under
   `PT4 D1` in `src/ui/band/band.test.ts`. At least 10 tests; the
   tests that were there pass, those whose `BandPage` took `pcaLive`
   given the new field and named in the commit message.
2. The band drawn, under `PT4 D2` in jsdom: Stop all calls
   `autoRuns.pauseAll`, the diversity's Stop `autoRuns.pause
   ("diversity")`, the focus on the heading "Popnei" after each; no
   Stop of an analysis whose tab is shown, Stop all kept.
3. The flows under `PT4 D3` in a new `e2e/popgen2BandLive.spec.ts`: the
   bullet of 11 October 2026 of the band spec's "How it is checked", In
   Playwright, the fit at 320 px among them; `e2e/popgen2Band.spec.ts`
   passes untouched; axe in each new state, light and dark.
4. The screens `popgen2-band-then-diversity` and
   `popgen2-band-analyses-soon`, at 1280 and 320 px, light and dark.

Tasks:

- [ ] 4.1 `src/ui/band/bandLine.ts` and `bandWords.ts` (the band spec,
  "Several live analyses", "Its words"). Deliverable 1.
- [ ] 4.2 `src/ui/band/Band.tsx` and its reading of each live
  analysis's `liveState` with one subscription, Stop all, the short
  forms (the band spec, "Several live analyses", "What it sends and
  reads", "Accessibility"). Deliverables 2 to 4. Stands on 4.1.

What could go wrong: the stop above, Stop and Stop all that do not fit
at 320 px. And the band read from two live states that change in two
steps: between the PCA's end and the diversity's start the band must
never show "Popnei" alone; deliverable 3 reads the band at every
change, as the flow of the PCA's band does.

## Work package 5: the documents and the instructions

- [ ] 5.1 The instructions, by the session itself and not by a
  subagent, since every later session reads them: each place found by
  `grep -rn -i "live\|the PCA alone\|started by itself\|popgen2"
  CLAUDE.md .claude/` that says the PCA is the only analysis of
  `popgen2.html` calculated again by itself, the `coding` skill's
  `react.md` among them; the lessons of the reviews of packages 1 to 4.
  The report lists the files.
- [ ] 5.2 The documents: `docs/architecture.md`, sections 3, 5, 7, 9
  and 11, each with its "What was revised" (the design, "What stays
  true of the architecture", and "For the session that builds it", the
  last paragraph); `docs/functionality.md`, the paragraph of the PCA tab
  that says it alone calculates again by itself, and the Populations
  tab; the measurements of deliverables 1.5 and 1.6 in section 11; each
  spec of this plan says it is built on the branch `population-tab`,
  with what a round changed; "What was done" complete.

## Work package 6: the end

- [ ] 6.1 The session's own look: it reads every screenshot of work
  packages 2 to 4 with `Read`, state by state, in both themes and both
  widths, and checks that each state of the screen spec's "The states",
  of the band spec's new rows and of the greyed box is there and
  readable; what it finds is a fix sent to a subagent, test first,
  before 6.2.
- [ ] 6.2 The checks of the `coding` skill on the last commit, and the
  browser check of the whole suite in Chromium and WebKit, in chunks of
  spec files that each end within a foreground command; the counts of
  each chunk recorded below; a flaky test run again three times and
  named.
- [ ] 6.3 The report to the owner, as the `building` skill says: the
  stops met, if any; the measurements of 1.5 and 1.6; what the review
  found and fixed and what it did not take; the browsers the screens
  were seen in, Chromium in the screenshots and Chromium and WebKit in
  the flows, and those not seen, Safari, Firefox and Chrome; the
  instructions changed; and how to try the page: `npm run dev` in the
  worktree, `popgen2.html`, `e2e/fixtures/panel.nei` and
  `panel_pops.csv`; Run in the PCA tab with an LD distance, then Run in
  the Populations tab; move a threshold and watch the Populations tab
  wait for the PCA; Stop the PCA in the band and see the diversity
  start a second later; Stop all; choose "None" and another column;
  remove the individuals file.

## Work package 7: the owner tries the page

- [ ] 7.1 The owner tries the page and answers: whether the screen is
  accepted; whether the wait after each change with both analyses live
  is too long, which the design says would call for its choice 1 (c);
  the choices of the screen spec's "Choices made by the session";
  whether Safari and Firefox show the band with Stop all on one line at
  a phone's width; what VoiceOver says at a round and on the greyed box
  Individuals.
- [ ] 7.2 The rounds. Two are expected. Each change the owner asks for
  goes into the spec first, then into the code, with its commit and its
  screenshots taken again; a change that reaches `src/core/`, the
  worker or `docs/functionality.md` is said to the owner as such and
  becomes a task of its own. After a round that changed the markup, the
  `accessibility`, `react` and `ux` reviewers run again.
- [ ] 7.3 The owner accepts the screen, and the specs say what the
  screen now is. The branch is merged into `main` when the owner says
  so.

## The categories of each review

The `code-review` skill's categories, each a reviewer that reads the
work for one kind of fault: `spec`, whether the code does what the spec
says; `tests`, whether the tests would fail if it did not; `stale`,
comments and documents that no longer say what the code does;
`errors`, failures handled and said to the user; `api`, the interfaces
between the parts; `architecture`, the rules of `docs/architecture.md`;
`react`, the code of the screens; `accessibility`, the keyboard, the
screen reader and the contrast; `ux`, what the user sees and
understands; `browser`, what differs between the engines; and
`bundle`, what the page downloads. The first four run for every work
package that changes code, with:

- 1: `api`, `architecture` (a second live analysis started in
  `src/ui`, one calculation at a time, a definition of core shared by
  two pages), `react`, `ux`, `browser`, `bundle` (the tab's code loaded
  apart, the first load unchanged), with its screenshots of the tab
  ready, running and done;
- 2: `api`, `react`, `accessibility`, `ux`, `browser` (the menus of the
  histograms, the status region in WebKit), with its screenshots;
- 3: `api`, `react`, `accessibility`, `ux`, `browser` (a drop and a
  paste on a greyed zone in WebKit), with its screenshots;
- 4: `api`, `react`, `accessibility`, `ux`, `browser` (the band at 320
  px), `bundle` (the band's code in the first load), with its
  screenshots;
- 5: `stale` alone, on the instructions and the documents;
- 6: `browser` on the whole branch, as the skill asks before a plan is
  done.

## What was done

Each work package adds its entry here: its commits, the counts of its
checks, its review with the findings not taken, and the decisions made
along the way.
