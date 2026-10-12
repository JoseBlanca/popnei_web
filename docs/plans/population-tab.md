# Plan: the Populations tab of popgen2.html, the diversity calculated again by itself beside the PCA

11 October 2026. Approved by the owner on 11 October 2026, with its
specs and their answer to the one open point.

## For the owner

This plan builds the Populations tab of `popgen2.html`: the diversity of
each population and its site frequency spectrum, calculated again by
itself after each change, as the PCA tab is since 10 October 2026. It
builds the design you approved today, `docs/designs/population-tab.md`.
You approved it and its specs on 11 October 2026, and answered its one
question: when the individuals file cannot be read, or the column
chosen has more than 20 different values, every individual is
unclassified, and the diversity is of all of them as one population,
"Unclassified", until a column is chosen, with a line that says why.

**The words used here.** An analysis is **live** once you press its
Run: from then on it is calculated again by itself after each change of
what it reads, until you press its **Stop recalculating**, the button
that ends that. It starts one second after you stop changing things,
**the quiet second**; during that second its tab says it is **about to
start**. The page calculates one thing at a time, so after a change of a
threshold, with the PCA and the diversity both live, the PCA runs first
and the diversity, **waiting**, after it. While an analysis runs, the
controls of what it reads are greyed with the reason, **the lock**, so
that no change ever meets a running calculation. **The band** is the
line at the top of the page, beside the heading "Popnei", that says
what runs and offers its Stop; it gains **Stop all**, shown whenever
two or more analyses are live and one of them runs, waits or is about
to start, which ends every
live analysis at once. **The one pass** is the reading of the variants
file the page makes by itself when the file is opened. **The status
region** is what a screen reader reads aloud without moving the
keyboard's place on the page. **WebKit** is the engine of Safari, which
the tests drive.

**What you will try at the end**, with a variants file and an
individuals file: in the Populations tab, Run gives the table of the
diversity of each population, with "Download…" below it, and the
spectrum of each population, each plot with its own "Download…". A
change of a threshold, of an option of the diversity or of the column
of the populations then calculates it again by itself. With the PCA
live too, the Populations tab says that the diversity waits for the
PCA. While the diversity runs, the thresholds, its options, the column
of the populations and the opening of another individuals file are
greyed, each saying why. The band names what runs and what waits.

**Two things settled from your earlier decisions**, which you may
change:

- When no individual of the variants file has a population, with no
  individuals file, with "None" chosen in the list of the column, or
  with a column that gives none of them a population, the table has
  one row of every individual, named "Unclassified", the name the box
  Individuals gives that row of its counts, as you accepted it on 11
  October 2026.
- That "None" gives this row follows your answer of 9 October 2026 on
  the unclassified (`docs/designs/input-page.md`). The design you
  approved today said, in its section on a change of the populations,
  that no column chosen locks the diversity; that sentence was
  corrected to your earlier answer, with a dated line saying why.

**The packages, by what each gives:**

1. The diversity in the Populations tab, the PCA and the diversity
   calculated one after the other, what the diversity reads greyed
   while it runs, and two measurements of memory (below).
2. The tab whole: what it says while it waits, the downloads, what a
   screen reader hears.
3. The box Individuals and the Individuals tab greyed while the
   diversity runs.
4. The band with two analyses, and Stop all.
5. The documents and the instructions brought up to date.
6. The session looks at every screenshot and runs every check.
7. You try the page.

You see the tab first after package 1, in its first form, if you wish;
its pictures in every state come in package 2, after the measurements.

**The measurements of package 1.** In WebKit, a Stop of the PCA of
9,381 individuals near its peak leaves 3.7 to 4.2 GB in the tab for
40 s and more, and the most a tab of this page is known to have held
and survived is 4.33 GB, on your Apple M5 Pro with 64 GB on 10 October
2026; above that WebKit may close the tab, and the user loses the open
files and every result. Package 1 measures a diversity started a second
after such a Stop, and a diversity started at once after a PCA of 9,381
individuals that ended normally. If either closes the tab or passes
4.33 GB, you are asked whether the page should wait longer, after a
Stop or the end of a large PCA, before it starts the next analysis.

