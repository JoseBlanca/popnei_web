/**
 * The runner of the calculation worker: it loads popnei, opens the variants
 * file of the one load its worker holds, puts the filters of each request
 * on it, runs the diversity, and says what to answer when popnei refuses
 * or something breaks (docs/specs/worker/runner.md).
 *
 * It is the one file of the application that calls popnei, and it calls
 * nothing of the worker's globals: the worker's script, runnerWorker.ts,
 * gives it the requests and posts what it returns, so that it runs in node
 * under Vitest, given the bytes of a file where the worker gives the `File`.
 */
import { calcPerVarDistribs, init, openVars, openVcf, version } from "popnei";
import type {
  PassStats as PopneiPassStats,
  PerVarDistribs,
  Step,
  Variants,
} from "popnei";

import type { Result } from "../core/result.ts";
import { messageOf } from "./messages.ts";
import type { FromRunner, WorkerStop } from "./messages.ts";
import type {
  DiversityJob,
  DiversityResult,
  FilteringStats,
  Job,
  JobResult,
  LoadFormat,
  Opened,
  PassStats,
  Progress,
  VariantFilter,
  VariantFilterKind,
} from "./protocol.ts";

/** A load as the runner opens it: its id, new at every pick of the file,
    and its format with the read options of a VCF, `null` for a `.nei`
    file. */
export type LoadToOpen = { readonly fileId: string } & LoadFormat;

/** The file of a load: its name, and what popnei opens. */
export interface LoadFile {
  /** The name of the `File`, which a `reopenFailed` carries. */
  readonly name: string;
  /** popnei's `BytesOrFile`: the `File` in the worker, its bytes or a
      `Blob` in the tests. It is read again at every open of the file. */
  readonly source: Uint8Array | Blob;
}

/** The message of the calculation worker of kind `K` with no `id`, which
    the worker's script adds. */
type AnswerOf<K extends FromRunner["kind"]> = Omit<
  Extract<FromRunner, { readonly kind: K }>,
  "id"
>;

/**
 * What the worker's script posts for a request: the value of `opened` or
 * of `result`; `refused`, popnei refused the input, and `reopenFailed`,
 * the browser no longer reads the file, after which the worker goes on;
 * or a `WorkerStop`, after which it closes. The failures are the messages
 * of messages.ts with no id, so a field added to one of them is a field
 * the runner has to give.
 */
export type Answer<T> =
  | { readonly kind: "ok"; readonly value: T }
  | AnswerOf<"refused">
  | AnswerOf<"reopenFailed">
  | WorkerStop;

/** The runner of one worker, which holds its one load. */
export interface Runner {
  /**
   * Opens the load, the first request of a worker and its only `open`.
   * `refused` or `reopenFailed` when popnei refuses the file, and
   * `crashed` when its call throws anything but a plain `Error`, a trap of
   * the wasm among them, after each of which every run is `badRequest`;
   * `badRequest` for a second `open`. Throws only for a defect of ours.
   */
  open(load: LoadToOpen, file: LoadFile): Answer<Opened>;
  /**
   * Runs the job over the load opened, first opening the file again when
   * the filters of the `Variants` are not the job's, and gives `told` each
   * `Progress` of popnei as it comes. Throws what `told` throws, and a
   * defect of ours.
   */
  run(job: Job, told: (progress: Progress) => void): Answer<JobResult>;
}

/** The statistics the diversity asks popnei for, the three it shows. */
const DIVERSITY_STATS = [
  "obs_het",
  "unbiased_exp_het",
  "poly_vars_ratio",
] as const;

/**
 * The beginnings of popnei's messages for a range of the file that the
 * browser refused or gave short (`crates/popnei-js/src/source.rs` of
 * popnei at b3f77c8): the file changed on the disk since it was picked.
 */
const RANGE_NOT_GIVEN = [
  "the source could not be read: the browser did not give popnei ",
  "the source could not be read: popnei asked this file for the ",
] as const;

let popneiLoading: Promise<Result<string, string>> | null = null;

/**
 * Loads popnei's wasm, once: its version when it loaded, or the message
 * of what `init()` threw. A second call gives the same promise.
 */
export function loadPopnei(): Promise<Result<string, string>> {
  popneiLoading ??= init().then(
    (): Result<string, string> => ({ ok: true, value: version() }),
    (thrown: unknown): Result<string, string> => ({
      ok: false,
      error: messageOf(thrown),
    }),
  );
  return popneiLoading;
}

/**
 * The answer of what a call to popnei threw: `refused` with its message
 * for a plain `Error`, whose prototype is `Error.prototype` itself, which
 * is how popnei refuses its input; `crashed` for anything else, a trap of
 * the wasm, a `RangeError` of a memory that cannot grow, a `TypeError`.
 */
