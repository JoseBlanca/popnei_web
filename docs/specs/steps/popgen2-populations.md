# popgen2.html: the Populations tab, the diversity of each population and its spectrum

The screen spec of the Populations tab of `popgen2.html`: the diversity
of each population, with its folded site frequency spectrum, calculated
by one Run and, from then on, calculated again by itself after each
change of what it reads, beside the PCA, which already does so. It
develops the design `docs/designs/population-tab.md`, approved by the
owner on 11 October 2026 with the recommendations of its two open
points (Stop in a tab stops that analysis and the band adds "Stop all";
the column of the populations and the individuals file greyed while
the diversity runs), and section 6 of `docs/functionality.md`,
"Diversity" and "The site frequency spectrum". It covers steps 2, 3 and
6 of case 4 of `docs/use-cases.md`, "Characterise populations and the
distances between them", the first of the three pieces of that case.
Written on 11 October 2026, before any code; its plan is
`docs/plans/population-tab.md`. Approved by the owner on 11 October
2026, with their answer to its one open point (below, "Open points").
The name of
the one population and what "None" chosen does were settled by the session
on 11 October 2026 from the owner's earlier decisions (below, "The
populations it runs on").

Corrected on 11 October 2026 after the review of work package 1 of
the plan: a failure that ends the diversity's live state has its own
line, which does not say "Stopped", since the user pressed no Stop
("Its words"); the line of the one population says what it does to F
when it stands for a file or a column the user opened ("The populations
it runs on"); `autoRuns.run` answers "kept" when the store starts
nothing for the diversity ("Accessibility" and "How it is checked");
until the band offered Stop all, which it does from work package 4,
built on 11 October 2026, the words of the locks named the Stop of
each tab in its place ("While the diversity runs"); and the
line of the draw is a line of its own, under that of the versions
("The result"); and the code of the whole tab, not only of its result,
is downloaded when the tab is first shown ("The result", its code).

Built on the branch `population-tab` on 11 and 12 October 2026, work
packages 1 to 4 of `docs/plans/population-tab.md`, and not yet tried
by the owner. The rounds of review of those packages changed, beside
the corrections above, the line after a Stop, which names Run only
where the tab shows it; the lock of the populations, which names the
diversity alone, since the PCA reads no populations; and the start by
itself said in the status region, which names the populations beside
the filters; each where this spec says so, with its date.

Revised on 12 October 2026 for the owner's first round of trying the
tab (`docs/plans/population-tab.md`, "Work package 7, round 1"): the
spectrum is one plot of lines, a line per population, in place of a
histogram per population, with one "Download…" of its own; and the band
at the top of the page counts the spectrum's warning with the result's
warnings, its link giving that warning the focus when it is the only
one (`docs/specs/steps/popgen2-band.md`). The bar plots of the table
come in the same round, in their own revision of this spec.

Revised again on 12 October 2026, the same round of the owner: below
the table, five bar plots, one for each of five of its columns, so that
the populations are compared at a glance; each a bar per population in
the colour of its line in the spectrum, with its own "Download…"
("The result", the plots of the table). The plot is
`docs/specs/charts/bars.md`.

Revised on 12 October 2026 for the LD decay, piece 2 of case 4
(`docs/plans/ld-decay-tab.md`, phase 1): the tab gains, after the
diversity and its spectrum, the LD decay of each population under its
own `<h2>`, calculated again by itself after its first Run as the
diversity is, last in the order of the page. Its part is the section
"The LD decay", below, which gives in full what it shows, its states,
its words and how it is checked; the owner's decisions it takes are the
plan's "Decisions already made". The specs that change with it the
same day: `docs/specs/analyses/ldDecay.md`, "On popgen2.html";
`popgen2-pca.md`, "Several analyses calculated again by themselves";
`popgen2-band.md`, "Several live analyses". Written by the session
before the code, which the owner decided on 12 October 2026 to build
without stopping for the approval of the spec, and to check in the
running page.

The tab is the diversity panel of the old page, `popgen.html`, which is
built and which the owner tried and accepted on 1 October 2026: its
screen spec is the second half of `docs/specs/analyses/diversity.md`,
"The panel", and that of its spectrum `docs/specs/analyses/sfs.md`,
"The block of the panel". This spec says what is the same by pointing
there, and gives in full what differs. The specs it reads, revised for
it the same day:

- the diversity of this page, its populations, its locks, its words and
  its downloads: `docs/specs/analyses/diversity.md` and `sfs.md`, "On
  popgen2.html";
- the rules of several analyses calculated again by themselves, their
  order, the state waiting and Stop all:
  `docs/specs/steps/popgen2-pca.md`, "Several analyses calculated again
  by themselves";
- the band at the top of the page, which names the diversity running,
  waiting or about to start: `docs/specs/steps/popgen2-band.md`;
- the box of the individuals file greyed while the diversity runs:
  `docs/specs/steps/popgen2-input.md`, "While the diversity runs";
- the download of the filtered variants, which waits for the diversity
  too: `docs/specs/steps/popgen2-download.md`.

## The terms

The terms of `popgen2-pca.md` hold here: **the one pass**, **live**,
**the quiet second**, **a change under way**, **about to start**, **the
lock**, **the status region**, **the focus**, **a tab**, **greyed**.
And these:

- **The diversity** is one analysis that gives the table of the
  diversity of each population and the spectrum of each, from one
  request of the calculation worker, two passes over the variants file
  (`docs/specs/analyses/diversity.md`, "The request").
- **Waiting**: the diversity live, its values settled and its quiet
  second run out, and not running because another calculation runs.
  Its tab names the analysis it waits for.
- **Unclassified**: an individual of the variants file with no
  population, as `popgen2-input.md` defines it: no individuals file, no
  column chosen, an empty cell, or not in the file.
- **The one population**: every individual kept taken as one
  population, named "Unclassified", which the diversity runs on when no
  individual of the variants file is classified, as the owner decided
  on 9 October 2026 (answer 3 of `docs/designs/input-page.md`). The
  name is the one the box Individuals gives that row of its counts, as
  the owner accepted it on 11 October 2026, and the one the PCA gives
  its points of no population, so that the page calls the same
  individuals by one name; the old page keeps "All individuals".
- **Stop all**, a button of the band that ends the live state of every
  analysis and stops the one running (`popgen2-band.md`).

## What changes for the user

- The Populations tab no longer says "Not built yet": it calculates the
  diversity of each population, with its spectrum, from one Run.
- After that Run, a change of a threshold of the Variants tab, of the
  FILTER box, of an option of the diversity or of the populations
  starts it again by itself a second later, as the PCA does. With the
  PCA live too, after a change of a threshold the PCA runs first and
  then the diversity; the Populations tab says that the diversity waits
  for the PCA.
- While the diversity runs, the thresholds, the FILTER box, its options,
  the column of the populations and the opening of another individuals
  file are greyed, each with the reason.
- The individuals of no population are left out of the table when some
  individuals have one, and the tab says how many; with none
  classified, the table has one row of every individual.
- Five bar plots below the table, one for each of five of its
  columns, a bar per population (from 12 October 2026).
- The table, each bar plot, the plot of the spectrum and the table of
  the spectrum offer their data, the tables with "Download…" below
  them, the plots above them.

## What it shows

### The order of the tab

Its heading, an `<h2>`, "Diversity". Under it, in this order: the
three options; the line of the populations it runs on; Run, Stop or
Stop recalculating, with the lock beside it; the line in the place of
the bar; and, once calculated, the result: the warnings, the table,
its "Download…", the line of the versions, and the block of the
spectrum under its `<h3>`, "Site frequency spectrum". The LD decay,
piece 2 of case 4, comes after it in the same tab, under an `<h2>` of
its own, "LD decay" (below, "The LD decay", from 12 October 2026).

### The options

The three fields of the old panel (`diversity.md`, "What it shows", the
options), with their labels, defaults, lines and refusals, each a
command of `setAnalysisOptions` sent with `store.apply`: "Individuals
with a called genotype needed in each population, per variant", 20;
"Frequency of the commonest allele below which a variant is
polymorphic, from 0 to 1", 0.95; "Chromosomes drawn for the
rarefaction, a whole number from 2", the default draw of the ploidy
times the minimum, with "Use the default". The last sentence of the
minimum's line, "This minimum is for the diversity alone: the
distances between populations have their own.", stays: the Distances
tab will have its own. A change of one of them, while the diversity is
live, starts it again a second later; while the diversity runs they
are greyed (below, "While the diversity runs").

### The populations it runs on

The populations are those of the column of the populations chosen in
the box Individuals, with the individuals kept of each, in the order
each first appears in the individuals file, as the box counts them
(`popgen2-input.md`, "The counts"). The rule of the unclassified is the
owner's of 9 October 2026:

- some individual of the variants file classified: the unclassified are
  left out of the table;
- none classified, with no individuals file, with "None" chosen, with
  a column that gives none of the individuals of the variants file a
  population, with an individuals file that could not be read, with a
  column the file does not have or its list does not offer, or with a
  column of more than 20 different values, which by the owner's bound
  of 9 October 2026 is no column of populations: the table has the one
  population, "Unclassified", every individual kept, as the owner
  answered on 11 October 2026 for the refused file and the column of
  too many values. The design's choice 8 said that no column chosen
  locks the diversity; it was corrected on 11 October 2026 to the
  owner's answer of 9 October, which came first.

Every part of the tab that names or counts the populations, the line
below, the lines of the populations under the minimum and of the draw,
the locks of the draw and of no population kept, and the warnings,
reads them from one function of core, `popgen2PopulationsKept` (the
definition, `diversity.md`, "On popgen2.html"), so that the line and
the table never disagree.

The line under the options says what Run will take, the old panel's
line with this page's words (`diversity.md`, "The states", ready): "3
populations: p0, 48 individuals; p2, 84 individuals; p1, 68
individuals"; then, when unclassified individuals are left out, "7
unclassified individuals kept are left out, as the box Individuals
says."; then the old panel's lines of the populations the filters
empty, of those under the minimum and of those that hold fewer
chromosomes than the draw, with "the Variants tab" for "the Variants
step". For the one population: "1 population, Unclassified: 200
individuals. No individual is assigned to a population, so the
diversity is of every individual kept as one population." When the
cause is the individuals file or its column, a second sentence says it
and how to get populations: "panel_pops.csv could not be read, as the
box Individuals says; open it again, or another file, there to get
populations."; "country has 35 values, more than the 20 a column of
populations can have; choose another column in the box Individuals to
get populations."; "panel_pops.csv has no column popcat; choose a
column of the populations in the box Individuals." When the one
population stands for an individuals file or a column the user opened,
a refused file, a column absent, not offered, of more than 20 values
or that classifies nobody, a last sentence says what it does to the
numbers: "If the individuals belong to several populations, the
values of Unclassified are those of all the individuals taken as one
population, and F comes out higher than within each population.", and,
when no sentence before it says how to get populations, a column not
offered or one that classifies nobody, it ends instead "…; choose a
column of populations in the box Individuals to get each one's." (worded
so on 11 October 2026, after two first readers found "their mixture"
and "all of them pooled" unclear and the sentence gave nothing to do.)
With no individuals file and
with "None", chosen to have one population, it is not said. (Added on
11 October 2026 after the review of work package 1 of the plan: on
`panel.nei` with `panel_pops.csv` the one population gives F 0.0564,
where its three populations give −0.013 to −0.019, and nothing said
so.) With a threshold of the
individuals on and the one pass not finished, the counts are not known;
Run is then locked by the one pass anyway (below), and the line gives
the populations before the thresholds, with "The thresholds of the
individuals may take individuals from them once panel.nei is read to the
end."

