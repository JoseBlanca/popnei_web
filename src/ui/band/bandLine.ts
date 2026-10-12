/**
 * What the band at the top of popgen2.html says
 * (docs/specs/steps/popgen2-band.md, "The line", "Stopping", "The
 * link", "An error of the application"): after the page's heading,
 * "Popnei", one line, the first of these that holds, the one pass
 * running or about to start, the PCA running, the filtered variants
 * being written, a Stop under way, the PCA about to start again by
 * itself, the link to the PCA's warnings or error while another tab is
 * shown; and, under it, the line of an error of the application, in the
 * words of the error bar of popgen.html.
 *
 * The PCA and the diversity, each live once its Run is pressed, are named
 * alike ("Several live analyses"): the one running, with those that
 * wait after it; those about to start together; the first result of the
 * order of the tabs with warnings or an error, in a tab not shown. While
 * one is about to start alone, the band offers its "Stop recalculating"
 * as its tab does, so that the automatic runs can be ended from any tab
 * within the quiet second (WCAG 2.2.1; the review of work package 4 of
 * docs/plans/no-undo.md, 10 October 2026); and whenever two or more are
 * live and one of them runs, waits or is about to start, Stop all, which
 * ends them all. Under 30 rem, beside one about to start alone, the
 * line has room for Stop all only, as the owner chose on 12 October
 * 2026. While analyses are live and nothing runs nor is about to start,
 * the band shows "Popnei" alone, as the owner decided on 10 October
 * 2026; each tab keeps its own Stop recalculating then.
 *
 * A pure function of what the page holds, so that a test in node checks
 * it on the real store of the page.
 */
import { POPGEN2_LIVE } from "../../core/apps.ts";
import type { Popgen2LiveId } from "../../core/apps.ts";
import { pcaOnPopgen2, pcaOptions } from "../../core/analyses/pca.ts";
import { writtenName } from "../../core/fileNames.ts";
import type { Key } from "../../core/keys.ts";
import type { AnalysisTabId, PageTab } from "../../core/popgen2Tabs.ts";
import type { AppState } from "../../core/store.ts";
import type { JobResult, PcaMethod } from "../../worker/protocol.ts";
import { liveAnalysisOf, statusOf } from "../analyses/status.ts";
import type { LiveAnalysisName } from "../analyses/status.ts";
import { titleOf } from "../analyses/titles.ts";
import { progressShare } from "../analyses/words.ts";
import type { AboutToStart, AutoRuns, LiveState } from "../autoRuns.ts";
import type { DefectsState } from "../defects.ts";
import { barText } from "../shell/barSave.ts";
import { chainButton, chainStatuses } from "../variants/chain.ts";
import { SUMMARY_ID } from "../variants/words.ts";

/** How long the band says "Stopping…" at most after it first saw a Stop
    waiting for the calculation worker, in milliseconds: a Stop of a
    request that waited in the client's queue restarts no worker, so no
    end would come (docs/specs/steps/popgen2-band.md, "Stopping"). */
export const STOPPING_MAX_MS = 10_000;

/** The id of the PCA of the page. */
const PCA = pcaOnPopgen2.id;

/** The tab of each analysis that can be live, where its Run, its Stop
    and its result are: the tab the band's link shows, and the one whose
    Stop the band drops while it is shown. */
export const LIVE_TABS: Readonly<Record<Popgen2LiveId, AnalysisTabId>> =
  Object.freeze({ pca: "pca", diversity: "populations" });

/** What the band reads of the page, beside the log of the errors. */
export interface BandPage {
  /** The state of the store of the page. */
  readonly state: AppState<JobResult, Blob>;
  /** Whether the code that starts the analyses by themselves started one
      under `key`: the one pass so started and ready was stopped, and is
      not about to start. */
  readonly startedUnder: (key: Key) => boolean;
  /** The live state of each analysis that can be live, from the same
      code. */
  readonly live: Readonly<Record<Popgen2LiveId, LiveState>>;
  /** The tab shown. */
  readonly tab: PageTab;
  /** The time of the band's last look at a Stop waiting, in the
      milliseconds of `performance.now()`, read only while
      `stoppingSince` is set. */
  readonly now: number;
  /** When the band first saw the store's `stoppedAwaitingWorker` set, in
      the same milliseconds; `null` while it has not. */
  readonly stoppingSince: number | null;
  /** The method of the PCA when the band first saw the store's
      `stoppedAwaitingWorker` set, that of the run stopped, since a PCA
      that runs locks its options; `null` while it has not, when the
      project's is read. */
  readonly stoppedMethod: PcaMethod | null;
}

