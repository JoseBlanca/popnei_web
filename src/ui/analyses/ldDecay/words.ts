/**
 * The words of the panel of the LD decay that are not core's
 * (docs/specs/analyses/ldDecay.md, "What it shows", "The states" and
 * "Its words"): the lines of its ready state, the line under the bar of a
 * calculation under way, the title and the axes of the plot, the caption,
 * the columns and the cells of the table of the populations, the cells of
 * the table of the bins, and the names of the two downloads. Pure, so
 * that a test in node checks them; the panel draws them.
 */
import type { LdBinRow, LdDecayRow } from "../../../core/analyses/ldDecay.ts";
import {
  halfDistText,
  threeSignificant,
} from "../../../core/analyses/ldDecay.ts";
import { fourDecimals } from "../../../core/analyses/words.ts";
import { variantsStem } from "../../../core/fileNames.ts";
import type { IndividualsKept } from "../../../core/individualsKept.ts";
import { counted, escaped, grouped } from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import { readyLines as individualsLines } from "../pca/words.ts";

/** The analysis in the middle of a sentence. */
export const LD_DECAY_NAME = "the LD decay";

/** Its result in the middle of a sentence, as the words of a result
    removed say Undo brings it back: "Undo brings back the LD decay as it
    was". The plot and the tables would ask for "they were" after an
    analysis named in the singular, which `removedText` cannot say. */
export const LD_DECAY_RESULT_NAME = "the LD decay";

/** The title of the plot, the `<title>` of its SVG. */
export const LD_PLOT_TITLE = "LD decay";

/** The label of the horizontal axis of the plot. */
export const LD_X_LABEL = "Distance between the two variants (bp)";

/** The label of the vertical axis of the plot. */
export const LD_Y_LABEL = "Mean r² of the pairs";

/** The line of the ready state while the LD pruning of the Variants step
    is on. */
export const LD_PRUNING_LINE =
  "The LD pruning of the Variants step is not applied here: it removes the pairs of variants in LD that this analysis measures. The other filters of the Variants step are.";

/**
 * The lines of the ready state, and of the state of a result removed:
 * `LD_PRUNING_LINE` while the LD pruning of the Variants step is on,
 * whatever its distance; then the individuals a run will take, as the
 * PCA's, "100 individuals of ld.nei", and, while a threshold on the
 * individuals waits for their statistics, the line that Run calculates
 * them first. No line of the individuals without a variants file read or
 * individuals kept, which lock the analysis.
 */
export function readyLines(
  p: Project,
  kept: IndividualsKept | null,
): readonly string[] {
  const pruning = p.filters.some((filter) => filter.kind === "ld")
    ? [LD_PRUNING_LINE]
    : [];
  return [...pruning, ...individualsLines(p, kept)];
}

/** The line under the bar of a calculation under way: the bar shows the
    reading of the file alone, and the curves are fitted after it. */
export function fitLine(variantsName: string): string {
  return `The bar shows the reading of ${escaped(variantsName)}. The curves are fitted once it is read.`;
}

/** The caption of the table of the populations: "The LD decay of each
    population, over the 500 variants of ld.nei the filters kept, pairs
    up to 100,000 base pairs apart.", `numVars` being the variants of the
    pass, before the maximum MAF of each population. */
export function captionText(
  numVars: number,
  variantsName: string,
  maxDist: number,
): string {
  return `The LD decay of each population, over the ${counted(numVars, "variant")} of ${escaped(variantsName)} the filters kept, pairs up to ${grouped(maxDist)} base pairs apart.`;
}

/** The headers of the columns of the table of the populations. */
export const LD_DECAY_COLUMNS: readonly string[] = Object.freeze([
  "Population",
  "Individuals",
  "Variants",
  "Pairs",
  "Half distance (bp)",
  "r² at distance 0, of the curve",
  "4Nr per base pair",
]);

/** A number of popnei that is missing where a population has pairs. */
const NO_VALUE = "no value";

/** The cell of a population or a bin with no pair. */
const NO_PAIR = "no pair";

/** The cell of the half distance of a population with pairs and no
    curve. */
const NO_CURVE = "no curve";

/**
 * The cells of a row of the table of the populations as text: its name,
 * escaped; its individuals, variants and pairs with a comma between
 * thousands; its half distance as the legend writes it without "bp",
 * "7,548", "0.247", or "no pair" or "no curve"; its r² at 0 to four
 * decimals; and its ρ per base pair to three significant digits.
 */
export function ldDecayCells(row: LdDecayRow): readonly string[] {
  const none = row.pairs === 0 ? NO_PAIR : NO_CURVE;
  return [
    escaped(row.population),
    grouped(row.individuals),
    grouped(row.variants),
    grouped(row.pairs),
    row.halfDist === null ? none : halfDistText(row.halfDist),
    row.r2AtZero === null ? none : fourDecimals(row.r2AtZero),
    row.rhoPerBp === null ? none : threeSignificant(row.rhoPerBp),
  ];
}

/** A distance of a bin: a whole number with a comma between thousands,
    and any other as `String` writes it. */
function distanceText(dist: number): string {
  return Number.isInteger(dist) ? grouped(dist) : String(dist);
}

/**
 * The cells of a row of the table of the bins as text: the population,
 * escaped; the two distances of the bin; its pairs; its mean r² and the
 * standard deviation, to four decimals, "no pair" for a bin without one
 * and "no value" for a number popnei did not give a bin with pairs.
 */
export function ldBinCells(row: LdBinRow): readonly string[] {
  const none = row.pairs === 0 ? NO_PAIR : NO_VALUE;
  return [
    escaped(row.population),
    distanceText(row.from),
    distanceText(row.to),
    grouped(row.pairs),
    row.meanR2 === null ? none : fourDecimals(row.meanR2),
    row.sdR2 === null ? none : fourDecimals(row.sdR2),
  ];
}

/** The name of the download of the table of the populations: the stem of
    the variants file, `variantsStem`, then `.ld_decay.csv`; `ld.nei`
    gives `ld.ld_decay.csv`. */
export function ldDecayCsvName(variantsName: string): string {
  return `${variantsStem(variantsName)}.ld_decay.csv`;
}

/** The name of the download of the table of the bins, `ld.ld_decay_bins.csv`
    for `ld.nei`. */
export function ldBinsCsvName(variantsName: string): string {
  return `${variantsStem(variantsName)}.ld_decay_bins.csv`;
}
