/**
 * The statistics of the open file on popgen2.html, between the box of
 * the file and the open button, which the owner put at the bottom of the
 * page (docs/plans/file-stats.md, "The design" and "Round 1 with the
 * owner"; steps 3 and 4 of case 2 of docs/use-cases.md). Two parts, each
 * under its heading, both from the result of the summary of the variants
 * file, whose one pass counts the variants and calculates them
 * (docs/plans/live-stats.md, "One pass for the count and the
 * statistics"):
 *
 * - Variants: the histograms of the missing rate, the MAF, the observed
 *   and the expected heterozygosity (unbiased), each with its threshold,
 *   grey when it keeps every variant in their bins;
 * - Individuals: the histograms of the missing rate and of the observed
 *   heterozygosity of each individual, binned here from popnei's values,
 *   each with its threshold, grey when it keeps every one; and the download of
 *   their table as CSV, which is not drawn, since there may be thousands
 *   of individuals.
 *
 * Plain, as the owner wants this page: no mean in the titles, no table of
 * the bins, and no bar nor button of its own: the bar of the pass, its
 * Stop and Start again are in the box of the file. Each part says, over
 * its plots, that it is calculated, with the share done, or that it was
 * stopped; once the pass failed, whose words the box says, a short line
 * in place of its plots. When another file is opened with the focus in
 * the section, the focus goes to the open button.
 *
 * The plots fill in while the pass runs (docs/plans/live-stats.md, "The
 * plots so far"): from the first result so far of the pass, about two
 * seconds after its start, they are drawn from the last one, the words of
 * each plot saying they are so far, and at the end from
 * the result, where they were: the line of the pass keeps its room,
 * hidden, once it ended. Nothing keeps their room before: the open button under the
 * section moves down as they arrive, which the owner chose over empty
 * space. The download of the table of the individuals comes with the
 * result alone.
 */
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { DEFAULT_MAX_MISSING_RATE } from "../../core/apps.ts";
import type { IndividualStatistic } from "../../core/analyses/individualChecks.ts";
import type { VariantStatistic } from "../../core/analyses/variantChecks.ts";

import type { AnalysisStatus } from "../../core/store.ts";
import type {
  IndividualStatsPart,
  JobResult,
  VariantStatsPart,
  VariantsSummaryResult,
} from "../../worker/protocol.ts";
import { progressShare } from "../analyses/words.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { individualChecksCsv } from "../../core/analyses/individualChecks.ts";
import { downloadText } from "../download.ts";
import { statsCsvName } from "../steps/variants/individualStats.ts";
import { useAppState } from "../store.tsx";
import {
  IndividualPlace,
  IndividualsDownload,
  Part,
  PartLine,
  Plots,
  StatsFrame,
} from "./StatsLayout.tsx";
import {
  INDIVIDUALS_HEADING,
  INDIVIDUAL_STATISTICS,
  PART_FAILED,
  PART_STOPPED,
  VARIANTS_HEADING,
  VARIANT_STATISTICS,
  statsRunningLine,
} from "./statsWords.ts";
import type { StatsPart } from "./statsWords.ts";
import type { StatsShown } from "./announceChanges.ts";
import { StatsHistogram } from "./StatsHistogram.tsx";
import { individualPlot, variantPlot } from "./statsPlots.ts";
import type { PassIndividuals } from "./statsPlots.ts";
import { summaryStatus } from "./words.ts";

/** What the section is drawn with. */
export interface FileStatsProps {
  /** The analyses the page starts by itself, which tell a pass stopped
      from one about to start. */
  readonly autoRuns: AutoRuns;
  /** The open button of the page, which takes the focus when the section
      goes with it, another file opened. */
  readonly openButton: React.RefObject<HTMLButtonElement | null>;
  /** Told when the section of a load is drawn, and when it goes, so that
      the status region says nothing of the statistics before. */
  readonly onShown: StatsShown;
}

/** The statistics of the open file; nothing before a file is read. */
export function FileStats({
  autoRuns,
  openButton,
  onShown,
}: FileStatsProps): React.JSX.Element | null {
  const variants = useAppState((s) => s.project.variants);
  if (variants?.read.kind !== "read") return null;
  return (
    // Another load is another section, so that the one before goes, with
    // the focus it held.
    <Stats
      key={variants.fileId}
      autoRuns={autoRuns}
      openButton={openButton}
      onShown={onShown}
      fileId={variants.fileId}
      variantsName={variants.name}
      ploidy={variants.read.ploidy}
    />
  );
}

