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

/** The title of the histogram of the variants of `statistic`, short, at
    the start of the row of its threshold: "Obs. het." (the owner, 7
    October 2026). The axis and the plot's description for a screen
    reader keep the full name, `variantFullTitle`. */
export function variantTitle(statistic: VariantStatistic): string {
  return VARIANT_TITLES[statistic];
}

/** The short titles of the histograms of the variants, by statistic. */
const VARIANT_TITLES: Readonly<Record<VariantStatistic, string>> =
  Object.freeze({
    missingRate: "Missing genotypes",
    maf: "Major allele frequency",
    obsHet: "Obs. het.",
    unbiasedExpHet: "Exp. het. (unbiased)",
  });

/** The full name of the histogram of the variants of `statistic`, with
    no mean, which names its plot and its group for a screen reader:
    "Observed heterozygosity". */
export function variantFullTitle(statistic: VariantStatistic): string {
  return VARIANT_HISTOGRAMS[statistic].name;
}

/** The title of the histogram of the individuals of `statistic`, short:
    "Missing GTs". */
export function individualTitle(statistic: IndividualStatistic): string {
  return INDIVIDUAL_TITLES[statistic];
}

/** The short titles of the histograms of the individuals, by
    statistic. */
const INDIVIDUAL_TITLES: Readonly<Record<IndividualStatistic, string>> =
  Object.freeze({
    missingGenotypes: "Missing GTs",
    observedHeterozygosity: "Obs. het.",
  });

/** The full name of the histogram of the individuals of `statistic`:
    "Observed heterozygosity of each individual". */
export function individualFullTitle(statistic: IndividualStatistic): string {
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

/** What the description of a histogram drawn from a result so far ends
    with, for a screen reader. */
export const SO_FAR_DESCRIPTION = "Drawn from the variants read so far.";

/** What the description of a histogram of the variants says, for a
    screen reader, when its threshold keeps a range: the bar at the line
    is hatched, and why. */
export const UNDECIDED_DESCRIPTION =
  "The bar at the dashed line is hatched: the bins cannot tell how many of its variants the line keeps.";

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

/** The word after the title of a histogram, before the box of its
    threshold: "Obs. het. max: [0.04]". */
const MAX_LABEL = "max:";

/** What is drawn before the box of the threshold of a histogram titled
    `title`: "Obs. het. max:". */
export function thresholdShownLabel(title: string): string {
  return `${title} ${MAX_LABEL}`;
}

/** The name of the box and of the line of the threshold of the histogram
    of the variants of `statistic`, which starts with the words drawn
    before the box, so that the name a screen reader or a voice control
    reads holds the words seen (WCAG 2.5.3), and goes on with the full
    name: "Obs. het. max: maximum observed heterozygosity". */
export function variantThresholdName(statistic: VariantStatistic): string {
  return `${thresholdShownLabel(variantTitle(statistic))} ${VARIANT_THRESHOLD_NAMES[statistic]}`;
}

/** The full names of the thresholds of the variants, by statistic. */
const VARIANT_THRESHOLD_NAMES: Readonly<Record<VariantStatistic, string>> =
  Object.freeze({
    missingRate: "maximum proportion of missing genotypes",
    maf: "maximum major allele frequency",
    obsHet: "maximum observed heterozygosity",
    unbiasedExpHet: "maximum expected heterozygosity (unbiased)",
  });

/** The name of the box and of the line of the threshold of the histogram
    of the individuals of `statistic`, told apart from the variants' of
    the same statistic: "Missing GTs max: maximum proportion of missing
    genotypes of an individual". */
export function individualThresholdName(
  statistic: IndividualStatistic,
): string {
  return `${thresholdShownLabel(individualTitle(statistic))} ${INDIVIDUAL_THRESHOLD_NAMES[statistic]}`;
}

/** The full names of the thresholds of the individuals, by statistic. */
const INDIVIDUAL_THRESHOLD_NAMES: Readonly<
  Record<IndividualStatistic, string>
> = Object.freeze({
  missingGenotypes: "maximum proportion of missing genotypes of an individual",
  observedHeterozygosity: "maximum observed heterozygosity of an individual",
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

/** The line under the row of a threshold, over its plot: what it keeps
    of those with a value, "Keeps 1,050 of 1,200 variants", the range the
    bins allow, "Keeps 564–566 of 1,200 variants", or "Keeps all 1,200
    variants"; ending "so far" while the pass runs, `soFar`. No
    explanation of a range: the hatched bar shows it. */
export function keepsLine(
  counts: ThresholdCounts,
  noun: Counted,
  soFar = false,
): string {
  const { keptLow, keptHigh, withValue } = counts;
  const ending = soFar ? SO_FAR : "";
  if (withValue === 0) return `No ${noun} has a value${ending}`;
  if (keptLow === withValue && keptHigh === withValue) {
    return withValue === 1
      ? `Keeps the only ${noun}${ending}`
      : `Keeps all ${counted(withValue, noun)}${ending}`;
  }
  const range =
    keptLow === keptHigh
      ? grouped(keptLow)
      : `${grouped(keptLow)}–${grouped(keptHigh)}`;
  return `Keeps ${range} of ${counted(withValue, noun)}${ending}`;
}

/** What the line of a threshold says to a screen reader as its value:
    the number, `shown` as the box shows it, and what it keeps of those
    with a value, "0.1, keeps 1,050 of 1,200 variants", "0.05, keeps 1,113
    to 1,152 of 1,200 variants", "0.3, keeps all 1,200 variants"; ending
    "so far" while the pass runs, `soFar`. */
export function thresholdValueText(
  shown: number,
  counts: ThresholdCounts,
  noun: Counted,
  soFar = false,
): string {
  const { keptLow, keptHigh, withValue } = counts;
  const ending = soFar ? SO_FAR : "";
  let keeps: string;
  if (withValue === 0) {
    keeps = `no ${noun} has a value`;
  } else if (keptLow === withValue && keptHigh === withValue) {
    keeps =
      withValue === 1
        ? `keeps the only ${noun}`
        : `keeps all ${counted(withValue, noun)}`;
  } else {
    const range =
      keptLow === keptHigh
        ? grouped(keptLow)
        : `${grouped(keptLow)} to ${grouped(keptHigh)}`;
    keeps = `keeps ${range} of ${counted(withValue, noun)}`;
  }
  return `${numberText(shown)}, ${keeps}${ending}`;
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
