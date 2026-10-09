/**
 * The principal components of the individuals, a PCA of the genotypes or
 * a PCoA of the Kosman distances: its options, the filters of the
 * variants its job carries, when it cannot run, the request it sends, its
 * warnings, its check numbers, its lines of the Python script, and the
 * words of its error state (docs/specs/analyses/pca.md, "The module").
 *
 * It gives the panel what it reads of a result as well: how the
 * individuals are coloured, the columns that can colour them, the
 * components drawn, the rows of the table and the CSV files, the
 * description a screen reader reads, and the note of the individuals with
 * many missing genotypes (docs/specs/analyses/pca.md, "The colours", "The
 * note of the missing genotypes" and "The panel").
 *
 * Every number of a result is popnei's, from one call of
 * `doPcaFromVariants` or `doPcoaFromVariants` in the calculation worker;
 * the arithmetic of this module is in the warning of Lingoes' correction,
 * which says how large the correction was beside the distances, and in
 * the description, which gives the mean of the projections of each group.
 */

import type { IndividualStats, IndividualsKept } from "../individualsKept.ts";
import type { JsonObject } from "../keys.ts";
import {
  MAX_LD_DIST,
  ONE_POPULATION,
  VARIANT_FILTER_ORDER,
  counted,
  escaped,
  grouped,
  individualsNeeds,
  jobFilters,
  namesOf,
  populationsNeeds,
  populationsOf,
  shown,
  thresholdIsOff,
  variantFilterNeeds,
} from "../project.ts";
import { filtersApplied } from "../filtersApplied.ts";
import type {
  Grouping,
  IndividualsSource,
  Project,
  ProjectVariantFilter,
  VariantSource,
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
  STEP_LD_FILTER,
  csvField,
  defect,
  emptySourceText,
  ldOrderText,
  pythonOpenVariants,
  refusalWords,
} from "./words.ts";
import type { LdFilterWords } from "./words.ts";
import { cellNumber } from "../../worker/individuals/columnTypes.ts";
import type {
  Cell,
  IndividualsTable,
  Job,
  JobResult,
  PcaMethod,
  PcaResult,
  Run,
} from "../../worker/protocol.ts";

/** The id of the analysis. */
const ID = "pca";

/** The page a function is for, which picks the rule of the filters, the
    defaults and the words: the old page, popgen.html, or popgen2.html
    (docs/specs/analyses/pca.md, "On popgen2.html"). A page given by the
    caller, rather than read from the project, keeps the project free of
    which page made it. */
export type PcaPage = "popgen" | "popgen2";

/** The options of the PCA. Each of its three filters follows the Variants
    step of the old page, or the Variants tab of popgen2.html, while
    `follow` is true, and keeps its values meanwhile, for when the user
    sets it for the PCA again; on popgen2.html an LD filter that follows
    is no LD pruning, since the Variants tab has none. */
export interface PcaOptions {
  /** The PCA of the genotypes, or the PCoA of the Kosman distances. */
  readonly method: PcaMethod;
  /** The PCA's missing data filter: whether it follows the Variants step
      or tab, and its largest proportion of missing genotypes. */
  readonly missingData: {
    readonly follow: boolean;
    readonly maxAllowedMissingRate: number;
  };
  /** The PCA's MAF filter: whether it follows the Variants step or tab,
      and its largest major allele frequency. */
  readonly maf: { readonly follow: boolean; readonly maxAllowedMaf: number };
  /** The PCA's LD filter: whether it follows the Variants step or tab,
      its largest r², and its window in base pairs, `null` until the user
      types one. */
  readonly ld: {
    readonly follow: boolean;
    readonly maxAllowedR2: number;
    readonly maxDist: number | null;
  };
  /** The column of the individuals file whose values colour the points,
      or `null` for the populations of the grouping. */
  readonly colourBy: string | null;
  /** The three components drawn, from 1. */
  readonly axes: readonly [number, number, number];
  /** The view the panel draws. */
  readonly view: "3d" | "2d";
}

/**
 * The options of a PCA the user has not changed: the PCA of the
 * genotypes; its three filters following the Variants step, each keeping
 * the value it starts at when the user sets it for the PCA, the missing
 * data at 0.1 and the MAF at 0.95, the values the Variants step turns its
 * filters on at, and the LD at r² 0.1 with no distance, as the owner
 * decided on 27 and 28 September 2026; coloured by the populations; the
 * first three components; the 3D view, as the owner decided on 28
 * September 2026.
 */
export const PCA_DEFAULTS: PcaOptions = deepFrozen({
  method: "pca",
  missingData: { follow: true, maxAllowedMissingRate: 0.1 },
  maf: { follow: true, maxAllowedMaf: 0.95 },
  ld: { follow: true, maxAllowedR2: 0.1, maxDist: null },
  colourBy: null,
  axes: [1, 2, 3],
  view: "3d",
});

/**
 * The options of a PCA the user has not changed on popgen2.html: those of
 * the old page, but for the LD pruning, which starts on, at r² 0.1 with no
 * distance, so that the PCA is locked until the user types one or turns
 * it off: the owner's numbers of 27 September 2026, and the rule of no
 * default that depends on the genome (docs/specs/analyses/pca.md, "On
 * popgen2.html").
 */
export const PCA2_DEFAULTS: PcaOptions = deepFrozen({
  method: "pca",
  missingData: { follow: true, maxAllowedMissingRate: 0.1 },
  maf: { follow: true, maxAllowedMaf: 0.95 },
  ld: { follow: false, maxAllowedR2: 0.1, maxDist: null },
  colourBy: null,
  axes: [1, 2, 3],
  view: "3d",
});

/** The components a result keeps, the writers' decision of 27 September
    2026: the projections of every component at 9,381 individuals would
    take 704 MB, above the bound of the cache. */
export const PCA_NUM_COMPS_KEPT = 10;

/** popnei's limit, the same for both methods: the individuals of the file
    for the PCA, those of the known list of the individuals kept for the
    PCoA (docs/specs/analyses/pca.md, "Why it cannot run"). */
export const PCA_MAX_INDIVIDUALS = 9381;

/** The memory a calculation that stopped with no answer needed, from
    which its words say it was the memory: 250 MB, below which no browser
    of a computer was expected to refuse it. */
export const PCA_MEMORY_WORDS_BYTES = 250_000_000;

/** The memory of the principal components for each cell of the
    individuals × individuals matrix, in bytes: popnei's count for the
    PCA, which it gives the PCoA as well. */
const BYTES_PER_CELL = 48.8;

/** The options as a JSON object, for the store and the project. */
function optionsJson(o: PcaOptions): JsonObject {
  return {
    method: o.method,
    missingData: {
      follow: o.missingData.follow,
      maxAllowedMissingRate: o.missingData.maxAllowedMissingRate,
    },
    maf: { follow: o.maf.follow, maxAllowedMaf: o.maf.maxAllowedMaf },
    ld: {
      follow: o.ld.follow,
      maxAllowedR2: o.ld.maxAllowedR2,
      maxDist: o.ld.maxDist,
    },
    colourBy: o.colourBy,
    axes: [...o.axes],
    view: o.view,
  };
}

/** What the options should be, the end of "‹the field› should be ‹…›" of
    `projectErrorText`. */
const OPTIONS_EXPECTED =
  'the method, "pca" or "pcoa"; the missing data filter of the PCA, whether it follows the Variants step, true or false, and its maximum proportion of missing genotypes, a number from 0 to 1; its MAF filter, whether it follows the Variants step, true or false, and its maximum major allele frequency, a number from 0 to 1; its LD filter, whether it follows the Variants step, true or false, its maximum r², a number from 0 to 1, and its window, a whole number of base pairs from 1 to 9,007,199,254,740,991 or null; the column that colours the points, a text or null; three different components from 1 to 10 for the axes; and the view, "3d" or "2d"; and nothing else';

/** The options the project holds, as `readOptions` read them, so that the
    same options give the same object, and `pcaFilters` finds its list. */
const READ = new WeakMap<JsonObject, PcaOptions>();

/** The options of the project for the PCA, or the defaults of the page
    `page`, PCA_DEFAULTS or PCA2_DEFAULTS. Throws a defect on options
    `parseOptions` would refuse, which no command puts into a project. */
export function pcaOptions(p: Project, page: PcaPage): PcaOptions {
  const stored = p.analyses.find((a) => a.analysis === ID)?.options;
  if (stored === undefined) {
    return page === "popgen" ? PCA_DEFAULTS : PCA2_DEFAULTS;
  }
  const known = READ.get(stored);
  if (known !== undefined) {
    return known;
  }
  const read = readOptions(stored);
  if (!read.ok) {
    throw defect("the project holds options of the PCA it refuses.");
  }
  READ.set(stored, read.value);
  return read.value;
}

/**
 * Checks the options of the PCA read from a project file, or sent by the
 * panel, and gives them back as an object of exactly the seven fields of
 * `PcaOptions`, in the ranges popnei's filters accept (docs/specs/analyses/
 * pca.md, "Its options"). Every version of the format reads them in the
 * same way, so the version the store passes is not read.
 */
function parseOptions(options: unknown): Result<JsonObject, string> {
  const read = readOptions(options);
  return read.ok ? { ok: true, value: optionsJson(read.value) } : read;
}

