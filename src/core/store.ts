/**
 * The store, the one object of core that changes: it holds the history of
 * the projects, the cache of the results, the version of popnei, the
 * calculations in flight and the file of the filtered variants written
 * until it is saved, and gives the screens the state of each analysis and
 * of the writing (docs/specs/core/store.md). The screens change it with
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
  settingsAsSaved,
  writeKeyOf,
} from "./keys.ts";
import type { JsonObject, JsonValue, Key, WriteFormat } from "./keys.ts";
import { individualsKept, keptNoneReason } from "./individualsKept.ts";
import type { IndividualStats, IndividualsKept } from "./individualsKept.ts";
import {
  freezeProject,
  individualListNeeds,
  jobFilters,
  projectNeeds,
  recordIndividualsRead,
  recordVariantsCounted,
  recordVariantsRead,
  variantFilterNeeds,
} from "./project.ts";
import { filtersApplied } from "./filtersApplied.ts";
import type {
  AnalysisId,
  AppId,
  Check,
  IndividualsReadGiven,
  IndividualsSource,
  Project,
  SourceRead,
  VariantSource,
} from "./project.ts";
import type { Result } from "./result.ts";
import { messageOf } from "./thrown.ts";
import type {
  CsvOptions,
  Outcome,
  PassStats,
  Progress,
  Run,
  RunError,
  WriteJob,
  Written,
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
      filters, all of it. It answers for any project and reads nothing of
      `p.variants` but through `filtersApplied`, whether its variants
      record their FILTER; so the key stays across the read of the file
      only while that answer is the same (docs/specs/core/keys.md). */
  keyInputs(p: Project): JsonValue;
  /** The reason it cannot run beyond what every analysis needs, in the
      words the screen shows next to its Run button, or `null`. */
  needs(p: Project): string | null;
  /** The reason it cannot run for the individuals kept, `kept`, whose
      list is known and keeps some individual, in the words beside its
      Run, or `null`; absent for an analysis with none. The diversity's:
      the list leaves no population, or, from stage 5, its largest
      population holds fewer chromosomes than the draw of its
      rarefaction while some population has the minimum of individuals;
      the PCoA's: it keeps more than 9,381 individuals; from stage 5, the
      distances between populations': no population, or fewer than two
      with the minimum of individuals; the LD decay's: no population. The
      reason of no population is `populationsKeptNeeds` of
      populations.ts, shared (store.md, "The state of an analysis"). */
  readonly keptNeeds?: (p: Project, kept: IndividualsKept) => string | null;
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
  /** How many numbers `checkNumbers` gives for a result of the project
      `p`, whose variants file is read, or `null` when the project does
      not fix it. Unlike `keyInputs`, it reads `p.variants` whole. The project
      file refuses, at the opening, a check of another count; the store
      does not call it. */
  numCheckNumbers(p: Project): number | null;
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
  /** The individuals the filters keep, in the order of the variants file,
      for the job; `null` when they remove nobody, and for an analysis
      that does not read the filters of individuals. */
  readonly individuals: readonly string[] | null;
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
 * drawn again. `F` is the type of a written file, a `Blob` on the page,
 * which core holds and never reads.
 */
export interface AppState<R, F = never> {
  /** The current project. */
  readonly project: Project;
  /** The description of what an undo would undo, "the MAF filter
      changed", or `null` when there is nothing to undo. */
  readonly undo: string | null;
  /** The description of what a redo would redo, or `null`. */
  readonly redo: string | null;
  /** The undos, redos and openings so far, 0 when the store is made:
      a screen that holds text of its own beside a part of the project
      starts again at the project when it changes, since a command
      cannot be told from an undo by the project alone. */
  readonly historyMoves: number;
  /** The version of popnei the calculation worker gave, or `null` until
      it has started. */
  readonly popneiVersion: string | null;
  /** The state of each analysis, in the order of the definitions. */
  readonly analyses: readonly AnalysisView<R>[];
  /** The calculations in flight. */
  readonly runs: readonly RunView[];
  /** What the last change removed or will stop, or `null`. */
  readonly notice: Notice | null;
  /** The individuals the filters keep, and how many each filter of
      individuals was given and kept; `null` when `projectNeeds` or
      `individualListNeeds` gives a reason. */
  readonly individualsKept: IndividualsKept | null;
  /** The writing of the filtered variants as a `.nei` file; `null` when
      the store was made with no `write`. */
  readonly write: WriteStatus<F> | null;
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
  /** It cannot run: `projectNeeds`, `individualListNeeds` for an
      analysis that reads the filters of individuals, or its `needs` gave
      `reason`; or it reads the filters of individuals and they keep
      none, `keptNoneReason`, or its `keptNeeds` gives a reason for the
      individuals they keep. */
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
  /** A calculation of its key is in flight and is not being stopped, or
      a Run of its key waits for the statistics of each individual,
      `waitsForStatistics`, and `runId` and `progress` are then those of
      the request of the statistics; `progress`, popnei's four numbers of
      the pass as the worker gave them, is `null` until the worker gives
      one; `soFar`, the last result so far the worker gave of the run,
      over the variants read so far, is `null` until the first, at every
      new run, while it waits for the statistics, and throughout for an
      analysis whose calculation gives none. A result so far is never
      cached, and has no warnings and no check numbers. */
  | {
      readonly kind: "running";
      readonly key: Key;
      readonly runId: number;
      readonly progress: Progress | null;
      readonly waitsForStatistics: boolean;
      readonly soFar: R | null;
    }
  /** popnei refused the calculation of its key, or the calculation
      failed and no change has left its key behind since; or,
      `ofStatistics`, it reads the filters of individuals and the
      statistics of each individual its Run would wait for were refused,
      or failed and no change has left their key behind since,
      and `waited` when a Run of it under its key waited for them when
      they failed, false when its Run was not pressed (stop C 4 of
      docs/specs/stage-4-open-points.md); `waited` is false without
      `ofStatistics`. */
  | {
      readonly kind: "error";
      readonly key: Key;
      readonly error: AnalysisError;
      readonly ofStatistics: boolean;
      readonly waited: boolean;
    }
  /** The current notice lists it among the results removed; it can run
      again. */
  | { readonly kind: "removed"; readonly key: Key }
  /** None of the above: it can run. `stopped` holds the last result so
      far of a calculation the user stopped under this key, which the
      screen shows as what was read before the Stop, until a Run of the
      analysis, a change of the load of the variants file, an opening or
      a failure under the key forgets it; `null` when there is none, or
      the calculation stopped had given none. Like a result so far, it is
      never cached and has no warnings and no check numbers. */
  | {
      readonly kind: "ready";
      readonly key: Key;
      readonly stopped: { readonly soFar: R } | null;
    };

/** The writing of the filtered variants, the first of these whose
    condition holds (the store spec, "The writing of the filtered
    variants"). */
export type WriteStatus<F> =
  /** It cannot run: `projectNeeds` or `individualListNeeds` gave
      `reason`, or the filters keep no individual, `keptNoneReason`. */
  | { readonly kind: "locked"; readonly reason: string }
  /** A write of its key ended with at least one variant while the project
      gave that key, and the file has not been handed to the browser. */
  | { readonly kind: "done"; readonly key: Key; readonly written: Written<F> }
  /** The file of `done` was handed to the browser to save; the store no
      longer holds it. */
  | {
      readonly kind: "saved";
      readonly key: Key;
      readonly written: Omit<Written<F>, "file">;
    }
  /** A write of its key ended with no variant, and no file is kept, since
      nobody can save it. */
  | {
      readonly kind: "noVariant";
      readonly key: Key;
      readonly written: Omit<Written<F>, "file">;
    }
  /** A write of its key is in flight and is not being stopped, or it
      waits for the statistics of each individual, `waitsForStatistics`,
      and `runId` and `progress` are then those of their request. */
  | {
      readonly kind: "running";
      readonly key: Key;
      readonly runId: number;
      readonly progress: Progress | null;
      readonly waitsForStatistics: boolean;
    }
  /** popnei refused the write of its key, or it failed and no change
      has left its key behind since; or, `ofStatistics`, the statistics
      it would wait for were refused, or failed and no change has left
      their key behind since. */
  | {
      readonly kind: "error";
      readonly key: Key;
      readonly error: AnalysisError;
      readonly ofStatistics: boolean;
    }
  /** None of the above: it can be written; `dropped` when the last write
      before ended after a change of its filters and its file was not
      kept, until the next change of the project. */
  | { readonly kind: "ready"; readonly key: Key; readonly dropped: boolean };

/** Why the calculation of an analysis gave no result; `WriteStatus`
    gives the same for the writing of the filtered variants. */
export type AnalysisError =
  /** popnei refused it, with its message; kept for the session. */
  | { readonly kind: "refused"; readonly message: string }
  /** It failed otherwise, never popnei's refusal, which is `refused`;
      kept until a change after which the project no longer gives its
      key, or an opening, but for `reopenFailed`,
      the variants file the browser could not read again, which lasts
      until the load of the variants file changes. */
  | {
      readonly kind: "failed";
      readonly error: Exclude<RunError, { readonly kind: "popnei" }>;
    };

/** A calculation in flight. */
export interface RunView {
  /** The id of its request. */
  readonly runId: number;
  /** The analysis it calculates; `null` for the writing of a file. */
  readonly analysis: AnalysisId | null;
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
  /** The writing of the file will be stopped unless the change is
      undone. */
  readonly writeLeftBehind: boolean;
  /** The writing of the file was stopped at once by a change of the load
      of the variants file; kept and cleared as `stopped` is. */
  readonly writeStopped: boolean;
  /** A file written and not saved was forgotten by the change, and no
      undo brings it back; kept and cleared as `removed` is. */
  readonly writeDiscarded: boolean;
}

/** What the entry of the page makes the store with. `F` is the type of a
    written file, a `Blob` on the page. */
export interface StoreConfig<J, R, F = never> {
  /** The first project of the page. */
  readonly first: Project;
  /** The definitions of the analyses of the application, in the order
      the screens show them, each of its own id. */
  readonly analyses: readonly AnalysisDef<J, R>[];
  /** The function of the worker client that sends a request under a
      key, `Client.run`, which gives `onSoFar` each result so far of the
      request while it runs. */
  readonly send: (
    key: string,
    job: J,
    onProgress: (p: Progress) => void,
    onSoFar: (r: R) => void,
  ) => Run<R>;
  /** What the pass of a result counted: the number of variants of the
      file, recorded into the variants file of the request's load, and
      the counts of its filters as a result of the analysis `counts`
      (docs/specs/core/store.md, "What each filter kept"). */
  readonly countsOf: (r: R) => PassFound<R>;
  /** The id of the analysis whose results `countsOf` makes,
      "filterCounts"; `null` when the store has none, and then the counts
      `countsOf` gives are not kept. */
  readonly counts: AnalysisId | null;
  /** The analysis of the statistics of each individual,
      "individualChecks", and how its numbers are found in its result;
      `null` when the store has none. */
  readonly statistics: {
    readonly analysis: AnalysisId;
    of(r: R): IndividualStats;
  } | null;
  /** How a file of the filtered variants is written; `null` when the
      application writes none. */
  readonly write: {
    /** The function of the worker client that sends a write under a key,
        `Client.write`. */
    readonly send: (
      key: string,
      job: WriteJob,
      onProgress: (p: Progress) => void,
    ) => Run<Written<F>>;
    /** The result of the analysis `counts` made of the counts of the pass
        of a written file, which always had the filters of the variants of
        its project. */
    readonly countsOf: (pass: PassStats) => R;
  } | null;
  /** The version of the application. */
  readonly appVersion: string;
  /** The bound of the cache in bytes, `CACHE_MAX_BYTES`. */
  readonly cacheMaxBytes: number;
  /** The steps of undo kept, `MAX_UNDO_STEPS`. */
  readonly maxUndoSteps: number;
}

/** What the store takes from the pass of a result. */
export interface PassFound<R> {
  /** The variants of the file, which the first filter of the pass was
      given, or the variants of the pass when it had no filter; `null`
      when the result has none. */
  readonly numVarsRead: number | null;
  /** The counts of its filters, as a result of the analysis `counts`,
      when the pass had the filters of the variants of its request's
      project; `null` otherwise. */
  readonly counts: R | null;
}

/** The store of one page. */
export interface Store<R, F = never> {
  /** The current state, the same object until something changes. */
  getState(): AppState<R, F>;
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
      error after a failure that is not popnei's nor a variants file that
      could not be read again, after stopping every calculation left
      behind, and takes the analysis out of the notice's `stopped`; null,
      and nothing done, in any other state. Gives the handles it sent:
      the analysis's request, or that of the statistics of each
      individual it waits for, or none when it waits for statistics
      already in flight. */
  startRun(id: AnalysisId): readonly Run<R | Written<F>>[] | null;
  /** Stops the calculation in flight of an analysis, or its wait for the
      statistics, if there is one; the last result so far of the
      calculation stays, as `stopped` of the state `ready` of its key,
      and one that arrives after the Stop is passed over. */
  cancelRun(id: AnalysisId): void;
  /** Starts the writing of the filtered variants in `format`, in the
      states and with the handles of `startRun`: in `ready` or `saved`, or
      in `error` after a failure that is not popnei's nor a variants file
      that could not be read again, of the write or of the statistics it
      waited for; null, and nothing done, in any other state, and in all
      of them when the store was made with no `write`. */
  startWrite(format: WriteFormat): readonly Run<R | Written<F>>[] | null;
  /** Stops the writing in flight of the key the project gives, or its
      wait for the statistics, if there is one. */
  cancelWrite(): void;
  /** The page has handed the file of `write`, `done`, to the browser to
      save: the store forgets the file, and `write` is `saved`. A defect
      in any other state. */
  writeSaved(): void;

