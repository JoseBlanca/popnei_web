/**
 * The ids of the SVG of each plot, unique in the page, since
 * `aria-labelledby` and `clip-path` look an id up in the whole document
 * and one screen can hold two plots (charts.md, "The SVG, its parts and
 * their names").
 */

/** The ids of one plot, all made from one prefix. */
export interface ChartIds {
  /** "chart3": the prefix, from the counter of the page. */
  readonly prefix: string;
  /** "chart3-title": the id of the `<title>` of the SVG. */
  readonly title: string;
  /** "chart3-desc": the id of the `<desc>`. */
  readonly desc: string;
  /** "chart3-clip": the id of the clip of the marks. */
  readonly clip: string;
}

let lastChart = 0;

/** The ids of a new plot, different from those of every plot made before. */
export function nextChartIds(): ChartIds {
  lastChart += 1;
  const prefix = `chart${String(lastChart)}`;
  return {
    prefix,
    title: `${prefix}-title`,
    desc: `${prefix}-desc`,
    clip: `${prefix}-clip`,
  };
}
