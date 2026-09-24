/**
 * The history of the projects the user has had, for undo and redo
 * (docs/specs/core/history.md). It is a plain value, as the project is,
 * and every function gives a new one, or the one it was given when
 * nothing changes. An undo gives back the previous project itself, the
 * same object, so the screens, which compare with `===`, see no change
 * but the one undone, and the results of that project are found again by
 * their keys.
 */

import type { Project } from "./project.ts";

/** One project of the history, with the command that made it. */
export interface Entry {
  /** The project. */
  readonly project: Project;
  /** A few words that say what the command changed, "the MAF filter
      changed", which the notice of removed results puts after "because";
      "" for the first project of a history. */
  readonly description: string;
}

/** The projects before the present, the present, and those an undo left
    to redo. */
export interface History {
  /** The projects an undo goes back to, oldest first, at most `maxSteps`
      of them. */
  readonly past: readonly Entry[];
  /** The current project. */
  readonly present: Entry;
  /** The projects a redo goes forward to, the next redo first. */
  readonly future: readonly Entry[];
  /** The steps of undo kept, which every function keeps. */
  readonly maxSteps: number;
}

/** The steps of undo kept in the application; the oldest beyond them is
    dropped (the history spec, Open 1). */
export const MAX_UNDO_STEPS = 200;

/**
 * A history with the one project `p` and nothing to undo or redo: the
 * first project of a page, or an opened project file. It keeps at most
 * `maxSteps` steps of undo, which must be a whole number of at least 1;
 * any other value throws a defect.
 */
export function startHistory(p: Project, maxSteps: number): History {
  if (!Number.isInteger(maxSteps) || maxSteps < 1) {
    throw new Error(
      `popnei_web defect: the steps of undo kept must be a whole number of at least 1, not ${String(maxSteps)}`,
    );
  }
  return {
    past: [],
    present: { project: p, description: "" },
    future: [],
    maxSteps,
  };
}

/**
 * The step of a command of the user: `next`, the project the command
 * made, becomes the present with `description`, the present goes last in
 * the past, the oldest step beyond `maxSteps` is dropped, and the future
 * is emptied. When `next` is the present project itself, the command
 * changed nothing and `h` is returned.
 */
export function commit(
  h: History,
  next: Project,
  description: string,
): History {
  if (next === h.present.project) {
    return h;
  }
  return {
    past: [...h.past, h.present].slice(-h.maxSteps),
    present: { project: next, description },
    future: [],
    maxSteps: h.maxSteps,
  };
}

/**
 * The last project of the past becomes the present, and the present goes
 * first in the future. What was undone is the description of the present
 * of `h`. With nothing to undo, `h` is returned.
 */
export function undo(h: History): History {
  const previous = h.past.at(-1);
  if (previous === undefined) {
    return h;
  }
  return {
    past: h.past.slice(0, -1),
    present: previous,
    future: [h.present, ...h.future],
    maxSteps: h.maxSteps,
  };
}

/**
 * The first project of the future becomes the present, and the present
 * goes last in the past. What was redone is the description of the
 * present of the history returned. With nothing to redo, `h` is returned.
 * The past keeps within `maxSteps` with no entry dropped: the past and
 * the future together never hold more than `maxSteps` entries, since a
 * commit empties the future and an undo moves one entry from the past to
 * it.
 */
export function redo(h: History): History {
  const next = h.future[0];
  if (next === undefined) {
    return h;
  }
  return {
    past: [...h.past, h.present],
    present: next,
    future: h.future.slice(1),
    maxSteps: h.maxSteps,
  };
}

/**
 * A record of a read, `f`, one of the records of the project spec with
 * its arguments, applied to every project of the history, past, present
 * and future, and making no step. An entry whose project `f` returns as
 * it was given stays the same object, and when no project changes `h` is
 * returned.
 */
export function mapProjects(h: History, f: (p: Project) => Project): History {
  const mapEntry = (entry: Entry): Entry => {
    const project = f(entry.project);
    return project === entry.project
      ? entry
      : { project, description: entry.description };
  };
  const past = h.past.map(mapEntry);
  const present = mapEntry(h.present);
  const future = h.future.map(mapEntry);
  if (
    present === h.present &&
    past.every((e, i) => e === h.past[i]) &&
    future.every((e, i) => e === h.future[i])
  ) {
    return h;
  }
  return { past, present, future, maxSteps: h.maxSteps };
}
