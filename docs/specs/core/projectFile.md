# The project file

A draft of 25 September 2026, awaiting the owner's approval. There is no
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
`history.md` and `docs/specs/worker/protocol.md`. The owner decided on 25
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
  "appVersion": "0.2.0",
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
  "individualFilters": [],
  "individuals": {
    "fileId": "ffeeddccbbaa99887766554433221100",
    "name": "pops.csv",
    "csv": {
      "encoding": "auto",
      "separator": "auto",
      "decimal": "auto"
    },
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
        "decimal": "."
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
      "numbers": [0.3120051, 0.2987112],
      "keyVersion": 1,
      "popneiVersion": "0.1.0",
      "appVersion": "0.2.0"
    }
  ]
}
```

- **The header** is the first six fields. `format` is always the text
  `"popnei_web project"`, which tells a project file from any other JSON
  file. `formatVersion` is the version of the format, `FORMAT_VERSION` of
  `project.ts`, 1. `app` is the application, `"popgen"` or `"gwas"`.
  `appVersion` is the version of the application that saved the file, as
  the page gives it to the store. `popneiVersion` is the version of popnei
  that the calculation worker gave, or `null` when it had not given one
  yet, in the first second or so after the page opened, or because the
  worker could not start. `saved` is the date and time of the save, in UTC,
  as `new Date().toISOString()` writes it on the page, since core reads no
  clock (`.claude/skills/coding/SKILL.md`, "The core").
- **The project** is written as the project holds it, with the field
  names and the values of `docs/specs/core/project.md`: the read options
  of a VCF in `variants`; the filters in their order; the individuals
  table whole, with the type of each column, which the walking skeleton
  shows and does not let the user change; the grouping; the options of
  each analysis, whole, the defaults filled in. Four parts are written
  otherwise, below: the variants file of a project that has none but has
  a reference, a read of either file that is pending or failed, and the
  reference, which is not written as such.
- **The check numbers** are one entry per analysis that has numbers to
  save, in the order of the analyses of the application: its id, its
  numbers, its key version when it was run, and the versions of popnei and
  of the application that calculated them (**Open 1**, below). A number
  that popnei gave as NaN is `null`, as `checkNumbers` gives it.

Which numbers an analysis saves is its own spec's. For the walking
skeleton that is the diversity's (`docs/specs/analyses/diversity.md`);
this spec takes them as a list of numbers and `null`s whose length and
order the diversity fixes, and assumes they are the mean unbiased expected
heterozygosity of each population, in the order of the populations of its
result, as section 9 of `docs/functionality.md` names them.

### What is written of each part

| part of the project | what the file holds |
|---|---|
| `variants`, a file loaded | the source as it is, its load id included; its read written as below |
| `variants` null, a reference | the reference's `variants`, so that a project opened and saved again before its file is given still names the file it was made with |
| `variants` null, no reference | `null` |
| a read of the variants file pending or failed | `{ "kind": "pending" }`: the name, the size, the format and the read options are known, and the rest is not |
| `individuals` read | the source as it is, its load id and its table included |
| `individuals` pending or failed | `null`, and the grouping is kept by the name of its column |
| `reference` | not written as such: its `variants` as above, and its check numbers under the rule below |

The failed read of the variants file is written as pending because what
failed was a read of that session: a new load of the file reads it again,
and the reason of a crash would be noise in a file kept for years. The
individuals file is written only when it was read, because the file keeps
it whole, as its table, and a pending or failed read has no table; the
opened project then asks for the individuals file as an empty project
does, "Load an individuals file in the Individuals step."
(`docs/specs/core/project.md`, `individualsNeeds`). What is lost is the
name of the file and the options of the CSV, which a new load starts from
"auto" again. This is what `docs/specs/core/project.md`, "The cases", left
to this spec: an opened project holds no source whose read is pending, so
the entry of the page, which asks for the read of every pending source
after each change (`docs/architecture.md`, section 6, "Who asks for a
read"), never asks for the read of a file the page does not hold.

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
   not differ from the reference's in its identity (below). An analysis
   whose options changed does not carry the numbers of other options, and
   numbers of the old file are not saved beside a new one, where they
   would read as the numbers of a run on it.
3. Otherwise, none.

The fingerprint now is made with the read options of the variants file
loaded, or with the reference's when none is.

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
  (`docs/specs/core/keys.md`).
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
  compare as different.

`projectFileName` gives the name the download proposes: the name of the
variants file without its extension, `.nei`, `.vcf` or `.vcf.gz`, with
`.popnei.json`, so `panel_2026.nei` gives `panel_2026.popnei.json`; or
`project.popnei.json` when the project has no variants file.

### Opening

The shell asks "Open a project and lose this one?" before it opens a file,
since an opening starts a new history, which an undo does not go back
through (`docs/specs/core/history.md`, decided by the owner on 24
September 2026). `readProjectFile` takes the text of the file and gives
the project, or the first reason it cannot. It checks, in this order, so
that the reason given is the one the user can act on:

1. **A byte order mark** at the start, which an editor of Windows may add,
   is removed. A text that `JSON.parse` refuses, a file cut short among
   them, is refused as `notJson`.
2. **A JSON value that is not an object with `format` equal to
   `"popnei_web project"`** is refused as `notProjectFile`.
3. **The version of the format** must be a whole number of at least 1. A
   version above `FORMAT_VERSION` is refused as `newerFormat` before
   anything else is read, since the rest of a newer file may be anything.
4. **The application**: a file of the other one is refused with the
   `otherApp` error of `parseProject`, before the rest, so that a user who
   opened a file in the wrong application is told to open it there and
   not that it is damaged.
5. **The fields of the top**: exactly those of the example. A field this
   version does not write is refused as `unknownField`, as
   `docs/specs/core/project.md` refuses one inside the project, since this
   version would not have written it; a field missing is refused too.
   `appVersion` and `saved` must be texts, `popneiVersion` a text or
   `null`.
6. **The project**, through `parseProject` of `docs/specs/core/project.md`,
   with the application, the version of the format of the file and the
   analyses of the application: every check of its section "The
   validation", with its errors and their texts. `readProjectFile` gives
   it the project with `variants` null and a reference made of the file's
   `variants` and `checks`, so that the file's variants file is checked
   as the reference's and each check of an analysis this version does not
   know is refused as `unknownAnalysis`, with its text.
7. **What this version does not write**, refused as the texts of
   `parseProject` refuse a wrong value: a read of the variants file that
   is `failed`, a read of the individuals file that is not `read`, and a
   check when `variants` is `null`, since no result is made without a
   variants file.
8. **The fingerprints** of the settings of each check are made, with
   `settingsFingerprint` of `docs/specs/core/keys.md`, from the opened
   project and the read options of the file's variants file.

The project given has `variants` null, since the user gives the variants
file again; `individuals`, the filters, the grouping and the options of
the analyses as the file had them; and the reference: the file's variants
file and, for each check, its numbers, its key version, its versions and
its fingerprint. The shell gives it to `store.open`, which starts a new
history with it, stops the calculations in flight and clears the notice
(`docs/specs/core/store.md`, "Commands and events"). No result is loaded:
every analysis is locked until the variants file is given, then ready to
run.

The shell names the file to give, with `askedFileText`: "This project was
made with panel_2026.nei, 342 individuals and 1,203,554 variants. Load it
in the Variants step to run its analyses again." (**Open 2**). When that
file is a VCF, the Variants step starts its read options at the
reference's, its ploidy and whether only the variants that passed are
kept: they are settings that every fingerprint holds, and a VCF loaded
with another ploidy gives no comparison of its numbers.

A file larger than `MAX_PROJECT_FILE_BYTES`, 256 MB, is refused by the
shell as `tooLarge` before it is read. A project file with a table of
10,000 individuals and 20 columns is about 3 MB. A variants file picked
by mistake would otherwise be read whole into one text, and a text of
more than 2^29 − 24 characters, about 537 million, cannot be made in
Chrome, the longest string of V8, its engine, on a 64-bit machine (from
V8's source, not measured here), so the tab would fail with no message.

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
| the size | always | "has 52,430,112 bytes where that one had 52,428,800" |
| the number of individuals | both read | "has 360 individuals" |
| the individuals | both read, the same number | "lacks 12 individuals of that one: ind_031, ind_044 and 10 more" |
| the order of the individuals | both read, the same ones | "has the same individuals in another order" |
| the ploidy | both read | "has ploidy 4 where that one had 2" |
| the number of variants | both counted | "has 1,203,600 variants" |

The warning is one sentence, what the reference knows first:
"The project was made with panel_2026.nei, 342 individuals and 1,203,554
variants; this file has 360 individuals. Load the file the project was
made with, or go on with this one." (**Open 2**). The individuals of that
file that are not in this one are named, and counts written, as
`docs/specs/core/project.md` names them, its **Open 3**; a name is shown
escaped and cut after 40 characters, as its validation shows a value of
the file. The functions of `project.ts` that do this are exported for
this module, so that the rules are written once. The same comparison decides whether the check numbers of the
reference are saved (rule 2 above).

**The check numbers.** The comparison is the store's: after a run, while
the fingerprint of the settings is the reference's, the state `done` of
the analysis holds `same` or `differs`, and, for `differs`, the two
versions of popnei when they are not the same, and the two versions of
the application when the key version is not the one saved
(`docs/specs/core/store.md`, "The comparison with the check numbers").
The store's spec left its words to the screen of the project file, then
in stage 6; `checkVerdictText` gives them here, and the panel of the
analysis shows them under its result (**Open 2**):

- same: "The same numbers as in the project file: this variants file
  gives the results the project was saved with."
- differs: "Not the same numbers as in the project file. The variants
  file may not be the one the project was saved with, or it was changed
  since." followed, for each of the other causes the store names, by one
  sentence: "The numbers were calculated with popnei 0.1.0, and this is
  popnei 0.2.0." and "The numbers were calculated by version 0.2.0 of the
  application, which calculated this analysis in another way than this
  version, 0.3.0."

The check numbers are what tells a file with the same individuals and
number of variants and other genotypes, which the identity lets pass,
since they are made from the genotypes (`docs/architecture.md`, section
8).

### The versions of the format

The format is the one thing of this module that users keep, so a change
to it is made by the rule of `docs/architecture.md`, section 12, which
this spec makes precise:

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
- **A change to what an analysis's `checkNumbers` gives**, which numbers
  or their order, raises its key version, so that the numbers of files
  saved before are told as "calculated in another way" and not blamed on
  the variants file. When F joins the diversity in stage 5, its
  `checkNumbers` can stay as they are, and then neither changes.

## The TypeScript interface

```ts
import type { AppState, AnalysisDef, CheckVerdict } from "./store.ts";
import type { AppId, Project, ProjectError, VariantSource } from "./project.ts";
import type { Result } from "./result.ts";
```

The text in the field `format`, and the largest file opened.
`FORMAT_VERSION` stays in `project.ts`, which the commands use too.

```ts
export const FORMAT_NAME = "popnei_web project";
export const MAX_PROJECT_FILE_BYTES = 256 * 1024 * 1024;
```

The project file of the state of the store, with the definitions of the
analyses of the application, which give the key version, the fingerprint
and the check numbers of each; `state.popneiVersion` goes in the header.
`saved` is the date and time from the page. The numbers of an analysis
`done` are its definition's `checkNumbers` of the result of its state,
the definition found by the id of the state, which keeps the store's rule
that a definition is given only results of its own requests. Throws a
defect on a check number that is not finite.

```ts
export function writeProjectFile<J, R>(
  state: AppState<R>,
  analyses: readonly AnalysisDef<J, R>[],
  appVersion: string,
  saved: string,
): string;

