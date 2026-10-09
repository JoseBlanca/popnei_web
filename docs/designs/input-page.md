# The input page of popgen2.html, with the individuals file

A design of 9 October 2026, approved by the owner on 9 October 2026 with
the five answers written under "What the owner decided", at the end,
numbered there and named "answer 1" to "answer 5" in the text, and
revised the same day for them. It decides how the page that opens the
files of `popgen2.html` takes a second file, the individuals file, the
table that assigns each individual of the variants file to a population;
how the page shows the two files, a box for each at the top and under
them two tabs, one for each file; and that table_io, the owner's reader
of tables, replaces xlsx_rs as the reader of the individuals file, for
both pages. It touches sections 6 and 7 of `docs/architecture.md`,
section 4 of `docs/functionality.md` and section 5 of
`docs/technology.md`, whose corrections are listed under "The
corrections made to the other documents". What the users come to do is
in `docs/use-cases.md`, cases 3 and 4 above all. The page as it is,
before this piece, is that of `docs/designs/stats-filters.md`, built and
accepted by the owner on 8 October 2026, with the download of the
filtered variants built on the branch `download` on 9 October 2026. The
specs written from it are `docs/specs/steps/popgen2-input.md`, the
screen, and the module specs it names there.

## The design in short, for the owner

- The page has two parts. At the top, two boxes side by side, one above
  the other on a phone: the box of the variants file, which shows what it
  shows now, and the box of the individuals file, which shows its name, a
  list to choose the column that assigns the populations, and how many
  individuals the filters keep in each population. Each box ends with its
  own button to open its file. Under them, two tabs, "Variants file" and
  "Individuals file". The first holds everything the page shows now
  under the box, the plots with their thresholds, the FILTER box and the
  download of the filtered variants. The second shows the table of the
  individuals file as it was read.
- An individual of the variants file with no population is
  **unclassified**: with no individuals file every individual is, and so
  is one whose cell in the column is empty, or who is not in the
  individuals file at all. The unclassified form a population of their
  own only when there is no other; otherwise the analyses per population
  leave them out, and the box says how many they are.
- The counts are of the individuals the filters keep, one column. With
  no threshold of the individuals on, as the page opens, they are known
  as soon as both files are read; with one on, once the variants file is
  read to the end, and not after a Stop.
- When a file is opened the page chooses the column of the populations:
  the first column that table_io reads as text with 20 different values or fewer. table_io has no type
  "categorical", and popnei_web's own type of that name would skip a
  column of two populations, so text is the nearest thing table_io gives
  (below, "The column chosen when a file is opened"). The user can choose
  another.
- A column of more than 20 different values gets no table of counts,
  only a warning that it is unlikely to be the column of the populations.
- table_io reads the individuals file, a CSV, a TSV or an xlsx, on both
  pages, since both use the same reader. It adds 0.34 MB, downloaded the
  first time any individuals file is read, a CSV included; the reader of
  CSV in TypeScript, about 2,900 lines with its tests, goes, and xlsx_rs
  leaves `package.json`.

## What the user can do once it is built

A user with `panel.nei`, 200 individuals, and `panel_pops.csv`, which
assigns them to three populations in its column `popcat`, opens
`popgen2.html`. They open `panel.nei` with the button of the box of the
variants file, which counts its variants as the page reads it, while the
plots fill in under the tab "Variants file", as today. They open
`panel_pops.csv` with the button of the box of the individuals file. The
box shows its name, and the list of the column of the populations with
`popcat` chosen, the only column of the file and a column of text. As
the page opens with no threshold of the individuals on, the box lists at
once p0 with 48 individuals, p1 with 68 and p2 with 84. When the user
sets the missing rate of the individuals to 0.1 under the tab "Variants
file", the counts change, once `panel.nei` has been read to the end, to
what the filters keep. Under the tab "Individuals file" they see the 200
rows of `panel_pops.csv`, and how it was read. The user of case 4 has
then seen what step 2 of that case asks: how many individuals each
population has, before the analyses per population, which later pieces
build.

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
- **table_io**: the owner's library that reads a CSV, a TSV or an xlsx
  into a table of typed columns, the project xlsx_rs renamed and widened
  on 2 October 2026, in the repository `github.com/JoseBlanca/table_io`,
  checked out at `~/devel/xlsx_rs`. Its **package** is that library
  compiled to wasm, the code a browser runs beside JavaScript, with the
  JavaScript that loads it; the light worker downloads it the first time
  it reads a file. It replaces the **files wasm**, the package of
  xlsx_rs, which read only the cells of an xlsx.
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

Four things make this more than a new screen over that code:

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
   change with each change of a threshold of the individuals, and never
   be the count of other thresholds than those shown.
