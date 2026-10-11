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
 *
 * Two definitions are made by the same code: `diversity`, of the old
 * page, and `diversityOnPopgen2`, of the Populations tab of popgen2.html,
 * where an individual of no population is unclassified and left out, or,
 * when none has a population, every individual is one population,
 * "Unclassified", and whose words name the tabs and the boxes of that
 * page (docs/specs/analyses/diversity.md, "On popgen2.html").
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
  MAX_LISTED_POPULATIONS,
  MAX_NAMED,
  UNCLASSIFIED_POPULATION,
  bothOf,
  popgen2OnePopulationCause,
  popgen2Populations,
  popgen2PopulationsKept,
  popgen2PopulationsToRun,
} from "../project.ts";
import { filtersApplied } from "../filtersApplied.ts";
import {
  allEmptiedText,
  populationListsNeeds,
  populationsColumnOf,
  populationsKeptNeeds,
  populationsWithMinimum,
  populationsByLists,
} from "../populations.ts";
import type {
  OnePopulationCause,
  PopulationsKept,
  Project,
} from "../project.ts";
import type { Result } from "../result.ts";
import type {
  AnalysisDef,
  AnalysisError,
  Warning,
  WorkerClient,
} from "../store.ts";
import { fileRefusalText, passRefusalText } from "./fileRefusals.ts";
import { statisticsFailedWords } from "./individualChecks.ts";
import type { Failure } from "./individualChecks.ts";
import {
  CHANGE_SETTINGS,
  csvField,
  csvNumber,
  defect,
  orNull,
  percentOf,
  populationNotInResult,
  populationWarnings,
  refusalWords,
} from "./words.ts";
import type { PopulationWords } from "./words.ts";
import { MIN_DRAW } from "../../worker/protocol.ts";
import type {
  DiversityResult,
  Job,
  JobResult,
  Pops,
  Run,
} from "../../worker/protocol.ts";

/** The id of the analysis. */
const ID = "diversity";

/** The page a definition is for, which picks the populations and the
    words: the old page, popgen.html, or popgen2.html (the spec, "On
    popgen2.html"). */
export type DiversityPage = "popgen" | "popgen2";

/** The places a sentence of the module names, by the page. */
interface PlaceWords {
  /** The filters of the individuals: "the filters of individuals" on the
      old page, "the thresholds of the individuals" on popgen2.html. */
  readonly individualFilters: string;
  /** Where the filters are: "the Variants step", "the Variants tab". */
  readonly filtersPlace: string;
}

/** The places of each page. */
const PLACES: Readonly<Record<DiversityPage, PlaceWords>> = Object.freeze({
  popgen: Object.freeze({
    individualFilters: "the filters of individuals",
    filtersPlace: "the Variants step",
  }),
  popgen2: Object.freeze({
    individualFilters: "the thresholds of the individuals",
    filtersPlace: "the Variants tab",
  }),
});

/** The name of the one population of every individual by the page: "All
    individuals" on the old page, its `ONE_POPULATION`, and "Unclassified"
    on popgen2.html, the name the box Individuals and the PCA give the
    individuals of no population. */
export function onePopulationName(page: DiversityPage): string {
  return page === "popgen" ? ONE_POPULATION : UNCLASSIFIED_POPULATION;
}

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

/** The end of a refusal on popgen2.html that leaves the diversity live,
    once the user has changed what the words ask: it starts again by
    itself after the change, which nothing else says. */
const AGAIN_BY_ITSELF = "The diversity is then calculated again by itself.";

/**
 * The words of a refusal of popnei, for the error state of the panel of
 * the project `p` on the page `page`, by the
 * start of popnei's message: no population, which the thresholds of the
 * filters of individuals leave; on popgen2.html, the refusals of the
 * variants file itself, in the words of the box Variants,
 * `fileRefusalText`; the variants file holds no variant, or, for a VCF
 * read with only the passed variants, none that passed; the filters kept
 * none; a genotype of another ploidy than the one the VCF was read with;
 * a line of the VCF it cannot read, or a gzipped file damaged or cut
 * short; any other. Throws a defect on a project with no variants file,
 * and on a refusal of no population for a project with no column of the
 * populations.
 */
