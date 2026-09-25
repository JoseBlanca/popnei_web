# The runner of the calculation worker

25 September 2026, approved by the owner on 25 September 2026. The calculation
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
already loads popnei in Chromium, Firefox and WebKit
(`docs/plans/site.report.md`). The owner decided on 25 September 2026
that stage 2 builds on popnei's release `js-v0.1.0-dev.2`, made that day
from popnei's `main` at `b3f77c8`, whose `openVcf` and `openVars` take
the `File` itself and read it by ranges, and whose `Variants` tells the
progress of a pass; this spec is written on it, and every claim about
popnei here was read in its sources or run with it in node. It builds on
`docs/specs/worker/protocol.md`, for the filters and the kinds of error,
and on `docs/specs/worker/messages.md`, for the requests and the
answers; the page's side is `docs/specs/worker/client.md`, and the
request and the result of the diversity are in
`docs/specs/analyses/diversity.md`. Those three were written at the
same time as this one, `messages.md` and `client.md` revised after it,
and what this spec relies on in each is listed at the end, under "What
this spec relies on in the others".

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
- The **progress** of a pass is popnei's `Progress`
  (`js/popnei/src/variant.ts`): `bytesRead`, the bytes of the file the
  pass has read; `numBytes`, the bytes the file holds; `pass`, which pass
  of the run is reading, from 1; and `numPasses`, how many passes the
  run makes. A run is one call of one popnei function over the
  `Variants`, of one pass or two.

## What it does

A user never sees the runner, and sees what it gets wrong: a diversity
calculated with another threshold than the one on the screen, the values
of one population in the row of another, a file refused with no word of
why, a file changed on the disk reported as a crash, a bar that stops
short or goes back to empty, a calculation that waits for ever for an
answer that will not come. The rules below are there against each of
these.

### Two files: the popnei calls, and the worker's script

The runner is two files, decided here:

- **`src/worker/runner.ts`** calls popnei and nothing of the worker's
  globals. It is given the source of the file, what popnei opens, and
  returns what the worker posts, so its tests run in node, where popnei loads
  from its node entry (`.claude/skills/coding/testing.md`).
- **`src/worker/runnerWorker.ts`** is the script the browser runs as the
  worker. It listens for the requests, checks them with `parseToRunner`
  of `messages.ts`, calls `runner.ts`, and posts the answers and the
  progress. It is a few dozen lines, and it is tested in the browser
  only.

At an `open`, the worker's script gives `runner.ts` the load and the
file of the load, `LoadFile` below: its `name`, the `File`'s own, the
name it had when the user picked it and the one the project holds; and
its `source`, the `File` itself, which popnei opens. In the tests of
node the source is the bytes of the file, and, for a file that no longer
reads, a `Blob` that popnei reads through a `FileReaderSync` the test
puts in place (below, "How it is verified"). `FileReaderSync` is the
call that reads a piece of a file at once, which a browser gives only
inside a worker and node not at all.

One file would not do. popnei, given a `File` under node, throws that
there is no `FileReaderSync` and says to give the bytes, so the tests
give popnei the bytes; and in node a worker's script cannot even be
imported, since the call by which it listens for the
page's requests, `addEventListener` of the worker, does not exist there.
popnei stays in
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
messages and popnei's `version()`; when it rejects, it posts `crashed`
with the message of what was thrown and closes itself, and the client
counts a failed start (`messages.md`).

`version()` of `js-v0.1.0-dev.2` gives "0.1.0", as `js-v0.1.0-dev.1`
did, though the two releases read a file differently and the second has functions the first has not: it is the
version of popnei's core crate, which neither release raised. The
version is part of every key and of every check number
(`docs/architecture.md`, section 3), so a key made with one release and
a key made with the other are the same key, and a check number saved
with one is compared as made by the same popnei as the other. The owner
agreed on 25 September 2026 that popnei raises its version with every
release, "0.1.0-dev.2" and on; it is asked of popnei
(`docs/specs/stage-2-open-points.md`, "What is asked of popnei"), and
until it is done the version in a key is only as good as the one
`version()` gives.

### Opening the load

The first request a calculation worker gets is `open`, with the load
(`messages.md`). The runner gives popnei the `File` itself, and popnei
reads from it the ranges it needs, never the whole file
(`js/popnei/src/io_vcf.ts` and `io_vars.ts`, whose `BytesOrFile` is a
`Uint8Array` or a `Blob`, which a `File` is):

1. `runner.ts` gives the source to `openVars` for a `.nei` file, and to
   `openVcf` with the read options for a VCF, `{ ploidy, onlyPassed }`,
   the two options of `openVcf`. The owner decided on 25 September 2026
   that the walking skeleton reads both formats, a VCF with its ploidy as
   a read option, 2 unless the user sets another; the project always
   holds both options of a VCF, so neither default of popnei is used.
2. popnei reads what says what the file holds before it returns. It
   reads through `FileReaderSync`, in ranges of 4 MiB at most, popnei's
   own size, which it does not promise (`Variants.onProgress` of
   `js/popnei/src/variant.ts`), and an open reads the first range of the
   file, 4 MiB or the whole file when it is smaller, which holds the
   header of a VCF; of a `.nei` file it then reads the last ten bytes,
   which say how long its footer is, and the footer, which holds the
   schema and where each batch is. Seen in node on 25 September 2026,
   with a `Blob` read through a `FileReaderSync` of the test's: the open
   of a `.nei` file of 15,091,826 bytes asked for the 4,194,304 bytes
   from 0, the 10 from 15,091,816 and the 2,922 from 15,088,904; the
   open of `panel.vcf.gz` asked for its 87,304 bytes from 0. No byte of
   the file is copied by our code, and the memory of wasm holds the
   ranges being read and not the file.
