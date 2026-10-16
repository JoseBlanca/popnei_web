/**
 * The LD decay of each population: which variants it reads, when it
 * cannot run, the request it sends, the curve fitted to each population,
 * its warnings, its check numbers, its lines of the Python script, the
 * rows of its table of the populations, and the words of popnei's
 * refusal (docs/specs/analyses/ldDecay.md, "The module" and "The panel").
 * What its panel shows besides, the table of the bins, the CSVs, the
 * curve the plot draws, the legend and the description, is in
 * ldDecayPanel.ts, which popgen2.html downloads with the Populations tab.
 *
 * The numbers are popnei's, from one call of `calcLdAndDistPerPop` in the
 * calculation worker: the bins of each population, its ρ per base pair,
 * its r² at a distance of 0 and its half distance. The one number the
 * application computes is the curve the plot draws, popnei's own formula
 * evaluated at the distances of the plot from popnei's ρ per base pair,
 * in ldDecayPanel.ts.
 */

import { hasIndividualThreshold } from "../individualsKept.ts";
import type { JsonObject } from "../keys.ts";
import {
  ONE_POPULATION,
  analysisOptions,
  bothOf,
  counted,
  escaped,
  grouped,
  individualsNeeds,
  namesOf,
  populationsKept,
  populationsNeeds,
  populationsOf,
  populationsToRun,
  popgen2OnePopulationCause,
  popgen2Populations,
  popgen2PopulationsKept,
  popgen2PopulationsToRun,
  shown,
  MAX_NAMED,
  UNCLASSIFIED_POPULATION,
} from "../project.ts";
import { filtersApplied } from "../filtersApplied.ts";
import {
  populationListsNeeds,
  populationsByLists,
  populationsColumnOf,
  populationsKeptNeeds,
  popgen2PopulationsKeptNeeds,
} from "../populations.ts";
import type {
  PopulationsKept,
  Project,
  ProjectVariantFilter,
} from "../project.ts";
import type { Result } from "../result.ts";
import type { AnalysisDef, Warning, WorkerClient } from "../store.ts";
import { fileRefusalText } from "./fileRefusals.ts";
import {
  isMemoryRefusal,
  CHANGE_SETTINGS,
  defect,
  populationWarnings,
  populationNotInResult,
  pythonOpenVariants,
  refusalWords,
} from "./words.ts";
import { PARAMETERS } from "./words.ts";
import type { PopulationWords } from "./words.ts";
import type {
  Job,
  JobResult,
  LdDecayResult,
  Pops,
  Run,
  VariantFilter,
} from "../../worker/protocol.ts";

/** The id of the analysis. */
const ID = "ldDecay";

/** The page a definition is for, which picks the populations and the
    words: the old page, popgen.html, or popgen2.html (ldDecay.md, "On
    popgen2.html"). */
export type LdDecayPage = "popgen" | "popgen2";

/** The places a sentence of the module names, by the page. */
interface PlaceWords {
  /** How fewer individuals are kept: "with the filters of individuals"
      on the old page. */
  readonly fewerIndividuals: string;
  /** The same, followed by where, in the words of a crash: "with the
      filters of individuals in the Variants step". */
  readonly fewerIndividualsWhere: string;
  /** How the variants file is opened again: "load ld.nei again in the
      Variants step", for its escaped name. */
  readonly openAgain: (fileName: string) => string;
}

/** The places of each page. */
const PLACES: Readonly<Record<LdDecayPage, PlaceWords>> = Object.freeze({
  popgen: Object.freeze({
    fewerIndividuals: "with the filters of individuals",
    fewerIndividualsWhere:
      "with the filters of individuals in the Variants step",
    openAgain: (fileName: string) =>
      `load ${fileName} again in the Variants step`,
  }),
  popgen2: Object.freeze({
    fewerIndividuals:
      "with the thresholds of the individuals in the Variants tab",
    fewerIndividualsWhere:
      "with the thresholds of the individuals in the Variants tab",
    openAgain: (fileName: string) =>
      `open ${fileName} again in the box Variants`,
  }),
});

/** The end of a refusal on popgen2.html while the LD decay is live: it
    starts again by itself after the change the words ask for. Not said
    once Stop recalculating ended the live state (the review of the LD
    decay, 12 October 2026). */
const AGAIN_BY_ITSELF = "The LD decay is then calculated again by itself.";

/** Where the variants file is opened again on popgen2.html. */
const IN_BOX_VARIANTS = " in the box Variants";

/** The two options of the LD decay, as the project holds them. */
export interface LdDecayOptions {
  /** The largest distance between the two variants of a pair, in base
      pairs, from 50; on the old page `null` until the user types one,
      since it depends on the genome of the species (decision 10 of the
      owner, 30 September 2026); on popgen2.html `null` only once the user
      emptied its field. */
  readonly maxDist: number | null;
  /** The largest major allele frequency a variant has in a population and
      is still counted there, from 0.5 to 1. */
  readonly maxAllowedMaf: number;
}

/** The options of the old page when the user has set none: no largest
    distance, and popnei's default of `maxAllowedMaf` of
    `calcLdAndDistPerPop`, 0.95. */
export const LD_DECAY_DEFAULTS: LdDecayOptions = Object.freeze({
  maxDist: null,
  maxAllowedMaf: 0.95,
});

/** The largest distance of popgen2.html before the user types one, in
    base pairs: a start that suits many genomes and not all, which the
    owner chose on 16 October 2026 so that the LD decay runs with no
    option typed, reversing for this distance decision 10 of 30 September
    2026. A half distance close to it, which a warning reports, says it
    was too short for the genome (ldDecay.md, "On popgen2.html"). */
export const LD_DECAY2_MAX_DIST = 100_000;

/** The options of popgen2.html when the user has set none: the largest
    distance `LD_DECAY2_MAX_DIST`, and the old page's maximum MAF. */
