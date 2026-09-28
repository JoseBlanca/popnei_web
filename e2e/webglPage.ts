/**
 * What the page e2e/webgl.html gives the test of e2e/webgl.spec.ts, as
 * `window.webglPage`: what the browser gave when asked for a WebGL 2
 * context, with no three.js (docs/specs/charts/pca3d.md, "Which
 * headless engines give WebGL").
 */

/** What a WebGL 2 context reports of the graphics card that draws it. */
export interface WebGl2Given {
  readonly given: true;
  /** `VENDOR` and `RENDERER`, which a browser may mask. */
  readonly vendor: string;
  readonly renderer: string;
  /**
   * `UNMASKED_RENDERER_WEBGL` of the extension WEBGL_debug_renderer_info,
   * or null when the browser does not offer the extension.
   */
  readonly unmaskedRenderer: string | null;
  /** `ALIASED_POINT_SIZE_RANGE`, the smallest and the largest point, in pixels. */
  readonly pointSizeRange: readonly [number, number];
  /** `MAX_TEXTURE_SIZE`, in pixels. */
  readonly maxTextureSize: number;
}

/** What the browser gave, asked with the attributes of pca3d.md. */
export type WebGlPage =
  | WebGl2Given
  | {
      readonly given: false;
      /** Whether a WebGL 1 context is given instead, which three.js r186 refuses. */
      readonly webgl1: boolean;
    };

declare global {
  interface Window {
    /** Set by the script of e2e/webgl.html once it has run. */
    webglPage?: WebGlPage;
  }
}
