# The Individuals step, in the walking skeleton

A draft of 25 September 2026, awaiting the owner's approval. The screen
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
several files dropped at once (below, "Its words").

Once read, the card shows the name, "360 rows, 5 columns", and a button,
"Remove pops.csv". The first column holds the names of the individuals
(`docs/functionality.md`, section 4).

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
first, "binary" with its two values, "binary: yes, no", "continuous", or
"categorical"; and its first three distinct values that are not
missing, "España, Italia, Perú", so that a wrong encoding, separator or
decimal mark shows. A line above the table: "The types are inferred
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
the diversity locks on it (**Open 1**). Every column is offered: a column of
populations written as numbers, 1 to 12, is inferred continuous, and in
this version the user could not change its type to make it choosable.
Nothing is chosen until the user chooses, since a column chosen by the
screen would be a command no action of the user made
(`.claude/skills/coding/react.md`, "Sending commands").

### Every individual of the variants file in it

Every individual of the variants file must be in the metadata file, and
the rows of other individuals are ignored, as the owner decided on 24
September 2026 (`docs/functionality.md`, section 4). The card shows
where the check stands:

- no variants file read: "The individuals are checked against the
  variants file once it is read.";
- every individual found: "All 342 individuals of panel.nei found · 18
  rows not in panel.nei, ignored", the second half only when there are
  such rows;
- some missing: the error below, with the full list.

### The populations

When all three hold, the variants file read, every one of its
individuals found in the metadata file, and a column chosen: a list of
the populations, each with its number of individuals of the variants file, "P1 · 48". The individuals whose
cell is empty in that column come last, "No population · 4, left out of
the analyses per population" (`docs/functionality.md`, section 4). A
value is a population as it is written in the file, so "P1" and "p1"
are two. Otherwise no list, since the sizes count the individuals
of the variants file: before it is read they are not known, and with
some missing the list would leave them out without saying so.

## The states

| state | what the user sees | what they can do |
|---|---|---|
| empty | cannot happen: with no file, the step offers the pick, which is the ready state | — |
| locked | cannot happen: the file can be loaded before the variants file, and is checked once that one is read | — |
| ready | no file: the zone, "Choose a metadata file…", and "No metadata file." with what that means (**Open 1**) | pick a file |
| running | the card with the name, "Reading pops.csv." and the three options of the reader; the columns and the populations of an earlier read are gone, since the read replaced them; no progress, a read of a second or two | change an option; pick another file; Undo |
| done | the card, the options of the reader, the columns, the column of the populations, the check and the populations | change an option, choose the column, replace or remove the file |
| results removed | cannot happen here: the step shows no result. A command of this step that removes results has its notice in the shell (`docs/specs/shell.md`), with the descriptions below | — |
| error | the reader refused the file, its worker failed, individuals of the variants file are missing from it, or the column chosen gives no population, with the words below. The options of the reader stay in every case; the columns only when the file was read, since a refusal has no table | change an option; choose another column; pick another file; reload the page when the reason says so |

## What it sends and reads

It reads `project.individuals`, `project.grouping` and
`project.variants` of the state of the store, and `individualsNeeds` of
the project for the reason of a failed read or of missing individuals.
It sends:

| action | command | description |
|---|---|---|
| a file picked or dropped | `loadIndividuals(p, { fileId, name, csv: { encoding: "auto", separator: "auto", decimal: "auto" } })` | "a new metadata file was loaded" |
| an option of the reader chosen | `setCsvOptions(p, csv)` with the other two as they are | "the encoding of pops.csv changed", "the separator of pops.csv changed", "the decimal mark of pops.csv changed" |
| a column chosen | `setGrouping(p, { kind: "populations", column })` | "the column of the populations changed" |
| Remove | `removeIndividuals(p)` | "the metadata file was removed" |

Before the command of a pick, the page makes the load id and puts the
`File` into the map of the worker client, the page's side of the two
workers, under it, as for the variants file; the entry of the page asks the light worker for the read.

It needs two functions that are not written yet, since both are made
from the project, the diversity panel needs the second, and a screen
writes no such cache of its own (`.claude/skills/coding/react.md`,
"Reading core"):

- **the check**, a function of `src/core/project.ts`, to add to
  `docs/specs/core/project.md` in the plan of stage 2, since other
  modules may call it:
  `individualsCheck(p): { found: number; missing: string[]; ignoredRows: number } | null`,
  the individuals of the variants file found in the table, all those
  missing in the order of the variants file, and the rows of other
  individuals; `null` when either file is not read. `individualsNeeds`
  is written on it, so that the two never disagree on who is missing.
- **the populations**, `populationsOf(p)` of the diversity module
  (`docs/specs/analyses/diversity.md`), from the table alone, narrowed to
  the individuals of the variants file as its `run` narrows them, by the
  same function its panel uses for its ready state, "3 populations: p0,
  48 individuals; …". The list follows its order.

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
- **Several files dropped**: "Drop one metadata file at a time."
- **A file of another name**: "pops.dat was not loaded: the Individuals
  step reads a CSV or a TSV, whose name ends in .csv, .tsv or .txt. If
  it is one of them, rename it."

  These three stay beside the zone until the next pick, are the
  screen's and not the project's, and are announced when they appear,
  through the function the shell gives the screens, since the focus
  stays on the button.
