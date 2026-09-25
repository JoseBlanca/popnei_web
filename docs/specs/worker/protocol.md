# The types the page, the workers and core share

24 September 2026, approved by the owner on 24 September 2026; built in
`src/worker/protocol.ts`; revised on 25 September 2026 for the specs of
stage 2 the owner approved that day, as
`docs/specs/stage-2-open-points.md`, "Changes to approved files", lists.
This spec gives the part of `src/worker/protocol.ts` that core
names: the filters of the variants and of the individuals, the table of
the individuals file and the types of its columns, a request to a
worker with its progress and its outcome, and the request and the result
of each analysis, `Job` and `JobResult`. The stages are the steps in
which the applications are built, in `docs/build-order.md`: stage 1 the
core with no screen, stage 2 the walking skeleton, the smallest
application that goes through every part once, stage 3 the variants step,
stage 4 the individuals and the PCA. It is in stage 1 because the project and the store of core,
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
project holds the numbers popnei is given, as section 3 of
`docs/functionality.md` describes them:

- **Each keeps the variants whose number is at most a threshold.** The
  missing data filter takes the largest missing rate allowed,
  `maxAllowedMissingRate`.
- **popnei's "maf" is the major allele frequency**, the count of the
  commonest allele over the called alleles, and a variant is kept when it
  is at most `maxAllowedMaf`, 0.95 by default. The application calls it
  by what popnei does, "Maximum major allele frequency", as the owner
  decided on 24 September 2026. The option not taken was to call it the
  minor allele frequency, which it is only for a variant with two
  alleles.
- **popnei takes one filter of each kind on a `Variants`.** A second
  `filterByMaf` throws, because two thresholds of one kind keep what the
  stricter keeps alone. So the project holds at most one filter of each
  kind (`docs/specs/core/project.md`), and the runner, the code of the
  calculation worker that answers its requests and puts the filters on a
  `Variants`, never adds a second.

The PCA's own MAF filter, of section 5 of `docs/functionality.md`, meets
this last rule when the dataset has a MAF filter already. Two thresholds
of one kind keep what the stricter keeps alone only when they are applied
at the same point, and the steps of popnei run in their order: an LD
filter keeps a variant according to the variants kept before it, and a
frequency is counted over the individuals kept at that point. So the
runner gives the two as one filter, with the smaller threshold, in the
place of the dataset's, only when no LD filter comes after the dataset's
MAF filter and no filter of individuals is applied after it. Otherwise
the one filter would change what the dataset's LD filter keeps, and the
runner keeps the dataset's MAF filter as it is and adds none for the PCA,
as the PCA does not prune again when the dataset has pruned (section 5 of
functionality); the spec of the PCA, in stage 4, says how its result
warns of it. Placing the merged filter last was not taken, because it
would change the dataset's own filtering for the PCA alone, where the
user set it for every analysis.

The number the user types is the number popnei is given, with no
arithmetic between them. A conversion would move the boundary: 1 − 0.9 is
0.09999999999999998 in the arithmetic of a computer, and a variant with a
missing rate of exactly 0.1 would be dropped by a filter the user set to
keep it. So the screen of the variants step names what popnei filters on,
"Maximum proportion of missing genotypes", "Maximum major allele
frequency", and the Python script writes the same numbers
(`docs/functionality.md`, section 9). The spec of the runner, in stage 2,
checks the boundary at 0.05, since the missing rates of the panel it
tests on stop at 0.08: the 39 variants of `panel.nei` with a missing
rate of exactly 0.05 are kept by the filter the user set to 0.05
(`docs/specs/worker/runner.md`, "How it is verified").

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

How a CSV or TSV is read, and the three options the read used, each as
the user set it or, where it was `"auto"`, as the reader found it, which
the screen shows beside the file; which of them were `"auto"` the screen
knows from the options of the source. `"utf-16"` is found only from the
mark at the start of a file, and so cannot be set
(`docs/specs/worker/individuals.md`, "The bytes and the encoding").

