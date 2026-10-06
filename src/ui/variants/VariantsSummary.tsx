/**
 * The box of the variants file on popgen2.html, above the open button
 * (docs/plans/open-variants.md, "Two widgets" and "Round 3"; the owner's
 * layouts and decisions of 6 October 2026). It says what is known of the
 * file open, line by line: its name and size, its individuals, its
 * variants, its chromosomes and its ploidy, the file's. What the opening
 * knows is shown at once; the individuals and the ploidy once the file is
 * read; the variants and the chromosomes once they are counted, which
 * starts by itself (autoRuns.ts). Under the lines, a row of one height in
 * every state holds the seconds of the read, the bar of the count with
 * its Stop, or Count again.
 *
 * The box keeps its height through the read and the count, a value not
 * known yet said in its place, so that the open button under it does not
 * move from under the pointer as a read or a count ends. Only a problem
 * adds to it, after the lines: a file popnei could not read, in place of
 * all the lines but the first; a count refused; a file refused by its
 * name, or several files at once, after the lines of the file still open,
 * or alone with none. There is no box before a file is opened or refused.
 */
import { useLayoutEffect, useRef } from "react";

import { chromRows } from "../../core/analyses/variantsSummary.ts";
import type { VariantSource } from "../../core/project.ts";
import type { AnalysisStatus } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import { RunButton } from "../analyses/RunButton.tsx";
import type { ButtonOf } from "../analyses/status.ts";
import { progressShare } from "../analyses/words.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { classOf } from "../classOf.ts";
import { useAnnouncer } from "../shell/announcer.tsx";
import { ReadingTime } from "../steps/variants/ReadingTime.tsx";
import { useAppState, useStore } from "../store.tsx";
import { Problem } from "../widgets/Problem.tsx";
import { ProgressBar } from "../widgets/ProgressBar.tsx";
import type { Refusal } from "./OpenVariants.tsx";
import styles from "./Variants.module.css";
import {
  CHROMOSOMES_COUNTING,
  CHROMOSOMES_NOT_COUNTED,
  CHROMOSOMES_READING,
  COUNT_AGAIN_LABEL,
  COUNT_BAR_LABEL,
  INDIVIDUALS_READING,
  INFO_NAME,
  PLOIDY_READING,
  READING_TIME_LINE,
  STOPPED_TEXT,
  SUMMARY_ID,
  VARIANTS_NOT_COUNTED,
  VARIANTS_READING,
  chromosomesLine,
  countAgainMends,
  countingVariantsLine,
  failedText,
  individualsLine,
  nameAndSizeText,
  openFailedText,
  ploidyLine,
  summaryStatus,
  variantsLine,
} from "./words.ts";

/** What the box is drawn with. */
export interface VariantsSummaryProps {
  /** The analyses the page starts by itself, for Count again and to tell
      a count stopped from one not yet started. */
  readonly autoRuns: AutoRuns;
  /** The open button of the page, which takes the focus when the lines
      of a load go while the focus is in them. */
  readonly openButton: React.RefObject<HTMLButtonElement | null>;
  /** Called with the element of Stop or Count again while one is shown,
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
}

/** The lines of one load of the file, in each state of its read. */
function Load({
  autoRuns,
  openButton,
  onCountButton,
  variants,
}: LoadProps): React.JSX.Element {
  const linesRef = useRef<HTMLDivElement>(null);
  const reason = useAppState((s) => openFailedText(s.project));
  useLayoutEffect(() => {
    const lines = linesRef.current;
    // The open button is one element whatever the zone holds.
    const button = openButton.current;
    return () => {
      // The lines go, a new file dropped or read again, while the focus
      // is in them, on Stop, on Count again or on the lines of the
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
      {read.kind === "failed" && reason !== null && <Problem>{reason}</Problem>}
      {read.kind === "read" && (
        <>
          <p className={classOf(styles, "line")}>
            {individualsLine(read.individuals.length)}
          </p>
          <Count
            autoRuns={autoRuns}
            onCountButton={onCountButton}
            ploidy={ploidyLine(read.ploidy)}
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
}

/** The lines of the variants and the chromosomes, in each state of their
    count, the line of the ploidy, the row of the progress with Stop or
    Count again, and a failure of the count after them. */
function Count({
  autoRuns,
  onCountButton,
  ploidy,
}: CountProps): React.JSX.Element {
  const store = useStore();
  const announcer = useAnnouncer();
  const status = useAppState(summaryStatus);
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

  const stop = (): void => {
    store.cancelRun(SUMMARY_ID);
    announcer.announce(STOPPED_TEXT);
  };
  const again = (): void => {
    autoRuns.again(SUMMARY_ID);
  };
  const button = buttonOf(status, autoRuns);
  const failure =
    status.kind === "error" ? failedText(status.error, project) : null;
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
        <CountLines status={status} stopped={button?.kind === "run"} />
      </div>
      <p className={classOf(styles, "line")}>{ploidy}</p>
      {/* The row goes when a failure leaves nothing in it, for the words
          of the failure to follow the lines: the height of the box
          changes then anyway. */}
      {(failure === null || button !== null) && (
        <div className={classOf(styles, "progress")}>
          {status.kind === "running" && (
            <div className={classOf(styles, "progressBar")}>
              <ProgressBar
                label={COUNT_BAR_LABEL}
                value={
                  status.progress === null
                    ? null
                    : progressShare(status.progress)
                }
              />
            </div>
          )}
          {button !== null && (
            <div className={classOf(styles, "progressButton")}>
              <RunButton
                button={button}
                runLabel={COUNT_AGAIN_LABEL}
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
/** Stop while the count runs; Count again after a Stop, or after a
    failure it may mend; none otherwise. */
function buttonOf(
  status: AnalysisStatus<JobResult>,
  autoRuns: AutoRuns,
): ButtonOf {
  switch (status.kind) {
    case "running":
      return { kind: "stop" };
    case "ready":
    case "removed":
      return autoRuns.startedUnder(status.key)
        ? { kind: "run", reason: null }
        : null;
    case "error":
      return countAgainMends(status.error)
        ? { kind: "run", reason: null }
        : null;
    case "locked":
    case "done":
      return null;
  }
}

/** What the lines of the count are drawn with. */
interface CountLinesProps {
  readonly status: AnalysisStatus<JobResult>;
  /** Whether a count of the key was stopped. */
  readonly stopped: boolean;
}

/** The lines of the variants and the chromosomes: their numbers, or the
    state of their count in their place. */
function CountLines({ status, stopped }: CountLinesProps): React.JSX.Element {
  let lines: readonly [string, string];
  switch (status.kind) {
    case "running":
      lines = [
        countingVariantsLine(
          status.progress === null ? null : progressShare(status.progress),
        ),
        CHROMOSOMES_COUNTING,
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
        chromosomesLine(chromRows(status.result).length),
      ];
      break;
  }
  return (
    <>
      <p className={classOf(styles, "line")}>{lines[0]}</p>
      <p className={classOf(styles, "line")}>{lines[1]}</p>
    </>
  );
}
