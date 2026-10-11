/**
 * What the frame of an analysis reads of the store, shared by the panels
 * of the Analyses step (AnalysisPanel.tsx) and the parts of the checks of
 * the Variants step (docs/specs/steps/variants.md): the state of an
 * analysis, the button that state offers, Run or its Calculate, Stop, or
 * none, its result once done, and the notice that stopped it.
 */
import { diversityOnPopgen2 } from "../../core/analyses/diversity.ts";
import { pcaMethodOf, pcaOnPopgen2 } from "../../core/analyses/pca.ts";
import type { AnalysisId } from "../../core/project.ts";
import type { AnalysisStatus, AppState, Notice } from "../../core/store.ts";
import type { JobResult, PcaMethod } from "../../worker/protocol.ts";
import { methodName } from "./pca/words.ts";

/** The state of the analysis `id` in `s`; a defect when the store has
    none. */
export function statusOf(
  s: AppState<JobResult, unknown>,
  id: AnalysisId,
): AnalysisStatus<JobResult> {
  const view = s.analyses.find((a) => a.id === id);
  if (view === undefined) {
    throw new Error(`popnei_web defect: the store has no analysis ${id}.`);
  }
  return view.status;
}

/** What the button of the panel is in a state, or `null` when the state
    offers none. */
export type ButtonOf =
  | { readonly kind: "run"; readonly reason: string | null }
  | { readonly kind: "stop" }
  | null;

/** The button of the state `status`. */
export function buttonOf(status: AnalysisStatus<JobResult>): ButtonOf {
  switch (status.kind) {
    case "locked":
      return { kind: "run", reason: status.reason };
    case "ready":
    case "removed":
      return { kind: "run", reason: null };
    case "running":
      return { kind: "stop" };
    case "done":
      return null;
    case "error":
      // popnei would refuse the same settings again, and a file the
      // browser can no longer read fails again until it is loaded again.
      return status.error.kind === "refused" ||
        status.error.error.kind === "reopenFailed"
        ? null
        : { kind: "run", reason: null };
  }
}

/** The result of the analysis `id`, of the union of the results of the
    workers. */
export type ResultOf<Id extends JobResult["analysis"]> = Extract<
  JobResult,
  { readonly analysis: Id }
>;

/** Whether `result` is one of the analysis `id`. */
function isResultOf<Id extends JobResult["analysis"]>(
  result: JobResult,
  id: Id,
): result is ResultOf<Id> {
  return result.analysis === id;
}

/** The result of the analysis `id` in its state `status` once it is done,
    or `null` in any other state; a defect when the store gave it the
    result of another analysis. The same object as the store's, so that it
    may be what a selector returns. */
export function resultOf<Id extends JobResult["analysis"]>(
  status: AnalysisStatus<JobResult>,
  id: Id,
): ResultOf<Id> | null {
  if (status.kind !== "done") return null;
  if (!isResultOf(status.result, id)) {
    throw new Error(
      `popnei_web defect: ${id} was given a result of ${status.result.analysis}.`,
    );
  }
  return status.result;
}

/** The notice that stopped the calculation of the analysis `id` at once,
    by a change of the load of the variants file, while it is up and the
    analysis can be run again, `status` ready or locked; `null`
    otherwise. */
export function stoppedNotice(
  status: AnalysisStatus<JobResult>,
  notice: Notice | null,
  id: AnalysisId,
): Notice | null {
  return notice?.stopped.includes(id) === true &&
    (status.kind === "ready" || status.kind === "locked")
    ? notice
    : null;
}

/** A live analysis of popgen2.html, one that is calculated again by
    itself once its Run is pressed, and that, while it runs, locks what
    it reads and keeps the download of the filtered variants waiting
    (docs/specs/steps/popgen2-pca.md, "While a PCA runs" and "Several
    analyses calculated again by themselves"). */
export interface RunningAnalysis {
  /** Its id in the store: "pca", "diversity". */
  readonly id: AnalysisId;
  /** The analysis in the middle of a sentence: "the PCA", "the PCoA",
      "the diversity". */
  readonly name: string;
  /** The label of the tab where it is stopped: "PCA", "Populations". */
  readonly tab: string;
  /** Whether it reads the populations, so that the column of the
      populations and the individuals file wait while it runs. */
  readonly readsPopulations: boolean;
}

/** The running PCA by its method, the same object for the same method,
    so that a selector may return it. Its tab is the PCA tab, labelled as
    `PAGE_TAB_LABELS` of src/ui/variants/analysisTabsWords.ts labels it,
    which is not imported here, so that popgen.html, which reads this
    module, does not download the words of popgen2.html's tabs; the
    same for the diversity's Populations tab. */
const RUNNING_PCA: Readonly<Record<PcaMethod, RunningAnalysis>> = Object.freeze(
  {
    pca: Object.freeze({
      id: pcaOnPopgen2.id,
      name: `the ${methodName("pca")}`,
      tab: "PCA",
      readsPopulations: false,
    }),
    pcoa: Object.freeze({
      id: pcaOnPopgen2.id,
      name: `the ${methodName("pcoa")}`,
      tab: "PCA",
      readsPopulations: false,
    }),
  },
);

/** The diversity of the Populations tab, which reads the populations. */
const RUNNING_DIVERSITY: RunningAnalysis = Object.freeze({
  id: diversityOnPopgen2.id,
  name: "the diversity",
  tab: "Populations",
  readsPopulations: true,
});

/** The live analysis `id` of popgen2.html as the words of the page name
    it in `s`, the PCA by the method of its project, read with
    `pcaMethodOf`, which never throws, since this is read above every
    boundary of errors of the page; the same object for the same
    analysis and method, so that a selector may return it. A defect for
    an analysis that is not live on that page. */
export function liveAnalysisOf(
  s: AppState<JobResult, unknown>,
  id: AnalysisId,
): RunningAnalysis {
  if (id === pcaOnPopgen2.id) {
    return RUNNING_PCA[pcaMethodOf(s.project, "popgen2")];
  }
  if (id === diversityOnPopgen2.id) return RUNNING_DIVERSITY;
  throw new Error(
    `popnei_web defect: ${id} is not an analysis popgen2.html calculates again by itself.`,
  );
}

/** The live analyses of popgen2.html this module names, in the order of
    the tabs, the order `POPGEN2_LIVE` of src/ui/popgen2Store.ts gives
    them, which is not imported here, so that popgen.html does not
    download the store of popgen2.html. */
const LIVE_IDS: readonly AnalysisId[] = Object.freeze([
  pcaOnPopgen2.id,
  diversityOnPopgen2.id,
]);

/** The live analysis of popgen2.html running in `s`, which locks what it
    reads while it runs, the PCA or the diversity, the calculation worker
    running one at a time; `null` while none runs. Read on popgen2.html
    alone, whose store runs the PCA of `pcaOnPopgen2` and the diversity
    of `diversityOnPopgen2`. */
export function runningAnalysisOf(
  s: AppState<JobResult, unknown>,
): RunningAnalysis | null {
  const id = LIVE_IDS.find((one) => statusOf(s, one).kind === "running");
  return id === undefined ? null : liveAnalysisOf(s, id);
}
