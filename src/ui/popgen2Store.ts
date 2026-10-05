/**
 * The store of the new page of population genetics, popgen2.html
 * (docs/plans/open-variants.md, "A new page, beside the old one"): an
 * empty project, the analyses of `POPGEN2_ANALYSES`, and no counts of
 * the filters, no statistics of each individual and no writing, which
 * the page does not have yet. Apart from the entry, so that a test in
 * node makes the store with what the page gives it.
 */
import { POPGEN2_ANALYSES, countsOf } from "../core/apps.ts";
import { CACHE_MAX_BYTES } from "../core/cache.ts";
import { MAX_UNDO_STEPS } from "../core/history.ts";
import { emptyProject } from "../core/project.ts";
import { createStore } from "../core/store.ts";
import type { Store, StoreConfig } from "../core/store.ts";
import type { Job, JobResult } from "../worker/protocol.ts";

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
    first: emptyProject("popgen"),
    analyses: POPGEN2_ANALYSES,
    send: deps.send,
    countsOf,
    counts: null,
    statistics: null,
    write: null,
    appVersion: deps.appVersion,
    cacheMaxBytes: CACHE_MAX_BYTES,
    maxUndoSteps: MAX_UNDO_STEPS,
  });
}
