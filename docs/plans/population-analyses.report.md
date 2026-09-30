# Report: the analyses of the populations

The work report of the plan `docs/plans/population-analyses.md`, stage 5
of `docs/build-order.md`, carried out from 30 September 2026 on the
branch `plan/population-analyses`, which is not merged and not pushed.

## Where the plan stands

Under way, from 30 September 2026.

### Words the report uses

- **The open-points file** is `docs/specs/stage-5-open-points.md`, where
  every decision you took on stage 5 is written with the option not
  taken.
- **A tag** such as `PA5 D2` starts the name of a test: `PA` for this
  plan, the number of the work package, and `D` with the number of its
  deliverable; a count of tests of a tag is what checks that deliverable.
- **The orchestrator** is the session that runs the plan and writes this
  report; **a writer** or **a fixer** is a session it sends to write a
  task's code or its fixes; **a reviewer** is a session that reads or
  runs the code afresh, one for each kind of problem, as the report of
  stage 4 lists them.
- **The browser check** is the plan's: the build of the test pages and
  every Playwright flow in Chromium and WebKit. Firefox does not launch
  on this Mac.
- **The probe** is the test page of stage 1 that checks popnei's wasm in
  each browser.

## Before the first task

The branch `plan/population-analyses` was made from `main` at efa215c,
called the start below, in the worktree
`.claude/worktrees/population-analyses`. On the start, on 30 September
2026, on this Mac, after `npm ci`:

- `grep -rlzE "not yet[[:space:]]+(reviewed nor[[:space:]]+)?approved"
  docs/specs` prints nothing; `git ls-tree -r --name-only main
  docs/plans/population-analyses.md docs/specs/analyses/popDists.md`
  prints both paths.
- node v26.8.2, npm 11.19.1; Playwright 1.63.0.
- `npm pkg get dependencies.popnei` prints the URL of `js-v0.1.0-dev.3`.
  popnei issues #4 and #5 are open.
- `npm ls d3-scale d3-shape` prints 4.0.2 and 3.2.0.
- `format:check`, `typecheck` and `lint` exit 0; `npm test` gives "Test
  Files 79 passed (79)", "Tests 2968 passed (2968)".
- `POPNEI_TEST_PAGES=1 npm run build` exits 0: `popgen-*.js` 766.90 kB,
  229.89 kB gzipped; popnei's wasm 2,389.51 kB, 785.16 kB gzipped, as
  Vite counts them.
- The browser check gives "1 failed", "1037 passed (3.5m)". The flow
  that failed, in Chromium, is `IP10 D3 the keyboard moves through the
  table cell by cell` of `e2e/pcaResults.spec.ts`: it scrolls the box of
  the PCA's table to its end once and waits for it to have moved more
  than 500 pixels, and it had moved 11. Run alone 20 times, and 20 times
  with 8 at once, it passed 40 times out of 40. It is a test that
  scrolls before the box has grown, under the load of the whole check,
  and not a defect of the screen. Task 0.1, added to the plan, makes it
  scroll inside its wait.
- `--project=screens --list` lists 308 tests, the two measurement
  projects 44.

## 1. The populations shared by the three analyses

Done as planned, in cc42122 (task 1.1), 318e555 (task 1.2) and e74247d
(the fixes of the review). Nothing a user sees changed.

### The deliverables, on e74247d, checked on 472b089

1. `npx vitest run src/core/project.test.ts -t "PA1 D1"`: 10 passed
   after the tasks, 4 cases moved from `diversity.test.ts` and 6 new,
   where the plan asks for at least 5 more than the moved; `npx vitest
   run src/core -t "PA1 D"` gives 18 after the review's fixes. The grep
   of the four exports of `project.ts` gives 4.
2. `npx vitest run src/core -t "PA1 D2"`: 6 passed.
3. On a copy of 472b089: `npm test` "Test Files 81 passed (81)",
   "Tests 3065 passed (3065)"; the browser check "1044 passed (3.9m)".
   The lines of old tests that changed are the 4 cases of the locks of
   the diversity, moved from `diversity.test.ts` to `project.test.ts`
   with their literals; one test added to `diversity.test.ts`, that the
   diversity gives the reason of `populationListsNeeds`; and task 0.1's
   two flows of the PCA's table.

### The review

Six reviewers (`spec`, `tests`, `stale`, `errors`, `api`,
`architecture`); none found a wrong or a stale result, and the words of
the diversity are those of stage 4. Fixed in e74247d:

- The column of the populations was worked out in three places, with
  three answers for a project of association (three reviewers). It is
  one function of `project.ts` now.
- One rule for a project of association, stated and tested: the locks
  give none, the warnings call it a defect.
- The comment of `populationWarnings` says the distances pass their
  populations left out for their size as well, with a test of what
  happens when they do.
- Four tests the tests reviewer found missing: 5 lines it broke passed
  every test, and each now fails one. One branch it thought maybe
  unreachable is reached by a variants file whose individuals have no
  population, and has its test.

Not taken: a cache on the individuals with no population, which three
analyses now read; the spec asks for none, and the table is read once
per result. Left to you: points 2 and 3 below.

### How the work of 1 went, for whoever revises a skill or a plan

Two writers of about 140,000 and 95,000 tokens; the six reviewers about
390,000 together, the fixes 165,000. The review cost more than the work,
and found no wrong result: for a move of code with nothing a user sees,
four reviewers would have been enough, `architecture` and `tests`
among them, which found what mattered.

## 2. The LD decay in the worker and core, and its memory in the browsers

Done as planned, in 2cdbaa8 (task 2.1), a897734 (task 2.2), aefe43c
(task 2.3), 43720d1 (task 2.4), 3f6d837 (the fixes of the review),
0e90df9 and 380cd0b (task 2.5). The LD decay is in the list of analyses
with a panel that is its Run button alone, which task 8.1 replaces.

### The deliverables

1. `npx vitest run src/worker/messages.test.ts -t "PA2 D1"`: 27 passed,
   at least 5 asked; `PROTOCOL_VERSION = 4`.
