/**
 * The `<h1>` of the page, which takes the focus when the control that
 * had it leaves the page and nothing else takes it (WCAG 2.4.3): on
 * popgen.html the heading of the step, in `<main>`; on popgen2.html
 * "Popnei", in the band at the top, drawn in the page's second root,
 * `#defects`, since 10 October 2026 (docs/specs/steps/popgen2-band.md,
 * "Keys and focus").
 */

/** The page's `<h1>`, or `null` when the page has none drawn. */
export function pageHeading(): HTMLElement | null {
  const found =
    document.querySelector("main h1") ?? document.querySelector("#defects h1");
  return found instanceof HTMLElement ? found : null;
}
