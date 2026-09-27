# The decisions of the specs of stage 3

26 September 2026, for the owner. Stage 3 of `docs/build-order.md` is the
Variants step whole: the filters of the variants and of the individuals,
the checks the user reads to choose their thresholds, the counts of what
each filter kept, and the writing of the filtered variants as a `.nei`
file. Its design is the revision of `docs/architecture.md` the owner
approved on 26 September 2026, whose section 13 holds the answers to its
open points. The specs of stage 3, approved by the owner on 26 September 2026, are
`docs/specs/core/project.md`, `individualsKept.md`, `keys.md`,
`store.md`, `cache.md` and `projectFile.md`;
`docs/specs/analyses/individualChecks.md`, `variantChecks.md`,
`filterCounts.md`, `writeVariants.md` and `diversity.md`;
`docs/specs/worker/protocol.md`, `messages.md`, `runner.md` and
`client.md`; `docs/specs/charts/plot2d.md` and `histogram.md`;
`docs/specs/entry.md`; and the screen spec of the Variants step,
`docs/specs/steps/variants.md`, and that of the shell,
`docs/specs/shell.md`.

This file held their open points, ten decisions each spec left to the
owner, with the one three specs share made one. The owner answered them
on 26 September 2026, and the specs now say what was decided. Each point
below has the owner's answer, what it changed in the specs, and the
option not taken. The last part of point F, the values at which three
filters start when they are turned on, the owner settled the same day
by keeping those filters off until the user turns them on, and the
values of (a) below stand. On 27 September 2026, at stop A of
`docs/plans/variants-step.md`, the owner tried the Variants step as
built, accepted it, and took every recommendation of the report of the
plan on it; those decisions are the section after the points. After them come the choices the writers made alone
that a user meets, which the owner may overrule, the numbers that a
measurement sets, which are not the owner's to decide, and a note for
stage 4.

A few words are used throughout. A **pass** is one reading of the
variants file from its start, which a calculation of popnei makes; over
a gzipped VCF of gigabytes it takes minutes. The **statistics of each
individual** are its proportion of missing genotypes and its observed
heterozygosity, which popnei gives over the variants the filters keep
and from which the thresholds of the filters of individuals keep or
remove it. A **threshold on the individuals** is one of those two
filters of individuals; the two others are a list to keep and a list to
remove.

## Decided: the values at which three filters start

Part of point F, below. When the user turns on the filter by observed
heterozygosity of the variants, the LD pruning, or the filter of the
individuals by observed heterozygosity, the filter starts at a value,
which is a command, a step of Undo and a change of the results at once.
popnei gives no default for any of them. The owner decided on 26
September 2026 that these filters are off in a new project, and left
the values of (a) as the specs have them; (b) was not taken:

- **(a) The values of common practice**, the specs' meanwhile: the
  observed heterozygosity of the variants at 0.5, the most a variant of
  two alleles has in Hardy-Weinberg proportions, so that more points to
  a paralogue read as one site; the LD pruning at an r² of 0.3 over
  10,000 base pairs, the example of popnei's doc comment of the filters
  (`js/popnei/src/filters.ts`); the observed heterozygosity of the
  individuals at 0.5. A filter turned on removes something at once, and
  the histogram beside it shows how much. What it costs: for a selfing
  species, where a heterozygosity of 0.1 is already high, 0.5 removes
  almost nothing and the user must know to lower it; and 10,000 base
  pairs is short for the long LD of an inbred crop, where plink users
  often give a window of variants and not of base pairs, which popnei's
  filter does not take.
- **(b) Values that remove nothing**: 1 for the two heterozygosities, so
  that turning a filter on changes no result until the user moves the
  threshold, reading the histogram. The LD pruning has no such value,
  since popnei drops a variant of one dosage at every r², so it keeps
  (a)'s. What it costs: a filter that is on and removes nothing, which a
  user may take for a filter that works, and a second command, and a
  second step of Undo, to set it.
- **(c) Other values**, chosen by the owner for the users of popnei, for
  instance a heterozygosity of the variants per ploidy or per mating
  system, which the application does not know.

Recommended: (a), with the owner's numbers where they know better; each
is a constant of the step and its test (`docs/specs/steps/variants.md`,
open point 1).

## What the owner decided on 26 September 2026

Points A, B, D, G, H, I and J as they were recommended; C, E and F as
below. The option not taken of each is said here, and in the spec that
applies it.

### A. A file of the filtered variants, once Save is pressed

