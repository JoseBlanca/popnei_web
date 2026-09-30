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
writes, 24 to 88 bytes larger, by file; and again that day for the
owner's decision that the filters of individuals act first
(`docs/architecture.md`, section 2): the list of the individuals kept is
the first step put on the `Variants`, the job of the statistics of each
individual has no filter, those of the histograms of the variants and of
the counts carry the list, and the numbers with a list are recomputed,
by `orderA.mjs` below; and again that day for the owner's decision that
the PCA has its own filters of missing data, MAF and LD, which follow
the Variants step by default (`docs/specs/analyses/pca.md`): the tests
of the PCA made with the job of that spec's flow and its numbers, and
the test of two individuals with the list before the MAF filter. The revisions for stage 4 are approved by the owner on 28 September 2026.
Revised on 30 September 2026 for stage 5, the analyses of the
populations, as their specs give them: the second call of the
diversity, `calcPopDiversity`, with the folded site frequency spectrum
in it, told as the second pass of the run (below, "The diversity" and
"Progress"); the distances between populations with the order of their
heatmap; the LD decay; the memory of the LD decay; and their tests.
Not yet approved by the owner. The calculation
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
  `Variants` first, with popnei's `filterIndividuals`, which popnei lists
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
scripts of "How it is verified", `numbers.mjs`, `numbers3.mjs` and
`orderA.mjs`, and
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

The steps a job asks for are, when the job has `individuals` and it is
a list, the step of the individuals with that list, and then its
filters of the variants, in their order; a job without the field, or
with `null`, keeps every individual (`docs/specs/worker/protocol.md`,
"Job and JobResult").
The list comes first, so the filters of the variants count over the
individuals it keeps, as the owner decided on 28 September 2026
(`docs/architecture.md`, section 2): popnei's `filterByMissingData` put
after `filterIndividuals` divides by the individuals kept, and so do the
frequencies of the MAF and the dosages of the LD
(`js/popnei/src/variant.ts`). Until then the list came last, and the
filters counted over every individual of the file. Every request over the variants, a `run`
of any analysis and a `write`, goes through the same rule. For each, the
runner reads the steps its `Variants` holds from popnei's `steps`, and:

- **When those steps are the job's**, the same kinds in the same order,
  the step of the individuals, when there is one, first and naming the
  same individuals in the same order, compared name by name, and each
  argument of a filter's step equal with `===` to the field of the same
  name of the filter, it runs on that `Variants` as it is.
- **When the `Variants` holds no step**, as it does after the open, it
  puts the job's steps on it, in their order, and runs. Without this
  rule the first run of every load with a filter would open the file a
  second time, since a `Variants` just opened holds none of its filters.
- **Otherwise, or when it holds no `Variants`**, after an open again that
  popnei refused (below), **it opens the file again**: it frees the
  `Variants` and holds none, opens the `File` again with the same format
  and read options, as at the open, and puts the job's steps on the new
  one, in their order.

So a `Variants` whose steps are the job's list of individuals, and a job
that adds a filter of the variants after it, is opened again, and not
given the filter at its end: the rule of stage 2, below, spares the
reading of one range for the `Variants` just opened alone, and a rule of
prefixes would be one more way for the steps and the job to disagree.
Seen in node on 28 September 2026 with `js-v0.1.0-dev.3`: after
`filterIndividuals` of `s000`, `s003` and `s004` and
`filterByMissingData(0.05)`, `steps` is `[{ kind: "individuals", args: {
individuals: ["s000", "s003", "s004"] } }, { kind: "missing_data", args:
{ maxAllowedMissingRate: 0.05 } }]`, the names in the order they were
given.

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

The runner puts first the list of the individuals, when the job has
one, with `filterIndividuals(job.individuals)`; then each filter with
its method, `filterByMissingData`, `filterByMaf`, `filterByObsHet`,
`filterByLd`, with the numbers of the job as they are, in the order of
the job, which is the fixed order of the project; the runner does not
sort them. The number the user typed is the number popnei is given, so a
variant with a missing rate at the threshold is kept
(`docs/specs/worker/protocol.md`). An empty list is a defect of the
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