export function projectFileName(p: Project): string;
```

The project of a project file, or why it cannot be opened. `analyses` are
the definitions of the application's analyses, whose `parseOptions`
checks their options and whose `keyInputs` the fingerprints read.

```ts
export function readProjectFile<J, R>(
  text: string,
  app: AppId,
  analyses: readonly AnalysisDef<J, R>[],
): Result<Project, ProjectFileError>;

export type ProjectFileError =
  | { kind: "tooLarge"; size: number }            // bytes; checked by the shell
  | { kind: "notJson" }
  | { kind: "notProjectFile" }
  | { kind: "newerFormat"; formatVersion: number; appVersion: string | null }
  // a field of the header missing, expected null, or of the wrong value
  | { kind: "header"; field: "formatVersion" | "appVersion" | "popneiVersion" | "saved";
      expected: string | null }
  // the rest, as the validation of the project gives it, the checks among it
  | { kind: "project"; error: ProjectError };

/** The text the user reads; `fileName` is the name of the file picked. */
export function projectFileErrorText(error: ProjectFileError, fileName: string): string;
```

The texts, the first three naming the file, since it may not be a project
file at all, and the others in the pattern of `projectErrorText` of
`docs/specs/core/project.md`, which gives the text of `project` itself:

| kind | text |
|---|---|
| `tooLarge` | "notes.vcf cannot be opened as a project: it is larger than 256 MB, and a project file, which holds settings and no genotypes, is much smaller. Open the .popnei.json file the application saved." |
| `notJson` | "notes.txt cannot be opened as a project: it is not a project file, or it was cut short or changed outside the application. Open the .popnei.json file the application saved, or a copy of it." |
| `notProjectFile` | "data.json cannot be opened as a project: it is not a project file of the application. Open the .popnei.json file the application saved." |
| `newerFormat` | "This project file was saved by a newer version of the application, 0.4.0, in a format this version cannot read. Reload the page to get the newest version, and open the file again." Without ", 0.4.0" when the file's `appVersion` is not a text. |
| `header` | "The project file cannot be opened: the version of its format should be a whole number, 1 or more. The file was changed outside the application, or is damaged. Open a copy saved before the change, or make the project again." The fields in words: the version of its format, the version of the application that saved it, the version of popnei it was saved with, the date it was saved. |

The comparison of the identity, and its warning. `saved` is the
reference's variants file and `now` the one loaded; what neither read
knows is not compared.

```ts
export type IdentityDifference =
  | { kind: "name"; now: string }
  | { kind: "format"; now: "vcf" | "nei" }
  | { kind: "size"; saved: number; now: number }
  | { kind: "individualsCount"; now: number }
  | { kind: "otherIndividuals"; missing: readonly string[] }  // of saved, in its order
  | { kind: "individualsOrder" }
  | { kind: "ploidy"; saved: number; now: number }
  | { kind: "numVars"; now: number };

