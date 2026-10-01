/**
 * The diversity of each population: what its result is calculated from,
 * when it cannot run, the request it sends, its warnings, its check
 * numbers, its lines of the Python script, the rows and the CSV of its
 * table, and the words of its error state, for popnei's refusal
 * (`refusalText`) and for statistics of each individual that failed
 * (`statisticsFailedText`) (docs/specs/analyses/diversity.md, "The
 * module").
 *
 * The numbers of each population are popnei's, from a call of
 * `calcPerVarDistribs` and, from stage 5, one of `calcPopDiversity` in
 * the calculation worker; this module computes none of them. The populations are those of `project.ts`, which every
 * analysis per population shares: those of a column of the metadata
 * file, or one population of every individual, "All individuals".
 */

import { hasIndividualThreshold, individualsKept } from "../individualsKept.ts";
import type { IndividualsKept } from "../individualsKept.ts";
import type { JsonObject } from "../keys.ts";
import {
  ONE_POPULATION,
  analysisOptions,
  counted,
  escaped,
  grouped,
  individualsNeeds,
  jobFilters,
  namesOf,
  populationsKept,
  populationsNeeds,
  populationsOf,
  populationsToRun,
  shown,
  LARGEST_WHOLE_NUMBER,
  MAX_NAMED,
  bothOf,
} from "../project.ts";
import {
  populationListsNeeds,
  populationsColumnOf,
  populationsKeptNeeds,
  populationsWithMinimum,
  populationsByLists,
} from "../populations.ts";
import type { Project } from "../project.ts";
import type { Result } from "../result.ts";
import type {
  AnalysisDef,
  AnalysisError,
  Warning,
  WorkerClient,
} from "../store.ts";
import { statisticsFailedWords } from "./individualChecks.ts";
import { spectrumWarnings } from "./sfs.ts";
import type { Failure } from "./individualChecks.ts";
import {
  CHANGE_SETTINGS,
  csvField,
  csvNumber,
  defect,
  orNull,
  percentOf,
  populationWarnings,
  refusalWords,
} from "./words.ts";
import type { PopulationWords } from "./words.ts";
import { MIN_DRAW } from "../../worker/protocol.ts";
import type {
  DiversityResult,
  Job,
  JobResult,
  Run,
} from "../../worker/protocol.ts";

/** The id of the analysis. */
const ID = "diversity";

/** What the diversity calls itself and its result in the warnings of the
    populations. */
const DIVERSITY_WORDS: PopulationWords = Object.freeze({
  leftOutOf: "the diversity",
  notIn: "the table",
});

/**
 * The three options of the diversity when the user has set none: popnei's
 * own defaults of `calcPerVarDistribs`, a variant has a value in a
 * population only when at least 20 of its individuals have a called
 * genotype there, and is polymorphic when its commonest allele is below
 * 0.95; and the default draw of the rarefaction, `null`, which `drawOf`
 * makes from the ploidy of the variants file and the minimum.
 */
export const DIVERSITY_DEFAULTS: {
  readonly minNumIndividuals: 20;
  readonly polyThreshold: 0.95;
  readonly numCalledAlleles: null;
} = Object.freeze({
  minNumIndividuals: 20,
  polyThreshold: 0.95,
  numCalledAlleles: null,
});

/** The three options of the diversity, as the project holds them. */
export interface DiversityOptions {
  /** How many individuals of a population need a called genotype at a
      variant for the variant to have a value there. */
  readonly minNumIndividuals: number;
  /** The frequency of the commonest allele below which a variant is
      polymorphic in a population. */
  readonly polyThreshold: number;
  /** The chromosomes of the draw of the rarefaction as the user typed
      them, or `null` for the default draw. */
  readonly numCalledAlleles: number | null;
}

/** What the options should be, the end of "‹the field› should be ‹…›" of
    `projectErrorText`. */
const OPTIONS_EXPECTED = `the minimum of individuals, a whole number from 0 to 4,294,967,295, the frequency below which a variant is polymorphic, a number from 0 to 1, and the chromosomes of the rarefaction, null or a whole number from ${String(MIN_DRAW)} to 4,294,967,295, and nothing else`;

/** The rows of each result, so that a screen drawn again gets the same
    array. */
const ROWS = new WeakMap<DiversityResult, readonly DiversityRow[]>();

/** One row of the table, a number null where popnei gave NaN. */
export interface DiversityRow {
  /** The name of the population. */
  readonly population: string;
  /** The individuals of the population the calculation took. */
  readonly individuals: number;
  /** The mean unbiased expected heterozygosity. */
  readonly expectedHeterozygosity: number | null;
  /** The mean observed heterozygosity. */
  readonly observedHeterozygosity: number | null;
  /** The proportion of polymorphic variants. */
  readonly polymorphic: number | null;
  /** F, one minus the observed heterozygosity over the expected one. */
  readonly f: number | null;
  /** The alleles called per variant. */
  readonly allelesPerVariant: number | null;
  /** The alleles per variant in a draw of the chromosomes of the result. */
  readonly allelesPerVariantRarefied: number | null;
  /** The private alleles; null when they were not counted, and not 0,
      which would read as a count. */
  readonly privateAlleles: number | null;
  /** The private alleles per variant. */
  readonly privateAllelesPerVariant: number | null;
  /** The private alleles per variant in a draw. */
  readonly privateAllelesPerVariantRarefied: number | null;
}