export const LD_DECAY2_DEFAULTS: LdDecayOptions = Object.freeze({
  maxDist: LD_DECAY2_MAX_DIST,
  maxAllowedMaf: LD_DECAY_DEFAULTS.maxAllowedMaf,
});

/** The defaults of each page. */
const DEFAULTS_OF: Readonly<Record<LdDecayPage, LdDecayOptions>> =
  Object.freeze({ popgen: LD_DECAY_DEFAULTS, popgen2: LD_DECAY2_DEFAULTS });

/** The smallest distance of a pair, popnei's default, 1 bp, which leaves
    out only the pairs of two variants at one position. */
export const LD_DECAY_MIN_DIST = 1;

/** The bins the distances are cut into, popnei's default. */
export const LD_DECAY_NUM_BINS = 50;

/** The individuals below which a population's curve lies higher by chance
    alone, the writers' threshold of 30 September 2026, the minimum the
    diversity asks at each variant. */
export const LD_DECAY_FEW_INDIVIDUALS = 20;

/** The most bytes of counts of the pairs at every distance the lock lets
    through, 1 GB: 40 bytes a base pair and population, the writers'
    decision of 30 September 2026 (ldDecay.md, "Why it cannot run"). */
export const LD_DECAY_MAX_BYTES = 1_000_000_000;

/** The points of the fitted curve the plot draws, one every 3 pixels of a
    plot 600 wide. */
export const LD_CURVE_POINTS = 200;

/** The populations the plot draws, the rows of the legend a frame 300
    pixels high holds. */
export const LD_PLOT_MAX_POPS = 16;

/** The bytes popnei holds at most for each base pair of the largest
    distance and each population: 16 for the count and the sum of r², and
    24 for the three arrays of the distances that hold a pair. */
const BYTES_PER_BP_AND_POP = 40;

/** The largest distance popnei takes, 2^53 − 1, the most the field of
    the largest distance takes. */
export const MAX_DIST_TAKEN = Number.MAX_SAFE_INTEGER;

/** The smallest largest distance, the number of bins, so that each bin
    spans one base pair at least; the least the field of the largest
    distance takes. */
export const MIN_MAX_DIST = LD_DECAY_NUM_BINS;

/** The least `maxAllowedMaf` the options take: below it no variant of two
    alleles passes, since its major allele frequency is at least 0.5
    (ldDecay.md, "Its options"). */
export const MIN_MAX_ALLOWED_MAF = 0.5;

/** The largest `maxAllowedMaf` the options take, a frequency. */
export const MAX_MAX_ALLOWED_MAF = 1;

/** What the options should be, the end of "‹the field› should be ‹…›" of
    `projectErrorText`. */
const OPTIONS_EXPECTED = `the largest distance of a pair, a whole number of base pairs from ${grouped(MIN_MAX_DIST)} to ${grouped(MAX_DIST_TAKEN)} or null, and the largest major allele frequency in each population, a number from ${String(MIN_MAX_ALLOWED_MAF)} to ${String(MAX_MAX_ALLOWED_MAF)}, and nothing else`;

/** The analysis in the middle of a sentence, in the warnings of the
    populations and in the words of its panel. */
export const LD_DECAY_NAME = "the LD decay";

/** What the LD decay calls itself and its result in the warnings of the
    populations. */
const LD_DECAY_WORDS: PopulationWords = Object.freeze({
  leftOutOf: LD_DECAY_NAME,
  notIn: "the plot",
});

/** Why the largest distance has to be typed, on each page, which stands
    beside its field while it is empty, and nowhere else (ldDecay.md, "Why
    it cannot run"): on the old page it has no default; on popgen2.html
    it is empty only once the user emptied it, and its default is given
    as a start. */
const NO_DISTANCE: Readonly<Record<LdDecayPage, string>> = Object.freeze({
  popgen:
    "The LD decay needs the largest distance between the two variants of a pair. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs.",
  popgen2: `The LD decay needs the largest distance between the two variants of a pair. Type a distance in base pairs, ${grouped(LD_DECAY2_MAX_DIST)} to start with.`,
});

/** The reason beside the Run button while the largest distance is not
    typed, on each page: where to type it, the field saying why. On
    popgen2.html the field is in the section "Parameters", which may be
    closed (the owner, 16 October 2026). */
const NO_DISTANCE_RUN: Readonly<Record<LdDecayPage, string>> = Object.freeze({
  popgen: "Type the largest distance, above.",
  popgen2: `Type the largest distance in ${PARAMETERS}.`,
});

/** A name of a population is written whole in the legend of the plot up
    to this many characters, and cut in the middle about "…" above them,
    by the plot, so that the legend, beside the plot, leaves the plot its
    room. */
export const LD_LEGEND_NAME_LENGTH = 16;

/** The words of that refusal, with how fewer individuals are kept on
    the page. */
function noMemoryText(fewerIndividuals: string): string {
  return `The LD decay needed more memory than the browser tab could give. Type a smaller largest distance, keep fewer individuals ${fewerIndividuals}, or calculate it with popnei in Python, outside the browser.`;
}

/** The options of the project for the LD decay, or the defaults of the
    page `page`, `LD_DECAY_DEFAULTS` or `LD_DECAY2_DEFAULTS`. Throws a
    defect on options its `parseOptions` would refuse, which no command
    puts into a project. */
export function ldDecayOptions(p: Project, page: LdDecayPage): LdDecayOptions {
  const read = readOptions(analysisOptions(p, ID, { ...DEFAULTS_OF[page] }));
  if (!read.ok) {
    throw defect("the project holds options of the LD decay it refuses.");
  }
  return read.value;
}

/** A filter of the variants the LD decay reads: any but the LD pruning,
    each as popnei takes it. */
export type LdDecayFilter = Exclude<VariantFilter, { readonly kind: "ld" }>;

/** The lists `ldDecayFilters` made, by the project's filters, so that the
    same filters give the same array. */
const FILTERS = new WeakMap<
  readonly ProjectVariantFilter[],
  readonly LdDecayFilter[]
>();

