/**
 * The bar plots of the table of the diversity on popgen2.html
 * (docs/specs/steps/popgen2-populations.md, "The result", the plots of
 * the table): the five columns in their order, a bar per row in the
 * group of its place, NaN for no value; the description; the CSV; the
 * names of the files and the words of the menus.
 */
import { describe, expect, test } from "vitest";

import type { DiversityRow } from "../../../core/analyses/diversity.ts";
import {
  BAR_PLOTS,
  barPlotWhat,
  barsCsv,
  barsDataOf,
  barsDescription,
  barsHeading,
} from "./barPlots.ts";

/** A row of `population` with the five values of the plots; the other
    numbers are not drawn. */
function rowOf(
  population: string,
  values: readonly [
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
  ],
): DiversityRow {
  const [he, ho, poly, rarefied, alleles] = values;
  return {
    population,
    individuals: 48,
    expectedHeterozygosity: he,
    observedHeterozygosity: ho,
    polymorphic: poly,
    f: -0.0128,
    allelesPerVariant: alleles,
    allelesPerVariantRarefied: rarefied,
    privateAlleles: 0,
    privateAllelesPerVariant: 0,
    privateAllelesPerVariantRarefied: 0.0031,
  };
}

/** The rows of panel.nei with panel_pops.csv at the missing data of 0.1,
    popnei 0.2.2 under node, 12 October 2026, p0 with no value. */
const ROWS: readonly DiversityRow[] = [
  rowOf("p0", [null, null, null, null, null]),
  rowOf(
    "p2",
    [
      0.344856554637815, 0.3512221180544642, 0.9108333333333334,
      1.9597096939774163, 1.9866666666666666,
    ],
  ),
  rowOf(
    "p1",
    [
      0.35038890489752544, 0.356734697819302, 0.9175, 1.9588173095272452,
      1.9808333333333332,
    ],
  ),
];

describe("PT7 R1.1 the bar plots of the table of the diversity", () => {
  test("five plots, in the order of the owner, headed by the labels of the table's columns, the rarefied one naming the draw", () => {
    expect(BAR_PLOTS.map((plot) => barsHeading(plot, 40))).toEqual([
      "Expected heterozygosity (unbiased)",
      "Observed heterozygosity",
      "Proportion of polymorphic variants",
      "Alleles per variant, rarefied to 40 chromosomes",
      "Alleles per variant",
    ]);
    expect(BAR_PLOTS.map((plot) => plot.file)).toEqual([
      "diversity.expected_heterozygosity_unbiased",
      "diversity.observed_heterozygosity",
      "diversity.proportion_polymorphic",
      "diversity.alleles_per_variant_rarefied",
      "diversity.alleles_per_variant",
    ]);
  });

  test("the data of a plot: a bar per row in its order, in the group of its place, NaN for no value; the texts of the column", () => {
    const [first, , , rarefied] = BAR_PLOTS;
    if (first === undefined || rarefied === undefined) throw new Error("no");
    const data = barsDataOf(ROWS, first, 40);
    expect(data.bars.map((bar) => bar.name)).toEqual(["p0", "p2", "p1"]);
    expect(data.bars.map((bar) => bar.group)).toEqual([0, 1, 2]);
    expect(data.bars[0]?.value).toBeNaN();
    expect(data.bars[1]?.value).toBe(0.344856554637815);
    expect(data.title).toBe("Expected heterozygosity (unbiased)");
    expect(data.xLabel).toBe("Expected heterozygosity (unbiased)");
    expect(data.yLabel).toBe("");
    expect(data.noValue).toBe("no value");
    expect(data.description).toBe(
      "3 bars, one per population: p0, no value; p2, 0.3449; p1, 0.3504.",
    );
    expect(barsDataOf(ROWS, rarefied, 40).bars[2]?.value).toBe(
      1.9588173095272452,
    );
  });

  test("the description of one population, and a name as a text shows it", () => {
    const [first] = BAR_PLOTS;
    if (first === undefined) throw new Error("no plot");
    expect(
      barsDescription(
        [rowOf("Unclassified", [0.3754712450806149, 0, 0, 0, 0])],
        first,
      ),
    ).toBe("1 bar, of Unclassified: 0.3755.");
    const data = barsDataOf([rowOf("a​b", [0.1, 0, 0, 0, 0])], first, 40);
    expect(data.bars[0]?.name).not.toBe("a​b");
  });

  test("the CSV: the table's header of the population and the column, the values as stored, empty for none", () => {
    const [first, , , rarefied] = BAR_PLOTS;
    if (first === undefined || rarefied === undefined) throw new Error("no");
    expect(barsCsv(ROWS, first, 40)).toBe(
      "Population,Expected heterozygosity (unbiased)\np0,\np2,0.344856554637815\np1,0.35038890489752544\n",
    );
    expect(barsCsv(ROWS, rarefied, 40).split("\n")[0]).toBe(
      'Population,"Alleles per variant, rarefied to 40 chromosomes"',
    );
  });

  test("the words of the menu of each plot, after Download", () => {
    expect(BAR_PLOTS.map((plot) => barPlotWhat(plot, 40))).toEqual([
      "the bar plot of expected heterozygosity (unbiased)",
      "the bar plot of observed heterozygosity",
      "the bar plot of proportion of polymorphic variants",
      "the bar plot of alleles per variant, rarefied to 40 chromosomes",
      "the bar plot of alleles per variant",
    ]);
  });
});