export function compareIdentity(saved: VariantSource, now: VariantSource): readonly IdentityDifference[];

/** The warning beside the variants file; null with no reference, no file, or no difference. */
export function identityWarning(p: Project): string | null;

/** The file to give after an opening; null when a variants file is loaded or there is no reference. */
export function askedFileText(p: Project): string | null;

/** The words of the comparison of the check numbers. */
export function checkVerdictText(verdict: CheckVerdict): string;
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
  the reopened project compares only those with the file given.
- **A project saved while the individuals file is being read**, or after
  the reader refused it: the file holds no individuals file, and the
  reopened project asks for one.
- **An opened individuals file whose options of the CSV the user
  changes.** `setCsvOptions` puts its read back to pending, and the page
  holds no file under its load id, which is of the session that saved it.
  So the screen that offers the options of the CSV offers, for a source
  whose load id the page holds no file for, to load the file again
  instead.
- **An analysis done under settings other than the reference's.** Its own
  numbers are saved, with the versions now: they are those of the settings
  the file now holds.
- **Save before the calculation worker started.** `popneiVersion` is
  `null` in the header; no analysis can be `done` yet, so every check in
  the file is one carried, with its own versions.
- **The same project file opened twice in a session.** Two openings give
  two projects with the same load ids, which is harmless: the reference
  is in no key, and the individuals file enters the keys by its table.

