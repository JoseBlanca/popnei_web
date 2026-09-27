# Report: the Variants step, whole

The work report of the plan `docs/plans/variants-step.md`, stage 3 of
`docs/build-order.md`, carried out from 26 September 2026 on the branch
`plan/variants-step`, which is not merged and not pushed.

## Where the plan stands

Under way since 26 September 2026. On 27 September work packages 1 to 5 are done, each after its review; work package 6, the filters of the variants, is next. Stop A, at the end of work package 6, is the first screen the owner tries, and the writing of work package 5 is tried there.

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

Done on 27 September 2026, after its review. The four tasks: 1.1 as 8da15ef, 1.2 as c185d9a, 1.3 as
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

Work packages 1 and 2 are done: on 4a3adee the browser check gave
"370 passed" (the 348 of the start and the 22 of the plots) and
`npm test` "1847 passed" in 50 files.

## 4. The histogram

Done on 27 September 2026, after its review. The tasks: 4.1 as 6c24318
(the dependencies) and aecf63d, 4.2 as 84e4fd9, 4.3 as ee86b0e and
da016ac.

### The deliverables, on 4a3adee

| deliverable | command | result | asked |
|---|---|---|---|
| D1 | `npm ls d3-selection d3-scale d3-axis jsdom` | the four at 3.0.0, 4.0.2, 3.0.0, 30.1.1 | the same |
| D2 | `npx vitest run src/charts -t "VS4 D1"` | 25 passed | 14 |
| D3 | the same, `-t "VS4 D2"` | 29 passed | 21 |
| D4 | the browser check, `-g "VS4 D3"` | 22 passed, 11 in each engine | 14 |
| D5 | `npm run build`; `POPNEI_TEST_PAGES=1 npm run build`; `npm pkg get scripts.test:e2e` | no file named with "plots"; `dist/e2e/plots.html`; the variable set | the same |
| D6 | `npx vitest run src/ui/tokens.test.ts`; `grep -c -- "--chart-bar" src/ui/tokens.css` | 39 passed; 3 | 2 |

The packages the lockfile added: at run time d3-array, d3-axis,
d3-color, d3-format, d3-interpolate, d3-scale, d3-selection, d3-time,
d3-time-format and internmap; for development the three `@types/d3-*`,
`@types/d3-time`, jsdom and what jsdom brings. `internmap` is the one
package the plan does not name: `d3-array` brings it, and `d3-array` is
on the list of `docs/technology.md`. `docs/technology.md` and
`charts.md` now record the owner's approval of 26 September of these.

The page's first script, `popgen-*.js`, is 129.51 KB gzipped on
4a3adee, against 123.62 KB at the start; no screen imports the plots
yet, so the 5.89 KB are the code of work packages 1 to 3. The plots
will add 17.82 KB gzipped once a screen draws them (measured by the
bundle reviewer as a library build of `src/charts`).

### The review

Reviewed by `spec`, `stale`, `errors`, `api`, `architecture` and
`bundle`, reading at da016ac, then by `tests` and `browser`, each on a
copy of the tree outside the worktree with a preview server on a port of
its own. What was fixed, each with a test that failed first:

- A plot with a threshold less than 100 pixels high kept the old bars
  after an update and exported that mixed state; a plot too small to
  draw was shown at the browser's default of 300 by 150 pixels, and its
  error said its element never had a size. A frame with no area now
  clears the drawing (c0312d2, 84366c3).
- The first drawing took the size with the padding, and the next one
  without, so a plot in a padded panel was drawn twice at two sizes
  (34a2bcb, 286f421).
- The frame gives its margins, so the legend is not placed by a second
  reckoning of them (666e5a2, feedfa7).
- The export waits for the fonts, frees the canvas of each PNG (Safari
  on iPhone refuses new canvases once too much canvas memory is held),
  gives every failure as a rejected promise, and gives `notMade` for a
  failure of `drawImage` (75d7022, 1b1a106, e7d24d1).
- The page of the plots is built in a second build, so the site's files
  are those of `npm run build` byte for byte: the sha256 of the 12 site
  files are the same after both builds, where 7 differed before
  (a954cbd, 17ea30e, 280ddc7).
- The tests reviewer made 88 changes to the code, 68 failed a test; the
  tests of the 19 that passed were added (d892293, 404f1e8, 4a3adee),
  the worst two a removed bar drawn filled like a kept one, which would
  leave only the colour to tell them apart, and the exported file
  losing the strokes of the removed bars and of the threshold line.