/** What a Stop under way stops: the PCA, by its method; the one pass
    over the variants file `name`; or another analysis of the page, as
    the middle of a sentence names it, `name`, "the diversity". */
export type Stopping =
  | { readonly kind: "pca"; readonly method: PcaMethod }
  | { readonly kind: "reading"; readonly name: string }
  | { readonly kind: "analysis"; readonly name: string };

/** The line after "Popnei", the first of these that holds. */
export type BandLine =
  /** Nothing runs, nothing to point to. */
  | { readonly kind: "nothing" }
  /** The one pass over the variants file `name` runs, `share` of it read
      in whole percents, or is about to start, `share` then `null`, as
      before its first progress. Its Stop is the box's. */
  | {
      readonly kind: "reading";
      readonly name: string;
      readonly share: number | null;
    }
  /** An analysis that can be live, `named`, runs, started by Run or by
      itself, as the request `runId`, whose clock the band reads; `then`,
      the live analyses that wait after it, in their order. Its Stop is
      its tab's, offered while another tab is shown, `withStop`; Stop
      all, while two or more are live, ends `stopAll`. */
  | {
      readonly kind: "running";
      readonly named: LiveAnalysisName;
      readonly runId: number;
      readonly then: readonly LiveAnalysisName[];
      readonly withStop: boolean;
      readonly stopAll: StopAll;
    }
  /** The filtered variants are being written into the file `name`,
      `share` of the pass done, `null` before its first progress. No Stop:
      the dialog has it. */
  | {
      readonly kind: "writing";
      readonly name: string;
      readonly share: number | null;
    }
  /** A Stop waits for the calculation worker to start again. */
  | { readonly kind: "stopping"; readonly what: Stopping }
  /** The live analyses `named`, one or more in their order, are about to
      start again by themselves, once what they wait for, `waitsFor`, the
      quiet second, the dialog of the download or the next change after a
      crash, is over. One alone offers its tab's Stop recalculating while
      another tab is shown, `withStop`; Stop all, while two or more are
      live, ends `stopAll`. */
  | {
      readonly kind: "aboutToStart";
      readonly named: readonly LiveAnalysisName[];
      readonly waitsFor: AboutToStart;
      readonly withStop: boolean;
      readonly stopAll: StopAll;
    }
  /** The result of `named` has `warnings` warnings, or it could not be
      calculated, `warnings` then `null`, and its tab, `tab`, is not the
      one shown: the link to it. */
  | {
      readonly kind: "result";
      readonly named: LiveAnalysisName;
      readonly tab: AnalysisTabId;
      readonly warnings: number | null;
    };

/** The live state of each analysis of the page that can be live, as
    `live` tells it now: read at each change its `subscribe` tells. */
export function liveStatesOf(
  live: Pick<AutoRuns, "liveState">,
): Readonly<Record<Popgen2LiveId, LiveState>> {
  return {
    pca: live.liveState("pca"),
    diversity: live.liveState("diversity"),
  };
}

/** The live analyses Stop all ends, two or more in their order, or
    `null` while fewer are live and the band offers no Stop all. */
export type StopAll = readonly LiveAnalysisName[] | null;

/** The line of an error of the application, under the line of the
    heading: the words of the error bar for the first error, and the count
    of those after it. */
export interface BandError {
  /** The words of the error bar for the first error, with its message. */
  readonly text: string;
  /** How many errors came after it. */
  readonly more: number;
}

/** What the band shows: its line, and the line of an error or `null`. */
export interface Band {
  /** The line after the heading "Popnei". */
  readonly line: BandLine;
  /** The line of an error of the application under it, or `null`. */
  readonly error: BandError | null;
}

/**
 * What the band shows, from what it reads of the page, `page`, or `null`
 * before the store is made, when it shows an error met as the page
 * started and nothing else; and from the log of the errors, `defects`:
 * `lineOf` and `errorOf` together. Throws a defect when the store says a
 * Stop waits for an analysis the page does not have.
 */
export function bandOf(page: BandPage | null, defects: DefectsState): Band {
  return {
    line: page === null ? NOTHING : lineOf(page),
    error: errorOf(defects, page !== null),
  };
}

/** The line of an error of the application, from the log of the errors,
    `defects`, alone, so that a defect of the line after the heading does
    not take it with it; `started`, whether the store is made, else the
    error was met as the page started. `null` while there is none. */
export function errorOf(
  defects: DefectsState,
  started: boolean,
): BandError | null {
  const first = defects.first;
  return first === null
    ? null
    : {
        text: barText(first, started ? "noSaving" : "starting", false),
        more: defects.more,
      };
}

