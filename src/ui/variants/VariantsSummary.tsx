/**
 * The box of the variants file on popgen2.html, above the open button
 * (docs/plans/open-variants.md, "Two widgets"; the owner's layout of 6
 * October 2026), and under it the table of the variants on each
 * chromosome. The box says what is known of the file open, line by line:
 * its name and size, its individuals, its variants, its chromosomes and
 * its ploidy. What the opening knows is shown at once; the individuals,
 * and the ploidy of a `.nei` file, once the file is read; the variants
 * and the chromosomes once they are counted, which starts by itself
 * (autoRuns.ts). While they are counted, the bar of the count and its
 * Stop stand in place of their two lines; after a Stop, its words and
 * Count again. What went wrong with the file stands in place of what it
 * would have told: a file popnei could not read in place of all the
 * lines but the first, a count refused in place of the variants and the
 * chromosomes. A file refused by its name, or several files at once, is
 * said first in the box, over the file still open, or alone with none.
 * There is no box before a file is opened or refused.
 */
import { useLayoutEffect, useRef } from "react";

import { chromRows } from "../../core/analyses/variantsSummary.ts";
import { escaped, grouped, variantsOpenNeeds } from "../../core/project.ts";
import type { VariantSource } from "../../core/project.ts";
import type { AnalysisError, AnalysisStatus } from "../../core/store.ts";
import type { JobResult, Progress } from "../../worker/protocol.ts";
import { RunButton } from "../analyses/RunButton.tsx";
import type { ButtonOf } from "../analyses/status.ts";
import { progressShare } from "../analyses/words.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { classOf } from "../classOf.ts";
import { useRunSeconds } from "../runSeconds.ts";
import { useAnnouncer } from "../shell/announcer.tsx";
import { ReadingTime } from "../steps/variants/ReadingTime.tsx";
import { useAppState, useStore } from "../store.tsx";
import { Problem } from "../widgets/Problem.tsx";
import { ProgressBar } from "../widgets/ProgressBar.tsx";
import { Table } from "../widgets/Table.tsx";
import type { Refusal } from "./OpenVariants.tsx";
import styles from "./Variants.module.css";
import {
  CHROMOSOMES_NOT_COUNTED,
  CHROMS_CAPTION,
  CHROM_COLUMN,
  COUNT_AGAIN_LABEL,
  COUNT_BAR_LABEL,
  INFO_NAME,
  NUM_VARS_COLUMN,
  PLOIDY_NOT_READ,
  READING_LINE,
  STOPPED_TEXT,
  SUMMARY_ID,
  VARIANTS_NOT_COUNTED,
  chromosomesLine,
  countAgainMends,
  countingText,
  failedText,
  individualsLine,
  nameAndSizeText,
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
  /** The words of the last file not opened, which the box shows while
      the load they were said beside is the project's. */
  readonly refusal: Refusal | null;
}

/** The box of the file and the table of its chromosomes; nothing before
    a file is opened or refused. */
export function VariantsSummary({
  autoRuns,
  openButton,
  refusal,
}: VariantsSummaryProps): React.JSX.Element | null {
  const variants = useAppState((s) => s.project.variants);
  const refusalText =
    refusal !== null && refusal.forLoad === (variants?.fileId ?? null)
      ? refusal.text
      : null;
  if (variants === null && refusalText === null) return null;
  return (
    <div className={classOf(styles, "info")}>
      <section aria-label={INFO_NAME} className={classOf(styles, "box")}>
        {refusalText !== null && <Problem>{refusalText}</Problem>}
        {variants !== null && (
          // Another load is other lines, so that those before go, with
          // the focus they held.
          <Load
            key={variants.fileId}
            autoRuns={autoRuns}
            openButton={openButton}
            variants={variants}
          />
        )}
      </section>
      {variants?.read.kind === "read" && <ChromTable />}
    </div>
  );
}

/** What the lines of one load of the file are drawn with. */
interface LoadProps {
  readonly autoRuns: AutoRuns;
  readonly openButton: React.RefObject<HTMLButtonElement | null>;
  /** The file. */
  readonly variants: VariantSource;
}

/** The lines of one load of the file, in each state of its read. */
function Load({
  autoRuns,
  openButton,
  variants,
}: LoadProps): React.JSX.Element {
  const linesRef = useRef<HTMLDivElement>(null);
  const reason = useAppState((s) => variantsOpenNeeds(s.project));
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
  const { read, readOptions } = variants;
  return (
    <div ref={linesRef} className={classOf(styles, "lines")}>
      <p className={classOf(styles, "fileName")}>{nameAndSizeText(variants)}</p>
      {read.kind === "pending" && (
        <>
          <p className={classOf(styles, "line")}>
            {READING_LINE}{" "}
            <ReadingTime className={classOf(styles, "mutedText")} />
          </p>
          <p className={classOf(styles, "line")}>{VARIANTS_NOT_COUNTED}</p>
          <p className={classOf(styles, "line")}>{CHROMOSOMES_NOT_COUNTED}</p>
          <p className={classOf(styles, "line")}>
            {readOptions === null
              ? PLOIDY_NOT_READ
              : ploidyLine(readOptions.ploidy, readOptions)}
          </p>
        </>
      )}
      {read.kind === "failed" && reason !== null && <Problem>{reason}</Problem>}
      {read.kind === "read" && (
        <>
          <p className={classOf(styles, "line")}>
            {individualsLine(read.individuals.length)}
          </p>
          <Count autoRuns={autoRuns} readOptions={readOptions} />
          <p className={classOf(styles, "line")}>
            {ploidyLine(read.ploidy, readOptions)}
          </p>
        </>
      )}
    </div>
  );
}