2. `npx vitest run src/worker -t "PA2 D2"`: 12 passed after the fixes, at
   least 4 asked; the numbers of `ld.nei` to the last digit, and a job of
   populations of 30 and 70 at other options.
3. `ld.vcf.gz` 20,505 bytes, `ld.nei` 68,354, `ld_pops.csv` 50 and 50;
   the other fixtures unchanged by the script.
4. `npx vitest run src/worker/client.test.ts -t "PA2 D4"`: 9 passed, at
   least 5 asked.
5. `npx vitest run src/core -t "PA2 D5"`: 70 passed, at least 35 asked.
6. `npx vitest run src/core/analyses/ldDecay.test.ts -t "PA2 D6"`: 10
   passed, at least 8 asked; a `keyInputs` given the LD pruning failed 3
   of them.
7. `npx playwright test --project=measure-chromium
   --project=measure-webkit -g "PA2 D7" --workers=1`: 6 passed, in 1.4
   hours. The tables below.

### The measurements, PA2 D7

Chromium 153.0.8010.12 and WebKit 26.6, Playwright 1.63.0, on this Mac,
an Apple M5 Pro with 64 GB, macOS 27.0.1, on 30 September 2026. The load
of the machine is given, since reviewers ran tests beside part 1: its
times are high, and its memory does not depend on the load.

Part 1: 1,000 individuals, 20,000 variants a variant every 1,000 bp,
three populations, five runs each; load 9.7 to 22.6. "At the answer" is
what the tab would keep without the restart; "after" is 3 s after it.

| distance | engine | run | grew by | at the answer | after the restart |
|---|---|---|---|---|---|
| 100,000 bp | Chromium | 3.4 to 3.9 s | 0.40 GB | 0.55 GB | 0.15 GB |
| 100,000 bp | WebKit | 7.9 to 8.4 s | 0.43 to 0.53 GB | 0.73 GB | 0.20 to 0.21 GB |
| 1,000,000 bp | Chromium | 12.5 to 19.9 s | 0.44 to 0.45 GB | 0.59 GB | 0.14 to 0.15 GB |
| 1,000,000 bp | WebKit | 19.1 to 19.6 s | 0.49 to 0.59 GB | 0.78 GB | 0.20 to 0.22 GB |

Part 2, at the lock: 100 individuals, 20,000 variants at positions
drawn at random over 26 Mb; load 9.6 to 12.8. The tab held in every
case. "Fit" is the time after the pass, which tells no progress.

| case | Chromium: run, peak, fit | WebKit: run, peak, fit |
|---|---|---|
| one population, 25,000,000 bp | 34.4 s, 1.26 GB, 10.8 s | 30.9 s, 1.44 GB, 8.7 s |
| three populations, 8,333,333 bp | 28.2 s, 0.96 GB, 10.3 s | 32.0 s, 1.13 GB, 11.4 s |

Part 3, the dense file: 1,000 individuals, a variant every 100 bp,
three populations; load 3.1 to 14.8.

| distance | Chromium: run, peak | WebKit: run, peak |
|---|---|---|
| 2,000,000 bp | 222 s, 1.34 GB | 219 s, 1.55 GB |
| 4,000,000 bp | 857 s, 2.42 GB | 594 s, 2.63 GB |
| 8,333,333 bp | refused for memory after 1,475 s, 4.05 GB | refused for memory after 1,127 s, 4.28 GB |

No tab closed, so the lock was kept and the numbers went into
`ldDecay.md`, `client.md` and the architecture (380cd0b). What the dense
file shows is point 19 below.

### The review

Six reviewers of tasks 2.1 to 2.4; none found a wrong or a stale result,
and no answer of an ended worker reaches the page. Fixed in 3f6d837:

- The runner's test used two populations of 50 at popnei's defaults, so
  a runner that gave one population's numbers to the other, or dropped
  the user's options, passed; 11 such breaks now fail, with a job of 30
  and 70 at other options.
- The core tests read the first population and the first bin only; the
  script's lines were tested at the defaults; seven boundaries were not
  tested on both sides.
- The reason of the empty distance, which the spec shows beside its
  field, has a function the panel can call.
- The list of warnings of every panel told its items apart by their
  code, and the LD decay gives several of one code; now by place too.
- A crash of a diversity gives its failure before the worker is ended,
  tested; an LD decay joins the randomised test of the client.

Put to you: points 5 to 8. The shared function of the lists of
individuals, which the review asked for, went into task 6.7.

### How the work of 2 went, for whoever revises a skill or a plan

Four writers of about 220,000, 90,000, 255,000 and 45,000 tokens, the
fixes 350,000; the six reviewers about 750,000; the measurements 265,000
and 1.4 hours of the machine, the dense file most of it. Running the
reviewers of other work packages beside the measurement doubled the
load and made part 1's times unfit for the spec; a measurement of time
wants the machine to itself, and the plan's "alone in the tree" should
say "alone on the machine".

## 3. The distances between populations, in the worker and core

Done as planned, in 019a180 (task 3.1), bd45140 (task 3.2), 7b1d928
(task 3.3) and bbe5ddf (the fixes of the review). No screen shows the
distances yet; work package 5 builds their panel.

### The deliverables, on bbe5ddf

1. `npx vitest run src/worker/messages.test.ts -t "PA3 D1"`: 21 passed,
   where the plan asks at least 5.
2. `npx vitest run src/worker -t "PA3 D2"`: 18 passed after the fixes,
   at least 6 asked. Every Fst, D, count of variants and order of
   `popDists.md` matched popnei to the last digit, the names "3", "1"
   and "2" held pair by pair among them.
3. `e2e/fixtures/panel_split.csv`: header `IID,popsplit`, 200 rows, 24
   of `p0a` and 24 of `p0b`.
4. `npx vitest run src/core -t "PA3 D4"`: 65 passed, at least 30 asked.
5. `npx vitest run src/core/analyses/popDists.test.ts -t "PA3 D5"`: 19
   passed, at least 14 asked; a `keyInputs` given the measure failed 2
   of them.