/** The options read from `options`, frozen, or what they should be. */
function readOptions(options: unknown): Result<PcaOptions, string> {
  const refused = { ok: false, error: OPTIONS_EXPECTED } as const;
  const fields = fieldsOf(options, [
    "method",
    "missingData",
    "maf",
    "ld",
    "colourBy",
    "axes",
    "view",
  ]);
  if (fields === null) {
    return refused;
  }
  const [method, missingDataField, mafField, ldField, colourBy, axes, view] =
    fields;
  const missingData = fieldsOf(missingDataField, [
    "follow",
    "maxAllowedMissingRate",
  ]);
  const maf = fieldsOf(mafField, ["follow", "maxAllowedMaf"]);
  const ld = fieldsOf(ldField, ["follow", "maxAllowedR2", "maxDist"]);
  if (
    (method !== "pca" && method !== "pcoa") ||
    missingData === null ||
    maf === null ||
    ld === null ||
    (colourBy !== null && typeof colourBy !== "string") ||
    (view !== "3d" && view !== "2d")
  ) {
    return refused;
  }
  const [missingFollow, maxAllowedMissingRate] = missingData;
  const [mafFollow, maxAllowedMaf] = maf;
  const [ldFollow, maxAllowedR2, maxDist] = ld;
  const components = axesOf(axes);
  if (
    typeof missingFollow !== "boolean" ||
    !isShare(maxAllowedMissingRate) ||
    typeof mafFollow !== "boolean" ||
    !isShare(maxAllowedMaf) ||
    typeof ldFollow !== "boolean" ||
    !isShare(maxAllowedR2) ||
    !(maxDist === null || isDistance(maxDist)) ||
    components === null
  ) {
    return refused;
  }
  return {
    ok: true,
    value: deepFrozen({
      method,
      missingData: { follow: missingFollow, maxAllowedMissingRate },
      maf: { follow: mafFollow, maxAllowedMaf },
      ld: { follow: ldFollow, maxAllowedR2, maxDist },
      colourBy,
      axes: components,
      view,
    }),
  };
}

/** The values of the fields `names` of `value`, in that order, when it is
    an object of exactly those fields; `null` otherwise. */
function fieldsOf(value: unknown, names: readonly string[]): unknown[] | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const own = Object.keys(value);
  if (
    own.length !== names.length ||
    !names.every((name) => Object.hasOwn(value, name))
  ) {
    return null;
  }
  return names.map((name): unknown => Reflect.get(value, name));
}

/** Whether `value` is a number from 0 to 1. */
function isShare(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

/** Whether `value` is a window of the LD filter popnei's `filterByLd`
    accepts, a whole number from 1 to 2^53 − 1. */
function isDistance(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_LD_DIST
  );
}

/** The axes of `value`, three different whole numbers from 1 to
    `PCA_NUM_COMPS_KEPT`, or `null`. */
function axesOf(value: unknown): readonly [number, number, number] | null {
  if (!Array.isArray(value) || value.length !== 3) {
    return null;
  }
  const components: readonly unknown[] = value;
  const [first, second, third] = components;
  const isComponent = (component: unknown): component is number =>
    typeof component === "number" &&
    Number.isInteger(component) &&
    component >= 1 &&
    component <= PCA_NUM_COMPS_KEPT;
  if (
    !isComponent(first) ||
    !isComponent(second) ||
    !isComponent(third) ||
    first === second ||
    first === third ||
    second === third
  ) {
    return null;
  }
  return [first, second, third];
}

/** The lists `pcaFilters` made, by the page, then by the project's
    filters and then by the options, so that the same inputs give the same
    array and one page never gets the other's list. */
const FILTERS: Readonly<
  Record<
    PcaPage,
    WeakMap<
      readonly ProjectVariantFilter[],
      WeakMap<PcaOptions, readonly ProjectVariantFilter[]>
    >
  >
> = Object.freeze({ popgen: new WeakMap(), popgen2: new WeakMap() });

/**
 * The filters of the job: the project's filters on, in their fixed order,
 * with the PCA's own of each kind, missing data, MAF and LD, by the rule of
 * the page `page` (docs/specs/analyses/pca.md, "Which variants it reads"
 * and "On popgen2.html"). On the old page, the PCA's own filter is in the
 * place of the dataset's, or in the place of its kind when the dataset
 * has none. On popgen2.html, the PCA's own missing data and MAF filters
 * narrow the Variants tab's: each is given with the smaller of its value
 * and the Variants tab's, which keeps exactly the variants the two filters
 * one after the other would, but for a value of 1 while the Variants
 * tab has that filter off, which is no filter, as a threshold at 1 is off
 * in the Variants tab; its LD filter keeps the old rule. On both, a
 * filter that follows puts nothing of its own in the list, the FILTER
 * column and the observed heterozygosity are always the dataset's, and an
 * LD filter with no distance is copied as it is, which `needs` locks on.
 * The same frozen value for the same inputs.
 */
export function pcaFilters(
  filters: readonly ProjectVariantFilter[],
  o: PcaOptions,
  page: PcaPage,
): readonly ProjectVariantFilter[] {
  const byFilters = FILTERS[page];
  let byOptions = byFilters.get(filters);
  if (byOptions === undefined) {
    byOptions = new WeakMap();
    byFilters.set(filters, byOptions);
  }
  const known = byOptions.get(o);
  if (known !== undefined) {
    return known;
  }
  const made = Object.freeze(
    VARIANT_FILTER_ORDER.flatMap((kind): ProjectVariantFilter[] => {
      const dataset = filters.find((filter) => filter.kind === kind);
      const own =
        page === "popgen"
          ? ownFilter(kind, o)
          : stricterFilter(kind, o, dataset);
      if (own !== null) {
        return [own];
      }
      return dataset === undefined ? [] : [dataset];
    }),
  );
  byOptions.set(o, made);
  return made;
}

/**
 * The PCA's own filter of the kind `kind` on popgen2.html, or `null` while
 * it follows the Variants tab: the missing data and the MAF given the
 * smaller of the PCA's value and the Variants tab's, the stricter, when
 * the Variants tab has that filter on, `dataset`, and the PCA's value
 * alone when it has it off, but `null` for a value of `THRESHOLD_OFF_AT`
 * then, which "Stricter for the PCA" starts at and which is off in the
 * Variants tab, so that the choice alone changes no key
 * (docs/specs/steps/popgen2-pca.md, "Its filters"); the LD filter, the
 * FILTER column and the observed heterozygosity as `ownFilter` gives
 * them.
 */
function stricterFilter(
  kind: ProjectVariantFilter["kind"],
  o: PcaOptions,
  dataset: ProjectVariantFilter | undefined,
): ProjectVariantFilter | null {
  switch (kind) {
    case "missing_data": {
      if (o.missingData.follow) {
        return null;
      }
      const own = o.missingData.maxAllowedMissingRate;
      if (dataset === undefined && thresholdIsOff(own)) {
        return null;
      }
      return Object.freeze({
        kind,
        maxAllowedMissingRate:
          dataset?.kind === "missing_data"
            ? Math.min(own, dataset.maxAllowedMissingRate)
            : own,
      });
    }
    case "maf": {
      if (o.maf.follow) {
        return null;
      }
      const own = o.maf.maxAllowedMaf;
      if (dataset === undefined && thresholdIsOff(own)) {
        return null;
      }
      return Object.freeze({
        kind,
        maxAllowedMaf:
          dataset?.kind === "maf" ? Math.min(own, dataset.maxAllowedMaf) : own,
      });
    }
    case "ld":
    case "passed":
    case "obs_het":
      return ownFilter(kind, o);
  }
}

/** The PCA's own filter of the kind `kind`, or `null` while it follows
    the Variants step, and for the FILTER column and the observed
    heterozygosity, which the PCA has none of. */
function ownFilter(
  kind: ProjectVariantFilter["kind"],
  o: PcaOptions,
): ProjectVariantFilter | null {
  switch (kind) {
    case "missing_data":
      return o.missingData.follow
        ? null
        : Object.freeze({
            kind,
            maxAllowedMissingRate: o.missingData.maxAllowedMissingRate,
          });
    case "maf":
      return o.maf.follow
        ? null
        : Object.freeze({ kind, maxAllowedMaf: o.maf.maxAllowedMaf });
    case "ld":
      return o.ld.follow
        ? null
        : Object.freeze({
            kind,
            maxAllowedR2: o.ld.maxAllowedR2,
            maxDist: o.ld.maxDist,
          });
    case "passed":
    case "obs_het":
      return null;
  }
}

/** The PCA's own LD filter, in the words of a refusal. */
const PCA_LD_FILTER: LdFilterWords = Object.freeze({
  name: "The LD filter of the PCA",
  openAgain: "load it again",
  turnOff: "set the LD filter of the PCA back to as in the Variants step",
});

/** The LD pruning of popgen2.html's PCA, named by the method `name`,
    "PCA" or "PCoA", in the words of a refusal, as the reason of the
    pruning with no distance names it; the Variants tab has none, and the
    file is opened again in the box Variants file. */
function pca2LdPruning(name: string): LdFilterWords {
  return {
    name: `The LD pruning of the ${name}`,
    openAgain: "open it again in the box Variants file",
    turnOff: "turn the LD pruning off",
  };
}

/** The places a sentence of the module names, by the page: the old page
    names its Variants step and the filters of individuals there,
    popgen2.html its Variants tab, the thresholds of the individuals there
    and the box Variants file (docs/specs/steps/popgen2-pca.md, "Its
    words"). */
interface PlaceWords {
  /** The filters of individuals, after "with". */
  readonly individualFilters: string;
  /** The filters of individuals in the words of the PCoA's limit, which
      the lock of Run gives (docs/specs/steps/popgen2-pca.md, "Run and
      Stop"). */
  readonly limitFilters: string;
  /** The filters of the variants, after "with". */
  readonly variantFilters: string;
  /** Where the variants file is opened again, after "If it stops
      again,": "load panel.nei again in the Variants step". */
  readonly openAgain: (fileName: string) => string;
  /** The end of the line of the LD pruning with no distance, after "or". */
  readonly pruningOff: (name: string) => string;
}

/** The places of each page. */
const PLACES: Readonly<Record<PcaPage, PlaceWords>> = Object.freeze({
  popgen: Object.freeze({
    individualFilters: "the filters of individuals in the Variants step",
    limitFilters: "the filters of individuals in the Variants step",
    variantFilters: "the filters of the Variants step",
    openAgain: (fileName: string) =>
      `load ${fileName} again in the Variants step`,
    pruningOff: (name: string) =>
      `set the LD pruning of the ${name} back to as in the Variants step`,
  }),
  popgen2: Object.freeze({
    individualFilters: "the thresholds of the individuals in the Variants tab",
    limitFilters: "the filters of individuals in the Variants tab",
    variantFilters: "the filters of the Variants tab",
    openAgain: (fileName: string) =>
      `open ${fileName} again in the box Variants file`,
    pruningOff: () => "turn the LD pruning off",
  }),
});

