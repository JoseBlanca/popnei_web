# The Variants step, in the walking skeleton

A draft of 25 September 2026, awaiting the owner's approval. The screen
spec of the first step of the population genetics application as the
walking skeleton of stage 2 builds it (`docs/build-order.md`): the user
picks the variants file, a VCF or a `.nei` file, sets how a VCF is read,
sees what the file holds, and sets the missing data filter. It shows
section 3 of `docs/functionality.md` in part, and reads the project and
its commands of `docs/specs/core/project.md` through the store of
`docs/specs/core/store.md`. The rest of the step, the other filters of
the variants, the filters of the individuals, what each filter kept, the
histograms and writing the filtered variants, comes in stage 3 and is
added to this spec then. There is no code of it yet.

The words of core used here: the **project** is everything the user has
set; a **command** is a change of it that one Undo takes back, sent with
a description that ends the notice of what it removed, "Diversity
removed because the missing data filter changed · Undo"; a **load** is
one pick of a file, with an id of its own, new at every pick; the
**source** is what the project holds of the loaded file, its name, size,
format, read options, and what the calculation worker, the second thread
of the tab where popnei runs, read from it. A **pass** is one reading of
the variants from the start of the file, which every analysis and filter
makes.

## What it shows

### The file

A drop zone that holds a button, "Choose a variants file…", which opens
the file picker of the system, since dropping a file cannot be done with
a keyboard (`.claude/skills/coding/react.md`, "Widgets"). The format is
told by the end of the name, since the page does not read the file:
`.nei` is a `.nei` file; `.vcf`, `.vcf.gz` and `.vcf.bgz` are a VCF,
plain or compressed, which popnei's `openVcf` reads alike
(`js/popnei/src/io_vcf.ts`). A file of any other name is not loaded,
and the step says so (below, "Its words"); the picker offers these
endings first, and any file under "All files".

Once a file is picked, the zone shows the file's card: its name, its
format, "VCF" or ".nei file", and its size, and what the file holds as
soon as it is read:

| line | from |
|---|---|
| individuals, "200 individuals" | the length of `read.individuals` of the source, the part of it that holds what the worker read, which popnei gives when the file opens, with no pass |
| ploidy, "Ploidy 2" | `read.ploidy`: for a `.nei` file the one in the file; for a VCF the one the user gave, since popnei does not read it from a VCF |
| variants, "1,200 variants" | `read.numVars`, once the first pass has counted them; until then "Variants: counted when the first analysis runs" |
| how a VCF was read | "Read with ploidy 2, only the variants with PASS or . in the FILTER column", or "Read with ploidy 2, every variant", from `readOptions` |

The number of variants counts those the file gives before the filters of
the application: for a VCF read with only the passed variants, those
that passed. It is not known sooner because popnei counts the variants
of a file only by reading all of them, a pass, and the first pass is
that of the first analysis the user runs (`docs/architecture.md`,
section 6, "How a load of the variant file reaches the project", step
5). The chromosomes with their number of variants, which section 3 of
functionality lists, come with stage 3.

The button stays in the zone, labelled "Replace panel.nei…" once a file
is loaded, and a file dropped on the card replaces the one there. The
button is the same element in every state, so that the focus stays on it
after a pick, when the card replaces the empty zone. There is no Remove:
core has no command that takes the variants file out, and Undo does.

A file larger than 1.5 GB gets a warning on its card, before it is read
(below). popnei 0.1.0 reads a file whole into the memory of the tab, and
files above roughly 1.5 to 2 GB fail, an estimate that no browser has
been measured at (`docs/architecture.md`, sections 6 and 11). The size
is known from the pick, without reading the file.

### How a VCF is read

Beside the zone, two options for the next VCF the user picks, with no
effect on a `.nei` file, whose ploidy is in the file:

| label | widget | default | from |
|---|---|---|---|
| Ploidy of the VCF | `NumberField`, a whole number from 1 to 255 | 2 | the default of popnei's `openVcf`, and the range it accepts (`MAX_PLOIDY` of `src/core/project.ts`) |
| Only the variants with PASS or . in the FILTER column | `Switch` | on | `onlyPassed` of `openVcf`, true by default: a variant whose FILTER column is neither `PASS` nor `.` is left out |

Under the ploidy, a line that the owner asked for on 25 September 2026:
"A VCF does not say its ploidy, so it is given here. If it is wrong, the
first analysis stops with a message from popnei that names the line and
the individual, and the file is picked again with the right ploidy." popnei
opens a VCF of the wrong ploidy without complaint, and refuses it at the
first genotype a pass reads. With popnei's local build of 25 September
2026, `e2e/fixtures/tetraploid.vcf.gz` opened with ploidy 2 gives 12
individuals and ploidy 2, and its first pass throws "line 5 of the VCF,
the column of t00: its genotype is of the ploidy 4 and the reader was
asked for the ploidy 2; popnei does not read a VCF whose genotypes are
of different ploidies, and the ploidy is an argument of the reader". The
diversity panel shows that message as popnei's refusal
(`docs/specs/analyses/diversity.md`).

The two options are the screen's own state until the pick, and are
written into the source by the command of the pick; after it, the card
says what the file was read with. To read a VCF already loaded with
another ploidy, the user sets it and picks the file again (**Open 1**).

### The missing data filter

A switch, "Filter the variants by missing data", and, while it is on, a
number field, "Maximum proportion of missing genotypes", from 0 to 1,
under it. The field holds the number popnei is given,
`maxAllowedMissingRate` of `filterByMissingData`, as typed, and not
converted from another number such as a proportion of called genotypes
(`docs/specs/worker/protocol.md`): a variant is kept when
its missing genotypes divided by all the individuals of the file are at
most that number. A genotype is missing when any of its alleles is, so
`0/.` counts as missing (`js/popnei/src/variant.ts`). Functionality
section 3 words the filter the same way, a proportion at most a
threshold, so the label and popnei agree and nothing is converted.

The filter is on from the start, with a threshold of 0.1 (**Open 2**),
and is shown with no file loaded too, since the filters belong to the
project and stay across loads. The arrow keys and the buttons of the
field move it by 0.01; a number typed with more decimals, 0.125, is kept
as typed. Turned off, the field goes; turned on again, it has the
default.

## The states

The step is not an analysis: it runs nothing the user starts, and what
it waits for is the read of the file. Its states:

| state | what the user sees | what they can do |
|---|---|---|
| empty | cannot happen: with no file, the step offers the pick, which is the ready state | — |
| locked | cannot happen: nothing has to be done before a file is picked. A file picked before the calculation worker has started is read once it has | — |
| ready | no file: the zone, "Choose a variants file…", the options of a VCF, the filter. With an opened project file, the file it was made with, below | pick a file; set the options and the filter |
| running | the card with its name, format and size, and "Reading panel.nei."; no progress bar, since popnei 0.1.0 reports none (`docs/architecture.md`, section 6) | pick another file, which replaces this one; Undo; set the filter |
| done | the card with the individuals, the ploidy, the number of variants once counted, how a VCF was read, and the warnings below | replace the file; set the filter |
| results removed | cannot happen here: the step shows no result. A command of this step that removes results, a new file or a changed filter, has its notice in the shell (`docs/specs/shell.md`), with the descriptions below | — |
| error | the card with the reason the file was not read, below | pick a file |

A read that takes long cannot be cancelled with a button. Picking
another file, or Undo, replaces the load. The calculation worker is
started again for the next load, and starting it again ends the read of
the old one (`docs/architecture.md`, section 5).

## What it sends and reads

It reads `project.variants`, `project.filters` and `project.reference`
of the state of the store, and `projectNeeds` of the project, the
function of core that gives the reason no analysis can run, for the
reason of a failed read. It sends:

| action | command | description |
|---|---|---|
| a file picked or dropped | `loadVariants(p, { fileId, name, size, format, readOptions })`, `readOptions` `{ ploidy, onlyPassed }` for a VCF and `null` for a `.nei` file | "a new variants file was loaded" |
| a threshold committed, on Enter or when the field loses the focus | `setVariantFilter(p, { kind: "missing_data", maxAllowedMissingRate })` | "the missing data filter changed" |
| the switch turned off | `removeVariantFilter(p, "missing_data")` | "the missing data filter was turned off" |
| the switch turned on | `setVariantFilter(p, { kind: "missing_data", maxAllowedMissingRate: 0.1 })` | "the missing data filter was turned on" |

Before the command of a pick, the page makes the load id and puts the
`File` into the map of the worker client under it
(`docs/specs/worker/client.md`); the entry of the page then asks the
calculation worker to open it, and the store records what it read
(`docs/architecture.md`, section 6, "Who asks for a read"). The step
does not read the file and holds nothing of the project.

## Its words

The descriptions of the commands are in the table above. The rest:

- **A file of another name**: "panel.txt was not loaded: the Variants
  step reads a VCF, whose name ends in .vcf, .vcf.gz or .vcf.bgz, or a
  .nei file. If it is one of them, rename it." The message stays until
  the next pick, and is the screen's, not the project's.
- **Reading**: "Reading panel.nei.", the reason `projectNeeds` gives.
- **A file popnei refused**, a failed read of any kind: the reason
  `projectNeeds` gives, shown whole, "popnei could not read bad.vcf: the
  source is not a VCF: it starts with `This is a line o`. Load a
  variants file in the Variants step." It is the text every analysis
  shows beside its Run button, and one text for one fact keeps the step
  and the panels saying the same; the owner judges these provisional
  words of core on the screens of stage 2 (`docs/specs/core/project.md`,
  open points 2 to 6). The message quoted is popnei's for
  `e2e/fixtures/bad.vcf`, seen under node on 25 September 2026.
- **A large file**, a warning: "Warning: panel.vcf.gz is 2.3 GB. This
  version of the application reads a variants file whole into the memory
  of the browser, and files above about 1.5 GB may fail to open. If it
  fails, filter it with bcftools or popnei outside the browser first."
- **The line under the ploidy**, above.

### A project file opened

