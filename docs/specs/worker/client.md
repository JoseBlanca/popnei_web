# The worker client

25 September 2026, approved by the owner on 25 September 2026, and built
with the walking skeleton; revised on 26 September 2026 for stage 3 of
`docs/build-order.md`, the Variants step whole, as the architecture
approved by the owner that day has it: the request that writes the
filtered variants as a `.nei` file, its cancel, and the restart of the
calculation worker after a large file written. The revision is approved by the owner on 26 September 2026. Revised again on 26 September
2026, after the review of the code of stage 3: a write that ends
`reopenFailed` does not start the worker again, as the table of the
failures already had it. Revised on 27 September 2026:
`WRITE_RESTART_BYTES` is 25 MB, set by the measurement of the write.
Revised on 27 September 2026 for stage 4: the calculation worker is
started again after a PCA or a PCoA of more than 700 individuals, as after a large
write, and it keeps no intermediate result in stage 4, both decided by the
owner on 27 September 2026 (open point 1 of `docs/specs/analyses/pca.md`
and "The pruned variants are not kept between two PCAs" in
`docs/specs/stage-4-open-points.md`); and again the same day, to
agree with the specs written beside it: the read of an xlsx, whose
request has no options of a CSV and whose answer no `found`, and the
test of the restart after a write at the bound of 25 MB; and when the
specs of stage 4 were made to agree, the restart after a large PCA
among the exceptions of "Not in this spec"; and on 28 September 2026
for popnei's release `js-v0.1.0-dev.3`, which `package.json` names from
the plan of stage 4: the memory of a PCoA, and the wasm of that release,
72 KB larger gzipped. The revisions for stage 4 are approved by the owner on 28 September 2026.
Revised on 30 September 2026 for stage 5: the calculation worker is
started again after every LD decay (`docs/specs/analyses/ldDecay.md`),
which is **Open 1** of that spec and a third exception to point 2 of
section 13 of `docs/architecture.md`, proposed there and not yet
approved by the owner; this spec is written with it meanwhile. The worker client is the page's one door to the two workers, the threads of the tab
beside the page where the files are read and the calculations run
(`docs/architecture.md`, section 1): it starts them, keeps the `File` of
every file the user picked, sends each worker one request at a time and
keeps the others waiting, and gives every request an answer, also when a
worker is cancelled, crashes, or cannot start. This spec gives
`src/worker/client.ts`, and `src/worker/start.ts`, the lines that make
the two workers. It develops sections 5
and 6 of `docs/architecture.md`, the rows `client.ts` and `start.ts` of
its section 9, and `.claude/skills/coding/worker.md`, "The client, the
page's side"; it depends on `docs/specs/worker/messages.md`, for the
messages and their checks, on `docs/specs/worker/protocol.md`, for a
`Run` and its outcome, and on `docs/specs/core/store.md`, which sends the
calculations through it and cancels them.

The words of this spec: a **load** is one pick of the variants file,
named by its load id, a random text the page makes at every pick, the
same file picked again included (`docs/architecture.md`, section 3); a
**request** is what the client sends a worker, and its **answer** the
message that ends it; a **read** is a request that reads a file of the
user, the opening of the variants file or the reading of the individuals
file; a **run** is a request of a calculation, made by the store under
the key of its result; a **write** is the request that writes the
variants the filters keep as a file, which the store makes under a key
of the load, the filters and the format, and whose answer is the file
and not a result of the cache (`docs/architecture.md`, section 5). The **entry** of the page is the code that runs
when the page opens: it makes the store and the client and joins them
(`docs/architecture.md`, section 1). The walking skeleton is stage 2 of
`docs/build-order.md`, the smallest application that goes through every
part once; the probe is the page of stage 0 that loaded popnei in a
worker on the deployed site. The entry, and `src/ui/runs.ts`,
which waits for the end of each run and hands it to the store, are
`docs/specs/entry.md`'s; this spec gives what they call.

## What it does

What a user would see go wrong because of the client: a file that stays
"Reading panel.nei." for ever, since a read that loses its answer is
never asked for again; a Cancel that leaves the calculation running, and
the next one waiting behind it; the memory of an old variants file still
held after a new one is loaded; a result of one file put under the key of
another; a page that waits for ever for a worker that did not load. Each
rule below rules out one of them.

### Two workers, started once, started again when needed

- **The calculation worker is started when the client is made**, so that
  popnei's wasm downloads while the user is still picking a file
  (`.claude/skills/coding/worker.md`, "Loading popnei, once"). The light
  worker is started when its first request comes; it holds no wasm in
  the walking skeleton.
- **A worker is ready when its `ready` arrives**, and it is sent nothing
  before; requests wait in its queue meanwhile. In stage 0, on an Apple
  M5 Pro over the owner's Wi-Fi, with nothing in the cache of the
  browser, popnei's `init()` in the probe's worker took 60 ms in Chromium
  153 and 80 ms in WebKit 26.6, medians of five loads, and at most 199 and
  235 ms (`docs/plans/site.report.md`); no slow connection was measured.
- **Each `ready` of the calculation worker gives its popnei version** to
  the function the entry gave the client, which records it in the store
  (`docs/specs/core/store.md`, `popneiReady`), before any answer of that
  worker is given to anyone; for a worker started again after a cancel or
  a crash, once it has read the file again (below). The store makes no key without the version,
  and every analysis is locked until a read of the variants file, which
  only a worker that was ready gives.
- **A `ready` of another version of the messages**, `otherProtocol`
  (`docs/specs/worker/messages.md`), is a worker of another build: every
  request of that worker, waiting or to come, fails with
  `protocolMismatch`, and the worker is not started again: a new worker
  would be made from the same script of the other build, and give the
  same `ready`.
