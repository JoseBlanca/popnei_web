# The store

24 September 2026, approved by the owner on 24 September 2026, and
revised on 25 September 2026 for decisions of the owner of that day;
built in `src/core/store.ts`. The store is the one object of core that changes: it holds the
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

The store keeps each result to its own definition: it calls `warnings`
and `checkNumbers` of a definition only with a result of a request that
the `run` of that same definition made, found through that request in
flight, or in the cache under a key of that definition, since a key
holds the id of its analysis. The types do not ensure it. The functions
of the definition are methods, whose arguments TypeScript checks
loosely, so a definition whose `warnings` takes the result of one
analysis alone goes into the list of the store, whose `R` is the union
of the results of all, with no error of the compiler; the store holds
the rule instead, and a test with two analyses whose results differ in
shape checks it. The option not taken was to write the functions as
fields, which TypeScript checks strictly: it would refuse such a
definition, and make every analysis take the union of all the results
and pick its own out of it at run time, for a mistake the store rules
out in one place. For the same reason two definitions of one id are a
defect, and `createStore` throws on them: the key, the state and the
requests of an analysis are found by its id. Both decided here, not by
the owner, on 24 September 2026.

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

The action the notice offers is the reverse of what caused it, as the
owner decided on 25 September 2026: Undo after a command, Redo after an
undo, and Undo after a redo; the words before the action are the screen
spec's. The screen takes the action from the kind of
the cause, `command`, `undo` or `redo`, and the store gives nothing more
for it. Where this spec says that an undo keeps a calculation or brings a
result back, the action of the notice is meant, which after an undo is a
redo; the words on the calculations it will stop name that action too.
The option not taken was Undo always: after an undo it would undo the
step before, and take the user further from where they were.

A calculation in flight whose key the project no longer gives, one the
change left behind, is stopped unless the change is undone, as the owner
decided on 24 September 2026 (`docs/architecture.md`, section 5), except
after a change of the load of the variants file, below. It is in
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
  sentence on the calculations it will stop and keeps the rest, the
  results removed, the calculations already stopped and the Undo, or goes
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

