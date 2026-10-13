/**
 * What the panel of the LD decay shows of a result, on both pages: the
 * line of the populations the plot leaves out, the fitted curve and its
 * points, the table of the bins, the CSVs of the two tables and of the
 * plot, the mark and the legend of each half distance and the
 * description of the plot for a screen reader (docs/specs/analyses/
 * ldDecay.md, "What it shows" and "Accessibility"). Apart from the
 * definition, ldDecay.ts, which the store reads before any tab is shown,
 * so that popgen2.html downloads it with the code of the Populations tab
 * (the review of the merge of the LD decay and the distances, 13 October
 * 2026). The rows of the table of the populations and the half distance
 * as words stay in ldDecay.ts, whose warnings and check numbers read
 * them.
 */

import {
  bothOf,
  counted,
  escapedCharacters,
  grouped,
  namesOf,
} from "../project.ts";
import { csvField, csvNumber, defect } from "./words.ts";
import type { LdDecayResult } from "../../worker/protocol.ts";
import {
  LD_CURVE_POINTS,
  LD_PLOT_MAX_POPS,
  curveOf,
  halfDistText,
  ldDecayRows,
  pairsOf,
  popAt,
  valueAt,
} from "./ldDecay.ts";

/** The line under the plot when the result has more than
    `LD_PLOT_MAX_POPS` populations, which the plot leaves out: "The plot
    draws the first 16 of the 17 populations, in the order of the table of
    the populations. The two tables hold all 17."; `null` otherwise. */
export function ldPlotOmittedText(r: LdDecayResult): string | null {
  const numPops = r.pops.length;
  if (numPops <= LD_PLOT_MAX_POPS) {
    return null;
  }
  const all = grouped(numPops);
  return `The plot draws the first ${String(LD_PLOT_MAX_POPS)} of the ${all} populations, in the order of the table of the populations. The two tables hold all ${all}.`;
}

/**
 * The fitted curve at `dist` base pairs, the r² that the model of Hill and
 * Weir (1988), with the correction of Weir and Hill (1986) for a sample of
 * `numIndividuals`, expects for a ρ of `dist` × `rhoPerBp`: popnei's
 * formula, `the_curve_at` of its `ld/decay.rs`, with the four operations
 * in popnei's order, so that at 0 it gives popnei's `r2AtZero` to the last
 * bit.
 */
export function fittedR2(
  dist: number,
  rhoPerBp: number,
  numIndividuals: number,
): number {
  const rho = dist * rhoPerBp;
  const twoPlusRho = 2 + rho;
  const elevenPlusRho = 11 + rho;
  const expected = (10 + rho) / (twoPlusRho * elevenPlusRho);
  const ofTheSample =
    ((3 + rho) * (12 + 12 * rho + rho * rho)) /
    (numIndividuals * twoPlusRho * elevenPlusRho);
  return expected * (1 + ofTheSample);
}

/** The curve of the population `i` of `r`, `LD_CURVE_POINTS` distances
    evenly spaced from 0 to `maxDist`, both included, and the fitted r² at
    each; `null` when popnei fitted it no curve, its ρ per base pair NaN.
    Throws a defect on a population the result does not have. */
export function ldDecayCurve(
  r: LdDecayResult,
  i: number,
  maxDist: number,
): { readonly x: Float64Array; readonly y: Float64Array } | null {
  const curve = curveOf(r, i);
  const numIndividuals = valueAt(r.numIndividuals, i, "numIndividuals");
  if (curve === null) {
    return null;
  }
  const rhoPerBp = curve.rhoPerBp;
  const x = new Float64Array(LD_CURVE_POINTS);
  const y = new Float64Array(LD_CURVE_POINTS);
  const last = LD_CURVE_POINTS - 1;
  for (let point = 0; point < LD_CURVE_POINTS; point++) {
    const dist = point === last ? maxDist : (maxDist * point) / last;
    x[point] = dist;
    y[point] = fittedR2(dist, rhoPerBp, numIndividuals);
  }
  return { x, y };
}

/** One row of the table of the bins, a number `null` where popnei gave
    NaN, for a bin with no pair. */
export interface LdBinRow {
  /** The name of the population. */
  readonly population: string;
  /** The smallest distance of the bin, in base pairs. */
  readonly from: number;
  /** The largest distance of the bin, in base pairs. */
  readonly to: number;
  /** The pairs in the bin. */
  readonly pairs: number;
  /** The mean of their r². */
  readonly meanR2: number | null;
  /** The standard deviation of their r². */
  readonly sdR2: number | null;
}

/** The bin rows of each result, as `ROWS`. */
const BIN_ROWS = new WeakMap<LdDecayResult, readonly LdBinRow[]>();

/** One row per population and bin, the bins of a population together, in
    the order of the result; the same array for the same result. popnei
    gives a bin with a pair its mean r² and its standard deviation, 0 for
    one pair (node, `js-v0.1.0-dev.3`, 1 October 2026); a bin with pairs
    and without either is a defect thrown here. */
