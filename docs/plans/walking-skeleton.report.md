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

## 8. The Individuals step and the diversity panel

The tasks and the review are done. The owner's stop, task 8.4, is open,
with the result of point R in Firefox, which the owner measures by hand.

| Deliverable | Command | Result |
|---|---|---|
| 1. `WS8 D1` | `npx playwright test --project=chromium --project=webkit -g "WS8 D1"` | 40 passed, 20 in each engine (at least 12) |
| 2. `WS8 D2` | the same, `-g "WS8 D2"` | 26 passed, 13 in each engine (at least 10) |
| 3. `WS8 D3` | the same, `-g "WS8 D3"` | 2 passed, 1 in each engine (2) |
| 4. The measurements | `npx playwright test --project=measure-chromium --project=measure-webkit` | 21 passed, 1 skipped, when the large files were in place (task 8.3); the tables are below |
| 5. The screenshots | `npm run screens` | 74 passed; the orchestrator looked at the Individuals step read and with individuals missing, and the diversity done and with a warning |
| 6. Point R and the owner's acceptance | task 8.4 | Chromium and WebKit below; Firefox and the acceptance wait for the owner |

After the review's fixes, on the last commit of the work package:
`npm test` 1,253 passed; 190 browser tests passed in Chromium and
WebKit. Seen in Chromium 153 and WebKit 26.6 through Playwright, with
the mouse and with the keyboard alone; not in Firefox; no screen reader.

The diversity's table gives popnei's numbers to the last digit shown:
at 0.05, p0 reads 48 individuals, 0.3527, 0.3567 and 0.9288 over 1,152
variants; at 1, 0.3519, 0.3564 and 0.9267 over 1,200. The spec reviewer
recomputed every row with popnei's Python API.

What the review fixed that a user would have met: when a run ended, the
focus fell to the top of the page if the panel had been locked when the
step was opened; at 320 px, and at 200% zoom, the table squeezed the
names of the populations to one letter a line; two populations whose
names differ by an invisible character showed as two rows of one name;
on iOS the download of the CSV could fail; a column's name could reverse
the text of its warning. The test review found 12 of 14, then 10, rules
with no test that failed; each has one now, but the check that the focus
stays where it is when it was elsewhere, which React makes impossible to
break.

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

### What the review of work package 8 asks of the owner

Nine reviewers read the Individuals step and the diversity panel. The
spec reviewer recomputed the table with popnei's Python API: every row
matched to the last digit shown, at 0.05 and at 1, in Chromium and
WebKit. The reviewer of results kept after their inputs change drove
both engines through changes made during a run: another column,
another filter, a new file, Stop. The panel never showed a number of
other settings.

These change what the user reads, or a spec, and wait for the owner,
each with a recommendation:

1. After an Undo, the panel's words give the wrong cause. The removed
   state says "The diversity was removed because the missing data
   filter changed … Run calculates it for the new settings", when the
   user has just undone that change. The stopped line says "a new
   variants file was loaded" for every stop, including after reading
   the same file again with other options. Recommended: write both
   from the change itself, as the shell's notice does, "Undone: the
   missing data filter changed. The diversity was removed; Redo brings
   it back with no calculation, and Run calculates it for the settings
   as they are now."
2. After "could not be read again", Run is still offered, and pressing
   it gives the same message with no sign that anything happened.
   Recommended: offer no Run then, as after popnei's refusal.
3. A metadata file that also holds the individuals of another panel is
   meant to serve several variants files, its extra rows ignored. It
   gets the warning "Population p9 has no individual among the
   individuals of panel.nei that the filters kept", which blames
   filters that did nothing. Recommended: no warning for a population
   none of whose individuals are in the variants file.
4. The removed state does not list the populations that Run will take.
   Recommended: list them, as the ready state does.
5. The first values of a column are joined by ", ", so a column with
   the decimal comma reads "1,75, 1,62, 1,80". Recommended: " · ".
6. The message that individuals are missing sits under the list of
   columns, and reads as if choosing a column would fix it. Recommended:
   a subheading of its own, "Individuals of panel.nei".
7. The refusals of the reader end "Load a metadata file in the
   Individuals step.", shown inside that step. A short row most often
   comes from a wrong separator. Recommended: "Choose another separator
   above, or load a corrected file." for a short row and an unclosed
   quote, and "Load a corrected file." otherwise.
8. The page's first script grew from 77.6 KB to 148.3 KB gzipped in
   this work package. React Aria's table takes 25.1 KB of the increase,
   used for a table of 3 rows, and its select list 36.6 KB.
   Recommended: a plain HTML table, which the keyboard and screen
   readers handle as well, and keep React Aria's select list, with
   `docs/technology.md` updated.
