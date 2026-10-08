/**
 * The plots of the statistics of the open file on popgen2.html, the six
 * histograms with their thresholds, and the mark that their code is
 * there. Their code, with D3, which no one needs before a file is open,
 * is downloaded apart from the page's, from the moment a file is picked
 * (FileStats.tsx), so that the page's first download does not carry it.
 */
import { useLayoutEffect, useMemo, useState } from "react";

import type { IndividualStatistic } from "../../core/analyses/individualChecks.ts";
import type {
  PassIndividuals,
  VariantStatistic,
} from "../../core/analyses/variantChecks.ts";
import type {
  IndividualStatsPart,
  VariantStatsPart,
} from "../../worker/protocol.ts";
import type { StatsShown } from "./announceChanges.ts";
import { IndividualPlace, Plots } from "./StatsLayout.tsx";
import { StatsHistogram } from "./StatsHistogram.tsx";
import { individualPlot, variantPlot } from "./statsPlots.ts";
import { INDIVIDUAL_STATISTICS, VARIANT_STATISTICS } from "./statsWords.ts";

/** What the mark of the code is drawn with. */
export interface PlotsCodeMarkProps {
  /** The load whose section is drawn. */
  readonly fileId: string;
  /** Told once the section of the load is drawn with the code of its
      plots, and when it goes. */
  readonly onShown: StatsShown;
}

/** Draws nothing; tells `onShown` that the section of `fileId` is drawn
    with the code of its plots, so that the status region says nothing of
    the statistics while that code downloads, nor after its download
    failed. */
export function PlotsCodeMark({ fileId, onShown }: PlotsCodeMarkProps): null {
  useLayoutEffect(() => onShown(fileId), [onShown, fileId]);
  return null;
}

/** The thresholds of the four histograms of the variants, as the user
    set them: a number, or `null` for the top of the axis. */
export type VariantThresholds = Readonly<
  Record<VariantStatistic, number | null>
>;

/** The thresholds of the two histograms of the individuals. */
export type IndividualThresholds = Readonly<
  Record<IndividualStatistic, number | null>
>;

/** What the plots of the variants are drawn with. */
export interface VariantPlotsProps {
  /** The part of the variants of the result, or of a result so far. */
  readonly result: VariantStatsPart;
  /** The individuals it is calculated over, every one of the file. */
  readonly numIndividuals: number;
  /** Their ploidy. */
  readonly ploidy: number;
  /** Whether it is of a result so far. */
  readonly soFar: boolean;
  /** The thresholds of the four, as the user set them. */
  readonly thresholds: VariantThresholds;
  /** Called with the threshold the user set on the histogram of
      `statistic`. */
  readonly onThreshold: (statistic: VariantStatistic, value: number) => void;
}

/** The four histograms of the variants, each over the variants in its
    bins, with its threshold. Each keeps its element from one result so
    far to the next, and is updated in it. */
export function VariantPlots({
  result,
  numIndividuals,
  ploidy,
  soFar,
  thresholds,
  onThreshold,
}: VariantPlotsProps): React.JSX.Element {
  // The same object until the file changes, so that the plots are not
  // made again on renders that changed nothing.
  const individuals = useMemo(
    () => ({ numIndividuals, ploidy }),
    [numIndividuals, ploidy],
  );
  return (
    <Plots>
      {VARIANT_STATISTICS.map((statistic) => (
        <VariantHistogram
          key={statistic}
          statistic={statistic}
          result={result}
          individuals={individuals}
          soFar={soFar}
          threshold={thresholds[statistic]}
          onThreshold={onThreshold}
        />
      ))}
    </Plots>
  );
}

/** What one histogram of the variants is drawn with. */
interface VariantHistogramProps {
  readonly statistic: VariantStatistic;
  readonly result: VariantStatsPart;
  readonly individuals: PassIndividuals;
  readonly soFar: boolean;
  /** Its threshold as the user set it. */
  readonly threshold: number | null;
  readonly onThreshold: (statistic: VariantStatistic, value: number) => void;
}

/** A histogram of the variants and its threshold, which follows the
    number typed in its box before it is committed. */
function VariantHistogram({
  statistic,
  result,
  individuals,
  soFar,
  threshold,
  onThreshold,
}: VariantHistogramProps): React.JSX.Element {
  const [typed, setTyped] = useState<number | null>(null);
  // Made again only when what it shows changes, so that the plot is not
  // drawn again on renders that changed nothing (react.md, "Mounting a
  // plot").
  const set = useMemo(
    () => variantPlot(statistic, result, individuals, soFar, threshold),
    [statistic, result, individuals, soFar, threshold],
  );
  const drawn = useMemo(
    () =>
      typed === null
        ? set
        : variantPlot(statistic, result, individuals, soFar, threshold, typed),
    [set, statistic, result, individuals, soFar, threshold, typed],
  );
  return (
    <StatsHistogram
      plot={drawn}
      boxValue={set.threshold.shown}
      onThreshold={(value) => {
        onThreshold(statistic, value);
      }}
      onTyped={setTyped}
    />
  );
}

/** What the plots of the individuals are drawn with. */
export interface IndividualPlotsProps {
  /** The part of the individuals of the result, or of a result so far. */
  readonly result: IndividualStatsPart;
  /** Whether it is of a result so far. */
  readonly soFar: boolean;
  /** The thresholds of the two, as the user set them. */
  readonly thresholds: IndividualThresholds;
  /** Called with the threshold the user set on the histogram of
      `statistic`. */
  readonly onThreshold: (statistic: IndividualStatistic, value: number) => void;
}

/** The two histograms of the individuals, each over the individuals
    with a value, with its threshold, and under each the line of those
    with none; a line alone where no individual has a value. */
export function IndividualPlots({
  result,
  soFar,
  thresholds,
  onThreshold,
}: IndividualPlotsProps): React.JSX.Element {
  return (
    <Plots>
      {INDIVIDUAL_STATISTICS.map((statistic) => (
        <IndividualHistogram
          key={statistic}
          statistic={statistic}
          result={result}
          soFar={soFar}
          threshold={thresholds[statistic]}
          onThreshold={onThreshold}
        />
      ))}
    </Plots>
  );
}

/** What one histogram of the individuals is drawn with. */
interface IndividualHistogramProps {
  readonly statistic: IndividualStatistic;
  readonly result: IndividualStatsPart;
  readonly soFar: boolean;
  /** Its threshold as the user set it. */
  readonly threshold: number | null;
  readonly onThreshold: (statistic: IndividualStatistic, value: number) => void;
}

/** A histogram of the individuals and its threshold, which follows the
    number typed in its box, and the line under it of those with no
    value. */
function IndividualHistogram({
  statistic,
  result,
  soFar,
  threshold,
  onThreshold,
}: IndividualHistogramProps): React.JSX.Element {
  const [typed, setTyped] = useState<number | null>(null);
  const set = useMemo(
    () => individualPlot(statistic, result, soFar, threshold),
    [statistic, result, soFar, threshold],
  );
  const drawn = useMemo(
    () =>
      typed === null
        ? set
        : individualPlot(statistic, result, soFar, threshold, typed),
    [set, statistic, result, soFar, threshold, typed],
  );
  return (
    <IndividualPlace noValueLine={drawn.noValueLine}>
      {drawn.plot !== null && set.plot !== null && (
        <StatsHistogram
          plot={drawn.plot}
          boxValue={set.plot.threshold.shown}
          onThreshold={(value) => {
            onThreshold(statistic, value);
          }}
          onTyped={setTyped}
        />
      )}
    </IndividualPlace>
  );
}
