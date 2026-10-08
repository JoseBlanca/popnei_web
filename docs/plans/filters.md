# Plan: the thresholds of popgen2.html as filters, with Undo

7 October 2026; approved by the owner the same day, with Open 1 of the
screen spec answered "nothing", so work package 12 is not done. Revised
on 8 October 2026 for the owner's decisions after trying the page on
the branch `popnei-0.2.2` (the design, "What the owner decided"): no
line under a plot of what its threshold keeps, a threshold that keeps
every value of its plot drawn in grey, and the FILTER box built soon,
so it is now work package 7, right after Undo, Redo and the notice; it
was work package 9, and the number box and the thresholds, 7 and 8,
are now 8 and 9. Revised again on 8 October 2026 after the merge of
`main`, which brought the piece `popnei-0.2.2`: popnei 0.2.2 is
installed, `PROTOCOL_VERSION` is 13, and the grey of a threshold that
keeps every value of its plot is the one that piece built, a bluish
grey of its own, the token `--chart-threshold-keeps-all` of
`src/ui/tokens.css`, with the line dotted and the handle hollow, which
work packages 8 and 9 reuse. It builds the design `docs/designs/stats-filters.md`, approved by
the owner on 7 October 2026: the thresholds the user drags or types on
the histograms of `popgen2.html` become filters of the project, with
Undo, Redo and a notice that says what each change did; a check box
"Leave out the variants that failed their FILTER", on by default for a
VCF and for a `.nei` file that records the FILTER of its variants, as
the owner decided later on 7 October 2026; and the plots read before a Stop stay on the page. It is carried
out as the `building` skill says, its work packages being the phases of
that skill's loop, on the branch `filters` in
`.claude/worktrees/filters`.

When it is done, a user of `popgen2.html` who opens `panel.vcf.gz` sees
the missing rate of the variants on at 0.1, the four other thresholds
off with 1 in grey in their boxes and their lines grey at the top of
their axes, and the FILTER box ticked; moves a
threshold, types one, or turns it off by emptying its box or typing 1,
and each change gives one notice, "The MAF filter changed · Undo", and
one step of Undo; holds an arrow key on a line and gets one step of Undo
for the whole run; opens another file and finds the thresholds where
they were; and, after a Stop, still reads the plots of the variants
read before it. Nothing of this reads the file again. It serves cases 1
and 2 of `docs/use-cases.md` up to the point where the filters are
carried out, which waits for the tools section.

The specs, called below by their file names, are those revised or
written for the design on 7 October 2026 (`git log --oneline
50b1d6b..0e27a62`), and revised again that day for the owner's decision
on the FILTER box of a `.nei` file and the exact counts of popnei 0.2.2
(commits a1a4a8a and 728cf14):

- the worker: `docs/specs/worker/protocol.md`, `messages.md`,
  `runner.md`;
- core: `docs/specs/core/project.md`, `projectFile.md`, `keys.md`,
  `store.md`; `docs/specs/entry.md`; the analyses that read the filters,
  `docs/specs/analyses/diversity.md`, `pca.md`, `popDists.md`,
  `ldDecay.md`, `sfs.md`, `filterCounts.md`, `writeVariants.md`;
- the screen: `docs/specs/steps/popgen2-filters.md`, called the screen
  spec below.

`docs/architecture.md` and `docs/functionality.md` were revised with
them and need nothing more from this plan, unless a round with the
owner changes what they say.

## Words used below

- **The filter of the FILTER column** is the filter of the kind
  `passed` that the check box turns on and off; **the FILTER box** is
  that check box.
- **The one pass** is the summary of the variants file, the only
  calculation of `popgen2.html`, whose key holds the file and no filter.
  **A result so far** is what it has read before it ends, which the
  plots are drawn from while it runs.
- **A run** is a sequence of presses of the arrow keys, Page Up or
  Page Down on one threshold, or of Home or End on its line, with less
  than a second between two presses, which the page makes one change of
  the project (the screen spec, "The terms").
- **The old page** is `popgen.html`, whose screens must not change but
  where the specs say so.
- **The browser check** is `POPNEI_TEST_PAGES=1 npm run build` and then
  `npx playwright test --project=chromium --project=webkit --workers=4
  --global-timeout=<milliseconds>`, with `-g "<tag>"` where a deliverable names
  one. Firefox cannot start on the owner's Mac under Playwright 1.63.0;
  the owner tries the screen in Firefox by hand at the stop.
- **The screens run** is `npx playwright test --project=screens -g
  popgen2 --global-timeout=400000` after a build, which writes the PNGs
  of `e2e/screens.spec.ts` (`.claude/skills/coding/testing.md`).
- **A tag** starts the name of a Vitest `describe` or a Playwright
  test: `SF3 D2` is work package 3, deliverable 2, of this plan (`SF`
  for the statistics' filters; no test of the repository starts so on
  7 October 2026). A Vitest count is read from the summary line of `npx
  vitest run <path> -t "<tag>"`, "Tests N passed", since a tag that
  selects nothing exits 0 with every test skipped; a Playwright count
  from the summary of the browser check, half in each engine. Every
  tag of this plan selects nothing on the commit the work starts from,
  so every check below fails there.
- **The stop** is where the session waits for the owner to try the
  page; **a round** is one change they ask for there, with its commit
  and its screenshots taken again.

## In and out

In: the thirteen work packages below, the eleventh of which is the stop. Out, each with where it goes:

- the tools section and the download of the filtered file, and so the
  filters carried out on `popgen2.html`: popnei's issue #13 (the
  design, "The tools section and the download of the filtered file");
- the count of the variants that failed their FILTER: the piece
  `popnei-0.2.2`, which puts it in the box of the file;
- what all the filters keep together: with the reading that carries
  them out, the first tool;