9. "Calculated with popnei 0.1.0" cannot tell `js-v0.1.0-dev.1` from
   `dev.2`, since both packages say 0.1.0. That is a question for
   popnei's packaging.

What the owner should try in Firefox on these screens: the download of
the CSV, whose name should be `panel.diversity.csv` and whose first line
`population,individuals,…`; the list of the column with the arrow keys
and Enter; the list of missing individuals opened and closed; the bar
and Stop during a large VCF.

## The owner's decisions of 25 September on the open points

On 25 September the owner tried the Variants step, the Individuals step
and the diversity panel in Firefox by hand. The diversity of
`panel.nei` with `panel_pops.csv` at 0.05 gave the row p0 of the plan.
The result of point R in Firefox has not been sent, and stops 7.5 and
8.4 stay open until the owner sees the screens after the changes below.

The owner ordered that the 17 points of stop 7.5 and of work package 8
take the recommendations written above. Points 1 to 11 of the reviews of
2 to 6 had no recommendation written; the orchestrator proposed one for
each in chat, and the owner approved them as they are here:

1. A header with empty cells at its end, `id;pop;;`: those cells are
   dropped when their columns are empty in every row, and the columns
   are counted without them.
2. A VCF picked as the metadata file is refused with words that say it
   is a variants file, which the Variants step takes.
3. A UTF-8 file with its byte order mark and a bad byte is read as UTF-8;
   the bad byte is shown as �, and a warning names its line.
4. A UTF-16 file cut short is refused as a file that ends in the middle
   of a character and may have been cut short, with no line.
5. A column with no name whose cells are all `NA` or `-` is dropped as an
   empty column.
6. A VCF with no variants and no filter set: the words say that the file
   has no variants, and not "Loosen the filters".
7. A VCF of two ploidies: the words say that the file mixes ploidies and
   that this version reads a file of one ploidy, and advise no ploidy.
8. A project file whose filter of individuals is wrong: the words say
   that the filter has to be corrected in the project file, since the
   Variants step has no control for it in stage 2.
9. A Save while the VCF is read again with another ploidy saves the
   ploidy the user set, 4, and not that of the last read, 2.
10. A VCF given again with "only variants that passed" changed gets the
    same warning as a changed ploidy; the saved numbers are not
    compared, with a line that says why.
11. A project file whose check has the wrong count of numbers is refused
    at the opening as damaged.

Point 12, the words of the project file (point Q), stays for stop 9.6.
Point 7 of stop 7.5, the error bar's "save it" before the Save exists, is
accepted until task 9.4. Point 9 of work package 8, "Calculated with
popnei 0.1.0" for two releases, is popnei's packaging: nothing changes
here.

Two decisions add to what the plan names, by the owner's order: the
React Aria plugin that removes its words in other languages, a
development dependency, and the plain HTML table of the diversity, which
changes `docs/technology.md`.

Each decision is a change to a spec, in a commit of its own, and then to
the code. They are carried in rounds of the screens, below; the points
whose change reaches the core or the worker go with the round of the
screen that shows their words.

### The rounds of 25 September

Four rounds carried the decisions, each spec changed in a commit of its
own before the code, from 337dd88 to 17949d8; the review that followed
and its fixes run to d23b87e. On d23b87e: `format:check`, `typecheck`
and `lint` exit 0; `npm test` 1,345 passed; the build exits 0;
`npx playwright test --project=chromium --project=webkit` 236 passed;
`npm run screens` 102 passed. Seen in Chromium and WebKit through
Playwright, with the keyboard alone for the changes of focus; not in
Firefox; no screen reader.

1. The Variants step, the eight points of stop 7.5. React Aria's plugin
   `@react-aria/optimize-locales-plugin` 2.0.2 is a development
   dependency; with it and the plain table of round 3, the page's first
   script went from 148.4 KB to 100.5 KB gzipped.
2. The Individuals step and the reader, points 1 to 5 of the reviews of
   2 to 6 and points 5 to 7 of work package 8; `docs/architecture.md`
   shows the new field of the reader, the line of the first character
   not decoded.
3. The diversity panel, points 1 to 4 and 8 of work package 8 and
   point 6 of 2 to 6.
4. The project file, points 8 to 11 of 2 to 6, in core; what shows on a
   screen comes with task 9.4.

Where the writers went further than the decision, in the same direction:
a threshold of more than two decimals, 0.125, is refused and 0.1 kept,
where it was rounded to 0.13, since rounding also changes the filter
without a word; the plan's check of `WS7 D3` says so now. The refusals
of the steps end in three ways by their cause: "Choose another file."
after popnei's refusal, "Choose it again." for a file the browser can no
longer read, and "Reload the page and choose it again." for a read that
could not start. A file named `.vcf`, `.vcf.gz`, `.bcf` or `.nei`
picked as the metadata file is told it is a variants file.

