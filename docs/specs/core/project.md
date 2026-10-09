# The project and its commands

Revised on 9 October 2026 for `docs/designs/input-page.md`, approved by
the owner that day, in the places marked "From 9 October 2026", with no
code yet: the individuals file read by table_io, whose failed read
carries the format of the file and whose refusals change their kinds and
some words, and whose loads all carry options of a CSV; the populations
named with the decimal mark of the read; and, for `popgen2.html`, the
counts per population, the column chosen by the page and the words of a
refusal in its box (below, "The counts per population on
popgen2.html").

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
2026 for stage 4, the Individuals step whole: the
metadata file optional, as the owner decided on 25 September 2026, with
one population, "All individuals", without it, and the grouping
`onePopulation` for a project with a file; the populations every
analysis per population reads, made here and no longer in the module of
the diversity; the types of the columns set by the user, with the
coding of a binary column; and those types kept when the file is read
again, recommended to the owner on 27 September 2026 and decided by
the owner as recommended on 28 September 2026
(`docs/specs/stage-4-open-points.md`, point 6), which answers Open 1.
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
save the project before the reload. Revised again the same day when the
specs of stage 4 were made to agree: the validation of a project file
accepts no failed read of the individuals file, which `projectFile.ts`
refuses first; and what it asked of other documents, made. Revised on
28 September 2026, when stage 3 was merged into the specs of stage 4:
`populationsBeforeRun`, the populations known before a Run, which stage
3 added to the module of the diversity on 27 September 2026, joined the
other functions of the populations here. Revised again on 28 September
2026 for the owner's decision that day that the LD filter of the
variants starts with no distance when the user turns it on, as the
PCA's pruning then did: the project holds it with `maxDist` `null` until
the user types one, `ProjectVariantFilter`; `variantFilterNeeds` gives
the reason that locks what reads the filters meanwhile; and
`jobFilters` gives the filters a job carries, which always have their
distance. This changes the code of stage 3, and the plan of stage 4
carries the change. Revised again that day after the review of that
change: `variantFilterNeeds` locks what reads the filters of
individuals as well as what reads those of the variants, since the
individuals kept by a threshold come from the statistics of each
individual, which it locks; and the projects the properties draw hold
an LD filter with no distance. Revised again that day for the owner's
decision that the LD filter keeps its r² and its distance while it is
off, as the PCA's pruning then did, so that turning it on again gives back
what was typed: a filter turned off with a switch of the Variants step,
of the variants or a threshold of the individuals, moves with its
values to `filtersOff` or `individualFiltersOff`, which no key, no job
and no lock reads (below, "The filters turned off"). Revised again
that day for the owner's decision that the filters of individuals act
first (`docs/architecture.md`, section 2): the list of the individuals
kept comes before the filters of the variants, which count over it; and
`variantFilterNeeds` locks only what reads the filters of the variants,
since the statistics of each individual read no filter, while
`individualListNeeds` locks the Count and the histograms of the
variants, which now read the filters of individuals. Revised again
that day for the owner's decision that the PCA has its own filters of
missing data, MAF and LD, each following the Variants step by default
(`docs/specs/analyses/pca.md`): what said the PCA's pruning now says
the PCA's own LD filter, and the PCA is locked by the LD filter of the
step through its own `needs`, and only while its LD filter follows the
step; and again that day for the owner's decision that the regions of
a BED file, once the application has that filter, come before the
filter of individuals. The revisions for stage 4 are approved by the owner on 28 September 2026; they change the
code of stage 3. Revised on 29 September 2026 after the review of work
package 5 of `docs/plans/individuals-pca.md`: the first column, the
names of the individuals, is never the column of the populations, as
the owner is shown at stop B of that plan; and `columnWarningsOf` and
`firstValues`, which keep what the Individuals step shows of each
column; and the same day with the owner's decisions on stop B of that
plan (`docs/specs/stage-4-open-points.md`): the words of `notText`,
and a kind of refusal more, `headerError`, an error of Excel in the
header of an xlsx; and Open 4 closed for the individuals file, with the
words of a crash of its reader. Revised on 30 September 2026 for stage
5, the analyses of the populations, which share more of the
populations than stage 4 did: the populations under the minimum of
individuals, split from the others by one function, and named alike in
the ready state of the diversity and of the distances between
populations; and the two locks the diversity alone had, the lists of
individuals leaving no individual with a population and the individuals
kept leaving no population, made functions here, since the distances
between populations and the LD decay lock on them too
(`docs/specs/analyses/popDists.md` and `ldDecay.md`). Approved
by the owner on 30 September 2026. Revised on 7 October 2026 for the
thresholds of popgen2.html as filters of the project,
`docs/designs/stats-filters.md`, approved by the owner that day: a
filter of the variants of a new kind, which keeps the variants of a VCF
that passed their FILTER column, `{ kind: "passed" }`, first in the
fixed order of the filters of the variants; a function that gives the
filters on that apply to the project's file, without that filter for a
`.nei` file, `filtersApplied`, which everything that reads the filters
applied reads in place of `filters`; one command for the thresholds of
popgen2.html, `setThreshold`, which takes an empty box, or the value 1,
as off; and the first project of popgen2.html (below, "The filters of
popgen2.html"). Revised again on 7 October 2026 for the owner's decision
that the filter of the FILTER column applies to a `.nei` file whose
variants record whether they passed their FILTER, and not only to a VCF
(`docs/designs/stats-filters.md`, "What the owner decided"): the read
of the variants file holds `keepsPassed`, popnei 0.2.2's answer to that,
which the calculation worker gives when it opens the file; `keepsPassed`
of a source gives it, true for a VCF before its read; and
`filtersApplied` and `filtersAppliedTo` leave the filter out for a file
whose variants do not record their FILTER, in place of every `.nei`
file. Built on the branch `filters`, work packages 1 to 3 of
`docs/plans/filters.md`, on 7 and 8 October 2026, in
`src/core/project.ts`, `src/core/filtersApplied.ts` (`keepsPassed`,
`filtersApplied` and `filtersAppliedTo`, in a module of their own so
that `keys.ts` reads them with no cycle of imports) and, for
`popgen2FirstProject`, `src/core/apps.ts`; the screen that sends these
commands was accepted by the owner on 8 October 2026.

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
  thresholds, of `maxDist`, which may also be `null`, and of the ploidy,
  read options only for a VCF,
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
  FILTER column, missing data, observed heterozygosity, the major allele
  frequency (MAF) and the LD pruning, in that order, the regions of a
  BED file first once popnei has that filter, the FILTER column after
  them since 7 October 2026;
  the individuals' keep, remove, missing data, observed heterozygosity.
  The filter of individuals comes before every filter of the variants
  but the regions and the FILTER column, as popnei's `filterIndividuals`
  put on the `Variants` after them and before any other step, so the other filters of
  the variants count over the individuals kept, as the owner decided on
  28 September 2026; until then it came after them, and they counted
  over every individual of the file. The regions, once the application
  has that filter, come before the filter of individuals, as the owner
  decided later that day, since they keep a variant by its position
  alone (`docs/architecture.md`, section 2). Setting
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

### The filters turned off

A filter of the Variants step that has a switch keeps its values while
it is off, so that turning it on again gives back what the user typed.
The owner decided it on 28 September 2026 for the LD filter, whose
distance has no default and would otherwise be typed again at every
turn on, as the PCA's own LD filter keeps its values while it follows
the Variants step (`ld` of `docs/specs/analyses/pca.md`, with its flag
`follow`). The writers made it the rule of every
filter with a switch the same day, the four filters of the variants and
the two thresholds of the individuals, so that the switches of one step
behave alike; the form below costs no more for six filters than for
one. The two lists of individuals have no switch: Clear empties a list
and keeps nothing, as its text area shows.

The filters on stay in `filters` and `individualFilters`, as until now.
A filter turned off moves, with its values, to `filtersOff` or
`individualFiltersOff`, in the same fixed order, and a filter turned on
leaves them. A kind of filter is in one of the two lists, or in neither
while it has never been turned on. Three things read the lists of the
filters off: the switch of the Variants step, which turns a filter on
with the values kept (`docs/specs/steps/variants.md`), the project file,
which writes them, and the validation, which reads them back. So what reads the filters applied, the keys,
the jobs, the locks of `variantFilterNeeds` and `individualListNeeds`,
the individuals kept, the Count, the summary line of the shell and the
Python script of stage 6, reads `filters` and `individualFilters` as it
did, and never meets a filter turned off. The values kept while off are
in no key, since no result is calculated from them. An LD filter turned
off before its distance was typed keeps its `maxDist` `null`, locks
nothing, and is locked again when it is turned on with no distance.

Turning a filter off or on is one command, and one step of Undo, that
changes both lists at once; an Undo gives back the project before it.
The project file writes the two lists of the filters off
(`docs/specs/core/projectFile.md`), and the format stays at its version
1; a file saved before them has neither, and opens with nothing kept
(below, "The validation").

The option not taken: a flag in every filter of `filters`, the form of
the PCA's own filters, each with its `follow`. The PCA's own filters
are options of one analysis, which `pcaFilters` alone reads, in one
place. The filters are
read in many: in the code of stage 3, `keys.ts`, `individualsKept.ts`,
the summary line of the shell, the words of the Variants step and the
writing read `filters` or `individualFilters` as the filters applied,
their length among them. With a field `on`, each of those, and each
written later, would have to skip the filters off, and one that missed
it would apply or count a filter the user had turned off, a wrong
number on the screen with nothing to show it. The keys would also need
the filters off taken out before the hash, where now they hash the list
as it is.

### The filters of popgen2.html

On the new page of population genetics, `popgen2.html`, the thresholds
the user drags or types on the histograms of the open file, and the
check box "Leave out the variants that failed their FILTER", are filters
of the project, each change one step of Undo, as
`docs/designs/stats-filters.md` decided on 7 October 2026. Four things
of this module serve them, below. A filter turned off is kept, with its
values, in `filtersOff` for the variants and `individualFiltersOff` for
the individuals ("The filters turned off", above).

**What changes for `popgen.html`.** The old page offers none of this,
and two things change for it all the same. It refuses a project file
that holds the filter of the FILTER column, on or off, with words that
say the file was made by the new page (`docs/specs/core/projectFile.md`,
"Opening"). And a failure of a calculation that is not
popnei's, a crash of the worker, stays on its screen after a change that
leaves the key of that calculation as it was, where every change cleared
it until 7 October 2026 (`docs/specs/core/store.md`, "A calculation
that failed"). Its keys, jobs, counts and scripts read `filtersApplied`
in place of `filters`, which gives `p.filters` itself for every project
it can hold, since none holds the filter of the FILTER column; so they
do not change.

**The filter of the FILTER column**, `{ kind: "passed" }`, keeps the
variants of a VCF, or of a `.nei` file that records the FILTER of its
variants, whose FILTER is `PASS` or a dot, popnei's
`filterPassed`, and has no number (`docs/specs/worker/protocol.md`). It
is a filter of the variants as the others are: on in `filters`, first in
the fixed order, and kept in `filtersOff` while off. A click on the box
is `setVariantFilter(p, { kind: "passed" })` or
`turnOffVariantFilter(p, "passed")`, one step of Undo each. In
`src/core/project.ts` it is the first entry of `VARIANT_FILTER_KINDS`,
the table of the kinds of filter of the variants from which
`VARIANT_FILTER_ORDER` is made (`keysOf(VARIANT_FILTER_KINDS)`), with
no fields and the words "the FILTER column" in `FILTER_KIND_WORDS`. So
every test that draws a kind from `VARIANT_FILTER_ORDER` draws `{ kind:
"passed" }` too, the property of `src/core/keys.test.ts` that a filter
turned off is in no key among them (`docs/specs/core/keys.md`). Only
`popgen2.html` offers it, and `popgen.html` refuses a project file that
holds it, on or off (`docs/specs/core/projectFile.md`, "Opening").

**Whether the variants record their FILTER**, `keepsPassed(source)`:
whether the variants of the file record whether each passed its FILTER,
which the filter of the FILTER column needs. popnei writes that record
in a `.nei` file from its vars format 1.2, when the source had it and
the file holds one variant at least, so a `.nei` file written from a
VCF by popnei 0.2.1 or later has it, unless it holds no variant, and
one written before that format, as `panel.nei` of the tests, or from such a
file, has not; popnei refuses `filterPassed` over a file without it
(`docs/specs/worker/runner.md`, "The steps"). popnei 0.2.2 says which
once the file is open, `keepsPassed` of its `Variants`, and the
calculation worker sends it in `opened`, which the page records in the
read of the file, `SourceRead` of kind `read` (below, "The TypeScript interface").
`keepsPassed(source)` gives the read's value once the file is read, and,
before, or when the read failed, `true` for a VCF, whose variants always
hold the record, and `false` for a `.nei` file, which may not. That
answer by the format is for what is worked out from a file whose read
has not answered: `filtersApplied` while the read is pending, when
`projectNeeds` waits for the read and no calculation runs, and the Save
of a project whose variants file is not given again, which compares the
settings with the reference's for the reference's file, whose read no
file saves (`docs/specs/core/keys.md`, "The fingerprint of the
settings").
The screen of `popgen2.html` does not read `keepsPassed(source)`: it
shows the FILTER box only once the read of the file says `keepsPassed`
true, and not while the file is being opened nor after an opening that
failed (`docs/specs/steps/popgen2-filters.md`, "The FILTER box"). The owner decided on 7 October
2026 that the filter applies to a `.nei` file with the record; until
then it was left out for every `.nei` file, since under popnei 0.2.1
the page could not tell the two kinds apart.

**The filters that apply to the file**, `filtersApplied(p)`: the
filters on, without `passed` when the variants of the project's file do
not record their FILTER, `keepsPassed(p.variants)` false, and
`p.filters` itself, the same array, otherwise. It is the one place that
leaves `passed` out by the file: `jobFilters`, which turns the filters
of the project into those of a job, takes the filters it is given and
filters nothing by file, so a caller gives it `filtersApplied(p)`, never
`p.filters`. A new file keeps the filters of the project (`loadVariants`,
below), so a user who had the box on for a VCF and opens a `.nei` file
without the record still has the filter in the project. So everything that reads
the filters applied reads `filtersApplied` and never `p.filters`: the
keys (`docs/specs/core/keys.md`), the filters of every job and of the
writing, through `jobFilters(filtersApplied(p))`, the rows and the check
numbers of the counts of each filter, the scripts, and the words that
name the filters on. Opening a file with the record again gives the
filter back, since it never left the project. What reads `p.filters` as it is: the commands,
the validation, the project file, which saves the box as the user left
it, and the screen that shows the box. With no variants file,
`filtersApplied` gives `p.filters`; nothing is calculated then.

**A threshold, on or off.** The thresholds of `popgen2.html` are five:
the missing rate, the major allele frequency and the observed
heterozygosity of the variants, and the missing rate and the observed
heterozygosity of the individuals; the expected heterozygosity has
none, since popnei has no filter on it. Each keeps the variants or the
individuals at most its number. `setThreshold(p, threshold, value)` is
the one command the page sends for any of them, whether the number was
typed, dragged or moved with the keys:

- a number from 0 to below 1 sets the filter on at that number, as
  `setVariantFilter` or `setIndividualFilter` would;
- `null`, the box emptied, and 1, the value at which a maximum keeps
  everything, turn the filter off, as `turnOffVariantFilter` or
  `turnOffIndividualFilter` would: it is kept in `filtersOff` or
  `individualFiltersOff` with the value it had while on, not with 1,
  and a threshold that is off already gives `p` itself.

1 is taken as off, and not as a filter at 1, however it is reached:
typed, a number the box rounds to 1, a line dragged to the top of an
axis that ends at 1, or the End key on such a line. The owner chose it
on 7 October 2026, because a filter at any value is not the same as no
filter: popnei's filters of the MAF and of the observed heterozygosity
drop a variant with no called genotype at every threshold, and
`individualsKept` drops an individual whose heterozygosity has no
value. Under popnei 0.2.1, on a VCF of three variants of which one has
no called genotype, a MAF filter at 1 keeps two variants, and no filter
keeps three (the design, "When a threshold changes the project"). Every
threshold of the page is a maximum; a minimum, when one comes, is off at
0. A line dragged to the top of an axis that ends below 1 gives the
number at the top, the end of the file's values rounded out, 0.1 for the
missing rate of `panel.nei`, and so a filter at that number: the axis
ends where the values end. The design had a line dragged to 1 as a
filter at 1, so that 1 in the box would have meant a filter in one case
and no filter in the other; the owner decided on 7 October 2026 that 1
is off however it is reached. The option not taken was a check box beside each threshold to turn it
on and off.

The page gives `setThreshold` a number already on the step of its
axis, rounded by `thresholdOnStep` or `variantThresholdOnStep`, so a
number the box shows as 1 is exactly 1. `setThreshold` compares with 1
exactly and rounds nothing itself: 0.9999999999999999, the number just
below 1, is a filter on at it, and 1.0000000000000002, the one just
above, is a defect. A -0 is stored as 0, so that the page never shows
"-0".

`thresholdValue(p, threshold)` gives the number of the threshold while
its filter is on, and `null` while it is off, kept in a list of the
filters off or never turned on. The page reads it before and after a
command to name its step of Undo, which the hint of Undo and Redo and
the status region after an undo say: "changed" from a number to
another, "was turned on" from `null` to a number, "was turned off" from
a number to `null`, and no step when both are the same
(`thresholdChange` of `src/ui/variants/thresholdChange.ts`;
`docs/specs/steps/popgen2-filters.md`). The page shows no notice. The line and the box show it, so that
Undo moves them back. How the page makes one command of a run of
presses of the arrow keys, and of a drag, is the page's
(`docs/designs/stats-filters.md`, "When a threshold changes the
project").

**The first project of `popgen2.html`**, `popgen2FirstProject()` of
`src/core/apps.ts`: an empty project with the filter of the FILTER
column on and the filter of the missing rate of the variants on at 0.1,
`DEFAULT_MAX_MISSING_RATE`, the default of `docs/functionality.md`,
plink's `--geno`, and no other filter, on or off. The four other
thresholds start off, never turned on. Until 7 October 2026 both pages
started from `firstProject("popgen")`, which the old page keeps, with
the missing data filter alone (`docs/specs/entry.md`, "`src/core/apps.ts`").
Every user of the new page starts from this project, and a project file
saved from it will hold `passed`.

### What an analysis needs of every project

Before an analysis looks at what it needs of its own, every one of them
needs a variants file that was read; one that reads the filters of the
variants, `filtersRead.variants` of its definition
(`docs/specs/core/store.md`), needs filters of the variants that popnei
can be given; and one that reads the filters of
individuals needs lists of individuals that popnei will accept.
`projectNeeds` gives the first thing missing of the file, in the words the screen shows beside the Run button, or `null`:

| the project | the reason |
|---|---|
| no variants file | "Load a variants file in the Variants step." |
| the variants file being read | "Reading panel.nei." |
| popnei refused the file | "popnei could not read panel.nei: ‹popnei's message›. Load a variants file in the Variants step." |
| the calculation crashed while it read the file | "panel.nei could not be read: ‹what happened› (**Open 4**). Load it again in the Variants step." |
| the calculations could not start, or the page is out of date | "panel.nei could not be read: ‹what happened› (**Open 4**). Save the project, reload the page, open the project and load panel.nei again." |
| the browser could no longer read the file, `reopenFailed` | "panel.nei could not be read; it may have changed on the disk since it was picked. Load it again in the Variants step." |

The LD filter of the variants has no default distance, as the owner
decided on 28 September 2026 (`docs/specs/steps/variants.md`, "The
filters of the variants"). Turned on, it is in the project with
`maxDist` `null` until the user types a distance, and popnei's
`filterByLd` cannot be given it. `variantFilterNeeds` gives then this
reason, and `null` otherwise, whatever the variants file, since the
filter does not depend on it, and whatever `filtersOff` holds, since a
filter turned off is given to no job:

| the project | the reason |
|---|---|
| the LD filter of the variants on, with no distance | "The LD pruning of the Variants step needs the distance within which variants are compared. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs, or turn off the LD pruning, in the Variants step." |

The words are those of the PCA's own LD filter with no distance
(`pruningDistanceReason` of `docs/specs/analyses/pca.md`), with the end
of the reasons that send the user to another step, and with the name the
Variants step gives the filter, "the LD pruning", as its switch, "Prune
the variants by linkage disequilibrium (LD)", and its Undo do; the owner
decided it on 29 September 2026 (stop A 1 of
`docs/specs/stage-4-open-points.md`), where the reason said "the LD
filter of the Variants step" and "turn off the LD filter". The store locks with
it, after `projectNeeds` and `individualListNeeds`, what reads
the filters of the variants: the Count, the diversity and the writing
of the filtered variants. The PCA, whose filters can be its own, is
locked with the same reason by its own `needs`, and only while its LD
filter follows the Variants step (`docs/specs/analyses/pca.md`, "Why it
cannot run"). The statistics of each individual,
which read no filter, and the histograms of the variants, which read
the filters of individuals alone, stay unlocked, so that the user can
look at the data while choosing the distance. The Variants step shows the reason under
the field of the distance, without the end "in the Variants step", as
it shows the reasons of the lists, and beside the Count and the Write a
short line that points to it (`docs/specs/steps/variants.md`, "Its
words").

What reads only the filters of individuals, the histograms of the
variants, is not locked by it, from 28 September 2026. Until then it
was, although the LD filter is not among what it reads, because a
threshold on the individuals keeps those whose statistics are at most
it, and the statistics of each individual read the filters of the
variants and were locked by this reason: an analysis that read only the
filters of individuals would then have been `ready`, and its Run would
have waited for statistics the store could not send, which `startRun`
of `src/core/store.ts` treats as a defect and throws. The statistics
now read no filter, so the store can always send them when a variants
file is read (`docs/specs/core/store.md`, "The state of an analysis").

The option not taken was to keep the filter out of the project until a
distance is typed, the switch on and the field empty as state of the
step alone. The step would then show a filter on that no analysis
applies: the diversity could run, and a project be saved, with the
switch on and no pruning made, and an Undo, which the step does not
see, would leave the switch on over a project without the filter. Held
in the project, turning the filter on is a command and a step of Undo,
as for every other filter of the step, the project file keeps it, and
the lock says in words why nothing that reads the filters runs.

Once the file is read, `individualListNeeds` gives the first list of
individuals that popnei would refuse, with which of the two lists it is
about, `keep` or `remove`, so that the Variants step puts the reason
beside that list; or `null`, and `null` too while `projectNeeds` gives a
reason, since a list is checked against the individuals of the file.
The store locks with it only what reads the filters of individuals: the
analyses whose `filtersRead.individuals` is true, the diversity, the
PCA, and, from 28 September 2026, the Count and the histograms of the
variants, which count over the individuals kept; and the writing of the
filtered variants. The statistics of each individual read no filter and
stay unlocked with a list popnei would refuse, so that the user can
still look at them while correcting the list.

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
| the worker crashed while it read the file, or failed by a defect of our code (**Open 4**, closed) | "pops.csv could not be read: the reading of the file stopped unexpectedly. Load it again in the Individuals step. If it happens again with this file, save it again from Excel as .xlsx or as CSV." |
| the worker could not start, or the page is out of date | "pops.csv could not be read: ‹what happened› (**Open 4**). Save the project, reload the page, open the project and load pops.csv again." |
| individuals of the variants missing from it | "12 individuals of panel.nei are not in pops.csv: ind_031, ind_044 and 10 more. Add them to the file and load it again in the Individuals step." |

The words after "could not be read:" of a refusal of the reader are
those of the reader's spec, `docs/specs/worker/individuals.md`, "The
refusals and their words", one for each kind of `IndividualsFileError`,
thirteen in stage 2 and twenty-one from stage 4, which settles the words of
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
picked"; "it is not a text file; if it is an Excel workbook, open it in
Excel and save it as Excel Workbook (.xlsx)", as the owner decided on
29 September 2026 (stop B 5 of `docs/specs/stage-4-open-points.md`),
where stage 2 said "in Excel, save the sheet as CSV" and the specs of
stage 4 "give it a name that ends in .xlsx", after which a workbook of
Excel 97–2003 was refused again as one; "it
is a variants file, which the Variants step takes"; "it ends in the
middle of a character and may have been cut short"; and the message of
the files wasm for `files`, until stage 4. From stage 4 the reader's spec gives the
words of the kinds of an xlsx, `notXlsx`, `oldExcel`, `encrypted`,
`emptySheet`, `cellError`, `headerError`, `sheetTooLarge`, `xlsxReaderNotLoaded` and
`files`, and, for a source whose `csv` is `null`, those of
`emptyIndividual` and `unnamedColumn` with the row and the column of the
sheet as Excel names them, "row 7 has no name of an individual in its
first column" and "column D has values but no name in the header",
which `project.ts` writes so. From 9 October 2026 the place of
`emptyIndividual` and `unnamedColumn` is written as Excel names it when
the failed read's `format` is `"xlsx"`, and as an editor does otherwise,
whatever the `csv` of the source, since every new load has options of a
CSV; `notXlsx` goes, `notWorkbook` comes, `xlsxReaderNotLoaded` is
`readerNotLoaded`, and the words of `notText` and `oldExcel` change, as
the reader's spec gives them (`docs/specs/worker/individuals.md`, "The
refusals and their words"). A separator is named as the
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
| refused by the reader, `readerNotLoaded`, the files wasm not downloaded, for any file from 9 October 2026 | "pops.csv could not be read: the part of the application that reads tables could not be downloaded; check the connection and load the file again; if it fails again, the site may have been updated since this page was opened: save the project, reload the page and open the project again.", with no end, since its words say what to do; the same beside a Run button |
| refused by the reader, any other kind, or by the files wasm | "pops.csv could not be read: it has no row of individuals. Load a corrected file." |
| its read stopped by a crash of the light worker, or by a defect of our code (**Open 4**, closed) | "pops.csv could not be read: the reading of the file stopped unexpectedly. If it happens again with this file, save it again from Excel as .xlsx or as CSV." |
| the light worker could not start, or the page is out of date | "pops.csv could not be read: ‹what happened› (**Open 4**). Save the project, reload the page, open the project and choose pops.csv again." |

The words of a crash are the owner's, on 29 September 2026 (**Open 4**,
closed); beside a Run button they take "Load it again in the
Individuals step." before their last sentence, the writer's, since the
Run button has no file picker beside it. The ends of the rows of
`variantsFile` and `unreadable` are the writer's, of 25 September 2026,
and that of `notGiven` the writers' of stage 4,
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
of the variants file, and what the analysis's own key holds; two of
them, for a file whose variants record whether they passed their FILTER
and for one whose variants do not, since the file does not say which
its file is (`docs/specs/core/keys.md`, "The fingerprint of the
settings"). After a
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
they are made here, by five functions that all of them share, and not
in the module of the diversity, where the walking skeleton put them;
its report noted that the next analysis to need them would touch that
module, and the PCA is that analysis. The Individuals step and the
shell read the same five. The option not taken was a module of their
own in core, which would be a new row of section 9 of
`docs/architecture.md` for five functions that read the project alone,
beside `individualsCheck`, which is here and which they follow.

The populations are of one of two kinds:

- **By a column**, with the grouping `{ kind: "populations", column }`
  and a metadata file read that has a column of that name, other than
  its first. A population
  is named by the text of its cell, whatever the type of the column; a
  number or a boolean of an xlsx is written as `String` writes it,
  `1.5`, `true`, so that a number 1 and a text `1` of one column are one
  population, as they are one value for the types (below). From 9
  October 2026 a number is written with the decimal mark of the read,
  `found.decimal`, or the point for an xlsx and a read with no `found`,
  `1,5` for a CSV read with the comma, as `cellShown` writes it (below,
  "The counts per population on popgen2.html"), so that a population of
  a column of decimals keeps the name it had with the reader of
  TypeScript. Other names of a CSV do change, since table_io makes
  numbers and booleans of its numeric and boolean columns: in such a
  column `01`, `1` and `1,0` are the one population `1`, `+007` is `7`,
  `1e3` is `1000`, and `TRUE` and `True` are the one population `true`,
  where they were populations of their own. A column of text, the usual
  column of populations, keeps its names as written. An
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

The first column, the names of the individuals, is never the column of
the populations: a grouping whose column is read as the first of the
table, as when a new file puts the column chosen first, is as a column
the table does not have, and gives `noSuchColumn` (below). Grouped by
it, every individual would be a population of one, while the select of
the Individuals step, which does not offer the first column, showed
"Choose a column". Found by the review of work package 5 of
`docs/plans/individuals-pca.md` on 29 September 2026.

`populationsOf(p)` gives the populations as a key holds them, from the
project alone: those of the column, each with every individual of the
table that has it, including those not in the variants file; or
`"all"` for the one population, whose individuals are those of the load
of the variants file, which every key holds already, so that no key
reads `p.variants` (`docs/specs/core/keys.md`); or `null` when neither
can be given yet: a file not read, no column chosen, or no column of
that name but the first. `populationsToRun(p)` narrows them to the individuals of the
variants file and drops the populations left empty, since popnei refuses
a population that names an individual it does not have and an empty
one; for `"all"` it gives `[["All individuals", every individual of the
variants file, in its order]]`. `populationsKept(p, kept)` narrows those
to the individuals the filters of individuals keep, and gives apart the
populations the list leaves empty, which are not sent and are named on
the screen (`docs/specs/core/individualsKept.md`).
`populationsBeforeRun(p, kept)` gives the populations as they are known
before a Run, from the individuals kept of `individualsKept`:
`populationsKept` with its list when the list is known, and, while a
threshold on the individuals waits for the statistics of each
individual, with `byLists`, the individuals the lists to keep and to
remove keep, since the thresholds can only remove more; for the one
population, "All individuals" narrowed to the individuals kept in the
same way. The ready state of the panel of an analysis and the summary
line of the shell both list the populations through it, so the two
never disagree. `populationsNeeds(p)`
gives the reasons about the column, each with its kind, so that the
stepper of the shell, the Individuals step and the panel of every
analysis show one text for one condition:

| the project | its kind | the reason |
|---|---|---|
| a file read, and no column chosen | `noColumn` | "Choose the column that defines the populations, or all individuals in one population, in the Individuals step." |
| no column of that name in the table, or only its first column, after a new load of the file | `noSuchColumn` | "pops.csv has no column popcat, from which the populations were taken. Choose the column that defines the populations, or all individuals in one population, in the Individuals step." |
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
population is looked for until it is. The five give `null` for a
project of association, which has roles and no populations.

**What the analyses per population share from stage 5.** Three
analyses read the populations in stage 5, the diversity, the distances
between populations and the LD decay, and they lock and name the
populations alike, so the functions that do it are specified here, where the
diversity's module had them alone until stage 4; the option not taken
was each analysis importing the diversity's module, which would tie the
three to one of them.

They are in a module of their own, `src/core/populations.ts`, as the
owner decided on 1 October 2026
(`docs/specs/stage-5-open-points.md`, "Decided by the owner on 1 October
2026: the distances, the heatmap and what the analyses share"). Until
then they were in `project.ts`, and `populationListsNeeds` needs the
function `individualsKept` of `individualsKept.ts`, a module that
imports `project.ts`: the two modules imported each other. Every name
that crossed was a function, so nothing broke, and a constant added at
the top of either module and made with a function of the other could
have stopped the page at load, which the review of the plan showed on a
scratch copy. `populations.ts` imports `project.ts` and
`individualsKept.ts`, and neither imports it; `project.ts` imports
`individualsKept.ts` for its types alone.

- **The lists of individuals leaving no individual with a
  population**, `populationListsNeeds(p)`: the diversity's reason of
  stage 3, known from the project alone, "The lists of individuals to
  keep and to remove leave none of the individuals of panel.nei that
  have a population in popcat, so no population is left. Change the
  lists in the Variants step."; `null` for the one population, whose
  lists that leave nobody the store locks first with the words of
  `keptNoneReason` (`docs/specs/core/individualsKept.md`).
- **The individuals kept leaving no population**,
  `populationsKeptNeeds(p, kept)`, which each of the three gives as its
  `keptNeeds` or as the first reason of it, in the words the owner
  decided at stop B on 27 September 2026, "The 34 individuals kept have
  no population in popcat, so none of the 2 populations has an
  individual left. Loosen the filters of individuals in the Variants
  step to keep them.", with the forms of one individual kept and of one
  population of `docs/specs/analyses/diversity.md`, "Why it cannot run";
  `null` while the list is not known, when it keeps some population, and
  for the one population.
- **The populations under the minimum of individuals**,
  `populationsWithMinimum(pops, minNumIndividuals)`, which splits
  populations, as `populationsKept` or `populationsBeforeRun` give them,
  into those with at least that many individuals and those with fewer,
  each in the order of `pops`, the second with their counts. A
  population with fewer individuals than the minimum reaches it at no
  variant, since the minimum counts the individuals called there, so it
  has no value in any statistic of popnei that tests it. The diversity
  leaves it out of its call of `calcPopDiversity`, where it would take
  every variant out of the private alleles of the others, and keeps it
  in its table with no values, as the owner decided on 30 September
  2026 (decision 7 of `docs/specs/stage-5-open-points.md`); the
  distances between populations leave it out of their request, where
  every pair it is in would have no value and stop the order of the
  heatmap, as the owner decided on 30 September 2026 (`popDists.md`,
  "Open points"; point 13 of `docs/specs/stage-5-open-points.md`). Both find it with this function, so the two never disagree on
  which populations are under the minimum. The LD decay has no minimum
  of individuals and does not call it.
- **The words of the populations under the minimum before a Run**,
  `underMinimumText(under, minNumIndividuals, consequence)`, which the
  ready state of both panels shows under the populations it lists:
  "p3 has 12 individuals, fewer than the minimum of 20, ‹consequence›",
  and, of two or three, "p3 and p5 have 12 and 8 individuals, fewer than
  the minimum of 20, ‹consequence›", named as `namesOf` names them,
  with no counts past three. The form of two or three is the owner's
  decision of 1 October 2026; until then it read "p3 and p5 have fewer
  individuals than the minimum of 20, 12 and 8, ‹consequence›", in which
  the three numbers read as three minimums. Each analysis gives its consequence, of one
  population and of several: the distances "and is left out." and "and
  are left out."; the diversity "so it will have no values, and is left
  out of the count of the private alleles of the others." and "so they
  will have no values, and are left out of the count of the private
  alleles of the others." Past three populations the counts are left
  out: "p3, p5 and 2 more have fewer individuals than the minimum of 20,
  and are left out."
- **Four helpers** the analyses and their panels call, exported beside
  them since stage 5 and listed here from 1 October 2026:
  `populationsColumnOf(p)`, the column the populations are taken from,
  or `null` for the one population and for a project of association;
  `populationsByLists(p)`, the populations the lists of individuals to
  keep and to remove leave, known from the project alone, with which an
  analysis locks before the statistics of each individual are known;
  `allEmptiedText(numKept, column, emptied)`, the words of
  `populationsKeptNeeds`, which the LD decay gives too for the
  populations of its own request; and `loosenText(one)`, "Loosen the
  filters of individuals in the Variants step to keep it.", or "…them.",
  which ends those words and the line of the ready state that names the
  populations left empty.

### The counts per population on popgen2.html

From 9 October 2026, for `docs/designs/input-page.md`, approved by the
owner that day, and the screen `docs/specs/steps/popgen2-input.md`. On
`popgen2.html` an individual of the variants file with no population is
**unclassified**: with no individuals file, with no column chosen, with
its cell of the column missing, or when the individuals file does not
have it. It is not an error there, and `individualsNeeds`, which
`popgen.html` keeps, is never called by that page. Three functions give
what its box of the individuals file shows, in `src/core/populations.ts`
beside the functions of the populations of stage 5, since the counts
need `individualsKept`, which imports `project.ts`:

- **The counts**, `populationCounts(p, kept)`: before the variants file
  is read, the column, its number of different values and whether they
  are too many, with no population and nothing else counted, since the
  box warns of too many values as soon as the individuals file is read;
  once it is read, for each population of
  the column chosen with an individual in both files, in the order of
  `populationsToRun`, its individuals kept, from `populationsKept(p,
  list)` with the list of `kept` when it is known, its `emptied`
  populations given 0, so that a population the filters empty keeps its
  row; or, while the list is not known, a threshold of the individuals
  on and the one pass not finished, `null` for each. The unclassified
  kept, with how many of them have a missing cell in the column and the
  names of those not in the individuals file, kept, in the order of the
  variants file, `null` while the list is not known. Those not in the individuals file, all of them, before the
  filters, in the order of the variants file, `individualsCheck(p).missing`,
  or every individual of the variants file without a file read. The rows
  of the individuals file whose individual the variants file does not
  have, `individualsCheck(p).ignoredRows`. Whether none of the
  individuals of the variants file is in the individuals file, with the
  first name of each, for the warning. And the number of different
  values of the column, the cells that are not missing compared by
  `cellShown`, counted over every row of the file; above
  `MAX_LISTED_POPULATIONS`, 20, the owner's bound of 9 October 2026
  (answer 5 of the design), no population is given, `tooMany` is true,
  and the unclassified are not counted. `kept` is `null` exactly when the
  variants file is not read.
- **The column chosen by the page**, `defaultPopulationsColumn(read)`:
  the first column after the names one of whose cells is a text and
  whose different values, compared by `cellShown`, are 1 to
  `MAX_LISTED_POPULATIONS`; `null` when none is. A column is text for
  table_io when one of its values is not a number nor a boolean, and the
  light worker makes every value of its other columns a number or a
  boolean, but for an integer column with a value beyond 2^53, which it
  keeps as texts (`docs/specs/worker/individuals.md`, "The read by
  table_io"). So for a table read since 9 October 2026 this is table_io's
  type text; for a table read before, every cell of a CSV a text, it is
  the first column of 1 to 20 values. The entry of `popgen2.html` sends
  it (`docs/specs/entry.md`, "The column of the populations on
  popgen2.html").
- **The words of the box**, `individualsBoxNeeds(p)`: the reason the box
  shows in place of the list and the counts, for a file being read or
  that could not be read, in the words of `individualsStepNeeds` but for
  their ends, which are this page's: "panel_pops.csv could not be read: "
  and the words of the reader's spec after the colon, then
  "Choose another separator under the tab Individuals file, or open a
  corrected file." for `raggedRow` and `unclosedQuote`; for
  `variantsFile`, "it is a variants file; open it with Open variants
  file in the box Variants file." in place of the reader's words; for
  `tooLarge`, "it is 312.4 MB, more than the 20 MB an individuals file
  can have; check that it is the individuals file and not the variants
  file."; for `readerNotLoaded`, "the part of the page that reads tables
  could not be downloaded. Check the connection and open the file
  again."; for a failure of the worker, by the kind of its `RunError`:
  a crash or a defect, "the page stopped while it read it. Open the file
  again.", and a worker that could not start or a page of another build
  than its workers, `couldNotStart` and `protocolMismatch`, "the page
  could not start the part that reads files. Reload the page and open
  the file again.", since the client answers every later read the same
  way; for `unreadable`, the reader's words and "Open it again."; for
  `files`, `oldExcel`, `encrypted`, `emptySheet`, `cellError`,
  `headerError` and `sheetTooLarge`, whose words already say what to do
  in Excel, the words and "Then open it again."; and "Open a corrected
  file." after every other refusal. "Reading panel_pops.csv." while it is read. `null` with
  no file or a file read. A `notGiven` file cannot be on that page,
  which opens no project file, and is a defect there, thrown.

The cell as the screens show it, `cellShown(cell, decimal)`, is the
text of a cell with numbers written with the decimal mark of the read: a
text as it is; a number as `String` writes it, its point made `decimal`;
`true` and `false`; `null` for a missing cell. The names of the
populations use it (above, "The populations"), and so do the table of
the file on `popgen2.html` and the different values of a column, so
that the box, the table and the populations never write one value two
ways. The types of the columns keep `cellText`, `String` alone, whose
texts the project's binary types hold.

The rules of the counts against what a reader would expect:

- **The same object.** The store works out the individuals kept again
  at every change of the project (`keptFor` of `src/core/store.ts`), and
  `individualsKept` makes a new list each time, not frozen, so the memo
  of `populationsKept`, which keeps only frozen lists, keeps none of
  them, and a key of the list by its reference would miss at every press
  of an arrow key on a threshold. So `populationCounts` keeps its last
  answer with what it was made from, and gives it again when the table,
  the column and the read of the variants file are the same objects and
  the new list holds the same individuals in the same order, compared
  one by one, a walk of at most the individuals of the file, or is
  unknown, or removes nobody, as the last; otherwise it counts again. A
  progress of the one pass, which leaves the project as it is, gives the
  same object at no cost.
- With no threshold of the individuals on, `individualsKept` gives the
  list as known, removing nobody, with no statistics, so the counts are
  known as soon as both files are read, the one pass running or not.
- No filter of the variants changes a count, since none removes an
  individual.
- A population whose every individual of the file is outside the
  variants file has no row; its rows are among `rowsNotInVariants`.
- With no column chosen, or a column the table does not have, no
  population is given and every individual kept is unclassified, none
  counted as with a missing cell or not in the file.
- With a file read and none of its individuals in the variants file,
  `noneInFile` is true and the names are `firstOfVariants`, the first
  individual of the variants file, and `firstOfFile`, the first row of
  the table.

```ts
/** The most different values of a column whose populations the box
    of popgen2.html counts; the owner's bound of 9 October 2026. */
export const MAX_LISTED_POPULATIONS = 20;

/** The text of a cell as the screens show it, numbers with `decimal`;
    null for a missing cell. In src/core/project.ts. */
export function cellShown(cell: Cell, decimal: "." | ","): string | null;

/** A population and its individuals kept, or null while the list of the
    individuals kept is not known. */
export interface PopulationCount {
  pop: string;
  kept: number | null;
}

export interface PopulationCounts {
  /** The column the populations are taken from, a column of the table,
      or null: no file read, no column chosen, or none of that name. */
  column: string | null;
  /** The different values of the column in the file; 0 with no column. */
  numValues: number;
  /** numValues above MAX_LISTED_POPULATIONS: populations empty, the
      unclassified not counted. */
  tooMany: boolean;
  /** Whether the variants file is read; with false, populations and
      notInFile are empty and unclassified, rowsNotInVariants and
      noneInFile null. */
  variantsRead: boolean;
  /** Whether the list of the individuals kept is known; false before
      the variants file is read. */
  known: boolean;
  /** The populations with an individual in both files, in their order. */
  populations: PopulationCount[];
  /** The unclassified kept, and how many of them for each cause; null
      while the list is not known, and with tooMany. */
  unclassified: { kept: number; missingCell: number;
    notInFile: string[] } | null;   // the kept not in the file, in the order of the variants file
  /** The individuals of the variants file not in the individuals file,
      before the filters, in the order of the variants file; every one
      with no file read. */
  notInFile: string[];
  /** The rows of the individuals file whose individual the variants file
      does not have; null with no file read. */
  rowsNotInVariants: number | null;
  /** A file read none of whose individuals is in the variants file, with
      the first name of each; null otherwise. */
  noneInFile: { firstOfVariants: string; firstOfFile: string } | null;
}

/** The counts of the box of popgen2.html; null with no individuals file
    read. The same frozen object as the call before for the same table,
    column and read of the variants file, and a list of the individuals
    kept that holds the same individuals, compared one by one, or is
    unknown both times; see below. In src/core/populations.ts. */
export function populationCounts(p: Project, kept: IndividualsKept | null): PopulationCounts | null;

/** The first column after the names with a text cell and 1 to
    MAX_LISTED_POPULATIONS different values, or null. */
export function defaultPopulationsColumn(read: TableRead): string | null;

/** The reason of the box of the individuals file of popgen2.html, in
    place of its list and counts, or null with no file or a file read.
    Throws a defect for a file notGiven. */
export function individualsBoxNeeds(p: Project): string | null;
```

How it is verified, with Vitest, at the three functions, on projects
made in the test with `panel.nei`'s 200 individuals and the table of
`panel_pops.csv`, as `src/core/fixtures/` holds them: `popcat` gives p0
48, p2 84, p1 68, in the order each first appears in the file, the unclassified 0, 0 with a missing cell and none
not in the file, `rowsNotInVariants`
0; the table without 7 rows gives those 7 in `notInFile`, in the order
of `panel.nei`, and the unclassified kept 7, the 7 names not in the file; 3 cells
of `popcat` made `null` give 3 with a missing cell; the names of the
table made `S000` give `noneInFile` with `s000` and `S000`; a column of
21 values gives `tooMany` and no population; with a threshold of the
individuals on and no statistics, `known` false and each count `null`;
with the statistics of `panel.nei`'s one pass and the missing rate at
0.1, each count equal to the length of the population of
`populationsKept` with the list of `individualsKept`, a population
emptied at 0; a threshold of the variants changed gives the same object;
the same inputs twice, the same object by `===`. At
`defaultPopulationsColumn`: `popcat` for `panel_pops.csv`, `popcat` and
not `altitude`, numbers, for `panel_meta.csv`, `pop`, two values, for
`ld_pops.csv`, `Población` for the table of `excel_en.xlsx`, `null` for
a table of numbers alone and for one whose only text column has 21
values. At `cellShown`: 1.5 with the comma `"1,5"`, with the point
`"1.5"`, `true` `"true"`, `"001"` `"001"`, `null` `null`. At
`individualsBoxNeeds`: each row of the screen spec's words.

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
the name of their column, where the new values allow them, as was
recommended to the owner on 27 September 2026 and as the owner decided
on 28 September 2026 (`docs/specs/stage-4-open-points.md`, point 6). `loadIndividuals` copies
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

Two more things the Individuals step shows of each column walk the
table, and core gives them so that each is walked once and not at every
drawing of the step, after every change of the store
(`.claude/skills/coding/react.md`, "Reading core"): the warning of a
column of few whole numbers, and its first values. `columnWarningsOf(read)`
gives the warnings of `columnWarnings` of the reader
(`docs/specs/worker/individuals.md`, "The types of the columns") for
the table, the types and the decimal mark of the read, the same as that
function gives. What walks the table, the whole numbers of each column,
does not depend on the types, so it is kept by the table and the decimal
mark, for every column but the first as if it were continuous, and the
warnings are those of the columns the read types continuous: a change of
a type walks no column again, and a column set categorical loses its
warning. `firstValues(table)` gives the first three distinct values of
each column that are not missing, as `String` writes them, in the order
of the file, kept by the table. While the step worked them out at each
drawing, a change of a type on a table of 10,000 rows and 50 columns
held the page for 104 to 131 ms, in Chromium and WebKit on the owner's
Mac, as the review of work package 5 of
`docs/plans/individuals-pca.md` measured on 28 September 2026. Added on
29 September 2026 after that review.

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
import type { IndividualsKept } from "./individualsKept.ts";
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
  filters: ProjectVariantFilter[];          // on: passed, missing_data, obs_het, maf, ld
  filtersOff: ProjectVariantFilter[];       // turned off, with their values; the same order
  individualFilters: IndividualFilter[];    // on: keep, remove, missing_data, obs_het
  individualFiltersOff: IndividualThreshold[]; // turned off, with their values: missing_data, obs_het
  individuals: IndividualsSource | null;
  grouping: Grouping;
  analyses: AnalysisOptions[];              // one per analysis the user set
  reference: Reference | null;              // from an opened project file
}

/** A filter of the variants as the project holds it: a VariantFilter of
    protocol.ts, but that the LD filter's distance is null from the
    moment its switch is turned on until the user types one. A job never
    carries a null distance (jobFilters, below). */
export type ProjectVariantFilter =
  | Exclude<VariantFilter, { kind: "ld" }>
  | { readonly kind: "ld"; readonly maxAllowedR2: number; readonly maxDist: number | null };

/** A filter of individuals that has a switch in the Variants step, and
    so can be turned off and kept: a threshold, not a list. */
export type IndividualThreshold = Extract<IndividualFilter, { kind: "missing_data" | "obs_het" }>;
```

`filtersOff` and `individualFiltersOff` hold the filters the user turned
off, with the values they had, for the switch that turns them on again
(above, "The filters turned off"). No kind is in both a list of filters
on and its list of filters off, and each is in the fixed order of its
kinds.

The variants file. The load id is 16 random bytes written as 32 lower
case hexadecimal digits, made by the page when the user picks the file
(`docs/architecture.md`, section 3). The ploidy of a VCF is a whole
number from 1 to 255, which popnei's `openVcf` accepts
(`js/popnei/src/io_vcf.ts`), or `null`, for the ploidy popnei reads
from the file, the number of alleles of its first genotype with
alleles, since its release `js-v0.2.0`. popgen2.html opens every VCF with
`null` (`docs/plans/open-variants.md`, "Round 3"); the Variants step of
popgen.html always gives one; and a project file refuses `null`, until
the piece that saves the projects of popgen2.html decides how a ploidy
read from the file is saved.

```ts
export interface VariantSource {
  fileId: string;
  name: string;          // as the browser gives it; in no key
  size: number;          // bytes; in no key
  format: "vcf" | "nei";
  readOptions: { ploidy: number | null; onlyPassed: boolean } | null; // a VCF's; null for .nei
  read: SourceRead;
}

export type SourceRead =
  | { kind: "pending" }
  | { kind: "read"; individuals: string[]; ploidy: number; numVars: number | null;
      keepsPassed: boolean }  // whether its variants record whether they passed their FILTER, popnei's Variants.keepsPassed
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
  csv: CsvOptions | null;          // set for every load from 9 October 2026; null for an xlsx of a project saved before
  typesSet: ColumnTypeOf[];        // the types the user set, by column, applied or not; never identifier
  read: IndividualsRead;
}

export type IndividualsRead =
  | { kind: "pending" }
  | { kind: "read"; table: IndividualsTable; columns: ColumnType[];
      found: CsvFound | null }
  | { kind: "failed"; error: IndividualsFileError | { kind: "worker"; error: Exclude<RunError, { kind: "files" }> };
      format: "text" | "xlsx" | null }  // from 9 October 2026: as the reader found it; null for a failure of the worker
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
  settings: CheckSettings;     // the fingerprints of its settings in the file; never saved
}

export interface CheckSettings {
  passedKept: string;          // for a file whose variants record their FILTER
  passedNotKept: string;       // for a file whose variants do not
}
```

The reference holds no versions of its own: the header of the project
file has the versions of the save, which the project does not keep, and
each check the versions of its numbers.

A new, empty project of one application.

```ts
export function emptyProject(app: AppId): Project;
// { app, variants: null, filters: [], filtersOff: [], individualFilters: [],
//   individualFiltersOff: [], individuals: null,
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
export const VARIANT_FILTER_ORDER: readonly VariantFilterKind[]; // passed, missing_data, obs_het, maf, ld
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

/** A threshold of popgen2.html: a filter of one number, a maximum. */
export type Threshold =
  | { readonly of: "variants"; readonly kind: "missing_data" | "maf" | "obs_het" }
  | { readonly of: "individuals"; readonly kind: IndividualThreshold["kind"] };

/** Sets the threshold on at `value`; or, for null, an empty box, and for
    1, at which a maximum keeps everything, turns it off, kept with the
    value it had. The one command of a threshold of popgen2.html. */
export function setThreshold(p: Project, threshold: Threshold, value: number | null): Project;
/** The value of the threshold while its filter is on; null while it is off. */
export function thresholdValue(p: Project, threshold: Threshold): number | null;

/** Sets the filter of its kind on, in the fixed order of the kinds, and
    drops the one of its kind from filtersOff. */
export function setVariantFilter(p: Project, filter: ProjectVariantFilter): Project;
/** Turns the filter of that kind off: it leaves filters and is kept, with
    its values, in filtersOff, in the fixed order. filtersOff holds no
    filter of its kind then, since turning one on took it out, and one
    there is a defect. */
export function turnOffVariantFilter(p: Project, kind: VariantFilterKind): Project;

/** Sets the filter of its kind on, in the fixed order of the kinds; a
    threshold drops the one of its kind from individualFiltersOff. */
export function setIndividualFilter(p: Project, filter: IndividualFilter): Project;
/** Removes a list of individuals, which is not kept. */
export function removeIndividualFilter(p: Project, kind: "keep" | "remove"): Project;
/** Turns a threshold off: it is kept, with its value, in individualFiltersOff. */
export function turnOffIndividualFilter(p: Project, kind: IndividualThreshold["kind"]): Project;

/** Puts a new load of the individuals file, pending; from 9 October 2026
    every page gives `csv`, AUTO_CSV for a new file, an xlsx too, since
    the reader finds the format from the bytes; null stays accepted. */
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
| `turnOffVariantFilter`, `removeIndividualFilter`, `turnOffIndividualFilter` | no filter of that kind on | `p` itself, whatever the list of the filters off holds |
| `setThreshold` | a number from 0 to below 1 | what `setVariantFilter` or `setIndividualFilter` gives for the filter of that kind at that number |
| `setThreshold` | `null` or 1 | what `turnOffVariantFilter` or `turnOffIndividualFilter` gives for that kind: the filter in its list of the filters off with the value it had, or `p` itself when it is off already |
| `setThreshold` | -0 | the filter on at 0 |
| `setThreshold` | a number below 0 or above 1, or not finite | a defect |
| `setVariantFilter`, `setIndividualFilter` | a filter of a kind kept off, with the values kept or others | the filter on in its place, and the kind gone from the list of the filters off; the step sends the values kept, so that the filter comes back as it was |
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
| `loadVariants` | a new load id | the filters, on and off, the individuals file, the grouping, the options and the reference kept |
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

/** The reason of the LD filter of the variants on with no distance, or
    null; the table of the LD filter above. The store locks with it
    what reads the filters of the variants, and nothing else. */
export function variantFilterNeeds(p: Project): string | null;

/** The filters of the variants as a job carries them to popnei:
    `filters` itself, the same array, once every filter has what popnei
    needs. A defect when the LD filter has no distance, which the lock of
    variantFilterNeeds keeps from every job; each analysis and the
    writing build their job's filters with it, from filtersApplied(p).
    It leaves out no filter by the format of the file: that is
    filtersApplied's. */
export function jobFilters(
  filters: readonly ProjectVariantFilter[],
): readonly VariantFilter[];

// The next three are in src/core/filtersApplied.ts, a module that
// imports only the types of project.ts, so that keys.ts, which
// project.ts imports, reads them without a cycle of modules.

/** Whether the variants of the file record whether each passed its
    FILTER: the read's keepsPassed once the file is read; before, or
    when the read failed, true for a VCF and false for a .nei file, for
    the filters applied and the fingerprint of a file not yet read. The
    FILTER box does not read it: it is shown from the read alone. */
export function keepsPassed(source: VariantSource): boolean;

/** The filters of the variants on that apply to the project's variants
    file: p.filters without the filter of the FILTER column, `passed`,
    when keepsPassed(p.variants) is false; p.filters itself, the same
    array, when it is true and for no file. What reads the filters
    applied reads this, never p.filters: the keys, the jobs, through
    jobFilters(filtersApplied(p)), the counts of each filter, the
    scripts and the words. */
export function filtersApplied(p: Project): readonly ProjectVariantFilter[];
/** The same for a file whose variants record their FILTER or not, as
    `keepsPassed` says: `filters` itself when it is true, without
    `passed` when it is false. For the fingerprint of the settings,
    which is given the file it is made for (docs/specs/core/keys.md). */
export function filtersAppliedTo(
  filters: readonly ProjectVariantFilter[],
  keepsPassed: boolean,
): readonly ProjectVariantFilter[];

/** The first list of individuals popnei would refuse, which of the two
    it is and the reason, or null, and null while projectNeeds gives a
    reason; the table of the lists above. The store locks with it only
    what reads the filters of individuals. */
export function individualListNeeds(
  p: Project,
): { readonly list: "keep" | "remove"; readonly reason: string } | null;

/** The reason of the variants file being read or not read, in the words
    of the Variants step, or null for no file or a file read; the table
    of the Variants step above. */
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
    refusal but `files`, which the step's one use, the variants file,
    never meets. */
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

/** The warnings of the columns of few whole numbers of a read, as
    columnWarnings of the reader gives them for its table, its types and
    its decimal mark, found.decimal or "." for an xlsx. The same array for
    the same read; the walk of each column kept by the table and the
    decimal mark, whatever the types. */
export function columnWarningsOf(
  read: Extract<IndividualsRead, { kind: "read" }>,
): readonly ColumnWarning[];

/** The first three distinct values of each column of the table that are
    not missing, as String writes them, in the order of the file; one
    array per column, in the order of the table. The same array for the
    same table. */
export function firstValues(table: IndividualsTable): readonly (readonly string[])[];
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

/** The populations as known before a Run, for the ready state and the
    summary line: populationsKept with the list of `kept` when it is
    known, and with kept.byLists while a threshold waits for the
    statistics of each individual; for the one population, "All
    individuals" narrowed the same way; null when populationsToRun is
    null. `IndividualsKept` is of docs/specs/core/individualsKept.md,
    imported as a type only, since that module imports this one. */
export function populationsBeforeRun(p: Project, kept: IndividualsKept):
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

From stage 5, what the analyses per population share, of "What the
analyses per population share from stage 5" above, in
`src/core/populations.ts`; `LeftOut` is of
`docs/specs/worker/protocol.md`:

```ts
// src/core/populations.ts
/** The reason when the lists to keep and to remove leave no individual
    that has a population, known from the project alone; null for the
    one population, when some population keeps an individual, and when
    the individuals kept cannot be made, which the store locks on first. */
export function populationListsNeeds(p: Project): string | null;

/** The reason when the individuals kept, once known, leave no
    population; null while the list is not known, when some population
    keeps an individual, and for the one population. */
export function populationsKeptNeeds(p: Project, kept: IndividualsKept): string | null;

/** The populations with at least `minNumIndividuals` individuals, and
    those with fewer with their counts, each in the order of `pops`. */
export function populationsWithMinimum(pops: Pops, minNumIndividuals: number):
  { readonly withMinimum: Pops; readonly under: LeftOut };

/** "p3 has 12 individuals, fewer than the minimum of 20, " and the
    consequence of one, or the form of several with theirs; `under` not
    empty. */
export function underMinimumText(
  under: LeftOut,
  minNumIndividuals: number,
  consequence: { readonly one: string; readonly many: string },
): string;

/** The column the populations are taken from; null when no column is
    chosen, for the one population, and for a project of association. */
export function populationsColumnOf(p: Project): string | null;

/** The populations the lists of individuals to keep and to remove
    leave, each with an individual; null when the individuals kept or
    the populations cannot be made. */
export function populationsByLists(p: Project): Pops | null;

/** The words of populationsKeptNeeds: the `numKept` individuals kept
    have no population in `column`, which leaves every population of
    `emptied` empty. */
export function allEmptiedText(
  numKept: number, column: string, emptied: readonly string[],
): string;

/** What to do about populations left empty, of one or of several. */
export function loosenText(one: boolean): string;
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
/** The characters of a value of a file, each as `escaped` writes it, an
    escape as one, so that a text that cuts a value at its own length,
    the legend of the LD decay among them, never cuts inside an escape. */
export function escapedCharacters(value: string): readonly string[];
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
thresholds from 0 to 1, `maxDist` a whole number from 1 to 2^53 − 1, as
popnei accepts, or `null`, a distance not typed yet, which the
`expected` of a wrong one calls nothing, as `parseOrNothing` of
`project.ts` words every value that may be `null`: "a whole number, 1
or more, or nothing"; the
ploidy a whole number from 1 to 255, as popnei accepts; the size of a
variants file and its number of variants whole numbers of at least 0; a
load id of 32 lower case hexadecimal digits; at most one filter of each
kind in each list, and each list in its fixed order, the variants' as
well since stage 3; the same of the two lists of the filters turned
off, `individualFiltersOff` with thresholds alone, and no kind both in
a list of the filters on and in its list of the filters off, which is
refused as `twoFiltersOfAKind` at the path of the one off, while two
filters of one kind in a list of the filters off are refused as
`twoFiltersOfAKind` at the path of the `kind` of the second,
`["filtersOff", 1, "kind"]`, so that the text tells the two apart; the table as the
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
hexadecimal digits; a read of the individuals file `notGiven` with no
other field, or `pending` or `failed` with their fields, which a
project of the page holds and `parseProject` accepts, while
`projectFile.ts` refuses a file that holds one before it calls
`parseProject`, since this version writes them as `notGiven`
(`docs/specs/core/projectFile.md`, rule 8 of the opening); each
separator one of the three a CSV can have; `"utf-16"` among the encodings found; and the
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
- **A project saved before the filters turned off were kept**, by
  stages 2 and 3 or by a development version of stage 4 before 28
  September 2026, has neither `filtersOff` nor `individualFiltersOff`,
  and each is read as empty: such a project opens with the filters it
  had on, and nothing kept of those off, which those versions did not
  keep. The option not taken was to refuse it, as for `typesSet` above.
- **`keepsPassed` is not saved in the project file.** The read of the
  variants file is saved with its individuals, its ploidy and its number
  of variants, as before 7 October 2026, and read back with
  `keepsPassed` `true` for a VCF and `false` for a `.nei` file, what
  `keepsPassed` of a source gives a file not yet read. No file saved
  today holds the filter of the FILTER column, since only `popgen2.html`
  sets it and that page saves no project; a file that holds it is
  compared all the same, since an opened file keeps a fingerprint for
  each answer of `keepsPassed` and the comparison takes the one of the
  file given again once it is read. Saving it would have added a field
  to every project file of `popgen.html`, which a version of the
  application from before it would refuse; the piece that makes
  `popgen2.html` save projects decides how its files hold it (below,
  "Not in this spec"). The identity of the
  file given again, which the reference is compared with
  (`docs/specs/core/projectFile.md`), does not compare it.
- **The filter of the FILTER column** is `{ "kind": "passed" }`, with no
  other field; a field more is refused as below, `unknownField`. The
  validation reads it in both pages; `popgen.html` refuses it after the
  validation, in `readProjectFile` (`docs/specs/core/projectFile.md`).
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
    missing genotypes, and a project has at most one of each kind"; and,
    when one is on and the other off: "it has the filter of the variants
    by missing genotypes both on and turned off, and a filter is one or
    the other"; and, when both are off: "it has two filters of the
    variants turned off by missing genotypes, and a project has at most
    one of each kind";
  - the filters of the individuals out of their order: "the filters of the
    individuals should be in the order individuals to keep, individuals to
    remove, missing genotypes, observed heterozygosity, and the second one
    is out of that order";
  - the filters of the variants out of their order: "the filters of the
    variants should be in the order the FILTER column, missing
    genotypes, observed heterozygosity, major allele frequency, linkage
    disequilibrium, and the second one is out of that order", the FILTER
    column first since 7 October 2026; the filter of the FILTER column is
    named "the FILTER column" in every text, "it has two filters of the
    variants by the FILTER column, …", and its words in
    `FILTER_KIND_WORDS` are "the FILTER column". A project file of version 1
    whose filters of the variants are in another order, which the
    application of stage 2 could not write, since it had the missing data
    filter alone, is refused so (`docs/architecture.md`, section 2);
    the lists of the filters turned off in the same words, with "turned
    off" after "the filters of the variants" or "of the individuals",
    the thresholds of the individuals in the order missing genotypes,
    observed heterozygosity;
  - a value repeated: "the second analysis repeats the analysis
    diversity";
  - a table that does not agree with its types: "the type of the second
    column of the individuals file cannot be identifier: only the first
    column can have that type"; "the type of the third column of the
    individuals file cannot be continuous: its values are not all
    numbers"; and, of the new field of stage 4, named "the types set by
    the user", "the first of the types set by the user names the column
    height, whose values allow the type set, but that column has another
    type", since a type set for a column the file does not have is not
    refused but waits (`typesLost`); and, of the two
    lists of the filters off, named "the filters of the variants turned
    off" and "the filters of the individuals turned off", "the threshold
    of the first filter of the variants turned off should be a number
    from 0 to 1".

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
- **The LD filter turned on, then its distance typed.** The switch sets
  `{ kind: "ld", maxAllowedR2: 0.3, maxDist: null }`, a command, and
  `variantFilterNeeds` gives its reason, with or without a variants
  file; the r² can be changed while the distance is `null`. The distance
  typed is a second command, and `variantFilterNeeds` gives `null`; an
  undo gives back the filter with no distance and its lock, a second the
  filter off. A project file saved in between holds the `null`
  (`docs/specs/core/projectFile.md`) and opens with the same lock.
- **The LD filter turned off and on again.** Turned off with r² 0.2
  and 50000 typed, it is in `filtersOff` with both, `filters` no longer
  has it, and every key that reads the filters is that of the project
  without it; turned on again, the step sends the filter kept, and the
  keys are those of before, so the results come back from the cache
  while it holds them. Turned off before a distance was typed, it is
  kept with `maxDist` `null`, locks nothing, and, turned on again, is
  locked again with the same reason. The same holds for every other
  filter with a switch, a threshold of the individuals among them.
- **The FILTER box on, then a `.nei` file without the record opened.**
  `loadVariants` keeps `passed` in `filters`; `filtersApplied` leaves it
  out, from the pick, since `keepsPassed` of a `.nei` file not yet read
  is false, and after the read, which says false, so the keys and the
  jobs are those of the same filters without it, and a pass over the
  file never meets `filterPassed`. Opening a VCF, or a `.nei` file with
  the record, gives it back, with no command.
- **The FILTER box on, then a `.nei` file with the record opened.** Until
  its read comes back, `filtersApplied` leaves `passed` out, and no
  calculation runs, since `projectNeeds` waits for the read; the read
  says `keepsPassed` true, and from then on `filtersApplied` keeps it,
  as for a VCF.
- **A threshold typed 1 while it is on at 0.3.** It is turned off and
  kept at 0.3 in its list of the filters off; `thresholdValue` gives
  `null`; Undo gives back the filter on at 0.3. Typed 1 again, or the
  box emptied, while it is off: `p` itself, no step of Undo.
- **A threshold dragged to the top of its axis**: when the axis ends
  below 1, a filter at the number there, 0.1 for the missing rate of
  the variants of `panel.nei`, since the axis ends where the file's
  values end; when it ends at 1, as the MAF's does on most files, the
  page sends 1, and the filter is off, as for 1 typed.

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
  maxAllowedMissingRate: 0.1 }` returns the project itself. Then
  `turnOffVariantFilter` of `obs_het` and of `ld` gives the filters
  `[missing_data, maf]` and `filtersOff` `[obs_het, ld]`, with their
  values; `setVariantFilter` of the `ld` kept gives back the filters
  `[missing_data, maf, ld]` and `filtersOff` `[obs_het]`; an undo of
  each is the project before it, by `toBe`. `turnOffIndividualFilter` of
  `obs_het` at 0.38 keeps it in `individualFiltersOff`, and
  `setIndividualFilter` of it takes it out. Each row of the table of the
  commands, with its defect or its `p`.
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
- **`variantFilterNeeds`** and **`jobFilters`**: the reason for the LD
  filter with `maxDist` `null`, with no variants file and with one read,
  and `null` with a distance, with no LD filter, with an LD filter with
  `maxDist` `null` in `filtersOff`, and for an empty project;
  `setVariantFilter` of the LD filter with `maxDist` `null` accepted, and
  of 0 and 2.5 a defect, as before; `jobFilters` of the filters of a
  project with a distance, the same array by `toBe`, and of a list with
  `maxDist` `null`, a defect whose message starts `popnei_web defect:`;
  `parseProject` of a filter with `maxDist` `null` accepted, of 0
  refused with the `expected` "a whole number, 1 or more, or nothing",
  and of `"1000"` with "a number or nothing".
- **The filters of popgen2.html.** `setThreshold` of each of the five
  thresholds at 0.3, then at 1, then at `null`, from
  `popgen2FirstProject()`: on at 0.3; off, kept at 0.3; `p` itself.
  Of the missing rate of the variants at 1, from the first project:
  off, kept at 0.1, and `filters` `[passed]`; at 0.05 then: on, out of
  `filtersOff`. At 1.5, -0.1 and NaN: a defect. `thresholdValue` of each
  in each state. `popgen2FirstProject()` is `filters` `[passed,
  missing_data 0.1]` and the three other lists empty, and
  `firstProject("popgen")` `[missing_data 0.1]` as before. The FILTER
  box: `setVariantFilter` of `{ kind: "passed" }` on a project whose
  filters are `[missing_data, maf]` gives `[passed, missing_data, maf]`;
  `turnOffVariantFilter` of `passed` keeps `{ kind: "passed" }` in
  `filtersOff`. `filtersApplied` of a project with `passed` on and a
  `.nei` file whose read says `keepsPassed` false, or that is not read
  yet, without it; of one with a `.nei` file whose read says true, of
  one with a VCF read or not, and of one with no file, `p.filters` by
  `toBe`; `filtersAppliedTo` of the same filters with `true` and with
  `false`. `keepsPassed` of a VCF and of a `.nei` file, pending, read
  with each value, and failed. `parseProject` of `{ "kind": "passed" }` in
  `filters` and in `filtersOff` accepted, of `{ "kind": "passed",
  "maxAllowedMaf": 1 }` refused as `unknownField`, and of `passed` after
  `missing_data` refused as `filterOutOfOrder`, with the text of the
  order quoted above.
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
  `2`; `populationsBeforeRun` the populations of the known list, and,
while a threshold waits for the statistics, those of `byLists`, for a
column and for the one population alike, as `populationsBeforeRun` was
tested in the module of the diversity in stage 3; every function `null`
for a project of association. From stage 5, of the functions of
`src/core/populations.ts`, tested where they were, in the tests of
`project.ts`: `populationsWithMinimum` of
A of 2, B of 1 and C of 3 individuals at a minimum of 2 gives A and C,
and B with 1, in that order, and at 0 every population; `underMinimumText`
of one, of two, of three and of four populations, the texts above as
literals; `populationListsNeeds` and `populationsKeptNeeds` each case of
the diversity's tests of stage 3, moved there with them. In the tests of
`populations.ts`: the helpers, on the worked table, `populationsByLists`
giving A and B, A alone with a list to remove i2, and none with a list
to keep i4; and, read from the text of `project.ts`, it imports nothing
of `individualsKept.ts` but types, and nothing of `populations.ts`.
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
- **`columnWarningsOf` and `firstValues`**: on a table with a column of
  a few whole numbers typed continuous, a column of decimals and a column
  of words, `columnWarningsOf` the warnings `columnWarnings` of the reader
  gives for the same table, types and mark; the same array for the same
  read; after `setColumnType` sets that column categorical, no warning,
  and, set continuous again, its warning back, with a table whose rows
  throw when they are walked again, so that the walk is shown kept by the
  table and the mark; with the decimal comma, the warnings of that mark.
  `firstValues`: the first three distinct values of each column in the
  order of the file, a missing cell skipped, a number of an xlsx as
  `String` writes it, and the same array for the same table.
- **The column of the populations first**: a new file whose first column
  is the column chosen gives `populationsOf` `null` and
  `populationsNeeds` of kind `noSuchColumn`, with its words.
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
  opens with none set; a project with neither `filtersOff` nor
  `individualFiltersOff` opens with both empty; the missing data filter
  both in `filters` and in `filtersOff` refused as `twoFiltersOfAKind`
  at `["filtersOff", 0]`, and a list to keep in `individualFiltersOff`
  refused as `wrongValue`; the grouping `onePopulation` opens in population
  genetics and is refused in association; a `continuous` type on a
  column of which one value is not a number, refused, with its text.
- **Properties, with fast-check**, which draws random projects and
  sequences of commands, and shrinks a failure to the smallest one. For
  every project, `parseProject(JSON.parse(JSON.stringify(p)), …)` is ok
  and deeply equal to `p`; the projects drawn hold the fields of stage
  4, `typesSet` with pairs applied and not, `onePopulation` and a read `notGiven`, which
  `wholeProject` of `src/core/testSupport.ts` draws, and an LD filter
  with `maxDist` `null`: the filter of the variants that file draws, for
  the projects and for the command `setVariantFilter` of the sequences,
  is a `ProjectVariantFilter`, whose LD filter has no distance in about
  half of the draws; and filters turned off, which `wholeProject` draws
  in `filtersOff` and `individualFiltersOff` and the sequences draw with
  `turnOffVariantFilter` and `turnOffIndividualFilter`; and, from 7
  October 2026, the filter `passed`, on and off, which `wholeProject`
  and the sequences draw with the other kinds, and the command
  `setThreshold` with numbers from 0 to 1, 1 among them, and `null`.
  `filtersApplied` of every such project holds the filters of `filters`
  in their order, all of them but `passed` when `keepsPassed` of its file
  is false; the reads drawn give `keepsPassed` both values for a `.nei`
  file and `true` for a VCF. For every such
  project, `variantFilterNeeds` gives
  a reason exactly when the LD filter of `filters` has no distance, and
  `jobFilters` of its filters throws exactly then. For every sequence of
  commands, each of the four lists of filters has
  at most one filter of each kind and is in its fixed order, no kind is
  both on and off, and a filter turned off then on again by the value
  kept gives the filters on of before; and a command applied twice with
  the same arguments returns, the second time, the project it was
  given.

## Open points

1. **The types the user set when the individuals file is read again.**
   Decided by the owner on 28 September 2026, as recommended on 27
   September 2026 (`docs/specs/stage-4-open-points.md`, point 6):
   they are kept by the name of their column, and applied where the new
   values allow them; otherwise the column has its inferred type, the
   type set waits in `typesSet` for a read that allows it, and the
   Individuals step says which columns do not have the type set ("The
   types of the columns", above). The option not taken was the meanwhile
   of stage 2, every type set lost at a new read, which made a user who
   changed the separator set every type again. That a type not applied
   waits, and is not dropped, was decided after the review of the
   architecture on 27 September 2026, and so was the button "Forget
   these types", which forgets the types that wait.

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
   (`docs/architecture.md`, section 11, and section 13, point 10), so the words say to save the
   project first, which a reload would otherwise lose; the project file
   holds no variants file, and a metadata file not read is asked for
   again, so the last words name the file. Decided on 27 September 2026,
   after the review of the architecture of stage 4, where the words of
   stage 2 were "Reload the page and load it again." The option not
   taken was "Reload the page and load it again." after every failure of
   the worker, which after a crash would have lost the whole project for
   what a new load of the file mends.
   **Closed** by the owner on 29 September 2026 for the individuals file
   (stop B 7 of `docs/specs/stage-4-open-points.md`): when the light
   worker crashes, or fails by a defect of our code, while it reads the
   individuals file, the user reads in the Individuals step "pops.csv
   could not be read: the reading of the file stopped unexpectedly. If it
   happens again with this file, save it again from Excel as .xlsx or as
   CSV.", since a file that makes the reader stop every time is best
   mended by saving it again from Excel; beside a Run button, "Load it
   again in the Individuals step." comes before the last sentence, the
   writer's. The option not taken: "the calculation stopped unexpectedly.
   Choose it again.", which spoke of a calculation where a file was being
   read. The words of a worker that could not start or of a page out of
   date, and those of the variants file, stay as above; the owner
   accepted them with the rest of the report of stop B.
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
- How a project file of `popgen2.html` holds `keepsPassed` of the read
  of its variants file, which the fingerprint of a file holding the
  filter of the FILTER column needs for a `.nei` file with the record:
  the piece that makes that page save projects.

## What this spec asks of other documents

Stage 5, 30 September 2026, made the same day: the three analyses of
stage 5 call the functions of "What the analyses per population share
from stage 5" (`docs/specs/analyses/diversity.md`, `popDists.md` and
`ldDecay.md`).

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
specs of stage 4 were made to agree, `docs/architecture.md` among them.

After the review of the same day, made in `docs/specs/entry.md` (a
source `notGiven` is never asked for a read, as a source read is not;
only a pending one is), and in the documents below the same day:

- `docs/architecture.md`, section 2: the read without `typesLost`, and
  `typesSet` holding the types not applied as well.
- `docs/specs/steps/variants.md`: the words after a calculation worker
  that could not start, "… Save the project, reload the page, open the
  project and choose panel.nei again.", where it quotes "Reload the page
  and choose it again.".
- `docs/specs/analyses/pca.md`: `populationsNeeds` gives `inStep` beside
  `reason`, and the PCA, which locks on `individualsNeeds`, locks on a
  source `notGiven` too.

For the filters turned off, 28 September 2026, made in each document the
same day: `docs/architecture.md`, section 2, the two lists in
`Project`; `docs/specs/core/projectFile.md`, the two lists written, and
a file without them read as empty; `docs/specs/core/keys.md`, the
filters off in no key; `docs/specs/core/store.md`, a filter off locks
nothing; `docs/specs/shell.md`, the summary line counts the filters on;
`docs/specs/steps/variants.md`, the switch turned on sends the filter
kept; and `docs/specs/worker/protocol.md`, a job carries the filters on
alone, as before.

For the filters of popgen2.html, 7 October 2026
(`docs/designs/stats-filters.md`): made the same day in
`docs/specs/worker/protocol.md`, `messages.md` and `runner.md`, the
kind `passed` and its place before the list of the individuals;
`docs/specs/core/projectFile.md`, `popgen.html` refusing a file that
holds it; `docs/specs/core/keys.md`, the keys and the fingerprint
reading `filtersApplied`; `docs/specs/core/store.md`, the write's job
reading it; and `docs/architecture.md`, sections 2, 3, 5, 7 and 8, and
after the review of the specs 9, 11, 12 and point 3 of 13. Made the
same day after that review: the specs of the analyses that read
`p.filters` read `filtersApplied(p)` in its place,
`docs/specs/analyses/diversity.md`, `pca.md` (`pcaFilters`),
`popDists.md`, `ldDecay.md` (its `keyInputs` and `ldDecayFilters`),
`sfs.md` (the warning of the MAF filter), `filterCounts.md` (its rows
and check numbers) and `writeVariants.md` (its job, the name of its
file and the estimate of its size), and `docs/specs/entry.md`
(`countsOf`, `writeCountsOf` and the first project of `popgen2.html`);
on `popgen.html`, whose projects never hold `passed`, it gives
`p.filters` itself, so nothing those specs say changes for a user. The screen spec
of the filters of `popgen2.html`, `docs/specs/steps/popgen2-filters.md`,
sends `setThreshold` and the two commands of the box, and shows
`thresholdValue`. For the owner's later decision of that day, the filter for a
`.nei` file that records the FILTER of its variants: `opened` carries
`keepsPassed` in `docs/specs/worker/protocol.md`, `messages.md` and
`runner.md`; `docs/specs/entry.md` records it in the read; the
fingerprint of `docs/specs/core/keys.md` takes it; `store.md` and the
specs of the analyses say "a file whose variants do not record their
FILTER" where they said "a `.nei` file"; and the screen spec shows the
box once the read of the file says `keepsPassed` true.
