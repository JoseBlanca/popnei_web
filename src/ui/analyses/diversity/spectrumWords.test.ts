/**
 * The words of the block of the spectrum (docs/specs/analyses/sfs.md,
 * "The block of the panel", "What it shows" and "Its words"), on the
 * worked example of the spec: a draw of 4, p0 with the spectrum 1, 2, 2 of
 * 5 variants in the draw, p1 with 3, 0, 0 of 3, and p3 not calculated.
 */
import { describe, expect, test } from "vitest";

import type { SpectrumOfPop } from "../../../core/analyses/sfs.ts";
import {
  SPECTRUM_TABLE_WHAT,
  drawLineOf,
  populationValues,
  noSpectrumLine,
  populationCells,
  populationColumns,
  spectrumCaption,
  allSpectraCsvName,
  spectrumDescription,
  tooManyBarsLine,
  underHistogramsLine,
  xLabelOf,
  LINES_WHAT,
  halfPointsLine,
  linesCaption,
  linesDescription,
  tooManyPointsLine,
  variantsInDrawLine,
} from "./spectrumWords.ts";

const P0: SpectrumOfPop = {
  population: "p0",
  numIndividuals: 30,
  calculated: true,
  variantsInDraw: 5,
  expected: Float64Array.from([1, 2, 2]),
  shares: Float64Array.from([0.5, 0.5]),
};
const P1: SpectrumOfPop = {
  population: "p1",
  numIndividuals: 30,
  calculated: true,
  variantsInDraw: 3,
  expected: Float64Array.from([3, 0, 0]),
  shares: null,
};
const P3: SpectrumOfPop = {
  population: "p3",
  numIndividuals: 12,
  calculated: false,
  variantsInDraw: 0,
  expected: new Float64Array(0),
  shares: null,
};
const EMPTY: SpectrumOfPop = { ...P1, population: "p4", variantsInDraw: 0 };

