# popgen2.html: the two files, their boxes and their tabs

The screen spec of the page that opens the files of `popgen2.html` once
it takes a second file, the individuals file: two boxes at the top, the
variants file's and the individuals file's, each ending with the button
that opens its file, and under them two tabs, "Variants file" and
"Individuals file". It develops the design
`docs/designs/input-page.md`, approved by the owner on 9 October 2026
with its five answers, and section 4 of `docs/functionality.md`, "The
files of the individuals". Written on 9 October 2026; no code yet. It
covers step 2 of case 4 of `docs/use-cases.md`, how many individuals
each population has, and the file of the populations that case 3 needs
for the colours of its PCA.

The module specs it reads, revised for it the same day:

- the reader of the individuals file, now table_io's package in the
  light worker, its table, its refusals and what it found,
  `docs/specs/worker/individuals.md`;
- the project, its commands for the individuals file, the words of a
  refusal on this page, the names of the populations, the counts per
  population and the column the page chooses,
  `docs/specs/core/project.md`, "The counts per population on
  popgen2.html";
- the entry of the page, which sends the column it chooses,
  `docs/specs/entry.md`, "The column of the populations on
  popgen2.html";
- the client of the light worker, which ends it after a read of a large
  file, `docs/specs/worker/client.md`.

What the tab "Variants file" holds is the page as
`docs/specs/steps/popgen2-filters.md` and `popgen2-download.md` give it,
moved under the tab and otherwise unchanged; their terms are used here.

## The terms

- **The one pass** is the single reading of the variants file when it
  is opened, which gives the count of the variants, every plot of the
  page, and each individual's missing rate and observed heterozygosity
  (`popgen2-filters.md`, "The terms"). **Finished** means it read the
  file to its end: not while it runs, not after a Stop, not after a
  failure.
- **The filters of the individuals** are the two thresholds of the part
  "Individuals" of the tab "Variants file", on the missing rate and the
  observed heterozygosity of each individual. **The individuals kept**
  are those they keep; the store works them out from the finished one
  pass, and knows them with no pass when neither threshold is on
  (`docs/specs/core/store.md`, "The individuals kept").
- **The light worker** is the second thread of the tab that reads the
  individuals file with table_io, the owner's reader of tables, whose
  package it downloads at its first read, 0.34 MB gzipped, measured on
  the release `js-v0.2.0-dev.1`; the page does not freeze while it
  reads.
- **Unclassified**: an individual of the variants file with no
  population, because there is no individuals file, no column is chosen,
  its cell in the column is empty, `NA` or `-`, or it is not in the
  individuals file.
- **The grouping** is the part of the project that names the column of
  the populations; "None" is the grouping with no column.
- **The store** holds the project, the results and what is being
  calculated, and the screens read it; a **command** sent to it with
  `apply` gives a new project and is a **step of the history**, which an
  Undo would take back. The **entry** is the code that runs when the
  page opens and does what the page does by itself.
- **A load id** is the random name the page gives each file opened, new
  at every opening; a read of the individuals file is `pending` until
  the light worker answers, and its `found` is how a text file was read,
  its encoding, separator and decimal mark (`docs/specs/core/project.md`,
  `IndividualsRead`).
- **A zone** is the widget that opens a file, `FileZone.tsx`: a box that
  takes a dropped or pasted file, with its button that opens the
  browser's file picker inside it.
- **A boundary of errors** is a part of the page that, when its code
  throws, shows its name and an error in its place and leaves the rest
  of the page working (`ErrorBoundary`); the box of the variants file
  has one that is made anew for each file opened.
- **The old step** is the Individuals step of `popgen.html`,
  `docs/specs/steps/individuals.md`, whose words and widgets this page
  reuses.
- **Inert** marks a part of the page that the Tab key, the mouse and a
  screen reader all pass over.
- **The focus** is the control the keys act on; **the status region** is
  a line of the page that is not seen and that a screen reader speaks
  each time its words change.
