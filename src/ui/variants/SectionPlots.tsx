/**
 * The plots of the statistics of the open file on popgen2.html, the six
 * histograms with their thresholds, five filters of the project read and
 * set here (docs/specs/steps/popgen2-filters.md, "What it sends and
 * reads"), and the mark that their code is there. Their code, with D3, which no one needs before a file is open,
 * is downloaded apart from the page's, from the moment a file is picked
 * (FileStats.tsx), so that the page's first download does not carry it.
 */
import { useLayoutEffect, useMemo, useState } from "react";

import { variantsStem } from "../../core/fileNames.ts";
import { thresholdValue } from "../../core/project.ts";
import type { Threshold } from "../../core/project.ts";

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
import type { PlotDownload } from "../widgets/downloadItems.ts";
import { IndividualPlace, Plots } from "./StatsLayout.tsx";
import { StatsHistogram } from "./StatsHistogram.tsx";
import { individualPlot, variantPlot } from "./statsPlots.ts";
import type { StatsPlot } from "./statsPlots.ts";
import {
  INDIVIDUAL_PLOT_FILES,
  INDIVIDUAL_STATISTICS,
  VARIANT_PLOT_FILES,
  VARIANT_STATISTICS,
  individualPlotWhat,
  passDownloadWaitingText,
  plotWaitOf,
  variantPlotWhat,
} from "./statsWords.ts";
import type { DrawnFrom } from "./statsWords.ts";
import {
  individualThreshold,
  thresholdChange,
  variantThreshold,
} from "./thresholdChange.ts";
import { useAppState, useStore } from "../store.tsx";

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

/** What the plots of the variants are drawn with. */
export interface VariantPlotsProps {
  /** The part of the variants of the result, or of a result so far. */
  readonly result: VariantStatsPart;
  /** The individuals it is calculated over, every one of the file. */
  readonly numIndividuals: number;
  /** Their ploidy. */
  readonly ploidy: number;
  /** What it is drawn from: the result, a result so far, or the last
      result so far of a pass the user stopped. */
  readonly from: DrawnFrom;
  /** The name of the variants file, which the files of the downloads
      are named after. */
  readonly variantsName: string;
}

/** The four histograms of the variants, each over the variants in its
    bins, the first three with their threshold, a filter of the project.
    Each keeps its element from one result so far to the next, and is
    updated in it. */