- Doc comments, types and records (c43812d, e5d0d22, 50c4eb5).

Not taken, and why:

- The x axis cannot take its own tick values, which a Manhattan plot
  will need, one tick at the middle of each chromosome: left for the
  spec of the Manhattan plot.
- The limit of a PNG (below, for the owner): the owner's.

### For the owner, before stage 6

The largest PNG the export makes is set by a side of 4,096 pixels
(`MAX_CANVAS_SIDE`), because Safari on iPhone draws nothing on a larger
canvas. The limit of Safari on iPhone is an area, 16,777,216 pixels
(4,096 × 4,096), not a side, and iOS 18 raised it to 8,192 × 8,192
(from documentation; no iPhone was tried). So the rule is safe, and it
refuses PNGs every browser could make: a plot wider than 1,365 pixels on
the screen gets no PNG at 3 times its size, and one wider than 2,048
gets none. Options: keep the rule (nothing to do; the export is offered
only in stage 6, and its screen can cap the width of a plot); or check
the area, width times height at most 16,777,216, with a side of at most
8,192 (a change of `plot2d.md` and of four tests). Recommended: check
the area, when stage 6 offers the export.

### How the work of 4 went, for whoever revises a skill or a plan

- The two reviewers that run the page, `tests` and `browser`, each ran
  on a copy made with `git archive` and a preview server on its own
  port, beside the tasks of work package 3: no interference.
- The tasks' own count of the rules broken and caught was 93 of 93; the
  tests reviewer's changes found 19 of 88 passing, most in what jsdom
  cannot see (the CSS of the bars, the styles kept in the exported file)
  and in the exact limits. A task of the plots should be told to test
  in the browser what jsdom cannot lay out.

## 3. The store and the analyses in core

Done on 27 September 2026, after its review. The tasks: 3.1 as 6d5301c,
3.2 as 1b1d9d2, 3.3 as 602ccaf and 5185538, 3.4 as 774781d and 2079eba
(the spec), 3.5 as d954d86, 3.6 as ca52c23 and 26b88dc, 3.7 as
e080dc5.

### The deliverables, on 647897b

| deliverable | command | result | asked |
|---|---|---|---|
| D1 | `npx vitest run src/core/analyses -t "VS3 D1"` | 60 passed | 16 |
| D2 | the same, `-t "VS3 D2"` | 12 passed | 9 |
| D3 | `npx vitest run src/core/analyses/diversity.test.ts -t "VS3 D3"` | 16 passed | 10 |
| D4 | `npx vitest run src/core/store.test.ts src/ui/runs.test.ts -t "VS3 D4"` | 38 passed | 14 |
| D5 | `npx vitest run src/core -t "VS3 D5"` | 14 passed | 9 |
| D6 | `npx vitest run src/core/store.test.ts src/ui/runs.test.ts -t "VS3 D6"` | 28 passed | 13 |
| D7 | `npx vitest run src/core/store.test.ts -t "VS3 D7"` | 3 passed | 3 |
| D8 | `npx vitest run src/core/projectFile.test.ts -t "VS3 D8"` | 4 passed | 4 |
| D9 | `npm test`; the browser check | 1863 passed in 50 files; 370 passed | |

For D2, a scratch `keyInputs` that gave a filter of individuals made the
row "a filter of individuals leaves the key the same" fail, for the
statistics of each individual and for the Count (task 3.2).

The lines of existing tests that changed, each asked for by a spec:
`statistics: null`, `counts: null` and `write: null` in the
configurations of `createStore`, and `individualsKept`, `write`,
`ofStatistics`, `waitsForStatistics` and the three fields of the write
in the literals of the state (`store.md`, the interface); the handles of
`startRun` compared as lists (`store.md`, its return); the two tests of
the lock of the diversity on every filter of individuals removed, and
one renamed (`diversity.md`, the lock goes); `numVarsOf` replaced by
`countsOf` (`store.md`, "What each filter kept"); the literals of two
projects of the tests of the project file put in the fixed order.

### The review

Reviewed by `spec`, `stale`, `errors`, `api`, `architecture` and
`react`, reading at 26b88dc, then by `tests` on a copy at 7b2a655. What
was fixed, each with a test that failed first where one could:

