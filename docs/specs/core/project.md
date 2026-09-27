# The project and its commands

24 September 2026, approved by the owner on 24 September 2026; built in
`src/core/project.ts`; revised on 25 September 2026 for the specs of
stage 2 the owner approved that day, as
`docs/specs/stage-2-open-points.md`, "Changes to approved files", lists, and again that day for the words of the Variants step the owner
decided at stop 7.5 of `docs/plans/walking-skeleton.md`, and for the
words of the Individuals step and the reader's two new refusals the
owner decided on the reviews of that plan, and for the end of the
reasons of a list of individuals, Open 2, which the owner settled the
same day; and on 26 September 2026 for the end of the refusal of an
analysis this version does not know. Revised again on 26 September 2026
for stage 3, the Variants step whole, as the revision of
`docs/architecture.md` the owner approved that day has it: the filters
of the variants in a fixed order, with no command to move one; the ends
of the reasons of a list of individuals, now that the step has its
controls; and the filters of individuals by a threshold, whose list of
the individuals kept a new module makes, `src/core/individualsKept.ts`,
specified in `docs/specs/core/individualsKept.md`; and the reasons of
a list of individuals given apart, by `individualListNeeds`, so that
they lock only what reads the filters of individuals; this revision is
approved by the owner on 26 September 2026. Revised on 27 September
2026 for stage 4, the Individuals step whole, not yet approved: the
metadata file optional, as the owner decided on 25 September 2026, with
one population, "All individuals", without it, and the grouping
`onePopulation` for a project with a file; the populations every
analysis per population reads, made here and no longer in the module of
the diversity; the types of the columns set by the user, with the
coding of a binary column; and those types kept when the file is read
again, recommended to the owner on 27 September 2026 and taken
meanwhile (`docs/specs/stage-4-open-points.md`), which answers Open 1.
Revised again the same day to agree with the specs written beside it:
the types each column allows worked out by core from the table,
`columnAllows`, and not given by the reader nor saved in the project
file; the words of `notText`, now that an xlsx is read; and the seven
refusals of an xlsx in the validation. Revised again the same day after
its review: the metadata file named by an opened project whose read was
not done when it was saved, `notGiven`, which locks what uses the file
until the user loads it again; why a type the user set was not applied, told
from the table of the read; and the reasons about the column of the
populations in the words of the Individuals step as well. Revised again
the same day after the review of the architecture of stage 4: a type
set that a read cannot apply waits in `typesSet` for a read that allows
it, and `typesLost` is worked out and not kept, with `forgetTypesLost`
to drop those that wait; the time of `columnAllows` measured in the
plan; and the words after a worker that could not start, which say to
save the project before the reload.

The project is everything the user has set in one application: the
variants file they loaded, the filters, the individuals file with the
types of its columns, the populations, and the options of each analysis.
This spec gives its type, the commands that change it, the records that
put into it what the workers read from the files, what every analysis
needs of it before it can run, and the validation that turns a project
file into a project. It develops sections 2, 6 and 8 of
`docs/architecture.md`, and depends on `docs/specs/worker/protocol.md`,
for the filters and the table, and on `docs/specs/core/keys.md`, for the
fingerprint of the settings. The stages it names are the steps in which
the applications are built, in `docs/build-order.md`: stage 2 the walking
skeleton, the smallest application that goes through every part once,
stage 3 the variants step, stage 4 the Individuals step and the PCA,
stage 7 the association application.

Each time the user picks a file, the page gives that pick a load id, a
random name of its own, new at every pick, the same file picked again
included (`docs/architecture.md`, section 3). The project names a file by
its load id, and the page keeps the file itself under that id, since a
file of the disk cannot be written into a project.

## What it does

A user never sees the project, and sees everything that follows from it.
A command that changed a part it should not have would show a result for
settings the user did not choose; one that gave a new project when
nothing changed would add a step to undo that does nothing; a validation
that let a wrong field through would open a project file whose analyses
fail later with a message about something else.

The rules, which every function below keeps:

- **The project is one plain value that is never changed in place**
  (`docs/architecture.md`, section 2). It holds only what JSON, the text
  format of the project file, holds: text, finite numbers, booleans,
  `null`, lists and objects of named fields. Saving it is writing it as
  JSON, and `parseProject` of what that wrote gives an equal project.
  The rule is kept by freezing: the store freezes every project it takes
  with `freezeProject` (`docs/specs/core/store.md`), so that a write into
  it throws, and the memo of the keys trusts the text of an object only
  when it is frozen (`docs/specs/core/keys.md`, "The memo"). A command
  copies what it is given, a filter, the options of an analysis, so that
  a caller that changes its own object later does not change the
  project.
- **A command is a function from a project to a new project**, which
  builds the new one from the parts of the old, keeps the very same
  object for every part it did not change, and changes nothing in the old
  one. A command given a value equal to the one already there returns the
  project it was given, the same object, so that the store makes no step
  of undo for it (`docs/specs/core/store.md`). Equal means equal by value,
  compared as the canonical form of `docs/specs/core/keys.md` writes them,
  so a filter with the same kind and threshold is the one already there.
- **A command is given valid values.** The screens build them from
  controls that allow only valid ones, a number field from 0 to 1, a list
  of the columns of the file. A value that is not valid reaching a command
  is a defect, a mistake of our code and not of the user's data, here of
  the screen's code: the command throws an `Error` whose message starts
  with `popnei_web defect:`, which the application reports as its own
  failure (`.claude/skills/coding/typescript.md`, "Errors"). A value is
  valid when `parseProject` would accept it in its place: the commands
  and `parseProject` share one check of each value, the ranges of the
  thresholds, of `maxDist` and of the ploidy, read options only for a VCF,
  and the rest of "The validation" below, so that a project a command
  made always opens again from its project file. What comes from outside
  the program, the JSON of a project file, goes through `parseProject`,
  which returns what is wrong instead.
- **One filter of each kind, in a fixed order**, in the list of the
  variants' filters and in that of the individuals'. One of each kind for
  the variants, because popnei refuses a second filter of a kind
  (`docs/specs/worker/protocol.md`), and for the individuals, because a
  second list of one kind would say what one list says. The order is
  fixed and the user does not set it, as the owner decided on 26
  September 2026 (`docs/architecture.md`, section 2): the variants'
  missing data, observed heterozygosity, the major allele frequency
  (MAF) and the LD pruning, in that order, the regions of a BED file first once popnei has that filter;
  the individuals' keep, remove, missing data, observed heterozygosity.
  The filter of individuals comes after every filter of the variants, as
  popnei's `filterIndividuals` put last on the `Variants`, so the
  variants kept do not depend on which individuals are removed. Setting
  a filter puts it in the place of its kind, and replaces the one of its
  kind that is there; nothing moves a filter. `moveVariantFilter`, which
  moved one in the order the user gave until stage 2, is gone.
- **A record is not a command.** When the calculation worker has opened
  the variants file, or the light worker, the second thread that reads
  the individuals file, has read it, what they read goes into the source
  with that load id and no other (`docs/architecture.md`, section 6). The
  functions that do it are here, pure as the commands are; the store
  applies them to every project of the history and makes no step of undo
  (`docs/specs/core/history.md`).

Three things are so by decisions taken before this spec, and a user meets
them: loading the same variants file again calculates every analysis
again, since each load has an id of its own and nothing of the file is
compared (the owner, 24 September 2026, `docs/architecture.md`, section
3); loading the same individuals file again finds the results of the
first load, since its table, and not its load, goes into the keys; and a
project file with a field this version does not know is refused, decided
here, below.

### What an analysis needs of every project

Before an analysis looks at what it needs of its own, every one of them
needs a variants file that was read, and one that reads the filters of
individuals, `filtersRead.individuals` of its definition
(`docs/specs/core/store.md`), needs lists of individuals that popnei
will accept. `projectNeeds` gives the first thing missing of the file,
in the words the screen shows beside the Run button, or `null`:

| the project | the reason |
|---|---|
| no variants file | "Load a variants file in the Variants step." |
| the variants file being read | "Reading panel.nei." |
| popnei refused the file | "popnei could not read panel.nei: ‹popnei's message›. Load a variants file in the Variants step." |
| the calculation crashed while it read the file | "panel.nei could not be read: ‹what happened› (**Open 4**). Load it again in the Variants step." |
| the calculations could not start, or the page is out of date | "panel.nei could not be read: ‹what happened› (**Open 4**). Save the project, reload the page, open the project and load panel.nei again." |
| the browser could no longer read the file, `reopenFailed` | "panel.nei could not be read; it may have changed on the disk since it was picked. Load it again in the Variants step." |

Once the file is read, `individualListNeeds` gives the first list of
individuals that popnei would refuse, with which of the two lists it is
about, `keep` or `remove`, so that the Variants step puts the reason
beside that list; or `null`, and `null` too while `projectNeeds` gives a
reason, since a list is checked against the individuals of the file.
The store locks with it only what reads the filters of individuals: the
analyses whose `filtersRead.individuals` is true, the diversity among
them, and the writing of the filtered variants. The three checks of the
Variants step read no filter of individuals, the statistics of each
individual, the histograms of the variants and the Count, and stay
unlocked with a list popnei would refuse, so that the user can still
look at the data while correcting the list.

| the list | its `list` | the reason |
|---|---|---|
| empty | `keep` | "The list of individuals to keep is empty. Add individuals to it, or remove the filter, in the Variants step." |
| names an individual more than once | `remove` | "The list of individuals to remove names ind_031 more than once. Change the list, or remove the filter, in the Variants step." |
| names individuals not in the variants | `keep` | "The list of individuals to keep names 2 individuals that are not in panel.nei: ind_900 and ind_901. Change the list, or remove the filter, in the Variants step." |

Each row holds for either list, "to keep" or "to remove" in its words
and `list` naming the same one.

The Variants step shows the reason of its file, being read or not
read, with another end, since it is where the file is chosen and its
button reads "Replace panel.nei…"; the owner decided on 25 September
2026 that a refusal shown there ends "Choose another file.".
`variantsStepNeeds` gives those words, the rows of the first table above for a
file being read or not read, and `null` for no file or a file read,
which the step shows otherwise:

| the variants file | the reason in the Variants step |
|---|---|
| being read | "Reading panel.nei." |
| refused by popnei | "popnei could not read panel.nei: ‹popnei's message›. Choose another file." |
| its read stopped by a crash of the calculation | "panel.nei could not be read: ‹what happened› (**Open 4**). Choose it again." |
| the calculations could not start, or the page is out of date | "panel.nei could not be read: ‹what happened› (**Open 4**). Save the project, reload the page, open the project and choose panel.nei again." |
| no longer readable by the browser, `reopenFailed` | "panel.nei could not be read; it may have changed on the disk since it was picked. Choose it again." |

