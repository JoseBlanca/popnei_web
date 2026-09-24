# The project and its commands

24 September 2026, approved by the owner on 24 September 2026. There is no code
yet. The project is everything the user has set in one application: the
variants file they loaded, the filters, the individuals file with the
types of its columns, the populations, and the options of each analysis.
This spec gives its type, the commands that change it, the records that
put into it what the workers read from the files, what every analysis
needs of it before it can run, and the validation that turns a project
file into a project. It develops sections 2, 6 and 8 of
`docs/architecture.md`, and depends on `docs/specs/worker/protocol.md`,
for the filters and the table, and on `docs/specs/core/keys.md`, for the
fingerprint of the settings. The stages it names are the steps in which
the applications are built, in `docs/build-order.md`: stage 2 the walking
skeleton, the smallest application that goes through every part once,
stage 3 the variants step, stage 7 the association application.

Each time the user picks a file, the page gives that pick a load id, a
random name of its own, new at every pick, the same file picked again
included (`docs/architecture.md`, section 3). The project names a file by
its load id, and the page keeps the file itself under that id, since a
file of the disk cannot be written into a project.

## What it does

A user never sees the project, and sees everything that follows from it.
A command that changed a part it should not have would show a result for
settings the user did not choose; one that gave a new project when
nothing changed would add a step to undo that does nothing; a validation
that let a wrong field through would open a project file whose analyses
fail later with a message about something else.

The rules, which every function below keeps:

- **The project is one plain value that is never changed in place**
  (`docs/architecture.md`, section 2). It holds only what JSON, the text
  format of the project file, holds: text, finite numbers, booleans,
  `null`, lists and objects of named fields. Saving it is writing it as
  JSON, and `parseProject` of what that wrote gives an equal project.
  The rule is kept by freezing: the store freezes every project it takes
  with `freezeProject` (`docs/specs/core/store.md`), so that a write into
  it throws, and the memo of the keys trusts the text of an object only
  when it is frozen (`docs/specs/core/keys.md`, "The memo"). A command
  copies what it is given, a filter, the options of an analysis, so that
  a caller that changes its own object later does not change the
  project.
- **A command is a function from a project to a new project**, which
  builds the new one from the parts of the old, keeps the very same
  object for every part it did not change, and changes nothing in the old
  one. A command given a value equal to the one already there returns the
  project it was given, the same object, so that the store makes no step
  of undo for it (`docs/specs/core/store.md`). Equal means equal by value,
  compared as the canonical form of `docs/specs/core/keys.md` writes them,
  so a filter with the same kind and threshold is the one already there.
- **A command is given valid values.** The screens build them from
  controls that allow only valid ones, a number field from 0 to 1, a list
  of the columns of the file. A value that is not valid reaching a command
  is a defect, a mistake of our code and not of the user's data, here of
  the screen's code: the command throws an `Error` whose message starts
  with `popnei_web defect:`, which the application reports as its own
  failure (`.claude/skills/coding/typescript.md`, "Errors"). A value is
  valid when `parseProject` would accept it in its place: the commands
  and `parseProject` share one check of each value, the ranges of the
  thresholds, of `maxDist` and of the ploidy, read options only for a VCF,
  and the rest of "The validation" below, so that a project a command
  made always opens again from its project file. What comes from outside
  the program, the JSON of a project file, goes through `parseProject`,
  which returns what is wrong instead.
- **One filter of each kind**, in the list of the variants' filters and
  in that of the individuals'. For the variants, because popnei refuses a
  second filter of a kind (`docs/specs/worker/protocol.md`); setting a
  filter of a kind that is there replaces it in its place, and the order
  of the list is the one the user gave, since it changes the result. For
  the individuals, because a second list of one kind would say what one
  list says; and since the individuals kept are those every filter keeps,
  in any order, that list is kept in a fixed order, keep, remove, missing
  data, observed heterozygosity, and has no command to reorder it.
- **A record is not a command.** When the calculation worker has opened
  the variants file, or the light worker, the second thread that reads
  the individuals file, has read it, what they read goes into the source
  with that load id and no other (`docs/architecture.md`, section 6). The
  functions that do it are here, pure as the commands are; the store
  applies them to every project of the history and makes no step of undo
  (`docs/specs/core/history.md`).

Three things are so by decisions taken before this spec, and a user meets
them: loading the same variants file again calculates every analysis
again, since each load has an id of its own and nothing of the file is
compared (the owner, 24 September 2026, `docs/architecture.md`, section
3); loading the same individuals file again finds the results of the
first load, since its table, and not its load, goes into the keys; and a
project file with a field this version does not know is refused, decided
here, below.

