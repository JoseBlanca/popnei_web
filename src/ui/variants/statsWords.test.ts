import { describe, expect, test } from "vitest";

import {
  PART_FAILED,
  PART_STOPPED,
  individualFullTitle,
  individualThresholdName,
  individualTitle,
  keepsLine,
  longestKeepsLine,
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
    expect(thresholdShownLabel("Obs. het.")).toBe("Obs. het.\u00a0max:");
    expect(variantThresholdName("obsHet")).toBe(
      "Obs. het.\u00a0max: maximum observed heterozygosity",
    );
    expect(individualThresholdName("missingGenotypes")).toBe(
      "Missing GTs\u00a0max: maximum proportion of missing genotypes of an individual",
    );
  });

  test("live-stats 2 the first plots drawn from a result so far are said once, as drawn from the variants read so far", () => {
    expect(statsFirstText("panel.vcf.gz")).toBe(
      "Plots of panel.vcf.gz are drawn from the variants read so far, and change as the file is read.",
    );
  });
});

describe("thresholds round 1 the line of what a threshold keeps", () => {
  test("one number, all when it keeps every one; no explanation", () => {
    expect(keepsLine({ kept: 1050, withValue: 1200 }, "variant")).toBe(
      "Keeps 1,050 of 1,200 variants",
    );
    expect(keepsLine({ kept: 1200, withValue: 1200 }, "variant")).toBe(
      "Keeps all 1,200 variants",
    );
  });

  test("while the pass runs it ends so far", () => {
    expect(keepsLine({ kept: 1152, withValue: 1200 }, "variant", true)).toBe(
      "Keeps 1,152 of 1,200 variants so far",
    );
    expect(keepsLine({ kept: 180, withValue: 200 }, "individual", true)).toBe(
      "Keeps 180 of 200 individuals so far",
    );
  });

  test("one, none, and no value at all", () => {
    expect(keepsLine({ kept: 1, withValue: 3 }, "individual")).toBe(
      "Keeps 1 of 3 individuals",
    );
    expect(keepsLine({ kept: 0, withValue: 3 }, "individual")).toBe(
      "Keeps 0 of 3 individuals",
    );
    expect(keepsLine({ kept: 1, withValue: 1 }, "variant")).toBe(
      "Keeps the only variant",
    );
    expect(keepsLine({ kept: 0, withValue: 0 }, "variant")).toBe(
      "No variant has a value",
    );
  });

  test("the value text of the line says the number and what it keeps", () => {
    expect(
      thresholdValueText(0.1, { kept: 1050, withValue: 1200 }, "variant"),
    ).toBe("0.1, keeps 1,050 of 1,200 variants");
    expect(
      thresholdValueText(0.05, { kept: 1152, withValue: 1200 }, "variant"),
    ).toBe("0.05, keeps 1,152 of 1,200 variants");
    expect(
      thresholdValueText(0.3, { kept: 1200, withValue: 1200 }, "variant"),
    ).toBe("0.3, keeps all 1,200 variants");
    expect(
      thresholdValueText(0.004, { kept: 2, withValue: 1200 }, "variant", true),
    ).toBe("0.004, keeps 2 of 1,200 variants so far");
  });
});

describe("th4 fix 1 the room of the line of what a threshold keeps", () => {
  test("the longest the line can be for the number with a value: a number of its digits, so far, or the words of all, the only one or none when longer", () => {
    expect(longestKeepsLine(200_000, "variant")).toBe(
      "Keeps 200,000 of 200,000 variants so far",
    );
    expect(longestKeepsLine(1200, "variant")).toBe(
      "Keeps 1,200 of 1,200 variants so far",
    );
    expect(longestKeepsLine(12, "individual")).toBe(
      "Keeps 12 of 12 individuals so far",
    );
    expect(longestKeepsLine(1, "individual")).toBe(
      "Keeps the only individual so far",
    );
    expect(longestKeepsLine(0, "variant")).toBe(
      "No variant has a value so far",
    );
    // Every line of a count is at most as long, in characters.
    for (const withValue of [0, 1, 2, 12, 200_000]) {
      for (const kept of [0, 1, Math.floor(withValue / 2), withValue]) {
        if (kept > withValue) continue;
        for (const noun of ["variant", "individual"] as const) {
          expect(
            keepsLine({ kept, withValue }, noun, true).length,
          ).toBeLessThanOrEqual(longestKeepsLine(withValue, noun).length);
        }
      }
    }
  });
});
