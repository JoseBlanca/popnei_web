/**
 * The diversity of each population: what its result is calculated from,
 * when it cannot run, the request it sends, its warnings, its check
 * numbers, its lines of the Python script, the rows and the CSV of its
 * table, and the words of its error state, for popnei's refusal
 * (`refusalText`) and for statistics of each individual that failed
 * (`statisticsFailedText`) (docs/specs/analyses/diversity.md, "The
 * module").
 *
 * The three numbers of each population are popnei's, from one call of
 * `calcPerVarDistribs` in the calculation worker; this module computes
 * none of them. The populations are those of `project.ts`, which every
 * analysis per population shares: those of a column of the metadata
 * file, or one population of every individual, "All individuals".
 */

import { individualsKept } from "../individualsKept.ts";
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
} from "../project.ts";
import type { Project } from "../project.ts";
import type { Result } from "../result.ts";
import type {
  AnalysisDef,
  AnalysisError,
  Warning,
  WorkerClient,
} from "../store.ts";
import { statisticsFailedWords } from "./individualChecks.ts";
import type { Failure } from "./individualChecks.ts";
import {
  CHANGE_SETTINGS,
  csvField,
  csvNumber,
  defect,
  orNull,
  refusalWords,
} from "./words.ts";
import type {
  Cell,
  DiversityResult,
  Job,
  JobResult,
  Run,
} from "../../worker/protocol.ts";

/** The id of the analysis. */
const ID = "diversity";

/**
 * The two options of the diversity when the user has set none, popnei's
 * own defaults of `calcPerVarDistribs`: a variant has a value in a
 * population only when at least 20 of its individuals have a called
 * genotype there, and is polymorphic when its commonest allele is below
 * 0.95.
 */
export const DIVERSITY_DEFAULTS: {
  readonly minNumIndividuals: 20;
  readonly polyThreshold: 0.95;
} = Object.freeze({ minNumIndividuals: 20, polyThreshold: 0.95 });

/** The two options of the diversity, as the module reads them. */
interface DiversityOptions {
  readonly minNumIndividuals: number;
  readonly polyThreshold: number;
}

/** The largest `minNumIndividuals` popnei's `calcPerVarDistribs` accepts,
    2^32 − 1, `LARGEST_WHOLE_NUMBER` of popnei's `arguments.ts`. */
const MAX_MIN_NUM_INDIVIDUALS = 4_294_967_295;

/** What the options should be, the end of "‹the field› should be ‹…›" of
    `projectErrorText`. */
const OPTIONS_EXPECTED =
  "the minimum of individuals, a whole number from 0 to 4,294,967,295, and the frequency below which a variant is polymorphic, a number from 0 to 1, and nothing else";

/** The rows of each result, so that a screen drawn again gets the same
    array. */
const ROWS = new WeakMap<DiversityResult, readonly DiversityRow[]>();

/** The reason of the lock of `keptNeeds`, when the `numKept`
    individuals kept have no population in the column `column`, which
    leaves every population, `emptied`, empty: "The 34 individuals kept
    have no population in popcat, so none of the 2 populations has an
    individual left. Loosen …", with one population by its name. */
export function allEmptiedText(
  numKept: number,
  column: string,
  emptied: readonly string[],
): string {
  const kept =
    numKept === 1
      ? "The one individual kept has"
      : `The ${counted(numKept, "individual")} kept have`;
  const [only] = emptied;
  const left =
    emptied.length === 1 && only !== undefined
      ? `${escaped(only)} has no individual left. ${loosenText(true)}`
      : `none of the ${counted(emptied.length, "population")} has an individual left. ${loosenText(false)}`;
  return `${kept} no population in ${shown(column)}, so ${left}`;
}

/** What to do about populations left empty, of one or of several. */
export function loosenText(one: boolean): string {
  return `Loosen the filters of individuals in the Variants step to keep ${one ? "it" : "them"}.`;
}

/** The reason the diversity cannot run for the individuals kept: they
    leave no population (docs/specs/analyses/diversity.md, "Why it
    cannot run", decided by the owner at stop B on 27 September 2026);
    `null` when some population keeps an individual. */
