import { describe, expect, test } from "vitest";

import {
  PART_FAILED,
  PART_STOPPED,
  PASSED_FILTER_DESCRIPTION,
  PASSED_FILTER_LABEL,
  individualFullTitle,
  individualThresholdName,
  individualTitle,
  removesNothingText,
  removesSomeText,
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

describe("the owner's first round: what a screen reader hears of a threshold, with no line of what it keeps", () => {
  test("the value of the line is the number alone, and with what the grey says when it keeps every one", () => {
    expect(thresholdValueText(0.05, false, "variant")).toBe("0.05");
    expect(thresholdValueText(0, false, "variant")).toBe("0");
    expect(thresholdValueText(1, true, "variant")).toBe(
      "1, keeps every variant",
    );
    expect(thresholdValueText(0.15, true, "individual")).toBe(
      "0.15, keeps every individual",
    );
  });

  test("while the pass runs the words of the grey end so far, and the number alone stays alone", () => {
    expect(thresholdValueText(0.6, true, "variant", true)).toBe(
      "0.6, keeps every variant so far",
    );
    expect(thresholdValueText(0.004, false, "variant", true)).toBe("0.004");
  });

  test("the description of the box of a threshold that removes nothing", () => {
    expect(removesNothingText("variant")).toBe(
      "This threshold removes no variant.",
    );
    expect(removesNothingText("individual", true)).toBe(
      "This threshold removes no individual so far.",
    );
  });

  test("what is announced when a number committed in the box turns a threshold that removed nothing into one that removes some", () => {
    expect(removesSomeText("variant")).toBe("This threshold removes variants.");
    expect(removesSomeText("individual", true)).toBe(
      "This threshold removes individuals so far.",
    );
  });
});

describe("SF7 D2 the words of the FILTER box", () => {
  test("its label and the sentence under it, as the screen spec has them", () => {
    expect(PASSED_FILTER_LABEL).toBe(
      "Leave out the variants that failed their FILTER",
    );
    expect(PASSED_FILTER_DESCRIPTION).toBe(
      "The plots show every variant. The ones that failed are left out of what is downloaded or analysed.",
    );
  });
});