### What an analysis needs of every project

Before an analysis looks at what it needs of its own, every one of them
needs a variants file that was read, and filters of individuals that
popnei will accept. `projectNeeds` gives the first thing missing, in the
words the screen shows beside the Run button, or `null`:

| the project | the reason |
|---|---|
| no variants file | "Load a variants file in the Variants step." |
| the variants file being read | "Reading panel.nei." |
| popnei refused the file | "popnei could not read panel.nei: ‹popnei's message›. Load a variants file in the Variants step." |
| the file could not be read for another reason | "panel.nei could not be read: ‹what happened› (**Open 4**). Reload the page and load it again." |
| a list of individuals that is empty | "The list of individuals to keep is empty. Add individuals to it, or remove the filter, in the Variants step." |
| a list that names an individual more than once | "The list of individuals to remove names ind_031 more than once. Change the list, or remove the filter, in the Variants step." (**Open 2**) |
| a list that names individuals not in the variants | "The list of individuals to keep names 2 individuals that are not in panel.nei: ind_900 and ind_901. Change the list, or remove the filter, in the Variants step." (**Open 2**) |

The owner decided on 24 September 2026 that the words the first draft of
these tables lacked, the end of the last two rows, how many individuals
a text names, "‹what happened›", the end of a refusal of the reader of
the individuals file and which problem is named first, are provisional,
to be judged when the owner sees them on the screens of stage 2: each is
an open point below, **Open 2** to **Open 6**, and the code uses its
meanwhile.

The individuals are named as **Open 3** says, and the lists are checked
in the order of **Open 6**. A list that repeats several names names each
of them once, in the order of the list, "names ind_031 and ind_044 more
than once". These are decided here, not by the owner:

- A message of popnei or of the files wasm that ends with a full stop is
  shown without it, so that the sentence has one. An empty message, or
  one of spaces, is left out with its colon: "popnei could not read
  panel.nei. Load a variants file in the Variants step."
- A name of an individual or of a column is shown as the validation shows
  a value of the file, below: its control and format characters escaped,
  and cut after 40 characters. An empty name is "an empty name", "names
  an empty name more than once"; a refusal of the reader says "two
  columns have an empty name" and "two rows have an empty name".
- The name of a file is escaped in the same way, and not cut.
- A count is written with a comma between groups of three digits, "1,203
  more", "where the header has 1,204", as the numbers of this spec are. A
  line number is not a count, and has no comma: "line 12045".

popnei refuses these lists too, with messages that name its arguments,
`individuals`, and that the store would keep as popnei's refusals of those
settings (`docs/specs/core/store.md`); checked here, the user is told what
to fix before anything runs. A threshold of individuals that keeps none of
them cannot be known before the statistics of each individual are
calculated; the spec of the filters of individuals, in stage 3, says how
it is checked, and until then popnei's refusal is shown.

`individualsNeeds` gives the same for the analyses that use the
individuals file, the first thing missing, or `null`. Every individual of
the variants must be in the file, and the reason names the ones missing
(`docs/functionality.md`, section 4). These words were added on 24
September 2026, after the owner approved this spec, on the pattern of the
table above, and approved by the owner with the plan of stage 1 the
same day; the step is named by its
folder in `docs/architecture.md`, section 9, `individuals`, since
`docs/functionality.md` names no step.

| the project | the reason |
|---|---|
| no individuals file | "Load an individuals file in the Individuals step." |
| the individuals file being read | "Reading pops.csv." |
| the files wasm refused the file | "pops.csv could not be read: ‹its message›. Load an individuals file in the Individuals step." |
| the reader of CSV and TSV refused the file | "pops.csv could not be read: line 7 has 3 cells where the header has 4. Load an individuals file in the Individuals step." (**Open 5**) |
| the file could not be read for another reason | "pops.csv could not be read: ‹what happened› (**Open 4**). Reload the page and load it again." |
| individuals of the variants missing from it | "12 individuals of panel.nei are not in pops.csv: ind_031, ind_044 and 10 more. Add them to the file and load it again in the Individuals step." |

The individuals missing are named as **Open 3** says; one alone is "1
individual of panel.nei is not in pops.csv: ind_031. Add it to the file
and load the file again in the Individuals step." When the variants file
is not read, `individualsNeeds` does not look at the individuals of the
variants: `projectNeeds` has already given its reason.

### The project of an opened project file

