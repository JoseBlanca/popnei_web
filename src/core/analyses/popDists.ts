/**
 * The distances between populations: what they are calculated from, when
 * they cannot run, the request they send, their warnings, their check
 * numbers, their lines of the Python script, and the words of popnei's
 * refusal (docs/specs/analyses/popDists.md, "The module").
 *
 * Every number is popnei's, from one call of `calcPopDists` in the
 * calculation worker: Hudson's Fst and Jost's D of each pair, the
 * variants each pair was calculated over, and the order of the heatmap of
 * each measure, which the worker makes with popnei's PCoA. This module
 * computes none of them. A population with fewer individuals than the
 * minimum is left out of the request and named in a warning, by
 * `populationsWithMinimum` of project.ts, which the diversity calls too.
 */

import { hasIndividualThreshold } from "../individualsKept.ts";
import type { IndividualsKept } from "../individualsKept.ts";
import type { JsonObject } from "../keys.ts";
import {
  bothOf,
  counted,
  escaped,
  grouped,
  individualsNeeds,
  jobFilters,
  namesOf,
  populationListsNeeds,
  populationsColumnOf,
  populationsKept,
  populationsKeptNeeds,
  populationsNeeds,
  populationsOf,
  populationsToRun,
  populationsWithMinimum,
  shown,
  LARGEST_WHOLE_NUMBER,
  MAX_NAMED,
  populationsByLists,
} from "../project.ts";
import type { Project } from "../project.ts";
import type { Result } from "../result.ts";
import type { AnalysisDef, Warning, WorkerClient } from "../store.ts";
import {
  CHANGE_SETTINGS,
  csvField,
  csvNumber,
  defect,
  fourDecimals,
  orNull,
  percentOf,
  populationWarnings,
  refusalWords,
} from "./words.ts";
import type { PopulationWords } from "./words.ts";
import type {
  HeatmapOrder,
  Job,
  JobResult,
  Pops,
  PopDistsResult,
  Run,
  ShownMeasure,
} from "../../worker/protocol.ts";

/** The id of the analysis. */
const ID = "popDists";

/** The two options of the distances between populations, as the project
    holds them. */
export interface PopDistsOptions {
  /** How many individuals of a population need a called genotype at a
      variant for the variant to count for a pair that population is in,
      popnei's `minNumIndividuals`: a whole number from 0 to
      4,294,967,295. */
  readonly minNumIndividuals: number;
  /** The measure the heatmap draws, Hudson's Fst or Jost's D; the table
      shows both, and a change of it calculates nothing. */
  readonly measure: ShownMeasure;
}

/**
 * The options when the user has set none: popnei's default minimum of
 * `calcPopDists`, 20 individuals, the minimum of the diversity since stage
 * 2; and Hudson's Fst in the heatmap, the default of
 * docs/functionality.md, section 7.
 */
export const POP_DISTS_DEFAULTS: {
  readonly minNumIndividuals: 20;
  readonly measure: "fst";
} = Object.freeze({ minNumIndividuals: 20, measure: "fst" });

/** What the options should be, the end of "‹the field› should be ‹…›" of
    `projectErrorText`. */
const OPTIONS_EXPECTED =
  'the minimum of individuals, a whole number from 0 to 4,294,967,295, and the distance the heatmap draws, "fst" or "dest", and nothing else';

/** What the distances call themselves and their result in the warnings
    of the populations. */
const POP_DISTS_WORDS: PopulationWords = Object.freeze({
  leftOutOf: "the distances",
  notIn: "the distances",
});

/** The start of the reasons of a lock for the one population. */
const NEED_TWO =
  "The distances between populations need two populations or more";

/** The names of the two measures in the words of the screen, "Hudson's
    Fst" and "Jost's D": in the warnings, the line of the order, the
    description of the heatmap, and, in the panel, the title of the
    heatmap and the announcement of a change of the measure. */
export const MEASURE_NAMES: Readonly<Record<ShownMeasure, string>> =
  Object.freeze({
    fst: "Hudson's Fst",
    dest: "Jost's D",
  });

/** The options of the project for the distances, or `POP_DISTS_DEFAULTS`.
    Throws a defect on options its `parseOptions` would refuse, which no
    command puts into a project. */
export function popDistsOptions(p: Project): PopDistsOptions {
  const stored = p.analyses.find((a) => a.analysis === ID)?.options;
  if (stored === undefined) {
    return POP_DISTS_DEFAULTS;
  }
  const known = READ.get(stored);
  if (known !== undefined) {
    return known;
  }
  const read = readOptions(stored);
  if (!read.ok) {
    throw defect("the project holds options of the distances it refuses.");
  }
  const options = Object.freeze(read.value);
  READ.set(stored, options);
  return options;
}

/** The options the project holds, as `readOptions` read them, so that the
    same options give the same object, which a screen may select. */