/** The project's filters of the variants that are on, in their order,
    without the LD pruning, whatever its distance, which removes the pairs
    in LD the decay measures (decision 8 of the owner, 30 September 2026).
    The same frozen array for the same filters. */
export function ldDecayFilters(
  filters: Project["filters"],
): readonly LdDecayFilter[] {
  const known = FILTERS.get(filters);
  if (known !== undefined) {
    return known;
  }
  const made = Object.freeze(
    filters.filter((filter): filter is LdDecayFilter => filter.kind !== "ld"),
  );
  FILTERS.set(filters, made);
  return made;
}

/**
 * The reason the largest distance locks the LD decay, or `null` when it
 * does not: the distance not typed; or a distance whose counts would take
 * more than `LD_DECAY_MAX_BYTES` for the populations the lists to keep
 * and to remove leave. `needs` gives it after the reasons of the
 * populations, and the panel shows it beside the field of the distance
 * whenever it holds (ldDecay.md, "Why it cannot run").
 */
export function maxDistReason(p: Project, page: LdDecayPage): string | null {
  const maxDist = ldDecayOptions(p, page).maxDist;
  if (maxDist === null) {
    // Why it has to be typed; `needs` says only where.
    return NO_DISTANCE[page];
  }
  // No population is left when the populations cannot be made yet, which
  // `needs` locks on first, and when the lists to keep and to remove
  // leave nobody of the one population, "All individuals", which
  // `populationListsNeeds` leaves to the store's lock of the filters that
  // keep no individual, asked after `needs`: no memory to bound.
  // On popgen2.html the populations of every individual of the variants
  // file, before the thresholds of the individuals, which can only lower
  // their number; none before the file is read.
  const numPops =
    (page === "popgen" ? populationsByLists(p) : popgen2PopulationsToRun(p))
      ?.length ?? 0;
  return numPops > 0 && maxDist > maxDistFor(numPops)
    ? memoryText(numPops, page)
    : null;
}

/** The largest distance the memory allows for `numPops` populations, the
    whole base pairs at which 40 bytes a base pair and population stay
    within `LD_DECAY_MAX_BYTES`: 25,000,000 for one, 8,333,333 for three. */
export function maxDistFor(numPops: number): number {
  return Math.floor(LD_DECAY_MAX_BYTES / (BYTES_PER_BP_AND_POP * numPops));
}

/** The three numbers of the fitted curve of a population. */
export interface Curve {
  readonly rhoPerBp: number;
  readonly r2AtZero: number;
  readonly halfDist: number;
}

/**
 * The fitted curve of the population `i` of `r`, or `null` when popnei
 * fitted it none: the one place that says whether a population has a
 * curve, by its ρ per base pair, for the plot, the legend, the
 * description, the tables and the warning `noCurve`. popnei gives the
 * three numbers of a curve together or none of them; a result with some
 * and not the others, which popnei's documents allow for a population of
 * two individuals and the release `js-v0.1.0-dev.3` did not give (node, 1
 * October 2026: two individuals of ld.nei gave 7,651 pairs and none of
 * the three), has no words in ldDecay.md, and is a defect thrown here.
 */
export function curveOf(r: LdDecayResult, i: number): Curve | null {
  const rhoPerBp = valueAt(r.rhoPerBp, i, "rhoPerBp");
  const r2AtZero = valueAt(r.r2AtZero, i, "r2AtZero");
  const halfDist = valueAt(r.halfDist, i, "halfDist");
  const none = Number.isNaN(rhoPerBp);
  if (Number.isNaN(r2AtZero) !== none || Number.isNaN(halfDist) !== none) {
    throw defect(
      `the result of the LD decay gives the population ${String(i)} a ρ per base pair of ${String(rhoPerBp)}, an r² at 0 of ${String(r2AtZero)} and a half distance of ${String(halfDist)}, a curve in part.`,
    );
  }
  return none ? null : { rhoPerBp, r2AtZero, halfDist };
}

/** One row of the table of the populations, a number `null` where popnei
    gave NaN. */
export interface LdDecayRow {
  /** The name of the population. */
  readonly population: string;
  /** The individuals it was sent with, the n of its curve. */
  readonly individuals: number;
  /** The variants it counted, those that pass its maximum MAF. */
  readonly variants: number;
  /** The pairs it counted, the sum of its bins. */
  readonly pairs: number;
  /** The distance at which its curve falls to half, in base pairs. */
  readonly halfDist: number | null;
  /** Its fitted curve at a distance of 0. */
  readonly r2AtZero: number | null;
  /** Its fitted ρ per base pair, 4Nr per base pair. */
  readonly rhoPerBp: number | null;
}

/** The rows of each result, so that a screen drawn again gets the same
    array. */
const ROWS = new WeakMap<LdDecayResult, readonly LdDecayRow[]>();

/** One row per population, in the order of the result; the same array
    for the same result. */
export function ldDecayRows(r: LdDecayResult): readonly LdDecayRow[] {
  const kept = ROWS.get(r);
  if (kept !== undefined) {
    return kept;
  }
  const rows = Object.freeze(
    r.pops.map((population, i): LdDecayRow => {
      const curve = curveOf(r, i);
      return Object.freeze({
        population,
        individuals: valueAt(r.numIndividuals, i, "numIndividuals"),
        variants: valueAt(r.numVars, i, "numVars"),
        pairs: pairsOf(r, i),
        halfDist: curve?.halfDist ?? null,
        r2AtZero: curve?.r2AtZero ?? null,
        rhoPerBp: curve?.rhoPerBp ?? null,
      });
    }),
  );
  ROWS.set(r, rows);
  return rows;
}

/** The half distances written to three significant digits, below this
    many base pairs; from it, in whole base pairs (ldDecay.md, "What it
    shows"). */
const WHOLE_BP_FROM = 10;

/** The most decimals `toFixed` writes. */
const MAX_DECIMALS = 100;

