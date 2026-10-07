# The types the page, the workers and core share

24 September 2026, approved by the owner on 24 September 2026; built in
`src/worker/protocol.ts`; revised on 25 September 2026 for the specs of
stage 2 the owner approved that day, as
`docs/specs/stage-2-open-points.md`, "Changes to approved files", lists,
and again that day for the owner's decisions on the metadata file
(`docs/specs/worker/individuals.md`): `CsvFound` gains `undecodedLine`,
and `IndividualsFileError` the kinds `variantsFile` and `cutShort`;
revised on 26 September 2026 for stage 3, as the architecture approved
by the owner that day has it: the jobs carry the list of the individuals
kept, which core makes, in place of the filters of individuals; every
result carries the counts of its pass; the jobs and results of the three
analyses of the Variants step, the statistics of each individual, the
histograms of the variants and the counts of what each filter kept, join
`Job` and `JobResult`; and the request that writes the filtered variants
as a `.nei` file is new. The revision is approved by the owner on 26 September 2026.
Revised on 27 September 2026 for stage 4: the job and the result of the
principal components join `Job` and `JobResult`, and the passage on the
PCA's own MAF filter says how it is given to popnei, as
`docs/specs/analyses/pca.md` decides it; and, to agree with the specs
written beside it, the seven refusals of an xlsx join
`IndividualsFileError`, and the two values of a binary column are texts
(`docs/specs/worker/individuals.md`, "The types of the columns").
Revised on 28 September 2026 for the owner's decision that day that the
LD filter of the Variants step starts with no distance: `VariantFilter`
does not change, and says that a job never carries an LD filter without
its distance, which the project may hold; and again that day, after
the review of that change, core locks what reads either list of filters
while the distance is missing, and the files wasm is the package of
xlsx_rs, since the reader of xlsx left this repository. The owner's
decision of the same day that a filter turned off keeps its values in
the project changes no job: a job carries the filters that are on, as
before. Revised again that day for the owner's decision that the
filters of individuals act first (`docs/architecture.md`, section 2):
the runner puts the list of the individuals kept before the filters of
the variants, which count over it; the job of the statistics of each
individual carries no filter; the jobs of the histograms of the
variants and of the counts carry the list; and core locks only what
reads the filters of the variants while the LD filter has no distance.
Revised again that day for the owner's decision that the PCA has its
own filters of missing data, MAF and LD, which follow the Variants step
by default: the passage on the filters of the PCA says how core gives
them to popnei. The revisions for stage 4 are approved by the owner on 28 September 2026.
Revised on 30 September 2026 for stage 5, the analyses of the
populations, as their specs give the fields: the diversity's job and
result gain the fields of `calcPopDiversity`, the folded site frequency
spectrum among them, which rides in the diversity's result
(`docs/specs/analyses/diversity.md` and `sfs.md`); and the distances
between populations (`popDists.md`) and the LD decay (`ldDecay.md`)
join `Job` and `JobResult`. Approved by the owner on 30 September 2026.
Revised on 6 October 2026 for the one pass of popgen2.html
(`docs/plans/live-stats.md`, phase 1, ordered by the owner that day with
the plan reviewed in place of a spec): the summary of the variants file,
built for `docs/plans/open-variants.md` without a revision here, is
written in, its job with the bins of the histograms of the variants and
its result with two parts, `perVar` and `perIndividual`, popnei's own
names in `VariantsSummary`, the fields of
the results of the histograms of the variants and of the statistics of
each individual without `analysis`, which `VariantStatsPart` and
`IndividualStatsPart` name and those two results extend. Revised on 7
October 2026 for the plots that fill in while the file is read
(`docs/plans/live-stats.md`, phase 2): a result so far is a `JobResult`
of the job's analysis, over the variants read so far, so no type is
added here; its message, `soFar`, and `PROTOCOL_VERSION` 9 are in
`messages.ts`. Revised on 7 October 2026 for the count of the FILTER
failures (`docs/plans/live-stats.md`, phase 3): `FilterFailuresJob` and
`FilterFailuresResult`, and `PassFilterKind`, the kinds of the counts of
a pass, which type `PassStats.filtering`; `PROTOCOL_VERSION` 10.
Revised on 7 October 2026 when the owner took that count out, so that
popgen2.html reads each file once (`docs/plans/one-pass.md`): the two
types and `PassFilterKind` are removed, `PassStats.filtering` is typed by
`VariantFilterKind` again, and `PROTOCOL_VERSION` is 11. The count waits
for popnei's summary to give it, popnei issue #12 (JoseBlanca/popnei).
Revised on 7 October 2026 for the thresholds of popgen2.html as filters
of the project, `docs/designs/stats-filters.md`, approved by the owner
that day: the filter of the FILTER column, `{ kind: "passed" }`, popnei's
`filterPassed`, joins `VariantFilter`, first in the fixed order, and the
runner puts it before the list of the individuals kept; its checks and
`PROTOCOL_VERSION` 12 are in `messages.md`.