describe("PA7 D2 the words of the block of the spectrum", () => {
  test("the caption names the draw, the variants kept and where the draw is set", () => {
    expect(spectrumCaption(40, 1200, "panel.nei")).toBe(
      "The folded site frequency spectrum of each population, in a draw of 40 of its chromosomes at each variant, over the 1,200 variants of panel.nei the filters kept. The number of chromosomes is set above the table, with the rarefaction.",
    );
  });

  test("the line under a heading, and the description of the histogram with its largest share", () => {
    expect(drawLineOf(P0)).toBe(
      "5 variants in the draw, about 4 of them with both alleles",
    );
    expect(
      drawLineOf({
        ...P0,
        variantsInDraw: 1200,
        expected: Float64Array.from([44.8, 600.1, 555.1]),
      }),
    ).toBe("1,200 variants in the draw, about 1,155 of them with both alleles");
    expect(
      spectrumDescription(
        { ...P0, shares: Float64Array.from([0.2, 0.5, 0.3]) },
        6,
      ),
    ).toBe(
      // It starts at its numbers: the title of the plot, "The spectrum of
      // p0", is read before it.
      "5 variants in the draw of 6 chromosomes, about 4 with both alleles, in 3 bars from 1 to 3 copies of the rarer allele; the largest share, 0.5000, at 2.",
    );
    expect(() => spectrumDescription(P1, 4)).toThrow(/popnei_web defect/);
  });

  test("the lines in place of a histogram: not calculated, no variant in the draw, one allele only, and none for a population with shares", () => {
    expect(noSpectrumLine(P3, 20, 40)).toBe(
      "p3 has 12 individuals, fewer than the 20 a variant needs to count for a population, so it has no spectrum.",
    );
    // With the minimum of individuals and not calculated: the populations
    // hold fewer than 2 chromosomes, one haploid individual.
    expect(
      noSpectrumLine(
        { ...P3, population: "All individuals", numIndividuals: 1 },
        1,
        2,
      ),
    ).toBe(
      "All individuals holds fewer than 2 chromosomes, the least a draw takes, so it has no spectrum.",
    );
    expect(noSpectrumLine(EMPTY, 20, 40)).toBe(
      "p4 has no variant with 40 called chromosomes, so it has no spectrum.",
    );
    expect(noSpectrumLine(P1, 20, 4)).toBe(
      "Every variant of p1 in the draw shows one allele only, so its spectrum has no bar.",
    );
    expect(noSpectrumLine(P0, 20, 4)).toBeNull();
  });

  test("the axis, the line under the histograms of an even and an odd draw, and too many bars", () => {
    expect(xLabelOf(40)).toBe(
      "Copies of the rarer allele among 40 chromosomes",
    );
    expect(underHistogramsLine(40)).toBe(
      "Each bar is the share of the population's variants, among those that show both alleles in a draw of 40 chromosomes, whose rarer allele is expected in that many of the 40. The last bar, 20, holds one count where the others hold two, such as 1 and 39, so it is about half as tall. The variants that show one allele only in the draw are in the table and not drawn.",
    );
    expect(underHistogramsLine(41)).toBe(
      "Each bar is the share of the population's variants, among those that show both alleles in a draw of 41 chromosomes, whose rarer allele is expected in that many of the 41. The variants that show one allele only in the draw are in the table and not drawn.",
    );
    expect(tooManyBarsLine(2400)).toBe(
      "A draw of 2,400 chromosomes gives 1,200 bars per population, too many to draw. The table and the CSV hold them.",
    );
  });

  test("the columns and cells of the table, and the name of the download", () => {
    expect(populationColumns("p0")).toEqual(["p0, variants", "p0, share"]);
    expect(populationCells(P0, 0)).toEqual(["1.0", "not drawn"]);
    expect(populationCells(P0, 1)).toEqual(["2.0", "0.5000"]);
    expect(populationCells(P1, 2)).toEqual(["0.0", "no value"]);
    // A population not calculated keeps its columns, with no value.
    expect(populationCells(P3, 0)).toEqual(["no value", "no value"]);
    expect(populationCells(P3, 1)).toEqual(["no value", "no value"]);
    // The expected numbers with a comma between thousands.
    expect(
      populationCells(
        { ...P0, expected: Float64Array.from([1234.56, 2, 2]) },
        0,
      ),
    ).toEqual(["1,234.6", "not drawn"]);
    expect(allSpectraCsvName("panel.vcf.gz")).toBe("panel.sfs.csv");
  });
});

describe("PT2 D1 the downloads of the spectrum on popgen2.html", () => {
  test("what each menu downloads, for a screen reader", () => {
    expect(SPECTRUM_TABLE_WHAT).toBe("the table of the spectrum");
  });

  test("the file of the table of the spectrum", () => {
    expect(allSpectraCsvName("panel.nei")).toBe("panel.sfs.csv");
  });

  test("the values of a population's cells as stored, which the CSV of the table holds: the expected number and the share, none for bin 0, for no shares, or for a population not calculated", () => {
    expect(populationValues(P0, 0)).toEqual([1, null]);
    expect(populationValues(P0, 1)).toEqual([2, 0.5]);
    expect(populationValues(P1, 1)).toEqual([0, null]);
    expect(populationValues(P3, 1)).toEqual([null, null]);
  });
});