Released when Save is pressed. The page cannot tell whether the browser
saved the file, so it takes the Save as done, lets go of the file at the
click and of the address the browser reads it from a minute later, as
FileSaver.js and `src/ui/download.ts` do, and the tab gives back its
memory, about 960 MB for a million variants of 1,000 individuals at the
0.96 bytes per genotype popnei wrote. A user who cancelled the
browser's question writes the file again, one pass. The option not
taken kept the file until a change of the filters, a new variants file
or an opened project, with Save offered again, at the cost of that
memory for as long as the filters stay. It is the choice of point K of
`docs/specs/stage-2-open-points.md` for the project file. Specs:
`entry.md`, `store.md`, `writeVariants.md`.

### B. Thresholds on the individuals that leave no population

popnei's refusal, after the Run. The Run calculates the statistics of
each individual when they are not in the page, then sends the diversity
with no population, which popnei refuses at once, before a second pass,
and the panel says "The thresholds of the filters of individuals leave
none of the individuals of panel.nei that have a population in popcat,
so no population is left. Loosen the thresholds in the Variants step.";
once the statistics are in the page, the panel names beforehand each
population the thresholds leave empty. The option not taken was a lock
before the Run, a function more in the definition of every analysis,
which changes section 4 of the architecture and would lock only when the
statistics are already in the page. Spec: `diversity.md`.

### C. The download of the histograms as SVG and PNG

No buttons until stage 6, as `docs/build-order.md` has it: the Variants
step has no "Download as SVG" and no "Download as PNG". Each histogram
keeps the table of its bins and its "Download the bins as CSV", since
every table downloads as CSV from where it is shown
(`docs/functionality.md`, section 9). The owner asked, with the answer,
that stage 3 make one piece for what every 2D plot shares, and it is
specified in `docs/specs/charts/plot2d.md`: a function of
`src/charts/plot2d.ts`, `createPlot2d`, that makes the handle of a plot
from a definition of it, its kind, the check of its data, its margins
and the function that draws its marks. It holds the SVG and its frame
with the margins, the size and its changes, the axes drawn from the
plot's scales, the themes, the title and the description a screen
reader reads and the rule of the table of the numbers behind the plot,
`update` and `destroy`, and the export, `toSVG` and `toPNG` with its
`PngError`. It is a function and not a class, since the architecture
has a plot as a function (section 7) and `charts.md` has each handle as
a closure, with no `this` to lose. The histogram is built on it, the
scatter of the PCA, the Manhattan plot and the QQ plot will be, and its
export is tested in stage 3 on a page of the tests, `e2e/plots.html`,
built for the tests alone. The option not taken was the two buttons on
each of the five histograms from stage 3, with their two messages and
their line of the versions. Specs: `plot2d.md`, `histogram.md`,
`variantChecks.md`, `individualChecks.md`, `steps/variants.md`; and
`.claude/skills/coding/charts.md` and `testing.md`, and the list of the
modules of section 9 of the architecture.

### D. The words that send the user to fix a list of individuals

The ends of the first draft of `project.md`, "The list of individuals to
keep is empty. Add individuals to it, or remove the filter, in the
Variants step." and "Change the list, or remove the filter, in the
Variants step.", until the owner sees the Variants step at the stop of
the plan of stage 3 where the screens are tried. The option not taken
was other words chosen before the screen was seen, which the owner can
still choose there; they change one table of `project.md` and its tests.
Specs: `project.md`, `steps/variants.md`.

### E. The version of the format of the project file

The format stays at version 1 until the first proper release of the
application, which is in development, before its first alpha: stage 3
does not raise it, nor do the regions of a BED file when they come, and
a file saved by one development version may be refused by a later one.
The fixed order of the filters is checked in version 1. Section 12 of
the architecture, which gave version 2 to stage 3, is corrected so, with
its sections 2 and 8. The option not taken was version 2 now, for the
fixed order alone, and version 3 for the regions. Spec:
`projectFile.md`.

### F. The values at which a filter starts when it is turned on

In a new project only the missing data filter of the variants is on, at
0.1, as before. The filter by observed heterozygosity of the variants,
the LD pruning, and both thresholds of the individuals are off until the
user turns them on. The missing data filter of the individuals starts
at 0.1 when it is turned on, plink's default for `--mind`, as the
variants' 0.1 is its `--geno`. The values at which the other three start
stay open, above. Spec: `steps/variants.md`.

### G. A file written and not saved, which a change discards

