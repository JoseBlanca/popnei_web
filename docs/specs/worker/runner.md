# The runner of the calculation worker

25 September 2026, a draft awaiting the owner's approval. The calculation
worker is the thread of the browser tab, beside the page, that runs
popnei, so that a calculation does not freeze the page
(`docs/architecture.md`, section 1). Its runner is the code that answers
the page's requests there: it loads popnei, opens the variants file the
user picked, and runs the diversity of the walking skeleton, the
smallest application that goes through every part once (stage 2 of
`docs/build-order.md`). This spec gives what the runner does with each
request, what it answers when popnei refuses or something breaks, what it
holds in memory, and the numbers popnei gives on the fixtures, which its
tests assert. It develops the row `runner.ts` of section 9 of
`docs/architecture.md`, and sections 5, 6 and 11. There is no code of it
yet; the worker of the probe of stage 0, `src/probe/probeWorker.ts`,
already loads popnei and reads a `File` whole in Chromium, Firefox and
WebKit (`docs/plans/site.report.md`). It builds on
`docs/specs/worker/protocol.md`, for the filters and the kinds of error,
and on `docs/specs/worker/messages.md`, for the requests and the
answers; the page's side is `docs/specs/worker/client.md`, and the
request and the result of the diversity are in
`docs/specs/analyses/diversity.md`. Those three are drafts written at the
same time as this one, `messages.md` and `client.md` revised after it,
and what this spec assumes of each is listed at the end, under "What
this spec assumes of the others".

The words used here:

- A **load** is one pick of a variants file, with its load id, new at
  every pick, the `File`, the handle the browser gives to the file on the
  disk, its format, VCF or `.nei`, and the read options of a VCF, its
  ploidy and whether only the variants that passed its filters are kept
  (`docs/specs/core/project.md`, `VariantSource`).
- A **`Variants`** is popnei's handle on an opened file, in the memory of
  its wasm, the WebAssembly popnei's Rust is compiled to. The filters are
  put on it one by one, as **steps**, and every calculation reads the
  whole file through them, a **pass** (`js/popnei/src/variant.ts`).
  popnei lists the steps a `Variants` holds, in their order, in its
  `steps`, each with its kind and the arguments it was given.
- The **counts of the pass**, `passStats` of popnei's result: `numVars`,
  the variants the pass gave after every filter, and `filtering`, for each
  filter in its order, the variants it was given, `varsProcessed`, and
  those it kept, `varsKept` (`js/popnei/src/filters.ts`).
- The **key** of a result is the text the page makes from everything the
  result was calculated from; the page sends it with each request and
  puts the result in its cache under it (`docs/architecture.md`, section
  3).

## What it does

A user never sees the runner, and sees what it gets wrong: a diversity
calculated with another threshold than the one on the screen, the values
of one population in the row of another, a file refused with no word of
why, a tab that runs out of memory at the third threshold tried, a
calculation that waits for ever for an answer that will not come. The
rules below are there against each of these.

### Two files: the popnei calls, and the worker's script

The runner is two files, decided here:

- **`src/worker/runner.ts`** calls popnei and nothing of the worker's
  globals. It is given the bytes of the file by a function, and returns
  what the worker posts, so its tests run in node, where popnei loads
  from its node entry (`.claude/skills/coding/testing.md`).
- **`src/worker/runnerWorker.ts`** is the script the browser runs as the
  worker. It listens for the requests, checks them with `parseToRunner`
  of `messages.ts`, calls `runner.ts`, and posts the answers. It is a few
  dozen lines, and it is tested in the browser only.

At an `open`, the worker's script gives `runner.ts` the load and a
function that reads the `File` of the request whole with
`FileReaderSync`, `ReadWhole` below; the runner decides when to call it,
at the open and at each time it opens the file again. That function
throws an `Error` whose message names the file by the `File`'s own
`name`, the name it had when the user picked it and the one the project
holds, "the browser could not read panel.nei: NotReadableError: ‹the
browser's message›", and the runner answers any throw of it `crashed`,
with that message (below, "What it answers when something goes wrong").

One file would not do. `FileReaderSync`, the call that reads a file at
once and exists only in workers, is declared by TypeScript's library of
workers and not by the library of the page, the DOM, that the tests are
type checked with (`tsconfig.test.json`), so a test that imported a file
naming it would not type check; and in node a worker's script cannot
even be imported, since the call by which it listens for the page's
requests, `addEventListener` of the worker, does not exist there. popnei stays in
`runner.ts` alone, as section 9 of the architecture and the lint of
`.claude/skills/coding/configs.md` have it, and `src/worker/start.ts`
makes the worker from `./runnerWorker.ts?worker` in the place of
`./runner.ts?worker`. The option not taken was the other split, the
worker's script in `runner.ts` and popnei in a second file, which would
have kept the line of `start.ts` and changed the lint and section 9.

### popnei, loaded once

The worker's script calls `loadPopnei` of `runner.ts` when it starts,
which awaits popnei's `init()`, so that the wasm downloads while the user
is still picking a file, and every request awaits the same promise
(`.claude/skills/coding/worker.md`, "Loading popnei, once"). When `init`
resolves, the worker posts `ready` with the number of the version of the
messages and popnei's `version()`, "0.1.0"; when it rejects, it posts
`crashed` with the message of what was thrown and closes itself, and the
client counts a failed start (`messages.md`).

