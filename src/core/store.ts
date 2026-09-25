/**
 * The store, the one object of core that changes: it holds the history of
 * the projects, the cache of the results, the version of popnei and the
 * calculations in flight, and gives the screens the state of each
 * analysis (docs/specs/core/store.md). The screens change it with
 * commands, and `src/ui/runs.ts` and the entry of the page with the
 * events of the workers; it never waits.
 */

import { emptyCache, get, put, use } from "./cache.ts";
import type { Cache } from "./cache.ts";
import { commit, mapProjects, redo, startHistory, undo } from "./history.ts";
import type { History } from "./history.ts";
import {
  createKeyMemo,
  intermediateKeyOf,
  keyFromWire,
  keyOf,
  settingsFingerprint,
} from "./keys.ts";
import type { JsonObject, JsonValue, Key } from "./keys.ts";
import {
  freezeProject,
  projectNeeds,
  recordIndividualsRead,
  recordVariantsCounted,
  recordVariantsRead,
} from "./project.ts";
import type {
  AnalysisId,
  AppId,
  Check,
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
  /** It failed otherwise, never popnei's refusal, which is `refused`;
      kept until the next change of the project. */
  | {
      readonly kind: "failed";
      readonly error: Exclude<RunError, { readonly kind: "popnei" }>;
    };

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

/** What the last change removed, the calculations it left behind, and
    those it stopped at once. */
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
  /** The analyses whose calculations the change stopped at once, since it
      changed the load of the variants file; it does not change until the
      notice is closed or replaced. */
  readonly stopped: readonly AnalysisId[];
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
    raised and the numbers its definition's `checkNumbers` gave. */
interface CachedResult<R> {
  readonly result: R;
  readonly warnings: readonly Warning[];
  readonly numbers: readonly (number | null)[];
}

/** An analysis that cannot run, with its reason, or its key, with the
    check numbers of the reference whose fingerprint is that of its
    settings now, or `null`. */
type AnalysisKey =
  | { readonly kind: "locked"; readonly reason: string }
  | { readonly kind: "keyed"; readonly key: Key; readonly check: Check | null };

/** The verdict of the same numbers, one object for every state. */
const SAME: CheckVerdict = { kind: "same" };

/** The notice as the store keeps it: the requests it names are kept by
    their ids, since an analysis may have more than one in flight. */
interface NoticeKept {
  readonly cause: Notice["cause"];
  /** The analyses removed, in the order of the definitions. */
  readonly removed: readonly AnalysisId[];
  /** The ids of the requests it left behind. */
  readonly runs: ReadonlySet<number>;
  /** The analyses whose calculations it stopped at once, in the order of
      the definitions. */
  readonly stopped: readonly AnalysisId[];
}

/** The keys of the analyses, and the project and version they were made
    for. */
interface Keyed {
  readonly project: Project;
  readonly popneiVersion: string | null;
  readonly keys: readonly AnalysisKey[];
}

/** A request in flight, as the store keeps it. */
interface InFlight<J, R> {
  /** The id of the request. */
  readonly runId: number;
  /** The definition whose `run` made it, and its place in the list. */
  readonly def: AnalysisDef<J, R>;
  readonly index: number;
  /** The key it was sent under. */
  readonly key: Key;
  /** The project it was made from, which its warnings are made from. */
  readonly project: Project;
  /** The load id of the variants file of that project, which the number
      of variants its pass counted is recorded into. */
  readonly fileId: string;
  /** Its handle, to stop it. */
  readonly handle: Run<R>;
  readonly progress: Progress | null;
  readonly stopping: boolean;
  readonly afterStop: boolean;
}

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
  /** The requests in flight by their id, in the order they started. */
  const requests = new Map<number, InFlight<J, R>>();
  /** popnei's refusals, kept for the session. */
  const refusals = new Map<Key, AnalysisError>();
  /** The other failures, kept until the next change of the user. */
  const failures = new Map<Key, AnalysisError>();
  /** What the last change removed and left behind, or `null`. */
  let notice: NoticeKept | null = null;
  /** Whether a calculation was stopped since the calculation worker was
      last ready and nothing ended done or failed since: the next request
      may wait for the worker to start again. */
  let stopIssued = false;

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

  const keysOf = (
    p: Project,
    version: string | null,
  ): readonly AnalysisKey[] => {
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
      if (version === null) {
        throw defect(
          `the analysis ${JSON.stringify(def.id)} can run before the calculation worker gave the version of popnei, which its key needs.`,
        );
      }
      const saved =
        p.reference?.checks.find((c) => c.analysis === def.id) ?? null;
      const check =
        saved !== null &&
        p.variants !== null &&
        settingsFingerprint(def, p, p.variants.readOptions, memo) ===
          saved.settings
          ? saved
          : null;
      return {
        kind: "keyed",
        key: keyOf(def, p, version, memo),
        check,
      };
    });
  };

  /** The keys of `project` under `version`, made again only when one of
      the two changed since the last keys made; the results of the new
      keys are used in the cache, so that those on screen are the last
      dropped. A change makes the keys of its new project and version
      with this before it changes anything, so that a defect while they
      are made leaves the store as it was. */
  const keysFor = (
    project: Project,
    version: string | null,
  ): readonly AnalysisKey[] => {
    if (keyed?.project === project && keyed.popneiVersion === version) {
      return keyed.keys;
    }
    const keys = keysOf(project, version);
    keyed = { project, popneiVersion: version, keys };
    cache = use(
      cache,
      keys.flatMap((k) => (k.kind === "keyed" ? [k.key] : [])),
    );
    return keys;
  };

  /** The keys of the current project and version. */
  const currentKeys = (): readonly AnalysisKey[] =>
    keysFor(history.present.project, popneiVersion);

  /** The comparison of the numbers of a result of `def` with the check
      numbers `check` saved for its settings, or `null` when there are
      none: exact, a list of another length differing. */
  const verdictOf = (
    def: AnalysisDef<J, R>,
    check: Check | null,
    numbers: readonly (number | null)[],
  ): CheckVerdict | null => {
    const reference = history.present.project.reference;
    if (check === null || reference === null) {
      return null;
    }
    if (
      numbers.length === check.numbers.length &&
      numbers.every((n, index) => n === check.numbers[index])
    ) {
      return SAME;
    }
    const now = popneiVersion ?? "";
    return {
      kind: "differs",
      popnei:
        reference.popneiVersion === now
          ? null
          : { saved: reference.popneiVersion, now },
      app:
        check.keyVersion === def.keyVersion
          ? null
          : { saved: reference.appVersion, now: config.appVersion },
    };
  };

  /** The state of an analysis that can run, under its key `key`: the
      first of done, running, error and ready. A result in the cache
      under `key` is of this analysis, since the key holds its id. */
  const statusOf = (
    def: AnalysisDef<J, R>,
    keyed: { readonly key: Key; readonly check: Check | null },
  ): AnalysisStatus<R> => {
    const id = def.id;
    const key = keyed.key;
    const cached = get(cache, key);
    if (cached !== null) {
      return {
        kind: "done",
        key,
        result: cached.result,
        warnings: cached.warnings,
        check: verdictOf(def, keyed.check, cached.numbers),
      };
    }
    let running: InFlight<J, R> | null = null;
    for (const request of requests.values()) {
      if (request.def.id === id && request.key === key && !request.stopping) {
        running = request;
      }
    }
    if (running !== null) {
      return {
        kind: "running",
        key,
        runId: running.runId,
        progress: running.progress,
      };
    }
    const error = refusals.get(key) ?? failures.get(key);
    if (error !== undefined) {
      return { kind: "error", key, error };
    }
    return notice?.removed.includes(id) === true
      ? { kind: "removed", key }
      : { kind: "ready", key };
  };

  /** Whether the current project gives the request its key. */
  const isCurrent = (
    request: InFlight<J, R>,
    keys: readonly AnalysisKey[],
  ): boolean => {
    const current = keys[request.index];
    return current?.kind === "keyed" && current.key === request.key;
  };

  /** Whether the analysis at `index` is done under the current keys. */
  const isDone = (index: number, keys: readonly AnalysisKey[]): boolean => {
    const current = keys[index];
    return current?.kind === "keyed" && get(cache, current.key) !== null;
  };

  /** The requests in flight, not being stopped, whose key the current
      project does not give: the calculations left behind. */
  const leftBehindNow = (keys: readonly AnalysisKey[]): Set<number> =>
    new Set(
      [...requests.values()]
        .filter((request) => !request.stopping && !isCurrent(request, keys))
        .map((request) => request.runId),
    );

  /** Stops a request: marks it and calls the `cancel()` of its handle. */
  const stop = (request: InFlight<J, R>): void => {
    requests.set(request.runId, { ...request, stopping: true });
    stopIssued = true;
    request.handle.cancel();
  };

  /** Stops each request of `runIds` still in flight and not being
      stopped; whether it stopped any. */
  const stopAll = (runIds: Iterable<number>): boolean => {
    let stopped = false;
    for (const runId of [...runIds]) {
      const request = requests.get(runId);
      if (request !== undefined && !request.stopping) {
        stop(request);
        stopped = true;
      }
    }
    return stopped;
  };

  /** Takes out of the notice an analysis done again, and a request that
      ended, is being stopped, or whose key the project gives again; drops
      the notice when nothing is left in it. */
  const settle = (): void => {
    if (notice === null) {
      return;
    }
    const keys = currentKeys();
    const removed = notice.removed.filter(
      (id) =>
        !isDone(
          defs.findIndex((def) => def.id === id),
          keys,
        ),
    );
    const behind = leftBehindNow(keys);
    const runs = new Set([...notice.runs].filter((runId) => behind.has(runId)));
    if (
      removed.length === 0 &&
      runs.size === 0 &&
      notice.stopped.length === 0
    ) {
      notice = null;
    } else if (
      removed.length !== notice.removed.length ||
      runs.size !== notice.runs.size
    ) {
      notice = { cause: notice.cause, removed, runs, stopped: notice.stopped };
    }
  };

  /** The notice the screens read, `previous` itself when it did not
      change. */
  const noticeOf = (previous: Notice | null): Notice | null => {
    if (notice === null) {
      return null;
    }
    const named = new Set(
      [...notice.runs].flatMap((runId) => {
        const request = requests.get(runId);
        return request === undefined ? [] : [request.def.id];
      }),
    );
    const leftBehind = defs.map((def) => def.id).filter((id) => named.has(id));
    return previous?.cause === notice.cause &&
      sameIds(previous.removed, notice.removed) &&
      sameIds(previous.leftBehind, leftBehind) &&
      sameIds(previous.stopped, notice.stopped)
      ? previous
      : {
          cause: notice.cause,
          removed: notice.removed,
          leftBehind,
          stopped: notice.stopped,
        };
  };

  /** The calculations in flight, reusing each view of `previous` that did
      not change, and `previous` itself when none did. */
  const runsOf = (
    keys: readonly AnalysisKey[],
    previous: readonly RunView[] | null,
  ): readonly RunView[] => {
    const views = [...requests.values()].map((request, index): RunView => {
      const current = keys[request.index];
      const view: RunView = {
        runId: request.runId,
        analysis: request.def.id,
        key: request.key,
        current: current?.kind === "keyed" && current.key === request.key,
        stopping: request.stopping,
        afterStop: request.afterStop,
        progress: request.progress,
      };
      const before = previous?.[index];
      return before !== undefined && sameRun(before, view) ? before : view;
    });
    return previous?.length === views.length &&
      views.every((view, index) => view === previous[index])
      ? previous
      : views;
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
          : statusOf(def, key);
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
    const runs = runsOf(keys, previous?.runs ?? null);
    const shownNotice = noticeOf(previous?.notice ?? null);
    const project = history.present.project;
    const undoText =
      history.past.length > 0 ? history.present.description : null;
    const redoText = history.future[0]?.description ?? null;
    if (
      previous?.project === project &&
      previous.undo === undoText &&
      previous.redo === redoText &&
      previous.popneiVersion === popneiVersion &&
      previous.analyses === analyses &&
      previous.runs === runs &&
      previous.notice === shownNotice
    ) {
      return previous;
    }
    return {
      project,
      undo: undoText,
      redo: redoText,
      popneiVersion,
      analyses,
      runs,
      notice: shownNotice,
    };
  };

  let state = stateOf(null);

  /** Makes the state again and, when it changed, calls each listener,
      all of them also when one throws; then throws the first error. */
  const changed = (): void => {
    settle();
    const next = stateOf(state);
    if (next === state) {
      return;
    }
    state = next;
    const thrown: unknown[] = [];
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch (error) {
        // Kept and thrown after the loop, so that every screen is told.
        thrown.push(error);
      }
    }
    if (thrown.length > 0) {
      throw thrown[0];
    }
  };

  /** Calls `changed` after `error` was thrown, and throws `error`, not
      what a listener may throw then. */
  const changedAfter = (error: unknown): never => {
    try {
      changed();
    } catch {
      // The first error is the one the caller needs; a listener's error
      // after it would hide it.
    }
    throw error;
  };

  /** Takes `next`, the history after a read was recorded, and tells the
      screens when it is not the one there was. */
  const moved = (next: History): void => {
    if (next !== history) {
      keysFor(next.present.project, popneiVersion);
      history = next;
      stopOrphans();
      changed();
    }
  };

  /** Stops at once every request in flight whose key the project no
      longer gives and that no notice names: a read left it behind, and
      no undo gives its key back. */
  const stopOrphans = (): void => {
    const named = notice?.runs ?? new Set<number>();
    stopAll(
      [...leftBehindNow(currentKeys())].filter((runId) => !named.has(runId)),
    );
  };

  /**
   * Takes `next`, the history after a command, an undo or a redo, when it
   * is not the one there was: forgets the failures that are not popnei's;
   * when the change changed the load of the variants file, stops every
   * calculation in flight, and otherwise the calculations the notice
   * named whose key the new project still does not give; and makes the
   * notice of this change, `cause`, with the analyses that were done and
   * are not, the calculations it leaves behind and those it stopped at
   * once; none when it has none of the three.
   */
  const changedByUser = (
    next: History,
    cause: (before: History, after: History) => Notice["cause"],
  ): void => {
    if (next === history) {
      return;
    }
    const keys = keysFor(next.present.project, popneiVersion);
    const before = history;
    const doneBefore = new Set(
      state.analyses
        .filter((view) => view.status.kind === "done")
        .map((view) => view.id),
    );
    failures.clear();
    history = next;
    let stopped: readonly AnalysisId[] = [];
    if (
      !sameLoad(before.present.project.variants, next.present.project.variants)
    ) {
      // The calculation worker is started again for the new load, so no
      // calculation of the old one can wait for an undo.
      const inFlight = [...requests.values()].filter((r) => !r.stopping);
      const named = new Set(inFlight.map((r) => r.def.id));
      stopped = defs.map((def) => def.id).filter((id) => named.has(id));
      stopAll(inFlight.map((r) => r.runId));
    } else if (notice !== null) {
      const behind = leftBehindNow(keys);
      stopAll([...notice.runs].filter((runId) => behind.has(runId)));
    }
    const removed = defs
      .filter((def, index) => doneBefore.has(def.id) && !isDone(index, keys))
      .map((def) => def.id);
    const runs = leftBehindNow(keys);
    notice =
      removed.length === 0 && runs.size === 0 && stopped.length === 0
        ? null
        : { cause: cause(before, next), removed, runs, stopped };
    changed();
  };

  /** Stops every calculation in flight and drops the notice, for a
      change after which no undo gives their keys back. */
  const stopEverything = (): void => {
    stopAll(requests.keys());
    notice = null;
  };

  /** The definition of `id` and its place, or a defect. */
  const defOf = (
    id: AnalysisId,
    caller: string,
  ): { readonly def: AnalysisDef<J, R>; readonly index: number } => {
    const index = defs.findIndex((def) => def.id === id);
    const def = defs[index];
    if (def === undefined) {
      throw defect(
        `${caller} was given the analysis ${JSON.stringify(id)}, which no definition has.`,
      );
    }
    return { def, index };
  };

  /** The progress of the request `runId`, passed over when the request
      is no longer in flight. */
  const progressed = (runId: number, progress: Progress): void => {
    const request = requests.get(runId);
    if (request !== undefined) {
      requests.set(runId, { ...request, progress });
      changed();
    }
  };

  /** What an outcome leaves in the store: the result in the cache with
      its warnings and its number of variants recorded, or the failure
      kept. */
  const ended = (request: InFlight<J, R>, outcome: Outcome<R>): void => {
    switch (outcome.kind) {
      case "done": {
        const key = keyFromWire(outcome.key);
        if (key !== request.key) {
          throw defect(
            `the request ${String(request.runId)} of the analysis ${JSON.stringify(request.def.id)} was sent under the key ${request.key} and came back under ${key}.`,
          );
        }
        // Everything that can throw comes before anything is kept.
        const warnings = request.def.warnings(outcome.result, request.project);
        const numbers = request.def.checkNumbers(outcome.result);
        const numVars = config.numVarsOf(outcome.result);
        const next =
          numVars === null
            ? history
            : recordShared<VariantSource>(
                history,
                (p) => p.variants,
                (p, variants) => ({ ...p, variants }),
                (p) => recordVariantsCounted(p, request.fileId, numVars),
              );
        keysFor(next.present.project, popneiVersion);
        const shown = new Set(
          currentKeys().flatMap((k) => (k.kind === "keyed" ? [k.key] : [])),
        );
        cache = put(
          cache,
          key,
          { result: outcome.result, warnings, numbers },
          shown,
        );
        if (next !== history) {
          history = next;
          stopOrphans();
        }
        return;
      }
      case "failed":
        if (outcome.error.kind === "popnei") {
          refusals.set(request.key, {
            kind: "refused",
            message: outcome.error.message,
          });
        } else {
          failures.set(request.key, { kind: "failed", error: outcome.error });
        }
        return;
      case "cancelled":
        return;
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
      changedByUser(commit(history, freezeProject(next), description), () => ({
        kind: "command",
        description,
      }));
    },
    undo: () => {
      changedByUser(undo(history), (before) => ({
        kind: "undo",
        description: before.present.description,
      }));
    },
    redo: () => {
      changedByUser(redo(history), (_before, after) => ({
        kind: "redo",
        description: after.present.description,
      }));
    },
    open: (p) => {
      const opened = startHistory(freezeProject(p), history.maxSteps);
      keysFor(opened.present.project, popneiVersion);
      stopEverything();
      failures.clear();
      history = opened;
      changed();
    },
    dismissNotice: () => {
      if (notice === null) {
        return;
      }
      stopAll(notice.runs);
      notice = null;
      changed();
    },
    startRun: (id) => {
      const { def, index } = defOf(id, "startRun");
      const current = currentKeys()[index];
      const status =
        current?.kind === "keyed" ? statusOf(def, current) : undefined;
      if (
        status === undefined ||
        !(
          status.kind === "ready" ||
          status.kind === "removed" ||
          (status.kind === "error" && status.error.kind === "failed")
        )
      ) {
        return null;
      }
      const key = status.key;
      const project = history.present.project;
      const version = popneiVersion;
      const fileId = project.variants?.fileId;
      if (version === null || fileId === undefined) {
        throw defect(
          `the analysis ${JSON.stringify(id)} has a key with no version of popnei or no variants file.`,
        );
      }
      const sending: { handle: Run<R> | null; afterStop: boolean } = {
        handle: null,
        afterStop: false,
      };
      const client: WorkerClient<J, R> = {
        run: (job) => {
          if (sending.handle !== null) {
            throw defect(
              `the analysis ${JSON.stringify(id)} sent a second request from one run.`,
            );
          }
          // The calculations left behind are stopped before the new
          // request is sent, so that it does not wait behind them.
          stopAll(leftBehindNow(currentKeys()));
          sending.afterStop = stopIssued;
          // A progress given before `send` returns has no request to go
          // to, and is passed over.
          const sent = config.send(key, job, (progress) => {
            if (sending.handle !== null) {
              progressed(sending.handle.id, progress);
            }
          });
          sending.handle = sent;
          return sent;
        },
        intermediateKey: (name, inputs) =>
          intermediateKeyOf(def, project, version, name, inputs, memo),
      };
      let handle: Run<R>;
      try {
        handle = def.run(project, client);
      } catch (error) {
        // Nothing is recorded yet; what the analysis sent is stopped, so
        // that no calculation runs that the store does not know.
        sending.handle?.cancel();
        // The calculations it stopped before sending stay stopped.
        return changedAfter(error);
      }
      if (handle !== sending.handle || requests.has(handle.id)) {
        sending.handle?.cancel();
        return changedAfter(
          defect(
            `the run of the analysis ${JSON.stringify(id)} gave a handle its client did not give, or of a request already in flight.`,
          ),
        );
      }
      failures.delete(key);
      requests.set(handle.id, {
        runId: handle.id,
        def,
        index,
        key,
        project,
        fileId,
        handle,
        progress: null,
        stopping: false,
        afterStop: sending.afterStop,
      });
      try {
        changed();
      } catch (error) {
        // src/ui/runs.ts will never receive the handle, nor give its
        // outcome: the request is taken out and stopped.
        requests.delete(handle.id);
        handle.cancel();
        return changedAfter(error);
      }
      return handle;
    },
    cancelRun: (id) => {
      const { index } = defOf(id, "cancelRun");
      const current = currentKeys()[index];
      for (const request of requests.values()) {
        if (
          request.index === index &&
          current?.kind === "keyed" &&
          request.key === current.key &&
          !request.stopping
        ) {
          stop(request);
          changed();
          return;
        }
      }
    },
    popneiReady: (version) => {
      if (version === popneiVersion) {
        // The worker started again, after a stop or a crash.
        stopIssued = false;
        return;
      }
      keysFor(history.present.project, version);
      stopIssued = false;
      // Another version changes every key, and no undo gives the old one
      // back.
      if (popneiVersion !== null) {
        stopEverything();
      }
      popneiVersion = version;
      changed();
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
    runEnded: (runId, outcome) => {
      const request = requests.get(runId);
      if (request === undefined) {
        throw defect(
          `runEnded was given the request ${String(runId)}, which is not in flight.`,
        );
      }
      // Out of those in flight before anything can throw, so that a
      // defect does not leave the analysis shown running for ever.
      requests.delete(runId);
      if (outcome.kind !== "cancelled") {
        // Answered by a worker past any stop issued before.
        stopIssued = false;
      }
      try {
        ended(request, outcome);
      } catch (error) {
        // A defect of our code, which the analysis shows until the next
        // change, rather than ready with nothing said.
        failures.set(request.key, {
          kind: "failed",
          error: {
            kind: "defect",
            message: error instanceof Error ? error.message : String(error),
          },
        });
        changedAfter(error);
      }
      changed();
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

/** Whether two variants files are the same load: the same load id, or
    no file in both. Other read options come today only with a new load
    id, since `loadVariants` refuses them under the id already there;
    they are compared as well so that a way of changing them under the
    same id, which stage 3 may find for the ploidy, is still a change of
    the load (the store spec). */
function sameLoad(a: VariantSource | null, b: VariantSource | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  const x = a.readOptions;
  const y = b.readOptions;
  return (
    a.fileId === b.fileId &&
    (x === null || y === null
      ? x === y
      : x.ploidy === y.ploidy && x.onlyPassed === y.onlyPassed)
  );
}

/** Whether two views of a calculation in flight show the same. */
function sameRun(a: RunView, b: RunView): boolean {
  return (
    a.runId === b.runId &&
    a.analysis === b.analysis &&
    a.key === b.key &&
    a.current === b.current &&
    a.stopping === b.stopping &&
    a.afterStop === b.afterStop &&
    a.progress === b.progress
  );
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
        sameVerdict(a.check, b.check)
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

/** Whether two comparisons with the check numbers say the same. */
function sameVerdict(a: CheckVerdict | null, b: CheckVerdict | null): boolean {
  if (a === null || b === null || a.kind === "same" || b.kind === "same") {
    return a === b || (a?.kind === "same" && b?.kind === "same");
  }
  const sameVersions = (
    x: { readonly saved: string; readonly now: string } | null,
    y: { readonly saved: string; readonly now: string } | null,
  ): boolean =>
    x === y ||
    (x !== null && y !== null && x.saved === y.saved && x.now === y.now);
  return sameVersions(a.popnei, b.popnei) && sameVersions(a.app, b.app);
}

/** Whether two lists of analyses are the same, in the same order. */
function sameIds(a: readonly AnalysisId[], b: readonly AnalysisId[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}
