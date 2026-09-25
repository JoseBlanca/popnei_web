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
import type { PerVarDistribs, Step, Variants } from "popnei";

import type { Result } from "../core/result.ts";
import type {
  DiversityJob,
  DiversityResult,
  Job,
  JobResult,
  Progress,
  VariantFilter,
} from "./protocol.ts";

/** A load as the runner opens it: its id, its format and the read options
    of a VCF, `null` for a `.nei` file. */
export interface LoadToOpen {
  /** The load id, new at every pick of the file. */
  readonly fileId: string;
  /** VCF, plain or gzipped, or popnei's `.nei`. */
  readonly format: "vcf" | "nei";
  /** The two options of `openVcf`, both always given; `null` for `.nei`. */
  readonly readOptions: {
    readonly ploidy: number;
    readonly onlyPassed: boolean;
  } | null;
}

/** The file of a load: its name, and what popnei opens. */
export interface LoadFile {
  /** The name of the `File`, which a `reopenFailed` carries. */
  readonly name: string;
  /** popnei's `BytesOrFile`: the `File` in the worker, its bytes or a
      `Blob` in the tests. It is read again at every open of the file. */
  readonly source: Uint8Array | Blob;
}

/** What the worker's script posts for a request. */
export type Answer<T> =
  /** The value of `opened` or of `result`. */
  | { readonly kind: "ok"; readonly value: T }
  /** popnei refused the input, with its message; the worker goes on. */
  | { readonly kind: "refused"; readonly message: string }
  /** The browser no longer reads the file `name`, with popnei's message;
      the worker goes on. */
  | {
      readonly kind: "reopenFailed";
      readonly name: string;
      readonly message: string;
    }
  /** The worker cannot be trusted any more, and closes after posting it. */
  | { readonly kind: "crashed"; readonly message: string }
  /** A request only a defect of the page sends; the worker closes after
      posting it. */
  | { readonly kind: "badRequest"; readonly message: string };

/** What an `open` gives: the individuals of the file and their ploidy. */
export interface Opened {
  /** The names of the individuals, in the order of the file. */
  readonly individuals: readonly string[];
  /** The alleles of a genotype; for a VCF, the one it was read with. */
  readonly ploidy: number;
}

/** The runner of one worker, which holds its one load. */
export interface Runner {
  /**
   * Opens the load, the first request of a worker and its only `open`.
   * `refused` or `reopenFailed` when popnei refuses the file, after which
   * every run is `badRequest`; `badRequest` for a second `open`. Throws
   * only for a defect of ours.
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
  // The diversity is the one member of JobResult in stage 2, and the lint
  // refuses a switch of one case; the fields below stop compiling when a
  // second member comes, which is where the switch goes.
  const buffers = new Set<ArrayBuffer>();
  for (const array of [
    result.numIndividuals,
    result.unbiasedExpHet,
    result.obsHet,
    result.polyRatio,
    result.numVarsWithValue,
  ]) {
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

/** What the runner holds: nothing before the `open`, the load of an open
    that popnei refused, or the load it opened. */
type Held =
  | { readonly kind: "none" }
  | { readonly kind: "refused" }
  | {
      readonly kind: "opened";
      readonly load: LoadToOpen;
      readonly file: LoadFile;
    };

/** A runner holding nothing; `loadPopnei` has to have given `ok`. */
export function createRunner(): Runner {
  let held: Held = { kind: "none" };
  /** The `Variants` of the load opened; `null` before the open, after an
      open that popnei refused, and after an open again that it refused. */
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
      held = { kind: "refused" };
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
      case "refused":
        return {
          kind: "badRequest",
          message: "a run after an open that popnei refused",
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
    // The diversity is the one member of Job in stage 2, as in
    // transferablesOf; a second member is where a switch on `analysis` goes.
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
      if (load.readOptions === null) {
        throw new Error(
          "popnei_web defect: a VCF to open with no read options",
        );
      }
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
    populations of one name, or a filter of individuals, which waits for
    stage 3. */
function whyNotToRun(job: DiversityJob): string | null {
  const names = new Set<string>();
  for (const [name] of job.pops) {
    if (names.has(name)) {
      return `two populations named ${JSON.stringify(name)}`;
    }
    names.add(name);
  }
  if (job.individualFilters.length > 0) {
    return "a filter of individuals, which the runner of stage 2 does not apply";
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
    numVars: passStats.numVars,
    numVarsRead: numVarsReadOf(distribs, job),
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

/** The variants of the file: what its first filter was given, or what the
    pass gave when the job has no filter. */
function numVarsReadOf(distribs: PerVarDistribs, job: DiversityJob): number {
  const first = job.filters[0];
  if (first === undefined) {
    return distribs.passStats.numVars;
  }
  const counts = distribs.passStats.filtering[first.kind];
  if (counts === undefined) {
    throw new Error(
      `popnei_web defect: the counts of the pass have no filter ${first.kind}`,
    );
  }
  return counts.varsProcessed;
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

/** The message of what was thrown, for a `crashed`. */
function messageOf(thrown: unknown): string {
  return thrown instanceof Error ? thrown.message : String(thrown);
}
