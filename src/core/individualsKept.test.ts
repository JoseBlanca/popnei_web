/**
 * The tests of the individuals the filters keep, from
 * docs/specs/core/individualsKept.md, "How it is verified": the worked case
 * of five individuals, popnei's numbers of panel.nei, read from a fixture
 * that e2e/fixtures/make_fixtures.mjs writes with popnei, and a property
 * over random projects and statistics.
 */

import { readFileSync } from "node:fs";
import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import { individualsKept, keptNoneReason } from "./individualsKept.ts";
import type { IndividualStats, IndividualsKept } from "./individualsKept.ts";
import type { Project } from "./project.ts";
import { deepFreeze, sampleProject } from "./testSupport.ts";
import type { IndividualFilter } from "../worker/protocol.ts";

/** A project whose variants file, panel.nei, is read with `individuals`
    and whose filters of individuals are `filters`, frozen deeply. */
function projectOf(
  individuals: readonly string[],
  filters: readonly IndividualFilter[],
): Project {
  const sample = sampleProject();
  return deepFreeze<Project>({
    ...sample,
    variants: {
      fileId: "00112233445566778899aabbccddeeff",
      name: "panel.nei",
      size: 1024,
      format: "nei",
      readOptions: null,
      read: { kind: "read", individuals, ploidy: 2, numVars: null },
    },
    filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.05 }],
    individualFilters: filters,
  });
}

/** The five individuals of the worked case. */
const FIVE = ["a", "b", "c", "d", "e"];

/** The statistics of the worked case: `e` calls no genotype. */
const FIVE_STATS: IndividualStats = {
  individuals: FIVE,
  missingGtRate: new Float64Array([0.2, 0.1, 0.3, 0.05, 1]),
  obsHetRate: new Float64Array([0.3, 0.5, 0.2, 0.4, NaN]),
};

/** What the filters of the worked case keep, which the tests assert is
    not null. */
function keptOf(
  filters: readonly IndividualFilter[],
  stats: IndividualStats | null = FIVE_STATS,
): IndividualsKept {
  const kept = individualsKept(projectOf(FIVE, filters), stats);
  if (kept === null) {
    throw new Error("the worked case gave no individuals kept");
  }
  return kept;
}

