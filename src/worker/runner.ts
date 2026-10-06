/**
 * The runner of the calculation worker: it loads popnei, opens the variants
 * file of the one load its worker holds, puts on it the list of the
 * individuals kept and then the filters of the variants of each request,
 * which count over the individuals of the list, runs the
 * diversity, the three analyses of the Variants step, the statistics of
 * each individual, the histograms of the variants and the counts of the
 * filters, the principal components, a PCA or a PCoA, the distances
 * between populations with the order of their heatmap, the LD decay of
 * each population, and the summary of the variants file, its chromosomes
 * and the variants on each, the histograms of the variants and the
 * statistics of each individual from one pass, writes the filtered variants as a `.nei` file,
 * and says what to answer when popnei refuses or something breaks
 * (docs/specs/worker/runner.md).
 *
 * It is the one file of the application that calls popnei, and it calls
 * nothing of the worker's globals: the worker's script, runnerWorker.ts,
 * gives it the requests and posts what it returns, so that it runs in node
 * under Vitest, given the bytes of a file where the worker gives the `File`.
 */
import {
  Distances,
  calcLdAndDistPerPop,
  calcPerIndividualStats,
  calcPerVarDistribs,
  calcPopDiversity,
  calcPopDists,
  calcVariantsSummary,
  correctDistsByLingoes,
  doPcaFromVariants,
  doPcoa,
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
  PcoaResult,
  PerIndividualStats,
  PerVarDistribs,
  PopDists,
  PopDiversity,
  PopDiversityStat,
  StatsDistrib,
  Step,
  VarDensity,
  Variants,
  VariantsPcaResult,
  VariantsPcoaResult,
} from "popnei";

import type { Result } from "../core/result.ts";
import { DEFECT_START, messageOf } from "./messages.ts";
import type { FromRunner, WorkerStop } from "./messages.ts";
import { ONE_WINDOW_PER_CHROM, SHOWN_MEASURES } from "./protocol.ts";
import type {
  DiversityJob,
  DiversityResult,
  PopDiversityFields,
  FilterCountsJob,
  FilterCountsResult,
  FilteringStats,
  HeatmapOrder,
  IndividualChecksJob,
  IndividualStatsPart,
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
  PopDistsJob,
  PopDistsResult,
  Progress,
  ShownMeasure,
  VariantChecksJob,
  VariantDistrib,
  VariantFilter,
  VariantFilterKind,
  VariantStatsPart,
  VariantsSummaryJob,
  VariantsSummaryResult,
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

/** The statistics the diversity asks `calcPopDiversity` for, from stage
    5: F, the alleles, the private alleles and the spectrum. */
const POP_DIVERSITY_STATS = [
  "num_alleles",
  "fis",
  "private_alleles",
  "folded_sfs",
] as const;

/** The statistics asked of `calcPopDiversity` for one population, without
    the private alleles: one population has every allele it called as
    private, since no other holds it. */
const ONE_POP_DIVERSITY_STATS = ["num_alleles", "fis", "folded_sfs"] as const;

/** The statistics of the histograms of the variants, in the order of
    `VariantChecksResult`. */
const VARIANT_CHECKS_STATS = [
  "missing_rate",
  "maf",
  "obs_het",
  "unbiased_exp_het",
] as const;

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
        result.fis,
        result.numAllelesMean,
        result.numAllelesInDraw,
        result.privateAllelesTotal,
        result.privateAllelesMean,
        result.privateAllelesInDraw,
        result.numVarsInDraw,
        ...result.foldedSfs.filter((sfs) => sfs !== null),
      ];
    case "individualChecks":
      return individualStatsArrays(result);
    case "variantChecks":
      return variantStatsArrays(result);
    case "filterCounts":
      return [];
    case "variantsSummary":
      return [
        result.numVarsPerChrom,
        ...variantStatsArrays(result.perVar),
        ...individualStatsArrays(result.perIndividual),
      ];
    case "pca":
      return [result.projections, result.explainedVariancePercent];
    case "popDists":
      return [
        result.numIndividuals,
        result.fst,
        result.dest,
        result.numVarsPerPair,
        ...[result.order.fst, result.order.dest].flatMap((order) =>
          order.kind === "pcoa" ? [order.order] : [],
        ),
      ];
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