export function answerOfThrown(thrown: unknown): Answer<never> {
  if (
    thrown instanceof Error &&
    Object.getPrototypeOf(thrown) === Error.prototype
  ) {
    return { kind: "refused", message: thrown.message };
  }
  return { kind: "crashed", message: messageOf(thrown) };
}

/**
 * The buffers of the typed arrays of a result, each once, to transfer.
 * Throws a defect for an array that is a view of part of a buffer, or over
 * a buffer that cannot be transferred: the runner makes every array it
 * posts, each over a buffer of its own.
 */
export function transferablesOf(result: JobResult): ArrayBuffer[] {
  const buffers = new Set<ArrayBuffer>();
  for (const array of arraysOf(result)) {
    const buffer = array.buffer;
    if (!(buffer instanceof ArrayBuffer)) {
      throw new Error(
        "popnei_web defect: an array of a result is over a buffer that cannot be transferred",
      );
    }
    if (array.byteOffset !== 0 || array.byteLength !== buffer.byteLength) {
      throw new Error(
        `popnei_web defect: an array of a result is a view of ${String(array.byteLength)} bytes from ${String(array.byteOffset)} of a buffer of ${String(buffer.byteLength)}`,
      );
    }
    buffers.add(buffer);
  }
  return [...buffers];
}

/** The typed arrays of a result. */
function arraysOf(result: JobResult): readonly (Float64Array | Uint32Array)[] {
  switch (result.analysis) {
    case "diversity":
      return [
        result.numIndividuals,
        result.unbiasedExpHet,
        result.obsHet,
        result.polyRatio,
        result.numVarsWithValue,
      ];
    case "individualChecks":
      return [result.missingGtRate, result.obsHetRate];
    case "variantChecks":
      return [
        result.binEdges,
        result.maf.counts,
        result.obsHet.counts,
        result.unbiasedExpHet.counts,
      ];
    case "filterCounts":
      return [];
  }
}

/** What the runner holds: nothing before the `open`; a load whose open
    gave no `Variants`, refused by popnei, a file the browser did not give,
    or a crash; or the load it opened. */
type Held =
  | { readonly kind: "none" }
  | { readonly kind: "notOpened" }
  | {
      readonly kind: "opened";
      readonly load: LoadToOpen;
      readonly file: LoadFile;
    };

/** A runner holding nothing; `loadPopnei` has to have given `ok`. */
export function createRunner(): Runner {
  let held: Held = { kind: "none" };
  /** The `Variants` of the load opened; `null` before the open, after an
      open that gave none, and after an open again that popnei refused. */
  let variants: Variants | null = null;

  function open(load: LoadToOpen, file: LoadFile): Answer<Opened> {
    if (held.kind !== "none") {
      return {
        kind: "badRequest",
        message: "a second open: a worker opens one load",
      };
    }
    let opened: Variants;
    try {
      opened = openSource(load, file);
    } catch (thrown: unknown) {
      held = { kind: "notOpened" };
      return answerOfPopnei(thrown, file.name);
    }
    held = { kind: "opened", load, file };
    variants = opened;
    return {
      kind: "ok",
      value: { individuals: opened.individuals, ploidy: opened.ploidy },
    };
  }

  /**
   * The `Variants` of the load with the filters of the job on it: as it is
   * when its steps are those filters; with them put on it when it holds no
   * step; otherwise freed and the file opened again, the filters put on
   * the new one.
   */
  function variantsFiltered(
    load: LoadToOpen,
    file: LoadFile,
    filters: readonly VariantFilter[],
  ): Answer<Variants> {
    if (variants !== null) {
      const steps = variants.steps;
      if (stepsAreFilters(steps, filters)) {
        return { kind: "ok", value: variants };
      }
      if (steps.length > 0) {
        variants.free();
        variants = null;
      }
    }
    if (variants === null) {
      try {
        variants = openSource(load, file);
      } catch (thrown: unknown) {
        return answerOfOpenAgain(thrown, file.name);
      }
    }
    for (const filter of filters) {
      try {
        putFilter(variants, filter);
      } catch (thrown: unknown) {
        return answerOfPopnei(thrown, file.name);
      }
    }
    return { kind: "ok", value: variants };
  }

  function run(
    job: Job,
    told: (progress: Progress) => void,
  ): Answer<JobResult> {
    switch (held.kind) {
      case "none":
        return { kind: "badRequest", message: "a run before the open" };
      case "notOpened":
        return {
          kind: "badRequest",
          message: "a run after an open that gave no variants",
        };
      case "opened":
        break;
    }
    const { load, file } = held;
    if (job.fileId !== load.fileId) {
      return {
        kind: "badRequest",
        message: `a run of the load ${job.fileId} in the worker of the load ${load.fileId}`,
      };
    }
    if (job.analysis !== "diversity") {
      // The runner of the three analyses of the Variants step is not built
      // yet, and core sends none of their jobs.
      return {
        kind: "badRequest",
        message: `a job of ${job.analysis}, which this runner does not run yet`,
      };
    }
    const why = whyNotToRun(job);
    if (why !== null) {
      return { kind: "badRequest", message: why };
    }
    const filtered = variantsFiltered(load, file, job.filters);
    if (filtered.kind !== "ok") {
      return filtered;
    }
    return runDiversity(filtered.value, job, file.name, told);
  }

  return { open, run };
}

