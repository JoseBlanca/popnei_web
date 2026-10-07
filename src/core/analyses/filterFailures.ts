/**
 * The count of the variants of a VCF that failed their FILTER, those whose
 * FILTER column is neither `PASS` nor a dot, which the box of the file on
 * popgen2.html says once the summary of the file is done
 * (docs/plans/live-stats.md, "The count of the FILTER failures"). The
 * module says what it is calculated from, the request, the check number
 * and the lines of the Python script.
 *
 * The numbers are popnei's, from one pass under the step `filterPassed`,
 * which keeps the variants that passed (the worker's runner says which
 * pass, and why a second when no variant passed). Its counts give the
 * variants of the file, given to that step, and those it kept; the
 * failures are the difference. The step would take the failed variants out
 * of every result of its pass, which is why it has a pass of its own and
 * the summary keeps every variant. Only for a VCF: popnei refuses the step
 * on a `.nei` file written before format 1.2, which holds no record of the
 * FILTER, and telling that refusal from another would rest on the words of
 * popnei's error.
 */

import type { Project } from "../project.ts";
import { escaped } from "../project.ts";
import type { AnalysisDef, Warning, WorkerClient } from "../store.ts";
import type {
  FilterFailuresResult,
  Job,
  JobResult,
  Run,
} from "../../worker/protocol.ts";
import { defect, parseNoOptions, pythonOpenVariants } from "./words.ts";

/** The id of the analysis. */
const ID = "filterFailures";

/** The definition of the count of the FILTER failures, as the store knows
    it. */
export const filterFailures: AnalysisDef<Job, JobResult> = Object.freeze({
  id: ID,
  app: Object.freeze(["popgen"] as const),
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
 * The variants of the file that failed their FILTER in a result of this
 * analysis: those the step `"passed"` was given and did not keep. Throws a
 * defect for a result of another analysis, and for one with no counts of
 * that step, which the check of the messages rules out.
 */
export function numFilterFailures(result: JobResult): number {
  const passed = filterFailuresResultOf(result).passStats.filtering.passed;
  if (passed === undefined) {
    throw defect("the count of the FILTER failures has no counts of its step.");
  }
  return passed.varsProcessed - passed.varsKept;
}

/** Nothing beyond the load, which every key holds: no filter, which
    `filtersRead` leaves out, and no individuals file. */
function keyInputs(): null {
  return null;
}

/** For a `.nei` file, the reason it is not counted: the FILTER of a `.nei`
    file written before format 1.2 is not in it. `null` for a VCF and with
    no file, which every analysis needs. */
function needs(p: Project): string | null {
  if (p.variants?.format !== "nei") {
    return null;
  }
  return `The variants of ${escaped(p.variants.name)} that failed their FILTER are not counted: a .nei file written before format 1.2 holds no FILTER, and the page cannot tell its format.`;
}

/** Builds the request, with no filter of the variants, and sends it
    through `c`. Throws a defect when the project has no variants file,
    which `projectNeeds` rules out. */
function run(p: Project, c: WorkerClient<Job, JobResult>): Run<JobResult> {
  if (p.variants === null) {
    throw defect("the count of the FILTER failures was run with no file.");
  }
  return c.run({ analysis: ID, fileId: p.variants.fileId, filters: [] });
}

/** None: the count is said as it is. */
function warnings(): readonly Warning[] {
  return [];
}

/** The check number: the variants that failed their FILTER. */
function checkNumbers(result: JobResult): readonly (number | null)[] {
  return [numFilterFailures(result)];
}

/** One check number for every project. */
function numCheckNumbers(): number {
  return 1;
}

/**
 * The lines of the Python script that print the same count, opening the
 * VCF again with every variant, `only_passed=False`, as the page reads it,
 * putting `filter_passed` on it, and reading its blocks to their end, a
 * pass that gives its counts also when no variant passed, where the page's
 * `calc_var_density` is refused. Throws a defect on a project with no
 * variants file, since it is asked only of an analysis that has run.
 */
function script(p: Project): string {
  const variants = p.variants;
  if (variants === null) {
    throw defect(
      "the script of the count of the FILTER failures needs a file.",
    );
  }
  return [
    "# The variants that failed their FILTER: neither PASS nor a dot",
    `variants_passed = ${pythonOpenVariants(variants)}`,
    "variants_passed.filter_passed()",
    "passed_blocks = variants_passed.iter_blocks(fields=())",
    "for _ in passed_blocks:",
    "    pass",
    'passed_counts = passed_blocks.pass_stats.filtering["passed"]',
    'print("Failed their FILTER:", passed_counts.vars_processed - passed_counts.vars_kept)',
  ]
    .map((line) => `${line}\n`)
    .join("");
}

/** The result as this analysis's own. Throws a defect on the result of
    another analysis, which the store never gives it. */
function filterFailuresResultOf(r: JobResult): FilterFailuresResult {
  if (r.analysis !== "filterFailures") {
    throw defect(
      `the count of the FILTER failures was given a result of ${r.analysis}.`,
    );
  }
  return r;
}