const NOTHING: BandLine = Object.freeze({ kind: "nothing" });

/** The line after the heading of `page`, the first that holds of "The
    line" and "Several live analyses" of the spec. Throws a defect when
    the store says a Stop waits for an analysis the page does not
    have. */
export function lineOf(page: BandPage): BandLine {
  const { state } = page;
  const project = state.project;
  const variantsName = project.variants?.name ?? null;
  const method = pcaOptions(project, "popgen2").method;

  // The one pass running, or about to start, the moment the box shows
  // its Stop for it.
  const chain = chainStatuses(state.analyses);
  if (
    variantsName !== null &&
    chainButton(chain, page.startedUnder)?.kind === "stop"
  ) {
    const running = chain.find((status) => status.kind === "running");
    return {
      kind: "reading",
      name: variantsName,
      share:
        running?.kind === "running" && running.progress !== null
          ? progressShare(running.progress)
          : null,
    };
  }

  const live = POPGEN2_LIVE.filter((id) => page.live[id].kind === "live");
  const stopAll =
    live.length >= 2 ? live.map((id) => liveAnalysisOf(state, id)) : null;

  // Each tab shows its own Stop and Stop recalculating; the band offers
  // them while another tab is shown.
  for (const id of POPGEN2_LIVE) {
    const status = statusOf(state, id);
    if (status.kind !== "running") continue;
    return {
      kind: "running",
      named: liveAnalysisOf(state, id),
      runId: status.runId,
      then: live
        .filter((other) => aboutToStartOf(page.live[other]) === "behind")
        .map((other) => liveAnalysisOf(state, other)),
      withStop: page.tab !== LIVE_TABS[id],
      stopAll,
    };
  }

  const write = state.write;
  if (write?.kind === "running") {
    return {
      kind: "writing",
      name: writtenName(project, write.format),
      share: write.progress === null ? null : progressShare(write.progress),
    };
  }

  const stopped = state.stoppedAwaitingWorker;
  if (
    stopped !== null &&
    (page.stoppingSince === null ||
      page.now - page.stoppingSince < STOPPING_MAX_MS)
  ) {
    return {
      kind: "stopping",
      what: stoppingOf(
        state,
        stopped,
        page.stoppedMethod ?? method,
        variantsName,
      ),
    };
  }

  // Those about to start that wait for the same as the first, so that
  // the line says one thing true of each.
  const about = live.filter((id) => aboutToStartOf(page.live[id]) !== null);
  const [first] = about;
  const waitsFor =
    first === undefined ? null : aboutToStartOf(page.live[first]);
  if (first !== undefined && waitsFor !== null) {
    const together = about.filter(
      (id) => aboutToStartOf(page.live[id]) === waitsFor,
    );
    return {
      kind: "aboutToStart",
      named: together.map((id) => liveAnalysisOf(state, id)),
      waitsFor,
      withStop: together.length === 1 && page.tab !== LIVE_TABS[first],
      stopAll,
    };
  }

  // The first result of the order of the tabs with warnings or an
  // error, in a tab not shown.
  for (const id of POPGEN2_LIVE) {
    const tab = LIVE_TABS[id];
    if (page.tab === tab) continue;
    const status = statusOf(state, id);
    const named = liveAnalysisOf(state, id);
    if (status.kind === "done" && status.warnings.length > 0) {
      return { kind: "result", named, tab, warnings: status.warnings.length };
    }
    if (status.kind === "error") {
      return { kind: "result", named, tab, warnings: null };
    }
  }

  return NOTHING;
}

/** What `state` waits for while it is about to start, `null` while it
    is not, or not live. */
function aboutToStartOf(state: LiveState): AboutToStart | null {
  return state.kind === "live" && !state.running ? state.aboutToStart : null;
}

/** What the Stop of the analysis `id` stops, waiting for the worker: the
    PCA by `method`, the one pass over the file `variantsName`, an
    analysis that can be live as the page's words name it in `state`, or
    another by its title; a defect for one with no title. */
function stoppingOf(
  state: AppState<JobResult, Blob>,
  id: string,
  method: PcaMethod,
  variantsName: string | null,
): Stopping {
  if (id === PCA) return { kind: "pca", method };
  if (id === SUMMARY_ID) {
    if (variantsName === null) {
      throw new Error(
        "popnei_web defect: a Stop of the one pass waits with no variants file.",
      );
    }
    return { kind: "reading", name: variantsName };
  }
  return {
    kind: "analysis",
    name: POPGEN2_LIVE.some((one) => one === id)
      ? liveAnalysisOf(state, id).name
      : `the calculation of ${titleOf(id)}`,
  };
}