A project file restores the settings and none of the results: the user
gives the variants file again, and every analysis is calculated again.
The variants file is the user's, and nothing tells the application that
the file given is the one the project was saved with; it may be another,
or the same one changed. The check numbers, a few numbers of each result
kept in the project file, are what tells: after a run, the numbers of the
new result are compared with those saved (`docs/functionality.md`,
section 9).

That comparison means something only while the settings of the analysis
are those the file had. So, when a project file is opened, a fingerprint
of the settings of each analysis as the file had them is made and kept in
the project, beside its numbers: a hash of the filters, the read options
of the variants file, and what the analysis's own key holds
(`docs/specs/core/keys.md`, "The fingerprint of the settings"). After a
run, the numbers are compared only while the fingerprint of the settings
now is that one. The owner decided it on 24 September 2026. The option
not taken was to compare with a key of the file's settings, which could
be made only once the calculation worker had given the version of popnei,
a few seconds after the page opens; a setting the user changed in those
seconds would have been taken for one of the file's.

The project file also saves, with the numbers of each analysis, the
number its module raises when its calculation changes, its key version,
and, in its header, the version of the application. So a result that
differs because the application calculates it in another way since, with
the same popnei, is told as that, and not blamed on the variants file
(`docs/specs/core/store.md`, "The comparison with the check numbers").

## The TypeScript interface

The fields are `readonly` in the code, and every list `readonly T[]`;
`readonly` is left out below to keep the types short. A `JsonObject` is
an object whose fields are JSON values, of `docs/specs/core/keys.md`. A
`Result` is what a function that can fail with good code returns, one of
two shapes, given whole in `.claude/skills/coding/typescript.md`
("Errors"):

```ts
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

```ts
import type { JsonObject } from "./keys.ts";
import type { Result } from "./result.ts";
import type {
  VariantFilter, VariantFilterKind, IndividualFilter, IndividualFilterKind,
  IndividualsTable, ColumnType, CsvOptions, CsvFound, IndividualsFileError, RunError,
} from "../worker/protocol.ts";

/** The two applications. */
export type AppId = "popgen" | "gwas";

/**
 * The id of an analysis, a literal of its module, "diversity", "pca". A
 * string and not a union of the ids, so that adding an analysis adds its
 * module and nothing here (docs/architecture.md, section 4).
 */
export type AnalysisId = string;

export interface Project {
  app: AppId;
  variants: VariantSource | null;
  filters: VariantFilter[];                 // in the order the user gave
  individualFilters: IndividualFilter[];    // keep, remove, missing_data, obs_het
  individuals: IndividualsSource | null;
  grouping: Grouping;
  analyses: AnalysisOptions[];              // one per analysis the user set
  reference: Reference | null;              // from an opened project file
}
```

The variants file. The load id is 16 random bytes written as 32 lower
case hexadecimal digits, made by the page when the user picks the file
(`docs/architecture.md`, section 3). The ploidy of a VCF is a whole
number from 1 to 255, which popnei's `openVcf` accepts
(`js/popnei/src/io_vcf.ts`).

```ts
export interface VariantSource {
  fileId: string;
  name: string;          // as the browser gives it; in no key
  size: number;          // bytes; in no key
  format: "vcf" | "nei";
  readOptions: { ploidy: number; onlyPassed: boolean } | null; // a VCF's; null for .nei
  read: SourceRead;
}

export type SourceRead =
  | { kind: "pending" }
  | { kind: "read"; individuals: string[]; ploidy: number; numVars: number | null }
  | { kind: "failed"; error: SourceError };

/** popnei refused the file, or the worker failed before popnei answered:
    it could not start, it crashed, or the file could not be read again.
    A refusal of popnei is the first kind, never the second. */
export type SourceError =
  | { kind: "popnei"; message: string }
  | { kind: "worker"; error: Exclude<RunError, { kind: "popnei" }> };
```

The individuals file. A read of a CSV reports what the options that were
`"auto"` found; `found` is `null` for an xlsx.

```ts
export interface IndividualsSource {
  fileId: string;
  name: string;
  csv: CsvOptions | null;          // null for an xlsx
  read: IndividualsRead;
}

export type IndividualsRead =
  | { kind: "pending" }
  | { kind: "read"; table: IndividualsTable; columns: ColumnType[]; found: CsvFound | null }
  | { kind: "failed"; error: IndividualsFileError | { kind: "worker"; error: Exclude<RunError, { kind: "files" }> } };
