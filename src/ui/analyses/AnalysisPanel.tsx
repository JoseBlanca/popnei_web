/**
 * The frame every analysis panel shares (react.md, "The states of an
 * analysis"; docs/specs/analyses/diversity.md, "The panel"): the `<h2>` of
 * the analysis, and one of the states the store gives it, each drawn here
 * with every case named, so that a new state is a type error until it is
 * drawn. The panel of one analysis, in `panels.ts`, gives its words and
 * the component of its result.
 *
 * - locked: Run, disabled, with the reason beside it as its description;
 * - ready: Run, and what it will run on;
 * - running: Stop, the bar, and the line with the time since it started;
 * - done: the warnings, and the result with, under its table, the
 *   comparison with the check numbers of an opened project file, or why
 *   its numbers are not compared, the VCF read with other read options;
 * - removed: the words of the change that removed it, Run, and what it
 *   will run on;
 * - error: what happened and what to do, with Run after a failure that
 *   is neither popnei's refusal nor a variants file the browser can no
 *   longer read, which fails again until it is loaded again.
 *
 * Run and Stop are one button in one place, so the focus stays on it when
 * it changes. The button goes when the run ends done, refused, or on a
 * file that can no longer be read; the focus,
 * when it was on it, moves to the heading of the panel, so that a user of
 * the keyboard is not sent to the top of the page (WCAG 2.4.3). The one
 * state of its own is the clock of a calculation under way.
 */
import { useId, useRef } from "react";

import { checkVerdictText, uncomparedText } from "../../core/projectFile.ts";
import type { AnalysisId } from "../../core/project.ts";
import type { AnalysisStatus } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import { classOf } from "../classOf.ts";
import { startAnalysis } from "../runs.ts";
import { useAppState, useStore } from "../store.tsx";
import styles from "./AnalysisPanel.module.css";
import { Failed } from "./Failed.tsx";
import { panelOf } from "./panels.ts";
import type { AnalysisUi } from "./panels.ts";
import { RunButton } from "./RunButton.tsx";
import { Running } from "./Running.tsx";
import { buttonOf, statusOf, stoppedNotice } from "./status.ts";
import { Warnings } from "./Warnings.tsx";
import { removedText, stoppedText } from "./words.ts";

/** What the panel of an analysis is drawn with. */
export interface AnalysisPanelProps {
  /** The id of the analysis. */
  readonly id: AnalysisId;
}

/** The panel of the analysis `id`, in the state the store gives it. */
export function AnalysisPanel({ id }: AnalysisPanelProps): React.JSX.Element {
  const ui = panelOf(id);
  const store = useStore();
  const status = useAppState((s) => statusOf(s, id));
  const notice = useAppState((s) => s.notice);
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);

  const button = buttonOf(status);
  const stoppedBy = stoppedNotice(status, notice, id);

  return (
    <section aria-labelledby={headingId} className={classOf(styles, "panel")}>
      {/* It takes the focus when the button goes while it had it, and is
          not in the order of the Tab key. */}
      <h2
        id={headingId}
        ref={heading}
        tabIndex={-1}
        className={classOf(styles, "heading")}
      >
        {ui.title}
      </h2>
      {stoppedBy !== null && (
        <p className={classOf(styles, "line")}>
          {stoppedText(ui.name, stoppedBy)}
        </p>
      )}
      <Above ui={ui} status={status} />
      {button !== null && (
        <RunButton
          button={button}
          runLabel="Run"
          onRun={() => {
            void startAnalysis(store, id);
          }}
          onStop={() => {
            store.cancelRun(id);
          }}
          onGone={() => {
            heading.current?.focus();
          }}
        />
      )}
      <Below id={id} ui={ui} status={status} />
    </section>
  );
}

/** What the parts above and below the button are drawn with. */
interface PartProps {
  /** The panel of the analysis. */
  readonly ui: AnalysisUi;
  /** Its state. */
  readonly status: AnalysisStatus<JobResult>;
}

/** What comes before the button: why the result went, or why it could
    not be calculated. */
function Above({ ui, status }: PartProps): React.JSX.Element | null {
  switch (status.kind) {
    case "removed":
      return <Removed ui={ui} />;
    case "error":
      return (
        <Failed
          error={status.error}
          name={ui.title}
          refusalText={ui.refusalText}
        />
      );
    case "locked":
    case "ready":
    case "running":
    case "done":
      return null;
  }
}

/** What comes after the button: what a run will take, when it can run,
    the calculation under way, or the result. */
function Below({
  id,
  ui,
  status,
}: PartProps & { readonly id: AnalysisId }): React.JSX.Element | null {
  // Why the numbers of a result are not compared with those of the
  // project file, when the variants file loaded is of the other format
  // than the reference's, or its VCF was read with other read options.
  const uncompared = useAppState((s) => uncomparedText(s.project, id));
  switch (status.kind) {
    case "ready":
    case "removed":
      return <Ready ui={ui} />;
    case "running":
      // A new run is a new clock.
      return (
        <Running
          key={status.runId}
          name={ui.name}
          runId={status.runId}
          progress={status.progress}
        />
      );
    case "done":
      return (
        <>
          {status.warnings.length > 0 && (
            <Warnings warnings={status.warnings} />
          )}
          {/* A new result is drawn anew, with no state of the last. */}
          <ui.Results
            key={status.key}
            result={status.result}
            check={
              status.check === null
                ? uncompared
                : checkVerdictText(status.check)
            }
          />
        </>
      );
    case "locked":
    case "error":
      return null;
  }
}

/** What a run will take, "3 populations: p0, 48 individuals; …". */
function Ready({ ui }: { readonly ui: AnalysisUi }): React.JSX.Element | null {
  const text = useAppState((s) => ui.readyText(s.project));
  return text === null ? null : (
    <p className={classOf(styles, "line")}>{text}</p>
  );
}

/** The words of the change that removed the result, from its notice. */
function Removed({ ui }: { readonly ui: AnalysisUi }): React.JSX.Element {
  const notice = useAppState((s) => s.notice);
  // The store gives the state removed only while the notice lists it.
  if (notice === null) {
    throw new Error(
      `popnei_web defect: ${ui.title} is removed with no notice up.`,
    );
  }
  return (
    <p className={classOf(styles, "line")}>
      {removedText(ui.name, ui.resultName, notice)}
    </p>
  );
}
