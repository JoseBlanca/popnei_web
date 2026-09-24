# The architecture: how a project flows through the applications

September 2026, first draft. The parts of the web applications of popnei,
what each one holds, and how a change made by the user reaches the
results on the screen. What the applications do is in
`docs/functionality.md`, and what they are built with in
`docs/technology.md`. There is no code yet.

## 1. Where things run

The applications have two threads, the page and one web worker.

```
 page (main thread)                                  web worker
┌──────────────────────────────────────┐          ┌─────────────────────────────┐
│ ui        React screens and widgets  │          │ runner                       │
│   │ reads state, sends commands      │          │   the popnei wasm package    │
│   ▼                                  │ messages │   the files wasm, on demand  │
│ core      the project, the graph of  │◀────────▶│   the File objects of the    │
│           results, undo, the cache   │          │   user, read as asked        │
│   │                                  │          │   what is costly to redo:    │
│   ▼                                  │          │   pruned variants, kinship   │
│ charts    D3 and three.js            │          └─────────────────────────────┘
└──────────────────────────────────────┘
```

- **The page** holds the state of the project and everything the user
  sees. It never touches a genotype.
- **The worker** does every calculation, through the wasm package of
  popnei, and reads and writes xlsx and zip through the second wasm
  module, which it loads the first time it needs it
  (`docs/technology.md`). It holds the files the user picked, and the
  intermediate results that are costly to make and are used by several
  analyses. A calculation of seconds or minutes there does not freeze the
  page.

## 2. The project

The project is everything the user has set, and nothing that was
calculated. It is one plain, immutable value, and every change the user
makes is a command that gives a new one.

```ts
interface Project {
  app: "popgen" | "gwas";
  variants: VariantSource | null;     // the file picked and its identity
  filters: VariantFilter[];           // in their order, with parameters
  individualFilters: IndividualFilter[];
  individuals: IndividualsTable | null; // the metadata or traits file, whole
  // popgen: the column that defines the populations, and later the
  //         edits made with the lasso; gwas: the roles of the columns
  grouping: Grouping;
  analyses: Record<AnalysisId, AnalysisOptions>; // the options of each
}
```

- **Immutable**, so that undo is keeping the previous values, and so
  that the screens know what changed by comparing references.
- **Plain data**, which is what the project file is: saving it is
  writing it as JSON, and opening a project file is validating that JSON
  into a `Project` (section 8).
- **The individuals table is in the project, whole.** It is small, and
  the populations edited in the application exist in no file of the user.

## 3. Results, and how they go stale

A result is never stored in the project. It is stored in a cache, under
a key that is a hash of everything it was calculated from: the identity
of the variant file, the filters before it, the individuals and the
grouping it used, its own options, and the version of popnei. Two
requests with the same inputs have the same key.

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
cache keeps results up to a bound of memory, and drops the ones used
longest ago first; one that was dropped is calculated again when it is
asked for.

The notice that says "3 results removed because the MAF filter changed ·
Undo" is made by comparing the results that were on screen before a
command with those after it.

## 4. An analysis is a module

Each analysis is one module, with the same shape, in both applications:

```ts
interface AnalysisDef<Opts, Result> {
  id: AnalysisId;                        // "pca", "diversity", "fst", "gwas"...
  app: ("popgen" | "gwas")[];
  defaults: Opts;
  keyInputs(p: Project): unknown;        // the parts of the project it depends on
  needs(p: Project): string | null;      // why it cannot run yet, or null
  run(p: Project, w: Worker): Run<Result>; // the request to the worker
  warnings(r: Result, p: Project): Warning[]; // raised by the data only
  checkNumbers(r: Result): number[];     // kept in the project file (section 8)
  script(p: Project): string;            // its lines of the Python script
}
```

and its panel of options and its results in `src/ui`. Adding an analysis
is adding its module and its panel; nothing else changes. This is the
piece the work is split into, and what lets an analysis be tried, changed
or dropped without touching the others.

An application is a list of steps and a list of analyses. The two
applications share the steps of the variants and the analysis of the PCA.

## 5. The worker and its messages

The page and the worker talk through typed messages (`docs/technology.md`):

- **A request** names the analysis, the key and the inputs. The worker
  runs one request at a time, because the wasm has one thread, and keeps
  the others in a queue.
