# The architecture: how a project flows through the applications

September 2026, first draft, revised on 24 September 2026 after its
architecture review, and approved by the owner on 24 September 2026;
revised again on 24 September 2026 for three decisions of the owner about
the inputs, and approved by the owner the same day. What was revised each time is at the end
of section 1. The document gives the parts of the web applications of
popnei, what each one holds, and how a change made by the user reaches the
results on the screen. What the applications
do is in `docs/functionality.md`, and what they are built with in
`docs/technology.md`. There is no code yet.

## 1. Where things run

The applications have three threads: the page, and two web workers,
threads of the tab that cannot touch what the page shows and that talk to
it only through messages.

```
 page (main thread)                         calculation worker
┌─────────────────────────────────────┐    ┌──────────────────────────────┐
│ ui      React screens and widgets;  │    │ the popnei wasm package      │
│   │     renders the report          │◀──▶│ the variant file, opened     │
│   ▼     reads state, sends commands │    │ what is costly to redo:      │
│ core    the project, the keys of    │    │   pruned variants, kinship   │
│         results, undo, the cache    │    └──────────────────────────────┘
│   ▼                                 │     light worker
│ charts  D3 and three.js             │    ┌──────────────────────────────┐
│                                     │◀──▶│ no popnei: our reader of CSV │
│ the File objects, by file id        │    │   and TSV, in TypeScript     │
└─────────────────────────────────────┘    │ the files wasm, on first need│
                                           │ the individuals file, xlsx,  │
                                           │   the zip of the report      │
                                           └──────────────────────────────┘
```

- **The page** holds the state of the project and everything the user
  sees. It never touches a genotype. It keeps the `File` objects the user
  picked, the handles the browser gives to a file on the disk, because a
  worker that is restarted cannot get them back by itself (section 5).
- **The calculation worker** does every calculation that reads the
  genotypes, through the wasm package of popnei, and is the only thread
  that opens the variant file. It keeps the intermediate results that are
  costly to make and are used by several analyses. A calculation of
  seconds or minutes there does not freeze the page.
- **The light worker** does the jobs that read no genotype: reading the
  individuals file, writing an xlsx, zipping the report. It holds no
  popnei. It reads a CSV or a TSV with a reader of ours in TypeScript, and
  an xlsx, or writes one and the zip, with the files wasm, a second wasm
  module built from a small Rust crate of this repository, which it loads
  the first time it needs it (section 6, `docs/technology.md`). It exists
  so that these jobs of a second do not wait behind a GWAS of minutes
  (section 5).

What was revised. The first draft of this document, earlier on 24
September 2026, had one worker, and described reading the variant file by
ranges and progress from inside a calculation as if popnei had them;
popnei 0.1.0 opens a file only from its whole bytes and reports no
progress. The architecture review of the same day found that and eight
more gaps, and this revision fixes them. The owner decided the same day
that reading by ranges is the target design, and a priority request to
popnei, because the variant files of the users tend to be huge and a tab's
memory is limited; the whole-file reading of 0.1.0 is described as the
temporary state the walking skeleton starts on, with its limits (section
6). The key of every result now holds the identity of the file, its name,
size, date of last change and a hash of its individuals and positions, and
its read options, and section 3 lists every input of a key; the revision
below replaced that identity with the id of the load. The report is built
as data in core and rendered on the page, where the plots can be drawn
(section 8). The check numbers of an opened project file are now data of
the project (section 2). CSV and TSV, and the inference of the types of
the columns, move out of the files wasm into popnei's own, so that a user
with a CSV never downloads the files wasm (section 6); the revision below
moved them into popnei_web. Queued requests that the project no longer
asks for are dropped, and a second, light worker takes the jobs that need
no genotypes (section 5). Sections 11 and 12, the limits and costs of the
web and what is hard to undo, are new.

What was revised again. On 24 September 2026, after that approval, the
owner took three decisions about the inputs, and this revision takes them
in; the owner approved it the same day.

- **The variant file has no fingerprint.** Each time the user loads a
  variant file, the same one again included, it gets a new id, and that
  id with the read options is the file's part of every key, in place of
  its name, size, date of last change and hash (section 3). The name,
  size, individuals, ploidy and, once a pass has counted it, number of
  variants stay in the project, only to warn when a reopened project is
  given another file (section 8). The individuals file gets a load id in
  the same way, so that a late read of an earlier pick is never recorded
  (section 6).
- **The individuals file is read by popnei_web.** CSV and TSV, and the
  inference of the types of the columns, are TypeScript of ours in the
  light worker, which no longer loads popnei; the Python script reads the
  file with pandas (sections 6 and 8).
- **The files wasm is a crate of this repository**, `crates/files/`, built
  by the site's own build, and not a module released by popnei (section
  6).

With them, after the architecture review of this revision: the
calculation worker is restarted whenever the load of the variant file
changes, so that it holds one open file and gives back the memory of the
old one (section 5); the analyses unlock once the file is open, with no
pass over it first (section 6); and a CSV is read with an encoding, a
separator and a decimal mark that are detected, UTF-8 or else
Windows-1252 among them, shown to the user and changeable, as the owner
decided on 24 September 2026 (section 6).

What was revised for the specs of stage 1, on 24 September 2026, not yet
approved by the owner: the reference of an opened project keeps a
fingerprint of the settings of each analysis in place of a key, as the
owner decided (sections 2 and 8); the definition of an analysis gains
`parseOptions`, and its `run` is given a client bound to its key by the
store, which looks in the cache (section 4); a read of the individuals
file says what "auto" found (section 2); and section 12 no longer counts
the canonical form of the keys as hard to undo, since no key is saved.

What each replaced, and why, is at the end of sections 3 and 6. popnei is
no longer asked for a fingerprint nor for a reader of these files, so the
walking skeleton needs nothing from popnei beyond 0.1.0 (section 10).

