import { describe, expect, test } from "vitest";

import {
  PART_FAILED,
  PART_STOPPED,
  overIndividualsLine,
  overVariantsLine,
  statsFirstText,
  statsRunningLine,
  thresholdLine,
  thresholdValueText,
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

  test("each histogram says how many variants or individuals it is over", () => {
    expect(overVariantsLine(1200)).toBe("Over 1,200 variants");
    expect(overIndividualsLine(1)).toBe("Over 1 individual");
  });

  test("live-stats 2 while the pass runs, each histogram says it is over the variants so far, or over every individual from the variants so far", () => {
    expect(overVariantsLine(523, true)).toBe("Over 523 variants so far");
    expect(overIndividualsLine(200, true)).toBe(
      "Over 200 individuals, from the variants read so far",
    );
  });

  test("live-stats 2 the first plots drawn from a result so far are said once, as drawn from the variants read so far", () => {
    expect(statsFirstText("panel.vcf.gz")).toBe(
      "Plots of panel.vcf.gz are drawn from the variants read so far, and change as the file is read.",
    );
  });
});

describe("thresholds 2 the words of a threshold", () => {
  test("one number where the bins can tell, a range where they cannot, all when it keeps every one", () => {
    const exact = { keptLow: 1050, keptHigh: 1050, withValue: 1200 };
    expect(thresholdLine(0.1, exact, "variant")).toBe(
      "At most 0.1: keeps 1,050 variants and removes 150",
    );
    const range = { keptLow: 1113, keptHigh: 1152, withValue: 1200 };
    expect(thresholdLine(0.05, range, "variant")).toBe(
      "At most 0.05: keeps 1,113 to 1,152 variants and removes 48 to 87",
    );
    const all = { keptLow: 1200, keptHigh: 1200, withValue: 1200 };
    expect(thresholdLine(0.3, all, "variant")).toBe(
      "At most 0.3: keeps all 1,200 variants",
    );
    expect(thresholdValueText(0.3, all, "variant")).toBe(
      "0.3, keeps all 1,200 variants",
    );
    // A range that reaches every variant is still a range.
    const toAll = { keptLow: 1190, keptHigh: 1200, withValue: 1200 };
    expect(thresholdValueText(0.5, toAll, "variant")).toBe(
      "0.5, keeps 1,190 to 1,200 of 1,200 variants",
    );
  });

  test("one, none, and no value at all", () => {
    expect(
      thresholdLine(
        0.2,
        { keptLow: 1, keptHigh: 1, withValue: 3 },
        "individual",
      ),
    ).toBe("At most 0.2: keeps 1 individual and removes 2");
    expect(
      thresholdLine(0, { keptLow: 0, keptHigh: 2, withValue: 1200 }, "variant"),
    ).toBe("At most 0: keeps 0 to 2 variants and removes 1,198 to 1,200");
    expect(
      thresholdLine(1, { keptLow: 1, keptHigh: 1, withValue: 1 }, "variant"),
    ).toBe("At most 1: keeps the only variant");
    expect(
      thresholdLine(0.5, { keptLow: 0, keptHigh: 0, withValue: 0 }, "variant"),
    ).toBe("At most 0.5: no variant has a value");
    // The number as the box shows it, every decimal and no exponent.
    expect(
      thresholdValueText(
        0.00078125,
        { keptLow: 2, keptHigh: 2, withValue: 1200 },
        "variant",
        true,
      ),
    ).toBe("0.00078125, keeps 2 of 1,200 variants so far");
  });
});
