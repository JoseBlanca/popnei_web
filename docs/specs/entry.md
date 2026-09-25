# The entry of the population genetics page

25 September 2026, a draft awaiting the owner's approval. This spec gives
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
`client.md`, and `docs/specs/shell.md`, which are drafts of the same day,
as is every other spec of this stage. The shell gives every word the
application shows once it has started; the few words of the page before
that, below under "The page", are this spec's. The stages are those of
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

- **It tests the browser** for `Array.prototype.findLast`, which React
  Aria calls and which Chrome 97, Firefox 104 and Safari 15.4 were the
  first to have (section 6 of `docs/technology.md`). When it is missing,
  the guard writes into `#root` "The application needs Chrome or Edge
  111, Firefox 115 or Safari 16.4, or a newer version, and this browser
  is older." and marks it, so that the entry, when it runs, stops at its
  first line and leaves the message. No single feature marks the floor
  exactly: a Chrome from 97 to 110, or a Firefox from 104 to 114, passes
  the test and may then fail inside the application, where the error bar
  shows the error as one of ours. Those are browsers of 2022 and 2023.
- **It listens to the window's `error` event** until the entry takes
  over, and in that time writes into `#root` "The application could not
  start: ‹the browser's message›. Reload the page." This covers a throw
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
3. It makes the store, with `createStore` of `src/core/store.ts`: the
   first project, `firstProject("popgen")` of `src/core/apps.ts`
   (below); the definitions of the analyses of the application, from the
   same file; `send`, the function `(key, job, onProgress) =>
   client.run(key, job, onProgress)`, which reaches the client made in
   the next step, since the store sends nothing while it is made;
   `numVarsOf`, from `apps.ts`; the version of the application
   (**Open 1**); `CACHE_MAX_BYTES` and `MAX_UNDO_STEPS`.
4. It makes the worker client, with `makeRunnerWorker` and
   `makeFilesWorker` of `src/worker/start.ts`, and with `onPopneiReady:
   (v) => store.popneiReady(v)`. The client calls it with popnei's
   version at the first `ready` of the calculation worker, before any
   answer of it, and, for a worker started again after a cancel or a
   crash, once that worker has opened the file again
   (`docs/specs/worker/client.md`, "The calculation worker holds one
   load"); the store ignores a second announcement of the same version.
   The client starts the calculation worker at once, so that popnei's
   wasm, 0.63 MB gzipped (`docs/technology.md`, section 2), loads while
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
   announcer, the saving, and the function that adds a picked file,
   below.

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
file)`, and returns the id; the step then sends the command that puts
the source in the project (`docs/specs/steps/variants.md` and
`individuals.md`). The `File` is in the client's map before the command,
so the read that the command makes the entry ask for always finds it.

### `src/core/apps.ts`

The list of what each application has, which section 9 of the
architecture puts in core and which no other spec of stage 2 gives. In
stage 2 it holds the population genetics application alone:

- **the definitions of its analyses**, in the order the screens show
  them: the diversity alone (`docs/specs/analyses/diversity.md`);
- **its steps**, by their ids, in their order: `variants`,
  `individuals`, `analyses`. Which steps the stepper, the row of the
  steps at the top of the page, shows is the shell's
  (`docs/specs/shell.md`, **Open 1** there);
- **its first project**: `emptyProject("popgen")` with the missing data
  filter at 0.1, which the Variants step asks for
  (`docs/specs/steps/variants.md`, **Open 2** there), since
  `emptyProject` holds no filter;
- **`numVarsOf`**, the store's function that gives, from the result of a
  calculation, the number of variants of the file that its reading of
  the file counted, which the store records into the variants file:
  `numVarsRead` of the diversity's result
  (`docs/specs/analyses/diversity.md`).

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
  and the options of its CSV, which the client sends to the light
  worker. An individuals source pending with no options of a CSV, an
  xlsx, cannot be asked for in stage 2, which has no reader of xlsx and
  no screen that loads one; `wantedReads` throws it as a defect.
- **A read under way whose source the present project no longer holds
  pending** is cancelled: its file was replaced, or the change was
  undone, or the options of the CSV changed again. This is the
  architecture's rule, whose option not taken kept the light worker
  reading for options no project asked for any more. A cancelled read
  records nothing, so its source stays pending in every project of the
  history that holds it, and an undo that gives it back makes the entry
  ask for it again. What it costs: a pick undone and redone while its
  file is read reads the file again, with popnei 0.1.0 the whole file.

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
| `failed`, any other kind: the calculation worker crashed, could not start, is of another version, or a message was a defect | `variantsRead(fileId, { kind: "failed", error: { kind: "worker", error } })`, the error as the client gives it |
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

`src/ui/runs.ts` holds two functions. The Run button of an analysis
panel calls the first from its event handler:

```ts
/** Starts the calculation of the analysis `id` and hands its outcome to
    the store when it arrives; null when the store starts none. */