Decided by the orchestrator: a ploidy typed and not applied with "Read
again" is saved as the old one, since it is a setting only once read; a
file dropped while the ploidy holds a refused number is read with the
ploidy kept, and the line says so; "Choose another separator above"
lost its "above", which is not where the separator is.

**Not done: point 7 of 2 to 6, a VCF of two ploidies.** popnei gives the
same refusal, "line N … its genotype is of the ploidy F and the reader
was asked for the ploidy E", for a file that mixes ploidies and for a
file all of the other ploidy, and does not give the count of header
lines that would tell them apart by the line. The words stay popnei's.
The owner decides between words that cover both cases, "set the ploidy
of the file; a file that mixes ploidies, as a haploid X among diploid
chromosomes, cannot be read in this version", and a change to popnei
that tells the two apart.

For stop 9.6, with point Q: the warning of a changed "only variants that
passed" says "Load the file the project was made with" to a user who
did, as the ploidy's does; a filter or a column changed after an
opening leaves the numbers uncompared with no line that says why; a
project file whose population column is not in the metadata file opens
with no word.

The review of the rounds. Seven reviewers: accessibility, react and ux
on the three screens, then spec, errors and stale on the core, and
tests alone after the fixes. What they found that a user would have
met, now fixed: a comma typed in the threshold, `0,1`, was thrown away
by React Aria and became 1, a filter that keeps every variant, with no
word; at 320 px the diversity's table showed no value and nothing said
it scrolls; a VCF whose every variant fails its FILTER, read with the
default of the passed variants, was called empty and the user sent to
load another file; after "could not be read again", Run came back after
any change and its Undo; the stopped line stayed after the user's own
later Stop; a short row was measured against a count of columns the user
sees nowhere; the refusal of the ploidy was read by a screen reader
after its description of 190 characters; a text pasted by the keyboard
was told to be dropped. `docs/functionality.md` was brought into line
with decisions 3, 4 and 10. The ux reviewer's words replaced two of the
recommendations for clarity: "the threshold stays 0.1" for "the filter
keeps 0.1", and "Undo brings back the table as it was". The tests
reviewer made 60 mutations: 54 failed a test, two more do now, one was
dead code, removed, and three are checks covered twice over.

Not taken: a metadata file that holds a real U+FFFD gets the warning of
a character not decoded, which is rare and still true in its words; the
project files of format v1 written before these changes are refused,
which is harmless since none was ever released.

### How the rounds went, for whoever revises a skill or a plan

The `code-reviewer` subagent has no Write tool, and the worktree guard
refuses a heredoc that holds JavaScript, so the accessibility reviewer
could not write a script to drive the page and reviewed from the code
alone; the fix writer, a `general-purpose` subagent, then checked the
keyboard and the focus in both engines. A reviewer that has to open the
page needs a way to write its script.

Eleven of the 29 points, 1 to 11 of the reviews of 2 to 6, had their
problem written and no recommendation, though the section said each
had one; the owner's "take the recommendations" could not cover them
until they were written and shown in chat. A point for the owner is
written with its recommendation when it is found.

The tokens of the subagents: the four rounds 310,804, 358,839, 302,018
and 257,442; the seven reviewers 57,268 to 148,525 each; the two fixes
420,166 and 254,401.

## 9. The shell whole, and the project saved and opened

Under way while the owner looks again at the screens of stops 7.5 and
8.4.

- 9.1, commits 1ececc9 (the shell spec: `stepStates` and
  `announcementsOf` take the state of any result) and a3596dd:
  `src/ui/shell/words.ts`. `npx vitest run src/ui/shell -t "WS9 D1"`
  gives "Tests 54 passed | 4 skipped", at least 52 asked; 67 of 68
  rules broken failed a test, and the one left changes no word. The
  "Undone: …" words are now in one place, shared with the diversity
  panel. Two words for the review of the screen: "All 1 individual
  found." for a single individual, and "0 populations by pop" in the
  summary line for a column that gives no individual a population, a
  case the spec's table lacks.
- 9.2, commit 3f78d05: Undo and Redo in the header, Ctrl or Cmd+Z and
  Ctrl or Cmd+Shift+Z or Ctrl+Y, not inside a text field or a dialog
  (not Cmd+Y, which opens the history of Safari); each step's state as a
  word and a symbol, its reason as a tooltip and the link's
  description, since React Aria's tooltip takes a Link; the summary
  line; the announcements from the state. `-g "WS9 D3"` gives 14 passed,
  7 in each engine, of the 20 that 9.3 and 9.4 complete. Seen in
  Chromium and WebKit with the keyboard. For the review of the screen:
  a disabled Redo looks close to an enabled one in the light theme.
