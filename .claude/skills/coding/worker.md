# The worker and its messages

Every calculation of the applications runs in one web worker, a thread
of the page that cannot touch what the page shows, and the page talks to
it only through messages. `docs/architecture.md`, sections 1, 5 and 6,
has the design; this file has the rules for the code of `src/worker/`:

```
src/worker/protocol.ts   the jobs, their results, a run and its outcome:
                         the types core names too, with no type of the DOM
src/worker/messages.ts   the messages in both directions and their
                         validation, imported by the client and the runner
src/worker/client.ts     the page's side: the queue, progress, cancelling,
                         restarting, the files of the user
src/worker/start.ts      the one line that makes the worker, `?worker`
src/worker/runner.ts     the worker's side: popnei, the files wasm, the
                         files of the user, the intermediate caches
```

`protocol.ts` and `messages.ts` are apart because core imports the types
of the first and is checked with no DOM (`configs.md`), while a message
carries a `File`, a type of the DOM.

What the TypeScript package of popnei offers the worker is in
`js/popnei/README.md` of popnei and section 11 of its
`docs/architecture.md`. It was read for this file in September 2026, at
version 0.1.0, and the section "What popnei has to provide" lists what the
design here assumes and the package does not have yet.

## Why one worker, and our own messages

- **A calculation on the page would freeze it.** A PCA of a million
  variants takes seconds to minutes, and while the main thread computes,
  nothing on the page moves, not even the button to cancel.
- **One worker, not a pool.** The wasm of popnei has one thread, so a
  second calculation at once would need a second worker, and each worker
  holds its own copy of the wasm, of the bytes of the file in the memory
  of wasm, and of the caches. With files of a large part of the memory of
  the tab, two copies do not fit. A pool can be reconsidered once the
  `File` source of popnei streams and a file no longer sits in memory.
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

export type FromWorker =
  | { kind: "ready"; protocol: number; popneiVersion: string }
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
  a worker whose number is not its own. The page and the worker are built
  together, so a mismatch means a stale file from a cache after a deploy;
  refusing it with a message is better than a result read with the wrong
  shape. The number goes up with any change to a message.
- **`popneiVersion` is in the `ready` message too**, from popnei's
  `version()`, because the version of popnei is part of every key
  (`docs/architecture.md`, open point 4), and the page learns it there.

### Validation at the boundary

`MessageEvent.data` is typed `any` by the DOM, and it is read as `unknown`
on both sides, then narrowed by a validator of `messages.ts`,
`parseFromWorker(data: unknown): Result<FromWorker, ProtocolError>` and
`parseToWorker`, with the `Result` of `src/core/result.ts`.
`typescript.md`, beside this file, has the general rule of `unknown` at
the boundaries.

- **The validator is written by hand**, a function per kind that checks
  `kind`, the type of every field, `Number.isInteger(id)`, and
  `instanceof Float64Array` for each array of a result. It is short, it
  has no dependency, and each check is one line to read.
- **A message that does not validate is a defect of ours**, since both
  sides are our code. The client treats it as the worker failing: it logs
  the message, fails the request with `{ kind: "defect" }`, and restarts
  the worker. It is never passed on half read.
- The validator checks the shape, not the numbers. That a frequency is
  between 0 and 1 is popnei's to promise and the tests' to check.

## The client, the page's side

`client.ts` owns the worker. Nothing else on the page calls `postMessage`,
and nothing but `start.ts` calls `new Worker`; the analyses of
`src/core/analyses/` go through the client's `run`.

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
  | { kind: "workerFailed"; message: string } // a trap, an error event
  | { kind: "couldNotStart"; reason: string } // no `ready`, twice
  | { kind: "protocolMismatch" }              // a stale file after a deploy
  | { kind: "defect"; message: string };      // a message that did not validate