/**
 * A number of the screen to three significant digits, with no exponent,
 * the zeros that make the three kept: "0.247", "0.000300", "1.50". A
 * negative one starts with "-"; 0 is "0.00".
 */
export function threeSignificant(value: number): string {
  // The exponent of the number once rounded to three digits, so that
  // 9.996 counts as 10.0 and 0.0009996 as 0.00100.
  const exponent = Number(value.toExponential(2).split("e")[1]);
  return value.toFixed(Math.min(MAX_DECIMALS, Math.max(0, 2 - exponent)));
}

/**
 * A half distance as the legend and the table write it, without its
 * unit: below 10 bp to three significant digits, "0.247", and from 10 bp
 * in whole base pairs with a comma between thousands, "7,548", a number
 * that rounds to 10 at three digits counting as 10.
 */
export function halfDistText(halfDist: number): string {
  const three = threeSignificant(halfDist);
  return Number(three) < WHOLE_BP_FROM ? three : grouped(Math.round(halfDist));
}

/**
 * The words of a refusal of popnei, for the error state of the panel of
 * the project `p`: popnei refused for memory, and then the rows every
 * analysis shares, of `refusalWords`, with the words of the LD decay
 * (ldDecay.md, "Its words"). On popgen2.html, while the LD decay is
 * live, `live`, the words of a refusal that leaves it live end with
 * `AGAIN_BY_ITSELF`; `live` is not read on popgen.html. Throws a defect
 * on a project with no variants file.
 */
export function refusalText(
  message: string,
  p: Project,
  page: LdDecayPage,
  live: boolean,
): string {
  if (p.variants === null) {
    throw defect("refusalText was given a project with no variants file.");
  }
  if (isMemoryRefusal(message)) {
    return noMemoryText(PLACES[page].fewerIndividuals);
  }
  if (page === "popgen2") {
    const fileWords = fileRefusalText(message, p, {
      cannot: "the LD decay cannot be calculated",
      where: IN_BOX_VARIANTS,
    });
    if (fileWords !== null) return fileWords;
    return `${refusalWords(message, p, {
      change: `Change the settings, or open the variants file again${IN_BOX_VARIANTS}`,
      calculate: "calculate the LD decay",
      nothingLeft: "there is no variant to calculate the LD decay over",
      again: "to calculate it again",
      emptyPass: (name) =>
        `The thresholds of the Variants tab kept none of the variants of ${name}, so there is no variant to calculate the LD decay over. Loosen them.`,
    })}${live ? ` ${AGAIN_BY_ITSELF}` : ""}`;
  }
  return refusalWords(message, p, {
    change: CHANGE_SETTINGS,
    calculate: "calculate the LD decay",
    nothingLeft: "there is no variant to calculate the LD decay over",
    again: "to calculate it again",
    emptyPass: (fileName) =>
      `The filters kept none of the variants of ${fileName}, so there is no variant to calculate the LD decay over. Loosen the filters in the Variants step.`,
  });
}

/**
 * The words of a calculation worker that stopped with no answer during an
 * LD decay, for the error state of the panel of the project `p`
 * (ldDecay.md, "Its words"): a browser can end the calculation for lack
 * of memory before popnei can refuse, so they name the memory, a smaller
 * distance and fewer individuals, and not only another run, which may
 * take many minutes and end the same way. Throws a defect on a project
 * with no variants file.
 */
export function crashText(p: Project, page: LdDecayPage): string {
  if (p.variants === null) {
    throw defect("crashText was given a project with no variants file.");
  }
  const places = PLACES[page];
  return `The calculation stopped unexpectedly, perhaps because the LD decay needed more memory than the browser tab could give. Type a smaller largest distance, or keep fewer individuals ${places.fewerIndividualsWhere}, and run it again; or calculate it with popnei in Python, outside the browser. If it stops again at a small distance, ${places.openAgain(escaped(p.variants.name))}.`;
}

/**
 * The definition of the LD decay, as the store knows it: the filters of
 * individuals in its key through `keyOf`, and the filters of the variants
 * through `keyInputs`, as `ldDecayFilters` gives them, so that the store
 * does not lock it on the LD pruning of the Variants step, which it does
 * not read (ldDecay.md, "What goes into its key"). Its `keptNeeds` is the
 * diversity's, the individuals kept leaving no population.
 */
function definitionOf(page: LdDecayPage): AnalysisDef<Job, JobResult> {
  return Object.freeze({
    id: ID,
    app: Object.freeze(["popgen"] as const),
    defaults: Object.freeze({ ...DEFAULTS_OF[page] }),
    keyVersion: 1,
    filtersRead: Object.freeze({ variants: false, individuals: true }),
    parseOptions,
    keyInputs: (p: Project) => keyInputs(p, page),
    needs: (p: Project) => (page === "popgen" ? needs(p) : popgen2Needs(p)),
    keptNeeds:
      page === "popgen" ? populationsKeptNeeds : popgen2PopulationsKeptNeeds,
    run: (p: Project, c: WorkerClient<Job, JobResult>) => run(p, c, page),
    warnings: (result: JobResult, p: Project) => warnings(result, p, page),
    checkNumbers,
    numCheckNumbers: (p: Project) => numCheckNumbers(p, page),
    script: (p: Project) => script(p, page),
  });
}

/** The LD decay of the old page, listed by POPGEN_ANALYSES of
    src/core/apps.ts. */
export const ldDecay: AnalysisDef<Job, JobResult> = definitionOf("popgen");

/** The LD decay of the Populations tab of popgen2.html, of the same id,
    with the populations and the words of that page, listed by
    POPGEN2_ANALYSES of src/core/apps.ts (ldDecay.md, "On
    popgen2.html"). */
export const ldDecayOnPopgen2: AnalysisDef<Job, JobResult> =
  definitionOf("popgen2");

/** The page of the definition `def` that a store runs, "popgen" for
    `ldDecay` and "popgen2" for `ldDecayOnPopgen2`. Throws a defect on
    the definition of another analysis. */