### Opening the load

The first request a calculation worker gets is `open`, with the load
(`messages.md`). The runner opens it as popnei 0.1.0 opens a file, from
the bytes of the whole file (`docs/architecture.md`, section 6):

1. The runner calls the function it was given, which reads the `File`
   whole, `new Uint8Array(new FileReaderSync().readAsArrayBuffer(file))`,
   as the probe does.
2. `runner.ts` gives the bytes to `openVars` for a `.nei` file, and to
   `openVcf` with the read options for a VCF, `{ ploidy, onlyPassed }`,
   the two options of `js/popnei/src/io_vcf.ts`. The owner decided on 25
   September 2026 that the walking skeleton reads both formats, a VCF with
   its ploidy as a read option, 2 unless the user sets another; the
   project always holds both options of a VCF, so neither default of
   popnei is used.
3. The runner keeps no reference to the bytes after the call, so that the
   garbage collector can take its copy back (below, "The memory").
4. The worker posts `opened`, with the `individuals` and the `ploidy` of
   the `Variants`, which popnei gives with no pass over the variants.

The ploidy of a VCF is the one given, since popnei does not read it from
the file. A genotype of another ploidy is refused at the first pass that
reads it, not at the open, so a VCF of tetraploids opened with ploidy 2
opens, and the first diversity on it is refused (the cases, below).

The number of variants is not known at the open: popnei counts the
variants of a file only by reading all of them. It comes in the result
of each run, as the counts of the pass (below).

A worker opens one load. When popnei refuses the open, the runner
answers `refused` and still holds that load, with no `Variants`, as
`client.md` has it: the client sends that worker nothing more on the
load, and the next file the user loads starts a new worker, which gives
back the memory the read took in the wasm. A second `open`, a `run`
before the `open`, a `run` of another load than the one opened, and a
`run` after an open that popnei refused, are a defect of the page,
answered `badRequest` (`messages.md`, "A worker that cannot go on"). The
client starts a new worker for a new load, which is also how the memory
of the old one is given back (`docs/architecture.md`, section 5).

### The filters: a new `Variants` when they change

