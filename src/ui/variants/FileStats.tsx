/**
 * The statistics of the open file on popgen2.html, under the open button
 * so that their plots, which come as each pass ends, never move it
 * (docs/plans/file-stats.md, "The design" and phase 2; steps 3 and 4 of
 * case 2 of docs/use-cases.md). Two parts, each under its heading:
 *
 * - Variants: the histograms of the missing rate, the MAF, the observed
 *   and the expected heterozygosity (unbiased), each with its mean, which
 *   popnei gives, and the number of variants in its bins;
 * - Individuals: the histograms of the missing rate and of the observed
 *   heterozygosity of each individual, binned here from popnei's values
 *   as the old page bins them, with the number of individuals in their
 *   bins and no mean, which popnei does not give; and the table of the
 *   individuals, sorted by any column.
 *
 * Above the parts, one row: the line and the bar of the pass running with
 * one Stop for both statistics, or, once stopped or after a failure a new
 * calculation may mend, the button that starts again those not done.
 * Each part says, in place of its result, that it is being calculated,
 * what it waits for, that a failure before it held it back, that it was
 * stopped, or the words of its own failure; a failure of one hides
 * nothing of the other. When the button goes with the focus on it, the
 * focus goes to the heading of the part that failed, or of the variants;
 * when another file is opened, to the open button.
 *
 * Drawn once the file is read, the statistics then waiting for the count
 * of its variants, which the box above shows.
 */
import { useLayoutEffect, useRef } from "react";

import type { VariantStatistic } from "../../core/analyses/variantChecks.ts";
import type { IndividualStatistic } from "../../core/analyses/individualChecks.ts";
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
import { IndividualHistogram } from "../steps/variants/IndividualHistogram.tsx";
import { IndividualTable } from "../steps/variants/IndividualTable.tsx";
import { VariantHistogram } from "../steps/variants/VariantHistogram.tsx";
import { useAppState } from "../store.tsx";
import { Problem } from "../widgets/Problem.tsx";
import { ProgressBar } from "../widgets/ProgressBar.tsx";
import styles from "./FileStats.module.css";
import {
  INDIVIDUALS_HEADING,
  INDIVIDUALS_ID,
  PART_RUNNING,
  RESUME_STATS_LABEL,
  STATS_NAME,
  STATS_STOPPED_TEXT,
  STOP_STATS_LABEL,
  VARIANTS_HEADING,
  VARIANTS_ID,
  overIndividualsLine,
  overVariantsLine,
  pendingText,
  statsBarLabel,
  statsButton,
  statsFailedText,
  statsRunningLine,
  statsStatus,
} from "./statsWords.ts";
import type { StatsId } from "./statsWords.ts";
import { summaryStatus } from "./words.ts";

/** The four histograms of the variants, in the order they are drawn. */
const VARIANT_STATISTICS: readonly VariantStatistic[] = Object.freeze([
  "missingRate",
  "maf",
  "obsHet",
  "unbiasedExpHet",
]);

/** The two histograms of the individuals, in the order they are drawn. */
const INDIVIDUAL_STATISTICS: readonly IndividualStatistic[] = Object.freeze([
  "missingGenotypes",
  "observedHeterozygosity",
]);

/** What the section is drawn with. */
export interface FileStatsProps {
  /** The analyses the page starts by itself, which stop, start again and
      say why one has not started. */
  readonly autoRuns: AutoRuns;
  /** The open button of the page, which takes the focus when the section
      goes with it, another file opened. */
  readonly openButton: React.RefObject<HTMLButtonElement | null>;
}

/** The statistics of the open file; nothing before a file is read. */
export function FileStats({
  autoRuns,
  openButton,
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
      variantsName={variants.name}
    />
  );
}

/** What the section of one load is drawn with. */
interface StatsProps extends FileStatsProps {
  /** The name of the variants file, which the downloads are named
      after. */
  readonly variantsName: string;
}

