# The open points of the specs of stage 2, and what they change in approved files

25 September 2026, for the owner. Stage 2 of `docs/build-order.md` is the
walking skeleton, the smallest application that goes through every part
once, and it has eleven specs, all drafts of this day:
`docs/specs/worker/messages.md`, `client.md`, `runner.md` and
`individuals.md`; `docs/specs/core/projectFile.md`;
`docs/specs/analyses/diversity.md`; `docs/specs/entry.md` and `shell.md`;
`docs/specs/steps/variants.md` and `individuals.md`. This file gathers
their open points, the decisions each spec leaves to the owner, with the
ones two specs share made one, and then lists every change the eleven
ask of files already approved: the approved specs of stage 1, the code of
`src/`, `docs/architecture.md`, `docs/functionality.md` and the skills.
Each spec still gives its own points in its section "Open points", with
the same meanwhile, and points here for the merged ones.

Every point has a meanwhile, what the plan builds until the owner
answers, so none of them blocks the plan of stage 2 except where it says
"needed before the plan". The recommendation is the writer's.

## The open points

The first six change the interface other modules call, or what the user
is told in more than one screen; the rest move one screen, or one text.

### A. The metadata file, and a column of populations, optional or required

The question: whether the diversity runs without an individuals file, or
without a column chosen, with every individual in one population, as
`docs/functionality.md` section 4 has it and as the grouping `null` of
`docs/specs/core/project.md` means.

- **Locked in stage 2, optional from stage 4.** The diversity says "Load
  an individuals file in the Individuals step." or "Choose the column
  that defines the populations in the Individuals step."; the step says
  "No metadata file. The analyses per population need one." A user of a
  single population makes a file of one column. Nothing changes in core.
- **Optional now.** The diversity runs one row, "All individuals", over
  every individual. It changes a line of `individualsNeeds` and of the
  diversity's `needs`, and `Grouping` of the approved `project.md` gains
  a value for "one population chosen", apart from `null`, the grouping of
  a new project; the step gets an item "All individuals in one
  population". Its cost for the user: a table of one row that may be
  taken for a mistake by a user who forgot to choose the column.

Recommended: locked in stage 2, optional from stage 4, when the
Individuals step is whole, so that `Grouping` changes once. Meanwhile,
locked. Needed before the plan of stage 4. Specs: `diversity.md`
**Open 1**, `steps/individuals.md` **Open 1**, `shell.md` (the stepper's
"Optional").

### B. What the user is told when the browser can no longer read the variants file

The question: the file changed or was removed on the disk after it was
picked, and a worker started again, after a Cancel, a crash, an undo of
the load or a change of the filters, cannot read it. The runner answers
`crashed`, the client fails the run as `workerFailed`, and a panel that
said only "The calculation stopped unexpectedly. Run it again." would
send the user round a loop, since Run fails the same way, that only
loading the file again leaves. At
the first open, the Variants step says "panel.nei could not be read: the
calculation stopped unexpectedly. Load it again in the Variants step.",
which works and does not name the cause.

- **(a) Keep `workerFailed`, and add a sentence to the panel's words**:
  "If it stops again, load panel.nei again in the Variants step." It
  changes only `diversity.md`, ends the loop at the second failure, and
  does not say that the file is the cause; it also fits a trap of popnei
  that comes back, which a new load mends.
- **(b) A kind of its own**, `{ kind: "reopenFailed"; name; message }`,
  which the runner answers with its own message and the client passes
  on, with the words "panel.nei could not be read again; it may have
  changed on the disk since it was picked. Load it again in the Variants
  step." It names the cause. It changes the approved
  `src/worker/protocol.ts` and `docs/specs/worker/protocol.md`, one kind
  in `RunError`, which reaches `AnalysisError` of the store and
  `SourceError` of the project by their types, the approved `project.ts`
  and `project.md` for its words, and every place that writes a failure
  as text: a new answer in `messages.md`, its row in `runner.md`, the
  classification in `client.md`, a row in `diversity.md` "Its words".

Recommended: (b). The case is rare with popnei 0.1.0, but the words of
a crash send the user to the wrong fix, and with reading by ranges
(point C) every pass reads the disk, and it becomes the common case
(`docs/architecture.md`, section 11). Meanwhile, (a): `workerFailed`
with the message "panel.nei could not be opened again: ‹popnei's
message›", later runs on that load sent to a new worker, which opens the
file again, and the diversity's words with the second sentence. Specs:
`runner.md` **Open 1**, `client.md` **Open 1**, `messages.md`,
`diversity.md` "Its words".

