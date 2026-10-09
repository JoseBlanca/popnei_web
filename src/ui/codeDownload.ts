/**
 * A download of code that the bundler makes a file of its own, apart
 * from the page's first load, because nothing imports it but an
 * `import()`: the 3D view with three.js (docs/specs/charts/pca3d.md,
 * "Loading three.js"), and the result of the PCA tab of popgen2.html
 * (docs/specs/steps/popgen2-pca.md, "The result"). Asked for the first
 * time it is needed, and kept once it arrives, so that what needs it
 * next is drawn at once. A download that failed is forgotten, so that
 * "Try again" asks the network again; its state, which a screen draws,
 * is told to its listeners at each change.
 *
 * A browser may give the same failure to a later `import()` of the same
 * address without asking the network, which the standard leaves open:
 * Chromium 153 does, for the life of the page, where WebKit 26.6 asks
 * again (the review of work package 8 of docs/plans/individuals-pca.md,
 * 29 September 2026). So a retry asks for the same file at another
 * address, with `?retry=‹n›` after it. The address of the file is known
 * only to the bundler, which writes it into the `import()` of the
 * caller; the browser gives it in the message of the failure, "Failed to
 * fetch dynamically imported module: ‹address›" in Chromium, and the
 * retry takes the first address of http or https in that message,
 * whatever its words. When the message holds none, as WebKit's does, the
 * retry is the caller's `import()`, which such a browser asks the
 * network for again.
 */

/** Where a download is: not asked for yet, coming, arrived, or failed
    and not asked for again. */
export type CodeState = "idle" | "loading" | "loaded" | "failed";

/** A download of code apart from the page's. */
export interface CodeDownload<T> {
  /** The code, downloaded the first time it is asked for; refused when
      the download fails, which a later call tries again. */
  readonly load: () => Promise<T>;
  /** The code, once it has arrived; `null` until then. */
  readonly loaded: () => T | null;
  /** Where the download is. */
  readonly state: () => CodeState;
  /** Calls `listener` at each change of the state; returns the function
      that stops it. A property made once, so React keeps it. */
  readonly subscribe: (listener: () => void) => () => void;
}

/** The first address of http or https in the message of a failure. */
const ADDRESS = /https?:\/\/[^\s"'<>]+/u;

/** The first address of http or https in `error`'s message, or `null`. */
export function failedAddressOf(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error);
  return ADDRESS.exec(message)?.[0] ?? null;
}

/** The download of the code that `first`, the caller's `import()`,
    asks for, not asked for yet. */
export function createCodeDownload<T>(
  first: () => Promise<T>,
): CodeDownload<T> {
  /** The download under way or done, or `null` before the first and
      after a failure. */
  let loading: Promise<T> | null = null;
  let loaded: T | null = null;
  let failed = false;
  /** The address of the file that the last failure named, or `null`
      when none named one. */
  let failedAddress: string | null = null;
  /** The retries asked so far, which number the addresses they ask
      for. */
  let retries = 0;
  const listeners = new Set<() => void>();
  const tell = (): void => {
    for (const listener of [...listeners]) listener();
  };

  /** The file at `address` with a query that makes it another address for
      the browser. */
  const importAgain = (address: string): Promise<T> => {
    retries += 1;
    const url = new URL(address);
    url.searchParams.set("retry", String(retries));
    // The address is the bundler's own file, which the page asked for
    // first; the bundler is told to leave this import as it is.
    return import(/* @vite-ignore */ url.href) as Promise<T>;
  };

  return {
    load: () => {
      if (loading === null) {
        failed = false;
        loading = (
          failedAddress === null ? first() : importAgain(failedAddress)
        ).then(
          (module) => {
            loaded = module;
            tell();
            return module;
          },
          (error: unknown) => {
            loading = null;
            failed = true;
            failedAddress = failedAddressOf(error) ?? failedAddress;
            tell();
            throw error instanceof Error
              ? error
              : new Error("The code could not be downloaded.");
          },
        );
        tell();
      }
      return loading;
    },
    loaded: () => loaded,
    state: () =>
      loaded !== null
        ? "loaded"
        : loading !== null
          ? "loading"
          : failed
            ? "failed"
            : "idle",
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