- the quiet second before a calculation that reads the filters starts
  by itself, and the keys left behind that start again: with the first
  such tool (the design, "When a calculation that reads a filter starts
  by itself");
- the saving of the project on `popgen2.html`, and with it how its
  project files hold whether the variants record their FILTER
  (`project.md`, "Not in this spec");
- the line under each plot of what its threshold keeps, its words, and
  the raise of a threshold of the variants below 0.001 to 0.001 with its
  words "Counted as 0.001, the smallest threshold.": the owner's
  decision of 8 October 2026 takes them out, and the piece
  `popnei-0.2.2` removes them in its first round with the owner, with
  the grey of a threshold that keeps every value of its plot, before it
  is merged here (task 9.2 removes whatever of them the merge still
  brings);
- fewer bars on the histograms whose values lie on a grid, the owner's
  decision of 8 October 2026: the piece `popnei-0.2.2`.

The open points of the specs that are not answered:

- **Open 1 of the screen spec**, a line under the MAF and observed
  heterozygosity plots counting the variants with no called genotype.
  Meanwhile nothing, as today. It is asked of the owner at the stop, and
  work package 12 builds it only if they say yes.
- **Open 4 of `projectFile.md`**, the words of a project file of the new
  page opened in the old one. Meanwhile the words that spec gives. Another
  answer changes task 4.1, its text and its test; no file can meet them
  before `popgen2.html` saves projects.

## Before the first task

- The owner has approved the specs above and this plan.
- The worktree has its packages: it has no `node_modules` on 7 October
  2026, so `npm ci` there, and `npx playwright install` if Chromium or
  WebKit is missing. Node is v26.8.2 on the owner's Mac.
- `npm pkg get dependencies.popnei` prints the release
  `js-v0.2.1/popnei-0.2.1.tgz`. The literals of the runner's tests in
  `runner.md`, "The filter of the FILTER column", were taken under node
  from that release on 7 October 2026; a subagent that needs another
  number takes it from popnei under node on the installed package, as
  `src/worker/runner*.test.ts` and `e2e/fixtures/make_fixtures.mjs` do,
  never from popnei's Python `.venv`, which is a stale 0.1.0.
- The checks of the `coding` skill pass on the commit the work starts
  from, `npm run test:e2e` replaced by the browser check of the whole
  suite with `--global-timeout=1500000`; the session writes their counts
  under "What was done" before work package 1, so that a later failure
  belongs to the plan.

## The order, and what may run side by side

Core and the worker first, since the screen sends their commands and
reads their states, and a mistake there gives a wrong key or a project
file that does not open, which no screen shows. The kind `passed` first
of all, since the compiler refuses every table of the kinds of filter
until each has it. Then the store, then the screen from the outside in:
the row of Undo and Redo, which the notices of the thresholds and of the
FILTER box need; the FILTER box, which the owner wants soon (8 October
2026); the number box; the thresholds; the plots after a Stop.

The FILTER box, work package 7, stands on 1 (the kind `passed`), 2 (the
read of the file that says whether its variants record their FILTER, on
which the box is shown), 3 (the first project, which holds it on), 5
(the notice of every change of a filter, and a crash not wiped by a
click) and 6 (the row and the notice). Of the work packages it now
comes before, it needs one thing: the check box's sentence under it
(`description`), which was in the widgets' package and moves into its
own, task 7.1. It needs nothing of the thresholds: a click on the box
while a run of arrow keys waits is made after that run because the
click takes the focus from the threshold, which work package 9 builds
and checks, not the box. Its flows read the Tab order through the
thresholds as the page has them before work package 9, a box and a
line each, which work package 9 keeps.

Work package 8, the number box, touches no file of 1 to 7 and may run
beside any of them. Work packages 3 and 4 both stand on 1 and 2, touch
different files and may run side by side. Work package 5 waits for 3,
whose first project its stores pass. Work packages 6, 7 and 9 to 13 run
one after the other, each on the one before; 9 also stands on 8. The
counts of each work package's checks are written under "What was done",
one entry per work package, as the `building` skill says. At most three agents run at
once, and only one of them runs the build, Playwright or the screens at
a time, since they share `dist/` and the ports.

## Work package 1: the kind `passed` in the worker and in the project

What it gives: a job, a write and a project can hold the filter of the
FILTER column, and the worker applies it with popnei's `filterPassed`
before the list of the individuals kept. Nothing on either page changes,
since no project holds it yet.

Deliverables:

1. The worker applies it where the spec puts it: the tests of
   `runner.md`, "How it is verified", bullet "The filter of the FILTER
   column", on `low_qual.vcf.gz`, `panel.vcf.gz` and `panel.nei`, under
   the tag `SF1 D1` in `src/worker/runner.test.ts` or a file of its own
   beside it; at least six tests, one for each run that bullet names.
2. The messages accept it and `PROTOCOL_VERSION` is 12, 13 since the
   merge of `main` on 8 October 2026: the cases of
   `messages.md`, "How it is verified", that name `passed`, under `SF1
   D2` in `src/worker/messages.test.ts`.
3. The project holds it, first in the fixed order: the cases of
   `project.md`, "How it is verified", bullet "The filters of
   popgen2.html", that concern the kind alone (the FILTER box's
   `setVariantFilter` and `turnOffVariantFilter`, and `parseProject` of
   `passed`, of a field more, and out of order with the text of the
   order), under `SF1 D3`. The property tests of `project.test.ts` and
   `keys.test.ts` draw their kinds from `VARIANT_FILTER_ORDER`, so they
   draw `passed` once it is in the table, with no change, and pass.
4. Every test that existed passes, the browser check of the whole suite
   with `--global-timeout=1500000` among them.

Tasks:

- [ ] 1.1 The worker: `VariantFilter` of `src/worker/protocol.ts`, the
  checks of `src/worker/messages.ts` and `PROTOCOL_VERSION`, the runner's
  `Steps` and `stepsAre` in `src/worker/runner.ts` (`protocol.md`, "The
  filters of the variants are popnei's"; `messages.md`, "The checks";
  `runner.md`, "The steps: the file opened again when they change").
  Deliverables 1 and 2.
