/**
 * The words of the statistics of the open file on popgen2.html
 * (docs/plans/file-stats.md, "The section"): the name of the section and
 * of its two parts, the button that stops the statistics and the one that
 * starts them again, the line and the bar of the pass running, what each
 * part says while it has no result, the words of a failure of each, and
 * what the status region says of them. They are the page's own, since the
 * words of the old page send the user to a Variants step this page does
 * not have. Pure, so that a test in node checks them; the section draws
 * them.
 */

import { isVcfLineRefusal } from "../../core/analyses/words.ts";
import {
  counted,
  escaped,
  saying,
  withoutBackquotes,
} from "../../core/project.ts";
import type { AnalysisId, Project } from "../../core/project.ts";
import type {
  AnalysisError,
  AnalysisStatus,
  AppState,
} from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import type { Pending } from "../autoRuns.ts";
import { capitalized } from "../sentences.ts";
import { SUMMARY_ID } from "./words.ts";

/** The id of the statistics of each individual. */
export const INDIVIDUALS_ID = "individualChecks";

/** The id of the histograms of the variants. */
export const VARIANTS_ID = "variantChecks";

/** The two statistics of the open file, by their ids. */
export type StatsId = typeof INDIVIDUALS_ID | typeof VARIANTS_ID;

/** The name of the section, which has no heading of its own: what a
    screen reader calls it, and the heading drawn in its place when it
    fails. */
export const STATS_NAME = "Statistics of the file";

/** The headings of the two parts of the section. */
export const VARIANTS_HEADING = "Variants";
export const INDIVIDUALS_HEADING = "Individuals";

/** The button that stops the statistics, the one running and those after
    it. */
export const STOP_STATS_LABEL = "Stop the statistics";

/** The button that starts again the statistics not done, after a Stop or
    a failure a new calculation may mend. */
export const RESUME_STATS_LABEL = "Start the statistics again";

/** Each statistic in the middle of a sentence. */
const SUBJECTS: Readonly<Record<StatsId, string>> = Object.freeze({
  individualChecks: "the statistics of the individuals",
  variantChecks: "the statistics of the variants",
});

/** The name of the bar of the pass of `id`: "Calculating the statistics
    of the individuals". */
export function statsBarLabel(id: StatsId): string {
  return `Calculating ${SUBJECTS[id]}`;
}

/** The line beside the bar: "Calculating the statistics of the
    individuals… 34%", with no share before the first progress. */
export function statsRunningLine(id: StatsId, share: number | null): string {
  const start = `${statsBarLabel(id)}…`;
  return share === null ? start : `${start} ${String(share)}%`;
}

/** What a part says while its pass runs; its share is beside the bar. */
export const PART_RUNNING = "Calculating…";

/** What a part says once it is stopped. */
export const PART_STOPPED = "Stopped.";

/** What the status region says at a Stop of the statistics. */
export const STATS_STOPPED_TEXT =
  "The statistics were stopped. Start the statistics again calculates those not done.";

/** Whether `id` is one of the two statistics. */
export function isStatsId(id: AnalysisId): id is StatsId {
  return id === INDIVIDUALS_ID || id === VARIANTS_ID;
}

/**
 * What a part says of its statistic, ready to run and not started,
 * `pending` of autoRuns.ts: that it waits for the count of the variants,
 * or for the statistics of the variants; that it starts now, when none
 * holds it back; that it is not calculated since the one before it
 * failed or cannot run, or was stopped, which nothing but the user starts
 * again; or that it was stopped itself.
 */
export function pendingText(pending: Pending): string {
  switch (pending.kind) {
    case "waiting":
      if (pending.after === null) return PART_RUNNING;
      return pending.after === SUMMARY_ID
        ? "Waiting for the count of the variants."
        : `Waiting for ${subjectOf(pending.after)}.`;
    case "blocked":
      return blockedText(pending.by, pending.because);
    case "stopped":
      return PART_STOPPED;
  }
}

/** What a part says when `by`, an analysis before it, holds it back,
    `because` it failed or was stopped. */
function blockedText(by: AnalysisId, because: "failed" | "stopped"): string {
  switch (because) {
    case "failed":
      return by === SUMMARY_ID
        ? "Not calculated: the variants were not counted."
        : `Not calculated: ${subjectOf(by)} failed.`;
    case "stopped":
      return by === SUMMARY_ID
        ? "Not calculated: the count of the variants was stopped."
        : `Not calculated: ${subjectOf(by)} were stopped.`;
  }
}

/** The statistic `id` in the middle of a sentence; a defect for an
    analysis that is not one of the two. */
