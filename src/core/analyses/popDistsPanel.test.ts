/**
 * The tests of the panel's functions of the distances between populations
 * in core (docs/specs/analyses/popDists.md, "How it is verified"): the
 * data of the heatmap in the order of each measure, the line of its
 * order, its description for a screen reader, the rows and the CSV of the
 * table, and the line above 200 populations. The results are written as
 * literals; the flow's numbers are popnei's, as the spec gives them.
 */

import { describe, expect, test } from "vitest";
import {
  orderText,
  popDistsCsv,
  popDistsDescription,
  popDistsHeatmap,
  popDistsRows,
  tooManyPopulationsText,
} from "./popDists.ts";
import type {
  HeatmapOrder,
  PopDistsResult,
  ShownMeasure,
} from "../../worker/protocol.ts";

/** The counts of the pass of the flow: the missing data filter at 0.1
    keeps the 1,200 variants. */
const FLOW_PASS = {
  numVars: 1200,
  filtering: { missing_data: { varsProcessed: 1200, varsKept: 1200 } },
} as const;

/** An order of the heatmap along the PCoA. */
function pcoa(order: readonly number[]): HeatmapOrder {
  return { kind: "pcoa", order: Uint32Array.from(order) };
}

/** The order of the file for two populations. */
const TWO: HeatmapOrder = { kind: "file", reason: "twoPopulations" };

/** A result of the populations `pops`, with the values of Fst and D of
    each pair in the order of the result, each over 1,200 variants, and
    the order `order` of both measures, or `dest` its own. */
function resultOf(
  pops: readonly string[],
  fst: readonly number[],
  dest: readonly number[],
  order: HeatmapOrder,
  destOrder: HeatmapOrder = order,
): PopDistsResult {
  return {
    analysis: "popDists",
    pops,
    numIndividuals: Uint32Array.from(pops.map(() => 30)),
    fst: Float64Array.from(fst),
    dest: Float64Array.from(dest),
    numVarsPerPair: Uint32Array.from(fst.map(() => 1200)),
    order: { fst: order, dest: destOrder },
    leftOut: [],
    passStats: FLOW_PASS,
  };
}

/** The result of the flow, the numbers of popDists.md at the missing
    data filter at 0.1, ordered p2, p0, p1 by both measures. */
function flowResult(): PopDistsResult {
  return resultOf(
    ["p0", "p2", "p1"],
    [0.10273588423661377, 0.10496244498389443, 0.10962148955018115],
    [0.06129813142463423, 0.06354346296076403, 0.06567052128821259],
    pcoa([1, 0, 2]),
  );
}

/** A result of `numPops` populations, `q0`, `q1`, …, every pair 0.1 and
    0.06, in the order of the file. */
function manyPops(numPops: number): PopDistsResult {
  const numPairs = (numPops * (numPops - 1)) / 2;
  return resultOf(
    Array.from({ length: numPops }, (_, i) => `q${String(i)}`),
    new Array<number>(numPairs).fill(0.1),
    new Array<number>(numPairs).fill(0.06),
    { kind: "file", reason: "notPlaced", message: "popnei's message" },
  );
}

const NAN = Number.NaN;

describe("PA5 D1 popDistsHeatmap", () => {
  // p0, p2, p1, each pair its own values, so that a matrix of another
  // order, or of the other measure, fails.
  const r = resultOf(
    ["p0", "p2", "p1"],
    [0.11, 0.12, 0.13],
    [0.21, 0.22, 0.23],
    pcoa([1, 0, 2]),
    pcoa([2, 1, 0]),
  );

  test("the heatmap of Fst is in the order of Fst, p2, p0, p1, each pair's value in both of its cells and NaN on the diagonal", () => {
    const heatmap = popDistsHeatmap(r, "fst");
    expect(heatmap.names).toEqual(["p2", "p0", "p1"]);
    expect(Array.from(heatmap.values)).toEqual([
      NAN,
      0.11,
      0.13,
      0.11,
      NAN,
      0.12,
      0.13,
      0.12,
      NAN,
    ]);
  });

  test("the heatmap of D is in the order of D, p1, p2, p0, and not in that of Fst", () => {
    const heatmap = popDistsHeatmap(r, "dest");
    expect(heatmap.names).toEqual(["p1", "p2", "p0"]);
    expect(Array.from(heatmap.values)).toEqual([
      NAN,
      0.23,
      0.22,
      0.23,
      NAN,
      0.21,
      0.22,
      0.21,
      NAN,
    ]);
  });

  test("with the order of the file, the names of the result in its order", () => {
    const file = resultOf(
      ["p0", "p2", "p1"],
      [0.11, 0.12, 0.13],
      [0.21, 0.22, 0.23],
      { kind: "file", reason: "allZero" },
    );
    const heatmap = popDistsHeatmap(file, "fst");
    expect(heatmap.names).toEqual(["p0", "p2", "p1"]);
    expect(Array.from(heatmap.values)).toEqual([
      NAN,
      0.11,
      0.12,
      0.11,
      NAN,
      0.13,
      0.12,
      0.13,
      NAN,
    ]);
  });

  test("the same object for the same result and measure, and another for the other measure", () => {
    expect(popDistsHeatmap(r, "fst")).toBe(popDistsHeatmap(r, "fst"));
    expect(popDistsHeatmap(r, "dest")).not.toBe(popDistsHeatmap(r, "fst"));
  });

  test("an order that is not a permutation of the populations is a defect", () => {
    for (const order of [
      [1, 1, 2],
      [0, 1],
      [0, 1, 3],
    ]) {
      const bad = resultOf(
        ["p0", "p2", "p1"],
        [1, 2, 3],
        [1, 2, 3],
        pcoa(order),
      );
      expect(() => popDistsHeatmap(bad, "fst")).toThrow(
        /^popnei_web defect: the order of the heatmap/,
      );
    }
  });
});

