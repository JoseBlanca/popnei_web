/**
 * The tests of the panel's functions of the LD decay in core
 * (docs/specs/analyses/ldDecay.md, "What it shows", "Its words" and
 * "Accessibility"): the rows and the CSVs of the two tables, the half
 * distance as the legend and the table write it, the labels of the
 * legend, and the description of the plot. The results are written as
 * literals, of two populations that differ in every number, so that a
 * population read at the index of the other fails; the flow's numbers are
 * popnei's, as the spec gives them.
 */

import { describe, expect, test } from "vitest";
import {
  halfDistText,
  ldBinRows,
  ldBinsCsv,
  ldDecayCsv,
  ldDecayDescription,
  ldDecayRows,
  ldLegendLabel,
  threeSignificant,
} from "./ldDecay.ts";
import type { LdDecayResult } from "../../worker/protocol.ts";

const NAN = Number.NaN;

/** One population of a result written as a literal, its bins in their
    order. */
interface PopOf {
  readonly name: string;
  readonly individuals: number;
  readonly variants: number;
  readonly pairs: readonly number[];
  readonly meanR2: readonly number[];
  readonly sdR2: readonly number[];
  readonly rhoPerBp: number;
  readonly r2AtZero: number;
  readonly halfDist: number;
}

/** A result of the populations `pops` over the bins from `smallest` to
    `largest`, the variants of the pass 150. */
function resultOf(
  pops: readonly PopOf[],
  smallest: readonly number[],
  largest: readonly number[],
): LdDecayResult {
  return {
    analysis: "ldDecay",
    pops: pops.map((pop) => pop.name),
    numIndividuals: Uint32Array.from(pops.map((pop) => pop.individuals)),
    numVars: Float64Array.from(pops.map((pop) => pop.variants)),
    smallestDist: Float64Array.from(smallest),
    largestDist: Float64Array.from(largest),
    numPairs: Float64Array.from(pops.flatMap((pop) => pop.pairs)),
    meanR2: Float64Array.from(pops.flatMap((pop) => pop.meanR2)),
    sdR2: Float64Array.from(pops.flatMap((pop) => pop.sdR2)),
    rhoPerBp: Float64Array.from(pops.map((pop) => pop.rhoPerBp)),
    r2AtZero: Float64Array.from(pops.map((pop) => pop.r2AtZero)),
    halfDist: Float64Array.from(pops.map((pop) => pop.halfDist)),
    passStats: { numVars: 150, filtering: {} },
  };
}

/** `pop_a` of the small result: 30 individuals, 120 variants, 20 pairs in
    the bins 1, 3 and 4, a half distance of 412.6 bp. */
const POP_A: PopOf = {
  name: "pop_a",
  individuals: 30,
  variants: 120,
  pairs: [10, 0, 7, 3],
  meanR2: [0.41, NAN, 0.22, 0.13],
  sdR2: [0.2, NAN, 0.11, 0.05],
  rhoPerBp: 0.0021,
  r2AtZero: 0.4,
  halfDist: 412.6,
};

/** `pop_b` of the small result, every number other than `pop_a`'s: 12
    pairs in the bins 1, 2 and 4, a half distance of 8.3456 bp. */
const POP_B: PopOf = {
  name: "pop_b",
  individuals: 45,
  variants: 98,
  pairs: [4, 6, 0, 2],
  meanR2: [0.35, 0.28, NAN, 0.09],
  sdR2: [0.15, 0.12, NAN, 0.04],
  rhoPerBp: 0.0034,
  r2AtZero: 0.37,
  halfDist: 8.3456,
};

/** The four bins of the small result, up to 1,000 bp. */
const SMALLEST = [1, 251, 501, 751];
const LARGEST = [250, 500, 750, 1000];

/** The small result: `pop_a` and `pop_b` in four bins up to 1,000 bp. */
function smallResult(): LdDecayResult {
  return resultOf([POP_A, POP_B], SMALLEST, LARGEST);
}

/** A population of the small result, `pop_a`'s bins, named `name`, with
    the half distance `halfDist` and, when `pairs` is 0, no pair at all. */
