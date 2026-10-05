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
import type { SpectrumOfPop } from "../../../core/analyses/sfs.ts";
import { fourDecimals } from "../../../core/analyses/words.ts";
import { variantsStem } from "../../../core/fileNames.ts";
import { counted, escaped, grouped } from "../../../core/project.ts";
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
 * draw; or no variant with both alleles in it.
 */
export function noSpectrumLine(
  pop: SpectrumOfPop,
  minNumIndividuals: number,
  numCalledAlleles: number,
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
    return `Every variant of ${name} in the draw shows one allele only, so its spectrum has no bar.`;
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

/** The words of the button of the download. */
export const SPECTRUM_CSV_LABEL = "Download the spectrum as CSV";

/** The name of the download: the stem of the variants file, then
    `.sfs.csv`; `panel.nei` gives `panel.sfs.csv`. */
export function spectrumCsvName(variantsName: string): string {
  return `${variantsStem(variantsName)}.sfs.csv`;
}
