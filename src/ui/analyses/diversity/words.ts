/**
 * The words of the panel of the diversity (docs/specs/analyses/diversity.md,
 * "The panel"): the lines of its ready state, the caption of its table
 * and its cells, the line of its options, and the name of its download;
 * the line of the versions and the words of the ready state that other
 * panels share are in `../words.ts`. Pure, so that a test in node checks them; the
 * panel draws them.
 */

import type { DiversityRow } from "../../../core/analyses/diversity.ts";
import { variantsStem } from "../../../core/fileNames.ts";
import {
  ONE_POPULATION,
  counted,
  escaped,
  grouped,
} from "../../../core/project.ts";
import type { PopulationsKept } from "../../../core/project.ts";
import {
  WAITS_FOR_STATISTICS_TEXT,
  emptiedText,
  populationsText,
} from "../words.ts";

/** The decimals of every number of the table. */
const DECIMALS = 4;

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

/** The name of the download of the table: the stem of the variants
    file, `variantsStem`, then `.diversity.csv`; `panel.vcf.gz` gives
    `panel.diversity.csv`. */
export function csvName(variantsName: string): string {
  return `${variantsStem(variantsName)}.diversity.csv`;
}

/** The one population a run will take, "All individuals", with its
    size: "1 population, All individuals: 200 individuals". */
export function onePopulationText(size: number): string {
  return `1 population, ${ONE_POPULATION}: ${counted(size, "individual")}`;
}

/** The line of the ready state without a metadata file, the words of
    the Individuals step, so that a user who meant to load one learns it
    here. */
export const NO_METADATA_TEXT =
  "No metadata file: every individual is in one population.";

/** What the populations of a run are: every individual in one
    population, without a metadata file or with one, or populations. */
export type PopulationsKind = "noFile" | "onePopulation" | "populations";

/**
 * The lines of the ready state, and of the state of a result removed:
 * the populations a run will take with their sizes, when any is left, or
 * the one population, `kind` saying which, with the line of no metadata
 * file after it when there is none; the populations the filters of
 * individuals leave empty, when any; and, when `waitsForStatistics`, a
 * threshold on the individuals waiting for the statistics of each
 * individual, the line that says Run calculates them first, `kept` being
 * then the populations before the thresholds.
 */
export function readyLines(
  kept: PopulationsKept,
  waitsForStatistics: boolean,
  kind: PopulationsKind,
): readonly string[] {
  const [one] = kept.pops;
  return [
    ...(kind !== "populations" && one !== undefined
      ? [onePopulationText(one[1].length)]
      : kept.pops.length > 0
        ? [populationsText(kept.pops)]
        : []),
    ...(kind === "noFile" ? [NO_METADATA_TEXT] : []),
    ...(kept.emptied.length > 0 ? [emptiedText(kept.emptied)] : []),
    ...(waitsForStatistics ? [WAITS_FOR_STATISTICS_TEXT] : []),
  ];
}
