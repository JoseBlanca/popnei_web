/**
 * The width of a text of a plot, measured, so that a margin or a legend
 * holds names of wide letters, "WWWW…", which a count of characters cut
 * at the edge of the SVG (docs/specs/charts/bars.md, "The room of the
 * names", and line.md, "The room of the legend", from the review of
 * round 1, 12 October 2026). The text is written in an SVG of its own,
 * in the font of the plots, `--font-body`, as charts.css gives a plot,
 * at the size given, with no class, so that no selector of a plot finds
 * it, hidden at the top of the body, where it is laid out even while the
 * plot's tab is hidden, and measured by `getComputedTextLength`; it is
 * measured again in the fonts the exported file names, FONT_STACK, by a
 * canvas, and the larger width is its width, so that it fits the screen
 * and the PNG, which WebKit draws 3.4 to 7.2% wider than its screen (the
 * second review of round 1, 12 October 2026, in place of a tenth more
 * for every text, which cut the names in Chromium, whose screen and PNG
 * measure alike, a tenth too soon). Where
 * nothing measures, under jsdom, which lays nothing out, the width is
 * counted, the characters times the width the caller gives each, as
 * every plot counted before. A web font, should the plots get one, is
 * loaded before a plot is drawn, or the text is measured in the font
 * that stands in for it.
 */

/** The ellipsis that stands for the middle of a text cut. */
export const ELLIPSIS = "…";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/**
 * The fonts the exported SVG names while the applications use the fonts
 * of the system: a generic stack, and no font embedded (charts.md,
 * "Fonts").
 */
export const FONT_STACK = 'system-ui, "Helvetica", "Arial", sans-serif';

/** The text that measures in the page's font, in its SVG in the body;
    null before the first measure, and made again when a page or a test
    emptied the body. */
let measuring: SVGTextElement | null = null;

/** The text that measures in the page's font; null where nothing
    measures. */
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

/** What measures in the export's fonts, the 2D context of a canvas that
    is in no page; undefined before the first measure, null where the
    browser gives none. */
let exportMeasure: CanvasRenderingContext2D | null | undefined;

/**
 * The width of `text` at `fontSize` pixels in the export's fonts, as the
 * browser draws the exported file into the PNG; null where nothing
 * measures it. It is measured by the canvas and not by an SVG text of
 * the page: WebKit lays the page's SVG text out narrower, 202 pixels for
 * twenty Ms at 12 pixels in the system font of the Mac, than it draws the
 * file as an image, 209, and so does its canvas, 209.8, as Chromium's
 * canvas, its page and its image do (the second review of round 1, 12
 * October 2026).
 */
function exportWidth(text: string, fontSize: number): number | null {
  exportMeasure ??= document.createElement("canvas").getContext("2d");
  if (exportMeasure === null) return null;
  exportMeasure.font = `${String(fontSize)}px ${FONT_STACK}`;
  return exportMeasure.measureText(text).width;
}

/**
 * The width in CSS pixels of `text` at `fontSize` pixels, the larger of
 * its widths in the font of the plots and in the export's, measured;
 * where nothing measures, its characters times `perCharacter`.
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
 * The width in CSS pixels of `text` at `fontSize` pixels, the larger of
 * its widths in the font of the plots and in the export's, measured;
 * null where nothing measures, for a layout that is only corrected where
 * the text is measured.
 */
export function measuredWidth(text: string, fontSize: number): number | null {
  const measure = measuringText();
  if (measure === null) return null;
  measure.setAttribute("font-size", String(fontSize));
  measure.textContent = text;
  const width = Math.max(
    measure.getComputedTextLength(),
    exportWidth(text, fontSize) ?? 0,
  );
  // To a hundredth of a pixel, so that a sum of widths is the same in
  // every engine and a test can give it exactly.
  return Math.round(width * 100) / 100;
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

/** `characters` cut to `kept` of them about an ellipsis: the first
    half, one more for an odd number, the ellipsis, and the last half. */
function cutAbout(characters: readonly string[], kept: number): string {
  const head = Math.ceil(kept / 2);
  const tail = kept - head;
  return `${characters.slice(0, head).join("")}${ELLIPSIS}${
    tail === 0 ? "" : characters.slice(-tail).join("")
  }`;
}

/**
 * `text` as a plot writes it in `room` pixels: whole when it has at most
 * `most` characters and fits; otherwise cut in the middle, its first and
 * its last characters about an ellipsis, "Landr…coast", as many as fit,
 * `least` − 1 at the fewest, so that two names alike in their starts,
 * as the populations of one collection often are, stay apart.
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
    const written = cutAbout(characters, kept);
    if (fits(written)) return written;
  }
  return cutAbout(characters, options.least - 1);
}

/**
 * `texts` as a plot writes them, each cut to its room, `rooms` in the
 * same order, by `cutText` with `options`; and when two or more would
 * read the same, each of those cut to its room less the width of its
 * number and followed by the number of its place, from 1, in brackets,
 * "Landr…A_1 (3)", the row of the table it stands for, so that no two
 * read alike. The names of the bar plot and of the legend of the line
 * plot (bars.md, line.md; the review of the LD decay, 12 October 2026).
 */
export function distinctCuts(
  texts: readonly string[],
  rooms: readonly number[],
  options: CutOptions,
): readonly string[] {
  const roomAt = (place: number): number => {
    const room = rooms[place];
    if (room === undefined) {
      throw new Error(
        `popnei_web defect: the text ${String(place + 1)} of a plot has no room.`,
      );
    }
    return room;
  };
  const cut = texts.map((text, place) => cutText(text, roomAt(place), options));
  const counts = new Map<string, number>();
  for (const text of cut) counts.set(text, (counts.get(text) ?? 0) + 1);
  return texts.map((text, place) => {
    const written = cut[place] ?? text;
    if ((counts.get(written) ?? 0) < 2) return written;
    const number = ` (${String(place + 1)})`;
    const numberWidth = textWidth(
      number,
      options.fontSize,
      options.perCharacter,
    );
    return `${cutText(text, roomAt(place) - numberWidth, options)}${number}`;
  });
}