/** The rows of a result, in its order; the same array for the same
    result. */
export function diversityRows(r: DiversityResult): readonly DiversityRow[] {
  const kept = ROWS.get(r);
  if (kept !== undefined) {
    return kept;
  }
  const rows = Object.freeze(
    r.pops.map((population, i): DiversityRow =>
      Object.freeze({
        population,
        individuals: valueAt(r.numIndividuals, i, "numIndividuals"),
        expectedHeterozygosity: orNull(
          valueAt(r.unbiasedExpHet, i, "unbiasedExpHet"),
        ),
        observedHeterozygosity: orNull(valueAt(r.obsHet, i, "obsHet")),
        polymorphic: orNull(valueAt(r.polyRatio, i, "polyRatio")),
        f: orNull(valueAt(r.fis, i, "fis")),
        allelesPerVariant: orNull(
          valueAt(r.numAllelesMean, i, "numAllelesMean"),
        ),
        allelesPerVariantRarefied: orNull(
          valueAt(r.numAllelesInDraw, i, "numAllelesInDraw"),
        ),
        privateAlleles: orNull(
          valueAt(r.privateAllelesTotal, i, "privateAllelesTotal"),
        ),
        privateAllelesPerVariant: orNull(
          valueAt(r.privateAllelesMean, i, "privateAllelesMean"),
        ),
        privateAllelesPerVariantRarefied: orNull(
          valueAt(r.privateAllelesInDraw, i, "privateAllelesInDraw"),
        ),
      }),
    ),
  );
  ROWS.set(r, rows);
  return rows;
}

/** The header of the CSV of the table, the names of the columns of the
    table of the Python script; F sixth, so that the first five are those
    of stages 2 to 4. */
const CSV_HEADER =
  "population,individuals,expected_heterozygosity_unbiased,observed_heterozygosity,proportion_polymorphic,f,alleles_per_variant,alleles_per_variant_rarefied,private_alleles,private_alleles_per_variant,private_alleles_per_variant_rarefied";

/**
 * The table as the text of a CSV file: a header row, one row per
 * population in the order of the result, the numbers as `String` writes
 * them and an empty cell for no value, a field with a comma, a quote or a
 * new line quoted as RFC 4180 has it, and each line ended by a new line.
 */
export function diversityCsv(r: DiversityResult): string {
  const lines = diversityRows(r).map((row) =>
    [
      csvField(row.population),
      String(row.individuals),
      csvNumber(row.expectedHeterozygosity),
      csvNumber(row.observedHeterozygosity),
      csvNumber(row.polymorphic),
      csvNumber(row.f),
      csvNumber(row.allelesPerVariant),
      csvNumber(row.allelesPerVariantRarefied),
      csvNumber(row.privateAlleles),
      csvNumber(row.privateAllelesPerVariant),
      csvNumber(row.privateAllelesPerVariantRarefied),
    ].join(","),
  );
  return [CSV_HEADER, ...lines].map((line) => `${line}\n`).join("");
}

/** The start of popnei's refusal of a request with no population, which
    only the thresholds on the individuals can bring about, since `needs`
    locks the diversity when the lists leave no population. */
const NO_POPULATION = "`pops` names no population";

/**
 * The words of a refusal of popnei, for the error state of the panel of
 * the project `p`, by the start of popnei's message: no population, which
 * the thresholds of the filters of individuals leave; the variants file
 * holds no variant, or, for a VCF read with only the passed variants,
 * none that passed; the filters kept none; a genotype of another ploidy
 * than the one the VCF was read with; a line of the VCF it cannot read, or
 * a gzipped file damaged or cut short; any other. Throws a defect on a
 * project with no variants file, and on a refusal of no population for a
 * project with no column of the populations.
 */
export function refusalText(message: string, p: Project): string {
  if (p.variants === null) {
    throw defect("refusalText was given a project with no variants file.");
  }
  if (message.startsWith(NO_POPULATION)) {
    const column = populationsColumn(p);
    if (column === null) {
      throw defect(
        "the diversity was refused for no population with no column of the populations.",
      );
    }
    return `The thresholds of the filters of individuals leave none of the individuals of ${escaped(p.variants.name)} that have a population in ${shown(column)}, so no population is left. Loosen the thresholds in the Variants step.`;
  }
  return refusalWords(message, p, {
    change: CHANGE_SETTINGS,
    calculate: "calculate the diversity",
    nothingLeft: "there is no variant to calculate the diversity over",
    again: "to run it again",
    emptyPass: (fileName) =>
      `The filters kept none of the variants of ${fileName}, so there is no variant to calculate the diversity over. Loosen the filters in the Variants step.`,
  });
}

/**
 * The words of the error state of the panel when the statistics of each
 * individual that a Run waited for were refused or failed, the store's
 * error with `ofStatistics`: `statisticsFailedWords` of the statistics,
 * with "the diversity was not run" when its own Run waited for them,
 * `waited`, and "the diversity cannot run" when it did not (stop C 4).
 */
