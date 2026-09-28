/**
 * The part of the Count under the filters of the variants
 * (docs/specs/steps/variants.md, "What each filter of the variants
 * kept"; docs/specs/analyses/filterCounts.md, "The Count button"): the
 * button "Count the variants each filter keeps" and the state the store
 * gives the counts of the filters. The counts of each filter are drawn
 * beside it (VariantFilters.tsx); the part holds what the filters share:
 *
 * - ready: the button, and the line of no counts;
 * - running: Stop, the bar, and the line with the time since it started,
 *   and no line of no counts;
 * - done: the line of the total, and the warning of a filter that kept
 *   none; for a file of no variant, its warning alone; the button goes,
 *   and the focus, when it was on it, moves to the line of the total, or
 *   to the warning;
 * - error: what happened and what to do, with the button after a failure
 *   that is neither popnei's refusal nor a file the browser can no longer
 *   read; with no button, the focus, when it was on it, moves to those
 *   words;
 * - removed: never, since the counts are in no notice;
 * - locked, by a list of individuals popnei would refuse or by filters
 *   of individuals that keep nobody, since the filters of the variants
 *   count over the individuals kept: the button disabled, with the reason
 *   beside it, without its end "in the Variants step", in place of the
 *   line of no counts, and no count beside the filters; when the Count
 *   leaves the page with the focus and the part is locked, the focus
 *   moves to the part that holds the disabled button and its reason.
 *
 * With a threshold on the individuals and no statistics of each
 * individual, a Count calculates them first, and the part shows the bar
 * of their calculation. A change of any filter of the variants or of the
 * individuals takes the counts off, and the part is then ready with the
 * line of no counts; an undo brings them back from the cache.
 */
import { useLayoutEffect, useRef } from "react";

import {
  refusalText,
  statisticsFailedText,
  variantsOfFile,
} from "../../../core/analyses/filterCounts.ts";
import type { AnalysisStatus } from "../../../core/store.ts";
import type { JobResult } from "../../../worker/protocol.ts";
import { RunButton } from "../../analyses/RunButton.tsx";
import { Running } from "../../analyses/Running.tsx";
import { Failed } from "../../analyses/Failed.tsx";
import {
  buttonOf,
  resultOf,
  statusOf,
  stoppedNotice,
} from "../../analyses/status.ts";
import type { ButtonOf } from "../../analyses/status.ts";
import { Warnings } from "../../analyses/Warnings.tsx";
import { stoppedText } from "../../analyses/words.ts";
import { classOf } from "../../classOf.ts";
import { startAnalysis } from "../../runs.ts";
import { useAppState, useStore } from "../../store.tsx";
import styles from "./VariantsStep.module.css";
import { buttonInTheStep, withoutTheStep } from "./words.ts";
import {
  COUNT_AGAIN,
  COUNT_LABEL,
  COUNT_NAME,
  NOT_COUNTED_LINE,
  filtersTotalText,
} from "./words.ts";

/** The id of the analysis. */
const ID = "filterCounts";