describe("VS2 D2 the worked case of five individuals", () => {
  test("with no filter of individuals the list is null, every individual kept", () => {
    const kept = keptOf([]);
    expect(kept.list).toEqual({ kind: "known", individuals: null });
    expect(kept.byLists).toEqual(FIVE);
    expect(kept.counts).toEqual([]);
  });

  test("remove b, missing data 0.2 and heterozygosity 0.4 keep a and d, each at its threshold exactly", () => {
    const kept = keptOf([
      { kind: "remove", individuals: ["b"] },
      { kind: "missing_data", maxAllowedMissingRate: 0.2 },
      { kind: "obs_het", maxAllowedObsHet: 0.4 },
    ]);
    expect(kept.list).toEqual({ kind: "known", individuals: ["a", "d"] });
    expect(kept.byLists).toEqual(["a", "c", "d", "e"]);
    expect(kept.counts).toEqual([
      { kind: "remove", given: 5, kept: 4 },
      { kind: "missing_data", given: 4, kept: 2 },
      { kind: "obs_het", given: 2, kept: 2 },
    ]);
  });

  test("a list to keep of e and a gives a and e, in the order of the file", () => {
    const kept = keptOf([{ kind: "keep", individuals: ["e", "a"] }]);
    expect(kept.list).toEqual({ kind: "known", individuals: ["a", "e"] });
    expect(kept.byLists).toEqual(["a", "e"]);
    expect(kept.counts).toEqual([{ kind: "keep", given: 5, kept: 2 }]);
  });

  test("a heterozygosity threshold of 1 alone removes e, whose heterozygosity is NaN", () => {
    const kept = keptOf([{ kind: "obs_het", maxAllowedObsHet: 1 }]);
    expect(kept.list).toEqual({
      kind: "known",
      individuals: ["a", "b", "c", "d"],
    });
    expect(kept.counts).toEqual([{ kind: "obs_het", given: 5, kept: 4 }]);
  });

  test("missing data 0.01 keeps none, and keptNoneReason gives the lock", () => {
    const p = projectOf(FIVE, [
      { kind: "missing_data", maxAllowedMissingRate: 0.01 },
    ]);
    const kept = individualsKept(p, FIVE_STATS);
    expect(kept?.list).toEqual({ kind: "known", individuals: [] });
    expect(kept?.counts).toEqual([{ kind: "missing_data", given: 5, kept: 0 }]);
    expect(keptNoneReason(p, kept ?? null)).toBe(
      "The filters of individuals keep none of the 5 individuals of panel.nei. Loosen them in the Variants step.",
    );
  });

  test("a threshold with no statistics needs them, the lists' counts given and the threshold's null", () => {
    const kept = keptOf(
      [
        { kind: "keep", individuals: ["a", "b", "c"] },
        { kind: "remove", individuals: ["c"] },
        { kind: "missing_data", maxAllowedMissingRate: 0.2 },
        { kind: "obs_het", maxAllowedObsHet: 0.4 },
      ],
      null,
    );
    expect(kept.list).toEqual({ kind: "needsStatistics" });
    expect(kept.byLists).toEqual(["a", "b"]);
    expect(kept.counts).toEqual([
      { kind: "keep", given: 5, kept: 3 },
      { kind: "remove", given: 3, kept: 2 },
      { kind: "missing_data", given: 2, kept: null },
      { kind: "obs_het", given: null, kept: null },
    ]);
  });

  test("lists that keep none, with a threshold and no statistics, give the list known and empty, and the lock", () => {
    const p = projectOf(FIVE, [
      { kind: "remove", individuals: FIVE },
      { kind: "missing_data", maxAllowedMissingRate: 0.2 },
    ]);
    const kept = individualsKept(p, null);
    expect(kept?.list).toEqual({ kind: "known", individuals: [] });
    expect(kept?.byLists).toEqual([]);
    expect(kept?.counts).toEqual([
      { kind: "remove", given: 5, kept: 0 },
      { kind: "missing_data", given: 0, kept: 0 },
    ]);
    expect(keptNoneReason(p, kept ?? null)).toBe(
      "The filters of individuals keep none of the 5 individuals of panel.nei. Loosen them in the Variants step.",
    );
  });

  test("a file of one individual that the filters remove is named in the singular", () => {
    const p = projectOf(["a"], [{ kind: "remove", individuals: ["a"] }]);
    expect(keptNoneReason(p, individualsKept(p, null))).toBe(
      "The filters of individuals do not keep the one individual of panel.nei. Loosen them in the Variants step.",
    );
  });

  test("statistics of the individuals in another order are a defect", () => {
    const reordered: IndividualStats = {
      ...FIVE_STATS,
      individuals: ["b", "a", "c", "d", "e"],
    };
    expect(() =>
      keptOf([{ kind: "obs_het", maxAllowedObsHet: 0.4 }], reordered),
    ).toThrow(/^popnei_web defect: /);
  });
});

