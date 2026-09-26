# The open points of the specs of stage 3

26 September 2026, for the owner. Stage 3 of `docs/build-order.md` is the
Variants step whole: the filters of the variants and of the individuals,
the checks the user reads to choose their thresholds, the counts of what
each filter kept, and the writing of the filtered variants as a `.nei`
file. Its design is the revision of `docs/architecture.md` the owner
approved on 26 September 2026, whose section 13 holds the answers to its
open points. The specs of stage 3, none of them approved yet, are
`docs/specs/core/project.md`, `individualsKept.md`, `keys.md`,
`store.md`, `cache.md` and `projectFile.md`;
`docs/specs/analyses/individualChecks.md`, `variantChecks.md`,
`filterCounts.md`, `writeVariants.md` and `diversity.md`;
`docs/specs/worker/protocol.md`, `messages.md`, `runner.md` and
`client.md`; `docs/specs/charts/histogram.md`; `docs/specs/entry.md`;
and, written after them, the screen spec of the Variants step,
`docs/specs/steps/variants.md`, and that of the shell,
`docs/specs/shell.md`.

This file holds their open points, the decisions each spec left to the
owner, six, with the one three specs share made one. Each has its spec,
what is to be decided, the options with what each gives and costs, and
the recommendation, which is what the specs do meanwhile, so that the
plan can be written before the answer. They are in the order of how much
each changes what a user sees. After them come the choices the writers
made alone that a user meets, which the owner may overrule, and the
numbers that a measurement sets, which are not the owner's to decide.

A few words are used throughout. A **pass** is one reading of the
variants file from its start, which a calculation of popnei makes; over
a gzipped VCF of gigabytes it takes minutes. The **statistics of each
individual** are its proportion of missing genotypes and its observed
heterozygosity, which popnei gives over the variants the filters keep
and from which the thresholds of the filters of individuals keep or
remove it. A **threshold on the individuals** is one of those two
filters of individuals; the two others are a list to keep and a list to
remove. The **key** of a result is a hash of everything it was
calculated from, under which it is kept in the page and found again by
an undo.

## A. A file of the filtered variants, once Save is pressed

Specs: `docs/specs/entry.md`, "A file of the filtered variants saved";
`docs/specs/core/store.md`, "The writing of the filtered variants";
`docs/specs/analyses/writeVariants.md`, "Saving the file".

When a file of the filtered variants is written, the step shows "Save
panel.filtered.nei, 18.4 MB"; Save hands the file to the browser, which
saves it in its downloads, or first asks the user where, when the
browser is set to ask for each file, as Chrome, Firefox and Safari can
be. The page is not told whether the file was saved: a user can cancel
the browser's question, or the download can fail, and the page sees
neither. Section 6 of the architecture says the page releases the file
"once it is saved", and the page can only know that Save was pressed.
The question is whether the page releases the file then, or keeps it.

- **(a) Released when Save is pressed**, a minute after the click, the
  time Safari on iOS takes to ask before it reads the file. The memory of
  the tab that held the file is given back: about 960 MB for a million
  variants of 1,000 individuals, at the 0.96 bytes per genotype popnei
  wrote for 20,000 variants of 1,000 individuals. The step then says
  "panel.filtered.nei, 18.4 MB, was handed to the browser to save. To
  save it again, write it again." A user who cancelled the browser's
  question, or whose download failed, writes the file again: one pass
  over the variants file, minutes over a gzipped VCF of gigabytes.
- **(b) Kept until a change of the filters, a new variants file or an
  opened project**, with Save offered again. A cancelled question costs
  nothing. The tab holds the file while the user goes on to the
  analyses, beside the memory the calculation worker kept from the write,
  which never shrinks until it is started again: for the file of a
  million variants above, 960 MB more for as long as the filters stay,
  in a tab that a browser may close for its memory, losing the work
  since the project was last saved.

Recommended: (a), as the architecture has it, since a file large enough
for the rewrite to cost minutes is also the one whose memory a tab
cannot spare; the specs are written so. It is the same question as point
K of `docs/specs/stage-2-open-points.md` for the project file, where the
page also cannot tell whether a Save was kept, and the owner chose there
to take the Save as done.