### Run and Stop

One button, in one place, as in the PCA tab
(`popgen2-pca.md`, "Run and Stop"):

- **Run** makes the diversity live for the open variants file and
  starts it at once when no calculation runs nor a write; while one
  runs, the diversity is live and waiting, and starts when that one
  ends. A Run during the one pass is not offered: Run is locked by it
  (below).
- **Stop**, while it runs, ends the run and the live state.
- **Stop recalculating**, while it is live and does not run: during its
  quiet second, while it waits, with its result, after a failure that
  leaves it live, and beside a lock. It ends the live state. After a
  failure that leaves it live, and while a crash of the PCA holds its
  start until the next change, Run stands before it, which starts the
  diversity at once.

After a Stop or a Stop recalculating, until Run or another variants
file, the line "Stopped: the diversity no longer starts by itself after
a change. Run calculates it and starts it again after each change."
stands in the place of the bar, as in the PCA tab; with the result
shown, which offers no Run until a change takes it away, "Stopped: the
diversity no longer starts by itself after a change. After the next
change, Run calculates it and starts it again after each change."
(corrected on 11 October 2026 after the review of work packages 2 and
3: the line named a Run the screen did not show).

**The line in the place of the bar**, in the page's normal text, while
the diversity is live and does not run (the rules of
`popgen2-pca.md`, "Several analyses calculated again by themselves"):

| what it waits for | the line |
|---|---|
| the quiet second, or a change under way, with no live analysis before it about to start; also the quiet second after a Stop of the PCA it waited for | "The diversity starts in a moment, later if the filters, its options or the populations change." |
| the same, with the PCA live and about to start before it | "The diversity starts after the PCA, once the filters, the options and the populations stop changing." |
| the PCA, which runs, whether the quiet second has run out or not | "The diversity starts once the PCA, which is running, ends." ("the PCoA" by the method) |
| the dialog of the download, or its write | "The diversity starts again when the download is written or closed." |

The first two lines name the populations since 11 October 2026, after
the review of work packages 2 and 3: a change of the column of the
populations or of the individuals file puts the diversity's start off
as a change of a filter does. The first said "starts again in a
moment, once the filters and its options stop changing." until then,
which was false in the quiet second after a Stop of the PCA, when
nothing had changed.

**The locks**, the first that holds, as text beside Run, which is then
disabled, or beside Stop recalculating while the diversity is live:

| the lock | the words |
|---|---|
| the one pass is running, or about to start | "Run once panel.nei is read to the end: the reading under way in the box Variants and the diversity cannot run at once." |
| the one pass stopped by the user, or failed in a way its box offers Start again for | "Run once panel.nei is read to the end: Start again its reading in the box Variants." |
| the one pass refused by popnei, or the file no longer readable | "Run once panel.nei is read to the end: it could not be read, as the box Variants says. Open it again there, or open another." |
| the individuals file being read | "The diversity waits for panel_pops.csv to be read." |
| the filters of the individuals keep no individual at all | the store's words of `keptNoneReason`, as the PCA tab gives them, "The filters of individuals keep none of the 200 individuals of panel.nei. Loosen them." |
| the filters of the individuals keep no individual of any population | the old panel's words of `populationsKeptNeeds`, with "the Variants tab" |
| the draw larger than the chromosomes of the largest population, also of every individual of the variants file, after the lock of no individual kept | the old panel's words of the draw, with "the thresholds of the individuals in the Variants tab" where they name the filters |

The three of the one pass are those of the PCA tab with "the diversity"
(`passLockText` of `src/ui/analyses/pca/passLock.ts`), since the one
pass gives the statistics of each individual that the thresholds of the
individuals need, and a diversity sent during it would wait in the
worker's queue with a bar that does not move. The others come from the
definition of this page (`diversity.md`, "On popgen2.html"). On this
page the old panel's waiting for the statistics of each individual
never happens: Run waits for the one pass, which gives them.

### While the diversity runs

What it reads is greyed, so that no change leaves it behind, as for
the PCA (`popgen2-pca.md`, "While a PCA runs"), with the design's
choice 2 (a), approved by the owner on 11 October 2026:

- the five thresholds of the Variants tab and the FILTER box, with
  "Stop the diversity in the Populations tab to change the filters;
  then press Run there to calculate it again.";
- the three options of the diversity, with the same words;
- in the box Individuals, the list "Column of the populations", the
  zone that opens another individuals file, by its button, a drop or a
  paste, and "Remove panel_pops.csv"; and, in the Individuals tab, the
  three lists of how a text file is read, "Encoding", "Separator" and
  "Decimal mark": each with "Stop the diversity in the Populations tab
  to change the populations; then press Run there to calculate it
  again." (`popgen2-input.md`, "While the diversity runs").

