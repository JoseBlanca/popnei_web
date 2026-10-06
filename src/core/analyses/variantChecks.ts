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
 * none of them. popnei is asked for 1,280 bins over 0 to 1, and the bins
 * drawn are made of them by addition alone: popgen.html draws them 32 at
 * a time, popnei's 40 bins over 0 to 1; popgen2.html draws about 40 over
 * the range of the bins with a count, rounded out to round numbers
 * (docs/plans/file-stats.md, "Round 1 with the owner"). The Python script
 * asks popnei for the 40 bins, which are those sums.
 */

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
 * The bins popnei is asked for over 0 to 1, 1,280: 32 in each of the 40
 * of popgen.html, so that 32 of them added up are popnei's bin of 40 to
 * the last count. popnei's edges are i × (1 / numBins), and 1 / 1,280 is
 * 1 / 40 halved five times, which a double holds exactly; so the edge
 * 32 × k of the 1,280 is the double of the edge k of the 40, and a value
 * on an edge falls on the same side of both. With 1,000 bins, 8 of the
 * 41 edges differ in their last place, 0.075 against the
 * 0.07500000000000001 of the 40, and a missing rate of 15 / 200 would
 * move to the next bin. The bins of 0.05 hold 64 of them, so that every
 * range of popgen2.html, rounded to steps of 0.05 at least, starts and
 * ends on an edge of popnei. Each of the four counts is 5,120 bytes and
 * the edges 10,248 bytes, 30,728 bytes in a result where the 40 bins took
 * 968.
 */
export const VARIANT_FINE_BINS = VARIANT_BINS * 32;

/** The lowest and the highest edge of the bins, popnei's default range. */
export const VARIANT_RANGE: readonly [number, number] = Object.freeze([
  0, 1,
] as const);

/** popnei's `minNumIndividuals` of the histograms: 0, so that a variant
    with few called genotypes has a value, where popnei's default of 20
    would leave out the variants the missing data filter is there to
    find. */
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
  // 1,280 (docs/plans/file-stats.md).
  keyVersion: 4,
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
 * the bars of popgen.html, and not for the 1,280 of the job, which the page
 * sums. Throws a defect on a project with no variants file, since it is
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
    `    hist_kwargs={"range": (${String(low)}, ${String(high)}), "num_bins": ${String(VARIANT_BINS)}},`,
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
 * bins added up 32 at a time, with popnei's edges at every 32nd, which
 * are those of popnei's 40 bins (`VARIANT_FINE_BINS`). Throws a defect
 * for a result whose bins are not 40 times a whole number.
 */
export function variantBins(
  result: VariantChecksResult,
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
    at least, 64 of popnei's bins, so that its two ends are edges of
    popnei's. */
const SMALLEST_STEP = 0.05;

/** The bins of a histogram of popgen2.html, about this many over its
    range. */
const ROUNDED_BINS = 40;

/**
 * The bins of `statistic` that popgen2.html draws: over the range from
 * the first bin of popnei with a count to the last, from 0 for the
 * missing rate, the ends taken as i / 1,280 and not as popnei's edges,
 * rounded out to steps of 0.05 at least (`roundedRange` of
 * histogram.ts), the number of popnei's bins in each that makes the bins
 * nearest 40, the fewer of two as near, every bin the same number of
 * popnei's. Each count is popnei's counts added up; the inner edges are
 * popnei's, and the two ends the round numbers, which popnei's edges
 * equal or exceed by one in their last place, 0.30000000000000004 for
 * 0.3. On panel.nei the missing rate is 0 to 0.1 in 32 bins of 4. With no
 * variant in a bin, the 40 bins over 0 to 1. Throws a defect for a result
 * whose ends of a range are not edges of its bins.
 */
export function variantBinsRounded(
  result: VariantChecksResult,
  statistic: VariantStatistic,
): VariantBins {
  const counts = result[statistic].counts;
  const numFine = counts.length;
  const first = counts.findIndex((count) => count > 0);
  if (first === -1) {
    return variantBins(result, statistic);
  }
  const last = counts.findLastIndex((count) => count > 0) + 1;
  // The nominal edges, i / numFine, and not popnei's i × (1 / numFine),
  // which at 0.3 or 0.6 is one last place above the round number and
  // would be rounded up to the next step.
  const [low, high] = roundedRange(
    statistic === "missingRate" ? 0 : first / numFine,
    last / numFine,
    SMALLEST_STEP,
  );
  const from = fineIndexOf(low, numFine);
  const to = fineIndexOf(high, numFine);
  const bins = summed(result, statistic, from, to, perBinOf(to - from));
  const edges = bins.edges.slice();
  edges[0] = low;
  edges[edges.length - 1] = high;
  return { edges, counts: bins.counts };
}

/** The number of popnei's bins in each of those over `numFine` of them
    that makes them nearest `ROUNDED_BINS`, a divisor of `numFine`, the
    larger of two as near. */
function perBinOf(numFine: number): number {
  let best = numFine;
  for (let perBin = numFine; perBin >= 1; perBin -= 1) {
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
  result: VariantChecksResult,
  statistic: VariantStatistic,
  from: number,
  to: number,
  perBin: number,
): VariantBins {
  const fine = result[statistic].counts;
  const numBins = (to - from) / perBin;
  const edges = new Float64Array(numBins + 1);
  const counts = new Uint32Array(numBins);
  for (let bin = 0; bin <= numBins; bin += 1) {
    edges[bin] = edgeAt(result.binEdges, from + bin * perBin);
  }
  let total = 0;
  let inBins = 0;
  for (const [index, count] of fine.entries()) {
    total += count;
    if (index < from || index >= to) continue;
    const bin = Math.floor((index - from) / perBin);
    const before = counts[bin];
    if (before === undefined) {
      throw defect(`no bin at ${String(bin)} of ${String(numBins)}.`);
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
