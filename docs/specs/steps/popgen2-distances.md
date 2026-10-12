# popgen2.html: the Distances tab, the distances between populations

The screen spec of the Distances tab of `popgen2.html`: the distance
between every two populations, Hudson's Fst and Jost's D, as a heatmap
and a table, calculated by one Run and, from then on, calculated again
by itself after each change of what it reads, as the PCA and the
diversity are. It covers step 5 of case 4 of `docs/use-cases.md`,
"Characterise populations and the distances between them", the third
of the three pieces of that case, and shows section 7 of
`docs/functionality.md`, "Between populations". Written on 12 October
2026, before any code; its plan is `docs/plans/distances-tab.md`. The
owner decided on 12 October 2026 that this piece is built without
stopping for the approval of its specs, and that they try the result.

The tab is the panel of the distances of the old page, `popgen.html`,
which is built and which the owner tried and accepted on 1 October
2026: its screen spec is the second half of
`docs/specs/analyses/popDists.md`, "The panel". This spec says what is
the same by pointing there, and gives in full what differs, as
`popgen2-populations.md` does for the diversity. The specs it reads,
revised for it the same day:

- the distances of this page, their populations, their locks, their
  warnings and their words: `docs/specs/analyses/popDists.md`, "On
  popgen2.html";
- the rules of several analyses calculated again by themselves, their
  order, the state waiting and Stop all:
  `docs/specs/steps/popgen2-pca.md`, "Several analyses calculated again
  by themselves";
- the band at the top of the page, which names the distances running,
  waiting or about to start: `docs/specs/steps/popgen2-band.md`;
- the heatmap: `docs/specs/charts/heatmap.md`; its download and the
  table's: `docs/specs/widgets/downloads.md`.

## The terms

The terms of `popgen2-pca.md` hold here: **the one pass**, **live**,
**the quiet second**, **a change under way**, **about to start**, **the
lock**, **the status region**, **the focus**, **a tab**, **greyed**;
and those of `popgen2-populations.md`: **waiting**, **unclassified**,
**Stop all**. And these:

- **The distances** are one analysis that gives, for each pair of
  populations, Hudson's Fst, Jost's D and the variants the pair was
  calculated over, and for each of the two measures the order of the
  heatmap, from one request of the calculation worker and one pass over
  the variants file (`popDists.md`, "The module").
- **A pair** is two populations; **the measure** is the one of the two
  distances the heatmap draws; **the minimum of individuals** is how
  many individuals of a population need a called genotype at a variant
  for the variant to count for a pair that population is in, 20 by
  default, popnei's `minNumIndividuals` (`popDists.md`, the words used
  throughout).

## What changes for the user

- The Distances tab no longer says "Not built yet": it calculates the
  distances between the populations from one Run.
- After that Run, a change of a threshold of the Variants tab, of the
  FILTER box, of the minimum of individuals or of the populations
  starts it again by itself a second later, last in the order of the
  tabs: with the PCA or the diversity live too, they run first, and the
  Distances tab says what it waits for.
- While the distances run, the thresholds, the FILTER box, the minimum,
  the column of the populations and the opening of another individuals
  file are greyed, each with the reason. The choice of the measure
  stays open, since it calculates nothing.
