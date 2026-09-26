/**
 * The individuals the filters of individuals of a project keep, and how
 * many each filter was given and kept (docs/specs/core/individualsKept.md).
 * popnei filters individuals only by a list, so the four filters, a list to
 * keep, a list to remove and a threshold on the proportion of missing
 * genotypes and on the observed heterozygosity of each individual, are
 * applied here, to the statistics of each individual that popnei's
 * `calcPerIndividualStats` gives, and the one list they leave is what every
 * analysis that reads the filters of individuals is given.
 */

import type { IndividualFilterKind } from "../worker/protocol.ts";
import {
  escaped,
  grouped,
  individualListNeeds,
  projectNeeds,
} from "./project.ts";
import type { Project } from "./project.ts";

/** The statistics of each individual, over the variants the filters keep. */
export interface IndividualStats {
  /** Every individual of the variants file, in its order. */
  readonly individuals: readonly string[];
  /** The proportion of missing genotypes of each individual. */
  readonly missingGtRate: Float64Array;
  /** The observed heterozygosity of each individual, NaN for one with no
      called genotype. */
  readonly obsHetRate: Float64Array;
}

/** The list of the individuals kept, known or waiting for the statistics
    of each individual. */
export type KeptList =
  /** Known: the individuals kept, in the order of the variants file, or
      `null` when the filters remove none. */
  | { readonly kind: "known"; readonly individuals: readonly string[] | null }
  /** Not known: the project has a threshold and no statistics were given. */
  | { readonly kind: "needsStatistics" };

/** How many individuals one filter of individuals was given and kept. */
export interface FilterCount {
  /** The kind of the filter. */
  readonly kind: IndividualFilterKind;
  /** The individuals it was given, or `null` when that needs the
      statistics and there are none. */
  readonly given: number | null;
  /** The individuals it kept, or `null` when that needs the statistics
      and there are none. */
  readonly kept: number | null;
}

/** The individuals the filters of individuals keep, with the counts of
    each filter. */
export interface IndividualsKept {
  /** The list every analysis that reads the filters of individuals is
      given. */
  readonly list: KeptList;
  /** The individuals the lists to keep and to remove keep, in the order
      of the variants file, known with no statistics; every individual
      of the file when there is no list. */
  readonly byLists: readonly string[];
  /** One per filter of individuals of the project, in its order. */
  readonly counts: readonly FilterCount[];
}

/**
 * The individuals the filters of individuals of `p` keep, applied in the
 * project's fixed order, keep, remove, missing data, observed
 * heterozygosity, each to the individuals the one before it kept. A
 * threshold keeps an individual whose number is at most it, and the
 * threshold on the observed heterozygosity removes one whose number is
 * NaN, with no called genotype. Gives `null` when `projectNeeds` or
 * `individualListNeeds` gives a reason, a variants file not read or a
 * list of individuals that popnei would refuse. `stats` is used only when the project has a threshold;
 * then, statistics of other individuals than those of the variants file,
 * in its order, or with arrays of another length, are a defect, thrown.
 */
export function individualsKept(
  p: Project,
  stats: IndividualStats | null,
): IndividualsKept | null {
  if (projectNeeds(p) !== null || individualListNeeds(p) !== null) {
    return null;
  }
  const all = fileIndividuals(p);
  const hasThreshold = p.individualFilters.some(
    (filter) => filter.kind === "missing_data" || filter.kind === "obs_het",
  );
  const given = hasThreshold ? stats : null;
  if (given !== null) {
    checkStats(all, given);
  }
  const indices = all.map((_, index) => index);
  let byLists = indices;
  // The indices into `all` of the individuals the filters so far kept, or
  // null once a threshold had no statistics.
  let current: readonly number[] | null = indices;
  const counts: FilterCount[] = [];
  for (const filter of p.individualFilters) {
    const before: readonly number[] | null = current;
    switch (filter.kind) {
      case "keep": {
        const named = new Set(filter.individuals);
        const keeps = (index: number): boolean => named.has(nameAt(all, index));
        byLists = byLists.filter(keeps);
        current = before?.filter(keeps) ?? null;
        break;
      }
      case "remove": {
        const named = new Set(filter.individuals);
        const keeps = (index: number): boolean =>
          !named.has(nameAt(all, index));
        byLists = byLists.filter(keeps);
        current = before?.filter(keeps) ?? null;
        break;
      }
      case "missing_data": {
        const threshold = filter.maxAllowedMissingRate;
        current =
          given === null
            ? null
            : (before?.filter(
                (index) => rateAt(given.missingGtRate, index) <= threshold,
              ) ?? null);
        break;
      }
      case "obs_het": {
        const threshold = filter.maxAllowedObsHet;
        // A NaN is not at most any threshold, so an individual with no
        // called genotype is removed.
        current =
          given === null
            ? null
            : (before?.filter(
                (index) => rateAt(given.obsHetRate, index) <= threshold,
              ) ?? null);
        break;
      }
    }
    counts.push({
      kind: filter.kind,
      given: before?.length ?? null,
      kept: current?.length ?? null,
    });
  }
  return {
    list: listOf(all, current),
    byLists: byLists.map((index) => nameAt(all, index)),
    counts,
  };
}

