/**
 * The counts of the thresholds (docs/plans/thresholds.md, "The phases",
 * 1). The numbers of popnei are those of
 * e2e/fixtures/threshold_counts.json, which make_fixtures.mjs wrote with
 * popnei 0.2.1 under node on 7 October 2026, since the tests of core may
 * not call popnei: the edges and the counts of the 1,280 fine bins of
 * calcVariantsSummary, the values of each individual of that pass, and
 * the variants that popnei's filters keep at 0.05, 0.1, 0.3 and 0.5,
 * at the edges off k/1280 and at numbers of two and three decimals.
 */
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import type { VariantStatistic } from "./analyses/variantChecks.ts";
import { deepFreeze } from "./testSupport.ts";
import {
  individualsAtMost,
  thresholdOnStep,
  thresholdStep,
  variantsAtMost,
} from "./thresholds.ts";
import type { VariantStatsPart } from "../worker/protocol.ts";
import { INSTALLED_POPNEI_VERSION } from "../worker/testSupport.ts";

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
  /** The variants each filter keeps at `roundNumbers`, in their order. */
  readonly filterKeptRound: Readonly<
    Record<FilteredStatistic, readonly number[]>
  >;
  /** The variants whose value is at most each of `AT_MOST_NUMBERS`, by
      popnei's histogram of one bin over 0 to it, in their order. */
  readonly histKeptAtMost: Readonly<
    Record<VariantStatistic, readonly number[]>
  >;
}

/** The thresholds of popnei's filters in the fixture: 0.3 on an edge
    one double above 384/1280, the others on edges equal to k/1280. */
const THRESHOLDS = [0.05, 0.1, 0.3, 0.5] as const;

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
  // A fixture of another popnei holds numbers the page would not show.
  expect(field(parsed, "popnei")).toBe(INSTALLED_POPNEI_VERSION);
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
  const round = field(file, "filterKeptRound");
  const roundOf = (statistic: FilteredStatistic) =>
    numbersOf(field(round, statistic), `${name} filterKeptRound ${statistic}`);
  const histKept = field(file, "histKeptAtMost");
  const histOf = (statistic: VariantStatistic) =>
    numbersOf(
      field(histKept, statistic),
      `${name} histKeptAtMost ${statistic}`,
    );
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
    filterKeptRound: {
      missingRate: roundOf("missingRate"),
      maf: roundOf("maf"),
      obsHet: roundOf("obsHet"),
    },
    histKeptAtMost: {
      missingRate: histOf("missingRate"),
      maf: histOf("maf"),
      obsHet: histOf("obsHet"),
      unbiasedExpHet: histOf("unbiasedExpHet"),
    },
  };
}

/** The numbers of two and three decimals at which the fixture has
    popnei's filters, `filterKeptRound`. */
const ROUND_NUMBERS = numbersOf(field(parsed, "roundNumbers"), "roundNumbers");

/** Every multiple of 0.001 and every k/1280 from 0 to 1 but 0, at which
    the fixture has popnei's count of the values at most each,
    `histKeptAtMost`. */
const AT_MOST_NUMBERS = numbersOf(
  field(parsed, "atMostNumbers"),
  "atMostNumbers",
);

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

describe("thresholdStep", () => {
  test.each([
    [0, 1, 0.01, 2],
    [0, 0.1, 0.001, 3],
    [0.32, 0.4, 0.001, 3],
    [0.35, 0.5, 0.01, 2],
    [0, 0.05, 0.001, 3],
    [0.002, 0.004, 0.0001, 4],
    [0.2, 0.30000000000000004, 0.001, 3],
    // Spans a subtraction leaves just above a power of ten: 0.8 − 0.7 is
    // 0.10000000000000009, 0.07 − 0.06 0.010000000000000002.
    [0.7, 0.8, 0.001, 3],
    [0.06, 0.07, 0.0001, 4],
    [0, 10, 0.1, 1],
    [0, 100, 1, 0],
    [0, 1000, 10, 0],
  ])("over %s to %s, %s, %i decimals", (low, high, step, decimals) => {
    expect(thresholdStep(low, high)).toEqual({ step, decimals });
  });

  test("an axis of no span, or not finite, is a defect", () => {
    for (const [low, high] of [
      [0.5, 0.5],
      [1, 0],
      [0, NaN],
      [0, Infinity],
    ] as const) {
      expect(() => thresholdStep(low, high)).toThrow(/popnei_web defect/);
    }
  });
});

