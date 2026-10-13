/**
 * What the panel of the distances between populations shows of a
 * result, on both pages: the rows and the CSV of the table, the heatmap
 * of each measure in its order, the line of that order, the description
 * of the heatmap for a screen reader and the line above
 * `POP_DISTS_MAX_SHOWN` populations (docs/specs/analyses/popDists.md,
 * "The TypeScript interface" and "The panel"). Apart from the
 * definition, popDists.ts, which the store reads before any tab is
 * shown, so that popgen2.html downloads it with the code of the
 * Distances tab (the review of the merge of the LD decay and the
 * distances, 13 October 2026).
 */

import { counted, escaped, grouped, namesOf } from "../project.ts";
import {
  MEASURE_NAMES,
  POP_DISTS_MAX_SHOWN,
  pairName,
  pairsNamed,
  pairsOf,
  valueAt,
} from "./popDists.ts";
import { csvField, csvNumber, defect, fourDecimals, orNull } from "./words.ts";
import type {
  HeatmapOrder,
  PopDistsResult,
  ShownMeasure,
} from "../../worker/protocol.ts";

/** One row of the table, a number null where popnei gave NaN. */
export interface PopDistsRow {
  /** The first population of the pair, in the order of the result. */
  readonly first: string;
  /** The second population of the pair. */
  readonly second: string;
  /** Hudson's Fst of the pair. */
  readonly fst: number | null;
  /** Jost's D of the pair. */
  readonly dest: number | null;
  /** The variants the pair was calculated over. */
  readonly numVars: number;
}

/** The rows of each result, so that a screen drawn again gets the same
    array. */
const ROWS = new WeakMap<PopDistsResult, readonly PopDistsRow[]>();

/** The rows of a result, one per pair in its order, (0, 1), (0, 2), …,
    (1, 2), … of its populations; the same array for the same result.
    Throws a defect on a result whose arrays are not as long as its
    populations give. */
export function popDistsRows(r: PopDistsResult): readonly PopDistsRow[] {
  const kept = ROWS.get(r);
  if (kept !== undefined) {
    return kept;
  }
  const rows = Object.freeze(
    pairsOf(r).map((pair): PopDistsRow =>
      Object.freeze({
        first: pair.first,
        second: pair.second,
        fst: orNull(pair.fst),
        dest: orNull(pair.dest),
        numVars: pair.numVars,
      }),
    ),
  );
  ROWS.set(r, rows);
  return rows;
}

/** The header of the CSV of the table, the names of the columns of the
    table of the Python script. */
const CSV_HEADER = "population_1,population_2,fst_hudson,jost_d,num_variants";

/**
 * The table as the text of a CSV file: a header row, one row per pair in
 * the order of the result, the numbers as `String` writes them and an
 * empty cell for no value, a name with a comma, a quote or a new line
 * quoted as RFC 4180 has it, and each line ended by a new line.
 */
export function popDistsCsv(r: PopDistsResult): string {
  const lines = popDistsRows(r).map((row) =>
    [
      csvField(row.first),
      csvField(row.second),
      csvNumber(row.fst),
      csvNumber(row.dest),
      String(row.numVars),
    ].join(","),
  );
  return [CSV_HEADER, ...lines].map((line) => `${line}\n`).join("");
}

/** The data of the heatmap of one measure: the populations in its order,
    and the square matrix in that order, NaN on the diagonal. */
export interface PopDistsHeatmap {
  /** The populations, top to bottom and left to right. */
  readonly names: readonly string[];
  /** names.length × names.length values, row by row, symmetric, NaN for
      no value. */
  readonly values: Float64Array;
}

/** The heatmaps of each result, by measure, so that a screen drawn again
    gets the same data. */
const HEATMAPS = new WeakMap<
  PopDistsResult,
  Map<ShownMeasure, PopDistsHeatmap>
>();

/**
 * The data of the heatmap of `measure`: the populations in the order the
 * result gives for that measure, that of the PCoA or that of the file,
 * and the square matrix in that order, each pair's one value written in
 * both of its cells, so that the two never differ; the same object for
 * the same result and measure. Throws a defect on an order that is not a
 * permutation of the populations, which the checks of the messages rule
 * out.
 */
export function popDistsHeatmap(
  r: PopDistsResult,
  measure: ShownMeasure,
): PopDistsHeatmap {
  const byMeasure = HEATMAPS.get(r) ?? new Map<ShownMeasure, PopDistsHeatmap>();
  HEATMAPS.set(r, byMeasure);
  const kept = byMeasure.get(measure);
  if (kept !== undefined) {
    return kept;
  }
  const numPops = r.pops.length;
  const order = orderOf(r, measure);
  // The row of each population of the result in the heatmap, -1 until
  // the order places it.
  const rowOf = new Int32Array(numPops).fill(-1);
  if (order.length !== numPops) {
    throw defect("the order of the heatmap is not one of its populations.");
  }
  for (const [row, pop] of order.entries()) {
    if (rowOf[pop] !== -1) {
      throw defect("the order of the heatmap is not one of its populations.");
    }
    rowOf[pop] = row;
  }
  const values = new Float64Array(numPops * numPops).fill(Number.NaN);
  let at = 0;
  for (let i = 0; i < numPops; i++) {
    for (let j = i + 1; j < numPops; j++) {
      const value = valueAt(r[measure], at);
      const row = rowAt(rowOf, i);
      const column = rowAt(rowOf, j);
      values[row * numPops + column] = value;
      values[column * numPops + row] = value;
      at += 1;
    }
  }
  const heatmap: PopDistsHeatmap = Object.freeze({
    names: Object.freeze(order.map((pop) => popAt(r.pops, pop))),
    values,
  });
  byMeasure.set(measure, heatmap);
  return heatmap;
}