- **Progress** comes back as the worker reads the blocks of the file.
  The loop of a calculation runs inside wasm, and a message can be sent
  from inside it.
- **The result** comes back as typed arrays, with its key, and goes into
  the cache. It is shown only if the current project still gives that
  key; if the user changed something meanwhile, it waits in the cache for
  an undo.
- **Cancelling** a request that is running ends the worker and starts a
  new one. While a calculation runs inside wasm, the worker cannot read a
  message that asks it to stop, and without `SharedArrayBuffer`, which
  GitHub Pages does not allow (`docs/technology.md`), the page has no
  other way to tell it. Starting a worker again costs the loading of the
  wasm, and the intermediate results the worker held, which are made
  again when asked for. The page keeps the files the user picked, and
  gives them to the new worker.

The worker keeps, under keys as the results are, what several analyses
reuse: the variants kept by the LD pruning of the PCA, the kinship, the
principal components that the GWAS takes as covariates.

## 6. The files of the user

- **The variant file** is a `File` that the user picked. The page gives
  it to the worker, which reads it as popnei's reader asks, with
  `FileReaderSync`, so that a file larger than the memory of the tab
  still streams (`docs/architecture.md` of popnei, section 11). It is
  read again on every pass; nothing of it is kept but what the analyses
  keep. Its identity, the name, the size, the individuals, the number of
  variants and the fingerprint, is taken on the first pass and goes into
  the project.
- **The individuals file** is read once, by the files wasm, into a table
  that goes into the project. The types of its columns are inferred there
  too, by the same code that Python uses (`docs/functionality.md`, open
  point 2).
- **The files written**, the filtered variants, the xlsx, the zip of the
  report, are made in the worker as bytes and offered by the page as
  downloads.

A browser cannot open a file by itself, so a project that is opened asks
the user for its variant file again (`docs/functionality.md`, section 9).

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

All three are made in `core` from the project and the cache, and none
needs the screens.

- **The project file** is the project as JSON, with the header of
  `docs/functionality.md` section 9 and, for each result that was run,
  the numbers its `checkNumbers` gives. Opening one validates the JSON
  against the schema of its version, refuses a file it cannot read with a
  message that says why, and gives a `Project`.
- **The report** is one HTML page built from the project, the results in
  the cache, their warnings and their plots as SVG, and zipped with the
  other files of the report by the worker.
- **The Python script** is the `script` lines of every analysis that was
  run, after the lines that open the variants, filter them and read the
  individuals file.

## 9. The modules

```
src/core/
  project.ts        the Project, its commands, the validation of a project file
  keys.ts           the canonical form of the inputs of a result, and its hash
  history.ts        undo and redo over projects
  cache.ts          the results under their keys, bounded
  store.ts          the current project, the history and the cache, and the
                    subscription the screens read
  analyses/         one module per analysis, with the shape of section 4
  apps.ts           the steps and the analyses of each application
  projectFile.ts    the project file, written and read
  report.ts         the report
  script.ts         the Python script
src/worker/
  protocol.ts       the messages, shared by the page and the worker
  client.ts         the page's side: the queue, progress, cancelling, restart
  runner.ts         the worker's side: popnei, the files wasm, the files of the user
src/charts/
  histogram.ts scatter.ts line.ts qq.ts heatmap.ts manhattan.ts pca3d.ts
  export.ts         SVG and PNG
src/ui/
  shell/            the header, the stepper, the summary line, the notices
  steps/            one folder per step: variants, individuals, analyses, export
  analyses/         the panel of options and the results of each analysis
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
worker, filters it by missing data, and shows the diversity per
population with the populations of an individuals file in CSV; changing
the threshold of the filter removes the diversity from the screen with
its notice, and undo brings it back with no calculation; a running
calculation can be cancelled; and the project can be saved and opened
again. The xlsx, the plots, the report and the other analyses come after
it, each as a module of its own.

## 11. Open points

1. The hash of the keys and of the fingerprint: which function, and
   whether the fingerprint is computed by popnei, so that Python gives the
   same one.
2. The bound of the cache, in memory or in number of results, and whether
   the results of an analysis can be measured for it.
3. Whether the worker keeps its intermediate results within a bound of
   memory too, and how it tells what fits in a tab.
4. How the version of popnei enters the keys: a result calculated by
   another version is not the same result.
5. Whether a queued request that the user no longer needs, because a
   change gave it another key, is dropped from the queue.
