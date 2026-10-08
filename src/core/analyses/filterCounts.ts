/**
 * What each filter of the variants kept: how many variants each filter
 * was given and kept in a pass over the filters of the project, which the
 * Variants step shows beside each filter. The module says what the counts
 * are calculated from, the request of the Count button, the warnings, the
 * check numbers, the lines of the Python script, the rows the step
 * reads and the words of its refusals (docs/specs/analyses/filterCounts.md,
 * "The module").
 *
 * The counts are popnei's `passStats`, over the individuals the filters
 * of individuals keep, whose list the calculation worker puts before the
 * filters of the variants. The Count button asks for them with a pass of
 * their own, and the store fills them from the result of every other
 * analysis whose pass has the project's list of the individuals kept and
 * its filters of the variants (`countsOf` of src/core/apps.ts).
 */

import {
  VARIANT_FILTER_ORDER,
  escaped,
  grouped,
  jobFilters,
} from "../project.ts";
import { filtersApplied } from "../filtersApplied.ts";
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
  FilterCountsResult,
  Job,
  JobResult,
  PassStats,
  Run,
  VariantFilterKind,
} from "../../worker/protocol.ts";
import {
  CHANGE_SETTINGS,
  ONLY_PASSED_BOX,
  defect,
  parseNoOptions,
  refusalWords,
} from "./words.ts";

/** The id of the analysis. */
const ID = "filterCounts";

/** The name of each filter of the variants, as the labels of the step
    name them, at the start of a sentence; the descriptions of the
    commands of the step name them alike (docs/specs/steps/variants.md,
    "What it sends and reads"). The two that the individuals have too
    say "of the variants", as their switches do. */
export const FILTER_NAMES: Readonly<Record<VariantFilterKind, string>> =
  Object.freeze({
    passed: "The filter of the FILTER column",
    missing_data: "The filter of the variants by missing data",
    obs_het: "The filter of the variants by observed heterozygosity",
    maf: "The MAF filter",
    ld: "The LD pruning",
  });

/** The name of the filter of the variants of the kind `kind` inside a
    sentence, "the MAF filter", "the filter of the variants by observed
    heterozygosity":
    that of `FILTER_NAMES` with its first letter in lower case. */
export function filterNameInSentence(kind: VariantFilterKind): string {
  const name = FILTER_NAMES[kind];
  return `${name.charAt(0).toLowerCase()}${name.slice(1)}`;
}

/** What one filter of the variants was given and kept. */
export interface FilterCountRow {
  /** The filter. */
  readonly kind: VariantFilterKind;
  /** The variants it was given: those the filter before it kept, and
      every variant of the file for the first. */
  readonly given: number;
  /** Those of them it kept. */
  readonly kept: number;
}

/** The rows of a result, in the order of the filters of the project it
    was asked for. Throws a defect when a filter of the project has no
    count in the result. */
export function filterCountRows(
  r: FilterCountsResult,
  p: Project,
): readonly FilterCountRow[] {
  return filtersApplied(p).map((filter) => {
    const counts = r.passStats.filtering[filter.kind];
    if (counts === undefined) {
      throw defect(
        `the counts of the filters have no count of ${filter.kind}.`,
      );
    }
    return {
      kind: filter.kind,
      given: counts.varsProcessed,
      kept: counts.varsKept,
    };
  });
}

/** The definition of the counts of the filters, as the store knows it. */
export const filterCounts: AnalysisDef<Job, JobResult> = Object.freeze({
  id: ID,
  app: Object.freeze(["popgen", "gwas"] as const),
  defaults: Object.freeze({}),
  keyVersion: 2,
  filtersRead: Object.freeze({ variants: true, individuals: true }),
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
 * The words of the error state of the Count when the statistics of each
 * individual that it waited for were refused or failed, the store's
 * error with `ofStatistics`: `statisticsFailedWords` of the statistics,
 * with "the variants were not counted", as the diversity's error table has
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
    "the variants were not counted",
  );
}

/**
 * The words of a refusal of popnei, for the error state of the Count
 * button, by the start of popnei's message: the variants file holds no
 * variant, or, for a VCF read with only the passed variants, none that
 * passed; a genotype of another ploidy than the one the VCF was read
 * with; a line of the VCF popnei cannot read, or a gzipped file damaged
 * or cut short; any other, an empty pass among them, which popnei does
 * not refuse for the Count. Throws a defect on a project with no
 * variants file.
 */