popnei 0.1.0 puts a filter on the `Variants` for good: a step is never
taken off, and a second filter of one kind is refused
(`docs/specs/worker/protocol.md`). `js/popnei/src/variant.ts` has no way
to copy a `Variants` or to take its steps off. So the runner cannot put
the filters of each request on the one `Variants` it opened, as
`.claude/skills/coding/worker.md` supposed ("each request copies the
filters onto a pass"): the second diversity, after the user moved the
threshold, would be refused with "the variants are filtered by
missing_data already, with a threshold of 0.1, and a second filter of that
kind, whose threshold is 0.2, keeps the variants that the stricter of the
two keeps alone".

For each request the runner reads the steps its `Variants` holds from
popnei's `steps`, and:

- **When those steps are the start of the job's filters**, the same kinds
  in the same order, each argument of the step equal with `===` to the
  field of the same name of the filter, it puts the rest of the job's
  filters on the same `Variants`. The first run after the open is always
  this case, since a `Variants` just opened has no step.
- **Otherwise it opens the file again**: it frees the `Variants` and
  holds none, reads the `File` whole again, opens the bytes with the same
  format and read options, and puts the job's filters on the new one.

The steps are read from popnei, and not from a list the runner keeps,
decided here, because popnei checks each filter as it is put: a job
whose second filter popnei refuses, a MAF filter of 1.5 after the
missing data filter at 0.05, leaves the `Variants` with the first filter
alone, and the next job, with the MAF filter at 0.9, finds that one step
and puts only the second. A list of the runner's own would have to be
written at each filter put to say the same, and a list written only
when a job ends well would miss the first filter and put it a second
time, which popnei refuses. The argument names of popnei's steps are the
field names of the filters of `protocol.ts`, which that spec chose so.
Seen in node on 25 September 2026, with the popnei of the release:
after `filterByMissingData(0.05)` and a `filterByMaf(1.5)` that threw,
`steps` is `[{ kind: "missing_data", args: { maxAllowedMissingRate: 0.05
} }]`.

When the file is opened again and popnei refuses the new open, the
runner answers the run `refused`, with popnei's message, and holds no
`Variants`; the next run opens the file again, whatever its filters. The
same bytes opened well before, so such a refusal is one of the memory,
popnei's refusal of a block the wasm cannot hold
(`docs/specs/worker/protocol.md`, "The cases"). When the read throws,
the answer is `crashed`, and the worker closes (**Open 1**, below).

Freeing first is what keeps the memory of wasm from growing with every
threshold tried. That memory never shrinks, but popnei's allocator takes
the room a freed `Variants` held for the next one. Measured in node
26.8.2 on the owner's Mac, macOS 27.0, with the popnei of the release the
site installs, on a `.nei` file of 19.2 MB, 20,000 variants of 1,000
individuals, written by popnei's `crates/popnei/benches/make_big_vcf.py`
with 20,000 variants and `writeVars` in batches of 1,000: the memory of
wasm is 20.6 MB after the open and 33.0 MB after the first pass, and it
stays at 33.0 MB through four passes at four thresholds when each opens
the file again after a `free()`; without the `free()`, it is 52.2, 71.4,
90.6 and 109.8 MB, a copy of the file more at each.

The runner reads the `File` again rather than keep its own copy of the
bytes, decided here: a kept copy would hold the tab at twice the size of
the file for the life of the worker, through every pass, where reading
again holds that only while the file is read; what reading again costs
is the time of reading the file, which the operating system usually has
in its cache. That time has not
been measured in a browser; it is measured at the end of stage 2 with
the restart (below, "What a restart costs"). It is a cost that sections 6
and 11 of `docs/architecture.md` do not list (**Open 2**, below).

The runner puts each filter with its method, `filterByMissingData`,
`filterByMaf`, `filterByObsHet`, `filterByLd`, with the numbers of the
job as they are, in the order of the job: the walking skeleton has the
missing data filter alone, and the other three are one line each. The
number the user typed is the number popnei is given, so a variant with a
missing rate at the threshold is kept (`docs/specs/worker/protocol.md`).

### The diversity

A diversity job holds the load id, the filters of the variants and of
the individuals, the populations, as pairs of a name and its
individuals in the order of the individuals file, and the two options of
the diversity, `minNumIndividuals` and `polyThreshold`
(`docs/specs/analyses/diversity.md`, `DiversityJob`). The runner:

1. Checks the job: no two populations of one name, since the object
   popnei takes would keep the last of them and silently give one
   population fewer; and no filter of individuals, which the runner of
   stage 2 does not apply (below). Either is `badRequest`.
2. Calls `calcPerVarDistribs(variants, { pops, stats, minNumIndividuals,
   polyThreshold })` of `js/popnei/src/stats.ts`. popnei takes the
   populations as an object whose field names are the populations, and
   the runner builds it with `Object.fromEntries(job.pops)`. A population
   named `__proto__` is the reason: in an object written as `{ ... }`
   in the code, or filled by assigning its fields, that name sets the
   object's parent instead of making a field, and the population would
   be lost; `Object.fromEntries` makes it an ordinary field (seen in
   node: popnei gives its values). `stats` is the three the walking
   skeleton shows, `["obs_het", "unbiased_exp_het", "poly_vars_ratio"]`.
   Asking for fewer changes no value, as popnei's doc comment says and
   node showed on `panel.nei`. The two options are the project's, 20 and
   0.95 by default, popnei's own defaults: a variant has a value in a
   population when 20 or more of its individuals are called there, and
   is polymorphic when its major allele frequency is below 0.95, strictly
   (`diversity.md`, **Open 2** there). The ploidy is that of the
   variants.
3. Puts the populations back in the order of the job. popnei gives them
   in the order the keys of `pops` iterate in, and JavaScript iterates
   the names that are whole numbers first, in numeric order: seen in
   node, populations named "10", "2" and "p1" came back as "2", "10",
   "p1". The runner makes each array of the result in the order of the
   job, finding each population by its name in popnei's `pops`; a name
   of the job that popnei did not give back is a defect of ours, thrown.
4. Builds the `DiversityResult` of `diversity.md` from popnei's result:
   `pops`, the names in the order of the job; `numIndividuals`, the
   individuals of each population it gave popnei; `unbiasedExpHet`,
   `obsHet` and `polyRatio`, from `unbiasedExpHet.mean`, `obsHet.mean`
   and `polyVarsRatio.polyRatio`; `numVarsWithValue`, from
   `polyVarsRatio.totNumVariantsWithData`; `numVars`, the variants the
   filters kept, `passStats.numVars`; and `numVarsRead`. popnei types
   each of the three statistics as possibly `null`, which it gives for a
   statistic not asked for; the runner asks for all three, so a `null`
   is a defect of ours, thrown.

`numVarsRead` is the number of variants of the file, which the step of
the variants shows: the number the file gives before the filters of the
application, `varsProcessed` of the first filter of the job in the
counts of the pass, `passStats.filtering`, or `passStats.numVars` when
the job has no filter (`docs/specs/steps/variants.md`). The store
records it into the load through `numVarsOf`, the function it is given
to find that number in a result of any kind (`docs/specs/core/store.md`).
For a VCF read with only the passed variants, it counts those.

The filters of individuals wait for stage 3, as
`docs/specs/worker/protocol.md` has it: how the runner makes of them the
one list it gives `filterIndividuals` is the spec of that stage. Two of
them, the thresholds on the missing rate and the heterozygosity of each
individual, need a pass of `calcPerIndividualStats` over variants that
stage 3 has to choose, and where the list goes among the filters of the
variants changes their numbers, since a filter of the variants put after
`filterIndividuals` divides by the individuals kept
(`js/popnei/src/variant.ts`). No screen of stage 2 sets one; a project
file can hold one, and the diversity is then locked, with the words
`docs/specs/analyses/diversity.md` gives, in its table "Why it cannot
run" (**Open 5** there), so core never sends such a job.

The runner computes no key and never reads one. The worker's script
takes the key from the `run` request and puts it, as it came, into the
`result`, so a result is always filed under the key it was asked for
(`docs/architecture.md`, section 5).

### The result, transferred

A result is posted with its typed arrays transferred, moved to the page
with no copy (`.claude/skills/coding/worker.md`, "Sending results
back"). The runner keeps no result, so nothing it holds is left empty.
`transferablesOf` gives the list: the buffer of every typed array of the
result, each once, so that two fields that hold one array, or two arrays
over one buffer, give it once, since a list that names one buffer twice
makes `postMessage` throw. Every array the runner builds in step 3 owns
its whole buffer; the function checks it all the same, and an array that
is a view of part of a buffer is a defect, thrown (below, "Where this
departs from the skills"). The arrays of popnei's
results are copies out of the memory of wasm, never views into it
(`js/popnei/src/stats.ts`), and NaN, the value popnei gives a population
with no variant of enough data, crosses as it is.

### What it answers when something goes wrong

Every request gets one answer, or the worker closes itself after posting
why, and the client fails the request and starts another worker
(`messages.md`). The client turns each answer into a `RunError` of
`protocol.ts`, the failure the store and the screens read: `popnei`, a
refusal of popnei, which the store keeps for those settings;
`workerFailed`, a worker that crashed; `defect`, a mistake of our code.
Which answer, by what was thrown:

| what happened | answer | on the page (`RunError`) | the worker |
|---|---|---|---|
| a call to popnei threw a plain `Error`, whose prototype is `Error.prototype` itself | `refused`, with the message as it is | `popnei` | goes on |
| a call to popnei threw anything else: a `WebAssembly.RuntimeError`, a trap of the wasm, a panic of Rust among the causes; a `RangeError` of a memory that cannot grow | `crashed`, with its message | `workerFailed` | closes |
| popnei refused the open of the file again, in a run whose filters changed | `refused`, with the message; the runner holds no `Variants`, and the next run opens the file again | `popnei` | goes on |
| `FileReaderSync` could not read the `File`, at the open or at an open again (**Open 1**, below) | `crashed`, "the browser could not read panel.nei: NotReadableError: ‹its message›" | `workerFailed` | closes |
| a request that failed `parseToRunner`; a second `open`; a `run` before the `open`, of another load, or after an open that popnei refused; two populations of one name; a filter of individuals | `badRequest`, what was wrong | `defect` | closes |
| a throw of our own code anywhere else, a `popnei_web defect:` of step 3 above among them | `crashed`, its message | `workerFailed` | closes |

- **popnei's refusal is caught at the call**, and only there: the open,
  each filter, `calcPerVarDistribs`. That catch is the one `try` of the
  runner that does not throw again (`.claude/skills/coding/typescript.md`,
  "Errors"). A refusal leaves the `Variants` as it was, popnei says so of
  its filters and of a pass that fails, so the worker goes on; the one
  refusal after which the runner holds no `Variants` is that of an open
  again, above, and the next run opens the file.
- **After a trap the runner frees nothing**: popnei's `free()` of an
  object borrowed when the trap happened throws "attempted to take
  ownership of Rust value while it was borrowed" (`js/popnei/README.md`),
  and the worker closes anyway, which gives back all of its memory.
- **The worker's script catches the rest**: each request is handled
  inside one `try`, and a throw that `runner.ts` did not turn into an
  answer is posted as `crashed`, then the worker closes. A throw outside
  a request, and a promise whose rejection nothing handles, reach the
  worker's own `error` and `unhandledrejection` handlers, which do the
  same. So no request is left without an answer, whatever breaks.
- **A refusal of popnei of the whole-file kind is not told apart**: a
  block that the memory of wasm cannot hold is refused by popnei with a
  plain `Error` rather than a trap, and is `refused` like a refusal of
  the data (`docs/specs/worker/protocol.md`, "The cases").

## The TypeScript interface

What `runner.ts` exports, which the worker's script and the tests call.
`Job` and `JobResult` are of `protocol.ts` (`messages.md`, "Job and
JobResult"); `Result` is of `src/core/result.ts`.

popnei loaded, with its version, or the message of what `init()` threw.
A second call gives the same promise.

```ts
export function loadPopnei(): Promise<Result<string, string>>;
```

A load as the runner opens it, and the function that gives the bytes of
its whole file, which throws when the browser cannot read it, with a
message that names the file (above, "Two files"). The runner calls it at
the open, and again each time it opens the file again.

```ts
export interface LoadToOpen {
  readonly fileId: string;
  readonly format: "vcf" | "nei";
  readonly readOptions: { readonly ploidy: number; readonly onlyPassed: boolean } | null;
}

export type ReadWhole = () => Uint8Array;
```

What the worker's script posts for a request: the value of `opened` or
`result`, or one of the three other answers of `messages.md`.

```ts
export type Answer<T> =
  | { readonly kind: "ok"; readonly value: T }
  | { readonly kind: "refused"; readonly message: string }    // popnei's; the worker goes on
  | { readonly kind: "crashed"; readonly message: string }    // the worker closes after it
  | { readonly kind: "badRequest"; readonly message: string };// the worker closes after it
```

The runner of one worker, which holds its one load. Both functions
throw only for a defect of ours, which the worker's script posts as
`crashed`.

```ts
export interface Runner {
  open(load: LoadToOpen, read: ReadWhole): Answer<{
    readonly individuals: readonly string[];
    readonly ploidy: number;
  }>;
  run(job: Job): Answer<JobResult>;
}

export function createRunner(): Runner; // after loadPopnei has given ok
```

The answer of what a call to popnei threw, `refused` for a plain `Error`
and `crashed` for anything else, exported so that the tests reach the
cases popnei cannot be made to give in node, a trap among them.

```ts
export function answerOfThrown(thrown: unknown): Answer<never>;
```

The buffers of the typed arrays of a result, each once, to transfer.

```ts
export function transferablesOf(result: JobResult): ArrayBuffer[];
```

## The cases

- **A VCF of another ploidy.** `tetraploid.vcf.gz`, 12 individuals whose
  genotypes hold four alleles, opened with ploidy 2: `opened`, 12
  individuals, ploidy 2. The first diversity on it is `refused` with
  "line 5 of the VCF, the column of t00: its genotype is of the ploidy 4
  and the reader was asked for the ploidy 2; popnei does not read a VCF
  whose genotypes are of different ploidies, and the ploidy is an
  argument of the reader", which the store keeps under the key of that
  run (`docs/specs/core/store.md`). The user reads the file again with
  ploidy 4, a new load.
- **A file that is not of its format.** `bad.vcf`, a line of text, is
  refused at the open, as a VCF with "the source is not a VCF: it starts
  with `This is a line o`" and as a `.nei` file with "the source is not a
  vars file: it does not start with the 6 bytes `ARROW1` that an arrow
  IPC file starts with". The worker still holds that load, with no
  `Variants`, and a `run` on it would be `badRequest`; the source of the
  project is `failed` with popnei's message, every analysis is locked,
  and the next file starts a new worker (`client.md`).
- **Filters that keep no variant.** popnei refuses the pass:
  `panel.nei` with the missing data filter at 0.05 and a MAF filter at 0
  gives "the pass gave no variant: its source gave 1200 and the steps kept
  none of them, the `missing_data` filter was given 1200 and kept 1152,
  the `maf` filter was given 1152 and kept 0; a statistic of a pass is
  calculated over the variants it gives". The missing data filter alone
  cannot be made to keep none on the fixtures: at 0, `panel.nei` keeps 2
  variants of its 1,200.
- **A population of fewer than 20 individuals** is not refused: its
  values are NaN, since no variant has 20 called individuals in it.
  `tetraploid.vcf.gz` read with ploidy 4, as one population of 12, gives
  NaN; the diversity's warning says why (`diversity.md`).
- **A population naming an individual the file does not have**, or with
  no individual, is refused by popnei, "`nobody` is named in the
  population `p0` and is not an individual of the variants; …". Core
  builds the populations from the individuals of the variants and does
  not send such a job (`diversity.md`); if it did, the user would read
  popnei's message.
- **The file changed on the disk after it was picked.** It is read again
  at a change of the filters and at every restart, and the browser then
  refuses to read it; the File API asks it to. The answer is `crashed`,
  as in the table, and what the user reads then is **Open 1**. This has
  not been seen in a browser.
- **A cancel** ends the worker wherever it is, inside a pass included
  (`docs/architecture.md`, section 5). The runner does nothing for it.
- **Progress**: popnei 0.1.0 reports none, and the runner posts no
  `progress` (`docs/architecture.md`, section 5).

## How it runs

### The memory

With popnei 0.1.0 a file is in memory whole, and it is where the size of
the files that open is set (`docs/architecture.md`, sections 6 and 11):

- **While it opens, a file costs about twice its size**: the bytes
  `FileReaderSync` gave, in the heap of JavaScript, and popnei's copy in
  the memory of wasm. After the open the runner holds no reference to the
  first, which the garbage collector takes back when it runs, not at
  once.
- **After, it costs its size once**, in the memory of wasm, which popnei
  shares between the passes, plus the blocks a pass builds, 12.4 MB for
  the file of 1,000 individuals above.
- **Opening the file again, at a change of the filters, costs no more**,
  measured as above, since the `Variants` is freed first; while the
  `File` is read again, the heap of JavaScript holds a second copy for a
  moment, as at the first open.
- **Files above roughly 1.5 to 2 GB fail**, an estimate from the 4 GB
  that wasm32 addresses and not a measurement in a browser. The failure
  can come from `FileReaderSync`, `crashed` with the browser's message,
  or from the memory of wasm, `crashed` for a trap or `refused` for
  popnei's refusal of a block.

popnei's `main` reads a `File` by ranges since 24 September 2026,
`openVcf` and `openVars` of a `File` with `FileReaderSync` a few MiB at a
time, and tells the progress of a pass with `Variants.onProgress`; the
release the site installs, `js-v0.1.0-dev.1` of 23 September 2026, has
neither (**Open 2**). With it, `ReadWhole` becomes the `File`, the whole
copy and its limit go, and opening the file again at a change of the
filters costs the reading of a header; it is a design of its own
(`docs/architecture.md`, section 6).

### What a restart costs

The client ends the calculation worker at a cancel, after a `crashed`,
and when the load changes, and starts another (`client.md`). What the
new worker pays before its first request:

- **Loading popnei's wasm**, from the browser's cache after the first
  time. On 24 September 2026, on the deployed site with nothing in the
  cache, popnei loaded in a median of 59.8 ms in Chromium 153 and 80 ms in
  WebKit 26.6, five loads each, on the owner's Mac (`docs/plans/site.report.md`).
- **Opening the file again**: the client's `open`, reading the `File`
  whole and popnei's copy of it. `panel.nei`, 261,490 bytes, opened in
  about 2 ms in both; a file of hundreds of MB has not been measured.
- **What the old worker held is lost**: its `Variants` with its filters.
  In stage 2 nothing else; the intermediate results come in stage 4.

The first run after a restart puts its filters on the new `Variants`
without reading the file a third time, since that `Variants` has none.
Stage 2 ends with the measurement of the restart
(`docs/build-order.md`); for the runner it is the time from the new
worker's start to its `opened`, and the time of a run whose filters
changed, which reads the file again, in the three engines, on the VCF of
80,692,954 bytes that `make_big_vcf.py` writes for 20,000 variants and on
its `.nei` file of 19.2 MB.

## How it is verified

### In node, at `createRunner`

`src/worker/runner.test.ts`, with Vitest, over the fixtures of
`e2e/fixtures/`, each read with `new Uint8Array(readFileSync(path))`, a
copy: node keeps a small file it reads in a part of a larger block of
memory it shares among several, and the test would otherwise give
popnei that block with the file somewhere inside it. The
populations are those of `panel_pops.txt`, a copy of popnei's
`tests/reference/stats/panel_pops.txt`, 200 individuals in three
populations, 48 in p0, 84 in p2 and 68 in p1, in that order of first
appearance, which the plan adds to the fixtures. The numbers are written
into the tests as literals and compared exactly, with `toBe` of Vitest,
the runner of the tests in node: the release of popnei and its wasm are
the same in node and in the browser, and the runner passes popnei's
numbers on with no arithmetic, so any difference is a change of popnei
or a mistake of ours (below, "Where this departs from the skills").

The numbers were given by popnei 0.1.0 of the release `js-v0.1.0-dev.1`,
the one in `package.json`, on 25 September 2026, with this file saved at
the root of the repository as `numbers.mjs` and run with
`POPS=/Users/jose/devel/popnei/tests/reference/stats/panel_pops.txt node
numbers.mjs`; the local build of popnei's `main`,
`/Users/jose/devel/popnei/js/popnei/dist/node.js`, gave the same:

```js
import { readFileSync } from "node:fs";
import { init, openVars, openVcf, calcPerVarDistribs } from "popnei";
await init();
const pops = {};
for (const line of readFileSync(process.env.POPS, "utf8").trim().split("\n").slice(1)) {
  const [individual, pop] = line.split("\t");
  (pops[pop] ??= []).push(individual);
}
for (const [file, threshold] of [["panel.nei"], ["panel.vcf.gz"], ["panel.nei", 0.05], ["panel.nei", 0.045]]) {
  const bytes = readFileSync(`e2e/fixtures/${file}`);
  const v = file.endsWith(".nei") ? openVars(bytes) : openVcf(bytes);
  if (threshold !== undefined) v.filterByMissingData(threshold);
  const r = calcPerVarDistribs(v, { pops });
  console.log(file, threshold ?? "no filter", r.passStats.numVars, JSON.stringify(r.passStats.filtering));
  for (const [i, pop] of r.pops.entries()) {
    console.log(" ", pop, r.unbiasedExpHet.mean[i], r.obsHet.mean[i], r.polyVarsRatio.polyRatio[i]);
  }
  v.free();
}
```

The unbiased expected heterozygosity (He), the observed heterozygosity
(Ho) and the proportion of polymorphic variants, of each population, with
popnei's defaults:

| filter | variants kept | population | He | Ho | polymorphic |
|---|---|---|---|---|---|
| none | 1,200 | p0 | 0.35193160994408107 | 0.35642172473116646 | 0.9266666666666666 |
| | | p2 | 0.344856554637815 | 0.3512221180544642 | 0.9108333333333334 |
| | | p1 | 0.35038890489752544 | 0.356734697819302 | 0.9175 |
| missing data ≤ 0.05 | 1,152 | p0 | 0.35267894847982756 | 0.35667985874177544 | 0.9288194444444444 |
| | | p2 | 0.3440824705971255 | 0.3512406974637824 | 0.9105902777777778 |
| | | p1 | 0.3498365468860467 | 0.35603713961547323 | 0.9157986111111112 |
| missing data ≤ 0.045 | 1,113 | p0 | 0.3520976704164635 | 0.356384468863371 | 0.9290206648697215 |
| | | p2 | 0.34351340653223333 | 0.35118321822871423 | 0.9092542677448338 |
| | | p1 | 0.3487454650232162 | 0.3556818387540967 | 0.912848158131177 |

`panel.vcf.gz` gives the same numbers as `panel.nei`, with and without
the filter. With the filter, the counts of the pass are `{ missing_data:
{ varsProcessed: 1200, varsKept: 1152 } }`, so the number of variants of
the file is 1,200.

The tests, each at `open` and `run` of a runner made by `createRunner`,
with a `read` that counts its calls:

- **The open**: `panel.nei` gives 200 individuals, the first `s000`, and
  ploidy 2; `panel.vcf.gz` with `{ ploidy: 2, onlyPassed: true }` the same;
  `read` called once.
- **The diversity**, with no filter and at 0.05: the table above, the
  populations in the order p0, p2, p1 with 48, 84 and 68 individuals,
  `numVarsWithValue` 1,200 and 1,152 in each, `numVars` 1,200 and 1,152,
  and `numVarsRead` 1,200 both times.
- **The boundary** of `docs/specs/worker/protocol.md`: 39 variants of
  `panel.nei` have a missing rate of exactly 0.05, 10 of its 200
  individuals, and the filter at 0.05 keeps them, 1,152 variants, where
  the filter at 0.045 keeps 1,113. The protocol spec named 0.1 as its
  example; the missing rates of the panel stop at 0.08, and the check is
  the same at 0.05.
- **A change of the filters**: after a run at 0.05, a run at 0.045 is
  `ok`, with the numbers of the table, and `read` has been called twice;
  a run with no filter after the open, then one at 0.05, calls `read`
  once, since the second only adds a filter.
- **A filter refused midway**: a run with the missing data filter at
  0.05 and a MAF filter of 1.5 is `refused`, with popnei's message of the
  threshold; the next run, at 0.05 with a MAF filter at 0.9, is `ok`, and
  `read` has still been called once.
- **An open again that popnei refuses**: a `read` that gives the bytes of
  `panel.nei` the first time and those of `bad.vcf` after; after a run at
  0.05, a run at 0.045 is `refused` with the message of `bad.vcf` as a
  `.nei` file, and a third run, at 0.05, calls `read` again.
- **The order of the populations**: p0, p2 and p1 renamed "10", "2" and
  "p1" come back in that order, with the values of p0 under "10".
- **popnei's refusals**, each `refused` with the message of "The cases"
  as a literal: `tetraploid.vcf.gz` with ploidy 2, at the run after an
  `opened` of 12 individuals; `bad.vcf` at the open, as a VCF and as a
  `.nei` file; the missing data filter at 0.05 with a MAF filter at 0.
- **The defects**: a `run` before the `open`, a `run` of another load
  id, a `run` after the `open` of `bad.vcf` that popnei refused, a second
  `open`, two populations of one name and a job with a filter of
  individuals are each `badRequest`; a `read` that throws a
  `DOMException` of the name `NotReadableError` gives `crashed` with
  that name in its message, at the open and at an open again.
- **`answerOfThrown`**: `new Error("x")` is `refused` with "x";
  `new RangeError("x")`, `new WebAssembly.RuntimeError("unreachable")`,
  a `TypeError`, what JavaScript throws for a mistake of the code, and a
  thrown string are `crashed`.
- **`transferablesOf`**: of a diversity result, one buffer per array,
  none twice when two fields hold one array; an array that is a view of
  part of a buffer throws.

### In the browser

What node does not have, `FileReaderSync`, the real worker and the
transfer, is seen through the flow of the walking skeleton in Chromium,
Firefox and WebKit (`.claude/skills/coding/testing.md`; the flow is the
entry's and the diversity's specs'). What it shows of the runner: a
`panel.nei` picked opens with 200 individuals and ploidy 2; the diversity
at 0.05 and then at 0.045 both show their numbers, so the `File` was read
again in the worker; the result reaches the page as typed arrays, which
the page's check of `messages.md` refuses otherwise; and
`tetraploid.vcf.gz` read with ploidy 2 opens and then shows popnei's
message at the diversity.

## What this spec assumes of the others

Each of these is a draft of 25 September 2026 written with this one.

- **`docs/specs/worker/messages.md`**: the requests `open`, with the load
  id, the `File`, the format and the read options, and `run`, with the
  key and a `Job`; the answers `ready`, `opened`, `result`, `refused`,
  and `crashed` and `badRequest`, after which the worker closes itself;
  no message `files`; `parseToRunner`, which the worker's script calls on
  every request.
- **`docs/specs/worker/client.md`**: a new calculation worker for every
  load, whose first request is the `open` of that load, sent again after
  every restart before the next `run`; one request at a time; a cancel
  that ends the worker; a worker whose `open` popnei refused is sent
  nothing more on that load, and the next file starts a new worker; and
  `start.ts` making the worker from `./runnerWorker.ts?worker`, as its
  revised draft has it.
- **`docs/specs/analyses/diversity.md`**: `DiversityJob` and
  `DiversityResult` as its draft gives them, the populations of the job
  holding only individuals of the variants, none empty; its `numVarsOf`
  reads `numVarsRead`; and, while the owner decides its **Open 5**, the
  diversity locked while the project holds a filter of individuals, with
  the words of its table "Why it cannot run", so that no job with one is
  sent.
- **`docs/specs/steps/variants.md`**: the number of variants shown is
  the one the file gives before the filters, and the ploidy of a VCF is
  shown as the one given.
- **`docs/specs/entry.md`**: the page asks for the open of a source whose
  read is pending, through the client (`docs/architecture.md`, section 6,
  "Who asks for a read").

## Where this departs from the skills

`.claude/skills/coding/worker.md` and `testing.md`, and the tree of
section 9 of `docs/architecture.md`, were written before this spec, and
these things change; each is corrected when the owner approves it.

- The calculation worker is two files, `runner.ts` with popnei and
  `runnerWorker.ts`, the worker's script, and `start.ts` imports the
  second. The tree of section 9 of the architecture gains
  `runnerWorker.ts` beside `runner.ts`; the rule that only `runner.ts`
  calls popnei holds as it is.
- The numbers of popnei are compared with `toBe`, exactly, where
  `testing.md` asks for `toBeCloseTo` or a tolerance for a float. The
  tolerance of `testing.md` is for numbers the code computes; the runner
  computes none, and a tolerance would let a change of popnei's numbers
  pass unseen, which the store's exact comparison of the check numbers
  would then report to the user.
- An array of a result that is a view of part of a buffer is a defect,
  thrown by `transferablesOf`, where `worker.md` copies it with
  `slice()`. Every array the runner posts is one it made itself, so a
  view is a mistake of ours, and a copy would hide it.
- The filters are not copied onto a pass: popnei 0.1.0 has no way to, so
  a change of the filters opens the file again, after freeing the
  `Variants`.
- The check of the PCA's MAF filter given as one filter, which
  `docs/specs/worker/protocol.md` gave to the tests of stage 2, waits for
  the job of the PCA, in stage 4.

## Open points

1. **What the user is told when the browser can no longer read the
   variants file**, because it changed or was removed on the disk after
   it was picked. It shows first on the diversity's panel. A run whose
   filters changed reads the file again; the read throws, the runner
   answers `crashed`, the client fails the run with `workerFailed` and
   starts a new worker, and the panel says "The calculation stopped
   unexpectedly. Run it again." (`docs/specs/analyses/diversity.md`, "Its
   words"). Run again goes to the new worker, whose `open` of the load
   reads the file again, fails the same way, and fails the run with the
   same words. So the advice sends the user round a loop, Run and fail,
   that only loading the file again leaves, and nothing on the screen
   says so. At the first open the same failure is a read that failed, and
   the Variants step shows "panel.nei could not be read: the calculation
   stopped unexpectedly. Load it again in the Variants step."
   (`docs/specs/core/project.md`, the row of a worker that crashed while
   it read the file, whose ‹what happened› is its **Open 4**), which
   works but does not name the cause. The options:
   - (a) keep `crashed`, and have the diversity's words for
     `workerFailed` add "If it stops again, load panel.nei again in the
     Variants step." It changes only `diversity.md`, ends the loop at the
     second failure, and still does not say that the file is the cause;
     the advice also fits a trap of popnei that comes back, which a new
     load, with a new worker, can mend.
   - (b) a kind of its own: the runner answers a read that failed with an
     answer of its own in `messages.md`, and `RunError` of `protocol.ts`
     and `SourceError` of `project.md` gain a kind, the `reopenFailed` of
     `docs/specs/worker/client.md`, **Open 1** there, whose words are
     "panel.nei could not be read again; it may have changed on the disk
     since it was picked. Load it again in the Variants step." It names
     the cause, and changes the approved `protocol.md` and `project.md`
     and every place that writes a failure as text.
   This is one decision with **Open 1** of `client.md`, and the two are
   answered together. The recommendation is (b), as `client.md`'s: the
   case is rare in stage 2, but the words of a crash send the user to the
   wrong fix, and with reading by ranges every pass reads the disk again
   and it becomes the common case (`docs/architecture.md`, section 11).
   Meanwhile, (a), with the sentence of the diversity's words.
2. **Which popnei the walking skeleton is built on.** The release the
   site installs reads a file whole, so the largest file that opens is
   about 1.5 to 2 GB, a change of the filters reads the file again, and a
   run shows no progress; popnei's `main` has reading by ranges and the
   progress of a pass since 24 September 2026, in no release. The
   options: (a) build stage 2 on `js-v0.1.0-dev.1`, as `docs/build-order.md`
   and section 10 of the architecture have it, and make the reading by
   ranges a design of its own after it; (b) ask popnei for a release of
   `main` before the plan of stage 2, and write that design first, which
   rewrites "Opening the load", "The filters" and "The memory" of this
   spec and adds a progress bar to the diversity's screen. The
   recommendation is (a): the walking skeleton exists to find how the
   layers fit, and does it with small files; the design of (b) follows
   it. Against (a) stands a cost that sections 6 and 11 of
   `docs/architecture.md` do not list: with the release, every change of
   the filters reads the whole file again and copies it into the memory
   of wasm, a time that grows with the file, where the architecture
   counts that cost only at a restart of the worker. It is not measured
   yet ("What a restart costs" measures it at the end of stage 2), and it
   is a reason to prefer a release with reading by ranges, where it
   becomes the reading of a header. Meanwhile, (a).

## Not in this spec

- The shapes of the messages and their checks: `messages.md`. The queue,
  the restarts and the timeout of `ready`: `client.md`.
- The fields of the diversity's job and result, its warnings and its
  screen: `docs/specs/analyses/diversity.md`.
- The filters of the individuals, and the list the runner makes of them
  for `filterIndividuals`: stage 3. The filter of the regions of a BED
  file: stage 3, when popnei has it.
- The PCA, its MAF filter merged with the dataset's, and the
  intermediate results the worker keeps under their keys: stage 4.
- Writing the filtered variants as a `.nei` file, `writeVars`: stage 3.
- The light worker and the reader of the individuals file:
  `docs/specs/worker/individuals.md`.