export function ldBinRows(r: LdDecayResult): readonly LdBinRow[] {
  const kept = BIN_ROWS.get(r);
  if (kept !== undefined) {
    return kept;
  }
  const numBins = r.smallestDist.length;
  const rows = Object.freeze(
    r.pops.flatMap((population, i) =>
      Array.from({ length: numBins }, (_, bin): LdBinRow => {
        const at = i * numBins + bin;
        const pairs = valueAt(r.numPairs, at, "numPairs");
        const meanR2 = valueAt(r.meanR2, at, "meanR2");
        const sdR2 = valueAt(r.sdR2, at, "sdR2");
        if (pairs > 0 && (Number.isNaN(meanR2) || Number.isNaN(sdR2))) {
          throw defect(
            `the result of the LD decay gives the bin ${String(bin)} of the population ${String(i)} ${String(pairs)} pairs, a mean r² of ${String(meanR2)} and a standard deviation of ${String(sdR2)}.`,
          );
        }
        return Object.freeze({
          population,
          from: valueAt(r.smallestDist, bin, "smallestDist"),
          to: valueAt(r.largestDist, bin, "largestDist"),
          pairs,
          meanR2: pairs > 0 ? meanR2 : null,
          sdR2: pairs > 0 ? sdR2 : null,
        });
      }),
    ),
  );
  BIN_ROWS.set(r, rows);
  return rows;
}

/** The header of the CSV of the table of the populations, the names of
    the lines of the Python script. */
const CSV_HEADER =
  "population,individuals,variants,pairs,half_distance_bp,r2_at_distance_0,rho_per_bp";

/** The header of the CSV of the table of the bins, the names of the
    columns of popnei's `per_pop` in Python. */
const BINS_CSV_HEADER =
  "population,smallest_dist,largest_dist,num_pairs,mean_r2,sd_r2";

/** The table of the populations as the text of a CSV file: a header row,
    one row per population, the numbers as `String` writes them, every
    digit, and an empty cell for no value, a field quoted as RFC 4180 has
    it, and each line ended by a new line. */
export function ldDecayCsv(r: LdDecayResult): string {
  const lines = ldDecayRows(r).map((row) =>
    [
      csvField(row.population),
      String(row.individuals),
      String(row.variants),
      String(row.pairs),
      csvNumber(row.halfDist),
      csvNumber(row.r2AtZero),
      csvNumber(row.rhoPerBp),
    ].join(","),
  );
  return [CSV_HEADER, ...lines].map((line) => `${line}\n`).join("");
}

/** The table of the bins as the text of a CSV file, as `ldDecayCsv`. */
export function ldBinsCsv(r: LdDecayResult): string {
  const lines = ldBinRows(r).map((row) =>
    [
      csvField(row.population),
      String(row.from),
      String(row.to),
      String(row.pairs),
      csvNumber(row.meanR2),
      csvNumber(row.sdR2),
    ].join(","),
  );
  return [BINS_CSV_HEADER, ...lines].map((line) => `${line}\n`).join("");
}

/** The header of the CSV of the points of the plot. */
const POINTS_CSV_HEADER = "population,distance_bp,mean_r2,fitted_r2";

/**
 * The data of the plot as the text of a CSV file, its "Data as CSV" on
 * popgen2.html (ldDecay.md, "On popgen2.html"): a row for each population
 * and bin, every population in the order of the result, the middle of the
 * bin, (smallest + largest) / 2, where the plot draws its point, the mean
 * r² of its pairs, empty for a bin with none, and the fitted curve at that
 * distance, empty for a population
 * with no curve; every digit, as `String` writes it.
 */
export function ldDecayPointsCsv(r: LdDecayResult): string {
  const numBins = r.smallestDist.length;
  const lines = r.pops.flatMap((population, i) => {
    const curve = curveOf(r, i);
    const n = valueAt(r.numIndividuals, i, "numIndividuals");
    return ldBinRows(r)
      .slice(i * numBins, (i + 1) * numBins)
      .map((row) => {
        const middle = (row.from + row.to) / 2;
        return [
          csvField(population),
          String(middle),
          csvNumber(row.meanR2),
          curve === null ? "" : String(fittedR2(middle, curve.rhoPerBp, n)),
        ].join(",");
      });
  });
  return [POINTS_CSV_HEADER, ...lines].map((line) => `${line}\n`).join("");
}

/** What the plot shows of the half distance of a population: drawn as a
    mark, beyond the largest distance, or none, with no pair or no
    curve. */
type HalfShown =
  | { readonly kind: "drawn"; readonly halfDist: number }
  | { readonly kind: "beyond"; readonly halfDist: number }
  | { readonly kind: "noPair" }
  | { readonly kind: "noCurve" };

/** What the plot shows of the half distance of the population `i` of
    `r`, at a largest distance of `maxDist`. */
