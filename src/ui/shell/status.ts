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

/** How many times a text that replaces its kind may start the pause
    again, so that a key held on a threshold writes only its last count
    and yet holds the other texts back for about 1 s at most. */
const MAX_RESTARTS = 9;

/** The announcer: what is announced, and the text of the region now. */
export interface Announcer {
  /** Empties the region at once and writes `text` into it
      `ANNOUNCE_DELAY_MS` later, with any other text announced in that
      time after it, joined by a space. With `replaces`, the kind of a
      text only its latest holds, a text of that kind still waiting is
      dropped: the line of the individuals that pass, said once after a
      threshold stepped several times within that time. */
  announce(text: string, options?: AnnounceOptions): void;
  /** Runs `change`, and announces the text it gives, if any, as
      `announce` does, but before the texts announced while it ran and
      after those announced before it: what the user did, known only
      once the change is made, said before what the change announced.
      The texts of a kind announced before it are dropped, since the
      change moved the history and they no longer hold. */
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

/** The kind of the line of what the filters of individuals keep, which
    only its latest holds. */
export const INDIVIDUALS_KEPT_KIND = "individualsKept";

/** How a text is announced. */
export interface AnnounceOptions {
  /** The kind of the text, of which only the latest is said. */
  readonly replaces: string;
}

/** Makes the announcer, with an empty region. */
export function createAnnouncer(): Announcer {
  let text = "";
  // The texts announced since the region was emptied, waiting for the
  // timer, with the kind each replaces, or null; empty when no timer
  // runs.
  let waiting: { readonly text: string; readonly kind: string | null }[] = [];
  // The timer that writes the texts waiting, while one runs.
  let timer: ReturnType<typeof setTimeout> | undefined;
  // How many times the pause started again since the region was emptied.
  let restarts = 0;
  // The number of clears so far, by which a change tells that the texts
  // waiting before it were dropped while it ran.
  let clears = 0;
  const listeners = new Set<() => void>();

  function change(next: string): void {
    text = next;
    for (const listener of [...listeners]) listener();
  }

  function write(): void {
    timer = undefined;
    restarts = 0;
    const joined = waiting.map((w) => w.text).join(" ");
    waiting = [];
    change(joined);
  }

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  // Empties the region and starts the pause, unless a pause runs: the
  // texts waiting may all have been dropped while it runs, and a second
  // timer would leave the first beyond the reach of clear.
  function wait(): void {
    if (timer === undefined) {
      change("");
      timer = setTimeout(write, ANNOUNCE_DELAY_MS);
    }
  }

  return {
    announce(next: string, options?: AnnounceOptions): void {
      wait();
      const kind = options?.replaces ?? null;
      if (kind !== null) {
        const before = waiting.length;
        waiting = waiting.filter((w) => w.kind !== kind);
        // One of its kind dropped: the pause starts again, so that a key
        // held down writes its last text alone, up to a bound.
        if (waiting.length < before && restarts < MAX_RESTARTS) {
          restarts += 1;
          clearTimeout(timer);
          timer = setTimeout(write, ANNOUNCE_DELAY_MS);
        }
      }
      waiting.push({ text: next, kind });
    },
    announceChange(change: () => string | null): void {
      const clearsBefore = clears;
      const waitingBefore = waiting.length;
      const next = change();
      // A clear in the change dropped the texts waiting before it, so
      // the change's text goes first. Otherwise the texts of a kind
      // announced before it are dropped: the change moved the history,
      // and a count still waiting, of a threshold stepped just before an
      // Undo, no longer holds.
      let at = 0;
      if (clears === clearsBefore) {
        const earlier = waiting
          .slice(0, waitingBefore)
          .filter((w) => w.kind === null);
        waiting = [...earlier, ...waiting.slice(waitingBefore)];
        at = earlier.length;
      }
      if (next === null) return;
      wait();
      waiting.splice(at, 0, { text: next, kind: null });
    },
    clear(): void {
      clears += 1;
      clearTimeout(timer);
      timer = undefined;
      restarts = 0;
      waiting = [];
      if (text !== "") change("");
    },
    getState(): string {
      return text;
    },
    subscribe,
  };
}
