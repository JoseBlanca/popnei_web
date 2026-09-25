# Report: the walking skeleton

The work report of the plan `docs/plans/walking-skeleton.md`, stage 2 of
`docs/build-order.md`, carried out from 25 September 2026 on the branch
`plan/walking-skeleton`, which is not merged and not pushed.

## Where the plan stands

Under way. The work packages done are written below, one section each,
as they end.

## Before the first task

On 25 September 2026 the owner ordered the merge of
`docs/plan-walking-skeleton` into `main`, which moved `main` from 88f44c5
to 59e46d2, the commit of the plan, and the branch `plan/walking-skeleton`
was made from it. The checks the plan lists were run again there, after
`npm ci`, and gave the plan's counts:

| Check | Result on 59e46d2 |
|---|---|
| `node --version`, `npm --version` | v26.8.2, 11.19.1 |
| `npm pkg get dependencies.popnei` | the URL of `js-v0.1.0-dev.1` |
| `format:check`, `typecheck`, `lint` | exit 0 |
| `npm test` | "Tests 634 passed (634)", 6 files |
| `npm run build` | exit 0 |
| `npx playwright test --project=chromium --project=webkit` | "40 passed" |

## 1. The approved files brought into line with the stage 2 specs

Done as planned, on 25 September 2026, in seven commits, 488d3a6 to
ce71b95. Nothing the user sees changed. The application now names
popnei's release `js-v0.1.0-dev.2` and is itself version 0.1.0. The
specs, code and documents of stage 1 now say what the ten specs of
stage 2 build on.

### The deliverables

| Deliverable | Command | Result on ce71b95 |
|---|---|---|
| 1. The release and the version | `npm pkg get dependencies.popnei version`; `npm ls popnei` | the URL of `js-v0.1.0-dev.2`, `"0.1.0"`; `popnei@0.1.0` |
| 2. The tests of stage 1 | `npm test`; `npx playwright test --project=chromium --project=webkit` | "Tests 673 passed (673)"; "40 passed" |
| 3. `WS1 D3` | `npx vitest run src/core/project.test.ts -t "WS1 D3"` | 34 passed (at least 24 required) |
| 4. `WS1 D4` | `npx vitest run src/core -t "WS1 D4"` | 7 passed (at least 4) |
| 5. The types | `typecheck`, `lint`; `export type Scratch = File;` added to `protocol.ts`; `grep -n "readonly done: number"` | exit 0; "error TS2304: Cannot find name 'File'", line removed; nothing found |
| 6. The documents | the searches of the plan | `reopenFailed` in architecture.md (2), worker.md (4), protocol.md (3), project.md (5); `runnerWorker` in architecture.md (2), worker.md (4); "below 0.95" (1); the two stale phrases not found |

For deliverable 2, the lines of existing tests and of
`testSupport.ts` that were changed or removed, with the item of
"Changes to approved files" that asks for each:

- Item E, the versions moved from the reference to each check:
  `popneiVersion` and `appVersion` in the literal near line 580 and in
  `REFERENCE` of `project.test.ts`, `openedAndRun` of `store.test.ts`,
  `wholeProject` of `testSupport.ts`. The two tests of the reference's
  versions are removed, and the `WS1 D4` tests replace them.
- Item O, the separator: the `raggedRow` literals and their words in
  `project.test.ts`, and its generator in `testSupport.ts`.
- Item P and the new words of `empty`: "Load an individuals file"
  becomes "Load a metadata file" in `project.test.ts` and
  `store.test.ts`; "no row below the header" becomes "no row of
  individuals".
- "utf-16" in `found`: the words of the encoding in `project.test.ts`,
  and `csvFound` in `testSupport.ts`.
- Item C, `Progress`: every `{ done, total }` literal of
  `store.test.ts`.

The test reviewer found that every removed line maps to one of these
items. The only other removed line is an import, which follows the
types.

Deliverable 2 names 566 tests of the core and 68 of the probe, 634 in
all. With the additions of this work package, `npm test` now gives 673.

### What was changed beside the plan

- `individualsNeeds(p)` keeps its one parameter. It takes "a metadata
  file" or "a traits file" from the application of the project, and
  `project.md` and `steps/individuals.md` now say so. The shell spec and
  the diversity spec already called it this way.