/** Opens the file of the load with popnei, reading its `source` anew. */
function openSource(load: LoadToOpen, file: LoadFile): Variants {
  const source = file.source;
  switch (load.format) {
    case "nei":
      return openVars(source);
    case "vcf":
      return openVcf(source, {
        ploidy: load.readOptions.ploidy,
        onlyPassed: load.readOptions.onlyPassed,
      });
  }
}

/** Whether the steps are the filters: the same kinds in the same order,
    each argument of a step `===` to the field of that name of its filter. */
function stepsAreFilters(
  steps: readonly Step[],
  filters: readonly VariantFilter[],
): boolean {
  if (steps.length !== filters.length) {
    return false;
  }
  return steps.every((step, index) => {
    const filter = filters[index];
    if (filter === undefined) {
      throw new Error("popnei_web defect: a filter missing from its list");
    }
    if (step.kind !== filter.kind) {
      return false;
    }
    const fields = new Map<string, unknown>(Object.entries(filter));
    fields.delete("kind");
    const args = Object.entries(step.args);
    return (
      args.length === fields.size &&
      args.every(
        ([name, value]) => fields.has(name) && fields.get(name) === value,
      )
    );
  });
}

/** Puts one filter on the variants with its method of popnei. */
function putFilter(variants: Variants, filter: VariantFilter): void {
  switch (filter.kind) {
    case "missing_data":
      variants.filterByMissingData(filter.maxAllowedMissingRate);
      return;
    case "maf":
      variants.filterByMaf(filter.maxAllowedMaf);
      return;
    case "obs_het":
      variants.filterByObsHet(filter.maxAllowedObsHet);
      return;
    case "ld":
      variants.filterByLd(filter.maxAllowedR2, filter.maxDist);
      return;
  }
}

/** Why the runner cannot run a diversity job, or `null` when it can: two
    populations of one name; an empty list of individuals, which core never
    sends; or a list of individuals, which this runner does not put on the
    variants yet, while core sends none, since the filters of individuals
    lock the diversity. */
function whyNotToRun(job: DiversityJob): string | null {
  const names = new Set<string>();
  for (const [name] of job.pops) {
    if (names.has(name)) {
      return `two populations named ${JSON.stringify(name)}`;
    }
    names.add(name);
  }
  if (job.individuals !== null) {
    return job.individuals.length === 0
      ? "an empty list of individuals"
      : "a list of individuals, which this runner does not put on the variants yet";
  }
  return null;
}

/**
 * Runs `calcPerVarDistribs` and makes the `DiversityResult` of it. What
 * `told` throws is thrown on, a defect of ours, and not taken for popnei's
 * refusal nor dropped: while a pass reads it ends the pass and popnei's
 * call throws that same value back; at the end of the run popnei's call
 * returns, and the runner throws it.
 */
function runDiversity(
  variants: Variants,
  job: DiversityJob,
  name: string,
  told: (progress: Progress) => void,
): Answer<JobResult> {
  /** What `told` threw, none or one value. */
  const thrownByTold: unknown[] = [];
  variants.onProgress((progress) => {
    try {
      told({
        bytesRead: progress.bytesRead,
        numBytes: progress.numBytes,
        pass: progress.pass,
        numPasses: progress.numPasses,
      });
    } catch (thrown: unknown) {
      thrownByTold.push(thrown);
      throw thrown;
    }
  });
  let distribs: PerVarDistribs;
  try {
    distribs = calcPerVarDistribs(variants, {
      pops: Object.fromEntries(job.pops),
      stats: DIVERSITY_STATS,
      minNumIndividuals: job.minNumIndividuals,
      polyThreshold: job.polyThreshold,
    });
  } catch (thrown: unknown) {
    if (thrownByTold.some((value) => value === thrown)) {
      throw thrown;
    }
    return answerOfPopnei(thrown, name);
  }
  // popnei throws back what `told` threw while a pass reads, and drops what
  // it threw at the calls of the end of the run, which is thrown here.
  if (thrownByTold.length > 0) {
    throw thrownByTold[0];
  }
  return { kind: "ok", value: diversityResultOf(distribs, job) };
}

