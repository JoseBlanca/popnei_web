/**
 * The histograms of the variants: the missing rate, the major allele
 * frequency, the observed heterozygosity and the unbiased expected
 * heterozygosity of every variant of the file, before any filter of the
 * variants and over the individuals the filters of individuals keep, each
 * in 40 bins over 0 to 1 with its mean, so that each shows the number its
 * filter keeps a variant by, counted as the filter counts it. The module
 * says what they are calculated from, the request, the warning, the check
 * numbers, the lines of the Python script, the words of a refusal and the
 * descriptions of the histograms of the MAF and of the two
 * heterozygosities (docs/specs/analyses/variantChecks.md, "The module").
 * The missing rate joined them on 6 October 2026, for popgen2.html
 * (docs/plans/file-stats.md); popgen.html does not draw it.
 *
 * The bins and the means are popnei's, from one call of
 * `calcPerVarDistribs` in the calculation worker; this module computes
 * none of them. popnei is asked for 1,000 bins over 0 to 1 that hold
 * their right edge, and the bins drawn are made of them by addition
 * alone: popgen.html draws them 25 at a time, popnei's 40 bins over 0 to
 * 1; popgen2.html draws about 40 over the range of the bins with a count,
 * rounded out to round numbers (docs/plans/file-stats.md, "Round 1 with
 * the owner"; docs/plans/popnei-0.2.2.md). The Python script asks popnei
 * for the 40 bins, which are those sums.
 */

import { VARIANT_BINS_CLOSED } from "../../worker/protocol.ts";
import { variantsStem } from "../fileNames.ts";
import { roundedRange } from "../histogram.ts";
import { counted, escaped, grouped } from "../project.ts";
import type { Project } from "../project.ts";
import type {
  AnalysisDef,
  AnalysisError,
  Warning,
  WorkerClient,
} from "../store.ts";
import { statisticsFailedWords } from "./individualChecks.ts";
import type { Failure } from "./individualChecks.ts";
import type {
  Job,
  JobResult,
  Run,
  VariantChecksResult,
  VariantStatsPart,
} from "../../worker/protocol.ts";
import {
  defect,
  histogramDescription,
  orNull,
  parseNoOptions,
  pythonOpenVariants,
  refusalWords,
} from "./words.ts";
import type { DescribedBin } from "./words.ts";

/** The id of the analysis. */
const ID = "variantChecks";

/** The bins of each histogram of popgen.html and of the Python script,
    popnei's default over 0 to 1, written here so that a new default of
    popnei does not change them unsaid. */
export const VARIANT_BINS = 40;

/**
 * The bins popnei is asked for over 0 to 1, 1,000, each holding its right
 * edge (`VARIANT_BINS_CLOSED`): 25 in each of the 40 of popgen.html, so
 * that 25 of them added up are popnei's bin of 40 to the last count.
 * popnei's edges are the decimals i / numBins, so the edge 25 × k of the
 * 1,000 is the edge k of the 40, and every number of up to three decimals
 * from 0 to 1 is an edge: the variants a threshold of such a number keeps,
 * those at most it, are the bins below it added up, the count popnei's
 * filter keeps. The bins of 0.05 hold 50 of them, so that every range of
 * popgen2.html, rounded to steps of 0.05 at least, starts and ends on an
 * edge of popnei. Each of the four counts is 4,000 bytes and the edges
 * 8,008 bytes, 24,008 bytes in a result where the 40 bins took 968.
 *
 * The summary of the variants file of popgen2.html asks popnei for the
 * same bins, as do `VARIANT_RANGE` and `VARIANT_MIN_NUM_INDIVIDUALS`, so
 * a change of any of the three changes the result of both analyses and
 * raises the `keyVersion` of both, this one and variantsSummary.ts.
 */
export const VARIANT_FINE_BINS = VARIANT_BINS * 25;

/** The lowest and the highest edge of the bins, popnei's default range;
    the summary of popgen2.html asks for it too, so a change raises the
    `keyVersion` of both analyses (`VARIANT_FINE_BINS`). */
