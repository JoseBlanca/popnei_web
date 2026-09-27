/**
 * What each application has: the definitions of its analyses, its steps
 * and its first project, and the functions by which the store reads a
 * result: what its pass counted, the counts of a written file, the
 * statistics of each individual, and the variants the filters keep
 * (docs/specs/entry.md, "`src/core/apps.ts`").
 * It holds the population genetics application alone.
 */

import { diversity } from "./analyses/diversity.ts";
import { filterCounts, variantsOfFile } from "./analyses/filterCounts.ts";
import { individualChecks } from "./analyses/individualChecks.ts";
import { variantChecks } from "./analyses/variantChecks.ts";
import { defect } from "./analyses/words.ts";
import type { IndividualStats } from "./individualsKept.ts";
import { emptyProject, setVariantFilter } from "./project.ts";
import type { Project } from "./project.ts";
import type { AnalysisDef, AppState, PassFound } from "./store.ts";
import type { Job, JobResult, PassStats } from "../worker/protocol.ts";

/**
 * The threshold of the missing data filter of a first project and of the
 * filter turned on in the Variants step, plink's default of `--geno`, as
 * the owner decided on 25 September 2026 (docs/specs/steps/variants.md,
 * "The missing data filter").
 */
export const DEFAULT_MAX_MISSING_RATE = 0.1;

/** The ploidy a VCF is read with until the user sets another in the
    Variants step, the default of popnei's `openVcf`. */
export const DEFAULT_PLOIDY = 2;

/** Whether a VCF is read with only the variants with PASS or . in the
    FILTER column until the user sets otherwise in the Variants step,
    `onlyPassed` of popnei's `openVcf`, true by default. */
export const DEFAULT_ONLY_PASSED = true;

/** The analyses of the population genetics application, in the order the
    screens show them: the three checks of the Variants step, the
    statistics of each individual, the histograms of the variants and the
    counts of what each filter kept, then the diversity. */
export const POPGEN_ANALYSES: readonly AnalysisDef<Job, JobResult>[] =
  Object.freeze([individualChecks, variantChecks, filterCounts, diversity]);

/** The steps of the population genetics application, by their ids, in
    their order. */
export const POPGEN_STEPS: readonly ["variants", "individuals", "analyses"] =
  Object.freeze(["variants", "individuals", "analyses"] as const);

/** The id of a step of the population genetics application. */
export type StepId = (typeof POPGEN_STEPS)[number];

/** The step each analysis of `POPGEN_ANALYSES` is shown in, by its id: the
    three checks in the Variants step, the diversity in the Analyses step.
    The ids are literals of their modules, never names of the user, so an
    object may hold them. */
export const POPGEN_ANALYSIS_STEPS: Readonly<Record<string, StepId>> =
  Object.freeze({
    individualChecks: "variants",
    variantChecks: "variants",
    filterCounts: "variants",
    diversity: "analyses",
  });

/** The first project of the population genetics application: an empty
    project with the missing data filter on at 0.1. */
export function firstProject(app: "popgen"): Project {
  return setVariantFilter(emptyProject(app), {
    kind: "missing_data",
    maxAllowedMissingRate: DEFAULT_MAX_MISSING_RATE,
  });
}

/**
 * What the pass of a result counted, as the store's `countsOf`, from the
 * counts of the pass every result holds, `passStats`: the number of
 * variants of the file, which the store records into the variants file of
 * its load, what the first filter of the pass was given, or what the pass
 * gave when it had no filter; and the counts of its filters, a result of
 * `filterCounts`, for a result whose pass had the filters of the variants
 * of its request's project, told by the analysis of the result: the
 * diversity, the statistics of each individual and `filterCounts` itself,
 * and not the histograms of the variants, whose pass has no filter.
 */
export function countsOf(r: JobResult): PassFound<JobResult> {
  const numVarsRead = variantsOfFile(r.passStats);
  switch (r.analysis) {
    case "diversity":
    case "individualChecks":
    case "filterCounts":
      return { numVarsRead, counts: writeCountsOf(r.passStats) };
    case "variantChecks":
      return { numVarsRead, counts: null };
  }
}

/** The result of `filterCounts` made of the counts of the pass of a
    written file, as the store's `write.countsOf`: the pass of a write
    always has the filters of the variants of its project. */
export function writeCountsOf(pass: PassStats): JobResult {
  return { analysis: "filterCounts", passStats: pass };
}

/** The variants that pass the filters of the state `s`, `passStats.numVars`
    of the result of `filterCounts` in the state done, or `null` when it is
    not done for the filters as they are: what the summary line of the
    shell and the size expected of the writing say. */
export function variantsKept(s: AppState<JobResult, unknown>): number | null {
  const counts = s.analyses.find((view) => view.id === filterCounts.id);
  return counts?.status.kind === "done"
    ? counts.status.result.passStats.numVars
    : null;
}

/** The statistics of each individual in a result of `individualChecks`,
    as the store's `statistics.of`. Throws a defect for a result of
    another analysis. */
export function individualStatsOf(r: JobResult): IndividualStats {
  if (r.analysis !== "individualChecks") {
    throw defect(
      `the statistics of each individual were asked of a result of ${r.analysis}.`,
    );
  }
  return {
    individuals: r.individuals,
    missingGtRate: r.missingGtRate,
    obsHetRate: r.obsHetRate,
  };
}