/** The reason of the analysis's own LD pruning with no distance, named
    by the method `name`, "PCA" or "PCoA", as the choice "For the PCoA
    alone" is (docs/specs/analyses/pca.md, "Why it cannot run"), with the
    way out of the page `page`. */
function pruningDistanceText(name: string, page: PcaPage): string {
  return `The LD pruning of the ${name} needs the distance within which variants are compared. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs, or ${PLACES[page].pruningOff(name)}.`;
}

/** The reason of the lock of the PCA's own LD filter, set with no
    distance, or null; needs gives it, and the panel shows it beside the
    field of the distance (docs/specs/analyses/pca.md, "Why it cannot
    run"). A distance kept while the filter follows the Variants step
    locks nothing, since it is not used. */
export function pruningDistanceReason(
  p: Project,
  page: PcaPage,
): string | null {
  const o = pcaOptions(p, page);
  return !o.ld.follow && o.ld.maxDist === null
    ? pruningDistanceText(methodName(o.method), page)
    : null;
}

/**
 * The first reason the PCA cannot run beyond those the store asks of
 * every analysis that reads the filters of individuals, or `null`: the LD
 * filter of the Variants step with no distance, while the PCA's LD filter
 * follows it, `variantFilterNeeds`, first, as the store asks it of the
 * diversity; for the PCA of the genotypes, more individuals in the
 * variants file than popnei's limit, which counts those of the file
 * whatever the filters of individuals keep; on the old page, the
 * individuals file, which colours the points, and which on popgen2.html
 * never locks the PCA, since the key holds nothing of it; and the PCA's
 * own LD filter with no distance, on popgen2.html as a short line that
 * points to the field. The PCoA's limit is its `keptNeeds`,
 * since it counts the individuals kept.
 */
function needs(p: Project, page: PcaPage): string | null {
  const o = pcaOptions(p, page);
  const stepLd = o.ld.follow ? variantFilterNeeds(p) : null;
  if (stepLd !== null) {
    return stepLd;
  }
  const read = p.variants?.read;
  if (
    o.method === "pca" &&
    p.variants !== null &&
    read?.kind === "read" &&
    read.individuals.length > PCA_MAX_INDIVIDUALS
  ) {
    return pcaLimitText(p.variants.name, read.individuals.length);
  }
  const ofIndividuals = page === "popgen" ? individualsNeeds(p) : null;
  if (ofIndividuals !== null) {
    return ofIndividuals;
  }
  // popgen2.html draws the reason in full under the field of the
  // distance, and beside Run a short line that points to it, so that it
  // is not drawn, nor read, twice (docs/specs/steps/popgen2-pca.md, "Its
  // filters").
  const distance = pruningDistanceReason(p, page);
  return distance !== null && page === "popgen2"
    ? PRUNING_DISTANCE_SHORT
    : distance;
}

/** The line beside Run of popgen2.html while the PCA's LD pruning has no
    distance, whose reason in full stands under the field. */
const PRUNING_DISTANCE_SHORT =
  "Type the LD distance above, or turn the LD pruning off.";

/** The words of the PCA's limit on the individuals of the variants file
    `fileName`, which has `numIndividuals`. */
function pcaLimitText(fileName: string, numIndividuals: number): string {
  return `${escaped(fileName)} has ${grouped(numIndividuals)} individuals, and the principal components of more than ${grouped(PCA_MAX_INDIVIDUALS)} need more memory than a browser tab can hold. Calculate them with popnei in Python, outside the browser.`;
}

/**
 * The reason the PCoA cannot run for the individuals kept: they are more
 * than popnei's limit, 9,381, counted on the known list, or on every
 * individual of the file when the list is `null` because the filters of
 * individuals remove none (docs/specs/analyses/pca.md, "The limit on the
 * individuals"). `null` for the PCA, whose limit is in `needs`, for a
 * PCoA of 9,381 or fewer, and while the list waits for the statistics of
 * each individual, which the store does not ask this of.
 */
function keptNeeds(
  p: Project,
  kept: IndividualsKept,
  page: PcaPage,
): string | null {
  const variants = p.variants;
  if (
    pcaOptions(p, page).method !== "pcoa" ||
    kept.list.kind !== "known" ||
    variants?.read.kind !== "read"
  ) {
    return null;
  }
  const inFile = variants.read.individuals.length;
  const list = kept.list.individuals;
  const numKept = list === null ? inFile : list.length;
  if (numKept <= PCA_MAX_INDIVIDUALS) {
    return null;
  }
  const limit = grouped(PCA_MAX_INDIVIDUALS);
  const has = `${escaped(variants.name)} has ${grouped(inFile)} individuals`;
  const start =
    list === null
      ? `${has},`
      : `${has} and the filters of individuals keep ${grouped(numKept)} of them,`;
  return `${start} and the principal coordinates of more than ${limit} need more memory than a browser tab can hold. Keep at most ${limit} with ${PLACES[page].limitFilters}, or calculate them with popnei in Python, outside the browser.`;
}

/** Builds the request, with the individuals the filters keep that the
    store gives through `c`, and sends it through `c`. Throws a defect when
    the variants file is not loaded, and, through `jobFilters`, on an LD
    filter with no distance, which `needs` locks. */
function run(
  p: Project,
  c: WorkerClient<Job, JobResult>,
  page: PcaPage,
): Run<JobResult> {
  if (p.variants === null) {
    throw defect("the PCA was run with no variants file.");
  }
  const o = pcaOptions(p, page);
  return c.run({
    analysis: ID,
    fileId: p.variants.fileId,
    filters: jobFilters(pcaFilters(filtersApplied(p), o, page)),
    individuals: c.individuals,
    method: o.method,
    numCompsKept: PCA_NUM_COMPS_KEPT,
  });
}

/**
 * What the key holds beyond the load and the filters of individuals: the
 * method, and the filters of the variants the job carries, as
 * `pcaFilters` gives them, an LD filter with no distance included
 * (docs/specs/analyses/pca.md, "What goes into its key"). A filter of the
 * Variants step that the PCA replaces with its own is not in it, nor the
 * values a filter of the PCA's own keeps while it follows the step, nor
 * the colour, the axes and the view, which only draw the result. Reads
 * nothing of `p.variants`, so it answers for any project.
 */
function keyInputs(p: Project, page: PcaPage): JsonObject {
  const o = pcaOptions(p, page);
  return { method: o.method, filters: pcaFilters(filtersApplied(p), o, page) };
}

/** The name of a method in the words of the panel. */
function methodName(method: PcaMethod): "PCA" | "PCoA" {
  return method === "pca" ? "PCA" : "PCoA";
}

/**
 * The warnings of a result, given the project its request was made from,
 * in this order: no LD filter in the job, `pruningOff`; fewer variants
 * used than individuals, `fewVariants`; and, for the PCoA, distances
 * corrected by Lingoes' method, `lingoesCorrection` (docs/specs/analyses/
 * pca.md, "The warnings"), the first two in the words of the page `page`
 * (docs/specs/steps/popgen2-pca.md, "Its words"). Throws a defect on a
 * result of another analysis.
 */
function warnings(
  result: JobResult,
  p: Project,
  page: PcaPage,
): readonly Warning[] {
  const r = pcaResultOf(result);
  const name = methodName(r.method);
  const found: Warning[] = [];
  const filters = pcaFilters(filtersApplied(p), pcaOptions(p, page), page);
  if (!filters.some((filter) => filter.kind === "ld")) {
    const region =
      "so a region of the genome counts once for each of its variants, and a region of many variants in linkage disequilibrium, such as an inversion, can make a component of its own that separates the individuals by that region rather than by their ancestry.";
    found.push({
      code: "pruningOff",
      text:
        page === "popgen"
          ? `No LD filter was applied, neither in the Variants step nor for the ${name}, ${region} Set an LD filter for the ${name} in its options above, or for every analysis in the Variants step, unless such regions are what you are looking for.`
          : `No LD pruning was applied for the ${name}, ${region} Turn on the LD pruning of the ${name} in its options above, unless such regions are what you are looking for.`,
    });
  }
  const numUsed = r.method === "pca" ? r.numVarsUsed : r.passStats.numVars;
  if (numUsed === null) {
    throw defect("a result of the PCA of the genotypes has no numVarsUsed.");
  }
  const numIndividuals = r.individuals.length;
  if (numUsed < numIndividuals) {
    found.push({
      code: "fewVariants",
      text: fewVariantsText(r.method, numUsed, numIndividuals, page),
    });
  }
  if (r.lingoesConstant !== null && r.lingoesConstant > 0) {
    found.push({ code: "lingoesCorrection", text: lingoesText(r) });
  }
  return found;
}

/** The text of `fewVariants`, for `numUsed` variants and `numIndividuals`
    individuals, on the page `page`. */
function fewVariantsText(
  method: PcaMethod,
  numUsed: number,
  numIndividuals: number,
  page: PcaPage,
): string {
  const name = methodName(method);
  const individuals = `${grouped(numIndividuals)} individuals`;
  const used =
    method === "pca"
      ? `${counted(numUsed, "variant")} that ${numUsed === 1 ? "varies" : "vary"} among its ${individuals}`
      : `${counted(numUsed, "variant")} for its ${individuals}`;
  return `The ${name} used ${used}, fewer variants than individuals, so each component rests on few variants and can show chance differences as structure. If the dataset has more, loosen the filters of the ${name} in its options above, or ${page === "popgen" ? "those of the Variants step that it follows" : "the thresholds of the Variants tab"}.`;
}

/**
 * The text of `lingoesCorrection`: the share of the variance of the
 * distances that lay in directions no space has, popnei's; the amount the
 * correction added to every squared distance, 2c; how large that is
 * beside the mean of the squared distances; and how far apart it draws
 * two individuals of the same genotypes, the square root of 2c. The mean
 * of the squared distances, which the result does not hold, is worked
 * out from popnei's numbers: the variance along PC1, λ1, is the sum of the
 * squares of its projections; the variance of the corrected distances is
 * 100 λ1 over the percentage of PC1; the correction raised n − 1
 * eigenvalues by c, so the variance before it is that less c(n − 1); and
 * the mean of d² over the n(n − 1)/2 pairs is twice that over n − 1.
 * Throws a defect on a result that cannot give it, which popnei's PCoA
 * of a correction never is.
 */
