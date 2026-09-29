/**
 * The download of the 3D view, `src/charts/pca3d.ts` with three.js, which
 * the bundler makes a file of its own because nothing imports it but
 * this `import()` (docs/specs/charts/pca3d.md, "Loading three.js"): asked
 * for the first time a result is drawn in 3D in the tab, and kept once it
 * arrives, so that the next 3D view is drawn at once. A download that
 * failed is forgotten, so that "Try again" asks the network again; a
 * browser may still give the same failure to a later `import()` of the
 * same file without asking it, which the standard leaves open.
 */

import type * as Pca3dExports from "../../../charts/pca3d.ts";

/** The module of the 3D view. */
export type Pca3dModule = typeof Pca3dExports;

/** The download under way or done, or `null` before the first and after
    a failure. */
let loading: Promise<Pca3dModule> | null = null;

/** The module, once it has arrived. */
let loaded: Pca3dModule | null = null;

/** The module of the 3D view, when it has arrived; `null` until then. */
export function loadedPca3d(): Pca3dModule | null {
  return loaded;
}

/** The module of the 3D view, downloaded the first time it is asked for;
    refused when the download fails, which a later call tries again. */
export function loadPca3d(): Promise<Pca3dModule> {
  loading ??= import("../../../charts/pca3d.ts").then(
    (module) => {
      loaded = module;
      return module;
    },
    (error: unknown) => {
      loading = null;
      throw error instanceof Error
        ? error
        : new Error("The 3D view could not be downloaded.");
    },
  );
  return loading;
}