- 9.3, commit 09ed24a: the notice, React Aria's toast with no timer, one
  at a time, in a region named "Notice" that F6 reaches, with Undo or
  Redo and Close; the focus goes back where it was when the notice goes.
  Every Undo and Redo, of the header, the keyboard and the notice, goes
  through one function. The stopped line of the diversity was already
  built by the rounds. React Aria 1.21.1 does not let F6 reach a region
  made before its first toast, so the region is made again with each
  notice. `-g "WS9 D3"` gives 22 passed, 11 in each engine. The first
  script grew from 105.82 KB to 109.77 KB gzipped. Not seen: a notice's
  own Undo that makes a new notice, which needs two analyses.
- 9.4, commit a47a846: `src/ui/saving.ts`, the dialogs of Save project
  and of Open project…, the question before leaving and before an
  opening, the Save of the error bar, the variants file an opened
  project asks for with the warning of the identity, and the comparison
  under the diversity's table. No spec changed. The computer rebooted
  while the first subagent had the work written and not committed; a
  second one found the one test that failed, in Chromium: a dialog gave
  the focus back to its button one frame after closing, and took it
  from a field the user had already moved to, so a quick Enter opened
  the dialog again. The focus is now given back only when it was lost,
  is still in the dialog, or is on that button. On a47a846: `npm test`
  1,415 passed; the build exits 0; `npx playwright test
  --project=chromium --project=webkit` 284 passed; `-g "WS9 D3"` 48
  passed, 24 in each engine; `-t "WS9 D2"` 6 passed, at least 4 asked;
  `npm run screens` 138 passed. Seen in Chromium and WebKit through
  Playwright; not in Firefox.
- 9.5, commit bf1630a: `e2e/skeleton.spec.ts`, one test for each
  sentence of `docs/architecture.md` section 10, with axe in each state.
  At 0.05 the row p0 reads 48, 0.3527, 0.3567, 0.9288, the numbers of
  the diversity spec. `npx playwright test --project=chromium
  --project=webkit e2e/skeleton.spec.ts` 10 passed, at least 10 asked,
  in three runs in a row; the whole suite 294 passed.

### The deliverables of work package 9, on 7b9bce1

1. `npx vitest run src/ui/shell -t "WS9 D1"`: 61 passed, at least 52
   asked.
2. `npx vitest run src/ui/saving.test.ts -t "WS9 D2"`: 9 passed, at
   least 4 asked.
3. `npx playwright test --project=chromium --project=webkit -g "WS9
   D3"`: 92 passed, 46 in each engine, at least 20 asked.
4. `npx playwright test --project=chromium --project=webkit
   e2e/skeleton.spec.ts`: 10 passed, at least 10 asked.
5. The screenshots: `npm run screens` 146 passed; each state the plan
   names is in `screens/`, light and dark, with the dialogs, the notice
   and the ready shell also at 320 px, and the orchestrator has looked at
   them.
6. The owner's acceptance: waiting, task 9.6.

Also on 7b9bce1: `format:check`, `typecheck` and `lint` exit 0; `npm
test` 1,434 passed; `npx playwright test --project=chromium
--project=webkit` 338 passed; the first script 122.93 KB gzipped, from
105.82 before the work package. Seen in Chromium and WebKit through
Playwright, the keyboard alone among them; not in Firefox, and not with
a screen reader.

### The review of work package 9

Eleven reviewers on commits 5e2f549 to 01144df: spec, tests, stale,
errors, api, architecture, react, accessibility, ux, browser and bundle.
The accessibility reviewer drove the page with the keyboard in Chromium
and WebKit; the tests reviewer ran alone, after the fixes, since it
changes the code. Two fixers carried items A to Q, a third added the
tests the tests reviewer found missing, and accessibility and react
looked again at the fixes. After the tests reviewer, 1,431 passed;
`npx playwright test --project=chromium --project=webkit` 332 passed;
the shell and saving flows three times in a row, 82 passed each; the
first script 122.67 KB gzipped, from 121.94 before the fixes.

What a user would have met, now fixed:

- A project opened on the Variants step kept a ploidy the user had typed
  before, so the VCF the project asked for was read with it and its
  numbers were not compared.
- The keyboard's Undo and Redo did nothing while the focus was in the
  notice, the one place that offers Undo; nor, outside a text field,
  with a Russian or Greek keyboard layout.