export function statisticsFailedText(
  error: AnalysisError,
  p: Project,
  failureText: (failure: Failure) => string,
  waited: boolean,
): string {
  return statisticsFailedWords(
    error,
    p,
    failureText,
    waited ? "the diversity was not run" : "the diversity cannot run",
  );
}

/** The definition of the diversity, as the store knows it. */
export const diversity: AnalysisDef<Job, JobResult> = Object.freeze({
  id: ID,
  app: Object.freeze(["popgen"] as const),
  defaults: DIVERSITY_DEFAULTS,
  keyVersion: 3,
  filtersRead: Object.freeze({ variants: true, individuals: true }),
  parseOptions,
  keyInputs,
  needs,
  keptNeeds,
  run,
  warnings,
  checkNumbers,
  numCheckNumbers,
  script,
});

/**
 * Checks the options of the diversity read from a project file and gives
 * them back as an object of exactly the three fields: `minNumIndividuals`,
 * a whole number from 0 to 4,294,967,295; `polyThreshold`, a number from
 * 0 to 1; and `numCalledAlleles`, `null` or a whole number from 2 to
 * 4,294,967,295. Every version of the format reads them in the same way,
 * so the version the store passes is not read.
 */
function parseOptions(options: unknown): Result<JsonObject, string> {
  const read = readOptions(options);
  return read.ok ? { ok: true, value: { ...read.value } } : read;
}

/** The three options read from `options`, or what they should be. */
function readOptions(options: unknown): Result<DiversityOptions, string> {
  const refused = { ok: false, error: OPTIONS_EXPECTED } as const;
  if (
    typeof options !== "object" ||
    options === null ||
    Array.isArray(options)
  ) {
    return refused;
  }
  if (
    Reflect.ownKeys(options).length !== 3 ||
    !Object.hasOwn(options, "minNumIndividuals") ||
    !Object.hasOwn(options, "polyThreshold") ||
    !Object.hasOwn(options, "numCalledAlleles")
  ) {
    return refused;
  }
  const minNumIndividuals: unknown = Reflect.get(options, "minNumIndividuals");
  const polyThreshold: unknown = Reflect.get(options, "polyThreshold");
  const numCalledAlleles: unknown = Reflect.get(options, "numCalledAlleles");
  if (
    !isWholeFrom(minNumIndividuals, 0) ||
    typeof polyThreshold !== "number" ||
    !Number.isFinite(polyThreshold) ||
    polyThreshold < 0 ||
    polyThreshold > 1 ||
    (numCalledAlleles !== null && !isWholeFrom(numCalledAlleles, MIN_DRAW))
  ) {
    return refused;
  }
  return {
    ok: true,
    value: { minNumIndividuals, polyThreshold, numCalledAlleles },
  };
}

/** Whether `value` is a whole number from `least` to 4,294,967,295. */
function isWholeFrom(value: unknown, least: number): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= least &&
    value <= LARGEST_WHOLE_NUMBER
  );
}

/** The options the project holds, as `readOptions` read them, so that the
    same options give the same object. */
const READ = new WeakMap<JsonObject, DiversityOptions>();

/** The options of the project for the diversity, or `DIVERSITY_DEFAULTS`:
    what the fields of the panel show and send back with
    `setAnalysisOptions`; the same object while the project holds the
    same options, which a screen may select. Throws a defect on options
    its `parseOptions` would refuse, which no command puts into a
    project. */
export function diversityOptions(p: Project): DiversityOptions {
  const stored = analysisOptions(p, ID, DIVERSITY_DEFAULTS);
  const known = READ.get(stored);
  if (known !== undefined) {
    return known;
  }
  const read = readOptions(stored);
  if (!read.ok) {
    throw defect("the project holds options of the diversity it refuses.");
  }
  const options = Object.freeze(read.value);
  READ.set(stored, options);
  return options;
}

/** The draw `run` sends: the one typed, or else `defaultDrawOf(p)`. */
export function drawOf(p: Project): number | null {
  return diversityOptions(p).numCalledAlleles ?? defaultDrawOf(p);
}

/** The default draw, whatever draw is typed: the ploidy of the variants
    file times the minimum, at least 2, as the owner decided on 30
    September 2026 (decision 5), which the panel shows beside a draw
    typed; `null` while the variants file is not read, whose ploidy is
    then not known. */
export function defaultDrawOf(p: Project): number | null {
  const read = p.variants?.read;
  return read?.kind === "read"
    ? Math.max(MIN_DRAW, read.ploidy * diversityOptions(p).minNumIndividuals)
    : null;
}

/**
 * What the key holds beyond the load and the filters: the populations of
 * the table and the options, with the draw only when it was typed. The
 * default draw is left out, and not written `null`, since the ploidy of
 * the load and the minimum beside it fix it, and a project file saved by
 * stage 4, whose options had no draw, then has the fingerprint of its
 * settings that stage 5 makes, so that its check numbers are compared.
 * Reads nothing of `p.variants`.
 */
function keyInputs(p: Project): JsonObject {
  const options = diversityOptions(p);
  return {
    pops: populationsOf(p),
    options: {
      minNumIndividuals: options.minNumIndividuals,
      polyThreshold: options.polyThreshold,
      ...(options.numCalledAlleles === null
        ? {}
        : { numCalledAlleles: options.numCalledAlleles }),
    },
  };
}

