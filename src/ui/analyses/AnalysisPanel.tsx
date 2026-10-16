/**
 * The frame every analysis panel shares (react.md, "The states of an
 * analysis"; docs/specs/analyses/diversity.md, "The panel"): the `<h2>` of
 * the analysis, and one of the states the store gives it, each drawn here
 * with every case named, so that a new state is a type error until it is
 * drawn. The panel of one analysis, in `panels.ts`, gives its words, the
 * component of its result, and the component of its options, drawn above
 * the button in every state, since they are what the user may change
 * (docs/specs/analyses/pca.md, "The states").
 *
 * The page gives the panel, `ui`: popgen.html `panelOf` of panels.ts,
 * popgen2.html the panel of its PCA tab. popgen2.html draws the same
 * frame there (docs/plans/analyses-pca.md, work package 6), with its own
 * words and parts, by the method, and, `page`, a lock of its own, the one pass of the
 * variants file that has not read the file to the end, which takes the
 * place of the store's reason, or makes a ready Run a locked one; and the
 * line of the individuals the PCA will run on before the button, in the
 * locked state as well as the ready one
 * (docs/specs/steps/popgen2-pca.md, "The PCA tab"). popgen.html gives
 * none of it, and its panels are drawn as before. popgen2.html also
 * draws the options inside a section that opens and closes,
 * "Parameters", closed when the page opens, so that Run stands near the
 * top of the tab; whether it is open is the screen's, and stays while
 * the tabs, which stay drawn, are hidden and shown (the owner, 16
 * October 2026; popgen2-pca.md, "The PCA tab"). A lock beside Run is
 * outside it, so it is seen with the section closed.
 *
 * - locked: Run, disabled, with the reason beside it as its description;
 * - ready: Run, and what it will run on, the individuals the filters
 *   keep, or, while a threshold waits for the statistics of each
 *   individual, those before it and that Run calculates them first;
 * - running: Stop, the bar, and the line with the time since it started,
 *   the statistics' while the Run waits for them;
 * - done: the warnings, and the result with, under its table, the
 *   comparison with the check numbers of an opened project file, or why
 *   its numbers are not compared, the VCF read with other read options;
 * - removed: the words of the change that removed it, Run, and what it
 *   will run on;
 * - error: what happened and what to do, in the words of the statistics
 *   of each individual when they failed and the Run waited for them, with
 *   Run after a failure that
 *   is neither popnei's refusal nor a variants file the browser can no
 *   longer read, which fails again until it is loaded again.
 *
 * On popgen2.html, while the analysis is live and none of it runs, the
 * button is "Stop recalculating", and the line of its quiet second or of
 * a Stop stands under it, in the place of the bar (`PanelLive`).
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
import { PARAMETERS } from "../../core/analyses/words.ts";
import type { AnalysisStatus } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import { classOf } from "../classOf.ts";
import { useFocusAfterLoss } from "../steps/variants/FocusSpot.tsx";
import { startAnalysis } from "../runs.ts";
import { useAppState, useStore } from "../store.tsx";
import styles from "./AnalysisPanel.module.css";
import { Failed } from "./Failed.tsx";
import type { AnalysisUi } from "./panels.ts";
import { Button } from "../widgets/Button.tsx";
import { Disclosure } from "../widgets/Disclosure.tsx";
import { RunButton } from "./RunButton.tsx";
import { Running } from "./Running.tsx";
import { buttonOf, statusOf, stoppedNotice } from "./status.ts";
import type { ButtonOf } from "./status.ts";
import { Warnings } from "./Warnings.tsx";
import { failedWordsOf, removedText, stoppedText } from "./words.ts";

/** What popgen2.html adds to the panel of an analysis. Given at all, it
    also draws the line of what a run will take before the button, in the
    states locked, ready and removed, where popgen.html draws it after
    the button in the states ready and removed alone
    (docs/specs/steps/popgen2-pca.md, "The PCA tab"). */
