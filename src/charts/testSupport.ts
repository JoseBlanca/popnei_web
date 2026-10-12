/**
 * What the tests of the plots share under jsdom, which lays nothing out
 * and so measures no text: a measure that gives each W 11 pixels and
 * every other character 5.5 at 12 pixels, in proportion to the size of
 * the text measured, as a W is wider than a lower-case
 * letter in the fonts of the plots, so that a test sees a plot lay out
 * names of wide letters by their measured width (textWidth.ts).
 */

/** The width the fake measure gives a W at 12 pixels. */
export const FAKE_W_WIDTH = 11;
/** The width the fake measure gives every other character at 12
    pixels. */
export const FAKE_OTHER_WIDTH = 5.5;
/** The size the widths above are given at. */
const FAKE_FONT_SIZE = 12;

/** The width a text is measured at with the fake measure at 12
    pixels, in both fonts alike, to a hundredth of a pixel. */
export function fakeMeasured(text: string): number {
  return Math.round(fakeWidth(text) * 100) / 100;
}

/** The width the fake measure gives `text` at `fontSize` pixels. */
export function fakeWidth(text: string, fontSize = FAKE_FONT_SIZE): number {
  const atFakeSize = Array.from(text).reduce(
    (width, character) =>
      width + (character === "W" ? FAKE_W_WIDTH : FAKE_OTHER_WIDTH),
    0,
  );
  return (atFakeSize * fontSize) / FAKE_FONT_SIZE;
}

/** The size in pixels of `font`, a CSS font, "12px system-ui", as a
    canvas is given it. */
function sizeOf(font: string): number {
  const size = /^(\d+(?:\.\d+)?)px /u.exec(font)?.[1];
  if (size === undefined) {
    throw new Error(`The fake measure: a canvas font with no size, "${font}".`);
  }
  return Number(size);
}

/** What the fake measure gives a text in the export's fonts, times its
    width; set by measureWithFake. */
let exportScale = 1;

/**
 * Makes the text of the plots measured by `fakeWidth` until
 * `stopFakeMeasure()`: the SVG elements of jsdom get a
 * `getComputedTextLength`, and its canvases a 2D context with a
 * `measureText`, which they lack, each at the size the text is given,
 * the `font-size` of the SVG text and the `font` of the canvas, and
 * throwing when it has none; the canvas, which measures in the export's
 * fonts, gives `scale` times the width.
 */
export function measureWithFake(scale = 1): void {
  exportScale = scale;
  Object.defineProperty(SVGElement.prototype, "getComputedTextLength", {
    configurable: true,
    writable: true,
    value: function getComputedTextLength(this: SVGElement): number {
      const fontSize = this.getAttribute("font-size");
      if (fontSize === null) {
        throw new Error("The fake measure: a text with no font-size.");
      }
      return fakeWidth(this.textContent, Number(fontSize));
    },
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    writable: true,
    value: () => ({
      font: "",
      measureText(this: { readonly font: string }, text: string) {
        return { width: fakeWidth(text, sizeOf(this.font)) * exportScale };
      },
    }),
  });
}

/** Takes the fake measure away, so that the text is counted again. */
export function stopFakeMeasure(): void {
  Reflect.deleteProperty(SVGElement.prototype, "getComputedTextLength");
  Reflect.deleteProperty(HTMLCanvasElement.prototype, "getContext");
}
