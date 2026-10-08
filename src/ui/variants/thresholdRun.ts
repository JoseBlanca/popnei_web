/**
 * The runs of the keys on the thresholds of popgen2.html
 * (docs/specs/steps/popgen2-filters.md, "When a threshold changes the
 * project"): a sequence of presses of the arrow keys, Page Up or Page
 * Down on one threshold, or of Home or End on its line, with less than a
 * second between two presses, which makes one change of the project, so
 * that a held key does not fill the 200 steps of Undo with two sweeps of
 * an axis. A press makes no change by itself; the run ends a second
 * after its last press, or when the focus leaves the threshold, and a
 * run that ends where it started makes none.
 *
 * And the gate of the page, which makes a run waiting a change before
 * any other command reaches the project: Undo, Redo, a click of the
 * FILTER box, another threshold, an opening by the button, a drop or a
 * paste (the spec, "A run waiting is made a change before any other
 * command"). The page's store is wrapped by `gatedStore`, so that every
 * command of a screen passes the gate; an opening also commits a number
 * typed in the box of a threshold and not yet committed, as the old page
 * does before an opening.
 */
import type { Store } from "../../core/store.ts";

/** The quiet time after the last press of a run that ends it, in
    milliseconds. */
export const RUN_QUIET_MS = 1000;

/** The gate of the page. */
export interface RunGate {
  /** Holds a run waiting of one threshold: `end` makes it a change, and
      `pending` gives the description of the change it would make now,
      `null` when it would make none. Gives the functions that tell the
      gate the run moved, and that let it go once it ended. */
  readonly hold: (end: () => void, pending: () => string | null) => HeldRun;
  /** Ends every run held, each made a change if it moved. */
  readonly endAll: () => void;
  /** The description of the change of the project that the run held last
      would make now, "the MAF filter changed", which Undo names while the
      run waits; `null` when no run is held or it would make none. */
  readonly pending: () => string | null;
  /** Calls `listener` when a run is held, moves or is let go; returns the
      function that stops it. A property made once, so React keeps it. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Holds the commit of the box of a threshold, which commits a number
      typed in it as Enter would; gives the function that lets it go,
      when the box goes. */
  readonly typing: (commit: () => void) => () => void;
  /** Commits what is typed in every box held, before an opening. */
  readonly commitTyped: () => void;
}

/** A run held by the gate. */
export interface HeldRun {
  /** Tells the gate the run moved, so that what Undo names follows it. */
  readonly moved: () => void;
  /** Lets the run go, once it ended. */
  readonly release: () => void;
}

/** Makes the gate of a page, with nothing held. */
export function createRunGate(): RunGate {
  // In the order they were held: the last is the one Undo names.
  const runs = new Map<() => void, () => string | null>();
  const boxes = new Set<() => void>();
  const listeners = new Set<() => void>();
  const tell = (): void => {
    for (const listener of [...listeners]) listener();
  };
  return {
    hold: (end, pending) => {
      // A function of its own, so that the same `end` held twice is held
      // as two.
      const held = (): void => {
        end();
      };
      runs.set(held, pending);
      tell();
      return {
        moved: tell,
        release: () => {
          if (runs.delete(held)) tell();
        },
      };
    },
    endAll: () => {
      // Each end lets its run go, and its change passes the gate again,
      // which then holds nothing of it.
      for (const end of [...runs.keys()]) {
        runs.delete(end);
        end();
      }
    },
    pending: () => {
      const last = [...runs.values()].at(-1);
      return last === undefined ? null : last();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    typing: (commit) => {
      const held = (): void => {
        commit();
      };
      boxes.add(held);
      return () => {
        boxes.delete(held);
      };
    },
    commitTyped: () => {
      for (const commit of [...boxes]) commit();
    },
  };
}

/** `store` with every command of a screen passing `gate` first: `apply`,
    `undo` and `redo` after every run held is made a change, and `open`
    after that and after what is typed in a box is committed. Each takes
    a function of the project and not a project, or nothing, so that none
    is given a project made before the gate changed it. The rest is the
    store's own. */
export function gatedStore<R, F>(
  store: Store<R, F>,
  gate: RunGate,
): Store<R, F> {
  return {
    ...store,
    apply: (description, command) => {
      gate.endAll();
      store.apply(description, command);
    },
    undo: () => {
      gate.endAll();
      store.undo();
    },
    redo: () => {
      gate.endAll();
      store.redo();
    },
    open: (make) => {
      gate.endAll();
      gate.commitTyped();
      store.open(make);
    },
  };
}

/** What a run is made with. */
export interface ThresholdRunDeps {
  /** The gate of the page, which holds the run while it waits. */
  readonly gate: RunGate;
  /** The description of the change a run that ended at `to` would make,
      as Undo would name it; `null` when it would make none. */
  readonly describe: (to: number) => string | null;
  /** Makes the change of a run that ended at `to`, elsewhere than it
      started. */
  readonly change: (to: number) => void;
  /** Told when a run ended, after its change if it made one, so that the
      threshold shows the project's value again. */
  readonly ended: () => void;
}

/** The runs of one threshold. */
export interface ThresholdRun {
  /** A press moved the threshold from `from`, where it stood before it,
      to `to`: a run starts at `from` when none waits, and ends a second
      after this press unless another comes. */
  readonly press: (from: number, to: number) => void;
  /** Ends the run waiting now, the focus leaving the threshold, a key of
      Undo or Redo, or the threshold leaving the page; nothing when none
      waits. */
  readonly end: () => void;
  /** Whether a run waits. */
  readonly waiting: () => boolean;
}

/** Makes the runs of one threshold, with none waiting. The quiet second
    is the browser's `setTimeout`. */
export function createThresholdRun(deps: ThresholdRunDeps): ThresholdRun {
  /** The run waiting: where it started, where it is, its timer and the
      gate's hold of it. */
  let waiting: {
    readonly from: number;
    to: number;
    timer: ReturnType<typeof setTimeout>;
    held: HeldRun | null;
  } | null = null;

  const end = (): void => {
    if (waiting === null) return;
    const { from, to, timer, held } = waiting;
    waiting = null;
    clearTimeout(timer);
    held?.release();
    if (to !== from) deps.change(to);
    deps.ended();
  };

  // What the run would make now, which the gate reads while it holds it.
  const pending = (): string | null =>
    waiting === null || waiting.to === waiting.from
      ? null
      : deps.describe(waiting.to);

  return {
    press: (from, to) => {
      if (waiting === null) {
        waiting = {
          from,
          to,
          timer: setTimeout(end, RUN_QUIET_MS),
          held: null,
        };
        waiting.held = deps.gate.hold(end, pending);
        return;
      }
      clearTimeout(waiting.timer);
      waiting.to = to;
      waiting.timer = setTimeout(end, RUN_QUIET_MS);
      waiting.held?.moved();
    },
    end,
    waiting: () => waiting !== null,
  };
}
