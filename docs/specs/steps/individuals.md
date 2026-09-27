# The Individuals step

Written on 25 September 2026 for the walking skeleton, stage 2 of
`docs/build-order.md`, and approved by the owner the same day; revised
the same day for the owner's decisions on the review of work package 8
of `docs/plans/walking-skeleton.md`, points 5 to 7 of its report: the
first values joined by " · ", the check of the individuals under a
heading of its own, and the ends of the refusals of the reader; and for
the warning of a character not decoded and the refusal of a variants
file, of the owner's decisions on the reviews of work packages 2 to 6;
and on 26 September 2026 for the list of the populations copied from the
page, which the owner found at stop 9.6. Rewritten on 27 September 2026
for stage 4, the step whole, not yet approved: the metadata file read
from an xlsx as well as from a CSV or a TSV; the types of the columns,
and the coding of a binary column, set by the user; the types set kept
when the file is read again; the file optional, with every individual
in one population without it; and the item "All individuals in one
population" among the choices of the populations; and again the same
day, to agree with the specs written beside it: the types a column
allows worked out by core, `columnAllows`, and the decimal mark given to
the warning of few whole numbers. The code of stage 2 is in
`src/ui/steps/individuals/`.

The screen spec of the second step of the population genetics
application: the user picks the metadata file, or goes on without one,
sees how it was read and can change it, sees its columns with their
types and can change them, chooses what defines the populations, and
learns whether every individual of the variants file is in the file. It
shows section 4 of `docs/functionality.md`, and reads the project and
its commands of `docs/specs/core/project.md` through the store of
`docs/specs/core/store.md`.

