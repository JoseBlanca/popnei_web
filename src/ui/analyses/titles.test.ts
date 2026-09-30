import { describe, expect, test } from "vitest";

import { POPGEN_ANALYSES } from "../../core/apps.ts";
import { SHELL_WORDS } from "./titles.ts";

// The words of the shell of the page (docs/specs/shell.md, "What it sends
// and reads"): the titles of the analyses and the steps of apps.ts; the
// variants kept are tested in src/core/apps.test.ts.

describe("VS5 D1 the words of the shell of the page", () => {
  test("each analysis is named by the title of its panel or of its part of the Variants step", () => {
    expect(POPGEN_ANALYSES.map((def) => SHELL_WORDS.title(def.id))).toEqual([
      "Statistics of each individual",
      "Histograms of the variants",
      "Counts of the filters",
      "Principal components",
      "Diversity",
      "LD decay",
    ]);
  });

  test("the checks are in the Variants step and the principal components, the diversity and the LD decay in the Analyses step, and an analysis of no step is a defect", () => {
    expect(POPGEN_ANALYSES.map((def) => SHELL_WORDS.stepOf(def.id))).toEqual([
      "variants",
      "variants",
      "variants",
      "analyses",
      "analyses",
      "analyses",
    ]);
    expect(() => SHELL_WORDS.stepOf("tsne")).toThrow(/^popnei_web defect:/);
  });

  test("an analysis with no title is a defect", () => {
    expect(() => SHELL_WORDS.title("tsne")).toThrow(/^popnei_web defect:/);
  });

  test("stop A 6 the titles of the diversity and the LD decay name one thing, and the others several, after which the status region says were", () => {
    expect(POPGEN_ANALYSES.map((def) => SHELL_WORDS.plural(def.id))).toEqual([
      true,
      true,
      true,
      true,
      false,
      false,
    ]);
    expect(() => SHELL_WORDS.plural("tsne")).toThrow(/^popnei_web defect:/);
  });
});