/** The first reason the diversity cannot run beyond those every analysis
    shares and the lists of individuals popnei would refuse, or `null`:
    the individuals file, the column of the populations, the lists to
    keep and to remove leaving no population of a column, and, last, a
    draw larger than the chromosomes of the individuals those lists keep;
    without a metadata file, or with the grouping `onePopulation`, only
    the first and the last can lock. Throws a defect on a project of
    association whose individuals file is read. */
function needs(p: Project): string | null {
  const reason = individualsNeeds(p);
  if (reason !== null) {
    return reason;
  }
  if (p.grouping.kind === "roles") {
    throw defect("the diversity was given a project of association.");
  }
  const populations = populationsNeeds(p)?.reason ?? populationListsNeeds(p);
  const kept = individualsKept(p, null);
  if (populations !== null || kept === null || p.variants === null) {
    return populations;
  }
  // The lists took some individual of the file only when they keep fewer.
  const listed =
    p.variants.read.kind === "read" &&
    kept.byLists.length < p.variants.read.individuals.length;
  return listed
    ? drawNeeds(
        p,
        kept.byLists,
        "the lists of individuals keep",
        ", or change the lists in the Variants step",
      )
    : drawNeeds(p, kept.byLists, `of ${escaped(p.variants.name)}`, "");
}

/**
 * The reason the diversity cannot run for the individuals kept, `kept`,
 * whose list is known and keeps some individual, or `null`: the list
 * leaves no population, `populationsKeptNeeds`; or it holds fewer
 * chromosomes than the draw of the rarefaction while some population of
 * the request has the minimum of individuals, told only when the list is
 * shorter than the individuals the lists to keep and to remove keep,
 * which `needs` counts. `null` while the list is not known.
 */
function keptNeeds(p: Project, kept: IndividualsKept): string | null {
  const noPopulation = populationsKeptNeeds(p, kept);
  if (noPopulation !== null) {
    return noPopulation;
  }
  const list = kept.list.kind === "known" ? kept.list.individuals : null;
  if (list === null || list.length >= kept.byLists.length) {
    return null;
  }
  return drawNeeds(
    p,
    list,
    "the filters of individuals keep",
    ", or loosen the filters of individuals in the Variants step",
  );
}

/**
 * The reason of a draw larger than the chromosomes of `individuals`,
 * which popnei refuses at the first range it reads of the second pass, or
 * `null`; `null` too when no population of the request made of them has
 * the minimum of individuals, since `calcPopDiversity` is then not
 * called. `whose` says which individuals they are, after "the 45
 * individuals", and `orElse` what else the user can do, after "in the
 * options of the diversity".
 */
function drawNeeds(
  p: Project,
  individuals: readonly string[],
  whose: string,
  orElse: string,
): string | null {
  const read = p.variants?.read;
  const draw = drawOf(p);
  const left = populationsKept(p, individuals);
  if (read?.kind !== "read" || draw === null || left === null) {
    return null;
  }
  const chromosomes = individuals.length * read.ploidy;
  const { withMinimum } = populationsWithMinimum(
    left.pops,
    diversityOptions(p).minNumIndividuals,
  );
  if (draw <= chromosomes || withMinimum.length === 0) {
    return null;
  }
  const hold =
    individuals.length === 1
      ? `the one individual ${whose} holds`
      : `the ${grouped(individuals.length)} individuals ${whose} hold`;
  return `The rarefaction draws ${grouped(draw)} chromosomes, and ${hold} ${grouped(chromosomes)} at a ploidy of ${String(read.ploidy)}. Type a number of chromosomes of at most ${grouped(chromosomes)} in the options of the diversity${orElse}.`;
}

/** Builds the request, with the individuals the filters keep that the
    store gives through `c`, and sends it through `c`: the default draw,
    and the populations with at least the minimum of individuals as those
    of `calcPopDiversity`, the rule of decision 7 made here and not in the
    runner. Throws a defect when the variants file is not read or there
    are no populations to run, which `needs` rules out. */
function run(p: Project, c: WorkerClient<Job, JobResult>): Run<JobResult> {
  const kept = populationsKept(p, c.individuals);
  if (p.variants === null || kept === null) {
    throw defect("the diversity was run with no populations to run.");
  }
  if (p.variants.read.kind !== "read") {
    throw defect("the diversity was run before its variants file was read.");
  }
  const options = diversityOptions(p);
  const draw = drawOf(p);
  if (draw === null) {
    throw defect("the diversity was run with no draw.");
  }
  return c.run({
    analysis: ID,
    fileId: p.variants.fileId,
    filters: jobFilters(p.filters),
    individuals: c.individuals,
    pops: kept.pops,
    minNumIndividuals: options.minNumIndividuals,
    polyThreshold: options.polyThreshold,
    numCalledAlleles: draw,
    popDiversityPops: populationsWithMinimum(
      kept.pops,
      options.minNumIndividuals,
    ).withMinimum.map(([pop]) => pop),
  });
}

