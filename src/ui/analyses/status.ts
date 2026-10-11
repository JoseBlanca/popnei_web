/**
 * What the frame of an analysis reads of the store, shared by the panels
 * of the Analyses step (AnalysisPanel.tsx) and the parts of the checks of
 * the Variants step (docs/specs/steps/variants.md): the state of an
 * analysis, the button that state offers, Run or its Calculate, Stop, or
 * none, its result once done, and the notice that stopped it.
 */
import { diversityOnPopgen2 } from "../../core/analyses/diversity.ts";
import { pcaMethodOf, pcaOnPopgen2 } from "../../core/analyses/pca.ts";
import { POPGEN2_LIVE, isPopgen2Live } from "../../core/apps.ts";
import type { Popgen2LiveId } from "../../core/apps.ts";
import type { AnalysisId } from "../../core/project.ts";
import type { AnalysisStatus, AppState, Notice } from "../../core/store.ts";
import type { JobResult, PcaMethod } from "../../worker/protocol.ts";
import type { AutoRuns } from "../autoRuns.ts";
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

/** How the words of popgen2.html name one of the analyses that can be
    live there, `POPGEN2_LIVE` of src/core/apps.ts, whether it is live,
    runs or waits now or not: one that is calculated again by itself once
    its Run is pressed, and that, while it runs, locks what it reads and
    keeps the download of the filtered variants waiting
    (docs/specs/steps/popgen2-pca.md, "While a PCA runs" and "Several
    analyses calculated again by themselves"). */
export interface LiveAnalysisName {
  /** Its id in the store: "pca", "diversity". */
  readonly id: AnalysisId;
  /** The analysis in the middle of a sentence: "the PCA", "the PCoA",
      "the diversity". */
  readonly name: string;
  /** The label of the tab where it is stopped: "PCA", "Populations". */
  readonly tab: string;
  /** Whether it reads the populations, so that the column of the
      populations and the individuals file are to wait while it runs.
      Nothing reads it yet: until work package 3 of
      docs/plans/population-tab.md locks the box Individuals, a change of
      them while the diversity runs stops it, as the store stops every
      calculation a change leaves behind. */
  readonly readsPopulations: boolean;
}

/** The PCA by its method, the same object for the same method,
    so that a selector may return it. Its tab is the PCA tab, labelled as
    `PAGE_TAB_LABELS` of src/ui/variants/analysisTabsWords.ts labels it,
    which is not imported here, so that popgen.html, which reads this
    module, does not download the words of popgen2.html's tabs; the
    same for the diversity's Populations tab. */
const PCA_NAMES: Readonly<Record<PcaMethod, LiveAnalysisName>> = Object.freeze({
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
});

/** The diversity of the Populations tab, which reads the populations. */
const DIVERSITY_NAMES: LiveAnalysisName = Object.freeze({
  id: diversityOnPopgen2.id,
  name: "the diversity",
  tab: "Populations",
  readsPopulations: true,
});

/** How the words of the page name each analysis that can be live in
    `s`. Keyed by `POPGEN2_LIVE` of src/core/apps.ts, so that an analysis
    added to it without its words does not compile. */
const LIVE_NAMES: Readonly<
  Record<Popgen2LiveId, (s: AppState<JobResult, unknown>) => LiveAnalysisName>
> = Object.freeze({
  pca: (s) => PCA_NAMES[pcaMethodOf(s.project, "popgen2")],
  diversity: () => DIVERSITY_NAMES,
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
): LiveAnalysisName {
  if (!isPopgen2Live(id)) {
    throw new Error(
      `popnei_web defect: ${id} is not an analysis popgen2.html calculates again by itself.`,
    );
  }
  return LIVE_NAMES[id](s);
}

/** The live analysis of popgen2.html running in `s`, which locks what it
    reads while it runs, the PCA or the diversity, the calculation worker
    running one at a time; `null` while none runs. Read on popgen2.html
    alone, whose store runs the analyses of `POPGEN2_LIVE`. */
export function runningAnalysisOf(
  s: AppState<JobResult, unknown>,
): LiveAnalysisName | null {
  const id = POPGEN2_LIVE.find((one) => statusOf(s, one).kind === "running");
  return id === undefined ? null : liveAnalysisOf(s, id);
}

/** The live analyses of the page other than `running`, live beside it,
    in their order, as `isLive` of `live` tells: those a Stop all stops
    too. */
export function liveBeside(
  s: AppState<JobResult, unknown>,
  running: LiveAnalysisName,
  live: Pick<AutoRuns, "isLive">,
): readonly LiveAnalysisName[] {
  return namedOf(
    s,
    POPGEN2_LIVE.filter((id) => id !== running.id && live.isLive(id)),
  );
}

/** The live analyses of the page waiting to start after the one running,
    in their order, those whose `liveState` of `live` is about to start
    "behind" it; empty while none runs. */
export function waitingAfter(
  s: AppState<JobResult, unknown>,
  live: Pick<AutoRuns, "liveState">,
): readonly LiveAnalysisName[] {
  return namedOf(
    s,
    POPGEN2_LIVE.filter((id) => {
      const state = live.liveState(id);
      return state.kind === "live" && state.aboutToStart === "behind";
    }),
  );
}

/** The analyses `ids` as the words name them in `s`. */
function namedOf(
  s: AppState<JobResult, unknown>,
  ids: readonly AnalysisId[],
): readonly LiveAnalysisName[] {
  return ids.map((id) => liveAnalysisOf(s, id));
}