- In WebKit, Cmd+Z pressed twice in the Save dialog's name field put the
  threshold behind the dialog back to its old text, while the project
  kept the new value.
- A project that could not be saved, a defect of the application, sent
  the user round a loop: each Save failed with no word, while the bar
  said to save and reload, which would lose the project. The bar now
  says it could not be saved; the Save dialog closes before it writes.
- What the status region said while a dialog was open was hidden from a
  screen reader, a result that ended during a Save among it.
- The question before an opening kept "The ongoing calculations will be
  stopped." after they had ended; two files picked close together could
  open the older one; seven of the eleven refusals of a project file did
  not name the file, which the dialog's heading now does.
- The warning of a second differing variants file was not announced,
  nor the warning brought back by Undo from another step.
- The details a user was copying by hand disappeared after a press of
  Save in the bar; a second press was not read again.
- Escape in the notice now takes the focus back where it was.

For whoever maintains the code: the opening now gets its application
and analyses from the entry, as the saving does; the stepper no longer
redraws at every progress message; `docs/technology.md` records React
Aria at 70.8 KB gzipped, measured on 26 September 2026, where it said
50.7. One fix, the dialogs' content as one value, left an overlay over
the page after a dialog closed, in both engines; its fixer found it and
a test now guards it.

The tests reviewer made 116 mutations after the fixes; 88 failed a test.
The tests added after it cover the 28 that did not, where they showed a
case: Copy the details that works, which the plan's WS9 D3 lists and no
test had; the focus after an opening; eight cases of the announcements;
the saving of the other application. Code that gave the focus back
after a dialog, which React Aria does in every path tested, was removed,
except after a Save, where React Aria is 2 to 5 frames late.

Not taken:

- Loading the reader of project files only when a file is opened would
  take 4.5 KB gzipped off the first script, 3.7%, but splits a core
  module specified in full. For the owner, with the measurements of
  work package 10.
- The check of populations sits in the diversity's module, so the next
  analysis that needs it will touch that module or the shell. For the
  stage that adds Fst or the PCA; no issue opened, since issues go to
  GitHub only on the owner's order.

A second look by accessibility and react at the fixes found four more,
now fixed from 92e495a to 7b9bce1: with a dialog open, F6 still reached
the notice, whose Undo changed the project behind the dialog, and the
Save then wrote the undone project; the status region read a warning
before the undo that brought it back; the message of a refused file came
back with a Redo; and a large project file whose read ended while the
Save dialog was open was opened behind it, which now waits for the
dialog to close. One change of what a screen reader hears: the warning
of a differing variants file is now read once, after the words of its
read.

### What waits for the owner at stop 9.6

The shell, in Firefox by hand as well, and the words of the open points
Q, K and Open 2 to 6 of `docs/specs/core/project.md`, with the three
points listed above under "The rounds of 25 September". The review adds
these, each with a recommendation:

1. A project saved with `panel.nei` and given `panel.vcf.gz` shows no
   comparison under the table and no reason. Recommended: "Not compared
   with the numbers of the project file: this file is a VCF, and the
   project was made with a .nei file. Load panel.nei to compare them."
2. The warning of a differing file gives the sizes in bytes when the
   format differs, where they always differ. Recommended: leave the
   sizes out then.
3. On the Variants step itself: "This project was made with panel.nei
   and 200 individuals. Load it in the Variants step to run its analyses
   again." Recommended: "This project was made with panel.nei, of 200
   individuals. Load it to run its analyses again."
4. A name typed as `run1.json` saves `run1.json.popnei.json`.
   Recommended: a trailing `.json` or `.popnei.json` is not doubled.
5. The question before an opening says "Save the project first to keep
   it." and has no Save. Recommended: "To keep it, answer Keep the
   current project and save it first."
6. After a save that failed, the error bar still says "save it, then
   reload the page" above its line that the project could not be saved.
   Recommended: the first line then ends "Your project could not be
   saved; copy the details and report them."
7. A refused project file of an analysis this version does not know
   says it was saved by another version, and nothing to do.
   Recommended: add "Open it with the version of the application that
   saved it."
8. A result that ends after a Save does not count as a change: the page
   does not ask before it is left, and the saved file lacks that
   result's numbers for the comparison. With point K. Recommended: count
   it as a change.
9. The page cannot ask before it is left on an iPad or an iPhone, nor
   after a file only dropped, with no click: browsers do not allow it.
   With point K. Recommended: say so in the help of Save project.
10. On a Mac keyboard F6 is a media key; the notice is reached with
    fn+F6, or with Tab. Recommended: write "F6 (fn+F6 on a Mac)" where
    the notice is explained; the owner tries F6 in Firefox, Chrome and
    Safari.
