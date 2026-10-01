/**
 * The words of the block of the spectrum (docs/specs/analyses/sfs.md,
 * "The block of the panel", "What it shows" and "Its words"), on the
 * worked example of the spec: a draw of 4, p0 with the spectrum 1, 2, 2 of
 * 5 variants in the draw, p1 with 3, 0, 0 of 3, and p3 not calculated.
 */
import { describe, expect, test } from "vitest";

import type { SpectrumOfPop } from "../../../core/analyses/sfs.ts";
import {
  drawLineOf,
  noSpectrumLine,
  populationCells,
  populationColumns,
  spectrumCaption,
  spectrumCsvName,
  spectrumDescription,
  tooManyBarsLine,
  underHistogramsLine,
  xLabelOf,
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
      "The spectrum of p0: 5 variants in the draw of 6 chromosomes, about 4 with both alleles, in 3 bars from 1 to 3 copies of the rarer allele; the largest share, 0.5000, at 2.",
    );
    expect(() => spectrumDescription(P1, 4)).toThrow(/popnei_web defect/);
  });

  test("the lines in place of a histogram: not calculated, no variant in the draw, one allele only, and none for a population with shares", () => {
    expect(noSpectrumLine(P3, 20, 40)).toBe(
      "p3 has 12 individuals, fewer than the 20 a variant needs to count for a population, so it has no spectrum.",
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
    expect(spectrumCsvName("panel.vcf.gz")).toBe("panel.sfs.csv");
  });
});
