/**
 * The words of the shell (docs/specs/shell.md): the state of each step
 * and its reason, the summary line, the words of the notice, and the
 * announcements the status region makes from two states of the store.
 * Pure functions of the state, so that a test in node checks them; the
 * shell draws them, and the entry announces what `announcementsOf` gives
 * at every change of the store. An analysis is named by the title of its
 * panel, which the caller gives as `title`, so that these words need no
 * component.
 */

import {
  populationsNeeds,
  populationsOf,
  populationsToRun,
} from "../../core/analyses/diversity.ts";
import { POPGEN_STEPS } from "../../core/apps.ts";
import type { StepId } from "../../core/apps.ts";
import {
  counted,
  escaped,
  grouped,
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
import type { AppState, Notice, RunView } from "../../core/store.ts";
import type { CsvOptions } from "../../worker/protocol.ts";
import { capitalized, undoneOrRedone } from "../sentences.ts";
import { sizeText } from "../steps/individuals/words.ts";

/** The state of a step in the stepper: the first four are those of
    Variants and Individuals, the others, with done, those of Analyses. */
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

/** What the stepper and the status region say of an analysis in the
    state `error`, "Diversity could not be calculated.". */
function notCalculatedText(title: string): string {
  return `${title} could not be calculated.`;
}

/**
 * The state of each step and its reason, in the order of the steps, by
 * the table of the stepper: the first row of its step whose condition
 * holds. The states of the Analyses step are taken from the states the
 * store gives each analysis.
 */
export function stepStates<R>(
  s: AppState<R>,
  title: (id: AnalysisId) => string,
): readonly StepState[] {
  return POPGEN_STEPS.map((id) => stepStateOf(s, id, title));
}

/** The state of the step `id` and its reason, as `stepStates` gives it,
    worked out for that step alone, so that a screen can select its
    state and its reason as two strings. */
export function stepStateOf<R>(
  s: AppState<R>,
  id: StepId,
  title: (id: AnalysisId) => string,
): StepState {
  switch (id) {
    case "variants":
      return { id, ...variantsState(s.project) };
    case "individuals":
      return { id, ...individualsState(s.project) };
    case "analyses":
      return { id, ...analysesState(s, title) };
  }
}

/** The state of a step without its id. */
type Status = Omit<StepState, "id">;

/** The state of the Variants step. */
function variantsState(p: Project): Status {
  if (p.variants === null) {
    return { status: "todo", reason: askedFileText(p) ?? projectNeeds(p) };
  }
  if (p.variants.read.kind === "pending") {
    return { status: "reading", reason: projectNeeds(p) };
  }
  const reason = projectNeeds(p);
  return reason === null
    ? { status: "done", reason: null }
    : { status: "problem", reason };
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

/** The state of the Analyses step, from the states of its analyses and
    the notice. */
function analysesState<R>(
  s: AppState<R>,
  title: (id: AnalysisId) => string,
): Status {
  const statuses = s.analyses.map((analysis) => analysis.status);
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
  if (s.notice !== null && s.notice.removed.length > 0) {
    return { status: "removed", reason: null };
  }
  const failed = s.analyses.find(
    (analysis) => analysis.status.kind === "error",
  );
  if (failed !== undefined) {
    return { status: "failed", reason: notCalculatedText(title(failed.id)) };
  }
  const allDone = statuses.every(
    (status) => status.kind === "locked" || status.kind === "done",
  );
  return { status: allDone ? "done" : "ready", reason: null };
}

/**
 * The summary line, what the analyses would be run on: the variants file,
 * the filters and the metadata file, joined by " · ", "panel.nei · 200
 * individuals · 1,200 variants · 1 filter · 3 populations by pop". The
 * variants the filters keep are not in it, which the walking skeleton
 * does not know (the shell spec, Open 1): the line gives the variants of
 * the file once a calculation has counted them.
 */
export function summaryLine(p: Project): string {
  return [variantsPart(p), filtersPart(p), metadataPart(p)].join(" · ");
}

/** The part of the summary line on the variants file. */
function variantsPart(p: Project): string {
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
      const parts = [name, counted(read.individuals.length, "individual")];
      if (read.numVars !== null) {
        parts.push(counted(read.numVars, "variant"));
      }
      return parts.join(" · ");
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

/**
 * The words of the notice, from its four parts: the results removed and
 * the calculations stopped, joined by "and"; after a command, its
 * description after them, "because …", or alone; after an undo or a redo,
 * "Undone: …" first; and the calculations left behind, a sentence of
 * their own that names the action. The sentences are joined by a full
 * stop, with none after the last: "Diversity removed because the missing
 * data filter changed", with the action Undo.
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
  const stopped = namedOrCounted(
    n.stopped,
    title,
    (name) => `the calculation of ${name} stopped`,
    (count) => `${counted(count, "calculation")} stopped`,
  );
  const what = [removed, stopped].filter((part) => part !== null).join(" and ");
  const leftBehind = namedOrCounted(
    n.leftBehind,
    title,
    (name) =>
      `The ongoing calculation of ${name} will be stopped unless you ${reverse} the change`,
    (count) =>
      `The ${grouped(count)} ongoing calculations will be stopped unless you ${reverse} the change`,
  );
  const start = undoneOrRedone(cause);
  const sentences =
    start === null
      ? [
          capitalized(
            what === ""
              ? cause.description
              : `${what} because ${cause.description}`,
          ),
        ]
      : [start, ...(what === "" ? [] : [capitalized(what)])];
  if (leftBehind !== null) sentences.push(leftBehind);
  return { text: sentences.join(". "), action, reverse };
}

/**
 * The announcements of the status region made from two states of the
 * store, `before` and `after` one change, in the order of the table of
 * the status region; `[]` when none. A calculation is followed by the id
 * of its request, a read by its load id, and the read of the individuals
 * file also by its options of the CSV, compared by their values, so that
 * an undo back to a load already read, an opening, a result back from the
 * cache and a calculation left behind that ends announce nothing. The
 * warning of a reopened project is followed by its load too, so that it
 * is announced when it appears or comes with another load, from any step.
 */
export function announcementsOf<R>(
  before: AppState<R>,
  after: AppState<R>,
  title: (id: AnalysisId) => string,
): readonly string[] {
  return [
    ...startedAnnouncements(before, after, title),
    ...endedAnnouncements(before, after, title),
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

/** "Diversity: calculating." for each request that is new, and, in the
    same change, the calculations left behind that went to being stopped,
    added to the last. */
function startedAnnouncements<R>(
  before: AppState<R>,
  after: AppState<R>,
  title: (id: AnalysisId) => string,
): readonly string[] {
  const was = byRunId(before.runs);
  const started = after.runs
    .filter((run) => !was.has(run.runId))
    .map((run) => `${title(run.analysis)}: calculating.`);
  const now = byRunId(after.runs);
  const stopped = before.runs.filter(
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
        ? `The earlier calculation of ${title(only.analysis)} was stopped.`
        : `The ${grouped(stopped.length)} earlier calculations were stopped.`;
  return [...started, earlier === null ? last : `${last} ${earlier}`];
}

/** The end of each request that was current and left `runs`: done, with
    its warnings and the comparison with the project file its panel shows
    under the result, failed, or stopped. */
function endedAnnouncements<R>(
  before: AppState<R>,
  after: AppState<R>,
  title: (id: AnalysisId) => string,
): readonly string[] {
  const now = byRunId(after.runs);
  const announcements: string[] = [];
  for (const run of before.runs) {
    if (!run.current || now.has(run.runId)) continue;
    const name = title(run.analysis);
    if (run.stopping) {
      announcements.push(`${name}: stopped.`);
      continue;
    }
    const status = after.analyses.find(
      (analysis) => analysis.id === run.analysis,
    )?.status;
    if (status?.kind === "done" && status.key === run.key) {
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
      announcements.push(
        `${notCalculatedText(name)} The Analyses step says why.`,
      );
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
      const text = `${escaped(now.name)} read: ${sizeText(read.table)}.`;
      const check = checkSentence(after);
      return [check === null ? text : `${text} ${check}`];
    }
  }
}
