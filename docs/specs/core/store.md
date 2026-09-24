# The store

Draft, 24 September 2026, not yet approved by the owner. There is no code
yet. The store is the one object of core with state: it holds the history
of the projects, the cache of the results, the version of popnei, the
calculations in flight and the ones popnei refused, and gives the screens
one state to read, in which each analysis is in one of the seven states
of a screen. The screens change it with commands, and `src/ui/runs.ts`,
which awaits the calculations, with events. This spec develops the row of
`store.ts` in section 9 of `docs/architecture.md`, with its sections 3,
4, 5 and 7, and declares the definition of an analysis of its section 4,
which the store is given. It depends on `docs/specs/core/project.md`,
`keys.md`, `history.md` and `cache.md`, and on
`docs/specs/worker/protocol.md` for a run.

## What it does

Everything a user sees of a result goes through the store: whether it is
shown, whether it is the result of the settings on screen, whether it was
taken off by a change and can be brought back, whether a calculation is
running for it. The store shows a result only under the key that the
current project gives it, and so never one of other settings
(`docs/architecture.md`, section 3).

### The definition of an analysis

Each analysis is a module that exports its definition, of the shape of
section 4 of `docs/architecture.md`. The store is given the definitions
of the analyses of its application, in the order the screens show them,
and calls nothing else of them. `J` is the type of the requests of the
calculation worker and `R` that of its results, `Job` and `JobResult` of
`src/worker/protocol.ts` in the application (stage 2), and types of the
tests in the tests.

- `needs` gives the reason an analysis cannot run, in the words the
  screen shows next to its Run button, or `null`; it is the state
  `locked`.
- `keyInputs` gives what the key holds beyond the parts every key holds
  (`docs/specs/core/keys.md`).
- `run` builds the request and sends it through the client it is given.
  The store gives it a client bound to the key and to the progress of
  this run, so an analysis cannot send a request under another key, nor
  lose its progress. The store looks in the cache before it calls `run`,
  so an analysis never does.
- `warnings` gives the warnings its result raises from the data; the
  store calls it once per key, when the result arrives.
- `parseOptions` checks the options of the analysis read from a project
  file (`docs/specs/core/project.md`, "The validation"). It is a member
  that section 4 of `docs/architecture.md` did not have, added with this
  spec, because the options of an analysis are its module's to know.
- `checkNumbers` and `script` are used by the project file and the report,
  in stages 2 and 6.

### The state of an analysis

