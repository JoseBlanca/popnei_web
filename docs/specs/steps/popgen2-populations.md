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
until the band offers Stop all, the words of the locks name the
Stop of each tab in its place ("While the diversity runs"); and the
line of the draw is a line of its own, under that of the versions
("The result"); and the code of the whole tab, not only of its result,
is downloaded when the tab is first shown ("The result", its code).

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
- The table, each histogram of the spectrum and the table of the
  spectrum offer their data, the tables with "Download…" below them.

## What it shows

### The order of the tab

Its heading, an `<h2>`, "Diversity". Under it, in this order: the
three options; the line of the populations it runs on; Run, Stop or
Stop recalculating, with the lock beside it; the line in the place of
the bar; and, once calculated, the result: the warnings, the table,
its "Download…", the line of the versions, and the block of the
spectrum under its `<h3>`, "Site frequency spectrum". The LD decay,
piece 2 of case 4, comes after it in the same tab, under an `<h2>` of
its own.

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
"The lock"). Until the band offers Stop all, which work package 4 of
`docs/plans/population-tab.md` builds, they name the Stop of each tab
in its place: "Stop the diversity in the Populations tab and the PCA in
the PCA tab to change the filters; then press Run in each tab to
calculate them again." (corrected on 11 October 2026 after the review
of work package 1).

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
- **The line of the versions**, under the line of the "Download…" of
  the table:
  "Calculated with popnei 0.2.2, in version 0.1.0 of the application."
  and under it, on a line of its own, for the rarefied columns,
  "Rarefied to 40 chromosomes." (on a line of its own since 11 October
  2026: beside the versions, it read as their end).
- **No comparison with check numbers**: the page opens no project file.
- **The spectrum**, its heading, caption, one histogram per population
  with its heading and the line under it, the line under the
  histograms and the table in a tab beside them, as the old block. Each
  histogram has its "Download…" on a line of its own above it, with
  "Image as SVG", "Image as PNG" and "Data as CSV"; the table of the
  spectrum has its "Download…" below it, "Table as CSV". These replace
  the old button "Download the spectrum as CSV". The warning of the MAF
  filter ends the caption with this page's words (`sfs.md`, "On
  popgen2.html").
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
| the histogram of the spectrum of a population | `panel.sfs.p0.svg`, `panel.sfs.p0.png`, `panel.sfs.p0.csv` |
| the table of the spectrum | `panel.sfs.csv` |

The name of the population in a file name has every character other
than a letter, a digit, "-" and "_" written as "_", and a second
population that would give the same name gets "_2" after it, then "_3";
two names that differ only in case, "P1" and "p1", count as the same
name, since macOS and Windows keep one file for both (since 11 October
2026).

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
| done | the warnings, the table and its "Download…", the line of the versions, the spectrum; above them, while live, Stop recalculating, and after a Stop the line of a Stop | download; change the options; Stop recalculating |
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
of the spectrum, histograms or table, the scroll of the tables and the
words of a PNG refused (`docs/architecture.md`, section 7).

## Its words

| where | the words |
|---|---|
| the heading of the tab | "Diversity" |
| the heading of the spectrum | "Site frequency spectrum" |
| the line of the populations | the old panel's, with "the Variants tab"; "7 unclassified individuals kept are left out, as the box Individuals says."; "1 population, Unclassified: 200 individuals. No individual is assigned to a population, so the diversity is of every individual kept as one population." |
| the locks | the table of "Run and Stop" |
| the line in the place of the bar | the table of "Run and Stop"; after a crash of the worker ended the PCA's live state, until the next change or a Run, "The diversity starts after the next change of the filters, of its options or of the populations, or when Run is pressed.", with Run beside Stop recalculating (`popgen2-pca.md`, "A failure that ends a live state", corrected on 11 October 2026); after a Stop, "Stopped: the diversity no longer starts by itself after a change. Run calculates it and starts it again after each change.", or with the result shown "… After the next change, Run calculates it and starts it again after each change."; after a failure that ended the live state, "The diversity no longer starts by itself after a change, since its calculation failed. Run calculates it and starts it again after each change." |
| the button while live and not running | "Stop recalculating" |
| the filters, the options of the diversity, while it runs, as tooltip and description | "Stop the diversity in the Populations tab to change the filters; then press Run there to calculate it again." |
| the column, the zone, Remove and the lists of the reader, while it runs | "Stop the diversity in the Populations tab to change the populations; then press Run there to calculate it again." |
| the filters, while another analysis is live | "Stop the diversity in the Populations tab to change the filters, or press Stop all beside the heading Popnei to stop the PCA too; then press Run in each tab to calculate them again."; until the band offers Stop all, "Stop the diversity in the Populations tab and the PCA in the PCA tab to change the filters; then press Run in each tab to calculate them again." The words of the populations name only another live analysis that reads the populations, none today. |
| the caption of the table | "The diversity of each population, over the 1,200 variants of panel.nei the filters kept."; with unclassified left out, "… 7 unclassified individuals kept are not in it." |
| the status region, a start by itself | "Calculating the diversity again. To change the filters or the populations, stop it in the Populations tab." ("To change the filters, …" until 11 October 2026); when it is the first start of a round of several, the words of `popgen2-pca.md`, "Several analyses calculated again by themselves" |
| the status region, the start of a Run that waited | "Calculating the diversity of panel.nei." |
| the status region, the end | "Diversity of panel.nei calculated."; a refusal or a failure, "The diversity of panel.nei could not be calculated: " and the words of its error |
| the status region, the diversity held by a crash of the PCA | "The diversity did not start: it starts after the next change of the filters, of its options or of the populations, or when Run is pressed in the Populations tab." (`popgen2-pca.md`, "A failure that ends a live state") |
| the status region, a Stop | "Diversity stopped. Press Run in the Populations tab to calculate it again."; with no Run to press, "Diversity stopped." |
| the buttons of the downloads, for a screen reader | "Download the table of the diversity"; "Download the spectrum of p0"; "Download the table of the spectrum" |
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
holds for the fields, the table, the bar and the histograms.

**The order of the Tab key** (2.4.3), after the row of tabs: the three
fields and "Use the default" when it is there; Run, Stop or Stop
recalculating, one stop in one place, and after a failure that leaves
the diversity live, or while a crash of the PCA holds its start, Run and
then Stop recalculating; the warnings; the
table, when it scrolls; its "Download…"; then, in the spectrum, the
tabs of the histograms and the table, each histogram's "Download…"
before its plot, and the "Download…" of the table of the spectrum after
it.

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
  its first row of p0 with 0.35193160994408107; a histogram's "Data as
  CSV" of p0; each "Download…" of a table below it, at 1280 and at 320
  px.
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

## Choices made by the session

Open to the owner's change once they try the page: the heading
"Diversity" in the tab and "Site frequency spectrum" under it; the
line of the unclassified in the ready state and the caption, and no
warning for them; (a refused individuals file and a column of more than
20 values giving the one population is the owner's answer and no
longer the session's; the CSV
of the table with the labels of its columns as header, as every table
of the page, where the old page wrote the names of the Python script;
one "Download…" per histogram of the spectrum; the population's name
in the file names; Run that starts at once when nothing runs, even
while the PCA is about to start, which then waits after it; and the
words.

## Left for the running application

The layout of the options and of the line of the populations, the
number of histograms of the spectrum in a row, where each "Download…"
of a histogram sits, and whether the table keeps the population in view
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
- The LD decay and the distances between populations, pieces 2 and 3
  of case 4.
- The saving of a project on this page, and the help drawer.
