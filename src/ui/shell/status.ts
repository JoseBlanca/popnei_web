/**
 * The announcer of the status region of the shell (docs/specs/shell.md,
 * "The status region"): a small store of the text of the region, which
 * the region reads with `useSyncExternalStore`, as the screens read the
 * store of core. The entry makes it once, and the shell gives the screens
 * its `announce`.
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

  return {
    announce(next: string): void {
      if (waiting.length === 0) {
        change("");
        setTimeout(write, ANNOUNCE_DELAY_MS);
      }
      waiting.push(next);
    },
    getState(): string {
      return text;
    },
    subscribe,
  };
}
