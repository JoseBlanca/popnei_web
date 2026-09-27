/**
 * The words of the shell (docs/specs/shell.md): the state of each step
 * and its reason, the summary line, the words of the notice, and the
 * announcements the status region makes from two states of the store.
 * Pure functions of the state, so that a test in node checks them; the
 * shell draws them, and the entry announces what `announcementsOf` gives
 * at every change of the store. An analysis is named by its title, and
 * placed in the step it is shown in, by what the caller gives as
 * `ShellWords`, so that these words need no component. From stage 3
 * they take in the checks of the Variants step, the individuals and the
 * variants the filters keep, and the writing of the filtered variants as
 * a file.
 */

import {
  populationsNeeds,
  populationsOf,
  populationsToRun,
} from "../../core/analyses/diversity.ts";
import { filterCounts } from "../../core/analyses/filterCounts.ts";
import { POPGEN_STEPS } from "../../core/apps.ts";
import type { StepId } from "../../core/apps.ts";
import { writtenName } from "../../core/fileNames.ts";
import { keptNoneReason } from "../../core/individualsKept.ts";
import type { IndividualsKept } from "../../core/individualsKept.ts";
import {
  counted,
  escaped,
  grouped,
  individualListNeeds,
  individualsCheck,
  individualsNeeds,
  projectNeeds,
  shown,
} from "../../core/project.ts";
import type {
  AnalysisId,
  IndividualsSource,
  Project,
  VariantSource,
} from "../../core/project.ts";
import {
  askedFileText,
  checkVerdictText,
  identityWarning,
  uncomparedText,
} from "../../core/projectFile.ts";
import type {
  AnalysisView,
  AppState,
  Notice,
  RunView,
  Warning,
} from "../../core/store.ts";
import { sizeText } from "../../core/writeEstimate.ts";
import type { CsvOptions } from "../../worker/protocol.ts";
import { capitalized, undoneOrRedone } from "../sentences.ts";
import { sizeText as tableSizeText } from "../steps/individuals/words.ts";
import { filtersTotalText } from "../steps/variants/words.ts";
import { STEP_NAMES } from "./steps.ts";

/** The state of a step in the stepper: the first four are those of
    Variants and Individuals, the others, with done, those of Analyses;
    from stage 3 Variants takes running, removed and failed too. */
export type StepStatus =
  | "todo"
  | "reading"
  | "problem"
  | "done"
  | "locked"
  | "running"
  | "removed"
  | "failed"
  | "ready";

/** A step of the stepper, its state and the reason of that state. */
export interface StepState {
  /** The step. */
  readonly id: StepId;
  /** Its state, by the table of the stepper. */
  readonly status: StepStatus;
  /** Why it is not done, the description of its link; `null` for a state
      that needs none. */
  readonly reason: string | null;
}

/**
 * What the words of the shell need of the application, beyond the state:
 * the title of an analysis, from `src/ui/analyses/titles.ts`; the step it
 * is shown in, from `src/core/apps.ts`; and the variants the filters
 * keep, from the result of the Counts of the filters when it is done.
 * The name and the size of the written file are core's, `writtenName` and
 * `sizeText`, which these words call themselves.
 */
export interface ShellWords<R> {
  /** The title of the analysis `id`, "Diversity". */
  title(id: AnalysisId): string;
  /** The step the analysis `id` is shown in. */
  stepOf(id: AnalysisId): StepId;
  /** The variants that pass the filters, `passStats.numVars` of the
      Counts of the filters in the state done, or `null` when they are
      not done. */
  variantsKept(s: AppState<R, unknown>): number | null;
}

/** Whether a file of the filtered variants written and not saved in
    `before`, `write` in `done`, was discarded in `after`: `write` is
    there neither `done` nor `saved`, by a change of the filters, a new
    load or an opening. The status region is then emptied, since its words
    may say to save the file (docs/specs/shell.md, "The status region"). */