## How it runs

On the page, synchronous, as every function of core is. The shell reads
the file with `File.text()`, which decodes UTF-8, and hands the text to
`readProjectFile`; it offers the text of `writeProjectFile` as a download.
Reading a file holds its text, the value `JSON.parse` gives and the
project at once, about three times the text, 10 MB for the file of 3 MB
above. The time to write and read a file with 10,000 individuals has not
been measured; it is measured on the walking skeleton, with the time of
the keys (`docs/architecture.md`, section 11).

## How it is verified

With Vitest, at `writeProjectFile`, `readProjectFile` and the functions of
the comparisons, since the text of the file and the opened project are
what the user keeps and gets. The tests use definitions of test analyses
with a key version, `filtersRead`, `keyInputs` and `checkNumbers`, and
states of the store built as literals of `AppState`, with the analyses
`done`, `ready` or `removed`.

- **The fixtures of version 1**, files kept under
  `src/core/fixtures/projectFile/`: `v1-empty.popnei.json`, an empty
  project; `v1-nei-diversity.popnei.json`, the example above with a table
  of 6 rows in 2 populations and the check numbers of the diversity;
  `v1-vcf-pending.popnei.json`, a VCF of ploidy 4 with only the variants
  that passed, its read pending, no individuals file, and one check. Each
  opens into a project written as a literal in its test, and, while
  `FORMAT_VERSION` is 1, the project written back from it, with no result
  and the header's versions and date, is the fixture byte for byte. Once
  a version of the site that writes a format is deployed, its fixtures are
  never edited: a later version adds its own and keeps the tests that open
  the old ones, changing only the project they are expected to give when
  that version adds a field.
- **What is written**, a case for each row of the table "What is written
  of each part" and for each rule of the check numbers: a result `done`
  gives its numbers with the versions now; an analysis `removed` with a
  reference whose fingerprint matches carries the reference's check with
  its versions; another setting, or a variants file of another size,
  carries none; a check number of `Infinity` throws a defect.
- **The writing**: the same state with the fields of every object of the
  project built in the reverse order gives the same text; the options
  `{ "b": 1, "a": 2 }` are written `a` first; a row of the table is one
  line.