export function ldDecayPageOf(def: AnalysisDef<Job, JobResult>): LdDecayPage {
  if (def === ldDecay) return "popgen";
  if (def === ldDecayOnPopgen2) return "popgen2";
  throw defect(`the page of the LD decay was asked of the analysis ${def.id}.`);
}

/**
 * Checks the options of the LD decay read from a project file and gives
 * them back as an object of exactly the two fields: `maxDist`, a whole
 * number from 50 to 9,007,199,254,740,991 or `null`, and `maxAllowedMaf`,
 * a number from 0.5 to 1. Every version of the format reads them in the
 * same way, so the version the store passes is not read.
 */
function parseOptions(options: unknown): Result<JsonObject, string> {
  const read = readOptions(options);
  return read.ok ? { ok: true, value: { ...read.value } } : read;
}

/** The two options read from `options`, or what they should be. */
function readOptions(options: unknown): Result<LdDecayOptions, string> {
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
    !Object.hasOwn(options, "maxDist") ||
    !Object.hasOwn(options, "maxAllowedMaf")
  ) {
    return refused;
  }
  const maxDist: unknown = Reflect.get(options, "maxDist");
  const maxAllowedMaf: unknown = Reflect.get(options, "maxAllowedMaf");
  const isDistance =
    maxDist === null ||
    (typeof maxDist === "number" &&
      Number.isInteger(maxDist) &&
      maxDist >= MIN_MAX_DIST &&
      maxDist <= MAX_DIST_TAKEN);
  if (
    !isDistance ||
    typeof maxAllowedMaf !== "number" ||
    !Number.isFinite(maxAllowedMaf) ||
    maxAllowedMaf < MIN_MAX_ALLOWED_MAF ||
    maxAllowedMaf > MAX_MAX_ALLOWED_MAF
  ) {
    return refused;
  }
  return { ok: true, value: { maxDist, maxAllowedMaf } };
}

/**
 * What the key holds beyond the load and the filters of individuals,
 * which `keyOf` puts in itself: the populations, as `populationsOf` gives
 * them; the filters of the variants the job carries, `ldDecayFilters`,
 * which `keyOf` leaves out since `filtersRead.variants` is false, so that
 * the LD pruning of the Variants step, which the job does not carry,
 * keeps the key and the plot; and the two options. The smallest distance
 * and the number of bins are constants, under the key version. Reads
 * nothing of `p.variants`, so it answers for any project.
 */
function keyInputs(p: Project, page: LdDecayPage): JsonObject {
  const options = ldDecayOptions(p, page);
  return {
    pops: page === "popgen" ? populationsOf(p) : popgen2Populations(p),
    filters: ldDecayFilters(filtersApplied(p)),
    options: {
      maxDist: options.maxDist,
      maxAllowedMaf: options.maxAllowedMaf,
    },
  };
}

/**
 * The first reason the LD decay cannot run beyond those the store asks of
 * every analysis that reads the filters of individuals, or `null`: the
 * individuals file, the column of the populations and the lists leaving
 * no population, as for the diversity; the largest distance not typed,
 * in the words that say where to type it, the field saying why;
 * and a largest distance whose counts would take more than
 * `LD_DECAY_MAX_BYTES` for the populations the lists to keep and to
 * remove leave. The LD pruning of the Variants step, which it does not
 * read, locks nothing, not even with no distance. Throws a defect on a
 * project of association whose individuals file is read.
 */
function needs(p: Project): string | null {
  const reason = individualsNeeds(p);
  if (reason !== null) {
    return reason;
  }
  if (p.grouping.kind === "roles") {
    throw defect("the LD decay was given a project of association.");
  }
  const populations = populationsNeeds(p)?.reason ?? populationListsNeeds(p);
  if (populations !== null) {
    return populations;
  }
  return ldDecayOptions(p, "popgen").maxDist === null
    ? NO_DISTANCE_RUN.popgen
    : maxDistReason(p, "popgen");
}

/** The first reason the LD decay of popgen2.html cannot run beyond
    those every analysis shares, or `null` (ldDecay.md, "On
    popgen2.html"): the individuals file being read; the largest distance
    not typed; a distance the memory does not allow for the populations
    of the variants file. An individual not in the individuals file, a
    refused file and a column that gives no population do not lock: their
    individuals are unclassified. Throws a defect on a project of
    association. */
function popgen2Needs(p: Project): string | null {
  const individuals = p.individuals;
  if (individuals?.read.kind === "pending") {
    return `The LD decay waits for ${escaped(individuals.name)} to be read.`;
  }
  if (p.grouping.kind === "roles") {
    throw defect("the LD decay was given a project of association.");
  }
  return ldDecayOptions(p, "popgen2").maxDist === null
    ? NO_DISTANCE_RUN.popgen2
    : maxDistReason(p, "popgen2");
}

/** The populations of `p` on the page `page`, narrowed to the
    individuals kept, `kept`. */
function populationsKeptOf(
  p: Project,
  kept: readonly string[] | null,
  page: LdDecayPage,
): PopulationsKept | null {
  return page === "popgen"
    ? populationsKept(p, kept)
    : popgen2PopulationsKept(p, kept);
}

/** The reason of the lock of the memory for `numPops` populations, on
    the page `page`, which on popgen2.html names the section
    "Parameters" the field is in, which may be closed (the owner, 16
    October 2026). */
function memoryText(numPops: number, page: LdDecayPage): string {
  const most = `can be at most ${grouped(maxDistFor(numPops))} base pairs`;
  const start =
    numPops === 1
      ? `The largest distance ${most}`
      : `With ${grouped(numPops)} populations, the largest distance ${most}`;
  return `${start}: the pairs are counted at every distance up to it, in up to 40 bytes for each base pair and population, and more than 1 GB of such counts may not fit in the memory of a browser tab. Type a smaller distance${page === "popgen" ? "" : ` in ${PARAMETERS}`}, or calculate it with popnei in Python, outside the browser.`;
}