The last three ends are the writer's, the same day: the owner's words
fit a file that popnei refused, and a file that could not be read, by
no fault of its own, is chosen again and not replaced. The reasons of
the other rows of `projectNeeds`, those of `individualListNeeds`, which
the step shows under the list they name, and every reason of the
individuals file in the Individuals step, keep their words.

The owner decided on 25 September 2026 that a variants file the browser
can no longer read, changed, moved or deleted on the disk since it was
picked, has a kind of its own, `reopenFailed` of `RunError`
(`docs/specs/worker/protocol.md`), and these words, which say what a
user can do about it (point B of `docs/specs/stage-2-open-points.md`).
The source keeps it as a failure of the worker, so a read of the same
load that succeeds later replaces it (below, "The records").

The owner decided on 24 September 2026 that the words the first draft of
these tables lacked, the end of the last two rows, how many individuals
a text names, "‹what happened›", the end of a refusal of the reader of
the individuals file and which problem is named first, are provisional,
to be judged when the owner sees them on the screens of stage 2: each is
an open point below, **Open 2** to **Open 6**, and the code uses its
meanwhile.

The individuals are named as **Open 3** says, and the lists are checked
in the order of **Open 6**. A list that repeats several names names each
of them once, in the order of the list, "names ind_031 and ind_044 more
than once". These are decided here, not by the owner:

- A message of popnei or of the files wasm that ends with a full stop is
  shown without it, so that the sentence has one. An empty message, or
  one of spaces, is left out with its colon: "popnei could not read
  panel.nei. Load a variants file in the Variants step."
- A name of an individual or of a column is shown as the validation shows
  a value of the file, below: its control and format characters escaped,
  and cut after 40 characters. An empty name is "an empty name", "names
  an empty name more than once"; a refusal of the reader says "two
  columns have an empty name" and "two rows have an empty name".
- The name of a file is escaped in the same way, and not cut.
- A count is written with a comma between groups of three digits, "1,203
  more", "where the header has 1,204", as the numbers of this spec are. A
  line number, and the number of a column, are positions and not counts,
  and have no comma: "line 12045", "column 1204".

popnei refuses these lists too, with messages that name its arguments,
`individuals`, and that the store would keep as popnei's refusals of those
settings (`docs/specs/core/store.md`); checked here, the user is told what
to fix before anything that reads them runs. Whether a threshold on the individuals
keeps any of them cannot be known from the project alone, since it
needs the statistics of each individual; that lock is the store's, from
the cache (`docs/specs/core/individualsKept.md`), and neither
`projectNeeds` nor `individualListNeeds` gives it.

`individualsNeeds` gives the same for the analyses that use the
individuals file, the first thing missing, or `null`. Every individual of
the variants must be in the file, and the reason names the ones missing
(`docs/functionality.md`, section 4). These words were added on 24
September 2026, after the owner approved this spec, on the pattern of the
table above, and approved by the owner with the plan of stage 1 the
same day; the step is named by its
folder in `docs/architecture.md`, section 9, `individuals`, since
`docs/functionality.md` names no step. The file is named as the
application of the project names it, "a metadata file" in population
genetics and "a traits file" in association, as the owner decided on 25
September 2026 (point P of `docs/specs/stage-2-open-points.md`); the
reasons below are those of population genetics.

| the project | the reason |
|---|---|
| no individuals file | none in population genetics, from stage 4: every analysis per population runs on one population of every individual (below, "The populations"); in association, whose GWAS needs a trait, "Load a traits file in the Individuals step." |
| the individuals file being read | "Reading pops.csv." |
| the individuals file of an opened project, not read when the project was saved, `notGiven` (below, "The project of an opened project file") | "pops.csv was not read when this project was saved, so the project file does not hold it. Load pops.csv again in the Individuals step." |
| the files wasm refused the file | "pops.xlsx could not be read: it could not be read as an Excel workbook and may be damaged; open it in Excel and save it again. Load a metadata file in the Individuals step.", in the words the reader's spec gives `files` from stage 4, where stage 2 showed the message of the files wasm |
| the reader of CSV and TSV refused the file | "pops.csv could not be read: line 7 has 3 cells where the header has 4, read with the semicolon as the separator. Load a metadata file in the Individuals step." (**Open 5**) |
| the worker crashed while it read the file | "pops.csv could not be read: ‹what happened› (**Open 4**). Load it again in the Individuals step." |
| the worker could not start, or the page is out of date | "pops.csv could not be read: ‹what happened› (**Open 4**). Save the project, reload the page, open the project and load pops.csv again." |
| individuals of the variants missing from it | "12 individuals of panel.nei are not in pops.csv: ind_031, ind_044 and 10 more. Add them to the file and load it again in the Individuals step." |

The words after "could not be read:" of a refusal of the reader are
those of the reader's spec, `docs/specs/worker/individuals.md`, "The
refusals and their words", one for each kind of `IndividualsFileError`,
thirteen in stage 2 and twenty from stage 4, which settles the words of
**Open 5**: "it has
no row of individuals"; "two columns are named pop"; "the individual ind_031 is in
two rows"; "line 7 has 3 cells where the header has 4, read with the
semicolon as the separator"; "column 4 has values but no name in the
header"; "line 7 has no name of an individual in its first column"; "the
quote that opens a cell on line 7 is never closed, read with the comma
as the separator"; "it is 312.4 MB, more than the 20 MB a metadata file
can have; check that it is the metadata file and not the variants", with
"a traits file" and "the traits file" in association; "the browser could
not read it; it may have been changed, moved or deleted since it was
picked"; "it is not a text file; if it is an Excel workbook, give it a
name that ends in .xlsx", from stage 4, where stage 2 said "in Excel,
save the sheet as CSV"; "it
is a variants file, which the Variants step takes"; "it ends in the
middle of a character and may have been cut short"; and the message of
the files wasm for `files`, until stage 4. From stage 4 the reader's spec gives the
words of the kinds of an xlsx, `notXlsx`, `oldExcel`, `encrypted`,
`emptySheet`, `cellError`, `sheetTooLarge`, `xlsxReaderNotLoaded` and
`files`, and, for a source whose `csv` is `null`, those of
`emptyIndividual` and `unnamedColumn` with the row and the column of the
sheet as Excel names them, "row 7 has no name of an individual in its
first column" and "column D has values but no name in the header",
which `project.ts` writes so. A separator is named as the
Individuals step names it, the comma, the semicolon or the tab. A size
is in MB of 1,000,000 bytes, with one decimal rounded up, so that a file
of 20,000,001 bytes is "20.1 MB"; the limit, a whole number of MB, is
written with none. The names and the counts are shown by the rules after
the first table.

The Individuals step shows the reason of its file, being read or not
read, with other ends, since the refusal is shown inside that step, under
the options of the reader; the owner decided on 25 September 2026 that
a refusal shown there ends "Choose another separator, or load a
corrected file." for a row of the wrong length and a quote never
closed, whose likeliest cause is the separator, with no word of where
the separator is, since it stands beside the refusal on a wide screen
and under it on a phone, and "Load a corrected
file." otherwise. `individualsStepNeeds` gives those words, the rows of
the table above for a file being read or not read, and `null` for no
file or a file read, which the step shows otherwise:

| the individuals file | the reason in the Individuals step |
|---|---|
| being read | "Reading pops.csv." |
| named by an opened project, not read when it was saved, `notGiven` | "pops.csv was not read when this project was saved, so the project file does not hold it. Choose it again." |
| refused by the reader, `raggedRow` or `unclosedQuote` | "pops.csv could not be read: line 7 has 3 cells where the header has 4, read with the semicolon as the separator. Choose another separator, or load a corrected file." |
| refused by the reader, `variantsFile` | "pops.csv could not be read: it is a variants file, which the Variants step takes. Load a metadata file." |
| refused by the reader, `unreadable` | "pops.csv could not be read: the browser could not read it; it may have been changed, moved or deleted since it was picked. Choose it again." |
| refused by the reader, `xlsxReaderNotLoaded`, the files wasm not downloaded, from stage 4 | "pops.xlsx could not be read: the part of the application that reads Excel files could not be downloaded; check the connection and load the file again; if it fails again, the site may have been updated since this page was opened: save the project, reload the page and open the project again.", with no end, since its words say what to do; the same beside a Run button |
| refused by the reader, any other kind, or by the files wasm | "pops.csv could not be read: it has no row of individuals. Load a corrected file." |
| its read stopped by a crash of the light worker | "pops.csv could not be read: ‹what happened› (**Open 4**). Choose it again." |
| the light worker could not start, or the page is out of date | "pops.csv could not be read: ‹what happened› (**Open 4**). Save the project, reload the page, open the project and choose pops.csv again." |

The ends of the rows of `variantsFile`, `unreadable` and a crash are the
writer's, the same day, and that of `notGiven` the writers' of stage 4,
on 27 September 2026, on the pattern of the Variants step: a variants
file is not corrected but replaced, with "a traits file" in
association; and a file that could not be read by no fault of its own
is chosen again, not corrected, in the words of the Variants step, "Choose it
again." and "… open the project and choose pops.csv again.", so that the same
failure has the same words in the two steps, whose buttons both open the
file picker.

The reason of individuals missing, in the step, names the file in place
of the step, since the step is where the user is: "12 individuals of
panel.nei are not in pops.csv: ind_031, ind_044 and 10 more. Add them to
pops.csv and load it again.", and for one, "1 individual of panel.nei is
not in pops.csv: ind_031. Add it to pops.csv and load pops.csv again."
`individualsStepMissing` gives those words, and `null` when no
individual is missing or either file is not read; beside a Run button,
`individualsNeeds` keeps the words of the table above, which name the
step.

The individuals missing are named as **Open 3** says; one alone is "1
individual of panel.nei is not in pops.csv: ind_031. Add it to the file
and load the file again in the Individuals step." When the variants file
is not read, `individualsNeeds` does not look at the individuals of the
variants: `projectNeeds` has already given its reason.

Who is missing is given by `individualsCheck`, which the Individuals step
and the stepper of the shell read as well (`docs/specs/steps/individuals.md`),
and on which `individualsNeeds` is written, so that the two never
disagree: the individuals of the variants file found in the table, all
those missing, in the order of the variants file, and the rows of the
table whose individual is not in the variants file, which are ignored
(`docs/functionality.md`, section 4). It is `null` when either file is
not read. It keeps its answer for the same two reads, so that a table of
10,000 rows is not matched again each time a screen is drawn.

