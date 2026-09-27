/**
 * The words of the panel of the diversity (docs/specs/analyses/diversity.md,
 * "The panel"): the populations it will run on, the caption of its table
 * and its cells, the line of its options, and the name of its download;
 * the line of the versions is in `../words.ts`, shared with the checks
 * of the Variants step. Pure, so that a test in node checks them; the
 * panel draws them.
 */

import type {
  DiversityRow,
  PopulationsKept,
} from "../../../core/analyses/diversity.ts";
import {
  allEmptiedText,
  loosenText,
} from "../../../core/analyses/diversity.ts";
import { variantsStem } from "../../../core/fileNames.ts";
import { counted, escaped, grouped, namesOf } from "../../../core/project.ts";
import type { Pops } from "../../../worker/protocol.ts";

/** The decimals of every number of the table. */
const DECIMALS = 4;

/** The populations a run will take, with their sizes, the noun with
    each: "3 populations: p0, 48 individuals; p2, 84 individuals; p1, 68
    individuals". */
export function populationsText(pops: Pops): string {
  const parts = pops.map(
    ([pop, members]) =>
      `${escaped(pop)}, ${counted(members.length, "individual")}`,
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

/** The name of the download of the table: the stem of the variants
    file, `variantsStem`, then `.diversity.csv`; `panel.vcf.gz` gives
    `panel.diversity.csv`. */
export function csvName(variantsName: string): string {
  return `${variantsStem(variantsName)}.diversity.csv`;
}

/** The line of the ready state while a threshold on the individuals waits
    for the statistics of each individual, which a Run calculates first. */
export const WAITS_FOR_STATISTICS_TEXT =
  "Run calculates the statistics of each individual first, and the populations may lose individuals to the thresholds.";

/** The populations the filters of individuals leave with no individual,
    which a run leaves out, and what to do, since the panel is in the
    Analyses step: "p9 has no individual left after the filters of
    individuals, and is left out. Loosen the filters of individuals in
    the Variants step to keep it."; "p1 and p2 have …, and are left out.
    Loosen … to keep them.". */
export function emptiedText(emptied: readonly string[]): string {
  const one = emptied.length === 1;
  return `${namesOf(emptied)} ${one ? "has" : "have"} no individual left after the filters of individuals, and ${one ? "is" : "are"} left out. ${loosenText(one)}`;
}

/**
 * The lines of the ready state, and of the state of a result removed:
 * the populations a run will take with their sizes, when any is left;
 * the populations the filters of individuals leave empty, when any; and,
 * when `waitsForStatistics`, a threshold on the individuals waiting for
 * the statistics of each individual, the line that says Run calculates
 * them first, `kept` being then the populations before the thresholds.
 */
export function readyLines(
  kept: PopulationsKept,
  waitsForStatistics: boolean,
): readonly string[] {
  return [
    ...(kept.pops.length > 0 ? [populationsText(kept.pops)] : []),
    ...(kept.emptied.length === 0
      ? []
      : kept.pops.length === 0
        ? [allEmptiedText(kept.emptied)]
        : [emptiedText(kept.emptied)]),
    ...(waitsForStatistics ? [WAITS_FOR_STATISTICS_TEXT] : []),
  ];
}
