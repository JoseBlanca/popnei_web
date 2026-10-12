/**
 * What each application has: the definitions of its analyses, its steps
 * and its first project, and the functions by which the store reads a
 * result: what its pass counted, the counts of a written file, the
 * statistics of each individual, and the variants the filters keep
 * (docs/specs/entry.md, "`src/core/apps.ts`").
 * It holds the population genetics application alone.
 */

import { diversity, diversityOnPopgen2 } from "./analyses/diversity.ts";
import { filterCounts, variantsOfFile } from "./analyses/filterCounts.ts";
import { individualChecks } from "./analyses/individualChecks.ts";
import { ldDecay, ldDecayOnPopgen2 } from "./analyses/ldDecay.ts";
import { pca, pcaOnPopgen2 } from "./analyses/pca.ts";
import { popDists, popDistsOnPopgen2 } from "./analyses/popDists.ts";
import { variantChecks } from "./analyses/variantChecks.ts";
import { variantsSummary } from "./analyses/variantsSummary.ts";
import { defect } from "./analyses/words.ts";
import type { IndividualStats } from "./individualsKept.ts";
import { emptyProject, setVariantFilter } from "./project.ts";
import type { AnalysisId, Project } from "./project.ts";
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
    screens show them: the three checks of the Variants step in the order
    of its sections, the statistics of each individual, whose section of
    the individuals comes first since 28 September 2026, then the
    histograms of the variants and the counts of what each filter kept;
    then the principal components and the diversity, in the Analyses step,
    the PCA first from stage 4, and the distances between populations and
    the LD decay after them, from stage 5, the LD decay last
    (docs/specs/entry.md, "`src/core/apps.ts`").
    The stepper names the first check in error in this order. */
export const POPGEN_ANALYSES: readonly AnalysisDef<Job, JobResult>[] =
  Object.freeze([
    individualChecks,
    variantChecks,
    filterCounts,
    pca,
    diversity,
    popDists,
    ldDecay,
  ]);

/** The analyses of the new page of population genetics, popgen2.html,
    which starts the screens again from the use cases: the summary of the
    variants file, whose one pass gives the count of the variants and the
    statistics of the open file, steps 3 and 4 of case 2 of
    docs/use-cases.md, in the one pass of each file the page makes
    (docs/plans/one-pass.md). The histograms of the
    variants and the statistics of each individual of their own requests
    are the old page's. Then the principal components of the PCA tab, the
    definition of that page, whose filters narrow those of the Variants
    tab (docs/specs/analyses/pca.md, "On popgen2.html"); then the
    diversity of the Populations tab, the definition of that page, whose
    unclassified individuals are left out or one population
    (docs/specs/analyses/diversity.md, "On popgen2.html"); from 12
    October 2026, the distances between populations of the Distances
    tab, the definition of that page (docs/specs/analyses/popDists.md,
    "On popgen2.html"), and last the LD decay of the Populations tab, the
    definition of that page (docs/specs/analyses/ldDecay.md, "On
    popgen2.html"), in the order of `POPGEN2_LIVE`. It is a list
    apart from `POPGEN_ANALYSES`, so that the old page neither shows the
    summary nor changes (docs/plans/open-variants.md, "Its own list of
    analyses"). */
export const POPGEN2_ANALYSES: readonly AnalysisDef<Job, JobResult>[] =
  Object.freeze([
    variantsSummary,
    pcaOnPopgen2,
    diversityOnPopgen2,
    popDistsOnPopgen2,
    ldDecayOnPopgen2,
  ]);

/** The analyses of popgen2.html that can be live, calculated again by
    themselves once the user's Run made each live, in the order they
    start after one change: the PCA, the diversity, from 12 October 2026
    the distances between populations of the Distances tab, and last the
    LD decay of the Populations tab (docs/specs/steps/popgen2-pca.md, "The
    PCA calculated again by itself" and "Several analyses calculated again
    by themselves"). This is the order of calculation, not that of the
    tabs, which `LIVE_TABS` of the band and the words that name several
    analyses follow: the LD decay, which may take minutes and which
    nothing interrupts, runs last, so that the others, the distances
    among them, never wait for it.
    The one list of them: the store of the page and the words of its
    locks read it, here, where popgen.html already loads it. The ids of
    `pcaOnPopgen2`, `diversityOnPopgen2`, `popDistsOnPopgen2` and
    `ldDecayOnPopgen2`, as literals, so that a table keyed by them must
    name each. */
export const POPGEN2_LIVE = Object.freeze([
  "pca",
  "diversity",
  "popDists",
  "ldDecay",
] as const);

