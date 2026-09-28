# The runner of the calculation worker

25 September 2026, approved by the owner on 25 September 2026, and built
in `src/worker/runner.ts` and `runnerWorker.ts` with the walking
skeleton, the smallest application that goes through every part once
(stage 2 of `docs/build-order.md`). Revised on 26 September 2026 for
stage 3, the Variants step whole, as the architecture approved by the
owner that day has it; the revision is approved by the owner on 26 September 2026. Revised
again on 26 September 2026, after the review of the code of stage 3: the
test of the statistics of each individual also checks that the fixture
the tests of core read is popnei's. Revised on 27 September 2026 for
stage 4: the job of the principal components, its steps, its calls of
popnei, its cut to 10 components and its refusals, below, "The principal
components"; the note that the PCA makes two passes, which it no longer
does; and that the worker keeps no intermediate result in stage 4; and
again the same day, to agree with the specs written beside it: the
populations of a diversity job made by `src/core/project.ts`; and
when the specs of stage 4 were made to agree, the restart after a PCoA
as after a PCA; and with the owner's answers of 27 September 2026: the
pruned variants not kept between two PCAs, decided, and the PCA's
pruning, which has no distance by default, given one in the test of the
PCA; and on 28 September 2026 to popnei's release `js-v0.1.0-dev.3`,
which `package.json` names from the plan of stage 4: the call of the
PCoA as that release has it, its refusals and numbers, the options
objects that popnei now checks key by key, and the files `writeVars`
writes, 80 bytes larger for `panel.nei`. The calculation
worker is the thread of the browser tab, beside the page, that runs
popnei, so that a calculation does not freeze the page
(`docs/architecture.md`, section 1). Its runner is the code that answers
the page's requests there: it loads popnei, opens the variants file the
user picked, puts on it the filters of the variants and the list of the
individuals kept that each request gives, and runs the diversity, the
three analyses of the Variants step, the statistics of each individual,
the histograms of the variants and the counts of what each filter kept,
and the write of the filtered variants as a `.nei` file. This spec gives
what the runner does with each request, what it answers when popnei
refuses or something breaks, what it holds in memory, and the numbers
popnei gives on the fixtures, which its tests assert. It develops the
row `runner.ts` of section 9 of `docs/architecture.md`, and sections 4,
5, 6 and 11. The owner decided on 25 September 2026
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
  those it kept, `varsKept` (`js/popnei/src/filters.ts`). The runner
  gives them on as `PassStats` (`docs/specs/worker/protocol.md`).
- The **list of the individuals kept** is the one core makes from the
  filters of individuals and the statistics of each individual, and a job
  carries, `individuals`, `null` for every individual, in the jobs of the
  analyses that read the filters of individuals and in a write
  (`docs/specs/worker/protocol.md`). The runner puts it on the
  `Variants` last, with popnei's `filterIndividuals`, which popnei lists
  among the steps with the kind `"individuals"`.
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
`version()` gives. `js-v0.1.0-dev.3` gives "0.1.0" too (node, 28 September 2026), so
a check number saved with the application of stage 3 is compared with
one of stage 4 as made by the same popnei. The numbers of the two
scripts of "How it is verified", `numbers.mjs` and `numbers3.mjs`, and
those of the PCA are the same with both releases, and only the size of
a written file differs, which is no check number.

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

### The steps: the file opened again when they change

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