```

A refusal of the reader of xlsx files is the `files` kind of
`IndividualsFileError`, never a failure of the worker.

The grouping: in population genetics, the column that defines the
populations, `null` when every individual is in one population, as it is
without an individuals file (`docs/functionality.md`, section 4); in
association, the role of each column. A column is named by its name in
the header, which the reader keeps unique, so that it is found again when
the file is loaded again with its columns in another order. The edits of
the populations drawn on the PCA with the mouse, which functionality
names for later, come with a design of their own, and the roles are
revised with the association application, in stage 7.

```ts
export type Grouping =
  | { kind: "populations"; column: string | null }
  | { kind: "roles"; roles: (readonly [column: string, role: "trait" | "covariate" | "ignored"])[] };
```

The options of an analysis the user has set; an analysis with no entry
runs with its defaults. They are a list of pairs and not an object with a
field per analysis, because the JSON of a project file can hold a field of
any name, `__proto__`, which JavaScript treats in a special way, among
them (`.claude/skills/coding/typescript.md`, "The rules of the code").

```ts
export interface AnalysisOptions {
  analysis: AnalysisId;
  options: JsonObject;       // whole, the defaults filled in
}
```

The reference: what an opened project file says of the variants file it
was made with and of the results it had. Its `variants.fileId` is the id
of a load of another session, and names no file of this one.

```ts
export interface Reference {
  variants: VariantSource;   // its identity: name, size, format, individuals, ploidy, numVars
  popneiVersion: string;     // from the header of the project file
  appVersion: string;        // from the header
  checks: Check[];
}

export interface Check {
  analysis: AnalysisId;
  numbers: (number | null)[];  // the check numbers saved; null where popnei gave NaN
  keyVersion: number;          // the analysis's key version when it was run
  settings: string;            // the fingerprint of its settings in the file; never saved
}
```

A new, empty project of one application.

```ts
export function emptyProject(app: AppId): Project;
// { app, variants: null, filters: [], individualFilters: [], individuals: null,
//   grouping: app === "popgen" ? { kind: "populations", column: null }
//                              : { kind: "roles", roles: [] },
//   analyses: [], reference: null }
```

The project frozen deeply, with `Object.freeze`, so that a write into it
throws. A part already frozen is taken as frozen with everything it
holds, and is not walked again, so freezing the project a command gave
costs only the parts that command made. Gives `p` itself.

```ts
export function freezeProject(p: Project): Project;
```

The constants and the types the other modules and the tests use:

```ts
/** The order the filters of the individuals are kept in. */
export const INDIVIDUAL_FILTER_ORDER: readonly IndividualFilterKind[]; // keep, remove, missing_data, obs_het
/** The largest ploidy of a VCF, which popnei's openVcf accepts. */
export const MAX_PLOIDY = 255;
/** The largest maxDist of the LD filter, 2^53 − 1, which popnei accepts. */
export const MAX_LD_DIST = Number.MAX_SAFE_INTEGER;
/** The version of the format of the project file this application
    writes; projectFile.ts writes it in the header, and a command checks
    the options of an analysis as of this version. */
export const FORMAT_VERSION = 1;
/** The deepest the options of an analysis are nested, in levels of lists
    and objects; deeper ones are refused, so that no check of them runs
    out of the stack of the browser. */
export const MAX_OPTIONS_DEPTH = 64;

/** A load of the variants file, as the page gives it before it is read. */
export type VariantLoad = Omit<VariantSource, "read">;

/** An analysis as the commands and the validation know it: its id, and
    the function of its module that checks its options. */
export interface ParsedAnalysis {
  id: AnalysisId;
  parseOptions(o: unknown, formatVersion: number): Result<JsonObject, string>;
}

/** The place of a field in the project, ["filters", 1, "maxAllowedMaf"]. */
export type FieldPath = readonly (string | number)[];
```

The checks of each value that the commands and `parseProject` share are
functions of `project.ts` that no other module imports.

### The commands

```ts
/** Puts a new load of the variants file, pending. Everything else is kept. */
export function loadVariants(p: Project, source: VariantLoad): Project;

/** Sets the filter of its kind: in its place when there is one, last otherwise. */
export function setVariantFilter(p: Project, filter: VariantFilter): Project;
export function removeVariantFilter(p: Project, kind: VariantFilterKind): Project;
/** Moves the filter of that kind to a position of the list, 0 the first. */
export function moveVariantFilter(p: Project, kind: VariantFilterKind, to: number): Project;

/** Sets the filter of its kind, in the fixed order of the kinds. */
export function setIndividualFilter(p: Project, filter: IndividualFilter): Project;
export function removeIndividualFilter(p: Project, kind: IndividualFilterKind): Project;