- **A tab** here is one of the two labels under the boxes and the part
  of the page it shows, React Aria's tabs (`src/ui/widgets/Tabs.tsx`);
  the **Tab key** is the key of the keyboard, named so throughout.

## What changes for the user

- An individuals file can be opened, a CSV, a TSV or an xlsx, by its
  button, by a drop on its box, or by a paste with the focus in its box,
  before or after the variants file, and removed.
- The box of the individuals file shows the column of the populations,
  chosen by the page and changed by the user, and how many individuals
  the filters keep in each population.
- What the page showed under the box of the variants file is now under
  the tab "Variants file". The button that opens a variants file moves
  from the end of the page into its box.
- The tab "Individuals file" shows how the file was read and its table.
- An individual of the variants file that the individuals file does not
  have is unclassified, not an error.

## What it shows

### The order of the page

From the top: the heading "Popnei"; the two boxes, the variants file's
first; the row of the two tabs, "Variants file" and "Individuals file";
the part of the tab shown. From a width of 720 px the two boxes stand
side by side, each half the width; below it, one above the other, each
the width of the page less its 16 px margins, at 320 px included. The
tab "Variants file" is shown when the page opens, and the page never
changes the tab by itself.

### The box of the variants file

What the box shows today (`popgen2-filters.md`; `VariantsSummary.tsx`):
the name and size, the individuals, the variants, the FILTER failures,
the chromosomes and the ploidy, the bar of the one pass with its Stop
and Start again, and what went wrong, with the words of a file not
opened. It ends with the zone that opens a variants file, today's
`OpenVariants.tsx`, moved here from the end of the page: its button,
"Open variants file…" before a file and "Open another variants file…"
after, and the drop and the paste it takes today. Before a file is open
the box holds the zone alone, under its heading "Variants file". Both
zones, the variants file's and the individuals file's, stay outside the
boundary of errors that is made anew for each file (the `ErrorBoundary`
keyed by the load id in `VariantsPage.tsx`): a zone inside it would be
drawn anew at each opening, and the button the user pressed, which then
holds the focus, would be replaced by another, leaving the focus on
nothing. The zone of the variants file has a boundary of its own, whose
heading is "Opening a variants file", made anew at each turn of the
tabs: a throw in the zone takes away the one way to open a file, and a
turn of the tab gives it back without a reload, as a turn of the step
does on `popgen.html`. The focus is then on the tab, so no button that
holds it is replaced.

### The box of the individuals file

Its heading is "Individuals file". What it shows, the first row that
holds:

| the individuals file | what the box shows |
|---|---|
| none, no variants file | "No individuals file: every individual is unclassified." |
| none, a variants file open | "No individuals file: all 200 individuals of panel.nei are unclassified, and the analyses per population will take them as one population." Before the variants file has given its individuals, the first sentence alone. |
| being read | its name, and "Reading panel_pops.csv." |
| refused, or the read failed | its name, and the words of the refusal, below, "Its words" |
| read | its name, the list "Column of the populations", and the counts, below |

It ends with the zone that opens an individuals file, a `FileZone`, as
the variants file's: "Open individuals file…" with no file, "Open
another individuals file…" with one, taking a dropped or a pasted file;
and, with a file, the button "Remove panel_pops.csv". The zone takes any
file: table_io says what each is from its bytes, so the page turns no
file away by its name. A drop or a paste of a folder, of a piece of text
or of several files says, in the box, "Open an individuals file, a CSV,
a TSV or an xlsx, not a folder.", "…, not a piece of text.", "Open one
individuals file at a time.", as the zone of the variants file does.

