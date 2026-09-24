/**
 * The store, the one object of core that changes: it holds the history of
 * the projects, the cache of the results, the version of popnei and the
 * calculations in flight, and gives the screens the state of each
 * analysis (docs/specs/core/store.md). The screens change it with
 * commands, and `src/ui/runs.ts` and the entry of the page with the
 * events of the workers; it never waits.
 */

import { emptyCache, use } from "./cache.ts";
import type { Cache } from "./cache.ts";
import { commit, mapProjects, redo, startHistory, undo } from "./history.ts";
import type { History } from "./history.ts";
import { createKeyMemo, keyOf } from "./keys.ts";
import type { JsonObject, JsonValue, Key } from "./keys.ts";
import {
  freezeProject,
  projectNeeds,
  recordIndividualsRead,
  recordVariantsRead,
} from "./project.ts";
import type {
  AnalysisId,
  AppId,
  IndividualsRead,
  IndividualsSource,
  Project,
  SourceRead,
  VariantSource,
} from "./project.ts";
import type { Result } from "./result.ts";
import type {
  CsvOptions,
  Outcome,
  Progress,
  Run,
  RunError,
} from "../worker/protocol.ts";

/**
 * The definition of an analysis, which its module exports. The store is
 * given those of its application, in the order the screens show them, and
 * calls nothing else of them. `J` is the type of the requests of the
 * calculation worker and `R` that of its results.
 */
export interface AnalysisDef<J, R> {
  /** The id of the analysis, "diversity", "pca". */
  readonly id: AnalysisId;
  /** The applications that have it. */
  readonly app: readonly AppId[];
  /** Its options when the user has set none. */
  readonly defaults: JsonObject;
  /** A number raised when what its result means changes for the same
      inputs, so that the results calculated before are no longer found. */
  readonly keyVersion: number;
  /** Which of the two lists of filters it reads, and so which go into its
      key. */
  readonly filtersRead: {
    readonly variants: boolean;
    readonly individuals: boolean;
  };
  /** Checks its options read from a project file of the version
      `formatVersion` of the format, and gives them whole, or what is
      wrong with them. */
  parseOptions(
    options: unknown,
    formatVersion: number,
  ): Result<JsonObject, string>;
  /** What its key holds beyond the load of the variants file and the
      filters, all of it. It answers for any project and does not read
      `p.variants`. */
  keyInputs(p: Project): JsonValue;
  /** The reason it cannot run beyond what every analysis needs, in the
      words the screen shows next to its Run button, or `null`. */
  needs(p: Project): string | null;
  /** Builds its request and sends it through `c`, which the store binds
      to its key, and returns the handle without waiting on it. */
  run(p: Project, c: WorkerClient<J, R>): Run<R>;
  /** The warnings its result raises from the data, given the project the
      request was made from. */
  warnings(r: R, p: Project): readonly Warning[];
  /** The numbers of its result kept in the project file, made from
      popnei's by addition, subtraction, multiplication and division
      alone; `null` where popnei gave NaN. */
  checkNumbers(r: R): readonly (number | null)[];
  /** Its lines of the Python script. */
  script(p: Project): string;
}

/** What an analysis sends its request through, bound by the store to one
    key. */
export interface WorkerClient<J, R> {
  /** Sends the request under the key of the analysis. */
  run(job: J): Run<R>;
  /** The key of an intermediate result of the request, "the pruned
      variants", made from its name and its inputs. */
  intermediateKey(name: string, inputs: JsonValue): string;
}

/** A warning raised by the data. */
export interface Warning {
  /** What the tests assert. */
  readonly code: string;
  /** The text the user reads. */
  readonly text: string;
}

/**
 * The state the screens read. It is the same object until something
 * changes, and the state of an analysis that did not change is the same
 * object after a change to another, so that a screen that reads it is not
 * drawn again.
 */
