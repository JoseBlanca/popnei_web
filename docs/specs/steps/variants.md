# The Variants step, in the walking skeleton

Written on 25 September 2026, approved by the owner the same day, and
revised the same day with the owner's decisions on the screen as built
(stop 7.5 of `docs/plans/walking-skeleton.md`), and on the project file
opened, points 9 and 10 of the reviews of work packages 2 to 6 of that
plan. The screen spec of the first step of the population genetics application as the
walking skeleton of stage 2 builds it (`docs/build-order.md`): the user
picks the variants file, a VCF or a `.nei` file, sets how a VCF is read,
sees what the file holds, and sets the missing data filter. It shows
section 3 of `docs/functionality.md` in part, and reads the project and
its commands of `docs/specs/core/project.md` through the store of
`docs/specs/core/store.md`. The rest of the step, the other filters of
the variants, the filters of the individuals, what each filter kept, the
histograms and writing the filtered variants as a VCF or a `.nei` file,
comes in stage 3 and is added to this spec then, in this step and not in
an Export step, as the owner decided on 25 September 2026. There is no
code of it yet.

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

A drop zone, React Aria's `DropZone`, that holds a button, a
`FileTrigger`, "Choose a variants file…", which opens the file picker of
the system, since dropping a file cannot be done with a keyboard
(`.claude/skills/coding/react.md`, "Widgets"). The format is told by the
end of the name, compared without regard to case, `PANEL.VCF.GZ` as
`panel.vcf.gz`, since the page does not read the file:
`.nei` is a `.nei` file; `.vcf`, `.vcf.gz` and `.vcf.bgz` are a VCF,
plain or compressed, which popnei's `openVcf` reads alike
(`js/popnei/src/io_vcf.ts`). A file of any other name is not loaded,
and the step says so (below, "Its words"); the picker offers these
endings first, and any file under "All files".

React Aria's drop zone holds a button of its own, hidden from the eye,
"Paste a variants file", which takes a file pasted into it with Cmd+V
or Ctrl+V and loads it as a drop, so that a user of the keyboard who has
copied the file in the file manager can paste it. It is the first stop
of the Tab key in the step, and Enter on it does nothing. A paste was
seen to load the file in WebKit 26.6 on 25 September 2026, and was not
tried in Chromium or Firefox. The owner decided on 25 September 2026 to
keep it.

A paste is a drop to the step, which cannot tell them apart, so the
words of what a drop held fit a paste as well, and say "load" and not
"drop": a user of the keyboard pastes and cannot drop. Several files
dropped or pasted at once load none: "Load one variants file at a
time." A drop or a paste that holds no file loads nothing and says what
to give: a folder, "Load a VCF or a .nei file, not a folder.", and a
piece of text, dragged from another window or copied, "Load a VCF or a
.nei file, not a piece of text.". A drop of several things, one of them
a folder, is a drop of several, and loads none, as above. Text that
comes in a drop with a file is left out, and the file is loaded, so that
a browser that gives a dragged file's name as text beside it still loads
the file; whether one does was not checked. Whether a folder copied in
the file manager reaches the page as a folder when it is pasted was not
checked either; the words above fit it if it does.

Once a file is picked, the zone shows the file's card: its name, its
format, "VCF" or ".nei file", and its size, and what the file holds as
soon as it is read:

| line | from |
|---|---|
| individuals, "200 individuals" | the length of `read.individuals` of the source, the part of it that holds what the worker read, which popnei gives when the file opens, with no pass |
| ploidy, "Ploidy 2", for a `.nei` file only | `read.ploidy`, the one in the file. A VCF has no line of its own for it, since its ploidy is the one the user gave and not one found in the file; the line of how it was read gives it, as the owner decided on 25 September 2026 |
| variants, "1,200 variants" | `read.numVars`, once the first pass has counted them; until then "Variants: not counted yet; the first analysis that reads the whole file counts them", which stays true after an analysis that popnei refused |
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