**The list "Column of the populations"** is a select. Its first item is
"None: every individual unclassified", then every column of the file
but the first, which names the individuals, and but a column of
booleans, `true` and `false`, by its name in the file, in the order of
the file (`populationColumnChoices` of core). A column of booleans is
not offered, as the owner decided on 9 October 2026; a column of
numbers is. Its value is the column of the grouping when the list
offers it, and "None" otherwise. A choice sends a command (below, "What it sends and reads"). When the file is read the page
chooses a column itself, the first column of text with 1 to 20 different
values, missing ones left out (`defaultPopulationsColumn` of core, sent
by the entry; `docs/specs/entry.md`). It chooses again when another
individuals file is opened and the list of its table does not offer the
column chosen; and when the same file is read again with other options
of a CSV, only when the new list does not offer the column chosen, or
no column is chosen and "None" was not the user's choice. So a second
file with a column of the same name keeps it, a "None" the user chose
stays through a change of the options of a CSV until another file is
opened, and opening another variants file changes nothing. When no column qualifies, the list
stays on "None" and the line under it says "No column of panel_pops.csv
holds text with 20 different values or fewer, so none was chosen as the
column of the populations. Choose it in the list."

**The counts.** With a variants file read and a column chosen whose
values are 20 or fewer, a table of two columns, "Population" and
"Individuals", captioned "Individuals of panel.nei kept by the filters":

| Population | Individuals |
|---|---|
| p0 | 31 |
| p2 | 36 |
| p1 | 44 |

- The rows are the populations with an individual in both files, in the
  order each first appears in the individuals file, named as the cells
  are written (a number with the decimal mark of the file, `1,75`). A
  population the filters leave empty keeps its row, with 0. A
  population none of whose individuals is in the variants file has no
  row.
- Each count is the individuals kept of that population
  (`populationCounts` of core, from `populationsKept`).
- A count is written as the page writes counts, with a comma for the
  thousands, "1,250".

Under the table, the first that holds:

- some individuals classified and some unclassified kept: "Unclassified,
  left out of the analyses per population: 7 individuals, 3 with an
  empty cell in popcat and 4 that are not in panel_pops.csv: s031, s044,
  s102 and 1 more." The count and its causes are of the individuals
  kept; the names are of the kept not in the file. Each part is left out
  when its count is 0, and the one cause left needs no count of its own:
  "…: 3 individuals with an empty cell in popcat.", "…: 1 individual that
  is not in panel_pops.csv: s031."; past three names, the count of the
  rest. One individual: "1 individual".
- no individual of the variants file in the individuals file, the table
  then empty and not drawn: the warning "Warning: none of the 200
  individuals of panel.nei is in panel_pops.csv, so all of them are
  unclassified. The first column of panel_pops.csv has to hold their
  names as panel.nei writes them: panel.nei starts with s000, and
  panel_pops.csv with S-000."
- every individual kept unclassified, for another cause, the table not
  drawn: "All 200 individuals kept are unclassified, and the analyses per
  population will take them as one population."; for one, "The one
  individual kept is unclassified."

Last, always with a variants file read: "Individuals of panel_pops.csv
not in panel.nei: 18", 0 written too, which no filter changes.

**The counts that wait.** With a threshold of the individuals on and the
one pass not finished, once the variants file has given its individuals
(the opening reads them before the pass starts), the rows are drawn with "…" in place of each
count, read by a screen reader as "not counted yet", and the line of the
unclassified gives way to:

- while the pass runs, or before it starts: "The individuals the filters
  keep are counted once panel.nei is read to the end.";
- after a Stop: "Not counted: the reading of panel.nei was stopped. Start
  it again in the box of panel.nei to count the individuals the filters
  keep.";
- after a failure of the pass or of the opening: "Not counted: panel.nei
  could not be read to the end; the box of panel.nei says why."

The warning of no individual in the file and the last line do not wait.
With no threshold of the individuals on, the counts never wait.

**Before a variants file is read**, the counts give way to "The
individuals are counted once a variants file is open.", and the
warning of too many values, below, still shows, from `populationCounts`,
which gives the column and its values before the variants file.