describe("VS2 D2 the other cases of the spec", () => {
  test("statistics with arrays shorter than the individuals are a defect", () => {
    const short: IndividualStats = {
      ...FIVE_STATS,
      obsHetRate: new Float64Array([0.3, 0.5, 0.2, 0.4]),
    };
    expect(() =>
      keptOf([{ kind: "missing_data", maxAllowedMissingRate: 1 }], short),
    ).toThrow(/^popnei_web defect: /);
    const shortMissing: IndividualStats = {
      ...FIVE_STATS,
      missingGtRate: new Float64Array([0.2, 0.1, 0.3, 0.05]),
    };
    expect(() =>
      keptOf([{ kind: "obs_het", maxAllowedObsHet: 1 }], shortMissing),
    ).toThrow(/^popnei_web defect: /);
  });

  test("statistics of the first four individuals, with arrays of the file's five, are a defect", () => {
    // Each name given is the file's at its place, and the arrays are of
    // the length of the file: only the length of the names tells.
    const fewerNames: IndividualStats = {
      ...FIVE_STATS,
      individuals: ["a", "b", "c", "d"],
    };
    expect(() =>
      keptOf([{ kind: "missing_data", maxAllowedMissingRate: 1 }], fewerNames),
    ).toThrow(
      "popnei_web defect: the statistics of each individual are not of the individuals of the variants file, in its order.",
    );
  });

  test("with no threshold the statistics are not read, and the list is known without them", () => {
    const wrong: IndividualStats = {
      individuals: ["z"],
      missingGtRate: new Float64Array([0]),
      obsHetRate: new Float64Array([0]),
    };
    const filters: IndividualFilter[] = [
      { kind: "remove", individuals: ["c"] },
    ];
    expect(keptOf(filters, wrong)).toEqual(keptOf(filters, null));
    expect(keptOf(filters, null).list).toEqual({
      kind: "known",
      individuals: ["a", "b", "d", "e"],
    });
  });

  test("filters that remove no individual give the list null, each filter given and kept the same number", () => {
    const kept = keptOf([
      { kind: "keep", individuals: ["e", "d", "c", "b", "a"] },
      { kind: "missing_data", maxAllowedMissingRate: 1 },
    ]);
    expect(kept.list).toEqual({ kind: "known", individuals: null });
    expect(kept.counts).toEqual([
      { kind: "keep", given: 5, kept: 5 },
      { kind: "missing_data", given: 5, kept: 5 },
    ]);
  });

  test("individuals that call no genotype are all removed by any heterozygosity threshold, and kept without it", () => {
    const none: IndividualStats = {
      individuals: FIVE,
      missingGtRate: new Float64Array([1, 1, 1, 1, 1]),
      obsHetRate: new Float64Array([NaN, NaN, NaN, NaN, NaN]),
    };
    const p = projectOf(FIVE, [
      { kind: "missing_data", maxAllowedMissingRate: 1 },
      { kind: "obs_het", maxAllowedObsHet: 1 },
    ]);
    const kept = individualsKept(p, none);
    expect(kept?.list).toEqual({ kind: "known", individuals: [] });
    expect(keptNoneReason(p, kept ?? null)).toBe(
      "The filters of individuals keep none of the 5 individuals of panel.nei. Loosen them in the Variants step.",
    );
    expect(
      keptOf([{ kind: "missing_data", maxAllowedMissingRate: 1 }], none).list,
    ).toEqual({ kind: "known", individuals: null });
  });

  test("a variants file not read, or a list naming an individual not in it, gives nothing", () => {
    const notRead = deepFreeze<Project>({
      ...projectOf(FIVE, []),
      variants: null,
    });
    expect(individualsKept(notRead, FIVE_STATS)).toBeNull();
    expect(keptNoneReason(notRead, null)).toBeNull();
    const unknown = projectOf(FIVE, [
      { kind: "keep", individuals: ["a", "x"] },
    ]);
    expect(individualsKept(unknown, FIVE_STATS)).toBeNull();
  });

  test("keptNoneReason is null when the list is not empty, not known, or none is removed", () => {
    const some = projectOf(FIVE, [{ kind: "remove", individuals: ["a"] }]);
    expect(keptNoneReason(some, individualsKept(some, null))).toBeNull();
    const waiting = projectOf(FIVE, [
      { kind: "missing_data", maxAllowedMissingRate: 0 },
    ]);
    expect(keptNoneReason(waiting, individualsKept(waiting, null))).toBeNull();
    const all = projectOf(FIVE, []);
    expect(keptNoneReason(all, individualsKept(all, null))).toBeNull();
  });

  test("keptNoneReason writes the count with commas and escapes the name of the file", () => {
    const names = Array.from(
      { length: 1203 },
      (_, index) => `i${String(index)}`,
    );
    const base = projectOf(names, [{ kind: "obs_het", maxAllowedObsHet: 0.1 }]);
    const p = deepFreeze<Project>({
      ...base,
      variants:
        base.variants === null
          ? null
          : { ...base.variants, name: "pan‮el.nei" },
    });
    const stats: IndividualStats = {
      individuals: names,
      missingGtRate: new Float64Array(names.length),
      obsHetRate: new Float64Array(names.length).fill(0.5),
    };
    expect(keptNoneReason(p, individualsKept(p, stats))).toBe(
      "The filters of individuals keep none of the 1,203 individuals of pan\\u202eel.nei. Loosen them in the Variants step.",
    );
  });
});

