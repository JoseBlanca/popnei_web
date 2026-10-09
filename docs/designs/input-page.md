# The input page of popgen2.html, with the individuals file

A design of 9 October 2026, a draft for the owner to approve. It
decides how the page that opens the files of `popgen2.html` takes a
second file, the individuals file, the table that assigns each
individual of the variants file to a population, and how the page shows
the two files: a box for each at the top, and under them two tabs, one
for each file. It follows the owner's decisions of 9 October 2026,
written in below as decided, and leaves six questions to the owner, at
the end. It touches sections 6 and 7 of `docs/architecture.md`, and
section 4 of `docs/functionality.md`, whose small corrections are listed
under "The corrections made to the other documents". What the users
come to do is in `docs/use-cases.md`, cases 3 and 4 above all. The page
as it is, before this piece, is that of `docs/designs/stats-filters.md`,
built and accepted by the owner on 8 October 2026, with the download of
the filtered variants built on the branch `download` on 9 October 2026.

## The design in short, for the owner

- The page has two parts. At the top, two boxes side by side, one above
  the other on a phone: the box of the variants file, which shows what it
  shows now, and the box of the individuals file, which shows its name, a
  list to choose the column that assigns the populations, and how many
  individuals each population has. Under them, two tabs, "Variants file"
  and "Individuals file". The first holds everything the page shows now
  under the box, the plots with their thresholds, the FILTER box and the
  download of the filtered variants. The second shows the table of the
  individuals file as it was read.
- An individual of the variants file with no population is
  **unclassified**: with no individuals file every individual is, and so
  is one whose cell in the column is empty, or who is not in the
  individuals file at all. Until now a missing individual was an error
  that stopped every analysis per population; on this page it is not, as
  the owner decided on 9 October 2026, so that every analysis can be
  done with any file.
- The counts are of the individuals that are in both files, with a row
  of the unclassified, and a last line, "Individuals not in the variants
  file: 18", for the rows of the individuals file the variants file does
  not have, which are not used.
- The counts after the filters of the individuals can be shown without
  reading the variants file again, as the owner asked: the page knows
  which individuals the filters keep from the one reading of the file it
  already does. The design recommends showing both counts, before and
  after the filters, which is open question 3.
- The reader of the individuals file stays the one of the old page,
  `popgen.html`, which already reads a CSV, a TSV and an xlsx. Its newer
  replacement, table_io, is ready to install; the design recommends
  switching to it as a piece of its own right after this one, open
  question 2.
- Nothing new is downloaded by a user but the code of the table and the
  tabs, a few tens of KB, and no part of the page reads the variants file
  more than once.

## What the user can do once it is built

A user with `panel.nei`, 200 individuals, and `panel_pops.csv`, which
assigns them to three populations in its column `popcat`, opens
`popgen2.html`. They open `panel.nei` in the box of the variants file,
which counts its variants as the page reads it, while the plots fill in
under the tab "Variants file", as today. They open `panel_pops.csv` in
the box of the individuals file. The box shows its name, and the column
of the populations, chosen by the page or by them (open question 1). The
box then lists p0 with 48 individuals, p1 with 68 and p2 with 84, and
the unclassified with 0. Once the reading of `panel.nei` has ended, a
second count beside each population says how many the filters of the
individuals keep, and it changes as soon as they move a threshold of the
individuals under the tab "Variants file". Under the tab "Individuals
file" they see the 200 rows of `panel_pops.csv`, and how it was read. The
user of case 4 has then seen what step 2 of that case asks: how many
individuals each population has, before the analyses per population,
which later pieces build.

## The terms

The words of `docs/architecture.md` this design uses, as it uses them:

- **The project**: everything the user has set, as one value that every
  change replaces with a new one; a **command** is such a change. The
  individuals file, once read, is in the project whole, as a table with
  the names of its columns and one row per individual, with the column
  chosen for the populations, the **grouping** (section 2).
- **The store**: the part of the code that holds the project, the
  results and what is being calculated, and that the screens read. It
  keeps the **history**, the projects before the current one, which an
  Undo would go back to; `popgen2.html` keeps it though it shows no
  Undo. A command sent to it with `dispatch` adds a project to the
  history; `open`, which opens a variants file, starts the history
  afresh and stops every calculation.
- **A key**: the text made from everything a calculation reads, under
  which its result is kept; a change that leaves a key as it was leaves
  that calculation running and its result shown (section 3).
- **The entry of the page**: the code that runs when the page opens,
  makes the store and the workers, and does what the page does by
  itself, such as starting the one pass once a variants file is open.
- **The status region**: a part of the page a screen reader reads aloud
  as it changes, without the focus moving there, which tells such a
  user what the page did by itself, "panel.nei read: 1,200 variants".
