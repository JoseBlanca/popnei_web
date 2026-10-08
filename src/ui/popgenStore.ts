/**
 * The store of the population genetics page, made as step 3 of the
 * opening has it (docs/specs/entry.md, "At the opening"): the first
 * project and the analyses of `src/core/apps.ts`, the counts of the
 * filters, the statistics of each individual, and the writing of the
 * filtered variants, each joined to the function of the worker client
 * that sends it. Apart from the entry, so that a test in node makes the
 * store with what the page gives it.
 */
import { filterCounts } from "../core/analyses/filterCounts.ts";
import { individualChecks } from "../core/analyses/individualChecks.ts";
import {
  POPGEN_ANALYSES,
  countsOf,
  firstProject,
  individualStatsOf,
  writeCountsOf,
} from "../core/apps.ts";
import { CACHE_MAX_BYTES } from "../core/cache.ts";
import { MAX_UNDO_STEPS } from "../core/history.ts";
import { createStore } from "../core/store.ts";
import type { Store, StoreConfig } from "../core/store.ts";
import type { Job, JobResult } from "../worker/protocol.ts";

/** What the store of the page is made with beyond `src/core/apps.ts`. */
export interface PopgenStoreDeps {
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

/** Makes the store of the population genetics page. It sends nothing
    while it is made. */
export function createPopgenStore(
  deps: PopgenStoreDeps,
): Store<JobResult, Blob> {
  return createStore<Job, JobResult, Blob>({
    first: firstProject("popgen"),
    analyses: POPGEN_ANALYSES,
    send: deps.send,
    countsOf,
    counts: filterCounts.id,
    statistics: { analysis: individualChecks.id, of: individualStatsOf },
    write: { send: deps.sendWrite, countsOf: writeCountsOf },
    appVersion: deps.appVersion,
    cacheMaxBytes: CACHE_MAX_BYTES,
    maxUndoSteps: MAX_UNDO_STEPS,
  });
}