- **The ready timeout.** From the moment a worker is made to its `ready`,
  the client waits at most `WORKER_READY_TIMEOUT_MS`, 30 seconds, the
  value `.claude/skills/coding/worker.md` gives until the walking skeleton
  measures a slow connection. A worker script that is not served, or a
  wasm that does not load, gives no message at all in some browsers, and
  the page would wait for ever. At 30 seconds, the 710.6 KB of popnei's
  wasm, gzipped, of the release `js-v0.1.0-dev.2` as Vite measures it
  (`docs/architecture.md`, section 11), have to arrive at about 190
  kbit/s or faster, with nothing left for compiling it; a user on a
  slower connection cannot start the calculations, and reloading the
  page does not mend it. The wasm of `js-v0.1.0-dev.3`, which stage 4 builds on, is
  larger: 2,389,518 bytes against 2,164,963, and 774,080 against 701,996
  gzipped by `gzip` at its default level, 72 KB more (28 September
  2026), so about 783 KB as Vite measures it, which the build of stage 4
  measures, and about 210 kbit/s within the 30 seconds.
- **A worker that fails twice with no answer between is given up** for
  the life of the page. A failure here is one before its `ready`: the
  timeout, a `crashed`, an `error` event, a `ready` that fails its check,
  or a `new Worker` that throws; or a crash of a worker that was ready and
  ran no request. After the first the client starts it once more; after
  the second, every request of that worker, waiting or to come, fails
  with `couldNotStart` and the reason of the last failure, as
  `.claude/skills/coding/worker.md` says. An answer to a request sets the
  count back to zero; a `ready` alone does not, so that a worker that
  crashes idle after every `ready` does not fetch its scripts again and
  again. A crash while a request runs fails that request and is not
  counted, so two large files that each run out of memory do not give up
  the worker. The words the user reads say to reload the page
  (`docs/specs/core/project.md`, **Open 4** there).

### The queue

- **One queue per worker, in the client, first come first sent**
  (`.claude/skills/coding/worker.md`, "The queue"). A worker is sent its
  next request when the answer to the previous one arrives, so a worker
  that is ended leaves its waiting requests in the client, and they go to
  the worker started in its place.
- **The requests of the calculation worker are the reads of the variants
  file, `openVariants`, the runs, `run`, and the writes, `write`; the
  light worker's is the read of the individuals file,
  `readIndividuals`.** Every `Job` goes to the calculation worker; the
  requests of the xlsx and of the report join the light worker in stages
  4 and 6, and the read of a BED file with popnei's release that filters
  by its regions.
- **A write waits in the queue as a run does**, and a run asked for
  while a file is written waits behind it (`docs/architecture.md`,
  section 5). Which of the two the store stops, and when, is the
  store's.
- **The client keeps no result and no file.** The store looks in its
  cache before it asks for a run (`docs/specs/core/store.md`), and the
  client sends every run and every write it is given; the `Blob` of a
  write is the store's and the page's once its outcome is given.

### The calculation worker holds one load

