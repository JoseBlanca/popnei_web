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
pick. A file whose name ends in `.csv`, `.tsv` or `.txt` is loaded as a
CSV or a TSV, the reader finding the separator whatever the ending. A
file ending in `.xlsx` or `.xls` is not loaded in this version, and one
of any other name neither (below, "Its words").

Once read, the card shows the name, "360 rows, 5 columns", and a button,
"Remove pops.csv". The first column holds the names of the individuals
(`docs/functionality.md`, section 4).

### How the file was read

The encoding, the separator and the decimal mark, each detected by the
reader and shown with a way to change it, as the owner decided on 24
September 2026 (`docs/architecture.md`, section 6, "The individuals
file"). Each is a `Select`, the list that opens to show its choices,
whose first item is "auto" with what the reader detected, from `found`,
the part of the read that says which encoding, separator and decimal
mark it used:

| label | items | the first item |
|---|---|---|
| Encoding | UTF-8; Windows-1252, as Excel writes a CSV on Windows | "Detected: UTF-8" |
| Separator | comma; semicolon; tab | "Detected: semicolon" |
| Decimal mark | point; comma | "Detected: comma" |

Under them: "If names with accents come out garbled, "EspaÃ±a" for
"España", change the encoding. If the whole file shows as a single
column, change the separator. Changing one reads the file again."
While the file is read again, the first items say "Detected" alone. The decimal mark changes which columns read as numbers, and so
their types.

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
column but the first, and a first item, "None: all individuals in one
population", and under it: "Any column can define the populations,
whatever its type." Every column is offered: a column of
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
are two. With the first item chosen: "All 342 individuals in one
population." Otherwise no list, since the sizes count the individuals
of the variants file: before it is read they are not known, and with
some missing the list would leave them out without saying so.

## The states

| state | what the user sees | what they can do |
|---|---|---|
| empty | cannot happen: with no file, the step offers the pick, which is the ready state | — |
| locked | cannot happen: the file can be loaded before the variants file, and is checked once that one is read | — |
| ready | no file: the zone, "Choose a metadata file…", and "No metadata file." with what that means (**Open 1**) | pick a file |
| running | the card with the name and "Reading pops.csv."; no progress, a read of a second or two | pick another file; Undo |
| done | the card, the options of the reader, the columns, the column of the populations, the check and the populations | change an option, choose the column, replace or remove the file |
| results removed | cannot happen here: the step shows no result. A command of this step that removes results has its notice in the shell (`docs/specs/shell.md`), with the descriptions below | — |
| error | the reader refused the file, its worker failed, or individuals of the variants file are missing from it, with the words below. When the file was read, the options of the reader and the columns stay, so that the user can see what was read | change an option; pick another file |

## What it sends and reads

It reads `project.individuals`, `project.grouping` and
`project.variants` of the state of the store, and `individualsNeeds` of
the project for the reason of a failed read or of missing individuals.
It sends:

| action | command | description |
|---|---|---|
| a file picked or dropped | `loadIndividuals(p, { fileId, name, csv: { encoding: "auto", separator: "auto", decimal: "auto" } })` | "a new metadata file was loaded" |
| an option of the reader chosen | `setCsvOptions(p, csv)` with the other two as they are | "the encoding of pops.csv changed", "the separator of pops.csv changed", "the decimal mark of pops.csv changed" |
| a column chosen | `setGrouping(p, { kind: "populations", column })`, `null` for the first item | "the column of the populations changed" |
| Remove | `removeIndividuals(p)` | "the metadata file was removed" |

Before the command of a pick, the page makes the load id and puts the
`File` into the map of the worker client, the page's side of the two
workers, under it, as for the variants file; the entry of the page asks the light worker for the read.

It needs of core two functions that `src/core/project.ts` does not have,
to add in stage 2, since both are made from the project, the diversity
panel needs the second, and a screen writes no such cache of its own
(`.claude/skills/coding/react.md`, "Reading core"):

- the check: the individuals of the variants file found in the table,
  the ones missing, all of them in the order of the variants file, and
  the number of rows of other individuals; `null` when either file is
  not read;
- the populations: for the column of the grouping, each population with
  its individuals of the variants file, and those with an empty cell;
  `docs/specs/analyses/diversity.md` names it and gives its order, which
  this list follows.

Both keep their answer for the same two sources, so that a table of
10,000 rows is not matched again each time React draws the screen again,
which it does after every change of the store.

A name from the file, of a column, a population or an individual, is
shown with its control and format characters escaped, as core shows a
value of a file (`docs/specs/core/project.md`, "The validation"), by the
function of core that does it, to export; in the lists and the table it
is shown whole, not cut after 40 characters.

## Its words

The descriptions of the commands are in the table above. The rest:

- **An Excel file**: "pops.xlsx was not loaded: this version reads a
  CSV or a TSV, and reads Excel files from a later version. In Excel,
  save the sheet with File › Save As › CSV, and load that file."
- **A file of another name**: "pops.dat was not loaded: the Individuals
  step reads a CSV or a TSV, whose name ends in .csv, .tsv or .txt. If
  it is one of them, rename it."
- **Reading**, **a refusal of the reader**, **a worker that failed**:
  the reason `individualsNeeds` gives, whole, "Reading pops.csv.",
  "pops.csv could not be read: line 7 has 3 cells where the header has
  4. Load an individuals file in the Individuals step.", as the Variants
  step shows `projectNeeds` (`docs/specs/steps/variants.md`, "Its
  words"); the words of the refusals are the reader's
  (`docs/specs/worker/individuals.md`).
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
  "The commands"). At the select: "The column pop, chosen for the
  populations, is not in pops.csv. Choose another column." The select
  shows no item chosen.
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
  and hold no stop of the Tab key.
- The table of the columns has header cells, "Column", "Type" and "First values", and
  the name of each column is the header of its row. The populations are
  a list, each item its name and its number in words, "P1, 48
  individuals", and not a number alone.
- The end of a read is announced through the status region of the shell,
  the part of the page that a screen reader reads out when its text
  changes, whatever has the focus, the element the keyboard acts on,
  without moving the focus (WCAG 2.2, success criterion 4.1.3): "pops.csv
  read: 360 rows, 5 columns.", then the check, "All 342 individuals
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
- `docs/specs/analyses/diversity.md`: it needs the metadata file, by
  `individualsNeeds`, and a column chosen or the first item; it locks
  when the column of the grouping is not in the table, with the words
  above ending "in the Individuals step."; and it names the function of
  the populations and their order.
- `docs/specs/shell.md`, `docs/specs/entry.md` and
  `docs/specs/worker/client.md`: as the Variants step assumes
  (`docs/specs/steps/variants.md`).

## Open points

1. **Whether the metadata file is optional in the walking skeleton.**
   `docs/functionality.md` section 4 has it optional, every individual
   in one population without it; `individualsNeeds` of core, approved on
   24 September 2026, locks every analysis that uses it with "Load an
   individuals file in the Individuals step." when there is none. The
   diversity of one population is a result a user can want, and making
   the file optional is one line of `individualsNeeds` and of the needs
   of the diversity. Recommended: optional, as functionality says. The
   words of the ready state are then "No metadata file: every individual
   is in one population."; meanwhile, "No metadata file. The analyses
   per population need one."
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
