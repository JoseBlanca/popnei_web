# The entry of the population genetics page

25 September 2026, approved by the owner on 25 September 2026, and revised
on 26 September 2026 with the owner's decisions at stop 9.6 of
`docs/plans/walking-skeleton.md`, on the points of the review of its
work package 9; revised again on 26 September 2026 for stage 3, the
Variants step whole, as the revision of `docs/architecture.md` the owner
approved that day has it: the analyses of the Variants step in
`apps.ts`, `countsOf` in the place of `numVarsOf`, `runs.ts` awaiting
every handle the store gives back, and the download of a file of the
filtered variants; this revision is approved by the owner on 26 September 2026.
Revised on 27 September 2026 for stage 4 where it names the PCA: `pca`
joins the analyses of `apps.ts`, in the Analyses step before the
diversity, and `countsOf` gives no counts of its pass; and again the
same day, to agree with the specs written beside it: an individuals
source of an xlsx, with no options of a CSV, is asked for, where stage 2
threw it as a defect. This spec gives
the page of the population genetics application, `popgen.html`, and its
entry, the code that runs once when the page opens and keeps working for
the life of the page: it makes the store and the two workers and joins
them, asks the workers to read each file the project is waiting for,
hands the store the outcome of every calculation, keeps what Save needs
outside the screens, and shows in a bar at the top of the page an error
of our own code that nothing else shows. There is no code of it yet. It
develops sections 1, 5, 6 ("Who asks for a read"), 7 and 9 of
`docs/architecture.md`, with what was revised there on 25 September
2026, and the row `src/ui/runs.ts` of its section 9. It depends on
`docs/specs/core/store.md` and `project.md`, which are approved, and on
`docs/specs/core/projectFile.md`, `docs/specs/worker/messages.md` and
`client.md`, and `docs/specs/shell.md`, which were approved the same day,
as is every other spec of this stage. The words the application shows
once it has started are those of the shell, of the steps and of the
panels, each in its own spec; the few words of the page before that,
below under "The page", are this spec's. The stages are those of
`docs/build-order.md`; this one is stage 2, the walking skeleton, the
smallest application that goes through every part once.

The words of the web used here, as they are used in this application:

- **A web worker** is a second thread of the browser tab, which cannot
  touch what the page shows and talks to it only through messages. The
  **calculation worker** runs popnei; the **light worker** reads the
  individuals file. The **worker client** is the page's side of both, in
  `src/worker/client.ts`: it sends the requests, keeps a queue for each
  worker, and starts a worker again when it has to.
- **A promise** is a value that arrives later, such as the outcome of a
  calculation. Code that waits for it is said to await it. A **handle**
  is what the client gives for a request under way: a promise of its
  outcome, and a `cancel()` that stops it.
- **An event handler** is a function the browser calls when something
  happens, a click, a key, a message of a worker; a **listener** is one
  the page registered for an event, and it can be taken off again. An
  event of an element is seen first by the document, in what the
  browser calls the **capture phase**, before it reaches the element.
- **React** draws the screens into an element of the page, its **root**,
  as a tree of **components**, each a function that draws a part of the
  screen. A **provider** is a component that hands a value, such as the
  store, to every component under it. An **error boundary** is a
  component that catches what throws while React draws the part of the
  screen under it, and shows a message in its place.
- **Vite** is the tool that builds the site; its `input` lists the pages
  it builds, and its `define` writes a value into the code at the build.

## What it does

A user sees the entry only when it goes wrong: a file that stays
"Reading panel.nei." for ever because nobody asked the worker to read
it, a calculation that ends and whose result never appears, a button
that does nothing because what it ran threw an error that went to the
console of the browser, which a user does not open.

### The page

`popgen.html`, at the root of the repository beside `index.html` and
`probe.html`, so that the build writes it to the root of `dist/` and it
is served at `/popnei_web/popgen.html` (`docs/technology.md`, section 4;
`docs/specs/site.md`):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Population genetics · popnei web</title>
    <script>/* the start guard, below */</script>
  </head>
  <body>
    <div id="defects"></div>
    <div id="root"><p>Loading the population genetics application…</p></div>
    <noscript>The population genetics application needs JavaScript, which
      this browser has turned off.</noscript>
    <script type="module" src="/src/ui/popgen.tsx"></script>
  </body>
</html>
```

`vite.config.ts` gains `popgen: page("popgen")` in `input`, beside
`index` and `probe`; Vite fails the build on a page `input` names that
does not exist, so the line comes with the page (`docs/specs/site.md`).
The two elements are two React roots: `#defects` holds the error bar,
with a status region of its own, and `#root` the application, so that
the bar, and its Save, stay when the application's root is lost (below,
"The errors nothing else shows").

**The start guard** is a few lines of plain script in the `<head>`, run
before the application's code, since a browser older than the floor,
Chrome and Edge 111, Firefox 115, Safari 16.4 (`docs/technology.md`,
section 6), fails on the first function or syntax it lacks, and the page
would show "Loading…" for ever. It does three things:

- **It tests the browser** for `Array.prototype.toSorted`, which the
  code of core calls, the keys, the cache and the project file, and which
  Chrome 110, Firefox 115 and Safari 16 were the first to have (section 6
  of `docs/technology.md`). It was `findLast`, of Chrome 97 and Firefox
  104, until the review of 25 September 2026 found that a Firefox from
  104 to 114 passed that test and then failed in its first calculation,
  since a module worker needs Firefox 114 and `toSorted` Firefox 115,
  with words that told the user to reload the page. When it is missing,
  the guard writes into `#root` "The application needs Chrome or Edge
  111, Firefox 115 or Safari 16.4, or a newer version, and this browser
  is older." and marks it, so that the entry, when it runs, stops at its
  first line and leaves the message. No single feature marks the floor
  exactly: a Chrome 110, or a Safari from 16.0 to 16.3, passes the test
  and may then fail inside the application, where the error bar shows
  the error as one of ours. Those are browsers of early 2023.
- **It listens to the window's `error` event** until the entry takes
  over, and in that time writes into `#root` "The application could not
  start: ‹the browser's message›. Reload the page.", the message without
  the "Uncaught " that Chromium puts before it and without its last full
  stop, since the sentence adds its own. This covers a throw
  while the modules of the application are first run, in a browser that
  passed the test.