The metadata file, and a column of the populations chosen in it, were
required in stage 2 and are optional from stage 4, as the owner decided
on 25 September 2026 (point A of `docs/specs/stage-2-open-points.md`).
So `individualsNeeds` no longer locks on no file in population
genetics, and `Grouping` gains `{ kind: "onePopulation" }`, every
individual in one population, which a project with a file can choose
(below, "The populations"). A file that is given still has to be read
and to hold every individual of the variants: a file refused, one that
lacks individuals, or one an opened project names and the page does not
hold, `notGiven`, locks what uses it as before, since its rows would
otherwise be ignored without a word. The user who wants no file removes
it.

### The project of an opened project file

A project file restores the settings and none of the results: the user
gives the variants file again, and every analysis is calculated again.
The variants file is the user's, and nothing tells the application that
the file given is the one the project was saved with; it may be another,
or the same one changed. The check numbers, a few numbers of each result
kept in the project file, are what tells: after a run, the numbers of the
new result are compared with those saved (`docs/functionality.md`,
section 9).

That comparison means something only while the settings of the analysis
are those the file had. So, when a project file is opened, a fingerprint
of the settings of each analysis as the file had them is made and kept in
the project, beside its numbers: a hash of the filters, the read options
of the variants file, and what the analysis's own key holds
(`docs/specs/core/keys.md`, "The fingerprint of the settings"). After a
run, the numbers are compared only while the fingerprint of the settings
now is that one. The owner decided it on 24 September 2026. The option
not taken was to compare with a key of the file's settings, which could
be made only once the calculation worker had given the version of popnei,
a few seconds after the page opens; a setting the user changed in those
seconds would have been taken for one of the file's.

