/**
 * What the tests of the plots share under jsdom, which lays nothing out
 * and so measures no text: a measure that gives each W 11 pixels and
 * every other character 5.5, as a W is wider than a lower-case
 * letter in the fonts of the plots, so that a test sees a plot lay out
 * names of wide letters by their measured width (textWidth.ts).
 */

/** The width the fake measure gives a W. */
export const FAKE_W_WIDTH = 11;
/** The width the fake measure gives every other character. */
export const FAKE_OTHER_WIDTH = 5.5;

/** The width a text is measured at with the fake measure, in both
    fonts alike, to a hundredth of a pixel. */
export function fakeMeasured(text: string): number {
  return Math.round(fakeWidth(text) * 100) / 100;
}

/** The width the fake measure gives `text`. */
export function fakeWidth(text: string): number {
  return Array.from(text).reduce(
    (width, character) =>
      width + (character === "W" ? FAKE_W_WIDTH : FAKE_OTHER_WIDTH),
    0,
  );
}

/** What the fake measure gives a text in the export's fonts, times its
    width; set by measureWithFake. */
let exportScale = 1;

/**
 * Makes the text of the plots measured by `fakeWidth` until
 * `stopFakeMeasure()`: the SVG elements of jsdom get a
 * `getComputedTextLength`, and its canvases a 2D context with a
 * `measureText`, which they lack; the canvas, which measures in the
 * export's fonts, gives `scale` times the width.
 */
export function measureWithFake(scale = 1): void {
  exportScale = scale;
  Object.defineProperty(SVGElement.prototype, "getComputedTextLength", {
    configurable: true,
    writable: true,
    value: function getComputedTextLength(this: SVGElement): number {
      return fakeWidth(this.textContent);
    },
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    writable: true,
    value: () => ({
      font: "",
      measureText: (text: string) => ({
        width: fakeWidth(text) * exportScale,
      }),
    }),
  });
}

/** Takes the fake measure away, so that the text is counted again. */
export function stopFakeMeasure(): void {
  Reflect.deleteProperty(SVGElement.prototype, "getComputedTextLength");
  Reflect.deleteProperty(HTMLCanvasElement.prototype, "getContext");
}