## 2. The project

The project is everything the user has set, and nothing that was
calculated, with two exceptions that are information read from the inputs
and not results: the identity of the variant file, which serves only to
compare the file of a reopened project (section 8), and what a project
file that was opened says of the results it had, their check numbers
with a fingerprint of the settings they were made with. It is one plain, immutable value, and
every change the user makes is a command that gives a new one.

```ts
interface Project {
  app: "popgen" | "gwas";
  variants: VariantSource | null;     // the load of the file and its identity
  filters: VariantFilter[];           // in their order, with parameters
  individualFilters: IndividualFilter[];
  individuals: IndividualsSource | null; // the metadata or traits file
  // popgen: the column that defines the populations, and later the
  //         edits made with the lasso; gwas: the roles of the columns
  grouping: Grouping;
  analyses: Record<AnalysisId, AnalysisOptions>; // the options of each
  reference: Reference | null;        // from an opened project file (section 8)
}

interface VariantSource {
  fileId: string;                     // the id of this load, new at every pick;
                                      // the File, in the page's map (section 6)
  name: string;                       // as File gives them; never in a key
  size: number;
  format: "vcf" | "nei";
  readOptions: { ploidy: number; onlyPassed: boolean } | null; // a VCF's; null for .nei
  read: SourceRead;                   // what the worker read from the file
}

type SourceRead =
  | { kind: "pending" }               // the worker is opening the file
  | { kind: "read"; individuals: string[]; ploidy: number;
      numVars: number | null }        // null until a pass has counted them
  | { kind: "failed"; message: string }; // popnei's message

interface IndividualsSource {
  fileId: string;                     // the id of this load, new at every pick
  name: string;
  csv: CsvOptions | null;             // how a CSV or TSV is read; null for xlsx
  read:
    | { kind: "pending" }             // the light worker is reading it
    | { kind: "read"; table: IndividualsTable; columns: ColumnType[];
        found: CsvFound | null }      // what "auto" found; null for xlsx
    | { kind: "failed"; error: IndividualsFileError };
}

// How a CSV or TSV is read. Each is "auto" until the user sets it; the
// read reports what "auto" found, which the screen shows.
interface CsvOptions {
  encoding: "auto" | "utf-8" | "windows-1252";
  separator: "auto" | "," | ";" | "\t";
  decimal: "auto" | "." | ",";
}

// The type of each column, inferred and then as the user set it. A
// binary column holds its two values and which of them is coded 1,
// { kind: "binary"; one: "case"; zero: "control" }, which the GWAS and
// the Python script use (section 8).
type ColumnType =
  | { kind: "identifier" }
  | { kind: "binary"; one: string | number; zero: string | number }
  | { kind: "continuous" }
  | { kind: "categorical" };

interface Reference {
  variants: VariantSource;            // the file the project was made with;
                                      // its fileId names no File
  popneiVersion: string;              // from the header of the project file
  checks: {
    analysis: AnalysisId;
    numbers: (number | null)[];       // saved in the project file
    settings: string;                 // never saved: the fingerprint of the
  }[];                                // analysis's settings in the file,
}                                     // made when it is opened (section 8)
```

- **Immutable**, so that undo is keeping the previous values, and so
  that the screens know what changed by comparing references.
- **Plain data**, which is what the project file is: saving it is
  writing it as JSON, and opening a project file is validating that JSON
  into a `Project` (section 8).
- **The individuals table is in the project, whole.** It is small, and
  the populations edited in the application exist in no file of the user.
- **The project holds the id of the load of the variant file and its
  identity, never the `File`.** A `File` is not JSON, and core, which has
  no DOM, cannot name its type. The page keeps the `File` objects in a map
  from file id to `File` (section 6). The identity, the name, the size,
  the individuals, the ploidy and the number of variants once it is
  known, goes into no key: it is saved in the project file so that a
  reopened project can say which file it was made with (section 8).
- **The read options of a VCF**, the ploidy and whether only the variants
  that passed its filters are kept, are the two options popnei's `openVcf`
  takes. They change which genotypes every analysis reads, so they are in
  the source and in every key. A `.nei` file has none: its ploidy is in
  the file. popnei reads a ploidy of 1 to 255, and its kinship and PCA one
  of at most 254; the default is 2.

## 3. Results, and how they go stale

A result is never stored in the project. It is stored in a cache, under
a key that is a hash of everything it was calculated from. The inputs of
every key are:

- the load of the variant file: its file id, which the page gives each
  load and which is new every time the user picks a file, the same file
  picked again included, and its read options (section 2). Nothing else
  of the file goes in: not its name, size or date of last change, and no
  hash of what it holds;
- the filters of variants and the filters of individuals that come before
  the analysis, in their order, with their parameters;
- the parts of the individuals table and of the grouping that the analysis
  uses;
- its own options;
- the key version of the analysis, a number in its module that is raised
  when what its result means changes for the same inputs, a new default of
  popnei or a bug fixed in how it is called;
- the version of popnei, which the calculation worker reports when it
  starts, because
  a result calculated by another version is not the same result.

Two requests with the same inputs have the same key.

**The file's part of the key is the load, not the file.** Picking a file
again gives it a new id, so every analysis is calculated again for it.
That costs the time of the calculations after each pick, and never shows
the result of one file for another: it covers a file changed on the disk
since it was last picked, a copy with the same name, size and date, and
the cases nobody foresaw, because nothing about the file has to be
compared to decide that two loads are the same. Undo of a load brings back
the previous project, with the previous load's id, whose results are
still in the cache unless its bound has dropped them.