- A Run, or a write, that waited for statistics already on their way
  did not stop the calculations left behind, so the statistics waited in
  the worker behind an old diversity, and the notice still said that
  diversity would be stopped while the panel showed the new one running
  (7a97b21).
- When one press met two errors of the application, only the first
  reached the bar at the top of the page (cc1cc9b, 5373e80).
- A write of another format than `.nei` would have been filed as the
  `.nei` file: a defect now, before the VCF is added (7752a83, d00a72a).
- The cache kept the keys of the project as it was before the number of
  variants was recorded (b1c3c1b).
- The Count had no words for a refusal of popnei (38d5f8a, 55f9fe8); a
  case of the check numbers the specs did not list (9b89a67); doc
  comments, helpers written twice or three times, and two projects of
  the tests out of the fixed order (900fe86, 7b2a655).
- The tests reviewer made 181 changes to the code, 151 failed a test;
  the tests of the ten that mattered were added (ffa9d17, 198cc98,
  647897b), the worst the analyses that do not read the filters of
  individuals locked when a threshold keeps nobody.

Not taken, and why:

- The stale warning of the individuals with no population, a finding of
  stage 2: it does not hold, since an individual of the variants file
  with no row in the metadata file locks the diversity, so no result is
  kept under the earlier state.
- A flow of stage 2, `WS9 D3` "Run that takes the calculation stopped
  out of the notice", failed 6 times in 40 in WebKit already on the
  start: the test held the first worker and not the one a new file
  starts. The test was corrected (84acf1f): 40 of 40 in each engine.

### For the owner, at stop A

- A write that popnei refuses for lack of memory is kept as refused
  for the session, so the user cannot press Write again until they
  change a filter (`store.md`, "A calculation that failed", keeps every
  refusal of popnei, since popnei refuses the same data the same way).
  A refusal for memory can pass in the fresh worker the client starts
  after it. Options: keep it as it is (the words already send the user
  to the filters); or keep such a refusal only until the next change,
  like a failure that is not popnei's, which lets the user try again.
  Recommended, since task 5.4 measured it: keep it as it is. No write
  that failed for its size was a refusal of popnei (the worker trapped
  in Chromium, the tab closed in WebKit), and in Chromium a second try
  in a fresh worker failed the same way, so a second try would not have
  helped.
- Choices of task 3.1 the specs leave open: a histogram pass that keeps
  no variant shows popnei's own message and not "Loosen the filters",
  since that pass reads no filter; the warning when the first filter
  keeps no variant ends "Loosen it.". Recommended: keep both.
- The words of the Count for a file with no variant come out, by the
  substitution `filterCounts.md` gives, as "there is no variant to count
  the variants over". Recommended: "there is no variant to count", in
  `filterCounts.md` and the code, to be judged on the screen.

### How the work of 3 went, for whoever revises a skill or a plan

- The tasks' own count of the rules broken and caught was 259 of 264;
  the tests reviewer's changes found 10 that mattered among 30 of 181
  passing, most in what a fake of `testSupport.ts` ignores (the fake
  counts that read no project) and in the branches of the notice.
- A fixer stopped at the session limit of the API with its edits
  uncommitted; resumed with `SendMessage`, it went on from them.
- Tokens: the seven tasks used 94,000 to 356,000 each (3.3, the store,
  the most); the six reviewers that read, 34,000 to 251,000; the tests
  reviewer 172,000; the two fixers 181,000 and 152,000.

## 5. The page joined, and the writing

Done on 27 September 2026, after its review; its screen is tried at
stop A. The tasks: 5.1 as 2970371 (`shell.md`) and c3c6214, 5.2 as
f12b889. Since 5.2 the entry gives the store the counts, the statistics
and the write, so a project with a threshold on the individuals runs the
diversity after the statistics, with no error of the application (seen
in Chromium and WebKit by the task, 116 of 200 individuals kept at
0.03). 5.3 as 17097ae (`writeVariants.md`), 3bb950a (the step's own
`sizeText` removed; the card of the file now reads "261 KB"), 59f8a38
(one function for the words of statistics that could not be had,
shared with the diversity) and 534865f.

A file written in the calculation worker is still whole after that
worker is ended, in Chromium and WebKit: in the flow `VS5 D4`, the
diversity is stopped below 100% on the VCF of 1,000 individuals, the
worker that made the file is closed before Save, and the file saved
opens in popnei in node with 1,000 individuals. So the page need not
hold the bytes itself before a restart (`client.md`).

