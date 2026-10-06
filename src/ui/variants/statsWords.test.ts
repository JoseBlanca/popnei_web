import { describe, expect, test } from "vitest";

import {
  PART_FAILED,
  PART_STOPPED,
  overIndividualsLine,
  overVariantsLine,
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
    expect(PART_STOPPED).toBe("Stopped.");
    expect(PART_FAILED).toBe("Not calculated.");
  });

  test("each histogram says how many variants or individuals it is over", () => {
    expect(overVariantsLine(1200)).toBe("Over 1,200 variants");
    expect(overIndividualsLine(1)).toBe("Over 1 individual");
  });

  test("live-stats 2 while the pass runs, each histogram says it is over the variants or individuals so far", () => {
    expect(overVariantsLine(523, true)).toBe("Over 523 variants so far");
    expect(overIndividualsLine(200, true)).toBe("Over 200 individuals so far");
  });
});