The page makes the id when the user picks the file: 16 random bytes from
`crypto.getRandomValues`, written as hex, so that an id is not given
twice, in this session or in another. A counter of the session would
start again at 1 each time, and the id of an earlier session, kept in the
`reference` of a project file that is opened (section 8), could then name
a load of this one. A reference can still hold an id of this session,
when a project is saved and opened again in the same session; that does
no harm, since the reference is in no key and its id names no `File` the
current project uses. `crypto.getRandomValues` is in every browser of the
floor and, unlike `crypto.randomUUID()`, also on a page not served over
HTTPS, as the development server is when a phone opens it by its address
on the local network. Core stays pure: the id is made on the page and
handed to the command that puts the source in the project. The
individuals file gets its id in the same way (section 6).

What the screen shows for an analysis is the result stored under the key
that the current project gives it. So:

- **A change that a result depends on removes it from the screen**,
  because the current project gives it another key, under which there is
  nothing yet. Nothing has to find the results that a change affects and
  delete them: they are no longer asked for.
- **A change that a result does not depend on leaves it**, because its
  key does not change. Changing the column of the populations changes the
  key of the diversity and not that of the PCA, which uses the
  populations only for its colours.
- **Undo brings the results back**, because the previous project gives
  the previous keys, and the results are still in the cache.
- **Setting a value back to what it was** brings them back in the same
  way, with no calculation.

The dependencies are written down once, in the definition of each
analysis (section 4): which parts of the project go into its key. The
key itself is made in one place, `src/core/keys.ts`, from a canonical
form of those parts that gives the same text for equal values, whatever
order their fields were set in (`.claude/skills/coding/SKILL.md`,
"Keys").

The cache keeps results up to a bound in bytes, the sum of the
`byteLength` of the typed arrays of each result, which is how popnei gives
every array of a result; the strings and numbers beside them are small
and not counted. It drops the result used longest ago first, and one that
was dropped is calculated again when it is asked for. The value of the
bound is a named constant, set from what the walking skeleton measures.

The notice that says "3 results removed because the MAF filter changed ·
Undo" is made by comparing the results that were on screen before a
command with those after it.

Considered and not taken: **a graph of dependencies between the results**,
in which each result records the results and the parts of the project it
was made from, and a change walks the graph to mark stale what depends on
it. It would say which results a change made stale without computing any
key, and it would let a result be kept while an input it does not use
changes. It was not taken because a missing edge in the graph shows a
stale result as current, and the graph has to be kept right by every
command, where a key is made from the project as it is and needs nothing
kept; and because undo would have to restore the marks of the graph,
where with keys the previous project gives the previous results by
itself.

What was revised. The version approved on 24 September 2026 made the
file's part of the key its identity: the name, the size and the date of
last change that the browser's `File` gives, and a fingerprint, a hash of
the individuals and of the chromosome and position of every variant, which
popnei was to compute so that Python would give the same one. The owner
replaced it with the id of the load on the same day. The fingerprint
alone would have given one key to two files with the same individuals and
positions and other genotypes, a panel called again with another caller,
which is why the name, the size and the date went in beside it; and even
with them, a file rewritten with the same size by a tool that keeps the
date of the original, as `cp -p` and `rsync -t` do, would have shared a
key with it. It also needed a function of popnei, and a pass over the
file before any analysis could run, since no key could be made without it.
What the load id gives up is the one case the fingerprint served: picking
again the file that is already loaded, or giving a reopened project the
same file, calculates every analysis again where the fingerprint would
have found its results in the cache. Considered and not taken as well:
**a hash of the whole file**, which would catch any change of its bytes;
it reads every byte of a file of gigabytes in the tab before anything
runs, a time that has not been measured and that grows with the file.
Another option would win if users often picked the same large file again
in a session and waited for calculations of minutes each time, or if
results were kept across sessions, in a cache that outlives the tab,
where the id of a load of an earlier session names nothing.

## 4. An analysis is a module

Each analysis is one module, with the same shape, in both applications:

```ts
interface AnalysisDef<Opts, Result> {
  id: AnalysisId;                        // "pca", "diversity", "fst", "gwas"...
  app: ("popgen" | "gwas")[];
  defaults: Opts;
  keyVersion: number;                    // raised when the meaning of its result changes
  parseOptions(o: unknown): Result<Opts, string>; // its options read from a project file
  keyInputs(p: Project): unknown;        // the parts of the project it depends on,
                                         // beyond the load and the filters (section 3)
  needs(p: Project): string | null;      // why it cannot run yet, or null
  run(p: Project, c: WorkerClient): Run<Result>; // the request to the worker
  warnings(r: Result, p: Project): Warning[]; // raised by the data only
  checkNumbers(r: Result): number[];     // kept in the project file (section 8)
  script(p: Project): string;            // its lines of the Python script
}
```

and its panel of options and its results in `src/ui`. `WorkerClient` is
an interface that core declares and the client of `src/worker` fulfils,
since core has no DOM and cannot name the browser's `Worker`. The store
gives `run` a client bound to the key of the request, and looks in the
cache before it calls `run`, so that an analysis neither makes a key nor
reads the cache (`docs/specs/core/store.md`). `parseOptions` was added
with that spec, on 24 September 2026, because the options of an analysis
are its module's to check when a project file is opened. Adding an
analysis is adding its module and its panel; nothing else changes. This is the
piece the work is split into, and what lets an analysis be tried, changed
or dropped without touching the others.

`needs` is what locks an analysis with its reason: "reading the file"
while the variant file or the individuals file is being read (section 6),
"the individuals file lacks 12 individuals of the variants", a trait not
chosen.

An application is a list of steps and a list of analyses. The two
applications share the steps of the variants and the analysis of the PCA.

## 5. The workers and their messages

The page and each worker talk through typed messages
(`docs/technology.md`). The page's side of both is one client,
`src/worker/client.ts`, which keeps a queue for each worker.

- **A request** names the job, the key and the inputs. Each worker runs
  one request at a time, because the wasm of popnei and the files wasm
  have one thread each, and the client keeps the others in the queue of
  that worker.
