# The architecture: how a project flows through the applications

September 2026, first draft, revised on 24 September 2026 after its
architecture review, and approved by the owner on 24 September 2026;
what was revised is at the end of section 1. The document gives the parts
of the web applications of popnei, what each one holds, and how a change
made by the user reaches the results on the screen. What the applications
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
│                                     │◀──▶│ the popnei wasm package, with│
│ the File objects, by file id        │    │   no variant file opened     │
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
  individuals file, writing an xlsx, zipping the report. It holds popnei's
  wasm with no variant file in it, for CSV and TSV, and the second wasm
  module, for xlsx and zip, which it loads the first time it needs it
  (`docs/technology.md`). It exists so that these jobs of a second do not
  wait behind a GWAS of minutes (section 5).

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
size, date of last change and fingerprint, and its read options, and
section 3 lists every input of a key. The report is built as data in core
and rendered on the page, where the plots can be drawn (section 8). The
check numbers of an opened project file are now data of the project
(section 2). CSV and TSV, and the inference of the types of the columns,
move out of the files wasm into popnei's own, so that a user with a CSV
never downloads the files wasm (section 6). Queued requests that the
project no longer asks for are dropped, and a second, light worker takes
the jobs that need no genotypes (section 5). Sections 11 and 12, the
limits and costs of the web and what is hard to undo, are new.

## 2. The project

The project is everything the user has set, and nothing that was
calculated, with two exceptions that are information read from the inputs
and not results: the identity of the variant file, and the check numbers
of a project file that was opened. It is one plain, immutable value, and
every change the user makes is a command that gives a new one.

```ts
interface Project {
  app: "popgen" | "gwas";
  variants: VariantSource | null;     // the file picked and its identity
  filters: VariantFilter[];           // in their order, with parameters
  individualFilters: IndividualFilter[];
  individuals: IndividualsSource | null; // the metadata or traits file:
  //   its name, and pending, the table whole once read, or failed
  // popgen: the column that defines the populations, and later the
  //         edits made with the lasso; gwas: the roles of the columns
  grouping: Grouping;
  analyses: Record<AnalysisId, AnalysisOptions>; // the options of each
  reference: Reference | null;        // from an opened project file (section 8)
}

interface VariantSource {
  fileId: string;                     // the File, in the page's map (section 6)
  name: string;                       // as File gives them
  size: number;
  lastModified: number;
  format: "vcf" | "nei";
  readOptions: { ploidy: number; onlyPassed: boolean } | null; // a VCF's; null for .nei
  read: SourceRead;                   // what the worker read from the file
}

type SourceRead =
  | { kind: "pending" }               // the worker is reading the file
  | { kind: "read"; fingerprint: string; individuals: string[];
      numVars: number; ploidy: number }
  | { kind: "failed"; message: string }; // popnei's message

interface Reference {
  variants: VariantSource;            // the file the project was made with;
                                      // its fileId names no File
  checks: Partial<Record<AnalysisId, { key: string; numbers: number[] }>>;
}
```

- **Immutable**, so that undo is keeping the previous values, and so
  that the screens know what changed by comparing references.
- **Plain data**, which is what the project file is: saving it is
  writing it as JSON, and opening a project file is validating that JSON
  into a `Project` (section 8).
- **The individuals table is in the project, whole.** It is small, and
  the populations edited in the application exist in no file of the user.
- **The project holds the id of the variant file and its identity, never
  the `File`.** A `File` is not JSON, and core, which has no DOM, cannot
  name its type. The page keeps the `File` objects in a map from file id
  to `File` (section 6).
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

- the identity of the variant file, its name, size, `lastModified` and
  fingerprint, and its read options (below), and not its file id, which
  is a number of the session and differs for the same file picked again;
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

**The file's part of the key identifies the file, not only its
individuals and positions.** The fingerprint is a hash of the list of
individuals and of the chromosome and position of every variant
(`docs/functionality.md`, section 9): two files with the same individuals
and positions and different genotypes, a panel called again with another
caller, have the same fingerprint, and a key made of it alone would show
the result of one file for the other. So the name, the size and the date
of last change, as the browser's `File` gives them, go into the key with
the fingerprint. This is conservative on purpose: a copy of the same file
with another date is calculated again, which costs the time of a
calculation, where the opposite error would show a wrong result.

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

