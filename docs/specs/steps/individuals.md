# The Individuals step, in the walking skeleton

Written on 25 September 2026, and approved by the owner the same day;
built in `src/ui/steps/individuals/`; revised the same day for the
owner's decisions on the review of work package 8 of
`docs/plans/walking-skeleton.md`, points 5 to 7 of its report: the
first values joined by " · ", the check of the individuals under a
heading of its own, and the ends of the refusals of the reader; and for
the warning of a character not decoded and the refusal of a variants
file, of the owner's decisions on the reviews of work packages 2 to 6.
The screen
spec of the second step of the population genetics application as the
walking skeleton of stage 2 builds it (`docs/build-order.md`): the user
picks the metadata file, a CSV or a TSV, sees how it was read and can
change it, sees its columns with the types the reader inferred, chooses
the column that defines the populations, and learns whether every
individual of the variants file is in it. It shows section 4 of
`docs/functionality.md` in part, and reads the project and its commands
of `docs/specs/core/project.md` through the store of
`docs/specs/core/store.md`. The xlsx, and the types changed by the user,
come in stage 4, as the owner decided on 25 September 2026. There is no
code of it yet.

The words of core used here are those of the spec of the Variants step,
`docs/specs/steps/variants.md`: the project, a command with its
description, a load, a source. The **reader** is our code that reads a
CSV or a TSV into a table and infers the type of each column, in the
light worker, the thread of the tab that reads the files of the
individuals (`docs/specs/worker/individuals.md`). "Auto", for an option
of the reader, means that the reader detects it.

## What it shows

### The file

A drop zone that holds a button, "Choose a metadata file…", as in the
Variants step, and the same one button in every state, "Replace
pops.csv…" once a file is loaded, so that the focus stays on it after a
pick. A file whose name ends in `.csv`, `.tsv` or `.txt`, compared
without regard to case, is loaded as a CSV or a TSV, the reader finding
the separator whatever the ending; the picker offers these endings
first, and any file under "All files". A file ending in `.xlsx` or
`.xls`, or of any other name, is not loaded in this version, nor are
several files dropped or pasted at once, nor a folder or a piece of text
(below, "Its words"). The zone holds React Aria's hidden button, "Paste
a metadata file", which takes a file pasted into it, as in the Variants
step, and a paste is a drop to the step, with the same words. A file whose name
ends in `.vcf`, `.vcf.gz`, `.bcf` or `.nei` is a variants file, and is
not loaded either: the step says so in the words of the reader for a
VCF found by its first line, as the owner decided on 25 September
2026, and not "rename it", which would lead the user to load it.

Once read, the card shows the name, "360 rows, 5 columns", and a button,
"Remove pops.csv". The first column holds the names of the individuals
(`docs/functionality.md`, section 4). When the read could not decode a
character, `found.undecodedLine` of `docs/specs/worker/individuals.md`,
the card also shows the warning of a character not decoded, below
("Its words"), which names the line.

### How the file was read

