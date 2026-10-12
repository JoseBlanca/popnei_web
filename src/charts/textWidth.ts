/**
 * The width of a text of a plot, measured, so that a margin or a legend
 * holds names of wide letters, "WWWW…", which a count of characters cut
 * at the edge of the SVG (docs/specs/charts/bars.md, "The room of the
 * names", and line.md, "The room of the legend", from the review of
 * round 1, 12 October 2026). The text is written in an SVG of its own,
 * in the font of the plots, `--font-body`, as charts.css gives a plot,
 * at the size given, with no class, so that no selector of a plot finds it,
 * hidden at the top of the body, where it is laid out even while the
 * plot's tab is hidden, and measured by `getComputedTextLength`. Where
 * nothing measures, under jsdom, which lays nothing out, the width is
 * counted, the characters times the width the caller gives each, as
 * every plot counted before. A web font, should the plots get one, is
 * loaded before a plot is drawn, or the text is measured in the font
 * that stands in for it.
 */

/** The ellipsis that ends a text cut. */
export const ELLIPSIS = "…";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** The text that measures, in its SVG in the body; null before the
    first measure, and made again when a page or a test emptied the body. */
let measuring: SVGTextElement | null = null;

/** The text that measures; null where nothing measures. */
function measuringText(): SVGTextElement | null {
  if (!("document" in globalThis)) return null;
  if (measuring?.isConnected !== true) {
    const svg = document.createElementNS(SVG_NAMESPACE, "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute(
      "style",
      "position: fixed; top: 0; left: 0; width: 0; height: 0; overflow: hidden; visibility: hidden; pointer-events: none; font-family: var(--font-body);",
    );
    const text = document.createElementNS(SVG_NAMESPACE, "text");
    svg.append(text);
    document.body.append(svg);
    measuring = text;
  }
  // jsdom has no getComputedTextLength.
  return typeof measuring.getComputedTextLength === "function"
    ? measuring
    : null;
}

/**
 * The width in CSS pixels of `text` at `fontSize` pixels in the font of
 * the plots, measured; where nothing measures, its characters times
 * `perCharacter`.
 */
export function textWidth(
  text: string,
  fontSize: number,
  perCharacter: number,
): number {
  return (
    measuredWidth(text, fontSize) ?? Array.from(text).length * perCharacter
  );
}

/**
 * The width in CSS pixels of `text` at `fontSize` pixels in the font of
 * the plots, measured; null where nothing measures, for a layout that is
 * only corrected where the text is measured.
 */
export function measuredWidth(text: string, fontSize: number): number | null {
  const measure = measuringText();
  if (measure === null) return null;
  measure.setAttribute("font-size", String(fontSize));
  measure.textContent = text;
  return measure.getComputedTextLength();
}

/** How a text is cut to a width. */
export interface CutOptions {
  /** The size of the text in pixels. */
  readonly fontSize: number;
  /** The width counted for a character where nothing measures. */
  readonly perCharacter: number;
  /** The most characters the text keeps whole, beyond any width. */
  readonly most: number;
  /** The fewest characters a cut text keeps, the ellipsis among them,
      however narrow its room. */
  readonly least: number;
}

/**
 * `text` as a plot writes it in `room` pixels: whole when it has at most
 * `most` characters and fits; otherwise its first characters and an
 * ellipsis, as many as fit, `least` − 1 at the fewest.
 */
export function cutText(
  text: string,
  room: number,
  options: CutOptions,
): string {
  const characters = Array.from(text);
  const fits = (written: string): boolean =>
    textWidth(written, options.fontSize, options.perCharacter) <= room;
  if (characters.length <= options.most && fits(text)) return text;
  const most = Math.min(characters.length, options.most) - 1;
  for (let kept = most; kept >= options.least; kept -= 1) {
    const written = `${characters.slice(0, kept).join("")}${ELLIPSIS}`;
    if (fits(written)) return written;
  }
  return `${characters.slice(0, options.least - 1).join("")}${ELLIPSIS}`;
}