/** Builds the request, with the individuals the filters keep that the
    store gives through `c`, and sends it through `c`. Throws a defect when
    there are no populations to run, which is also the case of a variants
    file not loaded or not read, and when the largest distance is not
    typed, which `needs` and the store rule out. */
function run(
  p: Project,
  c: WorkerClient<Job, JobResult>,
  page: LdDecayPage,
): Run<JobResult> {
  const kept = populationsKeptOf(p, c.individuals, page);
  const options = ldDecayOptions(p, page);
  if (p.variants === null || kept === null || options.maxDist === null) {
    throw defect(
      "the LD decay was run with no populations or no largest distance.",
    );
  }
  return c.run({
    analysis: ID,
    fileId: p.variants.fileId,
    filters: ldDecayFilters(filtersApplied(p)),
    individuals: c.individuals,
    pops: kept.pops,
    minDist: LD_DECAY_MIN_DIST,
    maxDist: options.maxDist,
    numBins: LD_DECAY_NUM_BINS,
    maxAllowedMaf: options.maxAllowedMaf,
  });
}

/**
 * The warnings of a result, given the project its request was made from,
 * in this order: populations of fewer than 20 individuals, in one
 * warning, which says to compare them with the others only when the
 * result has others; then, one warning for each population, those with no pair,
 * those with pairs and no curve, those whose half distance lies beyond
 * their furthest pairs, and those whose half distance lies below their
 * closest; then individuals of the variants file with no population, and
 * populations with individuals in the variants file that are not in the
 * result. Throws a defect on a project whose variants file is not read or
 * that has no largest distance, and on a project of association.
 */
function warnings(
  result: JobResult,
  p: Project,
  page: LdDecayPage,
): readonly Warning[] {
  const r = ldDecayResultOf(result);
  if (p.variants?.read.kind !== "read") {
    throw defect("the warnings of the LD decay need a variants file read.");
  }
  const options = ldDecayOptions(p, page);
  const maxDist = options.maxDist;
  if (maxDist === null) {
    throw defect("the warnings of the LD decay need a largest distance.");
  }
  const rows = ldDecayRows(r);
  const found: Warning[] = [];
  const few = rows.filter((row) => row.individuals < LD_DECAY_FEW_INDIVIDUALS);
  if (few.length > 0) {
    found.push({
      code: "fewIndividuals",
      text: fewIndividualsText(
        few,
        page === "popgen"
          ? populationsOf(p) === "all"
          : popgen2OnePopulationCause(p) !== null,
        few.length < rows.length,
      ),
    });
  }
  for (const row of rows) {
    if (row.pairs === 0) {
      found.push({
        code: "noPairs",
        text: noPairsText(row, maxDist, options.maxAllowedMaf),
      });
    }
  }
  for (const row of rows) {
    if (row.pairs > 0 && row.rhoPerBp === null) {
      found.push({ code: "noCurve", text: noCurveText(row, maxDist) });
    }
  }
  for (const [i, row] of rows.entries()) {
    const text = beyondPairsText(r, i, row, maxDist);
    if (text !== null) {
      found.push({ code: "halfDistBeyondPairs", text });
    }
  }
  for (const [i, row] of rows.entries()) {
    const text = belowPairsText(r, i, row);
    if (text !== null) {
      found.push({ code: "halfDistBelowPairs", text });
    }
  }
  if (page === "popgen") {
    found.push(...populationWarnings(r.pops, p, LD_DECAY_WORDS));
    return found;
  }
  // An unclassified individual is no fault on popgen2.html, whose tab
  // says how many are left out.
  const toRun: Pops = popgen2PopulationsToRun(p) ?? [];
  // The one population is always in the result, so populationNotInResult
  // would find nothing either; the guard says that a warning of a
  // population missing is of the populations of a column alone.
  const notInResult =
    popgen2OnePopulationCause(p) !== null
      ? null
      : populationNotInResult(
          r.pops,
          toRun,
          escaped(p.variants.name),
          LD_DECAY_WORDS.notIn,
        );
  if (notInResult !== null) found.push(notInResult);
  return found;
}

/** The text of `fewIndividuals`, for its populations; `one` for the one
    population of every individual, which is not called a population;
    `others` when the result has populations of 20 individuals or more,
    to compare these with. A population of one or two individuals has no
    curve, so the words say "when it has one". */
function fewIndividualsText(
  rows: readonly LdDecayRow[],
  one: boolean,
  others: boolean,
): string {
  const threshold = grouped(LD_DECAY_FEW_INDIVIDUALS);
  const chance = `With fewer than ${threshold}, r² is higher than in the population by chance alone, more than the fitted curve corrects for`;
  const [first] = rows;
  if (rows.length === 1 && first !== undefined) {
    const name = shown(first.population);
    const subject = one ? name : `Population ${name}`;
    return `${subject} has ${counted(first.individuals, "individual")}. ${chance}, so its curve, when it has one, lies higher and its half distance is longer than those of a larger population.${others ? " Compare it with the others with this in mind." : ""}`;
  }
  const names = namesOf(rows.map((row) => row.population));
  const counts =
    rows.length <= MAX_NAMED
      ? `, ${bothOf(rows.map((row) => grouped(row.individuals)))}`
      : "";
  return `Populations ${names} have fewer than ${threshold} individuals${counts}. ${chance}, so their curves, when they have one, lie higher and their half distances are longer than those of a larger population.${others ? " Compare them with the others with this in mind." : ""}`;
}

/** The text of `noPairs` for the population of `row`: it has fewer than
    two individuals, which no distance mends, since r² needs two; fewer
    than two of its variants pass its maximum MAF; or no two of them are
    within the largest distance. */
function noPairsText(
  row: LdDecayRow,
  maxDist: number,
  maxAllowedMaf: number,
): string {
  const start = `${shown(row.population)} has no pair of variants to measure:`;
  if (row.individuals < 2) {
    return `${start} it has ${counted(row.individuals, "individual")}, and r² needs two or more.`;
  }
  return row.variants < 2
    ? `${start} fewer than two of its variants pass its maximum major allele frequency of ${String(maxAllowedMaf)}.`
    : `${start} no two of its ${grouped(row.variants)} variants on one chromosome are within ${grouped(maxDist)} base pairs of each other with a value of r². Type a larger distance.`;
}

