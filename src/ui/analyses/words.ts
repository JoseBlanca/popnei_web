/**
 * The words of the frame every analysis panel shares
 * (docs/specs/analyses/diversity.md, "The panel", its states and its
 * words): the line of a calculation under way, the words of a result
 * removed and of a calculation stopped, written from the change that
 * caused them, the count of the warnings, a
 * failure that is not popnei's refusal, and the line of the versions
 * beside a result. Pure, so that a test in node
 * checks them; `AnalysisPanel.tsx`, `Failed.tsx` and the parts of the
 * checks of the Variants step draw them.
 */

import { counted, escaped, saying } from "../../core/project.ts";
import type { Notice } from "../../core/store.ts";
import type { Progress, RunError } from "../../worker/protocol.ts";
import { capitalized, undoneOrRedone } from "../sentences.ts";

/** The line beside the download: "Calculated with popnei 0.1.0, in
    version 0.1.0 of the application." */
export function versionsText(
  popneiVersion: string,
  appVersion: string,
): string {
  return `Calculated with popnei ${escaped(popneiVersion)}, in version ${escaped(appVersion)} of the application.`;
}

/** The seconds of a minute, and of an hour. */
const MINUTE = 60;
const HOUR = 3600;

/** A time in whole seconds as a clock shows it: "0:12", "12:05",
    "1:02:05". */
export function clockText(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(whole / HOUR);
  const minutes = Math.floor((whole % HOUR) / MINUTE);
  const rest = String(whole % MINUTE).padStart(2, "0");
  return hours > 0
    ? `${String(hours)}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${String(minutes)}:${rest}`;
}

/**
 * The share of a run done, a whole percentage rounded down, from popnei's
 * four numbers: `(pass − 1 + bytesRead / numBytes) / numPasses`, so that
 * it is 100 only when the last pass has read the file. Computed in whole
 * numbers, since 0.29 × 100 is 28.999… in floats, and kept from 0 to 100.
 */
export function progressShare(progress: Progress): number {
  const { bytesRead, numBytes, pass, numPasses } = progress;
  const passes = Math.max(1, numPasses);
  // A file of no bytes counts as read.
  const share =
    numBytes > 0
      ? Math.floor(
          (100 * ((pass - 1) * numBytes + bytesRead)) / (passes * numBytes),
        )
      : Math.floor((100 * pass) / passes);
  return Math.min(100, Math.max(0, share));
}

/** What the line of a calculation under way is made of. */
export interface RunningLine {
  /** The share done, `progressShare`, or `null` before the first
      progress. */
  readonly share: number | null;
  /** The whole seconds since it started. */
  readonly seconds: number;
  /** The name of the variants file the calculation waits to be opened
      again, after a stop or a change of the load; `null` otherwise. */
  readonly waitingFor: string | null;
  /** Whether the calculation is a Run that waits for the statistics of
      each individual, whose share the line then gives. */
  readonly waitsForStatistics: boolean;
}

/** The statistics of each individual, as the line of a Run that waits for
    them names them, and the line of a write that waits for them. */
export const STATISTICS_WORDS =
  "the statistics of each individual, which the thresholds of the individuals need";

/** The name of the bar of a Run that waits for the statistics of each
    individual, and of a write that waits for them: the share it shows is
    theirs. */
export const STATISTICS_BAR_LABEL =
  "Calculating the statistics of each individual";

/** The name of the bar of a calculation under way: "Calculating the
    diversity", `name` being the analysis in a sentence; or
    STATISTICS_BAR_LABEL while it waits for the statistics of each
    individual. */
export function runningBarLabel(
  name: string,
  waitsForStatistics: boolean,
): string {
  return waitsForStatistics ? STATISTICS_BAR_LABEL : `Calculating ${name}`;
}

/** The line beside the bar: "Calculating · 35% · 0:12"; "Calculating ·
    0:12" before the first progress; "Waiting for panel.nei to be opened
    again, then calculating · 0:12" after a stop, until the first
    progress; and, while a Run waits for the statistics of each
    individual, "Calculating the statistics of each individual, which the
    filters of individuals are set from · 35% · 0:12", and the same for
    the other two. */