The steps a job asks for are its filters of the variants, in their
order, and then, when the job has `individuals` and it is a list, the
step of the individuals with that list; a job without the field, or with
`null`, keeps every individual (`docs/specs/worker/protocol.md`, "Job and
JobResult").
The list comes last, so the filters of the variants count over every
individual of the file, as the owner decided on 26 September 2026
(`docs/architecture.md`, section 2): popnei's `filterByMissingData` put
after `filterIndividuals` would divide by the individuals kept
(`js/popnei/src/variant.ts`). Every request over the variants, a `run`
of any analysis and a `write`, goes through the same rule. For each, the
runner reads the steps its `Variants` holds from popnei's `steps`, and:

- **When those steps are the job's**, the same kinds in the same order,
  each argument of a filter's step equal with `===` to the field of the
  same name of the filter, and the step of the individuals, when there is
  one, naming the same individuals in the same order, compared name by
  name, it runs on that `Variants` as it is.
- **When the `Variants` holds no step**, as it does after the open, it
  puts the job's steps on it, in their order, and runs. Without this
  rule the first run of every load with a filter would open the file a
  second time, since a `Variants` just opened holds none of its filters.
- **Otherwise, or when it holds no `Variants`**, after an open again that
  popnei refused (below), **it opens the file again**: it frees the
  `Variants` and holds none, opens the `File` again with the same format
  and read options, as at the open, and puts the job's steps on the new
  one, in their order.

So a `Variants` whose steps are the job's filters of the variants, and a
job that adds the list of individuals after them, is opened again, and
not given the list at its end: the rule of stage 2, below, spares the
reading of one range for the `Variants` just opened alone, and a rule of
prefixes would be one more way for the steps and the job to disagree.
Seen in node on 26 September 2026 with `js-v0.1.0-dev.2`: after
`filterByMissingData(0.05)` and `filterIndividuals` of 125 individuals,
`steps` is `[{ kind: "missing_data", args: { maxAllowedMissingRate: 0.05
} }, { kind: "individuals", args: { individuals: ["s000", "s003", …] }
}]`, the names in the order they were given.

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
job as they are, in the order of the job, which is the fixed order of
the project; the runner does not sort them. The number the user typed is
the number popnei is given, so a variant with a missing rate at the
threshold is kept (`docs/specs/worker/protocol.md`). Then it puts the
list of the individuals, when the job has one, with
`filterIndividuals(job.individuals)`. An empty list is a defect of the
page, answered `badRequest` before any step is put: core never sends one,
since an analysis cannot start when the filters keep no individual
(`docs/architecture.md`, section 4). A list that names an individual
twice, or one the file does not have, popnei refuses with a message that
names it, and the runner answers `refused` with it; core makes the list
from the individuals of the file, so this is a defect too, which the user
would read as popnei's message.

### The diversity

A diversity job holds its pass, the load id, the filters of the variants
and the list of the individuals kept, the populations, as pairs of a
name and its individuals in the order of the individuals file, only
individuals kept and none empty, and the two options of the diversity,
`minNumIndividuals` and `polyThreshold` (`docs/specs/analyses/diversity.md`,
`DiversityJob`). After the steps are on the `Variants` (above), the
runner:

1. Checks the job: no two populations of one name, since the object
   popnei takes would keep the last of them and silently give one
   population fewer. It is `badRequest`.
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
   release gives none of them, so they come from `calcPerVarDistribs` of
   the same release, as the owner settled with the approval of this spec,
   and `calcPopDiversity` waits for stage 5 (point D of
   `docs/specs/stage-2-open-points.md`, "What the owner decided with the
   approval"). popnei takes the
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
   `polyVarsRatio.totNumVariantsWithData`; and `passStats`, the counts of
   the pass (below, "The counts of every pass"). popnei types
   each of the three statistics as possibly `null`, which it gives for a
   statistic not asked for; the runner asks for all three, so a `null`
   is a defect of ours, thrown.

### The counts of every pass

Every request over the variants gives back the counts of its pass as
`PassStats` (`docs/specs/worker/protocol.md`), popnei's `passStats`
copied by one function of the runner, which checks them against the
job's filters:

- `numVars`, `passStats.numVars`, the variants the pass gave after every
  step;
- `filtering`, a field for each filter of the job, under its kind, put in
  the order of the job's filters, from the entry of popnei's
  `passStats.filtering` under that kind. A filter of the job with no
  entry there, or an entry of a kind the job does not have, is a defect
  of ours, thrown: the step of the individuals has no entry, and every
  filter of the variants has one.

The store finds the number of variants of the file in a result of any
kind through `countsOf`, which `src/core/apps.ts` gives in the place of
`numVarsOf` (`docs/architecture.md`, section 4, "What each filter
kept"): `varsProcessed` of the first filter, or `numVars` when the job
had none; of a VCF read with only the passed variants, it counts those.
It
records that number into the load, and fills the counts beside the
filters from any pass that had the project's filters. Seen in node on 26
September 2026 with `js-v0.1.0-dev.2`, on `panel.nei` with the missing
data filter at 0.05, the heterozygosity filter at 0.9 and the MAF filter
at 0.95, the counts were `missing_data` 1,200 to 1,152, `obs_het` 1,152
to 1,152 and `maf` 1,152 to 1,128, `numVars` 1,128, whether or not a
list of individuals came after them, as section 2 of the architecture
measured it.

Every request over the variants sets the function of the progress and
tells a throw of `told` from popnei's refusal as step 2 of the diversity
does, and catches popnei's refusal at its one call to popnei, as below.

The runner computes no key and never reads one. The worker's script
takes the key from the `run` or `write` request and puts it, as it came,
into the `result` or the `written`, so a result is always filed under the
key it was asked for
(`docs/architecture.md`, section 5).

### The statistics of each individual

An `individualChecks` job holds its pass alone, the filters of the
variants of the project and no list of individuals, since the statistics of
each individual are counted over the variants the filters keep and over
every individual, as the owner decided on 26 September 2026
(`docs/architecture.md`, section 4; `docs/specs/analyses/individualChecks.md`).
The runner calls `calcPerIndividualStats(variants)` of
`js/popnei/src/stats.ts` and gives back popnei's `individuals`,
`missingGtRate` and `obsHetRate`, one name and two numbers per
individual, with `passStats`. The names go with the numbers so that core
makes the list of the individuals kept from the result alone, and checks
them against the individuals of the load
(`docs/specs/core/individualsKept.md`); the runner checks first that
they are those the open of the file gave, the same names in the same
order, and a difference is a defect of ours, thrown, since the numbers
would then be read under other names. popnei's arrays are its own copies out of the memory of wasm
(`calcPerIndividualStats`), so the runner posts them as they are.

An individual with no called genotype among the variants of the pass has
a missing rate of 1 and a heterozygosity of NaN, which crosses as it is;
the filter by heterozygosity of core removes it (`docs/architecture.md`,
section 13, point 4). Seen in node on a VCF of two individuals and two
variants, one individual missing at both: `missingGtRate` `[0, 1]`,
`obsHetRate` `[0.5, NaN]`.

### The histograms of the variants

A `variantChecks` job holds a pass with no filter and no list of
individuals, since the histograms are of every variant and every
individual of the file (`docs/architecture.md`, section 4), and three
options, `minNumIndividuals`, 0, and the bins, `numBins` and `range`
(`docs/specs/analyses/variantChecks.md`). The runner calls
`calcPerVarDistribs(variants, { stats: ["maf", "obs_het",
"unbiased_exp_het"], minNumIndividuals, histKwargs: { numBins, range }
})` with no `pops`, which popnei takes as one population, `pop`, of every
individual the pass gives. It gives back `binEdges`, one copy of popnei's
`histBinEdges`, which popnei's three distributions share as one array
read only; and, of each of the three, `mean`, the one number of popnei's
`mean`, and `counts`, popnei's `histCounts`, `numBins` numbers for the
one population; with `passStats`.

With `minNumIndividuals` 0 a variant has a value whenever one genotype
at least is called there; a variant with none has no value and is in no
bin, so the counts of a histogram add up to the variants with something
called (`docs/specs/worker/protocol.md`, "The cases"). The histogram of
the missing rate of each variant comes with popnei's release that has
it.

### The counts of the filters

A `filterCounts` job holds its pass, the filters of the variants of
the project and no list of individuals, since the list comes after them
and changes none of their counts. The runner iterates popnei's
`variants.iterBlocks({ fields: [] })` of `js/popnei/src/variant.ts` to
its end, keeping nothing of the blocks, and gives back `passStats` from the
`passStats` of the iteration, read after it. The architecture, approved by the owner on 26 September 2026, chose it
over a calculation because its counts come also when the
filters keep no variant (`docs/architecture.md`, section 4): on
`panel.nei` with the missing data filter at 0.05 and the MAF filter at 0,
the iteration gave no block and the counts `missing_data` 1,200 to 1,152
and `maf` 1,152 to 0, where every calculation of popnei refuses the
pass, seen in node on 26 September 2026. `fields: []` asks for the
genotypes alone, and popnei still copies every block of genotypes out of
wasm, which is the cost section 11 of the architecture measures against
a pass of the diversity. What the iteration throws, it throws at a
block, and the runner catches it around the whole iteration as it would
a call.

### The principal components

A `pca` job holds its pass, the load id, the filters and the list of the
individuals kept, and two fields of its own, `method`, `"pca"` or
`"pcoa"`, and `numCompsKept`, 10 (`docs/specs/analyses/pca.md`,
`PcaJob`). Its filters are not the project's: core has put the PCA's own
MAF filter and LD pruning into the list, in the fixed order, one of each
kind (`pcaFilters`), so the runner puts them as it puts any job's, with
the list of individuals after them, and merges nothing. Since they differ
from the project's, the `Variants` of the analysis before or after a PCA
is opened again by the rule of "The steps", which reads a range of the
file. After the steps are on the `Variants`, the runner:

1. Sets the function of the progress, as for the diversity.
2. Calls, for the PCA, `doPcaFromVariants(variants, { numPrinComps: 0,
   transformToBiallelic: true })` of `js/popnei/src/pca.ts`: no weights
   of the variants, which makes one pass instead of two, and every allele
   but the major one counted the same, so that a variant of more than two
   alleles is not refused. For the PCoA it calls
   `doPcoaFromVariants(variants, { correctByLingoes: true })` of
   `js/popnei/src/pcoa.ts`, so that Kosman distances no space holds are
   corrected by Lingoes' method rather than refused, as the owner decided
   on 27 September 2026 (`pca.md`, "What it does"); popnei's default of
   `correctByLingoes` is false. Each options object is written with these
   keys alone, and never made from the job: `js-v0.1.0-dev.3` refuses a
   key it does not know, "popnei: `numCompsKept` is not an option of
   `doPcoaFromVariants`, whose options are `minNumSnps` and
   `correctByLingoes`", where `js-v0.1.0-dev.2` ignored it. The other
   calls of the runner, `openVcf` with `ploidy` and `onlyPassed`,
   `calcPerVarDistribs` with `pops`, `stats`, `minNumIndividuals`,
   `polyThreshold` and `histKwargs` of `numBins` and `range`,
   `iterBlocks` with `fields`, give only keys the release knows.
3. Checks that popnei's `individuals` are those the pass was to give, the
   list of the job or, when it is `null`, those of the open, in the same
   order, and that `projections` holds `individuals.length × numComps`
   numbers; a difference is a defect of ours, thrown, since the
   projections would be read under other names.
4. Keeps the first `numCompsKept` components: `numComps` the smaller of
   `numCompsKept` and popnei's `numComps`, which is `numCompsFound`;
   `projections` a new `Float64Array` of `individuals × numComps`, each
   row the first `numComps` numbers of popnei's row; and
   `explainedVariancePercent` the first `numComps` of popnei's, a new
   array. Every component popnei gives has variance, the individuals less
   one at most, and all of them at 9,381 individuals would be 704 MB; the
   percentages are popnei's, over the variance of every component.
5. Builds the `PcaResult` of `pca.md` with `method`, `numVarsUsed`, the
   length of popnei's `usedVars` for the PCA and `null` for the PCoA,
   `lingoesConstant` and `negativeEigenvaluesPercent`, popnei's for the
   PCoA and `null` for the PCA, and `passStats`, the counts of the
   pass.

popnei refuses, with a plain `Error`, answered `refused`: more than 9,381
individuals in the source, before the pass, "the principal components of
9382 individuals hold about 5 GB, …", counted on the individuals of the
file and not on the list the job puts, seen in node with the release on
27 September 2026, which core's lock prevents (`pca.md`, "Why it cannot
run"); no variant left, "there are no variants to do a PCA with", whether
the file holds none or the filters kept none; no variant with variance,
"no variant has more than one dosage among its called genotypes, …",
with one individual kept; and, with an LD pruning among the filters, a
file whose variants are not in the order of their positions, "the
variant 2 of the ones the filter by linkage disequilibrium has read, …",
at the pass. The PCoA refuses, before the pass, one individual, "there
is 1 individual, and a principal coordinate analysis places 2 at least
by the distance of each pair", and more than 9,381 individuals of the
pass, "the principal coordinates of 9382 individuals hold about 5 GB,
…", counted after the list of the job, so that a list of 100 of a file
of 9,382 is analysed; and after it a pass that keeps no variant, with
popnei's usual "the pass gave no variant …"; a pair of individuals with
no variant called in both, "4 of the 10 pairs of individuals have no
distance, …"; distances all 0, "every distance is 0, …"; and a file not
sorted under an LD pruning, as the PCA. With the correction asked, it
does not refuse distances that no space holds. Each was seen in node
with `js-v0.1.0-dev.3` on 28 September 2026, and `pca.md`, "The
request", gives them whole.
The panel says each in the user's words (`pca.md`, "Its
words").

The PCA holds the individuals × individuals matrix in the memory of
wasm, which grows to it and never shrinks: about 6.1 × 8 bytes per pair
of individuals, 662 MB more in the process at 4,000 individuals in node
(`pca.md`, "How it runs"). The PCoA was measured by popnei at 44.4 bytes
per pair at its peak, and popnei counts it at the PCA's 48.8. The client starts the worker again after a PCA
or a PCoA of more than 700 individuals (`docs/specs/worker/client.md`, "A large PCA,
and the restart after it"). The runner keeps nothing of a
PCA: in stage 4 the worker keeps no intermediate result, the variants
the pruning kept included, which popnei has no way to hold and give back
(decided by the owner on 27 September 2026, "The pruned variants are
not kept between two PCAs" in `docs/specs/stage-4-open-points.md`), so
each PCA prunes again inside its one pass.

### The written file

A `write` request holds a key and a `WriteJob`: its pass, the filters of
the variants and the list of the individuals kept of the project, and
the format, `nei` (`docs/specs/worker/protocol.md`). After the steps are
on the `Variants` (above), the runner:

1. Calls `writeVars(variants)` of `js/popnei/src/io_vars.ts`, with
   popnei's own size of batch. popnei builds the whole file in the memory
   of wasm and copies it out, piece by piece, into one `Uint8Array` of
   the heap of JavaScript, `bytes` of its result, with `passStats`. The
   file holds the variants the steps keep, and only the individuals of
   the list: on `panel.nei` with the missing data filter at 0.05, 250,994
   bytes, which `openVars` opened again with 200 individuals and 1,152
   variants; with the list of 125 individuals of "The cases" after that
   filter, 176,098 bytes and 125 individuals; with no filter, 261,490
   bytes, the size of `panel.nei` itself; seen in node on 26 September
   2026 with `js-v0.1.0-dev.2`. `js-v0.1.0-dev.3` writes version 1.1 of
   popnei's vars file, whose key holds the lengths of the chromosomes
   (popnei's commit `343bc4f`, one of the changes of its writer since
   `js-v0.1.0-dev.2`), and its files are larger: 251,074,
   176,122 and 261,570 bytes for the three, with the same variants and
   individuals read back (node, 28 September 2026). It reads the files of
   `js-v0.1.0-dev.2`, and `e2e/fixtures/panel.nei`, 261,490 bytes, is not
   written again: every number the tests read from it, the progress
   among them, is the same with both releases.
2. Makes a `Blob` of the bytes, `new Blob([bytes])`, and keeps no
   reference to the array, so that the heap of the worker can give it
   back; whether the engine copies the array into the `Blob` is measured
   in the three engines (`docs/architecture.md`, section 11).
3. Gives back `Written<Blob>`: the format, `"nei"`, the `Blob`,
   `numBytes`, its `size`, and `passStats`. The worker's script posts it
   as `written`, under the key of the request, with no list of
   transfers: the `Blob` crosses as a handle
   (`docs/specs/worker/messages.md`).

A file of no variant is written, not refused, since popnei's `writeVars`
writes one, 3,594 bytes for the filters above with a MAF filter at 0,
3,682 with `js-v0.1.0-dev.3`, and
the runner passes popnei's answer on; the step does not offer it
(`docs/specs/analyses/writeVariants.md`). popnei refuses the write with a plain
`Error` when the memory of the tab does not take the file, answered
`refused`, and a memory that cannot grow can end in a `RangeError` or a
trap, answered `crashed` (below, "What it answers when something goes
wrong"); the words of both, which say the file may be too large for the
tab, are those of `writeVariants.md`.

The runner keeps nothing of a write. The memory of wasm keeps the room
of the file, which never shrinks, and the client starts the worker again
after a file larger than a bound, and after a write popnei refused, to
give it back
(`docs/specs/worker/client.md`, "A write, and the restart after a large
one").

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

`numPassesOf` of `js/popnei/src/passes.ts` is 1 for each function the
runner calls in stages 3 and 4, `calcPerVarDistribs`,
`calcPerIndividualStats`, `iterBlocks`, `writeVars`, and
`doPcaFromVariants` with `numPrinComps` 0, and every call of their
progress carries `numPasses` 1; over `panel.nei` each gave the two calls
of the diversity, seen in node on 26 and 27 September 2026. The runner
does not ask `numPassesOf`: popnei's first call, at 0 bytes, comes before
a byte is read, and carries the passes of the run. No run of stage 4
makes two passes: the PCA asks for no weights of the variants, which
would make it read the file twice, and the PCoA reads it once,
`numPassesOf("doPcoaFromVariants")` 1, whose progress over `panel.nei`
was the same two calls (node, `js-v0.1.0-dev.3`, 28 September 2026). The
last call of the progress of either, at the end of the run, comes after
the decomposition of the matrix, which popnei does not report, in
`js-v0.1.0-dev.3` as before: over a VCF of 20,066,850 bytes and 2,500
individuals, the last range of the PCA was told at 0.04 s and the end at
6.75 s, in node with `js-v0.1.0-dev.2` on 27 September 2026, so the bar stays at the share of the last range
meanwhile (`pca.md`, "How it runs").

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
makes `postMessage` throw. Every array the runner posts owns its whole
buffer: those it builds in steps 4 and 5 of the diversity, the copies of
the edges of the histograms, and popnei's own arrays of the statistics of
each individual and of the counts of the bins, which popnei copies out of
the memory of wasm and never gives as views into it
(`js/popnei/src/stats.ts`); the function checks it all the same, and an
array that is a view of part of a buffer is a defect, thrown (below,
"Where this departs from the skills"). NaN, the value popnei gives a
population with no variant of enough data or an individual with no
called genotype, crosses as it is. A `written` transfers nothing: a
`Blob` is not transferred, it crosses as a handle, and its `passStats` holds
no typed array.

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
| a call to popnei that reads the file, the open, a calculation, the iteration of the counts or the write, threw a plain `Error` whose message is one of popnei's of a range the browser refused or gave short (below) | `reopenFailed`, with the name of the file and popnei's message | `reopenFailed` | goes on |
| a call to popnei threw any other plain `Error`, whose prototype is `Error.prototype` itself: a refusal of the data, filters that keep no variant, a list of individuals that names one twice, a file the memory of the tab does not take | `refused`, with the message as it is | `popnei` | goes on |
| a call to popnei threw anything else: a `WebAssembly.RuntimeError`, a trap of the wasm, a panic of Rust among the causes; a `RangeError` of a memory that cannot grow | `crashed`, with its message | `workerFailed` | closes |
| popnei refused the open of the file again, in a request whose steps changed or after an open again that failed, whatever its message | `reopenFailed`, with the name of the file and popnei's message; the runner holds no `Variants`, and the next run opens the file again | `reopenFailed` | goes on |
| a request that failed `parseToRunner`; a second `open`; a `run` or a `write` before the `open`, of another load, or after an open that popnei refused; an empty list of individuals; two populations of one name | `badRequest`, what was wrong | `defect` | closes |
| a throw of our own code anywhere else: what `told` threw, which popnei's call throws back (step 2 above), a `popnei_web defect:` of step 4 or of the counts of a pass among them | `crashed`, its message | `workerFailed` | closes |

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
  each filter, the list of individuals, `calcPerVarDistribs`,
  `calcPerIndividualStats`, the iteration of `iterBlocks`, `writeVars`,
  and, from stage 4, `doPcaFromVariants` and `doPcoaFromVariants`.
  That catch is the one `try` of the
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
`Job`, `JobResult`, `WriteJob`, `Written` and `Progress` are of
`protocol.ts` (`messages.md`, "Job and JobResult", and "The progress"),
where `Progress` has popnei's four fields; `Result` is of
`src/core/result.ts`.

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

What the worker's script posts for a request: the value of `opened`,
`result` or `written`, or one of the four other answers of
`messages.md`.

```ts
export type Answer<T> =
  | { readonly kind: "ok"; readonly value: T }
  | { readonly kind: "refused"; readonly message: string }    // popnei's; the worker goes on
  | { readonly kind: "reopenFailed"; readonly name: string;
      readonly message: string }                              // the file no longer reads; goes on
  | { readonly kind: "crashed"; readonly message: string }    // the worker closes after it
  | { readonly kind: "badRequest"; readonly message: string };// the worker closes after it
```

The runner of one worker, which holds its one load. The three functions
throw only for a defect of ours, which the worker's script posts as
`crashed`. `run` and `write` give `told` each `Progress` of popnei as it
comes, and the worker's script posts it.

```ts
export interface Runner {
  open(load: LoadToOpen, file: LoadFile): Answer<{
    readonly individuals: readonly string[];
    readonly ploidy: number;
  }>;
  run(job: Job, told: (progress: Progress) => void): Answer<JobResult>;
  write(job: WriteJob, told: (progress: Progress) => void): Answer<Written<Blob>>;
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
  without either is point R of `docs/specs/stage-2-open-points.md`,
  which the walking skeleton measured on 25 September 2026: Chromium 153
  refused every rewrite, and WebKit 26.6 read the new bytes with no word
  when the rewrite put the file's time of change back, as `rsync -t`
  does (`docs/plans/walking-skeleton.report.md`, "Point R"); Firefox is
  measured by the owner.
- **The filters keep no variant.** The diversity and the statistics of
  each individual are `refused` with popnei's "the pass gave no variant:
  …", above; the counts of the filters are a result, since `iterBlocks`
  gives them then; and a write gives a file of no variant, whose
  `passStats.numVars` is 0 (above, "The written file").
- **The filters keep no individual.** Core sends no job then; an empty
  list that reached the runner would be `badRequest`, before any step is
  put.
- **A list of individuals after a threshold of the variants.** The
  counts of the filters of the variants are those they give with every
  individual, since the list comes after them: on `panel.nei` at 0.05,
  with the 125 individuals whose missing rate over those 1,152 variants
  is at most 0.03, the counts are 1,200 to 1,152, as with no list.
- **An individual with no called genotype** among the variants of the
  pass has the statistics 1 and NaN (above), and is in the list of core
  only if no threshold of heterozygosity is set.
- **A variant with nothing called** has no value in the histograms of
  the variants, and is in no bin (above).
- **A cancel** ends the worker wherever it is, inside a pass included,
  and inside a write too, which leaves nothing: the bytes and the `Blob`
  are the worker's until it posts them (`docs/architecture.md`, section
  5). The runner does nothing for it.
- **Progress** comes at the start of each pass, every 4 MiB, and at the
  end of the run, and never before the first `run` or `write`: the open
  tells none.

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
- **The matrix of a PCA**, from stage 4: the individuals × individuals
  matrix, its eigenvectors and the workspace of the decomposition, about
  6.1 × 8 bytes per pair of individuals, 4.3 GB at the 9,381 popnei
  allows, which the memory of wasm keeps after the PCA (above, "The
  principal components"). The PCoA holds the sums of its pass, 4 bytes
  per pair, while it reads, and at its peak no more than the PCA, 44.4
  bytes per pair measured by popnei, whose limit is the same 9,381
  individuals, of the pass.

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
when the load changes, from stage 3 after a written file larger than a
bound, and from stage 4 after a PCA of more individuals than a bound, and
starts another (`client.md`). What the
new worker pays before its first request:

- **Loading popnei's wasm**, from the browser's cache after the first
  time. On 24 September 2026, on the deployed site with nothing in the
  cache, popnei loaded in a median of 59.8 ms in Chromium 153 and 80 ms in
  WebKit 26.6, five loads each, on the owner's Mac (`docs/plans/site.report.md`).
- **Opening the file again**: the client's `open`, which reads the
  first range of 4 MiB of the file, and of a `.nei` file its last ten
  bytes and its footer as well, and not the rest of the variants; the
  first pass reads that range again, as every pass does. From the start
  of a new worker to the file opened, at most 49 ms, measured at the end
  of the walking skeleton on the VCF and the `.nei` file below, in
  Chromium 153 and WebKit 26.6 on the owner's Mac
  (`docs/plans/walking-skeleton.report.md`).
- **What the old worker held is lost**: its `Variants` with its filters.
  Nothing else before stage 7: the worker keeps no intermediate result in
  stage 4, the variants the pruning of the PCA kept among them
  (decided by the owner on 27 September 2026, "The pruned variants are
  not kept between two PCAs" in `docs/specs/stage-4-open-points.md`), and the
  kinship, the first, comes with the GWAS.

The first request after a restart puts its steps on the new `Variants`,
which holds none, and makes its pass, with no second open (above, "The
steps"). The files of the measurement are the VCF of 80,692,954 bytes
that popnei's `crates/popnei/benches/make_big_vcf.py` writes for 20,000
variants of 1,000 individuals and the `.nei` file of 19,161,178 bytes
that `writeVars` makes of it in batches of 1,000.

### What a write holds

A write of a file of F bytes holds at its peak, measured on 27 September
2026 in Chromium 153 and WebKit 26.6, about 4F more than the tab held
before in Chromium and up to 6.1F in WebKit: in Chromium about 2.4F in the
memory of wasm, where popnei builds the whole file, F in the array
popnei copies it into, and F in the browser's own process, where the
engine copies the array into the `Blob`; once the array is dropped, the
`Blob` and the room wasm grew to, which never shrinks, stay
(`docs/architecture.md`, sections 6 and 11;
`docs/specs/analyses/writeVariants.md`, "What was measured"). The
largest file both engines wrote was 1,982,018,522 bytes. With popnei's
writer by pieces, asked of popnei on 26 September 2026, the runner keeps
the pieces as they come and makes one `Blob` of them at the end, and the
peak loses what wasm holds of the file; stage 3 does not wait for it.

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

The tests of stage 2, each at `open` and `run` of a runner made by
`createRunner`, with the diversity's `passStats` in the place of its
`numVars` and `numVarsRead`:

- **The open**: `panel.nei` gives 200 individuals, the first `s000`, and
  ploidy 2; `panel.vcf.gz` with `{ ploidy: 2, onlyPassed: true }` the same.
- **The diversity**, with no filter and at 0.05: the table above, the
  populations in the order p0, p2, p1 with 48, 84 and 68 individuals,
  `numVarsWithValue` 1,200 and 1,152 in each, and `passStats`
  `{ numVars: 1200, filtering: {} }` and `{ numVars: 1152, filtering: {
  missing_data: { varsProcessed: 1200, varsKept: 1152 } } }`.
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
  passed ones, whose `passStats.numVars` read with every variant is 2. The
  same messages were given by both releases, but
  those of the VCF of a header alone and of the VCF whose variants
  failed, looked at in `js-v0.1.0-dev.2` only.
- **The defects**: a `run` before the `open`, a `run` of another load
  id, a `run` after the `open` of `bad.vcf` that popnei refused, a second
  `open`, two populations of one name, a job whose `individuals` is an
  empty list, and a `write` before the `open`, are each `badRequest`.
- **`answerOfThrown`**: `new Error("x")` is `refused` with "x";
  `new RangeError("x")`, `new WebAssembly.RuntimeError("unreachable")`,
  a `TypeError`, what JavaScript throws for a mistake of the code, and a
  thrown string are `crashed`.
- **`transferablesOf`**: of a result of each of the five analyses, the
  principal components with their `projections` and
  `explainedVariancePercent`, one buffer per array, none twice when two
  fields hold one array; an array that is a view of part of a buffer
  throws.

The numbers of stage 3 were given by the same release, on 26 September
2026, in the folder of the numbers above with `numbers3.mjs`, run as
`numbers.mjs` is:

```js
import { readFileSync } from "node:fs";
import { init, openVars, calcPerIndividualStats, calcPerVarDistribs, writeVars } from "popnei";
await init();
const bytes = (f) => new Uint8Array(readFileSync(`${process.env.FIXTURES}/${f}`));
const pops = {};
for (const line of readFileSync(`${process.env.FIXTURES}/panel_pops.txt`, "utf8").trim().split("\n").slice(1)) {
  const [individual, pop] = line.split("\t");
  (pops[pop] ??= []).push(individual);
}
const at05 = () => { const v = openVars(bytes("panel.nei")); v.filterByMissingData(0.05); return v; };
let v = at05();
const s = calcPerIndividualStats(v); v.free();
console.log("individuals", s.individuals.length, [...s.missingGtRate.slice(0, 3)], [...s.obsHetRate.slice(0, 3)],
  JSON.stringify(s.passStats));
const kept = s.individuals.filter((_, i) => s.missingGtRate[i] <= 0.03);
console.log("kept", kept.length, kept.slice(0, 3));
v = at05(); v.filterIndividuals(kept);
const keptPops = Object.fromEntries(Object.entries(pops).map(([p, is]) => [p, is.filter((i) => kept.includes(i))]));
const d = calcPerVarDistribs(v, { pops: keptPops, stats: ["obs_het", "unbiased_exp_het", "poly_vars_ratio"] });
console.log("diversity", d.pops, Object.values(keptPops).map((is) => is.length), [...d.unbiasedExpHet.mean], [...d.obsHet.mean],
  [...d.polyVarsRatio.polyRatio], JSON.stringify(d.passStats));
v.free();
v = openVars(bytes("panel.nei"));
const h = calcPerVarDistribs(v, { stats: ["maf", "obs_het", "unbiased_exp_het"], minNumIndividuals: 0 }); v.free();
for (const k of ["maf", "obsHet", "unbiasedExpHet"]) {
  const c = [...h[k].histCounts];
  console.log(k, h[k].mean[0], c.length, c.reduce((a, b) => a + b), JSON.stringify(c));
}
for (const [label, put] of [["three", (x) => { x.filterByMissingData(0.05); x.filterByObsHet(0.9); x.filterByMaf(0.95); }],
                            ["three and the list", (x) => { x.filterByMissingData(0.05); x.filterByObsHet(0.9); x.filterByMaf(0.95); x.filterIndividuals(kept); }],
                            ["maf 0", (x) => { x.filterByMissingData(0.05); x.filterByMaf(0); }]]) {
  v = openVars(bytes("panel.nei")); put(v);
  const blocks = v.iterBlocks({ fields: [] }); let n = 0; for (const _ of blocks) n += 1;
  console.log("counts", label, n, JSON.stringify(blocks.passStats)); v.free();
}
for (const [label, put] of [["none", () => {}], ["0.05", (x) => x.filterByMissingData(0.05)],
                            ["0.05 and the list", (x) => { x.filterByMissingData(0.05); x.filterIndividuals(kept); }],
                            ["0.05 and maf 0", (x) => { x.filterByMissingData(0.05); x.filterByMaf(0); }]]) {
  v = openVars(bytes("panel.nei")); put(v);
  const w = writeVars(v); v.free();
  const back = openVars(w.bytes);
  console.log("write", label, w.bytes.length, JSON.stringify(w.passStats), back.individuals.length);
  back.free();
}
```

The list of the tests below calls it **the list of 125**: the 125
individuals of `panel.nei` whose missing rate over the 1,152 variants the
missing data filter at 0.05 keeps is at most 0.03, in the order of the
file, `s000`, `s003`, `s004` and on, which the test makes from the
result of its own `individualChecks` run, as core would. Each test at
`run` or `write` of a runner made by `createRunner`, after the open of
`panel.nei`:

- **The statistics of each individual**, at 0.05: 200 individuals, the
  first three with `missingGtRate` 0.026041666666666668,
  0.036458333333333336 and 0.03211805555555555 and `obsHetRate`
  0.3672014260249554, 0.3441441441441441 and 0.37309417040358744, no NaN,
  and `passStats` `{ numVars: 1152, filtering: { missing_data: {
  varsProcessed: 1200, varsKept: 1152 } } }`. The same 200 names and
  statistics are those of `e2e/fixtures/panel_individual_stats.json`,
  compared exactly, with a NaN held there as `null`: the tests of core
  read popnei's statistics from that file, since they do not call popnei,
  and this test fails when the release of popnei gives others
  (`docs/architecture.md`, section 4, "What would show these choices
  wrong"). A VCF written in the test, two individuals and two variants,
  the second individual missing at both, gives `missingGtRate` `[0, 1]`
  and `obsHetRate` `[0.5, NaN]`.
- **The diversity with the list of 125** after the filter at 0.05: the
  populations p0, p2 and p1 with 32, 54 and 39 individuals, He
  0.35235226528316066, 0.34398672129705354 and 0.34990422931551174, Ho
  0.3565861820201193, 0.3519488909232355 and 0.35589376321324523, the
  polymorphic share 0.9088541666666666, 0.9019097222222222 and
  0.9192708333333334, and `passStats` 1,152 of 1,200, as without the
  list.
- **The diversity with the list of 119**, the individuals of the list of
  125 whose observed heterozygosity is also at most 0.38, the two
  thresholds of the flow of the Variants step: p0, p2 and p1 with 32, 50
  and 37 individuals, and the numbers of the table of
  `docs/specs/analyses/diversity.md`, "How it is verified", He
  0.35235226528316066, 0.34326346030608246 and 0.34948537601203733, as
  literals; and the file written with that list, 170,042 bytes
  (`docs/specs/analyses/writeVariants.md`). Seen in node on 26 September
  2026 with the release.
- **The steps with the list**: after that diversity, a run with the same
  filter and no list opens the file again, as does a run with the same
  list of other order; a run with the same filter and the same list does
  not. The test counts the reads of the source as the test of an open
  again that popnei refuses does.
- **The histograms of the variants**, with no filter, `minNumIndividuals`
  0, 40 bins and the range 0 to 1, popnei's defaults: `binEdges` of 41
  numbers from 0 to 1, over a buffer of its own; the means
  0.7163445463101891 of the MAF, 0.35429523451520484 of Ho and
  0.3754712450806149 of He; 40 counts in each, which add up to 1,200, the
  counts of the MAF 0 in its first 20 bins, and every count as the
  literal arrays `numbers3.mjs` gave.
- **The counts of the filters**: with the missing data filter at 0.05,
  the heterozygosity filter at 0.9 and the MAF filter at 0.95,
  `passStats` is `numVars` 1,128 and `filtering` `missing_data` 1,200 to
  1,152, `obs_het` 1,152 to 1,152 and `maf` 1,152 to 1,128, its fields in
  that order; a diversity with the same filters and the list of 125
  gives the same `passStats`; with the missing data filter at 0.05 and a
  MAF filter at 0, `numVars` 0 and the counts 1,200 to 1,152 and 1,152
  to 0, a result and not a refusal.
- **The written file**: with no filter, a `Blob` of 261,490 bytes,
  `numBytes` 261,490, whose bytes open again with `openVars` with 200 individuals; at 0.05,
  250,994 bytes and `passStats` 1,152 of 1,200; at 0.05 with the list of
  125, 176,098 bytes that open again with those 125 individuals in their
  order, and with the list of 119, 170,042 bytes; at 0.05 with a MAF filter at 0, 3,594 bytes and
  `passStats.numVars` 0. The progress of each is the two calls of
  the diversity, and a `told` that throws makes `write` throw that
  value, as for `run`. These sizes are `js-v0.1.0-dev.2`'s; from the
  commit of stage 4 that names `js-v0.1.0-dev.3` in `package.json` they
  are 261,570, 251,074, 176,122, 170,122 and 3,682 bytes, with the same
  counts and the same individuals read back (node, 28 September 2026, by
  `numbers3.mjs` above run with each release, whose other numbers are the
  same with both).

The numbers of the PCA were given by the same release on 27 September
2026, and the same by `js-v0.1.0-dev.3` on 28 September 2026, which gave
those of the PCoA, by the script of `docs/specs/analyses/pca.md`, "How it is
verified", which gives the table they come from. Each test at `run` of a
runner made by `createRunner`, after the open of `panel.nei`:

- **The PCA with its pruning**, a job of the filters of a first project
  and the PCA's, the missing data filter at 0.1, the MAF filter at 0.95
  and the LD pruning at r² 0.1 within 50,000 base pairs, a distance the
  user types, since the PCA's pruning has none by default, and no list:
  `numCompsFound` 199, `numComps` 10, `projections` of 2,000 numbers,
  those of `s000` −0.7546702846382134, 7.577178941266335 and
  −4.924745039386669 first, the ten percentages of that spec,
  `numVarsUsed` 535, `lingoesConstant` and `negativeEigenvaluesPercent` `null`, and `passStats`
  `missing_data` 1,200 to 1,200, `maf` 1,200 to 1,175 and `ld` 1,175 to
  535, in that order; and the two calls of the progress of the diversity.
- **The PCA with the pruning off**: PC1 7.7259798956433725, `s000` on
  PC1 1.5339065839147532, `numVarsUsed` 1,175.
- **A job with `numCompsKept` 3** keeps 3 components, `projections` of
  600 numbers, each row the first three of popnei's.
- **Two individuals**, the MAF filter at 0.95 and the list `s000`,
  `s001`: `numComps` and `numCompsFound` 1, `explainedVariancePercent`
  `[100]`, `s000` at 18.78829422805594.
- **The refusals**, `refused` with popnei's messages as literals: the
  missing data filter at 0.05 and a MAF filter at 0, "there are no
  variants to do a PCA with"; one individual, "no variant has more than
  one dosage among its called genotypes, so none of them varies and there
  is nothing to do a PCA with"; a VCF written in the test, of three
  individuals whose second variant is at position 10 after one at 30,
  with the LD pruning, the message of the LD filter, and without it a
  result.
- **The PCoA**, the job of the PCA with its pruning and the method
  `"pcoa"`: `numCompsFound` 198, `numComps` 10, PC1, PC2 and PC3
  3.629128255610693, 3.5432450063275183 and 1.9702183453707434, `s000`
  on them −0.004011193561632288, 0.08244556083044303 and
  −0.04528526265366679, `lingoesConstant` 0.024712635394468305,
  `negativeEigenvaluesPercent` 7.94441216305067, `numVarsUsed` `null`,
  the `passStats` of the PCA with its pruning, and the two calls of the
  progress; a second run the same numbers to the last bit. The refusals,
  as literals: the list `s000` alone, "there is 1 individual, and a
  principal coordinate analysis places 2 at least by the distance of each
  pair"; the missing data filter at 0.05 and a MAF filter at 0, "the pass
  gave no variant: its source gave 1200 and the steps kept none of them,
  …"; and a VCF written in the test of five individuals, the fifth
  called only at a variant where the others are missing, "4 of the 10
  pairs of individuals have no distance, …" (`pca.md`, "The request").
- **The steps of a PCA**: after a diversity at 0.1, a PCA opens the file
  again, since its filters are not the diversity's, and a second PCA with
  the same job does not.

### In the browser

What node does not have, a `File` that popnei reads by ranges with
`FileReaderSync`, the real worker and the transfer, is seen through the
flow of the walking skeleton, and of the Variants step from stage 3, in
Chromium, Firefox and WebKit
(`.claude/skills/coding/testing.md`; the flow is the entry's and the
diversity's specs'). What it shows of the runner: a `panel.nei` picked
opens with 200 individuals and ploidy 2; the diversity at 0.05 and then
at 1 both show their numbers, so the `File` was opened again in the
worker; the bar of the running state reaches its last call; the result
reaches the page as typed arrays, which the page's check of
`messages.md` refuses otherwise; and `tetraploid.vcf.gz` read with
ploidy 2 opens and then shows popnei's message at the diversity. From
stage 3: a file written at 0.05 is saved with 250,994 bytes, whose bytes
are those `writeVars` gave in node, so the `Blob` made in the worker
reached the page whole; and the same when the Stop of a calculation
started after the write has ended the worker that made the `Blob`, so a
`Blob` outlives its worker, which the File API has and no engine has
been seen to do yet.

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

Each of these was written with this one and approved by the owner on 25
September 2026, and says what is listed here; the stage 3 revision of
each, written at the same time as this one's, is to say what the second
list gives.

- **`docs/specs/worker/messages.md`**: the requests `open`, with the load
  id, the `File`, the format and the read options, `run`, with the key
  and a `Job`, and `write`, with the key and a `WriteJob`; the answers
  `ready`, `opened`, `result`, `written`, `refused`, `reopenFailed`,
  `progress` with popnei's four fields, and `crashed` and `badRequest`,
  after which the worker closes itself; `parseToRunner`, which the
  worker's script calls on every request.
- **`docs/specs/worker/client.md`**: every worker receives at most one
  `open`, as its first request, and a new worker is started for a new
  load and after a cancel or a crash; one request at a time; a cancel
  that ends the worker; a worker whose read popnei refused is sent
  nothing more on that load; the restart after a large write; and
  `start.ts` making the worker from `./runnerWorker.ts?worker`.
- **`docs/specs/analyses/diversity.md`**: `DiversityJob` and
  `DiversityResult`, the populations of the job holding only individuals
  kept, none empty, which `run` of the diversity makes with
  `populationsKept` of `src/core/project.ts` from stage 4
  (`docs/specs/core/project.md`, "The populations").
- **`docs/specs/entry.md`**: the page asks for the open of a source whose
  read is pending, through the client.
- **`docs/specs/steps/variants.md`**: the number of variants shown is
  the one the file gives before the filters, and the ploidy of a VCF is
  shown as the one given.

What the specs of stage 3 are to say, read in their drafts of 26
September 2026 and written here as `docs/architecture.md` has them:

- **`docs/specs/analyses/individualChecks.md`, `variantChecks.md`,
  `filterCounts.md` and `writeVariants.md`**: their jobs and results as
  the block of `docs/specs/worker/protocol.md` has them; the statistics of
  each individual over the filters of the variants and every individual,
  with their names in the result; the histograms of the variants over no
  filter and every individual, with `minNumIndividuals` 0, the bins in
  the job, and the MAF, Ho and the unbiased He; the counts over the
  filters of the variants alone; a write over the filters and the list
  of individuals, whose file of no variant the step does not offer.
- **`docs/specs/core/individualsKept.md`**: the list of the
  individuals kept, in the order of the file, `null` when the filters
  remove nobody, and never empty in a job.
- **`docs/specs/core/store.md` and `docs/specs/entry.md`**: `countsOf` in
  the place of `numVarsOf`, reading `passStats` of every result and of a
  written file; the store's function of a write, which the client's
  `write` is.
- **`docs/specs/analyses/diversity.md`**: `individuals` in the place of
  `individualFilters` in its job, and `passStats` in the place of
  `numVars` and `numVarsRead` in its result.

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
- The PCA's MAF filter given as one filter, which
  `docs/specs/worker/protocol.md` gave to the tests of stage 2, is core's
  from stage 4: `pcaFilters` puts it in the job's filters, and the runner
  puts them as any job's (`docs/specs/analyses/pca.md`); its test is
  core's.
- From stage 3, a written file crosses as a `Blob` the runner made, and
  not as a `Uint8Array` transferred, as `worker.md`, "Reading the files
  of the user", has it (`docs/specs/worker/messages.md`, "Where this
  departs from worker.md").

## Open points

None. The points of stage 2 are settled: a file the browser can no
longer read is `reopenFailed`, a kind of its own (point B of
`docs/specs/stage-2-open-points.md`); stage 2 builds on
`js-v0.1.0-dev.2` (point C); the three columns of the diversity come from
`calcPerVarDistribs`, and `calcPopDiversity` waits for stage 5 (point D,
settled with the approval); and an engine that reads a changed file with
no word is measured in the three engines, the help of the Variants step
saying it meanwhile, and the runner does nothing more than the table
above (point R, settled with the approval). Which statistics the
histograms of the variants show, and with which bins, is the spec of
`variantChecks`'; this one calls popnei as the architecture has it until
that spec says otherwise.

## Not in this spec

- The shapes of the messages and their checks: `messages.md`. The queue,
  the restarts, the restart after a large write and the timeout of
  `ready`: `client.md`.
- The fields of each analysis's job and result, its warnings and its
  screen: its spec under `docs/specs/analyses/`.
- How core makes the list of the individuals kept from the filters of
  individuals: `docs/specs/core/`, the module `individualsKept.ts` of
  section 9 of the architecture.
- The filter of the regions of a BED file, the histogram of the missing
  rate of each variant, and the writer of the VCF: with popnei's release
  that has them.
- The filters of the PCA's job, the stricter MAF and one LD pruning:
  `pcaFilters` of `docs/specs/analyses/pca.md`. The intermediate results
  the worker keeps under their keys: none before the kinship of stage 7.
- What the step does with a written file, its Save, its warning above a
  size, and a write whose filters changed while it ran:
  `docs/specs/analyses/writeVariants.md` and `docs/specs/core/store.md`.
- The light worker and the reader of the individuals file:
  `docs/specs/worker/individuals.md`.