/** Puts a new load of the individuals file, pending; `csv` is null for an xlsx. */
export function loadIndividuals(p: Project, source: {
  fileId: string; name: string; csv: CsvOptions | null;
}): Project;
/** Sets how the CSV is read, and puts its read back to pending. */
export function setCsvOptions(p: Project, csv: CsvOptions): Project;
/** Sets the type of a column of the table read. */
export function setColumnType(p: Project, column: string, type: ColumnType): Project;
export function removeIndividuals(p: Project): Project;

export function setGrouping(p: Project, grouping: Grouping): Project;
/** Sets the options of an analysis, as its parseOptions gives them back. */
export function setAnalysisOptions(p: Project, analysis: ParsedAnalysis, options: JsonObject): Project;

/** The options of an analysis: its entry, or the defaults it is given. */
export function analysisOptions(p: Project, analysis: AnalysisId, defaults: JsonObject): JsonObject;
```

What each does where a reader could doubt it:

| command | when | gives |
|---|---|---|
| any, every row below included | the value equals the one there: the same filter, the same position, the same options of the CSV, the same type, the same grouping, the same options of an analysis, a load with the load id already there and the same other fields | `p` itself |
| any | a value `parseProject` would refuse in its place | a defect |
| `removeVariantFilter`, `removeIndividualFilter` | no filter of that kind | `p` itself |
| `removeIndividuals` | no individuals file | `p` itself |
| `moveVariantFilter` | no filter of that kind, or `to` not a whole number from 0 to the length of the list − 1 | a defect |
| `setCsvOptions` | no individuals file, or an xlsx | a defect |
| `setColumnType` | the file not read, a column not in the table, `identifier` for another column than the first, another type for the first, a `binary` type whose two values are not the two values of the column | a defect |
| `setGrouping` | a grouping of the other application | a defect |
| `setAnalysisOptions` | options its `parseOptions` refuses, of `FORMAT_VERSION`, or nested deeper than `MAX_OPTIONS_DEPTH` levels | a defect |
| `setAnalysisOptions` | no entry for the analysis | a new entry, last, also when the options are the defaults |
| `loadVariants`, `loadIndividuals` | the load id already there, with another field different | a defect: a new read of a file is a new load, with a new load id |
| `loadVariants` | a new load id | the filters, the individuals file, the grouping, the options and the reference kept |
| `loadIndividuals`, `setCsvOptions` | a new load id, or other options | the read pending; the grouping kept by the name of its column |

Two values are compared as the command keeps them, the fields its type
does not have left out, so an object of the caller with a field more is
the value already there when its other fields are.

`setAnalysisOptions` keeps the options its `parseOptions` gives back,
whole, the defaults filled in, as `parseProject` does, so that a project
reads back from its file equal to itself.

How the ploidy of a VCF already loaded is changed, which a new load with
the same load id cannot do, is the screen spec's, in stage 3.

`loadVariants` keeps the user's settings, which do not belong to one
file; `projectNeeds` and `individualsNeeds` then lock what the new file
does not allow, with their reasons. It also keeps the reference of an
opened project, what the project file said of the file it was made with:
the screen compares the name, the size, the individuals and the ploidy of
the new file with the reference's as soon as the file is read, and the
number of variants once a first calculation has counted it, and warns
when they differ, saying in what, "The project was made with
panel_2026.nei, 342 individuals and 1,203,554 variants; this file has 360
individuals", without refusing the file (`docs/functionality.md`, section
9, step 2; `docs/architecture.md`, section 8). The words and the place of
that warning are the screen spec's, with the project file, in stage 2.

`loadIndividuals` and `setCsvOptions` bring, with the new read, the types
inferred from the new table, and a type the user had changed is lost
(**Open 1**, below). When the new table has no column of the grouping's
name, the analyses that use the populations lock and say so; the grouping
is not changed in silence.

A `binary` type's two values are cells of its column as the table holds
them, compared exactly (`docs/specs/worker/protocol.md`): in a CSV the
text `"1"` and `"2"`, in an xlsx the numbers or the booleans. `one` and
`zero` are the two distinct values of the column that are not missing,
and `one` is not `zero`; a column with more or fewer than two such values
cannot be binary. The same rule holds in `setColumnType` and in
`parseProject`.

### The records

Each records a read into the source with that load id, and, for the
individuals file, with those options, while its read is pending or
failed because its worker failed, `{ kind: "worker" }`. Otherwise it
returns the project it was given: for no source with that load id, for a
source read, and for one whose read failed because popnei or the reader
refused the file, which the same file would give again. So a read that
comes back for a load the user has replaced changes nothing, and a read
that succeeds after a failure of the worker replaces the failure: with
the options of a CSV set to A, then B, then back to A, a first read of A
that failed when the worker crashed would otherwise stay, "could not be
read", after the second read of A, once the worker restarted, had
succeeded.

```ts
/** What the calculation worker read of the variants file of the load `fileId`. */
export function recordVariantsRead(p: Project, fileId: string, read: SourceRead): Project;

