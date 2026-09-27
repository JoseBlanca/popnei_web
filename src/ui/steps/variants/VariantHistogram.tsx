/**
 * One histogram of the variants beside its filter
 * (docs/specs/steps/variants.md, "The histograms beside the filters of
 * the variants"): the bins popnei gave for its statistic, with the
 * threshold of its filter while the filter is on, the number typed while
 * it is typed, and the texts the step writes for it, its title, its axes,
 * its legend, its description, the line of its threshold, its table and
 * the name of its CSV.
 */
import { useMemo } from "react";

import {
  binsCsvName,
  variantHistogramDescription,
} from "../../../core/analyses/variantChecks.ts";
import type { VariantStatistic } from "../../../core/analyses/variantChecks.ts";
import { histogramRows } from "../../../charts/histogram.ts";
import type { HistogramData } from "../../../charts/histogram.ts";
import type { VariantChecksResult } from "../../../worker/protocol.ts";
import { HistogramBlock } from "./HistogramBlock.tsx";
import {
  VARIANT_HISTOGRAMS,
  histogramThreshold,
  histogramTitle,
  thresholdText,
} from "./histogramWords.ts";

/** What one histogram of the variants is drawn with. */
export interface VariantHistogramProps {
  /** The statistic it shows. */
  readonly statistic: VariantStatistic;
  /** The histograms of the variants, as the store gives them. */
  readonly result: VariantChecksResult;
  /** The threshold of its filter, the number typed while it is typed, or
      `null` while the filter is off or for a statistic with none. */
  readonly threshold: number | null;
  /** The name of the variants file, which the CSV is named after. */
  readonly variantsName: string;
}

/** A histogram of the variants, with its table of bins. */
export function VariantHistogram({
  statistic,
  result,
  threshold,
  variantsName,
}: VariantHistogramProps): React.JSX.Element {
  const words = VARIANT_HISTOGRAMS[statistic];
  const distrib = result[statistic];
  // Made again only when the result or the threshold changes, so that the
  // plot is not drawn again on renders that changed neither (react.md,
  // "Mounting a plot").
  const { data, rows } = useMemo(() => {
    const plotted = {
      title: histogramTitle(words.name, distrib.mean),
      xLabel: words.name,
      yLabel: words.countLabel,
      edges: result.binEdges,
      counts: distrib.counts,
      threshold: threshold === null ? null : histogramThreshold(threshold),
    };
    const binRows = histogramRows({ ...plotted, description: "" });
    const described: HistogramData = {
      ...plotted,
      description: variantHistogramDescription(statistic, binRows, threshold),
    };
    return { data: described, rows: binRows };
  }, [words, distrib, result.binEdges, threshold, statistic]);

  return (
    <HistogramBlock
      data={data}
      rows={rows}
      countLabel={words.countLabel}
      tableName={words.tableName}
      thresholdLine={
        threshold === null || words.filterName === null
          ? null
          : thresholdText(words.filterName, threshold)
      }
      csvName={binsCsvName(variantsName, statistic)}
    />
  );
}