/**
 * The reason every analysis that reads the filters of individuals is
 * locked when the list of `kept` is known and empty, "The filters of
 * individuals keep none of the 200 individuals of panel.nei. Loosen them
 * in the Variants step.", with the count of the individuals of the
 * variants file and its name escaped; or `null`, for a list not known, not
 * empty, or no `kept`.
 */
export function keptNoneReason(
  p: Project,
  kept: IndividualsKept | null,
): string | null {
  // A list of none removed, null, is not empty.
  const keptList = kept?.list;
  const keptNone =
    keptList?.kind === "known" && keptList.individuals?.length === 0;
  if (!keptNone || p.variants === null) {
    return null;
  }
  const numIndividuals = fileIndividuals(p).length;
  return `The filters of individuals keep none of the ${grouped(numIndividuals)} individuals of ${escaped(p.variants.name)}. Loosen them in the Variants step.`;
}

/** The individuals of the variants file of `p`, which `projectNeeds`
    giving no reason has read. */
function fileIndividuals(p: Project): readonly string[] {
  if (p.variants?.read.kind !== "read") {
    throw defect("the individuals kept asked of a variants file not read.");
  }
  return p.variants.read.individuals;
}

/** Throws a defect when `stats` are not of the individuals `all`, in
    their order, with one number of each kind for each. */
function checkStats(all: readonly string[], stats: IndividualStats): void {
  const sameIndividuals =
    stats.individuals.length === all.length &&
    stats.individuals.every((name, index) => name === all[index]);
  if (!sameIndividuals) {
    throw defect(
      "the statistics of each individual are not of the individuals of the variants file, in its order.",
    );
  }
  if (
    stats.missingGtRate.length !== all.length ||
    stats.obsHetRate.length !== all.length
  ) {
    throw defect(
      `the statistics of each individual have ${String(stats.missingGtRate.length)} missing rates and ${String(stats.obsHetRate.length)} heterozygosities for ${String(all.length)} individuals.`,
    );
  }
}

/** The list the indices `kept` into `all` give: not known for `null`,
    `null` when they are every individual, since the filters only remove,
    and their names otherwise. */
function listOf(
  all: readonly string[],
  kept: readonly number[] | null,
): KeptList {
  if (kept === null) {
    return { kind: "needsStatistics" };
  }
  return {
    kind: "known",
    individuals:
      kept.length === all.length
        ? null
        : kept.map((index) => nameAt(all, index)),
  };
}

/** The name of the individual at `index` of `all`, an index this module
    made. */
function nameAt(all: readonly string[], index: number): string {
  const name = all[index];
  if (name === undefined) {
    throw defect(`no individual at the index ${String(index)}.`);
  }
  return name;
}

/** The number at `index` of `rates`, an index `checkStats` has bounded. */
function rateAt(rates: Float64Array, index: number): number {
  const rate = rates[index];
  if (rate === undefined) {
    throw defect(`no statistic at the index ${String(index)}.`);
  }
  return rate;
}

/** An error for a state the code makes impossible. */
function defect(message: string): Error {
  return new Error(`popnei_web defect: ${message}`);
}