/**
 * The warnings of a result, given the project its request was made from,
 * in this order: populations of too few individuals, populations with a
 * value at fewer variants than the filters kept, individuals of the
 * variants file with no population, populations with individuals in the
 * variants file that are not in the result; from stage 5, the private
 * alleles counted without the populations of too few individuals, with
 * one population only, or over fewer variants than the filters kept,
 * populations that reach the draw at fewer variants than they have a
 * value at, and F in a haploid file; then the warnings of the spectrum.
 * The populations given to `calcPopDiversity` are found as `run` chose
 * them, from `numIndividuals` and the minimum.
 */
function warnings(result: JobResult, p: Project): readonly Warning[] {
  const r = diversityResultOf(result);
  const read = p.variants?.read;
  if (p.variants === null || read?.kind !== "read") {
    throw defect("the warnings of the diversity need a variants file read.");
  }
  const min = diversityOptions(p).minNumIndividuals;
  const found: Warning[] = [];
  const rows = diversityRows(r);
  const toRun = populationsToRun(p) ?? [];
  const onePopulation = populationsOf(p) === "all";
  const tooFew = rows.filter((row) => row.individuals < min);
  if (tooFew.length > 0) {
    // A population the filters of individuals took individuals from has
    // fewer in the result than among the individuals of the variants file.
    const sizes = new Map(
      toRun.map(([pop, individuals]) => [pop, individuals.length]),
    );
    const filtered = tooFew.some(
      (row) => row.individuals < (sizes.get(row.population) ?? 0),
    );
    found.push({
      code: "tooFewIndividuals",
      text: onePopulation
        ? tooFewOfOneText(tooFew, min, filtered)
        : tooFewText(tooFew, min, filtered),
    });
  }
  const counts = rows.map((row, i) => ({
    row,
    withValue: valueAt(r.numVarsWithValue, i, "numVarsWithValue"),
    inDraw: valueAt(r.numVarsInDraw, i, "numVarsInDraw"),
  }));
  const withoutValue = counts.filter(
    ({ row, withValue }) =>
      row.individuals >= min && withValue < r.passStats.numVars,
  );
  if (withoutValue.length > 0) {
    found.push({
      code: "variantsWithoutValue",
      text: withoutValueText(withoutValue, r.passStats.numVars, min),
    });
  }
  found.push(...populationWarnings(r.pops, p, DIVERSITY_WORDS));
  found.push(...privateAllelesWarnings(r, rows, min, onePopulation));
  const notInDraw = counts.filter(
    ({ row, withValue, inDraw }) =>
      row.individuals >= min && inDraw < withValue,
  );
  if (notInDraw.length > 0) {
    found.push({
      code: "variantsNotInDraw",
      text: notInDrawText(notInDraw, r),
    });
  }
  if (read.ploidy === 1) {
    found.push({
      code: "noFInHaploid",
      text: `The variants of ${escaped(p.variants.name)} have a ploidy of 1, and a genotype of one allele cannot be heterozygous, so F has no value.`,
    });
  }
  found.push(...spectrumWarnings(r, p));
  return found;
}

/**
 * The warnings of the private alleles, from stage 5, in this order:
 * counted without the populations of fewer than `min` individuals, which
 * `run` left out of `calcPopDiversity`; not counted, with one population
 * given to it, in the words of the one population when `onePopulation`;
 * counted over fewer variants than the filters kept.
 */
function privateAllelesWarnings(
  r: DiversityResult,
  rows: readonly DiversityRow[],
  min: number,
  onePopulation: boolean,
): readonly Warning[] {
  const called = rows.filter((row) => row.individuals >= min);
  const tooFew = rows.filter((row) => row.individuals < min);
  const found: Warning[] = [];
  if (called.length > 1 && tooFew.length > 0) {
    found.push({
      code: "privateAllelesWithoutSmall",
      text: withoutSmallText(called, tooFew, min),
    });
  }
  const [only] = called;
  if (called.length === 1 && only !== undefined) {
    found.push({
      code: "privateAllelesNeedTwoPopulations",
      text: onePopulation
        ? "With every individual in one population, no allele can be private, found in this population and in no other, so the table has no private alleles. Choose a column that defines the populations in the Individuals step to count them."
        : `Only ${namesOf([only.population])} has ${grouped(min)} individuals or more, and private alleles are counted among such populations, so the table has none: an allele is private when one population has it and no other does.`,
    });
  }
  const everyPop = r.numVarsEveryPop;
  if (
    called.length > 1 &&
    everyPop !== null &&
    everyPop < r.passStats.numVars
  ) {
    found.push({
      code: "privateAllelesOverFewerVariants",
      text: overFewerVariantsText(everyPop, r.passStats.numVars, min),
    });
  }
  return found;
}

/** The text of `tooFewIndividuals`, for its populations; `filtered` when
    the filters of individuals took individuals from one of them, which
    the text then offers to loosen. */
