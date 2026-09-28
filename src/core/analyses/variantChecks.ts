/**
 * The histograms of the variants: the major allele frequency, the
 * observed heterozygosity and the unbiased expected heterozygosity of
 * every variant of the file, before any filter and over every individual,
 * each in 40 bins over 0 to 1 with its mean. The module says what they are
 * calculated from, the request, the warning, the check numbers, the lines
 * of the Python script, the words of a refusal and the descriptions of
 * the three histograms (docs/specs/analyses/variantChecks.md, "The
 * module").
 *
 * The bins and the means are popnei's, from one call of
 * `calcPerVarDistribs` in the calculation worker; this module computes
 * none of them.
 */

import { variantsStem } from "../fileNames.ts";
import { counted, escaped, grouped } from "../project.ts";
import type { Project } from "../project.ts";
import type { AnalysisDef, Warning, WorkerClient } from "../store.ts";
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
  refusalWords,
} from "./words.ts";
import type { DescribedBin } from "./words.ts";

/** The id of the analysis. */
const ID = "variantChecks";

/** The bins of each histogram, popnei's default, given so that a new
    default of popnei does not change them unsaid. */
export const VARIANT_BINS = 40;

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

/** The three statistics of the variants that have a histogram, as the
    result names them. */
export type VariantStatistic = "maf" | "obsHet" | "unbiasedExpHet";

/** What each histogram counts, at the start of its description. */
const HISTOGRAM_SUBJECTS: Readonly<Record<VariantStatistic, string>> =
  Object.freeze({
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
  maf: "maf",
  obsHet: "obs_het",
  unbiasedExpHet: "exp_het",
});

/**
 * The name of the download of the bins of the histogram of `statistic`:
 * the stem of the variants file, `variantsStem`, then `.variant_maf`,
 * `.variant_obs_het` or `.variant_exp_het`, then `_bins.csv`;
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
  keyVersion: 1,
  filtersRead: Object.freeze({ variants: false, individuals: false }),
  parseOptions: parseNoOptions,
  keyInputs,
  needs,
  run,
  warnings,
  checkNumbers,
  numCheckNumbers,
  script,
});

/** Nothing beyond the load: it reads no filter, so only a new load, the
    read options of a VCF, the key version and the version of popnei
    change its key. */
function keyInputs(): null {
  return null;
}

/** No reason beyond those every analysis shares. */
function needs(): null {
  return null;
}

/** Builds the request, with no filter and no list of individuals, and
    sends it through `c`. Throws a defect when the project has no variants
    file, which `projectNeeds` rules out. */
function run(p: Project, c: WorkerClient<Job, JobResult>): Run<JobResult> {
  if (p.variants === null) {
    throw defect("the histograms of the variants were run with no file.");
  }
  return c.run({
    analysis: ID,
    fileId: p.variants.fileId,
    filters: [],
    individuals: null,
    minNumIndividuals: VARIANT_MIN_NUM_INDIVIDUALS,
    numBins: VARIANT_BINS,
    range: VARIANT_RANGE,
  });
}

/** The warnings of a result, given the project its request was made from:
    the variants with no called genotype, which the counts of the MAF do
    not hold. Throws a defect on a project with no variants file. */
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
  const which =
    numVars === 1
      ? `The one variant of ${fileName}`
      : `${grouped(withoutCalls)} of the ${counted(numVars, "variant")} of ${fileName}`;
  return [
    {
      code: "variantsWithoutCalls",
      text: `${which} ${one ? "has" : "have"} no called genotype, and ${one ? "is" : "are"} in none of the histograms. The filter by observed heterozygosity, the MAF filter and the LD pruning remove ${one ? "it" : "them"} at any threshold, and the missing data filter at any threshold below 1.`,
    },
  ];
}

/** The check numbers: the variants of the file, then the means of the
    major allele frequency, the observed heterozygosity and the unbiased
    expected heterozygosity, `null` for a NaN. */
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
 * the read options for a VCF. Throws a defect on a project with no
 * variants file, since it is asked only of an analysis that has run.
 */
function script(p: Project): string {
  const variants = p.variants;
  if (variants === null) {
    throw defect("the script of the histograms of the variants needs a file.");
  }
  const name = JSON.stringify(variants.name);
  const options = variants.readOptions;
  const open =
    options === null
      ? `popnei.open_vars(${name})`
      : `popnei.open_vcf(${name}, ploidy=${String(options.ploidy)}, only_passed=${options.onlyPassed ? "True" : "False"})`;
  const [low, high] = VARIANT_RANGE;
  return [
    "# The histograms of the variants, over every variant and individual of the file",
    `variants_as_read = ${open}`,
    "variant_distribs = popnei.calc_per_var_distribs(",
    "    variants_as_read,",
    "    stats=[popnei.PerVarStat.MAF, popnei.PerVarStat.OBS_HET, popnei.PerVarStat.UNBIASED_EXP_HET],",
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
