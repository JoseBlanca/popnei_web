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
