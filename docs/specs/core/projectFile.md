# The project file

Written on 25 September 2026, and approved by the owner the same day;
its example revised the same day for the line of a character not
decoded that the read of the metadata file gained
(`docs/specs/worker/protocol.md`, `CsvFound`), and again that day for
three decisions of the owner on the reviews of
`docs/plans/walking-skeleton.md`: a Save while a VCF is read again with
other options writes the options the user set; the choice of the passed
variants of a VCF is compared, with a line when the numbers are not; and
check numbers of the wrong count are refused at the opening; and on 26
September 2026 for the owner's decisions at stop 9.6 of that plan, points
1 to 3 of the review of its work package 9: the line of numbers not
compared for a file of the other format, the size compared only within a
format, and the words of the file asked for after an opening; and on 26
September 2026 for stage 3, the Variants step whole, as the revision of
`docs/architecture.md` the owner approved that day has it: every filter
of the variants and of the individuals, the filters of the variants in a
fixed order that the opening checks, and the version of the format,
which stays 1 until the first release of the application, the regions
of a BED file included, as the owner decided on 26 September 2026;
this revision is approved by the owner on 26 September 2026. Revised on
27 September 2026 for stage 4, the Individuals step whole: the grouping of one population and the types the user set,
written in version 1, and a project with no metadata file, whose
diversity has the check numbers of one population
(`docs/specs/core/project.md`, "The populations" and "The types of the
columns"); and again the same day, to agree with the specs written
beside it: what the values of each column allow is worked out from the
table and not written; and again after its review, the same day: an
individuals file whose read was not done at the save is written as
named and not read, `notGiven`, and the project opened from it asks for
the file again rather than run on one population; and after the
review of the architecture, the same day: the types the user set
written whole, those a read does not apply among them, and the project
files of stages 2 and 3 that wrote a metadata file not read as none.
Revised on 28 September 2026 for the owner's decision that day that the
LD filter of the variants starts with no distance: a filter saved before
its distance was typed is written with `"maxDist": null`, in version 1;
and again that day for the owner's decision that the LD filter keeps its
values while it is off: the filters turned off are written, with their
values, in `filtersOff` and `individualFiltersOff`, in version 1, and a
file saved without them opens with nothing kept. The revisions for stage 4 are approved by the owner on 28 September 2026. Revised on 30 September 2026 for stage 5, the analyses of the
populations: the options of the diversity, of the distances between
populations and of the LD decay, which their panels set, written in
version 1; the diversity's key version 3 with its check numbers as they
were; the check numbers of the two new analyses; and a fixture of a
project with the options of all three (`docs/specs/analyses/diversity.md`,
`popDists.md` and `ldDecay.md`). Approved by the owner on 30 September 2026.
Revised on 7 October 2026 for the thresholds of popgen2.html as filters
of the project (`docs/designs/stats-filters.md`, approved by the owner
that day): the filter of the FILTER column, `{ "kind": "passed" }`,
written in version 1 as any filter, and a file that holds it, on or
off, refused by `popgen.html`, which has no box to show it, with words
that say the file was made by the new page. Revised again that day, when
the read of the variants file gained `keepsPassed`, whether its variants
record their FILTER (`docs/specs/core/project.md`, "The filters of
popgen2.html"): the file does not write it, the reading gives it from
the format, the identity does not compare it, and the fingerprints are
made with it. Revised on 8 October 2026 after the review of that work:
each check of an opened file keeps two fingerprints, for a file whose
variants record their FILTER and for one whose do not, and a comparison
takes the one of the variants file it is made for; the file is the same.
There was no
code yet; it will be `src/core/projectFile.ts`, the row `projectFile.ts`
of section 9 of `docs/architecture.md`. The project file is the file
`<name>.popnei.json` that a user saves to take their work out of the
browser and open it again later, on another day or another computer
(`docs/functionality.md`, section 9). This module writes it from the
project and the results on screen, reads it back into a project, and
gives the words of the two comparisons a reopened project makes: of the
variants file given with the one the project was made with, and of the
numbers of a new run with the numbers saved. It develops section 9 of
`docs/functionality.md` and sections 2, 8 and 12 of the architecture, and
depends on `docs/specs/core/project.md`, `keys.md`, `store.md`,
`history.md`, and on `docs/specs/worker/protocol.md` for the filters and
the table it writes. The owner decided on 25
September 2026 that stage 2 of `docs/build-order.md`, the walking
skeleton, the smallest application that goes through every part once,
has the project file in its full first version, where the build order
had put it in stage 6; so the check numbers of the diversity are in it
from the start.

The terms this spec uses, from those specs:

- **The load id**: the random name, 32 hexadecimal digits, that the page
  gives each pick of a file, new at every pick; the project names a file
  by it, and the page keeps the file itself under it
  (`docs/architecture.md`, section 3).
- **The identity of the variants file**: its name, size, format, list of
  individuals, ploidy and number of variants. It is in no key, and serves
  only to tell a reopened project which file it was made with.
- **The check numbers**: a few numbers of each result that was run, which
  the `checkNumbers` of its analysis gives, saved to check a new run
  against and never shown as results (`docs/specs/core/store.md`).
- **The key version** of an analysis: a number its module raises when it
  calculates the same inputs in another way.
- **The fingerprint of the settings** of an analysis: a hash of the
  filters, the read options of the variants file and what its key holds
  of the project, but not the load id, the version of popnei or the key
  version (`docs/specs/core/keys.md`).
- **The reference**: the part of a project that says, after a project
  file was opened, what the file said of its variants file and of the
  check numbers, each with the fingerprint of the settings they were made
  with (`docs/specs/core/project.md`, `Reference`).

## What it does

A user sees the project file work when they save, close the tab, open the
file a week later, give the variants file again, run, and read that the
numbers are the same as before. They see it fail in three ways, none of
which they could detect: a file that does not open again, in this version
or a later one; a file that opens with a setting other than the one saved,
a threshold or a type of a column; and a comparison that says "the same"
or "not the same" wrongly, because the numbers it compares were made with
other settings, another file or another version of popnei.

### What the file holds

One JSON object, whose fields are, in this order: the header; the
project, every field of `Project` but `app` and `reference`; and the
check numbers. A project of the walking skeleton with a `.nei` file, the
missing data filter, a CSV individuals file and the diversity run is
written as below, the rows of the table shortened here to two:

```json
{
  "format": "popnei_web project",
  "formatVersion": 1,
  "app": "popgen",
  "appVersion": "0.1.0",
  "popneiVersion": "0.1.0",
  "saved": "2026-09-25T14:03:11.000Z",
  "variants": {
    "fileId": "00112233445566778899aabbccddeeff",
    "name": "panel.nei",
    "size": 52428800,
    "format": "nei",
    "readOptions": null,
    "read": {
      "kind": "read",
      "individuals": ["ind_001", "ind_002"],
      "ploidy": 2,
      "numVars": 1203554
    }
  },
  "filters": [
    {
      "kind": "missing_data",
      "maxAllowedMissingRate": 0.1
    }
  ],
  "filtersOff": [],
  "individualFilters": [],
  "individualFiltersOff": [],
  "individuals": {
    "fileId": "ffeeddccbbaa99887766554433221100",
    "name": "pops.csv",
    "csv": {
      "encoding": "auto",
      "separator": "auto",
      "decimal": "auto"
    },
    "typesSet": [
      [
        "pop",
        {
          "kind": "categorical"
        }
      ]
    ],
    "read": {
      "kind": "read",
      "table": {
        "columns": ["id", "pop"],
        "rows": [
          ["ind_001", "north"],
          ["ind_002", "south"]
        ]
      },
      "columns": [
        {
          "kind": "identifier"
        },
        {
          "kind": "categorical"
        }
      ],
      "found": {
        "encoding": "utf-8",
        "separator": ",",
        "decimal": ".",
        "undecodedLine": null
      }
    }
  },
  "grouping": {
    "kind": "populations",
    "column": "pop"
  },
  "analyses": [],
  "checks": [
    {
      "analysis": "diversity",
      "numbers": [1150112, 0.3120051, 0.3089214, 0.9124, 0.2987112, 0.2954871, 0.8977],
      "keyVersion": 1,
      "popneiVersion": "0.1.0",
      "appVersion": "0.1.0"
    }
  ]
}
```

- **The header** is the first six fields. `format` is always the text
  `"popnei_web project"`, which tells a project file from any other JSON
  file. `formatVersion` is the version of the format, `FORMAT_VERSION` of
  `project.ts`, 1. `app` is the application, `"popgen"` or `"gwas"`.
  `appVersion` is the version of the application that saved the file, the
  number in `package.json` that the build writes into the page, "0.1.0"
  in stage 2, raised by hand at a release that changes what the
  application calculates or saves, as the owner decided on 25 September
  2026 (`docs/specs/entry.md`). `popneiVersion` is the version of popnei
  that the calculation worker gave, `version()` of popnei, or `null` when
  it had not given one yet, in the first second or so after the page
  opened, or because the worker could not start. `version()` gives
  "0.1.0" in popnei's releases `js-v0.1.0-dev.1` and `js-v0.1.0-dev.2`
  alike, so the file tells them apart only once popnei raises it with each
  release, which the owner agreed popnei does and which is asked of it
  (`docs/specs/stage-2-open-points.md`, "What is asked of popnei"). `saved` is the date and time of the save, in UTC,
  as `new Date().toISOString()` writes it on the page, since core reads no
  clock (`.claude/skills/coding/SKILL.md`, "The core").
- **The project** is written as the project holds it, with the field
  names and the values of `docs/specs/core/project.md`: the read options
  of a VCF in `variants`; the filters in their order; the individuals
  table whole, with the type of each column, which the user can set from
  stage 4, and the types the user set, `typesSet`; the grouping, `{ "kind": "onePopulation" }`
  among its values from stage 4; the options of
  each analysis, whole, the defaults filled in. In the example the reader
  inferred `pop`, a column of two values, as binary, and the user set it
  categorical, as a column of populations. What the values of each
  column allow is not written: core works it out from the table
  (`docs/specs/core/project.md`, `columnAllows`). Some parts are written
  otherwise, in the table below: the variants file when none is loaded or
  its read is not done, the individuals file when its read is not done,
  and the reference, which is not written as such.
- **The check numbers** are one entry per analysis that has numbers to
  save, in the order of the analyses of the application: its id, its
  numbers, its key version when it was run, and the versions of popnei and
  of the application that calculated them, as the owner decided on 25
  September 2026, so that a file that holds numbers of two sessions names
  the right versions for each (point E of
  `docs/specs/stage-2-open-points.md`, the option A of this spec's draft).
  A number that popnei gave as NaN is `null`, as `checkNumbers` gives it.

The owner decided the same day that every file the application writes
records the version of popnei and the version of the application: the
project file, with each check number as above; the report, when it comes
in stage 6; and a CSV download stays a plain table, the two versions
shown on the page beside the button that downloads it
(`docs/specs/analyses/diversity.md`, "What it shows").

Which numbers an analysis saves is its own spec's. For the walking
skeleton that is the diversity's (`docs/specs/analyses/diversity.md`,
"The check numbers"); this spec takes them as a list of numbers and
`null`s whose length and order the diversity fixes. The owner decided on
25 September 2026 that they are the number of variants the filters
kept, then, for each population in the order of its result, the
unbiased expected heterozygosity, the observed heterozygosity and the
proportion of polymorphic variants: 1 + 3 × the populations, 7 numbers
for the two populations of the example. Section 9 of
`docs/functionality.md`, which named the expected heterozygosity alone,
is corrected to name them.

From stage 3 the project holds every filter of
`docs/functionality.md`, section 3, but the regions of a BED file: the
filters of the variants by missing data, observed heterozygosity, the
major allele frequency and linkage disequilibrium, in that fixed order, and the four filters of individuals, the
lists and the thresholds, in theirs (`docs/specs/core/project.md`). A
filter is written as the project holds it, a threshold as the number the
user typed, and the LD filter whose distance the user has not typed yet
with `"maxDist": null`, which opens into the same filter and the same
lock (`variantFilterNeeds` of `docs/specs/core/project.md`). The filters
the user turned off are written apart, each with its values, in
`filtersOff` and `individualFiltersOff`, so that a project opened
again gives them back when a switch is turned on
(`docs/specs/core/project.md`, "The filters turned off"); no check
number depends on them. What the filters make is not written, since each is a
result or is made from one: the list of the individuals the thresholds
keep, the statistics of each individual, the histograms and the counts
of the filters; of those, as of any analysis `done`, only the check
numbers its `checkNumbers` gives. Nor is a file of the filtered
variants, which is the user's once saved. A project opened with a
threshold on the individuals knows its list again once the statistics
are calculated for the new load (`docs/specs/core/store.md`, "The
individuals kept").

The options of the analyses are written only for an analysis whose
options the user set. No screen of stage 2 sets one, the diversity's
two options keep their defaults (`docs/specs/analyses/diversity.md`,
"What it does"), so a project of stage 2 writes `"analyses": []`, as the
example does. From stage 5 the panels of the diversity, of the
distances between populations and of the LD decay have fields for their
options, and a project whose user set one writes that analysis's
options, all of its fields, the others at their defaults.

### What is written of each part

| part of the project | what the file holds |
|---|---|
| `variants`, a file loaded and read | the source as it is, its load id included, but `keepsPassed` of its read, which no file holds (`docs/specs/core/project.md`, "The validation") and the reading gives as `true` for a VCF and `false` for a `.nei` file |
| `variants`, a file loaded whose read is pending or failed, and a reference whose identity it does not differ from and whose read options are its own | the reference's `variants`, which knows more of the same file |
| `variants` null, a reference | the reference's `variants`, so that a project opened and saved again before its file is given still names the file it was made with |
| `variants` null, no reference | `null` |
| whichever `variants` is written, when its read is pending or failed | that source with its read `{ "kind": "pending" }`: the name, the size, the format and the read options are known, and the rest is not |
| `individuals` read | the source as it is, its load id, its table and its whole `typesSet` included, the types the read does not apply among them |
| `individuals` pending, failed, or `notGiven` | the source with its read `{ "kind": "notGiven" }`: its load id, its name, the options of its CSV and its `typesSet`, and no table |
| `individuals` null | `null`, whatever the grouping: the analyses per population run on one population, and the grouping is kept for a file loaded later |
| `reference` | not written as such: its `variants` as above, and its check numbers under the rule below |

The read options decide between the two, as the owner decided on 25
September 2026 (point 9 of the reviews of work packages 2 to 6 of
`docs/plans/walking-skeleton.md`): a Save writes the settings as the
user set them. Suppose a user opens a project made with a VCF read with
ploidy 2, gives the same VCF again, sets the ploidy to 4, presses "Read
panel.vcf.gz again with ploidy 4", and saves before that read ends. The
file loaded is then pending with ploidy 4, and it is the one written,
with ploidy 4, and not the reference's with ploidy 2. Its read is
written pending, as the next row says, and not as the reference's read:
that read, its individuals, its ploidy and its number of variants, was
made with the other options, and a ploidy of 2 in the read beside a
ploidy of 4 in the options would give, once the file is given again, the
warning that its ploidy differs. The reference's check numbers are not
saved (rule 2 below): the fingerprint now is made with ploidy 4, the
read options of the file loaded, and the reference's was made with
ploidy 2. So the file holds ploidy 4, a read pending and no check
numbers from the reads with ploidy 2; opened again, it asks for
panel.vcf.gz, the Variants step starts at ploidy 4, and a run on the
file gives numbers to save and none to compare. The same holds of the
choice of the passed variants, which the identity compares (below). A
ploidy typed in the Variants step and not yet applied with that button
is the step's and not the project's (`docs/specs/steps/variants.md`), so
a Save before it writes the file as it was read.

`typesSet` is written whole, the types that the read does not apply
among them, which wait for a read that allows them
(`docs/specs/core/project.md`, "The types of the columns"). Which types
the read does not apply, `typesLost`, is not written, since it is worked
out from `typesSet` and the table; so an opened project names the same
ones as the project that was saved, and the Individuals step shows them
in words that do not say the file was just read. The first draft of
this revision kept `typesLost` in the read and left it out of the file,
so an opened project named none.

The failed read of the variants file is written as pending because what
failed was a read of that session: a new load of the file reads it again,
and the reason of a crash would be noise in a file kept for years. The
individuals file is kept whole, as its table, and a pending or failed
read has no table, so it is written as a file named and not read,
`notGiven`. The project opened from it keeps asking for the file: every
analysis that uses it is locked with "pops.csv was not read when this
project was saved, so the project file does not hold it. Load pops.csv
again in the Individuals step.", whatever the grouping, until the user
loads the file again, when the grouping finds its column by its name and
the types set are carried to the new read, or removes it
(`docs/specs/core/project.md`, "The project of an opened project file").
A new load starts the options of the CSV at "auto" again, as every pick
does. This was decided on 27 September 2026 by the writers of the specs
of stage 4, for the owner to overrule. The option not taken, the first
draft of this revision, wrote such a file as `null`: the opened project
had no metadata file, and its analyses per population ran on one
population, "All individuals", although its grouping named a column,
with no word of the file the user had loaded.

The code of stages 2 and 3 writes that `null` still, so a project file
it saved while its metadata file was being read, or after the file was
refused, opens in stage 4 with no metadata file and runs its analyses
per population on one population, although its grouping names a column.
That is accepted: in those stages the file was required, such a project
file was saved by a development build before any release, and the user
sees the Individuals step with no file and the line "No metadata file:
every individual is in one population.", and loads the file again. A
project file of those stages whose metadata file was read opens with it,
as any other.

This is what `docs/specs/core/project.md`, "The cases", left to this
spec: an opened project holds no source whose read is pending. So the
entry of the page, the code that starts when the page opens, makes the
store and the workers and joins them, and asks for the read of every
pending source after each change (`docs/architecture.md`, section 6, "Who
asks for a read"), never asks for the read of a file the page does not
hold.

**The check numbers**, for each analysis of the application, decided by
the owner with the architecture on 24 September 2026
(`docs/architecture.md`, section 8):

1. When the analysis is `done` in the state of the store, the numbers of
   that result, which is the one under the key of the current project,
   with the analysis's key version now, the version of popnei now and
   the version of the application now.
2. Otherwise, the check of the reference for that analysis, with the
   versions it holds, when the fingerprint of its settings now is the one
   the reference kept, and the variants file loaded, if there is one, does
   not differ from the reference's in its identity (below). So an
   analysis whose options changed does not carry the numbers of other
   options, and the numbers of the old file are not saved beside a new
   file, where they would read as the numbers of a run on the new file.
3. Otherwise, none.

The architecture's "none when the variant file the user gave differs"
is read as holding of the carried numbers alone: numbers of rule 1 were
made from the file loaded, and are saved with it. Decided here, not by
the owner. A file whose name alone differs, `panel (1).nei`, which a
browser makes of a second download, differs in its identity, so a save
before a run drops the reference's numbers; the name is kept in the
comparison, since section 9 of `docs/functionality.md` names it.

The fingerprint now is made for the variants file loaded, or for the
reference's when none is: its read options, and its `keepsPassed`, which
also picks the fingerprint of the reference it is compared with,
`settingsAsSaved` of `docs/specs/core/keys.md`.

**Never written**: the `File` of either file, which is not JSON and stays
in the page; the results and their warnings, of which only the check
numbers are kept; the keys and the fingerprints, which are made again
from the settings when the file is opened, so that a change to how keys
are made costs no project file (`docs/architecture.md`, section 12); the
history of undo, the cache, the failures kept, the calculations in flight
and the notice.

**The load ids are written**, of both files, since the project's types
hold them and every value in the file is one the validation of
`docs/specs/core/project.md` checks. They name no file in the session
that opens the project: an id is 16 random bytes, so that the id of an
earlier session cannot name a load of this one (`docs/architecture.md`,
section 3). In the session that saved the file, the ids can still name
files the page holds; that does no harm, since the reference is in no key
and the individuals file enters the keys by its table. The option not
taken was to write no id and make new ones when the file is opened, which
core cannot do, since it makes no random number, and which gains nothing.

### Writing

The same state gives the same text, byte for byte, so that two saves of
one project can be compared with `diff`, and the tests can hold a file as
a literal.

- Every object is written with its fields in the order of its type in
  `docs/specs/core/project.md` and of the table above, whatever order its
  fields were set in, since two equal projects can hold their fields in
  different orders. The fields of the options of an analysis, a JSON
  object whose fields no type fixes, are written sorted by their UTF-16
  code units, as the canonical form of the keys sorts them
  (`docs/specs/core/keys.md`). The writer builds the text from the
  fields and their values, and not by making a sorted copy of the object,
  which would lose a field named `__proto__`, a name the JSON of a file
  can hold.
- Two spaces of indentation and one field per line; a list whose items
  are all texts, numbers, booleans or `null` on one line, with a comma and
  a space between items, so that each row of the individuals table is a
  line of its own; `[]` and `{}` for empty ones; lines ending in LF, and a
  last line break. Texts, numbers and escapes as `JSON.stringify` writes
  them: letters outside ASCII as they are, in UTF-8, with no byte order
  mark.
- A number is written with the shortest text that reads back as the same
  float, as `JSON.stringify` does in every browser, so a check number is
  read back exactly, and the exact comparison of the store holds
  (`docs/specs/core/store.md`, "The comparison with the check numbers").
  A negative zero is written as `0` and read back as `0`, which the
  comparison, made with `===`, takes as equal. A check number that is NaN
  or an infinity is a defect of the analysis's `checkNumbers`, which gives
  `null` for a NaN: `writeProjectFile` throws it, rather than write the
  `null` that `JSON.stringify` would make of it and that would then
  compare as different. Any other number of the file that is not finite
  is a defect too, and throws: the project holds none
  (`docs/specs/core/project.md`), so one would be a bug of a command.
- An analysis `done` while the state has no version of popnei is a
  defect, and `writeProjectFile` throws it: a result has a key only once
  the calculation worker has given its version, so the check would have
  no version of popnei to be saved with.

`projectFileName` gives the name the dialog of Save proposes in its field, which the user can change (`docs/specs/shell.md`, "Saving"): the name of the
variants file without its extension, `.nei`, `.vcf` or `.vcf.gz`, with
`.popnei.json`, so `panel_2026.nei` gives `panel_2026.popnei.json`; the
reference's variants file when none is loaded; or `project.popnei.json`
when there is neither. The extension is removed whatever its case, since
a file can come from a system that writes it in capitals: `PANEL.NEI`
gives `PANEL.popnei.json` and `a.vcf.GZ` gives `a.popnei.json`. A name
that is only an extension, `.nei`, gives `project.popnei.json`, and not a
name that starts with a dot, which some systems hide. Any other
extension is kept: `data.bcf` gives `data.bcf.popnei.json`.

### Opening

An opening starts a new history, which an undo does not go back through
(`docs/specs/core/history.md`, decided by the owner on 24 September
2026), so the shell asks before it opens a file, with the words and at
the moments of `docs/specs/shell.md`, "Opening". `readProjectFile` takes
the text of the file and gives
the project, or the first reason it cannot. It checks, in this order, so
that the reason given is the one the user can act on:

1. **A byte order mark** at the start is removed. `File.text()`, with
   which the shell reads the file, already removes it; the step is for
   any other caller, since core takes any text and `JSON.parse` refuses a
   text that starts with one. A text that `JSON.parse` refuses, a file cut
   short among them, is refused as `notJson`.
2. **A JSON value that is not an object with `format` equal to
   `"popnei_web project"`** is refused as `notProjectFile`.
3. **The version of the format** must be a whole number of at least 1, or
   it is refused as `header`. A version above `FORMAT_VERSION` is refused
   as `newerFormat` before anything else is read, since the rest of a
   newer file may be anything.
4. **The application**, read here by `readProjectFile`: a value other than
   `"popgen"` or `"gwas"` is refused as `header`; a file of the other
   application as `{ kind: "project", error: { kind: "otherApp" } }`, with
   the text of `parseProject`, before the rest, so that a user who opened
   a file in the wrong application is told to open it there and not that
   it is damaged.
5. **The fields of the top**: exactly those of the example. A field this
   version does not write is refused as `unknownField`, as
   `docs/specs/core/project.md` refuses one inside the project, and a
   field missing as `missingField`, both with the name of the field.
   `appVersion` and `saved` must be texts, and `popneiVersion` a text or
   `null`, or they are refused as `header`. `filtersOff` and
   `individualFiltersOff` may be missing, in a file saved before 28
   September 2026, when the filters turned off were first kept, and
   `parseProject` then reads each as empty.
6. **The checks, before the project**: `checks` must be a list of
   objects, none with a field `settings`, which this version never writes;
   and it must be empty when `variants` is `null`, since no result is made
   without a variants file. Each is refused as `header`, with the field
   `checks`. This comes first because the next step adds a `settings` to
   each check, which would hide one the file had.
7. **The project**, through `parseProject` of `docs/specs/core/project.md`,
   once, with the application, the version of the format of the file and
   the analyses of the application: every check of its section "The
   validation", with its errors and their texts, the fixed order of the
   filters of the variants among them, which a file of version 1 meets
   as well: a file whose filters of the variants are in another order is
   refused as `filterOutOfOrder`, since the application no longer applies
   an order of the user's, and no file the application wrote is refused
   so, since stage 2 wrote the missing data filter alone
   (`docs/architecture.md`, section 2); such a file is one edited by
   hand, and the owner decided on 26 September 2026 that it is refused and
   not reordered ("Open points", below). `readProjectFile` gives
   it this object, built from the fields of the file:

   ```ts
   { app, variants: null, filters, filtersOff, individualFilters, individualFiltersOff,
     individuals, grouping, analyses,     // filtersOff and individualFiltersOff only when the file has them
     reference: variants === null ? null
       : { variants, checks: checks.map((c) => ({ ...c, settings: "0".repeat(64) })) } }
   ```

   So the file's variants file is checked as the reference's, a check of
   an analysis this version does not know is refused as `unknownAnalysis`,
   and each check is checked as `parseCheck` checks one, with a
   placeholder fingerprint of 64 zeros that the last step replaces. This
   needs `Check` and `Reference` as the owner decided them, each check
   with its versions and the reference with none of its own: with the
   code of 25 September 2026, `parseCheck` refuses the versions of a check
   as fields it does not know, and `parseReference` asks for versions of
   its own that the file does not hold, a change to the approved
   `project.ts` listed in `docs/specs/stage-2-open-points.md`.
8. **What this version does not write**, refused as `header` with the
   field `variants` or `individuals`: a read of the variants file that is
   `failed`, and a read of the individuals file that is `pending` or
   `failed`, which this version writes as `notGiven`.
9. **The count of the check numbers**: each check holds as many numbers
   as `numCheckNumbers` of its analysis gives for the opened project with
   the file's variants file as its variants file, or it is refused as
   `header` with the field `checks`, "the check numbers should be 7
   numbers for the analysis diversity, as many as the rest of the file
   gives it, and not 6". The owner decided on 25 September 2026 that a
   check of the wrong count is refused at the opening as damaged (point
   11 of the reviews of work packages 2 to 6): the store compares two
   lists of different lengths as different, and a file edited by hand to
   hold 6 numbers of the diversity where its two populations give 7
   would otherwise open, and after a run on the right variants file be
   told that its variants file "may not be the one the project was saved
   with". When `numCheckNumbers` gives `null`, the count is not checked:
   for the diversity, when the file's variants file was not read, when
   there is an individuals file not read, `notGiven`, or one with no
   column of the populations chosen in it, or when
   the project holds a threshold on the individuals, whose list needs
   statistics not yet calculated for the new load, or when a list to keep
   or to remove names an individual twice or one not in the variants
   file, a list popnei would refuse; lists alone are in the project, and
   the count is checked with them
   (`docs/specs/analyses/diversity.md`, "The check numbers";
   `docs/architecture.md`, section 4). Without an individuals file, or
   with the grouping `onePopulation`, the diversity gives 4, the one
   population's three numbers after the number of variants.
10. **The filter of the FILTER column on a page that does not offer
   it.** A project that holds `{ "kind": "passed" }` in `filters` or in
   `filtersOff` is refused as `newPageFilter` when the caller says its
   page has no box of the FILTER column, `passedFilter: false`, as
   `popgen.html` does (`docs/designs/stats-filters.md`, "The FILTER
   filter"). That page would apply a filter on, or let a later click
   turn on a filter off, that nothing on its screen shows, so its user
   would have variants left out with nothing saying so; a filter off is
   refused too, so that the rule is one line. The check comes after
   every check that refuses a damaged file, the validation of step 7 and
   the checks of `header` of steps 8 and 9, so that a damaged file that
   also holds the filter is told it is damaged, which the user can act
   on, and not sent to a page that would refuse it too. No file holds
   it on 7 October 2026: `popgen2.html` saves no project yet.
11. **The fingerprints** of the settings of each check are made, with
   `checkSettings` of `docs/specs/core/keys.md`, from the opened project
   and the read options of the file's variants file: one for a file
   whose variants record whether they passed their FILTER, and one for a
   file whose variants do not, since the project file does not say which
   its file is; they are put in place of the placeholders. The
   comparison takes the one of the file given again once its read says
   `keepsPassed`, as the store does (`docs/specs/core/store.md`, "The
   comparison with the check numbers"), so that both of its sides are
   made for the same file.

The project given has `variants` null, since the user gives the variants
file again; `individuals`, the filters, the grouping and the options of
the analyses as the file had them; and the reference: the file's variants
file and, for each check, its numbers, its key version, its versions and
its fingerprint. The shell gives it to `store.open`, which starts a new
history with it, stops the calculations in flight and clears the notice
(`docs/specs/core/store.md`, "Commands and events"). No result is loaded:
every analysis is locked until the variants file is given, then ready to
run.

The Variants step, the stepper and the announcement of the opening name
the file to give, with `askedFileText` (`docs/specs/steps/variants.md`
and `docs/specs/shell.md`): "This project was
made with panel_2026.nei, of 342 individuals and 1,203,554 variants.
Load it to run its analyses again." (**Open 1**). The words were "…, 342
individuals and 1,203,554 variants. Load it in the Variants step to run
its analyses again." until the owner took, on 26 September 2026, the
recommendation of point 3 of the review of work package 9: the text is
read on the Variants step itself, and after an opening, which puts that
step on screen. When that
file is a VCF, the Variants step starts its read options at the
reference's, its ploidy and whether only the variants that passed are
kept: they are settings that every fingerprint holds, and a VCF loaded
with another ploidy gives no comparison of its numbers.

A file larger than `MAX_PROJECT_FILE_BYTES`, 64 MB, is refused by the
shell as `tooLarge` before it is read. A project file with a table of
10,000 individuals and 20 columns is about 3 MB, reckoned from the
lengths of its lines and not measured, so the bound leaves room for a
table twenty times as large. A large file picked by mistake would
otherwise be read whole into one text and parsed on the page before its
`format` is looked at, which freezes the tab for as long as that takes
and needs several times its size in memory; a variants file of more than
2^29 − 24 characters, about 537 million, cannot even be made a text in
Chrome, whose engine has that limit on a 64-bit machine. The time of
parsing 64 MB has not been measured.

### The comparisons after an opening

**The identity.** Once the user gives a variants file, `identityWarning`
compares it with the reference's and gives the warning the Variants step
shows beside it, or `null` when nothing differs. It is made again at every
change of the project, so it is complete once the file is read, and again
once a first pass has counted the variants. It never refuses the file
(`docs/functionality.md`, section 9, step 2). What is compared, in this
order:

| compared | when | the difference, in the warning |
|---|---|---|
| the name | always | "is called panel_2027.nei" |
| the format | always | "is a VCF file", "is a .nei file" |
| the size | the same format | "has 52,430,112 bytes where that one had 52,428,800" |
| the number of individuals | both read | "has 360 individuals" |
| the individuals | both read, the same number | "lacks 12 individuals of that one: ind_031, ind_044 and 10 more" |
| the order of the individuals | both read, the same ones | "has the same individuals in another order" |
| the ploidy | both read | "has ploidy 4 where that one had 2" |
| the choice of the passed variants | both VCF files | "is read with every variant where that one was read with only the variants with PASS or . in the FILTER column", or the other way round |
| the number of variants | both counted | "has 1,203,600 variants" |

Whether the variants record their FILTER, `keepsPassed` of the read, is
not compared: the file does not hold it, and the same file gives the
same value.

The size is compared only between two files of the same format, as the
owner decided on 26 September 2026 (point 2 of the review of work
package 9): a VCF and a `.nei` file of the same variants always differ
in size, and the format already says that they differ.

The choice of the passed variants, `onlyPassed` of the read options of a
VCF, is compared as the owner decided on 25 September 2026 (point 10 of
the reviews of work packages 2 to 6): it is set by the user and not
found in the file, but a VCF read with the other choice gives other
variants, as one read with another ploidy gives other genotypes, so it
gets the same warning as the ploidy. It is compared from the read
options, which a source holds from its pick, so the warning is there
before the file is read.

The warning is one sentence, what the reference knows first:
"The project was made with panel_2026.nei, 342 individuals and 1,203,554
variants; this file has 360 individuals. Load the file the project was
made with, or go on with this one." (**Open 1**). The individuals of that
file that are not in this one are named, and counts written, as
`docs/specs/core/project.md` names them, its **Open 3**; a name is shown
escaped and cut after 40 characters, as its validation shows a value of
the file. The functions of `project.ts` that do this, private on 25
September 2026, are exported for this module, so that the rules are
written once. The same comparison decides whether the check numbers of the
reference are saved (rule 2 above).

**The check numbers.** The comparison is the store's: after a run, while
the fingerprint of the settings is the reference's, the state `done` of
the analysis holds `same` or `differs`, and, for `differs`, the two
versions of popnei when they are not the same, and the two versions of
the application when the key version is not the one saved
(`docs/specs/core/store.md`, "The comparison with the check numbers").
The store's spec left its words to the screen of the project file, in
stage 6 (`docs/specs/core/store.md`, "The comparison with the check
numbers"); since the owner moved the project file to stage 2,
`checkVerdictText` gives them here, in place of that, and the panel of
every analysis shows them under its result and has no words of its own
for the comparison (**Open 1**):

- same: "The same numbers as in the project file: this variants file
  gives the results the project was saved with."
- differs: "Not the same numbers as in the project file. The variants
  file may not be the one the project was saved with, or it was changed
  since." followed, for each of the other causes the store names, by one
  sentence: "The numbers were calculated with popnei 0.1.0, and this is
  popnei 0.2.0." and "The numbers were calculated by version 0.2.0 of the
  application, which calculated this analysis in another way than this
  version, 0.3.0."

**Numbers not compared.** A run on a VCF read with other read options
than the reference's, another ploidy or the other choice of the passed
variants, gives no comparison, since the fingerprint of its settings
holds the read options (`docs/specs/core/keys.md`), and the state
`done` then holds no `check`. So that the panel says why, as the owner
decided on 25 September 2026 (point 10), `uncomparedText` gives the line
that the panel of every analysis shows under its result in place of the
comparison, when its `check` is `null`, the reference holds check
numbers of that analysis, and the VCF loaded and the reference's differ
in their read options:

- "Not compared with the numbers of the project file: this file was read
  with every variant, and the project's with only the variants with PASS
  or . in the FILTER column. To compare them, read the file again in the
  Variants step with only the variants with PASS or . in the FILTER
  column."
- "Not compared with the numbers of the project file: this file was read
  with ploidy 4, and the project's with ploidy 2. To compare them, read
  the file again in the Variants step with ploidy 2."
- both, "this file was read with ploidy 4 and every variant, and the
  project's with ploidy 2 and only the variants with PASS or . in the
  FILTER column. To compare them, read the file again in the Variants
  step with ploidy 2 and only the variants with PASS or . in the FILTER
  column.", in the order of the words of the button of the Variants
  step that reads a VCF again.

A run on a file of the other format than the reference's, a VCF given
to a project made with a `.nei` file or the other way round, gives no
comparison either, since a `.nei` file has no read options and its
fingerprint then differs from a VCF's. As the owner decided on 26
September 2026 (point 1 of the review of work package 9), the line says
so and names the file to load, the reference's name, shown escaped, and
the step where it is loaded, since the line is read on the Analyses step
(the owner's order of the same day, point 2 of the list of task 9.7):

- "Not compared with the numbers of the project file: this file is a
  VCF, and the project was made with a .nei file. Load panel.nei in the
  Variants step to compare them."
- "Not compared with the numbers of the project file: this file is a
  .nei file, and the project was made with a VCF. Load panel.vcf.gz in
  the Variants step to compare them."

It is `null` otherwise. A `.nei` file given to a project made with a
`.nei` file has no read options, its ploidy is the file's, and its
numbers are compared. A setting the user changed in
another step, a filter or the column of the populations, also leaves the
numbers uncompared and gives no line, as before; decided here, not by the
owner, since the owner's point named the read options, and a user who
changed a filter chose to.

The check numbers are what tells apart a file with the same individuals
and number of variants as the project's but different genotypes, which
the identity lets pass, since they are made from the genotypes (`docs/architecture.md`, section
8).

### The versions of the format

The format is the one thing of this module that users keep, so a change
to it is made by the rule of `docs/architecture.md`, section 12, which
this spec makes precise:

- **Version 1 until the first release of the application.** The
  application is in development, before its first alpha, and the owner
  decided on 26 September 2026 that the format stays at version 1 until
  its first release: the changes of the format before it, the regions
  of a BED file and their filter among them, are made in version 1, and
  a file saved by one development version may be refused by a later one.
  The rules below hold from that release.
- **`FORMAT_VERSION` is raised** with every change to what the file holds
  or means that the version before would read wrongly or refuse: a field
  added, removed or renamed, a value of a field given another meaning,
  the options of an analysis changed, which its `parseOptions` reads for
  each version (`docs/architecture.md`, section 4). It is one whole number,
  not a major and a minor, since this application refuses every field it
  does not write, so no change can be read by an older version.
- **It is not raised** for a new version of popnei or of the application
  that writes the same format, nor for a new analysis: an older version
  that meets its id refuses the file with the text of `unknownAnalysis`,
  "it was saved by another version of the application".
- **Every version reads the versions before it.** A file of version *k*
  is read as a file of version *k* and brought to the present one field
  by field, and the fixtures of every earlier version, below, keep
  opening.
- **Stage 4 does not raise it.** The grouping `onePopulation`, the
  types the user set, `typesSet`, the read `notGiven`, the LD filter
  with `maxDist` `null`, and the filters turned off, `filtersOff` and
  `individualFiltersOff`, join version
  1; a file of stages 2 and
  3, which has no `typesSet`, opens with none set, and a file with no
  filters turned off opens with none kept
  (`docs/specs/core/project.md`, "The validation"), and a development
  version before stage 4 refuses a file that has any of them, as it refuses
  every field it does not write and a distance that is not a whole
  number. The
  binary type holds texts, which is what every file of stages 2 and 3
  holds, since they read only CSV.
- **Stage 3 does not raise it**, nor do the regions of a BED file when
  they come, since the application has had no release. Stage 3 would
  not have needed a new version anyway: every kind of filter of the
  variants and of the individuals was in the format of version 1
  already, which the validation of stage 2 read; the fixed order refuses
  only files the application did not write; and the analyses of the
  Variants step are new ids, which the rule above covers. The regions
  and their filter join version 1 with popnei's release that filters by
  them; a development version before them refuses a file that has them,
  as it refuses every field it does not write.
- **The filter of the FILTER column does not raise it**, 7 October
  2026: `{ "kind": "passed" }` joins version 1, as the regions will. A
  version from before it refuses a file that holds it, as it refuses a
  filter of a kind it does not know, as a `wrongValue` at its `kind`,
  whose text lists the kinds that version knows, and
  `popgen.html` refuses it as `newPageFilter` (above, "Opening").
- **Stage 5 does not raise it.** The distances between populations and
  the LD decay are new ids, which the rule above covers, and the
  diversity's options gain a field, the chromosomes of the rarefaction,
  `numCalledAlleles`, which its `parseOptions` of version 1 takes with
  the two before (`docs/specs/analyses/diversity.md`, "The TypeScript
  interface"). No project file of stages 2 to 4 holds options of the
  diversity, which had no field, so no file that opened before is
  refused.
- **A change to what an analysis's `checkNumbers` gives**, which numbers
  or their order, raises its key version, so that the numbers of files
  saved before are told as "calculated in another way" and not blamed on
  the variants file. When F, the inbreeding coefficient, and the other
  statistics of `calcPopDiversity` joined the diversity in stage 5, its
  `checkNumbers` stayed as they were, the number of variants and three
  numbers per population, since more numbers would change their count
  and every file of stages 2 to 4 with a diversity would be refused at
  the opening as damaged; its key version was raised to 3 all the same,
  since the result has new fields, so the check numbers of such a file
  are compared and a difference is told as numbers "calculated in
  another way".

## The TypeScript interface

```ts
import type { AppState, AnalysisDef, CheckVerdict } from "./store.ts";
import type { AnalysisId, AppId, Project, ProjectError, VariantSource } from "./project.ts";
import type { Result } from "./result.ts";
```

The text in the field `format`, the largest file opened, and the end of
the name of every project file, which `projectFileName` adds and the
saving of the entry uses, so that the extension is written in one place.
`FORMAT_VERSION` stays in `project.ts`, which the commands use too.

```ts
export const FORMAT_NAME = "popnei_web project";
export const MAX_PROJECT_FILE_BYTES = 64 * 1024 * 1024;
export const PROJECT_FILE_EXTENSION = ".popnei.json";
```

The project file of the state of the store, with the definitions of the
analyses of the application, which give the key version, the fingerprint
and the check numbers of each; `state.popneiVersion` goes in the header.
`saved` is the date and time from the page. The numbers of an analysis
`done` are its definition's `checkNumbers` of the result of its state,
the definition found by the id of the state, which keeps the store's rule
that a definition is given only results of its own requests. Throws a
defect on a number that is not finite, and on an analysis `done` while
`state.popneiVersion` is `null`.

```ts
export function writeProjectFile<J, R, F>(
  state: AppState<R, F>,   // F: the type of a written file, which it does not read
  analyses: readonly AnalysisDef<J, R>[],
  appVersion: string,
  saved: string,
): string;

export function projectFileName(p: Project): string;
```

The project of a project file, or why it cannot be opened. `analyses` are
the definitions of the application's analyses, whose `parseOptions`
checks their options and whose `keyInputs` the fingerprints read.
`page.passedFilter` says whether the page that opens the file has the
box of the FILTER column: `false` on `popgen.html`, through its saving,
`createSaving` of `src/ui/saving.ts`; `true` on `popgen2.html` once it
opens project files.

```ts
export function readProjectFile<J, R>(
  text: string,
  app: AppId,
  analyses: readonly AnalysisDef<J, R>[],
  page: { readonly passedFilter: boolean },
): Result<Project, ProjectFileError>;

export type ProjectFileError =
  | { kind: "tooLarge"; size: number }            // bytes; checked by the shell
  | { kind: "notJson" }
  | { kind: "notProjectFile" }
  | { kind: "newerFormat"; formatVersion: number; appVersion: string | null }
  | { kind: "unknownField"; name: string }        // at the top of the file
  | { kind: "missingField"; name: string }        // at the top of the file
  // a field of the top of the wrong value; `expected` ends "‹the field› should be …"
  | { kind: "header";
      field: "formatVersion" | "app" | "appVersion" | "popneiVersion" | "saved"
        | "checks" | "variants" | "individuals";
      expected: string }
  // the rest, as the validation of the project gives it, the checks among it
  | { kind: "project"; error: ProjectError }
  // the filter of the FILTER column, on or off, on a page without its box
  | { kind: "newPageFilter" };

/** The text the user reads; `fileName` is the name of the file picked. */
export function projectFileErrorText(error: ProjectFileError, fileName: string): string;
```

The texts, the first three and the last naming the file, since it may not be a project
file at all, and the others in the pattern of `projectErrorText` of
`docs/specs/core/project.md`, which gives the text of `project` itself:

| kind | text |
|---|---|
| `tooLarge` | "notes.vcf cannot be opened as a project: it is larger than 64 MB, and a project file, which holds settings and no genotypes, is much smaller. Open the .popnei.json file the application saved." |
| `notJson` | "notes.txt cannot be opened as a project: it is not a project file, or it was cut short or changed outside the application. Open the .popnei.json file the application saved, or a copy of it." |
| `notProjectFile` | "data.json cannot be opened as a project: it is not a project file of the application. Open the .popnei.json file the application saved." |
| `newerFormat` | "This project file was saved by a newer version of the application, 0.4.0, in a format this version cannot read. Reload the page to get the newest version, and open the file again." Without ", 0.4.0" when the file's `appVersion` is not a text; the version is a value of the file, so it is shown escaped and cut after 40 characters, as `docs/specs/core/project.md` shows one. These words replace those that spec quoted for this case, which it left to this one. |
| `header` | "The project file cannot be opened: the version of its format should be a whole number, 1 or more. The file was changed outside the application, or is damaged. Open a copy saved before the change, or make the project again." The fields in words: the version of its format, the application, the version of the application that saved it, the version of popnei it was saved with, the date it was saved, the check numbers, what was read of the variants file, what was read of the individuals file. |
| `unknownField`, `missingField` | "The project file cannot be opened: it has a field "notes", which the application does not write." and "The project file cannot be opened: its field "checks" is missing.", each followed by the same last two sentences; the name shown escaped and cut. |
| `newPageFilter` | "pops.popnei.json was saved by the new page of population genetics, which can leave out the variants that failed their FILTER, and this page cannot show that choice. Open it in the new page." (**Open 4**) |

The comparison of the identity, and its warning. `saved` is the
reference's variants file and `now` the one loaded; what neither read
knows is not compared.

```ts
export type IdentityDifference =
  | { kind: "name"; now: string }
  | { kind: "format"; now: "vcf" | "nei" }
  | { kind: "size"; saved: number; now: number }        // the same format
  | { kind: "individualsCount"; now: number }
  | { kind: "otherIndividuals"; missing: readonly string[] }  // of saved, in its order
  | { kind: "individualsOrder" }
  | { kind: "ploidy"; saved: number; now: number }
  | { kind: "onlyPassed"; now: boolean }                  // both VCF files
  | { kind: "numVars"; now: number };

export function compareIdentity(saved: VariantSource, now: VariantSource): readonly IdentityDifference[];

/** The warning beside the variants file; null with no reference, no file, or no difference. */
export function identityWarning(p: Project): string | null;

/** The file to give after an opening; null when a variants file is loaded or there is no reference. */
export function askedFileText(p: Project): string | null;

/** The words of the comparison of the check numbers. */
export function checkVerdictText(verdict: CheckVerdict): string;

/** Why the numbers of the analysis `analysis` are not compared with the
    reference's, the VCF loaded read with other read options, or the file
    loaded of the other format; null otherwise. */
export function uncomparedText(p: Project, analysis: AnalysisId): string | null;
```

## The cases

- **A project saved and opened again before its variants file is given.**
  The file writes the reference's variants file and carries every check
  whose settings are unchanged, so a project that goes through several
  saves before a run keeps the numbers of the first.
- **A project opened, given another variants file, and saved before a
  run.** The identity differs, so the reference's checks are not saved,
  and the file names the new variants file.
- **A project saved while the variants file is being read.** The file
  holds its name, size, format and read options, and a read `pending`;
  the reopened project compares with the file given its name, its size,
  its format and, for a VCF, the choice of the passed variants, and not
  its ploidy, which the identity compares from two reads (above, "The
  comparisons after an opening"). Until 29 September 2026 this said the
  read options were compared, the ploidy among them, and the spec took
  the code, as the owner decided that day.
- **A project opened, its VCF given again and read again with another
  ploidy, and saved before that read ends.** The file holds the VCF
  loaded, with the ploidy the user set and its read `pending`, and none
  of the reference's check numbers (above, after the table of what is
  written).
- **A project saved while the individuals file is being read**, or after
  the reader refused it: the file holds the source `notGiven`, with its
  name and its types set and no table, and the reopened project locks
  every analysis that uses the file until it is loaded again, with
  "pops.csv was not read when this project was saved, so the project
  file does not hold it. Load pops.csv again in the Individuals step."
  While the file was being read the diversity was locked too, so no
  numbers of it are written from a result; the count of numbers carried
  from a reference is not checked at the opening, since
  `numCheckNumbers` gives `null` without the table.
- **A project with no metadata file.** It is written with `individuals`
  `null` and its grouping, and the diversity's check numbers are 4, the
  number of variants kept and the three numbers of "All individuals";
  for `panel.nei` with the missing data filter at 0.05, `[1152,
  0.37487834409014364, 0.3541409192154764, 0.9791666666666666]`
  (`docs/specs/analyses/diversity.md`, "How it is verified").
- **An opened individuals file whose options of the CSV the user
  changes.** `setCsvOptions` puts its read back to pending, and the page
  holds no file under its load id, which is of the session that saved it.
  So the screen that offers the options of the CSV offers, for a source
  whose load id the page holds no file for, to load the file again
  instead. Its types can be set, since `setColumnType` changes the table
  read and reads no file.
- **An analysis done under settings other than the reference's.** Its own
  numbers are saved, with the versions now: they are those of the settings
  the file now holds.
- **Save before the calculation worker started.** `popneiVersion` is
  `null` in the header; no analysis can be `done` yet, so every check in
  the file is one carried, with its own versions.
- **A project file of `popgen2.html` opened in `popgen.html`**, once
  the new page saves projects: refused as `newPageFilter` whenever its
  project holds the filter of the FILTER column, on or off, which the
  first project of the new page always does; a file whose user removed
  the filter by hand opens. A file with that filter and another fault
  is told by its fault, which the checks before it find first.
- **The same project file opened twice in a session.** Two openings give
  two projects with the same load ids, which is harmless: the reference
  is in no key, and the individuals file enters the keys by its table.

## How it runs

On the page, synchronous, as every function of core is. The shell reads
the file with `File.text()`, which decodes UTF-8, and hands the text to
`readProjectFile`; the saving of the entry, `createSaving` of
`src/ui/saving.ts` (`docs/specs/entry.md`, "The saving"), offers the
text of `writeProjectFile` as a download.
Reading a file holds its text, the value `JSON.parse` gives and the
project at once, an estimate of about three times the text, not measured.
The time to write and read a file with 10,000 individuals will be measured
on the walking skeleton, with the time of the keys (`docs/architecture.md`, section 11).

## How it is verified

With Vitest, at `writeProjectFile`, `readProjectFile` and the functions of
the comparisons, since the text of the file and the opened project are
what the user keeps and gets. Vitest runs the tests of core in node, and
fast-check draws random values for a property and shrinks a failure to
the smallest one. The tests use `TEST_DEFS`, added to
`src/core/testSupport.ts`: the three analyses of its `TEST_ANALYSES`,
`"diversity"`, `"pca"` and `"gwas_lm"`, as whole definitions of
`AnalysisDef` of `docs/specs/core/store.md`, each with a key version, the
filters it reads, a `keyInputs` that gives its options and the grouping,
a `checkNumbers` that gives the numbers of a test result, a list the
test chooses, and a `numCheckNumbers` that gives `null`, so that the
count is checked only by the tests of the count. The states of the store are literals of `AppState`, with
the analyses `done`, `ready` or `removed`.

- **The fixtures of version 1**, files kept under
  `src/core/fixtures/projectFile/`: `v1-empty.popnei.json`, an empty
  project; `v1-nei-diversity.popnei.json`, the example above with a table
  of 6 rows in 2 populations and the 7 check numbers of the diversity;
  `v1-vcf-pending.popnei.json`, a VCF of ploidy 4 with only the variants
  that passed, its read pending, no individuals file, and one check;
  and, from stage 3, `v1-every-filter.popnei.json`, the four filters of
  the variants in their order, the missing data filter at 0.05 and the LD
  filter with `maxDist` 100000, and the four filters of individuals, a
  list to keep, a list to remove and the two thresholds; and, from stage
  4, `v1-types.popnei.json`, the example above whole, with a third
  column `status` of `yes` and `no` whose coding the user set, `no`
  coded 1, `v1-one-population.popnei.json`, `panel.nei` with no
  individuals file, the missing data filter at 0.05 and the 4 check
  numbers of the one population, and `v1-metadata-not-read.popnei.json`,
  `pops.csv` `notGiven` with a type set and the grouping `pop`, no
  check, and `v1-ld-no-distance.popnei.json`, `panel.nei` with the
  missing data filter at 0.1 and the LD filter at r² 0.3 with
  `"maxDist": null`, no check, and `v1-filters-off.popnei.json`,
  `panel.nei` with the missing data filter at 0.1 on, in `filtersOff`
  the MAF filter at 0.9 and the LD filter at r² 0.2 within 50000, in
  that order, the fixed order of `VARIANT_FILTER_ORDER`, and in
  `individualFiltersOff` the threshold of observed heterozygosity at
  0.38, no check; and, from stage 5, `v1-stage5-options.popnei.json`,
  `panel.nei` and `panel_pops.csv` with the column `popcat`, the options
  of the diversity with a draw of 60 typed, of the distances between
  populations with a minimum of 10 and the measure `"dest"`, and of the
  LD decay with a largest distance of 100000 and a largest major allele
  frequency of 0.9, with the check numbers of the distances, 1 + 3 × 2 =
  7, as `popDists.md`, "The check numbers", counts them. They are those
  of `popDists.md`, "How it is verified", at the missing data filter at
  0.1, which the fixture has: `[1200, 0.10273588423661377,
  0.06129813142463423, 0.10496244498389443, 0.06354346296076403,
  0.10962148955018115, 0.06567052128821259]`. popnei gives them at a
  minimum of 10 as at 20, to the last digit, since the smallest
  population, p0, has 48 individuals (node, `js-v0.1.0-dev.3`, 30
  September 2026, `calcPopDists` of `panel.nei` and `panel_pops.csv` at
  10 and at 20). Each
  opens into a project written as a literal in its test, and, while
  `FORMAT_VERSION` is 1, the project written back from it, with no result
  and the header's versions and date, is the fixture byte for byte; but
  the four fixtures written before stage 4, which are written back with
  `"filtersOff": []` and `"individualFiltersOff": []` added, and
  `v1-nei-diversity.popnei.json` with `typesSet` added to its
  individuals file as well, empty, and nothing else changed, the test
  asserting each text. Once
  a version of the site that writes a format is deployed, its fixtures are
  never edited: a later version adds its own and keeps the tests that open
  the old ones, changing only the project they are expected to give when
  that version adds a field.
- **What is written**, a case for each row of the table "What is written
  of each part" and for each rule of the check numbers: a result `done`
  gives its numbers with the versions now; an analysis `removed` with a
  reference whose fingerprint matches carries the reference's check with
  its versions; another setting, or a variants file of another size,
  carries none; a check number of `Infinity` throws a defect; a VCF of
  the reference's identity read again with ploidy 4, pending, is written
  with ploidy 4, its read pending and no check, where the reference's
  had ploidy 2 and a check, and the file opens into a project whose
  reference has ploidy 4 and no check.
- **The writing**: the same state with the fields of every object of the
  project built in the reverse order gives the same text; the options
  `{ "b": 1, "a": 2 }` are written `a` first; a row of the table is one
  line.
- **Each refusal**, a case for each step of "Opening", with its `kind`:
  `"{"`, `"[]"`, `{"format": "popnei_web project", "formatVersion": 2}`,
  `formatVersion` 0, 1.5 and `"1"`, the filters of the variants `maf`
  then `missing_data` in a file of version 1, a file of `"gwas"` opened in popgen, a
  field `"notes"` at the top, `appVersion` missing, `"checks": {}`, a
  check with a field `settings`, a check of the analysis `"fst"`, a check
  with `variants` null, a read of the individuals file `pending` and one
  `failed`, a
  check of the diversity with 6 numbers where `numCheckNumbers` gives 7,
  whose text is asserted whole; and a check whose count is not checked,
  `numCheckNumbers` giving `null`, which opens. The
  texts of `notJson`, `newerFormat` and of a `header` error asserted
  whole.
- **A byte order mark** before the text of `v1-empty.popnei.json`: it
  opens.
- **The filter of the FILTER column**, from 7 October 2026: the
  fixture `v1-passed.popnei.json`, `panel.vcf.gz` read with the read
  options `{ "ploidy": 2, "onlyPassed": false }`, those `popgen2.html`
  opens a VCF with but for its ploidy, which no project file holds as
  `null` (`VariantSource.readOptions` of `src/core/project.ts`), with
  the filter of the FILTER column and the missing data filter at 0.1 on
  and the MAF filter at 0.9 off, no check, opens with `passedFilter:
  true` into the
  project written as a literal, and is written back byte for byte; with
  `passedFilter: false` it is refused as `newPageFilter`, whose text is
  asserted whole, and so is the same file with `passed` in `filtersOff`
  and not in `filters`; the same file with also a check of the wrong
  count is refused as `header`, not as `newPageFilter`; a fixture of before, `v1-every-filter.popnei.json`,
  opens with `passedFilter: false` as before.
- **The fingerprints**: each check of an opened file holds
  `checkSettings` of its definition, of the opened project and of the
  file's variants file. Under `SF2 D3`, for each analysis of the two
  pages of population genetics, with the filter of the FILTER column on
  and off, and for `low_qual.nei`, `panel.nei` and a VCF given again and
  read, the settings are those saved and a Save carries the check
  (`docs/specs/core/keys.md`, "How it is verified").
- **The count with the diversity's own definition**:
  `v1-nei-diversity.popnei.json` opens with the definitions of
  `src/core/apps.ts`, and is refused with one of its 7 numbers removed.
  And a Save cannot write a count its own opening refuses: that file
  opened, given its variants file again, and saved with those
  definitions, once with the diversity done over its two populations and
  once with the check kept of the reference, opens again, each time with
  a check of 7 numbers. The test definitions, whose `numCheckNumbers`
  gives `null`, cannot show this.
- **The numbers not compared**: `uncomparedText` for each of its five
  sentences, the three of the read options and the two of the format,
  and `null` for the same read options, a reference with no check of the
  analysis, a `.nei` file given to a project of a `.nei` file, no
  reference, and no variants file.
- **The identity**: a case for each row of its table, and the warning of
  `docs/functionality.md`, "The project was made with panel_2026.nei, 342
  individuals and 1,203,554 variants; this file has 360 individuals.",
  asserted whole with its last sentence.
- **Properties, with fast-check**, which draws random projects with
  `wholeProject` of `src/core/testSupport.ts`, the generator of any valid
  project, its reference among them, and random results among its
  analyses. The checks `wholeProject` draws have random fingerprints,
  which never match; so a second generator, beside it, makes the
  fingerprint of half of them with `checkSettings` of the project
  drawn, so that rule 2 is met:
  - `readProjectFile(writeProjectFile(s, …))` is ok, and its project is
    the one the table of "What is written" gives: equal to `s.project` in
    the filters, the individuals file when it was read, its whole
    `typesSet` included, the individuals file `notGiven` when it
    was pending, failed or `notGiven`, the grouping and
    the options; `variants` null; the reference's variants file as written,
    with `keepsPassed` of its read `true` for a VCF and `false` for a
    `.nei` file, whatever it was in `s`.
  - Written, opened, and written again from a state with no result and
    the same version of popnei, a project gives the same text: the check
    numbers of the first file are carried whole into the second.
  - The text is valid JSON, and `JSON.parse` of it holds no field that the
    tables of this spec do not name.
- **In the browser**, the flow of the walking skeleton with Playwright
  (`.claude/skills/coding/testing.md`): save the project after a run of
  the diversity, open the downloaded file in a new page, load the same
  `.nei` file, run, and read the words of `same`; load another file and
  read the warning of the identity.

## Open points

The open points of the eleven specs of stage 2 are gathered in
`docs/specs/stage-2-open-points.md`, where the ones two specs share
are one point, asked of the owner once; each below keeps its number
here, and its meanwhile.

The versions of popnei and of the application, per check number, were
decided by the owner on 25 September 2026 as this spec has them, each
check with its own (point E there).

1. **The words**: the warning of the identity, the file asked for after an
   opening, the two verdicts of the check numbers, the line of numbers not
   compared and the refusals of this module, to be judged when the owner sees them on the screens of stage
   2, as the reasons of `docs/specs/core/project.md` were. Meanwhile,
   those of this spec. Another answer changes those texts and their tests
   and nothing else.

2. **The version of the format in stage 3.** Point E of
   `docs/specs/stage-3-open-points.md`, decided by the owner on 26
   September 2026: the format stays at version 1 until the first
   release of the application, which is in development, before its
   first alpha, so neither stage 3 nor the regions of a BED file raise
   it ("The versions of the format", above), and the fixed order of the
   filters is checked in version 1. The architecture approved that day
   gave version 2 to stage 3, for the regions and the fixed order (its
   section 12), and is corrected so. The option not taken was version 2
   now, for the fixed order alone, and version 3 for the regions, a
   version more for every later application to read, to tell by the
   version what a file of version 1 of this application always is.

3. **A file of version 1 whose filters of the variants are out of the
   fixed order.** Point H of `docs/specs/stage-3-open-points.md`,
   decided by the owner on 26 September 2026 as it was recommended: it
   is refused as `filterOutOfOrder`, with the text of
   `docs/specs/core/project.md`, "the filters of the variants should be
   in the order missing genotypes, …"; the user puts them in order in
   the file, or sets the filters again in the Variants step. No
   application wrote such a file, so it is one edited by hand. The
   option not taken opened it with its filters put in the fixed order
   and a warning: since the LD pruning keeps a variant by the variants
   kept before it, the project opened would not be the one the file
   describes, and the check numbers saved with the file, made in its
   order, would differ from those of the same variants file, a
   difference the comparison would blame on the file.

4. **The words of a file of the new page opened in the old one**,
   `newPageFilter`. The design asks for words that say the file was
   made by the new page, and the users have no name for that page yet:
   the old one is "population genetics", and the new one is
   `popgen2.html` in its address. Meanwhile, "pops.popnei.json was saved
   by the new page of population genetics, which can leave out the
   variants that failed their FILTER, and this page cannot show that
   choice. Open it in the new page.", to be judged when the new page
   saves projects, since no file can meet them before. Another answer
   changes that text and its test.

## What this spec relies on in the specs written beside it

- `docs/specs/analyses/diversity.md`: the id `"diversity"`, a key version
  of 1, of 2 from 28 September 2026, of 3 from stage 5, and `checkNumbers` giving its numbers in a fixed order, `null`
  for a NaN, and `numCheckNumbers` their count, as its section "The
  check numbers" has them; a change to them raises its key version; the
  panel shows `checkVerdictText` of the `check` of its `done` state under
  its result, or, when that is `null`, `uncomparedText` when it is not.
- `docs/specs/core/store.md`: the definition of an analysis has
  `numCheckNumbers`.
- `docs/specs/entry.md`: the saving, `createSaving` of `src/ui/saving.ts`,
  whose `save()` calls `writeProjectFile` with `store.getState()`, the
  analyses of `src/core/apps.ts`, the version of the application and
  `new Date().toISOString()`, and downloads the text under the name the
  user gave in the dialog of Save, which starts at `projectFileName`, at any time, a pending read included; and the page's
  map of files holds no file under the load ids of an opened project,
  whose sources are read or `notGiven`, and the entry asks for the read
  of a pending source alone, so nothing of the opening asks for a read;
  and, from 7 October 2026, its opening calls `readProjectFile` with
  `{ passedFilter: false }`.
- `docs/specs/shell.md`: Save project calls that `save()`; Open project…
  refuses a file above `MAX_PROJECT_FILE_BYTES`, reads it with
  `File.text()`, shows `projectFileErrorText` of a file refused, asks
  before an opening with its own words, and calls `store.open` with the
  project.
- `docs/specs/steps/variants.md`: it shows `askedFileText` and
  `identityWarning`, and starts the read options of a VCF at the
  reference's; a ploidy typed and not applied is the step's, and not in
  the project.
- `docs/specs/steps/individuals.md`: it offers to load again, rather
  than to change the options of the CSV of, an individuals file whose
  load id the page holds no file for, and shows the reason of a file
  `notGiven`.
- `docs/specs/worker/*`: nothing of this module; from stage 4, the
  binary type of texts of `docs/specs/worker/protocol.md`, which the file
  writes as the project holds it.
- `docs/specs/core/project.md`, from stage 4: `typesSet`, with the
  types not applied, `typesLost` worked out from it and the table, and
  the grouping `onePopulation`, and the reading of a file of stages 2
  and 3 that lacks the first.
- The specs of the checks of the Variants step, stage 3: the ids
  `individualChecks`, `variantChecks` and `filterCounts`, their key
  versions, and their `checkNumbers` and `numCheckNumbers`, which this
  module writes and checks as any analysis's.
- The specs of stage 5: the ids `popDists` and `ldDecay`, of key version
  1, their `checkNumbers`, 1 + k × (k − 1) for k populations of the
  distances and 1 + 3 × the populations of the LD decay, their
  `numCheckNumbers`, and their `parseOptions` of version 1, of two fields
  each (`popDists.md` and `ldDecay.md`, "The TypeScript interface" and
  "Its options").

These choices of this spec change what a user meets, and the owner may
wish to overrule them on approving it: an individuals file whose read is
pending or failed is saved without its table, as `notGiven`, and the
project opened from it asks for the file before any analysis that uses
it runs; the Variants step starts a VCF's read
options at the reference's; a variants file whose name alone differs
drops the carried numbers; and, from stage 4, a project file of
stages 2 and 3 saved while its metadata file was not read opens with no
metadata file, on one population.

## Not in this spec

- The validation of the project part, field by field, and its texts:
  `docs/specs/core/project.md`, "The validation".
- The comparison of the check numbers itself, and when the fingerprint
  now is made: `docs/specs/core/store.md`.
- The buttons of Save and Open, the question before an opening, and where
  the warnings are shown: `docs/specs/shell.md`.
- The report, which holds the project file, and the Python script: stage
  6.
- The regions of a BED file, saved whole with the name of their file
  and without their hash (`docs/architecture.md`, section 8): with
  popnei's release that has the filter of the regions, in version 1.
- Keeping a project across a reload of the page without saving it: not
  built (`docs/specs/core/history.md`).
