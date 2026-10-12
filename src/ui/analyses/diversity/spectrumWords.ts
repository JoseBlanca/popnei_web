/**
 * The words of the block of the spectrum in the panel of the diversity
 * (docs/specs/analyses/sfs.md, "The block of the panel"): its heading,
 * its caption,
 * the line under the heading of each population or the line that stands
 * in place of its histogram, the axes and the description of a histogram,
 * the line under the histograms, the line of a draw with too many bars,
 * the columns and cells of its table, and the name of its download. Pure,
 * so that a test in node checks them; the block draws them.
 */
import type {
  SpectrumLines,
  SpectrumOfPop,
} from "../../../core/analyses/sfs.ts";
import { fourDecimals } from "../../../core/analyses/words.ts";
import { variantsStem } from "../../../core/fileNames.ts";
import { counted, escaped, grouped, namesOf } from "../../../core/project.ts";
import { MIN_DRAW } from "../../../worker/protocol.ts";

/** The heading of the block, which names its region of the page, so
    that a screen reader that moves by headings hears what the headings
    of the populations under it are of. */
export const SPECTRUM_HEADING = "Site frequency spectrum";

/** The caption of the block: "The folded site frequency spectrum of each
    population, in a draw of 40 of its chromosomes at each variant, over
    the 1,200 variants of panel.nei the filters kept. …" */
export function spectrumCaption(
  numCalledAlleles: number,
  numVars: number,
  variantsName: string,
): string {
  return `The folded site frequency spectrum of each population, in a draw of ${grouped(numCalledAlleles)} of its chromosomes at each variant, over the ${counted(numVars, "variant")} of ${escaped(variantsName)} the filters kept. The number of chromosomes is set above the table, with the rarefaction.`;
}

/** The variants of a spectrum expected to show both alleles in the draw,
    the sum of bins 1 to n / 2. */
export function bothAllelesOf(pop: SpectrumOfPop): number {
  let sum = 0;
  for (const value of pop.expected.subarray(1)) {
    sum += value;
  }
  return sum;
}

/** The line under the heading of a histogram: "1,200 variants in the
    draw, about 1,155 of them with both alleles". */
export function drawLineOf(pop: SpectrumOfPop): string {
  return `${counted(pop.variantsInDraw, "variant")} in the draw, about ${grouped(Math.round(bothAllelesOf(pop)))} of them with both alleles`;
}

/**
 * The line that stands in place of the histogram of a population that has
 * none, or `null` for one that has: left out of the call for fewer
 * individuals than the minimum, `minNumIndividuals`; with the minimum and
 * not in the call, which is not made when the populations hold fewer than
 * 2 chromosomes between them, one haploid individual; no variant in the
 * draw; or no variant with both alleles in it, whose spectrum has no
 * `drawn`, a bar of a histogram on popgen.html, a line of the plot of
 * popgen2.html.
 */
export function noSpectrumLine(
  pop: SpectrumOfPop,
  minNumIndividuals: number,
  numCalledAlleles: number,
  drawn: "bar" | "line" = "bar",
): string | null {
  const name = escaped(pop.population);
  if (!pop.calculated && pop.numIndividuals >= minNumIndividuals) {
    return `${name} holds fewer than ${String(MIN_DRAW)} chromosomes, the least a draw takes, so it has no spectrum.`;
  }
  if (!pop.calculated) {
    return `${name} has ${counted(pop.numIndividuals, "individual")}, fewer than the ${grouped(minNumIndividuals)} a variant needs to count for a population, so it has no spectrum.`;
  }
  if (pop.variantsInDraw === 0) {
    return `${name} has no variant with ${grouped(numCalledAlleles)} called chromosomes, so it has no spectrum.`;
  }
  if (pop.shares === null) {
    return `Every variant of ${name} in the draw shows one allele only, so its spectrum has no ${drawn}.`;
  }
  return null;
}

/** The label of the horizontal axis: "Copies of the rarer allele among 40
    chromosomes". */
export function xLabelOf(numCalledAlleles: number): string {
  return `Copies of the rarer allele among ${counted(numCalledAlleles, "chromosome")}`;
}

/** The label of the vertical axis, the same in every histogram. */
export const SPECTRUM_Y_LABEL = "Share of the variants with both alleles";

/** The description of a histogram, read after its title, "The spectrum
    of p0", which it does not repeat: "1,200 variants in the draw of 40
    chromosomes, about 1,155 with both alleles, in 20 bars from 1 to 20
    copies of the rarer allele; the largest share, 0.0559, at 15." A
    defect for a population with no shares, which draws no histogram. */
export function spectrumDescription(
  pop: SpectrumOfPop,
  numCalledAlleles: number,
): string {
  const shares = pop.shares;
  if (shares === null) {
    throw new Error(
      `popnei_web defect: the spectrum of ${pop.population} is described with no shares.`,
    );
  }
  let largest = 0;
  let at = 1;
  shares.forEach((share, i) => {
    if (share > largest) {
      largest = share;
      at = i + 1;
    }
  });
  return `${counted(pop.variantsInDraw, "variant")} in the draw of ${counted(numCalledAlleles, "chromosome")}, about ${grouped(Math.round(bothAllelesOf(pop)))} with both alleles, in ${counted(shares.length, "bar")} from 1 to ${grouped(shares.length)} copies of the rarer allele; the largest share, ${fourDecimals(largest)}, at ${grouped(at)}.`;
}

