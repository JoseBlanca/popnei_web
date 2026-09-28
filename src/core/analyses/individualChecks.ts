/**
 * The statistics of each individual: its proportion of missing genotypes
 * and its observed heterozygosity over the variants the filters of the
 * variants keep, and every individual of the file. The module says what
 * they are calculated from, the request, the warnings, the check numbers,
 * the lines of the Python script, the rows and the CSV of the table, the
 * words of a refusal and the descriptions of the two histograms
 * (docs/specs/analyses/individualChecks.md, "The module").
 *
 * The two numbers of each individual are popnei's, from one call of
 * `calcPerIndividualStats` in the calculation worker. Core makes the list
 * of the individuals kept from them (src/core/individualsKept.ts), so every
 * analysis that reads the filters of individuals leans on this result.
 */

import { counted, escaped, grouped, namesOf } from "../project.ts";
import type { Project } from "../project.ts";
import type {
  AnalysisDef,
  AnalysisError,
  Warning,
  WorkerClient,
} from "../store.ts";
import type {
  IndividualChecksResult,
  Job,
  JobResult,
  Run,
} from "../../worker/protocol.ts";
import {
  CHANGE_SETTINGS,
  csvField,
  csvNumber,
  defect,
  histogramDescription,
  orNull,
  parseNoOptions,
  refusalWords,
} from "./words.ts";
import type { DescribedBin } from "./words.ts";

/** The id of the analysis. */
const ID = "individualChecks";

/** One row of the table: the individual, and its two numbers, null for
    NaN. */
export interface IndividualRow {
  /** The name of the individual, as the variants file has it. */
  readonly individual: string;
  /** Its proportion of missing genotypes over the variants the filters
      kept. */
  readonly missingGenotypes: number;
  /** Its observed heterozygosity over its called genotypes, `null` when it
      called none. */
  readonly observedHeterozygosity: number | null;
}

/** The rows of each result, so that a screen drawn again gets the same
    array. */
const ROWS = new WeakMap<IndividualChecksResult, readonly IndividualRow[]>();

/** The rows of a result, in the order of the variants file; the same
    array for the same result. Throws a defect when an array of the result
    is shorter than its individuals. */
export function individualRows(
  r: IndividualChecksResult,
): readonly IndividualRow[] {
  const kept = ROWS.get(r);
  if (kept !== undefined) {
    return kept;
  }
  const rows = Object.freeze(
    r.individuals.map((individual, i): IndividualRow =>
      Object.freeze({
        individual,
        missingGenotypes: valueAt(r.missingGtRate, i, "missingGtRate"),
        observedHeterozygosity: orNull(valueAt(r.obsHetRate, i, "obsHetRate")),
      }),
    ),
  );
  ROWS.set(r, rows);
  return rows;
}

/** The header of the CSV of the table. */
const CSV_HEADER = "individual,missing_genotypes,observed_heterozygosity";

/**
 * The table as the text of a CSV file: a header row, one row per
 * individual in the order of the variants file, the numbers as `String`
 * writes them and an empty cell for no heterozygosity, a name with a
 * comma, a quote or a new line quoted as RFC 4180 has it, and each line
 * ended by a new line. The column Kept of the screen is not in it: it is
 * of the thresholds, not of the result.
 */
export function individualChecksCsv(r: IndividualChecksResult): string {
  const lines = individualRows(r).map((row) =>
    [
      csvField(row.individual),
      String(row.missingGenotypes),
      csvNumber(row.observedHeterozygosity),
    ].join(","),
  );
  return [CSV_HEADER, ...lines].map((line) => `${line}\n`).join("");
}

/**
 * The words of a refusal of popnei, for the error state of the panel and
 * for the diversity's panel when the statistics it waited for fail, by
 * the start of popnei's message: the variants file holds no variant, or,
 * for a VCF read with only the passed variants, none that passed; the
 * filters of the variants kept none; a genotype of another ploidy than
 * the one the VCF was read with; a line of the VCF popnei cannot read, or
 * a gzipped file damaged or cut short; any other. Throws a defect on a
 * project with no variants file.
 */
export function refusalText(message: string, p: Project): string {
  return refusalWords(message, p, {
    change: CHANGE_SETTINGS,
    calculate: "calculate the statistics of each individual",
    nothingLeft:
      "there is no variant to calculate the statistics of each individual over",
    again: "to calculate them again",
    emptyPass: (fileName) =>
      `The filters kept none of the variants of ${fileName}, so there is no variant to count each individual's genotypes over. Loosen the filters of the variants in the Variants step.`,
  });
}

/** A failure of a calculation that is not popnei's refusal. */
export type Failure = Extract<
  AnalysisError,
  { readonly kind: "failed" }
>["error"];

/**
 * The words of a calculation or a write that waited for the statistics of
 * each individual when those were refused or failed, the store's error
 * with `ofStatistics`: that the statistics could not be calculated, so
 * that `notDone`, "the diversity was not run", "the file was not
 * written", then the words of the statistics' own part, their
 * `refusalText` for a refusal of popnei and `failureText`, the frame's,
 * for another failure; never the words of the calculation that waited,
 * which would name it for a calculation that was not its own
 * (docs/specs/analyses/diversity.md and writeVariants.md, "Its words").
 */
export function statisticsFailedWords(
  error: AnalysisError,
  p: Project,
  failureText: (failure: Failure) => string,
  notDone: string,
): string {
  const words =
    error.kind === "refused"
      ? refusalText(error.message, p)
      : failureText(error.error);
  return `The statistics of each individual, which the thresholds of the individuals need, could not be calculated, so ${notDone}. ${words}`;
}