function popOf(name: string, halfDist: number, pairs = 1): PopOf {
  return {
    ...POP_A,
    name,
    halfDist,
    pairs: POP_A.pairs.map((count) => (pairs === 0 ? 0 : count)),
    rhoPerBp: Number.isNaN(halfDist) ? NAN : POP_A.rhoPerBp,
    r2AtZero: Number.isNaN(halfDist) ? NAN : POP_A.r2AtZero,
  };
}

/** The 50 bins of the flow, from 1 to 2,000 bp, 2,001 to 4,000, and so
    on up to 100,000. */
const FLOW_SMALLEST = Array.from({ length: 50 }, (_, bin) => bin * 2000 + 1);
const FLOW_LARGEST = Array.from({ length: 50 }, (_, bin) => (bin + 1) * 2000);

/** The result of the flow as the plot's description reads it: the half
    distances of popnei's `pop_a` and `pop_b` of ld.nei at 100,000 bp,
    every bin with pairs. */
function flowResult(): LdDecayResult {
  const flowPop = (
    name: string,
    rhoPerBp: number,
    halfDist: number,
  ): PopOf => ({
    name,
    individuals: 50,
    variants: 432,
    pairs: FLOW_SMALLEST.map(() => 587),
    meanR2: FLOW_SMALLEST.map(() => 0.1),
    sdR2: FLOW_SMALLEST.map(() => 0.1),
    rhoPerBp,
    r2AtZero: 0.46942148760330576,
    halfDist,
  });
  return resultOf(
    [
      flowPop("pop_a", 0.00029996668947275404, 7548.08187836982),
      flowPop("pop_b", 0.00030848266256738914, 7339.709512618931),
    ],
    FLOW_SMALLEST,
    FLOW_LARGEST,
  );
}

describe("PA8 D1 ldDecayRows and ldBinRows", () => {
  test("ldDecayRows gives each population its own numbers, its pairs the sum of its bins, null for NaN", () => {
    expect(ldDecayRows(smallResult())).toEqual([
      {
        population: "pop_a",
        individuals: 30,
        variants: 120,
        pairs: 20,
        halfDist: 412.6,
        r2AtZero: 0.4,
        rhoPerBp: 0.0021,
      },
      {
        population: "pop_b",
        individuals: 45,
        variants: 98,
        pairs: 12,
        halfDist: 8.3456,
        r2AtZero: 0.37,
        rhoPerBp: 0.0034,
      },
    ]);
    const noCurve = resultOf([POP_A, popOf("pop_c", NAN)], SMALLEST, LARGEST);
    expect(ldDecayRows(noCurve)[1]).toEqual({
      population: "pop_c",
      individuals: 30,
      variants: 120,
      pairs: 20,
      halfDist: null,
      r2AtZero: null,
      rhoPerBp: null,
    });
  });

  test("ldBinRows gives the bins of each population together, the distances of each bin shared, null for a bin with no pair", () => {
    const rows = ldBinRows(smallResult());
    expect(rows).toHaveLength(8);
    expect(rows[1]).toEqual({
      population: "pop_a",
      from: 251,
      to: 500,
      pairs: 0,
      meanR2: null,
      sdR2: null,
    });
    expect(rows[3]).toEqual({
      population: "pop_a",
      from: 751,
      to: 1000,
      pairs: 3,
      meanR2: 0.13,
      sdR2: 0.05,
    });
    expect(rows[5]).toEqual({
      population: "pop_b",
      from: 251,
      to: 500,
      pairs: 6,
      meanR2: 0.28,
      sdR2: 0.12,
    });
    expect(rows[6]).toEqual({
      population: "pop_b",
      from: 501,
      to: 750,
      pairs: 0,
      meanR2: null,
      sdR2: null,
    });
  });
});

