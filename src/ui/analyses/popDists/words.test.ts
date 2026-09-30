import { describe, expect, test } from "vitest";

import { POP_DISTS_MAX_SHOWN } from "../../../core/analyses/popDists.ts";
import type { PopulationsKept } from "../../../core/project.ts";
import { MAX_HEATMAP_NAMES } from "../../../charts/limits.ts";
import {
  captionText,
  csvName,
  heatmapTitle,
  measureAnnounced,
  readyLines,
  rowCells,
} from "./words.ts";

// The words of the panel of the distances between populations that are
// not core's, and the one number core keeps in step with src/charts,
// which it does not import (docs/specs/analyses/popDists.md, "How it is
// verified").

describe("PA5 D1 the words of the panel of the distances", () => {
  test("the most populations the panel shows is the most names the heatmap draws", () => {
    expect(POP_DISTS_MAX_SHOWN).toBe(MAX_HEATMAP_NAMES);
  });

  test("a change of the measure is announced as the heatmap of the measure drawn, and the heatmap is titled by it", () => {
    expect(measureAnnounced("dest")).toBe("Heatmap of Jost's D");
    expect(measureAnnounced("fst")).toBe("Heatmap of Hudson's Fst");
    expect(heatmapTitle("fst")).toBe("Hudson's Fst between populations");
    expect(heatmapTitle("dest")).toBe("Jost's D between populations");
  });
});

/** Populations of `sizes` individuals each, named by their keys. */
function kept(
  sizes: Readonly<Record<string, number>>,
  emptied: readonly string[] = [],
): PopulationsKept {
  return {
    pops: Object.entries(sizes).map(
      ([pop, size]) =>
        [
          pop,
          Array.from({ length: size }, (_, i) => `${pop}_${String(i)}`),
        ] as const,
    ),
    emptied,
  };
}

describe("PA5 D1 the ready state of the panel of the distances", () => {
  test("the populations it will run on are those with the minimum, and one under it is named after them", () => {
    expect(readyLines(kept({ p0: 48, p3: 12, p2: 84 }), 20, false)).toEqual([
      "2 populations: p0, 48 individuals; p2, 84 individuals",
      "p3 has 12 individuals, fewer than the minimum of 20, and is left out.",
    ]);
  });

  test("several under the minimum are named together, with their sizes", () => {
    expect(
      readyLines(kept({ p0: 48, p3: 12, p2: 84, p5: 8 }), 20, false),
    ).toEqual([
      "2 populations: p0, 48 individuals; p2, 84 individuals",
      "p3 and p5 have fewer individuals than the minimum of 20, 12 and 8, and are left out.",
    ]);
  });

  test("a minimum lowered brings a small population in, and a minimum of 0 takes every one", () => {
    expect(readyLines(kept({ p0: 48, p3: 12 }), 12, false)).toEqual([
      "2 populations: p0, 48 individuals; p3, 12 individuals",
    ]);
    expect(readyLines(kept({ p0: 48, p3: 1 }), 0, false)).toEqual([
      "2 populations: p0, 48 individuals; p3, 1 individual",
    ]);
  });

  test("the populations the filters leave empty, and the wait for the statistics, follow, as in the diversity", () => {
    expect(readyLines(kept({ p0: 48, p2: 84 }, ["p9"]), 20, true)).toEqual([
      "2 populations: p0, 48 individuals; p2, 84 individuals",
      "p9 has no individual left after the filters of individuals, and is left out. Loosen the filters of individuals in the Variants step to keep it.",
      "Run calculates the statistics of each individual first, and the populations may lose individuals to the thresholds.",
    ]);
  });
});

describe("PA5 D1 the table of the panel of the distances", () => {
  test("the caption names the variants file and the variants the filters kept", () => {
    expect(captionText(1200, "panel.nei")).toBe(
      "Distances between the populations of panel.nei, over the 1,200 variants the filters kept.",
    );
  });

  test("a row reads the pair, both distances to four decimals, a negative one with its minus sign, no value, and its variants", () => {
    expect(
      rowCells({
        first: "p0",
        second: "p2",
        fst: 0.10273588423661377,
        dest: 0.06129813142463423,
        numVars: 1200,
      }),
    ).toEqual(["p0 and p2", "0.1027", "0.0613", "1,200"]);
    expect(
      rowCells({
        first: "p0a",
        second: "p0b",
        fst: -0.011276258310056011,
        dest: null,
        numVars: 12,
      }),
    ).toEqual(["p0a and p0b", "−0.0113", "no value", "12"]);
  });

  test("the download is named by the stem of the variants file", () => {
    expect(csvName("panel.nei")).toBe("panel.popdists.csv");
    expect(csvName("panel.vcf.gz")).toBe("panel.popdists.csv");
  });
});