function halfShownOf(r: LdDecayResult, i: number, maxDist: number): HalfShown {
  if (pairsOf(r, i) === 0) {
    return { kind: "noPair" };
  }
  const curve = curveOf(r, i);
  if (curve === null) {
    return { kind: "noCurve" };
  }
  return curve.halfDist > maxDist
    ? { kind: "beyond", halfDist: curve.halfDist }
    : { kind: "drawn", halfDist: curve.halfDist };
}

/** The mark of the half distance of the population `i` of `r` on the
    plot, at a largest distance of `maxDist`: at its half distance, at half
    of its r² at 0, when the plot reaches it; `null` when the legend says
    the half distance is beyond the plot, or the population has no pair
    or no curve. */
export function ldHalfMark(
  r: LdDecayResult,
  i: number,
  maxDist: number,
): { readonly x: number; readonly y: number } | null {
  const curve = curveOf(r, i);
  return curve !== null && halfShownOf(r, i, maxDist).kind === "drawn"
    ? { x: curve.halfDist, y: curve.r2AtZero / 2 }
    : null;
}

/** The name of the population `i` of `r` as the legend of the plot
    writes it, escaped; the plot cuts it in the middle beyond
    `LD_LEGEND_NAME_LENGTH` characters, "Solanum_…r_wild1", and numbers
    two that would read alike (line.md; the review of the LD decay, 12
    October 2026). Throws a defect on a population the result does not
    have. */
export function ldLegendName(r: LdDecayResult, i: number): string {
  return escapedCharacters(popAt(r, i)).join("");
}

/**
 * The words after the name of the population `i` of `r` in the legend of
 * the plot, at a largest distance of `maxDist` (ldDecay.md, "What it
 * shows"), never cut: " · half at 7,548 bp", " · half at 1,599,810 bp,
 * beyond the plot", " · no curve" for pairs with no curve, " · no pair".
 * Throws a defect on a population the result does not have.
 */
export function ldLegendEnd(
  r: LdDecayResult,
  i: number,
  maxDist: number,
): string {
  popAt(r, i);
  const half = halfShownOf(r, i, maxDist);
  switch (half.kind) {
    case "drawn":
      return ` · half at ${halfDistText(half.halfDist)} bp`;
    case "beyond":
      return ` · half at ${halfDistText(half.halfDist)} bp, beyond the plot`;
    case "noPair":
      return " · no pair";
    case "noCurve":
      return " · no curve";
  }
}

/**
 * The description of the plot for a screen reader, at a largest distance
 * of `maxDist` (ldDecay.md, "Accessibility"): "The mean r² of pairs of
 * variants against their distance, in 50 bins up to 100,000 base pairs,
 * for 2 populations, with the curve fitted to each. The curve falls to
 * half at 7,548 bp in pop_a and 7,340 bp in pop_b." It describes the
 * populations the plot draws, the first `LD_PLOT_MAX_POPS`, "for the
 * first 16 of the 17 populations"; a half distance beyond the plot is
 * said to be, "(beyond the plot)"; and the populations with no pair or no
 * curve are named in a sentence each, the curve then fitted "to each that
 * has one". One population has "its fitted curve", or none.
 */
export function ldDecayDescription(r: LdDecayResult, maxDist: number): string {
  const numPops = r.pops.length;
  const drawn = r.pops.slice(0, LD_PLOT_MAX_POPS);
  const halves = drawn.map((pop, i) => ({
    pop,
    half: halfShownOf(r, i, maxDist),
  }));
  const which =
    numPops > LD_PLOT_MAX_POPS
      ? `the first ${grouped(drawn.length)} of the ${grouped(numPops)} populations`
      : counted(numPops, "population");
  const at = halves.flatMap(({ pop, half }): readonly string[] => {
    switch (half.kind) {
      case "drawn":
        return [`${halfDistText(half.halfDist)} bp in ${namesOf([pop])}`];
      case "beyond":
        return [
          `${halfDistText(half.halfDist)} bp in ${namesOf([pop])} (beyond the plot)`,
        ];
      case "noPair":
      case "noCurve":
        return [];
    }
  });
  const fitted =
    halves.length === 1
      ? at.length === 1
        ? ", with its fitted curve"
        : ""
      : at.length === halves.length
        ? ", with the curve fitted to each"
        : ", with the curve fitted to each that has one";
  const start = `The mean r² of pairs of variants against their distance, in ${counted(r.smallestDist.length, "bin")} up to ${grouped(maxDist)} base pairs, for ${which}${fitted}.`;
  const sentences = [start];
  if (at.length > 0) {
    sentences.push(`The curve falls to half at ${bothOf(at)}.`);
  }
  const lacking = (kind: "noPair" | "noCurve", what: string): void => {
    const names = halves
      .filter(({ half }) => half.kind === kind)
      .map(({ pop }) => pop);
    if (names.length > 0) {
      sentences.push(
        `${namesOf(names)} ${names.length === 1 ? "has" : "have"} ${what}.`,
      );
    }
  };
  lacking("noPair", "no pair");
  lacking("noCurve", "no curve");
  return sentences.join(" ");
}