export function writtenDiscarded(
  before: AppState<unknown, unknown>,
  after: AppState<unknown, unknown>,
): boolean {
  const now = after.write?.kind;
  return before.write?.kind === "done" && now !== "done" && now !== "saved";
}

/** What the stepper and the status region say of an analysis in the
    state `error`, "Diversity could not be calculated.". */
function notCalculatedText(title: string): string {
  return `${title} could not be calculated.`;
}

/** What the stepper and the status region say of the writing in the
    state `error`. */
const NOT_WRITTEN = "The file could not be written.";

/**
 * The state of each step and its reason, in the order of the steps, by
 * the table of the stepper: the first row of its step whose condition
 * holds. The Analyses step takes the states the store gives the analyses
 * `w` shows in it; the Variants step, after those of its file, takes the
 * states of the checks, the analyses `w` shows in it, and of the writing.
 */
export function stepStates<R>(
  s: AppState<R, unknown>,
  w: ShellWords<R>,
): readonly StepState[] {
  return POPGEN_STEPS.map((id) => stepStateOf(s, id, w));
}

/** The state of the step `id` and its reason, as `stepStates` gives it,
    worked out for that step alone, so that a screen can select its
    state and its reason as two strings. */
export function stepStateOf<R>(
  s: AppState<R, unknown>,
  id: StepId,
  w: ShellWords<R>,
): StepState {
  switch (id) {
    case "variants":
      return { id, ...variantsState(s, w) };
    case "individuals":
      return { id, ...individualsState(s.project) };
    case "analyses":
      return { id, ...analysesState(s, w) };
  }
}

/** The state of a step without its id. */
type Status = Omit<StepState, "id">;

/** The analyses of the state that `w` shows in the step `step`, in the
    order of the state. */
function analysesOfStep<R>(
  s: AppState<R, unknown>,
  w: ShellWords<R>,
  step: StepId,
): readonly AnalysisView<R>[] {
  return s.analyses.filter((analysis) => w.stepOf(analysis.id) === step);
}

/** The state of the Variants step: its file, then the list of the
    individuals and the individuals kept, then the checks and the
    writing. */
function variantsState<R>(s: AppState<R, unknown>, w: ShellWords<R>): Status {
  const p = s.project;
  if (p.variants === null) {
    return { status: "todo", reason: askedFileText(p) ?? projectNeeds(p) };
  }
  if (p.variants.read.kind === "pending") {
    return { status: "reading", reason: projectNeeds(p) };
  }
  const reason =
    projectNeeds(p) ??
    individualListNeeds(p)?.reason ??
    keptNoneReason(p, s.individualsKept);
  if (reason !== null) {
    return { status: "problem", reason };
  }
  const checks = analysesOfStep(s, w, "variants");
  const write = s.write;
  // A Run of any step that waits for the statistics of each individual
  // is a calculation of this step until they arrive.
  const waitsForStatistics = s.analyses.some(
    (analysis) =>
      analysis.status.kind === "running" && analysis.status.waitsForStatistics,
  );
  if (
    waitsForStatistics ||
    write?.kind === "running" ||
    checks.some((check) => check.status.kind === "running")
  ) {
    return { status: "running", reason: null };
  }
  const removed = s.notice?.removed ?? [];
  if (checks.some((check) => removed.includes(check.id))) {
    return { status: "removed", reason: null };
  }
  const failed = checks.find((check) => check.status.kind === "error");
  if (failed !== undefined) {
    return { status: "failed", reason: notCalculatedText(w.title(failed.id)) };
  }
  if (write?.kind === "error") {
    return { status: "failed", reason: NOT_WRITTEN };
  }
  return { status: "done", reason: null };
}

/** The state of the Individuals step, of a project of population
    genetics. */
