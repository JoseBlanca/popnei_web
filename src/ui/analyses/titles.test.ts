import { describe, expect, test } from "vitest";

import { POPGEN_ANALYSES } from "../../core/apps.ts";
import { SHELL_WORDS } from "./titles.ts";

// The words of the shell of the page (docs/specs/shell.md, "What it sends
// and reads"): the titles of the analyses and the steps of apps.ts; the
// variants kept are tested in src/core/apps.test.ts.

describe("VS5 D1 the words of the shell of the page", () => {
  test("each analysis is named by the title of its panel or of its part of the Variants step", () => {
    expect(POPGEN_ANALYSES.map((def) => SHELL_WORDS.title(def.id))).toEqual([
      "Histograms of the variants",
      "Counts of the filters",
      "Statistics of each individual",
      "Diversity",
    ]);
  });

  test("the checks are in the Variants step and the diversity in the Analyses step, and an analysis of no step is a defect", () => {
    expect(POPGEN_ANALYSES.map((def) => SHELL_WORDS.stepOf(def.id))).toEqual([
      "variants",
      "variants",
      "variants",
      "analyses",
    ]);
    expect(() => SHELL_WORDS.stepOf("pca")).toThrow(/^popnei_web defect:/);
  });
});
