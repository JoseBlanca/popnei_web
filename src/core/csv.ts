/**
 * The CSV of a table and of the data of a plot, and the names of the
 * files a download saves (docs/specs/widgets/downloads.md, "A table", "A
 * plot" and "The names of the files"). A table's CSV holds the values as
 * stored, every row in the order shown, so that a spreadsheet, R or
 * Python reads the numbers the application calculated, not the texts it
 * rounds for the screen.
 */
import { csvField } from "./analyses/words.ts";

/** The value of a cell of a table, as stored: a text, a number, a yes or
    no of a column of true and false values of the individuals file, or
    `null` for none. */
export type CellValue = string | number | boolean | null;

/**
 * A CSV of `header` and `rows`, each field written by `csvField` for a
 * string, by `String` for a number or a boolean, and empty for `null` or
 * NaN; "\n" after every line, the last among them. A defect when a row has
 * another number of fields than the header.
 */
export function tableCsv(
  header: readonly string[],
  rows: readonly (readonly CellValue[])[],
): string {
  const lines = [header.map(csvField).join(",")];
  for (const [index, row] of rows.entries()) {
    if (row.length !== header.length) {
      throw new Error(
        `popnei_web defect: the row ${String(index)} of a table has ${String(row.length)} fields under a header of ${String(header.length)}.`,
      );
    }
    lines.push(row.map(fieldOf).join(","));
  }
  return lines.map((line) => `${line}\n`).join("");
}

/** The field of a value: a text by `csvField`, a number or a yes or no
    by `String`, which writes a number in full with the point, and empty
    for null and NaN. */
function fieldOf(value: CellValue): string {
  if (value === null) return "";
  if (typeof value === "string") return csvField(value);
  if (typeof value === "number" && Number.isNaN(value)) return "";
  return String(value);
}

/**
 * The bins of a histogram as the plot draws them, a row per bin with its
 * left edge, its right edge and its count, under the header
 * `left_edge,right_edge,count`; `edges` has one more element than
 * `counts`, a defect otherwise. `none`, the count of the values in no bin,
 * the individuals with no heterozygosity, is a last row with empty edges;
 * `null` gives no such row.
 */
export function binsCsv(
  edges: Readonly<Float64Array>,
  counts: Uint32Array | Float64Array,
  none: number | null,
): string {
  if (edges.length !== counts.length + 1) {
    throw new Error(
      `popnei_web defect: a histogram of ${String(counts.length)} bins has ${String(edges.length)} edges.`,
    );
  }
  const rows: CellValue[][] = [];
  for (const [index, count] of counts.entries()) {
    rows.push([edgeAt(edges, index), edgeAt(edges, index + 1), count]);
  }
  if (none !== null) rows.push([null, null, none]);
  return tableCsv(BINS_HEADER, rows);
}

/** The header of the CSV of the bins of a histogram. */
const BINS_HEADER = ["left_edge", "right_edge", "count"] as const;

/** The edge `index` of `edges`, which the caller checked is there. */
function edgeAt(edges: Readonly<Float64Array>, index: number): number {
  const edge = edges[index];
  if (edge === undefined) {
    throw new Error(
      `popnei_web defect: a histogram has no edge ${String(index)}.`,
    );
  }
  return edge;
}

/** The name of a downloaded file, "panel.pca.coordinates.csv" from
    "panel", "pca.coordinates" and "csv". */
export function downloadName(
  stem: string,
  what: string,
  extension: "csv" | "svg" | "png",
): string {
  return `${stem}.${what}.${extension}`;
}