5.4 as 5d15db4 (the specs), e671e14 and 3e6735d.

### The measurements of the write (task 5.4, `VS5 D5`)

On a Mac17,9 (Apple M5 Pro, 64 GB, macOS 27.0), Chromium 153.0.8010.12
(headless shell) and WebKit 26.6 under Playwright 1.63.0, one worker.
The memory is macOS `footprint` summed over every process of the engine,
so it is read the same way in both; F is the size of the file.

| | Chromium | WebKit |
|---|---|---|
| a file of 19,161,178 bytes, median of 5 | 144 ms, peak +109 MB | 149 ms, peak +134 MB |
| a file of 220,236,506 bytes (200,000 variants) | 3.73 s, peak +966 MB (4.4 F) | 3.70 s, peak +1,059 MB (4.8 F) |
| the bytes copied into the `Blob` | yes, +220 MB in the browser's process, 13 ms | 12 ms; the network process grew by F in some runs only |
| the largest file written | 1,982,018,522 bytes (1.8 million variants), peak 8.28 GB | the same, peak 11.46 GB (up to 6.1 F) |
| about 2.2 GB (2 million variants) | the worker stops (`workerFailed`) | the whole tab closes |

Every file saved was whole: its size was right, and pyarrow read back
every batch with its variants and 1,000 individuals.

The constants set from them: `BYTES_PER_GENOTYPE` stays 1 (the files
had 0.96, 1.09 and 1.10 bytes per genotype); `WRITE_WARN_BYTES` stays
500 MB; `WRITE_MAX_BYTES` goes from 4 GB to 1.8 GB, so that an estimate
under it is a file under 1.98 GB at 1.10 bytes per genotype, the largest
both engines wrote; `WRITE_RESTART_BYTES` goes from 100 MB to 25 MB,
since a write leaves about 4.5 F in the tab. The warning now says the
tab needs "about six times" the file, where it said "up to three
times".

No failure was a refusal of popnei: in Chromium the worker trapped,
and a second try in the fresh worker failed the same way; in WebKit the
tab closed. Firefox was not measured; the owner's steps are at stop A.

### The deliverables, on 953ca7c

| deliverable | command | result | asked |
|---|---|---|---|
| D1 | `npx vitest run src/core src/ui -t "VS5 D1"` | 13 passed | 5 |
| D2 | `npx vitest run src/ui/shell -t "VS5 D2"` | 45 passed | 31 |
| D3 | the browser check, `-g "VS5 D3"` | 28 passed, 14 in each engine | 10 |
| D4 | the same, `-g "VS5 D4"` | 2 passed, 1 in each engine | 2 |
| D5 | `npx playwright test --project=measure-chromium --project=measure-webkit -g "VS5 D5" --workers=1`, on c898b9a | 6 passed in 16.5 minutes; the tables above | passes |
| D6 | the screenshots of the writing, in `screens/popgen-write-*` | 18 states, light and dark, each looked at | 7 states |

The whole on 953ca7c: `format:check`, `typecheck` and `lint` exit 0;
`npm test` "Tests 1958 passed (1958)" in 56 files; the browser check
"400 passed". Firefox was not run.

### The review

Reviewed by `spec`, `stale`, `errors`, `api`, `architecture`, `react`
and `ux`, reading at 534865f beside task 5.4, then by `tests`,
`accessibility` and `browser`, each on a copy of 3e6735d outside the
worktree with a preview server on its own port. The fixes are the 27
commits 5bb1981..c898b9a. What was fixed, each with a test that failed
first where one could:

- The estimate of a written file left out the bytes each variant
  carries whatever the number of individuals, so with few individuals
  the file was up to ten times the estimate (10.4 bytes per genotype at
  2 individuals, 1.68 at 20), and a file past the size that closes a
  WebKit tab could be allowed. The estimate is now the variants times
  (the individuals + 40 bytes), `BYTES_PER_VARIANT` measured with
  popnei's `writeVars` in node (62d5099, 0c3bf5d, 974a28f): every file
  measured is at most 6.9% above it, and one of 2 individuals with no
  ids is 77% under it. `panel.nei` at 0.05 now reads "About 276 KB" for
  the 251 KB written.