/** The number of variants, from the first pass over the load `fileId`;
    recorded when the source is read and its `numVars` is still null. */
export function recordVariantsCounted(p: Project, fileId: string, numVars: number): Project;

/** What the light worker read of the individuals file of the load `fileId`,
    with the options `csv` it was read with; recorded only when the source
    has that id and those options, so a read of options since changed is
    dropped (docs/architecture.md, section 6). */
export function recordIndividualsRead(
  p: Project, fileId: string, csv: CsvOptions | null, read: IndividualsRead,
): Project;
```

A read whose table `parseProject` would refuse, a column named twice, an
individual in two rows, is not recorded as it is: the reader is our code,
so the read is recorded as failed, `{ kind: "worker", error: { kind:
"defect", message } }`, the message saying what the validation refused.
Recorded as read, it would make a project whose file cannot be opened
again, and a command on another column of it would throw.

### What every analysis needs

```ts
/** The reason no analysis can run on this project, or null; the table above. */
export function projectNeeds(p: Project): string | null;

/** The reason an analysis that uses the individuals file cannot run, or null. */
export function individualsNeeds(p: Project): string | null;
```

### The validation

`parseProject` takes what `JSON.parse` gave of the project part of a
project file, and returns the project, or the first thing that is wrong
with it. It is given the application the file is opened in, the version
of the format of the file, from its header, and the analyses of the
application, each with the function that checks its options, since the
options of each analysis are its module's
(`docs/specs/core/store.md`, `AnalysisDef.parseOptions`). The header, its
versions and the check numbers are read by `projectFile.ts`, in stage 2,
which calls this; it makes the fingerprints, and they are validated here
when a project is read back in a test.

```ts
export function parseProject(
  data: unknown,
  app: AppId,
  formatVersion: number,
  analyses: readonly ParsedAnalysis[],
): Result<Project, ProjectError>;

export type ProjectError =
  | { kind: "otherApp"; found: AppId }
  | { kind: "unknownAnalysis"; id: string }
  // a field the type does not have; `path` is that of the object that has it
  | { kind: "unknownField"; path: FieldPath; name: string }
  | { kind: "missingField"; path: FieldPath }
  | { kind: "wrongValue"; path: FieldPath; expected: string }
  | { kind: "twoFiltersOfAKind"; path: FieldPath; filter: VariantFilterKind | IndividualFilterKind }
  | { kind: "filterOutOfOrder"; path: FieldPath }
  // the value of `path` repeats one before it in its list
  | { kind: "repeated"; path: FieldPath; what: "analysis" | "column" | "individual"; value: string }
  // `problem` ends a sentence whose subject is the field of `path`
  | { kind: "inconsistentTable"; path: FieldPath; problem: string };

