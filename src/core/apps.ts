/**
 * What each application has: the definitions of its analyses, its steps
 * and its first project, and the function by which the store finds the
 * number of variants of the file in a result (docs/specs/entry.md,
 * "`src/core/apps.ts`"). In stage 2 it holds the population genetics
 * application alone.
 */

import { diversity } from "./analyses/diversity.ts";
import { emptyProject, setVariantFilter } from "./project.ts";
import type { Project } from "./project.ts";
import type { AnalysisDef } from "./store.ts";
import type { Job, JobResult } from "../worker/protocol.ts";

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
    screens show them. */
export const POPGEN_ANALYSES: readonly AnalysisDef<Job, JobResult>[] =
  Object.freeze([diversity]);

/** The steps of the population genetics application, by their ids, in
    their order. */
export const POPGEN_STEPS: readonly ["variants", "individuals", "analyses"] =
  Object.freeze(["variants", "individuals", "analyses"] as const);

/** The id of a step of the population genetics application. */
export type StepId = (typeof POPGEN_STEPS)[number];

/** The first project of the population genetics application: an empty
    project with the missing data filter on at 0.1. */
export function firstProject(app: "popgen"): Project {
  return setVariantFilter(emptyProject(app), {
    kind: "missing_data",
    maxAllowedMissingRate: DEFAULT_MAX_MISSING_RATE,
  });
}

/** The number of variants of the file that the reading of a result
    counted, which the store records into the variants file of its load:
    `numVarsRead` of the diversity, the one analysis; when `JobResult`
    gains a member without it this stops compiling, and each is read by
    its `analysis`. */
export function numVarsOf(r: JobResult): number | null {
  return r.numVarsRead;
}