- The section of `build-order.md` "Reading files by ranges, when popnei
  gives it" is removed, and its row moved to stage 2, since reading by
  ranges is now in stage 2.
- Open 5 of `project.md`, the ending of the reader's refusals, stays
  open, for the owner to judge on the screens at stop 8.4.

### The review

Five reviewers: `spec`, `tests`, `stale`, `errors` and `api`. None found
a wrong number, or a result shown after its inputs changed. The fixes
are in b3c3ebc and ce71b95:

- A test of the check of the individuals changed the metadata file and
  the variants file at once. So a cache that forgot the variants file
  would have passed every test. The user would then have seen the old
  list of missing individuals after loading another variants file.
  A test now changes the variants file alone.
- Six checks of the code could be removed with no test failing: three
  refusals of a damaged project file, the size limit in the words of a
  file too large, the words of a metadata file that could not be read
  again, and the two versions of a check swapped. Each has a test now.
- A column number past 999 was written "column 1,204". The rule of
  `project.md` now treats it like a line number, with no comma.
- `docs/architecture.md` section 2 had three types that disagreed with
  the code. Two comments of `protocol.ts` were looser than the spec and
  popnei. A marker of Open 5 was lost, and an example of the TypeScript
  skill still used the old `done` and `total` of progress. All are
  corrected.

Not taken:

- Narrowing the core's types of a worker's failure to what each worker
  can give. The spec keeps them wide on purpose, and nothing the user
  sees depends on it.
- Requiring whole numbers for the fields of the reader's refusals in a
  project file. No spec asks for it, and a project file never holds a
  failed read.

### What the owner should know

The numbers of popnei `js-v0.1.0-dev.2` were not measured again here.
The plan's "Before the first task" records them.

The API reviewer noticed that progress divides the bytes read by the
size of the file, which gives no number for a file of 0 bytes. The
runner of work package 3 is told to handle it.

### How the work went, for whoever revises a skill or a plan

The owner can stop reading here.

- The plan's task split worked. Tasks 1.1 to 1.3 went to one subagent,
  about 352,000 tokens, and task 1.4 to another beside it, about 178,000
  tokens. The five reviewers took between 57,000 and 115,000 tokens
  each, and the fixes about 12,000 more.
- The code-review skill sends the reviewers that run code (`spec`,
  `tests`) with a worktree of their own. The owner's instructions for
  this plan forbid that. So the reviewers that only read ran together,
  and `tests`, which breaks the code to see whether a test fails, ran
  alone after them, in the same tree.
- The writer of the code wrote its tests after the code. The mutations
  of the `tests` reviewer found 7 checks no test guarded. The prompt of
  a task should ask for each new test to be seen failing.

## 2 to 6, as they ran

Work packages 2 to 6 build five modules that do not depend on one
another, so they ran side by side on 25 September 2026, one subagent
each, in the same folder and on separate files. Each was reviewed by
five reviewers, `spec`, `stale`, `errors`, `api` and `tests`. The four
that only read ran together. The `tests` reviewer breaks the code on
purpose, so it ran only once its work package's fixes were in, and
touched only its own module. The points that change what the user
reads went to the owner, and are listed at the end of this section.

## 3. The runner, in node

Done as planned. The runner is the code inside the calculation worker
that opens the variants file with popnei, puts the filters on it and
calculates the diversity. It is tested in node with popnei
`js-v0.1.0-dev.2`, and is first run in a browser in work package 8.

| Deliverable | Command | Result |
|---|---|---|
| 1. The fixtures | `cmp e2e/fixtures/panel_pops.txt` with popnei's copy; `wc -l`, `head -1` of `panel_pops.csv` | same; 201 lines, `IID,popcat` |
| 2. `WS3 D1` | `npx vitest run src/worker/runner.test.ts -t "WS3 D1"` | 23 passed (at least 11) |
| 3. `WS3 D2` | the same, `-t "WS3 D2"` | 30 passed (at least 26) |

The review found no wrong number in the runner as written. It found
rules that no test guarded, which could have given wrong numbers after
a later change. The code was right in each case, and a test for each
now fails when the rule is broken:

- The job's two options, the fewest individuals and the threshold of a
  polymorphic variant, reach popnei. Every test had used popnei's own
  defaults, so a runner that dropped them would have passed.
