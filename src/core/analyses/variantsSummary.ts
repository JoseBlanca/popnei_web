/**
 * The summary of the variants file: how many variants it holds, and on
 * which chromosomes, with the variants of each, over every variant and
 * every individual of the file, before any filter, so that it describes
 * the file as it is (docs/plans/open-variants.md, "The design"). The
 * module says what it is calculated from, the request, the check numbers,
 * the lines of the Python script and the rows of its table of the
 * chromosomes.
 *
 * The counts are popnei's, from one call of `calcVarDensity` in the
 * calculation worker with a window wider than any chromosome, so that it
 * gives one window per chromosome and no size of window has to be chosen.
 * Its pass reads only the chromosome and the position of each variant: it
 * finds a position that is not a number in the middle of a VCF, but not a
 * bad genotype, nor a genotype of another ploidy than the one given.
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
import { defect, parseNoOptions, pythonOpenVariants } from "./words.ts";

/** The id of the analysis. */
const ID = "variantsSummary";

/** One row of the table of the chromosomes. */
export interface ChromRow {
  /** The name of the chromosome, as the variants file has it. */
  readonly chrom: string;
  /** The variants on it. */
  readonly numVars: number;
}

/** The definition of the summary of the variants file, as the store knows
    it. */
export const variantsSummary: AnalysisDef<Job, JobResult> = Object.freeze({
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

/**
 * The rows of the table of the chromosomes of a result, in popnei's
 * order: the chromosomes with variants in the order of their first
 * variant. Throws a defect for a result of another analysis, and for one
 * whose two arrays differ in length, which the check of the messages
 * rules out.
 */
export function chromRows(result: JobResult): readonly ChromRow[] {
  const r = variantsSummaryResultOf(result);
  if (r.chroms.length !== r.numVarsPerChrom.length) {
    throw defect(
      "the summary of the variants file has chromosomes and counts of different lengths.",
    );
  }
  return r.chroms.map((chrom, i) => ({
    chrom,
    numVars: countAt(r.numVarsPerChrom, i),
  }));
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

/** Builds the request, with no filter, and sends it through `c`. Throws a
    defect when the project has no variants file, which `projectNeeds`
    rules out. */
function run(p: Project, c: WorkerClient<Job, JobResult>): Run<JobResult> {
  if (p.variants === null) {
    throw defect("the summary of the variants file was run with no file.");
  }
  return c.run({ analysis: ID, fileId: p.variants.fileId, filters: [] });
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
 * The lines of the Python script that give the same counts, opening the
 * file again with no filter, since a `Variants` takes no filter off:
 * `popnei.open_vars` for a `.nei` file, `popnei.open_vcf` with the read
 * options for a VCF. Throws a defect on a project with no variants file,
 * since it is asked only of an analysis that has run.
 */
function script(p: Project): string {
  const variants = p.variants;
  if (variants === null) {
    throw defect(
      "the script of the summary of the variants file needs a file.",
    );
  }
  const open = pythonOpenVariants(variants);
  return [
    "# The variants of the file on each chromosome, one window per chromosome",
    `variants_as_read = ${open}`,
    "variants_summary = popnei.calc_var_density(",
    "    variants_as_read,",
    `    ${String(ONE_WINDOW_PER_CHROM)},`,
    "    chrom_lengths={},",
    ")",
    'print(variants_summary.windows[["chrom", "num_vars"]].to_string())',
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

/** The count `i` of `counts`; one missing is a defect, as `chromRows`
    checks the lengths first. */
function countAt(counts: Uint32Array, i: number): number {
  const count = counts[i];
  if (count === undefined) {
    throw defect(
      `the summary of the variants file has no count at ${String(i)}.`,
    );
  }
  return count;
}