```ts
export interface CsvOptions {
  encoding: "auto" | "utf-8" | "windows-1252";
  separator: "auto" | "," | ";" | "\t";
  decimal: "auto" | "." | ",";
}

export interface CsvFound {
  encoding: "utf-8" | "windows-1252" | "utf-16";
  separator: "," | ";" | "\t";
  decimal: "." | ",";
}
```

The ways the individuals file can be refused. The reader's spec,
`docs/specs/worker/individuals.md`, owns this union and the words of
each kind, "The refusals and their words"; the separator of `raggedRow`
and `unclosedQuote` is the one the read used, set or found, since a
wrong separator is the likeliest cause of both.

```ts
export type IndividualsFileError =
  | { kind: "empty" }                                  // no row of individuals
  | { kind: "duplicateColumn"; name: string }          // two columns of one name
  | { kind: "duplicateIndividual"; name: string }      // one individual in two rows
  | { kind: "raggedRow"; line: number; expected: number; found: number;
      separator: "," | ";" | "\t" }
  | { kind: "files"; message: string }                 // the xlsx reader refused the file, stage 4
  | { kind: "unnamedColumn"; column: number }          // values under no name; counted from 1
  | { kind: "emptyIndividual"; line: number }          // a row with no name of an individual
  | { kind: "unclosedQuote"; line: number;             // the line where the cell starts
      separator: "," | ";" | "\t" }
  | { kind: "tooLarge"; size: number; max: number }    // in bytes
  | { kind: "unreadable"; message: string }            // the browser's, for the console
  | { kind: "notText" };                               // not a text file
```

A request to a worker, as `.claude/skills/coding/worker.md` gives it. `id`
is the number of the request, counted up from 1 for the life of the page.
`cancel()` takes a request that waits in the queue out of it, or, for one
that runs, ends its worker and starts another (`docs/architecture.md`,
section 5). The outcome is a promise, a value that arrives later, and it
never fails: a failure is one of its values. The progress of a run is
the four numbers popnei's `Variants.onProgress` gives of each pass
(`js/popnei/src/variant.ts`), under popnei's names: the bytes of the
file the pass has read, `bytesRead`, of the bytes of the file,
`numBytes`, counted on the disk, so a gzipped VCF compressed; the pass
that reads, `pass`, 1 for the first; and the passes of the run,
`numPasses`. The run is `(pass − 1 + bytesRead / numBytes) / numPasses`
done (`docs/specs/worker/messages.md`, "The progress").

```ts
export interface Progress { bytesRead: number; numBytes: number; pass: number; numPasses: number }

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
  | { kind: "reopenFailed"; name: string; message: string } // the variants file no longer reads
  | { kind: "workerFailed"; message: string } // the worker crashed, or threw outside a call
  | { kind: "couldNotStart"; reason: string } // no `ready` from the worker, twice
  | { kind: "protocolMismatch" }              // a stale file after a deploy
  | { kind: "defect"; message: string };      // a message that did not validate
```

`reopenFailed` is a variants file the browser can no longer read,
changed, moved or deleted on the disk since the user picked it, with the
name of the file and popnei's message, which the client writes to the
console. A second try does not mend it, a new load of the file does, so
the user is told the file may have changed and to load it again, as the
owner decided on 25 September 2026 (point B of
`docs/specs/stage-2-open-points.md`); which refusals of popnei the runner
answers so is in `docs/specs/worker/runner.md`, "What it answers when
something goes wrong".

The key travels as a `string`, since `protocol.ts` imports nothing of
core; core makes its own type of key of it with `keyFromWire`
(`docs/specs/core/keys.md`).

The request of a calculation and its result are unions, `Job` and
`JobResult`, since the analyses of core build a `Job` and read a
`JobResult` and core imports no `messages.ts`
(`docs/specs/worker/messages.md`, "Job and JobResult"). Each analysis
adds one member to each, tagged with its id in the field `analysis`,
and its spec gives the fields; stage 2 has the diversity alone
(`docs/specs/analyses/diversity.md`, "The TypeScript interface"). The
populations are pairs in the order of the file, since their names are
the user's and never the names of fields.