You are also stopped if the browser tests show a result for other
values than those on the screen, which you would see as a table that
does not match the thresholds shown; or if a package fails three times.

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
  test. Each check asks for at least a number of tests, and a run that
  selects none is short of that number, so the check fails there, as
  it must before the work. A Vitest count is read from the summary line
  of `npx vitest run <path> -t "<tag>"`, "Tests N passed", since a tag
  that selects nothing exits 0; a Playwright count from the summary of
  the browser check, which runs each flow once in Chromium and once in
  WebKit, so the count is twice the number of flows.
- **A command in the foreground** lasts at most 600,000 ms; nothing
  runs in the background. A browser run that would last longer is split
  into runs of a few spec files.
- **The lock of the agents**: two agents that share this worktree build
  and run Playwright one at a time, under the `mkdir` lock the owner's
  note of 10 October 2026 describes, since they share `dist/` and the
  ports.

## In and out

In: the seven work packages below. Three measurements are in work
package 1: the memory of a diversity started a second after a Stop of
the PCA of 9,381 individuals near its peak, and at once after such a
PCA that ended; and the size of the Populations tab's code.

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

None. The owner answered the screen spec's last one on 11 October
2026: a refused individuals file and a column of more than 20 values
give the one population, "Unclassified", with a line that says why;
task 1.1 builds it, and deliverable 1.1 checks it. The two points of
the first draft were settled by the session from the owner's earlier
decisions: the one population is named "Unclassified", and "None" gives
it; the design's choice 8, which said "None" locks, was corrected the
same day. The report to the owner (task 6.3) names the correction.

## The stops

The `building` skill stops for the owner on a choice hard to undo,
something popnei lacks, a decision about what the user sees that the
specs do not settle, a phase that failed three times, and anything
outside the worktree. If one comes, the session leaves the tree with
the checks passing and everything committed, writes the question under
"What was done" with the options, what each costs and a recommendation,
goes on with every work package that does not stand on the answer, and
puts the question first in the report.

- **The measurements of deliverable 1.5** find WebKit's tab closed, or
  the memory of its engine above 4.33 GB, the most a tab of this page
  is known to have held and survived (`docs/architecture.md`, section
  11), in either case of it. The design's choice 5 (a) then calls for a
  hold: the waiting analyses not started, after a Stop or the end of a
  large PCA, until WebKit has given that memory back, or until the
  user's next change. The options go to the owner; work packages 2 and 3 go on
  meanwhile, and 4 waits, since the band shows what Stop leads to.
- **Two calculations sent at once**, or a start the user's change did
  not ask for, in the flows of work package 1 after their fixes: the
  design's rule 5, one calculation at a time, does not hold.
- **A result shown for other values** than those on the screen, in any
  flow: the design's first rule, that a result is never shown stale,
  does not hold.
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
missed, doubled or made for values left behind shows nothing on any
screen and is caught only by a test that counts the requests sent to
the worker; and the measurements, which could send the design's choice
5 back, need them and the tab's Run. The lock of the filters comes with
them, so that no package leaves a running diversity without it. The tab
whole and the lock of the box Individuals come next and may run side by side, since they touch different
files; the band comes last, since it names what the others make.

- Work package 1 runs first. Its tasks 1.1 and 1.2 may run side by
  side: 1.1 touches `src/core/`, 1.2 `src/ui/autoRuns.ts`,
  `src/ui/popgen2Store.ts` and their tests. 1.3 stands on both, 1.6 on
  1.2 and may run beside 1.3, 1.4 on 1.3, 1.5 on 1.3 and 1.6; 1.5 runs
  alone on the machine.
