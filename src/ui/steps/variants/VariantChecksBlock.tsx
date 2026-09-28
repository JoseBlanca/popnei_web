/**
 * The block "Histograms of the variants" of the Variants step
 * (docs/specs/steps/variants.md, "The histograms beside the filters of
 * the variants"; docs/specs/analyses/variantChecks.md, "The panel"): its
 * `<h3>`, and the state the store gives the check. The histograms
 * themselves are drawn beside their filters (VariantFilters.tsx); the
 * block holds what the three share:
 *
 * - ready: the button "Calculate the histograms of the variants";
 * - running: Stop, the bar, and the line with the time since it started;
 * - done: the warning, the caption of the three, which names the
 *   individuals the filters of individuals keep when they remove some,
 *   and the line of the versions; the button goes, and the focus, when
 *   it was on it, moves to the heading of the block;
 * - removed: the words of the change that removed them, a new load or a
 *   change of a filter of individuals, and the button;
 * - error: what happened and what to do, with the button after a failure
 *   that is neither popnei's refusal nor a file the browser can no longer
 *   read;
 * - locked, by a list of individuals popnei would refuse or by filters
 *   of individuals that keep nobody, since the histograms are drawn over
 *   the individuals kept: the button disabled, with the reason beside it
 *   without its end "in the Variants step".
 *
 * With a threshold on the individuals and no statistics of each
 * individual, a Calculate calculates them first, and the block shows the
 * bar of their calculation. The block is drawn only once the variants
 * file is read.
 */
import { useRef } from "react";

import { refusalText } from "../../../core/analyses/variantChecks.ts";
import type { Notice } from "../../../core/store.ts";
import { classOf } from "../../classOf.ts";
import { RunButton } from "../../analyses/RunButton.tsx";
import { Running } from "../../analyses/Running.tsx";
import { Failed } from "../../analyses/Failed.tsx";
import {
  buttonOf,
  resultOf,
  statusOf,
  stoppedNotice,
} from "../../analyses/status.ts";
import { Warnings } from "../../analyses/Warnings.tsx";
import { stoppedText, versionsText } from "../../analyses/words.ts";
import { titleOf } from "../../analyses/titles.ts";
import { startAnalysis } from "../../runs.ts";
import { useAppState, useStore } from "../../store.tsx";
import {
  CALCULATE_AGAIN,
  CALCULATE_LABEL,
  CHECK_NAME,
  histogramsCaption,
  removedText,
} from "./histogramWords.ts";
import styles from "./VariantsStep.module.css";
import { buttonInTheStep, withoutTheStep } from "./words.ts";

/** The id of the check. */
const ID = "variantChecks";

/** The block of the histograms of the variants. */
/** What the block is drawn with. */
export interface VariantChecksBlockProps {
  /** The id of its heading, which the parts of its result drawn beside
      the filters give the focus to when they leave the page with it. */
  readonly headingId: string;
}

export function VariantChecksBlock({
  headingId,
}: VariantChecksBlockProps): React.JSX.Element {
  const store = useStore();
  const status = useAppState((s) => statusOf(s, ID));
  const result = resultOf(status, ID);
  const notice = useAppState((s) => s.notice);
  const heading = useRef<HTMLHeadingElement>(null);

  const button = buttonInTheStep(buttonOf(status));
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
          {stoppedText(CHECK_NAME, stoppedBy)}
        </p>
      )}
      {status.kind === "removed" && (
        <p className={classOf(styles, "line")}>{removedWords(notice)}</p>
      )}
      {status.kind === "error" && (
        <Failed
          error={status.error}
          name={CHECK_NAME}
          refusalText={refusalText}
          again={CALCULATE_AGAIN}
          asShown={withoutTheStep}
        />
      )}
      {button !== null && (
        <RunButton
          button={button}
          runLabel={CALCULATE_LABEL}
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
          name={CHECK_NAME}
          runId={status.runId}
          progress={status.progress}
          waitsForStatistics={status.waitsForStatistics}
        />
      )}
      {status.kind === "done" && result !== null && (
        <>
          {status.warnings.length > 0 && (
            <Warnings warnings={status.warnings} />
          )}
          <Done numVars={result.passStats.numVars} />
        </>
      )}
    </section>
  );
}

/** The words of the histograms removed, from the notice that lists them;
    the store gives the state removed only while a notice lists it, so a
    defect with none. */
function removedWords(notice: Notice | null): string {
  if (notice === null) {
    throw new Error(
      "popnei_web defect: the histograms of the variants are removed with no notice up.",
    );
  }
  return removedText(notice);
}

/** The caption of the three histograms and the line of the versions. */
function Done({ numVars }: { readonly numVars: number }): React.JSX.Element {
  const variantsName = useAppState((s) => s.project.variants?.name ?? null);
  const popneiVersion = useAppState((s) => s.popneiVersion);
  const kept = useAppState((s) => s.individualsKept?.list ?? null);
  // A result is shown only under the key of the individuals kept, so the
  // list is known: the histograms of a threshold wait for the statistics.
  if (kept?.kind !== "known") {
    throw new Error(
      "popnei_web defect: the histograms of the variants are shown with the individuals kept not known.",
    );
  }
  // A result is shown only under the key of the project's variants file
  // and of the popnei that made it, so both are known.
  if (variantsName === null || popneiVersion === null) {
    throw new Error(
      "popnei_web defect: the histograms of the variants are shown with no variants file or no version of popnei.",
    );
  }
  return (
    <>
      <p className={classOf(styles, "line")}>
        {histogramsCaption(
          numVars,
          variantsName,
          kept.individuals === null ? null : kept.individuals.length,
        )}
      </p>
      <p className={classOf(styles, "muted")}>
        {versionsText(popneiVersion, APP_VERSION)}
      </p>
    </>
  );
}
