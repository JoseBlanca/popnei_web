import { describe, expect, test } from "vitest";

import { MAX_COLOUR_GROUPS, NO_COLOUR_GROUP } from "../../core/analyses/pca.ts";
import { POPGEN_ANALYSES } from "../../core/apps.ts";
import { MAX_POINT_GROUPS } from "../../charts/limits.ts";
import { NO_GROUP } from "../../charts/marks.ts";
import { stepOf, titleOf } from "./titles.ts";

// The principal components in the Analyses step (docs/specs/analyses/
// pca.md, "The panel"; docs/specs/shell.md): its title and its place
// before the diversity, and the two numbers that core keeps in step with
// src/charts, which it does not import. panels.ts is not imported here: it
// holds the components of the results, which name APP_VERSION, declared
// by the entry of the page, which the program of the tests does not hold.

describe("IP8 D3 the panel of the principal components", () => {
  test("core's group of no colour and its most groups are those of the plots", () => {
    expect(NO_COLOUR_GROUP).toBe(NO_GROUP);
    expect(MAX_COLOUR_GROUPS).toBe(MAX_POINT_GROUPS);
  });

  test("the Analyses step shows Principal components, then Diversity, then Distances between populations, then LD decay, each titled as the shell names it", () => {
    const inStep = POPGEN_ANALYSES.filter(
      (def) => stepOf(def.id) === "analyses",
    ).map((def) => def.id);
    expect(inStep).toEqual(["pca", "diversity", "popDists", "ldDecay"]);
    expect(inStep.map(titleOf)).toEqual([
      "Principal components",
      "Diversity",
      "Distances between populations",
      "LD decay",
    ]);
  });
});
