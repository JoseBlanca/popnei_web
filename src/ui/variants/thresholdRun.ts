/**
 * The runs of the keys on the thresholds of popgen2.html
 * (docs/specs/steps/popgen2-filters.md, "When a threshold changes the
 * project"): a sequence of presses of the arrow keys, Page Up or Page
 * Down on one threshold, or of Home or End on its line, with less than a
 * second between two presses, which makes one change of the project, so
 * that a held key makes one change for a sweep of an axis and not one at
 * each step. A press makes no change by itself; the run ends a second
 * after its last press, or when the focus leaves the threshold, and a
 * run that ends where it started makes none.
 *
 * And the gate of the page, which makes a run waiting a change before
 * any other command reaches the project: a click of the FILTER box,
 * another threshold, an opening by the button, a drop or a paste, a
 * change of the individuals file, a Run (the spec, "A run waiting is
 * made a change before any other command"). The page's store is wrapped
 * by `gatedStore`, so that every command of a screen passes the gate; an
 * opening, and a change of the individuals file, also commit a number
 * typed in the box of a threshold and not yet committed, as the old page
 * does before an opening.
 *
 * The gate also counts the changes under way, a change the user is
 * making that has not reached the project yet: a run of the keys, and
 * the holds the widgets take while a slider is held, a list is open,
 * digits wait or the dialog of the download is open; and tells its
 * listeners when the count rises from 0 and when it falls to 0, from
 * which the PCA's quiet second runs (docs/specs/steps/popgen2-pca.md,
 * "The PCA calculated again by itself").
 */
import { withoutUndo } from "../popgen2Store.ts";
import type { Popgen2PageStore } from "../popgen2Store.ts";

/** The quiet time after the last press of a run that ends it, in
    milliseconds. */
export const RUN_QUIET_MS = 1000;

/** The gate of the page. */
export interface RunGate {
  /** Holds a run waiting of one threshold, which `end` makes a change.
      Gives the function that lets it go once it ended. A listener that
      throws when the run is held does not keep the run from being held
      and given: its error is thrown a moment later, to the page's
      handler of errors. */
  readonly hold: (end: () => void) => HeldRun;
  /** Ends every run held, each made a change if it moved. Every run is let
      go and every end called also when one throws, and the listeners are
      told if the count of the changes under way fell to 0; then the
      first error is thrown. */
  readonly endAll: () => void;
  /** Calls `listener` when the count of the changes under way,
      `underWay`, rises from 0 or falls to 0, which is when `busy`
      changes, and at nothing else;
      returns the function that stops it. A property made once, so React
      keeps it. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Holds the commit of the box of a threshold, which commits a number
      typed in it as Enter would; gives the function that lets it go,
      when the box goes. A box held here is not a change under way, and
      `underWay` does not count it: a box also takes `holdChange` while
      its text differs from the project's value (task 3.2 of
      docs/plans/no-undo.md). */
  readonly typing: (commit: () => void) => () => void;
  /** Commits what is typed in every box held, before an opening. */
  readonly commitTyped: () => void;
  /** Holds a change under way that is not a run of the keys, a slider
      held, a list open, digits typed and not confirmed, the dialog of the
      download open (docs/specs/steps/popgen2-pca.md, "The PCA calculated
      again by itself"). Gives the function that lets it go, at its
      release or when its control leaves the page; a second call of it
      changes nothing. A listener that throws when the hold is taken does
      not keep the release from being given: its error is thrown a moment
      later, to the page's handler of errors. */
  readonly holdChange: () => () => void;
  /** The number of changes under way now: the holds of `holdChange` not
      let go, and the runs of the keys held. 0 when the user is in the
      middle of none. It changes from 1 to 2 and back with no listener
      told, so a screen that reads it with `subscribe`, as React's
      `useSyncExternalStore` does, reads only `busy()`, or whether it is
      0; the count itself is for the tests. */
  readonly underWay: () => number;
  /** Whether any change is under way now, `underWay() > 0`: it changes
      exactly when the listeners of `subscribe` are told, so a screen
      may read it with them. */
  readonly busy: () => boolean;
}

/** A run held by the gate. */
export interface HeldRun {
  /** Lets the run go, once it ended, and then calls `made`, which makes
      the change the run ended in; the listeners are told after it when
      the count fell to 0, so that one told reads the new project. The
      run is let go before `made`, so that its change, which passes the
      gate, finds nothing of it to end. */
  readonly release: (made?: () => void) => void;
}

