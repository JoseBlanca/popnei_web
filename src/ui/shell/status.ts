/**
 * The announcer of the status region of the shell (docs/specs/shell.md,
 * "The status region"): a small store of the text of the region, which
 * the region reads with `useSyncExternalStore`, as the screens read the
 * store of core. The entry makes it once and gives it to the screens
 * through `AnnouncerProvider` of announcer.tsx, and a screen announces
 * with the `announce` of `useAnnouncer`.
 */

/** How long the region stays empty before a text is written into it, in
    milliseconds. A screen reader reads a text written again only if it
    changed, so the region is emptied first; and React draws two changes
    made in the same moment as one, so the text waits. Decided by the
    shell spec, to be checked with VoiceOver. */
export const ANNOUNCE_DELAY_MS = 100;

/** The announcer: what is announced, and the text of the region now. */
export interface Announcer {
  /** Empties the region at once and writes `text` into it
      `ANNOUNCE_DELAY_MS` later, with any other text announced in that
      time after it, joined by a space. */
  announce(text: string): void;
  /** Runs `change`, and announces the text it gives, if any, as
      `announce` does, but before the texts announced while it ran and
      after those announced before it: what the user did, known only
      once the change is made, said before what the change announced. */
  announceChange(change: () => string | null): void;
  /** Empties the region at once, and drops the texts waiting to be
      written into it: for words that no longer hold, and that nothing
      replaces. */
  clear(): void;
  /** The text of the region now; `""` when it is empty. */
  getState(): string;
  /** Calls `listener` after every change of the text, and returns the
      function that stops it. The same function on every read. */
  readonly subscribe: (listener: () => void) => () => void;
}

/** Makes the announcer, with an empty region. */
export function createAnnouncer(): Announcer {
  let text = "";
  // The texts announced since the region was emptied, waiting for the
  // timer; empty when no timer runs.
  let waiting: string[] = [];
  const listeners = new Set<() => void>();

  function change(next: string): void {
    text = next;
    for (const listener of [...listeners]) listener();
  }

  function write(): void {
    const joined = waiting.join(" ");
    waiting = [];
    change(joined);
  }

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  function wait(): void {
    if (waiting.length === 0) {
      change("");
      setTimeout(write, ANNOUNCE_DELAY_MS);
    }
  }

  return {
    announce(next: string): void {
      wait();
      waiting.push(next);
    },
    announceChange(change: () => string | null): void {
      const at = waiting.length;
      const next = change();
      if (next === null) return;
      wait();
      waiting.splice(at, 0, next);
    },
    clear(): void {
      // A timer still running writes the empty text of no text waiting.
      waiting = [];
      if (text !== "") change("");
    },
    getState(): string {
      return text;
    },
    subscribe,
  };
}