function lingoesText(r: PcaResult): string {
  const c = r.lingoesConstant;
  const negative = r.negativeEigenvaluesPercent;
  const firstPercent = r.explainedVariancePercent[0];
  const numIndividuals = r.individuals.length;
  if (
    c === null ||
    negative === null ||
    firstPercent === undefined ||
    numIndividuals < 2
  ) {
    throw defect("a correction of Lingoes on a result with no PC1.");
  }
  let firstVariance = 0;
  for (let i = 0; i < numIndividuals; i += 1) {
    const projection = r.projections[i * r.numComps];
    if (projection === undefined) {
      throw defect("a result of the PCoA has fewer projections than rows.");
    }
    firstVariance += projection * projection;
  }
  const corrected = (100 * firstVariance) / firstPercent;
  const before = corrected - c * (numIndividuals - 1);
  const meanSquare = (2 * before) / (numIndividuals - 1);
  const added = 2 * c;
  if (!Number.isFinite(meanSquare) || meanSquare <= 0) {
    throw defect("the mean squared distance of a PCoA is not above 0.");
  }
  const share = Math.round((100 * added) / meanSquare);
  return `The Kosman distances between these individuals cannot all be drawn in one space: ${negative.toFixed(2)}% of their variance lies in directions that no space has. So they were corrected, by Lingoes' method, which adds the same amount, here ${added.toPrecision(2)}, to the square of the distance between every two individuals, ${String(share)}% of the mean of those squares. This moves the closest individuals apart the most: two individuals of the same genotypes are drawn ${Math.sqrt(added).toFixed(2)} apart, and groups look looser than their distances make them. The percentages of the components are of the corrected distances. Compare with the PCA of the genotypes, which needs no correction.`;
}

/** The check numbers: the variants the pass gave, then the explained
    variance of PC1, PC2 and PC3, `null` for a component the result does
    not have. Throws a defect on a result of another analysis. */
function checkNumbers(result: JobResult): readonly (number | null)[] {
  const r = pcaResultOf(result);
  const percents = r.explainedVariancePercent;
  return [
    r.passStats.numVars,
    percents[0] ?? null,
    percents[1] ?? null,
    percents[2] ?? null,
  ];
}

/** Four check numbers for every project. */
function numCheckNumbers(): number {
  return 4;
}

/** Comment lines of the Python script are shorter than 72 characters, the
    width PEP 8 gives comments. */
const COMMENT_WIDTH = 71;

/** The names of the filters of the variants in the words of the comment
    of the script. */
const FILTER_WORDS: Readonly<Record<ProjectVariantFilter["kind"], string>> =
  Object.freeze({
    passed: "FILTER column",
    missing_data: "missing data",
    obs_het: "observed heterozygosity",
    maf: "MAF",
    ld: "LD",
  });

/**
 * The lines of the Python script that calculate the same components with
 * popnei's Python API, after the lines that open `variants`: the file
 * opened again into a `Variants` of its own, `pca_variants`, with the read
 * options of a VCF written out; the list of the individuals kept,
 * `individuals_kept`, which src/core/script.ts makes, when the project
 * has a filter of individuals; the filters of the job, from `pcaFilters`;
 * and the call of the method, with its arguments written out, and the
 * prints of its first 10 components (docs/specs/analyses/pca.md, "Its
 * lines of the Python script"). Throws a defect on a project with no
 * variants file, or with an LD filter with no distance, since it is
 * asked only of an analysis that has run.
 */
function script(p: Project, page: PcaPage): string {
  const variants = p.variants;
  if (variants === null) {
    throw defect("the script of the PCA needs a variants file.");
  }
  const o = pcaOptions(p, page);
  const filters = jobFilters(pcaFilters(filtersApplied(p), o, page));
  const open = pythonOpenVariants(variants);
  const kept = PCA_NUM_COMPS_KEPT;
  const prints = (result: string): string[] => [
    `print(${result}.explained_variance_percent.iloc[:${String(kept)}].to_string())`,
    `print(${result}.projections.iloc[:, :${String(kept)}].to_string())`,
  ];
  const call =
    o.method === "pca"
      ? [
          "pca = popnei.do_pca_from_variants(",
          "    pca_variants, transform_to_biallelic=True, num_prin_comps=0",
          ")",
          ...prints("pca"),
        ]
      : [
          "pcoa = popnei.do_pcoa_from_variants(pca_variants, correct_by_lingoes=True)",
          ...prints("pcoa"),
          "print(pcoa.lingoes_constant)",
          "print(pcoa.negative_eigenvalues_percent)",
        ];
  return [
    ...commentLines(
      page === "popgen" ? scriptComment(o) : popgen2ScriptComment(o),
    ),
    `pca_variants = ${open}`,
    ...filters.filter((filter) => filter.kind === "passed").map(filterLine),
    ...(p.individualFilters.length === 0
      ? []
      : ["pca_variants.filter_individuals(individuals_kept)"]),
    ...filters.filter((filter) => filter.kind !== "passed").map(filterLine),
    ...call,
  ]
    .map((line) => `${line}\n`)
    .join("");
}

/** What the comment of the script says: the method, and the filters of
    the PCA's own the project has, in their order. */
function scriptComment(o: PcaOptions): string {
  const name = methodName(o.method);
  const method =
    o.method === "pca"
      ? "a PCA of the genotypes"
      : "a PCoA of the Kosman distances";
  const own = VARIANT_FILTER_ORDER.filter(
    (kind) => ownFilter(kind, o) !== null,
  ).map((kind) => FILTER_WORDS[kind]);
  const last = own.at(-1);
  const named =
    last === undefined
      ? ""
      : own.length === 1
        ? `, with the ${name}'s own ${last} filter in the place of the step's`
        : `, with the ${name}'s own ${own.slice(0, -1).join(", ")} and ${last} filters in the place of the step's`;
  return `The principal components of the individuals, ${method}, over the filters of the Variants step${named}, on a Variants of its own`;
}

/** What the comment of the script says on popgen2.html: the method, the
    missing data and MAF filters the stricter of the PCA's own and the
    Variants tab's, when the PCA has its own, and its own LD pruning, which
    the Variants tab does not have (docs/specs/analyses/pca.md, "On
    popgen2.html"). */
function popgen2ScriptComment(o: PcaOptions): string {
  const name = methodName(o.method);
  const method =
    o.method === "pca"
      ? "a PCA of the genotypes"
      : "a PCoA of the Kosman distances";
  const narrowed = (["missing_data", "maf"] as const)
    .filter((kind) => ownFilter(kind, o) !== null)
    .map((kind) => FILTER_WORDS[kind]);
  const parts = [
    ...(narrowed.length === 0
      ? []
      : [
          `the ${narrowed.join(" and ")} ${narrowed.length === 1 ? "filter" : "filters"} the stricter of the ${name}'s own and the Variants tab's`,
        ]),
    ...(o.ld.follow ? [] : [`the ${name}'s own LD pruning`]),
  ];
  const named = parts.length === 0 ? "" : `, with ${parts.join(", and ")}`;
  return `The principal components of the individuals, ${method}, over the filters of the Variants tab${named}, on a Variants of its own`;
}

/** A comment of the script in lines of `# `, each shorter than 72
    characters, broken between words. */
function commentLines(text: string): string[] {
  const lines: string[] = [];
  let line = "#";
  for (const word of text.split(" ")) {
    if (line !== "#" && line.length + 1 + word.length > COMMENT_WIDTH) {
      lines.push(line);
      line = "#";
    }
    line = `${line} ${word}`;
  }
  lines.push(line);
  return lines;
}

/** The line of the script that puts one filter of the job on
    `pca_variants`, its numbers as `String` writes them; the filter of the
    FILTER column is popnei's `filter_passed`, which the script puts
    before the list of the individuals, where the runner puts it. */
function filterLine(filter: ProjectVariantFilter): string {
  switch (filter.kind) {
    case "passed":
      return "pca_variants.filter_passed()";
    case "missing_data":
      return `pca_variants.filter_by_missing_data(${String(filter.maxAllowedMissingRate)})`;
    case "obs_het":
      return `pca_variants.filter_by_obs_het(${String(filter.maxAllowedObsHet)})`;
    case "maf":
      return `pca_variants.filter_by_maf(${String(filter.maxAllowedMaf)})`;
    case "ld":
      if (filter.maxDist === null) {
        throw defect(
          "the script of the PCA was given an LD filter with no distance.",
        );
      }
      return `pca_variants.filter_by_ld(${String(filter.maxAllowedR2)}, ${String(filter.maxDist)})`;
  }
}

/** popnei's refusal of the PCA of the genotypes when the pass gave no
    variant, whether the file holds none or the filters kept none. */
const NO_VARIANTS = "there are no variants to do a PCA with";

/** popnei's refusal of the PCA when no variant has two dosages among its
    called genotypes. */
const NO_VARIANCE =
  "no variant has more than one dosage among its called genotypes";

/** popnei's refusal of a PCA of more individuals than its limit, which
    `needs` locks before any request. */
const PCA_LIMIT = /^the principal components of (\d+) individuals hold about/u;

/** popnei's refusal of the PCoA of pairs of individuals with no variant
    called in both: how many pairs, and the individual in most of them
    with how many; the names are between backquotes. */
const NO_DISTANCE =
  /^(\d+) of the \d+ pairs of individuals (?:has|have) no distance, the first of them `.*?` and `.*?`, and `(.*?)` is in (\d+) of them/su;

/** popnei's refusal of the PCoA of one individual. */
const ONE_INDIVIDUAL =
  "there is 1 individual, and a principal coordinate analysis places 2 at least";

/** popnei's refusal of the PCoA of distances that are all 0. */
const ALL_DISTANCES_ZERO = "every distance is 0";

