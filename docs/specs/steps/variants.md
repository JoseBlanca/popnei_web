# The Variants step

Written on 25 September 2026 for the walking skeleton of stage 2,
approved by the owner the same day, revised the same day with the
owner's decisions on the screen as built (stop 7.5 of
`docs/plans/walking-skeleton.md`) and on the project file opened (points
9 and 10 of the reviews of its work packages 2 to 6), and built in
`src/ui/steps/variants/`. Revised on 26 September 2026 for stage 3 of
`docs/build-order.md`, the Variants step whole, as the revision of
`docs/architecture.md` the owner approved that day has it; the revision
is approved by the owner on 26 September 2026, and there is no code of its parts yet.

The screen spec of the first step of both applications. In stage 2 the
user picks the variants file, a VCF or a `.nei` file, sets how a VCF is
read, sees what the file holds, and sets the missing data filter. Stage
3 adds, in this order down the step: the other filters of the variants,
each with what it kept and with the histogram of the number it keeps a
variant by; the filters of the individuals, the two lists and the two
thresholds, with the statistics of each individual as a table and as
histograms beside the thresholds; and the writing of the variants and
the individuals the filters keep as a `.nei` file, in this step and not
in an Export step, as the owner decided on 25 September 2026. It shows
section 3 of `docs/functionality.md`, and reads the project and its
commands of `docs/specs/core/project.md` and the state of the store of
`docs/specs/core/store.md`. The parts that calculate have their module
specs, whose words and states this spec does not repeat and places on
the step: `docs/specs/analyses/variantChecks.md`, the histograms of the
variants; `filterCounts.md`, what each filter kept; `individualChecks.md`,
the statistics of each individual; `writeVariants.md`, the file written;
and `docs/specs/core/individualsKept.md`, the individuals the filters
keep, which needs no calculation.

The words of core used here: the **project** is everything the user has
set; a **command** is a change of it that one Undo takes back, sent with
a description that ends the notice of what it removed, "Diversity
removed because the missing data filter changed · Undo"; a **load** is
one pick of a file, with an id of its own, new at every pick; the
**source** is what the project holds of the loaded file, its name, size,
format, read options, and what the calculation worker, the second thread
of the tab where popnei runs, read from it. A **pass** is one reading of
the variants from the start of the file, which every analysis and filter
makes. The **checks** are the three calculations of this step, each an
analysis of `docs/architecture.md`, section 4, with its button and the
states of any analysis: the histograms of the variants, the counts of
what each filter kept, and the statistics of each individual. The
**individuals kept** are the one list that core makes from the four
filters of individuals, with how many each filter was given and kept
(`individualsKept`, which the store gives in its state). Each check
shows, beside its button, the **line of the versions**, "Calculated with
popnei 0.1.0, in version 0.1.0 of the application.", as every result
does (`docs/functionality.md`, section 9).

The words of the page around the step, `docs/specs/shell.md`'s: the
**shell** is what surrounds every step, the header with Undo and Redo,
the **stepper**, the row of links to the three steps with the state of
each, and the **summary line** under it, which says what the analyses
would run on; the **notice** is a small panel at the bottom of the page
that says what the last change removed or will stop, with its Undo; and
the **status region** is a part of the page, not seen, whose text a
screen reader, the program that reads the page aloud to a user who
cannot see it, reads out when it changes. The **focus** is the element
the keyboard acts on, which the Tab key moves from one element to the
next. The widgets named below are those of **React Aria**, the library
of accessible widgets the application is built with, each of which
already works with the keyboard and a screen reader; each is said what
it is where it is first named.

## What it shows

### The parts, in their order

The step is one page under its heading "Variants", its `<h1>`, the
heading of the first level, in four sections, each with a heading of the
second level, an `<h2>`, and the blocks within them with one of the
third, an `<h3>`; a screen reader lists the headings, and jumps between
them:

1. **Variants file**: the file, how a VCF is read, what the file holds.
2. **Filters of the variants**: the button of the histograms of the
   variants; the four filters in their fixed order, missing data,
   observed heterozygosity, MAF and LD pruning (`docs/architecture.md`,
   section 2), each with the histogram of its number beside it when
   there is one, and what it kept; the Count button, and the variants
   that pass every filter.
3. **Filters of the individuals**: the list to keep and the list to
   remove; the statistics of each individual, with its button; the two
   thresholds, of the proportion of missing genotypes and of the observed
   heterozygosity, each beside its histogram; the table of the
   individuals; and the individuals that pass every filter.
4. **Writing the filtered variants**: the button, the size expected, its
   warning, and the Save button once the file is written.

The filters come in the order popnei applies them, so that what each
kept reads down the page as a chain: each filter is given what the one
above it kept. The filters of the individuals come after those of the
variants for the same reason, since popnei's `filterIndividuals` comes
after them, and the statistics of each individual are counted over the
variants the filters above keep (`docs/architecture.md`, section 13,
point 8).

The three checks, the Count and the writing are not drawn while the
variants file is not read, no file, a file being read or a file that
could not be read, and the line "The histograms, the counts and the
statistics of each individual are calculated once a variants file is
read." stands under the heading of the filters of the variants in their
place. Each would otherwise be locked with the same reason, "Load a
variants file in the Variants step.", five times on the step that the
reason names. The filters are drawn and can be set in every state, since
they belong to the project and stay across loads.

### The file

A drop zone, React Aria's `DropZone`, an area of the page onto which a
file is dragged from the desktop, that holds a button, React Aria's
`FileTrigger`, a button that opens the file picker of the system,
"Choose a variants file…", since dropping a file cannot be done with a
keyboard
(`.claude/skills/coding/react.md`, "Widgets"). The format is told by the
end of the name, compared without regard to case, `PANEL.VCF.GZ` as
`panel.vcf.gz`, since the page does not read the file:
`.nei` is a `.nei` file; `.vcf`, `.vcf.gz` and `.vcf.bgz` are a VCF,
plain or compressed, which popnei's `openVcf` reads alike
(`js/popnei/src/io_vcf.ts`). A file of any other name is not loaded,
and the step says so (below, "Its words"); the picker offers these
endings first, and any file under "All files".

React Aria's drop zone holds a button of its own, hidden from the eye,
"Paste a variants file", which takes a file pasted into it with Cmd+V
or Ctrl+V and loads it as a drop, so that a user of the keyboard who has
copied the file in the file manager can paste it. It is the first stop
of the Tab key in the step, and Enter on it does nothing. A paste was
seen to load the file in WebKit 26.6 on 25 September 2026, and was not
tried in Chromium or Firefox. The owner decided on 25 September 2026 to
keep it.

A paste is a drop to the step, which cannot tell them apart, so the
words of what a drop held fit a paste as well, and say "load" and not
"drop": a user of the keyboard pastes and cannot drop. Several files
dropped or pasted at once load none: "Load one variants file at a
time." A drop or a paste that holds no file loads nothing and says what
to give: a folder, "Load a VCF or a .nei file, not a folder.", and a
piece of text, dragged from another window or copied, "Load a VCF or a
.nei file, not a piece of text.". A drop of several things, one of them
a folder, is a drop of several, and loads none, as above. Text that
comes in a drop with a file is left out, and the file is loaded, so that
a browser that gives a dragged file's name as text beside it still loads
the file; whether one does was not checked. Whether a folder copied in
the file manager reaches the page as a folder when it is pasted was not
checked either; the words above fit it if it does.

