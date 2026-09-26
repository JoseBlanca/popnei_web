/**
 * What the page of the tests of the plots, e2e/plots.html, gives the
 * tests of e2e/plots.spec.ts, as `window.plotsPage`: a histogram drawn at
 * the size a test sets, and its handle, which a test calls through
 * `page.evaluate` (docs/specs/charts/plot2d.md, "How it is verified").
 */

import type { ChartHandle } from "../src/charts/types.ts";

/** The histogram of the page, and what a test reads of it. */
export interface PlotsPage {
  /**
   * Draws the histogram of the MAF of e2e/fixtures/panel.nei, with the
   * threshold 0.95 and its legend, in a new element of `width` by
   * `height` CSS pixels, in place of the plot drawn before, and returns
   * its handle.
   */
  draw(width: number, height: number): ChartHandle<unknown>;
  /** The element of the plot drawn last; throws when none was drawn. */
  element(): HTMLElement;
  /** The handle of the plot drawn last; throws when none was drawn. */
  handle(): ChartHandle<unknown>;
  /** The `kind` of `error` when it is a PngError, and null when it is not. */
  pngErrorKind(error: unknown): "tooLarge" | "notMade" | null;
}

declare global {
  interface Window {
    /** Set by the script of e2e/plots.html once it has run. */
    plotsPage: PlotsPage;
  }
}
