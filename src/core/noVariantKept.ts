/**
 * Whether the one pass of popgen2.html shows for certain that the filters
 * keep no variant, so that the page says so in place of the button that
 * downloads the filtered variants and writes nothing
 * (docs/specs/analyses/writeVariants.md, "The functions of core";
 * docs/specs/steps/popgen2-download.md, "When the filters keep no
 * variant"). It reads popnei's bins and counts of the one pass and
 * computes no statistic.
 */

import { filtersApplied } from "./filtersApplied.ts";
import type { IndividualsKept } from "./individualsKept.ts";
import type { Project, ProjectVariantFilter } from "./project.ts";
import { variantsNoneKept } from "./thresholds.ts";
import type { VariantsSummaryResult } from "../worker/protocol.ts";

/**
 * Whether the one pass of popgen2.html, `summary`, finished, over every
 * variant and every individual of the file, shows for certain that the
 * filters of `p` that apply to its file keep no variant, the individuals
 * kept being `kept`. True when the filter of the FILTER column applies
 * and no variant of the file passed its FILTER, whatever the individuals;
 * or when the filters of the individuals keep every individual and one
 * threshold of the variants keeps no variant of its histogram,
 * `variantsNoneKept`. False otherwise, though the write may keep no
 * variant: with an individual left out, whose variants' values are not
 * those of the histograms, and for two filters that keep none together
 * but some each. A threshold that is no edge of the bins is a defect,
 * thrown.
 */
export function noVariantForCertain(
  p: Project,
  summary: VariantsSummaryResult,
  kept: IndividualsKept | null,
): boolean {
  const applied = filtersApplied(p);
  if (
    applied.some((f) => f.kind === "passed") &&
    summary.filterColumn?.passed === 0
  ) {
    return true;
  }
  const everyIndividual =
    kept?.list.kind === "known" && kept.list.individuals === null;
  return everyIndividual && applied.some((f) => thresholdKeepsNone(summary, f));
}

/** Whether `filter`, a threshold of the variants, keeps no variant of its
    histogram in `summary`; false for the filter of the FILTER column and
    for the LD filter, which no histogram tells. */
function thresholdKeepsNone(
  summary: VariantsSummaryResult,
  filter: ProjectVariantFilter,
): boolean {
  const part = summary.perVar;
  switch (filter.kind) {
    case "missing_data":
      return variantsNoneKept(
        part,
        "missingRate",
        filter.maxAllowedMissingRate,
      );
    case "maf":
      return variantsNoneKept(part, "maf", filter.maxAllowedMaf);
    case "obs_het":
      return variantsNoneKept(part, "obsHet", filter.maxAllowedObsHet);
    case "passed":
    case "ld":
      return false;
  }
}