When another analysis is live beside the diversity, the words of the
lock of the filters end with "…, or press Stop all beside the heading
Popnei to stop the PCA too; then press Run in each tab to calculate them
again." in place of "; then press Run there …"
(`popgen2-pca.md`, "Several analyses calculated again by themselves",
"The lock"). The band offers Stop all from work package 4 of
`docs/plans/population-tab.md`, built on 11 October 2026, so these are
the words now. Before it, from the review of work package 1 the same
day, they named the Stop of each tab in its place: "Stop the diversity
in the Populations tab and the PCA in the PCA tab to change the
filters; then press Run in each tab to calculate them again."

The words of the lock of the populations name, beside the diversity,
only the live analyses that read the populations, none today: the PCA
does not read them, so a change of the column or of the individuals
file sends it no request, and stopping it to make one would end its
live state for nothing. With the PCA live, they are those of the
diversity alone, "Stop the diversity in the Populations tab to change
the populations; then press Run there to calculate it again."
(corrected on 11 October 2026 after the review of work packages 2 and
3: they named the PCA too).

Not greyed: the options of the PCA, which a change while the diversity
runs makes about to start, waiting after it; "Colour the points by";
the row of tabs; and the opening of another variants file, which stops
every calculation.

### The result

As the old panel (`diversity.md`, "What it shows"; `sfs.md`, "The block
of the panel"), with these differences:

- **The table**, with its eleven columns, its caption, "The diversity
  of each population, over the 1,200 variants of panel.nei the filters
  kept.", and its numbers to four decimals, "no value" for none. With
  unclassified individuals left out, the caption adds "7 unclassified
  individuals kept are not in it." Its "Download…" stands below it, on
  a line of its own, with "Table as CSV", as every table of the page
  (`popgen2-pca.md`, "The downloads"), in the place of the old button
  "Download the table as CSV".
- **The warnings**, above the table, with their count on the heading:
  those of the old panel with this page's words (`diversity.md`, "On
  popgen2.html"); `individualsWithoutPopulation`, which on the old page
  names the individuals of no population, is not raised here, where an
  unclassified individual is no fault and the caption says how many.
  From 12 October 2026, the review of round 1: when the result has
  warnings and the spectrum has its own, of the MAF threshold, the list
  ends with one more, "Warning: The site frequency spectrum has one
  more warning, about the MAF threshold, said in the spectrum's
  caption." (worded so after the first reader, who could not tell
  whether it was counted) and a
  link, "Go to the warning of the spectrum", that gives the focus to
  that warning; the heading counts it, "2 warnings", the count of the
  band at the top of the page, whose link lands on that heading
  (`popgen2-band.md`, "The warning of the spectrum"). Before, the
  heading said "1 warning" where the band said 2, and the spectrum's
  warning was six controls further down, after the table and the five
  bar plots. With the spectrum's warning alone there is no list; the
  band's link gives the focus to that warning itself.
- **The line of the versions**, under the line of the "Download…" of
  the table:
  "Calculated with popnei 0.2.2, in version 0.1.0 of the application."
  and under it, on a line of its own, for the rarefied columns,
  "Rarefied to 40 chromosomes." (on a line of its own since 11 October
  2026: beside the versions, it read as their end).
