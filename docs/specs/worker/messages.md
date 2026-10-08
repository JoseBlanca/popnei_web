# The messages of the two workers

25 September 2026, approved by the owner on 25 September 2026; built in
`src/worker/messages.ts`; revised on 26 September 2026 for stage 3 of
`docs/build-order.md`, the Variants step whole, as the architecture
approved by the owner that day has it: the request `write` and its
answer `written`, a file of the filtered variants made in the calculation
worker; the checks of the jobs and results of the three analyses of the
Variants step; the counts of the pass in every result; and
`PROTOCOL_VERSION` 2. The revision is approved by the owner on 26 September 2026. Revised
again on 26 September 2026, after the review of the code of stage 3:
a `written` whose `numBytes` is not the size of its file is refused as
`wrongSize`, in bytes, and not as `wrongLength`, whose words speak of a
list. Revised on 27 September 2026 for stage 4, the Individuals step and
the PCA: the read of an xlsx, whose request carries no options of a CSV
and whose answer reports none; the files wasm, the Rust module that
reads an xlsx (`docs/specs/worker/files.md`), which fails to load as an
answer and not as a failure of the worker; and `PROTOCOL_VERSION` 3; and
again the same day, to agree with the specs written beside it: the
checks of the job and the result of the principal components
(`docs/specs/analyses/pca.md`), which make one pass, the two values of
a binary type checked as texts, and no intermediate result before stage
7; and when the specs of stage 4 were made to agree, the wasm whose
failure to load stops a worker named as popnei's; and on 28 September
2026 for the owner's decision that the filters of individuals act first
(`docs/architecture.md`, section 2): the job of the statistics of each
individual has no filter, and those of the histograms of the variants
and of the counts carry the list of the individuals kept, checked as
any job's. The revisions for stage 4 are approved by the owner on 28 September 2026.
Revised on 30 September 2026 for stage 5, the analyses of the
populations: the checks of the fields the diversity gains, of the jobs
and results of the distances between populations and of the LD decay
(`docs/specs/analyses/diversity.md`, `sfs.md`, `popDists.md` and
`ldDecay.md`), and `PROTOCOL_VERSION` 4; approved by the owner on 30 September 2026.
Revised on 6 October 2026 for the page that opens a variants file,
popgen2.html (`docs/plans/open-variants.md`): the job and the result of
the summary of the variants file, `PROTOCOL_VERSION` 5; and a VCF opened
with no ploidy, a ploidy of `null` in the read options of `open`, for
popnei to read it from the file, `PROTOCOL_VERSION` 6. Revised on 6
October 2026 for the statistics of the open file (`docs/plans/file-stats.md`):
the result of the histograms of the variants holds a fourth distribution,
`missingRate`, checked as the other three are, and `PROTOCOL_VERSION` 7.
Revised on 6 October 2026 for the one pass of popgen2.html
(`docs/plans/live-stats.md`, phase 1): the job of the summary of the
variants file gains `minNumIndividuals`, `numBins` and `range`, checked
as those of the histograms of the variants are, and its result the parts
`perVar` and `perIndividual`, each an object of exactly the fields of
the result of the histograms of the variants or of the statistics of
each individual but `analysis`, checked as those results are; and
`PROTOCOL_VERSION` 8. Revised on 7 October 2026 for the plots that fill
in while the file is read (`docs/plans/live-stats.md`, phase 2): the
message `soFar`, the result of a run over the variants read so far,
checked as `result` is, and `PROTOCOL_VERSION` 9. Revised on 7 October
2026 for the count of the FILTER failures (`docs/plans/live-stats.md`,
phase 3): the job `filterFailures`, of exactly `analysis`, `fileId` and
an empty `filters`, and its result, of exactly `analysis` and
`passStats`, whose `filtering` holds `passed` and nothing else, a kind
no other result accepts; and `PROTOCOL_VERSION` 10. Revised on 7
October 2026 when the owner took that count out, so that popgen2.html
reads each file once (`docs/plans/one-pass.md`): the job and its result
are removed, `passed` in the counts of any result is `extraFields`, and
`PROTOCOL_VERSION` is 11; the count waits for popnei's summary to give
it, popnei issue #12 (JoseBlanca/popnei). Revised on 7 October 2026 for
popnei 0.2.2, whose summary gives it (`docs/plans/popnei-0.2.2.md`, "The
FILTER failures"): the result of `variantsSummary` has the field
`filterColumn`, `null` or an object of exactly `passed` and `failed`,
two whole numbers, and `PROTOCOL_VERSION` is 12. Revised on 7 October
2026 for the thresholds of popgen2.html as filters of the project
(`docs/designs/stats-filters.md`, approved by the owner that day): a
filter of the variants of the kind `passed`, of exactly the field
`kind`, is accepted in the `filters` of a write and of every job whose
filters may be other than empty, `passed` is a kind of the counts of any
result, and `PROTOCOL_VERSION` is 13 from the merge of the branch
`popnei-0.2.2` into the branch of the filters on 8 October 2026, since
each branch had raised it from 11 to 12 for its own change. Revised
again on 7 October 2026 for the owner's decision that the filter of the
FILTER column applies to a `.nei` file whose variants record whether
they passed their FILTER (`docs/designs/stats-filters.md`, "What the
owner decided"): `opened` carries `keepsPassed`, popnei 0.2.2's answer
to that, a boolean, and `PROTOCOL_VERSION` is 14, one above the 13 of
that merge. Built on the branch `filters`, work packages 1 and 2 of
`docs/plans/filters.md`, on 7 and 8 October 2026. Revised on 8 October
2026 for the download of the filtered variants on popgen2.html
(`docs/designs/stats-filters.md`, "The download of the filtered
variants", approved by the owner that day): the `format` of a `write`
and of its `written` is `"nei"` or `"vcf"`, the VCF compressed with
bgzip (`docs/specs/worker/protocol.md`), and `PROTOCOL_VERSION` is 15. No
code of it yet.
This spec gives
`src/worker/messages.ts`: the messages the page and each of the two
workers send each other, from the walking skeleton, the smallest
application that goes through every part once (stage 2), on, the
functions that check every message when it arrives, and the number of
the version of these messages. The workers are threads of the browser tab beside the page,
the calculation worker, which runs popnei, and the light worker, which
reads the individuals file (`docs/architecture.md`, section 1); they
share nothing with the page but these messages. It develops sections 5 and 6 of `docs/architecture.md` and the
row `messages.ts` of its section 9, and builds on
`docs/specs/worker/protocol.md`, whose request, `Run`, outcome and
errors it does not repeat. The page's side is
`docs/specs/worker/client.md`; the workers' sides are
`docs/specs/worker/runner.md`, the calculation worker, and
`docs/specs/worker/individuals.md`, the light worker and its reader of
the individuals file; the request of each analysis and its result are in the
analysis's spec under `docs/specs/analyses/`.

A request is a message of the page that asks a worker for something; an
answer is the message of the worker that ends it. Every request carries
an id, the number the client counts up from 1 for the life of the page,
and every answer carries the id of its request, so that the page ties
each answer to the request it ends (`docs/specs/worker/protocol.md`).

## What it does

A user never sees a message, and sees everything a wrong one does. A
result read with a shape it does not have puts a wrong number on the
screen, or none, with no error; a request that loses its answer leaves a
file "being read" for ever; a worker left from before a deploy of the
site answers in the shape of another version. So every message is
checked when it arrives, on each side, and a message that fails the check
is never used.

### The requests and their answers

There are four requests, and each gets one answer, or the worker that
received it is ended (below):

| request | to | its answer, when it goes right | when the input is refused |
|---|---|---|---|
| `open`: open the variants file of a load | the calculation worker | `opened`, the individuals, the ploidy, and whether the variants record their FILTER | `refused`, popnei's message; `reopenFailed`, a file the browser no longer reads |
| `run`: calculate the result of an analysis | the calculation worker | `result`, under the key it was asked with, after its `progress` and its `soFar` | `refused`, popnei's message; `reopenFailed`, a file the browser no longer reads |
| `write`: write the filtered variants as a file | the calculation worker | `written`, the file under the key it was asked with, after its `progress` | as `run` |
| `readIndividuals`: read the individuals file, a CSV, a TSV or an xlsx | the light worker | `individuals`, the table, or the ways the file is wrong | none: a file the reader refuses is its answer, and so is a files wasm that could not be downloaded |

- **`open` carries the load**: the load id, the `File` the user picked,
  its format, and its read options, as the project holds them
  (`docs/specs/core/project.md`, `VariantSource`). A `.nei` file has no
  read options. A VCF has two, the ploidy and whether only the variants
  that passed its filters are kept, the two options of popnei's `openVcf`
  (`js/popnei/src/io_vcf.ts`); the owner decided on 25 September 2026
  that the walking skeleton reads both formats, and a VCF with its ploidy
  as a read option, 2 unless the user sets another. A ploidy given is
  taken as given: popnei refuses a genotype of another number of alleles
  when a pass reads it, not when the file is opened. So an `open` of a
  VCF of the wrong ploidy ends `opened`, and the first `run` on it ends
  `refused` (the cases, below). From popnei's release `js-v0.2.0` the
  ploidy may be `null`, as popgen2.html sends every VCF: popnei reads it
  from the file, the number of alleles of the first genotype with alleles
  among the first 4,096 lines, and refuses the `open` when it finds none
  or the file has no variant.
- **`opened` carries what popnei gives once the file is open**, its
  `individuals`, its `ploidy`, and `keepsPassed`, whether its variants
  record whether they passed their FILTER, with no pass over the
  variants (`docs/architecture.md`, section 6). `keepsPassed` is true
  for every VCF, and for a `.nei` file written by popnei from its vars
  format 1.2 from a source with the record; core leaves the filter of
  the FILTER column out of every job on a file for which it is false
  (`docs/specs/worker/protocol.md`, "The filters of the variants are
  popnei's"). The number of variants comes later,
  in the counts of the pass of the first run, which every result holds
  (`docs/specs/worker/protocol.md`, `PassStats`; `docs/specs/core/store.md`,
  `countsOf`).
- **`run` carries the key and a `Job`**, and `result` carries the key back
  with a `JobResult`, as `.claude/skills/coding/worker.md` gives them: the
  page puts the result in its cache of results under the key the request
  was made with, since the user may have changed a setting while it ran
  and the project may then give that analysis another key.
- **`write` carries the key and a `WriteJob`**
  (`docs/specs/worker/protocol.md`): the format, `nei` or `vcf`, the load, the
  filters of the variants and the list of the individuals kept. Its
  key is the store's, made from the load, the filters and the format
  (`docs/architecture.md`, section 5), and it comes back in `written`, so
  that the page ties the file to the settings it was written with, as it
  does a result.
- **`written` carries the key and a `Written<Blob>`**: the file as a
  `Blob`, the browser's object for a file made in the page, and the
  counts of its pass. The runner makes the `Blob` in the worker from the
  bytes popnei gives, and the worker posts it; a `Blob` crosses to the
  page as a handle, with no copy of its bytes, as a `File` does, and
  nothing is transferred (`docs/specs/worker/runner.md`, "The written
  file"). Its `numBytes` is the `size` of the `Blob`, so that core,
  which cannot name a `Blob`, reads the size (`protocol.md`, `Written`).
- **`readIndividuals` carries the `File` and the options of a CSV**, as
  the source holds them (`docs/specs/core/project.md`,
  `IndividualsSource`), and `csv` `null` for an xlsx, whose source has no
  options of a CSV, from stage 4. Its answer is the reader's
  `IndividualsFileRead` (`docs/specs/worker/individuals.md`): the table,
  the types of its columns, and, for a CSV or a TSV, the three options
  the reader used, the encoding, the separator and the decimal mark, each
  as the user set it or as the reader found it where it was "auto"
  (`CsvFound`), and `null` for an xlsx; or the ways the file is wrong,
  `IndividualsFileError` of `protocol.ts`, a file with no rows, two
  columns of one name, an xlsx saved with a password, which the reader's
  spec owns and extends, a file it cannot read among them.
- **A files wasm that could not be downloaded is an answer**, the failed
  read `xlsxReaderNotLoaded`, with the browser's message for the console,
  and the light worker goes on (`docs/specs/worker/individuals.md`, "The
  package of xlsx_rs, loaded on first need"). It is not `crashed`, which would end a worker
  that can still read a CSV, and would tell the user that the reading
  stopped where the words of the refusal tell them to check their
  connection; a failed `import()` or `init()` leaves no wasm behind,
  though a browser may keep a failed `import()` as failed until the
  worker ends, so that trying again fails too (`individuals.md`, the
  same). The option not taken is `crashed`, as a popnei that does not
  load ends the calculation worker, which without popnei can do nothing.
  A file calamine cannot open is the refusal `files`, with calamine's
  message; a panic of the files wasm is a trap, and `crashed`.
- **`refused` is popnei's refusal of its input**, a plain `Error` thrown
  by a call to popnei, with its message as it is
  (`docs/specs/worker/protocol.md`, "The cases"). The worker goes on to
  the next request.
- **`reopenFailed` is a variants file the browser can no longer read**,
  changed, moved or deleted on the disk since the user picked it: popnei
  refused a call that read the file with its message of a range the
  browser refused or gave short, or refused to open again a file it had
  opened (`docs/specs/worker/runner.md`, "What it answers when something
  goes wrong"). It carries the name of the file and popnei's
  message, which the client writes to the console. The owner decided on
  25 September 2026 that it is a kind of its own, so that the user is
  told the file may have changed and to load it again, and not that the
  calculation crashed (point B of `docs/specs/stage-2-open-points.md`).
  The worker goes on.
- **`progress`** reports how far a `run` or a `write` has gone, as
  popnei's `Progress` gives it (below, "The progress"). Either may get any
  number of them before its answer, and an `open` gets none.
- **`soFar`** carries the result of a `run` over the variants read so
  far, with its id and its key, sent while the pass runs by a
  calculation whose result popnei gives so far: the summary of the
  variants file, every 2 seconds, popnei's `soFarEvery` left as it is
  (below, "The result so far"). A run of another analysis gets none, a
  `write` and an `open` none.

### The File travels in the request that needs it

The `File`, the handle the browser gives to a file the user picked, is
sent inside the `open` and the `readIndividuals` that need it, and not in
a message of its own. Posting a `File` sends the handle and not the bytes,
so sending it with every such request costs nothing. The calculation
worker holds one load, the load of the one `open` it receives, and the
light worker holds nothing between two reads, so a message that gave a
worker the list of the files would be a second state, in the worker, that
could disagree with the request. The client keeps the `File` of every
load and gives it again to a worker started again, in the `open` that
worker receives first (`docs/specs/worker/client.md`); that is how "the
page sends the new worker the `File` objects again" of section 5 of the
architecture is done.

The runner gives that `File` to popnei, whose `openVcf` and `openVars`
of the release stage 2 builds on, `js-v0.1.0-dev.2`, take it and read it
by ranges of a few MiB (`js/popnei/src/io_vcf.ts` and `io_vars.ts`), as
the owner decided on 25 September 2026; no message carries the bytes of
a file.

### The progress

A `progress` carries the four fields of popnei's `Progress`
(`js/popnei/src/variant.ts`), under their names, with the id of the
`run` or the `write`:

- `bytesRead`: the bytes of the file the pass has read, `numBytes` at
  most;
- `numBytes`: the bytes the file holds, those on the disk, so a gzipped
  VCF is counted compressed;
- `pass`: which pass of the run is reading, 1 for the first;
- `numPasses`: how many passes the run makes, `numPassesOf` of the popnei
  function that makes them.

They are popnei's as they came, not a fraction the worker works out, so
that the page can say which pass is reading, "pass 2 of 2" of a
calculation of popnei that reads the file twice, none of which the
applications make in stage 4, and
draw the bar with the rule of popnei's README: the run is
`(pass − 1 + bytesRead / numBytes) / numPasses` done. A pass over a
`.nei` file ends below `numBytes`, since popnei does not read the whole
file, so nothing waits for the two to meet; the answer of the run ends
it (`docs/specs/worker/runner.md`, "Progress"). The check refuses a
`progress` whose four fields are not numbers, and not one whose numbers
are out of order: that is popnei's to keep. `Progress` of `protocol.ts`,
which the client passes to the store, holds the same four fields, a
change to that approved file (`docs/specs/stage-2-open-points.md`,
"Changes to approved files").

`PROTOCOL_VERSION` was 1 in the walking skeleton, whose messages were
built and deployed; it is 2 from stage 3, since `write`, `written`, the
jobs and the results change, and 3 from stage 4 (below, "The ready
message").

### The result so far

A `soFar` has the fields of a `result`, `id`, `key` and `result`, and is
checked as a `result` is, every array of its `result` of its typed array
and as long as what it goes with: a result so far is drawn as the result
is, so a shape it does not have would put a wrong number on the screen
as surely. Its arrays are transferred, each over a buffer of its own that
the runner made by copying popnei's (`docs/specs/worker/runner.md`, "The
result so far"). It is a message of its own and not a field of
`progress`, which every run and write has and which would then carry
statistics for one analysis alone (`docs/plans/live-stats.md`). The last
one before the `result`, when popnei gives one after its last block,
holds the same numbers as the `result`.

### A worker that cannot go on

Two answers end the worker that sends them, whatever it was doing, and
carry no id, since a worker runs one request at a time and the client
knows which one it was:

- **`crashed`**: the worker cannot be trusted any more. A trap of popnei's
  wasm, a `WebAssembly.RuntimeError`, after which the memory of the wasm
  keeps what it held; an error of the engine in a call to popnei, the
  `RangeError` of a memory that cannot grow; a throw of our code outside a
  call to popnei; or popnei's wasm that did not load. In the light
  worker, a trap of the files wasm, a panic of the crate or a memory
  that cannot grow, or a throw of our code; not a files wasm that did not
  load, which is an answer (above). The runner posts it
  with the message of what was thrown, then closes itself. The client
  fails the request with the `RunError` `workerFailed` of
  `docs/specs/worker/protocol.md`, or with `defect` when a message of
  the calculation worker starts "popnei_web defect: ", a mistake of our
  code (`docs/specs/worker/client.md`, "Crashes, defects, and every
  read answered"), or, before the worker was ready, counts
  it as a failed start, and starts another worker
  (`docs/specs/worker/client.md`).
- **`badRequest`**: a request that did not pass its check, which only a
  defect of the page can send. The runner posts it with the description
  of what was wrong, then closes itself. The client fails the request
  with the `RunError` `defect`, a mistake of our code.

Every request gets its answer or one of these two, whatever breaks in
the worker, because the client has no timeout on a calculation and a
request with no answer would wait for ever: a promise rejected inside a
worker with nothing to handle it fires `unhandledrejection` in the
worker and no `error` event on the page. So the worker's script handles
each request inside one `try`, and its own `error` and
`unhandledrejection` handlers post `crashed`, and its `messageerror`
handler, a request the browser could not copy, posts `badRequest`. The
`error` handler calls `event.preventDefault()` as well, so that the
browser does not pass the error on to the page's window
(`docs/specs/entry.md`, "The errors nothing else shows"). The
runner's spec says which throws are which (`docs/specs/worker/runner.md`);
a file the browser can no longer read is not among them: it is the
answer `reopenFailed`, above, and the worker goes on.

### The ready message, and the version of the messages

Each worker posts `ready` when it can take requests, and the client sends
it nothing before (`.claude/skills/coding/worker.md`, "Loading popnei,
once"). Each worker has its own type of messages, `FromRunner` for the
calculation worker and `FromFilesRunner` for the light one, and its own
check, because they differ in `ready`:

- **The calculation worker's `ready` requires `popneiVersion`**, the text
  popnei's `version()` gives, which is part of every key
  (`docs/architecture.md`, section 3). It posts `ready` once `init()` of
  popnei has loaded the wasm, and `crashed` when it could not.
- **The light worker's `ready` has no `popneiVersion`**, since it holds no
  popnei, and a `ready` of the light worker with one is refused, so the
  page never takes a version from a worker that does not run popnei.
- **Both carry `protocol`, the number `PROTOCOL_VERSION`**, which the
  client compares with its own. The page and the workers are built
  together, so two numbers that differ are a worker of another build.
  The check of the page gives then the refusal `otherProtocol`, and the
  client fails every request of that worker with the `RunError`
  `protocolMismatch` and uses the worker no more; the user reads that the
  page is out of date and is to be reloaded (`docs/specs/core/project.md`,
  **Open 4** there). `kind:
  "ready"` and the field `protocol` keep their names and types in every
  version, and the check reads `protocol` before any other field, so that
  a worker whose `ready` has other fields is still told apart as a worker
  of another version and not taken for a defect.
- **`PROTOCOL_VERSION` is raised with any change to a message**, to `Job`
  or `JobResult`, or to a type of `protocol.ts` a message carries. It was
  1 in the walking skeleton, 2 from stage 3, 3 from stage 4,
  whose `readIndividuals`, `individuals` and refusals of the reader
  change here, and whose job and result of the PCA join `Job` and
  `JobResult` (`docs/specs/analyses/pca.md`), and is 4 from stage 5,
  whose diversity gains fields and whose distances between populations
  and LD decay join the unions. From then on it is raised with each
  change rather than once for a stage: 5 on 5 October 2026, when the job
  and the result of the summary of the variants file join the unions; 6
  on 6 October, when the read options of a VCF take a ploidy of `null`,
  which popnei reads from the file; 7 the same day, when the histograms
  of the variants gain `missingRate`; 8, when the summary becomes the one
  pass that also gives `perVar` and `perIndividual`
  (`docs/plans/live-stats.md`, phase 1); and 9, when `soFar` joins
  `FromRunner` (phase 2); 10 and 11 when the job of the count of the
  FILTER failures joined and left (phase 3, `docs/plans/one-pass.md`);
  12 on the branch of the filters, for the kind
  `passed`; 13 at the merge of the branch `popnei-0.2.2`, which gave 12
  to the count of the FILTER failures of the summary; 14 when
  `opened` gains `keepsPassed`; and 15 when the format of a `write` and
  of its `written` gains `"vcf"`.

The names of the built files carry a hash of what they hold
(`.claude/skills/coding/worker.md`, "The wasm files on GitHub Pages"), so
a page asks for the worker of its own build, and a page left open across
a deploy asks for files that are no longer on the site, which is a worker
that does not start and not one of another version
(`docs/specs/worker/client.md`, "The cases"). The check of `protocol`
stays for what the hash does not cover, a mistake in the build, and costs
one comparison.

### Job and JobResult

`Job` and `JobResult` are unions in `src/worker/protocol.ts`, as
`.claude/skills/coding/worker.md` gives them, since the analyses of core
build a `Job` and read a `JobResult` and core imports no `messages.ts`.
Each analysis adds one member to each, tagged with its id in the field
`analysis`, and its spec gives the fields; stage 3 has four, the
diversity and the three analyses of the Variants step, stage 4 five, and
stage 5 seven, with the distances between populations and the LD decay.
What every member
keeps, decided here:

- **Every `Job` names its pass**: `fileId`, the load id of the variants
  file it reads, `filters`, and, in a job of an analysis that reads the
  filters of individuals, `individuals`, the list of the individuals kept
  or `null` (`docs/specs/worker/protocol.md`). A `WriteJob` holds the
  three. The client sends a job to the worker that has opened that load
  (`docs/specs/worker/client.md`), and the runner refuses as `badRequest`
  a job of another load than the one it opened.
- **Every `JobResult` holds `passStats`**, the counts of its pass, and so
  does a `Written`.
- **Its fields are JSON values**, text, numbers, booleans, `null`, lists
  and objects, and its names of the user's files, the populations among
  them, are pairs and never the names of fields, as
  `.claude/skills/coding/worker.md` asks.
- **A `JobResult` holds its numbers of a variant or of an individual in
  typed arrays**, `Float64Array`, `Uint32Array`, never lists of numbers,
  and the member of the result has the tag of its job.

The check of each member is in `messages.ts`, written from the fields the
analysis's spec gives, as the other checks here are. So adding an
analysis adds, beside its module and its panel, a member to `Job` and
`JobResult`, its check here and its handler in the runner, where section
4 of `docs/architecture.md` says nothing else changes; `worker.md`
already put the jobs in `protocol.ts` and their handlers in the runner,
and core, which builds the jobs, cannot import a check that names the
`File`.

### The checks

`MessageEvent.data` is read as `unknown` on each side and given to the
check of that side: the page checks what each worker sends, and each
runner checks what the page sends it. A check gives the typed message, or
the first way it was wrong, as a `Result` of `src/core/result.ts`. The
rules, those of the probe's messages of stage 0 (`src/probe/messages.ts`)
and of `.claude/skills/coding/worker.md`, "Validation at the boundary":

- **A message has exactly the fields of its kind**, at every depth: a
  field missing, one more, or a field of the wrong type is refused. Only
  the object's own fields are read, so a field every object inherits,
  `constructor`, is never taken for one of its own.
- **The type, not the range.** A number is `typeof` number, an id is a
  whole number, a `File` is `instanceof File`, an array of numbers of a
  result is `instanceof` its typed array. That a frequency is between 0
  and 1, or a ploidy from 1 to 255, is popnei's to check and the tests'.
  A NaN is a number: popnei gives one where a value is not defined.
- **What the types tie together is checked too**: a `.nei` file has no
  read options and a VCF has them; `csv` of a `readIndividuals` and
  `found` of a read are `null` or have all their fields; the `one` and
  the `zero` of a binary type are texts, from stage 4; every row of the individuals table is
  as long as its header, and there is one type for each column; every
  array of a diversity result is as long as its `pops`, so that no number
  is put under another population; the two arrays of the statistics of
  each individual are as long as its `individuals`, a list of texts; the `counts` of each
  histogram of the variants are one fewer than its `binEdges`; a
  population of a `Job` is a pair, its name and its individuals;
  `individuals` of a job is `null` or a list of texts; a filter of the
  variants has exactly the fields of its kind, `kind` alone for
  `passed`; the fields of `passStats.filtering` of every result are
  kinds of `VariantFilter`, `passed` among them from 7 October 2026;
  `filters` of a
  `variantChecks` or an `individualChecks` job is empty, the second from
  28 September 2026, and of a `variantsSummary` job; for the principal components, from
  stage 4, the `method` of a job and of a result is `"pca"` or
  `"pcoa"`, `numCompsKept` of a job, `numComps` and `numCompsFound` of a
  result are whole numbers, `projections` is as long as `individuals`
  times `numComps`, `explainedVariancePercent` is as long as
  `numComps`, and a result of the PCA has `numVarsUsed` a number and
  `lingoesConstant` and `negativeEigenvaluesPercent` `null`, and one of
  the PCoA the other way round; that `numCompsKept` is at least 1 and `numComps` at most
  `numCompsFound` is core's and the runner's to keep, as a range;
  from stage 5, for the diversity, `popDiversityPops` a list of texts,
  each a name of the job's `pops`, in its order and once, and
  `numCalledAlleles` a whole number of 2 or more, popnei's smallest
  draw, a range the check keeps against its rule of the type, since
  popnei refuses a smaller draw only in the second call, after a whole
  first pass; each new array of a result as long as its `pops`,
  `numVarsEveryPop` and `numVarsEveryPopInDraw` both `null` or both
  whole numbers, and `foldedSfs` one entry per population, each `null`
  or a `Float64Array` of `floor(numCalledAlleles / 2) + 1` values; for
  the distances between populations, `fst`, `dest` and `numVarsPerPair`
  of k × (k − 1) / 2 values for the k of `pops`, `numIndividuals` of k,
  each `leftOut` a pair of a text and a whole number, and each `order` of
  the kind `pcoa` with an `order` that holds every index of `pops` once,
  or of the kind `file` with one of the four reasons and, for
  `notPlaced` alone, a `message`; for the LD decay, `smallestDist` and
  `largestDist` of `numBins` values, `numPairs`, `meanR2` and `sdR2` of
  `pops` × `numBins`, and `numIndividuals`, `numVars`, `rhoPerBp`,
  `r2AtZero` and `halfDist` of one value per population, `numBins` of
  the result being the length of `smallestDist`, which the runner makes
  from the job's; the `numBytes` of a `written` is the
  `size` of its file, or it is refused as `wrongSize`; the refusals of the reader are the kinds
  its spec gives. That the statistics of each individual are those of the
  individuals of the file, in its order, that a list of individuals is
  not empty, and that `passStats.filtering` follows the filters of the
  job, are not in the message: the runner checks the first two and
  builds the third (`docs/specs/worker/runner.md`).
- **A message that is refused is a defect of ours**, since both sides are
  our code, and never passed on half read. What the page does with it is
  in `docs/specs/worker/client.md`; a runner answers it with
  `badRequest`.

## The TypeScript interface

Every field is `readonly`, and every array `readonly T[]`, in the code;
`readonly` is left out below to keep the types short.

The version of the messages.

```ts
export const PROTOCOL_VERSION = 15;
```

The requests of the calculation worker, and what it sends back.

```ts
export type ToRunner =
  | { kind: "open"; id: number; fileId: string; file: File;
      format: "vcf" | "nei";
      readOptions: { ploidy: number | null; onlyPassed: boolean } | null } // null for .nei; a ploidy of null is read from the file
  | { kind: "run"; id: number; key: string; job: Job }
  | { kind: "write"; id: number; key: string; job: WriteJob };

export type FromRunner =
  | { kind: "ready"; protocol: number; popneiVersion: string }
  | { kind: "opened"; id: number; individuals: string[]; ploidy: number;
      keepsPassed: boolean }  // whether the variants record whether they passed their FILTER
  | { kind: "result"; id: number; key: string; result: JobResult }
  | { kind: "soFar"; id: number; key: string; result: JobResult } // the result over the variants read so far, of a run running
  | { kind: "written"; id: number; key: string; result: Written<Blob> } // the file, as a Blob
  | { kind: "refused"; id: number; message: string }        // popnei refused the input
  | { kind: "reopenFailed"; id: number; name: string; message: string } // the file no longer reads
  | { kind: "progress"; id: number; bytesRead: number; numBytes: number;
      pass: number; numPasses: number }                      // popnei's Progress, of a run or a write
  | WorkerStop;

/** The worker cannot go on; it closes itself after posting it. */
export type WorkerStop =
  | { kind: "crashed"; message: string }     // a trap, a throw outside popnei, popnei's wasm not loaded
  | { kind: "badRequest"; message: string }; // a request that failed its check
```

The request of the light worker, and what it sends back. The table, the
types of the columns and the options of a CSV used, set or found, are the types of
`protocol.ts`.

```ts
export type ToFilesRunner =
  | { kind: "readIndividuals"; id: number; file: File;
      csv: CsvOptions | null };                                 // null for an xlsx

export type FromFilesRunner =
  | { kind: "ready"; protocol: number }
  | { kind: "individuals"; id: number; read: IndividualsFileRead }
  | WorkerStop;

/** What the reader made of the file: the table, or the ways it is wrong;
    the type of docs/specs/worker/individuals.md. */
export type IndividualsFileRead =
  | { kind: "read"; table: IndividualsTable; columns: ColumnType[];
      found: CsvFound | null }                                  // null for an xlsx
  | { kind: "failed"; error: IndividualsFileError };
```

The checks, one for each side of each worker, and the text of a refusal,
which the client writes to the console of the browser and a runner sends
in `badRequest`.

```ts
export function parseToRunner(data: unknown): Result<ToRunner, MessageError>;
export function parseFromRunner(data: unknown): Result<FromRunner, MessageError>;
export function parseToFilesRunner(data: unknown): Result<ToFilesRunner, MessageError>;
export function parseFromFilesRunner(data: unknown): Result<FromFilesRunner, MessageError>;

export function describeMessageError(e: MessageError): string;
```

The ways a message is refused: the kinds of the probe's `MessageError`,
with the place of the field given as its path in the message,
`"job.filters.0.maxAllowedMissingRate"`, since the messages here nest,
and `""` for a field of the message itself; and three more:
`wrongLength`, a list that is not as long as what it goes with, a row of
the table or an array of a result, or a `variantChecks` job with a
filter; `wrongSize`, a `written` whose `numBytes` is not the `size` of
its file; and `otherProtocol`, a `ready` of another version.

```ts
export type MessageError =
  | { kind: "notObject"; found: TypeName }
  | { kind: "noKind" }
  | { kind: "kindNotText"; found: TypeName }
  | { kind: "unknownKind"; found: string; expected: string[] }
  | { kind: "missingFields"; messageKind: string; path: string; fields: string[] }
  | { kind: "extraFields"; messageKind: string; path: string; fields: string[] }
  | { kind: "unknownValue"; messageKind: string; path: string; found: string; expected: string[] }
  | { kind: "wrongType"; messageKind: string; path: string; expected: string; found: TypeName }
  | { kind: "wrongLength"; messageKind: string; path: string; expected: number; found: number }
  | { kind: "wrongSize"; messageKind: string; path: string; expected: number; found: number }  // expected: the size of the file, in bytes
  | { kind: "otherProtocol"; found: number };  // a ready of another PROTOCOL_VERSION
```

`TypeName` is the probe's: what `typeof` gives, with `null` and `array`
apart from `object`.

`describeMessageError` gives each kind in the words of what it checks.
Of `wrongLength` it gives the list, the number of its elements and the
number it should have. Of `wrongSize` it gives the field, its number as
it came, and the size of the file in bytes, with a comma between
thousands: "The field result.numBytes of the message written is 3000,
not the size of its file, 3,594 bytes." A refusal reaches the page in
the words of a defect, and a number of bytes called a list of elements
would mislead whoever reads it there.

## The cases

- **A VCF whose genotypes are not of the ploidy given.** The `open` ends
  `opened`, with the ploidy given and not one read from the file, and the
  first `run` on that load ends `refused`, with popnei's message, which
  the store keeps under the key of that run (`docs/specs/core/store.md`,
  "A calculation that failed"). The ploidy is in every key, so another
  ploidy is another key; how the user gives it is the screen's
  (`docs/specs/steps/variants.md`).
- **A ploidy above 255** is refused by popnei at the open, `refused`; a
  project never holds one (`docs/specs/core/project.md`, `MAX_PLOIDY`).
- **A `ready` of another version with other fields** gives
  `otherProtocol`, not a refusal of its fields, as above. A `ready` whose
  `protocol` is not a number is refused as any other message.
- **An answer with a well formed id of no request** passes the check,
  which knows no requests; the client refuses it
  (`docs/specs/worker/client.md`).
- **An empty individuals file** is an answer, `individuals` with
  `{ kind: "failed", error: { kind: "empty" } }`, and not a failure of the
  worker; so is an xlsx the reader refuses, `encrypted`, and a files wasm
  that could not be downloaded, `xlsxReaderNotLoaded`.
- **A read of an xlsx whose answer has a `found`**, or of a CSV whose
  answer has none, passes the check, which does not know the request;
  the reader never gives one, and core records the read under the
  options it was asked with (`docs/specs/core/project.md`, "The
  records").
- **A `written` whose format is not that of its `write`** passes the
  check, which does not know the request; the store, which does, makes it
  a defect (`docs/specs/core/store.md`).
- **A `written` of no variant**, `passStats.numVars` 0, passes the check: popnei
  writes such a file (`docs/specs/worker/protocol.md`, "The cases"), and
  what the step does with it is its own.
- **A `run` or a `write` whose `individuals` is an empty list** passes the
  check, as a range would; the runner answers it `badRequest`, since core
  never sends one.

## How it runs

The checks run on the side that receives, the page for the answers and
each worker for its requests, once per message. The check of an answer
of the light worker walks every cell of the table, which grows with the
file: 10,000 individuals and 20 columns are 200,000 cells, a check of a
few operations each. It has not been measured; it is one pass more over
the cells than the structured clone, the copy the browser makes of every
message it posts, already makes.

## How it is verified

With Vitest, in node, at the four `parse` functions; the checks are the
one code of this module, and the client's spec checks what the page does
with a refusal. Node has `File`, so the requests are built with `new
File(["…"], "panel.nei")`.

- **Every kind is accepted**: a message of each kind, the `open` of a VCF
  and of a `.nei` file, an `opened` with `keepsPassed` true and one with
  false, a `run` of each of the seven jobs, a diversity
  job and a `write` whose filters are `passed` and the missing data
  filter, and a result whose `passStats.filtering` holds `passed` before
  `missing_data`, the principal
  components with the method `"pca"` and with `"pcoa"`, with
  `individuals` `null` and with a list, its `progress`, `{ kind:
  "progress", id: 3, bytesRead: 259376, numBytes: 261490, pass: 1,
  numPasses: 1 }`, and its `result`, a `write` and its `written`, whose
  file is `new Blob([new Uint8Array(3594)])`, and from 8 October 2026 a
  `write` and its `written` of the format `"vcf"`, a
  `reopenFailed`, a `readIndividuals` with the options of a CSV and one
  with `csv` `null`, an `individuals` read with a `found` and one with
  `found` `null`, and one refused of each kind of the reader, the seven
  of the xlsx among them, gives `ok` with a
  message deeply equal to it. A property, with fast-check drawing messages of every kind
  of the two answers: `parseFromRunner(structuredClone(m))` is `ok` and
  deeply equal to `m`, and the same for `parseFromFilesRunner`, since what
  arrives at the page is the structured clone of what the worker posted.
- **Each refusal**, with its `kind` and its `path`: a message that is not
  an object, with no `kind`, of an unknown kind; an `id` of 1.5; a field
  missing and a field more, at the top and in `job.filters.0`; an
  inherited field taken as missing, a `run` whose own fields are `kind`,
  `key` and `job` and whose `id` is on its prototype,
  `Object.assign(Object.create({ id: 1 }), { kind: "run", key, job })`,
  gives `missingFields` of `id` at `""`; an array
  of numbers where a `Float64Array` is expected; a `.nei` file with read
  options and a VCF without them; a `progress` with `done` and `total`,
  the fields of the draft before, `extraFields` and `missingFields`; a
  row of the table one cell short,
  `wrongLength`; three types for a table of four columns; a refusal of
  the reader of a kind its spec does not give; a light worker's `ready`
  with a `popneiVersion`; a calculation worker's `ready` without one; a
  diversity `job` with the field `individualFilters` of stage 2,
  `extraFields`, and without `individuals`, `missingFields`; a result
  without `passStats`, and one with `numVars` at its top, as stage 2 had
  it; a `passStats.filtering` with a field `regions`, before popnei has
  that filter, `extraFields`; a filter `{ kind: "passed",
  maxAllowedMissingRate: 0.1 }` in a diversity job, `extraFields` at
  `job.filters.0`; an `obsHetRate` of 199 numbers beside a
  `missingGtRate` of 200, `wrongLength`, and so an `individuals` of 199; `binEdges` of 41 numbers and
  the `counts` of the MAF of 41, `wrongLength`; a `variantChecks` job
  with a filter; a `written` whose `numBytes` is 3593 and its file's
  `size` 3594, `wrongSize` at `result.numBytes` with `expected` 3594 and
  `found` 3593; one whose `file` is an `ArrayBuffer`, `wrongType`; a
  `pca` job whose `method` is `"tsne"`, `unknownValue`, and whose
  `numCompsKept` is 1.5, `wrongType`; a result of the principal
  components whose `projections` is a list of numbers, `wrongType`, has
  1,999 numbers for 200 individuals and 10 components, `wrongLength`,
  or whose `explainedVariancePercent` has 9, `wrongLength`; a result of
  the PCA with `numVarsUsed` `null`, `wrongType`; a result of the PCoA
  with `lingoesConstant` `null`, `wrongType`; an `opened` without
  `keepsPassed`, `missingFields`, and one with `keepsPassed` `"true"`, `wrongType`; from stage 5, a diversity
  job with `numCalledAlleles` 1, and one whose `popDiversityPops` names a
  population not in `pops`, or two in another order than theirs; a
  diversity result with `numVarsEveryPop` a number and
  `numVarsEveryPopInDraw` `null`, and one whose `foldedSfs` holds 20
  values for a draw of 40; a result of the distances of three
  populations with two values of `fst`, `wrongLength`, an `order` of the
  kind `pcoa` of `[0, 0, 2]`, and a `notPlaced` without its `message`;
  a result of the LD decay of two populations and 50 bins with 99 values
  of `meanR2`, `wrongLength`; from 8 October 2026, a `write` and a
  `written` of the format `"bcf"`, or `"vcf.gz"`, `unknownValue` at
  `job.format` and `result.format`, with `expected` `["nei", "vcf"]`.
- **The result so far**: a `soFar` of the summary of the variants file
  is accepted as it is; one whose `numVarsPerChrom` holds one count for
  two chromosomes gives `wrongLength` at `result.numVarsPerChrom`, with
  `messageKind` `soFar`, as a `result` would; one with a field
  `progress` gives `extraFields`, and one without `key` `missingFields`.
  The property above draws `soFar` messages too.
- **The version**: a `ready` with `protocol: 3`, stage 4's, and no
  other field gives `otherProtocol` with 3 from both checks of the page,
  and so does `protocol: 5` with 5; with `protocol: "4"`, `wrongType`.
- **The xlsx**: a `readIndividuals` whose `csv` is `{}`,
  `missingFields`; a binary type whose `one` is the number 1,
  `wrongType`; a `found` of an xlsx with the fields of a `CsvFound`
  but `undecodedLine`, `missingFields`; an `emptySheet` without its
  `sheet`, `missingFields`.
- **`describeMessageError`** names the path and the kind of the message:
  of `wrongType` at `job.filters.0.maxAllowedMissingRate` it gives a text
  that holds both; of that `wrongSize` it gives "The field
  result.numBytes of the message written is 3593, not the size of its
  file, 3,594 bytes."

That a `File`, the typed arrays and a `Blob` arrive through a real
worker as the checks expect is seen in the browser, by the flow of the
walking skeleton and that of the Variants step
(`.claude/skills/coding/testing.md`, "The walking skeleton, as a flow").

## Where this departs from worker.md

`.claude/skills/coding/worker.md` was written before this spec, and
four things change; the skill is corrected when the owner approves this
spec (`docs/specs/stage-2-open-points.md`, "Changes to approved files").

- `progress` carries popnei's four fields, `bytesRead`, `numBytes`,
  `pass` and `numPasses`, where the skill has `done` and `total`, and
  comes from popnei's `Variants.onProgress` and not from a source of
  bytes of our own, which the skill's "Progress, from the source of
  bytes" designed before popnei had it.
- The message `files`, which gave a worker the list of the `File`
  objects, is gone: the `File` goes in the request that needs it, for the
  reason above.
- The answer `error`, with `fatal`, is four kinds, `refused`,
  `reopenFailed`, `crashed` and `badRequest`, so that the client knows
  popnei's refusal from a worker that cannot go on without reading a flag
  beside it, a file the browser no longer reads from a refusal of its
  data, and a defect of the page from a crash. `reopenFailed` is new.
- `PROTOCOL_VERSION` is in `messages.ts`, beside the messages it
  versions, and not in `protocol.ts`: core has no use for it.

From stage 3, one more, which the skill takes when the owner approves
this revision: a file written in the calculation worker crosses as a
`Blob` the runner made, in `written`, and not as a `Uint8Array`
transferred to the page and made a `Blob` there, as "Reading the files of
the user" of `worker.md` has it, so that a copy the engine makes of up to
a gigabyte into the `Blob` is made off the page (`docs/architecture.md`,
section 6, "The files written").

From stage 4, one more, written into the skill with this revision on
27 September 2026, to be approved with it: a files wasm that could not
be downloaded is the answer `xlsxReaderNotLoaded`, and the light worker
goes on, where the skill said nothing of it and treated a wasm that
does not load as a worker that fails; and the refusals of the files
crate that the user can mend are kinds of their own, `encrypted` among
them, where the skill had every error of the files wasm sent as `files`
with its message (`docs/specs/worker/files.md`, "The refusals").

## Open points

None of its own.

## Not in this spec

- `Run`, `Outcome`, `RunError`, `Progress`, the filters and the
  individuals table: `docs/specs/worker/protocol.md`.
- The fields of each analysis's `Job` and `JobResult`: its spec under
  `docs/specs/analyses/`, and the block of `docs/specs/worker/protocol.md`
  that follows them.
- What the runners do with each request, and which throws are `refused`
  and which `crashed`: `docs/specs/worker/runner.md` and
  `docs/specs/worker/individuals.md`.
- Which transfers a result's arrays and which copies them:
  `.claude/skills/coding/worker.md`, "Sending results back", and the
  runner's spec.
- The request of the zip of the report, and of an xlsx written: stage 6.
- What the light worker does to read an xlsx, and the files wasm it
  loads for it: `docs/specs/worker/individuals.md` and
  `docs/specs/worker/files.md`.
- The request of the regions of a BED file, to the light worker, and a
  `written` of a VCF: with popnei's release that has the filter of the
  regions and the writer of the VCF.
- The intermediate results the calculation worker keeps, and their keys
  inside a `Job`: none before the kinship of stage 7, since the variants
  the pruning of the PCA keeps are not kept ("The pruned variants are not
  kept between two PCAs" in `docs/specs/stage-4-open-points.md`).