- 2 and 3 stand on 1 and may run side by side: 2 touches
  `src/ui/analyses/diversity/`, the tab's files and
  `src/ui/variants/announceChanges.ts`; 3 touches `IndividualsBox.tsx`,
  `IndividualsTab.tsx`, `src/ui/widgets/FileZone.tsx` and the words of
  `src/ui/analyses/words.ts`. Only one of them runs a browser at a
  time.
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
the PCA lets the diversity start a second later. While the diversity
runs, the thresholds are greyed with its words and the download of the
filtered variants waits. The lines of waiting, the downloads of the
page's kind and the lock of the box Individuals come in packages 2 and
3; until then the tab shows no line while it waits, the table and the
spectrum have no "Download…", and a change of the populations during a
diversity stops it, as the store does with any change left behind.

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
5. Two measurements of memory, by the measurement run, alone on the
   machine, in WebKit and then Chromium, on the gzipped VCF of 300
   variants and 9,381 diploid individuals that `e2e/bigVcf.ts` writes,
   with its CSV of three populations of 3,127 individuals, the LD
   pruning of the PCA off. In each, the memory of the engine's
   processes summed every 250 ms, in GB, and whether the tab held,
   under `PT1 D5` in `e2e/measure.spec.ts`:
   - **After a Stop near the PCA's peak.** Run of the PCA; Run of the
     diversity while the PCA runs, which waits; the PCA's Stop pressed
     40 s into the PCA, or at the peak the memory reaches if the flow
     reads it first, as `docs/architecture.md`, section 5, measured
     4.22 GB at a Stop at 40 s; the diversity started by itself about
     1 s later. Recorded: before, at the Stop, at the diversity's peak,
     11 s after its table; the time from the Stop to the diversity's
     request, and of the diversity. The run counts only when the
     engine held at least 3.7 GB at the Stop in WebKit, the case the
     design leaves to measure; a run below it is repeated with a later
     Stop.
   - **After a PCA that ended.** Both live after a first round; a
     threshold moved; the PCA calculated again to its end, after which
     the client ends its worker, as after every PCA of more than 700
     individuals (`PCA_RESTART_INDIVIDUALS` of `src/worker/client.ts`),
     while WebKit gives back up to 3.4 GB; the diversity started at once,
     with no second more. Recorded: the PCA's peak, the memory when the
     diversity's request is sent, the diversity's peak, 11 s after.
   The bound, in both: the tab holds and the engine stays at or under
   4.33 GB in WebKit; beyond it, the stop above. Written under "What
   was done" and into section 11 of `docs/architecture.md`.
6. The gzipped size of the Populations tab's code, the sum of Vite's
   gzip sizes of the files it downloads when it is first shown, and of
   the first load of `popgen2.html`, which must not grow by more than
   the few lines of the tab's frame: 321.11 KB at the commit 93659177
   of `main`, the last measured. Written under "What was done".
7. The lock of the filters and the download's wait while the diversity
   runs, so that from this package on a threshold moved during a
   diversity is greyed and never stops the worker unasked, and a
   download never queues behind it: `runningAnalysisOf` of
   `src/ui/analyses/status.ts` giving the live analysis running, the
   words of the lock of the PCA and of the diversity, with and without
   another analysis live, and the words of the download's wait,
   under `PT1 D7` in the tests of `status.ts`, `src/ui/analyses/words.ts`
   and `src/ui/variants/downloadWords.ts`, at least 8 tests; and the
   flows under `PT1 D7` in `e2e/popgen2Populations.spec.ts`: the
   diversity held running, the thresholds and the FILTER box greyed
   with the diversity's words; the bullet of 11 October 2026 of
   `popgen2-download.md`'s "How it is checked". `popgen2Live.spec.ts`
   and `popgen2Download.spec.ts` pass.

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
  analysis: the PCA's rule is `failureEndsLive` of
  `src/ui/analyses/pca/liveEnd.ts`, and the diversity's is a function
  of its own in a new module of `src/ui/analyses/diversity/` (the live
  section, "For the implementer"). Deliverable 2. May run beside 1.1. A
  start missed or doubled shows nothing in a test of node, where no
  screen is drawn, unless the test counts the requests sent to the
  worker; so this is a commit of its own, guarded by deliverable 2.
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
- [ ] 1.5 The measurements of deliverable 5, alone on the machine.
  Stands on 1.3 and 1.6.
