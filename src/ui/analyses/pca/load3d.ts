/**
 * The download of the 3D view, `src/charts/pca3d.ts` with three.js, which
 * the bundler makes a file of its own because nothing imports it but
 * this `import()` (docs/specs/charts/pca3d.md, "Loading three.js"): asked
 * for the first time a result is drawn in 3D in the tab, and kept once it
 * arrives, so that the next 3D view is drawn at once. A download that
 * failed is forgotten, so that "Try again" asks the network again, at
 * another address in a browser that would give the same failure again
 * (src/ui/codeDownload.ts).
 */

import type * as Pca3dExports from "../../../charts/pca3d.ts";
import { createCodeDownload } from "../../codeDownload.ts";

/** The module of the 3D view. */
export type Pca3dModule = typeof Pca3dExports;

/** The download of the 3D view. */
const DOWNLOAD = createCodeDownload<Pca3dModule>(
  () => import("../../../charts/pca3d.ts"),
);

/** The module of the 3D view, when it has arrived; `null` until then. */
export function loadedPca3d(): Pca3dModule | null {
  return DOWNLOAD.loaded();
}

/** The module of the 3D view, downloaded the first time it is asked for;
    refused when the download fails, which a later call tries again. */
export function loadPca3d(): Promise<Pca3dModule> {
  return DOWNLOAD.load();
}
