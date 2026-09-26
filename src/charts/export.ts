/**
 * The export of a plot as a file that stands alone, SVG or PNG
 * (docs/specs/charts/plot2d.md, "The export"; charts.md, "Colours, themes
 * and the exported file" and "PNG"). The file is the plot as it is on the
 * screen, in the colours of the light theme whatever the screen shows,
 * since it goes to papers and to print, on a rectangle of the background
 * colour, and with no overlay.
 */

import { MAX_CANVAS_SIDE } from "./limits.ts";

/** The size of a plot at its last draw, in CSS pixels. */
export interface ExportSize {
  /** The width of the SVG. */
  readonly width: number;
  /** The height of the SVG. */
  readonly height: number;
}

/**
 * Why a PNG was refused: `tooLarge`, a side of the canvas above
 * MAX_CANVAS_SIDE pixels at that scale, found before anything is drawn;
 * `notMade`, the browser gave no canvas or made no PNG. The screen tells
 * the two apart by `kind`: it asks for a scale of 3, and for 2 after a
 * `tooLarge`.
 */
export type PngErrorKind = "tooLarge" | "notMade";

/** The error a PNG of a plot is refused with. */
export class PngError extends Error {
  /** Which of the two failures refused the PNG. */
  readonly kind: PngErrorKind;

  /** An error of `kind`, whose message says it in words for the log. */
  constructor(kind: PngErrorKind) {
    super(
      kind === "tooLarge"
        ? `The PNG would have a side above ${String(MAX_CANVAS_SIDE)} pixels.`
        : "The browser could not make the PNG.",
    );
    this.name = "PngError";
    this.kind = kind;
  }
}

/**
 * The properties written on each element of the exported SVG, as a
 * `style`, from their values computed in the light theme; the file has
 * none of the page's CSS (charts.md, "Colours, themes and the exported
 * file"). `font-family` is written apart, as FONT_STACK.
 */
const INLINED_PROPERTIES = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-opacity",
  "opacity",
  "color",
  "font-size",
  "font-weight",
  "text-anchor",
  "dominant-baseline",
] as const;

/**
 * The fonts the exported SVG names while the applications use the fonts
 * of the system: a generic stack, and no font embedded (charts.md,
 * "Fonts").
 */
const FONT_STACK = 'system-ui, "Helvetica", "Arial", sans-serif';

/** The class of the rectangle of the background, the first thing drawn. */
const BACKGROUND_CLASS = "chart-background";

/** The class of the rectangle that takes the pointer events. */
const OVERLAY_CLASS = "chart-overlay";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** Writes the properties of `element`, computed where it is, as its `style`. */
function inlineStyle(element: Element): void {
  const computed = getComputedStyle(element);
  const declarations = INLINED_PROPERTIES.map(
    (property) => `${property}: ${computed.getPropertyValue(property)}`,
  );
  declarations.push(`font-family: ${FONT_STACK}`);
  element.setAttribute("style", declarations.join("; "));
}

/**
 * The SVG of a plot as a file that stands alone: a copy of `svg` whose
 * elements carry the colours of the light theme, and the rest of the
 * properties the page's CSS gives them, with no `var(` left; a first
 * rectangle of the background colour of `size`; no `chart-overlay`; the
 * fonts as a generic stack. `svg` itself is not changed.
 *
 * The copy is resolved inside a hidden element with `data-theme="light"`,
 * added to the page and removed before this returns, so that the tokens
 * of src/ui/tokens.css give it their light values while the page is
 * dark.
 */
export function exportSvg(svg: SVGSVGElement, size: ExportSize): string {
  const copy = svg.cloneNode(true);
  if (!(copy instanceof SVGSVGElement)) {
    throw new Error(
      "popnei_web defect: the copy of the SVG of a plot is not an SVG.",
    );
  }
  for (const overlay of copy.querySelectorAll(`.${OVERLAY_CLASS}`)) {
    overlay.remove();
  }
  const background = document.createElementNS(SVG_NAMESPACE, "rect");
  background.setAttribute("class", BACKGROUND_CLASS);
  background.setAttribute("width", String(size.width));
  background.setAttribute("height", String(size.height));
  // After the <title> and the <desc>, which name the plot, and before
  // everything drawn, so that it is the first rectangle of the file.
  const firstDrawn = [...copy.children].find(
    (child) => child.localName !== "title" && child.localName !== "desc",
  );
  copy.insertBefore(background, firstDrawn ?? null);

  const light = document.createElement("div");
  light.dataset["theme"] = "light";
  light.setAttribute("aria-hidden", "true");
  // Laid out, so that its styles are computed as on the screen, but out
  // of sight and of the pointer's reach.
  light.style.cssText =
    "position: fixed; top: 0; left: -100000px; visibility: hidden; pointer-events: none; overflow: hidden;";
  light.append(copy);
  document.body.append(light);
  try {
    inlineStyle(copy);
    for (const element of copy.querySelectorAll("*")) inlineStyle(element);
  } finally {
    light.remove();
  }
  return new XMLSerializer().serializeToString(copy);
}

/**
 * The PNG of a plot of `size`, drawn from the SVG `svgText` gives on a
 * canvas of `scale` times that size, once the fonts of the page are
 * loaded, `document.fonts.ready` (charts.md, "Fonts"). The canvas is
 * emptied to 0 by 0 once the PNG is made or refused, since WebKit keeps
 * the memory of a page's canvases until they are collected and iOS Safari
 * then gives no context for a new one.
 *
 * Rejects with a PngError: `tooLarge` when a side at that scale would be
 * above MAX_CANVAS_SIDE, before `svgText` is called or anything is drawn,
 * since a canvas of iOS above it draws nothing and says nothing;
 * `notMade` when the browser does not decode the SVG as an image, gives
 * no canvas, cannot draw the image on it, or makes no PNG of it.
 */
export async function exportPng(
  svgText: () => string,
  size: ExportSize,
  scale: 2 | 3,
): Promise<Blob> {
  if (Math.max(size.width, size.height) * scale > MAX_CANVAS_SIDE) {
    throw new PngError("tooLarge");
  }
  await document.fonts.ready;
  const url = URL.createObjectURL(
    new Blob([svgText()], { type: "image/svg+xml" }),
  );
  let canvas: HTMLCanvasElement | null = null;
  try {
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch {
      throw new PngError("notMade");
    }
    const made = document.createElement("canvas");
    canvas = made;
    made.width = Math.round(size.width * scale);
    made.height = Math.round(size.height * scale);
    const context = made.getContext("2d");
    if (context === null) throw new PngError("notMade");
    try {
      context.drawImage(image, 0, 0, made.width, made.height);
    } catch {
      // An image the browser cannot draw throws an InvalidStateError.
      throw new PngError("notMade");
    }
    return await new Promise<Blob>((resolve, reject) => {
      try {
        made.toBlob((blob) => {
          if (blob === null) reject(new PngError("notMade"));
          else resolve(blob);
        }, "image/png");
      } catch {
        // A canvas the image tainted throws a SecurityError here.
        reject(new PngError("notMade"));
      }
    });
  } finally {
    URL.revokeObjectURL(url);
    if (canvas !== null) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
