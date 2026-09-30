/**
 * The runner of the calculation worker: it loads popnei, opens the variants
 * file of the one load its worker holds, puts on it the list of the
 * individuals kept and then the filters of the variants of each request,
 * which count over the individuals of the list, runs the
 * diversity, the three analyses of the Variants step, the statistics of
 * each individual, the histograms of the variants and the counts of the
 * filters, the principal components, a PCA or a PCoA, and the LD decay of
 * each population, writes the filtered variants as a `.nei` file, and says
 * what to answer when popnei refuses or something breaks
 * (docs/specs/worker/runner.md).
 *
 * It is the one file of the application that calls popnei, and it calls
 * nothing of the worker's globals: the worker's script, runnerWorker.ts,
 * gives it the requests and posts what it returns, so that it runs in node
 * under Vitest, given the bytes of a file where the worker gives the `File`.
 */
import {
  calcLdAndDistPerPop,
  calcPerIndividualStats,
  calcPerVarDistribs,
  doPcaFromVariants,
  doPcoaFromVariants,
  init,
  openVars,
  openVcf,
  version,
  writeVars,
} from "popnei";
import type {
  LdAndDistPerPop,
  LdBins,
  PassStats as PopneiPassStats,
  PerVarDistribs,
  StatsDistrib,
  Step,
  Variants,
  VariantsPcaResult,
  VariantsPcoaResult,
} from "popnei";

import type { Result } from "../core/result.ts";
import { DEFECT_START, messageOf } from "./messages.ts";
import type { FromRunner, WorkerStop } from "./messages.ts";
import type {
  DiversityJob,
  DiversityResult,
  FilterCountsJob,
  FilterCountsResult,
  FilteringStats,
  IndividualChecksJob,
  IndividualChecksResult,
  Job,
  JobResult,
  LdDecayJob,
  LdDecayResult,
  LoadFormat,
  Opened,
  PassStats,
  Pops,
  PcaJob,
  PcaResult,
  Progress,
  VariantChecksJob,
  VariantChecksResult,
  VariantDistrib,
  VariantFilter,
  VariantFilterKind,
  WriteJob,
  Written,
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
 * What the worker's script posts for a request: the value of `opened`, of
 * `result` or of `written`; `refused`, popnei refused the input, and `reopenFailed`,
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
   * the wasm among them, after each of which every run and every write
   * is `badRequest`;
   * `badRequest` for a second `open`. Throws only for a defect of ours.
   */
  open(load: LoadToOpen, file: LoadFile): Answer<Opened>;
  /**
   * Runs the job over the load opened, first opening the file again when
   * the steps of the `Variants` are not the job's, its list of individuals
   * and then its filters of the variants, and gives `told` each
   * `Progress` of popnei as it comes. `badRequest` for a run before the
   * open or of another load, an empty list of individuals and two
   * populations of one name. Throws what `told` throws, and a defect of
   * ours.
   */
  run(job: Job, told: (progress: Progress) => void): Answer<JobResult>;
  /**
   * Writes the variants the job's filters keep, of the individuals of its
   * list, as a `.nei` file, opening the file again as `run` does, and
   * gives `told` each `Progress` of popnei as it comes. The file is a
   * `Blob` made of popnei's bytes, of which the runner keeps nothing; a
   * file of no variant is written, not refused. `badRequest` as for
   * `run`. Throws what `told` throws, and a defect of ours.
   */
  write(
    job: WriteJob,
    told: (progress: Progress) => void,
  ): Answer<Written<Blob>>;
}

/** The statistics the diversity asks popnei for, the three it shows. */
const DIVERSITY_STATS = [
  "obs_het",
  "unbiased_exp_het",
  "poly_vars_ratio",
] as const;

/** The statistics of the histograms of the variants, in the order of
    `VariantChecksResult`. */
const VARIANT_CHECKS_STATS = ["maf", "obs_het", "unbiased_exp_het"] as const;

/** The kind popnei gives the step of `filterIndividuals` in `steps`. */
const INDIVIDUALS_STEP = "individuals";

/**
 * The beginnings of popnei's messages for a range of the file that the
 * browser refused or gave short (`crates/popnei-js/src/source.rs` of
 * popnei at b3f77c8): the file changed on the disk since it was picked.
 */