/** The two statistics of each individual that have a histogram. */
export type IndividualStatistic = "missingGenotypes" | "observedHeterozygosity";

/** What each histogram counts, at the start of its description. */
const HISTOGRAM_SUBJECTS: Readonly<Record<IndividualStatistic, string>> =
  Object.freeze({
    missingGenotypes: "The proportion of missing genotypes",
    observedHeterozygosity: "The observed heterozygosity",
  });

/**
 * The description of the histogram of `statistic`, from the rows of its
 * bins that `histogramRows` gives and the threshold of its filter of
 * individuals, `null` when that filter is off: "The proportion of missing
 * genotypes of 200 individuals, in 20 bins from 0.0165 to 0.0434. The
 * threshold 0.03 keeps the 10 bins up to it, 125 individuals, splits the
 * bin from 0.0299 to 0.0313, 23 individuals, and removes the 9 bins above
 * it, 52 individuals." The individuals counted are those in the bins, so
 * an individual with no heterozygosity is not among them. Throws a defect
 * as `histogramDescription` of words.ts does.
 */
export function individualHistogramDescription(
  statistic: IndividualStatistic,
  bins: readonly DescribedBin[],
  threshold: number | null,
): string {
  return histogramDescription(
    HISTOGRAM_SUBJECTS[statistic],
    "individual",
    bins,
    threshold,
  );
}

/** The definition of the statistics of each individual, as the store
    knows it. */
export const individualChecks: AnalysisDef<Job, JobResult> = Object.freeze({
  id: ID,
  app: Object.freeze(["popgen", "gwas"] as const),
  defaults: Object.freeze({}),
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

/** Nothing beyond the load: not the filters of the variants, which the
    pass does not have; not the individuals file, which the numbers do not
    read; nor the filters of individuals, whose thresholds are moved while
    this result is read. */
function keyInputs(): null {
  return null;
}

/** No reason beyond those every analysis shares: it reads no individuals
    file and no filter of individuals. */
function needs(): null {
  return null;
}

/** Builds the request, with no filter, since the statistics are over
    every variant of the file, and sends it through `c`. Throws a defect
    when the project has no variants file, which `projectNeeds` rules out. */
function run(p: Project, c: WorkerClient<Job, JobResult>): Run<JobResult> {
  if (p.variants === null) {
    throw defect("the statistics of each individual were run with no file.");
  }
  return c.run({ analysis: ID, fileId: p.variants.fileId, filters: [] });
}

/** The warnings of a result, given the project its request was made from:
    the individuals with no called genotype, which have no observed
    heterozygosity. Throws a defect on a project with no variants file. */
function warnings(result: JobResult, p: Project): readonly Warning[] {
  const r = individualChecksResultOf(result);
  if (p.variants === null) {
    throw defect(
      "the warnings of the statistics of each individual need a file.",
    );
  }
  const withoutCalls = individualRows(r)
    .filter((row) => row.observedHeterozygosity === null)
    .map((row) => row.individual);
  if (withoutCalls.length === 0) {
    return [];
  }
  const numVars = r.passStats.numVars;
  const variantsKept =
    numVars === 1
      ? "the one variant the filters kept"
      : `the ${grouped(numVars)} variants the filters kept`;
  const names = namesOf(withoutCalls);
  const text =
    withoutCalls.length === 1
      ? `${names} has no called genotype among ${variantsKept}, so it has no observed heterozygosity. The filter of the individuals by observed heterozygosity removes it when it is on.`
      : `${counted(withoutCalls.length, "individual")} of ${escaped(p.variants.name)} have no called genotype among ${variantsKept}, so they have no observed heterozygosity: ${names}. The filter of the individuals by observed heterozygosity removes them when it is on.`;
  return [{ code: "individualsWithoutCalls", text }];
}

/**
 * The check numbers: the variants the filters kept, the mean proportion
 * of missing genotypes over every individual, and the mean observed
 * heterozygosity over the individuals that have one, `null` when none
 * has. Each mean is the sum in the order of the file over the count, the
 * same number in every browser.
 */
function checkNumbers(result: JobResult): readonly (number | null)[] {
  const rows = individualRows(individualChecksResultOf(result));
  const heterozygosities = rows.flatMap((row) =>
    row.observedHeterozygosity === null ? [] : [row.observedHeterozygosity],
  );
  return [
    result.passStats.numVars,
    meanOf(rows.map((row) => row.missingGenotypes)),
    meanOf(heterozygosities),
  ];
}

/** The mean of some numbers, the sum in their order over the count;
    `null` for none. */
function meanOf(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  let sum = 0;
  for (const value of values) {
    sum += value;
  }
  return orNull(sum / values.length);
}

/** Three check numbers for every project. */
function numCheckNumbers(): number {
  return 3;
}

/** The lines of the Python script that print the same table, after the
    lines of src/core/script.ts that make `individual_stats` before any
    filter of individuals. */
function script(): string {
  return [
    "# The statistics of each individual, over the variants the filters kept",
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
function individualChecksResultOf(r: JobResult): IndividualChecksResult {
  if (r.analysis !== "individualChecks") {
    throw defect(
      `the statistics of each individual were given a result of ${r.analysis}.`,
    );
  }
  return r;
}

/** The element `i` of an array of the result; one missing is a defect,
    as every array is as long as the individuals. */
function valueAt(values: Float64Array, i: number, name: string): number {
  const value = values[i];
  if (value === undefined) {
    throw defect(
      `the statistics of each individual have no ${name} at ${String(i)}.`,
    );
  }
  return value;
}
