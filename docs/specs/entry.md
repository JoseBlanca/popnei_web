# The entry of the population genetics page

25 September 2026, a draft awaiting the owner's approval. This spec gives
the page of the population genetics application, `popgen.html`, and its
entry, the code that runs once when the page opens and keeps working for
the life of the page: it makes the store and the two workers and joins
them, asks the workers to read each file the project is waiting for,
hands the store the outcome of every calculation, and shows in a bar at
the top of the page an error of our own code that nothing else shows.
There is no code of it yet. It develops sections 1, 5, 6 ("Who asks for
a read"), 7 and 9 of `docs/architecture.md`, with what was revised there
on 25 September 2026, and the row `src/ui/runs.ts` of its section 9. It
depends on `docs/specs/core/store.md` and `project.md`, on
`docs/specs/worker/messages.md` and `client.md`, and on
`docs/specs/shell.md`, which gives every word the page shows. The stages
are those of `docs/build-order.md`; this one is stage 2, the walking
skeleton, the smallest application that goes through every part once.

The words of the web used here, as they are used in this application:

- **A web worker** is a second thread of the browser tab, which cannot
  touch what the page shows and talks to it only through messages. The
  **calculation worker** runs popnei; the **light worker** reads the
  individuals file. The **worker client** is the page's side of both, in
  `src/worker/client.ts`: it sends the requests, keeps a queue for each
  worker, and starts a worker again when it has to.
- **A promise** is a value that arrives later, such as the outcome of a
  calculation. Code that waits for it is said to await it.
- **An event handler** is a function the browser calls when something
  happens, a click, a key, a message of a worker.
- **React** draws the screens into an element of the page, its **root**.
  An **error boundary** is a component that catches what throws while
  React draws the part of the screen under it, and shows a message in
  its place.

## What it does

A user sees the entry only when it goes wrong: a file that stays
"Reading panel.nei." for ever because nobody asked the worker to read
it, a calculation that ends and whose result never appears, a button
that does nothing because what it ran threw an error that went to the
console of the browser, which a user does not open. So the entry has
four jobs, each below, and each is small.

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
The two elements are two React roots: `#defects` holds the error bar and
`#root` the application, so that the bar stays when the application's
root is lost (below, "The errors nothing else shows").

**The start guard** is a few lines of plain script in the `<head>`, run
before the application's code. A browser older than the floor, Chrome
and Edge 111, Firefox 115, Safari 16.4 (`docs/technology.md`, section
6), fails on the first function or syntax it lacks, and the page would
show "Loading…" for ever. The guard listens to the window's `error`
event until the entry takes over, and in that time writes into `#root`:
"The application could not start in this browser: ‹the browser's
message›. It needs Chrome or Edge 111, Firefox 115 or Safari 16.4, or a
newer version." The entry removes the guard's listener as its first
line. A module script whose file is not found, a page left open across a
deploy, fires no `error` on the window; the guard also listens to the
`error` event of the script element, in its capture phase on the
document, and writes "The application could not be loaded. Reload the
page." Decided here, not by the owner.

### At the opening

The entry, `src/ui/popgen.tsx`, does these in this order, all in one
run of its code, so that no message of a worker can arrive before
everything that listens to it exists, since the browser delivers a
message only after the code that is running has finished:

1. It removes the start guard's listeners and puts its own on the window
   (below, "The errors nothing else shows"), so that an error in the
   steps that follow is shown.
2. It draws the error bar into `#defects`.
3. It makes the store, with `createStore` of `src/core/store.ts`: the
   first project, `firstProject("popgen")` of `src/core/apps.ts`
   (below); the definitions of the analyses of the application, from the
   same file; `send`, which is the worker client's `run`; `numVarsOf`,
   from the same file; the version of the application (**Open 1**);
   `CACHE_MAX_BYTES` and `MAX_UNDO_STEPS`.
4. It makes the worker client, with `makeRunnerWorker` and
   `makeFilesWorker` of `src/worker/start.ts`, and gives it the function
   the client calls when the calculation worker announces itself ready,
   which calls `store.popneiReady` with popnei's version. That happens
   at the first start and after every start again; the store ignores a
   second announcement of the same version. The client starts the
   calculation worker at once, so that popnei's wasm, 0.63 MB gzipped
   (`docs/technology.md`, section 2), loads while the user looks for
   their file.
5. It subscribes the reads (below) and the announcements of the shell
   (`docs/specs/shell.md`, "The status region") to the store.
6. It makes the application's root in `#root` with React's
   `createRoot`, with `onUncaughtError` and `onCaughtError`, and draws
   the shell in `StrictMode`, inside the providers that give the screens
   the store (`src/ui/store.tsx`, `.claude/skills/coding/react.md`) and
   the function that adds a picked file, below.

The store and the workers are made here, outside any component, once
per page: a store or a worker made inside a component would be made
again each time React draws it anew, and twice in development, where
`StrictMode` draws everything twice on purpose (`react.md`, "Reading
core").

**A file the user picks** gets its load id here. The screens are given a
function `addFile(file: File): string`, through a provider of
`src/ui/files.tsx`, which makes a new load id, 16 random bytes of
`crypto.getRandomValues` written as 32 hexadecimal digits
(`docs/architecture.md`, section 3), puts the `File` into the client's
map under it, and returns the id; the step then sends the command that
puts the source in the project (`docs/specs/steps/variants.md` and
`individuals.md`). The `File` is in the map before the command, so the
read the command makes the entry ask for always finds it.

### `src/core/apps.ts`

The list of what each application has, which section 9 of the
architecture puts in core and which no other spec of stage 2 gives. In
stage 2 it holds the population genetics application alone:

- **the definitions of its analyses**, in the order the screens show
  them: the diversity alone (`docs/specs/analyses/diversity.md`);
- **its steps**, by their ids, in their order: `variants`,
  `individuals`, `analyses`. Which steps the stepper shows is the shell's
  (`docs/specs/shell.md`, **Open 1**);
- **its first project**: `emptyProject("popgen")` with the missing data
  filter at 0.1, which the Variants step asks for
  (`docs/specs/steps/variants.md`, **Open 2**), since `emptyProject`
  holds no filter;
- **`numVarsOf`**, which gives the number of variants the pass of a
  result counted, from the result of each kind of job, as the spec of
  each analysis says where it is (the store's `numVarsOf`).

### Who asks for a read

The rule is the owner's, of 25 September 2026 (`docs/architecture.md`,
section 6, "Who asks for a read"): after every change of the project, a
command, an undo, a redo, an opening, or a read recorded, the entry
looks at the present project and asks for the read of each source whose
read is pending and has none under way. There are at most two, the
variants file and the individuals file. A read is under way from the
moment it is asked for until its answer comes back, and is known by the
load id and, for the individuals file, by the options of its CSV.

The entry listens with `store.subscribe`, which also calls it for a
progress of a calculation, and does the work only when the project is
another object than the one it last looked at, a comparison of
references that costs nothing (`docs/architecture.md`, section 2).

- **The variants file** is asked of the client as an `open` of its load,
  its format and its read options (`docs/specs/worker/messages.md`),
  which the client sends to the calculation worker, started again first
  when the load changed (`docs/architecture.md`, section 5).
- **The individuals file** is asked as a `readIndividuals` of its load
  and the options of its CSV, which the client sends to the light
  worker.
- **A read under way whose source the present project no longer holds
  pending**, by its load id and its options, is cancelled: its file was
  replaced, or the change was undone, or the options of the CSV changed
  again. A cancelled read records nothing, so its source stays pending
  in every project of the history that holds it, and an undo that gives
  it back makes the entry ask for it again. Decided here, not by the
  owner, as the architecture's rule has it, where the option not taken
  kept the light worker reading for options no project asked for any
  more. What it costs: a pick undone and redone while its file is read
  reads the file again, with popnei 0.1.0 the whole file; letting the
  read end and recording it into the history would spare that, and
  would leave a worker reading a file the project does not show. A read
  of a variants file lasts the time of reading the file into memory, and
  an undo within it is rare.

What comes back is recorded into the store, and the read is taken out
of those under way **before** it is recorded, since the record is a
change of the project, which makes the entry look again, and a read
still marked under way would not be asked for if the record left its
source pending.

| the answer | recorded as |
|---|---|
| the variants file opened: its individuals and its ploidy | `variantsRead(fileId, { kind: "read", individuals, ploidy, numVars: null })` |
| popnei refused the variants file | `variantsRead(fileId, { kind: "failed", error: { kind: "popnei", message } })` |
| the calculation worker failed, could not start, is of another version, or a message was a defect | `variantsRead(fileId, { kind: "failed", error: { kind: "worker", error } })`, the `RunError` as the client gives it |
| the individuals file read: the table, its types, what "auto" found | `individualsRead(fileId, csv, { kind: "read", table, columns, found })` |
| the reader refused the file | `individualsRead(fileId, csv, { kind: "failed", error })`, the `IndividualsFileError` of the reader |
| the light worker failed | `individualsRead(fileId, csv, { kind: "failed", error: { kind: "worker", error } })` |
| cancelled | nothing |

The records of `src/core/project.ts` record a read only into a source
with that load id, and options, that is pending or failed because its
worker failed, and change nothing otherwise
(`docs/specs/core/project.md`, "The records"). So an answer that crosses
a cancel, one the worker had sent before the cancel reached it, changes
nothing either.

### The outcome of a calculation

`src/ui/runs.ts` holds one function, which the Run button of an analysis
panel calls from its event handler:

```ts
/** Starts the calculation of the analysis `id` and hands its outcome to
    the store when it arrives; null when the store starts none. */
export function startAnalysis(store: Store<JobResult>, id: AnalysisId): Promise<void> | null;
```

It calls `store.startRun(id)`; when that gives a handle, it awaits the
handle's `outcome` and calls `store.runEnded(run.id, outcome)`. The
outcome never fails, since a failure is one of its values
(`docs/specs/worker/protocol.md`). The store stops a calculation with
the handle it keeps, and its outcome, `cancelled`, arrives here like any
other; `runs.ts` cancels nothing (`docs/architecture.md`, section 5).

The button does not await what `startAnalysis` returns; it passes it
over with `void`, which the lint allows. What rejects it is a defect of
our code, a `runEnded` that throws, and a promise rejected with no one
to handle it goes to the window's `unhandledrejection` event, and so to
the error bar, which is where a defect belongs. The tests await it.

### The errors nothing else shows

An error of our own code that no error boundary of React sees, one
thrown in an event handler or in a promise whose rejection nothing
handles, is shown in the error bar, as the owner decided on 25 September
2026 (`.claude/skills/coding/react.md`, "Errors"). The browser fires the
window's `error` event for the first and its `unhandledrejection` event
for the second; the entry listens to both from its first line, and
gives what they carry to the log of the bar, `src/ui/defects.ts`, which
the bar reads (`docs/specs/shell.md`, "The error bar").

- **Two messages are not errors**: "ResizeObserver loop completed with
  undelivered notifications" and "ResizeObserver loop limit exceeded".
  The browsers fire them as `error` events when a plot or a layout that
  watches its size takes more than one frame to settle, and they break
  nothing. The entry passes them over.
- **The error is kept as the browser gave it**: its message, its stack,
  and which of the two events carried it. A rejection with a value that
  is not an `Error`, which our code never throws but a library could, is
  kept as its text.
- **The console keeps the error too.** The entry does not stop the
  browser from writing it there, for whoever opens the tools of the
  browser.
- **An error thrown while React draws the shell itself**, outside the
  boundary of every step and every analysis panel, is one React does not
  catch: React then removes everything from the application's root and
  calls `onUncaughtError`. The entry gives it to the log of the bar with
  the component stack, so that the page says what happened; the bar is
  in its own root, and its button that saves the project calls the store
  directly, so the user can still save. `onCaughtError`, for what a
  boundary caught and shows, writes the error and the component stack to
  the console, since there is no server to send them to.

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

/** The reads the project waits for: its sources whose read is pending. */
export function wantedReads(p: Project): readonly WantedRead[];
```

The object that keeps the reads under way and does the rule above; the
entry calls `sync` from its subscription to the store:

```ts
export function createReads(deps: {
  readonly store: Pick<Store<JobResult>, "getState" | "variantsRead" | "individualsRead">;
  readonly client: ReadClient;              // the part of the worker client that reads
}): { sync(): void };
```

`ReadClient` is the `open` and the `readIndividuals` of the worker
client, as `docs/specs/worker/client.md` gives them; the tests give a
fake.

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
  fails, is recorded as failed because its worker failed, and a pick of
  the file again reads it.
- **A read that succeeds after a failure of its worker**, the options of
  a CSV set to A, then B, then back to A: the record replaces the
  failure (`docs/specs/core/project.md`, "The records").
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
  says so, and the application's root is not drawn.
- **A browser below the floor**: the start guard's message.
- **The page reloaded or closed**: the project is lost, since nothing of
  it is kept in the browser; the shell asks before the page is left with
  changes that were not saved (`docs/specs/shell.md`, "Saving").
- **Two tabs of the application** have a page, a store and two workers
  each, and share nothing.

## How it runs

On the page. The entry's work after the opening is a comparison of the
project's reference at every change of the store, and at most two
requests to the client after a change that leaves a source pending. It
keeps the reads under way, two at most, and the log of the errors, 20
at most.

## How it is verified

With Vitest, in node, at `createReads`, `startAnalysis`, `createDefects`
and `apps.ts`, with a fake client whose reads the test ends by hand and
whose cancels it records, and the real store of core.

- **The rule of the reads.** A pick of a variants file: one `open`, with
  its load id, format and read options. A progress of a calculation,
  which calls the listener with the same project: no second `open`. The
  answer: `variantsRead` called with the table of the answers above, and
  the read no longer under way when it is called, which the fake store
  checks. The same file picked again, a new load id: a second `open`.
- **Cancelled.** A pick, then an undo before the answer: the read is
  cancelled; a redo: a second `open` of the same load. The options of a
  CSV set to A then B: the read of A cancelled, B asked; an undo: A
  asked. A cancelled read records nothing.
- **Each row of the table of the answers**, the refusal of popnei, a
  `workerFailed`, a `couldNotStart`, a refusal of the reader, a failure
  of the light worker, recorded as the table says.
- **`startAnalysis`**: `null` when `startRun` gives `null`; the outcome
  given to `runEnded` with the id of its request; a `runEnded` that
  throws rejects the promise.
- **`createDefects`**: the first error kept, the second counted in
  `more`, the 21st counted and its details not kept; `dismiss` empties
  it; `details` holds every message kept.
- **`apps.ts`**: the first project has the missing data filter at 0.1
  and nothing else; the analyses have distinct ids.

With Playwright, against the built site, in the three engines
(`.claude/skills/coding/testing.md`):

- `/popnei_web/popgen.html` shows the shell with the Variants step, no
  error bar, and axe finds no violation of WCAG 2.2 at level AA.
- The flow of the walking skeleton (`testing.md`, "The walking skeleton,
  as a flow") is the check of the rest: a file picked is read, a
  calculation's result is shown, a cancel leaves the application
  working.
- An error thrown from an event handler of the page, and a promise
  rejected with nothing to handle it, each posted from inside the page
  with `page.evaluate`, show the bar with the message, as an alert; a
  second error adds "1 more error followed it."
- The entry's file answered 404, and answered with a file of bad syntax,
  each show the start guard's message.

A throw while React draws the shell cannot be made in the built site
without a hook for the tests in the code; it is checked by review.

## Open points

1. **The version of the application.** The store and the project file
   are given it (`docs/specs/core/store.md`, `appVersion`), the project
   file writes it in its header, and the comparison with the check
   numbers names it when an analysis's calculation has changed; the
   repository has no version yet, since `package.json` has none. The
   options:
   - a number in `package.json`, `"version": "0.1.0"`, raised by hand
     when a release of the site changes what it calculates or saves, and
     read at the build into the code by `define` in `vite.config.ts`. A
     user reads "0.1.0 and 0.2.0" and knows which is newer; it costs a
     step of each release, which can be forgotten;
   - the short hash of the git commit the site was built from, written
     at the build in the same way. It never needs a hand and names the
     exact build; a user cannot tell from "7d84ab1 and 3e268bd" which
     is newer.

   Recommended: the number in `package.json`, since the comparison is
   read by users. Meanwhile, `"version": "0.1.0"` and `define`.

## Not in this spec

- Every word the page shows, the error bar's among them, the stepper,
  the notices and the status region: `docs/specs/shell.md`.
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

- `docs/specs/worker/client.md`: `createClient` takes the two functions
  that make the workers and a function it calls with popnei's version
  whenever the calculation worker is ready, before it sends that worker
  any request; it starts the calculation worker when it is made; it
  gives `addFile(fileId, file)`, `run(key, job, onProgress)` for the
  store, and two reads, `open` of a load and `readIndividuals` of a load
  and its options, each with a handle whose outcome never fails, done
  with what the worker read, failed with a `RunError`, or cancelled, and
  a `cancel()`; a read whose `File` is not in its map fails as a defect.
- `docs/specs/worker/messages.md`: the answers of `open` and
  `readIndividuals` as its draft of 25 September 2026 gives them.
- `docs/specs/analyses/diversity.md`: its definition, exported for
  `apps.ts`, and where its result holds the number of variants its pass
  counted.
- `docs/specs/core/projectFile.md`: an opened project holds no source
  whose read is pending.
- `docs/specs/steps/variants.md` and `individuals.md`: a step calls
  `addFile` before the command of a pick.