The project file also saves, with the numbers of each analysis, the
number its module raises when its calculation changes, its key version,
and the versions of popnei and of the application the numbers were
calculated with, as the owner decided on 25 September 2026 (point E of
`docs/specs/stage-2-open-points.md`). The versions are kept with each
check and not once for the file, because a project saved again carries
the numbers of an analysis that did not run again with the versions they
were calculated with (`docs/specs/core/projectFile.md`, "The check
numbers"). So a result that differs because the application calculates
it in another way since, or because popnei changed, is told as that, and
not blamed on the variants file alone (`docs/specs/core/store.md`, "The
comparison with the check numbers").

The individuals file is kept in the project file with its table, and so
only when it was read (`docs/specs/core/projectFile.md`, "What is
written of each part"). A project saved while that file was being read,
or after its reader refused it, names a file of which it has no table.
The project opened from it holds that source with its name, its options
of a CSV and the types the user set, and the read `{ kind: "notGiven"
}`: a file named by the project that the page holds no copy of, and
for which no read is asked. It locks every analysis that uses the
individuals file, with the reasons of the tables above, "pops.csv was
not read when this project was saved, so the project file does not hold
it. Load pops.csv again in the Individuals step.", whatever the grouping,
until the user loads the file again, a new load with a new load id, or
removes it, after which the analyses per population run on one
population. This was decided on 27 September 2026 by the writers of the
specs of stage 4, for the owner to overrule
(`docs/specs/stage-4-open-points.md`). The option not taken, the first
draft of stage 4, opened such a project with no individuals file: its
analyses per population would have run on one population, "All
individuals", although its grouping names a column of a file the user
had loaded, and the table of one row would have read as the result they
asked for, with no word of the file. A column chosen and no file does
not lock in general, since a user who removes the file chose to go
without it (below, "The populations").

### The individuals the filters keep

The four filters of individuals are the application's arithmetic on
popnei's statistics of each individual (`docs/architecture.md`, section
4): core makes from the project and those statistics the one list of the
individuals kept, which every analysis that reads the filters of
individuals is given. The function, `individualsKept` of
`src/core/individualsKept.ts`, with the counts of each filter and
`keptNoneReason`, the words of the lock when the filters keep no
individual, is specified in `docs/specs/core/individualsKept.md`. This
spec gives the filters it reads, their order and their validation.

### The populations

Every analysis per population reads the populations the project
defines: the diversity since stage 2, the analyses of stage 5, and,
from stage 4, the PCA, which colours its points by them. From stage 4
they are made here, by four functions that all of them share, and not
in the module of the diversity, where the walking skeleton put them;
its report noted that the next analysis to need them would touch that
module, and the PCA is that analysis. The Individuals step and the
shell read the same four. The option not taken was a module of their
own in core, which would be a new row of section 9 of
`docs/architecture.md` for four functions that read the project alone,
beside `individualsCheck`, which is here and which they follow.

The populations are of one of two kinds:

- **By a column**, with the grouping `{ kind: "populations", column }`
  and a metadata file read that has a column of that name. A population
  is named by the text of its cell, whatever the type of the column; a
  number or a boolean of an xlsx is written as `String` writes it,
  `1.5`, `true`, so that a number 1 and a text `1` of one column are one
  population, as they are one value for the types (below). An
  individual whose cell is missing, empty, `NA` or `-`, is in no
  population (`docs/functionality.md`, section 4). The populations are
  in the order in which each first appears in the file, and the
  individuals of each in the order of the file, which is the user's own.
- **One population of every individual of the variants file**, named
  "All individuals", `ONE_POPULATION`: without a metadata file, whatever
  the grouping, and with a file whose grouping is `{ kind:
  "onePopulation" }`, which the Individuals step offers as "All
  individuals in one population". A file that is given holds every
  individual of the variants, or `individualsNeeds` locks, so the one
  population is the same with the file and without it, and so is the
  key of what it gives.

The name "All individuals" is the writers' of stage 4, on 27 September
2026, for the owner to overrule (`docs/specs/stage-4-open-points.md`).
`{ kind: "populations", column: null }` keeps its meaning of stage 2,
no column chosen yet: an empty project starts with it, so it cannot also
be the choice of one population, and with a file it locks what uses the
populations until the user chooses a column or the one population. The
option not taken was `column: null` read as one population with a file
too, which would run a project whose user has not yet looked at its
columns on one population, without a word.

Without a file the grouping is not looked at, and it is kept: a column
chosen before the file was removed is found again, by its name, by an
undo or by a new load of the file.

`populationsOf(p)` gives the populations as a key holds them, from the
project alone: those of the column, each with every individual of the
table that has it, including those not in the variants file; or
`"all"` for the one population, whose individuals are those of the load
of the variants file, which every key holds already, so that no key
reads `p.variants` (`docs/specs/core/keys.md`); or `null` when neither
can be given yet: a file not read, no column chosen, or no column of
that name. `populationsToRun(p)` narrows them to the individuals of the
variants file and drops the populations left empty, since popnei refuses
a population that names an individual it does not have and an empty
one; for `"all"` it gives `[["All individuals", every individual of the
variants file, in its order]]`. `populationsKept(p, kept)` narrows those
to the individuals the filters of individuals keep, and gives apart the
populations the list leaves empty, which are not sent and are named on
the screen (`docs/specs/core/individualsKept.md`). `populationsNeeds(p)`
gives the reasons about the column, each with its kind, so that the
stepper of the shell, the Individuals step and the panel of every
analysis show one text for one condition:

| the project | its kind | the reason |
|---|---|---|
| a file read, and no column chosen | `noColumn` | "Choose the column that defines the populations, or all individuals in one population, in the Individuals step." |
| no column of that name in the table, after a new load of the file | `noSuchColumn` | "pops.csv has no column popcat, from which the populations were taken. Choose the column that defines the populations, or all individuals in one population, in the Individuals step." |
| no individual of the variants file has a population in the column | `noPopulation` | "No individual of panel.nei has a population in the column popcat of pops.csv. Fill in the column and load the file again, or choose another column, in the Individuals step." |

They are the words of stage 2, with the one population named where the
user chooses. At the select of the column, in the Individuals step,
where the user already is, the same words are shown without the place,
"Choose the column that defines the populations, or all individuals in
one population.", "… Choose the column that defines the populations, or
all individuals in one population." and "… Fill in the column and load
the file again, or choose another column."; `populationsNeeds` gives
both, `reason` and `inStep`, so that one condition still has one text.
`populationsNeeds` gives `null` without a file, with the
grouping `onePopulation`, while the file is not read, and while a column
of that name is chosen and the variants file is not read, since no
population is looked for until it is. The four give `null` for a
project of association, which has roles and no populations.

### The types of the columns

The reader infers a type for each column, and from stage 4 the user
sets another in the Individuals step (`docs/functionality.md`, section
4): categorical for any column but the first; binary for a column of
exactly two values, with which of the two is coded 1, the case; and
continuous for a column whose values are all numbers. The first column
is always identifier, and no other column is.

Which types the values of a column allow, `columnAllows(read)`, is
worked out here from the table and the decimal mark of the read,
`found.decimal` for a CSV and the point for an xlsx, with two pure
functions of the reader, `cellNumber` and `inferColumnTypes` of
`src/worker/individuals/columnTypes.ts`, which core may import
(`tsconfig.core.json` holds `src/worker/individuals`), so that a cell is
a number by the reader's rule and a binary column is coded by the
reader's proposal (`docs/specs/worker/individuals.md`, "The decimal mark
and the numbers" and "The types of the columns"). For each column: it
can be continuous when every value that is not missing is a number, and
there is one at least; and, when it has exactly two values, compared as
text, it can be binary, with the coding `inferColumnTypes` gives that
column, which infers every column of exactly two values binary; the
first column, which is always identifier, neither. The step sends that
binary type when the user makes a column binary, so that a column made
categorical and then binary again has the reader's proposal of which
value is the case.

The types a column allows are worked out, and not given by the reader
in its read and saved with it, because a field saved in version 1 of the
project file is kept for good (`docs/architecture.md`, section 12); a
project file of stages 2 and 3 then offers the same types as a file read
now; and a saved value that the validation would have to check against
the table is a value that could disagree with it. `columnAllows` keeps
its answer for the same read, as `individualsCheck` does, so that a
table of 10,000 rows is not walked again each time the step is drawn.
The option not taken, the reader's `allows` in the read, was the first
draft of this revision, of 27 September 2026.

The values of a column are compared as text, a number or a boolean of
an xlsx as `String` writes it, as the reader compares them for its
types; the two values of a binary type are those texts, and `one` is
not `zero`. A CSV gives only text, so no project of stages 2 and 3 holds
another value in a binary type.

`setColumnType` sets the type of a column and records it in `typesSet`
of the source, the types the user set, each by the name of its column.
It is a command, a step of undo. No key of stage 4 holds a type: the
populations are the texts of the cells, whatever the type of their
column. The first column is never in `typesSet`: its one type,
identifier, is the one it has, so setting it gives the project itself,
and any other is a defect.

**The types the user set are kept when the file is read again**, by
the name of their column, where the new values allow them, as the owner
was recommended on 27 September 2026 and as is taken meanwhile
(`docs/specs/stage-4-open-points.md`). `loadIndividuals` copies
`typesSet` of the source it replaces and `setCsvOptions` keeps it, and
the record of the new read puts each type set on the column of its
name when the new read allows it: categorical on any column but the
first; continuous when `columnAllows` of the new read says so; binary, with the coding the
user set, when `columnAllows` gives the column `binary` with the same
two values. A column that the new file has in the first place names the
individuals, and is the identifier whatever was set on it. Otherwise
the column keeps the type the reader inferred, and the type set stays
in `typesSet` without being applied: a later read that allows it
applies it again. So a user who chooses the wrong separator, which reads
the file as one column and can apply none of the types they set, gets
them all back when they choose the right one. A type set leaves
`typesSet` only when the user sets another type on the same column,
which replaces it, forgets the types not applied, or removes the
file. `typesLost` lists the types set
that the read does not apply, so that the step can say which columns do
not have the type set, and why. A new load is a read again whatever file
is picked, since nothing tells the application that a file is the one
read before; a file of other columns gets the types whose column and
values fit, and the others wait for a file that has them. The options
not taken: the meanwhile of stage 2, every type set lost at a new read,
which made the user set them all again after changing the separator;
and the first draft of this revision, in which a type the read could not
apply left `typesSet`, so that one read with the wrong separator lost
them all, which the review of the architecture found on 27 September
2026.

The types set are kept in the source, and not only as the types of the
read, because a new load or new options put the read back to pending,
and its types go with it; and the record needs the types the user set
and only those, since a type the reader inferred, carried to the new
read, would be taken for the user's, and named as not applied when the new
values give another, though the user had chosen nothing.

`typesLost(source)` is worked out from `typesSet` and the read, and not
kept in the project, since a list kept beside the two it follows from
could disagree with them. The project file has nothing of it to write,
and an opened project shows the same types not applied as the project
that was saved; kept in the read, as the first draft had it, it was
left out of the file, and an opened project showed none.
`setColumnType` of a column takes that column out of it, since the pair
it puts in `typesSet` is applied. Why each type is not applied is not
kept either, since the table of the read tells it, and `typeLostReason`
gives it, so that the step and the shell say the same: `"gone"`, the
table has no column of that name; `"firstColumn"`, the column is now the
first of the file, which names the individuals; `"values"`, its values
do not allow the type. The step words each
(`docs/specs/steps/individuals.md`, "Its words"). `removeIndividuals` removes the
source with its types set, so a file loaded after a removal starts from
the types the reader infers; an undo of the removal gives them back.
A type set on a column that the file no longer has would otherwise be
named at every read for as long as the file is loaded, so
`forgetTypesLost` drops from `typesSet` the pairs the read does not
apply, and keeps the others: a command, a step of undo, which the step
offers beside the warning. Decided here, not by the owner, on 27
September 2026, with the types kept unapplied.

## The TypeScript interface

The fields are `readonly` in the code, and every list `readonly T[]`;
`readonly` is left out below to keep the types short. A `JsonObject` is
an object whose fields are JSON values, of `docs/specs/core/keys.md`. A
`Result` is what a function that can fail with good code returns, one of
two shapes, given whole in `.claude/skills/coding/typescript.md`
("Errors"):

```ts
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

```ts
import type { JsonObject } from "./keys.ts";
import type { Result } from "./result.ts";
import type {
  VariantFilter, VariantFilterKind, IndividualFilter, IndividualFilterKind,
  IndividualsTable, ColumnType, CsvOptions, CsvFound, IndividualsFileError,
  RunError, Pops,
} from "../worker/protocol.ts";

/** The two applications. */
export type AppId = "popgen" | "gwas";

/**
 * The id of an analysis, a literal of its module, "diversity", "pca". A
 * string and not a union of the ids, so that adding an analysis adds its
 * module and nothing here (docs/architecture.md, section 4).
 */
export type AnalysisId = string;

export interface Project {
  app: AppId;
  variants: VariantSource | null;
  filters: VariantFilter[];                 // missing_data, obs_het, maf, ld
  individualFilters: IndividualFilter[];    // keep, remove, missing_data, obs_het
  individuals: IndividualsSource | null;
  grouping: Grouping;
  analyses: AnalysisOptions[];              // one per analysis the user set
  reference: Reference | null;              // from an opened project file
}
```

The variants file. The load id is 16 random bytes written as 32 lower
case hexadecimal digits, made by the page when the user picks the file
(`docs/architecture.md`, section 3). The ploidy of a VCF is a whole
number from 1 to 255, which popnei's `openVcf` accepts
(`js/popnei/src/io_vcf.ts`).

```ts
export interface VariantSource {
  fileId: string;
  name: string;          // as the browser gives it; in no key
  size: number;          // bytes; in no key
  format: "vcf" | "nei";
  readOptions: { ploidy: number; onlyPassed: boolean } | null; // a VCF's; null for .nei
  read: SourceRead;
}

export type SourceRead =
  | { kind: "pending" }
  | { kind: "read"; individuals: string[]; ploidy: number; numVars: number | null }
  | { kind: "failed"; error: SourceError };

/** popnei refused the file, or the worker failed before popnei answered:
    it could not start, it crashed, or the browser could no longer read
    the file, `reopenFailed`. A refusal of popnei is the first kind, never
    the second. */
export type SourceError =
  | { kind: "popnei"; message: string }
  | { kind: "worker"; error: Exclude<RunError, { kind: "popnei" }> };
```

The individuals file. A read of a CSV reports the three options it used,
each as the user set it or, where it was `"auto"`, as the reader found
it, and the line of the first character it could not decode, or `null`
(`docs/specs/worker/protocol.md`, `CsvFound`); `found` is `null` for
an xlsx. `typesSet` is that of "The types of the columns", above.

```ts
/** A column's name, with a type. */
export type ColumnTypeOf = readonly [column: string, type: ColumnType];

export interface IndividualsSource {
  fileId: string;
  name: string;
  csv: CsvOptions | null;          // null for an xlsx
  typesSet: ColumnTypeOf[];        // the types the user set, by column, applied or not; never identifier
  read: IndividualsRead;
}

export type IndividualsRead =
  | { kind: "pending" }
  | { kind: "read"; table: IndividualsTable; columns: ColumnType[];
      found: CsvFound | null }
  | { kind: "failed"; error: IndividualsFileError | { kind: "worker"; error: Exclude<RunError, { kind: "files" }> } }
  // named by an opened project, not read when it was saved; no read is asked
  | { kind: "notGiven" };

/** A read as the light worker gives it, to be recorded; the record puts
    on its columns the types of typesSet that it allows. */
export type IndividualsReadGiven =
  | Extract<IndividualsRead, { kind: "read" }>
  | Extract<IndividualsRead, { kind: "failed" }>;
```

A refusal of the reader of xlsx files is the `files` kind of
`IndividualsFileError`, or another kind of that union that
`docs/specs/worker/files.md` gives an xlsx, never a failure of the
worker. While a source is read, each entry of `typesSet` that the read
allows, by the rule of "The types of the columns", is the type of its
column in `columns`; the others are those of `typesLost`. A source
`notGiven` is made only by the opening of a project file; the entry of
the page, which asks for the read of every pending source, never asks
for its read, since the page holds no file under its load id.

The grouping: in population genetics, the column that defines the
populations, `null` until one is chosen, or every individual in one
population (above, "The populations"); in association, the role of each
column. A column is named by its name in the header, which the reader
keeps unique, so that it is found again when the file is loaded again
with its columns in another order. The edits of the populations drawn
on the PCA with the mouse, which functionality names for later, come
with a design of their own, not in stage 4, and the roles are revised
with the association application, in stage 7.

```ts
export type Grouping =
  | { kind: "populations"; column: string | null }
  | { kind: "onePopulation" }
  | { kind: "roles"; roles: (readonly [column: string, role: "trait" | "covariate" | "ignored"])[] };
```

The options of an analysis the user has set; an analysis with no entry
runs with its defaults. They are a list of pairs and not an object with a
field per analysis, because the JSON of a project file can hold a field of
any name, `__proto__`, which JavaScript treats in a special way, among
them (`.claude/skills/coding/typescript.md`, "The rules of the code").

```ts
export interface AnalysisOptions {
  analysis: AnalysisId;
  options: JsonObject;       // whole, the defaults filled in
}
```

The reference: what an opened project file says of the variants file it
was made with and of the results it had. Its `variants.fileId` is the id
of a load of another session, and names no file of this one.

```ts
export interface Reference {
  variants: VariantSource;   // its identity: name, size, format, individuals, ploidy, numVars
  checks: Check[];
}

export interface Check {
  analysis: AnalysisId;
  numbers: (number | null)[];  // the check numbers saved; null where popnei gave NaN
  keyVersion: number;          // the analysis's key version when it was run
  popneiVersion: string;       // the version of popnei it was run with
  appVersion: string;          // the version of the application it was run with
  settings: string;            // the fingerprint of its settings in the file; never saved
}
```

The reference holds no versions of its own: the header of the project
file has the versions of the save, which the project does not keep, and
each check the versions of its numbers.

A new, empty project of one application.

```ts
export function emptyProject(app: AppId): Project;
// { app, variants: null, filters: [], individualFilters: [], individuals: null,
//   grouping: app === "popgen" ? { kind: "populations", column: null }
//                              : { kind: "roles", roles: [] },
//   analyses: [], reference: null }
```

The project frozen deeply, with `Object.freeze`, so that a write into it
throws. A part already frozen is taken as frozen with everything it
holds, and is not walked again, so freezing the project a command gave
costs only the parts that command made. Gives `p` itself.

```ts
export function freezeProject(p: Project): Project;
```

The constants and the types the other modules and the tests use:

```ts
/** The order the filters of the variants are kept in; "regions" joins
    first with popnei's filter of the regions of a BED file. */
export const VARIANT_FILTER_ORDER: readonly VariantFilterKind[]; // missing_data, obs_het, maf, ld
/** The order the filters of the individuals are kept in. */
export const INDIVIDUAL_FILTER_ORDER: readonly IndividualFilterKind[]; // keep, remove, missing_data, obs_het
/** The largest ploidy of a VCF, which popnei's openVcf accepts. */
export const MAX_PLOIDY = 255;
/** The largest maxDist of the LD filter, 2^53 − 1, which popnei accepts. */
export const MAX_LD_DIST = Number.MAX_SAFE_INTEGER;
/** The version of the format of the project file this application
    writes; projectFile.ts writes it in the header, and a command checks
    the options of an analysis as of this version. */
export const FORMAT_VERSION = 1;
/** The deepest the options of an analysis are nested, in levels of lists
    and objects; deeper ones are refused, so that no check of them runs
    out of the stack of the browser. */
export const MAX_OPTIONS_DEPTH = 64;

/** A load of the variants file, as the page gives it before it is read. */
export type VariantLoad = Omit<VariantSource, "read">;

/** An analysis as the commands and the validation know it: its id, and
    the function of its module that checks its options. */
export interface ParsedAnalysis {
  id: AnalysisId;
  parseOptions(o: unknown, formatVersion: number): Result<JsonObject, string>;
}

/** The place of a field in the project, ["filters", 1, "maxAllowedMaf"]. */
export type FieldPath = readonly (string | number)[];
```

The checks of each value that the commands and `parseProject` share are
functions of `project.ts` that no other module imports.

### The commands

```ts
/** Puts a new load of the variants file, pending. Everything else is kept. */
export function loadVariants(p: Project, source: VariantLoad): Project;

/** Sets the filter of its kind, in the fixed order of the kinds. */
export function setVariantFilter(p: Project, filter: VariantFilter): Project;
export function removeVariantFilter(p: Project, kind: VariantFilterKind): Project;

/** Sets the filter of its kind, in the fixed order of the kinds. */
export function setIndividualFilter(p: Project, filter: IndividualFilter): Project;
export function removeIndividualFilter(p: Project, kind: IndividualFilterKind): Project;

/** Puts a new load of the individuals file, pending; `csv` is null for an xlsx. */
export function loadIndividuals(p: Project, source: {
  fileId: string; name: string; csv: CsvOptions | null;
}): Project;
/** Sets how the CSV is read, and puts its read back to pending. */
export function setCsvOptions(p: Project, csv: CsvOptions): Project;
/** Sets the type of a column of the table read, and records it in typesSet. */
export function setColumnType(p: Project, column: string, type: ColumnType): Project;
/** Drops from typesSet the types the read does not apply, typesLost. */
export function forgetTypesLost(p: Project): Project;
/** Removes the individuals file; the grouping is kept. */
export function removeIndividuals(p: Project): Project;

export function setGrouping(p: Project, grouping: Grouping): Project;
/** Sets the options of an analysis, as its parseOptions gives them back. */
export function setAnalysisOptions(p: Project, analysis: ParsedAnalysis, options: JsonObject): Project;

/** The options of an analysis: its entry, or the defaults it is given. */
export function analysisOptions(p: Project, analysis: AnalysisId, defaults: JsonObject): JsonObject;
```

What each does where a reader could doubt it:

| command | when | gives |
|---|---|---|
| any, every row below included | the value equals the one there: the same filter, the same options of the CSV, the same type, the same grouping, the same options of an analysis, a load with the load id already there and the same other fields | `p` itself |
| any | a value `parseProject` would refuse in its place | a defect |
| `removeVariantFilter`, `removeIndividualFilter` | no filter of that kind | `p` itself |
| `removeIndividuals` | no individuals file | `p` itself |
| `forgetTypesLost` | no file, a file not read, or `typesLost` empty | `p` itself |
| `setCsvOptions` | no individuals file, an xlsx, or a file `notGiven`, whose read the page could not make | a defect |
| `setColumnType` | the file not read, a column not in the table, `identifier` for another column than the first, another type for the first, a `binary` type whose two values are not those of the column's `binary` in `columnAllows`, `continuous` where its `continuous` is false | a defect |
| `setColumnType` | the first column, `identifier` | `p` itself, the type it has; `setColumnType` never puts the first column in `typesSet`, which may hold its name only as a type set before a read made it the first |
| `setColumnType` | a type the column may have | the type in `columns`; the pair of the column in `typesSet` replaced in its place, whether it was applied or not, or put last; so the column is no longer in `typesLost` |
| `setGrouping` | a grouping of the other application; `onePopulation` in association | a defect |
| `removeIndividuals` | a file, whatever the grouping | the source gone with its `typesSet`; the grouping kept, a column or `onePopulation`, and the analyses per population on one population while there is no file |
| `setAnalysisOptions` | options its `parseOptions` refuses, of `FORMAT_VERSION`, or nested deeper than `MAX_OPTIONS_DEPTH` levels | a defect |
| `setAnalysisOptions` | no entry for the analysis | a new entry, last, also when the options are the defaults |
| `loadVariants`, `loadIndividuals` | the load id already there, with another field different | a defect: a new read of a file is a new load, with a new load id |
| `loadVariants` | a new load id | the filters, the individuals file, the grouping, the options and the reference kept |
| `loadIndividuals`, `setCsvOptions` | a new load id, or other options | the read pending; the grouping kept by the name of its column; `typesSet` of the source before kept, `[]` when there was none, a source `notGiven` included |

Two values are compared as the command keeps them, the fields its type
does not have left out, so an object of the caller with a field more is
the value already there when its other fields are.

`setAnalysisOptions` keeps the options its `parseOptions` gives back,
whole, the defaults filled in, as `parseProject` does, so that a project
reads back from its file equal to itself.

How the ploidy of a VCF already loaded is changed, which a new load with
the same load id cannot do, is the screen spec's, in stage 3.

`loadVariants` keeps the user's settings, which do not belong to one
file; `projectNeeds` and `individualsNeeds` then lock what the new file
does not allow, with their reasons. It also keeps the reference of an
opened project, what the project file said of the file it was made with:
the screen compares the name, the size, the individuals and the ploidy of
the new file with the reference's as soon as the file is read, and the
number of variants once a first calculation has counted it, and warns
when they differ, saying in what, "The project was made with
panel_2026.nei, 342 individuals and 1,203,554 variants; this file has 360
individuals", without refusing the file (`docs/functionality.md`, section
9, step 2; `docs/architecture.md`, section 8). The words and the place of
that warning are the screen spec's, with the project file, in stage 2.

`loadIndividuals` and `setCsvOptions` carry the types the user set to
the new read, which keeps those its values allow (above, "The types of
the columns"). When the new table has no column of the grouping's name,
the analyses that use the populations lock and say so; the grouping is
not changed in silence.

A `binary` type's two values are the texts of the two distinct values
of its column that are not missing, a cell of an xlsx written as
`String` writes it, and `one` is not `zero`; a column with more or fewer
than two such values cannot be binary. The column's `binary` in
`columnAllows` holds the same two, with the reader's coding, and
`setColumnType` takes either coding. The same rule holds in `setColumnType` and in
`parseProject`.

### The records

Each records a read into the source with that load id, and, for the
individuals file, with those options, while its read is pending or
failed because its worker failed, `{ kind: "worker" }`. Otherwise it
returns the project it was given: for no source with that load id, for a
source read, for one whose read failed because popnei or the reader
refused the file, which the same file would give again, and for a
source `notGiven`, for which no read was asked. So a read that
comes back for a load the user has replaced changes nothing, and a read
that succeeds after a failure of the worker replaces the failure: with
the options of a CSV set to A, then B, then back to A, a first read of A
that failed when the worker crashed would otherwise stay, "could not be
read", after the second read of A, once the worker restarted, had
succeeded.

```ts
/** What the calculation worker read of the variants file of the load `fileId`. */
export function recordVariantsRead(p: Project, fileId: string, read: SourceRead): Project;

/** The number of variants, from the first pass over the load `fileId`;
    recorded when the source is read and its `numVars` is still null. */
export function recordVariantsCounted(p: Project, fileId: string, numVars: number): Project;

/** What the light worker read of the individuals file of the load `fileId`,
    with the options `csv` it was read with; recorded only when the source
    has that id and those options, so a read of options since changed is
    dropped (docs/architecture.md, section 6). A read of a table gets the
    types of the source's typesSet that it allows; typesSet is kept whole. */
export function recordIndividualsRead(
  p: Project, fileId: string, csv: CsvOptions | null, read: IndividualsReadGiven,
): Project;
```

A read of a table is recorded with the types the reader inferred, then,
for each pair of `typesSet` in its order, the type set in place of the
inferred one when the new read allows it, by the rule of "The types of
the columns", above; the pairs it does not allow, their column gone,
now the first, or their values changed, stay in `typesSet`, not
applied, and are those `typesLost` gives, in the order of `typesSet`. A
failed read keeps `typesSet` as it is too, so that a read that succeeds
after the file is mended, or after the worker restarts, still finds
every type the user set. Suppose `typesSet` holds `score` as categorical
and `status` as binary with `yes` coded 1, and the user writes `n.d.` in
a cell of `status` in Excel and loads the file again: `score` is still
there, and categorical, which any column but the first allows, is
applied; `status` now holds `yes`, `no` and `n.d.`, three values, so it
is categorical, as inferred, `typesSet` still holds both, and
`typesLost` gives `status` with the binary type that was set. The user
deletes `n.d.` and loads the file again: `status` is binary again, with
`yes` coded 1, and `typesLost` gives nothing.

A read whose table `parseProject` would refuse, a column named twice, an
individual in two rows, is not recorded as it is: the reader is our code,
so the read is recorded as failed, `{ kind: "worker", error: { kind:
"defect", message } }`, the message saying what the validation refused.
Recorded as read, it would make a project whose file cannot be opened
again, and a command on another column of it would throw.

### What every analysis needs

```ts
/** The reason no analysis can run on this project, because of its
    variants file, or null; the first table above. */
export function projectNeeds(p: Project): string | null;

/** The first list of individuals popnei would refuse, which of the two
    it is and the reason, or null, and null while projectNeeds gives a
    reason; the table after the first. The store locks with it only what
    reads the filters of individuals. */
export function individualListNeeds(
  p: Project,
): { readonly list: "keep" | "remove"; readonly reason: string } | null;

/** The reason of the variants file being read or not read, in the words
    of the Variants step, or null for no file or a file read; the second
    table above. */
export function variantsStepNeeds(p: Project): string | null;

/** The reason an analysis that uses the individuals file cannot run, or
    null, naming the file as the application of `p` names it. */
export function individualsNeeds(p: Project): string | null;

/** The reason of the individuals file being read or not read, in the
    words of the Individuals step, or null for no file or a file read;
    the table of the Individuals step above. */
export function individualsStepNeeds(p: Project): string | null;

/** The reason of individuals of the variants file missing from the
    individuals file, in the words of the Individuals step, which name the
    file, or null when none is missing or either file is not read. */
export function individualsStepMissing(p: Project): string | null;

/** What follows the colon of a refusal of the reader in the Individuals
    step, its words and its end, "it is a variants file, which the
    Variants step takes. Load a metadata file.", so that the step says a
    variants file told by its name, `.vcf`, `.vcf.gz`, `.bcf` or `.nei`,
    in the same words (`docs/specs/steps/individuals.md`). It takes any
    refusal but `files`, whose words until stage 4 were the message of
    the files wasm, which could be empty; the step's one use is the
    variants file. */
export function individualsStepRefusal(
  error: Exclude<IndividualsFileError, { readonly kind: "files" }>,
  app: AppId,
): string;

/** The individuals of the variants file found in the table, all those
    missing in the order of the variants file, and the number of rows of
    other individuals; null when either file is not read. The same object
    for the same two reads. */
export function individualsCheck(p: Project): {
  found: number; missing: string[]; ignoredRows: number;
} | null;
```

The types each column of a read allows, of "The types of the columns"
above, one per column in the order of the table:

```ts
export interface ColumnAllows {
  continuous: boolean;
  binary: { kind: "binary"; one: string; zero: string } | null;  // the reader's coding
}

/** For a read of a table, with its decimal mark, found.decimal or "." for
    an xlsx; the first column { continuous: false, binary: null }. The
    same array for the same read. */
export function columnAllows(read: Extract<IndividualsRead, { kind: "read" }>): ColumnAllows[];

/** The types of source.typesSet that its read does not apply, in the
    order of typesSet; [] for a source not read. The same array for the
    same source, so that a screen that compares it is not drawn again. */
export function typesLost(source: IndividualsSource): ColumnTypeOf[];

/** Why the read does not apply a type the user set on `column`, one of
    typesLost of its source: its table has no such column, the column is
    its first, or the values of the column do not allow the type. */
export function typeLostReason(
  read: Extract<IndividualsRead, { kind: "read" }>, column: string,
): "gone" | "firstColumn" | "values";
```

The populations, of "The populations" above; they were exported by
`src/core/analyses/diversity.ts` until stage 4, with the same names and,
but for `"all"` and the one population, the same answers:

```ts
/** The name of the one population of every individual. */
export const ONE_POPULATION = "All individuals";

/** The populations as a key holds them, from the project alone: those of
    the column chosen, with every individual of the table; "all" for the
    one population; null when neither can be given yet, and for a project
    of association. Never reads p.variants. */
export function populationsOf(p: Project): Pops | "all" | null;

/** populationsOf narrowed to the individuals of the variants file, the
    populations left empty dropped; "all" as [["All individuals", the
    individuals of the variants file]]; null when populationsOf is null or
    the variants file is not read. */
export function populationsToRun(p: Project): Pops | null;

/** populationsToRun narrowed to the individuals kept, `kept`, or whole when
    `kept` is null, the filters removing nobody; with the populations the
    list leaves empty, in their order, which are not in `pops`; null when
    populationsToRun is null. */
export function populationsKept(p: Project, kept: readonly string[] | null):
  { readonly pops: Pops; readonly emptied: readonly string[] } | null;

/** The reason about the column of the populations, with its kind, and
    the same words without "in the Individuals step" for that step, inStep;
    null without a file, with onePopulation, while the file is not read,
    and while a column of that name is chosen and the variants file is
    not read. */
export function populationsNeeds(p: Project):
  | { readonly kind: "noColumn" | "noSuchColumn" | "noPopulation";
      readonly reason: string; readonly inStep: string }
  | null;
```

Each keeps its answer for the same inputs, so that a table of 10,000
rows is not walked again each time a screen is drawn: `populationsOf` by
the table and the name of the column, `populationsToRun` by that and the
read of the variants file, `populationsKept` by that and the list, each
in a `WeakMap`, a table whose entries are dropped with the object they
are kept by, and each answer frozen.

The rules by which a text names a value of a file, the individuals and
the counts, above and in "The validation", are exported, so that the
other modules that write for the user, the diversity, the project file
and the Individuals step, follow them without writing them again; their
behaviour is the one this spec gives:

```ts
/** A value of a file escaped and cut after 40 characters, with "…". */
export function shown(value: string): string;
/** A value of a file, the name of a file among them, escaped and not cut. */
export function escaped(value: string): string;
/** Names in words: all when three or fewer, "a, b and c"; otherwise the
    first two and how many more, "a, b and 10 more". */
export function namesOf(names: readonly string[]): string;
/** A count with its noun, "1 individual", "1,203 individuals". */
export function counted(count: number, noun: string): string;
/** A whole number with a comma between groups of three digits. */
export function grouped(count: number): string;
```

### The validation

`parseProject` takes what `JSON.parse` gave of the project part of a
project file, and returns the project, or the first thing that is wrong
with it. It is given the application the file is opened in, the version
of the format of the file, from its header, and the analyses of the
application, each with the function that checks its options, since the
options of each analysis are its module's
(`docs/specs/core/store.md`, `AnalysisDef.parseOptions`). The header, its
versions and the check numbers are read by `projectFile.ts`, in stage 2,
which calls this; it makes the fingerprints, and they are validated here
when a project is read back in a test.

```ts
export function parseProject(
  data: unknown,
  app: AppId,
  formatVersion: number,
  analyses: readonly ParsedAnalysis[],
): Result<Project, ProjectError>;

export type ProjectError =
  | { kind: "otherApp"; found: AppId }
  | { kind: "unknownAnalysis"; id: string }
  // a field the type does not have; `path` is that of the object that has it
  | { kind: "unknownField"; path: FieldPath; name: string }
  | { kind: "missingField"; path: FieldPath }
  | { kind: "wrongValue"; path: FieldPath; expected: string }
  | { kind: "twoFiltersOfAKind"; path: FieldPath; filter: VariantFilterKind | IndividualFilterKind }
  | { kind: "filterOutOfOrder"; path: FieldPath }
  // the value of `path` repeats one before it in its list
  | { kind: "repeated"; path: FieldPath; what: "analysis" | "column" | "individual"; value: string }
  // `problem` ends a sentence whose subject is the field of `path`
  | { kind: "inconsistentTable"; path: FieldPath; problem: string };

/** The text the user reads. */
export function projectErrorText(error: ProjectError): string;
```

What it checks, beyond the shape of every field: every number finite; the
thresholds from 0 to 1, `maxDist` a whole number from 1 to 2^53 − 1, the
ploidy a whole number from 1 to 255, as popnei accepts; the size of a
variants file and its number of variants whole numbers of at least 0; a
load id of 32 lower case hexadecimal digits; at most one filter of each
kind in each list, and each list in its fixed order, the variants' as
well since stage 3; the table as the
reader gives it: at least one column and one row, no name of the header
twice, every row as long as its header, the first cell of each row the
name of an individual, a text that is not empty, and no individual in two
rows; one type per column, the first `identifier` and no other; a binary
type only where `columnAllows` gives the column `binary`, with its two
values in either coding, the texts of the two distinct values of its
column that are not missing, `one` not `zero`; a `continuous` type
only where `columnAllows` gives `continuous`, every value of the column
a number with the decimal mark of the read; in `typesSet`, no column
named twice and no `identifier`, and, in a source read, each pair of
`typesSet` that the read allows the type of its column in `columns`; nothing found of the options of
a CSV for an xlsx, whose `csv` is `null`; each analysis id one of those
given, once, with options nested at most `MAX_OPTIONS_DEPTH` levels, which
its `parseOptions` accepts; the application and the grouping of the
application given, `onePopulation` only in population genetics, with no column named twice in the roles; each check
of the reference of an analysis among those given, once, with a key
version that is a whole number of at least 0, its version of popnei and
of the application, two texts, and a fingerprint of 64 lower case
hexadecimal digits; a read of the individuals file `notGiven`, with no
other field; a failed read of the individuals file of any kind of
`IndividualsFileError` with its fields, the seven of an xlsx among them,
the separator among them one of
the three a CSV can have; `"utf-16"` among the encodings found; and the
line of `undecodedLine` of what was found a whole number of at least 1,
or `null`.

- **A file of the other application** is refused: "This project file is
  of the association application. Open it there."
- **A file that names an analysis this version does not know** is refused
  whole, as the owner decided on 24 September 2026: "This project file has
  the analysis ‹id›, which this version of the application does not know:
  it was saved by another version of the application. Open it with the
  version of the application that saved it." The last sentence, which
  says what to do, was added as the owner decided on 26 September 2026
  (point 7 of the review of work package 9 of
  `docs/plans/walking-skeleton.md`). The option not taken was to open it
  without that analysis.
- **A file saved by a newer version of the application** never reaches
  `parseProject`: the header of every project file holds the version of
  its format, and `projectFile.ts` refuses a version newer than the ones
  it knows before it reads the rest, with "This project file was saved by
  a newer version of the application, 0.4.0, in a format this version
  cannot read. Reload the page to get the newest version, and open the
  file again." (`docs/specs/core/projectFile.md`, `newerFormat`, whose
  words these are).
- **A project saved by stages 2 and 3**, in version 1 of the format
  (`docs/architecture.md`, section 12), has no `typesSet` in its
  individuals file, and it is read as none set. So such a project opens
  with the types it had, and offers the types a read of now would, since
  `columnAllows` works them out from the table. The option not taken was
  to refuse it, which version 1 allows before the first release; those
  files were written by the application, and nothing in them is wrong.
- **A field the type does not have**, in a file whose version this
  application knows, is refused, as `unknownField`: such a file was
  changed by hand or damaged, since this version would not have written
  the field. This was decided here, not by the owner. Its text: "The
  project file cannot be opened: the second filter of the variants has a
  field "minRate", which the application does not write. The file was
  changed outside the application, or is damaged. Open a copy saved
  before the change, or make the project again."
- **The text of any other error names the field in words**, from a table
  in `project.ts` of every field of the project, with a position as an
  ordinal, in the pattern "The project file cannot be opened: ‹the field
  in words› ‹what is wrong›. The file was changed outside the
  application, or is damaged. Open a copy saved before the change, or
  make the project again.":
  - a wrong value: "the threshold of the second filter of the variants
    should be a number from 0 to 1";
  - a field missing: "the threshold of the second filter of the variants
    is missing";
  - two filters of one kind: "it has two filters of the variants by
    missing genotypes, and a project has at most one of each kind";
  - the filters of the individuals out of their order: "the filters of the
    individuals should be in the order individuals to keep, individuals to
    remove, missing genotypes, observed heterozygosity, and the second one
    is out of that order";
  - the filters of the variants out of their order: "the filters of the
    variants should be in the order missing genotypes, observed
    heterozygosity, major allele frequency, linkage disequilibrium, and
    the second one is out of that order". A project file of version 1
    whose filters of the variants are in another order, which the
    application of stage 2 could not write, since it had the missing data
    filter alone, is refused so (`docs/architecture.md`, section 2);
  - a value repeated: "the second analysis repeats the analysis
    diversity";
  - a table that does not agree with its types: "the type of the second
    column of the individuals file cannot be identifier: only the first
    column can have that type"; "the type of the third column of the
    individuals file cannot be continuous: its values are not all
    numbers"; and, of the new field of stage 4, named "the types set by
    the user", "the second of the types set by the user names the column
    score, which the individuals file does not have".

  The last sentence of these texts and of the one above, what the user
  can do, the owner decided on 24 September 2026; the option not taken
  was to end with what happened alone.

  A path such as `filters[1].maxAllowedMaf` is never shown, nor any value
  of the code: a kind of filter is named by what it filters on, in the
  words of `docs/functionality.md`, the kinds of the individuals' filters
  "individuals to keep", "individuals to remove", "missing genotypes" and
  "observed heterozygosity", and the options of a CSV by their names, "a
  comma, a semicolon or a tab". A limit that is the largest number a
  program can hold is not written: "a whole number, 1 or more".
- **A value of the file shown in a text**, the id of an unknown analysis,
  the name of a field the type does not have, a repeated value, is shown
  with its control and format characters escaped, those of the Unicode
  categories Cc and Cf, so that neither a new line nor a mark that
  reverses the direction of the text, U+202E, changes the text around it:
  a new line, a tab and a carriage return as `\n`, `\t` and `\r`, any
  other as `\u` and its four hexadecimal digits, `\u202e`, or `\u{e0001}`
  beyond them. Half of a pair that encodes one character, alone, is
  escaped in the same way. A quote and a backslash are shown as they are,
  since they are in the user's file. The value is cut after 40 of its
  characters, an escaped character counting as one and never cut inside
  its escape, with "…" after it. Two values that differ only after their
  40th character look the same in a text; that is taken, for a text of a
  line or two.

## The cases

- **An empty project.** `projectNeeds` gives "Load a variants file in the
  Variants step."
- **Two picks of files before the first read comes back.** Each pick has
  its own load id; the read of the first finds no source with its id, and
  `recordVariantsRead` returns the project unchanged.
- **A worker that could not start**, or crashed while it opened the file:
  the page records the read as failed with the worker's error, and every
  analysis is locked with the reason of the first table above, instead of
  "Reading panel.nei." for ever. A read of the same load that succeeds
  after the worker restarts replaces the failure.
- **An opened project file.** `projectFile.ts` gives `parseProject` the
  project part, then makes a project with `variants: null` and the
  reference built from the file (`docs/architecture.md`, section 8). A
  pending read in a project is valid here; a project file writes the read
  of its variants file as pending, whatever it was, and the individuals
  file with its table when it was read and as `notGiven` otherwise
  (`docs/specs/core/projectFile.md`, "What is written of each part"), so
  an opened project holds no pending read of the individuals file.
- **An opened project whose individuals file was not read when it was
  saved**, `notGiven`. `individualsNeeds` and `individualsStepNeeds`
  give their reasons, whatever the grouping; `populationsOf`,
  `populationsNeeds` and `individualsCheck` give `null`, as for a file
  not read. A new load of the file replaces it, pending, with its
  `typesSet`, and the grouping finds its column by its name;
  `removeIndividuals` removes it, and the analyses per population run on
  one population.
- **An opened project with a threshold on the individuals** opens as
  any other; its list of individuals kept waits for the statistics of
  the new load (`docs/specs/core/individualsKept.md`, "The cases").
- **No metadata file.** `individualsNeeds` and `populationsNeeds` give
  `null`, `populationsOf` gives `"all"`, and, once the variants file is
  read, `populationsToRun` gives `[["All individuals", its 200
  individuals]]` for `panel.nei`. The grouping of an empty project,
  `column: null`, is not looked at.
- **A column chosen, then the file removed.** The analyses run on one
  population, and the grouping keeps the column; loading the file again
  finds it by its name, and the populations of the column come back,
  with the results of their key if the cache still holds them.
- **The one population chosen, with a file that lacks individuals of
  the variants.** `individualsNeeds` locks, as with a column: the one
  population with a file is every individual of the variants, and those
  missing from the file would otherwise be counted in it without a word
  about the file. Removing the file runs it.
- **A type set for a column that a new read no longer has.** It stays
  in `typesSet`, is in `typesLost`, and is applied again by a later read
  that has the column: a file read with the wrong separator, as one
  column, applies no type set, and the same file read with the right one
  applies them all. `forgetTypesLost` drops it.
- **A column with a type set that a new file has in the first place**,
  the user having moved it there in Excel. It is the identifier and
  names the individuals; its type set stays in `typesSet`, not applied,
  is in `typesLost`, and `typeLostReason` gives `"firstColumn"`. A file
  that puts the column back among the others applies it again.
- **A project of association with no traits file.** `individualsNeeds`
  gives "Load a traits file in the Individuals step.", as before.

## How it runs

On the page, in the thread that draws the screens, so a function that
walks the whole table holds the page for as long as it runs. The one
that reads every cell is `columnAllows`, which tells of each cell
whether it is a number. It runs once for each read, since it keeps its
answer: when the read is recorded, which applies the types set by it,
and at the opening of a project file, whose validation calls it; the
Individuals step then finds its answer kept. The review
of the architecture timed it on 27 September 2026 in node, not in a
browser, at 128 to 229 ms for a table of 10,000 rows and 50 columns, the
largest the architecture plans for; a page that does not answer for
more than about 100 ms is a delay the user notices (the RAIL model,
https://web.dev/articles/rail). So the plan measures it in Chrome,
Firefox and Safari on that table. If it takes more than 100 ms in any of
them, the light worker, which already walks the table to infer the
types, works it out beside the read with the same functions and gives
it with the read; `recordIndividualsRead` puts it in the memory of
`columnAllows` for the read it records, and not in the project, so the
project file still does not write it and nothing else changes for the
callers. An opened project still works it out on the page, once, at its
validation. Decided on 27 September 2026, after the review of the
architecture; the option not taken, to give it with the read in any
case, adds to the protocol of the light worker what may not be needed.

## How it is verified

With Vitest, at the functions above. Every test gives the function a
project frozen deeply with `Object.freeze`, so that a write into it throws
(`.claude/skills/coding/SKILL.md`, "The core").

- **Each command**, on a small project: the part that changed, and `toBe`,
  the same object, on every part that did not. A worked case: from
  `emptyProject("popgen")`, `setVariantFilter` of `{ kind: "maf",
  maxAllowedMaf: 0.95 }`, then of `{ kind: "missing_data",
  maxAllowedMissingRate: 0.1 }`, then of `{ kind: "maf", maxAllowedMaf:
  0.9 }`: the filters are `[missing_data 0.1, maf 0.9]`, the missing data
  filter put before the MAF filter, which set first, and the MAF filter
  replaced in its place; `setVariantFilter` of `{ kind: "ld", … }` then
  of `{ kind: "obs_het", … }` gives `[missing_data, obs_het, maf, ld]`;
  `setVariantFilter` of a new object `{ kind: "missing_data",
  maxAllowedMissingRate: 0.1 }` returns the project itself. Each row of
  the table of the commands, with its defect or its `p`.
- **Each record**: recorded into the source of its id; the project itself
  for another id, for a read already recorded, and, for the individuals
  file, for other `csv` options.
- **`projectNeeds`**, **`individualListNeeds`**, **`variantsStepNeeds`**, **`individualsNeeds`**
  and **`individualsStepNeeds`**, a case for each row of their tables, the individuals named;
  `individualListNeeds` with `list` `keep` and `remove` for each of its
  rows, `null` for a bad list while the file is not read, and
  `projectNeeds` `null` for a read file with a bad list; the words of each kind of
  refusal of the reader; "a traits file" in the reasons of a project of
  association.
- **`individualsCheck`**: `null` when either file is not read; the
  individuals found, those missing in the order of the variants file,
  and the rows ignored; and `individualsNeeds` naming the same
  individuals missing.
- **The exported rules of the words**: `escaped` escapes a name and does
  not cut it, where `shown` cuts it after 40 characters.
- **The populations**, the tests of the worked example of
  `docs/specs/analyses/diversity.md`, "How it is verified", moved here
  with the functions, and: with no file, `populationsOf` `"all"`,
  `populationsToRun` `[["All individuals", ["i1", "i2", "i3", "i4"]]]`
  for a variants file of `i1` to `i4`, `populationsKept` with `["i1",
  "i3"]` `{ pops: [["All individuals", ["i1", "i3"]]], emptied: [] }`,
  and `populationsNeeds` `null`, whatever the grouping, the column `pop`
  included; the same with the file and `onePopulation`; `populationsOf`
  of a project with no file and a getter of `p.variants` that throws,
  `"all"`; with the file and `column: null`, `populationsNeeds` of kind
  `noColumn`, with its words; a column of an xlsx whose cells are the
  number 1, the text `1` and the number 2 gives the populations `1` and
  `2`; every function `null` for a project of association.
- **`columnAllows`**, on the worked table of the diversity's spec,
  `i1` to `i4`, with a column `h` of `1,5`, `2`, `2` and a missing cell,
  read with the comma, and a column `st` of `yes`, `no`, `yes` and `no`:
  the first column `{ continuous: false,
  binary: null }`; `pop`, of `A` and `B` and a missing cell, binary with
  `B` coded 1 by the order of the code units, and not continuous; `h`
  continuous and binary, `2` coded 1; `st` binary with `yes` coded 1;
  the same `h` read with the point, `1,5` text, binary and not
  continuous; in the table of an xlsx, a column of the number 1, the
  text `1` and the number 0, binary with `1` coded 1; the same array for
  the same read.
- **The types**: `setColumnType` of each type a column may have, and a
  defect for each it may not, from `columnAllows`; a binary type of either
  coding accepted; `typesSet` holding the pair, replaced in its place when
  the column is set again, also while it is not applied; the column no
  longer in `typesLost`. The record, on the example of "The records":
  `score` applied, `status` not, `typesSet` `[score, status]` unchanged,
  `typesLost` `[status]`; the file read again without `n.d.`, `status`
  binary with `yes` coded 1 and `typesLost` empty; a type set continuous
  on a column whose new values are not all numbers, not applied; a
  binary type applied, with the user's coding, when the new column has
  the same two values in another order of the rows, and not when it has
  other two; a type set on a column absent from the new table, not
  applied; a type set on `status` and a new table whose first column is
  `status`, not applied; a file of one column, as a wrong separator
  reads it, then the same file of three columns: every type set applied
  again; a failed read, `typesSet` unchanged. `typeLostReason` gives
  `"values"`, `"gone"` and `"firstColumn"` for these three. `typesLost`
  the same array for the same source, and `[]` for a source not read.
  `forgetTypesLost` keeps in `typesSet` the pairs applied alone, and
  gives the project itself when none is not applied. `setColumnType` of
  the first column with `identifier`, the project itself.
  `loadIndividuals` after `setColumnType` carries `typesSet`;
  `removeIndividuals` then `loadIndividuals` does not.
- **`parseProject` of a read with a type set not applied**: a source
  whose `typesSet` holds `status` binary and whose table does not allow
  it opens, and `typesLost` gives it; a pair the read allows whose column
  has another type in `columns`, refused.
- **A source `notGiven`**: `individualsNeeds` and `individualsStepNeeds`
  with their words, with a column, with `column: null` and with
  `onePopulation`; `populationsOf` `null`; `setCsvOptions` a defect;
  `recordIndividualsRead` of its load id, the project itself;
  `loadIndividuals` after it, pending, with its `typesSet`.
- **`populationsNeeds`** gives `inStep`, the words of `reason` without
  "in the Individuals step", for each of its three kinds.
- **`individualsNeeds`** with no file, `null` in population genetics and
  "Load a traits file in the Individuals step." in association.
- **`parseProject`**, a case for each check above, with its `kind` and its
  `path`; `projectErrorText` of `wrongValue` at `["filters", 1,
  "maxAllowedMaf"]` holds "the threshold of the second filter of the
  variants" and not `filters`; the filters of the variants `[maf,
  missing_data]` refused as `filterOutOfOrder` at `["filters", 1]`, with
  the text above; an individuals file of stage 2, with no `typesSet`,
  opens with none set; the grouping `onePopulation` opens in population
  genetics and is refused in association; a `continuous` type on a
  column of which one value is not a number, refused, with its text.
- **Properties, with fast-check**, which draws random projects and
  sequences of commands, and shrinks a failure to the smallest one. For
  every project, `parseProject(JSON.parse(JSON.stringify(p)), …)` is ok
  and deeply equal to `p`; the projects drawn hold the fields of stage
  4, `typesSet` with pairs applied and not, `onePopulation` and a read `notGiven`, which
  `wholeProject` of `src/core/testSupport.ts` draws. For every sequence of commands, each list has
  at most one filter of each kind and both lists are in their fixed
  order; and a command applied twice with the same arguments
  returns, the second time, the project it was given.

## Open points

1. **The types the user set when the individuals file is read again.**
   Answered on 27 September 2026 by a recommendation to the owner that
   is taken meanwhile, gathered in `docs/specs/stage-4-open-points.md`:
   they are kept by the name of their column, and applied where the new
   values allow them; otherwise the column has its inferred type, the
   type set waits in `typesSet` for a read that allows it, and the
   Individuals step says which columns do not have the type set ("The
   types of the columns", above). The option not taken was the meanwhile
   of stage 2, every type set lost at a new read, which made a user who
   changed the separator set every type again. That a type not applied
   waits, and is not dropped, was decided after the review of the
   architecture on 27 September 2026. Another answer changes the record
   of a read and the line of the step, and not the types of the project.

The five that follow are the words of `projectNeeds`,
`individualListNeeds` and `individualsNeeds` that the owner took as provisional on 24 September
2026, to be judged on the screens of stage 2. A different answer to any
of them changes those texts and their tests, and nothing else.

2. **How the user is told to fix a list of individuals that is empty,
   names one more than once, or names individuals not in the variants
   file.** Decided by the owner on 26 September 2026, point D of
   `docs/specs/stage-3-open-points.md`: the ends of the first draft of
   this spec, "Add individuals to it, or remove the filter, in the
   Variants step." for an empty list and "Change the list, or remove the
   filter, in the Variants step." for the other two, as the table of
   "What an analysis needs of every project" has them, until the owner
   sees the Variants step at the stop of the plan of stage 3 where the
   screens are tried. The option not taken was other words, for instance
   ones that name the control the step gives the list, chosen before the
   screen was seen; the owner can still choose them there, and they
   change that table and its tests alone. Before, settled by the owner
   on 25 September 2026 for stage 2: the three reasons end "The Variants
   step has no control for the filters of individuals in this version,
   so correct the list in the project file, in a text editor, and open
   the project again.", since in stage 2 such a list came only from a
   project file. The review of the code changed, on 24 September 2026,
   the wording of the second reason, "names ind_031 twice", to "names
   ind_031 more than once", which holds also of a name written three
   times.
3. **How many individuals a text names.** A reason can name hundreds of
   individuals, and a line beside the Run button holds a few. Meanwhile,
   three or fewer are all named, "ind_031, ind_044 and ind_050"; of more
   than three, the first two and how many more, "ind_031, ind_044 and 10
   more"; one alone has a sentence in the singular, "1 individual of
   panel.nei is not in pops.csv: ind_031." and "The list of individuals
   to keep names 1 individual that is not in panel.nei: ind_900."; they
   are named in the order of the variants file, or of the list. The
   singular of the second sentence of the individuals missing, "Add it to
   the file and load the file again in the Individuals step.", is the
   writer's.
4. **What happened, when a file could not be read for another reason
   than a refusal of its reader.** Meanwhile, by the kind of the
   worker's failure (`RunError`, `docs/specs/worker/protocol.md`): it
   could not start, "the application could not start its calculations";
   it crashed, or the message was a defect of our code, "the calculation
   stopped unexpectedly"; it is of another version of the page, "the page
   is out of date". A refusal of the files wasm in the calculation
   worker, or of popnei in the light worker, which neither worker gives,
   is taken as a defect of our code, with its words; this is the
   writer's, and so is a `reopenFailed` of the light worker, which it
   never gives. A `reopenFailed` of the variants file has its own words,
   decided by the owner, above. The sentence that follows is decided, by the owner on 24
   September 2026: after a crash or a defect, "Load it again in the
   Variants step." or "Load it again in the Individuals step.", since
   loading the file again starts a new worker and keeps the rest of the
   project; when the worker could not start, or the page is out of date,
   "Save the project, reload the page, open the project and load
   panel.nei again.", since only a new page can mend those. Both can
   come of a new version of the site deployed while the page was open,
   which removes the script a worker started again fetches
   (`docs/architecture.md`, section 13), so the words say to save the
   project first, which a reload would otherwise lose; the project file
   holds no variants file, and a metadata file not read is asked for
   again, so the last words name the file. Decided on 27 September 2026,
   after the review of the architecture of stage 4, where the words of
   stage 2 were "Reload the page and load it again." The option not
   taken was "Reload the page and load it again." after every failure of
   the worker, which after a crash would have lost the whole project for
   what a new load of the file mends.
5. **The end of a refusal of the reader of the individuals file**, the
   reader of CSV and TSV. Its words, after "could not be read:", are the
   reader's spec's since 25 September 2026, above, which settles what
   this point asked of them. "Reload the page and load it again." is
   wrong advice for a file whose rows are wrong, so such a refusal ends
   "Load a metadata file in the Individuals step." beside a Run button;
   in the Individuals step it ends as the owner decided on 25 September
   2026, "Choose another separator, or load a corrected file." or
   "Load a corrected file.", which settles this point (above, "What an
   analysis needs of every project").
6. **Which problem of the filters of individuals is named first, when
   there are several.** Meanwhile, the list of individuals to keep before
   the list to remove; within one list, an empty list first, then names
   repeated, then names not in the variants file.

## Not in this spec

- The project file, its header, its versions and the check numbers it
  writes: `docs/specs/core/projectFile.md`, stage 2.
- The keys, and how the fingerprint is made: `docs/specs/core/keys.md`.
- Undo and redo: `docs/specs/core/history.md`.
- The ids of the analyses and their options: the spec of each analysis,
  from stage 2.
- The regions of a BED file in the project, `RegionsSource` of
  `docs/architecture.md`, section 2, and the filter of the regions: they
  come with popnei's release that has that filter.
- The individuals the filters keep, the counts of each filter of
  individuals and the lock when they keep none:
  `docs/specs/core/individualsKept.md`.
- The bins of the statistics of each individual, `src/core/histogram.ts`:
  `docs/specs/analyses/individualChecks.md`.
- How the reader infers the types, reads a number and proposes the
  coding of a binary column, with the functions `columnAllows` calls:
  `docs/specs/worker/individuals.md`, and, for an xlsx,
  `docs/specs/worker/files.md`.
- The populations edited with a lasso on the PCA: not in stage 4; a
  design of its own.

## What this spec asks of other documents

Stage 4, 27 September 2026:

- `docs/specs/worker/protocol.md` and `src/worker/protocol.ts`: the
  binary type of `ColumnType` holds texts, `one: string; zero: string`,
  where it held a cell.
- `docs/specs/worker/individuals.md`: its binary types hold texts; and
  `cellNumber` and `inferColumnTypes` pure, for `columnAllows`.
- `docs/architecture.md`, section 2: `IndividualsSource` with
  `typesSet`, the read without `typesLost`, which is worked out, and the kind `notGiven`, and
  `Grouping` with `onePopulation`; and the text of `ColumnType`, whose
  binary values are texts.
- `docs/specs/worker/runner.md`, which names `populationsToRun` of the
  diversity for the order of the populations: they are of
  `src/core/project.ts`.
- `.claude/skills/coding/configs.md`: the lint of core lets it import
  `columnTypes.ts` of the reader, for `columnAllows`.

Each of these was made in its document on 27 September 2026, when the
specs of stage 4 were made to agree, but those of `docs/architecture.md`.

After the review of the same day, made in `docs/specs/entry.md` (a
source `notGiven` is never asked for a read, as a source read is not;
only a pending one is), and not yet made in their documents:

- `docs/architecture.md`, section 2: the read without `typesLost`, and
  `typesSet` holding the types not applied as well.
- `docs/specs/steps/variants.md`: the words after a calculation worker
  that could not start, "… Save the project, reload the page, open the
  project and choose panel.nei again.", where it quotes "Reload the page
  and choose it again.".
- `docs/specs/analyses/pca.md`: `populationsNeeds` gives `inStep` beside
  `reason`, and the PCA, which locks on `individualsNeeds`, locks on a
  source `notGiven` too.
