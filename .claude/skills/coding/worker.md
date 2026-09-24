# The workers and their messages

The work of the applications that is not the page runs in two web
workers, threads of the page that cannot touch what the page shows, and
the page talks to them only through messages. The calculation worker does
every calculation that reads the genotypes and is the only thread that
opens the variant file; the light worker does the jobs that read no
genotype, reading the individuals file, writing an xlsx, zipping the
report. `docs/architecture.md`, sections 1, 5 and 6, has the design; this
file has the rules for the code of `src/worker/`:

```
src/worker/protocol.ts     the jobs, their results, a run and its outcome:
                           the types core names too, with no type of the DOM
src/worker/messages.ts     the messages in both directions and their
                           validation, imported by the client and the runners
src/worker/client.ts       the page's side: a queue per worker, progress,
                           cancelling, restarting, the File objects by file id
src/worker/start.ts        the lines that make the two workers, `?worker`
src/worker/runner.ts       the calculation worker: popnei, the variant file,
                           the intermediate caches
src/worker/filesRunner.ts  the light worker, with no popnei: the individuals
                           file, the files wasm, xlsx and zip
src/worker/individuals/    the reader of CSV and TSV and the inference of the
                           types of the columns, pure, called by filesRunner.ts
crates/files/              the files wasm, in Rust, which only filesRunner.ts
                           calls
```

`protocol.ts` and `messages.ts` are apart because core imports the types
of the first and is checked with no DOM (`configs.md`), while a message
carries a `File`, a type of the DOM.

What the TypeScript package of popnei offers the calculation worker is in
`js/popnei/README.md` of popnei and section 11 of its
`docs/architecture.md`. It was read for this file in September 2026, at
version 0.1.0, and the section "What popnei has to provide" lists what the
design here assumes and the package does not have yet.

## Why two workers, and our own messages

- **A calculation on the page would freeze it.** A PCA of a million
  variants takes seconds to minutes, and while the main thread computes,
  nothing on the page moves, not even the button to cancel.
- **Two workers, one request at a time in each.** The wasm of popnei has
  one thread, so a worker runs one request at a time. The calculation
  worker is one: it holds the variant file and the intermediate results,
  and a second one would hold its own. The jobs that read no genotype go
  to the light worker, so that a traits file loaded, or a report asked
  for, while a GWAS of minutes runs does not wait the rest of the GWAS for
  a job of a second (`docs/architecture.md`, section 5).
- **The light worker holds no popnei.** CSV and TSV, and the inference of
  the types of the columns, are TypeScript of ours, and xlsx and zip are
  the files wasm, a crate of this repository, as the owner decided on 24
  September 2026 (`docs/architecture.md`, section 6). So it neither
  imports popnei nor compiles its wasm, and the lint keeps popnei out of
  it (`configs.md`).
- **Not a pool of calculation workers**, which would run two analyses at
  once on two cores. Each worker would hold its own intermediate results,
  a kinship of 10,000 individuals is 800 MB in each one that uses it, and
  its own memory of wasm, which never shrinks; two workers that both
  needed the pruned variants would each make them; and with popnei 0.1.0
  each would hold the whole variant file. A pool would win if the walking
  skeleton showed users waiting on several independent analyses whose
  intermediate results are small (`docs/architecture.md`, section 5).
- **Our own layer, not Comlink**, as `docs/technology.md` decided.

## The protocol module

`protocol.ts` holds the types of the jobs, of their results and of a run,
and nothing else: no type of the DOM and no value of popnei, only its
types, so that core can import them. `messages.ts` holds the messages
and the functions that validate them.

```ts
// src/worker/protocol.ts
export const PROTOCOL_VERSION = 1;

export type Job =
  | { analysis: "diversity"; fileId: string; filters: VariantFilter[]; pops: Pops }
  | { analysis: "pca"; fileId: string; filters: VariantFilter[]; numPrinComps: number };

/** The populations, as pairs in the order of the file. */
export type Pops = readonly (readonly [pop: string, individuals: readonly string[]])[];

// src/worker/messages.ts
export type ToWorker =
  | { kind: "files"; files: { fileId: string; file: File }[] }
  | { kind: "run"; id: number; key: string; job: Job };

// One type per worker: they differ in their `ready`.
export type FromRunner =        // the calculation worker
  | { kind: "ready"; protocol: number; popneiVersion: string }
  | Answer;
export type FromFilesRunner =   // the light worker, which holds no popnei
  | { kind: "ready"; protocol: number }
  | Answer;
type Answer =
  | { kind: "progress"; id: number; done: number; total: number }
  | { kind: "result"; id: number; key: string; result: JobResult }
  | { kind: "error"; id: number; message: string; fatal: boolean };
```