This spec gives the part of `src/worker/protocol.ts` that core
names: the filters of the variants and of the individuals, the table of
the individuals file and the types of its columns, a request to a
worker with its progress and its outcome, the request and the result
of each analysis, `Job` and `JobResult`, and the request of a written
file. The stages are the steps in
which the applications are built, in `docs/build-order.md`: stage 1 the
core with no screen, stage 2 the walking skeleton, the smallest
application that goes through every part once, stage 3 the variants step,
stage 4 the individuals and the PCA. It is in stage 1 because the project and the store of core,
`docs/specs/core/project.md` and `docs/specs/core/store.md`, are written
with these types; the requests themselves and the messages come with the
workers in stage 2. It develops sections 2, 4, 5 and 6 of
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

They are four of the filters of popnei's `Variants`, methods in
`js/popnei/src/variant.ts`, with the names of their arguments, and the
project holds the numbers popnei is given, as section 3 of
`docs/functionality.md` describes them; and, from 7 October 2026, a
fifth with no number, the filter of the FILTER column (below):

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
- **They are in a fixed order**, as the owner decided on 26 September
  2026 (`docs/architecture.md`, section 2): the FILTER column, missing
  data, observed heterozygosity, MAF, and the LD pruning last. The
  project holds them in that order, and a job carries them so; the
  runner puts them on the `Variants` in the order of the job, and does
  not sort them, but for the FILTER column, which it puts before the
  list of the individuals kept (below).

The filter of the FILTER column, `{ kind: "passed" }`, keeps the
variants of a VCF whose FILTER is `PASS` or a dot, popnei's
`filterPassed`, whose kind in the counts of a pass is `"passed"` and
whose `args` are `{}` (popnei 0.2.1, `variant.d.ts`). It works only on a
VCF opened with `onlyPassed: false`, as `popgen2.html` opens every VCF;
over a VCF opened with only the passed variants it keeps every variant,
and over a `.nei` file written before popnei's format 1.2 its pass
throws at the first block, "the variants hold no record of whether they
passed their FILTER…" (seen in node with popnei 0.2.1 on `panel.nei`, 7
October 2026). So no job carries it for a `.nei` file: core builds the
filters of a job from `filtersApplied` of `docs/specs/core/project.md`,
which leaves it out for one, and only `popgen2.html` lets a project hold
it (`docs/designs/stats-filters.md`, "The FILTER filter"). The runner
puts it on the `Variants` after the regions, once the application has
that filter, and before the list of the individuals kept, where popnei
advises it, "Add it first, or right after `filterByRegions`", and where
it accepts it: `filterPassed` throws only on a second one and after
`filterFirstN`. Its place changes no variant kept, since it judges a
variant by its FILTER alone, and no individual kept, since the
individuals are judged from the statistics of each individual, whose
job carries no filter; what moves with its place is the counts of the
filters after it, which are over the variants that passed. On
`low_qual.vcf.gz`, the panel with 300 of its 1,200 variants failed, it
keeps 900 of 1,200, and the missing data filter at 0.05 after it 865 of
those 900 (node, popnei 0.2.1, 7 October 2026).

