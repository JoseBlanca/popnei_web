/**
 * The principal components of the individuals, a PCA of the genotypes or
 * a PCoA of the Kosman distances: its options, the filters of the
 * variants its job carries, when it cannot run, the request it sends, its
 * warnings, its check numbers, its lines of the Python script, and the
 * words of its error state (docs/specs/analyses/pca.md, "The module").
 *
 * Every number of a result is popnei's, from one call of
 * `doPcaFromVariants` or `doPcoaFromVariants` in the calculation worker;
 * the one arithmetic of this module is in the warning of Lingoes'
 * correction, which says how large the correction was beside the
 * distances.
 */

import type { IndividualsKept } from "../individualsKept.ts";
import type { JsonObject } from "../keys.ts";
import {
  MAX_LD_DIST,
  VARIANT_FILTER_ORDER,
  counted,
  escaped,
  grouped,
  individualsNeeds,
  jobFilters,
  shown,
  variantFilterNeeds,
} from "../project.ts";
import type { Project, ProjectVariantFilter } from "../project.ts";
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
  STEP_LD_FILTER,
  defect,
  emptySourceText,
  ldOrderText,
  refusalWords,
} from "./words.ts";
import type { LdFilterWords } from "./words.ts";
import type {
  Job,
  JobResult,
  PcaMethod,
  PcaResult,
  Run,
} from "../../worker/protocol.ts";

/** The id of the analysis. */
const ID = "pca";

/** The options of the PCA. Each of its three filters follows the Variants
    step while `follow` is true, and keeps its values meanwhile, for when
    the user sets it for the PCA again. */