/** The line under the histograms; its second sentence, of the last bar
    that holds one count, only when the draw is even. */
export function underHistogramsLine(numCalledAlleles: number): string {
  const draw = grouped(numCalledAlleles);
  const half = Math.floor(numCalledAlleles / 2);
  const first = `Each bar is the share of the population's variants, among those that show both alleles in a draw of ${draw} chromosomes, whose rarer allele is expected in that many of the ${draw}.`;
  const last =
    numCalledAlleles % 2 === 0
      ? ` The last bar, ${grouped(half)}, holds one count where the others hold two, such as 1 and ${grouped(numCalledAlleles - 1)}, so it is about half as tall.`
      : "";
  return `${first}${last} The variants that show one allele only in the draw are in the table and not drawn.`;
}

/** The line in place of the histograms when a draw gives more bars than a
    histogram draws: "A draw of 2,400 chromosomes gives 1,200 bars per
    population, too many to draw. The table and the CSV hold them." */
export function tooManyBarsLine(numCalledAlleles: number): string {
  return `A draw of ${counted(numCalledAlleles, "chromosome")} gives ${counted(Math.floor(numCalledAlleles / 2), "bar")} per population, too many to draw. The table and the CSV hold them.`;
}

/** The label of the tab of the histograms, and of the table. */
export const HISTOGRAMS_TAB = "Histograms";
export const SPECTRUM_TABLE_TAB = "Table";

/** The name of the tabs, and of the table. */
export const SPECTRUM_TABS_LABEL = "The spectrum of each population";
export const SPECTRUM_TABLE_CAPTION =
  "The folded site frequency spectrum of each population, as numbers";

/** The header of the column of the counts, the row header of the
    table. */
export const COUNT_COLUMN = "Copies of the rarer allele";

/** The two headers of a population: "p0, variants" and "p0, share". */
export function populationColumns(
  population: string,
): readonly [string, string] {
  const name = escaped(population);
  return [`${name}, variants`, `${name}, share`];
}

/** An expected number of variants to one decimal, with a comma between
    groups of three digits, as every count of the panel. */
const ONE_DECIMAL = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** The two cells of a population at the count `count`: the expected
    number of variants to one decimal, and the share to four decimals,
    "not drawn" for bin 0 and "no value" for a population with no
    shares; both "no value" for a population not calculated, which keeps
    its columns. */
export function populationCells(
  pop: SpectrumOfPop,
  count: number,
): readonly [string, string] {
  if (!pop.calculated) return ["no value", "no value"];
  const variants = pop.expected[count];
  const variantsText =
    variants === undefined ? "no value" : ONE_DECIMAL.format(variants);
  if (count === 0) return [variantsText, "not drawn"];
  const share = pop.shares?.[count - 1];
  return [variantsText, share === undefined ? "no value" : fourDecimals(share)];
}

/** The values of the two cells of a population at the count `count` as
    stored, which the CSV of the table's "Download…" holds: the expected
    number of variants and the share, `null`, an empty field, for the
    share of bin 0, which is not drawn, for a population with no shares,
    and for both of a population not calculated. */
export function populationValues(
  pop: SpectrumOfPop,
  count: number,
): readonly [number | null, number | null] {
  if (!pop.calculated) return [null, null];
  const variants = pop.expected[count] ?? null;
  const share = count === 0 ? undefined : pop.shares?.[count - 1];
  return [variants, share ?? null];
}

/** What the "Download…" of the table of the spectrum downloads. */
export const SPECTRUM_TABLE_WHAT = "the table of the spectrum";

/** The words of the button of the download. */
export const SPECTRUM_CSV_LABEL = "Download the spectrum as CSV";

/** The name of the download: the stem of the variants file, then
    `.sfs.csv`; `panel.nei` gives `panel.sfs.csv`. */
export function allSpectraCsvName(variantsName: string): string {
  return `${variantsStem(variantsName)}.sfs.csv`;
}

/** What the "Download…" of the plot of the spectrum of popgen2.html
    downloads, after "Download ". */
export const LINES_WHAT = "the plot of the spectrum";

/** The item of the list of the result's warnings on popgen2.html that
    names the spectrum's warning, after "Warning:", before its link. */
export const SPECTRUM_WARNING_ELSEWHERE =
  "The site frequency spectrum has a warning of its own, about the MAF threshold, in its caption.";

/** The words of the link of that item, which gives the focus to the
    spectrum's warning. */
export const SPECTRUM_WARNING_LINK = "Go to the warning of the spectrum";

/** The label of the tab of the plot of popgen2.html, beside "Table". */
export const PLOT_TAB = "Plot";