- **Every message is a discriminated union on `kind`**, and every job on
  `analysis`. A `switch` over it has no `default`, and
  `switch-exhaustiveness-check` fails the lint wherever a new kind is not
  handled yet, as a `match` does in Rust.
- **`VariantFilter` is declared in `protocol.ts`**, as the filters are
  given to the worker, and the `Project` of core takes its type from
  there, so that the page and the worker cannot describe a filter two
  ways. popnei has no such type: its filters are methods of `Variants`,
  which the runner calls in the order of the list.
- **The populations are pairs, not a record keyed by their names**, as
  `typescript.md` asks of every name from the user's files. popnei takes them as
  `Record<string, readonly string[]>`, `pops` of `PerVarDistribsOptions`,
  so the runner builds that record with `Object.fromEntries(pops)`, which
  makes a population named `__proto__` an ordinary key, and never with an
  assignment `record[name] = ...`.
- **`JobResult` is a union with the same tags as `Job`**, and a result
  holds typed arrays, `Float64Array`, `Uint32Array`, never arrays of
  numbers: a typed array crosses as one block of memory, and an array of a
  million numbers is a million values for the structured clone to walk.
- **Every request has an `id`**, an integer the client counts up from 1
  for the life of the page, and every answer carries it. It is what ties
  a progress or a result to its request, and what lets the client drop an
  answer to a request it no longer waits for. It is not the key: two
  requests with the same key can exist, one cancelled and one sent again.
- **The key travels with the request and comes back with the result**, so
  that the page puts the result in the cache under the key it was asked
  for, and not under the key of the current project, which may have
  changed while it ran (`docs/architecture.md`, section 5). On the wire a
  key is a `string`, and it enters the cache through `keyFromWire` of
  `keys.ts` (`SKILL.md`, "Keys").
- **`PROTOCOL_VERSION` is in the `ready` message**, and the client refuses
  a worker whose number is not its own. The page and the workers are built
  together, so a mismatch means a stale file from a cache after a deploy;
  refusing it with a message is better than a result read with the wrong
  shape. The number goes up with any change to a message.
- **`popneiVersion` is in the `ready` message too**, from popnei's
  `version()`, because the version of popnei is part of every key
  (`docs/architecture.md`, section 3), and the page learns it there, from
  the calculation worker. Its validator requires it, a string. The light
  worker's `ready` has no such field, since it holds no popnei, and each
  worker's messages have their own type and their own validator, so the
  client never has to ask which worker a version came from.

### Validation at the boundary

`MessageEvent.data` is typed `any` by the DOM, and it is read as `unknown`
on both sides, then narrowed by a validator of `messages.ts`,
`parseFromRunner(data: unknown): Result<FromRunner, ProtocolError>`,
`parseFromFilesRunner`, and `parseToWorker`, with the `Result` of `src/core/result.ts`.
`typescript.md`, beside this file, has the general rule of `unknown` at
the boundaries.

- **The validator is written by hand**, a function per kind that checks
  `kind`, the type of every field, `Number.isInteger(id)`, and
  `instanceof Float64Array` for each array of a result. It is short, it
  has no dependency, and each check is one line to read.
- **A message that does not validate is a defect of ours**, since both
  sides are our code. The client treats it as the worker failing: it logs
  the message, fails the request with `{ kind: "defect" }`, and restarts
  that worker. It is never passed on half read.
- The validator checks the shape, not the numbers. That a frequency is
  between 0 and 1 is popnei's to promise and the tests' to check.

## The client, the page's side

`client.ts` owns the two workers. Nothing else on the page calls
`postMessage`, and nothing but `start.ts` calls `new Worker`; the analyses
of `src/core/analyses/` go through the client's `run`. The client keeps
the `File` objects the user picked, in a map from file id to `File`, and
sends each worker the ones it needs (`docs/architecture.md`, section 6).

```ts
// in protocol.ts, so that core can name them
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
  | { kind: "popnei"; message: string }       // popnei refused the input
  | { kind: "files"; message: string }        // the files wasm refused a file
  | { kind: "workerFailed"; message: string } // a trap, an error event
  | { kind: "couldNotStart"; reason: string } // no `ready`, twice
  | { kind: "protocolMismatch" }              // a stale file after a deploy
  | { kind: "defect"; message: string };      // a message that did not validate

// in client.ts; its `run` is what core's `WorkerClient` asks for
export function createClient(make: {
  calculation: () => WorkerLike;
  light: () => WorkerLike;
}): Client;
// Client: run(key: string, job: Job, onProgress?: (p: Progress) => void): Run<JobResult>;
```