export function startAnalysis(store: Store<JobResult>, id: AnalysisId): Promise<void> | null;

/** When the calculation `runId` was started, in the milliseconds of
    performance.now(), while it is in flight; null otherwise. */
export function startedAt(runId: number): number | null;
```

`startAnalysis` calls `store.startRun(id)`; when that gives a handle, it
notes the time, awaits the handle's `outcome`, forgets the time, and
calls `store.runEnded(run.id, outcome)`. The outcome never fails, since
a failure is one of its values (`docs/specs/worker/protocol.md`). The
store stops a calculation with the handle it keeps, and its outcome,
`cancelled`, arrives here like any other; `runs.ts` cancels nothing
(`docs/architecture.md`, section 5). The panel of the diversity reads
`startedAt` for the time it shows while the calculation runs, which is
not lost when the user goes to another step and back
(`docs/specs/analyses/diversity.md`, "The states").

The button does not await what `startAnalysis` returns; it passes it
over with `void`, which the lint allows. What rejects it is a defect of
our code, a `runEnded` that throws, and a promise rejected with no one
to handle it goes to the window's `unhandledrejection` event, and so to
the error bar, which is where a defect belongs. The tests await it.

### The saving

`src/ui/saving.ts` makes the text of the project file and hands it to
the browser as a download, for Save project of the header and Save the
project of the error bar alike, and keeps what the question before
leaving the page needs. The shell says what the user sees of it
(`docs/specs/shell.md`, "Saving"):

- `save()` calls `writeProjectFile` of `src/core/projectFile.ts` with
  `store.getState()`, the definitions of the analyses of `apps.ts`, the
  version of the application and `new Date().toISOString()`, and
  downloads the text under `projectFileName` of the present project, by
  a link to a `Blob` of the text that it clicks and then releases. It
  returns the name of the file, which the caller announces in its own
  status region. `writeProjectFile` refuses nothing; it throws a defect
  on a check number that is not finite, which, in the event handler of
  the button, reaches the error bar.
- **The base project** is the project the page started with, or the one
  last opened from a project file, which `opened(p)` sets. The project
  has changed when the present project is another object than the base,
  and then the listener of the window's `beforeunload` event asks the
  browser to confirm before the page is left, as the shell says. A save
  does not change the base, since the page cannot know that the download
  was saved; that is the meanwhile of **Open 3** of `docs/specs/shell.md`,
  whose recommended answer would make a save through the browser's Save
  As dialog set the base.

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
  there (below, "What this spec assumes").
- **An error thrown while React draws the shell itself**, outside the
  boundary of every step and every analysis panel, is one React does not
  catch: React then removes everything from the application's root and
  calls `onUncaughtError`. The entry gives it to the log of the bar with
  the component stack, the list of the components that were being drawn,
  so that the page says what happened. The bar is in its own root, and
  its Save calls the saving directly, so the user can still save.
  `onCaughtError`, for what a boundary caught and shows, writes the error
  and the component stack to the console, since there is no server to
  send them to.

## The TypeScript interface

What the entry uses of its own modules; the entry itself exports
nothing.

The reads, in `src/ui/reads.ts`. A read the project waits for:

```ts
export type WantedRead =
  | { readonly kind: "variants"; readonly fileId: string;
      readonly format: "vcf" | "nei";
      readonly readOptions: { readonly ploidy: number; readonly onlyPassed: boolean } | null }
  | { readonly kind: "individuals"; readonly fileId: string; readonly csv: CsvOptions };

/** The reads the project waits for: its sources whose read is pending.
    Throws a defect on an individuals source pending with no CSV options. */