3. The worker posts `opened`, with the `individuals` and the `ploidy` of
   the `Variants`, which popnei gives with no pass over the variants.

The ploidy of a VCF is the one given, since popnei does not read it from
the file. A genotype of another ploidy is refused at the first pass that
reads it, not at the open, so a VCF of tetraploids opened with ploidy 2
opens, and the first diversity on it is refused (the cases, below).

The number of variants is not known at the open: popnei counts the
variants of a file only by reading all of them. It comes in the result
of each run, as the counts of the pass (below).

Every pass reads the file again from its start, through the `File`, its
first range again, and of a `.nei` file its last ten bytes and its
footer again as well (seen in node, as above: the pass over that `.nei`
file asked for the same three ranges as its open, then for the ranges
from byte 2,112 on), so the file is read from the disk at every
calculation, and a file changed
or removed on the disk after the pick fails at the next pass, as at the
open (below, "The file changed on the disk").

A worker opens one load. When popnei refuses the open, the runner
answers `refused`, or `reopenFailed` when popnei's message says that the
browser did not give it the file (below), and still holds that load, with no `Variants`, as
`client.md` has it: the client sends that worker nothing more on the
load, and the next file the user loads starts a new worker. A second `open`, a `run`
before the `open`, a `run` of another load than the one opened, and a
`run` after an open that popnei refused, are a defect of the page,
answered `badRequest` (`messages.md`, "A worker that cannot go on"). The
client starts a new worker for a new load, which is also how the memory
of the old one is given back (`docs/architecture.md`, section 5).

### The filters: the file opened again when they change

popnei puts a filter on the `Variants` for good, in this release as in
the one before: a step is never taken off, and a second filter of one
kind is refused (`docs/specs/worker/protocol.md`).
`js/popnei/src/variant.ts` has no way to copy a `Variants` or to take
its steps off. So the runner cannot put the filters of each request on
the one `Variants` it opened, as `.claude/skills/coding/worker.md`
supposed ("each request copies the filters onto a pass"): the second
diversity, after the user moved the threshold, would be refused with
"the variants are filtered by missing_data already, with a threshold of
0.05, and a second filter of that kind, whose threshold is 0.1, keeps
the variants that the stricter of the two keeps alone", as the release
gave in node on 25 September 2026.

For each request the runner reads the steps its `Variants` holds from
popnei's `steps`, and:

- **When those steps are the job's filters**, the same kinds in the same
  order, each argument of the step equal with `===` to the field of the
  same name of the filter, it runs on that `Variants` as it is.
- **When the `Variants` holds no step**, as it does after the open, it
  puts the job's filters on it, in their order, and runs. Without this
  rule the first run of every load with a filter would open the file a
  second time, since a `Variants` just opened holds none of its filters.
- **Otherwise, or when it holds no `Variants`**, after an open again that
  popnei refused (below), **it opens the file again**: it frees the
  `Variants` and holds none, opens the `File` again with the same format
  and read options, as at the open, and puts the job's filters on the new
  one, in their order.

Opening the file again reads what the open read, the first range of 4
MiB, and of a `.nei` file its last ten bytes and its footer, and not the
rest of the variants. So a change of the filters costs those reads and
no copy of the file: a user who tries ten thresholds reads ten ranges of
4 MiB more than the ten passes read anyway. How long that takes has not
been measured in a browser; it is measured at the end of stage 2 (below,
"What a restart costs"). The option not taken was to keep the old rule
of the release before, which put the filters missing from the end of the
list whatever steps the `Variants` held, and opened the file again for
any other change, to save the reading of a whole file: with one range at
stake, the `Variants` just opened is the one case worth sparing it.

The steps are read from popnei, and not from a list the runner keeps,
decided here, because popnei checks each filter as it is put: a job
whose second filter popnei refuses, a MAF filter of 1.5 after the
missing data filter at 0.05, leaves the `Variants` with the first filter
alone, which a list of the runner's own would have to be written at
each filter put to know. The next job, with the MAF filter at 0.9, finds
one step where it asks two, and opens the file again. The argument names
of popnei's steps are the field names of the filters of `protocol.ts`,
which that spec chose so. Seen in node on 25 September 2026, with
`js-v0.1.0-dev.2`: after `filterByMissingData(0.05)` and a
`filterByMaf(1.5)` that threw, `steps` is `[{ kind: "missing_data",
args: { maxAllowedMissingRate: 0.05 } }]`.

When the file is opened again and popnei refuses the new open, the
runner answers the run `reopenFailed`, with the name of the file and
popnei's message, whatever the message, and holds no `Variants`; the
next run opens the file again, whatever its filters. The same file
opened well before, so a refusal of its open now is a file changed on
the disk, which the browser may still read, and its words are those of a
file that changed, as the client has it for an `open` sent for a run
(`client.md`, "An `open` that the client sent for a run is not a read";
point B of `docs/specs/stage-2-open-points.md`).

