/**
 * The limits of the plots, beside those of each kind of plot.
 */

/**
 * The longest side of a canvas, in pixels, that every browser of the
 * applications draws: iOS draws nothing on a canvas above 4,096 by 4,096
 * and says nothing (charts.md, "PNG"), so a PNG whose side would pass it
 * is refused before anything is drawn.
 */
export const MAX_CANVAS_SIDE = 4096;

/**
 * The most bins a histogram draws. Each bar is one element, drawn by a
 * join, which a thousand still are; more would be a histogram no one can
 * read, so more is a defect of the caller
 * (docs/specs/charts/histogram.md, "The TypeScript interface").
 */
export const MAX_HISTOGRAM_BINS = 1000;
