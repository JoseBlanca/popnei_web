/**
 * The diversity of each population: what its result is calculated from,
 * when it cannot run, the request it sends, its warnings, its check
 * numbers, its lines of the Python script, and the rows and the CSV of its
 * table (docs/specs/analyses/diversity.md, "The module").
 *
 * The three numbers of each population are popnei's, from one call of
 * `calcPerVarDistribs` in the calculation worker; this module computes
 * none of them.
 */

import type { JsonObject } from "../keys.ts";
import {
  analysisOptions,
  counted,
  escaped,
  grouped,
  individualsNeeds,
  namesOf,
  saying,
  shown,
} from "../project.ts";
import type { Project, SourceRead } from "../project.ts";
import type { Result } from "../result.ts";
import type { AnalysisDef, Warning, WorkerClient } from "../store.ts";
import type {
  Cell,
  DiversityResult,
  IndividualsTable,
  Job,
  JobResult,
  Pops,
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

/** The end of a reason about the column of the populations. */
const CHOOSE_COLUMN =
  "Choose the column that defines the populations in the Individuals step.";

/** The individuals of a table grouped by one of its columns. */
interface Grouped {
  /** The populations, as `populationsOf` gives them. */
  readonly pops: Pops;
  /** The individuals whose cell in the column is missing, in the order of
      the table. */
  readonly unassigned: readonly string[];
}

/** The grouping of each table, by the name of its column, so that a
    change of a threshold does not walk a table of 10,000 rows again. It
    keeps only tables frozen with all they hold, as the memo of the keys
    does, so that a table changed in place is walked again. */
const GROUPED = new WeakMap<IndividualsTable, Map<string, Grouped>>();

/** The populations to run of each set of populations, by the read of the
    variants file; only reads frozen with their individuals are kept. */
const TO_RUN = new WeakMap<Pops, WeakMap<SourceRead, Pops>>();

/** The rows of each result, so that a screen drawn again gets the same
    array. */
const ROWS = new WeakMap<DiversityResult, readonly DiversityRow[]>();

/**
 * The populations of the column chosen, from the table alone, as the key
 * holds them: every population of the column, named by the text of its
 * cell, with every individual of the file that has it, in the order each
 * first appears in the file; an individual whose cell is missing belongs
 * to none. `null` when there is no individuals file, when it is not read,
 * when no column is chosen, or when the table has no column of that name.
 * The same frozen value for the same frozen table and column.
 */
export function populationsOf(p: Project): Pops | null {
  return groupedOf(p)?.pops ?? null;
}

/** The individuals of the table grouped by the column of the populations,
    with those that have no population; `null` when `populationsOf` is. */
function groupedOf(p: Project): Grouped | null {
  const read = p.individuals?.read;
  if (read?.kind !== "read" || p.grouping.kind !== "populations") {
    return null;
  }
  const column = p.grouping.column;
  if (column === null) {
    return null;
  }
  const table = read.table;
  const kept = GROUPED.get(table)?.get(column);
  if (kept !== undefined) {
    return kept;
  }
  const index = table.columns.indexOf(column);
  if (index === -1) {
    return null;
  }
  const members = new Map<string, string[]>();
  const unassigned: string[] = [];
  for (const row of table.rows) {
    const cell = row[index];
    if (cell === undefined) {
      throw defect(`a row of the individuals table has no cell ${column}.`);
    }
    const individual = identifierOf(row[0]);
    if (cell === null) {
      unassigned.push(individual);
      continue;
    }
    const pop = String(cell);
    const individuals = members.get(pop) ?? [];
    members.set(pop, individuals);
    individuals.push(individual);
  }
  const grouped: Grouped = Object.freeze({
    pops: Object.freeze(
      [...members].map(([pop, individuals]) =>
        Object.freeze([pop, Object.freeze(individuals)] as const),
      ),
    ),
    unassigned: Object.freeze(unassigned),
  });
  if (isTableFrozen(table)) {
    const byColumn = GROUPED.get(table) ?? new Map<string, Grouped>();
    GROUPED.set(table, byColumn);
    byColumn.set(column, grouped);
  }
  return grouped;
}

/** Whether a table is frozen with everything it holds, so that its
    grouping can be kept: its cells are texts, numbers, booleans or null. */
function isTableFrozen(table: IndividualsTable): boolean {
  return (
    Object.isFrozen(table) &&
    Object.isFrozen(table.columns) &&
    Object.isFrozen(table.rows) &&
    table.rows.every((row) => Object.isFrozen(row))
  );
}

/**
 * `populationsOf(p)` narrowed to the individuals of the variants file, the
 * populations left empty dropped: what `run` sends, what the ready state
 * of the panel and the Individuals step list. `null` when `populationsOf`
 * is `null` or the variants file is not read. The same frozen value for
 * the same frozen table, column and read of the variants file.
 */
export function populationsToRun(p: Project): Pops | null {
  const pops = populationsOf(p);
  const variantsRead = p.variants?.read;
  if (pops === null || variantsRead?.kind !== "read") {
    return null;
  }
  const kept = TO_RUN.get(pops)?.get(variantsRead);
  if (kept !== undefined) {
    return kept;
  }
  const inVariants = new Set(variantsRead.individuals);
  const toRun: Pops = Object.freeze(
    pops
      .map(([pop, individuals]) =>
        Object.freeze([
          pop,
          Object.freeze(individuals.filter((i) => inVariants.has(i))),
        ] as const),
      )
      .filter(([, individuals]) => individuals.length > 0),
  );
  if (
    Object.isFrozen(variantsRead) &&
    Object.isFrozen(variantsRead.individuals)
  ) {
    const byRead = TO_RUN.get(pops) ?? new WeakMap<SourceRead, Pops>();
    TO_RUN.set(pops, byRead);
    byRead.set(variantsRead, toRun);
  }
  return toRun;
}

/** The reason about the column of the populations, and its kind. */
export interface PopulationsNeed {
  /** No column chosen, "To do" in the stepper; a column the table does
      not have, or one that gives no individual of the variants file a
      population, "Problem". */
  readonly kind: "noColumn" | "noSuchColumn" | "noPopulation";
  /** The words the screens show. */
  readonly reason: string;
}

/**
 * The reason about the column of the populations, the last three rows of
 * "Why it cannot run" of the spec, with its kind: no column chosen; the
 * table has no column of that name; no individual of the variants file
 * has a population in it, which is looked at only once the variants file
 * is read. `null` when the individuals file is not read, or when the
 * column gives populations, or when a column of that name is chosen and
 * the variants file is not read. Throws a defect on a project of
 * association whose individuals file is read.
 */
export function populationsNeeds(p: Project): PopulationsNeed | null {
  const individuals = p.individuals;
  if (individuals?.read.kind !== "read") {
    return null;
  }
  const column = populationsColumn(p);
  if (column === null) {
    return { kind: "noColumn", reason: CHOOSE_COLUMN };
  }
  const fileName = escaped(individuals.name);
  if (populationsOf(p) === null) {
    return {
      kind: "noSuchColumn",
      reason: `${fileName} has no column ${shown(column)}, from which the populations were taken. ${CHOOSE_COLUMN}`,
    };
  }
  const toRun = populationsToRun(p);
  if (toRun !== null && toRun.length === 0 && p.variants !== null) {
    return {
      kind: "noPopulation",
      reason: `No individual of ${escaped(p.variants.name)} has a population in the column ${shown(column)} of ${fileName}. Fill in the column and load the file again, or choose another column, in the Individuals step.`,
    };
  }
  return null;
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

/** The start of popnei's refusal of a pass over a source that holds no
    variant, whatever the filters. */
const EMPTY_SOURCE = "the pass gave no variant and its source holds none";

/** The start of popnei's refusal of a pass that gave no variant from a
    source that held some: with its colon, which the refusal of a source
    that holds none does not have at that place, so that neither is taken
    for the other. */
const EMPTY_PASS = "the pass gave no variant:";

/** The words of the box of the Variants step that reads only the
    variants that passed, as its label says them. */
const ONLY_PASSED_BOX = "Only the variants with PASS or . in the FILTER column";

/** popnei's refusal of a genotype of another ploidy than the one the VCF
    was read with: the line, the individual, the ploidy found and the one
    given. */
const OTHER_PLOIDY =
  /^line (\d+) of the VCF, the column of (.*?): its genotype is of the ploidy (\d+) and the reader was asked for the ploidy (\d+)/su;

/** The start of popnei's refusals of a gzipped VCF damaged or cut
    short. */
const BGZIP_REFUSAL = "the VCF was written by bgzip";

/**
 * The words of a refusal of popnei, for the error state of the panel of
 * the project `p`, by the start of popnei's message: the variants file
 * holds no variant, or, for a VCF read with only the passed variants,
 * none that passed; the filters kept none; a genotype of another ploidy than the one the VCF was read
 * with; a line of the VCF it cannot read, or a gzipped file damaged or cut
 * short; any other. Throws a defect on a project with no variants file.
 */
export function refusalText(message: string, p: Project): string {
  if (p.variants === null) {
    throw defect("refusalText was given a project with no variants file.");
  }
  const fileName = escaped(p.variants.name);
  if (message.startsWith(EMPTY_SOURCE)) {
    if (p.variants.readOptions?.onlyPassed === true) {
      return `${fileName} has no variant with PASS or . in its FILTER column, and it was read with only those, so there is no variant to calculate the diversity over. Untick "${ONLY_PASSED_BOX}" in the Variants step and read the file again.`;
    }
    return `${fileName} has no variants, so there is no variant to calculate the diversity over. Load another variants file in the Variants step.`;
  }
  if (message.startsWith(EMPTY_PASS)) {
    return `The filters kept none of the variants of ${fileName}, so there is no variant to calculate the diversity over. Loosen the filters in the Variants step.`;
  }
  const ploidy = OTHER_PLOIDY.exec(message);
  if (ploidy !== null) {
    const [, line = "", individual = "", found = "", given = ""] = ploidy;
    const alleles = counted(Number(found), "allele");
    return `At line ${line} of ${fileName}, the genotype of ${shown(individual)} has ${alleles}, and the file was read with ploidy ${given}. If every genotype of the file has ${alleles}, set the ploidy of the VCF to ${found} in the Variants step and read the file again. A file that mixes ploidies, such as one with the X of males haploid among diploid autosomes, cannot be read in this version.`;
  }
  const isVcfLine =
    /^line \d+ of the VCF/u.test(message) || message.startsWith(BGZIP_REFUSAL);
  if (isVcfLine) {
    return `popnei could not read ${fileName}${saying(message)}. Correct the file, or fetch it again, and load it in the Variants step.`;
  }
  return `popnei could not calculate the diversity${saying(message)}. Change the settings, or load the variants file again, to run it again.`;
}

/** The definition of the diversity, as the store knows it. */
export const diversity: AnalysisDef<Job, JobResult> = Object.freeze({
  id: ID,
  app: Object.freeze(["popgen"] as const),
  defaults: DIVERSITY_DEFAULTS,
  keyVersion: 1,
  filtersRead: Object.freeze({ variants: true, individuals: true }),
  parseOptions,
  keyInputs,
  needs,
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
    shares, or `null`. Throws a defect on a project of association whose
    individuals file is read. */
function needs(p: Project): string | null {
  const numFilters = p.individualFilters.length;
  if (numFilters > 0) {
    const held = numFilters === 1 ? "one" : grouped(numFilters);
    return `The filters of individuals come in a later version of the application, and this project holds ${held} of them, so the diversity cannot run in this version. To run it, open the project file in a text editor, empty the list named individualFilters in it, and open the project again.`;
  }
  return individualsNeeds(p) ?? populationsNeeds(p)?.reason ?? null;
}

/** Builds the request and sends it through `c`. Throws a defect when the
    variants file is not read or there are no populations to run, which
    `needs` rules out. */
function run(p: Project, c: WorkerClient<Job, JobResult>): Run<JobResult> {
  const pops = populationsToRun(p);
  if (p.variants === null || pops === null) {
    throw defect("the diversity was run with no populations to run.");
  }
  const options = optionsOf(p);
  return c.run({
    analysis: ID,
    fileId: p.variants.fileId,
    filters: p.filters,
    individualFilters: p.individualFilters,
    pops,
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
  const tooFew = rows.filter((row) => row.individuals < min);
  if (tooFew.length > 0) {
    found.push({ code: "tooFewIndividuals", text: tooFewText(tooFew, min) });
  }
  const withoutValue = rows
    .map((row, i) => ({
      row,
      withValue: valueAt(r.numVarsWithValue, i, "numVarsWithValue"),
    }))
    .filter(
      ({ row, withValue }) => row.individuals >= min && withValue < r.numVars,
    );
  if (withoutValue.length > 0) {
    found.push({
      code: "variantsWithoutValue",
      text: withoutValueText(withoutValue, r.numVars, min),
    });
  }
  const unassigned = new Set(groupedOf(p)?.unassigned);
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
  // not among these: a metadata file may serve several panels.
  const inResult = new Set(r.pops);
  const missing = (populationsToRun(p) ?? [])
    .map(([pop]) => pop)
    .filter((pop) => !inResult.has(pop));
  if (missing.length > 0) {
    const one = missing.length === 1;
    found.push({
      code: "populationNotInResult",
      text: `${one ? "Population" : "Populations"} ${namesOf(missing)} ${one ? "has" : "have"} no individual among the individuals of ${fileName} that the filters kept, so ${one ? "it is" : "they are"} not in the table.`,
    });
  }
  return found;
}

/** The text of `tooFewIndividuals`, for its populations. */
function tooFewText(rows: readonly DiversityRow[], min: number): string {
  const rule = `a variant has a value in a population only when at least ${grouped(min)} of its individuals have a called genotype there`;
  const names = namesOf(rows.map((row) => row.population));
  const [first] = rows;
  if (rows.length === 1 && first !== undefined) {
    return `Population ${names} has ${counted(first.individuals, "individual")}, and ${rule}, so ${names} has no values. To have them, merge it with another population in the metadata file.`;
  }
  const counts =
    rows.length <= MAX_NAMED
      ? `, ${listed(rows.map((row) => grouped(row.individuals)))}`
      : "";
  return `Populations ${names} have fewer than ${grouped(min)} individuals${counts}, and ${rule}, so they have no values. To have them, merge each with another population in the metadata file.`;
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
    r.numVars,
    ...diversityRows(r).flatMap((row) => [
      row.expectedHeterozygosity,
      row.observedHeterozygosity,
      row.polymorphic,
    ]),
  ];
}

/** How many numbers `checkNumbers` gives for a result of `p`: 1 + 3 × the
    populations of `populationsToRun`, since `run` sends every one of them
    and popnei gives a row for each; `null` when `populationsToRun` is, and
    when the project holds filters of individuals, which may leave a
    population out of the result. */
function numCheckNumbers(p: Project): number | null {
  const pops = populationsToRun(p);
  if (pops === null || p.individualFilters.length > 0) {
    return null;
  }
  return 1 + NUMBERS_PER_POPULATION * pops.length;
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
  const column = populationsColumn(p);
  if (column === null) {
    throw defect("the script of the diversity was asked with no populations.");
  }
  const options = optionsOf(p);
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

/** The column of the populations the project names, or `null`. Throws a
    defect on a project of association, which has no diversity. */
function populationsColumn(p: Project): string | null {
  if (p.grouping.kind !== "populations") {
    throw defect("the diversity was given a project of association.");
  }
  return p.grouping.column;
}

/** The result as the diversity's own. While the diversity is the one
    analysis, a result is always its own; when `JobResult` gains a member
    this stops compiling, and the check of `analysis`, with a defect for
    the result of another analysis, goes here. */
function diversityResultOf(r: JobResult): DiversityResult {
  return r;
}

/** The name of an individual, the cell of the first column. The reader
    refuses a row with no name, so a missing one is a defect. */
function identifierOf(cell: Cell | undefined): string {
  if (cell === null || cell === undefined) {
    throw defect("a row of the individuals table has no individual.");
  }
  return String(cell);
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

/** A number of popnei, `null` for a NaN. */
function orNull(value: number): number | null {
  return Number.isNaN(value) ? null : value;
}

/** A number of the table in a CSV: as `String` writes it, or an empty cell
    for no value. */
function csvNumber(value: number | null): string {
  return value === null ? "" : String(value);
}

/** A field of a CSV, quoted when it holds a comma, a quote or a new
    line, its quotes doubled. */
function csvField(value: string): string {
  return /[",\n\r]/u.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
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

function defect(message: string): Error {
  return new Error(`popnei_web defect: ${message}`);
}