- **Reading**, **a refusal of the reader**, **a worker that failed**:
  the reason `individualsNeeds` gives, whole, "Reading pops.csv.",
  "pops.csv could not be read: line 7 has 3 cells where the header has
  4. Load an individuals file in the Individuals step.", as the Variants
  step shows `projectNeeds` (`docs/specs/steps/variants.md`, "Its
  words"); the words of the refusals are the reader's
  (`docs/specs/worker/individuals.md`). The ending, "Load an individuals
  file in the Individuals step.", read on that very step, and the advice
  of a crash of the light worker, "the calculation stopped
  unexpectedly", are among the provisional words of core the owner
  judges on these screens (`docs/specs/core/project.md`, open points 4
  and 5).
- **Individuals missing**: the reason `individualsNeeds` gives, "12
  individuals of panel.nei are not in pops.csv: ind_031, ind_044 and 10
  more. Add them to the file and load it again in the Individuals
  step.", and under it a disclosure, "The 12 individuals missing", that
  opens the whole list, one name a line, which the user can select and
  copy into their sheet; a disclosure is a line that opens and closes a
part of the page under it.
- **The column of the populations not in the file**, after a new file or
  new options of the reader give a table without it; the grouping keeps
  its name and is not changed in silence (`docs/specs/core/project.md`,
  "The commands"). At the select, the reason the diversity gives, so
  that one fact has one text: "pops.csv has no column popcat, from which
  the populations were taken. Choose the column that defines the
  populations in the Individuals step." The select shows "Choose a
  column".
- **A column that gives no population**, every individual of the
  variants file empty in it: at the select, the diversity's reason, "No
  individual of panel.nei has a population in the column popcat of
  pops.csv. Fill in the column and load the file again, or choose
  another column, in the Individuals step."
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

- The keyboard goes through the step in this order: the file button,
  Remove, the encoding, the separator, the decimal mark, the column of
  the populations, the disclosure of the individuals missing. The table
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
  "pops.csv read: 360 rows, 5 columns.", then "All 342 individuals
  found." or "12 individuals of panel.nei are not in pops.csv."; a
  refusal with its reason. A read again after a change of an option is
  announced the same way, since the table under the select changes.
- An error and the line of the check say what they are in words, and not
  by their colour alone (1.4.1).

## Left for the running application

Where the options of the reader sit, whether behind a disclosure once
they are right; the order of the parts; the colours of the
populations, which the PCA assigns in stage 4, where the mockup put a
dot beside each.

## What this spec assumes of the other specs of stage 2

These specs are being written at the same time as this one, on 25
September 2026, and none is approved.

- `docs/specs/worker/individuals.md`, a draft of the same day, which
  this spec follows: the read gives `found` with the three options used,
  set or detected, so that the first item of each select says what was
  detected; the column names are unique and the first column is the
  identifier; the words of its refusals are that spec's, after "could
  not be read:", "it is 312.4 MB, more than the 20 MB an individuals
  file can have" among them; and `columnWarnings` gives the warning of a
  column of a few whole numbers, with its words.
- `docs/specs/analyses/diversity.md`, a draft of the same day: it needs
  the metadata file, by `individualsNeeds`, and a column chosen; its
  reasons for a column not in the table and for a column that gives no
  population are the words above; and `populationsOf` gives the
  populations and their order.
- `docs/specs/core/projectFile.md`, a draft of the same day: an opened
  project keeps the metadata file read, with no `File`, and the screen
  offers to load it again rather than change its options.
- `docs/specs/shell.md`, `docs/specs/entry.md` and
  `docs/specs/worker/client.md`: as the Variants step assumes
  (`docs/specs/steps/variants.md`).

## Open points

1. **Whether the metadata file, and a column of populations, are
   optional in the walking skeleton.** `docs/functionality.md` section 4
   has the file optional, every individual in one population without
   it. Core's `individualsNeeds`, approved on 24 September 2026, locks
   every analysis that uses the file when there is none, "Load an
   individuals file in the Individuals step.", and the diversity locks
   when no column is chosen, "Choose the column that defines the
   populations in the Individuals step." This is the same decision as
   open point 1 of `docs/specs/analyses/diversity.md`, and the two specs
   are answered together.
   - Locked, the diversity's recommendation for the skeleton: the step
     says "No metadata file. The analyses per population need one." and
     has no item for one population; a user with one population makes a
     file of one column.
   - Optional: a line of `individualsNeeds` and of the diversity's needs
     changes; the grouping needs a value of its own for "one population
     chosen", apart from `null`, the grouping of a new project, which is
     a change to `Grouping` in `docs/specs/core/project.md`; the step
     gets back an item "All individuals in one population" and the
     words "No metadata file: every individual is in one population." A
     column kept by `removeIndividuals` is then ignored while there is
     no file.

   Recommended: locked in the walking skeleton, as the diversity spec
   recommends, and optional from stage 4, when the step is whole, so
   that the two screens agree and `Grouping` changes once. Meanwhile,
   locked.
2. **"Individuals file" or "metadata file" in the reasons of core.** The
   reasons of `individualsNeeds` say "Load an individuals file", shared
   by the two applications, where functionality and this step call it
   the metadata file in population genetics and the traits file in
   association, so the user reads two names for one file on one screen.
   Recommended: each application's name in its reasons, which is a
   parameter of the application to `individualsNeeds`. Meanwhile, the
   reasons as core gives them. It is one of the words the owner took as
   provisional on 24 September 2026, to be judged on these screens.

## Not in this spec

- The xlsx, and the types, and the coding of a binary column, changed by
  the user: stage 4, in this spec.
- The roles of the columns of the traits file: the association
  application, stage 7.
- The populations edited on the PCA: stage 4 and after.