From stage 5 the job carries two fields more, `numCalledAlleles`, the
draw of the rarefaction and of the spectrum, and `popDiversityPops`, the
populations of `pops` with at least `minNumIndividuals` individuals, in
the order of `pops`, which core chooses (`diversity.md`, "The
populations"; decision 7 of `docs/specs/stage-5-open-points.md`). After
step 5, over the same steps of the `Variants`, the runner:

6. When `popDiversityPops` is not empty, calls `calcPopDiversity(variants,
   { pops, stats, numCalledAlleles, minNumIndividuals })` of
   `js/popnei/src/diversity.ts`, the options object written with these
   keys alone, `pops` made with `Object.fromEntries` of the pairs of
   `job.pops` named in `popDiversityPops`, and `stats` `["num_alleles",
   "fis", "private_alleles", "folded_sfs"]`, without `"private_alleles"`
   when `popDiversityPops` holds one population, since one population
   has every allele it called as private (`diversity.md`, "The
   populations"). It is a second pass over the file, as the owner
   decided on 30 September 2026 until popnei issue #4 gives the two
   heterozygosities and the proportion of polymorphic variants in this
   call (decision 4). With `popDiversityPops` empty there is no second
   call and no second pass.
7. Puts popnei's arrays back in the order of the job, as step 4 does,
   `foldedSfs` among them, which popnei gives as an object by the name
   of the population, each array copied into a new `Float64Array`, read
   by a plain lookup, `foldedSfs[name]`, and checked with `instanceof
   Float64Array`, since popnei's object holds a population named
   `__proto__` without making it an own field, and a check with
   `Object.hasOwn` would crash a diversity that ran with such a
   population in stages 3 and 4; a
   population of `pops` not in `popDiversityPops` has NaN in `fis`,
   `numAllelesMean`, `numAllelesInDraw` and the three of the private
   alleles, 0 in `numVarsInDraw`, and `null` for its spectrum; the
   private alleles not asked are NaN for every population, with
   `numVarsEveryPop` and `numVarsEveryPopInDraw` `null`.
8. Adds to the result the fields of stage 5: `fis`; `numAllelesMean`
   and `numAllelesInDraw`, from `numAlleles.mean` and `.inDraw`;
   `privateAllelesTotal`, `privateAllelesMean` and
   `privateAllelesInDraw`, from `privateAlleles.total`, `.mean` and
   `.inDraw`, the total copied into a `Float64Array` so that a
   population with none asked has NaN and not 0; `numVarsInDraw`, from
   `numVars.inDraw`; `numVarsEveryPop` and `numVarsEveryPopInDraw`,
   popnei's; `numCalledAlleles`, the job's; `foldedSfs`; and
   `passStats` of the first call, since the two passes have the same
   steps. A statistic asked that popnei gives `null`, or a spectrum
   whose length is not `floor(numCalledAlleles / 2) + 1`, is a defect of
   ours, thrown.

The refusals of the second call are answered as any of popnei's
(below, "What it answers when something goes wrong"). Core keeps from
the job the two it can foresee, a draw below 2 and a draw above the
chromosomes of the individuals kept (`diversity.md`, "Why it cannot
run"); the refusals of the pass come at the first call, whose messages
the panel reads.

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
to 1,152 and `maf` 1,152 to 1,128, `numVars` 1,128, with no list; with
the list of 111 of "How it is verified" before them, 1,200 to 1,117,
1,117 to 1,117 and 1,117 to 1,096, `numVars` 1,096, seen in node on 28
September 2026 with `js-v0.1.0-dev.3`, as section 2 of the architecture
has it.

Every request over the variants sets the function of the progress and
tells a throw of `told` from popnei's refusal as step 2 of the diversity
does, and catches popnei's refusal at its one call to popnei, as below.

The runner computes no key and never reads one. The worker's script
takes the key from the `run` or `write` request and puts it, as it came,
into the `result` or the `written`, so a result is always filed under the
key it was asked for
(`docs/architecture.md`, section 5).

### The statistics of each individual

An `individualChecks` job holds its pass alone, with no filter and no
list of individuals, since the statistics of each individual are counted
over every variant and every individual of the file, as the owner
decided on 28 September 2026 (`docs/architecture.md`, section 4;
`docs/specs/analyses/individualChecks.md`); until then the job had the
filters of the variants of the project.
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

An individual with no called genotype in the file has
a missing rate of 1 and a heterozygosity of NaN, which crosses as it is;
the filter by heterozygosity of core removes it (`docs/architecture.md`,
section 13, point 4). Seen in node on a VCF of two individuals and two
variants, one individual missing at both: `missingGtRate` `[0, 1]`,
`obsHetRate` `[0.5, NaN]`.

### The histograms of the variants

A `variantChecks` job holds a pass with no filter of the variants and
the list of the individuals kept, since the histograms are of every
variant of the file over the individuals kept, as the owner decided on
28 September 2026 (`docs/architecture.md`, section 4), and three
options, `minNumIndividuals`, 0, and the bins, `numBins` and `range`
(`docs/specs/analyses/variantChecks.md`). The runner calls
`calcPerVarDistribs(variants, { stats: ["maf", "obs_het",
"unbiased_exp_het"], minNumIndividuals, histKwargs: { numBins, range }
})` with no `pops`, which popnei takes as one population, `pop`, of every
individual the pass gives, those of the list when the job has one. It gives back `binEdges`, one copy of popnei's
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
the project and the list of the individuals kept, since the list comes
before them and they count over it (`docs/architecture.md`, section 4,
"What each filter kept"); until 28 September 2026 it had no list. The runner iterates popnei's
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
`PcaJob`). Its filters can differ from the project's: core has put the
PCA's own filters of missing data, MAF and LD, those the user set in its
panel, in the place of the project's of the same kind, in the fixed
order, one of each kind (`pcaFilters`), so the runner puts them as it
puts any job's, with the list of individuals before them, and merges
nothing. When they differ from the project's, the `Variants` of the
analysis before or after a PCA is opened again by the rule of "The
steps", which reads a range of the file. After the steps are on the `Variants`, the runner:

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
with one individual kept; and, with an LD filter among the filters, a
file whose variants are not in the order of their positions, "the
variant 2 of the ones the filter by linkage disequilibrium has read, …",
at the pass. The PCoA refuses, before the pass, one individual, "there
is 1 individual, and a principal coordinate analysis places 2 at least
by the distance of each pair", and more than 9,381 individuals of the
pass, "the principal coordinates of 9382 individuals hold about 5 GB,
…", counted after the list of the job, so that a list of 100 of a file
of 9,382 is analysed, and which core's lock prevents, since a job of the
PCoA always carries a list of 9,381 individuals or fewer (`pca.md`, "Why
it cannot run"); and after it a pass that keeps no variant, with
popnei's usual "the pass gave no variant …"; a pair of individuals with
no variant called in both, "4 of the 10 pairs of individuals have no
distance, …"; distances all 0, "every distance is 0, …"; and a file not
sorted under an LD filter, as the PCA. With the correction asked, it
does not refuse distances that no space holds. Each was seen in node
with `js-v0.1.0-dev.3` on 28 September 2026, and `pca.md`, "The
request", gives them whole.
The panel says each in the user's words (`pca.md`, "Its
words").

The PCA holds the individuals × individuals matrix in the memory of
wasm, which grows to it and never shrinks: about 6.1 × 8 bytes per pair
of individuals, 662 MB more in the process at 4,000 individuals in node
(`pca.md`, "How it runs"). The PCoA holds the matrix it decomposes, 8
bytes a cell, from before its pass, and the sums of the pass beside it, 4
bytes a cell, about 12 during the pass; its peak was measured by popnei
at 44.4 bytes a cell, under node 26.8.2 on an Apple M5 Pro on 27
September 2026, and popnei counts it at the PCA's 48.8. The client starts the worker again after a PCA
or a PCoA of more than 700 individuals (`docs/specs/worker/client.md`, "A large PCA,
and the restart after it"). The runner keeps nothing of a
PCA: in stage 4 the worker keeps no intermediate result, the variants
the LD filter kept included, which popnei has no way to hold and give
back (decided by the owner on 27 September 2026, "The pruned variants
are not kept between two PCAs" in `docs/specs/stage-4-open-points.md`),
so each PCA with an LD filter prunes again inside its one pass.

### The distances between populations

A `popDists` job, from stage 5, holds its pass, the populations with at
least the minimum of individuals, two or more, `leftOut`, the
populations under it with their counts, which the runner copies into
the result unread, and `minNumIndividuals`
(`docs/specs/analyses/popDists.md`, `PopDistsJob`). After the steps are
on the `Variants`, the runner:

1. Checks that no two populations share a name, as for the diversity,
   `badRequest`, and sets the function of the progress.
2. Calls `calcPopDists(variants, Object.fromEntries(job.pops), {
   jackknifeGroup: null, measures: ["fst", "dest"], minNumIndividuals
   })` of `js/popnei/src/pop_dists.ts`, the options written with these
   keys alone: no standard errors, as the owner decided on 30 September
   2026 (decision 1), and both measures from the one pass.
3. Puts the pairs back in the order of the job. popnei gives its
   populations in the order the keys of `pops` iterate in, and its
   pairs in that order, (0, 1), (0, 2), …, (1, 2), …; for the job's
   populations i < j of k, the place `i × k − i × (i + 1) / 2 + j − i −
   1` of each array of the result takes popnei's value of the same two
   names, at the place the same formula gives for their places a < b in
   popnei's `pops`. `fst` and `dest` come from `fst.distVector` and
   `dest.distVector`, and `numVarsPerPair` from `numVars`, an
   `Int32Array`, copied into a `Uint32Array`, a negative count being a
   defect, thrown.
4. Makes the order of the heatmap of each measure, over the distances
   in the order of the job, by the six steps of `popDists.md`, "The
   order of the heatmap": two populations, the order of the file,
   `twoPopulations`; a pair NaN, `noDistance`; a negative distance
   taken as 0 in the matrix given to the PCoA alone (its **Open 1**,
   meanwhile so); every distance 0 then, `allZero`; otherwise `new
   Distances(vector, pops, passStats)`, `correctDistsByLingoes` of
   `js/popnei/src/pcoa.ts`, and `doPcoa` of its corrected `distances`,
   the populations sorted by their projection on the first component,
   `projections[i × numComps]`, from the smallest, an exact tie broken
   by the order of the job; and any refusal of those two calls,
   `notPlaced` with popnei's message. A refusal there is not a refusal
   of the job, since the distances are calculated: it is caught at its
   call, as popnei's refusals are, and kept as the reason of the order.
5. Answers the `PopDistsResult` of `popDists.md`: `pops` and
   `numIndividuals` of the job, the three arrays of step 3, `order` of
   each measure, `leftOut` as it came, and `passStats`.

popnei refuses the call, answered `refused`, for what its `@throws`
lists that core cannot rule out: the refusals of every pass, the file
with no variant, the filters keeping none, a line of a VCF, a genotype
of another ploidy, a file not sorted under the LD filter. Without
standard errors popnei keeps a few sums for each pair, so the memory
does not grow with the variants.

### The LD decay

An `ldDecay` job, from stage 5, holds its pass, whose filters are the
project's but the LD pruning, the populations, and `minDist` 1,
`maxDist`, `numBins` 50 and `maxAllowedMaf`
(`docs/specs/analyses/ldDecay.md`, `LdDecayJob`). After the steps are on
the `Variants`, the runner:

1. Checks that no two populations share a name, `badRequest`, and sets
   the function of the progress.
2. Calls `calcLdAndDistPerPop(variants, { pops: Object.fromEntries(job.pops),
   minDist, maxDist, numBins, maxAllowedMaf })` of
   `js/popnei/src/ld.ts`, the options written with these keys alone,
   since the release refuses a key it does not know.
3. Checks that popnei gave every population of the job, with
   `Object.hasOwn`, in `numVarsPerPop`, `perPop` and `decayPerPop`: a
   plain lookup or `in` finds a population named `__proto__` in the last
   two, where popnei's objects hold it, and returns `Object.prototype` in
   the first, where assigning a number to that name is ignored, so the
   check with `in` would pass and `numVars` would be NaN with no word
   (node, `js-v0.1.0-dev.3`, found by the review of 30 September 2026);
   and that the smallest and the largest distance of the
   bins are the same for every population, as popnei's rule has them;
   a difference is a defect of ours, thrown. A population named
   `__proto__` is missing from popnei's result, whose objects the
   release fills by assigning to them (`perPop[pop] = …` of `ld.ts`),
   and so is thrown as a defect; it is asked of popnei with the
   refusal of a source not sorted (`ldDecay.md`, **Open 2**).
4. Answers the `LdDecayResult` of `ldDecay.md`, every array in the order
   of the job: `numIndividuals`, the lengths of the job's populations,
   the n of each curve; `numVars` from `numVarsPerPop`; `smallestDist`
   and `largestDist` copied with `slice()` from the bins of the first
   population, since popnei gives each population's bins as `subarray`
   views of one array, which `transferablesOf` refuses; `numPairs`,
   `meanR2` and `sdR2` from the bins of each, one population after
   another; `rhoPerBp`, `r2AtZero` and `halfDist` from `decayPerPop`;
   and `passStats`.

popnei refuses, answered `refused`: the refusals of every pass, and the
memory of its counts or of the variants within `maxDist`, "this machine
has not the memory for …", which core's lock of 1 GB keeps from the
counts (`ldDecay.md`, "Why it cannot run"). A variants file not sorted
by position is not refused by this call, which counts fewer pairs
without a word (`ldDecay.md`, "The request", and its **Open 2**). The
fit of each population comes after the pass and tells no progress, so
the bar stands at the end of the pass while it runs. The client starts
the worker again after every LD decay (`docs/specs/worker/client.md`,
"The LD decay, and the restart after it"), since it leaves the memory
of wasm larger by 16 bytes × `maxDist` × the populations and more
(below, "The memory").

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
   variants; with the list of 116 individuals of "How it is verified"
   before that filter, 160,162 bytes, 116 individuals and 1,103
   variants; with no filter, 261,490
   bytes, the size of `panel.nei` itself; seen in node on 26 September
   2026 with `js-v0.1.0-dev.2`, and the file with the list on 28
   September 2026. `js-v0.1.0-dev.3` writes version 1.1 of
   popnei's vars file, whose key holds the lengths of the chromosomes
   (popnei's commit `343bc4f`, one of the changes of its writer since
   `js-v0.1.0-dev.2`), and its files are larger: 251,074,
   160,186 and 261,570 bytes for the three, with the same variants and
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
runner calls in stages 3 to 5, `calcPerVarDistribs`,
`calcPerIndividualStats`, `iterBlocks`, `writeVars`, and
`doPcaFromVariants` with `numPrinComps` 0, and, from stage 5,
`calcPopDiversity`, `calcPopDists` and `calcLdAndDistPerPop`, and every call of their
progress carries `numPasses` 1; over `panel.nei` each gave the two calls
of the diversity, seen in node on 26 and 27 September 2026. The runner
does not ask `numPassesOf`: popnei's first call, at 0 bytes, comes before
a byte is read, and carries the passes of the run. No run of stage 4
makes two passes, and from stage 5 the diversity alone does, by two
calls of one pass each (below): the PCA asks for no weights of the variants, which
would make it read the file twice, and the PCoA reads it once,
`numPassesOf("doPcoaFromVariants")` 1, whose progress over `panel.nei`
was the same two calls (node, `js-v0.1.0-dev.3`, 28 September 2026). The
last call of the progress of either, at the end of the run, comes after
the decomposition of the matrix, which popnei does not report, in
`js-v0.1.0-dev.3` as before: over a VCF of 20,066,850 bytes and 2,500
individuals, the last range of the PCA was told at 0.04 s and the end at
6.75 s, in node with `js-v0.1.0-dev.2` on 27 September 2026, so the bar stays at the share of the last range
meanwhile (`pca.md`, "How it runs").

The diversity of stage 5 is one run of two calls, `calcPerVarDistribs`
and then `calcPopDiversity`, each of which popnei tells as `pass` 1 of
`numPasses` 1. So for the diversity the runner does not pass the calls
on unchanged: it tells those of the first call with `pass` 1 and
`numPasses` 2, and those of the second with `pass` 2 and `numPasses` 2,
the other two fields as they came, so that the bar fills once over the
two passes (`diversity.md`, the running state). With no second call,
when no population has the minimum of individuals, it passes the calls
on with `numPasses` 1, and the bar is of one pass. Every other run
passes them on unchanged.

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
(`js/popnei/src/stats.ts`), and, from stage 5, the arrays of the
diversity's second call, the spectra, the distances and the orders of
the heatmap and the arrays of the LD decay, which the runner builds in
the order of the job, including the typed arrays inside `foldedSfs` and
`order`; the function checks it all the same, and an
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
A mistake of our code reaches the page as `defect`, in the words of a
defect of the application, and never as a refusal of the user's input
nor as a crash, whose words say to change the settings or to load the
file again, which mends nothing, or, for a large PCA, that its memory
did not fit (`docs/specs/analyses/pca.md`, "Its words"): the owner
decided it on 29 September 2026 (stops A 9 and C 6 of
`docs/specs/stage-4-open-points.md`). Which answer, by what was thrown:

| what happened | answer | on the page (`RunError`) | the worker |
|---|---|---|---|
| a call to popnei that reads the file, the open, a calculation, the iteration of the counts or the write, threw a plain `Error` whose message is one of popnei's of a range the browser refused or gave short (below) | `reopenFailed`, with the name of the file and popnei's message | `reopenFailed` | goes on |
| a call to popnei threw a plain `Error` whose message is popnei's refusal of an option it does not know, "popnei: `‹key›` is not an option of `‹function›`, whose options are …", which only the application can send, since the runner writes every object of options with its keys alone (above, "The principal components", step 2) | `crashed`, with "popnei_web defect: " and popnei's message | `defect` | closes |
| a call to popnei threw any other plain `Error`, whose prototype is `Error.prototype` itself: a refusal of the data, filters that keep no variant, a list of individuals that names one twice, a file the memory of the tab does not take | `refused`, with the message as it is | `popnei` | goes on |
| a call to popnei threw anything else: a `WebAssembly.RuntimeError`, a trap of the wasm, a panic of Rust among the causes; a `RangeError` of a memory that cannot grow | `crashed`, with its message | `workerFailed` | closes |
| popnei refused the open of the file again, in a request whose steps changed or after an open again that failed, whatever its message | `reopenFailed`, with the name of the file and popnei's message; the runner holds no `Variants`, and the next run opens the file again | `reopenFailed` | goes on |
| a request that failed `parseToRunner`; a second `open`; a `run` or a `write` before the `open`, of another load, or after an open that popnei refused; an empty list of individuals; two populations of one name | `badRequest`, what was wrong | `defect` | closes |
| a defect thrown by our own code anywhere else, an `Error` whose message starts "popnei_web defect: ": a result of popnei that does not match what was asked, step 3 of the principal components, the counts of a pass with a filter the job has not, a `told` that threw one, which popnei's call throws back (step 2 above) | `crashed`, its message, which the client tells by its start | `defect` | closes |
| any other throw of our own code: a `TypeError` of a mistake, what `told` threw otherwise | `crashed`, its message | `workerFailed` | closes |

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
  and, from stage 4, `doPcaFromVariants` and `doPcoaFromVariants`,
  and, from stage 5, `calcPopDiversity`, `calcPopDists` and
  `calcLdAndDistPerPop`, whose refusals are `refused`, and
  `correctDistsByLingoes` and `doPcoa`, whose refusals become the
  reason `notPlaced` of the order of the heatmap (above, "The distances
  between populations").
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
cases popnei cannot be made to give in node, a trap among them. A plain
`Error` whose message is popnei's refusal of an option it does not know
is `crashed` with "popnei_web defect: " before popnei's message, a
defect of ours (above, "What it answers when something goes wrong"). The
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
- **The filters keep no variant.** The diversity is `refused` with
  popnei's "the pass gave no variant: …", above. The statistics of each
  individual take no filter, so they meet no variant only in a file that
  gives none, and are then refused with popnei's message of a source
  that holds none (`docs/specs/worker/protocol.md`, "The cases"). The
  counts of the filters are a result, since `iterBlocks`
  gives them then; and a write gives a file of no variant, whose
  `passStats.numVars` is 0 (above, "The written file").
- **The filters keep no individual.** Core sends no job then; an empty
  list that reached the runner would be `badRequest`, before any step is
  put.
- **A list of individuals before a threshold of the variants.** The
  counts of the filters of the variants are those over the individuals
  kept, since the list comes before them: on `panel.nei` at 0.05, with
  the 116 individuals whose missing rate over the 1,200 variants of the
  file is at most 0.03, the counts are 1,200 to 1,103, where with no
  list they are 1,200 to 1,152.
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
  principal components"). The PCoA holds the matrix it decomposes, 8
  bytes a cell of the individuals × individuals matrix, from before its
  pass, and the sums of the pass beside it, 4 bytes a cell, about 12
  bytes a cell while it reads; at its peak no more than the PCA, 44.4
  bytes a cell measured by popnei (`pca.md`, "How it runs"), whose limit
  is the same 9,381 individuals, of the pass.
- **The counts of an LD decay**, from stage 5: for each population a
  count of pairs and a sum of their r² at every distance from 1 to
  `maxDist`, 16 bytes each, asked for before the pass, and up to 24
  bytes more a distance at its end, at most 40 bytes a base pair and
  population, which core bounds at 1 GB; beside them, the blocks of
  variants the pass holds within `maxDist` of the newest variant, with
  their genotypes by population. Measured in node with
  `js-v0.1.0-dev.3` on 30 September 2026, an LD decay grew wasm by 64 MB
  for 100 individuals and 20,000 variants at 100,000 bp, by 480 MB for
  100 individuals and three populations at 10,000,000 bp, 16 bytes × the
  distance × the populations, and by 0.4 to 1.1 GB for 1,000 individuals and
  20,000 variants (`ldDecay.md`, "How it runs", whose table gives each
  case), which is why the client starts the worker again after it.
- **The distances between populations**, from stage 5: a few sums for
  each pair, and the matrix of the PCoA of the order, k × k numbers for
  k populations.

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
bound, from stage 4 after a PCA of more individuals than a bound, and
from stage 5 after every LD decay, as proposed to the owner in
`ldDecay.md`, **Open 1**, and starts another (`client.md`). What the
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
  stage 4, the variants the LD filter of a PCA kept among them
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
  thrown string are `crashed`; what `doPcoaFromVariants` of the release
  throws for an option it does not know, `numCompsKept`, is `crashed`
  with "popnei_web defect: popnei: `numCompsKept` is not an option of
  `doPcoaFromVariants`, whose options are `minNumSnps` and
  `correctByLingoes`", its message held as a literal against the pinned
  release, since a change of popnei's words would turn it back into a
  refusal of the user's settings.
- **`transferablesOf`**: of a result of each of the seven analyses, the
  principal components with their `projections` and
  `explainedVariancePercent`, the diversity of stage 5 with its spectra,
  the distances with the `order` of the kind `pcoa`, one buffer per
  array, none twice when two fields hold one array; an array that is a
  view of part of a buffer throws.

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

The numbers of the order of 28 September 2026, the list of the
individuals kept before the filters of the variants and the statistics
of each individual with no filter, were given by `js-v0.1.0-dev.3` in
node on 28 September 2026, in a folder of their own with the release
installed, by `orderA.mjs`, run as `numbers.mjs` is, with `FIXTURES`
naming `e2e/fixtures`; `js-v0.1.0-dev.2` gave the same numbers but the
sizes of the files written:

```js
import { readFileSync } from "node:fs";
import { init, openVars, calcPerIndividualStats, calcPerVarDistribs, writeVars } from "popnei";
await init();
const bytes = () => new Uint8Array(readFileSync(`${process.env.FIXTURES}/panel.nei`));
const pops = {};
for (const line of readFileSync(`${process.env.FIXTURES}/panel_pops.txt`, "utf8").trim().split("\n").slice(1)) {
  const [ind, pop] = line.split("\t"); (pops[pop] ??= []).push(ind);
}
let v = openVars(bytes());
const s = calcPerIndividualStats(v); v.free();
const all = [...s.individuals], miss = [...s.missingGtRate], het = [...s.obsHetRate];
console.log(JSON.stringify(s.passStats), miss.slice(0, 3), het.slice(0, 3));
const at = (n) => all.indexOf(n);
const list116 = all.filter((_, i) => miss[i] <= 0.03);
const list42 = list116.filter((n) => het[at(n)] <= 0.35);
const list111 = list116.filter((n) => het[at(n)] <= 0.38);
console.log(list116.length, list42.length, list111.length);
const popsOf = (list) => Object.fromEntries(Object.entries(pops).map(([p, is]) => [p, is.filter((i) => list.includes(i))]));
for (const [name, list] of [["116", list116], ["111", list111]]) {
  const three = (x) => { x.filterIndividuals(list); x.filterByMissingData(0.05); x.filterByObsHet(0.9); x.filterByMaf(0.95); };
  v = openVars(bytes()); three(v);
  const b = v.iterBlocks({ fields: [] }); for (const _ of b); console.log("counts", name, JSON.stringify(b.passStats)); v.free();
  v = openVars(bytes()); v.filterIndividuals(list); v.filterByMissingData(0.05);
  const p = popsOf(list);
  const d = calcPerVarDistribs(v, { pops: p, stats: ["obs_het", "unbiased_exp_het", "poly_vars_ratio"] }); v.free();
  console.log("diversity", name, d.pops, Object.values(p).map((is) => is.length), [...d.unbiasedExpHet.mean],
    [...d.obsHet.mean], [...d.polyVarsRatio.polyRatio], JSON.stringify(d.passStats));
  v = openVars(bytes()); v.filterIndividuals(list); v.filterByMissingData(0.05);
  const w = writeVars(v); v.free();
  const back = openVars(w.bytes); console.log("write", name, w.bytes.length, JSON.stringify(w.passStats), back.individuals.length); back.free();
  v = openVars(bytes()); v.filterIndividuals(list);
  const h = calcPerVarDistribs(v, { stats: ["maf", "obs_het", "unbiased_exp_het"], minNumIndividuals: 0 }); v.free();
  console.log("histograms", name, h.maf.mean[0], h.obsHet.mean[0], h.unbiasedExpHet.mean[0], [...h.maf.histCounts].reduce((a, c) => a + c));
}
```

The list of the tests below calls them **the list of 116** and **the
list of 111**: the 116 individuals of `panel.nei` whose missing rate
over the 1,200 variants of the file is at most 0.03, in the order of the
file, `s000`, `s003`, `s004` and on, and the 111 of them whose observed
heterozygosity is also at most 0.38, the two thresholds of the flow of
the Variants step, which leaves out s023, s042, s086, s168 and s183.
Each test makes them from the result of its own `individualChecks` run,
as core would. Each test at `run` or `write` of a runner made by
`createRunner`, after the open of `panel.nei`:

- **The statistics of each individual**, with no filter: 200
  individuals, the first three with `missingGtRate` 0.028333333333333332,
  0.03666666666666667 and 0.03333333333333333 and `obsHetRate`
  0.3653516295025729, 0.34342560553633217 and 0.3724137931034483, no
  NaN, and `passStats` `{ numVars: 1200, filtering: {} }`. The same 200
  names and statistics are those of
  `e2e/fixtures/panel_individual_stats.json`, compared exactly, with a
  NaN held there as `null`: the tests of core read popnei's statistics
  from that file, since they do not call popnei, and this test fails
  when the release of popnei gives others (`docs/architecture.md`,
  section 4, "What would show these choices wrong"). The fixture, which
  held the statistics at 0.05 until 28 September 2026, is written again
  by `e2e/fixtures/make_fixtures.mjs` with no filter. A VCF written in
  the test, two individuals and two variants, the second individual
  missing at both, gives `missingGtRate` `[0, 1]` and `obsHetRate`
  `[0.5, NaN]`.
- **The diversity with the list of 116** before the filter at 0.05: the
  populations p0, p2 and p1 with 29, 51 and 36 individuals, He
  0.3533112768773785, 0.343162019844528 and 0.35122154846050563, Ho
  0.35890535785555633, 0.3500736606408556 and 0.35645096138403165, the
  polymorphic share 0.9310970081595649, 0.8975521305530372 and
  0.9084315503173164, and `passStats` 1,103 of 1,200, where the filter
  keeps 1,152 with every individual.
- **The diversity with the list of 111** before the filter at 0.05: p0,
  p2 and p1 with 29, 48 and 34 individuals, and the numbers of the table
  of `docs/specs/analyses/diversity.md`, "How it is verified", He
  0.3536745729996746, 0.34293262196030005 and 0.3508361148330853, as
  literals, and `passStats` 1,117 of 1,200; and the file written with
  that list, 156,802 bytes with `js-v0.1.0-dev.2`
  (`docs/specs/analyses/writeVariants.md`).
- **The steps with the list**: after that diversity, a run with the same
  filter and no list opens the file again, as does a run with the same
  list of other order; a run with the same filter and the same list does
  not. The test counts the reads of the source as the test of an open
  again that popnei refuses does.
- **The histograms of the variants**, with no filter and no list,
  `minNumIndividuals` 0, 40 bins and the range 0 to 1, popnei's
  defaults: `binEdges` of 41 numbers from 0 to 1, over a buffer of its
  own; the means 0.7163445463101891 of the MAF, 0.35429523451520484 of Ho
  and 0.3754712450806149 of He; 40 counts in each, which add up to 1,200,
  the counts of the MAF 0 in its first 20 bins, and every count as the
  literal arrays `numbers3.mjs` gave. With the list of 111 and no filter
  of the variants, the means 0.7173150249650765, 0.3528596566999348 and
  0.3749397114515978, and counts that add up to 1,200 in each.
- **The counts of the filters**: with the missing data filter at 0.05,
  the heterozygosity filter at 0.9 and the MAF filter at 0.95 and no
  list, `passStats` is `numVars` 1,128 and `filtering` `missing_data`
  1,200 to 1,152, `obs_het` 1,152 to 1,152 and `maf` 1,152 to 1,128, its
  fields in that order; with the list of 111 before the same filters,
  `numVars` 1,096 and `missing_data` 1,200 to 1,117, `obs_het` 1,117 to
  1,117 and `maf` 1,117 to 1,096, and a diversity with the same filters
  and the same list gives the same `passStats`; with the missing data
  filter at 0.05 and a MAF filter at 0, `numVars` 0 and the counts 1,200
  to 1,152 and 1,152 to 0, a result and not a refusal.
- **The written file**: with no filter, a `Blob` of 261,490 bytes,
  `numBytes` 261,490, whose bytes open again with `openVars` with 200
  individuals; at 0.05, 250,994 bytes and `passStats` 1,152 of 1,200;
  with the list of 116 before the filter at 0.05, 160,162 bytes and
  `passStats` 1,103 of 1,200, that open again with those 116 individuals
  in their order, and with the list of 111, 156,802 bytes and 1,117 of
  1,200; at 0.05 with a MAF filter at 0, 3,594 bytes and
  `passStats.numVars` 0. The progress of each is the two calls of the
  diversity, and a `told` that throws makes `write` throw that value, as
  for `run`. These sizes are `js-v0.1.0-dev.2`'s; from the commit of
  stage 4 that names `js-v0.1.0-dev.3` in `package.json` they are
  261,570, 251,074, 160,186, 156,818 and 3,682 bytes, with the same
  counts and the same individuals read back (node, 28 September 2026, by
  `numbers3.mjs` and `orderA.mjs` above run with each release, whose
  other numbers are the same with both).

The numbers of the PCA and of the PCoA were given by `js-v0.1.0-dev.3`
in node on 28 September 2026, by the script of
`docs/specs/analyses/pca.md`, "How it is verified", which gives the
table they come from, but for those of two individuals, given the same
day by the same release. A job with a list puts it before its filters,
as every job does (above, "The steps"). Each test at `run` of a runner
made by `createRunner`, after the open of `panel.nei`:

- **The PCA with its own LD filter**, the job of the flow of `pca.md`
  with the PCA's own LD filter: the missing data filter at 0.1 of a new
  project, which the PCA follows, and the LD filter at r² 0.1 within
  50,000 base pairs, a distance the user types, and no list:
  `numCompsFound` 199, `numComps` 10, `projections` of 2,000 numbers,
  those of `s000` −0.7138853335304419, 7.676473141448964 and
  −4.384383801903496 first, the ten percentages of that spec,
  `numVarsUsed` 548, `lingoesConstant` and `negativeEigenvaluesPercent`
  `null`, and `passStats` `missing_data` 1,200 to 1,200 and `ld` 1,200
  to 548, in that order; and the two calls of the progress of the
  diversity.
- **The PCA with the filters of a new project**, the missing data filter
  at 0.1 alone, as the PCA has them when it follows the Variants step and
  the step has no LD filter: PC1 7.605779109441194, `s000` on PC1
  1.5730359180131923, `numVarsUsed` 1,200.
- **A job with `numCompsKept` 3** keeps 3 components, `projections` of
  600 numbers, each row the first three of popnei's.
- **Two individuals**, the list `s000`, `s001` and then the MAF filter
  at 0.95, which counts over those two: `numComps` and `numCompsFound`
  1, `explainedVariancePercent` `[100]`, `s000` at 18.841443681416774,
  `numVarsUsed` 355, and `passStats` `maf` 1,200 to 613. With the list
  last, the order before 28 September 2026, the MAF filter kept 1,175
  and `s000` was at 18.78829422805594 (`js-v0.1.0-dev.3` in node on 28
  September 2026).
- **The refusals**, `refused` with popnei's messages as literals: the
  missing data filter at 0.05 and a MAF filter at 0, "there are no
  variants to do a PCA with"; one individual, "no variant has more than
  one dosage among its called genotypes, so none of them varies and there
  is nothing to do a PCA with"; a VCF written in the test, of three
  individuals whose second variant is at position 10 after one at 30,
  with an LD filter, the message of the LD filter, and without it a
  result.
- **The PCoA**, the job of the PCA with its own LD filter and the method
  `"pcoa"`: `numCompsFound` 198, `numComps` 10, PC1, PC2 and PC3
  3.679886264523731, 3.5413304853438237 and 1.9573102613242979, `s000`
  on them −0.0030332529765406636, 0.08117502269333857 and
  0.03633252913562992, `lingoesConstant` 0.023674522901958598,
  `negativeEigenvaluesPercent` 7.87126617431627, `numVarsUsed` `null`,
  the `passStats` of the PCA with its own LD filter, and the two calls of the
  progress; a second run the same numbers to the last bit. The refusals,
  as literals: the list `s000` alone, "there is 1 individual, and a
  principal coordinate analysis places 2 at least by the distance of each
  pair"; the missing data filter at 0.05 and a MAF filter at 0, "the pass
  gave no variant: its source gave 1200 and the steps kept none of them,
  …"; and a VCF written in the test of five individuals, the fifth
  called only at a variant where the others are missing, "4 of the 10
  pairs of individuals have no distance, …" (`pca.md`, "The request").
- **The steps of a PCA**: after a diversity at 0.1, the PCA with its own
  LD filter opens the file again, since its filters are not the
  diversity's, and a second PCA with the same job does not.

The numbers of stage 5 are those the four specs of its analyses give,
got with `js-v0.1.0-dev.3` in node on 30 September 2026 by the commands
each spec gives beside them, and written into the tests as literals:

- **The diversity of stage 5**, over `panel.nei` and the populations of
  `panel_pops.csv` with the missing data filter at 0.05 and the default
  draw of 40: the table of stage 5 of `diversity.md`, "How it is
  verified", F, the alleles and the private alleles of each population;
  the spectra of `docs/specs/analyses/sfs.md`, "The numbers of popnei",
  p0's first value 44.79323144486922 at no filter, each of 21 values,
  equal to the last digit to those of a call that asks `folded_sfs`
  alone; the progress of the two calls, passes 1 and 2 of 2, and of a
  job whose `popDiversityPops` is empty, one pass of 1; a job with one
  population in `popDiversityPops`, with no private alleles asked, NaN
  in their three arrays and `numVarsEveryPop` `null`; and populations
  named `10`, `9` and `p`, in that order, whose spectra come back in the
  order of the job, which a runner that took popnei's order, 9, 10, p,
  would fail.
- **The distances between populations**: the Fst, the D and the
  variants of each pair of `popDists.md`, "How it is verified", at the
  missing data filter at 0.1 and at 0.05, the order p2, p0, p1 of both
  measures, and the check numbers there; the populations named "3", "1"
  and "2" for p0, p2 and p1, given back by popnei as "1", "2", "3", held
  as "3", "1", "2" pair by pair; and the fixture `panel_split.csv`,
  whose negative pair gives the order p0b, p0a, p2, p1 for both
  measures. The scripts `dists.mjs` and `order.mjs` of that spec's
  session are kept beside this spec's `numbers.mjs` by the plan.
- **The LD decay**, over `e2e/fixtures/ld.nei` and `ld_pops.csv` with
  the missing data filter at 0.1, `maxDist` 100,000: the numbers of
  `ldDecay.md`, "How it is verified", 432 variants and 29,367 pairs in
  each population, the half distances 7548.08187836982 and
  7339.709512618931, and the first and last bins; populations named
  "10" and "2", given back by popnei as "2", "10", held in the order of
  the job; and a population named `__proto__`, thrown as a defect.

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
stage 3: a file written at 0.05 is saved with 250,994 bytes with
`js-v0.1.0-dev.2` and 251,074 with `js-v0.1.0-dev.3`, whose bytes
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
  each individual over no filter and every individual, with their names
  in the result; the histograms of the variants over no filter of the
  variants and the list of the individuals kept, with
  `minNumIndividuals` 0, the bins in the job, and the MAF, Ho and the
  unbiased He; the counts over the list of the individuals kept and the
  filters of the variants after it; a write over the list and the
  filters, whose file of no variant the step does not offer. The order,
  the list of the individuals kept first, is the owner's decision of 28
  September 2026 (`docs/specs/stage-4-open-points.md`, entry A).
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

What the specs of stage 5 say, written on 30 September 2026:

- **`docs/specs/analyses/diversity.md` and `sfs.md`**: the two fields
  of the job and the fields of the result of stage 5, the populations
  of `popDiversityPops` chosen by core with `populationsWithMinimum` of
  `src/core/project.ts`, and the spectrum in the diversity's call, as
  the meanwhile of **Open 1** of `sfs.md`.
- **`docs/specs/analyses/popDists.md`**: its job and result, the six
  steps of the order of the heatmap, and its numbers.
- **`docs/specs/analyses/ldDecay.md`**: its job and result, its checks,
  its memory and its numbers.

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
- The PCA's filters given as one of each kind, which
  `docs/specs/worker/protocol.md` gave to the tests of stage 2, are
  core's from stage 4: `pcaFilters` puts the PCA's own in the place of
  the project's of their kind, and the runner puts them as any job's
  (`docs/specs/analyses/pca.md`); its test is core's.
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
- The filters of the PCA's job, the project's with the PCA's own
  filters of missing data, MAF and LD in their place:
  `pcaFilters` of `docs/specs/analyses/pca.md`. The intermediate results
  the worker keeps under their keys: none before the kinship of stage 7.
- What the step does with a written file, its Save, its warning above a
  size, and a write whose filters changed while it ran:
  `docs/specs/analyses/writeVariants.md` and `docs/specs/core/store.md`.
- The light worker and the reader of the individuals file:
  `docs/specs/worker/individuals.md`.
