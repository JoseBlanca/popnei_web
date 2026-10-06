import { describe, expect, test } from "vitest";

import {
  PART_FAILED,
  PART_STOPPED,
  overIndividualsLine,
  overVariantsLine,
  statsFirstText,
  statsRunningLine,
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