- The individuals of no population, the unclassified, are left out,
  and the tab says how many: they are not a population, so they have no
  distance to the others, as the row of tabs already holds when it
  counts the populations of the Distances tab (`popgen2-pca.md`, "When
  a tab is greyed").
- The heatmap and the table offer their data: the heatmap with
  "Download…" above it, the table with "Download…" below it.

## What it shows

### The order of the tab

Its heading, an `<h2>`, "Distances between populations", the title of
the old panel. Under it, in this order: the two options; the lines of
the populations it runs on; Run, Stop or Stop recalculating, with the
lock beside it; the line in the place of the bar; and, once calculated,
the result: the warnings, the heatmap with its "Download…" above it and
its line of order under it, the table and its "Download…", and the
line of the versions.

### When the tab is greyed

As now (`popgen2-pca.md`, "When a tab is greyed";
`docs/specs/core/popgen2Tabs.md`): with no variants file open, and,
with one open, with no individuals file, while it is read or after it
was refused, with no column of the populations, with a column of more
than 20 values, while fewer than two populations have an individual in
the variants file, and, once the individuals kept are known, while
fewer than two keep one. A greyed tab shows its reason in the place of
its content, which stays drawn and hidden. So the one population of
the diversity, "Unclassified", never reaches this tab: every case in
which the diversity runs on it greys the Distances tab.

A live analysis stays live while its tab is greyed. When the distances
are live and the populations fall below two, by a column or a
threshold changed, the tab greys, the definition locks the distances
(`popDists.md`, "On popgen2.html"), and nothing is sent; when two or
more come back, the tab opens and the distances start a second later,
as after any change that lifts a lock.

### The options

The two options of the old panel (`popDists.md`, "What it shows", its
options), with their labels and defaults, each a command of
`setAnalysisOptions` sent with `store.apply`, as there:

- the field "Individuals with a called genotype needed in each
  population, per variant", 20, with the line under it "This minimum is
  for the distances alone: the diversity has its own.", which the
  Populations tab's field answers with its own; a change of it, while
  the distances are live, starts them again a second later; while they
  run it is greyed (below, "While the distances run");
- the radio buttons "Distance in the heatmap", "Hudson's Fst" and
  "Jost's D", Hudson's Fst by default (`docs/functionality.md`, section
  7). A change of them redraws the heatmap from the same result and
  calculates nothing, since the measure is in no key; so they are never
  greyed, also while the distances run, and the status region says
  "Heatmap of Jost's D" when a heatmap is drawn again. Under them, a
  line says what each measure measures and when to read it, in the
  words of popnei's `docs/specs/dists.md`, and describes the group for
  a screen reader: "Hudson's Fst is the share of the diversity of the
  two populations taken together that lies between them rather than
  within them; most work on SNPs reports it. Jost's D measures how much
  of the allelic variety of the two is not shared; it is the one to
  read on markers of many alleles, such as microsatellites, where the
  diversity within the populations keeps Fst well below 1 even when
  they share no allele. Both are near 0 for populations with the same
  allele frequencies, and as estimates either can fall slightly below 0. On SNPs the two give much the same picture." (since 12 October 2026, the review of the Distances tab: until
  then nothing helped the user choose). The options are those of the
  old panel, so the line stands there too.

### The populations it runs on

