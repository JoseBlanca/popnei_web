/**
 * The counts of the thresholds (docs/plans/thresholds.md, "The phases",
 * 1). The numbers of popnei are those of
 * e2e/fixtures/threshold_counts.json, which make_fixtures.mjs wrote with
 * popnei 0.2.1 under node on 7 October 2026, since the tests of core may
 * not call popnei: the edges and the counts of the 1,280 fine bins of
 * calcVariantsSummary, the values of each individual of that pass, and
 * the variants that popnei's filters keep at 0.05, 0.1 and 0.5.
 */
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import type { VariantStatistic } from "./analyses/variantChecks.ts";
import { deepFreeze } from "./testSupport.ts";
import {
  individualsAtMost,
  snapToFineEdge,
  variantsAtMost,
} from "./thresholds.ts";
import type { VariantStatsPart } from "../worker/protocol.ts";

type FixtureName = "panel.vcf.gz" | "panel.nei" | "tetraploid.vcf.gz";

/** The statistics with a filter of popnei, in the order of the fixture's
    `filterKept`. */
type FilteredStatistic = "missingRate" | "maf" | "obsHet";

/** The numbers of one file of threshold_counts.json. */
interface Fixture {
  readonly part: VariantStatsPart;
  readonly missingGtRate: Float64Array;
  readonly obsHetRate: Float64Array;
  /** The variants each filter keeps at `THRESHOLDS`, in their order. */
  readonly filterKept: Readonly<Record<FilteredStatistic, readonly number[]>>;
}

/** The thresholds of popnei's filters in the fixture. */
const THRESHOLDS = [0.05, 0.1, 0.5] as const;

const parsed: unknown = JSON.parse(
  readFileSync(
    new URL("../../e2e/fixtures/threshold_counts.json", import.meta.url),
    "utf8",
  ),
);

/** The field `key` of `value`, or undefined when it has none. */
function field(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null || !(key in value)) {
    return undefined;
  }
  return Object.getOwnPropertyDescriptor(value, key)?.value;
}

/** The numbers of `value`, a list of numbers and nulls, a null as NaN. */
function numbersOf(value: unknown, what: string): number[] {
  if (!Array.isArray(value)) {
    throw new Error(`threshold_counts.json has no list ${what}`);
  }
  return value.map((one: unknown) => (typeof one === "number" ? one : NaN));
}

/** The numbers of `name` in threshold_counts.json. */
function fixture(name: FixtureName): Fixture {
  if (field(parsed, "numBins") !== 1280) {
    throw new Error("threshold_counts.json is not of 1,280 bins");
  }
  expect(field(parsed, "thresholds")).toEqual([...THRESHOLDS]);
  const file = field(parsed, name);
  const numVars = field(file, "numVars");
  if (typeof numVars !== "number") {
    throw new Error(`threshold_counts.json has no numVars of ${name}`);
  }
  const counts = field(file, "counts");
  const distrib = (statistic: VariantStatistic) => ({
    mean: NaN,
    counts: Uint32Array.from(
      numbersOf(field(counts, statistic), `${name} ${statistic}`),
    ),
  });
  const kept = field(file, "filterKept");
  const keptOf = (statistic: FilteredStatistic) =>
    numbersOf(field(kept, statistic), `${name} filterKept ${statistic}`);
  return {
    part: {
      binEdges: Float64Array.from(
        numbersOf(field(file, "binEdges"), `${name} binEdges`),
      ),
      missingRate: distrib("missingRate"),
      maf: distrib("maf"),
      obsHet: distrib("obsHet"),
      unbiasedExpHet: distrib("unbiasedExpHet"),
      passStats: { numVars, filtering: {} },
    },
    missingGtRate: Float64Array.from(
      numbersOf(field(file, "missingGtRate"), `${name} missingGtRate`),
    ),
    obsHetRate: Float64Array.from(
      numbersOf(field(file, "obsHetRate"), `${name} obsHetRate`),
    ),
    filterKept: {
      missingRate: keptOf("missingRate"),
      maf: keptOf("maf"),
      obsHet: keptOf("obsHet"),
    },
  };
}

/** Four bins over 0 to 1, with 1, 2, 3 and 4 variants of the missing
    rate and the MAF. Its objects are frozen; a typed array with elements
    cannot be. */
const SMALL: VariantStatsPart = Object.freeze({
  binEdges: Float64Array.from([0, 0.25, 0.5, 0.75, 1]),
  missingRate: { mean: 0.5, counts: Uint32Array.from([1, 2, 3, 4]) },
  maf: { mean: 0.5, counts: Uint32Array.from([1, 2, 3, 4]) },
  obsHet: { mean: 0.5, counts: Uint32Array.from([4, 0, 0, 0]) },
  unbiasedExpHet: { mean: 0.5, counts: Uint32Array.from([0, 0, 0, 0]) },
  passStats: deepFreeze({ numVars: 10, filtering: {} }),
});

