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
 *   and the expected heterozygosity (unbiased), with the number of
 *   variants in their bins;
 * - Individuals: the histograms of the missing rate and of the observed
 *   heterozygosity of each individual, binned here from popnei's values,
 *   with the number of individuals in their bins; and the download of
 *   their table as CSV, which is not drawn, since there may be thousands
 *   of individuals.
 *
 * Plain, as the owner wants this page: no mean in the titles, no table of
 * the bins, and no bar nor button of its own: the bar of the pass, its
 * Stop and Start again are in the box of the file. Each part says, over
 * the room of its plots, that it is calculated, with the share done, or
 * that it was stopped; once the pass failed, whose words the box says, a
 * short line in place of its plots. When another file is opened with the
 * focus in the section, the focus goes to the open button.
 *
 * The open button is under the section, so the section keeps its height
 * from the moment it is drawn, the file read, to the end of the pass: the
 * words of a part lie over the room of its plots, which is kept, hidden,
 * until they are drawn; and the download keeps its room, hidden, until
 * the table is there. So a click aimed at the open button as the pass
 * ends, or a press held across that end, is not lost. Only a failure,
 * whose line takes the place of the plots, and a line of individuals with
 * no called genotype under their plot, change it.
 */
import { useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";

import type { AnalysisStatus } from "../../core/store.ts";
import type {
  IndividualStatsPart,
  JobResult,
  VariantStatsPart,
  VariantsSummaryResult,
} from "../../worker/protocol.ts";
import { progressShare } from "../analyses/words.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { classOf } from "../classOf.ts";
import { individualChecksCsv } from "../../core/analyses/individualChecks.ts";
import { downloadText } from "../download.ts";
import { statsCsvName } from "../steps/variants/individualStats.ts";
import { useAppState } from "../store.tsx";
import {
  IndividualPlace,
  IndividualsDownload,
  Part,
  PlotsRoom,
  StatsFrame,
  StatsRoom,
} from "./StatsLayout.tsx";
import styles from "./StatsLayout.module.css";
import {
  INDIVIDUALS_HEADING,
  INDIVIDUAL_STATISTICS,
  PART_FAILED,
  PART_STOPPED,
  VARIANTS_HEADING,
  VARIANT_STATISTICS,
  individualTitle,
  statsRunningLine,
  variantTitle,
} from "./statsWords.ts";
import type { StatsPart } from "./statsWords.ts";
import type { StatsShown } from "./announceChanges.ts";
import { StatsHistogram } from "./StatsHistogram.tsx";
import { individualPlot, variantPlot } from "./statsPlots.ts";
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
  if (variants === null) return null;
  // Until the file is read, the room of the statistics, as high as the
  // section that follows.
  if (variants.read.kind !== "read") return <StatsRoom />;
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
}

/** The section of one load of the file. */
function Stats({
  autoRuns,
  openButton,
  onShown,
  fileId,
  variantsName,
}: StatsProps): React.JSX.Element {
  const sectionRef = useRef<HTMLElement>(null);
  const status = useAppState(summaryStatus);
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

  /** What a part says over the room of its plots: the share done while
      the pass runs, that it was stopped, why it cannot run, or nothing
      once done, failed or about to start. */
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

  const result = summaryOf(status);
  const perIndividual = result?.perIndividual ?? null;
  return (
    <StatsFrame sectionRef={sectionRef}>
      <Part heading={VARIANTS_HEADING}>
        {status.kind === "error" ? (
          <p className={classOf(styles, "line")}>{PART_FAILED}</p>
        ) : (
          <PlotsRoom line={lineOf("variants")}>
            <VariantPlots result={result?.perVar ?? null} />
          </PlotsRoom>
        )}
      </Part>
      <Part heading={INDIVIDUALS_HEADING}>
        {status.kind === "error" ? (
          <p className={classOf(styles, "line")}>{PART_FAILED}</p>
        ) : (
          <>
            <PlotsRoom line={lineOf("individuals")}>
              <IndividualPlots result={perIndividual} />
            </PlotsRoom>
            <IndividualsDownload
              onPress={
                perIndividual === null
                  ? null
                  : () => {
                      downloadText(
                        statsCsvName(variantsName),
                        individualChecksCsv(perIndividual),
                        "text/csv",
                      );
                    }
              }
            />
          </>
        )}
      </Part>
    </StatsFrame>
  );
}

/** The result of the summary once done; `null` in any other state. A
    defect for a result of another analysis, which the store never gives
    it. */
function summaryOf(
  status: AnalysisStatus<JobResult>,
): VariantsSummaryResult | null {
  if (status.kind !== "done") return null;
  const result = status.result;
  if (result.analysis !== "variantsSummary") {
    throw new Error(
      `popnei_web defect: the summary of the variants file has a result of ${result.analysis}.`,
    );
  }
  return result;
}

/** What the plots of the variants are drawn with. */
interface VariantPlotsProps {
  /** The result, or `null` before it, for the room of the plots. */
  readonly result: VariantStatsPart | null;
}

/** The four histograms of the variants, each over the variants in its
    bins, or the room they keep. */
function VariantPlots({ result }: VariantPlotsProps): React.JSX.Element {
  // Made again only for another result, so that the plots are not drawn
  // again on renders that changed nothing (react.md, "Mounting a plot").
  const plots = useMemo(
    () =>
      VARIANT_STATISTICS.map((statistic) => ({
        statistic,
        plot: result === null ? null : variantPlot(statistic, result),
      })),
    [result],
  );
  return (
    <>
      {plots.map(({ statistic, plot }) => (
        <StatsHistogram
          key={statistic}
          title={variantTitle(statistic)}
          plot={plot}
        />
      ))}
    </>
  );
}

/** What the plots of the individuals are drawn with. */
interface IndividualPlotsProps {
  /** The result, or `null` before it, for the room of the plots. */
  readonly result: IndividualStatsPart | null;
}

/** The two histograms of the individuals, each over the individuals
    with a value, and under each the line of those with none, or the room
    they keep. */
function IndividualPlots({ result }: IndividualPlotsProps): React.JSX.Element {
  const plots = useMemo(
    () =>
      INDIVIDUAL_STATISTICS.map((statistic) => ({
        statistic,
        shown: result === null ? null : individualPlot(statistic, result),
      })),
    [result],
  );
  return (
    <>
      {plots.map(({ statistic, shown }) => (
        <IndividualPlace
          key={statistic}
          noValueLine={shown?.noValueLine ?? null}
        >
          <StatsHistogram
            title={individualTitle(statistic)}
            plot={shown?.plot ?? null}
          />
        </IndividualPlace>
      ))}
    </>
  );
}
