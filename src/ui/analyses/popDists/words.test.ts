import { describe, expect, test } from "vitest";

import { POP_DISTS_MAX_SHOWN } from "../../../core/analyses/popDists.ts";
import { MAX_HEATMAP_NAMES } from "../../../charts/limits.ts";
import { heatmapTitle, measureAnnounced } from "./words.ts";

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