/** The typed arrays of the histograms of the variants. */
function variantStatsArrays(
  part: VariantStatsPart,
): readonly (Float64Array | Uint32Array)[] {
  return [
    part.binEdges,
    part.missingRate.counts,
    part.maf.counts,
    part.obsHet.counts,
    part.unbiasedExpHet.counts,
  ];
}

/** The typed arrays of the statistics of each individual. */
function individualStatsArrays(
  part: IndividualStatsPart,
): readonly Float64Array[] {
  return [part.missingGtRate, part.obsHetRate];
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
      case "variantsSummary":
        return runVariantsSummary(pass, job, individuals);
      case "pca":
        return runPca(pass, job, individuals);
      case "popDists":
        return runPopDists(pass, job);
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
    the statistics of each individual and the summary of the variants
    file, which read every individual, and its filters of the variants. */
function stepsOf(job: Job): Steps {
  switch (job.analysis) {
    case "individualChecks":
    case "variantsSummary":
      return { individuals: null, filters: job.filters };
    case "diversity":
    case "variantChecks":
    case "filterCounts":
    case "pca":
    case "popDists":
    case "ldDecay":
      return { individuals: job.individuals, filters: job.filters };
  }
}

/** Opens the file of the load with popnei, reading its `source` anew; a
    VCF with no ploidy is opened without one, and popnei reads it from the
    file. */
function openSource(load: LoadToOpen, file: LoadFile): Variants {
  const source = file.source;
  switch (load.format) {
    case "nei":
      return openVars(source);
    case "vcf": {
      const { ploidy, onlyPassed } = load.readOptions;
      return openVcf(
        source,
        ploidy === null ? { onlyPassed } : { ploidy, onlyPassed },
      );
    }
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
    keep no individual; of a diversity, of the distances between
    populations and of an LD decay, two populations of one name, of which popnei would keep the last; and of the principal
    components, fewer than 1 component to keep. */
function whyNotToRun(job: Job): string | null {
  const why = whyNotTheList(stepsOf(job).individuals);
  if (why !== null) {
    return why;
  }
  switch (job.analysis) {
    case "diversity":
    case "popDists":
    case "ldDecay":
      return whyNotThePops(job.pops);
    case "pca":
      return job.numCompsKept < 1
        ? `numCompsKept ${String(job.numCompsKept)}: the principal components keep 1 at least`
        : null;
    case "individualChecks":
    case "variantChecks":
    case "filterCounts":
    case "variantsSummary":
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

/**
 * Runs `calcPerVarDistribs` over the populations of the job and then, when
 * `popDiversityPops` names any, `calcPopDiversity` over those, a second
 * pass over the same steps, and makes the `DiversityResult` of both. The
 * progress of the two calls, each of which popnei tells as pass 1 of 1, is
 * told as passes 1 and 2 of 2, so that the bar fills once; with no second
 * call, as pass 1 of 1. The options objects are written with their keys
 * alone, since popnei refuses a key it does not know, and the populations
 * with `Object.fromEntries`, which makes a population named `__proto__` a
 * field of its own.
 */
function runDiversity(pass: Pass, job: DiversityJob): Answer<JobResult> {
  const numPasses = job.popDiversityPops.length > 0 ? 2 : 1;
  const distribs = passOf(passNumbered(pass, 1, numPasses), (variants) =>
    calcPerVarDistribs(variants, {
      pops: Object.fromEntries(job.pops),
      stats: DIVERSITY_STATS,
      minNumIndividuals: job.minNumIndividuals,
      polyThreshold: job.polyThreshold,
    }),
  );
  if (distribs.kind !== "ok") {
    return distribs;
  }
  if (numPasses === 1) {
    return { kind: "ok", value: diversityResultOf(distribs.value, null, job) };
  }
  const given = new Set(job.popDiversityPops);
  const stats =
    job.popDiversityPops.length > 1
      ? POP_DIVERSITY_STATS
      : ONE_POP_DIVERSITY_STATS;
  const diversity = passOf(passNumbered(pass, 2, numPasses), (variants) =>
    calcPopDiversity(variants, {
      pops: Object.fromEntries(job.pops.filter(([pop]) => given.has(pop))),
      stats,
      numCalledAlleles: job.numCalledAlleles,
      minNumIndividuals: job.minNumIndividuals,
    }),
  );
  if (diversity.kind !== "ok") {
    return diversity;
  }
  return {
    kind: "ok",
    value: diversityResultOf(
      distribs.value,
      { result: diversity.value, stats },
      job,
    ),
  };
}

/** What `calcPopDiversity` gave, and the statistics it was asked for. */
interface PopDiversityCall {
  readonly result: PopDiversity;
  readonly stats: readonly PopDiversityStat[];
}

/** The pass of `pass` whose progress is told as the pass `number` of
    `numPasses`, the other two fields as popnei gave them. */
function passNumbered(pass: Pass, number: number, numPasses: number): Pass {
  return {
    ...pass,
    told: (progress) => {
      pass.told({ ...progress, pass: number, numPasses });
    },
  };
}

/**
 * Runs `calcPerIndividualStats` and gives popnei's names and arrays as
 * they are, `individualStatsPartOf`.
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
  return {
    kind: "ok",
    value: {
      analysis: "individualChecks",
      ...individualStatsPartOf(answer.value, individuals, job.filters),
    },
  };
}

/**
 * The statistics of each individual made of popnei's: its names and
 * arrays as they are, which popnei copies out of the memory of wasm.
 * Throws a defect when the names are not `individuals`, those the open
 * gave, in their order, since the numbers would then be read under other
 * names.
 */
function individualStatsPartOf(
  stats: PerIndividualStats,
  individuals: readonly string[],
  filters: readonly VariantFilter[],
): IndividualStatsPart {
  if (
    stats.individuals.length !== individuals.length ||
    stats.individuals.some((name, index) => name !== individuals[index])
  ) {
    throw new Error(
      "popnei_web defect: the statistics of each individual are not of the individuals the open gave, in their order",
    );
  }
  return {
    individuals: stats.individuals,
    missingGtRate: stats.missingGtRate,
    obsHetRate: stats.obsHetRate,
    passStats: passStatsOf(stats.passStats, filters),
  };
}

/**
 * Runs `calcPerVarDistribs` over the individuals of the pass, those of the
 * job's list when it has one, as one population, with
 * the bins of the job, `variantStatsPartOf`.
 */
function runVariantChecks(
  pass: Pass,
  job: VariantChecksJob,
): Answer<JobResult> {
  const answer = passOf(pass, (variants) =>
    calcPerVarDistribs(variants, perVarOptionsOf(job)),
  );
  if (answer.kind !== "ok") {
    return answer;
  }
  return {
    kind: "ok",
    value: {
      analysis: "variantChecks",
      ...variantStatsPartOf(answer.value, job.filters),
    },
  };
}

/** The options of `calcPerVarDistribs` of the histograms of the variants
    of `job`, written with their keys alone, since popnei refuses a key it
    does not know. */
function perVarOptionsOf(job: VariantChecksJob | VariantsSummaryJob): {
  readonly stats: typeof VARIANT_CHECKS_STATS;
  readonly minNumIndividuals: number;
  readonly histKwargs: {
    readonly numBins: number;
    readonly range: readonly [number, number];
  };
} {
  return {
    stats: VARIANT_CHECKS_STATS,
    minNumIndividuals: job.minNumIndividuals,
    histKwargs: { numBins: job.numBins, range: job.range },
  };
}

/**
 * The histograms of the variants made of popnei's distributions: one copy
 * of the edges, which popnei's four distributions share, and of each
 * distribution its mean and its counts. Throws a defect when popnei gave
 * no value of one of the four, which it was asked for.
 */
function variantStatsPartOf(
  distribs: PerVarDistribs,
  filters: readonly VariantFilter[],
): VariantStatsPart {
  const { missingRate, maf, obsHet, unbiasedExpHet, passStats } = distribs;
  if (
    missingRate === null ||
    maf === null ||
    obsHet === null ||
    unbiasedExpHet === null
  ) {
    throw new Error(
      "popnei_web defect: calcPerVarDistribs gave no value of a statistic it was asked for",
    );
  }
  return {
    binEdges: Float64Array.from(maf.histBinEdges),
    missingRate: variantDistribOf(missingRate),
    maf: variantDistribOf(maf),
    obsHet: variantDistribOf(obsHet),
    unbiasedExpHet: variantDistribOf(unbiasedExpHet),
    passStats: passStatsOf(passStats, filters),
  };
}

/**
 * The chromosomes of the summary of the variants file made of popnei's
 * density of one window per chromosome: its chromosomes in popnei's order
 * and the counts of their windows. Throws a defect when a chromosome has
 * more than one window, a window does not start at 1, the arrays differ in
 * length, or the counts do not add up to the variants of the pass, which a
 * window of 2^53 − 1 base pairs rules out.
 */
export function chromsOf(
  density: VarDensity,
): Pick<VariantsSummaryResult, "chroms" | "numVarsPerChrom"> {
  const { chroms, start, numVars, passStats } = density;
  let counted = 0;
  for (const count of numVars) {
    counted += count;
  }
  if (
    new Set(chroms).size !== chroms.length ||
    start.length !== chroms.length ||
    numVars.length !== chroms.length ||
    start.some((first) => first !== 1) ||
    counted !== passStats.numVars
  ) {
    throw new Error(
      "popnei_web defect: calcVarDensity gave other than one window per chromosome, from the position 1, whose counts add up to the variants of the pass",
    );
  }
  return { chroms, numVarsPerChrom: numVars };
}

/**
 * Runs `calcVariantsSummary`, the one pass over every variant and every
 * individual of the file, with its three parts: `density` with one window
 * per chromosome, `chromLengths` empty so that the lengths of the source
 * are not used (with them, a header of thousands of scaffolds would give
 * each one with 0 variants, and a variant past the length its header
 * gives would refuse a file otherwise usable); `perVar`, the histograms
 * of the variants with the bins of the job, over every individual as one
 * population; and `perIndividual`. Each part is the same to the bit as
 * its own call gives it. The job has no filter. Throws a defect when
 * popnei gives no value of a part it was asked for.
 */
function runVariantsSummary(
  pass: Pass,
  job: VariantsSummaryJob,
  individuals: readonly string[],
): Answer<JobResult> {
  const answer = passOf(pass, (variants) =>
    calcVariantsSummary(variants, {
      density: { windowSize: ONE_WINDOW_PER_CHROM, chromLengths: {} },
      perVar: perVarOptionsOf(job),
      perIndividual: {},
    }),
  );
  if (answer.kind !== "ok") {
    return answer;
  }
  const { density, perVar, perIndividual, passStats } = answer.value;
  if (density === null || perVar === null || perIndividual === null) {
    throw new Error(
      "popnei_web defect: calcVariantsSummary gave no value of a part it was asked for",
    );
  }
  const result: VariantsSummaryResult = {
    analysis: "variantsSummary",
    ...chromsOf(density),
    perVar: variantStatsPartOf(perVar, job.filters),
    perIndividual: individualStatsPartOf(
      perIndividual,
      individuals,
      job.filters,
    ),
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

/** The measures of the distances between populations asked of popnei,
    those the application shows, from the one pass. */
const POP_DISTS_MEASURES = SHOWN_MEASURES;

/**
 * Runs `calcPopDists` over the populations of the job, with no standard
 * errors, as the owner decided on 30 September 2026, puts its pairs back
 * in the order of the job, and makes the order of the heatmap of each
 * measure. The options object is written with its keys alone, since popnei
 * refuses a key it does not know, and the populations with
 * `Object.fromEntries`, which makes a population named `__proto__` a field
 * of its own.
 */
function runPopDists(pass: Pass, job: PopDistsJob): Answer<JobResult> {
  const answer = passOf(pass, (variants) =>
    calcPopDists(variants, Object.fromEntries(job.pops), {
      jackknifeGroup: null,
      measures: POP_DISTS_MEASURES,
      minNumIndividuals: job.minNumIndividuals,
    }),
  );
  if (answer.kind !== "ok") {
    return answer;
  }
  return { kind: "ok", value: popDistsResultOf(answer.value, job) };
}

/**
 * The `PopDistsResult` of popnei's result, the pairs in the order of the
 * job's populations. popnei gives its populations in the order the keys
 * of the object it was given iterate in, whole numbers first, and its
 * pairs in that order, so for the job's populations i < j of k, the place
 * `pairAt(i, j, k)` of each array takes popnei's value of the same two
 * names at the place of their places in popnei's `pops`. Throws a defect
 * when popnei gave other populations than the job's, no values of a
 * measure asked for, or a negative count of variants.
 */
function popDistsResultOf(dists: PopDists, job: PopDistsJob): PopDistsResult {
  const pops = job.pops.map(([pop]) => pop);
  const numPops = pops.length;
  const placeInPopnei = new Map<string, number>(
    dists.pops.map((pop, at) => [pop, at]),
  );
  const placesInPopnei = pops.map((pop) => {
    const at = placeInPopnei.get(pop);
    if (at === undefined || dists.pops.length !== numPops) {
      throw new Error(
        `popnei_web defect: calcPopDists gave the populations ${JSON.stringify(dists.pops)} for ${JSON.stringify(pops)}`,
      );
    }
    return at;
  });
  const fstGiven = measureOf(dists, "fst");
  const destGiven = measureOf(dists, "dest");
  const numPairs = (numPops * (numPops - 1)) / 2;
  const fst = new Float64Array(numPairs);
  const dest = new Float64Array(numPairs);
  const numVarsPerPair = new Uint32Array(numPairs);
  for (const [i, atI] of placesInPopnei.entries()) {
    for (const [j, atJ] of placesInPopnei.entries()) {
      if (j <= i) {
        continue;
      }
      const given = pairAt(Math.min(atI, atJ), Math.max(atI, atJ), numPops);
      const place = pairAt(i, j, numPops);
      fst[place] = numberAt(fstGiven.distVector, given);
      dest[place] = numberAt(destGiven.distVector, given);
      const numVars = numberAt(dists.numVars, given);
      if (numVars < 0) {
        throw new Error(
          `popnei_web defect: calcPopDists counted ${String(numVars)} variants for the pair ${JSON.stringify(pops[i])}, ${JSON.stringify(pops[j])}`,
        );
      }
      numVarsPerPair[place] = numVars;
    }
  }
  return {
    analysis: "popDists",
    pops,
    numIndividuals: Uint32Array.from(
      job.pops,
      ([, individuals]) => individuals.length,
    ),
    fst,
    dest,
    numVarsPerPair,
    order: {
      fst: heatmapOrderOf(fst, pops, fstGiven.passStats),
      dest: heatmapOrderOf(dest, pops, destGiven.passStats),
    },
    leftOut: job.leftOut,
    passStats: passStatsOf(dists.passStats, job.filters),
  };
}

/** The distances of the measure `measure` of popnei's result, which the
    runner asked for; throws a defect when popnei gave none. */
function measureOf(dists: PopDists, measure: ShownMeasure): Distances {
  const given = dists[measure];
  if (given === null) {
    throw new Error(
      `popnei_web defect: calcPopDists gave no ${measure}, which was asked for`,
    );
  }
  return given;
}

/** The place of the pair of the populations i < j of k among the pairs
    (0, 1), (0, 2), …, (1, 2), …. */
function pairAt(i: number, j: number, k: number): number {
  return i * k - (i * (i + 1)) / 2 + j - i - 1;
}

/** The value at `index` of an array of popnei's; throws a defect when it
    has none there. */
function numberAt(array: Float64Array | Int32Array, index: number): number {
  const value = array[index];
  if (value === undefined) {
    throw new Error(
      `popnei_web defect: an array of popnei's result has no value at ${String(index)}`,
    );
  }
  return value;
}

/**
 * The order of the heatmap of one measure, over its distances in the order
 * of the job, by the six steps of docs/specs/analyses/popDists.md, "The
 * order of the heatmap": two populations, and a pair with no distance, keep
 * the order of the file; a negative distance is taken as 0 in the matrix
 * given to the PCoA alone; every distance 0 then keeps the order of the
 * file; otherwise popnei's Lingoes' correction and PCoA, the populations
 * sorted by their projection on the first component, an exact tie broken
 * by the order of the job; and a refusal of popnei at either of those two
 * calls keeps the order of the file with popnei's message. What else they
 * throw, a trap of the wasm, is thrown.
 */
function heatmapOrderOf(
  distVector: Float64Array,
  pops: readonly string[],
  passStats: PopneiPassStats,
): HeatmapOrder {
  if (pops.length === 2) {
    return { kind: "file", reason: "twoPopulations" };
  }
  if (distVector.some((dist) => Number.isNaN(dist))) {
    return { kind: "file", reason: "noDistance" };
  }
  const clipped = distVector.map((dist) => Math.max(dist, 0));
  if (clipped.every((dist) => dist === 0)) {
    return { kind: "file", reason: "allZero" };
  }
  const distances = new Distances(clipped, pops, passStats);
  let pcoa: PcoaResult;
  try {
    pcoa = doPcoa(correctDistsByLingoes(distances).distances);
  } catch (thrown: unknown) {
    const answer = answerOfThrown(thrown);
    if (answer.kind !== "refused") {
      throw thrown;
    }
    return { kind: "file", reason: "notPlaced", message: answer.message };
  }
  const first = Float64Array.from(pops, (_, at) =>
    numberAt(pcoa.projections, at * pcoa.numComps),
  );
  const order = pops
    .map((_, at) => at)
    .toSorted((a, b) => {
      const apart = numberAt(first, a) - numberAt(first, b);
      return apart !== 0 ? apart : a - b;
    });
  return { kind: "pcoa", order: Uint32Array.from(order) };
}

/** The name the runner gives popnei for the population at the place
    `at` of an LD decay's job: `p0`, `p1`, …. */
function ldPopName(at: number): string {
  return `p${String(at)}`;
}

/**
 * Runs `calcLdAndDistPerPop` over the populations of the job and makes the
 * `LdDecayResult` of it. The options object is written with its keys
 * alone, since popnei refuses a key it does not know. popnei is given the
 * populations under names of the runner's own, `p0`, `p1`, … by their
 * place in the job, and not under the job's: popnei's result loses a
 * population named `__proto__`, which it holds as the parent of its
 * objects and not as a field of theirs (runner.md, "The LD decay").
 */
function runLdDecay(pass: Pass, job: LdDecayJob): Answer<JobResult> {
  const answer = passOf(pass, (variants) =>
    calcLdAndDistPerPop(variants, {
      pops: Object.fromEntries(
        job.pops.map(([, individuals], at) => [ldPopName(at), individuals]),
      ),
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

/**
 * The `DiversityResult` of popnei's two results, `diversity` `null` when
 * `calcPopDiversity` was not called, in the order of the job. Throws a
 * defect when popnei gave no values of a population of the job or of a
 * statistic asked for.
 */
function diversityResultOf(
  distribs: PerVarDistribs,
  diversity: PopDiversityCall | null,
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
    ...popDiversityOf(diversity, job),
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
 * The fields of a `DiversityResult` that `calcPopDiversity` gives, every
 * array in the order of the job: NaN, 0 in `numVarsInDraw` and a `null`
 * spectrum for a population popnei was not given, and for every
 * population when `call` is `null`; the private alleles NaN, with the
 * two counts of the variants of every population `null`, when they were
 * not asked for, for one population. popnei gives its arrays in the order
 * of its `pops`, found here by name, and its spectra as an object by the
 * name of the population, read by a plain lookup: popnei's object holds a
 * population named `__proto__` as its parent and not as a field of its
 * own, so `Object.hasOwn` would not find it, and what the lookup gives is
 * checked to be a `Float64Array` instead. Each array is one the runner
 * made, over a buffer of its own. Throws a defect when popnei gave no
 * values of a population it was given, `null` for a statistic asked for,
 * or a spectrum of another length than `floor(numCalledAlleles / 2) + 1`.
 */
function popDiversityOf(
  call: PopDiversityCall | null,
  job: DiversityJob,
): PopDiversityFields {
  const numPops = job.pops.length;
  const fis = new Float64Array(numPops).fill(NaN);
  const numAllelesMean = new Float64Array(numPops).fill(NaN);
  const numAllelesInDraw = new Float64Array(numPops).fill(NaN);
  const privateAllelesTotal = new Float64Array(numPops).fill(NaN);
  const privateAllelesMean = new Float64Array(numPops).fill(NaN);
  const privateAllelesInDraw = new Float64Array(numPops).fill(NaN);
  const numVarsInDraw = new Uint32Array(numPops);
  const foldedSfs: (Float64Array | null)[] = job.pops.map(() => null);
  const diversity = call?.result ?? null;
  const privateAsked = call?.stats.includes("private_alleles") ?? false;
  if (diversity !== null) {
    const numAlleles = diversity.numAlleles;
    const popneiFis = diversity.fis;
    const spectra = diversity.foldedSfs;
    const privateAlleles = privateAsked ? diversity.privateAlleles : null;
    if (
      numAlleles === null ||
      popneiFis === null ||
      spectra === null ||
      (privateAsked && privateAlleles === null)
    ) {
      throw new Error(
        "popnei_web defect: calcPopDiversity gave no value of a statistic it was asked for",
      );
    }
    const indexOf = new Map<string, number>(
      diversity.pops.map((pop, index) => [pop, index]),
    );
    const numBins = Math.floor(job.numCalledAlleles / 2) + 1;
    const given = new Set(job.popDiversityPops);
    for (const [at, [pop]] of job.pops.entries()) {
      if (!given.has(pop)) {
        continue;
      }
      const index = indexOf.get(pop);
      if (index === undefined) {
        throw new Error(
          `popnei_web defect: calcPopDiversity gave no values of the population ${JSON.stringify(pop)}`,
        );
      }
      fis[at] = valueAt(popneiFis, index);
      numAllelesMean[at] = valueAt(numAlleles.mean, index);
      numAllelesInDraw[at] = valueAt(numAlleles.inDraw, index);
      if (privateAlleles !== null) {
        privateAllelesTotal[at] = valueAt(privateAlleles.total, index);
        privateAllelesMean[at] = valueAt(privateAlleles.mean, index);
        privateAllelesInDraw[at] = valueAt(privateAlleles.inDraw, index);
      }
      numVarsInDraw[at] = valueAt(diversity.numVars.inDraw, index);
      // A plain lookup, and not Object.hasOwn, which does not find a
      // population named __proto__ in popnei's object.
      const sfs: unknown = spectra[pop];
      if (!(sfs instanceof Float64Array) || sfs.length !== numBins) {
        throw new Error(
          `popnei_web defect: calcPopDiversity gave the population ${JSON.stringify(pop)} no spectrum of ${String(numBins)} values`,
        );
      }
      foldedSfs[at] = sfs.slice();
    }
  }
  const everyPopCounted = diversity !== null && privateAsked;
  return {
    fis,
    numAllelesMean,
    numAllelesInDraw,
    privateAllelesTotal,
    privateAllelesMean,
    privateAllelesInDraw,
    numVarsInDraw,
    numVarsEveryPop: everyPopCounted ? diversity.numVarsEveryPop : null,
    numVarsEveryPopInDraw: everyPopCounted
      ? diversity.numVarsEveryPopInDraw
      : null,
    numCalledAlleles: job.numCalledAlleles,
    foldedSfs,
  };
}

/**
 * The `LdDecayResult` of popnei's result, every array in the order of the
 * job and the populations under the job's names: the bins' distances
 * copied from the first population, and the numbers of the population at
 * each place found among popnei's own fields by the name the runner sent
 * it under, `ldPopName`. Throws a defect, which names the population as
 * the job does, when popnei gave no values of a population it was sent;
 * when a population has another number of bins than the job; and when the
 * distances of the bins differ between two populations, which popnei's
 * rule makes the same.
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
  const firstBins = binsOf(ld, 0, first[0], numBins);
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
    const bins = binsOf(ld, at, pop, numBins);
    if (
      !sameValues(bins.smallestDist, firstBins.smallestDist) ||
      !sameValues(bins.largestDist, firstBins.largestDist)
    ) {
      throw new Error(
        `popnei_web defect: the bins of the population ${JSON.stringify(pop)} are not at the distances of those of ${JSON.stringify(first[0])}`,
      );
    }
    const decay = ownValueOf(ld.decayPerPop, at, pop, "decayPerPop");
    result.numIndividuals[at] = individuals.length;
    result.numVars[at] = ownValueOf(ld.numVarsPerPop, at, pop, "numVarsPerPop");
    result.numPairs.set(bins.numPairs, at * numBins);
    result.meanR2.set(bins.meanR2, at * numBins);
    result.sdR2.set(bins.sdR2, at * numBins);
    result.rhoPerBp[at] = decay.rhoPerBp;
    result.r2AtZero[at] = decay.r2AtZero;
    result.halfDist[at] = decay.halfDist;
  }
  return result;
}

/** The bins popnei gave the population at the place `at` of the job,
    which the job names `pop`, each of its five arrays of `numBins` values;
    throws a defect otherwise. */
function binsOf(
  ld: LdAndDistPerPop,
  at: number,
  pop: string,
  numBins: number,
): LdBins {
  const bins = ownValueOf(ld.perPop, at, pop, "perPop");
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

/** The value of the population at the place `at` of the job, which the
    job names `pop`, in the object `name` of popnei's result, under the
    name the runner sent it, and read only when it is a field of the object
    itself. Throws a defect when popnei gave none. */
function ownValueOf<T>(
  record: Readonly<Record<string, T>>,
  at: number,
  pop: string,
  name: string,
): T {
  const sent = ldPopName(at);
  const value = Object.hasOwn(record, sent) ? record[sent] : undefined;
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