Freeing first is what keeps the memory of wasm from growing with every
threshold tried. That memory never shrinks, but popnei's allocator takes
the room a freed `Variants` held for the next one. With the bytes of the
file, as the tests give them, a `Variants` held a copy of the file, and
the release before measured it: in node 26.8.2 on the owner's Mac, on a
`.nei` file of 19.2 MB, the memory of wasm stayed at 33.0 MB through four
thresholds when each `Variants` was freed before the next, and grew by a
copy of the file at each without the `free()`. With a `File` the
`Variants` holds the handle of the file and its steps, and a pass the
range it reads, two while it moves from one to the next, and the block
it builds, so what the `free()` keeps from
piling up is smaller; it has not been measured with a `File`, which only
a browser can open.

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
2. Sets the function that is told the progress with
   `variants.onProgress`: a function of the runner's that calls the
   `told` of the run, which the worker's script makes post each
   `Progress` as a `progress` of the run's id (below, "Progress"), and,
   when `told` throws, keeps what it threw and throws it on. popnei
   throws that same value back from its call, and a plain `Error` of
   ours would otherwise be taken for popnei's refusal and answered
   `refused`: when what `calcPerVarDistribs` threw is, with `===`, what
   `told` threw, the runner throws it again, a defect of ours, which the
   worker's script posts as `crashed`.
3. Calls `calcPerVarDistribs(variants, { pops, stats, minNumIndividuals,
   polyThreshold })` of `js/popnei/src/stats.ts`. The owner decided on
   25 September 2026 that the diversity is calculated with
   `calcPopDiversity`, with the same three columns; that function of the
   release gives none of them, and the runner calls `calcPerVarDistribs`
   of the same release until the owner confirms (point D of
   `docs/specs/stage-2-open-points.md`, and
   `docs/specs/analyses/diversity.md`, "What it does"). popnei takes the
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
   is polymorphic when its major allele frequency is below 0.95,
   strictly, as the owner decided on 25 September 2026 (`diversity.md`).
   The ploidy is that of the variants.
4. Puts the populations back in the order of the job. popnei gives them
   in the order the keys of `pops` iterate in, and JavaScript iterates
   the names that are whole numbers first, in numeric order: seen in
   node, populations named "10", "2" and "p1" came back as "2", "10",
   "p1". The runner makes each array of the result in the order of the
   job, finding each population by its name in popnei's `pops`; a name
   of the job that popnei did not give back is a defect of ours, thrown.
5. Builds the `DiversityResult` of `diversity.md` from popnei's result:
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
to find that number in a result of any kind (`docs/specs/core/store.md`),
which `src/core/apps.ts` gives (`docs/specs/entry.md`).
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
file can hold one, and the diversity is then locked, as the owner decided
on 25 September 2026, with the words `docs/specs/analyses/diversity.md`
gives in its table "Why it cannot run", so core never sends such a job.

The runner computes no key and never reads one. The worker's script
takes the key from the `run` request and puts it, as it came, into the
`result`, so a result is always filed under the key it was asked for
(`docs/architecture.md`, section 5).

### Progress

