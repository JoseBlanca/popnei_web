/**
 * The box of the variants file on popgen2.html, above the open button
 * (docs/plans/open-variants.md, "Two widgets" and "Round 3"; the owner's
 * layouts and decisions of 6 October 2026). It says what is known of the
 * file open, line by line: its name and size, its individuals, its
 * variants, for a VCF those that failed their FILTER, its chromosomes and
 * its ploidy, the file's. What the opening knows is shown at once; the
 * individuals and the ploidy once the file is read; the variants and the
 * chromosomes once they are counted, by the one pass that also calculates
 * the statistics of the file, which starts by itself (autoRuns.ts;
 * docs/plans/live-stats.md), with the variants read so far while it
 * runs, from its results so far; the FILTER failures once the pass that
 * counts them, after it in the chain of the page, is done. Under the
 * lines, a row of one height in every state holds the seconds of the
 * read, the bar of the pass running with the page's one Stop, or Start
 * again.
 *
 * The box keeps its height through the read and the count, a value not
 * known yet said in its place, so that the open button under it does not
 * move from under the pointer as a read or a count ends. Only a problem
 * adds to it, after the lines: a file popnei could not read, in place of
 * all the lines but the first; a count refused; a file refused by its
 * name, or several files at once, after the lines of the file still open,
 * or alone with none. There is no box before a file is opened or refused.
 */
import { useLayoutEffect, useRef, useSyncExternalStore } from "react";

import { numFilterFailures } from "../../core/analyses/filterFailures.ts";
import { numChroms } from "../../core/analyses/variantsSummary.ts";
import type { VariantSource } from "../../core/project.ts";
import type { AnalysisStatus } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import { RunButton } from "../analyses/RunButton.tsx";
import { progressShare } from "../analyses/words.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { classOf } from "../classOf.ts";
import { POPGEN2_CHAIN } from "../popgen2Store.ts";
import { useAnnouncer } from "../shell/announcer.tsx";
import { ReadingTime } from "../steps/variants/ReadingTime.tsx";
import { useAppState } from "../store.tsx";
import { Problem } from "../widgets/Problem.tsx";
import { ProgressBar } from "../widgets/ProgressBar.tsx";
import type { Refusal } from "./OpenVariants.tsx";
import { chainButton, chainStatuses, startAgainMends } from "./chain.ts";
import styles from "./Variants.module.css";
import {
  CHROMOSOMES_COUNTING,
  CHROMOSOMES_NOT_COUNTED,
  CHROMOSOMES_READING,
  COUNT_BAR_LABEL,
  FAILURES_BAR_LABEL,
  FAILURES_COUNTING,
  FAILURES_NOT_COUNTED,
  FAILURES_READING,
  FAILURES_STOPPED_TEXT,
  INDIVIDUALS_READING,
  INFO_NAME,
  PLOIDY_READING,
  PYTHON_NAME,
  READING_TIME_LINE,
  START_AGAIN_LABEL,
  STOPPED_TEXT,
  VARIANTS_NOT_COUNTED,
  VARIANTS_READING,
  chromosomesLine,
  chromosomesSoFarLine,
  countingVariantsLine,
  failedText,
  failuresFailedText,
  failuresLine,
  failuresStatus,
  individualsLine,
  nameAndSizeText,
  openFailure,
  ploidyLine,
  summaryStatus,
  variantsLine,
} from "./words.ts";

/** What the box is drawn with. */
export interface VariantsSummaryProps {
  /** The analyses the page starts by itself, for Stop and Start again
      and to tell a count stopped from one not yet started. */
  readonly autoRuns: AutoRuns;
  /** The open button of the page, which takes the focus when the lines
      of a load go while the focus is in them. */
  readonly openButton: React.RefObject<HTMLButtonElement | null>;
  /** Called with the element of Stop or Start again while one is shown,
      and with `null` when it goes, for the entry to tell whether the
      focus is on it as the count ends. */
  readonly onCountButton: (node: HTMLButtonElement | null) => void;
  /** The words of the last file not opened, which the box shows while
      the load they were said beside is the project's. */
  readonly refusal: Refusal | null;
}

