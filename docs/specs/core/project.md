# The project and its commands

Draft, 24 September 2026, not yet approved by the owner. There is no code
yet. The project is everything the user has set in one application: the
variants file they loaded, the filters, the individuals file with the
types of its columns, the populations, and the options of each analysis.
This spec gives its type, the commands that change it, the records that
the workers' reads put into it, and the validation that turns the JSON of
a project file into a project. It develops the row of `project.ts` in
section 9 of `docs/architecture.md`, with its sections 2, 6 and 8, and
`result.ts`, which `.claude/skills/coding/typescript.md` gives whole
("Errors") and which has no spec of its own. It depends on
`docs/specs/worker/protocol.md`, for the filters and the table, and on
`docs/specs/core/keys.md`, for the type of a JSON value.

## What it does

A user never sees the project, and sees everything that follows from it.
A command that changed a part it should not have would show a result for
settings the user did not choose; one that returned a new object when
nothing changed would add a step to undo that does nothing; a validation
that let a wrong field through would open a project file whose analyses
fail later with a message about something else.

The rules, which every function below keeps:

- **The project is one plain, immutable value** (`docs/architecture.md`,
  section 2): strings, finite numbers, booleans, `null`, arrays and plain
  objects, every field `readonly`. Saving it is `JSON.stringify`, and
  `parseProject` of what that wrote gives an equal project.
- **A command is a pure function from a project to a project**, which
  builds the new one with spread and keeps the same reference for every
  part it did not change. A command that changes nothing returns the
  project it was given, the same object, so that the store makes no step
  of undo for it (`docs/specs/core/store.md`).
- **A command is given valid values.** The screens build them from widgets
  that allow only valid ones, a number field from 0 to 1, a list of the
  columns of the file. A value out of its range reaching a command is a
  defect of the screen, and the command throws `popnei_web defect:`, as
  `.claude/skills/coding/typescript.md` says of defects. What comes from
  outside the program, the JSON of a project file, goes through
  `parseProject`, which returns a `Result` instead.
- **One filter of each kind**, in the variants' list and in the
  individuals' list, because popnei refuses a second filter of a kind on
  one `Variants` (`docs/specs/worker/protocol.md`). Setting a filter of a
  kind that is there replaces it in its place; the order of the list is
  the order the user gave, and it changes the result, so no command sorts
  it.
- **A record is not a command.** When the calculation worker has opened
  the variants file, or the light worker has read the individuals file,
  what they read goes into the source with that load id and no other, as
  section 6 of `docs/architecture.md` has it. The functions that do it are
  here, pure as the commands are; the store applies them to every project
  of the history and makes no step of undo (`docs/specs/core/history.md`).

### The project of an opened project file

A project file restores the settings and none of the results: the user
gives the variants file again, and every analysis is calculated again. The
variants file is the user's, and nothing tells the application that the
file given is the one the project was saved with; it may be another, or
the same one changed. The check numbers, a few numbers of each result
kept in the project file, are what tells: after a run, the numbers of the
new result are compared with those saved (`docs/functionality.md`,
section 9).

That comparison means something only while the settings of the analysis
are those the file had. So, when a project file is opened, a fingerprint
of the settings of each analysis as the file had them is made and kept in
the project, beside the numbers: a hash of everything the analysis's key
holds but the load of the variants file and the version of popnei
(`docs/specs/core/keys.md`, "The fingerprint of the settings"). After a
run, the numbers are compared only when the fingerprint of the settings
now is that one. The owner decided it on 24 September 2026. The option
not taken was the architecture as approved that day: the key of the
reference, made once the calculation worker had given the version of
popnei, which left a moment after opening in which a change to the
settings would have been taken for the file's own, and put a value in the
project that was calculated and never saved. The fingerprint needs no
version, since the version of popnei cannot differ between the two sides
of the comparison, is made at the opening with nothing to wait for, and
is data read from the file, as the identity of the variants file is.

What the comparison says when the versions of popnei differ is in
`docs/specs/core/store.md`.

## The TypeScript interface

The fields are `readonly` in the code, and left out below to keep the
types short.

```ts
import type { JsonObject } from "./keys.ts";
import type { Result } from "./result.ts";
import type {
  VariantFilter, VariantFilterKind, IndividualFilter, IndividualsTable,
  ColumnType, CsvOptions, CsvFound, IndividualsFileError,
} from "../worker/protocol.ts";

/** The two applications. */
export type AppId = "popgen" | "gwas";

/**
 * The id of an analysis, a literal of its module, "diversity", "pca". It
 * is a string and not a union of the ids, so that adding an analysis adds
 * its module and nothing here (docs/architecture.md, section 4).
 */
export type AnalysisId = string;

export interface Project {
  app: AppId;
  variants: VariantSource | null;
  filters: readonly VariantFilter[];                 // in their order
  individualFilters: readonly IndividualFilter[];    // in their order
  individuals: IndividualsSource | null;
  grouping: Grouping;
  analyses: readonly AnalysisOptions[];              // one per analysis the user set
  reference: Reference | null;                       // from an opened project file
}
```