- **The one pass**: the one reading of the variants file that
  `popgen2.html` does, which gives the count of the variants, the plots
  and, for each individual, its proportion of missing genotypes and its
  observed heterozygosity (`docs/plans/one-pass.md`).
- **The filters of the individuals**: the two thresholds on those two
  numbers of each individual, under the tab "Variants file". **The
  individuals kept** are those the two thresholds keep.
- **The light worker**: a second thread of the tab, beside the one that
  runs popnei, which reads the user's small files, the individuals file
  among them, so that the page does not freeze while it reads (section
  5).
- **The files wasm**: the program in Rust, compiled to run in the
  browser, that reads an xlsx, from the owner's project xlsx_rs; the
  light worker downloads it the first time an xlsx is read (section 6).
- **React Aria**: the library of controls the screens are built with,
  which gives each control its keys and the names a screen reader reads.
  A **screen reader** reads the page aloud to a user who cannot see it.

## The problem, and what forces it

Case 4 needs the populations: the user opens the variants file and a
file of the populations, and sees how many individuals each population
has, "since a small one gives values that cannot be compared with the
others" (`docs/use-cases.md`, case 4, step 2). Case 3 needs the same file
for the colours of the PCA. `popgen2.html` opens a variants file only.

Most of what this needs exists, built for the old page, `popgen.html`,
in its Individuals step (`docs/specs/steps/individuals.md`):

- The light worker reads a CSV, a TSV or an xlsx into the table of the
  project, refuses a file it cannot read with words that say why, and
  tells its encoding, separator and decimal mark, which the user can
  change (`src/worker/individualsFile.ts`, `src/worker/individuals/`,
  `src/worker/xlsxCells.ts`).
- Core loads the file into the project and records its read
  (`loadIndividuals`, `recordIndividualsRead`, `setCsvOptions`,
  `removeIndividuals` of `src/core/project.ts`), finds the populations of
  a column (`populationsOf`), matches the individuals of the two files
  (`individualsCheck`), and narrows the populations to the individuals
  kept (`populationsKept`).
- The entry of every page already asks the light worker to read an
  individuals file whose read is pending (`syncReads` of
  `src/ui/pageStart.tsx`), `popgen2.html` among them.
- The store of `popgen2.html` already works out the individuals kept
  from the one pass (`src/ui/popgen2Store.ts`, below).

Three things make this more than a new screen over that code:

1. **A missing individual was an error.** `docs/functionality.md`,
   section 4, and `docs/architecture.md`, section 6, say that every
   individual of the variants file must be in the individuals file, and
   core locks every analysis that uses the file until it is
   (`individualsNeeds`). The owner decided on 9 October 2026 that on this
   page such an individual is unclassified instead, so the rule changes
   for one page and not for the other.
2. **Two tabs, and what the hidden one keeps.** The tab "Variants file"
   holds six plots, each with a threshold the user drags, and the tab
   "Individuals file" a table the user sorts and scrolls. The widget of
   tabs of the application draws only the tab shown, so as it stands a
   turn to the other tab would destroy the plots, the sort and the place
   in the table, and the status region would then say at once
   everything the plots had done while they were away.
3. **Counts that follow the filters.** A count after the filters must
   change with each change of a threshold of the individuals, and never be the
   count of other thresholds than those shown.

## The page

### The two boxes

At the top of the page, under its heading, the two boxes, the variants
file's first. From a width of 720 px they stand side by side, each half
the width; below it, one above the other, at 320 px included, each the
width of the page less its 16 px margins.

**The box of the variants file** shows what the box shows now: the name
and size, the individuals, the variants, the FILTER failures, the
chromosomes and the ploidy, the bar of the one pass with its Stop and
Start again, and what went wrong. Nothing in it changes, but its place
and what follows it.

**The box of the individuals file** shows:

- with no file: "No individuals file: every individual is
  unclassified.", and, once a variants file is open, "All 200
  individuals of panel.nei are unclassified, and every analysis can be
  done with them.";
- while the file is read: its name and "Reading panel_pops.csv.";
- a file refused, or a reading that failed: its name and words of its
  own for this page, made from those of the old page
  (`individualsStepNeeds` of `src/core/project.ts`) as the box of the
  variants file has its own (`variantsOpenNeeds`): "panel_pops.csv could
  not be read: line 7 has 3 cells where the header has 4. Choose another
  separator under the tab Individuals file, or open a corrected file."
  The words of the old page do not do as they are: after a reader that
  could not start they say to save the project and reload the page,
  which this page cannot do, and a variants file given in the place of
  the individuals file is sent to "the Variants step", which this page
  does not have;
- a file read: its name, the list "Column of the populations", and the
  counts.

The list has, first, "None: every individual unclassified", and then
every column but the first, which names the individuals, by its name in
the file. A choice is a command that sets the grouping, as on the old
page. A column of any type can be chosen, since a population is the text
of its cell, "P1" and "p1" being two.