4. **Another reader, which types its columns.** The owner chose on 9
   October 2026 that table_io reads the individuals file in this piece.
   It is a new dependency of the site, loaded for every file and not only
   for an xlsx, and the light worker is shared by both pages. table_io
   gives each column one of four types of values, integer, float,
   boolean or text, where popnei_web's project keeps the four of its
   analyses, identifier, binary, continuous and categorical, and reads a
   CSV's numbers as numbers where the reader of today keeps every cell of
   a CSV as text.

## The page

### The two boxes

At the top of the page, under its heading, the two boxes, the variants
file's first. From a width of 720 px they stand side by side, each half
the width; below it, one above the other, at 320 px included, each the
width of the page less its 16 px margins.

**The box of the variants file** shows what the box shows now: the name
and size, the individuals, the variants, the FILTER failures, the
chromosomes and the ploidy, the bar of the one pass with its Stop and
Start again, and what went wrong. It ends with the button that opens a
variants file, "Open variants file…", which also takes a file dropped on
it, moved here from the end of the page, where the owner had put it on
6 October 2026, before the page had two files.

**The box of the individuals file** shows:

- with no file: "No individuals file: every individual is
  unclassified.", and, once a variants file is open, "No individuals
  file: all 200 individuals of panel.nei are unclassified, and the
  analyses per population will take them as one population.";
- while the file is read: its name and "Reading panel_pops.csv.";
- a file refused, or a reading that failed: its name and words of its
  own for this page, made from those of the old page
  (`individualsStepNeeds` of `src/core/project.ts`) as the box of the
  variants file has its own (`variantsOpenNeeds`): "panel_pops.csv could
  not be read: line 7 has 3 cells where the header has 4, read with the
  comma as the separator. Choose another separator under the tab
  Individuals file, or open a corrected file." The words of the old page
  do not do as they are: after a reader that could not start they say
  to save the project and reload the page, which this page cannot do,
  and a variants file given in the place of the individuals file is sent
  to "the Variants step", which this page does not have;
- a file read: its name, the list "Column of the populations", and the
  counts;

and it ends with the button "Open individuals file…", which also takes a
file dropped on it, and, with a file, "Remove panel_pops.csv", which puts
the page back to no file.

The list has, first, "None: every individual unclassified", and then
every column but the first, which names the individuals, by its name in
the file. A choice is a command that sets the grouping, as on the old
page. A column of any type can be chosen, since a population is the text
of its cell, "P1" and "p1" being two. When the file is opened, the page
chooses a column itself, as "The column chosen when a file is opened",
below, says.

The counts are a table of two columns, the population and its
individuals kept by the filters, as the owner decided (answer 2):

| Population | Individuals |
|---|---|
| p0 | 31 |
| p1 | 44 |
| p2 | 36 |

Over the table, "Individuals of panel.nei kept by the filters". The
populations are those with an individual in both files, in the order in
which each first appears in the individuals file, as on the old page. A
population whose every individual is outside the variants file has no
row; its individuals are among those of the last line, below. A
population that the filters leave empty keeps its row, with 0.

Under the table, when some individuals are unclassified and some are
not, a line says how many the filters keep and why they are
unclassified: "Unclassified, left out of the analyses per population: 7
individuals, 3 with an empty cell in popcat and 4 that are not in
panel_pops.csv: s031, s044, s102 and 1 more." Past three names it gives
the count of the rest; the full list is under the tab "Individuals
file", below. When every individual is unclassified, the table has no
row, and the line says what the analyses will do: "All 200 individuals
kept are unclassified, and the analyses per population will take them as
one population." When no individual of the variants file is in the
individuals file, which a file of other names, "S-001" for "s001", gives
for all, a warning takes the place of that line: "Warning: none of the
200 individuals of panel.nei is in panel_pops.csv, so all of them are
unclassified. The first column of panel_pops.csv has to hold their
names as panel.nei writes them: panel.nei starts with s000, and
panel_pops.csv with S-000." It is a warning and not an error, since the
page goes on, but a user who did not see it would compare no
populations without knowing why.

The last line, as the owner asked: "Individuals of panel_pops.csv not in
panel.nei: 18", the rows of the individuals file whose individual
`panel.nei` does not have, which nothing uses; 0 is written too. It
does not depend on the filters.

Before a variants file is read, the box of a file read shows the list,
and in the place of the counts, "The individuals are counted once a
variants file is open." With a threshold of the individuals on, the
counts wait for the one pass, as "Counts after the filters, from the one
pass", below, says.

A column of more than 20 different values, missing ones left out, as a
column of the names of the accessions would give, has no table, as the
owner decided (answer 5): the box says "Warning: accession has 1,845
different values, too many for a column of populations, so they are not
counted here. If it is not the column of the populations, choose another
in the list." The values are counted in the individuals file, so the
warning is the same before and after a variants file is open.

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
options of the reader of a text file, below, since a wrong separator is
the commonest cause of a refusal and is mended here.

