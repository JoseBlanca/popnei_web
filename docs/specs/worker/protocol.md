# The types the page, the workers and core share

Draft, 24 September 2026, not yet approved by the owner. There is no code
yet. This spec gives the part of `src/worker/protocol.ts` that core names:
the filters of the variants and of the individuals, the table of the
individuals file and the types of its columns, and a run of a worker with
its progress and its outcome. It develops the row of `protocol.ts` in
section 9 of `docs/architecture.md`, with sections 2, 5 and 6. The jobs
and their results, `Job` and `JobResult`, and the messages of
`messages.ts`, come with the workers in stage 2 of `docs/build-order.md`,
in a spec of their own; this one is in stage 1 because the project of
core, `docs/specs/core/project.md`, and its store,
`docs/specs/core/store.md`, are written with these types.

## What it does

`protocol.ts` holds types and nothing else: no function, no value of
popnei, no type of the DOM, so that core, which is checked with no DOM
(`.claude/skills/coding/configs.md`), can import it, and the workers and
the page can too. A filter is declared once, here, so that the project
that the user edits and the request that the calculation worker reads
cannot describe it in two ways (`.claude/skills/coding/worker.md`).

The filters of the variants are the four that popnei 0.1.0 has, as
methods of its `Variants` in `js/popnei/src/variant.ts`, with the names
of their arguments. Two things about them are not what a reader of
`docs/functionality.md` would expect:

- **popnei's filters keep the variants whose number is at most a
  threshold.** The missing data filter takes the largest missing rate
  allowed, `maxAllowedMissingRate`, where section 3 of
  `docs/functionality.md` speaks of the smallest proportion of called
  genotypes; the two are one minus the other. And popnei's "maf" is the
  major allele frequency, the count of the commonest allele over the
  called alleles, kept when it is at most `maxAllowedMaf`, where
  functionality speaks of the minor allele frequency, at least 0.05. For
  a variant with two alleles a minor allele frequency of at least 0.05 is
  a major one of at most 0.95; for one with three or more alleles it is
  not the same filter, since the minor alleles share the rest. The
  project holds popnei's numbers, and the screen of the variants step
  shows them in the words of functionality and converts them.
- **popnei takes one filter of each kind.** A second `filterByMaf` on the
  same `Variants` throws, because two thresholds of one kind keep what the
  stricter keeps alone. So the list of filters in the project holds at
  most one of each kind, which its commands keep true
  (`docs/specs/core/project.md`).

The filter of the regions of a BED file, of section 3 of
`docs/functionality.md`, is not in popnei 0.1.0, and is added to the
union in stage 3, when it is decided whether popnei or the application
filters them (`docs/build-order.md`, open point 2).

popnei has one filter of individuals, `filterIndividuals`, which keeps
the individuals of a list, and one per `Variants`. The four filters of
individuals of section 3 of `docs/functionality.md`, a list to keep, a
list to remove, and a threshold on the missing rate or the observed
heterozygosity of each individual, are the application's: the
thresholds are arithmetic on popnei's statistics per individual, as
section 4 of `docs/build-order.md` says, and the calculation worker turns
them all into the one list it gives `filterIndividuals`. How it does,
and in which order the filters of individuals and of variants are put on
the `Variants`, is the spec of the runner, in stage 3.

## The TypeScript interface

Every field is `readonly` and every array `readonly T[]`, as core asks of
the project (`.claude/skills/coding/SKILL.md`, "The core"); the
`readonly` of the fields is left out below to keep the types short, and is
in the code.

A filter of the variants, with popnei's argument names. The thresholds
are numbers from 0 to 1, and `maxDist` a whole number of base pairs from
1 to 2^53 − 1, the ranges popnei's methods accept.

```ts
export type VariantFilter =
  | { kind: "missing_data"; maxAllowedMissingRate: number } // filterByMissingData
  | { kind: "maf"; maxAllowedMaf: number }                  // filterByMaf, the major allele
  | { kind: "obs_het"; maxAllowedObsHet: number }           // filterByObsHet
  | { kind: "ld"; maxAllowedR2: number; maxDist: number };  // filterByLd

export type VariantFilterKind = VariantFilter["kind"];
```

The `kind` of each is the name popnei gives the filter in the counts of
a pass (`Step.kind` in `js/popnei/src/filters.ts`), so the counts of what
each filter kept are found under the kind of the filter.

A filter of the individuals. The names are those of the individuals of
the variants file.