The variants file, as section 2 of `docs/architecture.md` gives it. The
load id is 16 random bytes written as 32 lower case hexadecimal digits,
made by the page (`docs/architecture.md`, section 3).

```ts
export interface VariantSource {
  fileId: string;
  name: string;          // as the File gives it; in no key
  size: number;          // bytes; in no key
  format: "vcf" | "nei";
  readOptions: { ploidy: number; onlyPassed: boolean } | null; // a VCF's; null for .nei
  read: SourceRead;
}

export type SourceRead =
  | { kind: "pending" }
  | { kind: "read"; individuals: readonly string[]; ploidy: number; numVars: number | null }
  | { kind: "failed"; message: string };   // popnei's message
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
  | { kind: "read"; table: IndividualsTable; columns: readonly ColumnType[]; found: CsvFound | null }
  | { kind: "failed"; error: IndividualsFileError };
```

The grouping: in population genetics, the column that defines the
populations, `null` when every individual is in one population, as it is
without an individuals file (`docs/functionality.md`, section 4); in
association, the role of each column. A column is named by its name in the
header, which the reader keeps unique (`IndividualsFileError`
`duplicateColumn`), so that it is found again when the file is loaded
again with its columns in another order. The edits of the populations
made with the lasso come in a design of their own
(`.claude/skills/designing/SKILL.md`), and the roles are revised with the
association application, in stage 7.

```ts
export type Grouping =
  | { kind: "populations"; column: string | null }
  | { kind: "roles"; roles: readonly (readonly [column: string, role: "trait" | "covariate" | "ignored"])[] };
```