The counts are a table, with a column for the population, a column of
the individuals in both files and, as open question 3 recommends, a
column of the individuals kept by the filters:

| Population | In both files | After the filters |
|---|---|---|
| p0 | 48 | 31 |
| p1 | 68 | 44 |
| p2 | 84 | 36 |
| Unclassified | 0 | 0 |

Under the table, the last line, as the owner asked: "Individuals not in
the variants file: 18", the rows of the individuals file whose
individual `panel.nei` does not have, which nothing uses; 0 is written
too. The populations are in the order in which each first appears in the
file, as on the old page. A population whose every individual is
outside the variants file has no row, since it has no individual of the
variants file to count; its individuals are among those of the last
line. A
population that the filters leave empty keeps its row, with 0 after the
filters.

When some individuals are unclassified, a line under the table says
why, with the counts of the two causes: "Unclassified: 3 individuals of
panel.nei with an empty cell in popcat, and 4 that are not in
panel_pops.csv: s031, s044, s102 and 1 more." Past three names it gives
the count of the rest; the full list is under the tab "Individuals
file", below. When no individual of the variants file is in the
individuals file, which a file of other names, "S-001" for "s001", gives
for all, a warning takes the place of that line: "Warning: none of the
200 individuals of panel.nei is in panel_pops.csv, so all of them are
unclassified. The first column of panel_pops.csv has to hold their
names as panel.nei writes them: panel.nei starts with s000, and
panel_pops.csv with S-000." It is a warning and not an error, since the
page goes on, but a user who did not see it would compare no
populations without knowing why.

Before a variants file is read, the box of a file read shows the list,
and in the place of the counts, "The individuals are counted once a
variants file is open."

A column of more than 200 values, as a column of the names of the
accessions would give, has no table: the box says "popcat gives 1,845
populations, too many to list; most hold one or two individuals. Is it
the column of the populations?" 200 is the bound above which the
distances between populations are not drawn either
(`docs/functionality.md`, section 7). Open question 6 asks the owner to
confirm the bound.

With the box goes a button to open another individuals file, and one to
remove it, "Remove panel_pops.csv", which puts the page back to no file.
Where the buttons that open each file go is open question 5.

### The tab "Variants file"

It holds, unchanged, everything the page shows today under the box of
the file: the plots of the variants and of the individuals with their
thresholds, the box "Leave out the variants that failed their FILTER",
and the download of the filtered variants. Before a variants file is
open it says "No variants file open." The tab "Variants file" is the one
shown when the page opens, and the page never turns to the other tab by
itself, not even when an individuals file is opened: a page that moved
away from what the user was looking at, a threshold half set, would lose
them. The box of the individuals file already shows what an opening
gives.