export const VARIANT_RANGE: readonly [number, number] = Object.freeze([
  0, 1,
] as const);

/** popnei's `minNumIndividuals` of the histograms: 0, so that a variant
    with few called genotypes has a value, where popnei's default of 20
    would leave out the variants the missing data filter is there to
    find. The summary of popgen2.html asks for it too, so a change raises
    the `keyVersion` of both analyses (`VARIANT_FINE_BINS`). */
export const VARIANT_MIN_NUM_INDIVIDUALS = 0;

/**
 * The words of the error state of the histograms of the variants when the statistics of each
 * individual that it waited for were refused or failed, the store's
 * error with `ofStatistics`: `statisticsFailedWords` of the statistics,
 * with "the histograms of the variants were not calculated", as the diversity's error table has
 * them for "the diversity was not run" (docs/specs/analyses/diversity.md,
 * "Its words").
 */
export function statisticsFailedText(
  error: AnalysisError,
  p: Project,
  failureText: (failure: Failure) => string,
): string {
  return statisticsFailedWords(
    error,
    p,
    failureText,
    "the histograms of the variants were not calculated",
  );
}

/**
 * The words of a refusal of popnei, for the error state of the panel, by
 * the start of popnei's message: the variants file holds no variant, or,
 * for a VCF read with only the passed variants, none that passed; a
 * genotype of another ploidy than the one the VCF was read with; a line
 * of the VCF popnei cannot read, or a gzipped file damaged or cut short;
 * any other. The pass has no filter, so an empty pass has the words of
 * any other refusal, and not those that send the user to the filters.
 * Throws a defect on a project with no variants file.
 */
export function refusalText(message: string, p: Project): string {
  return refusalWords(message, p, {
    change: "Load the variants file again, or read it again with other options",
    calculate: "calculate the histograms of the variants",
    nothingLeft:
      "there is no variant to calculate the histograms of the variants over",
    again: "to calculate them again",
    emptyPass: null,
  });
}

/** The four statistics of the variants that have a histogram, as the
    result names them. The old page draws the three that stand beside
    their filters, and not the missing rate, which popgen2.html draws. */
export type VariantStatistic =
  "missingRate" | "maf" | "obsHet" | "unbiasedExpHet";

/** What each histogram counts, at the start of its description. */
const HISTOGRAM_SUBJECTS: Readonly<Record<VariantStatistic, string>> =
  Object.freeze({
    missingRate: "The proportion of missing genotypes",
    maf: "The major allele frequency",
    obsHet: "The observed heterozygosity",
    unbiasedExpHet: "The unbiased expected heterozygosity",
  });

/**
 * The description of the histogram of `statistic`, from the rows of its
 * bins that `histogramRows` gives and the threshold of its filter, `null`
 * when the filter is off or the statistic has none: "The major allele
 * frequency of 1,200 variants, in 40 bins from 0 to 1. The threshold 0.95
 * keeps the 38 bins up to it, 1,175 variants, and removes the 2 bins
 * above it, 25 variants." The variants counted are those in the bins, so
 * a variant with no called genotype is not among them. Throws a defect as
 * `histogramDescription` of words.ts does.
 */
export function variantHistogramDescription(
  statistic: VariantStatistic,
  bins: readonly DescribedBin[],
  threshold: number | null,
): string {
  return histogramDescription(
    HISTOGRAM_SUBJECTS[statistic],
    "variant",
    bins,
    threshold,
  );
}

/** The part of the name of each file of a histogram that names its
    statistic. */
const FILE_PARTS: Readonly<Record<VariantStatistic, string>> = Object.freeze({
  missingRate: "missing_genotypes",
  maf: "maf",
  obsHet: "obs_het",
  unbiasedExpHet: "exp_het",
});

/**
 * The name of the download of the bins of the histogram of `statistic`:
 * the stem of the variants file, `variantsStem`, then
 * `.variant_missing_genotypes`, `.variant_maf`, `.variant_obs_het` or
 * `.variant_exp_het`, then `_bins.csv`;
 * `panel.vcf.gz` gives `panel.variant_maf_bins.csv`
 * (docs/specs/analyses/variantChecks.md, "What it shows").
 */