- [ ] 1.2 Core and its tables: `VARIANT_FILTER_KINDS` and
  `FILTER_KIND_WORDS` of `src/core/project.ts` and every `switch` over
  the kinds there; `FILTER_NAMES` of `src/core/analyses/filterCounts.ts`,
  "The filter of the FILTER column"; `variantFilterOut` of
  `src/core/projectFile.ts`; the scripts of `src/core/analyses/pca.ts`
  and `ldDecay.ts`; the names of the old page's commands,
  `src/ui/steps/variants/commands.ts` (`project.md`, "The filters of
  popgen2.html", "The validation"). Deliverable 3. The type check fails after
  1.1 alone, since every table keyed by the kinds lacks `passed` until
  1.2, so 1.1 and 1.2 are one commit, or 1.1 is committed only with
  1.2.

What could go wrong: the scripts. `pca.md` and `ldDecay.md` say the
scripts read the filters that apply, and give no Python line for
`passed`, which the old page never prints, since its projects never
hold it. The task writes `<variants>.filter_passed()`, popnei's Python
method of that name, first among the filters, where the runner puts it,
names it in its commit message, and the session records it here.

Work package 2 starts only after the branch `popnei-0.2.2` is merged
into `main` and then into `filters`, as the owner ordered on 7 October
2026: it reads popnei 0.2.2's `keepsPassed`, which popnei 0.2.1 does not
have, and the merge raises `PROTOCOL_VERSION` to 13, from which this
package raises it to 14. The literals of the work packages from here on
are taken under node from popnei 0.2.2, the release that merge installs.
Both are done: `main` was merged into `filters` on 8 October 2026
(fbeab4b), `package.json` names `js-v0.2.2/popnei-0.2.2.tgz` and
`node_modules/popnei` is 0.2.2, `PROTOCOL_VERSION` is 13, and the tests
of work package 1 pass under 0.2.2 with their literals unchanged.

## Work package 2: the filters that apply to the file

popnei 0.2.2 is installed in the worktree since the merge of 8 October
2026, so `keepsPassed` and the `.nei` files that record their FILTER
are there to build on; `PROTOCOL_VERSION` goes from 13 to 14.

What it gives: the page learns, when it opens a variants file, whether
its variants record whether they passed their FILTER, and a project that
holds the filter of the FILTER column while a file without that record
is open, a `.nei` file written before popnei's vars format 1.2, gives
the keys, the jobs, the counts and the words of the same filters
without it, so no job carries `passed` to a file popnei would refuse it
on. A `.nei` file with the record keeps the filter, as a VCF does, as
the owner decided on 7 October 2026 (the design, "What the owner
decided").

Deliverables:

1. The worker answers whether the variants record their FILTER: the
   bullet "The open" of `runner.md`, "How it is verified", on its
   `keepsPassed` of each fixture, and the sentences of the bullet "The
   filter of the FILTER column" on `low_qual.nei`, under `SF2 D1` in
   `src/worker/runner.test.ts` or a file beside it; the cases of
   `messages.md` that name `keepsPassed`, and `PROTOCOL_VERSION` 14,
   under `SF2 D1` in `src/worker/messages.test.ts`. The fixture
   `e2e/fixtures/low_qual.nei`, the `.nei` file popnei 0.2.2's
   `writeVars` writes from `low_qual.vcf.gz` opened with `onlyPassed:
   false`, so that it holds the 1,200 variants and not only the 900
   that passed, is committed, written by `node
   e2e/fixtures/make_fixtures.mjs --low-qual-nei`. With that flag the
   script writes `low_qual.nei` and nothing else. Without it the script
   writes `ld.nei` and `panel_pca.json` again, and under popnei 0.2.2
   the new `ld.nei` records its FILTER, so the test that `keepsPassed`
   is false for `ld.nei` would fail; a flag that writes the one file is
   chosen over a run followed by `git checkout` of the two others, which
   a later run could forget.
2. `keepsPassed`, `filtersApplied` and `filtersAppliedTo`: the cases of
   `project.md`, "How it is verified", bullet "The filters of
   popgen2.html", that name them, the two cases "The FILTER box on, then
   a `.nei` file … opened" of "The cases", and the property that
   `filtersApplied` of every project drawn holds the filters of
   `filters` in their order, but `passed` when `keepsPassed` of its file
   is false, under `SF2 D2`; the read recorded from `opened` with its
   `keepsPassed` (`entry.md`, the table of the outcomes), and a project
   file read with `keepsPassed` from the format (`projectFile.md`, the
   property of "How it is verified"), under the same tag.
3. The keys: the cases of `keys.md`, "How it is verified", "A filter
   turned off is in no key" with `passed` drawn and "The filters that
   apply", with a `.nei` source of each `keepsPassed`, under `SF2 D3` in
   `src/core/keys.test.ts`; the fingerprint given the variants file in
   place of its read options, and its literal hash unchanged.
4. The readers: no request and no write carries `passed` for a file
   whose read says `keepsPassed` false, the property of `store.md`, "How
   it is verified", last paragraph of the sequences, first clause, under
   `SF2 D4`; and, for each analysis of `docs/specs/analyses/` whose
   revision of 7 October 2026 names a reader (its job, key, script,
   rows, check numbers, file name or estimate), one test with `passed`
   on and a `.nei` load whose read says `keepsPassed` false that reads
   the result without `passed`, under `SF2 D4` in that analysis's test
   file.
5. Every test that existed passes; the old page's flows that read the
   filters, `-g "VS|WS|PA"` of the browser check, among them.

Tasks:

- [ ] 2.1 `keepsPassed` in `Opened` of `src/worker/protocol.ts`, its
  check in `src/worker/messages.ts` with `PROTOCOL_VERSION` 14, the
  runner's `open` in `src/worker/runner.ts`, and the fixture with the
  flag `--low-qual-nei` of `e2e/fixtures/make_fixtures.mjs` and its
  sentence in the comment at the head of the script (deliverable 1)
  (`protocol.md`, the interface `Opened`; `messages.md`, the bullet of
  `opened`; `runner.md`, "Opening the load"); and the read of the
  project, `SourceRead` in `src/core/project.ts`, its record from
  `opened` in the page's handling of the outcomes (`entry.md`), and its
  reading from a project file (`project.md`, "The validation"),
  since the compiler asks for `keepsPassed` wherever a read is built.
  Deliverable 1, and the parts of 2 on the read.
- [ ] 2.2 `keepsPassed`, `filtersApplied` and `filtersAppliedTo` in
  `src/core/project.ts`, and the keys and the fingerprint in
  `src/core/keys.ts`, with its callers in `src/core/store.ts` and
  `src/core/projectFile.ts` (`keys.md`, "What it does", the table of the
  inputs and "The fingerprint of the settings"). Deliverables 2 and 3. A
  key that kept `p.filters` would be silent, so this is a commit of its
  own, guarded by deliverable 3.
- [ ] 2.3 Every other reader of `p.filters` in place of the filters
  applied: the analyses of `src/core/analyses/`, `countsOf` and
  `writeCountsOf` of `src/core/apps.ts` (`entry.md`), the job of the
  write in `src/core/store.ts` (`store.md`, "The writing of the filtered
  variants"), `src/core/writeEstimate.ts`, `src/core/fileNames.ts`, and
  the words that name the filters on in `src/ui/` (`project.md`, "The
  filters of popgen2.html", the paragraph of `filtersApplied`, which
  lists what reads `p.filters` as it is). Deliverables 4 and 5.

## Work package 3: the commands of a threshold, and the first project of popgen2.html

What it gives: the one command the screen will send for any of the five
thresholds, with 1 and an empty box as off, and the project
`popgen2.html` starts from.

Deliverables:

1. `setThreshold`, `thresholdValue` and `popgen2FirstProject`: the rest
   of the bullet "The filters of popgen2.html" of `project.md`, "How it
   is verified", the cases of its table of commands for `setThreshold`,
   and the cases "A threshold typed 1 while it is on at 0.3" and "A
   threshold dragged to the top of its axis" of "The cases", under `SF3
   D1`; the property sequences draw `setThreshold` with numbers from 0
   to 1, 1 among them, and `null`.
2. `firstProject("popgen")` unchanged, asserted in the same tag.

Tasks:

- [ ] 3.1 `Threshold`, `setThreshold` and `thresholdValue` in
  `src/core/project.ts`, and `popgen2FirstProject` in `src/core/apps.ts`
  (`project.md`, "The filters of popgen2.html", "A threshold, on or off"
  and "The first project of popgen2.html"; "The commands"). Both
  deliverables. Nothing calls them yet: the store takes the first
  project in work package 5.

## Work package 4: the project file, and the old page's refusal

What it gives: a project file that holds the filter of the FILTER column
is written and read back as any filter, and the old page refuses it with
words that say it was made by the new page.

Deliverables:

1. The fixture `src/core/fixtures/projectFile/v1-passed.popnei.json` opens with
   `passedFilter: true` into the literal project and is written back byte
   for byte; with `passedFilter: false` it, and the same file with
   `passed` in `filtersOff`, are refused as `newPageFilter` with the
   text asserted whole; the same file with a wrong count of a check is
   refused as `header`; `v1-every-filter.popnei.json` opens with
   `passedFilter: false` (`projectFile.md`, "How it is verified", bullet
   "The filter of the FILTER column"), under `SF4 D1`.
2. The old page passes `{ passedFilter: false }`: a test of
   `src/ui/saving.test.ts` under `SF4 D2`; and the old page's flows of
   the saving, `-g "saving"` of the browser check, pass.

Tasks:

- [ ] 4.1 `readProjectFile` with its `page` argument, the step 10 of
  "Opening", the error `newPageFilter` and its text, in
  `src/core/projectFile.ts`, and the fixture (`projectFile.md`,
  "Opening", "The TypeScript interface", "The versions of the format").
  Deliverable 1.
- [ ] 4.2 `createSaving` of `src/ui/saving.ts` passes `passedFilter:
  false` (`projectFile.md`, "What this spec relies on in the specs
  written beside it"). Deliverable 2.

## Work package 5: the store

What it gives: on `popgen2.html` every change of a filter gives a
notice, a crash of the one pass is not wiped by a change of a filter,
and the plots read before a Stop are kept; the store of `popgen2.html`
starts from its own first project. The screens do not show any of it
yet, but the old page shows the new rule of failure (below).

Deliverables:

1. The setting `filterNotices`: the bullet "The filters of
   popgen2.html" of `store.md`, "How it is verified", its sentences on
   the notice, and the case of the notice in a store with `filterNotices`
   true after `startRun` and `cancelRun` (the bullet of the notice and
   the stopped calculations), under `SF5 D1`.
2. The rule of failure: the sentences of the same bullet on a failure
   of kind `crashed`, and the bullet "A refusal" as revised, under `SF5
   D2`; the existing tests of the store that asserted a failure cleared
   by any change are changed to the new rule, and each such change is
   named in the commit message.
3. The result so far kept after a Stop: the sentences of the same bullet
   on `cancelRun`, `stopped` and what forgets it, under `SF5 D3`. The
   code of `soFarred` (`src/core/store.ts`, line 1651 on 7 October
   2026), which today updates the result so far of a request being
   stopped, passes over one that arrives after `cancelRun`.
4. The properties of the sequences, the last paragraph of `store.md`,
   "How it is verified", second and third clauses, under `SF5 D4`.
5. The stores of the two pages: `createPopgen2Store` passes
   `filterNotices: true` and `popgen2FirstProject()`,
   `createPopgenStore` passes `filterNotices: false` and
   `firstProject("popgen")`, tested in `src/ui/popgen2Store.test.ts` and
   `src/ui/popgenStore.test.ts` under `SF5 D5`.
6. The browser check of the whole suite passes. A flow of the old page
   that saw a crash cleared by a change of a setting its analysis does
   not read is changed to the new rule, and named in the commit message.

Tasks, in order, since all are in `src/core/store.ts`:

- [ ] 5.1 `filterNotices` and `filtersChanged` (`store.md`, "The
  notice, and the calculations it stops", the paragraphs of 7 October
  2026), and the two stores. Deliverables 1 and 5.
- [ ] 5.2 The rule of failure (`store.md`, "A calculation that
  failed"). Deliverables 2 and 6.
- [ ] 5.3 `stopped` of the state `ready` (`store.md`, "The state of an
  analysis", the paragraph "A calculation the user stops leaves its last
  result so far"; "The TypeScript interface", `AnalysisStatus`).
  Deliverables 3 and 4.

What could go wrong: the rule of failure changes the old page. The words
of a crash of an analysis stay after a change of a setting that the
analysis does not read, where today they give way to its Run button
(`store.md`, "A calculation that failed", the session's decision of 7
October 2026). The report to the owner says it.

## Work package 6: Undo, Redo and the notice on popgen2.html

What it gives: `popgen2.html` has the row of Undo and Redo above the box
of the file, their keys, and the notice. Before the thresholds change
the project, the user meets them when they open a second file: "Statistics
of the file removed because a new variants file was loaded · Undo",
whose Undo brings the first file back.

Deliverables:

1. The words of the notice apart from `ShellWords`: a test of
   `src/ui/shell/words.test.ts` under `SF6 D1` that `noticeText` gives
   "The MAF filter changed." for a notice with `filtersChanged` and
   nothing else, and "Statistics of the file removed because a new
   variants file was loaded." with the title of the one pass; the old
   page's tests of the notice pass unchanged.
2. Flows under `SF6 D2`, on `panel.vcf.gz` then `panel.nei`: the row is
   there before any file, its buttons disabled; after the second
   opening, the notice with the words above, and its Undo brings back
   the first file and its plots; Ctrl+Z and Ctrl+Y, and Cmd+Z and
   Cmd+Shift+Z in WebKit, do the same; the button that had the focus
   and becomes disabled hands it to the other; the Tab order of the
   screen spec's "Accessibility" from Undo to the open button; F6
   reaches the notice; axe passes with the notice up; at 320 pixels,
   with the notice up and the focus on the last control of the page,
   the notice is not over it.
3. The old page's flows of the shell, `-g "shell|stepper"`, pass
   untouched.
4. The screenshots, below.

Tasks:

- [ ] 6.1 The part of the header that draws Undo and Redo and listens
  for their keys, out of `src/ui/shell/Header.tsx` into a part both
  pages draw; the words of the notice split out of `ShellWords` of
  `src/ui/shell/words.ts`, and `noticeText` for a notice with
  `filtersChanged` (the screen spec, "Undo, Redo and their keys" and
  "The notice"). Deliverables 1 and 3.
- [ ] 6.2 The row and the notice on `popgen2.html`, with the room at the
  bottom of the page while the notice is up (the screen spec, "The order
  of the page", "The notice", "Accessibility", "The notice over the
  focus"). Deliverable 2.
- [ ] 6.3 The screenshots: `popgen2-undo-row` (no file),
  `popgen2-notice` (after the second file), and `popgen2-notice-focus`
  at 320 pixels with the focus on the open button, each in the light and
  the dark theme, at 1280 and 320 pixels. Deliverable 4.

## Work package 7: the FILTER box

What it gives: for a VCF and for a `.nei` file that records the FILTER
of its variants, the check box "Leave out the variants that failed
their FILTER", ticked, at the end of the part of the variants, with its
line, in every state of the statistics; each click a change of the
project with its notice; shown only once the opening of the file has
answered `keepsPassed` true in the read of the file, so not for a
`.nei` file without that record, not while a file is being opened and
not after an opening that failed, whatever the format; the page reads
the read, not `keepsPassed(source)`, which answers by the format before
it (the screen spec, "The FILTER box"). It was work package 9 until 8
October 2026, when the owner asked for it soon.

Deliverables:

1. `Checkbox` with `description`: the line drawn under the box and tied
   to it by `aria-describedby`; its doc comment as the screen spec
   says. Under `SF7 D1`, in jsdom as `src/ui/variants/VariantsPage.test.ts`
   draws a component. The old page's flows that use the check box,
   `-g "VS|IP"` of the browser check, pass untouched.
2. Flows under `SF7 D2`: the box is there and ticked for
   `panel.vcf.gz` and for `low_qual.nei` once each is opened, and not
   for `panel.nei`, nor while `panel.vcf.gz` is being opened, nor after
   `no_ploidy.vcf.gz`, whose opening fails; a
   click gives the notice "The filter of the FILTER column was turned
   off · Undo", changes no plot and sends nothing to the worker, and
   Undo ticks it again; ticked off for a VCF, then `panel.nei` opened,
   then `low_qual.nei`, it is off there, and still off for the VCF
   again; it is there while the pass runs, after a Stop and after a crash,
   and a click after a crash leaves the words of the crash; its line is
   read as its description; the Tab order puts it after the four
   histograms of the variants and before the part of the individuals;
   axe passes.
3. The screenshots: `popgen2-filter-box`, light and dark, 1280 and 320
   pixels, and the box in the states locked, running and error already
   shot, taken again.

Tasks:

- [ ] 7.1 `description` of `src/ui/widgets/Checkbox.tsx` (the screen
  spec, "The FILTER box", the paragraph of `description`). Deliverable 1.
- [ ] 7.2 The box, its line and its commands (the screen spec, "The
  FILTER box"; "What it sends and reads"; "The states"). Deliverables 2
  and 3.

## Work package 8: the options of the number box

What it gives: the number box the thresholds need, with no change on
either page.

Deliverables:

1. `NumberField` with its options for `popgen2.html`: Enter, Tab and
   leaving an emptied box call the call of "off", and the box then
   shows the number the page gives it; Escape and Ctrl+Z put back the
   number; the grey look of its number, which the piece `popnei-0.2.2`
   built as the option `muted`, in the token
   `--chart-threshold-keeps-all`, and which is kept; a description read by a screen
   reader alone, tied by `aria-describedby`; the call through which the
   page chooses the number an arrow key gives; without the options, an
   emptied box gives nothing and shows its number again, as today.
   Under `SF8 D1`, in jsdom.
2. The grey is the one token of `src/ui/tokens.css` that the piece
   `popnei-0.2.2` added, `--chart-threshold-keeps-all`, for the number,
   the line and the handle, with a contrast of at least 4.5:1 against
   the background, and so at least 3:1 for the line against the plot, in
   both themes, already checked by `src/ui/tokens.test.ts`; no token is
   added, and that test passes untouched.
3. The old page's flows that use the number box, `-g "VS|IP"` of the
   browser check, pass untouched.

Tasks:

- [ ] 8.1 `src/ui/widgets/NumberField.tsx`, with the token of the grey as it is (the
  screen spec, "The number box"; "Accessibility", "The grey in words").
  All deliverables.

## Work package 9: the thresholds as filters

Since the merge of main on 8 October 2026 (fbeab4b): the screen reader's
words of a threshold that removes nothing differ between this plan's
screen spec ("0.1, keeps every variant of the plot", "This filter
removes …") and what main built ("1, keeps every variant", "This
threshold removes no variant."). This package settles one set, in the
spec and the code.

What it gives: each of the five thresholds shows the project's value,
on or off, in grey when it keeps every value of its plot, and changes
the project once per drag, per number committed and per run of arrow
keys, with its notice and its step of Undo. The expected heterozygosity
loses its line and its box. The thresholds stay through the opening of
another file.

Deliverables:

1. The run, in a module of its own under `src/ui/variants/`, with fake
   timers, under `SF9 D1`: a press makes no command by itself; the end
   of a run, a second after its last press or when the focus leaves,
   makes one; a run that ends where it started makes none; a run waiting
   is made a command before any other command is let through.
2. The line's prop of the end of a drag, in
   `src/ui/widgets/ThresholdSlider.tsx`: called at the release of a
   pointer after a move, never at a key, under `SF9 D2` in jsdom.
3. Whether a threshold is grey, in `src/core/thresholds.ts`, under `SF9
   D3`: the cases of the Vitest paragraph of the screen spec's "How it
   is checked", at an edge of the fine bins with a variant just above
   it and with none, and for the individuals at the largest value and
   just below it; off is grey.
4. The words, in `src/ui/variants/statsWords.ts` and its neighbours,
   under `SF9 D4`: the line's value and the box's description of a
   threshold in its three looks, the number refused while off, the
   individuals with no value, and a notice's description from
   `thresholdValue` before and after; each row of the screen spec's "Its
   words" that concerns a threshold.
5. Flows under `SF9 D5`, on `panel.vcf.gz` and `panel.nei`, one test for
   each bullet of the screen spec's "How it is checked" that concerns
   the thresholds: no request to the worker after the one pass, while a
   threshold is dragged, typed, moved with the keys, turned off or
   undone; a drag is one step of Undo and Undo moves the line and the
   box back; a run of ten presses is one step and one notice, and Ctrl+Z
   within the second undoes it, Redo bringing it back; a run waiting
   then a click on the FILTER box gives two steps of Undo, the run's
   first; emptying the box, typing 1, and dragging the MAF's line to 1
   each turn the filter off, with 1 in the box and the line at the top
   of the axis, both grey, no shading, and the screen reader's words of
   off, and Undo turns it on at its value; the missing rate at 0.1 on
   `panel.nei` grey, and out of the grey at 0.05; the grey's line
   dotted and its handle hollow, and its contrasts read from the
   computed colours; 0 typed is a filter at 0
   with no sentence; Down in the box from off gives one step below the
   top of the axis; Down then Up from off leaves no step and no notice;
   a crash of the worker while a run waits keeps the run as a step of
   Undo and puts the focus on the heading "Popnei"; the expected
   heterozygosity has no line and no box; the thresholds stay through
   another file; no plot changes with a threshold. axe passes with a
   threshold off, on, and on and grey.
6. The existing flows of the thresholds, `e2e/thresholds.spec.ts`, are
   changed where the screen spec changes them, and only there: "TH2 at
   the start" (the four others off, not at the top of their axis) and
   "TH2 another file starts the thresholds again" (they stay); each
   change is named in the commit message, and the rest of `-g "TH|FS"`
   passes.
7. The screenshots, below.

Tasks:

- [ ] 9.1 The run and the line's prop of the end of a drag (the screen
  spec, "When a threshold changes the project", "The end of a drag, and
  the keys"). Deliverables 1 and 2.
- [ ] 9.2 The thresholds on the project: `src/ui/variants/FileStats.tsx`,
  `StatsHistogram.tsx` and `statsPlots.ts` read `thresholdValue` and send
  `setThreshold` with its description, through the run of 9.1; the
  state of the page's own thresholds, `START_THRESHOLDS`, goes; the
  grey, worked out in `src/core/thresholds.ts` and drawn on the line of
  the histogram of `src/charts/` and on its handle with what the piece
  `popnei-0.2.2` brought, the dotted line of the class
  `chart-threshold-keeps-all` of `src/charts/charts.css`, the hollow
  handle of `ThresholdSlider`, both in the token
  `--chart-threshold-keeps-all`, which `docs/specs/charts/histogram.md`
  already says; a threshold off, 1 as
  off, Down from off in the box, the top of the axis, 0 as a filter at
  0, the number refused while off, the individuals with no value, the
  expected heterozygosity, the thresholds through another file (the
  screen spec, "A threshold, on and off", "The number box", "The
  starting values and another file", "The expected heterozygosity";
  "What it sends and reads"). Whatever the merge of `popnei-0.2.2` still
  has of the line "Keeps …" (`keepsLine` of `statsWords.ts`), of the
  raise to 0.001 (`THRESHOLD_RAISED_LINE`, `LEAST_VARIANT_THRESHOLD`)
  and of their tests, flows and screenshots goes here, each named in
  the commit message. Deliverables 3, 4 and 6.
- [ ] 9.3 A run waiting made a change before every other command, Undo,
  Redo, the notice's action, another threshold, a click on the FILTER
  box, an opening by the button, a drop or a paste; Ctrl+Z and Ctrl+Y
  caught by the threshold while it holds a run; a threshold that leaves
  the page (the screen spec, "A run waiting is made a change before any
  other command", "A threshold that leaves the page"). Deliverable 5.
- [ ] 9.4 The screenshots: `popgen2-threshold-off`,
  `popgen2-threshold-on` and `popgen2-threshold-grey` (the missing rate
  at 0.1 on `panel.nei`) with the notice of the change up, light and
  dark, 1280 and 320 pixels; and the existing `popgen2-thresholds-moved`
  and `popgen2-thresholds-focus` taken again. Deliverable 7.

What could go wrong:

- The end of a drag. React Aria calls `onChangeEnd` at every press of a
  key too (the screen spec, "The end of a drag, and the keys"), so the
  prop is built on the pointer's own events; WebKit gives them in
  another order than Chromium on a touch screen, which Playwright does
  not emulate. The owner tries the drag with a trackpad in Safari at the
  stop.
- The crash while a run waits needs the worker to crash after a result
  so far, when the thresholds are on the page. `e2e/crashWorker.ts`
  crashes it at a message from the page, before any result so far; the
  flow needs a crash on demand, a few lines added to the worker's script
  as `e2e/holdWorker.ts` adds them, released by its BroadcastChannel.
- Ctrl+Z on the line: the page's listener on `window` reads the key
  after the threshold, so the threshold makes its run a change in its
  own handler and lets the event go on; if a browser delivers the
  window's listener first, the flow of deliverable 5 fails in that
  engine.
- The grey of `popnei-0.2.2`. That piece, merged here on 8 October
  2026, draws a threshold of its page-state thresholds, which have no
  off, that keeps every value of its plot in the bluish grey of the
  token `--chart-threshold-keeps-all`, its line dotted and its handle
  hollow; 9.2 draws a threshold that is off the same way, so that the
  grey is drawn one way.

## Work package 10: the plots after a Stop

What it gives: after a Stop, the plots read before it stay, each part
and each count under a heading saying they are of the variants read
before the Stop, and the thresholds still move over them.

Deliverables:

1. The words of a Stop, each row of the screen spec's "Its words" and
   each sentence of its "The plots after a Stop" that ends "before the
   Stop", under `SF10 D1` in `src/ui/variants/statsWords.test.ts`, and
   the room under each plot of the individuals holding the sentence on
   the individuals with no called genotype in its words of a Stop.
2. Flows under `SF10 D2`, with `e2e/holdWorker.ts`: a Stop after a
   result so far keeps the plots with the words of a Stop, and they do
   not move; a threshold moved over them changes the project, and its
   grey is of the variants read; Start
   again drops them and reads the file again; another file drops them; a
   Stop before the first result so far leaves no plots and the words of
   today; a failure drops them; axe passes. The flow of the Stop in
   `e2e/fileStats.spec.ts` ("FS2 the statistics come from the pass of
   the count"), which sees the plots go at a Stop, is changed to see them
   stay, named in the commit message.
3. The screenshots: `popgen2-stats-stopped-plots`, light and dark, 1280
   and 320 pixels; `popgen2-count-stopped`, a Stop before any result so
   far, taken again.

Tasks:

- [ ] 10.1 `FileStats.tsx` draws `stopped` of the state `ready`, and the
  words of a Stop (the screen spec, "The plots after a Stop"). All
  deliverables.

## Work package 11: the stop, the owner tries the page

- [ ] 11.1 The session runs the review of the `code-review` skill over
  work packages 6 to 10, with their screenshots (work package 7 may be
  reviewed as it ends, since 8 and 9 do not touch it), fixes what holds, and
  takes the screenshots again; then reports to the owner as the
  `building` skill says, with how to start the page from the worktree
  (`npm run dev`, `popgen2.html`, the files `e2e/fixtures/panel.vcf.gz`,
  `low_qual.vcf.gz`, `panel.nei` and `low_qual.nei`), the states worth
  going through, and four questions: whether the screen is accepted; the words and the
  layout the session chose, the list of the screen spec's "Words and
  layout chosen by the session"; Open 1, the sentence on the variants
  with no called genotype, with the screen spec's options, its
  recommendation (below, work package 12); and what VoiceOver says,
  in Safari, of a run of ten presses on a line (one notice), of a
  threshold that is off (its box "1" with "This filter removes
  nothing.", its line "1, keeps every variant"), of one on and grey
  ("0.1, keeps every variant of the plot") and of the FILTER box with
  its sentence. The screen spec asks for VoiceOver to be heard
  "before the plan is settled", which cannot be done before the screen
  exists; the session cannot run VoiceOver, so the owner hears it
  here.
- [ ] 11.2 The rounds. Two are expected. Each change the owner asks for
  goes into the screen spec first, then into the code, with its commit
  and its screenshots taken again; a change that reaches `src/core/`,
  the worker or `docs/functionality.md` is said to the owner as such and
  becomes a task of its own. After a round that changed the markup, the
  `accessibility`, `react` and `ux` reviewers run again.
- [ ] 11.3 The owner accepts the screen, and the screen spec says what
  the screen now is.

The work packages 1 to 5 are reviewed as each ends, as the `building`
skill says; the stop does not wait for them, since none changes what the
owner tries.

## Work package 12: the variants with no called genotype, only if the owner says yes

Not done: the owner answered "nothing" on 7 October 2026.

Done only when the owner answers Open 1 of the screen spec with the
sentence; otherwise its boxes are ticked with "not built: the owner chose
nothing" and the screen spec's Open 1 is closed with that answer.

What it gives: under the plots of the MAF and of the observed
heterozygosity of the variants, "15 variants with no called genotype are
not in the histogram, and this filter removes them.", while the filter
is on; without "and this filter removes them" while it is off; no
sentence when there are none.

Deliverables:

1. The count, in `src/core/thresholds.ts`, under `SF12 D1`, as the
   owner's answer and the screen spec give it; and a fixture with
   variants with no called genotype, made by `make_fixtures.mjs` with
   popnei under node, under a flag of its own that writes that file
   alone, as `--low-qual-nei` does (work package 2), since a run
   without one writes `ld.nei` and `panel_pca.json` again; its count
   is asserted. No fixture has such a
   variant on 7 October 2026 (the screen spec, Open 1).
2. The words, on, off, one variant and after a Stop, under `SF12 D2`.
3. A flow under `SF12 D3` on that fixture, the sentence on and off; and
   on `panel.vcf.gz`, which has no such variant, no sentence.
4. The screenshots of the two plots with the sentence, light and dark.

Tasks:

- [ ] 12.1 The owner's answer recorded in the screen spec, Open 1 closed
  and the sentence added to "Its words".
- [ ] 12.2 The count, the fixture, the words and the sentence. All
  deliverables. Then the `ux` and `accessibility` reviewers on it, and
  the owner sees it.

What could go wrong: the count. The screen spec takes it as the
variants of the file less the sum of popnei's bins of the MAF, exact at
any number of individuals since popnei puts in those bins only the
variants with a value (checked by the session under node with popnei
0.2.1 on 7 October 2026: 4 variants, one with no called genotype, 3 in
the bins of the MAF). The new fixture has such variants, and a test
checks the count against popnei's own on it.

## Work package 13: the end

- [ ] 13.1 The checks of the `coding` skill on the last commit, the
  browser check of the whole suite with `--global-timeout=1500000`, and
  the screens run of `popgen2`; their counts recorded below.
- [ ] 13.2 The documents: `docs/specs/steps/popgen2-filters.md` says it
  is built and accepted; `docs/architecture.md` and
  `docs/functionality.md` checked against what was built, and changed
  where a round changed what they say; "What was done" below complete.
- [ ] 13.3 The report to the owner, as the `building` skill says, with
  the browsers the screens were seen in. The branch is merged into
  `main` when the owner says so.

## What was done

### Work package 1, 7 October 2026

Commit d6475fc (tasks 1.1 and 1.2 together, since the type check needs
both). Different from the plan: the property tests did not draw
`passed` by themselves, since the arbitraries of `src/core/testSupport.ts`
listed the kinds; they now take the kinds and their number from
`VARIANT_FILTER_ORDER`. The scripts print `<variants>.filter_passed()`
first among the filters, before `filter_individuals`, where the runner
puts it, with a script test for the PCA and the LD decay. One line each
in `src/ui/analyses/pca/words.ts`, `src/core/projectFile.ts` and
`commands.ts` for the compiler's switches over the kinds.
`PROTOCOL_VERSION` 12.

Checks on d6475fc: typecheck and lint clean, Vitest 4,054 tests in 118
files (4,035 before), format clean; the whole browser suite, 619 passed
in Chromium and 619 in WebKit (the implementer's run).

Review, spec and stale; tests and api. The tests of the package fail on
the code before it, and four mutations of the new code are caught; the
numbers were recounted in Python from the genotypes. Fixed in 93c747b:
two doc comments that gave the order of the filters without `passed`.
Noted, not fixed here: the warning `filterKeptNone` of
`src/core/analyses/filterCounts.ts` would tell the user to loosen the
filter of the FILTER column, which has no number; no page shows it
today, and the piece that carries the filters out words it. Not to be
merged before package 4, since until then `popgen.html` would open a
project file holding `passed` without a box to show it.

The review found that a `.nei` file written from a VCF records its
FILTER, which popnei 0.2.2 tells by `keepsPassed`; the owner decided on
7 October 2026 that the FILTER box shows and acts for such a file
(a1a4a8a, 728cf14, 0383590).

### Work package 2, 8 October 2026

Commits b2d80e6 (2.1: the reply to opening a file carries
`keepsPassed`, PROTOCOL_VERSION 14, the fixture `low_qual.nei` written by
`make_fixtures.mjs --low-qual-nei`), b528be4 (2.2), cb19d8b (2.3).
Different from the plan: `keyInputs` of the PCA and the LD decay read
`p.variants` through `filtersApplied`; the session decided that this is
the rule (`keyInputs` reads the variants file only through whether it
recorded its FILTER, and a key stays across the read only while that
answer is the same), since every analysis is locked until the read
comes back.

Checks on cb19d8b: Vitest 4,141 in 119 files; the rest clean;
Playwright 622 in Chromium and 622 in WebKit.

Review: architecture and spec; api and errors; tests and stale. No
result shown under a key that does not hold its inputs, and no path
left for `passed` to reach popnei over a file that did not record its
FILTER. Found: the comparison of a project file's numbers would be lost,
or falsely said to differ, for a `.nei` that records its FILTER and for
the PCA and the LD decay, once `popgen2.html` saves projects; an import
cycle keys.ts ↔ project.ts; two words of 2.3 untested; a key property
narrowed more than needed; test fixtures giving a VCF `keepsPassed`
false; a stale comment; a test that failed under load. Fixed in
8d14845, f402c90, bebb6fe, 4800dc6, 12c5f09, b3b1194, 5151f16: each
check keeps, from the opening, one fingerprint for each answer of
`keepsPassed`, and the comparison takes the one of the file once it is
read (the project file's format unchanged); the three functions in
`src/core/filtersApplied.ts`; the specs keys.md, store.md, projectFile.md,
project.md, pca.md, ldDecay.md say the rule. Vitest 4,197, twice;
Playwright 622 and 622.

### Work package 3, 8 October 2026

Commit 963cde6: `setThreshold`, `thresholdValue`, `popgen2FirstProject`,
in one commit (the package is one task). Checks: Vitest 4,221; the
flows of popgen2 and of the old Variants step in Chromium and WebKit.
A second look at the fix of work package 2 found that a save before the
variants file is read again could carry a saved check beside settings
whose FILTER filter had been switched since the opening; fixed in
951098e (a check is carried then only when both its fingerprints
match), latent today. Review of the package, spec and tests; api and
errors: no defect a user can reach. Fixed in be99c43: the value given to
`setThreshold` is already on the step of its axis, so only an exact 1 is
off (doc comment, spec, tests at 1 ± 1 ulp), and -0 is stored as 0; one
predicate for the range; the test of the drawn commands checks the 15
pairs of threshold and kind of value; `setThreshold` drawn more often,
every transition reached in 10 or more of 20 seeds. Noted: fast-check
draws arrays of at most 10 commands whatever `maxLength` says, unless
its size is set. Vitest 4,231, twice.

### Work package 4, 8 October 2026

Commits 41b15f3 (`readProjectFile` takes the page; the refusal
`newPageFilter` after the checks of a damaged file; the fixture
`src/core/fixtures/projectFile/v1-passed.popnei.json`; `createSaving`
passes `{ passedFilter: false }`), 08a4aaf (the test of the old page,
an e2e flow and its screens, beyond the plan), ec9f719 (the sequences of
30 drawn commands reach 30, `size: "max"`, 70 ms and 11 ms). Vitest
4,242; Playwright 220 in Chromium and 220 in WebKit.

Review: spec, tests and errors; ux and accessibility. The refusal is
where the spec puts it and four mutations are caught. The words misled:
they said the page "cannot show" the FILTER choice while a FILTER box,
a reading option, stands behind the dialog. Fixed in 2a0673c with the
session's words of 8 October 2026 (Open 4 of projectFile.md closed):
"pops.popnei.json was saved by popgen2.html, the new page of population
genetics. Its filter of the FILTER column works differently from the
box on this page, so it was not opened. The file is unchanged: open it
in popgen2.html.", "popgen2.html" a link that opens a new tab and says
so (core exports the address, the ui makes the link). Fixed in f0d9133:
the fake counts of a store property had four counts for five kinds of
filter, a failure 2 times in 13. Vitest 4,244, twice; e2e saving 33 and
33; screens of the shell 40.

### Work package 5, 8 October 2026

Commits 15e19c3 (5.1: `filterNotices`, `filtersChanged`, the two
stores; popgen2.html's starts from `popgen2FirstProject()`, which
changes nothing on its screen yet, since no part of it reads the
project's filters), 33becc4 (5.2: a failure that is not popnei's is
forgotten only by a change that leaves its key behind; on popgen.html a
crash's words now stay after a change of a setting that analysis does
not read, with Run beside them), ad2ab23 (5.3: `stopped: { soFar }`;
a late result so far passed over). Vitest 4,270; Playwright 623 in
Chromium and 623 in WebKit.

Review: architecture and spec; tests and react. No result shown under
a key that is not current. Fixed in 0f6db4c: a failure that ends after
a change left its request behind is dropped, so Undo gives `ready`
(store.md says so); a test of the defect path that forgets `stopped`;
a test of the notice for a change of a filter of the individuals alone.
Noted, not fixed: a change of popnei's version mid-session stops
everything and drops a notice of a filter change; a failure of a request
the user stopped, ending after a new Run under the same key, is kept
(pre-existing, needs the worker to answer `failed` after a cancel).
Vitest 4,273, twice.

### Work package 6, 8 October 2026

Commits 7f7e21e (6.1: Undo and Redo and their keys in
`src/ui/shell/UndoRedoButtons.tsx`, drawn by both pages; the notice's own
words, `NoticeWords`), 080d7ae (6.2: the row and the notice on
popgen2.html; `Toast.tsx` watches the page's height so the notice never
covers the focused control at 320 px), 005baa8 (6.3: screens). Vitest
4,277; Playwright 630 in Chromium and 630 in WebKit.

Review: ux and accessibility; react and tests. Fixed in 9ca92a9,
ba77c99, 55493d3, d3408b7, 035b467, e528ba5: Ctrl+Z on a threshold
undid the opening of the file (the thresholds are the section's own
state until work package 9), so the line and the box keep the keys of
Undo and Redo until then; an opening is described by the file's name,
"Undo: panel.nei opened", and the notice reads "Statistics of the file
removed because panel.nei opened"; a pass the store stopped because a
change left its key behind starts again when Undo or Redo brings the
key back (the owner's decision of 6 October 2026, built here for the
chain of popgen2.html, since an undone and redone opening showed
"Stopped" though the user never pressed Stop); the notice scrolled the
page back to the focused control while the user read (reproduced: 0 to
169 px), now only when the notice appears or grows or the page pushes a
clear control under it; a check at 320 px polled; a release of the
held worker waits until the worker listens. Vitest 4,282, twice;
Playwright 633 in Chromium and 633 in WebKit; e2e/popgen2Undo five
times over, 100 passed. Left for the owner: at 1280 by 720 the notice
covers the bottom edge of the box of "Open another variants file…",
not its button; the notice of a second file goes when its statistics
are done, under a second for panel.nei.

### Work package 7, 8 October 2026

Commits 7f7992e (7.1: the check box's `description`), acf012b (7.2: the
box, `PassedFilterBox.tsx`, `passedFilter.ts`), 6d9f0d8 (flows), 2783213
(screens), 615c452 (the helper of flow FS2 read the box's label as a
seventh title). Vitest 4,290; Playwright 640 in Chromium and 640 in
WebKit.

Review: ux and accessibility; react, tests and spec. The rules of the
box hold (shown only after a read with `keepsPassed`, Undo and Redo
across files right, every mutation of its rules caught). Fixed in
2212ac0, b89d9e7, 2e8229d: the words, chosen by the session: under the
box "The plots show every variant. The ones that failed are left out of
what is downloaded or analysed.", the notice and the hints in the box's
own words, "The variants that failed their FILTER are left out" / "…are
kept"; the room of the plots kept from the start, so that the box, the
individuals' part and the open button do not move when the plots
arrive (this reverses the choice of `docs/plans/live-stats.md`, "the
open widget moves with the plots", for the owner to judge); the box one
element across the download of the plots' code, so the focus stays on
it; a failed download of that code tied to its file (WebKit retried at
once). Not taken: the count in the box's label ("Leave out the 300
variants…"), since the owner asked for fewer counts and the count is in
the file's box. Vitest 4,291, twice; Playwright 641 in Chromium and 641
in WebKit; screens 136. VoiceOver not heard.

### The owner's round on work package 7, 8 October 2026

The owner tried the FILTER box and asked: no notice when the box is
unticked ("Let's assume that the user knows what he's doing"), and no
Undo of the opening of a file ("not necessary"). The session reads it
as: on popgen2.html no change of a filter gives a notice, the box's and
the thresholds' alike; opening a file starts the page's history afresh,
so Undo and Redo stay for the changes of the filters, which the owner
decided on 7 October 2026 are undone; and since no notice is left on
that page, the notice comes off popgen2.html (the old page keeps its
own). The store's setting `filterNotices` then serves nothing and goes,
with its spec. Work package 9 follows: no notice for the thresholds.

Built in d0a5cdc, 8d6924d, 956b5a3, dbd5557, d5e6bf6: the store's
`filterNotices`, `filtersChanged` and `sameFilters` removed; the notice
off popgen2.html; popgen2.html opens a variants file through the store's
`open` (`openVariantsFile` of `src/ui/popgen2Store.ts`), which starts a
new history, stops the previous pass and keeps the filters; the
forgetting of keys left behind in `autoRuns.ts` reverted, since no Undo
crosses files now; the old page unchanged. Vitest 4,275 (tests of the
removed features gone with them); Playwright 638 in Chromium and 637 in
WebKit (one old-page flow, IP5 D2, passed 3 of 3 when run again).
Review, architecture and react: `open` brings nothing of a project file
to popgen2.html, and no result of a previous file can be shown under the
new one; the store spec's reason for stopping at an opening said for
popgen2.html too. Noted for later: the cache entries and the `File`
handles of the files opened before stay until evicted, unreachable.
