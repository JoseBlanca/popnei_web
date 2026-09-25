/**
 * The words of the panel of the diversity (docs/specs/analyses/diversity.md,
 * "The panel"): the populations it will run on, the caption of its table
 * and its cells, the line of its options, the line of the versions, and
 * the name of its download. Pure, so that a test in node checks them; the
 * panel draws them.
 */

import type { DiversityRow } from "../../../core/analyses/diversity.ts";
import { variantsStem } from "../../../core/fileNames.ts";
import { counted, escaped, grouped } from "../../../core/project.ts";
import type { Pops } from "../../../worker/protocol.ts";

/** The decimals of every number of the table. */
const DECIMALS = 4;

/** The populations a run will take, with their sizes: "3 populations:
    p0, 48 individuals; p2, 84; p1, 68". */
export function populationsText(pops: Pops): string {
  const parts = pops.map(([pop, members], index) =>
    index === 0
      ? `${escaped(pop)}, ${counted(members.length, "individual")}`
      : `${escaped(pop)}, ${grouped(members.length)}`,
  );
  return `${counted(pops.length, "population")}: ${parts.join("; ")}`;
}

/** The caption of the table: "The diversity of each population, over the
    1,152 variants of panel.nei the filters kept." */
export function captionText(numVars: number, variantsName: string): string {
  return `The diversity of each population, over the ${counted(numVars, "variant")} of ${escaped(variantsName)} the filters kept.`;
}

/** A number of the table, to four decimals with a point, or "no value"
    where popnei gave none. */
export function cellText(value: number | null): string {
  return value === null ? "no value" : value.toFixed(DECIMALS);
}

/** The cells of a row of the table: the population as a text shows a
    name of the user's files, so that two names that differ by a hidden
    character look different; its individuals with a comma between
    groups of three digits; its three numbers. */
export function rowCells(row: DiversityRow): readonly string[] {
  return [
    escaped(row.population),
    grouped(row.individuals),
    cellText(row.expectedHeterozygosity),
    cellText(row.observedHeterozygosity),
    cellText(row.polymorphic),
  ];
}

/** The line under the table that says which options the numbers were
    calculated with. */
export function optionsText(
  minNumIndividuals: number,
  polyThreshold: number,
): string {
  return `A variant counts in a population when at least ${grouped(minNumIndividuals)} of its individuals have a called genotype there, and is polymorphic when its commonest allele is below ${String(polyThreshold)}.`;
}

/** The line beside the download: "Calculated with popnei 0.1.0, in
    version 0.1.0 of the application." */
export function versionsText(
  popneiVersion: string,
  appVersion: string,
): string {
  return `Calculated with popnei ${escaped(popneiVersion)}, in version ${escaped(appVersion)} of the application.`;
}

/** The name of the download of the table: the stem of the variants
    file, `variantsStem`, then `.diversity.csv`; `panel.vcf.gz` gives
    `panel.diversity.csv`. */
export function csvName(variantsName: string): string {
  return `${variantsStem(variantsName)}.diversity.csv`;
}