- **The client is given how to make its workers.** `WorkerLike` is the
  part of `Worker` the client uses: `postMessage`, `terminate`, and the
  handlers of `message`, `error` and `messageerror`. The entry of each
  page passes `makeRunnerWorker` and `makeFilesWorker` of `start.ts`
  (section "How Vite builds the workers"), and a test passes fakes. So the
  client runs under Vitest in node, where there is no `Worker`.
- **A job goes to the worker it belongs to**, by its tag, in one function
  of the client: a job that reads genotypes to the calculation worker,
  and reading the individuals file, an xlsx or a zip to the light one.

### The queue

- **The queues are in the client, one per worker, not in the workers.**
  Each worker is given one request at a time, and the next one when the
  answer to the previous one arrives. When a worker is ended, the client
  knows which request was running and which were waiting, and sends the
  waiting ones to the new worker; a queue inside the worker would die
  with it.
- **A request whose key has a result in the cache is not sent.** The
  analysis looks in the cache first; the client does not keep a second
  one.
- **A queued request whose key the current project no longer asks for
  is dropped**, when a command gives its analysis another key before it
  starts, with its `cancel()`, at no cost; its outcome is `cancelled`. An
  undo that asks for that key again sends it again, which costs its time
  and never its correctness. A request that is running is not dropped
  this way: ending it costs a restart, and its result may still be wanted
  after an undo (`docs/architecture.md`, section 5).

### Errors are values

- **`outcome` never rejects.** A calculation that fails is an outcome the
  screen shows, not an exception that a forgotten `catch` loses: the
  screen switches on `kind` and has to say something in each case.
- **An error of popnei keeps the message it has in Rust.** popnei throws a
  JavaScript `Error` with that message for a wrong input and for a file it
  cannot read, a wrong line of a VCF with its number among them. The
  runner sends `error.message` as it is, it reaches the screen as the
  `message` of `{ kind: "popnei" }`, and the screen shows it; a
  message of our own around it may say what was being done, "Reading
  panel.vcf.gz:", and never replaces it, because it is the one that says
  what is wrong with the file.
- **An error of the files wasm is handled the same way.** Every function
  the crate exports returns a `Result` whose error wasm-bindgen turns into
  a JavaScript `Error` with its message, "not an xlsx file", a sheet that
  calamine cannot read; `filesRunner.ts` catches it at the call and sends
  it as `{ kind: "files" }` with that message. A file that the reader of
  CSV and TSV refuses is not an error of the run: the reader returns a
  `Result`, and the job gives it back as its result, the table or the
  ways the file is wrong, which the module spec of the reader lists.
- **A trap of the wasm is fatal for the worker.** A panic of Rust in wasm
  is a `WebAssembly.RuntimeError`, and after one the memory of the wasm
  keeps what it held and an object that was borrowed stays borrowed
  (`js/popnei/README.md`). So the runner sends it with `fatal: true`, and
  the client fails the request, ends that worker and starts a new one, as
  for a cancel. What is left of an instance after a trap has not been
  measured by popnei, and a worker that is not trusted is not reused.
- **A worker that fails outside a request**, an `error` event on the
  `Worker`, a `messageerror` when a message cannot be deserialised, is
  treated as a trap: the running request fails and the worker restarts.
- **Restarting has a limit.** A worker that fails before it sends `ready`,
  twice in a row, is not started a third time: the wasm did not load, the
  network or the browser is the cause, and a loop of restarts would hide
  it. The client then fails every request with `{ kind: "couldNotStart" }`
  and the reason.

### Progress

- A request's `onProgress` is called with each `progress` message of its
  id, and with none of another's. The client passes `done` and `total` on
  and does not compute a fraction the worker did not give.
- Progress is for the screen only. It is never a condition of anything: a
  request that sent none is not stuck.

### Cancelling

A worker cannot read a message while wasm runs a calculation, and
without `SharedArrayBuffer`, which GitHub Pages cannot enable, the page
has no memory it shares with it to raise a flag in (`docs/technology.md`,
section 4). So:

1. `cancel()` of the running request calls `worker.terminate()`, which
   of its worker, which stops the thread wherever it is, inside wasm
   included.
2. The client detaches its handlers from the old worker before it ends
   it, so that a message the old worker had posted and the page had not
   read yet reaches nobody. The ids would drop it anyway; this makes it
   certain.