## B. Thresholds on the individuals that leave no population

Spec: `docs/specs/analyses/diversity.md`, open point 1.

The diversity is calculated for each population, and a population that
the filters of individuals leave with no individual is left out, since
popnei refuses an empty one. With a threshold on the individuals, which
individuals are kept is known only once their statistics are calculated,
a pass over the file, which a Run of the diversity makes first when they
are not in the page. The thresholds can then leave no individual that
has a population, while they keep some that have none, so the diversity
has nothing to calculate. Which check tells the user, and when?

- **(a) popnei's refusal, after the Run.** The Run calculates the
  statistics, then sends the diversity with no population, which popnei
  refuses at once, before a second pass; the panel says "The thresholds
  of the filters of individuals leave none of the individuals of
  panel.nei that have a population in popcat, so no population is left.
  Loosen the thresholds in the Variants step." The state before the Run
  has already named each population left empty, once the statistics are
  in the page, as after a Calculate of the Variants step. It costs the
  user the pass of the statistics before the words, when they were not
  in the page; the refusal is kept for those settings, as every refusal
  of popnei, so an undo back to them shows it again with no pass.
- **(b) A lock before the Run**, once the statistics are in the page: a
  function more in the definition of every analysis, which the store
  asks with the list of the individuals kept whether it can run, and the
  Run button disabled with the same words. It changes the shape of an
  analysis of section 4 of the architecture, so it needs a design, its
  review and the owner's approval, for one analysis now; and it still
  cannot lock before the first pass of the statistics, so it spares the
  user a Run only when the statistics are already there.

Recommended: (a), the specs' meanwhile, since the state before the Run
already names the populations left empty, and (b) would lock only in the
same case.

## C. The download of the histograms as SVG and PNG

Specs: `docs/specs/charts/histogram.md`, open point 1;
`docs/specs/analyses/individualChecks.md` and `variantChecks.md`, "What
it shows".

The Variants step shows five histograms: the major allele frequency and
the observed and expected heterozygosity of the variants, and the
proportion of missing genotypes and the observed heterozygosity of the
individuals. `docs/build-order.md` gives the download of every plot as
SVG and PNG to stage 6, the report, and says that the export is tried on
the histogram in stage 3. Are the two buttons of the download, "Download
as SVG" and "Download as PNG", on each histogram from stage 3?

- **(a) The buttons in stage 3.** A user can save the histograms from
  the first release that has them, for a figure or a report of their
  own, and the export is seen working in Chrome, Firefox and Safari by
  users as well as by its tests. It costs ten buttons on the step, two
  per histogram, the two messages of a PNG that cannot be made, and the
  line of the versions of popnei and of the application beside each, in
  the specs of the two checks.
- **(b) No buttons until stage 6.** The export is written and tested in
  stage 3, and offered with the report. The step is shorter by ten
  buttons; a user who wants a histogram meanwhile takes a screenshot.

Recommended: (a), as the table of the diversity was offered as a CSV in
stage 2; the specs have the buttons meanwhile.

## D. The words that send the user to fix a list of individuals

Spec: `docs/specs/core/project.md`, open point 2.

A list of individuals to keep or to remove can be empty, name an
individual twice, or name one that is not in the variants file; popnei
refuses each, so every analysis is locked with a reason beside its Run
button. In stage 2 such a list came only from a project file, and the
reasons ended by telling the user to correct it in a text editor. Stage
3 gives the Variants step the controls of the lists, so the ends are
written again:

- **(a) The ends of the first draft of `project.md`**, the specs'
  meanwhile: "The list of individuals to keep is empty. Add individuals
  to it, or remove the filter, in the Variants step." for an empty list,
  and "Change the list, or remove the filter, in the Variants step." for
  a name repeated or not in the file.
- **(b) Other words**, judged by the owner on the screen of the Variants
  step, for instance ones that name the control the step gives the list.

Recommended: (a) until the owner sees the step at the stop of the plan
of stage 3 where the screens are tried; the words are one table of
`project.md` and its tests, and nothing else changes with them. The
Variants step, as `docs/specs/steps/variants.md` now has it, gives each
list a text area of one name per line, with the buttons "Apply the list
to keep" and "Clear the list to keep", and the same for the list to
remove. An applied list with no name clears the filter, so an empty list
reaches the project only from a project file, and "remove the filter" of
(a) is the button Clear. The step shows the reason whole under the two
lists, where "in the Variants step" is where the user already is.

