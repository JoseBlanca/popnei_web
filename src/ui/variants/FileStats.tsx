/**
 * The statistics of the open file on popgen2.html, between the box of
 * the file and the open button, which the owner put at the bottom of the
 * page (docs/plans/file-stats.md, "The design" and "Round 1 with the
 * owner"; steps 3 and 4 of case 2 of docs/use-cases.md). Two parts, each
 * under its heading:
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
 * the bins.
 *
 * Above the parts, one row: the bar of the pass running with one Stop for
 * both statistics, or, once stopped or after a crash of the worker, the
 * button that starts again those not done. Each part says, over the room
 * of its plots, what it waits for, that a failure or a Stop before it
 * held it back, that it was stopped, or that it is calculated with its
 * share done; in place of its plots, the words of its own failure; a
 * failure of one hides nothing of the other. When the button goes with
 * the focus on it, the focus goes to the heading of the part that failed,
 * or of the variants; when another file is opened, to the open button.
 *
 * The open button is under the section, so the section keeps its height
 * from the moment it is drawn, the file read, to the end of the second
 * pass: the row of the button is one button high in every state, empty
 * when there is none; the words of a part lie over the room of its
 * plots, which is kept, hidden, until they are drawn; and the download
 * keeps its room, hidden, until the table is there. So a click aimed at
 * the open button as a pass ends, or a press held across that end, is
 * not lost. Only a failure, whose words take the place of the plots, a
 * line of individuals with no called genotype under their plot, and the
 * user's own Stop, which only the bar leaves, change it.
 */
import { useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";

import type { AnalysisStatus } from "../../core/store.ts";
import type {
  IndividualChecksResult,
  JobResult,
  VariantChecksResult,
} from "../../worker/protocol.ts";
import { RunButton } from "../analyses/RunButton.tsx";
import type { ButtonOf } from "../analyses/status.ts";
import { resultOf } from "../analyses/status.ts";
import { progressShare } from "../analyses/words.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { classOf } from "../classOf.ts";
import { POPGEN2_STATISTICS_IDS } from "../popgen2Store.ts";
import { useAnnouncer } from "../shell/announcer.tsx";
import { individualChecksCsv } from "../../core/analyses/individualChecks.ts";
import { downloadText } from "../download.ts";
import { statsCsvName } from "../steps/variants/individualStats.ts";
import { useAppState } from "../store.tsx";
import { Problem } from "../widgets/Problem.tsx";
import { ProgressBar } from "../widgets/ProgressBar.tsx";
import {
  ControlsRow,
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
  INDIVIDUALS_ID,
  INDIVIDUAL_STATISTICS,
  RESUME_STATS_LABEL,
  STATS_PROGRESS_KIND,
  STATS_STOPPED_TEXT,
  STOP_STATS_LABEL,
  VARIANTS_HEADING,
  VARIANTS_ID,
  VARIANT_STATISTICS,
  individualTitle,
  pendingText,
  statsBarLabel,
  statsButton,
  statsFailedText,
  statsRunningLine,
  statsStartText,
  statsStatus,
  variantTitle,
} from "./statsWords.ts";
import type { StatsId } from "./statsWords.ts";
import type { StatsShown } from "./announceChanges.ts";
import { StatsHistogram } from "./StatsHistogram.tsx";
import { individualPlot, variantPlot } from "./statsPlots.ts";
import { summaryStatus } from "./words.ts";

/** What the section is drawn with. */
export interface FileStatsProps {
  /** The analyses the page starts by itself, which stop, start again and
      say why one has not started. */
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
  const announcer = useAnnouncer();
  const sectionRef = useRef<HTMLElement>(null);
  const variantsHeading = useRef<HTMLHeadingElement>(null);
  const individualsHeading = useRef<HTMLHeadingElement>(null);
  // Selected for what autoRuns says of the statistics not started, which
  // changes with the count, and with what autoRuns knows, which a Stop
  // with no pass running changes and the store does not.
  useAppState(summaryStatus);
  useSyncExternalStore(autoRuns.subscribe, autoRuns.getVersion);
  const individuals = useAppState((s) => statsStatus(s, INDIVIDUALS_ID));
  const variants = useAppState((s) => statsStatus(s, VARIANTS_ID));
  const project = useAppState((s) => s.project);

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

  // Whether the button went with the focus in the drawing being made.
  const focusAfterGone = useRef(false);
  useLayoutEffect(() => {
    if (!focusAfterGone.current) return;
    focusAfterGone.current = false;
    // The part whose failure took the button, else the variants, the
    // first part.
    const failed =
      individuals.kind === "error" && variants.kind !== "error"
        ? individualsHeading
        : variantsHeading;
    failed.current?.focus();
  });

  const pendingOf = (id: StatsId, status: AnalysisStatus<JobResult>) =>
    status.kind === "ready" || status.kind === "removed"
      ? autoRuns.pending(id)
      : null;
  const button = statsButton(
    [individuals, variants],
    [pendingOf(INDIVIDUALS_ID, individuals), pendingOf(VARIANTS_ID, variants)],
    autoRuns.canResume(POPGEN2_STATISTICS_IDS),
  );
  const runButton: ButtonOf =
    button === null
      ? null
      : button.kind === "stop"
        ? { kind: "stop" }
        : { kind: "run", reason: null };
  const running: {
    readonly id: StatsId;
    readonly share: number | null;
  } | null =
    individuals.kind === "running"
      ? { id: INDIVIDUALS_ID, share: shareOf(individuals) }
      : variants.kind === "running"
        ? { id: VARIANTS_ID, share: shareOf(variants) }
        : null;

  const stop = (): void => {
    autoRuns.stop(POPGEN2_STATISTICS_IDS);
    announcer.announce(STATS_STOPPED_TEXT, { replaces: STATS_PROGRESS_KIND });
  };
  const resume = (): void => {
    // Said here, since the store does not tell this start from the second
    // pass that follows the first; when it says it too, the region says
    // it once.
    if (autoRuns.resume(POPGEN2_STATISTICS_IDS)) {
      announcer.announce(statsStartText(variantsName), {
        replaces: STATS_PROGRESS_KIND,
      });
    }
  };

  /** What a part says over the room of its plots: its share done while
      it runs, what holds it back, or nothing once done or failed. */
  const lineOf = (
    id: StatsId,
    status: AnalysisStatus<JobResult>,
  ): string | null => {
    switch (status.kind) {
      case "done":
      case "error":
        return null;
      case "running":
        return statsRunningLine(id, shareOf(status));
      case "ready":
      case "removed":
        // A statistic ready that autoRuns knows nothing of starts by
        // itself in a moment.
        return pendingText(
          autoRuns.pending(id) ?? { kind: "waiting", after: null },
        );
      case "locked":
        return status.reason;
    }
  };

  const variantsResult = resultOf(variants, VARIANTS_ID);
  const individualsResult = resultOf(individuals, INDIVIDUALS_ID);
  return (
    <StatsFrame sectionRef={sectionRef}>
      <ControlsRow>
        {running !== null && (
          <div className={classOf(styles, "bar")}>
            <ProgressBar
              label={statsBarLabel(running.id)}
              value={running.share}
            />
          </div>
        )}
        {runButton !== null && (
          <div className={classOf(styles, "button")}>
            <RunButton
              button={runButton}
              runLabel={RESUME_STATS_LABEL}
              stopLabel={STOP_STATS_LABEL}
              onRun={resume}
              onStop={stop}
              onGone={() => {
                // The headings are drawn by the time the effects of the
                // drawing run, after this cleanup.
                focusAfterGone.current = true;
              }}
            />
          </div>
        )}
      </ControlsRow>
      <Part heading={VARIANTS_HEADING} headingRef={variantsHeading}>
        {variants.kind === "error" ? (
          <Problem>
            {statsFailedText(VARIANTS_ID, variants.error, project)}
          </Problem>
        ) : (
          <PlotsRoom line={lineOf(VARIANTS_ID, variants)}>
            <VariantPlots result={variantsResult} />
          </PlotsRoom>
        )}
      </Part>
      <Part heading={INDIVIDUALS_HEADING} headingRef={individualsHeading}>
        {individuals.kind === "error" ? (
          <Problem>
            {statsFailedText(INDIVIDUALS_ID, individuals.error, project)}
          </Problem>
        ) : (
          <>
            <PlotsRoom line={lineOf(INDIVIDUALS_ID, individuals)}>
              <IndividualPlots result={individualsResult} />
            </PlotsRoom>
            <IndividualsDownload
              onPress={
                individualsResult === null
                  ? null
                  : () => {
                      downloadText(
                        statsCsvName(variantsName),
                        individualChecksCsv(individualsResult),
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

/** The share done of a pass running, or `null` before its first
    progress. */
function shareOf(
  status: Extract<AnalysisStatus<JobResult>, { readonly kind: "running" }>,
): number | null {
  return status.progress === null ? null : progressShare(status.progress);
}

/** What the plots of the variants are drawn with. */
interface VariantPlotsProps {
  /** The result, or `null` before it, for the room of the plots. */
  readonly result: VariantChecksResult | null;
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
  readonly result: IndividualChecksResult | null;
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