export interface PagePanel {
  /** The reason of a lock of the page beyond the store's, which then
      locks a Run the store offers and takes the place of the store's
      reason; `null` when the page locks nothing. */
  readonly lock: string | null;
  /** Whether the analysis is started again by itself after each change,
      with the words of its lines (docs/specs/steps/popgen2-pca.md, "Run
      and Stop"). */
  readonly live: PanelLive;
  /** The user's Run: makes the analysis live and starts it. */
  readonly onRun: () => void;
  /** The user's Stop: stops its run and ends its live state. */
  readonly onStop: () => void;
  /** A line after the button, on its line, that describes none of it:
      the time the last run took, which the LD decay's panel gives
      (docs/specs/steps/popgen2-populations.md, "The LD decay"); `null`,
      or absent, for none. Drawn also where the state offers no
      button. */
  readonly aside?: string | null;
}

/** The live state of an analysis as its panel draws it
    (docs/specs/steps/popgen2-pca.md, "Run and Stop"). */
export type PanelLive =
  /** Not live, and not stopped by the user: the button as it is. */
  | { readonly kind: "off" }
  /** The user's Stop, or a failure that ends it, ended its live state:
      the button as it is, and under it, in the place of the bar, `line`,
      which says why nothing starts by itself any more. */
  | { readonly kind: "stopped"; readonly line: string }
  /** Live, started again by itself after each change: while no run is
      under way, "Stop recalculating" in the place of Run, which ends the
      live state, beside the lock when Run is locked, by the store or by
      the page, so that the user can end it before the lock lifts; and,
      while it is about to start, `aboutToStartLine`, the line of the
      quiet second, under it in the place of the bar, `null` while it is
      not about to start; with its result shown, no line, as the owner
      asked on 11 October 2026. After a failure that leaves it live and
      that Run may mend, Run stands first, which tries again under the
      same key, and "Stop recalculating" beside it; the same, with the
      line, while `runBeside`, a crash of the worker that ended another
      live state holds its start until the next change or its Run
      (docs/specs/steps/popgen2-pca.md, "A failure that ends a live
      state"). */
  | {
      readonly kind: "live";
      readonly aboutToStartLine: string | null;
      readonly runBeside: boolean;
    };

/** The attribute of the section of a panel, whose value is the id of its
    analysis, by which the band's link finds the panel of its analysis in
    a tab that holds two, as the Populations tab of popgen2.html holds the
    diversity and the LD decay. */
export const PANEL_ANALYSIS_ATTRIBUTE = "data-panel-analysis";

/** The attribute of the heading of a panel, by which the band's link to
    an error of the PCA on popgen2.html finds the PCA tab's. */
export const PANEL_HEADING_ATTRIBUTE = "data-panel-heading";

/** The words of the button that ends the automatic runs of a live
    analysis while none runs. */
export const STOP_RECALCULATING = "Stop recalculating";

/** What the panel of an analysis is drawn with. */
export interface AnalysisPanelProps {
  /** The id of the analysis. */
  readonly id: AnalysisId;
  /** Its panel, its words and its parts: `panelOf(id)` of panels.ts on
      popgen.html, the PCA tab's on popgen2.html. Given by the page, so
      that popgen2.html does not download the panels of popgen.html, and
      their plots, with its own. */
  readonly ui: AnalysisUi;
  /** What popgen2.html adds; absent on popgen.html, whose panels have no
      lock of their own and the lines of what a run will take after the
      button. */
  readonly page?: PagePanel;
}