/** The title of the plot of the spectrum as lines, which a screen reader
    reads before its description. */
export const LINES_TITLE = "The spectrum of each population";

/** The label of the horizontal axis of the plot as lines. */
export const LINES_X_LABEL = "Frequency of the commonest allele in the draw";

/** The label of the vertical axis of the plot as lines. */
export const LINES_Y_LABEL = "Proportion of the variants with both alleles";

/**
 * The caption of the block of popgen2.html, whose plot draws a line per
 * population (docs/specs/analyses/sfs.md, "On popgen2.html"): the
 * spectrum, its draw and the variants kept, what each axis is, the
 * variants left out of the plot and where the draw is set.
 */
export function linesCaption(
  numCalledAlleles: number,
  numVars: number,
  variantsName: string,
): string {
  const draw = grouped(numCalledAlleles);
  return `The folded site frequency spectrum of each population, in a draw of ${draw} of its chromosomes at each variant, over the ${counted(numVars, "variant")} of ${escaped(variantsName)} the filters kept. Each line is a population: across, the frequency of the commonest allele in the draw, 1 \u2212 j/${draw} for j copies of the rarer allele; up, the proportion of the population's variants with both alleles in the draw that have that frequency. Variants with no copy of the rarer allele in the draw are left out of the plot and of the proportions; the table holds them. The number of chromosomes is set above the table, with the rarefaction.`;
}

/** The line under the plot of the variants of each population with a
    line that show both alleles in the draw, the sum of its bins 1 to
    n / 2, which its proportions are over, rounded: "Each proportion is
    over …: p0, about 1,155; p2, about 1,152."; "fewer than 1" for a sum
    below 1, which an expected number can be, not "about 0". */
export function variantsInDrawLine(
  pops: readonly {
    readonly population: string;
    readonly bothAlleles: number;
  }[],
): string {
  const each = pops
    .map(
      (pop) =>
        `${escaped(pop.population)}, ${pop.bothAlleles < 1 ? "fewer than 1" : `about ${grouped(Math.round(pop.bothAlleles))}`}`,
    )
    .join("; ");
  return `Each proportion is over the population's variants with both alleles in the draw: ${each}.`;
}

/** The line under the plot of the points at 0.5, which hold one count
    of the rarer allele where the others hold two; `null` for an odd
    draw, whose last point holds two too, and for a draw of 2, whose one
    point is at 0.5, with no other to be compared with. */
export function halfPointsLine(numCalledAlleles: number): string | null {
  if (numCalledAlleles % 2 !== 0 || numCalledAlleles <= 2) return null;
  return `The points at 0.5 hold one count of the rarer allele, ${grouped(numCalledAlleles / 2)}, where the others hold two, such as 1 and ${grouped(numCalledAlleles - 1)}, so they are about half as high.`;
}

/** A frequency of the commonest allele as the description writes it, to
    four decimals at most: 0.975, 0.5122. */
const FREQUENCY = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 4,
});

/**
 * The description of the plot as lines, read after its title, "The
 * spectrum of each population": the lines, their populations, their
 * points from the lowest to the highest frequency of the commonest
 * allele, and the largest proportion, with its population when there
 * are several, and where. A defect for no line, which draws no plot.
 */
export function linesDescription(spectrum: SpectrumLines): string {
  const { lines } = spectrum;
  let largest = -1;
  let largestOf = "";
  let largestAt = 0;
  for (const line of lines) {
    for (const [i, proportion] of line.proportion.entries()) {
      if (proportion > largest) {
        largest = proportion;
        largestOf = line.population;
        largestAt = line.frequency[i] ?? Number.NaN;
      }
    }
  }
  const [first] = lines;
  if (first === undefined) {
    throw new Error(
      "popnei_web defect: a plot of the spectrum is described with no line.",
    );
  }
  const frequencies = [...first.frequency];
  const lowest = FREQUENCY.format(Math.min(...frequencies));
  const highest = FREQUENCY.format(Math.max(...frequencies));
  const points = first.frequency.length;
  const which =
    lines.length === 1
      ? `1 line, of ${escaped(first.population)}, of ${counted(points, "point")}`
      : `${counted(lines.length, "line")}, one per population, ${namesOf(lines.map((line) => line.population))}, of ${counted(points, "point")} each`;
  const of = lines.length === 1 ? "" : ` of ${escaped(largestOf)}`;
  return `${which}, from ${lowest} to ${highest} of the commonest allele; the largest proportion, ${fourDecimals(largest)},${of} at ${FREQUENCY.format(largestAt)}.`;
}

/** The line in place of the plot when its lines hold too many points:
    "A draw of 20,000 chromosomes gives 10,000 points to each of the 3
    lines, too many to draw. …" */
export function tooManyPointsLine(
  numCalledAlleles: number,
  numLines: number,
): string {
  return `A draw of ${counted(numCalledAlleles, "chromosome")} gives ${counted(Math.floor(numCalledAlleles / 2), "point")} to each of the ${counted(numLines, "line")}, too many to draw. The table of the spectrum holds them.`;
}