popnei calls the function set with `onProgress` from inside the pass,
while the worker is in wasm and reads no message of the page, which is
how the page learns that the run goes forward (`js/popnei/README.md`, "A
file of the page, in a web worker"). It calls it at three moments: at
the first read of a pass, with `bytesRead` 0; at each read that brings
the bytes read since the last call to the size of a range, 4 MiB; and at
the end of the run, once for each of its passes, in their order, with
the bytes that pass read. The runner passes on every call as it came,
the four fields unchanged, with no throttle: a pass over a file of 2 GB
makes about 500 calls, a message each, a few dozen bytes.

The bar of the page is drawn from the four fields, as the fraction of
the run done, `(pass − 1 + bytesRead / numBytes) / numPasses`
(`docs/specs/analyses/diversity.md`, the running state). Two properties
of popnei's calls that a bar has to respect, from its README and seen in
node on 25 September 2026 over `panel.nei`:

- **A pass over a `.nei` file ends below the size of the file**, since
  popnei does not read the schema message at its head: over the 261,490
  bytes of `panel.nei`, the calls of a diversity were `{ bytesRead: 0,
  numBytes: 261490, pass: 1, numPasses: 1 }` and `{ bytesRead: 259376,
  … }`. So the end of a pass is its last call, and a bar that waited for
  `bytesRead` to reach `numBytes` would wait for ever; the result ends
  the run, whatever the bar shows.
- **The bytes of a gzipped VCF are those of the file on the disk**,
  `panel.vcf.gz` ending at its 87,304 bytes, so the bar moves with the
  file as it is, compressed.

`numPassesOf("calcPerVarDistribs")` of `js/popnei/src/passes.ts` is 1,
and every call of the diversity carries `numPasses` 1. The runner does
not ask `numPassesOf`: popnei's first call, at 0 bytes, comes before a
byte is read, and carries the passes of the run. The PCA of stage 4,
whose `doPcaFromVariants` makes two passes when it asks for the weights
of the variants, is where a bar first goes over two passes.

popnei tells no progress of `openVcf` and `openVars`, which read before
there is a `Variants` to set the function on; an open reads the first range
of the file, and of a `.nei` file its footer, and the Variants step shows only that it is reading.

What the function throws ends the pass, and popnei's call throws the
same value back, which is how popnei lets a page cancel a run without
ending its worker. The runner does not use it: the page cannot reach the
worker while it is in wasm, since the worker reads a message only
between two calls, and without `SharedArrayBuffer`, which GitHub Pages
does not allow, there is no other way to tell it; so a cancel still ends
the worker (`docs/architecture.md`, section 5). A throw of `told`, the
worker's `postMessage` among its causes, which does not happen for four
numbers, ends the pass the same way, and the runner throws it again, so
it is `crashed` (above, "The diversity", step 2).

### The result, transferred

A result is posted with its typed arrays transferred, moved to the page
with no copy (`.claude/skills/coding/worker.md`, "Sending results
back"). The runner keeps no result, so nothing it holds is left empty.
`transferablesOf` gives the list: the buffer of every typed array of the
result, each once, so that two fields that hold one array, or two arrays
over one buffer, give it once, since a list that names one buffer twice
makes `postMessage` throw. Every array the runner builds in steps 4 and 5 owns
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
`reopenFailed`, a variants file the browser can no longer read;
`workerFailed`, a worker that crashed; `defect`, a mistake of our code.
Which answer, by what was thrown:

| what happened | answer | on the page (`RunError`) | the worker |
|---|---|---|---|
| a call to popnei that reads the file, the open or a calculation, threw a plain `Error` whose message is one of popnei's of a range the browser refused or gave short (below) | `reopenFailed`, with the name of the file and popnei's message | `reopenFailed` | goes on |
| a call to popnei threw any other plain `Error`, whose prototype is `Error.prototype` itself | `refused`, with the message as it is | `popnei` | goes on |
| a call to popnei threw anything else: a `WebAssembly.RuntimeError`, a trap of the wasm, a panic of Rust among the causes; a `RangeError` of a memory that cannot grow | `crashed`, with its message | `workerFailed` | closes |
| popnei refused the open of the file again, in a run whose filters changed or after an open again that failed, whatever its message | `reopenFailed`, with the name of the file and popnei's message; the runner holds no `Variants`, and the next run opens the file again | `reopenFailed` | goes on |
| a request that failed `parseToRunner`; a second `open`; a `run` before the `open`, of another load, or after an open that popnei refused; two populations of one name; a filter of individuals | `badRequest`, what was wrong | `defect` | closes |
| a throw of our own code anywhere else: what `told` threw, which popnei's call throws back (step 2 above), and a `popnei_web defect:` of step 4 among them | `crashed`, its message | `workerFailed` | closes |

- **The file changed on the disk.** A `File` is a handle to the file as
  it was when the user picked it, and the File API asks a browser to
  refuse to read one whose file was changed since, with a
  `NotReadableError`; popnei reads the disk at every pass, so a file
  overwritten, moved or deleted while the application is open fails at
  the next open or pass (`docs/architecture.md`, section 11). popnei
  gives no kind that tells this apart from a refusal of the data: every
  failure of a read crosses as a plain `Error`, the core's `Error::Io`,
  whose message starts "the source could not be read: "
  (`crates/popnei/src/error.rs` of popnei at `b3f77c8`). After it come
  the words of the binding of a `File`, `RangesOfAFile` of
  `crates/popnei-js/src/source.rs`, one for a range the browser refused,
  "the browser did not give popnei the ‹n› bytes from ‹at› of this file,
  which holds ‹size› bytes, and said: ‹its message›", and one for a range
  it gave short, "popnei asked this file for the ‹n› bytes from ‹at› and
  the browser gave ‹m› of them, in a file of ‹size› bytes: a range that
  comes back short inside a file of that size is a file that changed
  after the page got its handle, … Pick the file again." So the runner
  answers `reopenFailed` for a plain `Error` whose message starts "the
  source could not be read: the browser did not give popnei " or "the
  source could not be read: popnei asked this file for the ", and its
  words send the user to load the file again, as the owner decided on 25
  September 2026 (point B of `docs/specs/stage-2-open-points.md`). Any
  other message is `refused`, with popnei's message. The prefix alone
  would not do: a gzipped VCF that is damaged crosses with it too, the
  first 60,000 bytes of `panel.vcf.gz` giving "the source could not be
  read: incomplete deflate stream", which is a refusal of the data, and
  a user sent to load that file again would get the same answer. The
  draft read the first byte of the `File` after a refusal instead, which
  missed the range given short and told nothing popnei's message does
  not. Seen in node on 25 September 2026 with the release, a `Blob` read
  through a `FileReaderSync` of the test's that threw a
  `NotReadableError` or a `NotFoundError`, or gave a range one byte
  short: at the open, at the first range of a pass, at the last ten
  bytes and the footer of a `.nei` file and in the middle of a pass over
  a VCF of 59.9 MB, every case crossed as a plain `Error` with one of the
  two beginnings. The test holds them against the pinned release (below,
  "How it is verified"), since a change of popnei's words would silently
  turn a changed file into a refusal; a kind of popnei's error, which
  would need no words, is asked of popnei
  (`docs/specs/stage-2-open-points.md`, "What is asked of popnei"). An
  engine that reads a changed file without refusing it, and without a
  range given short, gives neither message; whether one does is found by
  the browser flow, and what the application does then is point R of
  `docs/specs/stage-2-open-points.md`. None of this has been seen in a
  browser; the File API has it.
- **popnei's refusal is caught at the call**, and only there: the open,
  each filter, `calcPerVarDistribs`. That catch is the one `try` of the
  runner that does not throw again (`.claude/skills/coding/typescript.md`,
  "Errors"), save for what `told` threw, which it throws again (above,
  "The diversity", step 2). A refusal leaves the `Variants` as it was, popnei says so of
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
  same. So no request is left without an answer, whatever breaks. The
  `error` handler also calls `event.preventDefault()`, so that the
  browser does not pass the error on to the page, where it would reach
  the window and the error bar as an error of the page, beside the crash
  the client already handles (`docs/specs/entry.md`, "The errors nothing
  else shows").
- **A refusal of popnei for memory is not told apart**: a block that the
  memory of wasm cannot hold is refused by popnei with a plain `Error`
  rather than a trap, and is `refused` like a refusal of the data
  (`docs/specs/worker/protocol.md`, "The cases"). With a `File` the
  memory of wasm holds a range and a block, not the file, so this is a
  block of a dataset of very many individuals, and no longer a large
  file.

## The TypeScript interface

What `runner.ts` exports, which the worker's script and the tests call.
`Job`, `JobResult` and `Progress` are of `protocol.ts` (`messages.md`,
"Job and JobResult", and "The progress"), where `Progress` has popnei's
four fields; `Result` is of `src/core/result.ts`.

popnei loaded, with its version, or the message of what `init()` threw.
A second call gives the same promise.

```ts
export function loadPopnei(): Promise<Result<string, string>>;
```

A load as the runner opens it, and its file (above, "Two files"): its
name, and what popnei opens, the `File` in the worker and its bytes, or
a `Blob`, in the tests.

```ts
export interface LoadToOpen {
  readonly fileId: string;
  readonly format: "vcf" | "nei";
  readonly readOptions: { readonly ploidy: number; readonly onlyPassed: boolean } | null;
}

export interface LoadFile {
  readonly name: string;                 // the File's name
  readonly source: Uint8Array | Blob;    // popnei's BytesOrFile
}
```

What the worker's script posts for a request: the value of `opened` or
`result`, or one of the four other answers of `messages.md`.

```ts
export type Answer<T> =
  | { readonly kind: "ok"; readonly value: T }
  | { readonly kind: "refused"; readonly message: string }    // popnei's; the worker goes on
  | { readonly kind: "reopenFailed"; readonly name: string;
      readonly message: string }                              // the file no longer reads; goes on
  | { readonly kind: "crashed"; readonly message: string }    // the worker closes after it
  | { readonly kind: "badRequest"; readonly message: string };// the worker closes after it
```

The runner of one worker, which holds its one load. Both functions
throw only for a defect of ours, which the worker's script posts as
`crashed`. `run` gives `told` each `Progress` of popnei as it comes, and
the worker's script posts it.

```ts
export interface Runner {
  open(load: LoadToOpen, file: LoadFile): Answer<{
    readonly individuals: readonly string[];
    readonly ploidy: number;
  }>;
  run(job: Job, told: (progress: Progress) => void): Answer<JobResult>;
}

export function createRunner(): Runner; // after loadPopnei has given ok
```

The answer of what a call to popnei threw, `refused` for a plain `Error`
and `crashed` for anything else, exported so that the tests reach the
cases popnei cannot be made to give in node, a trap among them. The
runner turns a `refused` into `reopenFailed` after this function, when
its message is one of popnei's of a range, or when it was an open
again.

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
- **A VCF with no variant.** A VCF of a header alone, with two
  individuals, opens, and its diversity is refused with "the pass gave
  no variant and its source holds none: a statistic of a pass is
  calculated over the variants it gives", with no filter and with the
  missing data filter at 0.1 alike, as the popnei of the release gave it
  in node on 25 September 2026. The diversity tells the user that the
  file has no variants (`diversity.md`, "Its words").
- **A VCF none of whose variants passed, read with only the passed
  ones.** A VCF of two individuals and two variants, both with `q10` in
  their FILTER column, opens with `{ ploidy: 2, onlyPassed: true }`, and
  its diversity is refused with the words of a VCF with no variant, "the
  pass gave no variant and its source holds none: a statistic of a pass
  is calculated over the variants it gives", since the variants that
  failed are dropped as the file is read; read with `{ ploidy: 2,
  onlyPassed: false }`, the same file gives a result over its 2
  variants. So it was in the popnei of the release, in node on 25
  September 2026. The diversity tells the user to untick the box of the
  passed variants (`diversity.md`, "Its words").
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
- **The file changed on the disk after it was picked.** It is read at
  every pass, at every change of the filters and at every restart, and
  the browser then refuses to read it, as the File API asks, or gives a
  range short. The answer is `reopenFailed`, as in the table, and the
  user reads that the file may have changed on the disk and to load it
  again in the Variants step. A browser that reads the changed file
  without either is point R of `docs/specs/stage-2-open-points.md`. This
  has not been seen in a browser.
- **A cancel** ends the worker wherever it is, inside a pass included
  (`docs/architecture.md`, section 5). The runner does nothing for it.
- **Progress** comes at the start of each pass, every 4 MiB, and at the
  end of the run, and never before the first `run`: the open tells none.

## How it runs

### The memory

popnei reads the `File` by ranges, so the file is never in memory whole,
neither in the heap of JavaScript nor in the memory of wasm, and the
size of a file that opens is not bounded by the memory of the tab
(`js/popnei/README.md`, "A file of the page, in a web worker"). What the
worker holds, from popnei's README and its doc comments:

- **The `Variants`**: the handle of the file, its name and its size, and
  its steps; nothing of the file between two ranges.
- **A pass**: the range it is reading, 4 MiB at most, and for the
  moment it moves to the next one the two, since popnei builds the new
  range before it frees the old (`RangesOfAFile` of
  `crates/popnei-js/src/source.rs`); the block it is building; and, over a `.nei` file, the batch it is reading, about 10 MB
  of genotypes for 1,000 individuals at the size popnei writes.
- **The result** of the diversity, a few arrays of one number per
  population, copied out of the memory of wasm before popnei's call
  returns.

The memory of wasm grows to the largest pass it has held and never
shrinks, and a restart of the worker gives it back
(`docs/architecture.md`, section 11). None of this has been measured with
a `File`, which only a browser opens; what the time of a pass over a
`File` costs against a pass over bytes, and which size of range is best,
are popnei's measurements to make (`docs/specs/js_sources.md` of popnei,
"Speed"). What limits a file is the time of a pass: every analysis reads
the whole file, and a gzipped VCF is decompressed whole at every pass.

### What a restart costs

The client ends the calculation worker at a cancel, after a `crashed`,
and when the load changes, and starts another (`client.md`). What the
new worker pays before its first request:

- **Loading popnei's wasm**, from the browser's cache after the first
  time. On 24 September 2026, on the deployed site with nothing in the
  cache, popnei loaded in a median of 59.8 ms in Chromium 153 and 80 ms in
  WebKit 26.6, five loads each, on the owner's Mac (`docs/plans/site.report.md`).
- **Opening the file again**: the client's `open`, which reads the
  first range of 4 MiB of the file, and of a `.nei` file its last ten
  bytes and its footer as well, and not the rest of the variants; the
  first pass reads that range again, as every pass does. It has not been
  measured in a browser.
- **What the old worker held is lost**: its `Variants` with its filters.
  In stage 2 nothing else; the intermediate results come in stage 4.

The first run after a restart puts its filters on the new `Variants`,
which holds no step, and makes its pass, with no second open (above,
"The filters"). Stage 2 ends with the measurement of
the restart (`docs/build-order.md`); for the runner it is the time from
the new worker's start to its `opened`, the time of a run whose filters
changed, which opens the file again, and the time of a pass, in the
three engines, on the VCF of 80,692,954 bytes that popnei's
`crates/popnei/benches/make_big_vcf.py` writes for 20,000 variants of
1,000 individuals and on the `.nei` file of 19.2 MB that `writeVars`
makes of it in batches of 1,000.

## How it is verified

### In node, at `createRunner`

`src/worker/runner.test.ts`, with Vitest, over the fixtures of
`e2e/fixtures/`, each given as the `source` of its `LoadFile` as `new
Uint8Array(readFileSync(path))`, a copy: node keeps a small file it reads
in a part of a larger block of memory it shares among several, and the
test would otherwise give popnei that block with the file somewhere
inside it. popnei reads bytes and a `File` with the same reader of the
core, the ranges of a `File` taken from the `File` and those of bytes
from the copy in wasm (`crates/popnei-js/src/source.rs` of popnei), so
the numbers are the same; that a `File` gives them too is seen in the
browser, below. The populations are those of `panel_pops.txt`, a copy of
popnei's `tests/reference/stats/panel_pops.txt`, 200 individuals in three
populations, 48 in p0, 84 in p2 and 68 in p1, in that order of first
appearance, which the plan adds to the fixtures. The numbers are written
into the tests as literals and compared exactly, with `toBe` of Vitest,
the runner of the tests in node: the release of popnei and its wasm are
the same in node and in the browser, and the runner passes popnei's
numbers on with no arithmetic, so any difference is a change of popnei
or a mistake of ours (below, "Where this departs from the skills").

The numbers were given by popnei of the release `js-v0.1.0-dev.2`,
installed on 25 September 2026 in a folder of its own with `npm install
--no-save
https://github.com/JoseBlanca/popnei/releases/download/js-v0.1.0-dev.2/popnei-0.1.0.tgz`,
with this file saved there as `numbers.mjs` and run with
`POPS=/Users/jose/devel/popnei/tests/reference/stats/panel_pops.txt
FIXTURES=‹the worktree›/e2e/fixtures node numbers.mjs`:

```js
import { readFileSync } from "node:fs";
import { init, openVars, openVcf, calcPerVarDistribs } from "popnei";
await init();
const pops = {};
for (const line of readFileSync(process.env.POPS, "utf8").trim().split("\n").slice(1)) {
  const [individual, pop] = line.split("\t");
  (pops[pop] ??= []).push(individual);
}
const runs = [["panel.nei"], ["panel.vcf.gz"], ["panel.nei", 0.05], ["panel.vcf.gz", 0.05],
  ["panel.nei", 1], ["panel.nei", 0.1], ["panel.nei", 0.045]];
for (const [file, threshold] of runs) {
  const bytes = new Uint8Array(readFileSync(`${process.env.FIXTURES}/${file}`));
  const v = file.endsWith(".nei") ? openVars(bytes) : openVcf(bytes);
  if (threshold !== undefined) v.filterByMissingData(threshold);
  const progress = [];
  v.onProgress((p) => progress.push(p));
  const r = calcPerVarDistribs(v, { pops, stats: ["obs_het", "unbiased_exp_het", "poly_vars_ratio"] });
  console.log(file, threshold ?? "no filter", r.passStats.numVars,
    JSON.stringify(r.passStats.filtering), JSON.stringify(progress));
  for (const [i, pop] of r.pops.entries()) {
    console.log(" ", pop, r.unbiasedExpHet.mean[i], r.obsHet.mean[i],
      r.polyVarsRatio.polyRatio[i], r.polyVarsRatio.totNumVariantsWithData[i]);
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

These are, to the last digit, the numbers that `js-v0.1.0-dev.1` gave on
the same files on the same day, which the draft of this spec held: the
release changed how popnei reads a file and not what it calculates.
`panel.vcf.gz` gives the same numbers as `panel.nei`, with and without
the filter. The filter at 1 keeps every variant, 1,200, and gives the
numbers of no filter, and so does the filter at 0.1, the default of the
application, since the missing rates of the panel stop at 0.08. The
filter at 0.045 keeps 1,113 variants. Every population has a value at
every variant kept, `totNumVariantsWithData` 1,200 and 1,152. With the
filter at 0.05 the counts of the pass are `{ missing_data: {
varsProcessed: 1200, varsKept: 1152 } }`, so the number of variants of
the file is 1,200. The progress of each run was two calls, `{ bytesRead:
0, numBytes: 261490, pass: 1, numPasses: 1 }` and `{ bytesRead: 259376,
numBytes: 261490, pass: 1, numPasses: 1 }` for `panel.nei`, and 0 then
87,304 of 87,304 bytes for `panel.vcf.gz`.

The tests, each at `open` and `run` of a runner made by `createRunner`:

- **The open**: `panel.nei` gives 200 individuals, the first `s000`, and
  ploidy 2; `panel.vcf.gz` with `{ ploidy: 2, onlyPassed: true }` the same.
- **The diversity**, with no filter and at 0.05: the table above, the
  populations in the order p0, p2, p1 with 48, 84 and 68 individuals,
  `numVarsWithValue` 1,200 and 1,152 in each, `numVars` 1,200 and 1,152,
  and `numVarsRead` 1,200 both times.
- **The progress**: the `told` of a diversity on `panel.nei` is given
  the two calls above, in that order, as popnei gave them.
- **The boundary** of `docs/specs/worker/protocol.md`: 39 variants of
  `panel.nei` have a missing rate of exactly 0.05, 10 of its 200
  individuals, and the filter at 0.05 keeps them, 1,152 variants, where
  the filter at 0.045 keeps 1,113. The protocol spec named 0.1 as its
  example; the missing rates of the panel stop at 0.08, and the check is
  the same at 0.05.
- **A change of the filters**: after a run at 0.05, a run at 0.045 is
  `ok`, with 1,113 variants, which a `Variants` that kept its filter
  would refuse as a second filter of one kind; then a run with no filter
  is `ok`, with the numbers of no filter.
- **A filter refused midway**: a run with the missing data filter at
  0.05 and a MAF filter of 1.5 is `refused`, with popnei's message of the
  threshold; the next run, at 0.05 with a MAF filter at 0.9, is `ok`.
- **An open again that popnei refuses**: a `LoadFile` whose `source` is
  a getter that counts its reads and gives the bytes of `panel.nei` the
  first time and those of `bad.vcf` after. The open reads it once; a run
  at 0.05 is `ok`, with 1,152 variants, and has not read it again, which
  is the rule of a `Variants` with no step; a run at 0.045 reads it a
  second time and is `reopenFailed`, with the name of the file and the
  message of `bad.vcf` as a `.nei` file; a third run, at 0.05, reads it
  a third time and is `reopenFailed` again.
- **A file that no longer reads**: the `source` a `Blob` of the bytes of
  `panel.nei`, whose ranges popnei reads through a `FileReaderSync` that
  the test puts in place with `vi.stubGlobal` and switches between
  reading, throwing `new DOMException("the file changed",
  "NotReadableError")`, and giving each range one byte short. Reading: the open gives 200
  individuals and a run at 0.05 the numbers of the table, which a `Blob`
  gives as the bytes do. Throwing: a run at 0.05, the same filters and
  no open again, is `reopenFailed`, with the name of the file and the
  message, as a literal, "the source could not be read: the browser did
  not give popnei the 261490 bytes from 0 of this file, which holds
  261490 bytes, and said: the file changed"; a run at 0.045, an open
  again, is `reopenFailed`; the open of a new runner is `reopenFailed`.
  Short: a run is `reopenFailed`, with a message that starts "the source
  could not be read: popnei asked this file for the 261490 bytes from 0
  and the browser gave 261489 of them". And the first 60,000 bytes of
  `panel.vcf.gz`, as bytes, are `refused` at the first run with "the
  source could not be read: incomplete deflate stream". These literals
  are what holds the runner's reading of popnei's words to the release
  it is pinned to.
- **What `told` throws**: a `told` that throws `new Error("told")` at
  its first call makes `run` throw that very value, compared with
  `toBe`, and not answer `refused`.
- **The order of the populations**: p0, p2 and p1 renamed "10", "2" and
  "p1" come back in that order, with the values of p0 under "10".
- **popnei's refusals**, each `refused` with the message of "The cases"
  as a literal: `tetraploid.vcf.gz` with ploidy 2, at the run after an
  `opened` of 12 individuals; `bad.vcf` at the open, as a VCF and as a
  `.nei` file; the missing data filter at 0.05 with a MAF filter at 0;
  a VCF of a header alone, with no filter and with the missing data
  filter at 0.1; the VCF whose two variants failed, read with only the
  passed ones, whose `numVarsRead` read with every variant is 2. The
  same messages were given by both releases, but
  those of the VCF of a header alone and of the VCF whose variants
  failed, looked at in `js-v0.1.0-dev.2` only.
- **The defects**: a `run` before the `open`, a `run` of another load
  id, a `run` after the `open` of `bad.vcf` that popnei refused, a second
  `open`, two populations of one name and a job with a filter of
  individuals are each `badRequest`.
- **`answerOfThrown`**: `new Error("x")` is `refused` with "x";
  `new RangeError("x")`, `new WebAssembly.RuntimeError("unreachable")`,
  a `TypeError`, what JavaScript throws for a mistake of the code, and a
  thrown string are `crashed`.
- **`transferablesOf`**: of a diversity result, one buffer per array,
  none twice when two fields hold one array; an array that is a view of
  part of a buffer throws.

### In the browser

What node does not have, a `File` that popnei reads by ranges with
`FileReaderSync`, the real worker and the transfer, is seen through the
flow of the walking skeleton in Chromium, Firefox and WebKit
(`.claude/skills/coding/testing.md`; the flow is the entry's and the
diversity's specs'). What it shows of the runner: a `panel.nei` picked
opens with 200 individuals and ploidy 2; the diversity at 0.05 and then
at 1 both show their numbers, so the `File` was opened again in the
worker; the bar of the running state reaches its last call; the result
reaches the page as typed arrays, which the page's check of
`messages.md` refuses otherwise; and `tetraploid.vcf.gz` read with
ploidy 2 opens and then shows popnei's message at the diversity.

A file changed on the disk after the pick is what the flow finds out for
each engine, since popnei tested its reading of a `File` in Chromium
alone, and an engine may refuse the read, give a range short, or read
the new bytes with no word (point R of
`docs/specs/stage-2-open-points.md`). The flow copies `panel.nei` into
the output folder of the test, picks the copy, runs the diversity at
0.05, and then writes the copy again under the same path in one of
three ways: shorter, its first 130,000 bytes; the same size, its bytes
with the one in the middle changed; longer, its bytes and 4,096 zero
bytes after them. After each it runs the diversity again at 0.05, a
pass with no open again, and then at 1, an open again, and it records
for each engine and each way what the page showed: the words of
`reopenFailed`, popnei's message of a refusal, the numbers of the
table, or other numbers. The numbers of the table after a rewrite are
the case of point R. Playwright gives a local browser the path of a file
it picks, so the `File` is on the disk; the flow checks it, in each
engine, by deleting the copy after a pick and running the diversity,
which a `File` on the disk cannot read. When it still reads, the engine
was given the file in memory, and the flow fails there rather than
record a rewrite it did not test.

## What this spec relies on in the others

Each of these was written with this one and approved by the owner on 25 September 2026, and
says what is listed here.

- **`docs/specs/worker/messages.md`**: the requests `open`, with the load
  id, the `File`, the format and the read options, and `run`, with the
  key and a `Job`; the answers `ready`, `opened`, `result`, `refused`,
  `reopenFailed`, `progress` with popnei's four fields, and `crashed`
  and `badRequest`, after which the worker closes itself;
  `parseToRunner`, which the worker's script calls on every request.
- **`docs/specs/worker/client.md`**: every worker receives at most one
  `open`, as its first request, and a new worker is started for a new
  load and after a cancel or a crash; one request at a time; a cancel
  that ends the worker; a worker whose read popnei refused is sent
  nothing more on that load; and `start.ts` making the worker from
  `./runnerWorker.ts?worker`.
- **`docs/specs/analyses/diversity.md`**: `DiversityJob` and
  `DiversityResult`, the populations of the job holding only individuals
  of the variants, none empty (`populationsToRun`); and the diversity
  locked while the project holds a filter of individuals, as the owner
  decided, so that no job with one is sent.
- **`docs/specs/entry.md`**: `numVarsOf` of `src/core/apps.ts` reads
  `numVarsRead`; the page asks for the open of a source whose read is
  pending, through the client.
- **`docs/specs/steps/variants.md`**: the number of variants shown is
  the one the file gives before the filters, and the ploidy of a VCF is
  shown as the one given.

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
- The filters are not copied onto a pass: popnei has no way to, in
  `js-v0.1.0-dev.2` as before, so a change of the filters frees the
  `Variants` and opens the `File` again, which reads its first range,
  and of a `.nei` file its footer, and not the rest of the variants.
- The check of the PCA's MAF filter given as one filter, which
  `docs/specs/worker/protocol.md` gave to the tests of stage 2, waits for
  the job of the PCA, in stage 4.

## Open points

The open points of the eleven specs of stage 2 are gathered in
`docs/specs/stage-2-open-points.md`, where the ones two specs share
are one point, asked of the owner once. The two this spec had were
decided by the owner on 25 September 2026, and are written above as
decided: a file the browser can no longer read is `reopenFailed`, a kind
of its own (point B there), and stage 2 builds on `js-v0.1.0-dev.2`,
which reads a `File` by ranges and tells the progress of a pass (point
C). Two points are open since:

1. **Which popnei function gives the diversity.** The owner decided
   `calcPopDiversity`, with the three columns He, Ho and the proportion
   of polymorphic variants; that function of the release gives none of
   the three (point D of `docs/specs/stage-2-open-points.md`, with its
   numbers). Meanwhile, `calcPerVarDistribs` of the same release, as
   "The diversity" above has it, whose numbers are the table of "How it
   is verified".
2. **What the application does in an engine that reads a changed file
   with no word** (point R of `docs/specs/stage-2-open-points.md`).
   Meanwhile, the browser flow records what each engine does with the
   three rewrites, and the runner does nothing more than the table
   above.

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
- Writing the filtered variants as a `.nei` file, `writeVars`, or as a
  VCF: stage 3, in the Variants step, as the owner decided on 25
  September 2026.
- The light worker and the reader of the individuals file:
  `docs/specs/worker/individuals.md`.