**A column of more than 20 values** gives no table and no line of the
unclassified: "Warning: accession has 1,845 different values, too many
for a column of populations, so they are not counted here. If it is not
the column of the populations, choose another in the list." The values
are counted in the individuals file, missing ones left out, so the
warning does not depend on the variants file or the filters. The last
line still shows.

### The tab "Variants file"

What `popgen2-filters.md` and `popgen2-download.md` give under the box,
unchanged, but for "Open another variants file…", now in the box: the
part "Variants", its four histograms and the FILTER box; the part
"Individuals", its two histograms and the download of their table; the
download of the filtered variants. With no variants file: "No variants
file open. Open one in the box Variants file."

### The tab "Individuals file"

| the individuals file | what the tab shows |
|---|---|
| none | "No individuals file open." |
| being read | "Reading panel_pops.csv." |
| refused, read as text | the options of the reader, below, and nothing else; the box holds the words |
| refused as an xlsx, or before table_io read it: too large, not readable by the browser, the reader not downloaded, the worker stopped | "panel_pops.xlsx could not be read; the box Individuals file says why." |
| read | the parts below, in this order |

**How it was read.** For a file table_io read as text, the found format
of the read, three selects as in the old Individuals step
(`docs/specs/steps/individuals.md`, "How the file was read"):
"Encoding", "Separator" and "Decimal mark", each with "Detected: …"
until the user sets it, as the old step's `Select`s
(`src/ui/widgets/Select.tsx`); for a file of UTF-16, whose encoding
table_io finds from its mark and which cannot be set, the line of the old
step, "Encoding: UTF-16, from the mark at the start of the file.",
`UTF16_TEXT`, in place of the select of the encoding. The warning of a
character not decoded is the old step's, `undecodedText`: "Warning: line
12 of panel_pops.csv has bytes that could not be read as UTF-8, shown as
�. Correct them in the file and load it again, or, if every letter with
an accent shows as �, choose Windows-1252 as the encoding." While the
same load is read again for options the user changed, the three selects
stay drawn with the options set, and "Reading panel_pops.csv." shows
under them, so that the select just changed keeps the focus. To know
that the file is a text file while its new read is pending, the screen
remembers the format of the last read of each load id; it keeps this
itself, as it keeps the tab shown, since it is not part of the project. Beside the options of a text file refused, the
line "panel_pops.csv could not be read; the box Individuals file says
why."  For an xlsx, the line "Read from the first
sheet of panel_pops.xlsx; any other sheet is not read." What the file is
comes from the read, its `found` or the format of its refusal, never
from its name.

**The individuals not in the file.** When individuals of the variants
file are not in the individuals file: the heading "Individuals of
panel.nei not in panel_pops.csv", their full list in the order of the
variants file, before the filters, and the button "Copy the 4 names",
"Copy the name" for one, with the words of the old step for the copy and
its failure (`copyLabel`, `copiedText`, `NOT_COPIED` of
`src/ui/steps/individuals/words.ts`).

**The table.** Over it, "200 rows, 2 columns". Every row and column of
the file, in its order: the column of the names first, each of its cells
the header of its row, so that a screen reader reads "s031, popcat, p1";
a missing value empty; a number written with the decimal mark of the
read, the comma for a file read with it; a boolean `true` or `false`,
all as `cellShown` of core writes them, as the names of the populations
are. It
is `SortableTable` of `src/ui/widgets/SortableTable.tsx`: a box at most
28rem high, or 70% of the window, whichever is smaller, that scrolls
down with the row of the headers kept in view and sideways when the
columns are wider than the page; only the rows in view and those just
beyond drawn; a click on a header, or Enter on it, sorts by that column,
ascending then descending, numbers by value, texts by their code units,
missing values last. At 320 px the box scrolls sideways and the page
does not. The types of the columns are not shown.

### Both tabs kept drawn