The file is discarded at the change, and the notice says so: "The MAF
filter changed. The written file, not saved, was discarded, and Undo
does not bring it back; write it again to save it · Undo"; the question
before an opening says "panel.filtered.nei, written and not saved, will
be discarded." The option not taken kept the file while the notice is
up, so that its Undo brings it back, at the cost of its memory, about
960 MB for a million variants of 1,000 individuals, for as long as the
notice stays, and one rule more in the store. Specs: `store.md`,
`writeVariants.md`, `shell.md`.

### H. A project file of version 1 whose filters are out of order

Refused, with the words of the validation: "The project file cannot be
opened: the filters of the variants should be in the order missing
genotypes, observed heterozygosity, major allele frequency, linkage
disequilibrium, and the second one is out of that order." No application
wrote such a file, so it is one edited by hand. The option not taken
opened it with its filters put in the fixed order and a warning, which
would open another project than the file describes, whose check numbers
the comparison would then blame on the variants file. Spec:
`projectFile.md`.

### I. What the description of a histogram counts

The variants or the individuals in the bins: "The major allele frequency
of 1,200 variants, in 40 bins from 0 to 1. The threshold 0.95 keeps the
38 bins up to it, 1,175 variants, and removes the 2 bins above it, 25
variants.", on `panel.nei` in node on 26 September 2026. The option not
taken named the bins alone, and gave a user of a screen reader nothing
to compare with the counts beside the filter. Spec: `histogram.md`.

### J. The Variants step in the stepper when the thresholds keep no individual

Problem, with the reason "The filters of individuals keep none of the
200 individuals of panel.nei. Loosen them in the Variants step.", the
state the stepper gives a list of individuals that popnei would refuse.
The option not taken was Done, with which the user would learn it only
at the diversity's locked Run button, in the Analyses step. Spec:
`shell.md`.

## What the owner decided on 27 September 2026, at stop A

The owner tried the screens of the writing of the filtered variants and
of the filters of the variants, and took the nineteen recommendations of
`docs/plans/variants-step.report.md`, "Stop A: what waits for the
owner". Each is written in its spec as decided. What changes for a user:

- **Write refused in three more cases** (`writeVariants.md`): before a
  Count, when the bound of the file from the variants of the file
  reaches `WRITE_MAX_BYTES`, 1.8 GB, with "… Count the variants first,
  above."; when the Count says the filters keep no variant, or the file
  holds none; and after a Count in error with no button, a refusal of
  popnei or a file the browser can no longer read, which a write would
  meet the same way. While the Count runs, no word asks for it.
- **The warning above 500 MB** says that on a phone or a tablet the
  write fails with far smaller files (`writeVariants.md`).
- **Words**: the threshold under a histogram, "Threshold of the MAF
  filter: 0.95, drawn over every variant of the file"; "Not counted for
  these filters. Count to see what each filter keeps."; the LD pruning,
  "Of two variants closer than the distance, and with an r² above the
  maximum, the first is kept."; a line under the filter by observed
  heterozygosity (`steps/variants.md`); the summary line before a
  Count, "1,200 variants, filters not counted" (`shell.md`, open point
  1); a file with no variant shows the warning of the Count alone, and
  a refusal of the Count for one says "there is no variant to count"
  (`filterCounts.md`); the words of the writing leave out "in the
  Variants step"; the question before an opening says "… will be
  discarded; to keep it, press Keep the current project and save it in
  the Variants step." (`shell.md`); once saved, the writing gives the
  size written alone; and the status region says "The earlier writing
  of the file was stopped." when a calculation stops a writing left
  behind (`shell.md`).
- **Kept as built**: a write that popnei refuses for memory stays
  refused under its key (`store.md`, `writeVariants.md`); Cmd+Z in a
  number field with nothing typed since its commit is the project's
  Undo (`shell.md`); the panel of a plot is a stop of the Tab key
  (`steps/variants.md`); the line under a plot that names the bin a
  threshold splits (`histogram.md`); the axis of the major allele
  frequency from 0 (`histogram.md`); a refusal of an empty pass of the
  histograms in popnei's words (`variantChecks.md`), and the warning of
  a first filter that keeps no variant ending "Loosen it."
  (`filterCounts.md`).

## Choices of a spec the owner may overrule

Each was decided by the writer of its spec, and each changes what a user
meets. The owner accepted the screens that show them on 27 September
2026, above, so they stand as decided, with the change of the summary
line said there:

