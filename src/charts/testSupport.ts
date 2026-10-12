/**
 * What the tests of the plots share under jsdom, which lays nothing out
 * and so measures no text: a measure that gives each W 11 pixels and
 * every other character 6, as a W is wider than a lower-case letter in
 * the fonts of the plots, so that a test sees a plot lay out names of
 * wide letters by their measured width (textWidth.ts).
 */
/** The width the fake measure gives a W. */
export const FAKE_W_WIDTH = 11;
/** The width the fake measure gives every other character. */
export const FAKE_OTHER_WIDTH = 6;

/** The width the fake measure gives `text`. */
export function fakeWidth(text: string): number {
  return Array.from(text).reduce(
    (width, character) =>
      width + (character === "W" ? FAKE_W_WIDTH : FAKE_OTHER_WIDTH),
    0,
  );
}

/**
 * Makes the text of the plots measured by `fakeWidth` until
 * `stopFakeMeasure()`: the SVG elements of jsdom get a
 * `getComputedTextLength`, which they lack.
 */
export function measureWithFake(): void {
  Object.defineProperty(SVGElement.prototype, "getComputedTextLength", {
    configurable: true,
    writable: true,
    value: function getComputedTextLength(this: SVGElement): number {
      return fakeWidth(this.textContent);
    },
  });
}

/** Takes the fake measure away, so that the text is counted again. */
export function stopFakeMeasure(): void {
  Reflect.deleteProperty(SVGElement.prototype, "getComputedTextLength");
}