/** The section of one load of the file. */
function Stats({
  autoRuns,
  openButton,
  variantsName,
}: StatsProps): React.JSX.Element {
  const announcer = useAnnouncer();
  const sectionRef = useRef<HTMLElement>(null);
  const variantsHeading = useRef<HTMLHeadingElement>(null);
  const individualsHeading = useRef<HTMLHeadingElement>(null);
  // Selected for what autoRuns says of the statistics not started, which
  // changes with the count.
  useAppState(summaryStatus);
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
    announcer.announce(STATS_STOPPED_TEXT);
  };
  const resume = (): void => {
    autoRuns.resume(POPGEN2_STATISTICS_IDS);
  };

  /** What a part shows in place of its result, or `null` once done. */
  const notDone = (
    id: StatsId,
    status: AnalysisStatus<JobResult>,
  ): React.JSX.Element | null => {
    switch (status.kind) {
      case "done":
        return null;
      case "running":
        return <p className={classOf(styles, "line")}>{PART_RUNNING}</p>;
      case "ready":
      case "removed": {
        // A statistic ready that autoRuns knows nothing of starts by
        // itself in a moment.
        const pending = autoRuns.pending(id) ?? {
          kind: "waiting",
          after: null,
        };
        return (
          <p className={classOf(styles, "line")}>{pendingText(pending)}</p>
        );
      }
      case "locked":
        return <p className={classOf(styles, "line")}>{status.reason}</p>;
      case "error":
        return <Problem>{statsFailedText(id, status.error, project)}</Problem>;
    }
  };

  const variantsResult = resultOf(variants, VARIANTS_ID);
  const individualsResult = resultOf(individuals, INDIVIDUALS_ID);
  return (
    <section
      ref={sectionRef}
      aria-label={STATS_NAME}
      className={classOf(styles, "stats")}
    >
      {runButton !== null && (
        <div className={classOf(styles, "controls")}>
          {running !== null && (
            <p className={classOf(styles, "runningLine")}>
              {statsRunningLine(running.id, running.share)}
            </p>
          )}
          <div className={classOf(styles, "barRow")}>
            {running !== null && (
              <div className={classOf(styles, "bar")}>
                <ProgressBar
                  label={statsBarLabel(running.id)}
                  value={running.share}
                />
              </div>
            )}
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
          </div>
        </div>
      )}
      <Part heading={VARIANTS_HEADING} headingRef={variantsHeading}>
        {notDone(VARIANTS_ID, variants)}
        {variantsResult !== null && (
          <VariantPlots result={variantsResult} variantsName={variantsName} />
        )}
      </Part>
      <Part heading={INDIVIDUALS_HEADING} headingRef={individualsHeading}>
        {notDone(INDIVIDUALS_ID, individuals)}
        {individualsResult !== null && (
          <IndividualParts
            result={individualsResult}
            variantsName={variantsName}
          />
        )}
      </Part>
    </section>
  );
}

/** The share done of a pass running, or `null` before its first
    progress. */
function shareOf(
  status: Extract<AnalysisStatus<JobResult>, { readonly kind: "running" }>,
): number | null {
  return status.progress === null ? null : progressShare(status.progress);
}

/** What a part is drawn with. */
interface PartProps {
  /** Its heading. */
  readonly heading: string;
  /** The element of its heading, which takes the focus when the button
      goes with it. */
  readonly headingRef: React.RefObject<HTMLHeadingElement | null>;
  /** What it holds under its heading. */
  readonly children: React.ReactNode;
}

/** A part of the section: its heading, then what it holds. */
function Part({ heading, headingRef, children }: PartProps): React.JSX.Element {
  return (
    <div className={classOf(styles, "part")}>
      {/* It takes the focus when the button goes with it, and is not in
          the order of the Tab key. */}
      <h2 ref={headingRef} tabIndex={-1} className={classOf(styles, "heading")}>
        {heading}
      </h2>
      {children}
    </div>
  );
}

/** What the plots of the variants are drawn with. */
interface VariantPlotsProps {
  readonly result: VariantChecksResult;
  readonly variantsName: string;
}

/** The four histograms of the variants, each over the variants in its
    bins. */
function VariantPlots({
  result,
  variantsName,
}: VariantPlotsProps): React.JSX.Element {
  return (
    <div className={classOf(styles, "plots")}>
      {VARIANT_STATISTICS.map((statistic) => (
        <VariantHistogram
          key={statistic}
          statistic={statistic}
          result={result}
          threshold={null}
          variantsName={variantsName}
          countLine={overVariantsLine(
            result[statistic].counts.reduce((sum, count) => sum + count, 0),
          )}
        />
      ))}
    </div>
  );
}

/** What the plots and the table of the individuals are drawn with. */
interface IndividualPartsProps {
  readonly result: IndividualChecksResult;
  readonly variantsName: string;
}

/** The two histograms of the individuals, each over the individuals with
    a value, and the table of the individuals. */
function IndividualParts({
  result,
  variantsName,
}: IndividualPartsProps): React.JSX.Element {
  return (
    <>
      <div className={classOf(styles, "plots")}>
        {INDIVIDUAL_STATISTICS.map((statistic) => {
          const values =
            statistic === "missingGenotypes"
              ? result.missingGtRate
              : result.obsHetRate;
          const numWithValue = values.filter(
            (value) => !Number.isNaN(value),
          ).length;
          return (
            <div key={statistic} className={classOf(styles, "plot")}>
              <IndividualHistogram
                statistic={statistic}
                result={result}
                threshold={null}
                thresholdLine={null}
                variantsName={variantsName}
                countLine={overIndividualsLine(numWithValue)}
              />
            </div>
          );
        })}
      </div>
      <IndividualTable result={result} variantsName={variantsName} />
    </>
  );
}
