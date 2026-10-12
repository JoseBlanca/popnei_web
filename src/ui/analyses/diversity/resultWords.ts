/**
 * The words of the result of the diversity, on both pages
 * (docs/specs/analyses/diversity.md, "What it shows", and docs/specs/
 * steps/popgen2-populations.md, "The result"): the caption of the table,
 * with, in the Populations tab of popgen2.html, the sentence that counts
 * the unclassified individuals kept it leaves out; its headers and its
 * cells, and their values as stored, which the CSV of its "Download…"
 * holds on popgen2.html; the line of the draw; and the name of the
 * download, and what its menu downloads. Apart from
 * the words of the options and of the tab, so that the code of the
 * result, which the Populations tab downloads when it is first shown,
 * carries them, and so that the result of the old page imports nothing
 * of popgen2.html's store. Pure, so that a test in node checks them.
 */

import type { DiversityRow } from "../../../core/analyses/diversity.ts";
import { fourDecimals } from "../../../core/analyses/words.ts";
import type { CellValue } from "../../../core/csv.ts";
import { variantsStem } from "../../../core/fileNames.ts";
import { counted, escaped, grouped } from "../../../core/project.ts";

/** The caption of the table: "The diversity of each population, over the
    1,152 variants of panel.nei the filters kept." */
export function captionText(numVars: number, variantsName: string): string {
  return `The diversity of each population, over the ${counted(numVars, "variant")} of ${escaped(variantsName)} the filters kept.`;
}

/** The headers of the table after the population, in the order of its
    cells, the rarefied ones naming the draw of the result: "Alleles per
    variant, rarefied to 40 chromosomes". */
export function numberHeaders(numCalledAlleles: number): readonly string[] {
  const rarefied = `rarefied to ${counted(numCalledAlleles, "chromosome")}`;
  return [
    "Individuals",
    "Expected heterozygosity (unbiased)",
    "Observed heterozygosity",
    "Proportion of polymorphic variants",
    "F",
    "Alleles per variant",
    `Alleles per variant, ${rarefied}`,
    "Private alleles",
    "Private alleles per variant",
    `Private alleles per variant, ${rarefied}`,
  ];
}

/** A number of the table, to four decimals with a point and a negative
    one with the minus sign U+2212, "−0.0113", or "no value" where popnei
    gave none. */
export function cellText(value: number | null): string {
  return value === null ? "no value" : fourDecimals(value);
}

/** A count of the table, with a comma between groups of three digits, or
    "no value" where popnei gave none. */
function countText(value: number | null): string {
  return value === null ? "no value" : grouped(value);
}

/** The cells of a row of the table: the population as a text shows a
    name of the user's files, so that two names that differ by a hidden
    character look different; its individuals and its private alleles as
    whole numbers with a comma between groups of three digits; its other
    numbers to four decimals. */
export function rowCells(row: DiversityRow): readonly string[] {
  return [
    escaped(row.population),
    grouped(row.individuals),
    cellText(row.expectedHeterozygosity),
    cellText(row.observedHeterozygosity),
    cellText(row.polymorphic),
    cellText(row.f),
    cellText(row.allelesPerVariant),
    cellText(row.allelesPerVariantRarefied),
    countText(row.privateAlleles),
    cellText(row.privateAllelesPerVariant),
    cellText(row.privateAllelesPerVariantRarefied),
  ];
}

/** The values of the cells of a row as stored, in the order of its
    cells, which the CSV of the table's "Download…" holds in the place of
    the texts: the population, its individuals and its numbers as popnei
    gave them, `null`, an empty field, where it gave none. */
export function rowValues(row: DiversityRow): readonly CellValue[] {
  return [
    row.population,
    row.individuals,
    row.expectedHeterozygosity,
    row.observedHeterozygosity,
    row.polymorphic,
    row.f,
    row.allelesPerVariant,
    row.allelesPerVariantRarefied,
    row.privateAlleles,
    row.privateAllelesPerVariant,
    row.privateAllelesPerVariantRarefied,
  ];
}

/** What the "Download…" of the table downloads, after "Download ", which
    names its button for a screen reader. */
export const DIVERSITY_TABLE_WHAT = "the table of the diversity";

/** The line beside the download, which says the draw the rarefied
    columns are of, since the headers of the CSV do not: "Rarefied to 40
    chromosomes." */
export function rarefiedText(numCalledAlleles: number): string {
  return `Rarefied to ${counted(numCalledAlleles, "chromosome")}.`;
}

/** The name of the download of the table: the stem of the variants
    file, `variantsStem`, then `.diversity.csv`; `panel.vcf.gz` gives
    `panel.diversity.csv`. */
export function csvName(variantsName: string): string {
  return `${variantsStem(variantsName)}.diversity.csv`;
}
