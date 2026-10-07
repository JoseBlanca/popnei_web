import { describe, expect, test } from "vitest";

import {
  PART_FAILED,
  PART_STOPPED,
  individualFullTitle,
  individualThresholdName,
  individualTitle,
  keepsLine,
  statsFirstText,
  statsRunningLine,
  thresholdShownLabel,
  thresholdValueText,
  variantFullTitle,
  variantThresholdName,
  variantTitle,
} from "./statsWords.ts";

describe("the words of the statistics of the open file", () => {
  test("the line of a part while the pass runs names its statistics, with the share once known", () => {
    expect(statsRunningLine("variants", null)).toBe(
      "Calculating the statistics of the variants…",
    );
    expect(statsRunningLine("individuals", 34)).toBe(
      "Calculating the statistics of the individuals… 34%",
    );
  });

  test("a part stopped, or whose pass failed, says so in a few words, the box saying why", () => {
    expect(PART_STOPPED).toBe(
      "Stopped. Start again reads the file from the start.",
    );
    expect(PART_FAILED).toBe("Not calculated.");
  });

  test("thresholds round 1 the titles are short, the owner's five and the major allele frequency; the plot keeps the full name", () => {
    expect(
      (["missingRate", "maf", "obsHet", "unbiasedExpHet"] as const).map(
        variantTitle,
      ),
    ).toEqual([
      "Missing genotypes",
      "Major allele frequency",
      "Obs. het.",
      "Exp. het. (unbiased)",
    ]);
    expect(
      (["missingGenotypes", "observedHeterozygosity"] as const).map(
        individualTitle,
      ),
    ).toEqual(["Missing GTs", "Obs. het."]);
    expect(variantFullTitle("obsHet")).toBe("Observed heterozygosity");
    expect(individualFullTitle("missingGenotypes")).toBe(
      "Proportion of missing genotypes of each individual",
    );
  });

  test("thresholds round 1 the name of a box starts with the words drawn before it (WCAG 2.5.3) and goes on with the full name", () => {
    expect(thresholdShownLabel("Obs. het.")).toBe("Obs. het. max:");
    expect(variantThresholdName("obsHet")).toBe(
      "Obs. het. max: maximum observed heterozygosity",
    );
    expect(individualThresholdName("missingGenotypes")).toBe(
      "Missing GTs max: maximum proportion of missing genotypes of an individual",
    );
  });

  test("live-stats 2 the first plots drawn from a result so far are said once, as drawn from the variants read so far", () => {
    expect(statsFirstText("panel.vcf.gz")).toBe(
      "Plots of panel.vcf.gz are drawn from the variants read so far, and change as the file is read.",
    );
  });
});

describe("thresholds round 1 the line of what a threshold keeps", () => {
  test("one number where the bins can tell, a range where they cannot, all when it keeps every one; no explanation", () => {
    expect(
      keepsLine({ keptLow: 1050, keptHigh: 1050, withValue: 1200 }, "variant"),
    ).toBe("Keeps 1,050 of 1,200 variants");
    expect(
      keepsLine({ keptLow: 564, keptHigh: 566, withValue: 1200 }, "variant"),
    ).toBe("Keeps 564 to 566 of 1,200 variants");
    expect(
      keepsLine({ keptLow: 1200, keptHigh: 1200, withValue: 1200 }, "variant"),
    ).toBe("Keeps all 1,200 variants");
    // A range that reaches every variant is still a range.
    expect(
      keepsLine({ keptLow: 1190, keptHigh: 1200, withValue: 1200 }, "variant"),
    ).toBe("Keeps 1,190 to 1,200 of 1,200 variants");
  });

  test("while the pass runs it ends so far", () => {
    expect(
      keepsLine(
        { keptLow: 1113, keptHigh: 1152, withValue: 1200 },
        "variant",
        true,
      ),
    ).toBe("Keeps 1,113 to 1,152 of 1,200 variants so far");
    expect(
      keepsLine(
        { keptLow: 180, keptHigh: 180, withValue: 200 },
        "individual",
        true,
      ),
    ).toBe("Keeps 180 of 200 individuals so far");
  });

  test("one, none, and no value at all", () => {
    expect(
      keepsLine({ keptLow: 1, keptHigh: 1, withValue: 3 }, "individual"),
    ).toBe("Keeps 1 of 3 individuals");
    expect(
      keepsLine({ keptLow: 0, keptHigh: 0, withValue: 3 }, "individual"),
    ).toBe("Keeps 0 of 3 individuals");
    expect(
      keepsLine({ keptLow: 1, keptHigh: 1, withValue: 1 }, "variant"),
    ).toBe("Keeps the only variant");
    expect(
      keepsLine({ keptLow: 0, keptHigh: 0, withValue: 0 }, "variant"),
    ).toBe("No variant has a value");
  });

  test("the value text of the line says the number and what it keeps, a range with 'to'", () => {
    expect(
      thresholdValueText(
        0.1,
        { keptLow: 1050, keptHigh: 1050, withValue: 1200 },
        "variant",
      ),
    ).toBe("0.1, keeps 1,050 of 1,200 variants");
    expect(
      thresholdValueText(
        0.05,
        { keptLow: 1113, keptHigh: 1152, withValue: 1200 },
        "variant",
      ),
    ).toBe("0.05, keeps 1,113 to 1,152 of 1,200 variants");
    expect(
      thresholdValueText(
        0.3,
        { keptLow: 1200, keptHigh: 1200, withValue: 1200 },
        "variant",
      ),
    ).toBe("0.3, keeps all 1,200 variants");
    expect(
      thresholdValueText(
        0.004,
        { keptLow: 2, keptHigh: 2, withValue: 1200 },
        "variant",
        true,
      ),
    ).toBe("0.004, keeps 2 of 1,200 variants so far");
  });
});
