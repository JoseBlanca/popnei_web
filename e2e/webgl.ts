/**
 * The script of e2e/webgl.html: asks a canvas for a WebGL 2 context with
 * the attributes of pca3d.md, "When the browser has no WebGL", and sets
 * what the browser gave as `window.webglPage`.
 */

import type { WebGlPage } from "./webglPage.ts";

function ask(): WebGlPage {
  const gl = document.createElement("canvas").getContext("webgl2", {
    alpha: true,
    depth: true,
    stencil: false,
    antialias: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
  });
  if (gl === null) {
    const webgl1 =
      document.createElement("canvas").getContext("webgl") !== null;
    return { given: false, webgl1 };
  }
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array;
  return {
    given: true,
    vendor: String(gl.getParameter(gl.VENDOR)),
    renderer: String(gl.getParameter(gl.RENDERER)),
    unmaskedRenderer:
      debug === null
        ? null
        : String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)),
    pointSizeRange: [range[0] ?? Number.NaN, range[1] ?? Number.NaN],
    maxTextureSize: Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)),
  };
}

window.webglPage = ask();
