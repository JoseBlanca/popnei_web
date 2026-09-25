# The messages of the two workers

25 September 2026, approved by the owner on 25 September 2026. This spec gives
`src/worker/messages.ts`: the messages the page and each of the two
workers send each other in the walking skeleton, the smallest
application that goes through every part once (stage 2 of
`docs/build-order.md`), the functions that check
every message when it arrives, and the number of the version of these
messages. The workers are threads of the browser tab beside the page,
the calculation worker, which runs popnei, and the light worker, which
reads the individuals file (`docs/architecture.md`, section 1); they
share nothing with the page but these messages. There is no code of this
module yet; `src/worker/protocol.ts`, the types core names, exists since
stage 1. It develops sections 5 and 6 of `docs/architecture.md` and the
row `messages.ts` of its section 9, and builds on
`docs/specs/worker/protocol.md`, whose request, `Run`, outcome and
errors it does not repeat. The page's side is
`docs/specs/worker/client.md`; the workers' sides are
`docs/specs/worker/runner.md`, the calculation worker, and
`docs/specs/worker/individuals.md`, the light worker and its reader of
CSV and TSV; the request of each analysis and its result are in the
analysis's spec, `docs/specs/analyses/diversity.md` in stage 2.

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

The walking skeleton has three requests, and each gets one answer, or
the worker that received it is ended (below):

| request | to | its answer, when it goes right | when the input is refused |
|---|---|---|---|
| `open`: open the variants file of a load | the calculation worker | `opened`, the individuals and the ploidy | `refused`, popnei's message; `reopenFailed`, a file the browser no longer reads |
| `run`: calculate the result of an analysis | the calculation worker | `result`, under the key it was asked with, after its `progress` | `refused`, popnei's message; `reopenFailed`, a file the browser no longer reads |
| `readIndividuals`: read the individuals file | the light worker | `individuals`, the table, or the ways the file is wrong | none: a file the reader refuses is its answer |

- **`open` carries the load**: the load id, the `File` the user picked,
  its format, and its read options, as the project holds them
  (`docs/specs/core/project.md`, `VariantSource`). A `.nei` file has no
  read options. A VCF has two, the ploidy and whether only the variants
  that passed its filters are kept, the two options of popnei's `openVcf`
  (`js/popnei/src/io_vcf.ts`); the owner decided on 25 September 2026
  that the walking skeleton reads both formats, and a VCF with its ploidy
  as a read option, 2 unless the user sets another. popnei cannot read
  the ploidy of a VCF from the file: it takes it as given, and refuses a
  genotype of another number of alleles when a pass reads it, not when
  the file is opened. So an `open` of a VCF of the wrong ploidy ends
  `opened`, and the first `run` on it ends `refused` (the cases, below).
- **`opened` carries what popnei gives once the file is open**, its
  `individuals` and its `ploidy`, with no pass over the variants
  (`docs/architecture.md`, section 6). The number of variants comes later,
  in the result of the first run, and it is the analysis's result that
  holds it (`docs/specs/core/store.md`, `numVarsOf`).
- **`run` carries the key and a `Job`**, and `result` carries the key back
  with a `JobResult`, as `.claude/skills/coding/worker.md` gives them: the
  page puts the result in its cache of results under the key the request
  was made with, since the user may have changed a setting while it ran
  and the project may then give that analysis another key.
- **`readIndividuals` carries the `File` and the options of a CSV**, as
  the source holds them (`docs/specs/core/project.md`,
  `IndividualsSource`). The walking skeleton reads a CSV or a TSV only; an
  xlsx, whose source has no CSV options, joins in stage 4 with the files
  wasm. Its answer is the reader's `IndividualsFileRead`
  (`docs/specs/worker/individuals.md`): the table, the types of its
  columns, and the three options of the CSV the reader used, the
  encoding, the separator and the decimal mark, each as the user set it
  or as the reader found it where it was "auto" (`CsvFound`); or the
  ways the file is wrong, `IndividualsFileError` of
  `protocol.ts`, a file with no rows, two columns of one name, which the
  reader's spec owns and extends, a file it cannot read among them.
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
- **`progress`** reports how far a `run` has gone, as popnei's
  `Progress` gives it (below, "The progress"). A `run` may get any
  number of them before its answer, and an `open` gets none.

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
`run`:

- `bytesRead`: the bytes of the file the pass has read, `numBytes` at
  most;
- `numBytes`: the bytes the file holds, those on the disk, so a gzipped
  VCF is counted compressed;
- `pass`: which pass of the run is reading, 1 for the first;
- `numPasses`: how many passes the run makes, `numPassesOf` of the popnei
  function that makes them.

They are popnei's as they came, not a fraction the worker works out, so
that the page can say which pass is reading, "pass 2 of 2" of a PCA, and
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

`PROTOCOL_VERSION` stays 1: the messages of the draft before this one,
whose `progress` had `done` and `total`, were never built nor deployed,
so no worker of another build can send them.

### A worker that cannot go on

Two answers end the worker that sends them, whatever it was doing, and
carry no id, since a worker runs one request at a time and the client
knows which one it was:

- **`crashed`**: the worker cannot be trusted any more. A trap of popnei's
  wasm, a `WebAssembly.RuntimeError`, after which the memory of the wasm
  keeps what it held; an error of the engine in a call to popnei, the
  `RangeError` of a memory that cannot grow; a throw of our code outside a
  call to popnei; or popnei's wasm that did not load. The runner posts it
  with the message of what was thrown, then closes itself. The client
  fails the request with the `RunError` `workerFailed` of
  `docs/specs/worker/protocol.md`, or, before the worker was ready, counts
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
  or `JobResult`, or to a type of `protocol.ts` a message carries. It is
  1 in the walking skeleton.

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
`analysis`, and its spec gives the fields; stage 2 has the diversity
alone. What every member keeps, decided here:

- **Every `Job` holds `fileId`**, the load id of the variants file it
  reads. The client sends a job to the worker that has opened that load
  (`docs/specs/worker/client.md`), and the runner refuses as `badRequest`
  a job of another load than the one it opened.
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
  read options and a VCF has them; every row of the individuals table is
  as long as its header, and there is one type for each column; the
  refusals of the reader are the kinds its spec gives.
- **A message that is refused is a defect of ours**, since both sides are
  our code, and never passed on half read. What the page does with it is
  in `docs/specs/worker/client.md`; a runner answers it with
  `badRequest`.

## The TypeScript interface

Every field is `readonly`, and every array `readonly T[]`, in the code;
`readonly` is left out below to keep the types short.

The version of the messages.

```ts
export const PROTOCOL_VERSION = 1;
```

The requests of the calculation worker, and what it sends back.

```ts
export type ToRunner =
  | { kind: "open"; id: number; fileId: string; file: File;
      format: "vcf" | "nei";
      readOptions: { ploidy: number; onlyPassed: boolean } | null } // null for .nei
  | { kind: "run"; id: number; key: string; job: Job };

export type FromRunner =
  | { kind: "ready"; protocol: number; popneiVersion: string }
  | { kind: "opened"; id: number; individuals: string[]; ploidy: number }
  | { kind: "result"; id: number; key: string; result: JobResult }
  | { kind: "refused"; id: number; message: string }        // popnei refused the input
  | { kind: "reopenFailed"; id: number; name: string; message: string } // the file no longer reads
  | { kind: "progress"; id: number; bytesRead: number; numBytes: number;
      pass: number; numPasses: number }                      // popnei's Progress, of a run
  | WorkerStop;

/** The worker cannot go on; it closes itself after posting it. */
export type WorkerStop =
  | { kind: "crashed"; message: string }     // a trap, a throw outside popnei, the wasm not loaded
  | { kind: "badRequest"; message: string }; // a request that failed its check
```

The request of the light worker, and what it sends back. The table, the
types of the columns and what "auto" found are the types of
`protocol.ts`.

```ts
export type ToFilesRunner =
  | { kind: "readIndividuals"; id: number; file: File; csv: CsvOptions };

export type FromFilesRunner =
  | { kind: "ready"; protocol: number }
  | { kind: "individuals"; id: number; read: IndividualsFileRead }
  | WorkerStop;

/** What the reader made of the file: the table, or the ways it is wrong;
    the type of docs/specs/worker/individuals.md. */
export type IndividualsFileRead =
  | { kind: "read"; table: IndividualsTable; columns: ColumnType[]; found: CsvFound }
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
and `""` for a field of the message itself; and two more.

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
  | { kind: "otherProtocol"; found: number };  // a ready of another PROTOCOL_VERSION
```

`TypeName` is the probe's: what `typeof` gives, with `null` and `array`
apart from `object`.

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
  worker.

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
  and of a `.nei` file, a diversity `run`, its `progress`, `{ kind:
  "progress", id: 3, bytesRead: 259376, numBytes: 261490, pass: 1,
  numPasses: 1 }`, and its `result`, a `reopenFailed`, an
  `individuals` read and one refused, gives `ok` with a message deeply
  equal to it. A property, with fast-check drawing messages of every kind
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
  with a `popneiVersion`; a calculation worker's `ready` without one.
- **The version**: a `ready` with `protocol: 2` and no other field gives
  `otherProtocol` with 2 from both checks of the page; with `protocol:
  "1"`, `wrongType`.
- **`describeMessageError`** names the path and the kind of the message:
  of `wrongType` at `job.filters.0.maxAllowedMissingRate` it gives a text
  that holds both.

That a `File` and the typed arrays arrive through a real worker as the
checks expect is seen in the browser, by the flow of the walking skeleton
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

## Open points

None of its own.

## Not in this spec

- `Run`, `Outcome`, `RunError`, `Progress`, the filters and the
  individuals table: `docs/specs/worker/protocol.md`.
- The fields of the diversity's `Job` and `JobResult`:
  `docs/specs/analyses/diversity.md`.
- What the runners do with each request, and which throws are `refused`
  and which `crashed`: `docs/specs/worker/runner.md` and
  `docs/specs/worker/individuals.md`.
- Which transfers a result's arrays and which copies them:
  `.claude/skills/coding/worker.md`, "Sending results back", and the
  runner's spec.
- The requests of the xlsx and of the zip of the report, and the refusal
  of the files wasm: stages 4 and 6.
- The intermediate results the calculation worker keeps, and their keys
  inside a `Job`: from stage 4, with the PCA.