The worker is started for one load: it opens that variants file, and
opens it again itself when a run's filters differ from those it has put
on it, since popnei cannot take a filter off, while the first run after
the open puts its filters on the `Variants` it opened
(`docs/specs/worker/runner.md`, "The filters"). It holds the `File`, which
popnei reads by ranges at every pass, and no copy of the file: opening
the file again reads its first range of 4 MiB, and of a `.nei` file its
last ten bytes and its footer. So it holds the load it
opened, and one only (`.claude/skills/coding/worker.md`, "Reading the
files of the user"). The client keeps, for each load id,
the `File` the entry gave it and the format and the read options of the
last `openVariants` of that load, and the load of each request: an
`openVariants` names its load, and a `run` or a `write` names it in its
job, whose `fileId` every `Job` and `WriteJob` holds
(`docs/specs/worker/messages.md`). The load is the load id with its read
options, as it is for the store (`docs/specs/core/store.md`, "The
notice, and the calculations it stops"). Other read options are always a
new load, with a new load id: reading a VCF again with another ploidy is
a new load of the same `File`, as the owner decided on 25 September 2026
(point M of `docs/specs/stage-2-open-points.md`). So a job needs only the
load id and the client finds the read options by it, and an
`openVariants` of a load id it knows with other read options is a
defect, which the client throws.

To end a worker is always the same three steps: the client takes its
handlers off it, so that a message it had posted and the page had not
read yet reaches no one; calls `terminate()`, which stops the thread
wherever it is, inside wasm included; and starts a new worker at once.

A worker started again after a cancel or a crash is sent, as soon as it
is ready, the `open` of the load the old one held, when the old one had
opened it and the crash was not during that `open`, and unless the first
request of the queue is on another load, as `.claude/skills/coding/worker.md`
("Cancelling", step 4) and section 5 of the architecture have it, so that
the file is read again while the user decides what to run next. For such
a worker the client calls `onPopneiReady` when that `open` has ended, and
not at its `ready`: the store keeps a run `afterStop` until the worker
announces itself ready (`docs/specs/core/store.md`, "The notice, and the
calculations it stops"), and the wait that mark tells of is the reading
of the file, not the loading of the wasm. The version is already known
to the store by then, from the first `ready`. Every other worker, the
first one, one started for a new load, and one started again with no
`open` to send it, calls it at its `ready`: the first `ready` of the
page has to reach the store before any read is recorded, and after a
change of the load the store keeps its own mark until the new file is
read (`docs/specs/core/store.md`), which `popneiReady` does not clear.

- **Each worker receives at most one `open`, and it is its first
  request.** Before the first request on a load, a worker that holds no
  load is sent the `open` of that load, with its `File`. A worker whose
  read, the first `open` of its load, popnei refused, or failed, still
  holds that load, with no file open, and the memory of the read in its
  wasm: the next file the user loads starts a new worker. So a worker
  started again after a cancel or a crash is given its `File` again in
  that `open`, from the client's map, which is how the page gives the
  files back to a new worker (`docs/architecture.md`, section 5).
- **A request on another load than the worker holds ends that worker.**
  When a request on another load is given to the client, every request
  still waiting or running on the load the worker holds ends `cancelled`
  at once, the client ends the worker, and the request goes to the new
  one, after its `open`; it does not wait for the old file to finish
  opening. The
  memory of wasm grows and never shrinks, so only a new worker gives back
  the memory of the old file (`docs/architecture.md`, section 5). When the
  load changes, the store has already cancelled every run in flight
  (`docs/specs/core/store.md`), so what this cancels in practice is the
  read of a file picked and then replaced before it was open: two picks
  in a row do not wait for the first file to be opened.
- **An `openVariants` of the load the worker holds, or is opening, gets
  the answer of that `open`**, and sends nothing. The entry does not ask
  twice for the read of one load (`docs/architecture.md`, section 6, "Who
  asks for a read"), so this rule only keeps a second `open` from ever
  reaching a worker.
- **The light worker holds no load.** A read of the individuals file
  starts no worker again and is not cancelled by a change of the
  variants file.
- **An `open` that the client sent for a run is not a read.** After an
  undo or a redo back to a load already read, the store records nothing,
  and the entry asks for no read, since the source is read
  (`docs/specs/core/project.md`, "The records"); the first run on that
  load then waits for its `open`, which reads the first range of the
  file again. The store marks such a run `afterStop`, so that its panel says
  it may first wait for the file to be opened again
  (`docs/specs/core/store.md`). The `opened` of an `open` sent for a run
  goes to no one, also when every run that waited on it was cancelled;
  the worker then holds that load for the next request on it. When it
  fails, every run waiting on it fails with it: a `reopenFailed`, and a
  `refused` too, fail them as `reopenFailed`, with the name of the file
  and popnei's message, and a crash as any crash; a read of that load
  that waits on the same `open`, which the entry does not ask for but the
  client accepts, gets the same `reopenFailed`. The same file opened
  before, so a refusal of its open now is a file changed on the disk
  that the browser still reads, and its words are those of a file that
  changed, as the owner decided on 25 September 2026 (point B of
  `docs/specs/stage-2-open-points.md`). A worker whose `open` for a run
  failed holds no open file, so the client ends it then, and the next
  run on that load is not a defect: it goes to a new worker, after its
  `open`, which opens the file again, and fails in the same way while
  the file is as it is. What makes a run of a load a defect is a load whose
  first `open` ended failed, or was never asked for (the cases, below):
  then the source is failed, or was never read, and core sends no run
  on it. A load whose first read was cancelled is neither: a run on it
  is sent, after an `open` for the run.

### Cancelling

`cancel()` of a `Run` (`docs/specs/worker/protocol.md`), and of a read,
which the entry cancels when the project no longer holds its source
pending (`docs/specs/entry.md`):

- **of a request that waits** takes it out of the queue, at no cost. A
  run whose load is being opened for it waits too: it leaves the queue,
  and the `open` goes on, for the next request on that load.
- **of a read of the individuals file that runs** gives `cancelled` at
  once, and its answer, when it comes, goes to no one; the light worker
  is not ended, since the reader reads at most 20 MB
  (`docs/specs/worker/individuals.md`, `MAX_INDIVIDUALS_FILE_BYTES`).
- **of the run, the write, or the read of a variants file, that is
  running** ends its worker, unless other runs wait on that `open`, since a worker cannot
  read a message while wasm runs a calculation, and without
  `SharedArrayBuffer`, which GitHub Pages does not allow, the page has no
  other way to stop it (`docs/architecture.md`, section 5). The worker is
  ended as above, and the next request of the queue goes to the new one,
  after its `open`.
- **of a request that has ended**, or a second time, does nothing.

In every case where it does something, the outcome is `cancelled`. What a
restart costs is the loading of the wasm, from the cache of the browser
after the first time, and opening the variants file again before the
next request on it, which reads the first range of 4 MiB of the file,
and of a `.nei` file its last ten bytes and its footer, and not the rest
of its variants, since popnei reads the `File` by ranges
(`docs/specs/worker/runner.md`, "What a restart costs"): at most 49 ms
from the start of a new worker to the file opened, measured at the end
of the walking skeleton on a VCF of 80,692,954 bytes and its `.nei` file
of 19,161,178 bytes, in Chromium 153 and WebKit 26.6 on the owner's Mac
(`docs/plans/walking-skeleton.report.md`). A write cancelled leaves no
file: its bytes and its `Blob` were in the worker that was ended.

### A write, and the restart after a large one

`write` sends the request under its key with its `WriteJob`, and its
`Run` ends `done` with the key and the file, `Written<Blob>`
(`docs/specs/worker/protocol.md`), after its progress, as a run does:
the same queue, the same rule of the load, the same cancel, the same
failures. The client checks that the answer is a `written` under the key
of the request; which file the step shows, and a write that ends after a
change of its filters, which the store drops, are the store's
(`docs/specs/core/store.md`).

A write grows the memory of wasm by the size of its file, which never
shrinks, and would stay with the worker until the next load of the
variants file. So, as the owner decided on 26 September 2026
(`docs/architecture.md`, section 13, point 5), the client starts the
calculation worker again after a write whose file is larger than
`WRITE_RESTART_BYTES`, and after a write that popnei refused, whatever
its size: popnei refuses a file the memory of the tab does not take
(`docs/specs/worker/runner.md`, "The written file"), after the memory of
wasm has grown by the part of the file it built, and the client cannot
tell that refusal from one of a line of the VCF, which grows it less.
The steps are the same, with the outcome `failed` of kind `popnei` in
place of `done`:

1. It gives the write its outcome, `done` with the file, or the refusal,
   first, so that it reaches the store before anything else happens.
2. It ends the worker, in the three steps above, as if the write had
   been cancelled after its answer.
3. It starts a new worker, and, when that worker is ready, sends it the
   `open` of the load the old one held, unless the first request of the
   queue is on another load, as after a cancel; the requests that waited
   go to the new worker after that `open`, and `onPopneiReady` is called
   when it ends, as for any worker started again with an `open` to send
   (above, "The calculation worker holds one load").

A write that ends `reopenFailed` does not start the worker again,
whatever its size: it fails with `reopenFailed`, and the worker
goes on to the next request, as after a run that ends so (below,
"Crashes, defects, and every read answered"). The answer names the file
as the cause, a file the browser can no longer read, and not the memory
of the tab, so the client can tell it from a refusal of popnei, after
which it does start the worker again. What such a write had built before
the read failed stays in the memory of wasm until the worker is started
again for another reason.

A file of `WRITE_RESTART_BYTES` or less leaves the worker as it is, with
no cost to the next request. `WRITE_RESTART_BYTES` is a constant of
`client.ts`, 25 MB, 25,000,000 bytes, set by the measurement of 27
September 2026 (`docs/specs/analyses/writeVariants.md`, "What was
measured"): a write of the `.nei` file of 19,161,178 bytes, which does
not start the worker again, left the tab 88 MB larger in Chromium 153
and 80 MB in WebKit 26.6, about 4.5 times the file, so a file of 25 MB
leaves at most about 115 MB until the next load, and a larger one
restarts the worker. The value before the measurement was 100 MB, which
assumed that a write left the size of its file in the memory of wasm.
What a restart costs in stages 3 and 4 is the reading of the header of
the file, at most 49 ms (above): the worker keeps no intermediate result
before the kinship of stage 7, the variants the pruning of the PCA kept
among them (decided by the owner on 27 September 2026, "The pruned
variants are not kept between two PCAs" in
`docs/specs/stage-4-open-points.md`),
and the value of the bound is decided again then.

The file outlives the worker that made it: a `Blob` the page holds keeps
its bytes whatever becomes of the worker that made it, by the File API.
It has not been seen in a browser; the flow of the Variants step saves a
file after such a restart in the three engines (below, "How it is
verified").

### A large PCA, and the restart after it

A PCA holds in the memory of wasm the individuals × individuals matrix,
its eigenvectors and the workspace of the decomposition, about 6.1 × 8
bytes per pair of individuals, and a PCoA 44.4 bytes per pair at its
peak, measured by popnei, which counts it at the PCA's 48.8 in its
release `js-v0.1.0-dev.3`; that memory never shrinks. In node, with popnei's
release, the process grew by 69 MB for a PCA of 1,000 individuals, 196
MB for 2,000 and 662 MB for 4,000 (`docs/specs/analyses/pca.md`, "How it
runs"). In the browsers, run from the panel of the application on 29
September 2026, the engine grew by 613 MB for a PCA of 4,000 in Chromium
153 and 745 MB in WebKit 26.6, and by 3.03 and 3.12 GB for one of 9,381,
which took 205 s and 121 s (the same section). So the client starts the calculation worker again after a run of
the analysis `pca` whose individuals are more than
`PCA_RESTART_INDIVIDUALS`, 700: those of its job's list, or, when the
list is `null`, those the `opened` of its load gave. At 700 a PCA or a
PCoA holds about 24 MB by popnei's count, the size of
`WRITE_RESTART_BYTES`, the bound of a write, below which the worker is
left as it is: measured the same day, a PCA or a PCoA of 700 left the
engine 11 to 18 MB larger in Chromium and WebKit 3 s after its result,
and after one of 1,000
or more the worker was started again every time and the engine was, 3 s
later, no larger than before the Run, so the bound stays at 700. It does
so after an outcome `done`, and after a refusal
of popnei, which may come after the matrix was made, a pass with no
variant of variance among them; a refusal of more than 9,381
individuals, which popnei gives before it makes anything, of the file
for the PCA and of the pass for the PCoA, restarts it too, since the client does not tell refusals apart, and core's lock
keeps such a job from being sent. Not after `reopenFailed`, as for a
write. The steps are those of a write, above:
the outcome first, then the worker ended, then a new one, sent the
`open` of the load and the requests that waited.

It costs in stage 4 the reading of the header of the file, at most 49
ms, and nothing more: the worker keeps no intermediate result, and the
next analysis, whose filters are not the PCA's, would open the file again
anyway (`docs/specs/worker/runner.md`, "The steps"). This is a second
exception to the owner's decision of 26 September 2026 that the worker is
not started again between requests (`docs/architecture.md`, section 13,
points 2, 5 and 9), decided by the owner on 27 September 2026 (open
point 1 of `docs/specs/analyses/pca.md`).

### The LD decay, and the restart after it

From stage 5 the client starts the calculation worker again after every
run of the analysis `ldDecay`, whatever its size: after an outcome
`done`, and after a refusal of popnei, which may come after the counts
were made; not after `reopenFailed`, as for a write. The steps are those
of a write, above: the outcome first, then the worker ended, then a new
one, sent the `open` of the load and the requests that waited.

An LD decay leaves the memory of wasm larger by 16 bytes × its largest
distance × its populations, the counts popnei asks for before the pass,
plus the blocks of variants it held within that distance: in node with
`js-v0.1.0-dev.3` on 30 September 2026, 64 MB for 100 individuals, and
0.4 to 1.1 GB for 1,000 individuals and 20,000 variants
(`docs/specs/analyses/ldDecay.md`, "How it runs"), where the bound of a
write and of a PCA is about 25 MB. A bound on the individuals and the
distance, as for the PCA, would be passed by almost every file of a
few hundred individuals, so there is none. It costs the reading of the
header of the file, at most 49 ms (`docs/specs/worker/runner.md`, "What
a restart costs"), against a calculation of 0.6 s and more on 20,000
variants, and the worker keeps no intermediate result before stage 7.

This is a third exception to the owner's decision of 26 September 2026
that the worker is not started again between requests
(`docs/architecture.md`, section 13, points 2, 5 and 9), and it is
**Open 1** of `ldDecay.md`, which the owner decides; this spec is
written with the restart meanwhile. The plan of stage 5 measures, in
Chromium and WebKit, the growth of the engine 3 s after an LD decay with
the restart and without it, as stage 4 measured the PCA.

### Crashes, defects, and every read answered

Every request gets its answer or its outcome, exactly once, as the entry
needs of a read (`docs/architecture.md`, section 6, "Who asks for a
read") and the store of a run. What each failure does, after the worker
was ready:

| what happens | the request it was running | the worker |
|---|---|---|
| `refused` | fails with `popnei`, popnei's message | goes on to the next request |
| `reopenFailed` | fails with `reopenFailed`, the name of the file and popnei's message | goes on to the next request |
| `crashed` whose message starts "popnei_web defect: ", a defect of our code in the worker or popnei's refusal of an option it does not know (`docs/specs/worker/runner.md`, "What it answers when something goes wrong") | fails with `defect`, the message after that start; the client writes the whole message to the console of the browser | ended, and started again |
| any other `crashed`, or an `error` event of the worker | fails with `workerFailed`, its message | ended, and started again |
| `messageerror`, a message the browser could not copy | fails with `workerFailed` | ended, and started again |
| `badRequest` | fails with `defect`, its message | ended, and started again |
| a message that fails its check, an answer of another request's id or of the wrong kind for the request, a `result` to a `write` or a `written` to a `run` among them, a result or a file under another key than its request's, a result of another analysis than its job's | fails with `defect`; the client writes what was wrong to the console of the browser | ended, and started again |
| `postMessage` of the request throws, a `DataCloneError` of a job that holds what cannot be copied | fails with `defect`, the browser's message | ended, and started again |

The client's `onerror` of each worker calls `event.preventDefault()`.
By the HTML standard, an error inside a worker that its script does not
stop is passed on to the `Worker` object on the page and from there to
the window, where the error bar of the page would show as an error of
our page a crash that the client already handles as a crash of the
worker (`docs/specs/entry.md`, "The errors nothing else shows").

The client has no timeout on a calculation, so that every request is
answered rests on the runners too: each posts an answer or `crashed` for
whatever breaks, a promise rejected with nothing to handle it among the
causes, which fires no `error` event on the page
(`docs/specs/worker/messages.md`, "A worker that cannot go on").

The requests that were waiting stay in the queue and go to the new
worker, so a crash costs the one request that was running. A crash with
no request running, in a worker that was idle, only starts the worker
again. A crash during an `open` fails the read, or every run waiting on
it, as above.

The message of `workerFailed` is the one the worker gave, or the one of
the `error` event, or, when the event has none, as a module worker that
does not load gives in Chromium and WebKit (`docs/plans/site.report.md`),
the client's own words, "the worker stopped with no message". These are
details; what the user reads is chosen by the kind of the failure, for a
read of a file by `docs/specs/core/project.md` (**Open 4** there), and for
a calculation by the panel of its analysis
(`docs/specs/analyses/diversity.md`, "Its words"). A `crashed` of a
defect of ours is `defect` and not `workerFailed` so that the panel says
the application met an error of its own, and not that the calculation
stopped, whose words send the user to load the file again or, for a
principal components of 2,264 individuals or more, blame the memory of
the tab; the owner decided it on 29 September 2026 (stops A 9 and C 6
of `docs/specs/stage-4-open-points.md`). The light worker is left as
it was: its `crashed` is `workerFailed` whatever its message.

### Progress

`onProgress` of a run or a write is called with each `progress` of its
id, and of no other; the client passes the four fields of popnei's `Progress` on as
they came, `bytesRead`, `numBytes`, `pass` and `numPasses`
(`docs/specs/worker/messages.md`, "The progress"), and the store keeps
the last one on the run (`docs/specs/core/store.md`, `RunView`). It is
never a condition of anything: a run that sent none is not stuck, and a
run over a `.nei` file ends with its `result` before `bytesRead` reaches
`numBytes`. A `progress` of a request that is neither a `run` nor a
`write`, or of an id that is not running, is a message of the wrong kind
for the request, a defect, as the table above has it.

## The TypeScript interface

Every field is `readonly`, and every array `readonly T[]`, in the code.

The part of the browser's `Worker` the client uses. `start.ts` gives real
workers, and a test gives fakes, objects with these members that the test
drives by hand, so the client runs under Vitest in node, where there is no
`Worker`.

```ts
export type WorkerLike = Pick<
  Worker, "postMessage" | "terminate" | "onmessage" | "onerror" | "onmessageerror"
>;
```

The client is made once per page, by the entry, with a way to make each
worker and the function that is given the popnei version of every
`ready` of the calculation worker, its first and those after a restart.

```ts
export function createClient(config: {
  calculation: () => WorkerLike;
  light: () => WorkerLike;
  onPopneiReady: (popneiVersion: string) => void;
}): Client;

export const WORKER_READY_TIMEOUT_MS = 30_000;
```

```ts
export interface Client {
  /** Keeps the File of a load under its load id, for the life of the page,
      so that an undo of the load finds it; before the load goes into the
      project. The same id twice is a defect, thrown. */
  addFile(fileId: string, file: File): void;

  /** Opens the variants file of a load on the calculation worker. */
  openVariants(load: {
    fileId: string;
    format: "vcf" | "nei";
    readOptions: { ploidy: number; onlyPassed: boolean } | null;
  }): Read<VariantsOpened>;

  /** Reads the individuals file of a load on the light worker. */
  readIndividuals(fileId: string, csv: CsvOptions | null): Read<IndividualsAnswer>;  // null for an xlsx

  /** Sends a calculation, under its key; the store's `send`. */
  run(key: string, job: Job, onProgress: (p: Progress) => void): Run<JobResult>;

  /** Writes the variants the job's filters keep as a file, under its key;
      the store's `write.send`. */
  write(key: string, job: WriteJob, onProgress: (p: Progress) => void): Run<Written<Blob>>;
}

/** Above it, the calculation worker is started again after a write
    (A write, and the restart after a large one, above); 25 MB, set by
    the measurement of stage 3. */
export const WRITE_RESTART_BYTES = 25_000_000;

/** Above it, the calculation worker is started again after a run of the
    principal components (A large PCA, and the restart after it, above);
    the individuals whose matrix is about WRITE_RESTART_BYTES. */
export const PCA_RESTART_INDIVIDUALS = 700;

/** A read under way: its answer, and how to stop it (Cancelling, above). */
export interface Read<A> {
  outcome: Promise<A>;
  cancel(): void;
}
```

The answers of the two reads. They are types of the worker and not the
`SourceRead` and `IndividualsRead` of core, since `src/worker` imports
nothing of core but `result.ts` (`.claude/skills/coding/SKILL.md`, "The
layers"); the entry turns each into a record of the store, as below.

```ts
export type VariantsOpened =
  | { kind: "opened"; individuals: string[]; ploidy: number }
  | { kind: "failed"; error: Exclude<RunError, { kind: "files" }> }
  | { kind: "cancelled" };   // cancelled, or a request on another load came first

export type IndividualsAnswer =
  | { kind: "read"; table: IndividualsTable; columns: ColumnType[];
      found: CsvFound | null }                          // null for an xlsx
  | { kind: "refused"; error: IndividualsFileError }  // the reader refused the file
  | { kind: "failed"; error: Exclude<RunError, { kind: "popnei" | "files" }> }
  | { kind: "cancelled" };
```

`refused` is the reader's `IndividualsFileRead` of `failed`
(`docs/specs/worker/messages.md`). The outcome of a read never fails, as
the outcome of a run does not: a
failure is one of its values. The id of every request, reads, runs and
writes of both workers, is one count from 1 for the life of the page.

`src/worker/start.ts` is the file `.claude/skills/coding/worker.md` gives
whole, "How Vite builds the workers": `makeRunnerWorker` and
`makeFilesWorker`, each a `new` of the worker Vite builds from
`runnerWorker.ts?worker`, the worker's script that
`docs/specs/worker/runner.md` puts apart from `runner.ts`, and
`filesRunner.ts?worker`; `worker.md` still names `runner.ts?worker`, and
is corrected with that spec. The entry passes them to
`createClient`. The probe of stage 0 loaded popnei through the same
import in Chromium, Firefox and WebKit, served from GitHub Pages
(`docs/plans/site.report.md`).

### What the entry and runs.ts do with it

`docs/specs/entry.md` owns these, and this list says only what they call
here:

- **A pick of a file**: the entry's `addFile(file)` makes the load id and
  calls `addFile(fileId, file)` here, then the step sends the command
  that puts the load in the project. After every change of the project,
  the entry asks for the read of each source that is pending and has no
  read under way, `openVariants` or `readIndividuals`, keeps the `Read` it
  is given, cancels it when the project no longer holds that source
  pending, and records its outcome into the store, as the table of
  `docs/specs/entry.md`, "Who asks for a read", gives each answer of the
  two types above. A `cancelled` records nothing, and the entry asks
  again while the source is still pending.

- **The store** is given `send: (key, job, onProgress) => client.run(key,
  job, onProgress)` and, from stage 3, `write.send: (key, job,
  onProgress) => client.write(key, job, onProgress)`
  (`docs/specs/core/store.md`, `createStore`), and the client is given
  `onPopneiReady: (v) => store.popneiReady(v)`. The list of the
  individuals kept that a job carries is put in it by core: the store
  gives it to each analysis through the client bound to its key,
  `WorkerClient.individuals` (`docs/specs/core/store.md`), and puts it in
  the job of a write; the client of this spec sends each job as it is
  given, and knows nothing of the filters of individuals.
- **`src/ui/runs.ts`**, its `startAnalysis`, takes the `Run` that `store.startRun` returns,
  awaits its `outcome`, and gives it to `store.runEnded(run.id, outcome)`,
  and so for the handles of a write that `store.startWrite` returns.
  The client promises it: the outcome arrives once and never fails;
  `cancel()` can be called at any time, as often as the store likes; and
  nothing of the client calls back into the page during `run()` or
  `write()` itself.

## The cases

- **Two picks before the first file is open.** The `open` of the first
  load runs; the `openVariants` of the second ends it, `cancelled`,
  starts a new worker and opens the second. The entry records nothing for
  the first, whose source is no longer in the project.
- **A function of the page that cancels, or throws, while the client
  answers.** The store's `popneiReady` can cancel runs, when the version
  changed (`docs/specs/core/store.md`, "The cases"), and it and the
  store's function behind `onProgress` throw again the first error of a
  screen that listens to the store. The client calls `onPopneiReady` and
  `onProgress`, and resolves no promise, until its own state is up to
  date; it sends the next request after the call returns, so a cancel
  made inside it is seen, and in a `finally`, so a throw does not leave
  the queue stopped. The throw goes on, to the bar of the errors of the
  page (`docs/specs/entry.md`).
- **An undo to a load already read, then Run.** The worker holds the
  other load: it is ended, a new one opens the old load's file, from the
  `File` kept, and then runs the request (above).
- **The variants file changed on the disk since it was picked.** The
  browser refuses to read a `File` whose file changed since the pick, by
  the specification of the File API; this has not been seen in a browser
  (`docs/architecture.md`, section 11), and an engine that reads the
  changed file with no word is point R of
  `docs/specs/stage-2-open-points.md`. popnei reads the file at every
  pass, so it shows at the next pass, at the next change of the filters
  or at the `open` of a worker started again: the runner answers
  `reopenFailed` (`docs/specs/worker/runner.md`), a first `open` fails
  the read with it, which the entry records into the source
  (`docs/specs/entry.md`, "Who asks for a read"), a run fails with it,
  and an `open` for a run fails every run waiting on it with it (above).
- **A tab left open across a deploy of the site.** The names of the
  built files carry a hash of what they hold, and a deploy replaces them,
  so a worker started again after the deploy, after a Cancel or a crash,
  asks for a file that is no longer on the site and does not start. After
  two tries it is given up, `couldNotStart`, and the user reloads the
  page; nothing else is needed for this case.
- **A request of a load whose `File` the client does not hold**, which a
  project file could name, or a run of a load whose first `open` ended
  failed, or was never asked for: a defect of the page. A run of a load
  that was read, whose `open` for a run later failed, is not one (above,
  "An `open` that the client sent for a run is not a read"). The client
  answers it at once, `failed` with `defect`, so that no read stays under
  way. The two defects of the client's own calls, `addFile` of an id it
  holds and `openVariants` of a known id with other read options, are
  thrown, as `.claude/skills/coding/typescript.md` has a defect, and reach
  the bar of the errors of the page (`docs/specs/entry.md`); `docs/specs/core/projectFile.md` says
  what the project file writes so that it is not asked for.
- **A worker given up** answers every request at once, as above, and
  starts no worker; the other worker goes on.
- **A new load while a file is written.** The write is on the old load,
  so it ends `cancelled` with every request on that load, and the worker
  is ended (above); the store has stopped it already, as it stops every
  request at a change of the load (`docs/specs/core/store.md`).
- **A large write with runs waiting behind it.** The write ends `done`
  first; the worker is ended and started again; the runs go to the new
  worker after the `open` of the load. A run given to the client between
  the answer of the write and the new worker's `open` waits in the queue
  as any other.
- **A large write whose load is no longer the next one.** When the first
  request of the queue is on another load, the new worker is sent no
  `open` of the old one, as after a cancel, and the rule of the load
  takes over.
- **A write that ends while its `Run` was cancelled** is never seen: a
  cancel of a running write ends the worker, and the `written` it may
  have posted goes to no one, since the handlers were taken off first.

## How it runs

On the page. The client holds, for each worker, the worker, whether it is
starting, ready or given up, the count of its failures before `ready`,
the timer of its `ready`, the load it holds, the request it runs and its
queue; and the map of load ids to their `File`s and read options, which
grows by one entry per pick and is never emptied: each entry is the
handle of a file and a few fields, not its bytes. No copy of a variants
file is held anywhere: popnei reads the `File` by ranges in the
calculation worker, and the memory of its wasm holds a range and a block
of a pass (`docs/specs/worker/runner.md`, "The memory"). A written file
is held by the client only from the answer of its write to its outcome,
in the same turn; the `Blob` is the store's after that.

## How it is verified

With Vitest, in node, at `createClient` and the functions of `Client`,
with fake workers that record what they are sent and whether they were
ended, that the test makes answer by hand, and with the fake timers of
Vitest for the ready timeout. The runs and the reads are those of the
walking skeleton, a diversity `Job` and a CSV.

- **A worked sequence.** `createClient`: one calculation worker is made,
  no light one, and it is sent nothing. `addFile` of A, then
  `openVariants` of load A: still
  nothing sent. The worker posts `ready` with "0.1.0": `onPopneiReady`
  was called with "0.1.0", and the worker was sent the `open` of A with
  its `File`. `run` of key k1 on A: nothing sent. `opened` with 200
  individuals and ploidy 2: the read gives `opened` with them, and the
  worker was sent the `run` of k1. `run` of k2: nothing sent. `result`
  of k1: its outcome is `done` with k1, and the worker was sent k2.
  `cancel()` of k2: its outcome is `cancelled`, the first worker was
  ended after its handlers were taken off, and a second worker was made.
  It posts `ready`: it is sent the `open` of A, and `onPopneiReady` is not
  called yet. `run` of k3 on A: nothing sent. `opened`: `onPopneiReady`
  was called a second time, the `opened` goes to no one, and the worker
  was sent k3.
- **The load.** That worker holding A, `addFile` of B and `openVariants`
  of B: the worker is ended, a third is made and sent the `open` of B.
  With the `open` of B running, `openVariants` of C gives B `cancelled`
  at once, before the third worker answers. `openVariants` of B again
  with other read options: a defect is thrown. Of every sequence in the property below, no worker is sent
  a second `open`, nor a request of another load than its `open`'s.
- **Cancelling.** Of a run waiting: out of the queue, no worker ended. Of
  a run waiting for its `open`: out, and the `open` goes on. Of the read
  of a variants file running: the worker ended. Of a read of the
  individuals file running: `cancelled` at once, the light worker not
  ended, its answer then to no one. Of a request ended, and twice:
  nothing more. A `cancel()` made inside `onPopneiReady` is seen: the
  run it cancels is not sent.
- **The reopen that fails**: a worker started again after a cancel,
  whose `open` of A ends `refused`, fails the run waiting on it with
  `reopenFailed`, the name `panel.nei` and popnei's message, and that
  worker is ended; the same with an `open` that ends `reopenFailed`; a
  next `run` on A is not a defect: a new worker is made, sent the `open`
  of A, and then the run. A `run` that ends `reopenFailed` fails with it,
  and the worker is not ended.
- **A write.** The worker holding A, `write` of key w1 on A: the
  worker was sent the `write` with its key and its job. Two `progress`
  and a `written` under w1 with a `Blob` of 3,594 bytes: its
  `onProgress` was called twice, and its outcome is `done` with w1 and
  that `Blob`, the very object the fake posted; the worker was not ended.
  A `written` under another key, and a `result` to a `write`, fail it
  with `defect` and end the worker; a `written` to a `run` too. A
  `cancel()` of a write waiting takes it out of the queue; of a write
  running, ends the worker.
- **The restart after a large write**: a `written` with `numBytes`
  25,000,001, a byte above `WRITE_RESTART_BYTES`, and a run k5 waiting:
  the outcome of the write is `done` before the worker is ended, then a
  new worker is made and, once ready, sent the `open` of A, then k5;
  `onPopneiReady` is called when that `open` ends. A `written` of
  exactly `WRITE_RESTART_BYTES`, 25,000,000 bytes, ends no worker. A
  `refused` of a write, with a run waiting: the outcome is `failed` of
  kind `popnei` before the worker is ended, then the same restart. The
  `Blob`s are real ones, `new Blob([new
  Uint8Array(WRITE_RESTART_BYTES + 1)])`, 3 ms in node 26.8 on the
  owner's Mac on 27 September 2026, since the check of a
  `written` message takes the file with `instanceof Blob` and compares
  `numBytes` with its `size` (`docs/specs/worker/messages.md`), which a
  fake would fail.
- **The restart after a large PCA**: a `result` of a `pca` job of 701
  individuals, of its list, with a run k6 waiting: the outcome is `done`
  before the worker is ended, then a new worker, the `open` of A, then
  k6. A job of 700 ends no worker; a job with `individuals` `null` over a
  load whose `opened` gave 701 does; a `refused` of such a job restarts
  it too, and a `reopenFailed` does not.
- **The restart after an LD decay**, from stage 5: a `result` of an
  `ldDecay` job of 2 individuals, with a run k6 waiting: the outcome is
  `done` before the worker is ended, then a new worker, the `open` of A,
  then k6; a `refused` of such a job restarts it too, and a
  `reopenFailed` does not; a result of a diversity ends no worker.
- **Progress**: two `progress` of a run's id, then its `result`: its
  `onProgress` is called twice with the four fields as they came, and
  its outcome is `done`; a `progress` of an id that is not running is a
  defect, and the worker is ended.
- **A defect of the page**: `openVariants` and `run` of a load with no
  `File`, and `run` of a load whose first `open` was refused, give
  `failed` with `defect` at once. `onPopneiReady` that throws:
  the throw reaches the caller, and the next request is still sent.
- **Failures**, one test for each row of the table above, with what the
  running request gets, that the waiting ones reach the new worker, and
  that a message of the old worker, posted after it was ended, changes
  nothing.
- **Starting.** No `ready` in 30 seconds of the fake timers: a second
  worker is made; no `ready` again: every request fails with
  `couldNotStart`, a request after it too, at once, and no third worker
  is made, while the light worker still reads. An answer between the two
  failures sets the count back: a failure after it starts a worker again.
  A worker that crashes idle after each `ready`, twice: given up. A
  `ready` of protocol 3, another than `PROTOCOL_VERSION`, which is 4
  from stage 5: every request fails with `protocolMismatch`, and no
  other worker is made.
- **Properties, with fast-check**, which draws sequences of reads, runs,
  cancels, answers, crashes and timeouts in any order and shrinks a
  failure to the smallest: every request gets its answer or outcome
  exactly once; a worker is never sent a request before its `ready`, nor
  a second one before the answer to the first; a worker that was ended is
  sent nothing more; `onPopneiReady` comes before any answer of its
  worker is given to a caller; no worker is sent a second `open`, nor a request of another
  load than its `open`'s. The sequences draw writes as well as runs, and
  large writes among them.

What needs the browser is checked by the flow of the walking skeleton
with Playwright (`.claude/skills/coding/testing.md`): the real workers
built by Vite, a `File` read in the calculation worker, a Cancel that ends
a calculation in the middle and the next one run on the new worker, and
the time of a restart that reads the variants file again, written down as
a measurement of stage 2 (`docs/build-order.md`). From stage 3, the
flow of the Variants step, in Chromium, Firefox and WebKit: a file
written and then saved, whose bytes are those the runner's test gives,
and a file saved after the worker that made it was ended, by a Stop of
a calculation started after the write, which shows that a `Blob`
outlives its worker in each engine. That has not been seen yet; if an
engine loses the bytes, the restart after a large write would lose the
file there, and the page would have to hold the bytes itself before the
restart.

## Open points

None. The one this spec had, what a run says when its variants file
cannot be opened again, was decided by the owner on 25 September 2026: a
kind of its own, `reopenFailed`, as written above (point B of
`docs/specs/stage-2-open-points.md`). The restart after a large write
was decided by the owner on 26 September 2026 (`docs/architecture.md`,
section 13, point 5); its bound, `WRITE_RESTART_BYTES`, was set by the
measurement of 27 September 2026, above. The restart after a large PCA
was decided by the owner on 27 September 2026 (open point 1 of
`docs/specs/analyses/pca.md`). The restart after every LD decay is
**Open 1** of `docs/specs/analyses/ldDecay.md`, the owner's to decide;
the spec is written with it meanwhile.

## Not in this spec

- The messages and their checks: `docs/specs/worker/messages.md`.
- What the workers do with each request: `docs/specs/worker/runner.md`
  and `docs/specs/worker/individuals.md`.
- The entry of the page, `src/ui/runs.ts`, the bar of the errors no
  error boundary sees, and when a read is asked for:
  `docs/specs/entry.md`.
- Which calculations are cancelled and when: `docs/specs/core/store.md`.
- Restarting the calculation worker between two requests to give back
  the memory of wasm, other than after a large write, a large PCA and,
  from stage 5, every LD decay (above): not done, as the
  owner settled on 26 September 2026 from what the walking skeleton
  measured (`docs/architecture.md`, section 13, point 2).
- The intermediate results the calculation worker keeps: none before
  the kinship of stage 7. The xlsx read in the light worker:
  `docs/specs/worker/individuals.md`; the zip: stage 6.
- Which writes and runs are stopped when, a write dropped when it ends
  after a change of its filters, and the Save of the file:
  `docs/specs/core/store.md`, `docs/specs/analyses/writeVariants.md` and
  `docs/specs/entry.md`.
- The read of a BED file in the light worker: with popnei's release that
  filters by its regions.