export interface AppState<R> {
  /** The current project. */
  readonly project: Project;
  /** The description of what an undo would undo, "the MAF filter
      changed", or `null` when there is nothing to undo. */
  readonly undo: string | null;
  /** The description of what a redo would redo, or `null`. */
  readonly redo: string | null;
  /** The version of popnei the calculation worker gave, or `null` until
      it has started. */
  readonly popneiVersion: string | null;
  /** The state of each analysis, in the order of the definitions. */
  readonly analyses: readonly AnalysisView<R>[];
  /** The calculations in flight. */
  readonly runs: readonly RunView[];
  /** What the last change removed or will stop, or `null`. */
  readonly notice: Notice | null;
}

/** One analysis and its state. */
export interface AnalysisView<R> {
  /** The id of the analysis. */
  readonly id: AnalysisId;
  /** Its state, one of those of a screen. */
  readonly status: AnalysisStatus<R>;
}

/** The state of an analysis, the first of these whose condition holds
    (the store spec, "The state of an analysis"). */
export type AnalysisStatus<R> =
  /** It cannot run: `projectNeeds` or its `needs` gave `reason`. */
  | { readonly kind: "locked"; readonly reason: string }
  /** The cache holds its result under its key, with the warnings of the
      result and the comparison with the check numbers of an opened
      project file, or `null` when there is none to make. */
  | {
      readonly kind: "done";
      readonly key: Key;
      readonly result: R;
      readonly warnings: readonly Warning[];
      readonly check: CheckVerdict | null;
    }
  /** A calculation of its key is in flight and is not being stopped;
      `progress` is `null` until the worker gives one. */
  | {
      readonly kind: "running";
      readonly key: Key;
      readonly runId: number;
      readonly progress: Progress | null;
    }
  /** popnei refused the calculation of its key, or the calculation
      failed since the last change. */
  | { readonly kind: "error"; readonly key: Key; readonly error: AnalysisError }
  /** The current notice lists it among the results removed; it can run
      again. */
  | { readonly kind: "removed"; readonly key: Key }
  /** None of the above: it can run. */
  | { readonly kind: "ready"; readonly key: Key };

/** Why the calculation of an analysis gave no result. */
export type AnalysisError =
  /** popnei refused it, with its message; kept for the session. */
  | { readonly kind: "refused"; readonly message: string }
  /** It failed otherwise; kept until the next change of the project. */
  | { readonly kind: "failed"; readonly error: RunError };

/** A calculation in flight. */
export interface RunView {
  /** The id of its request. */
  readonly runId: number;
  /** The analysis it calculates. */
  readonly analysis: AnalysisId;
  /** The key it was asked under. */
  readonly key: Key;
  /** Whether the current project still gives its key. */
  readonly current: boolean;
  /** Whether it was cancelled and its outcome has not yet arrived. */
  readonly stopping: boolean;
  /** Whether it was started by a `startRun` that stopped a calculation,
      so that it may first wait for the variants file to be read again. */
  readonly afterStop: boolean;
  /** How far it has gone, or `null` until the worker gives it. */
  readonly progress: Progress | null;
}

/** The comparison of a result with the check numbers saved in the
    project file it was opened from. */
export type CheckVerdict =
  /** The result gives the numbers saved. */
  | { readonly kind: "same" }
  /** It gives other numbers; `popnei` names both versions of popnei when
      they differ, and `app` both versions of the application when the key
      version of the analysis has changed since. */
  | {
      readonly kind: "differs";
      readonly popnei: { readonly saved: string; readonly now: string } | null;
      readonly app: { readonly saved: string; readonly now: string } | null;
    };

/** What the last change removed, and the calculations it left behind. */
export interface Notice {
  /** The change: a command with its description, or the step undone or
      redone. */
  readonly cause: {
    readonly kind: "command" | "undo" | "redo";
    readonly description: string;
  };
  /** The analyses that were done before the change and are not after
      it. */
  readonly removed: readonly AnalysisId[];
  /** The analyses whose calculations will be stopped unless the change is
      undone. */
  readonly leftBehind: readonly AnalysisId[];
}

