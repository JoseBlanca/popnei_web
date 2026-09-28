/**
 * How the plots write a number (docs/specs/charts/plot2d.md, "The text
 * alternative and the table of the numbers"): a module of its own, with
 * nothing of D3, so that the tooltip and the legend, which the 3D view
 * loads too, do not bring the base of the 2D plots with them.
 */

/**
 * A number of a table of a plot, to 12 significant digits, so that an
 * edge that popnei gives as 0.07500000000000001 reads 0.075. The rows and
 * the CSV keep every digit.
 */
export function tableNumber(value: number): number {
  return Number(value.toPrecision(12));
}
