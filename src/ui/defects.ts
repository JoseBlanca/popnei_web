/**
 * The log of the errors of our own code that nothing else shows, which
 * the error bar at the top of the page reads (docs/specs/entry.md, "The
 * errors nothing else shows"; docs/specs/shell.md, "The error bar"). The
 * entry gives it what the window's `error` and `unhandledrejection`
 * events carry, and what React's `onUncaughtError` and `onCaughtError`
 * give, the second for an error the boundary of a step caught. A small store of
 * its own, which the bar reads with `useSyncExternalStore`, as the screens
 * read the store of core.
 */
import { messageOf } from "../core/thrown.ts";

/** One error, as the log keeps it. */
export interface Defect {
  /** The message of the error, or the text of what was thrown. */
  readonly message: string;
  /** The message, the stack or the component stack, and where it came
      from, for a report of the bug. */
  readonly details: string;
}

/** What the bar shows. */
export interface DefectsState {
  /** The first error since the bar was last closed, or `null`. */
  readonly first: Defect | null;
  /** How many errors came after it. */
  readonly more: number;
}

/** Where an error came from: the window's `error` event, its
    `unhandledrejection` event, React drawing the shell outside every
    boundary, React drawing a step, whose error boundary caught it, or
    Save the project of the error bar, which caught it. */
export type DefectOrigin =
  "event" | "rejection" | "drawing" | "boundary" | "barSave" | "worker";

/** The log of the errors, made once by the entry of the page. */
export interface Defects {
  /** What the bar shows now, the same object until an error or a close. */
  getState(): DefectsState;
  /** Calls `listener` after every change; returns the function that stops
      it. A property made once, so React keeps it. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Adds an error: `error` is what was thrown, `componentStack` the list
      of the components being drawn, for an error of React, or `null`. */
  report(
    error: unknown,
    origin: DefectOrigin,
    componentStack: string | null,
  ): void;
  /** The bar is closed: the log starts again empty. */
  dismiss(): void;
  /** The details of every error kept, for "Copy the details"; "" when
      there is none. */
  details(): string;
}

/** The errors whose details are kept; the rest are only counted, so that
    an error thrown in a loop does not fill the memory of the tab. */
export const MAX_DEFECTS_KEPT = 20;

/** Where each origin came from, in the details. */
const ORIGIN_TEXT: Readonly<Record<DefectOrigin, string>> = {
  event: "thrown in an event handler, through the window's error event",
  rejection:
    "a promise rejected with nothing to handle it, through the window's unhandledrejection event",
  drawing: "thrown while React drew the application, through onUncaughtError",
  boundary:
    "thrown while React drew a step, caught by the error boundary of a step, through onCaughtError",
  barSave:
    "thrown as Save the project of the error bar wrote the project file, caught by the bar",
  worker:
    "thrown in the calculation worker during a calculation, given back to the page as its failure",
};

const EMPTY: DefectsState = Object.freeze({ first: null, more: 0 });

/** Makes the log of the errors, empty. */
export function createDefects(): Defects {
  let state = EMPTY;
  let kept: Defect[] = [];
  let count = 0;
  const listeners = new Set<() => void>();

  function changed(next: DefectsState): void {
    state = next;
    for (const listener of [...listeners]) listener();
  }

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    report(error, origin, componentStack) {
      count += 1;
      const defect = toDefect(error, origin, componentStack, count);
      if (kept.length < MAX_DEFECTS_KEPT) kept.push(defect);
      changed({ first: state.first ?? defect, more: count - 1 });
    },
    dismiss() {
      kept = [];
      count = 0;
      changed(EMPTY);
    },
    details() {
      const blocks = kept.map((defect) => defect.details);
      const notKept = count - kept.length;
      if (notKept > 0) {
        blocks.push(
          `${String(notKept)} more ${notKept === 1 ? "error" : "errors"} followed, whose details were not kept.`,
        );
      }
      return blocks.join("\n\n");
    },
  };
}

/** The error `number` of the log, as it is kept. */
function toDefect(
  error: unknown,
  origin: DefectOrigin,
  componentStack: string | null,
  number: number,
): Defect {
  const message = messageOf(error);
  const lines = [`Error ${String(number)}, ${ORIGIN_TEXT[origin]}:`, message];
  if (error instanceof Error) {
    lines.push(error.stack ?? "No stack.");
  }
  if (componentStack !== null) {
    lines.push(`The components being drawn:${componentStack}`);
  }
  return { message, details: lines.join("\n") };
}

/**
 * Whether the message of an `error` event is one of the ResizeObserver
 * messages that break nothing: "ResizeObserver loop completed with
 * undelivered notifications." in Chromium, "ResizeObserver loop limit
 * exceeded" in older browsers. A browser fires them when an element that
 * watches its size takes more than one frame to settle.
 */
export function isResizeObserverNoise(message: string): boolean {
  return message.startsWith("ResizeObserver loop");
}