/** What the entry of the page makes the store with. */
export interface StoreConfig<J, R> {
  /** The first project of the page. */
  readonly first: Project;
  /** The definitions of the analyses of the application, in the order
      the screens show them, each of its own id. */
  readonly analyses: readonly AnalysisDef<J, R>[];
  /** The function of the worker client that sends a request under a
      key, `Client.run`. */
  readonly send: (
    key: string,
    job: J,
    onProgress: (p: Progress) => void,
  ) => Run<R>;
  /** The number of variants the pass of a result counted, which is
      recorded into the variants file of the request's load, or `null`. */
  readonly numVarsOf: (r: R) => number | null;
  /** The version of the application. */
  readonly appVersion: string;
  /** The bound of the cache in bytes, `CACHE_MAX_BYTES`. */
  readonly cacheMaxBytes: number;
  /** The steps of undo kept, `MAX_UNDO_STEPS`. */
  readonly maxUndoSteps: number;
}

/** The store of one page. */
export interface Store<R> {
  /** The current state, the same object until something changes. */
  getState(): AppState<R>;
  /** Calls `listener`, a function of a screen, after every change;
      returns the function that stops it. A property made once, so React
      keeps it. */
  readonly subscribe: (listener: () => void) => () => void;

  /** Applies a command of the user, `command`, to the current project,
      and commits what it gives with `description`, the words that finish
      the notice, "the MAF filter changed"; nothing changes when it gives
      the project it was given. */
  apply(description: string, command: (p: Project) => Project): void;
  /** Goes back one step; nothing changes when there is none. */
  undo(): void;
  /** Goes forward one step; nothing changes when there is none. */
  redo(): void;
  /** Starts a new history with the opened project `p`, with nothing to
      undo. */
  open(p: Project): void;
  /** Closes the notice, and stops the calculations it left behind. */
  dismissNotice(): void;

  /** Starts the calculation of an analysis that is ready, removed, or in
      error after a failure that is not popnei's, after stopping every
      calculation left behind; null, and nothing done, in any other state. */
  startRun(id: AnalysisId): Run<R> | null;
  /** Stops the calculation in flight of an analysis, if there is one. */
  cancelRun(id: AnalysisId): void;

  /** The calculation worker has started, with popnei of `version`. */
  popneiReady(version: string): void;
  /** What the calculation worker read of the variants file of the load
      `fileId`, recorded into every project of the history that holds it
      pending. */
  variantsRead(fileId: string, read: SourceRead): void;
  /** What the light worker read of the individuals file of the load
      `fileId` with the options `csv`, recorded into every project of the
      history that holds it pending with those options. */
  individualsRead(
    fileId: string,
    csv: CsvOptions | null,
    read: IndividualsRead,
  ): void;
  /** How the request `runId` ended. */
  runEnded(runId: number, outcome: Outcome<R>): void;
}

/** What the cache keeps under a key: a result with the warnings it
    raised. */
interface CachedResult<R> {
  readonly result: R;
  readonly warnings: readonly Warning[];
}

/** An analysis that cannot run, with its reason, or its key. */
type AnalysisKey =
  | { readonly kind: "locked"; readonly reason: string }
  | { readonly kind: "keyed"; readonly key: Key };

/** The keys of the analyses, and the project and version they were made
    for. */
interface Keyed {
  readonly project: Project;
  readonly popneiVersion: string | null;
  readonly keys: readonly AnalysisKey[];
}

/** No calculation in flight, one list for every state that has none. */
const NO_RUNS: readonly RunView[] = [];

/**
 * The store of a page, made once by its entry, with the first project,
 * frozen, as the history's only one. Throws a defect when two definitions
 * have one id, or when the bounds are not what `startHistory` and
 * `emptyCache` take.
 */