A file read shows, in this order:

- For a file table_io read as text, a CSV or a TSV, how it was read,
  with a list to change each of the encoding, the separator and the
  decimal mark, each "Detected: …" until the user sets it, as in the old
  Individuals step (`docs/specs/steps/individuals.md`, "How the file was
  read"). For an xlsx, the line "Read from the first sheet of
  panel_pops.xlsx; any other sheet is not read." Which of the two is
  told by what table_io found in the bytes, not by the name of the file,
  so a CSV named `.xlsx` is read as the CSV it is.
- When individuals of the variants file are not in the file, their full
  list, under "Individuals of panel.nei not in panel_pops.csv", with a
  button that copies the names, as the old step had it.
- The table: every row and every column of the file, the column of the
  names first and its cell the header of its row, so that a screen reader
  reads a cell with its individual and its column, "s031, popcat, p1". A
  missing value shows empty; a number of a text file is written with the
  decimal mark of the file, `1,75` in a file read with the comma. Over
  the table, "200 rows, 2 columns".

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

## The column chosen when a file is opened

The owner decided (answer 1) that the column of the populations is, by
default, the first categorical column that table_io gives.

table_io gives no categorical column. Its package types each column but
the first, which names the individuals and has no type, as `"integer"`,
`"float"`, `"boolean"` or `"text"`, the first of the four that holds
every value of the column, its missing values left out
(`columnType` of `TableRead`, in the package's `wasm/table_io.d.ts`, and
its README, "What a table is"); a column whose every cell is missing is
text. What a column means beyond that is each application's, by the
owner's decision of 2 October 2026 recorded in table_io's
`docs/architecture.md`, section 2: "Whether a column is categorical, a
classification of populations, is the choice of each application, by
its own rule."

Two meanings were weighed, on the fixtures of the tests read with the
release `js-v0.2.0-dev.1` under node on 9 October 2026:

- **popnei_web's own type categorical** (`inferColumnTypes` of
  `src/worker/individuals/columnTypes.ts`): a column of exactly two
  different values is binary, and one of three or more numbers
  continuous, so categorical is a column of text of one value or of
  three or more. `ld_pops.csv`, whose column `pop` holds two
  populations, would get no column, and a user whose collection is two
  populations, wild and cultivated, would see every individual
  unclassified until they chose.
- **table_io's type text, with at most 20 values: taken.** The first
  column after the names that table_io reads as text and that holds from
  1 to 20 different values, missing ones left out, 20 being the bound
  above which the box counts no populations (answer 5). The bound skips a
  second column of names, the accessions beside the names of the
  samples, which many metadata files have. It gives
  `popcat` for `panel_pops.csv`, `panel_pops.txt` and `panel_meta.csv`,
  whose second column, `altitude`, is integer; `popsplit` for
  `panel_split.csv`; `pop`, two populations, for `ld_pops.csv`; and
  `Población` for `excel_en.xlsx` and `individuals_10000.xlsx`. It is
  the nearest thing to categorical that table_io gives, and is decided
  by the session from the owner's answer; the owner may change it after
  trying the page.

What the rule misses, and what the page shows then:

- populations numbered `1`, `2`, `3` are an integer column and are not
  chosen; when no column is text, the list stays on "None" and the box
  says "No column of panel_pops.csv holds text with 20 different values
  or fewer, so none was chosen as the column of the populations. Choose
  it in the list.";
- a column of text before the populations, `sex` with `M` and `F`, is
  chosen in their place, and the counts show two populations named `M`
  and `F`;
- a column of text of fewer than 21 values that is not the populations,
  a locality of 12 values before the populations, is chosen in their
  place.