- "Only variants that passed" reaches popnei. The test VCF has only
  variants that passed; a VCF with 100 variants marked `q10` now gives
  1,200 variants or 1,100.
- The filters already on the open file are reused only when they are
  the job's filters, all of them, in their order. The missing data
  filter at 0.05 alone keeps 1,152 variants of `panel.nei`, and with a
  MAF filter at 0.9 after it, 1,058.
- The four columns of the result are placed by the name of the
  population, when populations are named by numbers.

Two defects of the runner were fixed. What the progress callback throws
at popnei's last call of a run was lost, and the run answered as if
nothing had happened. A read of a VCF with no read options, a defect of
our own, would have been answered as popnei's refusal of the file. The
types now make it impossible to write.

Not covered: the check that a filter step has as many arguments as its
filter has fields. popnei always gives the same number, so no test
through popnei can break it.

## 4. The reader of the metadata file

Done as planned. The reader, in the light worker, reads a CSV or TSV of
the individuals, finds its encoding, separator and decimal mark, and
the type of each column.

| Deliverable | Command | Result |
|---|---|---|
| 1. `WS4 D1` | `npx vitest run src/worker/individuals/csv.test.ts -t "WS4 D1"` | 56 passed (at least 23) |
| 2. `WS4 D2` | `npx vitest run src/worker/individuals -t "WS4 D2"` | 44 passed (at least 14) |
| 3. `WS4 D3` | `npx vitest run src/worker/individualsFile.test.ts -t "WS4 D3"` | 19 passed (at least 10) |
| 4. `WS4 D4` | `npx vitest run src/worker/individuals -t "WS4 D4"` | 4 passed (at least 4) |

What the review changed:

- A cell that the code makes impossible to miss was read as empty when
  missing. It is now an error of our own code, since the screen and
  the xlsx reader of stage 4 will give the reader tables it did not
  make.
- The words of the warning of a column of few whole numbers have their
  own function, `columnWarningText`, beside the warning, and the spec
  lists it.
- A file the browser cannot read keeps the browser's name for the
  error, which tells a deleted file from a changed one.
- The lint now refuses the text decoder in the reader of the text, as
  the spec says.
- 12 rules had no test that failed when they broke. The one that
  matters most: a file saved by Excel on Windows ends each line in two
  characters. A refusal of such a file must name line 3, where a
  broken reader would name line 5. The others are the choice of the
  separator, the decimal mark, the order of the refusals, a column of
  one number, and a byte 0 far into the file.

The spec now has an open point for stage 4. The number 1 and the text
"1" of an xlsx count as two values in the code and as one in the
spec's words.

## 5. The diversity in core, and the list of the application

Done as planned. `src/core/analyses/diversity.ts` gives what the store
needs of the diversity: why it cannot run, its key, its job, its
warnings, its check numbers, the rows and the CSV of its table.
`src/core/apps.ts` lists the analyses and the steps of the population
genetics application, and its first project, with the missing data
filter on at 0.1.

| Deliverable | Command | Result |
|---|---|---|
| 1. `WS5 D1` | `npx vitest run src/core/analyses/diversity.test.ts -t "WS5 D1"` | 13 passed (at least 11) |
| 2. `WS5 D2` | the same, `-t "WS5 D2"` | 19 passed (at least 17) |
| 3. `WS5 D3` | the same, `-t "WS5 D3"` | 42 passed (at least 21) |
| 4. `WS5 D4` | `npx vitest run src/core/apps.test.ts -t "WS5 D4"` | 4 passed (at least 3) |

Task 5.2 showed a row of the key failing on a scratch version that
sorts the rows of the metadata file. The two keys came out equal, and
exactly one test of 49 failed.

What the review changed:

- The populations of a table were kept for tables that were not
  frozen. The store freezes every project, so nothing showed it. They
  are now kept only for frozen tables, as the keys of core are.
- The warning for one variant kept read "at none of the 1 variant
  kept: at each". It now reads "has no value at the one variant kept:
  fewer than 20 of its individuals have a genotype there."
- Who has no population is worked out in one place, so the warning and
  the populations sent to popnei cannot disagree.
- The names of the three steps are declared once, in `apps.ts`, and the
  shell spec now imports them from there.
- 25 behaviours had no test that failed. Among them are the options of
  a project file reaching the job, the script and the warnings, and
  the key changing when another column of the same table groups the
  individuals. Without these tests, a table of other settings could
  have been shown as current. All now have tests.