11. The comparison under the diversity's table is not announced to a
    screen reader. Recommended: add it to "Diversity: done."
12. In the dark theme a disabled Redo or Save looks close to an enabled
    one, 1.93 to 1 between their texts. Recommended: dim the disabled
    text further.

For the hand check in Firefox, the browser reviewer lists: F6 with the
notice up; Save project downloads `panel.popnei.json` and does not show
it; the question at a reload after a change; Copy the details with
Enter; Cmd+Z in Safari after closing another tab undoes on the page.

## 10. The end of the stage

### The measurements, on 26 September 2026

The five measurements that `docs/build-order.md`, stage 2, leaves for
the end of the walking skeleton, each with the decision it asks of the
owner and the recommendation its numbers support. All were made on an
Apple M5 Pro with 64 GB, under macOS 27.0, on the built site of commit
`aea8b17` with the measuring code of this task beside it, in Chromium
153.0.8010.12 and WebKit 26.6 under Playwright 1.63.0, and in node
26.8.2. Firefox was not measured: Playwright cannot start it on this
Mac. Each time is the median of the repetitions, with their range, the
smallest and the largest, after it. The code is in `e2e/measure.spec.ts`
and `e2e/measure/`, and `.claude/skills/coding/testing.md`, "The
measurements", says how to run it again.

#### The React Compiler: what React's drawing costs

React draws the screens: after each change it calls the components
again and puts what changed on the page, and each such round is a
commit. The React Compiler, left off for the walking skeleton
(`docs/technology.md`), would spare the components whose inputs did not
change; so what it can save is at most the time React spends drawing.
That time was measured with React's `<Profiler>` in a build of the site
with React's profiling build, which the site's own build does not
contain, in Chromium, with `panel.nei` and a metadata file of 10,000
rows and 20 columns loaded (the 200 individuals of `panel.nei` and 9,800
more), over 10 repetitions in one page. "The whole tree drawn again" is
React's estimate of drawing every component, as a change that the
compiler could not narrow would. The last column is the longest event
of the interaction as the browser's Event Timing gives it, from the
input to the next frame drawn, in steps of 8 ms and only from 16 ms up;
it includes Playwright's delivery of the input.

| Interaction | Commits | React drawing, all its commits | The whole tree drawn again | Input to frame |
|---|---|---|---|---|
| a change of step, to Variants | 7 (6 to 7) | 4.2 ms (3.2 to 4.8) | 2.4 ms (2.0 to 3.0) | 24 ms (16 to 24) |
| a change of the threshold | 9 (9 to 9) | 3.4 ms (2.8 to 4.0) | 2.4 ms (2.1 to 2.7) | 24 ms (16 to 32) |
| a change of step, to Analyses | 8 (8 to 8) | 2.4 ms (2.0 to 3.0) | 2.3 ms (1.5 to 2.7) | 24 ms (16 to 24) |
| a result arriving | 3 (3 to 3) | 0.6 ms (0.3 to 0.7) | 1.3 ms (0.8 to 1.7) | no input |
| an undo, its result brought back | 4 (4 to 4) | 1.3 ms (0.9 to 1.7) | 1.4 ms (0.9 to 1.7) | 24 ms (16 to 24) |

React spends at most 4.8 ms of an interaction drawing, where a frame at
60 Hz lasts 16.7 ms, and drawing the whole tree would take at most
3.0 ms. **The decision: whether the React Compiler is turned on for the
stages after this one.** Recommended: keep it off. The most it could
save here is under 5 ms per interaction, for three development packages
more. The plots of the later stages are drawn by D3, outside React, so
they do not change this; the measurement is run again if a later screen
shows a commit above 16 ms.

#### The restart of the calculation worker, and the compiling of popnei's wasm

The calculation worker is the second thread of the tab that runs popnei.
It is ended and a new one started when the user loads a variants file
again (`docs/architecture.md`, section 5); a Stop does the same. Task
8.3 measured it once; the worker's code has not changed since, but the
page around it has, so it was measured again, 5 times on a new page
each time, on the two large files of task 8.3: a VCF of 80,692,954
bytes, 20,000 variants and 1,000 individuals in 3 populations, and the
`.nei` file of 19,161,178 bytes made from it. The first row is the
worker a page starts when it opens, which fetches popnei's wasm, 2.16 MB,
from the server on the same machine and compiles it. A "pass" is one
read of the whole file by popnei.