/** The `DiversityResult` of popnei's result, in the order of the job. */
function diversityResultOf(
  distribs: PerVarDistribs,
  job: DiversityJob,
): DiversityResult {
  const { obsHet, unbiasedExpHet, polyVarsRatio, passStats } = distribs;
  if (obsHet === null || unbiasedExpHet === null || polyVarsRatio === null) {
    throw new Error(
      "popnei_web defect: calcPerVarDistribs gave no value of a statistic it was asked for",
    );
  }
  const indexOf = new Map<string, number>(
    distribs.pops.map((pop, index) => [pop, index]),
  );
  const numPops = job.pops.length;
  const result: DiversityResult = {
    analysis: "diversity",
    pops: job.pops.map(([pop]) => pop),
    numIndividuals: new Uint32Array(numPops),
    unbiasedExpHet: new Float64Array(numPops),
    obsHet: new Float64Array(numPops),
    polyRatio: new Float64Array(numPops),
    numVarsWithValue: new Uint32Array(numPops),
    passStats: passStatsOf(passStats, job.filters),
  };
  for (const [at, [pop, individuals]] of job.pops.entries()) {
    const index = indexOf.get(pop);
    if (index === undefined) {
      throw new Error(
        `popnei_web defect: popnei gave no values of the population ${JSON.stringify(pop)}`,
      );
    }
    result.numIndividuals[at] = individuals.length;
    result.unbiasedExpHet[at] = valueAt(unbiasedExpHet.mean, index);
    result.obsHet[at] = valueAt(obsHet.mean, index);
    result.polyRatio[at] = valueAt(polyVarsRatio.polyRatio, index);
    result.numVarsWithValue[at] = valueAt(
      polyVarsRatio.totNumVariantsWithData,
      index,
    );
  }
  return result;
}

/**
 * The counts of a pass as a result carries them, copied from popnei's:
 * `numVars`, and the counts of each filter of the job under its kind, in
 * the order of the job's filters. Throws a defect when a filter of the job
 * has no entry in popnei's counts, or popnei's counts have an entry of a
 * kind the job does not have.
 */
function passStatsOf(
  stats: PopneiPassStats,
  filters: readonly VariantFilter[],
): PassStats {
  const filtering: Partial<Record<VariantFilterKind, FilteringStats>> = {};
  for (const filter of filters) {
    const counts = ownCounts(stats.filtering, filter.kind);
    if (counts === undefined) {
      throw new Error(
        `popnei_web defect: the counts of the pass have no filter ${filter.kind}`,
      );
    }
    filtering[filter.kind] = {
      varsProcessed: counts.varsProcessed,
      varsKept: counts.varsKept,
    };
  }
  const kinds = new Set<string>(filters.map((filter) => filter.kind));
  const other = Object.keys(stats.filtering).filter((kind) => !kinds.has(kind));
  if (other.length > 0) {
    throw new Error(
      `popnei_web defect: the counts of the pass have filters the job has not: ${other.join(", ")}`,
    );
  }
  return { numVars: stats.numVars, filtering };
}

/** The counts of the filter `kind` in popnei's counts of a pass, read as a
    field of the object itself. */
function ownCounts(
  filtering: PopneiPassStats["filtering"],
  kind: VariantFilterKind,
): PopneiPassStats["filtering"][string] | undefined {
  return Object.hasOwn(filtering, kind) ? filtering[kind] : undefined;
}

/** The value at `index` of an array of popnei's, one per population. */
function valueAt(array: Float64Array | Uint32Array, index: number): number {
  const value = array[index];
  if (value === undefined) {
    throw new Error(
      `popnei_web defect: an array of popnei's result has no value at ${String(index)}`,
    );
  }
  return value;
}

/** The answer of what a call to popnei threw, a `refused` whose message is
    one of popnei's of a range the browser did not give turned into a
    `reopenFailed` of the file `name`. */
function answerOfPopnei(thrown: unknown, name: string): Answer<never> {
  const answer = answerOfThrown(thrown);
  if (
    answer.kind === "refused" &&
    RANGE_NOT_GIVEN.some((start) => answer.message.startsWith(start))
  ) {
    return { kind: "reopenFailed", name, message: answer.message };
  }
  return answer;
}

/** The answer of what the open again of a file that opened before threw:
    a refusal of popnei's is `reopenFailed`, whatever its message, since the
    same file opened before and has changed on the disk. */
function answerOfOpenAgain(thrown: unknown, name: string): Answer<never> {
  const answer = answerOfThrown(thrown);
  return answer.kind === "refused"
    ? { kind: "reopenFailed", name, message: answer.message }
    : answer;
}