/** The indexes of the populations of `r` in the order of the heatmap of
    `measure`, top to bottom. */
function orderOf(r: PopDistsResult, measure: ShownMeasure): readonly number[] {
  const order = r.order[measure];
  return order.kind === "pcoa"
    ? Array.from(order.order)
    : r.pops.map((_, i) => i);
}

/** The start of the line of an order of the file. */
const FILE_ORDER = "In the order of the metadata file";

/**
 * The line under the heatmap of `measure` that says how it is ordered
 * (popDists.md, "Its words"), or `null` for two populations, whose order
 * says nothing of similarity. popnei's message of `notPlaced`, which
 * names its arguments and calls the populations individuals, is not
 * shown. Throws a defect on the reason `noDistance` for a measure that
 * has a value for every pair, which the runner never gives.
 */
export function orderText(
  r: PopDistsResult,
  measure: ShownMeasure,
): string | null {
  const order: HeatmapOrder = r.order[measure];
  if (order.kind === "pcoa") {
    return "Ordered so that similar populations are together: by the first axis of a principal coordinate analysis of these distances.";
  }
  switch (order.reason) {
    case "twoPopulations":
      return null;
    case "noDistance": {
      const pairs = pairsOf(r);
      const without = pairs.filter((pair) => Number.isNaN(pair[measure]));
      const [only] = without;
      if (only === undefined) {
        throw defect(
          `the heatmap of ${measure} is in the order of the file for a pair with no distance, and every pair has one.`,
        );
      }
      if (without.length === pairs.length) {
        return `${FILE_ORDER}: no pair has a value of ${MEASURE_NAMES[measure]}.`;
      }
      const named = without.length === 1 ? pairName(only) : pairsNamed(without);
      return `${FILE_ORDER}: the order by similarity needs a distance for every pair, and ${named} have none.`;
    }
    case "allZero":
      return `${FILE_ORDER}: every distance is 0 or below, so no population is closer to one than to another.`;
    case "notPlaced":
      return `${FILE_ORDER}: popnei could not order these distances.`;
  }
}

/**
 * The description of the heatmap of `measure` for a screen reader
 * (popDists.md, "Accessibility"): the measure, how many populations of
 * the variants file `fileName`, the order in words and the populations
 * in it, then the smallest and the largest value with their pairs, and
 * how many pairs have no value; "No pair has a value." when none has. A
 * value found in several pairs is named by the first of them in the
 * order of the result.
 */
export function popDistsDescription(
  r: PopDistsResult,
  measure: ShownMeasure,
  fileName: string,
): string {
  const how =
    r.order[measure].kind === "pcoa"
      ? "ordered so that similar ones are together"
      : "in the order of the metadata file";
  const names = popDistsHeatmap(r, measure)
    .names.map((pop) => namesOf([pop]))
    .join(", ");
  const start = `Heatmap of ${MEASURE_NAMES[measure]} between ${counted(r.pops.length, "population")} of ${escaped(fileName)}, ${how}: ${names}.`;
  const pairs = pairsOf(r);
  const valued = pairs.filter((pair) => !Number.isNaN(pair[measure]));
  const [first] = valued;
  if (first === undefined) {
    return `${start} No pair has a value.`;
  }
  const smallest = valued.reduce((least, pair) =>
    pair[measure] < least[measure] ? pair : least,
  );
  const largest = valued.reduce((most, pair) =>
    pair[measure] > most[measure] ? pair : most,
  );
  const range =
    valued.length === 1
      ? `Its one value is ${fourDecimals(first[measure])}, between ${pairName(first)}.`
      : `From ${fourDecimals(smallest[measure])}, between ${pairName(smallest)}, to ${fourDecimals(largest[measure])}, between ${pairName(largest)}.`;
  const numWithout = pairs.length - valued.length;
  const without =
    numWithout === 0
      ? ""
      : ` ${grouped(numWithout)} of the ${grouped(pairs.length)} pairs ${numWithout === 1 ? "has" : "have"} no value.`;
  return `${start} ${range}${without}`;
}

/**
 * The line the panel shows in place of the heatmap and the table when
 * the result has more than `POP_DISTS_MAX_SHOWN` populations, "The
 * heatmap and the table are shown for up to 200 populations, and this
 * result has 201. Download the table as CSV to read it."; `null`
 * otherwise.
 */
export function tooManyPopulationsText(r: PopDistsResult): string | null {
  const numPops = r.pops.length;
  return numPops > POP_DISTS_MAX_SHOWN
    ? `The heatmap and the table are shown for up to ${grouped(POP_DISTS_MAX_SHOWN)} populations, and this result has ${grouped(numPops)}. Download the table as CSV to read it.`
    : null;
}

/** The row of the heatmap of the population `i` of the result; one
    missing is a defect, as the order placed every population. */
function rowAt(rowOf: Int32Array, i: number): number {
  const row = rowOf[i];
  if (row === undefined || row === -1) {
    throw defect(
      `the heatmap of the distances has no row for the population ${String(i)} of the result.`,
    );
  }
  return row;
}

/** The population `i` of `pops`; one missing is a defect, as an order of
    the heatmap holds indexes of its populations. */
function popAt(pops: readonly string[], i: number): string {
  const pop = pops[i];
  if (pop === undefined) {
    throw defect(`the result of the distances has no population ${String(i)}.`);
  }
  return pop;
}
