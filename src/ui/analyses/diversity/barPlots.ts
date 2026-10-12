/**
 * The bar plots of the table of the diversity on popgen2.html
 * (docs/specs/steps/popgen2-populations.md, "The result", the plots of
 * the table): the five columns drawn, in the order the owner gave on
 * 12 October 2026, each headed by the label of its column in the table;
 * the data of each plot, a bar per row of the table in its order, in the
 * group of its population, `populationGroups`, its place among the
 * populations of the project, so that a population has the colour of its
 * line in the plot of the spectrum and of its points in the principal
 * components, and NaN where the table says "no value"; its description, its CSV and the
 * words of its menu. Pure, so that a test in node checks it.
 */
import type { BarsData } from "../../../charts/bars.ts";
import type { DiversityRow } from "../../../core/analyses/diversity.ts";
import { fourDecimals } from "../../../core/analyses/words.ts";
import { tableCsv } from "../../../core/csv.ts";
import { counted, escaped } from "../../../core/project.ts";
import type { Pops } from "../../../worker/protocol.ts";
import { populationGroups } from "../populationGroups.ts";
import { numberHeaders } from "./resultWords.ts";

/** The heading of the section of the plots. */
export const BAR_PLOTS_HEADING = "Bar plots of the table";

/** The line under the heading of the section. */
export const BAR_PLOTS_LINE =
  'One bar per population, in the order of the table. Each population has the colour of its line in the plot of the spectrum, so that it can be followed from plot to plot. A population with no value in the table has the words "no value" in place of its bar.';

/** The words in the row of a population with no value, as the table's. */
const NO_VALUE = "no value";

/** One plot of the table: the column it draws. */
export interface BarPlot {
  /** The value of a row the plot draws. */
  readonly value: (row: DiversityRow) => number | null;
  /** The place of its column among `numberHeaders`. */
  readonly header: number;
  /** What its files are, after the stem of the variants file:
      "diversity.observed_heterozygosity", the name of its column in the
      old page's CSV. */
  readonly file: string;
}

/** The five plots, in their order. */
export const BAR_PLOTS: readonly BarPlot[] = Object.freeze([
  {
    value: (row) => row.expectedHeterozygosity,
    header: 1,
    file: "diversity.expected_heterozygosity_unbiased",
  },
  {
    value: (row) => row.observedHeterozygosity,
    header: 2,
    file: "diversity.observed_heterozygosity",
  },
  {
    value: (row) => row.polymorphic,
    header: 3,
    file: "diversity.proportion_polymorphic",
  },
  {
    value: (row) => row.allelesPerVariantRarefied,
    header: 6,
    file: "diversity.alleles_per_variant_rarefied",
  },
  {
    value: (row) => row.allelesPerVariant,
    header: 5,
    file: "diversity.alleles_per_variant",
  },
]);

/** The heading of `plot`, the label of its column in the table, the
    rarefied one naming the draw of `numCalledAlleles` chromosomes. */
export function barsHeading(plot: BarPlot, numCalledAlleles: number): string {
  const label = numberHeaders(numCalledAlleles)[plot.header];
  if (label === undefined) {
    throw new Error(
      `popnei_web defect: the table of the diversity has no column ${String(plot.header)} of numbers.`,
    );
  }
  return label;
}

/** What the menu of `plot` downloads, after "Download ": "the bar plot
    of observed heterozygosity". */
export function barPlotWhat(plot: BarPlot, numCalledAlleles: number): string {
  const heading = barsHeading(plot, numCalledAlleles);
  return `the bar plot of ${heading.charAt(0).toLowerCase()}${heading.slice(1)}`;
}

/** A value as the table writes it, or "no value". */
function valueText(value: number | null): string {
  return value === null ? NO_VALUE : fourDecimals(value);
}

/** The description of `plot` of `rows`: "3 bars, one per population: p0,
    0.3519; p2, 0.3449; p1, 0.3504."; "1 bar, of Unclassified: 0.3755." */
export function barsDescription(
  rows: readonly DiversityRow[],
  plot: BarPlot,
): string {
  const [only] = rows;
  if (rows.length === 1 && only !== undefined) {
    return `1 bar, of ${escaped(only.population)}: ${valueText(plot.value(only))}.`;
  }
  const each = rows
    .map((row) => `${escaped(row.population)}, ${valueText(plot.value(row))}`)
    .join("; ");
  return `${counted(rows.length, "bar")}, one per population: ${each}.`;
}

/** The data of `plot` of `rows`, the rows of a result in its order, in
    a project whose populations are `pops`, `populationsOf(p)`. */
export function barsDataOf(
  rows: readonly DiversityRow[],
  plot: BarPlot,
  numCalledAlleles: number,
  pops: Pops | "all" | null,
): BarsData {
  const heading = barsHeading(plot, numCalledAlleles);
  const groups = populationGroups(
    rows.map((row) => row.population),
    pops,
  );
  return {
    title: heading,
    description: barsDescription(rows, plot),
    xLabel: heading,
    yLabel: "",
    bars: rows.map((row, index) => {
      const group = groups[index];
      if (group === undefined) {
        throw new Error(
          `popnei_web defect: the bar of ${row.population} has no group.`,
        );
      }
      return {
        name: escaped(row.population),
        group,
        value: plot.value(row) ?? Number.NaN,
      };
    }),
    noValue: NO_VALUE,
  };
}

/** The CSV of `plot`: the table's header of the population and of its
    column, then a row per population, the value as stored and an empty
    field for none. */
export function barsCsv(
  rows: readonly DiversityRow[],
  plot: BarPlot,
  numCalledAlleles: number,
): string {
  return tableCsv(
    ["Population", barsHeading(plot, numCalledAlleles)],
    rows.map((row) => [row.population, plot.value(row)]),
  );
}