The options of an analysis the user has set. An analysis that has no
entry runs with its defaults. They are pairs and not a record keyed by the
id, because the JSON of a project file can hold any key, `__proto__`
among them (`.claude/skills/coding/typescript.md`, "The rules of the
code").

```ts
export interface AnalysisOptions {
  analysis: AnalysisId;
  options: JsonObject;       // whole, the defaults filled in
}
```

The reference: what an opened project file says of the variants file it
was made with and of the results it had. Its `variants.fileId` is the id
of a load of another session, and names no `File` of this one.

```ts
export interface Reference {
  variants: VariantSource;   // its identity: name, size, format, individuals, ploidy, numVars
  popneiVersion: string;     // from the header of the project file
  checks: readonly Check[];
}

export interface Check {
  analysis: AnalysisId;
  numbers: readonly (number | null)[];   // the check numbers saved; null where popnei gave NaN
  settings: string;          // the fingerprint of its settings in the file (keys.md)
}
```

A new project, empty, of one application.

```ts
export function emptyProject(app: AppId): Project;
// { app, variants: null, filters: [], individualFilters: [], individuals: null,
//   grouping: app === "popgen" ? { kind: "populations", column: null }
//                              : { kind: "roles", roles: [] },
//   analyses: [], reference: null }
```

### The commands

Each returns the project it was given when the value is the one already
there.

```ts
/** Puts a new load of the variants file, pending. Everything else is kept. */
export function loadVariants(p: Project, source: {
  fileId: string; name: string; size: number; format: "vcf" | "nei";
  readOptions: { ploidy: number; onlyPassed: boolean } | null;
}): Project;

/** Sets the filter of its kind: in its place when there is one, last otherwise. */
export function setVariantFilter(p: Project, filter: VariantFilter): Project;
export function removeVariantFilter(p: Project, kind: VariantFilterKind): Project;
/** Moves the filter of that kind to a position of the list, 0 the first. */
export function moveVariantFilter(p: Project, kind: VariantFilterKind, to: number): Project;

export function setIndividualFilter(p: Project, filter: IndividualFilter): Project;
export function removeIndividualFilter(p: Project, kind: IndividualFilter["kind"]): Project;
export function moveIndividualFilter(p: Project, kind: IndividualFilter["kind"], to: number): Project;

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
export function setAnalysisOptions(p: Project, analysis: AnalysisId, options: JsonObject): Project;
/** The options of an analysis: its entry, or the defaults it is given. */
export function analysisOptions(p: Project, analysis: AnalysisId, defaults: JsonObject): JsonObject;
```

What each keeps, where a reader could doubt it:

- `loadVariants` keeps the filters, the individuals file, the grouping and
  the options, which are the user's and do not belong to one file; the
  analyses whose individuals are not all in the individuals file lock
  with their reason (`docs/architecture.md`, section 6). It keeps the
  reference, which is how the identity of the new file is compared with
  the one the project was made with (section 8).
- `loadIndividuals` and `setCsvOptions` put the read to pending, and the
  types of the columns that the user had set go with the old read: the
  new read brings the types inferred from the new table (**Open 1**,
  below). The grouping is kept, by the name of its column, and when the
  new table has no column of that name, the analyses that use the
  populations lock and say so; it is not changed in silence.
- `setColumnType` throws a defect when the source is not read, when the
  column is not in the table, when the type is `identifier` for another
  column than the first, and when a `binary` type names values that are
  not the two values of the column.

### The records

Each returns the project it was given when there is nothing to record:
no source with that load id, or a source whose read is not pending. A
read that comes back for a load the user has replaced, or after a
restart of a worker has read the file again, changes nothing.

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

### The validation

`parseProject` takes what `JSON.parse` gave from the project part of a
project file and returns the project, or the first thing that is wrong
with it. It is given the analyses of the application, each with the
function that checks its options, since the options of each analysis are
its module's (`docs/specs/core/store.md`, `AnalysisDef.parseOptions`).
The header of the file, its version and the check numbers are read by
`projectFile.ts`, in stage 2, which calls this.

```ts
export function parseProject(
  data: unknown,
  analyses: readonly { id: AnalysisId; parseOptions(o: unknown): Result<JsonObject, string> }[],
): Result<Project, ProjectError>;

export type ProjectError =
  | { kind: "wrongValue"; path: string; expected: string }  // "filters[1].maxAllowedMaf", "a number from 0 to 1"
  | { kind: "unknownAnalysis"; path: string; id: string }
  | { kind: "twoFiltersOfAKind"; path: string; kind: string }
  | { kind: "inconsistentTable"; path: string; expected: string };

/** The text the user reads: "The project file is damaged: filters[1].maxAllowedMaf
    should be a number from 0 to 1." */
export function projectErrorText(error: ProjectError): string;
```

What it checks, beyond the shape of every field: every number finite; the
thresholds of the filters from 0 to 1, `maxDist` a whole number from 1 to
2^53 − 1, the ploidy a whole number from 1 to 255, as popnei's methods
accept (`js/popnei/src/variant.ts`); a load id of 32 lower case
hexadecimal digits; at most one filter of each kind in each list; every
row of the table as long as its header, and one type per column, the
first `identifier`; a binary type whose two values are the values of its
column; each analysis id one of those given, once, with options that its
`parseOptions` accepts; the grouping of the application's kind. A field
that the type does not have is refused, `wrongValue` with the expectation
"no field of this name", so that a file written by a newer version is not
read as if it said less than it does.

## The cases

- **An empty project.** Every analysis is locked by its `needs` with "Load
  a variants file in the Variants step" (`docs/specs/core/store.md`).
- **Two picks of files before the first read comes back.** Each pick has
  its own load id; the read of the first finds no source with its id, and
  `recordVariantsRead` returns the project unchanged.
- **The same individuals file picked twice.** Two loads, two ids, and the
  same table. The table, not the id, goes into the keys
  (`docs/specs/core/keys.md`), so the results of the first load are found
  for the second, where for the variants file they are not
  (`docs/architecture.md`, sections 3 and 6).
- **An opened project file.** `projectFile.ts` gives `parseProject` the
  project part, then makes a project with `variants: null` and the
  reference built from the file (`docs/architecture.md`, section 8). A
  project with a pending read in it is valid here; what the project file
  writes of a pending read is decided with the project file, in stage 2.

## How it is verified

With Vitest, at the functions above. Every test gives the function a
project frozen deeply, so that a write into it throws
(`.claude/skills/coding/SKILL.md`, "The core").

- **Each command**, on a small project: the part that changed, and `toBe`
  on every part that did not. A worked case: from `emptyProject("popgen")`,
  `setVariantFilter` of `{ kind: "maf", maxAllowedMaf: 0.95 }`, then of
  `{ kind: "missing_data", maxAllowedMissingRate: 0.1 }`, then of
  `{ kind: "maf", maxAllowedMaf: 0.9 }`: the filters are
  `[maf 0.9, missing_data 0.1]`, the MAF filter replaced in its place;
  `setVariantFilter` of `missing_data 0.1` again returns the project
  itself.
- **Each record**: recorded into the source of its id; the project itself
  for another id, for a read already recorded, and, for the individuals
  file, for other `csv` options.
- **`parseProject`**, a case for each check above, with its `kind` and
  its `path`, and not its wording.
- **Properties, with fast-check.** A generator of projects of a few
  individuals, filters and analyses, and one of sequences of commands with
  valid arguments. For every project, `parseProject(JSON.parse(
  JSON.stringify(p)), analyses)` is ok and deeply equal to `p`. For every
  sequence of commands, the result has at most one filter of each kind in
  each list, and a command applied twice with the same arguments returns
  at the second time the project it was given.

## Open points

1. **The types the user set when the individuals file is read again.**
   `loadIndividuals` and `setCsvOptions` bring the types inferred from the
   new read, and a type the user had changed, a column of 1 and 2 made
   categorical, is lost. Keeping each by the name of its column, when the
   new values allow it, would spare the user setting it again after
   changing the separator. Meanwhile, they are lost, and the screen of the
   individuals step says so when it reads the file again.

## Not in this spec

- The project file, its header, its versions and the check numbers it
  writes: `docs/specs/core/projectFile.md`, stage 2.
- The keys, and the fingerprint of the settings: `docs/specs/core/keys.md`.
- Undo and redo: `docs/specs/core/history.md`.
- The ids of the analyses and their options: the spec of each analysis,
  from stage 2.