The words of core used here are those of the spec of the Variants step,
`docs/specs/steps/variants.md`: the project, a command with its
description, a load, a source. The **reader** is our code that reads
the file into a table and infers the type of each column, in the light
worker, the thread of the tab that reads the files of the individuals:
the reader of CSV and TSV, `docs/specs/worker/individuals.md`, and the
reader of xlsx, `docs/specs/worker/files.md`, which runs the **files
wasm**, the small program of this repository, in Rust compiled to run
in the browser, that the page downloads the first time an xlsx is read,
0.30 MB gzipped (`docs/specs/worker/files.md`, "What the user sees
while it downloads"). "Auto", for an
option of the reader of CSV, means that the reader detects it. The
**types** are those of `docs/functionality.md`, section 4: identifier,
binary, continuous and categorical.

## What it shows

### The file

A drop zone that holds a button, "Choose a metadata file…", as in the
Variants step, and the same one button in every state, "Replace
pops.csv…" once a file is loaded, so that the focus stays on it after a
pick. The zone holds React Aria's hidden button, "Paste a metadata
file", which takes a file pasted into it, as in the Variants step, and a
paste is a drop to the step, with the same words.

What is loaded is told by the end of the name, compared without regard
to case:

| the name ends in | what the step does |
|---|---|
| `.csv`, `.tsv` or `.txt` | loads it as a CSV or a TSV, `loadIndividuals` with the three options of the reader at "auto"; the reader finds the separator whatever the ending |
| `.xlsx` | loads it as an xlsx, `loadIndividuals` with `csv: null`; the reader reads its first sheet that is not hidden, the one Excel shows first (`docs/functionality.md`, section 4; `docs/specs/worker/files.md`) |
| `.xls` | does not load it, as the spec of stage 2 had it, approved by the owner on 25 September 2026: Excel's format before 2007, which `docs/functionality.md`, section 4, does not list; the words say to save it as `.xlsx` or CSV (below, "Its words") |
| `.vcf`, `.vcf.gz`, `.bcf` or `.nei` | does not load it: it is a variants file, and the step says so in the words of the reader for a VCF found by its first line, as the owner decided on 25 September 2026, and not "rename it", which would lead the user to load it |
| anything else | does not load it, with words that name the endings it reads |

The file picker offers `.csv`, `.tsv`, `.txt` and `.xlsx` first, and any
file under "All files". Several files dropped or pasted at once, a
folder or a piece of text are not loaded either.

Without a file the zone stands alone, with the line "No metadata file:
every individual is in one population.", as the owner decided on 25
September 2026 (point A of `docs/specs/stage-2-open-points.md`); the
analyses per population then run on one population, "All individuals"
(`docs/specs/core/project.md`, "The populations").

Once read, the card shows the name, "360 rows, 5 columns", and a button,
"Remove pops.csv". The first column holds the names of the individuals
(`docs/functionality.md`, section 4). For an xlsx the card adds "Read
from the first sheet of pops.xlsx that is not hidden; the other sheets
are not read.", since
a workbook of several sheets is common and the user who kept the
populations on the second would otherwise see columns they did not
expect with no word why. When the read of a CSV could not decode a
character, `found.undecodedLine` of `docs/specs/worker/individuals.md`,
the card also shows the warning of a character not decoded, below
("Its words"), which names the line.

The first xlsx the page reads downloads the files wasm, and its read
takes that much longer, about a quarter of a second at 10 Mbit/s and 1.5
s at 1.6 Mbit/s, by arithmetic and not measured
(`docs/specs/worker/files.md`); the step shows "Reading pops.xlsx." as
for any read, with no word of the download, as that spec has it. A
download that fails, the page offline, fails the read as
`xlsxReaderNotLoaded`, whose words say to check the connection (below,
"Its words").

### How the file was read

For a CSV or a TSV, the encoding, the separator and the decimal mark,
each detected by the reader and shown with a way to change it, as the
owner decided on 24 September 2026 (`docs/architecture.md`, section 6,
"The individuals file"). Each is a `Select`, the list that opens to show
its choices, whose first item is "auto". While that option is "auto" and
the file is read, the item names what the reader detected, from `found`,
the part of the read that says which encoding, separator and decimal
mark it used; once the user sets the option, `found` holds what was
set, so the first item says "Detected" alone, as it does while a read
is under way or after a refusal, which has no `found`:

| label | items | the first item |
|---|---|---|
| Encoding | UTF-8; Windows-1252, as Excel writes a CSV on Windows | "Detected: UTF-8" |
| Separator | comma; semicolon; tab | "Detected: semicolon" |
| Decimal mark | point; comma | "Detected: comma" |

Under them: "If names with accents come out garbled, "EspaÃ±a" for
"España", change the encoding. If the whole file shows as a single
column, change the separator. Changing one reads the file again."
The decimal mark changes which columns read as numbers, and so their
types and the types they can be given.

The three are shown whenever the file is a CSV, whatever its read: a
refusal, "line 7 has 3 cells where the header has 4", most often comes
from a wrong separator, and the user mends it here. They can be changed
while a read is under way; the read of the older options is then
dropped (`docs/specs/core/project.md`, "The records").

A file that starts with the mark of UTF-16, which Excel writes for
"Unicode Text", is read as UTF-16 whatever the encoding says
(`docs/specs/worker/individuals.md`, "The bytes and the encoding"). The
encoding select is then replaced by a line, "Encoding: UTF-16, from the
mark at the start of the file.", since no choice would change the read.

An xlsx has none of the three: its text is stored in one encoding, its
cells are apart, and its numbers are numbers, so nothing is detected and
nothing is shown but the line of the first sheet.

In a project opened from a project file, the metadata file is there,
read, but the page holds no copy of it, which was picked in another
session. Changing an option would then leave it "Reading pops.csv." for
ever, so the three selects are replaced by "To change how pops.csv is
read, load it again.", as `docs/specs/core/projectFile.md`, "The cases",
asks. The types of its columns can still be set, since that reads no
file.

### The columns

A table with one row per column of the file: its name; its type; and
its first three distinct values that are not missing, joined by " · ",
"España · Italia · Perú", so that a wrong encoding, separator or
decimal mark shows. The dot and not a comma, as the owner decided on 25
September 2026, because a column of the decimal comma would read "1,75,
1,62, 1,80". The space before the dot does not break, so that a value
keeps its dot on its line and a line never starts with a dot, which at
320 px wide, where the values wrap, would read as the mark of a list. A
value of an xlsx is shown as its text, `String` of the cell. The rows of
the file are not drawn: 10,000 of them would take seconds, and the
three values show what a wrong option does.

The type of the first column is "identifier", as text: it names the
individuals and cannot be changed. The type of every other column is a
`Select`, whose items are the types its values allow, from
`columnAllows` of the read, which core works out from the table and the
decimal mark (`docs/specs/core/project.md`, "The types of the columns"):

| item | offered when |
|---|---|
| categorical | always |
| binary | the column has exactly two values, its `binary` |
| continuous | every value of the column is a number, its `continuous` |

A column offered only one type, a column of three or more words, still
has its select, with the one item, so that every row reads alike and the
user learns that the type exists; a text in its place would be a row the
keyboard skips. The select shows the type of the column, `columns` of
the read, whether the reader inferred it or the user set it. Choosing
another sends `setColumnType`; choosing binary sends the binary type of
its `binary` in `columnAllows`, with the coding the reader proposes.

A binary column also has its coding, which of its two values is 1, the
case, and which 0 (`docs/functionality.md`, section 4). Under its type,
a second `Select`, "Coded 1, the case", whose two items are its two
values, and beside it the other: "no is coded 0.". The reader proposes
the coding, the larger of two numbers, `case` over `control`, `yes`
over `no` and the other known pairs, and otherwise the value that comes
second in the order of the code units, `P2` over `P1`
(`docs/specs/worker/individuals.md`, "The types of the columns"); the
user changes it here. The coding is used by the association and the
Python script, not by population genetics, where a binary column is two
populations or two colours of the PCA; it is shown here because it is
set with the type and saved with it.

A line above the table: "The types are inferred from the values. Change
one where the inference is wrong: a column of numbered populations, 1 to
12, is inferred continuous and is categorical. The populations are the
values of their column, whatever its type." The types decide how a
column colours the points of the PCA (`docs/specs/analyses/pca.md`) and,
in the association application, how it enters the GWAS; in population
genetics nothing else reads them.

A column of a few whole numbers, inferred continuous, has beside its type
the warning the reader's `columnWarnings` gives, in that spec's words
(`docs/specs/worker/individuals.md`, "The types of the columns"):
"Warning: score holds only 5 different whole numbers, from 1 to 5, and
is taken as a measurement. If they are codes, such as numbered
populations, set its type to categorical.", the end of stage 4. The warning is made from the table and its types,
so it goes when the user sets the column categorical.

When a new read could not keep a type the user set, the read's
`typesLost`, a warning above the table says which columns lost it, and
it stays until the next read, or until the user sets the type of that
column again (below, "Its words").

### Every individual of the variants file in it

Every individual of the variants file must be in the metadata file, and
the rows of other individuals are ignored, as the owner decided on 24
September 2026 (`docs/functionality.md`, section 4). The check has a
part of its own, with its heading, "Individuals of panel.nei", the name
of the variants file, or "Individuals of the variants file" while the
project has none, and it comes after the columns and before the
populations. The owner decided on 25 September 2026 that the
individuals missing are not shown under the select of the populations,
where they read as if choosing a column would find them. The part shows
where the check stands:

- no variants file read: "The individuals are checked against the
  variants file once it is read.";
- every individual found: "All 342 individuals of panel.nei found · 18
  rows not in panel.nei, ignored", the second half only when there are
  such rows;
- some missing: the error below, with the full list.

Without a metadata file there is nothing to check, and the part is not
shown.

### The populations

A `Select`, "Column that defines the populations", whose first item is
"All individuals in one population", and then every column but the
first, with "Choose a column" shown until one of them is chosen; under
it: "Any column can define the populations, whatever its type. An
individual with an empty cell in it is in no population." The first
item sends the grouping `onePopulation`, and a column the grouping of
that column. Nothing is chosen until the user chooses, since a choice
made by the screen would be a command no action of the user made
(`.claude/skills/coding/react.md`, "Sending commands"); so a file just
loaded into a new project locks the analyses per population with "Choose
the column that defines the populations, or all individuals in one
population, in the Individuals step.", and the user who loaded a file
says what it defines. The option not taken was to start at the one
population, which would run the diversity on every individual of a
file the user loaded for its populations, and show a table of one row
as if that were the result they asked for.

Every column but the first is offered, whatever its type: a column of
populations written as numbers, 1 to 12, inferred continuous, can be
chosen as it is, and its type set to categorical or not, since the
populations are the texts of its cells.

When all three hold, the variants file read, every one of its
individuals found in the metadata file, and a column or the one
population chosen: a list of the populations, each with its number of
individuals of the variants file, "P1 · 48", as `populationsToRun` of
`src/core/project.ts` gives them; for the one population, "All
individuals · 342". The individuals of the variants file whose cell is
empty in the column, the individuals found less those of the
populations, come last, "No population · 4, left out of the analyses
per population" (`docs/functionality.md`, section 4). A value is a
population as it is written in the file, so "P1" and "p1" are two.
Otherwise no list, since the sizes count the individuals of the
variants file: before it is read they are not known, and with some
missing the list would leave them out without saying so.

Without a metadata file the part of the populations is not shown: the
line under the zone says what the analyses run on. A column chosen
before the file was removed is kept in the project, and found again by
its name when a file is loaded (`docs/specs/core/project.md`, "The
populations").

## The states

| state | what the user sees | what they can do |
|---|---|---|
| empty | cannot happen: with no file, the step offers the pick and says what the analyses run on, which is the ready state | — |
| locked | cannot happen: the file can be loaded before the variants file, and is checked once that one is read | — |
| ready | no file: the zone, "Choose a metadata file…", and "No metadata file: every individual is in one population." | pick a file, or go on without one |
| running | the card with the name and "Reading pops.csv."; for a CSV the three options of the reader; the columns and the populations of an earlier read are gone, since the read replaced them; no progress, a read of a second or two, and, for the first xlsx of the page, the download of the files wasm before it | change an option of a CSV; pick another file; Undo |
| done | the card, the options of the reader of a CSV or the line of the first sheet of an xlsx, the columns with their types, the check, the choice of the populations and the populations; the warning of types lost after a read that lost some | change an option of a CSV, set a type or a coding, choose the populations, replace or remove the file |
| results removed | cannot happen here: the step shows no result. A command of this step that removes results has its notice in the shell (`docs/specs/shell.md`), with the descriptions below | — |
| error | the reader refused the file, its worker failed, individuals of the variants file are missing from it, or the column chosen gives no population or is not in the file, with the words below. The options of a CSV stay in every case; the columns only when the file was read, since a refusal has no table | change an option; choose another column or the one population; pick another file; remove the file; reload the page when the reason says so |

## What it sends and reads

It reads `project.individuals`, `project.grouping` and
`project.variants` of the state of the store, `individualsStepNeeds` of
the project for the reason of a read under way or failed, and
`individualsStepMissing` for that of missing individuals. It sends:

| action | command | description |
|---|---|---|
| a CSV or a TSV picked or dropped | `loadIndividuals(p, { fileId, name, csv: { encoding: "auto", separator: "auto", decimal: "auto" } })` | "a new metadata file was loaded" |
| an xlsx picked or dropped | `loadIndividuals(p, { fileId, name, csv: null })` | "a new metadata file was loaded" |
| an option of the reader chosen | `setCsvOptions(p, csv)` with the other two as they are | "the encoding of pops.csv changed", "the separator of pops.csv changed", "the decimal mark of pops.csv changed" |
| a type chosen | `setColumnType(p, column, type)`, binary as `columnAllows` gives it | "the type of score changed" |
| the value coded 1 chosen | `setColumnType(p, column, { kind: "binary", one, zero })`, the other value as `zero` | "the value coded 1 in status changed" |
| a column chosen for the populations | `setGrouping(p, { kind: "populations", column })` | "the column of the populations changed" |
| "All individuals in one population" chosen | `setGrouping(p, { kind: "onePopulation" })` | "every individual was put in one population" |
| Remove | `removeIndividuals(p)` | "the metadata file was removed" |

The descriptions end the notice, "Diversity removed because every
individual was put in one population · Undo", and name the step of
undo. A type or a coding changes no key of stage 4, so it removes no
result and has no notice; its description names its step of undo, and
the shell says it after an undo or a redo.

Before the command of a pick, the step calls `addFile(file)` of
`src/ui/files.tsx`, which makes the load id and puts the `File` into the
map of the worker client, the page's side of the two workers, under it
(`docs/specs/entry.md`, "At the opening"), as for the variants file; the
entry of the page then asks the light worker for the read.

It reads these functions of core, which are made from the project, and
which a screen does not write as a cache of its own
(`.claude/skills/coding/react.md`, "Reading core"):

- **the check**, `individualsCheck(p)` of `src/core/project.ts`: the
  individuals of the variants file found in the table, all those missing
  in the order of the variants file, and the rows of other individuals;
  `null` when either file is not read or there is no metadata file.
- **the populations**, `populationsToRun(p)` of `src/core/project.ts`,
  in the diversity's module until stage 4: the populations narrowed to
  the individuals of the variants file, as every analysis per population
  sends them; the list follows their order. The reasons about the
  column, at the select, are `populationsNeeds(p)` of the same module.
- **the types each column allows**, `columnAllows(read)` of
  `src/core/project.ts`.
- **the warning of a column of few whole numbers**, `columnWarnings` of
  the reader, from the table, its types and the decimal mark of the
  read, `found?.decimal ?? "."`, the point for an xlsx, whose `found` is
  `null`; and `columnWarningText` for its words.

Each keeps its answer for the same inputs, so that a table of 10,000
rows is not matched again each time React draws the screen again, which
it does after every change of the store.

A name from the file, of a column, a population, an individual or a
value, is shown with its control and format characters escaped, as core
shows a value of a file (`docs/specs/core/project.md`, "The
validation"), whole, not cut after 40 characters, with `escaped` of
`project.ts`. The name of the file is escaped and not cut wherever it
appears, the card, "Replace pops.csv…" and the descriptions of the
commands.

## Its words

The descriptions of the commands are in the table above. The rest:

- **An .xls file**: "pops.xls was not loaded: this version reads .xlsx
  files and not the older .xls. In Excel, save the sheet with File ›
  Save As, as an Excel Workbook (.xlsx) or as CSV, and load that file."
- **Several files dropped or pasted**: "Load one metadata file at a
  time."
- **A folder dropped or pasted**: "Load a metadata file, a CSV, a TSV or
  an .xlsx file, not a folder."
- **A piece of text dropped or pasted**: "Load a metadata file, a CSV, a
  TSV or an .xlsx file, not a piece of text." A drop of several things,
  one of them a folder, is a drop of several; text that comes in a drop
  with a file is left out, and the file is loaded, as in the Variants
  step.
- **A variants file, by its name**: "panel.vcf was not loaded: it is
  a variants file, which the Variants step takes. Load a metadata
  file.", the words after the colon those of the reader's
  `variantsFile`, and "was not loaded" as for the other files the step
  does not load, since none of it was read.
- **A file of another name**: "pops.dat was not loaded: the Individuals
  step reads a CSV or a TSV, whose name ends in .csv, .tsv or .txt, or
  an Excel file, whose name ends in .xlsx. If it is one of them, rename
  it."

  These six stay beside the zone until the next pick, are the
  screen's and not the project's, and are announced when they appear,
  through the function the shell gives the screens, since the focus
  stays on the button. The words of stage 2 for an Excel file, "this
  version reads a CSV or a TSV, and reads .xlsx files from a later
  version", go.
- **No metadata file**: "No metadata file: every individual is in one
  population.", as the owner decided on 25 September 2026.
- **The first sheet**: "Read from the first sheet of pops.xlsx that is
  not hidden; the other sheets are not read."
- **Reading**, **a refusal of the reader**, **a worker that failed**:
  the reason `individualsStepNeeds` gives, whole, "Reading pops.csv.",
  "pops.csv could not be read: line 7 has 3 cells where the header has
  4, read with the semicolon as the separator. Choose another separator,
  or load a corrected file.", "pops.csv could not be read: it is a
  variants file, which the Variants step takes. Load a metadata file.",
  as the Variants step shows `variantsStepNeeds`
  (`docs/specs/steps/variants.md`, "Its words"); the words of the
  refusals are the reader's (`docs/specs/worker/individuals.md`), a
  refused row naming the separator it was read with, as the owner
  decided on 25 September 2026, and their ends are core's, "Load a
  corrected file." after a refusal that no separator mends, as the
  owner decided the same day (`docs/specs/core/project.md`, "What an
  analysis needs of every project"). An xlsx is refused with the kinds
  of `IndividualsFileError` that `docs/specs/worker/individuals.md`,
  "The refusals and their words", gives it, those of the rows and the
  cells and its own, `notXlsx`, `oldExcel`, `encrypted`, `emptySheet`,
  `cellError`, `sheetTooLarge`, `xlsxReaderNotLoaded` and `files`, with
  that spec's words after "could not be read:" and core's ends, "Load a
  corrected file.", but for `xlsxReaderNotLoaded`, whose words end with
  what to do, "check the connection and load the file again; if it
  fails again, … save the project, reload the page and open the project
  again", and take no end
  (`docs/specs/core/project.md`); a row of the wrong length and a quote
  never closed are refusals of a CSV alone.
  The reasons of core name the file as each application does, "a
  metadata file" here and "a traits file" in association, as the owner
  decided on 25 September 2026 (point P of
  `docs/specs/stage-2-open-points.md`). The advice of a crash of the
  light worker, "the calculation stopped unexpectedly", is among the
  provisional words of core the owner judges on these screens
  (`docs/specs/core/project.md`, open point 4).
- **A character not decoded**, on the card of a CSV read, "Warning:
  line 3 of pops.csv has bytes that could not be read as UTF-8, shown as
  �. Correct them in the file and load it again, or, if every letter
  with an accent shows as �, choose Windows-1252 as the encoding.", and,
  for a file read as UTF-16, whose encoding cannot be chosen, "Warning:
  line 3 of pops.csv has bytes that could not be read as UTF-16, shown
  as �. Correct them in the file and load it again." A file read as
  Windows-1252 has none, nor has an xlsx. The warning is the screen's,
  made from the read.
- **Types lost**, when a read could not keep types the user set, the
  read's `typesLost`, a warning above the table of the columns. A type
  is named by its word, and a binary one with its coding, "binary with
  yes coded 1". For one column still in the file: "Warning: pops.csv was
  read again, and status lost the type you set, binary with yes coded 1,
  since its values no longer allow it; it is categorical, as its values
  give it. Set its type again if the new values allow the one you want,
  or correct the file and load it again." For one column no longer in
  the file: "Warning: pops.csv was read again, and has no column score,
  whose type you had set as categorical." For more than one, a sentence
  and a list, a line for each column: "Warning: pops.csv was read again,
  and 2 columns lost the type you set:", "status: binary with yes coded
  1, now categorical, since its values no longer allow it", "score:
  categorical, and the file no longer has this column", and after the
  list "Set their types again if the new values allow the ones you want,
  or correct the file and load it again." The file is named as the
  source names it after the read, so after a new load, the new file.
  The words are the writer's, 27 September 2026.
- **Individuals missing**: the reason `individualsStepMissing` of
  `src/core/project.ts` gives, "12 individuals of panel.nei are not in
  pops.csv: ind_031, ind_044 and 10 more. Add them to pops.csv and load
  it again.", which names the file where `individualsNeeds`, beside a
  Run button, names this step; and under it a disclosure, "The 12
  individuals missing", that opens the whole list, one name a line,
  which the user can select and copy into their sheet; a disclosure is a
  line that opens and closes a part of the page under it. A user who
  wants no file can also remove it, which the Remove button beside the
  name offers; the reason does not say so, since a file that lacks
  individuals is most often a file to correct.
- **The column of the populations not in the file**, after a new file or
  new options of the reader give a table without it; the grouping keeps
  its name and is not changed in silence (`docs/specs/core/project.md`,
  "The commands"). At the select, the reason `populationsNeeds` gives,
  of kind `noSuchColumn`, so that one fact has one text; its words are
  those of `docs/specs/core/project.md`, "The populations". The select
  shows "Choose a column".
- **A column that gives no population**, every individual of the
  variants file empty in it: at the select, the reason `populationsNeeds`
  gives, of kind `noPopulation`, in the same words.
- **Every individual of the variants file found**, and **the
  populations**: above.

### The help drawer

What the metadata file is, one row per individual with its name in the
first column; that it is optional, and without it every individual is
in one population, "All individuals", which can also be chosen with a
file; that the rows of individuals not in the variants file are
ignored, so one file serves several variants files; that every
individual of the variants file must be in it; that an xlsx is read
from its first sheet; for a CSV, how the encoding, the separator and the
decimal mark are detected, and when to change them; that missing values
are an empty cell, `NA` or `-`; what the types mean, "identifier" the
names of the individuals, "binary" a column of two values, "continuous"
one of numbers, "categorical" any other, which types each column can
be given and why, and that a binary column's value coded 1 is the case,
proposed as the larger number, 2 of 1 and 2 as in plink, or the first
word of a known pair, `case` of `case` and `control`; that the types
decide how a column colours the PCA and, in association, how it enters
the GWAS, and not the populations; that an individual with an empty
cell in the column of the populations belongs to no population; and,
for Python, that the script reads the file with pandas, every column as
text, `pandas.read_csv(path, sep=";", decimal=",", dtype=str)` or
`pandas.read_excel(path, sheet_name=0, dtype=str)`
(`docs/functionality.md`, section 9).

## Accessibility

- The keyboard goes through the step in this order: the zone's hidden
  button that takes a pasted file, "Paste a metadata file", the file
  button, Remove, the encoding, the separator, the decimal mark, the
  type of each column in the order of the table, each binary one
  followed by its value coded 1, the disclosure of the individuals
  missing, the select of the populations. A file of 20 columns, a few of
  them binary, makes some 25 stops of the Tab key in the table; that is
  taken, since each is a setting the user may need, and the table holds
  nothing else that the Tab key stops at.
- The table of the columns is a native `<table>`, with header cells
  "Column", "Type" and "First values", and the name of each column in a
  `<th scope="row">`, so that a screen reader reads the name with each
  cell; not React Aria's `Table`, a grid that the Tab key enters once
  and the arrow keys move through, which would hide its selects from a
  user who tabs. Each select of a type has its own name, "Type of
  score", and each select of the coding "Value coded 1 in status, the
  case", given as their labels, hidden from the eye, since the header of
  the column says "Type" for every row and a screen reader that reaches
  the select by Tab does not read the header.
- The populations are a list, each item its name and its number in
  words, "P1, 48 individuals", and not a number alone. The words are
  text hidden beside the line shown, which is itself hidden from a
  screen reader, and not the label of the item: NVDA and JAWS may skip
  the label of an item of a list as they read the page, which would lose
  "individuals", and other readers would read the label and the line
  both. The hidden words cannot be selected, so a user who copies the
  list gets the lines as shown, "P1 · 48", one each, where the hidden
  text was copied too in Firefox, "P1 · 48P1, 48 individuals", as the
  owner found on 26 September 2026; the review of task 9.7 of
  `docs/plans/walking-skeleton.md` checked in Chromium and WebKit that
  the copy then gives "p0 · 48" and "p1 · 6" and the tree of
  accessibility the item "p0, 48 individuals" alone.
- The end of a read is announced by the shell, from the state of the
  store, and not by this step, which may not be on the screen when it
  ends: through its status region, the part of the page that a screen
  reader reads out when its text changes, whatever has the focus, the
  element the keyboard acts on, without moving the focus (WCAG 2.2,
  success criterion 4.1.3), with the words of `docs/specs/shell.md`,
  "The status region", which from stage 4 add the types lost. A read
  again after a change of an option is announced the same way, since the
  table under the select changes.
- A change of a type is not announced: the select that the user changed
  shows the new value, and a screen reader reads it.
- An error, a warning and the line of the check say what they are in
  words, and not by their colour alone (1.4.1).

## Left for the running application

Where the options of the reader sit, whether behind a disclosure once
they are right; the order of the parts; how the select of the coding
sits under its type; how the table of the columns fits a phone, 320 px
wide, with a select in each row; the colours of the populations, which
the PCA assigns in stage 4.

## What this spec relies on in the other specs

Of stage 2, each approved by the owner on 25 September 2026:

- `docs/specs/worker/individuals.md`: the read of a CSV gives `found`
  with the three options used, set or detected; the column names are
  unique and the first column is the identifier; the words of its
  refusals are that spec's, after "could not be read:"; and
  `columnWarnings` gives the warning of a column of a few whole numbers,
  with its words.
- `docs/specs/core/projectFile.md`: an opened project keeps the metadata
  file read, with no `File`, and the screen offers to load it again
  rather than change its options.
- `docs/specs/entry.md`: `addFile(file)` of `src/ui/files.tsx`, called
  before the command; after every change the entry asks for the read of
  a pending source with its load id and the options of its CSV.
- `docs/specs/worker/client.md`: a read of the individuals file is not
  cancelled by a change of the variants file.

Of stage 4, written beside this spec on 27 September 2026:

- `docs/specs/core/project.md`: the grouping `onePopulation`;
  `individualsNeeds` giving no reason for no file; `setColumnType` with
  `typesSet` and `typesLost`, and `columnAllows`; `populationsToRun` and
  `populationsNeeds` in `project.ts`, with the words of the one
  population in the reasons of the column; `individualsCheck` `null`
  without a file.
- `docs/specs/worker/files.md` and `docs/specs/worker/individuals.md`,
  revised for stage 4: the kinds of `IndividualsFileError` an xlsx is
  refused with and their words, `xlsxReaderNotLoaded` for a failed
  download of the files wasm; the first sheet that is not hidden; the
  cells of an xlsx compared as text for the types.
- `docs/specs/worker/individuals.md`, revised for this spec: the end
  of the warning of a column of few whole numbers, "If they are codes,
  such as numbered populations, set its type to categorical.", in place
  of "it can still be chosen as the column of the populations", which
  holds in stage 4 too but no longer says what to do.
- `docs/specs/shell.md`: the Individuals step at "Optional" in the
  stepper without a file; the end of a read that lost types announced
  with them; the notice from the descriptions above.
- `docs/specs/analyses/diversity.md`: it runs without a file, and with
  `onePopulation`, on "All individuals".
- `docs/specs/analyses/pca.md`: the types decide how a column colours
  the points; the populations of the grouping colour them by default.

## Open points

The open points of the specs of stage 2 are gathered in
`docs/specs/stage-2-open-points.md`. The two this spec had were decided
by the owner on 25 September 2026, and are written above as decided:
the metadata file and a column required in stage 2, optional from stage
4 (point A there), and each application's name for its file in the
reasons of core (point P).

Stage 4 opens none of its own. It takes as meanwhile the types set kept
when the file is read again, and the name "All individuals", which are
gathered in `docs/specs/stage-4-open-points.md`. These choices of the
writer change what a user meets, and the owner may overrule them on the
screen: a new project with a file
locked until the user chooses a column or the one population, rather
than started at the one population; the words of the types lost; and a
select of the type in every row, a column of one allowed type included.

## Not in this spec

- The roles of the columns of the traits file: the association
  application, stage 7.
- The populations edited with a lasso on the PCA: not in stage 4, a
  design of its own.
- The xlsx the report writes, and how pandas reads it back: stage 6.
- How the reader reads an xlsx, its refusals and their words:
  `docs/specs/worker/files.md`.