describe("thresholdOnStep", () => {
  test.each([
    [0.0734, 2, 0.07],
    [0.075, 2, 0.08],
    [0.145, 2, 0.15],
    [0.1 + 0.2, 2, 0.3],
    [0.0349, 3, 0.035],
    [0.52, 2, 0.52],
    [1, 2, 1],
    [0, 3, 0],
    [1e-7, 3, 0],
  ])("%s with %i decimals is %s", (value, decimals, rounded) => {
    expect(thresholdOnStep(value, decimals)).toBe(rounded);
  });

  test("a value that is NaN or infinite is a defect", () => {
    expect(() => thresholdOnStep(NaN, 2)).toThrow(/popnei_web defect/);
    expect(() => thresholdOnStep(Infinity, 2)).toThrow(/popnei_web defect/);
  });
});

describe("popnei's edges", () => {
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
    [0, 0, 1],
    [1, 1, 3],
    [2, 3, 6],
    [3, 6, 10],
  ])(
    "on the edge %i, equal to k/4, from the bins below it, %i, to those and the bin that starts at it, %i",
    (index, keptLow, keptHigh) => {
      expect(variantsAtMost(SMALL, "maf", index / 4)).toEqual({
        keptLow,
        keptHigh,
        withValue: 10,
      });
    },
  );

  test.each([
    [0.1, 0, 1],
    [0.3, 1, 3],
    [0.6, 3, 6],
    [0.99, 6, 10],
  ])(
    "at %s, inside a bin, from the bins below it, %i, to those and the bin, %i",
    (value, keptLow, keptHigh) => {
      expect(variantsAtMost(SMALL, "maf", value)).toEqual({
        keptLow,
        keptHigh,
        withValue: 10,
      });
    },
  );

  test("inside an empty bin, one number", () => {
    expect(variantsAtMost(SMALL, "obsHet", 0.3)).toEqual({
      keptLow: 4,
      keptHigh: 4,
      withValue: 4,
    });
  });

  test("below the first edge none, at or above the last every one", () => {
    expect(variantsAtMost(SMALL, "maf", -0.1)).toEqual({
      keptLow: 0,
      keptHigh: 0,
      withValue: 10,
    });
    for (const value of [1, 1.5]) {
      expect(variantsAtMost(SMALL, "maf", value)).toEqual({
        keptLow: 10,
        keptHigh: 10,
        withValue: 10,
      });
    }
  });

  test("on the top edge, every variant with a value, one number", () => {
    expect(variantsAtMost(SMALL, "maf", 1)).toEqual({
      keptLow: 10,
      keptHigh: 10,
      withValue: 10,
    });
  });

  test("of the statistic asked for", () => {
    expect(variantsAtMost(SMALL, "obsHet", 0.25)).toEqual({
      keptLow: 4,
      keptHigh: 4,
      withValue: 4,
    });
    expect(variantsAtMost(SMALL, "unbiasedExpHet", 0.5)).toEqual({
      keptLow: 0,
      keptHigh: 0,
      withValue: 0,
    });
  });

  /** SMALL with its edge 1 the double above 1/4, as popnei's edge 384 is
      above 384/1280. */
  const ABOVE: VariantStatsPart = Object.freeze({
    ...SMALL,
    binEdges: Float64Array.from([0, 0.25 + 2 ** -54, 0.5, 0.75, 1]),
    unbiasedExpHet: { mean: 0.5, counts: Uint32Array.from([1, 2, 3, 4]) },
  });

  test("at k/4, below an edge the double above it, one number for every statistic: a value of k/4 lies in the bin to the left", () => {
    expect(ABOVE.binEdges[1]).not.toBe(1 / 4);
    for (const statistic of ["missingRate", "maf", "unbiasedExpHet"] as const) {
      expect(variantsAtMost(ABOVE, statistic, 0.25)).toEqual({
        keptLow: 1,
        keptHigh: 1,
        withValue: 10,
      });
    }
  });

  test("on that edge itself, a range for every statistic: a value on it is in the bin that starts at it", () => {
    const edge = ABOVE.binEdges[1] ?? NaN;
    for (const statistic of ["missingRate", "maf", "unbiasedExpHet"] as const) {
      expect(variantsAtMost(ABOVE, statistic, edge)).toEqual({
        keptLow: 1,
        keptHigh: 3,
        withValue: 10,
      });
    }
  });

  test("a threshold that is NaN or infinite is a defect", () => {
    for (const value of [NaN, Infinity, -Infinity]) {
      expect(() => variantsAtMost(SMALL, "maf", value)).toThrow(
        /popnei_web defect/,
      );
    }
  });

  test("edges fewer than two, or that do not go up, are a defect", () => {
    for (const edges of [[0], [0, 0.5, 0.5, 0.75, 1]]) {
      const part = { ...SMALL, binEdges: Float64Array.from(edges) };
      expect(() => variantsAtMost(part, "maf", 0.1)).toThrow(
        /popnei_web defect/,
      );
    }
  });

  test("counts not one fewer than the edges are a defect", () => {
    const part = {
      ...SMALL,
      maf: { mean: 0.5, counts: Uint32Array.from([1, 2, 3]) },
    };
    expect(() => variantsAtMost(part, "maf", 0.25)).toThrow(
      /popnei_web defect/,
    );
  });

  test.each(["panel.vcf.gz", "panel.nei", "tetraploid.vcf.gz"] as const)(
    "%s: at every edge, low at most high, both at most the variants, neither falling",
    (name) => {
      const { part } = fixture(name);
      for (const statistic of [
        "missingRate",
        "maf",
        "obsHet",
        "unbiasedExpHet",
      ] as const) {
        let before = { keptLow: 0, keptHigh: 0 };
        for (let index = 0; index <= 1280; index += 1) {
          const counts = variantsAtMost(part, statistic, index / 1280);
          expect(counts.withValue).toBe(part.passStats.numVars);
          expect(counts.keptLow).toBeLessThanOrEqual(counts.keptHigh);
          expect(counts.keptHigh).toBeLessThanOrEqual(counts.withValue);
          expect(counts.keptLow).toBeGreaterThanOrEqual(before.keptLow);
          expect(counts.keptHigh).toBeGreaterThanOrEqual(before.keptHigh);
          before = counts;
        }
      }
    },
  );

  test.each(["panel.vcf.gz", "panel.nei"] as const)(
    "%s: the missing rate at 0.05 keeps 1,113 to 1,152; at 0.3 one number; at 0 none to the 2 at 0; at 1 and beyond the 1,200",
    (name) => {
      const { part } = fixture(name);
      const at = (value: number) => variantsAtMost(part, "missingRate", value);
      expect(at(0.05)).toEqual({
        keptLow: 1113,
        keptHigh: 1152,
        withValue: 1200,
      });
      expect(at(0.3)).toEqual({
        keptLow: 1200,
        keptHigh: 1200,
        withValue: 1200,
      });
      expect(at(0)).toEqual({ keptLow: 0, keptHigh: 2, withValue: 1200 });
      expect(at(1)).toEqual({ keptLow: 1200, keptHigh: 1200, withValue: 1200 });
      expect(at(3)).toEqual({ keptLow: 1200, keptHigh: 1200, withValue: 1200 });
    },
  );

  test("panel.vcf.gz: at 0.3, below popnei's edge 0.30000000000000004, one number for the observed heterozygosity, 373, and for the expected, 311", () => {
    const { part } = fixture("panel.vcf.gz");
    expect(variantsAtMost(part, "obsHet", 0.3)).toEqual({
      keptLow: 373,
      keptHigh: 373,
      withValue: 1200,
    });
    expect(variantsAtMost(part, "unbiasedExpHet", 0.3)).toEqual({
      keptLow: 311,
      keptHigh: 311,
      withValue: 1200,
    });
  });

  test("tetraploid.vcf.gz: the MAF at 0.5 keeps 193 to 196 of 200", () => {
    const { part } = fixture("tetraploid.vcf.gz");
    expect(variantsAtMost(part, "maf", 0.5)).toEqual({
      keptLow: 193,
      keptHigh: 196,
      withValue: 200,
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
    "at %s, %i kept and %i removed, the NaN with no value",
    (threshold, kept, removed) => {
      expect(individualsAtMost(values, threshold)).toEqual({
        kept,
        removed,
        noValue: 1,
      });
    },
  );

  test("every value NaN: none kept and none removed, both with no value", () => {
    expect(individualsAtMost(Float64Array.from([NaN, NaN]), 0.5)).toEqual({
      kept: 0,
      removed: 0,
      noValue: 2,
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
        noValue: 0,
      });
      expect(individualsAtMost(missingGtRate, 0.03)).toEqual({
        kept: 116,
        removed: 84,
        noValue: 0,
      });
      expect(individualsAtMost(obsHetRate, 0.35)).toEqual({
        kept: 73,
        removed: 127,
        noValue: 0,
      });
    },
  );

  test("tetraploid.vcf.gz: the missing rate at 0.05 keeps the 3 at 0.05, 8 of 12", () => {
    const { missingGtRate, obsHetRate } = fixture("tetraploid.vcf.gz");
    expect(individualsAtMost(missingGtRate, 0.05)).toEqual({
      kept: 8,
      removed: 4,
      noValue: 0,
    });
    expect(individualsAtMost(obsHetRate, 0.5)).toEqual({
      kept: 0,
      removed: 12,
      noValue: 0,
    });
  });
});

describe("the range against popnei's filters", () => {
  /** At each of `THRESHOLDS`, the range of variantsAtMost and what
      popnei's filter keeps, [keptLow, keptHigh, filter], as found on 7
      October 2026 with popnei 0.2.1. */
  type Found = Readonly<
    Record<FilteredStatistic, readonly (readonly [number, number, number])[]>
  >;
  const PANEL: Found = {
    missingRate: [
      [1113, 1152, 1152],
      [1200, 1200, 1200],
      [1200, 1200, 1200],
      [1200, 1200, 1200],
    ],
    maf: [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 3, 3],
    ],
    obsHet: [
      [4, 4, 4],
      [31, 31, 31],
      [373, 373, 373],
      [1090, 1098, 1098],
    ],
  };
  const FOUND: Readonly<Record<FixtureName, Found>> = {
    "panel.vcf.gz": PANEL,
    "panel.nei": PANEL,
    "tetraploid.vcf.gz": {
      missingRate: [
        [115, 115, 115],
        [175, 175, 175],
        [200, 200, 200],
        [200, 200, 200],
      ],
      maf: [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        [193, 196, 196],
      ],
      obsHet: [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
    },
  };

  test.each(["panel.vcf.gz", "panel.nei", "tetraploid.vcf.gz"] as const)(
    "%s: popnei's filter keeps a number in the range, the number itself where the range is one",
    (name) => {
      const { part, filterKept } = fixture(name);
      const measured = Object.fromEntries(
        (["missingRate", "maf", "obsHet"] as const).map((statistic) => [
          statistic,
          THRESHOLDS.map((threshold, i) => {
            const { keptLow, keptHigh } = variantsAtMost(
              part,
              statistic,
              threshold,
            );
            const filter = filterKept[statistic][i] ?? NaN;
            expect(filter).toBeGreaterThanOrEqual(keptLow);
            expect(filter).toBeLessThanOrEqual(keptHigh);
            if (keptLow === keptHigh) expect(filter).toBe(keptLow);
            return [keptLow, keptHigh, filter];
          }),
        ]),
      );
      expect(measured).toEqual(FOUND[name]);
    },
  );
});

describe("the count at numbers of two and three decimals against popnei's filters", () => {
  test.each(["panel.vcf.gz", "panel.nei", "tetraploid.vcf.gz"] as const)(
    "%s: popnei's filter keeps a number in the range at each, the number itself where the range is one",
    (name) => {
      const { part, filterKeptRound } = fixture(name);
      expect(ROUND_NUMBERS).toHaveLength(267);
      let ranges = 0;
      for (const statistic of ["missingRate", "maf", "obsHet"] as const) {
        const kept = filterKeptRound[statistic];
        expect(kept).toHaveLength(ROUND_NUMBERS.length);
        for (const [i, number] of ROUND_NUMBERS.entries()) {
          const { keptLow, keptHigh } = variantsAtMost(part, statistic, number);
          const filter = kept[i] ?? NaN;
          expect(filter).toBeGreaterThanOrEqual(keptLow);
          expect(filter).toBeLessThanOrEqual(keptHigh);
          if (keptLow === keptHigh) expect(filter).toBe(keptLow);
          else ranges += 1;
        }
      }
      // Ranges there are, so the test checks both kinds.
      expect(ranges).toBeGreaterThan(0);
    },
  );

  test("panel.vcf.gz: inside a fine bin, the missing rate at 0.07 keeps 1,197 to 1,199 (popnei 1,199), the MAF at 0.52 49 to 51 (popnei 49), the observed heterozygosity at 0.33 443 to 444 (popnei 444); inside an empty bin, the missing rate at 0.012 keeps 81, one number", () => {
    const { part } = fixture("panel.vcf.gz");
    expect(variantsAtMost(part, "missingRate", 0.07)).toEqual({
      keptLow: 1197,
      keptHigh: 1199,
      withValue: 1200,
    });
    expect(variantsAtMost(part, "maf", 0.52)).toEqual({
      keptLow: 49,
      keptHigh: 51,
      withValue: 1200,
    });
    expect(variantsAtMost(part, "obsHet", 0.33)).toEqual({
      keptLow: 443,
      keptHigh: 444,
      withValue: 1200,
    });
    expect(variantsAtMost(part, "missingRate", 0.012)).toEqual({
      keptLow: 81,
      keptHigh: 81,
      withValue: 1200,
    });
  });
});

describe("the count against popnei's histogram of one bin over 0 to the threshold", () => {
  test.each(["panel.vcf.gz", "panel.nei", "tetraploid.vcf.gz"] as const)(
    "%s: at every 0.001 and every k/1280, for the four statistics, popnei's count of the values at most it is in the range, the number itself where the range is one",
    (name) => {
      const { part, histKeptAtMost } = fixture(name);
      expect(AT_MOST_NUMBERS).toHaveLength(2240);
      let ranges = 0;
      for (const statistic of [
        "missingRate",
        "maf",
        "obsHet",
        "unbiasedExpHet",
      ] as const) {
        const kept = histKeptAtMost[statistic];
        expect(kept).toHaveLength(AT_MOST_NUMBERS.length);
        for (const [i, number] of AT_MOST_NUMBERS.entries()) {
          const { keptLow, keptHigh } = variantsAtMost(part, statistic, number);
          const popnei = kept[i] ?? NaN;
          expect(popnei).toBeGreaterThanOrEqual(keptLow);
          expect(popnei).toBeLessThanOrEqual(keptHigh);
          if (keptLow === keptHigh) expect(popnei).toBe(keptLow);
          else ranges += 1;
        }
      }
      expect(ranges).toBeGreaterThan(0);
    },
  );

  test("panel.vcf.gz: the expected heterozygosity at k/1280 below popnei's edge is one number, the count of popnei's histogram, at the 464 such numbers", () => {
    const { part, histKeptAtMost } = fixture("panel.vcf.gz");
    let below = 0;
    for (const [i, number] of AT_MOST_NUMBERS.entries()) {
      const k = Math.round(number * 1280);
      if (k / 1280 !== number || part.binEdges[k] === number) continue;
      const counts = variantsAtMost(part, "unbiasedExpHet", number);
      expect(counts.keptLow).toBe(counts.keptHigh);
      expect(counts.keptLow).toBe(histKeptAtMost.unbiasedExpHet[i]);
      below += 1;
    }
    expect(below).toBe(464);
  });
});