export function refusalText(
  message: string,
  p: Project,
  page: DiversityPage,
): string {
  if (p.variants === null) {
    throw defect("refusalText was given a project with no variants file.");
  }
  const fileName = escaped(p.variants.name);
  if (message.startsWith(NO_POPULATION)) {
    const column = populationsColumn(p);
    if (column === null) {
      throw defect(
        "the diversity was refused for no population with no column of the populations.",
      );
    }
    return page === "popgen"
      ? `The thresholds of the filters of individuals leave none of the individuals of ${fileName} that have a population in ${shown(column)}, so no population is left. Loosen the thresholds in the Variants step.`
      : `The thresholds of the individuals leave none of the individuals of ${fileName} that have a population in ${shown(column)}, so no population is left. Loosen the thresholds of the individuals in the Variants tab. ${AGAIN_BY_ITSELF}`;
  }
  if (page === "popgen2") {
    const fileWords = fileRefusalText(message, p, {
      cannot: "the diversity cannot be calculated",
      where: IN_BOX_VARIANTS,
    });
    if (fileWords !== null) return fileWords;
    return `${refusalWords(message, p, {
      change: `Change the settings, or open the variants file again${IN_BOX_VARIANTS}`,
      calculate: "calculate the diversity",
      nothingLeft: "there is no variant to calculate the diversity over",
      again: "to run it again",
      emptyPass: (name) =>
        `The thresholds of the Variants tab kept none of the variants of ${name}, so there is no variant to calculate the diversity over. Loosen them.`,
    })} ${AGAIN_BY_ITSELF}`;
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

/** Where the variants file is opened again on popgen2.html, after "open
    it again". */
const IN_BOX_VARIANTS = " in the box Variants";

/**
 * The words of the error state of the panel when the statistics of each
 * individual that a Run waited for were refused or failed, the store's
 * error with `ofStatistics`: `statisticsFailedWords` of the statistics,
 * with "the diversity was not run" when its own Run waited for them,
 * `waited`, and "the diversity cannot run" when it did not (stop C 4).
 * On popgen2.html, whose one pass gives the statistics, a refusal is in
 * the words of a refusal of that pass, `passRefusalText`.
 */
export function statisticsFailedText(
  error: AnalysisError,
  p: Project,
  failureText: (failure: Failure) => string,
  waited: boolean,
  page: DiversityPage,
): string {
  const notDone = waited
    ? "the diversity was not run"
    : "the diversity cannot run";
  return page === "popgen"
    ? statisticsFailedWords(error, p, failureText, notDone)
    : statisticsFailedWords(error, p, failureText, notDone, (message, q) =>
        passRefusalText(message, q, {
          cannot: "the statistics of each individual cannot be calculated",
          where: IN_BOX_VARIANTS,
        }),
      );
}

/** The definition of the diversity on the page `page`, as the store
    knows it: the same key, request and numbers on both pages, with the
    populations and the words of the page. */
function definitionOf(page: DiversityPage): AnalysisDef<Job, JobResult> {
  return Object.freeze({
    id: ID,
    app: Object.freeze(["popgen"] as const),
    defaults: DIVERSITY_DEFAULTS,
    keyVersion: 3,
    filtersRead: Object.freeze({ variants: true, individuals: true }),
    parseOptions,
    keyInputs: (p: Project) => keyInputs(p, page),
    needs: (p: Project) => (page === "popgen" ? needs(p) : popgen2Needs(p)),
    keptNeeds: (p: Project, kept: IndividualsKept) => keptNeeds(p, kept, page),
    run: (p: Project, c: WorkerClient<Job, JobResult>) => run(p, c, page),
    warnings: (
      result: JobResult,
      p: Project,
      individuals: readonly string[] | null,
    ) => warnings(result, p, individuals, page),
    checkNumbers,
    numCheckNumbers: (p: Project) => numCheckNumbers(p, page),
    script: (p: Project) => script(p, page),
  });
}

/** The diversity of the old page, listed by POPGEN_ANALYSES of
    src/core/apps.ts. */
export const diversity: AnalysisDef<Job, JobResult> = definitionOf("popgen");

/** The diversity of the Populations tab of popgen2.html, of the same id,
    listed by POPGEN2_ANALYSES of src/core/apps.ts after pcaOnPopgen2. */
export const diversityOnPopgen2: AnalysisDef<Job, JobResult> =
  definitionOf("popgen2");

/** The page of the definition `def` that a store runs, "popgen" for
    `diversity` and "popgen2" for `diversityOnPopgen2`, from which the
    parts of the panel take the populations and the words they show.
    Throws a defect on the definition of another analysis. */
export function diversityPageOf(
  def: AnalysisDef<Job, JobResult>,
): DiversityPage {
  if (def === diversity) {
    return "popgen";
  }
  if (def === diversityOnPopgen2) {
    return "popgen2";
  }
  throw defect(
    `the page of the diversity was asked of the analysis ${def.id}.`,
  );
}

/** The populations to run on the page `page`. */
function populationsToRunOf(p: Project, page: DiversityPage): Pops | null {
  return page === "popgen" ? populationsToRun(p) : popgen2PopulationsToRun(p);
}

/** The populations to run on the page `page` narrowed to the individuals
    kept, `kept`. */
function populationsKeptOf(
  p: Project,
  kept: readonly string[] | null,
  page: DiversityPage,
): PopulationsKept | null {
  return page === "popgen"
    ? populationsKept(p, kept)
    : popgen2PopulationsKept(p, kept);
}

/** Whether the page `page` runs every individual as one population. */
function isOnePopulation(p: Project, page: DiversityPage): boolean {
  return page === "popgen"
    ? populationsOf(p) === "all"
    : popgen2OnePopulationCause(p) !== null;
}

/**
 * The line of the populations of the Populations tab of popgen2.html for
 * the one population of `numIndividuals` individuals: "1 population,
 * Unclassified: 200 individuals. No individual is assigned to a
 * population, so the diversity is of every individual kept as one
 * population.", and a sentence that says why and how to get populations
 * for a refused file, a column absent and a column of too many values;
 * and, when the one population stands for an individuals file or a
 * column the user opened, one that says what it does to the numbers if
 * the individuals belong to several populations
 * (docs/specs/steps/popgen2-populations.md, "The populations it runs
 * on"). Throws a defect when popgen2.html runs populations of a column.
 */
export function popgen2OnePopulationLine(
  p: Project,
  numIndividuals: number,
): string {
  const cause = popgen2OnePopulationCause(p);
  if (cause === null) {
    throw defect(
      "the line of the one population was asked of populations of a column.",
    );
  }
  const line = `1 population, ${UNCLASSIFIED_POPULATION}: ${counted(numIndividuals, "individual")}. No individual is assigned to a population, so the diversity is of every individual kept as one population.`;
  const why = onePopulationWhy(p, cause);
  return [line, why, standsForOpened(cause) ? MIXED_POPULATIONS : null]
    .filter((sentence) => sentence !== null)
    .join(" ");
}

/** What the one population does to the numbers when its individuals
    belong to several populations: the Wahlund effect, F pooled above F
    within each (docs/functionality.md: nothing misleads without
    warning). */
const MIXED_POPULATIONS =
  "If the individuals belong to several populations, the expected heterozygosity and F are those of all of them pooled, and F comes out higher than within each population.";

/** Whether the one population of the cause `cause` stands for an
    individuals file or a column of the populations the user opened, and
    not for no file or "None", chosen to have none: a refused file, a
    column absent, not offered, of too many values or that classifies
    nobody. */
function standsForOpened(cause: OnePopulationCause): boolean {
  switch (cause.kind) {
    case "refused":
    case "noSuchColumn":
    case "notOffered":
    case "tooMany":
    case "noneClassified":
      return true;
    case "noFile":
    case "noColumn":
      return false;
  }
}

/** The sentence of the line of the one population that says why, for
    the cause `cause`, or `null` for a cause the first sentence says. */
function onePopulationWhy(
  p: Project,
  cause: OnePopulationCause,
): string | null {
  const fileName = escaped(p.individuals?.name ?? "");
  switch (cause.kind) {
    case "refused":
      return `${fileName} could not be read, as the box Individuals says; open it again, or another file, there to get populations.`;
    case "noSuchColumn":
      return `${fileName} has no column ${shown(cause.column)}; choose a column of the populations in the box Individuals.`;
    case "tooMany":
      return `${shown(cause.column)} has ${grouped(cause.numValues)} values, more than the ${String(MAX_LISTED_POPULATIONS)} a column of populations can have; choose another column in the box Individuals to get populations.`;
    case "noFile":
    case "noColumn":
    case "notOffered":
    case "noneClassified":
      return null;
  }
}

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
 * the table, `populationsOf` on the old page and `popgen2Populations` on
 * popgen2.html, and the options, with the draw only when it was typed. The
 * default draw is left out, and not written `null`, since the ploidy of
 * the load and the minimum beside it fix it, and a project file saved by
 * stage 4, whose options had no draw, then has the fingerprint of its
 * settings that stage 5 makes, so that its check numbers are compared.
 * Reads nothing of `p.variants`.
 */
function keyInputs(p: Project, page: DiversityPage): JsonObject {
  const options = diversityOptions(p);
  return {
    pops: page === "popgen" ? populationsOf(p) : popgen2Populations(p),
    options: {
      minNumIndividuals: options.minNumIndividuals,
      polyThreshold: options.polyThreshold,
      ...(options.numCalledAlleles === null
        ? {}
        : { numCalledAlleles: options.numCalledAlleles }),
    },
    ...(page === "popgen2" ? { words: popgen2WordsRead(p) } : {}),
  };
}

/**
 * What the warnings of popgen2.html read of `p` beyond the populations,
 * which the store makes once from the request's project and keeps with
 * the result, so that the key holds it and a result is never shown with
 * the words of another file or column: the cause of the one population
 * grouped as the words group it, "file" for no individuals file and a
 * refused one, "column" for "None", a column absent, not offered or of
 * too many values, and `null` for the populations of a column, which
 * the load of the variants file tells from a column that classifies
 * nobody; the name of the column of the populations; and the name of
 * the individuals file. Reads nothing of `p.variants` that changes the
 * answer.
 */
function popgen2WordsRead(p: Project): JsonObject {
  return {
    cause: causeGroupOf(popgen2OnePopulationCause(p)),
    column: populationsColumnOf(p),
    individualsFile: p.individuals?.name ?? null,
  };
}

/** The group of the cause `cause` of the one population by the words of
    its warnings, as `popgen2WordsRead` gives it. */
function causeGroupOf(
  cause: OnePopulationCause | null,
): "file" | "column" | null {
  switch (cause?.kind) {
    case "noFile":
    case "refused":
      return "file";
    case "noColumn":
    case "noSuchColumn":
    case "notOffered":
    case "tooMany":
      return "column";
    case "noneClassified":
    case undefined:
      return null;
  }
}

/**
 * Whether populations of the sizes `sizes`, in individuals, hold fewer
 * chromosomes between them, at the ploidy `ploidy`, than the least draw,
 * 2: one haploid individual. No draw can be taken from them, so
 * `calcPopDiversity` is not called for them, the diversity is not locked
 * by its draw, and a warning says why the numbers of that call are
 * missing (the spec, "Why it cannot run").
 */
export function holdNoDraw(sizes: readonly number[], ploidy: number): boolean {
  const individuals = sizes.reduce((sum, size) => sum + size, 0);
  return individuals * ploidy < MIN_DRAW;
}

/** The first reason the diversity cannot run beyond those every analysis
    shares and the lists of individuals popnei would refuse, or `null`:
    the individuals file, the column of the populations, the lists to
    keep and to remove leaving no population of a column, and, last, a
    draw larger than the chromosomes of the largest population those
    lists keep;
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
        {
          individuals: "the lists of individuals keep",
          population: " the lists of individuals keep",
          orElse: ", or change the lists in the Variants step",
        },
        "popgen",
      )
    : drawNeeds(p, kept.byLists, unfilteredWords(p.variants.name), "popgen");
}

/** The words of a lock of the draw over every individual of the
    variants file `variantsName`. */
function unfilteredWords(variantsName: string): DrawWords {
  return {
    individuals: `of ${escaped(variantsName)}`,
    population: "",
    orElse: "",
  };
}

/** The first reason the diversity of popgen2.html cannot run beyond
    those every analysis shares, or `null` (the spec, "On popgen2.html"):
    the individuals file being read. The draw larger than the chromosomes
    of the largest population is `keptNeeds`'s, which the store asks
    after its lock of no individual kept, so that a user whose thresholds
    keep no individual is not told to change the draw, which would not
    help. An individual of the variants file not in the individuals file,
    a refused file and a column that gives no population do not lock:
    their individuals are unclassified. Throws a defect on a project of
    association. */
function popgen2Needs(p: Project): string | null {
  const individuals = p.individuals;
  if (individuals?.read.kind === "pending") {
    return `The diversity waits for ${escaped(individuals.name)} to be read.`;
  }
  if (p.grouping.kind === "roles") {
    throw defect("the diversity was given a project of association.");
  }
  return null;
}

/**
 * The reason the diversity cannot run for the individuals kept, `kept`,
 * whose list is known and keeps some individual, or `null`: the list
 * leaves no population, `populationsKeptNeeds`; or its largest
 * population holds fewer chromosomes than the draw of the rarefaction
 * while some population of the request has the minimum of individuals,
 * told only when the list is shorter than the individuals the lists to
 * keep and to remove keep, which `needs` counts. `null` while the list
 * is not known.
 */
function keptNeeds(
  p: Project,
  kept: IndividualsKept,
  page: DiversityPage,
): string | null {
  const noPopulation =
    page === "popgen"
      ? populationsKeptNeeds(p, kept)
      : popgen2PopulationsKeptNeeds(p, kept);
  if (noPopulation !== null) {
    return noPopulation;
  }
  if (page === "popgen2") {
    return popgen2DrawNeeds(p, kept);
  }
  const list = kept.list.kind === "known" ? kept.list.individuals : null;
  if (list === null || list.length >= kept.byLists.length) {
    return null;
  }
  const { individualFilters, filtersPlace } = PLACES[page];
  return drawNeeds(
    p,
    list,
    {
      individuals: `${individualFilters} keep`,
      population: ` ${individualFilters} keep`,
      orElse: `, or loosen ${individualFilters} in ${filtersPlace}`,
    },
    page,
  );
}

/** The lock of the draw on popgen2.html, for the individuals kept,
    `kept`, whose list is known: over every individual of the variants
    file, in the words that name no filter, when the thresholds keep them
    all; over those they keep, in the words of the Variants tab,
    otherwise; `null` while the list is not known. */
function popgen2DrawNeeds(p: Project, kept: IndividualsKept): string | null {
  if (kept.list.kind !== "known" || p.variants === null) {
    return null;
  }
  const list = kept.list.individuals;
  if (list === null || list.length >= kept.byLists.length) {
    return drawNeeds(
      p,
      kept.byLists,
      unfilteredWords(p.variants.name),
      "popgen2",
    );
  }
  const { individualFilters, filtersPlace } = PLACES.popgen2;
  return drawNeeds(
    p,
    list,
    {
      individuals: `${individualFilters} keep`,
      population: ` ${individualFilters} keep`,
      orElse: `, or loosen ${individualFilters} in ${filtersPlace}`,
    },
    "popgen2",
  );
}

/** `populationsKeptNeeds` on popgen2.html: the individuals kept, once
    known, leave none of the populations of the column, whose individuals
    are then all unclassified, in the words of the Variants tab; `null`
    for the one population, which takes every individual kept. */
function popgen2PopulationsKeptNeeds(
  p: Project,
  kept: IndividualsKept,
): string | null {
  const list = kept.list.kind === "known" ? kept.list.individuals : null;
  const column = populationsColumnOf(p);
  if (list === null || column === null) {
    return null;
  }
  const left = popgen2PopulationsKept(p, list);
  if (left === null || left.pops.length > 0 || left.emptied.length === 0) {
    return null;
  }
  return allEmptiedText(
    list.length,
    column,
    left.emptied,
    (one) =>
      `Loosen the thresholds of the individuals in the Variants tab to keep ${one ? "it" : "them"}.`,
  );
}

/** The words of a lock of the draw that say whose chromosomes it
    counts. */
interface DrawWords {
  /** Which individuals they are, after "the 45 individuals": "of
      panel.nei", "the lists of individuals keep". */
  readonly individuals: string;
  /** What keeps the largest population, after "the largest population":
      " the lists of individuals keep", or nothing. */
  readonly population: string;
  /** What else the user can do, after "in the options of the
      diversity". */
  readonly orElse: string;
}

/**
 * The reason of a draw larger than the chromosomes of the largest
 * population the individuals `individuals` leave, which no population
 * can then reach, so that none would have a rarefied value or a
 * spectrum, or `null` (the owner, 1 October 2026). popnei refuses a draw
 * above the chromosomes of every individual, at the first range it reads
 * of the second pass; the largest population holds no more, so the lock
 * keeps those draws from it too.
 *
 * `null` when no population of the request made of them has the minimum
 * of individuals, since `calcPopDiversity` is then not called, and when
 * the populations hold fewer than 2 chromosomes between them,
 * `holdNoDraw`, when it is not called either. For the one population of
 * the old page, and when the largest population holds fewer than 2
 * chromosomes, where "at most 1" is a number the field refuses, the lock
 * counts the individuals, and its words name them and not a population;
 * the one population of popgen2.html is named, "the one population,
 * Unclassified". The populations are those of the page `page`.
 */
function drawNeeds(
  p: Project,
  individuals: readonly string[],
  words: DrawWords,
  page: DiversityPage,
): string | null {
  const read = p.variants?.read;
  const draw = drawOf(p);
  const left = populationsKeptOf(p, individuals, page);
  if (read?.kind !== "read" || draw === null || left === null) {
    return null;
  }
  const { withMinimum } = populationsWithMinimum(
    left.pops,
    diversityOptions(p).minNumIndividuals,
  );
  const sizes = left.pops.map(([, members]) => members.length);
  if (withMinimum.length === 0 || holdNoDraw(sizes, read.ploidy)) {
    return null;
  }
  const size = Math.max(...sizes);
  // The first of the largest populations, in the order of the request.
  const largest = left.pops.find(([, members]) => members.length === size);
  const start = `The rarefaction draws ${grouped(draw)} chromosomes, and`;
  const ploidy = `at a ploidy of ${String(read.ploidy)}`;
  const onePopulation = isOnePopulation(p, page);
  if (
    (onePopulation && page === "popgen") ||
    largest === undefined ||
    size * read.ploidy < MIN_DRAW
  ) {
    const chromosomes = individuals.length * read.ploidy;
    if (draw <= chromosomes) {
      return null;
    }
    const hold =
      individuals.length === 1
        ? `the one individual ${words.individuals} holds`
        : `the ${grouped(individuals.length)} individuals ${words.individuals} hold`;
    return `${start} ${hold} ${grouped(chromosomes)} ${ploidy}. ${atMost(chromosomes, words)}`;
  }
  const chromosomes = size * read.ploidy;
  if (draw <= chromosomes) {
    return null;
  }
  const its =
    size === 1 ? "its one individual" : `its ${grouped(size)} individuals`;
  const which = onePopulation ? "the one population" : "the largest population";
  return `${start} ${which}${words.population}, ${namesOf([largest[0]])}, holds ${grouped(chromosomes)}, those of ${its} ${ploidy}. ${atMost(chromosomes, words)}`;
}

/** What a lock of the draw tells the user to do: "Type a number of
    chromosomes of at most 168 in the options of the diversity." */
function atMost(chromosomes: number, words: DrawWords): string {
  return `Type a number of chromosomes of at most ${grouped(chromosomes)} in the options of the diversity${words.orElse}.`;
}

/** Builds the request, with the individuals the filters keep that the
    store gives through `c`, and sends it through `c`: the default draw,
    and the populations with at least the minimum of individuals as those
    of `calcPopDiversity`, the rule of decision 7 made here and not in the
    runner, or none when the populations hold fewer than 2 chromosomes
    between them, `holdNoDraw`. Throws a defect when the variants file is not read or there
    are no populations to run, which `needs` rules out. */
function run(
  p: Project,
  c: WorkerClient<Job, JobResult>,
  page: DiversityPage,
): Run<JobResult> {
  const kept = populationsKeptOf(p, c.individuals, page);
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
    filters: jobFilters(filtersApplied(p)),
    individuals: c.individuals,
    pops: kept.pops,
    minNumIndividuals: options.minNumIndividuals,
    polyThreshold: options.polyThreshold,
    numCalledAlleles: draw,
    popDiversityPops: holdNoDraw(
      kept.pops.map(([, members]) => members.length),
      p.variants.read.ploidy,
    )
      ? []
      : populationsWithMinimum(
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
 * value at, or, in the place of those of the private alleles and of the
 * draw, populations that hold fewer than 2 chromosomes, for which
 * `calcPopDiversity` was not called; and F in a haploid file. The
 * warning of the spectrum is not among them: its block says it
 * (docs/specs/analyses/sfs.md). The populations given to
 * `calcPopDiversity` are found as `run` chose them, from
 * `numIndividuals`, the minimum and the ploidy.
 */
function warnings(
  result: JobResult,
  p: Project,
  individuals: readonly string[] | null,
  page: DiversityPage,
): readonly Warning[] {
  const r = diversityResultOf(result);
  const read = p.variants?.read;
  if (p.variants === null || read?.kind !== "read") {
    throw defect("the warnings of the diversity need a variants file read.");
  }
  const min = diversityOptions(p).minNumIndividuals;
  const found: Warning[] = [];
  const rows = diversityRows(r);
  const toRun = populationsToRunOf(p, page) ?? [];
  const onePopulation = isOnePopulation(p, page);
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
        ? tooFewOfOneText(tooFew, min, filtered, page)
        : tooFewText(tooFew, min, filtered, p, page),
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
  if (page === "popgen") {
    found.push(...populationWarnings(r.pops, p, DIVERSITY_WORDS));
  } else {
    // An unclassified individual is no fault on popgen2.html, whose tab
    // says how many are left out.
    const notInResult = onePopulation
      ? null
      : populationNotInResult(
          r.pops,
          toRun,
          escaped(p.variants.name),
          DIVERSITY_WORDS.notIn,
        );
    found.push(...(notInResult === null ? [] : [notInResult]));
  }
  const notCalled =
    rows.some((row) => row.individuals >= min) &&
    holdNoDraw(
      rows.map((row) => row.individuals),
      read.ploidy,
    );
  if (notCalled) {
    found.push({
      code: "tooFewChromosomesForDraw",
      text: `The diversity was calculated over one individual of ploidy 1, which holds 1 chromosome, and the rarefaction and the spectrum draw ${String(MIN_DRAW)} or more. So the alleles per variant, the private alleles, their rarefied values and the spectrum, which are calculated together, have no value.`,
    });
  } else {
    found.push(...privateAllelesWarnings(r, rows, min, p, individuals, page));
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
  }
  if (read.ploidy === 1) {
    found.push({
      code: "noFInHaploid",
      text: `The variants of ${escaped(p.variants.name)} have a ploidy of 1, and a genotype of one allele cannot be heterozygous, so F has no value.`,
    });
  }
  return found;
}

/**
 * The warnings of the private alleles, from stage 5, in this order:
 * counted without the populations of fewer than `min` individuals, which
 * `run` left out of `calcPopDiversity`; not counted, with one population
 * given to it, in the words of the one population of the page `page`
 * when every individual is one population, and, on popgen2.html, in the
 * words of one classified population when the result has no other;
 * counted over fewer variants than the filters kept.
 */
function privateAllelesWarnings(
  r: DiversityResult,
  rows: readonly DiversityRow[],
  min: number,
  p: Project,
  individuals: readonly string[] | null,
  page: DiversityPage,
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
      text: isOnePopulation(p, page)
        ? onePopulationPrivateText(p, page)
        : page === "popgen2" && rows.length === 1
          ? onlyClassifiedText(p, only.population, individuals)
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

/** The text of `privateAllelesNeedTwoPopulations` for the one population
    on the page `page`: no allele can be private, and how to get
    populations, on popgen2.html by why there is one population. */
function onePopulationPrivateText(p: Project, page: DiversityPage): string {
  const first =
    "With every individual in one population, no allele can be private, found in this population and in no other, so the table has no private alleles.";
  if (page === "popgen") {
    return `${first} Choose a column that defines the populations in the Individuals step to count them.`;
  }
  const cause = popgen2OnePopulationCause(p);
  if (cause === null) {
    throw defect("the one population has no cause on popgen2.html.");
  }
  switch (cause.kind) {
    case "noFile":
    case "refused":
      return `${first} Open an individuals file that assigns the individuals to populations in the box Individuals to count them.`;
    case "noColumn":
    case "noSuchColumn":
    case "notOffered":
    case "tooMany":
      return `${first} Choose a column of the populations in the box Individuals to count them.`;
    case "noneClassified": {
      const column = shown(cause.column);
      return `${first} ${column} gives none of the individuals of ${escaped(p.variants?.name ?? "")} a population. Choose another column of the populations in the box Individuals, or fill in ${column} in ${escaped(p.individuals?.name ?? "")} and open it again, to count them.`;
    }
  }
}

/** The text of `privateAllelesNeedTwoPopulations` on popgen2.html when
    `population` is the one population of the column in the result, with
    a last sentence when some of the individuals kept, `individuals`,
    `null` for every one of the variants file, are unclassified, which
    the runner left out. */
function onlyClassifiedText(
  p: Project,
  population: string,
  individuals: readonly string[] | null,
): string {
  const column = populationsColumnOf(p) ?? "";
  const text = `Of the populations of ${shown(column)}, only ${namesOf([population])} has individuals kept, and an allele is private when one population has it and no other does, so the table has no private alleles.`;
  const unclassified =
    popgen2PopulationsKept(p, individuals)?.unclassifiedLeftOut ?? 0;
  return unclassified > 0
    ? `${text} The unclassified individuals are not a population to compare it with.`
    : text;
}

/** The text of `tooFewIndividuals`, for its populations, on the page
    `page`; `filtered` when the filters of individuals took individuals
    from one of them, which the text then offers to loosen. */
function tooFewText(
  rows: readonly DiversityRow[],
  min: number,
  filtered: boolean,
  p: Project,
  page: DiversityPage,
): string {
  const rule = `a variant has a value in a population only when at least ${grouped(min)} of its individuals have a called genotype there`;
  const names = namesOf(rows.map((row) => row.population));
  const file =
    page === "popgen"
      ? "the metadata file"
      : escaped(p.individuals?.name ?? "");
  const end = `in ${file}, ${LOWER_MINIMUM}${filtered ? loosenFilters(page) : "."}`;
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

/** The end of `tooFewIndividuals` on the page `page` when the filters
    of individuals took individuals from a population it names. */
function loosenFilters(page: DiversityPage): string {
  const { individualFilters, filtersPlace } = PLACES[page];
  return `, or loosen ${individualFilters} in ${filtersPlace}.`;
}

/** The text of `tooFewIndividuals` for the one population, `rows` its
    one row, which has no metadata file to merge it in, on the page
    `page`, which on popgen2.html calls it the unclassified individuals;
    `filtered` when the filters of individuals took individuals from
    it. */
function tooFewOfOneText(
  rows: readonly DiversityRow[],
  min: number,
  filtered: boolean,
  page: DiversityPage,
): string {
  const [row] = rows;
  if (row === undefined || rows.length !== 1) {
    throw defect("the one population has another number of rows than one.");
  }
  const end = `To have them, lower the minimum number of individuals in the options of the diversity${filtered ? loosenFilters(page) : "."}`;
  const rule = `a variant has a value in a population only when at least ${grouped(min)} of its individuals have a called genotype there`;
  if (page === "popgen") {
    return `${escaped(row.population)}, the one population, has ${counted(row.individuals, "individual")}, and ${rule}, so it has no values. ${end}`;
  }
  return row.individuals === 1
    ? `The individual of the one population, ${escaped(row.population)}, is 1, and ${rule}, so it has no values. ${end}`
    : `The individuals of the one population, ${escaped(row.population)}, are ${grouped(row.individuals)}, and ${rule}, so they have no values. ${end}`;
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
function numCheckNumbers(p: Project, page: DiversityPage): number | null {
  if (populationsToRunOf(p, page) === null || hasIndividualThreshold(p)) {
    return null;
  }
  const left =
    page === "popgen" ? populationsByLists(p) : popgen2PopulationsByLists(p);
  return left === null ? null : 1 + NUMBERS_PER_POPULATION * left.length;
}

/** The populations of popgen2.html that the lists of individuals to keep
    and to remove leave, as `populationsByLists`. */
function popgen2PopulationsByLists(p: Project): Pops | null {
  const kept = individualsKept(p, null);
  return kept === null
    ? null
    : (popgen2PopulationsKept(p, kept.byLists)?.pops ?? null);
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
function script(p: Project, page: DiversityPage): string {
  const options = diversityOptions(p);
  const min = String(options.minNumIndividuals);
  const drawn = drawOf(p);
  if (drawn === null) {
    throw defect("the script of the diversity was asked with no draw.");
  }
  const draw = String(drawn);
  return [
    ...scriptPops(p, page),
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
    variants file; or, for the one population, named as on the page
    `page`, the individuals of the variants, which are those the filters
    of individuals keep once `filter_individuals` is put on `variants`,
    so no narrowing follows. Throws a defect on a project with no
    populations. */
function scriptPops(p: Project, page: DiversityPage): readonly string[] {
  if (isOnePopulation(p, page)) {
    return [
      "# The diversity of every individual, as one population",
      `pops = {${JSON.stringify(onePopulationName(page))}: list(variants.individuals)}`,
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