const RANGE_NOT_GIVEN = [
  "the source could not be read: the browser did not give popnei ",
  "the source could not be read: popnei asked this file for the ",
] as const;

/**
 * popnei's refusal of a key of an object of options that the function
 * does not have, "popnei: `numCompsKept` is not an option of
 * `doPcoaFromVariants`, whose options are `minNumSnps` and
 * `correctByLingoes`" (`onlyTheseOptions` of popnei's
 * `js/popnei/src/arguments.ts`, from `js-v0.1.0-dev.3`): only the runner
 * writes those objects, so it is a defect of ours.
 */
const UNKNOWN_OPTION =
  /^popnei: `[^`]*` is not an option of `[^`]*`, whose options are /u;

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
 * popnei's refusal of an option it does not know, which only the runner
 * can send, is `crashed` with its message after `DEFECT_START`, a defect
 * of ours, which the page tells as one and not as a refusal of the
 * user's settings (stops A 9 and C 6, decided by the owner on 29
 * September 2026).
 */
export function answerOfThrown(thrown: unknown): Answer<never> {
  if (
    thrown instanceof Error &&
    Object.getPrototypeOf(thrown) === Error.prototype
  ) {
    return UNKNOWN_OPTION.test(thrown.message)
      ? { kind: "crashed", message: `${DEFECT_START}${thrown.message}` }
      : { kind: "refused", message: thrown.message };
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
    case "pca":
      return [result.projections, result.explainedVariancePercent];
    case "ldDecay":
      return [
        result.numIndividuals,
        result.numVars,
        result.smallestDist,
        result.largestDist,
        result.numPairs,
        result.meanR2,
        result.sdR2,
        result.rhoPerBp,
        result.r2AtZero,
        result.halfDist,
      ];
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
      /** The individuals the open gave, in the order of the file. */
      readonly individuals: readonly string[];
    };

/** The steps a request asks of the `Variants`: the list of the
    individuals kept, `null` for every individual, and then its filters of
    the variants, in their order, which count over the individuals of the
    list. */
interface Steps {
  readonly individuals: readonly string[] | null;
  readonly filters: readonly VariantFilter[];
}

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
    held = { kind: "opened", load, file, individuals: opened.individuals };
    variants = opened;
    return {
      kind: "ok",
      value: { individuals: opened.individuals, ploidy: opened.ploidy },
    };
  }

  /**
   * The `Variants` of the load with the steps of the request on it: as it
   * is when its steps are those; with them put on it when it holds no
   * step; otherwise freed and the file opened again, the steps put on the
   * new one. The list of individuals goes first, so that the filters of
   * the variants count over the individuals it keeps.
   */
  function variantsWithSteps(
    load: LoadToOpen,
    file: LoadFile,
    wanted: Steps,
  ): Answer<Variants> {
    if (variants !== null) {
      const steps = variants.steps;
      if (stepsAre(steps, wanted)) {
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
    if (wanted.individuals !== null) {
      try {
        variants.filterIndividuals(wanted.individuals);
      } catch (thrown: unknown) {
        return answerOfPopnei(thrown, file.name);
      }
    }
    for (const filter of wanted.filters) {
      try {
        putFilter(variants, filter);
      } catch (thrown: unknown) {
        return answerOfPopnei(thrown, file.name);
      }
    }
    return { kind: "ok", value: variants };
  }

  /**
   * The load opened, for a request of `what`, a run or a write, of the
   * load `fileId`: `badRequest` before the open, after an open that gave
   * no `Variants`, and for another load.
   */
  function openedFor(
    what: "run" | "write",
    fileId: string,
  ): Answer<Extract<Held, { readonly kind: "opened" }>> {
    switch (held.kind) {
      case "none":
        return { kind: "badRequest", message: `a ${what} before the open` };
      case "notOpened":
        return {
          kind: "badRequest",
          message: `a ${what} after an open that gave no variants`,
        };
      case "opened":
        break;
    }
    if (fileId !== held.load.fileId) {
      return {
        kind: "badRequest",
        message: `a ${what} of the load ${fileId} in the worker of the load ${held.load.fileId}`,
      };
    }
    return { kind: "ok", value: held };
  }

  function run(
    job: Job,
    told: (progress: Progress) => void,
  ): Answer<JobResult> {
    const theLoad = openedFor("run", job.fileId);
    if (theLoad.kind !== "ok") {
      return theLoad;
    }
    const { load, file, individuals } = theLoad.value;
    const why = whyNotToRun(job);
    if (why !== null) {
      return { kind: "badRequest", message: why };
    }
    const withSteps = variantsWithSteps(load, file, stepsOf(job));
    if (withSteps.kind !== "ok") {
      return withSteps;
    }
    const pass: Pass = { variants: withSteps.value, name: file.name, told };
    switch (job.analysis) {
      case "diversity":
        return runDiversity(pass, job);
      case "individualChecks":
        return runIndividualChecks(pass, job, individuals);
      case "variantChecks":
        return runVariantChecks(pass, job);
      case "filterCounts":
        return runFilterCounts(pass, job);
      case "pca":
        return runPca(pass, job, individuals);
      case "ldDecay":
        return runLdDecay(pass, job);
    }
  }

  function write(
    job: WriteJob,
    told: (progress: Progress) => void,
  ): Answer<Written<Blob>> {
    const theLoad = openedFor("write", job.fileId);
    if (theLoad.kind !== "ok") {
      return theLoad;
    }
    const { load, file } = theLoad.value;
    const why = whyNotToWrite(job);
    if (why !== null) {
      return { kind: "badRequest", message: why };
    }
    const withSteps = variantsWithSteps(load, file, {
      individuals: job.individuals,
      filters: job.filters,
    });
    if (withSteps.kind !== "ok") {
      return withSteps;
    }
    return writeFile({ variants: withSteps.value, name: file.name, told }, job);
  }

  return { open, run, write };
}

/** The steps a job asks for: its list of individuals, of every job but
    the statistics of each individual, which read every individual, and
    its filters of the variants. */
function stepsOf(job: Job): Steps {
  switch (job.analysis) {
    case "individualChecks":
      return { individuals: null, filters: job.filters };
    case "diversity":
    case "variantChecks":
    case "filterCounts":
    case "pca":
    case "ldDecay":
      return { individuals: job.individuals, filters: job.filters };
  }
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

/** Whether popnei's steps are those wanted: first, when a list is wanted,
    the step of the individuals naming the same individuals in the same
    order; then the filters, the same kinds in the same order, each
    argument of a step `===` to the field of that name of its filter. */
function stepsAre(steps: readonly Step[], wanted: Steps): boolean {
  const numListSteps = wanted.individuals === null ? 0 : 1;
  if (steps.length !== numListSteps + wanted.filters.length) {
    return false;
  }
  return steps.every((step, index) => {
    if (index < numListSteps) {
      if (wanted.individuals === null) {
        throw new Error("popnei_web defect: a step of a list not wanted");
      }
      return stepIsIndividuals(step, wanted.individuals);
    }
    const filter = wanted.filters[index - numListSteps];
    if (filter === undefined) {
      throw new Error("popnei_web defect: a step beyond those wanted");
    }
    return stepIsFilter(step, filter);
  });
}

/** Whether a step of popnei's is the filter: the same kind, and each of
    its arguments `===` to the field of that name of the filter. */
function stepIsFilter(step: Step, filter: VariantFilter): boolean {
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
}

/** Whether a step of popnei's is that of the individuals, naming these
    individuals in this order, compared name by name. */
function stepIsIndividuals(
  step: Step,
  individuals: readonly string[],
): boolean {
  if (step.kind !== INDIVIDUALS_STEP) {
    return false;
  }
  const named: unknown = step.args["individuals"];
  return (
    Array.isArray(named) &&
    named.length === individuals.length &&
    individuals.every((individual, index) => named[index] === individual)
  );
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

/** Why the runner cannot run a job, or `null` when it can, all defects of
    the page, checked before any step is put: an empty list of individuals,
    which core never sends, since an analysis cannot start when the filters
    keep no individual; of a diversity and of an LD decay, two populations
    of one name, of which popnei would keep the last; and of the principal
    components, fewer than 1 component to keep. */
function whyNotToRun(job: Job): string | null {
  const why = whyNotTheList(stepsOf(job).individuals);
  if (why !== null) {
    return why;
  }
  switch (job.analysis) {
    case "diversity":
    case "ldDecay":
      return whyNotThePops(job.pops);
    case "pca":
      return job.numCompsKept < 1
        ? `numCompsKept ${String(job.numCompsKept)}: the principal components keep 1 at least`
        : null;
    case "individualChecks":
    case "variantChecks":
    case "filterCounts":
      return null;
  }
}

/** Why the populations cannot be given to popnei, or `null`: two of them
    share a name. */
function whyNotThePops(pops: Pops): string | null {
  const names = new Set<string>();
  for (const [name] of pops) {
    if (names.has(name)) {
      return `two populations named ${JSON.stringify(name)}`;
    }
    names.add(name);
  }
  return null;
}

/** Why the runner cannot write a job, or `null` when it can: an empty
    list of individuals, a defect of the page, as for a run. */
function whyNotToWrite(job: WriteJob): string | null {
  return whyNotTheList(job.individuals);
}

/** Why a list of individuals cannot be put, or `null`: it is empty, which
    core never sends, since nothing starts when the filters keep no
    individual. */
function whyNotTheList(individuals: readonly string[] | null): string | null {
  return individuals !== null && individuals.length === 0
    ? "an empty list of individuals"
    : null;
}

/** A pass to make: the `Variants` with the steps of the request on it, the
    name of its file, for a `reopenFailed`, and the function told each
    `Progress`. */
interface Pass {
  readonly variants: Variants;
  readonly name: string;
  readonly told: (progress: Progress) => void;
}

/**
 * Makes the pass of `consume`, the one call to popnei that reads the file,
 * with `told` given every `Progress`, and answers what it threw as popnei's
 * refusal. What `told` throws is thrown on, a defect of ours, and not taken
 * for popnei's refusal nor dropped: while a pass reads it ends the pass and
 * popnei's call throws that same value back; at the end of the run popnei's
 * call returns, and it is thrown here.
 */
function passOf<T>(pass: Pass, consume: (variants: Variants) => T): Answer<T> {
  const { variants, name, told } = pass;
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
  let value: T;
  try {
    value = consume(variants);
  } catch (thrown: unknown) {
    if (thrownByTold.some((caught) => caught === thrown)) {
      throw thrown;
    }
    return answerOfPopnei(thrown, name);
  }
  // popnei throws back what `told` threw while a pass reads, and drops what
  // it threw at the calls of the end of the run, which is thrown here.
  if (thrownByTold.length > 0) {
    throw thrownByTold[0];
  }
  return { kind: "ok", value };
}

/** Runs `calcPerVarDistribs` over the populations of the job and makes
    the `DiversityResult` of it. */
function runDiversity(pass: Pass, job: DiversityJob): Answer<JobResult> {
  const answer = passOf(pass, (variants) =>
    calcPerVarDistribs(variants, {
      pops: Object.fromEntries(job.pops),
      stats: DIVERSITY_STATS,
      minNumIndividuals: job.minNumIndividuals,
      polyThreshold: job.polyThreshold,
    }),
  );
  if (answer.kind !== "ok") {
    return answer;
  }
  return { kind: "ok", value: diversityResultOf(answer.value, job) };
}

/**
 * Runs `calcPerIndividualStats` and gives popnei's names and arrays as
 * they are, which popnei copies out of the memory of wasm. Throws a defect
 * when the names are not `individuals`, those the open gave, in their
 * order, since the numbers would then be read under other names.
 */
function runIndividualChecks(
  pass: Pass,
  job: IndividualChecksJob,
  individuals: readonly string[],
): Answer<JobResult> {
  const answer = passOf(pass, calcPerIndividualStats);
  if (answer.kind !== "ok") {
    return answer;
  }
  const stats = answer.value;
  if (
    stats.individuals.length !== individuals.length ||
    stats.individuals.some((name, index) => name !== individuals[index])
  ) {
    throw new Error(
      "popnei_web defect: the statistics of each individual are not of the individuals the open gave, in their order",
    );
  }
  const result: IndividualChecksResult = {
    analysis: "individualChecks",
    individuals: stats.individuals,
    missingGtRate: stats.missingGtRate,
    obsHetRate: stats.obsHetRate,
    passStats: passStatsOf(stats.passStats, job.filters),
  };
  return { kind: "ok", value: result };
}

/**
 * Runs `calcPerVarDistribs` over the individuals of the pass, those of the
 * job's list when it has one, as one population, with
 * the bins of the job, and gives one copy of the edges, which popnei's
 * three distributions share, and of each distribution its mean and its
 * counts.
 */
function runVariantChecks(
  pass: Pass,
  job: VariantChecksJob,
): Answer<JobResult> {
  const answer = passOf(pass, (variants) =>
    calcPerVarDistribs(variants, {
      stats: VARIANT_CHECKS_STATS,
      minNumIndividuals: job.minNumIndividuals,
      histKwargs: { numBins: job.numBins, range: job.range },
    }),
  );
  if (answer.kind !== "ok") {
    return answer;
  }
  const { maf, obsHet, unbiasedExpHet, passStats } = answer.value;
  if (maf === null || obsHet === null || unbiasedExpHet === null) {
    throw new Error(
      "popnei_web defect: calcPerVarDistribs gave no value of a statistic it was asked for",
    );
  }
  const result: VariantChecksResult = {
    analysis: "variantChecks",
    binEdges: Float64Array.from(maf.histBinEdges),
    maf: variantDistribOf(maf),
    obsHet: variantDistribOf(obsHet),
    unbiasedExpHet: variantDistribOf(unbiasedExpHet),
    passStats: passStatsOf(passStats, job.filters),
  };
  return { kind: "ok", value: result };
}

/** The mean and the counts of popnei's distribution of its one
    population, `numBins` counts. */
function variantDistribOf(distrib: StatsDistrib): VariantDistrib {
  return { mean: valueAt(distrib.mean, 0), counts: distrib.histCounts };
}

/**
 * Iterates popnei's blocks of the genotypes alone to their end, keeping
 * none, and gives the counts of the pass, read after it: they come also
 * when the filters keep no variant, where every calculation of popnei
 * refuses the pass. What the iteration throws, at a block, is caught
 * around the whole of it, as around a call.
 */
function runFilterCounts(pass: Pass, job: FilterCountsJob): Answer<JobResult> {
  const answer = passOf(pass, (variants) => {
    const blocks = variants.iterBlocks({ fields: [] });
    let next = blocks.next();
    while (next.done !== true) {
      next = blocks.next();
    }
    return blocks.passStats;
  });
  if (answer.kind !== "ok") {
    return answer;
  }
  const result: FilterCountsResult = {
    analysis: "filterCounts",
    passStats: passStatsOf(answer.value, job.filters),
  };
  return { kind: "ok", value: result };
}

/**
 * Runs `calcLdAndDistPerPop` over the populations of the job and makes the
 * `LdDecayResult` of it. The options object is written with its keys
 * alone, since popnei refuses a key it does not know, and the populations
 * with `Object.fromEntries`, which makes a population named `__proto__` a
 * field of its own.
 */
function runLdDecay(pass: Pass, job: LdDecayJob): Answer<JobResult> {
  const answer = passOf(pass, (variants) =>
    calcLdAndDistPerPop(variants, {
      pops: Object.fromEntries(job.pops),
      minDist: job.minDist,
      maxDist: job.maxDist,
      numBins: job.numBins,
      maxAllowedMaf: job.maxAllowedMaf,
    }),
  );
  if (answer.kind !== "ok") {
    return answer;
  }
  return { kind: "ok", value: ldDecayResultOf(answer.value, job) };
}

/**
 * Runs the principal components of the job's method over the pass and
 * keeps the first `numCompsKept` components. Each options object of popnei
 * is written with its keys alone, and never made from the job: popnei
 * refuses a key it does not know. The PCA asks for no weights of the
 * variants, which makes one pass, and counts every allele but the major one
 * the same, so that a variant of more than two alleles is not refused; the
 * PCoA asks for Lingoes' correction, which popnei does not make by default,
 * as the owner decided on 27 September 2026.
 */
function runPca(
  pass: Pass,
  job: PcaJob,
  individuals: readonly string[],
): Answer<JobResult> {
  switch (job.method) {
    case "pca": {
      const answer = passOf(pass, (variants) =>
        doPcaFromVariants(variants, {
          numPrinComps: 0,
          transformToBiallelic: true,
        }),
      );
      if (answer.kind !== "ok") {
        return answer;
      }
      return {
        kind: "ok",
        value: pcaResultOf(answer.value, job, individuals, {
          numVarsUsed: answer.value.usedVars.length,
          lingoesConstant: null,
          negativeEigenvaluesPercent: null,
        }),
      };
    }
    case "pcoa": {
      const answer = passOf(pass, (variants) =>
        doPcoaFromVariants(variants, { correctByLingoes: true }),
      );
      if (answer.kind !== "ok") {
        return answer;
      }
      return {
        kind: "ok",
        value: pcaResultOf(answer.value, job, individuals, {
          numVarsUsed: null,
          lingoesConstant: answer.value.lingoesConstant,
          negativeEigenvaluesPercent: answer.value.negativeEigenvaluesPercent,
        }),
      };
    }
  }
}

/** The fields of a `PcaResult` that one method has and the other gives as
    `null`. */
type OfTheMethod = Pick<
  PcaResult,
  "numVarsUsed" | "lingoesConstant" | "negativeEigenvaluesPercent"
>;

/**
 * The `PcaResult` of popnei's, cut to the first `numCompsKept` components:
 * new arrays of the projections, each row the first `numComps` numbers of
 * popnei's row, and of the first `numComps` percentages. Throws a defect
 * when popnei's individuals are not those the pass was to give, the job's
 * list or, when it has none, those of the open, in their order, or when its
 * projections are not the individuals × its components, since the numbers
 * would then be read under other names.
 */
function pcaResultOf(
  found: VariantsPcaResult | VariantsPcoaResult,
  job: PcaJob,
  ofTheOpen: readonly string[],
  ofTheMethod: OfTheMethod,
): PcaResult {
  const expected = job.individuals ?? ofTheOpen;
  const { individuals, numComps: numCompsFound } = found;
  if (
    individuals.length !== expected.length ||
    individuals.some((name, index) => name !== expected[index])
  ) {
    throw new Error(
      "popnei_web defect: the principal components are not of the individuals the pass was to give, in their order",
    );
  }
  const numIndividuals = individuals.length;
  if (found.projections.length !== numIndividuals * numCompsFound) {
    throw new Error(
      `popnei_web defect: popnei gave ${String(found.projections.length)} projections for ${String(numIndividuals)} individuals and ${String(numCompsFound)} components`,
    );
  }
  const numComps = Math.min(job.numCompsKept, numCompsFound);
  const projections = new Float64Array(numIndividuals * numComps);
  for (let row = 0; row < numIndividuals; row += 1) {
    const start = row * numCompsFound;
    projections.set(
      found.projections.subarray(start, start + numComps),
      row * numComps,
    );
  }
  return {
    analysis: "pca",
    method: job.method,
    individuals,
    numComps,
    numCompsFound,
    projections,
    explainedVariancePercent: found.explainedVariancePercent.slice(0, numComps),
    ...ofTheMethod,
    passStats: passStatsOf(found.passStats, job.filters),
  };
}

/**
 * Writes the variants of the pass with `writeVars`, with popnei's own size
 * of batch, and makes a `Blob` of the bytes, keeping no reference to them,
 * so that the heap of the worker can give them back once the `Blob` holds
 * the file. A file of no variant is written like any other. Throws a
 * defect when the bytes are over a buffer that is not an `ArrayBuffer`,
 * which a `Blob` does not take: popnei copies them into one of its own, and
 * a copy of ours would hold the file twice.
 */
function writeFile(pass: Pass, job: WriteJob): Answer<Written<Blob>> {
  const answer = passOf(pass, (variants) => writeVars(variants));
  if (answer.kind !== "ok") {
    return answer;
  }
  const { bytes, passStats } = answer.value;
  if (!isOverArrayBuffer(bytes)) {
    throw new Error(
      "popnei_web defect: the bytes of the written file are over a buffer that is not an ArrayBuffer",
    );
  }
  const file = new Blob([bytes]);
  const result: Written<Blob> = {
    format: job.format,
    file,
    numBytes: file.size,
    passStats: passStatsOf(passStats, job.filters),
  };
  return { kind: "ok", value: result };
}

/** Whether the bytes are over an `ArrayBuffer`, and not a
    `SharedArrayBuffer`. */
function isOverArrayBuffer(
  bytes: Uint8Array,
): bytes is Uint8Array<ArrayBuffer> {
  return bytes.buffer instanceof ArrayBuffer;
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
 * The `LdDecayResult` of popnei's result, every array in the order of the
 * job: the bins' distances copied from the first population, and the
 * numbers of each population found by its name among popnei's own fields.
 * Throws a defect when popnei gave no values of a population of the job,
 * as for a population named `__proto__`, which popnei's result holds as the
 * parent of its objects and not as a field of theirs; when a population
 * has another number of bins than the job; and when the distances of the
 * bins differ between two populations, which popnei's rule makes the same.
 */
function ldDecayResultOf(ld: LdAndDistPerPop, job: LdDecayJob): LdDecayResult {
  const numPops = job.pops.length;
  const numBins = job.numBins;
  const first = job.pops[0];
  if (first === undefined) {
    throw new Error(
      "popnei_web defect: calcLdAndDistPerPop gave a result for no population",
    );
  }
  const firstBins = binsOf(ld, first[0], numBins);
  const result: LdDecayResult = {
    analysis: "ldDecay",
    pops: job.pops.map(([pop]) => pop),
    numIndividuals: new Uint32Array(numPops),
    numVars: new Float64Array(numPops),
    smallestDist: firstBins.smallestDist.slice(),
    largestDist: firstBins.largestDist.slice(),
    numPairs: new Float64Array(numPops * numBins),
    meanR2: new Float64Array(numPops * numBins),
    sdR2: new Float64Array(numPops * numBins),
    rhoPerBp: new Float64Array(numPops),
    r2AtZero: new Float64Array(numPops),
    halfDist: new Float64Array(numPops),
    passStats: passStatsOf(ld.passStats, job.filters),
  };
  for (const [at, [pop, individuals]] of job.pops.entries()) {
    const bins = binsOf(ld, pop, numBins);
    if (
      !sameValues(bins.smallestDist, firstBins.smallestDist) ||
      !sameValues(bins.largestDist, firstBins.largestDist)
    ) {
      throw new Error(
        `popnei_web defect: the bins of the population ${JSON.stringify(pop)} are not at the distances of those of ${JSON.stringify(first[0])}`,
      );
    }
    const decay = ownValueOf(ld.decayPerPop, pop, "decayPerPop");
    result.numIndividuals[at] = individuals.length;
    result.numVars[at] = ownValueOf(ld.numVarsPerPop, pop, "numVarsPerPop");
    result.numPairs.set(bins.numPairs, at * numBins);
    result.meanR2.set(bins.meanR2, at * numBins);
    result.sdR2.set(bins.sdR2, at * numBins);
    result.rhoPerBp[at] = decay.rhoPerBp;
    result.r2AtZero[at] = decay.r2AtZero;
    result.halfDist[at] = decay.halfDist;
  }
  return result;
}

/** The bins popnei gave the population `pop`, each of its five arrays of
    `numBins` values; throws a defect otherwise. */
function binsOf(ld: LdAndDistPerPop, pop: string, numBins: number): LdBins {
  const bins = ownValueOf(ld.perPop, pop, "perPop");
  for (const array of [
    bins.smallestDist,
    bins.largestDist,
    bins.numPairs,
    bins.meanR2,
    bins.sdR2,
  ]) {
    if (array.length !== numBins) {
      throw new Error(
        `popnei_web defect: popnei gave the population ${JSON.stringify(pop)} ${String(array.length)} bins, not ${String(numBins)}`,
      );
    }
  }
  return bins;
}

/** The value of the population `pop` in the object `name` of popnei's
    result, read only when it is a field of the object itself: a lookup or
    `in` would find a population named `__proto__` in the object's parent.
    Throws a defect when popnei gave none. */
function ownValueOf<T>(
  record: Readonly<Record<string, T>>,
  pop: string,
  name: string,
): T {
  const value = Object.hasOwn(record, pop) ? record[pop] : undefined;
  if (value === undefined) {
    throw new Error(
      `popnei_web defect: popnei gave no ${name} of the population ${JSON.stringify(pop)}`,
    );
  }
  return value;
}

/** Whether two arrays hold the same numbers in the same order. */
function sameValues(a: Float64Array, b: Float64Array): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
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