/** The box of the file; nothing before a file is opened or refused. */
export function VariantsSummary({
  autoRuns,
  openButton,
  onCountButton,
  refusal,
}: VariantsSummaryProps): React.JSX.Element | null {
  const variants = useAppState((s) => s.project.variants);
  const refusalText =
    refusal !== null && refusal.forLoad === (variants?.fileId ?? null)
      ? refusal.text
      : null;
  if (variants === null && refusalText === null) return null;
  return (
    <section aria-label={INFO_NAME} className={classOf(styles, "box")}>
      {variants !== null && (
        // Another load is other lines, so that those before go, with
        // the focus they held.
        <Load
          key={variants.fileId}
          autoRuns={autoRuns}
          openButton={openButton}
          onCountButton={onCountButton}
          variants={variants}
          refused={refusalText !== null}
        />
      )}
      {refusalText !== null && <Problem>{refusalText}</Problem>}
    </section>
  );
}

/** What the lines of one load of the file are drawn with. */
interface LoadProps {
  readonly autoRuns: AutoRuns;
  readonly openButton: React.RefObject<HTMLButtonElement | null>;
  readonly onCountButton: (node: HTMLButtonElement | null) => void;
  /** The file. */
  readonly variants: VariantSource;
  /** Whether the words of a file not opened follow the lines. */
  readonly refused: boolean;
}

/** The lines of one load of the file, in each state of its read. */
function Load({
  autoRuns,
  openButton,
  onCountButton,
  variants,
  refused,
}: LoadProps): React.JSX.Element {
  const linesRef = useRef<HTMLDivElement>(null);
  const project = useAppState((s) => s.project);
  const failure = openFailure(project);
  useLayoutEffect(() => {
    const lines = linesRef.current;
    // The open button is one element whatever the zone holds.
    const button = openButton.current;
    return () => {
      // The lines go, a new file opened or dropped, while the focus
      // is in them, on Stop, on Start again or on the lines of the
      // count: the focus goes to the open button, not to the top of the
      // page. The cleanup of a layout effect runs while the lines are
      // still in the page.
      if (lines?.contains(document.activeElement) === true) {
        button?.focus();
      }
    };
  }, [openButton]);
  const { read } = variants;
  return (
    <div ref={linesRef} className={classOf(styles, "lines")}>
      <p className={classOf(styles, "fileName")}>{nameAndSizeText(variants)}</p>
      {read.kind === "pending" && (
        <>
          <p className={classOf(styles, "line")}>{INDIVIDUALS_READING}</p>
          <p className={classOf(styles, "line")}>{VARIANTS_READING}</p>
          {variants.format === "vcf" && (
            <p className={classOf(styles, "line")}>{FAILURES_READING}</p>
          )}
          <p className={classOf(styles, "line")}>{CHROMOSOMES_READING}</p>
          <p className={classOf(styles, "line")}>{PLOIDY_READING}</p>
          <div className={classOf(styles, "progress")}>
            <p className={classOf(styles, "progressLine")}>
              {READING_TIME_LINE}{" "}
              <ReadingTime className={classOf(styles, "mutedText")} />
            </p>
          </div>
        </>
      )}
      {read.kind === "failed" && failure !== null && (
        <>
          <Problem>{failure.text}</Problem>
          {failure.remedy !== null && (
            <>
              <p className={classOf(styles, "line")}>{failure.remedy.words}</p>
              {/* Its lines apart from the words, each on its own row,
                  so that a name of a file does not break them and a
                  copy takes no full stop of a sentence. A long line
                  scrolls inside it, which the keyboard does once the Tab
                  key has given it the focus. */}
              <pre
                tabIndex={0}
                role="region"
                aria-label={PYTHON_NAME}
                className={classOf(styles, "code")}
              >
                <code>{failure.remedy.code}</code>
              </pre>
            </>
          )}
        </>
      )}
      {read.kind === "read" && (
        <>
          <p className={classOf(styles, "line")}>
            {individualsLine(read.individuals.length)}
          </p>
          <Count
            autoRuns={autoRuns}
            onCountButton={onCountButton}
            ploidy={ploidyLine(read.ploidy)}
            refused={refused}
            isVcf={variants.format === "vcf"}
          />
        </>
      )}
    </div>
  );
}