/** Makes the gate of a page, with nothing held. */
export function createRunGate(): RunGate {
  // The ends of the runs held, in the order they were held.
  const runs = new Set<() => void>();
  const boxes = new Set<() => void>();
  // The holds of `holdChange`, each an object of its own, so that a
  // release counts once.
  const holds = new Set<object>();
  const listeners = new Set<() => void>();
  const count = (): number => runs.size + holds.size;
  // Calls every listener, also when one throws, and then throws the
  // first error, as the store tells its own.
  const tell = (): void => {
    const thrown: unknown[] = [];
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch (error) {
        thrown.push(error);
      }
    }
    if (thrown.length > 0) throw thrown[0];
  };
  // Tells the listeners that a hold was taken, and throws what one threw
  // a moment later, to the page's handler of errors: the hold is then
  // given all the same, or the count would stay above 0 for the session
  // with nothing left to let it go.
  const tellTaken = (): void => {
    try {
      tell();
    } catch (error) {
      queueMicrotask(() => {
        throw error;
      });
    }
  };
  return {
    hold: (end) => {
      // A function of its own, so that the same `end` held twice is held
      // as two.
      const held = (): void => {
        end();
      };
      const wasFree = count() === 0;
      runs.add(held);
      if (wasFree) tellTaken();
      return {
        release: (made) => {
          const wasHeld = runs.delete(held);
          try {
            made?.();
          } finally {
            if (wasHeld && count() === 0) tell();
          }
        },
      };
    },
    endAll: () => {
      // Every run is let go before any end is called, so that an end that
      // throws leaves none held; each end's change passes the gate again,
      // which then holds nothing of it. Every end is called, also after
      // one throws, and the listeners are told once, after every change
      // was made, when no hold is left; then the first error is thrown.
      const ended = [...runs];
      runs.clear();
      const thrown: unknown[] = [];
      try {
        for (const end of ended) {
          try {
            end();
          } catch (error) {
            thrown.push(error);
          }
        }
      } finally {
        if (ended.length > 0 && count() === 0) tell();
      }
      if (thrown.length > 0) throw thrown[0];
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
    holdChange: () => {
      const hold = {};
      const wasFree = count() === 0;
      holds.add(hold);
      const release = (): void => {
        if (holds.delete(hold) && count() === 0) tell();
      };
      if (wasFree) tellTaken();
      return release;
    },
    underWay: count,
    busy: () => count() > 0,
  };
}

/** `store` with every command of a screen passing `gate` first: `apply`
    after every run held is made a change, and `open`
    and `applyAfresh` after that and after what is typed in a box is
    committed, so that the fresh history drops their steps; and
    `startRun`, a Run or a Start again pressed, after the same, so that a
    PCA started within the second of a run of the arrow keys runs on the
    threshold the run gave, and is not stopped by the run's change a
    moment later (docs/specs/steps/popgen2-pca.md, "Run and Stop"). Each
    takes a function of the project and not a project, or nothing, so that
    none is given a project made before the gate changed it. The rest is
    the store's own, but for an undo and a redo, which it does not give
    even when `store` has them. */
export function gatedStore<R, F>(
  store: Popgen2PageStore<R, F>,
  gate: RunGate,
): Popgen2PageStore<R, F> {
  return {
    ...withoutUndo(store),
    apply: (description, command) => {
      gate.endAll();
      store.apply(description, command);
    },
    open: (make) => {
      gate.endAll();
      gate.commitTyped();
      store.open(make);
    },
    applyAfresh: (command) => {
      gate.endAll();
      gate.commitTyped();
      store.applyAfresh(command);
    },
    startRun: (id) => {
      gate.endAll();
      gate.commitTyped();
      return store.startRun(id);
    },
  };
}

/** What a run is made with. */
export interface ThresholdRunDeps {
  /** The gate of the page, which holds the run while it waits. */
  readonly gate: RunGate;
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
  /** Ends the run waiting now, the focus leaving the threshold or the
      threshold leaving the page; nothing when none waits. */
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
    const made = (): void => {
      if (to !== from) deps.change(to);
    };
    if (held === null) made();
    else held.release(made);
    deps.ended();
  };

  return {
    press: (from, to) => {
      if (waiting === null) {
        waiting = {
          from,
          to,
          timer: setTimeout(end, RUN_QUIET_MS),
          held: null,
        };
        waiting.held = deps.gate.hold(end);
        return;
      }
      clearTimeout(waiting.timer);
      waiting.to = to;
      waiting.timer = setTimeout(end, RUN_QUIET_MS);
    },
    end,
    waiting: () => waiting !== null,
  };
}