- **A queued request that the current project no longer asks for is
  dropped**, when a command gives its analysis another key before it
  starts. An undo can ask for that key again, and it is then run again,
  which costs its time and never its correctness. A request that is
  running is not dropped this way: ending it costs a restart (below), and
  its result may still be wanted after an undo. `src/ui/runs.ts`, which
  holds the handle of every run, does it: after each command it cancels
  the queued runs whose key the new project no longer gives, with the
  `cancel()` of their `Run`, which for a request still in the queue takes
  it out and ends no worker.
- **The result** comes back as typed arrays, with its key, and goes into
  the cache. It is shown only if the current project still gives that
  key; if the user changed something meanwhile, it waits in the cache for
  an undo.
- **Progress**, in the target design, is the bytes of the variant file
  that the current pass has read, against the size of the file, reported
  by the source that reads the file for popnei (section 6). popnei 0.1.0
  reports no progress, so until the source exists a run shows that it is
  running and for how long, and not how far along it is.
- **Cancelling** a request that is running ends its worker and starts a
  new one. While a calculation runs inside wasm, the worker cannot read a
  message that asks it to stop, and without `SharedArrayBuffer`, which
  GitHub Pages does not allow (`docs/technology.md`), the page has no
  other way to tell it. Starting a worker again costs the loading of the
  wasm, from the browser's cache after the first time, and the
  intermediate results the worker held, which are made again when asked
  for. The page sends the new worker the `File` objects again, which costs
  nothing, since a `File` crosses as a handle. The new calculation worker
  then opens the variant file again: in the target design that reads its
  header, or the index at the end of a `.nei` file; with popnei 0.1.0 it
  reads the whole file into memory again before the next request starts,
  a time that grows with the file and has not been measured (section 6).
  A crash, a trap of the wasm, restarts the worker in the same way.
- **A change of the load of the variant file restarts the calculation
  worker**, a new pick, an undo or a redo of one, before the first request
  on the new load. The memory of wasm grows and never shrinks, so a
  worker that kept the old load open, or had freed it, would still hold
  the room of that file; restarted, it gives that memory back, and it
  only ever holds one open file, one `Variants` of popnei. What it costs:
  an undo to the previous load reopens that file, which with popnei 0.1.0
  reads it whole again, a time that grows with the file; the results of
  the previous load are still found in the cache of the page, with no
  calculation, and only a new calculation on it waits for the reopening.
  The intermediate results of the old load, the pruned variants, the
  kinship, are lost with the worker, and they belong to a load no longer
  asked for.

The calculation worker keeps, under keys as the results are, what several
analyses reuse: the variants kept by the LD pruning of the PCA, the
kinship, the principal components that the GWAS takes as covariates.

### Two workers, and why

The calculation worker is one, with one request at a time: it holds the
variant file and the intermediate results, and a second one would hold
its own. The jobs that need no genotypes, reading the individuals file,
writing the xlsx, zipping the report, go to the second, light worker,
which never opens the variant file.

The option not taken was one worker for everything. With it, a user who
starts a GWAS of minutes and then loads a new traits file, or asks for the
report of the results already there, waits the rest of the GWAS for a job
of a second, or cancels the GWAS and loses it. The second worker costs
little memory, since it holds no genotypes and no popnei: our code, the
table it is reading, and the files wasm once it is loaded. It downloads
and compiles nothing of popnei's wasm.

Considered and not taken: **a pool of calculation workers**, which would
run two analyses at once on two cores. Each worker would hold its own
intermediate results, a kinship of 10,000 individuals is 800 MB in each
one that uses it, and its own wasm memory, which never shrinks (section
11); two workers that both needed the pruned variants would each make
them; and with popnei 0.1.0 each would hold the whole variant file. A
pool would win if the walking skeleton showed users waiting on several
independent analyses whose intermediate results are small.

## 6. The files of the user

The page keeps every `File` the user picked in a map from file id to
`File`, in the worker client, and sends it to a worker that needs it, and
again to a worker that was restarted. A `File` stays in the map after
another is loaded in its place, so that an undo of the load finds it. The
project holds only the id and the identity (section 2).

### The variant file, read by ranges: the target

The variant files of the users tend to be huge and the memory of a tab is
limited, so the design is to read the file by ranges, as the owner decided
on 24 September 2026:

- **The worker gives popnei a source of bytes over the `File`**, which
  popnei's reader calls for each range it needs, and which reads that
  range with `FileReaderSync.readAsArrayBuffer(file.slice(start, end))`,
  a call that exists only in workers and returns the bytes at once, which
  is what Rust's `Read` and `Seek` need. The VCF reader reads forward; the
  reader of a `.nei` file seeks, since arrow IPC keeps its index at the
  end of the file.
- **Only a few blocks are in memory at a time**, so the size of a file is
  limited by time and not by memory.
- **Progress comes from the source itself**: it counts the bytes it has
  read, against the size of the file, and posts them to the page, which a
  worker can do from inside a call to wasm. No callback from popnei's loop
  is needed. popnei still has to say how many passes an analysis makes,
  the PCA makes two, or tell the source when a pass starts, so that the
  bar does not go from full to empty.
- **A restart reopens the file** instead of reading it again.

This needs of popnei a source of bytes over a JavaScript `File`, read by
ranges with `FileReaderSync`, in its wasm binding, which needs `js-sys`,
for `openVcf` and `openVars`. It is a priority request to popnei, and when
it comes it is a design of its own (`.claude/skills/designing/SKILL.md`):
the worker holds something new, and the runner changes where it opens a
file. The rest of this architecture holds with either way of reading.