No size of file gets a warning. popnei's release `js-v0.1.0-dev.2`, which
stage 2 builds on as the owner decided on 25 September 2026, reads the
`File` by ranges of a few MiB, so the size of a file is not bounded by
the memory of the tab (`docs/specs/worker/runner.md`, "The memory"), and
the warning of a file above 1.5 GB, which a draft of this spec had for
the release before, which read the file whole, is gone. What a large
file costs is time: every analysis reads the whole file, a gzipped VCF
decompressed whole at every pass. That is shown where it is paid, by the
progress bar of each calculation (`docs/specs/analyses/diversity.md`,
the running state), and not guessed from the size before any pass; the
remedy, writing the variants as a `.nei` file once, which is read many
times faster (`docs/functionality.md`, section 3), comes to this step in
stage 3. The help drawer, which will say so, comes in stage 8 (below,
"Not in this spec"); until then nothing on the screen says it.

### How a VCF is read

Beside the zone, two options for the next VCF the user picks, with no
effect on a `.nei` file, whose ploidy is in the file:

| label | widget | default | from |
|---|---|---|---|
| Ploidy of the VCF, from 1 to 255 | `NumberField`, a whole number | 2 | the default of popnei's `openVcf`, and the range it accepts (`MAX_PLOIDY` of `src/core/project.ts`) |
| Only the variants with PASS or . in the FILTER column | `Checkbox`, since it takes effect at the next pick and not at once, which a `Switch` would promise (`react.md`, "Widgets") | on | `onlyPassed` of `openVcf`, true by default: a variant whose FILTER column is neither `PASS` nor `.` is left out |

Under the ploidy, a line that the owner asked for on 25 September 2026,
and reworded the same day so that it does not read as if the
application read the file again by itself: "A VCF does not say its
ploidy, so it is given here. If it is wrong, the first analysis stops
with a message that names the line and the individual; set the right
ploidy here and read the file again." popnei
opens a VCF of the wrong ploidy without complaint, and refuses it at the
first genotype a pass reads. With `js-v0.1.0-dev.2`, on 25 September
2026, `e2e/fixtures/tetraploid.vcf.gz` opened with ploidy 2 gives 12
individuals and ploidy 2, and its first pass throws "line 5 of the VCF,
the column of t00: its genotype is of the ploidy 4 and the reader was
asked for the ploidy 2; popnei does not read a VCF whose genotypes are
of different ploidies, and the ploidy is an argument of the reader". The
diversity panel tells this refusal in its own words, which name the
line, the individual and the two ploidies and say to set the ploidy and
read the file again (`docs/specs/analyses/diversity.md`, "Its words",
the row of a genotype of another ploidy); the line under the ploidy
says where that setting is, and the button below reads it again.

The two options are state of the step, not of the project, until the
pick, and are written into the source by the command of the pick; after
it, the card says what the file was read with. Each time the step is
drawn they start at the options of the VCF loaded, or, in a project
opened from a file with no variants file yet, at those of the
reference's VCF, as `docs/specs/core/projectFile.md` asks, since a VCF
read with another ploidy gives no comparison of its numbers; otherwise
at the defaults. So leaving the step, or an Undo, can set them back, and
what they hold always matches a file the project has or had.

**Reading the VCF again.** Once a VCF is loaded, when the two options
differ from those it was read with, a button appears under them that
names every option that differs, as the owner decided on 25 September
2026: "Read panel.vcf.gz again with ploidy 4" when only the ploidy
differs; "Read panel.vcf.gz again with every variant" or "Read
panel.vcf.gz again with only the variants with PASS or . in the FILTER
column" when only the choice of the passed variants does; and both,
"Read panel.vcf.gz again with ploidy 4 and every variant", when both
do. It
makes a new load of the same `File`, with a new load id, through
`addFile` and `loadVariants`, as a pick does, with the description "the
variants file was read again with other options"; core allows it, since
what it refuses is a load that reuses the id of the load there with
other options. The owner decided on 25 September 2026 that it is in
stage 2, since a wrong ploidy is what a user of a polyploid meets first
and picking the file again means finding it again in the picker. A new
load is a new key for every analysis and restarts the calculation
worker, as a pick does (`docs/architecture.md`, section 5), and opening
the `File` again reads its header only. For an opened project, whose
variants file is the reference's and not a `File` of this page, there is
no button until a file is loaded. The button goes when the options are
set back to those of the file.

