/**
 * The group of each population a plot draws, its colour and its shape,
 * one rule for every plot of populations of both pages, so that a
 * population has one mark in all of them. Pure, so that a test in node
 * checks it.
 */
import { MAX_LINE_SERIES } from "../../charts/limits.ts";
import { UNCLASSIFIED_POPULATION } from "../../core/project.ts";
import type { Pops } from "../../worker/protocol.ts";

/**
 * The group of each population `drawn` (ldDecay.md, "What it shows";
 * sfs.md, "On popgen2.html"): its place among the populations of the
 * project, `pops`, `populationsOf(p)`, whether or not the filters empty
 * those before it, so that it has one mark in the LD decay, the
 * spectrum's lines, the bar plots of the diversity and the principal
 * components, which number their groups the same way (`pcaColours` of
 * core). The marks repeat every `MAX_LINE_SERIES` groups, 49, and two
 * series of one mark are refused by the line plot; so with more
 * populations than that in the project, and for the one population of
 * every individual, the group is the place among the populations drawn
 * (point 14 of docs/plans/population-analyses.report.md). The one
 * population of popgen2.html, "Unclassified", drawn alone and not among
 * `pops`, which a column that gives none of the variants file's
 * individuals a population makes, has the group 0. Throws a defect on
 * any other population drawn that the project does not have, since a
 * result is shown under the key of its populations.
 */
export function populationGroups(
  drawn: readonly string[],
  pops: Pops | "all" | null,
): readonly number[] {
  if (pops === null || pops === "all" || pops.length > MAX_LINE_SERIES) {
    return drawn.map((_pop, i) => i);
  }
  const placeOf = new Map(pops.map(([name], place) => [name, place]));
  const [only] = drawn;
  if (
    drawn.length === 1 &&
    only === UNCLASSIFIED_POPULATION &&
    !placeOf.has(only)
  ) {
    return [0];
  }
  return drawn.map((pop) => {
    const place = placeOf.get(pop);
    if (place === undefined) {
      throw new Error(
        "popnei_web defect: a plot of populations draws a population the project does not have.",
      );
    }
    return place;
  });
}