Both tabs stay drawn while the other is shown (`shouldForceMount` of
React Aria's `TabPanel`): the hidden one is marked inert, so the Tab key
and a screen reader skip it, and a rule of its style hides it,
`display: none`. A box hidden so forgets how far it was scrolled, and
the table, which draws only the rows in view, finds no rows in view
while its box has no size. So the tab "Individuals file" notes how far
its table was scrolled as the user leaves it, and scrolls it back there
when it is shown again, after the table has measured its box and drawn
its rows. A turn to
the other tab and back finds the plots, the thresholds, the sort of the
table and its place as they were. A number typed in the box of a
threshold and not yet applied by Enter is applied as the focus leaves
the box for the tab, as a click anywhere else on the page applies it, so
the turn back finds it applied, with its line moved to it. A plot
whose tab is hidden keeps its last drawing and draws again at the size of
its box when shown (`createPlot2d` of `src/charts/plot2d.ts`). The
widget of tabs gains a prop for it, `keepHidden`, which the old page's
use does not take.

The status region goes on speaking of the plots while their tab is
hidden, as it does today while they are out of view down the page. The
sentence of no variant kept (`noVariantAnnouncement` of
`src/ui/variants/downloadState.ts`, the words of `noVariantText`) names
no place, "None of the 1,200 variants of panel.nei pass the filters, so
there is nothing to download.", so it stays as it is whichever tab is
shown; the design had left this to the spec. It can be said with the
other tab shown only when a run of the arrow keys on a threshold ends,
its quiet second after the last press, once the user has turned to the
other tab.

## The states

The states of the two files, from the project, the store's status of
the one pass and its individuals kept. The page runs one calculation,
the one pass; the read of the individuals file is a read, not an
analysis, and has no Run of its own.

| state | what the user sees | what they can do |
|---|---|---|
| empty | no file: the two boxes with their openings and the words of no file; the tabs, each with its words of no file | open either file |
| locked | the counts cannot be given: before a variants file, "The individuals are counted once a variants file is open."; with a threshold on and the pass not finished, the rows with "…" and the line of why; a column of more than 20 values, its warning | open the variants file; Start again; change the column; turn the threshold off |
| ready | cannot happen apart: nothing waits for a Run, the counts are drawn as soon as they are known | |
| running | the individuals file being read, "Reading panel_pops.csv." in the box and the tab; the one pass running, as `popgen2-filters.md` gives it, the counts waiting when a threshold of the individuals is on | open another file; remove the file; choose a column of a file already read |
| done | the list, the counts and their lines; the tab with how it was read, the missing ones and the table | choose the column, sort and scroll the table, change the options of a CSV, copy the names, open another file, remove it |
| results removed | never: no change of the individuals file stops or removes a calculation, since neither the one pass's key nor the download's holds it; a change of the filters or the column changes the counts in place, with no notice, as the owner decided for every change on this page on 8 October 2026 | |
| error | the file refused or its read failed: its words in the box, the options of the reader under the tab for a text file | change the options of a CSV; open another file; remove it |

## What it sends and reads

It sends, each a command of `apply`, a step of the history, with its
description, as the old step's commands (`src/ui/steps/individuals/commands.ts`):

| what the user does | the command | the description |
|---|---|---|
| an individuals file opened, by its button, a drop or a paste | `loadIndividuals(p, { fileId, name, csv: AUTO_CSV })`, a new load id | "an individuals file was opened" |
| Remove panel_pops.csv | `removeIndividuals(p)` | "the individuals file was removed" |
| a column chosen | `setGrouping(p, { kind: "populations", column })` | "the column of the populations changed" |
| None chosen | `setGrouping(p, { kind: "populations", column: null })` | "the column of the populations changed" |
| an option of the reader changed | `setCsvOptions(p, options)` | the old step's, "the separator changed" |
| a variants file opened | as today, `openVariantsFile`, which keeps the individuals file and the grouping | none |

The entry sends the column it chooses (`docs/specs/entry.md`); the
screen sends nothing for it. Opening an individuals file never goes
through `open`, which would stop the one pass.

It reads: the project's `individuals`, its name, its read, `pending`,
`read` with its table and `found`, or `failed` with its error and its
format; the grouping; `individualsBoxNeeds` of core for this page's
words of a refusal (`docs/specs/core/project.md`); `populationCounts`
of core over the project and the store's individuals kept, for the
table and its lines; `defaultPopulationsColumn`'s answer for the line
of no column qualified; `individualsCheck` for the list of those not in
the file; the status of the one pass, `summaryStatus` of
`src/ui/variants/words.ts`, for the lines of the counts that wait. It
holds of its own the tab shown and the sort of the table, which are not
the project's (`docs/architecture.md`, section 7).

## Its words

| where | the words |
|---|---|
| the heading of each box | "Variants file"; "Individuals file" |
| the buttons of the zones | "Open variants file…", "Open another variants file…"; "Open individuals file…", "Open another individuals file…" |
| the button of removal | "Remove panel_pops.csv" |
| the row of the tabs, for a screen reader | "The files" |
| the heading drawn in place of the zone of the variants file when its code throws, under the box's "Variants file" | "Opening a variants file" |
| the tabs | "Variants file"; "Individuals file" |
| the list | "Column of the populations"; first item "None: every individual unclassified" |
| the caption of the counts | "Individuals of panel.nei kept by the filters" |
| the headers of the counts | "Population"; "Individuals" |
| a count not yet known, for a screen reader | "not counted yet" |
| the line of the rows not used | "Individuals of panel_pops.csv not in panel.nei: 18" |
| the refusals, in the box | "panel_pops.csv could not be read: " and the words of the reader spec after the colon (`docs/specs/worker/individuals.md`, "The refusals and their words"), ending as below |
| the end of `raggedRow` and `unclosedQuote` | "Choose another separator under the tab Individuals file, or open a corrected file." |
| the end of `variantsFile` | "it is a variants file; open it with Open variants file in the box Variants file." in place of the reader's words after the colon |
| the end of `tooLarge` | "check that it is the individuals file and not the variants file." |
| `sheetTooLarge` after the colon | "its first sheet, Hoja1, has values as far as row 1,048,576 and column XFD, more than the 20,000,000 cells an individuals file can have; delete the values outside the table.", the reader's words with the name of the file of this page |
| `readerNotLoaded` | "panel_pops.csv could not be read: the part of the page that reads tables could not be downloaded. Check the connection and open the file again." |
| the end of `unreadable` | "Open it again." |
| the end of `files`, `oldExcel`, `encrypted`, `emptySheet`, `cellError`, `headerError`, `sheetTooLarge`, whose words say what to do in Excel | "Then open it again." |
| a worker that could not start, or a page of another build than its workers | "panel_pops.csv could not be read: the page could not start the part that reads files. Reload the page and open the file again." |
| the end of every other refusal of a file | "Open a corrected file." |
| a read that failed in the worker, a crash | "panel_pops.csv could not be read: the page stopped while it read it. Open the file again." |
| the status region, a file read | "panel_pops.csv read: 200 rows, the populations from popcat."; with no column chosen, "panel_pops.csv read: 200 rows, no column chosen for the populations." |
| the status region, a file refused | the words of the box |
| the status region, the names copied | the old step's, "4 names copied." |

The other words are given above, where they stand. "Warning: " opens
each warning, in words and not by its colour alone.

The page has no help drawer yet. What the help of the box would say:
what unclassified means and how the analyses per population will treat
the unclassified; that the column is chosen by the page as the first
column of text with 20 values or fewer; that the counts are after the
filters of the individuals.

## Accessibility

The criteria are those of WCAG 2.2 at level AA.

**The order of the Tab key** (2.4.3, "Focus order"): in the box of the
variants file, Stop or Start again, then its zone; in the box of the
individuals file, the list, then its zone, then Remove;
the row of the tabs, one stop, whose left and right arrow keys move
between the two labels and show each as they reach it, and Home and End
go to the first and the last; then the controls of the tab shown, in the
order of `popgen2-filters.md` for "Variants file", and for "Individuals
file" the three selects, the copy button, and the table, one stop, a grid
whose arrow keys move from cell to cell and whose headers sort with
Enter. Each zone is two stops, the zone itself, which takes a paste and
is named "Paste a variants file" or "Paste an individuals file", then
its button. The hidden tab is never reached.

**Where the focus goes.** An opening by the button leaves the focus on
the button, which becomes "Open another …". Remove puts the focus on the
zone's button, "Open individuals file…", since Remove goes. A turn of
the tab moves no focus but React Aria's on the labels.

**What is said without moving the focus** (4.1.3, "Status messages").
The end of a read of the individuals file, its words above, once, said
by the entry after it has sent the column it chooses, so that it names
that column (`docs/specs/entry.md`), with, after it, the warning the box
then shows, if any: of no individual in the file, of too many values, or
of no column qualified, each of which appears with no act of the user; a
refusal, its words, once; the words of a zone given a folder, a piece of
text or several files, as the zone of the variants file says them; the
names copied. A change of the counts after
a change of a threshold or of the column is not said: the user acted on
the threshold or the list, which says what changed, and a sentence at
each count would fill the region while a threshold is moved.

**The widgets.** The counts are `Table.tsx`, whose cells take an
element, for the "…" with its words for a screen reader; the list
`Select.tsx`; each warning `Warning.tsx`, which writes "Warning:" itself,
so the words given to it start after it; the table of the file
`SortableTable.tsx`, named by its `label`, "The table of
panel_pops.csv".

**A table that a screen reader can read.** The counts are a table with
its caption and two header cells; a count waiting is "…" on the screen
and "not counted yet" to a screen reader. The table of the file has its
first column as row headers.

**Not by colour alone** (1.4.1). The tab shown is marked by a bar under
its label and by the weight of its words; each warning by the word
"Warning:".

**Not yet heard in VoiceOver**, which the session cannot run: the row of
the tabs read as "The files, tab list", each label with its position;
the counts read with their caption; a waiting count read "not counted
yet"; a refusal said once as it appears.

## How it is checked

**In Vitest**, in node: the words of the box in each row of its table
and each line of the counts, from projects and individuals kept made in
the test; the choice of what the tab "Individuals file" shows from the
read and its format; the words of the status region; the functions of
core and of the entry in their module specs.

**In Playwright, on the built site, in Chromium and WebKit**, on
`panel.nei`, `panel.vcf.gz`, `panel_pops.csv`, `panel_split.csv`,
`ld_pops.csv`, `panel_meta.csv`, `excel_en.xlsx` and
`individuals_10000.xlsx`, and files the flow makes:

- `panel.nei` then `panel_pops.csv`, and the other order: the list on
  `popcat`, the counts p0 48, p2 84, p1 68, in that order, no line of the
  unclassified, "Individuals of panel_pops.csv not in panel.nei: 0";
- `panel_split.csv` chooses `popsplit`; `ld_pops.csv`, opened over
  `ld.nei`, chooses `pop`, its two populations; `panel_meta.csv` chooses
  `popcat` and not `altitude`;
- a CSV made from `panel_pops.csv` without 4 rows and with 3 cells of
  `popcat` emptied: the line of the unclassified with 3 and 4 and three
  names; the full list of 4 under the tab, and Copy the 4 names;
- a CSV of the names in capitals, `S000`: the warning of none in the
  file;
- a CSV with a column of 21 values: its warning, and no table;
- "None" chosen: "All 200 individuals kept are unclassified, …"; the
  separator set to the semicolon and back to the comma afterwards: the
  list still on "None", with the same line;
- with the missing rate of the individuals at 0.03: the counts change to
  those of `individualsKept` for 0.03, p0 29, p2 51 and p1 36, which the
  flow reads from popnei
  under node as the fixtures of `popgen2-filters.md` do; while the pass
  is held (`e2e/holdWorker.ts`), "…" and the line of waiting; after Stop,
  the line of a Stop; at Start again's end, the counts;
- an individuals file opened while the one pass runs: the pass goes on
  to its end, with no second pass started;
- a CSV the flow makes, `id;pop;h` over rows such as `s000;p0;1,75`,
  with the separator set to the comma: the refusal of the row of line 2,
  2 cells where the header has 1, with its words in the box, the options
  under the tab, and the focus still on the select of the separator;
  setting the semicolon reads it. And `panel_pops.csv` with the
  separator set to the semicolon, which gives a table of the names alone:
  the list with "None" alone and the line of no column qualified;
- a CSV named `.xlsx` read as text, with its options under the tab; an
  `.xls` named `.csv` refused as a workbook of Excel 97–2003, with no
  options under the tab;
- the tabs by the keyboard alone, arrows, Home and End; a threshold
  moved, the other tab shown and back: the threshold, its line and the
  plots as they were; the table sorted and scrolled, the other tab and
  back: the same;
- `individuals_10000.xlsx`, its table sorted by a header: the time the
  page does not answer, as `e2e/measure.spec.ts` measures it, less being
  better, written in the report of the plan beside the median of 149 ms
  in Chromium and 107 ms in WebKit that a sort of the 10,000 rows of the
  same file took on the old page, measured on the owner's Mac (the case
  VS7 D4 of that file);