// in client.ts; its `run` is what core's `WorkerClient` asks for
export function createClient(makeWorker: () => WorkerLike): Client;
// Client: run(key: string, job: Job, onProgress?: (p: Progress) => void): Run<JobResult>;
```

- **The client is given how to make its worker.** `WorkerLike` is the part
  of `Worker` the client uses: `postMessage`, `terminate`, and the
  handlers of `message`, `error` and `messageerror`. The entry of each
  page passes `makeRunnerWorker` of `start.ts` (section "How Vite builds
  the worker"), and a test passes a fake. So the client runs under Vitest
  in node, where there is no `Worker`.

### The queue

- **The queue is in the client, not in the worker.** The worker is given
  one request at a time, and the next one when the answer to the previous
  one arrives. When the worker is ended, the client knows which request
  was running and which were waiting, and sends the waiting ones to the
  new worker; a queue inside the worker would die with it.
- **A request whose key has a result in the cache is not sent.** The
  analysis looks in the cache first; the client does not keep a second
  one.
- **A request still in the queue can be dropped**, with its `cancel()`,
  at no cost. Whether a queued request that the current project no longer
  asks for is dropped on its own is open point 5 of
  `docs/architecture.md`; until it is decided, the client offers `cancel`
  and does not guess.

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
- **A trap of the wasm is fatal for the worker.** A panic of Rust in wasm
  is a `WebAssembly.RuntimeError`, and after one the memory of the wasm
  keeps what it held and an object that was borrowed stays borrowed
  (`js/popnei/README.md`). So the runner sends it with `fatal: true`, and
  the client fails the request, ends the worker and starts a new one, as
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

The worker cannot read a message while wasm runs a calculation, and
without `SharedArrayBuffer`, which GitHub Pages cannot enable, the page
has no memory it shares with it to raise a flag in (`docs/technology.md`,
section 4). So:

1. `cancel()` of the running request calls `worker.terminate()`, which
   stops the thread wherever it is, inside wasm included.
2. The client detaches its handlers from the old worker before it ends
   it, so that a message the old worker had posted and the page had not
   read yet reaches nobody. The ids would drop it anyway; this makes it
   certain.
3. The request's outcome is `cancelled`.
4. A new worker is started. The client sends it the `files` message with
   every `File` the page holds, then waits for `ready`, then sends the
   first request of the queue.

- **The page keeps the `File` objects.** A `File` is a handle to a file
  on the disk, and posting one sends the handle, not the bytes, so sending
  them again costs nothing. The worker cannot get them back by itself: a
  browser opens a file only when the user picks it.
- **What a restart costs** is the loading of the wasm, from the cache of
  the browser after the first time, and the intermediate results the
  worker held, which are made again when they are asked for. It is not
  hidden: a cancel is a choice of the user, and the next PCA after it may
  take longer.
- **Restarting is also how the memory of the wasm is given back.** That
  memory grows and never shrinks (`js/popnei/README.md`), and ending the
  worker is the only way to free it. The client does not do it on its own
  in the first version; if the tab runs out of memory in the walking
  skeleton, a restart between requests is the first thing to try.

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

## The runner, the worker's side

`runner.ts` answers the messages of `messages.ts` and calls popnei. It
holds the `File` objects it was sent, the handles popnei gave for them and
the intermediate caches.

### Loading popnei, once

```ts
import { init, version } from "popnei";

