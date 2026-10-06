/**
 * What each histogram of the statistics of the open file on popgen2.html
 * draws (docs/plans/file-stats.md, "Where it goes"): its title, its axes,
 * its bins and its description, and the line under its title that says
 * how many variants or individuals are in its bins. The words are those
 * of the old page's histograms, with no mean in the titles. Each axis
 * spans the range of the values, rounded out to round numbers, the
 * missing rates from 0 (the owner, 6 October 2026): the variants' bins
 * are popnei's added up, `variantBinsRounded`, those of the individuals
 * made from popnei's values over that range, `binValuesRounded`. Pure, so
 * that a test in node checks the counts, a value of NaN among them; the
 * section draws them.
 */
import {
  variantBinsRounded,
  variantHistogramDescription,
} from "../../core/analyses/variantChecks.ts";
import type { VariantStatistic } from "../../core/analyses/variantChecks.ts";
import { individualHistogramDescription } from "../../core/analyses/individualChecks.ts";
import type { IndividualStatistic } from "../../core/analyses/individualChecks.ts";
import { INDIVIDUAL_BINS, binValuesRounded } from "../../core/histogram.ts";
import { histogramRows } from "../../charts/histogram.ts";
import type { HistogramData } from "../../charts/histogram.ts";
import type {
  IndividualStatsPart,
  VariantStatsPart,
} from "../../worker/protocol.ts";
import { VARIANT_HISTOGRAMS } from "../steps/variants/histogramWords.ts";
import {
  INDIVIDUALS_LABEL,
  INDIVIDUAL_HISTOGRAMS,
  noHeterozygosityText,
} from "../steps/variants/individualStats.ts";
import {
  individualTitle,
  overIndividualsLine,
  overVariantsLine,
  variantTitle,
} from "./statsWords.ts";

/** One histogram of the section. */
export interface StatsPlot {
  /** What the plot draws, its title among it. */
  readonly data: HistogramData;
  /** The line under the title, "Over 1,200 variants", those in its
      bins. */
  readonly countLine: string;
}

/** A histogram of the individuals, and what is said of those in none of
    its bins. */
export interface IndividualPlot {
  /** The histogram, or `null` when no individual has a value. */
  readonly plot: StatsPlot | null;
  /** The line under it of the individuals with no called genotype, or
      `null` when every one has a value. */
  readonly noValueLine: string | null;
}

/** The histogram of the variants of `statistic`, popnei's bins added up
    over the range of those with a count, rounded out, over the variants
    in them, which leaves out a variant with no value. */
export function variantPlot(
  statistic: VariantStatistic,
  result: VariantStatsPart,
): StatsPlot {
  const words = VARIANT_HISTOGRAMS[statistic];
  const bins = variantBinsRounded(result, statistic);
  const plotted = {
    title: variantTitle(statistic),
    xLabel: words.name,
    yLabel: words.countLabel,
    edges: bins.edges,
    counts: bins.counts,
    threshold: null,
  };
  const rows = histogramRows({ ...plotted, description: "" });
  return {
    data: {
      ...plotted,
      description: variantHistogramDescription(statistic, rows, null),
    },
    countLine: overVariantsLine(sumOf(bins.counts)),
  };
}

/** The histogram of the individuals of `statistic`, its values binned
    over their range rounded out, the missing rate from 0, over the
    individuals with a value. */
export function individualPlot(
  statistic: IndividualStatistic,
  result: IndividualStatsPart,
): IndividualPlot {
  const words = INDIVIDUAL_HISTOGRAMS[statistic];
  const values =
    statistic === "missingGenotypes" ? result.missingGtRate : result.obsHetRate;
  const bins = binValuesRounded(
    values,
    INDIVIDUAL_BINS,
    statistic === "missingGenotypes",
  );
  // binValues gives no bins only when every value is NaN.
  const noValueLine = noHeterozygosityText(
    bins === null ? values.length : bins.numNaN,
  );
  if (bins === null) return { plot: null, noValueLine };
  const plotted = {
    title: individualTitle(statistic),
    xLabel: words.xLabel,
    yLabel: INDIVIDUALS_LABEL,
    edges: bins.edges,
    counts: bins.counts,
    threshold: null,
  };
  const rows = histogramRows({ ...plotted, description: "" });
  return {
    plot: {
      data: {
        ...plotted,
        description: individualHistogramDescription(statistic, rows, null),
      },
      countLine: overIndividualsLine(sumOf(bins.counts)),
    },
    noValueLine,
  };
}

/** The sum of the counts of the bins. */
function sumOf(counts: Uint32Array): number {
  return counts.reduce((sum, count) => sum + count, 0);
}