A change of the load of the variants file is the exception: it stops
every calculation in flight at once, as the owner decided on 25
September 2026. The load is the load id of the variants file, and the
store compares it in the project before and after each command, undo
and redo: a new pick changes it, and so do an undo or a redo that gives
back another load, or no variants file at all. Other read options are a
new load id, since `loadVariants` with the load id already there and
other options is a defect (`docs/specs/core/project.md`, "The
commands"), and the worker client starts the calculation worker again
by the load id too (`.claude/skills/coding/worker.md`, "Cancelling").
The store compares the read options as well, which gives the same
changes today, so that a way of changing them under the same load id,
which the screen of stage 3 may find for the ploidy of a VCF, is still a
change of the load; decided here, not by the owner, on 25 September
2026.
The calculation worker holds one file only and is started again for the
new load (`docs/architecture.md`, section 5), so a calculation of the
old load could not go on until an undo. The notice does not promise
these calculations to an undo; it lists their analyses in `stopped`,
and the screen says that they were stopped, "2 calculations stopped
because a new variants file was loaded · Undo". An undo still brings
back the old file, and every result that had ended, from the cache; only
the calculations stopped must be run again. `stopped` holds the analysis
of every calculation that was in flight at the change and not already
being stopped, those the notice before left behind among them, in the
order of the definitions and each once. The notice then names no
calculation that will be stopped unless the change is undone: its
`leftBehind`, the list of those, is empty. `stopped` does not change
until the notice is closed or replaced, since what it tells has
happened, and a notice with nothing else in it stays until then. An
analysis done again leaves the results removed, as below, and not
`stopped`. One analysis can be both among the results removed and in
`stopped`: its result of the old settings is removed and its
calculation of newer ones stopped (the cases, below). The words of the notices the example above does not cover
are the screen spec's, in stage 2, with the example as their pattern:
an undo or a redo that changes the load, whose cause is not a new file
and whose action is Redo after an undo, and a notice with both results
removed and calculations stopped. The option not taken was to keep the old file in the
calculation worker until those calculations ended or the notice was
closed: the new file could not be used meanwhile, minutes for an
association, and the tab would hold the memory of both files.

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

How the store does it, decided here, not by the owner, on 24 September
2026: `startRun` stops the calculations left behind at the moment the
analysis sends its request, just before `send`, so that an analysis
whose `run` throws before sending stops nothing. The request is
`afterStop` when a stop of a calculation has been issued since the
calculation worker last announced itself ready, with `popneiReady`,
which it does again after every restart (the cases below), and no
calculation has ended done or failed since the stop: a stop of a
calculation that runs ends the worker, and the new request then waits
for the worker to start again and read the variants file, also when the
calculation stopped has already ended `cancelled`, as it has when the
user closed the notice or pressed Stop before pressing Run. A
calculation that ends done or failed after the stop was answered by a
worker already past it, so the next request does not wait for a
restart; without that, a stop of a calculation that only waited in the
queue, which starts no worker again, would mark every later request
until the next restart. The analyses
of `removed` and `leftBehind` are listed in the order of the
definitions, each once. A calculation that was being stopped and ends
`done` all the same puts its result into the cache under its key, as
any other.

The notice goes when it is closed or replaced; a change that removes
nothing, leaves nothing behind and stops nothing replaces it with none. An analysis is
`removed` while the current notice lists it, or `locked` if it cannot
run; when the notice is closed or replaced without it, the analysis is
`ready`. An analysis among the results removed that is done again, when
a calculation of its new key ends, leaves the results removed; it stays
in `stopped` if it is there. A calculation left behind that
ends by itself, done, failed or cancelled, leaves `leftBehind`, and so
does one whose key the project gives again through a read of a file,
which is not a change of the user; when `leftBehind` is empty, the
notice no longer says that calculations will be stopped, and a notice
left with nothing goes.

A change of the user leaves calculations behind, and its notice names
them. A read of a file, the number of variants of a result among them,
can leave one behind too, when it changes the key of an analysis whose
calculation is in flight or locks it: no notice names that one, and no
undo gives its key back, since the read is recorded into every project
of the history. So the store stops it at once, when the read is
recorded. And `startRun` stops every calculation left behind, those the
notice names and any other, so that the new request never waits behind
one. Decided here, not by the owner, on 24 September 2026, after the
review of the store.

An analysis that was running, and not done, before a change is not in
the notice's results removed: it had no result on the screen. After the
change it is `ready`, its calculation in `leftBehind`, or in `stopped`
after a change of the load, and the result that arrives late goes into
the cache for an undo.

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

The next change of the project, for a failure that is not popnei's, is
a command that changed the project, an undo, a redo or an opening; a
read recorded, a number of variants among them, is not, since it comes
from the workers and would clear the failure of one analysis when the
result of another arrives. `startRun` of an analysis in error after
such a failure forgets the failure, so that a cancel of the new
calculation leaves the analysis `ready`. Decided here, not by the
owner, on 24 September 2026.

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

How the store does it, decided here, not by the owner, on 24 September
2026: it asks `checkNumbers` once for each result, when the result
arrives, with the result of that same definition, and keeps the numbers
with it in the cache, whether or not the project has a reference, so
that the comparison costs nothing when the state is made again. The
fingerprint of the settings now is made when the keys are, with the read
options of the current variants file, and compared with the one the
reference kept for the analysis.

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
  | { readonly kind: "failed";
      readonly error: Exclude<RunError, { readonly kind: "popnei" }> };  // until the next change

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
  readonly stopped: readonly AnalysisId[];     // their calculations were stopped at once by a change of the load
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

What the store does with the client it binds, and with the calls it is
given, where the rest of this spec does not say; decided here, not by
the owner, on 24 September 2026:

- The client of a request sends once: a second call of its `run`, or a
  `run` of the analysis that returns a handle the client did not give,
  or none at all, is a defect of that analysis. If the analysis sent
  and then threw, the store cancels what it sent before it throws, so
  that no calculation runs that the store does not know.
- `startRun` and `cancelRun` of an id that no definition has are a
  defect.
- `cancelRun` stops the request of the analysis's current key that is
  not already being stopped; a calculation left behind is stopped by
  the notice, as above.
- The results the cache keeps when it drops some are those under the
  keys the current project gives, which hold every result on screen.

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
  shown running for ever. A defect while a result is taken in, a key
  from the worker that is not a key, a `warnings`, `checkNumbers` or
  `numVarsOf` that throws, also keeps the failure `{ kind: "failed",
  error: { kind: "defect", message } }` under the request's key, shown
  until the next change as other failures are, so that a calculation of
  minutes that ends in a defect does not end in `ready` with nothing
  said; nothing of the result is kept.
- **An analysis's `run` that throws**: a defect of that analysis. The
  store calls it before it records anything, so when it throws before
  sending, the state is as it was and no calculation is stopped. When it
  throws after sending, the store cancels what it sent; the calculations
  left behind that it stopped just before the send stay stopped, since
  their cancel was sent to the worker.
- **A new variants file picked while calculations run.** Every
  calculation in flight is stopped at the pick, those the notice before
  left behind among them; the notice lists their analyses in `stopped`,
  with the results removed, and leaves nothing behind. An undo of the
  pick shows the results of the old file that had ended, from the cache,
  and stops nothing more, since nothing is in flight that is not already
  being stopped; the analyses whose calculation was stopped are `ready`.
- **One analysis both removed and stopped.** The second analysis done;
  the MAF filter changed, which removes its result; Run, which starts it
  for the new threshold; an undo, which gives the result back and leaves
  the calculation behind; a new variants file picked: the notice lists
  the analysis in the results removed and in `stopped`. Its words are the
  screen spec's, in stage 2.
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

A read recorded into the history makes one new source of the file for
each source it changes, shared by every project that shared the old
one, as the projects of the history share every part a command did not
change. So an undo after a read gives a project whose source is the
very object of the present one, and a screen that compares the source
is not drawn again. The option not taken, a record applied to each
project alone, would have given each project a copy of its own. Decided
here, not by the owner, on 24 September 2026.

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
change.

The keys and the reasons of the new project, or of the new version, are
made before anything of the store changes, so that a defect while they
are made, a `keyInputs` or a `needs` that throws, leaves the store as it
was: the history, the version, the failures kept and the notice. A
listener that throws does not keep the others from being called; the
store calls them all and then throws the first error. When that happens
in `startRun`, the store takes the new request out of those in flight
and cancels it before it throws, since `src/ui/runs.ts` never receives
its handle and would never give its outcome. Decided here, not by the
owner, on 24 September 2026, after the review of the store. The store never waits: `startRun` returns at
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
  if it had none. Again, then a command that loads another variants
  file: `cancel()` is called at once, the notice lists the analysis in
  `stopped` and none in `leftBehind`, and after an undo of that load the
  old request has been cancelled once and no more. The same with an undo
  and with a redo that change the load. No test waits for a time: the
  store has no clock.
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
- **A read recorded**: two projects of the history that shared the
  source of the file share the new one after the read.
- **A result kept to its definition**: the two fake analyses give
  results of different shapes, and the `warnings` and `checkNumbers` of
  each are called only with results of its own requests; two definitions
  of one id make `createStore` throw.
- **Properties, with fast-check**, which draws random sequences of
  commands, undos, redos, starts, progress, ends and cancels of requests,
  in any order, and shrinks a failure to the smallest one: a result is
  shown only under the key that `keyOf` gives for the current project; an
  undo after a command that removed results gives them back, done, when
  the cache still holds them; the notice of each change lists exactly the
  analyses that were done before it and are not after it; every request
  in flight whose key the project does not give is named by the notice or
  stopping; a request left behind whose notice was closed or replaced
  without its key coming back, or that a `startRun` met, has been
  cancelled; and a change of the load of the variants file cancels at
  once every request in flight, and its notice lists exactly their
  analyses in `stopped`.

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
- Asking the workers to read a file: the store records a read and asks
  for none. After every change of the project the entry of the page asks
  for a read of each source pending with no read under way, as the owner
  decided on 25 September 2026 (`docs/architecture.md`, section 6, "Who
  asks for a read").