On a copy of bbe5ddf: format, types and lint pass; `npm test` "Tests
3355 passed (3355)"; the browser check "1050 passed (4.5m)"; the page's
first script 232.14 kB gzipped, against 229.89 kB on the start.

The refusal of popnei's PCoA, which the spec calls `notPlaced`, is
reached by no real matrix; a test file stands in for popnei and gives
the runner made matrices, and the errors reviewer ran popnei's own PCoA
on an infinite, a huge and a tiny distance and saw each refused as the
application expects.

### The review

Six reviewers; none found a wrong or a stale result, and a population
named `__proto__` works in the distances. Fixed in bbe5ddf:

- Two rules of the runner that no test guarded: the count of variants
  of each pair given to the right two populations, and a tie of the
  PCoA broken by the order of the file, which popnei does give, on the
  distances 0.3, 0.3 and 0.
- Two branches of the warnings without a test: the owner's rule of
  shares at 1%, and the advice to loosen the filters when they emptied
  a population among several.
- Two values that stood in for a case the code rules out, now defects;
  a comment that called names places.
- One writing of four decimals for the whole application, a value that
  rounds to zero written "0.0000" as the PCA writes it, and one type
  for the two measures.

Put to you: points 10, 11 and 12 below. Gathered into task 6.7, added
to the plan: the small rules the three analyses wrote each for itself.

### How the work of 3 went, for whoever revises a skill or a plan

Three writers, of about 260,000, 240,000 and 45,000 tokens, the fixes
300,000; six reviewers about 690,000. The tests reviewer found both
runner defects by breaking lines, as in work package 2, where the
fixture's populations were alike: a skill of testing could ask for
fixtures whose populations differ in every number a test reads.

## 4. The three plots

Done, in 547a0f8 (4.1), 472b089 (4.2), 755b53e (4.4), afebfd6 (4.3),
4ab9175 and 9659446 (the fixes of the review). The plots are on the
test page of plots alone; the panels mount them in work packages 5, 7
and 8.

### The deliverables

1. `npx vitest run src/charts -t "PA4 D1"`: 7 passed, at least 5 asked;
   the tests of the scatter, the histogram and the base of stage 4 with
   added lines only; the greps give 2 and 2.
2. `-t "PA4 D2"`: 25 passed, at least 15.
3. `-g "PA4 D3"`: 6 passed, 3 in each engine, at least 4.
4. `-t "PA4 D4"`: 17 passed, at least 12.
5. `-g "PA4 D5"`: 6 passed, 3 in each engine, at least 6; with the flows
   the review added, 16 of the plots in all.
6. `-t "PA4 D6"`: 10 passed, at least 5; the spec's axis of 0 to 0.07 is
   0 to 0.065 by its own rule (point 1).

On a copy of 4ab9175: `npm test` "Tests 3391 passed (3391)"; Chromium's
flows passed, and WebKit's failed 7 times with "Target page, context or
browser has been closed", the browser's own process ended under the
load of other runs; run alone on the same copy, "527 passed (5.0m)". On
9659446 in the tree the writer's check gave "1054 passed (6.4m)".

### The review

Seven reviewers (`spec`, `tests`, `stale`, `errors`, `api`,
`accessibility`, `browser`). The stale reviewer drew 300 random updates
of each plot against a fresh drawing and found them alike. Fixed:

- Nine changes that move what the user sees passed every test: a value
  off the centre of its cell, the legend's numbers off the ends of its
  bar, the numbers under the axis of every existing plot moved onto the
  ticks, the line plot's legend off its lines, a tooltip left stuck when
  the pointer leaves; each now fails a flow or a test.
- The line plot now refuses two series drawn alike; eight values that
  stood for impossible cases are defects; a line through a point too
  far to draw no longer breaks the rest of it.
- The contrast of the heatmap's numbers on every colour of its scale is
  tested, since it clears 4.5:1 by 0.1 at its worst step.
- The values centred by an offset of the text, as every other text of
  the plots, since other programs may ignore the CSS property in the
  exported file.

Put to you: points 1, 4, 5, 13, 14, 21 and 22, and the right margin of
the heatmap's names. For stage 6: the export still writes
`dominant-baseline: auto` on each element, as `charts.md` lists it.

### How the work of 4 went, for whoever revises a skill or a plan

