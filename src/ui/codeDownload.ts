/**
 * A download of code that the bundler makes a file of its own, apart
 * from the page's first load, because nothing imports it but an
 * `import()`: the 3D view with three.js (docs/specs/charts/pca3d.md,
 * "Loading three.js"), the result of the PCA tab of popgen2.html
 * (docs/specs/steps/popgen2-pca.md, "The result", its code) and the
 * Populations tab (docs/specs/steps/popgen2-populations.md, "The
 * result", its code). Asked for the first time it is needed, and kept
 * once it arrives, so that what needs it next is drawn at once. A
 * download that failed is forgotten, so that "Try again" asks the
 * network again; its state, which a screen draws, is told to its
 * listeners at each change.
 *
 * Chromium 153 and WebKit 26.6 give a later `import()` the failure an
 * earlier one met, without asking the network, for the file and for
 * every file it imports (the review of work package 1 of
 * docs/plans/population-tab.md, 11 October 2026). So a download may be
 * given `ready`, which asks the network for every file of the code
 * first (`codeFiles.ts`), and the `import()` is made only once each has
 * arrived: a failure there leaves nothing kept. Should the `import()`
 * fail all the same, the retry asks for its first file at another
 * address, with `?retry=‹n›` after it: the browser gives that address in
 * the message of the failure, "Failed to fetch dynamically imported
 * module: ‹address›" in Chromium, and the retry takes the first address
 * of a script in that message, and not that of styles, "Unable to
 * preload CSS for ‹address›", which is no script; with none, the retry
 * is the caller's `import()` again.
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

/** The first address of http or https of a script, `.js` with or
    without a query, in the message of a failure. */
const ADDRESS = /https?:\/\/[^\s"'<>?]+\.js(?:\?[^\s"'<>]*)?(?=$|[\s"'<>])/u;

/** The first address of a script, of http or https, in `error`'s
    message, or `null`. */
export function failedAddressOf(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error);
  return ADDRESS.exec(message)?.[0] ?? null;
}

/** The download of the code that `first`, the caller's `import()`,
    asks for, not asked for yet; `ready`, when given, is asked before
    each `import()` and settles once every file of the code has
    arrived, or is refused, and then no `import()` is made. */
export function createCodeDownload<T>(
  first: () => Promise<T>,
  ready?: () => Promise<void>,
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
        // The address of a failure is taken from the import()'s alone:
        // a file `ready` could not download is not the code's first.
        const importNow = (): Promise<T> =>
          (failedAddress === null ? first() : importAgain(failedAddress)).catch(
            (error: unknown) => {
              failedAddress = failedAddressOf(error) ?? failedAddress;
              throw error;
            },
          );
        loading = (
          ready === undefined ? importNow() : ready().then(importNow)
        ).then(
          (module) => {
            loaded = module;
            tell();
            return module;
          },
          (error: unknown) => {
            loading = null;
            failed = true;
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