describe("PT7 R1.2 the words of the plot of the spectrum as lines", () => {
  test("the caption says what each axis is, that the variants with no copy of the rarer allele are left out, and where the table and the draw are", () => {
    expect(linesCaption(40, 1200, "panel.nei")).toBe(
      "The folded site frequency spectrum of each population, in a draw of 40 of its chromosomes at each variant, over the 1,200 variants of panel.nei the filters kept. Each line is a population: across, the frequency of the commonest allele in the draw, 1 \u2212 j/40 for j copies of the rarer allele; up, the proportion of the population's variants with both alleles in the draw that have that frequency. Variants with no copy of the rarer allele in the draw are left out of the plot and of the proportions; the table holds them. The number of chromosomes is set above the table, with the rarefaction.",
    );
  });

  test("the line of the variants in the draw, which the proportions are over", () => {
    expect(
      variantsInDrawLine([
        { population: "p0", bothAlleles: 1155.2067685551308 },
        { population: "p2", bothAlleles: 1151.6516327728993 },
      ]),
    ).toBe(
      "Each proportion is over the population's variants with both alleles in the draw: p0, about 1,155; p2, about 1,152.",
    );
  });

  test("the line of the points at 0.5 for an even draw, none for an odd one", () => {
    expect(halfPointsLine(40)).toBe(
      "The points at 0.5 hold one count of the rarer allele, 20, where the others hold two, such as 1 and 39, so they are about half as high.",
    );
    expect(halfPointsLine(41)).toBeNull();
  });

  test("review of round 1: a draw of 2 has its one point at 0.5, with no other to be half of, and no such line", () => {
    expect(halfPointsLine(2)).toBeNull();
    expect(halfPointsLine(4)).toBe(
      "The points at 0.5 hold one count of the rarer allele, 2, where the others hold two, such as 1 and 3, so they are about half as high.",
    );
  });

  test("review of round 1: a population whose variants with both alleles sum to less than 1 has fewer than 1, not about 0", () => {
    expect(
      variantsInDrawLine([
        { population: "p0", bothAlleles: 0.4 },
        { population: "p2", bothAlleles: 0.5 },
        { population: "p1", bothAlleles: 1 },
      ]),
    ).toBe(
      "Each proportion is over the population's variants with both alleles in the draw: p0, fewer than 1; p2, fewer than 1; p1, about 1.",
    );
  });

  test("the description: the lines, their populations, their points and the largest proportion", () => {
    const line = (
      population: string,
      index: number,
      proportion: readonly number[],
    ): {
      population: string;
      index: number;
      frequency: Float64Array;
      proportion: Float64Array;
      variants: Float64Array;
    } => ({
      population,
      index,
      frequency: Float64Array.from([0.975, 0.625, 0.5]),
      proportion: Float64Array.from(proportion),
      variants: Float64Array.from([1, 1, 1]),
    });
    expect(
      linesDescription({
        numCalledAlleles: 40,
        lines: [
          line("p0", 0, [0.03, 0.05, 0.02]),
          line("p2", 1, [0.04, 0.01, 0.02]),
          line("p1", 2, [0.03, 0.05386774831954687, 0.02]),
        ],
        largestProportion: 0.05386774831954687,
      }),
    ).toBe(
      "3 lines, one per population, p0, p2 and p1, of 3 points each, from 0.5 to 0.975 of the commonest allele; the largest proportion, 0.0539, of p1 at 0.625.",
    );
    expect(
      linesDescription({
        numCalledAlleles: 40,
        lines: [line("Unclassified", 0, [0.03, 0.05, 0.02])],
        largestProportion: 0.05,
      }),
    ).toBe(
      "1 line, of Unclassified, of 3 points, from 0.5 to 0.975 of the commonest allele; the largest proportion, 0.0500, at 0.625.",
    );
  });

  test("too many points, the line of a population with no line, and what the menu downloads", () => {
    expect(tooManyPointsLine(20000, 3)).toBe(
      "A draw of 20,000 chromosomes gives 10,000 points to each of the 3 lines, too many to draw. The table of the spectrum holds them.",
    );
    expect(noSpectrumLine(P1, 20, 4, "line")).toBe(
      "Every variant of p1 in the draw shows one allele only, so its spectrum has no line.",
    );
    expect(noSpectrumLine(P1, 20, 4)).toBe(
      "Every variant of p1 in the draw shows one allele only, so its spectrum has no bar.",
    );
    expect(LINES_WHAT).toBe("the plot of the spectrum");
  });
});