- **The bins of the histograms of the individuals** are 20 over the
  range of the values, from the smallest to the largest, and not 40 over
  0 to 1, as `numpy.histogram` makes them: the proportions of missing
  genotypes of `panel.nei` lie from 0.016 to 0.043, which 40 bins over 0
  to 1 would put into two bars (`individualChecks.md`).
- **The expected heterozygosity of the variants is the unbiased one**,
  Nei's, which the diversity shows, so that the two read as one
  statistic (`variantChecks.md`).
- **A file written with no filter** is named `panel.nei`, and with a
  filter `panel.filtered.nei`, since the first is the variants file
  converted; a file of no variant, which popnei writes, gets no Save
  button, and the step says the filters kept none; the button to write
  is disabled at an estimate of 4 GB or more, which wasm cannot address,
  1.8 GB since the measurement of 27 September 2026
  (`writeVariants.md`).
- **A Stop of an analysis that waits for the statistics of each
  individual** stops the statistics too, unless another analysis waits
  for them or the user started them with their own Calculate
  (`store.md`).
- **The clock of an analysis that waited for the statistics** starts
  again when its own calculation starts, with the words of its running
  state (`entry.md`).
- **The thresholds of the individuals take four decimals**, and those of
  the variants two, as the owner decided for the missing data filter on
  25 September 2026: the proportions of missing genotypes of the
  individuals of `panel.nei` lie from 0.0165 to 0.0434, where two
  decimals would give three thresholds (`steps/variants.md`).
- **A list of individuals is typed or pasted, one name per line, and
  applied with a button**, not at each key, since each change is a step
  of Undo and a list half typed would lock every analysis that reads the
  filters of individuals, and the writing; a list read
  from a file, or made from the rows of the table of the individuals, is
  not in stage 3 (`steps/variants.md`).
- **Before a variants file is read, the checks, the Count and the
  writing are not drawn**, and one line says they come once a file is
  read, where each would otherwise be locked with the same reason, five
  times (`steps/variants.md`).
- **Each histogram of the variants is drawn beside its filter**, the
  expected heterozygosity beside the observed one, and the three checks
  keep their own buttons; the summary line gives "1,128 of 1,200
  variants kept" and "114 of 200 individuals kept" only while they are
  known for the filters as they are (`shell.md`, open point 1).

## Set by a measurement, not by the owner

Each has a value in its spec meanwhile, and the first work package of
stage 3 that meets it measures it, in Chromium, Firefox and WebKit, as
section 11 of the architecture asks:

- the size of a file above which the step warns before a write,
  500 MB meanwhile, the size above which the calculation worker is
  started again after a write, 100 MB meanwhile, and the bytes per
  genotype of the estimate, 1 meanwhile, from the memory of the tab
  during and after a write of the `.nei` file of 19,161,178 bytes and of
  one ten times larger (`writeVariants.md`, `client.md`);
- whether a file made in the calculation worker is still whole on the
  page after that worker is ended, which the File API promises and no
  browser has been seen to do yet (`client.md`, `runner.md`);
- the time of the pass of the Count against a pass of the diversity on
  the same files; popnei is asked for a function that only counts if it
  is much longer (`filterCounts.md`);
- the largest file each engine writes before the write fails, which
  sets `WRITE_MAX_BYTES`, the size at which the button to write is
  disabled, 4 GB meanwhile, the most wasm addresses, though a tab that
  holds up to three times the file at the peak may fail well below it
  (`writeVariants.md`);
- the time the page is frozen after a threshold moves, with the table of
  the statistics of 10,000 individuals; the table draws only the rows on
  the screen if it is above about 100 ms, the time within which the
  answer to a key reads as at once, which section 11 of
  `docs/architecture.md` takes as its bound (`individualChecks.md`).

## For stage 4

Not a point to decide now; the spec of the PCA meets it. The PCA has a
MAF filter of its own (`docs/functionality.md`, section 5), and the rule
`docs/specs/worker/protocol.md` held until stage 3 joined it with the
dataset's MAF filter only when the dataset had no LD pruning and the job
kept every individual, and otherwise gave the PCA none of its own. With
the filter of individuals last in the fixed order, any filter of
individuals set leaves the PCA without its own MAF filter under that
rule, so the spec of the PCA decides again how the two are given to
popnei.

## Not repeated here

The open points of earlier stages that stage 3 does not touch stay in
their specs: the types the user set lost when the individuals file is
read again (`project.md`, open point 1), the bound of the cache
(`cache.md`, open point 1), how far back undo goes (`history.md`, open
point 1), and the words of the project file (`projectFile.md`, open
point 1).
