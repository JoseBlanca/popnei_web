/**
 * What the variants file holds, on popgen2.html, once it is read
 * (docs/plans/open-variants.md, "Two widgets"): its name and size, the
 * individuals, the ploidy, and for a VCF which variants were read; then
 * the count of its variants, which starts by itself (autoRuns.ts), with
 * its bar and its Stop while it runs, the number of variants and a table
 * of the chromosomes when it is done, the words of a count stopped or
 * refused, and Count again where a new count may give the numbers.
 */
import { useId, useLayoutEffect, useRef } from "react";

import { chromRows } from "../../core/analyses/variantsSummary.ts";
import { counted, escaped, grouped } from "../../core/project.ts";
import type { SourceRead, VariantSource } from "../../core/project.ts";
import type { AnalysisError, AnalysisStatus } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import { RunButton } from "../analyses/RunButton.tsx";
import type { ButtonOf } from "../analyses/status.ts";
import { progressShare } from "../analyses/words.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { classOf } from "../classOf.ts";
import { useAnnouncer } from "../shell/announcer.tsx";
import { useAppState, useStore } from "../store.tsx";
import { Problem } from "../widgets/Problem.tsx";
import { ProgressBar } from "../widgets/ProgressBar.tsx";
import { Table } from "../widgets/Table.tsx";
import { useRunSeconds } from "../runSeconds.ts";
import type { Progress } from "../../worker/protocol.ts";
import styles from "./Variants.module.css";
import {
  CHROMS_CAPTION,
  CHROM_COLUMN,
  COUNT_AGAIN_LABEL,
  COUNT_HEADING,
  COUNT_BAR_LABEL,
  NUM_VARS_COLUMN,
  STOPPED_TEXT,
  SUMMARY_HEADING,
  SUMMARY_ID,
  countAgainMends,
  countedText,
  countingText,
  failedText,
  formatAndSizeText,
  passedLine,
  ploidyLine,
  summaryStatus,
} from "./words.ts";

/** What the summary is drawn with. */
export interface VariantsSummaryProps {
  /** The analyses the page starts by itself, for Count again and to tell
      a count stopped from one not yet started. */
  readonly autoRuns: AutoRuns;
  /** The open button of the page, which takes the focus when the summary
      goes while the focus is in it. */
  readonly openButton: React.RefObject<HTMLButtonElement | null>;
}

/** The summary of the variants file; nothing until a file is read. */
export function VariantsSummary(
  props: VariantsSummaryProps,
): React.JSX.Element | null {
  const variants = useAppState((s) => s.project.variants);
  if (variants?.read.kind !== "read") return null;
  // Another load is another summary, so that the one before goes, with
  // the focus it held.
  return (
    <Summary
      key={variants.fileId}
      {...props}
      variants={variants}
      read={variants.read}
    />
  );
}

/** What the summary of a file read is drawn with. */
interface SummaryProps extends VariantsSummaryProps {
  /** The file. */
  readonly variants: VariantSource;
  /** Its read. */
  readonly read: Extract<SourceRead, { readonly kind: "read" }>;
}

/** The summary of one load of the file, read. */
function Summary({
  autoRuns,
  openButton,
  variants,
  read,
}: SummaryProps): React.JSX.Element {
  const heading = useId();
  const sectionRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const section = sectionRef.current;
    // The open button is one element whatever the zone holds.
    const button = openButton.current;
    return () => {
      // The summary goes, a new file dropped or read again, while the
      // focus is in it, on its Stop, its Count again or the heading of
      // its count: the focus goes to the open button, not to the top of
      // the page. The cleanup of a layout effect runs while the section
      // is still in the page.
      if (section?.contains(document.activeElement) === true) {
        button?.focus();
      }
    };
  }, [openButton]);
  return (
    <section
      ref={sectionRef}
      aria-labelledby={heading}
      className={classOf(styles, "section")}
    >
      <h2 id={heading} className={classOf(styles, "heading")}>
        {SUMMARY_HEADING}
      </h2>
      <div className={classOf(styles, "card")}>
        <p className={classOf(styles, "fileName")}>{escaped(variants.name)}</p>
        <ul className={classOf(styles, "facts")}>
          <li>{formatAndSizeText(variants)}</li>
          <li>{counted(read.individuals.length, "individual")}</li>
          <li>{ploidyLine(read.ploidy, variants.readOptions)}</li>
          {variants.readOptions !== null && (
            <li>{passedLine(variants.readOptions)}</li>
          )}
        </ul>
      </div>
      <Count autoRuns={autoRuns} />
    </section>
  );
}

/** What the count is drawn with. */
interface CountProps {
  /** As the summary's. */
  readonly autoRuns: AutoRuns;
}

/** The count of the variants, in each of its states. */
function Count({ autoRuns }: CountProps): React.JSX.Element {
  const store = useStore();
  const announcer = useAnnouncer();
  const status = useAppState(summaryStatus);
  const project = useAppState((s) => s.project);
  const heading = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const stop = (): void => {
    store.cancelRun(SUMMARY_ID);
    announcer.announce(STOPPED_TEXT);
  };
  const again = (): void => {
    autoRuns.again(SUMMARY_ID);
  };
  const button = buttonOf(status, autoRuns);
  return (
    <section aria-labelledby={heading} className={classOf(styles, "count")}>
      <h3
        id={heading}
        ref={headingRef}
        tabIndex={-1}
        className={classOf(styles, "subheading")}
      >
        {COUNT_HEADING}
      </h3>
      <CountBody
        status={status}
        stopped={button?.kind === "run"}
        failed={(error) => failedText(error, project)}
      />
      {button !== null && (
        <div>
          <RunButton
            button={button}
            runLabel={COUNT_AGAIN_LABEL}
            onRun={again}
            onStop={stop}
            onGone={() => {
              // The button went, the count done, and the summary stays:
              // when the summary goes, its own cleanup has already moved
              // the focus to the open button.
              headingRef.current?.focus();
            }}
          />
        </div>
      )}
    </section>
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
  /** The words of a failure. */
  readonly failed: (error: AnalysisError) => string;
}

/** The words, the bar or the table of the state of the count. */
function CountBody({
  status,
  stopped,
  failed,
}: CountBodyProps): React.JSX.Element | null {
  switch (status.kind) {
    case "locked":
      return <p className={classOf(styles, "muted")}>{status.reason}</p>;
    case "ready":
    case "removed":
      return stopped ? (
        <p className={classOf(styles, "line")}>{STOPPED_TEXT}</p>
      ) : null;
    case "running":
      return <Counting runId={status.runId} progress={status.progress} />;
    case "error":
      return <Problem>{failed(status.error)}</Problem>;
    case "done": {
      const rows = chromRows(status.result);
      return (
        <>
          <p className={classOf(styles, "line")}>
            {countedText(status.result.passStats.numVars, rows.length)}
          </p>
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
        </>
      );
    }
  }
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
