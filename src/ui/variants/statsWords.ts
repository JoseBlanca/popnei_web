/**
 * The words of the statistics of the open file on popgen2.html
 * (docs/plans/file-stats.md, "The section"; docs/plans/live-stats.md): the
 * name of the section and of its two parts, what each part says while the
 * pass of the summary of the variants file runs, once it is stopped, and
 * once it failed, and what the status region says of them. The bar, Stop
 * and Start again are those of the box of the file, words.ts. They are
 * the page's own, since the words of the old page send the user to a
 * Variants step this page does not have. Pure, so that a test in node
 * checks them; the section draws them.
 */

import type { IndividualStatistic } from "../../core/analyses/individualChecks.ts";
import type { VariantStatistic } from "../../core/analyses/variantChecks.ts";
import { counted, escaped } from "../../core/project.ts";
import type { AppState } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import { VARIANT_HISTOGRAMS } from "../steps/variants/histogramWords.ts";
import { INDIVIDUAL_HISTOGRAMS } from "../steps/variants/individualStats.ts";
import { summaryStatus } from "./words.ts";

/** The two parts of the statistics of the open file, the parts of the
    result of the summary of the variants file. */
export type StatsPart = "variants" | "individuals";

/** The name of the section, which has no heading of its own: what a
    screen reader calls it, and the heading drawn in its place when it
    fails. */
export const STATS_NAME = "Statistics of the file";

/** The headings of the two parts of the section. */
export const VARIANTS_HEADING = "Variants";
export const INDIVIDUALS_HEADING = "Individuals";

/** The four histograms of the variants, in the order they are drawn. */
export const VARIANT_STATISTICS: readonly VariantStatistic[] = Object.freeze([
  "missingRate",
  "maf",
  "obsHet",
  "unbiasedExpHet",
]);

/** The two histograms of the individuals, in the order they are drawn. */
export const INDIVIDUAL_STATISTICS: readonly IndividualStatistic[] =
  Object.freeze(["missingGenotypes", "observedHeterozygosity"]);

/** The title of the histogram of the variants of `statistic`, with no
    mean: "Major allele frequency". */
export function variantTitle(statistic: VariantStatistic): string {
  return VARIANT_HISTOGRAMS[statistic].name;
}

/** The title of the histogram of the individuals of `statistic`:
    "Observed heterozygosity of each individual". */
export function individualTitle(statistic: IndividualStatistic): string {
  return INDIVIDUAL_HISTOGRAMS[statistic].title;
}

/** The button that downloads the statistics of each individual, their
    missing genotypes and their heterozygosity, as a CSV file. */
export const INDIVIDUALS_CSV_LABEL =
  "Download the missing genotypes and heterozygosity of each individual (CSV)";

/** Each part in the middle of a sentence. */
const SUBJECTS: Readonly<Record<StatsPart, string>> = Object.freeze({
  variants: "the statistics of the variants",
  individuals: "the statistics of the individuals",
});

/** The line of a part while the pass runs: "Calculating the statistics
    of the individuals… 34%", with no share before the first progress. */
export function statsRunningLine(
  part: StatsPart,
  share: number | null,
): string {
  const start = `Calculating ${SUBJECTS[part]}…`;
  return share === null ? start : `${start} ${String(share)}%`;
}

/** What a part says once the pass is stopped. */
export const PART_STOPPED = "Stopped.";

/** What a part says in place of its plots once the pass failed, whose
    words the box of the file says. */
export const PART_FAILED = "Not calculated.";

/** What a line of a plot drawn from a result so far ends with. */
const SO_FAR = " so far";

/** The line under the title of a histogram of the variants: "Over 1,200
    variants", those in its bins, which leaves out a variant with no
    value; "Over 523 variants so far" while the pass runs, `soFar`. */
export function overVariantsLine(numVars: number, soFar = false): string {
  return `Over ${counted(numVars, "variant")}${soFar ? SO_FAR : ""}`;
}

/** The line under the title of a histogram of the individuals: "Over 200
    individuals", those in its bins; "Over 200 individuals so far" while
    the pass runs, `soFar`, whose values change as it reads. */
export function overIndividualsLine(
  numIndividuals: number,
  soFar = false,
): string {
  return `Over ${counted(numIndividuals, "individual")}${soFar ? SO_FAR : ""}`;
}

/** The kind of the words of the progress of the statistics, their start
    and their end, of which the status region says only the latest said
    within one of its pauses (`replaces` of status.ts): on a small file the
    pass ends within a pause, and the region says that the statistics are
    calculated, not that they started. */
export const STATS_PROGRESS_KIND = "statsProgress";

/** What the status region says as the statistics of the file `name`
    start, by themselves or at Start again: "Calculating the statistics of
    panel.vcf.gz…". */
export function statsStartText(name: string): string {
  return `Calculating the statistics of ${escaped(name)}…`;
}

/** One text the status region says of the statistics. */
export interface StatsAnnouncement {
  /** Its words. */
  readonly text: string;
  /** `STATS_PROGRESS_KIND`: the words of the progress, which a later one
      replaces within a pause. */
  readonly replaces: typeof STATS_PROGRESS_KIND;
}

/** What the status region says as the first plots of the file `name`
    are drawn from a result so far: "The first statistics of panel.vcf.gz
    are drawn, and grow as the file is read." */
export function statsFirstText(name: string): string {
  return `The first statistics of ${escaped(name)} are drawn, and grow as the file is read.`;
}

/**
 * What the status region says of a change of the store from `before` to
 * `after` in the statistics of the open file, as a run says its start and
 * its end (react.md, "Announcements"): their start, "Calculating the
 * statistics of panel.vcf.gz…", as the pass of the summary starts, by
 * itself or at Start again; the first plots drawn, from the first result
 * so far of the pass, `statsFirstText`, and not the ones after, which
 * would talk over everything else every 2 seconds; and its end, "The
 * statistics of panel.vcf.gz are calculated." A failure and a Stop are
 * said by the box of the file, which says those of the count of the same
 * pass.
 */
export function statsAnnouncementsOf(
  before: AppState<JobResult, unknown>,
  after: AppState<JobResult, unknown>,
): readonly StatsAnnouncement[] {
  const variants = after.project.variants;
  if (variants === null) return [];
  const then = summaryStatus(before);
  const now = summaryStatus(after);
  if (now.kind === "running" && then.kind !== "running") {
    return [
      { text: statsStartText(variants.name), replaces: STATS_PROGRESS_KIND },
    ];
  }
  if (
    now.kind === "running" &&
    now.soFar !== null &&
    (then.kind !== "running" || then.soFar === null)
  ) {
    return [
      { text: statsFirstText(variants.name), replaces: STATS_PROGRESS_KIND },
    ];
  }
  if (now.kind === "done" && then.kind !== "done") {
    return [
      {
        text: `The statistics of ${escaped(variants.name)} are calculated.`,
        replaces: STATS_PROGRESS_KIND,
      },
    ];
  }
  return [];
}
