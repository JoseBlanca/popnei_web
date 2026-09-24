# The store

24 September 2026, approved by the owner on 24 September 2026. There is no code
yet. The store is the one object of core that changes: it holds the
history of the projects, the cache of the results, the version of popnei,
the calculations in flight with their handles, and the ones that failed.
From them it gives the screens one state to read, in which each analysis
is in one of the states of a screen, and the notice of what the last
change removed or will stop. The screens change it with commands, and
`src/ui/runs.ts`, which awaits the calculations, with events. This spec
develops sections 3, 4, 5 and 7 of `docs/architecture.md`, declares the
definition of an analysis of its section 4, and depends on
`docs/specs/core/project.md`, `keys.md`, `history.md` and `cache.md`, and
on `docs/specs/worker/protocol.md` for a request and its outcome. The
stages it names are the steps in which the applications are built, in
`docs/build-order.md`: stage 2 is the walking skeleton, the smallest
application that goes through every part once, and stage 6 the project
file and the report.

## What it does

Everything a user sees of a result goes through the store: whether it is
shown, whether it is the result of the settings on screen, whether a
change took it off and an undo can bring it back, whether a calculation
is running for it, and whether that calculation will be stopped. The
store shows a result only under the key that the current project gives
it, and so never one of other settings (`docs/architecture.md`, section
3).

A calculation runs in the calculation worker, and the page learns its
end later, through a promise, a value that arrives when the calculation
ends. Core never waits for one: the store starts a calculation and
returns at once, `src/ui/runs.ts` waits for the outcome, and hands it to
the store (`.claude/skills/coding/SKILL.md`, "The core").

### The definition of an analysis

Each analysis is a module that exports its definition, of the shape of
section 4 of `docs/architecture.md`. The store is given the definitions
of the analyses of its application, in the order the screens show them,
and calls nothing else of them. `J` is the type of the requests of the
calculation worker and `R` that of its results, `Job` and `JobResult` of
`src/worker/protocol.ts` in the application (stage 2), and types of the
tests in the tests.

- `needs` gives the reason the analysis cannot run beyond what every
  analysis needs (`docs/specs/core/project.md`, `projectNeeds`), in the
  words the screen shows next to its Run button, or `null`. A reason from
  either of the two locks the analysis; `projectNeeds` is asked first.
- `filtersRead` says which of the two lists of filters the analysis
  reads, and `keyInputs` what else its key holds
  (`docs/specs/core/keys.md`).
- `run` builds the request and sends it through the client it is given.
  The store makes that client for this one request, from the `send` of
  the worker client of `src/worker`: it sends under the key of the
  request, passes the progress to the store, and makes the keys of the
  intermediate results the request needs. So an analysis cannot send a
  request under another key, lose its progress, or make a key of its own.
  The store looks in the cache before it calls `run`.
- `warnings` gives the warnings a result raises from the data. The store
  calls it once, when the result arrives, with the project the request was
  made from, which may no longer be the current one; the warnings are kept
  with the result in the cache, and go when it is dropped.
- `parseOptions` checks the options of the analysis read from a project
  file of a given version of its format.
- `checkNumbers` gives the numbers kept in the project file. They are
  numbers of popnei's result, or made from them by addition, subtraction,
  multiplication and division alone, which give the same result in every
  browser; `Math.log`, `Math.exp`, `Math.pow` and the like may differ in
  the last digit between the engines of the browsers, and would make the
  comparison below say "differs" for the same data. A NaN of popnei is
  given as `null`.
- `script` gives its lines of the Python script, in stage 6.

### The state of an analysis

The store gives each analysis the first state of this table whose
condition holds. The states are those of a screen spec
(`.claude/skills/writing-specs/SKILL.md`, "The states"), and the panel of
an analysis shows the one the store gives (`.claude/skills/coding/react.md`,
"The states of an analysis"); the state the skill calls "results removed"
has the kind `removed` in the code.

| state | when | what it holds |
|---|---|---|
| locked | `projectNeeds` or its `needs` gives a reason | the reason |
| done | the cache holds a result under its key | the result, its warnings, and the comparison with the check numbers of an opened project file |
| running | a calculation of its key is in flight and is not being stopped, whether it waits in the queue of the worker or runs | its progress, `null` until the worker gives one, and the request's id |
| error | popnei refused the calculation of its key, or the calculation failed since the last change | popnei's message, or the failure |
| removed | the current notice lists it among the results removed | its key; it can run again |
| ready | none of the above | its key |
| empty | cannot happen | — |