/** What the section of one load is drawn with. */
interface StatsProps extends FileStatsProps {
  /** The id of the load. */
  readonly fileId: string;
  /** The name of the variants file, which the downloads are named
      after. */
  readonly variantsName: string;
  /** The ploidy popnei read the file with, which, with the individuals,
      sets the narrowest bar of the histogram of the MAF. */
  readonly ploidy: number;
}

/** The section of one load of the file. */
function Stats({
  autoRuns,
  openButton,
  onShown,
  fileId,
  variantsName,
  ploidy,
}: StatsProps): React.JSX.Element {
  const sectionRef = useRef<HTMLElement>(null);
  const status = useAppState(summaryStatus);
  // The thresholds on the plots, state of this load alone: another file
  // is another section, which starts them again. They are shown only,
  // and change no statistic and no project (docs/plans/thresholds.md).
  const [thresholds, setThresholds] = useState(START_THRESHOLDS);
  // Selected for what autoRuns knows, which tells a pass stopped from one
  // about to start, and which a Stop with no pass running changes and the
  // store does not.
  useSyncExternalStore(autoRuns.subscribe, autoRuns.getVersion);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    // The open button is one element whatever the zone holds.
    const button = openButton.current;
    return () => {
      // The section goes, another file opened or dropped, while the focus
      // is in it: the focus goes to the open button, not to the top of
      // the page. The cleanup of a layout effect runs while the section
      // is still in the page.
      if (section?.contains(document.activeElement) === true) {
        button?.focus();
      }
    };
  }, [openButton]);

  // Drawn: the status region may say the statistics of this load.
  useLayoutEffect(() => onShown(fileId), [onShown, fileId]);

  /** What a part says over its plots: the share done while the pass
      runs, that it was stopped, why it cannot run, or nothing once done,
      failed or about to start. */
  const lineOf = (part: StatsPart): string | null => {
    switch (status.kind) {
      case "done":
      case "error":
        return null;
      case "running":
        return statsRunningLine(
          part,
          status.progress === null ? null : progressShare(status.progress),
        );
      case "ready":
      case "removed":
        // Not started under its key, the pass starts by itself in a
        // moment.
        return autoRuns.startedUnder(status.key) ? PART_STOPPED : null;
      case "locked":
        return status.reason;
    }
  };

  const shown = shownOf(status);
  const soFar = shown?.soFar ?? false;
  const done = status.kind === "done" ? shown?.result : undefined;
  const variantsLine = lineOf("variants");
  const individualsLine = lineOf("individuals");
  return (
    <StatsFrame sectionRef={sectionRef}>
      <Part heading={VARIANTS_HEADING}>
        {status.kind === "error" ? (
          <PartLine>{PART_FAILED}</PartLine>
        ) : (
          <>
            <LineOrRoom line={variantsLine} part="variants" plots={shown} />
            {shown !== null && (
              <VariantPlots
                result={shown.result.perVar}
                numIndividuals={shown.result.perIndividual.individuals.length}
                ploidy={ploidy}
                soFar={soFar}
                thresholds={thresholds.variants}
                onThreshold={(statistic, value) => {
                  setThresholds((before) => ({
                    ...before,
                    variants: { ...before.variants, [statistic]: value },
                  }));
                }}
              />
            )}
          </>
        )}
      </Part>
      <Part heading={INDIVIDUALS_HEADING}>
        {status.kind === "error" ? (
          <PartLine>{PART_FAILED}</PartLine>
        ) : (
          <>
            <LineOrRoom
              line={individualsLine}
              part="individuals"
              plots={shown}
            />
            {shown !== null && (
              <IndividualPlots
                result={shown.result.perIndividual}
                soFar={soFar}
                thresholds={thresholds.individuals}
                onThreshold={(statistic, value) => {
                  setThresholds((before) => ({
                    ...before,
                    individuals: { ...before.individuals, [statistic]: value },
                  }));
                }}
              />
            )}
            {done !== undefined && (
              <IndividualsDownload
                onPress={() => {
                  downloadText(
                    statsCsvName(variantsName),
                    individualChecksCsv(done.perIndividual),
                    "text/csv",
                  );
                }}
              />
            )}
          </>
        )}
      </Part>
    </StatsFrame>
  );
}

