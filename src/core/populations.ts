/**
 * What the analyses per population share from stage 5, the diversity, the
 * distances between populations and the LD decay, which lock and name the
 * populations alike (docs/specs/core/project.md, "What the analyses per
 * population share from stage 5"): the reasons of a lock when the lists of
 * individuals, or the individuals kept, leave no population; the
 * populations under the minimum of individuals, and their words before a
 * Run; and the helpers the analyses and their panels call beside them.
 *
 * They are in a module of their own because `populationListsNeeds` needs
 * `individualsKept` of individualsKept.ts, which imports project.ts: in
 * project.ts, where they were until 1 October 2026, they made the two
 * modules import each other, and a constant at the top of either, made
 * with a function of the other, could have stopped the page at load. This
 * module imports both, and neither is to import it.
 */

import { individualsKept } from "./individualsKept.ts";
import type { IndividualsKept } from "./individualsKept.ts";
import {
  bothOf,
  counted,
  escaped,
  grouped,
  namesOf,
  populationsKept,
  shown,
  MAX_NAMED,
} from "./project.ts";
import type { Project } from "./project.ts";
import type { LeftOut, Pops } from "../worker/protocol.ts";

/** The reason of the lock of `populationsKeptNeeds`, when the `numKept`
    individuals kept have no population in the column `column`, which
    leaves every population, `emptied`, empty: "The 34 individuals kept
    have no population in popcat, so none of the 2 populations has an
    individual left. Loosen …", with one population by its name. */
export function allEmptiedText(
  numKept: number,
  column: string,
  emptied: readonly string[],
): string {
  const kept =
    numKept === 1
      ? "The one individual kept has"
      : `The ${counted(numKept, "individual")} kept have`;
  const [only] = emptied;
  const left =
    emptied.length === 1 && only !== undefined
      ? `${escaped(only)} has no individual left. ${loosenText(true)}`
      : `none of the ${counted(emptied.length, "population")} has an individual left. ${loosenText(false)}`;
  return `${kept} no population in ${shown(column)}, so ${left}`;
}

/** What to do about populations left empty, of one or of several. */
export function loosenText(one: boolean): string {
  return `Loosen the filters of individuals in the Variants step to keep ${one ? "it" : "them"}.`;
}

/** The populations the lists of individuals to keep and to remove leave,
    known from the project alone, since the thresholds on the individuals
    can only lower them; `null` when the individuals kept or the
    populations cannot be made. */
export function populationsByLists(p: Project): Pops | null {
  const kept = individualsKept(p, null);
  return kept === null
    ? null
    : (populationsKept(p, kept.byLists)?.pops ?? null);
}

/**
 * The reason when the lists to keep and to remove leave no individual
 * that has a population, known from the project alone: "The lists of
 * individuals to keep and to remove leave none of the individuals of
 * panel.nei that have a population in popcat, so no population is left.
 * Change the lists in the Variants step." `null` for the one population,
 * whose lists that leave nobody the store locks on first with the words
 * of `keptNoneReason`; when some population keeps an individual; when the
 * individuals kept cannot be made, which the store locks on first; and
 * for a project of association, as the functions of the populations of
 * stage 4 are.
 */
export function populationListsNeeds(p: Project): string | null {
  const left = populationsByLists(p);
  if (left === null || p.variants === null) {
    return null;
  }
  const column = populationsColumnOf(p);
  if (column === null || left.length > 0) {
    return null;
  }
  return `The lists of individuals to keep and to remove leave none of the individuals of ${escaped(p.variants.name)} that have a population in ${shown(column)}, so no population is left. Change the lists in the Variants step.`;
}

/**
 * The reason when the individuals kept, once known, leave no population,
 * in the words the owner decided at stop B on 27 September 2026, those of
 * `allEmptiedText`. `null` while the list is not known, when some
 * population keeps an individual, for the one population, and for a
 * project of association, as the functions of the populations of stage 4
 * are. A list that keeps no individual the store locks
 * on first, with the words of `keptNoneReason`, and never asks of this.
 */
export function populationsKeptNeeds(
  p: Project,
  kept: IndividualsKept,
): string | null {
  const list = kept.list.kind === "known" ? kept.list.individuals : null;
  const column = populationsColumnOf(p);
  if (list === null || column === null) {
    return null;
  }
  const left = populationsKept(p, list);
  if (left === null || left.pops.length > 0 || left.emptied.length === 0) {
    return null;
  }
  return allEmptiedText(list.length, column, left.emptied);
}

/** The column the populations are taken from, or `null` when no column
    is chosen, for the one population, without a metadata file or with the
    grouping `onePopulation`, and for a project of association, whose
    grouping has roles; an analysis per population, which is never given
    one, throws its own defect on it. */
export function populationsColumnOf(p: Project): string | null {
  switch (p.grouping.kind) {
    case "roles":
    case "onePopulation":
      return null;
    case "populations":
      return p.individuals === null ? null : p.grouping.column;
  }
}

/**
 * The populations `pops` with at least `minNumIndividuals` individuals,
 * `withMinimum`, and those with fewer, `under`, with their counts, each
 * in the order of `pops`. A population with fewer individuals than the
 * minimum reaches it at no variant, so it has no value in any statistic of
 * popnei that tests it; the diversity and the distances between
 * populations both find it here, so that they never disagree.
 */
export function populationsWithMinimum(
  pops: Pops,
  minNumIndividuals: number,
): { readonly withMinimum: Pops; readonly under: LeftOut } {
  const withMinimum = pops.filter(
    ([, individuals]) => individuals.length >= minNumIndividuals,
  );
  const under = pops
    .filter(([, individuals]) => individuals.length < minNumIndividuals)
    .map(([pop, individuals]) =>
      Object.freeze([pop, individuals.length] as const),
    );
  return Object.freeze({
    withMinimum: Object.freeze(withMinimum),
    under: Object.freeze(under),
  });
}

/**
 * The words of the populations under the minimum of individuals, which
 * the ready state of the panels of the diversity and of the distances
 * shows: "p3 has 12 individuals, fewer than the minimum of 20, " and the
 * consequence of one, `consequence.one`; "p3 and p5 have 12 and 8
 * individuals, fewer than the minimum of 20, " and that of several,
 * `consequence.many`; past three populations, named as `namesOf` names
 * them, with no counts, "p3, p5 and 2 more have fewer individuals than
 * the minimum of 20, ". An empty `under` is a defect, thrown.
 */
export function underMinimumText(
  under: LeftOut,
  minNumIndividuals: number,
  consequence: { readonly one: string; readonly many: string },
): string {
  const minimum = `the minimum of ${grouped(minNumIndividuals)}`;
  const [only] = under;
  if (only === undefined) {
    throw defect("underMinimumText was given no population.");
  }
  if (under.length === 1) {
    const [pop, numIndividuals] = only;
    return `${namesOf([pop])} has ${counted(numIndividuals, "individual")}, fewer than ${minimum}, ${consequence.one}`;
  }
  const names = namesOf(under.map(([pop]) => pop));
  // The counts before the minimum, so that they are not read as more
  // minimums.
  const fewer =
    under.length <= MAX_NAMED
      ? `${bothOf(under.map(([, numIndividuals]) => grouped(numIndividuals)))} individuals, fewer than ${minimum}`
      : `fewer individuals than ${minimum}`;
  return `${names} have ${fewer}, ${consequence.many}`;
}

/** An error for a state the code makes impossible. */
function defect(message: string): Error {
  return new Error(`popnei_web defect: ${message}`);
}
