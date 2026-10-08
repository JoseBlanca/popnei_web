/**
 * The store of the new page of population genetics, popgen2.html
 * (docs/plans/open-variants.md, "A new page, beside the old one"): its own
 * first project, `popgen2FirstProject`, with the filter of the FILTER
 * column on and the missing data filter on at 0.1, which the summary of
 * the open file does not read; the analyses of
 * `POPGEN2_ANALYSES`; no counts of the filters; the one pass,
 * `variantsSummary`, as the statistics of each individual, so that the
 * individuals kept are worked out from that pass finished; and the
 * writing of the filtered variants, as a VCF or a `.nei` file
 * (docs/specs/analyses/writeVariants.md, "On popgen2.html").
 * Apart from the entry, so that a test in node makes the store with what
 * the page gives it.
 */
import { variantsSummary } from "../core/analyses/variantsSummary.ts";
import {
  POPGEN2_ANALYSES,
  countsOf,
  popgen2FirstProject,
  writeCountsOf,
} from "../core/apps.ts";
import { CACHE_MAX_BYTES } from "../core/cache.ts";
import { MAX_UNDO_STEPS } from "../core/history.ts";
import type { IndividualStats } from "../core/individualsKept.ts";
import { loadVariants } from "../core/project.ts";
import type { AnalysisId, VariantLoad } from "../core/project.ts";
import { createStore } from "../core/store.ts";
import type { Store, StoreConfig } from "../core/store.ts";
import type { Job, JobResult } from "../worker/protocol.ts";

/** The one group of the analyses the page starts by itself, which the
    one Stop of the box stops and its Start again starts again: the
    summary of the variants file alone, whose one pass gives the count of
    the variants and the statistics of the open file, so that the page
    reads the file once (docs/plans/one-pass.md). A group, as
    `createAutoRuns` of autoRuns.ts takes them. */
export const POPGEN2_CHAIN: readonly AnalysisId[] = Object.freeze([
  variantsSummary.id,
]);

/** The analyses the page starts by itself, in the groups `createAutoRuns`
    of autoRuns.ts takes: the one group, `POPGEN2_CHAIN`. */
export const POPGEN2_AUTO_GROUPS: readonly (readonly AnalysisId[])[] =
  Object.freeze([POPGEN2_CHAIN]);

/** What the store of the page is made with beyond `src/core/apps.ts`. */
export interface Popgen2StoreDeps {
  /** Sends a calculation under its key, `Client.run` of the worker
      client. */
  readonly send: StoreConfig<Job, JobResult, Blob>["send"];
  /** Sends a write of the filtered variants under its key,
      `Client.write` of the worker client. */
  readonly sendWrite: NonNullable<
    StoreConfig<Job, JobResult, Blob>["write"]
  >["send"];
  /** The version of the application, `APP_VERSION`. */
  readonly appVersion: string;
}

/** Makes the store of the new page. It sends nothing while it is made. */
export function createPopgen2Store(
  deps: Popgen2StoreDeps,
): Store<JobResult, Blob> {
  return createStore<Job, JobResult, Blob>({
    first: popgen2FirstProject(),
    analyses: POPGEN2_ANALYSES,
    send: deps.send,
    countsOf,
    // The counts of a write are put nowhere but in its state.
    counts: null,
    // The one pass, which the page starts by itself: a second request of
    // the statistics would read the file twice.
    statistics: { analysis: variantsSummary.id, of: summaryStatsOf },
    write: { send: deps.sendWrite, countsOf: writeCountsOf },
    appVersion: deps.appVersion,
    cacheMaxBytes: CACHE_MAX_BYTES,
    maxUndoSteps: MAX_UNDO_STEPS,
    // The page has no steps, so the words of no individual kept send the
    // user to none (docs/specs/steps/popgen2-download.md, "Its words").
    keptNoneStep: null,
  });
}

/** The statistics of each individual in a result of the one pass,
    `variantsSummary`, its `perIndividual`, as the store's
    `statistics.of`. Throws a defect for a result of another analysis. */
export function summaryStatsOf(r: JobResult): IndividualStats {
  if (r.analysis !== "variantsSummary") {
    throw new Error(
      `popnei_web defect: the statistics of each individual were asked of a result of ${r.analysis}.`,
    );
  }
  const { individuals, missingGtRate, obsHetRate } = r.perIndividual;
  return { individuals, missingGtRate, obsHetRate };
}

/**
 * Opens on popgen2.html the variants file of `load`, the first or
 * another: the project with that file and every filter as the user left
 * it, as a new history with nothing to undo or redo, so that the page's
 * Undo and Redo serve the changes of the filters alone, as the owner
 * asked on 8 October 2026 (docs/specs/steps/popgen2-filters.md, "Undo,
 * Redo and their keys"). The pass of the file before, if it runs, is
 * stopped, and no notice is made.
 */
export function openVariantsFile(
  store: Pick<Store<unknown, unknown>, "open">,
  load: VariantLoad,
): void {
  store.open((p) => loadVariants(p, load));
}