function individualsState(p: Project): Status {
  if (p.individuals === null) {
    return { status: "todo", reason: individualsNeeds(p) };
  }
  if (p.individuals.read.kind === "pending") {
    return { status: "reading", reason: individualsNeeds(p) };
  }
  const reason = individualsNeeds(p);
  if (reason !== null) {
    return { status: "problem", reason };
  }
  const need = populationsNeeds(p);
  if (need === null) {
    return { status: "done", reason: null };
  }
  return need.kind === "noColumn"
    ? { status: "todo", reason: need.reason }
    : { status: "problem", reason: need.reason };
}

/** The state of the Analyses step, from the states of the analyses shown
    in it and the notice. */
function analysesState<R>(s: AppState<R, unknown>, w: ShellWords<R>): Status {
  const inStep = analysesOfStep(s, w, "analyses");
  const statuses = inStep.map((analysis) => analysis.status);
  const first = statuses[0];
  if (statuses.every((status) => status.kind === "locked")) {
    return {
      status: "locked",
      reason: first?.kind === "locked" ? first.reason : null,
    };
  }
  if (statuses.some((status) => status.kind === "running")) {
    return { status: "running", reason: null };
  }
  const removed = s.notice?.removed ?? [];
  if (inStep.some((analysis) => removed.includes(analysis.id))) {
    return { status: "removed", reason: null };
  }
  const failed = inStep.find((analysis) => analysis.status.kind === "error");
  if (failed !== undefined) {
    return { status: "failed", reason: notCalculatedText(w.title(failed.id)) };
  }
  const allDone = statuses.every(
    (status) => status.kind === "locked" || status.kind === "done",
  );
  return { status: allDone ? "done" : "ready", reason: null };
}

/**
 * The summary line, what the analyses would be run on: the variants file
 * with the individuals and the variants the filters keep, the filters and
 * the metadata file, joined by " · ", "panel.nei · 114 of 200 individuals
 * kept · 1,128 of 1,200 variants kept · 5 filters · 3 populations by pop".
 * `kept` is `individualsKept` of the state; `variantsKept` the variants
 * the Counts of the filters as they are found to pass them, or `null`
 * when the filters are not counted, and the line then gives the variants
 * of the file once a calculation has counted them.
 */
export function summaryLine(
  p: Project,
  kept: IndividualsKept | null,
  variantsKept: number | null,
): string {
  return [
    variantsPart(p, kept, variantsKept),
    filtersPart(p),
    metadataPart(p),
  ].join(" · ");
}

/** The part of the summary line on the variants file. */
function variantsPart(
  p: Project,
  kept: IndividualsKept | null,
  variantsKept: number | null,
): string {
  const variants: VariantSource | null = p.variants;
  if (variants === null) {
    return p.reference === null
      ? "No variants file"
      : `No variants file: the project was made with ${escaped(p.reference.variants.name)}`;
  }
  const name = escaped(variants.name);
  const read = variants.read;
  switch (read.kind) {
    case "pending":
      return `Reading ${name}`;
    case "failed":
      return `${name} could not be read`;
    case "read": {
      const parts = [name, individualsPart(read.individuals.length, kept)];
      if (read.numVars !== null) {
        parts.push(
          variantsKept === null || p.filters.length === 0
            ? counted(read.numVars, "variant")
            : `${grouped(variantsKept)} of ${counted(read.numVars, "variant")} kept`,
        );
      }
      return parts.join(" · ");
    }
  }
}

/** The part of the summary line on the individuals of the variants file,
    `numIndividuals` of them, and those the filters keep. */
function individualsPart(
  numIndividuals: number,
  kept: IndividualsKept | null,
): string {
  const all = counted(numIndividuals, "individual");
  const list = kept?.list;
  if (list === undefined) {
    return all;
  }
  switch (list.kind) {
    case "needsStatistics":
      return `${all}, how many kept not yet known`;
    case "known": {
      if (list.individuals === null) {
        return all;
      }
      const numKept = list.individuals.length;
      return `${numKept === 0 ? "none" : grouped(numKept)} of ${all} kept`;
    }
  }
}

