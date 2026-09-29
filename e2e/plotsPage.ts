/**
 * What the page of the tests of the plots, e2e/plots.html, gives the
 * tests of e2e/plots.spec.ts, as `window.plotsPage`: a histogram or a
 * scatter drawn at the size a test sets, and its handle, which a test
 * calls through `page.evaluate` (docs/specs/charts/plot2d.md and
 * scatter.md, "How it is verified").
 */

import type { PngErrorKind } from "../src/charts/export.ts";
import type { HistogramData } from "../src/charts/histogram.ts";
import type { Pca3dData, Pca3dHandle, ViewName } from "../src/charts/pca3d.ts";
import type { ScatterData } from "../src/charts/scatter.ts";
import type { ChartHandle } from "../src/charts/types.ts";

/** A point of the page, in CSS pixels from the corner of the viewport. */
export interface ViewportPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * The data of a 3D plot of the page: `cloud`, the scatter's 9,381 points
 * with a third coordinate; `five`, five points in five populations;
 * `forty`, 40 points in 40 populations; `pair`, two points at one place
 * across and up, of P1 below and P2 above, and a third of neither;
 * `values`, the five points of `five` coloured by the values 100 to 400
 * of their first four, and the fifth with no value.
 */
export type Pca3dKind = "cloud" | "five" | "forty" | "pair" | "values";

/** The times of the scatter, in milliseconds of `performance.now()`. */
export interface ScatterTimes {
  /** From `createScatter` to the next frame drawn, one per repetition. */
  readonly create: readonly number[];
  /** The call of `createScatter` alone, which draws before it returns. */
  readonly createCall: readonly number[];
  /** From an `update` that only changes the highlight to the next frame drawn. */
  readonly highlight: readonly number[];
  /** The call of that `update` alone. */
  readonly highlightCall: readonly number[];
}

/** The plots of the page, and what a test reads of them. */
export interface PlotsPage {
  /**
   * Draws the histogram of the MAF of e2e/fixtures/panel.nei, with the
   * threshold 0.95 and its legend, in a new element of `width` by
   * `height` CSS pixels, in place of the plot drawn before, and returns
   * its handle.
   */
  draw(width: number, height: number): ChartHandle<HistogramData>;
  /**
   * Draws the scatter of 9,381 points, in the populations P1, P2, P3 and
   * `<b>P4</b>` and in none, in a new element whose content is `width` by
   * `height` CSS pixels, with a padding of 8, `position: relative`, in
   * place of the plot drawn before, and returns its handle. Point 0, of
   * P1, named with markup, is alone at the top of the data; point 1, of
   * P2, alone at its bottom right corner; point 2, in no population, alone
   * at its bottom left corner.
   */
  drawScatter(width: number, height: number): ChartHandle<ScatterData>;
  /** Draws the scatter again with `highlighted` as the legend's highlight. */
  highlight(highlighted: number | null): void;
  /**
   * Where point `index` of the scatter is in the viewport, computed by the
   * page with `scatterScales`, apart from the plot.
   */
  pointPixel(index: number): ViewportPoint;
  /**
   * The distance in CSS pixels from (x, y) of the viewport to the nearest
   * point of the scatter, leaving out point `except` when it is given.
   */
  nearestDistance(x: number, y: number, except?: number): number;
  /** The calls of `onHover` of the scatter or the 3D plot since it was drawn, in order. */
  hovers(): (number | null)[];
  /** True once the markup of a name has run, which it never should. */
  markupRan(): boolean;
  /**
   * Draws the scatter `repeats` times, after one drawing not counted, in
   * an element of `width` by `height`, and times each drawing and an
   * update of its highlight to the next frame drawn; the element is
   * removed after.
   */
  timeScatter(
    width: number,
    height: number,
    repeats: number,
  ): Promise<ScatterTimes>;
  /**
   * True when the browser gives a canvas a WebGL 2 context, which the 3D
   * plot needs; the tests of the 3D plot are not run where it gives none.
   */
  webgl(): boolean;
  /**
   * Loads the 3D plot with `import()`, as the screen does, and draws the
   * data of `kind` in a new element whose content is `width` by `height`
   * CSS pixels, with a padding of 8, `position: relative`, in place of
   * the plot drawn before. In `cloud`, point 0, of P1, named with markup,
   * is alone at the top of the data, (0, 1.1, 0.9); points 3 and 4 are at
   * one place across and up, (−1.6, 1.1), 3 at a depth of −0.5 and 4 at
   * 0.5, nearer a camera above; the others are those of the scatter.
   */
  drawPca3d(width: number, height: number, kind: Pca3dKind): Promise<void>;
  /** The data of the 3D plot drawn last. */
  pca3dData(): Pca3dData;
  /** Draws the 3D plot again with `highlighted` as the legend's highlight. */
  pca3dHighlight(highlighted: number | null): void;
  /**
   * Where point `index` of the 3D plot drawn last is in the viewport at
   * `view` with a zoom of 1, computed by the page with the pieces of
   * pca3d.ts and projectToScreen, apart from the plot's own camera.
   */
  pca3dPixel(index: number, view: ViewName): ViewportPoint;
  /**
   * The distance in CSS pixels from point `index` to the nearest other
   * point of the 3D plot drawn last at `view`, as pca3dPixel places them.
   */
  pca3dNearest(index: number, view: ViewName): number;
  /** The calls of the 3D plot's onContextChange since it was drawn, in order. */
  contextChanges(): boolean[];
  /** The element of the plot drawn last; throws when none was drawn. */
  element(): HTMLElement;
  /** The handle of the plot drawn last; throws when none was drawn. */
  handle(): ChartHandle<HistogramData> | ChartHandle<ScatterData> | Pca3dHandle;
  /** The handle of the 3D plot drawn last; throws when the last plot is not one. */
  pca3d(): Pca3dHandle;
  /** The `kind` of `error` when it is a PngError, and null when it is not. */
  pngErrorKind(error: unknown): PngErrorKind | null;
}

declare global {
  interface Window {
    /**
     * Set by the script of e2e/plots.html once it has run, and absent on
     * every other page and before it.
     */
    plotsPage?: PlotsPage;
  }
}