export function binsCsvName(
  variantsName: string,
  statistic: VariantStatistic,
): string {
  return `${variantsStem(variantsName)}.variant_${FILE_PARTS[statistic]}_bins.csv`;
}

/** The definition of the histograms of the variants, as the store knows
    it. */
export const variantChecks: AnalysisDef<Job, JobResult> = Object.freeze({
  id: ID,
  app: Object.freeze(["popgen", "gwas"] as const),
  defaults: Object.freeze({}),
  // 3 since the result holds the missing rate, 4 since its bins are
  // 1,280 (docs/plans/file-stats.md), 5 since they are 1,000 that hold
  // their right edge (docs/plans/popnei-0.2.2.md).
  keyVersion: 5,
  filtersRead: Object.freeze({ variants: false, individuals: true }),
  parseOptions: parseNoOptions,
  keyInputs,
  needs,
  run,
  warnings,
  checkNumbers,
  numCheckNumbers,
  script,
});

/** Nothing beyond the load and the filters of individuals, which
    `filtersRead` puts in the key: no filter of the variants, which the
    pass does not have, and no individuals file. */
function keyInputs(): null {
  return null;
}

/** No reason beyond those every analysis shares. */
function needs(): null {
  return null;
}

/** Builds the request, with no filter of the variants and the list of the
    individuals kept that `c` gives, `null` when the filters remove nobody,
    and sends it through `c`. Throws a defect when the project has no
    variants file, which `projectNeeds` rules out. */
function run(p: Project, c: WorkerClient<Job, JobResult>): Run<JobResult> {
  if (p.variants === null) {
    throw defect("the histograms of the variants were run with no file.");
  }
  return c.run({
    analysis: ID,
    fileId: p.variants.fileId,
    filters: [],
    individuals: c.individuals,
    minNumIndividuals: VARIANT_MIN_NUM_INDIVIDUALS,
    numBins: VARIANT_FINE_BINS,
    range: VARIANT_RANGE,
  });
}

/**
 * The warnings of a result, given the project its request was made from:
 * the variants with no called genotype, which the counts of the MAF do not
 * hold, "among the individuals kept" when the project has a filter of
 * individuals. The result does not say whether its list removed anybody,
 * so a filter that removes nobody gives those words too, which are then
 * still true. Throws a defect on a project with no variants file.
 */
function warnings(result: JobResult, p: Project): readonly Warning[] {
  const r = variantChecksResultOf(result);
  if (p.variants === null) {
    throw defect("the warnings of the histograms of the variants need a file.");
  }
  const numVars = r.passStats.numVars;
  let binned = 0;
  for (const count of r.maf.counts) {
    binned += count;
  }
  const withoutCalls = numVars - binned;
  if (withoutCalls <= 0) {
    return [];
  }
  const one = withoutCalls === 1;
  const fileName = escaped(p.variants.name);
  const among =
    p.individualFilters.length === 0 ? "" : " among the individuals kept";
  const which =
    numVars === 1
      ? `The one variant of ${fileName}`
      : `${grouped(withoutCalls)} of the ${counted(numVars, "variant")} of ${fileName}`;
  return [
    {
      code: "variantsWithoutCalls",
      text: `${which} ${one ? "has" : "have"} no called genotype${among}, and ${one ? "is" : "are"} in none of the histograms. The filter by observed heterozygosity, the MAF filter and the LD pruning remove ${one ? "it" : "them"} at any threshold, and the missing data filter at any threshold below 1.`,
    },
  ];
}

/** The check numbers: the variants of the file, then the means of the
    major allele frequency, the observed heterozygosity and the unbiased
    expected heterozygosity, `null` for a NaN. Not the mean missing rate:
    a fifth number would make every project file saved with four refused
    at its opening (docs/plans/file-stats.md, "The design"). */
