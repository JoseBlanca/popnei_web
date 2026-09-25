/**
 * The words of the frame every analysis panel shares
 * (docs/specs/analyses/diversity.md, "The panel", its states and its
 * words): the line of a calculation under way, the words of a result
 * removed and of a calculation stopped, the count of the warnings, and a
 * failure that is not popnei's refusal. Pure, so that a test in node
 * checks them; `AnalysisPanel.tsx` draws them.
 */

import { counted, escaped, saying } from "../../core/project.ts";
import type { Notice } from "../../core/store.ts";
import type { Progress, RunError } from "../../worker/protocol.ts";

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
}

/** The line beside the bar: "Calculating · 35% · 0:12"; "Calculating ·
    0:12" before the first progress; "Waiting for panel.nei to be opened
    again, then calculating · 0:12" after a stop, until the first
    progress. */
export function runningText(line: RunningLine): string {
  const clock = clockText(line.seconds);
  if (line.share !== null) {
    return `Calculating · ${String(line.share)}% · ${clock}`;
  }
  if (line.waitingFor !== null) {
    return `Waiting for ${escaped(line.waitingFor)} to be opened again, then calculating · ${clock}`;
  }
  return `Calculating · ${clock}`;
}

/** A sentence that starts with `words`, its first letter made upper
    case. */
function capitalized(words: string): string {
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

/**
 * The words of a result removed, from the notice that lists it: "The
 * diversity was removed because the missing data filter changed. Undo
 * brings it back with no calculation; Run calculates it for the new
 * settings.", with Redo after an undo, whose notice offers it. `name` is
 * the analysis in a sentence, "the diversity".
 */
export function removedText(name: string, notice: Notice): string {
  const action = notice.cause.kind === "undo" ? "Redo" : "Undo";
  return `${capitalized(name)} was removed because ${notice.cause.description}. ${action} brings it back with no calculation; Run calculates it for the new settings.`;
}

/** The line of a calculation stopped by a new variants file, while the
    notice that says so is up. */
export function stoppedText(name: string): string {
  return `The calculation of ${name} was stopped because a new variants file was loaded.`;
}

/** The count of the warnings of a result, on the heading above them: "1
    warning", "2 warnings". */
export function warningsHeading(count: number): string {
  return counted(count, "warning");
}

/**
 * What the panel says of a calculation that failed otherwise than by
 * popnei's refusal, which each analysis words itself. `variantsName` is
 * the name of the variants file of the project. A failure of the files
 * wasm is a defect: the calculation worker, which runs every job, holds
 * none (docs/specs/worker/client.md).
 */
export function failureText(
  error: Exclude<RunError, { readonly kind: "popnei" }>,
  variantsName: string,
): string {
  switch (error.kind) {
    case "reopenFailed":
      return `${escaped(error.name)} could not be read again; it may have changed on the disk since it was picked. Load it again in the Variants step.`;
    case "workerFailed":
      return `The calculation stopped unexpectedly. Run it again. If it stops again, load ${escaped(variantsName)} again in the Variants step.`;
    case "defect":
      return `The application met an error of its own${saying(error.message)}. Run it again.`;
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