/** What the line over the plots of a part is drawn with. */
interface LineOrRoomProps {
  /** What the part says over its plots, or `null` for nothing. */
  readonly line: string | null;
  readonly part: StatsPart;
  /** What its plots are drawn from, `null` when there are none. */
  readonly plots: Shown | null;
}

/** The line over the plots of a part; once the pass ended, with its
    plots drawn, the room of its last line, "Calculating the statistics of
    the variants… 100%", hidden, so that the plots, drawn under that line
    from the results so far, do not move up as the result comes, by 40
    pixels at 1280 (the review of round 1, ux F2); nothing with no plots
    and no line. */
function LineOrRoom({
  line,
  part,
  plots,
}: LineOrRoomProps): React.JSX.Element | null {
  if (line !== null) return <PartLine>{line}</PartLine>;
  if (plots === null) return null;
  return <PartLine room>{statsRunningLine(part, 100)}</PartLine>;
}

/** What the plots are drawn from: the result of the summary once done,
    or its last result so far while it runs, `soFar`. */
interface Shown {
  readonly result: VariantsSummaryResult;
  readonly soFar: boolean;
}

/** What the plots are drawn from in `status`; `null` before the first
    result so far, and in any state but running and done. A defect for a
    result of another analysis, which the store never gives it. */
function shownOf(status: AnalysisStatus<JobResult>): Shown | null {
  let result: JobResult;
  let soFar: boolean;
  if (status.kind === "done") {
    result = status.result;
    soFar = false;
  } else if (status.kind === "running" && status.soFar !== null) {
    result = status.soFar;
    soFar = true;
  } else {
    return null;
  }
  if (result.analysis !== "variantsSummary") {
    throw new Error(
      `popnei_web defect: the summary of the variants file has a result of ${result.analysis}.`,
    );
  }
  return { result, soFar };
}

/** The thresholds of the six histograms, as the user set them: a
    number, rounded to the step of its axis when it was committed and
    drawn and counted as it is, or `null` for the top of the axis, which
    keeps everything and follows the axis as a result so far widens it. */
interface Thresholds {
  readonly variants: Readonly<Record<VariantStatistic, number | null>>;
  readonly individuals: Readonly<Record<IndividualStatistic, number | null>>;
}

/** The thresholds of a file just open: the missing rate of the variants
    at 0.1, the default of its filter in docs/functionality.md, and the
    five others at the top of their axis (docs/plans/thresholds.md, "The
    starting values"). */
const START_THRESHOLDS: Thresholds = Object.freeze({
  variants: Object.freeze({
    missingRate: DEFAULT_MAX_MISSING_RATE,
    maf: null,
    obsHet: null,
    unbiasedExpHet: null,
  }),
  individuals: Object.freeze({
    missingGenotypes: null,
    observedHeterozygosity: null,
  }),
});

/** What the plots of the variants are drawn with. */
interface VariantPlotsProps {
  /** The part of the variants of the result, or of a result so far. */
  readonly result: VariantStatsPart;
  /** The individuals it is calculated over, every one of the file. */
  readonly numIndividuals: number;
  /** Their ploidy. */
  readonly ploidy: number;
  /** Whether it is of a result so far. */
  readonly soFar: boolean;
  /** The thresholds of the four, as the user set them. */
  readonly thresholds: Thresholds["variants"];
  /** Called with the threshold the user set on the histogram of
      `statistic`. */
  readonly onThreshold: (statistic: VariantStatistic, value: number) => void;
}

/** The four histograms of the variants, each over the variants in its
    bins, with its threshold. Each keeps its element from one result so
    far to the next, and is updated in it. */
function VariantPlots({
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
interface IndividualPlotsProps {
  /** The part of the individuals of the result, or of a result so far. */
  readonly result: IndividualStatsPart;
  /** Whether it is of a result so far. */
  readonly soFar: boolean;
  /** The thresholds of the two, as the user set them. */
  readonly thresholds: Thresholds["individuals"];
  /** Called with the threshold the user set on the histogram of
      `statistic`. */
  readonly onThreshold: (statistic: IndividualStatistic, value: number) => void;
}

/** The two histograms of the individuals, each over the individuals
    with a value, with its threshold, and under each the line of those
    with none; a line alone where no individual has a value. */
function IndividualPlots({
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
