/**
 * The block "Statistics of each individual" of the Variants step
 * (docs/specs/steps/variants.md, "The statistics of each individual";
 * docs/specs/analyses/individualChecks.md, "The panel"): its `<h3>`, and
 * the state the store gives the check. Its two histograms and its table
 * are drawn after it, beside the thresholds of the filters of the
 * individuals (IndividualFilters.tsx); the block holds what they share:
 *
 * - ready: the button "Calculate the statistics of each individual";
 * - running: Stop, the bar, and the line with the time since it started,
 *   also when the Run of an analysis that reads a threshold started it;
 * - done: the warning of the individuals with no called genotype, the
 *   caption of the histograms and the table, and the line of the
 *   versions; the button goes, and the focus, when it was on it, moves
 *   to the heading of the block;
 * - removed: the words of the change that removed them, and the button;
 * - error: what happened and what to do, with the button after a failure
 *   that is neither popnei's refusal nor a file the browser can no longer
 *   read;
 * - locked: never drawn, since the step draws the block only once the
 *   variants file is read, when nothing locks it; drawn as the frame of
 *   the analyses draws it all the same, the button disabled with its
 *   reason.
 */
import { useId, useRef } from "react";

import { refusalText } from "../../../core/analyses/individualChecks.ts";
import type { Notice } from "../../../core/store.ts";
import { classOf } from "../../classOf.ts";
import { versionsText } from "../../analyses/diversity/words.ts";
import { Failed } from "../../analyses/Failed.tsx";
import { RunButton } from "../../analyses/RunButton.tsx";
import { Running } from "../../analyses/Running.tsx";
import {
  buttonOf,
  resultOf,
  statusOf,
  stoppedNotice,
} from "../../analyses/status.ts";
import { titleOf } from "../../analyses/titles.ts";
import { Warnings } from "../../analyses/Warnings.tsx";
import { stoppedText } from "../../analyses/words.ts";
import { startAnalysis } from "../../runs.ts";
import { useAppState, useStore } from "../../store.tsx";
import {
  STATS_AGAIN,
  STATS_CALCULATE_LABEL,
  STATS_NAME,
  statsCaption,
  statsRemovedText,
} from "./individualStats.ts";
import styles from "./VariantsStep.module.css";

/** The id of the check. */
const ID = "individualChecks";

/** The block of the statistics of each individual. */
export function IndividualChecksBlock(): React.JSX.Element {
  const store = useStore();
  const status = useAppState((s) => statusOf(s, ID));
  const result = resultOf(status, ID);
  const notice = useAppState((s) => s.notice);
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);

  const button = buttonOf(status);
  const stoppedBy = stoppedNotice(status, notice, ID);

  return (
    <section aria-labelledby={headingId} className={classOf(styles, "check")}>
      {/* It takes the focus when the button goes while it had it, and is
          not in the order of the Tab key. */}
      <h3
        id={headingId}
        ref={heading}
        tabIndex={-1}
        className={classOf(styles, "checkHeading")}
      >
        {titleOf(ID)}
      </h3>
      {stoppedBy !== null && (
        <p className={classOf(styles, "line")}>
          {stoppedText(STATS_NAME, stoppedBy)}
        </p>
      )}
      {status.kind === "removed" && (
        <p className={classOf(styles, "line")}>{removedWords(notice)}</p>
      )}
      {status.kind === "error" && (
        <Failed
          error={status.error}
          name={STATS_NAME}
          refusalText={refusalText}
          again={STATS_AGAIN}
        />
      )}
      {button !== null && (
        <RunButton
          button={button}
          runLabel={STATS_CALCULATE_LABEL}
          onRun={() => {
            void startAnalysis(store, ID);
          }}
          onStop={() => {
            store.cancelRun(ID);
          }}
          onGone={() => {
            heading.current?.focus();
          }}
        />
      )}
      {status.kind === "running" && (
        // A new run is a new clock.
        <Running
          key={status.runId}
          name={STATS_NAME}
          runId={status.runId}
          progress={status.progress}
        />
      )}
      {status.kind === "done" && result !== null && (
        <>
          {status.warnings.length > 0 && (
            <Warnings warnings={status.warnings} />
          )}
          <Done
            numIndividuals={result.individuals.length}
            numVars={result.passStats.numVars}
          />
        </>
      )}
    </section>
  );
}

/** The words of the statistics removed, from the notice that lists them;
    the store gives the state removed only while a notice lists it, so a
    defect with none. */
function removedWords(notice: Notice | null): string {
  if (notice === null) {
    throw new Error(
      "popnei_web defect: the statistics of each individual are removed with no notice up.",
    );
  }
  return statsRemovedText(notice);
}

/** What the caption and the line of the versions are drawn with. */
interface DoneProps {
  /** The individuals of the variants file. */
  readonly numIndividuals: number;
  /** The variants the filters kept. */
  readonly numVars: number;
}

/** The caption of the histograms and the table, and the line of the
    versions. */
function Done({ numIndividuals, numVars }: DoneProps): React.JSX.Element {
  const variantsName = useAppState((s) => s.project.variants?.name ?? null);
  const popneiVersion = useAppState((s) => s.popneiVersion);
  // A result is shown only under the key of the project's variants file
  // and of the popnei that made it, so both are known.
  if (variantsName === null || popneiVersion === null) {
    throw new Error(
      "popnei_web defect: the statistics of each individual are shown with no variants file or no version of popnei.",
    );
  }
  return (
    <>
      <p className={classOf(styles, "line")}>
        {statsCaption(numIndividuals, variantsName, numVars)}
      </p>
      <p className={classOf(styles, "muted")}>
        {versionsText(popneiVersion, APP_VERSION)}
      </p>
    </>
  );
}