function checkNumbers(result: JobResult): readonly (number | null)[] {
  const r = variantChecksResultOf(result);
  return [
    r.passStats.numVars,
    orNull(r.maf.mean),
    orNull(r.obsHet.mean),
    orNull(r.unbiasedExpHet.mean),
  ];
}

/** Four check numbers for every project. */
function numCheckNumbers(): number {
  return 4;
}

/**
 * The lines of the Python script that calculate the same histograms,
 * opening the file again with no filter, since a `Variants` takes no
 * filter off: `popnei.open_vars` for a `.nei` file, `popnei.open_vcf` with
 * the read options for a VCF; then the list of the individuals kept,
 * `individuals_kept`, which src/core/script.ts makes before any filter,
 * when the project has a filter of individuals. It asks popnei for
 * `VARIANT_BINS` bins, 40, as many as the rows of the CSV of the bins and
 * the bars of popgen.html, and not for the 1,000 of the job, which the page
 * sums, holding their right edge as those of the job do. Throws a defect on a project with no variants file, since it is
 * asked only of an analysis that has run.
 */
function script(p: Project): string {
  const variants = p.variants;
  if (variants === null) {
    throw defect("the script of the histograms of the variants needs a file.");
  }
  const open = pythonOpenVariants(variants);
  const [low, high] = VARIANT_RANGE;
  return [
    "# The histograms of the variants, over every variant of the file and the individuals kept",
    `variants_as_read = ${open}`,
    ...(p.individualFilters.length === 0
      ? []
      : ["variants_as_read.filter_individuals(individuals_kept)"]),
    "variant_distribs = popnei.calc_per_var_distribs(",
    "    variants_as_read,",
    "    stats=[popnei.PerVarStat.MISSING_RATE, popnei.PerVarStat.MAF, popnei.PerVarStat.OBS_HET, popnei.PerVarStat.UNBIASED_EXP_HET],",
    `    min_num_individuals=${String(VARIANT_MIN_NUM_INDIVIDUALS)},`,
    `    hist_kwargs={"range": (${String(low)}, ${String(high)}), "num_bins": ${String(VARIANT_BINS)}, "closed": "${VARIANT_BINS_CLOSED}"},`,
    ")",
  ]
    .map((line) => `${line}\n`)
    .join("");
}

/** The result as this analysis's own. Throws a defect on the result of
    another analysis, which the store never gives it. */
function variantChecksResultOf(r: JobResult): VariantChecksResult {
  if (r.analysis !== "variantChecks") {
    throw defect(
      `the histograms of the variants were given a result of ${r.analysis}.`,
    );
  }
  return r;
}

/** The bins of a histogram as they are drawn. */
export interface VariantBins {
  /** The edges, one more than the bins, increasing. */
  readonly edges: Float64Array;
  /** The variants in each bin. */
  readonly counts: Uint32Array;
}

/**
 * The 40 bins over 0 to 1 that popgen.html draws of `statistic`: popnei's
 * bins added up 25 at a time, with popnei's edges at every 25th, which
 * are those of popnei's 40 bins (`VARIANT_FINE_BINS`). Throws a defect
 * for a result whose bins are not 40 times a whole number.
 */
export function variantBins(
  result: VariantStatsPart,
  statistic: VariantStatistic,
): VariantBins {
  const numFine = result[statistic].counts.length;
  if (numFine === 0 || numFine % VARIANT_BINS !== 0) {
    throw defect(
      `${String(numFine)} bins of the variants, not ${String(VARIANT_BINS)} times a whole number.`,
    );
  }
  return summed(result, statistic, 0, numFine, numFine / VARIANT_BINS);
}

/** The steps the range of a histogram of popgen2.html is rounded to: 0.05
    at least, 50 of popnei's bins, so that its two ends are edges of
    popnei's. */
const SMALLEST_STEP = 0.05;

/** The bins of a histogram of popgen2.html, about this many over its
    range. */
const ROUNDED_BINS = 40;

/** The fewest bars after the first that the missing rate is drawn in
    with bars that each can hold as many values; with fewer, its bars are
    those of the other statistics (`variantBinsRounded`). */