/** The text the user reads. */
export function projectErrorText(error: ProjectError): string;
```

What it checks, beyond the shape of every field: every number finite; the
thresholds from 0 to 1, `maxDist` a whole number from 1 to 2^53 − 1, the
ploidy a whole number from 1 to 255, as popnei accepts; the size of a
variants file and its number of variants whole numbers of at least 0; a
load id of 32 lower case hexadecimal digits; at most one filter of each
kind in each list, and the individuals' in their order; the table as the
reader gives it: at least one column and one row, no name of the header
twice, every row as long as its header, the first cell of each row the
name of an individual, a text that is not empty, and no individual in two
rows; one type per column, the first `identifier` and no other; a binary
type whose `one` and `zero` are the two distinct values of its column
that are not missing, `one` not `zero`; nothing found of the options of
a CSV for an xlsx, whose `csv` is `null`; each analysis id one of those
given, once, with options nested at most `MAX_OPTIONS_DEPTH` levels, which
its `parseOptions` accepts; the application and the grouping of the
application given, with no column named twice in the roles; the reference
with its versions, and each check of an analysis among those given, once,
with a key version that is a whole number of at least 0 and a fingerprint
of 64 lower case hexadecimal digits.

- **A file of the other application** is refused: "This project file is
  of the association application. Open it there."
- **A file that names an analysis this version does not know** is refused
  whole, as the owner decided on 24 September 2026: "This project file has
  the analysis ‹id›, which this version of the application does not know:
  it was saved by another version of the application." The option not
  taken was to open it without that analysis.
- **A file saved by a newer version of the application** never reaches
  `parseProject`: the header of every project file holds the version of
  its format, and `projectFile.ts`, in stage 2, refuses a version newer
  than the ones it knows before it reads the rest, with "This project file
  was saved by a newer version of the application. Open it there, or save
  it again from it in an earlier format." (the words are that spec's).
- **A field the type does not have**, in a file whose version this
  application knows, is refused, as `unknownField`: such a file was
  changed by hand or damaged, since this version would not have written
  the field. This was decided here, not by the owner. Its text: "The
  project file cannot be opened: the second filter of the variants has a
  field "minRate", which the application does not write. The file was
  changed outside the application, or is damaged. Open a copy saved
  before the change, or make the project again."
- **The text of any other error names the field in words**, from a table
  in `project.ts` of every field of the project, with a position as an
  ordinal, in the pattern "The project file cannot be opened: ‹the field
  in words› ‹what is wrong›. The file was changed outside the
  application, or is damaged. Open a copy saved before the change, or
  make the project again.":
  - a wrong value: "the threshold of the second filter of the variants
    should be a number from 0 to 1";
  - a field missing: "the threshold of the second filter of the variants
    is missing";
  - two filters of one kind: "it has two filters of the variants by
    missing genotypes, and a project has at most one of each kind";
  - the filters of the individuals out of their order: "the filters of the
    individuals should be in the order individuals to keep, individuals to
    remove, missing genotypes, observed heterozygosity, and the second one
    is out of that order";
  - a value repeated: "the second analysis repeats the analysis
    diversity";
  - a table that does not agree with its types: "the type of the second
    column of the individuals file cannot be identifier: only the first
    column can have that type".

  The last sentence of these texts and of the one above, what the user
  can do, the owner decided on 24 September 2026; the option not taken
  was to end with what happened alone.

  A path such as `filters[1].maxAllowedMaf` is never shown, nor any value
  of the code: a kind of filter is named by what it filters on, in the
  words of `docs/functionality.md`, the kinds of the individuals' filters
  "individuals to keep", "individuals to remove", "missing genotypes" and
  "observed heterozygosity", and the options of a CSV by their names, "a
  comma, a semicolon or a tab". A limit that is the largest number a
  program can hold is not written: "a whole number, 1 or more".
- **A value of the file shown in a text**, the id of an unknown analysis,
  the name of a field the type does not have, a repeated value, is shown
  with its control and format characters escaped, those of the Unicode
  categories Cc and Cf, so that neither a new line nor a mark that
  reverses the direction of the text, U+202E, changes the text around it:
  a new line, a tab and a carriage return as `\n`, `\t` and `\r`, any
  other as `\u` and its four hexadecimal digits, `\u202e`, or `\u{e0001}`
  beyond them. Half of a pair that encodes one character, alone, is
  escaped in the same way. A quote and a backslash are shown as they are,
  since they are in the user's file. The value is cut after 40 of its
  characters, an escaped character counting as one and never cut inside
  its escape, with "…" after it. Two values that differ only after their
  40th character look the same in a text; that is taken, for a text of a
  line or two.

## The cases

- **An empty project.** `projectNeeds` gives "Load a variants file in the
  Variants step."
- **Two picks of files before the first read comes back.** Each pick has
  its own load id; the read of the first finds no source with its id, and
  `recordVariantsRead` returns the project unchanged.
- **A worker that could not start**, or crashed while it opened the file:
  the page records the read as failed with the worker's error, and every
  analysis is locked with the reason of the table above, instead of
  "Reading panel.nei." for ever. A read of the same load that succeeds
  after the worker restarts replaces the failure.
- **An opened project file.** `projectFile.ts` gives `parseProject` the
  project part, then makes a project with `variants: null` and the
  reference built from the file (`docs/architecture.md`, section 8). A
  pending read in a saved project is valid here; what the project file
  writes of a pending read is decided with the project file, in stage 2.

## How it is verified

With Vitest, at the functions above. Every test gives the function a
project frozen deeply with `Object.freeze`, so that a write into it throws
(`.claude/skills/coding/SKILL.md`, "The core").

- **Each command**, on a small project: the part that changed, and `toBe`,
  the same object, on every part that did not. A worked case: from
  `emptyProject("popgen")`, `setVariantFilter` of `{ kind: "maf",
  maxAllowedMaf: 0.95 }`, then of `{ kind: "missing_data",
  maxAllowedMissingRate: 0.1 }`, then of `{ kind: "maf", maxAllowedMaf:
  0.9 }`: the filters are `[maf 0.9, missing_data 0.1]`, the MAF filter
  replaced in its place; `setVariantFilter` of a new object `{ kind:
  "missing_data", maxAllowedMissingRate: 0.1 }` returns the project
  itself. Each row of the table of the commands, with its defect or its
  `p`.
- **Each record**: recorded into the source of its id; the project itself
  for another id, for a read already recorded, and, for the individuals
  file, for other `csv` options.
- **`projectNeeds`** and **`individualsNeeds`**, a case for each row of
  their tables, the individuals named.
- **`parseProject`**, a case for each check above, with its `kind` and its
  `path`; `projectErrorText` of `wrongValue` at `["filters", 1,
  "maxAllowedMaf"]` holds "the threshold of the second filter of the
  variants" and not `filters`.
- **Properties, with fast-check**, which draws random projects and
  sequences of commands, and shrinks a failure to the smallest one. For
  every project, `parseProject(JSON.parse(JSON.stringify(p)), …)` is ok
  and deeply equal to `p`. For every sequence of commands, each list has
  at most one filter of each kind and the individuals' filters are in
  their order; and a command applied twice with the same arguments
  returns, the second time, the project it was given.

## Open points

1. **The types the user set when the individuals file is read again.**
   `loadIndividuals` and `setCsvOptions` bring the types inferred from the
   new read, and a type the user had changed, a column of 1 and 2 made
   categorical, is lost. Keeping each by the name of its column, where the
   new values allow it, would spare the user setting it again after
   changing the separator. Meanwhile, they are lost, and the screen of the
   individuals step says so when it reads the file again.

The five that follow are the words of `projectNeeds` and
`individualsNeeds` that the owner took as provisional on 24 September
2026, to be judged on the screens of stage 2. A different answer to any
of them changes those texts and their tests, and nothing else.

2. **How the user is told to fix a list of individuals that names one
   more than once, or names individuals not in the variants file.**
   Meanwhile, both reasons end "Change the list, or remove the filter, in
   the Variants step.", the place and the words of the reason of an empty
   list. The review of the code changed, on 24 September 2026, the
   wording of the first reason, "names ind_031 twice", to "names ind_031
   more than once", which holds also of a name written three times.
3. **How many individuals a text names.** A reason can name hundreds of
   individuals, and a line beside the Run button holds a few. Meanwhile,
   three or fewer are all named, "ind_031, ind_044 and ind_050"; of more
   than three, the first two and how many more, "ind_031, ind_044 and 10
   more"; one alone has a sentence in the singular, "1 individual of
   panel.nei is not in pops.csv: ind_031." and "The list of individuals
   to keep names 1 individual that is not in panel.nei: ind_900."; they
   are named in the order of the variants file, or of the list. The
   singular of the second sentence of the individuals missing, "Add it to
   the file and load the file again in the Individuals step.", is the
   writer's.
4. **What happened, when a file could not be read for another reason
   than a refusal of its reader.** Meanwhile, by the kind of the
   worker's failure (`RunError`, `docs/specs/worker/protocol.md`): it
   could not start, "the application could not start its calculations";
   it crashed, or the message was a defect of our code, "the calculation
   stopped unexpectedly"; it is of another version of the page, "the page
   is out of date". Each is followed by "Reload the page and load it
   again." A refusal of the files wasm in the calculation worker, or of
   popnei in the light worker, which neither worker gives, is taken as a
   defect of our code, with its words; this is the writer's.
5. **The end, and the words, of a refusal of the reader of the
   individuals file**, the reader of CSV and TSV. "Reload the page and
   load it again." is wrong advice for a file whose rows are wrong, so,
   meanwhile, such a refusal ends "Load an individuals file in the
   Individuals step.", and says what the reader found: a file with no row
   below the header, "it has no row below the header"; two columns of one
   name, "two columns are named pop"; an individual in two rows, "the
   individual ind_031 is in two rows"; a row of the wrong length, "line 7
   has 3 cells where the header has 4", and "1 cell" for one. The spec of
   the reader, in stage 2, owns these words and may add refusals; the
   refusal of the files wasm keeps its row of the table.
6. **Which problem of the filters of individuals is named first, when
   there are several.** Meanwhile, the list of individuals to keep before
   the list to remove; within one list, an empty list first, then names
   repeated, then names not in the variants file.

## Not in this spec

- The project file, its header, its versions and the check numbers it
  writes: `docs/specs/core/projectFile.md`, stage 2.
- The keys, and how the fingerprint is made: `docs/specs/core/keys.md`.
- Undo and redo: `docs/specs/core/history.md`.
- The ids of the analyses and their options: the spec of each analysis,
  from stage 2.
