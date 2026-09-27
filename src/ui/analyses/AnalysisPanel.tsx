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
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { checkVerdictText, uncomparedText } from "../../core/projectFile.ts";
import type { AnalysisId } from "../../core/project.ts";
import type {
  AnalysisError,
  AnalysisStatus,
  AppState,
  Warning as DataWarning,
} from "../../core/store.ts";
import type { JobResult, Progress } from "../../worker/protocol.ts";
import { classOf } from "../classOf.ts";
import { startAnalysis, startedAt } from "../runs.ts";
import { useAppState, useStore } from "../store.tsx";
import { Button } from "../widgets/Button.tsx";
import { Problem } from "../widgets/Problem.tsx";
import { ProgressBar } from "../widgets/ProgressBar.tsx";
import { Warning } from "../widgets/Warning.tsx";
import styles from "./AnalysisPanel.module.css";
import { panelOf } from "./panels.ts";
import type { AnalysisUi } from "./panels.ts";
import {
  failureText,
  progressShare,
  removedText,
  runningText,
  stoppedText,
  warningsHeading,
} from "./words.ts";

/** A second, in the milliseconds of performance.now(). */
const SECOND_MS = 1000;

/** What the panel of an analysis is drawn with. */
export interface AnalysisPanelProps {
  /** The id of the analysis. */
  readonly id: AnalysisId;
}

/** The state of the analysis `id` in `s`; a defect when the store has
    none. */
function statusOf(
  s: AppState<JobResult, unknown>,
  id: AnalysisId,
): AnalysisStatus<JobResult> {
  const view = s.analyses.find((a) => a.id === id);
  if (view === undefined) {
    throw new Error(`popnei_web defect: the store has no analysis ${id}.`);
  }
  return view.status;
}

/** What the button of the panel is in a state, or `null` when the state
    offers none. */
type ButtonOf =
  | { readonly kind: "run"; readonly reason: string | null }
  | { readonly kind: "stop" }
  | null;

/** The button of the state `status`. */
function buttonOf(status: AnalysisStatus<JobResult>): ButtonOf {
  switch (status.kind) {
    case "locked":
      return { kind: "run", reason: status.reason };
    case "ready":
    case "removed":
      return { kind: "run", reason: null };
    case "running":
      return { kind: "stop" };
    case "done":
      return null;
    case "error":
      // popnei would refuse the same settings again, and a file the
      // browser can no longer read fails again until it is loaded again.
      return status.error.kind === "refused" ||
        status.error.error.kind === "reopenFailed"
        ? null
        : { kind: "run", reason: null };
  }
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
  const stoppedBy =
    notice?.stopped.includes(id) === true &&
    (status.kind === "ready" || status.kind === "locked")
      ? notice
      : null;

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

/** What the button of the panel is drawn with. */
interface RunButtonProps {
  /** Run, with the reason it cannot, or Stop. */
  readonly button: NonNullable<ButtonOf>;
  /** Starts the calculation. */
  readonly onRun: () => void;
  /** Stops the calculation. */
  readonly onStop: () => void;
  /** Called when the button leaves the page while it has the focus. */
  readonly onGone: () => void;
}

/** Run or Stop, one button in one place. */
function RunButton({
  button,
  onRun,
  onStop,
  onGone,
}: RunButtonProps): React.JSX.Element {
  const element = useRef<HTMLButtonElement>(null);
  // The latest onGone, for the cleanup below, which runs once.
  const gone = useRef(onGone);
  useLayoutEffect(() => {
    gone.current = onGone;
  });
  useLayoutEffect(() => {
    const node = element.current;
    return () => {
      // The cleanup of a layout effect runs while the button is still in
      // the page, so the focus is still on it when it had it.
      if (node !== null && document.activeElement === node) {
        gone.current();
      }
    };
  }, []);

  if (button.kind === "stop") {
    return <Button label="Stop" onPress={onStop} ref={element} />;
  }
  return (
    <Button
      label="Run"
      onPress={onRun}
      ref={element}
      isDisabled={button.reason !== null}
      {...(button.reason !== null && { description: button.reason })}
    />
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
      return <Failed ui={ui} error={status.error} />;
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
          ui={ui}
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

/** What went wrong, and what to do. */
function Failed({
  ui,
  error,
}: {
  readonly ui: AnalysisUi;
  readonly error: AnalysisError;
}): React.JSX.Element {
  const text = useAppState((s) => {
    const variants = s.project.variants;
    // A calculation is keyed by the load of the variants file, so an
    // error has one.
    if (variants === null) {
      throw new Error(
        `popnei_web defect: ${ui.title} is in error with no variants file.`,
      );
    }
    return error.kind === "refused"
      ? ui.refusalText(error.message, s.project)
      : failureText(error.error, variants.name);
  });
  return <Problem>{text}</Problem>;
}

/** What the part of a calculation under way is drawn with. */
interface RunningProps {
  /** The panel of the analysis. */
  readonly ui: AnalysisUi;
  /** The id of its request. */
  readonly runId: number;
  /** How far it has gone, or `null` until the worker says. */
  readonly progress: Progress | null;
}

/** The bar and the line of a calculation under way, with the time since
    it started, counted every second. */
function Running({ ui, runId, progress }: RunningProps): React.JSX.Element {
  const afterStop = useAppState(
    (s) => s.runs.find((r) => r.runId === runId)?.afterStop ?? false,
  );
  const variantsName = useAppState((s) => s.project.variants?.name ?? null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    // From the start runs.ts noted, so that the time is not lost when the
    // user goes to another step and back.
    const start = startedAt(runId) ?? performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = (): void => {
      const elapsed = performance.now() - start;
      setSeconds(Math.floor(elapsed / SECOND_MS));
      // The next tick at the next whole second since the start.
      timer = setTimeout(tick, SECOND_MS - (elapsed % SECOND_MS));
    };
    timer = setTimeout(tick);
    return () => {
      clearTimeout(timer);
    };
  }, [runId]);

  const share = progress === null ? null : progressShare(progress);
  return (
    <div className={classOf(styles, "running")}>
      <ProgressBar label={`Calculating ${ui.name}`} value={share} />
      <p className={classOf(styles, "line")}>
        {runningText({
          share,
          seconds,
          waitingFor: afterStop ? variantsName : null,
        })}
      </p>
    </div>
  );
}

/** The warnings of a result, above it, with their count on their
    heading. */
function Warnings({
  warnings,
}: {
  readonly warnings: readonly DataWarning[];
}): React.JSX.Element {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={classOf(styles, "warnings")}
    >
      <h3 id={headingId} className={classOf(styles, "warningsHeading")}>
        {warningsHeading(warnings.length)}
      </h3>
      <ul className={classOf(styles, "warningList")}>
        {warnings.map((warning) => (
          <li key={warning.code}>
            <Warning>{warning.text}</Warning>
          </li>
        ))}
      </ul>
    </section>
  );
}
