/**
 * One histogram of the statistics of each individual, beside the
 * threshold of its filter of individuals
 * (docs/specs/analyses/individualChecks.md, "What it shows";
 * docs/specs/steps/variants.md, "The two thresholds"): the bins
 * `binValues` makes of the values of the result, 20 over their range,
 * with the threshold of its filter while the filter is on, and the texts
 * the step writes for it, its title, its axes, its legend, its
 * description, the line of the bin it splits, its table and the name of
 * its CSV. Under the histogram of the heterozygosity, the individuals
 * with no called genotype, which are in no bin; when none has a value,
 * that line alone, since there is no bin to draw.
 */
import { useMemo } from "react";

import { individualHistogramDescription } from "../../../core/analyses/individualChecks.ts";
import type { IndividualStatistic } from "../../../core/analyses/individualChecks.ts";
import { splitBinText } from "../../../core/analyses/words.ts";
import { INDIVIDUAL_BINS, binValues } from "../../../core/histogram.ts";
import { histogramRows } from "../../../charts/histogram.ts";
import type { HistogramData } from "../../../charts/histogram.ts";
import type { IndividualChecksResult } from "../../../worker/protocol.ts";
import { classOf } from "../../classOf.ts";
import { HistogramBlock } from "./HistogramBlock.tsx";
import { histogramThreshold } from "./histogramWords.ts";
import {
  INDIVIDUALS_LABEL,
  INDIVIDUAL_HISTOGRAMS,
  individualBinsCsvName,
  noHeterozygosityText,
} from "./individualStats.ts";
import styles from "./VariantsStep.module.css";

/** What one histogram of the individuals is drawn with. */
export interface IndividualHistogramProps {
  /** The statistic it shows. */
  readonly statistic: IndividualStatistic;
  /** The statistics of each individual, as the store gives them. */
  readonly result: IndividualChecksResult;
  /** The threshold of its filter, or `null` while the filter is off. */
  readonly threshold: number | null;
  /** The name of the variants file, which the CSV is named after. */
  readonly variantsName: string;
}

/** A histogram of the individuals, with its table of bins. */
export function IndividualHistogram({
  statistic,
  result,
  threshold,
  variantsName,
}: IndividualHistogramProps): React.JSX.Element {
  const words = INDIVIDUAL_HISTOGRAMS[statistic];
  const values =
    statistic === "missingGenotypes" ? result.missingGtRate : result.obsHetRate;
  // Binned again only for another result, and the plot made again only
  // when the bins or the threshold change, so that it is not drawn again
  // on renders that changed neither (react.md, "Mounting a plot").
  const bins = useMemo(() => binValues(values, INDIVIDUAL_BINS), [values]);
  const shown = useMemo(() => {
    if (bins === null) return null;
    const plotted = {
      title: words.title,
      xLabel: words.xLabel,
      yLabel: INDIVIDUALS_LABEL,
      edges: bins.edges,
      counts: bins.counts,
      threshold: threshold === null ? null : histogramThreshold(threshold),
    };
    const binRows = histogramRows({ ...plotted, description: "" });
    const data: HistogramData = {
      ...plotted,
      description: individualHistogramDescription(
        statistic,
        binRows,
        threshold,
      ),
    };
    return { data, rows: binRows };
  }, [bins, words, threshold, statistic]);

  const numNaN =
    bins === null ? values.filter((v) => Number.isNaN(v)).length : bins.numNaN;
  const noValue = noHeterozygosityText(numNaN);
  return (
    <>
      {shown !== null && (
        <HistogramBlock
          data={shown.data}
          rows={shown.rows}
          countLabel={INDIVIDUALS_LABEL}
          tableName={words.tableName}
          // The words of the threshold beside the histogram come with the
          // fields of the thresholds.
          thresholdLine={null}
          splitLine={splitBinText("individual", shown.rows, threshold)}
          csvName={individualBinsCsvName(variantsName, statistic)}
        />
      )}
      {noValue !== null && (
        <p className={classOf(styles, "filterLine")}>{noValue}</p>
      )}
    </>
  );
}
