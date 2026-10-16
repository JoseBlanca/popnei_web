/**
 * The distances between populations: what they are calculated from, when
 * they cannot run, the request they send, their warnings, their check
 * numbers, their lines of the Python script, and the words of popnei's
 * refusal (docs/specs/analyses/popDists.md, "The module"). What their
 * panel shows, the table, its CSV, the heatmap and its words, is in
 * popDistsPanel.ts, which popgen2.html downloads with the Distances tab.
 *
 * Every number is popnei's, from one call of `calcPopDists` in the
 * calculation worker: Hudson's Fst and Jost's D of each pair, the
 * variants each pair was calculated over, and the order of the heatmap of
 * each measure, which the worker makes with popnei's PCoA. This module
 * computes none of them. A population with fewer individuals than the
 * minimum is left out of the request and named in a warning, by
 * `populationsWithMinimum` of populations.ts, which the diversity calls
 * too.
 *
 * Two definitions are made by the same code: `popDists`, of the old
 * page, and `popDistsOnPopgen2`, of the Distances tab of popgen2.html,
 * where an individual of no population is unclassified and left out,
 * and whose words name the tabs and the boxes of that page
 * (docs/specs/analyses/popDists.md, "On popgen2.html").
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
  populationsKept,
  populationsNeeds,
  populationsOf,
  populationsToRun,
  shown,
  LARGEST_WHOLE_NUMBER,
  MAX_NAMED,
  popgen2OnePopulationCause,
  popgen2Populations,
  popgen2PopulationsKept,
  popgen2PopulationsToRun,
} from "../project.ts";
import { filtersApplied } from "../filtersApplied.ts";
import {
  populationListsNeeds,
  populationsColumnOf,
  populationsKeptNeeds,
  populationsWithMinimum,
  populationsByLists,
  popgen2PopulationsKeptNeeds,
} from "../populations.ts";
import type { Project } from "../project.ts";
import type { Result } from "../result.ts";
import type { AnalysisDef, Warning, WorkerClient } from "../store.ts";
import { fileRefusalText } from "./fileRefusals.ts";
import {
  CHANGE_SETTINGS,
  defect,
  fourDecimals,
  orNull,
  percentOf,
  populationNotInResult,
  populationWarnings,
  refusalWords,
} from "./words.ts";
import { PARAMETERS } from "./words.ts";
import type { PopulationWords } from "./words.ts";
import type {
  Job,
  JobResult,
  Pops,
  PopDistsResult,
  Run,
  ShownMeasure,
} from "../../worker/protocol.ts";

/** The id of the analysis. */
const ID = "popDists";

/** The page a definition is for, which picks the populations and the
    words: the old page, popgen.html, or popgen2.html (the spec, "On
    popgen2.html"). */
export type PopDistsPage = "popgen" | "popgen2";

/** The places a sentence of the module names, by the page. */
interface PlaceWords {
  /** The individuals file: "the metadata file", or its name. */
  readonly individualsFile: (p: Project) => string;
  /** The filters of the individuals and where they are: "the filters of
      individuals in the Variants step", "the thresholds of the
      individuals in the Variants tab". */
  readonly individualFilters: string;
}

/** The places of each page. */
const PLACES: Readonly<Record<PopDistsPage, PlaceWords>> = Object.freeze({
  popgen: Object.freeze({
    individualsFile: () => "the metadata file",
    individualFilters: "the filters of individuals in the Variants step",
  }),
  popgen2: Object.freeze({
    individualsFile: (p: Project) => escaped(p.individuals?.name ?? ""),
    individualFilters: "the thresholds of the individuals in the Variants tab",
  }),
});

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

/** The end of a refusal on popgen2.html that leaves the distances live,
    once the user has changed what the words ask: they start again by
    themselves after the change, which nothing else says. */
const AGAIN_BY_THEMSELVES =
  "The distances are then calculated again by themselves.";

/** The end of a refusal of popgen2.html after what to change: "…, and
    the distances are then calculated again by themselves.", in the
    place of the old page's "to run it again" (the review of the
    Distances tab, 12 October 2026). */
const THEN_AGAIN = "and the distances are then calculated again by themselves";

/** Where the variants file is opened again on popgen2.html. */
const IN_BOX_VARIANTS = " in the box Variants";

