/**
 * The fonts the exported SVG names while the applications use the fonts
 * of the system: a generic stack, and no font embedded (charts.md,
 * "Fonts"). Apart from `textWidth.ts`, which measures in it too, so that
 * the export of a plot, which popgen2.html loads before any plot, does
 * not bring the measure of the text with it, which only the plots of the
 * tabs use (docs/architecture.md, section 11, "The first load of
 * `popgen2.html`").
 */
export const FONT_STACK = 'system-ui, "Helvetica", "Arial", sans-serif';