Once a file is picked, the zone shows the file's card: its name, its
format, "VCF" or ".nei file", and its size, and what the file holds as
soon as it is read:

| line | from |
|---|---|
| individuals, "200 individuals" | the length of `read.individuals` of the source, the part of it that holds what the worker read, which popnei gives when the file opens, with no pass |
| ploidy, "Ploidy 2", for a `.nei` file only | `read.ploidy`, the one in the file. A VCF has no line of its own for it, since its ploidy is the one the user gave and not one found in the file; the line of how it was read gives it, as the owner decided on 25 September 2026 |
| variants, "1,200 variants" | `read.numVars`, once the first pass has counted them; until then "Variants: not counted yet; the first analysis that reads the whole file counts them", which stays true after an analysis that popnei refused |
| how a VCF was read | "Read with ploidy 2, only the variants with PASS or . in the FILTER column", or "Read with ploidy 2, every variant", from `readOptions` |

The number of variants counts those the file gives before the filters of
the application: for a VCF read with only the passed variants, those
that passed. It is not known sooner because popnei counts the variants
of a file only by reading all of them, a pass, and the first pass is
that of the first calculation the user starts, a check of this step
among them (`docs/architecture.md`, section 6, "How a load of the
variant file reaches the project", step 5). The chromosomes with their
number of variants, which section 3 of `docs/functionality.md` lists
under "What the dataset holds", come with popnei's density of variants
along each chromosome, in its release that has it, as a check of
`docs/specs/analyses/variantChecks.md` (`docs/architecture.md`, section
6, "What this asks of popnei", item 7).

The button stays in the zone, labelled "Replace panel.nei…" once a file
is loaded, and a file dropped on the card replaces the one there. The
button is the same element in every state, so that the focus stays on it
after a pick, when the card replaces the empty zone. There is no Remove:
core has no command that takes the variants file out, and Undo does.

No size of file gets a warning. popnei's release `js-v0.1.0-dev.2`, which
stage 2 builds on as the owner decided on 25 September 2026, reads the
`File` by ranges of a few MiB, so the size of a file is not bounded by
the memory of the tab (`docs/specs/worker/runner.md`, "The memory"). What
a large file costs is time: every analysis reads the whole file, a
gzipped VCF decompressed whole at every pass. That is shown where it is
paid, by the progress bar of each calculation, and not guessed from the
size before any pass; the remedy is to write the variants as a `.nei`
file once, which is read many times faster (`docs/functionality.md`,
section 3), with the section "Writing the filtered variants" of this
step. The help drawer, which will say so, comes in stage 8 (below, "Not
in this spec").

### How a VCF is read

Beside the zone, two options for the next VCF the user picks, with no
effect on a `.nei` file, whose ploidy is in the file:

| label | widget | default | from |
|---|---|---|---|
| Ploidy of the VCF, from 1 to 255 | `NumberField`, React Aria's field of a number, which takes digits and arrow keys, here a whole number | 2 | the default of popnei's `openVcf`, and the range it accepts (`MAX_PLOIDY` of `src/core/project.ts`) |
| Only the variants with PASS or . in the FILTER column | `Checkbox`, a box ticked or not, since it takes effect at the next pick and not at once, which a `Switch`, a control drawn as a sliding switch that acts when it is flipped, would promise (`react.md`, "Widgets") | on | `onlyPassed` of `openVcf`, true by default: a variant whose FILTER column is neither `PASS` nor `.` is left out |

Under the ploidy, a line that the owner asked for on 25 September 2026,
and reworded the same day so that it does not read as if the
application read the file again by itself: "A VCF does not say its
ploidy, so it is given here. If it is wrong, the first analysis stops
with a message that names the line and the individual; set the right
ploidy here and read the file again." popnei
opens a VCF of the wrong ploidy without complaint, and refuses it at the
first genotype a pass reads. With `js-v0.1.0-dev.2`, on 25 September
2026, `e2e/fixtures/tetraploid.vcf.gz` opened with ploidy 2 gives 12
individuals and ploidy 2, and its first pass throws "line 5 of the VCF,
the column of t00: its genotype is of the ploidy 4 and the reader was
asked for the ploidy 2; popnei does not read a VCF whose genotypes are
of different ploidies, and the ploidy is an argument of the reader". The
diversity panel, and each check of this step, tells this refusal in the
words of `docs/specs/analyses/diversity.md` ("Its words", the row of a
genotype of another ploidy), which name the line, the individual and the
two ploidies; say, if every genotype of the file has the ploidy found,
to set it and read the file again; and then say that a file that mixes
ploidies, such as one with the X of males haploid among diploid
autosomes, cannot be read in this version. The line under the ploidy
says where that setting is, and the button below reads it again.

The two options are state of the step, not of the project, until the
pick, and are written into the source by the command of the pick; after
it, the card says what the file was read with. Each time the step is
drawn they start at the options of the VCF loaded, or, in a project
opened from a file with no variants file yet, at those of the
reference's VCF, as `docs/specs/core/projectFile.md` asks, since a VCF
read with another ploidy gives no comparison of its numbers; otherwise
at the defaults. So leaving the step, or an Undo, can set them back, and
what they hold always matches a file the project has or had.

**Reading the VCF again.** Once a VCF is loaded, when the two options
differ from those it was read with, a button appears under them that
names every option that differs, as the owner decided on 25 September
2026: "Read panel.vcf.gz again with ploidy 4" when only the ploidy
differs; "Read panel.vcf.gz again with every variant" or "Read
panel.vcf.gz again with only the variants with PASS or . in the FILTER
column" when only the choice of the passed variants does; and both,
"Read panel.vcf.gz again with ploidy 4 and every variant", when both
do. It makes a new load of the same `File`, with a new load id, through
`addFile` and `loadVariants`, as a pick does, with the description "the
variants file was read again with other options"; core allows it, since
what it refuses is a load that reuses the id of the load there with
other options. The owner decided on 25 September 2026 that it is in
stage 2, since a wrong ploidy is what a user of a polyploid meets first
and picking the file again means finding it again in the picker. A new
load is a new key for every analysis and restarts the calculation
worker, as a pick does (`docs/architecture.md`, section 5), and opening
the `File` again reads its header only. For an opened project, whose
variants file is the reference's and not a `File` of this page, there is
no button until a file is loaded. The button goes when the options are
set back to those of the file.

### The filters of the variants

Each filter is a switch, and, while it is on, its number fields under
it; turned off, the fields go, and turned on again, they have the value
of the table below. A filter that is off is not in the project. Each
field holds the number popnei is given, as typed, and not converted
from another number (`docs/specs/worker/protocol.md`): every filter keeps
what is at most its threshold, as popnei's do. The filters count over
every individual of the file, whatever the filters of the individuals,
which come after them (`docs/architecture.md`, section 2).

| switch | its fields | turned on at | popnei |
|---|---|---|---|
| Filter the variants by missing data | Maximum proportion of missing genotypes, from 0 to 1 | 0.1, and on in a new project | `filterByMissingData(maxAllowedMissingRate)` |
| Filter the variants by observed heterozygosity | Maximum observed heterozygosity, from 0 to 1 | 0.5 (**Open 1**) | `filterByObsHet(maxAllowedObsHet)` |
| Filter the variants by major allele frequency (MAF) | Maximum major allele frequency, from 0 to 1 | 0.95, the default of `docs/functionality.md`, section 3 | `filterByMaf(maxAllowedMaf)` |
| Prune the variants by linkage disequilibrium (LD) | Maximum r² with a variant kept before it, from 0 to 1; Distance within which variants are compared, in base pairs, from 1 | 0.3 and 10000 (**Open 1**) | `filterByLd(maxAllowedR2, maxDist)` |

In a new project only the missing data filter of the variants is on,
at 0.1, as the owner decided on 26 September 2026: the filter by
observed heterozygosity and the LD pruning are off, and so are the two
thresholds of the individuals, below, until the user turns them on. The
MAF filter is off in a new project of population genetics, and on at
0.95 for the PCA and the GWAS alone, inside them, from stage 4
(`docs/functionality.md`, section 3). The
threshold fields take numbers of two decimals, with a step of 0.01, as
the owner decided for the missing data filter on 25 September 2026, and
no buttons of their own to step them; the distance, a whole number from 1 to 9007199254740991, the range of
`filterByLd` (`js/popnei/src/variant.ts`), shown and typed with no comma
between thousands, so that what the field shows can be typed back.

Under three of the switches, a line says what popnei filters on, since a
label alone would mislead:

- missing data: "A genotype is missing when any of its alleles is, 0/.
  among them; the proportion is over every individual of the file." A
  genotype is missing when any of its alleles is, so `0/.` counts as
  missing (`js/popnei/src/variant.ts`).
- MAF: "The frequency of the commonest allele: 0.95 removes a variant
  whose commonest allele is above 0.95. For a variant of two alleles,
  that is a minor allele frequency below 0.05." The MAF is the major
  allele frequency, as the owner decided on 24 September 2026
  (`docs/functionality.md`, section 3), and a user who reads "MAF" as
  the minor one would set 0.05 and keep almost nothing.
- LD pruning: "Of two variants closer than the distance whose r² is
  above the maximum, the first is kept." popnei's `filterByLd` keeps the
  one that comes first, and compares a variant with those already kept
  on its chromosome within the distance.

The missing data filter is on from the start, with a threshold of 0.1,
plink's default for `--geno`, the same filter on the same proportion,
as the owner decided on 25 September 2026 (functionality's open point
4); `firstProject("popgen")` of `src/core/apps.ts` holds it. Each press
of an arrow key in a field is a commit, and so a command and a step of
Undo, which is what a user who presses it five times has done.

The filter of the regions of a BED file comes first among these, with
popnei's release that has it (`docs/architecture.md`, section 6).

**A number the fields do not take.** The owner decided on 25 September
2026 that a number field of this step never turns what was typed into
another number without a word. So a committed number outside the range
of its label, or with more decimals than the field takes, is refused: it
sends nothing, the field shows again the value it had, and a line under
the field says why, and what is kept. The noun of each field is the
threshold, the maximum r², the distance or the ploidy:

| typed | the line under the field |
|---|---|
| 10 in a threshold | "10 is more than 1; the threshold stays 0.1." |
| 0.125, or 0.001, in a threshold of the variants | "0.125 has more than two decimals; the threshold stays 0.1." |
| 0.12345 in a threshold of the individuals | "0.12345 has more than four decimals; the threshold stays 0.03." |
| 1.5 in the maximum r² | "1.5 is more than 1; the maximum r² stays 0.3." |
| 0 in the distance | "0 is less than 1; the distance stays 10000." |
| 2.5 in the distance | "2.5 is not a whole number; the distance stays 10000." |
| 300 in the ploidy | "300 is more than 255; the ploidy stays 2." |
| 0 in the ploidy | "0 is less than 1; the ploidy stays 2." |
| 2.5 in the ploidy | "2.5 is not a whole number; the ploidy stays 2." |

The number kept is the value the field had, the last one it took. The
line is announced when it appears, through the function the shell gives
the screens, since the focus is then on the field, after Enter, or on
the next element, after the Tab key, and a screen reader would read the
line in neither place; it is also the field's description, read with it
when the focus comes back. The line goes at the next commit of the
field, by Enter, the Tab key or an arrow key, whatever number is
committed then. That includes the number kept typed again, which is no
change of the project, so the field clears the line itself and does not
wait for a new value, which would never come. The line goes, too, when
the value of the field changes otherwise, by an Undo, a new load or the
switch.

A number with more decimals than the field takes is refused and not
rounded, as a number outside the range is: rounded, 0.001 and 0.004
would become 0, a filter that keeps only the variants with every
genotype called, where the user had asked for one almost as strict and
not that one. Refused, the filter stays as it was, and the user types the
number they mean. The option not taken was to round a half up, 0.125 to
0.13, and say so under the field, which would still make a command, a
step of Undo and a change of the results that the user did not ask for.
The decimals are counted on the number React Aria parsed, so that 0.10
and 0.1 are one number, of one decimal; an arrow key moves by the step
and gives no number to refuse.

**A character the fields do not take.** React Aria takes into a field
only what can start a number of its range, in English: digits and the
decimal point, and a minus sign where the range goes below 0, which no
field's does. Any other character typed is thrown away, with no word, so
that 0,1 typed key by key shows as 01 and would be committed as 1, 2,0
in the ploidy as 20, and 10,000 in the distance as 10000 or, where the
comma would read as a decimal mark, as another number. So a character
thrown away is caught as it is typed, and a line under the field says so
at once, and what is kept:

| typed | the line under the field |
|---|---|
| 0,1 in a threshold | "Write the decimals with a point, 0.1 and not 0,1; the threshold stays 0.1." |
| a minus sign, or a letter, in a threshold | "‘-’ cannot be typed in the threshold, which is written with digits and a point, as 0.05; the threshold stays 0.1." |
| 10,000 in the distance | "Write the distance as a whole number of base pairs, 10000 and not 10,000; the distance stays 10000." |
| a minus sign, or a letter, in the distance | "‘-’ cannot be typed in the distance, which is a whole number of base pairs, as 10000; the distance stays 10000." |
| 2,0 in the ploidy | "Write the ploidy as a whole number, 4 and not 4,0; the ploidy stays 2." |
| a minus sign, or a letter, in the ploidy | "‘-’ cannot be typed in the ploidy, which is a whole number, as 4; the ploidy stays 2." |

The example of the comma is always 0.1, 10000 or 4, and the number kept
the value the field had. A comma anywhere in what was typed gives the
line of the comma, as when 0,05 is pasted into the field; otherwise the
line names the first character thrown away, between ‘ and ’, a space as
"A space", with its control characters escaped. The next commit of the
field sends nothing, whatever the field shows, since what it shows is
not what was typed: the field shows again the value it had, and the line
stays until the commit after it. A deletion in the field before that
commit, the user mending what they typed, lets the commit take the
number again. The line is announced as the line of a number refused is.

A field left empty sends nothing and shows again the value it had, with
no line, since nothing was typed that could be taken for another number;
the same holds for the ploidy, which then keeps its value for the next
pick. Turned off and on, a filter goes back to its place in the fixed
order, since nothing moves a filter (`docs/specs/core/project.md`, "One
filter of each kind, in a fixed order").

**A file dropped while a ploidy is being typed.** A file dropped from
the desktop leaves the focus in the ploidy, which has not committed
what is typed, so the drop commits it first, as Enter would, and a VCF
is read with the ploidy the user typed. When the field refuses that
number, 300, or a character was thrown away as it was typed, the VCF is
read with the ploidy kept, the one the field shows again, and the line
under the field says so, "300 is more than 255; the ploidy stays 2.",
as after Enter; the card then says "Read with ploidy 2, …", and no
button to read the file again appears, since the options are those it
was read with. The line is announced when it appears, before the read
starts, so the status region reads it first and the end of the read
after it, as the shell announces every read (`docs/specs/shell.md`,
"The status region").

### The histograms beside the filters of the variants

The histograms of the variants are one check, with one button and one
set of states (`docs/specs/analyses/variantChecks.md`, "The panel"). Its
block, headed "Histograms of the variants", an `<h3>`, is the first thing
under the heading of the filters of the variants: the button "Calculate
the histograms of the variants", its running, removed and error states,
its warning, the caption "Over the 1,200 variants of panel.nei, before
any filter." and the line of the versions. Once they are calculated,
each histogram is drawn beside the filter it helps set, with that
filter's threshold marked when the filter is on
(`docs/specs/charts/histogram.md`):

- the observed heterozygosity, beside the filter by observed
  heterozygosity, and the expected heterozygosity, unbiased, after it,
  beside no filter, since comparing the two is how that filter is read;
- the major allele frequency, beside the MAF filter;
- the missing data filter and the LD pruning have none: the histogram of
  the proportion of missing genotypes of each variant comes with
  popnei's release that has it (`docs/architecture.md`, section 6, "What
  this asks of popnei", item 4), and the LD pruning keeps a variant by
  the variants kept before it, not by a number of its own.

The texts the histogram asks of the screen, beyond those of
`variantChecks.md`, its titles and descriptions:

| histogram | horizontal axis | vertical axis | the legend, with a threshold |
|---|---|---|---|
| major allele frequency | "Major allele frequency" | "Variants" | "Maximum 0.95"; "Kept by this filter"; "Removed by this filter" |
| observed heterozygosity | "Observed heterozygosity" | "Variants" | "Maximum 0.5"; "Kept by this filter"; "Removed by this filter" |
| expected heterozygosity | "Expected heterozygosity (unbiased)" | "Variants" | no threshold |

The legend says "this filter" and not the name of the filter, which is
the heading the histogram stands under: the legend is anchored at the
right edge of the plot, and at 320 pixels wide, the width of a phone,
"Removed by the filter by observed heterozygosity", about 300 pixels of
text of 12 pixels at an estimate of 6.5 pixels a character, would run
out of the left of a plot about 290 pixels wide; the flow checks the
legend at that width (below, "How it is checked").

**The plot and the table of its bins.** Each histogram is a block with
two tabs, React Aria's `Tabs`, a row of labels of which one shows its
panel at a time, as `.claude/skills/coding/react.md` has the results of
an analysis: "Plot", first and selected when the step is drawn, and
"Table of the bins", the table of `docs/specs/charts/histogram.md`,
"The numbers without the picture". The table has a header cell for each
column, "From", "To", "Variants", or "Individuals" for the histograms of
the individuals, and, with a threshold, "This filter", whose cells say
"Kept", "Partly kept" or "Removed"; the line above it says that each bin
runs from its lower edge up to its upper edge, not included, and that
the last includes its upper edge. Which tab is selected is state of the
screen, kept while the step is drawn. Under the two tabs, whichever is
selected, one button, "Download the bins as CSV", since every table of
the applications downloads as CSV (`docs/functionality.md`, section 9).
The plot itself has no button of download in stage 3: the owner decided
on 26 September 2026 that the plots are offered as SVG and PNG in stage
6, with the report, as `docs/build-order.md` has it, and the export is
built and tested now without a button
(`docs/specs/charts/plot2d.md`, "The export"; point C of
`docs/specs/stage-3-open-points.md`). The CSV is named
as the plot is, with `_bins`, `panel.variant_maf_bins.csv`; it has the
header `from,to,count,state`, a row per bin, the edges with every digit
popnei gave, as the diversity's CSV writes its numbers, and the state
`kept`, `partly_kept` or `removed`, empty with no threshold.

**The threshold typed and not yet committed.** The threshold on a
histogram follows the number the user types, as they type it, while it
is a number the field would take (the histogram spec, "What the user
sees"); the counts beside the filter, and the results, follow the number
committed. The typed number is state of the screen, dropped at each
commit. The number field of the widgets of stage 2 gives the step each
number as it is typed through a property more, `onTyped`, called at
each key with the number React Aria parses from the text, or `null`
while the text is no number, is out of the range of the field, or has
more decimals than it takes, as "0." on the way to "0.05"; the step
gives the histogram that number, or the threshold of the project for
`null`.

### What each filter of the variants kept

The counts are a check of their own (`docs/specs/analyses/filterCounts.md`,
"The Count button"). Beside each filter that is on, once counted for the
filters as they are: "Kept 1,152 of the 1,200 variants it was given."
Under the last filter, the button "Count the variants each filter
keeps", its running and error states, and, once counted, "1,128 of the
1,200 variants of panel.nei pass the filters." and, when a filter kept
none, the warning "The MAF filter kept none of the 1,152 variants it was
given, …" (`filterCounts.md`, "The warnings"). Without counts for the filters
as they are, the line "Not counted for these filters. Count, or run an
analysis, to see what each filter keeps." stands in place of the line of
the total, and nothing beside the filters. A change of any filter of the
variants takes every count off at once, and is in no notice
(`docs/architecture.md`, section 4, "The notice leaves the counts out");
an undo, or any calculation over the same filters, brings them back.
With no filter on, the Count gives the variants of the file, and the
line of the total reads "1,200 variants in panel.nei, with no filter."

### The filters of the individuals

In their fixed order, keep, remove, missing data, observed
heterozygosity (`docs/specs/core/project.md`): the two lists, then the
statistics of each individual, from which the two thresholds are set,
then the thresholds. Each individual is kept or removed as
`docs/specs/core/individualsKept.md` says: a threshold keeps an
individual whose number is at most it, and the filter by observed
heterozygosity removes an individual with no called genotype, as the
owner decided on 26 September 2026 (`docs/architecture.md`, section 13,
point 4).

**The two lists.** Each is a text area, a field of several lines of
text, React Aria's `TextField` with a `TextArea`, and two buttons:

| label of the text area | its line | buttons |
|---|---|---|
| Individuals to keep, one name per line | "Only the individuals of this list are kept. Leave it empty to keep every individual." | "Apply the list to keep", "Clear the list to keep" |
| Individuals to remove, one name per line | "The individuals of this list are removed." | "Apply the list to remove", "Clear the list to remove" |

Each line is a name, with the spaces and tabs at its ends taken off and
the empty lines dropped, so that a column copied from a spreadsheet, or
the text of a file of one name per line, can be pasted. Apply sends the
names in the order written, with `setIndividualFilter`, or, when there
is none, `removeIndividualFilter`; Clear empties the area and sends
`removeIndividualFilter`. So the screen never sends an empty list, and
the reason of an empty list of `individualListNeeds` comes only from a project
file. A list is applied with its button, and not at each key, because
every change of it is a command, a step of Undo and a change of the key
of every analysis that reads the filters of individuals, and a list half
typed would lock them with the reason of a name not in the file.

The text of each area is state of the step until it is applied. It
starts, each time the step is drawn and after an Undo or a Redo, at the
list of the project, one name per line, so that it always shows a list
the project has or had. While it differs from the list applied, a line
under it says so: "This list is not applied yet; Apply the list to keep
applies it.", or "… Apply the list to remove applies it."

A list with a name repeated, or a name that is not in the variants file,
is applied as written, and `individualListNeeds` gives its reason,
with the list it is about, `keep` or `remove`, which locks every
analysis that reads the filters of individuals, the diversity among
them, and the writing of the file, and not the three checks of this
step, which read none (`docs/specs/core/project.md`, "What an analysis
needs of every project"): "The list of individuals to keep names 2
individuals that are not in panel.nei: ind_900 and ind_901. Change the
list, or remove the filter, in the Variants step." The step shows that
reason whole, under the text area of the list it names, and the stepper
shows it too (`docs/specs/shell.md`, "The stepper"). Its end is the one
the owner decided on 26 September 2026 until they see the step (point D
of `docs/specs/stage-3-open-points.md`); "remove the filter" is Clear
here.

**The statistics of each individual.** Its block, headed "Statistics of
each individual", an `<h3>`, comes after the lists
(`docs/specs/analyses/individualChecks.md`, "The panel"): the button
"Calculate the statistics of each individual", its running, removed and
error states, its warning, the caption, and the line of the versions.
Once they are calculated, its two histograms are drawn beside the two
thresholds, below, and its table and its download after them.

**The two thresholds.** As the filters of the variants, a switch and a
number field, with the refusals above:

| switch | its field | turned on at |
|---|---|---|
| Filter the individuals by missing data | Maximum proportion of missing genotypes of an individual, from 0 to 1 | 0.1, plink's default for `--mind`, as the owner decided on 26 September 2026 |
| Filter the individuals by observed heterozygosity | Maximum observed heterozygosity of an individual, from 0 to 1 | 0.5 (**Open 1**) |

Both are off in a new project, as the owner decided on 26 September
2026. Their fields take numbers of four decimals, with a step of 0.01 for the
arrow keys: the proportions of missing genotypes of the individuals of
`panel.nei` lie from 0.0165 to 0.0434 with the missing data filter at
0.05 (`docs/specs/core/individualsKept.md`), where two decimals would
give three thresholds, and the table shows four. The number field of the
widgets of stage 2 takes a number committed only when it is a multiple of
its step, so 0.0312 would be refused by a step of 0.01; it is given a
property more, `decimals`, the most decimals a number committed may
have, 4 here and 2 for the thresholds of the variants, apart from its
`step`, which is then only what an arrow key moves by. With no
`decimals` the field keeps the rule of stage 2, the decimals of its
step, so the fields of stage 2 do not change. Under the second: "An
individual with no called genotype has no observed heterozygosity, and
this filter removes it."

Beside each, its histogram of `individualChecks.md`, with the threshold
marked when the filter is on and following the number typed as above;
its axes "Proportion of missing genotypes" or "Observed heterozygosity",
and "Individuals"; its legend "Maximum 0.03", "Kept by this filter",
"Removed by this filter"; the table of its bins and its button of the CSV, as those of the
variants. Before the statistics are calculated, or once
a change of a filter of the variants has removed them, there is no
histogram, and the line of the counts below says why.

**The table of the individuals** follows the thresholds, with its
column Kept while any filter of individuals is set, and its download
(`individualChecks.md`, "What it shows").

**What each filter of the individuals kept**, from `individualsKept`,
with no pass. Beside each filter that is set: "Kept 125 of the 200
individuals it was given." A threshold whose statistics are not in the
page, and each filter after it, has instead "Known once the statistics
of each individual are calculated for these filters of the variants."
Under the last filter, the individuals that pass them all: "119 of the
200 individuals of panel.nei pass the filters.", or, when they keep
none, the reason `keptNoneReason` gives, "The filters of individuals
keep none of the 200 individuals of panel.nei. Loosen them in the
Variants step.", which locks every analysis that reads them and the
writing of the file (`docs/specs/core/store.md`, "The state of an
analysis"). With a threshold set and no statistics, a Run of an analysis
that reads the filters of individuals calculates them first, and so
does the writing of the file. The step says nothing more of it here,
since what waits says so where the user pressed: the panel of the
diversity in the Analyses step, or the part of the writing below, shows
"Calculating the statistics of each individual, which the filters of
individuals are set from" while they are calculated.

### Writing the filtered variants

The last section, `docs/specs/analyses/writeVariants.md`, "The step's
part", whose states and words it shows: the button "Write the filtered
variants as a .nei file", with the size expected, "About 20.8 MB: 20,000
variants of 1,000 individuals.", the variants kept times the individuals
kept at one byte each and 40 bytes more; above the button, when the size expected is 500
MB or more, the warning that the tab may not hold the file while it is
written; its progress and Stop; the button "Save panel.filtered.nei,
19.2 MB" once written, the size of the file popnei wrote, 19,161,178
bytes; and what it says once saved, dropped or failed. A change of a
filter while a file written waits to be saved, one press of an arrow key
in a threshold among them, discards the file, and the notice of the
change says that Undo does not bring it back (point G of
`docs/specs/stage-3-open-points.md`). The size expected is made from the counts of
the variants and the individuals kept that the two sections above show,
so a user who reads it too large sees there which filter to tighten.

The writing of a VCF, bgzipped, comes with popnei's release that has a
writer of it (`docs/architecture.md`, section 6, "The files written"),
as a second button of this section.

## The states

The step is not one analysis: it holds three checks, the writing of a
file, and the filters, which need no calculation. Each calculating part
is in the state the store gives it, with the table of its own spec; the
step as a whole:

| state | what the user sees | what they can do |
|---|---|---|
| empty | cannot happen: with no file, the step offers the pick and the filters, which is the ready state | — |
| locked | cannot happen for the step: nothing has to be done before a file is picked. A file picked before the calculation worker has started is read once it has. The writing is locked when `individualListNeeds` gives a reason, with the reason beside its button, or when the filters keep no individual; the three checks read no filter of individuals and are never locked once the file is read | fix the list, or loosen the thresholds |
| ready | no file: the zone, "Choose a variants file…", the options of a VCF, the filters, and in place of the checks the line of a file not read. With an opened project file, the file it was made with, below. With a file read: every part, each check with its button | pick a file; set the filters; calculate a check; count; write |
| running | the read: the card with its name, format and size, "Reading panel.nei." and the seconds since the step saw the read start, which the step keeps and loses when it is left; no progress bar, since the read is of the header of a VCF, or the end of a `.nei` file, which popnei tells to nobody (`js/popnei/src/variant.ts`, `onProgress`). A check, the Count or the writing: its bar and its clock in its own part, the rest of the step as it was | during the read: pick another file, which replaces this one; Undo; set the filters. During a calculation: Stop it; set the filters, which leaves it behind, as the notice says |
| done | the card with the individuals, the ploidy of a `.nei` file, the number of variants once counted, how a VCF was read; each check done beside its filters, the counts, the Save button | replace the file; set the filters; sort and download the table; download the bins of a histogram as CSV; save the file |
| results removed | the words of the change in the block of the check removed; its histograms, or its table, gone. A change of a filter of the variants removes the statistics of each individual, and the notice of the shell says so; the counts are never in the notice, and show the line of no counts | Calculate again; the Undo or Redo of the notice |
| error | the card with the reason the file was not read, below; or a check or the writing failed, with its words in its part | what the reason says: pick a file, or, when the calculations could not start or the page is out of date, reload the page; loosen the filters when they kept no variant |

A read that takes long cannot be cancelled with a button. Picking
another file, or Undo, replaces the load. The calculation worker is
started again for the next load, and starting it again ends the read of
the old one, and every calculation of the step in flight
(`docs/architecture.md`, section 5).

The parts of the step do not wait for one another. Calculating the
histograms of the variants, the counts and the statistics are three
passes, which the one calculation worker makes one after the other when
they are asked together; the statistics of each individual also fill the
counts of the same filters (`filterCounts.md`, "Which results fill it"),
so a user who calculates them needs no Count.

## What it sends and reads

It reads, of the state of the store, `project.variants`,
`project.filters`, `project.individualFilters` and `project.reference`;
`individualsKept`; `write`; the status of `variantChecks`,
`filterCounts` and `individualChecks` among `analyses`, and the
calculations in flight that the store lists, `runs`, for their progress;
`variantsStepNeeds` and `individualListNeeds` of the
project, the functions of core that give, in words, the reason of a
variants file being read or not read and of a list of individuals that
popnei would refuse, with the list it is about; and `writtenName`,
`writeEstimate` and `sizeText` of `docs/specs/analyses/writeVariants.md`,
"The functions of core", for the name and the sizes of the file. It sends:

| action | command | description |
|---|---|---|
| a file picked or dropped | `loadVariants(p, { fileId, name, size, format, readOptions })`, `readOptions` `{ ploidy, onlyPassed }` for a VCF and `null` for a `.nei` file | "a new variants file was loaded" |
| Read ‹name› again | `loadVariants` of the same `File` under a new load id, with the options of the step | "the variants file was read again with other options" |
| a threshold of the variants committed, on Enter, an arrow key or when the field loses the focus | `setVariantFilter(p, filter)`, the filter of its kind with its fields | "the missing data filter changed", "the filter by observed heterozygosity changed", "the MAF filter changed", "the LD pruning changed" |
| its switch turned off | `removeVariantFilter(p, kind)` | "the missing data filter was turned off", and so for each |
| its switch turned on | `setVariantFilter(p, filter)`, with the values of the table of the filters | "the missing data filter was turned on", and so for each |
| Apply the list to keep, or to remove | `setIndividualFilter(p, { kind: "keep", individuals })`, or `removeIndividualFilter(p, "keep")` for no name | "the list of individuals to keep changed", "the list of individuals to remove changed" |
| Clear the list | `removeIndividualFilter(p, kind)` | "the list of individuals to keep was cleared", "… to remove was cleared" |
| a threshold of the individuals committed, turned off, turned on | `setIndividualFilter` or `removeIndividualFilter` of `missing_data` or `obs_het` | "the filter of individuals by missing data changed", "… was turned off", "… was turned on"; "the filter of individuals by observed heterozygosity changed", and so on |
| Calculate, of a check; Count | `startAnalysis(store, id)` of `src/ui/runs.ts`, with `variantChecks`, `individualChecks` or `filterCounts` | — |
| Stop, of a check or the Count | `store.cancelRun(id)` | — |
| Write the filtered variants | `startWriting(store, "nei")` of `src/ui/runs.ts` | — |
| Stop, of the writing | `store.cancelWrite()` | — |
| Save ‹name›, ‹size› | `saveWritten(name)` of `src/ui/saving.ts` (`docs/specs/entry.md`, "A file of the filtered variants saved") | — |

The names of the filters in the descriptions are those of the words of
`filterCounts`, so that a notice and a warning name a filter alike.
Before the command of a pick, or of a read again, which passes the
`File` of the load there, which `fileOf(fileId)` of `src/ui/files.tsx`
gives from the page's map of files, the step calls `addFile(file)` of
`src/ui/files.tsx`, which makes the load id and puts the `File` into the
map of the worker client under it (`docs/specs/entry.md`, "At the
opening"); the entry of the page then asks the calculation worker to
open it, and the store records what it read (`docs/architecture.md`,
section 6, "Who asks for a read"). The step does not read the file and
holds nothing of the project: the text of the two lists not yet applied,
the numbers typed and not committed, the lines of a number refused and
the options of a VCF not yet read are the screen's.

## Its words

The descriptions of the commands are in the table above, the words of
each check and of the writing in their specs, and those of the filters
in their sections. The rest:

- **A file of another name**: "panel.txt was not loaded: the Variants
  step reads a VCF, whose name ends in .vcf, .vcf.gz or .vcf.bgz, or a
  .nei file. If it is one of them, rename it." It, "Load one variants
  file at a time." and the words of a drop or a paste that holds no
  file, above, stay until the next pick, or until an Undo, a Redo or an
  opening changes the variants file of the project or the file an opened
  project was made with, so that they are never shown beside the words
  of another file; they are the screen's, not the project's.
- **Reading**: "Reading panel.nei.", the reason `variantsStepNeeds`
  gives.
- **A file popnei refused**: the reason `variantsStepNeeds` of
  `src/core/project.ts` gives, shown whole, "popnei could not read
  bad.vcf: the source is not a VCF: it starts with `This is a line o`.
  Choose another file." It is the reason every analysis shows beside its
  Run button, the one `projectNeeds` gives, with another end: beside a
  Run button the words send the user to the Variants step, and in this
  step, beside the button "Replace bad.vcf…", they say what to do with
  that button, as the owner decided on 25 September 2026
  (`docs/specs/core/project.md`, "What an analysis needs of every
  project"). The message quoted is popnei's for `e2e/fixtures/bad.vcf`,
  seen under node on 25 September 2026.
- **A file the browser can no longer read**, changed, moved or deleted
  on the disk after it was picked, which the worker answers
  `reopenFailed`: "panel.nei could not be read; it may have changed on
  the disk since it was picked. Choose it again.", the words the owner
  decided on 25 September 2026 (point B of
  `docs/specs/stage-2-open-points.md`) with the end of this step. The
  same file changed after it was read shows at the next calculation, in
  the words of the panel (`docs/specs/analyses/diversity.md`, "Its
  words").
- **A file whose read stopped because the calculation worker failed**:
  "panel.nei could not be read: the calculation stopped unexpectedly.
  Choose it again."; when the calculations could not start, or the page
  is out of date, "… Reload the page and choose it again.". What
  happened is said in the words of `docs/specs/core/project.md`, Open
  4.
- **No variants file read**, in place of the checks: "The histograms,
  the counts and the statistics of each individual are calculated once a
  variants file is read."
- **The lines under the filters, the lists and the counts**: in their
  sections, above.
- **The line under the ploidy**, and the button that reads the VCF
  again, above.

### A project file opened

A project file keeps the settings and not the variants file, which a
browser cannot open by itself, so an opened project has no variants file
and holds what its file said of the one it was made with, its
`reference` (`docs/specs/core/project.md`, "The project of an opened
project file"). The step shows, above the zone, the text of
`askedFileText` of `src/core/projectFile.ts`, and the options of a VCF
start at the reference's, above. The words, and what is left out when
the project was saved before its file was read or counted, are
`docs/specs/core/projectFile.md`'s. The filters and the lists are those
of the file; the results of the checks are not in it, so a threshold of
the individuals waits for its statistics until they are calculated for
the new load (`individualsKept.md`, "The cases").

Once a file is given, the step shows beside its card the warning
`identityWarning` of the same module gives, a warning and not a refusal,
after the word "Warning:". What it compares, and its words, are
`docs/specs/core/projectFile.md`'s ("The comparisons after an
opening"); it is made again at every change, so it is complete once the
file is read. Of the read options, the choice of the passed variants is
compared there, and the ploidy with the individuals once the file is
read, as the owner decided on 25 September 2026: a VCF read with the
other choice gives other variants, as another ploidy gives other
genotypes. The numbers of a run on a VCF read with other options than
the reference's, or on a file of the other format, a VCF given to a
project made with a `.nei` file or the other way round, are not compared
with those of the project file, and the panel of each analysis says so
under its result, with `uncomparedText` of the same module.

A Save writes the options of the project, not those of the step
(`docs/specs/core/projectFile.md`, "What is written of each part"): a
ploidy typed and not applied is not saved, nor a list not applied; and
once "Read panel.vcf.gz again with ploidy 4" is pressed, a Save before
that read ends writes ploidy 4.

### The help drawer

In stage 8 (`docs/build-order.md`), a few lines for the step: what the
step reads, a VCF or a `.nei` file; that a VCF's ploidy is given and not
read, with what a wrong one gives; that only the variants with PASS or
`.` in the FILTER column are read by default, a `.` saying that no
filter was applied to that variant; what each filter keeps, in their
fixed order, over every individual of the file, and that the MAF is of
the major allele; that the histograms of the variants are over the file
as read, and the statistics of each individual over the variants the
filters keep; that the file is read from the disk at every analysis, and
not copied into the browser, so a file of any size opens, a large
gzipped VCF is slow to read at each analysis, which writing it once as a
`.nei` file mends, and a file changed on the disk after it was picked
has to be loaded again, since the application may not notice the change
(`docs/specs/stage-2-open-points.md`, point R); and, for those who work
in Python, the code that does the same: `popnei.open_vcf(path, ploidy=2,
only_passed=True)` or `popnei.open_vars(path)`, then
`variants.filter_by_missing_data(0.1)` and the other filters. Until then
nothing on the screen says the things the lines above do not.

## Accessibility

- The keyboard goes through the step in the order of its parts: the
  zone's hidden button that takes a pasted file, the file button, the
  ploidy, the checkbox of the passed variants, the button that reads the
  VCF again when it is there; the button of the histograms of the
  variants; each filter of the variants, its switch, its fields, and its
  histogram: the row of its two tabs, one stop of the Tab key, whose
  arrow keys move between "Plot" and "Table of the bins"; then the panel
  of the tab selected, the plot, which is no stop, or the table of the
  bins, one stop; then its button of the CSV of the bins; the Count button;
  each list, its text area and its two buttons; the button of the
  statistics; each threshold, its switch, its field and its histogram,
  in the same order; the table of the individuals, which the Tab key
  enters once, as React Aria's `Table`, a table moved through with the
  arrow keys, whose headers sort it with Enter; its download; the button
  to write, and Save. When the button that reads the VCF again goes, after it was
  pressed, the focus moves to the file button, which is in every state.
- A warning or an error sits in the order of the text beside what it is
  about, and is text, "Warning:", as well as its colour and its icon
  (WCAG 2.2, success criterion 1.4.1).
- Each section is a region named by its heading, so that a screen reader
  jumps between the file, the filters of the variants, the filters of
  the individuals and the writing. The drop zone is in the region
  "Variants file", which holds the zone and the message of a file not
  loaded; the button in the zone is the way to pick without dragging
  (2.1.1).
- Each field of a filter is described, the text a screen reader reads
  after the label of the field, set with `aria-describedby`, by the line of
  a number refused when there is one, then by the count of its filter,
  "Kept 1,152 of the 1,200 variants it was given.", then by the line
  under its switch, so that a user who moves to a field hears what it
  kept before the advice; the line under the ploidy, 190 characters, is
  the last part of the ploidy's description, after the line of a number
  refused. A text area is described by its line of not applied, then by
  its count.
- Announced without moving the focus, through the function the shell
  gives the screens (`docs/specs/shell.md`, "The status region"): the
  messages of a file not loaded, and the line of a number a field
  refused or of a character it threw away. Announced by the shell from
  the state of the store, and not by this step, which may not be on the
  screen when they happen: the end of a read; the start, the end and the
  stop of each check, of the Count and of the writing; and the warning
  of a reopened project that differs from its file, when it appears or
  comes with another load, so that it is heard also when an Undo or a
  Redo on another step brings it back.
- The counts beside a filter change without the focus on them when the
  user commits a threshold; they are not announced, since a user who
  moves the threshold is on its field and hears the count as its
  description; after a Count, the shell announces the variants that
  pass.
- When a check ends done, its button goes; if the focus was on it, the
  focus moves to the heading of its block, as the diversity's does
  (`docs/specs/analyses/diversity.md`, "Accessibility"). When the Count
  ends done with the focus on its button, the focus moves to the line of
  the variants that pass, which takes the focus for that and is not a
  stop of the Tab key. The Save button takes the focus when a write ends
  with the focus on the button that asked for it (`writeVariants.md`).
- Each histogram is an image with its title and description, and the
  table of its bins beside it, as `docs/specs/charts/histogram.md` has
  it; its threshold is also said in words beside it, "Threshold of the
  MAF filter: 0.95", and what each bin keeps is a word of the table,
  never the fill of a bar alone (1.4.1). The column Kept of the table of
  the individuals is a word, "kept" or "removed".
- The disabled button of the writing, locked by a list of individuals
  or by the individuals kept, is described by its reason, which is text beside it, since a disabled button is not a stop
  of the Tab key and a user of the keyboard would not learn why.

## How it is checked

In the flow of the tests in the browser, the steps a user takes, done by
Playwright, the program that drives Chromium, Firefox and WebKit, the
engines of Chrome, Firefox and Safari, as a user would
(`.claude/skills/coding/testing.md`).

Of stage 2, kept: `panel.nei` picked with the button, and then a file
dropped, with the focus still on the button after each;
`tetraploid.vcf.gz` loaded with ploidy 2, the card showing 12
individuals and "Read with ploidy 2, …", the diversity panel showing its
words for the wrong ploidy, then the ploidy set to 4, the button "Read
tetraploid.vcf.gz again with ploidy 4" pressed, the card showing "Read
with ploidy 4, …" and no line "Ploidy 4", and the diversity run; the
button's words with both options changed; `bad.vcf` and its reason,
ending "Choose another file."; a file named `panel.txt` and its message;
a piece of text dropped, and its message, and a piece of text pasted
into the zone's button, and the same message; 10 and 0.125 typed in the
threshold, and 300, 0 and 2.5 in the ploidy, each with its line, the
value kept and the line announced; 0,1 and 0,2 typed key by key in the
threshold, and 2,0 in the ploidy, each with the line of the comma and
the value kept; the value kept typed back, and an arrow key at a bound,
each taking the line away; tetraploid.vcf.gz dropped with 300 typed in
the ploidy and not committed, read with ploidy 2 and the line of 300
shown and announced; and the text of the status region after each read.
A script cannot put a folder into a drop, so the flow drops a file whose
entry of the file system says it is a folder, which is what React Aria
asks of each item; the function that tells what a drop held is checked
in node as well.

Of stage 3, on `e2e/fixtures/panel.nei`, 1,200 variants of 200 diploid
individuals, with the numbers of the module specs, which popnei's
release `js-v0.1.0-dev.2` gave in node on 26 September 2026:

- before a file, the line in place of the checks, and the filters
  settable; the histograms of the variants calculated, the mean of the
  MAF read as 0.7163, and still there after the missing data filter is
  set to 0.05; the threshold line of the MAF histogram moving as 0.9 is
  typed, before Enter;
- with the missing data filter at 0.05, Count: "Kept 1,152 of the 1,200
  variants it was given." and the field of the filter described by it;
  the filter by heterozygosity at 0.9 and the MAF filter at 0.95, the
  counts gone, and after Count the filter by heterozygosity keeping
  1,152 of 1,152 and the MAF filter 1,128 of 1,152, and
  "1,128 of the 1,200 variants of panel.nei pass the filters."; an undo
  bringing back the counts of the filter before, with no calculation;
- the filters back to the missing data filter at 0.05 alone, the
  statistics of each individual calculated, `s000` read as 0.0260 and
  0.3672; the thresholds of the individuals at 0.03 and 0.38, "Kept 125
  of the 200 individuals it was given.", then 119 of 125, "119 of the
  200 individuals of panel.nei pass the filters.", the column Kept, and
  0.12345 refused with its line; the missing data filter of the variants
  moved, the statistics removed with the notice, and the counts of the
  thresholds "Known once …"; an undo, and the statistics back;
- a list to keep with `ind_900` applied, and the reason of a name not in
  the file under the lists and beside each disabled button; the list
  cleared, and the reason gone; a list typed and not applied, with its
  line, and an Undo putting the text back to the list applied;
- with the thresholds at 0.03 and 0.38, Write, Save, and the download
  read: `panel.filtered.nei`, 170,042 bytes (`writeVariants.md`);
- no button that downloads a histogram as SVG or PNG on the step; the
  CSV of the bins of the MAF, `panel.variant_maf_bins.csv`, its header and 40
  rows, the 39th `0.9500000000000001,0.9750000000000001,22,` with no
  threshold, the edges as popnei gave them; the table of the bins reached with the keyboard, its tab
  selected with the arrow keys;
- the table of the individuals sorted with the keyboard alone, and its
  CSV downloaded, as `individualChecks.md` has them;
- at 320 pixels wide, the legend of each histogram inside its plot, in
  the three engines.

The check of axe, a program that finds the failures of accessibility a
program can see, the missing names and the contrasts among them, in each
state of the table of the states. A screen reader,
VoiceOver with Safari at least, is tried on a field of a filter with its
count, a histogram and its table of bins, the table of the individuals
and a list, which are new widgets of this stage (`react.md`,
"Accessibility review"). The screen is seen, in the three engines, as
`CLAUDE.md` asks, at 320 px wide and on a wide screen.

## Left for the running application

Whether each histogram sits beside its filter or under it, and at what
width they go one under the other; the size of the histograms and of the
text areas; whether a section can be folded once it is set; the format
of the sizes; the icons; whether the options of a VCF sit beside the
zone. Whether the table of the individuals draws only its rows on the
screen is set by the measurement of `individualChecks.md`.

## What this spec relies on in the other specs

- `docs/specs/shell.md`: the step is drawn in its `<main>` with one
  `<h1>`, "Variants"; the shell writes the notice from the description
  of a command, and the notice of a new load says the calculations it
  stopped; it announces the ends of the reads and of the calculations
  from the state, and gives the steps `announce` for what they announce
  themselves; its stepper shows the reason of a list of individuals.
- `docs/specs/entry.md`: `firstProject("popgen")` of `src/core/apps.ts`
  holds the missing data filter at 0.1; `addFile(file)` and
  `fileOf(fileId)` of `src/ui/files.tsx`; `startAnalysis`, `startWriting`
  and `saveWritten`; after every change the entry asks for the read of a
  pending source, and records a refusal of popnei at the open as `{ kind:
  "popnei", message }`; `apps.ts` puts the three checks and the writing
  in this step.
- `docs/specs/worker/client.md`: the calculation worker started again for
  a new load, which ends a read and every calculation of the old one
  still under way.
- `docs/specs/worker/runner.md`, `docs/specs/entry.md` and
  `docs/specs/worker/protocol.md`: the open of the file gives the
  individuals and the ploidy; the number of variants recorded, through
  `countsOf` of `apps.ts` and `passStats` of every result, is the
  variants of the file before the filters of the application,
  `varsProcessed` of the first filter of the pass or its `numVars` when
  it has none.
- `docs/specs/core/project.md`: the four filters of the variants and of
  the individuals in their fixed order, the commands that set and remove
  them, and the reasons of `individualListNeeds` for a list, with the
  list each is about.
- `docs/specs/core/individualsKept.md` and `docs/specs/core/store.md`:
  `individualsKept` in the state, with the counts of each filter of
  individuals, `null` where they need the statistics; `keptNoneReason`;
  the lock of the writing; `write` and its states.
- `docs/specs/analyses/variantChecks.md`, `filterCounts.md`,
  `individualChecks.md` and `writeVariants.md`: the parts placed here,
  with their states and words; `docs/specs/charts/histogram.md`, the
  histogram with its threshold and its table of bins, on the base of
  the 2D plots of `docs/specs/charts/plot2d.md`.
- The number field of `src/ui/widgets/`, of stage 2: the properties
  `decimals` and `onTyped` above, which the plan adds to it.
- `docs/specs/analyses/diversity.md`: a refusal of popnei in the pass is
  its error state, with a row of its own for a genotype of another
  ploidy, whose words the checks of this step take.
- `docs/specs/core/projectFile.md`: an opened project has `variants:
  null` and its `reference`; `askedFileText` and `identityWarning` give
  the words shown above, and the read options of a VCF start at the
  reference's.

## Open points

The open points of the specs of stage 3 are gathered in
`docs/specs/stage-3-open-points.md`. This spec added one, point F there,
which the owner answered in part on 26 September 2026:

1. **The values at which a filter starts when it is turned on.**
   Decided: in a new project only the missing data filter of the
   variants is on, at 0.1, as before; the filter by observed
   heterozygosity of the variants, the LD pruning and the two thresholds
   of the individuals are off until the user turns them on; and the
   missing data filter of the individuals starts at 0.1 when it is
   turned on. The values at which the three others start, which the
   owner left as they are on 26 September 2026: the observed heterozygosity
   of the variants at 0.5, the LD pruning at an r² of 0.3 over 10000
   base pairs, and the observed heterozygosity of the individuals at
   0.5. popnei gives no default for any of them. Point F has the
   options.

The other points of stage 3 that this spec meets were decided by the
owner on 26 September 2026, and are written above as decided: point C,
the download of the histograms as SVG and PNG, which waits for stage 6,
so the step has no button for it, and keeps the CSV of the bins; point
D, the ends of the reasons of a list, those of `project.md`'s first
draft until the owner sees the step at the stop of the plan where the
screens are tried; point G, the file written and not saved that a change
of its filters discards, with the notice that says so; and point I,
what the description of each histogram counts, the variants or the
individuals in the bins. The two points of stage 2 were decided by the
owner on 25 September 2026: the button that reads a VCF again with
other options, in stage 2 (point M of
`docs/specs/stage-2-open-points.md`), and the missing data filter on at
0.1 (point N).

## Not in this spec

- The filter of the regions of a BED file, first among the filters, and
  the BED file it reads; the histogram of the proportion of missing
  genotypes of each variant, beside the missing data filter; the writer
  of the VCF; the chromosomes of the file with the density of variants
  along each: with popnei's releases that have them
  (`docs/architecture.md`, section 6, "What this asks of popnei").
- The notice, its words and its Undo; the stepper and the summary line:
  `docs/specs/shell.md`.
- The states and the words of each check and of the writing: their
  specs, under `docs/specs/analyses/`.
- A list of individuals read from a file, or made from the rows of the
  table: a list is typed or pasted in this version.
- What the worker does with the file: `docs/specs/worker/runner.md`.
- The project file and the check numbers: `docs/specs/core/projectFile.md`.
- The help drawer, in stage 8, with the lines of "The help drawer" above.