## 4. An analysis is a module

Each analysis is one module, with the same shape, in both applications:

```ts
interface AnalysisDef<Opts, Result> {
  id: AnalysisId;                        // "pca", "diversity", "fst", "gwas"...
  app: ("popgen" | "gwas")[];
  defaults: Opts;
  keyVersion: number;                    // raised when the meaning of its result changes
  keyInputs(p: Project): unknown;        // the parts of the project it depends on
  needs(p: Project): string | null;      // why it cannot run yet, or null
  run(p: Project, c: WorkerClient): Run<Result>; // the request to the worker
  warnings(r: Result, p: Project): Warning[]; // raised by the data only
  checkNumbers(r: Result): number[];     // kept in the project file (section 8)
  script(p: Project): string;            // its lines of the Python script
}
```

and its panel of options and its results in `src/ui`. `WorkerClient` is
an interface that core declares and the client of `src/worker` fulfils,
since core has no DOM and cannot name the browser's `Worker`. Adding an
analysis is adding its module and its panel; nothing else changes. This is the
piece the work is split into, and what lets an analysis be tried, changed
or dropped without touching the others.

`needs` is what locks an analysis with its reason: "reading the file"
while the fingerprint of the variant file is pending (section 6), "the
individuals file lacks 12 individuals of the variants", a trait not
chosen.

An application is a list of steps and a list of analyses. The two
applications share the steps of the variants and the analysis of the PCA.

## 5. The workers and their messages

The page and each worker talk through typed messages
(`docs/technology.md`). The page's side of both is one client,
`src/worker/client.ts`, which keeps a queue for each worker.

- **A request** names the job, the key and the inputs. Each worker runs
  one request at a time, because the wasm of popnei has one thread, and
  the client keeps the others in the queue of that worker.
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
little memory, since it holds no genotypes: popnei's wasm with no file
opened in it, and the files wasm when it is loaded. It does not cost a
second download, because both workers load popnei's wasm from the same
address, which the browser caches; each compiles it, a time not yet
measured.

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
again to a worker that was restarted. The project holds only the id and
the identity (section 2).

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

### How the identity of the variant file reaches the project

1. **Picking a file is one command.** It puts into the project a
   `VariantSource` with the name, the size, `lastModified`, the format and
   the read options, and its `read` pending. The page puts the `File` in
   its map under a new file id.
2. **The calculation worker opens the file** and makes one pass over it,
   and sends back the individuals, the ploidy, the number of variants and
   the fingerprint, the hash of the individuals and of the chromosome and
   position of every variant.
3. **The store records them into that same `VariantSource`** as an event
   that is not a step of undo, in the current project and in every project
   of the history that holds that source, so that a redo of the pick
   brings it back read. The event completes the pick: undo of the pick
   removes the whole source. A file that popnei refuses leaves the source
   `failed`, with popnei's message.
4. **Until then every analysis is locked** with the reason "reading the
   file", through its `needs`, since its key cannot be made without the
   fingerprint.

What the worker sends is information about the input, read from it, not a
result: it depends on the file alone and no option of an analysis changes
it, so it belongs in the project with the file and is saved in the
project file.

A browser cannot open a file by itself, so a project that is opened asks
the user for its variant file again (`docs/functionality.md`, section 9).

### The individuals file

It is read once, in the light worker, into a table that goes into the
project, and the types of its columns are inferred there too. Loading it
goes as the variant file does (section 6): one command puts its name in
the project, pending, which locks what needs it with the reason "reading
the file"; the light worker reads it, and the store records the table, or
the error, into that same source as an event that is not a step of undo;
an undo of the load removes the source. An xlsx uses both wasm modules in
the light worker, the files wasm for its cells and popnei's for the types;
neither holds genotypes, so together they cost the two downloads and
little memory.

- **CSV and TSV, and the inference of the types of the columns, are in
  popnei's own wasm**, not in the files wasm, which holds only xlsx and
  zip. They are small Rust code, with no dependency of the size of
  calamine or rust_xlsxwriter, so they add little to popnei's download,
  an amount not yet measured; and in popnei's core Python reads
  the files with the same code (`docs/functionality.md`, open point 2);
  and a user with a CSV never downloads the files wasm, 0.58 MB gzipped
  (`docs/technology.md`). This is a request to popnei beside the others.