/** The panel of the analysis `id`, in the state the store gives it. */
export function AnalysisPanel({
  id,
  ui,
  page,
}: AnalysisPanelProps): React.JSX.Element {
  const store = useStore();
  const status = useAppState((s) => statusOf(s, id));
  const notice = useAppState((s) => s.notice);
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  // On popgen2.html, the button shown and the reason of a disabled Run,
  // which take the focus when what had it goes, before the heading: Stop
  // recalculating pressed while the PCA is locked leaves a disabled Run,
  // whose reason a screen reader then reads with its name (the PCA tab's
  // spec, "The focus at a Stop"), as the Count of popgen.html does.
  const shownButton = useRef<HTMLButtonElement | null>(null);
  const reason = useRef<HTMLSpanElement>(null);
  const lost = useFocusAfterLoss(() => {
    const shown = shownButton.current;
    return (
      (shown !== null && !shown.disabled ? shown : null) ??
      reason.current ??
      heading.current
    );
  });

  const { button, line, stopLabel, under, stopBeside } = pageButton(
    lockedBy(buttonOf(status), page?.lock ?? null),
    status,
    page,
  );
  const stoppedBy = stoppedNotice(status, notice, id);
  const aside = page?.aside ?? null;
  // On popgen2.html the line of the individuals stands before the button,
  // also while it is locked.
  const linesFirst =
    page !== undefined &&
    (status.kind === "ready" ||
      status.kind === "removed" ||
      status.kind === "locked");

  const runButton =
    button === null ? null : (
      <RunButton
        button={button}
        runLabel="Run"
        {...(line === null ? {} : { line })}
        {...(stopLabel === null ? {} : { stopLabel })}
        onRun={() => {
          if (page === undefined) void startAnalysis(store, id);
          else page.onRun();
        }}
        onStop={() => {
          if (page === undefined) store.cancelRun(id);
          else page.onStop();
        }}
        onGone={() => {
          if (page === undefined) heading.current?.focus();
          else lost();
        }}
        {...(page === undefined
          ? {}
          : {
              reasonRef: reason,
              onButton: (node: HTMLButtonElement | null) => {
                shownButton.current = node;
              },
            })}
      />
    );
  const stopButton =
    !stopBeside || page === undefined ? null : (
      // Beside Run, after it in the order of the Tab key; when it goes,
      // the focus it had goes to Run.
      <Button
        label={STOP_RECALCULATING}
        onPress={() => {
          lost();
          page.onStop();
        }}
      />
    );

  return (
    <section
      aria-labelledby={headingId}
      className={
        page === undefined
          ? classOf(styles, "panel")
          : `${classOf(styles, "panel")} ${classOf(styles, "pagePanel")}`
      }
      {...{ [PANEL_ANALYSIS_ATTRIBUTE]: id }}
    >
      {/* It takes the focus when the button goes while it had it, and is
          not in the order of the Tab key. */}
      <h2
        id={headingId}
        ref={heading}
        tabIndex={-1}
        {...{ [PANEL_HEADING_ATTRIBUTE]: "" }}
        className={classOf(styles, "heading")}
      >
        {ui.title}
      </h2>
      {stoppedBy !== null && (
        <p className={classOf(styles, "line")}>
          {stoppedText(ui.name, stoppedBy)}
        </p>
      )}
      {ui.Options !== null &&
        (page === undefined ? (
          <ui.Options />
        ) : (
          <Disclosure label={PARAMETERS}>
            <ui.Options />
          </Disclosure>
        ))}
      {linesFirst && <Ready ui={ui} />}
      <Above ui={ui} status={status} live={page?.live.kind === "live"} />
      {stopButton === null && aside === null ? (
        runButton
      ) : (
        <div className={classOf(styles, "buttons")}>
          {runButton}
          {stopButton}
          {aside !== null && (
            <p className={classOf(styles, "aside")}>{aside}</p>
          )}
        </div>
      )}
      {/* The line of the quiet second or of a Stop, in the place of the
          bar, in the words of the page: not the button's description,
          which a screen reader would read at each visit of it. */}
      {under !== null && <p className={classOf(styles, "line")}>{under}</p>}
      <Below id={id} ui={ui} status={status} linesDrawn={linesFirst} />
    </section>
  );
}

/** The button `button` with the page's lock `lock`: a Run, enabled or
    locked by the store, locked with the page's reason; Stop, and no
    button, as they are. */
function lockedBy(button: ButtonOf, lock: string | null): ButtonOf {
  return lock !== null && button?.kind === "run"
    ? { kind: "run", reason: lock }
    : button;
}

/** The button of the panel and what stands around it, given what
    popgen2.html adds, `page`: the button; `line`, the words beside it
    that describe it, the lock beside "Stop recalculating" in the place
    of a locked Run; `stopLabel`, the words of a Stop that is not
    "Stop", `null` for "Stop"; and `under`, the line under it in the
    place of the bar, of the quiet second or of a Stop. While the
    analysis is live and none of it runs, the button is "Stop
    recalculating"; while it runs, Stop. popgen.html, with no `page`,
    has the button as it is and nothing more. */