/** The part of the summary line on the filters of the variants and of
    the individuals: "no filter", "1 filter", "2 filters". */
function filtersPart(p: Project): string {
  const numFilters = p.filters.length + p.individualFilters.length;
  return numFilters === 0 ? "no filter" : counted(numFilters, "filter");
}

/** The part of the summary line on the metadata file and the populations
    it gives. */
function metadataPart(p: Project): string {
  const individuals: IndividualsSource | null = p.individuals;
  if (individuals === null) {
    return "no metadata file";
  }
  const name = escaped(individuals.name);
  switch (individuals.read.kind) {
    case "pending":
      return `reading ${name}`;
    case "failed":
      return `${name} could not be read`;
    case "read":
      break;
  }
  const missing = individualsCheck(p)?.missing.length ?? 0;
  if (missing > 0) {
    return `${counted(missing, "individual")} missing from ${name}`;
  }
  const column = p.grouping.kind === "populations" ? p.grouping.column : null;
  if (column === null) {
    return "one population";
  }
  // With the table read and a column chosen, populationsOf is null only
  // when the table has no column of that name.
  const pops = populationsToRun(p) ?? populationsOf(p);
  if (pops === null) {
    return `column ${shown(column)} not in ${name}`;
  }
  return `${counted(pops.length, "population")} by ${shown(column)}`;
}

/** The words of the notice and its action. */
export interface NoticeText {
  /** The words, without the action, and with no full stop after the
      last sentence, which the action follows. */
  readonly text: string;
  /** The action that reverses the change: Undo after a command or a
      redo, Redo after an undo. */
  readonly action: "Undo" | "Redo";
  /** What the action does to the project, which its button does. */
  readonly reverse: "undo" | "redo";
}

/** How the notice names the writing of the filtered variants among the
    calculations stopped or left behind. */
const THE_WRITING = "the writing of the file";

/** Some analyses in words: one named by its title, with `one`; more
    counted, with `several`; `null` for none. */
function namedOrCounted(
  ids: readonly AnalysisId[],
  title: (id: AnalysisId) => string,
  one: (name: string) => string,
  several: (count: number) => string,
): string | null {
  const [only] = ids;
  if (only === undefined) return null;
  return ids.length === 1 ? one(title(only)) : several(ids.length);
}

/** Some calculations and, when `withWriting`, the writing of the file
    after them, joined by "and"; `null` for none. */
function andTheWriting(
  calculations: string | null,
  withWriting: boolean,
): string | null {
  if (!withWriting) return calculations;
  return calculations === null
    ? THE_WRITING
    : `${calculations} and ${THE_WRITING}`;
}

/**
 * The words of the notice, from its parts: the results removed and the
 * calculations stopped, the writing of the file among them, joined by
 * "and", or by ", and" with a comma after the stopped when they hold the
 * writing; after a command, its description after them, "because …", or
 * alone; after an undo or a redo, "Undone: …" first; the calculations
 * left behind, the writing among them, a sentence of their own that names
 * the action; and the written file discarded, a sentence after it. The
 * sentences are joined by a full stop, with none after the last:
 * "Diversity removed because the missing data filter changed", with the
 * action Undo.
 */