function keptNeeds(p: Project, kept: IndividualsKept): string | null {
  const list = kept.list.kind === "known" ? kept.list.individuals : null;
  const left = populationsKept(p, list);
  const column = populationsColumn(p);
  if (
    list === null ||
    column === null ||
    left === null ||
    left.pops.length > 0 ||
    left.emptied.length === 0
  ) {
    return null;
  }
  return allEmptiedText(list.length, column, left.emptied);
}

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
      }),
    ),
  );
  ROWS.set(r, rows);
  return rows;
}

/** The header of the CSV of the table. */
const CSV_HEADER =
  "population,individuals,expected_heterozygosity_unbiased,observed_heterozygosity,proportion_polymorphic";

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
  keyVersion: 2,
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
 * them back as an object of exactly the two fields: `minNumIndividuals`, a
 * whole number from 0 to 4,294,967,295, and `polyThreshold`, a number
 * from 0 to 1. Every version of the format reads them in the same way,
 * so the version the store passes is not read.
 */
function parseOptions(options: unknown): Result<JsonObject, string> {
  const read = readOptions(options);
  return read.ok ? { ok: true, value: { ...read.value } } : read;
}

/** The two options read from `options`, or what they should be. */
function readOptions(options: unknown): Result<DiversityOptions, string> {
  const refused = { ok: false, error: OPTIONS_EXPECTED } as const;
  if (
    typeof options !== "object" ||
    options === null ||
    Array.isArray(options)
  ) {
    return refused;
  }
  const fields = Object.keys(options);
  if (
    fields.length !== 2 ||
    !Object.hasOwn(options, "minNumIndividuals") ||
    !Object.hasOwn(options, "polyThreshold")
  ) {
    return refused;
  }
  const minNumIndividuals: unknown = Reflect.get(options, "minNumIndividuals");
  const polyThreshold: unknown = Reflect.get(options, "polyThreshold");
  if (
    typeof minNumIndividuals !== "number" ||
    !Number.isInteger(minNumIndividuals) ||
    minNumIndividuals < 0 ||
    minNumIndividuals > MAX_MIN_NUM_INDIVIDUALS ||
    typeof polyThreshold !== "number" ||
    !Number.isFinite(polyThreshold) ||
    polyThreshold < 0 ||
    polyThreshold > 1
  ) {
    return refused;
  }
  return { ok: true, value: { minNumIndividuals, polyThreshold } };
}

/** What the key holds beyond the load and the filters: the populations of
    the table and the two options. Reads nothing of `p.variants`. */
function keyInputs(p: Project): JsonObject {
  const options = optionsOf(p);
  return {
    pops: populationsOf(p),
    options: {
      minNumIndividuals: options.minNumIndividuals,
      polyThreshold: options.polyThreshold,
    },
  };
}

/** The first reason the diversity cannot run beyond those every analysis
    shares and the lists of individuals popnei would refuse, or `null`:
    the individuals file, the column of the populations, and the lists
    to keep and to remove leaving no population of a column; without a
    metadata file, or with the grouping `onePopulation`, only the first
    can lock. Throws a defect on a project of association whose
    individuals file is read. */
function needs(p: Project): string | null {
  const reason = individualsNeeds(p);
  if (reason !== null) {
    return reason;
  }
  if (p.grouping.kind === "roles") {
    throw defect("the diversity was given a project of association.");
  }
  return populationsNeeds(p)?.reason ?? listsNeeds(p);
}

/** The reason when the lists of individuals to keep and to remove leave
    no individual that has a population, known from the project alone;
    `null` otherwise, and when the individuals kept cannot be made, which
    the store locks on first. */
function listsNeeds(p: Project): string | null {
  const kept = individualsKept(p, null);
  if (kept === null || p.variants === null) {
    return null;
  }
  const column = populationsColumn(p);
  const left = populationsKept(p, kept.byLists);
  if (column === null || left === null || left.pops.length > 0) {
    return null;
  }
  return `The lists of individuals to keep and to remove leave none of the individuals of ${escaped(p.variants.name)} that have a population in ${shown(column)}, so no population is left. Change the lists in the Variants step.`;
}

/** Builds the request, with the individuals the filters keep that the
    store gives through `c`, and sends it through `c`. Throws a defect when
    the variants file is not read or there are no populations to run,
    which `needs` rules out. */
