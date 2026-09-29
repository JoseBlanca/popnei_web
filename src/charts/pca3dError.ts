/**
 * The error of a browser that cannot draw the 3D plot of the PCA
 * (docs/specs/charts/pca3d.md, "When the browser has no WebGL"). In a
 * file of its own that imports nothing, so that the screen, which tells
 * this error apart with `instanceof`, imports it with the page, while
 * pca3d.ts, and three.js with it, stay in the file the page downloads when
 * the 3D view is first shown.
 */

/** Why the 3D plot was not drawn: the browser gives no WebGL 2 context. */
export type Pca3dErrorKind = "noWebGl";

/**
 * The browser gives no WebGL 2 context: WebGL turned off, the graphics
 * card refused, or a remote desktop. A state of the browser the screen
 * shows, not a defect.
 */
export class Pca3dError extends Error {
  /** Always `noWebGl`, the one state of the browser the 3D plot cannot draw in. */
  readonly kind: Pca3dErrorKind;

  /** The error of a browser with no WebGL 2, whose message says it for the log. */
  constructor() {
    super("The browser gives no WebGL 2 context.");
    this.name = "Pca3dError";
    this.kind = "noWebGl";
  }
}