- **An xlsx** is read by calamine in the files wasm, loaded on first need,
  and its cells go through the same inference of popnei.

### The files written

- **The filtered variants** are written in the calculation worker by
  popnei's `writeVars`, which builds the whole `.nei` file in the memory
  of wasm and copies it out into one array of bytes. For a large file
  that doubles the memory, the file being written in wasm and its copy,
  beside the source; which is why the report leaves the filtered variants
  out by default (`docs/functionality.md`, section 9). This holds with the
  source by ranges too.
- **The xlsx and the zip of the report** are made in the light worker.
- Each is made as bytes and offered by the page as a download.

### What this asks of popnei

Each is asked of popnei and not built around in the applications, and
`.claude/skills/coding/worker.md`, "What popnei has to provide", keeps the
full list:

1. A source of bytes over a JavaScript `File`, read by ranges with
   `FileReaderSync`, for `openVcf` and `openVars`; the priority.
2. The number of passes an analysis makes, or a signal to the source when
   a pass starts, for the progress bar.
3. The reader of CSV and TSV and the inference of the types of the
   columns, in popnei's core and its wasm.
4. The fingerprint of a variant file, so that Python gives the same one
   (open point 1).

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
  and, for each analysis, its check numbers and the key its settings gave
  in the file, computed when it is opened.
- **The check numbers of an opened file are kept** when the project is
  saved again before a run. For each analysis, the numbers saved are
  those of its result in the cache under its current key; when there is
  none, those of the reference, if the key its settings give now, with
  the reference's source in place of the current one, is the key of the
  reference, so that an analysis whose options changed does not carry
  numbers of other options; otherwise none. After a run, the numbers of
  the result are compared with those of the reference, and the screen
  says whether they are the same, and what changed that could explain a
  difference, the variant file or the version of popnei. The reference is
  in no key: it is not an input of any result.
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
  from the `.xlsx` of the report with popnei's reader in Python, which,
  compiled natively, has the xlsx reader built in: the split into two wasm
  modules is a matter of what a browser downloads, and Python has no such
  cost.

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
  filesRunner.ts    the light worker: popnei with no variant file, the files
                    wasm, the individuals file, xlsx and zip
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
pages/
  index.html popgen.html gwas.html
docs/
```

`core` has no DOM and no React, and is tested with Vitest alone. Nothing
in `core` imports from `ui` or `charts`, and nothing in `charts` imports
from `core` or `ui`.

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
needs two things popnei does not have yet, the reader of CSV and the
fingerprint, which are asked of popnei before it is built.

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
  browser yet.
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
  When the application does so is open point 2.
- **The downloads**: the wasm package of popnei, 0.63 MB gzipped, before
  anything runs, loaded by both workers from one address and downloaded
  once; the files wasm, 0.58 MB gzipped, the first time an xlsx is read or
  a report is written (`docs/technology.md`, section 2).
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
- **The canonical form of the keys.** A change to it changes every key,
  so no result in any cache is found again, and the keys stored in the
  reference of a project stop matching. It is versioned as the key version
  of each analysis is, and changed only with that version raised.

## 13. Open points

1. The hash of the keys and of the fingerprint: which function, and
   whether the fingerprint is computed by popnei, so that Python gives the
   same one. The hash of the keys has to be synchronous, because core is,
   and `crypto.subtle.digest`, the hash the browser gives, returns a
   promise; so it is a function of ours in TypeScript, or one of popnei,
   which core would reach only through a worker, and so not synchronously.
   The recommendation is a function of ours, of a published algorithm
   with its test vectors, SHA-256 among them, so that a collision is not a
   concern; and the fingerprint computed by popnei.
2. When the calculation worker is restarted to give back the memory of
   wasm, which never shrinks, and which the bound of its cache, counted in
   the bytes of its typed arrays, does not see. The recommendation is to
   restart it when the variant file changes, a new pick or the undo of
   one, since what the old worker holds belongs to a file no longer asked
   for; and, if the walking skeleton shows a tab running out of memory, to
   restart it between two requests as well.
