/**
 * The download of the 3D view, `src/charts/pca3d.ts` with three.js, which
 * the bundler makes a file of its own because nothing imports it but
 * this `import()` (docs/specs/charts/pca3d.md, "Loading three.js"): asked
 * for the first time a result is drawn in 3D in the tab, and kept once it
 * arrives, so that the next 3D view is drawn at once. A download that
 * failed is forgotten, so that "Try again" asks the network again.
 *
 * A browser may give the same failure to a later `import()` of the same
 * address without asking the network, which the standard leaves open:
 * Chromium 153 does, for the life of the page, where WebKit 26.6 asks
 * again (the review of work package 8 of docs/plans/individuals-pca.md,
 * 29 September 2026). So a retry asks for the same file at another
 * address, with `?retry=‹n›` after it. The address of the file is known
 * only to the bundler, which writes it into the `import()` above; the
 * browser gives it in the message of the failure, "Failed to fetch
 * dynamically imported module: ‹address›" in Chromium, and the retry takes
 * the first address of http or https in that message, whatever its
 * words. When the message holds none, as WebKit's does, the retry is the
 * plain `import()`, which such a browser asks the network for again.
 */

import type * as Pca3dExports from "../../../charts/pca3d.ts";

/** The module of the 3D view. */
export type Pca3dModule = typeof Pca3dExports;

/** The download under way or done, or `null` before the first and after
    a failure. */
let loading: Promise<Pca3dModule> | null = null;

/** The module, once it has arrived. */
let loaded: Pca3dModule | null = null;

/** The address of the file of the 3D view that the last failure named,
    or `null` when none named one. */
let failedAddress: string | null = null;

/** The retries asked so far, which number the addresses they ask for. */
let retries = 0;

/** The first address of http or https in the message of a failure. */
const ADDRESS = /https?:\/\/[^\s"'<>]+/u;

/** The first address of http or https in `error`'s message, or `null`. */
export function failedAddressOf(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error);
  return ADDRESS.exec(message)?.[0] ?? null;
}

/** The file of the 3D view, at `address` with a query that makes it
    another address for the browser. */
function importAgain(address: string): Promise<Pca3dModule> {
  retries += 1;
  const url = new URL(address);
  url.searchParams.set("retry", String(retries));
  // The address is the bundler's own file, which the page asked for
  // first; the bundler is told to leave this import as it is.
  return import(/* @vite-ignore */ url.href) as Promise<Pca3dModule>;
}

/** The module of the 3D view, when it has arrived; `null` until then. */
export function loadedPca3d(): Pca3dModule | null {
  return loaded;
}

/** The module of the 3D view, downloaded the first time it is asked for;
    refused when the download fails, which a later call tries again. */
export function loadPca3d(): Promise<Pca3dModule> {
  loading ??= (
    failedAddress === null
      ? import("../../../charts/pca3d.ts")
      : importAgain(failedAddress)
  ).then(
    (module) => {
      loaded = module;
      return module;
    },
    (error: unknown) => {
      loading = null;
      failedAddress = failedAddressOf(error) ?? failedAddress;
      throw error instanceof Error
        ? error
        : new Error("The 3D view could not be downloaded.");
    },
  );
  return loading;
}