### The missing data filter

A switch, "Filter the variants by missing data", and, while it is on, a
number field, "Maximum proportion of missing genotypes, from 0 to 1",
under it. The field holds the number popnei is given,
`maxAllowedMissingRate` of `filterByMissingData`, as typed, and not
converted from another number such as a proportion of called genotypes
(`docs/specs/worker/protocol.md`): a variant is kept when
its missing genotypes divided by all the individuals of the dataset,
every individual of the file until the filters of individuals of stage
3, are at most that number. A genotype is missing when any of its alleles is, so
`0/.` counts as missing (`js/popnei/src/variant.ts`). Functionality
section 3 words the filter the same way, a proportion at most a
threshold, so the label and popnei agree and nothing is converted.

The filter is on from the start, with a threshold of 0.1, plink's
default for `--geno`, the same filter on the same proportion, as the
owner decided on 25 September 2026 (functionality's open point 4), and
is shown with no file loaded too, since the filters belong to the
project and stay across loads. The field has a step of 0.01 and no
buttons; two decimals are what a threshold of missing data is set with.
Each press of an arrow key is a commit, and so a command and a step of
Undo, which is what a user who presses it five times has done. Turned
off, the field goes; turned on again, it has the default.

**A number the two fields do not take.** The owner decided on 25
September 2026 that a number field of this step never turns what was
typed into another number without a word. So a committed number outside
the range of its label, or with more decimals than its step, is refused:
it sends nothing, the field shows again the value it had, and a line
under the field says why, and what is kept:

| typed | the line under the field |
|---|---|
| 10 in the threshold | "10 is more than 1; the threshold stays 0.1." |
| 0.125, or 0.001, in the threshold | "0.125 has more than two decimals; the threshold stays 0.1." |
| 300 in the ploidy | "300 is more than 255; the ploidy stays 2." |
| 0 in the ploidy | "0 is less than 1; the ploidy stays 2." |
| 2.5 in the ploidy | "2.5 is not a whole number; the ploidy stays 2." |

The number kept is the value the field had, the last one it took. The
line is announced when it appears, through the function the shell gives
the screens, since the focus is then on the field, after Enter, or on
the next element, after the Tab key, and a screen reader would read the
line in neither place; it is also the field's description, read with it
when the focus comes back. It goes at the next commit of the field,
Enter, the Tab key or an arrow key, whatever the number committed, the
number kept among them, which changes nothing and which React Aria
therefore does not report; and when the value of the field changes
otherwise, by an Undo, a new load or the switch.

A number with more decimals than the step is refused and not rounded,
as a number outside the range is: rounded, 0.001 and 0.004 would become
0, a filter that keeps only the variants with every genotype called,
where the user had asked for one almost as strict and not that one.
Refused, the filter stays as it was, and the user types the number of
two decimals they mean. The option not taken was to round a half up,
0.125 to 0.13, and say so under the field, which would still make a
command, a step of Undo and a change of the results that the user did
not ask for. The decimals are counted on the number React Aria parsed,
so that 0.10 and 0.1 are one number, of one decimal; an arrow key moves
by the step and gives no number to refuse.

**A character the field does not take.** React Aria takes into the field
only what can start a number of its range, in English: digits and the
decimal point, and a minus sign where the range goes below 0, which
neither field's does. Any other character typed is thrown away, with no
word, so that 0,1 typed key by key shows as 01 and would be committed
as 1, and 2,0 in the ploidy as 20. So a character thrown away is caught
as it is typed, and a line under the field says so at once, and what is
kept:

| typed | the line under the field |
|---|---|
| 0,1 in the threshold | "Write the decimals with a point, 0.1 and not 0,1; the threshold stays 0.1." |
| a minus sign, or a letter, in the threshold | "‘-’ cannot be typed in the threshold, which is written with digits and a point, as 0.05; the threshold stays 0.1." |
| 2,0 in the ploidy | "Write the ploidy as a whole number, 4 and not 4,0; the ploidy stays 2." |
| a minus sign, or a letter, in the ploidy | "‘-’ cannot be typed in the ploidy, which is a whole number, as 4; the ploidy stays 2." |

The example of the comma is always 0.1 or 4, and the number kept the
value the field had. A comma anywhere in what was typed gives the line
of the comma, as when 0,05 is pasted into the field; otherwise the line
names the first character thrown away, between ‘ and ’, a space as "A space", with its
control characters escaped. The next commit of the field sends nothing,
whatever the field shows, since what it shows is not what was typed:
the field shows again the value it had, and the line stays until the
commit after it. A deletion in the field before that commit, the user
mending what they typed, lets the commit take the number again. The line
is announced as the line of a number refused is.

A field left empty sends nothing and shows again the value it had, with
no line, since nothing was typed that could be taken for another number;
the same holds for the ploidy, which then keeps its value for the next
pick. Off and on puts the filter last in the list of the
filters, which with one filter in stage 2 changes nothing; stage 3,
with several, decides it.

**A file dropped while a ploidy is being typed.** A file dropped from
the desktop leaves the focus in the ploidy, which has not committed
what is typed, so the drop commits it first, as Enter would, and a VCF
is read with the ploidy the user typed. When the field refuses that
number, 300, or a character was thrown away as it was typed, the VCF is
read with the ploidy kept, the one the field shows again, and the line
under the field says so, "300 is more than 255; the ploidy stays 2.",
as after Enter; the card then says "Read with ploidy 2, …", and no
button to read the file again appears, since the options are those it
was read with. The line is announced when it appears, before the read
starts, so the status region reads it first and the end of the read
after it, as the shell announces every read (`docs/specs/shell.md`,
"The status region").

## The states

The step is not an analysis: it runs nothing the user starts, and what
it waits for is the read of the file. Its states:

| state | what the user sees | what they can do |
|---|---|---|
| empty | cannot happen: with no file, the step offers the pick, which is the ready state | — |
| locked | cannot happen: nothing has to be done before a file is picked. A file picked before the calculation worker has started is read once it has | — |
| ready | no file: the zone, "Choose a variants file…", the options of a VCF, the filter. With an opened project file, the file it was made with, below | pick a file; set the options and the filter |
| running | the card with its name, format and size, "Reading panel.nei." and the seconds since the step saw the read start, which the step keeps and loses when it is left; no progress bar, since the read is of the header of a VCF, or the end of a `.nei` file, which popnei tells to nobody (`js/popnei/src/variant.ts`, `onProgress`) | pick another file, which replaces this one; Undo; set the filter |
| done | the card with the individuals, the ploidy of a `.nei` file, the number of variants once counted, how a VCF was read, and the warnings below | replace the file; set the filter |
| results removed | cannot happen here: the step shows no result. A command of this step that removes results, a new file or a changed filter, has its notice in the shell (`docs/specs/shell.md`), with the descriptions below | — |
| error | the card with the reason the file was not read, below | what the reason says: pick a file, or, when the calculations could not start or the page is out of date, reload the page |

A read that takes long cannot be cancelled with a button. Picking
another file, or Undo, replaces the load. The calculation worker is
started again for the next load, and starting it again ends the read of
the old one (`docs/architecture.md`, section 5).

## What it sends and reads

It reads `project.variants`, `project.filters` and `project.reference`
of the state of the store, and `variantsStepNeeds` of the project, the
function of core that gives, in the words of this step, the reason of a
variants file being read or not read. It sends:

| action | command | description |
|---|---|---|
| a file picked or dropped | `loadVariants(p, { fileId, name, size, format, readOptions })`, `readOptions` `{ ploidy, onlyPassed }` for a VCF and `null` for a `.nei` file | "a new variants file was loaded" |
| Read ‹name› again | `loadVariants` of the same `File` under a new load id, with the options of the step | "the variants file was read again with other options" |
| a threshold committed, on Enter or when the field loses the focus | `setVariantFilter(p, { kind: "missing_data", maxAllowedMissingRate })` | "the missing data filter changed" |
| the switch turned off | `removeVariantFilter(p, "missing_data")` | "the missing data filter was turned off" |
| the switch turned on | `setVariantFilter(p, { kind: "missing_data", maxAllowedMissingRate: 0.1 })` | "the missing data filter was turned on" |

Before the command of a pick, or of a read again, which passes the
`File` of the load there, which `fileOf(fileId)` of `src/ui/files.tsx`
gives from the page's map of files, the step calls `addFile(file)` of
`src/ui/files.tsx`, which makes the load id and puts the `File` into the
map of the worker client under it (`docs/specs/entry.md`, "At the
opening"); the entry of the page then asks the
calculation worker to open it, and the store records what it read
(`docs/architecture.md`, section 6, "Who asks for a read"). The step
does not read the file and holds nothing of the project.

## Its words

The descriptions of the commands are in the table above. The rest:

- **A file of another name**: "panel.txt was not loaded: the Variants
  step reads a VCF, whose name ends in .vcf, .vcf.gz or .vcf.bgz, or a
  .nei file. If it is one of them, rename it." It, "Load one variants
  file at a time." and the words of a drop or a paste that holds no
  file, above, stay until the next pick, or until an Undo, a Redo or an
  opening changes the variants file of the project or the file an opened
  project was made with, so that they are never shown beside the words
  of another file; they are the screen's, not the project's.
- **Reading**: "Reading panel.nei.", the reason `variantsStepNeeds`
  gives.
- **A file popnei refused**: the reason `variantsStepNeeds` of
  `src/core/project.ts` gives, shown whole, "popnei could not read
  bad.vcf: the source is not a VCF: it starts with `This is a line o`.
  Choose another file." It is the reason every analysis shows beside its
  Run button, the one `projectNeeds` gives, with another end: beside a
  Run button the words send the user to the Variants step, and in this
  step, beside the button "Replace bad.vcf…", they say what to do with
  that button, as the owner decided on 25 September 2026
  (`docs/specs/core/project.md`, "What an analysis needs of every
  project"). The message quoted is popnei's for `e2e/fixtures/bad.vcf`,
  seen under node on 25 September 2026.
- **A file the browser can no longer read**, changed, moved or deleted
  on the disk after it was picked, which the worker answers
  `reopenFailed`: "panel.nei could not be read; it may have changed on
  the disk since it was picked. Choose it again.", the words the owner
  decided on 25 September 2026 (point B of
  `docs/specs/stage-2-open-points.md`) with the end of this step. The
  same file changed after it was read shows at the next calculation, in
  the words of the panel (`docs/specs/analyses/diversity.md`, "Its
  words").
- **A file whose read stopped because the calculation worker failed**:
  "panel.nei could not be read: the calculation stopped unexpectedly.
  Choose it again."; when the calculations could not start, or the page
  is out of date, "… Reload the page and choose it again.". What
  happened is said in the words of `docs/specs/core/project.md`, Open
  4.
- **The line under the ploidy**, and the button that reads the VCF
  again, above.

### A project file opened

A project file keeps the settings and not the variants file, which a
browser cannot open by itself, so an opened project has no variants file
and holds what its file said of the one it was made with, its
`reference` (`docs/specs/core/project.md`, "The project of an opened
project file"). The step shows, above the zone, the text of
`askedFileText` of `src/core/projectFile.ts`, and the options of a VCF
start at the reference's, above. The words, and what is left out when
the project was saved before its file was read or counted, are
`docs/specs/core/projectFile.md`'s.

Once a file is given, the step shows beside its card the warning
`identityWarning` of the same module gives, a warning and not a refusal,
after the word "Warning:". What it compares, and its words, are
`docs/specs/core/projectFile.md`'s ("The comparisons after an
opening"); it is made again at every change, so it is complete once the
file is read. Of the read options, the choice of the passed variants is
compared there, and the ploidy with the individuals once the file is
read, as the owner decided on 25 September 2026: a VCF read with the
other choice gives other variants, as another ploidy gives other
genotypes. The numbers of a run on a VCF read with other options than
the reference's are not compared with those of the project file, and
the panel of each analysis says so under its result, with
`uncomparedText` of the same module.

A Save writes the options of the project, not those of the step
(`docs/specs/core/projectFile.md`, "What is written of each part"): a
ploidy typed and not applied is not saved, and once "Read panel.vcf.gz
again with ploidy 4" is pressed, a Save before that read ends writes
ploidy 4.

## Accessibility

- The keyboard goes through the step in this order: the zone's hidden
  button that takes a pasted file, the file button, the ploidy, the checkbox of the passed variants, the button that reads the
  VCF again when it is there, the switch of the filter, its threshold.
  When that button goes, after it was pressed, the focus moves to the
  file button, which is in every state. A warning or an error sits in the order of the text
  beside what it is about, and is text, "Warning:", as well as its colour
  and its icon (WCAG 2.2, success criterion 1.4.1).
- The drop zone is in a region labelled "Variants file", the section of
  the file, with that heading, which holds the zone and the message of a
  file not loaded; the button in the zone is the way to pick without
  dragging (2.1.1).
- The messages of a file not loaded, and the line of a number a field
  refused, are announced when they appear, through the function the
  shell gives the screens (`docs/specs/shell.md`, "The status region"), since the focus stays
  on the button and a screen reader would not read them.
- The line of a number a field refused, or of a character it threw
  away, is the first part of the field's description, which a screen
  reader reads after the label when the focus comes to the field; the
  line under the ploidy, 190 characters long, comes after it, so that
  the user hears why their number was not taken before the advice on
  the ploidy.
- The read may take long on a slow disk, a time not yet measured, and
  the user may be on another step when it ends. So its end is announced by
  the shell, from the state of the store, and not by this step, which may
  not be on the screen: through its status region, the part of the page
  that a screen reader reads out when its text changes, without moving
  the focus, the element the keyboard acts on (4.1.3), with the words of
  `docs/specs/shell.md`, "The status region".
- The warning of a reopened project that differs from its file is
  announced by the shell, from the state of the store, when it appears
  or comes with another load, with the words of `docs/specs/shell.md`,
  "The status region": so it is heard also when an Undo or a Redo on
  another step brings it back, and when a second file that differs
  replaces the first; not again when the read of its load makes it
  longer.

## How it is checked

In the Playwright flow of stage 2 (`.claude/skills/coding/testing.md`),
in the three engines: `panel.nei` picked with the button, and then a
file dropped, with the focus still on the button after each;
`tetraploid.vcf.gz` loaded with ploidy 2, the card showing 12
individuals and "Read with ploidy 2, …", the diversity panel showing its words for the
wrong ploidy, then the ploidy set to 4, the button "Read
tetraploid.vcf.gz again with ploidy 4" pressed, the card showing "Read
with ploidy 4, …" and no line "Ploidy 4", and the diversity run; the
button's words with both options changed; `bad.vcf` and its reason,
ending "Choose another file."; a file named `panel.txt` and its message;
a piece of text dropped, and its message, and a piece of text pasted
into the zone's button, and the same message; 10 and 0.125 typed in the
threshold, and 300, 0 and 2.5 in the ploidy, each with its line, the
value kept and the line announced; 0,1 and 0,2 typed key by key in the
threshold, and 2,0 in the ploidy, each with the line of the comma and
the value kept; the value kept typed back, and an arrow key at a bound,
each taking the line away; tetraploid.vcf.gz dropped with 300 typed
in the ploidy and not committed, read with ploidy 2 and the line of
300 shown and announced; and the text of the status region
after each read. A script cannot put a folder into a drop, so the flow
drops a file whose entry of the file system says it is a folder, which
is what React Aria asks of each item; the function that tells what a
drop held is checked in node as well. The axe check of each state.

## Left for the running application

Where the options of a VCF sit beside the zone, whether the card and the
filter are side by side or one above the other, the format of the size,
and the icons.

## What this spec relies on in the other specs of stage 2

Each was approved by the owner on 25 September 2026, and says what is listed here.

- `docs/specs/shell.md`: the step is drawn in its `<main>` with one
  `<h1>`, "Variants"; the shell writes the notice from the description
  of a command, and the notice of a new load says the calculations it
  stopped; it announces the ends of the reads from the state, and gives
  the steps `announce` for what they announce themselves.
- `docs/specs/entry.md`: the first project of the population genetics
  application, `firstProject("popgen")` of `src/core/apps.ts`, holds the
  missing data filter at 0.1, since `emptyProject` of core holds no
  filter; `addFile(file)` of `src/ui/files.tsx`, called before the
  command, and `fileOf(fileId)` of the same file, the `File` of a load of
  this page or `null`, for the button that reads a VCF again; and after
  every change the entry asks for the read of a
  pending source, and records a refusal of popnei at the open as `{ kind:
  "popnei", message }`.
- `docs/specs/worker/client.md`: the calculation worker started again for
  a new load, which ends a read of the old one still under way.
- `docs/specs/worker/runner.md`, `docs/specs/analyses/diversity.md` and
  `docs/specs/entry.md`: the open of the file gives the individuals and
  the ploidy; the number of variants recorded, through `numVarsOf` of
  `apps.ts` and `numVarsRead` of the diversity's result, is the variants
  of the file before the filters of the application, `varsProcessed` of
  the first filter of the pass or its `numVars` when it has none.
- `docs/specs/analyses/diversity.md`: a refusal of popnei in the pass is
  its error state, with a row of its own for a genotype of another
  ploidy.
- `docs/specs/core/projectFile.md`: an opened project has `variants:
  null` and its `reference`; `askedFileText` and `identityWarning` give
  the words shown above, and the read options of a VCF start at the
  reference's.

## Open points

The open points of the eleven specs of stage 2 are gathered in
`docs/specs/stage-2-open-points.md`. The two this spec had were decided
by the owner on 25 September 2026, and are written above as decided:
the button that reads a VCF again with other options, in stage 2 (point
M there), and the missing data filter on at 0.1 (point N).

## Not in this spec

- The other filters of the variants, the filters of the individuals,
  what each filter of a pass was given and kept, the chromosomes, the
  histograms per variant and per individual, and writing the filtered
  variants as a VCF or a `.nei` file: stage 3, in this spec.
- The notice, its words and its Undo; the stepper and the summary line:
  `docs/specs/shell.md`.
- What the worker does with the file: `docs/specs/worker/runner.md`.
- The project file and the check numbers: `docs/specs/core/projectFile.md`.
- The help drawer, in stage 8 (`docs/build-order.md`), with the help of
  this step: what the step reads, a VCF or a `.nei` file; that a VCF's
  ploidy is given and not read, with what a wrong one gives; that only
  the variants with PASS or `.` in the FILTER column are read by
  default, a `.` saying that no filter was applied to that variant; the
  missing data filter: a genotype is missing when any of its alleles is,
  `0/.` among them, and the proportion is over all the individuals of
  the file, so that 0.1 keeps a variant with at most 10% of its
  genotypes missing, 0 keeps only the variants with every genotype
  called and 1 keeps them all; that the file is read from the disk at
  every analysis, and not copied into the browser, so a file of any size
  opens, a large gzipped VCF is slow to read at each analysis, and a
  file changed on the disk after it was picked has to be loaded again,
  since the application may not notice the change, and results
  calculated after it may be of the new file
  (`docs/specs/stage-2-open-points.md`, point R); and, for those who
  work in Python, the code that does the same: `popnei.open_vcf(path, ploidy=2, only_passed=True)` or
  `popnei.open_vars(path)`, then `variants.filter_by_missing_data(0.1)`.
  Until then nothing on the screen says these things.