### C. Which release of popnei stage 2 is built on

The question: the release the site installs, `js-v0.1.0-dev.1` of 23
September 2026, reads a variants file whole and reports no progress;
popnei's `main` reads a `File` by ranges and reports the progress of a
pass since 24 September 2026, in no release.

- **(a) Build stage 2 on `js-v0.1.0-dev.1`**, as `docs/build-order.md`
  and section 10 of the architecture have it, and make reading by ranges
  a design of its own after it. Its costs: files above about 1.5 to 2 GB
  fail, an estimate; a run shows only a clock, no bar; and every change
  of the filters reads the whole file again and copies it into the
  memory of wasm, since popnei 0.1.0 cannot take a filter off, a cost
  sections 6 and 11 of the architecture do not list, not measured.
- **(b) Ask popnei for a release of `main` first**, and write that
  design before the plan of stage 2. It rewrites "Opening the load", "The
  filters" and "The memory" of `runner.md`, adds a version of the
  messages for the four fields of popnei's progress (`messages.md`), a
  progress bar to the running state of `diversity.md`, and removes the
  warning of a large file of `steps/variants.md`.

Recommended: (a). The walking skeleton exists to find how the layers fit,
and does it with small files; the time of reading the file again at a
change of the filters is measured at the end of stage 2, on a VCF of
80.7 MB and a `.nei` file of 19.2 MB, and that measurement says how soon
(b) is needed. Meanwhile, (a). Specs: `runner.md` **Open 2**,
`messages.md`, `client.md` (what a restart costs), `steps/variants.md`
(the warning above 1.5 GB), `diversity.md` (no progress).

### D. Which numbers of the diversity are its check numbers

The question: the check numbers are the few numbers of a result that a
project file keeps, to tell after a reopening whether a new run gives
the same. `docs/functionality.md` section 9 names the mean expected
heterozygosity of each population.

- **The fuller set**: the number of variants the filters kept, then the
  expected heterozygosity, the observed heterozygosity and the proportion
  of polymorphic variants of each population, 1 + 3 × the populations, 10
  numbers for the panel of three. It tells apart a file with other
  variants, by their number, and one whose genotypes changed so that the
  observed heterozygosity differs, which the expected one can miss. It
  costs a few numbers more in each file, and a correction of section 9
  of `docs/functionality.md`.
- **The expected heterozygosity alone**, 3 numbers for the panel, as
  functionality has it. It costs nothing now; changing the set later
  raises the key version of the diversity, and every file saved before
  reads as "calculated in another way".

Recommended: the fuller set. Meanwhile, the fuller set, which the
example and the fixture `v1-nei-diversity.popnei.json` of
`projectFile.md` follow; the answer is needed before that fixture is
first written, since a fixture of a deployed format is never edited.
Specs: `diversity.md` **Open 4**, `projectFile.md`.

### E. The versions of popnei and of the application, per check or per file

The question: a file saved after an opening can hold check numbers of
two sessions, one carried from a file of popnei 0.1.0 and one run again
with popnei 0.2.0, and the architecture keeps one version of each in the
header.

- **(A) Each check keeps its versions**, as `projectFile.md` writes it.
  About fifty lines of code and their tests, and changes to the approved
  `docs/architecture.md` (the type `Reference`, section 2; section 8),
  `project.md` and `project.ts` (`Check`, `Reference`, `parseCheck`,
  `parseReference`, `FIELD_WORDS`), `store.md` and `store.ts`
  (`verdictOf`), and `wholeProject` of `src/core/testSupport.ts`.
- **(B) One version per file**: the carried checks are kept only when
  they were made with the popnei of the save, and Save waits for the
  calculation worker's version. It changes no approved file; it drops
  every carried number of a project opened in a newer version and saved
  before it is run again, and Save cannot be used when the worker could
  not start.

Recommended: (A). Needed before the plan: (B) rewrites the example, two
steps of "Opening", the checks and the fixtures of the first version.
Meanwhile, (A). Specs: `projectFile.md` **Open 1**.

### F. The filters of individuals in the walking skeleton

The question: no screen of stage 2 sets a filter of individuals, but a
project file can hold one.

- **(a) Leave them to stage 3**, as `docs/specs/worker/protocol.md` has
  it, and lock the diversity while the project holds one, with a reason
  that says how to empty the list; the runner answers a job with one as
  a defect.
- **(b) Apply now the two lists**, to keep and to remove, which need no
  pass, as one `filterIndividuals` of popnei, and lock only on the two
  thresholds. It adds a list to the runner and a narrowing of the
  populations to the diversity, and builds half of a part whose place
  among the filters of the variants stage 3 has still to decide.

