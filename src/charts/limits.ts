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

/**
 * The most points a 2D plot draws. The walking skeleton measured an SVG of
 * 50,000 points, one path per group, at 3.1 MB with one decimal, and the
 * owner took that bound on 26 September 2026
 * (docs/plans/walking-skeleton.report.md, "The points an SVG plot can
 * hold"); more is a defect of the caller (docs/specs/charts/scatter.md,
 * "The points: one path per group, drawn by a loop").
 */
export const MAX_SVG_POINTS = 50_000;

/**
 * The most groups the points of a plot are coloured by. Each group is a
 * path and an entry of the legend, and a thousand are still drawn; more is
 * a column of names, which the screen does not offer for colouring, so
 * more is a defect of the caller (docs/specs/charts/scatter.md, "The
 * TypeScript interface").
 */
export const MAX_POINT_GROUPS = 1000;
