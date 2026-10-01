import { describe, expect, test } from "vitest";

import {
  captionText,
  cellText,
  drawLine,
  drawRefusedText,
  numberHeaders,
  rarefiedText,
  rowCells,
  csvName,
  readyLines,
  thresholdRefusedText,
} from "./words.ts";
import { emptiedText, populationsText } from "../words.ts";

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
    expect(readyLines({ pops, emptied: [] }, 20, false, "populations")).toEqual(
      [
        "3 populations: p0, 32 individuals; p2, 50 individuals; p1, 37 individuals",
      ],
    );
    expect(
      readyLines(
        { pops: [["p0", s(48)]], emptied: ["p9"] },
        20,
        false,
        "populations",
      ),
    ).toEqual([
      "1 population: p0, 48 individuals",
      "p9 has no individual left after the filters of individuals, and is left out. Loosen the filters of individuals in the Variants step to keep it.",
    ]);
    expect(readyLines({ pops, emptied: [] }, 20, true, "populations")).toEqual([
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
    expect(cellText(-0.011344341019483117)).toBe("\u22120.0113");
    expect(cellText(-0.00001)).toBe("0.0000");
    expect(cellText(0.35267894847982756)).toBe("0.3527");
    expect(cellText(0.9266666666666666)).toBe("0.9267");
    expect(cellText(1)).toBe("1.0000");
    expect(cellText(null)).toBe("no value");
  });

  test("PA7 D1 the row p0 of the flow at 0.05, to its end: F with its minus sign, the private alleles a whole number", () => {
    expect(
      rowCells({
        population: "p0",
        individuals: 48,
        expectedHeterozygosity: 0.35267894847982756,
        observedHeterozygosity: 0.35667985874177544,
        polymorphic: 0.9288194444444444,
        f: -0.011344341019483117,
        allelesPerVariant: 1.9791666666666667,
        allelesPerVariantRarefied: 1.9646163579517928,
        privateAlleles: 0,
        privateAllelesPerVariant: 0,
        privateAllelesPerVariantRarefied: 0.0028348059148665707,
      }),
    ).toEqual([
      "p0",
      "48",
      "0.3527",
      "0.3567",
      "0.9288",
      "\u22120.0113",
      "1.9792",
      "1.9646",
      "0",
      "0.0000",
      "0.0028",
    ]);
    expect(
      rowCells({
        population: "p2",
        individuals: 84,
        expectedHeterozygosity: 0.3440824705971255,
        observedHeterozygosity: 0.3512406974637824,
        polymorphic: 0.9105902777777778,
        f: -0.020803811522959625,
        allelesPerVariant: 1.9861111111111112,
        allelesPerVariantRarefied: 1.9595644507442256,
        privateAlleles: 1234,
        privateAllelesPerVariant: 0.0008680555555555555,
        privateAllelesPerVariantRarefied: 0.0031646710919597015,
      })[8],
    ).toBe("1,234");
  });

  test("PA7 D1 the headers of the eleven columns name the draw of the result in the rarefied ones, and the line beside the download says it", () => {
    expect(numberHeaders(40)).toEqual([
      "Individuals",
      "Expected heterozygosity (unbiased)",
      "Observed heterozygosity",
      "Proportion of polymorphic variants",
      "F",
      "Alleles per variant",
      "Alleles per variant, rarefied to 40 chromosomes",
      "Private alleles",
      "Private alleles per variant",
      "Private alleles per variant, rarefied to 40 chromosomes",
    ]);
    expect(numberHeaders(1000)[6]).toBe(
      "Alleles per variant, rarefied to 1,000 chromosomes",
    );
    expect(rarefiedText(96)).toBe("Rarefied to 96 chromosomes.");
  });

  test("a row: the name escaped, the individuals grouped, the numbers to four decimals", () => {
    expect(
      rowCells({
        population: "p1\u200b",
        individuals: 1000,
        expectedHeterozygosity: 0.35267894847982756,
        observedHeterozygosity: null,
        polymorphic: 0.9288194444444444,
        f: null,
        allelesPerVariant: null,
        allelesPerVariantRarefied: null,
        privateAlleles: null,
        privateAllelesPerVariant: null,
        privateAllelesPerVariantRarefied: null,
      }),
    ).toEqual([
      "p1\\u200b",
      "1,000",
      "0.3527",
      "no value",
      "0.9288",
      "no value",
      "no value",
      "no value",
      "no value",
      "no value",
      "no value",
    ]);
  });

  test("the download is named after the variants file", () => {
    expect(csvName("panel.nei")).toBe("panel.diversity.csv");
    expect(csvName("panel.vcf.gz")).toBe("panel.diversity.csv");
    expect(csvName("panel.vcf")).toBe("panel.diversity.csv");
    expect(csvName("Panel.VCF.GZ")).toBe("Panel.diversity.csv");
    expect(csvName("panel.vcf.bgz")).toBe("panel.vcf.bgz.diversity.csv");
    expect(csvName(".nei")).toBe("project.diversity.csv");
  });

  test("IP5 D3 the lines of the ready state on the one population, with and without a metadata file", () => {
    const s = (count: number): string[] =>
      Array.from({ length: count }, (_, i) => `s${String(i)}`);
    const all = { pops: [["All individuals", s(200)]], emptied: [] } as const;
    expect(readyLines(all, 20, false, "noFile")).toEqual([
      "1 population, All individuals: 200 individuals",
      "No metadata file: every individual is in one population.",
    ]);
    expect(readyLines(all, 20, false, "onePopulation")).toEqual([
      "1 population, All individuals: 200 individuals",
    ]);
    expect(readyLines(all, 20, true, "noFile")).toEqual([
      "1 population, All individuals: 200 individuals",
      "No metadata file: every individual is in one population.",
      "Run calculates the statistics of each individual first, and the populations may lose individuals to the thresholds.",
    ]);
    expect(
      readyLines(
        { pops: [["All individuals", s(1)]], emptied: [] },
        1,
        false,
        "onePopulation",
      ),
    ).toEqual(["1 population, All individuals: 1 individual"]);
    expect(
      readyLines(
        { pops: [["All individuals", s(12)]], emptied: [] },
        20,
        false,
        "onePopulation",
      ),
    ).toEqual([
      "1 population, All individuals: 12 individuals",
      "All individuals has 12 individuals, fewer than the minimum of 20, so it will have no values.",
    ]);
  });
});