- **Each refusal**, a case for each step of "Opening", with its `kind`:
  `"{"`, `"[]"`, `{"format": "popnei_web project", "formatVersion": 2}`,
  `formatVersion` 0, 1.5 and `"1"`, a file of `"gwas"` opened in popgen, a
  field `"notes"` at the top, `appVersion` missing, a check with a field
  `settings`, a check of the analysis `"fst"`, a check with `variants`
  null, a read of the individuals file `pending`. The texts of `notJson`,
  `newerFormat` and of a `header` error asserted whole.
- **A byte order mark** before the text of `v1-empty.popnei.json`: it
  opens.
- **The fingerprints**: each check of an opened file holds
  `settingsFingerprint` of its definition, of the opened project and of
  the read options of the file's variants file.
- **The identity**: a case for each row of its table, and the warning of
  `docs/functionality.md`, "The project was made with panel_2026.nei, 342
  individuals and 1,203,554 variants; this file has 360 individuals.",
  asserted whole with its last sentence.
- **Properties, with fast-check**, which draws random projects with
  `wholeProject` of `src/core/testSupport.ts`, its reference among them,
  and random results among its analyses:
  - `readProjectFile(writeProjectFile(s, …))` is ok, and its project is
    the one the table of "What is written" gives: equal to `s.project` in
    the filters, the individuals file when it was read, the grouping and
    the options; `variants` null; the reference's variants file as written.
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

1. **The versions of popnei and of the application, per check number.**
   The architecture keeps them once, in the header, and the reference as
   `popneiVersion` and `appVersion` beside its checks. But a file saved
   after an opening can hold numbers of two sessions: the check of the
   PCA carried from a file saved with popnei 0.1.0, and that of the
   diversity run again with popnei 0.2.0. With one version in the header,
   one of the two is labelled wrongly, and a later difference would not
   name popnei when popnei could explain it.
   - **A, each check keeps its versions**, as this spec writes it: the
     file saves them with the numbers, `Check` of
     `docs/specs/core/project.md` gains `popneiVersion` and `appVersion`
     and `Reference` loses its own, and the store's comparison reads the
     check's. The header keeps the versions of the save, as information
     for a person reading the file, and its popnei version can be `null`.
     It costs a change to two approved specs and their code, about twenty
     lines, and their tests.
   - **B, one version per file**: the reference's checks are carried only
     when they were made with the versions of popnei and of the
     application of the save, and Save waits until the calculation worker
     has given its version. It changes no other spec, and it drops every
     carried number of a project opened in a newer version and saved
     before it is run again, and the ability to save when the worker could
     not start.
   The recommendation is A, since the file keeps its numbers correctly
   labelled in every case. The answer is needed before the plan: B changes
   the header, the checks and the fixtures of the first version.
2. **The words**: the warning of the identity, the file asked for after an
   opening, the two verdicts of the check numbers and the refusals of this
   module, to be judged when the owner sees them on the screens of stage
   2, as the reasons of `docs/specs/core/project.md` were. Meanwhile,
   those of this spec. Another answer changes those texts and their tests
   and nothing else.

## What this spec assumes of the specs written beside it

- `docs/specs/analyses/diversity.md`: the id `"diversity"`, a key version
  of 1, and `checkNumbers` giving the mean unbiased expected
  heterozygosity of each population, in a fixed order of the populations,
  `null` for a population with no values; a change to them raises its
  key version; the panel shows `checkVerdictText` of its `done` state
  under its result.
- `docs/specs/shell.md`: Save calls `writeProjectFile` with
  `store.getState()`, the analyses of the application, the version of the
  application and `new Date().toISOString()`, and downloads the text under
  `projectFileName`, at any time, a pending read included; Open asks
  "Open a project and lose this one?", refuses a file above
  `MAX_PROJECT_FILE_BYTES`, reads it with `File.text()`, and calls
  `store.open` with the project or shows `projectFileErrorText`.
- The Variants step, in the shell or the entry of stage 2: it shows
  `askedFileText` and `identityWarning`, and starts the read options of a
  VCF at the reference's.
- `docs/specs/entry.md`: the page's map of files holds no file under the
  load ids of an opened project, and nothing of the opening asks for a
  read, since an opened project has no pending source.
- `docs/specs/worker/*`: nothing of this module.

## Not in this spec

- The validation of the project part, field by field, and its texts:
  `docs/specs/core/project.md`, "The validation".
- The comparison of the check numbers itself, and when the fingerprint
  now is made: `docs/specs/core/store.md`.
- The buttons of Save and Open, the question before an opening, and where
  the warnings are shown: `docs/specs/shell.md`.
- The report, which holds the project file, and the Python script: stage
  6.
- Keeping a project across a reload of the page without saving it: not
  built (`docs/specs/core/history.md`).