- [ ] 1.6 `runningAnalysisOf`, the lock of the filters
  (`src/ui/variants/filtersLock.ts`) and the download's wait
  (`downloadState.ts`, `downloadWords.ts`, `DownloadVariants.tsx`) for
  any live analysis and those waiting after it (the live section, "The
  lock" and "For the implementer"; the screen spec, "While the
  diversity runs", its first two bullets; `popgen2-download.md`, "While
  an analysis runs"). Deliverable 7. Stands on 1.2; may run beside
  1.3, whose files it does not touch. Until it, a threshold moved
  during a diversity would stop the worker, a stop the user did not
  press, and a download would wait in the worker's queue shown as a
  write.

What could go wrong: the PCA's Run and the diversity's Run pressed in
two tabs within the quiet second; Run starts its analysis at once when
nothing runs, so the PCA about to start waits after the diversity, the
spec's choice, and deliverable 2 has the case. A PCA tried again after a
failure, while the diversity is live, could hold the diversity back if
`holderOf` keeps any rule of the old one; deliverable 2 has the PCA
refused, crashed and locked. In the measurements, WebKit's memory
after the Stop or the end of the PCA falls slowly over 40 s and more;
the bound is read at the diversity's peak, not after it, and a Stop
pressed before the PCA's memory has grown measures nothing, hence the
3.7 GB the first case asks at the Stop.

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

## Work package 3: the box Individuals greyed while the diversity runs

What it gives, on `popgen2.html`: while the diversity runs, the list of
the column, the zone of the individuals file, its Remove and the three
lists of how a text file is read are greyed with their reason, and a
file dropped or pasted on the zone opens nothing; while the PCA runs,
the box Individuals stays open, as now. With another analysis live, the
reasons name Stop all. The lock of the
filters and the download's wait are package 1's (task 1.6).

Deliverables:

1. The words of the lock of the populations, with and without an
   analysis waiting, under `PT3 D1` in the tests of
   `src/ui/analyses/words.ts`. At least 2 tests.
2. The box Individuals, the Individuals tab and the zone in jsdom,
   under `PT3 D2`: greyed while the diversity runs and not while the PCA
   runs; the zone's greyed state takes no drop and no paste and shows the
   reason; `aria-disabled` and the description on each.
3. The flows under `PT3 D3` in `e2e/popgen2Populations.spec.ts`: "The
   lock" of the screen spec's "How it is checked", every check of it;
   the bullet of 11 October 2026 of `popgen2-input.md`'s "How it is
   checked"; axe in each, light and dark.
4. The flows that were there pass: `e2e/popgen2Input.spec.ts` and the
   old page's individuals flows.
5. The screen `popgen2-individuals-box-locked`, at 1280 and 320 px,
   light and dark.

Tasks:

- [ ] 3.1 The greyed box Individuals, the Individuals tab's lists, the
  greyed state of `FileZone.tsx` and the words of the lock of the
  populations (`popgen2-input.md`, "While the diversity runs"; the
  screen spec, "While the diversity runs"). Deliverables 1 to 5.

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
all whenever two or more analyses are live and one of them runs,
waits or is about to start; "Popnei" alone while nothing does; the link to the warnings or the error
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
  stops met, if any; the correction of the design's choice 8 to the
  owner's answer of 9 October 2026, "None" giving the one population,
  and the name "Unclassified" of the one population, both decided by
  the session; the measurements of 1.5 and 1.6; what the review
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
  two pages, the lock and the download's wait for any analysis),
  `react`, `accessibility` (the tab's Run, Stop and Stop recalculating,
  where the focus goes, the locks as text), `ux`, `browser`, `bundle`
  (the tab's code loaded apart, the first load unchanged), with its
  screenshots of the tab ready, running and done;
- 2: `api`, `react`, `accessibility`, `ux`, `browser` (the menus of the
  histograms, the status region in WebKit), with its screenshots;
- 3: `api`, `architecture` (what the lock covers, a drop refused by a
  widget of every page), `react`, `accessibility`, `ux`, `browser` (a
  drop and a paste on a greyed zone in WebKit), with its screenshots;
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

### Before the first task, 11 October 2026

At 12991743: typecheck, lint and format clean; Vitest 163 files, 5,207
tests; no test named `PT` and a digit (`npx vitest list`, `npx
playwright test --list`); the flows of `popgen2.html`,
`e2e/popgen2*.spec.ts`, 344 passed in Chromium and WebKit.

### Work package 1, 11 October 2026

Commits fe11d7ac, 620e0846 (1.1), e6edc9d8 (the definition in
`POPGEN2_ANALYSES`, applied by the session with the owner's leave after
the permission check refused the subagent's `git apply`), f5ab6f5c
(1.2), 888981c4, 27b4d481, b0400d26 (1.3, 1.4), e965f871, 07af2663
(1.6), 795cde76, 4c3387a5 (1.5).

The review, all eleven categories: 39 findings held, fixed in
6c911aa2 to 23393619 (steps A to E of the session's fix list), test
first; none was set aside. The ones a user would meet: a diversity
started by itself or stopped announced as the PCA's; a warning
naming a file no longer open, since the key lacked the cause and the
names its words read (the popgen2 key now holds them: such a change
calculates again); after a crash the waiting analysis started at once
in a tab at its limit (it now waits for the next change, with its own
words, "starts again after the next change"); the words of a failure
said "Stopped" though nobody pressed Stop; "Try again" never brought a
tab's code back after a shared file failed once, the PCA tab's too
(every file of a tab's code, and of the Variants tab's plots, is now
fetched before its import, from a manifest.json the build writes);
the lock's words naming a "Stop all" the band has not yet; a Run of a
done analysis answered "waiting"; the lock of the draw before that of
no individual kept; the F of the one population pooled with no
warning (now said for a file or a column the user opened); the old
page loading popgen2.html's code (6 KB). Also: the list of live
analyses in one place in core; `AnalysisDef.warnings` given the
individuals kept (an added argument, docs updated); one context for
the automatic runs; one component for code downloaded apart;
Playwright refusing a server it did not start; flows that fail with
the guard of one calculation at a time removed. A flow that failed
once under load (NU4 D3) was the test's: two sentences joined by the
announcer within its 100 ms; fixed in 1d42355f, 40 of 40 after.

The first load of `popgen2.html`: 327.48 KB in 12 files, against
321.62 KB in 9 before this package, by the sum of Vite's gzip sizes;
4.95 KB of it is code the page needs before the tab is shown (the
definition the store reads, the automatic runs, the fetching of a
tab's code), 0.9 KB the bundler's split. The Populations tab
downloads 7.79 KB when first shown after the Variants tab's plots.

Checks at 1d42355f: typecheck, lint, format clean; Vitest 169 files,
5,344 tests; in Chromium and WebKit every `e2e/popgen2*.spec.ts`, 382,
and `pcaResults`.

Task 1.5, taken again after the review (dfab1394, 8c7905e4), samples
81 to 98 ms apart: the diversity after a Stop on the PCA's peak and
after a PCA that ended held the bound (WebKit at most 3.60 and 3.79
GB). The case of two Stops did not: the PCA's Run, its Stop at 40 s,
its Run again; WebKit's second PCA reached 4.957 and 4.966 GB in two
runs, before the diversity started, the tab open in both; the
diversity then started at 3.5 GB. A stop of the plan, put to the
owner. The diversity's own increment could not be measured (0.1 s,
one or two samples); with the new worker it is at most 0.09 GB.

The owner chose on 11 October 2026, asked about the case of two
Stops: no change in this piece; the PCA run again within about a
minute of its Stop, at about 4.97 GB in WebKit, is recorded as a known
problem of the PCA in section 11 of `docs/architecture.md`, to be
measured on a Mac with less memory and in Safari, and settled as a
piece of its own.

### Work packages 2 and 3, 11 October 2026

Package 2, the tab whole: 3652071b, 7cea8c3a, b530af7f, f7e79158,
40de4666. Package 3, the box Individuals greyed while the diversity
runs: e9d238ce, 38e10041, 868180e6. A diversity that ends within the
status region's 100 ms pause is said by its end alone, as the PCA's
(the session's decision).

The review of both, all eleven categories: 31 findings held, fixed in
c5b5a76c to e9d1e84a (step A) and f221728e to 9cca2f50 (step B), test
first; none set aside. The ones a user would meet: a file chosen in a
picker opened before the lock still reached the page and stopped the
running diversity; a file dropped outside a zone, on both pages and
older than this plan, replaced the page with the user's files and
results; after a crash, a Run pressed for the waiting analysis never
started and nothing said so (the held analysis now offers Run, and the
status region says it did not start); the lock of the populations told
the user to stop the PCA, which reads no populations; Stop all named a
Run no tab showed; the Stop line said "Run calculates it" with no Run
on the screen (now "After the next change, Run…", both tabs); the
diversity's lines spoke of the filters where the populations changed
too; a refused file was not named; a refusal's words could come back
at the next lock; a round's PCA ending within the pause swallowed the
diversity's start; two populations named alike but for case gave two
files the system saves as one name plus " (1)"; Tab left a Download
menu open. The quiet second's line is now true after a Stop as after a
change, for the PCA too: "The PCA starts in a moment, later if the
filters or its options change." The status region's bare "0.05" after
a threshold moved (a rule of popgen2-filters.md of 8 October) now
says "This filter removes some variants of the plot." Not changed:
the tab's code importing five things the page loads first (no chunk of
its own would save bytes).

Checks at 9cca2f50: typecheck, lint, format clean; Vitest 173 files,
5,413 tests; Chromium and WebKit, every e2e/popgen2*.spec.ts and the
old page's variants, individuals and openVariants, none flaky. First
load: popgen2.html 331.22 KB, popgen.html 376.12 KB (sum of Vite's
gzip sizes, the HTML included).

The second review of the fixes of packages 2 and 3 (`architecture`,
`accessibility`): the accessibility reviewer found nothing; three
findings of the architecture reviewer held, fixed in c191348e (a text
or a folder refused with a sentence with no name), eeac958f (a Run
that waited and was then held by a crash announced at the next change
as that Run's start) and 6a642a1c (the end of a run's words per live
analysis, from `LIVE_SAID`). Checks at 6a642a1c: Vitest 173 files,
5,434 tests; Chromium and WebKit, `popgen2Populations`, `popgen2Live`,
`popgen2Input`, `popgen2BandLive`, 166.

### Work package 4, 11 and 12 October 2026

Commits 68769c2f (the band spec's words follow the tabs', no "again"
for an analysis about to start or held after a crash), 8b2d7298 (the
band with two analyses, Stop all, `STOP_ALL_OFFERED` on), 8dd80199 (the
tooltip 16 px from each edge at 320 px), 838b8393 (the flows,
`e2e/popgen2BandLive.spec.ts`), 8c3b1703 (the screens), 117c861f.
Checks at 117c861f: Vitest 173 files, 5,432 tests; Chromium and
WebKit, every `e2e/popgen2*.spec.ts`, 416.

The plan's stop at 320 px was met: with the PCA live and the
diversity about to start alone, another tab shown, the band's line
("Popnei", "Diversity soon", the whole "Stop recalculating", "Stop
all") needs 290 px of 288, in Chromium 153 and WebKit 26.6; "Diversity
soon" is cut away and Stop all runs 2 px past the edge (screen
`popgen2-band-diversity-soon-320-*`; its flow marked as expected to
fail). The owner chose on 12 October 2026: (a), on a narrow screen the
band shows in that case "Stop all" alone, without the diversity's
"Stop recalculating", which the Populations tab always offers.

Choice (a) built in fc4770cf (the spec) and 590caf53: under 30 rem,
when Stop all is shown, an analysis about to start loses its "Stop
recalculating" in the band, hidden from the screen, the Tab order and
a screen reader; a Stop of an analysis that runs stays. The line now
uses 238 px of 288 in Chromium and WebKit; its flow passes in both.
Checks at 590caf53: typecheck, lint, format clean; Vitest 173 files,
5,434 tests; Chromium and WebKit, `popgen2BandLive`, `popgen2Band`,
`popgen2Populations`, `popgen2Live`, 128; the screens of the band, 56.

The review of package 4, 12 October 2026, ten categories (`spec`,
`tests`, `stale`, `errors`, `api`, `react`, `accessibility`, `ux`,
`browser`, `bundle`) over 68769c2f^..590caf53: 22 findings held, one
set aside, one put to the owner. The ones a user would meet: when the
PCA ended with the keyboard on the band's "Stop the PCA", the same
button became "Stop the diversity", so Enter stopped an analysis the
user had not chosen (Chromium and WebKit); after a crash held the
diversity, a Run of the PCA made the band say "then the diversity" and
the tab that it starts once the PCA ends, and it never started; after
the band's Stop of the PCA, "Stopping the PCA…" with no button while
the diversity was about to start; at 320 px "Diversity · 0:12" with
Stop and Stop all lost its clock (296 px of 288); from 480 to about 640
px the band cut its own words beside both buttons; at 200% text Stop
all went up to 109 px past the window; a focused button hidden by a
narrowing of the window left the focus on nothing; the refusal of a
folder or a text on the waiting individuals zone named a file never
opened. Also: a third live analysis would have compiled and thrown in
the band; the words of a band without Stop all, dead since
`STOP_ALL_OFFERED` was true, removed. Set aside: "press Stop all beside
the heading Popnei" was said to lean on position; it names the
heading, which a screen reader reaches by name (WCAG 1.3.3 asks that
instructions not rely on position alone). Put to the owner: a
spectrum's MAF warning is not among the result's warnings, so the band
never links to it; the spec records it as open. The errors reviewer
settled a doubt: a crash that does not speak of the memory (a PCA of
fewer than 2,264 individuals) leaves the PCA live and the waiting
diversity starts at once; a crash that ends a live state holds the
others; both as `popgen2-pca.md` says. Bundle: the first load of
`popgen2.html` 331.72 KB, 0.50 KB more, all the band's code.
`e2e/popgen2Band.spec.ts` was not untouched, as deliverable 3 said:
8b2d7298 removed "again" in three of its strings.

The fixes, first round, e0e90dc6..4772039b, test first: b2542a24 (held
after a crash said as held), b11b3568 (the Stop keyed by what it stops;
the band's narrow form decided in one place, `src/ui/band/narrow.ts`,
and a button it leaves out not drawn, so the focus goes to "Popnei"),
ee0d2389 (another analysis about to start wins over a Stop under way),
ab710eb2, f8762ea9, 3bdae585, b2fa8578, 4772039b. Checks at 4772039b:
Vitest 173 files, 5,433 tests; Chromium and WebKit, `popgen2BandLive`,
`popgen2Band`, `popgen2Live`, `popgen2Populations`, 134.

The fixes, second round, ae6a9453..f0d6f6ec, test first: tests of
the band after Stop all and of the diversity held after a crash; axe on
the diversity about to start at 320 and 1280 px, with the clock
running (axe does not finish under a paused clock); a folder, a text or
several files on the waiting individuals zone get their usual words;
the spec lists every short form and the spectrum's warning as an open
point; five new screens of the band. The layout, measured for every
line at every width from 320 to 1280 px in steps of 10 px, the same in
Chromium and WebKit: no breakpoint and padding put every line on one
line (the four lines under the download needed 753 to 831 px of 736).
The session decided: the band says "The diversity starts after the
download" (the tabs keep "… again when the download is written or
closed"); the band is narrow under 44 em (704 px) in place of 30 em,
where the widest whole line takes 660 px of 672; there its buttons
have 4 px of side padding in place of 12, so "Diversity · 59:59" with
Stop and Stop all takes 282 px of 288 at 320 px; and the line wraps,
its buttons on a second row, when it still cannot fit (a run over an
hour at 320 px, 294 px; 200% text, three rows inside the window).
Checks at f0d6f6ec: typecheck, lint, format clean; Vitest 174 files,
5,439 tests; Chromium and WebKit, `popgen2BandLive`, `popgen2Band`,
`popgen2Live`, `popgen2Populations`, `popgen2Input`, 214; the screens
of the band, 76. The 200% text flow failed once in 86 runs on a
sideways scroll while the plots redrew, fixed in f0d6f6ec by waiting
for the page to settle. In WebKit 200% text is emulated on the page.

The second review, of the fixes (`react`, `accessibility`,
`browser`), 12 October 2026: the accessibility reviewer found nothing;
five findings held, fixed in 3aeedd80 to 5f887a96, test first: a long
file name had its percentage cut and the band three rows tall (113 px
in place of 51) at every wide width, so the page moved 62 px when a
file opened and when its pass ended, both made by the wrap of
ef5e6889 (now only the name is cut, on the heading's row); at 200%
text, scrolled down, a start or end of an analysis moved what the user
read by 102 to 120 px (now 0); a scrollbar that takes room would have
wrapped the widest line at 704 to 718 px (the band is now narrow under
45 em, 720 px); a Stop recalculating that became the Stop of the same
analysis sent the focus to "Popnei" (it now keeps it); the band's link
keyed by its analysis, a guard with no test, since no sequence reaches
it. Left as it is: "Diversity later" with Stop recalculating, the
diversity alone live and waiting for the download or after a crash,
needs 288.4 px of 288 at 320 px and takes a second row, its words
whole. Checks at 5f887a96: typecheck, lint, format clean; Vitest 174
files, 5,440 tests; Chromium and WebKit, `popgen2BandLive`,
`popgen2Band`, `popgen2Live`, `popgen2Populations`, `popgen2Input`,
220; the band's screens, 76. Seen outside the scope, for package 6:
at 200% text and 320 px "Open another variants file…" is 124 px wide,
a word per line (Chromium); the missing-genotypes slider's focus ring
is cut at 320 px in both browsers; at 568 by 320 px with 200% text the
band takes 161 px of 320.

### Work package 5, 12 October 2026

5.1, by the session: `.claude/skills/coding/react.md` (several live
analyses, `POPGEN2_LIVE`, the analysis held after a crash, a Stop keyed
by what it does, a narrow control not drawn), `testing.md` (axe does
not finish under a paused page clock), `css.md` (a line fixed at the
top wraps rather than cuts) in f2aada4b, eb1fc847 and the commit of
this entry. 5.2, by a subagent: d4c379ce to f5db3e65 and bd808e18,
`docs/architecture.md` (sections 3, 4, 5, 7, 9, 11), `functionality.md`
(revised after a first-reader: what holds first, the six cases in which
a live analysis does not start), `technology.md`, the status line of
each spec; the samples of NU4 D6 were 320 to 340 ms apart (250 ms of
wait and 70 to 90 ms per sample), not "every 250 ms".

The stale review of the documents, 12 October 2026: five findings
held, fixed in a3bad67c to c0958019 (the documents) and ac2cf99c,
2e82faee (the skills): the download still said it waited for the PCA
alone; the band's height and longest line at 320 px; 2.4 s in Chromium
and 2.5 s in WebKit for the diversity of the VCF of 403 MB; section 12
named the PCA alone; three skills limited the lock and the start by
itself to the PCA, the stale checklist among them; "rem" for a query
written in em.

### Work package 6, 12 October 2026

6.1: the session read the screens of packages 2 to 4, taken again at
2e82faee (464 screens of `popgen2.html`, all passed), in sheets: the
Populations tab in its 13 states at 1280 px light and at 320 px dark,
the band in its 38 states at 320 px in both themes, the box
Individuals greyed and its tooltips. Every state of the screen spec,
the band spec's new rows and the greyed box is there and readable;
nothing cut or overlapping. At 320 px the tooltip of "Open another
individuals file…" covers Remove while it shows; it closes with Escape
or when the pointer or the focus moves on (WCAG 1.4.13), so it is left
as it is; 8dd80199's "no longer covers Remove" holds for the tooltips
of the column list and of Remove only.

6.2, at 2e82faee: typecheck, lint, format clean; Vitest 174 files,
5,440 tests; the browser suite, every spec file but `measure` and
`screens`, 48 files, in Chromium and WebKit, in four chunks: 426, 424,
424 and 424 passed, 1,698 of 1,698, none retried. The first load of
`popgen2.html`: 331.93 KB (sum of Vite's gzip sizes, the HTML
included), against 321.62 KB before the piece.

The `browser` review of the whole branch (main...58de88cb): no
findings; every API, CSS feature and syntax the branch adds is within
the floor, range media queries exactly at it (Safari 16.4); the
keyboard opens the file picker from the zone's own input in both
engines; no request leaves the site's origin. Seen, not fixed here: a
link dragged onto the page, which carries no "Files", is let through by
the window's listener and the browser may load it in place of the page,
as before this piece; under `vite preview` (no-cache) each file of a
tab's code is requested twice, once by the fetch and once by the
import, and on GitHub Pages (max-age=600) the second should come from
the cache, not measured.

6.3: the report to the owner, in chat.

Left: package 7, the owner's try.