describe("PA7 D1 the words of the options of the diversity", () => {
  const s = (count: number): string[] =>
    Array.from({ length: count }, (_, i) => `s${String(i)}`);

  test("the ready state names a population under the minimum after the populations, and several together", () => {
    const pops = [
      ["p0", s(48)],
      ["p3", s(12)],
      ["p1", s(68)],
    ] as const;
    expect(readyLines({ pops, emptied: [] }, 20, false, "populations")).toEqual(
      [
        "3 populations: p0, 48 individuals; p3, 12 individuals; p1, 68 individuals",
        "p3 has 12 individuals, fewer than the minimum of 20, so it will have no values, and is left out of the count of the private alleles of the others.",
      ],
    );
    expect(
      readyLines(
        { pops: [...pops, ["p5", s(8)]], emptied: ["p9"] },
        20,
        true,
        "populations",
      ),
    ).toEqual([
      "4 populations: p0, 48 individuals; p3, 12 individuals; p1, 68 individuals; p5, 8 individuals",
      "p3 and p5 have 12 and 8 individuals, fewer than the minimum of 20, so they will have no values, and are left out of the count of the private alleles of the others.",
      "p9 has no individual left after the filters of individuals, and is left out. Loosen the filters of individuals in the Variants step to keep it.",
      "Run calculates the statistics of each individual first, and the populations may lose individuals to the thresholds.",
    ]);
    // With no other population to count private alleles against, the
    // shorter words: one population of the minimum, or none.
    expect(
      readyLines(
        {
          pops: [
            ["p0", s(48)],
            ["p3", s(12)],
          ],
          emptied: [],
        },
        20,
        false,
        "populations",
      )[1],
    ).toBe(
      "p3 has 12 individuals, fewer than the minimum of 20, so it will have no values.",
    );
    expect(
      readyLines({ pops, emptied: [] }, 100, false, "populations")[1],
    ).toBe(
      "p0, p3 and p1 have 48, 12 and 68 individuals, fewer than the minimum of 100, so they will have no values.",
    );
    expect(
      readyLines(
        { pops: [["p3", s(12)]], emptied: [] },
        20,
        false,
        "populations",
      )[1],
    ).toBe(
      "p3 has 12 individuals, fewer than the minimum of 20, so it will have no values.",
    );
    // A population of the minimum exactly is not under it.
    expect(readyLines({ pops, emptied: [] }, 12, false, "populations")).toEqual(
      [
        "3 populations: p0, 48 individuals; p3, 12 individuals; p1, 68 individuals",
      ],
    );
  });

  test("the line of the default draw, from the ploidy and the minimum, and before the variants file is read", () => {
    expect(
      drawLine({
        kind: "read",
        typed: false,
        ploidy: 2,
        minNumIndividuals: 20,
        defaultDraw: 40,
      }),
    ).toBe(
      "The default: the ploidy, 2, times the minimum number of individuals, 20. The alleles and the private alleles of every population are also given for a draw of this many chromosomes, so that populations of different sizes can be compared, and the site frequency spectrum below the table is of the same draw.",
    );
    expect(
      drawLine({ kind: "unread", typed: false, minNumIndividuals: 20 }),
    ).toBe(
      "The default: the ploidy of the variants file times the minimum number of individuals, 20.",
    );
  });

  test("PA10 below 2, the least draw, the line of the default says and at least 2", () => {
    expect(
      drawLine({
        kind: "read",
        typed: false,
        ploidy: 1,
        minNumIndividuals: 0,
        defaultDraw: 2,
      }),
    ).toBe(
      "The default: the ploidy, 1, times the minimum number of individuals, 0, and at least 2. The alleles and the private alleles of every population are also given for a draw of this many chromosomes, so that populations of different sizes can be compared, and the site frequency spectrum below the table is of the same draw.",
    );
    expect(
      drawLine({ kind: "unread", typed: false, minNumIndividuals: 1 }),
    ).toBe(
      "The default: the ploidy of the variants file times the minimum number of individuals, 1, and at least 2.",
    );
    expect(
      drawLine({ kind: "unread", typed: true, minNumIndividuals: 0 }),
    ).toMatch(
      /^Typed; the default would be the ploidy of the variants file times the minimum number of individuals, 0, and at least 2\. /,
    );
  });

  test("PA10 the ready state names the populations of the minimum that hold fewer chromosomes than the draw, one, two or three, and more", () => {
    const pops = [
      ["p0", Array.from({ length: 48 }, (_, i) => `a${String(i)}`)],
      ["p2", Array.from({ length: 84 }, (_, i) => `b${String(i)}`)],
      ["p1", Array.from({ length: 68 }, (_, i) => `c${String(i)}`)],
    ] as const;
    const kept = { pops, emptied: [] };
    expect(
      readyLines(kept, 20, false, "populations", {
        numCalledAlleles: 120,
        ploidy: 2,
      }).slice(1),
    ).toEqual([
      "p0 holds 96 chromosomes, fewer than the 120 the rarefaction draws, so it will have no rarefied values and no spectrum. Lower the number of chromosomes, above, to have them.",
    ]);
    expect(
      readyLines(kept, 20, false, "populations", {
        numCalledAlleles: 150,
        ploidy: 2,
      }).slice(1),
    ).toEqual([
      "p0 and p1 hold 96 and 136 chromosomes, fewer than the 150 the rarefaction draws, so they will have no rarefied values and no spectrum. Lower the number of chromosomes, above, to have them.",
    ]);
    // At the draw a population holds, and at the default, no line.
    expect(
      readyLines(kept, 20, false, "populations", {
        numCalledAlleles: 96,
        ploidy: 2,
      }),
    ).toHaveLength(1);
    // A population under the minimum is named by its own line, not this.
    expect(
      readyLines(kept, 50, false, "populations", {
        numCalledAlleles: 120,
        ploidy: 2,
      }).slice(1),
    ).toEqual([
      "p0 has 48 individuals, fewer than the minimum of 50, so it will have no values, and is left out of the count of the private alleles of the others.",
    ]);
    const four = [
      ...pops,
      ["p3", Array.from({ length: 30 }, (_, i) => `d${String(i)}`)],
      ["p5", Array.from({ length: 20 }, (_, i) => `e${String(i)}`)],
    ] as const;
    expect(
      readyLines({ pops: four, emptied: [] }, 20, false, "populations", {
        numCalledAlleles: 160,
        ploidy: 2,
      }).slice(1),
    ).toEqual([
      "p0, p1 and 2 more hold fewer chromosomes than the 160 the rarefaction draws, so they will have no rarefied values and no spectrum. Lower the number of chromosomes, above, to have them.",
    ]);
  });

  test("the review of PA10: three populations short of the draw are named with their counts", () => {
    const pops = [
      ["p0", Array.from({ length: 48 }, (_, i) => `a${String(i)}`)],
      ["p2", Array.from({ length: 84 }, (_, i) => `b${String(i)}`)],
      ["p1", Array.from({ length: 68 }, (_, i) => `c${String(i)}`)],
    ] as const;
    expect(
      readyLines({ pops, emptied: [] }, 20, false, "populations", {
        numCalledAlleles: 170,
        ploidy: 2,
      }).slice(1),
    ).toEqual([
      "p0, p2 and p1 hold 96, 168 and 136 chromosomes, fewer than the 170 the rarefaction draws, so they will have no rarefied values and no spectrum. Lower the number of chromosomes, above, to have them.",
    ]);
  });

  test("the review of PA10: one haploid individual, which holds fewer than 2 chromosomes, takes no draw, and the ready state has no line of the draw", () => {
    const pops = [["p0", ["a0"]]] as const;
    expect(
      readyLines({ pops, emptied: [] }, 1, false, "populations", {
        numCalledAlleles: 2,
        ploidy: 1,
      }),
    ).toEqual(["1 population: p0, 1 individual"]);
  });

  test("the review of PA10: at the ploidy 2 and a minimum of 1 the default is 2, the least draw, and the line does not say at least 2", () => {
    expect(
      drawLine({
        kind: "read",
        typed: false,
        ploidy: 2,
        minNumIndividuals: 1,
        defaultDraw: 2,
      }),
    ).toMatch(
      /^The default: the ploidy, 2, times the minimum number of individuals, 1\. The alleles/,
    );
  });

  test("a draw typed says what the default would be", () => {
    expect(
      drawLine({
        kind: "read",
        typed: true,
        ploidy: 4,
        minNumIndividuals: 1000,
        defaultDraw: 4000,
      }),
    ).toBe(
      "Typed; the default would be 4,000. The alleles and the private alleles of every population are also given for a draw of this many chromosomes, so that populations of different sizes can be compared, and the site frequency spectrum below the table is of the same draw.",
    );
    expect(
      drawLine({ kind: "unread", typed: true, minNumIndividuals: 20 }),
    ).toBe(
      "Typed; the default would be the ploidy of the variants file times the minimum number of individuals, 20. The alleles and the private alleles of every population are also given for a draw of this many chromosomes, so that populations of different sizes can be compared, and the site frequency spectrum below the table is of the same draw.",
    );
  });

  test("the refusals of the frequency and of the number of chromosomes, with what is kept", () => {
    expect(
      thresholdRefusedText(
        { kind: "aboveMax", typed: "1.5", maxValue: 1 },
        0.95,
      ),
    ).toBe("1.5 is more than 1; the frequency stays 0.95.");
    expect(
      thresholdRefusedText(
        { kind: "offStep", typed: "0.955", decimals: 2 },
        0.95,
      ),
    ).toBe("0.955 has more than two decimals; the frequency stays 0.95.");
    expect(thresholdRefusedText({ kind: "notTaken", text: "," }, 0.95)).toBe(
      "Write the decimals with a point, 0.1 and not 0,1; the frequency stays 0.95.",
    );
    expect(thresholdRefusedText({ kind: "notTaken", text: "-" }, 0.95)).toBe(
      "‘-’ cannot be typed in the frequency, which is written with digits and a point, as 0.95; the frequency stays 0.95.",
    );
    expect(
      drawRefusedText({ kind: "belowMin", typed: "1", minValue: 2 }, 40),
    ).toBe("1 is less than 2; the number of chromosomes stays 40.");
    expect(
      drawRefusedText(
        { kind: "aboveMax", typed: "5000000000", maxValue: 4294967295 },
        4000,
      ),
    ).toBe(
      "5,000,000,000 is more than 4,294,967,295; the number of chromosomes stays 4,000.",
    );
    expect(
      drawRefusedText({ kind: "offStep", typed: "2.5", decimals: 0 }, 40),
    ).toBe("2.5 is not a whole number; the number of chromosomes stays 40.");
    expect(drawRefusedText({ kind: "notTaken", text: "," }, 40)).toBe(
      "Write the number of chromosomes with digits alone, 2400 and not 2,400 or 40,0; the number of chromosomes stays 40.",
    );
    expect(
      drawRefusedText(
        { kind: "belowMin", typed: "1", minValue: 2 },
        Number.NaN,
      ),
    ).toBe("1 is less than 2; the number of chromosomes stays the default.");
  });
});