  /** The calculation worker has started, with popnei of `version`. */
  popneiReady(version: string): void;
  /** What the calculation worker read of the variants file of the load
      `fileId`, recorded into every project of the history that holds it
      pending. */
  variantsRead(fileId: string, read: SourceRead): void;
  /** What the light worker read of the individuals file of the load
      `fileId` with the options `csv`, recorded into every project of the
      history that holds it pending with those options, with the types the
      user set that it allows. */
  individualsRead(
    fileId: string,
    csv: CsvOptions | null,
    read: IndividualsReadGiven,
  ): void;
  /** How the request `runId` ended. Gives the handles it sent because of
      this end: the requests of the Runs that waited for these
      statistics. */
  runEnded(
    runId: number,
    outcome: Outcome<R | Written<F>>,
  ): readonly Run<R | Written<F>>[];
}

/** What the cache keeps under a key: a result with the warnings it
    raised and the numbers its definition's `checkNumbers` gave, and, for
    a result of the analysis of the statistics of each individual, the
    statistics `statistics.of` found in it. */
interface CachedResult<R> {
  readonly result: R;
  readonly warnings: readonly Warning[];
  readonly numbers: readonly (number | null)[];
  readonly stats: IndividualStats | null;
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
  /** The ids of the requests it left behind, of the analyses and of the
      writing. */
  readonly runs: ReadonlySet<number>;
  /** The ids of the Runs waiting for the statistics that it left
      behind, of the analyses and of the writing. */
  readonly waits: ReadonlySet<number>;
  /** The analyses whose calculations it stopped at once, in the order of
      the definitions. */
  readonly stopped: readonly AnalysisId[];
  /** Whether it stopped the writing at once. */
  readonly writeStopped: boolean;
  /** Whether it forgot a file written and not saved. */
  readonly writeDiscarded: boolean;
}

/** The writing of the filtered variants that cannot run, with its
    reason, or its key; `null` when the store has no `write`. */
type WriteKey =
  | { readonly kind: "locked"; readonly reason: string }
  | { readonly kind: "keyed"; readonly key: Key }
  | null;

/** The keys of the analyses and of the writing, and the project and
    version they were made for. */
interface Keyed {
  readonly project: Project;
  readonly popneiVersion: string | null;
  readonly keys: readonly AnalysisKey[];
  readonly write: WriteKey;
}

/** What a request or a Run that waits is for: an analysis, by its
    definition and its place in the list, or the writing of a file. */
type Target<J, R> =
  | {
      readonly kind: "analysis";
      readonly def: AnalysisDef<J, R>;
      readonly index: number;
    }
  | { readonly kind: "write"; readonly format: WriteFormat };

/** A request in flight, as the store keeps it: of an analysis, whose
    outcome is a result, or of the writing, whose outcome is a file. */
interface InFlight<J, R, F> {
  /** The id of the request. */
  readonly runId: number;
  /** What it is for. */
  readonly target: Target<J, R>;
  /** The key it was sent under. */
  readonly key: Key;
  /** The project it was made from, which its warnings are made from. */
  readonly project: Project;
  /** The load id of the variants file of that project, which the number
      of variants its pass counted is recorded into. */
  readonly fileId: string;
  /** The version of popnei its key was made with, which the key of the
      counts of its pass is made with too. */
  readonly popneiVersion: string;
  /** Its handle, to stop it. */
  readonly handle: Run<R> | Run<Written<F>>;
  readonly progress: Progress | null;
  /** The last result so far the worker gave of it, `null` until the
      first, and for the writing. */
  readonly soFar: R | null;
  readonly stopping: boolean;
  readonly afterStop: boolean;
  /** Whether the Run of its own analysis sent it, and not a Run that
      waits for the statistics of each individual: a Stop of such a Run
      does not stop statistics the user asked for. */
  readonly byOwnRun: boolean;
}

/** A Run of an analysis that reads the filters of individuals, or of the
    writing, waiting for the statistics of each individual before it
    sends its request. */
interface Waiting<J, R> {
  /** The id of the wait, of its own count, not that of a request. */
  readonly waitId: number;
  /** The analysis, or the writing, that waits. */
  readonly target: Target<J, R>;
  /** The key of the analysis, or of the writing, when it was asked to
      run. */
  readonly key: Key;
  /** The request of the statistics it waits for, and its key. */
  readonly statsRunId: number;
  readonly statsKey: Key;
}

/** The last write that ended done under the key the project gives the
    writing, and what is kept of it: the file until it is saved, or
    nothing of the file after the save or when it holds no variant. No
    change has given the writing another key since. */
type WrittenKept<F> = Extract<
  WriteStatus<F>,
  { readonly kind: "done" | "saved" | "noVariant" }
>;

/** The format of the file whose state `write` of the state gives: the one
    format of stage 3, which `WriteFormat` is. The VCF comes with a state
    of its own (the store spec). */
const STATE_FORMAT: WriteFormat = "nei";

/**
 * The store of a page, made once by its entry, with the first project,
 * frozen, as the history's only one. Throws a defect when two definitions
 * have one id, when `statistics` names no definition or one that reads
 * any filter, when `counts` names no definition, or when the bounds are
 * not what `startHistory` and `emptyCache` take. The statistics read no
 * filter: the filters of individuals would make them wait for
 * themselves, and the filters of the variants, which count over the
 * individuals they keep, would make them depend on those filters, which
 * the owner decided on 28 September 2026 they do not.
 */
export function createStore<J, R, F = never>(
  config: StoreConfig<J, R, F>,
): Store<R, F> {
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
  const statistics = config.statistics;
  /** The place of the analysis of the statistics of each individual in
      the definitions, -1 when the store has none. */
  const statsIndex =
    statistics === null
      ? -1
      : defs.findIndex((def) => def.id === statistics.analysis);
  if (statistics !== null) {
    const statsDef = defs[statsIndex];
    if (statsDef === undefined) {
      throw defect(
        `createStore was given the analysis of the statistics ${JSON.stringify(statistics.analysis)}, which no definition has.`,
      );
    }
    if (statsDef.filtersRead.individuals) {
      throw defect(
        `the analysis of the statistics ${JSON.stringify(statsDef.id)} reads the filters of individuals, which are set from its result, so it would wait for itself.`,
      );
    }
    if (statsDef.filtersRead.variants) {
      throw defect(
        `the analysis of the statistics ${JSON.stringify(statsDef.id)} reads the filters of the variants; its numbers are over every variant of the file, and the filters of the variants count over the individuals those numbers keep.`,
      );
    }
  }
  const countsId = config.counts;
  /** The place of the analysis of the counts of the filters in the
      definitions, -1 when the store has none. */
  const countsIndex =
    countsId === null ? -1 : defs.findIndex((def) => def.id === countsId);
  const countsDef = countsId === null ? null : defs[countsIndex];
  if (countsDef === undefined) {
    throw defect(
      `createStore was given the analysis of the counts ${JSON.stringify(countsId)}, which no definition has.`,
    );
  }
  const memo = createKeyMemo();
  let history = startHistory(freezeProject(config.first), config.maxUndoSteps);
  // The undos, redos and openings so far.
  let historyMoves = 0;
  let popneiVersion: string | null = null;
  let cache: Cache<CachedResult<R>> = emptyCache(config.cacheMaxBytes);
  let keyed: Keyed | null = null;
  const listeners = new Set<() => void>();
  /** The requests in flight by their id, in the order they started. */
  const requests = new Map<number, InFlight<J, R, F>>();
  /** The Runs waiting for the statistics of each individual, by the id
      of the wait, in the order they started. The request of the
      statistics of each is in flight and not being stopped: a wait ends
      when they are stopped or end. */
  const waits = new Map<number, Waiting<J, R>>();
  /** The id of the last wait. */
  let lastWaitId = 0;
  /** The key of the statistics of each individual that last failed or
      were refused, and the keys of the analyses whose Runs waited for
      them then: those say "was not run", the others "cannot run" (stop
      C 4 of docs/specs/stage-4-open-points.md). */
  let statsWaited: {
    readonly statsKey: Key;
    readonly keys: ReadonlySet<Key>;
  } | null = null;
  /** popnei's refusals, kept for the session. */
  const refusals = new Map<Key, AnalysisError>();
  /** The last result so far of the calculation the user stopped of each
      analysis, by its place, under the key it was stopped under, as the
      state `ready` of that key gives it, the same object. */
  const stoppedSoFar = new Map<
    number,
    { readonly key: Key; readonly stopped: { readonly soFar: R } }
  >();
  /** The other failures, kept until a change of the user after which the
      project gives their key neither to an analysis nor to the writing,
      or an opening. */
  const failures = new Map<Key, AnalysisError>();
  /** What the last change removed and left behind, or `null`. */
  let notice: NoticeKept | null = null;
  /** Whether a calculation was stopped since the calculation worker was
      last ready and nothing ended done or failed since: the next request
      may wait for the worker to start again. */
  let stopIssued = false;
  /** The load id of the variants file a change of the load gave, until a
      read of it is recorded or a request on it ends done or failed: the
      calculation worker opens that file before the next request, and
      `popneiReady` does not clear it, since the worker is ready before
      it opens the file. */
  let reopening: string | null = null;
  /** The variants file the browser could not read again, `reopenFailed`,
      by its load id, until the load changes: every analysis of that load
      that can run shows it, whatever its key, and none starts. */
  let unreadable: {
    readonly fileId: string;
    readonly error: AnalysisError;
  } | null = null;
  /** The last write that ended done under the key the project gives the
      writing, or `null`; forgotten when the project gives another key. */
  let written: WrittenKept<F> | null = null;
  /** Whether the last write ended done after a change of its filters and
      its file was dropped, until the next change of the project. */
  let dropped = false;

  let locks: {
    readonly project: Project;
    readonly reasons: readonly (string | null)[];
    readonly writeReason: string | null;
  } | null = null;

  /** The reason each analysis, and the writing, cannot run, or `null`,
      asked again only when the project changed: a check of the lists of
      individuals walks every individual of the variants file.
      `projectNeeds` is asked first, `individualListNeeds` second, only of
      an analysis that reads the filters of individuals and of the
      writing, `variantFilterNeeds` third, only of an analysis that reads
      the filters of the variants and of the writing, and the `needs` of
      an analysis last. */
  const reasonsOf = (
    p: Project,
  ): {
    readonly reasons: readonly (string | null)[];
    readonly writeReason: string | null;
  } => {
    if (locks?.project === p) {
      return locks;
    }
    const common = projectNeeds(p);
    const listReason =
      common === null ? (individualListNeeds(p)?.reason ?? null) : null;
    const filterReason = common === null ? variantFilterNeeds(p) : null;
    const reasons = defs.map(
      (def) =>
        common ??
        (def.filtersRead.individuals ? listReason : null) ??
        (def.filtersRead.variants ? filterReason : null) ??
        def.needs(p),
    );
    locks = {
      project: p,
      reasons,
      writeReason: common ?? listReason ?? filterReason,
    };
    return locks;
  };

  const keysOf = (
    p: Project,
    version: string | null,
  ): {
    readonly keys: readonly AnalysisKey[];
    readonly write: WriteKey;
  } => {
    const { reasons, writeReason } = reasonsOf(p);
    const keys = defs.map((def, index): AnalysisKey => {
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
      // Compared once the variants file is read, whose keepsPassed picks
      // the fingerprint of the reference; until then it is locked.
      const check =
        saved !== null &&
        p.variants !== null &&
        p.variants.read.kind === "read" &&
        settingsAsSaved(def, p, saved, p.variants, memo)
          ? saved
          : null;
      return {
        kind: "keyed",
        key: keyOf(def, p, version, memo),
        check,
      };
    });
    let write: WriteKey = null;
    if (config.write !== null) {
      if (writeReason !== null) {
        write = { kind: "locked", reason: writeReason };
      } else if (version === null) {
        throw defect(
          "the writing can run before the calculation worker gave the version of popnei, which its key needs.",
        );
      } else {
        write = {
          kind: "keyed",
          key: writeKeyOf(p, STATE_FORMAT, version, memo),
        };
      }
    }
    return { keys, write };
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
    const made = keysOf(project, version);
    keyed = { project, popneiVersion: version, ...made };
    cache = use(
      cache,
      made.keys.flatMap((k) => (k.kind === "keyed" ? [k.key] : [])),
    );
    return made.keys;
  };

  /** The keys made among `keys`, those of the analyses not locked. */
  const keyedIn = (keys: readonly AnalysisKey[]): Set<Key> =>
    new Set(keys.flatMap((k) => (k.kind === "keyed" ? [k.key] : [])));

  /** The keys of the current project and version. */
  const currentKeys = (): readonly AnalysisKey[] =>
    keysFor(history.present.project, popneiVersion);

  /** The key the current project gives the writing, or `null` when it is
      locked or the store has no `write`. */
  const currentWriteKey = (): Key | null => {
    currentKeys();
    const write = keyed?.write ?? null;
    return write?.kind === "keyed" ? write.key : null;
  };

  /** The key the keys `keys` give the statistics of each individual, or
      `null` when the store has no such analysis or it is locked. */
  const statsKeyIn = (keys: readonly AnalysisKey[]): Key | null => {
    const statsKey = keys[statsIndex];
    return statsKey?.kind === "keyed" ? statsKey.key : null;
  };

  let kept: {
    readonly project: Project;
    readonly stats: IndividualStats | null;
    readonly kept: IndividualsKept | null;
  } | null = null;

  /** The individuals the filters of `p` keep, from the statistics the
      cache holds under the key `keys` give them, made again only when the
      project or those statistics changed. */
  const keptFor = (
    p: Project,
    keys: readonly AnalysisKey[],
  ): IndividualsKept | null => {
    const statsKey = statsKeyIn(keys);
    const stats =
      statsKey === null ? null : (get(cache, statsKey)?.stats ?? null);
    if (kept?.project === p && kept.stats === stats) {
      return kept.kept;
    }
    const made = individualsKept(p, stats);
    kept = { project: p, stats, kept: made };
    return made;
  };

  /** The comparison of the numbers of a result of `def` with the check
      numbers `check` saved for its settings, or `null` when there are
      none: exact, a list of another length differing. The versions
      compared are those saved with the check. */
  const verdictOf = (
    def: AnalysisDef<J, R>,
    check: Check | null,
    numbers: readonly (number | null)[],
  ): CheckVerdict | null => {
    if (check === null) {
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
        check.popneiVersion === now
          ? null
          : { saved: check.popneiVersion, now },
      app:
        check.keyVersion === def.keyVersion
          ? null
          : { saved: check.appVersion, now: config.appVersion },
    };
  };

  /** The key the keys `keys` of the current project give `target`, or
      `null` when they lock it. */
  const keyGivenTo = (
    target: Target<J, R>,
    keys: readonly AnalysisKey[],
  ): Key | null => {
    if (target.kind === "write") {
      return currentWriteKey();
    }
    const current = keys[target.index];
    return current?.kind === "keyed" ? current.key : null;
  };

  /** The place of the analysis a request or a wait is for, `null` for the
      writing. */
  const indexOf = (target: Target<J, R>): number | null =>
    target.kind === "analysis" ? target.index : null;

  /** Whether the project, by its keys `keys`, still gives the Run that
      waits `wait` both its key and the key of the statistics it waits
      for. */
  const waitIsCurrent = (
    wait: Waiting<J, R>,
    keys: readonly AnalysisKey[],
  ): boolean =>
    keyGivenTo(wait.target, keys) === wait.key &&
    statsKeyIn(keys) === wait.statsKey;

  /** The failure the statistics a Run would wait for gave, when the list
      of the individuals kept, `keptNow`, needs them: it would wait for
      the same and end the same way. */
  const statsErrorOf = (
    keptNow: IndividualsKept | null,
    keys: readonly AnalysisKey[],
  ): AnalysisError | undefined => {
    const statsKey = statsKeyIn(keys);
    return keptNow?.list.kind === "needsStatistics" && statsKey !== null
      ? (refusals.get(statsKey) ?? failures.get(statsKey))
      : undefined;
  };

  /** The failure kept under `key`: popnei's refusal, a variants file of
      the current load that could not be read again, or another failure
      that no change has left behind since. */
  const errorOf = (key: Key): AnalysisError | undefined =>
    refusals.get(key) ??
    (unreadable !== null &&
    unreadable.fileId === history.present.project.variants?.fileId
      ? unreadable.error
      : undefined) ??
    failures.get(key);

  /** The request in flight, not being stopped, of `index`, an analysis's
      place or `null` for the writing, under `key`. */
  const inFlightFor = (
    index: number | null,
    key: Key,
  ): InFlight<J, R, F> | null => {
    let found: InFlight<J, R, F> | null = null;
    for (const request of requests.values()) {
      if (
        indexOf(request.target) === index &&
        request.key === key &&
        !request.stopping
      ) {
        found = request;
      }
    }
    return found;
  };

  /** The state `running` of a Run of `index`, an analysis's place or
      `null` for the writing, that waits for the statistics under `key`,
      or `null` when none waits. */
  const waitingFor = (
    index: number | null,
    key: Key,
    keys: readonly AnalysisKey[],
  ): {
    readonly kind: "running";
    readonly key: Key;
    readonly runId: number;
    readonly progress: Progress | null;
    readonly waitsForStatistics: true;
  } | null => {
    for (const wait of waits.values()) {
      const statsRequest = requests.get(wait.statsRunId);
      if (
        indexOf(wait.target) === index &&
        waitIsCurrent(wait, keys) &&
        statsRequest !== undefined
      ) {
        return {
          kind: "running",
          key,
          runId: statsRequest.runId,
          progress: statsRequest.progress,
          waitsForStatistics: true,
        };
      }
    }
    return null;
  };

  /** The reason `def` cannot run for the individuals kept, `kept`, from
      its `keptNeeds`, asked only of a list that is known and keeps some
      individual; `null` otherwise. */
  const keptNeedsOf = (
    def: AnalysisDef<J, R>,
    kept: IndividualsKept | null,
  ): string | null => {
    if (
      def.keptNeeds === undefined ||
      kept?.list.kind !== "known" ||
      kept.list.individuals?.length === 0
    ) {
      return null;
    }
    return def.keptNeeds(history.present.project, kept);
  };

  /** The state of an analysis that can run, under its key `keyed`, with
      the individuals the filters keep, `keptNow`, and the keys `keys`:
      the first of done, running, error, locked by the individuals kept,
      removed and ready. A result in the cache under the key is of this
      analysis, since the key holds its id. */
  const statusOf = (
    def: AnalysisDef<J, R>,
    index: number,
    keyed: { readonly key: Key; readonly check: Check | null },
    keptNow: IndividualsKept | null,
    keys: readonly AnalysisKey[],
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
    const running = inFlightFor(index, key);
    if (running !== null) {
      return {
        kind: "running",
        key,
        runId: running.runId,
        progress: running.progress,
        waitsForStatistics: false,
        soFar: running.soFar,
      };
    }
    const waiting = waitingFor(index, key, keys);
    if (waiting !== null) {
      // Its run and progress are those of the statistics, whose results so
      // far are not its own.
      return { ...waiting, soFar: null };
    }
    const error = errorOf(key);
    if (error !== undefined) {
      return { kind: "error", key, error, ofStatistics: false, waited: false };
    }
    if (def.filtersRead.individuals) {
      const statsError = statsErrorOf(keptNow, keys);
      if (statsError !== undefined) {
        return {
          kind: "error",
          key,
          error: statsError,
          ofStatistics: true,
          waited:
            statsWaited !== null &&
            statsWaited.statsKey === statsKeyIn(keys) &&
            statsWaited.keys.has(key),
        };
      }
      const reason =
        keptNoneReason(history.present.project, keptNow) ??
        keptNeedsOf(def, keptNow);
      if (reason !== null) {
        return { kind: "locked", reason };
      }
    }
    if (notice?.removed.includes(id) === true) {
      return { kind: "removed", key };
    }
    const kept = stoppedSoFar.get(index);
    return {
      kind: "ready",
      key,
      stopped: kept?.key === key ? kept.stopped : null,
    };
  };

  /** The state of the writing, from the key the current project gives
      it, `writeKey`, the individuals kept, `keptNow`, and the keys
      `keys`: the first of locked, done, noVariant, saved, running, error
      and ready; `null` when the store has no `write`. */
  const writeStatusOf = (
    writeKey: WriteKey,
    keptNow: IndividualsKept | null,
    keys: readonly AnalysisKey[],
  ): WriteStatus<F> | null => {
    if (writeKey === null) {
      return null;
    }
    if (writeKey.kind === "locked") {
      return { kind: "locked", reason: writeKey.reason };
    }
    const reason = keptNoneReason(history.present.project, keptNow);
    if (reason !== null) {
      return { kind: "locked", reason };
    }
    const key = writeKey.key;
    if (written?.key === key) {
      return written;
    }
    const running = inFlightFor(null, key);
    if (running !== null) {
      return {
        kind: "running",
        key,
        runId: running.runId,
        progress: running.progress,
        waitsForStatistics: false,
      };
    }
    const waiting = waitingFor(null, key, keys);
    if (waiting !== null) {
      return waiting;
    }
    const error = errorOf(key);
    if (error !== undefined) {
      return { kind: "error", key, error, ofStatistics: false };
    }
    const statsError = statsErrorOf(keptNow, keys);
    if (statsError !== undefined) {
      return { kind: "error", key, error: statsError, ofStatistics: true };
    }
    return { kind: "ready", key, dropped };
  };

  /** Whether the current project gives the request its key. */
  const isCurrent = (
    request: InFlight<J, R, F>,
    keys: readonly AnalysisKey[],
  ): boolean => keyGivenTo(request.target, keys) === request.key;

  /** Whether the analysis at `index` is done under the current keys. */
  const isDone = (index: number, keys: readonly AnalysisKey[]): boolean => {
    const current = keys[index];
    return current?.kind === "keyed" && get(cache, current.key) !== null;
  };

  /** The requests in flight, not being stopped, whose key the current
      project does not give: the calculations left behind, the writing
      among them. */
  const leftBehindNow = (keys: readonly AnalysisKey[]): Set<number> =>
    new Set(
      [...requests.values()]
        .filter((request) => !request.stopping && !isCurrent(request, keys))
        .map((request) => request.runId),
    );

  /** The Runs waiting for the statistics whose key, or the key of whose
      statistics, the current project does not give: left behind too. */
  const waitsBehindNow = (keys: readonly AnalysisKey[]): Set<number> =>
    new Set(
      [...waits.values()]
        .filter((wait) => !waitIsCurrent(wait, keys))
        .map((wait) => wait.waitId),
    );

  /** Stops a request: marks it and calls the `cancel()` of its handle.
      Every Run that waited for it, when it is of the statistics, ends
      with nothing sent. */
  const stop = (request: InFlight<J, R, F>): void => {
    requests.set(request.runId, { ...request, stopping: true });
    stopIssued = true;
    for (const wait of [...waits.values()]) {
      if (wait.statsRunId === request.runId) {
        waits.delete(wait.waitId);
      }
    }
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

  /** Ends each Run of `waitIds` that still waits for the statistics, with
      nothing sent; the statistics go on. */
  const endWaits = (waitIds: Iterable<number>): void => {
    for (const waitId of [...waitIds]) {
      waits.delete(waitId);
    }
  };

  /** Forgets the file written, or what is kept of it, when the project
      no longer gives the writing its key; whether it forgot a file not
      saved. */
  const forgetStale = (): boolean => {
    if (written === null || written.key === currentWriteKey()) {
      return false;
    }
    const discarded = written.kind === "done";
    written = null;
    return discarded;
  };

  /** Forgets each failure that is not popnei's whose key the keys `keys`
      of the project after a change of the user give neither to an
      analysis nor to the writing; one whose key the change left as it
      was stays, so that a change of a filter that an analysis does not
      read does not wipe the words of its crash (the store spec, "A
      calculation that failed"). */
  const forgetLeftBehind = (keys: readonly AnalysisKey[]): void => {
    const given = keyedIn(keys);
    const writeKey = currentWriteKey();
    if (writeKey !== null) {
      given.add(writeKey);
    }
    for (const key of [...failures.keys()]) {
      if (!given.has(key)) {
        failures.delete(key);
      }
    }
  };

  /** Takes out of the notice an analysis done again, a file written
      again, and a request or a wait that ended, is being stopped, or
      whose key the project gives again; drops the notice when nothing is
      left in it. */
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
    const waitsBehind = waitsBehindNow(keys);
    const waitIds = new Set(
      [...notice.waits].filter((waitId) => waitsBehind.has(waitId)),
    );
    const writeDiscarded = notice.writeDiscarded && written === null;
    if (
      removed.length === 0 &&
      runs.size === 0 &&
      waitIds.size === 0 &&
      notice.stopped.length === 0 &&
      !notice.writeStopped &&
      !writeDiscarded
    ) {
      notice = null;
    } else if (
      removed.length !== notice.removed.length ||
      runs.size !== notice.runs.size ||
      waitIds.size !== notice.waits.size ||
      writeDiscarded !== notice.writeDiscarded
    ) {
      notice = { ...notice, removed, runs, waits: waitIds, writeDiscarded };
    }
  };

  /** The notice the screens read, `previous` itself when it did not
      change. */
  const noticeOf = (previous: Notice | null): Notice | null => {
    if (notice === null) {
      return null;
    }
    const targets = [
      ...[...notice.runs].flatMap((runId) => {
        const request = requests.get(runId);
        return request === undefined ? [] : [request.target];
      }),
      ...[...notice.waits].flatMap((waitId) => {
        const wait = waits.get(waitId);
        return wait === undefined ? [] : [wait.target];
      }),
    ];
    const named = new Set(
      targets.flatMap((target) =>
        target.kind === "analysis" ? [target.def.id] : [],
      ),
    );
    const leftBehind = defs.map((def) => def.id).filter((id) => named.has(id));
    const writeLeftBehind = targets.some((target) => target.kind === "write");
    return previous?.cause === notice.cause &&
      sameIds(previous.removed, notice.removed) &&
      sameIds(previous.leftBehind, leftBehind) &&
      sameIds(previous.stopped, notice.stopped) &&
      previous.writeLeftBehind === writeLeftBehind &&
      previous.writeStopped === notice.writeStopped &&
      previous.writeDiscarded === notice.writeDiscarded
      ? previous
      : {
          cause: notice.cause,
          removed: notice.removed,
          leftBehind,
          stopped: notice.stopped,
          writeLeftBehind,
          writeStopped: notice.writeStopped,
          writeDiscarded: notice.writeDiscarded,
        };
  };

  /** The calculations in flight, reusing each view of `previous` that did
      not change, and `previous` itself when none did. */
  const runsOf = (
    keys: readonly AnalysisKey[],
    previous: readonly RunView[] | null,
  ): readonly RunView[] => {
    const views = [...requests.values()].map((request, index): RunView => {
      const view: RunView = {
        runId: request.runId,
        analysis:
          request.target.kind === "analysis" ? request.target.def.id : null,
        key: request.key,
        current: isCurrent(request, keys),
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

  /** The state of store now, reusing every part of `previous` that did
      not change, and `previous` itself when nothing did. */
  const stateOf = (previous: AppState<R, F> | null): AppState<R, F> => {
    const keys = currentKeys();
    const project = history.present.project;
    const keptNow = keptFor(project, keys);
    const views = defs.map((def, index): AnalysisView<R> => {
      const key = keys[index];
      if (key === undefined) {
        throw defect(`the analysis ${JSON.stringify(def.id)} has no key made.`);
      }
      const status: AnalysisStatus<R> =
        key.kind === "locked"
          ? { kind: "locked", reason: key.reason }
          : statusOf(def, index, key, keptNow, keys);
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
    const writeNow = writeStatusOf(keyed?.write ?? null, keptNow, keys);
    const write =
      previous !== null &&
      (previous.write === writeNow ||
        (previous.write !== null &&
          writeNow !== null &&
          sameWrite(previous.write, writeNow)))
        ? previous.write
        : writeNow;
    const runs = runsOf(keys, previous?.runs ?? null);
    const shownNotice = noticeOf(previous?.notice ?? null);
    const undoText =
      history.past.length > 0 ? history.present.description : null;
    const redoText = history.future[0]?.description ?? null;
    if (
      previous?.project === project &&
      previous.undo === undoText &&
      previous.redo === redoText &&
      previous.historyMoves === historyMoves &&
      previous.popneiVersion === popneiVersion &&
      previous.analyses === analyses &&
      previous.runs === runs &&
      previous.notice === shownNotice &&
      previous.individualsKept === keptNow &&
      previous.write === write
    ) {
      return previous;
    }
    return {
      project,
      undo: undoText,
      redo: redoText,
      historyMoves,
      popneiVersion,
      analyses,
      runs,
      notice: shownNotice,
      individualsKept: keptNow,
      write,
    };
  };

  let state = stateOf(null);

  /** Makes the state again and, when it changed, calls each listener,
      all of them also when one throws; then throws the first error. */
  const changed = (): void => {
    forgetStale();
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

  /** Stops at once every request in flight, and ends every Run that
      waits, whose key the project no longer gives and that no notice
      names: a read left it behind, and no undo gives its key back. */
  const stopOrphans = (): void => {
    const keys = currentKeys();
    const named = notice?.runs ?? new Set<number>();
    stopAll([...leftBehindNow(keys)].filter((runId) => !named.has(runId)));
    const namedWaits = notice?.waits ?? new Set<number>();
    endWaits(
      [...waitsBehindNow(keys)].filter((waitId) => !namedWaits.has(waitId)),
    );
  };

  /**
   * Takes `next`, the history after a command, an undo or a redo, when it
   * is not the one there was: forgets the failures that are not popnei's
   * whose key the new project does not give, the mark of a write dropped, and a file written whose key the new
   * project does not give; when the change changed the load of the
   * variants file, forgets the file that could not be read again, and
   * stops every calculation in flight and every Run that waits, and
   * otherwise the calculations and the waits the notice named whose key
   * the new project still does not give; and makes the notice of this
   * change, `cause`, with the analyses that were done and are not, the
   * calculations it leaves behind and those it stopped at once, and the
   * file written it forgot; none when it has none of these.
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
    dropped = false;
    history = next;
    forgetLeftBehind(keys);
    const writeDiscarded = forgetStale();
    let stopped: readonly AnalysisId[] = [];
    let writeStopped = false;
    if (
      !sameLoad(before.present.project.variants, next.present.project.variants)
    ) {
      reopening = next.present.project.variants?.fileId ?? null;
      unreadable = null;
      stoppedSoFar.clear();
      // The calculation worker is started again for the new load, so no
      // calculation of the old one can wait for an undo.
      const inFlight = [...requests.values()].filter((r) => !r.stopping);
      const targets = [
        ...inFlight.map((r) => r.target),
        ...[...waits.values()].map((wait) => wait.target),
      ];
      const named = new Set(
        targets.flatMap((target) =>
          target.kind === "analysis" ? [target.def.id] : [],
        ),
      );
      stopped = defs.map((def) => def.id).filter((id) => named.has(id));
      writeStopped = targets.some((target) => target.kind === "write");
      // Stopping the statistics ends every Run that waits for them.
      stopAll(inFlight.map((r) => r.runId));
    } else if (notice !== null) {
      const behind = leftBehindNow(keys);
      stopAll([...notice.runs].filter((runId) => behind.has(runId)));
      const waitsBehind = waitsBehindNow(keys);
      endWaits([...notice.waits].filter((waitId) => waitsBehind.has(waitId)));
    }
    // The counts are left out: a change of any filter of the variants or
    // of the individuals takes them off, which the user sees beside the
    // filters.
    const removed = defs
      .filter(
        (def, index) =>
          index !== countsIndex &&
          doneBefore.has(def.id) &&
          !isDone(index, keys),
      )
      .map((def) => def.id);
    const runs = leftBehindNow(keys);
    const waitIds = waitsBehindNow(keys);
    notice =
      removed.length === 0 &&
      runs.size === 0 &&
      waitIds.size === 0 &&
      stopped.length === 0 &&
      !writeStopped &&
      !writeDiscarded
        ? null
        : {
            cause: cause(before, next),
            removed,
            runs,
            waits: waitIds,
            stopped,
            writeStopped,
            writeDiscarded,
          };
    changed();
  };

  /** Stops every calculation in flight, ends every Run that waits, and
      drops the notice, for a change after which no undo gives their keys
      back. */
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

  /** The result so far of the request `runId`, passed over when the
      request is no longer in flight or is being stopped, so that the
      plots do not move after the user pressed Stop; kept in the request
      alone, which its outcome drops, so that it is never cached. */
  const soFarred = (runId: number, soFar: R): void => {
    const request = requests.get(runId);
    if (request !== undefined && !request.stopping) {
      requests.set(runId, { ...request, soFar });
      changed();
    }
  };

  /** Forgets the result so far kept after a Stop under `key`: a failure
      is kept under it. */
  const forgetStoppedUnder = (key: Key): void => {
    for (const [index, kept] of [...stoppedSoFar]) {
      if (kept.key === key) {
        stoppedSoFar.delete(index);
      }
    }
  };

  /** Takes the analysis `id` out of the notice's `stopped`: the user ran
      it again, and `settle` drops a notice left empty. */
  const runAgain = (id: AnalysisId): void => {
    if (notice?.stopped.includes(id) === true) {
      notice = {
        ...notice,
        stopped: notice.stopped.filter((stoppedId) => stoppedId !== id),
      };
    }
  };

  /** Stops the calculations left behind, and ends the Runs left behind,
      just before a request is sent, so that it does not wait behind them;
      gives whether the request is `afterStop`. */
  const beforeSend = (): boolean => {
    const keys = currentKeys();
    stopAll(leftBehindNow(keys));
    endWaits(waitsBehindNow(keys));
    return stopIssued || reopening !== null;
  };

  /** The project the current request is made from, with its version of
      popnei and the load id of its variants file; a defect when either is
      missing, since a key was made. */
  const sendingFrom = (
    name: string,
  ): {
    readonly project: Project;
    readonly version: string;
    readonly fileId: string;
  } => {
    const project = history.present.project;
    const version = popneiVersion;
    const fileId = project.variants?.fileId;
    if (version === null || fileId === undefined) {
      throw defect(
        `${name} has a key with no version of popnei or no variants file.`,
      );
    }
    return { project, version, fileId };
  };

  /**
   * Sends the request of the analysis `def`, at `index`, under `key`,
   * made from the current project, through a client bound to that key
   * that gives `individuals`, and records it in flight; `byOwnRun` when
   * the Run of that analysis sent it. The calculations left behind are
   * stopped, and the Runs left behind end, just before the send. When the
   * analysis throws, or returns a handle its client did not give, what it
   * sent is cancelled and the error thrown, with nothing recorded.
   */
  const sendFor = (
    def: AnalysisDef<J, R>,
    index: number,
    key: Key,
    individuals: readonly string[] | null,
    byOwnRun: boolean,
  ): Run<R> => {
    const id = def.id;
    const { project, version, fileId } = sendingFrom(
      `the analysis ${JSON.stringify(id)}`,
    );
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
        sending.afterStop = beforeSend();
        // A progress or a result so far given before `send` returns has
        // no request to go to, and is passed over.
        const sent = config.send(
          key,
          job,
          (progress) => {
            if (sending.handle !== null) {
              progressed(sending.handle.id, progress);
            }
          },
          (soFar) => {
            if (sending.handle !== null) {
              soFarred(sending.handle.id, soFar);
            }
          },
        );
        sending.handle = sent;
        return sent;
      },
      intermediateKey: (name, inputs) =>
        intermediateKeyOf(def, project, version, name, inputs, memo),
      individuals,
    };
    let handle: Run<R>;
    try {
      handle = def.run(project, client);
    } catch (error) {
      // Nothing is recorded yet; what the analysis sent is stopped, so
      // that no calculation runs that the store does not know. The
      // calculations it stopped before sending stay stopped.
      sending.handle?.cancel();
      throw error;
    }
    if (handle !== sending.handle || requests.has(handle.id)) {
      sending.handle?.cancel();
      throw defect(
        `the run of the analysis ${JSON.stringify(id)} gave a handle its client did not give, or of a request already in flight.`,
      );
    }
    requests.set(handle.id, {
      runId: handle.id,
      target: { kind: "analysis", def, index },
      key,
      project,
      fileId,
      popneiVersion: version,
      handle,
      progress: null,
      soFar: null,
      stopping: false,
      afterStop: sending.afterStop,
      byOwnRun,
    });
    return handle;
  };

  /**
   * Sends the write of the filtered variants of the current project in
   * `format` under `key`, with the individuals kept, `individuals`, and
   * records it in flight. The calculations left behind are stopped, and
   * the Runs left behind end, just before the send. A handle of a request
   * already in flight is a defect, with what was sent cancelled.
   */
  const sendWrite = (
    format: WriteFormat,
    key: Key,
    individuals: readonly string[] | null,
  ): Run<Written<F>> => {
    const write = config.write;
    if (write === null) {
      throw defect("the store has no write, and was asked to send one.");
    }
    const { project, version, fileId } = sendingFrom("the writing");
    const job: WriteJob = {
      format,
      fileId,
      filters: jobFilters(filtersApplied(project)),
      individuals,
    };
    const afterStop = beforeSend();
    const sending: { handle: Run<Written<F>> | null } = { handle: null };
    const handle = write.send(key, job, (progress) => {
      if (sending.handle !== null) {
        progressed(sending.handle.id, progress);
      }
    });
    if (requests.has(handle.id)) {
      handle.cancel();
      throw defect(
        `the write was given the handle ${String(handle.id)}, of a request already in flight.`,
      );
    }
    sending.handle = handle;
    requests.set(handle.id, {
      runId: handle.id,
      target: { kind: "write", format },
      key,
      project,
      fileId,
      popneiVersion: version,
      handle,
      progress: null,
      soFar: null,
      stopping: false,
      afterStop,
      byOwnRun: true,
    });
    return handle;
  };

  /** Takes the requests `sent` out of those in flight and cancels them:
      `src/ui/runs.ts` will never receive their handles. */
  const withdraw = (sent: readonly Run<R | Written<F>>[]): void => {
    for (const handle of sent) {
      requests.delete(handle.id);
      handle.cancel();
    }
  };

  /** The counts of the filters that the pass of `request`, which ended
      done under `key`, gave as `counts`, with the key of the analysis of
      the counts for the request's project, and the warnings and the
      check numbers its definition gives of them; `null` when there are
      none, when the store has no analysis of the counts, and for a
      result of that analysis itself, already put under that key. */
  const countsToPut = (
    request: InFlight<J, R, F>,
    key: Key,
    counts: R | null,
  ): { readonly key: Key; readonly cached: CachedResult<R> } | null => {
    if (counts === null || countsDef === null) {
      return null;
    }
    const countsKey = keyOf(
      countsDef,
      request.project,
      request.popneiVersion,
      memo,
    );
    if (countsKey === key) {
      return null;
    }
    return {
      key: countsKey,
      cached: {
        result: counts,
        warnings: countsDef.warnings(counts, request.project),
        numbers: countsDef.checkNumbers(counts),
        stats: null,
      },
    };
  };

  /** The history with the number of variants `numVars` recorded into the
      variants file of the load of `request`, or the history itself when
      there is none. */
  const withNumVars = (
    request: InFlight<J, R, F>,
    numVars: number | null,
  ): History =>
    numVars === null
      ? history
      : recordShared<VariantSource>(
          history,
          (p) => p.variants,
          (p, variants) => ({ ...p, variants }),
          (p) => recordVariantsCounted(p, request.fileId, numVars),
        );

  /** What the result of an analysis's request leaves in the store: the
      result in the cache with its warnings, its counts, and its number of
      variants recorded. */
  const tookResult = (
    request: InFlight<J, R, F>,
    def: AnalysisDef<J, R>,
    index: number,
    key: Key,
    result: R,
  ): void => {
    // Everything that can throw comes before anything is kept.
    const warnings = def.warnings(result, request.project);
    const numbers = def.checkNumbers(result);
    const stats =
      index === statsIndex && statistics !== null
        ? statistics.of(result)
        : null;
    if (stats !== null) {
      checkStatsOf(request.project, stats);
    }
    const found = config.countsOf(result);
    const counts = countsToPut(request, key, found.counts);
    const next = withNumVars(request, found.numVarsRead);
    // The results shown are those of the project with its number of
    // variants recorded, which `history` becomes below.
    const shown = keyedIn(keysFor(next.present.project, popneiVersion));
    cache = put(cache, key, { result, warnings, numbers, stats }, shown);
    if (counts !== null) {
      // The put of the counts keeps the result they came with.
      cache = put(cache, counts.key, counts.cached, new Set([...shown, key]));
    }
    if (next !== history) {
      history = next;
      stopOrphans();
    }
  };

  /** What a file written leaves in the store: the counts of its pass in
      the cache and its number of variants recorded, as those of any pass,
      and the file kept when the project still gives its key and it holds
      a variant; dropped, and so marked, when the project no longer gives
      its key. */
  const tookWritten = (
    request: InFlight<J, R, F>,
    key: Key,
    file: Written<F>,
  ): void => {
    const write = config.write;
    if (write === null) {
      throw defect("a write ended in a store that has no write.");
    }
    // Everything that can throw comes before anything is kept.
    const countsResult = write.countsOf(file.passStats);
    const found = config.countsOf(countsResult);
    const counts = countsToPut(request, key, countsResult);
    const next = withNumVars(request, found.numVarsRead);
    const nextKeys = keysFor(next.present.project, popneiVersion);
    if (counts !== null) {
      cache = put(cache, counts.key, counts.cached, keyedIn(nextKeys));
    }
    if (next !== history) {
      history = next;
      stopOrphans();
    }
    if (key !== currentWriteKey()) {
      // Its file holds other variants than the step shows.
      dropped = true;
      return;
    }
    const { format, numBytes, passStats } = file;
    written =
      passStats.numVars === 0
        ? { kind: "noVariant", key, written: { format, numBytes, passStats } }
        : { kind: "done", key, written: file };
  };

  /**
   * Whether the result of a request is a file written, `Written` of the
   * protocol, by its fields; the result of an analysis has none of them.
   * The store knows by the request which it should be, and a mismatch is a
   * defect; the file itself, of the type `F` it was given, it never reads.
   */
  const isWritten = (result: R | Written<F>): result is Written<F> => {
    const value: unknown = result;
    return (
      typeof value === "object" &&
      value !== null &&
      "format" in value &&
      "file" in value &&
      "numBytes" in value &&
      typeof value.numBytes === "number" &&
      "passStats" in value
    );
  };

  /** What an outcome leaves in the store: the result in the cache with
      its warnings and its number of variants recorded, or the file kept,
      or the failure kept. */
  const ended = (
    request: InFlight<J, R, F>,
    outcome: Outcome<R | Written<F>>,
  ): void => {
    switch (outcome.kind) {
      case "done": {
        const key = keyFromWire(outcome.key);
        if (key !== request.key) {
          throw defect(
            `the request ${String(request.runId)} of ${nameOf(request.target)} was sent under the key ${request.key} and came back under ${key}.`,
          );
        }
        const result = outcome.result;
        const target = request.target;
        if (target.kind === "write") {
          if (!isWritten(result)) {
            throw defect(
              `the request ${String(request.runId)} of the writing ended with no file written.`,
            );
          }
          tookWritten(request, key, result);
          return;
        }
        if (isWritten(result)) {
          throw defect(
            `the request ${String(request.runId)} of ${nameOf(target)} ended with a file written.`,
          );
        }
        tookResult(request, target.def, target.index, key, result);
        return;
      }
      case "failed":
        // What was read before a refusal of the file may be what the
        // refusal is about.
        forgetStoppedUnder(request.key);
        if (outcome.error.kind === "popnei") {
          refusals.set(request.key, {
            kind: "refused",
            message: outcome.error.message,
          });
        } else if (outcome.error.kind === "reopenFailed") {
          unreadable = {
            fileId: request.fileId,
            error: { kind: "failed", error: outcome.error },
          };
        } else if (isCurrent(request, currentKeys())) {
          // One that arrives after a change left its request behind is
          // not kept, so that an undo giving its key back shows the
          // analysis ready: a second try can succeed (the store spec).
          failures.set(request.key, { kind: "failed", error: outcome.error });
        }
        return;
      case "cancelled":
        return;
    }
  };

  /** Sends the requests of the Runs `waiting`, which waited for the
      statistics that just ended done, each that the project still gives
      both its key and theirs, with the list of the individuals kept; none
      when the list keeps no individual, and none for what is done or
      running already. Gives the handles sent. */
  const sendWaiting = (
    waiting: readonly Waiting<J, R>[],
  ): Run<R | Written<F>>[] => {
    const sent: Run<R | Written<F>>[] = [];
    for (const wait of waiting) {
      const keys = currentKeys();
      const kept = keptFor(history.present.project, keys);
      const list = kept?.list;
      const target = wait.target;
      const served =
        target.kind === "analysis"
          ? get(cache, wait.key) !== null
          : written?.key === wait.key;
      if (
        !waitIsCurrent(wait, keys) ||
        list?.kind !== "known" ||
        list.individuals?.length === 0 ||
        (target.kind === "analysis" &&
          keptNeedsOf(target.def, kept) !== null) ||
        served ||
        inFlightFor(indexOf(target), wait.key) !== null
      ) {
        // Left behind, locked by the individuals kept, or done or
        // running already: it ends with nothing sent.
        continue;
      }
      try {
        sent.push(
          target.kind === "analysis"
            ? sendFor(
                target.def,
                target.index,
                wait.key,
                list.individuals,
                true,
              )
            : sendWrite(target.format, wait.key, list.individuals),
        );
      } catch (error) {
        withdraw(sent);
        throw error;
      }
    }
    return sent;
  };

  /**
   * Starts the request of `target` under `key`, whose list of the
   * individuals kept is `list`, `undefined` for an analysis that does not
   * read the filters of individuals: at once when the list is known, or,
   * when it needs the statistics of each individual, by starting them, or
   * waiting for them when they are in flight already, the calculations
   * and the Runs left behind stopped as before a send. `started` is called
   * once the request is recorded, before the screens are told. Gives the
   * handles sent, and when a listener throws, takes them out and stops
   * them.
   */
  const startTarget = (
    target: Target<J, R>,
    key: Key,
    list: IndividualsKept["list"] | undefined,
    keys: readonly AnalysisKey[],
    started: () => void,
  ): readonly Run<R | Written<F>>[] => {
    if (list?.kind !== "needsStatistics") {
      const individuals = list?.kind === "known" ? list.individuals : null;
      let handle: Run<R | Written<F>>;
      try {
        handle =
          target.kind === "analysis"
            ? sendFor(target.def, target.index, key, individuals, true)
            : sendWrite(target.format, key, individuals);
      } catch (error) {
        return changedAfter(error);
      }
      failures.delete(key);
      started();
      try {
        changed();
      } catch (error) {
        // src/ui/runs.ts will never receive the handle, nor give its
        // outcome: the request is taken out and stopped.
        withdraw([handle]);
        return changedAfter(error);
      }
      return [handle];
    }
    // The list needs the statistics of each individual: they are
    // calculated first, or waited for when already in flight.
    const statsDef = defs[statsIndex];
    const statsKey = statsKeyIn(keys);
    if (statsDef === undefined || statsKey === null) {
      throw defect(
        `${nameOf(target)} waits for the statistics of each individual, which the store has no analysis for or locks.`,
      );
    }
    const statsRequest = inFlightFor(statsIndex, statsKey);
    let sent: Run<R> | null = null;
    let statsRunId: number;
    if (statsRequest !== null) {
      // Nothing is sent, so the calculations left behind are stopped
      // here, as a send would, that the statistics may not wait behind
      // them; and the Runs left behind end.
      beforeSend();
      statsRunId = statsRequest.runId;
    } else {
      let statsHandle: Run<R>;
      try {
        statsHandle = sendFor(statsDef, statsIndex, statsKey, null, false);
      } catch (error) {
        return changedAfter(error);
      }
      sent = statsHandle;
      statsRunId = statsHandle.id;
      failures.delete(statsKey);
      runAgain(statsDef.id);
    }
    lastWaitId += 1;
    const waitId = lastWaitId;
    waits.set(waitId, { waitId, target, key, statsRunId, statsKey });
    failures.delete(key);
    started();
    try {
      changed();
    } catch (error) {
      waits.delete(waitId);
      withdraw(sent === null ? [] : [sent]);
      return changedAfter(error);
    }
    return sent === null ? [] : [sent];
  };

  /** Whether a state of an analysis or of the writing can be run: ready,
      removed, or in error after a failure that is not popnei's nor a
      variants file that could not be read again. */
  const canStart = (
    status: AnalysisStatus<R> | WriteStatus<F> | undefined,
  ): boolean =>
    status !== undefined &&
    (status.kind === "ready" ||
      status.kind === "removed" ||
      (status.kind === "error" &&
        status.error.kind === "failed" &&
        status.error.error.kind !== "reopenFailed"));

  /**
   * Stops the Run of `index`, an analysis's place or `null` for the
   * writing, whose key the project gives: its wait for the statistics, which are stopped too when no other Run
   * waits for them and their own Run did not start them; or its request
   * in flight. Nothing when there is neither.
   */
  const cancelOf = (index: number | null): void => {
    const keys = currentKeys();
    for (const wait of waits.values()) {
      if (indexOf(wait.target) === index && waitIsCurrent(wait, keys)) {
        waits.delete(wait.waitId);
        // The statistics are stopped too, unless another Run waits for
        // them or the user asked for them with their own Run.
        const statsRequest = requests.get(wait.statsRunId);
        const othersWait = [...waits.values()].some(
          (other) => other.statsRunId === wait.statsRunId,
        );
        if (
          statsRequest !== undefined &&
          !statsRequest.stopping &&
          !statsRequest.byOwnRun &&
          !othersWait
        ) {
          stop(statsRequest);
        }
        changed();
        return;
      }
    }
    for (const request of requests.values()) {
      if (
        indexOf(request.target) === index &&
        isCurrent(request, keys) &&
        !request.stopping
      ) {
        // The user's Stop keeps the last result so far, which the screen
        // goes on showing; none when the request had given none.
        if (index !== null) {
          if (request.soFar === null) {
            stoppedSoFar.delete(index);
          } else {
            stoppedSoFar.set(index, {
              key: request.key,
              stopped: { soFar: request.soFar },
            });
          }
        }
        stop(request);
        changed();
        return;
      }
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
      const next = undo(history);
      if (next !== history) historyMoves += 1;
      changedByUser(next, (before) => ({
        kind: "undo",
        description: before.present.description,
      }));
    },
    redo: () => {
      const next = redo(history);
      if (next !== history) historyMoves += 1;
      changedByUser(next, (_before, after) => ({
        kind: "redo",
        description: after.present.description,
      }));
    },
    open: (p) => {
      const opened = startHistory(freezeProject(p), history.maxSteps);
      keysFor(opened.present.project, popneiVersion);
      stopEverything();
      failures.clear();
      stoppedSoFar.clear();
      unreadable = null;
      written = null;
      dropped = false;
      history = opened;
      historyMoves += 1;
      changed();
    },
    dismissNotice: () => {
      if (notice === null) {
        return;
      }
      stopAll(notice.runs);
      endWaits(notice.waits);
      notice = null;
      changed();
    },
    startRun: (id) => {
      const { def, index } = defOf(id, "startRun");
      const keys = currentKeys();
      const current = keys[index];
      const keptNow = keptFor(history.present.project, keys);
      const status =
        current?.kind === "keyed"
          ? statusOf(def, index, current, keptNow, keys)
          : undefined;
      if (
        status === undefined ||
        status.kind === "locked" ||
        !canStart(status)
      ) {
        return null;
      }
      return startTarget(
        { kind: "analysis", def, index },
        status.key,
        def.filtersRead.individuals ? keptNow?.list : undefined,
        keys,
        () => {
          runAgain(id);
          stoppedSoFar.delete(index);
        },
      );
    },
    cancelRun: (id) => {
      const { index } = defOf(id, "cancelRun");
      cancelOf(index);
    },
    startWrite: (format) => {
      // The key and the state of the writing are those of STATE_FORMAT
      // alone, so another format would be filed and shown as its file.
      const stateFormat: string = STATE_FORMAT;
      if (format !== stateFormat) {
        throw defect(
          `startWrite was asked for the format ${JSON.stringify(format)}, and the state of the writing holds ${JSON.stringify(STATE_FORMAT)} alone.`,
        );
      }
      const keys = currentKeys();
      const keptNow = keptFor(history.present.project, keys);
      const writeKey = keyed?.write ?? null;
      const status = writeStatusOf(writeKey, keptNow, keys);
      if (
        status === null ||
        status.kind === "locked" ||
        !(status.kind === "saved" || canStart(status))
      ) {
        return null;
      }
      // The key of the state is that of the one format, STATE_FORMAT.
      return startTarget(
        { kind: "write", format },
        status.key,
        keptNow?.list,
        keys,
        () => {
          // A file saved is written again: what was kept of it goes, and
          // so do the mark of a write dropped and the notice's stop.
          written = null;
          dropped = false;
          if (notice?.writeStopped === true) {
            notice = { ...notice, writeStopped: false };
          }
        },
      );
    },
    cancelWrite: () => {
      cancelOf(null);
    },
    writeSaved: () => {
      if (written?.kind !== "done" || state.write?.kind !== "done") {
        throw defect(
          `writeSaved was called with the writing ${state.write?.kind ?? "absent"}, and not done.`,
        );
      }
      const { format, numBytes, passStats } = written.written;
      written = {
        kind: "saved",
        key: written.key,
        written: { format, numBytes, passStats },
      };
      changed();
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
      const next = recordShared<VariantSource>(
        history,
        (p) => p.variants,
        (p, variants) => ({ ...p, variants }),
        (p) => recordVariantsRead(p, fileId, read),
      );
      // A read recorded of the new load was its opening; one that records
      // nothing, of a source read already, says nothing of the worker.
      if (next !== history && fileId === reopening) {
        reopening = null;
      }
      moved(next);
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
      // defect does not leave the analysis shown running for ever; and
      // so are the Runs that waited for it, which send only when it
      // ended done.
      requests.delete(runId);
      const waiting = [...waits.values()].filter(
        (wait) => wait.statsRunId === runId,
      );
      endWaits(waiting.map((wait) => wait.waitId));
      /** Keeps, when the request is of the statistics, the keys of the
          analyses whose Runs waited for them, as they fail. */
      const keepWaited = (): void => {
        if (
          request.target.kind === "analysis" &&
          request.target.index === statsIndex
        ) {
          statsWaited = {
            statsKey: request.key,
            keys: new Set(
              waiting.flatMap((wait) =>
                wait.target.kind === "analysis" ? [wait.key] : [],
              ),
            ),
          };
        }
      };
      if (outcome.kind === "failed") {
        keepWaited();
      }
      if (outcome.kind !== "cancelled") {
        // Answered by a worker past any stop issued before, and, on the
        // load it opened, past the opening.
        stopIssued = false;
        if (request.fileId === reopening) {
          reopening = null;
        }
      }
      try {
        ended(request, outcome);
      } catch (error) {
        // A defect of our code, which the analysis shows until the next
        // change, rather than ready with nothing said.
        keepWaited();
        forgetStoppedUnder(request.key);
        failures.set(request.key, {
          kind: "failed",
          error: {
            kind: "defect",
            message: messageOf(error),
          },
        });
        return changedAfter(error);
      }
      let sent: Run<R | Written<F>>[] = [];
      if (outcome.kind === "done") {
        try {
          sent = sendWaiting(waiting);
        } catch (error) {
          return changedAfter(error);
        }
      }
      try {
        changed();
      } catch (error) {
        withdraw(sent);
        return changedAfter(error);
      }
      return sent;
    },
  };
}

/** Throws a defect when the statistics `stats` are not of the
    individuals of the variants file of `p`, the project of their
    request, in its order, with one number of each kind for each. */
function checkStatsOf(p: Project, stats: IndividualStats): void {
  const read = p.variants?.read;
  const all = read?.kind === "read" ? read.individuals : [];
  if (
    stats.individuals.length !== all.length ||
    stats.missingGtRate.length !== all.length ||
    stats.obsHetRate.length !== all.length ||
    stats.individuals.some((name, index) => name !== all[index])
  ) {
    throw defect(
      "the statistics of each individual are not of the individuals of the variants file of their request, in its order.",
    );
  }
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

/** A name of what a request is for, for the message of a defect. */
function nameOf<J, R>(target: Target<J, R>): string {
  return target.kind === "analysis"
    ? `the analysis ${JSON.stringify(target.def.id)}`
    : "the writing";
}

/** Whether two states of the writing show the same, so that the screen
    keeps the object it has. */
function sameWrite<F>(a: WriteStatus<F>, b: WriteStatus<F>): boolean {
  switch (a.kind) {
    case "locked":
      return b.kind === "locked" && a.reason === b.reason;
    case "done":
    case "saved":
    case "noVariant":
      return b.kind === a.kind && a.key === b.key && a.written === b.written;
    case "running":
      return (
        b.kind === "running" &&
        a.key === b.key &&
        a.runId === b.runId &&
        a.progress === b.progress &&
        a.waitsForStatistics === b.waitsForStatistics
      );
    case "error":
      return (
        b.kind === "error" &&
        a.key === b.key &&
        a.error === b.error &&
        a.ofStatistics === b.ofStatistics
      );
    case "ready":
      return b.kind === "ready" && a.key === b.key && a.dropped === b.dropped;
  }
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
        a.progress === b.progress &&
        a.waitsForStatistics === b.waitsForStatistics &&
        a.soFar === b.soFar
      );
    case "error":
      return (
        b.kind === "error" &&
        a.key === b.key &&
        a.error === b.error &&
        a.ofStatistics === b.ofStatistics &&
        a.waited === b.waited
      );
    case "removed":
      return b.kind === "removed" && a.key === b.key;
    case "ready":
      return b.kind === "ready" && a.key === b.key && a.stopped === b.stopped;
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