const LEAST_EVEN_BARS = 5;

/** The individuals the statistics of the variants are calculated over,
    every individual of the file, and their ploidy, which set the values
    the missing rate and the MAF can take, and so the narrowest bar of
    their histograms on popgen2.html. */
export interface PassIndividuals {
  readonly numIndividuals: number;
  readonly ploidy: number;
}

/**
 * The least distance between two values of `statistic` that popnei can
 * give over `numIndividuals` individuals of ploidy `ploidy`, which no bar
 * of popgen2.html is narrower than (docs/plans/popnei-0.2.2.md, "The
 * owner's first round"): 1 / n for the missing rate, the missing
 * genotypes of a variant over the n individuals of the pass, so that on
 * panel.nei, of 200 individuals, a missing rate is a multiple of 0.005;
 * 1 / (ploidy · n) for the MAF, a count of alleles over the alleles of
 * the n individuals, a few fewer where genotypes are missing. `null` for
 * the two heterozygosities, whose values have no such step, and for no
 * individual.
 */
export function variantValueSpacing(
  statistic: VariantStatistic,
  numIndividuals: number,
  ploidy: number,
): number | null {
  if (numIndividuals === 0) return null;
  switch (statistic) {
    case "missingRate":
      return 1 / numIndividuals;
    case "maf":
      return 1 / (ploidy * numIndividuals);
    case "obsHet":
    case "unbiasedExpHet":
      return null;
  }
}

/**
 * The bins of `statistic` that popgen2.html draws over the variants of
 * the pass, of `individuals`, `null` when they are not known.
 *
 * The MAF and the two heterozygosities: over the range from the first bin
 * of popnei with a count to the last, rounded out to steps of 0.05 at
 * least (`roundedRange` of histogram.ts), the number of popnei's bins in
 * each that makes the bins nearest 40, the fewer of two as near, every
 * bin the same number of popnei's. No bin of the MAF is narrower than the
 * least distance between two of its values (`variantValueSpacing`),
 * rounded up to a whole number of popnei's bins, so that no bar stands
 * empty between two values. Its values are not on an even grid where
 * genotypes are missing, so a bar may hold more values than its
 * neighbours.
 * Where a range of steps of 0.05 would hold too few such bins, it is
 * rounded to a larger step, at least that bin.
 *
 * The missing rate: from 0, its first bin is popnei's first, 0 to 0.001,
 * which holds the variants with no missing genotype alone when the
 * individuals are fewer than 1,000, their missing rates multiples of
 * 1 / n wider than it; and its next bins start at 0.001 (`missingRateBins`).
 *
 * Each count is popnei's counts added up, and the edges are popnei's. A
 * bin of popnei holds its right edge, so a MAF of 0.5 is in the bin that
 * ends at 0.5, and an axis whose least value is 0.5 starts at 0.45. With
 * no variant in a bin, the 40 bins over 0 to 1. Throws a defect for a
 * result whose ends of a range are not edges of its bins.
 */
export function variantBinsRounded(
  result: VariantStatsPart,
  statistic: VariantStatistic,
  individuals: PassIndividuals | null,
): VariantBins {
  const counts = result[statistic].counts;
  const numFine = counts.length;
  const first = counts.findIndex((count) => count > 0);
  if (first === -1) {
    return variantBins(result, statistic);
  }
  const last = counts.findLastIndex((count) => count > 0) + 1;
  if (statistic === "missingRate") {
    return missingRateBins(
      result,
      last,
      individuals === null || individuals.numIndividuals === 0
        ? null
        : individuals.numIndividuals,
    );
  }
  const spacing =
    individuals === null
      ? null
      : variantValueSpacing(
          statistic,
          individuals.numIndividuals,
          individuals.ploidy,
        );
  const leastPerBin =
    spacing === null ? 1 : Math.max(1, Math.ceil(spacing * numFine));
  const [low, high] = roundedRange(
    first / numFine,
    last / numFine,
    Math.max(SMALLEST_STEP, leastPerBin / numFine),
  );
  const from = fineIndexOf(low, numFine);
  const to = fineIndexOf(high, numFine);
  return summed(result, statistic, from, to, perBinOf(to - from, leastPerBin));
}