What stays with the target: **every analysis reads the file again**, one
pass or two, and a pass over a gzipped VCF decompresses the whole of it
each time, which is slow. Converting the VCF to a `.nei` file once, which
is read many times faster (`docs/functionality.md`, section 3), is what
the application steers the user to. And the results that are large by
themselves stay large whatever the reading (section 11).

### The variant file read whole: popnei 0.1.0, where the walking skeleton starts

popnei 0.1.0 opens a VCF with `openVcf(source: Uint8Array, options)` and a
`.nei` file with `openVars(source: Uint8Array)`: the bytes of the whole
file. So until the source above exists, the calculation worker reads the
whole `File` into memory, `FileReaderSync.readAsArrayBuffer(file)`, and
gives the bytes to popnei, which copies them into the memory of wasm and
reads every pass from that copy.

- **The file costs about twice its size while it opens**, the worker's
  copy and wasm's, and its size once after the worker lets go of its copy.
- **Files above roughly 1.5 to 2 GB fail.** wasm32 addresses at most
  4 GB, and the memory of wasm grows and never shrinks
  (`js/popnei/README.md` of popnei), so the file has to fit there with
  room beside it for the blocks of a pass and the matrices of the
  analyses, and the tab holds a second copy while it opens. The figure is
  an estimate from those sizes; no browser has been measured at it. popnei
  refuses with its message, which the screen shows.
- **A restart reads the whole file again** (section 5).
- **There is no progress bar**, only that a run is running and for how
  long.

This state is removed when popnei provides the source by ranges; the
runner's opening of a file is the one place that changes.

### How a load of the variant file reaches the project

1. **Picking a file is one command.** The page makes a new file id, puts
   the `File` in its map under it, and gives the command the id, the name,
   the size, the format and the read options; the command puts into the
   project a `VariantSource` with them and its `read` pending.
2. **The calculation worker opens the file** and sends back the
   individuals and the ploidy, which popnei gives once the file is open,
   with no pass over the variants.
3. **The store records them into that same `VariantSource`**, the one
   with that file id and no other, as an event that is not a step of
   undo, in the current project and in every project of the history that
   holds that source, so that a redo of the pick brings it back read. The
   event completes the pick: undo of the pick removes the whole source. A
   file that popnei refuses leaves the source `failed`, with popnei's
   message.
4. **Until then every analysis is locked** with the reason "reading the
   file", through its `needs`, and the record of step 3 unlocks them. Their
   keys could be made already, from the id and the read options, but
   whether popnei can open the file is not yet known, nor the individuals,
   which the individuals file is checked against (below).
5. **The number of variants comes from the first pass that counts it**,
   the pass statistics popnei gives with the first analysis or filter run
   on that load, and is recorded into the same source in the same way;
   the screen shows it when it is known. Nothing waits for it, so no
   analysis waits for a whole pass over the file before it starts.

What the worker sends is information about the input, read from it, not a
result: it depends on the file alone and no option of an analysis changes
it, so it belongs in the project with the file and is saved in the
project file. It goes into no key; its use is to tell a reopened project
which file it was made with (section 8), and to check the individuals
file against the individuals of the variants.

A browser cannot open a file by itself, so a project that is opened asks
the user for its variant file again (`docs/functionality.md`, section 9).

### The individuals file

It is read once, in the light worker, into a table that goes into the
project, and the types of its columns are inferred there too. Loading it
goes as the variant file does (section 6). The page makes a new file id
for the load, as for the variant file (section 3), and one command puts
an `IndividualsSource` with that id and the name in the project, pending,
which locks what needs it with the reason "reading the file". The light
worker reads it, and the store records the table and the types, or the
error, into the source with that id and no other, as an event that is not
a step of undo; an undo of the load removes the source. So when the user
picks a file, then picks another of the same name before the first read
has come back, the late read of the first pick finds no source with its
id and is dropped: the name would not tell the two apart. The type of the table is declared
in `src/worker/protocol.ts`, as the filters are, so that the project of
core and the reader describe it in one way.

- **CSV and TSV are read by popnei_web, in TypeScript**, by the module
  `src/worker/individuals/`, which the light worker's runner calls: the
  separator detected, `,`, `;` or a tab; decimals with a comma accepted;
  a BOM at the start removed; an empty cell, `NA` and `-` read as
  missing (`docs/functionality.md`, section 4). The runner decodes the
  bytes and gives the reader the text.
- **The encoding, the separator and the decimal mark are detected, shown
  and changeable**, as the owner decided on 24 September 2026: defaults
  that are right for most files, and a way to set each one for a file
  they get wrong. With "auto", a file that is valid UTF-8 is read as
  UTF-8, and one that is not as Windows-1252, which is what Excel on
  Windows writes for "CSV (comma delimited)" in Spanish and the other
  languages of Western Europe; the separator is the one of `,`, `;` and
  tab that splits the lines into the same number of fields; the decimal
  mark is a comma when the separator is not one and the numbers are
  written with a comma. The read reports what it found, and the screen
  shows it beside the file, "Read as Windows-1252, separator `;`,
  decimal comma", with a way to change each. A file is never refused for
  its encoding. Changing one is a command that sets `csv` in the source
  and puts its read back to pending; the light worker reads the file
  again, and the read is recorded only into the source with that load id
  and those options, so a read of the old options that comes back late is
  dropped. The table that results is what enters the keys, so a change
  that alters it changes the keys of what uses it. The option not taken
  was to refuse a file that is not UTF-8 and ask for "CSV UTF-8", which
  would stop most users of Excel in Spanish at their first file.
- **The inference of the types of the columns** is in the same module. It
  takes the cells of a CSV, all text, or the cells of an xlsx, as the
  files wasm gives them, numbers, text, booleans or empty, so that the
  same table gives the same types in both formats. The types are kept in
  the project, where the user can change them (`docs/functionality.md`,
  section 4).