/**
 * The words of a refusal of popnei, for the error state of the panel of
 * the project `p`, by the start of popnei's message, with the method of
 * `p` named "the PCA" or "the PCoA" (docs/specs/analyses/pca.md, "Its
 * words"): no variant left, with the words of a file with no variant when
 * a pass has counted it at 0 variants; no variant with variance; a
 * variant out of the order of its chromosome, with the LD filter of the
 * PCA or of the Variants step as the PCA follows it; the PCA's limit on
 * the individuals; the PCoA's pairs with no distance, its one individual,
 * its distances all 0; on popgen2.html, the refusals of the variants
 * file itself, in the words of the box Variants file, `fileRefusalText`;
 * and the rows every analysis shares, of `refusalWords`: the PCoA's empty
 * pass, the ploidy, a line of a VCF, and any other, with popnei's message
 * without its backquotes. Throws a defect on a project with no variants
 * file.
 */
export function refusalText(
  message: string,
  p: Project,
  page: PcaPage,
): string {
  const variants = p.variants;
  if (variants === null) {
    throw defect("refusalText was given a project with no variants file.");
  }
  const o = pcaOptions(p, page);
  const places = PLACES[page];
  const name = methodName(o.method);
  const fileName = escaped(variants.name);
  const nothingLeft = `there is no variant to do the ${name} with`;
  const nothingKept =
    page === "popgen"
      ? `No variant of ${fileName} is left after the filters of the ${name}, so ${nothingLeft}. Loosen the filters the ${name} has for itself in its options above, or those of the Variants step that it follows; the Count button of the Variants step shows how many each filter of the step keeps.`
      : `No variant of ${fileName} is left after the filters of the ${name}, so ${nothingLeft}. Loosen the filters of the ${name} in its options above, or the thresholds of the Variants tab.`;
  if (message.startsWith(NO_VARIANTS)) {
    const counted0 =
      variants.read.kind === "read" && variants.read.numVars === 0;
    return counted0 ? emptyText(p, nothingLeft, page) : nothingKept;
  }
  if (message.startsWith(NO_VARIANCE)) {
    return `No variant left after the filters varies among the individuals kept, so there is nothing to do the ${name} with. This happens with one individual, or a few of one line; keep more individuals with ${places.individualFilters}.`;
  }
  const order = ldOrderText(
    message,
    p,
    page === "popgen2"
      ? pca2LdPruning(name)
      : o.ld.follow
        ? STEP_LD_FILTER
        : PCA_LD_FILTER,
  );
  if (order !== null) {
    return order;
  }
  const limit = PCA_LIMIT.exec(message);
  if (limit !== null) {
    return pcaLimitText(variants.name, Number(limit[1]));
  }
  const noDistance = NO_DISTANCE.exec(message);
  if (noDistance !== null) {
    const [, pairs = "", individual = "", inPairs = ""] = noDistance;
    return noDistanceText(
      fileName,
      Number(pairs),
      individual,
      Number(inPairs),
      places,
    );
  }
  if (message.startsWith(ONE_INDIVIDUAL)) {
    return `The filters of individuals keep one individual of ${fileName}, and the PCoA needs two at least to place them. Keep more individuals with ${places.individualFilters}.`;
  }
  if (message.startsWith(ALL_DISTANCES_ZERO)) {
    return `Every two of the individuals kept have the same alleles at every variant both have called, so their Kosman distances are all 0 and the PCoA has nothing to place. Keep more individuals, or more variants, with ${places.variantFilters}.`;
  }
  const ofFile =
    page === "popgen2"
      ? fileRefusalText(message, p, {
          cannot: `the ${name} cannot be calculated`,
          where: " in the box Variants file",
        })
      : null;
  if (ofFile !== null) {
    return ofFile;
  }
  return refusalWords(message, p, {
    calculate: "calculate the principal components",
    nothingLeft,
    change:
      page === "popgen"
        ? CHANGE_SETTINGS
        : "Change the settings, or open the variants file again in the box Variants file",
    again: "to run it again",
    emptyPass: () => nothingKept,
  });
}

/** The words of a variants file of no variant, with what that leaves,
    `consequence`, on the page `page`: the old page's, which name its
    Variants step; on popgen2.html, which reads every variant whatever its
    FILTER column, "panel.nei has no variants, so …". */
function emptyText(p: Project, consequence: string, page: PcaPage): string {
  if (page === "popgen" || p.variants === null) {
    return emptySourceText(p, consequence);
  }
  return `${escaped(p.variants.name)} has no variants, so ${consequence}. Open another variants file in the box Variants file.`;
}

/** The words of the PCoA's pairs of individuals with no distance: `pairs`
    of them in the variants file `fileName`, `individual` in `inPairs` of
    them, with the places of the page. */
function noDistanceText(
  fileName: string,
  pairs: number,
  individual: string,
  inPairs: number,
  places: PlaceWords,
): string {
  const remedy = `Remove the individuals with many missing genotypes with ${places.individualFilters}, or use the PCA of the genotypes, which places every individual.`;
  const who = shown(individual);
  return pairs === 1
    ? `1 pair of individuals of ${fileName} has no variant called in both, so it has no Kosman distance and the PCoA cannot place it; ${who} is in it. ${remedy}`
    : `${grouped(pairs)} pairs of individuals of ${fileName} have no variant called in both, so they have no Kosman distance and the PCoA cannot place them; ${who} is in ${grouped(inPairs)} of them. ${remedy}`;
}

/**
 * The words of a worker that stopped with no answer, a `workerFailed`, by
 * the memory the calculation of `numIndividuals` needed, 48.8 bytes for
 * each cell of their individuals × individuals matrix: from
 * `PCA_MEMORY_WORDS_BYTES` up, 2,264 individuals or more, the words of
 * memory, with the gigabytes to one decimal; below, the words of any
 * analysis, "The calculation stopped unexpectedly. Run it again. …"
 * (docs/specs/analyses/pca.md, "Its words"). Throws a defect on a project
 * with no variants file.
 */
export function crashText(
  p: Project,
  numIndividuals: number,
  page: PcaPage,
): string {
  if (p.variants === null) {
    throw defect("crashText was given a project with no variants file.");
  }
  const bytes = BYTES_PER_CELL * numIndividuals * numIndividuals;
  if (bytes < PCA_MEMORY_WORDS_BYTES) {
    return `The calculation stopped unexpectedly. Run it again. If it stops again, ${PLACES[page].openAgain(escaped(p.variants.name))}.`;
  }
  const what =
    pcaOptions(p, page).method === "pca"
      ? "principal components"
      : "principal coordinates";
  return `The calculation stopped unexpectedly, perhaps because the ${what} of ${counted(numIndividuals, "individual")}, which need about ${(bytes / 1e9).toFixed(1)} GB, did not fit in the memory of this tab; a phone or a tablet gives a tab far less than a computer. Keep fewer individuals with ${PLACES[page].individualFilters}, close other tabs and run it again, or calculate them with popnei in Python, outside the browser.`;
}

/**
 * The words of the error state of the panel when the statistics of each
 * individual that a Run waited for were refused or failed, the store's
 * error with `ofStatistics`: `statisticsFailedWords` of the statistics,
 * with "the PCA was not run", or "the PCoA", when its own Run waited for
 * them, `waited`, and "the PCA cannot run" when it did not (stop C 4).
 */
export function statisticsFailedText(
  error: AnalysisError,
  p: Project,
  failureText: (failure: Failure) => string,
  waited: boolean,
  page: PcaPage,
): string {
  const name = methodName(pcaOptions(p, page).method);
  return statisticsFailedWords(
    error,
    p,
    failureText,
    waited ? `the ${name} was not run` : `the ${name} cannot run`,
    page === "popgen" ? undefined : popgen2StatisticsRefusal,
  );
}

/** The words of popnei's refusal of the statistics of each individual on
    popgen2.html, which the one pass calculates: those of the box Variants
    file, with the file opened again there. */
function popgen2StatisticsRefusal(message: string, p: Project): string {
  return passRefusalText(message, p, {
    cannot: "the statistics of each individual cannot be calculated",
    where: " in the box Variants file",
  });
}

// What the panel reads of a result (docs/specs/analyses/pca.md, "The
// colours", "The note of the missing genotypes" and "The panel").

/** The proportion of missing genotypes above which an individual is named
    by the note of the missing genotypes: the projection of an individual
    shrinks toward the centre about as much as it lacks, so at 0.2 it is
    drawn about a fifth of the way in (docs/specs/analyses/pca.md, "The
    note of the missing genotypes"). */
export const MANY_MISSING_RATE = 0.2;

/** The group of an individual with no population or no value, 0xffff:
    NO_GROUP of src/charts/marks.ts, which core does not import; a test of
    the panel asserts the two are equal. */
export const NO_COLOUR_GROUP = 0xffff;

/** The most groups the points are coloured by: MAX_POINT_GROUPS of
    src/charts/limits.ts, which the scatter refuses above; the same test
    asserts it. */
export const MAX_COLOUR_GROUPS = 1000;

/**
 * How the individuals of a result are coloured: by groups, or by the
 * numbers of a continuous column. The panel gives the plots the
 * `PointColours` of src/charts/marks.ts made of it, with the group it
 * highlights; core imports nothing of src/charts.
 */
export type PcaColours =
  | {
      readonly kind: "groups";
      /** "Population", or the column's name. */
      readonly title: string;
      /** Every group of the table, in the order of first appearance; the
          index of a group gives its mark. */
      readonly names: readonly string[];
      /** The group of each individual of the result, an index of `names`,
          or NO_COLOUR_GROUP for none. */
      readonly group: Uint16Array;
      /** The individuals of the result in each group, 0 for some. */
      readonly counts: readonly number[];
      /** The individuals of the result in no group. */
      readonly numNone: number;
      /** The name of the individuals in no group: "Unclassified" for
          those with no population on popgen2.html. */
      readonly noneName: "No population" | "No value" | "Unclassified";
      /** Why the colours are not those the options ask, or `null`. */
      readonly note: string | null;
      /** When the colouring asked has more than MAX_COLOUR_GROUPS groups
          and is drawn as one, the value of each individual of the result
          in its column, or its population, `null` for none, which the
          table gives as the note says (stop C 9); `null` otherwise. */
      readonly cellTexts: readonly (string | null)[] | null;
    }
  | {
      readonly kind: "values";
      /** The column's name. */
      readonly title: string;
      /** The number of each individual of the result; NaN for none. */
      readonly values: Float64Array;
      /** The individuals of the result with no number. */
      readonly numNone: number;
      /** The name of the individuals with no number. */
      readonly noneName: "No value";
      /** Why the colours are not those the options ask, or `null`. */
      readonly note: string | null;
    };