A project file keeps the settings and not the variants file, which a
browser cannot open by itself, so an opened project has no variants file
and holds what its file said of the one it was made with, its
`reference` (`docs/specs/core/project.md`, "The project of an opened
project file"). The step shows, above the zone: "This project was made
with panel_2026.nei: 342 individuals, ploidy 2, 1,203,554 variants. Load
that file to run its analyses again." The number of variants is left out
when the project file does not have it.

Once the file given is read, the step compares it with the reference,
and warns when they differ, saying in what, without refusing the file:
"Warning: the project was made with panel_2026.nei, 342 individuals and
1,203,554 variants; this file, panel_2027.nei, has 360 individuals.
Its results can differ from those saved." The comparison is of the name,
the size, the ploidy, the individuals, in number and names, "this file
has 342 individuals, 12 of them not in the project's file", and the
number of variants once a pass has counted them. The results themselves
are compared by the check numbers, in stage 6.

### The help drawer

What the step reads, a VCF or a `.nei` file; that a VCF's ploidy is
given and not read, with what a wrong one gives; that only the variants
with PASS or `.` in the FILTER column are read by default, a `.` saying
that no filter was applied to that variant; the missing data filter: a
genotype is missing when any of its alleles is, `0/.` among them, and
the proportion is over all the individuals of the file, so that 0.1
keeps a variant with at most 10% of its genotypes missing, 0 keeps only
the variants with every genotype called and 1 keeps them all; the size
of file that this version can open; and, for those who work in Python,
the code that does the same:
`popnei.open_vcf(path, ploidy=2, only_passed=True)` or
`popnei.open_vars(path)`, then `variants.filter_by_missing_data(0.1)`.

## Accessibility

- The keyboard goes through the step in this order: the file button, the
  ploidy, the switch of the passed variants, the switch of the filter,
  its threshold. A warning or an error sits in the order of the text
  beside what it is about, and is text, "Warning:", as well as its colour
  and its icon (WCAG 2.2, success criterion 1.4.1).
- The drop zone is a region labelled "Variants file", and the button in
  it is the way to pick without dragging (2.1.1).
- The read of a large file takes long, a time not yet measured, and the
  user may be elsewhere on the page. Its end is announced through the
  status region of the shell, the part of the page that a screen reader
  reads out when its text changes, without moving the focus, the element
  the keyboard acts on (4.1.3): "panel.nei read: 200 individuals,
  ploidy 2." or "bad.vcf could not be read." followed by the reason.
- The warning of a reopened project that differs from its file is
  announced the same way when it appears.

## Left for the running application

Where the options of a VCF sit beside the zone, whether the card and the
filter are side by side or one above the other, the format of the size,
and the icons.

## What this spec assumes of the other specs of stage 2

These specs are being written at the same time as this one, on 25
September 2026, and none is approved; each line is what this spec needs
of one of them.

- `docs/specs/shell.md`: the step is drawn in its `<main>` with one
  `<h1>`, "Variants"; the shell writes the notice from the description
  of a command, "‹what was removed› because ‹description› · Undo", and
  from the pattern "2 calculations stopped because a new variants file
  was loaded · Undo" for a new load; and it gives the steps one way to
  write into its status region.
- `docs/specs/entry.md`: the first project of the population genetics
  application holds the missing data filter at 0.1, since `emptyProject`
  of core holds no filter, and the entry makes the first project the
  store is given; and after every change it asks for the read of a
  pending source.
- `docs/specs/worker/client.md`: a function that puts a `File` into the
  client's map under a load id, called before the command; and the
  calculation worker started again for a new load, which ends a read of
  the old one still under way.
- `docs/specs/worker/runner.md` and `messages.md`: the open of the file
  gives the individuals and the ploidy, and a refusal of popnei at the
  open is recorded as `{ kind: "popnei", message }`; the function the
  store is given as `numVarsOf` gives the variants of the file before the
  filters of the application, `varsProcessed` of the first filter of the
  pass or its `numVars` when it has none, and not `numVars` after the
  filters.
- `docs/specs/analyses/diversity.md`: a refusal of popnei in the pass,
  the wrong ploidy among them, is its error state, with popnei's message
  whole.
- `docs/specs/core/projectFile.md`: an opened project has `variants:
  null` and its `reference`, and leaves the words of the comparison with
  the reference to this step.

## Open points

1. **Reading a VCF already loaded again with another ploidy**, or with
   the other choice of the passed variants. The project spec left how to
   the screen spec of stage 3 (`docs/specs/core/project.md`, "The
   commands"). With the ploidy given and not read, a wrong ploidy is what
   a user of a polyploid meets first, and picking the file again means
   finding it again in the picker. The option: once a VCF is loaded, the
   two options show its values, and changing one offers a button, "Read
   panel.vcf.gz again with ploidy 4", which makes a new load of the same
   `File`, with a new load id, through `loadVariants`; core allows it,
   since what it refuses is a load that reuses the id of the load already
   there with other options; a new id with the same `File` is a new
   load like any other. It costs a button and the page keeping the `File` of the
   current load, which it does already. Recommended, in stage 2.
   Meanwhile, the user picks the file again.
2. **The default of the missing data filter**, functionality's open
   point 4, which leaves the threshold to decide and the filter on.
   Meanwhile, on at 0.1, which is plink's default for `--geno`, the same
   filter on the same proportion. A different answer changes one number
   here and in the entry.

## Not in this spec

- The other filters of the variants, the filters of the individuals,
  what each filter of a pass was given and kept, the chromosomes, the
  histograms per variant and per individual, and writing the filtered
  variants: stage 3, in this spec.
- The notice, its words and its Undo; the stepper and the summary line:
  `docs/specs/shell.md`.
- What the worker does with the file: `docs/specs/worker/runner.md`.
- The project file and the check numbers: `docs/specs/core/projectFile.md`.
