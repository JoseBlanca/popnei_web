/**
 * The thresholds of popgen2.html as filters of the project
 * (docs/specs/steps/popgen2-filters.md, "What it sends and reads"): the
 * filter each histogram's threshold is, and the change of the project a
 * threshold set makes, `setThreshold` of the project, with the
 * description that names its step of Undo, chosen by comparing the
 * threshold's value, `thresholdValue`, before and after: a number then
 * another, "the MAF filter changed"; off then a number, "the MAF filter
 * was turned on"; a number then off, "the MAF filter was turned off";
 * the same value both times, no change. The names of the filters are
 * those of the old page's commands. Pure, so that a test in node checks
 * them over the projects of the page.
 */
import type { IndividualStatistic } from "../../core/analyses/individualChecks.ts";
import { filterNameInSentence } from "../../core/analyses/filterCounts.ts";
import type { VariantStatistic } from "../../core/analyses/variantChecks.ts";
import { setThreshold, thresholdValue } from "../../core/project.ts";
import type { Project, Threshold } from "../../core/project.ts";
import { THRESHOLD_WORDS } from "../steps/variants/individualThresholds.ts";

/** The filter of the threshold of the histogram of the variants of
    `statistic`; `null` for the expected heterozygosity, on which popnei
    has no filter, and whose histogram has no threshold. */
export function variantThreshold(
  statistic: VariantStatistic,
): Threshold | null {
  switch (statistic) {
    case "missingRate":
      return { of: "variants", kind: "missing_data" };
    case "maf":
      return { of: "variants", kind: "maf" };
    case "obsHet":
      return { of: "variants", kind: "obs_het" };
    case "unbiasedExpHet":
      return null;
  }
}

/** The filter of the threshold of the histogram of the individuals of
    `statistic`. */
export function individualThreshold(statistic: IndividualStatistic): Threshold {
  switch (statistic) {
    case "missingGenotypes":
      return { of: "individuals", kind: "missing_data" };
    case "observedHeterozygosity":
      return { of: "individuals", kind: "obs_het" };
  }
}

/** A change of the project and the description of its step of Undo. */
export interface ThresholdChange {
  /** The words that name the step of Undo, "the MAF filter changed". */
  readonly description: string;
  /** The command of the project. */
  readonly command: (p: Project) => Project;
}

/** The change that sets `threshold` of `p` to `value`, a number on the
    step of its axis, 1 for off, or `null` for its box emptied, as
    `setThreshold` takes it; `null` when it gives the value `p` already
    has, which is no change and leaves no step of Undo. */
export function thresholdChange(
  p: Project,
  threshold: Threshold,
  value: number | null,
): ThresholdChange | null {
  const command = (q: Project): Project => setThreshold(q, threshold, value);
  const before = thresholdValue(p, threshold);
  const after = thresholdValue(command(p), threshold);
  if (before === after) return null;
  const name = filterName(threshold);
  const what =
    before === null
      ? "was turned on"
      : after === null
        ? "was turned off"
        : "changed";
  return { description: `${name} ${what}`, command };
}

/** The name of the filter of `threshold` in the middle of a sentence:
    "the MAF filter", "the filter of individuals by missing data". */
function filterName(threshold: Threshold): string {
  return threshold.of === "variants"
    ? filterNameInSentence(threshold.kind)
    : THRESHOLD_WORDS[threshold.kind].filterName;
}