## 6. The project file

Done as planned. `src/core/projectFile.ts` writes the file that Save
project gives and reads the file that Open project… takes. After an
opening it compares the variants file given with the one the project
was made with, and says whether a new run gives the saved numbers. The
three fixtures of version 1 were written by hand from the spec's
example and are added to `.prettierignore`, since Prettier would split
their one-line lists.

| Deliverable | Command | Result |
|---|---|---|
| 1. `WS6 D1` | `npx vitest run src/core/projectFile.test.ts -t "WS6 D1"` | 27 passed (at least 16) |
| 2. `WS6 D2` | the same, `-t "WS6 D2"` | 32 passed (at least 25) |
| 3. `WS6 D3` | the same, `-t "WS6 D3"` | 14 passed (at least 12) |
| 4. `WS6 D4` | the same, `-t "WS6 D4"` | 3 passed (3) |

The review found no defect in what the file holds. It found that the
rules which keep old check numbers out of a save had tests for only
some of their cases. The check numbers are the numbers a project file
keeps so that a new run can be compared with them. If any rule broke,
a file saved after an opening would keep numbers that no longer match
its variants file. The next opening would then say "not the same
numbers", and the user would blame their file. Nine cases now have
tests, and the first of the three properties now checks the check
numbers it writes. A rule of the words of a list, copied from
`project.ts`, is now imported, and the ending `.popnei.json` is
exported for the Save of work package 9.

## 2. The messages and the worker client

Done as planned. `src/worker/messages.ts` holds the messages between
the page and its two workers, and the checks that refuse a message of
the wrong shape. `src/worker/client.ts` is the page's one door to the
two workers: it starts them, sends each request, gives each answer to
its own request, and starts a worker again after a crash.

| Deliverable | Command | Result |
|---|---|---|
| 1. `WS2 D1` | `npx vitest run src/worker/messages.test.ts -t "WS2 D1"` | 20 passed (at least 17) |
| 2. `WS2 D2` | the same, `-t "WS2 D2"` | 36 passed (at least 22) |
| 3. `WS2 D3` | `npx vitest run src/worker/client.test.ts -t "WS2 D3"` | 64 passed (at least 32) |
| 4. `WS2 D4` | the same, `-t "WS2 D4"` | 6 passed (the five properties, and a sixth from the review) |

The property "no worker is sent a second `open`" was shown to fail on a
scratch client that sends the `open` again after a restart. It failed
after 52 sequences, shrunk to five steps: pick, ready, opened, the idle
worker crashes, run. It first passed on that scratch client, because
fast-check draws short sequences unless told otherwise. The properties
now draw sequences of up to 60 steps.

What the review changed in the code:

- A new property, "every answer is the one its worker gave for its
  request", found a real defect on its first run. A message that a
  stopped worker had already sent could be taken as the answer of the
  worker started after it. Each handler now reads only while its worker
  is the current one.
- A calculation worker that crashed while idle, after each time it read
  the file again, was started again with no end. In the reviewer's
  test, 6 crashes made 7 workers. The spec gives up after 2 failures.
  Now an `open` counts as an answer only when a request waited on it.
- When a worker's script fails to load, as in a tab left open while a
  new version of the site goes up, the browser gives no message. The
  client stored the reason as nothing. It now gives its own words,
  "the worker stopped with no message", as the probe of stage 0
  learned to do.
- A request answered twice was dropped with no word, so the property
  "answered exactly once" could not fail on "twice". A second answer
  is now written to the console as a defect, and the property reads
  it.
- The separators, the answer that a file was opened, and the format and
  read options of the variants file are declared once, in
  `protocol.ts`. The messages, the client, the runner and the reader
  take them from there.
- The test review found 12 of 30 changes to the client, and 21 of 22
  changes to the checks of the messages, that no test caught. Each now
  has a test that fails. The checks of the messages are also tested by
  a property that damages one field of a valid message at a time and
  expects a refusal that names that field.

Not changed: after a reopen that fails, the client tells the store that
popnei is ready before the new worker has opened the file. The client
spec says this comes "when that open has ended", and a failed open has
ended. What could go wrong is the mark "waits for the file" on the next
run, not a number. It will be seen on the screen in work package 8.