export function refusalText(message: string, p: Project): string {
  return refusalWords(message, p, {
    change: CHANGE_SETTINGS,
    calculate: "count the variants",
    nothingLeft: "there is no variant to count",
    again: "to count again",
    emptyPass: null,
  });
}

/** Nothing beyond the load and the two lists of filters, which
    `filtersRead` puts in the key: the filters of the variants, and those
    of individuals, whose list comes before them and changes what they
    count over. */
function keyInputs(): null {
  return null;
}

/** No reason beyond those every analysis shares. */
function needs(): null {
  return null;
}

/** Builds the request of the Count, the filters of the variants of the
    project in their order and the list of the individuals kept that `c`
    gives, `null` when the filters remove nobody, and sends it through `c`.
    Throws a defect when the project has no variants file, which
    `projectNeeds` rules out. */
function run(p: Project, c: WorkerClient<Job, JobResult>): Run<JobResult> {
  if (p.variants === null) {
    throw defect("the counts of the filters were run with no file.");
  }
  return c.run({
    analysis: ID,
    fileId: p.variants.fileId,
    filters: jobFilters(filtersApplied(p)),
    individuals: c.individuals,
  });
}

/**
 * The warnings of a result, given the project its request was made from:
 * `noVariant` when the file gave no variant, and otherwise
 * `filterKeptNone` for the first filter that kept none of the variants it
 * was given. Throws a defect on a project with no variants file.
 */
function warnings(result: JobResult, p: Project): readonly Warning[] {
  const r = filterCountsResultOf(result);
  const variants = p.variants;
  if (variants === null) {
    throw defect("the warnings of the counts of the filters need a file.");
  }
  const fileName = escaped(variants.name);
  if (variantsOfFile(r.passStats) === 0) {
    const text =
      variants.readOptions?.onlyPassed === true
        ? `${fileName} has no variant with PASS or . in its FILTER column, and it was read with only those. Untick "${ONLY_PASSED_BOX}" and read the file again.`
        : `${fileName} has no variants. Load another variants file.`;
    return [{ code: "noVariant", text }];
  }
  const rows = filterCountRows(r, p);
  const index = rows.findIndex((row) => row.kept === 0);
  const row = rows[index];
  if (row === undefined) {
    return [];
  }
  const given =
    row.given === 1 ? "the one variant" : `the ${grouped(row.given)} variants`;
  const loosen =
    index === 0 ? "Loosen it." : "Loosen it, or a filter before it.";
  return [
    {
      code: "filterKeptNone",
      text: `${FILTER_NAMES[row.kind]} kept none of ${given} it was given, so the analyses have no variant to calculate over, and a file written would hold none. ${loosen}`,
    },
  ];
}

/** The variants of the file, as a pass counts them: those given to its
    first filter, in the fixed order of the filters and not in the order of
    the fields of `filtering`, or the variants of the pass when it had
    none. */
export function variantsOfFile(stats: PassStats): number {
  const first = VARIANT_FILTER_ORDER.map((kind) => stats.filtering[kind]).find(
    (counts) => counts !== undefined,
  );
  return first?.varsProcessed ?? stats.numVars;
}

/** The check numbers: the variants of the file, then the variants each
    filter kept, in the fixed order of the filters. */
function checkNumbers(result: JobResult): readonly (number | null)[] {
  const stats = filterCountsResultOf(result).passStats;
  return [
    variantsOfFile(stats),
    ...VARIANT_FILTER_ORDER.flatMap((kind) => {
      const counts = stats.filtering[kind];
      return counts === undefined ? [] : [counts.varsKept];
    }),
  ];
}

/** How many numbers `checkNumbers` gives: the variants of the file, and
    one for each filter of the variants. */
function numCheckNumbers(p: Project): number {
  return 1 + filtersApplied(p).length;
}

/** The lines of the Python script that print the same counts, after the
    lines of src/core/script.ts that put the filters on `variants`. */
function script(): string {
  return [
    "# How many variants each filter was given and kept",
    "blocks = variants.iter_blocks()",
    "for _ in blocks:",
    "    pass",
    "print(blocks.pass_stats)",
  ]
    .map((line) => `${line}\n`)
    .join("");
}

/** The result as this analysis's own. Throws a defect on the result of
    another analysis: the store makes the result of the counts filled from
    another analysis before it gives it here. */
function filterCountsResultOf(r: JobResult): FilterCountsResult {
  if (r.analysis !== "filterCounts") {
    throw defect(
      `the counts of the filters were given a result of ${r.analysis}.`,
    );
  }
  return r;
}