/** What the count is drawn with. */
interface CountProps {
  readonly autoRuns: AutoRuns;
  readonly onCountButton: (node: HTMLButtonElement | null) => void;
  /** The line of the ploidy, drawn between the lines of the count and
      the row of its progress. */
  readonly ploidy: string;
  /** Whether the words of a file not opened follow the lines. */
  readonly refused: boolean;
  /** Whether the file is a VCF, which has the line of the FILTER
      failures. */
  readonly isVcf: boolean;
}

/** The lines of the variants, of a VCF's FILTER failures and of the
    chromosomes, in each state of their count, the line of the ploidy, the
    row of the progress with Stop or Start again, and a failure of a count
    after them. */
function Count({
  autoRuns,
  onCountButton,
  ploidy,
  refused,
  isVcf,
}: CountProps): React.JSX.Element {
  const announcer = useAnnouncer();
  const status = useAppState(summaryStatus);
  const failures = useAppState(failuresStatus);
  const analyses = useAppState((s) => s.analyses);
  // Selected for what autoRuns knows, which a Stop of a pass about to
  // start changes and the store does not.
  useSyncExternalStore(autoRuns.subscribe, autoRuns.getVersion);
  const project = useAppState((s) => s.project);
  // The lines of the count, and the element that holds the words of a
  // failure: one of them takes the focus when the button goes with it.
  const linesRef = useRef<HTMLDivElement>(null);
  const failureRef = useRef<HTMLDivElement>(null);
  // Whether the button went with the focus in the drawing being made.
  const focusAfterGone = useRef(false);
  useLayoutEffect(() => {
    if (!focusAfterGone.current) return;
    focusAfterGone.current = false;
    (failureRef.current ?? linesRef.current)?.focus();
  });

  // The one Stop of the page: the pass running, and one about to start.
  const stop = (): void => {
    autoRuns.stop(POPGEN2_CHAIN);
    announcer.announce(
      status.kind === "done" ? FAILURES_STOPPED_TEXT : STOPPED_TEXT,
    );
  };
  const again = (): void => {
    autoRuns.resume(POPGEN2_CHAIN);
  };
  const button = chainButton(chainStatuses(analyses), (key) =>
    autoRuns.startedUnder(key),
  );
  const failure =
    status.kind === "error"
      ? failedText(status.error, project)
      : failures.kind === "error"
        ? failuresFailedText(failures.error, project)
        : null;
  // The bar of the pass running: the count of the variants and the
  // statistics, or the count of the FILTER failures after it.
  const running = failures.kind === "running" ? failures : status;
  return (
    <>
      {/* It takes the focus when Stop goes with it, the count done, so
          that the focus is not sent to the top of the page: a screen
          reader then reads the two lines. It is not in the order of the
          Tab key. */}
      <div
        ref={linesRef}
        tabIndex={-1}
        className={classOf(styles, "countLines")}
      >
        <CountLines
          status={status}
          failures={isVcf ? failures : null}
          stopped={button?.kind === "run"}
        />
      </div>
      <p className={classOf(styles, "line")}>{ploidy}</p>
      {/* The row goes when it holds nothing and words of a problem
          follow, a failure of the count or a file not opened, for them
          to follow the lines: the height of the box changes then
          anyway. */}
      {(button !== null || (failure === null && !refused)) && (
        <div className={classOf(styles, "progress")}>
          {running.kind === "running" && (
            <div className={classOf(styles, "progressBar")}>
              <ProgressBar
                label={
                  running === failures ? FAILURES_BAR_LABEL : COUNT_BAR_LABEL
                }
                value={
                  running.progress === null
                    ? null
                    : progressShare(running.progress)
                }
              />
            </div>
          )}
          {button !== null && (
            <div className={classOf(styles, "progressButton")}>
              <RunButton
                button={button}
                runLabel={START_AGAIN_LABEL}
                onRun={again}
                onStop={stop}
                onButton={onCountButton}
                onGone={() => {
                  // The button went, the count done or failed for good, and
                  // the lines stay: when the lines go, their own cleanup has
                  // already moved the focus to the open button. The words of
                  // a failure are drawn by the time the effects of the
                  // drawing run, after this cleanup.
                  focusAfterGone.current = true;
                }}
              />
            </div>
          )}
        </div>
      )}
      {/* The words of a failure, after the lines, the one change of the
          height of the box during a count. It takes the focus as the
          lines do. */}
      {failure !== null && (
        <div
          ref={failureRef}
          tabIndex={-1}
          className={classOf(styles, "failure")}
        >
          <Problem>{failure}</Problem>
        </div>
      )}
      {status.kind === "locked" && (
        <p className={classOf(styles, "muted")}>{status.reason}</p>
      )}
    </>
  );
}
/** What the lines of the count are drawn with. */
interface CountLinesProps {
  /** The status of the summary. */
  readonly status: AnalysisStatus<JobResult>;
  /** The status of the count of the FILTER failures; `null` for a `.nei`
      file, which has no line of them. */
  readonly failures: AnalysisStatus<JobResult> | null;
  /** Whether a pass of the chain was stopped: Start again is offered. */
  readonly stopped: boolean;
}

