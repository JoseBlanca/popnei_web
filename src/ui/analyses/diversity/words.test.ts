import { describe, expect, test } from "vitest";

import {
  captionText,
  cellText,
  rowCells,
  csvName,
  optionsText,
  populationsText,
  versionsText,
} from "./words.ts";

describe("the words of the panel of the diversity", () => {
  test("the populations a run takes, with their sizes", () => {
    const s = (count: number): string[] =>
      Array.from({ length: count }, (_, i) => `s${String(i)}`);
    expect(
      populationsText([
        ["p0", s(48)],
        ["p2", s(84)],
        ["p1", s(68)],
      ]),
    ).toBe("3 populations: p0, 48 individuals; p2, 84; p1, 68");
    expect(populationsText([["A", s(12)]])).toBe(
      "1 population: A, 12 individuals",
    );
    expect(populationsText([["A", s(1)]])).toBe(
      "1 population: A, 1 individual",
    );
  });

  test("the name of a population is escaped, so that a character that reverses the text shows", () => {
    expect(populationsText([["p1\u202e", ["s0", "s1"]]])).toBe(
      "1 population: p1\\u202e, 2 individuals",
    );
  });

  test("the caption says what the table is over", () => {
    expect(captionText(1152, "panel.nei")).toBe(
      "The diversity of each population, over the 1,152 variants of panel.nei the filters kept.",
    );
  });

  test("a number to four decimals, and no value in words", () => {
    expect(cellText(0.35267894847982756)).toBe("0.3527");
    expect(cellText(0.9266666666666666)).toBe("0.9267");
    expect(cellText(1)).toBe("1.0000");
    expect(cellText(null)).toBe("no value");
  });

  test("a row: the name escaped, the individuals grouped, the numbers to four decimals", () => {
    expect(
      rowCells({
        population: "p1\u200b",
        individuals: 1000,
        expectedHeterozygosity: 0.35267894847982756,
        observedHeterozygosity: null,
        polymorphic: 0.9288194444444444,
      }),
    ).toEqual(["p1\\u200b", "1,000", "0.3527", "no value", "0.9288"]);
  });

  test("the line of the options", () => {
    expect(optionsText(20, 0.95)).toBe(
      "A variant counts in a population when at least 20 of its individuals have a called genotype there, and is polymorphic when its commonest allele is below 0.95.",
    );
  });

  test("the line of the versions", () => {
    expect(versionsText("0.1.0", "0.1.0")).toBe(
      "Calculated with popnei 0.1.0, in version 0.1.0 of the application.",
    );
    // Two versions that differ, so that one in the place of the other
    // shows.
    expect(versionsText("0.1.0", "0.2.0")).toBe(
      "Calculated with popnei 0.1.0, in version 0.2.0 of the application.",
    );
  });

  test("the download is named after the variants file", () => {
    expect(csvName("panel.nei")).toBe("panel.diversity.csv");
    expect(csvName("panel.vcf.gz")).toBe("panel.diversity.csv");
    expect(csvName("panel.vcf")).toBe("panel.diversity.csv");
    expect(csvName("Panel.VCF.GZ")).toBe("Panel.diversity.csv");
    expect(csvName("panel.vcf.bgz")).toBe("panel.vcf.bgz.diversity.csv");
    expect(csvName(".nei")).toBe("project.diversity.csv");
  });
});
