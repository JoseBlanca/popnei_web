/**
 * The contract of every plot of the applications (charts.md, "The
 * contract of a plot"): a function that takes an element and the data
 * and returns a handle, through which the screen gives the plot new
 * data, removes it and exports it.
 */

/** What a plot function returns. */
export interface ChartHandle<Data> {
  /** Draws new data in the same element, with no flash and no new element. */
  update(data: Data): void;
  /** Removes everything the plot added and every listener; safe to call twice. */
  destroy(): void;
  /** The plot as it is on the screen, as a file that stands alone. */
  toSVG(): string;
  /** The same, as PNG, at `scale` times the size on the screen. */
  toPNG(scale: 2 | 3): Promise<Blob>;
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
