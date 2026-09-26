/**
 * The contract of every plot of the applications (charts.md, "The
 * contract of a plot"): a function that takes an element and the data
 * and returns a handle, through which the screen gives the plot new
 * data, removes it and exports it.
 */

/**
 * How many times the size on the screen a PNG is made at: 3 for print at
 * 300 dpi, 2 for slides, and 2 when 3 was refused as too large.
 */
export type PngScale = 2 | 3;

/** What a plot function returns. */
export interface ChartHandle<Data> {
  /** Draws new data in the same element, with no flash and no new element. */
  update(data: Data): void;
  /** Removes everything the plot added and every listener; safe to call twice. */
  destroy(): void;
  /** The plot as it is on the screen, as a file that stands alone. */
  toSVG(): string;
  /**
   * The same, as PNG, at `scale` times the size on the screen. Every
   * failure is a rejection, none is thrown: a PngError of `kind`
   * `tooLarge` or `notMade` is a PNG refused, which the screen tells the
   * user of; anything else is a defect, which the screen throws again.
   */
  toPNG(scale: PngScale): Promise<Blob>;
}

/**
 * A kind of plot: it draws `data` in `element`, whose size the screen's
 * CSS gives, and takes the callbacks of `events`, which change nothing
 * that is drawn, once.
 */
export type Chart<Data, Events = object> = (
  element: HTMLElement,
  data: Data,
  events?: Events,
) => ChartHandle<Data>;