export function runningText(line: RunningLine): string {
  const clock = clockText(line.seconds);
  const doing = line.waitsForStatistics
    ? `calculating ${STATISTICS_WORDS}`
    : "calculating";
  if (line.share !== null) {
    return `${capitalized(doing)} · ${String(line.share)}% · ${clock}`;
  }
  if (line.waitingFor !== null) {
    return `Waiting for ${escaped(line.waitingFor)} to be opened again, then ${doing} · ${clock}`;
  }
  return `${capitalized(doing)} · ${clock}`;
}

/**
 * The words of a result removed, from the change of the notice that lists
 * it, as the shell's notice is, and what each button gives: after a
 * command, "The diversity was removed because the missing data filter
 * changed. Undo brings back the table as it was, with no calculation; Run
 * calculates a new one for the new settings."; after an undo, "Undone:
 * the filter of the variants by missing data changed. The diversity was removed; Redo brings
 * back the table as it was, with no calculation, and Run calculates a new
 * one for the settings as they are now.", and after a redo the same with
 * "Redone:" and Undo. `name` is the analysis in a sentence, "the
 * diversity", and `resultName` its result, "the table".
 */
export function removedText(
  name: string,
  resultName: string,
  notice: Notice,
): string {
  const cause = notice.cause;
  const start = undoneOrRedone(cause);
  const back = `brings back ${resultName} as it was, with no calculation`;
  if (start === null) {
    return `${capitalized(name)} was removed because ${cause.description}. Undo ${back}; Run calculates a new one for the new settings.`;
  }
  const action = cause.kind === "undo" ? "Redo" : "Undo";
  return `${start}. ${capitalized(name)} was removed; ${action} ${back}, and Run calculates a new one for the settings as they are now.`;
}

/** The line of a calculation stopped at once by a change of the load of
    the variants file, from the change of the notice that says so, while
    it is up: "The calculation of the diversity was stopped because the
    variants file was read again with other options."; after an undo,
    "Undone: a new variants file was loaded. The calculation of the
    diversity was stopped.", and "Redone:" after a redo. */
export function stoppedText(name: string, notice: Notice): string {
  const cause = notice.cause;
  const start = undoneOrRedone(cause);
  return start === null
    ? `The calculation of ${name} was stopped because ${cause.description}.`
    : `${start}. The calculation of ${name} was stopped.`;
}

/** The count of the warnings of a result, on the heading above them: "1
    warning", "2 warnings". */
export function warningsHeading(count: number): string {
  return counted(count, "warning");
}

/**
 * What the panel says of a calculation that failed otherwise than by
 * popnei's refusal, which each analysis words itself. `variantsName` is
 * the name of the variants file of the project; `again` is the sentence
 * that asks for the calculation again, "Run it again." beside a Run
 * button, "Calculate them again." for the histograms of the variants
 * (docs/specs/analyses/variantChecks.md, "The states"). A failure of the
 * files wasm is a defect: the calculation worker, which runs every job,
 * holds none (docs/specs/worker/client.md).
 */
export function failureText(
  error: Exclude<RunError, { readonly kind: "popnei" }>,
  variantsName: string,
  again = "Run it again.",
): string {
  switch (error.kind) {
    case "reopenFailed":
      return `${escaped(error.name)} could not be read again; it may have changed on the disk since it was picked. Load it again in the Variants step.`;
    case "workerFailed":
      return `The calculation stopped unexpectedly. ${again} If it stops again, load ${escaped(variantsName)} again in the Variants step.`;
    case "defect":
      return `The application met an error of its own${saying(error.message)}. ${again}`;
    case "couldNotStart":
      return "The application could not start its calculations. Save the project, reload the page, and open the project again.";
    case "protocolMismatch":
      return "The page is out of date. Save the project, reload the page, and open the project again.";
    case "files":
      throw new Error(
        `popnei_web defect: a calculation failed in the files wasm, which the calculation worker does not hold: ${error.message}`,
      );
  }
}
