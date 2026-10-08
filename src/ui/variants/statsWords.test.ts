import { describe, expect, test } from "vitest";

import {
  PART_FAILED,
  PART_STOPPED,
  PASSED_FILTER_DESCRIPTION,
  PASSED_FILTER_LABEL,
  individualFullTitle,
  individualThresholdName,
  individualTitle,
  noValueThresholdLine,
  statsFirstText,
  statsRunningLine,
  thresholdHiddenDescription,
  thresholdLookChangeText,
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

describe("SF9 D5 what is announced when a change made from the box or by a run of the keys changes the look of a threshold", () => {
  test("into grey or off, the box's description; back to removing some, the number alone; nothing when the look stays", () => {
    expect(thresholdLookChangeText("on", "grey", 0.09, "variant")).toBe(
      "This filter removes no variant of the plot.",
    );
    expect(thresholdLookChangeText("off", "grey", 0.1, "individual")).toBe(
      "This filter removes no individual of the plot.",
    );
    expect(thresholdLookChangeText("on", "off", 1, "variant")).toBe(
      "This filter removes nothing.",
    );
    expect(thresholdLookChangeText("grey", "off", 1, "individual")).toBe(
      "This filter removes nothing.",
    );
    expect(thresholdLookChangeText("grey", "on", 0.05, "variant")).toBe("0.05");
    expect(thresholdLookChangeText("off", "on", 0, "individual")).toBe("0");
    expect(thresholdLookChangeText("on", "on", 0.05, "variant")).toBeNull();
    expect(thresholdLookChangeText("grey", "grey", 0.1, "variant")).toBeNull();
    expect(thresholdLookChangeText("off", "off", 1, "variant")).toBeNull();
  });
});

describe("SF9 D4 what a screen reader hears of a threshold in its three looks", () => {
  test("the value of the line: on, its number alone; on and grey, what the grey says of the plot; off, 1 and that it keeps every one", () => {
    expect(thresholdValueText(0.05, "on", "variant")).toBe("0.05");
    expect(thresholdValueText(0, "on", "variant")).toBe("0");
    expect(thresholdValueText(0.1, "grey", "variant")).toBe(
      "0.1, keeps every variant of the plot",
    );
    expect(thresholdValueText(0.15, "grey", "individual")).toBe(
      "0.15, keeps every individual of the plot",
    );
    // Off: 1, the number the box shows, wherever the line stands.
    expect(thresholdValueText(0.7, "off", "variant")).toBe(
      "1, keeps every variant",
    );
    expect(thresholdValueText(0.045, "off", "individual")).toBe(
      "1, keeps every individual",
    );
  });

  test("the description of the box, for a screen reader alone: none while on, the plot's while grey, nothing while off", () => {
    expect(thresholdHiddenDescription("on", "variant")).toBeNull();
    expect(thresholdHiddenDescription("grey", "variant")).toBe(
      "This filter removes no variant of the plot.",
    );
    expect(thresholdHiddenDescription("grey", "individual")).toBe(
      "This filter removes no individual of the plot.",
    );
    expect(thresholdHiddenDescription("off", "variant")).toBe(
      "This filter removes nothing.",
    );
    expect(thresholdHiddenDescription("off", "individual")).toBe(
      "This filter removes nothing.",
    );
  });

  test("the individuals with no value: removed by a filter on, said apart only while off; one, three, and so far", () => {
    expect(noValueThresholdLine(3, true)).toBe(
      "3 individuals with no called genotype are not in the histogram, and this filter removes them.",
    );
    expect(noValueThresholdLine(3, false)).toBe(
      "3 individuals with no called genotype are not in the histogram.",
    );
    expect(noValueThresholdLine(1, true)).toBe(
      "1 individual with no called genotype is not in the histogram, and this filter removes it.",
    );
    expect(noValueThresholdLine(1, false, true)).toBe(
      "1 individual with no called genotype so far is not in the histogram.",
    );
    expect(noValueThresholdLine(0, true)).toBeNull();
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