function tooFewText(
  rows: readonly DiversityRow[],
  min: number,
  filtered: boolean,
): string {
  const rule = `a variant has a value in a population only when at least ${grouped(min)} of its individuals have a called genotype there`;
  const names = namesOf(rows.map((row) => row.population));
  const end = `in the metadata file, ${LOWER_MINIMUM}${filtered ? LOOSEN_FILTERS : "."}`;
  const [first] = rows;
  if (rows.length === 1 && first !== undefined) {
    return `Population ${names} has ${counted(first.individuals, "individual")}, and ${rule}, so ${names} has no values. To have them, merge it with another population ${end}`;
  }
  const counts =
    rows.length <= MAX_NAMED
      ? `, ${bothOf(rows.map((row) => grouped(row.individuals)))}`
      : "";
  return `Populations ${names} have fewer than ${grouped(min)} individuals${counts}, and ${rule}, so they have no values. To have them, merge each with another population ${end}`;
}

/** What `tooFewIndividuals` offers from stage 5, after "To have them,
    merge it with another population in the metadata file, ". */
const LOWER_MINIMUM =
  "or lower the minimum number of individuals in the options of the diversity";

/** The end of `tooFewIndividuals` when the filters of individuals took
    individuals from a population it names. */
const LOOSEN_FILTERS =
  ", or loosen the filters of individuals in the Variants step.";

/** The text of `tooFewIndividuals` for the one population, `rows` its
    one row, which has no metadata file to merge it in; `filtered` when
    the filters of individuals took individuals from it. */
function tooFewOfOneText(
  rows: readonly DiversityRow[],
  min: number,
  filtered: boolean,
): string {
  const [row] = rows;
  if (row === undefined || rows.length !== 1) {
    throw defect("the one population has another number of rows than one.");
  }
  const end = `To have them, lower the minimum number of individuals in the options of the diversity${filtered ? LOOSEN_FILTERS : "."}`;
  return `${escaped(row.population)}, the one population, has ${counted(row.individuals, "individual")}, and a variant has a value in a population only when at least ${grouped(min)} of its individuals have a called genotype there, so it has no values. ${end}`;
}

/** The text of `privateAllelesWithoutSmall`: the private alleles of the
    populations `called`, two or more, counted without those of
    `tooFew`. */
function withoutSmallText(
  called: readonly DiversityRow[],
  tooFew: readonly DiversityRow[],
  min: number,
): string {
  const whose =
    called.length <= MAX_NAMED
      ? `${namesOf(called.map((row) => row.population))} are counted among these populations alone`
      : `the ${grouped(called.length)} populations with ${grouped(min)} individuals or more are counted among them alone`;
  const leftOut = namesOf(tooFew.map((row) => row.population));
  const sharedWith =
    tooFew.length === 1
      ? `${leftOut}, which has fewer than ${grouped(min)} individuals: an allele they share only with ${leftOut} counts as private.`
      : `${leftOut}, which have fewer than ${grouped(min)} individuals: an allele they share only with some of those populations counts as private.`;
  return `The private alleles of ${whose}, without ${sharedWith}`;
}

/** The text of `privateAllelesOverFewerVariants`: the private alleles
    counted over `everyPop` of the `numVars` variants kept. */
function overFewerVariantsText(
  everyPop: number,
  numVars: number,
  min: number,
): string {
  if (everyPop === 0) {
    const kept =
      numVars === 1 ? "the one kept" : `the ${grouped(numVars)} kept`;
    return `The private alleles are counted over the variants at which every population has a value, and there is none among ${kept}: at each, fewer than ${grouped(min)} individuals of some population have a genotype. So no population has private alleles.`;
  }
  return `The private alleles are counted over the ${grouped(everyPop)} of the ${grouped(numVars)} variants kept (${percentOf(everyPop, numVars)}) at which every population has a value; at the others, fewer than ${grouped(min)} individuals of some population have a genotype.`;
}

/** The text of `variantsNotInDraw`, for its populations with the
    variants at which each has a value and those at which it reaches the
    draw of `r`; with a last sentence when the rarefied private alleles
    are over fewer variants than the others. */
function notInDrawText(
  pops: readonly {
    readonly row: DiversityRow;
    readonly withValue: number;
    readonly inDraw: number;
  }[],
  r: DiversityResult,
): string {
  const text = notInDrawFirst(pops, r.numCalledAlleles);
  const everyPop = r.numVarsEveryPop;
  const everyPopInDraw = r.numVarsEveryPopInDraw;
  if (
    everyPop === null ||
    everyPopInDraw === null ||
    everyPopInDraw >= everyPop
  ) {
    return text;
  }
  const draw = grouped(r.numCalledAlleles);
  const over =
    everyPopInDraw === 0
      ? `No variant has every population at ${draw} called chromosomes, so there are no rarefied private alleles.`
      : everyPopInDraw === 1
        ? `The rarefied private alleles are over the one variant at which every population reaches ${draw}.`
        : `The rarefied private alleles are over the ${grouped(everyPopInDraw)} variants at which every population reaches ${draw}.`;
  return `${text} ${over}`;
}

/** The text of `variantsNotInDraw` without its last sentence, for a draw
    of `numCalledAlleles`. */