- Closing or reloading the tab with a file written and not saved asked
  nothing, where Open project… asks (642b4ac, 11c3390). Found by two
  reviewers.
- A wrong ploidy refused by popnei during a write was put down to
  memory and to a broken file; a file with no variant at all, or a VCF
  where no variant passed, was told to loosen the filters. Both now get
  the words the other panels give (a27f841, 733fe69, 4ac06bb, c898b9a).
- Pressing Save was announced by nothing, and a second Enter started a
  new write; the status region kept "Save it" after the file was
  discarded; the question before an opening said "calculations" of a
  write (9ba6452, 0ef8c5a, e4d446c, 69fd1f5).
- A focused Stop that turned into a disabled Write, when statistics
  arrived that kept nobody, left the focus on a disabled button
  (8cc3892); the clock showed 0:00 for a frame on coming back to the
  step (c88f540).
- The stepper named the statistics first among failed checks, though
  the histograms and the Count are above them on the step:
  `POPGEN_ANALYSES` is now in the order of the step (adf5c93, d7e1076).
- The shell's words are given by the entry through a context, and the
  count of the variants kept moved to core; documents and names brought
  to the code (c2e27f7, e8a7516, 1bb1a30, 6665eba, 255078e, 730cc09).
- The screenshots of the eleven states of the section not yet taken
  (b3e908d): `screens/popgen-write-{warning,too-large,locked-list,locked-none,waiting-statistics,no-variant,empty-source,error-again,error-refused,dropped,bound}-{light,dark}.png`.
- The tests reviewer made 114 changes to the code, 32 of which passed
  every test; the tests were added (2b7e56b, cb5b00f), the worst a Write
  that is not disabled for a file too large, and ten of the sixteen
  changes to the Write section, which task 5.3 had counted as caught.
- A property of the store that failed once in three runs was a model
  in the test that missed a case `store.md` allows (a Run that sends
  nothing still stops the calculations left behind), not a defect of the
  store (4b361b7); it passes at 20,000 runs.

After the fixes, `react` and `accessibility` ran again, on 5bb1981..c898b9a,
and found two more, fixed with tests that failed first: the status
region's new clearing left its timer running, so a sentence could be
read 50 ms after the region was emptied and then wiped (0cfe39f); and a
write that ended with no file because the thresholds keep nobody was
announced by nothing (4d3e3e5, 6951c9e, 953ca7c).

Not taken: the notice drops the file of a write that ends while the
notice names it, as `store.md` chose; the ploidy field shown for a
`.nei` file, of stage 2 and outside the range.

### What was changed in the plan

- Task 5.2 put the titles of the analyses and the words of the shell in
  a new `src/ui/analyses/titles.ts`, not in `panels.ts`, since the test
  of the types cannot import a file that imports components and CSS; and
  the making of the store in `src/ui/popgenStore.ts`, so a test in node
  makes it as the page does.
- The screenshot "ready with the size expected" runs the diversity
  first, since the Count, which would give the size, comes in task 6.3.

### Carried to later tasks

- Task 7.4: `AnalysisPanel.tsx` does not read `ofStatistics`, so a
  refusal of the statistics a diversity waited for shows the
  diversity's own words; 7.4 uses `statisticsFailedText` there.
- Task 6.3: counts filled from the pass of a write over a file with no
  variant may show zeros where the Count's own pass shows popnei's
  refusal of an empty file; check which the step shows.
- Work packages 6 and 7: the Write section already says "Count, above"
  and "Loosen the filters above", and the lock "Loosen them in the
  Variants step", before the Count and the fields of those filters are
  on the step; each is true once they are.

### What was changed in the specs, without the owner

Task 5.1 settled four points `shell.md` left open, in 2970371: within
one change, the ends of calculations are announced before the starts,
as the spec's own example has it; a check of the step in error says "The
Variants step says why."; after an undo, the sentence of a file
discarded names Redo; the stepper's Failed names the checks in the order
of `apps.ts`, then the writing. Each is words on the screen, judged at
stop A.

The review of work package 5 changed four specs in the same way, each
settled without the owner and to be judged at stop A: leaving the page
asks when a file is written and not saved (`entry.md`); the words of a
wrong ploidy and of a file with no variant in the writing
(`writeVariants.md`); the status region announces a Save, a write that
ends locked, and is cleared when a written file is discarded, and the
question before an opening names the writing (`shell.md`); the estimate
of a written file counts 40 bytes per variant besides the genotypes, a
value that keeps every file measured within 6.9% above it
(`writeVariants.md`, `docs/architecture.md` section 11).