## What the reviews of 2 to 6 ask of the owner

Each of these changes what the user reads, or a spec, so none was done.
None stops the work: each spec's words stay as they are until the owner
decides. They go to the owner at the stop of task 7.5, each with a
recommendation.

The metadata file:

1. A header with empty cells at its end, `id;pop;;`, is counted as four
   columns, so a short row is refused with "the header has 4". The
   user sees two names in Excel.
2. A VCF picked by mistake as the metadata file, when its header lines
   have no comma, is read as a table of one column. The user is then
   told that every individual is missing.
3. With the encoding on "auto", a UTF-8 file that has its byte order
   mark and one bad byte is read whole as Windows-1252, so every
   accented letter comes out wrong.
4. A UTF-16 file cut short is refused at a line the user cannot see.
5. A column with no name whose cells are all `NA` or `-` is refused as
   a column "with values but no name".

The diversity:

6. A VCF with no variants, which popnei opens and then finds empty, is
   refused with "Loosen the filters", even with no filter on.
7. A VCF whose genotypes are of two ploidies, a haploid chromosome X
   among diploid ones, is refused at ploidy 2 with advice to set 1, and
   at ploidy 1 with advice to set 2.
8. A project file whose filter of individuals names an empty or wrong
   list is told to remove the filter in the Variants step, which has no
   such control in stage 2.

The project file:

9. Suppose the user opens a project, gives the same VCF again, sets the
   ploidy from 2 to 4, and saves before the file has been read again.
   The saved file says ploidy 2.
10. A VCF given again with "only variants that passed" changed gets no
    warning, and its saved numbers are neither kept nor compared, so
    the panel says nothing about them.
11. A file edited by hand whose check has 6 numbers where 7 are
    expected opens, and later blames the variants file.
12. Point Q, the words of the project file, is judged at stop 9.6. The
    reviews add three: a field missing at the top of the file is named
    by its name in the code, "its field "saved" is missing"; a text
    reads "should be the file read, or nothing yet"; and the message
    of a newer format has no way out when the page is already the
    newest.

For popnei: its progress callback's documentation does not say that a
throw at the last call of a run is dropped. The runner now handles it.
popnei's messages can hold names from the user's file, and are shown
as they come, not escaped or cut. No spec asks for either.

### How the work of 2 to 6 went, for whoever revises a skill or a plan

The owner can stop reading here.

- Five writers in one folder worked, because each owned its files. The
  checks of the whole tree failed while another writer was midway,
  so each writer checked its own files and the orchestrator ran the
  whole after.
- Reviewers left scratch test files behind, and one cut short made the
  typecheck of the whole tree fail. The scratch file had only "hello"
  in it. A reviewer's prompt should say to delete its scratch files
  even when it stops early.
- The `tests` reviewers found the most: 12 of 22 changes to the reader,
  12 of 30 to the client and 21 of 22 to the message checks passed
  every test. The writers had been told to see each test fail, and
  mostly did it for the tests they wrote first. Tests added at the end
  of a task were rarely broken on purpose. A task's prompt should ask
  for a scratch break of each rule of the spec, not of each test.
- Tokens, roughly: the five writers 200,000 to 400,000 each with their
  fixes; the 25 reviewers 47,000 to 148,000 each.

## 7. The page, its two workers, and the Variants step

The tasks and the review are done. The owner's stop, task 7.5, is open.

A user now opens `popgen.html` and sees the frame of the application:
its name, the three steps and the Variants step. There they pick or
drop a `.nei` file or a VCF, set the ploidy of a VCF and whether only
the variants that passed are read, and see the individuals and the
ploidy of the file, or why it could not be read. They set the missing
data filter. An error of the page's own code shows in a bar at the
top.

| Deliverable | Command | Result |
|---|---|---|
| 1. `WS7 D1` | `npx vitest run src/ui -t "WS7 D1"` | 35 passed (at least 29) |
| 2. `WS7 D2` | `npx playwright test --project=chromium --project=webkit -g "WS7 D2"` | 42 passed, 21 in each engine (at least 16) |
| 3. `WS7 D3` | the same, `-g "WS7 D3"` | 40 passed, 20 in each engine (at least 18) |
| 4. The build | `npm run build`; `ls dist/assets \| grep -cE "runnerWorker\|filesRunner"` | `dist/popgen.html` written; 2 |
| 5. The screenshots | `npm run screens` | 44 passed; the orchestrator looked at the frame, the error bar and four states of the step |