export function noticeText(
  n: Notice,
  title: (id: AnalysisId) => string,
): NoticeText {
  const cause = n.cause;
  const reverse = cause.kind === "undo" ? "redo" : "undo";
  const action = reverse === "undo" ? "Undo" : "Redo";
  const removed = namedOrCounted(
    n.removed,
    title,
    (name) => `${name} removed`,
    (count) => `${counted(count, "result")} removed`,
  );
  const stoppedWhat = andTheWriting(
    namedOrCounted(
      n.stopped,
      title,
      (name) => `the calculation of ${name}`,
      (count) => counted(count, "calculation"),
    ),
    n.writeStopped,
  );
  const stopped = stoppedWhat === null ? null : `${stoppedWhat} stopped`;
  // The two "and"s of the removed and of a writing stopped are read
  // apart by a comma before and after the stopped.
  const commas = removed !== null && stopped !== null && n.writeStopped;
  const what =
    removed === null
      ? (stopped ?? "")
      : stopped === null
        ? removed
        : commas
          ? `${removed}, and ${stopped}`
          : `${removed} and ${stopped}`;
  const leftBehindWhat = andTheWriting(
    namedOrCounted(
      n.leftBehind,
      title,
      (name) => `the ongoing calculation of ${name}`,
      (count) => `the ${grouped(count)} ongoing calculations`,
    ),
    n.writeLeftBehind,
  );
  const start = undoneOrRedone(cause);
  const sentences =
    start === null
      ? [
          capitalized(
            what === ""
              ? cause.description
              : `${what}${commas ? "," : ""} because ${cause.description}`,
          ),
        ]
      : [start, ...(what === "" ? [] : [capitalized(what)])];
  if (leftBehindWhat !== null) {
    sentences.push(
      capitalized(
        `${leftBehindWhat} will be stopped unless you ${reverse} the change`,
      ),
    );
  }
  if (n.writeDiscarded) {
    sentences.push(
      `The written file, not saved, was discarded, and ${action} does not bring it back; write it again to save it`,
    );
  }
  return { text: sentences.join(". "), action, reverse };
}

/**
 * The announcements of the status region made from two states of the
 * store, `before` and `after` one change; `[]` when none. The ends of the
 * requests come first, of the analyses and then of the writing, then
 * their starts, so that the end of the statistics a Run waited for is
 * said before the start of its own request; then the reads and the
 * warning of a reopened project. A calculation is followed by the id of
 * its request, a read by its load id, and the read of the individuals
 * file also by its options of the CSV, compared by their values, so that
 * an undo back to a load already read, an opening, a result back from the
 * cache, a calculation left behind that ends, counts filled by the pass of
 * another analysis and a write dropped after a change announce nothing.
 * The warning of a reopened project is followed by its load too, so that
 * it is announced when it appears or comes with another load, from any
 * step.
 */
export function announcementsOf<R>(
  before: AppState<R, unknown>,
  after: AppState<R, unknown>,
  w: ShellWords<R>,
): readonly string[] {
  return [
    ...endedAnnouncements(before, after, w),
    ...writeEndedAnnouncements(before, after),
    ...startedAnnouncements(before, after, w),
    ...variantsReadAnnouncements(before.project, after.project),
    ...individualsReadAnnouncements(before.project, after.project),
    ...identityAnnouncements(before.project, after.project),
  ];
}

/** The warning of a reopened project that differs from its file, when it
    appeared or is there with another load than before; while its load is
    being read, at the end of the read instead, after the read's own
    announcement, with the words the read gave it; not through a change
    that keeps it. */
function identityAnnouncements(
  before: Project,
  after: Project,
): readonly string[] {
  const warning = identityWarning(after);
  if (warning === null || after.variants?.read.kind === "pending") {
    return [];
  }
  const sameLoad = before.variants?.fileId === after.variants?.fileId;
  const readEnded = sameLoad && before.variants?.read.kind === "pending";
  return identityWarning(before) !== null && sameLoad && !readEnded
    ? []
    : [`Warning: ${warning}`];
}

/** The requests of `runs` by their ids. */
function byRunId(runs: readonly RunView[]): ReadonlyMap<number, RunView> {
  return new Map(runs.map((run) => [run.runId, run]));
}

/** The requests of `runs` of an analysis, without those of the writing
    of the filtered variants, whose words are their own. */
function ofAnalyses(
  runs: readonly RunView[],
): readonly (RunView & { readonly analysis: AnalysisId })[] {
  return runs.filter(
    (run): run is RunView & { readonly analysis: AnalysisId } =>
      run.analysis !== null,
  );
}