- **No comparison with check numbers**: the page opens no project file.
- **The plots of the table**, from 12 October 2026, the owner's first
  round of trying the tab: under the line of the draw, a section with
  the heading "Bar plots of the table" and the line "One bar per
  population, in the order of the table. Each population has the colour
  and the mark of its line in the plot of the spectrum, so that it can
  be followed from plot to plot. A population with no value in the table
  has the words "no value" in place of its bar." (worded so after the
  first reader, who asked why the colours and whether a missing bar was
  0; "and the mark" from 12 October 2026, the review of round 1, when
  each name got its mark, since 7 colours alone repeat at the eighth
  population); with one population, the line "One bar, of the one
  population. Where the table has no value, the words "no value" stand
  in place of the bar.", since there is nothing to follow,
  then five plots, one for
  each of these columns of the table, in this order: "Expected
  heterozygosity (unbiased)", "Observed heterozygosity", "Proportion of
  polymorphic variants", "Alleles per variant, rarefied to 40
  chromosomes", named with the draw of the result as the table names
  it, and "Alleles per variant". F and the private alleles have none.
  Each plot is drawn by `createBars` of `docs/specs/charts/bars.md`:
  - its heading, one level under the section's, the label of its
    column, and its "Download…" on a line of its own above the plot,
    as the spectrum's plot has, with "Image as SVG", "Image as PNG" and
    "Data as CSV";
  - a bar across per population of the table, in its order, the first
    at the top, its name at the left of its bar and, between the name
    and the bar, the mark of its line in the plot of the spectrum, its
    symbol in its colour, cut in the middle when
    it is longer than its room, and with its row's number in brackets
    when two names cut still read the same (`bars.md`, "The room of
    the names", from 12 October 2026, the review of round 1); the colour of the
    population's group, `populationGroups` of
    `src/ui/analyses/populationGroups.ts`, its place among the
    populations of the project, as the principal components and the LD
    decay number them, whether or not the filters emptied those before
    it, the colour of its line in the plot of the spectrum (from 12
    October 2026, the review of round 1: its place in the result, the
    rule before, gave p2 another colour than in the PCA when the filters
    emptied p1); the axis of the values from 0, labelled with the label
    of the column;
  - a population with no value in that column, "no value" in the
    table, has the words "no value" in its row in place of a bar, and
    not a bar of 0;
  - its text alternative: the title, the label of the column, and the
    description, "3 bars, one per population: p0, 0.3519; p2, 0.3449;
    p1, 0.3504.", each number as the table writes it, to four decimals,
    and "no value" for none; for the one population, "1 bar, of
    Unclassified: 0.3755.";
  - its CSV, the population and the value of its column, under the
    header of the table's own CSV, "Population" and the label of the
    column, `Population,Expected heterozygosity (unbiased)`, a row per
    population in the order of the table, the value as stored and an
    empty field for none, as the table's "Table as CSV" writes them.

  The plots stand side by side, as many to a row as the width holds at
  20rem at least each, two to a row in the column of the tab at 1280
  pixels, about 735 pixels wide, and one to a row at 320 pixels, so
  that the five do not make the tab five plots long. With
  the one population each plot has one bar. A plot's element is as
  high as `barsHeight` gives for the number of populations, 152 pixels
  for three.
- **The spectrum**, under its heading: its caption; from 12 October
  2026 one plot of lines, a line per population in the colour and the
  shape of its place in the result, with its legend, the lines of the
  populations with none above it and the variants of each with both
  alleles in the draw, which its proportions are over, under it, in the tab "Plot"; and the table in the tab beside it, as
  the old block (`sfs.md`, "On popgen2.html", the plot). The plot has
  its "Download…" on a line of its own above it, with "Image as SVG",
  "Image as PNG" and "Data as CSV"; the table of the spectrum has its
  "Download…" below it, "Table as CSV". These replace the old button
  "Download the spectrum as CSV". The warning of the MAF filter ends the
  caption with this page's words (`sfs.md`, "On popgen2.html"). Until
  that day each population had a histogram of its own, with its own
  "Download…".
- **Its code**, that of the whole tab, the options, the lines, Run
  and the result with its table, spectrum and menus, is downloaded
  apart from the page's when the Populations tab is first shown with a
  variants file open; the page loads only the tab's name and its
  heading, and the store the definition of the diversity. Until the
  code arrives the tab shows "Loading the Populations tab…"; when it
  cannot be downloaded, the words of "Its words" and "Try again", which
  asks the network for every file of the code again, as the PCA tab's
  does (`popgen2-pca.md`, "The result", its code). (Since
  11 October 2026, after the review of work package 1: the result alone
  was downloaded apart before, and the rest of the tab was in the first
  load of the page.)

The files, named as `docs/specs/widgets/downloads.md` names them, from
the stem of the variants file:

| what | the files |
|---|---|
| the table of the diversity | `panel.diversity.csv` |
| each plot of the table | `panel.diversity.‹column›.svg`, `.png` and `.csv`, the ‹column› named as in the header of the old page's CSV: `expected_heterozygosity_unbiased`, `observed_heterozygosity`, `proportion_polymorphic`, `alleles_per_variant_rarefied`, `alleles_per_variant` |
| the plot of the spectrum | `panel.sfs.svg`, `panel.sfs.png`, `panel.sfs.proportions.csv` |
| the table of the spectrum | `panel.sfs.csv` |

No file is named after a population since 12 October 2026; until then
each histogram's were, `panel.sfs.p0.svg`.

## The states

| state | what the user sees | what they can do |
|---|---|---|
| empty | the tab greyed, with its reason, as the row of tabs gives it (`popgen2-pca.md`, "When a tab is greyed"); if it was shown when it became greyed, the reason in its place | open a variants file |
| locked | the options, the line of the populations, Run disabled with the lock beside it, from the table of "The locks"; while the diversity is live, the same lock with Stop recalculating in the place of Run, and the diversity starts by itself when the lock lifts: at once when the one pass ends, which is no change of the project; a second after the change that lifts any other lock; and not at all when it lifts with the values its result was calculated for, which shows that result again | what the lock names: Start again the one pass, choose a column, wait for the read, change the draw or the thresholds; Stop recalculating |
| ready | the options, the line of the populations, Run; after a Stop, the line of a Stop in the place of the bar | change the options; Run |
| about to start | live, in the quiet second: the options, the line of the populations, no result, Stop recalculating, and the line of the table of "Run and Stop" | go on changing things, which puts the start off; Stop recalculating |
| waiting | live, the PCA running: as about to start, with "The diversity starts once the PCA, which is running, ends." | change the options of the diversity, which are open, or the populations; Stop recalculating; Stop all in the band |
| running | Stop, the bar and the clock of the old panel, "Calculating · pass 1 of 2 · 17% · 0:12"; the options greyed; the filters and the box Individuals greyed, with their reasons | Stop; colour the PCA; turn to another tab, where it goes on; open another variants file, which stops it |
| loading the tab | at the first show, "Loading the Populations tab…" alone; when the code could not be downloaded, its words with "Try again" | Try again; turn to another tab |
| done | the warnings, the table and its "Download…", the line of the versions, the five bar plots, each with its "Download…" (from 12 October 2026, the review of round 1), the spectrum; above them, while live, Stop recalculating, and after a Stop the line of a Stop | download; change the options; Stop recalculating |
| results removed | not a state of this page: a change that takes the result off the screen gives about to start while the diversity is live, and ready while it is not, as in the PCA tab | as in about to start, or ready |
| error | the words of the failure, the old panel's with this page's names (`diversity.md`, "On popgen2.html"); while the failure leaves it live, popnei's refusal, Stop recalculating under them; after a failure that ends it, every crash of the worker and those only a reload mends, Run with the line of a failure that ended the live state under it, or the line alone when Run is not offered (`popgen2-pca.md`, "For the implementer", `endsLive`) | Run again after a failure that is not popnei's refusal; change the options or the thresholds after a refusal; open the variants file again after it could no longer be read |

About to start, waiting and loading the tab are three rows more than
the seven states every screen spec has, as about to start is in the PCA
tab; loading the tab comes once, before any other; waiting is new: it is live and settled, and the user who changed a threshold in
the Variants tab finds it so when they turn to this tab during a PCA of
minutes.

A change of the populations, another column or another individuals
file, takes the result off the screen like a change of a threshold,
and starts the diversity again a second later while it is live; a
change that gives the populations they had, the same file opened
again, shows the result with no calculation while the store still holds
it under that key (`docs/specs/core/store.md`, `dropLeftBehind`); but
since 11 October 2026 the key also holds the name of the individuals
file, the column and why there is one population, which the warnings
name, so another file of the same table, another column of the same
populations, or an individuals file opened after a result with none,
with "None", calculates again (`diversity.md`, "On popgen2.html", the
key). An
individuals file being read locks the diversity, and the live state
stays. None of these ends the live state; another variants file does.

## What it sends and reads

It sends the commands of the three options, `setAnalysisOptions` with
`store.apply` and the descriptions of the old panel; Run,
`autoRuns.run("diversity")`; Stop and Stop recalculating,
`autoRuns.pause("diversity")`; and each field holds a change under way
on the gate as the fields of the PCA do (`popgen2-pca.md`, "The quiet
second").

It reads: the state of `diversity` in the store, its run and its
progress; the project, for `diversityOptions`, `drawOf`, the
populations and the names of the files; the individuals kept;
`populationCounts` of core for the unclassified; the state of the one
pass and `startedUnder` of `autoRuns`, for the lock of Run;
`liveState("diversity")` of `autoRuns`, with its `subscribe` alone; and
the tab shown, for the code of the tab. It holds of its own the tab
of the spectrum, plot or table, the scroll of the tables and the
words of a PNG refused (`docs/architecture.md`, section 7).

## Its words

| where | the words |
|---|---|
| the heading of the tab | "Diversity" |
| the heading of the spectrum | "Site frequency spectrum" |
| the line of the populations | the old panel's, with "the Variants tab"; "7 unclassified individuals kept are left out, as the box Individuals says."; "1 population, Unclassified: 200 individuals. No individual is assigned to a population, so the diversity is of every individual kept as one population." |
| the locks | the table of "Run and Stop" |
| the line in the place of the bar | the table of "Run and Stop"; after a crash of the worker ended the PCA's live state, until the next change or a Run, "The diversity starts after the next change of the filters, of its options or of the populations, or when Run is pressed.", with Run beside Stop recalculating (`popgen2-pca.md`, "A failure that ends a live state", corrected on 11 October 2026); after a Stop, "Stopped: the diversity no longer starts by itself after a change. Run calculates it and starts it again after each change.", or with the result shown, or popnei's refusal (from 12 October 2026, the review of the LD decay), "… After the next change, Run calculates it and starts it again after each change."; after a failure that ended the live state, "The diversity no longer starts by itself after a change, since its calculation failed. Run calculates it and starts it again after each change.", or, after a variants file the browser can no longer read, which offers no Run, "… since its calculation failed. Once the variants file is opened again in the box Variants, Run calculates it and starts it again after each change." (12 October 2026, the review of the LD decay); the end of a refusal's words, "The diversity is then calculated again by itself.", only while it is live |
| the button while live and not running | "Stop recalculating" |
| the filters, the options of the diversity, while it runs, as tooltip and description | "Stop the diversity in the Populations tab to change the filters; then press Run there to calculate it again." |
| the column, the zone, Remove and the lists of the reader, while it runs | "Stop the diversity in the Populations tab to change the populations; then press Run there to calculate it again." |
| the filters, while another analysis is live | "Stop the diversity in the Populations tab to change the filters, or press Stop all beside the heading Popnei to stop the PCA too; then press Run in each tab to calculate them again." (before the band offered Stop all, on 11 October 2026, "Stop the diversity in the Populations tab and the PCA in the PCA tab to change the filters; then press Run in each tab to calculate them again.") The words of the populations name only another live analysis that reads the populations, none today. |
| the caption of the table | "The diversity of each population, over the 1,200 variants of panel.nei the filters kept."; with unclassified left out, "… 7 unclassified individuals kept are not in it." |
| the status region, a start by itself | "Calculating the diversity again. To change the filters or the populations, stop it in the Populations tab." ("To change the filters, …" until 11 October 2026); when it is the first start of a round of several, the words of `popgen2-pca.md`, "Several analyses calculated again by themselves" |
| the status region, the start of a Run that waited | "Calculating the diversity of panel.nei." |
| the status region, the end | "Diversity of panel.nei calculated."; a refusal or a failure, "The diversity of panel.nei could not be calculated: " and the words of its error |
| the status region, the diversity held by a crash of the PCA | "The diversity did not start: it starts after the next change of the filters, of its options or of the populations, or when Run is pressed in the Populations tab." (`popgen2-pca.md`, "A failure that ends a live state") |
| the status region, a Stop | "Diversity stopped. Press Run in the Populations tab to calculate it again."; with no Run to press, "Diversity stopped." |
| the buttons of the downloads, for a screen reader | "Download the table of the diversity"; "Download the bar plot of expected heterozygosity (unbiased)", of "observed heterozygosity", of "proportion of polymorphic variants", of "alleles per variant, rarefied to 40 chromosomes" and of "alleles per variant"; "Download the plot of the spectrum"; "Download the table of the spectrum" |
| the plots of the table | the heading "Bar plots of the table", its line, the headings, the words of a missing value and the text alternatives of "The result", the plots of the table |
| the spectrum's plot, its tab, its caption, its lines, its legend and its text alternative | `sfs.md`, "On popgen2.html", the plot |
| the tab while its code downloads | "Loading the Populations tab…" |
| the tab whose code could not be downloaded | "The Populations tab could not be loaded. Press Try again. If it fails again, the site may have been updated since this page was opened: reload the page and open panel.nei again; what the page has calculated is lost." with "Try again" (worded so on 11 October 2026: Try again first, the reload second with what it costs) |

The errors, the warnings and the words of the spectrum are those of
`diversity.md` and `sfs.md`, "On popgen2.html".

The page has no help drawer yet. The help of this tab would be the old
panel's (`diversity.md`, "Its words", the help, and `sfs.md`), with
what is new here: that the unclassified are left out when any
individual has a population, that with none the table is of every
individual as one population, "Unclassified", and that the diversity is calculated
again after each change once its Run is pressed.

## Accessibility

The criteria are those of WCAG 2.2 at level AA, and the old panel's
part (`diversity.md`, "Accessibility"; `sfs.md`, "Accessibility")
holds for the fields, the table and the bar; the plot of the spectrum
has its own, in `sfs.md`, "On popgen2.html".

**The order of the Tab key** (2.4.3), after the row of tabs: the three
fields and "Use the default" when it is there; Run, Stop or Stop
recalculating, one stop in one place, and after a failure that leaves
the diversity live, or while a crash of the PCA holds its start, Run and
then Stop recalculating; the warnings, with the link to the warning of
the spectrum when the list has it; the
table, when it scrolls; its "Download…"; the "Download…" of each
plot of the table, in their order, the plots themselves taking no
focus, since the table holds their numbers; then, in the spectrum, the
tabs of the plot and the table, the plot's "Download…" before it, and
the "Download…" of the table of the spectrum after it.

**What is said without moving the focus** (4.1.3): the words of the
status region of "Its words": a start by itself, once for a round; the
start of a Run that waited; the end; a Stop; a file handed to the
browser, "Saving panel.diversity.csv."; and the words of a tab whose
code could not be downloaded, once the tab is shown. The lines of the
quiet second and of waiting are not said: they come and go at each
change, and the start that follows them is said; but a Run pressed
while another calculation runs, which starts nothing, is said once,
"The diversity starts once the PCA, which is running, ends.", so that
a user of a screen reader learns why no bar comes. It is said by
`runLive` of `src/ui/analyses/liveRun.ts`, the Run of both tabs, when
`autoRuns.run` gives "waiting", with the words of that tab; the PCA's Run, which can wait for the diversity, says
"The PCA starts once the diversity, which is running, ends." the same
way ("The PCoA …").

**The focus at a Stop and at the end**, as in the PCA tab
(`popgen2-pca.md`, "The focus at a Stop"): the button keeps the focus
while it changes from one name to another; when it goes with the focus
on it, the focus goes to the heading "Diversity"; when it becomes a
disabled Run, to the lock beside it.

**The focus at Try again**: the button goes with the words, and the
focus goes to the place of the tab's content, and to the heading
"Diversity" once the code arrives, not to the start of the page.

**A greyed control of the box Individuals** carries `aria-disabled`, is
still reached by the Tab key, and gives its reason on the mouse, the
focus and a press, as the greyed thresholds do (`popgen2-input.md`,
"While the diversity runs"), but for the zone's hidden button that
takes a paste, which has the reason as its description and no tooltip,
since it is drawn nowhere (`popgen2-input.md`, "Accessibility"). A
file dropped or pasted on the greyed zone opens nothing, and the box
shows and says that it was not opened and what to do: "other.csv was
not opened: the populations cannot change while the diversity runs.
Stop the diversity in the Populations tab, then open other.csv
again."

**Not yet heard in VoiceOver**, which the session cannot run: the round
said once with two analyses live, the Populations tab's line of
waiting reached by the keyboard, and a greyed zone of the box
Individuals.

## How it is checked

**In Vitest, in node**: `runLive`, given "waiting" from
`run`, says the line once, for the diversity behind the PCA and for the
PCA behind the diversity, and says nothing for "started", "kept"
and "refused"; the words of the tab, by state and by what it
waits for, from the functions of its words; the line of the
populations, at `popgen2PopulationsKept` and the function of the tab's
words that writes it, with the unclassified, with the one population of
no file, of "None" and of a column that classifies nobody, and with one
classified population and some unclassified; the
locks, each row, from the definition and `passLock`; the file names of
the downloads, with a name that holds "/" and two names that become
the same.

**In jsdom**: Run through `autoRuns.run`, Stop and Stop recalculating
through `autoRuns.pause`; each line in the place of the bar from a
`liveState`; the focus after Stop recalculating with the result shown,
on the heading.

**In Playwright, on the built site, in Chromium and WebKit**, on
`e2e/fixtures/panel.nei` and `panel_pops.csv`, the thresholds as a new
page has them, the missing data of the variants at 0.1, which keeps all
1,200 variants of `panel.nei`:

- **The numbers**, popnei 0.2.2's under node on 11 October 2026: the
  row p0 reads 48, 0.3519, 0.3564, 0.9267, −0.0128, 1.9775, 1.9627, 0,
  0.0000, 0.0031, and p2's private alleles 1, the numbers of
  `diversity.md` with the filter at 1, which keeps the same 1,200
  variants; the missing data moved to 0.05 with the diversity live: the
  row p0 48, 0.3527, 0.3567, 0.9288, −0.0113, with no Run pressed.
  With no individuals file, the one row "Unclassified", 200,
  0.3755, 0.3543, 0.9792, 0.0564, 2.0000, 1.9926, and "no value" in its
  three cells of private alleles (He 0.3754712450806149, Ho
  0.35429523451520484, polymorphic 0.9791666666666666, F
  0.05639848814751047, rarefied alleles 1.9926031027785522, from
  `calcPerVarDistribs` and `calcPopDiversity` over the 200 individuals
  as one population, the missing data at 0.1, the draw 40); the same
  row with `panel_pops.csv` and "None" chosen in the list of the
  column, and with a column of the file that gives none of the
  individuals of `panel.nei` a population.
- **A column chosen**: `e2e/fixtures/panel_meta.csv`, whose columns
  are `popcat` and `altitude`, with the diversity live: `altitude`
  chosen sends one request of the diversity and none of the PCA.
- **The unclassified**: `panel_pops.csv` with four rows removed and
  three cells of popcat emptied: the caption and the line say 7
  unclassified, and the table has three rows.
- **Live with the PCA**: both live, a threshold moved: one request of
  the PCA, then one of the diversity after its end, counted at the
  worker; meanwhile the Populations tab shows "The diversity starts once
  the PCA, which is running, ends."; the status region says the round
  once. Run of the diversity while the PCA runs: no request until the
  PCA ends. Stop of the PCA while the diversity waits: no request of
  the diversity for a second, and one after it; a threshold moved
  within that second puts it off.
- **The lock**: the diversity held running (`e2e/holdWorker.ts`): the
  thresholds, the FILTER box, the options, the column, the zone,
  Remove and the three lists of the reader greyed, each with
  `aria-disabled="true"`, reached by the Tab key, with its reason as
  tooltip and description; a file dropped on the zone and one pasted
  open nothing; the PCA's options not greyed; with the PCA held
  running, the column and the zone not greyed.
- **The downloads**: the table's "Table as CSV" saved and read back,
  its first row of p0 with 0.35193160994408107; the plot's "Data as
  CSV", its row of p0 at one copy of the rarer allele
  "p0,1,0.975,38.07795856907602,0.03296202862168288", and its SVG; each
  "Download…" of a table below it, the plot's above it, at 1280 and at
  320 px.
- **The plots of the table**, from 12 October 2026: five plots under
  the table, in the order of "The result", each of three bars, p0, p2
  and p1 down its left side, with its text alternative whole, the first
  "Expected heterozygosity (unbiased) 3 bars, one per population: p0,
  0.3519; p2, 0.3449; p1, 0.3504."; the minimum of individuals at 50,
  where p0's 48 give it no value, "no value" in p0's row of each plot
  and two bars; with no individuals file, one bar each, of
  Unclassified; the "Data as CSV" of the first, read back,
  `Population,Expected heterozygosity (unbiased)` and
  `p0,0.35193160994408107`, and its SVG; its "Download…" above it; at
  1280 px two plots to a row, and at 320 px one to a row with no
  sideways scroll.
- **The plot of the spectrum**, from 12 October 2026: three lines, p0,
  p2 and p1 in the legend, at 1280 and at 320 px, where it fits the
  page with no sideways scroll; the caption's sentence of the variants
  left out.
- axe in each state of the tab, light and dark.

**The screens**, `--project=screens`, at 1280 and 320 px, light and
dark: `popgen2-populations-ready`, `-locked-pass`, `-running`,
`-waiting` (the PCA running), `-about-to-start`, `-done`, `-done-live`,
`-stopped`, `-failed`, `-unclassified`, `-one-population`,
`-loading-tab`, and `popgen2-individuals-box-locked`, the box
Individuals greyed while the diversity runs.

**By hand**: VoiceOver with Safari on the round said once and the
greyed zone; the owner, whether the wait after each change with the
PCA and the diversity live is too long (the design, "What would send
each choice back").

## The LD decay

From 12 October 2026, phase 1 of `docs/plans/ld-decay-tab.md`. Under
the diversity and its spectrum, under its own `<h2>`, "LD decay", the
tab shows for each population how the r² of Rogers and Huff between two
variants falls with the distance between them, the mean of each bin,
the curve popnei fits and the distance at which it falls to half. It is
the LD decay panel of the old page, which the owner tried and accepted
on 1 October 2026 (`docs/specs/analyses/ldDecay.md`, "The panel"), with
the words and the populations of this page, run by one Run and from
then on calculated again by itself after each change of what it reads,
as the diversity is. The owner's decisions it takes, of 12 October
2026 (the plan, "Decisions already made"):

- **Live, like the others.** After its first Run it is calculated again
  by itself after each change of what it reads, last in the order of
  the page, after the PCA and the diversity, so that they never wait
  for it. While it runs, what it reads is greyed with the reason. With
  a long distance on a dense file a run lasts minutes, 222 s at
  2,000,000 bp on 1,000 individuals with a variant every 100 bp in
  Chromium 153 on the owner's Mac (`ldDecay.md`, "In the browsers"), and
  a change of a threshold greys the thresholds that long, until it ends
  or the user presses Stop; the owner accepted that cost.
- **The time of its last run** stands beside its button, so that the
  user knows what a change will cost them.
- **No default distance**: until a distance is typed it is locked, with
  the reason, and never started by itself.

Everything else is the old panel's: its options and their bounds, the
50 bins from 1 bp, the maximum major allele frequency of 0.95, from 0.5
to 1, the lock above 1 GB of counts, the warning below 20 individuals,
the 16 populations drawn at most, and what it reads, every threshold of
the Variants tab and the FILTER box, the thresholds of the individuals
and the populations. This page has no LD pruning among its filters,
only the PCA's own, so the line of the old panel that says the LD
pruning is not applied here is never drawn.

### Its order

The `<h2>` "LD decay", 2 rem below the diversity's part, which ends
with its Run or its result (from 12 October 2026, the review of the LD
decay, where it stood 8 px under the diversity's Run); the two options; the line of the populations it
runs on; Run, Stop or Stop recalculating, with the lock beside it and,
after it, the time of the last run; the line in the place of the bar;
and, once calculated: the warnings, with their count on their heading;
the table of the populations and its "Download…" below it; the line of
the versions; and the two tabs of the old panel, "Plot", selected when
the result is drawn, and "Table", the table of the bins. The plot has
its "Download…" on a line of its own above it, the table of the bins
its own below it.

### The options

The two fields of the old panel (`ldDecay.md`, "What it shows", the
options), with their labels, their lines, the reason beside the field
of the distance and their refusals: "Largest distance between the two
variants of a pair, in base pairs, from 50", empty until typed, and
"Maximum major allele frequency in each population, from 0.5 to 1",
0.95. Each is a command of `setAnalysisOptions` sent with `store.apply`,
with the old descriptions. A change of either while the LD decay is
live starts it again a second later; while it runs both are greyed with
the words of the lock of the filters (below, "While it runs").

Beside the field of the distance, while no distance is typed, the line
of help of the old panel says why it has to be typed: "The LD decay
needs the largest distance between the two variants of a pair. It has
no default, because it depends on how far linkage disequilibrium
extends in the genome of your species. Type a distance in base pairs.";
and for a distance the memory does not allow, the reason of that lock,
drawn as an error. The populations it counts are those of this page,
below.

### The populations it runs on

Those of the diversity (above, "The populations it runs on"), by the
same function of core, `popgen2PopulationsKept`, so that the two parts
of the tab never count other populations: the populations of the column
chosen in the box Individuals, the unclassified left out; or, with none
classified, the one population, "Unclassified", every individual kept.

The line under the options says what Run will take, as the
diversity's: "2 populations: pop_a, 50 individuals; pop_b, 50
individuals"; "7 unclassified individuals kept are left out, as the box
Individuals says."; the populations the thresholds of the individuals
empty; and, while a threshold of the individuals waits for the one
pass, "The thresholds of the individuals may take individuals from them
once ld.nei is read to the end." For the one population: "1 population,
Unclassified: 100 individuals. No individual is assigned to a
population, so the LD decay is of every individual kept as one
population.", then the diversity's sentence of why, for a refused file,
a column absent or a column of too many values; and, when the one
population stands for an individuals file or a column the user opened,
"If the individuals belong to several populations, the r² of
Unclassified is that of all the individuals taken as one population,
and comes out higher than within each population at every distance",
ended by "." when a sentence before it says how to get populations, and
otherwise by "; choose a column of populations in the box Individuals
to get each one's." Individuals of populations whose allele frequencies
differ are in LD at any distance when they are taken together, so the
curve of the mixture lies higher than those of the populations; the
diversity's sentence says the same of F. The lines of the minimum and
of the draw are the diversity's own, and the LD decay has neither.

### Run, Stop and the time of the last run

One button in one place, as the diversity's (above, "Run and Stop"):
Run makes the LD decay live and starts it at once when no calculation
runs nor a write, and otherwise makes it live and waiting; Stop, while
it runs, ends the run and the live state; Stop recalculating, while it
is live and does not run, ends the live state; and after a failure that
leaves it live, or while a crash of another analysis holds its start,
Run stands before Stop recalculating.

**The time of the last run**, "The last run, pairs up to 100,000 base
pairs, took 3:42.", with the largest distance of that run, which its
time grows with (from 12 October 2026, the review of the LD decay;
until then "The last run took 3:42."), stands after
the button, on its line, in the muted text of the line of the versions,
from the first run of the open variants file that ended with a result
or with an error, until another variants file is opened; in minutes
and seconds as the clock of the bar writes them, "1:02:05" past an hour,
and "The last run, pairs up to 100,000 base pairs, took less than a
second." under one. It is the time
from the moment the page asks the calculation worker for the run, when
the tab shows it running, to its answer, of the last run that ended so,
and it includes a wait for the worker: after another LD decay or a large
PCA, the start of a new worker and its opening of the variants file,
which the run pays too (12 October 2026, the review of the LD decay; how
long that opening takes on a dense file is measured in phase 2 of the
plan). The page makes its clock when it starts, before any run, so a
run under way is timed from its start whenever the tab is first drawn; a
run stopped, or left behind by a change, which ends with neither, does
not change it. It stands beside Run, Stop and Stop recalculating alike,
and alone where the state offers no button, the result shown after a
Stop. It is no description of the button, which a screen reader would
then read at each visit, and the status region does not say it: the
end of a run is said already. While a run is under way the bar's clock
counts the new run, and this line says what the last one took.

After a Stop or a Stop recalculating, until Run or another variants
file, the line in the place of the bar: "Stopped: the LD decay no
longer starts by itself after a change. Run calculates it and starts it
again after each change."; with the result shown, or popnei's refusal
of these settings (from 12 October 2026, the review of the LD decay),
which offer no Run until a change takes them away, "Stopped: the LD decay no longer starts
by itself after a change. After the next change, Run calculates it and
starts it again after each change." After a failure that ended the live
state: "The LD decay no longer starts by itself after a change, since
its calculation failed. Run calculates it and starts it again after
each change."; after popnei's refusal for lack of memory, which offers
no Run until a change takes the refusal away (12 October 2026, the
review of the LD decay: the line named a Run that was not there), "The
LD decay no longer starts by itself after a change, since popnei
refused it for lack of memory. Once a smaller largest distance is
typed, or fewer individuals are kept, Run comes back: it calculates the
LD decay and starts it again after each change."; after a variants file
the browser can no longer read, "… since its calculation failed. Once
the variants file is opened again in the box Variants, Run calculates
it and starts it again after each change."; and with a result shown,
"… since its calculation failed. After the next change, Run calculates
it and starts it again after each change."

**The line in the place of the bar**, while it is live and does not
run:

| what it waits for | the line |
|---|---|
| the quiet second, or a change under way, with no live analysis before it about to start; also the quiet second after a Stop of one it waited for | "The LD decay starts in a moment, later if the filters, its options or the populations change." |
| the same, with a live analysis before it about to start, the first of them in the order named | "The LD decay starts after the PCA, once the filters, the options and the populations stop changing." ("the PCoA", "the diversity") |
| another analysis, which runs | "The LD decay starts once the diversity, which is running, ends." ("the PCA", "the PCoA") |
| the dialog of the download, or its write | "The LD decay starts again when the download is written or closed." |
| a crash of the worker that ended another live state, until the next change or its Run | "The LD decay starts after the next change of the filters, of its options or of the populations, or when Run is pressed." |

**The locks**, the first that holds, as text beside Run, which is then
disabled, or beside Stop recalculating while it is live:

| the lock | the words |
|---|---|
| the one pass running or about to start, stopped, or refused | the three of the diversity's table with "the LD decay": "Run once ld.nei is read to the end: the reading under way in the box Variants and the LD decay cannot run at once." and the two others |
| the individuals file being read | "The LD decay waits for ld_pops.csv to be read." |
| no distance typed | "Type the largest distance, above.", with the line of help beside the field |
| a distance whose counts would take more than 1 GB for the populations of the variants file | "With 2 populations, the largest distance can be at most 12,500,000 base pairs: the pairs are counted at every distance up to it, …", the old words, also beside the field; "The largest distance can be at most 25,000,000 base pairs: …" for one |
| the thresholds of the individuals keep no individual at all | the store's words of `keptNoneReason`, as for the diversity |
| the thresholds of the individuals keep no individual of any population | the diversity's words of this page, "… Loosen the thresholds of the individuals in the Variants tab to keep them." |

The populations of the lock of the memory are counted on every
individual of the variants file, before the thresholds of the
individuals, which can only lower their number, as the old panel counts
them before the filters of individuals: the lock is known before the
one pass ends, and never lets through a distance the populations kept
cannot hold.

### While it runs

What it reads is greyed, as while the diversity runs (above, "While
the diversity runs"), with its own words:

- the five thresholds of the Variants tab and the FILTER box, and its
  two options: "Stop the LD decay in the Populations tab to change the
  filters; then press Run there to calculate it again.";
- the list "Column of the populations", the zone that opens another
  individuals file, its Remove and the three lists of how a text file
  is read: "Stop the LD decay in the Populations tab to change the
  populations; then press Run there to calculate it again.";
- with another analysis live beside it, the words of Stop all, "Stop
  the LD decay in the Populations tab to change the filters, or press
  Stop all beside the heading Popnei to stop the PCA and the diversity
  too; then press Run in each tab to calculate them again.", the
  populations naming only the diversity among the others, which reads
  them, as `popgen2-pca.md` has it ("The lock").

Not greyed: the options of the PCA and of the diversity, a change of
which makes that analysis about to start, waiting after the LD decay;
"Colour the points by"; the row of tabs; and the opening of another
variants file, which stops every calculation.

Under the bar, the old panel's line of a run under way: "The bar shows
the reading of ld.nei. The curves are fitted once it is read. With a
large distance on a file whose variants are close together, the reading
may take tens of minutes and may end with the LD decay refused for lack
of memory."

### The result

The old panel's (`ldDecay.md`, "What it shows"), with these
differences:

- **The table of the populations**, its seven columns and its caption,
  "The LD decay of each population, over the 500 variants of ld.nei the
  filters kept, pairs up to 100,000 base pairs apart. The r² at
  distance 0 is where the fitted curve starts, which depends on the
  number of individuals of the population alone."; with unclassified
  individuals left out, the caption adds "7 unclassified individuals
  kept are not in it.", as the diversity's. Its "Download…" stands below
  it, with "Table as CSV", the header the labels of its columns and the
  numbers as stored, every digit, in the place of the old button.
- **The line of the versions** under that "Download…", "Calculated with
  popnei 0.2.2, in version 0.1.0 of the application."
- **The plot**, in the tab "Plot": the old plot, a population's colour
  and mark its place among the populations of the project, as in the
  diversity's plots and the PCA (`populationGroups` of
  `src/ui/analyses/populationGroups.ts`). Its "Download…", on a line of
  its own above it, has "Image as SVG", "Image as PNG" and "Data as
  CSV". The CSV holds what the plot draws a point at and the curve
  there: a row for each population and bin, every population in the
  order of the table, also those past the 16 the plot draws, with the
  header `population,distance_bp,mean_r2,fitted_r2`: the name, the
  middle of the bin, 1000.5 for the bin from 1 to 2,000, the mean r² of
  its pairs, empty for a bin with none, and the fitted curve at that
  distance, empty for a population with no curve.
- **The table of the bins**, in the tab "Table", its frame of limited
  height, with its "Download…" below it, "Table as CSV", in the place
  of the old button.
- **No comparison with check numbers**: the page opens no project file.

The files, named as `docs/specs/widgets/downloads.md` names them, from
the stem of the variants file:

| what | the files |
|---|---|
| the table of the populations | `ld.ld_decay.csv` |
| the plot | `ld.ld_decay.svg`, `ld.ld_decay.png`, `ld.ld_decay.points.csv` |
| the table of the bins | `ld.ld_decay_bins.csv` |

The warnings, above the table, are the module's with this page's words
(`ldDecay.md`, "On popgen2.html").

### Its states

| state | what the user sees | what they can do |
|---|---|---|
| empty | the tab greyed, as for the diversity | open a variants file |
| locked | the options, the line of the populations, Run disabled with the first lock of the table beside it; while live, the lock beside Stop recalculating, and it starts by itself when the lock lifts, as the diversity does | type the distance; what the lock names; Stop recalculating |
| ready | the options, the line of the populations, Run, the time of the last run when there is one; after a Stop, the line of a Stop | change the options; Run |
| about to start | live, in the quiet second: the options, the line, Stop recalculating, the time of the last run, the line of the table above | go on changing things; Stop recalculating |
| waiting | live, another analysis running: as about to start, with "The LD decay starts once the diversity, which is running, ends." | change its options or the populations; Stop recalculating; Stop all in the band |
| running | Stop, the time of the last run, the bar and the clock, the line under the bar; its options greyed; the filters and the box Individuals greyed, with their reasons | Stop; turn to another tab; open another variants file, which stops it |
| done | the warnings, the table and its "Download…", the line of the versions, the tabs of the plot and the bins with their "Download…"; above them, while live, Stop recalculating and the time of the last run | download; change the options; Stop recalculating |
| error | the words of the failure (`ldDecay.md`, "On popgen2.html"); while the failure leaves it live, Stop recalculating under them, with Run before it when Run may mend it; after a failure that ends it, the line of that failure, with Run after a crash, and none after the refusal for memory until a change | Run again, or change the distance after a refusal for memory |

A failure ends its live state when it is a crash of the calculation
worker, any crash, whose words name the memory; a failure only a reload
mends; or popnei's refusal for memory, after which a run at the same
settings would take as long and be refused again after each change. Any
other refusal of popnei leaves it live (`popgen2-pca.md`, "Several
analyses calculated again by themselves").

A change of the populations, another column or another individuals
file, takes its result off the screen as a change of a threshold does,
and starts it again a second later while it is live, as the diversity.
The loading of the tab's code is the tab's (above): the LD decay's code
comes with it.

### Its words

| where | the words |
|---|---|
| the heading | "LD decay" |
| the line of the populations | as above, "The populations it runs on" |
| the locks, the line in the place of the bar, the lines of a Stop and of a failure that ended it | as above, "Run, Stop and the time of the last run" |
| the time of the last run | "The last run, pairs up to 100,000 base pairs, took 3:42."; "… took less than a second." |
| the filters and its options while it runs, as tooltip and description | "Stop the LD decay in the Populations tab to change the filters; then press Run there to calculate it again." |
| the column, the zone, Remove and the lists of the reader while it runs | "Stop the LD decay in the Populations tab to change the populations; then press Run there to calculate it again." |
| the caption of the table of the populations | the old one; with unclassified left out, "… 7 unclassified individuals kept are not in it." |
| the status region, a start by itself | "Calculating the LD decay again. To change the filters or the populations, stop it in the Populations tab."; the first start of a round of several, the words of the round of `popgen2-pca.md` |
| the status region, the start of a Run that waited | "Calculating the LD decay of ld.nei." |
| the status region, a Run that waits | "The LD decay starts once the diversity, which is running, ends." |
| the status region, the end | "LD decay of ld.nei calculated."; a failure, "The LD decay of ld.nei could not be calculated: " and its words |
| the status region, held by a crash of another analysis | "The LD decay did not start: it starts after the next change of the filters, of its options or of the populations, or when Run is pressed in the Populations tab." |
| the status region, a Stop | "LD decay stopped. Press Run in the Populations tab to calculate it again."; with no Run to press, "LD decay stopped." |
| the buttons of the downloads, for a screen reader | "Download the table of the populations of the LD decay"; "Download the plot of the LD decay"; "Download the table of the bins of the LD decay" |

### Accessibility

As the old panel's (`ldDecay.md`, "Accessibility") and the
diversity's above. The order of the Tab key in its section: the two
fields; Run, Stop or Stop recalculating, one stop in one place, Run then
Stop recalculating when both stand; the warnings; the table of the
populations, when it scrolls, and its "Download…"; the tabs Plot and
Table; in Plot, its "Download…" and the frame of the plot when it
scrolls sideways; in Table, the frame of the table of the bins while it
is higher than its frame, and its "Download…". The time of the last run
takes no focus. The focus at a Stop and at the end, as the diversity's:
the button keeps it while it changes name; when it goes, the heading
"LD decay" takes it; when it becomes a disabled Run, the lock beside it.
The band's link to its warnings gives the focus to the heading of the
LD decay's warnings, and to its heading for an error, never to the
diversity's in the same tab.

### How it is checked

**In Vitest, in node**: the definition of this page, each case of
`ldDecay.md`, "On popgen2.html", "How it is verified"; the words of the
section, the line of the populations with the unclassified and with the
one population of no file and of a column that classifies nobody, each
lock, each line of waiting and of a Stop, the time of the last run at
0.4 s, 59 s, 61 s and 3,725 s; the round of the PCA, the diversity and
the LD decay, "Calculating the PCA, the diversity and then the LD decay
again. To change the filters, press Stop all beside the heading Popnei,
or stop each in its tab; to change the populations, stop the diversity
and the LD decay in the Populations tab."; the failures that end its
live state, a crash, a refusal for memory, and not another refusal; and
at `createAutoRuns` with the real store, the three live, a change of a
threshold: the PCA, the diversity and the LD decay, one at a time, in
that order, the worker's requests counted.

**In jsdom**: Run through `autoRuns.run("ldDecay")`, Stop and Stop
recalculating through `autoRuns.pause("ldDecay")`; the time of the last
run after a run that ended done, kept over a run stopped, and gone with
another variants file.

**In Playwright, on the built site, in Chromium and WebKit**, on
`e2e/fixtures/ld.nei` and `ld_pops.csv`, the thresholds as a new page
has them, the missing data at 0.1, which keeps all 500 variants:

- **The numbers**: 100000 typed and Run: the rows pop_a and pop_b, 50
  individuals, 432 variants, 29,367 pairs and half distances "7,548"
  and "7,340"; no warning; "The last run, pairs up to 100,000 base
  pairs, took less than a second."; the
  missing data moved to 0.05 with the LD decay live: "7,639" and
  "7,416", with no Run pressed. With no individuals file, the one row
  Unclassified, 100 individuals, 432 variants, 29,367 pairs, "7,151"
  (7150.803607577506, popnei 0.2.2 under node on 12 October 2026).
- **The locks**: before a distance, Run disabled with "Type the largest
  distance, above." and the line of help beside the field; 30000000
  typed, the lock of the memory with "With 2 populations, the largest
  distance can be at most 12,500,000 base pairs".
- **Live with the others**: the diversity and the LD decay live, a
  threshold moved: one request of the diversity, then one of the LD
  decay after its result, counted at the worker; meanwhile the LD
  decay's line "The LD decay starts once the diversity, which is
  running, ends.". The LD decay held running: the thresholds, its
  options, the column and the zone greyed with its words; the
  diversity's options open.
- **The downloads**: the table of the populations' CSV read back, its
  row of pop_a `pop_a,50,432,29367,7548.08187836982,…`; the plot's
  "Data as CSV", its first row of pop_a; each "Download…" of a table
  below it, the plot's above it.
- **The band**: the LD decay held running, the Variants tab shown:
  "LD decay running · 0:0…" with Stop; with the diversity live too,
  Stop all.
- axe with the LD decay ready, running and done, light and dark.

**The screens**, `--project=screens`, at 1280 and 320 px, light and
dark: `popgen2-ld-decay-locked` (no distance typed), `-ready`,
`-running`, `-waiting` (the diversity running), `-done`, `-stopped`.

## Choices made by the session

Of the LD decay, from 12 October 2026, open to the owner's change once
they try it: the place and the words of the time of the last run, and
that it counts runs that ended with an error; the sentence of the one
population, "the r² of Unclassified … comes out higher than within each
population at every distance"; the CSV of the plot, its rows and its
columns; the lines of waiting and of a Stop, the diversity's with "the
LD decay"; and the round's words, which name the analyses of one tab
once, "stop the diversity and the LD decay in the Populations tab".

Open to the owner's change once they try the page: the heading
"Diversity" in the tab and "Site frequency spectrum" under it; the
line of the unclassified in the ready state and the caption, and no
warning for them; (a refused individuals file and a column of more than
20 values giving the one population is the owner's answer and no
longer the session's; the CSV
of the table with the labels of its columns as header, as every table
of the page, where the old page wrote the names of the Python script;
one "Download…" for the plot of the spectrum, above it; the heading
and the line of the plots of the table, their bars across, their
layout, and their number, five, which leaves out F and the private
alleles; Run that starts at once when nothing runs, even
while the PCA is about to start, which then waits after it; and the
words.

## Left for the running application

The layout of the options and of the line of the populations, the
size of the plot of the spectrum, and whether the table keeps the population in view
while it scrolls sideways.

## Open points

None. The owner answered the one left on 11 October 2026, when they
approved this spec: "When the individuals file cannot be read, or the
chosen column has more than 20 different values, we just show each
individual as unclassified until the user chooses a column." So a
refused individuals file and a column of more than 20 values give the
one population, "Unclassified", with a line that says why ("The
populations it runs on"); the option not taken was to lock the
diversity in both.

The two points of the first draft were settled by the session on
11 October 2026 from the owner's earlier decisions: the one population
is named "Unclassified", as the box Individuals names that row; and
"None" chosen, like a column that classifies nobody, gives the one
population, by the owner's answer of 9 October 2026 (the design's
choice 8, which said otherwise, corrected the same day).

## Not in this spec

- The rules of the order, the waiting, the round and Stop all:
  `popgen2-pca.md`, "Several analyses calculated again by themselves".
- The definition of the diversity of this page, its key, its words and
  its numbers: `docs/specs/analyses/diversity.md` and `sfs.md`, "On
  popgen2.html".
- The band: `popgen2-band.md`. The box Individuals greyed:
  `popgen2-input.md`. The download of the filtered variants:
  `popgen2-download.md`.
- The distances between populations, piece 3 of case 4. The LD decay,
  piece 2, is in this spec from 12 October 2026 ("The LD decay").
- The definition of the LD decay of this page, its key and its words:
  `docs/specs/analyses/ldDecay.md`, "On popgen2.html".
- The saving of a project on this page, and the help drawer.