export interface PcaOptions {
  /** The PCA of the genotypes, or the PCoA of the Kosman distances. */
  readonly method: PcaMethod;
  /** The PCA's missing data filter: whether it follows the Variants step,
      and its largest proportion of missing genotypes. */
  readonly missingData: {
    readonly follow: boolean;
    readonly maxAllowedMissingRate: number;
  };
  /** The PCA's MAF filter: whether it follows the Variants step, and its
      largest major allele frequency. */
  readonly maf: { readonly follow: boolean; readonly maxAllowedMaf: number };
  /** The PCA's LD filter: whether it follows the Variants step, its
      largest r², and its window in base pairs, `null` until the user
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

/** The options of the project for the PCA, or the defaults. Throws a
    defect on options `parseOptions` would refuse, which no command puts
    into a project. */
export function pcaOptions(p: Project): PcaOptions {
  const stored = p.analyses.find((a) => a.analysis === ID)?.options;
  if (stored === undefined) {
    return PCA_DEFAULTS;
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

/** The lists `pcaFilters` made, by the project's filters and then by the
    options, so that the same inputs give the same array. */
const FILTERS = new WeakMap<
  readonly ProjectVariantFilter[],
  WeakMap<PcaOptions, readonly ProjectVariantFilter[]>
>();

/**
 * The filters of the job: the project's filters on, in their fixed order,
 * with the PCA's own of each kind, missing data, MAF and LD, in the place
 * of the dataset's, or in the place of its kind when the dataset has none
 * (docs/specs/analyses/pca.md, "Which variants it reads"). A filter that
 * follows the Variants step puts nothing of its own in the list; the
 * observed heterozygosity is always the dataset's. An LD filter with no
 * distance is copied as it is, which `needs` locks on. The same frozen
 * value for the same inputs.
 */
export function pcaFilters(
  filters: readonly ProjectVariantFilter[],
  o: PcaOptions,
): readonly ProjectVariantFilter[] {
  let byOptions = FILTERS.get(filters);
  if (byOptions === undefined) {
    byOptions = new WeakMap();
    FILTERS.set(filters, byOptions);
  }
  const known = byOptions.get(o);
  if (known !== undefined) {
    return known;
  }
  const made = Object.freeze(
    VARIANT_FILTER_ORDER.flatMap((kind): ProjectVariantFilter[] => {
      const own = ownFilter(kind, o);
      if (own !== null) {
        return [own];
      }
      const dataset = filters.find((filter) => filter.kind === kind);
      return dataset === undefined ? [] : [dataset];
    }),
  );
  byOptions.set(o, made);
  return made;
}

/** The PCA's own filter of the kind `kind`, or `null` while it follows
    the Variants step, and for the observed heterozygosity, which the PCA
    has none of. */
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
    case "obs_het":
      return null;
  }
}

/** The PCA's own LD filter, in the words of a refusal. */
const PCA_LD_FILTER: LdFilterWords = Object.freeze({
  name: "The LD filter of the PCA",
  turnOff: "set the LD filter of the PCA back to as in the Variants step",
});

/** The reason of the PCA's own LD filter with no distance. */
const PRUNING_DISTANCE =
  "The LD filter of the PCA needs the distance within which variants are compared. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs, or set the LD filter of the PCA back to as in the Variants step.";

/** The reason of the lock of the PCA's own LD filter, set with no
    distance, or null; needs gives it, and the panel shows it beside the
    field of the distance (docs/specs/analyses/pca.md, "Why it cannot
    run"). A distance kept while the filter follows the Variants step
    locks nothing, since it is not used. */
export function pruningDistanceReason(p: Project): string | null {
  const ld = pcaOptions(p).ld;
  return !ld.follow && ld.maxDist === null ? PRUNING_DISTANCE : null;
}

/**
 * The first reason the PCA cannot run beyond those the store asks of
 * every analysis that reads the filters of individuals, or `null`: the LD
 * filter of the Variants step with no distance, while the PCA's LD filter
 * follows it, `variantFilterNeeds`, first, as the store asks it of the
 * diversity; for the PCA of the genotypes, more individuals in the
 * variants file than popnei's limit, which counts those of the file
 * whatever the filters of individuals keep; the individuals file, which
 * colours the points; and the PCA's own LD filter with no distance. The
 * PCoA's limit is its `keptNeeds`, since it counts the individuals kept.
 */
function needs(p: Project): string | null {
  const o = pcaOptions(p);
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
  return individualsNeeds(p) ?? pruningDistanceReason(p);
}

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
function keptNeeds(p: Project, kept: IndividualsKept): string | null {
  const variants = p.variants;
  if (
    pcaOptions(p).method !== "pcoa" ||
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
  return `${start} and the principal coordinates of more than ${limit} need more memory than a browser tab can hold. Keep at most ${limit} with the filters of individuals in the Variants step, or calculate them with popnei in Python, outside the browser.`;
}

/** Builds the request, with the individuals the filters keep that the
    store gives through `c`, and sends it through `c`. Throws a defect when
    the variants file is not loaded, and, through `jobFilters`, on an LD
    filter with no distance, which `needs` locks. */
function run(p: Project, c: WorkerClient<Job, JobResult>): Run<JobResult> {
  if (p.variants === null) {
    throw defect("the PCA was run with no variants file.");
  }
  const o = pcaOptions(p);
  return c.run({
    analysis: ID,
    fileId: p.variants.fileId,
    filters: jobFilters(pcaFilters(p.filters, o)),
    individuals: c.individuals,
    method: o.method,
    numCompsKept: PCA_NUM_COMPS_KEPT,
  });
}

/**
 * What the key holds beyond the load and the filters of individuals.
 * A stub until the key of the PCA, task 6.4 of
 * docs/plans/individuals-pca.md: it holds the method alone, and not yet
 * the filters of the job (docs/specs/analyses/pca.md, "What goes into its
 * key"), so it is not in `POPGEN_ANALYSES`. Reads nothing of
 * `p.variants`.
 */
function keyInputs(p: Project): JsonObject {
  return { method: pcaOptions(p).method };
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
 * pca.md, "The warnings"). Throws a defect on a result of another
 * analysis.
 */
function warnings(result: JobResult, p: Project): readonly Warning[] {
  const r = pcaResultOf(result);
  const name = methodName(r.method);
  const found: Warning[] = [];
  const filters = pcaFilters(p.filters, pcaOptions(p));
  if (!filters.some((filter) => filter.kind === "ld")) {
    found.push({
      code: "pruningOff",
      text: `No LD filter was applied, neither in the Variants step nor for the ${name}, so a region of the genome counts once for each of its variants, and a region of many variants in linkage disequilibrium, such as an inversion, can make a component of its own that separates the individuals by that region rather than by their ancestry. Set an LD filter for the ${name} in its options above, or for every analysis in the Variants step, unless such regions are what you are looking for.`,
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
      text: fewVariantsText(r.method, numUsed, numIndividuals),
    });
  }
  if (r.lingoesConstant !== null && r.lingoesConstant > 0) {
    found.push({ code: "lingoesCorrection", text: lingoesText(r) });
  }
  return found;
}

/** The text of `fewVariants`, for `numUsed` variants and `numIndividuals`
    individuals. */
function fewVariantsText(
  method: PcaMethod,
  numUsed: number,
  numIndividuals: number,
): string {
  const name = methodName(method);
  const individuals = `${grouped(numIndividuals)} individuals`;
  const used =
    method === "pca"
      ? `${counted(numUsed, "variant")} that ${numUsed === 1 ? "varies" : "vary"} among its ${individuals}`
      : `${counted(numUsed, "variant")} for its ${individuals}`;
  return `The ${name} used ${used}, fewer variants than individuals, so each component rests on few variants and can show chance differences as structure. If the dataset has more, loosen the filters of the ${name} in its options above, or those of the Variants step that it follows.`;
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
function script(p: Project): string {
  const variants = p.variants;
  if (variants === null) {
    throw defect("the script of the PCA needs a variants file.");
  }
  const o = pcaOptions(p);
  const filters = jobFilters(pcaFilters(p.filters, o));
  const name = JSON.stringify(variants.name);
  const read = variants.readOptions;
  const open =
    read === null
      ? `popnei.open_vars(${name})`
      : `popnei.open_vcf(${name}, ploidy=${String(read.ploidy)}, only_passed=${read.onlyPassed ? "True" : "False"})`;
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
    ...commentLines(scriptComment(o)),
    `pca_variants = ${open}`,
    ...(p.individualFilters.length === 0
      ? []
      : ["pca_variants.filter_individuals(individuals_kept)"]),
    ...filters.map(filterLine),
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
    `pca_variants`, its numbers as `String` writes them. */
function filterLine(filter: ProjectVariantFilter): string {
  switch (filter.kind) {
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
 * its distances all 0; and the rows every analysis shares, of
 * `refusalWords`: the PCoA's empty pass, the ploidy, a line of a VCF, and
 * any other, with popnei's message without its backquotes. Throws a
 * defect on a project with no variants file.
 */
export function refusalText(message: string, p: Project): string {
  const variants = p.variants;
  if (variants === null) {
    throw defect("refusalText was given a project with no variants file.");
  }
  const o = pcaOptions(p);
  const name = methodName(o.method);
  const fileName = escaped(variants.name);
  const nothingLeft = `there is no variant to do the ${name} with`;
  const nothingKept = `No variant of ${fileName} is left after the filters of the ${name}, so ${nothingLeft}. Loosen the filters the ${name} has for itself in its options above, or those of the Variants step that it follows; the Count button of the Variants step shows how many each filter of the step keeps.`;
  if (message.startsWith(NO_VARIANTS)) {
    const counted0 =
      variants.read.kind === "read" && variants.read.numVars === 0;
    return counted0 ? emptySourceText(p, nothingLeft) : nothingKept;
  }
  if (message.startsWith(NO_VARIANCE)) {
    return `No variant left after the filters varies among the individuals kept, so there is nothing to do the ${name} with. This happens with one individual, or a few of one line; keep more individuals with the filters of individuals in the Variants step.`;
  }
  const order = ldOrderText(
    message,
    p,
    o.ld.follow ? STEP_LD_FILTER : PCA_LD_FILTER,
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
    return noDistanceText(fileName, Number(pairs), individual, Number(inPairs));
  }
  if (message.startsWith(ONE_INDIVIDUAL)) {
    return `The filters of individuals keep one individual of ${fileName}, and the PCoA needs two at least to place them. Keep more individuals with the filters of individuals in the Variants step.`;
  }
  if (message.startsWith(ALL_DISTANCES_ZERO)) {
    return "Every two of the individuals kept have the same alleles at every variant both have called, so their Kosman distances are all 0 and the PCoA has nothing to place. Keep more individuals, or more variants, with the filters of the Variants step.";
  }
  return refusalWords(message, p, {
    calculate: "calculate the principal components",
    nothingLeft,
    change: CHANGE_SETTINGS,
    again: "to run it again",
    emptyPass: () => nothingKept,
    withoutBackquotes: true,
  });
}

/** The words of the PCoA's pairs of individuals with no distance: `pairs`
    of them in the variants file `fileName`, `individual` in `inPairs` of
    them. */
function noDistanceText(
  fileName: string,
  pairs: number,
  individual: string,
  inPairs: number,
): string {
  const remedy =
    "Remove the individuals with many missing genotypes with the filters of individuals in the Variants step, or use the PCA of the genotypes, which places every individual.";
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
export function crashText(p: Project, numIndividuals: number): string {
  if (p.variants === null) {
    throw defect("crashText was given a project with no variants file.");
  }
  const bytes = BYTES_PER_CELL * numIndividuals * numIndividuals;
  if (bytes < PCA_MEMORY_WORDS_BYTES) {
    return `The calculation stopped unexpectedly. Run it again. If it stops again, load ${escaped(p.variants.name)} again in the Variants step.`;
  }
  const what =
    pcaOptions(p).method === "pca"
      ? "principal components"
      : "principal coordinates";
  return `The calculation stopped unexpectedly, perhaps because the ${what} of ${counted(numIndividuals, "individual")}, which need about ${(bytes / 1e9).toFixed(1)} GB, did not fit in the memory of this tab; a phone or a tablet gives a tab far less than a computer. Keep fewer individuals with the filters of individuals in the Variants step, close other tabs and run it again, or calculate them with popnei in Python, outside the browser.`;
}

/**
 * The words of the error state of the panel when the statistics of each
 * individual that a Run waited for were refused or failed, the store's
 * error with `ofStatistics`: `statisticsFailedWords` of the statistics,
 * with "the PCA was not run", or "the PCoA".
 */
export function statisticsFailedText(
  error: AnalysisError,
  p: Project,
  failureText: (failure: Failure) => string,
): string {
  const name = methodName(pcaOptions(p).method);
  return statisticsFailedWords(
    error,
    p,
    failureText,
    `the ${name} was not run`,
  );
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
 * The definition of the principal components, as the store knows it, for
 * both applications: the filters of individuals in its key through
 * `keyOf`, and the filters of the variants through `keyInputs`, as
 * `pcaFilters` gives them, so that the store does not lock it on the
 * Variants step's LD filter that it may not read (docs/specs/analyses/
 * pca.md, "What goes into its key"). The PCoA's limit on the known list
 * of the individuals kept is its `keptNeeds`.
 */
export const pca: AnalysisDef<Job, JobResult> = Object.freeze({
  id: ID,
  app: Object.freeze(["popgen", "gwas"] as const),
  defaults: deepFrozen(optionsJson(PCA_DEFAULTS)),
  keyVersion: 1,
  filtersRead: Object.freeze({ variants: false, individuals: true }),
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