```ts
export type Pops = readonly (readonly [pop: string, individuals: readonly string[]])[];

export interface DiversityJob {
  analysis: "diversity";
  fileId: string;                          // the load id of the variants file it reads
  filters: readonly VariantFilter[];
  individualFilters: readonly IndividualFilter[];
  pops: Pops;
  minNumIndividuals: number;
  polyThreshold: number;
}

export interface DiversityResult {
  analysis: "diversity";
  pops: readonly string[];                 // in the order of the job
  numIndividuals: Uint32Array;
  unbiasedExpHet: Float64Array;            // NaN for no value
  obsHet: Float64Array;
  polyRatio: Float64Array;
  numVarsWithValue: Uint32Array;
  numVars: number;                         // the variants the filters kept
  numVarsRead: number;                     // the variants of the file
}

export type Job = DiversityJob;
export type JobResult = DiversityResult;
```

The typed arrays of a result are types of the language, not of the
browser, so `protocol.ts` still names nothing of the browser.
`PROTOCOL_VERSION`, the version of the messages, is in `messages.ts`,
beside the messages it versions, and not here: core has no use for it.

## The cases

- **Only popnei's refusal of its input is of kind `popnei`.** popnei
  refuses an input by throwing a plain `Error`, whose constructor is
  `Error` itself, with its message (`js/popnei/README.md`). The runner
  catches what a call to popnei throws, at that call, and gives the kind
  `popnei` only to such an `Error`, which the same data gives again every
  time, so the store keeps it (`docs/specs/core/store.md`). A refusal
  whose message says the browser could not read the file is the
  exception: it is `reopenFailed`, above (`docs/specs/worker/runner.md`).
  What else a
  call can throw is an error of the engine of the browser and not a
  judgement of the data: a `RangeError` when the memory of popnei's code
  cannot grow for a large file, a `WebAssembly.RuntimeError` when popnei's
  Rust panics. Those are `workerFailed`, the worker is not trusted after
  them and is started again (`.claude/skills/coding/worker.md`), and the
  store does not keep them, since a second try, after other analyses have
  given back their memory, can succeed.
- **One refusal of popnei depends on more than the data**: a block of
  variants that the memory of popnei's code could not hold, which popnei
  refuses with a plain `Error` rather than a crash (`js/popnei/README.md`,
  on traps). It can succeed after a restart, which gives the memory back,
  and the runner cannot tell it from a refusal of the data by its type.
  Until popnei gives it a kind of its own, asked of popnei in its issue
  #3 on 24 September 2026, it is
  kept as a refusal, and a new load of the file, which restarts the
  worker, gives it another key.
- **A mistake of our runner outside a call to popnei**, a `TypeError` of
  ours, reaches the worker's error handler and is `workerFailed` too
  (`.claude/skills/coding/typescript.md`, "Errors").
- **A threshold outside its range** is refused by the validation of a
  project file (`docs/specs/core/project.md`), before popnei would refuse
  it; a command is never given one.

## How it is verified

Types have no test of their own. The compiler checks them where they are
used: the tests of core build projects with every kind of filter, and
`tsc -b` with `tsconfig.core.json` checks that `protocol.ts` names nothing
of the browser. That the fields of the filters are popnei's arguments,
and the boundary above, at 0.05, are checked by the tests of the runner,
in stage 2 (`docs/specs/worker/runner.md`); the PCA's MAF filter given
as one filter waits for the job of the PCA, in stage 4.

## Open points

None.

## Not in this spec

- The messages, their checks and `PROTOCOL_VERSION`:
  `docs/specs/worker/messages.md`. What each member of `Job` and
  `JobResult` means, and how it is checked when it arrives: the spec of
  its analysis, `docs/specs/analyses/diversity.md` in stage 2, and
  `messages.md`.
- The reader of the individuals file, the words of its refusals, and how
  a text cell becomes a number with the decimal mark found:
  `docs/specs/worker/individuals.md`.
- The filter of the regions of a BED file, and how the runner makes the
  list of individuals from the filters: stage 3.