| What | `.nei`, Chromium | `.nei`, WebKit | VCF, Chromium | VCF, WebKit |
|---|---|---|---|---|
| the page's first worker, its start to popnei ready | 25 ms (25 to 26) | 54 ms (53 to 58) | 26 ms (25 to 26) | 55 ms (47 to 57) |
| a new worker, its start to popnei ready | 12 ms (10 to 12) | 32 ms (30 to 41) | 11 ms (10 to 12) | 34 ms (31 to 41) |
| a new worker, its start to the file opened | 20 ms (19 to 21) | 40 ms (39 to 49) | 18 ms (18 to 19) | 39 ms (37 to 47) |
| a run after the open: the filter and a pass | 135 ms (134 to 135) | 140 ms (138 to 143) | 244 ms (240 to 248) | 268 ms (263 to 270) |
| a run with another filter: the file opened again and a pass | 121 ms (119 to 124) | 128 ms (125 to 128) | 237 ms (236 to 242) | 263 ms (258 to 277) |
| a run on the new worker: the filter and a pass | 136 ms (135 to 138) | 139 ms (135 to 140) | 244 ms (240 to 248) | 263 ms (258 to 269) |

The numbers differ from the single measurement of task 8.3 by 28 ms
at most. A restart costs at most 49 ms before the new worker can read,
about a third of a pass over the `.nei` file, and fetching and
compiling popnei's wasm at most 58 ms. **The
decision: whether the calculation worker is also restarted between two
requests, to give back the memory of wasm, which never shrinks
(`docs/architecture.md`, open point 2).** Recommended: not yet. A
restart is cheap, but the next measurement shows that the memory of
wasm does not grow from one run to the next, 35.5 MB after the first
and after the second, so there is nothing to give back. It is decided
again with the kinship, whose matrix is 800 MB at 10,000 individuals.

#### The bound of the cache: the memory of the tab

The cache of the page keeps the results up to a bound in bytes,
`CACHE_MAX_BYTES`, 256 MB until this measurement (`docs/specs/core/cache.md`,
Open 1). The memory of the tab was measured in Chromium, 5 times on a
new page each time, with the `.nei` file of 19,161,178 bytes and its
metadata file of 1,000 rows: the JavaScript heaps of the page and of
the two workers from the Chrome DevTools Protocol, the memory of wasm
of the calculation worker, where popnei holds what it reads, as the
size of its `WebAssembly.Memory`, and the footprint of the tab's
process, the memory macOS counts for it, which the page and its two
workers share. Each was taken after a collection of the garbage. The
light worker is the second worker, which reads the metadata file.

| What | The page opened | The file opened | The diversity done | Done again at 1, the file opened again |
|---|---|---|---|---|
| the tab's process, its footprint | 50.5 MB (49.4 to 50.7) | 78.4 MB (78.2 to 78.8) | 107.5 MB (107.2 to 108.5) | 109.2 MB (109.1 to 110.4) |
| the page, JavaScript heap | 3.3 MB (3.3 to 3.3) | 6.6 MB (6.6 to 6.6) | 6.0 MB (6.0 to 6.0) | 6.5 MB (6.5 to 6.5) |
| the calculation worker, memory of wasm | 1.4 MB (1.4 to 1.4) | 5.6 MB (5.6 to 5.6) | 35.5 MB (35.5 to 35.5) | 35.5 MB (35.5 to 35.5) |
| the calculation worker, JavaScript heap | 0.6 MB (0.6 to 0.6) | 0.7 MB (0.7 to 0.7) | 0.8 MB (0.8 to 0.8) | 0.8 MB (0.8 to 0.8) |
| the light worker, JavaScript heap | 0.0 MB | 0.4 MB (0.4 to 0.4) | 0.4 MB (0.4 to 0.4) | 0.4 MB (0.4 to 0.4) |

The arrays outside the heaps, which the protocol counts apart, were
0.7 MB at most on the page and 0.1 MB in each worker. A result of the
diversity counts 32 bytes per population in the cache, and 2 bytes per
character of its name, 102 bytes here.
So the whole tab holds 109 MB with the file read twice, of which the
page holds 7 MB; the memory of wasm is 1.85 times the file. **The
decision: the value of the bound of the cache.** Recommended: keep
256 MB. It is more than twice what the whole tab holds here, so a full
cache would take the tab to about 365 MB, and no result of stage 2
comes near it: a million results of the diversity would be 102 MB. The
bound is set again with the first analysis whose results are large,
the distances or the PCA. A machine with less memory than 64 GB, a
laptop of 8 GB or a phone, was not measured.

#### The points an SVG plot can hold