The store gives each analysis one state, the first of this table whose
condition holds. The states are the seven of a screen spec
(`.claude/skills/writing-specs/SKILL.md`, "The states"), and a panel shows
the one the store gives (`.claude/skills/coding/react.md`, "The states of
an analysis").

| state | when | what it holds |
|---|---|---|
| locked | its `needs` gives a reason | the reason |
| empty | the calculation worker has not given the version of popnei yet, so no key can be made | nothing: the user waits, and has nothing to do |
| done | the cache holds a result under its key | the result, its warnings, and the comparison with the check numbers of an opened project file |
| running | a calculation of its key has been started and has not ended, whether it waits in the queue or runs | its progress, `null` until the worker gives one, and the run's id |
| error | popnei refused the calculation of its key | popnei's message |
| results removed | the last command, undo or redo took its result off the screen | its key; it can run again |
| ready | none of the above | its key |

`locked` comes before `empty` because the user can act on it: with no
variants file loaded, the panel says to load one, and not to wait.

### Commands and events

A command of the user goes through `apply` with its description, the
words that finish the notice, "the MAF filter changed". `apply` commits
the new project to the history, unless the command returned the project
it was given, and undo and redo move in it (`docs/specs/core/history.md`).
The description is a change to the interface that
`.claude/skills/coding/SKILL.md` gave, `apply(command)`, which had no way
to say why results were removed.

`open` starts a new history with an opened project, and Ctrl+Z does not
undo it, as the owner decided on 24 September 2026
(`docs/specs/core/history.md`). The cache, the runs and the refusals are
kept: they are under keys, and a key names the load it was made from, so
nothing of them is shown for the new project unless its keys give it.

The events come from the workers, through `src/ui/runs.ts` and the entry
of the page, and change what the screens show without a step of undo:
the version of popnei, the reads of the files, recorded into every project
of the history that holds their load, and the end of a calculation.

### The notice of removed results

After a command, an undo or a redo, the store compares the analyses that
were `done` before it with those after it. Each that was done and is not
any more is in the notice, with the cause: the description of the
command, of the step undone, or of the step redone. The screen writes it
as "3 results removed because the MAF filter changed · Undo"
(`.claude/skills/writing/SKILL.md`, "The text of the applications"). An
analysis in the notice is in the state `results removed` if it can run,
and `locked` if it cannot, which says what it lacks. The notice and the
state last until the next command, undo, redo or opening; a dismissal
closes the notice alone. An opening makes no notice: the screen asked
before it.

### A calculation that failed

When popnei refuses a calculation, the store keeps its message under the
key of the calculation, and the analysis is in the state `error` whenever
the project gives that key again, by an undo or by a value set back,
without calculating again. popnei refuses the same data with the same
message every time, so a second calculation would take its time to say
the same thing. The other failures, a worker that failed, one that could
not start, a stale file after a deploy, a message that did not validate,
and a cancel, keep nothing: the analysis is `ready`, since a second try
can succeed. The owner decided it on 24 September 2026. The option not
taken was to forget every failure, which would have shown the analysis
ready after an undo and let the user wait again for popnei's refusal.

A key refused is not run again: `startRun` does nothing for it, and the
user changes the settings, which gives another key.

### The comparison with the check numbers

When the project comes from a project file whose reference holds check
numbers for an analysis, the state `done` of that analysis holds the
comparison of its result with them, if the fingerprint of its settings
now is the one the reference kept (`docs/specs/core/project.md`, "The
project of an opened project file"); otherwise it holds none, since the
numbers belong to other settings. The numbers are compared exactly: the
same calculation of popnei on the same data gives the same numbers, in
every browser, since wasm computes with the floating point of IEEE 754.

- **The same numbers**: the variants file gives the results the project
  was saved with.
- **Other numbers, the same version of popnei**: the variants file is not
  the one the project was saved with, or it was changed since.
- **Other numbers, another version of popnei**: the comparison names both
  versions, and says that the difference can come from the new version as
  well as from the file; it cannot tell which.

This is decided here. The final words are those of the spec of the
project file's screen, in stage 6.

## The TypeScript interface

The definition of an analysis, and the client it is given.

```ts
export interface AnalysisDef<J, R> {
  readonly id: AnalysisId;
  readonly app: readonly AppId[];
  readonly defaults: JsonObject;
  readonly keyVersion: number;
  parseOptions(options: unknown): Result<JsonObject, string>;
  keyInputs(p: Project): JsonValue;
  needs(p: Project): string | null;
  run(p: Project, c: WorkerClient<J, R>): Run<R>;
  warnings(r: R, p: Project): readonly Warning[];
  checkNumbers(r: R): readonly (number | null)[];
  script(p: Project): string;
}

/** What an analysis sends its request through: bound by the store to one key. */
export interface WorkerClient<J, R> {
  run(job: J): Run<R>;
}

/** A warning raised by the data; `code` is what the tests assert. */
export interface Warning {
  readonly code: string;
  readonly text: string;
}
```

The state the screens read. It is the same object until something
changes, and the state of an analysis that did not change keeps its
reference, so that a screen that reads it is not drawn again.

```ts
export interface AppState<R> {
  readonly project: Project;
  readonly undo: string | null;          // the description of what an undo would undo
  readonly redo: string | null;
  readonly popneiVersion: string | null;
  readonly analyses: readonly AnalysisView<R>[];  // in the order of the definitions
  readonly notice: Notice | null;
}

export interface AnalysisView<R> {
  readonly id: AnalysisId;
  readonly status: AnalysisStatus<R>;
}

export type AnalysisStatus<R> =
  | { readonly kind: "locked"; readonly reason: string }
  | { readonly kind: "empty" }
  | { readonly kind: "done"; readonly key: Key; readonly result: R;
      readonly warnings: readonly Warning[]; readonly check: CheckVerdict | null }
  | { readonly kind: "running"; readonly key: Key; readonly runId: number;
      readonly progress: Progress | null }
  | { readonly kind: "error"; readonly key: Key; readonly message: string }
  | { readonly kind: "removed"; readonly key: Key }
  | { readonly kind: "ready"; readonly key: Key };

export type CheckVerdict =
  | { readonly kind: "same" }
  | { readonly kind: "differs"; readonly popnei: { readonly saved: string; readonly now: string } | null };

export interface Notice {
  readonly removed: readonly AnalysisId[];
  readonly cause: { readonly kind: "command" | "undo" | "redo"; readonly description: string };
}
```

The store is made once per page, by its entry, with the definitions of the
application's analyses, the function of the worker client that sends a
request (`.claude/skills/coding/worker.md`, `Client.run`), and the
function that finds in a result the number of variants its pass counted,
which is recorded into the variants file of its load
(`docs/architecture.md`, section 6, step 5).

```ts
export function createStore<J, R>(config: {
  readonly first: Project;
  readonly analyses: readonly AnalysisDef<J, R>[];
  readonly send: (key: string, job: J, onProgress: (p: Progress) => void) => Run<R>;
  readonly numVarsOf: (r: R) => number | null;
  readonly cacheMaxBytes: number;
}): Store<R>;

export interface Store<R> {
  getState(): AppState<R>;
  /** Calls `listener` after every change; returns what unsubscribes. Bound once. */
  readonly subscribe: (listener: () => void) => () => void;

  apply(description: string, command: (p: Project) => Project): void;
  undo(): void;
  redo(): void;
  open(p: Project): void;
  dismissNotice(): void;

  /** Starts the calculation of an analysis that is ready or removed;
      null, and nothing done, in any other state. */
  startRun(id: AnalysisId): Run<R> | null;

  popneiReady(version: string): void;
  variantsRead(fileId: string, read: SourceRead): void;
  individualsRead(fileId: string, csv: CsvOptions | null, read: IndividualsRead): void;
  runEnded(runId: number, outcome: Outcome<R>): void;
}
```

`startRun` returns the run to its caller, `src/ui/runs.ts`, which holds
its handle, awaits its outcome and gives it to `runEnded`. The progress
comes to the store through the client it bound, with no call of the
screens.

What `runEnded` does with each outcome:

- `done`: the result is put in the cache under its key, with the keys of
  the current project kept, and its warnings made; the number of
  variants, when `numVarsOf` gives one, is recorded into the variants file
  of the run's load in every project of the history.
- `failed` with a `RunError` of kind `popnei`: the message is kept under
  the key. Any other kind: nothing is kept.
- `cancelled`: nothing is kept.

In the three, the run is no longer in flight.

## The cases

- **A result that arrives after the user changed a setting.** It goes
  into the cache under the key it was asked for, and the screen does not
  show it, since the project gives that analysis another key; an undo
  shows it with no calculation (`docs/architecture.md`, section 5).
- **A calculation still running when its key is no longer asked for.** It
  is not stopped: ending it would cost a restart of the worker, and its
  result may be wanted after an undo. The analysis is shown in the state
  of its new key. `src/ui/runs.ts` cancels the calculations that are
  still waiting in the queue under a key the project no longer gives,
  which costs nothing (`docs/architecture.md`, section 5).
- **Run asked twice** for the same key: the second `startRun` returns
  `null`, since the analysis is `running`.
- **A cancel, a worker that failed, a restart.** The outcome is
  `cancelled` or a failure of the worker; nothing is kept, and the
  analysis is `ready`.
- **A result whose key is not the run's key**, or a `runEnded` of a run
  the store did not start: a defect, since only the store starts runs.
- **The first command before the version of popnei arrives.** Every
  analysis that is not locked is `empty`; the notice compares states, so
  a command then removes nothing.
- **A read of the individuals file that changes the table.** A record
  makes no notice: before it, the analyses that use the file were locked,
  "reading the file", and had no result on screen.
- **An opened project whose settings are changed and set back.** The
  fingerprint is that of the settings, so the comparison with the check
  numbers comes back with them.

## How it runs

On the page. After every change, the store makes the key of each analysis
that is not locked, and its state; `docs/specs/core/keys.md` says what
that costs. Then it uses in the cache the results of the current keys, so
that the results on screen are the last to be dropped
(`docs/specs/core/cache.md`), and calls the listeners once. The store
never waits: `startRun` returns at once, and the outcome arrives as an
event.

What the store keeps grows with the session: the cache, bounded in bytes;
the history, bounded in steps; the messages of popnei's refusals, one
short text per key refused, not bounded, since a session makes few.

## How it is verified

With Vitest, at the functions of `Store`, with a fake `send` that returns
runs whose outcomes the test resolves by hand, and two fake analyses: one
that needs a variants file and uses the populations, and one that needs
only the variants file.

- **A worked sequence.** Create the store, `popneiReady("0.1.0")`; both
  analyses are locked. `apply("a variants file was loaded", loadVariants)`
  and `variantsRead` of that load: both are `ready`. `startRun` of the
  first; it is `running`; `runEnded` with its result: it is `done`, and
  the cache holds one result. `apply("the missing data filter changed",
  …)`: the first is `removed` and the second `ready`, and the notice
  lists the first alone, which was the one done, with that cause. `undo()`: the first is `done` again with the same
  result object, `send` was called once, and the notice is empty.
- **A refusal**: `runEnded` with `{ kind: "failed", error: { kind:
  "popnei", message: "the filters kept no variant" } }` gives `error` with
  that message; a command, then its undo, give `error` again and `send`
  is not called; the same with `workerFailed` gives `ready`.
- **The check numbers**: a project opened with a reference whose check
  fingerprint is that of its settings, a result whose check numbers are
  those saved: `same`; other numbers with the version saved "0.1.0" and
  the version now "0.1.0": `differs` with `popnei: null`; with "0.2.0"
  now: `differs` with both; a setting changed: `check` is null; set back:
  the comparison is there again.
- **`getState`** returns the same object between two changes, and the
  state of an analysis that did not change is the same object after a
  change to another.
- **Properties, with fast-check**, over random sequences of commands,
  undos, redos, starts and ends of runs: a result is shown only under the
  key that `keyOf` gives for the current project, whatever the order in
  which the outcomes arrive; an undo after a command that removed results
  gives them back, done, when the cache still holds them; and the notice
  of each change lists exactly the analyses that were done before it and
  are not after it.

The tests in the browser, of the walking skeleton, check the same through
the screens, since core reaches them through the store
(`.claude/skills/coding/testing.md`).

## Open points

None of the store's own. It uses the bound of the cache
(`docs/specs/core/cache.md`, **Open 1**) and the bound of the history
(`docs/specs/core/history.md`, **Open 1**).

## Not in this spec

- `src/ui/runs.ts`, which awaits the runs and cancels the queued ones, and
  the hook through which React reads the store: the specs of the shell, in
  stage 2, and `.claude/skills/coding/react.md`.
- The list of the analyses of each application, `apps.ts`, and each
  analysis: from stage 2.
- The words of the notice, the locked reasons and the comparison: the
  screen specs.
- Restarting the calculation worker when the load of the variants file
  changes: the worker client, which reads it from the project
  (`docs/architecture.md`, section 5).