function notInDrawFirst(
  pops: readonly {
    readonly row: DiversityRow;
    readonly withValue: number;
    readonly inDraw: number;
  }[],
  numCalledAlleles: number,
): string {
  const draw = grouped(numCalledAlleles);
  const names = namesOf(pops.map(({ row }) => row.population));
  const [first] = pops;
  if (pops.every(({ inDraw }) => inDraw === 0)) {
    // At the smallest draw there is no smaller one to offer.
    const lower =
      numCalledAlleles > MIN_DRAW
        ? " Lower the number of chromosomes of the rarefaction in the options of the diversity."
        : "";
    return pops.length === 1
      ? `${names} reaches ${draw} called chromosomes at none of the variants at which it has a value, so it has no rarefied values.${lower}`
      : `${names} reach ${draw} called chromosomes at none of the variants at which they have a value, so they have no rarefied values.${lower}`;
  }
  if (pops.length === 1 && first !== undefined) {
    return `${names} reaches ${draw} called chromosomes at ${grouped(first.inDraw)} of the ${grouped(first.withValue)} variants at which it has a value (${percentOf(first.inDraw, first.withValue)}), so its rarefied values are over those alone.`;
  }
  if (pops.length > MAX_NAMED) {
    return `${names} reach ${draw} called chromosomes at fewer than the variants at which they have a value, so their rarefied values are over those alone.`;
  }
  const withValue = pops.map((pop) => pop.withValue);
  const counts = bothOf(pops.map(({ inDraw }) => grouped(inDraw)));
  const of = withValue.every((count) => count === withValue[0])
    ? `the ${grouped(first?.withValue ?? 0)} variants at which they have a value`
    : `the ${bothOf(withValue.map(grouped))} variants at which each has a value`;
  const shares = bothOf(
    pops.map(({ inDraw, withValue: all }) => percentOf(inDraw, all)),
  );
  return `${names} reach ${draw} called chromosomes at ${counts} of ${of} (${shares}), so their rarefied values are over those alone.`;
}

/** The text of `variantsWithoutValue`, for its populations with the
    variants at which each has a value. */
function withoutValueText(
  pops: readonly { readonly row: DiversityRow; readonly withValue: number }[],
  numVars: number,
  min: number,
): string {
  const names = namesOf(pops.map(({ row }) => row.population));
  if (numVars === 1) {
    // Every population named has a value at none of the one variant.
    return pops.length === 1
      ? `${names} has no value at the one variant kept: fewer than ${grouped(min)} of its individuals have a genotype there.`
      : `${names} have no value at the one variant kept: fewer than ${grouped(min)} of their individuals have a genotype there.`;
  }
  const kept = `the ${grouped(numVars)} variants kept`;
  const [first] = pops;
  if (pops.length === 1 && first !== undefined) {
    return first.withValue === 0
      ? `${names} has a value at none of ${kept}: at each, fewer than ${grouped(min)} of its individuals have a genotype.`
      : `${names} has a value at ${grouped(first.withValue)} of ${kept} (${percentOf(first.withValue, numVars)}); at the others fewer than ${grouped(min)} of its individuals have a genotype.`;
  }
  if (pops.length > MAX_NAMED) {
    return `${names} have a value at fewer than ${kept}; at the others fewer than ${grouped(min)} of their individuals have a genotype.`;
  }
  const counts = bothOf(pops.map(({ withValue }) => grouped(withValue)));
  const shares = bothOf(
    pops.map(({ withValue }) => percentOf(withValue, numVars)),
  );
  return `${names} have a value at ${counts} of ${kept} (${shares}); at the others fewer than ${grouped(min)} of their individuals have a genotype.`;
}

/** The check numbers: the variants kept, then the expected
    heterozygosity, the observed heterozygosity and the proportion of
    polymorphic variants of each population, `null` for a NaN. */
function checkNumbers(result: JobResult): readonly (number | null)[] {
  const r = diversityResultOf(result);
  return [
    r.passStats.numVars,
    ...diversityRows(r).flatMap((row) => [
      row.expectedHeterozygosity,
      row.observedHeterozygosity,
      row.polymorphic,
    ]),
  ];
}

/** How many numbers `checkNumbers` gives for a result of `p`: 1 + 3 × the
    populations the lists of individuals to keep and to remove leave,
    since `run` sends every one of them and popnei gives a row for each;
    `null` when `populationsToRun` is, when the project holds a threshold
    on the individuals, whose list needs the statistics of each
    individual, and when a list is one popnei would refuse. */
function numCheckNumbers(p: Project): number | null {
  if (populationsToRun(p) === null || hasIndividualThreshold(p)) {
    return null;
  }
  const left = populationsByLists(p);
  return left === null ? null : 1 + NUMBERS_PER_POPULATION * left.length;
}

/** The check numbers of each population: its expected heterozygosity, its
    observed heterozygosity and its proportion of polymorphic variants. */
const NUMBERS_PER_POPULATION = 3;

/**
 * The lines of the Python script that calculate the same numbers with
 * popnei's Python API, after the lines that open `variants` and read the
 * table `individuals`: the three numbers of each population, then, in a
 * block for the populations of the minimum of individuals, the call of
 * `calcPopDiversity` with the draw `run` sends, its columns of the table,
 * and the lines of the spectrum (docs/specs/analyses/sfs.md, "Its lines
 * of the Python script"). Throws a defect on a project with no column of
 * the populations or no draw, since it is asked only of an analysis that
 * has run.
 */
