# The types the page, the workers and core share

Draft, 24 September 2026, not yet approved by the owner. There is no code
yet. This spec gives the part of `src/worker/protocol.ts` that core
names: the filters of the variants and of the individuals, the table of
the individuals file and the types of its columns, and a request to a
worker with its progress and its outcome. It is in stage 1 of
`docs/build-order.md` because the project and the store of core,
`docs/specs/core/project.md` and `docs/specs/core/store.md`, are written
with these types; the requests themselves and the messages come with the
workers in stage 2. It develops sections 2, 5 and 6 of
`docs/architecture.md`.

The applications run two workers, threads of the browser tab beside the
page, so that a long calculation does not freeze it: the calculation
worker, which runs popnei, and the light worker, which reads the
individuals file and writes xlsx and zip files (`docs/architecture.md`,
section 1). The page sends each a request and receives its outcome as a
message.

## What it does

`protocol.ts` holds types and nothing else, so that core, which is
checked with no part of the browser (`.claude/skills/coding/configs.md`),
can import it, and the workers and the page can too. A filter is declared
once, here, so that the project the user edits and the request the
calculation worker reads cannot describe it in two ways.

### The filters of the variants are popnei's

They are the four that popnei 0.1.0 has, methods of its `Variants` in
`js/popnei/src/variant.ts`, with the names of their arguments, and the
project holds the numbers popnei is given. Three things about them are
not what a reader of section 3 of `docs/functionality.md` would expect:

- **popnei keeps the variants whose number is at most a threshold.** The
  missing data filter takes the largest missing rate allowed,
  `maxAllowedMissingRate`, where functionality speaks of the smallest
  proportion of called genotypes; the two are one minus the other.
- **popnei's "maf" is the major allele frequency**, the count of the
  commonest allele over the called alleles, and a variant is kept when it
  is at most `maxAllowedMaf`, 0.95 by default. For a variant with two
  alleles that is a minor allele frequency of at least 0.05; for one with
  three or more alleles it is not, since the other alleles share the
  rest. The application calls it by what popnei does, "Maximum major
  allele frequency", as the owner decided on 24 September 2026, and
  section 3 of `docs/functionality.md` says so. The option not taken was
  to call it the minor allele frequency, which it is not for a variant
  with three alleles.
- **popnei takes one filter of each kind on a `Variants`.** A second
  `filterByMaf` throws, because two thresholds of one kind keep what the
  stricter keeps alone. So the project holds at most one filter of each
  kind (`docs/specs/core/project.md`), and the runner of the calculation
  worker, which puts the filters on a `Variants`, never adds a second:
  the PCA's own MAF filter of section 5 of `docs/functionality.md`, on a
  dataset that has a MAF filter already, is given as the one filter with
  the smaller threshold of the two, which keeps what the two would.

The number the user types is the number popnei is given, with no
arithmetic between them. A conversion would move the boundary: 1 − 0.9 is
0.09999999999999998 in the arithmetic of a computer, and a variant with a
missing rate of exactly 0.1 would be dropped by a filter the user set to
keep it. So the screen of the variants step names what popnei filters on,
"Maximum proportion of missing genotypes", "Maximum major allele
frequency", and the Python script writes the same numbers
(`docs/functionality.md`, section 9). The spec of the runner, in stage 2,
checks the boundary: a variant with a missing rate of exactly 0.1 is kept
by the filter the user set to 0.1.

The filter of the regions of a BED file, of section 3 of
`docs/functionality.md`, is not in popnei 0.1.0, and joins the union in
stage 3 (`docs/build-order.md`, open point 2).

### The filters of the individuals are the application's

popnei has one filter of individuals, `filterIndividuals`, which keeps the
individuals of a list, one per `Variants`. The four filters of
individuals of section 3 of `docs/functionality.md`, a list to keep, a
list to remove, and a threshold on the missing rate or on the observed
heterozygosity of each individual, are the application's: the thresholds
are arithmetic on popnei's statistics per individual
(`docs/build-order.md`, section 4), and the calculation worker makes of
them all the one list it gives `filterIndividuals`, with the individuals
in the order of the variants file. The individuals kept are those that
every filter keeps, whatever the order of the filters, so the project
keeps them in a fixed order, by kind, and the user does not order them.
How the runner makes the list is its spec, in stage 3.

