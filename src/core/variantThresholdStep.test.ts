/**
 * The step of a threshold of the variants over the axis of its histogram,
 * made once for a result of the one pass of popgen2.html and read by the
 * histogram of the Variants tab and by the slider of that filter in the
 * PCA tab, which takes its decimals
 * (docs/specs/steps/popgen2-pca.md, "Its filters"). The binning it runs
 * over popnei's fine bins is watched, so that a second call with the
 * same result and individuals is seen not to run it again.
 */
import { afterEach, describe, expect, test, vi } from "vitest";

import * as variantChecks from "./analyses/variantChecks.ts";
import { summaryResult } from "./testSupport.ts";
import { thresholdStep, variantThresholdStep } from "./thresholds.ts";

vi.mock("./analyses/variantChecks.ts", { spy: true });

afterEach(() => {
  vi.mocked(variantChecks.variantBinsRounded).mockClear();
});

const PANEL = { numIndividuals: 200, ploidy: 2 } as const;

describe("AP6 D1 variantThresholdStep, the step of a threshold of the variants", () => {
  test("the step of thresholdStep over the axis the histogram draws, rounded out by variantBinsRounded", () => {
    const perVar = summaryResult(["chr1"], [100]).perVar;
    for (const statistic of ["missingRate", "maf"] as const) {
      const { edges } = variantChecks.variantBinsRounded(
        perVar,
        statistic,
        PANEL,
      );
      expect(variantThresholdStep(perVar, statistic, PANEL)).toStrictEqual(
        thresholdStep(edges[0] ?? Number.NaN, edges.at(-1) ?? Number.NaN),
      );
    }
  });

  test("a second call with the same result, statistic and individuals does not bin the variants again; another statistic or other individuals do", () => {
    const perVar = summaryResult(["chr1"], [100]).perVar;
    const first = variantThresholdStep(perVar, "missingRate", PANEL);
    const binned = vi.mocked(variantChecks.variantBinsRounded);
    expect(binned).toHaveBeenCalledTimes(1);

    expect(
      variantThresholdStep(perVar, "missingRate", {
        numIndividuals: 200,
        ploidy: 2,
      }),
    ).toBe(first);
    expect(binned).toHaveBeenCalledTimes(1);

    variantThresholdStep(perVar, "maf", PANEL);
    expect(binned).toHaveBeenCalledTimes(2);
    variantThresholdStep(perVar, "missingRate", {
      numIndividuals: 20,
      ploidy: 2,
    });
    expect(binned).toHaveBeenCalledTimes(3);
    // Another result of the same numbers is binned anew.
    variantThresholdStep(
      summaryResult(["chr1"], [100]).perVar,
      "missingRate",
      PANEL,
    );
    expect(binned).toHaveBeenCalledTimes(4);
  });
});