/**
 * The bins of the missing rate that popgen2.html draws, whose last
 * variant is in the bin of popnei that ends at the index `last`, over
 * `numIndividuals` individuals, `null` when not known; the owner, 8
 * October 2026, docs/plans/popnei-0.2.2.md.
 *
 * The first bin is popnei's first, from 0 to 0.001: with fewer than
 * 1,000 individuals, whose missing rates are multiples of 1 / n wider
 * than it, it holds the variants with no missing genotype alone, and a
 * threshold of 0 keeps it whole; with more, it holds them and those with
 * a missing rate up to 0.001.
 *
 * The next start at 0.001 and run to the end of the range, rounded out to
 * steps of 0.05 at least, in bins that each can hold as many values: a
 * whole number of popnei's bins that is a multiple of 1 / n, the smallest
 * being 1 / g of g the greatest common divisor of n and 1,000, 0.005 for
 * 200 individuals, 0.01 for 300, and the end of the range a multiple of
 * it. Such a bin holds the same number of values wherever it starts, and
 * the last, which ends at the end of the range and not 0.001 after it,
 * loses no value, since none is between the two. Of the multiples of it
 * that divide the range, the one that makes the bins nearest 40, the
 * fewer of two as near.
 *
 * Where such bins would be fewer than `LEAST_EVEN_BARS` over the range,
 * of 12 individuals, whose smallest such bin is 0.25, or of 201, whose
 * smallest is 1, they are the bins of the other statistics, no narrower
 * than 1 / n rounded up to a whole number of popnei's bins, the range
 * rounded to a larger step where it holds too few, and their number of
 * popnei's bins a divisor of the range; the last is one bin of popnei
 * narrower than the others, and a bin may hold one value more than its
 * neighbours.
 */
function missingRateBins(
  result: VariantStatsPart,
  last: number,
  numIndividuals: number | null,
): VariantBins {
  const numFine = result.missingRate.counts.length;
  const smallestStep = fineIndexOf(SMALLEST_STEP, numFine);
  const evenWidth =
    numIndividuals === null
      ? 1
      : numFine / greatestCommonDivisor(numIndividuals, numFine);
  const evenStep = leastCommonMultiple(evenWidth, smallestStep);
  const roundedEnd = fineIndexOf(
    roundedRange(0, last / numFine, SMALLEST_STEP)[1],
    numFine,
  );
  const evenEnd = Math.ceil(roundedEnd / evenStep) * evenStep;
  if (evenEnd / evenWidth >= LEAST_EVEN_BARS) {
    return summedAt(result, "missingRate", [
      0,
      ...missingRateEdges(evenEnd, evenWidth, true),
    ]);
  }
  const leastWidth =
    numIndividuals === null ? 1 : Math.ceil(numFine / numIndividuals);
  const end = fineIndexOf(
    roundedRange(
      0,
      last / numFine,
      Math.max(SMALLEST_STEP, leastWidth / numFine),
    )[1],
    numFine,
  );
  return summedAt(result, "missingRate", [
    0,
    ...missingRateEdges(end, leastWidth, false),
  ]);
}

/** The indices of popnei's edges of the bins of the missing rate from
    the edge 1, 0.001, to `end`, in bins of a number of popnei's bins
    that divides `end` and is a multiple of `width`, when `multiples`, or
    at least `width` otherwise: the one that makes the bins nearest 40,
    the fewer of two as near. The last is one bin of popnei narrower than
    the others, as it ends at `end` and not one after. */