`.claude/skills/coding/charts.md` draws the points of a plot as one SVG
`<path>` per group, a text of drawing commands that a loop builds. The
time to draw 10,000 to 200,000 points so, in 4 groups, each a circle of
16 px² in a plot of 800 × 500 px, was measured on a page that is not
part of the site, `e2e/measure/points.html`, 5 times after one drawing
not counted. "The drawing" runs from the start of the loop to the next
frame drawn after the paths are in the page; in Chromium that frame
does not include the rasterising, which Chromium does on other threads,
so its times are what the page's own thread spends and not the time
until the points are on the screen. In WebKit the frame includes it.
"The export" writes the SVG as text, as the export of a plot does. The
numbers in the path are written at full precision, as d3-path writes
them, or rounded to one decimal, a tenth of a pixel.

| Points | Decimals | The drawing, Chromium | The drawing, WebKit | The export, Chromium | The export, WebKit | The SVG |
|---|---|---|---|---|---|---|
| 10,000 | all | 17 ms (15 to 17) | 20 ms (16 to 42) | 2 ms (2 to 2) | 1 ms (1 to 1) | 1.9 MB |
| 50,000 | all | 16 ms (14 to 17) | 80 ms (78 to 95) | 10 ms (9 to 10) | 5 ms (4 to 5) | 9.7 MB |
| 100,000 | all | 24 ms (23 to 24) | 156 ms (148 to 184) | 19 ms (18 to 21) | 11 ms (10 to 11) | 19.4 MB |
| 200,000 | all | 50 ms (49 to 60) | 309 ms (296 to 319) | 38 ms (36 to 40) | 19 ms (19 to 21) | 38.8 MB |
| 10,000 | 1 | 16 ms (15 to 17) | 19 ms (19 to 31) | 1 ms (1 to 1) | 0 ms (0 to 1) | 0.6 MB |
| 50,000 | 1 | 24 ms (24 to 27) | 101 ms (89 to 112) | 3 ms (3 to 3) | 2 ms (1 to 2) | 3.1 MB |
| 100,000 | 1 | 34 ms (32 to 34) | 183 ms (178 to 202) | 6 ms (6 to 6) | 3 ms (3 to 3) | 6.2 MB |
| 200,000 | 1 | 67 ms (65 to 67) | 372 ms (359 to 395) | 12 ms (12 to 12) | 7 ms (6 to 7) | 12.3 MB |

WebKit sets the limit: its drawing grows by about 1.5 ms per thousand
points, and passes 100 ms, the time within which an answer to a click or
a zoom still feels immediate, between 50,000 and 100,000 points.
Rounding to one decimal makes the SVG 3.1 times smaller, and its drawing
up to 26% slower in WebKit and up to 50% in Chromium. **The decision: how many points a plot may
draw in SVG, which sets the thinning of the Manhattan plot
(`docs/technology.md`, open point 3).** Recommended: 50,000 points at
most, drawn in about 80 ms in WebKit and 16 ms in Chromium; the numbers
rounded to one decimal, so that an exported plot of 50,000 points is
3.1 MB and not 9.7 MB. Firefox, and the time to the pixels in Chromium,
were not measured.

#### The project file and the key, in node

A project file of 10,000 individuals holds their table, and the key of
the diversity, the hash of everything its result is calculated from,
holds its populations (`docs/specs/core/projectFile.md`,
`docs/specs/core/keys.md`, "How it runs"). The functions of `src/core`
that the page calls were timed in node, which runs the same JavaScript
engine as Chromium, on a project of 10,000 individuals in 7 populations
with a table of 20 columns and the diversity done, 20 times after a
first call; the first call is the one after a load, when nothing is
compiled yet. The key after a load walks the table of a new file; the
key after a change of the threshold finds that table's text already
written, as the store keeps it. WebKit was not measured.

| What | First call | Median of the next 20 | Their range |
|---|---|---|---|
| the key of the diversity after the metadata file is loaded | 9.4 ms | 3.3 ms | 2.5 to 8.5 ms |
| the key of the diversity after a change of the threshold | 1.2 ms | 1.2 ms | 1.0 to 5.9 ms |
| writing the project file, 2,053,555 characters | 12.6 ms | 11.3 ms | 11.0 to 12.2 ms |
| reading it back | 20.6 ms | 13.2 ms | 12.8 to 17.7 ms |

The file is 2.05 MB, where the spec reckoned 3 MB from the lengths of
its lines, so the bound of 64 MB leaves room for a table 31 times as
large. **The decision: whether a key hashes each large part of the
project once and holds its hash in its place, the next step that
`docs/specs/core/keys.md` names if a key delays the page.** Recommended:
no. A key takes at most 9.4 ms after a load and 5.9 ms after a change,
1.2 ms as a rule, below a frame of 16.7 ms; writing or reading the file takes at most
21 ms, once per Save or Open.
