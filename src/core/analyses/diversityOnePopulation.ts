/**
 * The line of the one population of the Populations tab of popgen2.html
 * (docs/specs/steps/popgen2-populations.md, "The populations it runs
 * on"). Apart from `diversity.ts`, whose definition the store of the page
 * loads with its first screen: only the code of the tab, downloaded when
 * the tab is first shown, draws this line, and a module is loaded whole
 * by every page that imports any of it. Pure.
 */
import {
  MAX_LISTED_POPULATIONS,
  UNCLASSIFIED_POPULATION,
  counted,
  escaped,
  grouped,
  popgen2OnePopulationCause,
  shown,
} from "../project.ts";
import type { OnePopulationCause, Project } from "../project.ts";
import { defect } from "./words.ts";

/**
 * The line of the populations of the Populations tab of popgen2.html for
 * the one population of `numIndividuals` individuals: "1 population,
 * Unclassified: 200 individuals. No individual is assigned to a
 * population, so the diversity is of every individual kept as one
 * population.", and a sentence that says why and how to get populations
 * for a refused file, a column absent and a column of too many values;
 * and, when the one population stands for an individuals file or a
 * column the user opened, one that says what it does to the numbers if
 * the individuals belong to several populations
 * (docs/specs/steps/popgen2-populations.md, "The populations it runs
 * on"). Throws a defect when popgen2.html runs populations of a column.
 */
export function popgen2OnePopulationLine(
  p: Project,
  numIndividuals: number,
): string {
  const cause = popgen2OnePopulationCause(p);
  if (cause === null) {
    throw defect(
      "the line of the one population was asked of populations of a column.",
    );
  }
  const line = `1 population, ${UNCLASSIFIED_POPULATION}: ${counted(numIndividuals, "individual")}. No individual is assigned to a population, so the diversity is of every individual kept as one population.`;
  const why = onePopulationWhy(p, cause);
  return [line, why, standsForOpened(cause) ? MIXED_POPULATIONS : null]
    .filter((sentence) => sentence !== null)
    .join(" ");
}

/** What the one population does to the numbers when its individuals
    belong to several populations: the Wahlund effect, F pooled above F
    within each (docs/functionality.md: nothing misleads without
    warning). */
const MIXED_POPULATIONS =
  "If the individuals belong to several populations, the expected heterozygosity and F are those of all of them pooled, and F comes out higher than within each population.";

/** Whether the one population of the cause `cause` stands for an
    individuals file or a column of the populations the user opened, and
    not for no file or "None", chosen to have none: a refused file, a
    column absent, not offered, of too many values or that classifies
    nobody. */
function standsForOpened(cause: OnePopulationCause): boolean {
  switch (cause.kind) {
    case "refused":
    case "noSuchColumn":
    case "notOffered":
    case "tooMany":
    case "noneClassified":
      return true;
    case "noFile":
    case "noColumn":
      return false;
  }
}

/** The sentence of the line of the one population that says why, for
    the cause `cause`, or `null` for a cause the first sentence says. */
function onePopulationWhy(
  p: Project,
  cause: OnePopulationCause,
): string | null {
  const fileName = escaped(p.individuals?.name ?? "");
  switch (cause.kind) {
    case "refused":
      return `${fileName} could not be read, as the box Individuals says; open it again, or another file, there to get populations.`;
    case "noSuchColumn":
      return `${fileName} has no column ${shown(cause.column)}; choose a column of the populations in the box Individuals.`;
    case "tooMany":
      return `${shown(cause.column)} has ${grouped(cause.numValues)} values, more than the ${String(MAX_LISTED_POPULATIONS)} a column of populations can have; choose another column in the box Individuals to get populations.`;
    case "noFile":
    case "noColumn":
    case "notOffered":
    case "noneClassified":
      return null;
  }
}
