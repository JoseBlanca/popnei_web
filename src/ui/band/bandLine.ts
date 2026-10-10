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
 * While the PCA is about to start, the band offers "Stop recalculating"
 * as the PCA tab does, so that the automatic runs can be ended from any
 * tab within the quiet second (WCAG 2.2.1; the review of work package 4
 * of docs/plans/no-undo.md, 10 October 2026). While the PCA is live and
 * nothing runs nor is about to start, the band shows "Popnei" alone, as
 * the owner decided on 10 October 2026; the PCA tab keeps its own Stop
 * recalculating then.
 *
 * A pure function of what the page holds, so that a test in node checks
 * it on the real store of the page.
 */
import { pcaOnPopgen2, pcaOptions } from "../../core/analyses/pca.ts";
import { writtenName } from "../../core/fileNames.ts";
import type { Key } from "../../core/keys.ts";
import type { PageTab } from "../../core/popgen2Tabs.ts";
import type { AppState } from "../../core/store.ts";
import type { JobResult, PcaMethod } from "../../worker/protocol.ts";
import { progressShare } from "../analyses/words.ts";
import type { AboutToStart, LiveState } from "../autoRuns.ts";
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

/** What the band reads of the page, beside the log of the errors. */
export interface BandPage {
  /** The state of the store of the page. */
  readonly state: AppState<JobResult, Blob>;
  /** Whether the code that starts the analyses by themselves started one
      under `key`: the one pass so started and ready was stopped, and is
      not about to start. */
  readonly startedUnder: (key: Key) => boolean;
  /** The PCA's live state, from the same code. */
  readonly pcaLive: LiveState;
  /** The tab shown. */
  readonly tab: PageTab;
  /** The time now, in the milliseconds of `performance.now()`. */
  readonly now: number;
  /** When the band first saw the store's `stoppedAwaitingWorker` set, in
      the same milliseconds; `null` while it has not. */
  readonly stoppingSince: number | null;
}

/** What a Stop under way stops: the PCA, by its method, or the reading
    of the variants file `name`, the one pass. */
export type Stopping =
  | { readonly kind: "pca"; readonly method: PcaMethod }
  | { readonly kind: "reading"; readonly name: string };

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
  /** The PCA runs, started by Run or by itself, as the request `runId`,
      whose clock the band reads. Its Stop is the PCA tab's, offered
      while another tab is shown, `withStop`. */
  | {
      readonly kind: "pcaRunning";
      readonly method: PcaMethod;
      readonly runId: number;
      readonly withStop: boolean;
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
  /** The PCA live is about to start again by itself, once what it
      waits for, `waitsFor`, the quiet second or the dialog of the
      download, is over: Stop recalculating, the PCA tab's, offered while
      another tab is shown, `withStop`. */
  | {
      readonly kind: "aboutToStart";
      readonly method: PcaMethod;
      readonly waitsFor: AboutToStart;
      readonly withStop: boolean;
    }
  /** The PCA's result has `warnings` warnings, or it could not be
      calculated, `warnings` then `null`, and another tab than the PCA's
      is shown: the link to the PCA tab. */
  | {
      readonly kind: "result";
      readonly method: PcaMethod;
      readonly warnings: number | null;
    };

/** The line of an error of the application, under the line of the
    heading: the words of the error bar for the first error, and the count
    of those after it. */
export interface BandError {
  readonly text: string;
  readonly more: number;
}

/** What the band shows: its line, and the line of an error or `null`. */
export interface Band {
  readonly line: BandLine;
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
    line" of the spec. Throws a defect when the store says a Stop waits
    for an analysis the page does not have. */
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

  // The PCA tab shows its own Stop and Stop recalculating; the band
  // offers them while another tab is shown.
  const withStop = page.tab !== "pca";
  const pca = pcaStatus(state);
  if (pca.kind === "running") {
    return { kind: "pcaRunning", method, runId: pca.runId, withStop };
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
      what: stoppingOf(stopped, method, variantsName),
    };
  }

  const live = page.pcaLive;
  if (live.kind === "live" && live.aboutToStart !== null && !live.running) {
    return {
      kind: "aboutToStart",
      method,
      waitsFor: live.aboutToStart,
      withStop,
    };
  }

  if (page.tab !== "pca") {
    if (pca.kind === "done" && pca.warnings.length > 0) {
      return {
        kind: "result",
        method,
        warnings: pca.warnings.length,
      };
    }
    if (pca.kind === "error") {
      return { kind: "result", method, warnings: null };
    }
  }

  return NOTHING;
}

/** The status of the PCA in `state`; a defect when the store has none. */
function pcaStatus(
  state: AppState<JobResult, Blob>,
): AppState<JobResult, Blob>["analyses"][number]["status"] {
  const view = state.analyses.find((a) => a.id === PCA);
  if (view === undefined) {
    throw new Error("popnei_web defect: the store of the page has no PCA.");
  }
  return view.status;
}

/** What the Stop of the analysis `id` stops, waiting for the worker: the
    PCA by `method`, or the reading of the file `variantsName`. */
function stoppingOf(
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
  throw new Error(
    `popnei_web defect: a Stop of ${id} waits, which popgen2.html does not run.`,
  );
}
