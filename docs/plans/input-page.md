# Plan: the input page of popgen2.html, with the individuals file

9 October 2026. A draft, for the owner's approval. Once approved it is
carried out without a stop for the owner before its last work package,
in which they try the page; what would be a stop by the `building`
skill is named below ("The stops"), with what the session does
meanwhile. Three questions are asked before it runs ("Three questions
asked before the plan runs").

It builds the design `docs/designs/input-page.md`, approved by the owner
on 9 October 2026 with the five answers of its "What the owner decided",
and the choices of its "What the session decided". `popgen2.html` gains
a second file, the individuals file, which assigns each individual of
the variants file to a population. The page gets two boxes at the top,
one for each file, each ending with the button that opens its file, and
under them two tabs, "Variants file" and "Individuals file". The box of
the individuals file shows the column of the populations, chosen by the
page and changed by the user, and how many individuals the filters keep
in each population. table_io, the owner's reader of tables, replaces
xlsx_rs as the reader of the individuals file, on both pages. It serves
step 2 of case 4 of `docs/use-cases.md`, and gives case 3 the file of
its colours. It is carried out as the `building` skill says, its work
packages being the phases of that skill's loop, on the branch
`individuals-file` in `.claude/worktrees/individuals-file`, from commit
046a0ae.

The specs, called below by their file names, were written or revised on
this branch on 9 October 2026 (`git log --oneline main..046a0ae`):

- the screen: `docs/specs/steps/popgen2-input.md`, called **the screen
  spec**;
- the reader: `docs/specs/worker/individuals.md`, called **the reader
  spec**; the worker: `messages.md`, `protocol.md`, `client.md`,
  `files.md`, all under `docs/specs/worker/`;
- core: `docs/specs/core/project.md`, `projectFile.md`;
- the entry of the pages: `docs/specs/entry.md`;
- the old page's Individuals step: `docs/specs/steps/individuals.md`,
  its opening paragraph of 9 October 2026.

`docs/architecture.md`, `docs/functionality.md` and
`docs/technology.md` were corrected on this branch for the design.

## Words used below

- **A load id** is the random name the page gives each file opened, new
  at every opening; a read again of the same file with other options of
  a CSV keeps it. **The grouping** is the part of the project that names
  the column of the populations; "None" is the grouping with no column.
- **The old page** is `popgen.html`, which shares the light worker, core
  and the store with `popgen2.html`. **The old step** is its Individuals
  step.
- **The light worker** is the second thread of the tab, beside the one
  that runs popnei, which reads the individuals file so that the page
  does not freeze; both pages use the same one,
  `src/worker/filesRunner.ts`. **table_io's package** is table_io compiled to wasm
  with the JavaScript that loads it, the release `js-v0.2.0-dev.1`,
  `https://github.com/JoseBlanca/table_io/releases/download/js-v0.2.0-dev.1/table_io-0.2.0.tgz`;
  the specs also call it **the files wasm**. Its declarations are
  `wasm/table_io.d.ts` of the package, the same as
  `~/devel/xlsx_rs/js/table_io/wasm/table_io.d.ts`, whose checkout is
  at the release's tag. **The reader of TypeScript** is today's reader of
  a CSV, `src/worker/individuals/csv.ts`, `rows.ts` and `sheet.ts`, with
  `src/worker/xlsxCells.ts`, which the switch removes.
- **The one pass** is the single reading of the variants file when it is
  opened, which gives the plots and each individual's missing rate and
  observed heterozygosity. **The individuals kept** are those the two
  thresholds of the individuals keep, which the store works out from the
  one pass once it is finished.
- **The browser check** is `POPNEI_TEST_PAGES=1 npm run build` and then
  `npx playwright test --project=chromium --project=webkit --workers=4
  --global-timeout=<milliseconds> -g "<tag>"`, or with the spec files
  named in place of `-g`. Firefox cannot start on the owner's Mac under
  Playwright 1.63.0.
- **The measurement run** is the same build and `npx playwright test
  --project=measure-chromium`, then `--project=measure-webkit`, each with
  `--workers=1`, alone on the machine, with `-g "<tag>"`. The
  measurements live in `e2e/measure.spec.ts`, which only those two
  projects run.
- **The screens run** is `npx playwright test --project=screens -g
  <prefix> --global-timeout=400000` after a build, which writes the PNGs
  of `e2e/screens.spec.ts` (`.claude/skills/coding/testing.md`).
- **The old page's flows of the individuals** are the specs under `e2e/`
  that load an individuals file on the old page: `individuals`,
  `individualTypes`, `xlsx`, `onePopulation`, `skeleton`, `saving`,
  `shell`, `diversity`, `diversityKept`, `popDists`, `ldDecay`, `pca`,
  `pcaPanel` and `pcaResults`, 253 `test(` calls in their files on
  046a0ae, some of them run once per theme or per file. **The old
  page's screens of the individuals** are those of `e2e/screens.spec.ts`
  named `popgen-individuals-…`, run with `-g popgen-individuals`.
- **The flows of popgen2.html** are `e2e/popgen2*.spec.ts`,
  `fileStats.spec.ts` and `openVariants.spec.ts`.
- **A tag** starts the name of a Vitest `describe` or of a Playwright
  test: `IN2 D1` is work package 2, deliverable 1, of this plan (`IN` for
  the input page). No test name of 046a0ae starts with `IN` followed by a
  digit, so on that commit every check below selects no test; a check
  is read by its count, which is then 0, short of the count it asks for,
  and so fails there. A Vitest count is read from the summary line of `npx vitest run <path>
  -t "<tag>"`, "Tests N passed", since a tag that selects nothing exits
  0; a Playwright count from the summary of the browser check, half in
  each engine.
- **A command in the foreground** lasts at most 600,000 ms, the limit of
  the session's shell, and nothing runs in the background (the standing
  rules of the subagents). A browser run that would last longer is split
  into runs of a few spec files that each end within it.

## Three questions asked before the plan runs

The design leaves these to the owner's change. The session asks them
when it hands the plan over, so that an answer reaches the work package
it changes before that package starts. Each has a meanwhile, which the
plan follows when the owner has not answered.