/** The lines of the variants, of the FILTER failures of a VCF and of the
    chromosomes: their numbers, or the state of their count in their
    place. */
function CountLines({
  status,
  failures,
  stopped,
}: CountLinesProps): React.JSX.Element {
  let lines: readonly [string, string];
  switch (status.kind) {
    case "running":
      // From the first result so far, the variants and the chromosomes
      // read so far, and the share on the bar alone.
      lines =
        status.soFar === null
          ? [
              countingVariantsLine(
                status.progress === null
                  ? null
                  : progressShare(status.progress),
              ),
              CHROMOSOMES_COUNTING,
            ]
          : [
              countingVariantsLine(null, status.soFar.passStats.numVars),
              chromosomesSoFarLine(numChroms(status.soFar)),
            ];
      break;
    case "ready":
    case "removed":
      // Not stopped, the count starts by itself in a moment.
      lines = stopped
        ? [VARIANTS_NOT_COUNTED, CHROMOSOMES_NOT_COUNTED]
        : [countingVariantsLine(null), CHROMOSOMES_COUNTING];
      break;
    case "locked":
    case "error":
      lines = [VARIANTS_NOT_COUNTED, CHROMOSOMES_NOT_COUNTED];
      break;
    case "done":
      lines = [
        variantsLine(status.result.passStats.numVars),
        chromosomesLine(numChroms(status.result)),
      ];
      break;
  }
  return (
    <>
      <p className={classOf(styles, "line")}>{lines[0]}</p>
      {failures !== null && (
        <p className={classOf(styles, "line")}>
          {failuresLineOf(failures, status, stopped)}
        </p>
      )}
      <p className={classOf(styles, "line")}>{lines[1]}</p>
    </>
  );
}

/** The line of the FILTER failures, from the status of their count,
    `failures`, and that of the summary before it, `summary`: the number
    once counted; "counting…" while it runs, and while it waits for the
    summary to run or end; "not counted" after a Stop, a failure of its
    own, and a failure of the summary that holds it back. */
function failuresLineOf(
  failures: AnalysisStatus<JobResult>,
  summary: AnalysisStatus<JobResult>,
  stopped: boolean,
): string {
  switch (failures.kind) {
    case "done":
      return failuresLine(numFilterFailures(failures.result));
    case "running":
      return FAILURES_COUNTING;
    case "locked":
    case "error":
      return FAILURES_NOT_COUNTED;
    case "ready":
    case "removed": {
      const heldBack =
        summary.kind === "locked" ||
        (summary.kind === "error" && !startAgainMends(summary.error));
      return stopped || heldBack ? FAILURES_NOT_COUNTED : FAILURES_COUNTING;
    }
  }
}
