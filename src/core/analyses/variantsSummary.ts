/**
 * The summary of the variants file: how many variants it holds, and on
 * which chromosomes, with the variants of each; the histograms of the
 * variants; and the statistics of each individual, over every variant and
 * every individual of the file, before any filter, so that it describes
 * the file as it is (docs/plans/open-variants.md, "The design";
 * docs/plans/live-stats.md, "One pass for the count and the statistics").
 * The module says what it is calculated from, the request, the check
 * numbers, the lines of the Python script and the rows of its table of
 * the chromosomes.
 *
 * The numbers are popnei's, from one call of `calcVariantsSummary` in the
 * calculation worker, one pass over the file that gives three results,
 * each the same to the bit as its own call gives it: the density of
 * `calcVarDensity` with a window wider than any chromosome, so that it
 * gives one window per chromosome and no size of window has to be chosen;
 * the histograms of `calcPerVarDistribs`, with the bins, the range and the
 * least number of individuals of the histograms of the variants of
 * variantChecks.ts, over every individual; and the statistics of
 * `calcPerIndividualStats`. Its pass reads the genotypes, so a file whose
 * genotypes popnei refuses gives none of the three.
 */

import type { Project } from "../project.ts";
import type { AnalysisDef, Warning, WorkerClient } from "../store.ts";
import { ONE_WINDOW_PER_CHROM } from "../../worker/protocol.ts";
import type {
  Job,
  JobResult,
  Run,
  VariantsSummaryResult,
} from "../../worker/protocol.ts";
// The bins of the histograms of the variants, which variantChecks asks
// popnei for too: a change of any of them changes the result of both
// analyses and raises the keyVersion of both.
import {
  VARIANT_BINS,
  VARIANT_FINE_BINS,
  VARIANT_MIN_NUM_INDIVIDUALS,
  VARIANT_RANGE,
} from "./variantChecks.ts";
import { defect, parseNoOptions, pythonOpenVariants } from "./words.ts";

/** The id of the analysis. */
const ID = "variantsSummary";

/** The definition of the summary of the variants file, as the store knows
    it. */
export const variantsSummary: AnalysisDef<Job, JobResult> = Object.freeze({
  id: ID,
  app: Object.freeze(["popgen"] as const),
  defaults: Object.freeze({}),
  // 2 since the result holds the histograms of the variants and the
  // statistics of each individual (docs/plans/live-stats.md).
  keyVersion: 2,
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

/**
 * The number of chromosomes of a result, those with variants, which the
 * box of popgen2.html and its status region both say. Throws a defect for
 * a result of another analysis, and for one whose chromosomes and counts
 * differ in length, which the check of the messages rules out.
 */
export function numChroms(result: JobResult): number {
  const r = variantsSummaryResultOf(result);
  if (r.chroms.length !== r.numVarsPerChrom.length) {
    throw defect(
      "the summary of the variants file has chromosomes and counts of different lengths.",
    );
  }
  return r.chroms.length;
}

/** Nothing beyond the load, which every key holds: no filter, which
    `filtersRead` leaves out, and no individuals file. */
function keyInputs(): null {
  return null;
}

/** No reason beyond those every analysis shares. */
function needs(): null {
  return null;
}

/** Builds the request, with no filter and the bins of the histograms of
    the variants, and sends it through `c`. Throws a defect when the
    project has no variants file, which `projectNeeds` rules out. */
function run(p: Project, c: WorkerClient<Job, JobResult>): Run<JobResult> {
  if (p.variants === null) {
    throw defect("the summary of the variants file was run with no file.");
  }
  return c.run({
    analysis: ID,
    fileId: p.variants.fileId,
    filters: [],
    minNumIndividuals: VARIANT_MIN_NUM_INDIVIDUALS,
    numBins: VARIANT_FINE_BINS,
    range: VARIANT_RANGE,
  });
}

/** None: what the summary finds wrong with a file is a refusal of popnei,
    not a warning. */
function warnings(): readonly Warning[] {
  return [];
}

/** The check number: the variants of the file. */
function checkNumbers(result: JobResult): readonly (number | null)[] {
  return [variantsSummaryResultOf(result).passStats.numVars];
}

/** One check number for every project. */
function numCheckNumbers(): number {
  return 1;
}

/**
 * The lines of the Python script that give the same numbers, opening the
 * file again with no filter, since a `Variants` takes no filter off:
 * `popnei.open_vars` for a `.nei` file, `popnei.open_vcf` with the read
 * options for a VCF. popnei's Python has no `calc_variants_summary`, so
 * they are its three calls, three passes over the file: the variants on
 * each chromosome, one window per chromosome; the histograms of the
 * variants, in `VARIANT_BINS` bins, 40, and not the 1,280 of the job,
 * which the page sums; and the statistics of each individual. Throws a
 * defect on a project with no variants file, since it is asked only of an
 * analysis that has run.
 */
function script(p: Project): string {
  const variants = p.variants;
  if (variants === null) {
    throw defect(
      "the script of the summary of the variants file needs a file.",
    );
  }
  const open = pythonOpenVariants(variants);
  const [low, high] = VARIANT_RANGE;
  return [
    "# The variants of the file on each chromosome, one window per chromosome",
    `variants_as_read = ${open}`,
    "variants_summary = popnei.calc_var_density(",
    "    variants_as_read,",
    `    ${String(ONE_WINDOW_PER_CHROM)},`,
    "    chrom_lengths={},",
    ")",
    'print(variants_summary.windows[["chrom", "num_vars"]].to_string())',
    "# The histograms of the variants, over every variant and every individual of the file",
    "variant_distribs = popnei.calc_per_var_distribs(",
    "    variants_as_read,",
    "    stats=[popnei.PerVarStat.MISSING_RATE, popnei.PerVarStat.MAF, popnei.PerVarStat.OBS_HET, popnei.PerVarStat.UNBIASED_EXP_HET],",
    `    min_num_individuals=${String(VARIANT_MIN_NUM_INDIVIDUALS)},`,
    `    hist_kwargs={"range": (${String(low)}, ${String(high)}), "num_bins": ${String(VARIANT_BINS)}},`,
    ")",
    "# The statistics of each individual, over every variant of the file",
    "individual_stats = popnei.calc_per_individual_stats(variants_as_read)",
    "print(pandas.DataFrame({",
    '    "missing_genotypes": individual_stats.missing_gt_rate,',
    '    "observed_heterozygosity": individual_stats.obs_het_rate,',
    "}).to_string())",
  ]
    .map((line) => `${line}\n`)
    .join("");
}

/** The result as this analysis's own. Throws a defect on the result of
    another analysis, which the store never gives it. */
function variantsSummaryResultOf(r: JobResult): VariantsSummaryResult {
  if (r.analysis !== "variantsSummary") {
    throw defect(
      `the summary of the variants file was given a result of ${r.analysis}.`,
    );
  }
  return r;
}