/**
 * The words of a refusal of popnei, for the error state of the panel of
 * the project `p` on the page `page`: the rows every analysis shares, of
 * `refusalWords`, with "the distances between populations" in the place
 * of "the diversity" (popDists.md, "Its words"); on popgen2.html, the
 * refusals of the variants file itself in the words of the box
 * Variants, and the others in the words of that page, ending, while the
 * distances are live, `live`, with what happens after the change they
 * ask for, and otherwise with no word of a calculation by themselves
 * (since 13 October 2026, as the LD decay's review gave the diversity);
 * `live` is not read on popgen.html. Throws a defect on a project with
 * no variants file.
 */
export function refusalText(
  message: string,
  p: Project,
  page: PopDistsPage,
  live: boolean,
): string {
  if (p.variants === null) {
    throw defect("refusalText was given a project with no variants file.");
  }
  if (page === "popgen2") {
    const fileWords = fileRefusalText(message, p, {
      cannot: "the distances between populations cannot be calculated",
      where: IN_BOX_VARIANTS,
    });
    if (fileWords !== null) return fileWords;
    // Any other refusal ends with what happens after the change, once and
    // in the plural; the rows of their own end with their own words.
    const words = refusalWords(message, p, {
      change: `Change the settings, or open the variants file again${IN_BOX_VARIANTS}`,
      calculate: "calculate the distances between populations",
      nothingLeft:
        "there is no variant to calculate the distances between populations over",
      again: live ? THEN_AGAIN : "to run them again",
      emptyPass: (name) =>
        `The thresholds of the Variants tab kept none of the variants of ${name}, so there is no variant to calculate the distances between populations over. Loosen them.`,
    });
    return !live || words.endsWith(`${THEN_AGAIN}.`)
      ? words
      : `${words} ${AGAIN_BY_THEMSELVES}`;
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
 * The definition of the distances between populations on the page
 * `page`, as the store knows them: both lists of filters in their key,
 * and a `keptNeeds` that locks when the individuals kept leave no
 * population, or fewer than two with the minimum of individuals
 * (store.md, "The state of an analysis"); the same request and numbers
 * on both pages, with the populations and the words of the page.
 */
function definitionOf(page: PopDistsPage): AnalysisDef<Job, JobResult> {
  return Object.freeze({
    id: ID,
    app: Object.freeze(["popgen"] as const),
    defaults: POP_DISTS_DEFAULTS,
    keyVersion: 1,
    filtersRead: Object.freeze({ variants: true, individuals: true }),
    parseOptions,
    keyInputs: (p: Project) =>
      page === "popgen" ? keyInputs(p) : popgen2KeyInputs(p),
    needs: (p: Project) => (page === "popgen" ? needs(p) : popgen2Needs(p)),
    keptNeeds: (p: Project, kept: IndividualsKept) =>
      page === "popgen" ? keptNeeds(p, kept) : popgen2KeptNeeds(p, kept),
    run: (p: Project, c: WorkerClient<Job, JobResult>) => run(p, c, page),
    warnings: (result: JobResult, p: Project) => warnings(result, p, page),
    checkNumbers,
    // popgen2.html opens no project file, so it compares no numbers.
    numCheckNumbers: (p: Project) =>
      page === "popgen" ? numCheckNumbers(p) : null,
    // popgen2.html saves no project file and writes no report, so it
    // asks no script; one asked there is a defect, not the old page's.
    script: (p: Project) => {
      if (page === "popgen2") {
        throw defect(
          "the Python script of the distances was asked on popgen2.html, which writes none.",
        );
      }
      return script(p);
    },
  });
}

/** The distances of the old page, listed by POPGEN_ANALYSES of
    src/core/apps.ts. */
export const popDists: AnalysisDef<Job, JobResult> = definitionOf("popgen");

/** The distances of the Distances tab of popgen2.html, of the same id,
    listed last by POPGEN2_ANALYSES of src/core/apps.ts. */
export const popDistsOnPopgen2: AnalysisDef<Job, JobResult> =
  definitionOf("popgen2");

/** The populations to run on the page `page`. */
function populationsToRunOf(p: Project, page: PopDistsPage): Pops | null {
  return page === "popgen" ? populationsToRun(p) : popgen2PopulationsToRun(p);
}

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
 * What the key holds on popgen2.html: the populations of that page,
 * `popgen2Populations`, the minimum of individuals, and what the
 * warnings read beyond the populations, the column and the name of the
 * individuals file, so that a result is never shown with the words of
 * another file (popDists.md, "On popgen2.html").
 */
function popgen2KeyInputs(p: Project): JsonObject {
  return {
    pops: popgen2Populations(p),
    options: { minNumIndividuals: popDistsOptions(p).minNumIndividuals },
    words: {
      column: populationsColumnOf(p),
      individualsFile: p.individuals?.name ?? null,
    },
  };
}

/**
 * The first reason the distances of popgen2.html cannot run beyond those
 * the store asks of every analysis that reads the filters, or `null`:
 * the individuals file being read; fewer than two populations, the one
 * population of every individual among them, which greys the Distances
 * tab; fewer than two populations with the minimum of individuals among
 * every individual of the variants file. An individual of the variants
 * file not in the individuals file does not lock: it is unclassified.
 * Throws a defect on a project of association.
 */
function popgen2Needs(p: Project): string | null {
  const individuals = p.individuals;
  if (individuals?.read.kind === "pending") {
    return `The distances wait for ${escaped(individuals.name)} to be read.`;
  }
  if (p.grouping.kind === "roles") {
    throw defect("the distances were given a project of association.");
  }
  const toRun = popgen2PopulationsToRun(p);
  if (toRun === null || p.variants === null) {
    return null;
  }
  if (popgen2OnePopulationCause(p) !== null || toRun.length < 2) {
    return `${NEED_TWO} with individuals in ${escaped(p.variants.name)}. Choose a column of the populations in the box Individuals that gives them two or more.`;
  }
  const min = popDistsOptions(p).minNumIndividuals;
  const withMinimum = populationsWithMinimum(toRun, min).withMinimum;
  return withMinimum.length >= 2
    ? null
    : minimumText(
        withMinimum,
        min,
        "",
        `${LOWER_NEEDED}, or merge populations in ${PLACES.popgen2.individualsFile(p)}.`,
      );
}

/**
 * The reason the distances of popgen2.html cannot run for the
 * individuals kept, `kept`, or `null`: they leave none of the
 * populations of the column, the diversity's words of the page; they
 * leave one; or fewer than two of those they leave have the minimum,
 * which `popgen2Needs` found over every individual, so the thresholds
 * took them below it. `null` while the list is not known, and for the
 * one population, which `popgen2Needs` locks on first.
 */
function popgen2KeptNeeds(p: Project, kept: IndividualsKept): string | null {
  const noPopulation = popgen2PopulationsKeptNeeds(p, kept);
  if (noPopulation !== null) {
    return noPopulation;
  }
  const list = kept.list.kind === "known" ? kept.list.individuals : null;
  // The store asks this only of an analysis `popgen2Needs` does not
  // lock, and it locks on the one population first, so through the store
  // this guard changes nothing, as the mutation that drops it showed in
  // the review of the Distances tab (12 October 2026); it keeps a direct
  // call from naming the one population as left by the thresholds.
  if (list === null || popgen2OnePopulationCause(p) !== null) {
    return null;
  }
  const left = popgen2PopulationsKept(p, list);
  if (left === null) {
    return null;
  }
  const [onlyLeft] = left.pops;
  if (left.pops.length === 1 && onlyLeft !== undefined) {
    return `The thresholds of the individuals leave one population, ${namesOf([onlyLeft[0]])}, and the distances need two or more. Loosen ${PLACES.popgen2.individualFilters}.`;
  }
  const min = popDistsOptions(p).minNumIndividuals;
  const withMinimum = populationsWithMinimum(left.pops, min).withMinimum;
  return withMinimum.length >= 2
    ? null
    : minimumText(
        withMinimum,
        min,
        " among the individuals the thresholds keep",
        `${LOWER_NEEDED}, merge populations in ${PLACES.popgen2.individualsFile(p)}, or loosen ${PLACES.popgen2.individualFilters}.`,
      );
}

/**
 * The first reason the distances cannot run beyond those the store asks
 * of every analysis that reads the filters, or `null`: the individuals
 * file, the column of the populations and the lists leaving no
 * population, as for the diversity; no metadata file, or the grouping
 * `onePopulation`, which give one population; a column that gives the
 * individuals of the variants file one population; the lists of
 * individuals to keep and to remove leaving an individual to one
 * population alone; and fewer than two populations with the minimum of
 * individuals among the two or more those lists leave. Throws a defect on a project of
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

/** The reason when the lists to keep and to remove leave one population,
    which names the lists and not the minimum, since the others have no
    individual; the reason when fewer than two of the populations they
    leave have the minimum of individuals, with the lists named when they
    took a population below it; or `null`. */
function minimumNeeds(p: Project): string | null {
  const toRun = populationsToRun(p);
  const byLists = populationsByLists(p);
  if (toRun === null || byLists === null) {
    return null;
  }
  const [onlyLeft] = byLists;
  if (byLists.length === 1 && onlyLeft !== undefined) {
    return onePopulationLeftText(
      "lists",
      onlyLeft[0],
      "Change the lists in the Variants step.",
    );
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
    ? `${LOWER_THE_MINIMUM}, merge populations in the metadata file, or change the lists of individuals in the Variants step.`
    : `${LOWER_THE_MINIMUM}, or merge populations in the metadata file.`;
  return minimumText(withMinimum, min, "", end);
}

/** The start of the advice of a lock by the minimum, which names the
    field as its label does, "Individuals with a called genotype needed in
    each population, per variant", and says where it is, above the Run
    button. */
const LOWER_THE_MINIMUM = "Lower the number of individuals needed, above";

/** What to do when the minimum is too high, on popgen2.html, which names
    the field by one name throughout, "the individuals needed per
    variant" (the review of the Distances tab, 12 October 2026), and the
    section "Parameters" it is in, which may be closed (the owner, 16
    October 2026). */
const LOWER_NEEDED = `Lower the individuals needed per variant in ${PARAMETERS}`;

/**
 * The minimum of individuals of the distances as popgen2.html names it in
 * its lines, its locks and its warnings, after its field, "Individuals
 * with a called genotype needed in each population, per variant": "the
 * 20 individuals needed per variant". The old page says "the minimum of
 * 20" (the review of the Distances tab, 12 October 2026).
 */
export function neededPerVariant(minNumIndividuals: number): string {
  return `the ${counted(minNumIndividuals, "individual")} needed per variant`;
}

/** The words of a lock when the lists of individuals, or the filters of
    individuals, `what`, leave an individual to the one population `pop`:
    the others have none, so the minimum is not named, and `end` says
    what to do. */
function onePopulationLeftText(
  what: "lists" | "filters",
  pop: string,
  end: string,
): string {
  return `The ${what} of individuals leave one population, ${namesOf([pop])}, and the distances need two or more. ${end}`;
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
 * it leaves one, in words that name the filters of individuals; or it
 * leaves fewer than two populations with the minimum of individuals.
 * `null` while the list is not known, and for the one
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
  const [onlyLeft] = left.pops;
  if (left.pops.length === 1 && onlyLeft !== undefined) {
    return onePopulationLeftText(
      "filters",
      onlyLeft[0],
      "Loosen the filters of individuals in the Variants step.",
    );
  }
  const min = popDistsOptions(p).minNumIndividuals;
  const withMinimum = populationsWithMinimum(left.pops, min).withMinimum;
  return withMinimum.length >= 2
    ? null
    : minimumText(
        withMinimum,
        min,
        " among the individuals the filters keep",
        `${LOWER_THE_MINIMUM}, merge populations in the metadata file, or loosen the filters of individuals in the Variants step.`,
      );
}

/** Builds the request, with the individuals the filters keep that the
    store gives through `c`, the populations of the page `page`, those
    under the minimum sent apart as `leftOut`, and sends it through `c`. Throws a defect when the
    variants file is not read or fewer than two populations have the
    minimum, which `needs` and `keptNeeds` rule out. */
function run(
  p: Project,
  c: WorkerClient<Job, JobResult>,
  page: PopDistsPage,
): Run<JobResult> {
  const kept =
    page === "popgen"
      ? populationsKept(p, c.individuals)
      : popgen2PopulationsKept(p, c.individuals);
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
    filters: jobFilters(filtersApplied(p)),
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
 * variant; the pairs with variants and no Fst; the pairs over fewer
 * variants than the filters kept; the pairs
 * with a negative distance; Jost's D at ploidy 1. Throws a defect on a
 * project whose variants file is not read, and on a project of
 * association.
 */
function warnings(
  result: JobResult,
  p: Project,
  page: PopDistsPage,
): readonly Warning[] {
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
      text: tooFewText(r, p, min, page),
    });
  }
  const accounted = [...r.pops, ...r.leftOut.map(([pop]) => pop)];
  if (page === "popgen") {
    found.push(...populationWarnings(accounted, p, POP_DISTS_WORDS));
  } else {
    // An unclassified individual is no fault on popgen2.html, whose tab
    // says how many are left out.
    const notInResult = populationNotInResult(
      accounted,
      popgen2PopulationsToRun(p) ?? [],
      escaped(variants.name),
      POP_DISTS_WORDS.notIn,
    );
    found.push(...(notInResult === null ? [] : [notInResult]));
  }
  const pairs = pairsOf(r);
  const withoutDistance = pairs.filter((pair) => pair.numVars === 0);
  if (withoutDistance.length > 0) {
    found.push({
      code: "pairWithoutDistance",
      text: withoutDistanceText(withoutDistance, min),
    });
  }
  const withoutFst = pairs.filter(
    (pair) => pair.numVars > 0 && Number.isNaN(pair.fst),
  );
  if (withoutFst.length > 0) {
    found.push({
      code: "fstWithoutValue",
      text: withoutFstText(withoutFst),
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
    found.push({ code: "negativeDistance", text: negativeText(negative, r) });
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
    individuals from one of them, as the diversity finds it, in the words
    of the page `page`. */
function tooFewText(
  r: PopDistsResult,
  p: Project,
  min: number,
  page: PopDistsPage,
): string {
  const { individualsFile, individualFilters } = PLACES[page];
  const toRun = populationsToRunOf(p, page);
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
  if (page === "popgen2") {
    return tooFewOnPopgen2(r, min, names, filtered, individualsFile(p));
  }
  const [only] = r.leftOut;
  if (r.leftOut.length === 1 && only !== undefined) {
    const merge = `merge it with another population in ${individualsFile(p)}`;
    const include = filtered
      ? `lower the minimum of individuals, ${merge}, or loosen ${individualFilters}`
      : `lower the minimum of individuals, or ${merge}`;
    return `Population ${names} has ${counted(only[1], "individual")}, fewer than the minimum of ${grouped(min)}, so it is left out of the distances. To include it, ${include}.`;
  }
  const counts =
    r.leftOut.length <= MAX_NAMED
      ? `, ${bothOf(r.leftOut.map(([, numIndividuals]) => grouped(numIndividuals)))}`
      : "";
  const merge = `merge each with another population in ${individualsFile(p)}`;
  const include = filtered
    ? `lower the minimum of individuals, ${merge}, or loosen ${individualFilters}`
    : `lower the minimum of individuals, or ${merge}`;
  return `Populations ${names} have fewer than ${counted(min, "individual")}${counts}, so they are left out of the distances. To include them, ${include}.`;
}

/** The text of `tooFewIndividuals` on popgen2.html, which names the
    minimum as its field does, `neededPerVariant`, for the populations of
    `r.leftOut`, named `names`, offering to loosen the thresholds of the
    individuals when they took individuals from one of them, `filtered`,
    and to merge populations in the individuals file `file`. */
function tooFewOnPopgen2(
  r: PopDistsResult,
  min: number,
  names: string,
  filtered: boolean,
  file: string,
): string {
  const needed = neededPerVariant(min);
  const lower = "lower the individuals needed per variant";
  const loosen = `, or loosen ${PLACES.popgen2.individualFilters}`;
  const [only] = r.leftOut;
  if (r.leftOut.length === 1 && only !== undefined) {
    const merge = `merge it with another population in ${file}`;
    const include = filtered
      ? `${lower}, ${merge}${loosen}`
      : `${lower}, or ${merge}`;
    return `Population ${names} has ${counted(only[1], "individual")}, fewer than ${needed}, so it is left out of the distances. To include it, ${include}.`;
  }
  const fewer =
    r.leftOut.length <= MAX_NAMED
      ? `${bothOf(r.leftOut.map(([, numIndividuals]) => grouped(numIndividuals)))} individuals, fewer than ${needed}`
      : `fewer individuals than ${needed}`;
  const merge = `merge each with another population in ${file}`;
  const include = filtered
    ? `${lower}, ${merge}${loosen}`
    : `${lower}, or ${merge}`;
  return `Populations ${names} have ${fewer}, so they are left out of the distances. To include them, ${include}.`;
}

/** The text of `pairWithoutDistance`, for its pairs. */
function withoutDistanceText(pairs: readonly Pair[], min: number): string {
  // At a minimum of 0 or 1 a variant counts where both have one called
  // genotype, and "0 individuals with a called genotype" says nothing.
  const both =
    min <= 1
      ? "a called genotype"
      : `${counted(min, "individual")} with a called genotype`;
  const rule = `no variant at which both have ${both}`;
  const [only] = pairs;
  if (pairs.length === 1 && only !== undefined) {
    return `${pairName(only)} have ${rule}, so the pair has no distance.`;
  }
  // A list of pairs of three or fewer is closed by a comma, since its
  // last pair holds an "and".
  const close = pairs.length <= MAX_NAMED ? "," : "";
  return `The pairs ${pairsNamed(pairs)}${close} have ${rule}, so they have no distance.`;
}

/** The text of `fstWithoutValue`, for its pairs, which counted variants
    and have no Hudson's Fst: popnei gives none where its divisor is 0,
    the two populations sharing one allele at every variant counted for
    them. */
function withoutFstText(pairs: readonly Pair[]): string {
  const rule = "share one allele at every variant counted for them";
  const [only] = pairs;
  if (pairs.length === 1 && only !== undefined) {
    return `${pairName(only)} ${rule}, so ${MEASURE_NAMES.fst} has no value (0/0).`;
  }
  const close = pairs.length <= MAX_NAMED ? "," : "";
  return `The pairs ${pairsNamed(pairs)}${close} ${rule}, so ${MEASURE_NAMES.fst} has no value for them (0/0).`;
}

/** The text of `pairsOnFewerVariants`, for its pairs, of `numPairs` in
    the result, over fewer than the `numVars` variants the filters kept;
    when they are every pair of several, "All 6 pairs", with no clause of
    the other variants. */
function onFewerText(
  pairs: readonly Pair[],
  numPairs: number,
  numVars: number,
  min: number,
): string {
  const kept = `the ${grouped(numVars)} variants kept`;
  // At a minimum of 0 or 1 a variant is lost only where a population has
  // nothing called.
  const short =
    min <= 1
      ? "no called genotype"
      : `fewer than ${counted(min, "individual")} with a called genotype`;
  const others = `at the others, one of the two populations has ${short}.`;
  const fewest = pairs.reduce((least, pair) =>
    pair.numVars < least.numVars ? pair : least,
  );
  const share = percentOf(fewest.numVars, numVars);
  if (pairs.length === 1) {
    return `The pair ${pairName(fewest)} is over ${grouped(fewest.numVars)} of ${kept} (${share}): ${others}`;
  }
  const downTo = `are over fewer than ${kept}, down to ${grouped(fewest.numVars)} (${share}) for ${pairName(fewest)}`;
  return pairs.length === numPairs
    ? `All ${grouped(numPairs)} pairs ${downTo}.`
    : `${grouped(pairs.length)} of the ${grouped(numPairs)} pairs ${downTo}: ${others}`;
}

/**
 * The text of `negativeDistance`, for its pairs of the result `r`, naming
 * only the measures that are negative in one of them. Its last sentence
 * says what the heatmap does with them: that it orders them as if the
 * distance were 0 when a heatmap is drawn, `POP_DISTS_MAX_SHOWN`
 * populations or fewer, and a measure it names is ordered by similarity;
 * that it shows the value when every measure it names keeps the order of
 * the file; and nothing when no heatmap is drawn.
 */
function negativeText(pairs: readonly Pair[], r: PopDistsResult): string {
  const fst = pairs.some((pair) => pair.fst < 0);
  const dest = pairs.some((pair) => pair.dest < 0);
  const [only] = pairs;
  const one = pairs.length === 1 && only !== undefined;
  const bySimilarity =
    (fst && r.order.fst.kind === "pcoa") ||
    (dest && r.order.dest.kind === "pcoa");
  const shows = `shows the ${one ? "value" : "values"}.`;
  const heatmap =
    r.pops.length > POP_DISTS_MAX_SHOWN
      ? ""
      : bySimilarity
        ? ` The heatmap orders them as if the distance were 0, and ${shows}`
        : ` The heatmap ${shows}`;
  if (one) {
    const values = [
      ...(fst ? [`${MEASURE_NAMES.fst}, ${fourDecimals(only.fst)}`] : []),
      ...(dest ? [`${MEASURE_NAMES.dest}, ${fourDecimals(only.dest)}`] : []),
    ];
    return `${pairName(only)} have a negative ${values.join(", and ")}: the variants cannot tell the two apart.${heatmap}`;
  }
  const measures = [
    ...(fst ? [MEASURE_NAMES.fst] : []),
    ...(dest ? [MEASURE_NAMES.dest] : []),
  ].join(" or ");
  return `${grouped(pairs.length)} pairs have a negative ${measures}, ${pairsNamed(pairs)}: the variants cannot tell their two populations apart.${heatmap}`;
}

/** A pair in words, "p0 and p3". */
export function pairName(pair: Pair): string {
  return `${namesOf([pair.first])} and ${namesOf([pair.second])}`;
}

/** Several pairs in words: up to three, "p0 and p3, and p1 and p3", a
    comma before the last since each pair holds an "and"; more, the first
    two and how many more, "p0 and p3, p1 and p3 and 4 more". */
export function pairsNamed(pairs: readonly Pair[]): string {
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
export function pairsOf(r: PopDistsResult): readonly Pair[] {
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
 * out, and those left empty at a minimum of 0; the call; the table of
 * the pairs; and the order of the heatmap of each measure, by the six
 * steps of the calculation worker (popDists.md, "The order of the
 * heatmap"), so that the lines print an order wherever the application
 * shows one. Throws a defect on a project with no column of the
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
  const minimum = popDistsOptions(p).minNumIndividuals;
  const min = String(minimum);
  // A population left empty, which popnei refuses, is left out at a
  // minimum of 0 too.
  const atLeast = String(Math.max(minimum, 1));
  return [
    `# The distances between populations, from the column ${name}`,
    "pops = {}",
    `for individual, pop in zip(individuals.iloc[:, 0], individuals[${name}]):`,
    "    if not pandas.isna(pop):",
    "        pops.setdefault(pop, []).append(individual)",
    "kept = set(variants.individuals)",
    "pops = {pop: [i for i in names if i in kept] for pop, names in pops.items()}",
    `pops = {pop: names for pop, names in pops.items() if len(names) >= ${atLeast}}`,
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
    "# The order of the heatmap of each measure. It is the order of the metadata",
    "# file for two populations, with a pair of no distance, when no distance is",
    "# above 0, and when popnei cannot place the populations; otherwise the first",
    "# axis of the principal coordinates of the distances, a negative one taken as",
    "# 0 and Lingoes' correction applied.",
    'for name, measure in [("fst_hudson", dists.fst), ("jost_d", dists.dest)]:',
    "    values = measure.dist_vector.clip(min=0)",
    "    order = list(dists.pops)",
    "    if len(order) > 2 and not pandas.isna(values).any() and values.any():",
    "        try:",
    "            corrected = popnei.correct_dists_by_lingoes(",
    "                popnei.Distances(dist_vector=values, names=measure.names)",
    "            )",
    "            first = popnei.do_pcoa(corrected.dists).projections.iloc[:, 0]",
    '            order = first.sort_values(kind="stable").index.tolist()',
    "        except ValueError:",
    "            pass",
    "    print(name, order)",
  ]
    .map((line) => `${line}\n`)
    .join("");
}

/** The most populations the panel draws the heatmap and the table for:
    `MAX_HEATMAP_NAMES` of src/charts/limits.ts, which core does not
    import, so a test of src/ui/analyses/popDists/ checks that the two are
    equal. */
export const POP_DISTS_MAX_SHOWN = 200;

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
export function valueAt(values: ArrayLike<number>, i: number): number {
  const value = values[i];
  if (value === undefined) {
    throw defect(`the result of the distances has no pair ${String(i)}.`);
  }
  return value;
}