export function createStore<J, R>(config: StoreConfig<J, R>): Store<R> {
  const defs = config.analyses;
  const ids = new Set<AnalysisId>();
  for (const def of defs) {
    if (ids.has(def.id)) {
      throw defect(
        `createStore was given two definitions of the analysis ${JSON.stringify(def.id)}; the key, the state and the requests of an analysis are found by its id.`,
      );
    }
    ids.add(def.id);
  }
  const memo = createKeyMemo();
  let history = startHistory(freezeProject(config.first), config.maxUndoSteps);
  let popneiVersion: string | null = null;
  let cache: Cache<CachedResult<R>> = emptyCache(config.cacheMaxBytes);
  let keyed: Keyed | null = null;
  const listeners = new Set<() => void>();

  let locks: {
    readonly project: Project;
    readonly reasons: readonly (string | null)[];
  } | null = null;

  /** The reason each analysis cannot run, or `null`, asked again only
      when the project changed: a check of the lists of individuals walks
      every individual of the variants file. */
  const reasonsOf = (p: Project): readonly (string | null)[] => {
    if (locks?.project === p) {
      return locks.reasons;
    }
    const common = projectNeeds(p);
    const reasons = defs.map((def) => common ?? def.needs(p));
    locks = { project: p, reasons };
    return reasons;
  };

  const keysOf = (p: Project): readonly AnalysisKey[] => {
    const reasons = reasonsOf(p);
    return defs.map((def, index): AnalysisKey => {
      const reason = reasons[index];
      if (reason === undefined) {
        throw defect(
          `the analysis ${JSON.stringify(def.id)} has no reason asked.`,
        );
      }
      if (reason !== null) {
        return { kind: "locked", reason };
      }
      if (popneiVersion === null) {
        throw defect(
          `the analysis ${JSON.stringify(def.id)} can run before the calculation worker gave the version of popnei, which its key needs.`,
        );
      }
      return { kind: "keyed", key: keyOf(def, p, popneiVersion, memo) };
    });
  };

  /** The keys of the current project and version, made again only when
      one of the two changed; the results of the new keys are used in the
      cache, so that those on screen are the last dropped. */
  const currentKeys = (): readonly AnalysisKey[] => {
    const project = history.present.project;
    if (keyed?.project === project && keyed.popneiVersion === popneiVersion) {
      return keyed.keys;
    }
    const keys = keysOf(project);
    keyed = { project, popneiVersion, keys };
    cache = use(
      cache,
      keys.flatMap((k) => (k.kind === "keyed" ? [k.key] : [])),
    );
    return keys;
  };

  /** The state of the store now, reusing every part of `previous` that
      did not change, and `previous` itself when nothing did. */
  const stateOf = (previous: AppState<R> | null): AppState<R> => {
    const keys = currentKeys();
    const views = defs.map((def, index): AnalysisView<R> => {
      const key = keys[index];
      if (key === undefined) {
        throw defect(`the analysis ${JSON.stringify(def.id)} has no key made.`);
      }
      const status: AnalysisStatus<R> =
        key.kind === "locked"
          ? { kind: "locked", reason: key.reason }
          : { kind: "ready", key: key.key };
      const before = previous?.analyses[index];
      return before !== undefined && sameStatus(before.status, status)
        ? before
        : { id: def.id, status };
    });
    const analyses =
      previous?.analyses.length === views.length &&
      views.every((view, index) => view === previous.analyses[index])
        ? previous.analyses
        : views;
    const project = history.present.project;
    const undoText =
      history.past.length > 0 ? history.present.description : null;
    const redoText = history.future[0]?.description ?? null;
    if (
      previous?.project === project &&
      previous.undo === undoText &&
      previous.redo === redoText &&
      previous.popneiVersion === popneiVersion &&
      previous.analyses === analyses
    ) {
      return previous;
    }
    return {
      project,
      undo: undoText,
      redo: redoText,
      popneiVersion,
      analyses,
      runs: NO_RUNS,
      notice: null,
    };
  };

  let state = stateOf(null);

  /** Makes the state again and, when it changed, calls each listener. */
  const changed = (): void => {
    const next = stateOf(state);
    if (next === state) {
      return;
    }
    state = next;
    for (const listener of [...listeners]) {
      listener();
    }
  };

  /** Takes `next` as the history, and tells the screens when it is not
      the one there was. */
  const moved = (next: History): void => {
    if (next !== history) {
      history = next;
      changed();
    }
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    apply: (description, command) => {
      const present = history.present.project;
      const next = command(present);
      if (next === present) {
        return;
      }
      moved(commit(history, freezeProject(next), description));
    },
    undo: () => {
      moved(undo(history));
    },
    redo: () => {
      moved(redo(history));
    },
    open: (p) => {
      moved(startHistory(freezeProject(p), history.maxSteps));
    },
    dismissNotice: () => {
      throw notBuilt("dismissNotice");
    },
    startRun: () => {
      throw notBuilt("startRun");
    },
    cancelRun: () => {
      throw notBuilt("cancelRun");
    },
    popneiReady: (version) => {
      if (version !== popneiVersion) {
        popneiVersion = version;
        changed();
      }
    },
    variantsRead: (fileId, read) => {
      moved(
        recordShared<VariantSource>(
          history,
          (p) => p.variants,
          (p, variants) => ({ ...p, variants }),
          (p) => recordVariantsRead(p, fileId, read),
        ),
      );
    },
    individualsRead: (fileId, csv, read) => {
      moved(
        recordShared<IndividualsSource>(
          history,
          (p) => p.individuals,
          (p, individuals) => ({ ...p, individuals }),
          (p) => recordIndividualsRead(p, fileId, csv, read),
        ),
      );
    },
    runEnded: () => {
      throw notBuilt("runEnded");
    },
  };
}