describe("PA8 D1 ldDecayCsv and ldBinsCsv", () => {
  test("ldDecayCsv writes a row per population with its own numbers, every digit, an empty cell for no curve", () => {
    const r = resultOf([POP_A, POP_B, popOf("pop,c", NAN)], SMALLEST, LARGEST);
    expect(ldDecayCsv(r)).toBe(
      "population,individuals,variants,pairs,half_distance_bp,r2_at_distance_0,rho_per_bp\n" +
        "pop_a,30,120,20,412.6,0.4,0.0021\n" +
        "pop_b,45,98,12,8.3456,0.37,0.0034\n" +
        '"pop,c",30,120,20,,,\n',
    );
  });

  test("ldBinsCsv writes a row per population and bin, each population's bins its own, an empty cell for a bin with no pair", () => {
    expect(ldBinsCsv(smallResult())).toBe(
      "population,smallest_dist,largest_dist,num_pairs,mean_r2,sd_r2\n" +
        "pop_a,1,250,10,0.41,0.2\n" +
        "pop_a,251,500,0,,\n" +
        "pop_a,501,750,7,0.22,0.11\n" +
        "pop_a,751,1000,3,0.13,0.05\n" +
        "pop_b,1,250,4,0.35,0.15\n" +
        "pop_b,251,500,6,0.28,0.12\n" +
        "pop_b,501,750,0,,\n" +
        "pop_b,751,1000,2,0.09,0.04\n",
    );
  });
});

describe("PA8 D1 the half distance as the legend and the table write it", () => {
  test("below 10 bp to three significant digits, from 10 bp in whole base pairs with commas, 9.996 counting as 10", () => {
    expect(halfDistText(0.24712)).toBe("0.247");
    expect(halfDistText(8.3456)).toBe("8.35");
    expect(halfDistText(9.994)).toBe("9.99");
    expect(halfDistText(9.996)).toBe("10");
    expect(halfDistText(10)).toBe("10");
    expect(halfDistText(7548.08187836982)).toBe("7,548");
    expect(halfDistText(7339.709512618931)).toBe("7,340");
    expect(halfDistText(1599810.0655818006)).toBe("1,599,810");
  });

  test("threeSignificant keeps the zeros of three digits and writes no exponent", () => {
    expect(threeSignificant(0.00029996668947275404)).toBe("0.000300");
    expect(threeSignificant(0.00030848266256738914)).toBe("0.000308");
    expect(threeSignificant(3e-7)).toBe("0.000000300");
    expect(threeSignificant(1.5)).toBe("1.50");
    expect(threeSignificant(0)).toBe("0.00");
  });
});

describe("PA8 D1 the labels of the legend", () => {
  test("a half distance within the plot, in whole base pairs from 10 and to three significant digits below, each population its own", () => {
    const r = smallResult();
    expect(ldLegendLabel(r, 0, 1000)).toBe("pop_a · half at 413 bp");
    expect(ldLegendLabel(r, 1, 1000)).toBe("pop_b · half at 8.35 bp");
    expect(ldLegendLabel(flowResult(), 0, 100_000)).toBe(
      "pop_a · half at 7,548 bp",
    );
    expect(ldLegendLabel(flowResult(), 1, 100_000)).toBe(
      "pop_b · half at 7,340 bp",
    );
    const below = resultOf([popOf("pop_a", 0.24712)], SMALLEST, LARGEST);
    expect(ldLegendLabel(below, 0, 1000)).toBe("pop_a · half at 0.247 bp");
  });

  test("a half distance beyond the largest distance, pairs with no curve, and no pair, and a half distance at the largest distance within the plot", () => {
    const r = resultOf(
      [
        popOf("pop_a", 1599810.0655818006),
        popOf("pop_b", NAN),
        popOf("pop_c", NAN, 0),
        popOf("pop_d", 1000),
      ],
      SMALLEST,
      LARGEST,
    );
    expect([0, 1, 2, 3].map((i) => ldLegendLabel(r, i, 1000))).toEqual([
      "pop_a · half at 1,599,810 bp, beyond the plot",
      "pop_b · no curve",
      "pop_c · no pair",
      "pop_d · half at 1,000 bp",
    ]);
  });

  test("PA10 a name of 16 characters is whole, and one of 17 is cut after 15 with an ellipsis, in each kind of label", () => {
    const sixteen = "Solanum_pimpinel";
    const longer = "Solanum_pimpinellifolium_from_N_Ecuador_a";
    const r = resultOf(
      [
        popOf(sixteen, 412.6),
        popOf("Solanum_pimpinell", 412.6),
        popOf(longer, 1599810.0655818006),
        popOf(longer + "b", NAN),
        popOf(longer + "c", NAN, 0),
      ],
      SMALLEST,
      LARGEST,
    );
    expect([0, 1, 2, 3, 4].map((i) => ldLegendLabel(r, i, 1000))).toEqual([
      "Solanum_pimpinel · half at 413 bp",
      "Solanum_pimpine… · half at 413 bp",
      "Solanum_pimpine… · half at 1,599,810 bp, beyond the plot",
      "Solanum_pimpine… · no curve",
      "Solanum_pimpine… · no pair",
    ]);
  });

  test("a population with no pair is said to have none even with a half distance, and one the result does not have is a defect", () => {
    const r = resultOf([popOf("pop_a", 412.6, 0)], SMALLEST, LARGEST);
    expect(ldLegendLabel(r, 0, 1000)).toBe("pop_a · no pair");
    expect(() => ldLegendLabel(r, 1, 1000)).toThrow(/^popnei_web defect:/);
  });
});