- a long file name, 80 characters, at 320 px: "Remove …", the name in the
  box and the warnings wrap and the page does not scroll sideways
  (1.4.10, "Reflow");
- a CSV with an integer column before the column of the populations:
  the populations chosen, not the integers;
- a progress of the pass draws the box of the individuals file no
  more, counted in Vitest with the store and a fake worker;
- the network: table_io's JavaScript and `.wasm` requested once, at the
  first read, a CSV included, and served as `application/wasm`;
- 320 px wide: no sideways scroll of the page, the boxes one above the
  other, the two labels of the tabs visible;
- axe on each state of the box and of the tab, in light and in dark.

The flows of the old page's Individuals step are run again, since its
reader changed.

**The screens**, `--project=screens`: no file; both files read with the
counts; the counts waiting; a refusal; the warning of too many values;
the tab "Individuals file" with a CSV and with an xlsx; light and dark;
1280 and 320 px.

**By hand**, in the plan: the memory of the light worker and of the page
after reading a CSV of 20 MB of short cells, in Chromium and WebKit,
which sets the size above which the light worker is ended after a read
(`docs/specs/worker/client.md`); and VoiceOver, as above.

## Choices made by the session

From the design, and open to the owner's change after trying the page:
the column chosen by the page; the words of the box and its lines; the
caption and headers of the counts; "…" for a count that waits; the
status region silent at a change of the counts; the tab shown first and
never changed by the page; the order of the parts of the tab
"Individuals file"; the zone of the individuals file taking any file,
with no check of its name; Remove putting the focus on the zone.

## Left for the running application

The spacing of the boxes and their heights side by side, where Remove
sits beside the zone, the look of the bar of the tab shown, the width of
the columns of the counts, the place of the line of no column under the
list.

## Open points

None. The owner answered the design's questions on 9 October 2026.

## Not in this spec

- The reading of the file, its rules and its refusals:
  `docs/specs/worker/individuals.md` and table_io's own specs.
- The plots, the thresholds, the FILTER box and the download, unchanged:
  `popgen2-filters.md`, `popgen2-download.md`.
- The analyses per population on this page and how they treat the
  unclassified: the design, answer 3, and their own specs when they
  come.
- The types of the columns, which this page does not show; the PCA's
  colours by a column.
- The saving of the project on `popgen2.html`, and the help drawer.
