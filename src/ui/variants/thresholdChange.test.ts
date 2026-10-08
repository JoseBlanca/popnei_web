/**
 * The changes of the project that the thresholds of popgen2.html make,
 * and the words of their steps of Undo, over the first project of the
 * page (docs/specs/steps/popgen2-filters.md, "What it sends and reads").
 */
import { describe, expect, test } from "vitest";

import { popgen2FirstProject } from "../../core/apps.ts";
import { thresholdValue } from "../../core/project.ts";
import type { Project, Threshold } from "../../core/project.ts";
import { deepFreeze } from "../../core/testSupport.ts";
import { thresholdRefusedText } from "../steps/variants/words.ts";
import {
  individualThreshold,
  thresholdChange,
  variantThreshold,
} from "./thresholdChange.ts";

const MISSING: Threshold = { of: "variants", kind: "missing_data" };
const MAF: Threshold = { of: "variants", kind: "maf" };
const INDIVIDUAL_MISSING: Threshold = {
  of: "individuals",
  kind: "missing_data",
};

/** `p` after the change of `threshold` to `value`, which must be one. */
function changed(p: Project, threshold: Threshold, value: number | null) {
  const change = thresholdChange(p, threshold, value);
  if (change === null) throw new Error("no change");
  return { description: change.description, after: change.command(p) };
}

describe("SF9 D4 the change of a threshold and the words of its step of Undo", () => {
  test("each histogram's filter: the three of the variants, none for the expected heterozygosity, the two of the individuals", () => {
    expect(variantThreshold("missingRate")).toEqual(MISSING);
    expect(variantThreshold("maf")).toEqual(MAF);
    expect(variantThreshold("obsHet")).toEqual({
      of: "variants",
      kind: "obs_het",
    });
    expect(variantThreshold("unbiasedExpHet")).toBeNull();
    expect(individualThreshold("missingGenotypes")).toEqual(INDIVIDUAL_MISSING);
    expect(individualThreshold("observedHeterozygosity")).toEqual({
      of: "individuals",
      kind: "obs_het",
    });
  });

  test("from thresholdValue before and after: a number then another changed, off then a number turned on, a number then off turned off", () => {
    const first = deepFreeze(popgen2FirstProject());
    expect(thresholdValue(first, MISSING)).toBe(0.1);
    expect(thresholdValue(first, MAF)).toBeNull();

    const moved = changed(first, MISSING, 0.05);
    expect(moved.description).toBe(
      "the filter of the variants by missing data changed",
    );
    expect(thresholdValue(moved.after, MISSING)).toBe(0.05);

    const on = changed(first, MAF, 0.9);
    expect(on.description).toBe("the MAF filter was turned on");
    expect(thresholdValue(on.after, MAF)).toBe(0.9);

    // Emptied, or 1: off, the value kept aside.
    for (const off of [null, 1]) {
      const turned = changed(on.after, MAF, off);
      expect(turned.description).toBe("the MAF filter was turned off");
      expect(thresholdValue(turned.after, MAF)).toBeNull();
    }

    const individual = changed(first, INDIVIDUAL_MISSING, 0.2);
    expect(individual.description).toBe(
      "the filter of individuals by missing data was turned on",
    );
    expect(
      changed(individual.after, INDIVIDUAL_MISSING, null).description,
    ).toBe("the filter of individuals by missing data was turned off");
  });

  test("the value the project has already is no change: 0.1 again, off again by an emptied box or 1", () => {
    const first = deepFreeze(popgen2FirstProject());
    expect(thresholdChange(first, MISSING, 0.1)).toBeNull();
    expect(thresholdChange(first, MAF, null)).toBeNull();
    expect(thresholdChange(first, MAF, 1)).toBeNull();
    // 0 is a filter at 0.
    expect(changed(first, MISSING, 0).description).toBe(
      "the filter of the variants by missing data changed",
    );
  });

  test("a number refused while the threshold is off names 1, the number its box shows", () => {
    expect(
      thresholdRefusedText({ kind: "aboveMax", typed: "1.5", maxValue: 1 }, 1),
    ).toBe("1.5 is more than 1; the threshold stays 1.");
  });
});