describe("PA8 D1 the description of the plot", () => {
  test("of the flow gives the words of the spec", () => {
    expect(ldDecayDescription(flowResult(), 100_000)).toBe(
      "The mean r² of pairs of variants against their distance, in 50 bins up to 100,000 base pairs, for 2 populations, with the curve fitted to each. The curve falls to half at 7,548 bp in pop_a and 7,340 bp in pop_b.",
    );
  });

  test("names each population by its own half distance, one beyond the plot, and those with no pair and no curve", () => {
    const r = resultOf(
      [
        POP_B,
        popOf("pop_x", 1599810.0655818006),
        popOf("pop_y", NAN),
        popOf("pop_z", NAN, 0),
        POP_A,
      ],
      SMALLEST,
      LARGEST,
    );
    expect(ldDecayDescription(r, 1000)).toBe(
      "The mean r² of pairs of variants against their distance, in 4 bins up to 1,000 base pairs, for 5 populations, with the curve fitted to each that has one. The curve falls to half at 8.35 bp in pop_b, 1,599,810 bp in pop_x (beyond the plot) and 413 bp in pop_a. pop_z has no pair. pop_y has no curve.",
    );
  });

  test("of 17 populations describes the first 16 the plot draws, and of one population says it in the singular", () => {
    const pops = Array.from({ length: 17 }, (_, i) =>
      i === 16 ? popOf("q16", NAN, 0) : popOf(`q${String(i)}`, 100 + i),
    );
    const many = ldDecayDescription(resultOf(pops, SMALLEST, LARGEST), 1000);
    expect(many).toMatch(
      /^The mean r² of pairs of variants against their distance, in 4 bins up to 1,000 base pairs, for the first 16 of the 17 populations, with the curve fitted to each\. The curve falls to half at 100 bp in q0, 101 bp in q1, /,
    );
    expect(many).toMatch(/ and 115 bp in q15\.$/);
    expect(many).not.toContain("q16");
    expect(ldDecayDescription(resultOf([POP_A], SMALLEST, LARGEST), 1000)).toBe(
      "The mean r² of pairs of variants against their distance, in 4 bins up to 1,000 base pairs, for 1 population, with its fitted curve. The curve falls to half at 413 bp in pop_a.",
    );
  });

  test("with no curve at all says which populations have none, of two and of one", () => {
    const r = resultOf(
      [popOf("pop_a", NAN, 0), popOf("pop_b", NAN, 0)],
      SMALLEST,
      LARGEST,
    );
    expect(ldDecayDescription(r, 1000)).toBe(
      "The mean r² of pairs of variants against their distance, in 4 bins up to 1,000 base pairs, for 2 populations, with the curve fitted to each that has one. pop_a and pop_b have no pair.",
    );
  });
});