/** The colours of the groups kind. */
type GroupsColours = Extract<PcaColours, { readonly kind: "groups" }>;

/** What stands in a chain of the memo of the colours for a part of the
    project that is null: no individuals file, or no variants file. */
const ABSENT = Object.freeze({});

/** The colours `pcaColours` made, by the page, the result, the
    individuals file, the grouping, the variants file and the option, so
    that the same inputs give the same object, which the highlight of the
    legend is kept with, and one page never gets the other's. */
const COLOURS: Readonly<
  Record<
    PcaPage,
    WeakMap<
      PcaResult,
      WeakMap<
        IndividualsSource | typeof ABSENT,
        WeakMap<
          Grouping,
          WeakMap<VariantSource | typeof ABSENT, Map<string | null, PcaColours>>
        >
      >
    >
  >
> = Object.freeze({ popgen: new WeakMap(), popgen2: new WeakMap() });

/** The value of `map` under `key`, made by `make` and kept the first time
    it is asked. */
function kept<K extends object, V>(
  map: WeakMap<K, V>,
  key: K,
  make: () => V,
): V {
  const found = map.get(key);
  if (found !== undefined) {
    return found;
  }
  const made = make();
  map.set(key, made);
  return made;
}

/**
 * How each individual of the result `r` is coloured in the project `p`
 * (docs/specs/analyses/pca.md, "The colours"): with `colourBy` null, by
 * the populations of the grouping, "All individuals" with no metadata file
 * or with the grouping of one population, and one group with the reason
 * of `populationsNeeds` as the note when the populations cannot be given;
 * with a categorical or binary column, by the text of each cell; with a
 * continuous column, by its numbers, read with the decimal mark of the
 * read; with a column the table does not have, or no metadata file, by
 * the populations with a note, the option unchanged. A colouring of more
 * than MAX_COLOUR_GROUPS groups is one group, with a note. The groups are
 * every group of the table, in the order of first appearance, so that a
 * population keeps its mark when the filters leave it no individual. The
 * same object for the same result, individuals file, grouping, variants
 * file and option. On popgen2.html, `page` "popgen2", the individuals with
 * no population are one group, "Unclassified", with no note, since the
 * box of the individuals file says why: with no individuals file, while it
 * is read, after it was refused, with no column chosen, or with no
 * population for the individual; and the notes of a column name the box
 * Individuals file (docs/specs/analyses/pca.md, "On popgen2.html").
 */
export function pcaColours(
  r: PcaResult,
  p: Project,
  page: PcaPage,
): PcaColours {
  const byColumn = kept(
    kept(
      kept(COLOURS[page], r, () => new WeakMap()),
      p.individuals ?? ABSENT,
      () => new WeakMap(),
    ),
    p.grouping,
    () => new WeakMap(),
  );
  const byOption = kept(
    byColumn,
    p.variants ?? ABSENT,
    () => new Map<string | null, PcaColours>(),
  );
  const colourBy = pcaOptions(p, page).colourBy;
  const found = byOption.get(colourBy);
  if (found !== undefined) {
    return found;
  }
  const made = coloursOf(r, p, colourBy, page);
  byOption.set(colourBy, made);
  return made;
}

/** The colours of `r` in `p` by the option `colourBy`, made anew, by
    the rules of the page `page`. */
function coloursOf(
  r: PcaResult,
  p: Project,
  colourBy: string | null,
  page: PcaPage,
): PcaColours {
  if (colourBy === null) {
    return byPopulations(r, p, null, page);
  }
  const individuals = p.individuals;
  if (individuals === null) {
    return byPopulations(
      r,
      p,
      page === "popgen"
        ? `No metadata file is loaded, so the points cannot be coloured by ${shown(colourBy)}.`
        : `No individuals file is open in the box Individuals file, so the points cannot be coloured by ${shown(colourBy)}.`,
      page,
    );
  }
  const read = individuals.read;
  if (read.kind !== "read") {
    // The old page locks the PCA while the file is read, refused or not
    // given, so no result is drawn with it there; popgen2.html draws a
    // result meanwhile, every point unclassified, and the box of the file
    // says why. The populations cannot be given either.
    return byPopulations(r, p, null, page);
  }
  const index = read.table.columns.indexOf(colourBy);
  if (index === -1) {
    const lacks = `${escaped(individuals.name)} has no column ${shown(colourBy)}, by which the points were coloured`;
    // On popgen2.html, with no column of the populations or with one,
    // byPopulations leaves every point unclassified.
    const pops = page === "popgen2" ? populationsOf(p) : null;
    const end =
      page === "popgen"
        ? "so they are coloured by the populations."
        : pops === null || pops === "all"
          ? "so every point is unclassified. Choose a column of the populations in the box Individuals file, or another column to colour the points by."
          : "so they are coloured by the column of the populations chosen in the box Individuals file.";
    return byPopulations(r, p, `${lacks}, ${end}`, page);
  }
  const cells = cellsOf(read.table, index);
  if (read.columns[index]?.kind === "continuous") {
    return byValues(r, colourBy, cells, read.found?.decimal ?? ".");
  }
  const names = [...new Set(cells.values())].flatMap((cell) =>
    cell === null ? [] : [String(cell)],
  );
  if (names.length > MAX_COLOUR_GROUPS) {
    return oneGroup(
      r,
      colourBy,
      "No value",
      tooManyText(colourBy, names),
      (individual) => {
        const cell = cells.get(individual);
        return cell === undefined || cell === null ? null : String(cell);
      },
    );
  }
  const groupOf = new Map<string, number>(
    names.map((name, i) => [name, i] as const),
  );
  return byGroups(r, colourBy, names, "No value", null, (individual) => {
    const cell = cells.get(individual);
    return cell === undefined || cell === null
      ? undefined
      : groupOf.get(String(cell));
  });
}

/** The cell of the column `index` of each individual of `table`, by the
    name of the individual, in the order of the rows. */
function cellsOf(table: IndividualsTable, index: number): Map<string, Cell> {
  const cells = new Map<string, Cell>();
  for (const row of table.rows) {
    const [name] = row;
    const cell = row[index];
    if (name === undefined || name === null || cell === undefined) {
      throw defect("a row of the individuals table lacks a cell.");
    }
    cells.set(String(name), cell);
  }
  return cells;
}

/** The note of a colouring whose column `column` has more different
    `values` than the plot can tell apart. */
function tooManyText(column: string, values: readonly string[]): string {
  return `${shown(column)} has ${grouped(values.length)} different values, more than the ${grouped(MAX_COLOUR_GROUPS)} the plot can tell apart, so the points are of one colour; the table gives each individual's value.`;
}

/** What follows the reason the populations cannot be given, in the note
    of the colours. */
const MEANWHILE =
  "Meanwhile the points are not coloured by population; another column can colour them.";

/**
 * The colours of `r` by the populations of `p`, with `before`, the note of
 * a column that cannot colour them, first in the note. On the old page,
 * "All individuals" when the populations are one, and one group with the
 * reason the populations cannot be given; on popgen2.html, every
 * individual with no population in no group, "Unclassified", all of them
 * when the populations are one or cannot be given, with no note of why.
 */
function byPopulations(
  r: PcaResult,
  p: Project,
  before: string | null,
  page: PcaPage,
): PcaColours {
  const pops = populationsOf(p);
  if (page === "popgen2" && (pops === "all" || pops === null)) {
    return byGroups(r, "Population", [], "Unclassified", before, () => {
      return undefined;
    });
  }
  if (pops === "all") {
    return oneGroup(r, "Population", "No population", before);
  }
  const need = page === "popgen" ? populationsNeeds(p) : null;
  const note = joined(
    before,
    need === null ? null : `${need.reason} ${MEANWHILE}`,
  );
  if (pops === null) {
    return oneGroup(r, "Population", "No population", note);
  }
  const noneName = page === "popgen" ? "No population" : "Unclassified";
  const names = pops.map(([name]) => name);
  const groupOf = new Map<string, number>();
  for (const [i, [, individuals]] of pops.entries()) {
    for (const individual of individuals) {
      groupOf.set(individual, i);
    }
  }
  if (names.length > MAX_COLOUR_GROUPS) {
    const column = p.grouping.kind === "populations" ? p.grouping.column : null;
    return oneGroup(
      r,
      "Population",
      noneName,
      joined(before, column === null ? null : tooManyText(column, names)),
      (individual) => {
        const index = groupOf.get(individual);
        return index === undefined ? null : (names[index] ?? null);
      },
    );
  }
  return byGroups(r, "Population", names, noneName, note, (individual) =>
    groupOf.get(individual),
  );
}

/** Two notes in one, either `null`. */
function joined(first: string | null, second: string | null): string | null {
  return first === null
    ? second
    : second === null
      ? first
      : `${first} ${second}`;
}

/** The colours of every individual of `r` in the one group "All
    individuals"; with `cellOf`, the text the table gives each
    individual, `null` for none, when the colouring asked has more groups
    than the plot can tell apart. */
function oneGroup(
  r: PcaResult,
  title: string,
  noneName: GroupsColours["noneName"],
  note: string | null,
  cellOf: ((individual: string) => string | null) | null = null,
): PcaColours {
  const colours = byGroups(r, title, [ONE_POPULATION], noneName, note, () => 0);
  return cellOf === null
    ? colours
    : Object.freeze({
        ...colours,
        cellTexts: Object.freeze(r.individuals.map(cellOf)),
      });
}

/** The colours of `r` in the groups `names`, the group of each individual
    given by `groupOf`, `undefined` for none. */