Both tabs stay drawn while the other is shown; the hidden one is taken
out of view, out of the reach of the Tab key and out of what a screen
reader reads (React Aria's `shouldForceMount` keeps it drawn and marks
it inert, which takes it out of the keyboard and the screen reader, and
a rule of the page's styles hides it), as "What a hidden tab
keeps", below, argues. So a turn to the other tab and back finds
everything as it was: the plots, a number half typed in the box of a
threshold, the sort and the place of the table. A plot whose tab is
hidden keeps its last drawing, and draws again at the size of its box
when the tab is shown, since every plot watches the size of its box
(`src/charts/plot2d.ts`, the ResizeObserver of `createPlot2d`, "An
element of no size, a tab that is hidden, keeps its last drawing"). The
line of each threshold is laid over its plot from the frame the plot
gives after each drawing, so it follows. While a file is written, the
dialog of the download covers the page and no tab can be chosen. The
status region goes on saying what the plots do while their tab is
hidden, as it does today while they are out of view down the page; the
spec decides whether the sentence of no variant kept, which speaks of
the place of the download button (`noVariantAnnouncement` of
`src/ui/variants/downloadState.ts`), names the tab when it is hidden.

### The tab "Individuals file"

With no file: "No individuals file open." While it is read: "Reading
panel_pops.csv." Refused: nothing beyond the box's words, but the
options of the reader of a CSV, below, since a wrong separator is the
commonest cause of a refusal and is mended here.

A file read shows, in this order:

- For a CSV or a TSV, how it was read, with a list to change each of the
  encoding, the separator and the decimal mark, each "Detected: …" until
  the user sets it, as in the old Individuals step
  (`docs/specs/steps/individuals.md`, "How the file was read"). For an
  xlsx, the line "Read from the first sheet of panel_pops.xlsx; any other
  sheet is not read."
- When individuals of the variants file are not in the file, their full
  list, under "Individuals of panel.nei not in panel_pops.csv", with a
  button that copies the names, as the old step had it.
- The table: every row and every column of the file, the column of the
  names first and its cell the header of its row, so that a screen reader
  reads a cell with its individual and its column, "s031, popcat, p1". A
  missing value shows empty. Over the table, "200 rows, 2 columns".

A table of 5,000 rows shows about twenty rows at a time, in a box of its
own at most 28rem high, or 70% of the window, which scrolls down with the
row of the headers kept in view and sideways when the columns are wider
than the page, so that the page does not become thousands of rows long.
It is the sortable table that the statistics of each individual have on
the old page (`src/ui/widgets/SortableTable.tsx`): it draws only the rows
in view and those just beyond, and a click on a header, or Enter on it,
sorts by that column. With every one of 10,000 rows drawn, a sort froze
that page for seconds in Chromium 153 and WebKit 26.6; drawn so, for
tenths of a second (measured on 27 September 2026 on the owner's Mac,
an Apple M5 Pro, with a table of 10,000 individuals, the work report of
`docs/plans/variants-step.md`). At 320 px the box scrolls sideways and
the page does not.

The types of the columns, which the old step shows and lets the user
change, are not shown: on this page the populations are the text of
their cells whatever the type, and the types serve the colours of the
PCA, case 3, and the GWAS, which goes to an application of its own, as
the owner decided on 9 October 2026. The reader still infers them and the
project keeps them, so the PCA finds them when it comes.

### The tabs, by keyboard and screen reader

The tabs are the application's widget of tabs (`src/ui/widgets/Tabs.tsx`),
React Aria's `Tabs`, `TabList`, `Tab` and `TabPanel`, already in the
dependencies, `react-aria-components` 1.21.1. The row of the two labels
is one stop of the Tab key; the arrow keys, left and right, move between
the labels and show each tab as they reach it, and Home and End go to the
first and the last; the next press of the Tab key goes into the tab
shown. A screen reader reads the row by its name, "The files", and each
label as a tab, "Variants file, tab, selected, 1 of 2". The tab shown is
marked by a bar under its label and by the weight of its words, not by
colour alone (WCAG 2.2, success criterion 1.4.1). At 320 px the two
labels are expected to fit on one line of the 288 px the margins leave,
an estimate that the browser checks, and they wrap to a second line if
they do not or the user makes the text larger. The page
remembers no tab across a reload.

## The counts per population, and the unclassified

### What is counted

The counts are made in core, by one function of plain arithmetic on the
project and the individuals kept, beside the functions of the
populations in `src/core/populations.ts`. It gives the same object again
for the same table, column, read of the variants file and individuals
kept, as the other functions of the populations do, since a screen that
reads the store is drawn again whenever what it reads is a new object,
and the store changes many times a second while the one pass reports
its progress (`src/ui/store.tsx`). It gives, for the individuals of the
variants file:

- each population of the column chosen, with its individuals that are in
  both files, and of those, the individuals kept, or none known yet;
- the unclassified, with how many have an empty cell, how many are not
  in the individuals file and their names in the order of the variants
  file, and how many of them are kept;
- the number of rows of the individuals file whose individual is not in
  the variants file.

It is built on what core has: the populations of a column
(`populationsOf`, which reads each table once for each column and keeps
the answer), the individuals of the two files matched (`individualsCheck`,
kept for each pair of reads), and the individuals kept. With no column
chosen, or no individuals file, every individual of the variants file is
unclassified and no population has a row.

### Before and after the filters, from the one pass

The owner asked for the counts before the filters, unless those after
the filters of the individuals can be shown without reading the
variants file again. They can, and the code already does what it needs:

- The one pass gives, for each individual, its proportion of missing
  genotypes and its observed heterozygosity, over every variant of the
  file and before any filter.
- The store of the page is made with the one pass as the source of those
  numbers (`statistics` in `createPopgen2Store` of
  `src/ui/popgen2Store.ts`), and once the pass has ended the store works
  out the individuals kept, `individualsKept` of its state, by applying
  the thresholds to those numbers (`individualsKept` of
  `src/core/individualsKept.ts`). It works them out again at every
  change of the project, with no request to a worker.
- So when a threshold of the individuals changes the project, the
  individuals kept, and the counts after the filters made from them,
  change in the same drawing of the page. A threshold changes the
  project when the line is let go, when a number typed is committed, or
  a second after the last press of an arrow key
  (`src/ui/variants/StatsHistogram.tsx`), so the counts follow those and
  not the line while it is dragged. No filter of the variants removes an
  individual, so a threshold of the variants changes neither count.

With no threshold of the individuals on, as the page starts, the
filters keep every individual, which the store knows with no pass
(`individualsKept` gives the list as known, removing nobody), and the
column "After the filters" equals the one before them from the moment
both files are read. With a threshold on, the column cannot come before
the end of the one pass: until then the store does not know the
individuals kept, and after a Stop it does not either, since the
numbers of a pass stopped are not kept as a result. So, with a
threshold on, the column shows "…" while the pass runs, with the words
"known once panel.nei is read to the end" beside its header, and "not
known: the reading was stopped" after a Stop, until Start again ends a
pass. The download of the filtered variants
waits for the same end, so the two never disagree. The counts before the
filters need no pass: the individuals of the variants file are known as
soon as it is opened.

### The unclassified in the analyses per population

This piece runs no analysis per population: `popgen2.html` has none yet.
How the analyses of case 4, the diversity, the distances between
populations and the LD decay, will treat the unclassified is decided
with them, and open question 4 gives the options now, since the owner's
words, "every individual counts as unclassified, so every analysis can be
done", already lean on it. Until then the old page, `popgen.html`, keeps
its rule, every individual of the variants file in the file or nothing
per population runs, since its code is shared and is not changed by this
piece.

## What happens when

| what the user does | what the page does |
|---|---|
| opens an individuals file before a variants file | reads it and shows its list; the counts wait for a variants file, as said above |
| opens another variants file | keeps the individuals file and the column chosen, and counts again against the new file's individuals; the opening is the store's opening of a file, as today, which keeps the rest of the project |
| opens another individuals file | replaces the first; the column chosen is kept if the new file has a column of that name, and otherwise is chosen as for a first file (open question 1) |
| removes the individuals file | every individual is unclassified; the column chosen is kept in the project, so that a file opened again finds it by its name, as on the old page |
| opens a file with one individual in two rows | the reader refuses it, as it does today, with words that name the individual and end "Load a corrected file."; a population taken from either row would be a guess |
| leaves cells of the column empty | those individuals are unclassified, counted as "with an empty cell"; `NA` and `-` are empty too, and in an xlsx the errors of Excel, as `docs/functionality.md` section 4 has it |
| changes the separator of a CSV | the file is read again, the counts with it |
| reloads the page | loses both files, as the page loses the variants file today, since it saves no project yet |

The individuals file is in the project whole, its table and the column
chosen, so when `popgen2.html` gains a project file it will be saved
there, as `docs/functionality.md` section 9 already says. Nothing in this
piece changes what a project file holds.

### How an opening of the individuals file reaches the store

The store of the page has two ways to change the project. The opening
of the variants file goes through `open`, which starts a new history,
stops every calculation and forgets the text after a download
(`src/core/store.ts`); it is right for a new variants file, whose pass
has to start again anyway. Used for an individuals file it would stop
the one pass of a variants file half read, and the page starts that
pass only once for each key (`src/ui/autoRuns.ts`), so the user would
have to press Start again and wait for the whole file a second time.

So the individuals file goes through the other way, a command,
`dispatch` of the store, as on the old page
(`src/ui/steps/individuals/commands.ts`): its opening, its removal, the
options of a CSV and the column of the populations are each a step of
the history. None of them changes the key of the one pass, so none
stops it, and none changes the key of the download, so the text after a
download stays. What it costs: the history, which the page keeps ready
for an Undo it does not show (the owner hid Undo and Redo on 8 October
2026), holds these steps beside those of the filters, where the opening
of a variants file is no step. When Undo comes back, whether an Undo
takes back the opening of an individuals file is decided then; nothing
of this piece prevents either answer.

## The options

Three choices are argued; the rest of the page follows from the owner's
decisions.

### Where the counts come from

- **(a) From the project and the individuals kept, in core, on the
  page: taken.** No reading of the variants file and no request to a
  worker; the counts change with each change of the project, in the
  drawing that shows it. What
  it costs: a walk over the individuals of the variants file at each
  change of the project that touches them, a few thousand names, well
  under a millisecond by the size of the work, not measured; the
  populations of a column are kept and not found again.
- **(b) A count in popnei's pass**, by giving popnei the populations.
  The one pass reads no individuals file, and giving it one would make
  the pass depend on the column: a change of column would read the file
  again, which the owner's rule of one pass per file forbids.

(a) would lose only if a table of individuals were large enough to make
that walk visible, hundreds of thousands of rows, which the reader's
bound of 20 MB on the file makes unlikely.

### What a hidden tab keeps

- **(a) The hidden tab is not drawn**, the widget as it is. Nothing to
  build. What it costs: the sort of the table and where it was scrolled
  are lost at each turn away from the tab "Individuals file"; the six
  plots are drawn again at each return to the tab "Variants file", from
  numbers already in the store; and the status region says at once, on
  that return, everything the plots did while away
  (`src/ui/variants/announceChanges.ts`, `onShown`), a burst of
  sentences the user did not ask for.
- **(b) Both tabs drawn, the hidden one out of view: taken.** React
  Aria's `TabPanel` takes `shouldForceMount`, and marks the hidden tab
  inert, out of the Tab key and the screen reader; a rule of CSS hides
  it. The plots keep their last drawing while their box has no size and
  draw again when it has one, which `createPlot2d` already does for every
  plot of `src/charts`, so no plot changes. What it costs: the hidden tab
  stays in the memory of the page, six plots of at most 40 bars each and
  a table that draws only its rows in view, well under a MB by their
  size, not measured; the widget of tabs gains the option, which its
  other use, the plot and the table of the bins on the old page, does
  not take; and a plot of a tab hidden when its file is opened is first
  drawn when the tab is shown.

(b) is taken because it keeps what the user did on each tab, and costs
a line of the widget. (a) would win if a hidden tab held something
costly in memory, a 3D plot of the PCA of many individuals, which is not
in this piece.

### The reader of the individuals file

The reader stays as it is in this piece; open question 2 weighs the
switch to table_io.

## The invariants

The six of the designing skill (`.claude/skills/designing/SKILL.md`):

1. **A result is never shown stale.** Kept. The counts are no result in
   the cache: they are made from the current project and the individuals
   kept that the store gives for it, so they cannot belong to other
   filters or another file. The one pass, the only calculation of the
   page, has a key that holds no individuals file (`keyInputs` of
   `src/core/analyses/variantsSummary.ts` gives none), so opening or
   changing an individuals file stops and removes nothing.
2. **The layers import as the coding skill allows.** Kept: the counts
   are in `src/core`, the boxes and the tabs in `src/ui`.
3. **The project is one plain value**, changed by commands. Kept: the
   opening, the removal, the options of a CSV and the column are the
   commands of core that exist, `loadIndividuals`, `removeIndividuals`,
   `setCsvOptions` and `setGrouping`, sent as "How an opening of the
   individuals file reaches the store" says; the tab shown is state of
   the screen, which section 7 allows, "a tab that is open".
4. **`src/core` has no DOM and no React.** Kept.
5. **Two workers, one request at a time in each.** Kept: the light
   worker reads the individuals file as it does on the old page.
6. **A cancel ends its worker and starts another.** Kept, and not
   touched: a read of an individuals file is a second or two, and a new
   file picked while one is read leaves the late read unrecorded, by its
   load id (section 6).

What changes is a rule of section 6 for one page: "Every individual of
the variants must be in the file". The code that relies on it is
`individualsNeeds` of `src/core/project.ts`, called by the PCA, the
diversity, the distances and the LD decay of `popgen.html`, and by none
of `popgen2.html`, whose analyses are the one pass and the write. So no
code changes for it now; the analyses of case 4 will take the rule of
open question 4 when they come to this page.

## How it is tested, and what would prove it wrong

- **The counts**, in Vitest under node, with the store of the page and a
  fake worker: `panel.nei`'s 200 individuals and `panel_pops.csv` give
  48, 68 and 84 and 0 unclassified; a file without 7 of them gives 7 not
  in the file, named in the order of the variants file; a column with 3
  empty cells gives 3 with an empty cell; a file of other names gives the
  warning. The counts after the filters are checked against
  `individualsKept` for the same thresholds, equal to those before the
  filters with no threshold on, and, with a threshold on, "not known"
  before the end of the pass and after a Stop. The same inputs give the
  same object, and a progress of the pass draws no box again. A threshold of the individuals
  moved changes them with no request sent to a worker, which the fake
  worker counts.
- **The page**, in Playwright, in Chromium and WebKit, the two engines
  that start on the owner's Mac: the two files opened in either order;
  the tabs by keyboard alone, the arrow keys, Home and End; a threshold
  moved under the tab "Variants file", the other tab shown and the first
  shown again, the threshold, its line over the plot and the plots as
  they were; a table sorted and scrolled, the other tab shown and back,
  the same; an individuals file opened while the one pass runs, which
  does not stop it; the table of
  `individuals_10000.xlsx`, 10,000 rows, sorted, with the page answering
  a key within a tenth of a second; the page at 320 px with no sideways
  scroll; and axe, the checker of accessibility the tests run, with no
  finding. The screen is then looked at in a browser, as `CLAUDE.md`
  asks.
- **What would send the design back**: a plot, or the line of its
  threshold, that comes back from the other tab drawn wrong or at the
  wrong width; a count after the filters
  that differs from what the download writes, "Individuals removed: 84
  by the missing rate", for the same thresholds; or a table of a real
  individuals file that freezes the page when its tab is shown.

## What is hard to undo

Little. The project, its file format and the keys do not change. The
word "unclassified", once it is in the tables of the analyses per
population and in their downloads, is a name users will find in their
files; until then it is a word of one box. The default column of open
question 1, if taken, puts a column into the project that the user did
not choose, which a project file would save; a later version could stop
choosing it without breaking those files.

## The costs of the web

- **Memory of the tab.** The table is in the project, as on the old
  page. The reader refuses a file above 20 MB
  (`MAX_INDIVIDUALS_FILE_BYTES` of `src/worker/individualsFile.ts`), but
  that bounds the file and not the table: a CSV of 20 MB of short cells
  makes millions of cells, each a value of JavaScript, in the light
  worker, in the message to the page and in the project, which may take
  several times the size of the file. Not measured; the plan of the
  piece measures the memory of the page with such a file. A common
  file, 5,000 rows of 20 columns, is a hundred thousand cells. The counts keep one
  list of names per population, which the store keeps once for each
  table and column. Nothing grows with the variants.
- **The page frozen.** The table draws only the rows in view, measured
  at 10,000 rows (above). The counts walk the individuals once per
  change, in core on the page, not measured, a few thousand names. A
  plot draws again when its tab is shown, from numbers in the store, as
  a change of a threshold already does.
- **Download size.** No new dependency with the reader as it is. The
  page's first script grows by the code of React Aria's table, its tabs
  and its list, which `popgen2.html` does not use yet; React Aria's table
  alone was 14.19 KB gzipped when it was taken off another page
  (`src/ui/widgets/Table.tsx`); the build of the piece measures the
  whole. The files wasm, 0.30 MB gzipped, is downloaded the first time
  an xlsx is read, as on the old page. With table_io, open question 2,
  0.33 MB, downloaded for a CSV too.
- **The browsers.** Nothing newer than the floor, Chrome 111, Firefox
  115 and Safari 16.4: React Aria's tabs and table are used on the old
  page already.
- **What GitHub Pages does not allow.** Nothing asked: no header, no
  file from another address.
- **Accessibility.** The tabs, the list of the column and the table work
  with the keyboard alone, as React Aria makes them; no meaning is
  carried by colour alone; the warning says it is a warning in words.
- **What is lost when the tab is closed or a worker restarts.** Both
  files, until the page saves a project; the table is in the project, so
  a restart of the light worker loses nothing of a file already read.

## The corrections made to the other documents

- `docs/functionality.md`, section 4: a paragraph after the rule that
  every individual of the variants must be in the file, which says that
  on `popgen2.html` such an individual is unclassified, as are all of
  them without a file, by the owner's decision of 9 October 2026, and
  points here.
- `docs/architecture.md`, section 6, "The individuals file": a paragraph
  at its end, "What was revised on 9 October 2026", with the same, the
  two tabs, and the state of the design, a draft; and the opening of the
  document, one sentence.

Not corrected, being a skill and not a document of `docs/`: the writing
skill, whose example of an error, "12 individuals of panel.nei are not in
pops.csv", is the rule of the old page; it holds there, and is to be
revised when the old page goes.

## Open questions for the owner

### 1. The column of the populations when a file is opened

- **(a) A column whose name looks like one of populations, if there is
  exactly one; otherwise none until the user chooses.** The name, without
  regard to case, starts with "pop" or is "group", "groups", "breed" or
  "breeds": `popcat` of `panel_pops.csv` and `pop` of `ld_pops.csv` are
  found, and a list of exact names, "population", "pop", "group", would
  have missed `popcat`. Two such columns, `popcat` and `popsplit`, choose
  none. The user who opens a file sees counts at once, and the list
  shows which column was taken. What it costs: a column chosen by a name
  can be the wrong one, a "population_size" of numbers, which the counts
  then show at once as hundreds of populations of one; and the choice is
  the page's own, which the old page avoided so that every choice was
  the user's (`docs/specs/steps/individuals.md`, "The populations"). It
  cannot be made by core when it writes the read of the file into the
  project: that writing puts the table, and nothing else, into the
  current project and the projects of the history that hold the file
  (`recordShared` of `src/core/store.ts`), so a column chosen there
  would be lost from the earlier projects, and an Undo, once the page
  has one, would bring back counts with no column; and that writing is
  shared with `popgen.html`, whose user chooses every column. So the entry of
  the page sends it, once the read of a new load is recorded and no
  column of that file is chosen, as one command, `setGrouping`, as the
  entry already starts the one pass by itself; one step more in the
  history, and code in the entry and not in core.
- **(b) None until the user chooses.** Every individual is unclassified
  until then, and the box says so. One more action for every user, and a
  user who misses the list sees everyone unclassified.

Recommended: (a). The counts are what the user opened the file to see,
and a wrong guess shows itself in them.

### 2. The reader: xlsx_rs or table_io

table_io is the owner's newer reader, the project xlsx_rs renamed, in the
repository `github.com/JoseBlanca/table_io`, checked out at
`~/devel/xlsx_rs` (the folder keeps its old name). What it offers, from
its package's README and its report of 2 October 2026:

- One function, `importTable`, that reads a CSV, a TSV or an xlsx, the
  format found from the first bytes and not from the name, into a table
  of typed columns, integer, float, boolean or text, with the column of
  the names apart; or a refusal with its kind and its place, whose kinds
  are those of the application's reader today, the duplicated individual
  and the row of the wrong length among them. It finds the encoding, the
  separator and the decimal mark as the application's reader does, and
  takes each when the user sets it. It reads `NA`, `-`, an empty cell
  and, in an xlsx, the seven errors of Excel as missing, the owner's
  rules of 28 September 2026.
- A release that `package.json` can name, as popnei and xlsx_rs are
  taken (`docs/technology.md`, section 5): the pre-release
  `js-v0.2.0-dev.1` of 2 October 2026,
  `https://github.com/JoseBlanca/table_io/releases/download/js-v0.2.0-dev.1/table_io-0.2.0.tgz`,
  with the hash for the lockfile in its notes. Its `.wasm` is 651,456
  bytes, 0.33 MB gzipped, where xlsx_rs's is 0.30 MB.
- Speed and memory under node on the owner's Mac: a CSV of 36 MB, 100,000
  rows, read in 1.04 to 1.07 s the first time and 0.52 s after; a CSV of
  20 MB took up to 610 MB of the wasm's memory, a figure not tried in a
  browser.

What changes for the page if it is taken: nothing a user sees but the
download. The light worker calls table_io for every file, and makes of
its columns the table the project holds today, so core and the screens
do not change; the reader of CSV in TypeScript, about 3,000 lines with
its tests under `src/worker/individuals/`, and the code that turns the
cells of the files wasm into a table, `src/worker/xlsxCells.ts`, go; the
inference of the types the project keeps, identifier, binary, continuous
and categorical, is made from table_io's types. A CSV, which today loads
no wasm, then downloads 0.33 MB the first time, about a quarter of a
second at 10 Mbit/s (0.33 MB is 2.6 Mbit), and the first read of a large CSV
takes the time above. Its tests are those of the reader today, on the
same files, which must give the same tables.

- **(a) Switch in this piece.** One piece instead of two, with the
  reader and the screen tried together; the piece is larger, and a
  difference between the two readers would show up while the owner tries
  the screen.
- **(b) Switch in a piece of its own, right after this one: recommended.**
  This piece reads with the reader the old page has tested since
  September; the next one changes the light worker alone, and is checked
  by the same tests and files giving the same tables, with no screen to
  try.
- **(c) Keep xlsx_rs.** No work, and two readers of the same rules to
  keep, the one in TypeScript here and table_io in Rust.

The change of dependency is the owner's to decide.

### 3. The counts before and after the filters

- **(a) Both, in two columns: recommended.** "In both files" tells what
  the file gives each population; "After the filters" tells how many the
  analyses per population will read, which is what step 2 of case 4 asks
  ("a small one gives values that cannot be compared"). Its cost: the
  second column is "…" until the end of the one pass, and the column
  shows, per population, what the thresholds of the individuals keep,
  which is close to the line "Keeps N of M" the owner took off the
  thresholds on 8 October 2026; here it is in the box of the populations,
  not under a threshold.
- **(b) After the filters only.** One column; nothing to count until the
  end of the pass, so a user who opens both files sees no number for a
  while, a time that grows with the file.
- **(c) Before the filters only.** Known at once; a user who removes
  individuals with the thresholds does not see which populations they
  shrink until the analyses run.

### 4. The unclassified in the analyses per population

Not built in this piece; decided with case 4, and asked now because the
owner's words lean on it.

- **(a) The unclassified are one population of their own,
  "Unclassified", in every analysis per population.** With no file,
  every analysis runs on all the individuals as one population, as the
  old page does with "All individuals". With a file, the individuals left
  out of it are compared with the populations as if they were one, which
  they are not: a diversity or an Fst of a mixture of what the file did
  not classify.
- **(b) The unclassified are one population only when no individual is
  classified; otherwise they are left out of the analyses per population
  and named with their count beside the results: recommended.** With no
  file, or no column chosen, every analysis runs on all individuals; with
  populations, the analyses compare the populations, and the unclassified
  still enter the PCA, the filters and the download. It is the rule
  `docs/functionality.md` section 4 has for an empty cell.
- **(c) The unclassified always left out.** With no file no analysis per
  population runs, against the owner's words.

### 5. Where each file is opened

On 6 October 2026 the owner put the opening of the variants file after
the plots, at the end of the page; that was before the page had two
files and two boxes.

- **(a) Each box ends with the opening of its file: recommended**, "Open
  variants file…" and "Open individuals file…", each a zone that also
  takes a file dropped on it. The file and the way to change it are in
  one place, and both are seen before any tab.
- **(b) Each opening at the end of its tab.** The order of the owner's
  decision of 6 October kept; an individuals file is opened from a tab
  that has to be chosen first.

### 6. A column of many values

A column of more than 200 values gives no table in the box, with the
words above. 200 is the bound of the heatmap of the distances. The
alternative is no bound, a table of 1,845 rows in the box, scrolled
inside it. Recommended: the bound, since such a column is almost always
not one of populations.