function run(p: Project, c: WorkerClient<Job, JobResult>): Run<JobResult> {
  const kept = populationsKept(p, c.individuals);
  if (p.variants === null || kept === null) {
    throw defect("the diversity was run with no populations to run.");
  }
  const options = optionsOf(p);
  return c.run({
    analysis: ID,
    fileId: p.variants.fileId,
    filters: jobFilters(p.filters),
    individuals: c.individuals,
    pops: kept.pops,
    minNumIndividuals: options.minNumIndividuals,
    polyThreshold: options.polyThreshold,
  });
}

/**
 * The warnings of a result, given the project its request was made from,
 * in this order: populations of too few individuals, populations with a
 * value at fewer variants than the filters kept, individuals of the
 * variants file with no population, populations with individuals in the
 * variants file that are not in the result.
 */
function warnings(result: JobResult, p: Project): readonly Warning[] {
  const r = diversityResultOf(result);
  const variants = p.variants;
  if (variants?.read.kind !== "read") {
    throw defect("the warnings of the diversity need a variants file read.");
  }
  const fileName = escaped(variants.name);
  const min = optionsOf(p).minNumIndividuals;
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
  const withoutValue = rows
    .map((row, i) => ({
      row,
      withValue: valueAt(r.numVarsWithValue, i, "numVarsWithValue"),
    }))
    .filter(
      ({ row, withValue }) =>
        row.individuals >= min && withValue < r.passStats.numVars,
    );
  if (withoutValue.length > 0) {
    found.push({
      code: "variantsWithoutValue",
      text: withoutValueText(withoutValue, r.passStats.numVars, min),
    });
  }
  const unassigned = unassignedOf(p);
  const noPopulation = variants.read.individuals.filter((individual) =>
    unassigned.has(individual),
  );
  if (noPopulation.length > 0) {
    const one = noPopulation.length === 1;
    found.push({
      code: "individualsWithoutPopulation",
      text: `${counted(noPopulation.length, "individual")} of ${fileName} ${one ? "has" : "have"} no population, and ${one ? "is" : "are"} left out of the diversity: ${namesOf(noPopulation)}. If ${one ? "it belongs" : "they belong"} to one, fill in ${one ? "its" : "their"} population in the metadata file and load it again.`,
    });
  }
  // A population none of whose individuals is in the variants file is
  // not among these: a metadata file may serve several panels. The one
  // population is never among them: filters that keep none of it keep
  // no individual, which the store locks on.
  const inResult = new Set(r.pops);
  const missing = onePopulation
    ? []
    : toRun.map(([pop]) => pop).filter((pop) => !inResult.has(pop));
  if (missing.length > 0) {
    const one = missing.length === 1;
    found.push({
      code: "populationNotInResult",
      text: `${one ? "Population" : "Populations"} ${namesOf(missing)} ${one ? "has" : "have"} no individual among the individuals of ${fileName} that the filters kept, so ${one ? "it is" : "they are"} not in the table.`,
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
  const end = filtered
    ? "in the metadata file, or loosen the filters of individuals in the Variants step."
    : "in the metadata file.";
  const [first] = rows;
  if (rows.length === 1 && first !== undefined) {
    return `Population ${names} has ${counted(first.individuals, "individual")}, and ${rule}, so ${names} has no values. To have them, merge it with another population ${end}`;
  }
  const counts =
    rows.length <= MAX_NAMED
      ? `, ${listed(rows.map((row) => grouped(row.individuals)))}`
      : "";
  return `Populations ${names} have fewer than ${grouped(min)} individuals${counts}, and ${rule}, so they have no values. To have them, merge each with another population ${end}`;
}

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
  const end = filtered
    ? "To have them, loosen the filters of individuals in the Variants step."
    : `The minimum of ${grouped(min)} cannot be changed in this version.`;
  return `${escaped(row.population)}, the one population, has ${counted(row.individuals, "individual")}, and a variant has a value in a population only when at least ${grouped(min)} of its individuals have a called genotype there, so it has no values. ${end}`;
}

/** The individuals of the table whose cell in the column of the
    populations is missing, who are in no population; none for the one
    population. */
function unassignedOf(p: Project): ReadonlySet<string> {
  const column = populationsColumn(p);
  const read = p.individuals?.read;
  if (column === null || read?.kind !== "read") {
    return new Set();
  }
  const index = read.table.columns.indexOf(column);
  return new Set(
    index === -1
      ? []
      : read.table.rows
          .filter((row) => row[index] === null)
          .map((row) => identifierOf(row[0])),
  );
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
      : `${names} has a value at ${grouped(first.withValue)} of ${kept} (${share(first.withValue, numVars)}); at the others fewer than ${grouped(min)} of its individuals have a genotype.`;
  }
  if (pops.length > MAX_NAMED) {
    return `${names} have a value at fewer than ${kept}; at the others fewer than ${grouped(min)} of their individuals have a genotype.`;
  }
  const counts = listed(pops.map(({ withValue }) => grouped(withValue)));
  const shares = listed(pops.map(({ withValue }) => share(withValue, numVars)));
  return `${names} have a value at ${counts} of ${kept} (${shares}); at the others fewer than ${grouped(min)} of their individuals have a genotype.`;
}

/** A share as a whole percentage rounded to the nearest, except that a
    share below 100% is never written 100%, nor one above 0% written 0%. */
function share(part: number, whole: number): string {
  const rounded = Math.round((part / whole) * 100);
  const percent =
    part < whole && rounded === 100
      ? 99
      : part > 0 && rounded === 0
        ? 1
        : rounded;
  return `${String(percent)}%`;
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
  const hasThreshold = p.individualFilters.some(
    (filter) => filter.kind === "missing_data" || filter.kind === "obs_het",
  );
  if (populationsToRun(p) === null || hasThreshold) {
    return null;
  }
  const kept = individualsKept(p, null);
  const left = kept === null ? null : populationsKept(p, kept.byLists);
  return left === null ? null : 1 + NUMBERS_PER_POPULATION * left.pops.length;
}

/** The check numbers of each population: its expected heterozygosity, its
    observed heterozygosity and its proportion of polymorphic variants. */
const NUMBERS_PER_POPULATION = 3;

/**
 * The lines of the Python script that calculate the same numbers with
 * popnei's Python API, after the lines that open `variants` and read the
 * table `individuals`. Throws a defect on a project with no column of the
 * populations, since it is asked only of an analysis that has run.
 */
function script(p: Project): string {
  const options = optionsOf(p);
  return [
    ...scriptPops(p),
    "diversity = popnei.calc_per_var_distribs(",
    `    variants, pops=pops, min_num_individuals=${String(options.minNumIndividuals)}, poly_threshold=${String(options.polyThreshold)}`,
    ")",
    "print(pandas.DataFrame({",
    '    "individuals": {pop: len(names) for pop, names in pops.items()},',
    '    "expected_heterozygosity_unbiased": diversity.unbiased_exp_het.mean,',
    '    "observed_heterozygosity": diversity.obs_het.mean,',
    '    "proportion_polymorphic": diversity.poly_vars_ratio.poly_ratio,',
    "}).to_string())",
  ]
    .map((line) => `${line}\n`)
    .join("");
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

/** The options of the project for the diversity, or the defaults. Throws
    a defect on options its `parseOptions` would refuse, which no command
    puts into a project. */
function optionsOf(p: Project): DiversityOptions {
  const read = readOptions(analysisOptions(p, ID, DIVERSITY_DEFAULTS));
  if (!read.ok) {
    throw defect("the project holds options of the diversity it refuses.");
  }
  return read.value;
}

/** The column the populations are taken from, or `null` when no column
    is chosen and for the one population, without a metadata file or with
    the grouping `onePopulation`. Throws a defect on a project of
    association, which has no diversity. */
function populationsColumn(p: Project): string | null {
  switch (p.grouping.kind) {
    case "roles":
      throw defect("the diversity was given a project of association.");
    case "onePopulation":
      return null;
    case "populations":
      return p.individuals === null ? null : p.grouping.column;
  }
}

/** The name of an individual, the cell of the first column. The reader
    refuses a row with no name, so a missing one is a defect. */
function identifierOf(cell: Cell | undefined): string {
  if (cell === null || cell === undefined) {
    throw defect("a row of the individuals table has no individual.");
  }
  return String(cell);
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

/** The most populations a text names all of, as `namesOf` does. */
const MAX_NAMED = 3;

/** Words in a list: "a, b and c". */
function listed(words: readonly string[]): string {
  const last = words.at(-1) ?? "";
  return words.length < 2
    ? last
    : `${words.slice(0, -1).join(", ")} and ${last}`;
}