function missingRateEdges(
  end: number,
  width: number,
  multiples: boolean,
): number[] {
  let best = end;
  const binsOf = (perBin: number): number => Math.ceil((end - 1) / perBin);
  for (let perBin = end; perBin >= width; perBin -= 1) {
    if (end % perBin !== 0 || (multiples && perBin % width !== 0)) continue;
    if (
      Math.abs(binsOf(perBin) - ROUNDED_BINS) <
      Math.abs(binsOf(best) - ROUNDED_BINS)
    ) {
      best = perBin;
    }
  }
  const edges: number[] = [];
  for (let edge = 1; edge < end; edge += best) edges.push(edge);
  edges.push(end);
  return edges;
}

/** The greatest common divisor of two whole numbers above 0. */
function greatestCommonDivisor(first: number, second: number): number {
  let [a, b] = [first, second];
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

/** The least common multiple of two whole numbers above 0. */
function leastCommonMultiple(first: number, second: number): number {
  return (first / greatestCommonDivisor(first, second)) * second;
}

/** The number of popnei's bins in each of those over `numFine` of them
    that makes them nearest `ROUNDED_BINS`, a divisor of `numFine` of at
    least `leastPerBin`, the larger of two as near; `numFine` when it is
    below `leastPerBin`. */
function perBinOf(numFine: number, leastPerBin: number): number {
  let best = numFine;
  for (let perBin = numFine; perBin >= leastPerBin; perBin -= 1) {
    if (numFine % perBin !== 0) continue;
    const distance = Math.abs(numFine / perBin - ROUNDED_BINS);
    if (distance < Math.abs(numFine / best - ROUNDED_BINS)) best = perBin;
  }
  return best;
}

/** The index of popnei's edge at `value`, a multiple of 1 / `numFine`
    within a rounding; a defect when it is none. */
function fineIndexOf(value: number, numFine: number): number {
  const index = Math.round(value * numFine);
  if (Math.abs(index - value * numFine) > 1e-9) {
    throw defect(
      `${String(value)} is no edge of ${String(numFine)} bins over 0 to 1.`,
    );
  }
  return index;
}

/**
 * popnei's bins of `statistic` from the index `from` up to `to` added up
 * `perBin` at a time, with popnei's edges at the start of each and at
 * `to`. Throws a defect when a variant is in a bin of popnei outside
 * them, which the range of the bins with a count rules out; exported so
 * that a test reaches that defect, which `variantBins` and
 * `variantBinsRounded` never give it.
 */
export function summed(
  result: VariantStatsPart,
  statistic: VariantStatistic,
  from: number,
  to: number,
  perBin: number,
): VariantBins {
  const numBins = (to - from) / perBin;
  return summedAt(
    result,
    statistic,
    Array.from({ length: numBins + 1 }, (_, bin) => from + bin * perBin),
  );
}

/**
 * popnei's bins of `statistic` added up between the indices `at` of its
 * edges, increasing, with popnei's edges at them. Throws a defect when a
 * variant is in a bin of popnei outside them.
 */
function summedAt(
  result: VariantStatsPart,
  statistic: VariantStatistic,
  at: readonly number[],
): VariantBins {
  const fine = result[statistic].counts;
  const from = at[0] ?? 0;
  const to = at.at(-1) ?? 0;
  const edges = Float64Array.from(at, (index) =>
    edgeAt(result.binEdges, index),
  );
  const counts = new Uint32Array(at.length - 1);
  let total = 0;
  let inBins = 0;
  let bin = 0;
  for (const [index, count] of fine.entries()) {
    total += count;
    if (index < from || index >= to) continue;
    while ((at[bin + 1] ?? to) <= index) bin += 1;
    const before = counts[bin];
    if (before === undefined) {
      throw defect(`no bin at ${String(bin)} of ${String(counts.length)}.`);
    }
    counts[bin] = before + count;
    inBins += count;
  }
  if (inBins !== total) {
    throw defect(
      `${String(total - inBins)} variants in bins of popnei outside ${String(from)} to ${String(to)}.`,
    );
  }
  return { edges, counts };
}

/** popnei's edge at `index`, which the callers bound. */
function edgeAt(edges: Float64Array, index: number): number {
  const edge = edges[index];
  if (edge === undefined) {
    throw defect(`no edge of the bins at ${String(index)}.`);
  }
  return edge;
}
