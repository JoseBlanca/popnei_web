# Plan: the thresholds of popgen2.html as filters, with Undo

7 October 2026; approved by the owner the same day, with Open 1 of the
screen spec answered "nothing", so work package 12 is not done. It builds the design `docs/designs/stats-filters.md`, approved by
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
off with "No filter" in their boxes, and the FILTER box ticked; moves a
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
  (`project.md`, "Not in this spec"); exact counts of a threshold on
  popnei's bins: the piece `popnei-0.2.2`.

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
the row of Undo and Redo, which the notices of the thresholds need; the
widgets; the thresholds; the FILTER box; the plots after a Stop.

Work package 7, the widgets, touches no file of 1 to 6 and may run
beside any of them. Work packages 3 and 4 both stand on 1 and 2, touch
different files and may run side by side. Work package 5 waits for 3,
whose first project its stores pass. Work packages 6 and 8 to 13 run one
after the other, each on the one before; 8 also stands on 7. The
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
2. The messages accept it and `PROTOCOL_VERSION` is 12: the cases of
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

## Work package 2: the filters that apply to the file

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

1. The fixture `src/core/fixtures/v1-passed.popnei.json` opens with
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

## Work package 7: the options of the number box and of the check box

What it gives: the two widgets the thresholds and the FILTER box need,
with no change on either page.

Deliverables:

1. `NumberField` with the option of an empty box: Enter, Tab and leaving
   an emptied box call the call of the option and show the option's
   words in the empty box; Escape and Ctrl+Z put back the number; without
   the option, an emptied box gives nothing and shows its number again,
   as today. Under `SF7 D1`, in jsdom as `src/ui/variants/VariantsPage.test.ts`
   draws a component.
2. `Checkbox` with `description`: the line drawn under the box and tied
   to it by `aria-describedby`; its doc comment as the screen spec
   says. Under `SF7 D2`, in jsdom.
3. The old page's flows that use the two widgets, `-g "VS|IP"` of the
   browser check, pass untouched.

Tasks:

- [ ] 7.1 Both widgets, `src/ui/widgets/NumberField.tsx` and
  `Checkbox.tsx` (the screen spec, "The number box" and "The FILTER
  box", the paragraph of `description`). All deliverables. The grey of
  the words in an empty box is a token of `src/ui/tokens.css` with a
  contrast of at least 4.5:1 against the box in both themes, checked by
  `src/ui/tokens.test.ts`.

## Work package 8: the thresholds as filters

What it gives: each of the five thresholds shows the project's value,
on or off, and changes the project once per drag, per number committed
and per run of arrow keys, with its notice and its step of Undo. The
expected heterozygosity loses its line and its box. The thresholds stay
through the opening of another file.

Deliverables:

1. The run, in a module of its own under `src/ui/variants/`, with fake
   timers, under `SF8 D1`: a press makes no command by itself; the end
   of a run, a second after its last press or when the focus leaves,
   makes one; a run that ends where it started makes none; a run waiting
   is made a command before any other command is let through.
2. The line's prop of the end of a drag, in
   `src/ui/widgets/ThresholdSlider.tsx`: called at the release of a
   pointer after a move, never at a key, under `SF8 D2` in jsdom.
3. The words of a threshold off, of the individuals with no value, and
   of a notice's description from `thresholdValue` before and after, in
   `src/ui/variants/statsWords.ts` and its neighbours, under `SF8 D3`:
   each row of the screen spec's "Its words" that concerns a threshold.
4. Flows under `SF8 D4`, on `panel.vcf.gz` and `panel.nei`, one test for
   each bullet of the screen spec's "How it is checked" that concerns
   the thresholds: no request to the worker after the one pass, while a
   threshold is dragged, typed, moved with the keys, turned off or
   undone; a drag is one step of Undo and Undo moves the line and the
   box back; a run of ten presses is one step and one notice, and Ctrl+Z
   within the second undoes it, Redo bringing it back; emptying the box,
   typing 1, and dragging the MAF's line to 1 each turn the filter off,
   with "No filter" in the box and beside the line and no shading, and
   Undo turns it on at its value; Down then Up from off leaves no step
   and no notice; a crash of the worker while a run waits keeps the run
   as a step of Undo and puts the focus on the heading "Popnei"; the
   expected heterozygosity has no line and no box; the thresholds stay
   through another file; no plot changes with a threshold. axe passes
   with a threshold off and on.
5. The existing flows of the thresholds, `e2e/thresholds.spec.ts`, are
   changed where the screen spec changes them, and only there: "TH2 at
   the start" (the four others off, not at the top of their axis) and
   "TH2 another file starts the thresholds again" (they stay); each
   change is named in the commit message, and the rest of `-g "TH|FS"`
   passes.
6. The screenshots, below.

Tasks:

- [ ] 8.1 The run and the line's prop of the end of a drag (the screen
  spec, "When a threshold changes the project", "The end of a drag, and
  the keys"). Deliverables 1 and 2.
- [ ] 8.2 The thresholds on the project: `src/ui/variants/FileStats.tsx`,
  `StatsHistogram.tsx` and `statsPlots.ts` read `thresholdValue` and send
  `setThreshold` with its description, through the run of 8.1; the
  state of the page's own thresholds, `START_THRESHOLDS`, goes; a
  threshold off, 1 as off, the top of the axis, the number refused while
  off, the individuals with no value, the expected heterozygosity, the
  thresholds through another file (the screen spec, "A threshold, on and
  off", "The starting values and another file", "The expected
  heterozygosity"; "What it sends and reads"). Deliverables 3 and 5.
- [ ] 8.3 A run waiting made a change before every other command, Undo,
  Redo, the notice's action, another threshold, an opening by the
  button, a drop or a paste; Ctrl+Z and Ctrl+Y caught by the threshold
  while it holds a run; a threshold that leaves the page (the screen
  spec, "A run waiting is made a change before any other command", "A
  threshold that leaves the page"). Deliverable 4.
- [ ] 8.4 The screenshots: `popgen2-threshold-off` and
  `popgen2-threshold-on` with the notice of the change up, light and
  dark, 1280 and 320 pixels; and the existing `popgen2-thresholds-moved`
  and `popgen2-thresholds-focus` taken again. Deliverable 6.

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
  window's listener first, the flow of deliverable 4 fails in that
  engine.

## Work package 9: the FILTER box

What it gives: for a VCF and for a `.nei` file that records the FILTER
of its variants, the check box "Leave out the variants that failed
their FILTER", ticked, at the end of the part of the variants, with its
line, in every state of the statistics; each click a change of the
project with its notice; shown only once the opening of the file has
answered `keepsPassed` true in the read of the file, so not for a
`.nei` file without that record, not while a file is being opened and
not after an opening that failed, whatever the format; the page reads
the read, not `keepsPassed(source)`, which answers by the format before
it (the screen spec, "The FILTER box").

Deliverables:

1. Flows under `SF9 D1`: the box is there and ticked for
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
2. The screenshots: `popgen2-filter-box`, light and dark, 1280 and 320
   pixels, and the box in the states locked, running and error already
   shot, taken again.

Tasks:

- [ ] 9.1 The box, its line and its commands (the screen spec, "The
  FILTER box"; "What it sends and reads"; "The states"). Both
  deliverables.

## Work package 10: the plots after a Stop

What it gives: after a Stop, the plots read before it stay, each part
and each count under a heading saying they are of the variants read
before the Stop, and the thresholds still move over them.

Deliverables:

1. The words of a Stop, each row of the screen spec's "Its words" that
   ends "before the Stop", under `SF10 D1` in
   `src/ui/variants/statsWords.test.ts`, and the room of the longest
   count under a heading holding them.
2. Flows under `SF10 D2`, with `e2e/holdWorker.ts`: a Stop after a
   result so far keeps the plots with the words of a Stop, and they do
   not move; a threshold moved over them changes the project; Start
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
  work packages 6 to 10, with their screenshots, fixes what holds, and
  takes the screenshots again; then reports to the owner as the
  `building` skill says, with how to start the page from the worktree
  (`npm run dev`, `popgen2.html`, the files `e2e/fixtures/panel.vcf.gz`,
  `low_qual.vcf.gz`, `panel.nei` and `low_qual.nei`), the states worth
  going through, and four questions: whether the screen is accepted; the words and the
  layout the session chose, the list of the screen spec's "Words and
  layout chosen by the session"; Open 1, the sentence on the variants
  with no called genotype, with the screen spec's options, its
  recommendation (below, work package 12); and what VoiceOver says,
  in Safari, of a run of ten presses on a line (one notice), of an empty
  box (it should say "No filter: keeps every variant") and of the FILTER
  box with its sentence. The screen spec asks for VoiceOver to be heard
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