/** "Diversity: calculating." for each request of an analysis that is
    new, then "Writing panel.filtered.nei." for a request of the writing
    that is new, and, in the same change, the calculations left behind
    that went to being stopped, added to the last. */
function startedAnnouncements<R>(
  before: AppState<R, unknown>,
  after: AppState<R, unknown>,
  w: ShellWords<R>,
): readonly string[] {
  const was = byRunId(before.runs);
  const isNew = (run: RunView): boolean => !was.has(run.runId);
  const started = ofAnalyses(after.runs)
    .filter(isNew)
    .map((run) => `${w.title(run.analysis)}: calculating.`);
  if (after.runs.some((run) => run.analysis === null && isNew(run))) {
    started.push(`Writing ${escaped(writtenName(after.project))}.`);
  }
  const now = byRunId(after.runs);
  const stopped = ofAnalyses(before.runs).filter(
    (run) =>
      !run.current && !run.stopping && now.get(run.runId)?.stopping === true,
  );
  const last = started.pop();
  if (last === undefined) return [];
  const [only] = stopped;
  const earlier =
    only === undefined
      ? null
      : stopped.length === 1
        ? `The earlier calculation of ${w.title(only.analysis)} was stopped.`
        : `The ${grouped(stopped.length)} earlier calculations were stopped.`;
  return [...started, earlier === null ? last : `${last} ${earlier}`];
}

/** The requests of `before` that were current and are no longer in the
    runs of `after`. */
function endedRuns(
  before: AppState<unknown, unknown>,
  after: AppState<unknown, unknown>,
): readonly RunView[] {
  const now = byRunId(after.runs);
  return before.runs.filter((run) => run.current && !now.has(run.runId));
}

/** The end of each request of an analysis that was current and left
    `runs`: done, with its warnings and the comparison with the project
    file its panel shows under the result, or for the Counts of the
    filters what they counted; failed, with the step that says why; or
    stopped. */
function endedAnnouncements<R>(
  before: AppState<R, unknown>,
  after: AppState<R, unknown>,
  w: ShellWords<R>,
): readonly string[] {
  const announcements: string[] = [];
  for (const run of ofAnalyses(endedRuns(before, after))) {
    const name = w.title(run.analysis);
    if (run.stopping) {
      announcements.push(`${name}: stopped.`);
      continue;
    }
    const status = after.analyses.find(
      (analysis) => analysis.id === run.analysis,
    )?.status;
    if (status?.kind === "done" && status.key === run.key) {
      if (run.analysis === filterCounts.id) {
        const counts = countsText(after, w, status.warnings);
        announcements.push(
          counts === null ? `${name}: done.` : `${name}: done. ${counts}`,
        );
        continue;
      }
      const numWarnings = status.warnings.length;
      const ended =
        numWarnings === 0
          ? `${name}: done.`
          : `${name}: done, ${counted(numWarnings, "warning")}.`;
      // The line the panel shows under the result, for an opened project.
      const comparison =
        status.check === null
          ? uncomparedText(after.project, run.analysis)
          : checkVerdictText(status.check);
      announcements.push(
        comparison === null ? ended : `${ended} ${comparison}`,
      );
    } else if (status?.kind === "error" && status.key === run.key) {
      const step = STEP_NAMES[w.stepOf(run.analysis)];
      announcements.push(
        `${notCalculatedText(name)} The ${step} step says why.`,
      );
    }
  }
  return announcements;
}

/** What the Counts of the filters counted, the line of the total of the
    Variants step, or, when a filter kept none, the text of that warning
    in its place; `null` when neither can be said. */
function countsText<R>(
  s: AppState<R, unknown>,
  w: ShellWords<R>,
  warnings: readonly Warning[],
): string | null {
  const keptNone = warnings.find(
    (warning) => warning.code === "filterKeptNone",
  );
  if (keptNone !== undefined) {
    return keptNone.text;
  }
  const numVarsKept = w.variantsKept(s);
  return numVarsKept === null ? null : filtersTotalText(s.project, numVarsKept);
}