/** The four populations p0 to p3, the pair p0 and p3 of no value in
    either measure. */
const P0_P3_NONE = resultOf(
  ["p0", "p1", "p2", "p3"],
  [0.1, 0.1, NAN, 0.1, 0.1, 0.1],
  [0.06, 0.06, NAN, 0.06, 0.06, 0.06],
  { kind: "file", reason: "noDistance" },
);

/** Three populations whose every pair has no value. */
const ALL_NONE = resultOf(
  ["p0", "p2", "p1"],
  [NAN, NAN, NAN],
  [NAN, NAN, NAN],
  { kind: "file", reason: "noDistance" },
);

const THREE = ["p0", "p2", "p1"];

/** Each row of the table of the line of order, for a measure: the
    result, and the line, or null for none. */
const ORDER_ROWS: readonly (readonly [
  string,
  (measure: ShownMeasure) => PopDistsResult,
  (measure: ShownMeasure) => string | null,
])[] = [
  [
    "pcoa",
    () => flowResult(),
    () =>
      "Ordered so that similar populations are together: by the first axis of a principal coordinate analysis of these distances.",
  ],
  [
    "twoPopulations",
    () => resultOf(["p2", "p1"], [0.1], [0.06], TWO),
    () => null,
  ],
  [
    "noDistance, one pair",
    () => P0_P3_NONE,
    () =>
      "In the order of the metadata file: the order by similarity needs a distance for every pair, and p0 and p3 have none.",
  ],
  [
    "noDistance, no pair",
    () => ALL_NONE,
    (measure) =>
      `In the order of the metadata file: no pair has a value of ${measure === "fst" ? "Hudson's Fst" : "Jost's D"}.`,
  ],
  [
    "allZero",
    () =>
      resultOf(THREE, [0, -0.01, 0], [0, 0, -0.02], {
        kind: "file",
        reason: "allZero",
      }),
    () =>
      "In the order of the metadata file: every distance is 0 or below, so no population is closer to one than to another.",
  ],
  [
    "notPlaced",
    () =>
      resultOf(THREE, [0.1, 0.2, 0.3], [0.1, 0.2, 0.3], {
        kind: "file",
        reason: "notPlaced",
        message:
          "the linear algebra of the analysis could not be done for the 3 individuals",
      }),
    () =>
      "In the order of the metadata file: popnei could not order these distances.",
  ],
];

describe("PA5 D1 orderText", () => {
  const cases = ORDER_ROWS.flatMap(([name, result, line]) =>
    (["fst", "dest"] as const).map(
      (measure) => [name, measure, result(measure), line(measure)] as const,
    ),
  );

  test.each(cases)("%s, the heatmap of %s", (_, measure, r, line) => {
    expect(orderText(r, measure)).toBe(line);
  });

  test("noDistance with two pairs names both, and with four the first two and how many more", () => {
    const two = resultOf(
      ["p0", "p1", "p2", "p3"],
      [0.1, 0.1, NAN, 0.1, NAN, 0.1],
      [0.06, 0.06, 0.06, 0.06, 0.06, 0.06],
      { kind: "file", reason: "noDistance" },
    );
    expect(orderText(two, "fst")).toBe(
      "In the order of the metadata file: the order by similarity needs a distance for every pair, and p0 and p3, and p1 and p3 have none.",
    );
    const four = resultOf(
      ["p0", "p1", "p2", "p3"],
      [NAN, NAN, 0.1, NAN, NAN, 0.1],
      [0.06, 0.06, 0.06, 0.06, 0.06, 0.06],
      { kind: "file", reason: "noDistance" },
    );
    expect(orderText(four, "fst")).toBe(
      "In the order of the metadata file: the order by similarity needs a distance for every pair, and p0 and p1, p0 and p2 and 2 more have none.",
    );
  });

  test("noDistance for a measure whose every pair has a value is a defect", () => {
    const r = resultOf(THREE, [0.1, 0.1, 0.1], [NAN, NAN, NAN], {
      kind: "file",
      reason: "noDistance",
    });
    expect(orderText(r, "dest")).toBe(
      "In the order of the metadata file: no pair has a value of Jost's D.",
    );
    expect(() => orderText(r, "fst")).toThrow(/^popnei_web defect:/);
  });
});