Four writers of about 150,000, 295,000, 135,000 and 310,000 tokens, the
fixes 360,000; seven reviewers about 850,000. The tests reviewer broke
the plots' code 88 times and found nine breaks of what a user sees that
no test caught, as the reviewer of stage 3 found 19 of 88: a plot's
flows should assert where its texts and marks stand, not only that they
exist. Seven reviewers, three writers and the orchestrator's checks at
once clogged the Mac and closed WebKit (the standing rules, "The load
of the machine").

## 6. The whole diversity, in the worker and core, with the spectrum

Done, in 88a023d (6.1), e72665f (6.2), d8a328c (6.5), 994bbf9 (6.3),
11e4ad1 and 12e3430 (6.6), 5094f19 (6.4), cc69bfa (6.7, added),
0d4e198 (a flow of stage 2 at eleven columns), 7288504 and da08cb1 (the
fixes of the review). The diversity's panel still shows its five
columns; work package 7 builds the eleven and the spectrum's block.

### The deliverables, checked on 380cd0b

1. `-t "PA6 D1"` in `messages.test.ts`: 17 passed, at least 6 asked.
2. `-t "PA6 D2"` in `src/worker`: 16 passed after the fixes, at least 10.
3. `-t "PA6 D3"` in `src/core`: 31 passed, at least 15.
4. `-t "PA6 D4"` in `src/core`: 14 passed, at least 10.
5. `-t "PA6 D5"` in `src/core`: 4 passed, at least 4; a project file of
   stage 4 is still compared under key version 3.
6. `-t "PA6 D6"` in `src/core`: 14 passed, at least 8.
7. `-t "PA6 D7"`: 2 in `projectFile.test.ts` and 1 in `project.test.ts`.
8. On a copy of 380cd0b: `npm test` "Tests 3386 passed (3386)"; the
   browser check "1050 passed (3.3m)"; the first script 236.54 kB
   gzipped. The old tests changed where the types of the job and the
   result demanded (`noPopDiversity` in `testSupport.ts`), where the key
   version rose, where `tooFewIndividuals` gained "or lower the minimum
   number of individuals in the options of the diversity" (10 texts),
   where a single population at the minimum now gets
   `privateAllelesNeedTwoPopulations` (10 expectations), and the CSV
   flow of stage 2, now of eleven columns, each value checked against
   popnei; the five first columns did not change.

Changed in the plan: task 6.7, added from the reviews of work packages
2 and 3, gathered four small rules the analyses wrote each for itself.

### The review

Six reviewers; none found a wrong or a stale result. The spec reviewer
reproduced every number of the diversity and the spectrum with popnei
in node and in its Python, to the last digit. Fixed:

- Every runner test used a draw of twice the minimum, where every
  population reaches the draw, so a count read from the wrong field,
  the minimum fixed at 20, or an odd draw that fails would all pass;
  each now fails, with runs at a draw of 130, 41 and 96 and a minimum
  of 46.
- In the fixtures p0 and p1 had the same private alleles, so a swap of
  the two passed; a result whose populations all differ now guards it.
- The panel of work package 7 gets the default draw from a function of
  core, rather than writing its rule again.
- Two places still called the diversity one pass: a measurement's title
  and a sentence of the architecture.
- A doc comment above the wrong function; rules written twice; a
  property test that timed out under load.

Not taken: the least draw, 2, is still written in core and in the
worker, since core may import only the worker's types. Put to you:
points 15 to 18 and 20.

### How the work of 6 went, for whoever revises a skill or a plan

Seven writers' tasks, about 1.5 million tokens with the fixes; six
reviewers about 760,000. Tasks 6.3, 6.4 and 6.7 went to one writer in
turn, who knew the diversity by then; each round cost it less than a
fresh writer's reading. A flow of stage 2 that 6.3 changed was found
only by the orchestrator's whole check: a writer that is told not to
run Playwright should be told which flows its change reaches.

## 5. The panel of the distances

Built and reviewed, in f2e523a (5.1), a704da2 (5.2), 026109f, 2f03149
and 73b2b02 (5.3), 2994fbd (5.4), and e8d2535, 6337523 and 8de5d4f
(the fixes of the review, in two passes). It waits for your word at
stop A, below.

### The deliverables, on 8de5d4f

1. `npx vitest run src/core src/ui -t "PA5 D1"`: 57 passed, at least 20
   asked.
2. The flows of `e2e/popDists.spec.ts`, 12 in each engine with those the
   review added (`--list` gives 24); the whole browser check with
   `--workers=4` "1078 passed", `npm test` "Tests 3458 passed (3458)".
3. The time of the distances, `PA5 D3`, median of 5 runs from Run to
   the answer, Chromium 153.0.8010.12 and WebKit 26.6 on this Mac, load
   3 to 5: `panel.nei` with 3 populations 17 and 14 ms, with 20 of 10
   individuals 17 and 19 ms; the 19 MB file with 3 populations 118 and
   118 ms, with 20 of 50 individuals 155 and 144 ms. In `popDists.md`,
   "How it runs" (73b2b02). At 200 populations, in Chromium: 857 ms
   from Run to the table on the screen, with 19,900 rows in the page;
   a change of the measure no longer draws the table again.
4. What the field of the minimum announces, `PA5 D4`: 2 passed, one in
   each engine; it does not gather the digits of several edits, as
   stage 4 saw; on the first edit of a page it holds "151" for "15"
   and a late "1".
5. The screenshots of the panel, light and dark, 16 states in
   `screens/popgen-popdists-*`, the four the review asked for among
   them; the orchestrator looked at the done state, at 320 pixels, at
   200 populations, at a pair with no value and at Jost's D in a
   haploid file.

### The review

Nine reviewers, then `react` and `accessibility` again after the fixes.
No wrong number, and axe found no violation in 64 runs of every state
in both engines. Fixed:

- Changing the measure announced "Heatmap of Jost's D" in states with
  no heatmap, the locked, the ready, and above 200 populations.
- The downloaded CSV could hold truncated numbers with every test
  passing; the flow now compares it with the spec's lines.
- What Jost's D shows was tested only where both measures share one
  order; the heatmap's least width and its reach by keyboard were
  guarded only by the screenshots, which GitHub does not run; the
  focus kept on the measure was checked only in jsdom.
- A switch of the measure drew the 19,900 rows of 200 populations
  again (about 270 ms); a notice of another panel did too.
- The focus dropped to the page when a scrolling frame stopped
  scrolling, the heatmap's and every table's.
- At 320 pixels "p0 and p2" wrapped onto three lines; each name now
  stays whole and the table scrolls, with its line saying so.
- Shared words moved to the module every panel shares; the refusal of
  the minimum writes its numbers with commas; popnei's message when
  the order fails goes to the browser's console.

Not taken: a table that draws only the rows in view, for 200
populations, since the one such table of the application is a sortable
grid and the spec asks for a plain table; the page stays usable, at
857 ms on this Mac. The size of the 19 MB file in `popDists.md`,
19,161,178 bytes, is that of popnei's earlier release; its present
release writes 19,161,194.

### How the work of 5 went, for whoever revises a skill or a plan

Four writers' tasks, about 1.1 million tokens with the two rounds of
fixes; eleven reviewers' passes about 1.1 million. The reviews ran
three at a time from here, after the owner saw the machine clogged,
and cost more wall time and no more tokens.

## Stop A: the panel of the distances, for the owner

### How to try it

In a terminal, in the checkout made for this stop,
`/Users/jose/devel/popnei_web/.claude/worktrees/stop-a`, which holds
the branch at fe54787 and not the work that goes on meanwhile, run
`npm run dev` and open the address it prints, then the population
genetics application. Load `e2e/fixtures/panel.nei` in the Variants
step and `e2e/fixtures/panel_pops.csv` in the Individuals step, with
its column `popcat`; in the Analyses step, "Distances between
populations", Run. For the negative distance and a population under
the minimum, load `e2e/fixtures/panel_split.csv` with the column
`popsplit` and set the minimum at 25. Try it in Firefox and Safari by
hand too: the checks here ran Chromium and WebKit only.

### What to judge

- The panel as a whole: the options above Run (the minimum of 20 by
  default, the two measures), the heatmap in its order by similarity,
  the line of order, the table and its download, the words of each
  state.
- The writers' choices of the open-points file that it shows: the field
  of the minimum with its default of 20; the measure left out of the
  key, so that switching Fst and D calculates nothing; the panel after
  the diversity.
- The colours from 0 that you decided (point 15): on `panel.nei` the
  three pairs are three yellows alike.
- The meanwhile values of `heatmap.md`: 56 pixels under which a cell
  holds no value, and a width of 40rem.
- A screen reader: on the first edit of the field of the minimum in a
  page, it hears "15" and then a stray "1" (React Aria holds its first
  message back 100 ms); after that, only the number typed.

### Decisions, each with the recommendation

The points 4, 9, 10, 11, 13 and 21 above, and these from the review of
the panel:

A1. **The warning of negative distances** says "The heatmap orders them
    as if the distance were 0" also when the heatmap is not ordered by
    similarity (two populations, a pair with no value, all distances 0)
    and above 200 populations, where no heatmap is drawn, right over
    the line that says so. Recommendation: that clause only when the
    heatmap is drawn and ordered by similarity; otherwise "The heatmap
    shows the value", or nothing above 200.
A2. **A pair whose Fst has no value though it has variants.** popnei
    gives no Fst when both populations share one allele at every
    variant counted for them; the table then shows "no value" beside
    "12" variants, with no warning. Recommendation: a warning of its
    own, "p0 and p2 share one allele at every variant counted for them,
    so Hudson's Fst has no value (0/0)".
A3. **The words at a minimum of 0 or 1.** The warnings then read "fewer
    than 0 individuals with a called genotype". Recommendation: at a
    minimum of 0 or 1, "at which both have a called genotype".
A4. **The lock's advice.** It says "Lower the minimum of individuals
    below", while the field is above it and its label is "Individuals
    with a called genotype needed in each population, per variant".
    Recommendation: "Lower the number of individuals needed, above".
A5. **The ready state** reads "p0a and p0b have fewer individuals than
    the minimum of 25, 24 and 24, and are left out", which reads as
    three minimums. Recommendation: "p0a and p0b have 24 and 24
    individuals, fewer than the minimum of 25, and are left out"; the
    diversity shares it.
A6. **"20,100 of the 20,100 pairs are over fewer than…"**, when every
    pair is concerned, with "at the others" pointing at none.
    Recommendation: "All 20,100 pairs are over fewer than…", without
    the clause of the others.
A7. **A population whose name starts with "=", "+", "-" or "@"** is run
    as a formula by a spreadsheet that opens any of the application's
    CSVs. Recommendation: every CSV writes such a name with a quote
    before it, as spreadsheets advise; it concerns the downloads of
    every stage, and is a change of the shared writer.
A8. **The heatmap's least width**, a meanwhile choice of the writer: the
    names' margins and a grid of 128 pixels; below it the heatmap's box
    scrolls sideways, as the tables do, and is reached with Tab.
    Recommendation: keep it, and settle point 13 with it.
A9. **Two sentences of other specs.** `steps/variants.md` (about lines
    402-404) names the diversity and the PCA as what an empty distance
    of the LD pruning locks; the distances and the LD decay lock too.
    And the interface of `popDists.md` lacks `MEASURE_NAMES`,
    `PopDistsHeatmap` and `orderText` returning none for two
    populations. Recommendation: correct both.

## Stop B: the diversity and the spectrum, for the owner

### What to judge

- The panel of the diversity whole: the three fields (the minimum, the
  threshold of polymorphism, the draw of the rarefaction) with the line
  of the default draw and "Use the default"; the eleven columns with F
  sixth; the populations under the minimum named before a Run; the
  running state of two passes; the block of the spectrum under the
  table, one histogram per population on one scale, its table in a tab
  and its download.
- The writers' choices of the open-points file that it shows: no
  private alleles for one population, the check numbers as they were,
  eleven columns with F sixth, the lock of the draw, no warning of the
  MAF filter on the table, the warning of variants outside the draw
  from one variant, the words of F in a haploid file, the populations
  under the minimum named before a Run.
- Points 15, 16 and 17 above.

### Decisions, each with the recommendation

B1. **The table of eleven columns** is at least 1,187 pixels wide, wider
    than the page's column on any window, so it always scrolls
    sideways, and the rarefied private alleles, the column the draw is
    for, are not seen first. Recommendation: see it at stop B; a
    narrower table would need shorter headers or two tables.
B2. **"Use the default" and Run look alike**, one above the other.
    Recommendation: "Use the default" drawn as a link-like button beside
    the draw's line.
B3. **The lock of the draw** counts the chromosomes of every individual
    kept, 400 on `panel.nei`, so a draw from 169 to 400 passes it, runs
    both passes, and gives no rarefied value and no spectrum to any
    population, since the largest, p2, holds 168. Recommendation: the
    lock's "at most" the chromosomes of the largest population, and the
    ready state naming the populations whose chromosomes are fewer than
    the draw.
B4. **The warning of the MAF filter on the spectrum** stands above the
    diversity's table, about 500 pixels above the histograms.
    Recommendation: a sentence at the end of the block's caption.
B5. **Typing the default's own number**, 40 over the default 40, removes
    the table "because the number of chromosomes of the rarefaction
    changed" and runs both passes again, for the same numbers, as the
    spec asks (a typed draw no longer follows the minimum).
    Recommendation: keep the rule, and say in the notice that the draw
    is now typed.
B6. **What a screen reader hears of the spectrum.** Each histogram's
    description starts by repeating its title ("The spectrum of p0 The
    spectrum of p0: 1,200 variants…"), and the block has no heading, so
    moving by headings gives "Diversity, p0, p2, p1". Recommendation:
    the description begins after the colon; a heading "Site frequency
    spectrum" for the block, the populations under it.
B7. **The same minimum named twice.** The diversity's field reads
    "Minimum number of individuals with a genotype", the distances'
    "Individuals with a called genotype needed in each population, per
    variant"; both default to 20 and are separate. Recommendation: one
    label in both, with a line saying it is for that analysis alone.
B8. **A sentence of `diversity.md`** still calls the width of the table
    of eleven columns "not measured"; it is 1,187 pixels at the least.
    And the line of the draw before the file is read ("Typed; the
    default would be the ploidy of the variants file times…") is the
    writer's. Recommendation: correct the first; judge the second.

## For the owner, as the work goes

Points found during the work, each with its recommendation. None stops
the plan; each is asked of you at the next stop.

1. **The axis of a histogram of the spectrum, `histogram.md`, "How it
   is verified".** The spec says that p0's shares, with the top 0.061
   shared by the three populations, give a vertical axis of 0 to 0.07.
   Its own rule, the top "made round by the scale's `nice`", gives 0 to
   0.065 with the d3 the application uses (`scaleLinear().domain([0,
   0.061]).nice()`, run on 30 September 2026); 0.07 comes only from a
   rounding to 5 ticks, which would change the histograms of stage 4
   too. The code follows the rule and its test asserts 0.065, which
   still tells the shared top from p0's own, 0.06. Recommendation:
   correct the example to 0.065, and the plan's deliverable `PA4 D6`
   with it.
2. **Where the functions the three analyses share live,
   `project.md`.** The spec puts `populationListsNeeds` in `project.ts`,
   and says `project.ts` imports `individualsKept.ts` for its types
   alone, because that module imports `project.ts`. The function needs
   `individualsKept` itself, so the two modules now import each other.
   Nothing breaks today: every name that crosses is a function, and the
   reviewer loaded each module first under node with no error. A
   constant added at the top of either module could stop the page at
   load, which the reviewer showed on a scratch copy. Recommendation:
   a module of its own, `src/core/populations.ts`, for the four shared
   functions, with `project.md` changed to say so. It is a change of
   imports, and can be made at any point of the plan.
3. **Three helpers the spec's interface does not list.** `project.ts`
   exports `allEmptiedText`, `loosenText` and, after the review,
   `populationsColumnOf`, which the analyses need and the interface of
   `project.md`, "What the analyses per population share from stage 5",
   does not name. Recommendation: list them there.

4. **The names under the heatmap's columns, `heatmap.md`, "The grid".**
   The spec puts the grid at the top left of its frame, and the base of
   the plots draws the axis of the columns at the foot of the frame.
   The frame of the panel is taller than it is wide, since the legend
   takes width on the right, so the names of the columns stand about 90
   pixels below the last row at 640 by 640 pixels, and about 130 with
   long names, in Chromium and WebKit (`screens/scratch-heatmap-chromium-panel-640.png`).
   Recommendation: the grid at the bottom left of the frame, the room
   left over above it, which puts the names under their columns with no
   change to the base. The other way is an option of the base that
   places its horizontal axis, which changes `plot2d.md`. Asked at stop
   A, where it can be the first round.

5. **The right margin of the LD decay's plot, `line.md`.** With its
   right margin of 16 pixels, the last number of the axis of distances,
   "100,000", is cut by 3.5 to 7.5 pixels at the plot's right edge, in
   Chromium and WebKit, at 600 and 320 pixels wide
   (`screens/scratch-line-light-600.png`). Recommendation: a right
   margin of 28 pixels. Asked at stop C.
6. **A population named `__proto__` in the LD decay, `ldDecay.md`, "The
   cases".** The spec accepts that such a population fails the LD decay
   as an error of the application, since popnei loses it (popnei issue
   #5's neighbour). The user reads "The application met an error of its
   own … Run it again", and running it again fails the same way. The
   errors reviewer found a way around popnei: the application gives
   popnei names of its own for the populations, `p0`, `p1`, and puts the
   user's names back by their place. Recommendation: do so, a change of
   `runner.md` and a few lines of the worker, with no wait for popnei.
   Asked at stop C.
7. **The warnings of the LD decay, `ldDecay.md`, "The warnings".** Two
   gaps the spec reviewer found, for stop C:
   - The spec says each warning names up to three populations, and
     every text it gives carries one population's own numbers. The
     code makes one warning per population, so a distance below the
     spacing of the variants shows one warning for each of 20
     populations. Recommendation: keep one per population, and write so
     in the spec.
   - A population of one individual is told "Type a larger distance",
     which cannot give it a pair, since r² needs two individuals; and
     `fewIndividuals` tells it that its curve lies higher, when it has
     no curve. Recommendation: a third text of `noPairs` for fewer than
     two individuals, and `fewIndividuals` saying "its curve, when it
     has one".
8. **The order after a crash, `client.md`.** After a crash of a defect,
   the page now gives the analysis its failure and then starts a new
   calculation worker, for every kind of run; before, it started the
   new worker first. `client.md` asks this order of the LD decay alone
   and gives none for the others. The new order is the one the writing
   of a file and the PCA already had. Recommendation: write it in
   `client.md` for every request.

9. **Two sentences of the distances' warnings, `popDists.md`, "The
   warnings".** The writer changed two, for stop A:
   - `tooFewIndividuals`, when the filters of individuals took some of
     the population. The spec: "To include it, lower the minimum of
     individuals, or merge it with another population in the metadata
     file, or loosen the filters of individuals in the Variants step."
     The code: "To include it, lower the minimum of individuals, merge
     it with another population in the metadata file, or loosen the
     filters of individuals in the Variants step."
   - `negativeDistance` of several pairs. The spec ends "…as if the
     distance were 0, and shows the value."; the code "…and shows the
     values."
   Recommendation: the code's, one list with one "or", and the plural
   for several pairs; the spec then says so.

10. **The lock of the distances when the lists leave one population,
    `popDists.md`, "Why it cannot run".** When the lists of individuals,
    or the filters of individuals, leave one population, the lock says
    "Only p0 has 20 individuals or more … Lower the minimum of
    individuals below, merge populations…", which cannot help, since
    the other populations have no individual at all; at a minimum of 0
    it reads "Only p0 has 0 individuals or more". Recommendation: a row
    of its own, "The lists of individuals leave one population, p0, and
    the distances need two or more. Change the lists in the Variants
    step.", and the minimum's words only when two or more are left. For
    stop A.
11. **The Python script of the distances, `popDists.md`, "Its lines of
    the Python script".** Run in popnei's Python, the spec's lines fail
    where the application gives a result: at a minimum of 0 they keep a
    population left empty, which popnei refuses; on a haploid file,
    where Jost's D has no value, and on a pair with no distance or all
    distances 0, `correct_dists_by_lingoes` raises, where the
    application keeps the order of the file; with two populations the
    script prints an order from the PCoA, where the application keeps
    the order of the file. Recommendation: the script's lines follow
    the six steps of the application's order, and keep a population
    only when it holds an individual. For stop A; the lines are built
    here and joined into the script in stage 6.
12. **For stage 6, the script's reading of the metadata file.** With a
    column of populations named by numbers, pandas reads them as
    numbers and popnei's Python refuses them ("'int' object is not an
    instance of 'str'", checked in popnei's Python). The script of
    stage 6 reads the metadata file with `dtype=str`; the diversity's
    lines share the pattern.

13. **The heatmap at narrow widths, `heatmap.md`, "The size" and "The
    names on the axes".** Two findings of the review of work package 4,
    for stop A:
    - With names of 20 characters, the margins the names need take 270
      pixels; at that width or less the heatmap is blank, and its export
      shows the application's error bar. A phone of 320 pixels leaves
      288 for it before the panel's own padding. Meanwhile, task 5.2
      gives the heatmap a minimum width and lets it scroll sideways
      below it, as the tables do. Recommendation: that, or names cut
      shorter as the width falls.
    - When the names are dropped, below bands of 12 pixels, the margins
      kept for them stay, empty: at 640 pixels, 32 populations of long
      names leave 270 pixels empty and a squeezed grid. Recommendation:
      when the names are dropped, the margins are made without them.
14. **Two curves drawn alike in the LD decay's plot, `ldDecay.md` and
    `line.md`.** The spec numbers each population's group among every
    population of the metadata file, and the marks repeat every 49
    groups, so with 50 populations or more, the 1st and the 50th are
    drawn in one colour and one shape. The line plot now refuses two
    series drawn alike. Recommendation: the panel numbers the groups
    among the populations it draws, at most 16. For stop C.
15. **The key of the diversity in the spec's examples, `diversity.md`
    (about lines 1366, 1388, 1402, 1405).** They expect the key's
    options to be `DIVERSITY_DEFAULTS`, which now holds the draw as
    `null`, while "What goes into its key" leaves the default draw out.
    The code follows the rule. Recommendation: correct the examples.
16. **Words of the diversity the spec leaves unwritten**, chosen by the
    writer of task 6.3, for stop B: `privateAllelesWithoutSmall` with
    several populations left out, "…an allele they share only with some
    of those populations counts as private."; `variantsNotInDraw` for
    two or three populations with different counts, "of the 1,152 and
    1,100 variants at which each has a value"; its last sentence at no
    variant, "No variant has every population at 96 called
    chromosomes…"; and the lock of the draw for one individual, "the one
    individual … holds 2".

17. **The lock of the draw with one haploid individual, `diversity.md`,
    "Why it cannot run".** The spec says the default draw never locks,
    since a population of the minimum holds it. In a haploid file at a
    minimum of 0 or 1, with one individual kept, the default draw is 2
    chromosomes and the individual holds 1: the whole diversity locks,
    heterozygosities included, and the user is told to type a draw "of
    at most 1", which the field refuses. At a minimum of 0 the line of
    the default draw would also read "2 times 0" while the draw is 2.
    Recommendation: when the individuals kept hold fewer than 2
    chromosomes, the first pass runs alone, as when no population has
    the minimum, with a warning that says why the rarefied columns and
    the spectrum are empty; and the line of the default says "at least
    2". For stop B.
18. **For stage 6, the diversity's script needs the variants file
    read.** Its draw by default is the file's ploidy times the minimum,
    so `script` of a project opened without its variants file loaded
    would stop with an error. The spec guards it with "asked only for an
    analysis that has run"; stage 6 has to keep to that.

19. **The lock of the LD decay and a dense file, `ldDecay.md`, "Why it
    cannot run".** The lock counts the pairs at every distance, and not
    the variants within the distance, which grow with the density of
    the file and the individuals. On a file of 1,000 individuals with a
    variant every 100 bp, a distance of 8,333,333 bp is inside the lock
    for three populations; popnei refused it for memory after 25
    minutes in Chromium and 19 in WebKit, with the tab at about 4 GB.
    The tab stays, and the user reads the words of a refusal for
    memory, after a wait with a full bar. 4,000,000 bp ran, in 10 to 14
    minutes, at 2.4 to 2.6 GB. Options: keep the lock as it is (a rare
    file and distance, a long wait, no tab lost); or lock also on the
    individuals times the variants within the distance, which needs the
    file's density before the Run and changes the spec, its words and
    the tests. Recommendation: keep the lock, and add to the words of
    the running state that a large distance on a dense file may take
    tens of minutes and end in a refusal for memory. For stop C.

20. **A sentence of `runner.md`, "The diversity".** Its first paragraph
    still says the job holds "the two options of the diversity,
    `minNumIndividuals` and `polyThreshold`"; the next paragraph adds
    the fields of stage 5. Recommendation: correct it.

21. **Names in capitals cut at the heatmap's left edge, `heatmap.md`,
    "The names on the axes".** The spec sizes the margins at 7.2 pixels
    a character, which holds for lower case: a population coded "WMA"
    loses most of its "W", 8.6 pixels, "MEX" 4, and a 20-character name
    in capitals 8 to 11, in Chromium and WebKit and in the Linux font
    of the checks. Recommendation: measure each name's width in the
    browser before the margins are set, or count 9 pixels a character.
    For stop A.
22. **The dashed guide to the half distance, `line.md`, "Its marks".**
    On the light theme the guide of an orange, sky-blue or yellow
    population is below 3:1 on white (2.25, 2.31 and 1.32), where their
    lines and symbols get a grey edge for that reason; the example of
    `ld.nei`, orange and sky blue, shows both faint. The number is in
    the legend and the table. Recommendation: the grey edge under the
    guide too. For stop C.

## The standing rules of this plan, for a session that takes over

Not for the owner. The scratchpad of a session is lost when the Mac
restarts, so what the orchestrator gives every writer is kept here.
Every task's prompt is the text below, then the task's own part: its
number, what earlier tasks it builds on, and what the owner decided that
the code does not show.

The orchestrator runs its whole checks on a copy of a commit made with
`git archive` outside the worktree, with the preview port of
`playwright.config.ts` changed in the copy (4273 and up): the config
reuses a server already on 4173, so a check beside a writer's would
otherwise test the writer's build.

The load of the machine, set on 30 September 2026 after the owner saw
the Mac clogged: one browser run at a time on the machine, the
orchestrator's and every agent's; Playwright with `--workers=4`; at most
three agents at once. A browser check beside others let WebKit's own
process close under the load, and seven flows failed that way; alone,
the same copy passed.

### What every task of this plan is given

You are carrying out a task of an implementation plan of popnei_web, the
static web applications of popnei (population genetics in the browser,
TypeScript, React, D3, web workers running popnei's wasm package).

- **Where you work.** All your work is in the git worktree
  `/Users/jose/devel/popnei_web/.claude/worktrees/population-analyses`,
  on the branch `plan/population-analyses`, which is checked out there.
  Run every command from that directory. Do not `cd` to
  `/Users/jose/devel/popnei_web`, do not make another worktree or branch,
  and end on the branch, not on a detached commit. Never push, never
  merge, never touch `main`. Never use bare `git stash`.
- **What you read first.** `CLAUDE.md` of the worktree; the plan
  `docs/plans/population-analyses.md`, its section "Words used below", its
  "Before the first task" (the bullets "Every task commits when the checks
  pass", "Tasks side by side" and "What every prompt of a task carries",
  which are rules for you), and the whole work package of your task; the
  specs the task names under `docs/specs/`; `docs/architecture.md`; the
  decisions of the owner in `docs/specs/stage-5-open-points.md`.
- **The skills you follow.** `.claude/skills/coding/SKILL.md` and
  `typescript.md`, and the topic files of `.claude/skills/coding/` that
  your task touches (`react.md`, `css.md`, `charts.md`, `worker.md`,
  `testing.md`); `.claude/skills/writing/SKILL.md` for comments, the words
  of a screen and the commit message.
- **popnei** stays at the release `js-v0.1.0-dev.3` that `package.json`
  names; do not change it. popnei itself is at `/Users/jose/devel/popnei`
  (read it, do not change it; its `js/popnei` holds the TypeScript API).
  If the task needs something popnei does not give, stop and say so; do
  not work around it in the application. popnei issues #4 and #5 are open
  and the specs say what happens meanwhile.
- **The browsers.** Firefox does not launch on this Mac. The browser
  check is `POPNEI_TEST_PAGES=1 npm run build && npx playwright test
  --project=chromium --project=webkit --workers=4`, never `npm run
  test:e2e`, and never with more than four workers: the machine is
  shared, and a loaded WebKit closes its own process.
- **The rules of every task** are the plan's "What every prompt of a task
  carries". In short: break each rule of the spec you build once, on a
  scratch copy, and see a test fail, and say how many you broke and how
  many failed; a plot is tested in the browser for what jsdom cannot lay
  out; a check at 320 px uses the committed font of `e2e/fixtures/fonts/`;
  an effect that moves the focus is tested under `<StrictMode>`; a number
  field is tried with a comma typed key by key; a flow waits for a frame,
  not a blur, after a Tab that leaves the page, and anything it reads
  from pixels holds on Linux fonts too; a measurement asserts it measured
  a number in every column; a change that crosses layers is cut by what
  each commit keeps working; a flow that fails once is run 20 times in
  that engine before it is called flaky or fixed.
- **A spec is not changed** without the owner's word. If the task needs a
  change the plan itself names, that change is a commit of its own before
  the code. If a spec and the code, or a spec and popnei, contradict each
  other, or the architecture does not hold (an invariant you would have
  to break, an interface that does not carry what is needed), stop and
  report; do not work around it. A point for the owner is written with a
  recommendation.
- **Do not touch** the plan `docs/plans/population-analyses.md` or the
  report `docs/plans/population-analyses.report.md`: the orchestrator
  ticks the boxes.
- **Committing.** One commit per task (or per commit the task names),
  when `npm run format:check`, `npm run typecheck`, `npm run lint`,
  `npm test` and, unless you are told another task runs beside you, the
  browser check pass. The commit message follows the writing skill, as
  the recent commits of `git log` do, and ends with
  `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- **A task that changes a screen** runs `npm run screens`, looks at the
  pictures of the states it changed with the Read tool, and gives their
  paths.
- **What you send back**, in under 300 words: what you built; the
  commit(s); the last line of each check (the Vitest and Playwright
  summary lines with their counts, and the count of the deliverable's
  tag); the paths of the screenshots; the rules broken on a scratch copy
  and how many failed a test; what you did differently from the task and
  why; any question you could not settle; and the tokens you used, if you
  know them.