Seen in Chromium 153 and WebKit 26.6, through Playwright, by the
subagents and the reviewers, with the mouse and with the keyboard
alone. Not seen in Firefox, which the owner tries by hand. No screen
reader was tried.

The plan's risk for this work package did not happen. WebKit reads a
`File` by ranges in the calculation worker as Chromium does: in both,
`panel.nei` and `panel.vcf.gz` picked by the user opened with 200
individuals and ploidy 2. The light worker, which reads the metadata
file, read `panel_pops.csv` in a browser for the first time.

One dependency was added, as the plan says: `react-aria-components`
1.21.1, the version `npm view` gave, with 12 packages of its own.

### The review

Eleven reviewers, all the categories of the code-review skill. The
accessibility and React reviewers looked a second time at the markup
the fixes changed. What mattered, now fixed:

- **The threshold and wrong numbers.** In a browser set to Spanish,
  "0.05" typed in the threshold was read as 5 and turned into 1, a
  filter that keeps every variant, with no word. The page now reads
  every number as English. Text in the other decimal convention is
  refused, and the field keeps its old value. The field also rounded
  twice, so 0.1249 was held as 0.13. It now rounds once, to two
  decimals, half up: 0.125 gives 0.13 as the spec says, and 0.1249
  gives 0.12. The subagent had changed the spec's 0.13 to 0.12 to match
  React Aria. That was reverted, since the spec's words are the
  owner's.
- **The ploidy.** A file dropped while a new ploidy was still being
  typed was read with the old one. Ploidy values typed but never
  applied came back after an Undo; a test on the real store now fails
  if they do.
- **Faults of the page's own code.** One such fault in a step emptied
  the whole application. Each step now has its own boundary: the page
  keeps its frame, and the error bar says what happened. A fault while
  the page started left "Loading…" on the page for ever.
- **Browsers too old.** Firefox 104 to 114 was not told that it is too
  old. The page's first check now tests a function the code uses,
  which Firefox has from 115, Chrome from 110 and Safari from 16.
- **Where popnei may go.** The lint let the page or the light worker
  import popnei if the import was written without its file ending. It
  now refuses ten such imports, each shown refused.
- **Also fixed.** The stepper's links moved sideways when the current
  step changed. The error bar's box of details kept the errors of the
  moment copying failed. Four states of the step had no screenshot.
  The page's controls were read in the browser's language, not in
  English.

Not taken: the reviewers' wish that the Individuals step may not import
the reader of the metadata file, since that step imports the warning of
a column by design.

### Numbers measured

The page's first script grew from 21.9 KB to 76.9 KB gzipped. 50.7 KB
of that is React Aria, and 19 KB of React Aria is its words in 34
languages. popnei's wasm of `js-v0.1.0-dev.2` is 2.16 MB, 710.6 KB
gzipped, where `docs/technology.md` had 0.63 MB from an earlier build;
the documents now say 0.71 MB. The bundle reviewer measured these on
25 September 2026 with Vite's build and its source maps.

The test review found that 9 of 22 deliberate breaks of the code
passed every test. The one that mattered most: the check box "Only the
variants with PASS or ." never reached a read in any test. Each break
now fails a test. After all fixes, on the last commit of the work
package: `npm test` 1,223 passed, and 122 browser tests passed in
Chromium and WebKit, the probe's 40 among them.

### What waits for the owner at stop 7.5

Each changes what the user reads, so none was done. Each comes with a
recommendation.

1. The button that reads a VCF again names only the ploidy when both
   the ploidy and "only the variants that passed" differ, though it
   reads again with both. Recommended: "Read tetraploid.vcf.gz again
   with ploidy 4 and every variant".
2. The threshold turns a value outside 0 to 1 into the nearest bound
   without a word: "10" becomes 1, a filter that keeps every variant.
   It also rounds 0.001 to 0 without a word. Recommended: the label
   gives the range, "Maximum proportion of missing genotypes, from 0 to
   1", and the ploidy "from 1 to 255". A value outside the range is
   refused with a line under the field, "10 is more than 1; the filter
   keeps 0.1.", instead of being changed.