- **The module is pure**: it takes text or cells and gives a `Result` of
  the table, with no DOM, no global of a worker and no popnei. So it is
  tested with Vitest in node, on files of the cases that Excel writes in
  English and in Spanish, and it is checked by the compiler with no
  globals, as core is (`.claude/skills/coding/configs.md`).
- **An xlsx** is read by calamine in the files wasm, loaded on first need
  (below), and its cells go through the same inference.
- **Every individual of the variants must be in the file.** Core checks
  it, in the `needs` of each analysis that uses the file, against the
  individuals the calculation worker read from the variant file, and the
  screen names the missing ones (`docs/functionality.md`, section 4). The
  reader does not check it, since it does not know the variants.

With a CSV, the light worker loads no wasm at all.

### The files wasm, a crate of this repository

The xlsx and the zip are made by a small Rust crate of popnei_web,
`crates/files/`: a `cdylib` with wasm-bindgen, calamine to read an xlsx,
rust_xlsxwriter to write one and zip for the report, the three that
`docs/technology.md` measured, 0.58 MB gzipped together. It exports three
functions, reading the first sheet of an xlsx into cells, writing a table
as an xlsx, and zipping files, and only the light worker's runner calls
them. It is not part of popnei and nothing of popnei is in it.

- **It is built by the site's own build**: `cargo build --target
  wasm32-unknown-unknown --release`, then `wasm-bindgen --target web` into
  `crates/files/pkg/`, which the light worker imports with a dynamic
  `import()` that Vite makes a chunk of its own
  (`.claude/skills/coding/configs.md` has the script, `build:files`, which
  runs before `vite build` and `vite dev`).
- **Its output is not committed**: `crates/files/pkg/` is ignored by git
  and built by the continuous integration, as the site is. A wasm file in
  git is a binary that a review cannot tell was built from the source
  beside it, and that changes in every commit that touches the crate. The
  option not taken, committing it, would let a machine without Rust build
  the site.
- **What it costs**: every machine that builds the site or runs its
  development server needs a Rust toolchain with the target
  `wasm32-unknown-unknown`, and `wasm-bindgen-cli` at the exact version of
  the `wasm-bindgen` crate, which the crate pins with `=`, since the two
  refuse to work together when their versions differ; 0.2.128, the one
  popnei pins, so that one command line installed builds both. The GitHub
  Actions workflow of the site installs them, and builds the crate before
  the site, times that have not been measured. The owner programs in Rust
  and has the toolchain. And the crate is ours to keep, a few hundred
  lines around the three libraries, an estimate.
- **Considered and not taken: a JavaScript library of xlsx.** SheetJS
  left npm in 2023, and the version there, 0.18.5, has known
  vulnerabilities; ExcelJS has had few releases since 2023; and a reader
  of our own over fflate would be ours to write with its hard cases
  (`docs/technology.md`, section 2).

### The files written

- **The filtered variants** are written in the calculation worker by
  popnei's `writeVars`, which builds the whole `.nei` file in the memory
  of wasm and copies it out into one array of bytes. For a large file
  that doubles the memory, the file being written in wasm and its copy,
  beside the source; which is why the report leaves the filtered variants
  out by default (`docs/functionality.md`, section 9). This holds with the
  source by ranges too.
- **The xlsx and the zip of the report** are made in the light worker, by
  the files wasm.
- Each is made as bytes and offered by the page as a download.

### What this asks of popnei

Each is asked of popnei and not built around in the applications, and
`.claude/skills/coding/worker.md`, "What popnei has to provide", keeps the
full list:

1. A source of bytes over a JavaScript `File`, read by ranges with
   `FileReaderSync`, for `openVcf` and `openVars`; the priority.
2. The number of passes an analysis makes, or a signal to the source when
   a pass starts, for the progress bar.

Nothing is asked of popnei for the individuals file, nor for the identity
of the variant file.

What was revised. The version approved on 24 September 2026 put the
reader of CSV and TSV, and the inference of the types of the columns, in
popnei's core and its wasm, as a request to popnei, so that Python would
read the files with the same code; the light worker loaded popnei's wasm
for them; and the files wasm was to be built and released beside popnei's
package (`docs/technology.md`, open point 2 of that version). The owner
decided on the same day that reading these files is not popnei's
business: CSV and TSV are read here in TypeScript, the xlsx by a crate of
this repository, and the Python script reads the file with pandas
(section 8). What it gives: the light worker no longer compiles popnei's
wasm a second time, beside the calculation worker, a time that was never
measured; the walking skeleton waits for no release of popnei; and a change to how the applications read a file waits
for no tag of popnei. What it costs: the reader, its separators and its
inference are ours to write and test, a few hundred lines of TypeScript,
an estimate; Python reads the file with other code than the application,
which the script bridges (section 8); and building the site needs Rust.
Considered and not taken: **Papa Parse**, the established parser of CSV
in JavaScript, which detects the separator and reads quoted fields; the
decimal commas, the missing values and the inference of the types, which
are most of the work, would still be ours, and it would be a dependency
for the smallest part of it.

## 7. The screens

- **The screens read the project and the cache, and send commands.**
  They hold no state of the project of their own, only what belongs to the
  screen, a tab that is open, a drawer, a point under the mouse. React
  reads `core` through one subscription to its store.
- **A plot is a function** of `src/charts`, which takes an element and
  the data and returns a handle to update it, to remove it and to export
  it as SVG or PNG. The screen mounts it and gives it the data. The plots
  know nothing of React or of the project.
- **The step of an application is in the URL hash**, so that the back
  button moves between steps (`docs/technology.md`).

## 8. The project file, the report and the script

- **The project file** is the project as JSON, with the header of
  `docs/functionality.md` section 9 and, for each analysis, the numbers
  its `checkNumbers` gives, to check a new run against. It is made in
  core. Opening one validates the JSON against the schema of its version,
  refuses a file it cannot read with a message that says why, and gives a
  `Project` whose `variants` is null, since the file has to be picked
  again, and whose `reference` holds the source the project was made with
  and, for each analysis, its check numbers with the fingerprint of its
  settings as the file had them: a hash of everything its key holds but
  the load id and the version of popnei (`docs/specs/core/keys.md`). The
  fingerprint is not saved in the file; it is made when the file is
  opened, with nothing to wait for. The owner decided it on 24 September
  2026, in place of a key of the reference made once the calculation
  worker had given the version of popnei, which left a moment after the
  opening in which a changed setting would have been taken for the
  file's own.
- **The identity of the file is compared, and never decides anything.**
  When the user gives the variant file of an opened project, the
  application compares the name, the size, the individuals and the ploidy
  of the new load with those of the reference as soon as the file is
  open, and the number of variants once the first pass has counted it,
  and warns when they differ, saying in what (`docs/functionality.md`,
  section 9). It never refuses the file, and it calculates every analysis
  again in any case, since the load has a new id. Two files with the same
  individuals and number of variants and other genotypes pass this
  comparison; what catches them is the comparison of the check numbers
  after the run, below, which is computed from the genotypes and so is a
  stronger check than a hash of the positions would have been. It catches
  them for every analysis whose numbers the project holds.
- **The check numbers of an opened file are kept** when the project is
  saved again before a run. For each analysis, the numbers saved are
  those of its result in the cache under its current key; when there is
  none, those of the reference, if the fingerprint of its settings now is
  the one the reference kept, so that an analysis whose options changed
  does not carry numbers of other options; otherwise none. And none when
  the variant file the user gave differs from the reference's in its
  identity: the numbers belong to the old file, and saved beside the new
  one they would read as the numbers of a run on it. After a run, while
  the fingerprint of the settings is still the file's, the numbers of the
  result are compared with those of the reference, and the screen says
  whether they are the same, and what changed that could explain a
  difference: the variant file, or, when the version of popnei is not the
  one in the file's header, the version as well
  (`docs/specs/core/store.md`). The reference is in no key: it is not an
  input of any result.
- **The report** is made in three parts, each in the layer that can do
  it. Core builds its content as data, from the project, the cache and
  the warnings: the sections, the tables, the warnings, and which plots
  with what data. `src/ui` renders that into the one HTML page, drawing
  each plot with `src/charts` in an element outside the visible page and
  taking its `toSVG`, since a plot is drawn in a DOM, which core does not
  have and a worker does not either. The light worker zips the page with
  the other files of the report.
- **The Python script** is the `script` lines of every analysis that was
  run, after the lines that open the variants, filter them and read the
  individuals file. It is made in core. It reads the individuals file
  from the `.xlsx` of the report with pandas, `pandas.read_excel`, which
  needs openpyxl, and builds the dict of the populations itself, in plain
  Python, from the column the project chose, named in the script by its
  name; it uses no reader of popnei, which has none. Every column is read
  as text, `dtype=str`, with the missing values of the application and no
  others, `keep_default_na=False, na_values=["", "NA", "-"]`, and the
  script converts to numbers the columns whose type in the project is
  continuous, with `pandas.to_numeric`. A binary column is written out
  with the application's coding of it, which value is 1, from the type of
  the column kept in the project (`ColumnType`, section 2),
  `df["status"].map({"case": 1, "control": 0})`, and not converted with
  `to_numeric`, which fails on text such as yes and no and would not say
  which value is the case. Otherwise pandas' own inference would stand in for
  the application's: it reads an individual named `001` as the number 1,
  which matches no name of the variants, and `N/A` or `null` as missing.
  The `.xlsx` it reads is the one the application wrote, of plain text and
  number cells, so calamine and openpyxl are not asked to agree on the
  hard cases of a user's own file.

## 9. The modules

```
src/core/
  project.ts        the Project, its commands, the validation of a project file
  result.ts         the Result type of what can fail with good code
  keys.ts           the canonical form of the inputs of a result, and its hash
  history.ts        undo and redo over projects
  cache.ts          the results under their keys, bounded in bytes
  store.ts          the current project, the history and the cache, and the
                    subscription the screens read
  analyses/         one module per analysis, with the shape of section 4
  apps.ts           the steps and the analyses of each application
  projectFile.ts    the project file, written and read, and its reference
  reportModel.ts    the content of the report, as data
  script.ts         the Python script
