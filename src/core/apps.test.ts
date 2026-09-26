import { describe, expect, test } from "vitest";
import {
  POPGEN_ANALYSES,
  POPGEN_STEPS,
  firstProject,
  numVarsOf,
} from "./apps.ts";
import { emptyProject } from "./project.ts";

describe("WS5 D4 apps.ts", () => {
  test("the first project of population genetics has the missing data filter at 0.1 and nothing else", () => {
    expect(firstProject("popgen")).toEqual({
      ...emptyProject("popgen"),
      filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
    });
  });

  test("the analyses of population genetics have distinct ids, the diversity among them", () => {
    const ids = POPGEN_ANALYSES.map((def) => def.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["diversity"]);
  });

  test("numVarsOf of a result gives what its first filter was given, or the variants of its pass when it had no filter", () => {
    expect(
      numVarsOf({
        analysis: "diversity",
        pops: ["p0"],
        numIndividuals: Uint32Array.from([48]),
        unbiasedExpHet: Float64Array.from([0.35]),
        obsHet: Float64Array.from([0.35]),
        polyRatio: Float64Array.from([0.9]),
        numVarsWithValue: Uint32Array.from([1128]),
        passStats: {
          numVars: 1128,
          filtering: {
            missing_data: { varsProcessed: 1200, varsKept: 1152 },
            maf: { varsProcessed: 1152, varsKept: 1128 },
          },
        },
      }),
    ).toBe(1200);
    expect(
      numVarsOf({
        analysis: "filterCounts",
        passStats: { numVars: 1200, filtering: {} },
      }),
    ).toBe(1200);
  });

  test("the steps of population genetics are variants, individuals and analyses, in that order", () => {
    expect(POPGEN_STEPS).toEqual(["variants", "individuals", "analyses"]);
  });
});