function byGroups(
  r: PcaResult,
  title: string,
  names: readonly string[],
  noneName: GroupsColours["noneName"],
  note: string | null,
  groupOf: (individual: string) => number | undefined,
): PcaColours {
  const group = new Uint16Array(r.individuals.length);
  const counts = names.map(() => 0);
  let numNone = 0;
  for (const [i, individual] of r.individuals.entries()) {
    const index = groupOf(individual);
    const count = index === undefined ? undefined : counts[index];
    if (index === undefined || count === undefined) {
      group[i] = NO_COLOUR_GROUP;
      numNone += 1;
    } else {
      group[i] = index;
      counts[index] = count + 1;
    }
  }
  return Object.freeze({
    kind: "groups",
    title,
    names: Object.freeze([...names]),
    group,
    counts: Object.freeze(counts),
    numNone,
    noneName,
    note,
    cellTexts: null,
  });
}

/** The colours of `r` by the numbers of the cells `cells` of the column
    `column`, read with the decimal mark `decimal`. */
function byValues(
  r: PcaResult,
  column: string,
  cells: ReadonlyMap<string, Cell>,
  decimal: "." | ",",
): PcaColours {
  const values = new Float64Array(r.individuals.length);
  let numNone = 0;
  for (const [i, individual] of r.individuals.entries()) {
    const cell = cells.get(individual);
    const value = cell === undefined ? null : cellNumber(cell, decimal);
    values[i] = value ?? NaN;
    if (value === null) {
      numNone += 1;
    }
  }
  return Object.freeze({
    kind: "values",
    title: column,
    values,
    numNone,
    noneName: "No value",
    note: null,
  });
}

/** The columns each read offers to colour by, so that a draw of the panel
    does not walk the table again. */
const COLOUR_COLUMNS = new WeakMap<object, readonly string[]>();

/**
 * The columns the colour can be taken from: every column of the table but
 * the first, the identifiers, and but a categorical or binary column of
 * more than MAX_COLOUR_GROUPS different values, in its order; a continuous
 * column whatever the number of its values. None while the metadata file
 * is not read, or with none.
 */
export function colourColumns(p: Project): readonly string[] {
  const read = p.individuals?.read;
  if (read?.kind !== "read") {
    return Object.freeze([]);
  }
  return kept(COLOUR_COLUMNS, read, () =>
    Object.freeze(
      read.table.columns.filter((_, index) => {
        if (index === 0) {
          return false;
        }
        if (read.columns[index]?.kind === "continuous") {
          return true;
        }
        const values = new Set<string>();
        for (const cell of cellsOf(read.table, index).values()) {
          if (cell !== null) {
            values.add(String(cell));
          }
        }
        return values.size <= MAX_COLOUR_GROUPS;
      }),
    ),
  );
}

/** A component as the screen names it, "PC3". */
function pc(component: number): string {
  return `PC${String(component)}`;
}

/**
 * The components drawn, from the options `o` and the result `r`, and the
 * line that says why they are not those chosen, or null: the axes of the
 * options that the result has, as many as it can draw, three at most; an
 * axis beyond the components of the result replaced by the first
 * component not shown, with the note "The axes chosen, PC4, PC5 and PC6,
 * are beyond the 3 components of this result, so PC1, PC2 and PC3 are
 * drawn."; with two components, the first two axes and the line of the 3D
 * view, "The 3D view needs three components, and this result has 2.";
 * with one, PC1 and the line that there is no plot (docs/specs/analyses/
 * pca.md, "The cases" and "What it shows").
 */
export function axesShown(
  o: PcaOptions,
  r: PcaResult,
): { readonly axes: readonly number[]; readonly note: string | null } {
  const numComps = r.numComps;
  if (numComps < 1) {
    throw defect("a result of the principal components has no component.");
  }
  if (numComps === 1) {
    return Object.freeze({
      axes: Object.freeze([1]),
      note: `Only one component has variance, since ${counted(r.individuals.length, "individual")} ${r.individuals.length === 1 ? "has" : "have"} one axis between them, so there is no plot; the table gives each individual's place on it.`,
    });
  }
  const chosen = o.axes.slice(0, Math.min(3, numComps));
  const beyond = chosen.filter((axis) => axis > numComps);
  const free = Array.from({ length: numComps }, (_, i) => i + 1).filter(
    (component) => !chosen.includes(component),
  );
  const axes = chosen.map((axis) => (axis > numComps ? free.shift() : axis));
  const drawn = axes.flatMap((axis) => (axis === undefined ? [] : [axis]));
  if (drawn.length !== chosen.length) {
    throw defect("the components of a result ran out for its axes.");
  }
  const beyondNote =
    beyond.length === 0
      ? null
      : `The ${beyond.length === 1 ? "axis" : "axes"} chosen, ${namesOf(beyond.map(pc))}, ${beyond.length === 1 ? "is" : "are"} beyond the ${counted(numComps, "component")} of this result, so ${namesOf(drawn.map(pc))} are drawn.`;
  const threeDNote =
    numComps === 2
      ? "The 3D view needs three components, and this result has 2."
      : null;
  return Object.freeze({
    axes: Object.freeze(drawn),
    note: joined(beyondNote, threeDNote),
  });
}

/** A row of the table of the individuals. */
export interface PcaRow {
  /** The name of the individual. */
  readonly individual: string;
  /** Its group's name, or its value; null for none. */
  readonly colour: string | number | null;
  /** Its place on each component kept, `numComps` numbers. */
  readonly projections: readonly number[];
}

/** The rows `pcaRows` made, by the result and the colours. */
const ROWS = new WeakMap<PcaResult, WeakMap<PcaColours, readonly PcaRow[]>>();

/**
 * The rows of the table, one per individual in the order of the result,
 * with its group's name or its value, and its place on every component
 * kept. The same frozen array for the same result and colours, so that
 * the table sees with `===` that nothing changed.
 */
export function pcaRows(r: PcaResult, c: PcaColours): readonly PcaRow[] {
  return kept(
    kept(ROWS, r, () => new WeakMap()),
    c,
    () =>
      Object.freeze(
        r.individuals.map((individual, i) =>
          Object.freeze({
            individual,
            colour: colourOf(c, i),
            projections: Object.freeze(
              Array.from(
                r.projections.subarray(i * r.numComps, (i + 1) * r.numComps),
              ),
            ),
          }),
        ),
      ),
  );
}

/** The group's name or the value of the individual `i` in `c`, null for
    none. */
function colourOf(c: PcaColours, i: number): string | number | null {
  switch (c.kind) {
    case "groups": {
      if (c.cellTexts !== null) {
        return c.cellTexts[i] ?? null;
      }
      const group = c.group[i];
      return group === undefined ? null : (c.names[group] ?? null);
    }
    case "values": {
      const value = c.values[i];
      return value === undefined || Number.isNaN(value) ? null : value;
    }
  }
}

/**
 * The table of the individuals as the text of a CSV file: the header
 * `individual,population,PC1,…,PC10`, the second field named by the title
 * of the colours in lower case, and a row per individual, its numbers as
 * `String` writes them and an empty field for no group or no value; a
 * field that holds a comma, a quote or a new line quoted, as RFC 4180 has
 * it. Each line ends in a new line.
 */
export function pcaCsv(r: PcaResult, c: PcaColours): string {
  const components = Array.from({ length: r.numComps }, (_, i) => pc(i + 1));
  const header = ["individual", csvField(c.title.toLowerCase()), ...components];
  const lines = pcaRows(r, c).map((row) =>
    [
      csvField(row.individual),
      row.colour === null
        ? ""
        : typeof row.colour === "number"
          ? String(row.colour)
          : csvField(row.colour),
      ...row.projections.map(String),
    ].join(","),
  );
  return [header.join(","), ...lines].map((line) => `${line}\n`).join("");
}

/** The explained variance as the text of a CSV file: the header
    `component,explained_variance_percent` and a row per component kept,
    `PC1,3.5476992895181616`. Each line ends in a new line. */
export function varianceCsv(r: PcaResult): string {
  const lines = Array.from(
    r.explainedVariancePercent,
    (percent, i) => `${pc(i + 1)},${String(percent)}`,
  );
  return ["component,explained_variance_percent", ...lines]
    .map((line) => `${line}\n`)
    .join("");
}

/**
 * The coordinates of the plot as the text of the CSV that
 * vavilov-explorer, the owner's desktop application, imports
 * (docs/use-cases.md, case 3; docs/specs/analyses/pca.md, "On
 * popgen2.html"): the header `individual,PC1,…`, the components the
 * result kept, at most PC10, and a row per individual in the order of the
 * result, its projections as `String` writes them. Each name is written as
 * the variants file writes it, quoted when it holds a comma, a quote or a
 * new line, its quotes doubled, as RFC 4180 has it, and with no ' before
 * a name that starts with "=", "+", "-" or "@", which `csvField` would
 * put: vavilov-explorer finds the names again in the variants file, and
 * "'+A12" would not match "+A12". No population, which vavilov-explorer
 * would read as a component. Each line ends in a new line.
 */
export function pcaCoordinatesCsv(r: PcaResult): string {
  const components = Array.from({ length: r.numComps }, (_, i) => pc(i + 1));
  const lines = r.individuals.map((individual, i) =>
    [
      quotedName(individual),
      ...Array.from(
        r.projections.subarray(i * r.numComps, (i + 1) * r.numComps),
        String,
      ),
    ].join(","),
  );
  return [["individual", ...components].join(","), ...lines]
    .map((line) => `${line}\n`)
    .join("");
}

/** A name in a cell of the CSV of the coordinates: as it is, or quoted,
    its quotes doubled, when it holds a comma, a quote or a new line. */