popnei refuses a list that is empty, that names an individual twice, or
that names one that is not in the variants. Core checks the lists before
any request, and the analyses are locked with a reason that names the
individuals (`docs/specs/core/project.md`, "What an analysis needs of
every project").

## The TypeScript interface

Every field is `readonly`, and every array `readonly T[]`, in the code, as
core asks of the project (`.claude/skills/coding/SKILL.md`, "The core");
`readonly` is left out of the fields below to keep them short.

A filter of the variants, with popnei's argument names. The thresholds
are numbers from 0 to 1, and `maxDist` a whole number of base pairs from
1 to 2^53 − 1, the ranges popnei's methods accept.

```ts
export type VariantFilter =
  | { kind: "missing_data"; maxAllowedMissingRate: number } // filterByMissingData
  | { kind: "maf"; maxAllowedMaf: number }                  // filterByMaf: the major allele
  | { kind: "obs_het"; maxAllowedObsHet: number }           // filterByObsHet
  | { kind: "ld"; maxAllowedR2: number; maxDist: number };  // filterByLd

export type VariantFilterKind = VariantFilter["kind"];
```

The `kind` of each is the name popnei gives the filter in the counts of a
pass (`Step.kind` in `js/popnei/src/filters.ts`), so what each filter
kept is found under its kind.

A filter of the individuals. The names are those of the individuals of
the variants file.

```ts
export type IndividualFilter =
  | { kind: "keep"; individuals: readonly string[] }
  | { kind: "remove"; individuals: readonly string[] }
  | { kind: "missing_data"; maxAllowedMissingRate: number } // of each individual
  | { kind: "obs_het"; maxAllowedObsHet: number };          // of each individual

export type IndividualFilterKind = IndividualFilter["kind"];
```

The table of the individuals file, as the light worker read it. A cell is
text, a number, a boolean, or `null` when it is missing: an empty cell,
`NA` or `-` (`docs/functionality.md`, section 4). The cells of a CSV or
TSV are text, as written in the file; numbers and booleans come only from
an xlsx, as the files wasm, the small module of ours that reads xlsx,
gives them. The first column names the individuals. Every row is as long
as the header.

```ts
export type Cell = string | number | boolean | null;

export interface IndividualsTable {
  columns: readonly string[];            // the names of the header, in the order of the file
  rows: readonly (readonly Cell[])[];    // one per individual, in the order of the file
}
```

The type of a column, as the reader inferred it and the user set it
(`docs/functionality.md`, section 4). A binary column holds its two
values and which is coded 1. They are two cells of the column as the
table holds them, compared exactly: in a CSV the text `"1"`, in an xlsx
the number `1` or the boolean `true`. A text `"1"` and a number `1` are
never compared, since the cells of one column come from one file. A
missing cell is not one of the two values.

```ts
export type ColumnType =
  | { kind: "identifier" }
  | { kind: "binary"; one: string | number | boolean; zero: string | number | boolean }
  | { kind: "continuous" }
  | { kind: "categorical" };
```

How a CSV or TSV is read, and what the reader found where an option was
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

The ways the individuals file can be refused. The reader's spec, in stage
2, owns this union and may add to it; these are the ones the documents
name already.

```ts
export type IndividualsFileError =
  | { kind: "empty" }                                  // no row below the header
  | { kind: "duplicateColumn"; name: string }          // two columns of one name
  | { kind: "duplicateIndividual"; name: string }      // one individual in two rows
  | { kind: "raggedRow"; line: number; expected: number; found: number }
  | { kind: "files"; message: string };                // the xlsx reader refused the file
```

A request to a worker, as `.claude/skills/coding/worker.md` gives it. `id`
is the number of the request, counted up from 1 for the life of the page.
`cancel()` takes a request that waits in the queue out of it, or, for one
that runs, ends its worker and starts another (`docs/architecture.md`,
section 5). The outcome is a promise, a value that arrives later, and it
never fails: a failure is one of its values.

```ts
export interface Progress { done: number; total: number }

export interface Run<R> {
  id: number;
  outcome: Promise<Outcome<R>>;
  cancel(): void;
}

export type Outcome<R> =
  | { kind: "done"; key: string; result: R }
  | { kind: "failed"; error: RunError }
  | { kind: "cancelled" };

export type RunError =
  | { kind: "popnei"; message: string }       // a call to popnei threw
  | { kind: "files"; message: string }        // a call to the files wasm threw
  | { kind: "workerFailed"; message: string } // the worker crashed, or threw outside a call
  | { kind: "couldNotStart"; reason: string } // no `ready` from the worker, twice
  | { kind: "protocolMismatch" }              // a stale file after a deploy
  | { kind: "defect"; message: string };      // a message that did not validate
```

The key travels as a `string`, since `protocol.ts` imports nothing of
core; core makes its own type of key of it with `keyFromWire`
(`docs/specs/core/keys.md`).

## The cases

- **Only an `Error` thrown by a call to popnei is of kind `popnei`.** The
  runner catches what a call to popnei throws, at that call, and nothing
  else (`.claude/skills/coding/typescript.md`, "Errors"). A mistake of our
  runner outside such a call, a `TypeError` of ours, reaches the worker's
  error handler and is `workerFailed`. So a `popnei` error is popnei's
  judgement of the data, which the same data gives again every time, and
  the store keeps it (`docs/specs/core/store.md`); the others can go the
  next time, and it does not.
- **A crash of popnei's code**, a panic of Rust, which in the browser
  ends the calculation with a `WebAssembly.RuntimeError`, is
  `workerFailed`: the worker is not trusted after it and is started again
  (`.claude/skills/coding/worker.md`).
- **A threshold outside its range** is refused by the validation of a
  project file (`docs/specs/core/project.md`), before popnei would refuse
  it; a command is never given one.

## How it is verified

Types have no test of their own. The compiler checks them where they are
used: the tests of core build projects with every kind of filter, and
`tsc -b` with `tsconfig.core.json` checks that `protocol.ts` names nothing
of the browser. That the fields of the filters are popnei's arguments,
the boundary of 0.1 above, and the PCA's MAF filter given as one filter,
are checked by the tests of the runner, in stage 2.

## Open points

None.

## Not in this spec

- `Job`, `JobResult`, `PROTOCOL_VERSION`, and the messages: the spec of
  the workers, stage 2.
- The reader of the individuals file, and how a text cell becomes a
  number with the decimal mark found: `docs/specs/worker/individuals.md`,
  stage 2.
- The filter of the regions of a BED file, and how the runner makes the
  list of individuals from the filters: stage 3.