export function wantedReads(p: Project): readonly WantedRead[];
```

The object that keeps the reads under way and applies the rule above;
the entry calls `sync` from its subscription to the store:

```ts
export function createReads(deps: {
  readonly store: Pick<Store<JobResult>, "getState" | "variantsRead" | "individualsRead">;
  readonly client: ReadClient;              // the part of the worker client that reads
}): { sync(): void };
```

`ReadClient` is `Pick<Client, "openVariants" | "readIndividuals">` of
`docs/specs/worker/client.md`; the tests give a fake.

The saving, in `src/ui/saving.ts`:

```ts
export function createSaving(deps: {
  readonly store: Store<JobResult>;
  readonly analyses: readonly AnalysisDef<Job, JobResult>[];
  readonly appVersion: string;
  readonly download: (name: string, text: string) => void;  // the browser's; a fake in the tests
}): {
  save(): string;                 // downloads the project file; its name
  opened(p: Project): void;       // a project file was opened: p is the base
  changed(): boolean;             // the present project is not the base
};
```

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
  not drawn.
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
  throws.
- **`startAnalysis`**: `null` when `startRun` gives `null`; the outcome
  given to `runEnded` with the id of its request; `startedAt` of that id
  a number while it is in flight and `null` after; a `runEnded` that
  throws rejects the promise.
- **`createSaving`**: `save` downloads, through the fake, the text of
  `writeProjectFile` under `projectFileName`, and returns the name;
  `changed` is false on the first project, true after a command, false
  again after an undo back to it and after `opened(p)` with the present
  project; a save leaves it true.
- **`addFile`** returns 32 hexadecimal digits, a new one at every call,
  and the fake client holds the `File` under it when it returns.
- **`createDefects`**: the first error kept, the second counted in
  `more`, the 21st counted and its details not kept; `dismiss` empties
  it; `details` holds every message kept; a thrown text kept as its text.
  **`isResizeObserverNoise`** is true of "ResizeObserver loop completed
  with undelivered notifications." and "ResizeObserver loop limit
  exceeded", false of any other message.
- **`apps.ts`**: the first project has the missing data filter at 0.1
  and nothing else; the analyses have distinct ids; `numVarsOf` of a
  diversity result gives its `numVarsRead`.

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

Two cases cannot be made in the built site without a hook for the
tests, code that exists only to let a test cause them: a throw while
React draws the shell, and a `createStore` that throws. They are checked
by review.

## Open points

1. **The version of the application.** The store and the project file
   are given it (`docs/specs/core/store.md`, `appVersion`), the project
   file writes it in its header, and the words of the comparison with
   the check numbers, the few numbers of each result that a project file
   keeps to check a new run against, name it when an analysis's
   calculation has changed; the repository has no version yet, since
   `package.json` has none. The options:
   - a number in `package.json`, `"version": "0.1.0"`, raised by hand
     when a release of the site changes what it calculates or saves, and
     written into the code at the build by `define` in `vite.config.ts`.
     A user reads "0.1.0 and 0.2.0" and knows which is newer; it costs a
     step of each release, which can be forgotten;
   - the short hash of the git commit the site was built from, written
     at the build in the same way. It never needs a hand and names the
     exact build; a user cannot tell from "7d84ab1 and 3e268bd" which
     is newer.

   Recommended: the number in `package.json`, since the comparison is
   read by users. Meanwhile, `"version": "0.1.0"` and `define`.

## Not in this spec

- Every word the application shows once it has started, the error bar's
  among them, the stepper, the notices and the status region:
  `docs/specs/shell.md`.
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

## What this spec assumes of the other specs of stage 2

- `docs/specs/worker/client.md`: `createClient` with the two functions
  that make the workers and `onPopneiReady`, called as its section "The
  calculation worker holds one load" says; the calculation worker started
  when the client is made; `addFile(fileId, file)`, `run(key, job,
  onProgress)` for the store, and `openVariants` and `readIndividuals`,
  each with a handle whose outcome never fails, with the kinds of the
  table above, and a `cancel()`; a read whose `File` is not in its map
  fails as a defect; and its `onerror` of a worker calls
  `event.preventDefault()`, which that spec does not say yet.
- `docs/specs/worker/runner.md` and `docs/specs/worker/individuals.md`:
  the worker's own `error` handler, which posts `crashed`, calls
  `event.preventDefault()`, which neither spec says yet.
- `docs/specs/analyses/diversity.md`: its definition, exported for
  `apps.ts`, and `numVarsRead` in its result; its panel reads the time a
  run started from `startedAt` of this spec's `runs.ts`.
- `docs/specs/core/projectFile.md`: `writeProjectFile(state, analyses,
  appVersion, saved)`, which refuses nothing; `projectFileName`; an
  opened project holds no source whose read is pending.
- `docs/specs/shell.md`: the words of the error bar with a store and
  without one; the announcer and the announcements made from two states;
  what Save and the question before leaving show.
- `docs/specs/steps/variants.md` and `individuals.md`: a step calls
  `addFile` before the command of a pick.