function script(p: Project): string {
  const options = diversityOptions(p);
  const min = String(options.minNumIndividuals);
  const drawn = drawOf(p);
  if (drawn === null) {
    throw defect("the script of the diversity was asked with no draw.");
  }
  const draw = String(drawn);
  return [
    ...scriptPops(p),
    "per_var = popnei.calc_per_var_distribs(",
    `    variants, pops=pops, min_num_individuals=${min}, poly_threshold=${String(options.polyThreshold)}`,
    ")",
    "table = pandas.DataFrame({",
    '    "individuals": {pop: len(names) for pop, names in pops.items()},',
    '    "expected_heterozygosity_unbiased": per_var.unbiased_exp_het.mean,',
    '    "observed_heterozygosity": per_var.obs_het.mean,',
    '    "proportion_polymorphic": per_var.poly_vars_ratio.poly_ratio,',
    "})",
    `# A population of fewer than ${min} individuals has a value at no variant; it`,
    "# is left out here, where it would take every variant out of the private",
    "# alleles of the others. A private allele needs two populations.",
    `large = {pop: names for pop, names in pops.items() if len(names) >= ${min}}`,
    "if large:",
    "    stats = [",
    "        popnei.PopDiversityStat.NUM_ALLELES,",
    "        popnei.PopDiversityStat.FIS,",
    "        popnei.PopDiversityStat.FOLDED_SFS,",
    "    ]",
    "    if len(large) > 1:",
    "        stats.append(popnei.PopDiversityStat.PRIVATE_ALLELES)",
    "    diversity = popnei.calc_pop_diversity(",
    `        variants, large, stats=stats, num_called_alleles=${draw}, min_num_individuals=${min}`,
    "    )",
    '    table["f"] = diversity.fis',
    '    table["alleles_per_variant"] = diversity.num_alleles["mean"]',
    '    table["alleles_per_variant_rarefied"] = diversity.num_alleles["in_draw"]',
    "    if diversity.private_alleles is not None:",
    '        table["private_alleles"] = diversity.private_alleles["total"]',
    '        table["private_alleles_per_variant"] = diversity.private_alleles["mean"]',
    '        table["private_alleles_per_variant_rarefied"] = diversity.private_alleles["in_draw"]',
    ...spectrumScript(draw),
    "print(table.to_string())",
  ]
    .map((line) => `${line}\n`)
    .join("");
}

/** The lines of the folded spectrum, of `sfs.md`, "Its lines of the
    Python script", in a draw of `draw` chromosomes, indented as the block
    `if large:` of `script`, where `diversity` is defined. */
function spectrumScript(draw: string): readonly string[] {
  return [
    "    # The folded site frequency spectrum of each population, in a draw of",
    `    # ${draw} chromosomes: the expected number of variants with each count of the`,
    "    # rarer allele, and the share of each count among the variants that show",
    "    # both alleles in the draw",
    "    spectrum = diversity.folded_sfs",
    "    print(spectrum.to_string())",
    "    both_alleles = spectrum.iloc[1:]",
    "    print((both_alleles / both_alleles.sum()).to_string())",
  ];
}

/** The lines of the script that make the dict of the populations: from
    the column of the metadata file, narrowed to the individuals of the
    variants file; or, for the one population, the individuals of the
    variants, which are those the filters of individuals keep once
    `filter_individuals` is put on `variants`, so no narrowing follows.
    Throws a defect on a project with no populations. */
function scriptPops(p: Project): readonly string[] {
  if (populationsOf(p) === "all") {
    return [
      "# The diversity of every individual, as one population",
      `pops = {${JSON.stringify(ONE_POPULATION)}: list(variants.individuals)}`,
    ];
  }
  const column = populationsColumn(p);
  if (column === null) {
    throw defect("the script of the diversity was asked with no populations.");
  }
  const name = JSON.stringify(column);
  return [
    `# The diversity of each population, from the column ${name}`,
    "pops = {}",
    `for individual, pop in zip(individuals.iloc[:, 0], individuals[${name}]):`,
    "    if not pandas.isna(pop):",
    "        pops.setdefault(pop, []).append(individual)",
    "kept = set(variants.individuals)",
    "pops = {pop: [i for i in names if i in kept] for pop, names in pops.items()}",
    "pops = {pop: names for pop, names in pops.items() if names}",
  ];
}

/** The column the populations are taken from, `populationsColumnOf` of
    project.ts. Throws a defect on a project of association, which has no
    diversity. */
function populationsColumn(p: Project): string | null {
  if (p.grouping.kind === "roles") {
    throw defect("the diversity was given a project of association.");
  }
  return populationsColumnOf(p);
}

/** The result as the diversity's own. Throws a defect on the result of
    another analysis, which the store never gives the diversity. */
function diversityResultOf(r: JobResult): DiversityResult {
  if (r.analysis !== "diversity") {
    throw defect(`the diversity was given a result of ${r.analysis}.`);
  }
  return r;
}

/** The element `i` of an array of a result; one missing is a defect, as
    every array of a result is as long as its populations. */
function valueAt(
  values: Uint32Array | Float64Array,
  i: number,
  name: string,
): number {
  const value = values[i];
  if (value === undefined) {
    throw defect(`the result of the diversity has no ${name} at ${String(i)}.`);
  }
  return value;
}