src/worker/
  protocol.ts       the jobs, their results and a run, shared by the page,
                    the workers and core, with no type of the DOM
  messages.ts       the messages, which carry the File objects, shared by
                    the client and the runners
  client.ts         the page's side: a queue per worker, progress,
                    cancelling, restart, the File objects by file id
  start.ts          the lines that make the two workers
  runner.ts         the calculation worker: popnei, the variant file, the
                    intermediate results
  filesRunner.ts    the light worker, with no popnei: the individuals file,
                    the files wasm, xlsx and zip
  individuals/      the reader of CSV and TSV and the inference of the types
                    of the columns, pure, called by filesRunner.ts
src/charts/
  histogram.ts scatter.ts line.ts qq.ts heatmap.ts manhattan.ts pca3d.ts
  export.ts         SVG and PNG
src/ui/
  shell/            the header, the stepper, the summary line, the notices
  runs.ts           awaits the outcome of each run core starts, and hands
                    progress and results to the store as events
  steps/            one folder per step: variants, individuals, analyses, export
  analyses/         the panel of options and the results of each analysis
  report/           renders the report model into its HTML page, with the plots
  widgets/          React Aria components with our styles
  tokens.css        the design tokens
src/probe/          the probe of stage 0, a page of its own outside the
                    layers, that checks a deploy still loads popnei
index.html popgen.html gwas.html probe.html
                    the pages, at the root of the repository, so that the
                    build writes them to the root of dist/
