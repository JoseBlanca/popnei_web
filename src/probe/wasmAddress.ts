/**
 * The address of popnei's wasm, found in the browser's list of what the
 * probe's worker fetched (docs/specs/site.md, "The cases"). The browser
 * may add the wasm to that list after popnei's `init()` has thrown, as
 * Firefox 155 did on GitHub's Ubuntu, so the list is waited on for a
 * while. What the list is, and the clock, are given by the caller, so
 * that a test in node gives its own.
 */

/** The list of what the worker fetched, and a clock. */
export interface FetchedList {
  /** The addresses fetched so far. */
  readonly addresses: () => readonly string[];
  /** Calls `listener` with the addresses of the entries added to the
      list from now on; returns the function that stops it. */
  readonly watch: (listener: (added: readonly string[]) => void) => () => void;
  /** Calls `callback` once after `ms` milliseconds; returns the function
      that cancels it. */
  readonly after: (ms: number, callback: () => void) => () => void;
}

/** How long the list is waited on for the wasm, in milliseconds. */
export const WASM_ADDRESS_WAIT_MS = 1000;

/**
 * The address of the first `.wasm` of `list`, found now or added within
 * `waitMs`; null when none comes by then.
 */
export function wasmAddress(
  list: FetchedList,
  waitMs: number,
): Promise<string | null> {
  const now = wasmOf(list.addresses());
  if (now !== null) return Promise.resolve(now);
  return new Promise((resolve) => {
    let stopWatching = (): void => undefined;
    const cancelTimer = list.after(waitMs, () => {
      stopWatching();
      resolve(null);
    });
    stopWatching = list.watch((added) => {
      const found = wasmOf(added);
      if (found === null) return;
      cancelTimer();
      stopWatching();
      resolve(found);
    });
  });
}

/** The first address of `addresses` whose path ends in `.wasm`, or null. */
function wasmOf(addresses: readonly string[]): string | null {
  return (
    addresses.find((address) => new URL(address).pathname.endsWith(".wasm")) ??
    null
  );
}