/**
 * A record of a read, `record`, applied to every project of the history,
 * making one new source for each old source it changes, shared by every
 * project that shared the old one, and each project it changes frozen. A
 * record reads and changes only the source of its file, so the new source
 * made for one project is the one it would make for another that holds
 * the same old source.
 */
function recordShared<S extends object>(
  h: History,
  sourceOf: (p: Project) => S | null,
  withSource: (p: Project, source: S) => Project,
  record: (p: Project) => Project,
): History {
  const made = new Map<S, S>();
  return mapProjects(h, (p) => {
    const old = sourceOf(p);
    if (old === null) {
      return p;
    }
    const known = made.get(old);
    if (known !== undefined) {
      return known === old ? p : freezeProject(withSource(p, known));
    }
    const next = record(p);
    const source = sourceOf(next);
    if (source === null) {
      throw defect("a record of a read removed the source of its file.");
    }
    made.set(old, source);
    return next === p ? p : freezeProject(next);
  });
}

/** Whether two states of an analysis show the same, so that the screen
    keeps the object it has. */
function sameStatus<R>(a: AnalysisStatus<R>, b: AnalysisStatus<R>): boolean {
  switch (a.kind) {
    case "locked":
      return b.kind === "locked" && a.reason === b.reason;
    case "done":
      return (
        b.kind === "done" &&
        a.key === b.key &&
        a.result === b.result &&
        a.warnings === b.warnings &&
        a.check === b.check
      );
    case "running":
      return (
        b.kind === "running" &&
        a.key === b.key &&
        a.runId === b.runId &&
        a.progress === b.progress
      );
    case "error":
      return b.kind === "error" && a.key === b.key && a.error === b.error;
    case "removed":
      return b.kind === "removed" && a.key === b.key;
    case "ready":
      return b.kind === "ready" && a.key === b.key;
  }
}

function defect(message: string): Error {
  return new Error(`popnei_web defect: ${message}`);
}

/** A function of the store a later task of the plan builds. */
function notBuilt(name: string): Error {
  return defect(`${name} of the store is not built yet.`);
}