crates/files/       the files wasm, in Rust: xlsx read and written, the zip;
                    built into crates/files/pkg/, which git ignores
docs/
```

`core` has no DOM and no React, and is tested with Vitest alone. Nothing
in `core` imports from `ui` or `charts`, and nothing in `charts` imports
from `core` or `ui`. Only `src/worker/runner.ts` calls popnei, apart
from the probe's worker, `src/probe/probeWorker.ts`, and only
`src/worker/filesRunner.ts` calls the files wasm.

The pages are HTML files at the root and not in a folder of their own,
because the build writes each page where it finds it: in `pages/`, the
application would be served at `/popnei_web/pages/popgen.html`, and not
at `/popnei_web/popgen.html` as section 4 of `docs/technology.md` has it
(`docs/specs/site.md`). The probe, `src/probe/` with `probe.html`, is
linked from no other page; nothing of `src/` imports it, and it imports
popnei and React and nothing of `src/`.

## 10. The walking skeleton

The smallest path that goes through every part once, and the first thing
built: the population genetics application reads a `.nei` file in the
calculation worker, filters it by missing data, and shows the diversity
per population with the populations of an individuals file in CSV, read
in the light worker; changing the threshold of the filter removes the
diversity from the screen with its notice, and undo brings it back with no
calculation; a running calculation can be cancelled; and the project can
be saved and opened again. The xlsx, the plots, the report and the other
analyses come after it, each as a module of its own.

It reads the variant file whole, as popnei 0.1.0 does (section 6), and it
needs nothing from popnei that 0.1.0 does not have. Its individuals file
is a CSV, read by our reader in the light worker, so it does not need the
files crate either: the crate, its build and the Rust of the continuous
integration come after it, with the first work package that reads an
xlsx, and the light worker of the skeleton loads no wasm.

## 11. The limits and the costs of the web

What a user of the applications would meet, with the numbers from popnei's
code, version 0.1.0.

- **The size of the variant file.** With popnei 0.1.0, files above
  roughly 1.5 to 2 GB fail, and a file costs about twice its size while it
  opens (section 6). With the source by ranges the size is limited by the
  time of a pass, not by memory.
- **A file changed on the disk after it was picked.** A `File` is a
  handle to the file as it was when picked, and the File API asks a
  browser to refuse to read one whose file changed since; with reading by
  ranges every pass reads the disk again, so a file overwritten while the
  application is open fails at the next pass, and the user picks it
  again. This is from the specification and has not been seen in a
  browser yet. The new pick is a new load with a new id, so every result
  is calculated again from what the file holds now (section 3).
- **The PCA refuses more than 9381 individuals.** The matrix of the
  individuals, its eigenvectors and the workspace of the
  eigendecomposition take about 6 times 8 bytes per pair of individuals,
  which at 9382 is more than the 4 GB that wasm addresses
  (`src/pca.ts` of popnei). popnei refuses with its message, and points to
  a program outside the browser, popnei in Python among them.
- **The kinship takes n² × 8 bytes**, 800 MB at 10,000 individuals, and
  the calculation worker keeps it in its cache for the GWAS. While it is
  calculated it is in the memory of wasm as well, which keeps that room
  after.
- **The memory of wasm grows and never shrinks** (`js/popnei/README.md`
  of popnei), so the only way to give it back is to restart the worker.
  The calculation worker is restarted when the load of the variant file
  changes (section 5); whether it is also restarted between requests is
  open point 2.
- **The downloads**: the wasm package of popnei, 0.63 MB gzipped, before
  anything runs, loaded by the calculation worker alone; the files wasm,
  0.58 MB gzipped, by the light worker the first time an xlsx is read or a
  report is written (`docs/technology.md`, section 2).
- **Picking a file again calculates everything again.** Each load of the
  variant file has a new id, so the results of an earlier load of the same
  file are not found (section 3): the user waits the time of each analysis
  again, and, with popnei 0.1.0, the time of reading the whole file, which
  a pick takes anyway.
- **The browsers**: Chrome and Edge 111, Firefox 115 and Safari 16.4, the
  floor the owner set on 24 September 2026 (`docs/technology.md`, section
  6).
- **The page frozen.** The key of every analysis is made on the page after
  every command, from the canonical form of its inputs, and the
  individuals table of 10,000 rows is among them. Since the project is
  immutable, the canonical form of a part can be kept by its reference and
  made again only when that part changes; whether it has to be is measured
  on the walking skeleton. The report draws every plot on the page, one
  after another, and gives the page back between two plots.

## 12. What is hard to undo

- **The format of the project file**, which users keep. It carries the
  version of its format in its header (`docs/functionality.md`, section
  9), and opening one validates it against the schema of that version
  (section 8), so a change to the format is a new version, and the
  application keeps reading the versions before it.
The canonical form of the keys is not among these, although an earlier
version of this section said it was. No key and no fingerprint of
settings is saved in a file: the cache lives in the tab, the calculation
worker's keys are made by the same page, and the fingerprints of an
opened project are made from its settings when it is opened (section 8).
A change to the canonical form, in a new version of the site, costs a
user nothing but the results of a tab left open across the deploy.

## 13. Open points

1. The hash of the keys. Settled by the owner on 24 September 2026:
   SHA-256, written in TypeScript in core, synchronous, and tested on the
   test vectors NIST publishes; not `crypto.subtle.digest`, which returns
   a promise, nor a library (`docs/specs/core/keys.md`). Nothing is
   hashed from the variant file (section 3).
2. Whether the calculation worker is also restarted between two requests
   to give back the memory of wasm, which never shrinks, and which the
   bound of its cache, counted in the bytes of its typed arrays, does not
   see. Its restart when the load id of the variant file changes is
   settled (section 5). The recommendation is to restart it between two
   requests only if the walking skeleton shows a tab running out of
   memory.
