import { describe, expect, test } from "vitest";

import {
  captionText,
  cellText,
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

  test("the line of the options", () => {
    expect(optionsText(20, 0.95)).toBe(
      "A variant counts in a population when at least 20 of its individuals have a called genotype there, and is polymorphic when its commonest allele is below 0.95.",
    );
  });

  test("the line of the versions", () => {
    expect(versionsText("0.1.0", "0.1.0")).toBe(
      "Calculated with popnei 0.1.0, in version 0.1.0 of the application.",
    );
  });

  test("the download is named after the variants file", () => {
    expect(csvName("panel.nei")).toBe("panel.diversity.csv");
    expect(csvName("panel.vcf.gz")).toBe("panel.diversity.csv");
    expect(csvName("panel.vcf")).toBe("panel.diversity.csv");
    expect(csvName("Panel.VCF.GZ")).toBe("Panel.diversity.csv");
    expect(csvName("panel.vcf.bgz")).toBe("panel.vcf.bgz.diversity.csv");
  });
});
