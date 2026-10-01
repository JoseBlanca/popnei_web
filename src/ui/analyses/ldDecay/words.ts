/**
 * The words of the panel of the LD decay that are not core's
 * (docs/specs/analyses/ldDecay.md, "What it shows", "The states" and
 * "Its words"): the labels of its two fields, the lines under them and
 * what they say of a number refused, the line of the LD pruning, the lines
 * of its ready state, the line under the bar of a calculation under way,
 * the title and the axes of the plot, the captions, the columns and the
 * cells of the two tables, and the labels and the names of the two
 * downloads. Pure, so that a test in node checks them; the panel draws
 * them.
 */
import type { LdBinRow, LdDecayRow } from "../../../core/analyses/ldDecay.ts";
import {
  MAX_MAX_ALLOWED_MAF,
  MIN_MAX_ALLOWED_MAF,
  MIN_MAX_DIST,
  halfDistText,
  threeSignificant,
} from "../../../core/analyses/ldDecay.ts";
import { fourDecimals } from "../../../core/analyses/words.ts";
import { variantsStem } from "../../../core/fileNames.ts";
import { counted, escaped, grouped } from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import { numberText } from "../../widgets/committedNumber.ts";
import type { NumberRefusal } from "../../widgets/committedNumber.ts";
import { refusedWhy } from "../words.ts";
import type { NotTakenWords } from "../words.ts";

/** The title of the plot, the `<title>` of its SVG. */
export const LD_PLOT_TITLE = "LD decay";

/** The label of the horizontal axis of the plot. */
export const LD_X_LABEL = "Distance between the two variants (bp)";

/** The label of the vertical axis of the plot. */
export const LD_Y_LABEL = "Mean r² of the pairs";

/** The label of the field of the largest distance, with its unit and
    its least value. */
export const MAX_DIST_LABEL = `Largest distance between the two variants of a pair, in base pairs, from ${String(MIN_MAX_DIST)}`;

/** The line under the field of the largest distance. */
export const MAX_DIST_LINE =
  "How far to look for pairs. Choose a distance beyond which you expect little LD in your species; the half distance of the result shows whether it was far enough.";

/** The words that end the notice of a change of the largest distance,
    and name the header's Undo. */
export const MAX_DIST_DESCRIPTION =
  "the largest distance of the LD decay changed";

/** The label of the field of the maximum major allele frequency, with
    its range. */
export const MAX_MAF_LABEL = `Maximum major allele frequency in each population, from ${String(MIN_MAX_ALLOWED_MAF)} to ${String(MAX_MAX_ALLOWED_MAF)}`;

/** The line under the field of the maximum major allele frequency. */
export const MAX_MAF_LINE =
  "A variant is left out of a population where its commonest allele is more frequent than this, since the r² of a variant that hardly varies rests on one or two individuals.";

/** The words that end the notice of a change of the maximum major allele
    frequency, and name the header's Undo. */
export const MAX_MAF_DESCRIPTION =
  "the maximum major allele frequency of the LD decay changed";

/** What the field of the frequency says of a character it threw away:
    the words of a threshold of the Variants step, with the noun of the
    field and numbers of its range. */
const FREQUENCY_NOT_TAKEN: NotTakenWords = Object.freeze({
  comma: "Write the decimals with a point, 0.9 and not 0,9",
  other:
    "cannot be typed in the frequency, which is written with digits and a point, as 0.95",
});

/** The line under the maximum major allele frequency for a number it
    refused, or a character it threw away, with the frequency kept: "0.4
    is less than 0.5; the frequency stays 0.95.", "Write the decimals with
    a point, 0.9 and not 0,9; the frequency stays 0.95." */
export function frequencyRefusedText(
  refusal: NumberRefusal,
  kept: number,
): string {
  return `${refusedWhy(refusal, FREQUENCY_NOT_TAKEN)}; the frequency stays ${numberText(kept)}.`;
}

/** The line under the options while the LD pruning of the Variants step
    is on. */
export const LD_PRUNING_LINE =
  "The LD pruning of the Variants step is not applied here: it removes the pairs of variants in LD that this analysis measures. The other filters of the Variants step are.";

/** `LD_PRUNING_LINE` while the LD pruning of the Variants step is on,
    whatever its distance, and `null` otherwise. The panel draws it under
    its options in every state, that of a plot shown among them, since
    the pruning turned on keeps the plot (ldDecay.md, "The cases"). */
export function pruningLine(p: Project): string | null {
  return p.filters.some((filter) => filter.kind === "ld")
    ? LD_PRUNING_LINE
    : null;
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

/** The name of the row of the two tabs, the plot and the table of its
    bins. */
export const LD_TABS_LABEL = "Mean r² against the distance";

/** The line over the plot while it is wider than the page and scrolls
    sideways in its frame. */
export const PLOT_SCROLL_TEXT = "Scroll the plot sideways to see all of it.";

/** The name of the frame of the plot while it scrolls sideways and the
    Tab key reaches it: not the title of the plot, which names the panel. */
export const PLOT_FRAME_NAME = "Plot of the LD decay";

/** The caption of the table of the bins: "The 50 bins of each population
    by the distance between the two variants of a pair, up to 100,000 base
    pairs: the pairs in each bin, their mean r² and its standard
    deviation." */
export function binsCaptionText(numBins: number, maxDist: number): string {
  return `The ${counted(numBins, "bin")} of each population by the distance between the two variants of a pair, up to ${grouped(maxDist)} base pairs: the pairs in each bin, their mean r² and its standard deviation.`;
}

/** The headers of the columns of the table of the bins. */
export const LD_BIN_COLUMNS: readonly string[] = Object.freeze([
  "Population",
  "From (bp)",
  "To (bp)",
  "Pairs",
  "Mean r²",
  "Standard deviation of r²",
]);

/** The label of the download of the table of the populations. */
export const LD_DECAY_CSV_LABEL =
  "Download the table of the populations as CSV";

/** The label of the download of the table of the bins. */
export const LD_BINS_CSV_LABEL = "Download the table of the bins as CSV";

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
 * standard deviation, to four decimals, "no pair" for a bin without
 * one: core gives a bin with pairs both numbers, or throws a defect.
 */
export function ldBinCells(row: LdBinRow): readonly string[] {
  return [
    escaped(row.population),
    distanceText(row.from),
    distanceText(row.to),
    grouped(row.pairs),
    row.meanR2 === null ? NO_PAIR : fourDecimals(row.meanR2),
    row.sdR2 === null ? NO_PAIR : fourDecimals(row.sdR2),
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
