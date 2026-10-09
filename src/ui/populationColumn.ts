/**
 * The column of the populations that popgen2.html chooses when a read of
 * the individuals file is recorded, and what the status region says of
 * that read (docs/specs/entry.md, "The column of the populations on
 * popgen2.html"). The record itself, shared with popgen.html, whose user
 * chooses every column, writes the table into every project of the
 * history that holds the file and chooses nothing; so the entry of the
 * page chooses, as a command, a step of the history, once at each read
 * recorded.
 */
import {
  defaultPopulationsColumn,
  populationColumnChoices,
} from "../core/populations.ts";
import { setGrouping } from "../core/project.ts";
import type {
  IndividualsRead,
  IndividualsSource,
  Project,
  TableRead,
} from "../core/project.ts";
import type { Store } from "../core/store.ts";
import type { CsvOptions, JobResult } from "../worker/protocol.ts";
import { individualsReadAnnouncement } from "./variants/individualsWords.ts";

/** The description of the command of the column the page chooses. */
const CHOSEN = "the column of the populations was chosen";

/**
 * Watches `store` for reads of the individuals file newly recorded,
 * sends the column of the populations the page chooses, and says each
 * read with `announce`. Gives the function that stops it.
 *
 * A read is newly recorded when the individuals file of the project, of
 * the same load id and options of a CSV as before the change, had a read
 * waiting, pending or failed in its worker, and now has a read or a
 * refusal; an undo, a redo or an opening of a variants file makes none.
 * The command and the words come in a microtask, after every listener of
 * the change has run, so that no command is sent in the middle of
 * telling them; `store` is the one gated as the screens' is, so that a
 * run of the keys on a threshold still held is made a change first.
 *
 * The page chooses when the grouping names no column the list offers,
 * but for a "None" the user chose for that load id: the grouping turned
 * to "None" from a column by a command the entry did not send, an undo
 * included, marks the load id, and turned back to a column unmarks it.
 * The marks are kept here, in memory, as the screen keeps the tab shown.
 */
export function choosePopulationColumns(deps: {
  readonly store: Pick<
    Store<JobResult, Blob>,
    "getState" | "subscribe" | "apply"
  >;
  readonly announce: (words: string) => void;
}): () => void {
  const { store, announce } = deps;
  // The load ids whose "None" the user chose.
  const userNone = new Set<string>();
  let before = store.getState().project;
  let stopped = false;

  const act = (fileId: string, read: IndividualsRead): void => {
    if (stopped) return;
    const individuals = store.getState().project.individuals;
    // Another change has replaced the read since: its own record, if
    // any, is acted on in its own turn.
    if (individuals?.fileId !== fileId || individuals.read !== read) return;
    if (read.kind === "read") {
      const column = columnToChoose(
        store.getState().project,
        read,
        userNone.has(fileId),
      );
      if (column !== null) {
        store.apply(CHOSEN, (p) =>
          setGrouping(p, { kind: "populations", column }),
        );
      }
    }
    const state = store.getState();
    const words = individualsReadAnnouncement(
      state.project,
      state.individualsKept,
    );
    if (words !== null) announce(words);
  };

  const unsubscribe = store.subscribe(() => {
    const now = store.getState().project;
    const was = before;
    before = now;
    if (now === was) return;
    // The entry's own command never makes "None", and makes a column only
    // from a "None" not marked, so it is noted as any other change.
    noteUserNone(was, now, userNone);
    const individuals = now.individuals;
    if (individuals !== null && isNewlyRecorded(was.individuals, individuals)) {
      const { fileId, read } = individuals;
      queueMicrotask(() => {
        act(fileId, read);
      });
    }
  });

  return () => {
    stopped = true;
    unsubscribe();
  };
}

/** The column the page sends for the read `read` of the project `p`:
    `defaultPopulationsColumn` when the grouping names no column the list
    offers and is not a "None" the user chose, `userNone`; null when it
    sends none, that function finding none among them. A grouping of
    another kind, which this page never makes, is never changed. */
function columnToChoose(
  p: Project,
  read: TableRead,
  userNone: boolean,
): string | null {
  if (p.grouping.kind !== "populations") return null;
  const column = p.grouping.column;
  if (
    column === null ? userNone : populationColumnChoices(read).includes(column)
  ) {
    return null;
  }
  return defaultPopulationsColumn(read);
}

/** Marks in `userNone` the load id whose grouping the change from `was`
    to `now`, not the entry's, turned from a column to "None", and
    unmarks it when it turned back to a column. */
function noteUserNone(was: Project, now: Project, userNone: Set<string>): void {
  const fileId = now.individuals?.fileId;
  if (fileId === undefined || was.individuals?.fileId !== fileId) return;
  const columnBefore = groupedColumn(was);
  const columnNow = groupedColumn(now);
  if (columnBefore === columnNow) return;
  if (columnNow === null) {
    userNone.add(fileId);
  } else if (columnBefore === null) {
    userNone.delete(fileId);
  }
}

/** The column of the grouping of `p` of the populations, null for
    "None"; undefined for a grouping of another kind. */
function groupedColumn(p: Project): string | null | undefined {
  return p.grouping.kind === "populations" ? p.grouping.column : undefined;
}

/** Whether `now`, the individuals file after a change, holds a read or a
    refusal newly recorded over `was`, the same load with the same
    options of a CSV whose read waited: pending, or failed in its worker,
    which the read after the worker's restart replaces. */
function isNewlyRecorded(
  was: IndividualsSource | null,
  now: IndividualsSource,
): boolean {
  if (
    was?.fileId !== now.fileId ||
    !sameCsv(was.csv, now.csv) ||
    now.read === was.read
  ) {
    return false;
  }
  const waited =
    was.read.kind === "pending" ||
    (was.read.kind === "failed" && was.read.error.kind === "worker");
  return waited && (now.read.kind === "read" || now.read.kind === "failed");
}

/** Whether two options of a CSV are the same, or both null, an xlsx of
    a project saved before every load had them. */
function sameCsv(a: CsvOptions | null, b: CsvOptions | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.encoding === b.encoding &&
    a.separator === b.separator &&
    a.decimal === b.decimal
  );
}