## E. The version of the format of the project file

Spec: `docs/specs/core/projectFile.md`, open point 2.

A project file carries the version of its format, and the application
reads every version before its own. Section 12 of the architecture gives
version 2 to stage 3, for the regions of a BED file and their filter,
and for the filters of the variants in their fixed order, which the
opening of a file checks. The regions wait for the release of popnei
that filters by them, so stage 3 writes nothing that version 1 did not
already hold: every kind of filter was in version 1, and no file the
application of stage 2 wrote has its filters out of the fixed order,
since it had the missing data filter alone.

- **(a) Version 1 in stage 3**, the specs' meanwhile, the fixed order
  checked in every version, and version 2 with the regions. It costs
  nothing now, and one version for the regions.
- **(b) Version 2 now**, for the fixed order alone, and version 3 for the
  regions. A file then tells by its version that its filters are in the
  fixed order, which a file of version 1 written by the application
  always is, at the cost of one version more that every later
  application reads.

Recommended: (a). A user meets neither: both open every file the
application wrote.

## F. The values at which a filter starts when it is turned on

Spec: `docs/specs/steps/variants.md`, open point 1.

Each filter of the Variants step is a switch with its number fields; a
filter that is off is not in the project, and turned on it starts at a
value, which is a command, a step of Undo and a change of the results at
once. `docs/functionality.md` gives the missing data filter 0.1 and the
MAF filter 0.95, and popnei gives no default for any of its filters. The
other five numbers are the step's:

- **(a) The values of common practice**, the specs' meanwhile: the
  observed heterozygosity of the variants at 0.5, the most a variant of
  two alleles has in Hardy-Weinberg proportions, so that more points to
  a paralogue read as one site; the LD pruning at an r² of 0.3 over 10,000 base pairs, the
  example of popnei's doc comment of the filters
  (`js/popnei/src/filters.ts`); the missing data of the individuals at
  0.1, plink's default for `--mind`, as the variants' 0.1 is its
  `--geno`; the observed heterozygosity of the individuals at 0.5. A
  filter turned on removes something at once, as the user who turned it
  on most likely wants, and the histogram beside it shows how much. What
  it costs: for a selfing species, where a heterozygosity of 0.1 is
  already high, 0.5 removes almost nothing and the user must know to
  lower it; and 10,000 base pairs is short for the long LD of an inbred
  crop, where plink users often give a window of variants and not of
  base pairs, which popnei's filter does not take.
- **(b) Values that remove nothing**: 1 for the three heterozygosities
  and the missing data of the individuals, so that turning a filter on
  changes no result until the user moves the threshold, reading the
  histogram. The LD pruning has no such value, since popnei drops a
  variant of one dosage at every r², so it keeps (a)'s. What it costs: a
  filter that is on and removes nothing, which a user may take for a
  filter that works, and a second command, and a second step of Undo, to
  set it.
- **(c) Other values**, chosen by the owner for the users of popnei, for
  instance a heterozygosity of the variants per ploidy or per mating
  system, which the application does not know.

Recommended: (a), the specs' meanwhile, with the owner's numbers where
they know better; each is a constant of the step and its test.

## Choices of a spec the owner may overrule

Each was decided by the writer of its spec, and each changes what a user
meets:

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
  is disabled at an estimate of 4 GB or more, which wasm cannot address
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
  variants kept" and "119 of 200 individuals kept" only while they are
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
- the time the page is frozen after a threshold moves, with the table of
  the statistics of 10,000 individuals; the table draws only the rows on
  the screen if it is above about 100 ms (`individualChecks.md`).

## Not repeated here

The open points of earlier stages that stage 3 does not touch stay in
their specs: the types the user set lost when the individuals file is
read again (`project.md`, open point 1), the bound of the cache
(`cache.md`, open point 1), how far back undo goes (`history.md`, open
point 1), and the words of the project file (`projectFile.md`, open
point 1).
