/**
 * The plots of the statistics of the open file on popgen2.html, the six
 * histograms with their thresholds, five filters of the project read and
 * set here (docs/specs/steps/popgen2-filters.md, "What it sends and
 * reads"), and the mark that their code is there. Their code, with D3, which no one needs before a file is open,
 * is downloaded apart from the page's, from the moment a file is picked
 * (FileStats.tsx), so that the page's first download does not carry it.
 */
import { useLayoutEffect, useMemo, useState } from "react";

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
import { IndividualPlace, Plots } from "./StatsLayout.tsx";
import { StatsHistogram } from "./StatsHistogram.tsx";
import { individualPlot, variantPlot } from "./statsPlots.ts";
import { INDIVIDUAL_STATISTICS, VARIANT_STATISTICS } from "./statsWords.ts";
import {
  individualThreshold,
  thresholdChange,
  variantThreshold,
} from "./thresholdChange.ts";
import type { ThresholdChange } from "./thresholdChange.ts";
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
  /** Whether it is of a result so far. */
  readonly soFar: boolean;
}

/** The four histograms of the variants, each over the variants in its
    bins, the first three with their threshold, a filter of the project.
    Each keeps its element from one result so far to the next, and is
    updated in it. */
export function VariantPlots({
  result,
  numIndividuals,
  ploidy,
  soFar,
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
}

/** A histogram of the variants and its threshold, the project's, which
    follows the number dragged, typed or moved with the keys before it is
    a change of the project. */
function VariantHistogram({
  statistic,
  result,
  individuals,
  soFar,
}: VariantHistogramProps): React.JSX.Element {
  const filter = variantThreshold(statistic);
  const threshold = useAppState((s) =>
    filter === null ? null : thresholdValue(s.project, filter),
  );
  const { onSet, describeSet } = useThresholdSet(filter);
  const [moving, setMoving] = useState<number | null>(null);
  const [typed, setTyped] = useState<number | null>(null);
  // Made again only when what it shows changes, so that the plot is not
  // drawn again on renders that changed nothing (react.md, "Mounting a
  // plot").
  const set = useMemo(
    () => variantPlot(statistic, result, individuals, soFar, threshold, moving),
    [statistic, result, individuals, soFar, threshold, moving],
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
      set={set.threshold}
      onMoving={setMoving}
      onTyped={setTyped}
      onSet={onSet}
      describeSet={describeSet}
    />
  );
}

/** What the plots of the individuals are drawn with. */
export interface IndividualPlotsProps {
  /** The part of the individuals of the result, or of a result so far. */
  readonly result: IndividualStatsPart;
  /** Whether it is of a result so far. */
  readonly soFar: boolean;
}

/** The two histograms of the individuals, each over the individuals
    with a value, with its threshold, a filter of the project, and under
    each the line of those with none; a line alone where no individual
    has a value. */
export function IndividualPlots({
  result,
  soFar,
}: IndividualPlotsProps): React.JSX.Element {
  return (
    <Plots>
      {INDIVIDUAL_STATISTICS.map((statistic) => (
        <IndividualHistogram
          key={statistic}
          statistic={statistic}
          result={result}
          soFar={soFar}
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
}

/** A histogram of the individuals and its threshold, as that of the
    variants, and the line under it of those with no value. */
function IndividualHistogram({
  statistic,
  result,
  soFar,
}: IndividualHistogramProps): React.JSX.Element {
  const filter = individualThreshold(statistic);
  const threshold = useAppState((s) => thresholdValue(s.project, filter));
  const { onSet, describeSet } = useThresholdSet(filter);
  const [moving, setMoving] = useState<number | null>(null);
  const [typed, setTyped] = useState<number | null>(null);
  const set = useMemo(
    () => individualPlot(statistic, result, soFar, threshold, moving),
    [statistic, result, soFar, threshold, moving],
  );
  const drawn = useMemo(
    () =>
      typed === null
        ? set
        : individualPlot(statistic, result, soFar, threshold, typed),
    [set, statistic, result, soFar, threshold, typed],
  );
  return (
    <IndividualPlace
      noValueLine={drawn.noValueLine}
      noValueRoom={drawn.noValueRoom}
    >
      {drawn.plot !== null && set.plot !== null && (
        <StatsHistogram
          plot={drawn.plot}
          set={set.plot.threshold}
          onMoving={setMoving}
          onTyped={setTyped}
          onSet={onSet}
          describeSet={describeSet}
        />
      )}
    </IndividualPlace>
  );
}

/** How a histogram sets the threshold of `filter` in the project. */
interface ThresholdSet {
  /** Makes the change of the project that sets the threshold to `value`,
      on the step of its axis, 1 or `null` for off, with the description
      of its step of Undo; none when it is the value the project has, nor
      for a histogram with no threshold, `null`. */
  readonly onSet: (value: number | null) => void;
  /** The description `onSet(value)` would give its step of Undo now, or
      `null` when it would make no change. */
  readonly describeSet: (value: number) => string | null;
}

/** The setting of the threshold of `filter`, for its histogram. */
function useThresholdSet(filter: Threshold | null): ThresholdSet {
  const store = useStore();
  const changeTo = (value: number | null): ThresholdChange | null =>
    filter === null
      ? null
      : thresholdChange(store.getState().project, filter, value);
  return {
    onSet: (value) => {
      const change = changeTo(value);
      if (change !== null) store.apply(change.description, change.command);
    },
    describeSet: (value) => changeTo(value)?.description ?? null,
  };
}