Recommended: (a). Meanwhile, (a). Specs: `diversity.md` **Open 5**,
`runner.md` ("The diversity").

### G. Polymorphic below 0.95, or at most 0.95

popnei counts a variant polymorphic when its commonest allele is below
`polyThreshold`, strictly, as pyNei does; `docs/functionality.md`
section 6 says at most 0.95. They differ at exactly 0.95, 38 of 40
alleles, common in small populations. Changing popnei changes a number
verified against pyNei; changing functionality costs a sentence.
Recommended: correct `docs/functionality.md`. Meanwhile, the panel and
its help say "below 0.95". Specs: `diversity.md` **Open 2**.

### H. When the variants without a value in a population are warned of

The diversity warns whenever a population has a value at fewer variants
than the filters kept. With missing data, a population of 20 to 30
individuals raises it almost always. A threshold, above 5% of the
variants, makes it rarer and hides the small cases. Recommended: warn
always, and judge it on the screens of stage 2. Meanwhile, always.
Specs: `diversity.md` **Open 3**.

### I. The version of the application

The project file writes it, and the words of the comparison name it when
an analysis's calculation changed; `package.json` has none. Options: a
number in `package.json`, raised by hand at a release that changes what
is calculated or saved, which a user can order, "0.1.0 and 0.2.0", and
which can be forgotten; or the short hash of the commit, written at the
build, which needs no hand and which a user cannot order. Recommended:
the number. Meanwhile, `"version": "0.1.0"`, written into the code by
Vite's `define`. Specs: `entry.md` **Open 1**, `projectFile.md` (the
header).

### J. An Export step in the walking skeleton

Stage 2 has no report, and Save project is in the header on every step.
Options: three steps, and Export comes with the report in stage 6; or
four, with Export holding Save project alone. Recommended: three.
Meanwhile, three. Specs: `shell.md` **Open 1**, `entry.md` (the steps
of `apps.ts`).

### K. Save, and a download that gives no sign it finished

A page that hands a file to the browser as a download does not learn
whether it was saved, so it asks before every leaving of a changed
project, also just after a save. Options: the browser's Save As dialog,
`showSaveFilePicker`, in Chrome and Edge, which tells the page the file
was written, and the plain download in Firefox and Safari, at the cost
of a second way of saving and a test of each in Chromium; or the plain
download everywhere. Recommended: the Save As dialog where it exists.
Meanwhile, the plain download everywhere. Specs: `shell.md` **Open 3**,
`entry.md` ("The saving").

### L. How many variants the filters keep, in the summary line

The owner's mockup has "48,210 of 1,203,554 variants kept (3 filters)";
stage 2 does not count what the filters kept until a calculation reads
the whole file, and what each filter kept comes with stage 3. Meanwhile,
the line gives the variants of the file once counted and the number of
filters, "1,200 variants · 1 filter"; the kept count joins it in stage 3.
Specs: `shell.md` **Open 2**.

### M. Reading a VCF already loaded again with another ploidy

A wrong ploidy is what a user of a polyploid meets first. Option: once a
VCF is loaded, changing its ploidy offers a button, "Read panel.vcf.gz
again with ploidy 4", which makes a new load of the same `File` with a
new load id; core allows it; it costs a button. Recommended, in stage 2.
Meanwhile, the user picks the file again. Specs: `steps/variants.md`
**Open 1**.

### N. The default of the missing data filter

Functionality's open point 4. Meanwhile, on at 0.1, plink's default for
`--geno`. Another answer changes one number in `steps/variants.md` and
in `src/core/apps.ts` of `entry.md`. Specs: `steps/variants.md` **Open
2**, `entry.md`.

### O. Whether a refused row says which separator it was read with

After a wrong separator the user reads "line 7 has 3 cells where the
header has 4" and not which separator made it. A field `separator` on
`raggedRow` and `unclosedQuote` would end the words ", read with the
separator `;`"; it changes those two kinds and their check in a project
file, both in the approved `protocol.ts` and `project.ts`. Recommended:
add it. Meanwhile, the words without it. Specs: `worker/individuals.md`
**Open 1**.

### P. "Individuals file" or "metadata file" in the reasons of core

The reasons of `individualsNeeds` say "Load an individuals file",
shared by the two applications, where functionality and the Individuals
step call it the metadata file in population genetics and the traits
file in association, so the user reads two names for one file on one
screen. Recommended: each application's name, a parameter of
`individualsNeeds` in the approved `project.ts`. Meanwhile, core's words.
Specs: `steps/individuals.md` **Open 2**, `shell.md` (the stepper).