/** What the count is drawn with. */
interface CountProps {
  readonly autoRuns: AutoRuns;
  /** How the VCF was read, `null` for a `.nei` file. */
  readonly readOptions: VariantSource["readOptions"];
}

/** The lines of the variants and the chromosomes, or what stands in
    their place while they are counted, after a Stop or a failure. */
function Count({ autoRuns, readOptions }: CountProps): React.JSX.Element {
  const store = useStore();
  const announcer = useAnnouncer();
  const status = useAppState(summaryStatus);
  const project = useAppState((s) => s.project);
  const countRef = useRef<HTMLDivElement>(null);

  const stop = (): void => {
    store.cancelRun(SUMMARY_ID);
    announcer.announce(STOPPED_TEXT);
  };
  const again = (): void => {
    autoRuns.again(SUMMARY_ID);
  };
  const button = buttonOf(status, autoRuns);
  return (
    // It takes the focus when Stop goes with it, the count done or
    // failed, so that the focus is not sent to the top of the page: a
    // screen reader then reads the two lines, or what stands in their
    // place. It is not in the order of the Tab key.
    <div ref={countRef} tabIndex={-1} className={classOf(styles, "count")}>
      <CountBody
        status={status}
        stopped={button?.kind === "run"}
        readOptions={readOptions}
        failed={(error) => failedText(error, project)}
      />
      {button !== null && (
        <div className={classOf(styles, "countButton")}>
          <RunButton
            button={button}
            runLabel={COUNT_AGAIN_LABEL}
            onRun={again}
            onStop={stop}
            onGone={() => {
              // The button went, the count done, and the lines stay:
              // when the lines go, their own cleanup has already moved
              // the focus to the open button.
              countRef.current?.focus();
            }}
          />
        </div>
      )}
    </div>
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

/** What the body of the count is drawn with. */
interface CountBodyProps {
  readonly status: AnalysisStatus<JobResult>;
  /** Whether a count of the key was stopped. */
  readonly stopped: boolean;
  /** How the VCF was read, `null` for a `.nei` file. */
  readonly readOptions: VariantSource["readOptions"];
  /** The words of a failure. */
  readonly failed: (error: AnalysisError) => string;
}

/** The two lines, the bar, or the words of the state of the count. */
function CountBody({
  status,
  stopped,
  readOptions,
  failed,
}: CountBodyProps): React.JSX.Element {
  switch (status.kind) {
    case "locked":
      return <p className={classOf(styles, "muted")}>{status.reason}</p>;
    case "ready":
    case "removed":
      return stopped ? (
        <p className={classOf(styles, "line")}>{STOPPED_TEXT}</p>
      ) : (
        <>
          <p className={classOf(styles, "line")}>{VARIANTS_NOT_COUNTED}</p>
          <p className={classOf(styles, "line")}>{CHROMOSOMES_NOT_COUNTED}</p>
        </>
      );
    case "running":
      return <Counting runId={status.runId} progress={status.progress} />;
    case "error":
      return <Problem>{failed(status.error)}</Problem>;
    case "done":
      return (
        <>
          <p className={classOf(styles, "line")}>
            {variantsLine(status.result.passStats.numVars, readOptions)}
          </p>
          <p className={classOf(styles, "line")}>
            {chromosomesLine(chromRows(status.result).length)}
          </p>
        </>
      );
  }
}

/** The table of the chromosomes and their variants, once counted. */
function ChromTable(): React.JSX.Element | null {
  const status = useAppState(summaryStatus);
  if (status.kind !== "done") return null;
  const rows = chromRows(status.result);
  return (
    <Table
      caption={CHROMS_CAPTION}
      columns={[
        { id: "chrom", label: CHROM_COLUMN, isRowHeader: true },
        { id: "numVars", label: NUM_VARS_COLUMN, isNumeric: true },
      ]}
      rows={rows.map((row) => ({
        id: row.chrom,
        cells: [escaped(row.chrom), grouped(row.numVars)],
      }))}
      limitedHeight={rows.length > LONG_TABLE}
    />
  );
}

/** The rows past which the table of the chromosomes scrolls in a frame of
    limited height, so that a file of thousands of scaffolds does not push
    the page thousands of pixels down. */
const LONG_TABLE = 20;

/** What the bar of a count under way is drawn with. */
interface CountingProps {
  /** The id of its request. */
  readonly runId: number;
  /** How far it has gone, or `null` until the worker says. */
  readonly progress: Progress | null;
}

/** The bar and the line of a count under way, with the seconds since it
    started. */
function Counting({ runId, progress }: CountingProps): React.JSX.Element {
  const seconds = useRunSeconds(runId);
  const share = progress === null ? null : progressShare(progress);
  return (
    <div className={classOf(styles, "running")}>
      <ProgressBar label={COUNT_BAR_LABEL} value={share} />
      <p className={classOf(styles, "line")}>{countingText(share, seconds)}</p>
    </div>
  );
}
