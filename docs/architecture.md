# The architecture: how a project flows through the applications

September 2026, first draft, revised on 24 September 2026 after its
architecture review, and approved by the owner on 24 September 2026;
revised again on 24 September 2026 for three decisions of the owner about
the inputs, and approved by the owner the same day; revised a third time
for the specs of stage 1, and approved with them the same day; and, on
25 September 2026, for the line of a character not decoded that a read
of the individuals file reports, as the owner decided that day
(`docs/specs/worker/protocol.md`, `CsvFound`); and, on 26 September
2026, for stage 3 of `docs/build-order.md`, the Variants step whole,
approved by the owner on 26 September 2026 with the answers to its open
points. On 28 September 2026 it was revised for the reader of xlsx,
moved out of this repository into a project of its own, xlsx_rs, as the
owner decided that day; and the
same day for the order of the filters, the filters of individuals
first, as the owner decided that day. The revisions for stage 4, of 27
and 28 September 2026, are approved by the owner on 28 September 2026.
Revised on 30 September 2026 for the specs of stage 5, in sections 4, 9,
11 and 13; the new point 16 of section 13, the calculation worker
started again after every LD decay, is proposed and not yet approved by
the owner. What was
revised each time is at the end
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
│ core    the project, the keys of    │    │   the kinship, from stage 7  │
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
  module, the package of xlsx_rs, a project of its own that popnei_web
  installs from a release as it installs popnei, which the worker loads
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
  6). Revised on 28 September 2026: it is the package of xlsx_rs, a
  project of its own (below).

With them, after the architecture review of this revision: the
calculation worker is restarted whenever the load of the variant file
changes, so that it holds one open file and gives back the memory of the
old one (section 5); the analyses unlock once the file is open, with no
pass over it first (section 6); and a CSV is read with an encoding, a
separator and a decimal mark that are detected, UTF-8 or else
Windows-1252 among them, shown to the user and changeable, as the owner
decided on 24 September 2026 (section 6).

What was revised for the specs of stage 1, on 24 September 2026, and
approved by the owner with those specs the same day:

- The reference of an opened project keeps a fingerprint of the settings
  of each analysis in place of a key, as the owner decided, and the
  project file saves the key version of each analysis with its check
  numbers, and the application's version in its header, so that a changed
  calculation is not blamed on the file (sections 2 and 8).
- The definition of an analysis gains `parseOptions`, given the version
  of the project file, and `filtersRead`, the filters it reads; its `run`
  is given a client bound to its key, which also makes the keys of the
  intermediate results, and the store looks in the cache (sections 3 and
  4). `src/ui/runs.ts` hands the store the outcome of a run, and the
  progress reaches the store through the bound client (section 9).
- `keys.ts` adds the load of the variants file and the filters to every
  key itself, and `keyInputs` gives the rest (section 3).
- The options of the analyses are pairs in the project, not a record, and
  part of the format of the project file (sections 2 and 12).
- A read of the individuals file says what "auto" found (section 2),
  and, since 25 September 2026, the line of the first character it could
  not decode.
- A request that the project no longer asks for is stopped unless the
  change is undone, as the owner decided: when the notice of the change is
  closed or replaced, or when a new calculation would wait behind it, and
  with no deadline; the store holds the handles of the runs and cancels
  them (sections 5 and 9).
- A project file that names an analysis this version of the application
  does not know is refused, as the owner decided (section 8).
- Section 12 no longer counts the canonical form of the keys as hard to
  undo, since no key is saved.

What each replaced, and why, is at the end of sections 3 and 6. popnei is
no longer asked for a fingerprint nor for a reader of these files, so the
walking skeleton needs nothing from popnei beyond 0.1.0 (section 10).

What was revised on 25 September 2026, for decisions of the owner of that
day:

- After every change of the project, the entry of the page, the code
  that starts when the page opens, makes the store and the workers and
  joins them, asks for the read of each file whose read is pending and
  has none under way (section 6, "Who asks for a read").
- A change of the load of the variant file stops every request in flight
  at once, and its notice says they were stopped (section 5).
- The notice offers the reverse of what caused it: Undo after a command
  or a redo, Redo after an undo (section 5).
- An error of our own code that no error boundary of React sees, thrown
  in an event handler or in a promise whose rejection nothing handles, is
  shown in a bar at the top of the page. This document does not describe
  the errors of the page; the rule and its words are in
  `.claude/skills/coding/react.md`, "Errors".

What was revised on 26 September 2026, for stage 3 of
`docs/build-order.md`, the Variants step whole, approved by the owner on
26 September 2026 with the answers to its open points (section 13).
Four parts of that stage fit no slot of this
document as it stood, and each is decided in the section it changes, with
the options not taken and what each costs:

- **The filters of individuals by a threshold** on their proportion of
  missing genotypes and on their observed heterozygosity. popnei gives
  those two numbers for each individual and filters individuals only by a
  list. The checks of the Variants step, the statistics of each individual
  and the histograms of the variants that the user reads to choose the
  thresholds, become analyses; core makes the list of the individuals kept
  from the result of the first check, and gives it to every analysis
  through the client bound to its key (section 4, "The checks of the
  Variants step").
- **What each filter kept**, shown beside each filter: the counts of the
  filters are the result of an analysis of their own, which a Count button
  runs, and which every pass over the project's filters fills as well
  (section 4, "What each filter kept").
- **Writing the filtered variants as a file** the user downloads: a
  request of the calculation worker that is not an analysis and never goes
  into the cache, tracked by the store as a calculation is, with its limits
  of memory (sections 5 and 6, "The files written").
- **The regions of a BED file**, filtered by popnei: read in the light
  worker, kept whole in the project, and hashed once, so that a key holds
  them through their hash (sections 2, 3, 6 and 8).

Settled with them, each with its reason where it is written: the filters
of the variants in a fixed order, the regions first and the LD pruning
last, and the filter of individuals after all of them (section 2); each
individual's statistics counted over the variants the filters keep, and
the histograms of the variants over every variant and every individual
of the file (section 4); and the histograms of the individuals binned in
core, which corrects `.claude/skills/coding/charts.md` (section 7). The
place of the filter of individuals, the statistics of each individual
and the histograms of the variants were revised on 28 September 2026
(below).

The interfaces between the parts that change are the client through
which an analysis sends its request, which gains the individuals kept;
the function the store is given to find the number of variants of the
file in a result, which gives the counts of its filters as well (section
4); the store, which tracks a write; the
`Project`, which gains the regions; the jobs, which carry the list of
individuals in place of the filters of individuals; the results, each of
which carries the counts of its pass; and the project file, which gains the regions and stays at version 1
(section 12).

The approved specs this changes, each revised with the specs of stage 3:
`docs/specs/worker/protocol.md`, `messages.md`, `runner.md` and
`client.md`; `docs/specs/core/project.md`, `keys.md`, `store.md` and
`projectFile.md`; `docs/specs/steps/variants.md`, which stage 3 writes
whole; `docs/specs/analyses/diversity.md`, whose lock on the filters of
individuals, decided by the owner on 25 September 2026 for stage 2, goes;
`docs/specs/entry.md`, for that function and the download of a written
file;
section 3 of `docs/functionality.md`, for the order of the filters; and
the skills `.claude/skills/coding/charts.md` and `worker.md`. What is
measured, and what it sets, is in section 11; nothing had to be measured
before the choices, and one measurement, of the hash of the regions,
closed an option (section 3). What is asked of popnei is in section 6,
and the owner's answers to the open points are in section 13.

Revised again on 26 September 2026, after the review of the code of stage
3: the runner test that the list core makes gives popnei's numbers is
three tests, one of core over a fixture of popnei's statistics, one of
the runner that the fixture is popnei's, and the runner's tests with the
lists of 125 and 119, of 116 and 111 since 28 September 2026, since a test of the worker imports no function of
core (section 4, "What would show these choices wrong").

What was revised on 27 September 2026, for stage 4 of
`docs/build-order.md`, the Individuals step and the PCA; approved by the owner on 28 September 2026.
Stage 4 fits the slots this document has: the PCA
is an analysis of the shape of section 4, its plots are functions of
`src/charts`, and the reader of xlsx is the files wasm of section 6,
since the revision below the package of xlsx_rs. What it changes:

- **The calculation worker keeps no intermediate result before stage
  7.** popnei cannot hold the variants its LD pruning keeps, so each PCA
  with an LD filter prunes inside its own pass (section 5), as the owner decided on 27
  September 2026.
- **An option that changes only how a result is drawn is left out of the
  key**: the column that colours the PCA, its components on the axes, 2D
  or 3D. They are options of the analysis, saved in the project file,
  and a change of them is a command that removes no result (section 4).
- **The individuals file** gains, in the project, the types the user set,
  kept by the name of the column when the file is read again, and
  applied when a read allows them, so that a type a wrong separator could
  not apply comes back once the separator is corrected; which types wait
  is worked out and not stored; what types
  each column allows is worked out in core from the table, with the
  reader's pure functions of `src/worker/individuals/columnTypes.ts`,
  which core may now import, and saved nowhere; `Grouping` gains every
  individual in one population; a binary column holds its two values as
  text (section 2).
- **The calculation worker is started again after a PCA or a PCoA of
  more than 700 individuals**, a second exception to open point 2,
  decided by the owner on 27 September 2026 (section 13, point 9).
- **A file of the site fetched after a deploy**: three.js and the files
  wasm are downloaded when first needed, and a page opened before a
  deploy then asks for a file of the build it came from, which the
  deploy removed (section 11, point 10 of section 13).
- **The LD filter of the dataset may have no distance**, from 28
  September 2026, when the owner decided that it starts with none, as
  the PCA's own LD filter does. The project holds it with its distance `null`
  (section 2), a job never does, and a reason of its own locks what
  reads either list of filters until the distance is typed, as a list
  of individuals popnei would refuse locks what reads the filters of
  individuals (section 4). What reads only the filters of individuals
  is locked too, since a threshold on the individuals needs the
  statistics of each individual, which read the filters of the variants;
  revised the same day, with the filters of individuals first (below):
  the statistics read no filter, and the LD filter with no distance
  locks only what reads the filters of the variants.
  The option not taken was to hold the filter turned on and its empty
  field in the screen of the Variants step alone, out of the project
  until a distance is typed: the step would show a filter on that no
  analysis applies, the diversity could run and a project be saved with
  no pruning made, and an Undo or a reload would lose the switch. What
  would show the choice wrong: the store's property, over commands that
  draw an LD filter with no distance and definitions that read any of
  the two lists of filters, that no request carries such a filter, that
  no Run or write throws, and that every definition that reads a list
  of filters is locked while the project holds one
  (`docs/specs/core/store.md`, "How it is verified"). It changes the
  code of stage 3 (`docs/specs/stage-4-open-points.md`, point 16).
- **A filter turned off keeps its values**, from 28 September 2026, when
  the owner decided that the LD filter keeps its r² and its distance
  while it is off, as the PCA's own LD filter keeps them while it
  follows the Variants step; the writers made it the
  rule of every switch of the Variants step. The project gains two
  lists, `filtersOff` and `individualFiltersOff`, where a filter turned
  off waits with its values (section 2); no key, job or lock reads them,
  and `filters` and `individualFilters` keep their meaning, the filters
  applied. The option not taken was a flag in each filter, the form of
  the PCA's own filters, each with its `follow`: every module that reads the filters would
  then have to skip those off, and one that missed it would apply a
  filter the user had turned off, with nothing on the screen to show it
  (`docs/specs/core/project.md`, "The filters turned off").

Stage 4 builds on popnei's release `js-v0.1.0-dev.3` of 28 September
2026, which `package.json` names from its plan: it has the PCoA, which
the specs of stage 4 had followed in popnei's draft (section 11).

The specs of stage 4 hold the rest: `docs/specs/analyses/pca.md`,
`docs/specs/charts/scatter.md` and `pca3d.md`, `docs/specs/worker/files.md`,
and the revised specs of the project, the reader of the individuals file
and the Individuals step. The decisions the owner is asked for are in
`docs/specs/stage-4-open-points.md`.

What was revised on 28 September 2026, approved by the owner on 28 September 2026:
the reader of xlsx leaves this repository. The owner decided
that day that it is a project of its own, **xlsx_rs**, with the
conventions and the skills of popnei, and it answers what the owner had
held against building it in popnei's repository on 24 September 2026. The
files wasm is now the wasm package xlsx_rs releases, which `package.json`
names by the URL of a release, as it names popnei's, and which the light
worker imports on first need as before; the site no longer needs Rust,
which the owner had approved for it on 27 September 2026. Section 6, "The
files wasm, the package of xlsx_rs", has the change, the options weighed
and their costs; sections 9, 10, 11 and 13 follow it. The xlsx of stage 4
waits for the first release of xlsx_rs, and comes last in the stage
(`docs/build-order.md`). The spec of the reader,
`docs/specs/worker/files.md`, is xlsx_rs's first spec, and moves there
when its repository is made; what of it stays in popnei_web joins
`docs/specs/worker/individuals.md`.

What was revised on 28 September 2026 for the order of the filters,
approved by the owner on 28 September 2026. The owner decided that day, "All
analyses should calculate the filters using the individuals kept", and
so reversed the decision of 26 September 2026 that put the filter of
individuals after every filter of the variants:

- **The filters of individuals act first.** The one list of the
  individuals kept is put on popnei's `Variants` before any filter of
  the variants, and those filters count over the individuals it keeps:
  the missing rate, the frequencies and the dosages of the LD of a
  variant are over those individuals, as plink 1.9 applies `--mind`
  before `--geno` (section 2).
- **Each individual's statistics are counted over every variant of the
  file**, before any filter, one pass per load; a change of a filter of
  the variants no longer takes them off, and the thresholds on the
  individuals no longer wait for a pass after one (section 4).
- **The analyses of the Variants step that read the filters change**:
  the histograms of the variants are over the individuals kept, and the
  counts of the filters of the variants hold the filters of individuals
  in their key, since those counts now depend on the individuals kept
  (section 4, "The checks of the Variants step" and "What each filter
  kept").
- **The LD filter with no distance locks only what reads the filters of
  the variants**, since the statistics read none (section 4).

The interfaces that change are the jobs of the histograms of the
variants and of the counts, which carry the list of individuals, and
that of the statistics, which carries no filter; the runner, which puts
the list first; and the store, which no longer refuses an analysis of
the counts that reads the filters of individuals. No part of the
project and no format of the project file changes; the key version of
the analyses whose result changes for the same key is raised (section
4). It changes the code of stage 3, which the plan of stage 4 carries
(`docs/specs/stage-4-open-points.md`). The options weighed, their costs,
and what would show the choice wrong are in section 2. Its architecture
review left one point open, where the filter of the regions of a BED
file goes once the application has it, which the owner decided the same
day: first, before the statistics of each individual and the filters of
individuals (section 13, point 15).

What was revised on 30 September 2026 for the specs of stage 5, the
analyses of the populations, not yet approved by the owner. Stage 5
fits the shape of section 4: the distances between populations and the
LD decay are two analyses more, each with its module, its panel, its
job and result, its handler in the runner, and three lines beside them;
the diversity gains a second call of popnei in its job. The folded site
frequency spectrum is not an analysis: it is a statistic of the
diversity's call, shown in a block of the diversity's panel, while the
owner decides whether it stays so (`docs/specs/analyses/sfs.md`, **Open
1**). What changes here:

- **The id of the example of section 4** is `"popDists"`, the id the
  spec of the distances gives, where it was `"fst"`; and the measure the
  heatmap of the distances draws joins the options left out of a key.
- **Section 9** names `heatmap.ts` and `line.ts` by the analyses that
  draw them, and `analyses/` the module of the spectrum, which the
  diversity calls.
- **Section 11** gains the memory of the LD decay, which grows with the
  largest distance the user types and stays with wasm after the
  analysis.
- **Section 13, point 16, proposed**: the calculation worker is started
  again after every LD decay, a third exception to point 2. It is
  **Open 1** of `docs/specs/analyses/ldDecay.md`, the owner's to decide;
  the specs are written with it meanwhile.

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
  filters: ProjectVariantFilter[];    // in the fixed order of their kinds, with parameters;
                                      // the LD filter's distance null until the user
                                      // types one, which locks what reads these filters
  filtersOff: ProjectVariantFilter[]; // those turned off, with their values, for the
                                      // switch that turns them on again; in no key or job
  individualFilters: IndividualFilter[]; // the same
  individualFiltersOff: IndividualThreshold[]; // the thresholds turned off, the same
  regions: RegionsSource | null;      // the BED file, whole once read (section 6)
  individuals: IndividualsSource | null; // the metadata or traits file
  // popgen: the column that defines the populations, or every
  //         individual in one population, and later the edits made
  //         with the lasso; gwas: the roles of the columns
  grouping: Grouping;
  analyses: AnalysisOptions[];        // the options of each, as pairs
                                      // { analysis, options }, since a
                                      // project file can hold any key
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
  | { kind: "failed"; error: SourceError };

// popnei refused the file, or the worker failed before popnei answered:
// it could not start, it crashed, or the browser could no longer read
// the file, reopenFailed. A refusal of popnei is the first kind.
// RunError, the ways a request to a worker fails, is in
// src/worker/protocol.ts.
type SourceError =
  | { kind: "popnei"; message: string }
  | { kind: "worker"; error: Exclude<RunError, { kind: "popnei" }> };

// The regions of a BED file, as the light worker read them, and their
// hash, made once when the read is recorded (section 3). The filter of
// the regions, { kind: "regions" }, holds nothing: keys.ts takes the
// hash from here when the filter is on.
interface RegionsSource {
  fileId: string;                     // the id of this load, new at every pick
  name: string;
  read:
    | { kind: "pending" }
    | { kind: "read"; regions: Regions; hash: string }
    | { kind: "failed"; error: BedFileError | { kind: "worker"; error: RunError } };
}

interface Regions {                   // as BED has them: from 0, the end excluded
  chroms: string[];                   // the chromosome of each region
  starts: number[];
  ends: number[];
}

interface IndividualsSource {
  fileId: string;                     // the id of this load, new at every pick
  name: string;
  csv: CsvOptions | null;             // how a CSV or TSV is read; null for xlsx
  typesSet: ColumnTypeOf[];           // the types the user set, [column, type],
                                      // kept by name when the file is read again,
                                      // and applied when the read allows them
  read:
    | { kind: "pending" }             // the light worker is reading it
    | { kind: "read"; table: IndividualsTable; columns: ColumnType[];
        found: CsvFound | null }      // how it was read; null for xlsx
    | { kind: "notGiven" }            // named by an opened project file saved while
                                      // the file was read or after it was refused;
                                      // no read is asked, the user loads it again
    | { kind: "failed";
        error:
          | IndividualsFileError      // the reader refused the file
          | { kind: "worker"; error: Exclude<RunError, { kind: "files" }> } };
}

// How a CSV or TSV is read. Each is "auto" until the user sets it; the
// read reports the three options it used, set or found, which the
// screen shows.
interface CsvOptions {
  encoding: "auto" | "utf-8" | "windows-1252";
  separator: "auto" | "," | ";" | "\t";
  decimal: "auto" | "." | ",";
}

// How a read of a CSV or TSV went: the three options it used, each as
// set or as "auto" found it, "utf-16" only from the mark at the start of
// the file; and the line of the first character it could not decode,
// shown as U+FFFD, for a warning of the screen, or null.
interface CsvFound {
  encoding: "utf-8" | "windows-1252" | "utf-16";
  separator: "," | ";" | "\t";
  decimal: "." | ",";
  undecodedLine: number | null;
}

// The type of each column, inferred and then as the user set it. A
// binary column holds its two values and which of them is coded 1,
// { kind: "binary"; one: "case"; zero: "control" }, which the GWAS and
// the Python script use (section 8).
type ColumnType =
  | { kind: "identifier" }
  | { kind: "binary"; one: string; zero: string } // the text of the two values
  | { kind: "continuous" }
  | { kind: "categorical" };

interface Reference {
  variants: VariantSource;            // the file the project was made with;
                                      // its fileId names no File
  checks: {
    analysis: AnalysisId;
    numbers: (number | null)[];       // saved in the project file
    keyVersion: number;               // saved: the analysis's, when it was run
    popneiVersion: string;            // saved: the versions of popnei and of
    appVersion: string;               // the application that calculated them
    settings: string;                 // never saved: the fingerprint of the
  }[];                                // analysis's settings in the file,
}                                     // made when it is opened (section 8)
```

The versions are kept with each check, and not once for the reference,
as the owner decided on 25 September 2026, so that a project file that
holds the numbers of two sessions names the right versions for each
(`docs/specs/core/projectFile.md`).

- **Immutable**, so that undo is keeping the previous values, and so
  that the screens know what changed by comparing references.
- **Plain data**, which is what the project file is: saving it is
  writing it as JSON, and opening a project file is validating that JSON
  into a `Project` (section 8).
- **The individuals table is in the project, whole.** It is small, and
  the populations edited in the application exist in no file of the user.
- **The regions of a BED file are in the project, whole, once read**, as
  the table is, with their hash, a part made from them when the read is
  recorded so that no key hashes them again (sections 3 and 6).
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
- **The filters are in a fixed order**, and the user does not order them,
  as the owner decided on 26 September 2026, with the filters of
  individuals first, as the owner decided on 28 September 2026, and the
  regions of a BED file before them, as the owner decided later that
  day. The regions come first, once the application has that filter;
  then the one list that the four filters of individuals make, which
  popnei's `filterIndividuals` puts on the `Variants` after the regions
  and before any other step (section 4); then the other filters of the
  variants, missing data, observed heterozygosity, the major allele
  frequency (MAF), and the LD pruning last. The project holds each list in its order and refuses a project
  file whose filters are out of it. The regions and the missing data,
  heterozygosity and MAF filters keep a variant by where it is or what
  it holds, so their order changes the counts of each filter and not the
  variants kept; the missing data filter comes before the MAF, whose
  frequency asks for no minimum of called data (`filterByMaf` of
  `js/popnei/src/variant.ts`); and the LD pruning comes last among them,
  because it keeps a variant according to the variants kept before it on
  its chromosome, so a filter after it would drop variants it kept in
  place of others. The filters of the variants, after the list, count
  over the individuals it keeps, as `filterIndividuals` of
  `js/popnei/src/variant.ts` says of every step after it: the missing
  rate of a variant is its missing genotypes over those individuals, and
  so are the frequencies and the dosages of the LD. So the variants the
  analyses read are judged over the individuals the analyses read, as
  plink 1.9 applies `--mind` before `--geno`, and the variants kept
  change with the individuals removed. Each individual's statistics,
  from which the thresholds on the individuals are set, are counted over
  every variant of the file, before any filter (section 4), or, with the
  filter of the regions on, over the variants inside the regions and
  before any other filter, so the list depends on no filter of the
  variants but the regions, which keep a variant by its position alone.
  The owner decided on 28 September 2026 that the regions go before the
  statistics and the list, so that a VCF of a capture with calls off the
  target, loaded with the BED of the target, has its individuals judged
  on the calls the analyses read (section 13, point 15). Not taken: the
  regions after the list, with the other filters of the variants. Seen
  in node with popnei's
  release `js-v0.1.0-dev.3` on 28 September 2026, on `panel.nei`: the
  111 individuals that the thresholds of 0.03 of missing genotypes and
  0.38 of observed heterozygosity keep, given to `filterIndividuals`
  before the missing data filter at 0.05, the heterozygosity filter at
  0.9 and the MAF filter at 0.95, gave 1,200 to 1,117 to 1,117 to 1,096
  variants; put after them, the order of 26 September 2026, the same
  list left the counts those filters give with every individual, 1,200
  to 1,152 to 1,152 to 1,128 (`docs/specs/worker/runner.md`, "How it is
  verified", has the script).
- **A filter turned off is kept apart**, with its values, in
  `filtersOff` or `individualFiltersOff`, so that turning it on again
  gives back what the user typed, a distance of the LD filter above all,
  which has no default. `filters` and `individualFilters` hold the
  filters applied and nothing else, so that what reads them, the keys
  and the jobs among them, never meets a filter the user turned off.

What was revised on 26 September 2026, approved by the owner that day.
The filters of the variants were in the order the user gave, with a
command to move one, `moveVariantFilter` of `docs/specs/core/project.md`,
which goes. Not taken: an order set by the user, which would allow the
filters of the variants after removing individuals, and the LD pruning
before another filter, at the cost of a control to move a filter that
works with the keyboard as well as with the mouse (WCAG 2.2, success
criterion 2.5.7), and counts that read differently in each order. Not
taken either: the filter of individuals first, which the draft of this
revision had, so that the variants' numbers were counted over the
individuals kept; it made each individual's statistics depend on the
filters of the variants and those filters on the individuals kept, and
the owner chose the statistics over the variants kept (section 4). No
project file the application wrote is refused by the fixed order: stage 2
has the missing data filter alone.

What was revised on 28 September 2026, approved by the owner on 28 September 2026.
The version of 26 September 2026 put the filter of
individuals after every filter of the variants, which counted over every
individual of the file, and counted each individual's statistics over
the variants those filters kept; the owner had chosen it so that an
individual's missing genotypes were counted among the variants analysed
(section 13, point 8). The owner reversed it on 28 September 2026, "All
analyses should calculate the filters using the individuals kept", and
took the first of three options:

- **The filters of individuals first, their statistics over every
  variant of the file**, taken. The statistics need one pass per load,
  and no change of a filter of the variants takes them off, so the
  thresholds on the individuals never wait for a pass after one. What it
  costs: an individual's missing rate counts the bad variants that the
  missing data filter would drop, so an individual is judged over
  variants the analyses do not read; the variants kept, their counts and
  the histograms of the variants change with every change of a filter of
  individuals, and need a pass again after one; and the code of stage 3
  changes (section 4).
- **The lists first and the thresholds last**, the statistics counted
  over the variants the filters keep among the individuals the lists
  keep. popnei takes one `filterIndividuals` on a `Variants` and refuses
  a second, so the analyses would be given the final list first and
  their filters of the variants would count over fewer individuals than
  those the statistics were counted with: the thresholds would be set
  from numbers of other variants than the analyses read, the fault this
  order was to mend, and the statistics would still need a pass after
  every change of a filter of the variants.
- **The order of stage 3 kept**, which changes no code. The filters of
  the variants would go on counting over individuals the analyses do not
  read, so that a variant missing in the individuals the thresholds
  remove is dropped for them, which the owner judged the worse fault.

What would show the choice wrong: users whose thresholds on the
individuals remove individuals only for the variants the missing data
filter drops, a panel with some loci missing in most individuals, who
would then set the threshold of missing genotypes of the individuals
well above plink's 0.1 of `--mind` to keep them; that would argue for
counting the statistics over the variants a missing data filter keeps.
The same fault is sure for a file whose calls lie partly outside the
regions the user studies, a VCF of an exome or of a capture with calls
off the target: plink 1.9 removes the variants outside the regions
(`--extract`, `--chr`, `--from`/`--to`) before `--mind`, and counted
over every variant of the file an individual's missing rate would count
the off-target calls no analysis reads. The filter of the regions keeps
a variant by its position alone, so it can come before the statistics
with no loop between the two, and the owner decided on 28 September
2026 that it does, once the application has that filter (section 13,
point 15).
The tests that tie the order to popnei's numbers are the runner's, with
the counts above, and the store's property that no request of the
statistics carries a filter (`docs/specs/core/store.md`, "How it is
verified").

## 3. Results, and how they go stale

A result is never stored in the project. It is stored in a cache, under
a key that is a hash of everything it was calculated from. The inputs of
every key are:

- the load of the variant file: its file id, which the page gives each
  load and which is new every time the user picks a file, the same file
  picked again included, and its read options (section 2). Nothing else
  of the file goes in: not its name, size or date of last change, and no
  hash of what it holds;
- the filters of variants and the filters of individuals that the
  analysis reads, in their order, with their parameters, those that are
  on and not those kept while off (section 2): all of them for
  every analysis of sections 5 to 8 of `docs/functionality.md`, and not
  the filters that the checks per variant and per individual of its
  section 3 serve to set, whose histograms would otherwise be removed at
  every move of a threshold: the statistics of each individual read no
  filter, and the histograms of the variants the filters of individuals
  alone, which act before the filters of the variants they serve to set
  (section 4, `filtersRead`). The filter of the
  regions of a BED file enters the key with the hash of the regions, which
  `keys.ts` takes from the project's regions when the filter is on, so
  the hash is held in one place; and the list of the individuals that the filters
  of individuals keep is in no key, since it is made from the load, the
  version of popnei and the filters of the individuals, which are
  (section 4), and, until 28 September 2026, the filters of the
  variants, over which the statistics of each individual were counted;
- the parts of the individuals table and of the grouping that the analysis
  uses;
- its own options;
- the key version of the analysis, a number in its module that is raised
  when what its result means changes for the same inputs, a new default of
  popnei or a bug fixed in how it is called;
- the version of popnei, which the calculation worker reports when it
  starts, because a result calculated by another version is not the same
  result. It is what popnei's `version()` gives, which is only as good as
  popnei raising it at each release: `js-v0.1.0-dev.1` and
  `js-v0.1.0-dev.2` both give "0.1.0", so a key made with one is a key
  made with the other. The owner agreed on 25 September 2026 that popnei
  raises it with every release, and it is asked of popnei
  (`docs/specs/worker/runner.md`).

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

What was revised on 26 September 2026, approved by the owner that day.
One input joins the keys, and one is left out. The regions of a BED file
enter through their hash, which the key takes from the project's regions
while their filter is on, and not as the regions themselves, which the
canonical form would write into the text of every key that reads the
filters: for 200,000 regions, as many as an exome panel has, that text is
5.8 MB, and it took 40 ms to write and 80 ms to hash, in node 26.8.2 on
the owner's Mac, with `canonical` and `sha256Hex` of `src/core/keys.ts`,
on 26 September 2026. The memo of the keys, which keeps the text of each part of the project
already written (`docs/specs/core/keys.md`), spares the writing and not
the hashing, so
every command would have cost 80 ms for each analysis that reads the
filters, most of them, on the page, where a click waits for it. Made once,
when the read is recorded, the hash costs those 120 ms once per load of
the BED file. The list of the individuals kept is left out of the keys:
a key that held it, in place of the thresholds, would let two thresholds
that keep the same individuals share their results, at the cost of a key
made from a result in the cache rather than from the project alone.

## 4. An analysis is a module

Each analysis is one module, with the same shape, in both applications:

```ts
interface AnalysisDef<J, R> {           // J: its request; R: its result
  id: AnalysisId;                        // "pca", "diversity", "popDists", "gwas"...
  app: ("popgen" | "gwas")[];
  defaults: JsonObject;                  // its options, as the project holds them
  keyVersion: number;                    // raised when the meaning of its result changes
  filtersRead: { variants: boolean; individuals: boolean }; // which filters it reads
  parseOptions(o: unknown, formatVersion: number): Result<JsonObject, string>;
                                         // its options read from a project file
  keyInputs(p: Project): unknown;        // the parts of the project it depends on,
                                         // beyond the load and the filters (section 3)
  needs(p: Project): string | null;      // why it cannot run yet, or null
  run(p: Project, c: WorkerClient<J, R>): Run<R>; // the request to the worker
  warnings(r: R, p: Project): Warning[]; // raised by the data only
  checkNumbers(r: R): (number | null)[]; // kept in the project file (section 8)
  numCheckNumbers(p: Project): number | null; // their count, checked at an opening
  script(p: Project): string;            // its lines of the Python script
}
```

and its panel of options and its results in `src/ui`. `WorkerClient` is
an interface that core declares, since core has no DOM and cannot name
the browser's `Worker`; the store makes one for each request from the
`run` of the client of `src/worker`, bound to the key of that request,
and looks in the cache before it calls `run`, so that an analysis neither
makes the key of its result nor reads the cache. The bound client also
makes the keys of the intermediate results the request needs, the
kinship from stage 7, with the load, the filters and the version of
popnei that every key holds (`docs/specs/core/store.md`), and, from stage
3, gives the list of the individuals the filters of individuals keep
(below, "The checks of the Variants step"). `parseOptions`
and `filtersRead` were added with that spec, on 24 September 2026:
the options of an analysis are its module's to check when a project file
is opened, and the checks per variant and per individual, from which the
thresholds of the filters are chosen, do not read the filters they are
used to set. `numCheckNumbers` was added on 25 September 2026, when the
owner decided that a project file whose check numbers are not as many as
its analysis gives is refused as damaged at the opening, since only the
module of the analysis knows how many it gives. Adding an
analysis is adding its module and its panel, and three lines beside
them: its definition in the list of the analyses of `src/core/apps.ts`,
the step it is shown in in `POPGEN_ANALYSIS_STEPS` of the same file, and
its title in `src/ui/analyses/titles.ts`, by which the shell names it;
nothing else changes. This is the
piece the work is split into, and what lets an analysis be tried, changed
or dropped without touching the others.

`needs` is what locks an analysis with its reason: "reading the file"
while the variant file or the individuals file is being read (section 6),
"the individuals file lacks 12 individuals of the variants", a trait not
chosen. Before it, the store asks what every analysis needs of the
project (`docs/specs/core/project.md`): a variants file read; for an
analysis that reads the filters of the variants, an LD filter with its
distance, from 28 September 2026, which locked what reads either list of
filters until the filters of individuals came first that day; and for
one that reads the filters of individuals, lists popnei accepts. `run` gives its job the filters of
the variants through `jobFilters` of the same spec, which gives them as
popnei takes them, every LD filter with its distance, and throws a
defect for one without, which that lock keeps from every `run`.

An application is a list of steps and a list of analyses. The two
applications share the steps of the variants and the analysis of the PCA.

**An option that changes only how a result is drawn is left out of its
key**, from stage 4: the column that colours the points of the PCA, the
components on its axes, and whether it is drawn in 2D or 3D
(`docs/specs/analyses/pca.md`); from stage 5, the measure the heatmap of
the distances between populations draws, Hudson's Fst or Jost's D, both
of which one pass calculates (`docs/specs/analyses/popDists.md`). They are options of the analysis, as
`AnalysisOptions` holds them, so a project file saves them and an undo
gives them back; `keyInputs` leaves them out, since they are not inputs
of the result, and a change of them is a command that removes no result.
Section 3 asks a key to hold every input of a result, which this keeps.
The option not taken was to keep them as state of the screen, lost at a
reload and missing from a reopened project and from the report of stage
6, which draws the plot as the user set it.

### The checks of the Variants step, and the individuals they keep

The Variants step shows, before the thresholds are chosen, each
individual's proportion of missing genotypes and observed heterozygosity,
as a table and as histograms, and the histograms of the statistics of the
variants (`docs/functionality.md`, section 3). These are the checks.
popnei gives their numbers, `calcPerIndividualStats` and
`calcPerVarDistribs` of `js/popnei/src/stats.ts`, and filters individuals
only by a list, `filterIndividuals` of `js/popnei/src/variant.ts`, of
which one can be put on a `Variants`, popnei's handle on the opened file. The filters of individuals by a threshold are the
application's arithmetic on popnei's numbers (`docs/build-order.md`,
section 4), and every analysis has to read the individuals they keep.

- **Each check is an analysis**, a module of the shape above, of both
  applications, shown in the Variants step: the statistics of each
  individual, `individualChecks`; the histograms of the variants,
  `variantChecks`; and the counts of what each filter kept,
  `filterCounts`, below. Each runs when the user
  presses its button, as every calculation does
  (`docs/specs/core/store.md`), with the states, the progress, the stop and
  the undo of any analysis.
- **The statistics of each individual are over every variant of the
  file**, before any filter, as the owner decided on 28 September 2026
  (section 2): `filtersRead` is `{ variants: false, individuals: false
  }`, and their pass has no filter. So one pass per load gives them, no
  change of a filter takes them off, and once they are calculated the
  individuals kept are known whatever the filters of the variants. What
  it costs: an individual's missing rate counts the variants the missing
  data filter drops (section 2).
- **The histograms of the variants are over the individuals kept**, and
  every variant of the file: `filtersRead` is `{ variants: false,
  individuals: true }`, and their pass has the list of the individuals
  kept and no filter of the variants. Each shows the number its filter
  keeps a variant by, counted as that filter counts it, over the
  individuals kept (section 2), so a threshold read on a histogram keeps
  what the histogram shows. No threshold of the variants moved takes
  them off; a change of a filter of individuals does, as it changes the
  numbers they show, and they need a pass again, which is the cost; with
  a threshold on the individuals, their Run waits for the statistics of
  each individual as any analysis that reads the filters of individuals
  does (below). They are of one population of the individuals kept,
  with `minNumIndividuals` 0, so that popnei counts the variants with few
  called genotypes too, which its default of 20 called individuals would
  leave out, and which the missing data filter is there to find. popnei
  has no histogram of the missing rate of each variant in
  `js-v0.1.0-dev.2`; it is asked of popnei (section 6). Decided by the
  owner on 28 September 2026, who confirmed this reading of their words
  of the order of the filters. The option not taken, the histograms over
  every individual of the file as until 28 September 2026, one pass per
  load, would show numbers the filters no longer count by, and the user
  would set a threshold from them.
- **Core makes the list of the individuals kept**, from the result of
  `individualChecks` in the cache and the four filters of individuals, in
  their fixed order: the list to keep, the list to remove, the threshold
  on the missing rate, and the threshold on the observed heterozygosity,
  each keeping an individual whose number is at most its threshold, as
  popnei's filters of the variants do. An individual with no called
  genotype has no heterozygosity, and the filter by
  heterozygosity removes it, as the owner decided on 26 September 2026;
  since 28 September 2026 that is an individual with no called genotype
  in the whole file.
  It gives the list in the order of
  the variants file, and how many individuals each filter was given and
  kept, which the step shows beside each filter as it is set, with no
  pass. The store makes the list once for each project, as it makes the
  keys, and hands it to an analysis through the client bound to its key,
  the object the analysis sends its request through, as a field of it,
  `individuals`, which is `null` when the filters remove nobody; the
  job carries it, and the runner puts it on the `Variants` before the
  filters of the variants, as its `filterIndividuals`, from 28 September
  2026 (section 2). The result of
  `individualChecks` is under a key that the current project gives, so
  the cache does not drop it while the project gives that key
  (`docs/specs/core/cache.md`).
- **An analysis that reads the filters of individuals waits for their
  statistics.** While the project has a threshold on the individuals and
  `individualChecks` has no result under the key the project gives it,
  which holds the load and no filter, so after a new load, the opening
  of a project file, or the cache dropping them, a
  Run of such an analysis starts the calculation of the statistics first,
  and the analysis shows that it waits for them, "Calculating the
  statistics of each individual, which the thresholds of the individuals
  need"; its own request is sent when they arrive, if the project still
  gives the same keys, and it ends with their failure if they fail or are
  stopped (section 5). An analysis cannot start when the filters keep no
  individual, which popnei would refuse, known once the statistics are
  there. This lock stops the Run and nothing else. It depends on the cache and
  not on the project alone, so the key of the analysis is made whatever
  the lock, since it holds the thresholds and not the list (section 3),
  and a result in the cache under that key is shown: once the cache has
  dropped the statistics, a diversity still
  in the cache is `done`, as section 3 asks, and only a new Run waits for
  the statistics. The store works these locks out again when the cache
  changes, a result of `individualChecks` put in or dropped, and not only
  when the project changes, as it does the other reasons
  (`docs/specs/core/store.md`); otherwise the analyses would stay locked
  after the statistics arrive, until the next command.
- **A population that loses all its individuals to the filters** is left
  out of the job, since popnei refuses an empty population, and the
  diversity names it before the run, in the panel that shows its Run
  button, and after it, in the warning of its result that names a
  population with no individual left (`docs/specs/analyses/diversity.md`,
  `populationNotInResult`).
  How many check numbers the diversity gives, its `numCheckNumbers`, is
  known when a project file is opened if its filters of individuals are
  lists, which the project holds, and not if one is a threshold, whose
  list needs statistics not yet calculated for the new load; then it is `null`, and
  the count is not checked, as the diversity's spec has it already.

### What each filter kept

popnei gives, with every result, how many variants each filter of the
variants was given and kept in that pass, `passStats.filtering` of
`js/popnei/src/variant.ts`, under the kind of the filter; the filter of
individuals has no entry there, since it drops no variant. The step shows
those counts beside each filter, in the order of section 2.

- **The counts are the result of an analysis of their own,
  `filterCounts`**, whose key holds the filters of the variants and those
  of the individuals: the list of the individuals kept comes before the
  filters of the variants, which count over it (section 2), so a change
  of a filter of individuals changes their counts. Its `filtersRead` is
  `{ variants: true, individuals: true }` from 28 September 2026, and a
  Count with a threshold on the individuals waits for their statistics,
  as any analysis that reads the filters of individuals. The Count button of the step runs its
  pass, with `iterBlocks`, whose `passStats` give the counts when the
  filters keep no variant too, which is when the user most needs to see
  which filter dropped them all. `calcPerIndividualStats`, which copies
  less out of wasm, two numbers per individual where `iterBlocks` copies
  every block of genotypes, throws "the pass gave no variant" then, as
  every calculation of popnei does, seen by the architecture review on
  popnei's release `js-v0.1.0-dev.2`. If the pass of `iterBlocks` takes
  much longer than a pass of the diversity (section 11), popnei is asked
  for a function that only counts.
- **Every pass over the project's filters as they are fills them too.**
  When a result arrives whose pass had the filters of its request's
  project, the store puts its counts into the cache under the key of
  `filterCounts` for that project. The store is given a function that
  finds the number of variants of the file in a result, `numVarsOf` of
  `src/core/apps.ts`; it is replaced by `countsOf`, which finds the counts
  of the filters too, and so every
  result of the protocol carries the counts of its pass, popnei's
  `passStats.filtering`, where `DiversityResult` carries only `numVars`
  and `numVarsRead` (`docs/specs/worker/protocol.md`). It gives, of any
  result, the number of variants of the file, the variants its first
  filter was given, and the counts of its filters only when its pass had
  the filters of its project, both lists of them. So the diversity, or a
  file written, fills the counts, since its pass has the list of the
  individuals kept and the filters of the variants of its project; an
  undo brings them back as it brings any result; the statistics of each
  individual, whose pass has no filter since 28 September 2026, the
  histograms of the variants, which read no filter of the variants, and
  the PCA, whose pass can have filters of missing data, MAF and LD of
  its own in the place of the dataset's (`pcaFilters` of
  `docs/specs/analyses/pca.md`), do not.
- **The notice leaves the counts out.** Their key holds every filter of
  the variants and of the individuals, so a change of any of them takes
  off the counts of all of them, which the
  user sees beside the filters as they change one, and a notice at every
  move of a threshold would say only that.
- **The counts of the filters of individuals are core's**, above, and need
  no pass.

What was revised on 26 September 2026, approved by the owner that day.
These two subsections are new; `docs/specs/worker/protocol.md` had the
calculation worker make the list of individuals, and the owner had the
diversity locked by any filter of individuals until this stage. Options
not taken:

- **The list made in the calculation worker**, as `protocol.md` had it:
  the runner would call `calcPerIndividualStats` before an analysis with a
  threshold on the individuals, or keep its result among the intermediate
  results until the next restart. It changes no interface. It costs a
  pass over the file for each analysis, or for each restart after a
  cancel; a list made twice, in the runner for the job and on the page for
  the counts beside the filters, by two pieces of code that must agree;
  and a core that cannot know before a run which populations lose their
  individuals, or that none are kept.
- **The statistics of each individual over every variant of the file**,
  before any filter, which the draft of this revision recommended: one
  pass per load, and the individuals kept known at once whatever the
  filters of the variants. The owner chose the variants the filters keep,
  so that an individual's missing genotypes are counted among the
  variants analysed, and not raised by the bad variants the missing data
  filter drops; the cost is a pass after every change of a filter of the
  variants.
- **The statistics of each individual recorded into the source of the
  variants file**, as its number of variants is, when they were to be
  counted over the file as read. The analyses would read
  them from the project and nothing would change in their interface; the
  project would hold two numbers per individual calculated in a pass, which
  the project file would save or leave out by a rule of its own, and the
  pass would still need the states, the progress and the stop of an
  analysis.
- **The counts of a Count button alone**: a pass of minutes over a
  gzipped VCF that the diversity has just made with the same filters.
  **The counts of other passes alone**: none before the first analysis,
  while the user is setting the filters. **The counts made on the page from
  the values of each variant**, which popnei does not give: every count at
  once as a threshold moves, for 8 bytes per variant and statistic, 240 MB
  for three statistics of ten million variants, above the 256 MB bound of
  the cache with the other results, and no count for the LD pruning or the
  regions, which depend on more than a variant's own numbers.

What would show these choices wrong: a runner test in node, on
`panel.nei`, that the counts filled from a diversity are those of a Count
pass with the same filters and the same list; and three tests in node,
which together tie the list core makes to popnei's numbers. Users who
waited often for the statistics after moving a threshold of the
variants, which the version of 26 September 2026 named here as what
would argue for counting them over every variant of the file, are no
longer possible: the owner decided so on 28 September 2026 (below).

The three tests of the list are split between core and the runner,
since a test of the worker imports no function of core, and a test of
core does not call popnei:

- **A test of core**, that the list `individualsKept` makes from popnei's
  statistics of each individual of `panel.nei`, over its every variant,
  holds the 116, 42 and 111 individuals of
  `docs/specs/core/individualsKept.md`, where the statistics over the
  variants the missing data filter at 0.05 kept gave 125, 48 and 119
  until 28 September 2026. It reads those statistics from
  `e2e/fixtures/panel_individual_stats.json`, which
  `e2e/fixtures/make_fixtures.mjs` writes with popnei.
- **A runner test**, that the fixture holds the statistics the runner
  gets from popnei's release with no filter, exactly, so that a release that
  gives others fails there and the fixture is written again.
- **The runner's tests with the lists of 116 and of 111**, each made in
  the test from the runner's own statistics as core makes it, that the
  diversity of popnei over the individuals of the list, put before the
  missing data filter at 0.05, gives the numbers of
  `docs/specs/analyses/diversity.md`, "How it is verified", and the
  counts of that filter over those individuals, 1,200 to 1,103 and 1,200
  to 1,117.

What was revised on 28 September 2026, approved by the owner on 28 September 2026,
for the owner's decision of that day to put the filters of
individuals first (section 2). The statistics of each individual are
counted over every variant of the file, the option the draft of 26
September 2026 recommended and the owner then set aside, and the
histograms of the variants and the counts of the filters read the
filters of individuals. What changes in the code of stage 3, each with
its spec: the `filtersRead` of `individualChecks`, `{ variants: false,
individuals: false }`, whose job carries no filter
(`docs/specs/analyses/individualChecks.md`); that of `variantChecks`,
`{ variants: false, individuals: true }`, whose job carries the list
(`variantChecks.md`); that of `filterCounts`, `{ variants: true,
individuals: true }`, whose job carries the list, and the store, which
refused an analysis of the counts that read the filters of individuals
and now refuses an analysis of the statistics that reads any filter
(`filterCounts.md`, `docs/specs/core/store.md`); `countsOf` of `src/core/apps.ts`, for which the statistics no longer
fill the counts, and the order of the analyses there, the statistics of
each individual first (`docs/specs/entry.md`); the runner, which puts the list before the filters
(`docs/specs/worker/runner.md`); the key version of `diversity`, raised to
2, since it gives another result under the same key when the project
has a filter of individuals, and a project file of stage 3 would
otherwise compare its check numbers as if the file had changed; and
those of `individualChecks`, `variantChecks` and `filterCounts`, raised
with it to mark the change, although their keys and the fingerprints
of their settings (`settingsFingerprint` of `docs/specs/core/keys.md`)
now hold other filters, so that a check number of stage 3 is compared
only where the result is the same;
the fixture of the statistics and its script; and the order of the
Variants step, whose filters of the individuals now come before those
of the variants (`docs/specs/steps/variants.md`). The option not taken
for the histograms of the variants, over every individual of the file,
is above. The lock of the LD filter with no distance is not a change of
the code of stage 3, which gave the filter 10,000 base pairs from its
switch: stage 4 adds it, for what reads the filters of the variants
(`docs/specs/core/project.md`, `variantFilterNeeds`).

## 5. The workers and their messages

The page and each worker talk through typed messages
(`docs/technology.md`). The page's side of both is one client,
`src/worker/client.ts`, which keeps a queue for each worker.

- **A request** names the job, the key and the inputs. Each worker runs
  one request at a time, because the wasm of popnei and the files wasm
  have one thread each, and the client keeps the others in the queue of
  that worker.
- **A request that the current project no longer asks for is stopped,
  unless the change is undone**, as the owner decided on 24 September
  2026. A change that gives an analysis another key while its request
  waits or runs is told to the user in the notice of that change, with its
  action, Undo, or Redo when the change was an undo, as the owner decided
  on 25 September 2026 (`docs/specs/core/store.md`): "The ongoing calculations will be stopped unless you undo the
  change." The store stops such a request only when keeping it would cost
  the user something: when the notice is closed, when the next change
  replaces it and does not give the request's key back, or when the user
  asks for a new calculation, which would otherwise wait behind it. There
  is no deadline, so a user who reaches Undo late, with the keyboard or a
  screen reader, does not lose the minutes the calculation had run (WCAG
  2.2, success criterion 2.2.1). A request that waits leaves the queue at
  no cost, and one that runs ends its worker, a restart (below) that opens
  the variants file again; the calculation of the new settings starts when
  the user asks for it, as every calculation does. An undo while the
  notice is up gives the keys back, and the requests go on. A change of
  the load of the variant file is the exception, below. The store holds the handle of every run and cancels
  them (`docs/specs/core/store.md`); `src/ui/runs.ts` only awaits their
  outcomes. The option not taken was to let a running request finish, its
  result kept for a possible undo, while the request of the new settings
  waited behind it in the queue of the one calculation worker, for minutes
  in the case of a GWAS.
- **The result** comes back as typed arrays, with its key, and goes into
  the cache. It is shown only if the current project still gives that
  key; if the user changed something meanwhile and the request finished
  before it was stopped, it waits in the cache for an undo.
- **Progress** comes from popnei's `Variants.onProgress`, which gives
  four numbers during a run: the bytes of the variant file that the
  current pass has read, the bytes of the file, the pass, and the passes
  of the run, which popnei's `numPassesOf` gives before the run starts, so
  that the bar does not go from full to empty at the second pass of a run
  that makes two.
  The worker passes them on to the page (section 6).
- **Cancelling** a request that is running ends its worker and starts a
  new one. While a calculation runs inside wasm, the worker cannot read a
  message that asks it to stop, and without `SharedArrayBuffer`, which
  GitHub Pages does not allow (`docs/technology.md`), the page has no
  other way to tell it. Starting a worker again costs the loading of the
  wasm, from the browser's cache after the first time, and the
  intermediate results the worker held, which are made again when asked
  for. The page sends the new worker the `File` objects again, which costs
  nothing, since a `File` crosses as a handle. The new calculation worker
  then opens the variant file again, which reads its header, or the index
  at the end of a `.nei` file, and not the whole file (section 6).
  A crash, a trap of the wasm, restarts the worker in the same way.
- **A change of the load of the variant file restarts the calculation
  worker**, a new pick, an undo or a redo of one, before the first request
  on the new load. The memory of wasm grows and never shrinks, so a
  worker that kept the old load open, or had freed it, would still hold
  the room of that file; restarted, it gives that memory back, and it
  only ever holds one open file, one `Variants` of popnei. What it costs:
  an undo to the previous load opens that file again, which reads its
  header, not the whole file; the results of
  the previous load are still found in the cache of the page, with no
  calculation, and only a new calculation on it waits for the reopening.
  The intermediate results of the old load, the kinship from stage 7,
  are lost with the worker, and they belong to a load no longer
  asked for. So the store stops every request in flight at the change of
  the load, and the notice of the change says they were stopped rather
  than that they will be stopped unless the change is undone, as the
  owner decided on 25 September 2026: an undo brings back the old file and
  the results that had ended, and only the requests stopped are run
  again (`docs/specs/core/store.md`). The option not taken was to keep
  the old file in the worker until those requests ended or the notice was
  closed, which would leave the new file unusable meanwhile, minutes for
  a GWAS, and hold the memory of both files.
- **Writing the filtered variants is a request of the calculation worker,
  and not an analysis.** Its answer is the file, as a `Blob`, the
  browser's object for a file made in the page, as large as the variants
  kept, which the user saves from the step (section 6), and
  which never goes into the cache: one file can be larger than its bound of
  256 MB, and it is on the user's disk once saved. The store tracks a write
  as it tracks a calculation, under a key of the load, the filters and the
  format, so it has a progress and a Stop, a cancel restarts the worker, a
  change of a filter while it runs leaves it behind with the words of the
  notice, "The writing of the file will be stopped unless you undo the
  change.", and a Run stops it as it stops any calculation left behind. A
  write that ends after the change and before its stop is dropped, not
  saved, since its file would hold other variants than the step shows. A
  calculation asked for while a file is written waits behind it, in the
  queue of the one calculation worker.
- **A request can wait for the statistics of each individual.** A Run of
  an analysis that reads the filters of individuals, while a threshold is
  set and the statistics of the current load are not in the cache,
  starts their calculation first (section 4): once per load, since 28
  September 2026, when they stopped reading the filters of the variants,
  and again only after the opening of a project file or when the cache
  has dropped them. The store
  sends the analysis's own request when they arrive, if the project still
  gives both keys; until then the analysis is running, with the progress
  of the statistics, and a Stop stops both. A change of the project that
  gives either request another key leaves both behind, as any calculation
  is. So the one calculation worker runs the pass of the statistics and
  then the analysis, one request after the other, and the user presses
  Run once.

The calculation worker keeps, under keys as the results are, what several
analyses reuse: the kinship, and the principal components that the GWAS
takes as covariates, from stage 7. Not the variants kept by the LD
pruning of the PCA, which this section named until 27 September 2026:
popnei's pruning, `filterByLd` of `js/popnei/src/variant.ts`, is a step of
a `Variants` made again at every pass, and popnei has no way to hold the
variants it kept. Writing the pruned variants as a `.nei` file in memory
and opening it again holds the whole file in the memory of wasm, which
never shrinks. So each PCA with an LD filter prunes inside its own pass, which it makes in
any case; what keeping them would spare is the calculation of r², whose
time is measured in stage 4. If it is large, the option to weigh first
is one popnei's main has had since 27 September 2026, after the release
`js-v0.1.0-dev.2`: the chromosome and the position of each variant the
pruning kept, from a pass of `iterBlocks`, given back as regions of one
base pair to `filterByRegions` (`js/popnei/src/variant.ts`), which as the
first filter hands on only those variants. The pruning counts over the
individuals kept, since the filters of individuals come first (section
2), so a change of the filters of individuals prunes other variants,
and reusing them pays only for a PCA made again with the same filters
of both kinds. The change is large: on `panel.nei`, the missing data
filter at 0.05 and the pruning at r² 0.1 within 50,000 base pairs keep
532 variants over every individual and 298 over the 111 individuals of
the thresholds of `docs/specs/core/individualsKept.md`, since r² is
counted over fewer individuals (node, 28 September 2026, popnei
`js-v0.1.0-dev.3`); so the variants a PCA reads move with the
thresholds on the individuals. Until 28 September 2026 the pruning counted over every
individual of the file, and a change of the filters of individuals kept
the same pruned variants, which was when reusing them paid. What it
costs, not weighed yet: a pass more the first time, the one filter of
the regions that a `Variants` takes, which the dataset's BED file may
already hold, and two variants at one position, which regions cannot
tell apart. Otherwise popnei is asked for a way to keep them. Decided
by the owner on 27 September 2026, who judged that a PCA is seldom made
again the same way and left what use shows for later; the option not
taken, asking popnei now for a way to keep them
(`docs/specs/stage-4-open-points.md`). So the calculation worker keeps
no intermediate result before stage 7.

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
11); and two workers that both needed the kinship would each make it. A
pool would win if the walking skeleton showed users waiting on several
independent analyses whose intermediate results are small.

## 6. The files of the user

The page keeps every `File` the user picked in a map from file id to
`File`, in the worker client, and sends it to a worker that needs it, and
again to a worker that was restarted. A `File` stays in the map after
another is loaded in its place, so that an undo of the load finds it. The
project holds only the id and the identity (section 2).

### The variant file, read by ranges

The variant files of the users tend to be huge and the memory of a tab is
limited, so the file is read by ranges, as the owner decided on 24
September 2026, with the release of popnei `js-v0.1.0-dev.2`, made on 25
September 2026, which does it (`docs/specs/worker/runner.md`):

- **The worker gives popnei's `openVcf` and `openVars` the `File`
  itself**, which popnei reads in ranges of 4 MiB at most through
  `FileReaderSync.readAsArrayBuffer`, a call that exists only in workers
  and returns the bytes at once. There is no source of bytes of our own,
  and our code copies no byte of the file. The VCF reader reads forward;
  the reader of a `.nei` file seeks, since arrow IPC keeps its index at
  the end of the file.
- **Opening the file reads what says what it holds**: the first range of
  a VCF, which holds its header, and the index at the end of a `.nei`
  file. Every pass reads the file again from the disk.
- **Only a few ranges are in memory at a time**, so the size of a file is
  limited by the time of a pass and not by memory (section 11).
- **Progress comes from popnei's `Variants.onProgress`** (section 5).
- **A change of the filters opens the file again.** popnei puts a filter
  on a `Variants` for good and cannot take one off, so when a request
  asks for other filters than those the `Variants` holds, the worker
  frees the `Variants`, opens the `File` again, which reads its header
  and not its variants, and puts the new filters on it.
- **A restart opens the file again** in the same way, by reading its
  header (section 5).

What stays: **every analysis reads the file again**, one pass or two, and
a pass over a gzipped VCF decompresses the whole of it each time, which
is slow. Converting the VCF to a `.nei` file once, which is read many
times faster (`docs/functionality.md`, section 3), is what the
application steers the user to. And the results that are large by
themselves stay large whatever the reading (section 11).

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
which locks what needs it with the reason "Reading pops.csv.". The light
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
  its encoding; a character that could not be decoded is shown as �, and
  the read reports the line of the first, which the screen names in a
  warning. Changing one is a command that sets `csv` in the source
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
- **An xlsx** is read by calamine in the files wasm, the package of
  xlsx_rs, loaded on first need (below), and its cells go through the
  same inference.
- **Every individual of the variants must be in the file.** Core checks
  it, in the `needs` of each analysis that uses the file, against the
  individuals the calculation worker read from the variant file, and the
  screen names the missing ones (`docs/functionality.md`, section 4). The
  reader does not check it, since it does not know the variants.

With a CSV, the light worker loads no wasm at all.

### Who asks for a read

A source is read only when the page asks a worker to read it: the
calculation worker opens the variants file, the light worker reads the
individuals file. The one who asks is the entry of the page (section
1, "What was revised on 25 September 2026"), and it asks by one rule, decided by the owner on 25 September
2026: after every change of the project, a command, an undo, a redo or
an opening, it looks at the present project and asks for a read of each
source whose read is pending and has no read under way. A read is under
way from the moment the entry asks for it until its answer comes back,
and it is known by the load id of the file and, for the individuals file,
by the options of its CSV. Every read gets an answer, also when its
worker crashes or is started again: the client fails the request that
was running, which is recorded as a read that failed because its worker
failed, sends the requests that were waiting to the new worker, and
fails them all when the worker cannot start
(`.claude/skills/coding/worker.md`, "The queue" and "Errors are
values"). So no read stays under way for ever, and none keeps a pending
source from being asked for again.

The read of a variants file is asked for as that of any other file. The
worker client opens the file on the calculation worker, which it starts
again first when the load changed (section 5), and the worker sends back
the individuals and the ploidy as soon as the file is open. An undo back
to a load already read finds its source read, and so asks for nothing;
the client opens that file again before the next request on it, and
what the worker sends then is not recorded, since the source is already
read (`docs/specs/core/project.md`, "The records").

So a source that a change leaves pending is always read, whatever made
it pending: a new pick, a change of the options of a CSV, an undo that
gives back options of a CSV that were never read, a redo, an opening.
The option not taken was to cancel no read and record every read that
comes back into the projects of the history that hold its source, so
that an undo would find its options already read. It would miss the
reads an opening needs and those lost when a worker crashes, and it
would keep the light worker reading files for options no project asks
for any more.

A source whose `File` the page does not hold, which a project file could
name, cannot be read; what the project file writes of a pending read is
decided with it, in stage 2 (`docs/specs/core/project.md`, "The cases").

### The regions of a BED file

A BED file lists regions of the genome, a chromosome, a start and an end
on each line, and the filter of the regions keeps the variants that fall
inside one of them (`docs/functionality.md`, section 3). The filter is
popnei's, as the owner decided on 26 September 2026, since the application
cannot put a filter of its own inside popnei's pass over the file; popnei
has none in `js-v0.1.0-dev.2`.

- **The file is read in the light worker**, by a reader of ours in
  TypeScript, `src/worker/regions/`, pure as the reader of the
  individuals file is, and its load goes as that file's does: a load id,
  a source pending until its read is recorded, the entry asking for the
  read by the rule above. The reader takes the three first columns of each
  line, separated by tabs, a start counted from 0 and an end left out, as
  the BED format has them; it skips the lines that start with `#`,
  `track` or `browser`; and it refuses a line it cannot read, naming its
  number, and a file larger than a bound of its spec, whose value is set
  there.
- **The regions go into the project whole**, with their hash, made once
  when the read is recorded (section 3). The filter of the regions,
  switched on in the step, holds no hash of its own, so a new BED file
  loaded changes the key of every analysis that reads the filters, and
  nothing has to check that a filter and its regions agree.
- **The job carries the regions** as arrays, and the runner gives them to
  popnei's filter, in its place among the steps (section 2).
- **What the application needs of popnei's filter**, whose interface is
  not yet known on 26 September 2026: a step of `Variants`, one per
  `Variants` as the other filters are; that takes the regions as arrays,
  the chromosome, the start and the end of each, as BED counts them; that
  keeps a variant whose position, counted from 1 as a VCF counts it, falls
  inside one of them; that accepts regions in any order and overlapping;
  that keeps nothing on a chromosome the file does not have, with no
  error, since a BED of the whole genome names chromosomes a panel may
  lack; that refuses an empty list, and a region whose start is not below
  its end, naming it; and that counts its variants in the counts of the
  pass under a kind of its own, `"regions"`.
- **Regions named otherwise than the chromosomes of the file**, `chr1` in
  the BED file and `1` in the VCF, keep nothing, and popnei says no more
  than that the pass gave no variant. So the step warns when none of the
  chromosomes of the regions is among those of the variants file, which
  the density of variants along each chromosome gives once popnei has it;
  before that is known, a filter of the regions whose counts show it kept
  no variant says that the names of the chromosomes may differ, with the
  first name of each file.
- **The same filter in popnei's
  Python**, given the same arrays, is what the Python script calls,
  having read the BED file with a reader that popnei will give in Python,
  as the owner decided on 26 September 2026 (section 8). So popnei's
  reader in Python and the application's in TypeScript have to agree on
  the rules above, which the tests of the reader check against it.

What was revised on 26 September 2026, approved by the owner that day:
the subsection is new. Considered and not taken: **the BED file as a file
with a load id, as the variants file is, read by popnei in the calculation
worker.** It needs no reader of ours, and keeps the project file small. A
reopened project would ask the user for two files again, and not one; a
new pick of the same BED file would calculate every analysis again, as a
new pick of the variants file does; and its read would wait behind a
calculation of minutes, which is what the light worker is there to avoid.
It would win for BED files too large to keep in the project, a mask of
the callable sites of a whole genome, with millions of regions, which the
bound of the reader refuses. What would show the choice wrong: the test
of the keys, two BED files of the same regions giving one key and two of
other regions two keys; and users who bring such masks.

### The files wasm, the package of xlsx_rs

An xlsx is read, and from stage 6 written, by **xlsx_rs**, a project of
its own in a repository of its own, as the owner decided on 28 September
2026: a small Rust library over calamine, built with wasm-bindgen into a
wasm package, which it releases as popnei releases its own. The **files
wasm** is the name this document and the specs keep for that package as
the light worker loads it, the second wasm module of the site, apart from
popnei's. Nothing of popnei is in it, and it knows nothing of popnei_web:
it takes the bytes of an xlsx and gives the cells of its first sheet that
is not hidden, or a refusal with what its words need. Its spec,
`docs/specs/worker/files.md`, is xlsx_rs's first, written here and moved
there when its repository is made.

- **popnei_web takes it from a GitHub Release of xlsx_rs**, the files
  GitHub keeps for a tag of a repository, as it takes popnei
  (`docs/technology.md`, section 5): `package.json` names the packed
  package of a tag by its URL,
  `https://github.com/JoseBlanca/xlsx_rs/releases/download/js-v0.1.0-dev.1/xlsx_rs-0.1.0.tgz`
  for the first, and the lockfile keeps its hash. A newer xlsx_rs is a new
  tag there and a new URL here. While the two are changed together, the
  local build is packed in xlsx_rs, `npm pack` in `js/xlsx_rs`, and
  installed here by its absolute path without being saved, `npm install
  --no-save /Users/jose/devel/xlsx_rs/js/xlsx_rs/xlsx_rs-0.1.0.tgz`
  when the checkout is beside popnei's, which copies it into
  `node_modules/` and changes neither `package.json` nor the lockfile,
  so nothing of it is committed, and the next `npm ci` puts the release
  back. It is not linked, with `npm link` or `"file:../xlsx_rs/js/xlsx_rs"`:
  npm installs a link as a symbolic link to a folder outside the
  repository, and the development server refuses to serve the `.wasm`
  from there, "403 Forbidden", as the architecture review of 28
  September 2026 saw with popnei's package linked so, while the build
  succeeds; and from a worktree under `.claude/worktrees/`, `../xlsx_rs`
  names no folder. The repository is `github.com/JoseBlanca/xlsx_rs`,
  under the owner's account and public as popnei's is, so that `npm ci`
  needs no token, as the owner decided on 28 September 2026 (section 13,
  point 11).
- **The light worker imports it by name, on first need**: `filesRunner.ts`
  runs `await import("xlsx_rs")`, a dynamic import, the first time an
  xlsx is read, and awaits the `init()` that wasm-bindgen generates, which
  fetches the `.wasm` from beside its JavaScript, `new
  URL("xlsx_rs_bg.wasm", import.meta.url)`, as popnei's loader fetches
  its own (`.claude/skills/coding/worker.md`, "The files wasm, on first
  need"). Tried on 28 September 2026, in a project of trial thrown away
  after, with Vite 8.3.0 and the workers built as modules, as the site
  builds them: a module worker that imported popnei's release
  `js-v0.1.0-dev.2` only through a dynamic `import()`, popnei's package
  standing in for xlsx_rs's, which does not exist yet, since both are
  what `wasm-bindgen --target web` makes. The build made the
  package's JavaScript a file of its own, 75 KB, downloaded only when the
  import runs, beside a first file of the worker of 269 bytes, and wrote
  its `.wasm` among the files of the site with a hash in its name and
  its address rewritten under `/popnei_web/assets/`. The page loaded it
  from the built site, served by `vite preview`, and from the development
  server, in Chromium and WebKit driven by Playwright 1.63.0 on the
  owner's Mac; Firefox was not tried. The development server serves the
  `.wasm` from `node_modules/`, which is inside the folder of the
  repository.
- **The site needs no Rust.** Its build, its development server and its
  continuous integration install xlsx_rs with `npm ci`, as they install
  popnei. The Rust toolchain, wasm-bindgen's command line and calamine
  are xlsx_rs's.
- **The `.wasm` is served by the site**, copied into `dist/` by the build,
  and not fetched from GitHub when the page runs: the release is
  downloaded by `npm ci`, and every file the page loads comes from the
  site's own address (`docs/technology.md`, section 4).
- **What stays in popnei_web** is what the light worker does with the
  package: the import on first need and its failure, the refusal
  `xlsxReaderNotLoaded`; and `readXlsxCells` of `src/worker/xlsxCells.ts`,
  which makes of what the package returns the cells, or a refusal of
  `IndividualsFileError`, and frees what the wasm holds
  (`docs/specs/worker/individuals.md`, "The package of xlsx_rs, loaded on
  first need"). Its tests stay too: `readXlsxCells` under Vitest in node,
  with an object of the test in the place of the package, and the flow of
  the Individuals step in the three engines, with a few xlsx files copied
  from xlsx_rs into `e2e/fixtures/`. What goes to xlsx_rs: the Rust, its
  tests of each kind of cell, and the files the owner makes in Excel,
  LibreOffice and Google Sheets to check that calamine reads what they
  write (`docs/technology.md`, open point 1).
- **Its conventions are popnei's**: a `CLAUDE.md`, the skills and the
  subagents of popnei adapted to it, `docs/` with its architecture and
  its specs, the lints of popnei's `lints.toml`, and its wasm package
  released as a pre-release on a tag `js-v…`. popnei makes its releases
  by hand, `npm run build` and `npm pack` in `js/popnei` and the `.tgz`
  attached to the tag, as the notes of `js-v0.1.0-dev.3` say; it has no
  workflow for them yet. xlsx_rs makes its releases by hand in the same
  way, and a workflow shared with popnei comes later, as the owner
  decided on 28 September 2026 (section 13, point 13). The layout of xlsx_rs is
  decided in its own architecture; popnei's is the one to start from, a
  crate of plain Rust tested natively, a crate of the binding to
  wasm-bindgen, and the package in `js/xlsx_rs/`.

What was revised on 28 September 2026, approved by the owner on 28 September 2026.
The version before, of 24 September 2026, built the files wasm
from a crate of this repository, `crates/files/`, by the site's own
build: `cargo build` and `wasm-bindgen` into `crates/files/pkg/`, which
git ignored, before every `vite build` and `vite dev`. It needed Rust
1.98.0 and `wasm-bindgen-cli` 0.2.128 on every machine that builds the
site, the three jobs of its continuous integration among them, which the
owner approved on 27 September 2026; calamine was not yet approved,
since the owner was weighing a project of its own, and was approved on
28 September 2026 as a dependency of xlsx_rs (section 13, point 12). The owner decided on
28 September 2026: "xlsx read should be a separate project following
the same conventions and skills that popnei follows. we could call it
xlsx_rs". It answers what the owner had held against the module in
popnei's repository on 24 September 2026, that a release of popnei would
carry a package of the applications, and a change to how they read an
xlsx would wait for a tag of popnei: it waits now for a tag of a project
whose only business is the xlsx.

The three options weighed, each in the same units:

| | (a) xlsx_rs, a package released on GitHub and named by URL | (b) the crate in popnei_web, built by the site | (c) a crate of xlsx_rs on crates.io, built by the site |
|---|---|---|---|
| what a user downloads the first time an xlsx is read | 0.30 MB gzipped | the same | the same |
| Rust on a machine that builds the site, the runners of CI among them | none | Rust 1.98.0 and `wasm-bindgen-cli` 0.2.128 | as (b) |
| each of the three jobs of CI | as now | a cache, the toolchain installed, and wasm-bindgen's command line compiled when the cache is empty; not measured | as (b) |
| `npm run dev` and `npm run build` on the owner's Mac | as now, Vite alone | about 1 s more with the crate built, 5.2 s the first time | as (b) |
| a change of how an xlsx is read | a commit and a tag in xlsx_rs, a release by hand, about ten minutes by the estimate of `docs/specs/site.md`, and a new URL here | a commit here | a commit, a version published on crates.io, a new version here |
| what is kept | two repositories, xlsx_rs with its own docs and skills | one | two, and a crate of the site that wraps the published one to build the wasm |
| that the wasm the site serves was built from the source its version names | checked by nothing while releases are made by hand on the owner's Mac; a workflow that builds the package on the tag would check it (section 13, point 13) | the continuous integration builds it from the commit | the site builds it from the source crates.io keeps |
| the name | `xlsx_rs`, free on npm on 28 September 2026 | none needed | another: `xlsx-rs`, which crates.io takes as the same name, is a crate of another author, of 2021 |

(a) was taken because it takes Rust out of every build of the site, its
development server included, and out of the three jobs of its
continuous integration, and costs a user nothing, since the same wasm is
downloaded when an xlsx is first read. What it costs is the release that
a fix of the reader waits for, about ten minutes by hand, an estimate,
and a second repository to keep; and, while releases are made by hand,
what (b) had and the version of 24 September 2026 gave as its reason not
to commit the wasm: a review can tie the file the site serves to its
source. The hash the lockfile keeps says only that the file of a URL
never changed, not that it was built from the tagged commit; a workflow
that builds the package on the tag gives it back (section 13, point
13). (b) would win if the reader
changed often, together with the screens, so that each change waited
for a release; its interface is one function that takes bytes and gives
cells, so its changes are expected to be few and apart from the
screens'. (c) keeps every cost of (b), Rust in the site, and adds the
wait of (a). A JavaScript library of xlsx, not taken on 24 September
2026, was not weighed again (`docs/technology.md`, section 2).

No invariant of this document changes: the light worker still runs one
request at a time, the files wasm has one thread, and no key, no part of
the project and no layer changes. What changes is what the site depends
on, a second package named by the URL of a release, and one line of
`filesRunner.ts`, which imports the package by its name in the place of
a path, which the rules of the lint that keep the files wasm in the
light worker refuse in any other file (`.claude/skills/coding/configs.md`). The writer of xlsx of stage 6 joins
xlsx_rs, whose name it fits; the zip of the report is recommended there
too, and decided with stage 6 (section 13, point 14).

What the choice costs a user of the site, in the memory of the tab, a
frozen page, the download, the browsers and a page open across a deploy,
is what the crate it replaces cost. The download is the same wasm,
295,475 to 295,521 bytes gzipped as measured in two crates of trial,
each a little different, with calamine alone on 27 September 2026,
0.30 MB, and about
3 KB of its JavaScript, downloaded the first time an xlsx is read; the
memory it holds while it reads is that of `docs/specs/worker/files.md`,
"How it runs"; nothing of it runs on the page; a dynamic `import()` in a
module worker is within the floor of the browsers, from Chrome 80,
Firefox 114 and Safari 15; a worker started again imports it again from
the cache of the browser; and a page open across a deploy fails to
fetch it as it failed with the crate (section 11). Two things would show
the choice wrong. The first is the Playwright test of the Individuals
step: it fails if the build put the package into the worker's first
file or the `.wasm` is not found, since it checks that the network log
has no request for the files wasm before the first xlsx, one for its
JavaScript and one for its `.wasm` after, and none with a CSV, and that
GitHub Pages serves the `.wasm` as `application/wasm`. The second is
fixes of the reader that keep coming with the work on the screens, each
waiting for a release. What is hard to undo is the name,
which every URL of a release and the import of the light worker hold,
and a name on npm if xlsx_rs is ever published there: a later name is a
new URL in `package.json` and a new line in `filesRunner.ts`.

### The files written

- **The filtered variants, as a `.nei` file**, are written in the
  Variants step, as the owner decided on 25 September 2026, by a request
  of the calculation worker (section 5) that calls popnei's `writeVars` of
  `js/popnei/src/io_vars.ts`. It builds the whole file in the memory of
  wasm and copies it out, piece by piece, into one array of the memory of
  JavaScript, outside that of wasm, with the counts of its pass. The
  worker makes of the array a `Blob`, which the browser can hold on the
  disk, so that a copy of up to a gigabyte, if the engine makes one,
  is made off the page and never freezes it, drops the array, and posts
  the `Blob`, which crosses to the page as a handle, with no copy.
- **The user saves the file with a Save button** that the step shows when
  the write ends, with the name and the size of the file, "Save
  panel.filtered.nei, 19.2 MB" in an example, and that starts the
  download through a link that names the file, the `download` attribute
  of a link, which every browser of the floor has. A download started by the code
  minutes after the click that asked for the write, with no click of its
  own, may be blocked by the browser or asked about, as Chrome does for a
  page that starts several downloads. The page releases the `Blob`, and
  the address the link read it from, once it is saved, and when a change
  of the filters, a new write or a new load makes it another file than
  the step shows.
- **What a file of F bytes holds in the tab**, at its peak, measured on
  27 September 2026 in Chromium 153 and WebKit 26.6 on the owner's Mac
  (`docs/specs/analyses/writeVariants.md`, "What was measured"): about 4F
  above what the tab held before in Chromium and up to 6.1F in WebKit.
  In Chromium, where the parts can be told apart, that is about 2.4F in
  the memory of wasm, which never shrinks, F in the array, and F in the
  browser's own process, where the engine copies the array into the
  `Blob`. Once the array is dropped, the tab holds the `Blob` until it
  is released, and the memory wasm grew to.
  popnei's `writeVars` writes 0.96 to 1.10 bytes per genotype, by how well
  its compression takes the genotypes: at 1.10, a million variants of
  1,000 individuals make a file of 1.1 GB, which needs about 4.5 GB more
  at the peak in Chromium and 6.7 GB in WebKit. The largest file written
  in both engines was 1.98 GB; one of about 2.2 GB failed in both, and in
  WebKit its write closed the tab. So the step says the size it expects,
  from the variants and the individuals the filters keep, before the user
  writes, warns from a size, a constant of the code, `WRITE_WARN_BYTES`,
  500 MB, and refuses from another, `WRITE_MAX_BYTES`, 1.8 GB, both set
  from that measurement; which is why, too, the report leaves the filtered variants
  out by default (`docs/functionality.md`, section 9). Reading the
  variants file by ranges does not change this.
- **The VCF**, once popnei has a writer of it, is written the same way. It
  is asked of popnei compressed with bgzip, as a `.vcf.gz`, since a plain
  VCF takes several bytes per genotype, `0/1` and its tab, where the
  `.nei` file takes about one.
- **The xlsx and the zip of the report** are made in the light worker, by
  the files wasm, the zip as section 13 decides (point 14), and offered
  as a download in the same way.

What was revised on 26 September 2026, approved by the owner that day.
The version before said that the file was offered as a download, and
not how, what its limits were, or what a change of the filters did
meanwhile. This revision writes it
as popnei gives it now, whole, with the warning. popnei is asked for a
writer by pieces, of the `.nei` file and of the VCF, which gives the file
one batch at a time, as the owner decided on 26 September 2026, which is
the owner's standing preference for what popnei writes; stage 3 does not
wait for it, and writes the file whole with the warning until popnei has
it. With it, the
worker keeps the pieces as they come and makes one `Blob` of them at the
end, and the memory of wasm holds one batch: the peak loses the about 2.4F that wasm held of the file.
Considered and not taken, with the browsers from MDN's compatibility
data, version 8.1.3, read on 26 September 2026:

- **A file picker for saving**, `showSaveFilePicker`, which asks the user
  where to save and lets the page write there piece by piece, with no copy of the file in the tab: in Chrome and
  Edge from 86, and in neither Firefox nor Safari. It saves nothing while
  popnei builds the file whole in wasm, and with a writer by pieces it
  would serve only the users of Chromium; it would win if they wrote files
  larger than a tab can hold.
- **The origin private file system**, a storage on the disk that the
  browser gives each site, which a worker writes into with the call
  `createSyncAccessHandle`, in Chrome 102, Firefox 111 and Safari 15.2,
  all within the floor. The worker would
  write the array there and drop it, and the page offer the `File` it
  gives back, which the disk holds, so the copy of the `Blob` would not be
  made. It costs a quota that differs by browser, and files that stay on
  the disk between sessions until the application deletes them, for the
  one copy that the measurement may show engines do not make anyway.

What would show the choice wrong: the store's test that a change of a
filter during a write leaves it behind, that a Run stops it, and that a
write that ends after the change saves nothing; and the measurement of
section 11, if the tab of an engine is closed for its memory well below
the bound the step warns at.

### What this asks of popnei

Each is asked of popnei and not built around in the applications, and
`.claude/skills/coding/worker.md`, "What popnei has to provide", keeps the
full list. The first two are given by `js-v0.1.0-dev.2`; the owner
decided on 26 September 2026 that popnei adds the filter of the regions,
the histogram of the missing rate, the writer of the VCF and the density
of variants, for stage 3, and on the same day the writer by pieces and a
reader of BED files in Python:

1. Reading a JavaScript `File` by ranges with `FileReaderSync`, in
   `openVcf` and `openVars`.
2. The number of passes a function makes, `numPassesOf`, and the progress
   of each pass, `Variants.onProgress`, for the progress bar.
3. The filter of the regions of a BED file, with what the application
   needs of it (above, "The regions of a BED file").
4. The histogram of the missing rate of each variant, beside those of
   `calcPerVarDistribs` (section 4, "The checks of the Variants step").
5. A writer of the VCF, bgzipped (above, "The files written").
6. A writer of the `.nei` file and of the VCF that gives the file by
   pieces, with the counts of its pass at the end (the same).
7. The density of variants along each chromosome, of
   `docs/build-order.md`, section 4, which this revision does not touch.
8. A reader of BED files in popnei's Python, for the Python script
   (above, "The regions of a BED file").

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
- **A plot draws the bins it is given.** popnei bins the statistics of the
  variants, which can be millions of values, and gives the histograms
  (`calcPerVarDistribs`). The statistics of each individual come as one
  value per individual, and core bins them, a pure function of plain
  arithmetic over a few thousand numbers, with the rule of popnei's bins,
  a value in the bin whose left edge is at most it and whose right edge is
  above it, the last bin taking its right edge too, as `numpy.histogram`
  does, which the Python script uses for the same bins; an individual with
  no heterozygosity, NaN, is counted apart and said by the screen. That
  is the rule of `docs/build-order.md`, section 4, for arithmetic on
  popnei's results, and the table of the individuals needs the values
  anyway. `.claude/skills/coding/charts.md`, which gives every binning to
  Rust, is corrected so. The option not taken, a histogram of the
  individuals in popnei, would cost a request to popnei and a release for
  every change of the bins.
- **The step of an application is in the URL hash**, so that the back
  button moves between steps (`docs/technology.md`).

## 8. The project file, the report and the script

- **The project file** is the project as JSON, with the header of
  `docs/functionality.md` section 9 and, for each analysis, the numbers
  its `checkNumbers` gives, to check a new run against. It is made in
  core. Opening one validates the JSON against the schema of its version,
  refuses a file it cannot read with a message that says why, a file that
  names an analysis this version of the application does not know among
  them, with a message that names the analysis and says the file was saved
  by another version of the application, as the owner decided on 24
  September 2026 in place of opening the file without that analysis; and gives a
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
- **The regions of a BED file are saved with the project**, whole, as
  the individuals table is, with the name of their file, so that a
  reopened project asks only for its variants file again; their hash is
  not saved, and is made again when the file is opened. For 200,000
  regions they add about 5.8 MB to the file, which the bound of 64 MB of a
  project file takes (`docs/specs/core/projectFile.md`). The format stays at version 1, which also refuses filters out of their
  order (section 12).
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
  difference: the variant file; the version of popnei, when it is not the
  one saved with the numbers of that analysis; and the application's
  calculation of that analysis, when its key version is not the one saved
  with its numbers, with the version of the application saved beside them,
  so that a calculation the application changed is not blamed on the file
  (`docs/specs/core/store.md`). The versions are those of each check and
  not of the file's header, since a file can hold numbers of two sessions
  (section 2). The reference is in no key: it is not an
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
  individuals file. It is made in core. From stage 3 it reads the BED file
  with popnei's reader in Python and gives its regions to popnei's filter
  of the regions; and
  it makes the list of the individuals kept as core makes it, from
  popnei's statistics of each individual and the same thresholds, and
  puts the filters in the order of section 2: the statistics of the
  variants as opened, with no filter, then `filter_individuals` of that
  list, then the filters of the variants. It
  reads the individuals file
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
  analyses/         one module per analysis, with the shape of section 4,
                    the checks of the Variants step among them from stage 3:
                    individualChecks, variantChecks, filterCounts; from
                    stage 5 popDists and ldDecay, and sfs.ts, the rows,
                    the CSV and the warnings of the folded spectrum, which
                    the diversity's module and panel call and which is no
                    analysis of its own (docs/specs/analyses/sfs.md)
  individualsKept.ts
                    the list of the individuals the filters keep, and the
                    counts of each filter of individuals (section 4)
  histogram.ts      the bins of the statistics of each individual (section 7)
  apps.ts           the steps and the analyses of each application, the
                    step each analysis is shown in, and what the store
                    and the shell read of a result: what its pass
                    counted, the statistics of each individual, the
                    variants the filters keep
  fileNames.ts      the names of the files the application writes, from
                    the stem of the variants file
  writeEstimate.ts  the size expected of a file of the filtered variants,
                    its bounds, and the sizes in words
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
                    intermediate results; tested in node
  runnerWorker.ts   the calculation worker's script: it checks each request,
                    calls runner.ts and posts the answers and the progress
  filesRunner.ts    the light worker, with no popnei: the individuals file,
                    the files wasm, xlsx and zip
  xlsxCells.ts      the cells of an xlsx or its refusal, from what the files
                    wasm gives, with no wasm in it
                    (docs/specs/worker/individuals.md)
  individualsFile.ts
                    the bytes of the individuals file, read and decoded,
                    for filesRunner.ts
  individuals/      the reader of CSV and TSV and the inference of the types
                    of the columns, pure, called by filesRunner.ts
  regions/          the reader of a BED file, pure, called by filesRunner.ts
src/charts/
  plot2d.ts         the base every 2D plot makes its handle with: its SVG,
                    size, axes, text for a screen reader and export
  histogram.ts scatter.ts line.ts qq.ts heatmap.ts manhattan.ts pca3d.ts
                    from stage 5, line.ts the plot of series of points, a
                    line and marks, the LD decay's
                    (docs/specs/charts/line.md), and heatmap.ts the grid
                    of a symmetric matrix between named things, the
                    distances between populations'
                    (docs/specs/charts/heatmap.md)
  marks.ts          the colour and the symbol of each group of points, and
                    the colours of a column of numbers, for the 2D and 3D
                    plots of the PCA (docs/specs/charts/scatter.md)
  legend.ts         the entries of the legend of those plots, and the
                    legend drawn into an exported SVG
  hover.ts          the point nearest the pointer, and its tooltip
  numbers.ts        how the tables of the plots write a number, apart
                    from D3, for the tooltip and the legend
  project.ts        where each point of the 3D view falls on the screen,
                    with nothing of three.js (docs/specs/charts/pca3d.md)
  pca3dError.ts     the ways the 3D view cannot be drawn, with no three.js
  export.ts         SVG and PNG
src/ui/
  popgen.tsx        the entry of the population genetics page: it makes the
                    store, with popgenStore.ts, and the workers, joins
                    them, and draws the shell
  popgenStore.ts    the store of the population genetics page, made with
                    the analyses and the functions of apps.ts and the
                    functions of the worker client that send; apart from
                    the entry, so that a test in node makes it
  reads.ts          asks for the read of each file whose read is pending
                    (section 6, "Who asks for a read")
  saving.ts         the project file downloaded, and whether the project
                    changed since it was saved or opened; from stage 3, a
                    file of the filtered variants downloaded too
  defects.ts        the log of the errors the bar at the top of the page shows
  files.tsx         a picked file: its load id, and the File kept under it
  store.tsx         the store of core, given to the screens
  shell/            the header, the stepper, the summary line, the notices;
                    status.ts, what is read to a screen reader;
                    words.ts, the words of the shell made from the store;
                    and shellWords.tsx, which gives the components of the
                    shell what those words need of the application
  runs.ts           awaits the outcome of each run core starts, and hands
                    it to the store, which cancels the runs no longer
                    asked for (section 5)
  runSeconds.ts     the clock of a calculation under way, the seconds
                    since the start runs.ts noted, which the panel of an
                    analysis and the writing of the Variants step show
  steps/            one folder per step: variants, individuals and analyses in
                    stage 2, and export, which joins in stage 6
  analyses/         AnalysisPanel.tsx, the frame of the seven states that
                    every analysis shares; titles.ts, the title of each
                    analysis, by which its panel, its part of the Variants
                    step and the shell name it, and what the words of the
                    shell need of the application; panels.ts, the panel
                    of each analysis of the Analyses step; and one folder
                    per analysis, diversity/ first, with its options and
                    its results
  report/           renders the report model into its HTML page, with the plots
  widgets/          React Aria components with our styles, one wrapper per
                    widget; among them Table.tsx, the plain table of a
                    few rows that is only read, SortableTable.tsx, the
                    table sorted by any column, whose Virtualizer draws
                    only the rows in view, for thousands of rows such as
                    the statistics of each individual, and TextArea.tsx,
                    the text of several lines, the lists of individuals
  tokens.css        the design tokens
src/probe/          the probe of stage 0, a page of its own outside the
                    layers, that checks a deploy still loads popnei
index.html popgen.html gwas.html probe.html
                    the pages, at the root of the repository, so that the
                    build writes them to the root of dist/
docs/
```

The files wasm is not in the repository: it is the package of xlsx_rs,
installed into `node_modules/` from its release, as popnei is (section
6).

`core` has no DOM and no React, and is tested with Vitest alone. Nothing
in `core` imports from `ui` or `charts`, and nothing in `charts` imports
from `core` or `ui`. From stage 4 core imports, of `src/worker`, the
types of `protocol.ts` and the pure functions of
`src/worker/individuals/columnTypes.ts`, which read the number a cell
holds and the types a column allows, so that the project and the reader
cannot disagree on them (`docs/specs/core/project.md`, `columnAllows`). Only `src/worker/runner.ts` calls popnei, apart
from the probe's worker, `src/probe/probeWorker.ts`: the calculation
worker's script, `runnerWorker.ts`, calls `runner.ts` and not popnei. Only
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
built: the population genetics application reads a VCF or a `.nei` file
in the calculation worker, filters it by missing data, and shows the
diversity per population with the populations of an individuals file in
CSV, read in the light worker; changing the threshold of the filter
removes the diversity from the screen with its notice, and undo brings it
back with no calculation; a running calculation can be cancelled; and the
project can be saved and opened again, in the project file's full first
version. The owner decided on 25 September 2026 that it reads both
formats of the variants file and writes the whole project file, which
the build order had left to later stages
(`docs/specs/analyses/diversity.md`, `docs/specs/core/projectFile.md`).
The xlsx, the plots, the report and the other analyses come after it,
each as a module of its own.

It reads the variant file by ranges, with popnei's release
`js-v0.1.0-dev.2` (section 6), and not whole, as popnei 0.1.0 did, and it
needs nothing from popnei that this release does not have. Its individuals file
is a CSV, read by our reader in the light worker, so it does not need the
files wasm either, which comes after it, with the first work package that
reads an xlsx, and the light worker of the skeleton loads no wasm.

## 11. The limits and the costs of the web

What a user of the applications would meet, with the numbers from popnei's
code, the release `js-v0.1.0-dev.2`, and from stage 4 the release
`js-v0.1.0-dev.3` of 28 September 2026, which adds the PCoA and gives
the same numbers for everything else but the size of a written file.

- **The size of the variant file** is limited by the time of a pass, and
  not by memory, since popnei reads the file by ranges and holds only a
  few of them (section 6). A pass over a gzipped VCF decompresses the
  whole of it.
- **A file changed on the disk after it was picked.** A `File` is a
  handle to the file as it was when picked, and the File API asks a
  browser to refuse to read one whose file changed since; with reading by
  ranges every pass reads the disk again, so a file overwritten, moved or
  deleted while the application is open fails at the next pass, or at the
  open again that a change of the filters or a restart makes. The worker
  answers such a failure with an error of its own kind, `reopenFailed`,
  and the words tell the user to pick the file again: at the first open,
  in the Variants step, "panel.nei could not be read; it may have changed
  on the disk since it was picked. Load it again in the Variants step.",
  and after it, on the panel of an analysis, "panel.nei could not be read
  again; …" with the same rest (`docs/specs/worker/messages.md`,
  `docs/specs/steps/variants.md`, `docs/specs/analyses/diversity.md`). A second try does not mend it; a new
  pick does. That a browser refuses such a file is from the specification
  of the File API and has not been seen in a browser yet. The new pick is a new load with a new id, so every result
  is calculated again from what the file holds now (section 3).
- **The PCA and the PCoA refuse more than 9381 individuals.** The matrix
  of the individuals, its eigenvectors and the workspace of the
  eigendecomposition take about 6.1 times 8 bytes per pair of
  individuals, which at 9382 is more than the 4 GB that wasm addresses
  (`room_for_the_square_of` of `crates/popnei-js/src/pca.rs` of popnei).
  The PCoA was measured by popnei at 44.4 bytes per pair at its peak, and
  its limit is the PCA's, since the edge is one allocation that does not
  fit. popnei refuses with its message, and points to a program outside
  the browser, popnei in Python among them; the application locks the
  analysis instead, with words of its own that say the same
  (`docs/specs/analyses/pca.md`, "Why it cannot run"): before its Run,
  and, for a PCoA whose threshold on the individuals waits for their
  statistics, after the Run has calculated them and before anything is
  sent to popnei. For the PCA
  popnei counts the individuals of the file and not those the filters of
  individuals keep, in `js-v0.1.0-dev.2` and `js-v0.1.0-dev.3`, so a file
  of more than 9381 individuals cannot be analysed on a part of them by
  the PCA, which is asked of popnei; for the PCoA, `js-v0.1.0-dev.3`
  counts those of the pass, so such a file can be analysed by the PCoA
  on at most 9381 of them (`docs/specs/analyses/pca.md`).
- **The time and the memory of a PCA grow with the individuals**, and
  mostly not with the variants: in node 26.8.2 on the owner's Mac, with
  300 variants, 0.45 s and 69 MB more for 1,000 individuals, 3.0 s and 196
  MB for 2,000, and 21 s and 662 MB for 4,000, on 27 September 2026
  (`docs/specs/analyses/pca.md`). The time grows about seven times when
  the individuals double. In the browsers, run from the panel of the
  application on 29 September 2026 on the same Mac, a PCA of 4,000
  individuals took 16.0 s in Chromium 153 and 10.2 s in WebKit 26.6, and
  grew the engine by 613 and 745 MB; one of 9,381 took 205 s and 121 s,
  and grew it by 3.03 and 3.12 GB, and the PCoA a sixth to three tenths
  longer and 3.30 and 3.40 GB; neither engine closed the tab. popnei reports no progress while it decomposes
  the matrix, so the bar stands full meanwhile, 6.7 of the 6.75 s of a
  PCA of 2,500 individuals; the panel says so, and popnei is asked for a
  progress of the decomposition, which `js-v0.1.0-dev.3` does not give
  either, for the PCA or the PCoA. The memory stays with wasm after the
  PCA, which is why the worker is started again after a large one
  (section 13, point 9): after one of more than 700 individuals, since a
  PCA of 700 left the engine 11 to 18 MB larger in both engines, under
  the 25 MB above which a written file restarts the worker too. The LD filter of
  the PCA is applied again at every PCA, and took at least 2.2 s of the
  3.4 s of a PCA of 1,000 individuals and 20,000 variants with a distance
  of 100,000 bp, at least 62% to 68% in both engines, a lower bound since
  the PCA with the filter also calculates over fewer variants
  (`docs/specs/analyses/pca.md`, "How it runs").
- **The memory of the LD decay grows with the largest distance** the
  user types, from stage 5: popnei counts the pairs of each population
  at every distance up to it, 16 bytes a base pair asked for before the
  pass and up to 24 more at its end, and holds the variants within that
  distance of the newest one read. Measured in node 26.8.2 on the
  owner's Mac with `js-v0.1.0-dev.3` on 30 September 2026, as the growth
  of the memory of wasm: 10.6 MB for 100 individuals and 500 variants at
  100,000 bp and three populations, 480 MB for the same at 10,000,000
  bp; 63.7 MB for 100 individuals and 20,000 variants every 1,000 bp at
  100,000 bp; and 0.4 to 1.1 GB for 1,000 individuals and 20,000
  variants at 100,000 and 1,000,000 bp, which took 3.1 to 73.6 s
  (`docs/specs/analyses/ldDecay.md`, "How it runs", whose table gives
  each case). Core locks the analysis when its counts would pass 1 GB,
  40 bytes × the distance × the populations, 25,000,000 bp for one
  population, and popnei refused 250,000,000 bp for one, 4 GB of counts.
  That memory stays with wasm after the analysis, so the worker is
  started again after every LD decay (section 13, point 16, proposed).
  None of it has been measured in a browser; the plan of stage 5
  measures it in Chromium and WebKit, as stage 4 measured the PCA.
- **The kinship takes n² × 8 bytes**, 800 MB at 10,000 individuals, and
  the calculation worker keeps it in its cache for the GWAS. While it is
  calculated it is in the memory of wasm as well, which keeps that room
  after.
- **The memory of wasm grows and never shrinks** (`js/popnei/README.md`
  of popnei), so the only way to give it back is to restart the worker.
  The calculation worker is restarted when the load of the variant file
  changes (section 5); it is not restarted between requests, as the
  owner settled on 26 September 2026 (section 13, point 2), but after a
  large written file and after a large PCA (points 5 and 9), and, as
  proposed for stage 5, after every LD decay (point 16).
- **The downloads**: the wasm package of popnei, 0.79 MB gzipped
  (785.16 KB, release `js-v0.1.0-dev.3`, as Vite measures it in the
  build of the site, 28 September 2026), against 0.71 MB (710.6 KB) for
  `js-v0.1.0-dev.2`: the release that adds the PCoA, the writer of the
  VCF and the filter of the regions made it 74.5 KB larger, and `gzip`
  72 KB, 774,080 bytes against 701,996. It is loaded by the calculation
  worker alone, before anything runs; the page's first script is 191.81
  KB gzipped with either release. The files wasm,
  the package of xlsx_rs,
  0.30 MB gzipped while it only reads, in stage 4, and about 0.58 MB with
  the writing of the report from stage 6, by the light worker the first
  time an xlsx is read or a report is written (`docs/technology.md`,
  section 2), measured again from the site built with its first
  release.
- **Picking a file again calculates everything again.** Each load of the
  variant file has a new id, so the results of an earlier load of the same
  file are not found (section 3): the user waits the time of each analysis
  again.
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

- **Writing a file of the filtered variants** holds at its peak about 4
  times the file more than the tab held before in Chromium 153, and up
  to 6.1 times in WebKit 26.6: 8.3 GB and 11.5 GB for the largest file written,
  1,982,018,522 bytes, 1,800,000 variants of 1,000 individuals. A file of
  about 2.2 GB could not be written in either, and in WebKit its write
  closed the tab, which loses the user's work since the last save of the
  project (section 6). The write of the `.nei` file of 19,161,178 bytes
  takes 144 ms in Chromium and 149 ms in WebKit, and that of a file ten
  times larger, 220,236,506 bytes, from a gzipped VCF of 127.6 MB, 3.7 s
  in both. Measured on 27 September 2026 on the owner's Mac, an Apple M5
  Pro with 64 GB and macOS 27.0 (`docs/specs/analyses/writeVariants.md`,
  "What was measured"); Firefox, which Playwright cannot launch there, is
  measured by the owner by hand. They set `WRITE_WARN_BYTES`, 500 MB,
  `WRITE_MAX_BYTES`, 1.8 GB, and the size of a written file above which
  the worker is started again, `WRITE_RESTART_BYTES`, 25 MB (section 13,
  point 5). The estimate of the size of a file, which the warning and
  the limit are compared with, is the variants times the individuals at
  `BYTES_PER_GENOTYPE`, 1, and `BYTES_PER_VARIANT`, 40 bytes more per
  variant for its other columns: in node, with `writeVars`, 50,000
  variants of 2 to 1,000 individuals gave files at most 7% larger than
  that estimate, and up to 77% smaller, for 2 individuals and no ids
  (`e2e/measure/writeSize.ts`, 27 September 2026).
- **The table of each individual's statistics** has three columns and a
  row per individual, 30,000 cells at 10,000 individuals, and a change of
  a threshold changes which rows are marked kept. Measured with the table,
  in the three engines, at 10,000 individuals: the time the page is
  frozen after a change of a threshold. If it is longer than a keystroke
  can wait, about 100 ms, the table draws only the rows on the screen.
- **A threshold on the individuals costs one pass per load**, the pass
  of their statistics, which a Run of an analysis that reads the filters
  of individuals starts and waits for, before its own, the first time:
  over a gzipped VCF of gigabytes, minutes before the analysis starts.
  Until 28 September 2026 it cost that pass after every change of a
  filter of the variants (section 2). Their result is in the cache of the page, two numbers
  of 8 bytes and the name of each individual, 24 bytes for `s000` as the
  cache counts it, so a restart of the calculation worker does not lose it.
- **A change of a filter of individuals takes off the histograms of the
  variants and the counts of the filters of the variants**, since both
  are counted over the individuals kept (section 4): the histograms need
  a pass again, the pass of a check, and the counts come back with the
  next analysis or Count. The pass of the histograms is one call of
  `calcPerVarDistribs`, as the diversity's is, which took 248 ms in
  Chromium 153 and 243 ms in WebKit 26.6 over a VCF of 80,692,954 bytes
  on the owner's Mac (`docs/plans/variants-step.report.md`, "The Count
  against the diversity"); the histograms themselves were not timed, and
  over a gzipped VCF of gigabytes the pass takes minutes. The user sets the individuals first, in the
  order of the Variants step, and then reads the histograms of the
  variants to set the filters of the variants, which take nothing off.
- **The thresholds are set in number fields**, and not by dragging a line
  on a histogram, so no drag needs a way for the keyboard (WCAG 2.2,
  success criterion 2.5.7). The histograms are drawn with the D3 modules
  `docs/technology.md` chose, and add no dependency.
- **The counts of the filters cost a pass** only when no analysis has made
  one with the same filters, of the variants and of the individuals. The pass is `iterBlocks`, which copies every
  block of genotypes out of wasm (section 4); its time against a pass of
  the diversity is measured in the work package of the Count, on the same
  two files, and if it is much longer popnei is asked for a function that
  only counts.
- **The regions of a BED file are hashed once**, when their read is
  recorded, 120 ms for 200,000 regions in node on the owner's Mac (section
  3); in the browsers it is measured with the reader.
- **A file of the site fetched after a deploy.** three.js, for the 3D
  view of the PCA, 139 KB gzipped (139,304 bytes with `gzip -9` in the
  built site, 29 September 2026, on the owner's Mac; 134 KB was the
  estimate of `docs/specs/charts/pca3d.md`), and the files wasm, for an xlsx, 0.30
  MB, are downloaded the first time they are needed, not when the page
  opens (`docs/technology.md`). A deploy replaces every file of the site,
  and the name of each of these files holds a hash of its content, so a
  page opened before a deploy that asks for one of them afterwards asks
  for a file that is no longer there, and its download fails. The screen
  says that the site may have been updated since the page was opened,
  and to save the project, reload the page and open the project again
  (`docs/specs/charts/pca3d.md`, `docs/specs/worker/files.md`). The
  script of each worker is such a file too: a worker started again, after
  a cancel, a crash, a large write or a large PCA (section 13, point 9),
  fetches its script from the build the page came from, and after a
  deploy cannot start, which the client reports as `couldNotStart`, whose
  words say to reload the page (`docs/specs/core/project.md`, open point
  4), and to save the project first, which they now say. Found by the
  specs and the architecture review of stage 4 on 27 September 2026, and
  not yet seen in a browser (section 13, point 10).

## 12. What is hard to undo

- **The format of the project file**, which users keep. It carries the
  version of its format in its header (`docs/functionality.md`, section
  9), and opening one validates it against the schema of that version
  (section 8), so a change to the format is a new version, and the
  application keeps reading the versions before it. The options of each
  analysis are part of that format: each analysis reads its options of
  every earlier version, through its `parseOptions`, which is given the
  version of the file (section 4).
- **Version 1 of the project file until the first release of the
  application.** The application is in development, before its first
  alpha, and the owner decided on 26 September 2026 that the format
  stays at version 1 until its first release: the regions of a BED file
  and the filter of the regions join version 1, which refuses filters of
  the variants out of their fixed order (section 2), and a file saved by
  one development version may be refused by a later one. The rule above
  holds from that release. This revision had given version 2 to stage 3
  (`docs/specs/stage-3-open-points.md`, point E). What the filter of the regions
  means, the regions counted as BED counts them and a variant's position
  as a VCF counts it, is kept by every file saved with one.

The canonical form of the keys is not among these. No key and no fingerprint of
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
   settled (section 5). Settled by the owner on 26 September 2026: not
   restarted between requests, since the walking skeleton measured the
   memory of wasm at 35.5 MB after one diversity and after the next, on
   the `.nei` file of 19,161,178 bytes, in Chromium 153 on the owner's
   Mac; it is
   decided again with the kinship, whose matrix is 800 MB at 10,000
   individuals (`docs/plans/walking-skeleton.report.md`).

Opened by the revision of 26 September 2026, and decided by the owner
that day:

3. **The order of the filters** is fixed: the regions, once popnei has
   that filter, missing data, observed heterozygosity, MAF and the LD
   pruning last, and the filter of individuals after them (section 2).
   Not taken: an order set by the user. Revised by the owner on 28
   September 2026: the filter of individuals comes first, and the
   filters of the variants count over the individuals it keeps, "All
   analyses should calculate the filters using the individuals kept"
   (section 2, where the options and their costs are). The order among
   the filters of the variants is as it was, but for the regions, which
   go before the filter of individuals, as the owner decided later that
   day (point 15).
4. **An individual with no called genotype** is removed by the filter by
   heterozygosity (section 4). Not taken: keeping it, which a NaN would
   otherwise let through whatever the threshold.
5. **The calculation worker is started again after a written file larger
   than a bound**, set by the measurement of section 11, to give the tab
   back the memory of wasm the file took, which would otherwise stay with
   it until the next load of the variants file. It is an exception to the
   decision of point 2, since a write grows that memory by the size of the
   file. What it costs: the intermediate results the worker held, the
   kinship from stage 7, and the reading of the header of the
   file, at most 49 ms from the start of a new worker to the file opened,
   measured at the end of the walking skeleton on the `.nei` file of
   19,161,178 bytes and its VCF, in Chromium 153 and WebKit 26.6 on the
   owner's Mac, an Apple M5 Pro with 64 GB
   (`docs/plans/walking-skeleton.report.md`). Not taken: a restart after
   every write, or after none.
6. **A write that ends after a change of its filters is dropped**, so
   that no file is saved with other variants than the step shows (section
   5). Not taken: saving it with a notice that names the filters it was
   written with.
7. **The Python script reads a BED file with a reader that popnei will
   give in Python**, beside its filter of the regions (sections 6 and 8).
   Not taken: pandas, as the script reads the individuals file.
8. **Each individual's statistics are counted over the variants the
   filters keep**, and the individuals under the thresholds are removed
   last, by popnei's `filterIndividuals` after the filters of the
   variants, so that the analyses read the variants the statistics were
   counted on (sections 2 and 4). What it costs: a pass of the statistics
   after every change of a filter of the variants, which the analyses
   that read the filters of individuals wait for. Not taken: the
   statistics over every variant of the file, one pass per load, which
   counts among an individual's missing genotypes the bad variants the
   missing data filter drops. Reversed by the owner on 28 September
   2026 with point 3: the statistics are counted over every variant of
   the file, one pass per load, and the individuals under the
   thresholds are removed first, by `filterIndividuals` before the
   filters of the variants; the cost the option not taken had named is
   the one accepted (sections 2 and 4). Not taken that day: the lists
   first and the thresholds last, and the order of stage 3 kept.

Opened by the revision of 27 September 2026, for stage 4
(`docs/specs/stage-4-open-points.md`); point 9 decided by the owner that
day, as recommended, and point 10 on 28 September 2026, as recommended:

9. **The calculation worker is started again after a PCA or a PCoA of
   more than 700 individuals**, `PCA_RESTART_INDIVIDUALS`, whose matrix
   of the individuals then takes about the 25 MB after which a written
   file restarts it (point 5), 24 MB for a PCA or a PCoA of 700 by
   popnei's count of 48.8 bytes a cell, so that the tab gets back the
   memory of wasm the analysis took: about 4.3 GB after a PCA of 9,381
   individuals. It is a second exception to point 2. What it costs in
   stage 4: reading the header of the variants file again, at most 49 ms,
   since the worker keeps no intermediate result before stage 7 (section
   5). Not taken: keeping the worker, and the memory, until the next load
   of the variants file. It is decided again in stage 7, with the kinship
   and the principal components the worker keeps for the GWAS, which a
   restart after a large PCA would drop: a kinship of 10,000 individuals
   is 800 MB and minutes to make again.
10. **What a page opened before a deploy does when it later fetches a
   file of the old build** (section 11). Decided by the owner on 28
   September 2026, as recommended: the screen says in words that the
   site may have been updated since the page was opened, and to save the
   project, reload the page and open the project again, as the specs of
   stage 4 have it. Not taken: keeping the files of the last
   builds on the site for a while after a deploy, which GitHub Pages,
   deploying the `dist/` folder of one build, does not do by itself; and
   downloading three.js and the files wasm when the page is idle, so that
   a deploy afterwards finds them already in the page, at the cost of
   their 0.43 MB gzipped for every visit, and which would not cover the
   script of a worker started again.

Opened by the revision of 28 September 2026, which moves the reader of
xlsx to xlsx_rs (section 6). The owner decided points 11 to 13 the same
day; point 14 is not yet answered.

11. **The name and the place of xlsx_rs, decided by the owner on 28
   September 2026**: `github.com/JoseBlanca/xlsx_rs`, under the owner's
   account as popnei is, and public, so that `npm ci` downloads its
   releases with no token. The name was free on npm on 28 September
   2026, and the repository did not exist yet that day; the owner
   creates it, and no session of popnei_web does. Not taken: another
   name or another account, which nothing had proposed.
12. **calamine 0.36.1 as a dependency of xlsx_rs**, and rust_xlsxwriter
   0.99.1 for its tests alone, **approved by the owner on 28 September
   2026**; calamine had been left unapproved on 27 September 2026 while
   the owner weighed this move. The xlsx of stage 4 now waits only for
   the repository and the first release of xlsx_rs. Rust 1.98.0 and
   `wasm-bindgen-cli` 0.2.128, approved for the site on 27 September
   2026, are no longer needed by it; they are xlsx_rs's.
13. **How xlsx_rs makes its releases, decided by the owner on 28
   September 2026**, as recommended: by hand, `npm run build` and `npm
   pack` and the `.tgz` attached to a pre-release of the tag, as popnei
   makes its three so far, `js-v0.1.0-dev.1` to `js-v0.1.0-dev.3`, about
   ten minutes each by the estimate of `docs/specs/site.md`; and later a
   workflow of GitHub Actions shared with popnei, so that the two are
   made the same way. What it costs: until then nothing checks that a
   release was built from its tag, as nothing checks it for popnei's
   (section 6). Not taken: a workflow for xlsx_rs first, some forty lines
   tried on a tag, hours of work, not estimated more closely, which would
   have tied every release to its source from the first.
14. **Where the zip of the report is made**, in stage 6. Recommended: in
   xlsx_rs, whose writer of xlsx brings the `zip` crate and its
   compression already, since an xlsx is a zip of XML files, so that a
   function that zips the report adds little to the 0.58 MB of the three
   libraries measured together (`docs/technology.md`, section 2); the
   name then covers one function that is not about xlsx. Not taken: the
   zip written in TypeScript, or taken from a library of JavaScript such
   as fflate, of about 10 KB, a new dependency for what the files wasm
   would already hold. Decided with stage 6.

Opened by the revision of 28 September 2026 for the order of the
filters, after its architecture review, and decided by the owner that
day:

15. **The filter of the regions of a BED file goes first** in the order
   of section 2, once the application has it; popnei's release
   `js-v0.1.0-dev.3` has the filter, `filterByRegions`, and the
   application has not built it. Decided by the owner, as recommended:
   the regions first, then each individual's statistics over the
   variants inside the regions, then the filters of individuals, then
   the other filters of the variants, as plink 1.9 removes the variants
   outside the regions before `--mind`. A user who loads a VCF of a
   capture with calls off the target, and the BED of the target, would
   otherwise see individuals removed by a threshold on their missing
   genotypes for calls no analysis reads. What it costs: the key of the
   statistics of each individual holds the hash of the regions, and
   their job carries the filter of the regions and no other, so their
   pass is one per load and per BED file, and a new BED file takes them
   off. Not taken: the regions after the list, with the other filters of
   the variants, which kept the statistics one pass per load whatever
   the regions.

Opened by the revision of 30 September 2026, for stage 5
(`docs/specs/stage-5-open-points.md`, point 12). Proposed, and not yet
approved by the owner; the specs of stage 5 are written with it
meanwhile:

16. **The calculation worker is started again after every LD decay**,
   whatever its size, after a result and after a refusal of popnei, as
   after a large PCA (point 9); not after a file that no longer reads.
   It is a third exception to point 2. An LD decay leaves the memory of
   wasm larger by 16 bytes × its largest distance × its populations,
   plus the variants it held within that distance: in node, 10.6 MB for
   100 individuals and 500 variants at 100,000 bp, and 0.4 to 1.1 GB for
   1,000 individuals and 20,000 variants (section 11), where a written
   file and a PCA restart the worker above about 25 MB. What it costs:
   reading the header of the variants file again, at most 49 ms (point
   5), against a calculation of 0.6 s and more on 20,000 variants, and,
   from stage 7, the intermediate results the worker holds, the kinship
   among them, which the next GWAS would calculate again. The options
   not taken: a bound on the individuals and the distance, as for the
   PCA, which almost every file of a few hundred individuals would pass,
   so that the restart would come almost always and the bound would
   still have to be measured; and no restart, which leaves the tab up to
   a gigabyte larger after one LD decay of 1,000 individuals, until the
   next load of the variants file. It is decided again in stage 7 with
   the kinship, as point 9 is, since a restart after an LD decay would
   then drop a kinship of up to 800 MB (`docs/specs/analyses/ldDecay.md`,
   **Open 1**; `docs/specs/worker/client.md`, "The LD decay, and the
   restart after it"). The plan of stage 5 measures, in Chromium and
   WebKit, the growth of the engine 3 s after an LD decay with the
   restart and without it.