3. The request's outcome is `cancelled`.
4. A new worker is started. The client sends it the `files` message with
   the `File` objects the old one had, from its map, then waits for
   `ready`, then sends the first request of that worker's queue. The new
   calculation worker opens the variant file again (section "Reading the
   files of the user").

- **The page keeps the `File` objects.** A `File` is a handle to a file
  on the disk, and posting one sends the handle, not the bytes, so sending
  them again costs nothing. The worker cannot get them back by itself: a
  browser opens a file only when the user picks it.
- **What a restart costs** is the loading of the wasm, from the cache of
  the browser after the first time, and the intermediate results the
  worker held, which are made again when they are asked for; and, for the
  calculation worker, opening the variant file again. In the target design
  that reads its header, or the index at the end of a `.nei` file; with
  popnei 0.1.0 it reads the whole file into memory again before the next
  request starts, a time that grows with the file and has not been
  measured (`docs/architecture.md`, section 5). It is not hidden: a cancel
  is a choice of the user, and the next PCA after it may take longer.
- **Restarting is also how the memory of the wasm is given back.** That
  memory grows and never shrinks (`js/popnei/README.md`), and ending the
  worker is the only way to free it. So the client restarts the
  calculation worker when the load id of the variant file changes, a new
  pick, an undo or a redo of one, before the first request on the new
  load (`docs/architecture.md`, section 5): the worker then holds one
  open file, one `Variants`, and never the room of an old one. An undo to
  the previous load reopens its file, which costs time, with popnei 0.1.0
  the reading of the whole file, and no calculation whose result is still
  in the cache of the page. Whether it also restarts between two requests
  is open point 2 of `docs/architecture.md`, to be settled if the walking
  skeleton shows a tab running out of memory.

### Timeouts

- **No timeout on a calculation.** A GWAS of a large panel legitimately
  takes minutes, and a limit short enough to catch a hang would cut a real
  run. The user sees the progress and has the cancel button.
- **A timeout on starting**, `WORKER_READY_TIMEOUT_MS`, a named constant,
  from `new Worker` to `ready`. A wasm file that is not served, or a
  worker script that does not load, gives no message at all in some
  browsers, and the page would wait forever. Its value is set from what
  the walking skeleton measures on a slow connection; until then it is 30
  seconds, which nobody has measured.

## The runners, the workers' side

`runner.ts`, the calculation worker, answers the messages of
`messages.ts` and calls popnei. It holds the `File` objects it was sent,
the handles popnei gave for them and the intermediate caches.
`filesRunner.ts`, the light worker, answers the jobs that read no
genotype: it reads the individuals file, a CSV or TSV with the reader of
`src/worker/individuals/` and an xlsx with the files wasm, and writes the
xlsx and the zip of the report. It opens no variant file and loads no
popnei.

### Loading popnei, once

```ts
import { init, version } from "popnei";

const ready = init().then(() => {
  post({ kind: "ready", protocol: PROTOCOL_VERSION, popneiVersion: version() });
});
```

- **`init()` is called once, when the calculation worker starts**, and
  every handler awaits the same promise before it calls popnei. popnei's
  `init` already returns the same promise on a second call; calling it at
  the start means the wasm downloads while the user is still picking a
  file. The light worker posts its `ready` as soon as it starts.
- **`runner.ts` imports `popnei`, which resolves to `dist/web.js`** through
  the `exports` of popnei's `package.json`, and its loader fetches
  `popnei_bg.wasm` from `new URL("popnei_bg.wasm", import.meta.url)`.
  Vite copies that file into the build and rewrites the address; in a
  module worker `import.meta.url` is the address of the worker's own
  file, as it is on a page. That popnei's loader works so inside our
  worker is the first thing the walking skeleton checks: the README of
  popnei saw it work with Vite on a page, not in a worker.
- **A handle of popnei is freed.** `openVcf` and `openVars` give a
  `Variants` that holds memory of wasm the garbage collector does not see,
  so the runner calls `free()` in a `finally`, or keeps it under its file
  id and frees it when the file is replaced. `using` is not used: it needs
  `Symbol.dispose`, which Chrome has from 125, Firefox from 141 and
  Safari not at all.

### The files wasm, on first need

The second wasm module, xlsx and zip, is built from the crate
`crates/files/` of this repository into `crates/files/pkg/` by `npm run
build:files` (`configs.md`; `docs/architecture.md`, section 6). It is
loaded the first time a request needs it, so that a user of CSV files
never downloads it.

- **Both its JavaScript and its wasm are loaded on first need**, in the
  light worker only. The worker is built as a module worker (section "How
  Vite builds the workers"), whose bundle Vite splits, so `filesRunner.ts`
  imports what wasm-bindgen generated with a dynamic `await
  import("../../crates/files/pkg/files.js")`, which Vite makes a chunk of
  its own, and calls its default export, the `init` that `--target web`
  generates, which fetches the `.wasm` from `new URL("files_bg.wasm",
  import.meta.url)` as popnei's loader does.
  What weighs is the `.wasm`, about 0.5 MB gzipped; the JavaScript that
  wasm-bindgen generates is a few tens of KB, and it no longer rides in
  the worker's first file. A static `import` of it would put that
  JavaScript back into the first file.
- `filesRunner.ts` keeps one promise, `filesReady ??= loadFiles()`, where
  `loadFiles` does the import and the `init()`, and awaits it in the
  handlers that read an xlsx or write a report, as popnei's own `init`
  does. A CSV or TSV of the individuals, and the inference of the types of
  its columns, are read by the TypeScript of `src/worker/individuals/`
  and never load the files wasm (`docs/architecture.md`, section 6).

### The reader of the individuals file

`src/worker/individuals/` reads a CSV or TSV into the table of the
project and infers the types of its columns, as section 4 of
`docs/functionality.md` lists: the separator detected, `,`, `;` or a tab;
decimals with a comma; a BOM removed; an empty cell, `NA` and `-` as
missing. The inference takes the cells of a CSV, all text, or those of an
xlsx as the files wasm gives them, numbers, text, booleans or empty, so
both formats give the same types.

- **It is pure.** It takes text, or cells, and returns a `Result` of the
  table, with no DOM, no global of a worker, no popnei and no files wasm,
  which the lint and `tsconfig.core.json` check (`configs.md`). The type
  of the table is in `protocol.ts`, as `VariantFilter` is, so core and the
  reader name one type.
- **The runner decodes the bytes**, first with `new TextDecoder("utf-8",
  { fatal: true })`, and when that throws, with `new
  TextDecoder("windows-1252")`, which is what Excel on Windows writes for
  "CSV (comma delimited)" in Spanish and the other languages of Western
  Europe. The result says which encoding was used, so that the screen can
  give the file a notice that says how it was read. No file is refused
  for its encoding (`docs/architecture.md`, section 6; the recommendation
  awaiting the owner's approval with that revision).
- **It does not check the individuals against the variants.** Core does,
  in the `needs` of each analysis that uses the file, since the reader
  does not know the variants (`docs/architecture.md`, section 6).

### Reading the files of the user

- **The target is a source of bytes that popnei calls for each range.**
  The calculation worker gives popnei a source over the `File`, which
  popnei's reader calls for each range it needs, and which reads that
  range with `FileReaderSync.readAsArrayBuffer(file.slice(start, end))`, a
  call that exists only in workers and returns the bytes at once, which
  is what Rust's `Read` and `Seek` need. The VCF reader reads forward; the
  reader of a `.nei` file seeks, since arrow IPC keeps its index at the
  end of the file. Only a few blocks are in memory at a time, so the size
  of a file is limited by time and not by memory, and a restart reopens
  the file instead of reading it again. The owner decided on 24 September
  2026 that this is the design, and a priority request to popnei, because
  the variant files of the users tend to be huge
  (`docs/architecture.md`, section 6).
- **popnei 0.1.0 reads the whole file.** It opens a VCF or a vars file
  from a `Uint8Array` only. Until the source exists, the runner reads the
  whole file with
  `new Uint8Array(new FileReaderSync().readAsArrayBuffer(file))` and opens
  that. popnei copies those bytes into the memory of wasm once and shares
  them between passes, so a file costs its size twice while it is opened,
  and once after the runner lets go of its copy. Files above roughly 1.5
  to 2 GB fail there, with the message of popnei, a figure estimated from
  the 4 GB that wasm32 addresses and not measured in a browser; and a
  restart reads the whole file again (`docs/architecture.md`, section 6).
  This is the one place the runner changes when the source arrives.
- **The file is opened once per worker, not per request, and a worker
  opens one load only.** The runner keeps the one `Variants` of the load
  it was started for, and each request copies the filters onto a pass.
  Opening reads the header of a VCF or the index of a `.nei` file, and
  with popnei 0.1.0 the whole file, which would otherwise be read again
  for every analysis. A new load is a new worker (section "Cancelling"),
  so no worker holds two `Variants`. On opening, the runner sends the
  individuals and the ploidy at once; the number of variants comes with
  the pass statistics of the first pass (`docs/architecture.md`, section
  6).
- **The files written**, a filtered vars file in the calculation worker,
  an xlsx and the zip of the report in the light worker, are made as a
  `Uint8Array` and sent to the page, transferred, where they become a
  `Blob` and a download.

### Progress, from the source of bytes

A calculation of popnei is one synchronous call that runs its whole pass
inside wasm, and the worker's event loop does not turn until it returns.
`postMessage` does not need the event loop: it can be called from inside
that call, and the page, a different thread, receives the message at once.
So, in the target design, progress comes from the source of bytes itself
(section "Reading the files of the user"): it counts the bytes it has
read, against `file.size`, and posts them. No callback from popnei's loop
is needed (`docs/architecture.md`, section 5).

- **It is throttled in the source**, at most one message every 100 ms or
  so, a named constant. A message per range of a large file is thousands
  of messages, and each one is a task on the page.
- **`done` and `total` are bytes of the file**, read in the current pass
  and the size of the file, which is known before the pass starts, where
  the number of variants of a VCF is not. popnei has to say how many
  passes an analysis makes, the PCA makes two, or tell the source when a
  pass starts, so that the bar does not go from full to empty.
- **With popnei 0.1.0 there is no progress.** The runner posts none
  during a call, and the page shows that a run is running and for how
  long, not how far along it is. Blocks read with `iterBlocks` are in
  TypeScript and could post between blocks, but the analyses do not read
  blocks in TypeScript, and they should not start to for a bar.

### Sending results back: transfer or copy

`postMessage(message, transfer)` copies the message by the structured
clone, except the `ArrayBuffer`s in the list `transfer`, which move to the
other side without a copy and are left empty, detached, where they were.

- **A result is transferred when the worker does not keep it.** A
  `Float64Array` of popnei's result is the worker's own, so
  `postMessage(msg, [projections.buffer, ...])` moves it at no cost,
  whatever its size, and the worker must not touch it after.
- **A result the worker keeps in its cache is copied, not transferred.**
  Transferring it would leave the cache holding an empty array, which
  reads as length 0 and no error. The runner sends `array.slice()` of a
  kept array, or the structured clone copies it, and the rule is written
  where the cache is read.
- **Only an array that owns its whole buffer is transferred.** A typed
  array can be a view of part of a larger buffer, and transferring
  `view.buffer` moves the whole buffer, the parts other arrays read
  included. The helper that builds the transfer list checks
  `byteOffset === 0 && byteLength === buffer.byteLength` and copies with
  `slice()` otherwise.
- **A view into the memory of wasm is never posted.** popnei's rule is
  that such a view stops being valid when that memory grows, and its
  package copies every array of a result out for that reason
  (`docs/architecture.md` of popnei, section 11). There is a second reason
  here: the structured clone of a view copies the whole buffer under it,
  which for the memory of wasm is every byte the module holds, hundreds of
  MB; and that buffer cannot be transferred at all. An array from popnei's
  API is already a copy; an array the runner made from `memory.buffer` is
  a defect.
- **A `File` crosses by the structured clone**, as a handle, and an
  object of popnei, a `Variants`, a `Kinship`, does not cross at all: it is
  a pointer into the memory of wasm of the worker that made it. The page
  gets plain objects of typed arrays and strings, built in the runner.

### The intermediate caches

The calculation worker keeps what is costly to make and used by several analyses:
the variants kept by the LD pruning of the PCA, the kinship, the
principal components the GWAS takes as covariates (`docs/architecture.md`,
section 5).

- **Under keys, made as the page makes its keys**, a hash of everything
  the value was made from, including the version of popnei. The page sends
  the key of each intermediate a job needs inside the job; the runner does
  not compute keys, so the page and the worker cannot disagree on one.
- **Bounded by bytes**, `WORKER_CACHE_MAX_BYTES`, a named constant, with
  the value used longest ago dropped first. The size of a value is the sum
  of the `byteLength` of its typed arrays, which is exact for what is in
  the heap of JavaScript. What the memory of wasm holds, the file among
  it, is not counted, because it cannot be given back short of a restart,
  which is open point 2 of `docs/architecture.md`. The value of the bound
  is set from what the walking skeleton measures; until then it is a
  number with a comment that says nobody measured it.
- **A value in the cache is never handed out to be changed.** Whoever
  reads it treats its arrays as read only, and a copy is made before one
  is sent.
- **A dropped value is made again**, never an error. The cache is an
  optimisation, and a request must give the same result with it empty.

## How Vite builds the workers

The browsers are the floor the owner set for the applications on 24
September 2026, Chrome and Edge 111, Firefox 115, Safari 16.4
(`docs/technology.md`, section 6), above popnei's own floor for the
library, Chrome 91, Firefox 89, Safari 16.4, which the vector
instructions of wasm set (`js/popnei/README.md`, "Where it runs"). A
module worker, `new Worker(url, { type: "module" })`, which runs a script
with `import` in it, is there from Chrome 80, Firefox 114 and Safari 15,
and so is a dynamic `import()` inside a worker, in the same versions; all
are within the floor. So the workers of the built site are module
workers, as they already are in the development server.

- **The workers are imported with `?worker`**:

  ```ts
  // src/worker/start.ts, the whole file
  import RunnerWorker from "./runner.ts?worker";
  import FilesWorker from "./filesRunner.ts?worker";
  export const makeRunnerWorker = (): Worker => new RunnerWorker();
  export const makeFilesWorker = (): Worker => new FilesWorker();
  ```

  It is a file of its own so that the client, which the tests import, has
  no `?worker` in it; `start.ts` is checked with the page, whose types
  declare `?worker` (`configs.md`).

  With this import Vite builds each worker in the format of
  `worker.format`, and with `"es"` it creates it with `type: "module"`
  in the build as in the development server. The other form, `new
  Worker(new URL("./runner.ts", import.meta.url), { type: "module" })`,
  would work too now; `?worker` is kept because `start.ts` and the
  architecture name it and the tests need no change. This was read in
  the source of Vite 8.3.0, `dist/node/chunks/node.js`, the plugin
  `vite:worker`, which gives the worker the type `"module"` when the
  format is `"es"` and `"classic"` otherwise.
- **`worker.format` is `"es"`**, written in `vite.config.ts` because the
  default is `"iife"`, a classic script. Vite builds an `"iife"` bundle
  with no splitting, `codeSplitting: false` in the same source, so a
  dynamic `import()` in the light worker would be inlined into its one file;
  with `"es"` it is a chunk of its own, which is what lets the files wasm
  be loaded on first need, JavaScript and all (above).
- **`build.target` names the floor**, `["chrome111", "edge111",
  "firefox115", "safari16.4"]`, and it applies to the worker bundles as
  well: syntax newer than the floor would fail in a worker as in the
  page. `configs.md` owns `vite.config.ts`; these are the lines the
  workers need from it.

### The wasm files on GitHub Pages

- **GitHub Pages serves `.wasm` as `application/wasm`**, and
  `WebAssembly.instantiateStreaming`, which popnei's loader tries first,
  compiles the module while it downloads only with that type. With
  another, the loader warns in the console and falls back to downloading
  it whole and then compiling, slower and correct. After the first deploy
  check it once, `curl -sI <url of popnei_bg.wasm> | grep -i content-type`;
  the local preview, `vite preview`, serves the same type.
- **The site is a project site, under `/popnei_web/`**, not at the root of
  a domain, so `base` in `vite.config.ts` is `"/popnei_web/"`. Every
  address in the code is either relative, `new URL("x", import.meta.url)`,
  or built from `import.meta.env.BASE_URL`; an address that starts with
  `/` points at the root of `github.io` and gives a 404 there, and works
  in development, which is why it is easy to write.
- The wasm files are among what Vite builds, with a hash in their names,
  so a new release of popnei is a new file, and the cache of the browser
  never serves an old wasm under the new page.

## What popnei has to provide

What the design above assumes and the TypeScript package of popnei 0.1.0
does not have. Each one is asked of popnei, not built around here: a
workaround in a runner is the binding duplication that popnei's coding
skill warns against. Nothing is asked of popnei for the individuals file
nor for the identity of the variant file, which popnei_web reads and keeps
itself, as the owner decided on 24 September 2026
(`docs/architecture.md`, sections 3 and 6).

1. **A source of bytes over a JavaScript `File`**, read by ranges with
   `FileReaderSync`, in popnei's wasm binding, for `openVcf` and
   `openVars`, as section 11 of popnei's architecture describes. Today the
   source is a `Uint8Array` of the whole file. The binding crate does not
   depend on `js-sys` today, which a source that calls JavaScript from
   Rust needs. It is the priority, as the owner decided on 24 September
   2026 (`docs/architecture.md`, section 6).
2. **The number of passes an analysis makes, or a signal to the source
   when a pass starts**, so that the progress bar the source drives does
   not go from full to empty between the two passes of a PCA.
3. **A way to tell a trap from an error**, stated in popnei's docs:
   whether every refusal of the core is a plain `Error` and every trap a
   `WebAssembly.RuntimeError`, so that the runner's choice of `fatal` rests
   on a promise and not on what was seen.
4. **What `iterBlocks` gives is the caller's own memory**, which the
   README says for the arrays of a block; the runner relies on it to
   transfer them.
5. **The thinning of the points of the Manhattan and the QQ plots**, in
   Rust beside the GWAS, with the number of variants and the number kept
   (`charts.md`; `docs/technology.md`, open point 3).

## What is tested where

`.claude/skills/coding/testing.md` has the tools; for this code:

- **Under Vitest, in node**: the validators of `messages.ts`, with every
  kind and with the malformed messages, a missing `id`, an array of
  numbers where a `Float64Array` is expected, an unknown `kind`; the
  client, against fake workers, objects with `postMessage`, `terminate`
  and the handlers, which the test drives by hand, for the two queues, a
  job sent to the worker it belongs to, a cancel of a running and of a
  queued request, a queued request dropped when its key is no longer
  asked for, the `files` message sent again after a restart, a message of
  an old worker ignored, a trap, the restart limit and the timeout of
  `ready`, with fake timers; the handlers of the calculation runner as
  plain functions over bytes, since popnei loads under node from its
  `node` entry; and the reader of `src/worker/individuals/`, over the
  text of CSV and TSV files written as Excel writes them in English and
  in Spanish, `,` and `;`, decimal points and commas, a BOM, the three
  missing values, quoted fields, and over cells as the files wasm gives
  them, for the inference. That the result helper copies an array that
  does not own its buffer, and transfers one that does, is a test too.
- **With `cargo test`, natively**: the Rust of `crates/files/`, reading
  and writing an xlsx and zipping, over files kept in the crate. The
  functions that wasm-bindgen exports are stubs that panic when called
  natively, so they are thin wrappers over plain Rust functions, and the
  tests call those (`SKILL.md`, "The files crate").
- **Only in a browser, with Playwright**: the real workers, `FileReaderSync`,
  the fetch of the wasm by Vite's rewritten address inside a module
  worker, transfer, a cancel that ends a calculation in the middle, and
  the files wasm loaded on first need, seen in the network log as one
  request for its chunk of JavaScript and one for its `.wasm`, and none
  for either before; an xlsx read and a report written through it, which
  are the tests of the crate's exported functions; and, with a CSV, no
  request from the light worker for any wasm.
- **The floor is not tested by Playwright**, which runs recent browsers.
  What stands for it is `build.target`, for the syntax, and, for every
  API the workers use, its first version in MDN's compatibility data
  against the floor, which the `browser` category of the code review
  checks.

## Sources

- MDN, Using Web Workers:
  https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
- MDN, FileReaderSync:
  https://developer.mozilla.org/en-US/docs/Web/API/FileReaderSync
- MDN, The structured clone algorithm:
  https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
- MDN, Transferable objects:
  https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects
- MDN, Worker.terminate():
  https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate
- MDN's browser compatibility data, `@mdn/browser-compat-data` 8.1.2,
  read on 24 September 2026: `api.Worker.Worker.ecmascript_modules` and
  `javascript.operators.import.worker_support`, Chrome 80, Firefox 114,
  Safari 15; `javascript.statements.using`, Firefox 141 and not in
  Safari.
- Vite, Features, Web Workers and WebAssembly:
  https://vite.dev/guide/features
- Vite, Worker options, `worker.format` (default `"iife"`):
  https://vite.dev/config/worker-options
- Vite, Deploying a static site, GitHub Pages and `base`:
  https://vite.dev/guide/static-deploy
- The source of Vite 8.3.0, `dist/node/chunks/node.js`, the plugin
  `vite:worker` and the output options, for the type of the worker in
  the build and for `codeSplitting: false` of an `"iife"` bundle.
- wasm-bindgen guide, `--target web` and the loader:
  https://wasm-bindgen.github.io/wasm-bindgen/reference/deployment.html
- github/pages-gem issue 695, `.wasm` served as `application/wasm` on the
  live site: https://github.com/github/pages-gem/issues/695
- popnei, `js/popnei/README.md` and `docs/architecture.md` section 11.

## When this file is wrong

It was written before any code of the applications, from the docs and
from popnei 0.1.0. The walking skeleton checks, in this order: that
popnei's loader finds its wasm inside a module worker built by Vite;
that a `File` posted to a worker is read there; that a cancel ends a
calculation and the next request runs on the new worker; and the value
of `WORKER_READY_TIMEOUT_MS`. The first work package that reads an xlsx
checks that the files wasm is a chunk of its own, fetched on first need,
and that its loader finds its `.wasm` in the worker as popnei's does.
What they find is corrected here.