export function VariantPlots({
  result,
  numIndividuals,
  ploidy,
  from,
  variantsName,
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
          from={from}
          variantsName={variantsName}
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
  readonly from: DrawnFrom;
  readonly variantsName: string;
}

/** A histogram of the variants and its threshold, the project's, which
    follows the number dragged, typed or moved with the keys before it is
    a change of the project. */
function VariantHistogram({
  statistic,
  result,
  individuals,
  from,
  variantsName,
}: VariantHistogramProps): React.JSX.Element {
  const filter = variantThreshold(statistic);
  const threshold = useAppState((s) =>
    filter === null ? null : thresholdValue(s.project, filter),
  );
  const onSet = useThresholdSet(filter);
  const [moving, setMoving] = useState<number | null>(null);
  const [typed, setTyped] = useState<number | null>(null);
  // Made again only when what it shows changes, so that the plot is not
  // drawn again on renders that changed nothing (react.md, "Mounting a
  // plot").
  const set = useMemo(
    () => variantPlot(statistic, result, individuals, from, threshold, moving),
    [statistic, result, individuals, from, threshold, moving],
  );
  const drawn = useMemo(
    () =>
      typed === null
        ? set
        : variantPlot(statistic, result, individuals, from, threshold, typed),
    [set, statistic, result, individuals, from, threshold, typed],
  );
  const download = useMemo(
    () =>
      plotDownload(
        set,
        variantPlotWhat(statistic),
        VARIANT_PLOT_FILES[statistic],
        variantsName,
        from,
      ),
    [set, statistic, variantsName, from],
  );
  return (
    <StatsHistogram
      plot={drawn}
      download={download}
      set={set.threshold}
      onMoving={setMoving}
      onTyped={setTyped}
      onSet={onSet}
    />
  );
}

/** What the plots of the individuals are drawn with. */
export interface IndividualPlotsProps {
  /** The part of the individuals of the result, or of a result so far. */
  readonly result: IndividualStatsPart;
  /** What it is drawn from: the result, a result so far, or the last
      result so far of a pass the user stopped. */
  readonly from: DrawnFrom;
  /** The name of the variants file, which the files of the downloads
      are named after. */
  readonly variantsName: string;
}

/** The two histograms of the individuals, each over the individuals
    with a value, with its threshold, a filter of the project, and under
    each the line of those with none; a line alone where no individual
    has a value. */
export function IndividualPlots({
  result,
  from,
  variantsName,
}: IndividualPlotsProps): React.JSX.Element {
  return (
    <Plots>
      {INDIVIDUAL_STATISTICS.map((statistic) => (
        <IndividualHistogram
          key={statistic}
          statistic={statistic}
          result={result}
          from={from}
          variantsName={variantsName}
        />
      ))}
    </Plots>
  );
}

/** What one histogram of the individuals is drawn with. */
interface IndividualHistogramProps {
  readonly statistic: IndividualStatistic;
  readonly result: IndividualStatsPart;
  readonly from: DrawnFrom;
  readonly variantsName: string;
}

/** A histogram of the individuals and its threshold, as that of the
    variants, and the line under it of those with no value. */
function IndividualHistogram({
  statistic,
  result,
  from,
  variantsName,
}: IndividualHistogramProps): React.JSX.Element {
  const filter = individualThreshold(statistic);
  const threshold = useAppState((s) => thresholdValue(s.project, filter));
  const onSet = useThresholdSet(filter);
  const [moving, setMoving] = useState<number | null>(null);
  const [typed, setTyped] = useState<number | null>(null);
  const set = useMemo(
    () => individualPlot(statistic, result, from, threshold, moving),
    [statistic, result, from, threshold, moving],
  );
  const drawn = useMemo(
    () =>
      typed === null
        ? set
        : individualPlot(statistic, result, from, threshold, typed),
    [set, statistic, result, from, threshold, typed],
  );
  const download = useMemo(
    () =>
      set.plot === null
        ? null
        : plotDownload(
            set.plot,
            individualPlotWhat(statistic),
            INDIVIDUAL_PLOT_FILES[statistic],
            variantsName,
            from,
          ),
    [set, statistic, variantsName, from],
  );
  return (
    <IndividualPlace
      noValueLine={drawn.noValueLine}
      noValueRoom={drawn.noValueRoom}
    >
      {drawn.plot !== null && set.plot !== null && download !== null && (
        <StatsHistogram
          plot={drawn.plot}
          download={download}
          set={set.plot.threshold}
          onMoving={setMoving}
          onTyped={setTyped}
          onSet={onSet}
        />
      )}
    </IndividualPlace>
  );
}

/** The download of the histogram `plot`, named for a screen reader by
    `what` and its files by `file`, "panel.obs_het_variants.svg", after
    the variants file `variantsName`; it waits while the plot is drawn
    from part of the variants, `from`, so that no file of part of them
    leaves the page (docs/specs/steps/popgen2-pca.md, "The downloads"). Its
    CSV is that of the plot with the threshold set, not the number being
    typed, which changes no bin. */
function plotDownload(
  plot: StatsPlot,
  what: string,
  file: string,
  variantsName: string,
  from: DrawnFrom,
): PlotDownload {
  return {
    what,
    stem: variantsStem(variantsName),
    imageWhat: file,
    csvWhat: file,
    csv: plot.csv,
    waiting: waitingOf(from, variantsName),
  };
}

/** Why the menu of a histogram drawn from `from` waits, or null. */
function waitingOf(from: DrawnFrom, variantsName: string): string | null {
  const wait = plotWaitOf(from);
  return wait === null ? null : passDownloadWaitingText(variantsName, wait);
}

/** The setting of the threshold of `filter` for its histogram: makes
    the change of the project that sets the threshold to `value`, on the
    step of its axis, 1 or `null` for off, with its description; none
    when it is the value the project has, nor for a histogram with no
    threshold, `null`. */
function useThresholdSet(
  filter: Threshold | null,
): (value: number | null) => void {
  const store = useStore();
  return (value) => {
    if (filter === null) return;
    const change = thresholdChange(store.getState().project, filter, value);
    if (change !== null) store.apply(change.description, change.command);
  };
}