```ts
export type IndividualFilter =
  | { kind: "keep"; individuals: readonly string[] }
  | { kind: "remove"; individuals: readonly string[] }
  | { kind: "missing_data"; maxAllowedMissingRate: number } // of each individual
  | { kind: "obs_het"; maxAllowedObsHet: number };          // of each individual
```

The table of the individuals file, as the light worker read it. A cell
is text, a number, a boolean, or `null` when it is missing: an empty
cell, `NA` or `-` (`docs/functionality.md`, section 4). The cells of a
CSV or TSV are text, as they are written in the file; numbers and
booleans come only from the cells of an xlsx, as the files wasm gives
them. The first column names the individuals.

```ts
export type Cell = string | number | boolean | null;

export interface IndividualsTable {
  columns: readonly string[];            // the names in the header, in the order of the file
  rows: readonly (readonly Cell[])[];    // one per individual, in the order of the file,
}                                        // each as long as `columns`
```

The type of a column, as the reader inferred it and as the user set it
(`docs/architecture.md`, section 2; `docs/functionality.md`, section 4).

```ts
export type ColumnType =
  | { kind: "identifier" }
  | { kind: "binary"; one: string | number; zero: string | number }
  | { kind: "continuous" }
  | { kind: "categorical" };
```

How a CSV or TSV is read, and what the reader found when an option was
`"auto"`, which the screen shows beside the file.

```ts
export interface CsvOptions {
  encoding: "auto" | "utf-8" | "windows-1252";
  separator: "auto" | "," | ";" | "\t";
  decimal: "auto" | "." | ",";
}

export interface CsvFound {
  encoding: "utf-8" | "windows-1252";
  separator: "," | ";" | "\t";
  decimal: "." | ",";
}
```

The ways the individuals file can be refused. The reader's spec, in
stage 2, owns this union and may add to it; these are the ones the
documents already name.

```ts
export type IndividualsFileError =
  | { kind: "empty" }                                         // no row below the header
  | { kind: "duplicateColumn"; name: string }                // two columns of one name
  | { kind: "duplicateIndividual"; name: string }            // one individual in two rows
  | { kind: "raggedRow"; line: number; expected: number; found: number }
  | { kind: "files"; message: string };                       // the files wasm refused an xlsx
```

A run: the handle that the client gives for a request, its progress and
its outcome, as `.claude/skills/coding/worker.md` gives them. `id` is the
number of the request, counted up from 1 for the life of the page, and
`cancel()` takes a queued request out of the queue, or ends the worker of
a running one and starts another (`docs/architecture.md`, section 5).

```ts
export interface Progress { done: number; total: number }

export interface Run<R> {
  id: number;
  outcome: Promise<Outcome<R>>;   // never rejects
  cancel(): void;
}

export type Outcome<R> =
  | { kind: "done"; key: string; result: R }
  | { kind: "failed"; error: RunError }
  | { kind: "cancelled" };

export type RunError =
  | { kind: "popnei"; message: string }       // popnei refused the input
  | { kind: "files"; message: string }        // the files wasm refused a file
  | { kind: "workerFailed"; message: string } // a trap of the wasm, an error event
  | { kind: "couldNotStart"; reason: string } // no `ready`, twice
  | { kind: "protocolMismatch" }              // a stale file after a deploy
  | { kind: "defect"; message: string };      // a message that did not validate
```

The key travels as a `string`, since `protocol.ts` imports nothing of
core; core makes a `Key` of it with `keyFromWire`
(`docs/specs/core/keys.md`).

## The cases

A `RunError` of kind `popnei` is the only one that the same inputs give
again: popnei refuses the same data with the same message every time. The
others come from the worker, the network or a stale file, and a second
try can succeed. The store keeps the first kind and forgets the others
(`docs/specs/core/store.md`, "A calculation that failed").

A threshold outside its range is refused twice: by the validation of the
project (`docs/specs/core/project.md`) and by popnei, which throws. The
first keeps a wrong project file from being opened; the second is
popnei's promise and is not relied on.

## How it is verified

Types alone have no test of their own. The compiler checks them where
they are used: core's tests build projects with every kind of filter,
and `tsc -b` with `tsconfig.core.json` checks that `protocol.ts` names
nothing of the DOM. That the names of the filters' fields are popnei's
is checked when the runner calls popnei with them, in stage 2.

## Not in this spec

- `Job`, `JobResult`, `PROTOCOL_VERSION`, and the messages of
  `messages.ts`: the spec of the workers, stage 2.
- The reader of the individuals file, and how a text cell becomes a
  number with the decimal mark found: `docs/specs/worker/individuals.md`,
  stage 2.
- The filter of the regions of a BED file: stage 3.
