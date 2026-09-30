/**
 * popnei's message of an order it refused, written to the console once
 * for a result (docs/specs/analyses/popDists.md, "Its words"); the panel
 * drawn twice by StrictMode is in panel.test.ts.
 */
import { describe, expect, test } from "vitest";

import type { HeatmapOrder, PopDistsResult } from "../../../worker/protocol.ts";
import { warnNotPlaced } from "./notPlaced.ts";

/** A result of three populations with the orders `fst` and `dest`. */
function resultOf(fst: HeatmapOrder, dest: HeatmapOrder): PopDistsResult {
  return {
    analysis: "popDists",
    pops: ["p0", "p2", "p1"],
    numIndividuals: Uint32Array.from([48, 84, 68]),
    fst: Float64Array.from([0.1, 0.1, 0.1]),
    dest: Float64Array.from([0.06, 0.06, 0.06]),
    numVarsPerPair: Uint32Array.from([1200, 1200, 1200]),
    order: { fst, dest },
    leftOut: [],
    passStats: { numVars: 1200, filtering: {} },
  };
}

const REFUSED: HeatmapOrder = {
  kind: "file",
  reason: "notPlaced",
  message: "doPcoa: the matrix is not positive",
};
const PCOA: HeatmapOrder = { kind: "pcoa", order: Uint32Array.from([1, 0, 2]) };

describe("PA5 D1 popnei's message of an order it refused", () => {
  test("goes to the console once for a result, one line per measure refused", () => {
    const written: string[] = [];
    const warn = (message: string): void => {
      written.push(message);
    };
    const both = resultOf(REFUSED, REFUSED);
    warnNotPlaced(both, warn);
    warnNotPlaced(both, warn);
    expect(written).toEqual([
      "popnei could not order the heatmap of fst: doPcoa: the matrix is not positive",
      "popnei could not order the heatmap of dest: doPcoa: the matrix is not positive",
    ]);
    // Another result with the same message is written again.
    warnNotPlaced(resultOf(PCOA, REFUSED), warn);
    expect(written).toHaveLength(3);
  });

  test("an order popnei made writes nothing", () => {
    const written: string[] = [];
    warnNotPlaced(resultOf(PCOA, { kind: "file", reason: "allZero" }), (m) => {
      written.push(m);
    });
    expect(written).toEqual([]);
  });
});