`empty`, nothing to show and nothing the user can do, cannot happen: an
analysis is locked until its variants file is read, and only a
calculation worker that has started, and so has given the version of
popnei the keys need, reads it. A file that could not be read, a worker
that could not start, lock it with their reason
(`docs/specs/core/project.md`, "What an analysis needs of every
project"). So the store has no such state, and a key asked for without a
version is a defect.

### Commands and events

A command of the user goes through `apply` with its description, the
words that finish the notice, "the MAF filter changed". `apply` commits
the new project to the history, unless the command returned the project
it was given, in which case nothing changes, and undo and redo move in it
(`docs/specs/core/history.md`).

`open` starts a new history with an opened project, and Ctrl+Z does not
undo it, as the owner decided on 24 September 2026
(`docs/specs/core/history.md`). The cache and the refusals are kept: they
are under keys, and a key names the load it was made from, so nothing of
them is shown for the new project unless its keys give it. The
calculations in flight are stopped at once, since the screen asked before
opening; an opening makes no notice, and clears the one there was.

The events come from the workers, through `src/ui/runs.ts` and the entry
of the page, the code that starts when the page opens, makes the store and
the workers and joins them, and change what the screens show without a
step of undo: the
version of popnei, the reads of the files, recorded into every project of
the history that holds their load, and the end of a calculation.

### The notice, and the calculations it stops

After a command, an undo or a redo, the store compares the analyses that
were `done` before it with those after it: each that was done and is not
any more is removed, and is in the notice, with the cause, the
description of the command, of the step undone or of the step redone.
The screen writes it as "3 results removed because the MAF filter changed
· Undo" (`.claude/skills/writing/SKILL.md`, "The text of the
applications"). An analysis removed is in the state `removed` if it can
run, and `locked`, with what it lacks, if it cannot.

A calculation in flight whose key the project no longer gives, one the
change left behind, is stopped unless the change is undone, as the owner
decided on 24 September 2026 (`docs/architecture.md`, section 5). It is in
the same notice as the results removed, which is one for the user: one
message and one Undo for everything the change did, "2 results removed
because the MAF filter changed. The ongoing calculations will be stopped
unless you undo the change. · Undo". The store stops a calculation left
behind, with the `cancel()` of its handle, only when keeping it would
cost the user something, at the first of these:

- **the user closes the notice**, `dismissNotice`: they have seen it and
  not undone; every calculation it named is stopped;
- **the next command, undo, redo or opening replaces the notice**: the
  calculations it named whose key the new project still does not give are
  stopped; an undo gives the keys back, and those calculations go on;
- **a new calculation would wait behind it**: `startRun`, when the user
  presses Run, stops first every calculation left behind, since the one
  calculation worker runs one request at a time and the new one would
  otherwise wait for it, minutes for a GWAS. The notice then loses its
  sentence on stopping and keeps the results removed and the Undo, or goes
  if nothing is left in it.

There is no deadline. Until one of the three, Undo keeps the calculation
running, however late the user reaches it: a user who moves through the
page with the keyboard or a screen reader can take long to reach the
Undo, and a deadline would cost them the minutes the calculation had
already run, which is the kind of time limit WCAG 2.2, the accessibility
standard the applications follow, asks to avoid (success criterion
2.2.1). The option not taken, a stop ten seconds after the notice
appeared, had been proposed with no measurement and is not in the owner's
words.

A calculation that waits in the queue leaves it at no cost; one that runs
ends the calculation worker, and a new one starts and reads the variants
file again, with popnei 0.1.0 the whole file (`.claude/skills/coding/worker.md`,
"Cancelling"). The calculation of the new settings does not start by
itself: it starts when the user presses Run, as every calculation does.
The request started by a `startRun` that stopped a calculation is marked,
`afterStop`, so that its panel says that it may first wait for the
variants file to be read again, which with a large file is most of the
wait; the store does not know whether the calculation stopped was running
or waiting in the queue, which only the worker client knows. The option not taken for the whole of this was to let a calculation
left behind finish, its result kept for a possible undo, while the
calculation of the new settings waited behind it.

When the notice changes after `startRun` stopped calculations, the
screen's words change without the user's focus on them; the shell, the
header and the frame of the page, announces the change through its status
region, the part of the page a screen reader reads out when its text
changes, "The earlier calculation of Diversity was stopped", as
`.claude/skills/coding/react.md` says of announcements (WCAG 2.2, success
criterion 4.1.3).

A request is `afterStop` when a stop was issued for its `startRun`,
also when the calculation stopped was already being stopped.

The notice goes when it is closed or replaced; a change that removes
nothing and leaves nothing behind replaces it with none. An analysis is
`removed` while the current notice lists it, or `locked` if it cannot
run; when the notice is closed or replaced without it, the analysis is
`ready`. An analysis in the notice that is done again, when a calculation
of its new key ends, leaves the notice. A calculation left behind that
ends by itself, done, failed or cancelled, leaves `leftBehind`, and so
does one whose key the project gives again through a read of a file,
which is not a change of the user; when `leftBehind` is empty, the
notice no longer says that calculations will be stopped, and a notice
left with nothing goes. Every calculation left behind is named by the
current notice, since only a change leaves one behind, and each change
makes the notice; so closing or replacing it reaches them all.

An analysis that was running, and not done, before a change is not in
the notice's results removed: it had no result on the screen. After the
change it is `ready`, its calculation in `leftBehind`, and the result
that arrives late goes into the cache for an undo.

### A calculation that failed

When popnei refuses a calculation, the store keeps its message under the
key of the calculation, and the analysis is in the state `error` whenever
the project gives that key again, by an undo or by a value set back,
without calculating again. popnei refuses the same data with the same
message every time, so a second calculation would take its time to say
the same thing. `startRun` does nothing for a key refused; the user
changes the settings, which gives another key. The owner decided it on
24 September 2026. The option not taken was to forget every failure,
which would have shown the analysis ready after an undo and let the user
wait again for popnei's refusal.

Any other failure, a worker that crashed, one that could not start, a
file of the site left from before a deploy, a message that did not
validate, a variants file that could not be read again after a restart,
is kept under its key until the next change of the project, and shown as
the state `error` with what happened, so that the user learns it and can
run again; after the next change, the analysis is `ready`, since a second
try can succeed. A cancel is not a failure: the analysis is `ready`.

### The comparison with the check numbers

When the project comes from a project file whose reference holds check
numbers for an analysis, the state `done` of that analysis holds the
comparison of its result with them, if the fingerprint of its settings
now is the one the reference kept (`docs/specs/core/project.md`, "The
project of an opened project file"); otherwise it holds none, since the
numbers belong to other settings. The numbers are compared exactly, a
decision taken here and not by the owner: popnei gives the same numbers
for the same data in every browser, since its calculations are those of
its compiled Rust, whose arithmetic every browser does in the same way,
and `checkNumbers` adds only arithmetic of the same kind. Two lists of
different lengths differ; two `null`s are the same.

- **The same numbers**: the variants file gives the results the project
  was saved with.
- **Other numbers**: the comparison gives what could explain it. The
  variants file always could: it is not the one the project was saved
  with, or it was changed since. When the version of popnei is not the
  one in the header of the project file, the comparison names both
  versions, since the new version could explain it too. When the key
  version of the analysis is not the one saved with its numbers, it names
  both versions of the application, since the application has changed how
  it calculates this analysis since. It cannot tell which of these is the
  cause.

The final words are those of the screen of the project file, in stage 6.

## The TypeScript interface

The definition of an analysis, and the client it is given.

```ts
export interface AnalysisDef<J, R> {
  readonly id: AnalysisId;
  readonly app: readonly AppId[];
  readonly defaults: JsonObject;
  readonly keyVersion: number;
  readonly filtersRead: { readonly variants: boolean; readonly individuals: boolean };
  parseOptions(options: unknown, formatVersion: number): Result<JsonObject, string>;
  keyInputs(p: Project): JsonValue;       // must not read p.variants; answers for any project
  needs(p: Project): string | null;
  run(p: Project, c: WorkerClient<J, R>): Run<R>;
  warnings(r: R, p: Project): readonly Warning[];
  checkNumbers(r: R): readonly (number | null)[];
  script(p: Project): string;
}

/** What an analysis sends its request through, bound by the store to one key. */
export interface WorkerClient<J, R> {
  run(job: J): Run<R>;
  /** The key of an intermediate result of the request, "the pruned variants". */
  intermediateKey(name: string, inputs: JsonValue): string;
}

/** A warning raised by the data; `code` is what the tests assert. */
export interface Warning {
  readonly code: string;
  readonly text: string;
}
```

The state the screens read. It is the same object until something
changes, and the state of an analysis that did not change is the same
object after a change to another, so that a screen that reads it is not
drawn again.

```ts
export interface AppState<R> {
  readonly project: Project;
  readonly undo: string | null;           // the description of what an undo would undo
  readonly redo: string | null;
  readonly popneiVersion: string | null;
  readonly analyses: readonly AnalysisView<R>[];  // in the order of the definitions
  readonly runs: readonly RunView[];      // the calculations in flight
  readonly notice: Notice | null;
}

export interface AnalysisView<R> {
  readonly id: AnalysisId;
  readonly status: AnalysisStatus<R>;
}

export type AnalysisStatus<R> =
  | { readonly kind: "locked"; readonly reason: string }
  | { readonly kind: "done"; readonly key: Key; readonly result: R;
      readonly warnings: readonly Warning[]; readonly check: CheckVerdict | null }
  | { readonly kind: "running"; readonly key: Key; readonly runId: number;
      readonly progress: Progress | null }
  | { readonly kind: "error"; readonly key: Key; readonly error: AnalysisError }
  | { readonly kind: "removed"; readonly key: Key }
  | { readonly kind: "ready"; readonly key: Key };

export type AnalysisError =
  | { readonly kind: "refused"; readonly message: string }  // popnei's; kept
  | { readonly kind: "failed"; readonly error: RunError };  // until the next change

/** A calculation in flight; `current` when the project still gives its key. */
export interface RunView {
  readonly runId: number;
  readonly analysis: AnalysisId;
  readonly key: Key;
  readonly current: boolean;
  readonly stopping: boolean;    // cancelled, its outcome not yet arrived
  readonly afterStop: boolean;   // started by a startRun that stopped a calculation
  readonly progress: Progress | null;
}

export type CheckVerdict =
  | { readonly kind: "same" }
  | { readonly kind: "differs";
      readonly popnei: { readonly saved: string; readonly now: string } | null;
      readonly app: { readonly saved: string; readonly now: string } | null };

export interface Notice {
  readonly cause: { readonly kind: "command" | "undo" | "redo"; readonly description: string };
  readonly removed: readonly AnalysisId[];
  readonly leftBehind: readonly AnalysisId[];  // their calculations will be stopped unless undone
}
```

The store is made once per page, by its entry, with the definitions of
the application's analyses; the function of the worker client that sends
a request (`.claude/skills/coding/worker.md`, `Client.run`); the function
that finds in a result the number of variants its pass counted, which is
recorded into the variants file of the request's load
(`docs/architecture.md`, section 6, step 5); and the version of the
application.

```ts
export function createStore<J, R>(config: {
  readonly first: Project;
  readonly analyses: readonly AnalysisDef<J, R>[];
  readonly send: (key: string, job: J, onProgress: (p: Progress) => void) => Run<R>;
  readonly numVarsOf: (r: R) => number | null;
  readonly appVersion: string;
  readonly cacheMaxBytes: number;          // CACHE_MAX_BYTES
  readonly maxUndoSteps: number;           // MAX_UNDO_STEPS
}): Store<R>;

export interface Store<R> {
  getState(): AppState<R>;
  /** Calls `listener`, a function of a screen, after every change; returns
      the function that stops it. A property made once, so React keeps it. */
  readonly subscribe: (listener: () => void) => () => void;

  apply(description: string, command: (p: Project) => Project): void;
  undo(): void;
  redo(): void;
  open(p: Project): void;
  /** Closes the notice, and stops the calculations it left behind. */
  dismissNotice(): void;

  /** Starts the calculation of an analysis that is ready, removed, or in
      error after a failure that is not popnei's, after stopping every
      calculation left behind; null, and nothing done, in any other state. */
  startRun(id: AnalysisId): Run<R> | null;
  /** Stops the calculation in flight of an analysis, if there is one. */
  cancelRun(id: AnalysisId): void;

  popneiReady(version: string): void;
  variantsRead(fileId: string, read: SourceRead): void;
  individualsRead(fileId: string, csv: CsvOptions | null, read: IndividualsRead): void;
  runEnded(runId: number, outcome: Outcome<R>): void;
}
```

A command is passed as a function: `store.apply("the MAF filter changed",
(p) => setVariantFilter(p, { kind: "maf", maxAllowedMaf: 0.9 }))`.

`startRun` returns the handle of the request to its caller,
`src/ui/runs.ts`, which awaits its outcome and gives it to `runEnded`; the
store keeps the handle too, to stop it. For each request in flight the
store keeps its analysis, its key, the project it was made from, the load
of its variants file and its handle.

What `runEnded` does with each outcome, after it takes the request out of
those in flight:

- `done`: the result goes into the cache under its key, with its
  warnings, made from the request's project; if the cache is then above
  its bound, it drops results the current project does not show, never
  one it shows (`docs/specs/core/cache.md`); the number of variants, when `numVarsOf` gives one, is
  recorded into the variants file of the request's load in every project
  of the history.
- `failed` of kind `popnei`: the message is kept under the key for the
  session. Any other kind: it is kept until the next change of the
  project.
- `cancelled`: nothing is kept.

## The cases

- **A result that arrives after the user changed a setting**, before its
  calculation was stopped. The analysis was running and not done, so the
  notice does not list it among the results removed, and it is `ready`.
  The result goes into the cache under the key it was asked for, with its
  warnings, and is not shown, since the project gives that analysis
  another key; an undo shows it with no calculation
  (`docs/architecture.md`, section 5).
- **Run asked twice** for the same key: the second `startRun` returns
  `null`, since the analysis is `running`.
- **A cancel by the user, a crash, a restart.** The outcome is
  `cancelled`, and the analysis `ready`; or a failure of the worker, shown
  until the next change.
- **A progress after the end of its request**, a message the worker had
  sent before the end reached the page: the store no longer has the
  request, and passes it over.
- **A second `popneiReady`**, from the calculation worker started again
  after a restart: with the same version, nothing changes. With another,
  which the page and the workers, built together, do not give, the store
  records it, every key changes, every calculation in flight is stopped at
  once, since no undo gives the old version back, the notice is dropped
  and no notice is made, since this is not a change of the user; the
  analyses that were done are `ready`, and are calculated again when
  asked.
- **A command that returns the project it was given**: nothing changes,
  the notice neither; `getState` gives the same object.
- **A result whose key is not its request's key**, or a `runEnded` of a
  request the store did not start: a defect. The store takes the request
  out of those in flight before it throws, so that the analysis is not
  shown running for ever.
- **An analysis's `run` that throws**: a defect of that analysis. The
  store calls it before it records anything, so the state is as it was.
- **An opened project whose settings are changed and set back.** The
  fingerprint is that of the settings, so the comparison with the check
  numbers comes back with them.

## How it runs

On the page. The store freezes every project it takes, with
`freezeProject` of `docs/specs/core/project.md`, before it holds it: the
project a command gave to `apply`, the one opened, and each project of
the history that a record changed. A project that undo or redo gives back
was frozen when it was taken. So a write into a project it holds throws,
and the memo of the keys, which trusts only frozen objects, is used for
every project. Freezing stops at the parts already frozen, so it costs
only what the command made.

After every change of the project or of the version of
popnei, the store makes the key of each analysis that is not locked. It
keeps the keys of the last project and version, so that a progress
message, which changes neither, makes no key; and a memo, a table of the
text already written for each object of the project, so that the
individuals table is not written again for a command that changed a
threshold (`docs/specs/core/keys.md`, `KeyMemo`). Then it uses in the
cache the results of the current keys, so that the results on screen are
the last to be dropped (`docs/specs/core/cache.md`), and calls once each
listener, the function each screen gave `subscribe` to be told of a
change. The store never waits: `startRun` returns at
once, and the outcome arrives as an event.

What the store keeps grows with the session: the cache, bounded in bytes;
the history, bounded in steps; popnei's refusals, one short text per key
refused, not bounded, since a session makes few.

## How it is verified

With Vitest, at the functions of `Store`, with a fake `send` that returns
requests whose outcomes the test resolves by hand, whose `cancel()` it
records, and which passes progress when the test asks; and two fake
analyses: one that needs the individuals file and uses the populations,
and one that needs only the variants file.

- **A worked sequence.** Create the store; both analyses are locked,
  "Load a variants file in the Variants step." `popneiReady("0.1.0")`,
  `apply("a variants file was loaded", (p) => loadVariants(p, …))` and
  `variantsRead` of that load: the second is `ready`, the first locked by
  the individuals file. `startRun` of the second: it is `running`; a
  progress of 3 of 10: its progress is 3 of 10; `runEnded` with its
  result: it is `done`, with its warnings, and the cache holds one result.
  `apply("the missing data filter changed", …)`: it is `removed`, the
  notice lists it with that cause and stops nothing. `undo()`: it is
  `done` again with the same result object, `send` was called once, and
  the notice is `null`.
- **Stopping**, each case from a new store. With the second running, a
  command that changes its key:
  the notice lists it in `leftBehind`, and `cancel()` was not called.
  Then an undo: `cancel()` is not called and the analysis is `running`.
  Again, then a second command: `cancel()` is called. Again, then
  `dismissNotice()`: `cancel()` is called and the notice is `null`. Again,
  then `startRun` of the second for its new key: `cancel()` of the old
  request is called before `send`, the new request is `afterStop`, and the
  notice keeps its removed results and has no `leftBehind`, or is `null`
  if it had none. No test waits for a time: the store has no clock.
- **A late result**: with the second running, a command, then `runEnded`
  of the old key: the analysis is `ready`, the notice does not list it
  among the results removed and its `leftBehind` is empty, the cache holds
  the result with the warnings of the request's project; `undo()` shows
  it `done`.
- **A refusal**: `runEnded` with `{ kind: "failed", error: { kind:
  "popnei", message: "…" } }` gives `error` of kind `refused`; a command,
  then its undo, give it again, and `startRun` returns `null`. The same
  with `workerFailed` gives `error` of kind `failed`, `startRun` works,
  and after a command and its undo the analysis is `ready`.
- **The check numbers**: a project opened with a reference whose check
  holds the fingerprint of its settings, popnei "0.1.0", key version 1: a
  result with the same numbers gives `same`; other numbers with popnei
  "0.1.0" now and key version 1 give `differs` with `popnei` and `app`
  null; with "0.2.0" now, `popnei` names both; with key version 2 now,
  `app` names both versions of the application; a list one number
  shorter differs; a setting changed: `check` is null; set back: the
  comparison is there again.
- **`popneiReady` twice** with the same version gives the same state
  object; **`dismissNotice`** with no notice gives the same state object.
- **`getState`** returns the same object between two changes, and the
  state of an analysis that did not change is the same object after a
  change to another.
- **Properties, with fast-check**, which draws random sequences of
  commands, undos, redos, starts, progress, ends and cancels of requests,
  in any order, and shrinks a failure to the smallest one: a result is
  shown only under the key that `keyOf` gives for the current project; an
  undo after a command that removed results gives them back, done, when
  the cache still holds them; the notice of each change lists exactly the
  analyses that were done before it and are not after it; every request
  in flight whose key the project does not give is named by the notice or
  stopping; and a request left behind whose notice was closed or replaced
  without its key coming back, or that a `startRun` met, has been
  cancelled.

The tests in the browser, of the walking skeleton, check the same through
the screens, since core reaches them through the store
(`.claude/skills/coding/testing.md`).

## Open points

None of the store's own. It uses the bound of the cache
(`docs/specs/core/cache.md`, **Open 1**) and the bound of the history
(`docs/specs/core/history.md`, **Open 1**).

## Not in this spec

- `src/ui/runs.ts`, which awaits the requests, and the hook, the function
  through which a React screen reads the store: the specs of the shell,
  the header, the stepper and the notices of the page, in stage 2, and
  `.claude/skills/coding/react.md`.
- The list of the analyses of each application, `apps.ts`, and each
  analysis: from stage 2.
- The words of the notice, the locked reasons of each analysis and the
  comparison: the screen specs.
- Starting the calculation worker again when the load of the variants
  file changes: the worker client, which reads it from the project
  (`docs/architecture.md`, section 5).