### Q. The words of the project file

The warning of the identity, the file asked for after an opening, the
two verdicts of the check numbers, and the refusals of a project file,
to be judged on the screens of stage 2, as the reasons of
`project.md` are. Meanwhile, those of `projectFile.md`. Another answer
changes those texts and their tests. Specs: `projectFile.md` **Open 2**,
shown by `shell.md`, `steps/variants.md` and `diversity.md`.

### Choices of a spec the owner may overrule

Not open points, decided by the writers and listed so that they are
seen: an individuals file whose read is pending or failed is not saved
in a project file; the Variants step starts a VCF's read options at the
reference's; a variants file whose name alone differs from the
reference's drops the carried check numbers (`projectFile.md`); the
warnings of a result are sentences above its table, not a count that
opens the help drawer, until the drawer comes in stage 8
(`diversity.md`); popnei's numbers are compared exactly in the tests of
the runner (`runner.md`).

## Changes to approved files

What the eleven specs ask of files approved before them, each with the
spec that asks it. Each is made when the owner approves that spec, in a
commit of its own before the code of stage 2, as the `writing-specs`
skill has a spec change before its code. The ones that follow from an
open point above are named by its letter and are made only if the owner
takes that option.

### `src/worker/protocol.ts` and `docs/specs/worker/protocol.md`

- `IndividualsFileError` gains six kinds, `unnamedColumn`,
  `emptyIndividual`, `unclosedQuote`, `tooLarge`, `unreadable` and
  `notText`, with their fields (`worker/individuals.md`).
- `CsvFound.encoding` gains `"utf-16"`, and the comment of `CsvFound`
  says it holds the three options used, set or found, and not only what
  "auto" found (`worker/individuals.md`).
- `Job` and `JobResult` are added, with the members `DiversityJob` and
  `DiversityResult`, and `Pops` (`diversity.md`, `messages.md`); the
  spec's "Not in this spec" points to those two specs for them.
  `PROTOCOL_VERSION` goes in `messages.ts`, not here (`messages.md`).
- The tests the spec gave to stage 2: the boundary of the missing data
  filter is checked at 0.05, since the missing rates of the panel stop
  at 0.08, and the PCA's MAF filter merged with the dataset's waits for
  the job of the PCA, in stage 4 (`runner.md`).
- If B (b): `RunError` gains `reopenFailed`.
- If O: `raggedRow` and `unclosedQuote` gain `separator`.

### `src/core/project.ts` and `docs/specs/core/project.md`

- `individualsNeeds` writes the words of the ten refusals of the reader
  after "could not be read:", `empty` reworded "it has no row of
  individuals"; the validation of a project file accepts a failed read of
  each kind with its fields, and `"utf-16"` in `found`; the comment of
  `found` says the three options used. This settles **Open 5** of
  `project.md` (`worker/individuals.md`).
- `individualsCheck(p)`, a new function that gives the individuals of
  the variants file found in the table, those missing, and the rows of
  other individuals, with `individualsNeeds` written on it
  (`steps/individuals.md`; `shell.md` reads it).
- The private helpers that escape and cut a name, name a list of
  individuals, count and group digits, `shown`, `escaped`, `namesOf`,
  `counted` and `grouped`, are exported, or moved to a module of their
  own, with no change of behaviour; and a function that escapes without
  cutting, beside `shown` (`diversity.md`, `projectFile.md`,
  `steps/individuals.md`).
- The words of `newerFormat` become those of `projectFile.md`, which the
  spec left to it; "The cases" no longer leaves to stage 2 what a
  project file writes of a pending read, which `projectFile.md` decides
  (`projectFile.md`).
- If E (A): `Check` gains `popneiVersion` and `appVersion`, `Reference`
  loses its own, and `parseCheck`, `parseReference` and `FIELD_WORDS`
  follow (`projectFile.md`).
- If A (optional): `Grouping` gains a value for one population chosen.
- If B (b): `SourceError` carries `reopenFailed` through its type, with
  its words.
- If O: the words of `raggedRow` and `unclosedQuote` end with the
  separator.
- If P: `individualsNeeds` takes the name of the file of the
  application.

### `src/core/testSupport.ts`

- `TEST_DEFS`, the three analyses of `TEST_ANALYSES` as whole
  definitions of `AnalysisDef`, which the tests of the project file and
  of the shell use (`projectFile.md`, `shell.md`).
- If E (A): `wholeProject` draws checks with their versions
  (`projectFile.md`).

### `src/core/store.ts` and `docs/specs/core/store.md`