3. The words under the ploidy, "…and the file is read again with the
   right ploidy", read as if the application does it by itself.
   Recommended: "…set the right ploidy here and read the file again."
   The card of a VCF also says "Ploidy 2", which is the ploidy given,
   not one found in the file. Recommended: drop that line for a VCF
   and keep "Read with ploidy 2".
4. A refusal shown in the Variants step ends "Load a variants file in
   the Variants step.", beside a button named "Replace bad.vcf…". These
   are the provisional words of core, Open 2 to 6 of
   `docs/specs/core/project.md`. Recommended: "Choose another file." in
   this step.
5. React Aria's drop zone has a hidden button that takes a pasted file.
   It is an extra stop of the Tab key and does nothing on Enter. It is
   now named "Paste a variants file". A paste worked in WebKit, and is
   not verified in Chrome. Recommended: keep it and list it in the
   spec, unless the owner's check by hand shows the paste does nothing
   in Chrome.
6. A folder, or a piece of text, dropped on the zone does nothing and
   says nothing. Recommended: "Drop a VCF or a .nei file, not a
   folder."
7. Until task 9.4 the error bar says "save it, then reload the page",
   and there is no Save on the page. Recommended: accept until 9.4.
8. React Aria's words in 34 languages add 19 KB gzipped to the page's
   first script. React Aria's plugin `@react-aria/optimize-locales-plugin`
   would remove them; it is a new development dependency, not shipped
   to users. Recommended: add it if it works with Vite 8.

With these, the twelve points of the reviews of work packages 2 to 6,
listed above under "What the reviews of 2 to 6 ask of the owner".

## 8. The Individuals step and the diversity panel (under way)

### Point R, measured on 25 September 2026

Point R asks whether a browser reads a variants file that changed on
the disk after the user picked it, and says nothing. Measured on an
Apple M5 Pro with 64 GB, in Chromium 153.0.8010.12 and WebKit 26.6
under Playwright 1.63.0, with `e2e/measure.spec.ts`. A copy of
`panel.nei` was picked and run at 0.05. It was then rewritten in place
three ways, and after each rewrite the diversity was run at 0.05 and
at 1. The first check deleted the file: both engines then answered
"could not be read again", so each read the file on the disk and not
a copy in memory.

| Rewrite | Chromium | WebKit, a second later | WebKit, time of change put back |
|---|---|---|---|
| its first 130,000 bytes | "could not be read again" | "could not be read again" | popnei's refusal (cut short), then "could not be read again" at 1 |
| a byte changed in the middle | "could not be read again" | "could not be read again" | popnei's refusal, "damaged", at 0.05 and at 1 |
| 4,096 zero bytes added | "could not be read again" | "could not be read again" | a table, with no word: the file changed, and the page said nothing |

So Chromium always refuses a changed file. WebKit refuses it when its
time of change moved, and reads the new bytes when the rewrite kept
that time, as `rsync -t` or a tar restoring an older version does. In
that case the rewrite that added bytes gave a table with no word. Here
the added zeros did not change the numbers; a rewrite that changed the
genotypes and kept the time would give other numbers, with no word. Firefox is measured
by the owner by hand.

### Other measurements of task 8.3

A pass over the VCF of the Stop test, 200,000 variants and 127,600,467
bytes gzipped: 3,739 ms in Chromium, 3,576 ms in WebKit. The VCF is
gzipped because a plain VCF is read at about 300 MB/s here, and a
3-second pass would need about 1 GB.

The restart of the calculation worker:

| File | Engine | Start to ready | Start to opened | Run at 0.05 | Run at 1, opened again | Run on a new worker |
|---|---|---|---|---|---|---|
| VCF, 80,692,954 bytes | Chromium | 10 ms | 19 ms | 258 ms | 253 ms | 272 ms |
| VCF | WebKit | 28 ms | 35 ms | 269 ms | 263 ms | 255 ms |
| `.nei`, 19,161,178 bytes | Chromium | 10 ms | 18 ms | 142 ms | 128 ms | 141 ms |
| `.nei` | WebKit | 28 ms | 36 ms | 138 ms | 131 ms | 134 ms |

A metadata file of 10,000 rows and 20 columns, 1.39 MB, in Chromium:
111 ms from the pick to the columns shown. 33 clicks were answered
meanwhile, none waited more than 2 ms, and no task of the page lasted
more than 50 ms.