The PCA has its own filters of missing data, MAF and LD, as the owner
decided on 28 September 2026, each following the Variants step until the
user sets a value of its own in the PCA's panel; they meet the rule of
one filter of each kind when the dataset has a filter of the same kind.
Core gives the job of the PCA one list of filters in the fixed order:
the dataset's, with each filter the PCA has of its own in the place of
the dataset's of that kind, or in the place of its kind when the dataset
has none (`pcaFilters` of `docs/specs/analyses/pca.md`, "Which variants
it reads"). The list of individuals comes before them, as for every
job. So the runner puts the filters of a PCA as it puts any job's, and
never merges two.
The rule this spec held until stage 3, which merged the two MAF filters
only when the dataset had no LD pruning and the job kept every
individual, goes: it left the PCA with no MAF filter of its own whenever
a filter of individuals was set (`docs/specs/stage-3-open-points.md`,
"For stage 4"). So does the rule of the first specs of stage 4, the
stricter of the PCA's MAF filter and the dataset's, replaced on 28
September 2026 by the PCA's own filter in the place of the dataset's.

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
`docs/functionality.md`, joins the union, first in the fixed order, with
popnei's release that has it (`docs/architecture.md`, section 6).

### The filters of the individuals are the application's, and a job carries their list

popnei has one filter of individuals, `filterIndividuals` of
`js/popnei/src/variant.ts`, which keeps the individuals of a list, one
per `Variants`. The four filters of individuals of section 3 of
`docs/functionality.md`, a list to keep, a list to remove, and a
threshold on the missing rate or on the observed heterozygosity of each
individual, are the application's: the thresholds are arithmetic on
popnei's statistics per individual (`docs/build-order.md`, section 4).
The project holds them in a fixed order by kind, keep, remove, missing
data, heterozygosity, and the user does not order them.

Core makes of the four the one list of the individuals kept, from the
result of the statistics of each individual in its cache, in the order of
the variants file (`docs/architecture.md`, section 4, "The checks of the
Variants step"; `src/core/individualsKept.ts`), and an analysis that
reads the filters of individuals puts it in its job, as the store puts
it in the job of a write, `individuals`, which is `null` when the
filters remove nobody. The calculation worker never sees the filters of individuals:
the runner puts the list it is given on the `Variants` before every
filter of the variants but the FILTER column, with `filterIndividuals`,
as the owner decided on 28 September 2026 (`docs/architecture.md`,
section 2). So the filters of the variants after it count over the
individuals kept, and the list changes their counts: on `panel.nei`, the missing data filter at 0.05 keeps
1,152 of the 1,200 variants with every individual and 1,117 with the 111
individuals of the thresholds of `docs/specs/core/individualsKept.md`.
popnei's step of individuals has no entry in the counts of a pass
(`Step.kind` of `js/popnei/src/filters.ts`). Until 28 September 2026 the
runner put the list after every filter of the variants, which then
counted over every individual of the file. The option not taken,
the list made in the calculation worker, which this spec had until the
revision of the architecture of 26 September 2026, is in section 4 of
the architecture.

popnei refuses a list that is empty, that names an individual twice, or
that names one that is not in the variants (seen in node with
`js-v0.1.0-dev.2` on 26 September 2026). Core checks the lists of the
filters of individuals before any request, and the analyses are locked
with a reason that names the individuals (`docs/specs/core/project.md`,
"What an analysis needs of every project"); an analysis cannot start when
the filters keep no individual, so core never sends an empty list, and
the runner answers one as a defect of the page
(`docs/specs/worker/runner.md`).

### Every result carries the counts of its pass

popnei gives, with the result of every function that reads the file, the
counts of its pass, `passStats` of `js/popnei/src/variant.ts`: `numVars`,
how many variants the pass gave after its steps, and `filtering`, for
each filter of the variants in the order of the steps, how many it was
given, `varsProcessed`, and kept, `varsKept`, under its kind. Every
`JobResult` and every written file carries them, under popnei's name and
in popnei's shape, `passStats`, so that the store fills the counts beside
each filter from any pass over the project's filters, and not only from
the Count button (`docs/architecture.md`, section 4, "What each filter
kept"). The kinds are the fixed names of the filters, never names of the
user, so an object keyed by them is allowed
(`.claude/skills/coding/worker.md`); the runner builds it with the kinds
in the order of the job's filters, and a structured clone keeps the order
of the fields of an object whose names are not whole numbers. The number
of variants of the file, which the store records into the load, is
`varsProcessed` of the first filter, or `numVars` when the pass had none
(`countsOf` of `src/core/apps.ts`, `docs/specs/core/store.md`).

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
  | { kind: "ld"; maxAllowedR2: number; maxDist: number }   // filterByLd
  | { kind: "passed" };                                      // filterPassed: FILTER PASS or a dot

export type VariantFilterKind = VariantFilter["kind"];
```

The union keeps the order of the members as the code has them, the
four with a number and `passed` last; the fixed order of the project is
`VARIANT_FILTER_ORDER` of `docs/specs/core/project.md`, `passed` first.

A job always carries the distance of its LD filter. The project may
hold an LD filter whose distance the user has not typed yet, which is
core's `ProjectVariantFilter` and not this type; core locks every
analysis that reads the filters of the variants while it does, and
builds the filters of a job with `jobFilters`, which gives a
`VariantFilter` list (`docs/specs/core/project.md`, "What an analysis
needs of every project"). So the worker never checks for a missing
distance, and a `null` that reached it would be refused by the check of
the message as any value of another type is
(`docs/specs/worker/messages.md`). The filters the project keeps while
they are off, `filtersOff` and `individualFiltersOff` of core, are in no
job: a job carries the filters that are on.

The `kind` of each is the name popnei gives the filter in the counts of a
pass (`Step.kind` in `js/popnei/src/filters.ts`), so what each filter
kept is found under its kind.

A filter of the individuals, as the project holds it; no job carries one.
The names are those of the individuals of the variants file.

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
`NA` or `-`, and, in an xlsx, a text equal to one of the seven errors
of Excel, `#N/A`, `#DIV/0!`, `#NAME?`, `#NULL!`, `#NUM!`, `#REF!` and
`#VALUE!` (`docs/functionality.md`, section 4). The cells of a CSV or
TSV are text, as written in the file; numbers and booleans come only from
an xlsx, as the files wasm, the wasm package of xlsx_rs that reads
xlsx (`docs/architecture.md`, section 6), gives them. The first column
names the individuals. Every row is as long as the header.

```ts
export type Cell = string | number | boolean | null;

export interface IndividualsTable {
  columns: readonly string[];            // the names of the header, in the order of the file
  rows: readonly (readonly Cell[])[];    // one per individual, in the order of the file
}
```

The type of a column, as the reader inferred it and the user set it
(`docs/functionality.md`, section 4). A binary column holds its two
values and which is coded 1. They are the texts of two cells of the
column, compared exactly: a text as it is, and a number or a boolean of
an xlsx as JavaScript's `String` writes it, `"1"`, `"true"`, so that a
number 1 and a text `"1"` of one column of an xlsx are one value
(`docs/specs/worker/individuals.md`, "The types of the columns"). A
missing cell is not one of the two values. Until stage 3 they were the
cells as the table holds them; every project file of those stages read a
CSV, whose cells are all text, so none holds another value.

```ts
export type ColumnType =
  | { kind: "identifier" }
  | { kind: "binary"; one: string; zero: string }       // the texts of the two values
  | { kind: "continuous" }
  | { kind: "categorical" };
```

How a CSV or TSV is read, and the three options the read used, each as
the user set it or, where it was `"auto"`, as the reader found it, which
the screen shows beside the file; which of them were `"auto"` the screen
knows from the options of the source. `"utf-16"` is found only from the
mark at the start of a file, and so cannot be set
(`docs/specs/worker/individuals.md`, "The bytes and the encoding"). The
read also says where the first character that could not be decoded is,
shown as �, for the warning of the screen.

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
  undecodedLine: number | null;   // the line of the first U+FFFD, from 1; null for none
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
  | { kind: "files"; message: string }                 // calamine could not open the xlsx as a workbook; its message, for the console
  | { kind: "unnamedColumn"; column: number }          // values under no name; counted from 1
  | { kind: "emptyIndividual"; line: number }          // a row with no name of an individual
  | { kind: "unclosedQuote"; line: number;             // the line where the cell starts
      separator: "," | ";" | "\t" }
  | { kind: "tooLarge"; size: number; max: number }    // in bytes
  | { kind: "unreadable"; message: string }            // the browser's, for the console
  | { kind: "notText" }                                // not a text file
  | { kind: "variantsFile" }                           // a VCF picked by mistake
  | { kind: "cutShort" }                               // UTF-16 that ends in the middle of a character
  // From stage 4, an xlsx (docs/specs/worker/files.md, "The refusals"):
  | { kind: "notXlsx" }                                // not a zip, as every xlsx is
  | { kind: "oldExcel" }                               // a workbook of Excel 97–2003
  | { kind: "encrypted" }                              // saved with a password
  | { kind: "emptySheet"; sheet: string }              // the first sheet not hidden has no value
  | { kind: "cellError"; error: string }               // an error calamine does not know, "#GETTING_DATA"
  | { kind: "headerError"; row: number; column: number;  // a cell of the header that is an error of Excel;
      error: string }                                  // row and column of the sheet, from 1; "#VALUE!"
  | { kind: "sheetTooLarge"; sheet: string; lastRow: number; // counted from 1
      lastColumn: string; max: number }                // "XFD"; cells, MAX_SHEET_CELLS
  | { kind: "xlsxReaderNotLoaded"; message: string };  // the files wasm not downloaded; the browser's, for the console
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
done (`docs/specs/worker/messages.md`, "The progress"). A run of the
summary of the variants file also gives, while its pass runs, results so
far, each a `JobResult` of its analysis over the variants read so far,
which the client gives to the store beside the progress and not in the
`Run` (`docs/specs/worker/client.md`, "The result so far").

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
  | { kind: "defect"; message: string };      // a mistake of our code: a message that did not validate, a request refused, a popnei_web defect thrown in the calculation worker
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

The counts of a pass, as the paragraph "Every result carries the counts
of its pass" gives them.

```ts
export interface FilteringStats {
  varsProcessed: number;                   // the variants the filter was given
  varsKept: number;                        // those it kept
}

export interface PassStats {
  numVars: number;                         // the variants the pass gave, after every step
  filtering: Partial<Record<VariantFilterKind, FilteringStats>>; // one per filter of the job, in its order
}
```

The request of a calculation and its result are unions, `Job` and
`JobResult`, since the analyses of core build a `Job` and read a
`JobResult` and core imports no `messages.ts`
(`docs/specs/worker/messages.md`, "Job and JobResult"). Each analysis
adds one member to each, tagged with its id in the field `analysis`,
and its spec gives the fields. What every member keeps, decided here:

- **Every job names its pass**: `fileId`, the load id of the variants
  file it reads, and `filters`, the filters of the variants in the fixed
  order, empty for an analysis that reads none; and `individuals`, the
  list of the individuals kept, in the order of the file, `null` for
  every individual and never empty, in a job of an analysis that reads
  the filters of individuals and in a write. A job without the field
  reads every individual (`docs/architecture.md`, section 4,
  `filtersRead`). The runner puts the filter of the FILTER column first,
  when the job has it, then the list, and then the other filters, in
  their order. Core builds each job so, and the runner applies what the
  job says.
- **Every result holds `passStats`.**

Stage 3 has four members: the diversity
(`docs/specs/analyses/diversity.md`) and the three analyses of the
Variants step, the statistics of each individual
(`individualChecks.md`), the histograms of the variants
(`variantChecks.md`) and the counts of the filters (`filterCounts.md`),
each under `docs/specs/analyses/`. Stage 4 adds the fifth, the principal
components (`pca.md`). Stage 5 adds the distances between populations
(`popDists.md`) and the LD decay (`ldDecay.md`), and gives the
diversity's members the fields of its second call of popnei; the folded
site frequency spectrum has no member of its own, since it comes in the
diversity's call and result, as the owner decided on 30 September
2026 (`sfs.md`, "Open points"). The block below is written from those
specs, which were written at the same time as this one; where one of
them gives other fields, the spec of the analysis stands and this block
follows it. The populations are pairs in the order of the file, since
their names are the user's and never the names of fields.

```ts
export type Pops = readonly (readonly [pop: string, individuals: readonly string[]])[];

export interface DiversityJob {
  analysis: "diversity";
  fileId: string;
  filters: readonly VariantFilter[];
  individuals: readonly string[] | null;   // in the place of individualFilters of stage 2
  pops: Pops;                              // only individuals kept, none empty
  minNumIndividuals: number;
  polyThreshold: number;
  numCalledAlleles: number;                // from stage 5: the draw of the rarefaction and the spectrum, 2 or more
  popDiversityPops: readonly string[];     // from stage 5: the populations of pops with the minimum, in its order
}

export interface DiversityResult {
  analysis: "diversity";
  pops: readonly string[];                 // in the order of the job
  numIndividuals: Uint32Array;
  unbiasedExpHet: Float64Array;            // NaN for no value
  obsHet: Float64Array;
  polyRatio: Float64Array;
  numVarsWithValue: Uint32Array;
  // From stage 5, of calcPopDiversity over popDiversityPops; NaN, or 0
  // for a count, or null for a spectrum, for a population not given to it.
  fis: Float64Array;
  numAllelesMean: Float64Array;
  numAllelesInDraw: Float64Array;
  privateAllelesTotal: Float64Array;       // NaN when the private alleles were not asked
  privateAllelesMean: Float64Array;
  privateAllelesInDraw: Float64Array;
  numVarsInDraw: Uint32Array;
  numVarsEveryPop: number | null;          // null when the private alleles were not asked
  numVarsEveryPopInDraw: number | null;
  numCalledAlleles: number;                // the draw of the job
  foldedSfs: readonly (Float64Array | null)[]; // floor(numCalledAlleles / 2) + 1 values each
  passStats: PassStats;                    // in the place of numVars and numVarsRead of stage 2; of the first pass
}

// The statistics of each individual, calcPerIndividualStats, over every
// variant and every individual of the file.
export interface IndividualChecksJob {
  analysis: "individualChecks";
  fileId: string;
  filters: readonly [];                    // none
}

// The fields of the statistics of each individual, which the result of
// their own request and the summary of the variants file share.
export interface IndividualStatsPart {
  individuals: readonly string[];          // every individual of the file, in its order, as popnei gave them
  missingGtRate: Float64Array;             // popnei's names; one per individual, in that order
  obsHetRate: Float64Array;                // NaN for an individual with no called genotype
  passStats: PassStats;
}

export interface IndividualChecksResult extends IndividualStatsPart {
  analysis: "individualChecks";
}

// The histograms of the variants, calcPerVarDistribs over every variant
// of the file and the individuals kept, as one population.
export interface VariantChecksJob {
  analysis: "variantChecks";
  fileId: string;
  filters: readonly [];                    // none
  individuals: readonly string[] | null;   // the individuals kept, before any filter
  minNumIndividuals: number;               // 0, so that popnei bins the variants with few called genotypes
  numBins: number;                         // popnei's histKwargs
  range: readonly [number, number];
}

export interface VariantDistrib {
  mean: number;                            // over the variants that have a value; NaN for none
  counts: Uint32Array;                     // the variants in each bin
}

// The fields of the histograms of the variants, which the result of
// their own request and the summary of the variants file share.
export interface VariantStatsPart {
  binEdges: Float64Array;                  // numBins + 1, shared by the four
  missingRate: VariantDistrib;             // popnei's missing rate: the missing genotypes of a variant over the individuals of the pass
  maf: VariantDistrib;                     // popnei's major allele frequency
  obsHet: VariantDistrib;
  unbiasedExpHet: VariantDistrib;
  passStats: PassStats;
}

export interface VariantChecksResult extends VariantStatsPart {
  analysis: "variantChecks";
}

// The counts of the filters of the variants, from a pass that gives
// nothing else.
export interface FilterCountsJob {
  analysis: "filterCounts";
  fileId: string;
  filters: readonly VariantFilter[];
  individuals: readonly string[] | null;   // the individuals kept, whose filters count over them
}

export interface FilterCountsResult {
  analysis: "filterCounts";
  passStats: PassStats;
}

// The summary of the variants file of popgen2.html, from one pass of
// popnei's calcVariantsSummary over every variant and every individual,
// with no filter: the chromosomes, from its density of one window per
// chromosome (ONE_WINDOW_PER_CHROM, 2^53 − 1); the histograms of the
// variants, from its perVar, with the bins of the job over every
// individual as one population; and the statistics of each individual,
// from its perIndividual. Each part is what its own call gives, to the
// bit (docs/plans/live-stats.md).
export interface VariantsSummaryJob {
  analysis: "variantsSummary";
  fileId: string;
  filters: readonly [];
  minNumIndividuals: number;               // 0
  numBins: number;                         // 1,280
  range: readonly [number, number];        // [0, 1]
}

export interface VariantsSummaryResult {
  analysis: "variantsSummary";
  chroms: readonly string[];               // those with variants, in the order of their first variant
  numVarsPerChrom: Uint32Array;            // as chroms
  perVar: VariantStatsPart;                // popnei's names of the parts of VariantsSummary
  perIndividual: IndividualStatsPart;
  passStats: PassStats;
}

// The principal components, stage 4: a PCA of the genotypes or a PCoA of
// the Kosman distances, corrected by Lingoes' method when no space holds
// them (docs/specs/analyses/pca.md), over the filters pcaFilters gives, the first
// numCompsKept components of what popnei gives.
export interface PcaJob {
  analysis: "pca";
  fileId: string;
  filters: readonly VariantFilter[];       // the dataset's, with the PCA's own in their place
  individuals: readonly string[] | null;
  method: "pca" | "pcoa";
  numCompsKept: number;                    // 10, PCA_NUM_COMPS_KEPT of core
}

export interface PcaResult {
  analysis: "pca";
  method: "pca" | "pcoa";
  individuals: readonly string[];          // those of the pass, in the order of the file
  numComps: number;                        // kept: the smaller of numCompsKept and numCompsFound
  numCompsFound: number;                   // every component with variance popnei gave
  projections: Float64Array;               // individuals × numComps, row after row
  explainedVariancePercent: Float64Array;  // numComps, over the variance of every component
  numVarsUsed: number | null;              // the PCA's usedVars.length; null for the PCoA
  lingoesConstant: number | null;          // the PCoA's constant of Lingoes' correction, 0 for none; null for the PCA
  negativeEigenvaluesPercent: number | null; // the PCoA's, of its distances before the correction; null for the PCA
  passStats: PassStats;                    // of filters that are not the project's
}

// The distances between populations, stage 5: Hudson's Fst and Jost's D
// of each pair from calcPopDists, and the order of the heatmap of each
// from popnei's PCoA (docs/specs/analyses/popDists.md).

/** Why the heatmap keeps the order of the metadata file. */
export type FileOrderReason = "twoPopulations" | "noDistance" | "allZero" | "notPlaced";

export type HeatmapOrder =
  | { kind: "pcoa"; order: Uint32Array }   // indexes of pops, top to bottom
  | { kind: "file"; reason: Exclude<FileOrderReason, "notPlaced"> }
  | { kind: "file"; reason: "notPlaced"; message: string }; // popnei's refusal

/** The populations under the minimum of individuals, with their individuals kept. */
export type LeftOut = readonly (readonly [pop: string, numIndividuals: number])[];

export interface PopDistsJob {
  analysis: "popDists";
  fileId: string;
  filters: readonly VariantFilter[];
  individuals: readonly string[] | null;
  pops: Pops;                              // those with the minimum, two or more
  leftOut: LeftOut;                        // copied into the result, not read by the runner
  minNumIndividuals: number;
}

export interface PopDistsResult {
  analysis: "popDists";
  pops: readonly string[];                 // in the order of the job
  numIndividuals: Uint32Array;
  fst: Float64Array;                       // k × (k − 1) / 2, pairs (0, 1), (0, 2), …, (1, 2), …; NaN for no value
  dest: Float64Array;
  numVarsPerPair: Uint32Array;
  order: { fst: HeatmapOrder; dest: HeatmapOrder };
  leftOut: LeftOut;
  passStats: PassStats;
}

// The LD decay, stage 5: calcLdAndDistPerPop over the filters of the
// Variants step but its LD pruning (docs/specs/analyses/ldDecay.md).
export interface LdDecayJob {
  analysis: "ldDecay";
  fileId: string;
  filters: readonly VariantFilter[];       // the project's but the LD pruning
  individuals: readonly string[] | null;
  pops: Pops;                              // only individuals kept, none empty
  minDist: number;                         // 1
  maxDist: number;                         // typed by the user; no default
  numBins: number;                         // 50
  maxAllowedMaf: number;
}

export interface LdDecayResult {
  analysis: "ldDecay";
  pops: readonly string[];                 // in the order of the job
  numIndividuals: Uint32Array;             // the n of each curve
  numVars: Float64Array;                   // numVarsPerPop
  smallestDist: Float64Array;              // numBins, shared by every population
  largestDist: Float64Array;
  numPairs: Float64Array;                  // pops × numBins, the bins of one population together
  meanR2: Float64Array;                    // NaN for a bin with no pair
  sdR2: Float64Array;
  rhoPerBp: Float64Array;                  // one per population; NaN when no curve was fitted
  r2AtZero: Float64Array;
  halfDist: Float64Array;
  passStats: PassStats;
}

export type Job =
  | DiversityJob | IndividualChecksJob | VariantChecksJob | FilterCountsJob | PcaJob
  | PopDistsJob | LdDecayJob | VariantsSummaryJob;
export type JobResult =
  | DiversityResult | IndividualChecksResult | VariantChecksResult | FilterCountsResult
  | PcaResult | PopDistsResult | LdDecayResult | VariantsSummaryResult;
```

The request of a written file is not a `Job`, since it is not an
analysis and its answer never goes into the cache (`docs/architecture.md`,
section 5; `docs/specs/analyses/writeVariants.md`). It names its format,
`"nei"` until popnei has a writer of the VCF, which joins it then. Its
answer holds the file, a `Blob` of the browser, which `protocol.ts`
cannot name, so the answer is generic in the type of the file: the
client gives `Written<Blob>` (`docs/specs/worker/client.md`), and core
holds the file as a value it does not read, and reads the size and the
counts beside it.

```ts
export interface WriteJob {
  format: "nei";
  fileId: string;
  filters: readonly VariantFilter[];
  individuals: readonly string[] | null;
}

export interface Written<F> {
  format: "nei";
  file: F;                                 // a Blob on the page
  numBytes: number;                        // its size, which core reads without naming a Blob
  passStats: PassStats;                    // the variants written, and the counts of the filters
}
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
- **Filters that keep no variant.** Every calculation of popnei refuses
  its pass then, "the pass gave no variant: …", so the diversity ends
  `popnei` with that message. The statistics of each individual take no
  filter since the owner's decision of 28 September 2026
  (`docs/specs/analyses/individualChecks.md`), so they are refused only
  when the file itself gives no variant: a file that holds none, or a
  VCF none of whose variants passed, read with only those. A job with
  the filter of the FILTER column over a VCF none of whose variants
  passed is refused the same way, since the filter keeps none. The PCA
  of the release words it "there are no variants to do a PCA with",
  whether the file holds none or the filters kept none
  (`docs/specs/analyses/pca.md`, "The request"). The
  counts of the filters do not: their pass is `iterBlocks`, whose
  `passStats` give the counts of a pass that gave nothing, which is when
  the user most needs to see which filter dropped every variant
  (`docs/architecture.md`, section 4). Nor does a write: popnei's
  `writeVars` writes a file of no variant, 3,594 bytes for `panel.nei`
  with the missing data filter at 0.05 and a MAF filter at 0, seen in
  node on 26 September 2026 with `js-v0.1.0-dev.2`, and 3,682 with
  `js-v0.1.0-dev.3` on 28 September 2026; its `passStats.numVars`
  is 0, and what the step does with such a file is the spec of the write's
  (`docs/specs/analyses/writeVariants.md`).
- **A variant with no called genotype** has no value of any statistic,
  even with `minNumIndividuals` 0, and is in no bin of the histograms of
  the variants: of two variants, one of them missing in both
  individuals, each histogram counted one, seen in node on the same day.
  So the counts of a histogram can add up to fewer than `passStats.numVars`,
  the difference being the variants with nothing called.

## How it is verified

Types have no test of their own. The compiler checks them where they are
used: the tests of core build projects with every kind of filter, and
`tsc -b` with `tsconfig.core.json` checks that `protocol.ts` names nothing
of the browser, which is why `Written` is generic in its file. That the
fields of the filters are popnei's arguments, and the boundary above, at
0.05, are checked by the tests of the runner (`docs/specs/worker/runner.md`);
so are the counts of a pass in the order of the job, the list of
individuals put before the filters of the variants, which then count
over the individuals it keeps, and the filter of the FILTER column put
before the list.

## Open points

None.

## Not in this spec

- The messages, their checks and `PROTOCOL_VERSION`:
  `docs/specs/worker/messages.md`. What each member of `Job` and
  `JobResult` means, and how it is checked when it arrives: the spec of
  its analysis under `docs/specs/analyses/`, and `messages.md`.
- How core makes the list of the individuals kept, and the counts of each
  filter of individuals: `docs/specs/core/individualsKept.md`; and the
  bins of the statistics of each individual, `src/core/histogram.ts`:
  `docs/specs/analyses/individualChecks.md`.
- The reader of the individuals file, the words of its refusals, and how
  a text cell becomes a number with the decimal mark found:
  `docs/specs/worker/individuals.md`.
- The filter of the regions of a BED file, and the writer of the VCF:
  with popnei's release that has them, `js-v0.1.0-dev.3` of 28 September
  2026, which stage 4 builds on for its PCoA and does not use them for.