const ready = init().then(() => {
  post({ kind: "ready", protocol: PROTOCOL_VERSION, popneiVersion: version() });
});
```

- **`init()` is called once, when the worker starts**, and every handler
  awaits the same promise before it calls popnei. popnei's `init` already
  returns the same promise on a second call; calling it at the start
  means the wasm downloads while the user is still picking a file.
- **The worker imports `popnei`, which resolves to `dist/web.js`** through
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

The second wasm module, xlsx and zip (`docs/technology.md`), is loaded the
first time a request needs it, so that a user of CSV files never downloads
it.

- **Both its JavaScript and its wasm are loaded on first need.** The
  worker is built as a module worker (section "How Vite builds the
  worker"), whose bundle Vite splits, so the runner imports the files
  package with a dynamic `await import("popnei-files")`, which Vite makes
  a chunk of its own, and calls its `init()`, which fetches the `.wasm`.
  What weighs is the `.wasm`, about 0.5 MB gzipped; the JavaScript that
  wasm-bindgen generates is a few tens of KB, and it no longer rides in
  the worker's first file. A static `import` of it would put that
  JavaScript back into the first file.
- The runner keeps one promise, `filesReady ??= loadFiles()`, where
  `loadFiles` does the import and the `init()`, and awaits it in the
  handlers that read an individuals file or write a report, as popnei's
  own `init` does.

### Reading the files of the user

- **The target is popnei's reader over `FileReaderSync`.** In a worker,
  `FileReaderSync.readAsArrayBuffer(file.slice(start, end))` returns the
  bytes of a range of the file when it has them, which is what Rust's
  `Read` and `Seek` need; so a file larger than the memory of the tab
  streams (`docs/architecture.md` of popnei, section 11). `FileReaderSync`
  exists only in workers. The runner hands popnei the `File`, and popnei
  reads it.
- **What exists today is a source of bytes.** popnei 0.1.0 opens a VCF or
  a vars file from a `Uint8Array` only. Until the `File` source exists,
  the runner reads the whole file with
  `new Uint8Array(new FileReaderSync().readAsArrayBuffer(file))` and opens
  that. popnei copies those bytes into the memory of wasm once and shares
  them between passes, so a file costs its size twice while it is opened,
  and once after the runner lets go of its copy. A file larger than about
  half the memory the tab can hold fails there, with the message of
  popnei. This is the one place the runner changes when the source
  arrives.
- **The file is opened once per worker, not per request.** The runner
  keeps the `Variants` of each file id, and each request copies the
  filters onto a pass. Opening reads the header of a VCF or the schema of
  a vars file, which would otherwise be read again for every analysis.
- **The files written**, a filtered vars file, an xlsx, the zip of the
  report, are made as a `Uint8Array` and sent to the page, transferred,
  where they become a `Blob` and a download.

### Progress from inside the loop

A calculation of popnei is one synchronous call that runs its whole pass
inside wasm, and the worker's event loop does not turn until it returns.
`postMessage` does not need the event loop: it can be called from inside
that call, and the page, a different thread, receives the message at once.
So progress comes from a callback that popnei calls from inside its loop,
and the runner's callback posts it.

- **It is throttled in the runner**, at most one message every 100 ms or
  so, a named constant. A callback per block of a large file is thousands
  of messages, and each one is a task on the page.
- **`done` and `total` are in the units popnei gives**, bytes of the file
  read for a pass over a file, with the pass named when an analysis makes
  two, as the PCA does. The bytes of a file are known before the pass
  starts, `file.size`, which the number of variants of a VCF is not.
- **This callback does not exist in popnei yet.** Today the runner can
  post one `progress` before the call and none during it, and the page
  shows a spinner and not a bar. Blocks read with `iterBlocks` are in
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

The worker keeps what is costly to make and used by several analyses:
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
  it, is not counted, because it cannot be given back short of a restart.
  The bound is open point 3 of `docs/architecture.md`; until it is
  measured it is a number with a comment that says nobody measured it.
- **A value in the cache is never handed out to be changed.** Whoever
  reads it treats its arrays as read only, and a copy is made before one
  is sent.
- **A dropped value is made again**, never an error. The cache is an
  optimisation, and a request must give the same result with it empty.

## How Vite builds the worker

The browsers are the floor the owner set for the applications on 24
September 2026, Chrome and Edge 111, Firefox 115, Safari 16.4
(`docs/technology.md`, section 6), above popnei's own floor for the
library, Chrome 91, Firefox 89, Safari 16.4, which the vector
instructions of wasm set (`js/popnei/README.md`, "Where it runs"). A
module worker, `new Worker(url, { type: "module" })`, which runs a script
with `import` in it, is there from Chrome 80, Firefox 114 and Safari 15,
and so is a dynamic `import()` inside a worker, in the same versions; all
are within the floor. So the worker of the built site is a module worker,
as it already is in the development server.

- **The worker is imported with `?worker`**:

  ```ts
  // src/worker/start.ts, the whole file
  import RunnerWorker from "./runner.ts?worker";
  export const makeRunnerWorker = (): Worker => new RunnerWorker();
  ```

  It is a file of its own so that the client, which the tests import, has
  no `?worker` in it; `start.ts` is checked with the page, whose types
  declare `?worker` (`configs.md`).

  With this import Vite builds the worker in the format of
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
  dynamic `import()` in the worker would be inlined into its one file;
  with `"es"` it is a chunk of its own, which is what lets the files wasm
  be loaded on first need, JavaScript and all (above).
- **`build.target` names the floor**, `["chrome111", "edge111",
  "firefox115", "safari16.4"]`, and it applies to the worker bundle as
  well: syntax newer than the floor would fail in the worker as in the
  page. `configs.md` owns `vite.config.ts`; these are the lines the worker
  needs from it.

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
workaround in the runner is the binding duplication that popnei's coding
skill warns against.

1. **A source over a `File`**, read with `FileReaderSync` by ranges,
   for `openVcf` and `openVars`, as section 11 of popnei's architecture
   describes. Today the source is a `Uint8Array` of the whole file.
2. **A progress callback** on every function that makes a pass, called
   from inside the loop in wasm with the bytes read and the total, and the
   number of the pass. The binding crate does not depend on `js-sys`
   today, which calling a JavaScript function from Rust needs.
3. **The fingerprint of a variant file**, the hash of its individuals and
   positions, computed in popnei so that Python gives the same one
   (`docs/functionality.md`, section 11; `docs/architecture.md`, open
   point 1).
4. **A way to tell a trap from an error**, stated in popnei's docs:
   whether every refusal of the core is a plain `Error` and every trap a
   `WebAssembly.RuntimeError`, so that the runner's choice of `fatal` rests
   on a promise and not on what was seen.
5. **The files wasm as a package**, built and released beside popnei's,
   with an `init` like popnei's (`docs/technology.md`, open point 2).
6. **What `iterBlocks` gives is the caller's own memory**, which the
   README says for the arrays of a block; the runner relies on it to
   transfer them.
7. **The thinning of the points of the Manhattan and the QQ plots**, in
   Rust beside the GWAS, with the number of variants and the number kept
   (`charts.md`; `docs/technology.md`, open point 3).

## What is tested where

`.claude/skills/coding/testing.md` has the tools; for this code:

- **Under Vitest, in node**: the validators of `messages.ts`, with every
  kind and with the malformed messages, a missing `id`, an array of
  numbers where a `Float64Array` is expected, an unknown `kind`; the
  client, against a fake worker, an object with `postMessage`,
  `terminate` and the handlers, which the test drives by hand, for the
  queue, a cancel of a running and of a queued request, the `files`
  message sent again after a restart, a message of an old worker ignored,
  a trap, the restart limit and the timeout of `ready`, with fake timers;
  and the handlers of the runner as plain functions over bytes, since
  popnei loads under node from its `node` entry. That the result helper
  copies an array that does not own its buffer, and transfers one that
  does, is a test too.
- **Only in a browser, with Playwright**: the real worker, `FileReaderSync`,
  the fetch of the wasm by Vite's rewritten address inside a module
  worker, transfer, a cancel that ends a calculation in the middle, and
  the files wasm loaded on first need, seen in the network log as one
  request for its chunk of JavaScript and one for its `.wasm`, and none
  for either before.
- **The floor is not tested by Playwright**, which runs recent browsers.
  What stands for it is `build.target`, for the syntax, and, for every
  API the worker uses, its first version in MDN's compatibility data
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
that the files package is a chunk of its own, fetched on first need;
that a `File` posted to the worker is read there; that a cancel ends a
calculation and the next request runs on the new worker; and the value of
`WORKER_READY_TIMEOUT_MS`. What it finds is corrected here.