/** The id of an analysis of popgen2.html that can be live, one of
    `POPGEN2_LIVE`. */
export type Popgen2LiveId = (typeof POPGEN2_LIVE)[number];

/** Whether `id` is one of the analyses of popgen2.html that can be
    live, `POPGEN2_LIVE`. */
export function isPopgen2Live(id: AnalysisId): id is Popgen2LiveId {
  return POPGEN2_LIVE.some((one) => one === id);
}

/** The steps of the population genetics application, by their ids, in
    their order. */
export const POPGEN_STEPS: readonly ["variants", "individuals", "analyses"] =
  Object.freeze(["variants", "individuals", "analyses"] as const);

/** The id of a step of the population genetics application. */
export type StepId = (typeof POPGEN_STEPS)[number];

/** The step each analysis of `POPGEN_ANALYSES` is shown in, by its id: the
    three checks in the Variants step, the principal components, the
    diversity, the distances between populations and the LD decay in the
    Analyses step.
    The ids are literals of their modules, never names of the user, so an
    object may hold them. */
export const POPGEN_ANALYSIS_STEPS: Readonly<Record<string, StepId>> =
  Object.freeze({
    individualChecks: "variants",
    variantChecks: "variants",
    filterCounts: "variants",
    pca: "analyses",
    diversity: "analyses",
    popDists: "analyses",
    ldDecay: "analyses",
  });

/** The first project of the population genetics application: an empty
    project with the missing data filter on at 0.1. */
export function firstProject(app: "popgen"): Project {
  return setVariantFilter(emptyProject(app), {
    kind: "missing_data",
    maxAllowedMissingRate: DEFAULT_MAX_MISSING_RATE,
  });
}

/** The first project of the new page of population genetics,
    popgen2.html: an empty project with the filter of the FILTER column on,
    the box "Leave out the variants that failed their FILTER" ticked, and
    the threshold of the missing rate of the variants on at 0.1, and no
    other filter, on or off, so the four other thresholds start off,
    never turned on (docs/specs/core/project.md, "The first project of
    popgen2.html"). The old page keeps `firstProject`. */
export function popgen2FirstProject(): Project {
  return setVariantFilter(firstProject("popgen"), { kind: "passed" });
}

/**
 * What the pass of a result counted, as the store's `countsOf`, from the
 * counts of the pass every result holds, `passStats`: the number of
 * variants of the file, which the store records into the variants file of
 * its load, what the first filter of the pass was given, or what the pass
 * gave when it had no filter; and the counts of its filters, a result of
 * `filterCounts`, for a result whose pass had the list of the individuals
 * kept and the filters of the variants of its request's project that
 * apply to its file, `filtersApplied`, told by the analysis of the result: the diversity, the distances between
 * populations and `filterCounts` itself, and not the statistics of each
 * individual and the summary of the variants file, whose passes have no
 * filter of the project, nor the histograms of the variants, whose pass
 * has the list and no filter of the variants, nor the PCA, whose filters
 * of missing data, MAF and LD can be its own in the place of the
 * project's, nor the LD decay, whose filters are the project's but the LD
 * pruning
 * (docs/architecture.md, section 4; docs/specs/entry.md).
 */
export function countsOf(r: JobResult): PassFound<JobResult> {
  const numVarsRead = variantsOfFile(r.passStats);
  switch (r.analysis) {
    case "diversity":
    case "filterCounts":
    case "popDists":
      return { numVarsRead, counts: writeCountsOf(r.passStats) };
    case "individualChecks":
    case "variantChecks":
    case "variantsSummary":
    case "pca":
    case "ldDecay":
      return { numVarsRead, counts: null };
  }
}

/** The result of `filterCounts` made of the counts of the pass of a
    written file, as the store's `write.countsOf`: the pass of a write
    always has the filters of the variants of its project that apply to
    its file, `filtersApplied`. */
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

/** The statistics of each individual in a result of the one pass of
    popgen2.html, `variantsSummary`, its `perIndividual`, as the store's
    `statistics.of` there. Throws a defect for a result of another
    analysis. Beside `individualStatsOf`, so that the result of the PCA,
    which popgen.html draws too, reads it without the modules of
    popgen2.html's store. */
export function summaryStatsOf(r: JobResult): IndividualStats {
  if (r.analysis !== "variantsSummary") {
    throw defect(
      `the statistics of each individual were asked of a result of ${r.analysis}.`,
    );
  }
  const { individuals, missingGtRate, obsHetRate } = r.perIndividual;
  return { individuals, missingGtRate, obsHetRate };
}
