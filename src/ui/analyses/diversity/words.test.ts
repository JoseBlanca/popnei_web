import { describe, expect, test } from "vitest";

import {
  captionText,
  cellText,
  rowCells,
  csvName,
  emptiedText,
  optionsText,
  populationsText,
  readyLines,
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
    ).toBe(
      "3 populations: p0, 48 individuals; p2, 84 individuals; p1, 68 individuals",
    );
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

  test("VS7 D2 the populations the filters of individuals leave empty are named, one or several", () => {
    expect(emptiedText(["p9"])).toBe(
      "p9 has no individual left after the filters of individuals, and is left out. Loosen the filters of individuals in the Variants step to keep it.",
    );
    expect(emptiedText(["p1", "p2"])).toBe(
      "p1 and p2 have no individual left after the filters of individuals, and are left out. Loosen the filters of individuals in the Variants step to keep them.",
    );
    expect(emptiedText(["p1", "p2", "p3", "p4"])).toBe(
      "p1, p2 and 2 more have no individual left after the filters of individuals, and are left out. Loosen the filters of individuals in the Variants step to keep them.",
    );
    expect(emptiedText(["p1\u202e"])).toBe(
      "p1\\u202e has no individual left after the filters of individuals, and is left out. Loosen the filters of individuals in the Variants step to keep it.",
    );
  });

  test("VS7 D2 the lines of the ready state: the populations kept, those left empty, and the wait for the statistics", () => {
    const s = (count: number): string[] =>
      Array.from({ length: count }, (_, i) => `s${String(i)}`);
    const pops = [
      ["p0", s(32)],
      ["p2", s(50)],
      ["p1", s(37)],
    ] as const;
    expect(readyLines({ pops, emptied: [] }, false)).toEqual([
      "3 populations: p0, 32 individuals; p2, 50 individuals; p1, 37 individuals",
    ]);
    expect(
      readyLines({ pops: [["p0", s(48)]], emptied: ["p9"] }, false),
    ).toEqual([
      "1 population: p0, 48 individuals",
      "p9 has no individual left after the filters of individuals, and is left out. Loosen the filters of individuals in the Variants step to keep it.",
    ]);
    expect(readyLines({ pops, emptied: [] }, true)).toEqual([
      "3 populations: p0, 32 individuals; p2, 50 individuals; p1, 37 individuals",
      "Run calculates the statistics of each individual first, and the populations may lose individuals to the thresholds.",
    ]);
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

  test("the download is named after the variants file", () => {
    expect(csvName("panel.nei")).toBe("panel.diversity.csv");
    expect(csvName("panel.vcf.gz")).toBe("panel.diversity.csv");
    expect(csvName("panel.vcf")).toBe("panel.diversity.csv");
    expect(csvName("Panel.VCF.GZ")).toBe("Panel.diversity.csv");
    expect(csvName("panel.vcf.bgz")).toBe("panel.vcf.bgz.diversity.csv");
    expect(csvName(".nei")).toBe("project.diversity.csv");
  });
});