- "The final words are those of the screen of the project file, in
  stage 6" becomes `checkVerdictText` of `projectFile.md`, in stage 2;
  the other mentions of the project file in stage 6 become stage 2
  (`projectFile.md`).
- "Not in this spec" gives `src/ui/runs.ts` to `docs/specs/entry.md`, not
  to the specs of the shell (`entry.md`).
- If E (A): `verdictOf` reads the versions of the check, not of the
  reference, and its test follows (`projectFile.md`).

### `docs/specs/core/history.md`

- The question before an opening is no longer "Open a project and lose
  this one?", asked always, but the dialog of `shell.md`, "Opening",
  asked when the project has changed or calculations are in flight.

### `docs/architecture.md`

- Section 9, the tree: `src/worker/runnerWorker.ts`, the worker's script,
  beside `runner.ts`, which alone calls popnei (`runner.md`);
  `src/worker/individualsFile.ts`, which reads and decodes the bytes of
  the individuals file (`worker/individuals.md`); `src/ui/popgen.tsx`,
  the entry, with `src/ui/reads.ts`, `saving.ts`, `defects.ts`,
  `files.tsx` and `store.tsx` (`entry.md`); `src/ui/shell/status.ts` and
  `words.ts` (`shell.md`); `src/ui/analyses/AnalysisPanel.tsx`,
  `panels.ts` and `diversity/` (`diversity.md`, `shell.md`); the steps
  of stage 2 are three, `variants`, `individuals` and `analyses`, and
  `export` joins in stage 6 (`shell.md`, J).
- Sections 6 and 11: with popnei 0.1.0 a change of the filters reads the
  whole file again and copies it into the memory of wasm, since a filter
  cannot be taken off a `Variants`; the architecture counts that cost
  only at a restart (`runner.md`, C).
- Section 10: the walking skeleton reads a VCF as well as a `.nei` file,
  and writes the project file in its full first version, as the owner
  decided on 25 September 2026 (`diversity.md`, `projectFile.md`).
- If E (A): section 2, the type `Reference`, and section 8, "when it is
  not the one in the file's header" (`projectFile.md`).

### `docs/functionality.md`

- Section 9: the check numbers of the diversity, if D takes the fuller
  set (`diversity.md`).
- Section 6: "below 0.95", if G is answered as recommended
  (`diversity.md`).

### `docs/build-order.md`

- Stage 2 holds the project file in its full first version, which stage
  6 held, and reads both formats of the variants file, as the owner
  decided on 25 September 2026 (`projectFile.md`, `diversity.md`). This
  file is not among those the stage 2 specs may edit.

### `.claude/skills/coding/worker.md`

- The message `files` is gone: the `File` travels in the `open` and the
  `readIndividuals` that need it, `{ kind: "readIndividuals", id, file,
  csv }`; the Cancelling step 4 and "What is tested where" follow
  (`messages.md`).
- The answer `error` with `fatal` becomes three kinds, `refused`,
  `crashed` and `badRequest` (`messages.md`).
- `PROTOCOL_VERSION` is in `messages.ts`, not in `protocol.ts`, and the
  example of `Job` takes the fields of `DiversityJob` (`messages.md`,
  `diversity.md`).
- `start.ts` imports `./runnerWorker.ts?worker`, not `./runner.ts?worker`
  (`runner.md`, `client.md`).
- The filters are not copied onto a pass: popnei 0.1.0 cannot, so a
  change of the filters frees the `Variants` and opens the file again
  (`runner.md`).
- An array of a result that is a view of part of a buffer is a defect,
  thrown by `transferablesOf`, where the skill copies it with `slice()`
  (`runner.md`).
- The `error` handler of each worker's script, and the client's `onerror`
  of each worker, call `event.preventDefault()`, so that a crash of a
  worker does not reach the error bar of the page (`entry.md`,
  `runner.md`, `worker/individuals.md`, `client.md`).

### `.claude/skills/coding/testing.md`

- popnei's numbers that the runner passes on with no arithmetic are
  compared with `toBe`, exactly, where the skill asks `toBeCloseTo` for
  every float; the tolerance stays for numbers our code computes
  (`runner.md`).

### `.claude/skills/coding/react.md`

- "The states of an analysis": the warnings are sentences above the
  result, with their count on the heading, until the help drawer comes in
  stage 8, where the skill has a count that opens the drawer
  (`diversity.md`).
- "Errors": what the bar does with a second error, which the skill left
  to the shell, is `shell.md`'s: a count after the first error's text,
  and every error kept for "Copy the details" (`shell.md`).