function pageButton(
  button: ButtonOf,
  status: AnalysisStatus<JobResult>,
  page: PagePanel | undefined,
): {
  readonly button: ButtonOf;
  readonly line: string | null;
  readonly stopLabel: string | null;
  readonly under: string | null;
  readonly stopBeside: boolean;
} {
  const none = { line: null, stopLabel: null, under: null, stopBeside: false };
  if (page === undefined || status.kind === "running") {
    return { button, ...none };
  }
  switch (page.live.kind) {
    case "off":
      return { button, ...none };
    case "stopped":
      return { button, ...none, under: page.live.line };
    case "live":
      // A failure Run may mend: Run, which tries again, and Stop
      // recalculating beside it; and a start held by a crash, which Run
      // starts, with the line that says so.
      if (button?.kind === "run" && button.reason === null) {
        if (status.kind === "error") {
          return { button, ...none, stopBeside: true };
        }
        if (page.live.runBeside) {
          return {
            button,
            ...none,
            under: page.live.aboutToStartLine,
            stopBeside: true,
          };
        }
      }
      return {
        button: { kind: "stop" },
        line: button?.kind === "run" ? button.reason : null,
        stopLabel: STOP_RECALCULATING,
        under: status.kind === "done" ? null : page.live.aboutToStartLine,
        stopBeside: false,
      };
  }
}

/** What the parts above and below the button are drawn with. */
interface PartProps {
  /** The panel of the analysis. */
  readonly ui: AnalysisUi;
  /** Its state. */
  readonly status: AnalysisStatus<JobResult>;
}

/** What comes before the button: why the result went, or why it could
    not be calculated, popnei's refusal in the words of the analysis
    `live` or not. */
function Above({
  ui,
  status,
  live,
}: PartProps & {
  /** Whether the analysis is live on popgen2.html, which the words of
      popnei's refusal read. */
  readonly live: boolean;
}): React.JSX.Element | null {
  const kept = useAppState((s) => s.individualsKept);
  switch (status.kind) {
    case "removed":
      return <Removed ui={ui} />;
    case "error":
      return (
        <Failed
          error={status.error}
          name={ui.name}
          {...failedWordsOf(ui, status, kept, live)}
        />
      );
    case "locked":
    case "ready":
    case "running":
    case "done":
      return null;
  }
}

/** What comes after the button: what a run will take, when it can run
    and the page has not drawn it before the button, `linesDrawn`; the
    calculation under way; or the result. */
function Below({
  id,
  ui,
  status,
  linesDrawn,
}: PartProps & {
  readonly id: AnalysisId;
  readonly linesDrawn: boolean;
}): React.JSX.Element | null {
  // Why the numbers of a result are not compared with those of the
  // project file, when the variants file loaded is of the other format
  // than the reference's, or its VCF was read with other read options.
  const uncompared = useAppState((s) => uncomparedText(s.project, id));
  const runningLine = useAppState((s) => ui.runningLine(s.project));
  // A warning of the result said elsewhere in it, which the list names
  // and counts, so that its count is the band's.
  const linked = ui.linkedWarning;
  const hasLinked = useAppState(
    (s) =>
      status.kind === "done" && linked?.has(status.result, s.project) === true,
  );
  switch (status.kind) {
    case "ready":
    case "removed":
      return linesDrawn ? null : <Ready ui={ui} />;
    case "running":
      // A new run is a new clock.
      return (
        <Running
          key={status.runId}
          name={ui.name}
          runId={status.runId}
          progress={status.progress}
          waitsForStatistics={status.waitsForStatistics}
          line={status.waitsForStatistics ? null : runningLine}
        />
      );
    case "done":
      return (
        <>
          {status.warnings.length > 0 && (
            <Warnings
              warnings={status.warnings}
              elsewhere={hasLinked && linked !== undefined ? linked : null}
            />
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

/** What a run will take, "3 populations: p0, 32 individuals; …", with
    the populations the filters of individuals leave empty, and whether a
    Run calculates the statistics of each individual first. */
function Ready({ ui }: { readonly ui: AnalysisUi }): React.JSX.Element {
  const project = useAppState((s) => s.project);
  const kept = useAppState((s) => s.individualsKept);
  return (
    <>
      {ui.readyLines(project, kept).map((line) => (
        <p key={line} className={classOf(styles, "line")}>
          {line}
        </p>
      ))}
    </>
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
      {removedText(ui.name, ui.resultName, notice, ui.plural)}
    </p>
  );
}