The encoding, the separator and the decimal mark, each detected by the
reader and shown with a way to change it, as the owner decided on 24
September 2026 (`docs/architecture.md`, section 6, "The individuals
file"). Each is a `Select`, the list that opens to show its choices,
whose first item is "auto". While that option is "auto" and the file
is read, the item names what the reader detected, from `found`, the part
of the read that says which encoding, separator and decimal mark it
used; once the user sets the option, `found` holds what was set, so the
first item says "Detected" alone, as it does while a read is under way
or after a refusal, which has no `found`:

| label | items | the first item |
|---|---|---|
| Encoding | UTF-8; Windows-1252, as Excel writes a CSV on Windows | "Detected: UTF-8" |
| Separator | comma; semicolon; tab | "Detected: semicolon" |
| Decimal mark | point; comma | "Detected: comma" |

Under them: "If names with accents come out garbled, "EspaÃ±a" for
"España", change the encoding. If the whole file shows as a single
column, change the separator. Changing one reads the file again."
The decimal mark changes which columns read as numbers, and so their
types.

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

In a project opened from a project file, the metadata file is there,
read, but the page holds no copy of it, which was picked in another
session. Changing an option would then leave it "Reading pops.csv." for
ever, so the three selects are replaced by "To change how pops.csv is
read, load it again.", as `docs/specs/core/projectFile.md`, "The cases",
asks.

### The columns

A table with one row per column of the file: its name; its type, as the
reader inferred it, which the user reads and does not change in this
version (`docs/functionality.md`, section 4), "identifier" for the
first, "binary" with its two values, "binary: yes · no", "continuous", or
"categorical"; and its first three distinct values that are not
missing, joined by " · ", "España · Italia · Perú", so that a wrong
encoding, separator or decimal mark shows. The dot and not a comma, as
the owner decided on 25 September 2026, because a column of the decimal
comma would read "1,75, 1,62, 1,80"; the two values of a binary column
are joined by the same dot, since "binary: 1,5, 2,5" would read no
better. The space before the dot does not break, so that a value keeps
its dot on its line and a line never starts with a dot, which at 320 px
wide, where the values wrap, would read as the mark of a list. A line above the table: "The types are inferred
from the values; changing them comes in a later version." The types
serve the association and the colours of the PCA, which come later;
here they only show the user how their file was read. The rows of the
file are not drawn: 10,000 of them would take seconds, and the three
values show what a wrong option does.

A column of a few whole numbers, inferred continuous, has beside its type
the warning the reader's `columnWarnings` gives, in that spec's words
(`docs/specs/worker/individuals.md`, "The types of the columns"):
"Warning: score holds only 5 different whole numbers, from 1 to 5, and
is taken as a measurement. If they are codes, such as numbered
populations, it can still be chosen as the column of the populations."

### The column that defines the populations

A `Select`, "Column that defines the populations", whose items are every
column but the first, with "Choose a column" shown until one is chosen,
and under it: "Any column can define the populations, whatever its
type." There is no item for "all individuals in one population" in the
walking skeleton: the project's grouping with no column, `null`, is
what a new project starts with, so it cannot also mean a choice, and
the diversity locks on it. The owner decided on 25 September 2026 that
the metadata file and a column are required in stage 2 and optional
from stage 4, when this step gets the item "All individuals in one
population", `Grouping` a value for it, and the words "No metadata
file: every individual is in one population." Every column is offered: a column of
populations written as numbers, 1 to 12, is inferred continuous, and in
this version the user could not change its type to make it choosable.
Nothing is chosen until the user chooses, since a column chosen by the
screen would be a command no action of the user made
(`.claude/skills/coding/react.md`, "Sending commands").

### Every individual of the variants file in it

Every individual of the variants file must be in the metadata file, and
the rows of other individuals are ignored, as the owner decided on 24
September 2026 (`docs/functionality.md`, section 4). The check has a
part of its own, with its heading, "Individuals of panel.nei", the name
of the variants file, or "Individuals of the variants file" while the
project has none, and it comes after the columns and before the column
of the populations. The owner decided on 25 September 2026 that the
individuals missing are not shown under the select of the column, where
they read as if choosing a column would find them. The part shows where
the check stands:

- no variants file read: "The individuals are checked against the
  variants file once it is read.";
- every individual found: "All 342 individuals of panel.nei found · 18
  rows not in panel.nei, ignored", the second half only when there are
  such rows;
- some missing: the error below, with the full list.

### The populations

When all three hold, the variants file read, every one of its
individuals found in the metadata file, and a column chosen: a list of
the populations, each with its number of individuals of the variants
file, "P1 · 48", as `populationsToRun` of the diversity gives them. The
individuals of the variants file whose cell is empty in that column, the
individuals found less those of the populations, come last, "No
population · 4, left out of the analyses per population"
(`docs/functionality.md`, section 4). A
value is a population as it is written in the file, so "P1" and "p1"
are two. Otherwise no list, since the sizes count the individuals
of the variants file: before it is read they are not known, and with
some missing the list would leave them out without saying so.

## The states

| state | what the user sees | what they can do |
|---|---|---|
| empty | cannot happen: with no file, the step offers the pick, which is the ready state | — |
| locked | cannot happen: the file can be loaded before the variants file, and is checked once that one is read | — |
| ready | no file: the zone, "Choose a metadata file…", and "No metadata file. The analyses per population need one." | pick a file |
| running | the card with the name, "Reading pops.csv." and the three options of the reader; the columns and the populations of an earlier read are gone, since the read replaced them; no progress, a read of a second or two | change an option; pick another file; Undo |
| done | the card, the options of the reader, the columns, the column of the populations, the check and the populations | change an option, choose the column, replace or remove the file |
| results removed | cannot happen here: the step shows no result. A command of this step that removes results has its notice in the shell (`docs/specs/shell.md`), with the descriptions below | — |
| error | the reader refused the file, its worker failed, individuals of the variants file are missing from it, or the column chosen gives no population, with the words below. The options of the reader stay in every case; the columns only when the file was read, since a refusal has no table | change an option; choose another column; pick another file; reload the page when the reason says so |

## What it sends and reads

It reads `project.individuals`, `project.grouping` and
`project.variants` of the state of the store, `individualsStepNeeds` of
the project for the reason of a read under way or failed, and
`individualsStepMissing` for that of missing individuals.
It sends:

| action | command | description |
|---|---|---|
| a file picked or dropped | `loadIndividuals(p, { fileId, name, csv: { encoding: "auto", separator: "auto", decimal: "auto" } })` | "a new metadata file was loaded" |
| an option of the reader chosen | `setCsvOptions(p, csv)` with the other two as they are | "the encoding of pops.csv changed", "the separator of pops.csv changed", "the decimal mark of pops.csv changed" |
| a column chosen | `setGrouping(p, { kind: "populations", column })` | "the column of the populations changed" |
| Remove | `removeIndividuals(p)` | "the metadata file was removed" |

Before the command of a pick, the step calls `addFile(file)` of
`src/ui/files.tsx`, which makes the load id and puts the `File` into the
map of the worker client, the page's side of the two workers, under it
(`docs/specs/entry.md`, "At the opening"), as for the variants file; the
entry of the page then asks the light worker for the read.

It reads two functions of core, which are made from the project, and
which a screen does not write as a cache of its own
(`.claude/skills/coding/react.md`, "Reading core"):

- **the check**, a function of `src/core/project.ts` that is not written
  yet, to add to the approved `docs/specs/core/project.md` before the
  plan of stage 2, since the shell calls it too:
  `individualsCheck(p): { found: number; missing: string[]; ignoredRows: number } | null`,
  the individuals of the variants file found in the table, all those
  missing in the order of the variants file, and the rows of other
  individuals; `null` when either file is not read. `individualsNeeds`
  is written on it, so that the two never disagree on who is missing.
- **the populations**, `populationsToRun(p)` of the diversity module
  (`docs/specs/analyses/diversity.md`): the populations of the table
  narrowed to the individuals of the variants file, as its `run` sends
  them and its panel lists them in its ready state. The list follows its
  order. The reasons about the column, at the select, are
  `populationsNeeds(p)` of the same module.

Both keep their answer for the same two sources, so that a table of
10,000 rows is not matched again each time React draws the screen again,
which it does after every change of the store.

A name from the file, of a column, a population or an individual, is
shown with its control and format characters escaped, as core shows a
value of a file (`docs/specs/core/project.md`, "The validation"); in the
lists and the table it is shown whole, not cut after 40 characters, so
the function to export from `project.ts` is one that escapes and does not
cut, beside `shown`, which does both. The name of the file is escaped
and not cut wherever it appears, the card, "Replace pops.csv…" and the
descriptions of the commands.

## Its words

The descriptions of the commands are in the table above. The rest:

- **An Excel file**: "pops.xlsx was not loaded: this version reads a
  CSV or a TSV, and reads .xlsx files from a later version. In Excel,
  save the sheet with File › Save As › CSV, and load that file." The
  same for `.xls`, whose files are not read in a later version either.
- **Several files dropped or pasted**: "Load one metadata file at a
  time."
- **A folder dropped or pasted**: "Load a metadata file, a CSV or a
  TSV, not a folder."
- **A piece of text dropped or pasted**: "Load a metadata file, a CSV
  or a TSV, not a piece of text." A drop of several things, one of
  them a folder, is a drop of several; text that comes in a drop with a
  file is left out, and the file is loaded, as in the Variants step.
- **A variants file, by its name**: "panel.vcf was not loaded: it is
  a variants file, which the Variants step takes. Load a metadata
  file.", the words after the colon those of the reader's
  `variantsFile`, and "was not loaded" as for the other files the step
  does not load, since none of it was read.
- **A file of another name**: "pops.dat was not loaded: the Individuals
  step reads a CSV or a TSV, whose name ends in .csv, .tsv or .txt. If
  it is one of them, rename it."

  These six stay beside the zone until the next pick, are the
  screen's and not the project's, and are announced when they appear,
  through the function the shell gives the screens, since the focus
  stays on the button.
- **Reading**, **a refusal of the reader**, **a worker that failed**:
  the reason `individualsStepNeeds` gives, whole, "Reading pops.csv.",
  "pops.csv could not be read: line 7 has 3 cells where the header has
  4, read with the semicolon as the separator. Choose another separator, or load a corrected file.", "pops.csv could not be read: it is
  a variants file, which the Variants step takes. Load a metadata
  file.", as the Variants step shows `variantsStepNeeds`
  (`docs/specs/steps/variants.md`, "Its words"); the words of the
  refusals are the reader's (`docs/specs/worker/individuals.md`), a
  refused row naming the separator it was read with, as the owner
  decided on 25 September 2026, and their ends are core's, "Load a
  corrected file." after a refusal that no separator mends, as the
  owner decided the same day (`docs/specs/core/project.md`, "What an
  analysis needs of every project"). The reasons of core name the file as
  each application does, "a metadata file" here and "a traits file" in
  association, as the owner decided the same day (point P of
  `docs/specs/stage-2-open-points.md`): `individualsNeeds` takes the
  words from the application of the project (`docs/specs/core/project.md`,
  "What an analysis needs of every project"). The advice of a crash of
  the light worker, "the calculation stopped unexpectedly", is among the
  provisional words of core the owner judges on these screens
  (`docs/specs/core/project.md`, open point 4).
- **A character not decoded**, on the card of a file read, "Warning:
  line 3 of pops.csv has bytes that could not be read as UTF-8, shown as
  �. Correct them in the file and load it again, or, if every letter
  with an accent shows as �, choose Windows-1252 as the encoding.", and,
  for a file read as UTF-16, whose encoding cannot be chosen, "Warning:
  line 3 of pops.csv has bytes that could not be read as UTF-16, shown
  as �. Correct them in the file and load it again." A file read as
  Windows-1252 has none. The warning is the screen's, made from the
  read.
- **Individuals missing**: the reason `individualsStepMissing` of
  `src/core/project.ts` gives, "12 individuals of panel.nei are not in
  pops.csv: ind_031, ind_044 and 10 more. Add them to pops.csv and load
  it again.", which names the file where `individualsNeeds`, beside a
  Run button, names this step; and under it a disclosure, "The 12 individuals missing", that
  opens the whole list, one name a line, which the user can select and
  copy into their sheet; a disclosure is a line that opens and closes a
part of the page under it.
- **The column of the populations not in the file**, after a new file or
  new options of the reader give a table without it; the grouping keeps
  its name and is not changed in silence (`docs/specs/core/project.md`,
  "The commands"). At the select, the reason `populationsNeeds` gives,
  of kind `noSuchColumn`, so that one fact has one text; its words are
  the diversity's (`docs/specs/analyses/diversity.md`, "Why it cannot
  run"). The select shows "Choose a column".
- **A column that gives no population**, every individual of the
  variants file empty in it: at the select, the reason `populationsNeeds`
  gives, of kind `noPopulation`, in the diversity's words.
- **Every individual of the variants file found**, and **the
  populations**: above.

### The help drawer

What the metadata file is, one row per individual with its name in the
first column; that the rows of individuals not in the variants file are
ignored, so one file serves several variants files; that every
individual of the variants file must be in it; how the encoding, the
separator and the decimal mark are detected, and when to change them;
that missing values are an empty cell, `NA` or `-`; what the types mean, "identifier" the names of the individuals,
"binary" a column of two values, "continuous" one of numbers,
"categorical" any other; that an individual with an empty cell in the column of the populations
belongs to no population; and, for Python, that the script reads the
file with pandas, `pandas.read_csv(path, sep=";", decimal=",")`
(`docs/functionality.md`, section 9).

## Accessibility

- The keyboard goes through the step in this order: the zone's hidden
  button that takes a pasted file, "Paste a metadata file", the file
  button, Remove, the encoding, the separator, the decimal mark, the disclosure
  of the individuals missing, the column of the populations. The table
  of the columns and the list of the populations are read, not operated,
  and hold no stop of the Tab key: the table is a native `<table>`, the
  name of each column in a `<th scope="row">`, and not React Aria's
  `Table`, which is a grid that the Tab key enters.
- The table of the columns has header cells, "Column", "Type" and "First values", and
  the name of each column is the header of its row. The populations are
  a list, each item its name and its number in words, "P1, 48
  individuals", and not a number alone.
- The end of a read is announced by the shell, from the state of the
  store, and not by this step, which may not be on the screen when it
  ends: through its status region, the part of the page that a screen
  reader reads out when its text changes, whatever has the focus, the
  element the keyboard acts on, without moving the focus (WCAG 2.2,
  success criterion 4.1.3), with the words of `docs/specs/shell.md`,
  "The status region". A read again after a change of an option is
  announced the same way, since the table under the select changes.
- An error and the line of the check say what they are in words, and not
  by their colour alone (1.4.1).

## Left for the running application

Where the options of the reader sit, whether behind a disclosure once
they are right; the order of the parts; the colours of the
populations, which the PCA assigns in stage 4, where the mockup put a
dot beside each.

## What this spec relies on in the other specs of stage 2

Each was approved by the owner on 25 September 2026, and says what is listed here.

- `docs/specs/worker/individuals.md`, which this spec follows: the read
  gives `found` with the three options used, set or detected, so that
  the first item of each select says what was detected while that option
  is "auto"; the column names are unique and the first column is the
  identifier; the words of its refusals are that spec's, after "could
  not be read:"; and `columnWarnings` gives the warning of a column of a
  few whole numbers, with its words.
- `docs/specs/analyses/diversity.md`: it needs the metadata file, by
  `individualsNeeds`, and a column chosen; `populationsNeeds` gives its
  reasons about the column, with their kinds; and `populationsToRun`
  gives the populations and their order.
- `docs/specs/core/projectFile.md`: an opened project keeps the metadata
  file read, with no `File`, and the screen offers to load it again
  rather than change its options.
- `docs/specs/shell.md`: the step is drawn in its `<main>` with one
  `<h1>`, "Individuals"; the shell writes the notice from the description
  of a command, announces the ends of the reads from the state, and
  gives the steps `announce` for what they announce themselves.
- `docs/specs/entry.md`: `addFile(file)` of `src/ui/files.tsx`, called
  before the command; after every change the entry asks for the read of
  a pending source with its load id and the options of its CSV.
- `docs/specs/worker/client.md`: a read of the individuals file is not
  cancelled by a change of the variants file.

`individualsCheck`, and the function that escapes a name without cutting
it, are additions to the approved `src/core/project.ts`, listed in
`docs/specs/stage-2-open-points.md`, "Changes to approved files".

## Open points

The open points of the eleven specs of stage 2 are gathered in
`docs/specs/stage-2-open-points.md`. The two this spec had were decided
by the owner on 25 September 2026, and are written above as decided:
the metadata file and a column required in stage 2, optional from stage
4 (point A there), and each application's name for its file in the
reasons of core (point P).

## Not in this spec

- The xlsx, and the types, and the coding of a binary column, changed by
  the user: stage 4, in this spec.
- The roles of the columns of the traits file: the association
  application, stage 7.
- The populations edited on the PCA: stage 4 and after.