The page knows the type from the table in the project, without asking
table_io again: a column is text when one of its cells is a text, since
the light worker makes every value of an integer, float or boolean
column a number or a boolean, but for an integer column with a value
beyond 2^53, which it keeps as texts (below, "What the switch to table_io
changes"); such a column, of identifiers, has more than 20 values as a
rule. The choice is a pure function of core, beside the counts in
`src/core/populations.ts`.

It is made by the entry of the page, as a command, `setGrouping`, at each
read of the individuals file that the store records as a table, when the
grouping names no column of that table: no column is chosen, or the one
chosen is not a column of the new file. "None" in the list is the
grouping of the populations with no column, `{ kind: "populations",
column: null }`, the grouping a project starts with; the one population
of the old page, `onePopulation`, is not offered here. So a file opened first gets its
column; another file opened with a column of the name already chosen
keeps it, as on the old page; and a column the user chose is never
replaced, since the entry acts once on each read, when it is recorded,
and not at every change of the project. A user who chooses "None" keeps
it until the file is read again, by another file or other options of a
CSV, when the page chooses a column again: the entry cannot tell a
"None" the user chose from one no column gave, without keeping a state
of its own. It cannot be made by core when the read is recorded: that writing
puts the table, and nothing else, into the current project and the
projects of the history that hold the file (`recordShared` of
`src/core/store.ts`), so a column chosen there would be lost from the
earlier projects, and an Undo, once the page has one, would bring back
counts with no column; and that writing is shared with `popgen.html`,
whose user chooses every column. What it costs: one step more in the
history at each opening, and code in the entry and not in core.

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

- each population of the column chosen with an individual in both files,
  with its individuals kept, or none known yet;
- the unclassified kept, with how many have an empty cell and how many
  are not in the individuals file, and the names of all those not in the
  individuals file, kept or not, in the order of the variants file, for
  the tab "Individuals file";
- the number of rows of the individuals file whose individual is not in
  the variants file;
- the number of different values of the column, for the bound of 20.

It is built on what core has: the populations of a column
(`populationsOf`, which reads each table once for each column and keeps
the answer), the individuals of the two files matched (`individualsCheck`,
kept for each pair of reads), and the individuals kept. With no column
chosen, or no individuals file, every individual of the variants file is
unclassified and no population has a row.

### Counts after the filters, from the one pass

The owner decided (answer 2) that the box shows the counts after the
filters only. They need no second reading of the variants file:

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
  individuals kept, and the counts made from them, change in the same
  drawing of the page. A threshold changes the project when the line is
  let go, when a number typed is committed, or a second after the last
  press of an arrow key (`src/ui/variants/StatsHistogram.tsx`), so the
  counts follow those and not the line while it is dragged. No filter of
  the variants removes an individual, so a threshold of the variants
  changes no count.

With no threshold of the individuals on, as the page starts, the
filters keep every individual, which the store knows with no pass
(`individualsKept` gives the list as known, removing nobody), and the
counts are shown from the moment both files are read. With a threshold
on, they cannot come before the end of the one pass: until then the
store does not know the individuals kept, and after a Stop it does not
either, since the numbers of a pass stopped are not kept as a result.
So, with a threshold on:

- while the pass runs, the table lists the populations with "…" in the
  place of each count, and the line under it says "The individuals the
  filters keep are counted once panel.nei is read to the end.";
- after a Stop, the same table, and the line "Not counted: the reading
  of panel.nei was stopped. Start it again in the box of panel.nei to
  count the individuals the filters keep.", until Start again ends a
  pass;
- after a failure of the pass, "Not counted: panel.nei could not be
  read to the end.", the box of the variants file saying why.

The line of the unclassified waits with the counts; the warning of no
individual in the file, the list of those not in it and the last line
do not, since they depend on the two files alone. The download of the
filtered variants waits for the same end, so the two never disagree.

### The unclassified in the analyses per population

This piece runs no analysis per population: `popgen2.html` has none yet.
The owner decided (answer 3) how the analyses of case 4, the diversity,
the distances between populations and the LD decay, will treat the
unclassified when they come to this page: the unclassified are one
population only when no individual is classified, with no file, no
column chosen, or a column whose every individual of the variants file
is unclassified; otherwise they are left out of the analyses per
population, and the box still says how many they are. They still enter
the PCA, the filters and the download. It is the rule
`docs/functionality.md` section 4 has for an empty cell. The option not
taken: the unclassified as a population of their own beside the others,
which would compare a mixture of what the file did not classify with
the populations.

Until those analyses come, the old page, `popgen.html`, keeps its rule,
every individual of the variants file in the file or nothing per
population runs, since its code is shared and is not changed by this
piece.

## What happens when

| what the user does | what the page does |
|---|---|
| opens an individuals file before a variants file | reads it, chooses its column and shows its list; the counts wait for a variants file, as said above |
| opens another variants file | keeps the individuals file and the column chosen, and counts again against the new file's individuals; the opening is the store's opening of a file, as today, which keeps the rest of the project |
| opens another individuals file | replaces the first; the column chosen is kept if the new file has a column of that name, and otherwise is chosen as for a first file |
| removes the individuals file | every individual is unclassified; the column chosen is kept in the project, so that a file opened again finds it by its name, as on the old page |
| opens a file with one individual in two rows | table_io refuses it, as the reader does today, with words that name the individual and end "Open a corrected file."; a population taken from either row would be a guess |
| leaves cells of the column empty | those individuals are unclassified, counted as "with an empty cell"; `NA` and `-` are empty too, and in an xlsx the errors of Excel, as `docs/functionality.md` section 4 has it |
| changes the separator of a CSV | the file is read again, the counts with it, and the column is chosen again if the new table has none of the name chosen |
| opens a CSV whose name ends in `.xlsx` | table_io reads it as the CSV it is, from its bytes, and the tab shows how it was read |
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
options of a CSV, the column of the populations and the column the page
chooses are each a step of the history. None of them changes the key of
the one pass, so none stops it, and none changes the key of the
download, so the text after a download stays. What it costs: the
history, which the page keeps ready for an Undo it does not show (the
owner hid Undo and Redo on 8 October 2026), holds these steps beside
those of the filters, where the opening of a variants file is no step.
When Undo comes back, whether an Undo takes back the opening of an
individuals file is decided then; nothing of this piece prevents either
answer.

## The options

Four choices are argued; the rest of the page follows from the owner's
decisions.

### Where the counts come from

- **(a) From the project and the individuals kept, in core, on the
  page: taken.** No reading of the variants file and no request to a
  worker; the counts change with each change of the project, in the
  drawing that shows it. What it costs: a walk over the individuals of
  the variants file at each change of the project that touches them, a
  few thousand names, well under a millisecond by the size of the work,
  not measured; the populations of a column are kept and not found
  again.
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

The owner chose table_io for this piece (answer 1), over a piece of its
own after this one, which the draft recommended, and over keeping
xlsx_rs. What table_io offers, from its package's README and its report
of 2 October 2026:

- One function, `importTable`, that reads a CSV, a TSV or an xlsx, the
  format found from the first bytes and not from the name, into a table
  of typed columns with the column of the names apart; or a refusal with
  its kind and its place, whose kinds are those of the application's
  reader today, the duplicated individual and the row of the wrong
  length among them. It finds the encoding, the separator and the
  decimal mark as the application's reader does, and takes each when the
  user sets it. It reads `NA`, `-`, an empty cell and, in an xlsx, the
  seven errors of Excel as missing, the owner's rules of 28 September
  2026. Its rules are those of `docs/specs/worker/individuals.md`, moved
  there; run side by side with the reader of today over 420,000 random
  files under node, the two gave the same table or the same refusal in
  every one but a file of UTF-16 that starts with its mark three times
  (table_io's `docs/reports/table-io.md`).
- A release that `package.json` names, as popnei is taken
  (`docs/technology.md`, section 5): the pre-release `js-v0.2.0-dev.1` of
  2 October 2026,
  `https://github.com/JoseBlanca/table_io/releases/download/js-v0.2.0-dev.1/table_io-0.2.0.tgz`,
  downloaded on 9 October 2026, whose declarations are those of the
  checkout at `~/devel/xlsx_rs/js/table_io/wasm/table_io.d.ts`.
- Speed and memory under node on the owner's Mac: a CSV of 36 MB, 100,000
  rows, read in 1.04 to 1.07 s the first time and 0.52 s after; a CSV of
  20 MB of short cells took up to 610 MB of the wasm's memory, a figure
  not tried in a browser.

### Which pages switch

- **(a) Both pages, `popgen2.html` and `popgen.html`: taken.** The light
  worker is one script for both pages (`src/worker/filesRunner.ts`), so
  switching it switches both; the old page keeps working with the same
  table, and changes where table_io reads differently, below. One reader,
  one dependency.
- **(b) `popgen2.html` alone.** The light worker would hold both readers,
  chosen by a field of the request, and the site both packages; the
  reader in TypeScript, its tests and xlsx_rs would stay until the old
  page goes. Two readers of the same rules to keep in step, which
  table_io was made to end.

(b) would win only if the old page had to stay exactly as it is until it
is retired, which nothing asks.

### What the switch to table_io changes

- **The light worker.** It loads table_io's package for every file, on
  the first read, as it loads xlsx_rs's for the first xlsx today, with
  the same retry after a failed download; checks the size of the file,
  20 MB, before it reads the bytes, since the package sees them only once
  they are in its memory; calls `importTable` with the options of the
  CSV, the 20 MB and the 2,000,000 cells of a sheet of today; makes of
  the columns the table the project holds, and of a refusal the
  `IndividualsFileError` of today; and frees what the package holds.
  `src/worker/individualsFile.ts` and `src/worker/filesRunner.ts` change;
  `src/worker/xlsxCells.ts` and the reader of text,
  `src/worker/individuals/csv.ts`, `rows.ts` and `sheet.ts` with their
  tests and `properties.test.ts`, go: 2,273 lines, and with
  `xlsxCells.ts`, its test and the parts of `individualsFile.test.ts`
  that test the decoding, about 2,900. `columnTypes.ts` stays, since
  core calls it for the types the old page lets the user set, and its
  inference runs on the table table_io gives.
- **The table.** A value of an integer or float column becomes a
  number, of a boolean column a boolean, of a text column its text, and
  a missing one `null`, as an xlsx gives them today. A CSV then gives
  numbers where the reader of today gives text: `007` becomes 7 and
  `1,75` the number 1.75. The names of the individuals stay text as
  written. An integer column with a value beyond 2^53, which a number of
  JavaScript cannot hold exactly, is kept whole as texts, each the whole
  number as table_io read it, so that two identifiers that differ in
  their last digit stay two. Within a column of numbers, `1` and `1,0`
  are one value, and so are `01` and `1`, where today they are two
  texts.
- **The names of the populations**, and the cells the table under the
  tab shows, are the text of the cell as the file writes it as nearly as
  the table holds it: a number written with the decimal mark of the
  read, `1,75` for a file read with the comma, where `populationsOf`
  writes it today with `String`, `1.75`; a boolean `true` or `false`.
  So a population of a column of decimals is named on the old page as
  it is today, and the box and the table under the tab agree.
- **The types** the project keeps, identifier, binary, continuous and
  categorical, are inferred as today, by `inferColumnTypes`, from that
  table; the project, its file and the old page's screens of the types do
  not change.
- **The refusals.** A CSV named `.xlsx`, refused today as "not an Excel
  workbook", is read. A zip that holds no workbook is a refusal of its
  own. The refusal of a reader not downloaded is of every file, not only
  of an xlsx, and its words say so. Every failed read carries the format
  table_io found, text or xlsx, or none when the file was refused before
  table_io saw it; a refusal that names a row or a column names it as
  Excel does for an xlsx and as an editor does for a text file, and the
  options of a CSV are shown beside a refusal of a text file alone, all
  from that format and not from the name of the file. The words that
  speak of the name, "although its name ends in .xlsx", lose it, since
  an `.xls` named `.csv` reaches them too. `popgen2.html` turns no file
  away by its name: table_io says what each is. The old page keeps its
  check of the name before the read (`src/ui/steps/individuals/words.ts`).
- **The old page.** Every file it loads carries the options of a CSV,
  since the format is found from the bytes; its Individuals step shows
  those options for a file read as text, and the line of the first sheet
  for an xlsx, by what the read found. Its table shows a CSV's numbers as
  numbers, and its words of the refusals change as above. Its flows are
  run again, and their literals of the cells of a CSV change.
- **`package.json`.** table_io's URL is added, and xlsx_rs's removed,
  since nothing else uses it; the lint rule that lets only
  `filesRunner.ts` load the files wasm names table_io.
- **The tests** of the reader become tests of the mapping, with
  table_io's package loaded under node as its README says, on the files
  of the tests of today, which must give the same tables but for the
  numbers of a text file.

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
   and the choice of the column are in `src/core`, the boxes and the
   tabs in `src/ui`, table_io's package in `src/worker/filesRunner.ts`
   alone.
3. **The project is one plain value**, changed by commands. Kept: the
   opening, the removal, the options of a CSV and the column are the
   commands of core that exist, `loadIndividuals`, `removeIndividuals`,
   `setCsvOptions` and `setGrouping`, sent as "How an opening of the
   individuals file reaches the store" says; the tab shown is state of
   the screen, which section 7 allows, "a tab that is open".
4. **`src/core` has no DOM and no React.** Kept.
5. **Two workers, one request at a time in each.** Kept: the light
   worker reads the individuals file as it does today, with another
   package.
6. **A cancel ends its worker and starts another.** Kept, and not
   touched: a read of an individuals file is a second or two, and a new
   file picked while one is read leaves the late read unrecorded, by its
   load id (section 6).

What changes:

- **A rule of section 6, for one page**: "Every individual of the
  variants must be in the file". The code that relies on it is
  `individualsNeeds` of `src/core/project.ts`, called by the PCA, the
  diversity, the distances and the LD decay of `popgen.html`, and by none
  of `popgen2.html`, whose analyses are the one pass and the write. So no
  code changes for it now; the analyses of case 4 will take the rule of
  answer 3 when they come to this page.
- **What the site depends on**: table_io's package in the place of
  xlsx_rs's, loaded for every individuals file. The interface between
  the light worker and the page keeps its shape, the read of
  `src/worker/messages.ts` with the table, the types and what was found;
  the union of the refusals, `IndividualsFileError`, loses `notXlsx`,
  gains `notWorkbook`, and renames `xlsxReaderNotLoaded` to
  `readerNotLoaded`; and a failed read carries the format table_io found,
  or none. A failed read is never saved in a project
  file (`docs/specs/core/projectFile.md`), so the format of that file
  does not change.
- **The project's options of a CSV**, `csv` of `IndividualsSource`, are
  set for every file loaded, an xlsx too, since the light worker finds
  the format from the bytes; `null` stays valid, for the projects saved
  before, whose xlsx were loaded with none.

## How it is tested, and what would prove it wrong

- **The counts**, in Vitest under node, with the store of the page and a
  fake worker: `panel.nei`'s 200 individuals and `panel_pops.csv` give
  48, 68 and 84 and no unclassified; a file without 7 of them gives 7 not
  in the file, named in the order of the variants file; a column with 3
  empty cells gives 3 with an empty cell; a file of other names gives the
  warning; a column of 21 values gives the warning of too many and no
  table. The counts with a threshold on are checked against
  `individualsKept` for the same thresholds, equal to those of the whole
  file with no threshold on, and "not known" before the end of the pass
  and after a Stop. The same inputs give the same object, and a
  progress of the pass draws no box again. A threshold of the
  individuals moved changes them with no request sent to a worker, which
  the fake worker counts.
- **The column chosen**, in Vitest: the function of core on the tables
  above gives `popcat`, `pop` and `Población`, and `null` for a table of
  numbers; the entry's command is sent once for each read recorded, and
  not again after the user chooses "None".
- **The reader**, in Vitest under node with table_io's package: every
  file of the tests of today gives the table it gives today, the cells
  of a text file that are numbers or booleans now as numbers or
  booleans, and every refusal of today its kind and its place; a CSV
  named `.xlsx` is read.
- **The page**, in Playwright, in Chromium and WebKit, the two engines
  that start on the owner's Mac: the two files opened in either order;
  the tabs by keyboard alone, the arrow keys, Home and End; a threshold
  moved under the tab "Variants file", the other tab shown and the first
  shown again, the threshold, its line over the plot and the plots as
  they were; a table sorted and scrolled, the other tab shown and back,
  the same; an individuals file opened while the one pass runs, which
  does not stop it; the table of `individuals_10000.xlsx`, 10,000 rows,
  sorted, with the page answering a key within a tenth of a second; the
  page at 320 px with no sideways scroll; and axe, the checker of
  accessibility the tests run, with no finding. The flows of the old
  page's Individuals step are run again. The screen is then looked at in
  a browser, as `CLAUDE.md` asks.
- **What would send the design back**: a plot, or the line of its
  threshold, that comes back from the other tab drawn wrong or at the
  wrong width; a count after the filters that differs from what the
  download writes, "Individuals removed: 84 by the missing rate", for
  the same thresholds; a table of a real individuals file that freezes
  the page when its tab is shown; or a file of 20 MB that table_io
  cannot read in a browser's worker for lack of memory.

## What is hard to undo

- **The dependency.** table_io's release is named by its URL and never
  moved once named; a newer table_io is a new tag and a new URL. Going
  back to xlsx_rs would bring back the reader in TypeScript, from the
  history of git.
- **The cells of a text file as numbers**, once a project file of
  `popgen2.html` saves them; a project saved by the old page before the
  switch keeps its text, which the project still accepts.
- **The word "unclassified"**, once it is in the tables of the analyses
  per population and in their downloads, is a name users will find in
  their files; until then it is a word of one box.
- **The column chosen by the page** is put into the project as if the
  user had chosen it, which a project file would save; a later version
  could stop choosing it without breaking those files.

## The costs of the web

- **Memory of the tab.** The table is in the project, as on the old
  page. The light worker refuses a file above 20 MB
  (`MAX_INDIVIDUALS_FILE_BYTES` of `src/worker/individualsFile.ts`), but
  that bounds the file and not the table: a CSV of 20 MB of short cells
  makes millions of cells, each a value of JavaScript, in the light
  worker, in the message to the page and in the project, which may take
  several times the size of the file. table_io adds its own: up to 610 MB
  of the wasm's memory for a CSV of 20 MB of short cells under node, and
  the memory of a wasm never shrinks, so the light worker keeps it until
  the page closes or the worker is started again. The plan of the piece
  measures the memory of the light worker and of the page with such a
  file in Chromium and WebKit. Decided now, so that the measurement
  only sets a number: the light worker is ended, and started again at
  the next read, after each read of a file larger than a size the plan
  sets from the measurement, 2 MB until then. It loses nothing, since the
  table is in the project, and costs the next read the compiling of the
  package again from the browser's cache, not measured. It is a change of
  the client of the light worker, not of its messages. A common file, 5,000 rows of 20 columns, is a hundred
  thousand cells. The counts keep one list of names per population,
  which the store keeps once for each table and column. Nothing grows
  with the variants.
- **The page frozen.** The table draws only the rows in view, measured
  at 10,000 rows (above). The counts walk the individuals once per
  change, in core on the page, not measured, a few thousand names. A
  plot draws again when its tab is shown, from numbers in the store, as
  a change of a threshold already does. table_io runs in the light
  worker, never on the page.
- **Download size.** table_io's `.wasm` is 651,680 bytes, 330,416
  gzipped with `gzip -9`, and its JavaScript 37,489 bytes, 6,758
  gzipped, measured on the release `js-v0.2.0-dev.1` on 9 October 2026:
  0.34 MB downloaded the first time an individuals file is read, a CSV
  included. Today a CSV downloads nothing and an xlsx xlsx_rs's package,
  300,646 and 3,041 bytes gzipped, 0.30 MB. Neither is downloaded before
  a file is opened, and the browser keeps it after. 0.34 MB is about a
  quarter of a second at 10 Mbit/s. The page's first script grows by the
  code of React Aria's table, its tabs and its list, which
  `popgen2.html` does not use yet; React Aria's table alone was 14.19 KB
  gzipped when it was taken off another page (`src/ui/widgets/Table.tsx`);
  the build of the piece measures the whole.
- **The browsers.** Nothing newer than the floor, Chrome 111, Firefox
  115 and Safari 16.4: React Aria's tabs and table are used on the old
  page already, and table_io's package is built as xlsx_rs's was,
  `wasm-bindgen --target web`, with `BigInt64Array`, in every browser of
  the floor.
- **What GitHub Pages does not allow.** Nothing asked: no header, no
  file from another address; the `.wasm` is served by the site, as
  xlsx_rs's is.
- **Accessibility.** The tabs, the list of the column and the table work
  with the keyboard alone, as React Aria makes them; no meaning is
  carried by colour alone; each warning says it is a warning in words.
- **What is lost when the tab is closed or a worker restarts.** Both
  files, until the page saves a project; the table is in the project, so
  a restart of the light worker loses nothing of a file already read,
  and the next read downloads table_io's package again from the
  browser's cache.

## The corrections made to the other documents

- `docs/functionality.md`, section 4: a paragraph after the rule that
  every individual of the variants must be in the file, which says that
  on `popgen2.html` such an individual is unclassified, as are all of
  them without a file, by the owner's decision of 9 October 2026, and how
  the analyses per population will treat them, answer 3.
- `docs/architecture.md`, section 6, "The individuals file": a paragraph
  at its end, "What was revised on 9 October 2026", with the same, the
  rule of answer 3, the column chosen and the two tabs; at the end of
  "Who asks for a read", the command the entry sends; at the end of "The
  files wasm, the package of xlsx_rs", the switch to table_io; the light
  worker of section 1 and the list of what the entry does by itself; and
  the opening of the document, one sentence.
- `docs/functionality.md`, section 4, "The format": that table_io reads
  every format, found from the bytes.
- `docs/technology.md`, section 2, the rows of the reader of xlsx and of
  the CSV in the table of the choices, and a paragraph "What was revised
  on 9 October 2026" at the end of "xlsx and zip in Rust, in xlsx_rs".

Left for the plan of the piece, which changes them with the code: the
`coding` skill and its `worker.md`, which say that the light worker loads
xlsx_rs for an xlsx; and `CLAUDE.md`, whose paragraph on the local build
of popnei ends "The same holds for xlsx_rs", which the owner may want to
read "table_io". Not corrected, being a skill: the writing skill's
example of an error, "12 individuals of panel.nei are not in pops.csv",
the rule of the old page, which holds there.

## What the session decided

Beyond the owner's answers, and open to the owner's change after trying
the page: the column chosen, the first of text with 20 values or fewer;
both pages switched to table_io, since their light worker is one; the
light worker ended after a read of a file above 2 MB, a number the plan
sets from its measurement of the memory; an integer column with a value
beyond 2^53 kept as texts; the names of populations written with the
decimal mark of the file; the tab "Variants file" shown first and never
left by the page itself; both tabs kept drawn; the openings of the
individuals file as steps of the history; and the words of the box.

## What the owner decided

On 9 October 2026, approving the design:

1. **The column of the populations when a file is opened** is chosen by
   the page, the first categorical column table_io gives, over no column
   until the user chooses. table_io gives no categorical column, so the
   session took the first column of text with 20 values or fewer, as "The column chosen when a
   file is opened" argues. The owner chose with it that table_io
   replaces xlsx_rs as the reader in this piece, over a piece of its own
   right after this one, which the draft recommended, and over keeping
   xlsx_rs.
2. **The counts per population** are those after the filters only, one
   column, over both counts in two columns, which the draft recommended,
   and over the counts before the filters only.
3. **The unclassified in the analyses per population** are a population
   only when there is no other; otherwise they are left out of the
   analyses and the box says how many they are, as the draft
   recommended, over the unclassified always a population of their own,
   and always left out.
4. **Each box ends with its own button to open its file**, as the draft
   recommended, over each opening at the end of its tab.
5. **A column of more than 20 different values** gets no table of
   counts, with its warning; the draft proposed 200.
