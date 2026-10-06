/**
 * The store of the new page of population genetics, popgen2.html
 * (docs/plans/open-variants.md, "A new page, beside the old one"): the
 * first project of the old page, with the missing data filter on at 0.1
 * as docs/functionality.md has it, which the summary of the open file
 * does not read, the analyses of `POPGEN2_ANALYSES`, and no counts of the
 * filters, no statistics of each individual for a Run to wait for, and no
 * writing, which the page does not have yet (docs/plans/live-stats.md).
 * Apart from the entry, so that a test in node makes the store with what
 * the page gives it.
 */
import { variantsSummary } from "../core/analyses/variantsSummary.ts";
import { POPGEN2_ANALYSES, countsOf, firstProject } from "../core/apps.ts";
import { CACHE_MAX_BYTES } from "../core/cache.ts";
import { MAX_UNDO_STEPS } from "../core/history.ts";
import type { AnalysisId } from "../core/project.ts";
import { createStore } from "../core/store.ts";
import type { Store, StoreConfig } from "../core/store.ts";
import type { Job, JobResult } from "../worker/protocol.ts";

/** The analyses the page starts by itself, in the groups `createAutoRuns`
    of autoRuns.ts takes: the summary of the variants file, whose one pass
    gives the count of the variants and the statistics of the open file
    (docs/plans/live-stats.md). */
export const POPGEN2_AUTO_GROUPS: readonly (readonly AnalysisId[])[] =
  Object.freeze([Object.freeze([variantsSummary.id])]);

/** What the store of the page is made with beyond `src/core/apps.ts`. */
export interface Popgen2StoreDeps {
  /** Sends a calculation under its key, `Client.run` of the worker
      client. */
  readonly send: StoreConfig<Job, JobResult, Blob>["send"];
  /** The version of the application, `APP_VERSION`. */
  readonly appVersion: string;
}

/** Makes the store of the new page. It sends nothing while it is made. */
export function createPopgen2Store(
  deps: Popgen2StoreDeps,
): Store<JobResult, Blob> {
  return createStore<Job, JobResult, Blob>({
    first: firstProject("popgen"),
    analyses: POPGEN2_ANALYSES,
    send: deps.send,
    countsOf,
    counts: null,
    // The piece that adds the filters of individuals to the page chooses
    // what a Run under such a filter waits for (docs/plans/live-stats.md,
    // "What is left out").
    statistics: null,
    write: null,
    appVersion: deps.appVersion,
    cacheMaxBytes: CACHE_MAX_BYTES,
    maxUndoSteps: MAX_UNDO_STEPS,
  });
}