### For the owner, at stop A

- A write left behind that is stopped when Run is pressed is announced
  by nothing, since `shell.md` gives it no words. Recommended: "The
  earlier writing of the file was stopped.", and with a calculation "The
  earlier calculation of Diversity and the writing of the file were
  stopped." Until the owner answers, nothing is announced.
- Before any Count, the size beside Write is only an upper bound, and
  Write is not refused on it. A VCF not yet counted whose file would be
  over about 2 GB can then stop the worker in Chromium and close the
  whole tab in WebKit. Options: leave it (the warning above 500 MB
  already says "about six times" the memory); or refuse Write with "Count
  the variants first, above" when the upper bound reaches the limit of
  1.8 GB, which costs the user one pass of the Count on such a file.
  Recommended: refuse it until counted.
- The Write section, on the Variants step, ends four of its messages
  with "… in the Variants step" (popnei's refusal of the file, a file
  that could not be opened again, statistics that could not be had, and
  thresholds that keep nobody). `variants.md` leaves that ending out for
  the step's own reasons. Recommended: leave it out here too.
- The question before Open project… says "press Keep the current
  project and save it first. panel.filtered.nei, written and not saved,
  will be discarded." Saving the project does not keep the file.
  Recommended: "… will be discarded; to keep it, press Keep the current
  project and save it in the Variants step."
- On an iPhone, Safari closes a tab that asks for more than about 300
  to 450 MB (iPhone 11 to 14) or about 1 GB (from iPhone 15), from
  reports and not from a device; the limits were set on a Mac of 64 GB.
  A file of 50 to 200 MB can then close the tab with no warning, and
  Safari on iPhone never asks before a tab is left (it has no
  `beforeunload`). Options: nothing; the warning's words saying that a
  phone or a tablet fails with far smaller files; or a lower limit when
  the page detects a phone, which is guessed and not told by the
  browser. Recommended: the words, since the Population genetics page is
  meant for a computer.
- Once saved, the section shows the size written, "251 KB", and under
  it the estimate, "About 230 KB: 1,152 variants of 200 individuals",
  for the same file. Recommended: after a write, give the size written
  only.

### How the work of 5 went, for whoever revises a skill or a plan

- Task 5.3 counted 35 of its 36 rules as caught by a test; the tests
  reviewer found 10 of 16 changes to the Write section passing every
  test. A task's own count of the rules it broke is not evidence for a
  component, whose flows it checks on the states it happens to reach.
- The seven reviewers that only read ran beside the measurements of
  task 5.4, reading at a commit, and then three that run the page on
  copies. A fixer that ran the build during a measurement would have
  replaced `dist/` under it: the orchestrator held it back with a
  message. The code-review skill could say that a measurement runs
  alone in its tree.
- The measurements took 72 minutes of task 5.4 and 16.5 minutes to run
  again; the largest files are gigabytes in `MEASURE_DIR`.
- Tokens: the four tasks used 242,000, 275,000, 321,000 and 260,000;
  the ten reviewers 44,000 to 142,000; the fixer, across its five
  rounds, 475,000.

## 6. The filters of the variants

Under way. The tasks: 6.1 as 95adc98 (`variants.md`: the number field
reads the digits typed itself, so the number is the same in any
language of the browser; the switch of a filter is described by the
line under it), 2e0fb5f and 4f2c966. Two flows of stage 2 changed for
it: the description of the missing data field now ends with the line of
its switch, and the flow of the writing presses Tab four times to reach
Write past the new filters.