function subjectOf(id: AnalysisId): string {
  if (!isStatsId(id)) {
    throw new Error(
      `popnei_web defect: ${id} is not one of the statistics of the open file.`,
    );
  }
  return SUBJECTS[id];
}

/**
 * The words of a failure of the statistic `id` of the project `p`, short,
 * as the box of the file says those of its count: popnei's refusal of a
 * line of the VCF, or any other refusal, with popnei's words; a crash of
 * the worker or a defect of ours, whose details the error bar shows; the
 * file the browser could not read again; the calculations that could not
 * start; a page out of date. A failure of the files wasm is a defect,
 * since the calculation worker holds none.
 */
export function statsFailedText(
  id: StatsId,
  error: AnalysisError,
  p: Project,
): string {
  const fileName = escaped(p.variants?.name ?? "the file");
  if (error.kind === "refused") {
    const message = error.message;
    if (isVcfLineRefusal(message)) {
      return `popnei could not read ${fileName}${saying(message)}. Correct the file, or fetch it again, and open it again.`;
    }
    return `popnei could not calculate ${SUBJECTS[id]}${saying(withoutBackquotes(message))}.`;
  }
  const failure = error.error;
  switch (failure.kind) {
    case "workerFailed":
    case "defect":
      return `${capitalized(SUBJECTS[id])} could not be calculated.`;
    case "reopenFailed":
      return `${escaped(failure.name)} could not be read again; it may have changed on the disk since it was opened. Open it again.`;
    case "couldNotStart":
      return `The application could not start its calculations. Reload the page and open ${fileName} again.`;
    case "protocolMismatch":
      return `The page is out of date. Reload the page and open ${fileName} again.`;
    case "files":
      throw new Error(
        `popnei_web defect: ${SUBJECTS[id]} failed in the files wasm, which the calculation worker does not hold: ${failure.message}`,
      );
  }
}

/** The line under the title of a histogram of the variants: "Over 1,200
    variants", those in its bins, which leaves out a variant with no
    value. */
export function overVariantsLine(numVars: number): string {
  return `Over ${counted(numVars, "variant")}`;
}

/** The line under the title of a histogram of the individuals: "Over 200
    individuals", those in its bins. */
export function overIndividualsLine(numIndividuals: number): string {
  return `Over ${counted(numIndividuals, "individual")}`;
}

/** The status of the analysis `id` in `s`; a defect when the store has
    none. */
export function statsStatus(
  s: AppState<JobResult, unknown>,
  id: StatsId,
): AnalysisStatus<JobResult> {
  const view = s.analyses.find((a) => a.id === id);
  if (view === undefined) {
    throw new Error(`popnei_web defect: the store has no analysis ${id}.`);
  }
  return view.status;
}

/**
 * What the status region says of a change of the store from `before` to
 * `after` in the statistics of the open file: the words of each that
 * failed, and, once both are done for the same file, that they are.
 */
export function statsAnnouncementsOf(
  before: AppState<JobResult, unknown>,
  after: AppState<JobResult, unknown>,
): readonly string[] {
  const variants = after.project.variants;
  if (variants === null) return [];
  const texts: string[] = [];
  const ids = [INDIVIDUALS_ID, VARIANTS_ID] as const;
  for (const id of ids) {
    const then = statsStatus(before, id);
    const now = statsStatus(after, id);
    if (
      now.kind === "error" &&
      !(then.kind === "error" && then.key === now.key)
    ) {
      texts.push(statsFailedText(id, now.error, after.project));
    }
  }
  const allDone = (s: AppState<JobResult, unknown>): boolean =>
    ids.every((id) => statsStatus(s, id).kind === "done");
  if (allDone(after) && !allDone(before)) {
    texts.push(`The statistics of ${escaped(variants.name)} are calculated.`);
  }
  return texts;
}

/** The one button of the statistics: Stop while one of them runs, or is
    about to start by itself with nothing holding it back; start again
    when `resume` of autoRuns.ts would start one; none otherwise. */
export type StatsButton =
  { readonly kind: "stop" } | { readonly kind: "resume" } | null;

/** The button of the statistics from the status of each, what autoRuns
    says of each not started, and whether its `resume` would start one. */
export function statsButton(
  statuses: readonly AnalysisStatus<JobResult>[],
  pendings: readonly (Pending | null)[],
  canResume: boolean,
): StatsButton {
  if (statuses.some((status) => status.kind === "running")) {
    return { kind: "stop" };
  }
  // Between the end of one and the start of the next, which a change of
  // the store starts a moment later: Stop stays, with the focus it holds.
  if (
    pendings.some(
      (pending) => pending?.kind === "waiting" && pending.after === null,
    )
  ) {
    return { kind: "stop" };
  }
  return canResume ? { kind: "resume" } : null;
}