/** The part of the Count. */
export function FilterCountsPart(): React.JSX.Element {
  const store = useStore();
  const status = useAppState((s) => statusOf(s, ID));
  const notice = useAppState((s) => s.notice);
  // The line of the total, the warning of a file of no variant shown
  // alone, or the words of an error, which take the
  // focus when the button goes while it had it, and are not in the order
  // of the Tab key.
  const total = useRef<HTMLParagraphElement>(null);
  const empty = useRef<HTMLDivElement>(null);
  const failed = useRef<HTMLDivElement>(null);
  const locked = useRef<HTMLDivElement>(null);
  // Set when the button goes with the focus on it. The line or the words
  // that take the focus come in the same commit as the button goes, and
  // are in the page only once it is done, so the focus is moved after it.
  const focusLost = useRef(false);
  useLayoutEffect(() => {
    if (!focusLost.current) return;
    focusLost.current = false;
    (
      total.current ??
      empty.current ??
      failed.current ??
      locked.current
    )?.focus();
  });

  const button = buttonInTheStep(buttonOf(status));
  const stoppedBy = stoppedNotice(status, notice, ID);
  const runButton = (shown: NonNullable<ButtonOf>): React.JSX.Element => (
    <RunButton
      button={shown}
      runLabel={COUNT_LABEL}
      onRun={() => {
        void startAnalysis(store, ID);
      }}
      onStop={() => {
        store.cancelRun(ID);
      }}
      onGone={() => {
        focusLost.current = true;
      }}
    />
  );

  return (
    <div className={classOf(styles, "check")}>
      {stoppedBy !== null && (
        <p className={classOf(styles, "line")}>
          {stoppedText(COUNT_NAME, stoppedBy)}
        </p>
      )}
      {status.kind === "error" && (
        <div ref={failed} tabIndex={-1}>
          <Failed
            error={status.error}
            name={COUNT_NAME}
            refusalText={refusalText}
            again={COUNT_AGAIN}
            asShown={withoutTheStep}
            {...(status.ofStatistics && { statisticsFailedText })}
          />
        </div>
      )}
      {button !== null &&
        (status.kind === "locked" ? (
          // The disabled Count and its reason, which take the focus when
          // the Count leaves the page with it, since a disabled button
          // cannot hold it; not in the order of the Tab key.
          <div ref={locked} tabIndex={-1}>
            {runButton(button)}
          </div>
        ) : (
          runButton(button)
        ))}
      {status.kind === "running" && (
        // A new run is a new clock.
        <Running
          key={status.runId}
          name={COUNT_NAME}
          runId={status.runId}
          progress={status.progress}
          waitsForStatistics={status.waitsForStatistics}
        />
      )}
      {status.kind === "done" ? (
        <Done status={status} totalRef={total} emptyRef={empty} />
      ) : (
        <NotCounted status={status} />
      )}
    </div>
  );
}

/** The line of no counts, beside the button while the Count is ready
    (filterCounts.md, "The states"): running, the bar stands there, and in
    error the words of the error, which may leave no button to count
    with. A defect in the state removed, which the store never gives the
    counts, since they are in no notice. */
function NotCounted({
  status,
}: {
  readonly status: AnalysisStatus<JobResult>;
}): React.JSX.Element | null {
  if (status.kind === "removed") {
    throw new Error(
      "popnei_web defect: the counts of the filters are removed, and they are in no notice.",
    );
  }
  if (status.kind !== "ready") return null;
  return <p className={classOf(styles, "line")}>{NOT_COUNTED_LINE}</p>;
}

/** The line of the total and the warning, or, for a file of no variant,
    its warning alone, where "0 of the 0 variants" would say nothing more
    (filterCounts.md, "The cases"). */
function Done({
  status,
  totalRef,
  emptyRef,
}: {
  readonly status: Extract<
    AnalysisStatus<JobResult>,
    { readonly kind: "done" }
  >;
  readonly totalRef: React.RefObject<HTMLParagraphElement | null>;
  /** The warning of a file of no variant, shown alone. */
  readonly emptyRef: React.RefObject<HTMLDivElement | null>;
}): React.JSX.Element {
  const project = useAppState((s) => s.project);
  const result = resultOf(status, ID);
  if (result === null) {
    throw new Error(
      "popnei_web defect: the counts of the filters are done with no result.",
    );
  }
  if (variantsOfFile(result.passStats) === 0) {
    return (
      <div ref={emptyRef} tabIndex={-1}>
        <Warnings warnings={status.warnings} />
      </div>
    );
  }
  const text = filtersTotalText(project, result.passStats.numVars);
  // A result of the counts records the variants of the file into the
  // file of its load, and is shown only under the key of that load.
  if (text === null) {
    throw new Error(
      "popnei_web defect: the counts of the filters are shown with the variants of the file not counted.",
    );
  }
  return (
    <>
      <p ref={totalRef} tabIndex={-1} className={classOf(styles, "line")}>
        {text}
      </p>
      {status.warnings.length > 0 && <Warnings warnings={status.warnings} />}
    </>
  );
}
