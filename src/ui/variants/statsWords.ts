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
import { counted, escaped, grouped } from "../../core/project.ts";
import type { AppState } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import { VARIANT_HISTOGRAMS } from "../steps/variants/histogramWords.ts";
import { INDIVIDUAL_HISTOGRAMS } from "../steps/variants/individualStats.ts";
import { numberText } from "../widgets/committedNumber.ts";
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

/** What a part says once the pass is stopped: Start again does not go on
    from where the Stop left it. */
export const PART_STOPPED =
  "Stopped. Start again reads the file from the start.";

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
    individuals", those in its bins; "Over 200 individuals, from the
    variants read so far" while the pass runs, `soFar`: every individual
    is there from the first variant, and their values change as it
    reads. */
export function overIndividualsLine(
  numIndividuals: number,
  soFar = false,
): string {
  const over = `Over ${counted(numIndividuals, "individual")}`;
  return soFar ? `${over}, from the variants read so far` : over;
}

/** What the description of a histogram drawn from a result so far ends
    with, for a screen reader, which does not read the line under its
    title. */
export const SO_FAR_DESCRIPTION = "Drawn from the variants read so far.";

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
    are drawn from a result so far: "Plots of panel.vcf.gz are drawn from
    the variants read so far, and change as the file is read." */
export function statsFirstText(name: string): string {
  return `Plots of ${escaped(name)} are drawn from the variants read so far, and change as the file is read.`;
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

/** The name of the threshold of the histogram of the variants of
    `statistic`, which names its line and its box: "Maximum proportion of
    missing genotypes". */
export function variantThresholdName(statistic: VariantStatistic): string {
  return VARIANT_THRESHOLD_NAMES[statistic];
}

/** The names of the thresholds of the variants, by statistic. */
const VARIANT_THRESHOLD_NAMES: Readonly<Record<VariantStatistic, string>> =
  Object.freeze({
    missingRate: "Maximum proportion of missing genotypes",
    maf: "Maximum major allele frequency",
    obsHet: "Maximum observed heterozygosity",
    unbiasedExpHet: "Maximum expected heterozygosity (unbiased)",
  });

/** The name of the threshold of the histogram of the individuals of
    `statistic`: "Maximum proportion of missing genotypes of an
    individual", told apart from the variants' of the same statistic. */
export function individualThresholdName(
  statistic: IndividualStatistic,
): string {
  return INDIVIDUAL_THRESHOLD_NAMES[statistic];
}

/** The names of the thresholds of the individuals, by statistic. */
const INDIVIDUAL_THRESHOLD_NAMES: Readonly<
  Record<IndividualStatistic, string>
> = Object.freeze({
  missingGenotypes: "Maximum proportion of missing genotypes of an individual",
  observedHeterozygosity: "Maximum observed heterozygosity of an individual",
});

/** What a threshold keeps of the variants or the individuals of one
    histogram, those with a value: from `keptLow` to `keptHigh`, one
    number when the two are equal, of `withValue`. */
export interface ThresholdCounts {
  /** The fewest it may keep. */
  readonly keptLow: number;
  /** The most it may keep, `keptLow` when the bins can tell. */
  readonly keptHigh: number;
  /** Those with a value, which it keeps or removes. */
  readonly withValue: number;
}

/** The kind of what a histogram counts, in the words under it. */
export type Counted = "variant" | "individual";

/** The line under a histogram that says its threshold and what it keeps
    and removes of those with a value: "At most 0.1: keeps 1,050 variants
    and removes 150"; with the range the bins allow, "At most 0.05: keeps
    1,113 to 1,152 variants and removes 48 to 87"; "At most 0.3: keeps all
    1,200 variants". `shown` is the number of the threshold as the box
    shows it. While the pass runs, `soFar`, the counts are of the
    variants read so far, and the line ends "so far". */
export function thresholdLine(
  shown: number,
  counts: ThresholdCounts,
  noun: Counted,
  soFar = false,
): string {
  return `At most ${numberText(shown)}: ${keepsWords(counts, noun)}${soFar ? SO_FAR : ""}`;
}

/** What the line of a threshold says to a screen reader as its value:
    the number and what it keeps of those with a value, "0.1, keeps 1,050
    of 1,200 variants", "0.05, keeps 1,113 to 1,152 of 1,200 variants",
    "0.3, keeps all 1,200 variants"; ending "so far" while the pass runs,
    `soFar`. */
export function thresholdValueText(
  shown: number,
  counts: ThresholdCounts,
  noun: Counted,
  soFar = false,
): string {
  const { keptLow, keptHigh, withValue } = counts;
  const keeps =
    withValue === 0 || (keptLow === withValue && keptHigh === withValue)
      ? keepsWords(counts, noun)
      : `keeps ${rangeText(keptLow, keptHigh)} of ${counted(withValue, noun)}`;
  return `${numberText(shown)}, ${keeps}${soFar ? SO_FAR : ""}`;
}

/** What a threshold keeps and removes, in words. */
function keepsWords(counts: ThresholdCounts, noun: Counted): string {
  const { keptLow, keptHigh, withValue } = counts;
  if (withValue === 0) return `no ${noun} has a value`;
  if (keptLow === withValue && keptHigh === withValue) {
    return withValue === 1
      ? `keeps the only ${noun}`
      : `keeps all ${counted(withValue, noun)}`;
  }
  const kept = rangeText(keptLow, keptHigh);
  const removed = rangeText(withValue - keptHigh, withValue - keptLow);
  const plural = keptLow === 1 && keptHigh === 1 ? noun : `${noun}s`;
  return `keeps ${kept} ${plural} and removes ${removed}`;
}

/** A count, or the range of two, with commas between thousands: "1,050",
    "1,113 to 1,152". */
function rangeText(low: number, high: number): string {
  return low === high ? grouped(low) : `${grouped(low)} to ${grouped(high)}`;
}

/** The line under a histogram of the individuals of those with no value,
    with a threshold on it, which neither keeps nor removes them: "3
    individuals with no called genotype are not in the histogram, and the
    threshold neither keeps nor removes them."; `null` when every one has
    a value. */
export function noValueThresholdLine(
  numNaN: number,
  soFar = false,
): string | null {
  if (numNaN === 0) return null;
  const which = soFar
    ? "with no called genotype so far"
    : "with no called genotype";
  return numNaN === 1
    ? `1 individual ${which} is not in the histogram, and the threshold neither keeps nor removes it.`
    : `${counted(numNaN, "individual")} ${which} are not in the histogram, and the threshold neither keeps nor removes them.`;
}