1. **The column the page chooses when a file is read**: the first column
   after the names that table_io reads as text and that holds from 1 to
   20 different values (the design, "The column chosen when a file is
   opened"). It misses populations numbered 1, 2, 3, which are an
   integer column, and takes a column `sex` of `M` and `F` that stands
   before the populations. Meanwhile: this rule. Another rule changes
   task 4.1 alone.
2. **Numeric codes and booleans of a population column merge.** table_io
   makes a column whose every value is a number a column of numbers, so
   `01` and `1` become the one population `1`, `+007` becomes `7`, and
   `TRUE` and `true` become the one population `true`, on both pages,
   where today they are populations of their own (`project.md`, "The
   populations"). Meanwhile: they merge, as the specs say. To keep them
   apart, the page would need the text of each cell as the file writes
   it, which table_io's package does not give for a column of numbers or
   booleans; that is something table_io lacks, a stop ("The stops"),
   and would change tasks 1.2 and 1.3.
3. **"None" after a change of an option of a CSV.** The specs say that a
   user who chose "None" in the list of the column keeps it until the
   file is read again, when the page chooses a column again, a change of
   separator included (`entry.md`, "The column of the populations on
   popgen2.html"; the screen spec, the list "Column of the
   populations"). This plan makes "None" stay through a read again of
   the same file with other options of a CSV, and the page choose again
   only for a file opened anew, so that the page never undoes a choice
   the user made. Meanwhile: "None" stays; task 5.1 corrects the specs
   first. If the owner prefers the specs as they are, task 5.1 corrects
   nothing and 5.2 builds them.

### The owner's answers, 9 October 2026

The owner approved this plan on 9 October 2026 and answered:

1. The column chosen when a file is read is the first text column with
   1 to 20 different values, as above.
2. A column of numbers may be a column of populations, and `01` and `1`
   are then one population, as the specs say; a column of booleans may
   not: the list "Column of the populations" does not offer it (task
   4.1 and the screen spec, corrected in the first task that touches
   them). No stop, no issue of table_io.
3. "None" stays, as this plan has it (the meanwhile).
4. The old page, `popgen.html`, is deprecated and will be deleted: it
   switches to table_io with popgen2.html, and its flows are brought to
   its new behaviour so that they pass, but no flow, check or decision is
   added for what changes on it (task 1.x's checks of the old page's
   changes are dropped).

## In and out

In: the eight work packages below. One of them is a measurement with a
rule decided beforehand: the memory table_io's package takes in the
light worker, which sets the size of file above which that worker is
ended after a read (work package 2). The owner's try is the last, 8,
after the session's own look in 7.

Out, each with where it goes:

- the analyses per population on `popgen2.html` and how they treat the
  unclassified: later pieces, by the design's answer 3;
- the types of the columns, which `popgen2.html` does not show, and the
  PCA's colours by a column: the screen spec, "Not in this spec";
- the saving of the project on `popgen2.html`, and the help drawer:
  later pieces;
- Firefox, which Playwright cannot start on this Mac, and Safari and
  VoiceOver, which the session cannot run: the owner, in work package 8;
- an issue for table_io, should one be found: drafted under "What was
  done", not filed.

The specs list no open point beyond these three questions.

## The stops

The `building` skill stops for the owner on a choice hard to undo,
something popnei lacks, a decision about what the user sees that the
specs do not settle, a phase that failed three times, and anything
outside the worktree. Adding table_io and removing xlsx_rs is a change
of dependency, which the owner decided in the design (answer 1), so it
is no stop. No stop is expected. If one comes, the session leaves the
tree with the checks passing and everything committed, writes the
question under "What was done" with the options, what each costs and a
recommendation, goes on with every work package that does not stand on
the answer, and puts the question first in the report.

- **table_io does not do what its declarations and the reader spec
  say**: a fixture that gives another table or another refusal than the
  reader of TypeScript gave, beyond the cells of a numeric or boolean
  column made numbers and booleans; a field of the declarations missing
  at run time; an `importTable` that throws on a file. Nothing is worked
  around in the page, since table_io is a project of its own. Meanwhile:
  the cases that hold; the failing ones written as failing tests with
  their reason; the issue drafted for table_io under "What was done".
  The same for the owner's answer to question 2, if it is to keep the
  codes apart.
- **A file of 20 MB that table_io cannot read in a browser's worker**,
  or that closes the tab, in either engine (work package 2). The design
  names this as what would send it back. Meanwhile: work packages 3 to 6,
  which do not depend on it.
- **A plot, or the line of its threshold, that comes back from the
  other tab drawn wrong or at the wrong width**, which no fix in the
  widget of tabs mends, or **a count after the filters that differs
  from what the download writes for the same thresholds**. Both are
  what the design says would send it back. Meanwhile: the work packages
  that do not stand on the tabs, or on the counts.
- **An invariant of `docs/architecture.md`**, or a change to the format
  of the project file: none is planned. A task that finds it needs one
  stops there and reports.
- **A work package that fails three times**, or a finding of a review
  whose fix is one of the above.
- **Outside the worktree.** Nothing is merged, pushed or filed, in
  popnei_web or in table_io.

## Before the first task

- The worktree has its packages: `node_modules` on 046a0ae with popnei
  0.2.2 (`node_modules/popnei/package.json`) and xlsx_rs
  `js-v0.1.0-dev.1`, and no table_io. Node is v26.8.2. `npx playwright
  install` if Chromium or WebKit is missing.
- The URL of table_io's release answered 200 with 360,497 bytes on 9
  October 2026. If it does not answer when task 1.1 runs, that is a stop
  (outside the worktree).
- Every number of popnei the flows compare with, the counts of the
  individuals kept at a threshold among them, is popnei 0.2.2's under
  node, taken as `src/worker/runner*.test.ts` and
  `e2e/fixtures/make_fixtures.mjs` load popnei, never from popnei's
  Python `.venv`, which is a stale 0.1.0. The counts with no threshold,
  p0 48, p2 84 and p1 68, are those of `panel_pops.csv` itself.
- `project.md`, "How it is verified", says the tables of the tests are
  in `src/core/fixtures/`; that folder holds project files alone. The
  tests of core make the table of `panel_pops.csv` with `fixtureTable`,
  as `src/core/analyses/popDists.test.ts` does.
- `client.md` has no bullet in "How it is verified" for its section "The
  light worker started again after a large read"; task 2.1 writes it
  from that section's three steps before the code.
- The checks of the `coding` skill pass on 046a0ae, `npm run test:e2e`
  replaced by the browser check of the whole suite in Chromium and
  WebKit, run in chunks of spec files that each end within a foreground
  command (task 7.2 gives the split); the session writes their counts
  under "What was done" before work package 1, so that a later failure
  belongs to the plan. `npx vitest list` and `npx playwright test
  --list` confirm that no test name starts with `IN` and a digit.

## The order, and what may run side by side

The switch to table_io comes first: every other part of the individuals
file stands on it, and it is where a reader in a browser's worker could
fail. Then the measurement of its memory, which could send the design
back. The page's frame of boxes and tabs stands on nothing of the
switch and is built beside it. Then core, the counts and the column;
then the words and the entry's choice of the column; then the box and
the tab of the individuals file, which stand on all of these; then the
end and the owner's try.

- Work packages 1 and 3 start together: 1 touches `src/worker/`,
  `src/core/project.ts`, `src/core/projectFile.ts`, `src/ui/reads.ts`,
  `src/ui/steps/individuals/`, `package.json` and `eslint.config.js`; 3
  touches `src/ui/variants/`, `src/ui/widgets/Tabs.tsx` and
  `e2e/screens.spec.ts`, which 1 leaves alone while 3 runs. Inside 1,
  task 1.3 may run beside 1.2.
- 2 stands on 1. Task 2.1 may run beside 3 and 4; task 2.2 runs alone on
  the machine, no other agent building or running a browser, since its
  numbers are of memory and time.
- 4 stands on task 1.3 (the failed read with its format, `cellShown`),
  and may run beside 3 and 2.1.
- 5 stands on 4. 6 stands on 1, 3 and 5.
- 7 and 8 run after everything, in order.

At most three agents run at once, the reviewers among them. Only one of
them runs the build or a browser at a time, since they share `dist/`
and the ports and the machine stays usable; a reviewer that runs a
browser in its own worktree counts as that one.

Each work package is reviewed as it ends, as the `building` and
`code-review` skills say: one `code-reviewer` subagent per category that
applies ("The categories of each review", below), in batches of three,
the findings judged by the session, the fixes sent to a subagent test
first, the checks and the screenshots run again after them. The counts
of each work package's checks, its commits and its review go under
"What was done", one entry per work package.

Every task writes its tests first, sees them fail on the commit before
it, then the code; a task's commit holds both, and passes the typecheck,
the lint, Vitest and the format check.

## Work package 1: the switch to table_io, on both pages

What it gives: both pages read the individuals file with table_io's
package. The old page works as before, with the changes the design lists
in "What the switch to table_io changes": the cells of a numeric or
boolean column of a CSV are numbers and booleans, written with the
decimal mark of the read; a CSV named `.xlsx` is read; the options of a
CSV are shown for a file read as text and the line of the first sheet
for an xlsx, by what the read found and not by the name; the words of
the refusals change; and a CSV downloads table_io's package at the first
read. `popgen2.html` reads no individuals file yet. xlsx_rs and the
reader of TypeScript are gone.

Deliverables:

1. The reader: every bullet of the reader spec's "How it is verified"
   that runs in Vitest, under `IN1 D1` in
   `src/worker/individualsFile.test.ts`: each row of the table at
   `readOfTable`; at `readIndividualsFile` with the real package, the
   fixtures it names and the bytes of `panel_pops.csv` named `x.xlsx`;
   every case of the table of `readCsv` of the reader spec at d10cc1b,
   ported from `src/worker/individuals/csv.test.ts` before that file
   goes, each giving the table it gave there but for the cells of a
   numeric or boolean column; `tooLarge` with `arrayBuffer` and the
   loader never called; `notLoaded`; `free()` called once. At least 40
   tests. The properties of `inferColumnTypes` with fast-check pass.
2. The messages and the client: the check of an answer accepts a failed
   read with the format `"text"`, `"xlsx"` or `null` and refuses one
   without it or with another value, and the kinds `notWorkbook` and
   `readerNotLoaded`, and refuses `notXlsx` and `xlsxReaderNotLoaded`,
   under `IN1 D2` in `src/worker/messages.test.ts`; the client's
   `refused` carries the format, under `IN1 D2` in
   `src/worker/client.test.ts`.
3. Core: a failed read recorded with its format (`src/core/project.ts`
   and `src/ui/reads.ts`); the place of `emptyIndividual` and
   `unnamedColumn` written by the format and not by the source's `csv`;
   the words of `notWorkbook`, `readerNotLoaded` for a CSV, `notText` and
   `oldExcel`; `cellShown`, each case of `project.md`'s "How it is
   verified" for it; the populations of a column of decimals of a CSV
   read with the comma named `1,5`; a project file whose xlsx source has
   options of a CSV opening, one with `null` still opening, and a failed
   read written as `notGiven`. Under `IN1 D3` in the tests beside each
   file.
4. The light worker in the browser: the flows of the reader spec's "How
   it is verified", "With Playwright", on the old page, under `IN1 D4`
   in `e2e/xlsx.spec.ts`: one request of the package's JavaScript and one
   of its `.wasm`, served as `application/wasm`, at the first read of a
   CSV, and none before it; none at a second file; the `.wasm` answered
   with an error, the words of `readerNotLoaded` for the CSV, then the
   route removed and the file opened again, the table; the JavaScript
   answered with an error, the same, with a second request at another
   address in Chromium; `encrypted.xlsx` its words.
5. What a user of the old page sees change, a flow each under `IN1 D5`
   on `popgen.html`: a CSV named `.xlsx` read, with the options of a CSV;
   an xlsx with the line of the first sheet and no options; an `.xls`
   named `.csv` refused with the words of `oldExcel`, which no longer
   say "although its name ends in .xlsx", and no options; a zip named
   `.xlsx` that holds no workbook, the words of `notWorkbook`; a `.nei`
   file named `.csv`, the new words of `notText`; a CSV of a column of
   decimals with the comma, the table writing `1,75` and the populations
   named so; a column of `01` and `1`, one population `1`, and one of
   `TRUE` and `true`, one population `true` (question 2); a column of
   `12,0` and `13,0` with the warning of few whole numbers. The CSVs are
   made by the flow.
6. The old page as before otherwise: the old page's flows of the
   individuals pass in the browser check; each literal changed in them
   is one of the changes of deliverable 5 or of the design's list, and
   is named in the commit message with its reason. The old page's
   screens of the individuals are taken before and after; the session
   reads each pair that differs with `Read`, and a difference that is not
   one of those changes is a defect.
7. xlsx_rs gone: `package.json` names table_io's URL under `table_io`
   and no xlsx_rs; `npm ls xlsx_rs` lists nothing; no file of `src/`
   imports `xlsx_rs`; the lint's `filesWasm` and `filesWasmImportCall`
   name `table_io`, and a test import of `table_io` from another file
   than `filesRunner.ts` fails the lint; `csv.ts`, `rows.ts`, `sheet.ts`,
   `xlsxCells.ts`, their tests and the round trip of
   `properties.test.ts` removed; the build's `dist/` holds
   `table_io_bg.wasm` and no `xlsx_rs_bg.wasm`; the sizes of table_io's
   `.wasm` and JavaScript in `dist/`, raw and gzipped with `gzip -9`, are
   written under "What was done" beside those the reader spec measured
   on the release's package, 651,680 and 330,416 bytes for the `.wasm`.

Tasks:

- [x] 1.1 table_io installed from its release's URL with `npm install
  <URL>`, beside xlsx_rs; the types: `IndividualsFileError` and the
  comment of `Cell` in `src/worker/protocol.ts`, the failed read with its
  format in `src/worker/messages.ts`, `refused` with its format in
  `src/worker/client.ts`, `IndividualsRead` and the records in
  `src/core/project.ts`, the outcomes in `src/ui/reads.ts`. The reader
  of TypeScript gives the format it read as, until 1.2 replaces it
  (`protocol.md`, the union of the refusals; `messages.md`, the
  answer and its check; `client.md`, the interface; `project.md`, the
  interface and "The records"; `entry.md`, the table of the outcomes).
  Deliverable 2, and the recording of deliverable 3. A format lost on
  its way would offer the options of a CSV beside an xlsx, or none
  beside a CSV, with nothing to show it; so this is a commit of its own,
  guarded by deliverables 2 and 3.
- [x] 1.2 The reader: `readOfTable` and `readIndividualsFile` in
  `src/worker/individualsFile.ts`, `MAX_SHEET_CELLS` moved there, the
  loading of the package in `src/worker/filesRunner.ts`, and the lint's
  two rules in `eslint.config.js` (the reader spec, "The read by
  table_io", "The refusals and their words", "The TypeScript interface",
  "Loading the files wasm on first need"). Deliverables 1 and 4. Stands
  on 1.1.
- [x] 1.3 Core: `cellShown`, the names of the populations by it, the
  words by the format and of the new kinds, the validation of a source
  of an xlsx with options (`project.md`, "The populations", "What an
  analysis needs of every project", "The validation", and the paragraph
  of `cellShown` in "The counts per population on popgen2.html";
  `projectFile.md`, its opening of 9 October 2026). Deliverable 3. May
  run beside 1.2; stands on 1.1.
- [x] 1.4 The old step: every file loaded with `AUTO_CSV`
  (`src/ui/steps/individuals/commands.ts`), the options shown by `found`
  or by the format of a failed read and the line of the first sheet for
  an xlsx (`IndividualsStep.tsx`), the words (`words.ts`); the literals
  of the old page's flows; the flows of deliverable 5; the screens of
  deliverable 6 (`steps/individuals.md`, its opening of 9 October 2026;
  the reader spec, "What a user sees change from the reader of
  TypeScript"). Deliverables 5 and 6. Stands on 1.2 and 1.3.
- [x] 1.5 xlsx_rs removed and the reader of TypeScript deleted, with the
  parts of `individualsFile.test.ts` that tested the decoding.
  Deliverable 7. The Vitest count falls by the tests of the files
  removed alone, which the commit message counts.

What could go wrong:

- The bytes are given to `importTable` as a `Uint8Array`; an
  `ArrayBuffer` is read as no bytes, which gives `empty` for every file
  (the reader spec, step 4). A test with the real package and a file of
  rows guards it.
- What `importTable` gives stays in the wasm until `free()`; a throw of
  ours between the read and the free would keep it. The count of
  `free()` in deliverable 1 guards it.
- Vite has to make table_io's package a file of its own, loaded by the
  light worker, with its `.wasm` beside it, as it did for xlsx_rs; the
  network flows of deliverable 4 show whether it does, in both engines.
- The literals of the old page's flows: a literal changed to make a
  flow pass hides a defect when it is not one of the listed changes.
  Deliverable 6 asks for each to be named.

## Work package 2: the light worker started again after a large read, and the memory of table_io

What it gives: after a read of a large individuals file, the light
worker is ended, so that the memory table_io's wasm took for it, which a
wasm never gives back, is given back to the machine; and the size above
which it is ended is set from a measurement in Chromium and WebKit.

What it decides: `READ_RESTART_BYTES` of `src/worker/client.ts`, 2 MB in
the specs until this measurement; and whether table_io reads a file of
20 MB in a browser's worker at all, which, if it fails, is a stop.

Deliverables:

1. The restart: the bullet task 2.1 adds to `client.md`'s "How it is
   verified", under `IN2 D1` in `src/worker/client.test.ts`, with fake
   workers: a read of a `File` of `READ_RESTART_BYTES` + 1 bytes answered
   with a table, a refusal or a failure gives the read its outcome and
   then ends the worker; the next read makes a new worker and goes to it
   once it is `ready`; reads waiting go to the new one; a file of
   `READ_RESTART_BYTES` bytes ends nothing; a read cancelled by the
   entry, answered `cancelled` at once, ends the worker when its answer
   comes. At least six tests.
2. The measurement, under `IN2 D2` in `e2e/measure.spec.ts`, on the old
   page, whose Individuals step reads the file through the same light
   worker, with the helpers that measured the memory of a write of the
   download there, the tests `DL8` of `docs/plans/download.md`
   (`engineProcesses`, `footprints`, which sum what the engine's
   processes hold). The files, made by the test in its output folder: CSVs
   of 1,000,000, 5,000,000 and 19,999,000 bytes in the two shapes of
   table_io's report of 2 October 2026 (`~/devel/xlsx_rs/docs/reports/table-io.md`,
   "The memory of a text file"), a header of 100 names over rows of a
   name and 99 `0`, and the same rows with their 99 cells empty, the
   shape that took the most of a file read whole, 548.0 MB of the wasm's
   memory under node 26.8.2 on the owner's Mac, an Apple M5 Pro.
   For each file and engine: whether it was read, the time from the pick
   to the table, and the memory of the engine's processes summed before
   the read and 3 s after it, from a build with `READ_RESTART_BYTES` set
   to 25,000,000, where the worker is kept, and from one with it set to
   0, where it is ended; neither build committed. And the time of a read
   of `panel_pops.csv` after a restart and with the worker kept, five of
   each, the medians; and the time from the pick to the table of
   `individuals_10000.xlsx`, which the reader spec asks for.
3. The decision, written under "What was done" with the engines'
   versions, the machine and the build, and in the reader spec's "How it
   runs" as what was measured on 9 October 2026. The restart **gives
   back**, for a file, what the processes hold 3 s after its read with
   the worker kept, less what they hold with it ended, the larger of the
   two shapes. `READ_RESTART_BYTES` is the largest size measured whose
   restart gives back less than 50 MB in both engines, so that every
   larger file measured gives back 50 MB or more; 0, the worker ended
   after every read, when the file of 1 MB already gives back 50 MB or
   more; and the restart is dropped when the file of 20 MB gives back
   less than 50 MB in both engines. 50 MB is the bound by which the plan
   of the download, `docs/plans/download.md` (its `DL8 D3`), kept the
   restart of the calculation worker after a write.

Tasks:

- [x] 2.1 The bullet of the restart in `client.md`'s "How it is
  verified", from its section "The light worker started again after a
  large read", then the restart in `src/worker/client.ts` with
  `READ_RESTART_BYTES` at 2,000,000 (`client.md`, that section and the
  interface). Deliverable 1. May run beside work packages 3 and 4.
- [x] 2.2 The measurement and its run, alone on the machine.
  Deliverables 2 and 3. Stands on 2.1.
- [x] 2.3 The value set as deliverable 3 decides: `client.md` and the
  reader spec first, then the constant, or the restart dropped, with the
  tests of deliverable 1 changed to it. Skipped when the value stays
  2,000,000.

What could go wrong: the light worker runs inside a process of the
engine with the page, so what the processes hold includes the table in
the page, the same with the worker kept or ended; the difference is the
worker's. A footprint that falls back under the system's pressure would
give a restart that seems to give back nothing; the run is alone on the
machine for that reason, and each value is the median of three reads.

## Work package 3: the page in two boxes and two tabs

What it gives, on `popgen2.html`: the box of the variants file at the
top, ending with the button that opens a variants file, moved there from
the end of the page; beside it, or under it below 720 px, the box of the
individuals file with its heading and its words of no file; under them
the two tabs, "Variants file", which holds everything the page showed
under the box, and "Individuals file", which says "No individuals file
open." A turn to the other tab and back finds the plots and the
thresholds as they were. Nothing opens an individuals file yet: its
zone comes with work package 6.

Deliverables:

1. The widget of tabs keeps the hidden tab drawn: the prop `keepHidden`
   of `src/ui/widgets/Tabs.tsx`, both panels in the page with the hidden
   one inert and not shown, and the old page's use, which does not take
   it, drawing only the tab shown, under `IN3 D1`, in jsdom as
   `src/ui/variants/VariantsPage.test.ts` draws a component.
2. Flows under `IN3 D2` in a new `e2e/popgen2Input.spec.ts`, each a
   bullet of the screen spec's "How it is checked", In Playwright, that
   needs no individuals file: the tabs by the keyboard alone, the row
   one stop of the Tab key, the arrows, Home and End; a threshold moved,
   the other tab shown and back, the threshold, its line over the plot
   and the plot at the same width as before; a number typed in the box
   of a threshold with no Enter applied as the focus goes to the tab, as
   a click anywhere else applies it (the session's decision of 9 October
   2026, after the review); the hidden tab never reached
   by the Tab key; the status region still speaking of the plots while
   their tab is hidden; 320 px wide, no sideways scroll, the boxes one
   above the other and the two labels visible; the focus on "Open
   another variants file…" after an opening by its button; axe on the
   page with each tab shown, light and dark.
3. The page as before otherwise: the flows of `popgen2.html` pass, each
   one changed only where it looked for the opening at the end of the
   page, named in the commit message; the old page's flows that use the
   widget of tabs, those of the bins, pass untouched.
4. The screenshots: `popgen2-input-no-file` and `popgen2-input-tabs`
   (a variants file open, each tab shown), light and dark, at 1280 and
   320 pixels; the screens of popgen2 taken again, which change by the
   button moved and the row of tabs, and are read by the session.
5. The first load of `popgen2.html`, gzipped, before and after, written
   under "What was done": React Aria's tabs join it.

Tasks:

- [x] 3.1 `keepHidden` of `Tabs.tsx` (the screen spec, "Both tabs kept
  drawn"). Deliverable 1.
- [x] 3.2 The page: `src/ui/variants/VariantsPage.tsx` with the two
  boxes, the zone of `OpenVariants.tsx` inside the box of the variants
  file and outside the boundary of errors made for each load, the box of
  the individuals file with its words of no file, the tabs, and the
  scroll place of the tab "Individuals file" left to work package 6
  (the screen spec, "The order of the page", "The box of the variants
  file", "The tab Variants file", "Both tabs kept drawn",
  "Accessibility", the order of the Tab key). Deliverables 2, 3 and 5.
- [x] 3.3 The screenshots. Deliverable 4.

What could go wrong: a plot whose box has no size while its tab is
hidden. `createPlot2d` keeps its last drawing then and draws again when
the box has a size; the line of a threshold is laid from the frame the
plot gives after each drawing. A flow that reads the plot's width after
the turn back guards it; a plot drawn at the wrong width that the widget
cannot mend is a stop.

## Work package 4: the counts per population, the column the page chooses, and the words of a refusal on popgen2.html

What it gives, in the words of work package 6: what the box of the
individuals file shows, the populations of the column with the
individuals the filters keep in each, the unclassified and why, the rows
of the file that the variants file does not have, the warning of no
individual in the file and that of too many values; the column the page
chooses when a file is read; and the words of a file refused, in this
page's words.

Deliverables:

1. `defaultPopulationsColumn` and `individualsBoxNeeds`: each case of
   `project.md`'s "How it is verified" for them, the latter for each row
   of the screen spec's "Its words" that it gives, under `IN4 D1` in
   `src/core/populations.test.ts`.
2. `populationCounts`: each case of the same section for it, the
   statistics of `panel.nei`'s one pass taken from
   `e2e/fixtures/panel_individual_stats.json` or written by popnei 0.2.2
   under node, with the missing rate at 0.03, each count equal to the
   length of that population in `populationsKept` with the list of
   `individualsKept`; under `IN4 D2`.
3. The same object, under `IN4 D3`: the same inputs twice give the same
   object by `===`; a new list of the individuals kept with the same
   individuals in the same order, the same object; a list of the same
   length that keeps other individuals, a new object with the new
   counts; a threshold of the variants changed, the same object.

Tasks:

- [x] 4.1 `MAX_LISTED_POPULATIONS`, `defaultPopulationsColumn` and
  `individualsBoxNeeds` in `src/core/populations.ts` (`project.md`, "The
  counts per population on popgen2.html", the bullets "The column chosen
  by the page" and "The words of the box"). Deliverable 1. The answer to
  question 1 changes this task alone.
- [x] 4.2 `populationCounts` (the same section, the bullet "The counts"
  and "The rules of the counts against what a reader would expect").
  Deliverables 2 and 3. A memo that gives back the last counts for a
  list of other individuals would show the counts of other thresholds,
  silently; so this is a commit of its own, guarded by deliverable 3.

## Work package 5: the words, and the column chosen by the entry

What it gives, in the words of work package 6: the words of the box and
the tab of the individuals file in each of their states; and the entry
of `popgen2.html`, which, when a read of the individuals file is
recorded, chooses the column of the populations and says the read in the
status region.

Deliverables:

1. The words, in `src/ui/variants/individualsWords.ts`, under `IN5 D1`:
   the words of the box in each row of its table and each line of the
   counts, from projects and individuals kept made in the test; which
   part the tab "Individuals file" shows from the read and its format;
   the words of the status region, a file read with and without a column
   and with each warning after it, a file refused; each asserted whole
   (the screen spec, "How it is checked", In Vitest).
2. The entry, under `IN5 D2` in `src/ui/populationColumn.test.ts`, with
   a store made by `createPopgen2Store` and a fake worker, each case of
   `entry.md`'s "Verified with Vitest" for `choosePopulationColumns`,
   as task 5.1 leaves it: a read of `panel_pops.csv` recorded sends one
   command and the grouping is `popcat`; "None" chosen after it, nothing
   sent; the separator changed and the read recorded again, "None" kept
   and nothing sent; another file opened after "None", its column
   chosen; a second file with a column `popcat`, nothing sent; a table
   of numbers alone, nothing sent and the read said with no column; an
   undo and a redo, nothing sent; a run of the arrow keys on a threshold
   still held when a read is recorded, made a change before the command
   of the column; the words said in each case.

Tasks:

- [x] 5.1 The correction of question 3, before any code: in `entry.md`,
  "The column of the populations on popgen2.html" and its "Verified with
  Vitest"; in the screen spec, the paragraph of the list "Column of the
  populations" and the bullet of "None" in "How it is checked"; and the
  design's sentence on "None" in "The column chosen when a file is
  opened", with a line under "What the session decided". The rule to
  write: the page chooses a column at a read of a load id it has not
  chosen for, a file opened anew, when the grouping names no column of
  the table; at a read again of the same load id, for other options of a
  CSV, it chooses only when the grouping names a column the new table
  lacks, or names none and the user did not set "None" for that load
  id. The entry tells the user's "None" by watching the grouping become
  "None" through a command it did not send, and keeps those load ids
  itself, as the screen keeps the tab shown, lost at a reload with the
  files. The session reads the correction against the rest of the two
  specs before 5.2. If the owner keeps the specs as they are, this task
  changes nothing.
- [x] 5.2 The words (the screen spec, "What it shows", "Its words", "The
  states"). Deliverable 1. May run beside 5.1.
- [x] 5.3 `src/ui/populationColumn.ts`, and the entry of `popgen2.html`,
  `src/ui/popgen2.tsx`, which makes it with the store gated as the
  screens' is and stops it with the page (`entry.md`, "The column of the
  populations on popgen2.html"). Deliverable 2. Stands on 5.1 and 5.2.

What could go wrong: the command of the column sent in the middle of
the store telling its listeners of the record. `entry.md` has it sent
in a `queueMicrotask` after the listeners, as `startByThemselves` of
`src/ui/popgen2.tsx` starts the one pass; a test that records a read and
reads the history in order guards it.

## Work package 6: the box and the tab of the individuals file

What it gives, on `popgen2.html`: the user opens an individuals file by
the button of its box, a drop on the box or a paste, before or after the
variants file, and removes it; the box shows its name, the list of the
column of the populations with the column the page chose, and the
individuals the filters keep in each population, which change with the
thresholds of the individuals once the one pass is finished, and wait
for it with their reason; the tab "Individuals file" shows how the file
was read, with the options of a CSV, the individuals of the variants
file that the file does not have, and the table of the file, sortable,
which keeps its sort and its place through a turn of the tabs. A file
refused says why in the box.

Deliverables:

1. The box and the tab in each state of the screen spec's table "The
   states", from a store made with a fake worker, under `IN6 D1`: each
   row of the box's table and of the tab's; a command for each row of
   "What it sends and reads", with its description; the select's value
   "None" for a grouping whose column the table does not have; the focus
   on the zone's button after Remove; a progress of the one pass
   drawing the box no more, counted.
2. Flows under `IN6 D2` in `e2e/popgen2Input.spec.ts`, each a bullet of
   the screen spec's "How it is checked", In Playwright, that names the
   individuals file, as task 5.1 leaves them, among them: the two files
   in either order with p0 48, p2 84 and p1 68; the column chosen for
   each fixture it names; the unclassified and their names; the warnings
   of none in the file and of 21 values; "None" kept through a change of
   separator; the counts at the missing rate 0.03, then "…" and the line
   of waiting while the pass is held by `e2e/holdWorker.ts`, the line
   after Stop, and the counts at Start again's end; a file opened while
   the one pass runs, the pass going to its end with no second pass;
   the refusal of a row with the focus kept on the select of the
   separator; a CSV named `.xlsx` and an `.xls` named `.csv`; the table
   sorted and scrolled, the other tab and back, the same; a name of 80
   characters at 320 px; a CSV with an integer column before the
   populations; table_io requested once at the first read; axe on each
   state of the box and of the tab, light and dark.
3. The counts against the download: at the missing rate of the
   individuals at 0.03, the sum of the counts and of the unclassified
   kept equals the individuals the text after a download of the
   filtered variants says it kept, under `IN6 D3`. A difference is a
   stop (above).
4. The sort of `individuals_10000.xlsx` under the tab: the time the page
   does not answer, as the test `VS7 D4` of `e2e/measure.spec.ts`
   measures it for the table of the statistics of 10,000 individuals,
   under `IN6 D4`, by the measurement run, written under "What was done"
   beside the medians of 149 ms in Chromium and 107 ms in WebKit that
   the old page's sort of the same rows took on the owner's Mac, an
   Apple M5 Pro (the screen spec, "How it is checked").
5. The screenshots: `popgen2-input-counts`, `popgen2-input-waiting`,
   `popgen2-input-refused`, `popgen2-input-too-many`,
   `popgen2-input-tab-csv` and `popgen2-input-tab-xlsx`, light and dark,
   at 1280 and 320 pixels.
6. The first load of `popgen2.html`, gzipped, against work package 3's,
   written under "What was done": React Aria's table and list join it.

Tasks:

- [x] 6.1 The box of the individuals file: its zone, a `FileZone` as the
  variants file's, outside the boundary of errors made for each load;
  Remove; the list; the counts with `Table.tsx`; the lines and
  warnings with `Warning.tsx`; the counts that wait (the screen spec,
  "The box of the individuals file", "What it sends and reads",
  "Accessibility"). Deliverables 1, part of 2, and 3.
- [x] 6.2 The tab "Individuals file": how it was read, with the selects
  of the old step, the line of UTF-16 and the warning of a character not
  decoded; the format remembered for each load id while a read again is
  pending; the individuals not in the file with Copy; the table with
  `SortableTable.tsx`, its scroll place noted when the tab is left and
  put back when it is shown (the screen spec, "The tab Individuals
  file", "Both tabs kept drawn"). The rest of deliverable 2. Stands on
  6.1, since both are in the page and share its flows.
- [x] 6.3 The measurement of the sort, the screenshots and the size of
  the first load. Deliverables 4, 5 and 6.

What could go wrong: the table under a hidden tab. A box hidden with
`display: none` forgets how far it was scrolled, and the table, which
draws only the rows in view, finds none in view while its box has no
size; the scroll place is put back after the table has measured its box
and drawn its rows (the screen spec, "Both tabs kept drawn"). The flow
of the table sorted and scrolled reads the first row in view after the
turn back, in both engines.

## Work package 7: the end

- [x] 7.1 The session's own look: it reads every screenshot of work
  packages 3 and 6 with `Read`, state by state, in both themes and both
  widths, and the old page's screens of the individuals, and checks
  that each state of the screen spec's table "The states" is there and
  readable; what it finds is a fix sent to a subagent, test first,
  before 7.2.
- [x] 7.2 The checks of the `coding` skill on the last commit, and the
  browser check of the whole suite in Chromium and WebKit, in chunks of
  spec files that each end within a foreground command: the old page's
  flows of the individuals, in two or three chunks; its flows of the
  variants and of the write; `popgen2*`, `fileStats` and `openVariants`;
  and the rest; split again if a chunk passes 9 minutes. The counts of
  each chunk, and of the screens run, recorded below; a flaky test is
  run again three times and named.
- [x] 7.3 The documents: `docs/architecture.md`,
  `docs/functionality.md` and `docs/technology.md` checked against what
  was built, the numbers of size and of memory of work packages 1, 2, 3
  and 6 put where those documents give an estimate; each spec of this
  plan says it is built on the branch `individuals-file`, with what a
  round changed; "What was done" complete.
- [x] 7.4 The instructions of the project, by the session itself and not
  by a subagent, since they are what every later session reads: every
  place that names xlsx_rs as the reader of today says table_io, in
  `CLAUDE.md` ("popnei in the application", its sentence "The same holds
  for xlsx_rs"), the `coding` skill (`SKILL.md`, `worker.md`,
  `testing.md`, `configs.md`) and the `code-review` skill's
  `categories.md`, found with `grep -rn xlsx_rs CLAUDE.md .claude/`; a
  sentence that records the history of 28 September 2026 stays as
  history. The report says that the session made this change and lists
  the files.
- [x] 7.5 The report to the owner, as the `building` skill says, with the
  stops met first, if any; the answers to the three questions and what
  the plan followed where they were not given; the measurement of work
  package 2 and the value it set; the sizes; what the review found and
  fixed and what it did not take; the browsers the screens were seen
  in, Chromium in the screenshots and Chromium and WebKit in the flows,
  and those not seen, Safari, Firefox and Chrome; the change to
  `CLAUDE.md` and the skills; and how to try the page: `npm ci` and then
  `npm run dev -- --force` in the worktree, since table_io is a new
  package and a server left running holds xlsx_rs's in its cache,
  `popgen2.html`, and the files `e2e/fixtures/panel.nei`,
  `panel_pops.csv`, `panel_split.csv`, `ld.nei` with `ld_pops.csv`, and
  `excel_en.xlsx`, with the states worth going through.

## Work package 8: the owner tries the page

- [ ] 8.1 The owner tries the page, on both pages, and answers: whether
  the screen is accepted; the choices of the screen spec's "Choices made
  by the session" and of the design's "What the session decided"; the
  three questions above, if not answered before; whether Safari and
  Firefox read a CSV and an xlsx and show the tabs as Chromium does;
  what VoiceOver says, in Safari, of the items of the screen spec's "Not
  yet heard in VoiceOver"; and, if they wish, the CSV of 20 MB of work
  package 2 read in Firefox with `about:memory`, from the path the
  report gives.
- [ ] 8.2 The rounds. Two are expected. Each change the owner asks for
  goes into the screen spec first, then into the code, with its commit
  and its screenshots taken again; a change that reaches `src/core/`,
  the worker or `docs/functionality.md` is said to the owner as such and
  becomes a task of its own. After a round that changed the markup, the
  `accessibility`, `react` and `ux` reviewers run again.
- [ ] 8.3 The owner accepts the screen, and the screen spec says what
  the screen now is. The branch is merged into `main` when the owner
  says so.

## The categories of each review

The `code-review` skill's four that always run, `spec`, `tests`,
`stale` and `errors`, for every work package that changes code, with:

- 1: `api`, `architecture`, `browser` (a new wasm in a worker, its
  retry), `bundle` (a dependency changed), and `react`, `accessibility`
  and `ux`, since the old step's screen changes;
- 2: `api` and `browser` for 2.1 and 2.3; 2.2, a measurement, `spec`
  and `tests` alone, on the test code;
- 3: `api`, `architecture`, `react`, `accessibility`, `ux`, `browser`,
  `bundle`, with its screenshots;
- 4: `api`;
- 5: `api`, `architecture`, `ux`, the words;
- 6: `api`, `architecture`, `react`, `accessibility`, `ux`, `browser`,
  `bundle`, with its screenshots;
- 7: `browser` on the whole branch, as the skill asks before a plan is
  done.

## What was done

### Before the first task, 9 October 2026

The plan starts from `main` at 864cab7, which this branch adds only
documents to. On this Mac: typecheck and lint clean, Vitest 4,448. On
GitHub, run 37905998519 of 864cab7: the checks, the flows in Chromium,
Firefox and WebKit, three jobs each, all passed, and the site was
published. It stands for the browser check of the starting commit.

### Work packages 1 and 3, 9 October 2026

Built side by side, each by its own subagent.

**1, the switch to table_io**: f2130d9 (1.1, the failed read carries
its format), 30a2499 (1.2, the reader and the loading of the package),
1426d21 (1.3, core), b4efbf5 (1.4, the old step and its flows), 41abcf1
(1.5, xlsx_rs and the reader of TypeScript removed). 40a5457, a commit
of package 3, swept in the staged deletions of 1.5, so it alone fails
the typecheck; 41abcf1 completes it; the branch is local and was not
rewritten. Vitest 4,454; flows in Chromium and WebKit: the old page's
individuals and xlsx 130, its analyses 392, the statistics and the write
204; the old step's screens 42. table_io's wasm 651,680 bytes, 330,425
gzipped, and its JavaScript 3,196 gzipped, loaded at the first read of
an individuals file, a CSV included. Departures: a value of a column
keeps its cell's number for the types (a CSV of 1,5 1,7 1,9 read with
the comma had come out categorical); deliverables 5 and 6, the old
page's changes checked by flows and screens, dropped by the owner's
answer 4; the old step shows the options of a CSV once the reader found
the format.

**3, the page in two boxes and two tabs**: d74e8d7 (`Tabs` keeps the
hidden panel drawn and inert), beab4a2 (the page), 24ed7aa (the flows),
da96c72 (two flows follow the opening into the box), 4e9c6d2 (the
screens). Seen by the session: the tabs (light), no file at 320 px
(dark). The first load of `popgen2.html` 215.39 to 231.34 KB gzipped,
+15.95 KB, of which about 86% is React Aria's machinery of lists and
selection, which the column list and the table of package 6 need too;
no lighter way within the rules.

**Review of 3** (spec, tests, stale, errors, api, architecture, react,
accessibility, ux, browser, bundle): no fault with the tabs. Taken: a
number typed with no Enter is applied as the focus goes to a tab, as a
click anywhere applies it, now said by the spec, the design and this
plan (44fb9d1, b0b0d32; the session's decision); the header of the flow
file (9161987); the heading of a crash of the opening zone, "Opening a
variants file", in place of a second "Variants file" (08ee594); the zone
drawn again at a turn of the tabs after it threw (40a5457). Not taken:
the empty room of the bar of the pass under "Ploidy", older than this
plan; the boxes without the grey of the old box, which both share. The
unselected tab's label: 6.66:1 light, 7.67:1 dark, enough.

**Review of 1** (spec, tests, stale, errors, api, architecture, browser,
bundle, react, accessibility, ux): no fault in the browsers (the wasm's
features within the floor, its retry, no other origin, served as
`application/wasm`). Taken, with task 2.1: a two-valued column of
decimals read with the comma written "2.5" in its coding and "2,5" in
the table; three mutations of the reader no test caught. Not taken: the
old page's card that jumps at the first read, and its options hidden
after a crash, the old page being deprecated. Left to work package 7:
the stale mentions of xlsx_rs in the documents and the skills, listed
by the review.

### Work packages 2, 4 and 5, 9 October 2026

**2, the light worker started again, and table_io's memory.** 4a3965e
and 998b233 (the review of package 1: a two-valued column of decimals
written with the read's mark; three mutations caught), 23d55af (2.1, the
restart after a read above a size, client.md first), d48ac90 and f3dedd5
(2.2, the measurement `IN2 D2`), 82eb3fe (2.3). Measured on the Apple M5
Pro, 64 GB, load 8 to 17, the median of 3 reads, held 3 s after the read
above what the engine held before, and what ending the worker gives
back:

| CSV | Chromium 153, held / given back | WebKit 26.6, held / given back |
|---|---|---|
| 1 MB, zeros | 123.7 / 47.0 MB | 285.1 / 32.4 MB |
| 1 MB, empty cells | 174.7 / 76.0 MB | 405.7 / 51.9 MB |
| 5 MB, zeros | 305.3 / 77.8 MB | 753.3 / 517.5 MB |
| 5 MB, empty cells | 495.0 / 212.5 MB | 1,558.5 / 916.9 MB |
| 20 MB, zeros | 802.7 / 391.2 MB | 3,144.4 / 1,473.8 MB |
| 20 MB, empty cells | 1,364.5 / 816.6 MB | 4,615.3 / 3,326.7 MB |

Every file was read; the 20 MB file with empty cells in 6.6 s in
Chromium and 13.1 s in WebKit. By the rule written before, 50 MB given
back at 1 MB, the value is 0: the light worker is ended after every read
of a file that is not empty (82eb3fe), at a cost of 0 to 110 ms a read.
Four flows that counted the downloads of a kept worker now check the
new worker of each read, and an empty file, the one read that keeps its
worker, carries the test of the retry. Found then: WebKit fetches
table_io's wasm again at every read, 330 KB gzipped, against the
headers GitHub Pages sends, where Chromium takes it from its cache;
written in the specs, `technology.md` and `architecture.md`. Not acted
on: what the page itself holds after a 20 MB file, about 550 MB in
Chromium and 1.3 GB in WebKit with the worker ended; for the owner's
report. Vitest 4,583; 704 flows in Chromium and WebKit that read an
individuals file.

**4, the counts and the column.** 1bfaa10 (4.1, the column chosen, the
words of the box, the columns offered, a boolean one not), 8f32790
(4.2, the counts and their memo). The review (spec, tests, stale,
errors, api): the counts equal those of `individualsKept` in 48 states
of the thresholds on two tables. Taken, in package 5's first commits: a
column of TRUE and FALSE kept the grouping of a file before while the
list showed "None" (c012597, a column groups only when offered); the
memo's checks of the table and the decimal mark tested (d264b9d); the
counts checked at a missing rate of 0.03, where 0.1 removes none
(5c024b6, 4993a07).

**5, the words and the column chosen by the entry.** e0e6858 (a sheet
too large worded for the individuals file), 9542fe2 (5.1, a "None" the
user chose stays), 20f3dc5 (5.2, the words), 59dbd9f (5.3, the entry's
choice through the gate). The review (spec, tests, stale, errors, api,
architecture): no fault; six guards of the entry's choice and three
cases' words untested, now tested (154f187, 936a126). A first reader on
the words, as a population geneticist; taken (a74d27e): the names of the
unclassified belong to their cause and point to the tab's full list,
the direction of "in A but not in B", the limit of 20 said, "after the
filters of individuals", "in the tab", "the reader of tables". A second
first reader understood the eight messages; left for the owner's try:
the individuals with an empty cell are named nowhere, and the line of
the individuals not in the variants file does not say whether they
matter.

### Work package 6, 9 October 2026

2752df4 (the box and the tab), 0552f2f (320 px), a9d2ddf (the flows,
the screens, the measurements). The item left from package 5: a flow
that fails when `popgen2.tsx` passes the store without its gate (seen
failing, counts at 0.031 for 0.03). IN6 D3: the counts add up to 116,
the individuals the download says it kept. Seen by the session: the box
with the unclassified (light), the tab with the options and the missing
names (dark), the counts at 320 px (light), the 10,000 rows sorted
(WebKit).

Review, eleven categories, three reviewers. Taken, in 7ee9835..2b355b1:
the sort of 10,000 rows × 20 columns froze the page with nothing on
screen, 675 ms in Chromium and 430 ms in WebKit on the Apple M5 Pro,
2,739 ms with the processor slowed 4 times; the body of the table is no
longer rebuilt at each sort above 8 columns, the sort is a transition
and "Sorting…" shows with `aria-busy`: the first frame in 11 and 6 ms,
the rows in 311 and 382 ms, 1,294 ms slowed; a crash of the tab emptied
the whole page, now its own boundary, "How the individuals file was
read and what it holds"; the table showed a file's control characters
raw where the list escapes them; six behaviours and a drop and a paste
on the box with no test; the Copy flow that accepted a failure; a
held read with axe; a branch no state reaches; a stale comment of
`vite.config.ts`. Not taken, for the owner: loading the box's lines and
the tab only at the first individuals file, which would take 34.8 KB
gzipped out of the first load of `popgen2.html` (278.6 KB now, from
237.3 before this package; React Aria's table and list 68% of it).
Left to work package 7: a header partly out of view wraps and makes the
row of headers taller when the wide table scrolls sideways. Vitest
4,619 (one timeout under a load of 22, which passes alone); 428 flows
in Chromium and WebKit; screens 224.

### Work package 7, 9 October 2026

7.1, the session's own look: every state of the box and the tab, in
both themes and both widths (counts, unclassified, no name matching, 21
values, "None", refused, waiting, the tab with a CSV, an xlsx and 10,000
rows, no file); one flaw, a header of three words that wrapped in its
column of the wide table and made the row of headers taller when it
scrolled into view, fixed test first in 9e570c5 (each column of the
individuals' table as wide as its header on one line; the old page's
tables unchanged), seen fixed in Chromium and WebKit at 1280 and 320 px.

7.2, the checks on 0f3f4d1: typecheck, lint and format clean; Vitest
4,620; the whole browser suite in six chunks, 715 in Chromium and 715 in
WebKit, all passed after one fix: the flow "TH round 1 at 320 px" of the
old page failed three times of three in Chromium, measuring the plots
against the window while the browser scrolled to keep the typed box in
view; it measures in the page now (97e420b), three passes in each
engine. Screens 266: 224 of `popgen2.html`, 42 of the old step.

7.3, the documents (0f3f4d1): `architecture.md` (the light worker, the
files of section 9, the costs of section 11), `technology.md` (the first
load of `popgen2.html` 278.6 KB with its two additions, the lazy load
left to the owner, table_io's release), `functionality.md`, the design's
notes as built, the ten specs built on this branch, `pca.md`'s open point
of the decimal mark in the colours of a column, `site.yml`'s comment.

7.4, by the session (e914216): `CLAUDE.md`, the `coding` skill
(`SKILL.md`, `worker.md`, `testing.md`, `configs.md`), the `code-review`
skill's `categories.md` and an example of `writing-plans` name table_io
as the reader of every individuals file; the history of 28 September
2026 stays.
