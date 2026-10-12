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
 * (docs/specs/analyses/writeVariants.md, "On popgen2.html"); the
 * settings `stopLeftBehind`, under which a change makes no notice and
 * stops what it leaves behind, and `dropLeftBehind`, under which no
 * result is kept for values the screen no longer shows; and a history of
 * one past project, which the page, with no Undo since 10 October 2026,
 * does not reach (docs/specs/core/store.md, "On popgen2.html: no notice,
 * no Undo, and no result kept for values left behind").
 * Apart from the entry, so that a test in node makes the store with what
 * the page gives it.
 */
import { variantsSummary } from "../core/analyses/variantsSummary.ts";
import {
  POPGEN2_ANALYSES,
  POPGEN2_LIVE,
  countsOf,
  isPopgen2Live,
  popgen2FirstProject,
  summaryStatsOf,
  writeCountsOf,
} from "../core/apps.ts";
import type { Popgen2LiveId } from "../core/apps.ts";
import { CACHE_MAX_BYTES } from "../core/cache.ts";
import { loadVariants } from "../core/project.ts";
import type { AnalysisId, VariantLoad } from "../core/project.ts";
import { createStore } from "../core/store.ts";
import type {
  AppState,
  Popgen2Store,
  StopLeftBehindConfig,
  Store,
  StoreConfig,
} from "../core/store.ts";
import type { Job, JobResult } from "../worker/protocol.ts";
import { diversityFailureEndsLive } from "./analyses/diversity/liveEnd.ts";
import { ldDecayFailureEndsLive } from "./analyses/ldDecay/liveEnd.ts";
import { failureEndsLive } from "./analyses/pca/liveEnd.ts";

/** The first group of the analyses the page starts by itself, which the
    one Stop of the box stops and its Start again starts again: the
    summary of the variants file alone, whose one pass gives the count of
    the variants and the statistics of the open file, so that the page
    reads the file once (docs/plans/one-pass.md). A group, as
    `createAutoRuns` of autoRuns.ts takes them. */
export const POPGEN2_CHAIN: readonly AnalysisId[] = Object.freeze([
  variantsSummary.id,
]);

/** The analyses the page starts by itself, in the groups `createAutoRuns`
    of autoRuns.ts takes: the one pass, `POPGEN2_CHAIN`, and then a group
    for each analysis that can be live, `POPGEN2_LIVE` of
    src/core/apps.ts, in its order, so that it waits for the one pass as
    its Run does, and for no other live analysis. */
export const POPGEN2_AUTO_GROUPS: readonly (readonly AnalysisId[])[] =
  Object.freeze([
    POPGEN2_CHAIN,
    ...POPGEN2_LIVE.map((id) => Object.freeze([id])),
  ]);

/** The rule of each analysis that can be live by which its failure ends
    its live state, as a Stop does: the PCA's, `failureEndsLive` of
    analyses/pca/liveEnd.ts, a crash of the memory or a failure only a
    reload mends; the diversity's, `diversityFailureEndsLive` of
    analyses/diversity/liveEnd.ts, every crash and the failures only a
    reload mends; the distances', the diversity's, which tells no crash
    from another either; the LD decay's, `ldDecayFailureEndsLive` of
    analyses/ldDecay/liveEnd.ts, the diversity's and popnei's refusal for
    memory. Keyed by `POPGEN2_LIVE`, so that an analysis added to
    it without a rule does not compile. */
const ENDS_LIVE: Readonly<
  Record<
    Popgen2LiveId,
    (s: AppState<unknown, unknown>, id: AnalysisId) => boolean
  >
> = Object.freeze({
  pca: failureEndsLive,
  diversity: diversityFailureEndsLive,
  popDists: diversityFailureEndsLive,
  ldDecay: ldDecayFailureEndsLive,
});

/** Whether the failure of the live analysis `id` in `s` ends its live
    state, by the rule of that analysis in `ENDS_LIVE`. The `endsLive`
    the page gives `createAutoRuns`. A defect for an analysis not in
    `POPGEN2_LIVE`. */
export function popgen2EndsLive(
  s: AppState<unknown, unknown>,
  id: AnalysisId,
): boolean {
  if (!isPopgen2Live(id)) {
    throw new Error(
      `popnei_web defect: ${id} is not an analysis popgen2.html calculates again by itself.`,
    );
  }
  return ENDS_LIVE[id](s, id);
}

/** The store of popgen2.html as its screens see it: no undo, no redo,
    so that a screen of that page that calls them does not compile, and
    none at run time either (`withoutUndo`). The store keeps its
    history, which the code of popgen.html needs, and the state still
    names its undo and redo, which no screen of the page reads. */
export type Popgen2PageStore<R, F = never> = Omit<
  Popgen2Store<R, F>,
  "undo" | "redo"
>;

/** The past projects the page's store keeps: one, the least the history
    takes, where the old page keeps 200; the page has no Undo to reach
    them. */
const POPGEN2_UNDO_STEPS = 1;

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
): Popgen2PageStore<JobResult, Blob> {
  return withoutUndo(createStore(popgen2StoreConfig(deps)));
}

/** A copy of `store` without its undo and redo, at run time as in its
    type, so that no code of popgen2.html reaches them through a cast or
    a spread: the page has had no Undo since 10 October 2026. */
export function withoutUndo<R, F>(
  store: Popgen2PageStore<R, F>,
): Popgen2PageStore<R, F> {
  const page = { ...store };
  Reflect.deleteProperty(page, "undo");
  Reflect.deleteProperty(page, "redo");
  return page;
}

/** What the store of the page is made with: its first project, its
    analyses, the one pass, the writing, one past project, and the
    settings `stopLeftBehind` and `dropLeftBehind`. Given apart from
    `createPopgen2Store` so that a test reads the history the page does
    not reach. */
export function popgen2StoreConfig(
  deps: Popgen2StoreDeps,
): StoreConfig<Job, JobResult, Blob> & StopLeftBehindConfig {
  return {
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
    maxUndoSteps: POPGEN2_UNDO_STEPS,
    // The page has no steps, so the words of no individual kept send the
    // user to none (docs/specs/steps/popgen2-download.md, "Its words").
    keptNoneStep: null,
    // The page draws no notice, so a calculation a change leaves behind
    // is stopped at once rather than run on out of sight
    // (docs/specs/core/store.md, "On popgen2.html: no notice, no Undo,
    // and no result kept for values left behind").
    stopLeftBehind: true,
    // And what the screen shows is the result of the values on it, or
    // nothing: a value set back is calculated again, not shown from the
    // cache.
    dropLeftBehind: true,
  };
}

/**
 * Opens on popgen2.html the variants file of `load`, the first or
 * another: the project with that file and every filter as the user left
 * it, as a new history. The pass of the file before, if it runs, is
 * stopped, and no notice is made.
 */
export function openVariantsFile(
  store: Pick<Store<unknown, unknown>, "open">,
  load: VariantLoad,
): void {
  store.open((p) => loadVariants(p, load));
}