describe("PA5 D1 popDistsDescription", () => {
  test("the flow's result: the measure, the populations in their order, and the smallest and the largest value with their pairs", () => {
    expect(popDistsDescription(flowResult(), "fst", "panel.nei")).toBe(
      "Heatmap of Hudson's Fst between 3 populations of panel.nei, ordered so that similar ones are together: p2, p0, p1. From 0.1027, between p0 and p2, to 0.1096, between p2 and p1.",
    );
  });

  test("a result with pairs of no value: the smallest negative, with its minus sign, and how many pairs have none", () => {
    const r = resultOf(
      ["p0", "p1", "p2", "p3"],
      [0.05, NAN, 0.2, -0.01, NAN, 0.1],
      [0.03, 0.03, 0.03, 0.03, 0.03, 0.03],
      { kind: "file", reason: "noDistance" },
    );
    expect(popDistsDescription(r, "fst", "panel.nei")).toBe(
      "Heatmap of Hudson's Fst between 4 populations of panel.nei, in the order of the metadata file: p0, p1, p2, p3. From −0.0100, between p1 and p2, to 0.2000, between p0 and p3. 2 of the 6 pairs have no value.",
    );
  });

  test("a result with no value", () => {
    expect(popDistsDescription(ALL_NONE, "dest", "panel.nei")).toBe(
      "Heatmap of Jost's D between 3 populations of panel.nei, in the order of the metadata file: p0, p2, p1. No pair has a value.",
    );
  });

  test("one pair with a value, of two populations, and one pair of no value among three", () => {
    const two = resultOf(["p2", "p1"], [0.10962148955018115], [0.06], TWO);
    expect(popDistsDescription(two, "fst", "panel.nei")).toBe(
      "Heatmap of Hudson's Fst between 2 populations of panel.nei, in the order of the metadata file: p2, p1. Its one value is 0.1096, between p2 and p1.",
    );
    const one = resultOf(THREE, [0.1, 0.2, NAN], [0.1, 0.2, 0.3], {
      kind: "file",
      reason: "noDistance",
    });
    expect(popDistsDescription(one, "fst", "panel.nei")).toBe(
      "Heatmap of Hudson's Fst between 3 populations of panel.nei, in the order of the metadata file: p0, p2, p1. From 0.1000, between p0 and p2, to 0.2000, between p0 and p1. 1 of the 3 pairs has no value.",
    );
  });
});

describe("PA5 D1 popDistsRows and popDistsCsv", () => {
  test("the flow's result: the rows in its order, and the CSV of the spec", () => {
    const r = flowResult();
    expect(popDistsRows(r)).toEqual([
      {
        first: "p0",
        second: "p2",
        fst: 0.10273588423661377,
        dest: 0.06129813142463423,
        numVars: 1200,
      },
      {
        first: "p0",
        second: "p1",
        fst: 0.10496244498389443,
        dest: 0.06354346296076403,
        numVars: 1200,
      },
      {
        first: "p2",
        second: "p1",
        fst: 0.10962148955018115,
        dest: 0.06567052128821259,
        numVars: 1200,
      },
    ]);
    expect(popDistsRows(r)).toBe(popDistsRows(r));
    expect(popDistsCsv(r)).toBe(
      "population_1,population_2,fst_hudson,jost_d,num_variants\n" +
        "p0,p2,0.10273588423661377,0.06129813142463423,1200\n" +
        "p0,p1,0.10496244498389443,0.06354346296076403,1200\n" +
        "p2,p1,0.10962148955018115,0.06567052128821259,1200\n",
    );
  });

  test('a population named a,"b" is quoted, and no value is null in the rows and an empty cell in the CSV', () => {
    const r = resultOf(['a,"b"', "c"], [-0.0113], [NAN], TWO);
    expect(popDistsRows(r)).toEqual([
      { first: 'a,"b"', second: "c", fst: -0.0113, dest: null, numVars: 1200 },
    ]);
    expect(popDistsCsv(r)).toBe(
      'population_1,population_2,fst_hudson,jost_d,num_variants\n"a,""b""",c,-0.0113,,1200\n',
    );
  });
});

describe("PA10 popDistsCsv and a name a spreadsheet would run as a formula", () => {
  test("populations named =p1 and -p2 are written with a quote before them, and a negative Fst stays a number", () => {
    const r = resultOf(["=p1", "-p2"], [-0.0128], [0.5], TWO);
    expect(popDistsCsv(r)).toBe(
      "population_1,population_2,fst_hudson,jost_d,num_variants\n'=p1,'-p2,-0.0128,0.5,1200\n",
    );
  });
});

describe("PA5 D1 tooManyPopulationsText", () => {
  test("201 populations", () => {
    expect(tooManyPopulationsText(manyPops(201))).toBe(
      "The heatmap and the table are shown for up to 200 populations, and this result has 201. Download the table as CSV to read it.",
    );
  });

  test("1,000 populations, with a comma between thousands", () => {
    expect(tooManyPopulationsText(manyPops(1000))).toBe(
      "The heatmap and the table are shown for up to 200 populations, and this result has 1,000. Download the table as CSV to read it.",
    );
  });

  test("200 populations: none", () => {
    expect(tooManyPopulationsText(manyPops(200))).toBeNull();
  });
});
