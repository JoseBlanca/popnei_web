# The Individuals step

Written on 25 September 2026 for the walking skeleton, stage 2 of
`docs/build-order.md`, approved by the owner the same day and revised
with the owner's decisions of 25 and 26 September 2026 on the reviews of
`docs/plans/walking-skeleton.md`. Rewritten on 27 September 2026 for
stage 4, the step whole, not yet approved: the metadata file read from
an xlsx as well as from a CSV or a TSV; the types of the columns, and
the coding of a binary column, set by the user and kept when the file is
read again; the file optional, with every individual in one population
without it; and the item "All individuals in one population" among the
choices of the populations; revised the same day after its reviews. The
code of stage 2 is in `src/ui/steps/individuals/`.

The screen spec of the second step of the population genetics
application: the user picks the metadata file, or goes on without one,
sees how it was read and can change it, sees its columns with their
types and can change them, chooses what defines the populations, and
learns whether every individual of the variants file is in the file. It
shows section 4 of `docs/functionality.md`, and reads the project and
its commands of `docs/specs/core/project.md` through the store of
`docs/specs/core/store.md`.

The words of core used here. The **project** is everything the user
has set; a **command** is a change of it that one Undo takes back, sent
with a description that ends the notice of what it removed, "Diversity
removed because a new metadata file was loaded · Undo". A **load** is
one pick of a file, and its **load id** the random name the page gives
that pick, new at every pick, the same file picked again included; the
**source** is what the project holds of the loaded file: its load id,
its name, how it is read, the types the user set, and what the read gave.
The **grouping** is what the project holds of the populations: the
column that defines them, none chosen yet, or every individual in one
population. The **key** of an analysis is a text made from everything its
result is calculated from; a result is kept under its key, so a project
that gives the same key again shows the same result with no
calculation (`docs/architecture.md`, section 3). The **reader** is our code that reads
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

The words of the web this spec needs, as it uses them. **React** is the
library that draws the screens of the application from the state of the
project, again after every change of it. **React Aria** is the library
of controls built on React that the screens use, which gives each
control the keys and the names that a screen reader expects; its
`Select` is a button that opens a list of choices. A **screen reader**
is the program that reads the page aloud to a user who cannot see it:
NVDA and JAWS on Windows, VoiceOver on a Mac. It reads from the **tree of
accessibility**, the outline of the page that the browser gives it,
each element with its role and its name. The **focus** is the control
the keyboard acts on, which the Tab key moves from one control to the
next. The **shell** is the part of the page around the steps: the
header, the stepper, the summary line and the notices
(`docs/specs/shell.md`). The **entry** is the code that starts when the
page opens, makes the store and the two workers and joins them
(`docs/specs/entry.md`).

## What it shows

### The file

A drop zone that holds a button, "Choose a metadata file…", as in the
Variants step, and the same one button in every state, "Replace
pops.csv…" once a file is loaded, so that the focus stays on it after a
pick. React Aria's drop zone holds a button of its own, hidden from the
eye, "Paste a metadata file", on which a file copied in the file manager
lands when the user pastes it with Cmd+V or Ctrl+V, so that a user of
the keyboard, who cannot drag a file, can load one, as in the Variants
step (`docs/specs/steps/variants.md`); a paste is a drop to the step,
with the same words.

What is loaded is told by the end of the name, compared without regard
to case:

| the name ends in | what the step does |
|---|---|
| `.csv`, `.tsv` or `.txt` | loads it as a CSV or a TSV, `loadIndividuals` with the three options of the reader at "auto"; the reader finds the separator whatever the ending |
| `.xlsx` | loads it as an xlsx, `loadIndividuals` with `csv: null`; the reader reads the first sheet in the order of the tabs that is not hidden, which may not be the one Excel opens on, since Excel opens a workbook on the sheet that was active when it was saved (`docs/functionality.md`, section 4; `docs/specs/worker/files.md`) |
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
expect with no word why. When the read of a CSV met bytes that it
could not decode in its encoding, and so shows as �, it gives the line
of the first of them, `found.undecodedLine` of
`docs/specs/worker/individuals.md`, and the card also shows the warning
of a character not decoded, below ("Its words"), which names that
line.