describe("snapToFineEdge", () => {
  const edges = SMALL.binEdges;

  test.each([
    [0.3, 1, 0.25],
    [0.4, 2, 0.5],
    [0, 0, 0],
    [1, 4, 1],
    [0.75, 3, 0.75],
  ])("%s snaps to the edge %i, %s", (value, index, edge) => {
    expect(snapToFineEdge(edges, value)).toEqual({ index, value: edge });
  });

  test("of two edges as near, the higher", () => {
    expect(snapToFineEdge(edges, 0.375)).toEqual({ index: 2, value: 0.5 });
  });

  test("beyond the axis, the end of it", () => {
    expect(snapToFineEdge(edges, -0.2)).toEqual({ index: 0, value: 0 });
    expect(snapToFineEdge(edges, 1.5)).toEqual({ index: 4, value: 1 });
  });

  test("a value that is NaN or infinite is a defect", () => {
    expect(() => snapToFineEdge(edges, NaN)).toThrow(/popnei_web defect/);
    expect(() => snapToFineEdge(edges, Infinity)).toThrow(/popnei_web defect/);
  });

  test("edges fewer than two, or that do not go up, are a defect", () => {
    expect(() => snapToFineEdge(Float64Array.from([0]), 0)).toThrow(
      /popnei_web defect/,
    );
    expect(() => snapToFineEdge(Float64Array.from([0, 0.5, 0.5]), 0)).toThrow(
      /popnei_web defect/,
    );
  });

  test("on popnei's edges, the edge itself: 0.3 snaps to 0.30000000000000004, the edge 384", () => {
    const binEdges = fixture("panel.vcf.gz").part.binEdges;
    expect(snapToFineEdge(binEdges, 0.3)).toEqual({
      index: 384,
      value: 0.30000000000000004,
    });
    expect(snapToFineEdge(binEdges, 0.1)).toEqual({ index: 128, value: 0.1 });
    // Just below the middle of the edges 0.1 and 0.1 + 1/1280.
    expect(snapToFineEdge(binEdges, 0.1 + 0.39 / 1280)).toEqual({
      index: 128,
      value: 0.1,
    });
    expect(snapToFineEdge(binEdges, 0.1 + 0.61 / 1280).index).toBe(129);
  });

  test("popnei's edges are the double above k/1280 on 464 of the 1,281, as the comment of variantsAtMost says", () => {
    const binEdges = fixture("panel.vcf.gz").part.binEdges;
    const above = [...binEdges].filter((edge, k) => edge !== k / 1280);
    expect(binEdges.length).toBe(1281);
    expect(above.length).toBe(464);
    expect([...binEdges].every((edge, k) => edge >= k / 1280)).toBe(true);
  });
});

describe("variantsAtMost", () => {
  test.each([
    [0, 0, 10],
    [1, 1, 9],
    [2, 3, 7],
    [4, 10, 0],
  ])(
    "at the edge %i, the bins below it are kept, %i, and those from it on removed, %i",
    (index, kept, removed) => {
      expect(variantsAtMost(SMALL, "maf", index)).toEqual({ kept, removed });
    },
  );

  test("of the statistic asked for", () => {
    expect(variantsAtMost(SMALL, "obsHet", 1)).toEqual({
      kept: 4,
      removed: 0,
    });
    expect(variantsAtMost(SMALL, "unbiasedExpHet", 2)).toEqual({
      kept: 0,
      removed: 0,
    });
  });

  test("an edge that is not a whole number from 0 to the bins is a defect", () => {
    for (const index of [-1, 5, 1.5, NaN]) {
      expect(() => variantsAtMost(SMALL, "maf", index)).toThrow(
        /popnei_web defect/,
      );
    }
  });

  test("counts not one fewer than the edges are a defect", () => {
    const part = {
      ...SMALL,
      maf: { mean: 0.5, counts: Uint32Array.from([1, 2, 3]) },
    };
    expect(() => variantsAtMost(part, "maf", 1)).toThrow(/popnei_web defect/);
  });

  test.each(["panel.vcf.gz", "panel.nei", "tetraploid.vcf.gz"] as const)(
    "%s: at every edge, kept and removed add up to the variants, kept never falling",
    (name) => {
      const { part } = fixture(name);
      for (const statistic of [
        "missingRate",
        "maf",
        "obsHet",
        "unbiasedExpHet",
      ] as const) {
        let before = 0;
        for (let index = 0; index <= 1280; index += 1) {
          const { kept, removed } = variantsAtMost(part, statistic, index);
          expect(kept + removed).toBe(part.passStats.numVars);
          expect(kept).toBeGreaterThanOrEqual(before);
          before = kept;
        }
      }
    },
  );

  test.each(["panel.vcf.gz", "panel.nei"] as const)(
    "%s: the missing rate at 0.05 keeps 1,113 and removes 87; at 0 keeps none, the 2 at 0 being on the edge; at 1 and beyond keeps the 1,200",
    (name) => {
      const { part } = fixture(name);
      const at = (value: number) =>
        variantsAtMost(
          part,
          "missingRate",
          snapToFineEdge(part.binEdges, value).index,
        );
      expect(at(0.05)).toEqual({ kept: 1113, removed: 87 });
      expect(at(0)).toEqual({ kept: 0, removed: 1200 });
      expect(at(1)).toEqual({ kept: 1200, removed: 0 });
      expect(at(3)).toEqual({ kept: 1200, removed: 0 });
    },
  );

  test("tetraploid.vcf.gz: the MAF at 0.5 keeps 193 of 200", () => {
    const { part } = fixture("tetraploid.vcf.gz");
    const edge = snapToFineEdge(part.binEdges, 0.5);
    expect(variantsAtMost(part, "maf", edge.index)).toEqual({
      kept: 193,
      removed: 7,
    });
  });
});