/** The statistics of panel.nei at 0.05 that make_fixtures.mjs wrote with
    popnei, a NaN written as null read back as NaN. */
function panelStats(): IndividualStats & { readonly threshold: number } {
  const parsed: unknown = JSON.parse(
    readFileSync(
      new URL(
        "../../e2e/fixtures/panel_individual_stats.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("maxAllowedMissingRate" in parsed) ||
    !("individuals" in parsed) ||
    !("missingGtRate" in parsed) ||
    !("obsHetRate" in parsed)
  ) {
    throw new Error("panel_individual_stats.json lacks a field");
  }
  const { maxAllowedMissingRate, individuals, missingGtRate, obsHetRate } =
    parsed;
  const strings = (value: unknown): string[] =>
    Array.isArray(value) && value.every((v) => typeof v === "string")
      ? value.map(String)
      : [];
  const numbers = (value: unknown): Float64Array =>
    Float64Array.from(Array.isArray(value) ? value : [], (v: unknown) =>
      typeof v === "number" ? v : NaN,
    );
  if (typeof maxAllowedMissingRate !== "number") {
    throw new Error("panel_individual_stats.json has no threshold");
  }
  return {
    threshold: maxAllowedMissingRate,
    individuals: strings(individuals),
    missingGtRate: numbers(missingGtRate),
    obsHetRate: numbers(obsHetRate),
  };
}

describe("VS2 D2 popnei's numbers of panel.nei", () => {
  test("popnei's statistics at 0.05 give 125 individuals at a missing rate of 0.03, and 48 or 119 of them at a heterozygosity of 0.35 or 0.38", () => {
    const stats = panelStats();
    expect(stats.threshold).toBe(0.05);
    expect(stats.individuals).toHaveLength(200);
    const run = (filters: readonly IndividualFilter[]): IndividualsKept => {
      const kept = individualsKept(
        projectOf(stats.individuals, filters),
        stats,
      );
      if (kept === null) {
        throw new Error("panel.nei gave no individuals kept");
      }
      return kept;
    };
    const missing: IndividualFilter = {
      kind: "missing_data",
      maxAllowedMissingRate: 0.03,
    };
    const of125 = run([missing]);
    expect(of125.counts).toEqual([
      { kind: "missing_data", given: 200, kept: 125 },
    ]);
    if (of125.list.kind !== "known" || of125.list.individuals === null) {
      throw new Error("the list of 125 is not a list");
    }
    expect(of125.list.individuals.slice(0, 3)).toEqual([
      "s000",
      "s003",
      "s004",
    ]);
    expect(
      run([missing, { kind: "obs_het", maxAllowedObsHet: 0.35 }]).counts,
    ).toEqual([
      { kind: "missing_data", given: 200, kept: 125 },
      { kind: "obs_het", given: 125, kept: 48 },
    ]);
    expect(
      run([missing, { kind: "obs_het", maxAllowedObsHet: 0.38 }]).counts,
    ).toEqual([
      { kind: "missing_data", given: 200, kept: 125 },
      { kind: "obs_het", given: 125, kept: 119 },
    ]);
  });
});

/** The names a drawn project may give its individuals. */
const NAMES = ["a", "b", "c", "d", "e", "f"];

/** A rate a drawn statistic or threshold may take: a few values, so that
    a threshold often equals a statistic, and NaN for a heterozygosity. */
const rate = fc.constantFrom(0, 0.1, 0.2, 0.5, 1);

/** A random project and statistics: one or more individuals of `NAMES`, any
    filters of each kind in the fixed order, lists of names of the file,
    and a statistic of each kind for each individual. */
const drawnCase = fc
  .shuffledSubarray(NAMES, { minLength: 1 })
  .chain((individuals) => {
    const list = fc.subarray(individuals, { minLength: 1 });
    return fc.record({
      individuals: fc.constant(individuals),
      keep: fc.option(list),
      remove: fc.option(list),
      missing: fc.option(rate),
      obsHet: fc.option(rate),
      missingGtRate: fc.array(rate, {
        minLength: individuals.length,
        maxLength: individuals.length,
      }),
      obsHetRate: fc.array(fc.oneof(rate, fc.constant(NaN)), {
        minLength: individuals.length,
        maxLength: individuals.length,
      }),
    });
  });

describe("VS2 D2 the property of the individuals kept", () => {
  test("the list is in the order of the file and holds exactly the individuals every filter keeps, each kept the next one's given", () => {
    fc.assert(
      fc.property(drawnCase, (drawn) => {
        const filters: IndividualFilter[] = [];
        if (drawn.keep !== null) {
          filters.push({ kind: "keep", individuals: drawn.keep });
        }
        if (drawn.remove !== null) {
          filters.push({ kind: "remove", individuals: drawn.remove });
        }
        if (drawn.missing !== null) {
          filters.push({
            kind: "missing_data",
            maxAllowedMissingRate: drawn.missing,
          });
        }
        if (drawn.obsHet !== null) {
          filters.push({ kind: "obs_het", maxAllowedObsHet: drawn.obsHet });
        }
        const stats: IndividualStats = {
          individuals: drawn.individuals,
          missingGtRate: Float64Array.from(drawn.missingGtRate),
          obsHetRate: Float64Array.from(drawn.obsHetRate),
        };
        const kept = individualsKept(
          projectOf(drawn.individuals, filters),
          stats,
        );
        const keptByEvery = drawn.individuals.filter((name, index) => {
          const missingRate = drawn.missingGtRate[index] ?? NaN;
          const obsHetRate = drawn.obsHetRate[index] ?? NaN;
          return (
            (drawn.keep?.includes(name) ?? true) &&
            !(drawn.remove?.includes(name) ?? false) &&
            (drawn.missing === null || missingRate <= drawn.missing) &&
            (drawn.obsHet === null ||
              (!Number.isNaN(obsHetRate) && obsHetRate <= drawn.obsHet))
          );
        });
        const keptByLists = drawn.individuals.filter(
          (name) =>
            (drawn.keep?.includes(name) ?? true) &&
            !(drawn.remove?.includes(name) ?? false),
        );
        expect(kept?.list).toEqual({
          kind: "known",
          individuals:
            keptByEvery.length === drawn.individuals.length
              ? null
              : keptByEvery,
        });
        expect(kept?.byLists).toEqual(keptByLists);
        const counts = kept?.counts ?? [];
        expect(counts.map((count) => count.kind)).toEqual(
          filters.map((filter) => filter.kind),
        );
        expect(counts[0]?.given ?? drawn.individuals.length).toBe(
          drawn.individuals.length,
        );
        counts.forEach((count, index) => {
          const next = counts[index + 1];
          expect(count.kept).toBe(next?.given ?? keptByEvery.length);
        });
      }),
    );
  });
});