/** The end of a request of the writing that was current and left
    `runs`: the file written with its size, a file of no variant, a
    failure, or a stop. */
function writeEndedAnnouncements(
  before: AppState<unknown, unknown>,
  after: AppState<unknown, unknown>,
): readonly string[] {
  const announcements: string[] = [];
  const write = after.write;
  for (const run of endedRuns(before, after)) {
    if (run.analysis !== null) continue;
    if (run.stopping) {
      announcements.push("Writing the file: stopped.");
      continue;
    }
    // A request that was current ends with the state of its key.
    switch (write?.kind) {
      case "done":
        announcements.push(
          `${escaped(writtenName(after.project))} is written, ${sizeText(write.written.numBytes)}; Save it in the Variants step.`,
        );
        break;
      case "noVariant": {
        const variants = after.project.variants;
        if (variants !== null) {
          announcements.push(
            `The filters kept none of the variants of ${escaped(variants.name)}, so there is nothing to write.`,
          );
        }
        break;
      }
      case "error":
        announcements.push(`${NOT_WRITTEN} The Variants step says why.`);
        break;
      case "locked":
      case "saved":
      case "running":
      case "ready":
      case undefined:
        break;
    }
  }
  return announcements;
}

/** The sentence of the check of the individuals of the variants file
    against the metadata file, when both are read, or `null`: "All 342
    individuals found.", "12 individuals of panel.nei are not in
    pops.csv.". */
function checkSentence(p: Project): string | null {
  const check = individualsCheck(p);
  if (check === null || p.variants === null || p.individuals === null) {
    return null;
  }
  const numMissing = check.missing.length;
  if (numMissing === 0) {
    return `All ${counted(check.found, "individual")} found.`;
  }
  const verb = numMissing === 1 ? "is" : "are";
  return `${counted(numMissing, "individual")} of ${escaped(p.variants.name)} ${verb} not in ${escaped(p.individuals.name)}.`;
}

/** The read, or the failure, of the variants file of the same load,
    which was pending before the change. */
function variantsReadAnnouncements(
  before: Project,
  after: Project,
): readonly string[] {
  const was = before.variants;
  const now = after.variants;
  if (was?.read.kind !== "pending" || was.fileId !== now?.fileId) {
    return [];
  }
  const read = now.read;
  switch (read.kind) {
    case "pending":
      return [];
    case "failed":
      return reasonOf(projectNeeds(after));
    case "read": {
      const text = `${escaped(now.name)} read: ${counted(read.individuals.length, "individual")}, ploidy ${String(read.ploidy)}.`;
      const check = checkSentence(after);
      return [check === null ? text : `${text} ${check}`];
    }
  }
}

/** A reason as the announcements it makes: itself, or none. */
function reasonOf(reason: string | null): readonly string[] {
  return reason === null ? [] : [reason];
}

/** Whether two sets of options of a CSV are the same, by their values;
    both `null` for an xlsx. */
function sameCsv(a: CsvOptions | null, b: CsvOptions | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.encoding === b.encoding &&
    a.separator === b.separator &&
    a.decimal === b.decimal
  );
}

/** The read, or the failure, of the metadata file of the same load and
    options, which was pending before the change. */
function individualsReadAnnouncements(
  before: Project,
  after: Project,
): readonly string[] {
  const was = before.individuals;
  const now = after.individuals;
  if (
    was?.read.kind !== "pending" ||
    was.fileId !== now?.fileId ||
    !sameCsv(was.csv, now.csv)
  ) {
    return [];
  }
  const read = now.read;
  switch (read.kind) {
    case "pending":
      return [];
    case "failed":
      return reasonOf(individualsNeeds(after));
    case "read": {
      const text = `${escaped(now.name)} read: ${tableSizeText(read.table)}.`;
      const check = checkSentence(after);
      return [check === null ? text : `${text} ${check}`];
    }
  }
}