const READ = new WeakMap<JsonObject, PopDistsOptions>();

/**
 * The words of a refusal of popnei, for the error state of the panel of
 * the project `p`: the rows every analysis shares, of `refusalWords`,
 * with "the distances between populations" in the place of "the
 * diversity" (popDists.md, "Its words"). Throws a defect on a project
 * with no variants file.
 */
export function refusalText(message: string, p: Project): string {
  if (p.variants === null) {
    throw defect("refusalText was given a project with no variants file.");
  }
  return refusalWords(message, p, {
    change: CHANGE_SETTINGS,
    calculate: "calculate the distances between populations",
    nothingLeft:
      "there is no variant to calculate the distances between populations over",
    again: "to run it again",
    emptyPass: (fileName) =>
      `The filters kept none of the variants of ${fileName}, so there is no variant to calculate the distances between populations over. Loosen the filters in the Variants step.`,
  });
}

/**
 * The definition of the distances between populations, as the store
 * knows them: both lists of filters in their key, and a `keptNeeds` that
 * locks when the individuals kept leave no population, or fewer than two
 * with the minimum of individuals (store.md, "The state of an analysis").
 */
export const popDists: AnalysisDef<Job, JobResult> = Object.freeze({
  id: ID,
  app: Object.freeze(["popgen"] as const),
  defaults: POP_DISTS_DEFAULTS,
  keyVersion: 1,
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
 * Checks the options of the distances read from a project file and gives
 * them back as an object of exactly the two fields: `minNumIndividuals`,
 * a whole number from 0 to 4,294,967,295, and `measure`, "fst" or "dest".
 * Every version of the format reads them in the same way, so the version
 * the store passes is not read.
 */
function parseOptions(options: unknown): Result<JsonObject, string> {
  const read = readOptions(options);
  return read.ok ? { ok: true, value: { ...read.value } } : read;
}

/** The two options read from `options`, or what they should be. */
function readOptions(options: unknown): Result<PopDistsOptions, string> {
  const refused = { ok: false, error: OPTIONS_EXPECTED } as const;
  if (
    typeof options !== "object" ||
    options === null ||
    Array.isArray(options)
  ) {
    return refused;
  }
  if (
    Reflect.ownKeys(options).length !== 2 ||
    !Object.hasOwn(options, "minNumIndividuals") ||
    !Object.hasOwn(options, "measure")
  ) {
    return refused;
  }
  const minNumIndividuals: unknown = Reflect.get(options, "minNumIndividuals");
  const measure: unknown = Reflect.get(options, "measure");
  if (
    typeof minNumIndividuals !== "number" ||
    !Number.isInteger(minNumIndividuals) ||
    minNumIndividuals < 0 ||
    minNumIndividuals > LARGEST_WHOLE_NUMBER ||
    (measure !== "fst" && measure !== "dest")
  ) {
    return refused;
  }
  return { ok: true, value: { minNumIndividuals, measure } };
}

/**
 * What the key holds beyond the load and the filters, which `keyOf` puts
 * in itself: the populations, as `populationsOf` gives them and the
 * diversity's key holds them, and the minimum of individuals. Not the
 * measure, which only chooses what the heatmap draws, so that a change
 * of it calculates nothing and takes no result off the screen
 * (popDists.md, "What goes into its key"). Reads nothing of `p.variants`,
 * so it answers for any project.
 */
function keyInputs(p: Project): JsonObject {
  return {
    pops: populationsOf(p),
    options: { minNumIndividuals: popDistsOptions(p).minNumIndividuals },
  };
}

/**
 * The first reason the distances cannot run beyond those the store asks
 * of every analysis that reads the filters, or `null`: the individuals
 * file, the column of the populations and the lists leaving no
 * population, as for the diversity; no metadata file, or the grouping
 * `onePopulation`, which give one population; a column that gives the
 * individuals of the variants file one population; and fewer than two
 * populations with the minimum of individuals among the individuals the
 * lists to keep and to remove keep. Throws a defect on a project of
 * association whose individuals file is read.
 */
function needs(p: Project): string | null {
  const reason = individualsNeeds(p);
  if (reason !== null) {
    return reason;
  }
  if (p.grouping.kind === "roles") {
    throw defect("the distances were given a project of association.");
  }
  const populations = populationsNeeds(p)?.reason ?? populationListsNeeds(p);
  if (populations !== null) {
    return populations;
  }
  if (p.individuals === null) {
    return `${NEED_TWO}, and without a metadata file every individual is in one. Load a metadata file, and choose the column that defines the populations, in the Individuals step.`;
  }
  if (p.grouping.kind === "onePopulation") {
    return `${NEED_TWO}, and all individuals are in one population. Choose the column that defines the populations in the Individuals step.`;
  }
  const toRun = populationsToRun(p);
  const [only] = toRun ?? [];
  const column = populationsColumnOf(p);
  if (toRun?.length === 1 && only !== undefined && column !== null) {
    // populationsToRun gives populations only once the variants file is
    // read.
    if (p.variants === null) {
      throw defect(
        "the distances were given populations with no variants file.",
      );
    }
    return `The column ${shown(column)} of ${escaped(p.individuals.name)} gives the individuals of ${escaped(p.variants.name)} one population, ${shown(only[0])}, and the distances need two or more. Choose another column, or fill in this one and load the file again, in the Individuals step.`;
  }
  return minimumNeeds(p);
}

/** The reason when fewer than two populations of those the lists to keep
    and to remove leave have the minimum of individuals, or `null`; with
    the lists named when they took a population below the minimum. */
function minimumNeeds(p: Project): string | null {
  const toRun = populationsToRun(p);
  const byLists = populationsByLists(p);
  if (toRun === null || byLists === null) {
    return null;
  }
  const min = popDistsOptions(p).minNumIndividuals;
  const withMinimum = populationsWithMinimum(byLists, min).withMinimum;
  if (withMinimum.length >= 2) {
    return null;
  }
  const byListsNames = new Set(withMinimum.map(([pop]) => pop));
  const listsTookSome = populationsWithMinimum(toRun, min).withMinimum.some(
    ([pop]) => !byListsNames.has(pop),
  );
  const end = listsTookSome
    ? "Lower the minimum of individuals below, merge populations in the metadata file, or change the lists of individuals in the Variants step."
    : "Lower the minimum of individuals below, or merge populations in the metadata file.";
  return minimumText(withMinimum, min, "", end);
}

/** The words of a lock for fewer than two populations with the minimum
    `min`, `withMinimum` the one population that has it or none, `among`
    what follows "individuals or more", and `end` what to do. */
function minimumText(
  withMinimum: Pops,
  min: number,
  among: string,
  end: string,
): string {
  const [only] = withMinimum;
  const atLeast = `${counted(min, "individual")} or more${among}`;
  const start =
    only === undefined
      ? `No population has ${atLeast}`
      : `Only ${namesOf([only[0]])} has ${atLeast}`;
  return `${start}, and a variant counts for a pair of populations only where both have ${counted(min, "individual")} with a called genotype, so no pair has a distance. ${end}`;
}

/**
 * The reason the distances cannot run for the individuals kept, `kept`,
 * whose list is known and keeps some individual, or `null`: the list
 * leaves no population, `populationsKeptNeeds`, the diversity's reason;
 * or it leaves fewer than two populations with the minimum of
 * individuals. `null` while the list is not known, and for the one
 * population, which `needs` locks on first.
 */
function keptNeeds(p: Project, kept: IndividualsKept): string | null {
  const noPopulation = populationsKeptNeeds(p, kept);
  if (noPopulation !== null) {
    return noPopulation;
  }
  const list = kept.list.kind === "known" ? kept.list.individuals : null;
  const left = list === null ? null : populationsKept(p, list);
  if (left === null || populationsColumnOf(p) === null) {
    return null;
  }
  const min = popDistsOptions(p).minNumIndividuals;
  const withMinimum = populationsWithMinimum(left.pops, min).withMinimum;
  return withMinimum.length >= 2
    ? null
    : minimumText(
        withMinimum,
        min,
        " among the individuals the filters keep",
        "Lower the minimum of individuals below, merge populations in the metadata file, or loosen the filters of individuals in the Variants step.",
      );
}

/** Builds the request, with the individuals the filters keep that the
    store gives through `c`, the populations under the minimum sent apart
    as `leftOut`, and sends it through `c`. Throws a defect when the
    variants file is not read or fewer than two populations have the
    minimum, which `needs` and `keptNeeds` rule out. */
function run(p: Project, c: WorkerClient<Job, JobResult>): Run<JobResult> {
  const kept = populationsKept(p, c.individuals);
  if (p.variants === null || kept === null) {
    throw defect("the distances were run with no populations to run.");
  }
  const min = popDistsOptions(p).minNumIndividuals;
  const { withMinimum, under } = populationsWithMinimum(kept.pops, min);
  if (withMinimum.length < 2) {
    throw defect(
      "the distances were run with fewer than two populations with the minimum of individuals.",
    );
  }
  return c.run({
    analysis: ID,
    fileId: p.variants.fileId,
    filters: jobFilters(p.filters),
    individuals: c.individuals,
    pops: withMinimum,
    leftOut: under,
    minNumIndividuals: min,
  });
}

/** One pair of a result: the names of its two populations, in the order
    of `pops`, and its values. */
interface Pair {
  /** The name of the first population. */
  readonly first: string;
  /** The name of the second. */
  readonly second: string;
  /** Hudson's Fst, NaN for no value. */
  readonly fst: number;
  /** Jost's D, NaN for no value. */
  readonly dest: number;
  /** The variants it was calculated over. */
  readonly numVars: number;
}

/**
 * The warnings of a result, given the project its request was made from,
 * in this order: the populations left out for their size; the
 * individuals of the variants file with no population, and the
 * populations the filters of individuals emptied; the pairs with no
 * variant; the pairs over fewer variants than the filters kept; the pairs
 * with a negative distance; Jost's D at ploidy 1. Throws a defect on a
 * project whose variants file is not read, and on a project of
 * association.
 */
function warnings(result: JobResult, p: Project): readonly Warning[] {
  const r = popDistsResultOf(result);
  const variants = p.variants;
  if (variants?.read.kind !== "read") {
    throw defect("the warnings of the distances need a variants file read.");
  }
  const min = popDistsOptions(p).minNumIndividuals;
  const found: Warning[] = [];
  if (r.leftOut.length > 0) {
    found.push({
      code: "tooFewIndividuals",
      text: tooFewText(r, p, min),
    });
  }
  found.push(
    ...populationWarnings(
      [...r.pops, ...r.leftOut.map(([pop]) => pop)],
      p,
      POP_DISTS_WORDS,
    ),
  );
  const pairs = pairsOf(r);
  const withoutDistance = pairs.filter((pair) => pair.numVars === 0);
  if (withoutDistance.length > 0) {
    found.push({
      code: "pairWithoutDistance",
      text: withoutDistanceText(withoutDistance, min),
    });
  }
  const numVars = r.passStats.numVars;
  const onFewer = pairs.filter(
    (pair) => pair.numVars > 0 && pair.numVars < numVars,
  );
  if (onFewer.length > 0) {
    found.push({
      code: "pairsOnFewerVariants",
      text: onFewerText(onFewer, pairs.length, numVars, min),
    });
  }
  const negative = pairs.filter((pair) => pair.fst < 0 || pair.dest < 0);
  if (negative.length > 0) {
    found.push({ code: "negativeDistance", text: negativeText(negative) });
  }
  if (variants.read.ploidy === 1) {
    found.push({
      code: "jostHaploid",
      text: `Jost's D has no value for ${escaped(variants.name)}, whose genotypes have one allele each: it compares two heterozygosities, and a haploid individual has none. Hudson's Fst has its values.`,
    });
  }
  return found;
}

/** The text of `tooFewIndividuals`, for the populations of `r.leftOut`,
    offering to loosen the filters of individuals when they took
    individuals from one of them, as the diversity finds it. */
function tooFewText(r: PopDistsResult, p: Project, min: number): string {
  const toRun = populationsToRun(p);
  if (toRun === null) {
    throw defect("the warnings of the distances were given no populations.");
  }
  const sizes = new Map(
    toRun.map(([pop, individuals]) => [pop, individuals.length]),
  );
  const filtered = r.leftOut.some(([pop, numIndividuals]) => {
    const size = sizes.get(pop);
    // `run` takes the populations left out from those to run.
    if (size === undefined) {
      throw defect(
        `the distances left out ${JSON.stringify(pop)}, which is not among the populations to run.`,
      );
    }
    return numIndividuals < size;
  });
  const names = namesOf(r.leftOut.map(([pop]) => pop));
  const [only] = r.leftOut;
  if (r.leftOut.length === 1 && only !== undefined) {
    const merge = "merge it with another population in the metadata file";
    const include = filtered
      ? `lower the minimum of individuals, ${merge}, or loosen the filters of individuals in the Variants step`
      : `lower the minimum of individuals, or ${merge}`;
    return `Population ${names} has ${counted(only[1], "individual")}, fewer than the minimum of ${grouped(min)}, so it is left out of the distances. To include it, ${include}.`;
  }
  const counts =
    r.leftOut.length <= MAX_NAMED
      ? `, ${bothOf(r.leftOut.map(([, numIndividuals]) => grouped(numIndividuals)))}`
      : "";
  const merge = "merge each with another population in the metadata file";
  const include = filtered
    ? `lower the minimum of individuals, ${merge}, or loosen the filters of individuals in the Variants step`
    : `lower the minimum of individuals, or ${merge}`;
  return `Populations ${names} have fewer than ${counted(min, "individual")}${counts}, so they are left out of the distances. To include them, ${include}.`;
}

/** The text of `pairWithoutDistance`, for its pairs. */
function withoutDistanceText(pairs: readonly Pair[], min: number): string {
  const rule = `no variant at which both have ${counted(min, "individual")} with a called genotype`;
  const [only] = pairs;
  if (pairs.length === 1 && only !== undefined) {
    return `${pairName(only)} have ${rule}, so the pair has no distance.`;
  }
  // A list of pairs of three or fewer is closed by a comma, since its
  // last pair holds an "and".
  const close = pairs.length <= MAX_NAMED ? "," : "";
  return `The pairs ${pairsNamed(pairs)}${close} have ${rule}, so they have no distance.`;
}

/** The text of `pairsOnFewerVariants`, for its pairs, of `numPairs` in
    the result, over fewer than the `numVars` variants the filters kept. */
function onFewerText(
  pairs: readonly Pair[],
  numPairs: number,
  numVars: number,
  min: number,
): string {
  const kept = `the ${grouped(numVars)} variants kept`;
  const others = `at the others, one of the two populations has fewer than ${counted(min, "individual")} with a called genotype.`;
  const fewest = pairs.reduce((least, pair) =>
    pair.numVars < least.numVars ? pair : least,
  );
  const share = percentOf(fewest.numVars, numVars);
  if (pairs.length === 1) {
    return `The pair ${pairName(fewest)} is over ${grouped(fewest.numVars)} of ${kept} (${share}): ${others}`;
  }
  return `${grouped(pairs.length)} of the ${grouped(numPairs)} pairs are over fewer than ${kept}, down to ${grouped(fewest.numVars)} (${share}) for ${pairName(fewest)}: ${others}`;
}

/** The text of `negativeDistance`, for its pairs, naming only the
    measures that are negative in one of them. */
function negativeText(pairs: readonly Pair[]): string {
  const fst = pairs.some((pair) => pair.fst < 0);
  const dest = pairs.some((pair) => pair.dest < 0);
  const order =
    "The heatmap orders them as if the distance were 0, and shows the";
  const [only] = pairs;
  if (pairs.length === 1 && only !== undefined) {
    const values = [
      ...(fst ? [`${MEASURE_NAMES.fst}, ${fourDecimals(only.fst)}`] : []),
      ...(dest ? [`${MEASURE_NAMES.dest}, ${fourDecimals(only.dest)}`] : []),
    ];
    return `${pairName(only)} have a negative ${values.join(", and ")}: the variants cannot tell the two apart. ${order} value.`;
  }
  const measures = [
    ...(fst ? [MEASURE_NAMES.fst] : []),
    ...(dest ? [MEASURE_NAMES.dest] : []),
  ].join(" or ");
  return `${grouped(pairs.length)} pairs have a negative ${measures}, ${pairsNamed(pairs)}: the variants cannot tell their two populations apart. ${order} values.`;
}

/** A pair in words, "p0 and p3". */
function pairName(pair: Pair): string {
  return `${namesOf([pair.first])} and ${namesOf([pair.second])}`;
}

/** Several pairs in words: up to three, "p0 and p3, and p1 and p3", a
    comma before the last since each pair holds an "and"; more, the first
    two and how many more, "p0 and p3, p1 and p3 and 4 more". */
function pairsNamed(pairs: readonly Pair[]): string {
  if (pairs.length > MAX_NAMED) {
    const [first, second] = pairs;
    if (first === undefined || second === undefined) {
      throw defect("pairsNamed was given fewer pairs than it counted.");
    }
    return `${pairName(first)}, ${pairName(second)} and ${grouped(pairs.length - 2)} more`;
  }
  const named = pairs.map(pairName);
  return `${named.slice(0, -1).join(", ")}, and ${named.at(-1) ?? ""}`;
}

/** The pairs of a result, in its order, (0, 1), (0, 2), …, (1, 2), … of
    its populations. Throws a defect on a result whose arrays are not as
    long as its populations give. */
function pairsOf(r: PopDistsResult): readonly Pair[] {
  const numPops = r.pops.length;
  const numPairs = (numPops * (numPops - 1)) / 2;
  if (
    r.fst.length !== numPairs ||
    r.dest.length !== numPairs ||
    r.numVarsPerPair.length !== numPairs
  ) {
    throw defect("the result of the distances has arrays of another length.");
  }
  const pairs: Pair[] = [];
  let at = 0;
  for (const [i, first] of r.pops.entries()) {
    for (const second of r.pops.slice(i + 1)) {
      pairs.push({
        first,
        second,
        fst: valueAt(r.fst, at),
        dest: valueAt(r.dest, at),
        numVars: valueAt(r.numVarsPerPair, at),
      });
      at += 1;
    }
  }
  return pairs;
}

/** The check numbers: the variants kept, then, for each pair in the order
    of the result, its Fst and its D, `null` for a NaN. */
function checkNumbers(result: JobResult): readonly (number | null)[] {
  const r = popDistsResultOf(result);
  return [
    r.passStats.numVars,
    ...pairsOf(r).flatMap((pair) => [orNull(pair.fst), orNull(pair.dest)]),
  ];
}

/**
 * How many numbers `checkNumbers` gives for a result of `p`: 1 + k × (k −
 * 1), with k the populations the lists of individuals to keep and to
 * remove leave that have the minimum of individuals; `null` in the cases
 * the diversity gives `null`, when `populationsToRun` is, when the
 * project holds a threshold on the individuals and when a list is one
 * popnei would refuse, and when k is below 2, since the analysis is then
 * locked.
 */
function numCheckNumbers(p: Project): number | null {
  if (populationsToRun(p) === null || hasIndividualThreshold(p)) {
    return null;
  }
  const left = populationsByLists(p);
  if (left === null) {
    return null;
  }
  const min = popDistsOptions(p).minNumIndividuals;
  const numPops = populationsWithMinimum(left, min).withMinimum.length;
  return numPops < 2 ? null : 1 + numPops * (numPops - 1);
}

/**
 * The lines of the Python script that calculate the same numbers and
 * orders with popnei's Python API, after the lines that open `variants`
 * and read the table `individuals`: the populations of the column
 * narrowed to the individuals of `variants`, those under the minimum left
 * out; the call; the table of the pairs; and the order of the heatmap of
 * each measure. Throws a defect on a project with no column of the
 * populations, since it is asked only of an analysis that has run.
 */
function script(p: Project): string {
  if (p.grouping.kind === "roles") {
    throw defect("the distances were given a project of association.");
  }
  const column = populationsColumnOf(p);
  if (column === null || populationsOf(p) === "all") {
    throw defect("the script of the distances was asked with no populations.");
  }
  const name = JSON.stringify(column);
  const min = String(popDistsOptions(p).minNumIndividuals);
  return [
    `# The distances between populations, from the column ${name}`,
    "pops = {}",
    `for individual, pop in zip(individuals.iloc[:, 0], individuals[${name}]):`,
    "    if not pandas.isna(pop):",
    "        pops.setdefault(pop, []).append(individual)",
    "kept = set(variants.individuals)",
    "pops = {pop: [i for i in names if i in kept] for pop, names in pops.items()}",
    `pops = {pop: names for pop, names in pops.items() if len(names) >= ${min}}`,
    "dists = popnei.calc_pop_dists(",
    '    variants, pops, jackknife_group=None, measures=["fst", "dest"],',
    `    min_num_individuals=${min},`,
    ")",
    "pairs = [(a, b) for i, a in enumerate(dists.pops) for b in dists.pops[i + 1:]]",
    "print(pandas.DataFrame({",
    '    "population_1": [a for a, b in pairs],',
    '    "population_2": [b for a, b in pairs],',
    '    "fst_hudson": dists.fst.dist_vector,',
    '    "jost_d": dists.dest.dist_vector,',
    '    "num_variants": dists.num_vars,',
    "}).to_string(index=False))",
    "# The order of the heatmap: the first axis of the principal coordinates of",
    "# each matrix, a negative distance taken as 0 and Lingoes' correction applied.",
    "# With a pair of no distance, or every distance 0, do_pcoa raises: the heatmap",
    "# then keeps the order of the metadata file.",
    'for name, measure in [("fst_hudson", dists.fst), ("jost_d", dists.dest)]:',
    "    corrected = popnei.correct_dists_by_lingoes(popnei.Distances(",
    "        dist_vector=measure.dist_vector.clip(min=0), names=measure.names,",
    "    ))",
    "    first = popnei.do_pcoa(corrected.dists).projections.iloc[:, 0]",
    '    print(name, first.sort_values(kind="stable").index.tolist())',
  ]
    .map((line) => `${line}\n`)
    .join("");
}

// The functions of the panel (popDists.md, "The TypeScript interface" and
// "The panel").

/** The most populations the panel draws the heatmap and the table for:
    `MAX_HEATMAP_NAMES` of src/charts/limits.ts, which core does not
    import, so a test of src/ui/analyses/popDists/ checks that the two are
    equal. */
export const POP_DISTS_MAX_SHOWN = 200;

/** One row of the table, a number null where popnei gave NaN. */
export interface PopDistsRow {
  /** The first population of the pair, in the order of the result. */
  readonly first: string;
  /** The second population of the pair. */
  readonly second: string;
  /** Hudson's Fst of the pair. */
  readonly fst: number | null;
  /** Jost's D of the pair. */
  readonly dest: number | null;
  /** The variants the pair was calculated over. */
  readonly numVars: number;
}

/** The rows of each result, so that a screen drawn again gets the same
    array. */
const ROWS = new WeakMap<PopDistsResult, readonly PopDistsRow[]>();

/** The rows of a result, one per pair in its order, (0, 1), (0, 2), …,
    (1, 2), … of its populations; the same array for the same result.
    Throws a defect on a result whose arrays are not as long as its
    populations give. */
export function popDistsRows(r: PopDistsResult): readonly PopDistsRow[] {
  const kept = ROWS.get(r);
  if (kept !== undefined) {
    return kept;
  }
  const rows = Object.freeze(
    pairsOf(r).map((pair): PopDistsRow =>
      Object.freeze({
        first: pair.first,
        second: pair.second,
        fst: orNull(pair.fst),
        dest: orNull(pair.dest),
        numVars: pair.numVars,
      }),
    ),
  );
  ROWS.set(r, rows);
  return rows;
}

/** The header of the CSV of the table, the names of the columns of the
    table of the Python script. */
const CSV_HEADER = "population_1,population_2,fst_hudson,jost_d,num_variants";

/**
 * The table as the text of a CSV file: a header row, one row per pair in
 * the order of the result, the numbers as `String` writes them and an
 * empty cell for no value, a name with a comma, a quote or a new line
 * quoted as RFC 4180 has it, and each line ended by a new line.
 */
export function popDistsCsv(r: PopDistsResult): string {
  const lines = popDistsRows(r).map((row) =>
    [
      csvField(row.first),
      csvField(row.second),
      csvNumber(row.fst),
      csvNumber(row.dest),
      String(row.numVars),
    ].join(","),
  );
  return [CSV_HEADER, ...lines].map((line) => `${line}\n`).join("");
}

/** The data of the heatmap of one measure: the populations in its order,
    and the square matrix in that order, NaN on the diagonal. */
export interface PopDistsHeatmap {
  /** The populations, top to bottom and left to right. */
  readonly names: readonly string[];
  /** names.length × names.length values, row by row, symmetric, NaN for
      no value. */
  readonly values: Float64Array;
}

/** The heatmaps of each result, by measure, so that a screen drawn again
    gets the same data. */
const HEATMAPS = new WeakMap<
  PopDistsResult,
  Map<ShownMeasure, PopDistsHeatmap>
>();

/**
 * The data of the heatmap of `measure`: the populations in the order the
 * result gives for that measure, that of the PCoA or that of the file,
 * and the square matrix in that order, each pair's one value written in
 * both of its cells, so that the two never differ; the same object for
 * the same result and measure. Throws a defect on an order that is not a
 * permutation of the populations, which the checks of the messages rule
 * out.
 */
export function popDistsHeatmap(
  r: PopDistsResult,
  measure: ShownMeasure,
): PopDistsHeatmap {
  const byMeasure = HEATMAPS.get(r) ?? new Map<ShownMeasure, PopDistsHeatmap>();
  HEATMAPS.set(r, byMeasure);
  const kept = byMeasure.get(measure);
  if (kept !== undefined) {
    return kept;
  }
  const numPops = r.pops.length;
  const order = orderOf(r, measure);
  // The row of each population of the result in the heatmap, -1 until
  // the order places it.
  const rowOf = new Int32Array(numPops).fill(-1);
  if (order.length !== numPops) {
    throw defect("the order of the heatmap is not one of its populations.");
  }
  for (const [row, pop] of order.entries()) {
    if (rowOf[pop] !== -1) {
      throw defect("the order of the heatmap is not one of its populations.");
    }
    rowOf[pop] = row;
  }
  const values = new Float64Array(numPops * numPops).fill(Number.NaN);
  let at = 0;
  for (let i = 0; i < numPops; i++) {
    for (let j = i + 1; j < numPops; j++) {
      const value = valueAt(r[measure], at);
      const row = rowAt(rowOf, i);
      const column = rowAt(rowOf, j);
      values[row * numPops + column] = value;
      values[column * numPops + row] = value;
      at += 1;
    }
  }
  const heatmap: PopDistsHeatmap = Object.freeze({
    names: Object.freeze(order.map((pop) => popAt(r.pops, pop))),
    values,
  });
  byMeasure.set(measure, heatmap);
  return heatmap;
}

/** The indexes of the populations of `r` in the order of the heatmap of
    `measure`, top to bottom. */
function orderOf(r: PopDistsResult, measure: ShownMeasure): readonly number[] {
  const order = r.order[measure];
  return order.kind === "pcoa"
    ? Array.from(order.order)
    : r.pops.map((_, i) => i);
}

/** The start of the line of an order of the file. */
const FILE_ORDER = "In the order of the metadata file";

/**
 * The line under the heatmap of `measure` that says how it is ordered
 * (popDists.md, "Its words"), or `null` for two populations, whose order
 * says nothing of similarity. popnei's message of `notPlaced`, which
 * names its arguments and calls the populations individuals, is not
 * shown. Throws a defect on the reason `noDistance` for a measure that
 * has a value for every pair, which the runner never gives.
 */
export function orderText(
  r: PopDistsResult,
  measure: ShownMeasure,
): string | null {
  const order: HeatmapOrder = r.order[measure];
  if (order.kind === "pcoa") {
    return "Ordered so that similar populations are together: by the first axis of a principal coordinate analysis of these distances.";
  }
  switch (order.reason) {
    case "twoPopulations":
      return null;
    case "noDistance": {
      const pairs = pairsOf(r);
      const without = pairs.filter((pair) => Number.isNaN(pair[measure]));
      const [only] = without;
      if (only === undefined) {
        throw defect(
          `the heatmap of ${measure} is in the order of the file for a pair with no distance, and every pair has one.`,
        );
      }
      if (without.length === pairs.length) {
        return `${FILE_ORDER}: no pair has a value of ${MEASURE_NAMES[measure]}.`;
      }
      const named = without.length === 1 ? pairName(only) : pairsNamed(without);
      return `${FILE_ORDER}: the order by similarity needs a distance for every pair, and ${named} have none.`;
    }
    case "allZero":
      return `${FILE_ORDER}: every distance is 0 or below, so no population is closer to one than to another.`;
    case "notPlaced":
      return `${FILE_ORDER}: popnei could not order these distances.`;
  }
}

/**
 * The description of the heatmap of `measure` for a screen reader
 * (popDists.md, "Accessibility"): the measure, how many populations of
 * the variants file `fileName`, the order in words and the populations
 * in it, then the smallest and the largest value with their pairs, and
 * how many pairs have no value; "No pair has a value." when none has. A
 * value found in several pairs is named by the first of them in the
 * order of the result.
 */
export function popDistsDescription(
  r: PopDistsResult,
  measure: ShownMeasure,
  fileName: string,
): string {
  const how =
    r.order[measure].kind === "pcoa"
      ? "ordered so that similar ones are together"
      : "in the order of the metadata file";
  const names = popDistsHeatmap(r, measure)
    .names.map((pop) => namesOf([pop]))
    .join(", ");
  const start = `Heatmap of ${MEASURE_NAMES[measure]} between ${counted(r.pops.length, "population")} of ${escaped(fileName)}, ${how}: ${names}.`;
  const pairs = pairsOf(r);
  const valued = pairs.filter((pair) => !Number.isNaN(pair[measure]));
  const [first] = valued;
  if (first === undefined) {
    return `${start} No pair has a value.`;
  }
  const smallest = valued.reduce((least, pair) =>
    pair[measure] < least[measure] ? pair : least,
  );
  const largest = valued.reduce((most, pair) =>
    pair[measure] > most[measure] ? pair : most,
  );
  const range =
    valued.length === 1
      ? `Its one value is ${fourDecimals(first[measure])}, between ${pairName(first)}.`
      : `From ${fourDecimals(smallest[measure])}, between ${pairName(smallest)}, to ${fourDecimals(largest[measure])}, between ${pairName(largest)}.`;
  const numWithout = pairs.length - valued.length;
  const without =
    numWithout === 0
      ? ""
      : ` ${grouped(numWithout)} of the ${grouped(pairs.length)} pairs ${numWithout === 1 ? "has" : "have"} no value.`;
  return `${start} ${range}${without}`;
}

/**
 * The line the panel shows in place of the heatmap and the table when
 * the result has more than `POP_DISTS_MAX_SHOWN` populations, "The
 * heatmap and the table are shown for up to 200 populations, and this
 * result has 201. Download the table as CSV to read it."; `null`
 * otherwise.
 */
export function tooManyPopulationsText(r: PopDistsResult): string | null {
  const numPops = r.pops.length;
  return numPops > POP_DISTS_MAX_SHOWN
    ? `The heatmap and the table are shown for up to ${grouped(POP_DISTS_MAX_SHOWN)} populations, and this result has ${grouped(numPops)}. Download the table as CSV to read it.`
    : null;
}

/** The result as the distances' own. Throws a defect on the result of
    another analysis, which the store never gives the distances. */
function popDistsResultOf(r: JobResult): PopDistsResult {
  if (r.analysis !== "popDists") {
    throw defect(`the distances were given a result of ${r.analysis}.`);
  }
  return r;
}

/** The element `i` of an array of a result; one missing is a defect, as
    every array of a result has one element for each pair. */
function valueAt(values: ArrayLike<number>, i: number): number {
  const value = values[i];
  if (value === undefined) {
    throw defect(`the result of the distances has no pair ${String(i)}.`);
  }
  return value;
}

/** The row of the heatmap of the population `i` of the result; one
    missing is a defect, as the order placed every population. */
function rowAt(rowOf: Int32Array, i: number): number {
  const row = rowOf[i];
  if (row === undefined || row === -1) {
    throw defect(
      `the heatmap of the distances has no row for the population ${String(i)} of the result.`,
    );
  }
  return row;
}

/** The population `i` of `pops`; one missing is a defect, as an order of
    the heatmap holds indexes of its populations. */
function popAt(pops: readonly string[], i: number): string {
  const pop = pops[i];
  if (pop === undefined) {
    throw defect(`the result of the distances has no population ${String(i)}.`);
  }
  return pop;
}