describe("individualsAtMost", () => {
  const values = Float64Array.from([0, 0.1, 0.2, NaN, 0.1]);

  test.each([
    [0.1, 3, 1],
    [0, 1, 3],
    [0.15, 3, 1],
    [1, 4, 0],
    [-1, 0, 4],
    [5, 4, 0],
  ])(
    "at %s, %i kept and %i removed, the NaN in neither",
    (threshold, kept, removed) => {
      expect(individualsAtMost(values, threshold)).toEqual({ kept, removed });
    },
  );

  test("every value NaN: none kept and none removed", () => {
    expect(individualsAtMost(Float64Array.from([NaN, NaN]), 0.5)).toEqual({
      kept: 0,
      removed: 0,
    });
  });

  test("a threshold that is NaN is a defect", () => {
    expect(() => individualsAtMost(values, NaN)).toThrow(/popnei_web defect/);
  });

  test.each(["panel.vcf.gz", "panel.nei"] as const)(
    "%s: popnei's values, a threshold on a value keeps it",
    (name) => {
      const { missingGtRate, obsHetRate } = fixture(name);
      // The missing rate of s000, which 12 individuals have.
      expect(individualsAtMost(missingGtRate, 0.028333333333333332)).toEqual({
        kept: 89,
        removed: 111,
      });
      expect(individualsAtMost(missingGtRate, 0.03)).toEqual({
        kept: 116,
        removed: 84,
      });
      expect(individualsAtMost(obsHetRate, 0.35)).toEqual({
        kept: 73,
        removed: 127,
      });
    },
  );

  test("tetraploid.vcf.gz: the missing rate at 0.05 keeps the 3 at 0.05, 8 of 12", () => {
    const { missingGtRate, obsHetRate } = fixture("tetraploid.vcf.gz");
    expect(individualsAtMost(missingGtRate, 0.05)).toEqual({
      kept: 8,
      removed: 4,
    });
    expect(individualsAtMost(obsHetRate, 0.5)).toEqual({
      kept: 0,
      removed: 12,
    });
  });
});

describe("the measurement: the variants the bins keep against popnei's filters", () => {
  /** The count from the bins, popnei's filter, and the variants the bins
      leave out, filter minus bins, at 0.05, 0.1 and 0.5, as found on 7
      October 2026 with popnei 0.2.1. The three thresholds are edges equal
      to k/1280, where the bins leave out the variants on the edge. */
  const FOUND: Readonly<
    Record<
      "panel.vcf.gz" | "tetraploid.vcf.gz",
      Readonly<
        Record<
          FilteredStatistic,
          readonly (readonly [number, number, number])[]
        >
      >
    >
  > = {
    "panel.vcf.gz": {
      missingRate: [
        [1113, 1152, 39],
        [1200, 1200, 0],
        [1200, 1200, 0],
      ],
      maf: [
        [0, 0, 0],
        [0, 0, 0],
        [0, 3, 3],
      ],
      obsHet: [
        [4, 4, 0],
        [31, 31, 0],
        [1090, 1098, 8],
      ],
    },
    "tetraploid.vcf.gz": {
      missingRate: [
        [115, 115, 0],
        [175, 175, 0],
        [200, 200, 0],
      ],
      maf: [
        [0, 0, 0],
        [0, 0, 0],
        [193, 196, 3],
      ],
      obsHet: [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
    },
  };

  test.each(["panel.vcf.gz", "tetraploid.vcf.gz"] as const)("%s", (name) => {
    const { part, filterKept } = fixture(name);
    const measured = Object.fromEntries(
      (["missingRate", "maf", "obsHet"] as const).map((statistic) => [
        statistic,
        THRESHOLDS.map((threshold, i) => {
          const edge = snapToFineEdge(part.binEdges, threshold);
          const { kept } = variantsAtMost(part, statistic, edge.index);
          const filter = filterKept[statistic][i] ?? NaN;
          return [kept, filter, filter - kept];
        }),
      ]),
    );
    expect(measured).toEqual(FOUND[name]);
  });
});