/** The text of `noCurve` for the population of `row`. */
function noCurveText(row: LdDecayRow, maxDist: number): string {
  return `No curve could be fitted to the pairs of ${shown(row.population)}, so it has no half distance: its pairs are at one distance only, or r² does not fall with distance in a way a curve can follow within ${grouped(maxDist)} base pairs, flat across them or fallen within the first base pair. Its mean r² of each bin is shown.`;
}

/** The text of `halfDistBeyondPairs` for the population `i`, when its half
    distance is finite and above the largest distance of its last bin with
    a pair, or `null`. */
function beyondPairsText(
  r: LdDecayResult,
  i: number,
  row: LdDecayRow,
  maxDist: number,
): string | null {
  const bins = binsWithPairs(r, i);
  const halfDist = row.halfDist;
  if (halfDist === null || bins === null) {
    return null;
  }
  const furthest = valueAt(r.largestDist, bins.last, "largestDist");
  if (halfDist <= furthest) {
    return null;
  }
  const start = `The curve of ${shown(row.population)} falls to half at ${halfDistText(halfDist)} bp, beyond`;
  const notMeasured =
    "so that distance is where the curve would reach and not where pairs were measured";
  return halfDist > maxDist
    ? `${start} the ${grouped(maxDist)} base pairs within which pairs were counted, ${notMeasured}, and the plot does not reach it. Type a larger distance to count pairs that far apart.`
    : `${start} its furthest pairs, in the bin to ${bp(furthest)} bp, ${notMeasured}.`;
}

/** The text of `halfDistBelowPairs` for the population `i`, when its half
    distance is finite and below the smallest distance of its first bin
    with a pair, or `null`. */
function belowPairsText(
  r: LdDecayResult,
  i: number,
  row: LdDecayRow,
): string | null {
  const bins = binsWithPairs(r, i);
  const halfDist = row.halfDist;
  if (halfDist === null || bins === null) {
    return null;
  }
  const closest = valueAt(r.smallestDist, bins.first, "smallestDist");
  if (halfDist >= closest) {
    return null;
  }
  return `The curve of ${shown(row.population)} falls to half at ${halfDistText(halfDist)} bp, closer than the closest pairs counted, in the bin from ${bp(closest)} bp: r² is already low at the shortest distances of this file, and the half distance says only that LD falls within them. Type a smaller largest distance to see the decay within them.`;
}

/** The first and the last bin of the population `i` that hold a pair, or
    `null` when none does. */
function binsWithPairs(
  r: LdDecayResult,
  i: number,
): { readonly first: number; readonly last: number } | null {
  const numBins = r.smallestDist.length;
  let first: number | null = null;
  let last: number | null = null;
  for (let bin = 0; bin < numBins; bin++) {
    if (valueAt(r.numPairs, i * numBins + bin, "numPairs") > 0) {
      first ??= bin;
      last = bin;
    }
  }
  return first === null || last === null ? null : { first, last };
}

/** A distance of a bin in whole base pairs with a comma between
    thousands; a half distance is written by `halfDistText`. */
function bp(dist: number): string {
  return grouped(Math.round(dist));
}

/** The check numbers: the variants kept, then for each population the
    variants it counted, the pairs it counted and its half distance,
    `null` for a NaN. */
function checkNumbers(result: JobResult): readonly (number | null)[] {
  const r = ldDecayResultOf(result);
  return [
    r.passStats.numVars,
    ...ldDecayRows(r).flatMap((row) => [row.variants, row.pairs, row.halfDist]),
  ];
}

/** The check numbers of each population: its variants, its pairs and its
    half distance. */
const NUMBERS_PER_POPULATION = 3;

/** How many numbers `checkNumbers` gives for a result of `p`: 1 + 3 × the
    populations the lists of individuals to keep and to remove leave;
    `null` when `populationsToRun` is, when the project holds a threshold
    on the individuals, whose list needs the statistics of each
    individual, and when a list is one popnei would refuse, as for the
    diversity. */
function numCheckNumbers(p: Project, page: LdDecayPage): number | null {
  if (page === "popgen2") {
    const pops = popgen2PopulationsToRun(p);
    return pops === null || hasIndividualThreshold(p)
      ? null
      : 1 + NUMBERS_PER_POPULATION * pops.length;
  }
  if (populationsToRun(p) === null || hasIndividualThreshold(p)) {
    return null;
  }
  const pops = populationsByLists(p);
  return pops === null ? null : 1 + NUMBERS_PER_POPULATION * pops.length;
}

/**
 * The lines of the Python script that calculate the same numbers with
 * popnei's Python API, after the lines that read the table `individuals`
 * and make `individuals_kept`: the file opened again into a `Variants` of
 * its own, `ld_variants`, since the script's `variants` holds the LD
 * pruning, with the read options of a VCF written out; the individuals
 * kept, when the project has a filter of individuals; the filters of
 * `ldDecayFilters`; the populations of the page `page`, as the
 * diversity's lines make them; the call; and the prints of the two
 * tables. Throws a defect on a project with no variants file, no largest
 * distance or no populations, since it is asked only of an analysis that
 * has run.
 */
