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
 *   none or of a file of no variant; the button goes, and the focus, when
 *   it was on it, moves to the line of the total;
 * - error: what happened and what to do, with the button after a failure
 *   that is neither popnei's refusal nor a file the browser can no longer
 *   read; with no button, the focus, when it was on it, moves to those
 *   words;
 * - removed: never, since the counts are in no notice;
 * - locked: never drawn, since the step draws the part only once the
 *   variants file is read, when nothing locks it; drawn as the frame of
 *   the analyses draws it all the same, the button disabled with its
 *   reason.
 *
 * A change of any filter of the variants takes the counts off, and the
 * part is then ready with the line of no counts; an undo brings them
 * back from the cache.
 */
import { useLayoutEffect, useRef } from "react";

import { refusalText } from "../../../core/analyses/filterCounts.ts";
import type { AnalysisError, AnalysisStatus } from "../../../core/store.ts";
import type { JobResult } from "../../../worker/protocol.ts";
import { RunButton } from "../../analyses/RunButton.tsx";
import { Running } from "../../analyses/Running.tsx";
import { buttonOf, statusOf } from "../../analyses/status.ts";
import { Warnings } from "../../analyses/Warnings.tsx";
import { failureText, stoppedText } from "../../analyses/words.ts";
import { classOf } from "../../classOf.ts";
import { startAnalysis } from "../../runs.ts";
import { useAppState, useStore } from "../../store.tsx";
import { Problem } from "../../widgets/Problem.tsx";
import styles from "./VariantsStep.module.css";
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
  // The line of the total, or the words of an error, which take the
  // focus when the button goes while it had it, and are not in the order
  // of the Tab key.
  const total = useRef<HTMLParagraphElement>(null);
  const failed = useRef<HTMLDivElement>(null);
  // Set when the button goes with the focus on it. The line or the words
  // that take the focus come in the same commit as the button goes, and
  // are in the page only once it is done, so the focus is moved after it.
  const focusLost = useRef(false);
  useLayoutEffect(() => {
    if (!focusLost.current) return;
    focusLost.current = false;
    (total.current ?? failed.current)?.focus();
  });

  const button = buttonOf(status);
  const stoppedBy =
    notice?.stopped.includes(ID) === true &&
    (status.kind === "ready" || status.kind === "locked")
      ? notice
      : null;

  return (
    <div className={classOf(styles, "check")}>
      {stoppedBy !== null && (
        <p className={classOf(styles, "line")}>
          {stoppedText(COUNT_NAME, stoppedBy)}
        </p>
      )}
      {status.kind === "error" && (
        <div ref={failed} tabIndex={-1}>
          <Failed error={status.error} />
        </div>
      )}
      {button !== null && (
        <RunButton
          button={button}
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
      )}
      {status.kind === "running" && (
        // A new run is a new clock.
        <Running
          key={status.runId}
          name={COUNT_NAME}
          runId={status.runId}
          progress={status.progress}
        />
      )}
      {status.kind === "done" ? (
        <Done status={status} totalRef={total} />
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

/** The line of the total and the warning. */
function Done({
  status,
  totalRef,
}: {
  readonly status: Extract<
    AnalysisStatus<JobResult>,
    { readonly kind: "done" }
  >;
  readonly totalRef: React.RefObject<HTMLParagraphElement | null>;
}): React.JSX.Element {
  const project = useAppState((s) => s.project);
  const result = status.result;
  if (result.analysis !== ID) {
    throw new Error(
      `popnei_web defect: the counts of the filters were given a result of ${result.analysis}.`,
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

/** What went wrong, and what to do. */
function Failed({
  error,
}: {
  readonly error: AnalysisError;
}): React.JSX.Element {
  const text = useAppState((s) => {
    const variants = s.project.variants;
    // A calculation is keyed by the load of the variants file, so an
    // error has one.
    if (variants === null) {
      throw new Error(
        "popnei_web defect: the counts of the filters are in error with no variants file.",
      );
    }
    return error.kind === "refused"
      ? refusalText(error.message, s.project)
      : failureText(error.error, variants.name, COUNT_AGAIN);
  });
  return <Problem>{text}</Problem>;
}