A project opened from a project file saved while its metadata file was
being read, or after its reader refused it, names the file and holds no
table of it, `notGiven` (`docs/specs/core/project.md`, "The project of
an opened project file"). The card then shows the name, "Replace
pops.csv…", "Remove pops.csv" and the reason "pops.csv was not read when
this project was saved, so the project file does not hold it. Choose it
again.", and the step shows nothing under it, having no table. The
analyses that use the file are locked until the user picks it, which
loads it with the types they had set, or removes it, which puts every
individual in one population.

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
number or a boolean of an xlsx is shown as the text JavaScript writes
for it, `1.5`, and `TRUE` as `true`. The rows of the file are not
drawn: the three values show what a wrong option does, and a file of
10,000 rows would be a table of 10,000 lines to scroll past to reach
the populations.

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
a second `Select`, labelled "Coded 1, the case", whose two items are its
two values, and beside it the other: "no is coded 0.". The reader proposes
the coding, the larger of two numbers, `case` over `control`, `yes`
over `no` and the other known pairs, and otherwise the value that comes
second when their characters are compared one by one by the number
JavaScript gives each, as its `<` compares two texts, which gives the
same order in every browser, `P2` over `P1`
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

The types the user set are kept when the file is read again, a new
load or other options of the reader, and applied where the new values
allow them (`docs/specs/core/project.md`, "The types of the columns").
A type set that the read does not apply is kept too, and comes back
when a later read allows it: a wrong separator, which reads the file as
one column, applies none of them, and the right one applies them all
again. While some are not applied, a warning above the table says which
columns do not have the type set and why, made from `typesLost(source)`
of core (below, "Its words"). It goes when a read applies them, when
the user sets another type on the column, or when the user presses the
button beside it, "Forget these types", or "Forget this type" for one,
which sends `forgetTypesLost` and drops the types set that are not
applied; the types applied stay. The button is there because a type set
on a column that the file no longer has would otherwise be named at
every read for as long as the file is loaded.

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

- no variants file read, whatever the read of the metadata file: "The
  individuals are checked against the variants file once it is read.";
- every individual found: "All 342 individuals of panel.nei found · 18
  rows not in panel.nei, ignored", the second half only when there are
  such rows;
- some missing: the error below, with the full list.

Without a metadata file there is nothing to check, and the part is not
shown; nor is it while the variants file is read and the metadata file
has no table, being read, refused, or not read when an opened project
was saved, `notGiven`, since the reason on the card already says why
nothing can be checked.

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
says what it defines. At the select, where the user already is, the
same reason is shown without its place, "Choose the column that defines
the populations, or all individuals in one population.": core's
`populationsNeeds` gives each reason about the column twice, `reason`,
which names the step and is shown beside a Run button, and `inStep`,
the same words without the step, which this step shows. The option not taken was to start at the one
population, which would run the diversity on every individual of a
file the user loaded for its populations, and show a table of one row
as if that were the result they asked for.

The items are told apart by a key that is not their text: the one
population by the key `one`, and each column by `column:` followed by
its name, so that a column named "one", or "All individuals in one
population", is not taken for the one population, and the select shows
the right item as chosen.

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
line under the zone says what the analyses run on. Nor is it while the
file has no table, being read, refused, or `notGiven`, since the select
offers the columns of the table; the grouping is kept, and the select
comes back with the table, showing the column chosen before, found by
its name. A column chosen
before the file was removed is kept in the project, and found again by
its name when a file is loaded (`docs/specs/core/project.md`, "The
populations").

A file loaded while every individual is in one population, with no
file or with the grouping `onePopulation`, locks the diversity while it
is read, since a file has to hold every individual of the variants
before anything that uses it runs (`docs/functionality.md`, section 4).
So the table of "All individuals" leaves the screen, and the shell's
notice says so, "Diversity removed because a new metadata file was
loaded · Undo". With `onePopulation`, once the file is read and holds
every individual, the key of the diversity is the one it had, and its
result comes back from the cache with no calculation; the notice then
drops it, and goes if it named nothing else
(`docs/specs/core/store.md`, "The notice, and the calculations it
stops"). The result is off the screen for as long as the read takes;
the lock is what keeps a file that lacks individuals
from being used without a word.

## The states

| state | what the user sees | what they can do |
|---|---|---|
| empty | cannot happen: with no file, the step offers the pick and says what the analyses run on, which is the ready state | — |
| locked | cannot happen: the file can be loaded before the variants file, and is checked once that one is read | — |
| ready | no file: the zone, "Choose a metadata file…", and "No metadata file: every individual is in one population." | pick a file, or go on without one |
| running | the card with the name and "Reading pops.csv."; for a CSV the three options of the reader; the columns, the check and the populations of an earlier read are gone, since the read replaced them; no progress, a read of a second or two, and, for the first xlsx of the page, the download of the files wasm before it | change an option of a CSV; pick another file; Undo |
| done | the card, the options of the reader of a CSV or the line of the first sheet of an xlsx, the columns with their types, the check, the choice of the populations and the populations; the warning of the types set and not applied, while there are some | change an option of a CSV, set a type or a coding, forget the types not applied, choose the populations, replace or remove the file |
| results removed | cannot happen here: the step shows no result. A command of this step that removes results has its notice in the shell (`docs/specs/shell.md`), with the descriptions below | — |
| error | the reader refused the file, its worker failed, individuals of the variants file are missing from it, or the column chosen gives no population or is not in the file, with the words below. The options of a CSV stay in every case; the columns, the check and the populations only when the file was read, since a refusal has no table. The file of an opened project that was not read when it was saved, `notGiven`, is shown here too, with its reason and neither options nor columns (above, "The file") | change an option; choose another column or the one population; pick another file, or the same one again; remove the file; save the project and reload the page when the reason says so |

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
| "Forget these types" or "Forget this type" | `forgetTypesLost(p)` | "the types set and not applied were forgotten" |
| Remove | `removeIndividuals(p)` | "the metadata file was removed" |

After Remove the focus goes to the file button, "Choose a metadata
file…", which is in every state, since the button that had it is gone
with the file, and a focus left on nothing sends a user of the keyboard
back to the top of the page; the code of stage 2 does so. After "Forget
these types" the warning and its button go, and the focus goes to the
first select of a type in the table of the columns, or to the file
button when the table has only the first column, as a file read with
the wrong separator has.

The descriptions end the notice, "Diversity removed because every
individual was put in one population · Undo", and name the step of
undo. A type, a coding or the types forgotten change no key of stage
4, so they remove no result and have no notice; its description names its step of undo, and
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
  column, at the select, are the `inStep` of `populationsNeeds(p)` of
  the same module.
- **the types each column allows**, `columnAllows(read)` of
  `src/core/project.ts`; the types set that the read does not apply,
  `typesLost(source)`; and why each is not applied, `typeLostReason`,
  of the same module.
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
  "pops.csv was not read when this project was saved, so the project
  file does not hold it. Choose it again." for a file `notGiven`,
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
  cells, and its own, with that spec's words after "could not be read:"
  and core's end, "Load a corrected file."; a row of the wrong length
  and a quote never closed are refusals of a CSV alone. The user reads
  an xlsx refused so:
  - not a workbook, `notXlsx`: "pops.xlsx could not be read: it is not
    an Excel workbook, although its name ends in .xlsx; if it is a CSV
    or a TSV, give it a name that ends in .csv. Load a corrected file."
  - Excel's older format renamed, `oldExcel`: "pops.xlsx could not be
    read: it is a workbook of Excel 97–2003, although its name ends in
    .xlsx; in Excel, save it as Excel Workbook (.xlsx). Load a corrected
    file."
  - saved with a password, `encrypted`: "pops.xlsx could not be read: it
    is protected by a password; in Excel, save a copy without the
    password. Load a corrected file."
  - an empty first sheet, `emptySheet`: "pops.xlsx could not be read: its
    first sheet, Hoja1, is empty, and only the first sheet is read; put
    the table in the first sheet. Load a corrected file."
  - an error of the newest Excel, `cellError`: "pops.xlsx could not be
    read: a cell holds the error #SPILL!, which cannot be read; in Excel,
    correct its formula or replace it with its value. Load a corrected
    file."
  - a value far from the table, `sheetTooLarge`: "pops.xlsx could not be
    read: its first sheet, Hoja1, has values over 200 rows and 16,384
    columns, 3,276,800 cells, more than the 2,000,000 a metadata file can
    have; delete the values outside the table. Load a corrected file."
  - damaged, or another format, `files`: "pops.xlsx could not be read:
    it could not be read as an Excel workbook and may be damaged; open
    it in Excel and save it again. Load a corrected file."
  - the reader of Excel files not downloaded, `xlsxReaderNotLoaded`,
    whose words say what to do and take no end: "pops.xlsx could not be
    read: the part of the application that reads Excel files could not
    be downloaded; check the connection and load the file again; if it
    fails again, the site may have been updated since this page was
    opened: save the project, reload the page and open the project
    again."
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
- **Types set and not applied**, `typesLost(source)`, a warning above
  the table of the columns, with the button to forget them. The words do
  not say that the file was just read, since a project opened from a
  project file shows the same warning. A type is named by its word, and
  a binary one with its coding, "binary with yes coded 1". For one
  column, by the reason `typeLostReason` of `src/core/project.ts` gives:
  - its values, `"values"`: "Warning: status does not have the type you
    set, binary with yes coded 1, since its values in pops.csv do not
    allow it; it is categorical, as its values give it. The type you set
    comes back when the file is read with values that allow it."
  - no such column, `"gone"`: "Warning: pops.csv has no column score,
    whose type you set as categorical. The type comes back when the file
    is read with a column of that name."
  - the first column, `"firstColumn"`: "Warning: status is the first
    column of pops.csv, whose cells are the names of the individuals, so
    it does not have the type you set, binary with yes coded 1. If it
    should not be first, correct the file and load it again; the type
    you set then comes back."

  For more than one, a sentence and a list, a line for each column in
  the order of `typesLost`: "Warning: 2 columns do not have the type you
  set:", "status: binary with yes coded 1; its values do not allow it,
  and it is categorical", "score: categorical; pops.csv has no column
  score", "code: categorical; it is the first column, the names of the
  individuals", and after the list "Each type you set comes
  back when the file is read with a column that allows it." The file is
  named as the source names it, so after a new load, the new file. These
  words are the writers' of the specs of stage 4, 27 September 2026, for
  the owner to judge on the screen.
- **Individuals missing**: the reason `individualsStepMissing` of
  `src/core/project.ts` gives, "12 individuals of panel.nei are not in
  pops.csv: ind_031, ind_044 and 10 more. Add them to pops.csv and load
  it again.", which names the file where `individualsNeeds`, beside a
  Run button, names this step; and under it a disclosure, a line that
  opens and closes a part of the page under it, React Aria's
  `Disclosure` as the widget of `src/ui/widgets/Disclosure.tsx` wraps
  it, "The 12 individuals missing", that opens the whole list, one name
  a line, which the user can select with the mouse, and a button under
  the list, "Copy the 12 names", or "Copy the name" for one, which copies them to the clipboard, one
  a line, to paste into their sheet: a list of text cannot be selected
  with the keyboard alone in most browsers, and WCAG 2.2 asks that what
  the mouse does the keyboard can do (success criterion 2.1.1). After
  the copy the shell's status region says "12 names copied." or "The
  name was copied."; when the
  page has no clipboard, which the browser gives only to a page served
  over HTTPS or from the machine itself, or the browser refuses the
  copy, it says "The names could not be copied. Select them in the
  list.", as the bar of errors does (`docs/specs/shell.md`). A user who
  wants no file can also remove it, which the Remove button beside the
  name offers; the reason does not say so, since a file that lacks
  individuals is most often a file to correct.
- **The column of the populations not in the file**, after a new file or
  new options of the reader give a table without it; the grouping keeps
  its name and is not changed in silence (`docs/specs/core/project.md`,
  "The commands"). At the select, the `inStep` that `populationsNeeds`
  gives, of kind `noSuchColumn`, so that one fact has one text: "pops.csv
  has no column popcat, from which the populations were taken. Choose
  the column that defines the populations, or all individuals in one
  population." (`docs/specs/core/project.md`, "The populations"). The
  select shows "Choose a column".
- **A column that gives no population**, every individual of the
  variants file empty in it: at the select, the `inStep` of kind
  `noPopulation`, "No individual of panel.nei has a population in the
  column popcat of pops.csv. Fill in the column and load the file again,
  or choose another column."
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
  button that forgets the types not applied, the type of each column in
  the order of the table, each binary one followed by its value coded 1,
  the disclosure of the individuals missing and, when it is open, the
  button that copies their names, the select of the populations. A file of 20 columns, 5 of
  them binary, makes 24 stops of the Tab key in the table, 19 selects of
  a type and 5 of a coding, a count and not a measurement; that is
  taken, since each is a setting the user may need, and the table holds
  nothing else that the Tab key stops at.
- The table of the columns is the table of HTML, `<table>`, with
  header cells "Column", "Type" and "First values", and the name of each
  column in a `<th scope="row">`, a header cell of its row, so that a
  screen reader reads the name with each cell. It is not React Aria's
  `Table`, which is a grid: a table the Tab key enters once and leaves
  at the next Tab, its cells reached with the arrow keys, which would
  make a user who moves by Tab pass over every select in it. Each
  select of a type has its own name, "Type of score", given as its
  label, hidden from the eye, since the header of the column says "Type"
  for every row and a screen reader that reaches the select by Tab does
  not read the header. Each select of the coding has the name "Coded 1,
  the case, in status": its visible label first, so that a user who
  drives the page by voice and says the words they see, "Coded 1, the
  case", reaches it (WCAG 2.2, success criterion 2.5.3, the visible
  label part of the name), and the column after, which the eye takes
  from the row and a screen reader does not.
- The populations are a list, and a screen reader reads each item as
  its name and its number in words, "P1, 48 individuals", and not a
  number alone. Each item holds two texts: the line the eye sees, "P1 ·
  48", which is hidden from the screen reader, and the words the screen
  reader reads, "P1, 48 individuals", which are hidden from the eye. The
  words are text of the item and not its label, the name given to it in
  the tree of accessibility, because NVDA and JAWS may skip the label of
  an item of a list as they read the page, which would lose
  "individuals", and other screen readers would read the label and the
  line both. The words hidden from the eye cannot be selected, so a user
  who copies the list gets the lines they see, "P1 · 48", one each;
  before, Firefox copied both texts, "P1 · 48P1, 48 individuals", as the
  owner found on 26 September 2026. The review of task 9.7 of
  `docs/plans/walking-skeleton.md` checked in Chromium and WebKit that
  the copy gives "p0 · 48" and "p1 · 6" and the tree of accessibility
  the item "p0, 48 individuals" alone.
- The end of a read is announced by the shell, from the state of the
  store, and not by this step, which may not be on the screen when it
  ends: through its status region, the part of the page that a screen
  reader reads out when its text changes, whatever has the focus, the
  element the keyboard acts on, without moving the focus (WCAG 2.2,
  success criterion 4.1.3), with the words of `docs/specs/shell.md`,
  "The status region". From stage 4 they add, in short, what the read
  brings up on this step that a user of a screen reader would otherwise
  not reach until they moved through the table: the character not
  decoded, the columns of few whole numbers, the column of the
  populations not in the file, and the types set and not applied. A read
  again after a change of an option is announced the same way, since the
  table under the select changes. The copy of the names missing is
  announced through `announce` of the shell, since it follows a press.
- A change of a type is not announced: the select that the user changed
  shows the new value, and a screen reader reads it.
- An error, a warning and the line of the check say what they are in
  words, and not by their colour alone (1.4.1).

## Left for the running application

Where the options of the reader sit, and whether they fold away under a
line that opens them, once the file reads well; the order of the parts; how the select of the coding
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
  `typesSet`, which keeps the types not applied; `typesLost(source)`,
  worked out; `forgetTypesLost`; `columnAllows` and `typeLostReason`;
  `populationsToRun` and `populationsNeeds` in `project.ts`, with the
  words of the one population in the reasons of the column and their
  `inStep`; `individualsCheck` `null` without a file; the read
  `notGiven` of an opened project, with the reasons of
  `individualsNeeds` and `individualsStepNeeds`.
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
  stepper without a file; the end of a read announced with the warnings
  it brings up on this step; the notice from the descriptions above; and
  `announce` for the copy of the names.
- `docs/specs/core/store.md`: a result that the read of the file gives
  back leaves the notice.
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
than started at the one population; the words of the types set and not
applied, and the button that forgets them; the populations and the
check not shown while the file has no table; and a select of the type
in every row, a column of one allowed type included.

## Not in this spec

- The roles of the columns of the traits file: the association
  application, stage 7.
- The populations edited with a lasso on the PCA: not in stage 4, a
  design of its own.
- The xlsx the report writes, and how pandas reads it back: stage 6.
- How the reader reads an xlsx, its refusals and their words:
  `docs/specs/worker/files.md`.
