/**
 * The words of the unclassified individuals kept that a run of the
 * populations leaves out, and of the populations the thresholds empty,
 * one set for the diversity, the LD decay and the distances (the merge
 * of the LD decay and the distances, 13 October 2026), each part saying
 * them with the words its tab had.
 */
import { describe, expect, test } from "vitest";

import {
  emptiedLine,
  unclassifiedCaption,
  unclassifiedLine,
} from "./unclassifiedWords.ts";

describe("the words of the unclassified left out", () => {
  test("the line under the options, one and several", () => {
    expect(unclassifiedLine(1)).toBe(
      "1 unclassified individual kept is left out, as the Individuals tab says.",
    );
    expect(unclassifiedLine(7)).toBe(
      "7 unclassified individuals kept are left out, as the Individuals tab says.",
    );
  });

  test("the end of a caption: not in the table of the diversity or of the LD decay, left out of the distances", () => {
    expect(unclassifiedCaption(1, "notInIt")).toBe(
      "1 unclassified individual kept is not in it.",
    );
    expect(unclassifiedCaption(7, "notInIt")).toBe(
      "7 unclassified individuals kept are not in it.",
    );
    expect(unclassifiedCaption(1, "leftOut")).toBe(
      "1 unclassified individual kept is left out.",
    );
    expect(unclassifiedCaption(1_200, "leftOut")).toBe(
      "1,200 unclassified individuals kept are left out.",
    );
  });

  test("the populations the thresholds empty", () => {
    expect(emptiedLine(["p9"])).toBe(
      "p9 has no individual left after the thresholds of the individuals, and is left out. Loosen the thresholds of the individuals in the Variants tab to keep it.",
    );
    expect(emptiedLine(["p8", "p9"])).toMatch(
      /have no individual left .* and are left out\. .* to keep them\.$/u,
    );
  });
});