6.2 as 3edab28 (`variants.md`: the words of the histograms removed by a
change, which the spec gave only by their start, written on the model
of the diversity's), 8182b5e, 4ab5cf5, 3562d1d, ca9c80a, b3afbec and
b69da83. The plots are now in the page: its first script is 154,923
bytes with `gzip -9`, against 133,788 on 3ba619a (21.1 KB more). A test
of the types fails if the states of a bin in core and in the plots
drift apart. Two flows of stage 2 changed: the order of the keyboard
has the new button, and the flow of an error of the application now
breaks only the formatting of the number field, since breaking every
formatting of numbers also broke the plots and the page did not start.

For the owner, decided without them: the spec says the panel of a plot
is no stop of the Tab key, but React Aria makes a panel with nothing
to focus a stop, as the WAI-ARIA guidance for tabs advises; the panel
stays a stop, and the spec is to say so.

6.3 as e9cb602 (`variants.md` and `filterCounts.md`: the focus goes to
the words of an error when the Count ends with no button; popnei's
reading of a file with no variant gives zero counts and a warning, as a
write does, so the two agree), ed6ca4d and 4aae168.

### The Count against the diversity (task 6.3, `VS6 D3`)

On the Mac of work package 5, median of 5 passes each:

| engine | file | Count | diversity | ratio |
|---|---|---|---|---|
| Chromium 153.0.8010.12 | the VCF of 80,692,954 bytes | 194 ms | 248 ms | 0.78 |
| Chromium | the `.nei` file of 19,161,178 bytes | 80 ms | 136 ms | 0.59 |
| WebKit 26.6 | the VCF | 204 ms | 243 ms | 0.84 |
| WebKit | the `.nei` file | 82 ms | 132 ms | 0.62 |

The Count is faster than the diversity on both files in both engines,
so popnei is not asked for a function that only counts.

A flow of stage 2, `WS9 D3` "a change that leaves a calculation behind
… and Run stops it", failed 9 times in 30 in WebKit already at 953ca7c:
when the new calculation ended after the status region had written its
start, the end replaced it, and the test looked too late. The page lost
no announcement; the test now reads every text the region held
(64989f6), 30 of 30 in each engine.

### The review

Reviewed by `spec`, `stale`, `errors`, `api`, `architecture`, `react`,
`ux`, `tests`, `accessibility`, `browser` and `bundle`, those that read
at 64989f6 and those that run the page each on a copy with its own
port. The fixes are 2340bb8..aafbf69 and those after the second round
below. What was fixed, each with a test that failed first where one
could:

- Typing "0,1" key by key in a threshold field drew the histogram's
  threshold at 1 (the field dropped the comma and read "01"), while the
  field refused the number; "0,0" drew it at 0 (e20e094, b9362ec).
  Found by four reviewers.
- In Chromium, Cmd+Z in a threshold field after a commit ran the
  browser's own undo on text the page had replaced, and Tab then set the
  filter to 0, with no word (54b452c, 3605a08).
- The plots stayed 640 px wide when the window narrowed after they were
  drawn, so the page scrolled sideways (ff2ee03); at 320 px the table of
  the bins cut its column "This filter" (4471320).
- The bar of the observed heterozygosity from 0.5, at the default 0.5,
  was drawn like a removed bar, though 8 of its 62 variants are kept: a
  line under the plot now names the bin the threshold splits (fe9da96,
  8d18461).
- After a Count refused by popnei, two lines still sent the user to a
  Count button that was gone (8e6c5a3, c2f3a0c); a refusal of the
  histograms told the user to change the settings, which brings nothing
  back (49c4a4c, cc9eddc).
- A defect in the histograms or the Count emptied the whole Variants
  step, also after coming back to it: each now has its own error
  boundary (19d7f9b).
- On an iPhone set to a region that writes decimals with a comma, the
  keypad of a threshold field had no point, so no decimal could be
  typed (f938ade, 15b8a9d); not seen on a device.
- Words the specs left out or said wrongly (e0034a2, 0213941, 852ae5c),
  helpers written three times before work package 7 adds a fourth
  (3a4f28c, ee34537, c39db42, 67379cf), and the screenshots of the Count
  running and in error and of the histograms removed (aafbf69).
- `docs/technology.md` now records the 21.1 KB of the plots in the
  first script: loading them only when drawn would save 16 KB, 1.7% of a
  first visit, which is mostly popnei's wasm, and was not taken
  (edd9ae5).
- The tests reviewer made 65 changes to the code, 8 of which passed
  every test; the tests of the five that matter were added (c822fdd,
  9457471), the worst a threshold left on the plot after an Undo.

Not taken: the filter by observed heterozygosity has no line under its
switch, as `variants.md` has it; the Count's key leaves out the filters
of individuals, since they apply after the filters of the variants
(`runner.md`); the notice of removed histograms lies over the line that
says they were removed in a window 720 px high, and "done" is announced
after a defect caught by a boundary, both for the owner below.