function script(p: Project, page: LdDecayPage): string {
  const variants = p.variants;
  const options = ldDecayOptions(p, page);
  if (variants === null || options.maxDist === null) {
    throw defect(
      "the script of the LD decay needs a variants file and a largest distance.",
    );
  }
  const open = pythonOpenVariants(variants);
  return [
    ...scriptComment(p, page),
    `ld_variants = ${open}`,
    ...ldDecayFilters(filtersApplied(p))
      .filter((filter) => filter.kind === "passed")
      .map(filterLine),
    ...(p.individualFilters.length === 0
      ? []
      : ["ld_variants.filter_individuals(individuals_kept)"]),
    ...ldDecayFilters(filtersApplied(p))
      .filter((filter) => filter.kind !== "passed")
      .map(filterLine),
    ...scriptPops(p, page),
    "ld = popnei.calc_ld_and_dist_per_pop(",
    `    ld_variants, pops=pops, min_dist=${String(LD_DECAY_MIN_DIST)}, max_dist=${String(options.maxDist)}, num_bins=${String(LD_DECAY_NUM_BINS)},`,
    `    max_allowed_maf=${String(options.maxAllowedMaf)},`,
    ")",
    "print(pandas.DataFrame({",
    '    "individuals": {pop: len(names) for pop, names in pops.items()},',
    '    "variants": ld.num_vars_per_pop,',
    '    "half_distance_bp": {pop: d.half_dist for pop, d in ld.decay_per_pop.items()},',
    '    "r2_at_distance_0": {pop: d.r2_at_zero for pop, d in ld.decay_per_pop.items()},',
    '    "rho_per_bp": {pop: d.rho_per_bp for pop, d in ld.decay_per_pop.items()},',
    "}).to_string())",
    "for pop, bins in ld.per_pop.items():",
    "    print(pop)",
    "    print(bins.to_string())",
  ]
    .map((line) => `${line}\n`)
    .join("");
}

/** Whether the LD decay of `p` on the page `page` is of every
    individual as one population. */
function isOnePopulation(p: Project, page: LdDecayPage): boolean {
  return page === "popgen"
    ? populationsOf(p) === "all"
    : popgen2OnePopulationCause(p) !== null;
}

/** The two lines of the comment of the script, which name the column of
    the populations, or the one population, and what was filtered, in the
    words of the page `page`. */
function scriptComment(p: Project, page: LdDecayPage): readonly string[] {
  const column = isOnePopulation(p, page) ? null : populationsColumn(p);
  const whose =
    column === null
      ? "every individual, as one population,"
      : `each population, from the column ${JSON.stringify(column)},`;
  return [
    `# The LD decay of ${whose} over the`,
    page === "popgen"
      ? "# filters of the Variants step but its LD pruning, on a Variants of its own"
      : "# thresholds of the Variants tab, on a Variants of its own",
  ];
}

/** The lines of the script that make the dict of the populations: from
    the column of the metadata file, narrowed to the individuals of
    `ld_variants`, which leaves out the unclassified; or, for the one
    population of the page `page`, "All individuals" or "Unclassified",
    the individuals of `ld_variants`. Throws a defect on a project with
    no populations. */
function scriptPops(p: Project, page: LdDecayPage): readonly string[] {
  if (isOnePopulation(p, page)) {
    const name = page === "popgen" ? ONE_POPULATION : UNCLASSIFIED_POPULATION;
    return [`pops = {${JSON.stringify(name)}: list(ld_variants.individuals)}`];
  }
  const column = populationsColumn(p);
  if (column === null) {
    throw defect("the script of the LD decay was asked with no populations.");
  }
  const name = JSON.stringify(column);
  return [
    "pops = {}",
    `for individual, pop in zip(individuals.iloc[:, 0], individuals[${name}]):`,
    "    if not pandas.isna(pop):",
    "        pops.setdefault(pop, []).append(individual)",
    "kept = set(ld_variants.individuals)",
    "pops = {pop: [i for i in names if i in kept] for pop, names in pops.items()}",
    "pops = {pop: names for pop, names in pops.items() if names}",
  ];
}

/** The line of the script that puts one filter of the job on
    `ld_variants`, its numbers as `String` writes them; the filter of the
    FILTER column is popnei's `filter_passed`, which the script puts
    before the list of the individuals, where the runner puts it. */
function filterLine(filter: LdDecayFilter): string {
  switch (filter.kind) {
    case "passed":
      return "ld_variants.filter_passed()";
    case "missing_data":
      return `ld_variants.filter_by_missing_data(${String(filter.maxAllowedMissingRate)})`;
    case "obs_het":
      return `ld_variants.filter_by_obs_het(${String(filter.maxAllowedObsHet)})`;
    case "maf":
      return `ld_variants.filter_by_maf(${String(filter.maxAllowedMaf)})`;
  }
}

/** The column the populations are taken from, `populationsColumnOf` of
    project.ts. Throws a defect on a project of association, which has no
    LD decay. */
function populationsColumn(p: Project): string | null {
  if (p.grouping.kind === "roles") {
    throw defect("the LD decay was given a project of association.");
  }
  return populationsColumnOf(p);
}

/** The result as the LD decay's own. Throws a defect on the result of
    another analysis, which the store never gives the LD decay. */
function ldDecayResultOf(r: JobResult): LdDecayResult {
  if (r.analysis !== "ldDecay") {
    throw defect(`the LD decay was given a result of ${r.analysis}.`);
  }
  return r;
}

/** The pairs population `i` counted, the sum of its bins: whole numbers
    added, exact below 2^53. */
export function pairsOf(r: LdDecayResult, i: number): number {
  const numBins = r.smallestDist.length;
  let pairs = 0;
  for (let bin = 0; bin < numBins; bin++) {
    pairs += valueAt(r.numPairs, i * numBins + bin, "numPairs");
  }
  return pairs;
}

/** The name of the population `i` of `r`; one missing is a defect. */
export function popAt(r: LdDecayResult, i: number): string {
  const pop = r.pops[i];
  if (pop === undefined) {
    throw defect(`the result of the LD decay has no population ${String(i)}.`);
  }
  return pop;
}

/** The element `i` of an array of a result; one missing is a defect, as
    every array of a result has the length its populations and bins
    give. */
export function valueAt(
  values: Uint32Array | Float64Array,
  i: number,
  name: string,
): number {
  const value = values[i];
  if (value === undefined) {
    throw defect(`the result of the LD decay has no ${name} at ${String(i)}.`);
  }
  return value;
}