- **It listens to the `error` event of the script element**, in its
  capture phase on the document, since a module script whose file is not
  found, a page left open across a deploy, fires no `error` on the
  window, and writes "The application could not be loaded. Reload the
  page."

The guard puts on the window one object, `window.__popgenGuard`, with
`tooOld`, the result of the test, and `remove()`, which takes its two
listeners off; `src/ui/popgen.tsx` declares its type with `declare
global`. Decided here, not by the owner.

### At the opening

The entry, `src/ui/popgen.tsx`, does these in this order, all in one
run of its code, so that no message of a worker can arrive before
everything that listens to it exists, since the browser delivers a
message only after the code that is running has finished:

1. It calls `window.__popgenGuard.remove()`, stops there when `tooOld`
   is true, and puts its own listeners on the window (below, "The errors
   nothing else shows"), so that an error in the steps that follow is
   shown.
2. It makes the log of the errors, `createDefects()`, and draws the error
   bar into `#defects`, with no store yet.
3. It makes the store, with `createPopgenStore` of
   `src/ui/popgenStore.ts`, which is apart from the entry so that a test
   in node makes the store with what the page gives it, and which calls
   `createStore` of `src/core/store.ts` with: the
   first project, `firstProject("popgen")` of `src/core/apps.ts`
   (below); the definitions of the analyses of the application, from the
   same file; `send`, the function `(key, job, onProgress) =>
   client.run(key, job, onProgress)`, which reaches the client made in
   the next step, since the store sends nothing while it is made; from
   `apps.ts`, `countsOf`, the id of the counts of the filters,
   `filterCounts.id`, and the statistics of each individual,
   `{ analysis: individualChecks.id, of: individualStatsOf }`, the ids
   taken from the definitions of the two analyses; `write`,
   with `send: (key, job, onProgress) => client.write(key, job,
   onProgress)` and `countsOf: writeCountsOf` of `apps.ts`; the version
   of the application,
   `APP_VERSION` (below, "The version of the application");
   `CACHE_MAX_BYTES` and `MAX_UNDO_STEPS`.
4. It makes the worker client, with `makeRunnerWorker` and
   `makeFilesWorker` of `src/worker/start.ts`, and with `onPopneiReady:
   (v) => store.popneiReady(v)`. The client calls it with popnei's
   version at the first `ready` of the calculation worker, before any
   answer of it, and, for a worker started again after a cancel or a
   crash, once that worker has opened the file again
   (`docs/specs/worker/client.md`, "The calculation worker holds one
   load"); the store ignores a second announcement of the same version.
   The client starts the calculation worker at once, so that popnei's
   wasm, 2.16 MB, 710.6 KB gzipped (`docs/technology.md`, section 2),
   loads while
   the user looks for their file.
5. It makes the saving, `createSaving` (below), which puts the question
   before leaving the page on the window, and draws the error bar again,
   now with the store and the saving.
6. It makes the announcer of the shell, `createAnnouncer`
   (`docs/specs/shell.md`, "The status region"), and subscribes to the
   store the reads (below) and the shell's announcements made from two
   states.
7. It makes the application's root in `#root` with React's
   `createRoot`, with `onUncaughtError` and `onCaughtError`, and draws
   the shell in `StrictMode`, inside the providers that give the screens
   the store (`src/ui/store.tsx`, `.claude/skills/coding/react.md`), the
   announcer, the saving, the function that adds a picked file, below,
   and what the words of the shell need of the application, `SHELL_WORDS`
   of `src/ui/analyses/titles.ts` (`docs/specs/shell.md`, "What it sends
   and reads").

The store and the workers are made here, outside any component, once
per page: a store or a worker made inside a component would be made
again each time React draws it anew, and twice in development, where
`StrictMode` draws everything twice on purpose (`react.md`, "Reading
core"). The saving lives here too, and not in the shell, so that the
bar's Save and the question before leaving still work when the
application's root is lost.

**A file the user picks** gets its load id here. The screens are given a
function `addFile(file: File): string`, through a provider of
`src/ui/files.tsx`, which makes a new load id, 16 random bytes of
`crypto.getRandomValues` written as 32 hexadecimal digits
(`docs/architecture.md`, section 3), calls the client's `addFile(fileId,
file)`, keeps the `File` under the id in a map of its own, and returns
the id; the step then sends the command that puts the source in the
project (`docs/specs/steps/variants.md` and `individuals.md`). The
`File` is in the client's map before the command, so the read that the
command makes the entry ask for always finds it. The same provider gives
`fileOf(fileId): File | null`, the `File` of a load of this page, which
the Variants step reads to read a VCF again with other options, as a new
load of the same `File` (`docs/specs/steps/variants.md`, "Reading the
VCF again"); it is `null` for a load id of an opened project file, whose
files were picked in another session.

### The version of the application

The version of the application is a number in `package.json`,
`"version": "0.1.0"` in stage 2, as the owner decided on 25 September
2026, raised by hand at a release of the site that changes what it
calculates or saves. `define` in `vite.config.ts` writes it into the
code at the build as `APP_VERSION`, which the store is given, the
saving writes into the project file, and the panels show beside a
download (`docs/specs/analyses/diversity.md`, "What it shows"). The
option not taken was the short hash of the git commit the site was
built from, which needs no hand and names the exact build, but from
which a user cannot tell which of "7d84ab1 and 3e268bd" is newer, which
the words of the comparison with the check numbers ask them to.

### `src/core/apps.ts`

The list of what each application has, which section 9 of the
architecture puts in core and which no other spec gives. It holds the
population genetics application alone until stage 7:

- **the definitions of its analyses**, in the order the screens show
  them: from stage 3 the three checks of the Variants step in the order
  of its sections (`docs/specs/steps/variants.md`, "What it does"), the
  histograms of the variants, `variantChecks`
  (`docs/specs/analyses/variantChecks.md`), and the counts of what each
  filter kept, `filterCounts` (`filterCounts.md`), both in the section
  of the filters of the variants, then the statistics of each
  individual, `individualChecks` (`individualChecks.md`), in the section
  of the filters of the individuals; then the diversity
  (`diversity.md`). The stepper names the first check in error in this
  order (`docs/specs/shell.md`, "The stepper"), and the notice, the
  status region and the check numbers of a project file list the
  analyses in it;
- **the step each analysis is shown in**: the three checks in the
  Variants step, the diversity in the Analyses step, so that the shell
  and the steps find the panels of a step here and not by a list of
  their own (`docs/specs/shell.md`; `docs/specs/steps/variants.md`). The
  writing of the filtered variants is in the Variants step too, and is
  not an analysis (`docs/specs/analyses/writeVariants.md`);
- **its steps**, by their ids, in their order: `variants`,
  `individuals`, `analyses`, three, as the owner decided on 25 September
  2026: no Export step until the report, in stage 6, and writing the
  filtered variants goes in the Variants step
  (`docs/specs/shell.md`, "The stepper");
- **its first project**: `emptyProject("popgen")` with the missing data
  filter on at 0.1, as the owner decided on 25 September 2026
  (`docs/specs/steps/variants.md`, "The missing data filter"), since
  `emptyProject` holds no filter;
- **`countsOf`**, which replaces `numVarsOf` of stage 2: the store's
  function that gives, of the result of any analysis, what its pass
  counted (`docs/specs/core/store.md`, "What each filter kept";
  `docs/architecture.md`, section 4). Every result carries the counts of
  its pass, `passStats` (`docs/specs/worker/protocol.md`), and
  `countsOf` gives two things of them, by the `analysis` of the result:
  - the number of variants of the file, which the store records into the
    variants file of the load: `varsProcessed` of the first entry of
    `passStats.filtering`, the variants the first filter was given, or
    `passStats.numVars` when the pass had no filter, for every result;
  - the counts of the filters, a result of `filterCounts`, `{ analysis:
    "filterCounts", passStats }`, for a result whose pass had the
    filters of the variants of its request's project: the diversity,
    the statistics of each individual and `filterCounts` itself; `null`
    for the histograms of the variants, whose pass has no filter, and,
    from stage 4, for the PCA, whose pass has filters of its own, the
    stricter of its MAF filter and the project's and its LD pruning
    (`docs/specs/analyses/pca.md`, "Which variants it reads";
    `docs/specs/analyses/filterCounts.md`, "Which results fill it");
- **`writeCountsOf`**, the store's `write.countsOf`: the result of
  `filterCounts` made of the `passStats` of a written file, whose pass
  always had the filters of its project;
- **`individualStatsOf`**, the store's `statistics.of`: the statistics
  of each individual in a result of `individualChecks`, its
  `individuals`, `missingGtRate` and `obsHetRate`, as
  `docs/specs/core/individualsKept.md` takes them; a defect for a result
  of another analysis;
- **`variantsKept`**, the variants that pass the filters, from a state
  of the store: `passStats.numVars` of the result of `filterCounts` in
  the state done, or `null` when it is not done for the filters as they
  are. The summary line of the shell and the size expected of the
  writing read it (`docs/specs/shell.md`, `ShellWords`;
  `docs/specs/analyses/writeVariants.md`, `writeEstimate`).

### Who asks for a read

The rule is the owner's, of 25 September 2026 (`docs/architecture.md`,
section 6, "Who asks for a read"): after every change of the project, a
command, an undo, a redo, an opening, or a read recorded, the entry
looks at the present project and asks for the read of each source whose
read is pending and has none under way. There are at most two, the
variants file and the individuals file. A read is under way from the
moment it is asked for until its outcome comes back. It is kept with its
handle, and matched with a source by the load id and, for the
individuals file, by the options of its CSV compared by their values,
since an undo and a new choice of the same options give equal options
in different objects.

The entry listens with `store.subscribe`, which also calls it for a
progress of a calculation, and does the work only when the project is
another object than the one it last looked at, a comparison of
references that costs nothing (`docs/architecture.md`, section 2). An
outcome of a read makes it look again whatever the project, as below.

- **The variants file** is asked of the client as an `openVariants` of
  its load, its format and its read options
  (`docs/specs/worker/client.md`), which the client sends to the
  calculation worker, started again first when the load changed
  (`docs/architecture.md`, section 5).
- **The individuals file** is asked as a `readIndividuals` of its load
  and the options of its CSV, `null` for an xlsx, which the client sends
  to the light worker. In stage 2, which had no reader of xlsx and no
  screen that loaded one, a pending source with no options of a CSV was
  a defect, which `wantedReads` threw; from stage 4 it is an xlsx, asked
  for with `csv` `null` (`docs/specs/worker/individuals.md`, "The
  xlsx"), and its read is recorded under that `null`.
- **A read under way whose source the present project no longer holds
  pending** is cancelled: its file was replaced, or the change was
  undone, or the options of the CSV changed again. This is the
  architecture's rule, whose option not taken kept the light worker
  reading for options no project asked for any more. A cancelled read
  records nothing, so its source stays pending in every project of the
  history that holds it, and an undo that gives it back makes the entry
  ask for it again. What it costs: a pick undone and redone while its
  file is read opens the file again, which reads its header.

When an outcome comes back, its read is taken out of those under way,
by its handle, so that a late outcome of an older read of the same
source does not take out a newer one; what it carries is recorded into
the store; and the entry applies the rule again, even when the project
is the same object. So a read that ended `cancelled` without the entry
cancelling it, which the client gives when a request of another load
came first, is asked for again while its source is still pending
(`docs/specs/worker/client.md`, "What the entry and runs.ts do with
it").

| the outcome | recorded as |
|---|---|
| `opened`: the individuals and the ploidy of the variants file | `variantsRead(fileId, { kind: "read", individuals, ploidy, numVars: null })` |
| `failed`, with `popnei`: popnei refused the file | `variantsRead(fileId, { kind: "failed", error: { kind: "popnei", message } })` |
| `failed`, any other kind: the browser could not read the file, `reopenFailed`; the calculation worker crashed, could not start, is of another version, or a message was a defect | `variantsRead(fileId, { kind: "failed", error: { kind: "worker", error } })`, the error as the client gives it, whose words `projectNeeds` gives by its kind |
| `read`: the individuals file read, its table, the types of its columns, and what "auto" found | `individualsRead(fileId, csv, { kind: "read", table, columns, found })` |
| `refused`: the reader refused the file, with the way it is wrong | `individualsRead(fileId, csv, { kind: "failed", error })` |
| `failed`: the light worker failed | `individualsRead(fileId, csv, { kind: "failed", error: { kind: "worker", error } })` |
| `cancelled`, of either | nothing |

The error the client gives is a `RunError` of
`docs/specs/worker/protocol.md`, the ways a request fails; the reader's
is an `IndividualsFileError` of the same file, the ways an individuals
file is wrong. The records of `src/core/project.ts` record a read only
into a source with that load id, and options, that is pending or failed
because its worker failed, and change nothing otherwise
(`docs/specs/core/project.md`, "The records"). So an answer that crosses
a cancel, one the worker had sent before the cancel reached it, changes
nothing either.

### The outcome of a calculation

`src/ui/runs.ts` holds three functions. The Run button of an analysis
panel, or the Calculate or Count button of a check of the Variants step,
calls the first from its event handler, and the Write button of the step
the second:

```ts
/** Starts the calculation of the analysis `id`, and hands the outcome of
    every request it sends to the store when it arrives; null when the
    store starts none. */
export function startAnalysis<R, F>(store: Store<R, F>, id: AnalysisId): Promise<void> | null;

/** Starts the writing of the filtered variants in `format`, as
    startAnalysis starts a calculation. */
export function startWriting<R, F>(store: Store<R, F>, format: WriteFormat): Promise<void> | null;

/** When the request `runId` was started, in the milliseconds of
    performance.now(), while it is in flight; null otherwise. */
export function startedAt(runId: number): number | null;
```

The two are generic over the result of a request, `R`, and the file a
write gives, `F`: the page hands them its `Store<JobResult, Blob>`, and
the tests a store of fakes.

`startAnalysis` calls `store.startRun(id)`, and `startWriting`
`store.startWrite(format)`; each gives `null`, and nothing is done, or a
list of handles, the requests the store sent, which is empty when a Run
waits for statistics of each individual already in flight
(`docs/specs/core/store.md`, "The individuals kept"). For every handle
the entry awaits in the same way: it notes the time, awaits the
handle's `outcome`, forgets the time, and calls `store.runEnded(run.id,
outcome)`. `runEnded` gives back a list of handles too, the requests of
the Runs that waited for those statistics, which the store sends when
they end; each is awaited in the same way, so that the outcome of every
request the store sends reaches it, whichever call sent it. The promise
of `startAnalysis` and of `startWriting` settles when the handles its
own `startRun` or `startWrite` gave have ended, and with them every
handle that the `runEnded` of those gave back, and so on. A handle that
the `runEnded` of another press's request gives back is awaited by that
other press's promise: a Run that waits for statistics already in
flight gets an empty list, and its promise settles at once, while its
own request, sent when the statistics end, is awaited by the promise of
the press that started them.
The outcome never fails, since a failure is one of its values
(`docs/specs/worker/protocol.md`). The store stops a request with the
handle it keeps, and its outcome, `cancelled`, arrives here like any
other; `runs.ts` cancels nothing (`docs/architecture.md`, section 5).

A handle that `runEnded` gives back is awaited whichever press led to
it, so a Run of the diversity that waited for statistics started by the
Calculate of the Variants step has its own request awaited when the
statistics end, though that Calculate called `startAnalysis` for
`individualChecks`. Decided here, not by the owner.

The panel of an analysis reads `startedAt` for the time it shows while
the calculation runs, which is not lost when the user goes to another
step and back (`docs/specs/analyses/diversity.md`, "The states"). A Run
that waits for the statistics shows the time of their request; when its
own request is sent, the clock starts again with it, as the words of the
running state change from "Calculating the statistics of each
individual…" to "Calculating".

The button does not await what `startAnalysis` or `startWriting`
returns; it passes it over with `void`, which the lint allows. What
rejects it is a defect of our code, a `runEnded` that throws, and a
promise rejected with no one to handle it goes to the window's
`unhandledrejection` event, and so to the error bar, which is where a
defect belongs. The tests await it. When several `runEnded` of the
handles of one press throw, the promise settles once every handle has
ended, and rejects with the first defect; each other one is thrown on
its own, outside the promise, where the window's `error` event takes it
to the error bar too, so that no defect is lost behind the first.

### The saving

`src/ui/saving.ts` makes the text of the project file and hands it to
the browser as a download, for Save project of the header and Save the
project of the error bar alike, and keeps what the question before
leaving the page needs. The owner decided on 25 September 2026 that
Save is a dialog of our own, in the page, with a field for the name of
the file and a Save button, after which the browser downloads the file,
and that the page never says the file was saved. The shell draws the
dialog and says what the user sees of it (`docs/specs/shell.md`,
"Saving"); the saving does the rest:

- `save(name)` calls `writeProjectFile` of `src/core/projectFile.ts` with
  `store.getState()`, the definitions of the analyses of `apps.ts`,
  `APP_VERSION` and `new Date().toISOString()`, and downloads the text
  under `name`, the name the user left in the field, which starts at
  `projectFileName` of the present project, by a link to a `Blob` of the
  text that it clicks and then releases. A name that does not end in
  `.popnei.json` gets it, so that the file opens again with Open
  project…: `panel` gives `panel.popnei.json`, and a name that ends in
  `.json` has that ending replaced, so that `run1.json` gives
  `run1.popnei.json` and not `run1.json.popnei.json`, as the owner
  decided on 26 September 2026 (point 4 of the review of work package 9
  of `docs/plans/walking-skeleton.md`). The endings are found in any
  case, as `projectFileName` finds those of a variants file: `run1.JSON`
  gives `run1.popnei.json`, and `run1.POPNEI.JSON` is kept. `writeProjectFile` refuses
  nothing; it throws a defect on a check number that is not finite,
  which, in the event handler of the button, reaches the error bar.
- **A save that fails**, a defect thrown as the file is written or
  handed to the browser, is recorded before it is thrown on:
  `saveFailed()` is true from then until a save succeeds, and
  `subscribe` tells the error bar, which then no longer says to save
  (`docs/specs/shell.md`, "The error bar"), whichever Save failed, the
  header's or the bar's, as the owner decided on 26 September 2026.
- `read(text)` calls `readProjectFile` of `projectFile.ts` with the text
  of a picked project file, the application of the page, `"popgen"`, and
  the same definitions of its analyses, so that Open project… of the
  shell reads a file with what the saving writes it with, and the shell
  names no application.
- **The base project** is the project the page started with, the one
  last opened from a project file, which `opened(p)` sets, or the one
  last saved, which `save` sets, with the keys of the analyses that were
  done in it. The project has changed when the present project is
  another object than the base, or when an analysis is done under a key
  that was not done in the base: a result that ended after a Save is a
  change, since the file saved lacks its check numbers, as the owner
  decided on 26 September 2026 (point 8 of the review of work package 9
  of `docs/plans/walking-skeleton.md`, with point K). Then the listener
  of the window's `beforeunload` event asks the browser to confirm
  before the page is left, and Open project… asks before it replaces the
  project. From stage 3 the listener asks as well while a file of the
  filtered variants is written and not saved, `write` of the store in
  `done`, even when the project has not changed: leaving the page loses
  the file as an opening does, and Open project… asks for it too
  (`docs/specs/shell.md`, "Opening"). A result that comes back from the cache after an undo to the
  base is under a key done in the base, and is no change. A save setting the base is the owner's decision of 25
  September 2026, to confirm with the owner: the page does not learn
  whether the download was kept, so a user who cancels the browser's own
  question after our Save, or whose download fails, leaves the page with
  no question. Until it is confirmed the plan builds it so, and the other
  answer, a save that leaves the base as it was, is one line of
  `save` and one test.

### A file of the filtered variants saved

From stage 3, `src/ui/saving.ts` saves a file of the filtered variants
too, as section 9 of the architecture has it, with `saveWritten`, which
the Save button of the Variants step calls
(`docs/specs/analyses/writeVariants.md`, "Saving the file"). It is given
the name the step shows, `panel.filtered.nei`, and takes the file from
the state of the store, `write` in `done`, whose `written.file` is the
`Blob` the calculation worker made:

1. It hands the `Blob` to the browser as a download, through a link to
   an address of it, `URL.createObjectURL`, with the `download` attribute
   naming the file, which it clicks and removes, as the project file is
   downloaded.
2. It calls `store.writeSaved()`, so that the store forgets the file and
   the step shows it handed to the browser.
3. It releases the address a minute after the click, as the download of
   a text does in `src/ui/download.ts`: Safari on iOS asks the user
   whether to download before it reads the address, and an address
   released before the answer gives a failed download. The `Blob` is
   then held by nothing of the page, and its memory is the browser's to
   give back.

So the page releases the file once it is saved, and the store forgets it
when a change of the filters, a new load or an opened project makes it
another file than the step shows, as section 6 of the architecture has
it; the page holds nothing more of it. A file forgotten so before it was
saved is gone, and the notice of the change says that its Undo does not
bring it back (`docs/specs/core/store.md`, `writeDiscarded`; point G of
`docs/specs/stage-3-open-points.md`). The page is not told whether the
browser kept the download, as for the project file (above, "The
saving"): a user who cancels the browser's question of where to save,
which Firefox and Safari can ask, writes the file again. The owner
decided so on 26 September 2026 (point A of
`docs/specs/stage-3-open-points.md`); the option not taken kept the file
until a change of the filters, with Save offered again, and the tab
holding its memory, about 960 MB for a million variants of 1,000
individuals, meanwhile.

`saveWritten` of a store whose `write` is not `done` is a defect: the
Save button is shown only in that state.

### The errors nothing else shows

An error of our own code that no error boundary of React sees, one
thrown in an event handler or in a promise whose rejection nothing
handles, is shown in the error bar, as the owner decided on 25 September
2026 (`.claude/skills/coding/react.md`, "Errors"). The browser fires the
window's `error` event for the first and its `unhandledrejection` event
for the second; the entry listens to both from its first line, and
gives what they carry to the log of the bar, `src/ui/defects.ts`, which
the bar reads (`docs/specs/shell.md`, "The error bar").

- **Two messages are not errors**: those that start with "ResizeObserver
  loop", which Chromium ends "completed with undelivered notifications."
  and older browsers "limit exceeded". The browsers fire them as `error`
  events when a plot or a layout that watches its size takes more than
  one frame to settle, and they break nothing. The entry passes them
  over, by `isResizeObserverNoise` below.
- **The error is kept as the browser gave it**: its message, its stack,
  and which of the two events carried it. The `error` event gives the
  thrown value in `event.error`, which the browser leaves `null` for an
  error it does not describe, and the entry then gives `event.message`.
  A value that is not an `Error`, which our code never throws but a
  library could, is kept as its text.
- **The console keeps the error too.** The entry does not stop the
  browser from writing it there, for whoever opens the tools of the
  browser.
- **A crash of a worker is not an error of the page.** A throw inside a
  worker that its script does not stop is, by the HTML standard, passed
  on to the `Worker` object on the page, and from there to the window,
  where the bar would show a failure that the client already handles as
  a crash of the worker. So the worker's own `error` handler and the
  client's `onerror` each call `event.preventDefault()`, which stops it
  there (`docs/specs/worker/client.md`, "Crashes, defects, and every
  read answered"; `runner.md` and `individuals.md` beside it).
- **An error thrown while React draws a step** is caught by the error
  boundary around the step's body, in `src/ui/shell/ErrorBoundary.tsx`
  (`.claude/skills/coding/react.md`, "Errors"), which draws in its place
  the step's `<h1>` alone, with no words of its own, so that the header,
  the stepper and the other steps keep working. React then calls
  `onCaughtError`, and the entry gives the error to the log of the bar
  with the component stack, as below, so that the bar says what
  happened; going to another step and back draws the step again.
- **An error thrown while React draws the shell itself**, outside the
  boundary of every step and every analysis panel, is one React does not
  catch: React then removes everything from the application's root and
  calls `onUncaughtError`. The entry gives it to the log of the bar with
  the component stack, the list of the components that were being drawn,
  so that the page says what happened. The bar is in its own root, and
  its Save calls the saving directly, so the user can still save.
  `onCaughtError`, for what a boundary caught, gives it to the log of
  the bar in the same way, and writes the error and the component stack
  to the console too, since there is no server to send them to.

## The TypeScript interface

What the entry uses of its own modules; the entry itself exports
nothing.

The reads, in `src/ui/reads.ts`. A read the project waits for:

```ts
export type WantedRead =
  | { readonly kind: "variants"; readonly fileId: string;
      readonly format: "vcf" | "nei";
      readonly readOptions: { readonly ploidy: number; readonly onlyPassed: boolean } | null }
  | { readonly kind: "individuals"; readonly fileId: string;
      readonly csv: CsvOptions | null };   // null for an xlsx, from stage 4

/** The reads the project waits for: its sources whose read is pending. */
export function wantedReads(p: Project): readonly WantedRead[];
```

The object that keeps the reads under way and applies the rule above;
the entry calls `sync` from its subscription to the store:

```ts
export function createReads(deps: {
  readonly store: Pick<Store<JobResult, Blob>, "getState" | "variantsRead" | "individualsRead">;
  readonly client: ReadClient;              // the part of the worker client that reads
}): { sync(): void };
```

`ReadClient` is `Pick<Client, "openVariants" | "readIndividuals">` of
`docs/specs/worker/client.md`; the tests give a fake.

The saving, in `src/ui/saving.ts`:

```ts
export function createSaving(deps: {
  readonly store: Store<JobResult, Blob>;
  readonly app: AppId;            // the application of the page, "popgen"
  readonly analyses: readonly AnalysisDef<Job, JobResult>[];
  readonly appVersion: string;
  readonly download: (name: string, text: string) => void;  // the browser's; a fake in the tests
  readonly downloadFile: (name: string, file: Blob) => void; // the same for a file, its address released a minute later
}): {
  proposedName(): string;         // projectFileName of the present project
  save(name: string): string;     // downloads the project file; the name used; the present project is the base
  read(text: string): Result<Project, ProjectFileError>;  // readProjectFile with the app and analyses
  opened(p: Project): void;       // a project file was opened: p is the base
  changed(): boolean;             // the present project is not the base, or a result ended since
  saveFailed(): boolean;          // the last save threw as it wrote or downloaded the file
  readonly subscribe: (listener: () => void) => () => void;  // called when saveFailed changes
  saveWritten(name: string): void; // from stage 3: downloads the file of `write`, then store.writeSaved()
};
```

`downloadFile` is `src/ui/download.ts`'s, beside `downloadText`, with the
same link and the same release a minute after the click.

What `src/core/apps.ts` exports from stage 3, beside what it exported in
stage 2, `DEFAULT_MAX_MISSING_RATE`, `DEFAULT_PLOIDY`,
`DEFAULT_ONLY_PASSED`, `POPGEN_STEPS`, `StepId` and `firstProject`:

```ts
/** The analyses of the population genetics application, in the order the
    screens show them: individualChecks, variantChecks, filterCounts,
    and, from stage 4, pca before diversity. */
export const POPGEN_ANALYSES: readonly AnalysisDef<Job, JobResult>[];

/** The step each analysis is shown in. */
export const POPGEN_ANALYSIS_STEPS: Readonly<Record<string, StepId>>;
// { individualChecks: "variants", variantChecks: "variants",
//   filterCounts: "variants", pca: "analyses", diversity: "analyses" }

/** What the pass of a result counted, as the store's countsOf; replaces
    numVarsOf. */
export function countsOf(r: JobResult): PassFound<JobResult>;

/** The result of filterCounts made of the counts of the pass of a
    written file, as the store's write.countsOf. */
export function writeCountsOf(pass: PassStats): JobResult;

/** The statistics of each individual of a result of individualChecks,
    as the store's statistics.of; a defect for another result. */
export function individualStatsOf(r: JobResult): IndividualStats;
```

`POPGEN_ANALYSIS_STEPS` is keyed by the ids of the analyses, which are
literals of their modules and never names of the user, so an object is
allowed (`.claude/skills/coding/worker.md`); a test checks that it names
every analysis of `POPGEN_ANALYSES` and no other. `PassFound` is of
`docs/specs/core/store.md`, `PassStats` of
`docs/specs/worker/protocol.md`, and `IndividualStats` of
`docs/specs/core/individualsKept.md`.

The log of the errors the bar shows, in `src/ui/defects.ts`, a small
store of its own that the bar reads with `useSyncExternalStore`, as the
screens read the store of core:

```ts
export interface Defect {
  readonly message: string;       // the message, or the text of what was thrown
  readonly details: string;       // the message, the stack or the component stack, and where it came from
}

export interface DefectsState {
  readonly first: Defect | null;  // the first error since the bar was last closed
  readonly more: number;          // how many came after it
}

export function createDefects(): {
  getState(): DefectsState;
  readonly subscribe: (listener: () => void) => () => void;
  report(error: unknown, origin: "event" | "rejection" | "drawing", componentStack: string | null): void;
  dismiss(): void;                // the bar is closed: the log starts again empty
  details(): string;              // every error kept, for "Copy the details"
};

/** Whether the message of an `error` event is one of the ResizeObserver
    messages that break nothing. */
export function isResizeObserverNoise(message: string): boolean;
```

It keeps the details of the first 20 errors and counts the rest, so that
an error thrown in a loop does not fill the memory of the tab.

## The cases

- **A file picked before popnei has loaded.** The read waits in the
  client's queue until the calculation worker is ready, and the step
  says "Reading panel.nei." meanwhile.
- **popnei's wasm does not load**, the network or a deploy: the client
  gives up after its second start fails, and every request, the read of
  the variants file among them, fails with `couldNotStart`. The read is
  recorded as failed, and the analyses are locked with "panel.nei could
  not be read: the application could not start its calculations. Reload
  the page and load it again." (`docs/specs/core/project.md`, open point
  4). Nothing is shown before a file is picked.
- **The calculation worker crashes while it opens the file**: the read
  fails and is recorded as failed because its worker failed. The entry
  does not ask for it again, since the source is no longer pending, and a
  worker that crashed on a file may crash on it again; the reason tells
  the user to load it again, which is a new load and a new read.
- **An undo back to a load already read** asks for nothing: its source is
  read. The client opens that file again before the next calculation on
  it (`docs/architecture.md`, section 6).
- **An opened project** holds no variants file, so nothing is read until
  the user gives it. Its individuals file is in the project, read. A
  project file with a source whose read is pending would name a load
  whose `File` the page does not hold (`docs/architecture.md`, section
  6); `docs/specs/core/projectFile.md` gives no such project. If it did,
  the client would find no `File`, the read would fail as a defect, and
  the step would say that the file could not be read and ask for it
  again.
- **A record, a `runEnded` or a listener of the store that throws**, a
  defect: in a promise, it reaches the error bar through
  `unhandledrejection`; the store leaves itself as it was
  (`docs/specs/core/store.md`, "How it runs").
- **A defect while the entry starts**, a `createStore` that throws on two
  analyses of one id: the entry's listener is already there, so the bar
  says so, with the words it has when there is no store and no Save
  (`docs/specs/shell.md`, "The error bar"), and the application's root is
  not drawn: steps 3 to 7 of "At the opening" run in a `try` whose `catch`
  empties `#root`, so that "Loading the population genetics
  application…" does not stay under the bar, and throws the error again
  for the window's listener.
- **A browser below the floor**: the start guard's message.
- **The page reloaded or closed**: the project is lost, since nothing of
  it is kept in the browser; the page asks first when the project has
  changed (above, "The saving").

## How it is verified

With Vitest, in node, at `createReads`, `startAnalysis`, `createSaving`,
`createDefects`, `isResizeObserverNoise`, `addFile` and `apps.ts`, with
the real store of core and a fake client whose reads the test ends by
hand and whose cancels it records.

- **The rule of the reads.** A pick of a variants file: one
  `openVariants`, with its load id, format and read options. A progress
  of a calculation, which calls the listener with the same project: no
  second request. The outcome `opened`: the project's source is read,
  with the individuals and the ploidy. The same file picked again, a new
  load id: a second `openVariants`.
- **Cancelled.** A pick, then an undo before the outcome: the read is
  cancelled; a redo: a second `openVariants` of the same load. The
  options of a CSV set to A then B: the read of A cancelled, B asked; an
  undo: A asked; A chosen again as a new object with the same values
  while B is under way, then A again: no second request of A. A read the
  fake ends `cancelled` without a cancel, its source still pending: asked
  again. A late `cancelled` of the first read of A, after a second read
  of A was asked: the second stays under way, and its outcome is
  recorded. A cancelled read records nothing.
- **Each row of the table of the outcomes**, the refusal of popnei, a
  `workerFailed`, a `couldNotStart`, a refusal of the reader, a failure
  of the light worker, recorded as the table says; after a
  `workerFailed`, no second request.
- **`wantedReads`** of an individuals source pending with `csv` null
  gives a read with `csv` `null`, which the client is asked for with
  `null`, and its outcome is recorded with `individualsRead(fileId,
  null, …)`; stage 2 threw it.
- **`startAnalysis`**: `null` when `startRun` gives `null`; the outcome
  given to `runEnded` with the id of its request; `startedAt` of that id
  a number while it is in flight and `null` after; a `runEnded` that
  throws rejects the promise. From stage 3, with the store of core and a
  fake `send`: a Run of the diversity with a threshold on the
  individuals and no statistics gives one handle, of the statistics;
  their outcome given, `runEnded` gives the diversity's own handle, whose
  outcome is awaited and given to `runEnded` too, and the promise settles
  after it; a `runEnded` that throws for that handle rejects the promise
  of the press; two `runEnded` that throw for two handles of one press,
  the first rejects the promise and the second is thrown outside it; a Run that waits for statistics already in flight gives no
  handle, and its promise settles at once, while its request, sent when
  they end, is awaited all the same, and the promise of the Calculate
  that started the statistics settles after it.
  **`startWriting`** in the same way, with `startWrite("nei")` and a
  fake `write.send`.
- **`createSaving`**: `save("panel.popnei.json")` downloads, through the
  fake, the text of `writeProjectFile` under that name, and returns it;
  `save("panel")` downloads under `panel.popnei.json`, and
  `save("run1.json")` and `save("run1.JSON")` under `run1.popnei.json`; `proposedName` is
  `projectFileName` of the present project; `changed` is false on the
  first project, true after a command, false again after an undo back to
  it, after `opened(p)` with the present project, and after a save, and
  true after a command that follows the save, and after a result that
  ends after the save, with no command; false after a save made once
  that result had ended; `saveFailed` is false at first, true after a
  save whose download throws, with the listener called, and false again
  after a save that succeeds; `read` of the text a save
  downloaded gives its project, and of the text of a project file of
  association refuses it as `otherApp`.
- **`addFile`** returns 32 hexadecimal digits, a new one at every call,
  and the fake client holds the `File` under it when it returns.
- **`createDefects`**: the first error kept, the second counted in
  `more`, the 21st counted and its details not kept; `dismiss` empties
  it; `details` holds every message kept; a thrown text kept as its text.
  **`isResizeObserverNoise`** is true of "ResizeObserver loop completed
  with undelivered notifications." and "ResizeObserver loop limit
  exceeded", false of any other message.
- **`apps.ts`**: the first project has the missing data filter at 0.1
  and nothing else; the analyses have distinct ids, and each has its
  step in `POPGEN_ANALYSIS_STEPS`. `countsOf` of a diversity result whose
  `passStats` is `{ numVars: 1152, filtering: { missing_data: {
  varsProcessed: 1200, varsKept: 1152 } } }` gives `numVarsRead` 1,200
  and the counts `{ analysis: "filterCounts", passStats }` of the same
  `passStats`; of a result of the histograms of the variants, `{
  numVars: 1200, filtering: {} }`, `numVarsRead` 1,200 and no counts; of
  a result of the statistics of each individual and of `filterCounts`,
  both; of a result of the PCA whose `passStats` has `missing_data` 1,200
  to 1,200, `maf` 1,200 to 1,175 and `ld` 1,175 to 535, `numVarsRead`
  1,200 and no counts. `writeCountsOf` of those counts gives the same result of
  `filterCounts`. `individualStatsOf` of a result of `individualChecks`
  gives its three fields, and of a diversity result throws.
- **`saveWritten`**, with a fake `downloadFile`: in `done`, the fake is
  given the name and the very `Blob` of the state, and then the store's
  `write` is `saved`, with no file; in `ready`, a defect.

With Playwright, which drives Chromium, Firefox and WebKit, the engines
of the browsers the site supports, and can run code inside the page and
inside a worker, against the built site
(`.claude/skills/coding/testing.md`), and with axe, a checker of the
rules of accessibility that the tests run on the page:

- `/popnei_web/popgen.html` shows the shell with the Variants step, no
  error bar, and axe finds no violation of WCAG 2.2 at level AA, the
  standard of accessibility the site follows.
- The flow of the walking skeleton (`testing.md`, "The walking skeleton,
  as a flow") is the check of the rest: a file picked is read, a
  calculation's result is shown, a cancel leaves the application
  working.
- An error thrown from a handler of the page, `page.evaluate(() => {
  setTimeout(() => { throw new Error("test") }) })`, and a promise
  rejected with nothing to handle it, `page.evaluate(() => {
  void Promise.reject(new Error("test")) })`, each show the bar with the
  message, as an alert; a second error adds "1 more error followed it."
  A throw directly inside `page.evaluate` would reject the call of the
  test and never reach the page's listener.
- A throw outside any request inside the calculation worker, made with
  Playwright's `evaluate` of that worker, `setTimeout(() => { throw new
  Error("test") })`, starts the worker again and shows no error bar.
- The entry's file answered 404 shows "The application could not be
  loaded. Reload the page."; answered with a file of bad syntax, "The
  application could not start: …".

- A throw while React draws the Variants step, made by an
  `Intl.NumberFormat` that throws, which its number field calls, shows
  the bar, and leaves the header, the stepper and the step's `<h1>`.
- A defect while the entry starts, made by an `Object.freeze` that
  throws on the first project, which `createStore` freezes, shows the
  bar with its words for an error as the page started, and no
  "Loading…".
- A browser without `Array.prototype.toSorted` shows the guard's words
  for a browser too old, and no error bar.
- From stage 3, in the flow of the Variants step: the Save of a file
  written at 0.05 gives a download named `panel.filtered.nei` of 250,994
  bytes in each engine, and the step then shows it handed to the
  browser, with no second Save.
- From stage 3: with the project saved and then a file written, a
  reload of the page raises the browser's question, and after the file
  is saved it raises none.

One case cannot be made in the built site without a hook for the tests,
code that exists only to let a test cause it: a throw while React draws
the shell outside every boundary. It is checked by review.

## Open points

The open points of the eleven specs of stage 2 are gathered in
`docs/specs/stage-2-open-points.md`. The one this spec had, the version
of the application, was decided by the owner on 25 September 2026: a
number in `package.json`, 0.1.0 now (point I there), as "The version of
the application" above has it. One part of a decision is to confirm:
whether a Save sets the base, so that the browser's question before
leaving is not asked after it (point K there; "The saving", above).

The one opened by the revision of stage 3 was decided by the owner on
26 September 2026 (point A of `docs/specs/stage-3-open-points.md`): a
file of the filtered variants is released when Save is pressed, as the
architecture has it, and not kept until a change of the filters ("A
file of the filtered variants saved", above).

## Not in this spec

- The words the application shows once it has started: those of the
  error bar, the stepper, the notices and the status region in
  `docs/specs/shell.md`, and those of each step and panel in its spec.
- The worker client, its queue, its starts again and its map of files:
  `docs/specs/worker/client.md`.
- The steps and the panel of the diversity: `docs/specs/steps/` and
  `docs/specs/analyses/diversity.md`.
- The page of the association application, `gwas.html`, with its own
  entry: stage 7.
- The setting of the theme, light or dark, and the lines of the
  `<head>` that apply it before the page is drawn
  (`.claude/skills/coding/css.md`, "Light and dark"): the walking
  skeleton follows the theme of the system.

## What this spec relies on in the other specs of stage 2

Each was approved by the owner on 25 September 2026 and says what is listed here.

- `docs/specs/worker/client.md`: `createClient` with the two functions
  that make the workers and `onPopneiReady`, called as its section "The
  calculation worker holds one load" says; the calculation worker started
  when the client is made; `addFile(fileId, file)`, `run(key, job,
  onProgress)` for the store, and `openVariants` and `readIndividuals`,
  each with a handle whose outcome never fails, with the kinds of the
  table above, and a `cancel()`; a read whose `File` is not in its map
  fails as a defect; and its `onerror` of a worker calls
  `event.preventDefault()`.
- `docs/specs/worker/runner.md` and `docs/specs/worker/individuals.md`:
  the worker's own `error` handler, which posts `crashed`, calls
  `event.preventDefault()`.
- `docs/specs/analyses/diversity.md`: its definition, exported for
  `apps.ts`; its panel reads the time a run started from `startedAt` of
  this spec's `runs.ts`.
- `docs/specs/core/projectFile.md`: `writeProjectFile(state, analyses,
  appVersion, saved)`, which refuses nothing; `projectFileName`; an
  opened project holds no source whose read is pending.
- `docs/specs/shell.md`: the words of the error bar with a store and
  without one; the announcer and the announcements made from two states;
  what Save and the question before leaving show.
- `docs/specs/steps/variants.md` and `individuals.md`: a step calls the
  `addFile` of `src/ui/files.tsx` before the command of a pick.

What stage 3 asks of the specs revised or written beside this revision,
each of which says it:

- `docs/specs/core/store.md`: `createStore` with `countsOf`, `counts`,
  `statistics` and `write`; `startRun`, `startWrite` and `runEnded`
  giving back the handles they sent; `writeSaved`, and the state `write`
  with its file in `done`.
- `docs/specs/worker/client.md`: `write(key, job, onProgress)`, the
  store's `write.send`, whose outcome is a `Written<Blob>`.
- `docs/specs/worker/protocol.md`: `passStats` in every `JobResult` and
  in a `Written`, and `individuals` in a result of `individualChecks`.
- `docs/specs/analyses/individualChecks.md`, `variantChecks.md`,
  `filterCounts.md` and `writeVariants.md`: their definitions, exported
  for `apps.ts`, the step they are shown in, and the Save of a written
  file that calls `saveWritten`.
- `docs/specs/core/individualsKept.md`: `IndividualStats`, which
  `individualStatsOf` gives.
