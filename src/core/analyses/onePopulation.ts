/**
 * The line of the one population of the Populations tab of popgen2.html,
 * which the diversity and the LD decay each say in their part of the tab
 * with their own words (docs/specs/steps/popgen2-populations.md, "The
 * populations it runs on", and "The LD decay"). Apart from
 * `diversity.ts` and `ldDecay.ts`, whose definitions the store of the
 * page loads with its first screen: only the code of the tab, downloaded
 * when the tab is first shown, draws this line, and a module is loaded
 * whole by every page that imports any of it. Named for the one
 * population, not for the diversity, since 12 October 2026 (the review
 * of the LD decay). Pure.
 */
import {
  MAX_LISTED_POPULATIONS,
  UNCLASSIFIED_POPULATION,
  counted,
  escaped,
  grouped,
  popgen2OnePopulationCause,
  shown,
  WITH_ANOTHER_INDIVIDUALS,
} from "../project.ts";
import type { OnePopulationCause, Project } from "../project.ts";
import { defect } from "./words.ts";

/**
 * The line of the populations of the Populations tab of popgen2.html for
 * the one population of `numIndividuals` individuals, in the words
 * `words` of the analysis that says it, the diversity's or the LD
 * decay's: "1 population, Unclassified: 200 individuals. No individual
 * is assigned to a population, so the diversity is of every individual
 * kept as one population.", and a sentence that says why and how to get populations
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
  words: OnePopulationWords,
): string {
  const cause = popgen2OnePopulationCause(p);
  if (cause === null) {
    throw defect(
      "the line of the one population was asked of populations of a column.",
    );
  }
  const line = `1 population, ${UNCLASSIFIED_POPULATION}: ${counted(numIndividuals, "individual")}. No individual is assigned to a population, so ${words.name} is of every individual kept as one population.`;
  const why = onePopulationWhy(p, cause);
  // How to get populations is said once: by the sentence of the cause
  // when there is one, by the end of this one otherwise.
  const mixed = `If the individuals belong to several populations, ${words.mixed}${why === null ? GET_EACH : "."}`;
  return [line, why, standsForOpened(cause) ? mixed : null]
    .filter((sentence) => sentence !== null)
    .join(" ");
}

/** What an analysis says in the line of the one population: its name,
    and what the one population does to its numbers when its individuals
    belong to several populations (docs/functionality.md: nothing
    misleads without warning). */
export interface OnePopulationWords {
  /** The analysis in the middle of a sentence: "the diversity". */
  readonly name: string;
  /** What the mixture does to its numbers, after "If the individuals
      belong to several populations, ". */
  readonly mixed: string;
}

/** The diversity's: the Wahlund effect, F pooled above F within each. */
export const DIVERSITY_ONE_POPULATION: OnePopulationWords = Object.freeze({
  name: "the diversity",
  mixed: `the values of ${UNCLASSIFIED_POPULATION} are those of all the individuals taken as one population, and F comes out higher than within each population`,
});

/** The LD decay's (docs/specs/steps/popgen2-populations.md, "The LD
    decay"): individuals of populations whose allele frequencies differ
    are in LD at any distance when taken together, so the curve of the
    mixture lies higher than those of the populations. */
export const LD_DECAY_ONE_POPULATION: OnePopulationWords = Object.freeze({
  name: "the LD decay",
  mixed: `the r² of ${UNCLASSIFIED_POPULATION} is that of all the individuals taken as one population, and comes out higher than within each population at every distance`,
});

/** The end of the sentence of what the mixture does, `mixed` of
    `OnePopulationWords`, when no sentence before it says how to get
    populations. */
const GET_EACH =
  "; choose a column of populations in the box Individuals to get each one's.";

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
      return `${fileName} could not be read, as the box Individuals says; open it again, or another file, ${WITH_ANOTHER_INDIVIDUALS} to get populations.`;
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