The populations of the column chosen in the box Individuals, with the
individuals kept of each, in the order each first appears in the
individuals file, as the box counts them (`popgen2-input.md`, "The
counts"); the unclassified are left out. Every part of the tab that
names or counts them, the lines below, the locks and the warnings,
reads them from `popgen2PopulationsKept` of core, as the Populations
tab does, so that the line and the table never disagree.

The lines under the options say what Run will take, those of the old
panel's ready state with this page's words:

- the populations that have the minimum, "3 populations: p0, 48
  individuals; p2, 84 individuals; p1, 68 individuals";
- the populations under the minimum, which are left out, the old
  panel's words, "p3 has 12 individuals, fewer than the minimum of 20,
  and is left out.", or "p3 and p5 have 12 and 8 individuals, fewer than
  the minimum of 20, and are left out.";
- the unclassified individuals kept, as the Populations tab says them,
  "7 unclassified individuals kept are left out, as the box Individuals
  says.";
- the populations the thresholds of the individuals leave empty, as the
  Populations tab says them, "p9 has no individual left after the
  thresholds of the individuals, and is left out. Loosen the thresholds
  of the individuals in the Variants tab to keep it.";
- with a threshold of the individuals on and the one pass not finished,
  the populations before the thresholds, and "The thresholds of the
  individuals may take individuals from them once panel.nei is read to
  the end."

### Run and Stop

One button, in one place, as in the PCA and the Populations tabs
(`popgen2-populations.md`, "Run and Stop"):

- **Run** makes the distances live and starts them at once when no
  calculation runs nor a write; while one runs, the distances are live
  and waiting, and start when that one ends. A Run during the one pass
  is not offered: Run is locked by it (below).
- **Stop**, while they run, ends the run and the live state.
- **Stop recalculating**, while they are live and do not run: during
  the quiet second, while they wait, with their result, after a failure
  that leaves them live, and beside a lock; it ends the live state.
  After a failure that leaves them live, and while a crash of another
  analysis holds their start until the next change, Run stands before
  it.

After a Stop or a Stop recalculating, until Run or another variants
file, the line "Stopped: the distances no longer start by themselves
after a change. Run calculates them and starts them again after each
change." stands in the place of the bar; with the result shown, which
offers no Run until a change takes it away, "Stopped: the distances no
longer start by themselves after a change. After the next change, Run
calculates them and starts them again after each change."

**The line in the place of the bar**, while the distances are live and
do not run (`popgen2-pca.md`, "Several analyses calculated again by
themselves"):

| what it waits for | the line |
|---|---|
| the quiet second, or a change under way, with no live analysis before it about to start; also the quiet second after a Stop of the one it waited for | "The distances start in a moment, later if the filters, their options or the populations change." |
| the same, with a live analysis before it in the order of the tabs about to start | "The distances start after the diversity, once the filters, the options and the populations stop changing." ("the PCA", "the PCoA", "the diversity": the one `autoRuns` names) |
| another analysis, which runs | "The distances start once the PCA, which is running, ends." |
| the dialog of the download, or its write | "The distances start again when the download is written or closed." |
| a crash of the worker that ended another live state | "The distances start after the next change of the filters, of their options or of the populations, or when Run is pressed.", with Run beside Stop recalculating |

**The locks**, the first that holds, as text beside Run, which is then
disabled, or beside Stop recalculating while the distances are live:

| the lock | the words |
|---|---|
| the one pass is running, or about to start | "Run once panel.nei is read to the end: the reading under way in the box Variants and the distances cannot run at once." |
| the one pass stopped by the user, or failed in a way its box offers Start again for | "Run once panel.nei is read to the end: Start again its reading in the box Variants." |
| the one pass refused by popnei, or the file no longer readable | "Run once panel.nei is read to the end: it could not be read, as the box Variants says. Open it again there, or open another." |
| the filters of the individuals keep no individual at all | the store's words of `keptNoneReason`, as the other tabs give them |
| fewer than two of the populations have the minimum of individuals | "Only p0 has 20 individuals or more, and a variant counts for a pair of populations only where both have 20 individuals with a called genotype, so no pair has a distance. Lower the number of individuals needed, above, or merge populations in panel_pops.csv."; with none, "No population has 20 individuals or more, and …"; when the thresholds of the individuals took a population below the minimum, "Only p0 has 20 individuals or more among the individuals the thresholds keep, and … Lower the number of individuals needed, above, merge populations in panel_pops.csv, or loosen the thresholds of the individuals in the Variants tab." |

The three of the one pass are the PCA tab's with "the distances"
(`passLockText` of `src/ui/analyses/pca/passLock.ts`). The lock of the
minimum is the one a user meets in an open tab: the minimum is not a
reason to grey the tab, since lowering it, in the field above Run,
lifts the lock. The other locks of the definition, the individuals file
being read and fewer than two populations, come with a greyed tab, whose
reason the user reads in their place (`popDists.md`, "On popgen2.html").

### While the distances run

What they read is greyed, so that no change leaves them behind, as for
the diversity (`popgen2-populations.md`, "While the diversity runs"):

- the five thresholds of the Variants tab and the FILTER box, with "Stop
  the distances in the Distances tab to change the filters; then press
  Run there to calculate them again.";
- the field of the minimum of individuals, with the same words;
- in the box Individuals, the list "Column of the populations", the
  zone that opens another individuals file, by its button, a drop or a
  paste, and "Remove panel_pops.csv"; and, in the Individuals tab, the
  three lists of how a text file is read: each with "Stop the distances
  in the Distances tab to change the populations; then press Run there
  to calculate them again."

When another analysis is live beside them, the words of the lock of the
filters name Stop all, as the diversity's do: "Stop the distances in
the Distances tab to change the filters, or press Stop all beside the
heading Popnei to stop the PCA too; then press Run in each tab to
calculate them again." The words of the lock of the populations name,
beside the distances, only the live analyses that read the populations:
the diversity, not the PCA.

Not greyed: the radio buttons of the measure; the options of the PCA
and of the diversity, a change of which makes that analysis about to
start, waiting after the distances; "Colour the points by"; the row of
tabs; and the opening of another variants file, which stops every
calculation.

The distances took 118 ms on 20,000 variants of 1,000 individuals in
Chromium 153 and WebKit 26.6 on the owner's Mac (`popDists.md`, "How it
runs"), and 17 ms on `panel.nei`, so the controls stay greyed for a
fraction of a second after each change.

### The result

As the old panel (`popDists.md`, "What it shows"), with these
differences:

- **The warnings**, above the heatmap, with their count on the heading:
  those of the old panel with this page's words (`popDists.md`, "On
  popgen2.html"); `individualsWithoutPopulation` is not raised here,
  where an unclassified individual is no fault and the caption says how
  many.
- **The heatmap**, of the measure the radio buttons choose, with its
  title, "Hudson's Fst between populations", its order and its line of
  order under it, as the old panel's. While its cells are too small to
  hold their values, as on a page of 320 pixels with four populations,
  a line under it says where the values are, "The cells are too small to hold their values; the table of the distances, after the heatmap, gives them.", with "A negative
  distance has the colour of 0." when the heatmap has one (since 12
  October 2026, the review of the Distances tab: until then nothing
  said it, and a negative distance was drawn as 0 with no word). Above it, on a line of its own,
  its "Download…", with "Image as SVG", "Image as PNG" and "Data as
  CSV". The data are what the heatmap draws: the square matrix of the
  measure, in the order of the heatmap, a header row "Population" and
  the populations, then one row for each population with its name and
  its distance to each, the value as popnei gave it, and an empty field
  on the diagonal, where a population with itself is no pair, and for
  no value:

  ```
  Population,p2,p0,p1
  p2,,0.10273588423661377,0.10962148955018115
  p0,0.10273588423661377,,0.10496244498389443
  p1,0.10962148955018115,0.10496244498389443,
  ```

- **The table**, one row per pair, its columns "Pair", "Hudson's Fst",
  "Jost's D" and "Variants", its caption "Distances between the
  populations of panel.nei, over the 1,200 variants the filters kept.
  3 populations, with the number of individuals each was calculated over: p0, 48 individuals; p2, 84 individuals; p1, 68
  individuals.", the populations of the result with the individuals
  each was calculated with, as section 6 of `docs/functionality.md`
  gives them, since the lines of the populations are not shown with a
  result (since 12 October 2026, the review of the Distances tab: until
  then no line said them once the result was shown); with, when
  unclassified individuals are left out, "7 unclassified individuals
  kept are left out." after them. Its "Download…" stands below it,
  on a line of its own, with "Table as CSV", in the place of the old
  button "Download the table as CSV". The CSV has the header "First
  population,Second population,Hudson's Fst,Jost's D,Variants", the
  labels of the table's columns but its first, which joins two names in
  one cell, "p0 and p2", and is written as two, so that a program that
  reads the file finds each population in a field of its own; the
  values as stored, an empty field for no value, as every table of the
  page writes them (`docs/specs/widgets/downloads.md`, "A table"):

  ```
  First population,Second population,Hudson's Fst,Jost's D,Variants
  p0,p2,0.10273588423661377,0.06129813142463423,1200
  p0,p1,0.10496244498389443,0.06354346296076403,1200
  p2,p1,0.10962148955018115,0.06567052128821259,1200
  ```

- **The line of the versions**, under the line of the "Download…" of
  the table: "Calculated with popnei 0.2.2, in version 0.1.0 of the
  application."
- **No comparison with check numbers**: the page opens no project file.
- **Above 200 populations** the old panel's line takes the place of the
  heatmap and the table, with the table's download under it; it cannot
  happen on this page, whose column of the populations has 20 values at
  most.
- **Its code**, that of the whole tab, is downloaded apart from the
  page's when the Distances tab is first shown, open, as the Populations
  tab's is (`popgen2-populations.md`, "The result", its code): the page
  loads only the tab's name and heading, and the store the definition
  of the distances. Until the code arrives the tab shows "Loading the
  Distances tab…"; when it cannot be downloaded, the words of "Its
  words" and "Try again".

The files, named as `docs/specs/widgets/downloads.md` names them, from
the stem of the variants file:

| what | the files |
|---|---|
| the heatmap of Hudson's Fst | `panel.popdists.fst_hudson.svg`, `.png` and `.csv` |
| the heatmap of Jost's D | `panel.popdists.jost_d.svg`, `.png` and `.csv` |
| the table | `panel.popdists.csv` |

The measures are named in the files as in the header of the old page's
CSV, `fst_hudson` and `jost_d`.

## The states

| state | what the user sees | what they can do |
|---|---|---|
| empty | the tab greyed, with its reason, as the row of tabs gives it (above, "When the tab is greyed"); if it was shown when it became greyed, the reason in its place | open a variants file and an individuals file, choose a column of two populations or more |
| locked | the options, the lines of the populations, Run disabled with the lock beside it, from the table of "The locks"; while live, the same lock with Stop recalculating in the place of Run, and the distances start by themselves when it lifts: at once when the one pass ends, a second after the change that lifts any other lock | what the lock names: Start again the one pass, lower the minimum, loosen the thresholds; Stop recalculating |
| ready | the options, the lines of the populations, Run; after a Stop, the line of a Stop in the place of the bar | change the options; Run |
| about to start | live, in the quiet second: the options, the lines, no result, Stop recalculating, and the line of the table of "Run and Stop" | go on changing things, which puts the start off; Stop recalculating |
| waiting | live, another analysis running: as about to start, with "The distances start once the PCA, which is running, ends." | change the minimum or the populations; Stop recalculating; Stop all in the band |
| running | Stop, the old panel's bar and clock, "Calculating · 35% · 0:00"; the minimum greyed; the filters and the box Individuals greyed, with their reasons | Stop; change the measure; turn to another tab; open another variants file, which stops it |
| loading the tab | at the first show, "Loading the Distances tab…" alone; when the code could not be downloaded, its words with "Try again" | Try again; turn to another tab |
| done | the warnings, the heatmap with its "Download…" and its line of order, the table and its "Download…", the line of the versions; above them, while live, Stop recalculating, and after a Stop the line of a Stop | change the measure; download; change the minimum; Stop recalculating |
| results removed | not a state of this page: a change that takes the result off the screen gives about to start while the distances are live, and ready while they are not | as in about to start, or ready |
| error | the words of the failure, the old panel's with this page's names (`popDists.md`, "On popgen2.html"); while the failure leaves them live, popnei's refusal, Stop recalculating under them; after a failure that ends the live state, Run with the line of a failure that ended it under it | Run again after a failure that is not popnei's refusal; change the thresholds after a refusal; open the variants file again after it could no longer be read |

A failure ends the live state of the distances by the diversity's rule
(`popgen2-pca.md`, "For the implementer", `endsLive`): every crash of
the worker and the failures only a reload mends; popnei's refusal and a
file that could not be read leave them live.

A change of the populations, another column or another individuals
file, takes the result off the screen and starts the distances again a
second later while they are live, as for the diversity; the key holds
the name of the individuals file, which the warnings name, so another
file of the same table calculates again (`popDists.md`, "On
popgen2.html").

## What it sends and reads

It sends the commands of the two options, `setAnalysisOptions` with
`store.apply` and the descriptions of the old panel; Run,
`autoRuns.run("popDists")`; Stop and Stop recalculating,
`autoRuns.pause("popDists")`; and the field of the minimum holds a
change under way on the gate, as the fields of the other tabs do.

It reads: the state of `popDists` in the store, its run and its
progress; the project, for `popDistsOptions`, the populations and the
names of the files; the individuals kept; the state of the one pass
and `startedUnder` of `autoRuns`, for the lock of Run;
`liveState("popDists")` of `autoRuns`, with its `subscribe` alone; and
the tab shown, for the code of the tab. It holds of its own only the
scroll of the heatmap and of the table, and the words of a PNG refused.

## Its words

| where | the words |
|---|---|
| the heading of the tab | "Distances between populations" |
| the line under the field of the minimum | "This minimum is for the distances alone: the diversity has its own." |
| the lines of the populations | above, "The populations it runs on" |
| the locks | the table of "Run and Stop" |
| the line in the place of the bar | the table of "Run and Stop"; after a Stop, "Stopped: the distances no longer start by themselves after a change. Run calculates them and starts them again after each change.", or with the result shown "… After the next change, Run calculates them and starts them again after each change."; after a failure that ended the live state, "The distances no longer start by themselves after a change, since their calculation failed. Run calculates them and starts them again after each change." |
| the button while live and not running | "Stop recalculating" |
| the filters and the minimum, while they run, as tooltip and description | "Stop the distances in the Distances tab to change the filters; then press Run there to calculate them again."; with another analysis live, "…, or press Stop all beside the heading Popnei to stop the PCA too; then press Run in each tab to calculate them again." |
| the column, the zone, Remove and the lists of the reader, while they run | "Stop the distances in the Distances tab to change the populations; then press Run there to calculate them again." |
| a file dropped or pasted on the greyed zone | "other.csv was not opened: the populations cannot change while the distances run. Stop the distances in the Distances tab, then open other.csv again." |
| the download of the filtered variants, while they run | "Waits for the distances to end; or stop them in the Distances tab." |
| under the heatmap, while its cells hold no values | "The cells are too small to hold their values; the table of the distances, after the heatmap, gives them."; with a negative distance, "… A negative distance has the colour of 0." |
| the caption of the table | "Distances between the populations of panel.nei, over the 1,200 variants the filters kept. 3 populations, with the number of individuals each was calculated over: p0, 48 individuals; p2, 84 individuals; p1, 68 individuals."; with unclassified left out, "… 7 unclassified individuals kept are left out." |
| the buttons of the downloads, for a screen reader | "Download the heatmap of Hudson's Fst", "Download the heatmap of Jost's D"; "Download the table of the distances" |
| the status region, a start by itself | "Calculating the distances between populations again. To change the filters or the populations, stop them in the Distances tab."; the first start of a round of several, the words of `popgen2-pca.md`, "The status region", with "the distances" among the analyses |
| the status region, a Run that waited behind another calculation, once | "The distances start once the PCA, which is running, ends." |
| the status region, the start of a Run that waited | "Calculating the distances of panel.nei." |
| the status region, the end | "Distances between the populations of panel.nei calculated."; a refusal or a failure, "The distances between the populations of panel.nei could not be calculated: " and the words of its error |
| the status region, held by a crash of another analysis | "The distances did not start: they start after the next change of the filters, of their options or of the populations, or when Run is pressed in the Distances tab." |
| the status region, a Stop | "Distances stopped. Press Run in the Distances tab to calculate them again."; with no Run to press, "Distances stopped." |
| the status region, the measure changed with a heatmap shown | "Heatmap of Jost's D", "Heatmap of Hudson's Fst" |
| the tab while its code downloads | "Loading the Distances tab…" |
| the tab whose code could not be downloaded | "The Distances tab could not be loaded. Press Try again. If it fails again, the site may have been updated since this page was opened: reload the page and open panel.nei again; what the page has calculated is lost." with "Try again" |

The words of the band are in `popgen2-band.md`. The warnings, the
errors, the line of order and the description of the heatmap are those
of `popDists.md`, "On popgen2.html".

The page has no help drawer yet. The help of this tab would be the old
panel's (`popDists.md`, "Its words", the help), with what is new here:
that the unclassified are left out, and that the distances are
calculated again after each change once their Run is pressed.

## Accessibility

The criteria are those of WCAG 2.2 at level AA, and the old panel's
part (`popDists.md`, "Accessibility") holds for the field, the radio
buttons, the heatmap and the table.

**The order of the Tab key** (2.4.3), after the row of tabs: the field
of the minimum; the radio buttons, one stop; Run, Stop or Stop
recalculating, one stop in one place, and after a failure that leaves
the distances live, or while a crash holds their start, Run and then
Stop recalculating; the warnings; the "Download…" of the heatmap; the
frame of the heatmap while it scrolls sideways; the frame of the table
while it scrolls; the "Download…" of the table.

**What is said without moving the focus** (4.1.3): the words of the
status region of "Its words": a start by itself, once for a round; a
Run that waits, once; the start of a Run that waited; the end; a Stop;
the measure changed; a file handed to the browser, "Saving
panel.popdists.csv."; and the words of a tab whose code could not be
downloaded, once the tab is shown. The lines of the quiet second and of
waiting are not said, as in the Populations tab.

**The focus at a Stop and at the end**, as in the Populations tab: the
button keeps the focus while it changes from one name to another; when
it goes with the focus on it, the focus goes to the heading "Distances
between populations"; when it becomes a disabled Run, to the lock
beside it. **At Try again**, as there: the focus goes to the place of
the tab's content, and to its heading once the code arrives.

**Not yet heard in VoiceOver**, which the session cannot run: the round
said with three analyses live, and the Distances tab's line of waiting.

## How it is checked

**In Vitest, in node**: the words of the tab, by state and by what it
waits for; the lines of the populations, with the unclassified, a
population under the minimum, one emptied by the thresholds and the
thresholds waiting for the one pass; the locks of the one pass with
"the distances"; the CSV of the heatmap and of the table of the flow's
result, as literals, with a population named `a,"b"` quoted and one
named `=p1` written `'=p1`; the file names; and the words the status
region, the band, the lock and the download give the distances, with
their verbs in the plural.

**In jsdom**: Run through `autoRuns.run`, Stop and Stop recalculating
through `autoRuns.pause`; each line in the place of the bar from a
`liveState`; the measure's radio buttons not greyed while the distances
run, the field of the minimum greyed.

**In Playwright, on the built site, in Chromium and WebKit**, in
`e2e/popgen2Distances.spec.ts`, on `e2e/fixtures/panel.nei` and
`panel_pops.csv`, the thresholds as a new page has them, the missing
data of the variants at 0.1, which keeps all 1,200 variants:

- **The numbers**, popnei 0.2.2's under node, run again on 12 October
  2026 and the same to the last digit as `popDists.md`, "How it is
  verified": the table reads p0 and p2 0.1027, 0.0613, 1,200; p0 and
  p1 0.1050, 0.0635; p2 and p1 0.1096, 0.0657; the heatmap's rows are
  p2, p0, p1; the measure set to Jost's D draws the heatmap of D with
  "0.0613" in the cell of p2 and p0, and sends no request. The missing
  data moved to 0.05 with the distances live: the table reads p0 and p2
  0.1013, 0.0604, 1,152, with no Run pressed.
- **The minimum**: `panel_split.csv`, the column `popsplit`: the warning
  of the negative distance with −0.0113 and the rows p0b, p0a, p2, p1;
  the minimum set to 25 with the distances live: the line names p0a and
  p0b as left out, and the heatmap of two is p2, p1, with no line of
  order; the minimum at 70: the lock "Only p2 has 70 individuals or
  more, …", Stop recalculating beside it.
- **The unclassified**: `panel_pops.csv` with four rows removed and the
  popcat of three emptied: the line and the caption say 7 unclassified.
- **Live with the others**: the PCA and the distances live, a threshold
  moved: one request of the PCA, then one of the distances after its
  end, counted at the worker; meanwhile the Distances tab shows "The
  distances start once the PCA, which is running, ends."
- **The lock**: the distances held running (`e2e/holdWorker.ts`): the
  thresholds, the minimum, the column and the zone greyed, each with
  `aria-disabled="true"` and its reason as description; the radio
  buttons of the measure not greyed.
- **The downloads**: the heatmap's "Data as CSV" and the table's "Table
  as CSV" saved and read back, the literals of "The result"; the
  heatmap's SVG.
- **At 320 pixels** (since 12 October 2026): `panel_pops.csv`, the
  heatmaps of both measures write their values, and no line under
  them; `panel_split.csv`, four populations, neither writes them, and
  the line under the heatmap says where they are, with the negative
  distance.
- **The code of the tab**: held, "Loading the Distances tab…"; refused
  once, the words and Try again, which brings the tab.
- axe in each state of the tab, light and dark.

`e2e/popgen2Tabs.spec.ts` checks the tab's heading in the place of its
line "Not built yet", and the flows of `popgen2Live.spec.ts`,
`popgen2BandLive.spec.ts` and `popgen2Band.spec.ts` pass.

**The screens**, `--project=screens`, at 1280 and 320 px, light and
dark: `popgen2-distances-ready`, `-locked-pass`, `-locked-minimum`,
`-running`, `-waiting`, `-about-to-start`, `-done`, `-done-dest`,
`-done-negative`, `-stopped-done`, `-stopped`, `-failed`,
`-unclassified`, `-loading-tab`.

## Choices made by the session

Open to the owner's change once they try the page: the heading
"Distances between populations" in a tab labelled "Distances"; the
analysis called "the distances" in the sentences of the page, with its
verbs in the plural; the radio buttons of the measure left open while
the distances run; the heatmap's data as the square matrix of the
measure drawn, an empty field on its diagonal; the table's CSV with two
columns of populations in the place of its column "Pair"; the place of
the heatmap's "Download…" above it; and the words.

## Left for the running application

The layout of the options and of the lines of the populations, the
size of the heatmap, and whether the heatmap and the table stand side
by side on a wide screen.

## Open points

None.

## Not in this spec

- The rules of the order, the waiting, the round and Stop all:
  `popgen2-pca.md`, "Several analyses calculated again by themselves".
- The definition of the distances of this page, its key, its locks, its
  warnings and its numbers: `popDists.md`, "On popgen2.html".
- The band: `popgen2-band.md`. The box Individuals greyed:
  `popgen2-input.md`. The download of the filtered variants:
  `popgen2-download.md`.
- The standard errors of the distances, and a tree of the populations:
  left out, as `popDists.md` and section 10 of `docs/functionality.md`
  say.
- The LD decay, piece 2 of case 4, built at the same time on the branch
  `ld-decay-tab`.
- The saving of a project on this page, and the help drawer.