function quotedName(name: string): string {
  return /[",\n\r]/u.test(name) ? `"${name.replaceAll('"', '""')}"` : name;
}

/** The minus sign the screen writes a negative number with. */
const MINUS = "−";

/** A number of the screen with the minus sign in the place of the
    hyphen. */
function withMinus(text: string): string {
  return text.replace("-", MINUS);
}

/** A centre of a group, to one decimal, with no sign for a centre that
    rounds to 0. */
function centreText(value: number): string {
  const text = value.toFixed(1);
  return text === "-0.0" ? "0.0" : withMinus(text);
}

/** A value of a column as the table writes it, to 12 significant digits,
    as tableNumber of src/charts/numbers.ts gives it. */
function valueText(value: number): string {
  return withMinus(String(Number(value.toPrecision(12))));
}

/** An explained variance, to two decimals, "3.55%". */
function percentText(r: PcaResult, component: number): string {
  const percent = r.explainedVariancePercent[component - 1];
  if (percent === undefined) {
    throw defect(
      `the description was given ${pc(component)}, beyond the result.`,
    );
  }
  return `${percent.toFixed(2)}%`;
}

/**
 * The text a screen reader reads for the plot (docs/specs/analyses/pca.md,
 * "Accessibility"): with two axes, those of the 2D plot, across and up;
 * with three, those of the 3D view, which has no across and up. It names
 * the individuals of `r` and the variants file of `p`, each axis with its
 * explained variance, and the colours: where each group with an
 * individual lies, the mean of its projections, in the order of the
 * groups and the individuals in no group last, with the group
 * `highlighted`, an index of the names or NO_COLOUR_GROUP; or the range of
 * the values and how many have none. Throws a defect for other than two
 * or three axes, an axis beyond the result, or a project with no variants
 * file.
 */
export function pcaDescription(
  r: PcaResult,
  c: PcaColours,
  axes: readonly number[],
  highlighted: number | null,
  p: Project,
): string {
  const variants = p.variants;
  if (variants === null) {
    throw defect("the description of the PCA has no variants file.");
  }
  if (axes.length !== 2 && axes.length !== 3) {
    throw defect(
      `the description of the PCA was given ${String(axes.length)} axes.`,
    );
  }
  const of = `Principal components of ${counted(r.individuals.length, "individual")} of ${escaped(variants.name)}`;
  const [first = 0, second = 0, third = 0] = axes;
  const opening =
    axes.length === 2
      ? `${of}, ${pc(first)}, ${percentText(r, first)} of the variance, across, and ${pc(second)}, ${percentText(r, second)}, up.`
      : `${of} in 3D, on ${pc(first)}, ${percentText(r, first)} of the variance, ${pc(second)}, ${percentText(r, second)}, and ${pc(third)}, ${percentText(r, third)}.`;
  const closing =
    axes.length === 2
      ? "The table of the individuals gives each one's place."
      : "The view turns, so it has no across and up; the 2D plot, one button away, shows two components at a time, and the table of the individuals gives every coordinate.";
  const colours =
    c.kind === "values"
      ? valuesDescription(c)
      : groupsDescription(r, c, axes, highlighted);
  return `${opening} ${colours} ${closing}`;
}

/** The part of the description of a colouring by values: the range of
    the values and how many individuals have none. */
function valuesDescription(
  c: Extract<PcaColours, { readonly kind: "values" }>,
): string {
  const finite = Array.from(c.values).filter((value) => !Number.isNaN(value));
  const title = `Coloured by ${shown(c.title)}`;
  if (finite.length === 0) {
    return `${title}; no individual has a value.`;
  }
  // A loop and not Math.min(...finite), whose arguments a browser caps.
  let min = Infinity;
  let max = -Infinity;
  for (const value of finite) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  const range = `${title}, from ${valueText(min)} to ${valueText(max)}`;
  return c.numNone === 0
    ? `${range}.`
    : `${range}; ${counted(c.numNone, "individual")} ${c.numNone === 1 ? "has" : "have"} no value.`;
}

/** The part of the description of a colouring by groups: where each group
    with an individual lies on the `axes`, and the group highlighted. */
function groupsDescription(
  r: PcaResult,
  c: GroupsColours,
  axes: readonly number[],
  highlighted: number | null,
): string {
  const members = new Map<number, number[]>();
  for (const [i, group] of c.group.entries()) {
    const list = members.get(group) ?? [];
    members.set(group, list);
    list.push(i);
  }
  const shownGroups = [
    ...c.names.flatMap((name, group) =>
      (c.counts[group] ?? 0) > 0 ? [[name, group] as const] : [],
    ),
    ...(c.numNone > 0 ? [[c.noneName, NO_COLOUR_GROUP] as const] : []),
  ];
  const parts = shownGroups.map(([name, group], index) => {
    const rows = members.get(group) ?? [];
    const centres = axes.map((axis) => {
      if (axis < 1 || axis > r.numComps) {
        throw defect(
          `the description was given ${pc(axis)}, beyond the result.`,
        );
      }
      let sum = 0;
      for (const row of rows) {
        sum += r.projections[row * r.numComps + axis - 1] ?? NaN;
      }
      return centreText(sum / rows.length);
    });
    return index === 0
      ? `${shown(name)}, ${counted(rows.length, "individual")}, centred at ${namesOf(centres.map((centre, i) => `${centre} on ${pc(axes[i] ?? 0)}`))}`
      : `${shown(name)}, ${grouped(rows.length)}, centred at ${namesOf(centres)}`;
  });
  const title = c.title === "Population" ? "population" : shown(c.title);
  const highlightedName =
    highlighted === null
      ? undefined
      : highlighted === NO_COLOUR_GROUP
        ? c.noneName
        : c.names[highlighted];
  const highlight =
    highlightedName === undefined
      ? ""
      : ` ${shown(highlightedName)} is highlighted.`;
  return `Coloured by ${title}: ${parts.join("; ")}.${highlight}`;
}

/**
 * The note of the individuals of the PCA `r` whose proportion of missing
 * genotypes is above MANY_MISSING_RATE in the statistics of each
 * individual `stats`, over every variant of the variants file of `p`
 * (docs/specs/analyses/pca.md, "The note of the missing genotypes"): the
 * individuals named as `namesOf` names them. `null` for the PCoA, with no
 * statistics, or with no such individual. Throws a defect on a project
 * with no variants file.
 */
export function manyMissingNote(
  r: PcaResult,
  stats: IndividualStats | null,
  p: Project,
): string | null {
  if (r.method !== "pca" || stats === null) {
    return null;
  }
  if (p.variants === null) {
    throw defect("the note of the missing genotypes has no variants file.");
  }
  const rates = new Map<string, number>();
  for (const [i, individual] of stats.individuals.entries()) {
    const rate = stats.missingGtRate[i];
    if (rate !== undefined) {
      rates.set(individual, rate);
    }
  }
  const many = r.individuals.filter(
    (individual) => (rates.get(individual) ?? 0) > MANY_MISSING_RATE,
  );
  if (many.length === 0) {
    return null;
  }
  const one = many.length === 1;
  return `${namesOf(many)} ${one ? "lacks" : "lack"} more than ${String(Math.round(MANY_MISSING_RATE * 100))}% of ${one ? "its" : "their"} genotypes over the variants of ${escaped(p.variants.name)}. The PCA gives a missing genotype the mean of its variant, which draws an individual toward the centre of the plot about as much as it lacks. The PCoA of the Kosman distances compares each pair over the variants both have called, and does not.`;
}

/** The result as the PCA's own. Throws a defect on the result of another
    analysis, which the store never gives the PCA. */
function pcaResultOf(r: JobResult): PcaResult {
  if (r.analysis !== "pca") {
    throw defect(`the PCA was given a result of ${r.analysis}.`);
  }
  return r;
}

/** `value` frozen, and every object and array it holds. */
function deepFrozen<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    for (const field of Object.values(value)) {
      deepFrozen(field);
    }
    Object.freeze(value);
  }
  return value;
}

/**
 * The definition of the principal components on the page `page`, as the
 * store knows it: the filters of individuals in its key through `keyOf`,
 * and the filters of the variants through `keyInputs`, as `pcaFilters`
 * gives them by the rule of the page, so that the store does not lock it
 * on the Variants step's LD filter that it may not read
 * (docs/specs/analyses/pca.md, "What goes into its key" and "On
 * popgen2.html"). The PCoA's limit on the known list of the individuals
 * kept is its `keptNeeds`.
 */
function definitionOf(
  page: PcaPage,
  app: AnalysisDef<Job, JobResult>["app"],
): AnalysisDef<Job, JobResult> {
  return Object.freeze({
    id: ID,
    app,
    defaults: deepFrozen(
      optionsJson(page === "popgen" ? PCA_DEFAULTS : PCA2_DEFAULTS),
    ),
    keyVersion: 1,
    filtersRead: Object.freeze({ variants: false, individuals: true }),
    parseOptions,
    keyInputs: (p: Project) => keyInputs(p, page),
    needs: (p: Project) => needs(p, page),
    keptNeeds: (p: Project, kept: IndividualsKept) => keptNeeds(p, kept, page),
    run: (p: Project, c: WorkerClient<Job, JobResult>) => run(p, c, page),
    warnings: (result: JobResult, p: Project) => warnings(result, p, page),
    checkNumbers,
    numCheckNumbers,
    script: (p: Project) => script(p, page),
  });
}

/** The principal components of the old page, listed by POPGEN_ANALYSES
    of src/core/apps.ts, for both applications. */
export const pca: AnalysisDef<Job, JobResult> = definitionOf(
  "popgen",
  Object.freeze(["popgen", "gwas"] as const),
);

/** The principal components of popgen2.html, of the same id, listed by
    POPGEN2_ANALYSES of src/core/apps.ts after variantsSummary. */
export const pcaOnPopgen2: AnalysisDef<Job, JobResult> = definitionOf(
  "popgen2",
  Object.freeze(["popgen"] as const),
);

/** The page of the definition `def` that a store runs, "popgen" for `pca`
    and "popgen2" for `pcaOnPopgen2`, from which the parts of the panel
    take the options, the colours and the words they show, so that a
    panel never shows one page's options while the store runs the other's
    definition. Throws a defect on the definition of another analysis. */
export function pcaPageOf(def: AnalysisDef<Job, JobResult>): PcaPage {
  if (def === pca) {
    return "popgen";
  }
  if (def === pcaOnPopgen2) {
    return "popgen2";
  }
  throw defect(`the page of the PCA was asked of the analysis ${def.id}.`);
}
